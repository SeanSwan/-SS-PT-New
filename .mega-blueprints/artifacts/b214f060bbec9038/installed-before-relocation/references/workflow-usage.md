# Workflow v3.1: exact controller inputs and evidence

## Explicit task override and stale-state migration (schema 4)

Latest explicit user instructions override local reviewer/cadence/call-cap
defaults. Record the instruction once; do not ask repeatedly for authority
already given. This is a task-scoped configuration path, not a system/sandbox or
provider restriction bypass. Defaults below continue unchanged for schema 3.

The isolated `workflow-override.mjs` module supports `final-astra`: every bounded
slice must freeze actual build/test evidence and advances as tested with review
deferred. Only a fresh combined final Astra approval permits completion. No GLM
or Flash calls are required by this override. The controller calls no providers.

Run `workflow.mjs migrate NEW_STATE.json INPUT.json --check` for a no-write
validation, then the same command without `--check` to create a new state.
The destination must not exist and must stay within repoRoot. The predecessor
is read, hash-checked, embedded unchanged, and never overwritten. The task ID
must remain the same. A new native session requires `sessionRebind:true` and
retains the original session in history. `workflow-hook.mjs enroll NEW_STATE.json`
enrolls the current session; an old different-session registry remains intact.
Same-session replacement requires the exact preserved predecessor and retains
the prior enrollment inside the new record. Never claim hook enforcement from
installation or enrollment alone; run an appropriate native sentinel.

INPUT.json shape (use actual task paths and observed accounting):
```json
{
  "taskId":"existing-task", "sessionId":"current-native-session",
  "repoRoot":"ABSOLUTE_TASK_ROOT",
  "previousState":{"path":"tmp/old-state.json","sha256":"ACTUAL_HASH"},
  "authorization":{
    "authorizedBy":"user", "instruction":"Actual explicit user instruction",
    "cadence":"final-astra", "reviewCallsPerTask":24,
    "sessionRebind":true, "allowAdditionalSlices":true,
    "builder":{"model":"gpt-5.6-luna", "effort":"xhigh"},
    "allowInitialHistoricalCalls":true
  },
  "carriedCalls":[
    {"id":"historical","calls":5,"reason":"Historical ledger outside predecessor", "evidence":[{"path":"tmp/history.json","sha256":"ACTUAL_HASH"}]},
    {"id":"observed","calls":3,"reason":"Observed reviews outside predecessor; no approval credit", "evidence":[{"path":"tmp/observed.log","sha256":"ACTUAL_HASH"}]}
  ],
  "planFiles":["plan.md"],
  "slices":[{"id":"current-slice","files":["source.ts"]}]
}
```
The cap 24 is an example explicit override, not a new default. Count each call
exactly once: a predecessor with calls=1 plus the example carry list yields 9.
Unknown execution, scope loss, duplicate carry IDs, negative/reset accounting,
changed predecessor bytes, or insufficient capacity for final review fails.
Historical consumption can be conservatively recorded without inventing native
admission IDs or approvals. Migration carry evidence is optional for backward
compatibility; when `previousState` is omitted, `override-init` accepts carried
calls only with `authorization.allowInitialHistoricalCalls:true`, positive
counts, and at least one hash-bound `{path,sha256}` evidence reference per item.
The initial carry remains in `origin.carriedCalls` and does not create review
admissions, approvals, served-model metadata, or provider completion. A
task-scoped `authorization.builder` may opt all schema-4 build/repair evidence
into the exact `{model:"gpt-5.6-luna",effort:"xhigh"}` contract. If omitted,
the existing final repair requirement remains `gpt-6-astra`; this opt-in does
not alter the final Astra review gate, quotas, no-spend rules, or schema-3.

