# Claude Opus 5 - Review

**Reviewer:** `anthropic/claude-opus-5` (high)
**Document:** C:\tmp\sspt-opus-then-kimi-20260725\docs\ai-workflow\AI-HANDOFF\MOBBIN-PISDX-OPUS-REVIEW-PACKET-2026-07-26.md
**Document SHA-256:** `22207e67646089477ad1bec90c883d77f5005cfc214bf1b4ed98aa571ad91126`
**Seed:** (none)
**Tokens:** 2551 in / 11730 out | **Cost:** ~$0.3060 | **Wall:** 180.6s

---

# Independent First-Pass Review — Mobbin P/I/S/D/X Upgrade
**Reviewer:** Claude Opus 5, acting alone. No prior verdict consulted; no consensus simulated.
**Branch under review:** `codex/mobbin-protocol-v3-20260725` (uncommitted)
**Posture:** hostile. I assume the author is competent and the design is being graded against attackers, subpoenas, and 3 a.m. outages — not against intent.

---

## VERDICT

**REVISE.**

Narrow carve-out: **P (Probe) and D (Doctrine) are approvable with gates** as separable units. **I (Inspect), S (Spec), and X (Source corpus) require revision before any enablement**, and S must remain `enabled:false`.

The core letter-model is sound and the fail-closed instincts are real (missing `sourceClass` failing closed, `E_SOURCE_CLASS_BLOCKED`, the omission-laundering regression test). But the document defends a boundary it does not actually own: **it governs what Swan writes to Swan storage, and is nearly silent on what leaves Swan's egress into third-party model providers, and silent on whether Swan *client* data can enter the design pipeline through the `owned` source class.** Those two gaps are where the real privacy and re-identification exposure lives, and neither is addressed by any of the five ART controls.

---

## Severity-ranked findings

### S1 — Critical (block enablement)

**S1-1. "No durable write" is contradicted by provider-side retention. The durable copy lives outside Swan.**
Inspect explicitly holds a named task/surface/job/question plus up to 10 viewed-result attestations in "task context [that] expires." The document never states where that context is processed. If any of it is placed in an external model prompt, the authoritative durable retention is the provider's abuse/safety log — typically outside Swan's deletion authority and outside the 14-day redaction job. *Exploit path:* Inspect runs → task context ("checkout upsell, trainer dashboard, Mobbin availability confirmed") → external model prompt → provider retains 30 days → later discovery or provider incident reconstructs exactly the research trajectory the protocol was built to not retain. The 14-day salted stub is then privacy theater on the copy Swan controls, while the un-minimized copy sits with a vendor.
**Fix:** an egress broker (see revised architecture) with per-mode field allowlists; connector-derived text categorically never leaves Swan; ZDR/no-retention contractual terms verified for anything else, with the verification recorded as an artifact.

**S1-2. `sourceClass: owned` is an unbounded PII/PHI ingress path.**
The taxonomy is owned | synthetic | licensed | mobbin. All the machinery points at `mobbin`. Nothing constrains `owned`. For a fitness platform, "owned" plausibly includes production screenshots, exports, and real screen content — which is precisely where client identity, session notes, measurements, and injury/screening fields render. An SDIR is required to specify seven states across eight breakpoints; the fastest way any human produces that is by describing a real screen. **This is the re-identification vector in this document, and ART-1..5 do not test for it** — they test token compliance, proper nouns, cross-category disclosure, comparison phrasing, and reverse-mapping *to attestation detail*. None of them is a PII detector.
**Note:** I assert no facts about Swan clients. I assert that the protocol as written does not prevent client-derived content from entering `design-specs`, and that this conflicts with the zero-PII rule.
**Fix:** split `owned` into `owned-synthetic` and `owned-production`; forbid `owned-production` as an SDIR source; run a structured PII/PHI detector (not regex-on-digits) on every SDIR pre-write, fail closed.

**S1-3. "Sean-only" and "scripts and agents cannot promote doctrine" are policy assertions, not enforced boundaries.**
The document gives no enforcement mechanism. Identity in a repo context is trivially asserted (`git config user.name`), and an agent with repo write is indistinguishable from a human at the filesystem layer. Any in-process check ("is actor Sean?") is bypassable by the process that runs the check.
**Fix:** authority must be enforced server-side at a boundary the executing agent cannot reach: protected branch + required hardware-key signature + CODEOWNERS on doctrine paths + append-only doctrine ledger with prior-hash chaining. Until then, treat doctrine as *advisory*, not *governed*.

