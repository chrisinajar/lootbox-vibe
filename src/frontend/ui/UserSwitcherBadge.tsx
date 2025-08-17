import React from 'react';
import { getTestUserId } from '../main';

const setUid = (uid?: string) => {
  try {
    if (!uid) {
      window.sessionStorage.removeItem('X-User-Id');
      window.localStorage.removeItem('X-User-Id');
    } else {
      window.sessionStorage.setItem('X-User-Id', uid);
    }
  } catch {}
  // notify listeners to refetch
  window.dispatchEvent(new Event('user-id-changed'));
};

export const UserSwitcherBadge: React.FC = () => {
  const [uid, setUidState] = React.useState<string | undefined>(() => getTestUserId() || 'anonymous');

  const switchTo = (next?: string) => {
    setUid(next);
    setUidState(next || 'anonymous');
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 text-xs">
      <div className="rounded bg-slate-800/90 border border-slate-700 shadow px-3 py-2 backdrop-blur">
        <div className="mb-1">
          <span className="opacity-70">User:</span> <span className="font-mono">{uid || 'anonymous'}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500"
            onClick={() => switchTo('seed-user')}
            title="Use seeded test account"
          >
            seed-user
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
            onClick={() => switchTo('anonymous')}
            title="Use empty account"
          >
            anonymous
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
            onClick={() => switchTo(undefined)}
            title="Clear header override"
          >
            clear
          </button>
        </div>
      </div>
    </div>
  );
};

