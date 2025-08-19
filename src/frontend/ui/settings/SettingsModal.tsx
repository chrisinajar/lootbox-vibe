import React from 'react';

import { useSettings } from './SettingsProvider';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { sfxEnabled, setSfxEnabled } = useSettings();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="rounded border panel p-4 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-3">Settings</h3>
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={sfxEnabled}
            onChange={(e) => setSfxEnabled(e.target.checked)}
          />
          <span>SFX enabled</span>
        </label>
        <div className="text-right">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
