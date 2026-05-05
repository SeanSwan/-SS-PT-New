# Codex Review Prompt — Phase 5 PLAUD Auto-Ingestion v1

**For Sean to paste into Codex's review API.**
**Created:** 2026-05-04
**3-Brain Loop position:** Final gate (Claude built → Village reviewed → Claude hostile-reviewed → YOU)

---

## How to use this

Paste everything in the **`### CODEX PROMPT START` to `### CODEX PROMPT END`** block below into your Codex review API call. Codex returns a verdict.

If APPROVE → I implement Slice 5.1.
If REVISE → I integrate Codex findings into Plan v1.1 and we re-submit.
If REJECT → multi-round debate file.

---

### CODEX PROMPT START

```
You are Codex acting as the FINAL GATE in SwanStudios's 3-Brain Review Loop
(per CLAUDE.md Rule 46). Decide: APPROVE / REVISE / REJECT.

CONTEXT:
- Phase 3 (manual PLAUD merge UI) shipped 2026-05-04 across 24 commits
- Crash-loop incident an hour before this review uncovered a Sequelize
  raw-query bug pattern (ANY(:array::type[]) with replacements) that was
  not caught by the existing test suite
- This Phase 5 plan was reviewed today by:
  * 14-brain AI Village (Phase 1 + 2 + 3 specialty debates + escalations)
  * Claude Opus 4.7 hostile self-review

THREE DOCUMENTS TO READ IN FULL:

[1] THE PLAN (your primary review target):
    docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1-2026-05-04.md
    (~830 lines)

[2] CLAUDE'S HOSTILE REVIEW:
    docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-HOSTILE-REVIEW-2026-05-04.md
    Findings: 4 CRITICAL (C1-C4), 7 HIGH, 10 MEDIUM, 10 LOW

[3] AI VILLAGE OUTPUT:
    AI-Village-Documentation/validation-prompts/latest/summary.md (start here)
    Then load these specific reports for CRITICAL/HIGH findings:
    - 02-code-quality.md (3 CRITICAL: raw SQL, sequelize.query 2-tuple bug,
      SSRF allowlist underspec)
    - 03-security.md (2 CRITICAL: F-01 SSRF chain, F-02 sync-fetch DoS +
      clip_id oracle; 4 HIGH: F-03 JWT-XSS, F-04 key rotation race,
      F-05 nonce crash-safety, F-06 audio_size trust)
    - 09-data-safety.md (4 CRITICAL: nonce race, clip_external_id race,
      transaction boundaries, partial-write corruption)
    Notes: Phase 1 had 3 timeouts and 1 fail (Trinity). Phase 2B (code
    quality debate) failed on OpenRouter provider error — so the code
    quality debate did NOT reach consensus. Phase 2A and 2C did consensus.
    Phase 3 escalations (Nemotron Super + GPT-5.5) ran successfully.

CONSOLIDATED CRITICAL FINDINGS (cross-corroborated by Village + hostile):

CR-1: Pseudocode in §6.1 contains the SAME bug class that crashed prod
      an hour before this review.
        - sequelize.query() returns [rows, metadata] tuple
        - Plan's pseudocode treats `existing` as direct row array
        - `existing[0].clip_id` = undefined → every webhook returns
          ALREADY_PROCESSED with clip_id=undefined
        - This is identical to the ANY(:array::type[]) bug class:
          "raw SQL pattern that has wrong runtime shape"
      Sources: hostile review C2; Village CQ-01, CQ-02; Data Safety CRITICAL-2
      Required fix: switch all sequelize.query() to ORM methods (PlaudClip
      .create, .findOne) OR explicitly add type: QueryTypes.SELECT and
      destructure properly.

CR-2: Nonce dedup in §4.2 step 6 is SELECT-then-INSERT (non-atomic).
      Race condition under concurrent requests. Replay protection is
      defeated by the very pattern that's supposed to enforce it.
      Sources: hostile review C3; Data Safety CRITICAL-1
      Required fix: INSERT ... ON CONFLICT (nonce) DO NOTHING; check
      rowCount === 0 to detect replay. SELECT-then-INSERT is prohibited.

CR-3: clip_external_id dedup in §6.1 has same race pattern.
      Two concurrent retries from Applaud both pass SELECT, both hit
      INSERT, second fails with constraint violation → 500 storm.
      Sources: hostile review C2; Code Quality CRITICAL-2; Data Safety CRITICAL-2
      Required fix: INSERT ... ON CONFLICT (clip_source, clip_external_id,
      user_id) DO NOTHING RETURNING clip_id. If no row returned, SELECT
      to grab existing. Return 200 ALREADY_PROCESSED.

CR-4: SSRF allowlist underspecified — Q2 still open in plan.
      §3.3 V1.4 + §4.2 Step 8 leave regex-vs-exact unresolved. If
      developer picks regex + naive pattern, multiple bypasses exist:
      subdomain prefix, URL credentials @, redirect chains, internal
      Render network paths.
      Sources: hostile review C4; Security F-01; Code Quality CRITICAL-03
      Required fix: exact-string hostname match using URL parser, no
      credentials in URL, HTTPS-only, fetch with redirect: 'error'
      (not 'manual' — error rejects entirely).

CR-5: §5.4 vs D6 internal contradiction.
      D6 says "route literally absent (404) when feature flag off."
      §5.4 lists 503 PLAUD_AUTO_INGEST_DISABLED as a documented response.
      Both can't be true.
      Sources: hostile review C1
      Required fix: pick one. Recommend keeping D6 (smaller attack surface)
      and removing 503 from response catalog.

CR-6 (Village-only, not in hostile review): Synchronous-fetch + DB-insert-
      before-fetch = DoS amplification chain.
      Plan inserts plaud_clips row BEFORE fetching audio (§6.1). Each
      request blocks 30s. At 60 req/min rate limit, attacker can sustain
      60 concurrent blocked handlers + 60 DB rows/min. Render's worker
      pool exhausted. Plus clip_id leaked via ALREADY_PROCESSED response
      = IDOR oracle.
      Source: Security F-02
      Required fix: dedup-check first (no DB write), fetch audio next,
      ONLY insert clip row after successful audio fetch + probe. Add
      per-route concurrency semaphore (max 5 concurrent webhook handlers).

YOUR JOB:

1. Verify the 6 CRITICAL findings above. For each: confirm severity, or
   downgrade with rationale, or upgrade with rationale.

2. Independent-verify the plan for issues NOT raised by Village or hostile
   review. Specifically check:
   - Rule 26 Canonical Surface Receipt completeness (plan adds new
     POST /api/plaud/webhook/applaud route — does §18 cover it?)
   - Rule 58 Schema-drift detection (3 new columns + new table)
   - Rule 20 Sibling-sweep (does plan touch all callers of plaud_clips?)
   - Rule 50 Three-Layer QA (Tier-A test coverage in §11; is it enough?)
   - Rule 51 Confidence-tag discipline (claims like "should work," "likely
     fine" without [VERIFIED]/[LIKELY]/[HYPOTHESIS] tags)
   - Rule 52 Anti-rework burden (any finding demanding Phase 3 code
     changes — Phase 3 is recently-passed gate, requires high evidence
     bar to re-flag)
   - Rule 34 Forbidden language ("end-to-end fixed," "guaranteed deletable,"
     "safe to delete" anywhere in the three docs)
   - Rule 42 Pre-Push Backend Audit awareness for slice 5.4/5.5

3. Cross-check Village findings against CLAUDE.md rules. Reject any
   Village finding that contradicts a CLAUDE.md rule. CLAUDE.md wins.

4. Flag any Village findings that are scope creep (suggesting features
   beyond the v1 scope explicitly defined in §1.2).

VERDICT FORMAT (your output):

  ## VERDICT: [APPROVE | REVISE | REJECT]

  ## One-paragraph reason: [why this verdict]

  ## Confirmed CRITICAL findings (CR-1 through CR-6):
  - CR-1: [CONFIRM / DOWNGRADE-TO-X / DISMISS] — rationale
  - CR-2: ...
  ...

  ## Independent CRITICAL findings (not in hostile or Village):
  - [list with §section evidence]

  ## HIGH findings I'm pulling forward to CRITICAL:
  - [list with rationale]

  ## Findings I'm rejecting from Village (with CLAUDE.md rule citation):
  - [list]

  ## Findings I'm rejecting from hostile review (with rationale):
  - [list]

  ## Required changes for Plan v1.1 (sorted by required slice):
  ### Must-fix BEFORE slice 5.1 (DB foundation):
  - [list]
  ### Must-fix BEFORE slice 5.5 (route mounting):
  - [list]
  ### Must-fix BEFORE slice 5.9 (staging activation):
  - [list]
  ### Track in slice 5.7+ or v1.x:
  - [list]

  ## Items I confirmed without changes needed:
  - [list]

  ## Anti-rework verification:
  Did I demand any rework of Phase 3 code without failing-test/file:line
  evidence? [YES — list / NO]

  ## Next-step recommendation:
  [APPROVE: proceed to slice 5.1 implementation
   | REVISE: Claude integrates findings into v1.1, re-submit to Codex
   | REJECT: return to planning, debate file at PHASE-5-OPUS-CODEX-DEBATE-2026-05-04.md]

CONSTRAINTS:

- You may consult ANY file in the repo. Use file:line citations.
- Don't suggest features beyond v1 scope (§1.2).
- Don't demand v1 ship multi-trainer support (§1.2 explicitly defers).
- Don't demand v1 use official Plaud OAuth API (§1.2 explicitly defers
  due to private-beta gate).
- Be specific: "fix this" without text/code is unactionable. Provide
  exact wording or pseudocode for required changes.
- If you APPROVE conditionally ("approve if these LOW findings get
  v1.x slice tickets"), say so explicitly with named conditions.

This is the gate. Be rigorous.
```

