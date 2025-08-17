import { StorageProvider } from '../storage/StorageProvider';

export type Totals = { totalStacks: number; totalItems: bigint };
export type RarityCount = { rarity: string; count: bigint };
export type TypeCount = { typeId: string; count: bigint };

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
    // Derive totals from inv prefix; fallback to sums if available
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

    // If nothing in inv, try sum:type path for totalItems
    if (totalItems === 0n) {
      await this.storage.scanPrefix(`sum:type:${uid}:`, (_k, v) => {
        totalItems += readU64(v);
      });
    }

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
    await this.storage.scanPrefix(`idx:type:${uid}:`, (key) => {
      // idx:type:{uid}:{typeId}:{stackId}
      const parts = key.split(':');
      const typeId = parts[3];
      const stackId = parts[4];
      if (typeId && stackId) pairs.push({ typeId, stackId });
    });
    for (const { typeId, stackId } of pairs) {
      const inv = await this.storage.get(`inv:${uid}:${stackId}`);
      const add = BigInt(readU32BE(inv as Buffer));
      totals.set(typeId, (totals.get(typeId) ?? 0n) + add);
    }
    return Array.from(totals.entries()).map(([typeId, count]) => ({ typeId, count }));
  }
}
