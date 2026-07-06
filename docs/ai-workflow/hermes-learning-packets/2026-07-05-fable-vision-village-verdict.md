---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-05
topic: Fable-tier build doctrine extracted from the 15-brain Village verdict on the SwanStudios "Fable Vision" rebuild brief
surfaces: [workout-logger, session-credits, program-builder, charts, theme-system, pain-charts, next-best-action, exercise-rolodex, bootcamp, nutrition]
---

# Hermes Learning Packet — Fable Vision Village Verdict (2026-07-05)

**Source:** the Fable 5 synthesis judge (`anthropic/claude-fable-5`) over a 15-brain AI Village pass on the SwanStudios rebuild brief. This is the first packet under Rule 68 / the `hermes-learning-packet` skill. Tier gate PASS (Fable-tier). Privacy: IDs/roles/paths only — no client data.

## What was decided (the Fable-tier lesson)
When a large product-rebuild plan is reviewed by a top-tier synthesis judge, the highest-value verdict is almost never "make it prettier" — it is **"fix the money and data-truth plumbing first, then the UI."** Fable's ordering doctrine, in its own words: *fix the money & data-truth plumbing first → lock every deferred decision into explicit contracts → automate the rules (contrast, line-budget, denylists) into CI → only then execute the UI remakes, each behind a feature flag, each decomposed under the file-size cap, each mobile-first at 320–375px.*

The concrete verdict sequenced: **Phase 0** same-day hotfixes for active data loss (an offline context hitting dead endpoints; unpushed WIP at risk) → **Phase 1** data integrity (lock the two-program-model decision; one transactional workout write service; a credit-ledger subsystem) → **Phase 2** UI remakes with locked contracts.

## Why (the rationale Hermes should carry forward)
A plan that *defers* decisions ("Fable will decide A vs B later") pushes ambiguity into the build, where it becomes a migration hazard. A plan that *locks* decisions with safeguards ("Option A, with a transactional seed + lineage FK + backfill + Rule-58 tests") is executable by a cheaper worker-bot with zero further questions. The judge's job is to convert deferrals into contracts. Hermes should treat "a plan must return with decisions, contracts, and guards — not deferred ambiguities" as a standing bar for any plan it reviews or produces.

## Reusable patterns / rules Hermes should apply next time
1. **Revenue-leak bug class:** a hardcoded `deduct*: false` (or any "always-off" money flag) is a silent revenue leak — flag it CRITICAL, fix the logic *before* any UI relabel, and pair the fix with a **reconciliation query that quantifies the historical gap** before shipping.
2. **Silent data-corruption bug class:** two write paths for one domain that leave *different DB footprints* (one omits a row) silently corrupt every downstream derived surface (charts, streaks, XP, recommendations). Consolidate onto one transaction-wrapped service + a cross-path integration test asserting identical footprints.
3. **Financial integrity primitive:** an **append-only ledger** (balance reconstructible from an immutable log) + atomic decrement (`SELECT … FOR UPDATE` / `CHECK (>= 0)`) + a dedup guard beats mutating a running-total column across N entry points.
4. **Automate house rules into CI, don't rely on convention:** contrast (WCAG 4.5:1 across all themes × text tokens), file-size caps, and retired-palette denylists should *fail the build*, not depend on a reviewer remembering. Build-time > runtime for pre-computable guarantees.
5. **Verify the config, not the assumption:** a brief said "28 themes" while the platform config said "18" and *no analyst caught it* — always reconcile a claimed count against the source of truth before scoping work that depends on it. Same for "does `/library` actually return field X" before assuming the frontend just isn't using it.
6. **Empty-collection crashes:** `array.reduce()` without an initial value throws on empty arrays → crashes the component tree for brand-new (zero-data) users. Early-return the empty state + seed the reducer. New-user (empty-data) paths are a first-class test case.
7. **Health-data regulatory framing:** pain/injury-derived guidance must be framed as **"comfort modifications," never treatment/rehab** (FDA general-wellness boundary) with a hardcoded disclaimer; AI-generated advice needs a **visible AI marker** (FTC transparency). This applies to any Hermes-generated coaching/health suggestion too.
8. **RBAC on money endpoints is a distinct concern from authentication:** authenticating a request ≠ authorizing the *role*. Every credit/waive/allocate/admin-money endpoint needs explicit role-level authorization; a waive needs a reason + immutable audit entry.
9. **Panel blind-spots to pre-empt:** success telemetry (prove the loop works), retention/eviction policies for growing tables, pre-migration snapshot + staging rehearsal + rollback for live revenue DBs, cross-device/multi-tab state coherence, and delivery mechanism for any "reminders" feature (a whole notification subsystem implied but unplanned).

## Risks / guardrails
- The one genuinely unresolved decision (two-program-model **Option A vs B**) is human-owned; Fable recommended A (better-evidenced) but flagged it must be *explicitly locked* with backfill safeguards either way. Don't let it stay ambiguous.
- Fable-tier verdicts are still inputs, not gospel — the build must keep failing-test-first + hostile-review discipline per slice.

## Provenance & privacy
- `originating_model: claude-fable-5` (Fable-tier → source gate PASS). Cost of the source run: $1.76, 17/19 validators, 72 web sources.
- Privacy: IDs/roles/file-paths only; no client names, PII, or secrets. Two-layer secret scan clean at commit.
- Full source verdict: `docs/ai-workflow/AI-HANDOFF/FABLE-VISION-VILLAGE-OUTPUT-2026-07-05/synthesis.md`. Brief it ratified: `docs/ai-workflow/brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` (v3 §6).
- Delivery to Hermes: extend the Pi daemon read-list (`HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`) to include `docs/ai-workflow/hermes-learning-packets/` — pending, and Hermes Pi work is currently SSD-power BLOCKED (MEMORY.md).
