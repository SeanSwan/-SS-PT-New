# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 89.0s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

# Architectural Review: Village Packet Design Ratification Plan

**Reviewer:** Senior React/TypeScript Architect
**Plan:** `VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md`
**Date:** 2026-07-16

---

## Preflight Assessment

This plan is a **design-language ratification document**, not a component implementation plan. It describes *which visual language to adopt* across surfaces, not *how to build components*. The architectural review must therefore operate at the level the plan actually specifies: token systems, surface contracts, motion licensing, and the structural risks that will propagate into implementation files.

Where the plan implies implementation decisions, those implications are reviewed directly. Where the plan is silent on implementation detail, that silence is itself flagged as a finding.

---

## Finding 1 — Token Architecture: No CSS Custom Property Contract Defined

**Severity:** 🔴 Critical
**Surface:** All surfaces (marketing trinity, four dashboards, store/photography/video/waiver)

### Issue

The plan names hex values directly throughout Section 2 (`#0A0A0F`, `#141419`, `#E0ECF4`, `#60C0F0`, `#8B5CF6`, `#C6A84B`, `#4070C0`) as "Crystalline Swan tokens" but never specifies the CSS custom property names those hexes map to. The 18-theme-swappable requirement means every consuming component must reference `var(--token, #fallback)` — but without a canonical token name list, every implementer will invent names independently (`--color-ground` vs `--bg-primary` vs `--surface-obsidian`), producing a token namespace collision the moment Track B (dashboards) begins.

The retired Galaxy-Swan ban (`#00FFFF`, `#7851A9`, `#0a0a1a`) is stated as a constraint but there is no lint rule, no ESLint plugin config, and no Stylelint pattern referenced to enforce it. A ban without enforcement is a comment, not a constraint.

### Recommended Fix

Before any Track A file is written, produce a `tokens.css` (or `tokens.ts` for styled-components `ThemeProvider`) that is the single source of truth:

```typescript
// tokens.ts — excerpt, must be exhaustive before Track A begins
export const crystallineSwan = {
  // Grounds
  '--color-ground':        '#0A0A0F',   // Obsidian Black
  '--color-card':          '#141419',   // Carbon
  '--color-surface':       '#1A1A24',   // Graphite

  // Brand primaries
  '--color-ice-wing':      '#60C0F0',
  '--color-arctic-cyan':   '#50A0F0',
  '--color-gilded-fern':   '#C6A84B',
  '--color-frost-white':   '#E0ECF4',
  '--color-swan-lavender': '#4070C0',
  '--color-wing-purple':   '#8B5CF6',

  // Semantic
  '--color-text-primary':  '#E0ECF4',
  '--color-glow-blue':     '#4070C0',   // blue bg → purple glow
  '--color-glow-purple':   '#8B5CF6',   // purple bg → cyan glow
} as const;
```

Add a Stylelint rule to the CI pipeline:

```json
// .stylelintrc — addition
{
  "rules": {
    "color-no-invalid-hex": true,
    "declaration-property-value-disallowed-list": {
      "color":            ["#00FFFF", "#7851A9", "#0a0a1a"],
      "background":       ["#00FFFF", "#7851A9", "#0a0a1a"],
      "background-color": ["#00FFFF", "#7851A9", "#0a0a1a"],
      "border-color":     ["#00FFFF", "#7851A9", "#0a0a1a"],
      "box-shadow":       ["/00FFFF/", "/7851A9/", "/0a0a1a/"]
    }
  }
}
```

---

## Finding 2 — Component Decomposition: "World" vs "Chrome" Layer Boundary Not Specified

**Severity:** 🔴 Critical
**Surface:** All three design language candidates; directly affects every layout component

### Issue

The plan's Palette Law A states: *"the world supplies SETTING only (atmosphere, background, media); ALL chrome stays on Crystalline Swan tokens."* This is architecturally the most important constraint in the document, but it is never translated into a component boundary.

Without an explicit boundary, implementers will build monolithic page components where atmosphere and chrome are co-located in the same styled-component, making theme-swapping require surgery on every file rather than a token swap. The Swan Deep Field candidate is most at risk: the star field, constellation, and Evidence Lens will be tempting to build as one `<HeroSection>` component, collapsing the world/chrome separation.

### Recommended Fix

Mandate a two-layer component architecture before any page component is scaffolded:

```
<WorldLayer />        ← atmosphere only: backgrounds, star fields, skyline, media
  <ChromeLayer />     ← ALL interactive chrome: buttons, cards, text, nav, badges
```

Each layer is a separate file. `WorldLayer` accepts no interaction props. `ChromeLayer` never sets a background color directly — it inherits ground from `WorldLayer` via CSS custom properties only. This boundary is testable: a snapshot test that asserts `ChromeLayer` contains zero `background-color` declarations with raw hex values.

