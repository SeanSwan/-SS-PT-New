# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BRIEF-visualizer-silent-mode-brain-2026-07-22.md
**Seed:** (none)
**Tokens:** 1251 in / 4254 out · **Cost:** ~$0.0676 · **Wall:** 168.8s

---

# KIMI K3 — Silent-Mode Brain: "The Virtual Conductor"

**Status:** Architecture + creative design, ready to slice. **Core thesis:** silence is not an absence of music — it's the visualizer composing for itself. We don't build a "screensaver fallback." We build a **second musician** that plays the same instrument (the feature struct) as the MusicBrain, so the Dramaturge, journeys, and morphs *cannot tell the difference*.

---

## Section 1 — The Virtual Conductor Signal Model

### 1.1 Design principle: don't synthesize audio, synthesize *features*

The naive approach is "render procedural audio, FFT it, feed the pipeline." That's heavy DSP and wasted work — we'd synthesize 1024 samples just to reduce them back to 7 numbers. Instead, the Conductor **directly synthesizes the feature struct** the MusicBrain would have produced, using a small bank of cheap oscillators and envelope followers. Cost: ~40 float ops/frame. Zero FFT, zero buffers.

```
MusicBrain (live):  PCM → FFT → bands/onset/tempo/energy → AudioFeatures
Conductor (silent): oscillators + envelopes + phrase clock → AudioFeatures (identical shape)
```

### 1.2 The canonical feature struct (the seam contract)

```ts
// src/core/audio/features.ts  (~60 lines)
export interface AudioFeatures {
  bands: { bass: number; lowMid: number; mid: number; highMid: number; treble: number }; // 0..1
  beat: number;        // 1.0 on beat frame, decays to 0 (envelope, matches MusicBrain pulse)
  beatPhase: number;   // 0..1 within current beat
  bpm: number;         // live: detected; virtual: conductor-chosen
  energy: number;      // 0..1 smoothed global energy
  flux: number;        // spectral flux — rate of change; drives shader "shimmer" uniforms
  isOnset: boolean;    // true on onset frames only
  section: SectionTag; // 'intro'|'verse'|'build'|'drop'|'breakdown'|'outro'
  phraseBar: number;   // bar index within phrase (0..phraseLen-1)
  phraseClock: number; // 0..1 position within the 16/32-bar phrase — THE Dramaturge input
  confidence: number;  // live: detection confidence; virtual: always 1.0
  source: 'live' | 'virtual' | 'hybrid';
}
```

Every existing uniform (`u_bands`, `u_beat`, `u_beatPhase`, `u_bpm`, `u_energy`, `u_phraseClock`) is derived from this one struct. **The Director reads the struct. Nothing downstream changes.**

### 1.3 The signal engine — five layered generators

```ts
// src/core/conductor/SignalEngine.ts  (~180 lines)
// Layered model, evaluated once per frame. All oscillators are phase-accumulator
// sine/triangle/shape-mod waves — no Math.random per frame (seeded LCG only at events).

class SignalEngine {
  // L1 — TEMPO CLOCK: conductor-owned BPM with humanized drift
  //   bpm(t) = composition.bpm * (1 + 0.008*sin(2πt/47s))   // sub-1% rubato, breathes
  //   beatPhase advances by dt*bpm/60; wrap → beat event
  
  // L2 — PHRASE CLOCK: bar = 4 beats; phrase = 16 bars; form = 4-8 phrases
  //   phraseClock drives the Dramaturge exactly as live sections do.
  //   Section map is *declared by the composition*, not random:
  //   e.g. [intro, verse, build, drop, breakdown, verse, build, drop, outro]

  // L3 — ENERGY ARC: piecewise-smooth macro envelope per section,
  //   catmull-rom interpolated between section energy targets:
  //   intro 0.15 → verse 0.35 → build ramp→0.8 → drop 1.0 hold → breakdown 0.2 …
  //   Plus micro-swells: energy += 0.05*sin(phraseClock*π)  // within-phrase contour

  // L4 — SPECTRAL BANDS: five band oscillators with musical correlation rules:
  //   bass    = kick pattern (beats 1 & 3 in verse, four-on-floor in drop) * sectionEnergy
  //   lowMid  = bass*0.6 + slowLFO(0.11Hz) * pad amount
  //   mid     = melody LFO — phase-locked to bar, arpeggio step pattern (see 1.5)
  //   highMid = mid's octave-up shadow, delayed half a beat (call-and-response feel)
  //   treble  = noise-approx: 3 incommensurate HF sines (7.13, 11.7, 17.3 Hz) mixed —
  //             sounds like hats/shimmer, costs 3 sin() calls
  //   Correlation rule: bands never move independently at full amplitude — each
  //   composition defines a 5x5-ish coupling matrix so the spectrum "breathes as one instrument."

  // L5 — EVENTS: onsets = beat events where pattern says "accent";
  //   flux = |bands(t) - bands(t-1)| summed (exactly like MusicBrain computes it);
  //   fills: on last bar of each phrase, treble+mid run a 4-step crescendo pattern.
}
```

