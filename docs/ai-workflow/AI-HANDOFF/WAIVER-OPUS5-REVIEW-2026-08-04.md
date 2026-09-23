# Opus 5 - Review

**Reviewer:** `anthropic/claude-opus-5` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAIVER-OVERHAUL-CONSULT-PACKET-2026-08-04.md
**Seed:** (none)
**Prompt SHA-256:** `1f3135c14a0e61a266cf681dbc88a1eef9e3b0d22dd9ef046db600f6964bfdc5`
**Tokens:** 4299 in / 23388 out | **Cost:** ~$0.6062 | **Wall:** 358.8s | **finish_reason:** stop

---

# Opus 5 — Hostile Review: SwanStudios Waiver Overhaul

Scope as assigned: attack §5's plan and §3/§4's defect analysis (backend, version-activation, minor/guardian, re-consent, matching), rank risk, deliver §6C, and surface legal-structure findings the design reviewers will miss. Everything below is engineering/product opinion; all legal drafting notes are draft-gate inputs for counsel, not advice.

---

## 0. The three assumptions I'm rejecting outright

**(1) "Backend first" is the right *frame* but the wrong *ordering*.** §5 bundles two unlike things: evidence integrity (irreversible — every hour you sign without it manufactures defective evidence you cannot retroactively repair) and **admin authoring endpoints** (a legal-text CMS — the single most over-engineered item in the packet, and not on the critical path). Ship evidence integrity in week one. Ship authoring last, or never.

**(2) §4.11 mis-labels a control as a defect.** "No admin path to publish new wording (requires code deploy)" is not a bug. Deploy-gating binding legal copy means a legal document cannot reach production without a PR, a reviewer, and an artifact trail. A WYSIWYG Versions tab lets a non-attorney edit an enforceable release at 11pm from a phone. Likewise, "editing existing version text is a silent no-op" is *accidental immutability* — the correct fix is to make it **enforced** immutability (trigger that raises + logs the attempt), not to make it editable.

**(3) "Never edit v1.0; the re-consent machinery can force re-sign" quietly assumes the v1.0 cohort is salvageable going forward.** It isn't, in two ways. v1.0 has no express negligence release, so for the existing cohort the document arguably fails at the one job it exists to do — and re-consent is a *forward* tool that does nothing about a claim arising from a session that already happened. And every minor who signed v1.0 alone is not "imperfectly waivered," they are **unwaivered** (minor's own release is disaffirmable under Fam. Code §6710; there is no minor clause in any document to begin with). You need a **remediation cohort query and an operational plan**, not a version bump: identify all signers with DOB indicating <18 at signature, freeze them from booking until a guardian executes as contracting party, and get counsel's read on the exposure window.

Two more, smaller:

**(4) Scroll-to-accept does not buy enforceability.** §4.3 and §5 both treat per-document read attestation as legal armor. Courts weigh *conspicuousness and opportunity to read*, not scroll telemetry. Four scroll gates on a 4-document bundle at 9pm on a phone buys you abandonment and a false sense of protection. What actually does work: conspicuous formatting, no pre-checked boxes, the operative release restated adjacent to the signature, and a **delivered retainable copy**. Keep a light attestation; do not build scroll-depth as an evidence system.

**(5) "conf 0.9 / conf 0.85" is false precision.** Two deterministic rules are not a calibrated probability. Two decimal places invites an ML rabbit hole nobody at this scale needs. Rename to `STRONG` / `PROBABLE` / `CONFLICT` and delete the float.

---

## 1. Ranked risk register

Ranked by **value of fixing** = severity × likelihood × irreversibility ÷ effort.

