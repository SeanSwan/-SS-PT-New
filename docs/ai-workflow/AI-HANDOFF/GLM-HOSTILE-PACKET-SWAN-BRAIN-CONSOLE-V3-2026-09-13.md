# HOSTILE REVIEW PACKET — Swan Brain Console v3 + 20-variant Three.js fleet

**Reviewer remit: HOSTILE.** You are the adversary, not the endorser. Your job is to find
what is WRONG, unfounded, gamed, or unverified in the work below. Do not congratulate.
Do not summarize the work back. Do not produce a plan. Produce findings.

---

## 0. How to answer (read this first — it is the calibration contract)

The house has run you many times and recorded your failure modes. Answer in a way that
avoids them:

1. **Absence-first.** Your strongest, most reliable contribution is *"this claim is not
   supported by the evidence shown."* Lead with those.
2. **Separate the three registers explicitly.** For every finding, label it:
   - `DEFECT` — the code is wrong and you can say why from the source given.
   - `UNSUPPORTED CLAIM` — the assertion may be true but the evidence shown cannot carry it.
   - `MISSING WORK` — something a reader would expect that simply is not here.
   If you are unsure of a fact that is checkable only against the repo, write `[UNSURE]`
   rather than asserting it. You do NOT have repo access. Facts you invent are worse than
   silence, and this has happened before: never assert what a model file or type says
   unless it is in this packet.
3. **Give the finding, not the fix.** "Land on a compromise recommendation" is another
   recorded habit of yours and is not wanted here. State the defect; the builder decides.
4. **The single best finding matters more than a long list.** Finding density is good,
   padding is not. Rank by blast radius.
5. **Finish.** A previous run spent its whole output budget on reasoning and returned an
   **empty body**. If you are running long, emit fewer findings, fully written, rather
   than thinking to the end. A truncated answer with three finished findings beats an
   empty answer.
6. Verdict at the end, exactly one of: `APPROVE` / `REVISE` / `REJECT`.

---

## 1. What was built

An operator console plus a fleet of 20 structurally-distinct Three.js front-page variants
for a React 18 + TypeScript + styled-components app.

- **Console** — zero-dependency `node:http` server, binds `127.0.0.1`, GET-only, fixed
  asset allowlist, no build step. Reports the Design Brain learning engine as BLOCKED.
- **Fleet** — 20 variants, each a "front page" with its own nav model, hero mechanic and
  content grid, rendered through ONE shared Three.js runtime.
- **Copy** — a gate that refuses phrases associated with generated filler.

### Files (all new unless marked)

```
frontend/src/pages/HomePage/three-worlds/
  skeletons.ts          20 divergence contracts (nav_model|hero_mechanics|grid)
  registry.ts           titles, per-variant "tradeoff", parked status
  runtime.ts            shared renderer/loop/DPR/lifecycle + useThreeWorld hook
  tokens.ts             CSS-var -> THREE.Color resolution with fallbacks
  layout.ts             20 nav models + 20 grids as CSS
  worldStyles.ts        surface/type/control styling
  WorldPage.tsx         shared composition every variant renders through
  copy/pack.ts          all copy; figures from marketingStats
  copy/antiSlop.ts      78 banned phrases in 5 classes
  scenes/familiesA.ts   points, rings, orbit, lines
  scenes/familiesB.ts   waveform, instanced, terrain, refract
  scenes/paramsCore.ts  SceneParams, family baselines, builderFor()
  scenes/looks.ts       20 mechanics -> (family + numeric overrides)
  v01..v20/{vNN.tsx,skeleton.ts}   20 generated variant components
scripts/swan-brain-console/
  server.mjs            the console server
  engineState.mjs       reads + quotes the engine gate state
  fleetData.mjs doctrine.mjs copyPack.mjs
  app/{index.html,app.css,app.js}
  gallery-verify.mjs console-verify.mjs engine-contract.test.mjs
  generate-worlds.mjs wire-playground.mjs
MODIFIED: frontend/src/pages/DesignPlayground/playgroundRegistry.ts (spreads the fleet in)
```

---

## 2. The claims that must survive your attack

The builder asserts all of the following. **Attack every one.**

| # | Claim |
|---|---|
| C1 | The 20 variants are **structurally** distinct, not restyled copies. |
| C2 | All 20 genuinely render live Three.js with real draw calls. |
| C3 | Moving three.js material families + evaluating each variant in isolation were legitimate responses to a test-rig failure, not the removal of evidence. |
| C4 | The copy does not read as AI-generated, and the copy gate enforces that. |
| C5 | The console shows the learning engine honestly and cannot write to it. |
| C6 | Nothing canonical changed: `/` still mounts `HomePage.V4`; no route imports the parked registry. |
| C7 | The test suite is meaningful and not gamed to pass. |
| C8 | Rule 4 (≤300 lines/file) is satisfied for all new files. |

### Evidence the builder claims (verify the LOGIC, not the numbers)

- `npx tsc --noEmit` → 0 errors
- `npx vitest run …/fleet.contract.test.ts` → 13/13 pass
- `node --test scripts/swan-brain-console/engine-contract.test.mjs` → 6/6 pass
- `node scripts/swan-brain-console/gallery-verify.mjs` → 24/24 pass; each variant reports
  **211–271 frames in ~4s (~64fps)**, non-zero draw calls, and the 20 card screenshots
  produced 20 unique digests
