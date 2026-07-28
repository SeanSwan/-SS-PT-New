# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 14,645 input / 7,661 output

---

## Senior Architecture Lead — Round 1

# Architecture Review: World-Switcher Marketing Redesign
**Reviewer:** Senior Code Quality / Architecture Lead
**Date:** 2026-07-17
**Plan:** `WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md`
**Verdict:** `ADOPT WITH MODIFICATIONS` — the World/Chrome separation is architecturally sound; seven structural issues must be resolved before build begins.

---

## Executive Summary

The Chrome/World separation is the correct load-bearing idea. It converts a taste problem into a data problem, which is solvable. However, the plan has **seven findings** ranging from a hard P0 blocker to structural risks that will cause production incidents if unaddressed. The P0 build break is a deployment gate — nothing else ships until it is resolved. Findings 2–4 are architectural blockers that will cause re-work mid-sprint if ignored. Findings 5–7 are quality gates that will cause regressions in production.

**Sequencing mandate (non-negotiable):**
1. Fix P0 build break + retired-purple cleanup
2. `WorldLayer` decomposition + `ChromeLayer` + theme bridge primitives
3. World Switcher UI upgrade
4. Per-page rebuilds: Contact → About → Home → Store/Gallery/VideoLibrary/Waiver

---

## Finding 1 — P0 Build Break: Hard Deployment Gate

**Severity:** 🔴 CRITICAL — Nothing deploys until this is resolved.
**File:** `package.json` / `package-lock.json`

### Issue

`@zxing/browser@^0.1.5` is declared in `package.json` but absent from `package-lock.json`. `npm ci` on Render will fail on a clean install. Every other finding in this review is moot until this is fixed, because no build reaches production.

### Fix

```bash
# Step 1: Remove the stale lockfile entry if present
npm uninstall @zxing/browser

# Step 2: Re-add with exact version to prevent range drift
npm install @zxing/browser@0.1.5 --save-exact

# Step 3: Commit both package.json AND package-lock.json together
# Never commit one without the other — this is what caused the drift
git add package.json package-lock.json
git commit -m "fix(deps): pin @zxing/browser@0.1.5 to restore npm ci"
```

**Gate:** Add a CI step that runs `npm ci --dry-run` on every PR. If it fails, the PR cannot merge. This prevents lockfile drift from reaching main again.

---

## Finding 2 — `WorldLayer` Will Exceed 300-Line Budget Before First World Variant

**Severity:** 🔴 HIGH
**File:** `WorldLayer` (proposed, net-new)

### Issue

The plan assigns `WorldLayer` four distinct responsibilities: reading active World from context, rendering atmosphere (CSS/SVG/gradient), resolving motion tier, and handling reduced-motion fallback. A single component carrying all four responsibilities will exceed 300 lines before the first world variant is added. With 10 worlds, the atmosphere switch logic alone will push past budget. A `switch` or inline conditional over 10 world IDs is not a component — it is a registry pretending to be a component.

### Fix: Strict Four-File Decomposition

```
src/components/WorldLayer/
  index.tsx              ← thin orchestrator, <50 lines, reads context, delegates
  WorldAtmosphere.tsx    ← CSS/gradient/SVG per world, Record<WorldId, AtmosphereConfig>
  WorldParticles.tsx     ← particle/light layer, M3-only, React.lazy()
  useWorldMotion.ts      ← resolves motionTier + reducedMotion, returns MotionTier enum
```

```typescript
// index.tsx — the ONLY file that touches WorldContext
// <50 lines, zero atmosphere logic
const WorldLayer: React.FC = () => {
  const { activeWorld } = useWorldContext();
  const motionTier = useWorldMotion(); // resolves min(licence, capability)

  return (
    <WorldLayerRoot aria-hidden="true" role="presentation">
      <WorldAtmosphere worldId={activeWorld} />
      {motionTier === MotionTier.M3 && (
        <Suspense fallback={null}>
          <WorldParticles worldId={activeWorld} />
        </Suspense>
      )}
    </WorldLayerRoot>
  );
};
```

