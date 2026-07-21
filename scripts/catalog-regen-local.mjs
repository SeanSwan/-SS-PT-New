/**
 * catalog-regen-local.mjs — deterministic generator for .ai-workflow/CATALOG.local.md (Rule 72).
 *
 * Indexes the GITIGNORED operational stores (hermes-inbox, fusion, continuity, coordination, qa).
 * Fully deterministic — NO LLM: the title row is the file's first `# ` heading (operational memos
 * are born with descriptive titles), the date comes from the filename timestamp or file mtime,
 * and the SHA is `git hash-object` (blob SHA works for untracked files too).
 *
 * The output is gitignored by `.ai-workflow/*` and MUST NEVER be merged into the tracked
 * docs/ai-workflow/CATALOG.md — separate trust boundaries (Rules 8/44/59).
 *
 * Usage (from repo root, where .ai-workflow/ actually exists — worktrees don't have it):
 *   node scripts/catalog-regen-local.mjs           # rewrite .ai-workflow/CATALOG.local.md
 *   node scripts/catalog-regen-local.mjs --check   # print counts only, write nothing
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const STORE = join(ROOT, '.ai-workflow');
const OUT = join(STORE, 'CATALOG.local.md');
const LANES = ['hermes-inbox', 'fusion', 'qa', 'continuity', 'coordination'];
const CHECK = process.argv.includes('--check');

if (!existsSync(STORE)) {
  console.error('.ai-workflow/ not found — run from the real repo root, not a worktree.');
  process.exit(1);
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.md') && e.name !== 'CATALOG.local.md') yield p;
  }
}

function firstHeading(text) {
  for (const line of text.split('\n').slice(0, 30)) {
    const m = line.match(/^#{1,3} (.+)/);
    if (m) return m[1].replace(/\|/g, '/').trim().slice(0, 160);
  }
  return '(no heading)';
}

function fileDate(rel, abs) {
  const m = rel.match(/(\d{4})(\d{2})(\d{2})T\d{6}Z/) ?? rel.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return statSync(abs).mtime.toISOString().slice(0, 10);
}

const files = LANES.filter((l) => existsSync(join(STORE, l))).flatMap((l) => [...walk(join(STORE, l))]).sort();
const rows = [];
for (const abs of files) {
  const rel = relative(STORE, abs).replace(/\\/g, '/');
  const sha = execFileSync('git', ['hash-object', abs], { cwd: ROOT, encoding: 'utf8' }).trim().slice(0, 12);
  rows.push(`| ${rel} | ${fileDate(rel, abs)} | ${firstHeading(readFileSync(abs, 'utf8'))} | ${sha} |`);
}

console.log(`rows: ${rows.length} across lanes: ${LANES.join(', ')}`);
if (CHECK) process.exit(0);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, `# CATALOG.local — gitignored operational-store index (Rule 72)

> **GENERATED FILE — DO NOT HAND-EDIT, DO NOT COMMIT, NEVER merge into docs/ai-workflow/CATALOG.md** (separate trust boundary — Rules 8/44/59). Rows are POINTERS, never canon: open the source file before acting. Regenerate: \`node scripts/catalog-regen-local.mjs\` from the repo root. Regenerated ${today}.
> **Usage:** \`rg -i "<topic>" .ai-workflow/CATALOG.local.md\` — grep, do not load wholesale.

| path (relative to .ai-workflow/) | date | title | source-SHA12 |
|---|---|---|---|
${rows.join('\n')}
`, 'utf8');
console.log(`wrote ${OUT}`);
