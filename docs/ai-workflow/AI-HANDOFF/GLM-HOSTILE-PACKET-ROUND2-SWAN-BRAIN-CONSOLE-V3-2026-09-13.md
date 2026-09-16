# HOSTILE REVIEW PACKET — ROUND 2 — Swan Brain Console v3 + 20-variant Three.js fleet

**Reviewer remit: HOSTILE. This is a RE-REVIEW of revised code, not a first look.**

Round 1 (glm-5.3 and glm-5.3-flash) returned `REVISE` with 17 combined findings. Seven were verified
real and have been fixed. Five were verified **wrong** and are recorded here so they are not re-raised.
The rest were accepted as true limitations and are disclosed rather than patched.

**Your job in round 2 is NOT to re-find the round-1 defects.** It is:
1. To judge whether each FIX is correct, or whether it introduced a new defect.
2. To find what round 1 missed entirely.
3. To attack the *disclosed limitations* — the things the builder chose not to fix.

---

## 0. How to answer

1. **Absence-first.** Your most reliable contribution is *"this claim is not supported by the evidence
   shown."* Lead with those. You have no repo access — this packet is all you have.
2. **Label every finding** `DEFECT` / `UNSUPPORTED CLAIM` / `MISSING WORK`. Mark checkable-but-unshown
   facts `[UNSURE]` rather than asserting them. Round 1 asserted several such facts and was wrong
   on five (see §2) — facts you invent cost more than silence.
3. **Give the finding, not a compromise recommendation.** Landing on a middle path is a recorded habit
   and is not wanted.
4. **Rank by blast radius.** Three finished findings beat twenty plausible ones.
5. **Finish.** In round 1 both seats spent their entire output budget on reasoning and returned an
   EMPTY BODY (7,997 and 7,996 reasoning tokens against an 8,000 cap). The cap is 32,000 here. Still:
   if you are running long, emit fewer findings written fully rather than thinking to the end.
6. Verdict, exactly one: `APPROVE` / `REVISE` / `REJECT`.

---

## 1. What changed since round 1

Seven fixes. Each is shown as the new source, with the old behaviour stated so you can judge whether
the fix is correct or merely different.

### FIX 1 — WebGL context loss was swallowed (was: telemetry reported health on a black canvas)

Round-1 defect: the first `webglcontextlost` incremented a counter but did NOT stop the loop.
`renderer.render()` on a lost context does not throw — GL calls become silent no-ops — so `frames`
kept climbing and `data-drawCalls` kept reporting non-zero for a dead canvas. `lost` was gated on
`losses > 1`, which cannot fire before restoration, and there was no `webglcontextrestored` listener.

```ts
// runtime.ts (new)
let losses = 0;
let restored = false;
const onLost = (e: Event) => {
  e.preventDefault();
  losses += 1;
  stop();                                   // stop FIRST: a dead context must not keep counting frames
  if (losses > 1) { setLost(true); setLive(false); }
};
const onRestored = () => {
  restored = true;
  setLost(false);
  hostObservation.refresh();                // backing store is gone; re-derive size and progress
  sync();
};
canvas.addEventListener('webglcontextlost', onLost);
canvas.addEventListener('webglcontextrestored', onRestored);
```

Telemetry now publishes the loss state so it cannot look healthy on a corpse:

```ts
// diagnostics.ts (new module)
export function isPresenting(d: WorldDiag): boolean {
  return d.frames > 2 && d.running && !d.contextLost && d.drawCalls > 0;
}
```

### FIX 2 — `durableWrites` was a hardcoded literal (was: console could never notice the engine unblocking)

```js
// engineState.mjs (new)
const GATE_DECLARATION = 'remain fail-closed';
// ...
const gateDeclared = Boolean(readme && readme.includes(GATE_DECLARATION));
const durableWrites = gateDeclared ? 'BLOCKED' : 'UNKNOWN';
const reason = gateDeclared
  ? extractGateReason(readme)
  : 'engine README no longer declares the fail-closed gate — this console cannot '
    + 'verify whether a signed authority adapter exists, so durable-write state is '
    + 'UNKNOWN and requires human re-review before any tooling trusts it';
return { durableWrites, reason, writeControls: [], gateDeclared, /* counts... */ };
```

### FIX 3 — no `ResizeObserver`; and FIX 4 — scroll progress was binary on short hosts

Both lived in the same code and both are now in `observe.ts`.

Old: only `window.resize` was observed, so a host whose box changed without the window (fonts
settling, reflow) kept its original buffer; `Math.max(1, …)` left a zero-area host at a permanent
1x1 buffer while still drawing and counting frames.

