**Status:** Proposed R2 contract. Proposed types and helper names below are not claims about existing exports.

**C1 — Admission envelope**

A dispatchable envelope contains:

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal integer `2` | Reject other versions until explicitly supported. |
| `runId` | nonempty string | Opaque identifier; no customer identity. |
| `dispatchId` | nonempty string | Unique within the run; one execution claim. |
| `stage` | `review` or `adjudication` | Authority derives from this frozen role. |
| `round` | integer or null | Review: 1–7. Adjudication: null. |
| `seatId` | nonempty string | Must belong to the frozen roster or adjudicator slot. |
| `routeDigest` | SHA-256 hex string | Binds exact route configuration and capability evidence. |
| `policyDigest` | SHA-256 hex string | Binds corpus and restricted-material policy. |
| `requestDigest` | SHA-256 hex string | Binds the finalized request manifest. |
| `contentDigest` | SHA-256 hex string | Binds exact outbound bytes. |
| `artifactDigests` | array of SHA-256 hex strings | Binds admitted source artifacts. |
| `approvalId` | nonempty string | Resolves to approval held by the dispatcher. |
| `budgetReservationId` | nonempty string | Resolves to an active reservation before sending. |

A caller-supplied `approved: true` is never authorization. Unknown fields in security-sensitive envelope objects are rejected.

**C2 — Route and identity**

The route record binds provider, canonical model, endpoint or executable identity, requested effort, billing profile, credential reference, capability profile and evidence timestamp.

Aliases resolve only through the frozen allowlist. Unknown aliases are rejected. Kimi targets are rejected after canonical resolution.

For Astra:

- Requested model: `gpt-6-astra`.
- Requested effort: `xhigh`.
- `gpt-6-astra-pro` is not a substitute.
- Record `servedModel: null` when the transport does not expose it.
- Current route proof establishes the configured request and included transport, not an independently verified served model.

Route proof must be rechecked before dispatch if credentials, command construction, endpoint, model mapping or relevant entitlement evidence changes. Evidence validity intervals must come from the route’s verification policy; no interval is invented here.

**C3 — Frozen content and approval**

Construct the entire request before preview: shared instructions, remit, source content, prior reviews, attachments and provider wrappers.

The request manifest binds:

- Exact content bytes and supported attachment digests.
- Destination, method or executable configuration.
- Role, stage, roster version and round.
- Capability profile.
- Policy version and billing reservation terms.
- Nonsecret request metadata.
- Credential reference, without embedding credential values.

Generate previews from those exact finalized values. Approval identifies their manifest digest.

Batch approval may cover several already-materialized requests, each listed by digest. It cannot approve unknown future model responses.

Later debate rounds and adjudication therefore require approval of their newly constructed requests.

**C4 — Final boundary**

Minimal shared subscription change:

1. `runCodexSubscription()` rejects requests without a valid envelope before `processRunner`.
2. Resolve approval from the dispatcher’s trusted approval store.
3. Validate route configuration and capability profile.
4. Run the final scanner against the complete frozen input.
5. Assert that final processing leaves the approved bytes unchanged.
6. Assert that the final stdin writer emits exactly those UTF-8 bytes.
7. Dispatch once.

Proposed internal seam: `assertApprovedDispatch(envelope, finalRequest)`. Its implementation must inspect actual finalized values; hashing an earlier source document is insufficient.

For HTTP, retain the existing `fetchForEgress()` boundary where compatible. Instrument or wrap its final `fetchImpl` handoff so the actual outgoing body and destination must match the approval.

If `fetchForEgress()` redaction changes approved content, reject. Return to preparation and approval; never silently send altered bytes.

Redirects are disabled. Extra query parameters, unapproved headers, multipart bodies, streams and unsupported attachment channels are rejected.

Authentication is an explicit exception: the selected credential may enter only the approved authentication field for the bound destination. It must not enter prompts, diagnostic output or stored manifests.

**Capability requirement:** A CLI adapter must prove that automatic repository context, ambient instructions, tool access, local files and environment behavior cannot attach unapproved content. Read-only filesystem access alone is not sufficient isolation.

If the route cannot establish that boundary, it is ineligible for controlled Village dispatch.

**C5 — Corpus, media and PRIVATE policy**

Identity redaction does not establish corpus eligibility. Product privacy’s deliberate retention of clinical narrative does not make that content Village-eligible.

The existing artifact-class register is not supplied. Recover and reconcile it in S0. Unknown classes are denied; source code and fixtures receive no automatic exemption.

