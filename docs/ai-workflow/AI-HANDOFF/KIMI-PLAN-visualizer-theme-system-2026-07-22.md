# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BRIEF-visualizer-theme-system-2026-07-22.md
**Seed:** (none)
**Tokens:** 1272 in / 9133 out · **Cost:** ~$0.1408 · **Wall:** 341.4s

---

# Swan Visualizer — Extensible Theme System Architecture

**Author:** Kimi K3 (front-end/design) · **Type:** build-ready architecture plan · **Constraint ledger:** plain-TS core · ≤300-line files · styled-components + Crystalline Swan tokens with fallbacks · 44px targets · reduced-motion + strobe safety enforced in schema, not just UI

---

## 0. The One Big Idea

Stop thinking "theme = skin." Adopt a three-tier model:

| Tier | Who | What they can do | Code required |
|---|---|---|---|
| **Tier 0 — Compose** | End user, in-UI | Pick built-in **algorithm kernels**, set palette, tune param ranges, bind audio reactivity | None |
| **Tier 1 — Configure** | Dev / power user | Ship a **manifest JSON only** — a whole new *world* with zero TS | None (JSON) |
| **Tier 2 — Author** | Dev | Manifest **+ custom algorithm module** (Canvas2D function and/or a single fragment shader) | One module file |

Forest ≠ Glacier ≠ James Webb because they use **different kernels with different param regimes, post-processing, and motion character** — not because the hue rotated. A "world" is `palette × algorithm set × param ranges × audio mapping × post × motion character`. Palette is one axis of six.

The engine never knows about themes as a special case. It knows two primitives:

- **`AlgorithmDefinition`** — a registered, param-schema'd generative algorithm with one or more renderer backends.
- **`ThemeManifest`** — declarative data that selects, parameterizes, and sequences algorithms.

---

## 1. Theme Manifest Schema

All types live in `src/core/themes/types.ts` (plain TS, no imports from React/DOM).

```ts
// src/core/themes/types.ts
export type AudioBand = 'bass' | 'mid' | 'treble' | 'level' | 'beat' | 'time';

/** Declarative param descriptor — drives validation AND auto-generates UI controls */
export interface ParamDef {
  type: 'number' | 'int' | 'boolean' | 'color' | 'select' | 'vec2';
  min?: number; max?: number; step?: number;
  default: unknown;
  options?: string[];               // for 'select'
  label: string;                    // UI-friendly
  group?: string;                   // UI accordion grouping
  audioModulatable?: boolean;       // may an AudioBinding target it?
}

export type ParamSchema = Record<string, ParamDef>;

/** Declarative audio→param binding; engine resolves each frame, no user code needed */
export interface AudioBinding {
  band: AudioBand;
  target: string;                   // param path, e.g. "particles.speed"
  scale: number;                    // multiplier on band value (0..1)
  smoothing?: number;               // 0..1 attack/decay, default 0.5
  mode?: 'add' | 'multiply';        // default 'multiply'
}

export interface PaletteDef {
  id: string;
  colors: string[];                 // 3–8 hex; index 0 = deepest bg, last = hottest accent
  weight?: number;                  // pool weighting (replaces auto-pool)
}

export interface AlgorithmSlot {
  ref: string;                      // 'kernel:flowField' | 'algo:@custom/jwst-mirrors' | 'legacy:nebula'
  weight: number;                   // director shuffle weight
  params?: Record<string, unknown>;          // overrides on algorithm defaults
  paramRanges?: Record<string, [number, number]>;  // director mutation clamp
  audioMap?: AudioBinding[];                   // slot-level audio bindings
}

export interface ThemeManifest {
  schemaVersion: 1;
  id: string;                       // kebab-case, globally unique
  name: string;
  description?: string;
  author?: string;
  license?: string;                 // for future marketplace
  minEngineVersion?: string;
  tags?: string[];                  // replaces 'mood': ['cosmic','slow','sparse']

  palettes: PaletteDef[];           // ≥1; engine rotates by weight
  background: {
    base: string;                   // hex, under everything
    gradient?: { stops: string[]; angle?: number };
    vignette?: number;              // 0..1
    starfieldDensity?: number;      // 0..1 cheap builtin backdrop
  };

  algorithms: AlgorithmSlot[];      // ≥1

  director: {
    holdMs: [number, number];       // min/max time on one algorithm
    crossfadeMs: number;
    mutationAmount: number;         // 0..1 how far params drift from defaults
    paletteShiftOnBeat?: boolean;
  };

  motion: {
    speed: number;                  // global time multiplier, 0.1..3
    turbulence: number;             // 0..1 jitter/noise character
    easing: 'linear' | 'easeInOut' | 'spring';
  };

  post: {
    bloom?: { strength: number; radius: number; threshold: number };
    feedbackTrail?: number;         // 0..0.97 frame persistence
    grain?: number;                 // 0..1
    chromaticAberration?: number;   // px
    frost?: number;                 // 0..1 (Glacier uses this; WebGL kernel + 2D overlay)
  };

  safety: {
    maxFlashHz: number;             // VALIDATOR REJECTS > 3 (WCAG 2.3.1)
    reducedMotion?: {               // applied automatically when user pref = reduce
      speed?: number;
      disable?: string[];           // post keys to force off, e.g. ['feedbackTrail']
    };
  };
}
```

