import { StorageProvider } from '../storage/StorageProvider';
import { keys } from '../storage/keys';
import { u32, u64 } from '../storage/codec';

export type SalvageInput = { maxRarity: string; typeIds?: string[]; staticModIds?: string[] };

const RARITY_ORDER = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'] as const;

export class SalvageService {
  constructor(private storage: StorageProvider) {}

  private tiersUpTo(max: string): string[] {
    const idx = RARITY_ORDER.indexOf(max as any);
    return RARITY_ORDER.slice(0, idx + 1) as unknown as string[];
  }

  async salvage(uid: string, input: SalvageInput) {
    const tiers = this.tiersUpTo(input.maxRarity);
    const allowedStacks = new Set<string>();
    // If types filter provided, precompute union of stackIds from idx:type
    let typeFilter: Set<string> | undefined;
    if (input.typeIds && input.typeIds.length > 0) {
      typeFilter = new Set<string>();
      for (const t of input.typeIds) {
        await this.storage.scanPrefix(keys.idxType(uid, t, ''), (k) => {
          const parts = k.split(':');
          const stackId = parts[parts.length - 1];
          if (stackId) typeFilter!.add(stackId);
        });
      }
    }

    // Collect candidate stacks via rarity indexes
    for (const tier of tiers) {
      const prefix = keys.idxRarity(uid, tier, '');
      await this.storage.scanPrefix(prefix, (k) => {
        const sid = k.split(':').pop();
        if (!sid) return;
        if (typeFilter && !typeFilter.has(sid)) return;
        allowedStacks.add(sid);
      });
    }

    // Build batch ops: decrement inv to 0; update sums; drop idx for zeroed stacks
    const ops: { type: 'put' | 'del'; key: string; value?: Buffer | string }[] = [];
    let totalScrap = 0n;
    const rarityDelta = new Map<string, bigint>();
    const typeDelta = new Map<string, bigint>();
    const scrapped: Array<{ stackId: string; typeId: string; rarity: string; count: number }> = [];

    for (const stackId of allowedStacks) {
      const invKey = keys.inv(uid, stackId);
      const invBuf = await this.storage.get(invKey);
      const count = u32.decodeBE(invBuf as Buffer);
      if (count <= 0) continue;
      // decode typeId and rarity from indexes by probing one key each
      // get rarity by checking tiers order
      let foundTier = 'COMMON';
      for (const t of RARITY_ORDER) {
        const idxRKey = keys.idxRarity(uid, t as any, stackId);
        const exists = await this.storage.get(idxRKey);
        if (exists) { foundTier = t; break; }
      }
      // get typeId by scanning type indexes minimally (could parse stackId prefix in our current scheme)
      let foundType = '';
      const typePrefix = `idx:type:${uid}:`;
      await this.storage.scanPrefix(typePrefix, (k) => {
        const parts = k.split(':');
        const typeId = parts[3];
        const sid = parts[4];
        if (sid === stackId && typeId) { foundType = typeId; }
      });

      ops.push({ type: 'put', key: invKey, value: u32.encodeBE(0) });
      ops.push({ type: 'del', key: keys.idxRarity(uid, foundTier, stackId) });
      if (foundType) ops.push({ type: 'del', key: keys.idxType(uid, foundType, stackId) });
      rarityDelta.set(foundTier, (rarityDelta.get(foundTier) ?? 0n) - BigInt(count));
      if (foundType) typeDelta.set(foundType, (typeDelta.get(foundType) ?? 0n) - BigInt(count));
      totalScrap += BigInt(count); // 1:1 yield for now
      scrapped.push({ stackId, typeId: foundType || 'Unknown', rarity: foundTier, count });
    }

    // apply sum deltas
    for (const [tier, d] of rarityDelta.entries()) {
      const key = keys.sumRarity(uid, tier);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + d;
      if (next < 0n) throw new Error('sum underflow');
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }
    for (const [typeId, d] of typeDelta.entries()) {
      const key = keys.sumType(uid, typeId);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + d;
      if (next < 0n) throw new Error('sum underflow');
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }

    // credit scrap
    const curKey = keys.cur(uid, 'SCRAP');
    const bal = u64.decodeBE(await this.storage.get(curKey));
    ops.push({ type: 'put', key: curKey, value: u64.encodeBE(bal + totalScrap) });

    await this.storage.batch(ops);

    return { scrapped, currencies: [{ currency: 'SCRAP', amount: totalScrap }] };
  }
}