Use `snapshot STATE.json` to get the current candidate digest. `freeze` input:
```json
{"tests":{"path":"tests.json","sha256":"ACTUAL_HASH"},
 "build":{"path":"build.json","sha256":"ACTUAL_HASH"}}
```
Tests JSON: `{status:"PASS", digest:ACTUAL_SNAPSHOT_DIGEST, command:ACTUAL_COMMAND,
toolEvidence:{path,sha256}}`. Build JSON: `{status:"complete", digest:ACTUAL_DIGEST,
actor:ACTUAL_MODEL, summary:ACTUAL_EXECUTION_SUMMARY, toolEvidence:{path,sha256}}`.
Use saved actual native results or command output, not fabricated execution.
`advance` after freeze moves a tested slice forward without claiming approval.
At FINAL, tests must additionally have `scope:"final-combined"` and `files`
equal to the snapshot's exact full union. Final repairs require actor gpt-6-astra.

Future slices need not be invented at migration. When the planner defines the
next scope, `append-slice STATE.json NEXT.json` accepts
`{slice:{id,files},planFiles:[...],reason:"Actual planner scope decision"}` under
`allowAdditionalSlices:true`. It preserves history and consumption and records
the previous/new contract digests. It can reopen a not-yet-reviewed FINAL build
stage. If the current slice is already tested, advance it first: append refuses
that phase without modifying valid test evidence. Once final review starts,
finish/adjudicate that gate before replanning. A later explicit cap/cadence
amendment uses `migrate` with the previous schema-4 state and an empty carriedCalls
array unless there really are additional uncounted calls; the entire prior
migration chain, original events and accumulated calls are retained.

Final `admit` input has `preflight` and `dispatch:{toolName,inputHash}`. Preflight
must record model gpt-6-astra, effort xhigh, provider openai-codex, billing
subscription, available/entitlementVerified/quotaAvailable/recipientAuthorized/
privacyApproved true, extraUsage false, and an actual checkedAt under five minutes
old. The exact native tool input hash is consumed once by the guard. Preserve
provider-supported billing and privacy checks; do not manufacture preflight.

Final `review` input is `{receipt:{path,sha256}}`. Its JSON includes admitted
attemptId, digest, dispatchInputHash, status complete, requestedModel gpt-6-astra,
provider openai-codex, billing subscription, effort xhigh, nonempty full output,
truncated false, verdict APPROVE or REVISE, findings and adjudications arrays,
and actual saved toolEvidence `{path,sha256}`. `servedModel` may be null when
unreported (a reported identity must equal gpt-6-astra). `outputTokens` may be
null when the native tool does not report it (a reported count must be positive
and <=8000). Null is unknown metadata, not zero usage or unlimited entitlement.
Never estimate these fields or turn missing/partial output into completion.

Findings use `{id,status:"open"}`; Astra adjudications use
`{id,status:"resolved"|"rejected",reason,evidence:{path,sha256}}`.
APPROVE must account for all historical final-review findings. `fix` retains
reports/calls and requires changed source plus new combined regression and Astra
review. `pause`/`resume` preserve consumption. `reconcile` requires actual
terminal evidence (same attemptId, executionKnown true, reason, and NOT_SENT,
FAILED, CANCELLED or COMPLETED_QUARANTINED); it never creates approval.
Three final rounds, one in flight, 600 seconds per admission, and zero paid API
remain bounded. Native evidence files are audit records, not an authentication
sandbox; the controller cannot prove prose came from a provider by itself.

Installation rollback: restore only changed skill files from verified backups;
retain all task/evidence/registry files. New schema-4 tasks require this version;
do not run them through an older controller. A user-authorized task override
is durable configuration, not a reason to rewrite the global default policy.

This is the operator contract for the existing `workflow.mjs` controller. It reads and records evidence; it does not execute a provider or authenticate a self-authored receipt. Use the matching installed script, `workflow-policy.mjs` and `review-policy.json`. Never populate identity, entitlement, completion, tokens or test results from an example instead of observed execution evidence.