### CODEX PROMPT END

---

## What I (Claude) need from you (Sean) after Codex returns

Paste the FULL Codex response back to me. I will:

1. Sort findings by severity and slice-blocking timing
2. For each CONFIRMED CRITICAL: apply fix to Plan v1.1
3. For each CONFIRMED HIGH (must-fix-before-deploy): apply fix or document deferred
4. For each MEDIUM/LOW: note in Plan v1.1 §15 Open Questions
5. Verify Anti-Rework burden was honored (Codex didn't demand Phase 3 rework without evidence)
6. Write a v1 → v1.1 change summary
7. Decide whether v1.1 needs another Codex pass (if changes are non-trivial)

If Codex says REJECT, I write `PHASE-5-OPUS-CODEX-DEBATE-2026-05-04.md` and we go to multi-round debate per Rule 46.
If Codex says APPROVE, we ship Slice 5.1 + tests + commit + push.

---

## Pre-Codex sanity check — what I expect

**Most likely Codex verdict: REVISE.**

Reasoning:
- 6 CRITICAL findings already corroborated between Village + my hostile review. Codex won't APPROVE a plan with confirmed CRITICAL bugs in pseudocode.
- The pseudocode bugs (CR-1, CR-2, CR-3) are the SAME bug class that crashed production an hour before this review. Codex will not approve repeating that class.
- The plan's open questions (§15 Q1-Q8) include security-sensitive ones (Q2, Q4, Q7) that need resolution before slice work — Codex tends to require these closed.

**Possible-but-unlikely: REJECT.**

Reasoning: REJECT requires fundamental architectural problems. The plan's architecture (receive-only webhook, reuse Phase 3 pipeline, single-trainer v1) is sound. Codex would have to find an architectural flaw I missed. Possible if Codex finds a Plaud-side issue we haven't anticipated, but unlikely.

**Possible: APPROVE-CONDITIONAL.**

Reasoning: Codex sometimes APPROVE-conditional with "fix these CRITICALs as part of slice 5.1, no v1.1 needed." Less common but happens when CRITICALs are pseudocode-only (not architectural). Plausible here since 4 of 6 CRITICALs ARE pseudocode.

**My recommendation if Codex REVISE:** integrate the 6 CRITICAL fixes plus any Codex-added CRITICALs into v1.1, ship v1.1 in this same session, re-submit. Total cycle ~30 min.

---

**End of Codex review package.**
