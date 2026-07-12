# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 86.9s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

# Architectural Review: PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-07-12
**Scope:** Architectural soundness review per the seven lenses requested, cross-validated against the Binding Amendment (Sean, 2026-07-12).

---

## PRELIMINARY VERDICT

This plan is a **vision document and orchestration prompt**, not a component-level implementation spec. That is appropriate for its stated purpose (producing six agent-executable plan packs). However, it contains enough implied architecture to audit meaningfully — and several of those implied decisions carry real production risk. The review below flags what the plan *assumes* architecturally, where those assumptions are unsound, and what each plan pack **must** specify to prevent subordinate agents from drifting into dangerous patterns.

---

## AMENDMENT COMPLIANCE CHECK

| Amendment Clause | Plan Compliance | Risk |
|---|---|---|
| Workout core ships FIRST | §9 Run Order step 5 correctly sequences B-pack P0 items 1–2 first | ✅ Compliant |
| Non-primary workstreams are PLAN PACKS only, not built | §3/§6/§7/§7b all say "produce pack, don't build" | ✅ Compliant |
| F-pack built STRICTLY AFTER workout core is client-usable | §7b sequencing law states this explicitly | ✅ Compliant |
| Solo AI-assisted dev feasibility | Several workstreams (§6 Agent Gateway, §7 Swan World) carry scope that will overwhelm a solo dev even at plan-pack stage — flagged below | ⚠️ Partial |

---

## FINDING 1 — Component Decomposition

### 1a. `LensPlanFrame` as the sole recipe→DOM boundary

**Severity:** 🔴 HIGH
**Affected:** §3 Workstream A, §4 Workstream B (all P0 surfaces)
**Issue:** The plan mandates `LensPlanFrame` as the ONLY recipe→DOM boundary across every converted surface. This is architecturally correct in principle, but the plan does not specify whether `LensPlanFrame` is a *layout* boundary, a *style injection* boundary, or both. If subordinate agents treat it as a layout component (wrapping structural DOM), it will balloon past 300 lines immediately when applied to surfaces as complex as the Workout Logger or Plan Library. The plan also does not distinguish between `LensPlanFrame` (the boundary) and `LensPrimitives` (the token consumers) — agents will conflate them.

**Recommended Fix:** The A-pack component blueprint (§3e) **must** specify:
```
LensPlanFrame       — style-injection only, zero layout DOM, <50 lines
LensPrimitives/     — one file per primitive (Button, Card, Input, etc.)
  SwanButton.tsx    — consumes lens tokens, no business logic, <80 lines
  SwanCard.tsx
  SwanInput.tsx
  ...
```
The boundary law must be stated as: *"LensPlanFrame injects CSS custom properties into a single `<div data-lens-frame>` wrapper. It renders `{children}` unchanged. It never owns layout."* This prevents the 300-line violation and prevents layout coupling.

---

### 1b. Swan Coach chat surface (§5)

**Severity:** 🔴 HIGH
**Affected:** §5 Workstream C — Coach home placement
**Issue:** The plan describes a single "persistent chat with full conversation history, resumable threads, voice-first, TTS, inline charts, custom chart builder, dashboard pin." This is **five distinct component responsibilities** described as one surface. No decomposition is proposed. A subordinate agent will build a 600–900 line monolith.

**Recommended Fix:** The C-pack **must** mandate this decomposition:

```
CoachShell.tsx          — layout + presence state subscription only (<120 lines)
CoachTranscript.tsx     — virtualized message list, no data fetching (<150 lines)
CoachMessageBubble.tsx  — single message renderer, SafeChart slot (<100 lines)
CoachInputBar.tsx       — voice/text input, 44px targets, no business logic (<120 lines)
CoachVoiceController.tsx — Aurora presence state machine, TTS only (<150 lines)
useCoachSession.ts      — data fetching: thread load, send, history (<120 lines)
useCoachVoice.ts        — Web Speech API + TTS state, no fetch (<100 lines)
useCustomChartBuilder.ts — chart proposal state machine (<100 lines)
SafeChartInChat.tsx     — error-boundary-wrapped Victory chart for bubbles (<80 lines)
```

---

### 1c. Custom Chart Builder (§5)

**Severity:** 🟡 MEDIUM
**Affected:** §5 — "clients CREATE custom charts conversationally"
**Issue:** The plan describes a conversational builder that (a) proposes charts, (b) saves them, (c) pins them to the dashboard as first-class cards, (d) respects Chart Charter data-truth invariants, (e) is entitlement-gated, (f) is data-scoped per Rule 8. This is a **separate feature** from the Coach chat, not a chat sub-feature. Treating it as a chat sub-feature will cause the Coach surface to own dashboard state it has no business owning.