### Example manifest A — `james-webb.json`

Sparse, slow, gold-on-black, heavy bloom, hexagonal mirror imagery, diffraction spikes. Built **entirely from kernels** (Tier 1) except one custom kernel callout shown for contrast.

```json
{
  "schemaVersion": 1,
  "id": "james-webb",
  "name": "James Webb",
  "author": "SwanStudios",
  "license": "proprietary",
  "tags": ["cosmic", "slow", "sparse", "golden"],
  "palettes": [
    { "id": "first-light", "weight": 3,
      "colors": ["#050508", "#1a1030", "#c98a2b", "#e8b84b", "#f5e6c8"] },
    { "id": "deep-field", "weight": 1,
      "colors": ["#03030a", "#0d1b3d", "#3d6db5", "#c98a2b", "#ffffff"] }
  ],
  "background": { "base": "#050508", "vignette": 0.65, "starfieldDensity": 0.35 },
  "algorithms": [
    { "ref": "kernel:deepField", "weight": 4,
      "params": { "starCount": 2200, "diffractionSpikes": 6, "spikeLength": 0.35,
                  "lensFlare": 0.4, "drift": 0.02 },
      "paramRanges": { "starCount": [800, 4000], "drift": [0.005, 0.08] },
      "audioMap": [
        { "band": "treble", "target": "spikeLength", "scale": 0.5, "smoothing": 0.8 },
        { "band": "beat", "target": "lensFlare", "scale": 1.0, "mode": "add", "smoothing": 0.9 }
      ] },
    { "ref": "algo:@custom/hex-mirrors", "weight": 2,
      "params": { "segments": 18, "fillRatio": 0.6, "edgeGlow": 0.8 },
      "audioMap": [{ "band": "mid", "target": "fillRatio", "scale": 0.4 }] },
    { "ref": "kernel:flowField", "weight": 1,
      "params": { "particleCount": 300, "speed": 0.15, "lineWidth": 0.5 } }
  ],
  "director": { "holdMs": [25000, 60000], "crossfadeMs": 4000, "mutationAmount": 0.25,
                "paletteShiftOnBeat": false },
  "motion": { "speed": 0.55, "turbulence": 0.05, "easing": "easeInOut" },
  "post": {
    "bloom": { "strength": 1.6, "radius": 24, "threshold": 0.55 },
    "feedbackTrail": 0.88, "grain": 0.12, "chromaticAberration": 0
  },
  "safety": { "maxFlashHz": 2,
              "reducedMotion": { "speed": 0.25, "disable": ["feedbackTrail"] } }
}
```

### Example manifest B — `glacier.json`

Dense, layered, cool, near-zero bloom, high frost, **calving events** on bass hits — a different world through different kernels, post, and audio bindings. Manifest-only (Tier 1), zero custom code.

