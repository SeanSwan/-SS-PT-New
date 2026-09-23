---
decision: Swan Coach is one brain behind one workspace, local-first and privacy-first; client-bound turns never go to a cloud model without Sean's per-provider sign-off
status: open
supersedes: none (amends PART-C D1, D2, D3 in place — see §6)
---

# 10 — Local-first hive brain, "the one and only", and the lens/schedule findings

Added 2026-09-22 after Sean's direction: *connect the Command Center to the Universal
Master Schedule; keep it in sync with the header Swan Theme Lens; audit the three coach
copies and make the one and only; the coach is a hive brain in every component, driven
by the AI harness so other AIs or a local AI can be the brain; everything local-first
and privacy-first.*

Tense discipline (rule 75): **Built** = in `coach/brain-v4` now, with the proof named.
**Planned** = designed here, not built.

---

## 1. The one and only — what exists, what stays, what goes

### 1a. Lineages (the "three copies")

| Lineage | What it is | Verdict | Evidence |
|---|---|---|---|
| `origin/main` | Production | **Base** | `53f93854b` |
| Coach branch (`codex/swan-coach-astra-owned-20260906` + vs-claude R7 closure) | Where the coach was actually hardened (durable approval store, plan-55 admission, P58 planner) | **Canonical coach lineage.** Merged with main as `coach/brain-v4` (`114de2c34`, 163 ahead / 0 behind main) | Built — merge commit lists every conflict resolution |
| Fork (`creator-brains-engine-r2-20260915`) | Forked 2026-06-28, 2,510 behind main | **Frozen for coach paths. Not merged.** Its unique assets are ported by slice | Planned — see 1c |

### 1b. Surfaces (rule 27 classification, after this slice)

| Surface | Class | Evidence | Action |
|---|---|---|---|
| `coach-workspace/CoachWorkspacePage.tsx` (v4) | **canonical** | `UniversalDashboardLayout.routes.tsx` :109/:211/:238 → `CoachSurfaceRoute` → default branch | Built |
| `coach-assistant/CoachCommandCenterPage.tsx` | **legacy** (flag fallback) | Renders only with `VITE_COACH_WORKSPACE_V4=false` or `?coachLegacy=1` (`coachWorkspaceFlag.ts`) | Keep 14 days after the default flip, then a delete PR (rule 77 tier 2, Sean approves) |
| `coach-assistant/SwanCoachAssistantPage.tsx` + 12 split tests | **dormant/dead** | Not routed; `CoachCommandCenterRouteMount.test.ts` asserts no route mounts it | Propose `archive/pending-deletion/2026-10-xx/` with MANIFEST (rule 77 tier 2, Sean approves) |
| The fork's `CoachCommandCenterPage.tsx` / `useAIChat.ts` | **competing (other lineage)** | Blob hashes differ across all three lineages | Frozen; never edited again for coach work |

One brain: both pages drive the **same** controller (`useCoachCommandCenterController`),
the same send path (`CoachCommandCenter.submit.ts`), the same plan-55 admission binding,
and the same approval sheet. There is no second brain to drift.

### 1c. Worth keeping from the fork (planned, port by slice, never a merge)

- Freestyle trio (`CoachFreestyleOverlay.tsx`, `useFreestyleSession.ts`, `useFreestyleSpeech.ts`) → P6 voice, behind its own flag.
- `coachInferenceBoundary.mjs` and the `95e7c436c` lesson ("stop the guard refusing real traffic") → P1 privacy boundary, re-derived against the coach branch, with the fork's tests as the RED set.

---

## 2. Local-first, privacy-first brain routing (planned — the harness contract)

### 2a. Privacy classes (every turn is tagged before any model sees it)

| Class | Contains | May go to |
|---|---|---|
| **P0 general** | No client, no person (e.g. "explain RPE") | Any enabled brain |
| **P1 de-identified** | Client **IDs** only, names stripped by the privacy proxy (rule 8) | Brains Sean marked zero-retention (D3) |
| **P2 client-bound** | Health, pain, injury, notes, audio, anything identifying | **Local brain only**, unless Sean signs off a specific provider for P2 (D3) |
| **P3 secrets** | Keys, tokens, payment data | Never leaves the server; refused at the boundary |

The class is computed on the server from the assembled context (not from the UI), so a
page cannot downgrade it.

