# Consult reply — Claude Opus 5 (anthropic/claude-opus-5) — 2026-07-30T17:02:55.890Z

> tokens: prompt=2901 completion=12000

# SESSION SHELL — Adversarial Review

**Verdict:** the zone model is right, the *stage* model is wrong-shaped (not wrong-count), and the plan currently has no mechanism that guarantees Sean's actual ask. "Straight to the point" is not an IA property — it's a *tap-budget* property, and nothing in this packet measures taps. Fix that and the rest is engineering.

---

## The mandates, ranked

| # | Mandate | Why it's the one that matters |
|---|---|---|
| **M1** | **Zero-Nav First Set.** Cold open → first set committed in ≤2 taps, 0 stage changes, 0 sheets, on any session with an assigned plan. Enforced by test + per-recipe harness metric. No recipe ships that fails it. | This is Sean's complaint, quantified. 17 sections → 3 stages is *not* an improvement if the trainer still has to visit all three. |
| **M2** | **Stage ≠ Phase.** `stage: setup\|train\|finish` is a *view* (free, non-gating, re-enterable, no completion semantics). `phase: draft\|active\|saving\|saved` is the *lifecycle* (monotonic, gates actions). Never conflate. | Every mid-session reality (plan swap, equipment swap, client leaves early) breaks the moment stage carries progress meaning. |
| **M3** | **One scroll container.** `body{height:100dvh;overflow:hidden}`, canvas is the only scroller, `overscroll-behavior:contain`, zero `scrollIntoView` in the entire shell (lint rule). | Anti-jump by *structure*, not by convention. Conventions rot in 6 weeks. |
| **M4** | **Recipe Contract.** Recipes may override chrome + arrangement only. Forbidden: zone count, zone semantics, primary-action count, copy, tap budget. Type-enforced + harness-diffed across 10 recipes × 3 stages × 3 viewports × 2 motion modes. | 10 recipes × 6 zones × 3 stages = 180 states. Without a contract this is unbounded QA and the Labs skins will drift into their own IA. |
| **M5** | **Protocols are bands, not sections.** Warmup / Work / Balance-Core / Cooldown become *phase bands inside the runner collection*. Kills 3 `CompactProtocolSection`s and makes "skipped warmup" a non-event. | The single biggest section-count reduction available, and it lands inside code you already shipped. |
| **M6** | **Rest timer is `endsAt`-absolute.** Epoch ms, computed from `Date.now()`, persisted in draft, plus Screen Wake Lock during Train. | `rest{endsAt-less v1}` in the packet is a live bug: backgrounded tabs are throttled, reloads lose the timer. A PT's rest timer that dies when they answer a text is a trust-killer. |
| **M7** | **No slice both moves DOM and changes logic.** Ever. | It's the only rule that keeps 562 tests honest through a strangler. |

---

## Q1 — Attack the 3-stage IA

**Count is right. Type is wrong.** Setup/Train/Finish as equal-weight wizard steps imports a completion mental model into a dashboard reality. What breaks:

1. **Mid-session plan change** — "her back's tight, kill deadlifts." Under a wizard, going back to Setup is a *regression*: analytics get nonsense, guards fire, and any "stage complete" state must be invalidated. Under M2 it's just a view change. **Additional requirement:** plan swap must be a **diff with preview**, not a reload — *"keeps 3 logged · adds 4 · removes 2 unlogged"*. Never destroy logged sets.
2. **Skipped warmup** — under stages this is either a nag or a fake-complete. Under M5 it's an empty band. **No stage may gate on protocol completeness. Ever.**
3. **Logging during coaching** — the trainer is 3 feet from the phone, one hand, glancing. This is the *dominant* mode and the stage rail is irrelevant to it. What it actually needs: (a) all primaries in the bottom 40% of the viewport, (b) a **glance/Peek state** showing only timer + next exercise, (c) **dictation as a first-class path, not a strip**, (d) wake lock, (e) zero stage travel.
4. **Save happens at the desk, not in Finish.** Trainers walk the client out, then save from the parking lot. **`Save` must be reachable from Train** (action-bar overflow or long-press), and Finish must be enterable on an *incomplete* session.
5. **Interruptions** — 20-minute pause while the client takes a call. If you bill by duration you need a `paused` lifecycle sub-state and pause-excluded duration. Flag as open data question.
6. **Circuit Relay is a data-model bet, not a skin bet.** Rounds/supersets require a `group` concept in the engine. If `useRunnerEngine` has no grouping primitive, **do not ship Circuit Relay** — you'll fake rounds in the skin and diverge from the save payload. Add `group: {kind:'superset'|'circuit', rounds}` to the engine *before* the recipe, or cut the recipe.

