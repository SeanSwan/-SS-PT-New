# Kimi K3 Final Mobbin Value-Unlock Review

**Status:** KIMI-ONLY HOSTILE RULING
**Input:** two preserved non-authoritative Opus candidates plus current protocol
**Spend cap:** $1.90
**Actual spend:** $0.083712

---

# KIMI K3 HOSTILE REVIEW — Mobbin Reference Intake v4 (P/I/S/D/X + SDIR)

## 1. VERDICT: ADOPT-WITH-GATES

The P/I/S/D/X taxonomy and the SDIR concept are sound and materially better than H/T/L. But Opus 2 is correct where Opus 1 was not: S-mode is **AMBIGUOUS, not cleared**. Opus 1's assertion that "an SDIR is Swan IP, therefore not gated" is a legal conclusion Opus is not qualified to make and Sean has not received in writing. Adoption is conditional on the gates in sections 5-7, with S-mode filed as ambiguous-under-guards, reversible by one flag, and subordinate to Mobbin's written answer. X stays blocked exactly as the current protocol specifies.

## 2. What Opus got right

- **Keying modes on artifact class + aggregation instead of time.** H/T/L's temporary/permanent axis was the actual bug: it conflated D (Swan-evidence doctrine) with X (Mobbin-evidence corpus) and thereby destroyed subscription value while protecting nothing extra.
- **Authorship, not redaction, as the defensible line.** A redacted source-shaped record is still source-shaped. A Swan-authored decision about a Swan surface is a different artifact class. This is the strongest honest framing available.
- **Aggregation caps as the real safeguard.** Substitutability requires coverage and lookup; caps plus the absence of source keys break both. Retention time alone never did.
- **Novelty-dial exclusion for Mobbin-classed input.** Kills the "corpus growth disguised as task work" incentive at the mechanism level, not the policy level.
- **Provenance stub kept permanent while detail expires.** Keeping the fact and dropping the payload is the opposite of concealment; this directly answers the strongest concealment attack.
- **Preserving the X block verbatim** and the existing claim path untouched. Zero relaxation is the correct posture.
- **Both Kimi F2 and F3 adopted** (ephemeral inspection expiry; Mobbin never corroborates).

## 3. What Opus got wrong or understated

- **Opus 1's A5 overreach.** "A Swan-authored specification is Swan IP even when informed by viewing references" is precisely the question Mobbin's terms leave ambiguous. Asserting it as an assumption that flips S-mode to permitted is smuggling the conclusion. Opus 2's correction (ambiguous, risk-accepted, reversible) must govern.
- **Cap arbitrariness.** Opus 1: 6 queries/24 results/3 products per attestation, 2 attestations/surface/7d. Opus 2: 3 queries/5 products/10 results per task, 1 SDIR/task, 40/quarter. These numbers are unreconciled and unjustified. Pick the stricter set (below) and stop negotiating with yourself.
- **The "close the tab, author from memory" ritual is theater if unmechanized.** Memory-authorship is actually the strongest anti-reconstruction property, but only the gates make it real. ART tests must be fail-closed in the writer, not a separate audit step that can be skipped.
- **Understated residual risk: style-level derivation.** Even a clean SDIR can encode "the way top finance apps do empty states" at a level of generality that functions as extracted Mobbin value at scale. The 40/quarter cap and 2-category diversity rule mitigate but do not eliminate this. It must be named in the risk-acceptance artifact, not discovered later.
- **Opus 1's Spec Sheet UI section** is decorative scope; drop it from the decision. A plain deterministic HTML/text handoff suffices; do not let surface polish delay the governance decision.
- **The Mobbin letter asks the wrong question first.** Q2 (may I retain informed specifications) is the load-bearing question and should lead.

## 4. Final P/I/S/D/X operating model

| Mode | Writes | Caps | Status |
|---|---|---|---|
| **P** Probe | one probe.log line | 1 query, 1 result | Likely permitted |
| **I** Inspect | nothing on disk; in-context only | ≤3 queries, ≤10 results viewed, ≤3 products, ≥2 categories where possible | Likely permitted (normal seat use, A4) |
| **S** Spec | `spec/1` SDIR + `attest/1` | 1 SDIR/task, 3/day, 40/quarter; ≤2 SDIRs per surface per 30d | **Ambiguous — ships only under gates §5-7 + dated Sean risk acceptance** |
| **D** Doctrine | Sean hand-edit only; Swan trial evidence only | existing scorecard | Permitted; Mobbin-derived records never eligible |
| **X** Source-corpus | BLOCKED in code, exit 2 `E_SOURCE_CLASS_BLOCKED` | n/a | Prohibited until written Mobbin permission, legal review, or explicit Sean risk acceptance naming the terms version |

## 5. SDIR minimum schema and anti-reconstruction gates

**Required fields:** `schemaVersion:"spec/1"`, `specId`, `rev`, `swanSurface` (route/component), `swanPattern` (C1-C13 enum), `job`, `designQuestion`, `hierarchy`, `states` (7), `responsive` (8 widths), `interactionIntent`, `a11y`, `originalityConstraints`, `swanGrammar` (tokens must exist in `canon/tokens.json`), `provenanceClass`, `attestationId|null`, `corroborationEligible:false`, `doctrineEligible:false`, `createdBy`, `createdAt`.

**No source field exists at all** — not optional, absent. **Denied keys hard-fail:** any URL, base64, screenshot, html/css/svg, deepLink, productName/appName/screenName/flowName, mobbinId, copyText, sourcePx, sourceHex, layoutGrid, lookupHint, connector/oauth/cookie/token/email.

