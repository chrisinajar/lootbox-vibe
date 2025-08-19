import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  useQuery,
  HttpLink,
  from,
  useMutation,
  useApolloClient,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';

import {
  InventorySummaryDocument,
  OpenBoxesDocument,
  SalvageDocument,
  Rarity,
  CurrenciesDocument,
  type CurrenciesQuery,
  CollectionLogDocument,
  type CollectionLogQuery,
  BoxCatalogDocument,
  type BoxCatalogQuery,
} from './graphql/graphql';
import App from './ui/App';
import { SettingsProvider } from './ui/settings/SettingsProvider';
import { useSfx } from './ui/sound/Sound';
import { ThemeProvider } from './ui/theme/ThemeProvider';
import './index.css';

export function getTestUserId(): string | undefined {
  try {
    const ss =
      window.sessionStorage?.getItem('X-User-Id') || window.sessionStorage?.getItem('userId');
    if (ss) return ss;
  } catch {
    /* noop: storage read failed */
  }
  try {
    const ls = window.localStorage?.getItem('X-User-Id') || window.localStorage?.getItem('userId');
    if (ls) return ls;
  } catch {
    /* noop: storage read failed */
  }
  return undefined;
}

const authLink = setContext((_, { headers }) => {
  const uid = getTestUserId();
  return {
    headers: {
      ...headers,
      ...(uid ? { 'X-User-Id': uid } : {}),
    },
  };
});

