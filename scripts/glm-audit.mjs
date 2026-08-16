#!/usr/bin/env node
/**
 * glm-audit.mjs -- security audit a slice of SwanStudios using GLM.
 *
 * SAFETY DESIGN (applies regardless of which provider is on the other end):
 *   - Reads from origin/main, NOT the local working tree (which is 1947 commits stale).
 *   - Hard secret scan on EVERY file before transmission. Any hit ABORTS the run.
 *     Fail-closed: we do not "redact and continue", because a redactor that
 *     mis-fires ships the secret. Abort forces a human decision.
 *   - Never reads .env, keys, certs, or anything on the deny list.
 *   - Dry-run by default. --send is required to transmit.
 *
 * USAGE
 *   node c:/tmp/glm-audit.mjs --slice money            # dry run, shows what WOULD be sent
 *   node c:/tmp/glm-audit.mjs --slice money --send     # actually audit
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const REPO = 'c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT';
const REF = 'origin/main';
const MODEL = process.env.GLM_AUDIT_MODEL || 'glm-5.3';
const ENDPOINT = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

// ---------------------------------------------------------------------------
// Slices -- narrow, high-value targets. Start small, measure, then widen.
// ---------------------------------------------------------------------------
const SLICES = {
  money: {
    label: 'Money path + auth core',
    why: 'Where "a hacker steals my clients\' money" actually happens.',
    files: [
      'backend/middleware/auth.mjs',
      'backend/middleware/authMiddleware.mjs',
      'backend/middleware/adminAuth.mjs',
      'backend/middleware/adminMiddleware.mjs',
      'backend/middleware/verifyClientAccess.mjs',
      'backend/middleware/moneyPathRateLimits.mjs',
      'backend/middleware/viewAsGuard.mjs',
      'backend/routes/cartRoutes.mjs',
      'backend/routes/v2PaymentRoutes.mjs',
      'backend/routes/achPaymentRoutes.mjs',
      'backend/routes/offlinePaymentRoutes.mjs',
      'backend/services/cartCheckoutFulfillmentService.mjs',
    ],
  },
};

// ---------------------------------------------------------------------------
// Secret scanning -- literal VALUES only. Must not fire on process.env refs,
// which are legitimate and everywhere in real source.
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  [/sk_live_[A-Za-z0-9]{16,}/,              'Stripe live secret key'],
  [/sk_test_[A-Za-z0-9]{16,}/,              'Stripe test secret key'],
  [/rk_live_[A-Za-z0-9]{16,}/,              'Stripe restricted key'],
  [/whsec_[A-Za-z0-9]{16,}/,                'Stripe webhook secret'],
  [/\bsk-[A-Za-z0-9]{20,}/,                 'OpenAI-style API key'],
  [/\bAIza[A-Za-z0-9_\-]{30,}/,             'Google API key'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/,          'Slack token'],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./, 'JWT with payload'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/,    'private key block'],
  [/postgres(?:ql)?:\/\/[^\s'"`]*:[^\s'"`@]+@/, 'Postgres URL with password'],
  [/mongodb(?:\+srv)?:\/\/[^\s'"`]*:[^\s'"`@]+@/, 'MongoDB URL with password'],
  [/mysql:\/\/[^\s'"`]*:[^\s'"`@]+@/,       'MySQL URL with password'],
  // Assignment of a long literal to a secret-ish name (NOT process.env.X)
  [/(?:password|passwd|secret|api_?key|auth_?token|private_?key)\s*[:=]\s*['"`][^'"`\s]{16,}['"`]/i,
   'hardcoded credential literal'],
];

const PATH_DENY = [
  /(^|\/)\.env/i, /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /\.jks$/i,
  /(^|\/)id_rsa/i, /(^|\/)id_ed25519/i, /credentials/i, /(^|\/)secrets?\./i,
];

function scanForSecrets(path, content) {
  const hits = [];
  for (const rx of PATH_DENY) {
    if (rx.test(path)) hits.push({ line: 0, kind: `denied path (${rx})` });
  }
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // process.env references are the CORRECT pattern -- never flag them.
    if (/process\.env\./.test(line) && !/['"`][A-Za-z0-9_\-]{24,}['"`]/.test(line)) return;
    for (const [rx, kind] of SECRET_PATTERNS) {
      if (rx.test(line)) hits.push({ line: i + 1, kind });
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
function gitShow(path) {
  try {
    return execFileSync('git', ['show', `${REF}:${path}`], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
    });
  } catch {
    return null;
  }
}

const argv = process.argv.slice(2);
const sliceName = argv[argv.indexOf('--slice') + 1] || 'money';
const doSend = argv.includes('--send');
const slice = SLICES[sliceName];
if (!slice) {
  console.error(`Unknown slice "${sliceName}". Available: ${Object.keys(SLICES).join(', ')}`);
  process.exit(1);
}

console.log(`\nSlice: ${sliceName} -- ${slice.label}`);
console.log(`Why  : ${slice.why}`);
console.log(`Ref  : ${REF}  (NOT the local working tree)\n`);

const parts = [];
let totalChars = 0;
const missing = [];
const allHits = [];

for (const path of slice.files) {
  const content = gitShow(path);
  if (content === null) { missing.push(path); console.log(`  [MISSING] ${path}`); continue; }

  const hits = scanForSecrets(path, content);
  if (hits.length) {
    allHits.push({ path, hits });
    console.log(`  [SECRET!] ${path}  -> ${hits.map(h => `L${h.line} ${h.kind}`).join('; ')}`);
    continue;
  }

  const lines = content.split('\n').length;
  totalChars += content.length;
  console.log(`  [ok]      ${path}  (${lines} lines, ${content.length} chars)`);
  parts.push(`\n===== FILE: ${path} =====\n${content}`);
}

console.log(`\nFiles included : ${parts.length}`);
console.log(`Files missing  : ${missing.length}`);
console.log(`Secret hits    : ${allHits.length}`);
console.log(`Total chars    : ${totalChars.toLocaleString()}`);
console.log(`Est. tokens    : ~${Math.round(totalChars / 3.6).toLocaleString()} (chars/3.6, code runs denser than prose)`);

if (allHits.length > 0) {
  console.log('\nABORTED: secret-shaped content found. Nothing was transmitted.');
  console.log('Fail-closed by design -- review the hits above before re-running.');
  process.exit(2);
}

const REMIT = `You are a senior application-security engineer auditing a production
personal-training SaaS before its public launch. It takes real payments from real
clients. The owner's specific fear: an attacker draining client funds, tampering with
client records, or pivoting through a broken admin route.

Audit the code below for EXPLOITABLE vulnerabilities. Prioritise ruthlessly by real
attacker value.

Focus, in order:
1. AuthZ/IDOR - can user A act on user B's cart, payment, sessions, or records?
   Look for missing ownership checks on :id params, trusting client-supplied userId,
   and role checks that only run on some paths.
2. Auth bypass - JWT verification gaps, unsigned/expired tokens accepted, role
   escalation, admin gates that fail OPEN, "view as" impersonation leaking privilege.
3. Money integrity - price/total computed from client input, quantity or amount
   tampering, missing idempotency enabling double-charge or double-grant, refund
   abuse, race conditions on cart->order transitions.
4. Injection - raw SQL built from user input, unsafe query construction.
5. Rate limiting / abuse - money endpoints without limits, enumeration oracles.

RULES:
- Report ONLY what you can point at in the code. Cite file and line.
- For each finding give: severity (CRITICAL/HIGH/MEDIUM/LOW), the exact file:line,
  a concrete exploit scenario (what the attacker sends, what they get), and the fix.
- If you are unsure whether something is exploitable, say so explicitly and label it
  NEEDS-VERIFICATION rather than asserting it.
- Do NOT pad with generic advice ("use HTTPS", "validate input"). Findings only.
- If a file looks secure for its role, say so briefly rather than inventing issues.
- Order the final list strictly by exploitability x impact.`;

if (!doSend) {
  console.log('\nDRY RUN -- nothing transmitted. Add --send to run the audit.\n');
  process.exit(0);
}

const key = process.env.ZAI_API_KEY;
if (!key) { console.error('ZAI_API_KEY not set in this process env.'); process.exit(1); }

console.log(`\nSending to ${MODEL}...\n`);
const started = Date.now();

// STREAMING is mandatory: GLM-5.3 reasons for minutes before its first token,
// and a plain fetch dies with UND_ERR_HEADERS_TIMEOUT at 300s. Streaming returns
// headers immediately so the clock never starts. max_tokens must also exceed the
// reasoning burn (~20k observed) or the body comes back EMPTY -- which reads
// exactly like "no vulnerabilities found".
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 48000,
    stream: true,
    messages: [{ role: 'user', content: `${REMIT}\n\n${parts.join('\n')}` }],
  }),
});

if (!res.ok) {
  const t = await res.text();
  console.error(`HTTP ${res.status}: ${t.slice(0, 400)}`);
  process.exit(1);
}

let out = '';
let u = {};
let buf = '';
let tick = Date.now();
const dec = new TextDecoder();
for await (const chunk of res.body) {
  buf += dec.decode(chunk, { stream: true });
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const payload = t.slice(5).trim();
    if (payload === '[DONE]') continue;
    try {
      const j = JSON.parse(payload);
      const d = j.choices?.[0]?.delta?.content;
      if (d) out += d;
      if (j.usage) u = j.usage;
    } catch { /* partial frame */ }
  }
  if (Date.now() - tick > 20000) {
    process.stdout.write(`  ...auditing, ${out.length} chars so far\n`);
    tick = Date.now();
  }
}

