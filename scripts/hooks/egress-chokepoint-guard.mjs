#!/usr/bin/env node
/**
 * egress-chokepoint-guard.mjs — a script that talks to an external MODEL must
 * go through fetchForEgress.
 * =========================================================================
 * WHY (SWA-237, raised by Muse Spark 1.3 on 2026-09-03 and verified):
 * `fetchForEgress` is described in its own file as "THE CONTROL" and reasoned
 * about as a chokepoint. It is not one. **It is a function you have to remember
 * to call.** Everything layered on it inherits that: the identity/secret
 * redactor (SWA-219), the Z.ai subscription guard, and the training-tier gate
 * whose leaks cannot be rotated away.
 *
 * This is not hypothetical. The first run of this guard found FIVE scripts
 * posting prompts to generativelanguage.googleapis.com with raw `fetch` — the
 * redactor never ran on any of them. That is the exact incident class that
 * created redact-egress.mjs (an operator username reaching six vendors while a
 * scan reported clean).
 *
 * WHAT THIS IS, HONESTLY: a LINT, not a security boundary. A determined author
 * can add the allow-marker below or bypass the hook. The real fix is SWA-237's
 * other half — making the API key unobtainable outside the gate, so a caller
 * physically cannot authenticate a request it assembled itself. This guard
 * closes the *accident* path (a script written by someone who never read
 * redact-egress.mjs), which is the population that grows over time.
 *
 * SCOPED TO MODEL HOSTS, NOT TO fetch. A blanket `fetch` ban would flag local
 * Ollama (127.0.0.1) and production smoke tests (sswanstudios.com), and a guard
 * that cries wolf is one people learn to wave through — which is the failure
 * mode the whole thing exists to avoid.
 *
 * SCOPED TO scripts/, NOT TO backend/. The first draft covered both and was
 * WRONG: it flagged 8 backend services and would have told them to adopt
 * fetchForEgress, which strips OPERATOR identity and dev-machine paths. That is
 * a review-packet concern. A backend service calling Gemini is the product
 * working as designed, and its control is aiPrivacyService / PIIManager / Rule 8
 * (zero CLIENT PII to LLMs) — a different layer answering a different question.
 * Pointing production at the wrong control would have been confident, automated,
 * wrong advice. Backend coverage is tracked separately; see SWA-238.
 *
 * RATCHET, NOT SWEEP. It judges STAGED files only, so today's five pre-existing
 * violations block nothing until someone edits them. New and changed code is
 * held to the rule; the backlog is reported by `--all` and fixed deliberately.
 *
 * FAIL-OPEN on its own errors, loudly. A pre-commit hook that bricks committing
 * gets deleted within a day.
 *
 * Usage:
 *   node scripts/hooks/egress-chokepoint-guard.mjs --staged   (pre-commit)
 *   node scripts/hooks/egress-chokepoint-guard.mjs --all      (baseline audit)
 *   node scripts/hooks/egress-chokepoint-guard.mjs <file>...
 * Exit: 0 clean · 1 violations found · anything else = its own bug (fail open)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * External hosts that serve MODEL inference. Reaching one of these means a
 * prompt — and whatever a prompt was built from — leaves this machine.
 * Deliberately excludes localhost/127.0.0.1 (local Ollama) and sswanstudios.com
 * (our own production), which are egress but not third-party model egress.
 */
export const MODEL_HOSTS = [
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'aistudio.google.com',
  'api.anthropic.com',
  'api.openai.com',
  'api.z.ai',
  'api.moonshot.cn',
  'api.moonshot.ai',
  'api.deepseek.com',
  'api.x.ai',
  'api.groq.com',
  'api.mistral.ai',
  'api-inference.huggingface.co',
];