Old scroll formula: `Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)))`.
For a host SHORTER than the viewport the divisor is negative, clamps to 1, and progress snaps 0 -> 1
at one pixel of scroll. All 20 scenes multiply this by `dolly`:
`ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly`.

```ts
// observe.ts (new)
export function scrollProgressFor(
  rect: { top: number; height: number },
  viewportHeight: number,
  anchor = 0.85,
): number {
  const vh = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 1;
  const travel = Math.max(Number.isFinite(rect.height) ? rect.height : 0, vh) || 1;
  const passed = vh * anchor - (Number.isFinite(rect.top) ? rect.top : 0);
  const p = passed / travel;
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
}

export function observeHost(host: HTMLElement, observed: Observed, onResize: () => void): ObserveHandle {
  const readProgress = () => {
    const rect = host.getBoundingClientRect();
    observed.progress = scrollProgressFor(rect, window.innerHeight);
  };
  const onPointer = (e: PointerEvent) => {
    observed.pointer = pointerFor(e.clientX, e.clientY, host.getBoundingClientRect());
  };
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => { onResize(); readProgress(); })
    : null;
  ro?.observe(host);
  window.addEventListener('scroll', readProgress, { passive: true });
  window.addEventListener('resize', onResize);
  host.addEventListener('pointermove', onPointer, { passive: true });
  readProgress();
  return {
    refresh: () => { onResize(); readProgress(); },
    disconnect: () => {
      ro?.disconnect();
      window.removeEventListener('scroll', readProgress);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onPointer);
    },
  };
}
```

### FIX 5 — non-colours were silently whitened (this is the fix most worth attacking)

Round-1 defect, **measured**: `THREE.Color.set('unset')` returns `r=1 g=1 b=1`, warns, and does NOT
throw — so a `try/catch` fallback was dead code and a token defined as `unset` rendered WHITE.

```ts
// tokens.ts (new)
const REJECTED_VALUES = new Set([
  'unset', 'inherit', 'initial', 'revert', 'revert-layer', 'currentcolor', 'transparent',
  'none', 'auto', 'normal',
]);

export function normalizeCssColor(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return null;
  if (REJECTED_VALUES.has(v.toLowerCase())) return null;
  if (typeof document === 'undefined' || !document.createElement) return null;
  try {
    const probe = document.createElement('div');
    probe.style.color = '';
    probe.style.color = v;
    const out = probe.style.color;
    return typeof out === 'string' && out.length > 0 ? out : null;
  } catch { return null; }
}

export function toColor(value: string, fallbackHex: string): THREE.Color {
  const candidate = normalizeCssColor(value);
  if (!candidate) return new THREE.Color(fallbackHex);
  const c = new THREE.Color();
  c.set(candidate);
  // Verify rather than trust: `set` warns-and-whitens instead of throwing.
  if (c.r === 1 && c.g === 1 && c.b === 1
      && !/^(#f{3,8}|white|rgb\(255,\s*255,\s*255\))$/i.test(candidate)) {
    return new THREE.Color(fallbackHex);
  }
  return c;
}
```

Measured behaviour of the browser parse this relies on (jsdom, which matches Chrome here):

```
'#002060'           -> 'rgb(0, 32, 96)'
'hsl(210,100%,19%)' -> 'rgb(0, 48, 97)'
'rgb(0 0 0 / 50%)'  -> 'rgba(0, 0, 0, 0.5)'   (valid CSS; THREE cannot parse it)
'rebeccapurple'     -> 'rebeccapurple'         (valid CSS; THREE does not know it)
'notacolor'         -> ''                      (rejected)
```

### FIX 6 — tests for the previously untested gating paths
New `runtime.contract.test.ts`, 27 tests, each a regression test for one of the above.

### FIX 7 — the stated phrase count was wrong
The builder's receipt claimed "78 banned phrases". Importing the real module gives 16+11+8+5+6 = **46**.

### Evidence after the fixes (builder-asserted)

- `tsc --noEmit` → 0 errors
- fleet contract → 13/13; runtime contract → **27/27**; engine contract → **10/10**
- `gallery-verify.mjs` → **24/24**; each variant 180–256 frames per ~4s window, non-zero draw calls
- `console-verify.mjs` → **17/17**
- rule 4 → max file 298 lines

---

## 2. Round-1 findings verified as WRONG (do not re-raise; you may attack the refutation)

