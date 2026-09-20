**Title:** Swan Coach Command Center — AI Harness Safety and Integration Blueprint  
**Package ID:** `CC-AI-HARNESS-20260920`  
**Proposed location:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coach-ai-harness-20260920/`  
**Status:** `PLAN DRAFT — INTEGRATION EVIDENCE REQUIRED`  
**Implementation verified:** No.  
**Deployed:** Not established.  
**Review basis:** Supplied packet at reported HEAD `ffe4f805e`; dirty-tree contents are not hash-bound.

**Outcome**

A coach’s submission has one authoritative outcome: a read result, a reviewable action, an executed action with a committed receipt, an explicitly permitted chat request, or a clear non-execution/unknown state. Model prose never acquires permission to mutate application data.

**Scope**

The mounted Coach submission path, command execute/confirm/cancel, operation recovery, chat provider admission, and the boundary between generated proposals and approved actions.

Preserve the three existing role routes. Preserve Talk, Review, and History. This is a harness upgrade with state-specific UI changes, not a replacement dashboard design.

**Excluded implementation**

Voice recording, transcription/TTS internals, Plaud ingestion, quick-client onboarding, exercise programming algorithms, subscription pricing, provider ranking, internal Hermes/Brain Console behavior, and unrelated module cleanup. Their interfaces must not acquire an alternate route around the new guards.

**Requirements and acceptance**

| ID | Requirement | Measurable acceptance |
|---|---|---|
| H01 | One authoritative outcome per submission | Exhaustive reducer tests; mounted submit never calls chat after a denied, failed, unsupported, or unknown command |
| H02 | Server-owned action preview | Confirm accepts only operation identity; altered displayed parameters cannot change execution |
| H03 | Current authorization and client scope | Cross-actor, revoked-access, changed-target, and stale-version cases produce no domain write |
| H04 | Bounded replay protection | Concurrent confirmations commit at most one supported domain effect and one success audit |
| H05 | Registry-owned write classification | Write-pause tests cover every enabled mutating dispatcher; no second risk registry |
| H06 | Enforced provider privacy boundary | Final provider-request capture contains only admitted template content and fields |
| H07 | Model output is untrusted | Invalid output, fabricated tools, and injected instructions produce no dispatcher invocation |
| H08 | Honest receipts and recovery | Lost responses and browser handoffs never produce unsupported “saved” claims |
| H09 | Accessible floor workflow | Required states verified at 375px and desktop; 44px targets; keyboard and reduced-motion checks |
| H10 | Reproducible evidence | Source hashes, commands, results, and boundary classifications accompany each checkpoint |
| H11 | Compatible, recoverable rollout | Legacy previews cannot bypass upgraded checks; rollback blocks writes before restoring old handlers |

**Authority**

This directory becomes the harness decision authority only after the architect checkpoint accepts its source supplement and supersession map.

- Preserve the approved Cortex authority stack.
- Preserve existing kill-switch defaults.
- Preserve historical UX and atomic-save evidence.
- Replace only harness-specific decisions explicitly listed in the approved map.
- Do not claim that a rejected internal Brain Console document governs this public surface.
- Review-chain decisions follow this commission: builder → Gemini → independent Codex/Astra hostile input → Fable/approved Claude Final Decider. This Astra response is advisory, not commit approval.
- Review filing uses **Rule 86**.

**Source supplement required at S0**

The caller supplies these bytes to the zero-repository-access builder:

1. Relevant route-rendering JSX and the mounted submit/confirm/cancel call chain.
2. Full current contents and imports of every file to be edited.
3. Registry schemas, enabled command entries, and the selected dispatcher implementations.
4. Existing pending-operation implementation and every model touched by selected writes.
5. Auth, client-access, subscription, rate-limit, audit, and transaction helpers.
6. Chat generation call sites, provider adapter contract, prompt/context construction, and output checks.
7. Proposal approval/rejection/clarification implementations and models if those paths are touched.
8. Actual package scripts and representative unit, integration, and browser test files.
9. Snapshot hashes, relevant diffs, ownership locks, existing review IDs, and reconciliation receipts.
10. Approved provider template definitions, policy fixtures, and existing environment-variable names.

Missing material is a named S0 blocker. The builder is not instructed to browse the repository or guess it.

**Builder Contract**

> You are the builder, not the architect. Follow the package to the letter. Where the package decides, you do not re-decide — even if you'd do it differently. Where the package is silent on something that matters, STOP and return the question; do not improvise. Build ONE slice at a time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a criterion passed without pasting its output.

**Build sequence:** S0 evidence/adjudication → S1 pure contracts → S2 durable operations → S3 command integration → S4 provider/proposal boundary → S5 mounted UI → S6 combined verification.

**Current evidence:** All proposed tests are `NOT RUN`. Secret scan is `NOT RUN`. Diagrams are literal Mermaid source; rendered previews were not produced in this text-only pass. Archive filing belongs to the caller and remains unverified.
