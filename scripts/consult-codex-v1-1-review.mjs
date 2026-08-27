#!/usr/bin/env node
/**
 * Codex v1.1 final re-review via OpenRouter (GPT-5.5).
 *
 * Asks: did v1.1 actually integrate the 8 CRITICALs from the v1 review,
 * and are there any new CRITICAL or HIGH findings introduced by v1.1's
 * changes? Verdict: APPROVE / REVISE / REJECT.
 *
 * Output: docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-v1-1-2026-05-04.md
 */
import { fetchRedacted } from './lib/egress-fetch.mjs';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].replace(/^['"]|['"]$/g, '').replace(/\r$/, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not found');
  process.exit(1);
}

const MODEL = 'openai/gpt-5.5';

const v11 = readFileSync('docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.1-2026-05-04.md', 'utf-8');
const v1Codex = readFileSync('docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-2026-05-04.md', 'utf-8');

const prompt = `You are Codex acting as the FINAL GATE in SwanStudios's 3-Brain Review Loop
(per CLAUDE.md Rule 46), conducting the v1 → v1.1 re-review. Your job is to
verify that ALL the CRITICAL findings you flagged in your v1 review have been
correctly addressed, and to detect any NEW critical or high issues introduced
by v1.1's changes.

Decide: APPROVE / REVISE / REJECT.

CONTEXT:
- v1 review (your own previous output) returned REVISE with:
  * 6 confirmed CRITICAL findings (CR-1 through CR-6)
  * 2 new independent CRITICAL findings (ICR-1, ICR-2)
  * 3 HIGH findings pulled forward to CRITICAL (Sequelize regression
    tests, Rule 58 schema-drift, Rule 42 pre-push audit)
- Total of 11 must-fix-before-implementation items.

YOUR JOB FOR THIS REVIEW:

1. For each of the 11 items below, verify that v1.1 addresses it correctly.
   Mark each as: FIXED / PARTIALLY-FIXED / NOT-FIXED / REGRESSED.

   - CR-1: Sequelize 2-tuple raw-query bug — must use ORM or QueryTypes.SELECT
   - CR-2: Nonce dedup must be atomic (INSERT ON CONFLICT DO NOTHING)
   - CR-3: clip_external_id dedup must be atomic
   - CR-4: SSRF allowlist closed (exact match, HTTPS, no creds, redirect:'error',
           private-IP rejection)
   - CR-5: 503 PLAUD_AUTO_INGEST_DISABLED removed (route absent when flag off)
   - CR-6: Pipeline reorder (no DB write before audio fetch); concurrency cap;
           clip_id not leaked in ALREADY_PROCESSED
   - ICR-1: Backend Canonical Surface Receipt for new webhook route
   - ICR-2: Raw-body capture middleware (express.json verify hook)
   - Rule 50: Sequelize raw-query regression tests
   - Rule 58: Schema-drift tests for Slice 5.1
   - Rule 42: Pre-push backend audit checklists for Slices 5.4 + 5.5

2. Independently scan v1.1 for NEW CRITICAL or HIGH issues introduced by the
   changes. Specifically:
   - Did the v1.1 rewrites introduce new bugs?
   - Did the new pseudocode in §6.1 trade one bug for another?
   - Are the integration tests in §11.2-11.3 actually sufficient?
   - Does §13.2 startup validation have gaps?
   - Does §18.2 Canonical Surface Receipt cover everything?

3. Apply the same constraints as v1 review:
   - Don't suggest features beyond v1 scope (§1.2)
   - Don't demand multi-trainer support
   - Don't demand official Plaud OAuth
   - Anti-rework Rule 52: no Phase 3 changes without failing-test/file:line evidence

VERDICT FORMAT:

  ## VERDICT: [APPROVE | REVISE | REJECT]

  ## One-paragraph reason

  ## Status of v1 must-fix items (11 total):
  - CR-1: [FIXED / PARTIALLY-FIXED / NOT-FIXED] — evidence
  - CR-2: ...
  - CR-3: ...
  - CR-4: ...
  - CR-5: ...
  - CR-6: ...
  - ICR-1: ...
  - ICR-2: ...
  - Rule 50: ...
  - Rule 58: ...
  - Rule 42: ...

  ## NEW CRITICAL or HIGH findings introduced by v1.1:
  - [list with §section evidence + required fix]
  - "NONE" if v1.1 is clean

  ## NEW MEDIUM/LOW findings (v1.x backlog candidates):
  - [list]

  ## Anti-rework verification:
  Did I demand any rework of Phase 3 code without failing-test/file:line evidence? [YES/NO]

  ## Next-step recommendation:
  [APPROVE: proceed to Slice 5.1 implementation
   | REVISE: integrate findings into v1.2, re-submit
   | REJECT: return to planning]

If APPROVE, list any v1.x backlog items you want tracked but are not blockers.

This is the final gate. Be rigorous but proportionate. v1 → v1.1 was a
substantive integration effort; reward correct fixes with APPROVE if the
v1 issues are fully addressed and nothing new is broken.

---

# THE PLAN (v1.1)

${v11}

---

# YOUR PREVIOUS REVIEW OUTPUT (v1 → REVISE verdict)

${v1Codex}

---

END OF CONTEXT. Produce your v1.1 verdict now.`;

console.log(`[codex-v1.1] model=${MODEL}`);
console.log(`[codex-v1.1] prompt size: ${prompt.length} chars`);
const t0 = Date.now();

const res = await fetchRedacted('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios Phase 5 v1.1 Codex Re-Review',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16384,
    temperature: 0.2,
  }),
  signal: AbortSignal.timeout(600_000),
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

const text = data.choices?.[0]?.message?.content || '(empty)';
const inputTokens = data.usage?.prompt_tokens || 0;
const outputTokens = data.usage?.completion_tokens || 0;
const cost = (inputTokens / 1_000_000 * 5) + (outputTokens / 1_000_000 * 30);
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[codex-v1.1] response in ${wallSec}s, $${cost.toFixed(4)}`);

writeFileSync(
  'docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-v1-1-2026-05-04.md',
  `# Phase 5 — Codex v1.1 Re-Review Response

**Reviewer:** OpenRouter \`${MODEL}\`
**Date:** 2026-05-04
**Tokens:** ${inputTokens} in / ${outputTokens} out
**Cost:** $${cost.toFixed(4)}
**Wall time:** ${wallSec}s

---

${text}
`,
  'utf-8'
);
console.log(`[codex-v1.1] saved`);
