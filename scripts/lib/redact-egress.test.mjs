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

// --- REGRESSION 1B: path patterns must fire before the identity fallback ---
// Username absence alone is insufficient: replacing only the name leaves the
// machine-specific path shape in place and cannot prove the path detector ran.
{
  const cases = [
    ['windows backslash', `C:\\Users\\${USER}\\Desktop\\private-project\\plan.md`,
      '<PATH>\\Desktop\\private-project\\plan.md'],
    ['windows slash', `C:/Users/${USER}/Desktop/private-project/plan.md`,
      '<PATH>/Desktop/private-project/plan.md'],
    ['linux home', `/home/${USER}/private-project/plan.md`,
      '<PATH>/private-project/plan.md'],
    ['wsl mount', `/mnt/c/Users/${USER}/private-project/plan.md`,
      '<PATH>/private-project/plan.md'],
  ];
  for (const [name, input, expected] of cases) {
    const { text } = redactForEgress(input);
    ok(`REGRESSION 1B: ${name} has exact path replacement`, text === expected, `${text} !== ${expected}`);
  }
}

// --- REGRESSION 1C: fetchForEgress receives JSON.stringify output ---
// JSON doubles Windows backslashes. The transport boundary must still recognize
// and replace the path, rather than passing only because the username fallback fired.
{
  const body = JSON.stringify({
    content: `C:\\Users\\${USER}\\clients\\private-project\\plan.md`,
  });
  const { text } = redactForEgress(body);
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* asserted below */ }
  ok('REGRESSION 1C: JSON-escaped Windows path remains valid JSON', parsed !== null, text);
  ok('REGRESSION 1C: JSON-escaped Windows path uses PATH marker',
    parsed?.content === '<PATH>\\clients\\private-project\\plan.md', parsed?.content || text);
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

// --- ROUND 9: the `sk-` row must not match INSIDE an English word ---
//
// The over-refusal was silent rather than loud: `redactForEgress` is the egress
// path, so a false positive rewrites prose on its way to a vendor instead of
// raising anything. All four below are real compounds whose spelling contains
// `sk-` at a word junction, and every one has 12+ word-characters after it — the
// `{12,}` bound counts the TAIL, so it offered no protection.
{
  const words = [
    ['task-runner-identifier', 'ta'],
    ['risk-management-framework', 'ri'],
    ['disk-usage-reporting', 'di'],
    ['task_run_identifier', 'ta'],
    ['risk_assessment', 'ri'],
    ['desk-organizer', 'de'],
  ];
  for (const [word, prefix] of words) {
    const sentence = `the ${word} is documented in ${word}.md`;
    const { text } = redactForEgress(sentence);
    ok(`sk- row does not fire inside '${word}'`, text === sentence, text);
  }
}

// --- ROUND 9: ...and it must STILL catch a real key, at every real boundary ---
//
// The complement of the block above. A boundary that fixed the false positives by
// weakening the match would be a worse bug than the one it replaced, so the
// contexts a key genuinely appears in are pinned explicitly.
{
  const contexts = [
    ['env assignment', 'API_KEY=sk-abcdefghijklmnop1234567890'],
    ['quoted', '"sk-abcdefghijklmnop1234"'],
    ['parenthesised', 'see (sk-abcdefghijklmnop1234)'],
    ['start of string', 'sk-abcdefghijklmnop1234 is the key'],
    ['after a comma', 'keys: a, sk-abcdefghijklmnop1234'],
    ['in JSON', '{"key":"sk-abcdefghijklmnop1234"}'],
  ];
  for (const [name, input] of contexts) {
    const { text } = redactForEgress(input);
    ok(`sk- row still catches a real key: ${name}`, text.includes('<REDACTED-KEY>') && !text.includes('sk-abcdef'), text);
  }
  // A hyphen BEFORE `sk-` does NOT make it a compound. An earlier revision asserted
  // that it did — an evidence-free claim, and the wrong direction on the egress path:
  // a false negative leaves the machine, a false positive only redacts a phrase.
  const { text: hyphen } = redactForEgress('prefix-sk-abcdefghijklmnop1234');
  ok('sk- row fires after a hyphen (a key can follow one)', hyphen.includes('<REDACTED-KEY>'), hyphen);
}

// --- ROUND 9b: the boundary must survive SERIALISATION (round 9's own regression) ---
//
// `fetchForEgress()` redacts the serialised request body — JSON.stringify output — so
// the text the regex sees has `\n` as two characters, not a newline. A lookbehind of
// `(?<![\w-])` saw the escape's literal `n`, treated it as a word character, and
// SKIPPED THE MATCH. A key on its own line therefore reached the socket. The canary
// selfTest() did not catch it because it plants canaries in plain strings.
//
// This block is the regression for that: it exercises the real transport path, not a
// paraphrase of it.
{
  const CANARY = 'sk-abcdefghijklmnop1234567890';
  for (const [name, raw] of [
    ['newline', `note\n${CANARY}`],
    ['tab', `note\t${CANARY}`],
    ['carriage return', `note\r${CANARY}`],
  ]) {
    const body = JSON.stringify({ messages: [{ role: 'user', content: raw }] });
    const { text } = redactForEgress(body);
    ok(`serialised body: key after JSON-escaped ${name} is redacted`, !text.includes('sk-abcdef'), text);
    ok(`serialised body: JSON still parses after redaction (${name})`, (() => {
      try { JSON.parse(text); return true; } catch { return false; }
    })());
  }
  // The transport itself, not only the redactor: assert on what leaves the process.
  let sent = null;
  const fakeFetch = async (url, init) => { sent = init; return { ok: true, status: 200 }; };
  await fetchForEgress('https://example.invalid/v1', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: `diff follows\n${CANARY}\n(end)` }] }),
  }, { quiet: true, fetchImpl: fakeFetch });
  ok('fetchForEgress: no key reaches the socket after an escaped newline', sent && !sent.body.includes('sk-abcdef'), sent?.body);
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

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