The fixed sequence is Astra `gpt-6-astra` / `xhigh` architecture -> Luna `gpt-5.6-luna` / `xhigh` bounded build -> GLM `glm-5.3` -> Flash `glm-5.3-flash` -> Astra `gpt-6-astra` / `xhigh` adjudication and repair. Repeat the three review seats for each slice and the final combined regression. There is no routine reviewer-selection question, skipped required seat, Quinn self-review, silent parent switch or paid API fallback. A verified user-selected subscription alternative replaces only the builder.

## Evidence preparation

All `{path,sha256}` references below use paths relative to the task's canonical `repoRoot`, actual lowercase SHA-256 of the final file bytes, and JSON evidence files. The plan readiness receipt's own references remain relative to its containing directory. Preserve originals and use unique no-replace filenames per task/slice/round/attempt. Put evolving evidence under `.mega-blueprints/artifacts/<first16 SHA256(taskId)>/` so the existing frozen hook permits evidence writes. Do not put generated build/test/review receipts in the source/plan scope: doing so can create circular hashes.

Capture actual supported tool/provider evidence locally. A normalized `toolEvidence` reference must point to the saved execution result, not a hand-written `{tool:"astra"}` label. Requested model, provider, subscription/extra-usage eligibility and served model must be supported by the real route's evidence. If the route reports no served identity, output count, terminal result or other required field, retain the raw artifact and report BLOCKED/UNPROVEN; do not invent the missing field or treat a diagnostic response as a review.

Before initialization, save an evidence-backed readiness receipt accepted by `check-readiness.mjs`. Save the actual Astra architecture execution evidence and a planner receipt with these fields:

```json
{
  "role": "planner",
  "requestedModel": "gpt-6-astra",
  "servedModel": "gpt-6-astra",
  "provider": "openai-codex",
  "billing": "subscription",
  "effort": "xhigh",
  "status": "complete",
  "planDigest": "ACTUAL_PLAN_READINESS_RECEIPT_SHA256",
  "toolEvidence": {"path": "ACTUAL_ARCHITECTURE_TOOL_JSON", "sha256": "ACTUAL_SHA256"}
}
```

The capitalized values in JSON examples are replacement tokens, not valid receipts. Even fixed identity/status values may be used only after the actual evidence proves them. No example below authorizes writing a success receipt from expectation alone.

## Initialize, enroll and build

The following is the complete default `init.json` shape. `profile` may be omitted to use `sequential-astra`; `all-three` is a compatibility alias for the same ordered route, not a weaker profile. Omit old `localModel`, `confirmed`, and optional-reviewer fields.

```json
{
  "taskId": "ACTUAL_TASK_ID",
  "sessionId": "ACTUAL_NATIVE_SESSION_ID",
  "repoRoot": "ACTUAL_ABSOLUTE_REPO_ROOT",
  "profile": "sequential-astra",
  "planFiles": ["ACTUAL_CANONICAL_PLAN_PATH"],
  "planReceipt": {"path": "ACTUAL_READINESS_JSON", "sha256": "ACTUAL_SHA256"},
  "plannerReceipt": {"path": "ACTUAL_PLANNER_JSON", "sha256": "ACTUAL_SHA256"},
  "slices": [{
    "id": "S1",
    "files": ["EXACT_OWNED_SOURCE_PATH"],
    "builder": {"model": "gpt-5.6-luna", "provider": "openai-codex", "billing": "subscription", "effort": "xhigh"}
  }]
}
```

An alternative builder needs `builderSelectionEvidence:{path,sha256}` for the slice and a complete exact builder assignment. The selection evidence must record `selectedModel`, `provider`, `billing`, `effort`, `userSelected:true`, `available:true`, `extraUsage:false`, `recipientAuthorized:true`, `privacyApproved:true`, `entitlementVerified:true`, `quotaAvailable:true`, and a verified `checkedAt` less than five minutes old at assignment. The real tool must support that exact model/effort on included subscription; a family name such as Opus is not availability proof. Do not infer an alternative merely because the default is unavailable.

