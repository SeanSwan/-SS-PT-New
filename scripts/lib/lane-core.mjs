/**
 * lane-core.mjs — the ONE implementation of ledger truth (Rule 67 v2.1)
 * =====================================================================
 * Extracted after a Kimi K3 implementation review found the ledger was parsed by
 * THREE separate copies of the same logic which had already drifted: `lane.mjs`
 * resolved the agent name as `SWAN_AGENT_SURFACE || CLAUDE_AGENT || 'vs-claude'`
 * while `push-blast-radius.mjs` had silently dropped `CLAUDE_AGENT`, so a lane
 * claimed as `codex--main` was compared against `vs-claude--main` and the hook
 * warned an agent about its own locks. A comment three lines above congratulated
 * itself for fixing that exact bug class. Duplication is the defect; one module
 * is the fix.
 *
 * Everything here is pure/read-only except nothing — no writes live in this file.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/** A lane is considered LIVE within this window. Single definition — it was
 *  duplicated as a bare 120 in two files. */
export const FRESH_MIN = 120;

/** Run git. Returns null on failure — NEVER '' — so callers can distinguish
 *  "empty result" from "command failed". Conflating those made the push hook
 *  fail-open: a failed `git diff` produced an empty file list and the guard
 *  returned silently on a migration push. */
export const sh = (cmd, cwd = process.cwd()) => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** Normalize a path for Windows reality: backslashes → forward, and MSYS/Git-Bash
 *  `/c/foo` → `C:/foo`. Node's resolve() treats `/c/repo/.git` as drive-relative and
 *  would silently invent `C:\c\repo\...` — a phantom ledger that mkdirSync would
 *  happily CREATE, resurrecting the v1 fork via path form instead of cwd.
 *  (Git returns the `C:/` form on this machine; this is belt-and-braces for other
 *  git builds, and it costs nothing.) */
export function normPath(p) {
  if (!p) return p;
  let s = String(p).replace(/\\/g, '/');
  const msys = s.match(/^\/([a-zA-Z])\/(.*)$/);
  if (msys) s = `${msys[1].toUpperCase()}:/${msys[2]}`;
  return s;
}

/** Case- and separator-insensitive path identity. Windows filesystems are
 *  case-insensitive, so a raw `===` between two git outputs decided session
 *  identity and could flip IS_MAIN on nothing but shell invocation casing. */
export const samePath = (a, b) => normPath(resolve(normPath(a || ''))).toLowerCase()
  === normPath(resolve(normPath(b || ''))).toLowerCase();

/** The canonical ledger directory — identical from every worktree, or null. */
export function ledgerDir(cwd = process.cwd()) {
  const common = sh('git rev-parse --path-format=absolute --git-common-dir', cwd)
    ?? sh('git rev-parse --git-common-dir', cwd);
  if (!common) return null;
  return normPath(resolve(normPath(common), '..', '.ai-workflow', 'coordination'));
}

/** Who am I? Identity is agent + worktree, and the worktree part carries a short
 *  hash of the FULL path: with 184 worktrees, two checkouts whose directories are
 *  both named `repo` produced the same lane file and overwrote each other — the
 *  exact last-writer-wins regression this rebuild exists to prevent. A linked
 *  worktree literally named `main` collided with the main tree the same way. */
export function identity(cwd = process.cwd()) {
  const agent = process.env.SWAN_AGENT_SURFACE || process.env.CLAUDE_AGENT || 'vs-claude';
  const top = sh('git rev-parse --show-toplevel', cwd);
  const ledger = ledgerDir(cwd);
  const mainTree = ledger ? resolve(ledger, '..', '..') : null;
  const isMain = Boolean(top && mainTree && samePath(top, mainTree));
  let slug = 'main';
  if (!isMain) {
    const full = normPath(top || cwd);
    const short = createHash('sha1').update(full.toLowerCase()).digest('hex').slice(0, 6);
    slug = `${basename(full)}-${short}`;
  }
  return { agent, top: normPath(top || cwd), isMain, slug, laneName: `${agent}--${slug}.lane.md` };
}

/** Git refnames may legally contain `$ ( ) ; \`` — all shell-active. Refuse to
 *  interpolate anything outside a conservative safe set rather than hand it to a
 *  shell. Returns null when the ref is not provably safe. */
export function safeRef(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9._\/-]{1,255}$/.test(ref) && !ref.includes('..')
    ? ref
    : null;
}

/** Parse one lane file's body. CRLF-tolerant everywhere: these files are written
 *  by tools AND edited by hand, and a bare-\n assumption silently no-ops. */
export function parseLane(src) {
  /* Anchor on the HEADING, not the first occurrence of the phrase anywhere in the
   * file: `Task: stop editing now button handlers` precedes the heading in the
   * claim template, so a bare `split(/EDITING NOW/i)` sliced mid-task-line and the
   * real lock list was never parsed — locks silently absent from every consumer. */
  const m = src.match(/^#{1,6}\s*[^\n]*EDITING NOW[^\n]*\r?\n([\s\S]*?)(?=\r?\n#{1,6}\s|\r?\n[A-Z][a-z]+ intent:|$)/mi);
  const section = m ? m[1] : '';
  const locks = section.split(/\r?\n/).map((l) => l.trim())
    // `\(` is load-bearing: release() writes `- (released)` and claim() writes
    // `- (none declared yet)`. Without it a RELEASED lane renders under
    // "DO NOT edit these" — a false lock, and false locks are what get a digest ignored.
    .filter((l) => l.startsWith('- ') && !/^-\s*[`'"*]*\s*(nothing|none|_|\()/i.test(l))
    .map((l) => l.replace(/^-\s*/, '').replace(/[`*]/g, '').trim())
    .filter(Boolean)
    .map((l) => l.slice(0, 120)); // lane files are untrusted input
  const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
    .filter((h) => !/EDITING NOW/i.test(h));
  const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
  return { locks, task: task.slice(0, 90) };
}

/** Every lane in the canonical ledger, with freshness from file mtime. */
export function readLanes(ledger, selfName = null) {
  if (!ledger || !existsSync(ledger)) return [];
  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
    const path = resolve(ledger, file);
    const { locks, task } = parseLane(readFileSync(path, 'utf8'));
    return {
      file,
      self: file === selfName,
      ageMin: Math.round((Date.now() - statSync(path).mtimeMs) / 60000),
      locks,
      task,
    };
  });
}

/** Does a changed path fall under a declared lock? Both sides normalized, because
 *  git emits forward-slash exact-case while a lane holds agent-authored prose that
 *  may use backslashes or different casing. Supports `dir/**` and `dir/*`. */
export function lockMatches(changedPath, lock) {
  const c = normPath(changedPath).toLowerCase();
  const raw = normPath(lock).toLowerCase().replace(/^["']|["']$/g, '');
  const stem = raw.replace(/\/\*+.*$/, '').replace(/\/+$/, '');
  if (!stem) return false;
  return c === raw || c === stem || c.startsWith(`${stem}/`);
}
