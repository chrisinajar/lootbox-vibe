import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import React from 'react';

import {
  ShopDocument,
  PurchaseUpgradeDocument,
  ExchangeScrapToKeysDocument,
  type ShopQuery,
} from '../../graphql/graphql';
import { CurrenciesDocument } from '../../graphql/graphql';
import { currencyIcon, currencyName } from '../currency/meta';

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

  // Progressive reveal: only show bulk tiers when prereqs purchased
  const purchased = new Set(shop.upgrades.filter((u) => u.purchased).map((u) => u.id));
  const isVisible = (id: string, purchasedSelf: boolean) => {
    if (id === 'upg_bulk_10') return true;
    if (id === 'upg_bulk_100') return purchasedSelf || purchased.has('upg_bulk_10');
    if (id === 'upg_bulk_1000') return purchasedSelf || purchased.has('upg_bulk_100');
    return true;
  };
  const visibleUpgrades = shop.upgrades.filter((u) => isVisible(u.id, u.purchased));

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
          {visibleUpgrades.map((u) => {
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
                  {locked ? (
                    'Purchased'
                  ) : (
                    <span title="Costs Scrap">
                      Buy for {currencyIcon('SCRAP')} {u.costScrap} {currencyName('SCRAP')}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded border panel p-4">
        <h2 className="text-lg font-semibold mb-2">Exchange</h2>
        <div className="text-sm mb-2" title="Exchange rate">
          {currencyIcon(shop.exchange.from)} {currencyName(shop.exchange.from)} →{' '}
          {currencyIcon(shop.exchange.to)} {currencyName(shop.exchange.to)} at{' '}
          {shop.exchange.rateFrom}:{shop.exchange.rateTo}
        </div>
        <div className="text-sm mb-2" title="Daily mint cap for target currency">
          Daily cap: {shop.exchange.dailyCapTo} {currencyName(shop.exchange.to)} — Used today:{' '}
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
              Convert +{n} {currencyIcon(shop.exchange.to)} {currencyName(shop.exchange.to)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
