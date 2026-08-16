/**
 * repo-io.mjs — the gate's filesystem and git touchpoints, isolated.
 * ==================================================================
 * Split out of packet-gate.mjs for the 300-line cap (CLAUDE.md rule 4), and because these are the
 * only places the gate talks to the outside world. Keeping them together makes the failure question
 * — "did this checker actually run?" — answerable by reading one short file.
 *
 * The governing distinction, learned from two hostile reviews: a tool that FAILED is not the same
 * as a check that PASSED, and neither is the same as a premise that is a phantom. Everything here
 * either answers cleanly or raises GateUnavailable, which the CLI turns into exit 2.
 *
 * @module packet-gate/repo-io
 */
import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Raised when a checker cannot run at all (missing tool, unreadable input). Distinct from a
 *  refusal: exit 2, never exit 1, and never a silent pass. */
export class GateUnavailable extends Error {}

/**
 * Repo lookup for R5. Paths resolve on disk; routes and symbols must appear in TRACKED, NON-PROSE
 * content.
 *
 * MARKDOWN IS EXCLUDED ON PURPOSE. A premise must resolve in code, not in a description of code.
 * Verified during the hostile pass: two `/api/...` routes under docs/ (a client analytics summary
 * and an immigration study-sessions endpoint) appear ONLY in markdown and exist nowhere in the
 * implementation. Resolving against prose would let R5 bless exactly the phantom it exists to
 * catch — a route that was designed, written up, and never built. Documentation of intent is not
 * evidence of existence.
 *
 * NOTE: those routes are described here, never written literally. See the warning below — naming a
 * phantom in a comment is enough to make it resolve.
 *
 * `git grep` also restricts us to TRACKED files, so an untracked scratch file cannot vouch for a
 * premise either.
 *
 * NOTE for future maintainers: this MUST keep spawning git without a shell. Under Git Bash, MSYS
 * path conversion rewrites a leading-slash argument (`/api/sessions`) into a Windows path before
 * git sees it, and every route lookup silently returns "no hit" — turning R5 into a false-refusal
 * machine. `execFileSync` with an argv array bypasses the shell and is not affected. There is a
 * regression test pinning a real route to `true` precisely so this cannot rot back.
 */
/**
 * TESTS AND FIXTURES ARE EXCLUDED TOO, found the hard way. Once the test suite was committed, the
 * phantom route used in its own assertions began RESOLVING — `git grep` found it in a tracked
 * `.mjs` test file. R5 silently stopped catching the phantom it was written to catch, and the very
 * tests proving R5 works were what broke it. (Kimi K3 S8 / HY3 S4 named this class; the suite then
 * demonstrated it, twice.)
 *
 * ⚠ NEVER WRITE A PHANTOM ROUTE LITERALLY IN THIS REPO — not in a test, and NOT IN A COMMENT.
 * The second demonstration was this very file: a comment naming the example phantoms made them
 * resolve, so R5 went quiet and three tests failed. Describe them; never spell them. Tests build
 * their needles from fragments at runtime, the same way this repo tests secret scanners.
 *
 * A premise must resolve in IMPLEMENTATION. A route named only in a test, a fixture, or a comment
 * is not an implemented route. Residual limitation, accepted and documented: this remains a
 * substring match, so a route named in a comment in a non-test source file will still resolve.
 */
const RESOLUTION_EXCLUDES = [
  ':(exclude)*.md', ':(exclude)*.mdx', ':(exclude)*.txt',
  ':(exclude,glob)**/tests/**', ':(exclude,glob)**/__tests__/**',
  ':(exclude,glob)**/*.test.*', ':(exclude,glob)**/*.spec.*', ':(exclude,glob)**/fixtures/**',
];

