#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/vault-guard.mjs
 * PURPOSE: PreToolUse hook — snapshot blueprint-class docs BEFORE any overwrite.
 * ADDED: 2026-09-01 (Sean: "when the AI overwrites a blueprint or creates a new
 *         one, the previous one is saved — 50, 100 versions back, so we can
 *         always go back just in case")
 * HARDENED: 2026-09-03 — two rounds of GLM-5.3 hostile review (SWA-230).
 * ============================================================================
 *
 * WHY THIS EXISTS WHEN GIT EXISTS: git preserves every COMMITTED version
 * forever, and backup-repo.mjs bundles the repo off-machine. The gap is the
 * overwrites BETWEEN commits — an agent rewriting a blueprint five times in one
 * session commits only the last state. This hook catches the other four.
 *
 * DESIGN — same ethos as backup-after-work.mjs, NOT the blocking gates:
 *   - NEVER blocks. Exits 0 on every path including its own failure.
 *   - DEDUPED by content hash; PRUNED to KEEP versions per file (default 100).
 *   - FAIL-OPEN BUT NOT FAIL-SILENT: swallowed errors land in ERRORS.log and
 *     stderr. A vault that has gone dark must be discoverable.
 *   - OVER-CAPTURES ON PURPOSE: a needless snapshot is deduped and free; a
 *     missed version is gone forever.
 *
 * ROUND 1 (F*) and ROUND 2 (R2-*) findings addressed:
 *   F1  Bash writes bypassed the hook   -> pathsFromCommand() + Bash matcher
 *   F3  fail-silent catch               -> ERRORS.log + stderr, still exit 0
 *   F5  lexicographic prune / KEEP NaN  -> mtime sort; KEEP validated
 *   F6  slot-name collision             -> nested slots, no `/`->`__`
 *   F7  classification misses           -> case-insensitive, realpath, excludes
 *   F8  junk ate the retention quota    -> SNAP_RE gate
 *   F9  8-hex dedupe collision          -> 12 hex
 *   R2-1  repo-wide destructive commands (`git reset --hard`, `git clean -fdx`,
 *         `git checkout -- .`, `git stash`, `rm -rf .`) name no file, so nothing
 *         was snapshotted — and they destroy the CURRENT version, the worst
 *         possible loss -> DESTRUCTIVE detector triggers a bounded sweep
 *   R2-2  tokens resolved against REPO only -> also try the shell cwd, and the
 *         dir x file cross-product (`cd frontend && sed -i … AGENTS.md`)
 *   R2-3  SCAN_CAP bounded results, not work -> cap the scanned region and the
 *         tokens stat()ed, so a 1MB heredoc cannot cost 10^5 syscalls
 *   R2-4  glob/pathspec forms never stat -> trigger the sweep
 *   R2-5  Windows absolute paths shattered on `\` -> normalise separators
 *   R2-6  dist/build/coverage were root-anchored only -> match when nested
 *   R2-7  isEntryPoint compared non-realpath'd paths -> realpath both sides
 *   R2-16 torn snapshot on power loss   -> fsync before returning
 *   R2-17 unstattable file pruned first -> treat as NEWEST (conservative)
 *
 * KNOWN, DELIBERATE LIMIT: non-Claude agents (Codex etc.) run no Claude Code
 * hooks at all, so their overwrites are covered only by git commits.
 *
 * WHERE: .ai-workflow/vault/<relative path>/<UTCstamp>-<sha12><ext>
 * Restore = copy the snapshot back over the file.
 *
 * ENV: SWAN_VAULT_DISABLE=1 (skip), SWAN_VAULT_KEEP (per-file cap, default 100)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const VAULT = path.join(REPO, '.ai-workflow', 'vault');

// F5: Number('abc') is NaN and Math.max(1, NaN) is NaN, which made
// slice(0, length - NaN) return [] — pruning silently disabled forever.
const keepRaw = Number(process.env.SWAN_VAULT_KEEP);
const KEEP = Number.isFinite(keepRaw) && keepRaw >= 1 ? Math.floor(keepRaw) : 100;

// F8: only names this hook wrote may occupy a retention slot.
const SNAP_RE = /^\d{8}T\d{6}Z-[0-9a-f]{8,}\./;

// R2-3: bound the WORK, not just the result. Paths live at the head of a
// command; a heredoc body is prose and must not cost one stat() per word.
const SCAN_CAP = 400;        // max files snapshotted from one command
const SCAN_CHARS = 16384;    // max command characters examined
const SCAN_TOKENS = 2000;    // max tokens stat()ed

const QUOTED = /["'`]([^"'`\n]{2,300})["'`]/g;
const BARE = /[A-Za-z0-9_.:/-]{2,300}/g;

// R2-1: commands that destroy the working tree wholesale without naming a file.
// Routine agent moves, and they take out the CURRENT version.
const DESTRUCTIVE = /\bgit\s+(reset\s+(--hard|--merge)|checkout\s+--|restore\b|clean\s+-|stash\b)|\brm\s+-[rRf]/;

function done() { process.exit(0); }

// F3: fail-open must not mean fail-invisible.
function note(rel, err) {
  const line = `${new Date().toISOString()}\t${rel}\t${err && err.message ? err.message : String(err)}\n`;
  try {
    fs.mkdirSync(VAULT, { recursive: true });
    fs.appendFileSync(path.join(VAULT, 'ERRORS.log'), line);
  } catch { /* the log itself is best-effort */ }
  try { process.stderr.write(`[vault] snapshot skipped: ${line}`); } catch { /* ignore */ }
}

function toPosix(p) {
  return p.split(path.sep).join('/').split('\\').join('/');
}

export function isVaultClass(rel) {
  const lower = toPosix(rel).toLowerCase();
  const base = path.posix.basename(lower);

  // Never vault the vault, dependency trees, or build output. R2-6: these must
  // match when NESTED too (frontend/dist/graph.mmd was slipping through).
  if (lower.startsWith('.ai-workflow/')) return false;
  if (lower.startsWith('node_modules/') || lower.includes('/node_modules/')) return false;
  for (const d of ['dist', 'build', 'coverage', '.next', 'out']) {
    if (lower.startsWith(`${d}/`) || lower.includes(`/${d}/`)) return false;
  }

  // Generated / append-only files, anchored to their real paths so a
  // hand-written doc sharing a basename stays protected (F7).
  if (lower === 'docs/ai-workflow/catalog.md') return false;
  if (lower === 'docs/ai-workflow/learning-drops-ledger.md') return false;

  if (/\.(mmd|mermaid)$/.test(lower)) return true;
  if (lower.startsWith('docs/ai-workflow/') && /\.(md|mdx|markdown)$/.test(lower)) return true;

  if (base === 'agents.md') return true;                    // nested constitutions count
  if (!lower.includes('/')) {
    if (/^(claude(\.local)?|soul|active-index)\.md$/.test(base)) return true;
    if (/^swan-.*\.md$/.test(base)) return true;
  }
  return false;
}

export function snapshot(absInput) {
  let abs = path.resolve(absInput);
  let repo = REPO;
  // F7: a symlinked repo root made path.relative() emit `../…`, and the file was
  // silently skipped as "outside the repo".
  try { abs = fs.realpathSync(abs); } catch { /* may not exist; keep resolved */ }
  try { repo = fs.realpathSync(REPO); } catch { /* keep as-is */ }

  const rel = path.relative(repo, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
  if (!isVaultClass(rel)) return false;

  let st;
  try { st = fs.statSync(abs); } catch { return false; }   // new file: nothing to preserve
  if (!st.isFile()) return false;

  try {
    const content = fs.readFileSync(abs);
    const sha = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12); // F9
    // F6: keep the real hierarchy — flattening `/`->`__` was not injective.
    const slot = path.join(VAULT, toPosix(rel));
    fs.mkdirSync(slot, { recursive: true });

    const existing = fs.readdirSync(slot).filter((f) => SNAP_RE.test(f));
    if (existing.some((f) => f.includes(`-${sha}`))) return false;   // already stored

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const ext = path.extname(abs) || '.md';
    // R2-16: fsync, so a power loss cannot leave a torn snapshot that restores
    // as a silently corrupt document.
    const out = path.join(slot, `${stamp}-${sha}${ext}`);
    const fd = fs.openSync(out, 'w');
    try { fs.writeSync(fd, content); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }

    // F5: prune by real mtime, not filename — a backward clock correction made
    // the NEWEST snapshots sort first and get deleted first.
    // R2-17: a file we cannot stat is treated as NEWEST (kept), never oldest.
    const entries = fs.readdirSync(slot)
      .filter((f) => SNAP_RE.test(f))
      .map((f) => {
        let m = Number.POSITIVE_INFINITY;
        try { m = fs.statSync(path.join(slot, f)).mtimeMs; } catch { /* keep it */ }
        return { f, m };
      })
      .sort((a, b) => (a.m - b.m) || a.f.localeCompare(b.f));
    for (const { f } of entries.slice(0, Math.max(0, entries.length - KEEP))) {
      try { fs.unlinkSync(path.join(slot, f)); } catch { /* best effort */ }
    }
    return true;
  } catch (err) {
    note(rel, err);
    return false;
  }
}

/**
 * Walk where blueprints live and snapshot everything vault-class.
 *
 * R2-1: triggered by a command that destroys the tree without naming a file
 * (`git reset --hard`, `git clean -fdx`, `rm -rf .`). Those take out the CURRENT
 * version of every blueprint — the worst loss the vault exists to prevent — and
 * the path-token parse can never see them.
 */
export function sweepVaultClassTree(limit = SCAN_CAP) {
  let taken = 0;
  try {
    for (const f of fs.readdirSync(REPO, { withFileTypes: true })) {
      if (taken >= limit) return taken;
      if (!f.isFile() || !isVaultClass(f.name)) continue;
      if (snapshot(path.join(REPO, f.name))) taken += 1;
    }
  } catch { /* unreadable root: fall through to the docs walk */ }

  const stack = [path.join(REPO, 'docs')];
  while (stack.length && taken < limit) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (taken >= limit) break;
      const child = path.join(dir, e.name);
      if (e.isDirectory()) { stack.push(child); continue; }
      if (isVaultClass(path.relative(REPO, child)) && snapshot(child)) taken += 1;
    }
  }
  return taken;
}

