import React from 'react';
import { InventoryOverview, OpenResultsPanel } from '../main';
import { UserSwitcherBadge } from './UserSwitcherBadge';
import { useTheme } from './theme/ThemeProvider';
import { HomeMain } from './home/Home';
import { InventoryView } from './inventory/Inventory';
import { CollectionView } from './collection/Collection';
import { ShopView } from './shop/Shop';

function useHashPath() {
  const [path, setPath] = React.useState<string>(() => window.location.hash.slice(1) || '/');
  React.useEffect(() => {
    const onHash = () => setPath(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return path;
}

const ENABLE_DEV_UI =
  import.meta.env.VITE_ENABLE_DEV_UI === '1' || import.meta.env.MODE !== 'production';

const DevDashboard: React.FC = () => (
  <div className="min-h-dvh p-6">
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">Dev dashboard</h1>
      <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
        Raw data views for testing. Disabled on prod.
      </p>
    </header>
    <main className="space-y-4">
      <div className="rounded border p-4 panel">
        <InventoryOverview />
      </div>
      <div className="rounded border p-4 panel">
        <OpenResultsPanel />
      </div>
    </main>
    <UserSwitcherBadge />
  </div>
);

const HomeShell: React.FC = () => {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lootbox simulator</h1>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            UI Milestone 2 — foundation in place.
          </p>
        </div>
        <button onClick={toggle} className="btn-primary">
          Theme: {theme}
        </button>
      </header>
      <main className="space-y-4">
        <HomeMain />
      </main>
      {ENABLE_DEV_UI && (
        <a
          href="/#/dev"
          className="fixed bottom-4 left-4 rounded px-3 py-2 text-xs font-medium"
          style={{ background: 'var(--chip-bg)', color: 'var(--muted-text)' }}
        >
          Open Dev Dashboard
        </a>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const path = useHashPath();
  if (ENABLE_DEV_UI && path === '/dev') return <DevDashboard />;
  if (path === '/shop')
    return (
      <div className="min-h-dvh p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Shop & Upgrades</h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Spend scrap on upgrades or exchange for keys.
            </p>
          </div>
          <a href="/#/" className="btn-primary">
            Back to Home
          </a>
        </header>
        <ShopView />
      </div>
    );
  if (path === '/collection')
    return (
      <div className="min-h-dvh p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Collection Log</h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Discover items and track completion by rarity.
            </p>
          </div>
          <a href="/#/" className="btn-primary">
            Back to Home
          </a>
        </header>
        <CollectionView />
      </div>
    );
  if (path === '/inventory')
    return (
      <div className="min-h-dvh p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Virtualized infinite list with filters and salvage.
            </p>
          </div>
          <a href="/#/" className="btn-primary">
            Back to Home
          </a>
        </header>
        <InventoryView />
      </div>
    );
  return <HomeShell />;
};

export default App;
