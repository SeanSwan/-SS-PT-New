#!/usr/bin/env node
/**
 * egress-privacy-gate.test.mjs — the PII/secret egress gate's case matrix.
 * ========================================================================
 * WHY THIS EXISTS: the gate was written, went live in ONE working tree, and was
 * about to be registered for every agent while tracked by nothing and tested by
 * nothing. Four hostile panel seats independently named untested safety-critical
 * tooling as this program's meta-defect. Registering an untested gate globally is
 * the thing they warned about, so the test lands in the same commit as the
 * registration — never after it.
 *
 * THE TWO FAILURE DIRECTIONS, both fatal, tested separately:
 *   FALSE NEGATIVE — a real secret walks out. The gate's entire purpose lost.
 *   FALSE POSITIVE — a clean packet is blocked. The gate gets deleted within a
 *                    week, and a deleted gate protects nothing. The de-identification
 *                    code this project writes is FULL of regex pattern-source that
 *                    looks like PII; if the gate cannot tell a pattern from a value,
 *                    it will block the very reviews it exists to protect.
 *
 * SELF-LEAK: a privacy gate that prints the secret it caught has exfiltrated it into
 * the transcript — the exact harm, by the component preventing it. Pinned below.
 *
 * Run: node scripts/hooks/egress-privacy-gate.test.mjs   (exit 0 = pass)
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'egress-privacy-gate.mjs');

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const dir = mkdtempSync(join(tmpdir(), 'egress-'));
const doc = (name, body) => {
  const p = join(dir, name);
  writeFileSync(p, body);
  return p;
};

/** Run the gate with a Bash tool payload; return {code, err}. */
function run(command) {
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });
  return { code: r.status, err: (r.stderr || '') + (r.stdout || '') };
}
const ALLOW = 0, BLOCK = 2;

// ---- 1. Scope: this gate is none of the business of ordinary commands ------
{
  check('1a plain bash allowed', run('npm test').code === ALLOW);
  check('1b git allowed', run('git commit -m "x"').code === ALLOW);
  const clean = doc('clean.md', '# Report\nAll good. No secrets here.\n');
  check('1c dry-run allowed', run(`node scripts/consult-kimi.mjs --document ${clean} --dry-run`).code === ALLOW);
  check('1d nonexistent doc allowed', run('node scripts/consult-kimi.mjs --document /no/such/file.md').code === ALLOW);
  check('1e consult with no doc flag allowed', run('node scripts/consult-kimi.mjs --ask "hi"').code === ALLOW);
}

// ---- 2. FALSE NEGATIVES — every one of these must be stopped --------------
{
  const cases = [
    ['OpenAI key', 'key: sk-' + 'A'.repeat(32)],
    ['Stripe live key', 'sk_live_' + 'B'.repeat(24)],
    ['webhook secret', 'whsec_' + 'C'.repeat(24)],
    ['Google key', 'AIza' + 'D'.repeat(35)],
    ['Slack token', 'xoxb-' + '1'.repeat(20)],
    ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0'],
    ['GitHub token', 'ghp_' + 'E'.repeat(30)],
    // These two are ASSEMBLED, never written contiguously. Written as literals they
    // trip this repo's own pre-commit secret scanner — which they did, 2026-08-23,
    // and correctly: the scanner cannot tell a fixture from a credential. The
    // tempting fix is a .secretignore entry, but that disarms the scanner on this
    // file permanently, so a real secret pasted here later would ship silently. This
    // repo already recorded that exact trade going the wrong way (cea86e64f: "the
    // whitelist fix was worse than the bug it fixed"). Assembling keeps the scanner
    // fully armed on this file while the gate still sees the real shape at runtime.
    ['private key', ['-----BEGIN ', 'RSA ', 'PRIVATE', ' KEY-----'].join('')],
    ['DB URI', ['postgre', 'sql://admin:', 'hunter2', '@db.internal:5432/swan'].join('')],
    ['real email', 'contact steve.jones@gmail.com for details'],
    ['SSN', 'ssn 123-45-6789'],
    ['phone', 'call (415) 555-1234'],
    ['windows user path', 'C:\\Users\\BigotSmasher\\Desktop\\thing'],
    ['unix home path', '/home/seanuser/secrets/'],
    ['inline credential', 'password: "s3cretV4lue"'],
  ];
  for (const [label, body] of cases) {
    const p = doc(`leak-${label.replace(/\W/g, '')}.md`, `line one\n${body}\nline three\n`);
    const r = run(`node scripts/consult-kimi.mjs --document ${p}`);
    check(`2 BLOCKS ${label}`, r.code === BLOCK, `exit=${r.code}`);
  }
}

