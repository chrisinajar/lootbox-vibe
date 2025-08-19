import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  OpenBoxesDocument,
  InventorySummaryDocument,
  Rarity,
  type OpenBoxesMutation,
  type OpenBoxesMutationVariables,
  CurrenciesDocument,
  type CurrenciesQuery,
  AvailableBoxesDocument,
  type AvailableBoxesQuery,
  CollectionLogDocument,
  type CollectionLogQuery,
  BoxCatalogDocument,
  type BoxCatalogQuery,
  MaterialsCatalogDocument,
  type MaterialsCatalogQuery,
} from '../../graphql/graphql';
import { useSfx } from '../sound/Sound';
// labels come from server via AvailableBoxes query

const BOX_ORDER = ['box_cardboard', 'box_wooden', 'box_iron', 'box_unstable'];

function rarityRank(r: Rarity): number {
  const order: Record<Rarity, number> = {
    [Rarity.Common]: 0,
    [Rarity.Uncommon]: 1,
    [Rarity.Rare]: 2,
    [Rarity.Epic]: 3,
    [Rarity.Legendary]: 4,
    [Rarity.Mythic]: 5,
  } as const;
  return order[r] ?? 0;
}

function useLastBox(unlocked: string[]): [string | undefined, (id: string) => void] {
  const [val, setVal] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    let box = undefined as string | undefined;
    try {
      box = window.localStorage.getItem('lastBoxId') ?? undefined;
    } catch {
      /* noop: storage read failed */
    }
    if (box && unlocked.includes(box)) {
      setVal(box);
    } else if (unlocked.length > 0) {
      const ordered = BOX_ORDER.filter((b) => unlocked.includes(b));
      setVal(ordered[ordered.length - 1] ?? unlocked[0]);
    }
  }, [unlocked.join('|')]);
  const update = (id: string) => {
    setVal(id);
    try {
      window.localStorage.setItem('lastBoxId', id);
    } catch {
      /* noop: storage write failed */
    }
  };
  return [val, update];
}

export const CurrenciesBar: React.FC = () => {
  const { data, loading, error } = useQuery<CurrenciesQuery>(CurrenciesDocument, {
    fetchPolicy: 'cache-and-network',
  });
  if (loading && !data) return <div className="rounded px-3 py-2 chip">Loading currencies…</div>;
  if (error) return <div className="rounded px-3 py-2 chip">Error loading currencies</div>;
  const map = new Map<string, bigint>();
  (data?.currencies ?? []).forEach((c) => map.set(c.currency, BigInt(c.amount as any)));
  const keys = map.get('KEYS') ?? 0n;
  const scrap = map.get('SCRAP') ?? 0n;
  const glitter = map.get('GLITTER') ?? 0n;
  const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const mv = useMotionValue(value);
    const sp = useSpring(mv, { stiffness: 250, damping: 30, mass: 0.3 });
    const rounded = useTransform(sp, (v) => Math.round(v).toString());
    React.useEffect(() => {
      mv.set(value);
    }, [value, mv]);
    return (<motion.span>{rounded}</motion.span>) as any;
  };
  const Item: React.FC<{ label: string; value: bigint }> = ({ label, value }) => {
    const n = Number(value);
    return (
      <div className="rounded px-3 py-2 chip min-w-28 flex items-center justify-between">
        <span className="opacity-80 mr-2">{label}</span>
        <AnimatedNumber value={isFinite(n) ? n : 0} />
      </div>
    );
  };
  return (
    <div className="flex gap-3">
      <Item label="Keys" value={keys} />
      <Item label="Scrap" value={scrap} />
      <Item label="Glitter" value={glitter} />
    </div>
  );
};

type Row = { typeId: string; rarity: Rarity; count: number };

const RecentRewards: React.FC<{ rows: Row[]; nameById?: Record<string, string> }> = ({
  rows,
  nameById,
}) => (
  <ul className="flex gap-2 flex-wrap">
    {rows.slice(0, 5).map((r, i) => (
      <motion.li
        key={i}
        className="rounded px-2 py-1 chip text-sm"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {(nameById && nameById[r.typeId]) || r.typeId} ({r.rarity}) ×{r.count}
      </motion.li>
    ))}
  </ul>
);