### 2b. Brain adapter shape (one interface for cloud and local)

```ts
type BrainAdapter = {
  id: string;                    // 'anthropic:claude-…', 'openai:…', 'local:ollama:qwen3-32b@sean-desktop'
  kind: 'cloud' | 'local';
  retention: 'none' | 'zero' | 'standard';   // 'none' = local
  maxClass: 'P0' | 'P1' | 'P2';               // highest class it may receive
  capabilities: { tools: boolean; stream: boolean; json: boolean; vision: boolean };
  health(): Promise<{ ok: boolean; latencyMs: number }>;
  turn(req: BrainTurn, signal: AbortSignal): AsyncIterable<BrainEvent>;
};
```

Router rule: pick the best healthy adapter whose `maxClass ≥ turn.class`. If none is
healthy for a P2 turn, the coach says **"Your local brain is offline — this turn needs it
because it includes client health data"** and offers to queue it. It never silently falls
back to cloud (that fallback is the privacy failure this whole section exists to prevent).

### 2c. How a hosted app reaches a local model

Render cannot call into Sean's machine, and it should not be able to. The planned
topology is an **outbound relay**:

```
Sean's machine                                   Render (SwanStudios)
┌─────────────────────────┐   outbound WSS     ┌──────────────────────────┐
│ swan-local-brain relay  │ ─────────────────▶ │ /api/coach/brains/relay  │
│  • signs in with a      │  (device key,      │  • registers adapter     │
│    device-scoped key    │   rotating token)  │    local:<model>@<device>│
│  • runs Ollama/LM Studio│ ◀── turn jobs ──── │  • brainRouter sends P2  │
│  • streams tokens back  │ ─── tokens ──────▶ │    turns here first      │
└─────────────────────────┘                    └──────────────────────────┘
```

