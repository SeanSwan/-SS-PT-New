/**
 * citation.mjs — reading a CITED file, and the four things that must be true first.
 * ================================================================================
 * Split out of repo-io.mjs for the 300-line cap (CLAUDE.md rule 4). Unchanged by the move.
 *
 * R3 proves that the bytes in a fence match the bytes in a repo file at a line range. Rounds 7-9
 * established that the proof is worth nothing unless the FILE itself qualifies, so four conditions
 * gate every read, each added after an attack that needed one shell command:
 *   1. it exists
 *   2. it is not the packet or its seed        (self-citation byte-matches by construction)
 *   3. it is TRACKED by git                    (a cp/ln copy byte-matches itself just as well)
 *   4. it resolves INSIDE the repository       (a symlink otherwise launders any file on disk)
 *
 * @module packet-gate/citation
 */
import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { normPath } from './normalize.mjs';
import { GateUnavailable } from './unavailable.mjs';

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
/**
 * Is this path in a COMMIT — not merely in the index?
 *
 * ROUND-10 CRITICAL, found by attacking the round-9 diff before either reviewer returned.
 * `git ls-files` reports the INDEX, so `git add` alone satisfies it. The round-8 close ("a cited
 * file must be tracked") therefore cost exactly one extra command to route around:
 *
 *     cp packet.md cite.mjs && git add cite.mjs
 *
 * Two commands, no commit, no review, and the fabricated copy is "tracked" — byte-matching itself by
 * construction, exit 0, "all byte-verified". That is the fourth spelling of the same attack across
 * four rounds (self-cite -> hardlink -> copy -> staged copy), and each fix closed only the spelling
 * in front of it.
 *
 * `HEAD:<path>` is the property that actually means "this content has history". Staging is not
 * history: it is a local, uncommitted, unreviewed act by the same author writing the packet.
 *
 * NOTE: spawned via execFileSync with an argv array, NOT a shell — under Git Bash, MSYS path
 * conversion rewrites `HEAD:<path>` into a Windows path before git sees it and every lookup returns
 * a false negative. That gotcha is documented in this repo and has produced a false ABSENT before.
 */
