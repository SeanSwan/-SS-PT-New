#!/usr/bin/env node
/**
 * Codex-equivalent gate review via OpenRouter (GPT-5.5).
 *
 * Sean's Codex tool is out of tokens until tomorrow. To unblock the
 * Phase 5 gate review, this calls openai/gpt-5.5 through OpenRouter
 * with the full Codex prompt + plan + hostile review + village summary
 * inlined. GPT-5.5 is the same family Codex runs on, so it's a
 * functional equivalent for this single-turn final-gate decision.
 *
 * Output: docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-2026-05-04.md
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readForEgress, fetchForEgress } from './lib/redact-egress.mjs';

const ROOT = process.cwd();

// Load .env (same pattern as validation-orchestrator)
for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not found in env or .env files');
  process.exit(1);
}

const MODEL = 'openai/gpt-5.5';

// Read the three review docs
const planPath = 'docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1-2026-05-04.md';
const hostilePath = 'docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-HOSTILE-REVIEW-2026-05-04.md';
const summaryPath = 'AI-Village-Documentation/validation-prompts/latest/summary.md';
const securityPath = 'AI-Village-Documentation/validation-prompts/latest/03-security.md';
const codeQualityPath = 'AI-Village-Documentation/validation-prompts/latest/02-code-quality.md';
const dataSafetyPath = 'AI-Village-Documentation/validation-prompts/latest/09-data-safety.md';

const plan = readForEgress(planPath, { label: 'plan' });
const hostile = readForEgress(hostilePath, { label: 'hostile' });
const summary = readForEgress(summaryPath, { label: 'summary' });
const security = readFileSync(securityPath, 'utf-8');
const codeQuality = readFileSync(codeQualityPath, 'utf-8');
const dataSafety = readFileSync(dataSafetyPath, 'utf-8');

const prompt = `You are Codex acting as the FINAL GATE in SwanStudios's 3-Brain Review Loop
(per CLAUDE.md Rule 46). The plan has already been reviewed by 14-brain
AI Village + Claude Opus 4.7 hostile self-review. You are the gate.

Decide: APPROVE / REVISE / REJECT, with file:line evidence.

CONTEXT:
- Phase 3 (manual PLAUD merge UI) shipped today across 24 commits
- A crash-loop incident an hour before this review uncovered a Sequelize
  raw-query bug pattern (ANY(:array::type[]) with replacements producing
  invalid SQL, plus the [rows]/[rows, meta] destructuring class) that
  was not caught by the existing test suite
- This Phase 5 plan was reviewed today by:
  * 14-brain AI Village (\$0.68 cost, 10:28 wall time)
  * Claude Opus 4.7 acting as hostile reviewer (4 CRITICAL, 7 HIGH, 10 MEDIUM, 10 LOW findings)

I AM PROVIDING ALL THREE DOCS INLINE BELOW. Read all of them, then
produce the verdict.

CONSOLIDATED CRITICAL FINDINGS (cross-corroborated by Village + hostile):

CR-1: Pseudocode in §6.1 contains the SAME bug class that crashed prod
      an hour ago.
        - sequelize.query() returns [rows, metadata] tuple
        - Plan's pseudocode treats \`existing\` as direct row array
        - \`existing[0].clip_id\` = undefined → every webhook returns
          ALREADY_PROCESSED with clip_id=undefined
      Sources: hostile review C2; Village CQ-01, CQ-02; Data Safety CRITICAL-2
      Required fix: switch all sequelize.query() to ORM methods OR add
      type: QueryTypes.SELECT and destructure properly.

CR-2: Nonce dedup in §4.2 step 6 is SELECT-then-INSERT (non-atomic).
      Race condition under concurrent requests. Replay protection defeated.
      Sources: hostile review C3; Data Safety CRITICAL-1
      Required fix: INSERT ... ON CONFLICT (nonce) DO NOTHING; check
      rowCount === 0 to detect replay.

CR-3: clip_external_id dedup in §6.1 has same SELECT-then-INSERT race.
      Sources: hostile review C2; Code Quality CRITICAL-2; Data Safety CRITICAL-2
      Required fix: INSERT ... ON CONFLICT DO NOTHING RETURNING.

CR-4: SSRF allowlist underspecified — Q2 still open in plan §15.
      Multiple bypass vectors if regex chosen naively (subdomain prefix,
      URL credentials @, redirect chains, internal Render network paths).
      Sources: hostile review C4; Security F-01; Code Quality CRITICAL-03
      Required fix: exact-string hostname match using URL parser, no
      credentials in URL, HTTPS-only, fetch with redirect: 'error'.

CR-5: §5.4 vs D6 internal contradiction.
      D6 says "route literally absent (404) when feature flag off."
      §5.4 lists 503 PLAUD_AUTO_INGEST_DISABLED as a documented response.
      Sources: hostile review C1
      Required fix: pick one. Recommend keeping D6 + remove 503 from response catalog.

CR-6 (Village-only, not in hostile review): Synchronous-fetch + DB-insert-
      before-fetch = DoS amplification chain.
      Plan inserts plaud_clips row BEFORE fetching audio (§6.1). Each
      request blocks 30s. At 60 req/min rate limit, attacker can sustain
      60 concurrent blocked handlers + 60 DB rows/min. Render's worker
      pool exhausted. Plus clip_id leaked via ALREADY_PROCESSED response = IDOR oracle.
      Source: Security F-02
      Required fix: dedup-check first (no DB write), fetch audio next,
      ONLY insert clip row after successful audio fetch + probe. Add
      per-route concurrency semaphore (max 5 concurrent webhook handlers).

YOUR JOB:

1. Verify the 6 CRITICAL findings above. For each: confirm severity,
   downgrade with rationale, or upgrade with rationale.

2. Independent-verify the plan for issues NOT raised by Village or hostile
   review. Specifically check:
   - Rule 26 Canonical Surface Receipt completeness (plan adds new
     POST /api/plaud/webhook/applaud route — does §18 cover it sufficiently?
     Note: §18 covers the optional frontend badge but not the new backend route)
   - Rule 58 Schema-drift detection (3 new columns + new table)
   - Rule 20 Sibling-sweep (does plan touch all callers of plaud_clips?)
   - Rule 50 Three-Layer QA (Tier-A test coverage in §11; sufficient?)
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
   beyond v1 scope explicitly defined in §1.2).

VERDICT FORMAT:

  ## VERDICT: [APPROVE | REVISE | REJECT]

  ## One-paragraph reason

  ## Confirmed CRITICAL findings (CR-1 through CR-6):
  - CR-1: [CONFIRM / DOWNGRADE-TO-X / DISMISS] — rationale
  - CR-2: ...
  - CR-3: ...
  - CR-4: ...
  - CR-5: ...
  - CR-6: ...

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
   | REVISE: Claude integrates findings into v1.1, re-submit
   | REJECT: return to planning, debate file required]

CONSTRAINTS:
- Don't suggest features beyond v1 scope (§1.2).
- Don't demand v1 ship multi-trainer support (§1.2 explicitly defers).
- Don't demand v1 use official Plaud OAuth API (§1.2 explicitly defers).
- Be specific: "fix this" without text/code is unactionable. Provide
  exact wording or pseudocode for required changes.
- If you APPROVE conditionally, say so explicitly with named conditions.

This is the final gate. Be rigorous.

---

# THE PLAN (v1)

${plan}

---

# CLAUDE'S HOSTILE REVIEW

${hostile}

---

# AI VILLAGE — SUMMARY

${summary}

---

# AI VILLAGE — CODE QUALITY REPORT

${codeQuality}

---

# AI VILLAGE — SECURITY REPORT

${security}

---

# AI VILLAGE — DATA SAFETY REPORT

${dataSafety}

---

END OF CONTEXT. Produce your verdict now.`;

console.log(`[codex-via-openrouter] model=${MODEL}`);
console.log(`[codex-via-openrouter] prompt size: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);
console.log(`[codex-via-openrouter] sending request...`);
const t0 = Date.now();

const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios Phase 5 Codex Gate Review',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16384,
    temperature: 0.2,
  }),
  signal: AbortSignal.timeout(600_000),  // 10 min
});

if (!res.ok) {
  const errBody = await res.text().catch(() => '');
  console.error(`OpenRouter ${res.status}: ${errBody.slice(0, 1500)}`);
  process.exit(1);
}

const data = await res.json();
if (data.error) {
  console.error(`API error:`, data.error);
  process.exit(1);
}

const text = data.choices?.[0]?.message?.content || '(empty response)';
const inputTokens = data.usage?.prompt_tokens || 0;
const outputTokens = data.usage?.completion_tokens || 0;
const cost = (inputTokens / 1_000_000 * 5) + (outputTokens / 1_000_000 * 30);
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[codex-via-openrouter] response received in ${wallSec}s`);
console.log(`[codex-via-openrouter] tokens: ${inputTokens} input, ${outputTokens} output`);
console.log(`[codex-via-openrouter] cost: $${cost.toFixed(4)}`);

const outPath = 'docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-2026-05-04.md';
const outContent = `# Phase 5 — Codex Gate Review Response

**Reviewer:** OpenRouter \`${MODEL}\` (Codex tool unavailable; GPT-5.5 substitute)
**Date:** 2026-05-04
**Tokens:** ${inputTokens} in / ${outputTokens} out
**Cost:** $${cost.toFixed(4)}
**Wall time:** ${wallSec}s

---

${text}
`;

writeFileSync(outPath, outContent, 'utf-8');
console.log(`[codex-via-openrouter] saved to ${outPath}`);
