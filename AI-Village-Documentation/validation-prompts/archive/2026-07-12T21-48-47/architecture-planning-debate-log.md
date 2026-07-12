# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 16,756 input / 6,645 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review — Jarvis Swan OS Super Prompt v1.0
## Round 1: Component Decomposition · State · Hooks · Performance · File Budget · Shared Paths · Error Boundaries

**Reviewer:** Senior Code Quality / Architecture Lead
**Date:** 2026-07-12
**Plan:** PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
**Scope:** Derived strictly from plan content. No assumed features.

---

## EXECUTIVE SUMMARY

The plan is architecturally coherent at the vision level but contains **eleven specific implementation risks** that will cause production failures if left unaddressed in the plan packs. The most dangerous cluster is the **state duplication trap** across the Coach/Chart/Dashboard triad, the **LensPlanFrame boundary ambiguity** that will cause subordinate agents to fork components incorrectly, and the **missing single-service-path discipline** for the AI-automation shared write surface. Every finding below maps to a specific plan section and carries a concrete fix that must be written into the relevant plan pack before any agent executes.

---

## FINDING 1 — 🔴 CRITICAL
### `LensPlanFrame` Boundary Ambiguity Will Cause Component Forks

**Affected:** §3 Workstream A, §4 Workstream B (all P0 surfaces)
**Plan text:** *"LensPlanFrame (the ONLY recipe→DOM boundary)"* and *"capability manifest per surface + LensPlanFrame/LensPrimitives, NEVER component forks"*

**Issue:**
The plan correctly mandates `LensPlanFrame` as the sole recipe→DOM boundary but never specifies whether it is a *layout* boundary, a *style-injection* boundary, or both. Subordinate agents executing B-pack will face this ambiguity on the very first surface (Workout Logger) and will resolve it differently — one agent wraps the entire route, another wraps individual cards, a third wraps form rows. The result is three incompatible component shapes that all technically comply with the letter of the law while violating its spirit. The "NEVER component forks" rule becomes unenforceable without a precise contract.

**Fix — must be written into A-pack before B-pack executes:**

```typescript
// A-pack must specify this contract exactly.
// LensPlanFrame is BOTH boundaries simultaneously:
//   1. Style-injection boundary: injects recipe CSS tokens onto a
//      scoped DOM node (never on :root — scoped only).
//   2. Layout boundary: provides the grid/spacing primitives that
//      recipe tokens can override.
// It is NOT a route wrapper. It is NOT a card wrapper.
// It wraps the CONTENT REGION of a surface — one per mounted route,
// never nested.

interface LensPlanFrameProps {
  recipeId: string;           // from capability manifest
  surfaceId: string;          // canonical name (see naming table §4)
  children: React.ReactNode;
  // NO layout props — layout is recipe-controlled via tokens
}

// FORBIDDEN patterns (must appear in A-pack DoD forbidden-choices list):
// ❌ <LensPlanFrame> inside a map() — never per-row
// ❌ Nested <LensPlanFrame> — one per route, hard stop
// ❌ Passing theme props into children — use var(--token, #fallback) only
// ❌ Reading recipeId from component-local state — always from manifest
```

**File budget note:** The `LensPlanFrame` contract file must stay under 300 lines. Split as:
- `LensPlanFrame.tsx` — component + prop types (≤150 lines)
- `LensPlanFrame.styles.ts` — styled-components only (≤100 lines)
- `LensPlanFrame.contract.ts` — exported interface + JSDoc forbidden list (≤50 lines)

---

## FINDING 2 — 🔴 CRITICAL
### Custom Chart State Lives in Three Places Simultaneously

**Affected:** §5 Workstream C — Custom Chart Builder + Dashboard Pin + Coach Chat
**Plan text:** *"Coach proposes → client saves → pinned to their dashboard as a first-class card"* and *"SafeChart inside chat bubbles"*

**Issue:**
The plan describes a chart that exists in three distinct state locations with no single source of truth specified:
1. **Ephemeral** — inside the Coach chat transcript (rendered in a bubble)
2. **Proposed** — after Coach generates it, before client saves (pending state)
3. **Persisted** — pinned to dashboard as a first-class card