Invoke `init STATE.json INIT.json`, then `workflow-hook.mjs enroll STATE.json`, using the fully qualified commands below. The existing registry permits one active task per native session. A running Luna parent requests the required Astra seat through a supported exact-model collaboration call with `xhigh` and a supported bounded/no-history fork; it waits and records the actual separate-seat receipt. No available dispatch means BLOCKED with canonical paths/hashes and the remaining handoff, never a claim of parent-model replacement.

Luna builds, runs tests and debugs only the active slice within the unchanged Astra contract before submission. Architecture decisions, post-review repairs and all review verdicts remain Astra-owned. Run `snapshot STATE.json` after the changes to obtain its authoritative digest and exact file entries, including plan closure. Run the actual acceptance tests. Save a test JSON with `status:"PASS"`, `digest` equal to that snapshot, and the exact executed `command` only after observed success; retain the actual output as evidence. Save a common packet:

```json
{
  "planDigest": "ACTUAL_PLAN_READINESS_RECEIPT_SHA256",
  "sourceDigest": "ACTUAL_SNAPSHOT_DIGEST",
  "testsDigest": "ACTUAL_TEST_RECEIPT_SHA256",
  "files": ["EVERY_EXACT_SNAPSHOT_ENTRY_PATH_IN_SCOPE"],
  "instructions": "ACTUAL_COMMON_REVIEW_INSTRUCTIONS"
}
```

`files` must equal the full active snapshot scope, not just the edited file. Both GLM seats receive these identical frozen packet bytes plus the same referenced source/plan/test material. Flash must not receive GLM's report as extra input. Astra receives this packet plus both completed advisory receipts. Preserve authorized sanitization and all egress/consumption guards.

The initial build receipt uses the actor shape above with `role:"builder"`, exact selected builder identity, `candidateDigest` equal to the snapshot digest, `packetDigest` equal to the common packet file hash, and actual build `toolEvidence`. Do not use `planDigest` in place of the candidate binding. The `freeze.json` input is:

```json
{
  "tests": {"path": "ACTUAL_TEST_RECEIPT_JSON", "sha256": "ACTUAL_SHA256"},
  "packet": {"path": "ACTUAL_COMMON_PACKET_JSON", "sha256": "ACTUAL_SHA256"},
  "buildReceipt": {"path": "ACTUAL_BUILD_RECEIPT_JSON", "sha256": "ACTUAL_SHA256"},
  "inventory": {"glm": {}, "glmflash": {}, "astra": {}}
}
```

The empty inventory records deliberately cannot authorize a dispatch. Populate every required seat from a fresh supported preflight with `model`, `provider`, `billing`, `available:true`, `extraUsage:false`, `recipientAuthorized:true`, `privacyApproved:true`, `entitlementVerified:true`, `quotaAvailable:true`, `checkedAt` and `effort` (`xhigh` for Astra; `null` for the GLMs). Expected GLM provider/billing is `zai-coding-plan`/`subscription`; Astra is `openai-codex`/`subscription`. Unknown, missing, stale or denied evidence blocks the entire required route. Standing task authorization satisfies the existing recipient gate when its exact scope applies; do not ask routinely again.

## Admit and record the three reviews

After `freeze`, only admit `glm`; after its complete valid result, admit `glmflash`; after both valid advisory results, admit `astra`. Each admission requires fresh full inventory and privacy approval for the complete final outbound payload:

```json
{
  "seat": "glm",
  "inventory": {"glm": {}, "glmflash": {}, "astra": {}},
  "privacyApproved": true,
  "dispatch": {"toolName": "ACTUAL_SUPPORTED_TOOL_NAME", "inputHash": "SHA256_OF_JSON_STRINGIFY_EXACT_TOOL_ARGUMENTS"}
}
```

Again, empty inventory is intentionally blocked. Do not manufacture `privacyApproved:true`; it records completed authorized screening. Capture the exact arguments before hashing with `JSON.stringify`; do not change their key ordering/values after admission. The native hook consumes that admitted tool invocation once. Different/replayed/late arguments do not authorize a second call. Keep the returned attempt ID, source/packet digests, reviewer and deadline unchanged.

