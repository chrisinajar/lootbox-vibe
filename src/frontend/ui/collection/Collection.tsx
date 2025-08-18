import React from 'react';
import { useQuery } from '@apollo/client';
import { CollectionLogDocument, type CollectionLogQuery, Rarity } from '../../graphql/graphql';

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

export const CollectionView: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<CollectionLogQuery>(CollectionLogDocument, {
    fetchPolicy: 'cache-and-network',
  });
  React.useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('user-id-changed', handler);
    return () => window.removeEventListener('user-id-changed', handler);
  }, [refetch]);
  if (loading && !data) return <div className="px-3 py-2 text-sm opacity-70">Loading…</div>;
  if (error) return <div className="px-3 py-2 text-sm opacity-70">Error: {error.message}</div>;
  const items = (data?.collectionLog?.items ?? [])
    .slice()
    .sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity) || a.name.localeCompare(b.name));
  const Meter: React.FC<{ title: string; cur: number; total: number }> = ({
    title,
    cur,
    total,
  }) => (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="opacity-80">{title}</span>
        <span>
          {cur}/{total}
        </span>
      </div>
      <div className="h-2 rounded" style={{ background: 'var(--chip-bg)' }}>
        <div
          className="h-2 rounded"
          style={{ width: `${(total ? cur / total : 0) * 100}%`, background: 'var(--primary)' }}
        />
      </div>
    </div>
  );
  const groupedByRarity = data?.collectionLog?.byRarity ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {groupedByRarity.map((r) => (
          <Meter key={r.key} title={`Rarity: ${r.key}`} cur={r.discovered} total={r.total} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map((it) => {
          const known = it.discovered;
          const frameColor: Record<Rarity, string> = {
            [Rarity.Common]: '#9ca3af',
            [Rarity.Uncommon]: '#10b981',
            [Rarity.Rare]: '#3b82f6',
            [Rarity.Epic]: '#8b5cf6',
            [Rarity.Legendary]: '#f59e0b',
            [Rarity.Mythic]: '#ef4444',
          } as const;
          return (
            <div key={it.id} className="rounded border p-3 panel">
              <div
                className="aspect-square w-full rounded mb-2 flex items-center justify-center"
                style={{
                  border: `2px solid ${frameColor[it.rarity]}`,
                  background: known ? 'transparent' : 'rgba(0,0,0,0.2)',
                  filter: known ? 'none' : 'grayscale(100%) brightness(0.6)',
                }}
              >
                <span className="text-xs opacity-70">{known ? it.name : '???'}</span>
              </div>
              {!known && (
                <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
                  {it.hint ?? 'Mysterious…'}
                </div>
              )}
              {known && (
                <div className="flex gap-2 mt-1">
                  {it.hasCosmetic && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--chip-bg)' }}
                    >
                      Cosmetic
                    </span>
                  )}
                  {it.hasMechanical && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--chip-bg)' }}
                    >
                      Mechanical
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