Without an explicit state machine, subordinate agents will create three separate data shapes — one in the chat message store, one in a local `useState` for the proposal UI, one in the dashboard card store — with no reconciliation path. When a client unpins a chart, the chat bubble will still show it as "saved." When the Coach references a previously saved chart, it will not know whether the dashboard version has been modified.

**Fix — C-pack must specify this state machine:**

```typescript
// ONE canonical shape. One source of truth: the backend.
// Frontend holds only derived/cached views.

type CustomChartStatus =
  | 'ephemeral'    // in chat only, not yet proposed
  | 'proposed'     // Coach has generated, awaiting client confirm
  | 'saved'        // persisted to DB, pinned to dashboard
  | 'unpinned';    // saved but removed from dashboard (still in history)

interface CustomChart {
  id: string;                    // uuid, assigned at 'proposed' stage
  status: CustomChartStatus;
  ownerId: string;               // Rule 8 — scoped to client only
  spec: ChartSpec;               // canonical chart definition
  createdAt: string;
  pinnedAt: string | null;
  // NO duplicate fields between chat and dashboard shapes
}

// State ownership:
// - Chat transcript: holds chart.id reference only, never full spec
// - Dashboard: queries /charts?status=saved — no local copy
// - Coach context: reads from same endpoint, never from chat state

// Hook separation (must be in C-pack):
// useCoachChat()      — message stream, ephemeral chart refs only
// useCustomCharts()   — CRUD against /api/charts, single source
// useDashboardPins()  — derived from useCustomCharts(), filter saved
// NEVER: useDashboardPins() fetching independently from /api/dashboard/charts
```

---

## FINDING 3 — 🔴 CRITICAL
### Shared Write Path: Coach AI and Human UI Must Use One Service Layer

**Affected:** §5 Workstream C, §6 Workstream D (Agent Gateway)
**Plan text:** *"T1 draft proposals (log-workout draft, plan suggestions) — ALL writes stay review-gated"* and *"Coach can render live charts inline"*

**Issue:**
The plan describes two surfaces that can trigger the same writes — a human clicking "Save Chart" in the Coach UI, and an AI agent submitting a T1 draft proposal via the Agent Gateway. If B-pack and C-pack agents implement these independently, the result is two parallel API families:
- `POST /api/coach/charts/save` (built by C-pack agent)
- `POST /api/agent/proposals/chart` (built by D-pack agent)

Both write to the same `custom_charts` table. Neither knows about the other. The review-gate logic is duplicated and will diverge. The audit trail splits. This is the most common production failure pattern in multi-agent plan execution.

**Fix — one service path, enforced at the plan-pack level:**

```
SHARED WRITE PATH LAW (must appear verbatim in C-pack, D-pack, and B-pack DoDs):

ALL writes to workout, chart, plan, and schedule data — regardless of
whether the initiator is a human UI action or an AI/agent proposal —
MUST route through ONE backend service layer:

  Human UI → POST /api/workouts/...
  Coach AI  → POST /api/workouts/...   (same endpoint, role=coach header)
  Agent T1  → POST /api/workouts/...   (same endpoint, agent JWT, pending flag)

The endpoint itself enforces:
  - ownership scope (Rule 8)
  - review-gate status (pending | confirmed | rejected)
  - audit trail entry
  - rate limit (per-user, per-role)

FORBIDDEN:
  ❌ /api/coach/* endpoints that bypass /api/workouts/* validation
  ❌ /api/agent/* write endpoints that duplicate /api/workouts/* logic
  ❌ Any write that does not produce an audit_log row
```

---

## FINDING 4 — 🔴 CRITICAL
### Workout Logger File Budget Will Explode on First Conversion

**Affected:** §4 Workstream B — P0 item 1 (Workout Logger)
**Plan text:** *"Workout Logger (client + trainer log-workout paths)"* as a single P0 item

**Issue:**
The Workout Logger is described as a single surface but contains at minimum: set logging rows, exercise selection, rest timer, volume calculations, history comparison, and the lens-aware capability manifest. A single-agent implementation will produce one file exceeding 300 lines within the first hour of execution. The plan provides no decomposition guidance, so the agent will make arbitrary splits that other agents cannot predict or extend.