- `node scripts/swan-brain-console/console-verify.mjs` → 17/17 pass, including
  keyboard traversal of 8 tabs and no horizontal overflow at 320/375/414/768/1280/2560

### Known and self-disclosed by the builder (do not spend findings re-reporting these)

- Rendering all 20 variants on ONE page under software rendering throws
  `Cannot read properties of null (reading 'trim')` at `three.module.js:19196`
  (`parseUniform(activeInfo)` dereferences a null `activeInfo.name` returned by
  SwiftShader's `getActiveUniform`). The builder attributes this to the test rig and
  switched to per-variant isolation. **You may attack whether that attribution is sound.**
- Five defects were found and fixed during verification (missing panel `id`s killing
  keyboard nav; 299px overflow at 320px; `position:fixed` rails escaping their variant;
  `vw`-sized headlines overflowing card-sized frames; blank CSS custom properties
  crashing Three's colour parser).
- One test was **rewritten rather than satisfied**: it banned all template composition,
  but composing display text from `marketingStats` is the single-source-of-truth rule.

---

## 3. Attack surface — where the builder suspects the real weaknesses are

You are not limited to these. They are provided because a reviewer told only what is
strong will confirm the strength.

1. **The divergence proof may be circular.** The fingerprint is
   `nav_model|hero_mechanics|grid` — three enum strings the builder itself chose. Uniqueness
   of a self-selected tuple is not evidence the *pages* differ. What would actually prove C1?
2. **The "distinct scene family" test caps a family at 3 of 20 uses.** Why 3? Is that a
   principled bound or a number chosen to make the test pass? There are 8 families.
3. **`assertVariantHasGeometry` checks a hand-written signature table**
   (`SCENE_SIGNATURES`) rather than observing a rendered frame. It can pass while a scene
   draws nothing. Is it a real test or a tautology?
4. **20 of 20 variants "animating" at ~64fps** — is a frame counter incremented by the
   same code that claims to render actually independent evidence? What could make it lie?
5. **Eight families across 20 variants means ≥2 variants share scene geometry.** Does the
   "completely different" claim survive, or is the honest number lower than 20?
6. **The copy gate bans phrases, not meaning.** It is trivially satisfiable by avoiding 78
   strings while still writing generic filler. Is C4 actually enforced by anything?
7. **Only 20 headlines exist to be judged.** Is the anti-slop claim tested against the
   copy that actually renders, or only against a JSON blob?
8. **`playgroundRegistry.ts` was modified.** The builder calls this "additive" because
   `/` is untouched. Is a 20-entry modification to a shared registry consistent with the
   "nothing canonical changed" claim (C6)?
9. **The console binds localhost and is described as safe.** What is the actual threat
   model if another local process, or a browser page, reaches `127.0.0.1:4599`? Consider
   CORS, DNS rebinding, and the fact that the JSON endpoint discloses repo structure.
10. **The engine is reported BLOCKED.** Is `engineState.mjs` *deriving* that state or
    *hardcoding* it? If hardcoded, the console cannot notice the engine being unblocked.
11. **A generated-file layer** (`generate-worlds.mjs`, `wire-playground.mjs`) writes 20
    components and 20 registry entries. Generated code that is committed is code nobody
    reviews. What breaks when the generator and the committed output diverge?
12. **Verification tools live in `scripts/`, not in CI.** Nothing enforces that
    `gallery-verify.mjs` ever runs again. Is a green suite evidence about the future?

---

## 4. Source under review

Read these carefully. Attack what the code DOES, not what the prose says it does.

### 4.1 `three-worlds/runtime.ts` — the shared harness

```ts
import * as THREE from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { resolveColors } from './tokens';

export type MotionMode = 'live' | 'poster';
export type Tier = 'full' | 'balanced' | 'essential';

export function resolveMotion(
  tier: Tier,
  prefersReducedMotion: boolean,
  webglAvailable = true,
): MotionMode {
  if (prefersReducedMotion) return 'poster';
  if (tier === 'essential') return 'poster';
  if (!webglAvailable) return 'poster';
  return 'live';
}

export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export interface WorldContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  size: { width: number; height: number };
  clock: THREE.Clock;
  scrollProgress: number;
  pointer: { x: number; y: number };
  colors: Record<string, THREE.Color>;
}

export interface WorldHandle {
  update?: (dt: number, elapsed: number) => void;
  dispose?: () => void;
}

export type WorldBuilder = (ctx: WorldContext) => WorldHandle;

export function useThreeWorld(
  canvasRef: RefObject<HTMLCanvasElement>,
  hostRef: RefObject<HTMLElement>,
  motion: MotionMode,
  build: WorldBuilder,
): { live: boolean; lost: boolean; error: string | null; frames: number } {
  const [live, setLive] = useState(false);
  const [lost, setLost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  const framesRef = useRef(0);
  const reportedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host || motion !== 'live') { setLive(false); return; }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
      });
    } catch { setLive(false); return; }

    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (coarse ? 0.5 : 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    const clock = new THREE.Clock();
    const colors = resolveColors(host);
    const size = { width: 1, height: 1 };
    const scroll = { progress: 0 };
    const pointer = { x: 0, y: 0 };

    const ctx: WorldContext = {
      scene, camera, renderer, size, clock, colors,
      get scrollProgress() { return scroll.progress; },
      get pointer() { return pointer; },
    };

    let handle: WorldHandle;
    try {
      handle = buildRef.current(ctx);
    } catch (err) {
      renderer.dispose();
      setError(String((err as Error)?.message ?? err));
      setLive(false);
      return;
    }

    const resize = () => {
      const rect = host.getBoundingClientRect();
      size.width = Math.max(1, Math.round(rect.width));
      size.height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(dpr);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    };
    resize();

    let onScreen = true;
    let tabVisible = document.visibilityState !== 'hidden';
    let raf = 0;
    let running = false;

    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      try {
        handle.update?.(dt, clock.elapsedTime);
        renderer.render(scene, camera);
        framesRef.current += 1;
      } catch (err) {
        stop();
        const e = err as Error;
        if (!reportedRef.current) {
          reportedRef.current = true;
          console.error('[three-world] scene error', e?.message, e?.stack);
        }
        setError(e?.stack ? `${e.message} @ ${e.stack.split('\n')[1]?.trim() ?? 'unknown'}`
                          : String(e?.message ?? err));
        setLive(false);
      }
    };
    const start = () => { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const sync = () => { if (onScreen && tabVisible) start(); else stop(); };

    const io = new IntersectionObserver(
      (entries) => { onScreen = entries.some((e) => e.isIntersecting); sync(); },
      { threshold: 0.01 },
    );
    io.observe(host);

    const onVisibility = () => { tabVisible = document.visibilityState !== 'hidden'; sync(); };
    document.addEventListener('visibilitychange', onVisibility);

    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      scroll.progress = Math.min(1, Math.max(0, -rect.top / span));
    };
    const onPointer = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    host.addEventListener('pointermove', onPointer, { passive: true });

    let losses = 0;
    const onLost = (e: Event) => {
      e.preventDefault();
      losses += 1;
      if (losses > 1) { stop(); setLost(true); setLive(false); }
    };
    canvas.addEventListener('webglcontextlost', onLost);

    sync();
    setLive(true);

    const publish = () => {
      host.dataset.frames = String(framesRef.current);
      host.dataset.running = running ? 'yes' : 'no';
      host.dataset.onScreen = onScreen ? 'yes' : 'no';
      host.dataset.tabVisible = tabVisible ? 'yes' : 'no';
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
    };
    publish();
    const diagTimer = window.setInterval(publish, 250);

    return () => {
      window.clearInterval(diagTimer);
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      handle.dispose?.();
      renderer.dispose();
      setLive(false);
    };
  }, [canvasRef, hostRef, motion]);

  return { live, lost, error, frames: framesRef.current };
}
```

### 4.2 `three-worlds/tokens.ts`

```ts
import * as THREE from 'three';

const TOKEN_FALLBACKS: Record<string, { cssVar: string; hex: string }> = {
  midnightsapphire: { cssVar: '--primary', hex: '#002060' },
  royalDepth: { cssVar: '--surface', hex: '#003080' },
  iceWing: { cssVar: '--accent-primary', hex: '#60C0F0' },
  arcticCyan: { cssVar: '--accent-data', hex: '#50A0F0' },
  gildedFern: { cssVar: '--accent-luxury', hex: '#C6A84B' },
  frostWhite: { cssVar: '--text-primary', hex: '#E0ECF4' },
  swanLavender: { cssVar: '--tertiary', hex: '#4070C0' },
  wingPurple: { cssVar: '--accent-glow', hex: '#8B5CF6' },
  obsidian: { cssVar: '--bg-deep', hex: '#0A0A0F' },
  graphite: { cssVar: '--surface-dark', hex: '#1A1A24' },
};

function isColorLike(value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  return /^#([0-9a-f]{3,8})$/i.test(v)
    || /^rgba?\(/i.test(v)
    || /^hsla?\(/i.test(v)
    || /^[a-z]+$/i.test(v);
}

export function resolveColors(host: HTMLElement): Record<string, THREE.Color> {
  let cs: CSSStyleDeclaration | null = null;
  try {
    cs = typeof getComputedStyle === 'function' ? getComputedStyle(host) : null;
  } catch { cs = null; }

  const out: Record<string, THREE.Color> = {};
  for (const [key, { cssVar, hex }] of Object.entries(TOKEN_FALLBACKS)) {
    let value = hex;
    if (cs) {
      const raw = cs.getPropertyValue(cssVar);
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (isColorLike(trimmed)) value = trimmed;
    }
    try { out[key] = new THREE.Color(value); }
    catch { out[key] = new THREE.Color(hex); }
  }
  return out;
}

export const TOKEN_NAMES = Object.keys(TOKEN_FALLBACKS);
```

### 4.3 `three-worlds/scenes/looks.ts` — the divergence map (structure + sample rows)

```ts
export interface VariantLook { family: SceneFamily; overrides?: Partial<SceneParams>; }

export const LOOKS: Record<HeroMechanics, VariantLook> = {
  'scroll-scrub':     { family: 'terrain',   overrides: { spread: 46, detail: 40, speed: 0.35, drift: 1.1, cameraZ: 14, dolly: 9 } },
  'pointer-parallax': { family: 'lines',     overrides: { count: 22, spread: 16, drift: 0.9, speed: 0.4, dolly: 5 } },
  'depth-tunnel':     { family: 'rings',     overrides: { count: 26, radius: 3.4, gap: 3.6, thickness: 0.09, speed: 0.5, cameraZ: 15, dolly: 11 } },
  'assemble':         { family: 'rings',     overrides: { count: 14, radius: 5.2, gap: 2.4, thickness: 0.05, speed: 0.3, cameraZ: 20, dolly: 8 } },
  'object-orbit':     { family: 'orbit',     overrides: { count: 7, radius: 3.2, detail: 2, size: 0.2, speed: 0.45, cameraZ: 16, dolly: 6 } },
  'field-reveal':     { family: 'points',    overrides: { count: 1600, spread: 30, size: 0.05, speed: 0.35, drift: 0.9, cameraZ: 22, dolly: 8, wire: true } },
  'measured-reveal':  { family: 'lines',     overrides: { count: 34, spread: 20, drift: 0.35, speed: 0.25, cameraZ: 18, dolly: 6 } },
  'assembling-parts': { family: 'instanced', overrides: { count: 900, spread: 18, size: 0.09, speed: 0.55, drift: 0.8, cameraZ: 20, dolly: 10 } },
  'liquid-surface':   { family: 'refract',   overrides: { count: 5, radius: 2.6, speed: 0.5, spin: 0.05, cameraZ: 12, dolly: 4 } },
  'grid-ignition':    { family: 'instanced', overrides: { count: 1400, spread: 22, size: 0.07, speed: 0.7, drift: 0.4, cameraZ: 24, dolly: 12 } },
  'line-draw':        { family: 'lines',     overrides: { count: 48, spread: 24, drift: 0.7, speed: 0.3, cameraZ: 20, dolly: 7 } },
  'instanced-swarm':  { family: 'points',    overrides: { count: 4200, spread: 34, size: 0.035, speed: 0.9, drift: 1.4, cameraZ: 26, dolly: 14 } },
  'camera-dolly':     { family: 'orbit',     overrides: { count: 4, radius: 4.2, detail: 3, size: 0.24, speed: 0.3, cameraZ: 20, dolly: 15 } },
  'shader-morph':     { family: 'refract',   overrides: { count: 8, radius: 2.2, speed: 1.1, spin: 0.1, cameraZ: 14, dolly: 5 } },
  'instanced-field':  { family: 'instanced', overrides: { count: 2200, spread: 32, size: 0.06, speed: 0.4, drift: 0.6, cameraZ: 28, dolly: 9 } },
  'light-sweep':      { family: 'waveform',  overrides: { count: 64, spread: 5.5, size: 0.3, speed: 0.8, cameraZ: 18, dolly: 8 } },
  'fracture':         { family: 'orbit',     overrides: { count: 12, radius: 3.6, detail: 1, size: 0.14, speed: 0.6, cameraZ: 17, dolly: 12, wire: true } },
  'waveform':         { family: 'waveform',  overrides: { count: 96, spread: 4.2, size: 0.28, speed: 1.0, cameraZ: 20, dolly: 6 } },
  'terrain-fly':      { family: 'terrain',   overrides: { spread: 60, detail: 64, speed: 0.5, drift: 1.6, cameraZ: 16, dolly: 14, wire: true } },
  'lens-refract':     { family: 'refract',   overrides: { count: 6, radius: 3.0, speed: 0.45, spin: 0.06, cameraZ: 13, dolly: 7 } },
};

export function builderForMechanic(mechanics: HeroMechanics): WorldBuilder {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no scene registered for hero mechanic: ${mechanics}`);
  return builderFor(look.family, look.overrides ?? {});
}

