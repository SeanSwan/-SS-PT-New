# Kimi Brief — Swan Visualizer: Silent-Mode Brain ("Beautiful with no music")

**Date:** 2026-07-22 · **Remit:** feature-model + generative-music-theory architecture · **Privacy:** IDs/roles only, zero PII · **Ambition:** deep + smart, matching the music-driven AUTO director.

## Context
The Swan Visualizer already has (planned/being built) a smart AUTO director for MUSIC — a "MusicBrain" (onset/tempo/energy/section detection) + "Dramaturge" (scored scene selection, structural coverage guarantee) + musical morph transitions + curated journeys. See `docs/ai-workflow/AI-HANDOFF/KIMI-PLAN-visualizer-webgl-artistry-2026-07-22.md`.

## Sean's ask (verbatim intent)
"A silent mode where there is no music, and we want just beautiful visualizations. Implement a deep comprehensive feature model that connects to that brain and is smart as well. I love that whole brain thing and making it smart like a DJ — build onto that art and ideas and creativity."

So: when there is NO audio (no MP3, no mic, or between tracks), the visualizer must still deliver a beautiful, intelligent, evolving performance — NOT frozen, NOT a dumb oscillator loop. It should feel like the smart brain is *composing its own show*.

## What we need from you (Kimi) — deliver all of it, concrete + creative

### 1. The Virtual Conductor (silent-mode brain)
Design an internal generative "music" source that feeds the SAME director interface the real MusicBrain feeds (`u_bands`, `u_beat`, `u_beatPhase`, `u_bpm`, energy, section boundaries, phrase clock) — so the Dramaturge, transitions, and journeys work identically whether audio is real or synthesized. Specify:
- The internal signal model: LFO/oscillator bank, procedural energy envelope (calm→build→peak→release arcs), a self-generated tempo + phrase clock, evolving "spectral" content so bass/mid/treble bands move believably and musically.
- How it creates *musical structure* over minutes (verses/choruses/drops equivalent) so scenes still build and pay off — not random noise.
- Multiple silent "compositions"/moods it can perform (e.g. ambient drift, slow build, playful, epic) so silent mode isn't monotonous.

### 2. How it connects to the existing brain (the "deep comprehensive feature model")
- The exact seam: a `AudioSource` abstraction with two implementations — `LiveAudioSource` (real FFT) and `VirtualConductorSource` (synthesized) — both producing the identical per-frame feature struct. Director never knows which is active.
- Auto-switching logic: when real audio goes silent/ends, cross-fade from live features to virtual (and back when music resumes) so the transition is seamless and the visuals never stall.
- A "hybrid" possibility: even with music, silence gaps get filled by the conductor.

### 3. Smart behaviors that make it feel alive
- Time-of-day / session-length awareness (calmer late, building over a long idle session), slow palette journeys, occasional "signature moment" scheduling (e.g. schedule a CYGNUS formation every few minutes in silent mode), breathing/heartbeat base rhythm so it always feels organic.

### 4. Build & control
- A non-destructive slice plan to add this on top of the current engine (where the AudioSource seam goes, minimal changes).
- Controls: silent-mode on/off/auto, pick a silent "composition"/mood, tempo/energy feel, reduced-motion + strobe safety still enforced (silent mode must also respect the un-overridable strobe guard).

**Constraints:** framework-agnostic plain-TS core; ≤300-line files; reduced-motion + strobe safety non-negotiable; the virtual source must be cheap (no heavy DSP). Be creative — Sean wants this to feel as smart and beautiful as the music-driven mode.