function isCommitted(root, rel) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${rel}`], {
      cwd: root, stdio: 'ignore', env: { ...process.env, GIT_LITERAL_PATHSPECS: '1', MSYS_NO_PATHCONV: '1' },
    });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') throw new GateUnavailable('git not found — cannot verify that a cited file is committed');
    // THE CASE FALLBACK MUST APPLY HERE TOO, or the two round-10 fixes annihilate each other.
    // `isTracked` gained a case-insensitive fallback (git pathspecs are case-sensitive; APFS, NTFS
    // and WSL /mnt/c are not) and this check did not — so on those filesystems a wrong-case citation
    // passed tracking via the fold, failed here on the raw case, and surfaced as ESTAGED: "staged
    // but never committed", about a file that is committed and not staged at all. Neither fix was
    // wrong alone; together they produced a refusal whose text is simply false. Both reviewers found
    // the interaction independently. (Kimi K3 round 11 F2 / GLM-5.3 round 11 F2.)
    return committedUnderOtherCase(root, rel);
  }
}

/**
 * Does exactly ONE committed path match `rel` case-insensitively?
 *
 * Separate from the tracked fallback because "in the index" and "at HEAD" are different questions,
 * and conflating them is what produced the false ESTAGED above. Ambiguous matches are refused: two
 * committed files differing only in case (possible on ext4) leave the gate unable to say which one
 * the packet meant, and guessing between two real files is how the round-2 decoy worked.
 */
function committedUnderOtherCase(root, rel) {
  try {
    const out = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', path.posix.dirname(rel) || '.'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GIT_LITERAL_PATHSPECS: '1', MSYS_NO_PATHCONV: '1' },
    });
    const want = rel.toLowerCase();
    return out.split('\n').map((s) => s.trim()).filter((s) => s && s.toLowerCase() === want).length === 1;
  } catch {
    return false;
  }
}

/**
 * Case-insensitive fallback: is some tracked path the same file under a different case?
 *
 * Git pathspec matching is case-sensitive REGARDLESS of `core.ignorecase`, while default APFS, NTFS
 * and WSL `/mnt/c` are not — the exact filesystems rounds 6 and 7 fought over. So a citation typed
 * in the wrong case had `existsSync` true, R5 resolving, R4 binding via `foldCase`, and then the
 * newest check refusing EUNTRACKED with the remedy "commit the file first" — which is IMPOSSIBLE,
 * because it is committed, under another case. Three checks agreeing it is one file and a fourth
 * saying it has no provenance is the macOS false refusal that `foldCase` was built to remove,
 * reintroduced through a side door. (GLM-5.3 round 10, F4.)
 *
 * A unique fold-match counts as tracked; the existing `caseOnlyBinding` warning already declares the
 * case difference to the operator, so nothing is hidden. AMBIGUOUS matches (two tracked files
 * differing only in case, possible on ext4) are NOT accepted — the gate cannot tell which one the
 * packet meant, and guessing is how the round-2 decoy worked.
 */
function trackedUnderOtherCase(root, rel) {
  try {
    const out = execFileSync('git', ['ls-files', '--', path.posix.dirname(rel) || '.'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
    });
    const want = rel.toLowerCase();
    const hits = out.split('\n').map((s) => s.trim()).filter((s) => s && s.toLowerCase() === want);
    return hits.length === 1;
  } catch {
    return false;
  }
}

function isTracked(root, rel) {
  try {
    // GIT_LITERAL_PATHSPECS: `--` ends OPTION parsing but NOT pathspec magic, so a cited path whose
    // name begins with `:` was still interpreted — `:(glob)**` matched every tracked file in the
    // repo and reported an untracked copy as tracked. `badPath` rejects a leading `:` lexically
    // before we ever get here; this is the second layer, because the lexical check lives in a
    // different module and the two could drift. (Kimi K3 round 9, F1.)
    execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], {
      cwd: root, stdio: 'ignore', env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
    });
    return true;
  } catch (err) {
    // EXIT 1 IS "not tracked". ANYTHING ELSE IS "the check could not run" — the same distinction
    // makeResolver has drawn since round 1, and for the same reason: mapping every git failure to a
    // finding turns a broken tool, a wrong cwd, or a safe.directory refusal into "your file is
    // untracked" on EVERY cited block, which is a false-refusal machine and trains operators to
    // bypass the gate. It was inconsistent with its own sibling forty lines away.
    // (Kimi K3 round 9, F3.)
    if (err.code === 'ENOENT') throw new GateUnavailable('git not found — cannot verify that a cited file is tracked');
    if (err.status !== 1) throw new GateUnavailable(`git ls-files failed (${err.code ?? `exit ${err.status}`}) — cannot verify that a cited file is tracked`);
    return trackedUnderOtherCase(root, rel);
  }
}

/**
 * Is this path inside a submodule? True when an ANCESTOR directory is itself tracked — which, for a
 * directory, means git is tracking it as a gitlink. Diagnosis only; it never relaxes the check.
 */
function inSubmodule(root, rel) {
  const parts = String(rel).replaceAll('\\', '/').split('/');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const ancestor = parts.slice(0, i).join('/');
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', '--', ancestor], {
        cwd: root, stdio: 'ignore', env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
      });
      return true; // a tracked DIRECTORY entry is a gitlink
    } catch { /* not tracked at this level — keep walking up */ }
  }
  return false;
}

export function readCitedFile(root, rel, exclude = []) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return null;
  // SELF-CITATION IS CHECKED FIRST, because it is the more specific diagnosis and because the other
  // order produces a two-step refusal loop: an UNTRACKED self-citing packet was told "commit the
  // file first", and following that remedy converted the refusal into ESELFCITE. Two refusals for
  // one defect is exactly the refusal-fatigue ladder this gate is built to avoid. (Kimi K3 round 9.)
  if (isSelfCitation(root, abs, exclude)) {
    const e = new Error('a packet may not cite itself or its own seed — the comparison would be byte-identical by construction, which proves nothing');
    e.code = 'ESELFCITE';
    throw e;
  }
  // COMMITTED, not merely staged. `isTracked` (the index) is still consulted first because it gives
  // the better diagnosis for the common case — a genuinely untracked scratch file — while
  // `isCommitted` catches the staged-copy attack the index check cannot see.
  // NORMALIZED before it reaches git. `path.join` (the read), `normPath` (R4/R5/the CLI) and git
  // pathspecs disagree about spelling: git takes `src/./x.mjs` and `src/x.mjs/` literally and exits
  // 1, while every other layer collapses them. So a tracked file cited as `src/./x.mjs` bound under
  // R4, resolved under R5, READ successfully — and then refused EUNTRACKED. That is the round-6
  // "two spellings of one path" drift reborn in the newest check, inside the module whose shared
  // normalizer exists to prevent exactly it. (GLM-5.3 round 10, F5.)
  const gitRel = normPath(rel).replace(/\/+$/, '');
  if (isTracked(root, gitRel) && !isCommitted(root, gitRel)) {
    const e = new Error('cited file is staged but never committed — staging is not provenance');
    e.code = 'ESTAGED';
    throw e;
  }
  if (!isTracked(root, gitRel)) {
    // SUBMODULES get their own diagnosis. `git ls-files` in the superproject lists a submodule's
    // GITLINK, never the files inside it — so "review the vendored dependency we patch" was refused
    // with "commit the file first", which the operator cannot do in the superproject. An
    // unactionable remedy on a legitimate packet is the refusal-fatigue signature. The tracking
    // requirement is NOT relaxed for submodules (resolving them by running git from the file's own
    // directory would let anyone `git init` a subdirectory and mint their own "tracked" payload);
    // the operator is simply told the truth about why. (Kimi K3 round 9, F4.)
    const e = new Error('cited file is not tracked by git — an untracked file has no provenance to prove');
    e.code = inSubmodule(root, gitRel) ? 'ESUBMODULE' : 'EUNTRACKED';
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
  // THE BYTES COME FROM THE COMMIT, NOT THE WORKTREE. Round-11 critical, found independently by
  // BOTH reviewers, and the fifth spelling of one attack:
  //
  //   r7   cite the packet itself         -> closed by identity
  //   r8   `ln` / `cp` the packet         -> closed by inode, then "must be tracked"
  //   r10  `git add` without committing   -> closed by "must exist at HEAD"
  //   r11  COMMIT ONCE, THEN EDIT FREELY  -> every check above still passes
  //
  // `isCommitted` asks whether the PATH has history. It does. R3 then compared the fence body
  // against bytes read from the WORKTREE — which the packet's author had just rewritten. Verified:
  // commit `export const answer = 42`, replace the worktree copy with
  // `export function isAdmin(){ return true; }`, cite it, and R3 returned NO FINDING while the
  // committed blob still read `answer = 42`.
  //
  // Four rounds of fixes all asked about the FILE's status — is it this file, this inode, tracked,
  // committed — and never once about the BYTES' provenance. Asking "what property does this check
  // actually establish?" is what found round 7's hole too; it is the only question that has ever
  // produced a real close here.
  //
  // ACCEPTED COST, stated plainly: a packet reviewing UNCOMMITTED work is now refused. That is a
  // real and common workflow, and the remedy is one commit — which is also what makes the work
  // reviewable by anyone else — or `--allow-uncited` with the excerpt attached. It follows directly
  // from R3's claim, "provably extracted from the repo", which uncommitted bytes cannot satisfy.
  try {
    return execFileSync('git', ['show', `HEAD:${gitRel}`], {
      cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GIT_LITERAL_PATHSPECS: '1', MSYS_NO_PATHCONV: '1' },
    });
  } catch (err) {
    if (err.code === 'ENOENT') throw new GateUnavailable('git not found — cannot read the committed bytes of a cited file');
    const e = new Error('cited file could not be read from the commit');
    e.code = 'ENOBLOB';
    throw e;
  }
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
