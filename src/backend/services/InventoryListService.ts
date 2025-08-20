import { StorageProvider } from '../storage/StorageProvider';

type Filter = { rarity?: string; typeId?: string; sourceBoxId?: string; curatedTags?: string[] };

export class InventoryListService {
  constructor(private storage: StorageProvider) {}

  private parseStackMeta(stackId: string): { typeId: string; rarity: string } {
    // Supported patterns:
    // - `${typeId}_${rarity}_v{n}`
    // - `${typeId}_${rarity}_t:{tag}_v{n}`
    // Extract by stripping `_v{n}` and optional `_t:{tag}` suffixes
    let base = stackId;
    const vIdx = base.lastIndexOf('_v');
    if (vIdx > 0) base = base.slice(0, vIdx);
    const tIdx = base.lastIndexOf('_t:');
    if (tIdx > 0) base = base.slice(0, tIdx);
    if (base.endsWith('_base')) base = base.slice(0, -'_base'.length);
    const parts = base.split('_');
    if (parts.length >= 2) {
      const rarity = parts[parts.length - 1] || 'COMMON';
      const typeId = parts.slice(0, parts.length - 1).join('_') || 'Unknown';
      return { typeId, rarity };
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
    const curatedTags = Array.isArray(filter?.curatedTags) ? (filter!.curatedTags as string[]) : [];

    let prefix = '';
    let mode: 'rarity' | 'type' | 'src' | 'tag' | 'inv' = 'inv';
    if (rarity) {
      prefix = `idx:rarity:${uid}:${rarity}:`;
      mode = 'rarity';
    } else if (typeId) {
      prefix = `idx:type:${uid}:${typeId}:`;
      mode = 'type';
    } else if (sourceBoxId) {
      prefix = `idx:src:${uid}:${sourceBoxId}:`;
      mode = 'src';
    } else if (curatedTags.length === 1) {
      prefix = `idx:tag:${uid}:${curatedTags[0]}:`;
      mode = 'tag';
    } else {
      prefix = `inv:${uid}:`;
      mode = 'inv';
    }

    // Scan and collect candidates
    const candidates: string[] = [];
    await this.storage.scanPrefix(prefix, (key, _val) => {
      // Extract stackId by slicing off the known prefix to preserve any ':' within stackId
      const sid = key.slice(prefix.length);
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
      if (curatedTags.length > 0) {
        let any = false;
        for (const t of curatedTags) {
          if (await this.exists(`idx:tag:${uid}:${t}:${sid}`)) {
            any = true;
            break;
          }
        }
        if (!any) continue;
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