export function familySignature(mechanics: HeroMechanics): string {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no look for mechanic: ${mechanics}`);
  return `${look.family}:${SCENE_SIGNATURES[look.family].geometry}`;
}

export function assertVariantHasGeometry(mechanics: HeroMechanics) {
  const look = LOOKS[mechanics];
  if (!look) throw new Error(`no look registered for mechanic ${mechanics}`);
  const sig = SCENE_SIGNATURES[look.family];
  if (!sig) throw new Error(`no signature for family ${look.family}`);
  if (!sig.object.startsWith('THREE.') || !sig.geometry.startsWith('THREE.')) {
    throw new Error(`family ${look.family} does not declare Three.js objects`);
  }
  if (typeof builderForMechanic(mechanics) !== 'function') {
    throw new Error(`family ${look.family} has no builder`);
  }
  return sig;
}

export function lookIssues(): string[] {
  const problems: string[] = [];
  const numericKeys: Array<keyof SceneParams> = ['count','spread','size','speed','spin','drift','radius','thickness','gap','detail','cameraZ','dolly'];
  for (const [mechanic, look] of Object.entries(LOOKS)) {
    if (!FAMILY_PARAMS[look.family]) { problems.push(`${mechanic}: unknown family ${look.family}`); continue; }
    for (const key of numericKeys) {
      const v = look.overrides?.[key];
      if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
        problems.push(`${mechanic}.${String(key)} is not a finite number`);
      }
    }
    const numericOverrides = numericKeys.filter((k) => look.overrides?.[k] !== undefined);
    if (numericOverrides.length < 3) {
      problems.push(`${mechanic}: only ${numericOverrides.length} numeric axes overridden (need >=3)`);
    }
  }
  return problems;
}
```

### 4.4 `scenes/paramsCore.ts` — the merge path

```ts
export const FAMILY_PARAMS: Record<SceneFamily, (ctx: WorldContext) => Partial<SceneParams>> = {
  points:    () => ({ count: 900,  spread: 26, size: 0.05, speed: 0.4, cameraZ: 20, dolly: 8 }),
  rings:     () => ({ count: 20,   radius: 4,  gap: 5, thickness: 0.16, speed: 0.4, cameraZ: 16, dolly: 10 }),
  orbit:     () => ({ count: 6,    radius: 3.4, detail: 2, size: 0.18, speed: 0.4, cameraZ: 16, dolly: 7 }),
  lines:     () => ({ count: 30,   spread: 20, drift: 0.6, speed: 0.3, cameraZ: 18, dolly: 6 }),
  waveform:  () => ({ count: 72,   spread: 4,  size: 0.3, speed: 0.8, cameraZ: 18, dolly: 7 }),
  instanced: () => ({ count: 1200, spread: 20, size: 0.09, speed: 0.5, drift: 0.7, cameraZ: 22, dolly: 10 }),
  terrain:   () => ({ spread: 50,  detail: 48, speed: 0.4, drift: 1.2, cameraZ: 15, dolly: 11 }),
  refract:   () => ({ count: 5,    radius: 2.8, speed: 0.5, spin: 0.06, cameraZ: 13, dolly: 5 }),
};

const FAMILIES: Record<SceneFamily, (c: WorldContext, p: SceneParams) => WorldHandle> = {
  points: pointsFamily, rings: ringsFamily, orbit: orbitFamily, lines: linesFamily,
  waveform: waveformFamily, instanced: instancedFamily, terrain: terrainFamily, refract: refractFamily,
};

export function builderFor(family: SceneFamily, overrides: Partial<SceneParams> = {}): WorldBuilder {
  const fn = FAMILIES[family];
  if (!fn) throw new Error(`unknown scene family: ${family}`);
  return (ctx: WorldContext) => {
    const defaults = defaultParams(ctx);
    const params: SceneParams = { ...defaults, ...FAMILY_PARAMS[family](ctx), ...overrides };
    if (!(params.base instanceof THREE.Color)) params.base = defaults.base;
    if (!(params.accent instanceof THREE.Color)) params.accent = defaults.accent;
    return fn(ctx, params);
  };
}

export const SCENE_SIGNATURES: Record<SceneFamily, SceneSignature> = {
  points:    { object: 'THREE.Points',       geometry: 'THREE.BufferGeometry',       material: 'THREE.PointsMaterial' },
  rings:     { object: 'THREE.Mesh',         geometry: 'THREE.TorusGeometry',        material: 'THREE.MeshBasicMaterial' },
  orbit:     { object: 'THREE.Mesh',         geometry: 'THREE.IcosahedronGeometry',  material: 'THREE.MeshBasicMaterial' },
  lines:     { object: 'THREE.Line',         geometry: 'THREE.BufferGeometry',       material: 'THREE.LineBasicMaterial' },
  waveform:  { object: 'THREE.Mesh',         geometry: 'THREE.BoxGeometry',          material: 'THREE.MeshBasicMaterial' },
  instanced: { object: 'THREE.InstancedMesh',geometry: 'THREE.TetrahedronGeometry',  material: 'THREE.MeshBasicMaterial' },
  terrain:   { object: 'THREE.Mesh',         geometry: 'THREE.PlaneGeometry',        material: 'THREE.MeshBasicMaterial' },
  refract:   { object: 'THREE.Mesh',         geometry: 'THREE.SphereGeometry',       material: 'THREE.MeshBasicMaterial' },
};

export function defaultParams(ctx: WorldContext): SceneParams {
  return {
    count: 800, spread: 24, size: 0.06, speed: 0.6, spin: 0.08, drift: 0.6,
    radius: 4, thickness: 0.16, gap: 5, detail: 20, cameraZ: 16, dolly: 6,
    wire: false, base: ctx.colors.midnightsapphire ?? new THREE.Color('#002060'),
    accent: ctx.colors.iceWing ?? new THREE.Color('#60C0F0'),
  };
}
```

### 4.5 `copy/antiSlop.ts` — the copy gate

```ts
export const BANNED_PHRASES: Record<string, string[]> = {
  'ai-connective-tissue': ['unlock the','unlock your','elevate your','seamless','seamlessly','empower','empowering','delve','dive into','let us help you','we believe that','it is not just',"it's not just",'more than just','take it to the next level','next level'],
  'empty-intensifier': ['truly','incredibly','game-changing','game changer','world-class','cutting-edge','state-of-the-art','unparalleled','revolutionary','best-in-class','unrivaled'],
  'journey-metaphor': ['embark on a journey','on your journey','your fitness journey','in today’s landscape',"in today's landscape",'in the realm of','when it comes to','at the end of the day'],
  'rule-9-language': ['yoga','meditation','meditative','mindfulness','mindful'],
  'engagement-bait': ['look no further','the best part?','but here is the thing','here’s the thing',"here's the thing",'imagine a world'],
};

const FLAT = Object.entries(BANNED_PHRASES).flatMap(([cls, phrases]) => phrases.map((phrase) => ({
  cls, phrase,
  re: new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}([^a-z0-9]|$)`, 'i'),
})));

