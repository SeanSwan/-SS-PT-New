---
artifact_id: SWAN-CHART-KG0-EXTERNAL-REVIEW
owner: lead Codex; Sean payload approval
version: 3.2
effective: 2026-09-04
status: COORDINATOR PAIR EXECUTED ONCE; BOTH EMPTY/TRUNCATED; EXTERNAL REVIEW VOID
supersedes: no new model request in13; local KG0 evidence remains valid
---

# Requested GLM pair: executed, but no usable review returned

The coordinating task relayed Sean's request to continue chart slices with GLM5.3 and
GLM5.3Flash reviews when available. The lead verified the current subscription route and
prepared a bounded KG0-only packet. The platform then rejected process creation because
the trusted request did not specifically authorize THIS source/test payload to Z.ai.
No workaround or alternate launcher is authorized. No provider call or retry occurred.

An async question in this chart task requested informed approval for the concrete export.
The coordinator subsequently reported Sean's specific approval and explicitly took ownership
of executing the single pair. This chart task will NOT launch a duplicate or retry. Await its
provider receipts and approval reference before reporting a fresh review as completed.
Local KG1a test-guard work is independently authorized by16 and does not export additional code.

## Executed pair: lead-verified artifacts, no verdict

Coordinator task `01a06d9a-206a-7263-85fc-5fd136231822` reported the exact payload approval
and executed the pair once. This chart task did not retry its rejected process. Parent read
both generated artifacts and independently verified their SHA-256 hashes and empty bodies.

| Requested / served | Artifact under tmp/qa/kg0-glm-20260904-r2 | Usage / outcome |
|---|---|---|
| glm-5.3-flash / glm-5.3-flash | glm-5.3-flash.md |6920 input,16000 output,15995 reasoning;334.5s; INCOMPLETE, body(empty) |
| glm-5.3 / glm-5.3 | glm-5.3.md |6919 input,16000 output,16000 reasoning;194.5s; INCOMPLETE, body(empty) |

Flash SHA-256: `e66a037cd63b9ba2d41a11a9aa8837012f8ddec5d8d8ab388d231cf2654cd87e`.
Standard SHA-256: `188df62801bf894cd1091d9493ff40a789831a95c802b0a7ed6428a0002ec643`.
Both were bound to the exact packet hash below. Total45839 tokens consumed from existing
allowance, including32000 output tokens; no metered-spend increase or fallback was authorized.
Coordinator reported both started/finished ledger entries and lock release. Source identity
is verified in the artifacts; useful review content is absent. Verdict: VOID / NON-ADMISSIBLE.
No code finding, approval, disagreement or confidence score may be inferred from these runs.
No retry: a new review attempt requires new explicit authority. A later response to the
original async question is not by itself an instruction to repeat the already-executed pair.

## Exact proposed disclosure

Generated packet: `tmp/qa/kg0-glm-20260904-r2/packet.json` in the shared doc host.
SHA-256: `468c9472f94992571a3cb305650a0fb250d7243e5bc1e33e349f5a462762ad3a`.
24,015 characters before final newline; source code plus synthetic test/context only.

| Exported name | Actual local source |
|---|---|
| shared/units/weight.mjs | New isolated chart worktree, same path |
| shared/units/weight.d.mts | New isolated chart worktree, same path |
| shared/units/__tests__/weight.test.mjs | New isolated chart worktree, same path |
| lead-gates/weight-units.red.mjs | Canonical chart packet/weight-units.red.mjs |
| lead-gates/verify-weight-types.mjs | Canonical chart packet/verify-weight-types.mjs |

No client records, credentials, authenticated captures, private configuration, full repository,
or absolute workstation identities are included. The meaningful risk is disclosure of these
five internal implementation/test files to external Z.ai. Sanitization does not remove that risk.

Destination: `https://api.z.ai/api/coding/paas/v4/chat/completions` via current
`scripts/consult-ox.mjs`→`consult-glm.mjs` and `fetchForEgress()` at the socket boundary.
Exactly `glm-5.3-flash` then `glm-5.3`, one attempt each,16,000 output-token cap each,
12-minute timeout each, round ID `chart_kg0_review_20260904`. No retries/substitution/fallback.
Current seat registry declares both paid:false, zero metered input/output rates; the route
uses existing subscription allowance. Metered spend cap is$0, not permission to buy quota.
Their shared provider lineage means agreement is tiered input, not independent corroboration.

## Pre-dispatch evidence

- `node scripts/lib/redact-egress.test.mjs` →45/45 passed.
- `node scripts/lib/glm-consumption-guard.test.mjs` →6/6 passed.
- `node scripts/consult-glm.identity.test.mjs` →7/7 passed.
- Read-only guard probe before attempted launch: credential present (value never printed),
  lock absent,6 rounds started in current batch, new round would leave8 after starting.
  That was a snapshot, not a lease; re-check at any subsequently authorized dispatch.
- Five packed source hashes survived sanitization exactly; a second redaction scan found0
  additional hits. Independently checked before launch. Packet manifest records original hashes.
- `node --check .../prepare-kg0-review.mjs` →exit0. Existing-output negative control →exit1
  with explicit overwrite refusal; the packet was not changed.
- The rejected tool response prevented process creation. Follow-up read-only ledger check:
  this round has0 events; flash.md and glm.md both absent. There is no model verdict or usage.

## First packet withheld locally

`tmp/qa/kg0-glm-20260904/packet.json` had six sources: the optional property-test file
included a numeric seed caught by the privacy filter, so its source hash no longer matched.
It was never submitted. The lead did NOT weaken the redactor or change the tested source.
The replacement omits only that optional file and explicitly tells reviewers its result is
a lead claim, not attached evidence. The packer now refuses any changed source hash BEFORE
writing output, and refuses replacing an existing directory. Both local packets are retained.

## Resume rule and retention

For any newly authorized future review, verify the exact packet hash, all source hashes,
current guard/lock and transport bytes again. New source edits require a new packet and accurate approval scope;
do not replay this packet as evidence for KG1 or later slices. Require nonempty complete output,
exact served identities and concrete evidence markers before accepting either review.
The already-executed pair remains VOID; do not resubmit it automatically or call it a review pass.

No immutable global approval, next15-round batch approval, paid allowance or recurring job
was created. The existing fifteen-round checkpoint remains enforced. The shared guarded
transport was selected explicitly by the coordinator; no separate queue branch was copied.
Retain both packet directories/manifests with the chart QA artifacts; no cleanup was performed.
