import { useSettings } from '../settings/SettingsProvider';
import React from 'react';

let ctx: AudioContext | undefined;
function ensureCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {}
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
  };
}
