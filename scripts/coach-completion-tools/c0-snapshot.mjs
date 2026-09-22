// Rebuild the preservation snapshot from committed BLOBS (LF-exact), not from a
// CRLF-smudged archive extraction. core.autocrlf=true in this repo, so any file
// written through the working-tree path gets CRLF while the blob is LF.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { assertRoot } from './_root.mjs';
const ROOT = assertRoot();
const PKGREL = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const SNAP = join(ROOT, PKGREL, 'evidence/preserved-r4-package');
const BASE = '53005a6da965f5ca9e9c8d5ead86c6e19e081095';
if (existsSync(SNAP)) rmSync(SNAP, { recursive: true, force: true });
mkdirSync(SNAP, { recursive: true });
const atBase = execFileSync('git', ['ls-tree', '-r', '--name-only', BASE, PKGREL], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
for (const p of atBase) {
  const rel = p.slice(PKGREL.length + 1);
  const buf = execFileSync('git', ['cat-file', 'blob', `${BASE}:${p}`], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const dest = join(SNAP, rel);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, buf);
}
console.log(`wrote ${atBase.length} blobs to preserved-r4-package/`);
