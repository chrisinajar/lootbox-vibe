import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ProgressionDocument,
  type ProgressionQuery,
  ClaimIdleDocument,
} from '../../graphql/graphql';

export const ProgressionView: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<ProgressionQuery>(ProgressionDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const [claimIdle] = useMutation(ClaimIdleDocument);
  const [modal, setModal] = React.useState<{ open: boolean; msg?: string; err?: string }>(() => ({
    open: false,
  }));

  React.useEffect(() => {
    const h = () => refetch();
    window.addEventListener('user-id-changed', h);
    return () => window.removeEventListener('user-id-changed', h);
  }, [refetch]);

  const doClaim = async () => {
    try {
      const res = await claimIdle({ variables: { input: {} } });
      const msg = res.data?.claimIdle?.message ?? 'All caught up!';
      setModal({ open: true, msg });
    } catch (_e) {
      setModal({
        open: true,
        err: 'Something went wrong claiming your idle rewards. We will retry silently.',
      });
      setTimeout(async () => {
        try {
          await claimIdle({ variables: { input: {} } });
        } catch {}
      }, 1500);
    }
  };

  if (loading && !data) return <div className="px-3 py-2 text-sm opacity-70">Loading…</div>;
  if (error) return <div className="px-3 py-2 text-sm opacity-70">Error: {error.message}</div>;

  const ms = data?.progression?.milestones ?? [];
  const rng = data?.progression?.rng ?? [];

  const Bar: React.FC<{ cur: number; total: number }> = ({ cur, total }) => (
    <div className="h-2 rounded" style={{ background: 'var(--chip-bg)' }}>
      <div
        className="h-2 rounded"
        style={{ width: `${(total ? cur / total : 0) * 100}%`, background: 'var(--primary)' }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded border panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <button className="btn-primary" onClick={doClaim}>
            Claim idle
          </button>
        </div>
        <div className="space-y-3">
          {ms.map((m) => (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{m.label}</span>
                <span>
                  {m.current}/{m.target}
                </span>
              </div>
              <Bar cur={m.current} total={m.target || Math.max(1, m.current)} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded border panel p-4">
        <h2 className="text-lg font-semibold mb-2">RNG Unlocks</h2>
        <ul className="grid grid-cols-2 gap-2">
          {rng.map((r) => (
            <li key={r.id} className="rounded px-3 py-2 chip">
              {r.discovered ? r.label : '???'}
            </li>
          ))}
        </ul>
      </section>

      {modal.open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setModal({ open: false })}
        >
          <div className="rounded border panel p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Idle report</h3>
            {modal.err ? (
              <div className="text-sm" style={{ color: 'var(--muted-text)' }}>
                {modal.err}
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--muted-text)' }}>
                {modal.msg}
              </div>
            )}
            <div className="mt-3 text-right">
              <button className="btn-primary" onClick={() => setModal({ open: false })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
