#!/usr/bin/env node
/**
 * SCRIPT: Mission QA report generator
 * PURPOSE: Render the ranked repair list from real crawl results.
 * SAFETY: Reads local test-result JSON only; emits no credentials.
 *
 * WHY THIS WAS REWRITTEN (Slice 1, 2026-08-12):
 * The previous version read NOTHING. It had no readFileSync, no result parsing —
 * it emitted a fixed block of prose with a fresh timestamp, so the artifact a
 * human opens to judge site health was byte-identical whether the suite passed,
 * failed, or never ran. Its own header claimed it "reads local test-result
 * metadata"; that was false.
 *
 * It now reads dashboard-crawl-*.json (written by the crawl after every route)
 * and renders the ranked worklist. Consuming plain JSON is deliberate: the
 * worklist is built in TypeScript under frontend/e2e, and this script must not
 * import it.
 *
 * If no results exist, this says so and exits non-zero. A QA report that cannot
 * find evidence must not look like a clean bill of health.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`Usage: node scripts/qa/mission-report.mjs [options]

Options:
  --results=<dir>  Playwright output dir. Default frontend/test-results.
  --out=<path>     Output markdown path.
  -h, --help       Print this help.

Exits non-zero when no crawl results are found, so an empty run cannot be
mistaken for a passing one.
`);
  process.exit(0);
}

const opt = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const resultsDir = path.resolve(repoRoot, opt('results', 'frontend/test-results'));
const outputPath = path.resolve(
  repoRoot,
  opt('out', 'docs/qa/reports/SWANSTUDIOS-MISSION-QA-REPORT-latest.md'),
);

/** Recursively collect dashboard-crawl-*.json, newest first. */
function findReports(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findReports(full));
    else if (/^dashboard-crawl-.*\.json$/.test(entry.name)) found.push(full);
  }
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function loadReports(files) {
  const byRole = new Map();
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }
    const role = parsed?.summary?.role;
    // Newest wins: files are sorted newest-first, so never overwrite.
    if (role && !byRole.has(role)) byRole.set(role, { ...parsed, file });
  }
  return [...byRole.values()];
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function mergeWorklists(reports) {
  const merged = new Map();
  for (const report of reports) {
    for (const finding of report.worklist ?? []) {
      const key = `${finding.fingerprint}::${report.summary.role}`;
      if (!merged.has(key)) merged.set(key, { ...finding, role: report.summary.role });
    }
  }
  return [...merged.values()].sort((a, b) => (
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || (b.occurrences ?? 0) - (a.occurrences ?? 0)
  ));
}

function coverageTable(reports) {
  const rows = reports.map((report) => {
    const s = report.summary;
    return `| ${s.role} | ${s.visited}/${s.total} | ${s.failed} | ${s.unreached} | ${s.truncated} | ${s.complete ? 'yes' : 'NO'} |`;
  });
  return ['| Role | Visited | Failed | Never reached | Truncated | Complete |',
    '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function worklistSection(findings) {
  if (findings.length === 0) return '_No findings._';
  return findings.map((finding, index) => {
    const routes = finding.routes?.length
      ? `\n   - routes (${finding.routes.length}): ${finding.routes.slice(0, 8).join(', ')}${finding.routes.length > 8 ? ' …' : ''}`
      : '';
    const file = finding.owningFile ? `\n   - file: \`${finding.owningFile}\`` : '';
    const seen = finding.occurrences > 1 ? ` ×${finding.occurrences}` : '';
    return `${index + 1}. **[${String(finding.severity).toUpperCase()}]** \`${finding.category}\`${seen} — ${finding.role}\n`
      + `   - ${finding.message}${routes}${file}`;
  }).join('\n');
}

function suppressionSection(reports) {
  const lines = [];
  for (const report of reports) {
    const audit = report.suppressionAudit;
    if (!audit) continue;
    for (const item of audit.expired ?? []) lines.push(`- **EXPIRED** \`${item.id}\` (${item.expires}) — ${item.reason}`);
    for (const item of audit.stale ?? []) lines.push(`- STALE \`${item.id}\` — matched nothing; candidate for deletion`);
    for (const item of audit.active ?? []) lines.push(`- active \`${item.id}\` — expires ${item.expires}`);
  }
  return lines.length ? [...new Set(lines)].join('\n') : '_No suppressions in effect._';
}

const reports = loadReports(findReports(resultsDir));

if (reports.length === 0) {
  process.stderr.write(
    `No dashboard-crawl results found under ${path.relative(repoRoot, resultsDir)}.\n`
    + 'Refusing to write a report that would imply a clean run. '
    + 'Run the crawl first (npm run qa:mission:prod-live-readonly).\n',
  );
  process.exit(1);
}

const findings = mergeWorklists(reports);
const blocking = findings.filter((finding) => finding.severity !== 'low');

const markdown = `# SWANSTUDIOS-MISSION-QA-REPORT

Generated: ${new Date().toISOString()}
Source: ${reports.length} crawl result file(s) under \`${path.relative(repoRoot, resultsDir)}\`

## Coverage

${coverageTable(reports)}

## Ranked repair list

${blocking.length} blocking finding(s), ${findings.length} total.

${worklistSection(findings)}

## Suppressions

${suppressionSection(reports)}
`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown, 'utf8');
process.stdout.write(
  `Wrote ${path.relative(repoRoot, outputPath)} — ${reports.length} role(s), `
  + `${blocking.length} blocking finding(s)\n`,
);