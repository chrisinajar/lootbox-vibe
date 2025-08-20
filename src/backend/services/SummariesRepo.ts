import { StorageProvider } from '../storage/StorageProvider';

export type Totals = { totalStacks: number; totalItems: bigint };
export type RarityCount = { rarity: string; count: bigint };
export type TypeCount = { typeId: string; count: bigint };
export type SourceCount = { sourceBoxId: string; count: bigint };

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const;

function readU64(buf: Buffer): bigint {
  // interpret as big-endian unsigned 64-bit
  let v = 0n;
  for (const b of buf.values()) v = (v << 8n) | BigInt(b);
  return v;
}

function readU32BE(buf: Buffer): number {
  if (!buf || buf.length < 4) return 0;
  return buf.readUInt32BE(0);
}

export class SummariesRepo {
  constructor(private storage: StorageProvider) {}

  async getTotals(uid: string): Promise<Totals> {
    // Prefer transactional sums; fallback to recompute
    const sumStacksBuf = await this.storage.get(`sum:totalStacks:${uid}`);
    const sumItemsBuf = await this.storage.get(`sum:totalItems:${uid}`);
    if (sumStacksBuf || sumItemsBuf) {
      const totalStacks = sumStacksBuf ? Number(readU64(sumStacksBuf)) : 0;
      const totalItems = sumItemsBuf ? readU64(sumItemsBuf) : 0n;
      return { totalStacks, totalItems };
    }

    // Fallback: scan inv and aggregate
    let totalStacks = 0;
    let totalItems = 0n;
    await this.storage.scanPrefix(`inv:${uid}:`, (_key, value) => {
      const c = readU32BE(value);
      const count = BigInt(c);
      if (count > 0n) {
        totalStacks += 1;
        totalItems += count;
      }
    });
    return { totalStacks, totalItems };
  }

  async getByRarity(uid: string): Promise<RarityCount[]> {
    const out: RarityCount[] = [];
    let anyFound = false;
    for (const tier of RARITY_ORDER) {
      const key = `sum:rarity:${uid}:${tier}`;
      const v = await this.storage.get(key);
      if (v) {
        const count = readU64(v);
        out.push({ rarity: tier, count });
        if (count > 0n) anyFound = true;
      } else {
        out.push({ rarity: tier, count: 0n });
      }
    }

    if (!anyFound) {
      // fallback: scan idx:rarity and aggregate via inv counts
      const totals = new Map<string, bigint>();
      for (const tier of RARITY_ORDER) totals.set(tier, 0n);
      for (const tier of RARITY_ORDER) {
        const stackIds: string[] = [];
        const prefix = `idx:rarity:${uid}:${tier}:`;
        await this.storage.scanPrefix(prefix, (k) => {
          const parts = k.split(':');
          const stackId = parts[parts.length - 1];
          if (stackId) stackIds.push(stackId);
        });
        for (const stackId of stackIds) {
          const inv = await this.storage.get(`inv:${uid}:${stackId}`);
          const add = BigInt(readU32BE(inv as Buffer));
          totals.set(tier, (totals.get(tier) ?? 0n) + add);
        }
      }
      return RARITY_ORDER.map((tier) => ({ rarity: tier, count: totals.get(tier) ?? 0n }));
    }

    return out;
  }

  async getByType(uid: string): Promise<TypeCount[]> {
    const out: TypeCount[] = [];
    // First try reading maintained sums directly by scanning the prefix
    await this.storage.scanPrefix(`sum:type:${uid}:`, (key, value) => {
      const parts = key.split(':');
      const typeId = parts[parts.length - 1];
      if (typeId) out.push({ typeId, count: readU64(value) });
    });
    if (out.length > 0) return out;

    // Fallback: scan index and aggregate
    const totals = new Map<string, bigint>();
    const pairs: Array<{ typeId: string; stackId: string }> = [];
    const typePrefix = `idx:type:${uid}:`;
    await this.storage.scanPrefix(typePrefix, (key) => {
      // idx:type:{uid}:{typeId}:{stackId}
      const rest = key.slice(typePrefix.length);
      const idx = rest.indexOf(':');
      if (idx <= 0) return;
      const typeId = rest.slice(0, idx);
      const stackId = rest.slice(idx + 1);
      if (typeId && stackId) pairs.push({ typeId, stackId });
    });
    for (const { typeId, stackId } of pairs) {
      const inv = await this.storage.get(`inv:${uid}:${stackId}`);
      const add = BigInt(readU32BE(inv as Buffer));
      totals.set(typeId, (totals.get(typeId) ?? 0n) + add);
    }
    return Array.from(totals.entries()).map(([typeId, count]) => ({ typeId, count }));
  }

  async getBySource(uid: string): Promise<SourceCount[]> {
    const out: SourceCount[] = [];
    // Prefer sum:src
    await this.storage.scanPrefix(`sum:src:${uid}:`, (key, value) => {
      const parts = key.split(':');
      const sourceBoxId = parts[parts.length - 1];
      if (sourceBoxId) out.push({ sourceBoxId, count: readU64(value) });
    });
    if (out.length > 0) return out;

    // Fallback: aggregate via idx:src and inv counts
    const totals = new Map<string, bigint>();
    const pairs: Array<{ source: string; stackId: string }> = [];
    const srcPrefix = `idx:src:${uid}:`;
    await this.storage.scanPrefix(srcPrefix, (k) => {
      // idx:src:{uid}:{source}:{stackId}
      const rest = k.slice(srcPrefix.length);
      const idx = rest.indexOf(':');
      if (idx <= 0) return;
      const source = rest.slice(0, idx);
      const stackId = rest.slice(idx + 1);
      if (source && stackId) pairs.push({ source, stackId });
    });
    for (const { source, stackId } of pairs) {
      const inv = await this.storage.get(`inv:${uid}:${stackId}`);
      const add = BigInt(readU32BE(inv as Buffer));
      totals.set(source, (totals.get(source) ?? 0n) + add);
    }
    return Array.from(totals.entries()).map(([sourceBoxId, count]) => ({ sourceBoxId, count }));
  }
}