A complete GLM receipt must contain the following fields; substitute the Flash seat/model/role for its later attempt. Counts and output come from real provider execution, not guessed text length:

```json
{
  "role": "GLM_53",
  "seat": "glm",
  "requestedModel": "glm-5.3",
  "servedModel": "glm-5.3",
  "provider": "zai-coding-plan",
  "billing": "subscription",
  "effort": null,
  "status": "complete",
  "attemptId": "ACTUAL_ADMITTED_ATTEMPT_ID",
  "digest": "ACTUAL_ADMITTED_SOURCE_DIGEST",
  "packetDigest": "ACTUAL_COMMON_PACKET_SHA256",
  "dispatchInputHash": "ACTUAL_ADMITTED_DISPATCH_INPUT_HASH",
  "outputTokens": 0,
  "output": "ACTUAL_FULL_REVIEW_OUTPUT",
  "truncated": false,
  "verdict": "REVISE",
  "findings": [{"id": "ACTUAL_FINDING_ID", "status": "open"}],
  "toolEvidence": {"path": "ACTUAL_PROVIDER_TOOL_JSON", "sha256": "ACTUAL_SHA256"}
}
```

`outputTokens:0` is a deliberately invalid placeholder; replace it with the measured positive total output count, at most 8000. `output` must be nonempty complete reviewer output. Record `APPROVE`/`REVISE` accurately; do not copy the example verdict. Receipt import input is `{ "receipt": { "path": "ACTUAL_REVIEW_JSON", "sha256": "ACTUAL_SHA256" } }`.

Astra uses `role:"ASTRA_FINAL"`, `seat:"astra"`, exact Astra identity/effort and the same admitted-source/packet/dispatch bindings. Its receipt additionally requires `advisoryReceipts:[{path,sha256},{path,sha256}]` in GLM/Flash order and `adjudications:[]`. GLM and Flash roles are `GLM_53` and `GLM_53_FLASH`. All report references must point to their exact current artifacts; do not relabel a local answer as a provider result.

Only Astra may adjudicate findings with `{findingKey:"glm:ID"|"glmflash:ID"|"astra:ID",status:"resolved"|"rejected",reason:"evidence-backed rationale",evidence:{path,sha256}}`. A GLM REVISE is completed advisory input and allows the next seat; open findings still block advancement. Astra REVISE may leave findings open for repair. Astra APPROVE requires every namespaced finding, including its own, resolved/rejected with evidence. Reject unknown/duplicate adjudications and preserve dissent. After current tests, all three ordered reports and full Astra approval, invoke `advance`.

## Repair, final regression and recovery

`fix` input is `{repairReceipt:{path,sha256}}` for actual Astra repair authorization. The authorization actor is `role:"repair"`, exact Astra identity, `candidateDigest` of the old candidate and `toolEvidence`. No in-flight execution may remain. Repair transfers build ownership to Astra: the next `freeze` uses a NEW Astra `role:"repair"` execution receipt bound to the changed `candidateDigest` and new `packetDigest`, not a Luna receipt or the old authorization. Run tests and repeat GLM -> Flash -> Astra for the new round. Preserve findings, counters and old attempt artifacts.

After the last slice, `advance` opens FINAL. Run a fresh combined regression for every final snapshot file. Its test receipt must add `scope:"final-combined"`, `files` equal to the combined snapshot scope, and `planDigest`; use new evidence paths instead of reusing a slice test. Initial FINAL aggregation uses the selected builder's `role:"builder"` execution receipt, with current candidate/packet bindings and `scope:"final-combined"`; this is fresh regression aggregation, not a new implementation license. If FINAL needs an authorized repair, Astra owns it and the subsequent receipt uses `role:"repair"`, exact Astra identity and the new candidate/packet bindings. Freeze, run all three seats and advance. Only the validated final workflow permits IMPLEMENTATION VERIFIED; neither PLAN READY nor BUILT AWAITING REVIEW does.