```json
{
  "schemaVersion": 1,
  "id": "glacier",
  "name": "Glacier",
  "author": "SwanStudios",
  "tags": ["cold", "layered", "slow", "dense"],
  "palettes": [
    { "id": "blue-ice", "weight": 3,
      "colors": ["#04121f", "#0b2e4f", "#2e7ba8", "#8fd0e8", "#eef8ff"] },
    { "id": "whiteout", "weight": 1,
      "colors": ["#0a1520", "#33506b", "#9db8cc", "#dcebf5", "#ffffff"] }
  ],
  "background": { "base": "#04121f",
    "gradient": { "stops": ["#04121f", "#0b2e4f"], "angle": 180 }, "vignette": 0.3 },
  "algorithms": [
    { "ref": "kernel:strata", "weight": 4,
      "params": { "layers": 14, "roughness": 0.35, "shear": 0.2, "erosion": 0.1,
                  "calveThreshold": 0.82 },
      "paramRanges": { "layers": [8, 24], "roughness": [0.15, 0.7] },
      "audioMap": [
        { "band": "bass", "target": "shear", "scale": 0.8, "smoothing": 0.6 },
        { "band": "beat", "target": "calveThreshold", "scale": -0.3, "mode": "add",
          "smoothing": 0.2 }
      ] },
    { "ref": "kernel:crystalGrowth", "weight": 2,
      "params": { "branches": 6, "growthRate": 0.3, "symmetry": 6 },
      "audioMap": [{ "band": "treble", "target": "growthRate", "scale": 0.7 }] },
    { "ref": "kernel:fogDrift", "weight": 1, "params": { "density": 0.5, "speed": 0.1 } }
  ],
  "director": { "holdMs": [30000, 90000], "crossfadeMs": 6000, "mutationAmount": 0.2 },
  "motion": { "speed": 0.4, "turbulence": 0.12, "easing": "spring" },
  "post": {
    "bloom": { "strength": 0.25, "radius": 10, "threshold": 0.8 },
    "feedbackTrail": 0.6, "grain": 0.05, "frost": 0.7
  },
  "safety": { "maxFlashHz": 1.5,
              "reducedMotion": { "speed": 0.2, "disable": ["feedbackTrail"] } }
}
```

**The point, made visible:** same engine, same kernels available to both — and the outputs are unrelated visual universes because the *kernel choice, post stack, audio bindings, and motion character* differ. Forest would lean on `kernel:branchLSystem` + warm greens + moderate bloom; Nebula on `kernel:volumetricNoise` + max bloom.

### Kernel inventory (ship these built-in, ~10, each ≤300 lines)

`flowField`, `particleSystem`, `deepField` (starfield + diffraction spikes), `strata` (layered terrain/ridges), `crystalGrowth`, `fogDrift`, `volumetricNoise` (nebula), `branchLSystem` (forest/organic), `kaleido` (psychedelic), `waveformRings`. Every kernel is implemented in **both** backends by core (see §5) — this is what makes Tier-1 manifest-only themes possible on WebGL.

---

## 2. Algorithm ↔ Theme Contract

### AlgorithmDefinition (the contract)

```ts
// src/core/algorithms/types.ts
import type { ParamSchema, AudioBinding } from '../themes/types';

export interface AudioFrame {
  bass: number; mid: number; treble: number; level: number;
  beat: boolean; wave(): Float32Array;
}

export interface RenderContext {
  width: number; height: number; dpr: number;
  palette: string[];              // active theme palette, resolved
  quality: 'low' | 'high';
}

export type Canvas2DBackend<P> = {
  kind: 'canvas2d';
  draw(ctx: CanvasRenderingContext2D, rc: RenderContext,
       audio: AudioFrame, params: P, t: number): void;
};

export type WebGLBackend<P> = {
  kind: 'webgl';
  /** Option A (easy): just a fragment shader. Engine provides quad, compiles,
      and feeds standard uniforms: u_time, u_res, u_bands(bass,mid,treble,level),
      u_beat, u_wave(tex), u_palette[8], u_feedback. */
  fragment?: string;
  /** Option B (full control): managed program lifecycle */
  setup?(gl: WebGL2RenderingContext): void;
  draw?(gl: WebGL2RenderingContext, rc: RenderContext,
        audio: AudioFrame, params: P, t: number): void;
  dispose?(gl: WebGL2RenderingContext): void;
};

export interface AlgorithmDefinition<P = Record<string, unknown>> {
  id: string;                     // 'kernel:flowField' or '@custom/hex-mirrors'
  name: string;
  version: number;
  paramSchema: ParamSchema;       // REQUIRED — drives UI, validation, mutation
  defaultAudioMap?: AudioBinding[];
  backends: {
    canvas2d?: Canvas2DBackend<P>;
    webgl?: WebGLBackend<P>;
  };                              // at least one required
  setup?(): void; dispose?(): void;
}
```