**Key musicality trick:** bands are *correlated by construction* (coupling matrix + shared section energy), so `flux` and `energy` move believably, and the Dramaturge's "is this a drop?" logic — which reads energy + bass dominance — just works.

### 1.4 Beats, humanization, and the pulse

`u_beat` must decay like the live detector's pulse or every beat-synced scene will feel "off" in silent mode. We match the MusicBrain's exact envelope:

```ts
beat = exp(-beatPhase * 6.0);            // identical decay constant to live path
// humanize: ±8ms equivalent jitter on onset timing, seeded, so it grooves
```

### 1.5 Believable melodic motion — the arpeggio LFO

Mid band uses a **quantized stepped oscillator**: a slow phase ramp mapped through a pentatonic-ish interval table, so "melodies" move in musical steps at 8th-note rate, with phrase-level contour (rising in builds, descending in breakdowns):

```ts
const SCALE = [0, 3, 5, 7, 10, 12, 15];           // minor pentatonic + octaves
step = floor(barPhase * 8);                        // 8 steps per bar
degree = SCALE[(step + phraseContour) % SCALE.length];
mid = 0.3 + 0.4 * sin(2π * t * rateFor(degree)) * sectionGain;
```

Cheap, and it gives the "spectral content is playing something" feel that raw LFO soup never achieves.

### 1.6 Silent compositions — five moods with real form

Each composition is a **declarative data object** (~30 lines each), not code:

```ts
// src/core/conductor/compositions/types.ts
export interface Composition {
  id: string; name: string;
  bpm: number; bpmFeel: 'rubato' | 'locked' | 'swing';
  form: SectionTag[];                       // the macro-structure (see 1.3 L2)
  sectionEnergy: Partial<Record<SectionTag, number>>;
  bandCoupling: number[];                   // spectral personality
  palette: PaletteJourney;                  // start/end hue anchors, drift rate
  signatureMoment: { scene: string; everyPhrases: number }; // e.g. CYGNUS
  breathRate: number;                       // Hz of the organic base rhythm
}
```

| Composition | BPM | Form | Personality |
|---|---|---|---|
| **DRIFT** | 56 rubato | intro→verse→breakdown→verse→outro (no drops) | Ambient wash; bass/energy low; palette drifts dusk→deep-blue; CYGNUS every 6 phrases |
| **SLOW ASCENT** | 72 | intro→verse→build→build→drop→breakdown→outro | 4–6 minute single arc; the "long idle session" hero; ends calm |
| **PLAYFUL** | 108 swing | verse/drop alternating, short phrases | Bouncy mid arps, syncopated bass, bright palette hops per section |
| **MONOLITH** | 92 locked | intro→build→drop→drop→breakdown→build→drop→outro | Epic; four-on-floor drops, huge band coupling, signature moment every 4 phrases |
| **NOCTURNE** | 60 rubato | verse→breakdown→verse→outro | Late-night default; breath rate ~0.15 Hz (resting breath); minimal treble |

Compositions can also be **chained into a silent setlist** for long idle sessions (see §3).

---

## Section 2 — The AudioSource Seam

### 2.1 One interface, two musicians