// ---- 3. FALSE POSITIVES — the reason gates get deleted --------------------
{
  // Pattern SOURCE, not values. This project reviews de-identification code
  // constantly; if the gate cannot tell these apart it blocks its own reviews.
  const src = doc('patterns.md', [
    'const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+\\.[a-z]{2,}/g;',
    "const KEY = /\\bsk-[A-Za-z0-9]{20,}/g;",
    'Redact with <redacted> or example.com placeholders.',
    'Contact noreply@swanstudios.com — a noreply address.',
    'user: REDACTED, path: <user-home>',
  ].join('\n'));
  const r = run(`node scripts/consult-kimi.mjs --document ${src}`);
  check('3a regex source + placeholders NOT blocked', r.code === ALLOW, `exit=${r.code} :: ${r.err.slice(0, 300)}`);
  check('3b and it says CLEAN', /CLEAN/.test(r.err), r.err.slice(0, 200));

  const prose = doc('prose.md', 'The trainer logged 3 sets of 10 reps for client id 4417.\nProgress charts render from real logs.\n');
  check('3c ordinary product prose not blocked', run(`node scripts/consult-kimi.mjs --document ${prose}`).code === ALLOW);
}

// ---- 4. Tiering: strict rules only for retaining destinations -------------
{
  const p = doc('infra.md', 'host: swan-api.onrender.com\nlan: 192.168.1.44\n');
  check('4a standard destination allows strict-tier findings',
    run(`node scripts/consult-kimi.mjs --document ${p}`).code === ALLOW);
  check('4b stealth destination blocks them',
    run(`node scripts/consult-panel.mjs --document ${p} --seats stealth/ox-alpha`).code === BLOCK);
}

// ---- 5. SELF-LEAK: the gate must not print what it caught -----------------
{
  const secret = 'sk-' + 'Z'.repeat(40);
  const p = doc('selfleak.md', `token: ${secret}\n`);
  const r = run(`node scripts/consult-kimi.mjs --document ${p}`);
  check('5a blocked', r.code === BLOCK);
  check('5b the full secret is NOT echoed into the transcript',
    !r.err.includes(secret), 'gate leaked the value it was protecting');
  check('5c but it is locatable (file:line named)', /selfleak\.md:1/.test(r.err), r.err.slice(0, 300));
}

// ---- 6. Fail-OPEN on its own bugs, and never silently ---------------------
{
  const r = spawnSync(process.execPath, [GATE], { input: '{ not json', encoding: 'utf8' });
  check('6a malformed payload fails OPEN', r.status === ALLOW, `exit=${r.status}`);
  check('6b and says so loudly', /failing open/.test(r.stderr || ''), (r.stderr || '').slice(0, 200));
  const r2 = spawnSync(process.execPath, [GATE], { input: '', encoding: 'utf8' });
  check('6c empty payload allowed', r2.status === ALLOW);
}

// ---- 7. Multiple docs and quoted paths ------------------------------------
{
  const clean = doc('c1.md', 'nothing here\n');
  const dirty = doc('c2.md', 'sk-' + 'Q'.repeat(30) + '\n');
  check('7a scans every --document, not just the first',
    run(`node scripts/consult-kimi.mjs --document ${clean} --document ${dirty}`).code === BLOCK);
  check('7b --seed is also outbound', run(`node scripts/consult-kimi.mjs --seed ${dirty}`).code === BLOCK);
  const q = doc('with space.md', 'sk-' + 'R'.repeat(30) + '\n');
  check('7c quoted path with a space is scanned',
    run(`node scripts/consult-kimi.mjs --document "${q}"`).code === BLOCK);
}

try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ }

if (failures.length) {
  console.error(`FAIL ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`egress-privacy-gate: ${pass}/${pass} pass`);