**4th stage?** No 4th *stage*. Add one **terminal state: `Receipt`** (post-save: summary, PR badges, PDF, schedule-next, billing hint). It is not rail-navigable — you can't visit it before saving. Replaces `SaveSuccessPanel` + post-save handoff.

**Stage-optionality: yes, aggressively.**
- Default landing is **Train**, always.
- Rail shows **dots, not checkmarks**. (And per token law: **completion dots must not be gold** — gold = *earned*, i.e. PR/streak. A "stage visited" dot in gold is a brand-law violation waiting to be shipped.)
- Setup is **pre-resolved**: location from last-used, plan from schedule, and rendered as a one-line chip — *"Home gym · Push A · 6 exercises · change"* — in the notice lane. The Setup *stage* exists only for exceptions.

---

## Q2 — The five-zone shell

### Missing: a 6th zone

**Notice lane (max ONE at a time, priority queue).** You currently stack up to five banner types: `ScheduledSessionStatusBanner`, `WorkoutDraftGateBanner`, offline, sync-failure, billing hints. The context bar cannot hold these. Spec: a fixed 36px lane under the context bar, one notice, priority `offline/save-failure > draft gate > schedule mismatch > billing > coaching tip`, dismissible, **never pushes the canvas** (reserved lane or overlay — never a layout shift).

### Wrongly merged: Coach as a persistent zone

Coach shouldn't own permanent vertical on a 375px screen. Correct decomposition:
- **One entry affordance** (purple icon) owned by the action bar.
- **One drawer** (dictation + commands + phase-guide reference tab).
- **Inline proposal cards rendered in the canvas, on the exercise they affect.** A proposal like *"rack is busy — swap to DB press"* must appear on that exercise's card, not in a dock the trainer has to go read. This is the difference between an AI feature and an AI *coach*.

### Wrongly merged: the action bar as specified

Merging footer + sticky bar + thumb bar + FAB is **correct**, with three carve-outs:

1. **Destructive/rare actions must leave.** `Cancel session` and `Export PDF` go to the context-bar overflow. Putting them in a 44px thumb bar next to `Log set` is a mis-tap generator on a sweaty gym phone.
2. **Cap at one primary + two secondaries.** A 5-item bar isn't parsed in 300ms. (Ledger Pro is the sole exception — see Q5.)
3. **Rest is an explicit *state* of the action bar, not a FAB and not a zone.** During rest the bar expands to ~96px: dominant countdown (readable at 3 feet — this is a *glance* surface, not a chip), `Skip` / `+15s`, and the primary retargets to `Log set 3`. Meanwhile the **context bar carries a persistent mini-timer** so rest is visible from Setup/Finish. That duplication is deliberate and rule-bound: **context bar shows status, action bar shows controls.**
4. **Keypad absorption.** When the numeric keypad sheet is up, the action bar is **replaced** by the keypad's commit button — never stacked above it. Double-bottom-bar is the #1 mobile logger defect.

### Where the orphans actually belong

| Today | Belongs |
|---|---|
| `WorkoutPlanAssignmentPicker` + `LoadPlanRow` (Repeat Last / Load Today / History Import) | **ONE "Session source" segmented control in Setup**: Plan · Repeat last · Template · History · Blank. Plus a single `Load a plan` primary on the empty Train canvas that opens *that same control as a sheet* — the trainer never navigates to Setup for it. |
| Mid-session "add from plan" | **The add/rolodex sheet gets a Plan tab.** Setup owns *session-level* source; the add sheet owns *exercise-level* source. That's the seam. |
| `CompactProtocolSection` ×3 | **Deleted → phase bands in the runner collection** (M5). |
| `NASMPhaseGuide` | **Coach drawer → Reference tab.** It's read-mostly documentation. |
| `LearningModeToggle` | **Swan Lens preference, not a page control.** It's verbosity/appearance. Moving it removes a control *and* puts it where a user sets it once. |
| `EquipmentProfilePicker` | Setup, but pre-resolved to a chip (last-used); full picker only on tap. |
| `SessionStatsBar` | Fold into context bar (2 numbers max: volume, elapsed) + full stats in the Finish canvas. |
| `ModeBar` (Quick/Detailed) | **Lens preference**, not a per-session toggle — unless data says trainers switch mid-session. Verify