**Gates (in the writer, fail-closed):**
- ART-1 Vocabulary: no source identifiers; no off-scale px; no hex absent from tokens.
- ART-2 Lexicon: refuse proper nouns outside the Swan lexicon allowlist; refuse >4-word quoted runs not in Swan lexicon.
- ART-3 N-of-1: `singleSourceFields` must be empty; <2 informing categories → `singleSourceFlagged:true` → ineligible for any D-mode citation.
- ART-4 Substitution: reject /like|as in|similar to|inspired by/ phrasing tied to any product.
- ART-5 Reverse-lookup: allowlisted keys only; scan for any token present in the live attestation detail slot.

A spec that cannot be authored from memory in Swan grammar after closing the source is dropped, not negotiated into compliance.

## 6. Query, aggregation, retention, and provenance limits

- Per task: ≤3 job-shaped queries (never product-name enumeration), ≤10 results viewed, ≤3 products, ≥2 categories where the question allows. Enforced by an on-disk budget ledger, not honor system.
- Per surface: ≤2 SDIRs per rolling 30 days. Global: ≤40 SDIRs/quarter.
- No cross-session join key on source identity; `sourceProducts` is audit text, never indexed, never FTS, never vault-emitted.
- Retention: probe.log 90d rolling; I-mode context dies with session; SDIR permanent (supersede by rev, never delete); attestation **detail 14 days** (Opus 2's stricter value wins), then auto-redact to stub; stub (id, month, counts, sourceClass, specIds, salted hash, disclosure string) permanent.
- SDIRs are readable by future agents as Swan product specifications — that is their function. They never raise claim confidence, never enter `design-claims`, never reach `config/doctrine.md`, and are never used for training/embedding of Mobbin content in any mode, permanently.

## 7. Exact protocol and test changes

**Protocol (`external-reference-mcp.md`):** rewrite §4 as the five-mode taxonomy with the H/T/L mapping table (H=P; T=I+S; L=D+X); move the existing L-pause wording verbatim onto X; add §aggregation limits, §decision matrix (§3 of Opus 2, adopted), §operator loop, §Mobbin letter; state explicitly that S-mode rests on a dated Sean risk-acceptance artifact naming terms version 2026-05-16 and the residual style-derivation risk, and flips on Mobbin's written answer.

**Code:** mode enum in one shared module consumed by both doc-guard test and writers (no drift); `log-spec.mjs` (schema + ART-1..5 inline); `attest.mjs` (caps, `--prune`, `--report`, chmod 600); `redact-provenance.mjs` run on every invocation; budget ledger; `log-receipt.mjs` refuses `sourceClass=mobbin` with `E_SOURCE_CLASS_BLOCKED` unless a well-formed clearance file exists; `emit-vault.mjs --specs` re-validates at emit, tags non-corroborating; kill-switch `config/spec-mode.json {enabled:false}`.

**Tests (all red before impl):** spec-validate (7 states, 8 widths, denied keys, `corroborationEligible:true` refused); anti-reconstruction (5 fail fixtures + 1 pass each ART); attest caps + redaction permanence + stub undeletable; budget-ledger cap enforcement; mobbin-pause guard; emit re-validation skip + claims path byte-identical; doc↔enum cross-reference test; kill-switch test.

## 8. Operator workflow (Sean, per design task)

1. State mode aloud; default I. 2. `probe.mjs`; if unavailable, write `[MOBBIN UNAVAILABLE]`, continue from canon (counts as cold-mode rep). 3. Inspect in-seat within caps: queries name a job or pattern, never a competitor's catalog. 4. Close the source. 5. If — and only if — a durable lesson exists, author ONE SDIR from memory + canon. If a detail can't be restated in Swan grammar, drop it. 6. `log-spec.mjs`; on FAIL, re-author or abandon — never weaken the gate. 7. `attest.mjs` same session. 8. Generate handoff; builder implements cold. 9. Mobbin value ends here; nothing feeds claims or canon.

## 9. Mobbin clarification request (send verbatim, Q2 leads)

> Subject: Permitted internal use of Mobbin MCP on one subscriber seat
>
> Hello — I'm an individual paid subscriber using your official MCP connector on my own account for internal design work on my own product, and I want to stay inside your terms.
> 1. May I permanently retain my own written design specifications — my own words, describing my own product surfaces — when informed by viewing Mobbin references, containing no Mobbin screenshots, image URLs, HTML, measurements, copy text, product names, or screen identifiers?
> 2. Is agent-assisted interactive viewing within my own seat, at human pace, per design task, a permitted use of the connector?
> 3. Is there a query volume or session pattern you consider automated or excessive?
> 4. May I keep a small, non-public, non-searchable audit log naming products viewed and when, retained 14 days solely to answer questions like this one?
> I retain no Mobbin media, redistribute nothing, build no repository or index, and never share my account. Thank you.

Until answered: S-mode operates under the gates above with the dated risk acceptance. A "no" on Q1 downgrades S to I-only with zero code changes beyond the kill switch already required.

## 10. Final builder directive

Build the P/I/S/D/X taxonomy, the SDIR writer with inline ART gates, the attestation redactor, the budget ledger, and the X-block guard — in that dependency order, test-first, no push to main without Sean's approval. Do not build the Spec Sheet visual polish, do not touch the claims path, do not relax X, and do not record anywhere that S-mode is "cleared" — it is **gated, capped, disclosed, and reversible**. Sean keeps full task-time Mobbin value (P+I are likely-permitted normal seat use) the day this ships, with permanent SDIRs compounding under honest ambiguity rather than false certainty.
