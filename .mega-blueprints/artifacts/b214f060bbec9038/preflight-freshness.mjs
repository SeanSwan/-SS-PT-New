/**
 * FILE: preflight-freshness.mjs
 * WHY:  A receipt is only as good as the correspondence between its numbers and the bytes on disk.
 *
 * HISTORY, because this file has now been wrong five times and each wrongness was DIFFERENT:
 *   1. it accepted any `hg*.log` as gate evidence without looking inside;
 *   2. after anchoring markers to line starts, a three-line hand-written file still qualified;
 *   3. the exit pairs were never value-checked or ordered, so a log that PASSED then FAILED qualified;
 *   4. it only required ONE area's id to be cited, so a receipt could cite the frontend id while its
 *      backend claim pointed at a superseded log;
 *   5. (round 124, by a hostile reviewer with fixtures) the ORDERING ITSELF was forgeable — mtime was
 *      the only signal, so `(Get-Item log).LastWriteTime = Get-Date` made a nine-day-old log "newest"
 *      and a stale tree passed. The same review found two more holes: a NEW source file inside a
 *      gitignored directory is invisible to `--exclude-standard`, and a file marked `--skip-worktree`
 *      (or assume-unchanged) does not appear in `git diff` at all. Both printed FRESHNESS_OK with
 *      ZERO changed files.
 *
 * SO THE DESIGN CHANGED, not just the rules. Ordering now rests on CONTENT HASHES recorded in a
 * manifest at the moment the gates ran, with mtime kept only as a precondition for RECORDING:
 *
 *   verify (default) — every source file on disk must hash-match the manifest, and a qualifying gate
 *                      log must exist per area, and the receipt's row must assert a PASSING verdict.
 *   --record         — refuses unless a qualifying gate log is newer than every source file, then
 *                      writes the manifest for the current bytes.
 *
 * Content is the signal; mtime is only what stops a manifest being recorded without gates. A touched
 * log, a gitignored file, a skip-worktree file and a restore-from-backup all fail verify.
 *
 * LIMITS, stated so the result is not over-read:
 *  - A hash match proves the bytes are the ones that were recorded; it does NOT prove the gates would
 *    pass on them today (they were run, and their logs are cited — that is a separate claim).
 *  - The receipt-row rule reads the row's VERDICT words (round 124): it must say FRESHNESS_OK and must
 *    not contain a negation, and EVERY matching line is checked rather than the first.
 *  - Files that are not source code (docs, logs, this tooling) are out of scope by design.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ARTIFACTS_ID = 'b214f060bbec9038';

// Round 147: resolve the packet root by WALKING UP, not by assuming CWD is `backend/`.
// The former `path.resolve(process.cwd(), '..')` silently produced the wrong root when the script was
// run from the packet root — which is the invocation this packet's own receipt documents — and then
// reported `no receipt at <doubled path>`. That reads as a LOST RECEIPT, not as a wrong directory, so
// a correct tree could be judged broken. Content-hash comparisons are meaningless against a wrong
// root, so the gate now refuses to guess: it finds the root that actually holds the packet, or it
// fails loudly and says what it was looking for.
function resolveRoot(start) {
  let dir = start;
  for (;;) {
    const candidate = path.join(dir, '.mega-blueprints', 'artifacts', ARTIFACTS_ID, 'READINESS-RECEIPT-20260913.md');
    if (existsSync(candidate) && existsSync(path.join(dir, 'backend'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const root = resolveRoot(process.cwd());
if (!root) {
  console.log(`PREFLIGHT_FAILED: no packet root at or above ${process.cwd()}`);
  console.log(`  a packet root holds BOTH backend/ and .mega-blueprints/artifacts/${ARTIFACTS_ID}/READINESS-RECEIPT-20260913.md`);
  process.exit(1);
}
const artifacts = path.join(root, '.mega-blueprints', 'artifacts', ARTIFACTS_ID);
const receipt = path.join(artifacts, 'READINESS-RECEIPT-20260913.md');
const manifestPath = path.join(artifacts, 'gate-source-manifest.json');
const recordMode = process.argv.includes('--record');

const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);

// ── inventory: an fs WALK, not `git ls-files` ────────────────────────────────────────────────
// `--exclude-standard` structurally hides gitignored source, and `git diff` hides skip-worktree and
// assume-unchanged entries. Neither may decide what gets checked.
const SOURCE_EXT = /\.(mjs|cjs|js|ts|tsx)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.vite', 'tmp']);
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && SOURCE_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}
const sourceFiles = [...walk(path.join(root, 'backend')), ...walk(path.join(root, 'frontend'))]
  .filter((abs) => !abs.includes(`${path.sep}node_modules${path.sep}`));
const isBackend = (abs) => abs.startsWith(path.join(root, 'backend') + path.sep);
const hash = (abs) => createHash('sha256').update(readFileSync(abs)).digest('hex');
const current = {};
for (const abs of sourceFiles) current[path.relative(root, abs).replace(/\\/g, '/')] = hash(abs);

// git's own view, used ONLY to report index tricks that would hide a change from other tools.
const hidden = new Set();
for (const line of git(['ls-files', '-v', 'backend/', 'frontend/'])) {
  const flag = line[0];
  if (flag === 'h' || flag === 'S' || flag === 's') hidden.add(line.slice(2).trim());
}

// ── gate evidence ────────────────────────────────────────────────────────────────────────────
const GATE_PROVENANCE = /RUN\s+v\d|Test Files|PARSE_OK|ROUTE_GRAPH_LINKS_OK|changed\/untracked backend/;
const BACKEND_GATE_MARKERS = [
  { label: 'BACKEND_EXIT', re: /^BACKEND_EXIT=(\d+)\b/gm, exitOnly: true },
  { label: 'BOOT_GATE_OK', re: /^BOOT_GATE_OK\s*$/gm, needs: /^BOOT_GATE_EXIT=(\d+)\b/gm },
  { label: 'DRIFT_AUDIT_OK', re: /^DRIFT_AUDIT_OK\s*$/gm, needs: /^DRIFT_AUDIT_EXIT=(\d+)\b/gm },
];
const FRONTEND_GATE_MARKERS = [{ label: 'FRONTEND_EXIT', re: /^FRONTEND_EXIT=(\d+)\b/gm, exitOnly: true }];
const tailLines = (text, n = 3) => text.split(/\r?\n/).filter((l) => l.trim() !== '').slice(-n).join('\n');
const stateless = (re) => new RegExp(re.source, re.flags.replace('g', ''));

function readLogText(file) {
  const buf = readFileSync(file);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le');
  return buf.toString('utf8');
}

const logs = readdirSync(artifacts)
  .filter((n) => /\.log$/i.test(n))
  .map((n) => {
    const file = path.join(artifacts, n);
    const text = readLogText(file);
    const tail = tailLines(text);
    const hasProvenance = GATE_PROVENANCE.test(text);
    const qualify = (markers) => (hasProvenance ? markers : [])
      .filter(({ re, needs, exitOnly }) => {
        const verdicts = [...text.matchAll(re)];
        if (verdicts.length === 0) return false;
        const verdict = verdicts[verdicts.length - 1];
        if (exitOnly) return verdict[1] === '0' && stateless(re).test(tail);
        if (!needs) return false;
        const exits = [...text.matchAll(needs)];
        if (exits.length === 0) return false;
        const exit = exits[exits.length - 1];
        if (exit[1] !== '0') return false;
        return exit.index > verdict.index && stateless(needs).test(tail);
      })
      .map(({ label }) => label);
    return { name: n, ms: statSync(file).mtimeMs, backendTokens: qualify(BACKEND_GATE_MARKERS), frontendTokens: qualify(FRONTEND_GATE_MARKERS) };
  });

const newestBackendLog = logs.filter((l) => l.backendTokens.length > 0).sort((a, b) => b.ms - a.ms)[0] ?? null;
const newestFrontendLog = logs.filter((l) => l.frontendTokens.length > 0).sort((a, b) => b.ms - a.ms)[0] ?? null;
// PER-AREA ordering. The first version of this rewrite compared BOTH areas against the newest source
// file overall, so touching one backend file invalidated the frontend evidence too — a false FAIL
// that the very next run produced (round 124). Each area is judged against its own newest file.
const newestBackendSourceMs = sourceFiles.filter(isBackend)
  .reduce((max, abs) => Math.max(max, statSync(abs).mtimeMs), 0);
const newestFrontendSourceMs = sourceFiles.filter((abs) => !isBackend(abs))
  .reduce((max, abs) => Math.max(max, statSync(abs).mtimeMs), 0);
const fmt = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 19) : 'n/a');
const failures = [];

console.log(`source files on disk (fs walk, gitignore NOT honoured): ${sourceFiles.length}`);
console.log(`newest BACKEND source file mtime : ${fmt(newestBackendSourceMs)}`);
console.log(`newest FRONTEND source file mtime: ${fmt(newestFrontendSourceMs)}`);
console.log(`newest backend gate log  : ${newestBackendLog ? `${newestBackendLog.name} [${newestBackendLog.backendTokens.join(',')}]` : 'NONE'} (${fmt(newestBackendLog?.ms ?? 0)})`);
console.log(`newest frontend gate log : ${newestFrontendLog ? `${newestFrontendLog.name} [${newestFrontendLog.frontendTokens.join(',')}]` : 'NONE'} (${fmt(newestFrontendLog?.ms ?? 0)})`);
if (hidden.size > 0) {
  failures.push(`${hidden.size} tracked file(s) are marked assume-unchanged/skip-worktree, so \`git diff\` cannot see edits to them: ${[...hidden].slice(0, 5).join(', ')}`);
}

// A log must postdate ITS OWN area's newest source file before it may evidence anything, and — in
// record mode — before a manifest may be written at all. This is the mtime's ONLY remaining job.
const backendOrdered = newestBackendLog && newestBackendLog.ms >= newestBackendSourceMs;
const frontendOrdered = newestFrontendLog && newestFrontendLog.ms >= newestFrontendSourceMs;

if (recordMode) {
  if (!backendOrdered || !frontendOrdered) {
    for (const [area, ok] of [['backend', backendOrdered], ['frontend', frontendOrdered]]) {
      if (!ok) failures.push(`cannot RECORD: no ${area} gate log postdates the newest source file — run the gates first, then record`);
    }
  } else {
    const manifest = {
      recordedAt: new Date().toISOString(),
      backendGateLog: newestBackendLog.name,
      frontendGateLog: newestFrontendLog.name,
      files: current,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`RECORDED ${Object.keys(current).length} file hashes from gate logs ${newestBackendLog.name} / ${newestFrontendLog.name}`);
    console.log('FRESHNESS_RECORDED');
    process.exit(0);
  }
} else if (!existsSync(manifestPath)) {
  failures.push(`no manifest at ${path.relative(root, manifestPath)} — run the gates, then this script with --record`);
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const recorded = manifest.files ?? {};
  const changed = Object.keys(current).filter((rel) => recorded[rel] !== current[rel]);
  const removed = Object.keys(recorded).filter((rel) => !(rel in current));
  console.log(`manifest recorded ${Object.keys(recorded).length} hashes at ${manifest.recordedAt} from ${manifest.backendGateLog} / ${manifest.frontendGateLog}`);
  if (changed.length > 0) {
    failures.push(`${changed.length} source file(s) differ from the recorded bytes: ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? ' …' : ''}`);
  }
  if (removed.length > 0) failures.push(`${removed.length} recorded file(s) are gone: ${removed.slice(0, 6).join(', ')}`);
  if (!backendOrdered) failures.push('no backend gate log postdates the newest source file');
  if (!frontendOrdered) failures.push('no frontend gate log postdates the newest source file');

  // The receipt row must assert a PASSING verdict — not merely cite the right ids (round 124).
  // Round 149: match the row's LABEL, not any occurrence of the phrase. A prose mention of this gate
  // inside another table row used to be collected as if it were the evidence row, and a row that never
  // claims a freshness verdict then failed the check for not claiming one — a false failure produced
  // entirely by wording. Anchoring on the label makes prose unable to impersonate the evidence.
  const rows = readFileSync(receipt, 'utf8').split(/\r?\n/)
    .filter((line) => /^\|\s*\*\*Freshness preflight\*\*/i.test(line));
  if (rows.length === 0) {
    failures.push('the receipt has no "freshness preflight" row to check');
  } else {
    for (const row of rows) {
      const cited = [...row.matchAll(/hg\d+/g)].map((m) => m[0]);
      const required = [newestBackendLog?.name, newestFrontendLog?.name].filter(Boolean).map((n) => n.match(/hg\d+/)[0]);
      const missing = required.filter((id) => !cited.includes(id));
      // The VERDICT is what must be positive. A row may legitimately describe a past failure in
      // prose (this one does: an earlier revision claimed FRESHNESS_OK while the live run failed),
      // so the check targets verdict-shaped text rather than the whole sentence — round 124 showed
      // the first version both over- and under-read: it parsed only ids, and a whole-sentence
      // negation test would reject the honest narrative that replaced them.
      const assertsPass = /FRESHNESS_OK/.test(row);
      const negatedVerdict = /FRESHNESS_FAILED|FRESHNESS_SUPERSEDED|does NOT cover the current bytes/i.test(row);
      console.log(`receipt row cites ${cited.join(', ') || 'nothing'} (must include ${required.join(', ') || 'n/a'}); asserts pass: ${assertsPass}; negated verdict: ${negatedVerdict}`);
      if (missing.length > 0) failures.push(`the receipt row must cite the newest qualifying evidence for every area; missing ${missing.join(', ')}`);
      if (!assertsPass) failures.push('the receipt row does not assert FRESHNESS_OK');
      if (negatedVerdict) failures.push('the receipt row states a FAILED/SUPERSEDED verdict, so it does not claim a passing state');
    }
  }
}

if (failures.length === 0) {
  console.log('FRESHNESS_OK: every source file matches the recorded gate-time bytes, both areas have newer gate evidence, and the receipt asserts a passing state');
  process.exit(0);
}
for (const f of failures) console.log(`  STALE: ${f}`);
console.log('FRESHNESS_FAILED: re-run the gates, then --record, then update the receipt');
process.exit(1);