**Relationship to the existing `scene.draw(ctx, audio, params, t)`:** it *is* the same function — it's now one backend among two, plus a mandatory `paramSchema`. The old `mood` string moves to the theme's `tags`. Nothing else changes conceptually.

### Registry & resolution (core, framework-agnostic)

```ts
// src/core/registry.ts  (~120 lines)
class AlgorithmRegistry {
  private algos = new Map<string, AlgorithmDefinition>();
  register(def: AlgorithmDefinition): void {
    validateParamSchema(def.paramSchema);       // throws on malformed
    if (!def.backends.canvas2d && !def.backends.webgl)
      throw new Error(`${def.id}: needs ≥1 backend`);
    this.algos.set(def.id, def);
  }
  get(id: string) { return this.algos.get(id); }
  list(): AlgorithmDefinition[] { return [...this.algos.values()]; }
}

class ThemeRegistry {
  private themes = new Map<string, ThemeManifest>();
  register(manifest: ThemeManifest, customAlgos: AlgorithmDefinition[] = []): void {
    validateTheme(manifest);                    // schema + safety (see below)
    customAlgos.forEach(a => algorithms.register(a));
    for (const slot of manifest.algorithms)
      if (!algorithms.get(slot.ref.replace(/^(kernel:|legacy:|algo:)/, m => m === 'algo:' ? '' : m)))
        resolveRefOrThrow(slot.ref);
    this.themes.set(manifest.id, manifest);
  }
  get(id: string) { ... } list() { ... }
}

export const algorithms = new AlgorithmRegistry();
export const themes = new ThemeRegistry();
```

**`validateTheme` enforces safety at the data layer, not the UI layer:** rejects `maxFlashHz > 3`, rejects missing `palettes`/`algorithms`, clamps `post.feedbackTrail ≤ 0.97`, verifies every `audioMap.target` exists in the target algorithm's `paramSchema` and is `audioModulatable: true`. A theme that fails validation **cannot load** — strobe safety is therefore un-bypassable by user-created themes.

### How the engine picks a backend

```ts
// src/core/engine/resolveBackend.ts
export function resolveBackend(def: AlgorithmDefinition, prefer: 'webgl' | 'canvas2d') {
  if (prefer === 'webgl') {
    if (def.backends.webgl) return { type: 'webgl', backend: def.backends.webgl };
    if (def.backends.canvas2d) return { type: 'canvas2d-hybrid', backend: def.backends.canvas2d };
  }
  // canvas2d fallback renderer:
  if (def.backends.canvas2d) return { type: 'canvas2d', backend: def.backends.canvas2d };
  return { type: 'shader-fallback', backend: def.backends.webgl! }; // §5, level 3
}
```

`canvas2d-hybrid`: the algorithm draws to an offscreen 2D canvas; the WebGL compositor uploads it as a texture (`texImage2D`) and blends it into the scene graph. This lets a 2D-only algorithm coexist with bloom/feedback post-processing and crossfades. One canvas per active algorithm slot (max 2 during crossfade) — bounded memory, no leaks.

### How the Director consumes a theme

Director becomes a **ThemePlayer**: reads `theme.algorithms` (weighted shuffle), `theme.director` (hold/crossfade/mutation), mutates params within `paramRanges`, resolves `AudioBinding`s each frame (`value = base * (1 + band * scale)` with smoothing), and applies `motion.speed` to `t`. All declarative — zero per-theme code.

---

## 3. Authoring Paths

### 3a. Developer add-a-theme path (zero core edits)

```
src/
  core/                     ← framework-agnostic, NEVER edited to add a theme
    algorithms/ themes/ engine/ registry.ts
  kernels/                  ← the 10 built-ins (core-shipped, but same contract)
  themes/                   ← THE ONLY FOLDER A DEV TOUCHES
    james-webb/
      manifest.json
      hexMirrors.algorithm.ts   ← optional, only if a kernel can't express it
    glacier/
      manifest.json             ← manifest-only, no code
    forest/
      manifest.json
      branchTheme.algorithm.ts
    index.ts                ← adapter (bundler-aware), ~40 lines
```

A custom algorithm module:

