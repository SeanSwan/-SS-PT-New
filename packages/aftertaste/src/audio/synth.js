/**
 * synth.js — every sound in the game, made of maths (S5.5 / G3).
 *
 * THE GAME WAS SILENT. Sound is half of gunfeel: a shot with no report reads as a UI click, and a
 * horde game with no round cue has no heartbeat. There are no audio FILES here on purpose — three
 * reasons, all load-bearing:
 *   1. IP separation. Round and weapon audio are the most recognisable parts of the genre; sampled
 *      sound is exactly where a lookalike claim would land. Synthesised waveforms are original by
 *      construction.
 *   2. Zero bytes. No download, no decode, no asset pipeline, no licence provenance to validate.
 *   3. Tunable like everything else — a sound is numbers in a row, same as a gun or a monster.
 *
 * AUTOPLAY: browsers refuse to start audio before a user gesture, and a refused AudioContext stays
 * refused. So nothing is created until the first click; before that every play() is a silent no-op.
 */

let ctx = null;
let master = null;
let muted = typeof window !== 'undefined' && /[?&]mute=1/.test(window.location?.search ?? '');

/** Create the audio graph. Safe to call repeatedly; only the first call does anything. */
export function unlockAudio() {
  if (ctx || muted || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.22;      // headroom: a horde game plays a LOT of these at once
  master.connect(ctx.destination);
  return ctx;
}

export const audioReady = () => ctx != null;
export const setMuted = (v) => { muted = v; if (master) master.gain.value = v ? 0 : 0.22; };

/** One shaped tone. The envelope is the sound — a raw oscillator reads as a test tone. */
function tone({ type = 'sine', from, to = from, seconds, gain = 1, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);          // fast attack = a hit, not a swell
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + seconds + 0.02);
}

/** A burst of noise, shaped. This is what makes a gunshot read as an explosion and not a beep. */
function noise({ seconds, gain = 1, hz = 1200, q = 1, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const frames = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames); // decays
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filter = ctx.createBiquadFilter(); filter.type = 'bandpass';
  filter.frequency.value = hz; filter.Q.value = q;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start(t0);
}

/**
 * THE SOUND TABLE — one row per event, exactly like weapons and monsters.
 * Adding a sound is adding a row; nothing here reaches into the game's logic.
 */
export const SFX = {
  shot: () => { noise({ seconds: 0.09, gain: 0.7, hz: 1800, q: 0.7 }); tone({ type: 'square', from: 220, to: 60, seconds: 0.07, gain: 0.25 }); },
  dryClick: () => tone({ type: 'square', from: 900, to: 500, seconds: 0.03, gain: 0.12 }),
  reload: () => { tone({ type: 'square', from: 320, to: 180, seconds: 0.05, gain: 0.15 }); tone({ type: 'square', from: 260, to: 420, seconds: 0.05, gain: 0.15, delay: 0.18 }); },
  // The sever POP is the sound of the economy: it is what a paying shot sounds like.
  sever: () => { noise({ seconds: 0.13, gain: 0.5, hz: 420, q: 1.6 }); tone({ type: 'triangle', from: 520, to: 120, seconds: 0.12, gain: 0.3 }); },
  kill: () => tone({ type: 'sine', from: 160, to: 55, seconds: 0.22, gain: 0.35 }),
  hurt: () => { noise({ seconds: 0.2, gain: 0.45, hz: 260, q: 0.8 }); tone({ type: 'sawtooth', from: 140, to: 70, seconds: 0.18, gain: 0.2 }); },
  // A rising two-note chime: the wave you survived, and the one coming. Original, not the genre's.
  roundClear: () => { tone({ type: 'triangle', from: 392, to: 392, seconds: 0.18, gain: 0.3 }); tone({ type: 'triangle', from: 587, to: 587, seconds: 0.3, gain: 0.28, delay: 0.16 }); },
  swap: () => tone({ type: 'square', from: 420, to: 300, seconds: 0.06, gain: 0.14 }),
  fever: () => tone({ type: 'sine', from: 90, to: 70, seconds: 0.6, gain: 0.14 }),
};

/** Play a named sound. Unknown names and locked audio are silent no-ops — never a crash. */
export const play = (name) => { if (ctx && !muted) SFX[name]?.(); };