| # | Risk | Why it outranks what's below it | Effort |
|---|---|---|---|
| **R1** | **No durable signed artifact.** You snapshot HTML and depend on a future codebase to re-render it. In three years nobody can reproduce what the signer saw. Every record to date is reconstructive evidence. | Irreversible, affects 100% of records, invisible until the day it matters | S |
| **R2** | **Minor pathway is live and legally void.** Minor modeled as signer; guardian self-declared, types on the *minor's device*, and the minor draws the binding mark. Swim lessons are explicitly children's. | Worst-case claim class; irreversible; already accruing | M |
| **R3** | **No express negligence release (v1.0).** In CA the release must be clear and explicit as to negligence; ordinary-negligence release is permitted, gross negligence is not (Civ. Code §1668; *City of Santa Barbara*, 2007). | The document may not do its only job, for the whole cohort | S (drafting) |
| **R4** | **Media consent references no document.** Not "missing text" — **scope-less consent is likely no consent**, and photos have already shipped under it. Consent flags also carry no version FK, so you cannot prove what anyone agreed to. | Legally void + evidence gap + already-published content | S |
| **R5** | **Signature canvas has no keyboard path** on a required field. This is a website of a place of public accommodation in California. Unruh statutory minimum is $4,000/violation plus fees; demand letters are an industry. | Cheapest high-severity fix in the packet | S |
| **R6** | **No bundle identity + stale-version race.** Documents resolve independently, so a signer mid-rollout can be served core v2.0 + swim v1.0. Worse: client fetched at 20:40, submitted at 21:20; server snapshots *the now-active text*, which is not what was displayed. "Two active versions tiebreak on insert order" is the same bug class. | Corrupts the evidence you think you're capturing | M |
| **R7** | **Unworked queue + silent admin failures + auto-link at 0.90.** Trainers will believe waiver status that is wrong or absent. Six admin actions fail to console only (§4.6). | Operational trust collapse; the filing cabinet nobody opens | S |
| **R8** | **No retention / deletion / legal-hold model.** Minor's tolling can run to age 18 + 2 (≈20 years for a toddler) while CPRA delete requests arrive today. No exemption documented. | Compliance vs. evidence collision with no policy | S (policy) + M |
| **R9** | **Emergency-care clause with no emergency contact and no health data collected.** You promise to seek treatment and never capture allergies, conditions, or who to call. | Promise/capability gap; operational, not theoretical | S |
| **R10** | **Consent bundling.** "AI features and personalized recommendations" fuses *serve me* / *send to third-party model* / *train on my data* / *automated decisions*. Classic dark-pattern finding; bundling invalidates. | Split = two checkboxes, one afternoon | S |
| **R11** | **Silent versions-fetch dead-end (§4.2).** Form renders, submit disabled forever, no error. Real consequence isn't a lost lead — it's a trainer saying "we'll sort it later" and training an unwaivered client. | High likelihood on park WiFi | S |
| **R12** | **No age-out job.** A 15-year-old whose parent signed turns 18; the parental release does not cover post-18 sessions and they can disaffirm. Nobody listed this. | Silent, guaranteed, recurring | S |
| **R13** | Admin list ships signature blobs + unsanitized snapshots; match decisions write no audit row. | Signature images are PII; "who linked this waiver to this person" is discovery material | S |
| **R14** | Rate limits wrong in both directions: 10/15min blocks a family of four on one kiosk/WiFi, yet permits ~960 junk waivers/day/IP into the queue. | Fix is a bot check + higher burst keyed on IP+session | S |
| **R15** | **Admin WYSIWYG legal authoring (over-engineering).** Introduces a *new* risk: unreviewed binding text in production. | Cut it | — (negative) |

---

## 2. Backend hardening — what §5 is missing

**Version-activation invariant is under-specified.** "Fix the tiebreak" is app-layer thinking. State it properly and enforce it in the database:

> For each `doc_key` (document_type × activity_code), at most one row may have an active validity interval, treating `[effective_at, retired_at)` as half-open.

```sql
ALTER TABLE waiver_document_versions
  ADD CONSTRAINT one_active_per_doc_key
  EXCLUDE USING gist (
    doc_key WITH =,
    tstzrange(effective_at, retired_at, '[)') WITH &&
  );
```

Cheap, correct under concurrency, correct under bad backfills, and it makes future-dating safe for free. App-level checks in a transaction will not hold.

**Introduce a bundle/manifest — this is the modeling gap nobody named.** `waiver_bundle(id, doc_version_ids[], content_sha256, effective_at, retired_at)` with the same exclusion constraint. Then:

- `GET /versions/current` returns `bundle_id` + `content_sha256`.
- `POST /submit` **must** echo both. If the bundle is no longer active, reject with a distinct code and a "the waiver was updated — here's what changed" diff screen. This closes R6 and gives you a coherent unit for re-consent comparison instead of per-document combinatorics.
- Store `bundle_id`, `content_sha256`, and per-document SHA on the signature record. Then you can prove no version row mutated post-hoc.

