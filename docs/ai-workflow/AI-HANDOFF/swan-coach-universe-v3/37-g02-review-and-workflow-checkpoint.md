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

# G02 review and workflow checkpoint

Artifact SCU-G02-37. Version1.1, 2026-09-08. Owner Sean; architect/reviewer/repair owner Astra; required tests Luna Extra High.

Status: scoped G02 source APPROVED by independent Astra. Combined final G02 controller gate BLOCKED by a mid-run global workflow replacement. Full Swan Coach remains open. No commit, push, deploy, schema, provider or production change in this continuation.

## Current authority and exact revision

Sean explicitly retained Astra for architecture, every hostile review, final review and review repairs; Luna Extra High implements and runs required tests. This amends [34](34-astra-hostile-review-and-repairs.md), [35](35-luna-astra-review-loop.md) and the frozen [G02 plan36](36-g02-confirmation-robustness.md); it does not replace the Universe packet.

Worktree: C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906.
Branch codex/swan-coach-astra-owned-20260906; HEAD b88dd9e5c894908d9f193411fe66117294d190ef plus inherited and current uncommitted work. Cached origin/main only. The saved old cwd is deleted; always supply the relocated workdir.

Evidence base: ../../../../tmp/coach-g02-robustness-20260908. Frozen digest: 306a707e9b209a9da44077642224cce878e5e8af6188b05560e3e306b2f00594.

| Production file under frontend/src/components/CoachConfirm | Approved SHA256 |
|---|---|
| confirmationProjection.ts | 2069cde2486a40799c0a3f4af8ef8d956972890c7e88cbad27bc03e633a99bd7 |
| useConfirmationSheet.ts | f17b2435ddc70fc9c946e65f9a6f0496890cd12f372b1f3d55fe64aca92f8f20 |
| ConfirmationSheet.tsx | 919de9942cdc5e73052a6f8b5590e12c4888795afdf8fce035e0a703e1cc218e |

State module, digest protocol and backend were not changed by this continuation. Frozen-review.json binds all source, tests, original preservation and the review request; g02-continuation.diff compares only this continuation with preserved incoming bytes, not all inherited HEAD changes.

## Behavior and traceability

| Requirement | Actual repaired behavior | Evidence |
|---|---|---|
| Q01 | Only absent own projection property is legacy; present-invalid policy cannot confirm and exposes no invalid detail | R01/R02/R10 decoder and mounted hook cases |
| Q02 | Real producer projection-only count/target/display wins; conflicting optional duplicate fields refuse | R02/R10 and browser count1 positive control |
| Q03 | Exact pending-read ID, committed operation lifetime, atomic operation/digest admission, owned arming timer | R03/R04/R05 and source review |
| Q04 | Same-turn confirm/cancel latch; old read/digest/submit/cancel continuations cannot affect replacement/unmount | R06/R07/R08/R09 |
| Q05 | Legacy, physical channel, explicit retry/recovery, caller and responsive behavior retained | Compatibility, actual caller/digest, types/build, browser |

The exact late A1 resolution after A→B→A2 permutation remains source-inspection evidence, not a directly executed regression. Astra explicitly disclosed this limitation. A bounded follow-up regression was requested, but no edit started because the controller rejected the fix-phase transition after the global policy changed.

## Actual verification

| Gate | Result and retained evidence |
|---|---|
| Incoming baseline | 63PASS in4suites; vitest.log and status.txt |
| New behavioral RED | 58FAIL/9PASS in67 new tests; luna-red/final-red-6jH0hL/vitest-red.log. No setup/import failure counted as RED. R04/R08 targeted reproductions also retained. |
| First repaired six-suite run | 128PASS/2FAIL of130; repair/six-suites-first.log. All67 new robustness cases passed. |
| Corrected compatibility | 14PASS; repair/compatibility-corrected.log. Unknown-tier fallback assertion superseded by Q01; inverse fixture corrected to real producer consistency. |
| Final shared-expiry fixture | 9PASS; repair/decoder-shared-expiry.log. One expiry constant removes artificial Date.now millisecond mismatch. |
| Confirmation aggregate | 130 unique green cases across original plus affected reruns; not a single final130PASS invocation. |
| Actual caller/digest | 32PASS in CoachCommandLogEntry.test.tsx and renderDigest.test.ts; caller.log/caller.exit |
| TypeScript | Exit0, no diagnostics; types.exit/types.log |
| Build | Exit0, built1m27s to isolated frontend-dist; build.exit/build.log |
| Browser | 8PASS, zero page errors at390/1440; browser/receipt.json and PNGs. Actual CoachCommandLogEntry→Sheet→hook→decoder and real WebCrypto; synthetic auth/transport. Keyboard recovery focus, visible44px controls, no horizontal overflow. |

Exact reproduction commands and evidence hashes are in combined-tests.json and the preserved logs. Current three production hashes remained unchanged throughout final tests and review. The build/types/caller worker's own hash list accidentally monitored the unchanged state module rather than hook; root independently checked the hook hash before/after, and the repair receipt confirms no production drift.

