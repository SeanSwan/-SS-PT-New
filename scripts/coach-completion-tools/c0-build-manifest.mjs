// C0 admission — build the preservation / dirty-baseline manifest.
// Run from ROOT:  node scripts/coach-completion-tools/c0-build-manifest.mjs
// Writes PKG/evidence/preservation.json and PKG/evidence/dirty-baseline.json.
// Read-only with respect to the tree except for the two output files.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const PKG = join(ROOT, 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19');
const EV = join(PKG, 'evidence');
const BASE = '53005a6da965f5ca9e9c8d5ead86c6e19e081095';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const sha256File = (rel) => {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  try {
    if (!statSync(abs).isFile()) return null;
    return sha256(readFileSync(abs));
  } catch (err) {
    return { error: err.code || String(err.message) };
  }
};

// ── The nine numbered documents, at their committed bytes ────────────────────
const NUMBERED = ['00-README', '01-architecture', '02-wireframes', '03-contracts', '04-build-order',
  '05-slices', '06-bans', '07-checkpoints', '08-decision-density-self-test', '09-tests'];

const numbered = NUMBERED.map((stem) => {
  const rel = posix.join('docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19', `${stem}.md`);
  const relFromPkg = `${stem}.md`;
  const committed = git('show', `${BASE}:${rel}`);
  const committedBuf = Buffer.from(committed, 'utf8');
  const working = sha256File(relFromPkg);
  return {
    document: relFromPkg,
    committed: { lines: committedBuf.toString('utf8').split('\n').length - 1, bytes: committedBuf.length, sha256: sha256(committedBuf) },
    working: working && working.error ? working : { sha256: working, lines: working ? readFileSync(join(PKG, relFromPkg), 'utf8').split('\n').length - 1 : null },
    changedSinceBase: working !== sha256(committedBuf),
  };
});

// ── Every other artifact under PKG that existed at BASE (prior replies, packets, notes) ──
const pkgRel = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const atBase = git('ls-tree', '-r', '--name-only', BASE, pkgRel).split('\n').filter(Boolean);
const otherAtBase = atBase.filter((p) => !NUMBERED.some((s) => p === `${pkgRel}/${s}.md`));
const preservedOthers = otherAtBase.map((p) => {
  const relFromPkg = p.slice(pkgRel.length + 1);
  const committedBuf = Buffer.from(git('show', `${BASE}:${p}`), 'utf8');
  const working = sha256File(relFromPkg);
  return {
    path: relFromPkg,
    committed: { bytes: committedBuf.length, sha256: sha256(committedBuf) },
    workingSha256: working && working.error ? working : working,
    changedSinceBase: working !== sha256(committedBuf),
  };
});

// ── The dirty baseline: everything git reports as dirty, hashed as found ─────
const porcelain = git('status', '--porcelain=v1', '--untracked-files=all').split('\n').filter(Boolean);
const dirty = porcelain.map((line) => {
  const code = line.slice(0, 2);
  let path = line.slice(3);
  if (path.includes(' -> ')) path = path.split(' -> ')[1];
  path = path.replace(/^"|"$/g, '');
  const s = sha256File(path);
  let bytes = null;
  try { bytes = statSync(join(ROOT, path)).size; } catch { /* deleted */ }
  return { status: code.trim() || code, path, bytes, sha256: s && s.error ? s : s };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  branch: git('rev-parse', '--abbrev-ref', 'HEAD').trim(),
  baseHead: BASE,
  headAtPreservation: git('rev-parse', 'HEAD').trim(),
  headEqualsBase: git('rev-parse', 'HEAD').trim() === BASE,
  isAncestorOfMain: (() => { try { git('merge-base', '--is-ancestor', BASE, 'main'); return true; } catch { return false; } })(),
  counts: { pinnedDocuments: numbered.length, preservedPriorArtifacts: preservedOthers.length, dirtyPaths: dirty.length },
  note: 'The dirty-source manifest, not base HEAD, identifies the reviewed candidate (PKG/00-README.md).',
  pinnedDocuments: numbered,
  preservedPriorArtifacts: preservedOthers,
};

if (!existsSync(EV)) mkdirSync(EV, { recursive: true });
writeFileSync(join(EV, 'preservation.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(EV, 'dirty-baseline.json'), `${JSON.stringify({ generatedAt: manifest.generatedAt, baseHead: BASE, headAtPreservation: manifest.headAtPreservation, paths: dirty }, null, 2)}\n`);

console.log(JSON.stringify(manifest.counts, null, 2));
console.log('changed numbered docs:', numbered.filter((d) => d.changedSinceBase).map((d) => d.document).join(', ') || '(none)');