const wall = ((Date.now() - started) / 1000).toFixed(1);
if (!out.trim()) {
  console.error('\nEMPTY RESPONSE — the model spent its whole budget reasoning.');
  console.error('An empty body is NOT "no vulnerabilities". Re-run with a higher --max-tokens.');
  process.exit(1);
}

const outPath = `${REPO}/docs/ai-workflow/AI-HANDOFF/GLM-SECURITY-AUDIT-${sliceName}-2026-08-15.md`;
mkdirSync(dirname(outPath), { recursive: true });

// SAVE THE RAW RESULT FIRST, before any template interpolation can throw.
// A completed audit costs ~6 minutes of reasoning and real credits; losing it to
// a formatting bug in the pretty-printer is unacceptable. This exact failure
// happened once: a stale `json.model` reference in the template below threw
// AFTER a successful 13,000-char audit, and the findings were destroyed.
// The raw file is the durable artifact; the formatted one is a convenience.
const rawPath = `${outPath.replace(/\.md$/, '')}.raw.md`;
try {
  writeFileSync(rawPath, out, 'utf8');
  console.log(`\n  raw findings saved first: ${rawPath}`);
} catch (e) {
  console.error(`  WARNING: could not save raw findings: ${e.message}`);
}

writeFileSync(outPath, `# GLM Security Audit - ${slice.label}

**Model:** ${MODEL}
**Ref:** ${REF}
**Files:** ${slice.files.length}
**Tokens:** ${u.prompt_tokens} in / ${u.completion_tokens} out (reasoning: ${u.completion_tokens_details?.reasoning_tokens ?? 'n/a'}) | total ${u.total_tokens}
**Cached:** ${u.prompt_tokens_details?.cached_tokens ?? 0}
**Wall:** ${wall}s

> Findings are a HYPOTHESIS until verified against the real caller path (Rule 30).
> Do not patch on this document alone.

---

${out}
`, 'utf8');

console.log('=== USAGE ===');
console.log(`  prompt      : ${u.prompt_tokens}`);
console.log(`  completion  : ${u.completion_tokens}  (reasoning: ${u.completion_tokens_details?.reasoning_tokens ?? 'n/a'})`);
console.log(`  total       : ${u.total_tokens}`);
console.log(`  cached      : ${u.prompt_tokens_details?.cached_tokens ?? 0}`);
console.log(`  wall        : ${wall}s`);
console.log(`\nSaved: ${outPath}\n`);