Initial browser entry-property setup timeout is preserved separately as setup failure. Corrected pre-repair browser RED was the actual incorrect count0 display. No backend/PostgreSQL/provider tests were rerun for this frontend-only delta; doc34's128backend/62PostgreSQL figures remain historical scoped evidence.

## Independent hostile review

Reviewer /root/astra_g02_frozen_review, requested and natively recorded gpt-6-astra/xhigh via included Codex subscription. Verdict APPROVE, no actionable scoped findings. Actual completion and full output preserved in review-round1.md, review-round1-native.json and review-round1.json. Review observed13 frozen hashes,17 evidence hashes,21 original snapshots and aggregate digest consistency; it inspected current caller, both backend mint shapes, state and digest contracts.

Native aggregate output7239 includes reported reasoning subset3223: total_tokens minus input_tokens equals output_tokens. This is native Codex route/accounting evidence, not independent provider attestation or model self-description. No paid credit/reset used. Root budget conservatively retains5 historical admissions plus1 new;6of12 used, counters are not reset.

The approved review was recorded by the then-installed controller at07:28:05UTC. It is a scoped source approval, not full-product/release approval. Inherited malformed-confirm-success defaults and unavailable-read guidance remain unchanged; this review does not certify their broader safety.

## Concrete controller blocker

At07:28:50UTC the installed non-vibe-coding policy changed from version3, hash9b930ab2fd26dad087570289092ff4b7de4d651ea4d29a2f84d12a5b77a65667, to version31/v3.1-strict-sequential-astra, hash79aa03e0f3c44317e85f7bb771837d04c5d42b761656842f510acee8c4d3a8a8. workflow.mjs and workflow-policy.mjs were also replaced externally to this task.

The actual command workflow.mjs fix workflow-state.json exited1: "invalid workflow or policy changed; replan required". Read-only status reports STALE_POLICY, validated:false, and "replan and reenroll; no automatic migration".

The new installed SKILL.md mandates: "Every slice and the final combined state use the ordered review route glm-5.3 -> glm-5.3-flash -> gpt-6-astra". Its policy/controller hard-code that route, reject the existing astra profile, and offer no task-specific compatibility option. This conflicts with Sean's explicit current-task Astra-only instruction, which remains authoritative. No GLM dispatch, global tool edit, policy-hash rewrite, recreated task, counter reset or fabricated migration was attempted.

Current workflow-state.json remains intact: active slice G02-R, round1, review APPROVE, no in-flight call, calls1. The requested fix transition made no state/source changes. The final combined G02 review and advancement are NOT RUN/BLOCKED. Native enrollment was observed earlier; actual native hook interception remains UNPROVEN. Structural receipt validity cannot waive this workflow incompatibility.

## Compatibility handoff and resumption boundary

Owner needed: the task maintaining the global Mega Blueprints installer/controller. Reconcile support for Sean's explicit Swan Coach Astra-only exception through an auditable policy/compatibility path. Preserve this exact state, task/session IDs, source/plan/test/review hashes and root budget. Do not restore old global files over the ongoing installer update or replace completed receipts. Do not silently migrate to GLM or purchase review capacity.

Before resuming, verify the installed controller can represent the authorized reviewer profile and validate the preserved completed review without changing evidence. Re-enrollment/replanning must be explicit and preserve counters and history; it must not relabel old evidence as new-model execution. Then add the exact A1→B→A2 late-resolution regression, run its targeted verification, freeze the changed test scope, obtain fresh Astra review and the final combined G02 gate. Only then activate the next bounded G04a implementation.

G04a architecture preparation is retained in [38](38-g04a-architecture-draft.md). Luna completed the read-only G04a baseline:10files/71PASS, exit0,415.06s; exact commands/logs and unchanged before/after hashes are under tmp/coach-g04a-20260908/baseline/receipt.json. No G04 production code has started. Both installed skill copies (.agents and .codex) were checked and expose the same incompatible version31 policy; no matching installed legacy controller was found.

## Complete packet and operations disposition

Requirements/blueprint/desktop-mobile wireframes/flowchart-Mermaid/contracts/state-sequence/privacy-permissions/test plan/traceability/ordered slices/operations/hostile review/preservation remain in plan36 and canonical13–19/31/32/34/35. Mermaid source is retained; no local rendered-preview claim. ERD/migration: N/A for this frontend repair, no persistence change. Existing rollout and rollback boundaries remain: isolated original snapshots plus retained restore samples, scoped candidate restore only, rerun affected gates. No blind dirty-tree rollback or domain undo.

Readiness disposition: PLAN READY was structurally verified before implementation; current source independently Astra-approved with actual scoped tests. Final implementation receipt cannot pass the current controller; full IMPLEMENTATION VERIFIED and DEPLOYED are not claimed. Source/evidence preservation and this checkpoint remain usable for resumption. No automatic continuity closeout.