**Immutability, enforced.** `REVOKE UPDATE, DELETE` on evidence tables from the app role; `BEFORE UPDATE OR DELETE` trigger that raises and writes to an append-only audit log with `prev_hash`. Same treatment for match decisions: append-only rows recording actor, timestamp, evidence fields used, rule label at decision time.

**Durable artifact (R1).** At submit, inside the transaction boundary or immediately after, server-render a PDF: full bundle text, all field values, consent grid with per-consent version IDs, signature image, attribution block, document IDs. Hash it, store it in object storage with versioning + object lock, email it. `POST /waivers/:id/resend-copy` for the rest of time. This is the single highest-leverage backend change in the packet and it is not in §5.

**Attribution metadata for UETA/E-SIGN.** Server timestamp + client timestamp + TZ offset, IP, UA, and a compact interaction timeline (when each box was checked, signature stroke count and draw duration). Stroke telemetry is what converts "a name appeared in a box" into defensible attribution — and it costs nothing.

**Idempotency.** `Idempotency-Key` header + unique index; replay returns the original record. §4.7 files this under UX; it's a backend integrity requirement. Without it, a double-tap on flaky signal creates two waivers of the same person, which then poisons matching with self-collisions and makes "which one did they sign?" unanswerable.

**Signature images move off list endpoints** to a short-TTL, per-view-audited endpoint. Every read of a signature image logs who looked.

---

## 3. Minor / guardian — this is a schema defect, not a UI defect

§5's "DOB-driven guardian forcing" is necessary and nowhere near sufficient.

1. **Wrong contracting party.** The guardian must be the **releasor**; the minor is the **participant**. Split `contracting_party` from `participant` in the schema. A minor co-signing is decoration. This is not fixable in the UI layer.
2. **Self-reported DOB is a speed bump.** A 16-year-old types 1999. Real controls: (a) **out-of-band guardian execution** — emailed/SMS link, guardian signs on their own device, their own IP, their own timestamp; same-device guardian signature is close to worthless; or (b) in-person guardian signature on the trainer's device with trainer identity attestation. Minor waiver status should be `pending_guardian` until one of those completes, and `pending_guardian` must block booking.
3. **The clause that actually does the work is guardian indemnification**, not the parental release. CA has upheld parental releases in the recreational context (*Hohe v. San Diego Unified*, 1990), but that authority is jurisdiction-specific and contested. Pair the release with: parent releases their own derivative claims + covenant not to sue + parent indemnifies the studio against claims brought by or on behalf of the minor.
4. **Authority attestation**, recorded verbatim: "I am the parent or legal guardian with legal authority to sign for this participant." Note you cannot solve split custody — you can only capture the attestation.
5. **Age bands, not a boolean.** <13: collect *from the guardian only* — a 12-year-old typing their email into your QR page is a COPPA event. 13–17: guardian as contracting party. 18+: self. And default minors **out** of any model-improvement use categorically (CPRA under-16 opt-in posture; also just correct).
6. **17-year-old with no reachable guardian** needs an explicit "we can't complete this online — call the studio" exit, not a dead form.
7. **Age-out job (R12).** Nightly: participants turning 18 → mark `requires_adult_execution`, gate next booking, send a warm 30-second re-execution flow. Highest-value re-consent feature in the system and it's on nobody's list.

---

## 4. Re-consent machinery — the boolean is the bug

`requiresReconsent` as a version-level boolean is too coarse. Every comma fix either annoys your entire book or reaches nobody.

```
reconsent_policy: none | notify_only | block_on_next_booking | block_immediately
reconsent_scope:  all | activity[] | minors_only | signed_before(date)
reconsent_due_at: timestamptz
```

**Gate on booking, never on the dashboard.** Blocking a paying client out of their progress view at 9pm because you fixed a typo is a churn event, and §5's "route gate redirects unsigned clients from dashboards" already has this smell. Gate at the moment that actually matters: session confirmation.

