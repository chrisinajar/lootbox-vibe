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
  ShopDocument,
  type ShopQuery,
} from '../../graphql/graphql';
// labels and costs come from server via AvailableBoxes query
import { CURRENCY_META, currencyIcon, currencyName } from '../currency/meta';
import { useSfx } from '../sound/Sound';

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

type BoxAvail = { id: string; cost: number };
function useBestBoxSelection(
  available: BoxAvail[],
  keys: bigint,
): [string | undefined, (id: string) => void] {
  const [val, setVal] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const unlocked = available.map((b) => b.id);
    const affordable = available.filter((b) => b.cost <= Number(keys));
    let saved: string | undefined;
    try {
      saved = window.localStorage.getItem('lastBoxId') ?? undefined;
    } catch {
      /* noop */
    }
    if (saved && unlocked.includes(saved)) {
      const savedCost = available.find((b) => b.id === saved)?.cost ?? Number.MAX_SAFE_INTEGER;
      if (savedCost <= Number(keys)) {
        setVal(saved);
        return;
      }
    }
    if (affordable.length > 0) {
      // available is already sorted by ascending cost from the server; pick the most expensive affordable
      const pick = affordable[affordable.length - 1]!.id;
      setVal(pick);
      return;
    }
    // fallback: pick the cheapest available if nothing is affordable (e.g., zero keys but cardboard is free)
    if (available.length > 0) setVal(available[0]!.id);
  }, [available.map((b) => `${b.id}:${b.cost}`).join('|'), String(keys)]);
  const update = (id: string) => {
    setVal(id);
    try {
      window.localStorage.setItem('lastBoxId', id);
    } catch {
      /* noop */
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
      <div className="rounded px-3 py-2 chip min-w-32 flex items-center justify-between">
        <span className="opacity-80 mr-2 flex items-center gap-1">
          <span aria-hidden>
            {label === 'Keys' ? '🔑' : label === 'Scrap' ? '🛠️' : label === 'Glitter' ? '✨' : ''}
          </span>
          {label}
        </span>
        <AnimatedNumber value={isFinite(n) ? n : 0} />
      </div>
    );
  };
  return (
    <div className="flex gap-3">
      <Item label={currencyName('KEYS')} value={keys} />
      <Item label={currencyName('SCRAP')} value={scrap} />
      <Item label={currencyName('GLITTER')} value={glitter} />
    </div>
  );
};

type Row = { typeId: string; rarity: Rarity; count: number };
type RowDecor = Row & { id: string; shiny?: boolean; rainbow?: boolean; newDiscovery?: boolean };

