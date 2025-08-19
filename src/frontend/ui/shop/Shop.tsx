import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import React from 'react';

import {
  ShopDocument,
  PurchaseUpgradeDocument,
  ExchangeScrapToKeysDocument,
  type ShopQuery,
} from '../../graphql/graphql';
import { CurrenciesDocument } from '../../graphql/graphql';

export const ShopView: React.FC = () => {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<ShopQuery>(ShopDocument);
  const [purchase] = useMutation(PurchaseUpgradeDocument);
  const [exchange] = useMutation(ExchangeScrapToKeysDocument);
  const [busy, setBusy] = React.useState(false);

  if (loading && !data) return <div className="px-3 py-2 text-sm opacity-70">Loading…</div>;
  if (error) return <div className="px-3 py-2 text-sm opacity-70">Error: {error.message}</div>;
  const shop = data?.shop;
  if (!shop) return null;

  const doBuy = async (id: string) => {
    setBusy(true);
    try {
      await purchase({ variables: { input: { upgradeId: id } } });
      await Promise.all([refetch(), client.refetchQueries({ include: [CurrenciesDocument] })]);
    } finally {
      setBusy(false);
    }
  };

  const doExchange = async (toAmount: number) => {
    setBusy(true);
    try {
      await exchange({ variables: { input: { toAmount } } });
      await Promise.all([refetch(), client.refetchQueries({ include: [CurrenciesDocument] })]);
    } finally {
      setBusy(false);
    }
  };

  const capLeft = Math.max(0, shop.exchange.dailyCapTo - shop.exchange.mintedToday);

  return (
    <div className="space-y-6">
      <section className="rounded border panel p-4">
        <h2 className="text-lg font-semibold mb-2">Upgrades</h2>
        <div className="grid grid-cols-3 gap-3">
          {shop.upgrades.map((u) => {
            const locked = u.purchased;
            return (
              <div key={u.id} className="rounded border panel p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{u.name}</div>
                  {locked && (
                    <span title="Purchased" className="text-xs opacity-70">
                      🔒
                    </span>
                  )}
                </div>
                <div className="text-sm mb-2" style={{ color: 'var(--muted-text)' }}>
                  {u.desc}
                </div>
                <button
                  className="btn-accent"
                  disabled={locked || busy}
                  onClick={() => doBuy(u.id)}
                >
                  {locked ? 'Purchased' : `Buy for ${u.costScrap} SCRAP`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded border panel p-4">
        <h2 className="text-lg font-semibold mb-2">Exchange</h2>
        <div className="text-sm mb-2">
          {shop.exchange.from} → {shop.exchange.to} at {shop.exchange.rateFrom}:
          {shop.exchange.rateTo}
        </div>
        <div className="text-sm mb-2">
          Daily cap: {shop.exchange.dailyCapTo} {shop.exchange.to} — Used today:{' '}
          {shop.exchange.mintedToday} — Left: {capLeft}
        </div>
        <div className="flex gap-2">
          {[1, 5, 10].map((n) => (
            <button
              key={n}
              className="btn-primary"
              disabled={busy || capLeft <= 0}
              onClick={() => doExchange(n)}
            >
              Convert +{n} {shop.exchange.to}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