Caps remain 3 review rounds per slice, 12 total admitted review calls, one in-flight, 600 seconds per call, 8000 total output tokens, zero paid API dollars and no extra usage credits. Minimum review calls are `3 * (sliceCount + 1)`; reject an infeasible plan and preserve capacity for repairs rather than increase caps. A model/provider may count reasoning in billable output; keep that within the same bound.

`pause`/`resume` never reset counters. `reconcile` requires `{receipt:{path,sha256}}` referencing terminal evidence with the admitted `attemptId`, `executionKnown:true`, a reason and status `NOT_SENT`, `FAILED`, `CANCELLED` or `COMPLETED_QUARANTINED`. Timeout alone is not terminal proof. Reconciliation never silently retries or changes a model. Missing capability/entitlement, uncertain execution, invalid identity/output or a cap blocks the affected step with an exact handoff; preserve unrelated local work.

Old-policy state returns labeled `STALE_POLICY` from read-only `status`; safe reads remain possible. It cannot mutate, admit, reconcile or advance under the new policy. Do not rewrite its hash/enrollment, reset counters or delete an uncertain lock. Preserve it and explicitly replan/reenroll. Corrupt enrollment/bindings still fail closed. State files and self-authored receipts are not an authentication sandbox.

## Exact installed commands and transport boundaries

During frozen review the hook verifies executable, controller and state real paths. Use the same executable/skill configured in that host's native hook, actual absolute files, one command, and no wrapper, PATH alias, variable, pipeline or chain. These Windows and Hermes paths are installation-specific examples; root must verify them on the active host before use.

```powershell
& 'C:/Program Files/nodejs/node.exe' 'C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/workflow.mjs' init 'C:/absolute/STATE.json' 'C:/absolute/INIT.json'
& 'C:/Program Files/nodejs/node.exe' 'C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/workflow-hook.mjs' enroll 'C:/absolute/STATE.json'
& 'C:/Program Files/nodejs/node.exe' 'C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/workflow.mjs' status 'C:/absolute/STATE.json'
```

```bash
/usr/bin/node /home/bigotsmasher/hermes2/.hermes/skills/non-vibe-coding/scripts/workflow.mjs status /absolute/STATE.json
```

Use that same absolute controller prefix for `snapshot`, `freeze`, `admit`, `review`, `fix`, `advance`, `pause`, `resume`, and `reconcile`, adding the actual input JSON path for commands that require it. A stale policy allows only `status`, not other controller commands. Native input is event JSON on stdin to `workflow-hook.mjs codex|claude|hermes`; Codex/Claude return supported PreToolUse deny output, Hermes returns `action:block`. New Codex hooks require native trust; installation/reminder text is not proof a session loaded them.

The real Windows GLM scripts are under `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/scripts`. `consult-panel.mjs --seats` hard-codes 34000 output tokens and cannot satisfy this workflow. Use separately admitted existing guarded `consult-glm.mjs --model glm-5.3 --max-tokens 8000`, then `consult-ox.mjs --max-tokens 8000`, with their observed existing packet/egress/consumption arguments. This guide does not invent those runner arguments or an adapter. Never put credentials in commands, bypass guards or infer served identity from a filename. Direct transports do not have to produce the legacy `PANEL-ARTIFACT-RECEIPT.json`; preserve their actual raw artifacts and create the task receipt above from verified facts. Missing required identity/completion/token fields remain BLOCKED, even if prose was returned.

Hermes `scripts/hermes/blueprint-route.mjs` is only a read-only compatibility preflight. It defaults to the strict route without a profile/confirmation question, takes an optional `--inventory` JSON from actual preflight, and preserves the existing context-gateway privacy classifier. Missing privacy guard, missing/stale inventory or an old policy returns BLOCKED; it performs no inference or fallback. No live provider, identity, billing or native-session coverage is proven by synthetic selector tests.



