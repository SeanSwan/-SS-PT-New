import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = process.cwd();
const PKGREL = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const SNAP = join(ROOT, PKGREL, 'evidence/preserved-r4-package');
const BASE = '53005a6da965f5ca9e9c8d5ead86c6e19e081095';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const atBase = execFileSync('git', ['ls-tree', '-r', '--name-only', BASE, PKGREL], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
let ok = 0, bad = [];
for (const p of atBase) {
  const rel = p.slice(PKGREL.length + 1);
  const committed = sha(Buffer.from(execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, maxBuffer: 256*1024*1024 })));
  let snap = null;
  try { snap = sha(readFileSync(join(SNAP, rel))); } catch (e) { snap = `MISSING(${e.code})`; }
  if (committed === snap) ok++; else bad.push({ rel, committed, snap });
}
console.log(`verified ${ok}/${atBase.length} preserved artifacts byte-identical`);
if (bad.length) { console.log('MISMATCHES:'); for (const b of bad) console.log(' ', b.rel, b.committed, b.snap); process.exitCode = 1; }
