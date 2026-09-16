#!/usr/bin/env node
/**
 * S17 repairability resolver.
 *
 * For every in-scope dead INTERNAL link, answer the only question that decides
 * whether it is repairable: does the intended target still exist somewhere in
 * the repo (so the link is a stale path that can be repointed), or is it gone
 * entirely (so the document is describing something that no longer exists)?
 *
 * Read-only. usage: node resolve-internal.mjs <worktreeRoot> <inventory.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2];
const inv = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

const EXCLUDED = [
  '.agents/',
  '.claude/',
  '.continue/',
  '.cursor/',
  'archive/',
  'AI-Village-Documentation/validation-prompts/',
  'docs/ai-workflow/validation-reports/',
  'docs/ai-workflow/AI-HANDOFF/',
];

// Index every tracked path by basename so a stale path can be matched to a
// file that merely moved.
const tracked = execFileSync('git', ['ls-files'], { cwd: root, maxBuffer: 1 << 28 })
  .toString()
  .split('\n')
  .filter(Boolean);

const byBasename = new Map();
for (const p of tracked) {
  const b = path.posix.basename(p);
  if (!byBasename.has(b)) byBasename.set(b, []);
  byBasename.get(b).push(p);
}

const rows = [];
for (const rec of inv.perFile) {
  if (EXCLUDED.some((p) => rec.file.startsWith(p))) continue;
  for (const b of rec.broken) {
    if (b.class !== 'internal-missing-file') continue;
    const clean = b.target.split('#')[0];
    if (!clean) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rec.file), clean));
    const exists = fs.existsSync(path.join(root, resolved));
    const base = path.posix.basename(clean);
    const candidates = (byBasename.get(base) || []).filter((p) => p !== resolved);
    rows.push({
      file: rec.file,
      target: b.target,
      resolved,
      exists,
      candidateMoved: candidates.slice(0, 4),
    });
  }
}

let repairableByMove = 0;
let gone = 0;
console.log('file :: target :: resolved :: moved-candidates');
for (const r of rows) {
  if (r.candidateMoved.length) repairableByMove += 1;
  else gone += 1;
  const tag = r.candidateMoved.length ? `MOVED-> ${r.candidateMoved.join(' , ')}` : 'GONE (no file with that basename)';
  console.log(`${r.file}\n    ${r.target}\n    -> ${r.resolved}\n    ${tag}`);
}
console.log(`\n== internal in-scope links: ${rows.length}; repairable-by-repoint: ${repairableByMove}; gone: ${gone} ==`);