export function makeResolver(root) {
  return (needle, kind) => {
    // A path anchor gets the same discipline as a cited path: `..` and absolute paths are rejected
    // outright rather than resolved. Cited blocks were guarded from the start; remit anchors were
    // not, so a remit naming `../../anything` resolved outside the repo and R5 blessed it
    // (Kimi K3 round 2, finding 6). One rule, both places.
    if (kind === 'path') {
      const n = String(needle).replaceAll('\\', '/');
      if (/^([A-Za-z]:)?\//.test(n) || n.split('/').includes('..')) return false;
      return existsSync(path.join(root, needle));
    }
    try {
      execFileSync('git', ['grep', '--quiet', '--fixed-strings', '--', needle, '--', ...RESOLUTION_EXCLUDES], { cwd: root, stdio: 'ignore' });
      return true;
    } catch (err) {
      // `git grep` exits 1 for "no match" and >1 (or ENOENT) for a real failure. Conflating them
      // meant a missing git, a wrong cwd, or a safe.directory refusal made EVERY route in EVERY
      // legitimate remit refuse — a false-refusal machine that trains operators to bypass the gate
      // (Kimi K3 S6.2, 2026-08-14). A broken tool is "cannot run", not "premise is a phantom".
      if (err.status === 1) return false;
      throw new GateUnavailable(`git grep failed (${err.code ?? `exit ${err.status}`}) — cannot verify premises`);
    }
  };
}

/** Secret/PII scan of the ASSEMBLED packet, via the repo's existing scanner in stdin mode.
 *  Fail-closed: if the scanner cannot run, we do not get to call the packet clean. */
export function scanSecrets(root, content) {
  try {
    execFileSync('bash', [path.join(root, 'scripts', 'scan-secrets.sh'), '--stdin'], {
      cwd: root, input: content, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8',
    });
    return { ok: true, lines: [] };
  } catch (err) {
    // Tool missing is NOT a hygiene hit — reporting it as R6 would refuse every legitimate packet
    // forever on a host without bash, and a permanently-refusing gate gets bypassed (Kimi K3 S6.1).
    // It is "the gate could not run": exit 2, with a fixable message.
    // 127 = "command not found" from the shell: bash exists but scan-secrets.sh does not. That used
    // to fall into the HIT branch, so every packet refused as R6 forever — a tooling failure
    // reported as a hygiene finding, which is precisely the confusion this module exists to prevent
    // (Kimi K3 round 2, finding 6).
    // ROUND 4: the test is now "did the scanner REPORT a hit", not "did anything go wrong".
    // scan-secrets.sh exits 1 for a hit, 0 for clean, and 2 for its own usage/argument errors. The
    // old mapping sent every status except 127 into the hit branch, so a crashed scanner, a bad
    // argument, or a permission error on a helper surfaced as `R6 secret/PII scan hit` and told the
    // operator to "sanitize the source document" when nothing was wrong with it. A tooling failure
    // reported as a hygiene finding is precisely the confusion this module exists to prevent — and
    // it is the failure mode that trains operators to bypass the gate. Anything that is not an
    // explicit hit is now "the gate could not run": exit 2, never a silent pass, never a false R6.
    if (err.status !== 1) return { unavailable: true, ok: false, lines: [] };
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    return { ok: false, lines: out ? out.split('\n').filter(Boolean).slice(0, 20) : ['scanner reported a hit (no detail captured)'] };
  }
}

/**
 * Read a cited file, refusing anything that resolves outside the repository.
 *
 * `badPath` in checks.mjs rejects `..` and absolute paths lexically, but `readFileSync` FOLLOWS
 * SYMLINKS: a symlink committed inside the repo and pointing anywhere on disk passes the lexical
 * check, gets read, and byte-matches itself — so R3 certifies attacker-chosen, non-repo content as
 * "the real artifact". That subverts the one mechanical guarantee this gate provides (HY3 round 2,
 * rank 3). Resolve the real path and require containment.
 *
 * Throws on I/O errors; checkProvenance turns that into an R3 refusal rather than a stack trace.
 */
/**
 * Paths a packet may never cite: the packet document itself, and its seed.
 *
 * THE ROUND-7 CRITICAL, and it stood unnoticed through six rounds of hostile review because every
 * one of them attacked the CHECKS rather than what R3 actually proves. R3 proves "these bytes exist
 * in a repo file at this line range" — NOT "these bytes are the source they claim to be." A packet
 * living under ROOT can therefore cite ITSELF, at the exact line range its own fabricated fence body
 * occupies, and the comparison is byte-identical BY CONSTRUCTION.
 *
 * Verified, not theorised: a two-fence packet (one real block to satisfy R4, one self-citing block
 * containing `export function isAdmin(){ return true; }`) reached `PACKET READY`, exit 0, and the
 * approval view printed "2 cited block(s), all byte-verified against the repo [ok]". The gate's one
 * invariant, defeated with no repo write and no clever input — the fabricated code wore the gate's
 * own verification claim. (GLM-5.3 round 7, F1.)
 *
 * The general form is wider than the self-cite: citing ANY in-repo prose file that contains the
 * fabricated text launders identically. That variant requires the attacker to first commit their
 * payload into a repo file, which is a far higher bar and is what code review is for. The self-cite
 * needs nothing but the document the operator is already writing, so it is the one closed here.
 */
function isSelfCitation(root, abs, exclude) {
  // INODE FIRST, path second. `realpathSync` canonicalises a PATH, not a FILE — and a hardlink is a
  // second directory entry for the same bytes, which canonicalises to its own name. So
  // `ln packet.md cite.md` (one shell command, no commit, no repo change) defeated a pure realpath
  // comparison and reproduced the round-7 critical exactly: cite the link, R3 byte-matches by
  // construction, exit 0, "all byte-verified". The round-7 fix had closed only the narrowest
  // spelling of the attack. (Kimi K3 round 8, F1.)
  //
  // `dev`+`ino` is the identity test realpath is not. It also closes the win32 8.3 short-name
  // variant (`PACKET~1.MD`), which realpath does not expand — flagged by Kimi as probable and not
  // executable from its side; the inode comparison makes the question moot either way.
  // Some filesystems report ino 0; realpath equality stays as the fallback for those.
  let self = null;
  try { self = statSync(abs); } catch { /* fall through to path comparison */ }

  for (const other of exclude) {
    if (!other) continue;
    try {
      if (self && self.ino) {
        const o = statSync(other);
        if (o.ino === self.ino && o.dev === self.dev) return true;
      }
      if (realpathSync(abs) === realpathSync(other)) return true;
    } catch { /* unreadable — fall through to the normal checks */ }
  }
  return false;
}

/**
 * Is this path TRACKED by git?
 *
 * THE ACTUAL CLOSE FOR THE SELF-CITATION CLASS, and both round-8 reviewers arrived at it
 * independently after round 7's identity-based exclusion proved to be the narrowest possible fix.
 *
 * Round 7 stopped a packet citing ITSELF. Round 8 showed that costs one command to route around:
 *   - `ln packet.md cite.mjs`  — same inode, different name (Kimi F1; closed by the inode check)
 *   - `cp packet.md cite.mjs`  — DIFFERENT inode, different realpath, so identity comparison of any
 *     kind misses it entirely, and the copy contains the payload at the cited lines by construction
 *     (GLM F1). No commit, no repo content, no cleverness.
 *
 * Identity was the wrong axis. The real property R3 needs is not "this is not the document" but
 * "these bytes are IN THE REPOSITORY" — and a scratch copy the author just made is not, however
 * many times it byte-matches itself. `git ls-files --error-unmatch` is the same tracked-only
 * discipline `makeResolver` already applies to R5 premises, where an untracked scratch file has
 * never been allowed to vouch for anything.
 *
 * ACCEPTED COST, stated: citing a brand-new file that has not been committed yet is now refused.
 * That is a real workflow ("review the file I just wrote"), and the remedy is one commit or
 * `--allow-uncited`. It is the correct trade — R3's whole claim is provenance, and a file with no
 * history has none. R5 has worked this way since round 1 without complaint.
 */
function isTracked(root, rel) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], { cwd: root, stdio: 'ignore' });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') throw new GateUnavailable('git not found — cannot verify that a cited file is tracked');
    return false;
  }
}