```ts
// src/themes/james-webb/hexMirrors.algorithm.ts  (~150 lines)
import type { AlgorithmDefinition } from '../../core/algorithms/types';

export const hexMirrors: AlgorithmDefinition = {
  id: '@custom/hex-mirrors',
  name: 'JWST Hex Mirror Array',
  version: 1,
  paramSchema: {
    segments:  { type: 'int', min: 6, max: 36, default: 18, label: 'Mirror count',
                 audioModulatable: true },
    fillRatio: { type: 'number', min: 0, max: 1, default: 0.6, label: 'Fill',
                 audioModulatable: true },
    edgeGlow:  { type: 'number', min: 0, max: 1, default: 0.8, label: 'Edge glow' },
  },
  backends: {
    canvas2d: { kind: 'canvas2d', draw(ctx, rc, audio, p, t) { /* hex grid + pulse */ } },
    webgl:    { kind: 'webgl', fragment: HEX_MIRROR_FRAG },  // one GLSL string
  },
};
```

The adapter auto-discovers everything (bundler-aware code lives here, keeping core pure):

```ts
// src/themes/index.ts
const manifests = import.meta.glob('./*/manifest.json', { eager: true });
const modules   = import.meta.glob('./*/*.algorithm.ts', { eager: true });

export function registerAllThemes() {
  for (const [path, mod] of Object.entries(manifests)) {
    const dir = path.split('/')[1];
    const algoMods = Object.entries(modules)
      .filter(([p]) => p.startsWith(`./${dir}/`))
      .flatMap(([, m]) => Object.values(m as Record<string, AlgorithmDefinition>));
    themes.register((mod as any).default, algoMods);
  }
}
// Non-Vite fallback: ship an explicit `themes/builtin-list.ts` array instead.
```

**Dev workflow:** `mkdir src/themes/aurora-borealis` → write `manifest.json` (optionally one `.algorithm.ts`) → done. It appears in the picker. No edits to engine, registry, UI, or director. Full check: `manifest.json` is validated at boot; a bad manifest logs a named error and is skipped, never crashes the app.

### 3b. User create-a-theme path (Theme Studio, in-UI)

A three-step modal/route, styled-components + tokens:

```tsx
// src/ui/theme-studio/ThemeStudio.tsx (shell, ~180 lines; sub-panels separate files)
const StudioShell = styled.div`
  background: var(--swan-surface-glass, rgba(16,20,32,0.92));
  border: 1px solid var(--swan-border-subtle, rgba(255,255,255,0.08));
  border-radius: var(--swan-radius-lg, 16px);
  backdrop-filter: blur(var(--swan-blur-md, 20px));
`;
const StepButton = styled.button`
  min-height: 44px; min-width: 44px;   /* touch target contract */
  font-family: var(--swan-font-display, 'Inter', system-ui);
`;
```

**Flow:**

1. **Algorithms** — grid of live-thumbnail cards from `algorithms.list()` (each card renders its kernel in a tiny preview canvas). User picks 1–3, sets weights. (44px cards, keyboard-navigable.)
2. **Palette & World** — palette editor (3–8 swatches, add/remove, "generate from base hue" helper), background controls (vignette, gradient, starfield), motion character sliders (speed/turbulence).
3. **Tune & React** — **auto-generated controls**: for each selected algorithm, iterate `paramSchema` → slider/toggle/color/select per `ParamDef`, grouped by `group`. Below each, an optional audio-binding row (`band` select + `scale` slider) shown only when `audioModulatable`. Plus director (hold/crossfade) and post (bloom/trail/grain/frost) panels — same schema-driven control factory, since post params are also a `ParamSchema`.

All controls come from **one** component:

```tsx
// src/ui/theme-studio/ParamControl.tsx
export const ParamControl: React.FC<{ def: ParamDef; value: unknown; onChange(v): void }> =
  ({ def, ... }) => {
    switch (def.type) {
      case 'number': case 'int': return <TokenSlider ... />;   // 44px thumb track
      case 'color':  return <TokenSwatch ... />;
      case 'boolean':return <TokenToggle ... />;
      case 'select': return <TokenSelect ... />;
    }
  };
```

**Live preview** runs the real engine against the draft manifest — no mock. Save:

