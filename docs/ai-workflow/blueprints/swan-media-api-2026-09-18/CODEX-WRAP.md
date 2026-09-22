# Codex Subscription Consult — 2026-09-19T23:25:08.821Z

**Provider:** openai-codex
**Billing:** chatgpt-subscription
**Authentication:** chatgpt_subscription
**Transport:** codex-cli
**Requested model:** unspecified
**Served model:** unknown
**Tokens:** in=159041 out=3812
**Packet:** swan-review-20260919232342869-ee6bbb1a68ae
**Elapsed:** 85.9s

---
I’ll adjudicate only the named packet files and the three requested counterchecks. I’ll treat Astra’s source-read claims as unexecuted hypotheses, not runtime proof, and I’ll preserve the distinction between a valid design finding and a finding whose severity or fix is overstated.

## Plain-English Summary

**Adjudication: PARTIAL / DRAFT only.** Astra’s review is not a completed hostile review: it ran no tests, did not rerun the 29 gates / 1097 assertions, and was not archived. Its source-based design findings can still be valid, but their evidentiary weight is limited to static inspection.

The strongest corrections are:

- **A1-09 is TRUE and severity Medium is appropriate.** `grant_recorded:false` is dishonest when `readGrants(env)` can produce an applicable grant. The explanatory comment is misleading because runtime evaluation does not prevent recording the decision snapshot.
- **A1-02 is OVERSTATED at High.** The escape hatch is a real policy defect if literal loopback is non-negotiable, but it is disclosed and operator-acknowledged. That lowers severity to Medium unless the prohibition is formally absolute. Deleting the override is only correct if the policy truly forbids every acknowledged exception.
- **The wireframe N/A is valid.** A headless HTTP API has no browser/mobile UI surface. The 17-line file explicitly names what is absent and supplies caller-visible states; this is not a silent omission.
- **The 300-line violations are real defects.** `01-architecture.md` is 321 lines and `03-contracts.md` is 355 lines. They violate the stated cap and must be split.
- **The A2 corrections are mostly present in the numbered package, but not in a PART B section.** The claim that they were “incorporated in Part B” is false as written because no PART B exists in the supplied files.

## Per-finding adjudication

Line references below are to the supplied packet files. References to `server.mjs`, `routes.mjs`, `ASTRA-PRO-REPLY.md`, and similar files are only claims recorded by Astra; those source files were not within the requested review scope.

### A1 findings

**A1-01 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:18`; `00-README.md:1-3`; `01-architecture.md:20-22`.

The package states Wan remains authoritative and explicitly says H3 substitution is unsupported. Replacing Wan with H3 would contradict the stated Slice 1 gate.

Fix: retain Wan as Slice 1; require the actual audited graph and block if it cannot be identified.

Runtime weight: static/design finding only; no execution proof.

**A1-02 — OVERSTATED, proposed severity High → Medium**

Evidence: `HOSTILE-REVIEW.md:19`; `03-contracts.md:274-286`; `06-bans.md:3-4`.

The escape hatch is real and undermines a literal-loopback policy, but the supplied description says it is disclosed in the refusal path and requires operator acknowledgement. That makes it an explicit exception, not a hidden bypass.

A disclosed exception can still be unacceptable, but High requires evidence that the policy is absolute and that the acknowledgement is forgeable, unattended, or routinely available to an unauthorized operator. That evidence is not in the requested files.

The proposed fix—delete the variable—is correct only if the intended rule is “no non-loopback binding under any circumstance.” If supervised operator-approved exceptions are part of the actual policy, the correct fix is to retain the escape hatch behind an explicit authorization/audit boundary and ensure the default remains fail-closed.

The user’s note that the forged package rejects the variable is not evidence that the implementation does so; it only shows the plan’s intended target.

**A1-03 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:20`; `00-README.md:31-41`; `03-contracts.md:40-49`.

The package itself requires readiness to be profile-bound, timestamped, and evidence-backed. Enablement alone cannot establish graph, binding, resource, or backend readiness.

Fix: derive `runnable` from a fresh profile-bound inspection; return `false` with blockers when evidence is absent.

Runtime weight: no live readiness test was run, so this remains a static source finding.

**A1-04 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:21`; `03-contracts.md:211-238`; `09-tests.md:42-43`.

The stated recovery requirements correctly identify two independent hazards: malformed collection fallback can erase history, and count-based retention can discard unresolved records.

Fix: schema-validate every record; block startup/admission on malformed state; never prune unresolved jobs, reservations, leases, journals, or idempotency tombstones.

Runtime weight: unexecuted. The package’s own test is marked TO IMPLEMENT / NOT RUN.

**A1-05 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:22`; `03-contracts.md:68-76`; `03-contracts.md:220-231`.