**Soft-landing spec (§6C ask):** banner + email at T-14 / T-7 / T-0 → dedicated `/waiver/update` route showing **"What changed since you signed"** as a rendered diff (added §7 Minors, added §9 Media, clarified negligence) → pre-fill everything from the prior record → one signature, one submit, ~40 seconds. The diff view is the trust move; it converts a compliance nag into "these people are careful."

**Split perpetual from perishable — structural finding.** The packet treats "waiver" as one document with one cadence. It's two:

- **Release** — perpetual. Do **not** put an expiry on it; expiry creates coverage gaps and buys nothing.
- **Health-status attestation (PAR-Q-style)** — perishable. Annual, plus on-change. The core waiver *already promises* "I agree to inform my trainer of any changes to my health status" with **no mechanism to do so** — you've drafted a duty you don't support. Build one-tap "report a health change" in the client dashboard and a 30-second annual re-attestation. This is the useful re-consent, and conflating it with the release is why annual re-signing feels like theater.

**Revocation semantics are undefined and that's a legal footgun.** You cannot un-release a past session. Define: revocation is **forward-only** ("not accepted for future sessions"), never mutates evidence. And a single `revoked` boolean spanning release + consents is wrong — client-initiated withdrawal of *photo* or *Swan Coach* consent must be honored prospectively without touching the release. Photo withdrawal also needs a documented takedown workflow (Instagram is a manual process, with an SLA you actually state), or your promise is false.

---

## 5. Matching flow

The stated risk is bad matches. **The actual risk is an unworked queue** — §4.6's silently-failing admin actions guarantee nobody trusts the queue, so nobody works it, so duplicate identities accumulate while trainers assume "they signed at the door."

Fixes, in value order:

1. **Move match confirmation into the trainer's session-start flow.** The trainer is the highest-quality identity oracle you own and they're already looking at the client's face. Admin dashboards are where identity work goes to die. Downgrade 0.90 auto-link to **provisional link**, confirmed by the trainer at first session, with a one-tap "not this person."
2. **Add negative evidence.** Nothing currently prevents email-reuse false positives. Hard rule: same email + different DOB → never link, raise `CONFLICT`. Shared family phone is extremely common; phone+DOB survives only if DOB is right, and DOB is typo-prone (off-by-one year, MM/DD vs DD/MM).
3. **Normalization spec is missing and silently breaks the phone rule.** E.164 normalize on write or `(555) 123-4567` never matches `+15551234567`. Emails lowercased; do *not* collapse Gmail dots/plus — treat as distinct and flag.
4. Fuzzy DOB tolerance (±1 year, transposed digits) as a *review* signal only — never auto-link.
5. Every link/unlink is append-only audited and **notifies** the account holder ("a waiver was added to your account").
6. Cut the float. `STRONG` / `PROBABLE` / `CONFLICT`.

---

## 6. Section 6C — Logic & Feature Stress Test

### 6C.1 Adversarial walkthroughs (what breaks)

