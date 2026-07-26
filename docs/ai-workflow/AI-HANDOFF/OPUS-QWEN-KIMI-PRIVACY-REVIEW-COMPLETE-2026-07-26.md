# Claude Opus 5 - Review

**Reviewer:** `anthropic/claude-opus-5` (high)
**Document:** .\docs\ai-workflow\AI-HANDOFF\QWEN-KIMI-PRIVACY-ROUTING-REVIEW-PACKET-2026-07-26.md
**Document SHA-256:** `6cdbbc7ad1766c249d12306096848c473af2f8fce9861e0c04587afac0b05f45`
**Seed:** (none)
**Tokens:** 2578 in / 15969 out | **Cost:** ~$0.4121 | **Wall:** 248.3s

---

# HOSTILE FIRST-PASS REVIEW — SwanStudios Local-Qwen → External-Kimi Routing

**Reviewer:** Claude Opus 5, acting alone. No prior review consulted, no consensus simulated.
**Basis:** the bounded document only. I have **not** verified any repository claim; every statement about `aiWorkoutController.mjs` and `deIdentificationService.mjs` is treated as an **unverified assertion by the proposer**. No client facts are assumed or invented.

---

## VERDICT

**REVISE — and specifically: REJECT the external escalation route as currently scoped and sequenced.**

Two separable decisions are fused in this document, and that fusion is the core defect:

1. **Replace blacklist de-identification with a constructive allowlist gateway, deterministic NASM validation, red-flag triage, and trainer governance.** → **APPROVE in principle**, high value, no external dependency, do this first regardless.
2. **Add an external provider hop for "difficult" cases.** → **NOT AUTHORIZED.** The value is asserted, never measured; the residual re-identification channel (longitudinal linkability) is not closed by anything in the proposal; the provider-jurisdiction question is unresolved; and the proposal puts an LLM *inside* the egress path, which is itself a leak channel.

The external route may be reconsidered only after Phase 0–2 below, and only if a pre-registered value threshold is met. Absent that, the honest conclusion is that **the external hop adds more risk than value.**

---

## SEVERITY-RANKED FINDINGS

Severity: **S0** = blocker, must be fixed before any further design work · **S1** = critical · **S2** = high · **S3** = medium.

### S0-1 — "No real health fact" is false at runtime; the payload is health data about an identifiable person
The *packet* contains no client data. The *production payload* does: body region, severity, aggravating movement patterns, symptom duration, adherence, and performance decline. That is health-adjacent (plausibly special-category) information about a specific data subject, and you retain an internal `caseToken → client` mapping. **Data you can re-link is pseudonymous, not anonymous.** Every downstream claim in the document that leans on "anonymous case" is therefore overclaimed. Correct language: *minimized, pseudonymized, non-directly-identifying health signal exported to a third-party processor.* Fix the vocabulary before anyone signs off on the basis of the current wording.

### S0-2 — An LLM is inside the egress path (Step 3)
"Optionally let local Qwen convert allowlisted facts into a structured anonymous training case" makes a stochastic component the constructor of outbound content. Failure modes: copying an identifier that was in its context window, hallucinating a fact into a field, re-emitting injected text from media/notes, or free-writing into a string field. A model may propose; it must never author egress. **Rule: the outbound object is built by deterministic code from closed vocabularies only.** Local model output is treated as untrusted candidate input, coerced to enums, and anything uncoercible is dropped — not "cleaned."

### S0-3 — Longitudinal linkability defeats single-use tokens
Single-use non-linkable tokens prevent linkage *by token*. They do nothing about the quasi-identifier vector: `{goal, phase, experience, sessionsPerWeek, adherence=78, equipment set, right_knee, severity 4, 2_to_4_weeks, plateau trend, allowedExerciseIds}`. That vector is near-unique, and the *sequence* of such vectors over weeks (adherence drifting, duration bucket advancing) is a trivially reconstructable per-subject trajectory in the provider's request stream. The proposal's stated re-identification control is therefore largely cosmetic. This is the strongest technical objection and it is **not closed by anything currently listed.**

