import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import React from 'react';

import {
  InventoryListDocument,
  type InventoryListQuery,
  type InventoryListQueryVariables,
  Rarity,
  SalvageDocument,
  CollectionLogDocument,
  type CollectionLogQuery,
  BoxCatalogDocument,
  MaterialsCatalogDocument,
} from '../../graphql/graphql';

type Row = { stackId: string; typeId: string; rarity: Rarity; count: number };

function rarityOrder(r: Rarity): number {
  const o: Record<Rarity, number> = {
    [Rarity.Common]: 0,
    [Rarity.Uncommon]: 1,
    [Rarity.Rare]: 2,
    [Rarity.Epic]: 3,
    [Rarity.Legendary]: 4,
    [Rarity.Mythic]: 5,
  } as const;
  return o[r] ?? 0;
}

const CURATED_TAGS = [
  { id: 'shiny', label: 'Shiny' },
  { id: 'rainbow_text', label: 'Rainbow Text' },
  { id: 'scrap_boost', label: 'ScrapBoost' },
  { id: 'key_boost', label: 'KeyBoost' },
  { id: 'duplicate_self', label: 'DuplicateSelf' },
  { id: 'bulk_opener', label: 'BulkOpener' },
  { id: 'tiny_chance_rare', label: 'TinyChanceRare' },
  { id: 'useless', label: 'Useless' },
];

type SortOpt = 'NEWEST' | 'RARITY' | 'ALPHA' | 'VALUE';