**Fix — B-pack must specify this decomposition before any agent touches the file:**

```
WorkoutLogger/
├── WorkoutLogger.tsx              # route entry, LensPlanFrame wrapper (≤120 lines)
├── WorkoutLogger.manifest.ts      # capability manifest, recipe tokens (≤80 lines)
├── WorkoutLogger.styles.ts        # styled-components, var(--token,#fallback) only (≤150 lines)
├── components/
│   ├── SetRow.tsx                 # single set: reps/weight/rpe inputs (≤150 lines)
│   ├── SetRow.styles.ts           (≤80 lines)
│   ├── ExerciseBlock.tsx          # groups SetRows for one exercise (≤120 lines)
│   ├── RestTimer.tsx              # isolated timer, no workout state (≤100 lines)
│   ├── VolumeBar.tsx              # derived display only, memo'd (≤80 lines)
│   └── LoggerToolbar.tsx          # save/discard/voice controls (≤100 lines)
├── hooks/
│   ├── useWorkoutSession.ts       # session CRUD, single source of truth (≤200 lines)
│   ├── useSetLogger.ts            # optimistic set mutations (≤150 lines)
│   └── useRestTimer.ts            # timer state, isolated (≤80 lines)
└── __tests__/
    └── WorkoutLogger.test.tsx     (≤200 lines)

HARD RULE for B-pack DoD:
No file in WorkoutLogger/ may exceed 300 lines.
useWorkoutSession.ts is the ONLY hook that calls the workout API.
SetRow.tsx must never import from ExerciseBlock.tsx (sibling isolation).
```

---

## FINDING 5 — 🟠 HIGH
### Capability Manifest Shape Is Undefined — Agents Will Invent Incompatible Schemas

**Affected:** §4 Workstream B (all P0 surfaces), §3 Workstream A
**Plan text:** *"capability manifest per surface"* repeated seven times across P0 list

**Issue:**
The plan mandates a capability manifest for every surface but never defines its schema. Seven P0 surfaces will each get a manifest written by potentially different agent executions. Without a locked schema, the manifests will be structurally incompatible — some will use arrays, some objects, some will include layout hints, some will not. The lens registry will be unable to validate them uniformly.

**Fix — A-pack must export this schema as a TypeScript interface before B-pack runs:**

```typescript
// A-pack deliverable: capability-manifest.schema.ts
// Max 80 lines. This file is the contract for all B-pack manifests.

interface SurfaceCapabilityManifest {
  surfaceId: string;           // from canonical names table (§4 naming streamline)
  recipeId: string;            // must exist in lens registry
  lensVersion: 'v1' | 'v2';
  tokens: {
    // only tokens this surface READS — no tokens it doesn't use
    [cssCustomProperty: string]: string; // fallback hex value
  };
  touchTargets: {
    // every interactive element, verified ≥44px
    elementId: string;
    minHeightPx: number;       // must be ≥44
  }[];
  a11y: {
    contrastChecked: boolean;
    wcagLevel: 'AA' | 'AAA';
  };
  tapCountReceipt: {
    primaryJobDescription: string;
    tapsBefore: number;
    tapsAfter: number;
  };
}

// FORBIDDEN manifest fields (must be in A-pack forbidden-choices list):
// ❌ layout: any         — layout is recipe-controlled, not manifest-controlled
// ❌ colors: string[]    — use tokens only, never raw hex in manifest
// ❌ version: number     — use lensVersion union, not a free number
```

---

## FINDING 6 — 🟠 HIGH
### Hook Nesting Depth: `useCoachState` Will Become a God Hook

**Affected:** §5 Workstream C — Swan Coach "Jarvis"
**Plan text:** Voice-first, TTS replies, Aurora presence states, persistent chat, custom chart builder, cost guardrails, per-user token budgets — all described as Coach responsibilities

**Issue:**
Every Coach feature described in §5 will naturally gravitate into a single `useCoachState` hook because they all share the concept of "the Coach session." This is the most predictable failure mode in complex feature hooks. The hook will exceed 300 lines, contain mixed concerns (UI state + data fetching + business logic + cost accounting), and become impossible to test in isolation.

