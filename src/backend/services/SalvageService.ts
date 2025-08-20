import { ConfigLoader } from '../config';
import { u32, u64 } from '../storage/codec';
import { keys } from '../storage/keys';
import { StorageProvider } from '../storage/StorageProvider';

export type SalvageInput = { maxRarity: string; typeIds?: string[]; staticModIds?: string[] };

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const;

export class SalvageService {
  private economy: any;
  constructor(
    private storage: StorageProvider,
    loader = new ConfigLoader(),
  ) {
    this.economy = loader.load().economy ?? {
      raritySalvage: { COMMON: 1, UNCOMMON: 1, RARE: 5, EPIC: 10 },
    };
  }

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
        const pfx = keys.idxType(uid, t, '');
        await this.storage.scanPrefix(pfx, (k) => {
          const stackId = k.slice(pfx.length);
          if (stackId) typeFilter!.add(stackId);
        });
      }
    }

    // Collect candidate stacks via rarity indexes
    for (const tier of tiers) {
      const prefix = keys.idxRarity(uid, tier, '');
      await this.storage.scanPrefix(prefix, (k) => {
        const sid = k.slice(prefix.length);
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
    const srcDelta = new Map<string, bigint>();
    let totalItemsDelta = 0n;
    let totalStacksDelta = 0n;
    const scrapped: Array<{ stackId: string; typeId: string; rarity: string; count: number }> = [];

    for (const stackId of allowedStacks) {
      // Skip stacks that have any modifiers/tags (do not salvage variants)
      const tagMapKey = keys.tagMap(uid, stackId);
      const tagBuf = await this.storage.get(tagMapKey);
      if (tagBuf) continue;
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
        if (exists) {
          foundTier = t;
          break;
        }
      }
      // get typeId by scanning type indexes minimally (could parse stackId prefix in our current scheme)
      let foundType = '';
      const typePrefix = `idx:type:${uid}:`;
      await this.storage.scanPrefix(typePrefix, (k) => {
        // idx:type:{uid}:{typeId}:{stackId}
        const rest = k.slice(typePrefix.length); // becomes {typeId}:{stackId}
        const idx = rest.indexOf(':');
        if (idx <= 0) return;
        const typeId = rest.slice(0, idx);
        const sid = rest.slice(idx + 1);
        if (sid === stackId && typeId) foundType = typeId;
      });

      ops.push({ type: 'put', key: invKey, value: u32.encodeBE(0) });
      ops.push({ type: 'del', key: keys.idxRarity(uid, foundTier, stackId) });
      if (foundType) ops.push({ type: 'del', key: keys.idxType(uid, foundType, stackId) });
      // Clean up tag indexes if present
      const tbuf = await this.storage.get(tagMapKey);
      if (tbuf) {
        try {
          const arr = JSON.parse(tbuf.toString('utf8')) as string[];
          for (const t of arr) ops.push({ type: 'del', key: keys.idxTag(uid, t, stackId) });
        } catch {
          /* ignore malformed tag map */
        }
        ops.push({ type: 'del', key: tagMapKey });
      }
      // source index/map cleanup + sum src delta
      const srcMapKey = keys.srcMap(uid, stackId);
      const srcBuf = await this.storage.get(srcMapKey);
      const src = srcBuf ? srcBuf.toString('utf8') : undefined;
      if (src) {
        ops.push({ type: 'del', key: keys.idxSrc(uid, src, stackId) });
        ops.push({ type: 'del', key: srcMapKey });
        srcDelta.set(src, (srcDelta.get(src) ?? 0n) - BigInt(count));
      }
      rarityDelta.set(foundTier, (rarityDelta.get(foundTier) ?? 0n) - BigInt(count));
      if (foundType) typeDelta.set(foundType, (typeDelta.get(foundType) ?? 0n) - BigInt(count));
      const perUnit = Number(
        (this.economy?.raritySalvage ?? this.economy?.scrapPerRarity ?? {})?.[foundTier] ?? 1,
      );
      totalScrap += BigInt(perUnit * count);
      scrapped.push({ stackId, typeId: foundType || 'Unknown', rarity: foundTier, count });
      totalItemsDelta -= BigInt(count);
      totalStacksDelta -= 1n;
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
    for (const [src, d] of srcDelta.entries()) {
      const key = keys.sumSrc(uid, src);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + d;
      if (next < 0n) throw new Error('sum underflow');
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }
    if (totalItemsDelta !== 0n) {
      const k = keys.sumTotalItems(uid);
      const buf = await this.storage.get(k);
      if (buf || totalItemsDelta > 0n) {
        const cur = u64.decodeBE(buf);
        const next = cur + totalItemsDelta;
        if (next < 0n) throw new Error('sum underflow');
        ops.push({ type: 'put', key: k, value: u64.encodeBE(next) });
      }
    }
    if (totalStacksDelta !== 0n) {
      const k = keys.sumTotalStacks(uid);
      const buf = await this.storage.get(k);
      if (buf || totalStacksDelta > 0n) {
        const cur = u64.decodeBE(buf);
        const next = cur + totalStacksDelta;
        if (next < 0n) throw new Error('sum underflow');
        ops.push({ type: 'put', key: k, value: u64.encodeBE(next) });
      }
    }

    // dynamic Greedy bonus: +1% per 100 lifetime opens, cap 100%
    const lifetimeKey = `pstat:${uid}.lifetimeBoxesOpened`;
    const lifetime = u64.decodeBE(await this.storage.get(lifetimeKey));
    const greedySteps = Number(lifetime / 100n);
    const greedyBonus = Math.min(greedySteps * 0.01, 1.0);
    const totalWithGreedy = BigInt(Math.floor(Number(totalScrap) * (1 + greedyBonus)));

    // credit scrap
    const curKey = keys.cur(uid, 'SCRAP');
    const bal = u64.decodeBE(await this.storage.get(curKey));
    ops.push({ type: 'put', key: curKey, value: u64.encodeBE(bal + totalWithGreedy) });

    await this.storage.batch(ops);

    return { scrapped, currencies: [{ currency: 'SCRAP', amount: totalWithGreedy }] };
  }
}
