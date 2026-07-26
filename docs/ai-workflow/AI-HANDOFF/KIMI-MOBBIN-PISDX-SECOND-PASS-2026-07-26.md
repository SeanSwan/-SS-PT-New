# Kimi K3 - Second-Pass Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:\tmp\sspt-kimi-after-opus-20260726\docs\ai-workflow\AI-HANDOFF\MOBBIN-PISDX-OPUS-EXACT-HASH-22207E-2026-07-26.md
**Document SHA-256:** `22207e67646089477ad1bec90c883d77f5005cfc214bf1b4ed98aa571ad91126`
**Seed:** C:\tmp\sspt-kimi-after-opus-20260726\docs\ai-workflow\AI-HANDOFF\OPUS-MOBBIN-PISDX-REVIEW-2026-07-26.md
**Tokens:** 6122 in / 11324 out | **Cost:** ~$0.1882 | **Wall:** 390.1s

---

# Kimi K3 — Second-Pass Hostile Review

**Scope honesty up front:** I have no repository access. Claims I can independently verify from the bounded packet: internal consistency, arithmetic, the receipt corruption, the control inventory (ART-1..5), and the logical structure of both documents. Claims I *cannot* verify: 67/67 passing, syntax checks, the four uncorrupted hashes (a receipt is only verifiable against its artifact), and any enforcement mechanism living outside the packet. Opus graded the same bounded artifact I did. Where Opus treated absence-from-packet as absence-from-system, I flag it; where the absence is itself the defect, I concur on the merits, having reached the conclusion independently.

---

## VERDICT

**REVISE** — independent concurrence, not deference.

- **P (Probe):** Approve-with-gates. Gate: the 90-day log has no stated purpose; retention without purpose fails minimization regardless of field count. Purpose-bind it or coarsen timestamps to day granularity.
- **I (Inspect):** Revise. Demote per Opus; see N5 below for a contradiction Opus missed that independently forces this.
- **S (Spec):** Remains `enabled:false`. Correct shipping state; must stay there through all gates below.
- **D (Doctrine):** Approve-with-gates. The gate *is* the authority mechanism (S1-3); without it, D is an assertion, not a control.
- **X (Source corpus):** Remains blocked. Clearance lifecycle is unspecified (S2-3, agreed); default-deny is the only defensible posture until it is.

I concur with Opus's bottom line while correcting four of its findings, adding eight new ones, and noting one case where Opus's own fix contradicts the contract it was fixing.

---

## Agreement / Disagreement Matrix