```ts
// src/core/themes/userThemeStore.ts  (plain TS, no React)
const DB = 'swan-themes', STORE = 'user-themes';
export async function saveUserTheme(m: ThemeManifest): Promise<void> {
  validateTheme(m);                       // same validator as dev path
  m.id = m.id.startsWith('user:') ? m.id : `user:${crypto.randomUUID().slice(0,8)}`;
  await idbPut(DB, STORE, m);
  themes.register(m);                     // hot-register, no reload
}
export async function loadUserThemes(): Promise<ThemeManifest[]> {
  const all = await idbGetAll(DB, STORE);
  all.forEach(m => { try { themes.register(m); } catch (e) { quarantine(m.id, e); } });
  return all;
}
```

**Advanced hook (custom algorithm from UI):** an "Import algorithm module…" affordance in Step 1 accepts a `.js`/`.mjs` file or URL. It is loaded as an ES module, checked structurally (`has id, paramSchema, backends` — duck-type validation, ~40 lines), and registered. **Security note:** this is arbitrary code execution by design (like VS Code extensions); gate it behind an explicit "Advanced / I trust this code" confirmation, keep it out of any future sandboxed marketplace context, and never auto-load modules from shared theme files without the user opting in per-module. The safe default share format (§4) is manifest-only.

---

## 4. Import / Export

**Format:** `.swantheme.json` — the manifest, plus an envelope:

```json
{
  "format": "swan-theme",
  "formatVersion": 1,
  "exportedAt": "2026-07-22T00:00:00Z",
  "theme": { /* ThemeManifest */ },
  "algorithms": [ /* OPTIONAL: embedded custom modules as { id, source } — opt-in only */ ]
}
```

```ts
// src/core/themes/portable.ts
export function exportTheme(id: string): Blob {
  const m = themes.get(id)!;
  const embedded = collectUserImportedModules(m);   // only user-approved modules
  return new Blob([JSON.stringify({ format: 'swan-theme', formatVersion: 1,
    exportedAt: new Date().toISOString(), theme: m, algorithms: embedded }, null, 2)],
    { type: 'application/json' });
}

export async function importTheme(file: File): Promise<{ theme: ThemeManifest; needsCodeConsent: boolean }> {
  const raw = JSON.parse(await file.text());
  if (raw.format !== 'swan-theme') throw new Error('Not a Swan theme');
  const migrated = migrateTheme(raw.theme, raw.formatVersion);  // schemaVersion ladder
  validateTheme(migrated);
  const needsCodeConsent = (raw.algorithms?.length ?? 0) > 0;
  // caller: if needsCodeConsent, show consent dialog BEFORE registering modules
  themes.register(migrated, needsCodeConsent ? [] : undefined);
  return { theme: migrated, needsCodeConsent };
}
```

Rules: `formatVersion` + `schemaVersion` form a migration ladder (`migrateTheme` is a chain of pure upcast functions — add one per future schema change). Manifest-only themes are **fully safe to share** (pure data, validated, strobe-capped). Embedded code is the flagged, consent-gated path. `author`/`license`/`minEngineVersion` fields are already in the schema, so a community gallery/marketplace later is a hosting problem, not a format problem. Download via anchor (`theme.id + '.swantheme.json'`); import via `<input type="file" accept=".json">` styled to 44px.

---

## 5. WebGL ↔ Canvas2D Dual-Renderer Support

Design goal: **a theme author never has to write a shader; a shader author never has to write plumbing.**

Three-level resolution (used by `resolveBackend` in §2):

1. **Native match.** Algorithm has a `webgl` backend and engine is WebGL → use it. Most kernels ship both backends; post stack (bloom/feedback/grain/frost) is WebGL-native.
2. **Canvas2D hybrid.** Algorithm is 2D-only → draw to offscreen canvas, upload as texture each frame, composite with full post + crossfade. Cost: one texture upload per active layer per frame — fine at ≤2 layers.
3. **Shader-fallback (last resort).** Renderer is Canvas2D but algorithm is WebGL-only → if the backend declared `fragment`, run a small **GLSL-to-2D interpreter fallback**: render at 1/8 resolution to a tiny WebGL offscreen context if available (it usually is, even in "Canvas2D mode" — headless GL for one quad is cheap), else skip the algorithm and pick the next-weighted slot. In practice this path is rare because all 10 kernels ship both backends.

**Standard uniforms contract** (so fragment-only authors write ~20 lines of GLSL):

