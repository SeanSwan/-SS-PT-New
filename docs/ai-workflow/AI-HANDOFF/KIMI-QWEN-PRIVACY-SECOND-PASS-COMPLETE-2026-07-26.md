# Kimi K3 - Second-Pass Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** .\docs\ai-workflow\AI-HANDOFF\QWEN-KIMI-PRIVACY-ROUTING-REVIEW-PACKET-2026-07-26.md
**Document SHA-256:** `6cdbbc7ad1766c249d12306096848c473af2f8fce9861e0c04587afac0b05f45`
**Seed:** .\docs\ai-workflow\AI-HANDOFF\OPUS-QWEN-KIMI-PRIVACY-REVIEW-COMPLETE-2026-07-26.md
**Tokens:** 6552 in / 8841 out | **Cost:** ~$0.1523 | **Wall:** 288.2s

---

# KIMI K3 — SECOND-PASS HOSTILE REVIEW

**Reviewer:** Kimi K3, acting independently. Opus's review was read but every load-bearing claim was re-derived from the original document before being accepted, rejected, or qualified.
**Repository claims:** Unverified. Like Opus, I treat all statements about `aiWorkoutController.mjs` and `deIdentificationService.mjs` as proposer assertions pending Phase 0.

---

## 0. CONFLICT-OF-INTEREST DISCLOSURE (read first)

The original document asks Kimi (Q9, Q10) to judge whether **Kimi** is materially better than local Qwen and to deliver a SHIP/REVISE/REJECT verdict on a route terminating at **Kimi**. That is a structural conflict of interest that **Opus did not flag** — understandably, since it is not his conflict. It is mine.

Rules I apply to myself, and that Swan should apply to this review:

1. My assessment of external-model value must be **discounted** as a source. The Phase 1 value proof must be run by Swan with blinded human raters, not delegated to any model's self-report — mine included.
2. I cannot self-certify S1-7. "Kimi K3" is a Moonshot AI product; Moonshot is a PRC-domiciled provider. The jurisdiction, state-access, sub-processor, and retention questions Opus raised apply to me **directly and materially**. Anything I say about my own retention or training behavior is marketing-grade evidence and should be treated as such. Only contract, technical verification, and counsel count.
3. Where my conclusions converge with Opus's, that convergence is because the findings are independently derivable from the document — the disagreement and correction sections below demonstrate this is not deference.

---

## 1. VERDICT

**REVISE — external route remains dark; concur with Opus's operational outcome, on partially different and additional grounds.**

Independent re-derivation reaches the same terminal judgment: the gateway rewrite, red-flag triage, and Tier-0 deterministic engine are approvable now; the external hop is not authorized and its value is unproven. However, I find Opus **overstated three claims**, **misdesigned the decisive evaluation**, and **missed at least six findings**, including the review-design conflict of interest, provider model-version drift, and the fact that **the document's own example payload is arguably ineligible for external routing under any sane red-flag policy**. Details below.

---

## 2. AGREEMENT / DISAGREEMENT MATRIX