| Opus finding | Disposition | Independent reasoning |
|---|---|---|
| S1-1 Provider-side retention | **Agree, conditional** | The packet is genuinely silent on where task context is processed, and its own review question 2 presupposes external-model prompts exist ("No paid model call… *in this pass*" implies they occur normally). Real gap. But severity is conditional: if I-context is local-only, the finding is moot. The defect is the *unspecified boundary*, gradeable as Critical-pending-answer. |
| S1-2 `owned` as PII ingress | **Agree, with two corrections** | Verified: ART-1..5 target tokens, proper nouns, disclosure, comparison phrasing, attestation reverse-mapping — no PII/PHI detector, and all laundering machinery points at `mobbin` while `owned` is unconstrained. Corrections: (a) ART-2's outside-proper-noun rejection *incidentally* catches client names — it is a partial, accidental PII control, so "none of them is a PII detector" is slightly overstated; it catches names, nothing else. (b) "The fastest way any human produces that is by describing a real screen" is speculation; a designer can write 7 states from a wireframe. The gap stands without the rhetoric. |
| S1-3 "Sean-only" unenforced | **Agree, with caveat** | No mechanism is stated; in-process actor checks are self-bypassable. Caveat: branch protection and hardware keys live outside the repo, so a packet-bounded review cannot prove they don't exist. The defect is that the protocol *asserts authority without referencing its enforcement* — the fix (reference it, produce an attestation artifact) is required either way. |
| S1-4 Corrupted receipts / defective scrubber | **Agree on facts; disagree on attribution** | Verified independently: exactly 4 of 8 SHA-256 lines contain `<REDACTED_PHONE>` and are unverifiable — operator README, provenance regression, risk decision, kill switch. Opus's arithmetic and integrity conclusion are correct. **Overreach:** Opus attributes this to "the pipeline" scrubber and distrusts it "anywhere in the pipeline." The packet describes no pipeline scrubber; the corruption evidence localizes to the *handoff tooling that prepared this packet for external send*. That is arguably worse, not better: the one demonstrated instance of external processing shipped corrupted artifacts through the very scrub gate the never-send list depends on. Fix (structured detection + labeled eval) is correct regardless of location. |
| S1-5 No NASM safety governance | **Agree — Opus's best original catch** | Verified: the packet contains no safety-critical surface concept, and SDIR state semantics (empty/error/disabled/offline on assessment or progression surfaces) genuinely encode clinical meaning. **But see N2: Opus's own fix is incompatible with the contract.** |
| S2-1 ART is lexical | **Agree, one understatement** | Structure, ordering, flow topology, and state-transition graphs pass all five ART checks — verified against the control list. Understatement: Opus lists "numeric-measurement smuggling" as an adversarial fixture, but ART-1's off-token rejection *partially* mitigates exact-measurement copying (Mobbin pixel values that aren't Swan tokens get rejected). Ratios and step counts remain uncovered. Also, "higher-fidelity reconstruction than a screenshot" is rhetorical overstatement — a token-constrained text spec cannot carry pixels. |
| S2-2 Salt design unspecified | **Agree** | "Salted non-source stub" with no salt spec, custody, or rotation is unverifiable-as-written. Low-cardinality identifier spaces make co-located global salts reversible. Mooted entirely if I is demoted. |
| S2-3 Clearance lifecycle undefined | **Agree** | Verified: no expiry, revocation, conflict resolution, authenticity, or trusted clock in the packet. "Stale fails closed" is unimplementable against a spoofable clock. |
| S2-4 Flags ≠ separation | **Agree (absence-basis)** | The packet describes collection separation and data flags, nothing about credential boundaries. IAM-level incapability is the correct standard. Flagged as inference-from-absence, not confirmed defect. |
| S2-5 TOCTOU on byte-verify | **Agree as worded** | "Verifies bytes remain unchanged" implies read-compare across two instants. A hash-pinned conditional write would already mitigate; the packet doesn't say. Legitimate as worded. |
| S2-6 Kill switch untested | **Agree** | A receipt for a disabled switch is evidence of a file, not of a control. |
| S2-7 67/67 ≠ coverage | **Agree** | The omission-laundering regression is self-incriminating in the useful way: it proves the suite's original blind spot. Mutation floor + adversarial corpus is the right bar. |
| S2-8 Job-based expiry | **Agree** | "Redacted after 14 days" and "task context expires" name no mechanism. Storage-layer TTL primary, job secondary, drift alerting. |
| S3-1 Quota slack | **Agree — arithmetic verified** | 3/day × ~91 days ≈ 273 > 40/quarter; the quarterly and per-surface caps bind. Server-side atomic counters, most-restrictive-first. |
| S3-2 Legacy mapping | **Agree, with a missed mitigation** | T→I+S fans out, **but S ships `enabled:false`, so the widening is currently inert** — the risk materializes only at S-enablement. Opus didn't note this. Refusing legacy artifacts is still correct. |
| S3-3 Denial observability | **Agree** | Fail-closed without alarms gets bypassed. |
| S3-4 Route by data class | **Agree, and extend** | The scheme is right; the hard part Opus didn't name is that *classification of free text is the same unsolved detection problem as S1-2*. Correction: the broker only works on schema-typed payloads — **any free-text field defaults to Class-2 (deny)**. |
| Counterargument (zero-infra) | **Endorse** | And it supports going further than Opus did: see Corrected Architecture, where the letter model collapses. |
| S recommendation (do not enable) | **Agree** | With one imprecision: Opus calls S "the only mode that creates a durable reconstruction-capable corpus" — X would too, if cleared. X is default-deny, so the practical point stands. |
| Never-send list | **Endorse, one addition** | Add: **S-enablement records and authority/identity configuration** (who can flip flags, key custody) — governance artifacts that also aid an attacker in targeting the authority boundary. |

