/**
 * redact-egress.test.mjs — run: node scripts/lib/redact-egress.test.mjs
 *
 * The load-bearing tests are REGRESSION 1 (the exact shape that leaked to six
 * vendors on 2026-08-22 — the operator's username inside a filesystem path)
 * and REGRESSION 2 (2026-08-26 Fable review: the redactor's OWN read-error
 * message carried the same path, and callers sent it).
 */
import { basename } from 'node:path';
import { homedir, hostname, userInfo } from 'node:os';
import { fetchForEgress, identityNames, readForEgress, redactForEgress, selfTest } from './redact-egress.mjs';

let pass = 0;
let fail = 0;

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

const USER = basename(homedir() || '') || userInfo().username;
const HOST = hostname();

// --- the redactor must prove itself before anything else is meaningful ---
ok('selfTest() passes (every shape + identity caught)', (() => {
  try { return selfTest() === true; } catch (e) { console.log('   ', e.message); return false; }
})());
ok('identityNames() includes the OS user', identityNames().some((n) => n.toLowerCase() === USER.toLowerCase()));

// --- REGRESSION 1: the actual 2026-08-22 incident shape ---
{
  const doc = [
    '# Review packet',
    '',
    'The launcher lives at `C:\\Users\\' + USER + '\\Desktop\\quick-pt\\SS-PT\\run.ps1`',
    'and the WSL mirror is /home/' + USER + '/hermes2/.hermes/config.yaml',
    'plus /mnt/c/Users/' + USER + '/tmp/out.txt and C:/Users/' + USER + '/fwd.txt',
  ].join('\n');
  const { text } = redactForEgress(doc);
  ok('REGRESSION 1: username gone from every path form', !has(text, USER), text);
  ok('REGRESSION 1: doc still readable (headings survive)', text.includes('# Review packet'));
}

// --- REGRESSION 2: the read-error channel (2026-08-26) ---
{
  let msg = '';
  try { readForEgress(homedir() + '/does-not-exist-' + Date.now() + '.md'); } catch (e) { msg = e.message; }
  ok('REGRESSION 2: ENOENT message is thrown', msg.length > 0);
  ok('REGRESSION 2: ENOENT message carries no username', msg && !has(msg, USER), msg);
}

// --- hostname is identity too ---
if (HOST && HOST.length >= 3) {
  const { text } = redactForEgress('ran on host ' + HOST + ' at 09:00');
  ok('hostname redacted', !has(text, HOST), text);
} else {
  ok('hostname redacted (skipped: hostname too short to be identity)', true);
}