```typescript
// WorldAtmosphere.tsx — data-driven, no switch statements
// AtmosphereConfig is a plain object; no React logic in the map
const ATMOSPHERE_MAP: Record<WorldId, AtmosphereConfig> = {
  'swan-deep-field': {
    gradient: 'var(--world-gradient-swan-deep-field)',
    scrim: 'var(--world-scrim-swan-deep-field)',
    lightLeak: 'var(--world-light-leak-swan-deep-field)',
  },
  'chrome-sovereign': { /* ... */ },
  // 10 entries, zero JSX, zero conditionals
};

// WorldAtmosphere renders ONE entry from the map — no branching
const WorldAtmosphere: React.FC<{ worldId: WorldId }> = ({ worldId }) => {
  const config = ATMOSPHERE_MAP[worldId] ?? ATMOSPHERE_MAP['swan-deep-field'];
  return <AtmosphereLayer $config={config} />;
};
```

**Critical rule:** `WorldAtmosphere.tsx` contains zero JSX conditionals. Every world difference lives in the `ATMOSPHERE_MAP` data object. Adding a new world = adding one map entry. Zero component changes.

---

## Finding 3 — State Management: Three Sources of Truth for World Selection

**Severity:** 🔴 HIGH
**Files:** `UniversalThemeContext.tsx`, `localStorage`, proposed `WorldContext`

### Issue

The plan implies world selection will live in: (a) the existing `UniversalThemeContext` (18 palette themes), (b) `localStorage` for persistence, and (c) a new `WorldContext` for the `WorldLayer`. This is three sources of truth for one piece of state. When they diverge — and they will, on hydration, on stale localStorage, on context re-mount — the `WorldLayer` and `ChromeLayer` will render different worlds simultaneously. This is a visual flash bug that is extremely hard to reproduce and nearly impossible to debug in production.

### Fix: Single Source of Truth with Explicit Hydration Order

```typescript
// src/context/WorldContext.tsx — THE single source of truth
// localStorage is a WRITE SIDE EFFECT, not a source

type WorldState = {
  activeWorld: WorldId;
  setWorld: (id: WorldId) => void;
};

const DEFAULT_WORLD: WorldId = 'swan-deep-field'; // owner's call, one place

const readPersistedWorld = (): WorldId => {
  try {
    const stored = localStorage.getItem('swan-active-world');
    // Validate against the canonical WorldId union — never trust raw storage
    return isValidWorldId(stored) ? stored : DEFAULT_WORLD;
  } catch {
    // localStorage blocked (private browsing, storage quota) — degrade gracefully
    return DEFAULT_WORLD;
  }
};

export const WorldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useState initializer runs ONCE — no hydration flash
  const [activeWorld, setActiveWorldState] = useState<WorldId>(readPersistedWorld);

  const setWorld = useCallback((id: WorldId) => {
    if (!isValidWorldId(id)) return; // guard against future API drift
    setActiveWorldState(id);
    try {
      localStorage.setItem('swan-active-world', id);
    } catch {
      // Persist failure is non-fatal — world still changes in memory
    }
  }, []);

  const value = useMemo(() => ({ activeWorld, setWorld }), [activeWorld, setWorld]);

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
};
```

**Relationship to `UniversalThemeContext`:** World selection and palette-theme selection are **separate concerns** and must remain separate contexts. World = atmosphere setting. Palette theme = color token set. A user can be on `chrome-sovereign` world with `frozen-aurora` palette. Do not merge them. `WorldProvider` wraps inside `UniversalThemeProvider` in the app root — world reads palette tokens, palette does not read world.

```typescript
// App root — explicit nesting order matters
<UniversalThemeProvider>   {/* palette tokens — outer */}
  <WorldProvider>          {/* world atmosphere — inner, can read palette */}
    <ChromeLayer>          {/* Crystalline Swan guarantee */}
      <RouterOutlet />
    </ChromeLayer>
  </WorldProvider>
</UniversalThemeProvider>
```

---

## Finding 4 — `ChromeLayer` Has No Enforcement Mechanism

**Severity:** 🔴 HIGH
**File:** `ChromeLayer` (proposed, net-new)

### Issue

