#!/usr/bin/env node
/**
 * dewatermark.test.mjs -- the verification in dewatermark.mjs must itself be verified.
 * =============================================================================
 * A de-watermarker that prints PASS on work it did not check is worse than none: it
 * is authoritative-looking and it is the whole point of the tool. So these cases are
 * mostly about what must be REJECTED.
 *
 * The script is driven end-to-end against a stub Ollama on a loopback port, so the
 * real argument parsing, real prompt assembly, real metrics and real exit codes run.
 * Nothing here mocks the logic under test.
 *
 * Run: node scripts/dewatermark.test.mjs   (exit 0 = pass)
 */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(fileURLToPath(new URL('.', import.meta.url)), 'dewatermark.mjs');

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` -- ${detail}` : ''}`);
};

const dir = mkdtempSync(join(tmpdir(), 'dewatermark-'));
const file = (name, body) => { const p = join(dir, name); writeFileSync(p, body); return p; };

// A source passage well over the 150-word floor, carrying anchors a rewrite must keep.
const SOURCE = `SwanStudios pairs every client with a trainer who has 26 years behind them.
${'Each logged session becomes evidence your coach reads before the next one, so the plan changes when your body does rather than when the calendar says it should. '.repeat(6)}
A session costs $175 and there is no contract.`;

/** Stub Ollama: replies with whatever `reply` currently holds. */
let reply = '';
let lastBody = null;
const server = createServer((req, res) => {
  if (req.url === '/api/version') { res.end(JSON.stringify({ version: 'stub' })); return; }
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    lastBody = JSON.parse(raw || '{}');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: { role: 'assistant', content: reply } }));
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const endpoint = `http://127.0.0.1:${server.address().port}`;

const run = (args) => new Promise((resolve) => {
  execFile(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' },
    (err, stdout, stderr) => resolve({ code: err?.code ?? 0, stdout, stderr }));
});

// ---- 1. Below the word floor: refuse, and do not call the model ---------------
{
  lastBody = null;
  const p = file('short.md', 'Book a session. It costs $175.');
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('1a short input exits 3', r.code === 3, `code=${r.code}`);
  check('1b explains the floor', /below the --min-words floor/.test(r.stderr), r.stderr.slice(0, 120));
  check('1c never called the model', lastBody === null, 'stub was contacted for a sub-floor input');
  check('1d wrote no output file', !existsSync(join(dir, 'short.dewatermarked.md')));
}