| # | Scenario | Break | Fix |
|---|---|---|---|
| 1 | Park, 1 bar of signal. Client fills 5 sections, draws signature, taps Submit. Request times out. | Raw error string (§4.7), form state possibly lost, signature must be redrawn. Client gives up; trainer trains them anyway. | Draft persistence in localStorage (fields + signature, expiring); explicit "Saved — not yet submitted" state; queued retry; idempotency key generated client-side at page load. |
| 2 | Double-tap Submit on a laggy phone. | Two waiver records → matching self-collision → "which one did they sign?" | Idempotency key + unique index. |
| 3 | Family of four signs on studio kiosk WiFi. | Rate limiter (10/15min) blocks #3 and #4 with no explanation. | Higher burst keyed IP+session; explicit 429 copy with "ask your trainer" path; bot check instead of blunt IP throttle. |
| 4 | Client fetches bundle at 20:40; admin activates v2.1 at 21:00; client submits 21:20. | Snapshot ≠ what was displayed. Silent evidence corruption. | Echo `bundle_id` + `content_sha256`; reject stale with diff screen. |
| 5 | Two versions active, tiebreak on insert order. | Cohort A and cohort B signed different documents on the same day, non-deterministically. | DB exclusion constraint. |
| 6 | 14-year-old signs alone with a fake DOB, then is injured at swim lessons. | No enforceable release; no minor clause anywhere; no guardian; no emergency contact. | Age bands + out-of-band guardian execution + minor clause + emergency contact required. |
| 7 | Parent signs for 15-year-old; three years pass; participant is now 18 and injured. | Parental release doesn't cover post-18 sessions; disaffirmance available. | Age-out job + booking gate. |
| 8 | Existing client adds Swimming after 8 months. | No additive-addendum path. Either full re-sign (friction, and it re-executes the release for no reason) or — realistically — nothing, and you have unwaivered swimming. | Additive addenda: sign only the new addendum + short core re-affirmation; new snapshot rows, same participant, same release lineage. |
| 9 | Client tells trainer "my cardiologist changed my meds." | The waiver promises they'll tell you; there's no mechanism, no record, no trainer notification. | One-tap health-change report → trainer notification → append-only note. |
| 10 | Client emails "delete my data" (CPRA). | No legal-hold exemption, no retention schedule, no defined response. | Documented retention schedule + hold exemption + a real workflow. |
| 11 | Client withdraws photo consent after a reel is posted. | No takedown workflow; consent flag flips and nothing happens. | Prospective withdrawal + takedown SLA + where-published log. |
| 12 | Keyboard-only or motor-impaired client (or a client with a broken wrist — this is a *training* studio). | Required canvas, no alternative. Cannot complete. | Type-to-sign with explicit UETA-style adoption language; same evidentiary weight, recorded as `signature_method: typed`. |
| 13 | Guest signs via QR, never creates an account. | Orphan PII with unclear contact basis; transactional copy is fine, marketing is not. | `contact_basis: transactional_only` flag; no marketing until account/consent. |
| 14 | Someone scripts 400 fake waivers overnight. | Queue unusable; real signers buried. | Turnstile/bot check on the public path; queue triage by evidence quality. |
| 15 | Spanish-first client signs the English release. | Enforceability risk in Southern California. | "I can read and understand English" attestation now; plan a translated version. |

### 6C.2 Missing features, ranked by value

1. **Trainer-side waiver status at session start.** Today's roster, green/amber/red per client, "send sign-now link by SMS," identity confirm, health-flag surfacing. Nothing else in this system matters if the person on the floor can't see status in two seconds. **This is the highest-value missing feature in the entire packet and it appears nowhere in §5.**
2. **Mandatory copy delivery + resend endpoint.** E-SIGN retention is not satisfied by a screen shown once.
3. **Additive addenda for new activities.**
4. **Age-out job.**
5. **Re-consent diff view ("what changed").**
6. **Health-change reporting + annual health re-attestation** (separate from the release).
7. **Emergency contact + must-know conditions** as required fields.
8. **Draft persistence / queued submit.**
9. **Guardian out-of-band execution flow.**
10. **Bulk cohort tooling for remediation** (find all pre-v2.0 minors; find all v1.0 signers; drive campaigns).

### 6C.3 Cut as over-engineering

- **Admin WYSIWYG legal authoring.** Replace with: Markdown-in-repo → seeded version rows → staging preview → rendered diff in the PR → two-person publish (one must be the owner). You get authoring speed without the ability to break a legal document at 11pm.
- **Numeric confidence scores** and any fuzzy name matching.
- **Per-document scroll-to-accept telemetry as evidence.** Keep one lightweight attestation per addendum with a visible read-ledger; drop scroll-depth logging.
- **Hero video + typewriter title on a release page.** Marketing framing around a waiver is an argument gift on surprise/unconscionability, and typewriter animation on legal text is actively hostile. Static image, real headline.
- **Interactive/skippable step rail.** Sticky progress indicator, non-navigable.
- **Cross-device draft resume.** Not worth the token surface.
- **Arbitration clause** (see below) — cut, don't add.

---

## 7. Legal-structure findings the design reviewers will miss

Draft-gate inputs, not advice.