- No inbound port on the home network; the relay dials out. Kill switch: revoke the device key.
- The relay only ever sees turns for accounts it is bound to (Sean's org), enforced server-side.
- Evals (P2b leaderboard) run the same prompts through local and cloud adapters, so the routing table is learned from data, not asserted.
- Honest cost: the machine must be awake; the relay is a new component with its own threat model (device key theft, replay). It goes through the Rule 46 Kimi gate before any P2 traffic.

### 2d. What the UI shows (built part + planned part)

- **Built:** the header status chip is truthful about admission (`Connecting`, `Not connected`, `Needs your choice`, `Thinking`, `Ready`) — it never says Ready while sends would be refused (`WorkspaceHeader.brainState`, 3 tests).
- **Planned:** the chip names the brain that answered and its privacy class per turn ("Local · Qwen3 · P2"), and the inspector gets a Brain card to pick the default brain per class.

---

## 3. Hive brain in every component (planned)

- **One entry everywhere:** a global "Ask Swan Coach" (⌘K + a floating button) on every dashboard page opens the workspace as a right sheet (`?coach=open`), with the same controller.
- **"What I'm looking at" context by ID:** pages register surface context through the existing `useCoachSurfaceContext` (route, selected client ID, visible record IDs). The coach receives IDs, never names (rule 8).
- **Unify the docks:** `ScheduleAiOperatorDock` and the per-page coach docks become one `CoachDock` that renders the workspace composer + transcript — one copy of the input, one send path.

---

## 4. Swan Style Lens — sync status and proposed enhancements

**Built and proven (`coach-workspace-smoke.spec.ts`, 12/12):** the header lens changes the
workspace **layout** (not only colours) through `coachWorkspaceLayout.ts`:
operator-grid (default), atrium-split, editorial-column, playfield-stack — every one of the
27 registered lenses has a deliberate assignment (a new lens fails `coachWorkspaceLayout.test.ts`
until assigned). The header **theme changer** repaints the workspace live (e2e sets
`--bg-elevated` on `:root` and the composer's computed colour follows). Density
(`--lens-density-scale`), motion (`html[data-motion-mode]`), panel radius, canvas and
navigation edge are all read.

Findings for the lens system itself (not changed here — site-wide blast radius, Sean decides):

| # | Finding | Evidence | Proposal |
|---|---|---|---|
| L1 | The 23 v2 world recipes are **unreachable from the header picker** | `recipeResolution.ts` keys on recipe ids (`swan.candy-glass-arcade.v2`); the picker commits v1 ids (`candy-glass-arcade`) → always null in production | Map v1 id → v2 recipe, opt-in per surface behind a flag, so a lens can actually repaint Logger/Planner/Schedule/Coach |
| L2 | Default `--world-*` are **literals**, so any surface reading `var(--world-bg)` ignores the theme changer | `worldDefaults.ts` `--world-bg: #0a0a0f` under every `SurfaceLensGate` | Make the defaults `var(--bg-base, #0a0a0f)` etc. (the workspace already avoids this by reading world vars only under `[data-lens2-plan]`) |
| L3 | `layoutSignature` exists on all 27 manifests but no surface used it | `manifests/*.ts` | Promote a `layoutTemplate` field into `manifestFactory` so every surface reads one answer (the coach map is the seed) |
| L4 | Legacy global CSS fights every new surface on phones | `styles/responsive-fixes.css:127-135` (`form button { width:100% !important }`), `responsive-polish.css:298` | Retire both rules, or scope them to legacy pages; the workspace defends itself today |
| L5 | Fixed app header overlaps dashboard pages on desktop | `[data-swan-app-header]` ends at 64px; `UniversalMainContent` desktop padding is 24px | Give the main a `padding-top: var(--header-height)` at desktop; the workspace measures and clears it today (`useWorkspacePanels.useFitTop`) |

---

## 5. Universal Master Schedule — connection (built) and findings (for the later audit)

**Built:** the inspector's Today card reads the **same source** as the Master Schedule
(`universalMasterScheduleService.getSessions` → `GET /api/sessions`, server RBAC), drops
open slots, re-reads on the schedule's own `dashboardDataSync` event and on tab focus, shows
a waiver-gated state by name and never renders a failure as an empty day. Each session has
an "Ask Swan Coach" button that scopes the chat by client **ID** and pre-writes a prep
question by **time** (e2e asserts the name never enters the prompt). Deep links go to
`/dashboard/admin/master-schedule` or the role's `/schedule`.

Findings (context only — Sean asked to stay out of the schedule for now):

| # | Finding | Evidence |
|---|---|---|
| S1 | `adminScope` ('my' / 'global') sent by `getSessions` is **ignored** by `GET /api/sessions` | `session.service.mjs:695` reads startDate/endDate/status/trainerId/userId only; only `scheduleController.mjs:34` honours it |
| S2 | `getCalendarEvents` turns every failure into an **empty calendar** | `universal-master-schedule-service.ts:200` `return []` in `catch` |
| S3 | Cross-surface refresh is a window event, not a data subscription | `setupDashboardSync` / `triggerDashboardSync` — fine for one tab, silent across tabs |

---

## 6. Decision updates (PART-C)

| ID | Was | Now |
|---|---|---|
| D1 | Recommended canonical base | **Decided and built:** `coach/brain-v4` = coach branch + R7 closure + `origin/main` |
| D2 | "Local (Ollama) for evals only" | **Local is first-class.** P2 turns → local brain by default; cloud brains serve P0/P1. Budget caps unchanged |
| D3 | Zero-retention providers for de-identified turns | Unchanged for P1. **P2 requires a per-provider sign-off**, recorded in the catalog, before any cloud brain may receive it |
| D9 (new) | — | Flip the default: v4 workspace is the default at `/coach-assistant`; legacy stays behind `?coachLegacy=1` for 14 days, then the delete PR |
| D10 (new) | — | Build the local-brain relay (§2c) as its own phase after P1, through the Kimi gate |

---

## 7. Least-click wins (measured on the v4 build)

| Job | Legacy | v4 | How |
|---|---|---|---|
| "Brief my day" | type a sentence → lane guessed → often chat (type dropped) | **1 tap** on an empty thread, `/brief` + Enter otherwise | Real `brief_my_day` command, sent with its exact type (fix `0e1343e`) |
| Prep for a session on today's schedule | open schedule → find client → back → select client → type | **1 tap** (inspector row) + Enter | `askAboutSession` scopes by ID, prefills by time |
| See yesterday's thread | Talk/Review/History tabs → History | **0 taps** on desktop (docked list), 1 on phones | Sidebar + history now loads on admission (fix `0e1343e`) |
| Review queue | Review tab | 1 tap (header Review, badge shows the count) | Same review panel, main column |
