# Swan Coach as the Hive Mind — Planner · Logger · Bootcamp · Coach — MASTER PROMPT

**Author:** Claude Opus 5, acting head orchestrator, 2026-07-25.
**Origin:** Sean — *"the Swan Coach is the hive mind. It's the Jarvis. Dictation first, manual logging second."*
**Status:** enhanced prompt, ready to execute. Grounded in a real inventory + commit history, not assumptions.
**Related issues:** SWA-51 (Elegance Arc L — logger fluidity, Sean's #1), SWA-59 (SwanCoach Operator Runtime S0 shipped, S1–S10 ladder), SWA-46 (Coach plan-edit review UI), SWA-63 (onboarding → Coach → Planner/Logger NASM pipeline, **Backlog**), SWA-64 (admin↔trainer superset — just shipped, makes all four surfaces admin-reachable).

---

## 0. The thesis — what is actually wrong with the current direction

The four surfaces are real, large, and well-built:

| Surface | Files | Notes |
|---|---|---|
| Coach assistant | 369 | biggest surface in the app |
| Workout Logger | 203 | `WorkoutLogger.tsx` is **866 lines** — 2.9× the 300-line cap |
| Workout Planner | 160 | |
| Bootcamp Builder | 64 | |

The recent commit arc is genuinely strong — Arc L shipped ghost-tap-accept, a coarse-pointer numeric keypad, rest-timer atmosphere, and dictation-degradation chips; CC-3a→CC-4 generalized the CoachDock and mounted it into Bootcamp and Pain Charts.

**But the architecture is surface-first with Coach bolted on.** Every increment reads "mount the CoachDock into one more surface." That produces N surfaces each containing a Coach, and it will never produce Jarvis, because:

1. **Coach is a passenger, not the spine.** You must first navigate to the right surface, *then* talk to the Coach that lives there. Jarvis is the inverse — you speak, and the system decides which surface is involved. Today the human does the routing.
2. **Each dock is context-blind to the others.** Coach in the Planner does not know what Coach in the Logger just did. A hive mind with N amnesiac instances is N assistants, not one mind.
3. **"Dictation first" is unmeasured.** Nothing tracks what fraction of logs, plans, or bootcamps were created by voice versus tapping. An unmeasured priority silently becomes a novelty feature — and Arc L's L4 degradation chips, good as they are, are a *fallback* story, not a *primacy* story.

**The reframe:** Coach is not a feature of the surfaces. **The surfaces are the hands; Coach is the nervous system.** One command lane, one memory, many effectors.

This is also why it converges with SWA-64's next slice: the role-aware **Cmd+K palette and the Coach command lane are the same object** — a single intent bar that resolves "what did you mean" to "which capability, for which client, on which dashboard." Building them separately would be building the same thing twice.

---

## 1. Hostile review — findings, most severe first

**H1 — There is no cross-surface Coach memory (CRITICAL).**
CC-3b generalized the dock and CC-3c gave Bootcamp its own command registry, but each mount carries its own conversation. Say "make it easier on her knees" in the Planner, then open the Logger — the Logger's Coach has no idea. **Required:** one session-scoped Coach context keyed by `(actor, client)` that every dock reads and writes, so the mind is continuous across surfaces.

**H2 — Dictation-first has no telemetry and therefore no defense (CRITICAL to Sean's stated priority).**
If voice is the primary input, the primary KPI is *voice-origination rate* per surface, plus dictation failure/abandon rate. Without it there is no way to tell whether dictation is winning or quietly rotting. **Required:** a `inputOrigin: 'voice' | 'manual' | 'coach_tool'` field on every created log/plan/bootcamp, surfaced in admin. This is cheap and it is the only way "dictation first" stays true.

**H3 — `WorkoutLogger.tsx` is 866 lines on the money path (HIGH).**
2.9× the Rule 4 cap, and it is the single most-used trainer surface. Every Arc L increment lands in it. **Required:** decompose before adding more — the codebase already has the pattern (`MyClientsView` is split across `.logic/.types/.styles/.clientCard/.sections`). This is a prerequisite, not a cleanup ticket.

**H4 — `backend/services/swanCoach/` does not exist (HIGH — canonical receipt required).**
The frontend Coach surface is 369 files; the backend service directory is empty. Coach backend logic is therefore somewhere else, and nobody has written down where. **Required:** a Rule-26 canonical receipt for the Coach backend before any new backend work — which routes, which services, which model owns proposals/tool-calls. Fragmented ownership here is how the "one command lane" promise quietly forks.

**H5 — SWA-63 (onboarding → Coach → Planner/Logger NASM pipeline) is still Backlog (HIGH — this is the intelligence itself).**
Coach can execute commands but is not yet *informed* by the client's intake — injuries, goals, equipment, pain map. A Jarvis that does not know the client's bad knee is a command parser with good manners. **This is the highest-value unbuilt thing in the entire arc**, and it should outrank further dock mounts.

**H6 — Four surfaces, four command registries, one drift problem (MEDIUM, structurally identical to SWA-64).**
Planner, Logger, Bootcamp, and Pain Charts each register their own `AI_*` tool family. That is exactly the four-sources-of-truth pattern that caused the admin↔trainer divergence. **Required:** one capability/tool registry that all surfaces contribute to and the palette reads, with an executable invariant (the SWA-64 `dashboardSupersetInvariant` is the template).

**H7 — No offline/degraded story for the lane as a whole (MEDIUM).**
L4 gives dictation a per-utterance fallback. There is no answer for "trainer is in a basement gym with no signal mid-session." For a dictation-first product used on gym floors, connectivity is a first-class product condition, not an error state.

**H8 — Admin-audience correctness across all four (MEDIUM — new as of SWA-64).**
These surfaces are now mounted for admin as well as trainer. Every deep link, return path, and dock action inside them must resolve by audience or it will demote the owner mid-session. `resolveAudienceFromPath` exists; it must be applied and locked here too.

---

## 2. What "Jarvis" actually requires (the target)

1. **One intent bar, reachable everywhere** — voice or Cmd+K, from any dashboard surface, for admin and trainer alike. It resolves intent → capability → client → audience-correct destination.
2. **One memory** — `(actor, client)` conversation + working state that survives surface changes, so "keep going" means something.
3. **Many effectors** — Planner, Logger, Bootcamp, Pain Charts, Schedule are tools the mind calls, each with a validated tool contract (the CC-3b executor pattern already proves this works).
4. **Informed by the record** — intake, injuries, equipment, history, adherence flow into every proposal (SWA-63).
5. **Always reversible** — every Coach action carries a real Undo (the `249716c38` real-previous Undo pattern is the precedent to generalize).
6. **Honest when degraded** — voice failure becomes a tap-chip, network failure becomes a queued local write, never a dead end or a lie.

---

## 3. Slice plan (each slice: design contract if visible → build → hostile-review until dry → PROOF → commit)

| Slice | Deliverable | Why here |
|---|---|---|
| **C0** | **Canonical receipt for the whole lane.** Where Coach backend lives (H4), the full `AI_*` tool inventory across the four surfaces (H6), current dictation entry points, and the `inputOrigin` write paths. No code. | You cannot unify what you have not located. Answers H4/H6 and prevents a second four-sources drift. |
| **C1** | **Dictation-origin telemetry (H2).** `inputOrigin` on every created log/plan/bootcamp + an admin read-out. RED-first test. | Cheapest slice with the highest strategic value: it makes "dictation first" measurable, which is the only thing that keeps it true. |
| **C2** | **Decompose `WorkoutLogger.tsx` (H3).** 866 → ≤300 per file, behavior-identical, existing suites as the safety net. | Prerequisite for every future Arc L increment; do it while the suites are green. |
| **C3** | **Unified Coach context (H1).** One `(actor, client)`-keyed session store every dock reads/writes; continuity proven across a surface change. | This is the actual hive mind. Everything after it compounds. |
| **C4** | **The one intent bar (converges with SWA-64 S4).** Role-aware Cmd+K + voice entry that resolves intent → capability → client → audience-correct route, over the unified registry. | The Jarvis front door, and it deletes the duplicate-palette work. |
| **C5** | **Intake → Coach context (SWA-63, H5).** Injuries/goals/equipment/pain feed every proposal; NASM doctrine verdicts surface inline. | Turns a command parser into a coach. |
| **C6** | **Degraded-mode contract (H7).** Queued local writes + explicit sync state for the gym-floor case. | Makes dictation-first survivable in the real environment it is used in. |

**Ordering rationale:** locate (C0) → make the priority measurable (C1) → make the surface safe to extend (C2) → build the mind (C3) → build its front door (C4) → make it smart (C5) → make it survive reality (C6). Docking Coach into further surfaces is deliberately *not* on this list until C3 exists — more docks before shared memory multiplies the amnesia.

---

## 4. Guardrails (unchanged)

- Swan Coach is **never called "AI" user-facing**. Credentials framing: "26+ years / NASM-protocol", never "NASM-certified". No yoga/meditation language — "stretching"/"flexibility" (there is a live violation of this in PRISM marketing copy, flagged on SWA-64, owned by SWA-29).
- styled-components only (no MUI) · Victory only (no Recharts) · `var(--token, #CrystallineFallback)` · reject retired Galaxy-Swan · 44px targets · `prefers-reduced-motion` · 300-line cap · WCAG 4.5:1.
- **Trainer indispensability doctrine:** clients get read + do, never decide. Switching the active plan and editing `planData` stay trainer-only.
- Zero PII to LLMs (Rule 8) — client IDs only.
- Money/auth-adjacent paths (session credits, commission) get the careful lane.
- Per slice: hostile-review until a round finds nothing, then one confirming round (**DRY-LOOP CLEAN×2**), a `PROOF:` line with executed evidence, no "done" without proof (Rule 74). Subagent output is a hypothesis until verified (Rule 30).
- Shared tree (Rule 67): read the coordination lanes; stage **explicit paths only**.
- Batch-push cadence (Rule 70): commit per slice, push once at the end.
- Disclose honestly what could not be proven in-environment (no live authenticated browser, `tsc --noEmit` OOMs on this repo).

---

## 5. Definition of done for the program

1. Every created workout/plan/bootcamp records how it was created, and voice-origination rate is visible to admin.
2. A trainer can start a thought in one surface and finish it in another without repeating themselves.
3. One intent bar reaches any capability for any client, audience-correct, in ≤2 keystrokes + Enter — or by voice.
4. Coach proposals reflect the client's real intake, injuries, and equipment.
5. No runtime file in the lane exceeds 300 lines.
6. Every Coach action is reversible, and every degraded path resolves to something the trainer can still act on.

**First action:** C0 — the canonical receipt. Locate the Coach backend and inventory every `AI_*` tool family across the four surfaces before writing a line of code.