const VirtualList: React.FC<{
  rows: Row[];
  height?: number;
  rowHeight?: number;
  nameById?: Record<string, string>;
}> = ({ rows, height = 260, rowHeight = 28, nameById }) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const total = rows.length;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const end = Math.min(total, Math.ceil((scrollTop + height) / rowHeight) + 5);
  const visible = rows.slice(start, end);
  return (
    <div
      style={{ height, overflow: 'auto', position: 'relative' }}
      onScroll={(e: any) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      className="rounded border panel"
    >
      <div style={{ height: total * rowHeight, position: 'relative' }}>
        {visible.map((r, i) => (
          <div
            key={start + i}
            style={{
              position: 'absolute',
              top: (start + i) * rowHeight,
              left: 0,
              right: 0,
              height: rowHeight,
            }}
            className="px-3 flex items-center"
          >
            <span className="text-sm opacity-80 mr-2">{r.rarity}</span>
            <span className="text-sm">{(nameById && nameById[r.typeId]) || r.typeId}</span>
            <span className="ml-auto text-sm">×{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultPanel: React.FC<{ rows: Row[]; nameById?: Record<string, string> }> = ({
  rows,
  nameById,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [groupByRarity, setGroupByRarity] = React.useState(true);
  const [collapseDupes, setCollapseDupes] = React.useState(true);
  let list = rows;
  if (collapseDupes) {
    const agg = new Map<string, Row>();
    for (const r of rows) {
      const k = `${r.typeId}|${r.rarity}`;
      const prev = agg.get(k);
      if (prev) prev.count += r.count;
      else agg.set(k, { ...r });
    }
    list = Array.from(agg.values());
  }
  if (groupByRarity) {
    list = [...list].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="mr-auto">
          <RecentRewards rows={rows} nameById={nameById} />
        </div>
        <label className="text-sm flex items-center gap-1">
          <input
            type="checkbox"
            checked={groupByRarity}
            onChange={(e: any) => setGroupByRarity(e.target.checked)}
          />{' '}
          group by rarity
        </label>
        <label className="text-sm flex items-center gap-1">
          <input
            type="checkbox"
            checked={collapseDupes}
            onChange={(e: any) => setCollapseDupes(e.target.checked)}
          />{' '}
          collapse duplicates
        </label>
        <button className="btn-accent" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Show'} full
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <VirtualList rows={list.slice(0, 5000)} nameById={nameById} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BoxFX: React.FC<{ boxId?: string; boxName?: string; trigger: number; rare: boolean }> = ({
  boxId,
  boxName,
  trigger,
  rare,
}) => {
  // simple placeholder animations
  const base = { scale: 1 };
  const variants: any = {
    cardboard: { rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.05, 1], transition: { duration: 0.6 } },
    wooden: { scale: [1, 0.95, 1.05, 1], transition: { duration: 0.4 } },
    iron: { scale: [1, 0.9, 1.1, 1], transition: { duration: 0.5 } },
    unstable: {
      opacity: [1, 0.6, 1],
      filter: ['none', 'hue-rotate(30deg)', 'none'],
      transition: { duration: 0.6 },
    },
  };
  const key = boxId?.includes('unstable')
    ? 'unstable'
    : boxId?.includes('iron')
      ? 'iron'
      : boxId?.includes('wood')
        ? 'wooden'
        : 'cardboard';
  return (
    <div className="h-40 flex items-center justify-center">
      <motion.div
        key={trigger}
        initial={base}
        animate={variants[key]}
        className="rounded px-10 py-8"
        style={{ background: 'var(--panel-bg)', border: `1px solid var(--panel-border)` }}
      >
        <div className="text-sm opacity-80">{boxName ?? boxId ?? 'select a box'}</div>
      </motion.div>
      <AnimatePresence>
        {rare && (
          <motion.div
            key={`confetti-${trigger}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {[...Array(40)].map((_, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: 0,
                  width: 6,
                  height: 10,
                  background: ['#f59e0b', '#10b981', '#6366f1', '#ef4444'][i % 4],
                  transform: `translateY(${Math.random() * 10}px) rotate(${Math.random() * 40 - 20}deg)`,
                  animation: `fall 900ms ease-out ${i * 8}ms forwards`,
                }}
              />
            ))}
            <style>{`@keyframes fall { to { transform: translateY(80vh) rotate(360deg); opacity: 0; } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const HomeMain: React.FC = () => {
  const client = useApolloClient();
  useQuery<CurrenciesQuery>(CurrenciesDocument);
  const { data: ub } = useQuery<AvailableBoxesQuery>(AvailableBoxesDocument);
  const unlocked = (ub?.availableBoxes ?? []).map((b) => b.id);
  const [selected, setSelected] = useLastBox(unlocked);
  const [openBoxes] = useMutation<OpenBoxesMutation, OpenBoxesMutationVariables>(OpenBoxesDocument);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [revealQueue, setRevealQueue] = React.useState<Row[]>([]);
  const [revealing, setRevealing] = React.useState(false);
  const revealTimer = React.useRef<number | null>(null);
  const [fxKey, setFxKey] = React.useState(0);
  const [rare, setRare] = React.useState(false);
  const sfx = useSfx();
  const { data: catalog } = useQuery<CollectionLogQuery>(CollectionLogDocument, {
    fetchPolicy: 'cache-first',
  });
  const { data: boxesCatalog } = useQuery<BoxCatalogQuery>(BoxCatalogDocument, {
    fetchPolicy: 'cache-first',
  });
  const { data: matsCatalog } = useQuery<MaterialsCatalogQuery>(MaterialsCatalogDocument, {
    fetchPolicy: 'cache-first',
  });
  const nameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    const items = catalog?.collectionLog?.items ?? [];
    for (const it of items) map[it.id] = it.name;
    const boxes = boxesCatalog?.boxCatalog ?? [];
    for (const b of boxes) map[b.id] = b.name;
    const mats = matsCatalog?.materialsCatalog ?? [];
    for (const m of mats) map[m.id] = m.name;
    return map;
  }, [catalog?.collectionLog?.items, boxesCatalog?.boxCatalog, matsCatalog?.materialsCatalog]);
  const selectedName = React.useMemo(
    () => (ub?.availableBoxes ?? []).find((b) => b.id === selected)?.name,
    [ub?.availableBoxes, selected],
  );

  const flushRevealChunk = React.useCallback(() => {
    setRevealQueue((queue) => {
      if (queue.length === 0) {
        setRevealing(false);
        revealTimer.current && clearTimeout(revealTimer.current);
        revealTimer.current = null;
        return queue;
      }
      const chunk = queue.slice(0, 50);
      const rest = queue.slice(50);
      setRows((prev) => [...chunk, ...prev].slice(0, 5000));
      revealTimer.current = window.setTimeout(flushRevealChunk, 50);
      return rest;
    });
  }, []);

  const startReveal = React.useCallback(() => {
    if (revealing) return;
    setRevealing(true);
    revealTimer.current = window.setTimeout(flushRevealChunk, 0);
  }, [revealing, flushRevealChunk]);

  const skipReveal = React.useCallback(() => {
    revealTimer.current && clearTimeout(revealTimer.current);
    revealTimer.current = null;
    setRevealing(false);
    setRevealQueue((queue) => {
      if (queue.length > 0) setRows((prev) => [...queue, ...prev].slice(0, 5000));
      return [];
    });
  }, []);

  const doOpen = async (count: number) => {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    const requestId = uuidv4();
    try {
      const res = await openBoxes({ variables: { input: { boxId: selected, count, requestId } } });
      const payload = res.data?.openBoxes;
      const newStacks = (payload?.stacks ?? []).map(
        (s) => ({ typeId: s.typeId, rarity: s.rarity, count: s.count }) as Row,
      );
      if (newStacks.length > 0) {
        setRevealQueue((q) => [...q, ...newStacks]);
        startReveal();
      }
      // Optimistic KEYS update based on mutation result
      try {
        const deltaKeys = (payload?.currencies ?? [])
          .filter((c) => c.currency === 'KEYS')
          .reduce((a, c) => a + BigInt(c.amount as any), 0n);
        if (deltaKeys !== 0n) {
          client.cache.updateQuery<CurrenciesQuery>({ query: CurrenciesDocument }, (data) => {
            const arr = data?.currencies ?? [];
            const idx = arr.findIndex((c) => c.currency === 'KEYS');
            const current = idx >= 0 ? BigInt(arr[idx]!.amount as any) : 0n;
            const next = current + deltaKeys;
            const nextArr =
              idx >= 0
                ? arr.map((c, i) => (i === idx ? { ...c, amount: next as any } : c))
                : [{ currency: 'KEYS', amount: next as any }, ...arr];
            return { currencies: nextArr } as any;
          });
        }
      } catch {}
      const hasRare = (payload?.stacks ?? []).some(
        (s) => rarityRank(s.rarity) >= rarityRank(Rarity.Rare),
      );
      setRare(hasRare);
      setFxKey((k) => k + 1);
      try {
        sfx.open();
        if (hasRare) sfx.rare();
      } catch {}
      await client.refetchQueries({ include: [InventorySummaryDocument, CurrenciesDocument] });
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.toLowerCase().includes('insufficient') && msg.toLowerCase().includes('keys')) {
        setErr('Not enough keys to open this box.');
      } else {
        setErr('Something went wrong opening boxes. Please try again.');
      }
    } finally {
      setBusy(false);
      setTimeout(() => setRare(false), 1200);
    }
  };

  return (
    <div className="space-y-4">
      <CurrenciesBar />
      <div className="rounded border p-4 panel">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">Box</label>
            <select
              className="rounded px-2 py-1"
              value={selected ?? ''}
              onChange={(e: any) => setSelected(e.target.value)}
            >
              {(ub?.availableBoxes ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {[1, 10, 100, 1000].map((n) => (
              <button
                key={n}
                disabled={!selected || busy}
                className="btn-primary"
                onClick={() => doOpen(n)}
              >
                Open {n}
              </button>
            ))}
          </div>
          {err && (
            <div className="text-sm" style={{ color: 'var(--muted-text)' }}>
              {err}
            </div>
          )}
          <div className="text-sm opacity-80">
            Last used:{' '}
            {selected
              ? ((ub?.availableBoxes ?? []).find((b) => b.id === selected)?.name ?? selected)
              : '-'}
          </div>
        </div>
        <BoxFX boxId={selected} boxName={selectedName} trigger={fxKey} rare={rare} />
      </div>
      <div className="rounded border p-4 panel">
        <div className="font-medium mb-2">Results</div>
        <div className="mb-2 flex items-center gap-2">
          {revealing && (
            <button className="btn-accent" onClick={skipReveal}>
              Skip reveal
            </button>
          )}
        </div>
        <ResultPanel rows={rows} nameById={nameById} />
      </div>
    </div>
  );
};
