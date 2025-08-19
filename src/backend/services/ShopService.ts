import { ConfigLoader } from '../config';
import { u64 } from '../storage/codec';
import { StorageProvider } from '../storage/StorageProvider';

import { CurrencyService } from './CurrencyService';

type UpgradeDef = { id: string; name: string; desc: string; costScrap: number };

const UPGRADES: UpgradeDef[] = [
  {
    id: 'upg_bulk_opener',
    name: 'Bulk Opener',
    desc: 'Open boxes faster in batches.',
    costScrap: 100,
  },
  {
    id: 'upg_shiny_chance',
    name: 'Shiny Chance',
    desc: 'Slightly increases shiny chance.',
    costScrap: 200,
  },
  {
    id: 'upg_auto_opener',
    name: 'Auto Opener',
    desc: 'Idly opens boxes while away.',
    costScrap: 500,
  },
];

export class ShopService {
  constructor(
    private storage: StorageProvider,
    private currency: CurrencyService,
    private loader = new ConfigLoader(),
  ) {}

  private dayKey(): string {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  async getShop(uid: string) {
    const purchased = new Set<string>();
    await this.storage.scanPrefix(`pupg:${uid}:`, (k) => {
      const id = k.split(':').pop();
      if (id) purchased.add(id);
    });
    const upgrades = UPGRADES.map((u) => ({ ...u, purchased: purchased.has(u.id) }));
    const econ = this.loader.load().economy as any;
    const ex = Array.isArray(econ?.exchanges)
      ? econ.exchanges.find((x: any) => x.id === 'ex_scrap_to_keys')
      : undefined;
    const rateFrom = Number(ex?.rate?.from ?? 100);
    const rateTo = Number(ex?.rate?.to ?? 1);
    const dailyCapTo = Number(ex?.dailyCapTo ?? 10);
    const mintedKey = `pex:${uid}:ex_scrap_to_keys:${this.dayKey()}`;
    const mintedToday = Number(u64.decodeBE(await this.storage.get(mintedKey)));
    return {
      upgrades,
      exchange: {
        id: 'ex_scrap_to_keys',
        from: 'SCRAP',
        to: 'KEYS',
        rateFrom,
        rateTo,
        mintedToday,
        dailyCapTo,
      },
    };
  }

  async purchase(uid: string, upgradeId: string) {
    const u = UPGRADES.find((x) => x.id === upgradeId);
    if (!u) throw new Error('unknown upgrade');
    const flag = await this.storage.get(`pupg:${uid}:${u.id}`);
    if (flag) return this.getShop(uid);
    // cost
    await this.currency.debit(uid, 'SCRAP', BigInt(u.costScrap));
    await this.storage.put(`pupg:${uid}:${u.id}`, '1');
    return this.getShop(uid);
  }

  async exchange(uid: string, toAmount: number) {
    if (toAmount <= 0) throw new Error('invalid amount');
    const shop = await this.getShop(uid);
    const ex = shop.exchange;
    const remaining = ex.dailyCapTo - ex.mintedToday;
    const toMint = Math.min(toAmount, Math.max(0, remaining));
    if (toMint <= 0) return this.getShop(uid);
    // compute scrap cost
    const scrapCost = BigInt(toMint * ex.rateFrom);
    await this.currency.debit(uid, 'SCRAP', scrapCost);
    await this.currency.credit(uid, 'KEYS', BigInt(toMint * ex.rateTo));
    const mintedKey = `pex:${uid}:ex_scrap_to_keys:${this.dayKey()}`;
    const cur = u64.decodeBE(await this.storage.get(mintedKey));
    await this.storage.put(mintedKey, u64.encodeBE(cur + BigInt(toMint)));
    return this.getShop(uid);
  }
}
