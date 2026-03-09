/**
 * SoundManager — Web Audio API synthesized celebration sounds
 * ============================================================
 * Zero-dependency audio system using Web Audio API.
 * Generates cosmic/gaming SFX programmatically.
 * Structured for future howler.js upgrade with real audio files.
 *
 * Crystalline Swan Theme:
 *   - Glass tinks, crystalline chimes, cosmic whooshes
 *   - 8-bit retro variants for Retro Mode toggle
 */

type SoundPreset =
  | 'xp_pop'
  | 'combo_spark'
  | 'combo_ignite'
  | 'combo_blazing'
  | 'combo_supernova'
  | 'combo_eclipse'
  | 'level_up'
  | 'achievement'
  | 'streak'
  | 'retro_xp'
  | 'retro_level_up';

interface SoundManagerState {
  ctx: AudioContext | null;
  muted: boolean;
  volume: number;
  retroMode: boolean;
}

const state: SoundManagerState = {
  ctx: null,
  muted: true, // Muted by default — user opts in
  volume: 0.6,
  retroMode: false,
};

function getCtx(): AudioContext | null {
  if (state.muted) return null;
  if (!state.ctx) {
    try {
      state.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (state.ctx.state === 'suspended') {
    state.ctx.resume().catch(() => {});
  }
  return state.ctx;
}

// ── Oscillator helpers ──────────────────────────────────────

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal?: number,
  detune = 0,
  delay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (detune) osc.detune.setValueAtTime(detune, now);
  const vol = (gainVal ?? state.volume) * state.volume;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration: number, gainVal = 0.15, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  const vol = gainVal * state.volume;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(4000, now);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + duration);
}

// ── Sound Presets ───────────────────────────────────────────

const SOUNDS: Record<SoundPreset, () => void> = {
  // Micro: Glass tink — high sine + shimmer
  xp_pop() {
    playTone(2400, 0.12, 'sine', 0.3);
    playTone(3200, 0.08, 'sine', 0.15, 0, 0.03);
    playNoise(0.06, 0.08, 0.02);
  },

  // Combo escalation
  combo_spark() {
    playTone(1200, 0.15, 'triangle', 0.25);
    playTone(1600, 0.12, 'triangle', 0.2, 0, 0.06);
  },

  combo_ignite() {
    playTone(1400, 0.18, 'triangle', 0.3);
    playTone(1800, 0.15, 'triangle', 0.25, 0, 0.05);
    playTone(2200, 0.12, 'triangle', 0.2, 0, 0.1);
  },

  combo_blazing() {
    playTone(1600, 0.2, 'sawtooth', 0.2);
    playTone(2000, 0.18, 'sawtooth', 0.18, 0, 0.05);
    playTone(2600, 0.15, 'sine', 0.25, 0, 0.1);
    playNoise(0.1, 0.1, 0.12);
  },

  combo_supernova() {
    playTone(800, 0.3, 'sawtooth', 0.15);
    playTone(1200, 0.25, 'triangle', 0.2, 0, 0.06);
    playTone(1800, 0.2, 'sine', 0.25, 0, 0.12);
    playTone(2800, 0.15, 'sine', 0.3, 0, 0.18);
    playNoise(0.15, 0.12, 0.15);
  },

  combo_eclipse() {
    playTone(600, 0.4, 'sawtooth', 0.12);
    playTone(900, 0.35, 'triangle', 0.18, 0, 0.05);
    playTone(1400, 0.3, 'triangle', 0.22, 0, 0.1);
    playTone(2200, 0.25, 'sine', 0.28, 0, 0.16);
    playTone(3400, 0.2, 'sine', 0.3, 0, 0.22);
    playNoise(0.2, 0.15, 0.2);
  },

  // Macro: Level-up fanfare — ascending arpeggio + shockwave bass
  level_up() {
    // Bass impact
    playTone(80, 0.5, 'sine', 0.4);
    // Ascending arpeggio (C5 → E5 → G5 → C6)
    playTone(523, 0.3, 'triangle', 0.25, 0, 0.1);
    playTone(659, 0.3, 'triangle', 0.25, 0, 0.2);
    playTone(784, 0.3, 'triangle', 0.25, 0, 0.3);
    playTone(1047, 0.5, 'sine', 0.35, 0, 0.4);
    // Shimmer
    playNoise(0.3, 0.1, 0.4);
    playTone(1047, 0.6, 'sine', 0.2, 1200, 0.5);
  },

  // Achievement unlock — sparkle cascade
  achievement() {
    playTone(1800, 0.15, 'sine', 0.25);
    playTone(2200, 0.15, 'sine', 0.25, 0, 0.08);
    playTone(2800, 0.2, 'sine', 0.3, 0, 0.16);
    playNoise(0.1, 0.08, 0.18);
  },

  // Streak — fire whoosh
  streak() {
    playNoise(0.3, 0.2);
    playTone(400, 0.25, 'sawtooth', 0.15);
    playTone(800, 0.2, 'triangle', 0.2, 0, 0.1);
    playTone(1200, 0.15, 'sine', 0.25, 0, 0.15);
  },

  // ── Retro 8-bit variants ──

  retro_xp() {
    playTone(880, 0.08, 'square', 0.2);
    playTone(1320, 0.08, 'square', 0.15, 0, 0.08);
  },

  retro_level_up() {
    playTone(262, 0.12, 'square', 0.2);
    playTone(330, 0.12, 'square', 0.2, 0, 0.12);
    playTone(392, 0.12, 'square', 0.2, 0, 0.24);
    playTone(523, 0.12, 'square', 0.2, 0, 0.36);
    playTone(659, 0.12, 'square', 0.2, 0, 0.48);
    playTone(784, 0.25, 'square', 0.25, 0, 0.6);
  },
};

// ── Public API ──────────────────────────────────────────────

export const soundManager = {
  play(preset: SoundPreset) {
    if (state.muted) return;
    // Swap to retro variants when retroMode is on
    if (state.retroMode) {
      if (preset === 'xp_pop') return SOUNDS.retro_xp();
      if (preset === 'level_up') return SOUNDS.retro_level_up();
    }
    SOUNDS[preset]?.();
  },

  setMuted(muted: boolean) {
    state.muted = muted;
    try {
      localStorage.setItem('ss-sound-muted', String(muted));
    } catch {}
  },

  getMuted() {
    return state.muted;
  },

  setVolume(vol: number) {
    state.volume = Math.max(0, Math.min(1, vol));
  },

  setRetroMode(retro: boolean) {
    state.retroMode = retro;
    try {
      localStorage.setItem('ss-retro-mode', String(retro));
    } catch {}
  },

  getRetroMode() {
    return state.retroMode;
  },

  /** Call on first user interaction to unlock AudioContext */
  unlock() {
    getCtx();
  },

  /** Load saved preferences (muted by default until user enables) */
  init() {
    try {
      const muted = localStorage.getItem('ss-sound-muted');
      // Only unmute if user explicitly set it to false
      if (muted === 'false') state.muted = false;
      else state.muted = true;
      const retro = localStorage.getItem('ss-retro-mode');
      if (retro === 'true') state.retroMode = true;
    } catch {}
  },
};

// Auto-init on import
soundManager.init();

export type { SoundPreset };
export default soundManager;
