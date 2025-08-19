import React from 'react';

import { useSettings } from '../settings/SettingsProvider';

let ctx: AudioContext | undefined;
function ensureCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      /* noop: audio context optional */
    }
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine') {
  const ac = ensureCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

export function playOpen() {
  tone(440, 120, 'triangle');
}
export function playRare() {
  tone(880, 250, 'sawtooth');
}
export function playSalvage() {
  tone(220, 150, 'square');
}

export function playCosmetic() {
  const ac = ensureCtx();
  if (!ac) return;
  // A tiny sparkle: two quick high notes with gentle attack/decay
  const start = ac.currentTime;
  const mk = (f: number, t: number) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t);
    osc.connect(gain).connect(ac.destination);
    return { osc, gain };
  };
  const a = mk(1200, 0.12);
  const b = mk(1600, 0.14);
  a.osc.start(start);
  b.osc.start(start + 0.06);
  a.osc.stop(start + 0.16);
  b.osc.stop(start + 0.22);
}

export function useSfx() {
  const { sfxEnabled } = useSettings();
  const tryPlay = React.useCallback(
    (fn: () => void) => {
      if (sfxEnabled) fn();
    },
    [sfxEnabled],
  );
  return {
    open: () => tryPlay(playOpen),
    rare: () => tryPlay(playRare),
    salvage: () => tryPlay(playSalvage),
    cosmetic: () => tryPlay(playCosmetic),
  };
}