```ts
// src/core/audio/AudioSource.ts  (~40 lines)
export interface AudioSource {
  readonly kind: 'live' | 'virtual';
  update(dt: number, now: number): AudioFeatures;  // called once per frame
  setComposition?(id: string): void;               // virtual only, optional on iface
  dispose(): void;
}
```

- `LiveAudioSource` wraps the existing MusicBrain output — **a ~80-line adapter, zero changes to MusicBrain internals.**
- `VirtualConductorSource` wraps the SignalEngine — **~90 lines: owns composition, maps engine state → AudioFeatures, sets `confidence: 1`, `source: 'virtual'`.**

The Director's constructor changes by exactly one parameter: it receives an `AudioSource` instead of a MusicBrain. That is the entire invasive footprint.

### 2.2 The Mixer — seamless auto cross-fade

```ts
// src/core/audio/AudioMixer.ts  (~150 lines)
// Owns both sources. Per frame:
//   1. update both sources (virtual is ~free; keep it always running, warm)
//   2. silence detection on live: energy < 0.02 && flux < 0.01 sustained 1.2s
//      (hysteresis: resume needs energy > 0.08 sustained 0.4s — no flapping)
//   3. blend state machine: LIVE → FADING_OUT(2.5s) → VIRTUAL
//                           VIRTUAL → FADING_IN(1.2s) → LIVE
//   4. cross-fade: per-field lerp of the two feature structs.
```

**The critical detail — clock handoff.** Naively lerping `beatPhase`/`bpm` between two unsynchronized clocks causes visible beat-tearing. Instead:

- On LIVE→VIRTUAL: the Conductor **adopts the live BPM and current beatPhase** for its first phrase (it was already running warm, shadowing the live clock), then drifts to its composition's native BPM over one phrase via `bpm(t) = lerp(liveBpm, comp.bpm, phraseClock)`. The visuals decelerate into the new tempo like a DJ riding the pitch fader.
- On VIRTUAL→LIVE: cross-fade is fast (1.2s) and beat-dominant fields (beat, beatPhase, isOnset) switch at the next live onset boundary, not mid-beat. Continuous fields (bands, energy) lerp freely — they're phase-agnostic.

### 2.3 Hybrid gap-fill

Because silence detection has hysteresis, short gaps (<1.2s) never trigger. For intentional pauses *within* a track (a held rest before a drop), that's correct — the visuals should honor the rest. For gaps **between tracks** (playlist dead air, 3–8s), the mixer enters hybrid:

```ts
if (liveSilent && playlistExpectsMore) {
  mode = 'hybrid';
  // conductor plays at the *last known live bpm/energy*, decelerating gently,
  // so the show coasts through the gap instead of lurching into a new composition
}
```

When the next track starts, the 1.2s fade-in fires. From the audience's seat: the visuals breathed through the gap. 

---

## Section 3 — Smart Alive-Feeling Behaviors

```ts
// src/core/conductor/SessionDirector.ts  (~200 lines)
```

### 3.1 Session-length awareness
The SessionDirector tracks `silentElapsed`. Behavior evolves on a logarithmic scale (not linear — minute 2 matters more than minute 20):

- **0–2 min:** composition plays straight. 
- **2–8 min:** begin a slow palette journey (hue anchor drifts ≤ 0.5°/s — perceptible over minutes, invisible frame-to-frame).
- **8–20 min:** allow composition *mutation* — swap the form's second half (e.g., insert an unplanned breakdown), shift BPM ±4%, deepen band coupling. The show is improvising now.
- **20+ min:** transition to the next composition in the setlist via a long breakdown→intro crossfade; palette journey continues across the boundary so it feels like one continuous DJ set.

### 3.2 Time-of-day awareness
An optional `ClockHint` (host supplies hour, or we read `Date`) biases selection: NOCTURNE/DRIFT after 22:00, PLAYFUL midday, MONOLITH never auto-selected late. It's a bias, not a rule — user picks always win.

### 3.3 Scheduled signature moments
Each composition declares one (§1.6). The SessionDirector counts phrases and, at the scheduled phrase boundary, injects a **high-priority scene request** into the Dramaturge's existing scoring input (`forceScene: 'cygnus'`, one-shot). Because it enters through the Dramaturge, it still gets a proper musical morph transition — CYGNUS *forms out of* whatever was playing on the drop of a phrase. Then a cooldown (≥ 3 phrases) so signatures stay special.

