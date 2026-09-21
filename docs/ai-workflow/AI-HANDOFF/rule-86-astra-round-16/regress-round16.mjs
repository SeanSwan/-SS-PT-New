#!/usr/bin/env node
// sable-regress-round16.mjs — the whole archive suite in one command, after the round-16 fixes.
//
// Every check asserts an EXIT CODE captured from the child process directly (never through a
// shell pipe, where `$?` is the pipe's last command, not the tool's). A check that cannot run
// is a FAIL, not a skip.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = 'Z:/HostileReviews';
const NODE = process.execPath;
const TOOLS = ['new-review.mjs', 'reindex.mjs', 'query.mjs', 'relink.mjs', 'census-hostile.mjs'];

const run = (script, args = []) => {
  const r = spawnSync(NODE, [path.join(HERE, script), ...args], { cwd: HERE, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} — ${detail}`); }
};

console.log('— syntax —');
for (const t of TOOLS) {
  const r = spawnSync(NODE, ['--check', path.join(HERE, t)], { encoding: 'utf8' });
  check(`node --check ${t}`, r.status === 0, `exit ${r.status}: ${(r.stderr || '').trim().slice(0, 120)}`);
}

console.log('\n— reindex —');
const ri = run('reindex.mjs');
check('reindex exits 0 (no link problems)', ri.code === 0, `exit ${ri.code}`);
check('reindex wrote an index', /wrote index\.jsonl — (\d+) review\(s\)/.test(ri.out),
  ri.out.split('\n').filter(Boolean).slice(-2).join(' | '));
const n = Number((ri.out.match(/wrote index\.jsonl — (\d+) review\(s\)/) || [])[1] || 0);
check('review count is plausible (>= 60)', n >= 60, `counted ${n}`);
check('reindex reports NO problem lines', !/^\[reindex\] PROBLEM/m.test(ri.out),
  (ri.out.match(/^\[reindex\] PROBLEM.*$/m) || [''])[0].slice(0, 160));

const rc = run('reindex.mjs', ['--check']);
check('reindex --check exits 0 (index up to date)', rc.code === 0, `exit ${rc.code}: ${rc.out.trim().split('\n').pop()}`);

console.log('\n— query —');
const qHelp = run('query.mjs', ['--help']);
check('query --help exits 0', qHelp.code === 0, `exit ${qHelp.code}`);
const qNoVal = run('query.mjs', ['--subject']);
check('query --subject with no value exits 2 (Astra F13)', qNoVal.code === 2, `exit ${qNoVal.code}`);
const qUnknown = run('query.mjs', ['--not-a-real-option', 'x']);
check('query unknown option exits 2', qUnknown.code === 2, `exit ${qUnknown.code}`);
const qSub = run('query.mjs', ['--subject', 'rule-86']);
check('query --subject "rule-86" exits 0 and finds the round-16 review', qSub.code === 0 && qSub.out.includes('rule-86-archive-round-16-astra-mega-blueprint'), `exit ${qSub.code}`);
const qClean = run('query.mjs', ['--verdict', 'CLEAN']);
check('query --verdict CLEAN exits 0', qClean.code === 0, `exit ${qClean.code}`);

console.log('\n— relink —');
const rl = run('relink.mjs', ['--dry-run']);
check('relink --dry-run exits 0 (all links reciprocal)', rl.code === 0, `exit ${rl.code}: ${rl.out.trim().split('\n').pop()}`);
check('relink repaired nothing and refused nothing', /repaired: 0 · refused: 0/.test(rl.out), rl.out.trim().split('\n').pop());

console.log('\n— new-review (dry) —');
const nr = run('new-review.mjs', ['--subject', 'regression probe — not a real review', '--reviewer', 'sable', '--dry-run']);
check('new-review --dry-run exits 0', nr.code === 0, `exit ${nr.code}`);
check('new-review --dry-run writes nothing', !fs.existsSync(path.join(HERE, 'regression-probe-not-a-real-review.md')), 'a file appeared');
check('stamped front-matter carries status: draft', /status: draft/.test(nr.out), 'no status key in the dry-run output');

console.log('\n— census —');
const ce = run('census-hostile.mjs');
check('census exits 0', ce.code === 0, `exit ${ce.code}: ${ce.out.trim().split('\n').slice(-3).join(' | ')}`);

console.log(`\n${fail ? 'FAIL' : 'PASS'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
