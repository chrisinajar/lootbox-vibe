import { StorageProvider } from '../storage/StorageProvider';

type Filter = { rarity?: string; typeId?: string; sourceBoxId?: string; curatedTags?: string[] };

export class InventoryListService {
  constructor(private storage: StorageProvider) {}

  private parseStackMeta(stackId: string): { typeId: string; rarity: string } {
    // Current stackId pattern: `${typeId}_${rarity}_...`
    const parts = stackId.split('_');
    if (parts.length >= 3) {
      const r = parts[parts.length - 2] || 'COMMON';
      const t = parts.slice(0, parts.length - 2).join('_') || 'Unknown';
      return { typeId: t, rarity: r };
    }
    return { typeId: 'Unknown', rarity: 'COMMON' };
  }

  private async exists(key: string): Promise<boolean> {
    const v = await this.storage.get(key);
    return !!v;
  }

  async list(uid: string, filter: Filter | undefined, limit = 100, cursor?: string) {
    const rows: Array<{ stackId: string; typeId: string; rarity: string; count: number }> = [];

    // Choose index prefix to scan
    const rarity = filter?.rarity;
    const typeId = filter?.typeId;
    const sourceBoxId = filter?.sourceBoxId;

    let prefix = '';
    let mode: 'rarity' | 'type' | 'src' | 'inv' = 'inv';
    if (rarity) {
      prefix = `idx:rarity:${uid}:${rarity}:`;
      mode = 'rarity';
    } else if (typeId) {
      prefix = `idx:type:${uid}:${typeId}:`;
      mode = 'type';
    } else if (sourceBoxId) {
      prefix = `idx:src:${uid}:${sourceBoxId}:`;
      mode = 'src';
    } else {
      prefix = `inv:${uid}:`;
      mode = 'inv';
    }

    // Scan and collect candidates
    const candidates: string[] = [];
    await this.storage.scanPrefix(prefix, (key, _val) => {
      let sid = '';
      if (mode === 'inv') {
        const parts = key.split(':');
        sid = parts[parts.length - 1] || '';
      } else {
        const parts = key.split(':');
        sid = parts[parts.length - 1] || '';
      }
      if (!sid) return;
      if (cursor && sid <= cursor) return; // cursor by stackId
      candidates.push(sid);
    });

    // Apply other facet filters by checking index membership
    for (const sid of candidates) {
      if (rows.length >= limit) break;
      // If additional filters present, validate via indexes
      if (mode !== 'rarity' && rarity) {
        const ok = await this.exists(`idx:rarity:${uid}:${rarity}:${sid}`);
        if (!ok) continue;
      }
      if (mode !== 'type' && typeId) {
        const ok = await this.exists(`idx:type:${uid}:${typeId}:${sid}`);
        if (!ok) continue;
      }
      if (mode !== 'src' && sourceBoxId) {
        const ok = await this.exists(`idx:src:${uid}:${sourceBoxId}:${sid}`);
        if (!ok) continue;
      }
      const inv = await this.storage.get(`inv:${uid}:${sid}`);
      const count = inv ? inv.readUInt32BE(0) : 0;
      if (count <= 0) continue;
      const meta = this.parseStackMeta(sid);
      rows.push({ stackId: sid, typeId: meta.typeId, rarity: meta.rarity, count });
    }

    const nextCursor = rows.length === limit ? rows[rows.length - 1]!.stackId : null;
    return { rows, nextCursor };
  }
}
