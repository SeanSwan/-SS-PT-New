---
artifact_id: SWAN-CHART-V3-S0
owner: lead Codex adjudication; Luna source audit
version: 3.2
effective: 2026-09-04
status: S0 AUDIT RETURNED; KG0 VERIFIED LOCALLY; KG1 HARNESS/CENSUS AND CHART GATES REMAIN
supersedes: v3.0 pending user approval; preserves historical verification in 08-readiness.md
---

# Approval execution and S0 receipt

Sean approved Sapphire Ledger and all-live-chart uniformity. The lead updated the existing
packet; Luna was dispatched as `gpt-5.6-luna`, `xhigh`, native agent
`01a06e27-3d84-7053-b32f-defe0d8c8818` (Linnaeus), for a read-only S0 audit. No external paid
provider call or new standalone task was created. The audit returned STOP for the original
chart handoff. The approved unit extension opened independent pure KG0, now locally verified
in [13](13-kg0-verification.md); chart/persistence integration gates remain.

## Lead-verified baseline

| Item | Observed evidence |
|---|---|
| Source | `C:/tmp/ss-charts-unify-20260903`, branch `claude/chart-system-unification-20260903` |
| HEAD | `c3e7e29e044752e2ca1cd88fb0d38e5d9d2b24be` |
| Observed local origin/main | `53120649f356c3efccee32872b530096d386642f`; not a fresh network fetch |
| Divergence | `git rev-list --left-right --count origin/main...HEAD` →8/8 |
| Dirty state | `git status --short` →23 tracked modified,7 untracked; no reset/stash/rebase performed |
| Shared doc host | `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`, `wip/comms-notifications-2026-07-05`, HEAD `a89cbf0f080644877ae8a45729d3f0a59d4cb8b8`; not the implementation base |
| Ownership | Shared Claude lane says idle, but `vs-claude--main-se392b3cb.lane.md` still claims SwanChart, test setup and reduced-motion files; old timestamp is not release |
| Lead lane | Dedicated `codex-chart-vision-astra-20260904.lane.md`; main Codex Aftertaste lane preserved |
| Initial audit scope | Existing planning packet and dedicated coordination only; later Luna KG0 writes are separately recorded in13 |

`git log -8` confirms historical foundation work: reduced-motion/test instruments, resolved
colors, branded Victory theme, admin tier parity, shared frame, source drill, hook extraction,
and first reference migration. Those commits are not proof of V3 or all-product adoption.
The other eight observed main commits include rules, Sentry/front-end dependencies and webhook
tests. No textual chart-file overlap appeared in `git diff --name-only HEAD...origin/main`,
but dependency/instruction drift remains relevant. This is not a tested merge or current-main proof.

Before runtime: snapshot source dirty changes separately, resolve their ownership/transfer,
refresh main through the approved Git path, and reconcile into a new nonconflicting isolated
lane. Never overwrite the source worktree, merge into the dirty shared host, or copy all its
unrelated files. Claim exact runtime files only after S0 source and environment gates pass.

## Luna S0 result and lead adjudication

Luna reported a source-unit STOP. Lead independently read the model, AI adapter, admin
writer, intensity model/start writer and two date parsers. No database was accessed.

| Finding | Evidence in source worktree | Lead disposition |
|---|---|---|
| Workout load units not preserved | `backend/models/WorkoutLog.mjs:51` is nonnegative FLOAT with no unit column; `aiWorkoutDailyFormPayloadService.mjs:93,155` copies numeric weight; `adminWorkoutLoggerController.mjs:362,375` writes it unchanged | VERIFIED adapter gap; historical kg contamination UNPROVEN. Blocks load/volume/record migration under S0/B07 |
| Known intensity scale, incompatible writer | `backend/models/WorkoutSession.mjs:66` allows null or1–10; `backend/routes/workoutSessionRoutes.mjs:95,116` supplies0 to create | VERIFIED source/schema mismatch. Scale is known, not an unknown product choice. Endpoint runtime effect not reproduced; no silent interpretation of0 as valid intensity |
| Legacy date construction differs | `backend/services/workout/aiWorkoutDailyFormService.mjs:129` creates UTC midnight; `backend/services/workout/workoutLogService.mjs:53,68` anchors date-only input at server-local noon | VERIFIED source difference. New IANA period rule is already specified; original intended local date of historic rows is not proven. No timestamp rewrite inferred |
| V3 API and flag absent | Current grid uses legacy chart suffixes; V3 routes/flag are planned additions | EXPECTED UNBUILT, not a circular S0 blocker: S1/S4 create them |
| Session model naming | Original receipt `01-review-and-baseline.md:85` names WorkoutSession | `Session.intensity` in metric prose is shorthand for WorkoutSession, NEVER booking `backend/models/Session.mjs`. Use full model name in implementation |
| Ownership/base | Parent verified actual shared chart owner lane and8/8 divergence above | OPEN engineering gate, not permission to seize files or edit stale shared code |

### Independent executable negative control

Lead invoked the actual dependency-free payload module in Node with synthetic input only:

```javascript
import { normalizeAiExercises, buildWorkoutRows, normalizeIntensity }
  from './backend/services/workout/aiWorkoutDailyFormPayloadService.mjs';
const input = [{ exerciseName: 'SYNTHETIC UNIT PROBE',
  sets: [{ reps: 8, weight: 100, weightUnit: 'kg' }] }];
const [row] = buildWorkoutRows(normalizeAiExercises(input), 1);
console.log(row.weight, Object.hasOwn(row, 'weightUnit')); // observed: 100 false
console.log(normalizeIntensity(null)); // observed: null
try { normalizeIntensity(0); } catch (error) { console.log(error.message); }
// observed: intensity must be between 1 and 10
```

