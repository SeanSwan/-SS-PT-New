/**
 * catalog-regen.mjs — deterministic regenerator for docs/ai-workflow/CATALOG.md (Rule 72).
 *
 * The catalog is GENERATED ONLY. This script is the sole writer. It never calls an LLM:
 * SHAs come from `git ls-files -s`, decision text comes from existing rows or a --rows
 * update file produced by a distillation pass. Incremental by design — only files whose
 * blob SHA changed are flagged for re-distillation.
 *
 * Usage:
 *   node scripts/catalog-regen.mjs --check          # report drift, write nothing (exit 2 if distillation needed)
 *   node scripts/catalog-regen.mjs                  # rewrite catalog: keep fresh rows, flag stale/new, drop deleted
 *   node scripts/catalog-regen.mjs --rows <file.md> # merge distilled replacement rows (path-keyed), then rewrite
 *
 * Contract (Rule 72): a changed source file makes its row STALE — the old decision text is
 * kept but status becomes `stale` and the OLD sha is kept as evidence until a distillation
 * pass supplies a fresh row via --rows. New files get a NEEDS-DISTILLATION placeholder.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CATALOG = `${REPO}/docs/ai-workflow/CATALOG.md`;
const SCOPE = 'docs/ai-workflow/AI-HANDOFF/';
const CHECK = process.argv.includes('--check');
const rowsArgIdx = process.argv.indexOf('--rows');
const rowsFile = rowsArgIdx > -1 ? process.argv[rowsArgIdx + 1] : null;

function gitManifest() {
  const out = execFileSync('git', ['ls-files', '-s', '--', `${SCOPE}*.md`], { cwd: REPO, encoding: 'utf8' });
  const map = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/^\d+ ([0-9a-f]{40}) \d\t(.+\.md)$/);
    if (m) map.set(m[2].slice(SCOPE.length), m[1].slice(0, 12));
  }
  return map;
}

function parseRows(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    // ['', path, date, author, decision, status, sha12, ''] — skip header/separator
    if (c.length !== 8 || c[1] === 'path' || /^-+$/.test(c[1])) continue;
    map.set(c[1], { date: c[2], author: c[3], decision: c[4], status: c[5], sha: c[6] });
  }
  return map;
}

const manifest = gitManifest();
const existing = existsSync(CATALOG) ? parseRows(readFileSync(CATALOG, 'utf8')) : new Map();
const updates = rowsFile ? parseRows(readFileSync(rowsFile, 'utf8')) : new Map();

const needsDistill = [];
const dropped = [];
const rows = [];

for (const path of [...manifest.keys()].sort()) {
  const sha = manifest.get(path);
  const upd = updates.get(path);
  const old = existing.get(path);
  if (upd) {
    rows.push({ path, ...upd, sha }); // sha ALWAYS re-stamped from git, never trusted from input
  } else if (old && old.sha === sha && old.status !== 'stale') {
    rows.push({ path, ...old });
  } else if (old && old.sha === sha) {
    needsDistill.push(path); // placeholder/stale row from a prior regen — still awaiting distillation
    rows.push({ path, ...old });
  } else if (old) {
    needsDistill.push(path);
    rows.push({ path, ...old, status: 'stale' }); // old sha kept as evidence of what was distilled
  } else {
    needsDistill.push(path);
    const date = path.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? 'unknown';
    rows.push({ path, date, author: 'unknown', decision: 'NEEDS DISTILLATION', status: 'stale', sha });
  }
}
for (const path of existing.keys()) if (!manifest.has(path)) dropped.push(path);

const today = new Date().toISOString().slice(0, 10);
const header = `# CATALOG — distilled recall layer (Rule 72)

> **GENERATED FILE — DO NOT HAND-EDIT.** Rows are POINTERS, never canon. Acting on a row requires opening the source file. A row whose source-SHA no longer matches \`git ls-files -s <path>\` is STALE and must not be trusted. To fix a row: fix the source doc and regenerate via \`node scripts/catalog-regen.mjs\`. Regeneration is T2 (reads repo, writes only this file).
> **Scope this generation:** ${SCOPE} tracked *.md (${manifest.size} files) · Regenerated ${today} by scripts/catalog-regen.mjs.
> **Usage:** \`rg -i "<topic>" docs/ai-workflow/CATALOG.md\` — grep, do not load wholesale.

## AI-HANDOFF (paths relative to ${SCOPE})

| path | date | author | decision | status | source-SHA12 |
|---|---|---|---|---|---|
`;
const body = rows.map((r) => `| ${r.path} | ${r.date} | ${r.author} | ${r.decision} | ${r.status} | ${r.sha} |`).join('\n');

if (needsDistill.length) console.log(`NEEDS DISTILLATION (${needsDistill.length}):\n  ${needsDistill.join('\n  ')}`);
if (dropped.length) console.log(`DROPPED (source deleted) (${dropped.length}):\n  ${dropped.join('\n  ')}`);
console.log(`rows: ${rows.length} · fresh: ${rows.length - needsDistill.length} · stale/new: ${needsDistill.length} · dropped: ${dropped.length}`);

if (CHECK) process.exit(needsDistill.length ? 2 : 0);
writeFileSync(CATALOG, `${header}${body}\n`, 'utf8');
console.log(`wrote ${CATALOG}`);
process.exit(needsDistill.length ? 2 : 0);