### 3.4 The organic breath — the anti-machine layer
Everything in silent mode rides a two-rate physiological envelope:

```ts
breath  = 0.5 + 0.5 * sin(2π * t * comp.breathRate);       // ~6-9 breaths/min
heart   = beatPulse * 0.04;                                 // sub-perceptual throb
energy_out = clamp01(energy * (0.90 + 0.10 * breath) + heart);
```

The breath modulates global energy ±10% and palette luminance ±4%. This is the difference between "procedural animation" and "something alive on screen." It costs two sin() calls and it's the highest-ROI line in the whole design.

### 3.5 Reduced motion & the strobe guard (non-negotiable, silent mode included)
- The existing **un-overridable strobe guard** sits *downstream* of the Mixer, on the final feature struct — so it clamps virtual output identically. We change nothing about it; we just guarantee the Conductor can never emit flux spikes it would reject (composition data is validated at load: max energy slew, max treble amplitude).
- **Reduced-motion:** Conductor honors the same flag — forces `bpmFeel:'rubato'`, caps `bpm ≤ 72`, disables drop sections from every form (form is filtered at selection), halves flux, and slows palette drift 4×. Silent mode under reduced-motion becomes pure DRIFT/NOCTURNE behavior.

---

## Section 4 — Build Slice & Controls

### 4.1 Non-destructive slice plan (5 PRs, each independently shippable)

| PR | Files (new) | Touches existing | Size |
|---|---|---|---|
| **1. Seam** | `audio/AudioSource.ts`, `audio/LiveAudioSource.ts` | Director ctor: 1 param change; MusicBrain: 0 lines | ~120 lines |
| **2. Engine** | `conductor/SignalEngine.ts`, `conductor/VirtualConductorSource.ts` | none | ~270 lines |
| **3. Mixer** | `audio/AudioMixer.ts` + silence-detector tests | Director: reads Mixer instead of source directly | ~150 lines |
| **4. Compositions** | `conductor/compositions/{types,drift,slowAscent,playful,monolith,nocturne}.ts` | none — pure data | ~200 lines |
| **5. Session layer** | `conductor/SessionDirector.ts`, host settings UI | Settings schema: 4 new keys | ~250 lines |

All files ≤ 300 lines; the seam means PRs 2–5 are **zero-touch on existing code** — the live path is bit-identical until the Mixer is wired in PR 3, and even then the default is `silentMode: 'auto'` with live always preferred.

### 4.2 Controls (host settings surface)

```ts
silentMode: 'off' | 'auto' | 'always';     // auto = gap-fill + silence takeover
silentComposition: 'auto' | 'drift' | 'slow-ascent' | 'playful' | 'monolith' | 'nocturne';
silentFeel: { tempoBias: -1..1; energyBias: -1..1 };  // ±15% nudge, clamped
silentSetlist: boolean;                    // chain compositions on long idle
```

`tempoBias`/`energyBias` multiply into the Conductor's outputs **before** the strobe guard, so safety clamping always has the final word. `off` hard-disables the Conductor — Mixer passes live through untouched (and the virtual source isn't even instantiated; zero cost).

### 4.3 Cost audit
Per frame, silent mode: ~30 sin/exp calls, one 5-band update, one struct alloc-free mutation, one lerp during fades. **No FFT, no buffers, no WebAudio nodes.** It's cheaper than one frame of the live FFT path.

---

## Closing note

The thing I want Sean to feel: when the music stops and nobody touches anything, the room doesn't go dead — it *inhales*, settles into a groove it composed for itself, and three minutes later a CYGNUS forms on a phrase drop that never happened in any song. That's not a fallback mode. That's the visualizer playing its own set.

**Recommended first slice:** PR 1 + PR 2 with a single hardcoded DRIFT composition, wired manually (`silentMode:'always'` behind a dev flag). That's ~400 lines and proves the entire thesis — Director indistinguishability — before any mixer complexity lands.
