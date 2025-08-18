import React from 'react';
import ReactDOM from 'react-dom/client';
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
import App from './ui/App';
import { ThemeProvider } from './ui/theme/ThemeProvider';
import './index.css';
import {
  InventorySummaryDocument,
  OpenBoxesDocument,
  SalvageDocument,
  Rarity,
} from './graphql/graphql';
import { v4 as uuidv4 } from 'uuid';

export function getTestUserId(): string | undefined {
  try {
    const ss =
      window.sessionStorage?.getItem('X-User-Id') || window.sessionStorage?.getItem('userId');
    if (ss) return ss;
  } catch {}
  try {
    const ls = window.localStorage?.getItem('X-User-Id') || window.localStorage?.getItem('userId');
    if (ls) return ls;
  } catch {}
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
      <ThemeProvider>
        <App />
      </ThemeProvider>
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

  const doOpen = async () => {
    setBusy(true);
    const requestId = uuidv4();
    try {
      const res = await openBoxes({
        variables: { input: { boxId: 'box.cardboard', count: 10, requestId } },
      });
      setLast(res.data?.openBoxes ?? null);
      await client.refetchQueries({ include: [InventorySummaryDocument] });
    } finally {
      setBusy(false);
    }
  };

  const doSalvageCommons = async () => {
    setBusy(true);
    try {
      const res = await salvage({ variables: { input: { maxRarity: Rarity.Uncommon } } });
      setLast(res.data?.salvage ?? null);
      await client.refetchQueries({ include: [InventorySummaryDocument] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={doOpen}
          className="btn-primary"
        >
          Open 10 boxes
        </button>
        <button
          disabled={busy}
          onClick={doSalvageCommons}
          className="btn-accent"
        >
          Salvage commons+
        </button>
      </div>
      {last && (
        <div className="text-sm space-y-2">
          {'stacks' in last && last.stacks && (
            <div>
              <div className="font-medium">Stacks</div>
              <ul className="grid grid-cols-2 gap-1">
                {last.stacks.map((s: any) => (
                  <li key={s.stackId} className="rounded px-2 py-1 chip">
                    {s.typeId} ({s.rarity}): +{s.count}
                  </li>
                ))}
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