The contract requires fingerprint comparison, durable idempotency, and admission before dispatch. Astra’s finding directly matches those requirements.

Fix: atomically persist principal, key digest, request fingerprint, quote consumption, reservation, and job before dispatch eligibility; return `409` on changed payload.

Runtime weight: unverified; no concurrency or over-wire test ran.

**A1-06 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:23`; `03-contracts.md:238-254`; `05-slices.md:57-61`.

The package correctly distinguishes admitted volume from provider charge. Failed or canceled admitted jobs retain volume consumption, and unresolved exposure persists.

Fix: reserve atomically at admission; retain volume and paid exposure according to settlement rules; test simultaneous admissions and failure paths.

Runtime weight: design-level only.

**A1-07 — TRUE, High**

Evidence: `HOSTILE-REVIEW.md:24`; `04-build-order.md:11-18`; `05-slices.md:3-16`.

The package requires durable admission and recovery for the Slice 1C exit while placing those mechanisms in 1B. That is an internal dependency conflict unless 1B is explicitly part of Slice 1 before 1C.

Fix: make minimum journal, admission, lifecycle seam, lease integration, and restart recovery prerequisites of Slice 1C; leave exhaustive hardening to Slice 2.

**A1-08 — TRUE, Medium**

Evidence: `HOSTILE-REVIEW.md:25`; `03-contracts.md:242-254`; `03-contracts.md:300-302`.

The package says H3 seconds are unsupported and that `$0.13 × 6 = $0.78` is published arithmetic, not verified capability. A headline claiming local H3 at six seconds would overclaim.

Fix: distinguish hosted published-rate arithmetic from audited local execution and measured output duration.

**A1-09 — TRUE, Medium**

Evidence: `HOSTILE-REVIEW.md:26`; `03-contracts.md:113-126`; `03-contracts.md:183-191`.

Based on the counter-evidence supplied in the request, `routes.mjs:69` hardcodes `grant_recorded:false`, while `generateVideo.mjs:151,255` calls the pure `readGrants(env)`. Therefore the grant decision is available at runtime and can be snapshotted.

The field is dishonest when a grant actually authorizes the operation. The comment saying the grant is read per-job does not justify recording a permanent false value; it is misleading because per-job evaluation is precisely when the result can be captured.

Severity Medium is appropriate: this is evidence/contract dishonesty and can affect authorization/audit interpretation, but the supplied evidence does not prove that it independently permits an unauthorized execution.

Fix: call the authoritative grant reader during quote/admission, record the actual decision and evidence reference, and reject if the decision cannot be truthfully snapshotted. Add a test for granted and denied environments.

Runtime weight: the source claim is user-supplied counter-evidence, not independently executed by this review.

**A1-10 — TRUE, Medium**

Evidence: `HOSTILE-REVIEW.md:27`; `02-wireframes.md:15-17`; `03-contracts.md:129-151`.

The contract exposes `charge_bound_verified`, yet the package states that arithmetic does not establish a maximum charge. Calling published arithmetic a bound would be misleading.

Fix: expose an explicit false/unverified status and use wording that arithmetic neither authorizes execution nor proves a maximum charge.

**A1-11 — TRUE, Medium**

Evidence: `HOSTILE-REVIEW.md:28`; `03-contracts.md:31-38`; `03-contracts.md:258-270`.

The package accepts server-owned assets but does not fully define ingress provenance in the supplied documents, while also requiring indefinite idempotency protection. Those are real unresolved contract choices.

Fix: restrict inputs to qualifying existing gateway-owned assets; explicitly block external ingestion; retain compact idempotency tombstones indefinitely or until a formally equivalent replay-protection policy exists.

**A1-12 — TRUE, Medium**

Evidence: `HOSTILE-REVIEW.md:29`; `00-README.md:17-28`; `07-checkpoints.md:3-9`.

The package correctly says historical receipts must not be treated as current execution evidence and requires commit/diff identity, commands, environment, exit status, and artifact hashes.

Fix: label stale receipts historical/unreproduced and attach new evidence to the exact immutable source identity and dirty-tree hash.

### A2 self-corrections

The claim that these were “incorporated in Part B” is **FALSE as a document-structure claim**: the supplied `HOSTILE-REVIEW.md` contains Part A and an A2 table, but no Part B. The corrections are nevertheless reflected to varying degrees in the numbered package.

**A2-01 — TRUE as an incorporated design correction**

Evidence: `HOSTILE-REVIEW.md:35`; `01-architecture.md:27-31`; `04-build-order.md:13`.

The package separates gateway persistence ownership from GPU resource authority and forbids a new GPU lock.

Correction: rename the claimed location from “Part B” to the actual numbered architecture/build-order sections.

**A2-02 — TRUE**

Evidence: `HOSTILE-REVIEW.md:36`; `01-architecture.md:59-63`; `03-contracts.md:68-76`.

Replay/conflict resolution precedes new quote consumption, and changed fingerprints conflict.

Correction: add an executable test proving same-key replay succeeds after quote expiry/consumption while changed payload returns `409`.

**A2-03 — TRUE**

Evidence: `HOSTILE-REVIEW.md:37`; `01-architecture.md:117-120`; `03-contracts.md:183-191`.

Execution state and settlement state are separate; successful asset publication does not depend on fabricated vendor settlement.

Correction: preserve this as an explicit acceptance assertion, not merely prose.

**A2-04 — TRUE**

Evidence: `HOSTILE-REVIEW.md:38`; `01-architecture.md:122-124`; `03-contracts.md:248-255`.

Rollback does not restore old accounting over later submissions and preserves unresolved exposure.

Correction: add the migration/rollback test named in `09-tests.md:77-78` and record its result.

**A2-05 — TRUE**

Evidence: `HOSTILE-REVIEW.md:39`; `05-slices.md:11-14`; `09-tests.md:1-8`.

Future suites are explicitly marked TO IMPLEMENT / NOT RUN, and the snapshot audit is distinguished from behavioral proof.

Correction: fix the manifest’s document count/order discrepancy separately; do not describe future tests as existing evidence.

**A2-06 — TRUE**

Evidence: `HOSTILE-REVIEW.md:40`; `03-contracts.md:265-270`; `09-tests.md:67-68`.

The package requires redirect revalidation, destination validation, and no guessed CDN contract.

Correction: make the redirect-policy test mandatory before hosted ingestion can be enabled.

**A2-07 — TRUE**

Evidence: `HOSTILE-REVIEW.md:41`; `03-contracts.md:248-251`; `08-decision-density-self-test.md:28-29`.

Clock rollback blocks new admissions and cannot reopen a spending period.

Correction: require persisted day progression and test process restart across a backward clock movement.

**A2-08 — TRUE as a prohibition, not as proof of execution**

Evidence: `HOSTILE-REVIEW.md:42`; `07-checkpoints.md:61`; `05-slices.md:61-72`.

The package does not provide a live command and requires authorization plus a bounded manifest before live verification.

Correction: state explicitly that this is a safety boundary, not evidence that a live verification workflow has been executed.

## Separate package defects

**Wireframes: NOT A DEFECT**

Evidence: `02-wireframes.md:1-17`.

This is a valid N/A. It identifies the absent UI surfaces and replaces them with caller-visible JSON states. A headless HTTP gateway has no desktop/mobile wireframe obligation unless an administrative UI is in scope.

**Line-cap violations: TRUE defect**

Evidence: `MANIFEST.md:5-16`.

`01-architecture.md` is 321 lines and `03-contracts.md` is 355 lines. The stated cap is 300 lines for new source files in `04-build-order.md:3`, but the repository rule quoted by the user applies the cap broadly to files. Even if the cap were intended only for source files, the package should state that exception explicitly; it currently does not.

Fix:

- split architecture into ownership/flow, persistence model, and adapter/recovery sections;
- split contracts into request validation, REST/response types, accounting/recovery, and network/artifact policy;
- update `MANIFEST.md` line counts and any splitter/readiness checks.

**Manifest identity defect: TRUE**

Evidence: `MANIFEST.md:1-3`; `00-README.md:1-3`.

The manifest says “Social Bridge Completion Blueprint” and points to a social-bridge packet, while the package itself is Swan Media API. This is a provenance/identity error.

Fix: regenerate the manifest from the actual Swan Media API source packet and verify hashes/filenames before treating the package as preserved.

**Missing PART B: TRUE**

Evidence: `HOSTILE-REVIEW.md:1-52`.

The review claims A2 corrections were incorporated in Part B, but the supplied review ends after the A2 table. The numbered files contain corresponding decisions, but no Part B section or explicit change-to-document mapping.

Fix: either add a real Part B with exact file/line mappings and verification status, or change the claim to “corrections reflected in the numbered draft package.”

## Final score

- A1: **10 TRUE; 2 OVERSTATED/adjusted** — A1-02 severity/fix, and A1-09 confirmed TRUE but only at Medium rather than implying a stronger authorization failure.
- A2: **8 TRUE as design corrections; FALSE as “landed in Part B.”**
- Wireframe N/A: **correct.**
- Package integrity: **defective** because of the absent Part B, over-limit documents, and manifest identity mismatch.
- Review status: **DRAFT / INCONCLUSIVE for runtime behavior.** No execution, rerun, archive filing, or reindexing occurred.

The package should not be treated as implementation-ready or as a completed hostile-review receipt.