### S0-4 — No medical red-flag / scope-of-practice gate
The architecture routes a pain case to a model. It should first route it to a **deterministic referral decision**. There is no screen for radiating/neurological symptoms, night pain, trauma, unexplained swelling, post-surgical status, worsening trajectory, or severity/duration thresholds that require referral out of the fitness scope entirely. "Escalate to Kimi" is the wrong escalation target for a case whose correct output is "do not program; refer." **Fail-closed on pain must mean "no AI programming + referral," not "external model."** This is the most serious *safety* gap, independent of privacy.

### S0-5 — Unmanaged egress channels bypass the gateway
The document governs one code path. Production leaks usually occur through: error/APM/observability SDKs capturing request bodies and exception payloads, HTTP logging middleware, LLM SDK telemetry and prompt caching, model-router/aggregator proxies (which insert an extra processor you have not reviewed), queue/dead-letter payloads, and debug builds. **Until an egress inventory is complete and body capture is provably disabled, "zero PII to LLMs" is unverified.** Also: `allowedExerciseIds` and `requiredOutputSchema` violate the document's own ban on internal identifiers.

### S1-6 — "Deterministic escalation policy" is asserted, never specified
Without a written rubric, escalation volume — and therefore total external exposure of health signal — is unbounded. Privacy exposure must be a **budgeted resource**: hard caps per client per month, per tenant per day, minimum interval between external calls for one subject, global rate limit. Cost is secondary; the cap is a privacy control.

### S1-7 — Provider jurisdiction, sub-processors, and retention are unresolved
"Kimi K3" is a provider/model claim I cannot verify; capability must be benchmarked, not assumed. Independent of naming: a provider under a jurisdiction with broad state-access authority and no adequacy finding is a governance decision, not a checkbox. "No training on API data" ≠ "no retention" — abuse-monitoring retention windows are standard even under ZDR marketing. Sub-processor lists, region pinning, and deletion semantics must be contractual and technically verified, and **you cannot recall data already processed**, which collides with client deletion rights.

### S1-8 — Model output is treated as semi-trusted
Validation is described as schema + exercise IDs + pain policy. Missing: reject all free-text passthrough to trainers/clients, strip URLs and control/bidi Unicode, length bounds, and — critically — **re-validate the returned plan against the full private constraint set, not the minimized case.** The minimized case is lossy by design; only the trusted-side truth can adjudicate contraindications. Also required: diff the external plan against the deterministic Tier-0 plan and surface deltas as the review artifact.

### S1-9 — Local vision processing is treated as risk-free
Local ≠ safe. Processing client media of bodies/faces can create biometric-adjacent representations and triggers consent regimes in several jurisdictions. Required engineering rules: no face/pose embeddings persisted, no perceptual hashes (they are linkable), region cropping before inference, immediate destruction of frames and intermediates, no raw media in queues or logs. Also: **image-borne prompt injection** (text visible in a photo) is a live path into your case object — another reason for S0-2's coercion rule.

### S1-10 — Provenance requirement contradicts the no-prompt-body rule
You cannot both refuse to store payloads and answer "what exactly was sent about me?" Resolution: **deterministic reconstructability** — store allowlist version, transform version, source record versions, generalization decisions, and an HMAC digest of the exact serialized payload. The payload is regenerable inside the trust boundary and integrity-verifiable, without a durable copy of the egress body.

### S1-11 — Trainer approval is an under-specified control
"Material plan changes" is undefined; there is no approval-fatigue mitigation, no rationale capture, no dual-control for pain-flagged cases, no approval expiry, no requirement that the trainer sees the Tier-0 baseline and the delta, and no anti-rubber-stamp measurement (approval latency, approval rate, post-hoc audit sampling). An unmeasured human gate is not a control; it is a liability transfer.

### S2-12 — Failure modes: retries, queues, degraded mode
No retry policy → validator rejection or timeout can re-export the same health facts repeatedly. Required: idempotency key (single-use, distinct from `caseToken`), zero retries on 4xx/validation failure, at most one retry on transport error, and fallback to Tier-0/queue. "Queue the request" creates a **new health-data store** requiring encryption, access control, TTL, and purge. And the degraded mode for a pain-sensitive session must be an explicit deterministic template + trainer, not "wait."