/** Ways to put bytes on the wire without passing the chokepoint. */
const RAW_CALL_PATTERNS = [
  [/\bglobalThis\.fetch\s*\(/, 'globalThis.fetch()'],
  [/(?<![A-Za-z0-9_.])fetch\s*\(/, 'bare fetch()'],
  [/from\s+['"]node:https?['"]/, "import from 'node:http(s)'"],
  [/require\(\s*['"]https?['"]\s*\)/, "require('http(s)')"],
  [/from\s+['"](axios|undici|node-fetch|got|superagent)['"]/, 'a third-party HTTP client'],
  [/from\s+['"](openai|@anthropic-ai\/sdk|@google\/genai|@google\/generative-ai|cohere-ai)['"]/, 'a vendor SDK'],
];

/** Proof the file routes through the chokepoint. */
const CHOKEPOINT = /\bfetchForEgress\b/;

/**
 * Deliberate, greppable exemption. Same spirit as `--allow-foreign` on the
 * lane guard: an escape hatch that leaves a trace beats one nobody can audit.
 * Put it on or above the offending line:
 *   // egress-chokepoint-guard: allow — <why this is not model egress>
 */
const ALLOW_MARKER = /egress-chokepoint-guard:\s*allow/;

/**
 * Files that legitimately NAME a model host without calling one: the gate
 * modules themselves, and tests that mock the transport. This is an
 * exemption list, which is a denylist shape — acceptable only because this
 * file is a lint. The actual boundary is SWA-237's key binding.
 */
const EXEMPT = [
  /(^|\/)scripts\/lib\/redact-egress\.mjs$/,
  /(^|\/)scripts\/lib\/training-tier-gate\.mjs$/,
  /(^|\/)scripts\/hooks\/egress-chokepoint-guard\.mjs$/,
  /\.test\.mjs$/,
];

const CODE_FILE = /\.(mjs|js|cjs)$/;

/**
 * Only the tooling tree. fetchForEgress is the right control HERE (operator
 * identity, dev paths, seat routing, the training tier) and the wrong one in
 * backend/, where the question is client PII and the control is Rule 8.
 */
const IN_SCOPE = /^scripts\//;

export function isExempt(path) {
  const norm = String(path).replace(/\\/g, '/');
  return !IN_SCOPE.test(norm) || EXEMPT.some((re) => re.test(norm));
}

/**
 * @returns {{host: string, how: string, line: number}[]} one finding per raw
 * call in a file that also names a model host. Empty array = clean.
 */
export function findViolations(path, source) {
  if (!CODE_FILE.test(path) || isExempt(path)) return [];

  const host = MODEL_HOSTS.find((h) => source.includes(h));
  if (!host) return [];
  if (CHOKEPOINT.test(source)) return []; // routed through the gate

  const lines = source.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // A marker on this line or the one above it exempts this call.
    if (ALLOW_MARKER.test(line) || (i > 0 && ALLOW_MARKER.test(lines[i - 1]))) continue;
    for (const [re, how] of RAW_CALL_PATTERNS) {
      if (re.test(line)) { out.push({ host, how, line: i + 1 }); break; }
    }
  }
  return out;
}

function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
}

function allTrackedScripts() {
  const out = execFileSync('git', ['ls-files', 'scripts'], { encoding: 'utf8' });
  return out.split(/\r?\n/).filter((f) => CODE_FILE.test(f));
}

function main() {
  const args = process.argv.slice(2);
  let files;
  if (args.includes('--staged')) files = stagedFiles();
  else if (args.includes('--all')) files = allTrackedScripts();
  else files = args.filter((a) => !a.startsWith('--'));

  const findings = [];
  for (const file of files) {
    if (!existsSync(file)) continue; // deleted/renamed away
    let source;
    try { source = readFileSync(file, 'utf8'); } catch { continue; }
    for (const v of findViolations(file, source)) findings.push({ file, ...v });
  }

  if (!findings.length) {
    if (!args.includes('--staged')) console.log('[egress-chokepoint] clean — no unguarded model-host calls.');
    process.exit(0);
  }

  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  console.error('');
  console.error('  EGRESS CHOKEPOINT — a model host is reached without fetchForEgress.');
  console.error('');
  console.error('  These calls skip the identity/secret redactor, the subscription-seat guard,');
  console.error('  and the training-tier gate. Content sent to a model cannot be recalled.');
  console.error('');
  for (const [file, list] of byFile) {
    console.error(`    ${file}  → ${list[0].host}`);
    for (const v of list) console.error(`      line ${v.line}: ${v.how}`);
  }
  console.error('');
  console.error('  FIX — route the call through the chokepoint:');
  console.error("    import { fetchForEgress } from './lib/redact-egress.mjs';");
  console.error('    const res = await fetchForEgress(url, { method: "POST", body: JSON.stringify(payload) });');
  console.error('    (body must be a STRING — it is redacted immediately before the socket)');
  console.error('');
  console.error('  If this genuinely is not model egress, mark it so the exemption is greppable:');
  console.error('    // egress-chokepoint-guard: allow — <why>');
  console.error('');
  process.exit(1);
}

// Only run when invoked directly, so tests can import the predicate.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('egress-chokepoint-guard.mjs')) {
  try {
    main();
  } catch (err) {
    console.error(`[egress-chokepoint] guard error, failing open: ${err?.message}`);
    process.exit(0);
  }
}