**Fix — C-pack must specify this hook decomposition with explicit concern boundaries:**

```typescript
// C-pack must specify these hooks as separate files with hard boundaries:

// useCoachSession.ts (≤200 lines)
// Concern: session lifecycle only
// - session ID, start/resume/end
// - Aurora presence state (idle/listening/thinking/speaking)
// - NO message content, NO chart data
// Calls: POST /api/coach/sessions

// useCoachMessages.ts (≤200 lines)
// Concern: message stream only
// - send message, receive stream chunks
// - message history (IDs + display text only)
// - chart ref IDs embedded in messages (never full chart spec)
// Calls: POST /api/coach/messages (streaming)
// Depends on: useCoachSession (session ID only — no other state)

// useCoachCost.ts (≤150 lines)
// Concern: token budget only
// - current month usage, soft warning threshold, hard stop flag
// - NO message content
// Calls: GET /api/coach/usage
// Renders: warning banner when >80% budget consumed

// useVoiceInput.ts (≤150 lines)
// Concern: Web Speech API wrapper only
// - listening state, transcript, error
// - NO Coach-specific logic — generic voice input
// Depends on: nothing Coach-specific

// FORBIDDEN in any Coach hook:
// ❌ Importing from another Coach hook except useCoachSession for sessionId
// ❌ Direct Victory chart imports — use SafeChart wrapper only
// ❌ Stripe or billing logic — delegate to existing grant system
```

---

## FINDING 7 — 🟠 HIGH
### Naming Streamline Is a P0 Gate But Has No Enforcement Mechanism

**Affected:** §4 Workstream B — P0 side-quests bundled with item #2
**Plan text:** *"produce ONE canonical-names table... apply across all three dashboards + routes + tests"*

**Issue:**
The naming streamline is correctly identified as mandatory but the plan provides no enforcement mechanism. A subordinate agent will produce the canonical names table as a markdown document, then a different agent will implement routes using slightly different names (e.g., `workout-planner` vs `workoutPlanner` vs `plan-library`), and the table will immediately drift from reality. This is not a documentation problem — it is a runtime routing problem.

**Fix — B-pack must specify a machine-readable names registry:**

```typescript
// B-pack deliverable: canonical-surface-names.ts
// This file is the single source of truth for ALL surface names.
// Routes, nav labels, test IDs, and aria-labels derive from this file.
// Max 100 lines.

export const SURFACE

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

All findings and fixes from the Senior Architecture Lead's Round 1 are accepted as specified. No modifications or alternatives are required. The agreed-upon items are:

1. **LensPlanFrame Boundary Ambiguity**: Implement the exact contract (props, forbidden patterns) and file split (`LensPlanFrame.tsx`, `LensPlanFrame.styles.ts`, `LensPlanFrame.contract.ts`) as detailed.
2. **Custom Chart State**: Adopt the state machine (`CustomChartStatus`, `CustomChart` interface) and hook separation (`useCoachChat`, `useCustomCharts`, `useDashboardPins`) with single-source-of-truth enforcement.
3. **Shared Write Path**: Enforce the "SHARED WRITE PATH LAW" across all packs, routing all writes through `/api/workouts/...` with role-based headers and pending flags.
4. **Workout Logger File Budget**: Implement the specified folder structure, file limits (e.g., `WorkoutLogger.tsx` ≤120 lines, `useWorkoutSession.ts` ≤200 lines), and hard rules (no nested `LensPlanFrame`, session hook as sole API caller).
5. **Capability Manifest Schema**: Export `SurfaceCapabilityManifest` interface in `capability-manifest.schema.ts` (≤80 lines) with forbidden fields (layout, raw colors, free version numbers).
6. **Coach Hook Decomposition**: Split `useCoachState` into `useCoachSession` (≤200 lines), `useCoachMessages` (≤200 lines), `useCoachCost` (≤150 lines), and `useVoiceInput` (≤150 lines) with strict import boundaries.
7. **Naming Streamline Enforcement**: Implement `canonical-surface-names.ts` (≤100 lines) as the machine-readable single source of truth for routes, test IDs, and aria-labels.

---