| Opus finding | Position | Basis (independently derived) |
|---|---|---|
| S0-1 Pseudonymous, not anonymous | **Agree** | Retained `caseToken→client` mapping is textbook pseudonymization (GDPR Recital 26 logic). The word "anonymous" appears throughout the proposal and is disqualifying vocabulary. |
| S0-2 LLM in egress path | **Agree — strengthen** | The outbound object must be built by deterministic code only. But note the doc says *"optionally"* (Step 3) — the fix is to **delete the option**, not redesign the flow. Opus slightly misframes this as the design rather than a removable defect. |
| S0-3 Longitudinal linkability | **Agree, qualify wording** | Correct and the strongest technical finding. "Trivially reconstructable" is too strong *after* Opus's own mitigations (bucketing, no temporal indices, truncated trends); "plausibly reconstructable with side knowledge" is accurate. Residual risk is reducible, **not eliminable** — must be owner-accepted. |
| S0-4 No red-flag/scope gate | **Agree — extend** | See K-7: the document's own example case sits at the referral boundary. This is the most serious safety gap and Opus is right that it is independent of privacy. |
| S0-5 Unmanaged egress | **Agree in substance; PARTIAL on the identifier claim** | APM/error-SDK/queue body capture is a real S0. But "allowedExerciseIds and requiredOutputSchema violate the document's own ban on internal identifiers" is **overstated**: the ban covers *infrastructure* identifiers; exercise IDs are domain ontology. The valid objection is entropy/fingerprinting (S2-15) and tenant-brand leakage in `swan_workout_recommendation_v1` (K-9) — not a self-contradiction. |
| S1-6 Escalation budget | **Agree — extend** | Add the abuse case (K-3): the budget is also an availability attack surface. |
| S1-7 Provider jurisdiction | **Agree — and it applies to me** | Cannot be self-certified. Add: provider-side **model version drift** invalidates validation evidence (K-2). |
| S1-8 Output semi-trusted | **Agree** | Re-validation against the *full private constraint set* (not the lossy minimized case) is the key control and the proposal lacks it. |
| S1-9 Local vision ≠ safe | **Agree** | Image-borne prompt injection feeding the case object is a real path; reinforces S0-2's coercion rule. |
| S1-10 Provenance vs no-prompt-body | **Agree — harden** | Deterministic reconstructability via versions + HMAC is the right resolution. Add K-5: bucketed payloads are low-entropy; a leaked HMAC key makes digests dictionary-attackable. Salt per record. |
| S1-11 Trainer approval under-specified | **Agree** | Unmeasured human gate = liability transfer. Correct framing. |
| S2-12 Retries/queues/degraded mode | **Agree** | Queue-as-new-health-data-store is a genuine and commonly missed point. |
| S2-13 Horizontal-scaling correctness | **Agree** | Atomic single-use token store, version pinning, fail-closed on skew. |
| S2-14 Psi Brain isolation must be mechanical | **Agree** | Contract test in CI is the correct enforcement. |
| S2-15 Buckets; drop exercise IDs | **Agree — note the consequence** | Answering in movement patterns shrinks the external model's residual contribution to pattern-level sequencing — further evidence for the "presumed negative" value prior. |
| S2-16 K-anonymity without denominator | **Agree** | Drop the word or define the cohort. No third option. |
| S3-17 Testability gaps | **Agree — extend** | Add metamorphic testing (K-8 companion): perturbing one private field must produce a *predictable or zero* change in egress; any unpredictable delta fails the build. |

**Net:** I confirm 17/17 Opus findings in substance, with 4 requiring qualification. The convergence is substantive, not deferential — the corrections below are where this review earns its existence.

---

## 3. WHERE OPUS OVERSTATED OR ERRED

**E-1 — The Phase 1 evaluation is misdesigned (most important correction).**
Opus proposes rating Tier-0, Tier-0+local, and external *all on identical minimized payloads*. That measures **model quality**, but the deployment decision is between **local-with-full-private-context (in-trust)** and **external-with-minimized-context**. Those are different information regimes. If local+full ≥ external+minimized — plausible, since minimization destroys contraindication-relevant detail — the external route loses *regardless of raw model capability*, and Opus's experiment would never detect it. The decisive arms are wrong. Corrected design in §5.

**E-2 — Deletion-rights collision is overstated as stated.**
"You cannot recall data already processed" collides with erasure rights only while Swan retains the linkability key. **Crypto-shredding** — destruction of the `caseToken→client` mapping — renders provider-held vectors non-attributable *by Swan*, and is a recognized supplementary measure. The residual risk (provider-side re-linkage from the QI stream) survives key destruction and must be disclosed, but the framing "irreversible, full stop" is too strong. This cuts toward *conditional feasibility*, not against caution — the residual is still real.

**E-3 — S0-5's self-contradiction claim.** Covered above: exercise IDs are not "infrastructure identifiers" under the document's own list. The finding stands on entropy grounds; the rhetoric should be corrected so a future defender can't impeach the whole finding on this point.

**E-4 — "LLM inside the egress path" as the architecture.** The document makes it optional. Precision matters: the defect is the *existence of the option*, and the remediation is one deletion, not a redesign.

---

## 4. NEW FINDINGS (not in Opus)

**K-1 (S1) — Review-design conflict of interest.** The packet routes Q9/Q10 — the value judgment and verdict on the Kimi route — to Kimi. No provider can impartially assess its own marginal value or its own jurisdictional risk. Governance fix: value determination comes only from Swan-run blinded evaluation; provider self-assessment is inadmissible evidence. (See §0.)