export function readCitedFile(root, rel, exclude = []) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return null;
  if (!isTracked(root, rel)) {
    const e = new Error('cited file is not tracked by git — an untracked file has no provenance to prove');
    e.code = 'EUNTRACKED';
    throw e;
  }
  if (isSelfCitation(root, abs, exclude)) {
    const e = new Error('a packet may not cite itself or its own seed — the comparison would be byte-identical by construction, which proves nothing');
    e.code = 'ESELFCITE';
    throw e;
  }
  const realRoot = realpathSync(root);
  const real = realpathSync(abs);
  // Case-fold on win32: NTFS is case-insensitive, so a differently-cased but identical path would
  // otherwise be judged "outside" and refuse a legitimate citation (Kimi K3 round 3, M3).
  const fold = (v) => (process.platform === 'win32' ? v.toLowerCase() : v);
  const inside = fold(real) === fold(realRoot) || fold(real).startsWith(fold(realRoot + path.sep));
  if (!inside) {
    const e = new Error('resolves outside the repository (symlink)');
    e.code = 'EOUTSIDE';
    throw e;
  }
  return readFileSync(abs, 'utf8');
}

export function loadSelftest(root) {
  const f = path.join(root, 'out', 'packet-gate', 'selftest.json');
  if (!existsSync(f)) return null;
  // An unparseable record is treated as ABSENT, so R15 refuses rather than reading a corrupt file.
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
}


/**
 * Is `abs` inside `root`? ONE predicate for every channel.
 *
 * `readCitedFile` had it for cited paths and `loadSeed` grew its own copy for the seed, while the
 * DOCUMENT — the largest channel — had none: `--document ../../elsewhere.md` was read, measured,
 * scanned and printed into the send command. Same property, three call sites, two implementations
 * and one omission. Both round-7 reviewers found the asymmetry independently.
 */
export function within(root, abs) {
  try {
    const realRoot = realpathSync(root);
    const real = realpathSync(abs);
    const fold = (v) => (process.platform === 'win32' ? v.toLowerCase() : v);
    return fold(real) === fold(realRoot) || fold(real).startsWith(fold(realRoot + path.sep));
  } catch {
    return false; // unresolvable → not provably inside → fail closed
  }
}
