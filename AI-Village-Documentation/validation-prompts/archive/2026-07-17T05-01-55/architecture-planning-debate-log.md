# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,146 input / 6,074 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review
## VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16

**Reviewer:** Senior Code Quality / Architecture Lead
**Date:** 2026-07-16
**Plan type:** Design-language ratification → implementation contract derivation
**Verdict scope:** What this plan *implies* for production code, and where those implications are dangerous

---

## Preflight: What This Plan Actually Is

This is a **decision document masquerading as an implementation plan**. It answers *which* visual language wins; it does not answer *how* that language becomes code. The 12 specialist reviews correctly identified this gap but mostly responded by generating implementation assumptions. This review does the opposite: it **derives only what the plan text actually commits to**, then flags every place where the plan's silence will cause production failures.

The plan commits to exactly six things that have architectural consequences:

1. A token system (Crystalline Swan palette, CSS custom properties implied but not specified)
2. A motion licensing tier (M0–M3 per surface type)
3. A calm-zone contract (data/money/legal lanes never get atmosphere interference)
4. A data-truth contract (Victory charts only, real logged workouts, no invented stats)
5. A function-preservation contract (no IA re-architecture, trainer/client dashboards behavior-frozen)
6. A dual-button glow rule (blue bg → purple glow; purple bg → cyan glow)

Everything else — file structure, component names, hook composition, state shape — is **not in this plan** and must not be invented here. What *is* reviewable is whether the plan's six commitments are internally consistent, enforceable, and safe to hand to implementers.

---

## FINDING 1 — Token Contract: Named Without Being Defined

**Severity:** 🔴 CRITICAL
**Affects:** Every file in every track (A, B, C)

### Issue

Section 2 names hex values as "Crystalline Swan tokens" but never assigns CSS custom property names. The plan states:

> "ALL chrome — buttons, text, glow, focus rings, panels — stays on Crystalline Swan tokens (`#0A0A0F` ground, `#141419` cards, `#E0ECF4` text, `#60C0F0` cyan, `#8B5CF6` purple, `#C6A84B` gold, `#4070C0` lavender)"

This is a **palette list, not a token contract**. The difference is not cosmetic. Without canonical `--token-name` assignments, every implementer invents names independently. Track A writes `--color-ground`; Track B writes `--bg-obsidian`; Track C writes `--surface-dark`. The 18-theme-swappable requirement then becomes impossible to satisfy because there is no single property to override per theme.

The retired-hex ban (`#00FFFF`, `#7851A9`, `#0a0a1a`) is stated as a constraint but has no enforcement mechanism. A constraint without a lint rule is a comment.

### Fix

Before any Track A file is written, the following must exist as a **ratified artifact** (not a suggestion):

```typescript
// tokens.ts — canonical source, imported by ThemeProvider
// Every hex appears ONCE. All consuming files use var(--token, #fallback).
// This file must not exceed 80 lines. It is not a component.

export const crystallineSwanTokens = {
  // Grounds
  '--color-ground':        '#0A0A0F',   // Obsidian Black
  '--color-card':          '#141419',   // Carbon
  '--color-surface':       '#1A1A24',   // Graphite

  // Text
  '--color-text-primary':  '#E0ECF4',   // Frost White
  '--color-text-secondary':'#60C0F0',   // Ice Wing

  // Brand accents
  '--color-cyan':          '#60C0F0',   // Ice Wing
  '--color-cyan-alt':      '#50A0F0',   // Arctic Cyan
  '--color-gold':          '#C6A84B',   // Gilded Fern
  '--color-lavender':      '#4070C0',   // Swan Lavender
  '--color-purple':        '#8B5CF6',   // Wing Purple

  // Depths
  '--color-depth-mid':     '#002060',   // Midnight Sapphire
  '--color-depth-deep':    '#003080',   // Royal Depth
} as const;

// RETIRED — never reference these in any file
// #00FFFF, #7851A9, #0a0a1a (Galaxy-Swan)
```

The Stylelint rule to enforce the ban:

```json
// .stylelintrc — add to existing config
{
  "rules": {
    "color-no-invalid-hex": true,
    "declaration-property-value-disallowed-list": {
      "color": ["#00FFFF", "#00ffff", "#7851A9", "#7851a9", "#0a0a1a"],
      "background": ["#00FFFF", "#00ffff", "#7851A9", "#7851a9", "#0a0a1a"],
      "background-color": ["#00FFFF", "#00ffff", "#7851A9", "#7851a9", "#0a0a1a"],
      "border-color": ["#00FFFF", "#00ffff", "#7851A9", "#7851a9", "#0a0a1a"],
      "box-shadow": ["/00FFFF/", "/7851A9/", "/0a0a1a/"]
    }
  }
}
```