**K-2 (S1) — Provider model-version drift invalidates validation.** Any Phase 1 evidence is evidence about *a specific model version*. Hosted providers silently update weights and deprecate endpoints. Required: contractual version pinning and change-notification SLA; continuous output-fingerprint drift monitoring on canary prompts; automatic fail-closed and full regression re-validation on detected drift. Without this, the launch gates certify a moving target.

**K-3 (S2) — The egress budget is an attack surface.** Escalation flooding (bug or hostile actor) either exhausts the budget — blocking legitimate pain-adjacent cases — or trips the global kill switch, converting a privacy control into an availability weapon. Requires per-authenticated-actor attribution, anomaly detection on escalation *rate* (not just volume), and a degraded-mode that is genuinely functional (Tier-0 + trainer), so fail-closed is tolerable.

**K-4 (S2) — Kill-switch governance unspecified.** Switch state must be durable and tamper-evident; **re-enable requires dual control**; every trip auto-generates an audit record with cause. An easily reversed kill switch is a delay, not a control.

**K-5 (S3) — HMAC digest hardening.** Post-minimization payloads occupy a small, enumerable space. If the HMAC key is ever compromised, stored digests become dictionary-attackable, partially defeating S1-10's "no durable egress copy" property. Per-record salt, stored separately from digests.

**K-6 (S2) — Deletion semantics must be engineered, not lamented.** Define crypto-shredding of the linkability mapping as the erasure mechanism; contractually prohibit provider-side re-linkage attempts; disclose the residual (provider-held, Swan-unlinkable vectors) in client notice. Withdrawal of consent must trigger mapping destruction for all historical caseTokens of that subject.

**K-7 (S1) — The document's own example is arguably ineligible.** The sample case: right knee, severity 4, aggravated by deep knee flexion, duration 2–4 weeks. Under any defensible NASM scope-of-practice policy, persistent multi-week pain at moderate severity with a named aggravating pattern is at minimum a **trainer-mandatory, referral-consideration** case — plausibly a "do not program; refer" case. The proposal presents it as a routine escalation candidate. This concretely demonstrates S0-4 and S1-6: *the routing rubric's absence is visible in the example itself.* Define referral thresholds as **versioned deterministic policy code** (neurological/radiating symptoms, night pain, trauma, swelling, post-surgical without clearance, severity × duration product over threshold, worsening trend), not prose.

**K-8 (S1) — Evaluation must measure minimization cost and use decision-relevant arms.** (Extends E-1.) Four arms: (a) Tier-0 only; (b) local + full private context — *the actual deployment alternative*; (c) local + minimized; (d) external + minimized. Read: (d) vs (b) is the shipping decision; (b) − (c) prices the gateway's information loss; (d) vs (c) isolates raw model delta. Opus's design measures only the last of these.

**K-9 (S3) — Tenant-brand and endpoint metadata leakage.** `requiredOutputSchema: "swan_workout_recommendation_v1"` embeds the tenant brand in every payload. The provider knows the tenant via API key/billing anyway, but the brand propagates into provider logs, error traces, and any future breach artifact. Use neutral schema identifiers (`workout_rec_v1`). Cheap fix, do it.

**K-10 (S3) — Traffic-analysis residual.** Even with perfect payloads, request timing/frequency to a single pinned endpoint reveals tenant operational cadence and coarse per-subject rhythm to a network-position observer or the provider itself. Padding/batching is disproportionate for this workload; the honest disposition is: **document as accepted residual risk** in the DPIA, assigned to a named owner. Do not claim it away.

---

## 5. CORRECTED ARCHITECTURE

Consolidated, incorporating Opus's model where correct (it mostly is) with this review's deltas.

**Tiers:**
- **Tier −1 — Eligibility & red-flag triage (deterministic, versioned policy code, first always).** Referral thresholds per K-7; exclusion classes (minors, pregnancy, medically-supervised, non-consented, deletion-pending, rare-combination-flagged) → permanently externally ineligible.
- **Tier 0 — Deterministic engine.** Complete safe plan for every eligible case; baseline, fallback, diff reference. **Runs on every case regardless of tier** — the external route therefore never saves compute, only adds latency; plan accordingly.
- **Tier 1 — Local model, in-trust, full private context.** Constrained decoding over closed vocabularies. **This is the legitimate comparator to external routing and the presumed endpoint of this program.**
- **Tier 2 — Trainer / referral.** Sees Tier-0 baseline, delta, provenance, confidence; dual-control for pain-flagged; approvals expire; anti-rubber-stamp metrics captured.
- **Tier 3 — External. Flagged OFF.** Enumerated case classes only; per-tenant opt-in; per-client explicit per-purpose consent; hard budgets; kill switch with dual-control re-enable (K-4); version-drift monitor (K-2).

