#!/usr/bin/env node
/**
 * gates-fire-report.mjs — the INSTRUMENT for the heredoc gate's shadow period.
 *
 * WHY: the heredoc-escape gate shipped SHADOW BY DEFAULT (PR #72, 2026-08-25) with a
 * 14-day observe-then-enforce plan. A shadow log nobody can read is a dead instrument —
 * the corpus's own lesson ("an instrument that did not run reports clean"). This script
 * turns .ai-workflow/gates/fires.jsonl into the enforce/keep-observing decision.
 *
 * Usage:  node scripts/gates-fire-report.mjs [--days 14] [--json]
 *
 * Reads fires.jsonl + fires.1.jsonl (the rotation pair). Reports, per gate:
 *   invocations, would-blocks (shadow) vs real blocks (enforce), hatch uses,
 *   reason-class histogram, per-day would-block counts, observation span,
 *   and an ENFORCE-READINESS line: how many days of data exist, and the would-block
 *   rate — the number Sean reads before flipping SWAN_HEREDOC_GATE=enforce.
 *
 * Pure logic exported for tests; fs only in main().
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Collapse a reason string to a stable class (drop per-command variability). */
export function reasonClass(r) {
  if (typeof r !== 'string' || !r) return 'unknown';
  if (r.startsWith('hatch:')) return 'hatch';
  // "unquoted heredoc <<EOF contains ${...} (shell expands it), backtick (...)"
  const m = r.match(/^(.*?) contains (.*)$/);
  if (!m) return r.slice(0, 60);
  const kind = m[1]
    .replace(/<<\S+/, '<<DELIM')            // delimiter name varies per command
    .replace(/\s+/g, ' ')
    .trim();
  const hazards = m[2]
    .split(', ')
    .map((h) => h.replace(/\s*\(.*?\)\s*$/, '').trim()) // drop the explainer
    .sort()
    .join('+');
  return `${kind} :: ${hazards}`;
}

/**
 * @param {string[]} lines raw JSONL lines (both generations, any order)
 * @param {{days?: number, now?: Date}} opts
 */
export function analyze(lines, opts = {}) {
  const days = Number.isFinite(opts.days) && opts.days > 0 ? opts.days : 14;
  const now = opts.now instanceof Date ? opts.now : new Date();
  const cutoff = now.getTime() - days * 86_400_000;
  const rows = [];
  let malformed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t);
      const ts = Date.parse(r.ts);
      if (!Number.isFinite(ts)) { malformed++; continue; }
      rows.push({ ...r, _ts: ts });
    } catch { malformed++; }
  }
  const win = rows.filter((r) => r._ts >= cutoff);
  const gates = {};
  for (const r of win) {
    const g = (gates[r.gate || 'unknown'] ||= {
      invocations: 0, wouldBlock: 0, blocked: 0, hatch: 0,
      reasons: {}, byDay: {}, first: null, last: null,
    });
    g.invocations++;
    const day = new Date(r._ts).toISOString().slice(0, 10);
    const hasReasons = Array.isArray(r.reasons) && r.reasons.length > 0;
    if (r.hatch === true) g.hatch++;
    else if (r.blocked === true) { g.blocked++; g.byDay[day] = (g.byDay[day] || 0) + 1; }
    else if (r.shadow === true && hasReasons) { g.wouldBlock++; g.byDay[day] = (g.byDay[day] || 0) + 1; }
    if (hasReasons && r.hatch !== true) for (const reason of r.reasons) {
      const c = reasonClass(reason);
      g.reasons[c] = (g.reasons[c] || 0) + 1;
    }
    if (g.first === null || r._ts < g.first) g.first = r._ts;
    if (g.last === null || r._ts > g.last) g.last = r._ts;
  }
  for (const g of Object.values(gates)) {
    g.spanDays = g.first === null ? 0 : Math.max(1, Math.ceil((g.last - g.first) / 86_400_000));
    // Denominator EXCLUDES hatch rows (Ox r3 F4): a hatch is a deliberate, logged
    // exception, not organic traffic — letting it dilute the rate understates how
    // often real commands would block. (Hatch rows never enter wouldBlock/blocked:
    // the else-if chain above counts them once, in g.hatch — pinned by test.)
    const organic = g.invocations - g.hatch;
    g.wouldBlockRate = organic > 0 ? +(100 * (g.wouldBlock + g.blocked) / organic).toFixed(2) : 0;
    g.first = g.first === null ? null : new Date(g.first).toISOString();
    g.last = g.last === null ? null : new Date(g.last).toISOString();
  }
  return { windowDays: days, totalRows: rows.length, inWindow: win.length, malformed, gates };
}

