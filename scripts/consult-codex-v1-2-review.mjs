#!/usr/bin/env node
/**
 * Codex v1.2 final re-review via OpenRouter (GPT-5.5).
 * Same pattern as v1.1 review, scoped to v1.2's changes.
 * Output: docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-v1-2-2026-05-04.md
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

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) { console.error('OPENROUTER_API_KEY not found'); process.exit(1); }

const v12 = readFileSync('docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md', 'utf-8');
const v11Review = readFileSync('docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-v1-1-2026-05-04.md', 'utf-8');

const prompt = `You are Codex acting as the FINAL GATE in SwanStudios's 3-Brain Review Loop
(per CLAUDE.md Rule 46), conducting the v1.1 → v1.2 re-review.

Your previous v1.1 review returned REVISE with:
- 1 partially-fixed CR (CR-6: status-blind dedup, stale §8 matrix, §20 clip_id)
- 7 NEW HIGH findings introduced by v1.1's rewrite
- 3 MEDIUM + 2 LOW

Your job: verify v1.2 closes ALL 7 HIGHs + the CR-6 partial-fix gaps, and
detect any NEW issues v1.2 introduces.

Decide: APPROVE / REVISE / REJECT.

For each of the 12 items below, mark FIXED / PARTIALLY-FIXED / NOT-FIXED
/ REGRESSED:
- HIGH-1: Status-aware dedup
- HIGH-2: §20 item 4 no clip_id in replay
- HIGH-3: §8 failure matrix matches v1.1+ pipeline
- HIGH-4: transcript_ready handling (event_type branch before URL validation)
- HIGH-5: Raw-body capture survives global parser
- HIGH-6: Stale §11 duplicates removed
- HIGH-7: Startup validates key_id resolves to secret
- M-1: hex format check before timingSafeEqual
- M-2: body/header timestamp+nonce consistency
- M-3: rate-limiter key (deferred to v1.x — confirm acceptable)
- L-1: duplicate §6.2 heading
- L-2: MEDIA_BASE_URL no-creds check

Independently scan v1.2 for NEW issues. Apply same constraints (no scope creep,
no Phase 3 rework without evidence, Rule 52 anti-rework).

VERDICT FORMAT:

  ## VERDICT: [APPROVE | REVISE | REJECT]

  ## One-paragraph reason

  ## Status of v1.1 review items (12 total):
  - HIGH-1: [FIXED/PARTIAL/NOT-FIXED] — evidence
  - HIGH-2: ...
  - ...

  ## NEW CRITICAL or HIGH findings introduced by v1.2:
  - [list with §section evidence]
  - "NONE" if v1.2 is clean

  ## NEW MEDIUM/LOW findings:
  - [list]

  ## Anti-rework verification: [YES/NO]

  ## Next-step recommendation:
  [APPROVE: proceed to Slice 5.1 implementation
   | REVISE: integrate findings into v1.3
   | REJECT: return to planning]

If APPROVE, list any v1.x backlog items but they are NOT blockers.

This is round 3. Be rigorous but proportionate. Each round of REVISE costs
real work; APPROVE if v1.2 is genuinely implementation-ready and only minor
polish remains.

---

# THE PLAN (v1.2)

${v12}

---

# YOUR PREVIOUS REVIEW OUTPUT (v1.1 → REVISE verdict)

${v11Review}

---

END OF CONTEXT. Produce your v1.2 verdict now.`;

console.log(`[codex-v1.2] prompt: ${prompt.length} chars`);
const t0 = Date.now();

const res = await fetchRedacted('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios Phase 5 v1.2 Codex Re-Review',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.5',
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
if (data.error) { console.error('API error:', data.error); process.exit(1); }

const text = data.choices?.[0]?.message?.content || '(empty)';
const inputTokens = data.usage?.prompt_tokens || 0;
const outputTokens = data.usage?.completion_tokens || 0;
const cost = (inputTokens / 1_000_000 * 5) + (outputTokens / 1_000_000 * 30);
const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`[codex-v1.2] ${wallSec}s, $${cost.toFixed(4)}`);

writeFileSync('docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-RESPONSE-v1-2-2026-05-04.md',
  `# Phase 5 — Codex v1.2 Re-Review Response

**Reviewer:** OpenRouter \`openai/gpt-5.5\`
**Date:** 2026-05-04
**Tokens:** ${inputTokens} in / ${outputTokens} out
**Cost:** $${cost.toFixed(4)}
**Wall time:** ${wallSec}s

---

${text}
`,
  'utf-8');
console.log('saved');