export function findSlop(text: string): string[] {
  const hits: string[] = [];
  for (const { cls, phrase, re } of FLAT) if (re.test(text)) hits.push(`${cls} :: ${phrase}`);
  return hits;
}

export const HEADLINE_WORD_BUDGET = 9;
export function longHeadlines(headlines: string[]): string[] {
  return headlines.filter((h) => h.trim().split(/\s+/).length > HEADLINE_WORD_BUDGET);
}
```

### 4.6 `copy/pack.ts` — structure and a sample of the real copy

```ts
import { MARKETING_STATS, YEARS_EXPERIENCE_CLAIM, EXERCISE_LIBRARY_CLAIM,
         CLIENTS_TRANSFORMED_CLAIM, SATISFACTION_CLAIM } from '../../../../content/marketingStats';

function statText(stat: { value: number; suffix: string; display?: string }): string {
  return stat.display ?? `${stat.value}${stat.suffix}`;
}

export const SHARED = {
  headline: 'Health First. Community Always.',
  sub: 'Personal training in Anaheim Hills. NASM-certified coaching, biomechanics-led programming, and a community that keeps showing up.',
  ctas: [
    { id: 'join',     label: 'Join the Community', to: '/signup',  intent: 'primary' },
    { id: 'trainer',  label: 'Find a Trainer',     to: '/contact', intent: 'secondary' },
    { id: 'programs', label: 'See Programs',       to: '/store',   intent: 'tertiary' },
  ],
  proof: [ /* 6 entries, each value = statText(MARKETING_STATS.<key>) */ ],
  sections: { mission: 'Why we coach', trainers: 'Who you train with', /* ...11 total... */ },
  trust: [
    `${YEARS_EXPERIENCE_CLAIM} years coaching in Orange County`,
    `NASM OPT model and corrective exercise protocols`,
    `${EXERCISE_LIBRARY_CLAIM} exercises in the programming library`,
    `${CLIENTS_TRANSFORMED_CLAIM} clients trained since opening`,
    `${SATISFACTION_CLAIM} of clients report they would recommend us`,
  ],
} as const;

