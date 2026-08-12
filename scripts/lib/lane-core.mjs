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

/** Conventional extensionless files that are real lock targets. `Dockerfile` is in
 *  the push hook's executes-on-deploy list, so dropping it was the worst case. */
export const EXTENSIONLESS = new Set([
  'Dockerfile', 'Makefile', 'README', 'LICENSE', 'Procfile', 'Jenkinsfile', 'CODEOWNERS', '.env',
]);

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
    const short = createHash('sha1').update(full.toLowerCase()).digest('hex').slice(0, 10);
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
export function parseLane(src, root = null) {
  /* Line-wise, deliberately — TWICE now this logic was written as one clever regex
   * and both times `$` inside a lookahead under the /m flag (where `$` means
   * end-of-LINE, not end-of-string) made the lazy quantifier stop at the first
   * newline. In release() that cleared one lock of three; here it returned ONE lock
   * for a lane holding sixteen — a digest reporting a locked file as free, which is
   * the false-negative collision detector this whole rebuild exists to prevent.
   * Anchor on the HEADING, not the phrase: `Task: stop editing now buttons`
   * precedes the heading in the claim template. */
  const all = src.split(/\r?\n/);
  const head = all.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
  const body = [];
  if (head !== -1) {
    for (let i = head + 1; i < all.length; i += 1) {
      const t = all[i].trim();
      if (/^#{1,6}\s/.test(t)) break;            // next heading ends the section
      if (/^[A-Z][a-z]+ intent:/.test(t)) break; // "Next intent:" ends it
      body.push(all[i]);
    }
  }
  /* FORMAT-AGNOSTIC, and it has to be. Requiring a `- ` bullet made a real lane
   * parse to ZERO locks: the live claude.lane.md listed its locked paths inside a
   * fenced code block, so an entire locked directory tree was invisible to every
   * consumer. Agents also write `*`/`+` bullets, numbered lists and `- [ ]`
   * checkboxes. Accept any line, strip whatever list/fence decoration it carries,
   * and let the path-shape test below decide — that test is what keeps prose out,
   * so being liberal about decoration costs nothing.
   *
   * The path-shape test is load-bearing in the other direction: agents write prose
   * bullets in the lock section ("- I work in an isolated worktree and rebase onto
   * origin/main before each push,") which rendered verbatim under "DO NOT edit
   * these". It also drops the `(released)` / `(none declared yet)` placeholders
   * that release() and claim() write. An entry that cannot match a file path
   * cannot do a lock's job, and false locks are what train a reader to ignore the
   * digest. Trailing commentary is dropped: "docs/x.md (new, mine only)" → "docs/x.md". */
  const locks = body.map((l) => l.trim())
    .filter((l) => l && !/^```/.test(l))
    .map((l) => l
      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')   // bullet or numbered marker
      .replace(/^\[[ xX]\]\s*/, '')               // checkbox
      // Strip backticks only. `*` is NOT decoration here — it is glob syntax
      // (`docs/x/**`, `services/contentStudio*`), and stripping it silently
      // narrowed a directory-wide claim to a single nonexistent path. Markdown
      // bold like `**Nothing.**` survives this but is dropped by the path test.
      .replace(/`/g, '')
      .trim())
    // A bullet may list several comma-separated files ("- a.ts, b.ts").
    .flatMap((l) => l.split(','))
    .map((l) => l.trim().replace(/^["']|["']$/g, '').split(/\s+/)[0].replace(/[,;:]+$/, ''))
    /* Strip a fully-wrapped `**bold**` TOKEN. This has to run on the token, not the
     * line: `- **Nothing.** Every slice is pushed.` is not wrapped as a whole, but
     * its first token is — and because `*` is kept for globs, that token otherwise
     * passed the shape test and rendered as a lock. */
    .map((l) => l.replace(/^\*\*(.+?)\*\*$/, '$1'))
    .map((l) => l.replace(/^\.\//, ''))   // "./src/a.ts" never matched a repo-relative path
    .filter(Boolean)
    .filter((l) => !/^\(/.test(l))
    /* Shape test, plus two escape hatches. The shape test alone silently dropped
     * the BROADEST locks an agent can declare — `- docs`, `- backend`, and
     * crucially `- Dockerfile`, which is itself in the push hook's
     * executes-on-deploy list. The ledger would have reported "clear" on exactly
     * the files that trigger a production migration. Extensionless real paths are
     * admitted by an existence check when we know the repo root, and by a small
     * list of conventional extensionless files when we do not. Prose still fails
     * all three ("work", "isolated", "rebase" are neither paths nor files). */
    .filter((l) => /[/\\*]/.test(l)
      || /\.[A-Za-z0-9]{1,6}$/.test(l)
      || EXTENSIONLESS.has(l)
      || (root && existsSync(resolve(root, l))))
    .map((l) => l.slice(0, 120)); // lane files are untrusted input
  const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
    .filter((h) => !/EDITING NOW/i.test(h));
  const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
  return { locks, task: task.slice(0, 90) };
}

/** Every lane in the canonical ledger, with freshness from file mtime. */
export function readLanes(ledger, selfName = null) {
  if (!ledger || !existsSync(ledger)) return [];
  const root = resolve(ledger, '..', '..');
  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
    const path = resolve(ledger, file);
    const { locks, task } = parseLane(readFileSync(path, 'utf8'), root);
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
  const raw = normPath(lock).toLowerCase().replace(/^["']|["']$/g, '').replace(/^\.\//, '');
  if (raw.includes('*')) {
    /* Compile the glob rather than prefix-matching it. Prefix-only made
     * `src/*.js` lock the whole of `src/`, discarding the extension constraint —
     * an over-report, and over-reports are what get a digest ignored. `**`
     * crosses directory separators; a single `*` does not. */
    const esc = (lit) => lit.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const body = raw.split('**')
      .map((seg) => seg.split('*').map(esc).join('[^/]*'))
      .join('.*');
    return new RegExp(`^${body}(?:/.*)?$`).test(c);
  }
  const stem = raw.replace(/\/+$/, '');
  if (!stem) return false;
  return c === stem || c.startsWith(`${stem}/`);
}