---

## New Findings (Opus missed)

**N1 — ART-5 decays on a 14-day clock and is possibly self-defeating. (High)**
ART-5 rejects tokens that "reverse-map to live attestation detail." But attestation detail is redacted to stubs after 14 days. So either (a) ART-5's reference set is deleted, and the control silently weakens to checking only the last fortnight's detail — a token blocked on day 10 passes on day 20; or (b) enforcement requires retaining the detail, which contradicts the redaction the protocol advertises. The control as specified either expires or eats its own minimization. Fix: ART-5 checks against an HMAC'd reference set with the same custody as the stub HMAC key — but note this only matters if I retains attestations at all (see N5).

**N2 — "Exactly seven states" contradicts Opus's own NASM fix. (High — contract defect)**
The SDIR contract mandates *exactly* seven states. Opus's S1-5 fix (c) mandates additional states (`screening-incomplete`, `contraindication-present`, `trainer-approval-required`, `stale-assessment`) on safety-critical surfaces. Both cannot hold: either safety surfaces can never be SDIR'd (an unenforced implicit ban), or the contract must change to *seven minimum plus a mandatory extension set for `safety_critical` surfaces*. Opus prescribed a fix that the artifact it was fixing forbids. The corrected architecture below resolves it.

**N3 — The enable path is ungoverned. (High)**
The packet specifies what is *insufficient* to activate S (probe/inspect availability, general requests, payment) but never specifies what is *sufficient* — who or what flips `enabled:false` to true, under what authority. Combined with S1-3 (authority unenforced), the single most consequential state transition in the protocol has no defined gate. The kill switch is documented; the resurrect switch is not. Fix: S-enablement requires the same cryptographic authority as a doctrine edit, plus counsel sign-off, plus Phase-gate artifacts — enforced, not asserted.

**N4 — Present-but-false `sourceClass` is a distinct, untested laundering path. (High)**
The omission regression proves *missing* classification fails closed. Nothing addresses *affirmatively false* classification: a writer classes a Mobbin-influenced event as `owned-synthetic`, and every downstream control (novelty exclusion, corroboration block, ART) keys off the asserted label. Classification is writer-asserted provenance with no binding. Opus's S2-1 fix (temporal separation + derivation attestation) partially covers this but never named the omission-vs-misclassification distinction; the fixture corpus needs both. Honest framing: this is a process control, not a technical one — say so in the protocol.

**N5 — The 14-day attestation detail contradicts the durable-identifier ban, or is purposeless. (High)**
The protocol "forbids durable… product/screen identifiers" yet retains full "attestation detail" for 14 days before redacting. Either the detail contains forbidden categories — a direct internal contradiction — or it doesn't, in which case nothing needs redacting and the stub machinery protects nothing. The packet never defines what attestation detail *is*. This independently forces Opus's demote-I conclusion: the only clean resolution is that I emits `{task_id, coarse_timestamp, connector_available}` and the detail/stub/salt/redaction apparatus is deleted wholesale.

**N6 — The packet cannot answer its own review questions. (Medium — meta)**
Q2 asks whether anything can launder into "an external-model prompt"; the packet contains no description of prompt assembly, retrieval, or model routing. Q5 asks about retrieval risk across collections; retrieval architecture is absent. A bounded reviewer must grade these as *unanswerable-as-specified*, which should itself be a finding in the packet's next revision: ship the prompt-assembly and retrieval paths, or withdraw the questions.