// ---- 2. A genuine rewrite passes and lands at the default path ----------------
{
  reply = `Every SwanStudios member trains with a coach carrying 26 years of practice.
${'What you record each visit turns into proof your trainer studies ahead of time, which means the programme moves when your body moves and not when a date arrives. '.repeat(6)}
One visit runs $175, with nothing binding you in.`;
  const p = file('good.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('2a genuine rewrite exits 0', r.code === 0, `code=${r.code} ${r.stderr.slice(0, 200)}`);
  check('2b reports PASS', /\bPASS\b/.test(r.stderr), r.stderr.slice(0, 160));
  check('2c default out path used', existsSync(join(dir, 'good.dewatermarked.md')));
  check('2d output is the rewrite', readFileSync(join(dir, 'good.dewatermarked.md'), 'utf8').includes('carrying 26 years'));
  check('2e sent source as the user turn', lastBody?.messages?.at(-1)?.content?.includes('26 years behind them'));
  check('2f instructed a full rewrite', /Rewrite EVERY sentence/.test(lastBody?.messages?.[0]?.content ?? ''));
}

// ---- 3. THE NEGATIVE CONTROL: an unfaithful rewrite must NOT pass -------------
// Low 4-gram overlap alone is satisfied by text about something else entirely.
// Without the anchor check this case scores ~0% survival and would print PASS.
{
  reply = `${'Tomatoes want full sun and steady water, and a raised bed drains better than heavy clay soil does in a wet spring. '.repeat(9)}`;
  const p = file('garbage.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('3a hallucinated rewrite exits 3', r.code === 3, `code=${r.code}`);
  check('3b reports REJECT', /\bREJECT\b/.test(r.stderr), r.stderr.slice(0, 160));
  check('3c names the dropped anchors', /dropped \d+ fact anchor/.test(r.stderr), r.stderr.slice(0, 300));
  check('3d flags the money anchor', /\$175/.test(r.stderr), r.stderr.slice(0, 300));
  // Regression guard: the anchor bag was once built from lower-cased text, which made
  // every proper noun match itself and silently reduced the check to numbers only.
  // A brand name MUST be among the anchors, or fidelity is barely being checked.
  check('3d2 flags the brand anchor', /SwanStudios/.test(r.stderr), r.stderr.slice(0, 400));
  check('3e quarantines to .reject', existsSync(join(dir, 'garbage.dewatermarked.md.reject')));
  check('3f does NOT write the pass path', !existsSync(join(dir, 'garbage.dewatermarked.md')));
}

// ---- 4. A near-copy must NOT pass -- the watermark would survive with it ------
{
  reply = SOURCE.replace('pairs', 'matches').replace('behind them', 'of experience');
  const p = file('copy.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('4a near-copy exits 3', r.code === 3, `code=${r.code}`);
  check('4b names surviving wording', /too much original wording survived/.test(r.stderr), r.stderr.slice(0, 300));
  check('4c overlap reported high', /survival (?:[3-9]\d|100)\.\d%/.test(r.stderr), r.stderr.slice(0, 200));
}

// ---- 5. --check measures without calling the model ----------------------------
{
  lastBody = null;
  const p = file('measure.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint, '--check']);
  check('5a check exits 0', r.code === 0, `code=${r.code}`);
  check('5b verdict is rewrite-warranted', /rewrite-warranted/.test(r.stdout), r.stdout.slice(0, 200));
  check('5c model not called', lastBody === null);
}

// ---- 6. Preamble stripping must not eat a real opening line -------------------
// The first implementation stripped any "Here's ...:" opener, which would have
// deleted a legitimate first sentence.
{
  const body = `Here's the thing: ${'most training software stops paying attention the moment the novelty wears off and nobody reads what you actually did in the gym that week. '.repeat(8)} A session is $175 with SwanStudios and 26 years of coaching.`;
  reply = body;
  const p = file('preamble.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('6a real opener survives', readFileSync(join(dir, 'preamble.dewatermarked.md'), 'utf8').startsWith("Here's the thing:"),
    readFileSync(join(dir, 'preamble.dewatermarked.md'), 'utf8').slice(0, 60));

  // ...but an actual announcement line IS removed.
  reply = `Here is the rewritten passage:\n${body}`;
  const p2 = file('preamble2.md', SOURCE);
  await run(['--in', p2, '--endpoint', endpoint]);
  const got = readFileSync(join(dir, 'preamble2.dewatermarked.md'), 'utf8');
  check('6b announcement line removed', !/rewritten passage/.test(got), got.slice(0, 80));
}

// ---- 7. Transport failure is loud, never a silent pass ------------------------
{
  const p = file('down.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', 'http://127.0.0.1:1']);
  check('7a unreachable model exits 1', r.code === 1, `code=${r.code}`);
  check('7b tells you how to check', /api\/version/.test(r.stderr), r.stderr.slice(0, 200));
  check('7c writes nothing', !existsSync(join(dir, 'down.dewatermarked.md')));
}

// ---- 8. Empty model reply is a failure, not an empty "clean" file -------------
{
  reply = '   ';
  const p = file('empty.md', SOURCE);
  const r = await run(['--in', p, '--endpoint', endpoint]);
  check('8a empty reply exits 1', r.code === 1, `code=${r.code}`);
  check('8b writes nothing', !existsSync(join(dir, 'empty.dewatermarked.md')));
}

server.close();
rmSync(dir, { recursive: true, force: true });

if (failures.length) {
  console.error(`dewatermark.test: ${pass} passed, ${failures.length} FAILED`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(`dewatermark.test: ${pass}/${pass} passed`);
