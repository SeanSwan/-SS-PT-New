#!/usr/bin/env node
/**
 * Codex hostile review of Phase 5 IMPLEMENTATION (slices 5.1-5.6 + 5.8).
 *
 * Reviews the actual shipped code, not the plan, against:
 *   - Plan v1.2 spec
 *   - My (Claude's) hostile self-review (separate inputs to Codex)
 *   - CLAUDE.md rules
 *
 * Codex is asked to confirm/dismiss my findings AND find new ones.
 *
 * Output: docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-IMPL-REVIEW-2026-05-04.md
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readForEgress, fetchForEgress } from './lib/redact-egress.mjs';

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

// Read the implementation + tests + my hostile review
function read(p) { return readForEgress(p, { label: p }); }

const planV12 = read('docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md');
const myHostile = read('docs/ai-workflow/AI-HANDOFF/PHASE-5-IMPLEMENTATION-HOSTILE-REVIEW-2026-05-04.md');

const migration = read('backend/migrations/20260504100004-plaud-applaud-source-columns.cjs');
const plaudClipModel = read('backend/models/PlaudClip.mjs');
const nonceModel = read('backend/models/PlaudWebhookNonce.mjs');
const cron = read('backend/jobs/plaudCronJobs.mjs');
const sigService = read('backend/services/plaudWebhookSignature.mjs');
const fetcher = read('backend/services/applaudAudioFetcher.mjs');
const controller = read('backend/controllers/plaud/plaudApplaudWebhookController.mjs');
const route = read('backend/routes/plaud/plaudWebhookRoutes.mjs');
const semaphore = read('backend/utils/semaphore.mjs');
const coreRoutes = read('backend/core/routes.mjs').slice(0, 6000); // first 6KB to keep prompt manageable
const coreMiddleware = read('backend/core/middleware/index.mjs').slice(0, 3000);
const audioProbeService = read('backend/services/audioProbeService.mjs');

// Slice 5.4 has ClipProbeTimeoutError — let Codex verify
const claude_md = read('CLAUDE.md').slice(0, 40000); // first ~40k chars (rules section)

const prompt = `You are Codex acting as a HOSTILE REVIEWER (not a gate review) of the Phase 5
PLAUD Auto-Ingestion IMPLEMENTATION shipped across slices 5.1, 5.2, 5.3, 5.4,
5.5, 5.6, and 5.8.

This is the post-Codex-APPROVE implementation pass. You APPROVED the v1.2 plan
in your previous round. Now you're reviewing whether the shipped code actually
matches the plan and is implementation-ready for staging activation.

Claude (the author) has already written a hostile self-review identifying 5
CRITICAL findings. Your job:

1. Verify each Claude finding (CR-IMPL-1 through CR-IMPL-5 + 10 HIGH + 5 MEDIUM
   + 4 LOW + 3 OBS). For each: CONFIRM / DOWNGRADE-WITH-RATIONALE / DISMISS-WITH-RATIONALE.

2. Find issues Claude missed. Specifically scan the IMPLEMENTATION SOURCE for:
   - Sequelize bug-class patterns (the prod-crash family)
   - Schema drift between migration / model / controller raw SQL
   - Race conditions in the dedup-fetch-insert flow
   - Error handling gaps that leak internals
   - Inconsistencies between Slice 5.2 (signature service) and Slice 5.4
     (controller) that would cause production failures
   - Security holes (SSRF, replay, CSRF, timing attacks)
   - Operational visibility gaps
   - CLAUDE.md rule violations not caught by Claude

3. Cross-check against CLAUDE.md rules — flag any violations:
   - Rule 26 Canonical Surface Receipt
   - Rule 42 Pre-Push Backend Audit
   - Rule 44 Secret Scanning (writes)
   - Rule 50 Three-Layer QA
   - Rule 51 Confidence Tags
   - Rule 52 Anti-Rework Burden
   - Rule 58 Schema-Drift Detection
   - Rule 59 Read-Time Secret Exposure Prevention

4. Produce a verdict.

Be RIGOROUS. The code goes to staging activation next; any miss here costs
Sean real time during a staging smoke that might already involve real Plaud
recordings + real Cloudflare Tunnel debugging.

VERDICT FORMAT:

  ## VERDICT: [APPROVE-FOR-STAGING | REVISE | REJECT]

  ## One-paragraph reason

  ## Status of Claude's findings:
  - CR-IMPL-1: [CONFIRM/DOWNGRADE/DISMISS] — rationale
  - CR-IMPL-2: ...
  - CR-IMPL-3: ...
  - CR-IMPL-4: ...
  - CR-IMPL-5: ...
  - H-IMPL-1: ...
  ... (full list)

  ## NEW CRITICAL findings (Claude missed):
  - [list with file:line evidence + required fix]

  ## NEW HIGH findings:
  - [list]

  ## NEW MEDIUM/LOW findings:
  - [list]

  ## CLAUDE.md rule violations:
  - [list]

  ## Anti-rework verification:
  Did I demand any rework of Phase 3 code without failing-test/file:line evidence? [YES/NO]

  ## Required changes BEFORE staging activation (must-fix list):
  - [ordered list]

  ## Next-step recommendation:
  [APPROVE-FOR-STAGING: Sean can flip the env flag after manual verification
   | REVISE: Claude integrates findings, re-submit
   | REJECT: significant rework needed; debate file]

CONSTRAINTS:
- Don't suggest features beyond v1 scope (§1.2 of plan)
- Don't demand multi-trainer support
- Don't demand official Plaud OAuth integration
- Don't demand Phase 3 code changes without failing-test/file:line evidence (Rule 52)
- Be specific: "fix this" without text/code is unactionable

Below: the full implementation source + Claude's hostile review + plan v1.2 +
relevant CLAUDE.md rules.

---

# CLAUDE'S HOSTILE SELF-REVIEW

${myHostile}

---

# THE PLAN (v1.2)

${planV12}

---

# IMPLEMENTATION SOURCE

## backend/migrations/20260504100004-plaud-applaud-source-columns.cjs

\`\`\`js
${migration}
\`\`\`

## backend/models/PlaudClip.mjs

\`\`\`js
${plaudClipModel}
\`\`\`

## backend/models/PlaudWebhookNonce.mjs

\`\`\`js
${nonceModel}
\`\`\`

## backend/jobs/plaudCronJobs.mjs (Phase 5 changes)

\`\`\`js
${cron}
\`\`\`

## backend/services/plaudWebhookSignature.mjs (Slice 5.2)

\`\`\`js
${sigService}
\`\`\`

## backend/services/applaudAudioFetcher.mjs (Slice 5.3)

\`\`\`js
${fetcher}
\`\`\`

## backend/utils/semaphore.mjs (Slice 5.4)

\`\`\`js
${semaphore}
\`\`\`

## backend/controllers/plaud/plaudApplaudWebhookController.mjs (Slice 5.4)

\`\`\`js
${controller}
\`\`\`

## backend/routes/plaud/plaudWebhookRoutes.mjs (Slice 5.5)

\`\`\`js
${route}
\`\`\`

## backend/core/middleware/index.mjs (Slice 5.5 — first 3KB, JSON parser exclusion)

\`\`\`js
${coreMiddleware}
\`\`\`

## backend/core/routes.mjs (Slice 5.5 — first 6KB, mount + import)

\`\`\`js
${coreRoutes}
\`\`\`

## backend/services/audioProbeService.mjs (referenced by controller — verify ClipProbeTimeoutError export per CR-IMPL-4)

\`\`\`js
${audioProbeService}
\`\`\`

---

# RELEVANT CLAUDE.md RULES (first 40K chars; covers Rule 1-59)

${claude_md}

---

END OF CONTEXT. Produce your hostile review verdict now. Be specific.
File:line citations whenever possible. Don't be sycophantic. Don't rubber-stamp
Claude's findings — verify each one independently against the actual code.`;

console.log(`[codex-impl] prompt: ${prompt.length} chars`);
const t0 = Date.now();

const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios Phase 5 Codex Implementation Hostile Review',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.5',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16384,
    temperature: 0.2,
  }),
  signal: AbortSignal.timeout(900_000), // 15 min — bigger prompt
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

console.log(`[codex-impl] ${wallSec}s, $${cost.toFixed(4)}`);

writeFileSync(
  'docs/ai-workflow/AI-HANDOFF/PHASE-5-CODEX-IMPL-REVIEW-2026-05-04.md',
  `# Phase 5 — Codex Implementation Hostile Review Response

**Reviewer:** OpenRouter \`openai/gpt-5.5\`
**Date:** 2026-05-04
**Tokens:** ${inputTokens} in / ${outputTokens} out
**Cost:** $${cost.toFixed(4)}
**Wall time:** ${wallSec}s

---

${text}
`,
  'utf-8',
);
console.log('saved');