For each supported media request:

- Specify the exact JSON field schema.
- Scan all textual fields, including prompts, captions, URLs and metadata.
- Permit media bytes only in explicit typed fields.
- Require provenance and content review.
- Bind media digests to approval.
- Verify byte preservation through the final transport.
- Reject unsupported binary content or metadata; do not invent broad “image request” exemptions.

PRIVATE restricted-material policy has three states:

| State | New engine behavior |
|---|---|
| `UNDECIDED` | Reject restricted-material dispatch with `POLICY_DECISION_REQUIRED`. |
| `DENY` | Reject restricted material, including reference codes classified as restricted. |
| `ALLOW_SCOPED_PERSONAL` | Permit only Sean-approved material classes, providers, purposes and destinations encoded in the policy record. Other classes remain denied. |

**Sean-decision-required.**

Reading A treats PRIVATE as insufficient to authorize restricted-material transmission. This provides a simple prohibition but can prevent the `--sref` workflow if those codes fall within the restriction.

Reading B permits a bounded personal workflow, potentially including selected reference codes, while excluding other content. This preserves that workflow but requires explicit classification and destination bounds.

Neither reading is selected here. The pending state affects the new controlled lane and does not authorize changes to existing personal workflows.

**C6 — Scheduling and budget**

Freeze 1–4 proven reviewer routes; never invent or shrink the roster automatically.

- Independent mode: round 1, followed by adjudication.
- Debate mode: a frozen number of rounds from 1–7, followed by adjudication.
- Each reviewer receives one call per scheduled round.
- Within a round, reviewers receive the same previously completed round; a serial execution order must not expose current-round answers to later seats.
- All seats receive the common whole-packet remit and equal frozen output bounds.
- Reviewer specialty is optional emphasis, never a prohibition.

For `N` reviewers and `R` rounds, reserve capacity for `N × R` review calls plus one adjudication call. The maximum is 29 calls for four reviewers and seven rounds; this is a ceiling calculation, not authorization to consume them.

Each call requires explicit input/output limits and timeout compatible with verified route limits. No default is inferred from the dispatch that produced this consult.

For special billing, reserve the verified worst-case cost before sending. For subscription billing, require evidence of included execution and zero incremental API spend.

Unknown pricing or entitlement blocks the route. No fallback or automatic retry.

**C7 — Failure, cancellation and concurrency**

Use an atomic claim for each `dispatchId`. Parallel processes and worktrees must not execute the same dispatch.

Record durable dispatch intent before network/process execution. Evidence-write failure before dispatch means zero sends.

Timeout, process termination or lost response does not prove the provider did nothing. Mark uncertain execution explicitly, retain its reservation, stop dependent rounds and reconcile.

Cancellation prevents future sends and attempts supported termination of the active process. Report whether delivery remained uncertain.

A complete round requires every selected seat’s valid report to be durably recorded. Missing seats, malformed reports and uncertain calls do not become completed rounds.

Adjudication consumes at most one reserved call. Failure does not authorize a replacement call within the same run.

**C8 — Reports and authority**

Every report includes artifact digests, requested route identity, execution outcome, declared coverage, findings with evidence and fixes, and unresolved questions.

`examined` is a reviewer’s coverage declaration, not proof of correctness. `not_applicable` requires a reason. Missing coverage is `unexamined`.

Provider responses are untrusted data. They cannot select routes, change policy, approve content, increase caps, invoke tools or authorize commits.

Astra’s adjudication is advisory to the surviving project-wide Fable gate.

**C9 — Persistence, migration and rollback**

Use existing verified persistence and locking mechanisms where possible. Their APIs and suitability must be established in S0; the packet names locked files but supplies no contract.

Do not edit the locked `run-gate.mjs` or `run-journal.mjs` during another seat’s ownership.

Store approved outbound artifacts and receipts under an access-controlled run root. Do not persist raw credential values or rejected sensitive content in ordinary diagnostics.

No database migration or new environment variable is established by this packet. Any required addition must receive an explicit contract before implementation.

Roll out only after every affected caller is migrated or explicitly blocked. Rollback disables the new controlled-dispatch entry point; it does not restore a privacy-bypassing mode.


---

> **CONTINUED in `03a-tightening.md`** — the closure/tightening tables (B-R2-A). Extracted 2026-09-22 under Astra R2-A1-05 / D5 so both files meet Rule 4 (300-line cap).