### S2-13 — Horizontal-scaling correctness
Single-use token enforcement requires an atomic shared store, not per-instance memory. Rolling deploys create allowlist/validator version skew — a payload built by v1 and validated by v2 is an unaudited state. Require version pinning per request and **fail closed on version mismatch**. Add per-tenant (not per-instance) rate limiting and KMS-backed key rotation.

### S2-14 — "Must not route through Psi Brain" is prose, not enforcement
Enforce mechanically: separate service boundary, separate credentials, network egress deny-list, no shared queues/topics/caches, and a contract test that fails the build if a Psi-Brain client or endpoint is reachable from the Hive path.

### S2-15 — High-entropy numerics and library disclosure
`recentAdherencePercent: 78` and `severity: 4` should be buckets. `availableEquipment` + `allowedExerciseIds` fingerprints the facility and inflates payload entropy. **Do not send exercise IDs at all** — send movement-pattern capability flags, require the model to answer in movement patterns, and map to your canonical IDs locally. This simultaneously reduces linkability, eliminates hallucinated-ID handling, and protects your ontology.

### S2-16 — K-anonymity is invoked without a denominator
K-anonymity over a per-request stream is not implementable as written. Either define the cohort population, the QI set, and the suppression/generalization rules explicitly, or drop the claim and rely on hard minimization + eligibility exclusion. Do not ship the word "k-anonymity" as reassurance.

### S3-17 — Testability gaps
No canary/honeytoken program (synthetic identifiers planted in internal records that must never appear in egress — the single cheapest high-value leak detector). No property-based/fuzz testing of the allowlist. No measured false-negative rate for the leakage scanner. No blinded expert rating protocol. No adversarial re-identification exercise. No pre-registered stop criteria.

---

## QUESTIONS REQUIRING QUALIFIED PRIVACY COUNSEL (not engineering)

Do not let engineering answer these:

1. Is the minimized case **personal data / pseudonymized data** rather than anonymous, given the retained internal mapping — and does that make each call a regulated transfer?
2. Do pain region/severity/duration/aggravating-pattern fields constitute **special-category health data**, and what lawful basis and explicit-consent mechanics are required?
3. Cross-border transfer legality for the chosen provider's jurisdiction; adequacy, transfer mechanism, supplementary measures, government-access analysis.
4. Consumer-health-data statutes with separate consent for *collection* and *sharing* (and private rights of action) applicable to Swan's operating states.
5. Whether existing client agreements cover third-party AI processing of health signals; required notice, granularity, and opt-out without material service degradation.
6. Deletion/erasure obligations against a provider you cannot force to purge; what must be disclosed to clients about irreversibility.
7. Biometric-consent exposure from local processing of body/face media.
8. Non-diagnostic positioning: wellness-vs-clinical claim boundary for "visible asymmetry" outputs, and whether stored observations become health records.
9. DPIA/ROPA requirement and whether a DPIA must precede any live call.
10. Minors, pregnancy, and medically-supervised clients — categorical exclusion vs. conditional handling.

---

## STRONGEST COUNTERARGUMENT TO THE PROPOSAL

*(the case I would make if I were trying to kill it, and I largely am)*

You are proposing to export special-category-adjacent health signals about re-linkable individuals to a third-country processor, in exchange for a quality delta you have never measured, on a task you have already reduced to constrained selection.

Note what the payload proves: you send `nasmPhase`, `constraints`, and `allowedExerciseIds`. That means **you already computed the phase, already resolved the contraindications, and already narrowed the legal exercise set deterministically.** What remains for the external model is selection, ordering, and volume assignment inside a pre-filtered space — precisely the class of problem where a rules engine plus a small local model is adequate and where the external model's marginal advantage is mostly prose quality, which you are contractually forbidden from passing through to the client anyway.

Against that unmeasured gain you accept: a new cross-border transfer, a new consent and notice obligation, an unauditable retention surface, an irreversible-deletion problem, a second untrusted-input boundary, a longitudinal linkability channel you have no mechanism to close, and roughly fifteen new operational failure modes — to be maintained by the same team that, by its own admission, has not yet converted a copy-then-delete de-identifier into a constructive allowlist.

