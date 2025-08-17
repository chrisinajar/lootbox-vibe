import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloClient, ApolloProvider, InMemoryCache, gql, useQuery, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import App from './ui/App';
import './index.css';

export function getTestUserId(): string | undefined {
  try {
    const ss = window.sessionStorage?.getItem('X-User-Id') || window.sessionStorage?.getItem('userId');
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
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);

export const InventoryOverview: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(gql`
    query InventorySummary {
      inventorySummary {
        totalStacks
        totalItems
        byRarity { rarity count }
        byType { typeId count }
      }
    }
  `);
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
        <div className="rounded bg-slate-800 px-3 py-2">Total stacks: {s.totalStacks}</div>
        <div className="rounded bg-slate-800 px-3 py-2">Total items: {String(s.totalItems)}</div>
      </div>
      <div>
        <h3 className="font-medium mb-1">By rarity</h3>
        <ul className="grid grid-cols-2 gap-2">
          {s.byRarity.filter((r: any) => BigInt(r.count) > 0n).map((r: any) => (
            <li key={r.rarity} className="rounded bg-slate-900 px-3 py-1">
              {r.rarity}: {String(r.count)}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium mb-1">Top types</h3>
        <ul className="grid grid-cols-2 gap-2">
          {s.byType.slice(0, 10).map((t: any) => (
            <li key={t.typeId} className="rounded bg-slate-900 px-3 py-1">
              {t.typeId}: {String(t.count)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