const client = new ApolloClient({
  link: from([authLink, new HttpLink({ uri: 'http://localhost:4000/graphql' })]),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <SettingsProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </SettingsProvider>
    </ApolloProvider>
  </React.StrictMode>,
);

export const InventoryOverview: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(InventorySummaryDocument);
  React.useEffect(() => {
    const handler = () => {
      refetch();
    };
    window.addEventListener('user-id-changed', handler);
    return () => window.removeEventListener('user-id-changed', handler);
  }, [refetch]);
  if (loading) return <span>Loading…</span>;
  if (error) return <span>Error: {error.message}</span>;
  const s = data?.inventorySummary;
  if (!s) return <span>No data</span>;
  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <div className="rounded px-3 py-2 chip">Total stacks: {s.totalStacks}</div>
        <div className="rounded px-3 py-2 chip">Total items: {String(s.totalItems)}</div>
      </div>
      <div>
        <h3 className="font-medium mb-1">By rarity</h3>
        <ul className="grid grid-cols-2 gap-2">
          {s.byRarity
            .filter((r: any) => BigInt(r.count) > 0n)
            .map((r: any) => (
              <li key={r.rarity} className="rounded px-3 py-1 chip">
                {r.rarity}: {String(r.count)}
              </li>
            ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium mb-1">Top types</h3>
        <ul className="grid grid-cols-2 gap-2">
          {s.byType.slice(0, 10).map((t: any) => (
            <li key={t.typeId} className="rounded px-3 py-1 chip">
              {t.typeId}: {String(t.count)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const OpenResultsPanel: React.FC = () => {
  const client = useApolloClient();
  const [openBoxes] = useMutation(OpenBoxesDocument);
  const [salvage] = useMutation(SalvageDocument);
  const [last, setLast] = React.useState<any | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [toasts, setToasts] = React.useState<Array<{ id: string; text: string }>>([]);
  const sfx = useSfx();
  const { data: catalog } = useQuery<CollectionLogQuery>(CollectionLogDocument, {
    fetchPolicy: 'cache-first',
  });
  const { data: boxesCatalog } = useQuery<BoxCatalogQuery>(BoxCatalogDocument, {
    fetchPolicy: 'cache-first',
  });
  const nameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    const items = catalog?.collectionLog?.items ?? [];
    for (const it of items) map[it.id] = it.name;
    const boxes = boxesCatalog?.boxCatalog ?? [];
    for (const b of boxes) map[b.id] = b.name;
    // materials mapping can be added here if needed for dev panel in future
    return map;
  }, [catalog?.collectionLog?.items, boxesCatalog?.boxCatalog]);

  const doOpen = async () => {
    setBusy(true);
    setErr(null);
    const requestId = uuidv4();
    try {
      const res = await openBoxes({
        variables: { input: { boxId: 'box_cardboard', count: 10, requestId } },
      });
      setLast(res.data?.openBoxes ?? null);
      // Cosmetic toasts + sfx
      try {
        const cos = (res.data?.openBoxes?.cosmetics ?? []) as any[];
        if (Array.isArray(cos)) {
          if (cos.length > 0) {
            try {
              sfx?.cosmetic?.();
            } catch {
              /* ignore sfx errors */
            }
          }
          for (const c of cos) {
            const name = nameById[c.typeId] ?? c.typeId;
            const label = String(c.modName ?? c.modId ?? 'Cosmetic');
            const msg = `✨ ${label} ${name} acquired!`;
            const id = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
            setToasts((prev) => [...prev, { id, text: msg }]);
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
          }
        }
      } catch {
        /* best-effort toasts */
      }
      // Optimistically update KEYS based on openBoxes result
      try {
        const payload = res.data?.openBoxes;
        const deltaKeys = (payload?.currencies ?? [])
          .filter((c: any) => c.currency === 'KEYS')
          .reduce((a: bigint, c: any) => a + BigInt(c.amount as any), 0n);
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
      try {
        sfx?.open?.();
        if (
          (res.data?.openBoxes?.stacks ?? []).some((s: any) =>
            ['RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].includes(s.rarity),
          )
        )
          sfx?.rare?.();
      } catch {
        /* noop: sfx optional */
      }
      await client.refetchQueries({ include: [InventorySummaryDocument, CurrenciesDocument] });
      // ensure currencies bar reflects deducted keys in dev panel as well
      await client.refetchQueries({ include: ['Currencies'] as any });
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.toLowerCase().includes('insufficient') && msg.toLowerCase().includes('keys')) {
        setErr('Not enough keys to open boxes.');
      } else {
        setErr('Something went wrong opening boxes. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const doSalvageCommons = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await salvage({ variables: { input: { maxRarity: Rarity.Uncommon } } });
      setLast(res.data?.salvage ?? null);
      try {
        sfx?.salvage?.();
      } catch {
        /* noop: sfx optional */
      }
      await client.refetchQueries({ include: [InventorySummaryDocument] });
    } catch {
      setErr('Something went wrong salvaging your items. Please try again.');
      // silent retry once
      try {
        await salvage({ variables: { input: { maxRarity: Rarity.Uncommon } } });
      } catch {
        /* noop: silent retry */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
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
      <div className="flex gap-2">
        <button disabled={busy} onClick={doOpen} className="btn-primary">
          Open 10 boxes
        </button>
        <button disabled={busy} onClick={doSalvageCommons} className="btn-accent">
          Salvage commons+
        </button>
      </div>
      {err && (
        <div className="text-sm" style={{ color: 'var(--muted-text)' }}>
          {err}
        </div>
      )}
      {last && (
        <div className="text-sm space-y-2">
          {'stacks' in last && last.stacks && (
            <div>
              <div className="font-medium">Stacks</div>
              <ul className="grid grid-cols-2 gap-1">
                {(() => {
                  const cos: any[] = Array.isArray(last.cosmetics) ? last.cosmetics : [];
                  const shiny = new Set<string>(
                    cos.filter((c: any) => c.modId === 'm_shiny').map((c: any) => String(c.typeId)),
                  );
                  const rainbow = new Set<string>(
                    cos
                      .filter((c: any) => c.modId === 'm_rainbow_text')
                      .map((c: any) => String(c.typeId)),
                  );
                  return last.stacks.map((s: any) => {
                    const isShiny = shiny.has(String(s.typeId));
                    const isRainbow = rainbow.has(String(s.typeId));
                    return (
                      <li
                        key={s.stackId}
                        className={`rounded px-2 py-1 chip ${isShiny ? 'shiny-sparkle' : ''}`}
                      >
                        <span className={isRainbow ? 'rainbow-text' : ''}>
                          {nameById[s.typeId] ?? s.typeId}
                        </span>{' '}
                        ({s.rarity}): +{s.count}
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          )}
          {last.currencies && last.currencies.length > 0 && (
            <div>
              <div className="font-medium">Currencies</div>
              <ul className="flex gap-2">
                {last.currencies.map((c: any, i: number) => (
                  <li key={i} className="rounded px-2 py-1 chip">
                    {c.currency}: {String(c.amount)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {last.unlocks && last.unlocks.length > 0 && (
            <div style={{ color: 'var(--success)' }}>Unlocked: {last.unlocks.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
};