**Recommended Fix:** Custom chart builder is a **separate route-level feature** that the Coach *triggers* via a navigation event or modal handoff. The C-pack must specify:
```
/custom-charts/builder  — standalone route
CustomChartBuilderPage.tsx
useCustomChartSchema.ts — sources: canonical chart endpoints + goals + wearables
DashboardPinCard.tsx    — the pinned card component (lives in dashboard, not coach)
```
Coach emits a `PROPOSE_CHART` event; the builder route handles it. Dashboard owns the pinned cards. Coach owns nothing outside its transcript.

---

## FINDING 2 — State Management

### 2a. Coach session state vs. dashboard pin state

**Severity:** 🔴 HIGH
**Affected:** §5 Coach + dashboard surfaces
**Issue:** The plan implies Coach conversation state and dashboard pin state are coupled ("client saves → pinned to their dashboard as a first-class card"). If both live in the same context or store slice, a Coach re-render will trigger dashboard re-renders and vice versa. The plan provides no state boundary.

**Recommended Fix:** C-pack must specify two independent store slices (or contexts):
```typescript
// Separate slices — never cross-import
CoachSessionContext   — thread ID, messages[], voice state, cost meter
DashboardPinsContext  — pinnedCharts[], loading, error
```
Coach dispatches a `pinChart(chartSpec)` action to `DashboardPinsContext` via a service call. It never reads from `DashboardPinsContext`. This is a **write-only relationship** from Coach's perspective.

---

### 2b. Lens state vs. component state on converted surfaces

**Severity:** 🟡 MEDIUM
**Affected:** §4 Workstream B — all P0 surface conversions
**Issue:** The plan mandates `lens2-*` hooks on every converted surface. The plan does not specify whether lens state is read via context, prop, or hook at the leaf level. If each converted surface calls `useLens()` independently, a lens change will trigger re-renders across every mounted surface simultaneously — a cascade that will freeze the UI on low-end P1 phones.

**Recommended Fix:** B-pack must specify:
- Lens state lives in ONE top-level context (`LensContext`) — already implied by the existing architecture but must be made explicit.
- Converted surfaces consume lens tokens via CSS custom properties **only** (already the law per CLAUDE.md). They do NOT call `useLens()` directly.
- Only `LensPlanFrame` subscribes to `LensContext`. All children are pure CSS consumers.
- This means a lens change triggers **one** React re-render (the frame) + a CSS variable swap. Zero cascade.

---

### 2c. Agent Gateway auth state (§6)

**Severity:** 🟡 MEDIUM
**Affected:** §6 Workstream D — Swan Agent Gateway
**Issue:** The plan describes per-user agent API keys, scoped grants, rate limits, and audit trails. It does not specify where agent auth state lives relative to the existing user auth state. If agent sessions share the same auth context as human sessions, a compromised agent key could escalate to human-session privileges.

**Recommended Fix:** D-pack must mandate a **separate auth context** for agent sessions:
```typescript
AgentSessionContext — agentKeyId, scopedGrants[], rateLimit, auditLog
// Never merged with UserAuthContext
// AgentSessionContext is read-only from the frontend perspective
// All writes go through the T0–T4 bridge doctrine (already exists)
```

---

## FINDING 3 — Data Flow

### 3a. Workout Logger → Planner → Schedule: stale-state risk

**Severity:** 🔴 HIGH
**Affected:** §4 P0 items 1–4 (Workout Logger, Planner, Schedule, Client Progress)
**Issue:** The plan treats these four surfaces as independent conversion targets. But they share a data dependency chain: a logged workout updates the planner's completion state, which updates the schedule's display, which updates the client progress charts. The plan does not specify cache invalidation strategy across these surfaces. A workout logged in surface 1 will not appear in surface 4 until a full page reload unless invalidation is explicit.

**Recommended Fix:** B-pack must specify a **canonical invalidation map**:
```
POST /workouts/log
  → invalidate: ['workouts', userId]
  → invalidate: ['planCompletion', planId]
  → invalidate: ['schedule', userId, weekOf]
  → invalidate: ['clientProgress', userId]
```
This map must be implemented as a single `useWorkoutMutations` hook that handles all four invalidations atomically. React Query (or equivalent) `invalidateQueries` calls must be batched in one `onSuccess` callback — not spread across four separate mutation hooks.

---

### 3b. Coach inline charts: race condition risk

**Severity:** 🔴 HIGH
**Affected:** §5 — "Coach can render live charts inline in the transcript"
**Issue:** If a user sends a message and the Coach responds with a chart proposal while the chart data is still loading, the transcript will render a `SafeChartInChat` with undefined data. The plan does not specify the loading/error states for inline charts. This is a guaranteed race condition on slow connections (P1 phones on 4G).

**Recommended Fix:** C-pack must specify the inline chart data flow:
```
1. Coach message arrives with chartSpec (not data)
2. SafeChartInChat mounts → triggers useChartData(chartSpec.query)
3. Loading state: skeleton placeholder (44px min height, lens-aware)
4. Error state: "Chart unavailable" with retry — wrapped in ErrorBoundary
5. Success state: Victory chart renders
6. chartSpec is immutable once in transcript (no re-fetch on re-render)
   → achieved via useMemo([chartSpec.id]) on the query key
```