1. "Builders read `ctx.size` at build time, when it is still `{1,1}`." — **No builder references
   `ctx.size`.** Zero occurrences in `familiesA`, `familiesB`, `paramsCore`, `looks`.
2. "`SCENE_SIGNATURES` contradicts the implementation." — The table declares `MeshBasicMaterial` for
   the refract family, which is what is constructed. No contradiction.
3. "The generator could revert the five fixes." — The generated variant files are ~1.1KB wrappers
   importing `three`, `WorldPage` and their own skeleton. No fix lives in them.
4. "`findSlop` is never invoked." — The fleet contract suite calls it.
5. "Evasion examples `game changing` / `dive deep into` pass the gate." — Both are caught. (The
   *mechanism* is real: inflections like `empowers`, and unhyphenated `world class`, do pass.)

---

## 3. Disclosed limitations the builder did NOT fix — attack these

1. **"20 completely different front pages" is weaker than it sounds.** The 20 variants resolve to
   **8 Three.js scene families**: `terrain` x2, `lines` x3, `rings` x2, `orbit` x3, `points` x2,
   `instanced` x3, `waveform` x2, `refract` x3. The divergence fingerprint is
   `nav_model|hero_mechanics|grid` — three enum strings the builder authored. Honest claim made:
   *20 unique grids, 18 distinct nav models, 20 distinct interaction models, 8 scene geometries.*
2. **`assertVariantHasGeometry` is close to a tautology.** It validates a hand-written
   `SCENE_SIGNATURES` table and checks `typeof builder === 'function'`. It invokes no builder, builds
   no geometry, renders no frame. It is kept and relabelled a *registry* check.
3. **A `MeshBasicMaterial` sphere cannot refract.** `liquid-surface`, `shader-morph` and
   `lens-refract` all map to the `refract` family (layered transparent `SphereGeometry` shells).
   The names promise physics the material cannot perform. The builder downgraded all materials away
   from `MeshStandardMaterial`/`MeshPhysicalMaterial` to make scenes renderer-independent.
4. **The SwiftShader attribution has no control experiment.** The crash
   (`parseUniform` dereferencing a null `activeInfo.name`) was attributed to the test rig. There is
   no co-mounted run under hardware GL, and no control page of 20 trivial scenes under SwiftShader.
5. **localhost is not the whole threat model for reads.** The server validates neither `Host` nor
   `Origin`, so DNS rebinding could expose `/api/state` (repo structure, file counts, README quotes).
   Writes are impossible: GET/HEAD only, fixed asset allowlist.
6. **Nothing enforces that the verifiers run again.** No CI wiring, no pre-commit hook. The green
   numbers are evidence about one afternoon.
7. **The copy gate is lexical.** 46 banned phrases, matched as substrings on word boundaries.
   Inflections and unhyphenated variants escape. The builder notes v20's headline
   "Come for the training. Stay for the people." is itself a stock viral template that the gate
   cannot see — disclosed rather than defended.

---

## 4. Source added since round 1 (full text — this is what to attack)

```ts
// diagnostics.ts — module doc comment trimmed
export type Tier = 'full' | 'balanced' | 'essential';
export type MotionMode = 'live' | 'poster';

export function resolveMotion(tier: Tier, prefersReducedMotion: boolean, webglAvailable = true): MotionMode {
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
  } catch { return false; }
}

export interface WorldDiag {
  frames: number; running: boolean; onScreen: boolean; tabVisible: boolean;
  contextLost: boolean; contextLosses: number; drawCalls: number; triangles: number;
}

export function publishDiag(host: HTMLElement, d: WorldDiag): void {
  host.dataset.frames = String(d.frames);
  host.dataset.running = d.running ? 'yes' : 'no';
  host.dataset.onScreen = d.onScreen ? 'yes' : 'no';
  host.dataset.tabVisible = d.tabVisible ? 'yes' : 'no';
  host.dataset.contextLost = d.contextLost ? 'yes' : 'no';
  host.dataset.contextLosses = String(d.contextLosses);
  host.dataset.drawCalls = String(d.drawCalls);
  host.dataset.triangles = String(d.triangles);
}

export function isPresenting(d: WorldDiag): boolean {
  return d.frames > 2 && d.running && !d.contextLost && d.drawCalls > 0;
}
```

