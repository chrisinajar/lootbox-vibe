import React from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  OpenBoxesDocument,
  InventorySummaryDocument,
  Rarity,
  type OpenBoxesMutation,
  type OpenBoxesMutationVariables,
} from '../../graphql/graphql';
import { CurrenciesDocument, type CurrenciesQuery } from '../../graphql/graphql';
import { UnlockedBoxesDocument, type UnlockedBoxesQuery } from '../../graphql/graphql';

const BOX_ORDER = ['box.cardboard', 'box.wooden', 'box.iron', 'box.unstable'];

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
    } catch {}
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
    } catch {}
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
  const Item: React.FC<{ label: string; value: bigint }> = ({ label, value }) => (
    <div className="rounded px-3 py-2 chip min-w-28 flex items-center justify-between">
      <span className="opacity-80 mr-2">{label}</span>
      <motion.span animate={{}}>{String(value)}</motion.span>
    </div>
  );
  return (
    <div className="flex gap-3">
      <Item label="Keys" value={keys} />
      <Item label="Scrap" value={scrap} />
      <Item label="Glitter" value={glitter} />
    </div>
  );
};

type Row = { typeId: string; rarity: Rarity; count: number };

const RecentRewards: React.FC<{ rows: Row[] }> = ({ rows }) => (
  <ul className="flex gap-2 flex-wrap">
    {rows.slice(0, 5).map((r, i) => (
      <li key={i} className="rounded px-2 py-1 chip text-sm">
        {r.typeId} ({r.rarity}) ×{r.count}
      </li>
    ))}
  </ul>
);

const VirtualList: React.FC<{ rows: Row[]; height?: number; rowHeight?: number }> = ({
  rows,
  height = 260,
  rowHeight = 28,
}) => {
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
            <span className="text-sm">{r.typeId}</span>
            <span className="ml-auto text-sm">×{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultPanel: React.FC<{ rows: Row[] }> = ({ rows }) => {
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
          <RecentRewards rows={rows} />
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
            <VirtualList rows={list.slice(0, 5000)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BoxFX: React.FC<{ boxId?: string; trigger: number; rare: boolean }> = ({
  boxId,
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
        <div className="text-sm opacity-80">{boxId ?? 'select a box'}</div>
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
  const { data: curData } = useQuery<CurrenciesQuery>(CurrenciesDocument);
  const { data: ub } = useQuery<UnlockedBoxesQuery>(UnlockedBoxesDocument);
  const unlocked = ub?.unlockedBoxes ?? [];
  const [selected, setSelected] = useLastBox(unlocked);
  const [openBoxes] = useMutation<OpenBoxesMutation, OpenBoxesMutationVariables>(OpenBoxesDocument);
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [fxKey, setFxKey] = React.useState(0);
  const [rare, setRare] = React.useState(false);

  const doOpen = async (count: number) => {
    if (!selected) return;
    setBusy(true);
    const requestId = uuidv4();
    try {
      const res = await openBoxes({ variables: { input: { boxId: selected, count, requestId } } });
      const payload = res.data?.openBoxes;
      const newStacks = (payload?.stacks ?? []).map(
        (s) => ({ typeId: s.typeId, rarity: s.rarity, count: s.count }) as Row,
      );
      if (newStacks.length > 0) setRows((prev) => [...newStacks, ...prev].slice(0, 5000));
      const hasRare = (payload?.stacks ?? []).some(
        (s) => rarityRank(s.rarity) >= rarityRank(Rarity.Rare),
      );
      setRare(hasRare);
      setFxKey((k) => k + 1);
      await client.refetchQueries({ include: [InventorySummaryDocument, CurrenciesDocument] });
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
              {unlocked.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <button disabled={!selected || busy} className="btn-primary" onClick={() => doOpen(10)}>
            Open 10
          </button>
          <div className="text-sm opacity-80">Last used: {selected ?? '-'}</div>
        </div>
        <BoxFX boxId={selected} trigger={fxKey} rare={rare} />
      </div>
      <div className="rounded border p-4 panel">
        <div className="font-medium mb-2">Results</div>
        <ResultPanel rows={rows} />
      </div>
    </div>
  );
};