/**
 * F1: a Bash command can destroy a blueprint as thoroughly as an Edit
 * (`sed -i`, `> file`, `mv`, `cp`, `prettier --write`), and none of those fire a
 * Write/Edit hook — confirmed empirically 2026-09-03.
 *
 * The parse is deliberately dumb and over-approximating, and only considers
 * paths that already exist, so noise costs one stat().
 */
export function pathsFromCommand(command, cwd = process.cwd()) {
  if (typeof command !== 'string' || !command) return { files: [], sweep: false };
  const head = command.slice(0, SCAN_CHARS);              // R2-3: bound the work

  const tokens = [];
  for (const m of head.matchAll(QUOTED)) tokens.push(m[1]);
  for (const m of head.matchAll(BARE)) tokens.push(m[0]);

  const bases = [REPO];
  // R2-2: `cd frontend && sed -i … AGENTS.md` resolves against the shell's cwd.
  try { if (cwd && path.resolve(cwd) !== REPO) bases.push(path.resolve(cwd)); } catch { /* ignore */ }

  const files = new Set();
  const dirs = [];
  let sweep = false;
  let seen = 0;

  for (const raw of tokens) {
    if (files.size >= SCAN_CAP) break;
    if (++seen > SCAN_TOKENS) break;                      // R2-3
    // R2-5: Windows absolute paths used to shatter on the backslash.
    const tok = raw.replace(/^["'`]|["'`]$/g, '').replace(/[),;:]+$/, '').split('\\').join('/');
    if (!tok || tok.startsWith('-')) continue;

    // R2-4: globs and pathspecs never stat. If one points into docs/, sweep.
    if (/[*?[\]]/.test(tok)) {
      if (/(^|\/)docs(\/|$)/.test(tok.toLowerCase())) sweep = true;
      continue;
    }

    for (const base of bases) {
      let abs;
      try { abs = path.resolve(base, tok); } catch { continue; }
      let st;
      try { st = fs.statSync(abs); } catch { continue; }
      if (st.isFile()) { files.add(abs); break; }
      if (st.isDirectory()) { dirs.push(abs); break; }
    }
  }

  // R2-2: the dir x file cross-product catches `cd <dir> && fmt <file>` when the
  // hook's own cwd is neither.
  for (const d of dirs) {
    for (const raw of tokens) {
      if (files.size >= SCAN_CAP) break;
      const tok = raw.split('\\').join('/');
      if (!tok || tok.startsWith('-') || tok.includes('/')) continue;
      const abs = path.join(d, tok);
      try { if (fs.statSync(abs).isFile()) files.add(abs); } catch { /* not a file */ }
    }
  }

  // A directory mention (`prettier --write docs/ai-workflow/`) endangers every
  // blueprint underneath it. Bound the walk to docs/ so `rm -rf node_modules`
  // does not become a filesystem crawl.
  for (const d of dirs) {
    if (files.size >= SCAN_CAP) break;
    const rel = toPosix(path.relative(REPO, d)).toLowerCase();
    if (!rel || rel.startsWith('..')) continue;
    if (!(rel === 'docs' || rel.startsWith('docs/'))) continue;
    const stack = [d];
    while (stack.length && files.size < SCAN_CAP) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (files.size >= SCAN_CAP) break;
        const child = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(child); else files.add(child);
      }
    }
  }

  return { files: [...files].slice(0, SCAN_CAP), sweep };
}

export function handleCommand(command, cwd = process.cwd()) {
  if (typeof command !== 'string' || !command) return 0;
  if (DESTRUCTIVE.test(command)) return sweepVaultClassTree();   // R2-1
  const { files, sweep } = pathsFromCommand(command, cwd);
  if (sweep) return sweepVaultClassTree();                       // R2-4
  let taken = 0;
  for (const f of files) { if (snapshot(f)) taken += 1; }
  return taken;
}

// R2-7: compare REAL paths — a symlinked hook path made this false, and the body
// silently never ran while the user believed they were protected.
function isEntryPoint() {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  try {
    if (process.env.SWAN_VAULT_DISABLE === '1') done();

    let raw = '';
    try { raw = fs.readFileSync(0, 'utf8'); } catch { done(); }
    let payload;
    try { payload = JSON.parse(raw); } catch { done(); }

    const target = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path;
    if (target) { snapshot(target); done(); }

    const command = payload?.tool_input?.command;
    if (command) handleCommand(command);
    done();
  } catch (err) {
    note('(hook)', err);
    process.exit(0);
  }
}

export { KEEP, VAULT, DESTRUCTIVE };