export const InventoryView: React.FC = () => {
  const client = useApolloClient();
  const [filter, setFilter] = React.useState<InventoryListQueryVariables['filter']>({});
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [sort, setSort] = React.useState<SortOpt>('NEWEST');
  const [salvage] = useMutation(SalvageDocument);

  const { fetchMore, refetch } = useQuery<InventoryListQuery, InventoryListQueryVariables>(
    InventoryListDocument,
    {
      variables: { filter, limit: 100 },
      onCompleted: (d) => {
        const rs = (d?.inventoryList?.rows ?? []).map((r) => ({ ...r }) as Row);
        setRows(rs);
        setCursor(d?.inventoryList?.nextCursor ?? null);
      },
      notifyOnNetworkStatusChange: true,
    },
  );
  const { data: itemsCatalog } = useQuery<CollectionLogQuery>(CollectionLogDocument, {
    fetchPolicy: 'cache-first',
  });
  const { data: boxCatalog } = useQuery<any>(BoxCatalogDocument, { fetchPolicy: 'cache-first' });
  const { data: matsCatalog } = useQuery<any>(MaterialsCatalogDocument, {
    fetchPolicy: 'cache-first',
  });
  const nameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of itemsCatalog?.collectionLog?.items ?? []) map[it.id] = it.name;
    for (const b of boxCatalog?.boxCatalog ?? []) map[b.id] = b.name;
    for (const m of matsCatalog?.materialsCatalog ?? []) map[m.id] = m.name;
    return map;
  }, [itemsCatalog?.collectionLog?.items, boxCatalog?.boxCatalog, matsCatalog?.materialsCatalog]);

  // refetch when filter changes
  React.useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const d = await refetch({ filter, limit: 100, cursor: undefined });
        const rs = (d.data?.inventoryList?.rows ?? []).map((r) => ({ ...r }) as Row);
        setRows(rs);
        setCursor(d.data?.inventoryList?.nextCursor ?? null);
      } finally {
        setBusy(false);
      }
    })();
  }, [JSON.stringify(filter), refetch]);

  const onScroll = async (e: any) => {
    const el = e.target as HTMLDivElement;
    if (!cursor || busy) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (!nearBottom) return;
    setBusy(true);
    try {
      const more = await fetchMore({ variables: { filter, limit: 100, cursor } });
      const rs = (more.data?.inventoryList?.rows ?? []).map((r: any) => ({ ...r }) as Row);
      setRows((prev) => [...prev, ...rs]);
      setCursor(more.data?.inventoryList?.nextCursor ?? null);
    } finally {
      setBusy(false);
    }
  };

  const applySort = (list: Row[]): Row[] => {
    if (sort === 'RARITY')
      return [...list].sort((a, b) => rarityOrder(b.rarity) - rarityOrder(a.rarity));
    if (sort === 'ALPHA') {
      // ASCII A–Z, case-insensitive, locale-independent
      return [...list].sort((a, b) => {
        const A = a.typeId.toLowerCase();
        const B = b.typeId.toLowerCase();
        if (A < B) return -1;
        if (A > B) return 1;
        return 0;
      });
    }
    // VALUE pending backend metadata exposure
    return list; // NEWEST uses server cursor ordering
  };

  const doBulkSalvage = async () => {
    setBusy(true);
    try {
      await salvage({ variables: { input: { maxRarity: Rarity.Uncommon } } });
      await client.refetchQueries({ include: [InventoryListDocument] });
      // reset list from top
      await refetch({ filter, limit: 100, cursor: undefined });
    } finally {
      setBusy(false);
    }
  };

  const Filters: React.FC = () => {
    const set = (p: Partial<NonNullable<typeof filter>>) => setFilter({ ...(filter ?? {}), ...p });
    const toggleTag = (id: string) => {
      const cur = new Set<string>(filter?.curatedTags ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      set({ curatedTags: Array.from(cur) });
    };
    return (
      <div className="rounded border p-3 panel space-y-3">
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs opacity-70">Rarity</label>
            <select
              className="rounded px-2 py-1 block"
              value={filter?.rarity ?? ''}
              onChange={(e) => set({ rarity: (e.target.value || undefined) as any })}
            >
              <option value="">All</option>
              {Object.values(Rarity).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs opacity-70">Type ID</label>
            <input
              className="rounded px-2 py-1 block"
              placeholder="typeId"
              value={filter?.typeId ?? ''}
              onChange={(e) => set({ typeId: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="text-xs opacity-70">Source Box</label>
            <select
              className="rounded px-2 py-1 block"
              value={filter?.sourceBoxId ?? ''}
              onChange={(e) => set({ sourceBoxId: (e.target.value || undefined) as any })}
            >
              <option value="">All</option>
              {(boxCatalog?.boxCatalog ?? []).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs opacity-70">Sort</label>
            <select
              className="rounded px-2 py-1 block"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOpt)}
            >
              <option value="NEWEST">Newest</option>
              <option value="RARITY">Rarity</option>
              <option value="ALPHA">Alphabetical</option>
              <option value="VALUE" disabled>
                Value (pending)
              </option>
            </select>
          </div>
          <div className="ml-auto">
            <button className="btn-accent" disabled={busy} onClick={doBulkSalvage}>
              Salvage All Junk
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-1">Static Mod Tags</div>
          <div className="flex gap-2 flex-wrap">
            {CURATED_TAGS.map((t) => {
              const active = (filter?.curatedTags ?? []).includes(t.id);
              return (
                <button
                  key={t.id}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: active ? 'var(--primary)' : 'var(--chip-bg)' }}
                  onClick={() => toggleTag(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const RowView: React.FC<{ r: Row }> = ({ r }) => {
    const color: Record<Rarity, string> = {
      [Rarity.Common]: '#9ca3af',
      [Rarity.Uncommon]: '#10b981',
      [Rarity.Rare]: '#3b82f6',
      [Rarity.Epic]: '#8b5cf6',
      [Rarity.Legendary]: '#f59e0b',
      [Rarity.Mythic]: '#ef4444',
    } as const;
    const [open, setOpen] = React.useState(false);
    const doSalvageType = async () => {
      setBusy(true);
      try {
        await salvage({ variables: { input: { maxRarity: r.rarity, typeIds: [r.typeId] } } });
        await client.refetchQueries({ include: [InventoryListDocument] });
        await refetch({ filter, limit: 100, cursor: undefined });
      } finally {
        setBusy(false);
        setOpen(false);
      }
    };
    return (
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{ borderLeft: `3px solid ${color[r.rarity]}` }}
      >
        <div className="w-8 h-8 rounded" style={{ background: 'var(--chip-bg)' }} />
        <div className="flex-1">
          <div className="font-medium">{nameById[r.typeId] ?? r.typeId}</div>
          <div className="text-xs opacity-70">{r.rarity}</div>
        </div>
        <div className="rounded px-2 py-1 chip text-sm">×{r.count}</div>
        <div className="relative">
          <button
            className="rounded px-2 py-1"
            style={{ background: 'var(--chip-bg)' }}
            onClick={() => setOpen((v) => !v)}
          >
            ⋯
          </button>
          {open && (
            <div className="absolute right-0 mt-1 rounded border panel text-sm z-10">
              <button
                className="block px-3 py-2 w-full text-left hover:opacity-80"
                onClick={doSalvageType}
              >
                Salvage
              </button>
              <button
                className="block px-3 py-2 w-full text-left hover:opacity-80"
                onClick={() => {
                  setOpen(false);
                  alert('Favorite: coming soon');
                }}
              >
                Lock/Favorite
              </button>
              <button
                className="block px-3 py-2 w-full text-left hover:opacity-80"
                onClick={() => {
                  setOpen(false);
                  alert('Expand: coming soon');
                }}
              >
                Expand
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const list = applySort(rows);

  return (
    <div className="space-y-4">
      <Filters />
      <div
        className="rounded border panel"
        style={{ height: 520, overflow: 'auto' }}
        onScroll={onScroll}
      >
        {list.map((r) => (
          <RowView key={r.stackId} r={r} />
        ))}
        {busy && <div className="px-3 py-2 text-sm opacity-70">Loading…</div>}
        {!busy && list.length === 0 && (
          <div className="px-3 py-2 text-sm opacity-70">No results</div>
        )}
      </div>
    </div>
  );
};
