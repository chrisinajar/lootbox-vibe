import React from 'react';

export type Settings = {
  sfxEnabled: boolean;
  setSfxEnabled: (v: boolean) => void;
};

const Ctx = React.createContext<Settings | undefined>(undefined);

const KEY = 'settings.sfxEnabled';

function readInitial(): boolean {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {}
  return true;
}

export const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [sfxEnabled, setSfxEnabledState] = React.useState<boolean>(readInitial);
  const setSfxEnabled = (v: boolean) => {
    setSfxEnabledState(v);
    try {
      window.localStorage.setItem(KEY, v ? '1' : '0');
    } catch {}
  };
  const value = React.useMemo(() => ({ sfxEnabled, setSfxEnabled }), [sfxEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSettings(): Settings {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useSettings must be used within SettingsProvider');
  return v;
}