```glsl
uniform float u_time; uniform vec2 u_res;
uniform vec4 u_bands;      // bass, mid, treble, level (smoothed 0..1)
uniform float u_beat;      // 1.0 on beat frame, decays
uniform sampler2D u_wave;  // 256x1 waveform
uniform vec3 u_palette[8]; // theme palette, resolved
uniform sampler2D u_feedback; // previous frame (for trails)
```

**Reduced-motion + safety in both renderers:** `motion.speed` override multiplies `u_time` delta; `safety.reducedMotion.disable` strips post passes at compositor level; `maxFlashHz` is enforced by a frame-gate in ThemePlayer that clamps per-frame luminance delta (both pipelines, same code, operates on the resolved frame before present). **Quality scaling:** if FPS < 45 for 2s, engine drops `dpr` → disables `feedbackTrail` → drops `bloom.radius` → falls back WebGL→Canvas2D only as a final step.

---

## 6. Migration Note (no rewrite)

| Current concept | Becomes | How |
|---|---|---|
| `Scene { id, name, mood, draw(ctx,audio,params,t) }` | `AlgorithmDefinition` with a `canvas2d` backend | Mechanical wrapper (below). `mood` → theme `tags`. ~15 min/scene. |
| `Palettes` (swan/aurora/ember/mono/auto-pool) | `ThemeManifest.palettes[]` | Copy hex arrays into `PaletteDef`s; `auto-pool` → multiple palettes with `weight`. |
| `Director` (shuffle, mutation, cross-blend) | `ThemePlayer` reading `theme.director` + `theme.algorithms[].weight` | Same math, config now comes from manifest instead of hardcoded constants. Keep the class, change where it reads config. |
| — | `ThemeManifest` per existing "scene family" | Wrap the 8 legacy scenes into 4 starter themes matching current moods (dreamy/cosmic/geometric/psychedelic) so day-one behavior is preserved. |
| `AudioEngine`, `Player` | unchanged | Untouched. ThemePlayer consumes the same `AudioFrame`. |

Legacy adapter (keeps old scenes runnable forever):

```ts
// src/core/migrate/legacyScene.ts
export function legacySceneToAlgorithm(scene: LegacyScene): AlgorithmDefinition {
  return {
    id: `legacy:${scene.id}`, name: scene.name, version: 1,
    paramSchema: inferParamSchema(scene),   // sensible numeric defaults, all modulatable
    backends: { canvas2d: { kind: 'canvas2d', draw: scene.draw } },
  };
}
```

**Order of work (worker-bot friendly):**
1. Land `core/themes/types.ts`, `core/algorithms/types.ts`, `registry.ts`, `validateTheme` (~1 day).
2. Wrap 8 scenes via adapter; register 4 mood-themes; app behavior identical (regression checkpoint).
3. Build ThemePlayer from Director (config-driven); ship hybrid compositor.
4. Port 2–3 scenes into true kernels with dual backends; add new kernels to 10.
5. Build Theme Studio UI + IndexedDB store + import/export.
6. Ship `james-webb`, `glacier`, `forest` as content. Delete nothing until step 5 is stable.

---

## Non-negotiables checklist (encoded in the plan)

- ✅ **Strobe safety** in `validateTheme` (data layer) — user themes can't bypass it.
- ✅ **Reduced motion** — `safety.reducedMotion` block in every manifest, applied by ThemePlayer, overridable per theme.
- ✅ **44px targets** — Studio controls contract; token-first styled-components with `var(--swan-*, fallback)` everywhere.
- ✅ **≤300-line files** — schema/registry/store/adapter each isolated; kernels one-per-file; Studio split into shell + `ParamControl` + 3 step panels.
- ✅ **Framework-agnostic core** — everything above except `src/ui/**` and the `import.meta.glob` adapter is plain TS; the React wrapper only calls `registerAllThemes()`, `loadUserThemes()`, and renders `ThemeStudio`.

**Bottom line for Sean:** adding a theme = dropping a JSON file in a folder. Making a *new kind of world* = picking different algorithms + post + audio bindings, either in that JSON or in the UI. Inventing a new algorithm = one module file implementing one contract, with shaders optional. Forest, Glacier, and JWST are structurally different worlds by construction — and the same architecture is what users get in the Theme Studio.
