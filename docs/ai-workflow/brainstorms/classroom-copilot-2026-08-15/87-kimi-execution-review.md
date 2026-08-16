# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/85-PACKET-EXECUTION-REVIEW.md
**Seed:** (none)
**Tokens:** 2741 in / 10904 out | **Cost:** ~$0.1718 | **Wall:** 256.6s | **finish_reason:** stop

---

## HOSTILE FINDINGS

1. **P0 — A poisoned pilot was recorded as a final port decision.**
   - Claim attacked: "GATE FAILED — the port hypothesis is dead per its own bar" (`PORT-DECISION-2026-08-16.md`).
   - Why it fails: the session's own self-identified issue #1 states the compression author dropped the production contract's link-suppression nuance — a known authoring defect baked in before the run. A decisive artifact with a known defect measured the *compressor*, not the port pattern. Title-ing the result doc `PORT-DECISION` ossifies a false negative and, per the no-retry ruling, blocks step 9 on contaminated evidence.
   - Fix: reclassify the run as a pilot/calibration run. Rewrite the decision doc to "INCONCLUSIVE — known contract defect; gate re-run requires revised gate + fresh blind corpus." Then either fix the compression (restore the link-suppression rule) or test the composite actually described in §2 — a contract *plus* a deterministic link-suppression post-validator in the approval layer.

2. **P0 — The pass gate is too weak to certify fit and would have passed fabricated child-care tasks.**
   - Claim attacked: pass = `recall ≥ 53.3 && childLinkViolations === 0 && unflaggedChildItems === 0`.
   - Why it fails: 5 false positives — including a fabricated self-care task — do not fail the gate. A run that invents child-care tasks while never mislinking would PASS. The gate also encodes "beat a broken baseline" (53.3%) as the usefulness bar, so it can certify "better than coin-flip" while still dropping 1 in 3 end-of-day items for a preschool safety context.
   - Fix: pre-register a revised gate before any fresh-corpus run: fabricated child-related items count as violations (not benign FPs); total FPs bounded (e.g., 0 fabricated child items, ≤1 benign FP); define an absolute usefulness bar (e.g., recall ≥ 90% with precision bound), not merely "beat 53.3%."