**N7 — Purposeless retention: the 90-day probe log and the stubs have no stated use. (Medium)**
Minimization is purpose-relative. `{timestamp, connector label, availability}` is small, but 90 days of it, retained for no declared reason, is not minimized — it is merely *narrow*. Opus flagged the discovery-correlation tension as a counsel question but didn't apply the minimization test to P, while approving P and deleting I's near-identical record — an internal inconsistency in Opus's own verdict. Fix: declare the purpose (abuse detection? connector-health trending?) and set retention to the purpose, or coarsen to day granularity.

**N8 — No integrity anchor over the enforcement code itself. (Low)**
Eight receipts cover documents and regressions; none covers the receipt-writer, ART implementation, or emitter — the components whose compromise defeats everything else. Artifacts are anchored; the mechanism is not. Add receipts (or better, reproducible-build hashes) for enforcement code.

---

## Corrected Architecture (delta from Opus, not a rewrite)

Endorsed wholesale: two planes/no bridge (#1), capability separation over flags (#5), cryptographic authority (#6), signed expiring clearance checked at read+write (#8). Modified or added:

1. **Collapse the letter model.** Opus's demote-I makes I's record identical to P's heartbeat. Say so: the model becomes **P′ / D / X** plus a human-only research plane and a disabled S. Fewer modes, fewer boundaries to defend, and the counterargument's complexity critique is answered structurally instead of rhetorically.
2. **P′ record:** `{task_id, day-granularity timestamp, connector_label, available}`; retention purpose-bound (N7); storage-layer TTL (S2-8). Deletes the salt/stub/14-day machinery (moots S2-2, N1, N5).
3. **Egress broker (strengthened):** deny-by-default; schema-typed payloads only; **free-text fields are unrepresentable below Class-2 and Class-2 never egresses**; broker is the sole network path (no side credentials); every allow/deny logged with class and destination. This closes the S3-4 classification hole.
4. **Source classes:** `owned-synthetic | synthetic | licensed | mobbin(+clearance)`; `owned-production` exists only as a rejected value with a distinct error code; every classed write carries a human-signed **independent-derivation attestation** (process mitigation for N4, labeled as such).
5. **SDIR contract revision (resolves N2):** seven states are the *required minimum*; `safety_critical` surfaces carry a mandatory extension set (`screening-incomplete`, `contraindication-present`, `trainer-approval-required`, `stale-assessment`), a ban on prescriptive numerics (loads, reps, tempo, ROM, progression %, HR zones), and a named NASM-credentialed sign-off as a precondition on write *and* on any future doctrine promotion.
6. **ART reframed as hygiene:** keep as first-pass filters; add lineage separation (no SDIR authored within the same task window as a Probe-confirmed research session) and per-N1, if any attestation reference set survives, it is HMAC-keyed in KMS. Structural similarity remains a process problem — the protocol must say that out loud.
7. **Enable-path governance (N3):** flipping any mode from disabled requires hardware-key-signed authority identical to doctrine edits, plus recorded counsel sign-off, plus phase-gate artifacts. Kill *and* resurrect get drilled (S2-6 extended).
8. **Legacy letters refused, not mapped** (S3-2, tightened).

---

## Phased Validation Plan

- **Phase 0 — Integrity (blocking).** Re-issue all eight receipts uncorrupted *and* locate the scrubber that produced `<REDACTED_PHONE>` — handoff tooling or pipeline — with the finding recorded either way (correcting Opus's assumed attribution). Replace digit-run detection with typed/structured detection; publish precision/recall on a labeled synthetic PII/PHI set. Add enforcement-code receipts (N8). *Exit:* all receipts recomputable; scrubber eval attached; scrubber location documented.
- **Phase 1 — Negative testing.** Mutation floor on all gate code. Adversarial corpus: Opus's set **plus** affirmative misclassification / false `owned-synthetic` labeling (N4); ART-5 decay — block a token, age the attestation past redaction, re-attempt (N1); seven-state contract rejection of a safety-critical SDIR lacking extension states (N2); unauthorized enable-flag flip (N3); SSO-only reconstruction passing ART-1..5. *Exit:* every fixture fails closed with a distinct error code and an alert.
- **Phase 2 — Boundary.** Broker conformance matrix: Class-1/Class-2 payloads to every configured provider, including free-text smuggled inside structured fields — all refused. Provider no-retention terms verified and recorded as artifacts. Confirm broker is the sole egress path (credential audit). *Exit:* zero unauthorized egress.
- **Phase 3 — Drills.** Kill **and** resurrect drills with authorization fixtures; TTL failure injection; clearance revocation propagation to already-written artifacts. *Exit:* drills recorded, CI-repeatable.
- **Phase 4 — Sandbox shadow (S only).** Isolated namespace, non-safety-critical surfaces, author-independent review, dual control. Resolve quota semantics for sandbox explicitly (Opus's ≥30 SDIRs is feasible under 40/quarter only with ≥5 distinct surfaces at 2/surface/30d — state whether sandbox is quota-exempt). *Exit:* ≥30 SDIRs, zero PII findings, zero independent-red-team ART bypasses, counsel answers on non-literal-SSO, pseudonymity, connector ToS, and the clearance record's contract authority. **Phase 4 tests whether S should exist, not when it ships.**

---

## Final Recommendation: When External Processing (Kimi) Justifies Itself

**Not yet, for anything above Class-0 — and the evidence is in this very packet.**

The rule: external processing is justified only when **(value asymmetry) × (enforced minimization) > (residual provider-retention risk)**. Applied:

- **Class-0 (no Swan data, no connector data, no client data):** Justified today, broker or no broker. Highest-value uses are exactly the ones this exercise demonstrates: adversarial second-pass review of non-sensitive architecture documents, synthetic adversarial-fixture generation, mutation-test design, and red-team authoring against ART and the fail-closed branches. These have genuine asymmetric value — an independent reviewer with no shared authorship context catches what same-author suites miss (the omission regression proves the pattern).
- **Class-1 (Swan-owned, non-client, non-connector):** Justified only after Phase 0 and Phase 2 exit — verified no-retention terms *and* a scrub gate that has passed a published eval. The corrupted receipts are direct evidence that the current scrub path rewrites 10-digit runs inside hex digests and, by the same token, demonstrably misses names, notes, and clinical language. Until Phase 0 passes, the demonstrated external-send pipeline is untrustworthy, and this review's own inputs are the proof.
- **Class-2 (client-derived, connector-derived, safety-critical prescriptive content, secrets, governance artifacts):** **Never.** No task value clears this. Opus's never-send list stands; add authority/enablement configuration to it.

One honest limitation that binds me as much as Opus: **an external model without repository access cannot verify repository truth.** I confirmed what is internally checkable and flagged the rest; the 67/67 claim, the four clean hashes, and every enforcement mechanism remain unverified by both passes. If a review's purpose is verification rather than adversarial reasoning, the correct tool is CI with artifact access, not a third model. Kimi's justified niche is exactly where independence matters more than access: hostile document review, fixture generation, and dissent — on Class-0/1 payloads, through a tested broker, after Phase 0.

**Bottom line:** REVISE. P′/D/X survive in hardened form; I collapses into P′; S stays disabled and earns re-examination only as a Phase-4 experiment. Opus's review was substantially correct and worth its $0.31 — its S1-2 and S1-5 are the catches that matter — but it over-attributed the scrubber defect, missed the ART-5 decay and the seven-state contradiction its own fix triggered, and left the enable path ungoverned. External review earned its keep here; it has not yet earned broader data.