```typescript
// WorldLayer.tsx — contract
interface WorldLayerProps {
  variant: 'deep-field' | 'chrome-sovereign' | 'faceted-sigil';
  children: React.ReactNode;
  // NO onClick, NO data props, NO business logic
}

// ChromeLayer.tsx — contract
interface ChromeLayerProps {
  children: React.ReactNode;
  // NO background props — inherits from CSS custom properties
}
```

---

## Finding 3 — Motion Licensing: No Implementation Contract for M0–M3 Tiers

**Severity:** 🔴 Critical
**Surface:** Marketing pages (M3), dashboards (M0–M3), store/waiver (frozen)

### Issue

The plan defines a motion licensing system (M0 = frozen, M3 = cinematic) and correctly identifies that data/money/legal lanes must never receive atmosphere interference. However, it provides no implementation contract for how a component *knows* which motion tier it is in. Without this, a developer building the admin finance section will make a judgment call, and that call will be wrong at least some of the time.

The trainer surface contract test is mentioned ("forbidding raw `rgba()`/`clamp()`/`transition:all`") but the test file location, test runner, and assertion pattern are not specified. A constraint that exists only in a prose document is not enforced.

### Recommended Fix

Define a `MotionTier` context and a `useMotionTier` hook before any animated component is written:

```typescript
// motion-tier.ts
export type MotionTier = 'M0' | 'M1' | 'M2' | 'M3';

export const SURFACE_MOTION_TIERS: Record<string, MotionTier> = {
  'store-checkout':    'M0',
  'waiver':           'M0',
  'admin-finance':    'M0',
  'admin-legal':      'M0',
  'dashboard-data':   'M1',
  'dashboard-ui':     'M2',
  'marketing':        'M3',
} as const;

// MotionTierContext.tsx
const MotionTierContext = React.createContext<MotionTier>('M1');

export const useMotionTier = () => React.useContext(MotionTierContext);

// Usage in any animated component:
const tier = useMotionTier();
const shouldAnimate = tier !== 'M0';
const isCinematic  = tier === 'M3';
```

The trainer surface test belongs in `__tests__/trainer-surface-contract.test.ts` and should use `@testing-library/jest-dom` to assert that no rendered styled-component output contains `transition: all` or raw `rgba(` in its computed styles.

---

## Finding 4 — State Management: Evidence Lens Is Stateful but Has No Data Contract

**Severity:** 🟠 High
**Surface:** Swan Deep Field candidate; marketing pages and dashboards

### Issue

The Evidence Lens ("circles exactly ONE real-proof number per screen") is a UI constraint with a data dependency: it must display a real logged-workout number, not an invented stat. The plan correctly states "no invented stats" and "charts come from real logged workouts." However, there is no specification for:

- Which API endpoint supplies the Evidence Lens number
- What happens during loading (skeleton? hidden? zero?)
- What happens when the data is zero (new platform, no workouts logged yet)
- Whether the number is user-scoped, trainer-scoped, or platform-aggregate

Without this, the Evidence Lens will either show a hardcoded number (violating data-truth) or show a loading spinner that breaks the "one badge allowed to mark proof" constraint.

### Recommended Fix

Define the Evidence Lens data contract in the plan before implementation begins:

```typescript
// evidence-lens.types.ts
interface EvidenceLensData {
  value: number;
  unit: string;           // "workouts logged", "lbs moved", "days active"
  scope: 'platform' | 'trainer' | 'user';
  isReal: true;           // discriminant — never allow synthetic data
  fetchedAt: string;      // ISO timestamp for staleness check
}

interface EvidenceLensState {
  data: EvidenceLensData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  // No 'invented' state — if error, show honest empty state
}
```

The honest empty state for zero workouts logged must be designed now, not deferred. A lens showing "0 workouts" on a marketing page is a conversion killer; the fallback should show a platform-aggregate number (total workouts across all users) with scope clearly labeled.

---

## Finding 5 — Data Flow: Steal-List Grafting Has No Merge Strategy

**Severity:** 🟠 High
**Surface:** All surfaces — affects every component that uses grafted elements

### Issue

Section 3, Question 3 asks for a "steal-list" of elements from losing languages to graft into the winner. This is architecturally sound as a design decision but creates a concrete implementation risk: grafted elements from different design languages will have conflicting component assumptions.

Specifically:
- **Floor-rail section nav** (Chrome Sovereign) assumes a vertical layout with warm gold lighting — its styled-component will have `background: linear-gradient(...)` baked in
- **Facet chrome** (Faceted Sigil) assumes sapphire grounds — its card components will have `background: var(--color-royal-depth, #003080)` as base
- **Evidence Lens** (Swan Deep Field) assumes true-black ground — its glow effects are tuned for `#0A0A0F` backgrounds

If these are grafted naively, the result is three sets of components with incompatible ground assumptions, all trying to render on the same page.

