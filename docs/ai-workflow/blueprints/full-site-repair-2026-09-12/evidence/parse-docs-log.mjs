#!/usr/bin/env node
/**
 * S17 baseline parser: turn a GitHub Actions "Documentation Link Check" job log
 * into a structured, reconcilable dead-link inventory.
 *
 * Why this exists: the headline number ("105 files / 1870 dead links") is not
 * actionable on its own. This separates internal-file failures (ours to repair)
 * from external-URL rot (third-party), and separates live documentation from
 * vendored agent-tooling bundles and frozen archives. It makes no scope
 * decision; it only measures.
 *
 * Reconciliation (verified against the CI log for commit e07d4b9, not assumed):
 *   - markdown-link-check prints each dead link TWICE per file under the
 *     action's verbose mode.
 *   - Therefore raw [x] lines == 2 x the per-file "ERROR: N dead links found!"
 *     count, for every one of the 105 files (0 mismatches).
 *   - The two printings are NOT always byte-identical (11 links differ), so
 *     string de-duplication is wrong. The per-file count the action itself
 *     reports is authoritative: take the FIRST N [x] lines of each file block.
 *   - This yields exactly the action's 1870 total.
 *
 * Authority: read-only over an existing log file.
 */
import fs from 'node:fs';
import path from 'node:path';

const logPath = process.argv[2];
const outPath = process.argv[3];
if (!logPath) {
  console.error('usage: node parse-docs-log.mjs <log> [out.json]');
  process.exit(2);
}

const ANSI = /\u001b\[[0-9;]*m/g;
const TS = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z /;

const raw = fs.readFileSync(logPath, 'utf8');
const lines = raw.split(/\r?\n/).map((l) => l.replace(TS, '').replace(ANSI, ''));

/** file -> { reported, xLines: [...], dead: [...] } */
const blocks = new Map();
let current = null;

for (const line of lines) {
  const fm = /^FILE: (.+)$/.exec(line);
  if (fm) {
    current = fm[1].replace(/^\.\//, '');
    if (!blocks.has(current)) blocks.set(current, { reported: null, xLines: [] });
    continue;
  }
  if (!current) continue;
  const block = blocks.get(current);

  const em = /^ERROR: (\d+) dead links found!$/.exec(line);
  if (em) {
    block.reported = Number(em[1]);
    continue;
  }

  if (line.startsWith('[✖] ')) {
    // Parsed by explicit suffix removal rather than one lazy regex: `(.+?)`
    // followed by all-optional groups collapses to a single character.
    let rest = line.slice(4);
    let error = null;
    const erm = / \[Error: ([^\]]*)\]/.exec(rest);
    if (erm) {
      error = erm[1];
      rest = rest.slice(0, erm.index) + rest.slice(erm.index + erm[0].length);
    }
    let status = null;
    const sm = / → Status: (\S+)/.exec(rest);
    if (sm) {
      status = sm[1];
      rest = rest.slice(0, sm.index) + rest.slice(sm.index + sm[0].length);
    }
    const target = rest.replace(/\s*\{$/, '').trim();
    const errMatch = error ? /ENOENT: no such file or directory, access '([^']+)'/.exec(error) : null;
    block.xLines.push({ target, status, error, missingAbs: errMatch ? errMatch[1] : null });
  }
}

/** Classify a single dead link entry. */
function classify(entry) {
  const t = entry.target;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || t.startsWith('//') || /^mailto:/i.test(t)) return 'external-url';
  if (t.startsWith('#')) return 'same-file-anchor';
  if (entry.missingAbs || entry.status === '400') return 'internal-missing-file';
  return 'internal-other';
}

/** Which area of the repo owns this markdown file. */
function area(file) {
  const parts = file.split('/');
  const top = parts[0];
  const VENDOR = ['.agents', '.claude', '.continue', '.cursor', '.codex'];
  if (VENDOR.includes(top)) return `vendor:${top}`;
  if (top === 'archive') return 'archive:frozen';
  if (top === 'AI-Village-Documentation') return 'ai-village:frozen-output';
  if (top === 'docs') {
    const p = parts.slice(1).join('/');
    if (/^ai-workflow\/AI-HANDOFF\//.test(p)) return 'docs:ai-workflow/AI-HANDOFF';
    if (/^ai-workflow\/(archive|blueprints|validation-reports|reviews)\//.test(p)) return `docs:ai-workflow/${p.split('/')[1]}`;
    if (/^_attic\//.test(p)) return 'docs:_attic';
    return 'docs:live';
  }
  return `other:${top}`;
}

const perFile = [];
const byClass = {};
const byArea = {};
const byAreaClass = {};
const targetCount = new Map();
const invariantViolations = [];

for (const [file, block] of blocks) {
  if (block.reported === null || block.reported === 0) continue;
  if (block.xLines.length !== block.reported * 2) {
    invariantViolations.push({ file, reported: block.reported, xLines: block.xLines.length });
  }
  // Authoritative: the action's own per-file count selects the first block.
  const dead = block.xLines.slice(0, block.reported);
  const a = area(file);
  const rec = { file, area: a, dead: dead.length, classes: {}, broken: [] };
  for (const e of dead) {
    const c = classify(e);
    rec.classes[c] = (rec.classes[c] || 0) + 1;
    rec.broken.push({ target: e.target, status: e.status, missingAbs: e.missingAbs, class: c });
    byClass[c] = (byClass[c] || 0) + 1;
    byArea[a] = (byArea[a] || 0) + 1;
    byAreaClass[`${a} :: ${c}`] = (byAreaClass[`${a} :: ${c}`] || 0) + 1;
    const key = `${c} :: ${e.target}`;
    targetCount.set(key, (targetCount.get(key) || 0) + 1);
  }
  perFile.push(rec);
}

perFile.sort((x, y) => y.dead - x.dead);

const topTargets = [...targetCount.entries()]
  .map(([k, n]) => {
    const idx = k.indexOf(' :: ');
    return { class: k.slice(0, idx), target: k.slice(idx + 4), count: n };
  })
  .sort((x, y) => y.count - x.count)
  .slice(0, 40);

const report = {
  source: path.basename(logPath),
  parsedAt: new Date().toISOString(),
  reporting: {
    actionReportedFiles: blocks.size && perFile.length,
    actionReportedDeadLinks: perFile.reduce((s, f) => s + f.dead, 0),
    parsedFilesWithDeaths: perFile.length,
    parsedDeadLinks: perFile.reduce((s, f) => s + f.dead, 0),
    invariantViolations,
  },
  byClass,
  byArea,
  byAreaClass,
  distinctTargets: targetCount.size,
  topTargets,
  perFile,
};

if (outPath) fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { reporting: report.reporting, byClass, byArea, distinctTargets: report.distinctTargets },
    null,
    2,
  ),
);