---

### 3c. Wearables data as enrichment, not source of truth (§6)

**Severity:** 🟡 MEDIUM
**Affected:** §6 Wearables + §7 Swan World E2 (Real-Life Mirror)
**Issue:** The plan correctly states wearables are "ENRICHMENT, never source of truth." But the Swan World E2 feature ("avatar body/energy reflects real logged workouts, nutrition, Fitbit data") creates a data flow where wearables data directly drives avatar state. If Fitbit OAuth token expires or the sync fails, the avatar will either freeze or show stale state. The plan does not specify the fallback.

**Recommended Fix:** E-pack must specify:
```
AvatarStateResolver priority order:
  1. Logged workout data (canonical, always present)
  2. Wearables enrichment (optional, additive only)
  3. Fallback: last-known-good avatar state (never degrade to zero)

Wearables sync failure → avatar shows logged-data-only state
  → UI indicator: "Fitbit sync paused" (not an error, not punitive)
```

---

## FINDING 4 — React Patterns

### 4a. Missing `React.memo` specification for high-frequency surfaces

**Severity:** 🟡 MEDIUM
**Affected:** §5 CoachTranscript, §4 Workout Logger
**Issue:** The plan does not specify memoization strategy for the Coach transcript (which will re-render on every new message) or the Workout Logger (which will re-render on every set/rep input). On P1 phones, an unmemoized transcript with 50+ messages containing inline Victory charts will cause visible jank.

**Recommended Fix:** C-pack and B-pack must specify:
```typescript
// CoachMessageBubble — memo because transcript maps over it
const CoachMessageBubble = React.memo(({ message }: Props) => { ... },
  (prev, next) => prev.message.id === next.message.id
  // Custom comparator: only re-render if message ID changes
  // (messages are immutable once in transcript)
);

// WorkoutSetRow — memo because logger maps over it
const WorkoutSetRow = React.memo(({ set }: Props) => { ... },
  (prev, next) => prev.set.id === next.set.id && prev.set.status === next.set.status
);
```

---

### 4b. `useMemo` missing for Victory chart theme computation

**Severity:** 🟡 MEDIUM
**Affected:** §4 P0 item 6 — Client Progress charts, `chartTheme.ts` Victory bridge
**Issue:** The plan references `chartTheme.ts` victoryTheme as the Victory bridge seam. If `victoryTheme` is recomputed on every render (e.g., because it reads from a lens context that changes), every chart on the progress page will remount. Victory charts are expensive to mount.

**Recommended Fix:** B-pack must specify:
```typescript
// In chartTheme.ts
export function useVictoryTheme() {
  const lensTokens = useLensTokens(); // stable reference from LensContext
  return useMemo(
    () => buildVictoryTheme(lensTokens),
    [lensTokens.colorPrimary, lensTokens.colorAccent] // only the tokens charts use
  );
}
// NOT: const theme = buildVictoryTheme(useLensTokens()) — recomputes every render
```

---

### 4c. Voice controller re-render risk

**Severity:** 🟡 MEDIUM
**Affected:** §5 — Aurora presence states (idle/listening/thinking/speaking)
**Issue:** The plan references Aurora presence states driven by "real state." If presence state updates (e.g., from `idle` to `listening`) are stored in the same context as Coach message state, every presence tick will re-render the entire transcript. This is a known pattern failure with voice UIs.

**Recommended Fix:** C-pack must specify presence state in a **separate, isolated context**:
```typescript
AuroraPresenceContext — presenceState: 'idle'|'listening'|'thinking'|'speaking'
// Subscribed to ONLY by: CoachVoiceController, the presence indicator UI
// NOT subscribed to by: CoachTranscript, CoachInputBar
// Presence changes → zero transcript re-renders
```

---

## FINDING 5 — File Budget (300-line ceiling)

### Projected violations:

| File (implied by plan) | Projected Lines | Risk | Fix |
|---|---|---|---|
| `CoachShell.tsx` (if not decomposed per Finding 1b) | 600–900 | 🔴 CERTAIN | Decompose per Finding 1b |
| `WorkoutLoggerPage.tsx` (P0 item 1, complex form + lens conversion) | 400–500 | 🔴 HIGH | Split: `WorkoutLoggerPage` (routing/layout) + `WorkoutLoggerForm` (form logic) + `ExerciseSetList` (set rows) |
| `PlanLibraryPage.tsx` (P0 item 2, admin + planner merged surface) | 500–600 | 🔴 HIGH | Split: `PlanLibraryPage` (layout) + `PlanLibraryGrid` (catalog) + `PlanEditorPanel` (edit form) + `PlanLibraryFilters` (filter bar) |
| `SwanAgentGateway.ts` (backend, but if mirrored as a frontend

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
