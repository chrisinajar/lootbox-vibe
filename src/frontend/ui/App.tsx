import React from 'react';
import { InventoryOverview } from '../main';
import { UserSwitcherBadge } from './UserSwitcherBadge';

const App: React.FC = () => {
  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Lootbox simulator</h1>
      </header>
      <main className="space-y-4">
        <div className="rounded border border-slate-800 p-4 bg-slate-900/40">
          <InventoryOverview />
        </div>
        <div>
          <button className="rounded bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium">
            Open 10 boxes
          </button>
        </div>
      </main>
      <UserSwitcherBadge />
    </div>
  );
};

export default App;