export const OVERRIDES: Record<string, { headline?: string; sub?: string; note: string }> = {
  v01: { headline: 'Twenty-six years. Same front door.', sub: 'Sean Swan has coached in Anaheim Hills since 1999. The methods changed. The standard did not.', note: 'Ledger conceit: a date-stamped record, so the headline carries a year.' },
  v02: { headline: 'Your first session is a measurement.', sub: 'We assess movement before we load it. NASM overhead squat, biomechanics, then a plan.', note: 'Timeline conceit opens on the assessment step, not the promise.' },
  v03: { headline: 'Built for the body you have.', sub: 'Every program starts from your movement assessment. Not a template, not a trend.', note: 'Portal conceit addresses the reader directly.' },
  v04: { headline: 'Three ways to train. One standard.', sub: 'Express Precision, Signature Performance, Transformation. Same coaching, different hours.', note: 'Rail conceit needs the plan count stated up front.' },
  v05: { headline: 'Small groups. Full attention.', sub: 'Group sessions capped so every rep still gets eyes on it.', note: 'Spine conceit is about proximity, so the line is about attention.' },
  v06: { headline: 'Golf is a rotation sport.', sub: 'Hip and torso power, core stability, and the mobility a full backswing needs.', note: 'Evidence conceit picks the niche vertical to prove specificity.' },
  v07: { headline: 'Train anywhere. Same coach.', sub: 'Remote programming and check-ins through the SwanStudios platform.', note: 'Rail-and-well conceit foregrounds the remote delivery model.' },
  v08: { headline: 'The gym is not the hard part.', sub: 'Accountability, scheduling, and a community that notices when you miss.', note: 'Ledger conceit: names the real failure mode.' },
  v09: { headline: 'Measure it or it did not happen.', sub: 'Every session logged. Every chart built from your real numbers.', note: 'Sheet conceit is the data-truth rule as a headline.' },
  v10: { headline: 'Coaching that changes when you do.', sub: 'Programs get rewritten as your assessment results move.', note: 'Shelf conceit: the plan is a living document.' },
  v11: { headline: 'Anaheim Hills. Since 1999.', sub: 'One studio, one standard, and a community that outlasted every fitness trend.', note: 'Spine-offset conceit leads with place and tenure.' },
  v12: { headline: 'Recovery is programmed, not optional.', sub: 'Corrective exercise, mobility work, and myofascial release built into the plan.', note: 'Band-stack conceit places recovery inside the program, not beside it.' },
  v13: { headline: 'Thirty minutes. No wasted reps.', sub: 'Express Precision for the weeks when an hour is not available.', note: 'Gutter-index conceit names the constraint.' },
  v14: { headline: 'The numbers are yours.', sub: 'Sessions, load, and progress charts built from your logged training.', note: 'Tessellated conceit: data ownership.' },
  v15: { headline: 'Nutrition is part of the program.', sub: 'Macro planning and eating strategies that survive a real schedule.', note: 'Kanban conceit folds nutrition into the plan.' },
  v16: { headline: 'Photography, video, and the work behind it.', sub: 'We document the training. The gallery is open.', note: 'Wordfall conceit is the studio auteur voice.' },
  v17: { headline: 'Not a class. Not a challenge.', sub: 'Personal training built on assessment, periodization, and follow-through.', note: 'Sheet conceit refuses the category.' },
  v18: { headline: 'This page is the last thing we build.', sub: 'A construction-trades front page, composed as an editorial spread.', note: 'Wildcard: alien archetype speaking in its own voice about the page itself.' },
  v19: { headline: 'Twenty-six years of coaching, in one room.', sub: 'Assessment, programming, nutrition, and recovery under one roof.', note: 'Orbit conceit gathers the disciplines.' },
  v20: { headline: 'Come for the training. Stay for the people.', sub: 'The community is the program. The program is why it works.', note: 'Crucible conceit states the retention truth.' },
};