**S1-4. Receipt integrity is already broken, and the breakage reveals a defective scrubber.**
Four of eight SHA-256 receipts contain `<REDACTED_PHONE>`. Those receipts are now **unverifiable** — they cannot be recomputed or compared, so the operator README, provenance regression, dated risk decision, and kill-switch artifacts have no integrity anchor in this packet. Worse, the *cause* is diagnostic: something matched a 10-digit run inside a hex digest and rewrote it. A digit-run detector will (a) corrupt hashes, IDs, and measurements, and (b) miss names, free-text notes, addresses, and diagnosis language. **A scrubber with this failure mode must not be trusted as a privacy control anywhere in the pipeline.**
**Fix:** re-issue receipts through a channel that excludes hash fields from scrubbing; replace the detector with typed/structured detection plus a labeled synthetic-PII evaluation set and published precision/recall.

**S1-5. No NASM workout-safety governance anywhere in the design path.**
The document treats design specification as aesthetically and legally risky but never as *clinically* risky. An SDIR defines default/empty/error/disabled/offline behavior for arbitrary surfaces. If a surface is assessment, screening, prescription, or progression, the spec silently encodes safety semantics: what an empty state suggests, whether a disabled state means "trainer approval required" or "just tap again," what happens offline when a load-progression write fails. Doctrine (D) then makes those defaults canon, permanently, with no safety reviewer in the loop.
**Fix:** surface taxonomy with a `safety_critical` flag; SDIRs on safety-critical surfaces (a) may contain **no** prescriptive numerics — loads, reps, tempo, ROM, progression percentages, HR zones; (b) must enumerate additional mandatory states: `screening-incomplete`, `contraindication-present`, `trainer-approval-required`, `stale-assessment`; (c) require a named NASM-credentialed sign-off record before write; (d) are ineligible for doctrine promotion without that record.

### S2 — High (fix before S; several also apply to I today)

**S2-1. ART is lexical; UI copying risk is largely non-literal.** ART-2 (proper nouns, long quoted runs) and ART-4 (comparison phrasing) are string-level. The reconstruction that matters is structure, sequence, and organization: step count and ordering of a flow, field order, z-order, disclosure hierarchy, grid ratios, state-transition graph. A paraphrased 8-breakpoint × 7-state spec can be a higher-fidelity reconstruction than a screenshot while passing all five ART checks. ART-5's scope is "reverse-map to live attestation detail" — it protects the stub, not the design.
**Fix:** treat ART as hygiene, not containment. Add a structural diff gate: reject SDIRs whose flow topology was authored within the same task as an Inspect session (temporal/lineage separation), and require an independent human attestation of independent derivation. Accept that this is a process control, not a technical one — and say so in the protocol.

**S2-2. Salt design unspecified; the identifier space is small enough to brute-force.** "Salted non-source stub" is meaningless without: per-record vs global salt, key custody, rotation, and whether the salt is co-located with the stub. Product/screen identifiers are a low-cardinality enumerable space; a global salt stored beside the stubs makes the redaction reversible by anyone with read access to the collection.
**Fix:** HMAC with a key in KMS, never in repo or the same datastore; per-record salt; document that stubs are pseudonymous, not anonymous (a counsel-relevant distinction).

**S2-3. Clearance lifecycle is undefined.** X validates "exact clearance" — but the packet specifies no expiry, no revocation propagation to already-written artifacts, no conflict resolution between two clearance records, no signature/authenticity, and no trusted clock. "Stale" cannot fail closed if staleness is computed against a spoofable system clock.
**Fix:** signed clearance records with hard `notAfter`; revocation list checked at read as well as write; conflicting records → deny; unsigned → deny; missing/unparseable clock source → deny.

**S2-4. Collection separation is undone at retrieval.** `design-specs` is separate from `design-claims`, and eligibility is expressed as *data flags* (`corroborationEligible:false`). Flags in rows are advisory; any retriever that can read both collections re-merges them in a prompt or a RAG context regardless of flags. That is the laundering path the whole design is meant to close.
**Fix:** separate service identity and credentials — the novelty/corroboration/doctrine path must be *incapable* of reading `design-specs` (network/IAM enforced), not merely disinclined.

**S2-5. "Verifies `design-claims` bytes remain unchanged" is a TOCTOU check, not a transaction.** Read-verify-write across two stores under concurrency permits an interleaved claim write to be masked. **Fix:** single-writer lease or transactional guard; verify by content hash chain, not byte comparison at two arbitrary instants.