1. **Trainer-injured-at-client's-home is the loss you'll most likely actually eat, and the Home Gym addendum ignores it.** It protects the studio from *client* injury only. You need the reciprocal: client warrants the premises are reasonably safe, will disclose hazards and restrain pets, **indemnifies the studio and trainer for injury to the trainer** at the client's premises, and acknowledges their homeowner's/renter's coverage may apply. Best finding in this review.
2. **Independent contractors.** If trainers are 1099, the released-parties list must expressly include independent contractors, and trainers must be named third-party beneficiaries — otherwise the person actually being sued isn't released.
3. **Add an explicit gross-negligence carve-out.** Counterintuitive but important: a release that overreaches into gross negligence/willful misconduct invites a court to strike it. An express "nothing herein releases gross negligence, recklessness, or willful misconduct, or any liability that cannot be released by law" makes the ordinary-negligence release *more* likely to survive.
4. **"I affirm that I am physically fit" is dangerous drafting.** It's a representation the client can't reliably make and it seeds a reliance argument ("you accepted my fitness"). Rewrite toward: no physician has advised against exercise; I have disclosed known conditions; **SwanStudios is not a medical provider and provides no medical clearance.** Convert "recommends consulting a physician" from a suggestion into an instruction with an acknowledgment.
5. **Covenant not to sue + derivative-claim binding.** "Release and discharge" alone doesn't stop claims by spouse, heirs, or a minor's estate. Bind heirs, executors, administrators, spouse, assigns; add a covenant not to sue and an indemnity for third-party claims brought on the signer's behalf.
6. **Recommend NO arbitration clause.** §3 lists it as a gap; I'd close the gap by deciding against. For a boutique studio there's no class exposure to shed, consumer-arbitration fee-shifting (CA SB 707 dynamics) is bad for the small business, and an arbitration clause stacked on a release strengthens an unconscionability narrative. Add instead: venue + exclusive jurisdiction in the studio's county, and a short pre-suit notice / informal-resolution step.
7. **Severability needs a savings clause specific to the release:** if the negligence release is held unenforceable, construe it to release to the maximum extent permitted; remainder survives.
8. **Swimming: supervision representation is unaddressed.** Who is the water-safety/CPR-certified person? Disclaiming supervision may disclaim the service. For minors, impose an affirmative duty on the guardian ("must remain on premises within sight and sound"), don't merely disclaim. And whose pool — a client's backyard pool raises attractive-nuisance and coverage questions the addendum ignores.
9. **Park & outdoor: municipal permits.** Some cities require a permit for commercial training in public parks. Don't imply one exists; allocate citation responsibility.
10. **Capacity/intoxication attestation** and a "do not train while impaired" policy line. Missing entirely.
11. **E-SIGN/UETA consent is more than "I agree to e-signatures."** You need: hardware/software requirements statement, right to a paper copy and how to get one, right to withdraw e-consent and consequences, and how to update contact info. §3 flags the clause; nobody flagged the required elements.
12. **Conspicuousness in a scrolling page.** The "immediately above the signature" convention dies on the web. Restate the operative release as a short, bold, **boxed** "What you're agreeing to" panel directly above the signature. Avoid ALL-CAPS walls — they're less readable and can cut against you; use bold + boxing + a distinct panel.
13. **Language (Civ. Code §1632 posture).** Fitness waivers aren't in the enumerated categories, but if you market in Spanish, an English-only release is an enforceability risk in your market. Minimum: an English-comprehension attestation. Roadmap: a Spanish version as its own version row, not a translation overlay.
14. **Add "opportunity to ask questions and consult counsel"** acknowledgment.
15. **Version identity rendered from data and visible on screen and in the PDF:** "SwanStudios Release v2.0 · effective 2026-03-01 · doc 4f2a…". Fixes §3's hardcoded date, and self-describing evidence is disproportionately credibility-building.
16. **Communicable disease clause: generic, not COVID-named**, paired with a "don't train sick" policy.
17. **Media consent must be split and scoped:** internal/progress use vs. public marketing incl. social and paid ads; no compensation; no obligation to use; revocable prospectively with a named contact and stated timeframe; minors require guardian; explicitly **not** a condition of service (and say so on the page). Separately: publishing a minor's face plus a park location is a child-safety issue, not just a legal one — say so in the guardian-facing copy.
18. **Keep ToS/payment/cancellation out of the release,** but confirm a services agreement exists somewhere. A waiver is not a contract for services, and reviewers routinely let scope creep turn it into one.

---

## 8. Three ways this fails in the real world