const RecentRewards: React.FC<{ rows: RowDecor[]; nameById?: Record<string, string> }> = ({
  rows,
  nameById,
}) => (
  <motion.ul className="flex gap-2 flex-wrap" layout>
    <AnimatePresence initial={false} mode="popLayout">
      {rows.slice(0, 5).map((r) => (
        <motion.li
          key={r.id}
          className={`rounded px-2 py-1 chip text-sm ${r.shiny ? 'shiny-sparkle' : ''} ${r.newDiscovery ? 'glow-gold' : ''}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          title={CURRENCY_META[r.typeId] ? 'Currency reward' : undefined}
        >
          <span className={r.rainbow ? 'rainbow-text' : ''}>
            {currencyIcon(r.typeId) ? (
              <span className="mr-1" aria-hidden>
                {currencyIcon(r.typeId)}
              </span>
            ) : null}
            {(nameById && nameById[r.typeId]) || r.typeId}
          </span>{' '}
          ({r.rarity}) ×{r.count}
        </motion.li>
      ))}
    </AnimatePresence>
  </motion.ul>
);

const VirtualList: React.FC<{
  rows: RowDecor[];
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
          <motion.div
            key={start + i}
            style={{
              position: 'absolute',
              top: (start + i) * rowHeight,
              left: 0,
              right: 0,
              height: rowHeight,
            }}
            className={`px-3 flex items-center ${r.shiny ? 'shiny-sparkle' : ''} ${r.newDiscovery ? 'glow-gold' : ''}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <span className="text-sm opacity-80 mr-2">{r.rarity}</span>
            <span className={`text-sm ${r.rainbow ? 'rainbow-text' : ''}`}>
              {currencyIcon(r.typeId) ? (
                <span className="mr-1" aria-hidden>
                  {currencyIcon(r.typeId)}
                </span>
              ) : null}
              {(nameById && nameById[r.typeId]) || r.typeId}
            </span>
            <span className="ml-auto text-sm">×{r.count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ResultPanel: React.FC<{ rows: RowDecor[]; nameById?: Record<string, string> }> = ({
  rows,
  nameById,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [groupByRarity, setGroupByRarity] = React.useState(true);
  const [collapseDupes, setCollapseDupes] = React.useState(true);
  let list = rows;
  if (collapseDupes) {
    const agg = new Map<string, RowDecor>();
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
        <div className="flex-1 min-h-6">
          <RecentRewards rows={rows} nameById={nameById} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
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

const BoxFX: React.FC<{
  boxId?: string;
  boxName?: string;
  shakeKey: number;
  rare: boolean;
}> = ({ boxId, boxName, shakeKey, rare }) => {
  // simple placeholder animations
  const base = { scale: 1 };
  const variants: any = {
    cardboard: {
      rotate: [0, -6, 6, -4, 4, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.5 },
    },
    wooden: { rotate: [0, 2, -2, 2, 0], scale: [1, 0.96, 1.04, 1], transition: { duration: 0.5 } },
    iron: {
      rotate: [0, -2, 2, -1, 1, 0],
      scale: [1, 0.92, 1.06, 1],
      transition: { duration: 0.5 },
    },
    unstable: {
      opacity: [1, 0.6, 1],
      filter: ['none', 'hue-rotate(30deg)', 'none'],
      transition: { duration: 0.5 },
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
        key={shakeKey}
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
            key={`confetti-${shakeKey}`}
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
  const { data: currencies } = useQuery<CurrenciesQuery>(CurrenciesDocument);
  const keysBal = React.useMemo(() => {
    const arr = currencies?.currencies ?? [];
    const idx = arr.findIndex((c) => c.currency === 'KEYS');
    return idx >= 0 ? BigInt(arr[idx]!.amount as any) : 0n;
  }, [currencies?.currencies]);
  const available: BoxAvail[] = React.useMemo(
    () => (ub?.availableBoxes ?? []).map((b) => ({ id: b.id, cost: (b as any).cost ?? 0 })),
    [ub?.availableBoxes],
  );
  const [selected, setSelected] = useBestBoxSelection(available, keysBal);
  const selectedCost = React.useMemo(
    () => available.find((b) => b.id === selected)?.cost ?? 0,
    [available, selected],
  );
  const [busy, setBusy] = React.useState(false);
  const [openBoxes] = useMutation<OpenBoxesMutation, OpenBoxesMutationVariables>(OpenBoxesDocument);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<RowDecor[]>([]);
  const [, setRevealQueue] = React.useState<RowDecor[]>([]);
  const [toasts, setToasts] = React.useState<Array<{ id: string; text: string }>>([]);
  const [revealing, setRevealing] = React.useState(false);
  const revealTimer = React.useRef<number | null>(null);
  const revealChunkSize = React.useRef<number>(1);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [rare, setRare] = React.useState(false);
  const rowSeq = React.useRef(0);
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
  const { data: shop } = useQuery<ShopQuery>(ShopDocument);
  const nameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    // currency display names
    for (const [id, meta] of Object.entries(CURRENCY_META)) map[id] = meta.name;
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
        if (revealTimer.current) clearTimeout(revealTimer.current);
        revealTimer.current = null;
        return queue;
      }
      // reveal N items this tick, where N scales so total duration ~1s
      const n = Math.max(1, revealChunkSize.current | 0);
      const chunk = queue.slice(0, n);
      const rest = queue.slice(n);
      setRows((prev) => [...chunk, ...prev].slice(0, 5000));
      // Aim for ~60fps tick until exhausted
      revealTimer.current = window.setTimeout(flushRevealChunk, 16);
      return rest;
    });
  }, []);

  const startReveal = React.useCallback(() => {
    if (revealing) return;
    setRevealing(true);
    revealTimer.current = window.setTimeout(flushRevealChunk, 0);
  }, [revealing, flushRevealChunk]);

  const skipReveal = React.useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = null;
    setRevealing(false);
    setRevealQueue((queue) => {
      if (queue.length > 0) setRows((prev) => [...queue, ...prev].slice(0, 5000));
      return [];
    });
  }, []);

  const doOpen = async (count: number) => {
    const boxId = selected; // snapshot to avoid mid-staging selection changes
    if (!boxId) return;
    setBusy(true);
    setErr(null);
    // Pre-open staging: shake + box-type SFX, then proceed
    const kind = boxId.includes('unstable')
      ? 'unstable'
      : boxId.includes('iron')
        ? 'iron'
        : boxId.includes('wood')
          ? 'wooden'
          : 'cardboard';
    try {
      sfx.box(kind as any);
    } catch {
      /* optional sfx */
    }
    setShakeKey((k) => k + 1);
    const stageDelay = count > 1 ? 1000 : 500; // cap ~1s for bulk; ~0.5s for single
    await new Promise((r) => setTimeout(r, stageDelay));
    const requestId = uuidv4();
    try {
      const res = await openBoxes({ variables: { input: { boxId, count, requestId } } });
      const payload = res.data?.openBoxes;
      const cos = (payload?.cosmetics ?? []) as any[];
      const shinySet = new Set<string>(
        (cos ?? []).filter((c) => c.modId === 'm_shiny').map((c) => String(c.typeId)),
      );
      const rainbowSet = new Set<string>(
        (cos ?? []).filter((c) => c.modId === 'm_rainbow_text').map((c) => String(c.typeId)),
      );
      // Precompute discovery state (first time seen in Collection)
      const discoveredMap = new Map<string, boolean>();
      for (const it of catalog?.collectionLog?.items ?? []) {
        discoveredMap.set(String(it.typeId), Boolean(it.discovered));
      }
      const newStacks = (payload?.stacks ?? []).map((s) => {
        const id = `${Date.now()}-${rowSeq.current++}`;
        return {
          id,
          typeId: s.typeId,
          rarity: s.rarity,
          count: s.count,
          shiny: shinySet.has(String(s.typeId)),
          rainbow: rainbowSet.has(String(s.typeId)),
          newDiscovery: discoveredMap.get(String(s.typeId)) === false,
        } as RowDecor;
      });
      // Surface currency rewards (e.g., KEYS drops) in the results panel
      const currencyRows: RowDecor[] = (() => {
        const sums = new Map<string, bigint>();
        for (const c of payload?.currencies ?? []) {
          const cur = String(c.currency);
          const amt = BigInt(c.amount as any);
          sums.set(cur, (sums.get(cur) ?? 0n) + amt);
        }
        const out: RowDecor[] = [];
        for (const [cur, amt] of sums.entries()) {
          if (amt > 0n) {
            out.push({
              id: `${Date.now()}-cur-${cur}-${rowSeq.current++}`,
              typeId: cur,
              rarity: Rarity.Common,
              count: Number(amt),
            });
          }
        }
        return out;
      })();
      if (newStacks.length > 0 || currencyRows.length > 0) {
        setRevealQueue((q) => {
          const next = [...q, ...currencyRows, ...newStacks];
          // compute chunk size so total reveal fits in ~1s at ~60 ticks
          // chunk = ceil(total / 60); default to 1 for <=60 items
          const total = next.length;
          revealChunkSize.current = Math.max(1, Math.ceil(total / 60));
          return next;
        });
        startReveal();
      }
      // Cosmetic toasts + sfx
      try {
        if ((cos ?? []).length > 0) {
          try {
            sfx.cosmetic();
          } catch {
            /* ignore sfx errors */
          }
        }
        for (const c of cos ?? []) {
          const n = nameById[String(c.typeId)] ?? String(c.typeId);
          const label = String(c.modName ?? c.modId ?? 'Cosmetic');
          const msg = `✨ ${label} ${n} acquired!`;
          const id = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
          setToasts((prev) => [...prev, { id, text: msg }]);
          window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
        }
      } catch {
        /* noop */
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
      } catch {
        /* noop: cache update best-effort */
      }
      const hasRare = (payload?.stacks ?? []).some(
        (s) => rarityRank(s.rarity) >= rarityRank(Rarity.Rare),
      );
      setRare(hasRare);
      try {
        // legacy open ping; keep as subtle additional cue
        sfx.open();
        if (hasRare) sfx.rare();
      } catch {
        /* noop: sfx optional */
      }
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
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast toast-cosmetic">
            <div className="toast-icon">✨</div>
            <div className="toast-body">
              <div className="toast-title">Cosmetic acquired!</div>
              <div className="toast-msg">{t.text}</div>
            </div>
            <button
              className="toast-close"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <CurrenciesBar />
      <div className="rounded border p-4 panel">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">Box</label>
            <select
              className="rounded px-2 py-1"
              value={selected ?? ''}
              onChange={(e: any) => setSelected(e.target.value)}
              disabled={busy}
            >
              {(ub?.availableBoxes ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {(b as any).cost > 0
                    ? ` (${(b as any).cost} key${((b as any).cost ?? 0) === 1 ? '' : 's'})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedCost > 0 && (
            <div
              className={`text-sm ${BigInt(selectedCost ?? 0) > keysBal ? 'text-red-500' : 'opacity-80'}`}
            >
              Cost per open: {selectedCost} key{selectedCost === 1 ? '' : 's'} · You have{' '}
              {String(keysBal)}
            </div>
          )}
          <div className="flex gap-2">
            {(() => {
              const purchasedIds = new Set(
                (shop?.shop?.upgrades ?? []).filter((u) => u.purchased).map((u) => u.id),
              );
              const unlocked: number[] = [1];
              if (purchasedIds.has('upg_bulk_10')) unlocked.push(10);
              if (purchasedIds.has('upg_bulk_100')) unlocked.push(100);
              if (purchasedIds.has('upg_bulk_1000')) unlocked.push(1000);
              const showLabel = (n: number) =>
                unlocked.length === 1 && n === 1 ? 'Open' : `Open ${n}`;
              return unlocked.map((n) => {
                const dr = !selected
                  ? 'Select a box'
                  : busy
                    ? 'Action in progress'
                    : typeof selectedCost === 'number' &&
                        selectedCost > 0 &&
                        keysBal < BigInt(selectedCost) * BigInt(n)
                      ? `Not enough keys (need ${String(
                          BigInt(selectedCost) * BigInt(n) - keysBal,
                        )} more)`
                      : null;
                const isDisabled = Boolean(dr);
                return (
                  <button
                    key={n}
                    disabled={isDisabled}
                    title={dr ?? ''}
                    className={`btn-primary ${isDisabled ? 'cursor-not-allowed' : ''}`}
                    onClick={() => doOpen(n)}
                  >
                    {showLabel(n)}
                  </button>
                );
              });
            })()}
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
        <BoxFX boxId={selected} boxName={selectedName} shakeKey={shakeKey} rare={rare} />
      </div>
      <div className="rounded border p-4 panel">
        <div className="font-medium mb-2">Results</div>
        <div className="mb-2 flex items-center gap-2 justify-end min-h-8">
          <button
            className="btn-accent"
            onClick={skipReveal}
            disabled={!revealing}
            aria-hidden={!revealing}
            tabIndex={revealing ? 0 : -1}
            style={{ visibility: revealing ? 'visible' : 'hidden' }}
          >
            Skip reveal
          </button>
        </div>
        <ResultPanel rows={rows} nameById={nameById} />
      </div>
    </div>
  );
};