3. **P1 — Single-run, single-seed, n=15 positives: no statistical support for kill *or* for the 66.7% uplift.**
   - Claim attacked: "66.7% (10/15) vs 53.3% (8/15)" used directionally.
   - Why it fails: a 2-item delta on 15 positives has a confidence interval spanning the baseline in both directions; Ollama `temperature 0` does not guarantee cross-run determinism (quantization, batching, seed handling); one item flip inverts the conclusion. (Self-identified issue #4 admits this and proceeds anyway.)
   - Fix: ≥5 seeded runs per configuration; report Wilson CI on recall; use paired per-item comparisons against the baseline; pre-specify the power of the decisive run before touching a fresh corpus.

4. **P1 — Held-out integrity is unproven; the no-retry ruling protects a corpus that may never have been blind.**
   - Claim attacked: "held-out adversarial corpus"; "no retry on this corpus."
   - Why it fails: the contract was authored by an agent with repo access; there is no statement that the authoring context was corpus-sealed, hashed, or access-restricted. If the author saw the corpus, the "hold-out" was void *before* the run, and the seal now protects bad provenance.
   - Fix: hash/seal corpora; authoring prompts must forbid corpus reads with a logged attestation; generate the blind corpus fresh (T-authored dumps or a seeded generator) and bind its hash into the decision doc.

5. **P1 — The harness may launder child-link violations via `invalid childId → null` before scoring.**
   - Claim attacked: "childId validated against the synthetic roster; invalid ids dropped to null" alongside "hard invariants (childLinkViolations on `mustNotChildLink` cases)."
   - Why it fails: packet ordering is unstated. If roster validation/normalization runs before invariant checks, a forbidden link using a non-roster alias is silently erased to null and scored clean.
   - Fix: run `mustNotChildLink` checks on raw pre-normalization output; count dropped-to-null childIds as a separate metric; add scoring unit tests covering adversarial ids; publish the diff or hashes proving scoring parity with the baseline harness ("byte-identical" is asserted, not demonstrated).

6. **P1 — The orchestrator "fix" only works when an env var is set — the bug persists by default.**
   - Claim attacked: "the 15-brain orchestrator's plan-mode spend gate was fixed."
   - Why it fails: default path passes `debatePanels: undefined` → estimator reverts to worst-case recursive pricing → flat plan mode still aborts unless `SWAN_VILLAGE_SINGLE_PASS_DEBATES=1` is set externally.
   - Fix: derive the panel set from the same runtime config object that Phase 2A/2B/2C uses (import it; don't gate on env), and add an integration test asserting a flat plan-mode estimate prices ~$10 without any env var.

7. **P1 — Panel list is hardcoded against a manual one-time read of runtime seats; drift is now silently permissive.**
   - Claim attacked: "panels mirror plan mode's actual Phase 2A/2B/2C debate seats (verified against the runtime code)."
   - Why it fails: verified once, by inspection. Each debate-seat edit now *underprices* the gate, converting a previously fail-closed control into a fail-open one.
   - Fix: export a panel manifest from the debate config module and have the gate consume it; add a CI test that fails when runtime seats differ from the gate's pricing panels; price against a rate card, not constants.

8. **P1 — The minors verdict rests on string search plus a probe that already shipped two zero-manufacturing bugs.**
   - Claim attacked: "no minor/guardian gate … only 'minor' strings are anatomical terms," and "probe counts: all zero."
   - Why it fails: absence of the literal string "minor" doesn't prove absent age logic (gate logic could say guardian/waiver/consent/u18, or live in onboarding/frontend/workers). The probe's v1 shipped an enum-cast bug and an empty-set-undefined bug — both capable of manufacturing zeros; v2's zeros aren't shown to be nonzero-checked. "0 users under 18 by DOB" is meaningless if DOB is nullable/uncollected. Exhaustiveness of the middleware enumeration (alternate entry points: websockets, admin, jobs) is unproven.
   - Fix: re-run corrected queries with sanity checks (e.g., assert non-null counts, log row totals), enumerate every DOB/guardian/waiver/consent column schema-wide, audit onboarding and non-HTTP entry points, and keep the durable probe as the regression tool.

9. **P1 — "Dormant → backlog" sequences a missing control without a tripwire.**
   - Claim attacked: "STRUCTURAL gap with ZERO live exposure today — gating slice goes to backlog."
   - Why it fails: zero exposure is a snapshot, not a control. An absence-of-gate defect re-opens the moment signup flows or sponsor marketing change, and nothing alerts when counts turn nonzero.
   - Fix: tripwire the backlog item — scheduled re-probe with alerting on nonzero guardian/under-18 counts; optionally ship deny-by-default in the chat route (block unless age ≥ 18 or active guardian waiver), which is cheaper than the proposed paid multi-brain escalation.

10. **P1 — The review plan's non-agent items ("install first," "ask T") remain unowned, and the zero-delivery streak continued.**
    - Claim attacked: "This session executed the agent-executable steps."
    - Why it fails: §9 asks what was missed; the execution list covers steps 5(a–c) and 2 only. "Install first," design freeze confirmation, and the two structural unknowns for T are neither executed nor assigned an owner/deadline; step numbering (5, 2) leaves plan items unmapped publicly. Two days of process plus one more session of meta-artifacts still equals zero T-facing value (killing a bad port early is valuable — but only if it unblocks delivery).
    - Fix: publish a plan ledger marking every review item done / blocked / human-owned with named owner and date; prohibit milestone language until a T-facing artifact ships.

11. **P2 — The index-sweep commit was "remedied by documentation," and push status isn't stated.**
    - Claim attacked: "documented, content intact, secret-scanned clean."
    - Why it fails: if unpublished, history should be rewritten (split/rebase); documentation-only degrades reviewability and bisect. "Secret-scanned clean" is only as strong as the unnamed scanner.
    - Fix: rewrite/split if the commit never left local; add a guard script that enumerates staged files and aborts on mismatch with the intended set; require `git status` emptiness checks before staging in shared tooling.

12. **P2 — "Proven by inspection" is a recurring failure mode, not a one-off.**
    - Claim attacked: orchestrator "Proof offered: syntax check clean; gate unit tests pass" alongside the self-identified launcher incident.
    - Why it fails: the launcher was declared runnable without execution; the same evidentiary label ("proof") now appears on an unexecuted integration.
    - Fix: adopt a status-block rule — "proof" = executed command + captured output attached; anything else is labeled UNVERIFIED. Apply it retroactively to §6's claim.

13. **P2 — Contract design flaws beyond the link nuance.**
    - Claim attacked: the compressed contract as the tested artifact.
    - Why it fails: (a) emotion-only content lacks routing rules, producing the fabricated self-care task; (b) free-text JSON-in-fence without schema/grammar constraint leaves enum/parse risk to discipline ("0 parse failures" is luck, not structure — Ollama supports constrained decoding); (c) incident suppression uses a magic literal body string ("incident — complete the school's own form") the deterministic layer must substring-match — brittle; should be a structured flag (`needsReview` + `subtype: incident`).
    - Fix: add explicit routing for affect-only content (→ observation, always needsReview, or excluded); enforce a JSON schema at generation; replace the magic literal with a structured field consumed by the approval layer.

14. **P2 — Roster-in-context has an undocumented constraint.**
    - Claim attacked: "roster provided each run."
    - Why it fails: the port pattern sends children's names into prompts; acceptable only while the model stays local (as here). No constraint is recorded anywhere preventing a future hosted-model swap; harness logs may persist roster+dump content.
    - Fix: record the local-only constraint in the contract doc and in the approval layer's config validation; scrub/pin harness logging.

## VERIFICATION GAPS

- **"Verified against the runtime code" (panels):** inspection on one day; no drift test, no manifest import.
- **Scoring "byte-identical" to baseline:** asserted; no diff, hash, or shared-module refactor offered.
- **Corpus blindness:** no sealing/hash/provenance statement; authoring-context access to the corpus unestablished.
- **Baseline provenance:** live re-repro was claimed — acceptable — but no captured output attached.
- **1 sample, temp 0:** no determinism guarantee established; no variance estimate (self-admitted, then ignored).
- **Orchestrator fix:** explicitly not proven live (awaiting spend permission) yet framed as "fixed" in the session summary; integration path untested.
- **Minors probe zeros:** post-bug-fix results not shown to be non-null/non-empty-checked; DOB nullability unaddressed; middleware-chain exhaustiveness unproven ("only anatomical strings" is a search result, not an absence proof).
- **Git sweep:** push status unstated; scanner scope unnamed; "content intact" unreviewed-for-merging semantics.
- **Rule 82 "richer revision":** no diff or coverage check against the superseded local draft; "richer" is unverified rhetoric.
- **Plan ledger:** steps 1/3/4 and the human items (install, freeze confirmation, ask-T unknowns) have no published disposition.
- **Roster/logging hygiene:** harness retention of roster+dump content not addressed.

## DISSENT

The packet's framing errs in three places. First—and most consequential—the packet treats the gate failure as killing "the port hypothesis," while its own §2 defines the pattern as *model proposals watched by a deterministic approval layer that owns writes*. Child-link suppression belongs in that deterministic layer as surely as in the prompt. A test of a 30-line contract with no deterministic guard measured the weakest architectural variant and called the verdict architectural: the defensible reading the session missed is "contract-only is insufficient; contract-plus-deterministic-guard remains untested," and that reading survives the child-safety bar precisely because the bar should hold at the layer that owns writes, not exclusively at generation. Second, the packet frames the missing minors gate as a "dormant" risk; it is an *absent control*, and absent controls warrant deny-by-default posture or an armed tripwire, not a backlog line with an escalation tier — calling to escalate a simple age/waiver check to a paid multi-brain panel is process inflation in a workstream already criticized for zero delivery. Third, the packet's demanded register ("hostile," full-spectrum panels, gate ceremonies) is itself part of the failure pattern it reviews: the honest verdict on this session is that its best artifact is a well-run *negative result*, and the correct next move is smaller — fix the gate definition, fix the compression, ship one T-facing thing — not more review machinery. I dissent from the packet's implicit premise that more meta-process redeems a delivery drought.

## VERDICT

**REVISE.** The session did real work — it ran the decisive test the prior review ordered, re-reproduced the baseline live, self-reported its incidents, and correctly refused retry on a seen corpus — but two P0 defects stand: the headline "port is dead" verdict was recorded from an artifact with a known authoring defect (measuring the compressor, not the pattern), and the pass gate itself is too weak to certify safety even on a clean run (fabricated child-care items don't fail it). Before step 9 stays blocked, the decision doc must be reclassified from "port killed" to "pilot inconclusive," and the gate must be re-registered with false-positive bounds, then re-run against a sealed fresh corpus — ideally testing contract + deterministic link-suppression guard together, per the pattern's own architecture. The orchestrator change must get its panels from runtime config (not an env flag) and be labeled UNVERIFIED until a live flat run executes; the minors item needs corrected re-probing plus a tripwire or deny-by-default interim; the index-sweep commit must be rewritten if unpublished; and a plan ledger must own the still-unassigned "install first / ask T" items, because the packet's own context admits the workstream's problem is delivery, and this session, again, delivered none.
