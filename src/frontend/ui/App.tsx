import React from 'react';
import { InventoryOverview, OpenResultsPanel } from '../main';
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
        <div className="rounded border border-slate-800 p-4 bg-slate-900/40">
          <OpenResultsPanel />
        </div>
      </main>
      <UserSwitcherBadge />
    </div>
  );
};

export default App;