// --- secret shapes: one row per family ---
{
  const cases = [
    ['openai key', 'token=sk-abcdefghijklmnop1234567890', 'sk-abcdef'],
    ['anthropic key', ['sk-ant', '-api03-AbCdEfGhIjKlMnOpQrStUv'].join(''), 'sk-ant'],
    ['openrouter key', 'sk-or-v1-abcdef0123456789abcdef', 'sk-or'],
    ['stripe live', 'k=' + ['sk_', 'live_', 'abcdefgh12345678'].join(''), 'sk_live_'],
    ['render api key', 'RENDER_API_KEY=rnd_AbCdEfGhIjKlMnOpQrStUvWxYz12', 'rnd_AbCd'],
    ['github ghp_', ['ghp', '_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab'].join(''), 'ghp_ABCD'],
    ['github pat', ['github_p', 'at_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'].join(''), ['github_p', 'at_ABCD'].join('')],
    ['sendgrid', 'SG.abcdefghijklmnopqrstuv.wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd', 'SG.abcdef'],
    ['linear', 'lin_api_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'lin_api_ABCD'],
    ['slack bot', ['xoxb', '-1234567890-abcdefghijkl'].join(''), 'xoxb-'],
    ['google api', 'AIzaSyA1234567890abcdefghijklmnopqrs', 'AIza'],
    // samples are split so this file never holds a literal secret shape (pre-commit scanner)
    ['jwt', 'Bearer ' + ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w'].join('.'), 'eyJhbGci'],
    ['opaque bearer', 'Authorization: Bearer 8f3a9c2b1d4e5f60718293a4b5c6d7e8', '8f3a9c2b'],
    ['telegram bot', 'TOKEN=12345678:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw0', ':AAHdqTcv'],
    ['telegram chat_id', 'chat_id=1234567890', '1234567890'],
    ['keyed short id', 'owner id: 8765432', '8765432'],
    ['phone', 'call (555) 123-4567 or 555.123.4567', '123-4567'],
    ['db url postgres', 'DATABASE_URL=' + ['postgresql:', '//u:p@host.example.com:5432/db'].join(''), 'postgres'],
    ['db url redis', 'REDIS_URL=redis://:secretpass@host:6379', 'secretpass'],
    ['db url mongodb', ['mongodb+srv:', '//u:p@cluster.x.net/db'].join(''), 'u:p@'],
    ['email', 'contact ops@example.com now', 'ops@example'],
    ['pem', ['-----BEGIN RSA ', 'PRIVATE KEY-----\nMIIE\n-----END RSA ', 'PRIVATE KEY-----'].join(''), 'MIIE'],
  ];
  for (const [name, input, needle] of cases) {
    const { text } = redactForEgress(input);
    ok(`secret shape: ${name}`, !text.includes(needle), text);
  }
}

// --- it must NOT shred ordinary prose, timestamps, SHAs, line refs ---
{
  const prose = [
    'The gate refuses a run when the report contains a bare VERIFIED marker.',
    'memo 20260816T012000Z-recon.md at commit 72ef9ae40 and 139437997, see file.mjs:1234, v10.0.26200, 2026-08-26.',
  ].join('\n');
  const { text } = redactForEgress(prose);
  ok('ordinary prose / timestamps / SHAs / line refs untouched', text === prose, text);
}

// --- reporting: hits are surfaced, not swallowed ---
{
  const { hits } = redactForEgress('/home/' + USER + '/a and sk-zzzzzzzzzzzzzzzz');
  ok('hits reported for the caller to print', hits.length >= 1 && hits.every((h) => h.count > 0));
}

// --- idempotence: redacting twice must not corrupt placeholders ---
{
  const once = redactForEgress('/home/' + USER + '/x chat_id=1234567890 (555) 123-4567').text;
  const twice = redactForEgress(once).text;
  ok('idempotent (safe to double-apply)', once === twice, `${once} vs ${twice}`);
}

// --- THE CONTROL: transport gate redacts the assembled body, not just the doc ---
{
  let sent = null;
  const fakeFetch = async (url, init) => { sent = { url, init }; return { ok: true, status: 200 }; };
  const body = JSON.stringify({
    messages: [{ role: 'user', content: '## Git diff\n+ path C:\\Users\\' + USER + '\\x\n(failed to read: ENOENT open /home/' + USER + '/y) sk-abcdefghijklmnop1234' }],
  });
  await fetchForEgress('https://example.invalid/v1', {
    method: 'POST', headers: { Authorization: 'Bearer sk-realkey-stays-in-header-0123456789' }, body,
  }, { quiet: true, fetchImpl: fakeFetch });
  ok('fetchForEgress: body reaches the socket with no username', sent && !has(sent.init.body, USER), sent?.init.body);
  ok('fetchForEgress: body reaches the socket with no key', sent && !sent.init.body.includes('sk-abcdef'));
  ok('fetchForEgress: body is still valid JSON', (() => { try { JSON.parse(sent.init.body); return true; } catch { return false; } })());
  ok('fetchForEgress: headers untouched (API key belongs there)', sent.init.headers.Authorization.includes('sk-realkey'));
  let threw = false;
  try { await fetchForEgress('https://example.invalid/v1', { body: { not: 'a string' } }, { quiet: true, fetchImpl: fakeFetch }); } catch { threw = true; }
  ok('fetchForEgress: refuses a non-string body (cannot redact what it cannot see)', threw);
}

// --- REGRESSION GUARD: the transport gate is a control only if nothing bypasses it.
// Every consult script and shared transport lib must call fetchForEgress, never bare
// fetch(. A new script that imports fetch directly fails HERE, not in an incident.
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
    const outbound = /(?:await\s+)?\bfetch\((?:'https?:|`|url\b)/.test(src);
    if (outbound) bare.push(basename(p));
    if (/\bfetchForEgress\(/.test(src) && !/import\s*\{[^}]*fetchForEgress[^}]*\}\s*from/.test(src)) ungated.push(basename(p));
  }
  ok(`guard: no consult script calls bare fetch( (${targets.length} scanned)`, bare.length === 0, bare.join(', '));
  ok('guard: every fetchForEgress caller imports it', ungated.length === 0, ungated.join(', '));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