The sequencing is inverted. **Fix the gateway. Prove local sufficiency. Then, and only then, argue for an external hop with numbers.** If local plus deterministic validation is good enough — and the payload's own shape suggests it is — the external route is unforced risk.

*Steel-manning the residual case:* there is a plausible narrow niche — novel multi-constraint interactions where deterministic rules are silent and the local model is visibly unsure — where a stronger reasoner may reduce trainer workload. That niche is small, must be enumerated in advance, and must be demonstrated offline. It is not a license to build a general escalation path.

---

## REVISED ARCHITECTURE

**Tiers (external is dark by default):**

- **Tier −1 — Eligibility & red-flag triage (deterministic, first).** Red-flag screen → referral path, no AI programming. Exclusion screen: minors, pregnancy, medically-supervised, no external-processing consent, deletion/legal-hold pending, rare-combination flag → **externally ineligible, permanently**.
- **Tier 0 — Deterministic engine.** NASM phase logic, contraindication filter, exercise selection from allowlist, progression. Must independently produce a complete safe plan for every case. This is the baseline, the fallback, and the diff reference.
- **Tier 1 — Local model, in-trust.** Constrained decoding over closed vocabularies and canonical IDs. Handles ambiguity, ordering, and trainer-facing explanation. Never authors egress.
- **Tier 2 — Trainer (and referral).** Sees Tier-0 baseline, the proposed delta, provenance, and confidence. Rationale captured. Dual-control for pain-flagged. Approval expires.
- **Tier 3 — External, feature-flagged OFF.** Enumerated case classes only, per-tenant opt-in, per-client explicit consent, hard egress budget, kill switch.

**Egress pipeline (Tier 3 only):**

1. **Trusted extraction.** Media local only; crop→infer→destroy; no embeddings/perceptual hashes persisted; vision output = candidate enums.
2. **Constructive assembly.** Build a new object field-by-field from a versioned allowlist. Closed vocabularies and buckets **only — zero free-text fields, no exceptions.** Uncoercible values are dropped.
3. **Generalization & suppression.** Bucket all numerics. Send movement-pattern capability flags instead of exercise IDs. Truncate trend lists. Suppress rare QI combinations against a documented cohort rule.
4. **Linkability & budget guard.** Per-client cap and minimum interval; per-tenant and global rate limits; no session/week indices or any field enabling temporal ordering of one subject.
5. **Deterministic egress scanner.** Schema-strict validation, entropy/pattern checks, canary/honeytoken detection, allowlist-version pin. Any anomaly → fail closed, no sanitize-and-send.
6. **Transport.** Direct to pinned provider (no aggregators/proxies), region-pinned, secret in KMS, body capture disabled in all middleware/APM/error tooling, single-use idempotency key, timeout, zero retries on validation/4xx.
7. **Hostile ingress.** Schema-strict parse; reject free text, URLs, control/bidi Unicode; bounds-check volume/intensity; **re-validate against the full private constraint set**; diff against Tier-0.
8. **Human gate.** As Tier 2, plus mandatory 100% review during initial phases and ongoing audit sampling.
9. **Accountability.** Metadata-only logs + reconstructable payload (versions + generalization decisions + HMAC digest). Tamper-evident, access-controlled, TTL'd.
10. **Kill switches.** Global + per-tenant. Auto-trip on canary hit, scanner anomaly, validator rejection-rate breach, latency/error SLO breach, or budget overrun.

**Answers to the document's questions, compressed:**
(1) Defensible only after S0 fixes; "anonymous," "no health fact," and "k-anonymity" are the overclaims. (2) Longitudinal QI trajectories, rare-combination singling-out, facility fingerprinting via equipment+library, adherence/severity precision. (3) **Before** the gateway only, as candidate enums; never as the gateway, never after. (4) Phase, generalized constraints, movement-pattern capabilities, coarse adherence, trend direction — and if that's all it gets, a local model is likely sufficient, which is the point. (5) Red-flagged, minors, pregnancy, medically-supervised, non-consented, rare-combination, media-derived-only, deletion-pending, and any case where Tier 0 already has a confident answer. (6) Deterministic non-diagnostic vocabulary with a banned-term list, mandatory uncertainty, no clinical scoring, referral routing, trainer review, and record-governance for stored observations. (7) See S1-7, S2-12, S2-13, S0-5. (8) See phased validation. (9) **Unproven; presumed negative** — the payload shape argues against material external advantage. (10) REVISE / reject external as scoped.