export function copyFor(id: string): { headline: string; sub: string } {
  const o = OVERRIDES[id];
  return { headline: o?.headline ?? SHARED.headline, sub: o?.sub ?? SHARED.sub };
}
```

### 4.7 `skeletons.ts` — the 20 contracts (all 20 shown)

```ts
export const SKELETONS: SkeletonContract[] = [
  { id:'v01', nav_model:'vertical-index',  hero_mechanics:'scroll-scrub',     grid:'full-bleed',      chapters:6, anti_specs:['no centered hero text block','no cookie-cutter card grid','no decorative gradient only'] },
  { id:'v02', nav_model:'stepper-left',    hero_mechanics:'measured-reveal',  grid:'timeline-spine',  chapters:5, anti_specs:['no full-bleed background image','no floating pill nav'] },
  { id:'v03', nav_model:'overlay-drawer',  hero_mechanics:'depth-tunnel',     grid:'bento',           chapters:4, anti_specs:['no persistent top bar','no hero as a single static still'] },
  { id:'v04', nav_model:'side-rail',       hero_mechanics:'object-orbit',     grid:'single-measure',  chapters:4, anti_specs:['no decorative card shadows','no grid of equal tiles'] },
  { id:'v05', nav_model:'split-header',    hero_mechanics:'field-reveal',     grid:'three-rail',      chapters:5, anti_specs:['no body copy wider than 70 characters','no carousel controls'] },
  { id:'v06', nav_model:'corner-anchor',   hero_mechanics:'line-draw',        grid:'evidence-grid',   chapters:4, anti_specs:['no hero video background','no rounded-corner pill buttons'] },
  { id:'v07', nav_model:'progress-spine',  hero_mechanics:'instanced-field',  grid:'rail-well',       chapters:4, anti_specs:['no marketing superlatives in headings','no stacked full-width bands'] },
  { id:'v08', nav_model:'ticker-nav',      hero_mechanics:'waveform',         grid:'admin-table',     chapters:7, anti_specs:['no hero above the fold taller than 60vh','no decorative illustration'] },
  { id:'v09', nav_model:'sticky-minimal',  hero_mechanics:'grid-ignition',    grid:'dashboard-sheet', chapters:4, anti_specs:['no hero at all','no centered column wider than 900px'] },
  { id:'v10', nav_model:'gutter-index',    hero_mechanics:'assemble',         grid:'product-shelf',   chapters:5, anti_specs:['no full-screen hero image','no autoplaying media without a pause control'] },
  { id:'v11', nav_model:'radial-hub',      hero_mechanics:'camera-dolly',     grid:'editorial-offset',chapters:4, anti_specs:['no sticky footer bar','no 50/50 split hero'] },
  { id:'v12', nav_model:'no-nav',          hero_mechanics:'liquid-surface',   grid:'stacked-bands',   chapters:7, anti_specs:['no navigation chrome of any kind','no header logo lockup'] },
  { id:'v13', nav_model:'vertical-index',  hero_mechanics:'shader-morph',     grid:'magazine-index',  chapters:4, anti_specs:['no hero that requires reading to understand','no nested card-in-card'] },
  { id:'v14', nav_model:'edge-tabs',       hero_mechanics:'fracture',         grid:'spotlight-grid',  chapters:5, anti_specs:['no symmetrical layout','no decorative dividers between every section'] },
  { id:'v15', nav_model:'command-palette', hero_mechanics:'light-sweep',      grid:'kanban-columns',  chapters:4, anti_specs:['no hero text over a busy photograph','no hover-only navigation'] },
  { id:'v16', nav_model:'floating-pill',   hero_mechanics:'instanced-swarm',  grid:'horizontal-scroll',chapters:5,anti_specs:['no centered layout anywhere','no full-page vertical scroll'] },
  { id:'v17', nav_model:'sticky-minimal',  hero_mechanics:'assembling-parts', grid:'asymmetric-bento',chapters:6, anti_specs:['no equal-height card row','no hero shorter than 70vh'] },
  { id:'v18', nav_model:'command-strip',   hero_mechanics:'terrain-fly',      grid:'editorial-spread',chapters:5, anti_specs:['no stock photography','no soft gradients','no rounded corners on section frames'], wildcard:'construction-trades-site-as-editorial-magazine' },
  { id:'v19', nav_model:'chapter-dots',    hero_mechanics:'lens-refract',     grid:'orbit-ring',      chapters:5, anti_specs:['no stacked single-column layout','no carousel of testimonial cards'] },
  { id:'v20', nav_model:'horizon-bar',     hero_mechanics:'pointer-parallax', grid:'editorial-cards', chapters:4, anti_specs:['no hero without a visible primary action','no text smaller than 16px'] },
];

