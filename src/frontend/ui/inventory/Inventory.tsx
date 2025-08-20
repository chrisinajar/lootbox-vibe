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
        void ensureExpanded(rs);
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
        void ensureExpanded(rs);
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
      setRows((prev) => {
        const next = [...prev, ...rs];
        void ensureExpanded(rs);
        return next;
      });
      setCursor(more.data?.inventoryList?.nextCursor ?? null);
    } finally {
      setBusy(false);
    }
  };

  // expanded map and helpers: always expanded by default
  const expandKey = (r: Row) => `${r.typeId}|${r.rarity}`;
  const [expanded, setExpanded] = React.useState<
    Record<string, { loading: boolean; rows: Row[]; sig: string }>
  >({});
  const currentSig = React.useMemo(
    () => JSON.stringify({ curatedTags: filter?.curatedTags ?? [] }),
    [JSON.stringify(filter?.curatedTags ?? [])],
  );

  const ensureExpanded = async (seed?: Row[]) => {
    const list = seed ?? rows;
    const unique = new Map<string, Row>();
    for (const r of list) unique.set(expandKey(r), r);
    for (const r of unique.values()) {
      const key = expandKey(r);
      const state = expanded[key];
      if (state && state.sig === currentSig && state.rows.length > 0) continue;
      setExpanded((prev) => ({
        ...prev,
        [key]: { loading: true, rows: state?.rows ?? [], sig: currentSig },
      }));
      // Fetch stacks for this (typeId, rarity) honoring current curatedTags filter
      let acc: Row[] = [];
      let cur: string | null | undefined = undefined;
      for (let i = 0; i < 20; i++) {
        const resp: { data?: InventoryListQuery | null } = await client.query<
          InventoryListQuery,
          InventoryListQueryVariables
        >({
          query: InventoryListDocument,
          variables: {
            filter: { typeId: r.typeId, rarity: r.rarity, curatedTags: filter?.curatedTags ?? [] },
            limit: 200,
            cursor: cur ?? undefined,
          },
          fetchPolicy: 'network-only',
        });
        const page = (resp.data?.inventoryList?.rows ?? []).map((x: any) => ({ ...x }) as Row);
        acc = acc.concat(page);
        cur = resp.data?.inventoryList?.nextCursor ?? null;
        if (!cur) break;
      }
      setExpanded((prev) => ({ ...prev, [key]: { loading: false, rows: acc, sig: currentSig } }));
    }
  };

  const parseTag = (stackId: string): string | null => {
    const vIdx = stackId.lastIndexOf('_v');
    const base = vIdx > 0 ? stackId.slice(0, vIdx) : stackId;
    const tIdx = base.lastIndexOf('_t:');
    if (tIdx > 0) return base.slice(tIdx + 3);
    return null;
  };

  const tagLabel = (tag: string | null): string => {
    if (!tag) return 'Base';
    const curated = CURATED_TAGS.find((t) => t.id === tag)?.label;
    if (curated) return curated;
    const FRIENDLY: Record<string, string> = {
      shiny: 'Shiny',
      rainbow_text: 'Rainbow Text',
      confetti_burst: 'Confetti Burst',
      glitter_border: 'Glitter Border',
      meme_text: 'Meme Text',
      annoying_popup: 'Annoying Pop-Up',
      screams: 'Screams',
      useless: 'Useless',
      scrap_boost: 'ScrapBoost',
      key_boost: 'KeyBoost',
      duplicate_self: 'DuplicateSelf',
      bulk_opener: 'BulkOpener',
      tiny_chance_rare: 'TinyChanceRare',
    };
    if (FRIENDLY[tag]) return FRIENDLY[tag];
    // Fallback: title-case the slug
    return tag
      .split('_')
      .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
      .join(' ');
  };

  const tagChip: (tag: string) => React.ReactNode = (tag) => {
    const cls = 'chip-icon';
    switch (tag) {
      case 'shiny':
        return (
          <span className={cls} title="Shiny" key="shiny">
            ✨
          </span>
        );
      case 'rainbow_text':
        return (
          <span className={cls} title="Rainbow Text" key="rainbow">
            🌈
          </span>
        );
      case 'confetti_burst':
        return (
          <span className={cls} title="Confetti Burst" key="confetti">
            🎉
          </span>
        );
      case 'glitter_border':
        return (
          <span className={cls} title="Glitter Border" key="glitter">
            ✨
          </span>
        );
      case 'useless':
        return (
          <span className={cls} title="Useless" key="useless">
            🗑️
          </span>
        );
      case 'meme_text':
        return (
          <span className={cls} title="Meme Text" key="meme">
            🗨️
          </span>
        );
      case 'annoying_popup':
        return (
          <span className={cls} title="Annoying Pop-Up" key="popup">
            🔔
          </span>
        );
      case 'screams':
        return (
          <span className={cls} title="Screams" key="screams">
            🔊
          </span>
        );
      default:
        return null;
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
    const key = expandKey(r);
    const children = expanded[key]?.rows ?? [];
    const isExpanded = true;
    const _displayedCount =
      children.length > 0 ? children.reduce((s, it) => s + it.count, 0) : r.count;
    const gridCols = { display: 'grid', gridTemplateColumns: '36px 1fr 28px' } as const;
    return (
      <div className="px-3 py-2" style={{ borderLeft: `3px solid ${color[r.rarity]}` }}>
        <div className="items-center" style={gridCols}>
          <div className="w-8 h-8 rounded" style={{ background: 'var(--chip-bg)' }} />
          <div className="min-w-0" />
          <div className="relative justify-self-end">
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
                {/* Always expanded by default; no toggle item */}
              </div>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="w-full mt-2 pl-9">
            {(() => {
              const agg = children.reduce(
                (m: Record<string, number>, it) => {
                  const tag = parseTag(it.stackId) ?? 'base';
                  m[tag] = (m[tag] ?? 0) + it.count;
                  return m;
                },
                {} as Record<string, number>,
              );
              const order = (a: string, b: string) => {
                if (a === 'base') return -1;
                if (b === 'base') return 1;
                const idx = (id: string) => CURATED_TAGS.findIndex((t) => t.id === id);
                const ia = idx(a);
                const ib = idx(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
              };
              return Object.entries(agg)
                .sort(([a], [b]) => order(a, b))
                .map(([tag, count]) => {
                  const nm = nameById[r.typeId] ?? r.typeId;
                  const label = tag === 'base' ? nm : `${tagLabel(tag)} ${nm}`;
                  return (
                    <div
                      key={tag}
                      className="px-2 py-1 text-sm opacity-90 items-center"
                      style={{ display: 'grid', gridTemplateColumns: '16px 1fr 80px' }}
                    >
                      <div className="w-3 h-3 rounded" style={{ background: 'var(--chip-bg)' }} />
                      <div
                        className={`min-w-0 truncate flex items-center gap-2 ${
                          tag === 'shiny' ? 'shiny-sparkle' : ''
                        }`}
                      >
                        {tag && tagChip(tag)}
                        <span className={tag === 'rainbow_text' ? 'rainbow-text' : ''}>
                          {label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="rounded px-2 py-0.5 chip inline-block">×{count}</span>
                      </div>
                    </div>
                  );
                });
            })()}
            {expanded[key]?.loading && (
              <div className="px-2 py-1 text-xs opacity-70">Loading variants…</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // group by typeId+rarity so variants are shown under a single parent
  const list = React.useMemo(() => {
    const seen = new Set<string>();
    const ordered: Row[] = [];
    for (const r of applySort(rows)) {
      const key = `${r.typeId}|${r.rarity}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(r);
    }
    return ordered;
  }, [rows, sort]);

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