---

## PHASED VALIDATION AND LAUNCH GATES

**Phase 0 — Repository truth & gateway rewrite (no external calls).**
Verify the two file claims; enumerate *every* AI/provider call site; complete egress inventory; disable body capture in observability; replace copy-then-delete with constructive allowlist; implement red-flag triage and Tier-0 completeness.
*Exit:* property-based + fuzz tests pass; planted canaries never appear in any egress or log; Tier 0 produces a safe plan for 100% of eligible cases; Psi-Brain isolation contract test in CI.

**Phase 1 — Offline value proof (still no live external calls with client data).**
Blinded expert rating: Tier-0, Tier-0+local, and external, all on **identical minimized payloads**, using synthetic and explicitly-consented cases. Pre-register the threshold and the stop rule.
*Exit:* external wins by the pre-registered margin on plan quality **with zero safety regressions**. Failure to meet the margin = the external route is closed. This gate alone should decide the program.

**Phase 2 — Adversarial and legal.**
Internal red team against egress assembly and hostile ingress; image-borne injection tests; **re-identification exercise** — an internal adversary team, given a simulated multi-month provider log plus plausible side knowledge, attempts subject linkage and singling-out. Counsel answers all ten questions; DPIA completed.
*Exit:* documented residual re-identification risk with named accepting owner; counsel sign-off; consent flow shipped and default-off.

**Phase 3 — Shadow ops.** External calls with synthetic payloads mirroring real distributions. Exercise kill switch, circuit breaker, version skew, retry, queue purge, outage degradation.
*Exit:* SLOs met; every failure mode demonstrated to fail closed.

**Phase 4 — Limited live.** One tenant, consented clients, hard egress cap, dual-control on pain, 100% trainer review, daily leak audit, weekly canary sweep.
*Exit:* N consecutive cases with zero leakage findings, zero unsafe validated outputs, trainer override rate within expectation.

**Phase 5 — Conditional expansion.** Quarterly re-review; automatic rollback to Tier 0/1 on any gate breach.

---

## WHAT MUST NOT BE SENT TO ANY EXTERNAL MODEL

The document's list is necessary but incomplete. Binding additions:

- **Any free text whatsoever** — including model-generated prose, "notes," rationales, or summaries about a person.
- **All internal canonical identifiers**, including exercise IDs, library IDs, schema names, tenant/gym/trainer IDs — replace with abstract movement-pattern and capability vocabularies.
- **High-precision numerics**: raw adherence percentages, 0–10 severity, loads, 1RM, body metrics, age, session counts. Buckets only.
- **Anything enabling temporal ordering of one subject**: session index, week number, program week, dates, timestamps, streaks, "week 7 of 12."
- **Demographics and context**: sex/gender, age, anthropometrics, pregnancy, disability status, medications, occupation, locale, timezone, unit system, language.
- **Media derivatives**: raw or cropped frames, face/pose/body embeddings, perceptual or cryptographic media hashes, filenames, storage keys, signed URLs, EXIF.
- **Rare-combination QI vectors** that fail the suppression rule — suppress or refuse; never soften and send.
- **Any case from an ineligible subject**: red-flagged, minor, pregnancy, medically-supervised, non-consented, opted-out, deletion-pending, or under legal hold.
- **Any case where Tier 0 already has a confident, safe answer** — sufficiency is itself a privacy control.
- **Canary/honeytoken values** (their appearance in egress is a P0 incident, not a data point).
- **Anything constructed or rewritten by a model rather than by deterministic code.**

And the meta-rule that governs all of the above: **if the deterministic gateway cannot construct the payload, the answer is refuse or degrade — never sanitize-and-send, and never treat the external route as a fallback for an asset or case the trusted environment could not handle.**
