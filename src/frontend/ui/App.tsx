import React from 'react';

import { InventoryOverview, OpenResultsPanel } from '../main';

import { CollectionView } from './collection/Collection';
import { HomeMain } from './home/Home';
import { InventoryView } from './inventory/Inventory';
import { ProgressionView } from './progression/Progression';
import { SettingsModal } from './settings/SettingsModal';
import { ShopView } from './shop/Shop';
import { useTheme } from './theme/ThemeProvider';
import { UserSwitcherBadge } from './UserSwitcherBadge';

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
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  return (
    <div className="min-h-dvh p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lootbox simulator</h1>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            UI Milestone 2 — foundation in place.
          </p>
          <nav className="mt-2 flex gap-3 text-sm">
            <a href="/#/inventory" className="underline hover:opacity-80">
              Inventory
            </a>
            <a href="/#/collection" className="underline hover:opacity-80">
              Collection
            </a>
            <a href="/#/shop" className="underline hover:opacity-80">
              Shop
            </a>
            <a href="/#/progression" className="underline hover:opacity-80">
              Progression
            </a>
          </nav>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettingsOpen(true)} className="btn-accent">
            Settings
          </button>
          <button onClick={toggle} className="btn-primary">
            Theme: {theme}
          </button>
        </div>
      </header>
      <main className="space-y-4">
        <HomeMain />
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
  const Nav: React.FC = () => (
    <nav className="mt-2 flex gap-3 text-sm">
      <a href="/#/" className="underline hover:opacity-80">
        Home
      </a>
      <a href="/#/inventory" className="underline hover:opacity-80">
        Inventory
      </a>
      <a href="/#/collection" className="underline hover:opacity-80">
        Collection
      </a>
      <a href="/#/shop" className="underline hover:opacity-80">
        Shop
      </a>
      <a href="/#/progression" className="underline hover:opacity-80">
        Progression
      </a>
    </nav>
  );
  if (path === '/progression')
    return (
      <div className="min-h-dvh p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Progression</h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Milestones and RNG unlocks.
            </p>
            <Nav />
          </div>
          <a href="/#/" className="btn-primary">
            Back to Home
          </a>
        </header>
        <ProgressionView />
      </div>
    );
  if (path === '/shop')
    return (
      <div className="min-h-dvh p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Shop & Upgrades</h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Spend scrap on upgrades or exchange for keys.
            </p>
            <Nav />
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
            <Nav />
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
            <Nav />
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
