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
  /* SESSION discriminator, not just worktree. agent+worktree alone meant two
   * concurrent sessions in the SAME worktree shared one lane file — and the main
   * tree is the common case, so this quietly recreated the last-writer-wins
   * clobbering that this naming scheme exists to prevent, in the one place
   * concurrency is most likely. The doc promised "one lane per SESSION"; without
   * this it delivered one lane per worktree. Falls back to the old shape when no
   * session id is available, which is no worse than before. */
  const sid = process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID || '';
  const sess = sid ? `-s${sid.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}` : '';
  return {
    agent,
    top: normPath(top || cwd),
    isMain,
    slug: `${slug}${sess}`,
    laneName: `${agent}--${slug}${sess}.lane.md`,
  };
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
  /* A lane declares its own worktree; use it as a second root for existence checks. */
  const altRoot = (src.match(/^Worktree:\s*(\S+)/m) || [])[1] || null;
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
    /* The section ends at a heading of the SAME OR HIGHER level, not at ANY
     * heading. Breaking on any `#` meant a lane that groups its locks under
     * sub-headings — `## EDITING NOW` / `### backend` / `- a.ts` — parsed to ZERO
     * locks, the whole section invisible. Sub-headings are structure WITHIN the
     * section, not the end of it. */
    const level = (all[head].match(/^#+/) || ['#'])[0].length;
    for (let i = head + 1; i < all.length; i += 1) {
      const t = all[i].trim();
      const m = t.match(/^(#{1,6})\s/);
      if (m && m[1].length <= level) break;      // same-or-higher heading ends it
      if (/^[A-Z][a-z]+ intent:/.test(t)) break; // "Next intent:" ends it
      body.push(all[i]);
    }
  }
  /* FORMAT-AGNOSTIC, because requiring a specific bullet made a real lane parse to
   * ZERO locks: the live claude.lane.md listed its paths inside a fenced code block.
   * Accept any line, strip list decoration, then decide per line.
   *
   * QUOTED SEGMENTS ARE EXTRACTED FIRST. Splitting on whitespace before honouring
   * quotes tore "backend/migrations/014 add col.sql" into three tokens and kept
   * "backend/migrations/014" — a path that exists nowhere, so the lock could never
   * match. That directly undid the push hook's core.quotePath=false fix: git was
   * finally emitting space-bearing migration paths and the parser could not
   * represent them.
   *
   * SPLITTING IS CONDITIONAL. Splitting every line picks up b.ts from "- a.ts b.ts"
   * but also turns origin/main inside a sentence into a lock. So a line becomes a
   * LIST only when every token is path-shaped; otherwise it is one path plus
   * commentary, and only when the remainder LOOKS like commentary — parenthesised,
   * dashed, or a single trailing word. "- origin/main is my upstream" is prose and
   * yields nothing. */
  const clean = (t) => t.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[,;:]+$/, '')
    // Markdown bold ONLY. `**/migrations/**` is a valid glob and must survive, so
    // refuse to unwrap when the inner text carries path or glob syntax.
    .replace(/^\*\*(.+?)\*\*$/, (m, inner) => (/[\/\\*]/.test(inner) ? m : inner))
    .replace(/^\.\//, '');
  const pathish = (t) => Boolean(t)
    && !/^\(/.test(t)
    && (/[/\\*]/.test(t)
      || /\.[A-Za-z0-9]{1,6}$/.test(t)
      || EXTENSIONLESS.has(t)
      /* Try the lane's own worktree as well as the main tree. The escape hatch
       * that admits extensionless locks (`Dockerfile`, `backend`) resolved only
       * against the main checkout, so a brand-new extensionless file living in a
       * linked worktree failed the test and was dropped — an under-report, in a
       * repo with ~110 worktrees. */
      || (root && existsSync(resolve(root, t)))
      || (altRoot && existsSync(resolve(altRoot, t))));
  /* Bracketed comments are the real convention in these lanes — "(all)",
   * "(whole directory)". A dash is NOT reliable: prose such as
   * "audit-write-paths.mjs — those belong to the other branch" starts with one and
   * is a sentence, not an annotation, so it minted a lock for a file the lane was
   * explicitly disclaiming. Dashes count only when the remainder is short. */
  const bracketed = /^[([{#]|^\/\//;
  const dashed = /^(?:[—–]|-{1,2}\s)/;

  const locks = body.map((l) => l.trim())
    .filter((l) => l && !/^[`]{3}/.test(l))
    .map((l) => l
      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')
      .replace(/^\[[ xX]\]\s*/, '')
      .replace(/[`]/g, '')
      .trim())
    .flatMap((line) => {
      /* Tokenize IN PLACE. The previous version hoisted quoted runs to the front,
       * so `- backend/a.ts "do not touch"` put the note at toks[0], failed the
       * path test and dropped a real lock — and a quoted path followed by a plain
       * note was rejected too, which is precisely the shape quoted extraction was
       * added to support. Order is preserved here, and QUOTING IS TREATED AS AN
       * EXPLICIT LOCK SIGNAL: someone who quotes a path meant it as a path. */
      const raw = [];
      const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
      let mt;
      while ((mt = re.exec(line)) !== null) {
        const quotedTok = mt[1] ?? mt[2];
        if (quotedTok !== undefined) raw.push({ text: quotedTok, quoted: true });
        else for (const piece of mt[3].split(',')) raw.push({ text: piece, quoted: false });
      }
      const toks = raw.map((t) => ({ ...t, text: clean(t.text) })).filter((t) => t.text);
      if (!toks.length) return [];
      if (toks.every((t) => pathish(t.text))) return toks.map((t) => t.text);
      if (!pathish(toks[0].text)) return [];
      if (toks[0].quoted) return [toks[0].text];   // deliberate quoting = deliberate lock
      const rest = toks.slice(1).map((t) => t.text);
      const ok = rest.length <= 1
        || bracketed.test(rest[0])
        || (dashed.test(rest[0]) && rest.length <= 4);
      return ok ? [toks[0].text] : [];
    })
    .map((t) => t.slice(0, 120));                           // lane files are untrusted input
  const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
    .filter((h) => !/EDITING NOW/i.test(h));
  const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
  /* Scope `idle` to the SAME section the locks came from, and anchor the match.
   * It was computed against the whole file while locks come from the first
   * EDITING NOW section, so a hand-edited lane whose OLD entry said "Status: idle"
   * suppressed the locks of its NEW entry. Unifying all three consumers on
   * activeLocks turned that from one reader disagreeing into a simultaneous,
   * silent, three-channel suppression of live locks — including the push-time
   * clash warning, the only signal that fires at the moment of irreversibility.
   * Two defensible fixes, worse together than either alone. */
  /* The governing Status is the one inside the SAME entry block: between the
   * nearest preceding heading of same-or-higher level and this section. Taking
   * merely the nearest preceding Status still read a sibling entry's status — in a
   * lane whose earlier "## DONE" block said idle, the live locks of the current
   * block were still suppressed. A block with no Status of its own is not idle. */
  /* The governing Status comes from the section's OWN body, or failing that from
   * the enclosing parent preamble — never from a SIBLING section. A lane whose
   * earlier "## DONE" block said idle was suppressing the live locks of its current
   * block, because the nearest preceding Status belonged to the sibling. A block
   * with no Status of its own, under a parent that declares none, is not idle. */
  const lvl = head === -1 ? 1 : (all[head].match(/^#+/) || ['#'])[0].length;
  const headingLevel = (l) => { const m2 = l.match(/^(#{1,6})\s/); return m2 ? m2[1].length : 0; };
  let scope;
  if (head === -1) {
    scope = all;
  } else {
    const own = body.filter((l) => /^Status:/i.test(l.trim()));
    if (own.length) {
      scope = own;
    } else {
      // Walk back to the nearest STRICTLY higher-level heading (the parent).
      let parent = -1;
      for (let i = head - 1; i >= 0; i -= 1) {
        const hl = headingLevel(all[i]);
        if (hl && hl < lvl) { parent = i; break; }
      }
      // The parent preamble ends at its first child heading of level <= lvl.
      let stop = head;
      for (let i = parent + 1; i < head; i += 1) {
        const hl = headingLevel(all[i]);
        if (hl && hl <= lvl) { stop = i; break; }
      }
      scope = all.slice(parent + 1, stop);
    }
  }
  const statusLine = scope.map((l) => l.trim()).find((l) => /^Status:/i.test(l));
  const idle = Boolean(statusLine) && /^Status:\s*(idle|released|done)\s*$/i.test(statusLine);
  return { locks, idle, task: task.slice(0, 90) };
}

/** What a lane is holding RIGHT NOW — the question every consumer actually asks.
 *
 *  This exists because the two consumers disagreed. `digest` applied the idle check
 *  (a lane declaring `Status: idle` holds nothing, whatever its body still says)
 *  while the push hook called `parseLane` directly and did not — so a released lane
 *  was invisible in the digest yet still produced a lock-clash warning on push. A
 *  writer and a reader disagreeing about the same format produced the two worst bugs
 *  in this module already; one definition is the only fix that stays fixed.
 *
 *  Deliberately NOT folded into `parseLane`: release() verifies its own work by
 *  re-parsing the cleared text, and that text says `Status: idle`, so an idle-aware
 *  parse would return [] and make the verification vacuously pass. release() needs
 *  the RAW parse; everyone else needs this. */
export function activeLocks(src, root = null) {
  const { locks, idle } = parseLane(src, root);
  return idle ? [] : locks;
}

/** Every lane in the canonical ledger, with freshness from file mtime. */
export function readLanes(ledger, selfName = null) {
  if (!ledger || !existsSync(ledger)) return [];
  const root = resolve(ledger, '..', '..');
  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
    const path = resolve(ledger, file);
    const raw = readFileSync(path, 'utf8');
    const { locks, idle, task } = parseLane(raw, root);
    return {
      file,
      self: file === selfName,
      ageMin: Math.round((Date.now() - statSync(path).mtimeMs) / 60000),
      locks: idle ? [] : locks,
      idle,
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
    /* Only `**` may cross a directory boundary. The unconditional `(?:/.*)?` made
     * `src/*` match `src/foo/bar`, silently widening a single-level claim into the
     * whole subtree — an over-report, and over-reports are what teach a reader to
     * ignore the digest. A trailing subtree match is allowed only when the pattern
     * actually asked for one. */
    const subtree = raw.includes('**') || raw.endsWith('/');
    return new RegExp(`^${body}${subtree ? '(?:/.*)?' : ''}$`).test(c);
  }
  const stem = raw.replace(/\/+$/, '');
  if (!stem) return false;
  return c === stem || c.startsWith(`${stem}/`);
}