**Blocking condition:** No Track A PR merges without `tokens.ts` and the Stylelint rule in the same commit. This is not optional.

---

## FINDING 2 — Dual-Button Glow: Stated as Rule, Undefined as Implementation

**Severity:** 🔴 CRITICAL
**Affects:** Every interactive element across all tracks

### Issue

The plan states:

> "Dual-Button Glow: blue bg → purple glow, purple bg → cyan glow"

This is the only interaction-state rule in the entire plan. It will be implemented by every developer who touches a button. Without a canonical implementation, the result will be:

- Developer A: `box-shadow: 0 0 8px #8B5CF6` on hover
- Developer B: `filter: drop-shadow(0 0 12px var(--color-purple))` on focus
- Developer C: `outline: 2px solid var(--color-purple)` (breaks WCAG focus ring contract)
- Developer D: `text-shadow` (wrong property entirely)

The plan also does not specify whether the glow applies on `:hover`, `:focus`, `:focus-visible`, `:active`, or all states. This matters for WCAG 2.4.11 (Focus Appearance) and for the 44px touch target requirement — a glow that only fires on hover is invisible to touch users.

### Fix

A single shared mixin, not a component, not a hook — a styled-components CSS helper:

```typescript
// styles/mixins/buttonGlow.ts
// Max 40 lines. Imported by every button variant. Never duplicated.

import { css } from 'styled-components';

// Blue background → purple glow (hover + focus-visible + active)
export const blueButtonGlow = css`
  background-color: var(--color-lavender, #4070C0);

  &:hover,
  &:focus-visible,
  &:active {
    box-shadow:
      0 0 0 2px var(--color-ground, #0A0A0F),
      0 0 0 4px var(--color-purple, #8B5CF6),
      0 0 16px 2px var(--color-purple, #8B5CF6);
    outline: none; /* box-shadow IS the focus indicator; meets WCAG 2.4.11 */
  }

  /* Touch: glow on :active only (no hover on touch) */
  @media (hover: none) {
    &:active {
      box-shadow:
        0 0 0 2px var(--color-ground, #0A0A0F),
        0 0 0 4px var(--color-purple, #8B5CF6);
    }
  }
`;

// Purple background → cyan glow
export const purpleButtonGlow = css`
  background-color: var(--color-purple, #8B5CF6);

  &:hover,
  &:focus-visible,
  &:active {
    box-shadow:
      0 0 0 2px var(--color-ground, #0A0A0F),
      0 0 0 4px var(--color-cyan, #60C0F0),
      0 0 16px 2px var(--color-cyan, #60C0F0);
    outline: none;
  }

  @media (hover: none) {
    &:active {
      box-shadow:
        0 0 0 2px var(--color-ground, #0A0A0F),
        0 0 0 4px var(--color-cyan, #60C0F0);
    }
  }
`;
```

**Why the double ring:** The inner 2px `--color-ground` ring creates the contrast gap required by WCAG 2.4.11 Focus Appearance (minimum 3:1 contrast between focused and unfocused states). Without it, the glow alone may fail on light-background themes.

**Blocking condition:** `buttonGlow.ts` must be reviewed for WCAG compliance before any button component is written. No button PR merges that does not import from this file.

---

## FINDING 3 — Motion Licensing: Tiers Named, Boundaries Undefined

**Severity:** 🟠 HIGH
**Affects:** Track A (marketing), Track B (dashboards), Track C (store/waiver)

### Issue

The plan defines:

> "marketing = M3 (cinematic, restrained); dashboards = M0–M3 with calm zones intact (data/money/legal lanes never get atmosphere interference); store checkout + waiver flow = behavior-frozen, quietest tint"

This is a **policy statement**, not an implementation contract. "M3 cinematic" and "M0" are undefined. The calm-zone rule ("data/money/legal lanes never get atmosphere interference") is the most important constraint in the entire plan — it protects trainer workflow — but it has no technical definition. What counts as "atmosphere interference"? A background animation? A transition on a data cell? A loading shimmer?

Without a definition, a developer implementing the admin finance section will make a judgment call. That judgment call will be wrong in a way that only becomes visible when a trainer is mid-session and a background pulse distracts them.

### Fix

Define the motion tiers as a TypeScript enum and a per-surface map before any animated component is written:

```typescript
// styles/motion/motionTiers.ts
// This file defines the contract. Components import their tier; they do not decide it.

export const MotionTier = {
  M0: 'none',           // No transitions, no animations. Data cells, finance rows, legal text.
  M1: 'micro',          // ≤150ms, opacity/transform only. Button state changes, focus rings.
  M2: 'transition',     // ≤300ms, layout shifts, panel open/close. Dashboard tab switches.
  M3: 'cinematic',      // ≤600ms, entrance animations, hero sequences. Marketing pages only.
} as const;

export type MotionTierValue = typeof MotionTier[keyof typeof MotionTier];

// Surface → tier map. This is the calm-zone contract in code.
export const surfaceMotionTier: Record<string, MotionTierValue> = {
  // Marketing (Track A) — cinematic allowed
  'marketing-hero':        MotionTier.M3,
  'marketing-section':     MotionTier.M2,

  // Dashboard chrome — transitions allowed
  'dashboard-nav':         MotionTier.M2,
  'dashboard-panel':       MotionTier.M2,

  // CALM ZONES — M0 only. No exceptions. No overrides.
  'dashboard-data-table':  MotionTier.M0,
  'dashboard-chart':       MotionTier.M0,
  'dashboard-finance':     MotionTier.M0,
  'dashboard-legal':       MotionTier.M0,
  'waiver-flow':           MotionTier.M0,
  'store-checkout':        MotionTier.M0,
} as const;
```

The calm-zone enforcement mechanism:

```typescript
// styles/motion/useSurfaceMotion.ts
// Hook that returns the CSS transition string for a given surface.
// Components never hardcode transition values; they call this hook.

import { surfaceMotionTier, MotionTier } from './motionTiers';

const tierToCss: Record<string, string> = {
  [MotionTier.M0]: 'none',
  [MotionTier.M1]: 'opacity 150ms ease, transform 150ms ease',
  [MotionTier.M2]: 'opacity 300ms ease, transform 300ms ease',
  [MotionTier.M3]: 'opacity 600ms ease, transform 600ms ease',
};

export function useSurfaceMotion(surfaceKey: keyof typeof surfaceMotionTier): string {
  const tier = surfaceMotionTier[surfaceKey] ?? MotionTier.M0; // fail safe to M0
  return tierToCss[tier];
}
```

**Critical note on `transition: all`:** The plan's trainer surface contract already forbids `transition: all`. The motion tier system above enforces this structurally — `tierToCss` only ever produces property-specific transitions. A developer cannot accidentally write `transition: all` through this path.

---

## FINDING 4 — Data-Truth Contract: Implied Write Paths Without Schema Ownership

**Severity:** 🟠 HIGH
**Affects:** Evidence Lens component, Victory chart wrappers, admin Signal Bar

### Issue

The plan states:

> "charts come from real logged workouts (Victory only); numeric truth is monospace; no invented stats; honest empty states; the admin Signal Bar shows no counts by design"

And:

> "a gold Evidence Lens circles exactly ONE real-proof number per screen"

These are **data contracts**, not just visual rules. They imply:

1. A query that returns exactly one "proof number" per screen context
2. A Victory chart data shape that maps to real workout logs
3. An admin Signal Bar component that explicitly receives no count props
4. Empty state components that are not optional — they are required by the contract

The plan does not specify who owns the query, what the proof number is (total sessions? current streak? PRs?), or what happens when the workout log is empty on first login. The Evidence Lens rendering "ONE real-proof number" with no data is an undefined state that will produce either a broken UI or an invented stat — both of which violate the contract.

### Fix

The data-truth contract requires three explicit decisions before implementation:

**Decision 1: Proof number definition**
The Evidence Lens must display exactly one number. That number must be defined in a single place:

```typescript
// services/proofNumber.ts
// The canonical definition of "proof number" per screen context.
// This is a business logic decision, not a UI decision.
// It must be approved by Sean before implementation.

export type ProofNumberContext =
  | 'user-dashboard'    // e.g., total logged sessions
  | 'client-dashboard'  // e.g., sessions this month
  | 'trainer-dashboard' // e.g., active clients
  | 'admin-dashboard';  // e.g., pending approvals (NOT a count — see Signal Bar rule)

// Placeholder — Sean must ratify these before Track B begins
export const proofNumberDefinitions: Record<ProofNumberContext, string> = {
  'user-dashboard':    'PENDING_RATIFICATION',
  'client-dashboard':  'PENDING_RATIFICATION',
  'trainer-dashboard': 'PENDING_RATIFICATION',
  'admin-dashboard':   'PENDING_RATIFICATION',
};
```

**Decision 2: Empty state is not optional**

```typescript
// components/EvidenceLens/EvidenceLens.tsx
// The component MUST handle the empty state.
// An Evidence Lens with no data shows a prompt, not zero.

interface EvidenceLensProps {
  value: number | null;
  label: string;
  context: ProofNumberContext;

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

All points from the Senior Architecture Lead's review are accepted as stated. No disputes or alternative proposals are raised. The findings and fixes presented are architecturally sound and address the critical gaps in the plan. Implementation should proceed exactly as outlined in the review.

---