**Egress pipeline (Tier 3 only):** Opus's ten-step pipeline is adopted with these amendments:
- Step 2 (assembly): deterministic construction is the **only** path — the "optionally local Qwen" constructor is deleted, not gated (E-4). Zero free-text fields, neutral schema names (K-9).
- Step 4 (budget guard): add per-actor escalation-rate anomaly detection (K-3).
- Step 6 (transport): add contractual version pinning + drift notification (K-2); idempotency key distinct from caseToken.
- Step 9 (accountability): salted HMAC digests, salt stored separately (K-5); crypto-shredding runbook for erasure and consent withdrawal (K-6).
- Step 10 (kill switch): durable state, dual-control re-enable, mandatory cause audit (K-4).
- New step: **accepted-residuals register** — longitudinal linkability (S0-3 residual) and traffic analysis (K-10), each with a named accepting owner, reviewed quarterly.

---

## 6. PHASED VALIDATION PLAN

**Phase 0 — Repository truth & gateway rewrite.** Unchanged from Opus: verify both file claims, enumerate all AI call sites, egress inventory, disable body capture, constructive allowlist, red-flag policy-as-code (K-7), Tier-0 completeness, Psi-Brain contract test, canary/honeytoken program, metamorphic tests (§2, S3-17 extension). *No external calls.*

**Phase 1 — Offline value proof (REDESIGNED per K-8).** Four arms on synthetic + explicitly consented cases; blinded NASM-certified raters; report inter-rater reliability; pre-registered margin and stop rule. **Decision rule: external is justified only if arm (d) external+minimized significantly exceeds arm (b) local+full-context, with zero safety regressions.** Also report (b)−(c) minimization cost. Failure = external route closed permanently, not retried quarterly.

**Phase 2 — Adversarial & legal.** Red team; image-borne injection; re-identification exercise against simulated multi-month provider logs; counsel answers Opus's ten questions plus deletion-semantics mechanics (K-6) and the PRC-jurisdiction analysis that applies to this specific provider (§0.2); DPIA including the accepted-residuals register (K-10). *Exit requires named-owner acceptance of residuals.*

**Phase 3 — Shadow ops.** Synthetic live fire: kill switch, circuit breaker, version skew, version-drift drill (K-2), budget-flood drill (K-3), queue purge, consent-withdrawal crypto-shredding drill (K-6). Every failure mode must demonstrably fail closed.

**Phase 4 — Limited live.** One tenant, consented clients, hard caps, dual-control on pain, 100% trainer review, daily leak audit, weekly canary sweep.

**Phase 5 — Conditional expansion.** Quarterly re-review; automatic rollback on any gate breach or unnotified provider model change.

---

## 7. FINAL RECOMMENDATION: WHEN KIMI ADDS ENOUGH VALUE

Stated with the §0 discount applied — and note that the honest answer from the proposed provider is a **low prior**:

External processing by Kimi (or any provider) is justified only when **all** of the following hold simultaneously:

1. **Enumerated niche, demonstrated offline.** The eligible case class is restricted to novel multi-constraint interactions where Tier-0 is provably silent *and* the local model emits low confidence — and Phase 1 (corrected design) shows external+minimized beats local+full-context by a pre-registered margin with zero safety regression. Given the payload's own shape — phase pre-computed, contraindications pre-resolved, exercise set pre-filtered — the residual task is selection and sequencing inside a deterministic envelope, which is exactly where a constrained local model is strong. **Expected finding: the niche is small or empty.**
2. **The privacy cost per case is quantified and budgeted**, residuals are owner-accepted, and consent is per-purpose and revocable with engineered erasure (crypto-shredding).
3. **Jurisdiction and drift are contractually closed** — by counsel and contract, not by provider self-description, mine included.
4. **Tier-0/1 sufficiency has been proven in production first.** If local-plus-deterministic handles the real caseload — and the architecture itself predicts it will — the external route is unforced risk and stays dark.

**Bottom line:** Approve the gateway, triage, and Tier-0 work now — it is valuable with or without any external provider. Do not authorize the external route. Revisit only on Phase 1 evidence from the corrected experiment, and treat this reviewer's enthusiasm or reluctance about that route as inadmissible either way.