### Recommended Fix

The steal-list must be expressed as **token overrides**, not component copies. Each grafted element must be audited for ground assumptions and those assumptions must be extracted to CSS custom properties before grafting:

```typescript
// floor-rail.tokens.ts — Chrome Sovereign element, neutralized for grafting
const floorRailTokens = {
  '--floor-rail-bg':      'var(--color-card, #141419)',      // NOT warm gold
  '--floor-rail-accent':  'var(--color-gilded-fern, #C6A84B)', // gold preserved
  '--floor-rail-border':  'var(--color-swan-lavender, #4070C0)',
};
// The warm gold LIGHTING is a WorldLayer concern — ChromeLayer floor-rail
// receives only the accent color, never the atmospheric glow
```

---

## Finding 6 — File Budget: Three Design Language Candidates × Four Dashboards = 12 Artifacts With No Size Constraint

**Severity:** 🟠 High
**Surface:** Dashboard mocks (12 artifacts referenced in Section 1)

### Issue

The plan references "12 dashboard artifacts total" (3 languages × 4 dashboards). If these are implemented as single-file page components — which is the path of least resistance when building mocks — each will exceed 300 lines. A full dashboard mock with header, sidebar, data panels, charts, and action zones will reach 400–600 lines before any real data integration.

The plan does not specify whether these 12 artifacts are design mocks (Figma/static) or React components. If they are React components, the 300-line budget is violated before Track B begins.

### Recommended Fix

Enforce the following decomposition rule for every dashboard surface:

```
DashboardPage.tsx           ← orchestration only, <80 lines
├── DashboardHeader.tsx     ← nav, user identity, <100 lines
├── DashboardSidebar.tsx    ← section nav (floor-rail if grafted), <100 lines
├── DashboardMain.tsx       ← layout shell, <60 lines
│   ├── [Feature]Panel.tsx  ← one panel per domain, <200 lines each
│   └── [Feature]Chart.tsx  ← Victory chart wrapper, <150 lines each
└── DashboardFooter.tsx     ← optional, <60 lines
```

`DashboardPage.tsx` must contain zero styled-component definitions — it is a composition file only. Any styled-component in a page file is a budget warning.

---

## Finding 7 — Hook Design: "Function Preservation" Constraint Has No Hook Audit Plan

**Severity:** 🟠 High
**Surface:** Trainer dashboard, client dashboard (explicitly called out as "work well today")

### Issue

The plan states: *"This program reskins; it does not re-architect IA, tabs, or interaction contracts."* This is the correct constraint. However, a reskin that introduces new styled-components wrapping existing components will inevitably cause hook re-execution if the new wrapper components are not memoized correctly.

Specifically: if the trainer dashboard currently has a `useTrainerSchedule` hook at the page level, and the reskin wraps the page in a new `<WorldLayer variant="deep-field">`, that wrapper will cause the page to remount on variant changes unless `WorldLayer` is memoized and its children are stable references.

The plan provides no hook audit requirement before reskinning begins.

### Recommended Fix

Before Track B begins, produce a hook dependency map for each existing dashboard:

```typescript
// Required pre-reskin audit output for trainer dashboard:
// useTrainerSchedule     → depends on: userId, dateRange
// useClientRoster        → depends on: trainerId
// useWorkoutLog          → depends on: clientId, sessionId
// NO hook should depend on: theme variant, motion tier, WorldLayer props
```

Any hook that currently depends on a visual prop (color, animation state) must be refactored before the reskin begins — not during it. The reskin must be a pure styled-component swap with zero hook changes.

---

## Finding 8 — Error Boundaries: No Error Boundary Placement Specified

**Severity:** 🟠 High
**Surface:** All surfaces, but critical for dashboards and store

### Issue

The plan describes a complex multi-surface rollout (Track A → B → C) with real data dependencies (Victory charts from logged workouts, Evidence Lens from API, admin Signal Bar). There is no error boundary strategy specified anywhere in the plan.

The admin surface is particularly high-risk: it has a test-enforced section priority order (urgent human-waiting queues above passive charts). If the urgent queue component throws, the entire admin dashboard must not go blank — the finance and chart sections must still render, and the error must be surfaced in the urgent queue slot specifically.

### Recommended Fix

Mandate error boundary placement at the panel level, not the page level:

```typescript
// AdminDashboard.tsx — error boundary placement
<ErrorBoundary fallback={<UrgentQueueError />}>
  <UrgentHumanWaitingQueue />        {/* highest priority — isolated boundary */}
</ErrorBoundary>

<ErrorBoundary fallback={<ChartLoadError />}>
  <VictoryProgressCharts />          {/* isolated — chart failure ≠ page failure */}
</ErrorBoundary>

<ErrorBoundary fallback={<FinanceLoadError />}>
  <FinanceSection />                 {/* demoted

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
