<!-- USER-WORKFLOW-MIGRATION:20260908 -->
> **Controller blocker resolved, 2026-09-08.** Sean explicitly changed this task
> to finish the implementation slices and required tests, then Astra hostile
> review and repairs of the combined result. This supersedes older mandatory
> GLM/Flash and per-slice review gates and STALE_POLICY blocker text below.
> Use `tmp/coach-g02-robustness-20260908/workflow-state-user-override.json`.
> The supported migration and current-session enrollment were executed and
> verified: status active, cadence final-astra, 9 consumed calls preserved, task
> cap 24. The old state and history remain intact as evidence.
> G04a's approved architecture is retained; continue the bounded build/test
> gates and append subsequent planned slices using the updated controller.
> Deferred review is pending, not approval. This is not a claim that G04-G11
> are implemented. No push or deployment has occurred.

# G02 controller compatibility handoff

Artifact `SCU-G02-39`. Version 1. Date: 2026-09-08. Owner: Sean. This is a
continuation handoff for the preserved Swan Coach Universe V3 lane; it does not
replace G02, the Universe packet, or the G04a architecture packet.

## Current truth

G02 source repairs are complete and were independently adjudicated APPROVE by
Astra. The current candidate has file-backed evidence for 181 scoped frontend
tests, TypeScript, Vite build, and eight browser cases. The repaired G02 packet
and provider receipts are preserved under the external visualization receipt
directory recorded in the continuation transcript.

The native controller was queried read-only on the preserved state:

```text
status: STALE_POLICY
task: swan-coach-universe-v3-g02-robustness
stored policy: 9b930ab2fd26dad087570289092ff4b7de4d651ea4d29a2f84d12a5b77a65667
current policy: 79aa03e0f3c44317e85f7bb771837d04c5d42b761656842f510acee8c4d3a8a8
handoff: replan and reenroll; no automatic migration
validated: false
```

The preserved state is
`tmp/coach-g02-robustness-20260908/workflow-state.json`. It remains untouched;
its stored policy hash and historical review event are evidence, not a state to
rewrite.

## Budget truth

The current policy requires the ordered route GLM 5.3 -> GLM 5.3 Flash -> Astra
for every slice and for the final combined regression. The current cap is 12
review admissions. The file-backed re-enrollment accounting is:

- five historical admissions conservatively counted;
- one old G02 admission in the preserved native state;
- three fresh G02 repair calls with provider receipts;
- nine admissions accounted for, three remaining;
- a fresh G02 route plus its mandatory final combined route would require six,
  so it is not budget-feasible under the current policy.

Starting G04a or creating a zero-counter state would either advance past an
unresolved G02 gate or discard cumulative accounting. Neither is valid.

## Required compatibility change

Before any production implementation slice is activated, the workflow owner
must provide a supported migration or an explicit budget-feasible replan that:

1. preserves the old state and its original hash/history;
2. validates the nine already-accounted admissions without relabeling them as
   newly executed calls;
3. records the provider receipt paths and hashes for the fresh G02 evidence;
4. leaves enough current-policy admissions for the G02 final gate and every
   remaining authorized slice plus the final combined review; and
5. keeps the ordered GLM -> Flash -> Astra route, zero paid API spend, one
   in-flight call, and the existing Astra/Luna role split.

The installed controller exposes `init`, `status`, `pause`, `resume`,
`freeze`, `admit`, `review`, `reconcile`, `fix`, and `advance`; it exposes no
migration or receipt-import command. Its `init` path creates a new state with
`calls: 0`, so it is not a compatibility migration. Do not edit the global
`.agents`/`.codex` controller or policy, rewrite the policy hash, reset a
counter, or fabricate an admission event as a workaround.

## G04a boundary

The G04a architecture packet remains PLAN READY. Its baseline receipt is
preserved, but its own status is IMPLEMENTATION BLOCKED until the G02 final
combined gate is reconciled. No G04a production source has been started in
this continuation. Once the controller gate is valid, the next bounded slice
is Luna's G04a RED tests and six-file foundation, followed by the required
GLM, Flash, and Astra review loop.

## Re-entry checklist

- Read this handoff, G02 artifacts 34-38, and the preserved old state.
- Verify the controller's current policy hash and supported migration surface.
- Bind a supported re-enrollment/replan to the existing G02 evidence.
- Run the G02 final combined route and resolve any findings.
- Only then activate G04a and continue the remaining slices in order.

No source, controller, provider, production, push, or deployment state was
changed while producing this handoff.

## Exact controller controls

The controls that caused this stop are concrete and file-backed:

- `C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/references/review-policy.json` controls `reviewProfiles.sequential-astra` and `reviewProfiles.all-three` (both currently resolve to `glm`, `glmflash`, `astra`) and `limits.reviewCallsPerTask` (currently `12`).
- `C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/workflow.mjs` computes the policy hash, reports `STALE_POLICY`, rejects old-state mutation, and enforces the remaining-call budget.
- `C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/workflow-hook.mjs` rejects enrollment when the state hash is not current and explicitly says `no automatic migration`.
- `tmp/coach-g02-robustness-20260908/workflow-state.json` is the preserved old state and must not be rewritten as a shortcut.

Changing only the route or cap would not safely unstall this task: the old state
would still be stale, and a new zero-counter state would lose cumulative
accounting. The minimum compatible controller change is a task-scoped,
supported migration/replan that validates the preserved admissions and receipts,
retains their accounting, assigns the requested route, and proves enough budget
for the G02 final gate, every remaining slice, and the final combined review.