export function fingerprintOf(s: SkeletonContract): string {
  return `${s.nav_model}|${s.hero_mechanics}|${s.grid}`;
}
export function findCollisions(rows: SkeletonContract[] = SKELETONS): string[] {
  const seen = new Map<string, string>(); const out: string[] = [];
  for (const s of rows) {
    const k = fingerprintOf(s); const prev = seen.get(k);
    if (prev) out.push(`${prev} == ${s.id} (${k})`); seen.set(k, s.id);
  }
  return out;
}
```

### 4.8 `engineState.mjs` — how BLOCKED is derived

```js
const ENGINE_README = 'scripts/design-brain/README.md';
const ENGINE_SRC = 'scripts/design-brain/src';
const ARCHETYPE_INDEX = 'docs/ai-workflow/design-brain/archetypes/index.json';
const DOCTRINE = 'docs/ai-workflow/design-brain/design.md';

function extractGateReason(readme) {
  if (!readme) {
    return 'engine README unavailable — cannot confirm engine state; assuming BLOCKED (fail-closed default)';
  }
  const sentences = readme.replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\s*[-•]\s+/)
    .map((s) => s.trim()).filter(Boolean)
    .filter((s) => /fail-closed|refuse durable work|non-operational|source-classification/i.test(s));
  if (!sentences.length) {
    return 'engine README no longer states a fail-closed gate — re-review before trusting this state';
  }
  const specific = sentences.find((s) => /source-classification|revocation/i.test(s));
  return (specific ?? sentences[0]).slice(0, 600);
}