export function render(report) {
  const out = [];
  out.push(`GATE FIRE REPORT — last ${report.windowDays} days (${report.inWindow}/${report.totalRows} rows in window` +
    (report.malformed ? `, ${report.malformed} malformed skipped` : '') + ')');
  const names = Object.keys(report.gates);
  if (!names.length) {
    out.push('  no fires recorded in the window — either no traffic or the gate is not wired.');
    out.push('  VERIFY THE INSTRUMENT before reading this as "clean": run a command with an');
    out.push('  unquoted heredoc containing ${x} and confirm a row appears in fires.jsonl.');
    return out.join('\n');
  }
  for (const name of names) {
    const g = report.gates[name];
    out.push(`\n[${name}]  invocations=${g.invocations}  would-block=${g.wouldBlock}  blocked=${g.blocked}  hatch=${g.hatch}  rate=${g.wouldBlockRate}%`);
    out.push(`  observed ${g.spanDays} day(s): ${g.first} → ${g.last}`);
    const rc = Object.entries(g.reasons).sort((a, b) => b[1] - a[1]);
    if (rc.length) { out.push('  reason classes:'); for (const [c, n] of rc) out.push(`    ${String(n).padStart(4)}  ${c}`); }
    const dd = Object.entries(g.byDay).sort();
    if (dd.length) out.push('  per-day (would-block+blocked): ' + dd.map(([d, n]) => `${d.slice(5)}=${n}`).join('  '));
    if (name === 'heredoc-escape') {
      // Readiness needs BOTH span AND density (Ox r3 F4): 3 scattered fires across 15
      // days is not evidence; 200 invocations in one afternoon is not 14 days of
      // exposure. Calendar span is not statistical power — require each separately.
      const MIN_DAYS = 14, MIN_INVOCATIONS = 100;
      // ORGANIC floor (Ox r4 F1 — the same hatch disease the r3 fix cured in the rate,
      // surviving one layer over): 40 organic + 60 hatch rows crossed the raw floor
      // with only 40 real observations. The floor counts what the rate counts.
      const organicCount = g.invocations - g.hatch;
      const lacking = [];
      if (g.spanDays < MIN_DAYS) lacking.push(`${g.spanDays}d of ${MIN_DAYS}d span`);
      if (organicCount < MIN_INVOCATIONS) lacking.push(`${organicCount} of ${MIN_INVOCATIONS} organic invocations`);
      out.push(lacking.length === 0
        ? `  ENFORCE-READINESS: ${g.spanDays}d span, ${g.invocations} invocations. If every reason class above is a real hazard (no false positives), flip SWAN_HEREDOC_GATE=enforce.`
        : `  ENFORCE-READINESS: keep shadowing — insufficient ${lacking.join(' and ')}.`);
    }
  }
  return out.join('\n');
}

export function main() {
  const argv = process.argv.slice(2);
  const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const days = Number(arg('--days', '14'));
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dir = join(root, '.ai-workflow', 'gates');
  const lines = [];
  for (const f of ['fires.1.jsonl', 'fires.jsonl']) {
    const p = join(dir, f);
    if (existsSync(p)) lines.push(...readFileSync(p, 'utf8').split('\n'));
  }
  const report = analyze(lines, { days });
  if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(render(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