```ts
// runtime.ts — the parts changed since round 1 (unchanged parts as shown in round 1)
const observed: Observed = { progress: 0, pointer: { x: 0, y: 0 } };
const ctx: WorldContext = {
  scene, camera, renderer, size, clock, colors,
  get scrollProgress() { return observed.progress; },
  get pointer() { return observed.pointer; },
};
// ... build() with try/catch -> setError, resize(), loop gating ...
const hostObservation = observeHost(host, observed, resize);
// ... context loss/restore handlers as shown in FIX 1 ...
const snapshot = () => publishDiag(host, {
  frames: framesRef.current, running, onScreen, tabVisible,
  contextLost: losses > 0 && !restored, contextLosses: losses,
  drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
});
snapshot();
const diagTimer = window.setInterval(snapshot, 250);
return () => {
  window.clearInterval(diagTimer);
  stop();
  io.disconnect();
  document.removeEventListener('visibilitychange', onVisibility);
  hostObservation.disconnect();
  canvas.removeEventListener('webglcontextlost', onLost);
  canvas.removeEventListener('webglcontextrestored', onRestored);
  handle.dispose?.();
  renderer.dispose();
  setLive(false);
};
```

```ts
// The layout system round 1 never saw, and asked for. 20 nav models, abbreviated:
export const Nav = styled.nav<{ $model: NavModel }>`
  position: relative; z-index: 3; display: flex; gap: 0.5rem;
  font-family: 'Sora', sans-serif; font-size: 0.78rem; letter-spacing: 0.02em;
  --rail-left: 0px; --rail-right: 0px;
  ${({ $model }) => {
    switch ($model) {
      case 'no-nav': return css`display: none;`;
      case 'vertical-index': case 'gutter-index': case 'stepper-left':
        return css`--rail-left: 76px; position: absolute; left: 0; top: 0; bottom: 0; width: 68px;
                   flex-direction: column; justify-content: center; padding: 0 0.5rem;
                   background: color-mix(in srgb, var(--obsidian, #0a0a0f) 72%, transparent);`;
      case 'side-rail': case 'split-rail': case 'progress-spine':
        return css`--rail-right: 84px; position: absolute; right: 0; top: 0; bottom: 0; width: 76px;
                   flex-direction: column; align-items: center; justify-content: center;
                   background: color-mix(in srgb, var(--primary, #002060) 60%, transparent);`;
      case 'horizon-bar': case 'command-strip': case 'sticky-minimal':
        return css`position: sticky; top: 0; padding: 0.5rem 1rem;
                   background: color-mix(in srgb, var(--obsidian, #0a0a0f) 82%, transparent);
                   backdrop-filter: blur(10px);`;
      case 'ticker-nav':
        return css`flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
                   &::-webkit-scrollbar { display: none; }`;
      case 'chapter-dots': case 'edge-tabs':
        return css`position: absolute; bottom: 0; left: 0; right: 0; justify-content: center;
                   padding: 0.4rem; background: color-mix(in srgb, var(--obsidian, #0a0a0f) 70%, transparent);`;
      case 'radial-hub': case 'orbital':
        return css`justify-content: center; flex-wrap: wrap; padding: 0.35rem 0;
                   border-block: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 25%, transparent);`;
      case 'floating-pill':
        return css`position: absolute; top: 1rem; left: 50%; transform: translateX(-50%);
                   padding: 0.35rem; border-radius: 9999px;
                   background: color-mix(in srgb, var(--primary, #002060) 75%, transparent);
                   backdrop-filter: blur(12px);`;
      case 'corner-anchor': case 'command-palette': case 'overlay-drawer':
        return css`position: absolute; top: 1rem; right: 1rem; justify-content: flex-end;`;
      case 'split-header':
        return css`justify-content: space-between; width: 100%; padding: 0.5rem 0;`;
      default: return css`padding: 0.5rem 0;`;
    }
  }}
  @media (max-width: 640px) {
    position: static; flex-direction: row; width: auto;
    justify-content: flex-start; flex-wrap: wrap; padding: 0.4rem 0;
  }
`;

// Content honours the rail reserve so a rail can never sit on the headline:
export const Content = styled.div`
  position: relative; z-index: 2; min-height: 100vh;
  display: flex; flex-direction: column; gap: 1.25rem;
  padding-block: clamp(1.25rem, 3vw, 3rem);
  padding-left: calc(clamp(1.25rem, 4vw, 4rem) + var(--rail-left, 0px));
  padding-right: calc(clamp(1.25rem, 4vw, 4rem) + var(--rail-right, 0px));
  @media (max-width: 640px) {
    padding-left: clamp(1rem, 4vw, 2rem); padding-right: clamp(1rem, 4vw, 2rem);
  }