export function readEngineState(repo) {
  const readme = tryRead(join(repo, ENGINE_README));
  const indexRaw = tryRead(join(repo, ARCHETYPE_INDEX));
  const doctrine = tryRead(join(repo, DOCTRINE));
  let archetypes = 0;
  if (indexRaw) {
    try { const parsed = JSON.parse(indexRaw); archetypes = Array.isArray(parsed.archetypes) ? parsed.archetypes.length : 0; }
    catch { archetypes = 0; }
  }
  return {
    durableWrites: 'BLOCKED',
    reason: extractGateReason(readme),
    writeControls: [],
    sourceFiles: countFiles(join(repo, ENGINE_SRC), '.mjs'),
    testFiles: countFiles(join(repo, 'scripts/design-brain/tests'), '.mjs'),
    archetypes,
    doctrineLines: doctrine ? doctrine.split('\n').length : 0,
    readmePresent: Boolean(readme),
  };
}
```

### 4.9 `server.mjs` — security-relevant excerpt

```js
const HOST = '127.0.0.1';
const ASSET_ROUTES = {
  '/':         { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.css':  { file: 'app.css',    type: 'text/css; charset=utf-8' },
  '/app.js':   { file: 'app.js',     type: 'text/javascript; charset=utf-8' },
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}`);
  const path = url.pathname;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'read-only surface', method: req.method }); return;
  }
  if (path === '/api/state') {
    try { json(res, 200, await snapshot()); }
    catch (err) { json(res, 500, { error: 'snapshot failed', detail: String(err && err.message) }); }
    return;
  }
  const asset = ASSET_ROUTES[path];
  if (!asset) { json(res, 404, { error: 'not found', path, allowed: Object.keys(ASSET_ROUTES) }); return; }

  const file = join(ASSETS, asset.file);
  if (!existsSync(file)) { json(res, 500, { error: 'asset missing', file: asset.file }); return; }
  const body = readFileSync(file);
  res.writeHead(200, {
    'content-type': asset.type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': [
      "default-src 'none'", "style-src 'self'", "script-src 'self'",
      "connect-src 'self'", "img-src 'self' data:",
      "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
    ].join('; '),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(port, HOST, () => { /* ... */ });
```

### 4.10 `design-brain/external-reference-mcp.md` — the authority for the Mobbin claim

```
- Target connector: **Mobbin MCP**. If someone says "Mobin" in notes or transcripts, normalize it to Mobbin.
- Transcript-proven tools: `search screens`, `search flows`, and `search sections`.
- Requirement: Sean-owned Mobbin subscription plus the account-specific MCP/OAuth connector URL.
- Secret rule: never commit MCP URLs, OAuth URLs, cookies, tokens, account emails, screenshots
  containing private account data, or customer data.
Every design-direction task starts by checking whether the Mobbin tools are callable. If the connector
is unavailable, write `[MOBBIN UNAVAILABLE]` in the reference receipt and continue from
`SWAN-CINEMATIC-DESIGN-SYSTEM.md`, `SWAN-ASSET-DESIGN-SYSTEM.md`, and the rest of this Design Brain.
```

---

## 5. Your output format

```
## VERDICT: APPROVE | REVISE | REJECT

## FINDINGS (ranked by blast radius)

### F1 — <one-line title>            [DEFECT | UNSUPPORTED CLAIM | MISSING WORK]
Blast radius: <what breaks, who is affected>
Evidence: <quote the source above, or state precisely what is absent>
Why it is wrong: <the reasoning>

### F2 — ...
(repeat; stop when you run out of real findings rather than padding)

## CLAIMS I COULD NOT SUPPORT
<map to C1..C8; say which are carried by the evidence and which are not>

## WHAT I COULD NOT ASSERT (UNSURE)
<facts you would need repo access to check — list them rather than guessing>
```

Remember: the builder would rather receive three findings that are real than twenty that
are plausible. `[UNSURE]` is a respectable answer. An empty body is not.