**S2-6. The kill switch has never been exercised.** A `disabled` kill-switch artifact with a receipt is not a tested control. Untested kill switches fail when used. **Fix:** enable-then-kill drill in a sandbox namespace, with the drill recorded as an artifact and re-run each release.

**S2-7. 67/67 passing is not evidence of coverage.** Same-author code and tests, no mutation score, no adversarial corpus, no property-based generation. The one hostile addition (omission-based laundering) proves the *method* works and simultaneously proves the original suite missed it.
**Fix:** mutation testing with a floor; an adversarial fixture corpus authored to break each ART control and each fail-closed branch; require that new gates ship with at least one red-team fixture that fails before the fix.

**S2-8. 14-day redaction and "task context expires" depend on jobs, not storage semantics.** If the cron fails, unminimized attestation persists silently. **Fix:** storage-layer TTL as primary; job as belt-and-braces; alert on TTL drift and on any record older than policy.

### S3 — Medium

- **S3-1.** Quota set is internally slack: 3/day admits ~270/quarter, so the binding constraints are 40/quarter and 2/surface/30d. Ensure counters are server-side, atomic, and evaluated most-restrictive-first; otherwise a burst pattern satisfies the daily cap while defeating the intent.
- **S3-2.** Legacy mapping (H→P, T→I+S, L→D+X) is a privilege-widening surface even with "does not grant authority" — a T-era artifact fans out into two modes. Prefer refusing legacy artifacts entirely over mapping them.
- **S3-3.** No stated observability on *denials*. Fail-closed systems that don't alarm get "temporarily" bypassed. Emit and alert on every `E_SOURCE_CLASS_BLOCKED`, clearance denial, and ART rejection.
- **S3-4.** Model-routing value is overstated as a control. Routing by cost tier confers no safety. Route by **data class**, enforced at the broker: Class-0 (no Swan data, no connector data) → any model; Class-1 (Swan-owned, non-client, non-connector) → contracted no-retention providers only; Class-2 (client-derived, safety-critical, or connector-derived) → **no external model, ever**. Routing that isn't enforced at egress and tested with fixtures is documentation.

### Counsel, not engineering
Fair use / ToS compliance for the connector; whether pseudonymous stubs remain "personal data" under GDPR/CCPA; trade-dress and non-literal-SSO exposure from 8×7 specs; whether the 90-day probe log's timestamps, correlated with ship dates, become discoverable evidence of access (retention here may *create* the link the design fears — I flag the tension, I do not resolve it); adequacy of the "written clearance record" as contract authority; DMCA CMI implications of stripping identifiers. **Do not let engineering confidence substitute for these answers.**

---

## Strongest counterargument to the proposal

*The entire apparatus is negative-value ceremony around a low-value activity, and it manufactures the exact evidentiary and privacy assets it exists to avoid.*

The underlying act is a human on a paid subscription looking at competitor UI. The zero-infrastructure version — a person browses in a browser, closes the tab, and later writes an original spec — produces **no corpus, no salt to leak, no clearance records naming counterparties, no 90-day timestamp trail correlating research to ship dates, no new collections, no redaction cron, and no laundering path, because there is no path.** P/I/S/D/X instead builds five modes, two collections, a stub-hashing scheme, a clearance registry, a quota ledger, and a redaction job — every one a new failure and disclosure surface — and then argues at length that they are safe. The 67-test suite and eight receipts are evidence of *complexity*, not of reduced risk.

**This argument is strong and partly correct.** It is the reason I approve P and D (cheap, bounded, useful) and refuse S. It is *not* fully correct, because unlogged human research is unauditable: it cannot demonstrate that a specific spec was independently derived, cannot enforce a NASM sign-off, and cannot bound agent behavior — and Swan runs agents. The defensible position is therefore **minimum viable auditability**, not maximum governance: keep the letters that constrain agents and prove authority; delete the letters that build a corpus.

---

## Revised architecture (only where necessary)

