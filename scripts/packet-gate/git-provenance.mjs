/**
 * git-provenance.mjs — the four git questions a cited file must answer.
 * =====================================================================
 * Split out of citation.mjs for the 300-line cap (CLAUDE.md rule 4). Unchanged by the move.
 *
 * Each of these exists because an attack got past the one before it, and each attack took exactly
 * one shell command to demonstrate:
 *   TRACKED   — a cp/ln copy of the packet is not          (round 8)
 *   COMMITTED —  alone is not                     (round 10)
 *   SAME CASE — git pathspecs are case-sensitive; APFS,    (round 10/11)
 *               NTFS and WSL /mnt/c are not
 *   SUBMODULE — the superproject tracks only a gitlink,    (round 9)
 *               so its files are invisible to ls-files
 *
 * @module packet-gate/git-provenance
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { GateUnavailable } from './unavailable.mjs';

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
export function isCommitted(root, rel) {
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
export function committedUnderOtherCase(root, rel) {
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
export function trackedUnderOtherCase(root, rel) {
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

export function isTracked(root, rel) {
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
export function inSubmodule(root, rel) {
  // ASK GIT WHAT THE ENTRY *IS*, not merely whether the path matches something.
  //
  // The premise "a tracked DIRECTORY entry is a gitlink" is false, and both round-12 reviewers found
  // it independently. `git ls-files --error-unmatch -- <dir>` succeeds for ANY directory containing
  // tracked files, because the pathspec matches those files — so every untracked file in a populated
  // subdirectory was diagnosed ESUBMODULE ("it lives inside a submodule") instead of EUNTRACKED.
  // Verified: an untracked file under scripts/packet-gate/ reported as a submodule.
  //
  // A gitlink is a tree entry with mode 160000. `ls-tree` reports the mode, which is the property
  // actually being asked about — the same "check what it IS, not what matches it" correction the
  // round-11 critical turned on. This is diagnosis only; it never relaxes the tracking requirement.
  const parts = String(rel).replaceAll('\\', '/').split('/');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const ancestor = parts.slice(0, i).join('/');
    try {
      const out = execFileSync('git', ['ls-tree', '-d', '--', ancestor], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
      });
      if (/^160000 commit /m.test(out)) return true;
    } catch { /* unreadable at this level — keep walking up */ }
  }
  return false;
}