Command used `node --input-type=module -e <above probe>` from the source worktree; exit0.
The module has no imports or DB connection. This proves the normalizer drops an explicitly
supplied unit; it does NOT prove an authenticated API accepts that field or that any real
row was logged in kilograms. Do not overstate the finding as confirmed corrupted client data.

### Sean's source decision and replacement plan

Sean was asked whether historical weights were pounds or kilograms. He did not certify their
units; he approved first-class kg/lb support for international use and delegated the safe
approach. Legacy provenance remains unknown. Do not infer pounds from logger labels, numeric
magnitude, client geography, current preferences or old chart formatting.

Lead decision in [12](12-worldwide-weight-units.md): preserve raw history, label unknown units,
exclude unknown mass from normalized aggregates with visible coverage, and require explicit
value/unit pairs for new writes. No automatic backfill. The approved look does not change.

### Independent build lane established

`git ls-remote origin refs/heads/main` through the normal approved network tool returned
`53120649f356c3efccee32872b530096d386642f`, matching the local ref. The first sandboxed
network attempt failed at the sandbox proxy; no proxy bypass/config edit was used.
Approved `git worktree add` created `codex/chart-experience-v3-20260904` at that exact commit,
path `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
The path was absent beforehand and ignored by the shared host. Existing chart commits and
dirty files were not moved/copied/rebased. KG0 creates only three new shared unit files in
this lane; old chart locks are not seized. No production or remote ref was changed.

### Additional Luna source findings and remaining gates

Luna's completed read-only report identified the canonical client route/JSX/grid/hook receipt
matching01; analytics mounts at `backend/core/routes.mjs:474` before broader client596–597
and generic API833; only frequency currently uses SwanChart. No all-product migration proof.
Writer inventory includes daily form147/1060–1077, AI payload93/146 and service178–193,
admin352–375, `historyBackfillService.mjs:150,269`, and demo seed113. Parent reproduced the
AI/admin core unit gap; backfill/seed coverage remains review input for KG1's fresh census.

Reported taxonomy sources are `analytics/movementPatternSql.mjs` and `muscleGroupSql.mjs`:
deterministic CASE mappings, not a proved authoritative Exercise-model join. Details currently
label lb (`swanDrillSource.ts:116`); report sections hardcode units (`buildProgressReportSections.ts:37`);
CSV/PNG use parent rows (`progressChartActions.ts:20`). These are required KG3/S1 parity targets.
Luna's report is evidence input, not proof those consumers have been migrated.

A separate synthetic PostgreSQL17 cluster was subsequently established on127.0.0.1:55439.
SQL proved database `chart_weight_synthetic`, role `chart_unit_test`, loopback-only binding,
UTC and0 public tables. It is now stopped, with files retained; see13 for exact paths.
No migration/writer suite ran against it. KG1 must still create a fail-closed harness that
rejects default/production targets BEFORE imports: `backend/database.mjs` can load default
env/connection, so NODE_ENV=test alone is insufficient. Original source intensity/date/taxonomy
fixes and chart-foundation reconciliation still gate chart slices.

## Current planning verification

- Current packet validation and KG0 execution results are recorded in13. Document checks
  cover metadata/links/15 metrics/original44 cases/12 RED mappings/12 uniformity cases,
  20 unit cases, authorization wording, line cap and unchanged approved visual hashes.
  Mermaid checking remains structural, not a full parser or browser proof.
- `node docs/ai-workflow/AI-HANDOFF/chart-experience-v3/acceptance.red.mjs C:/tmp/ss-charts-unify-20260903`
  →exit1,0 passed,12 expected failures: future `metricMath.mjs` is absent. No tests skipped.
- Approved v3.0 preservation →18 live/copy hashes matched, portable seal verified,2 restored
  samples matched. See [approval contract](10-approved-uniformity.md) for paths and hashes.
- `git diff --check -- docs/ai-workflow/AI-HANDOFF/chart-experience-v3 .ai-workflow/coordination/codex-chart-vision-astra-20260904.lane.md`
  →exit0. Packet files are untracked, so this alone is not a complete content check; the
  packet validator and integrity manifest cover the authored files separately.
- U09 synthetic acceptance arithmetic independently checked:1600lb_reps=725.747792kg_reps.
  This calculation does not prove historical workout-unit provenance.

Original v3.0 browser evidence remains historical in [08](08-readiness.md). No new screenshot,
authenticated app journey, production read/write or application build was performed. Later
KG0 runtime tests, real TypeScript caller probes and synthetic DB preparation are in13;
they do not establish V3 chart implementation or all-product adoption.

## Review, hygiene and handoff limits

This turn's lead review checks scope closure (all live cohorts, not client-only), role/data
isolation, equal-basis reconciliation, rollback, immutable preview and test-layer separation.
The full application hostile review remains required after Luna implementation. Astra's
previous APPROVE applies to v3.0 planning, not a fresh Astra review of this revision or runtime.

New artifacts now also include12/13, pure unit acceptance/type/boundary gates, Luna's three
isolated runtime files, locked backend dependencies, and the stopped synthetic DB cluster.
Earlier approved-plan snapshots are retained off-repo. No screenshots, root-level temp files,
Hermes memory writes, Linear mutation, commit, push, deploy or continuity closeout. Luna removed
only its own new incorrect declaration file; the corrected declaration preserves its API.
See13 for complete local proof, review ledger, retention locations and exact next steps.
Readiness is limited to KG0 plus the approval contract. Chart S1 still requires its S0 gates.
