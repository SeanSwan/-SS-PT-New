/**
 * redact-egress-guard.test.mjs — run: node scripts/lib/redact-egress-guard.test.mjs
 *
 * The STATIC guard half of the egress control. redact-egress.test.mjs proves the
 * redactor catches the shapes it knows; this file proves nothing BYPASSES the
 * redactor — every consult script and document-egress script must call
 * fetchForEgress, never bare fetch(. Split out of redact-egress.test.mjs on
 * 2026-09-19 when that file crossed Rule 4's 300-line cap (167 -> 314).
 *
 * Split is mechanical (line range, CRLF preserved) — the comments below are
 * incident evidence and were not retyped.
 */
import { basename } from 'node:path';

let pass = 0;
let fail = 0;

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// --- REGRESSION GUARD: the transport gate is a control only if nothing bypasses it.
// Every consult script and shared transport lib must call fetchForEgress, never bare
// fetch(. A new script that imports fetch directly fails HERE, not in an incident.
//
// WHAT COUNTS AS A BYPASS: a fetch call that is NOT the implementation handed to the
// gate. `fetchImpl: (url, init) => globalThis.fetch(url, init)` is the sanctioned
// spelling — `fetchForEgress` redacts `init.body` and then calls exactly that — so the
// property body is dropped before scanning. Everything outside it is still inspected,
// and the three controls at the end of this block prove both halves of that.
const BARE_FETCH = /(?:await\s+)?(?<![\w.])fetch\(|(?:await\s+)?(?:globalThis|window)\.fetch\(/;

/** Drop `fetchImpl:` property bodies, tracking braces so only that body is dropped. */
function stripInjectedFetchImpl(src) {
  const kept = [];
  let depth = 0;
  for (const line of src.split('\n')) {
    const opens = (line.match(/[{[(]/g) || []).length;
    const closes = (line.match(/[}\])]/g) || []).length;
    if (depth === 0 && /\bfetchImpl\s*:/.test(line)) {
      depth = Math.max(0, opens - closes);
      kept.push('');
      continue;
    }
    if (depth > 0) {
      depth = Math.max(0, depth + opens - closes);
      kept.push('');
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

/**
 * Drop comments, without tracking quotes.
 *
 * GUARD FINDING (2026-09-19). The guard scanned raw source, so a comment that merely
 * NARRATED the old bug tripped it: `consult-hy3-design.mjs:187` explains that a block
 * "used to be a plain `await fetch(...)`" — prose about a call, not a call. The suite went
 * red on a file that had already been fixed, which is the worst kind of red: it teaches the
 * reader to ignore the guard, and a guard people ignore is not a guard.
 *
 * WHY THERE IS NO QUOTE STATE HERE. The obvious implementation walks the source tracking
 * whether it is inside `'`, `"` or a backtick, so a `//` inside a URL string is not taken for
 * a comment. That implementation was written, and it FAILED — not on the comment it was meant
 * to fix, but because a character scanner cannot tell a REGEX LITERAL from a division. This
 * file's neighbours contain `/['"]/`-shaped patterns and `]$/g, ''`; a quote character inside
 * a regex opens a phantom "string" that never closes, and the scanner then treats the next
 * ~47 lines of real code as string content — including the comment it was supposed to strip.
 * Proven by probe: the stuck span was lines 143..190, opening on a `"` in a regex line.
 *
 * So this deliberately does the WEAKER, ROBUST thing: it removes full-line `//` comments and
 * `/* ... *​/` blocks, and it does NOT attempt trailing `//` comments. Trailing-comment text
 * mentioning `fetch(` would still be flagged — the safe direction for a guard, since a false
 * positive is a visible annoyance and a false negative is an unfired control. Over-stripping
 * is the dangerous direction: `x = 'a//b'; await fetch(u)` on one line would have its real
 * call deleted by a `//`-to-EOL rule.
 */
function stripComments(src) {
  const out = [];
  let inBlock = false;
  for (const line of src.split('\n')) {
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) { out.push(''); continue; }
      inBlock = false;
      out.push(line.slice(end + 2));
      continue;
    }
    if (line.trimStart().startsWith('//')) { out.push(''); continue; }
    const open = line.indexOf('/*');
    if (open === -1) { out.push(line); continue; }
    const end = line.indexOf('*/', open + 2);
    if (end !== -1) { out.push(line.slice(0, open) + line.slice(end + 2)); continue; }
    inBlock = true;
    out.push(line.slice(0, open));
  }
  return out.join('\n');
}

/** Comments first — a comment can hold braces that fool the brace counter — then fetchImpl bodies. */
const scanForBareFetch = (src) => BARE_FETCH.test(stripInjectedFetchImpl(stripComments(src)));

const SANCTIONED_INJECTION = [
  '  fetchImpl: (url, init) => {',
  '    if (process.env.SWAN_TEST_BLOCK_NETWORK) throw new Error("blocked");',
  '    return globalThis.fetch(url, init);',
  '  },',
].join('\n');

{
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const scripts = join(dirname(fileURLToPath(import.meta.url)), '..');
  const LOCAL_ONLY = new Set(['consult-qwen.mjs']); // 127.0.0.1 Ollama — not egress
  // Non-consult scripts that carry repo documents/prompts to external LLM hosts
  // (enumerated 2026-08-26; image generators send authored prompts only and are out).
  const DOCUMENT_EGRESS = [
    'hermes-village.mjs', 'validation-orchestrator.mjs', 'glm-audit.mjs',
    'auto-research/eval-suite.mjs', 'auto-research/prompt-mutator.mjs', 'mcp/swan-council-lib.mjs',
    'lib/openrouter-stream.mjs',
  ];
  const targets = readdirSync(scripts).filter((f) => /^consult-.*\.mjs$/.test(f) && !LOCAL_ONLY.has(f))
    .map((f) => join(scripts, f)).concat(DOCUMENT_EGRESS.map((f) => join(scripts, f)));
  const bare = [];
  const ungated = [];
  for (const p of targets) {
    const src = readFileSync(p, 'utf-8');
    const code = stripComments(src);
    const outbound = scanForBareFetch(src);
    if (outbound) bare.push(basename(p));
    if (/\bfetchForEgress\(/.test(code) && !/import\s*\{[^}]*fetchForEgress[^}]*\}\s*from/.test(src)) ungated.push(basename(p));
  }
  ok(`guard: no consult script calls bare fetch( (${targets.length} scanned)`, bare.length === 0, bare.join(', '));
  ok('guard: every fetchForEgress caller imports it', ungated.length === 0, ungated.join(', '));

  // CONTROLS. A guard whose pattern cannot tell a bypass from the sanctioned
  // injection fails either always or never, and both are useless. The same
  // omission made this file exit 1 on a false positive: `consult-glm.mjs` hands
  // `fetchImpl: (url, init) => { … return globalThis.fetch(url, init); }` to
  // `fetchForEgress`, which is the call the gate makes AFTER redacting the body.
  ok('guard control: a direct call to a host IS flagged',
    scanForBareFetch("await fetch('https://api.example/v1', { body })"));
  ok('guard control: an injected globalThis.fetch implementation is NOT flagged',
    !scanForBareFetch(SANCTIONED_INJECTION));
  ok('guard control: a bypass AFTER an injected implementation is still flagged',
    scanForBareFetch(`${SANCTIONED_INJECTION}\nawait fetch('https://api.example/v1', { body });`));

  // The 2026-09-19 false positive, pinned in BOTH directions. A comment that narrates a
  // call must not trip the guard, and a real call must still trip it — a strip that removed
  // too much would pass the first control and fail the second.
  ok('guard control: a COMMENT narrating a fetch call is NOT flagged',
    !scanForBareFetch('// This used to be a plain `await fetch(...)` + response.json()\nconst x = 1;'));
  ok('guard control: a block COMMENT narrating a fetch call is NOT flagged',
    !scanForBareFetch('/* was: await fetch(url, init) */\nconst x = 1;'));
  ok('guard control: a real call AFTER a narrating comment is STILL flagged',
    scanForBareFetch('// was: await fetch(url, init)\nawait fetch(url, init);'));
  ok('guard control: a URL containing // is not mistaken for a comment',
    scanForBareFetch("await fetch('https://api.example/v1', { body });"));
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