1. **Two planes, no bridge.** *Research plane:* human-only, no automation, no agent, no external model, no artifact except a single availability heartbeat. *Build plane:* Swan-owned artifacts only, with no credential path to the connector. Cross-plane transfer is a human writing original text, attested.
2. **Demote I.** Remove Inspect's automated result-attestation entirely. If retained, it emits exactly one record: `{task_id, timestamp, connector_available: bool}` — no product count, no viewed-result stubs, no question text. This deletes S1-1's payload, S2-2's salt problem, and most of the 14-day machinery in one move.
3. **Egress broker as the single choke point.** Deny-by-default. Schema-validated, per-mode, per-field allowlists. Data-class routing (S3-4). Connector-derived text is unrepresentable in any allowlist. Every allow/deny logged with class and destination.
4. **Source class hardening.** `owned-synthetic | synthetic | licensed | mobbin`; `owned-production` exists only as a rejected value with a distinct error code. Structured PII/PHI detector pre-write, fail closed.
5. **Capability separation over flags.** Novelty/corroboration/doctrine services get credentials that cannot read `design-specs`. Eligibility flags remain as defense in depth, not as the boundary.
6. **Authority as cryptography.** Signed, chained doctrine ledger; protected branch; hardware-key requirement; server-side authorization. Agents structurally cannot author doctrine.
7. **NASM safety gate** per S1-5, wired as a hard precondition on write and on doctrine promotion.
8. **Signed, expiring clearance** per S2-3, checked at read and write.

---

## Phased validation plan

- **Phase 0 — Integrity (blocking).** Re-issue all eight receipts uncorrupted; verify each against the artifact. Replace the digit-run scrubber; publish precision/recall on a labeled synthetic PII/PHI set. *Exit:* all receipts recomputable; scrubber eval attached.
- **Phase 1 — Negative testing.** Mutation score floor on all gate code. Adversarial corpus: paraphrase bypass, SSO-only reconstruction, numeric-measurement smuggling, omission, conflicting/stale/unsigned clearance, TOCTOU race, legacy-letter fan-out, quota burst. *Exit:* every fixture fails closed with a distinct error code and an alert.
- **Phase 2 — Boundary.** Egress broker conformance tests: attempt to route Class-1 and Class-2 payloads to every configured provider; all must be refused at the broker. Provider retention terms verified and recorded. *Exit:* zero successful unauthorized egress across the fixture matrix.
- **Phase 3 — Drills.** Kill-switch enable→kill→verify-no-writes. Redaction/TTL failure injection. Clearance revocation propagation to existing artifacts. *Exit:* each drill recorded, repeatable in CI.
- **Phase 4 — Sandbox shadow.** S enabled in an isolated namespace, non-safety-critical surfaces only, 100% human review of every SDIR by a reviewer who is not the author, dual control on write. *Exit:* ≥30 SDIRs with zero PII findings, zero ART bypasses found by an independent red-teamer, and counsel sign-off on the questions above.

---

## Explicit activation recommendation for S

**Do not enable S.** Keep `enabled:false`. S is the only mode that creates a durable, retrievable, reconstruction-capable corpus, and it is the mode with the weakest controls (lexical ART, flag-based separation, no PII detector, no safety gate). Enablement requires, at minimum: S1-1 through S1-5 fixed, S2-1/2-4/2-5/2-6/2-7 fixed, Phases 0–4 passed, and counsel answers on non-literal-SSO and pseudonymity. **Reconsider whether S should exist at all** — Phase 4 should be treated as a test of *whether* to build S, not a formality before shipping it.

---

## What must never be sent to any external model

Categorical deny-list, enforced at the egress broker, not by prompt instruction:

**Client and person data.** Names, emails, phone numbers, addresses, DOB, photos/avatars, biometric or body measurements, progress photos, injury/medical/PAR-Q/screening content, session or trainer notes, adherence and attendance detail, internal user IDs and pseudonymous keys, precise session timestamps, geolocation, emergency contacts, minor/guardian data.

**Payment and identity.** Card data or last-4, Stripe/processor customer, payment-method, subscription or dispute identifiers, invoices, refund reasons.

**Secrets and material.** API keys, tokens, session cookies, `.env` contents, DB connection strings, private keys, **HMAC/salt/pepper material for attestation stubs**, KMS identifiers, webhook signing secrets.

**Connector-derived material of any kind.** Screenshots or image bytes, URLs or deep links, HTML/CSS/SVG, copied copy, source measurements, product/screen/flow identifiers, viewed-result attestations, and any paraphrase, ordering, or structural description traceable to a viewed source.

**Governance artifacts.** Clearance records (they name counterparties and terms basis), attestation stubs, probe logs, quota ledgers, doctrine ledger contents, and the dated risk decision.

**Production system artifacts.** Raw production screenshots, database dumps or query results, unredacted application logs, stack traces containing user data, admin panel captures.

**Safety-critical prescriptive content.** Client-specific loads, reps, tempo, ROM, progression percentages, HR zones, or any generated exercise prescription for a real person.

Anything not on an explicit allowlist for the requesting mode is denied. Silence in the protocol means **deny**, not permit.