**Failure mode 1 — "The waiver everyone has, that nobody can produce."**
Eighteen months from now a client tears an ACL at a park session and retains counsel. You produce a database row with an HTML snapshot. Opposing counsel asks for the document as presented, on the device, at that moment. Your React page has been rewritten twice; the CSS that made the negligence paragraph conspicuous is gone; the bundle resolved from two independently-versioned rows and you can't prove which combination rendered; nobody can demonstrate the signer saw the section you're relying on. You still settle — but you settle from a position of "our records are ambiguous" rather than "here is the signed PDF, hashed, with the interaction timeline." **Root causes: R1, R6.** Everything else in the packet is downstream of this.

**Failure mode 2 — "The 13-year-old at the pool."**
A parent QR-scans at the pool deck, hands the phone to their 13-year-old, who fills their own name, DOB (typed as 2001 because it's faster), checks "guardian applicable," types "Mom," and draws a scribble. The system accepts it, matching sends it to the review queue, the queue is unworked because six admin actions fail silently, and the trainer sees "signed" and proceeds. Eight lessons later there's a shallow-water incident. You have: no enforceable release (minor signer, disaffirmable, no minor clause exists in any document), no guardian contact, no emergency contact, no disclosed ear infection or seizure history, no record of who was on the deck, and a media consent under which you already posted a reel of the child's face at a named public park. **Root causes: R2, R4, R7, R9.** This is the scenario that closes a small studio.

**Failure mode 3 — "The compliance nag that costs you your book."**
You ship v2.0 with `requiresReconsent = true`, the route gate fires on dashboards, and 340 clients hit a blocking legal wall at 9pm when they opened the app to check their squat numbers. There's no diff, no explanation of why, and a scroll-to-accept gate on four documents on a phone. Support gets 60 messages in a night. Trainers start telling clients "ignore it, I'll handle it" — and the moment a trainer teaches clients that the waiver gate is optional theater, every control in this document is dead, permanently. Meanwhile the minor cohort was never remediated because the campaign was undifferentiated. **Root causes: coarse `requiresReconsent`, dashboard-level gating, no soft-landing, no cohort scoping.** This is the failure that looks like a UX complaint and is actually the end of your compliance culture.

---

## 9. What I'd build first

**Day 1–2 (ship before anything else — stop manufacturing defective evidence):**

1. `EXCLUDE USING gist` constraint on version activation. One migration.
2. Bundle table + `content_sha256`; `/versions/current` returns `bundle_id` + hash; `/submit` requires and validates them, rejecting stale with a distinct code.
3. **Server-rendered PDF artifact** at submit → hashed → object-locked storage → emailed. Plus `resend-copy`.
4. Enforced immutability on evidence tables (revoke + trigger + append-only audit log with `prev_hash`).
5. Idempotency key on submit.
6. `try/catch` + visible error/retry on the versions fetch; kill the silent dead-end.
7. **Type-to-sign fallback** with adoption language. One day of work, removes an Unruh-shaped exposure.

**Week 1:** hard-gate the minor path — `pending_guardian` blocks booking, guardian executes out-of-band as **contracting party**, age bands (<13 / 13–17 / 18+), emergency contact required, `contact_basis` flag on guest records. Then: **trainer session-start waiver status view** with SMS sign-now and identity confirm. Then split the two consent checkboxes and add version FKs to every consent flag.

**Week 2:** wording v2.0 as new bundle rows — negligence release + gross-negligence carve-out, minors/guardian section, media release document, reciprocal home-premises indemnity, E-SIGN block, venue, savings clause, health screening split out as its own perishable document. Into legal review while the UX ships against the draft.

**Week 3:** re-consent policy enum + scope + `due_at`, diff view, booking-level (never dashboard-level) gating, age-out job, additive-addendum path. Then the remediation cohort campaign — v1.0 minors first, then the full v1.0 cohort.

**Not in the first month:** admin authoring UI. Legal text ships through the repo with a two-person gate until the rest of this exists.

**The single premium moment**, since you asked for one: not the typewriter and not the hero video. It's the **boxed "What you're agreeing to" panel directly above the signature line** — three short bold sentences restating the release in the client's own words, with the version ID and effective date rendered beneath in Gilded Fern — followed, on submit, by a success card that names *exactly what was signed, when, and where the copy just went*. Legal armor and premium feel are the same gesture here: a studio that shows you precisely what you signed is a studio that has its act together.