`;

// WorldRoot establishes the container query every Headline sizes against:
export const WorldRoot = styled.section`
  position: relative; min-height: 100vh; width: 100%; overflow-x: clip;
  background: var(--bg-base, #030712); color: var(--text-primary, #e0ecf4);
  isolation: isolate; container-type: inline-size;
`;
export const Headline = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; line-height: 1.08;
  font-size: clamp(1.6rem, 5cqi, 3.4rem); max-width: 20ch; margin: 0 0 0.5rem; text-wrap: balance;
`;
```

```tsx
// WorldPage.tsx — the shared composition, abbreviated
export const WorldPage: React.FC<WorldPageProps> = ({ skeleton, builder, preview = true }) => {
  const hostRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const webgl = useMemo(() => hasWebGL(), []);
  const motion = resolveMotion(tier, prefersReduced, webgl);
  const build = useMemo<WorldBuilder>(
    () => builder ?? builderForMechanic(skeleton.hero_mechanics),
    [builder, skeleton.hero_mechanics],
  );
  const { live, lost, error, frames } = useThreeWorld(canvasRef, hostRef, motion, build);
  const copy = copyFor(skeleton.id);
  const labels = chapterLabels(skeleton.chapters);
  const suppressCue = skeleton.grid === 'horizontal-scroll' || motion === 'poster';
  const onActivate = useCallback((label: string) => { if (preview) return; void label; }, [preview]);

  return (
    <WorldRoot ref={hostRef} data-world-id={skeleton.id} data-nav-model={skeleton.nav_model}
      data-hero-mechanics={skeleton.hero_mechanics} data-grid={skeleton.grid}
      data-motion={motion} data-live={live ? 'yes' : 'no'} data-frames={frames}
      data-scene-error={error ?? ''} aria-label={`${skeleton.id} front page variant`}>
      <Poster $hidden={live} aria-hidden="true" />
      {motion === 'live' && <CanvasLayer ref={canvasRef} aria-hidden="true" data-world-canvas={skeleton.id} />}
      <Nav $model={skeleton.nav_model} aria-label="Variant navigation">
        {labels.slice(0, 6).map((label) => (
          <NavItem key={label} type="button" onClick={() => onActivate(label)}>{label}</NavItem>
        ))}
      </Nav>
      <Chapters aria-hidden="true">
        {labels.map((label, i) => <Chapter key={label} $grid={skeleton.grid} $i={i} />)}
      </Chapters>
      <Content>
        <Grid $grid={skeleton.grid}>
          <div>
            <SectionLabel $grid={skeleton.grid}>{labels[0]}</SectionLabel>
            <Headline>{copy.headline}</Headline>
            <Sub>{copy.sub}</Sub>
          </div>
          <ActionRow>
            {SHARED.ctas.map((cta) => (
              <Action key={cta.id} type="button" $intent={cta.intent} onClick={() => onActivate(cta.label)}>
                {cta.label}
              </Action>
            ))}
          </ActionRow>
          <ProofRow>
            {SHARED.proof.slice(0, 4).map((p) => (<li key={p.id}><b>{p.value}</b><span>{p.label}</span></li>))}
          </ProofRow>
        </Grid>
        {error && <StaticNote role="alert">Scene error — showing the static poster instead: {error}</StaticNote>}
        {!error && motion === 'poster' && (
          <StaticNote>
            {lost ? 'Static preview — the GPU context was lost twice, so this variant is shown as a still.'
                  : 'Static preview — motion is reduced or this device is on the essential tier.'}
          </StaticNote>
        )}
      </Content>
      <ScrollHint $hide={suppressCue}>Scroll<CueDot aria-hidden="true">↓</CueDot></ScrollHint>
    </WorldRoot>
  );
};
```

---

## 5. Output format

```
## VERDICT: APPROVE | REVISE | REJECT

## FIX VERDICTS
For each of FIX 1..7: CORRECT | INCOMPLETE | INTRODUCES A NEW DEFECT — with one line of why.

## FINDINGS (ranked by blast radius; NEW findings only)

### F1 — <title>            [DEFECT | UNSUPPORTED CLAIM | MISSING WORK]
Blast radius: ...
Evidence: <quote the source above, or state precisely what is absent>
Why it is wrong: ...
(repeat)

## ATTACK ON THE DISCLOSED LIMITATIONS (§3)
Which of the seven disclosures is actually acceptable, and which is the builder rationalising?
Be specific about #1 (8 scene families sold as 20 pages) and #3 (unlit spheres named "refract").

## [UNSURE]
Facts you would need repo access to check.
```

Three finished findings beat twenty plausible ones. An empty body is not an answer.