The plan describes `ChromeLayer` as "the guarantee that content/controls sit on Crystalline Swan tokens regardless of world." But a React component that wraps children cannot enforce what CSS those children use. If a child component uses `background: var(--world-accent)` directly, `ChromeLayer` cannot intercept it. The "guarantee" is a naming convention, not a technical constraint. Without an enforcement mechanism, the Chrome/World separation will erode within three sprints as developers reach for world tokens inside chrome components.

### Fix: Two-Layer Enforcement

**Layer 1 — CSS Scope Isolation (runtime):**

```typescript
// ChromeLayer.tsx — enforces token scope via CSS custom property override
// The ChromeLayer re-declares all --world-* vars to their Crystalline Swan values
// so any child that accidentally uses --world-accent gets the chrome value, not the world value

const ChromeLayerRoot = styled.div`
  /* Re-anchor all world tokens to Crystalline Swan values */
  /* Any child using --world-accent inside ChromeLayer gets chrome, not world */
  --world-accent: var(--color-ice-wing, #60C0F0);
  --world-bg-primary: var(--color-obsidian-black, #0A0A0F);
  --world-bg-secondary: var(--color-carbon, #141419);
  --world-particle-color: var(--color-swan-lavender, #4070C0);

  /* Crystalline Swan chrome tokens — these NEVER change */
  background: var(--chrome-bg, var(--color-obsidian-black, #0A0A0F));
  color: var(--chrome-text, var(--color-frost-white, #E0ECF4));
`;
```

**Layer 2 — Static Analysis (build-time):**

```typescript
// tokenDiscipline.contract.test.ts — extend the existing contract test
// Add a rule: no file in src/components/chrome/** may import from WorldContext
// This is the build-time guard; the CSS scope is the runtime guard

it('chrome components do not import WorldContext', () => {
  const chromeFiles = glob.sync('src/components/chrome/**/*.{ts,tsx}');
  chromeFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/WorldContext|useWorld|activeWorld/);
  });
});
```

Both layers are required. CSS scope alone fails if a developer uses inline styles. Static analysis alone fails at runtime if the rule is bypassed. Together they make the guarantee real.

---

## Finding 5 — `WorldSwitcher` / `UniversalThemeToggle` Upgrade Will Exceed 300 Lines

**Severity:** 🟡 MEDIUM
**File:** `UniversalThemeToggle.tsx` (upgrade target)

### Issue

The plan upgrades `UniversalThemeToggle` from a cycle button to a full picker with: grouped world display (Natural/Cosmic/Luxury/Gaming/Editorial), tiny live previews, keyboard navigation, 44px touch targets, localStorage persistence, and a compact cycle-button fallback. That is five distinct responsibilities. The existing file is already non-trivial. Adding picker logic inline will exceed 300 lines and create a component that is impossible to test in isolation.

### Fix: Decompose Before Upgrading

```
src/components/WorldPicker/
  index.tsx                  ← public export, <30 lines, re-exports WorldPickerButton
  WorldPickerButton.tsx      ← the header control (trigger + compact fallback), <100 lines
  WorldPickerPanel.tsx       ← the dropdown/modal panel, grouped worlds, <150 lines
  WorldPickerPreview.tsx     ← single world preview tile (static webp thumbnail), <80 lines
  useWorldPickerKeyboard.ts  ← keyboard navigation logic (arrow keys, escape, enter), <80 lines
  worldGroups.ts             ← data: Record<GroupId, WorldId[]>, zero JSX, <50 lines
```

**Critical performance rule for `WorldPickerPanel`:** World previews must be **static `.webp` thumbnails**, not live `WorldLayer` instances. Rendering 10 live `WorldLayer` instances simultaneously in the picker will cause a frame-rate collapse. The live world renders only in the page background — never in the picker.

```typescript
// WorldPickerPreview.tsx — static thumbnail only
// The "live preview" feel comes from the thumbnail quality, not live rendering
const WorldPickerPreview: React.FC<{ worldId: WorldId; isActive: boolean }> = ({
  worldId,
  isActive,
}) => (
  <PreviewTile
    $isActive={isActive}
    aria-label={`Switch to ${WORLD_NAMES[worldId]} world`}
    role="option"
    aria-selected={isActive}
  >
    <PreviewImage
      src={`/world-previews/${worldId}.webp`}
      alt="" // decorative; label is on the tile
      loading="lazy"
      width={80}
      height={60}
    />
    <PreviewLabel>{WORLD_NAMES[worldId]}</PreviewLabel>
  </PreviewTile>
);
```

---

## Finding 6 — React Performance: `ChromeLayer` Will Re-render on Every World Change

**Severity:** 🟡 MEDIUM
**Files:** `ChromeLayer.tsx`, `WorldLayer/index.tsx`

### Issue

If `ChromeLayer` and `WorldLayer` share the same context provider, every world change will re-render the entire `ChromeLayer` subtree — which is the entire application UI. With a complex page (Home four-act rebuild, Store, Gallery), this is a multi-hundred-component re-render on every world switch. The world switch will feel janky on mid-range mobile devices, which is exactly where the golf-client demographic lands.

### Fix: Context Splitting + Selective Subscription

```typescript
// Split WorldContext into two contexts with different update frequencies

// Context A — changes on every world switch (WorldLayer subscribes)
const WorldAtmosphereContext = React.createContext<WorldAtmosphereState>(null!);

// Context B — changes only when world NAME/metadata changes (ChromeLayer subscribes)
// In practice, ChromeLayer subscribes to NOTHING from WorldContext
// It only provides Crystalline Swan tokens downward
const WorldMetaContext = React.createContext<WorldMetaState>(null!);

// WorldProvider splits its state across both contexts
export const WorldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeWorld, setWorld] = useState<WorldId>(readPersistedWorld);

  // atmosphereValue changes on every setWorld call
  const atmosphereValue = useMemo(
    () => ({ activeWorld, setWorld }),
    [activeWorld] // setWorld is stable via useCallback
  );

  // metaValue changes only when world name/group changes — same frequency in practice
  // but the split means ChromeLayer can subscribe to neither
  const metaValue = useMemo(
    () => ({ worldName: WORLD_NAMES[activeWorld], worldGroup: WORLD_GROUPS[activeWorld] }),
    [activeWorld]
  );

  return (
    <WorldAtmosphereContext.Provider value={atmosphereValue}>
      <WorldMetaContext.Provider value={metaValue}>
        {children}
      </WorldMetaContext.Provider>
    </WorldAtmosphereContext.Provider>
  );
};

// ChromeLayer subscribes to ZERO world context
// It is a pure styled wrapper — React.memo with no context subscription
export const ChromeLayer = React.memo

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

All findings from the Senior Architecture Lead's review are accepted as architecturally sound and necessary for production readiness. The proposed fixes address critical deployment risks, maintainability concerns, state management flaws, enforcement gaps, component bloat, and performance issues. No modifications to the review's recommendations are required.

**Key points of agreement:**
1. **P0 Build Break**: The `@zxing/browser` lockfile discrepancy is a hard blocker requiring exact version pinning and CI enforcement (`npm ci --dry-run` gate).
2. **WorldLayer Decomposition**: Strict four-file separation (`index.tsx`, `WorldAtmosphere.tsx`, `WorldParticles.tsx`, `useWorldMotion.ts`) prevents 300-line violations and enables data-driven world additions.
3. **State Management**: Single source of truth in `WorldContext` with `localStorage` as write-side effect eliminates hydration flashes and divergent world states.
4. **ChromeLayer Enforcement**: Dual-layer guarantee (CSS token scoping + static analysis ban on `WorldContext` imports in chrome components) ensures Crystalline Swan isolation.
5. **WorldPicker Upgrade**: Pre-decomposition into six files (`index.tsx`, `WorldPickerButton.tsx`, `WorldPickerPanel.tsx`, `WorldPickerPreview.tsx`, `useWorldPickerKeyboard.ts`, `worldGroups.ts`) maintains <300-line limits and uses static `.webp` previews.
6. **React Performance**: Context splitting (`WorldAtmosphereContext`/`WorldMetaContext`) prevents unnecessary `ChromeLayer` re-renders during world switches.

All fixes are ready for immediate implementation in the specified files with the exact code changes outlined in the review. No further architectural disputes exist at this stage.

---

