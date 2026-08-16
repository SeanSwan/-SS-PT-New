/**
 * recon/git.mjs -- read-only git primitives for the reconciliation engine.
 *
 * HARD RULE: nothing in this file mutates the repository. No merge, push,
 * rebase, checkout, branch -d, stash push, or reset. `git stash create` IS
 * permitted -- it writes a dangling commit object and leaves the working tree
 * and the stash list untouched (this distinction is load-bearing: the naive
 * `git stash` would disturb a live session).
 *
 * Every call is explicitly scoped. In particular NOTHING here reads
 * `%(upstream:track)` for decision-making -- see equivalence.mjs for why that
 * number is a category error rather than merely imprecise.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const REPO_ROOT = process.env.RECON_REPO_ROOT || process.cwd();

/** Run a git command. Returns {ok, stdout, stderr, code}. Never throws on git failure. */
export async function git(args, { maxBuffer = 32 * 1024 * 1024 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer,
      // Git Bash on Windows mangles <rev>:<path> and /refs/ style args without this.
      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
    });
    return { ok: true, stdout, stderr, code: 0 };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? String(err),
      code: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

/** Trimmed stdout, or null when the command failed. Distinguishes "empty" from "failed". */
export async function gitLine(args) {
  const r = await git(args);
  return r.ok ? r.stdout.trim() : null;
}

/** Non-empty trimmed lines, or null when the command failed. */
export async function gitLines(args) {
  const r = await git(args);
  if (!r.ok) return null;
  return r.stdout.split('\n').map((s) => s.trimEnd()).filter((s) => s.length > 0);
}

/**
 * Bounded-concurrency map. 409 refs x ~4 git calls each will exhaust process
 * handles if fired at once; sequential is far too slow. Default 12.
 */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function revParse(rev) {
  return gitLine(['rev-parse', '--verify', `${rev}^{commit}`]);
}

export async function mergeBase(a, b) {
  return gitLine(['merge-base', a, b]);
}

/** True when `ancestor` is reachable from `descendant` (i.e. fully contained). */
export async function isAncestor(ancestor, descendant) {
  const r = await git(['merge-base', '--is-ancestor', ancestor, descendant]);
  // exit 0 = yes, 1 = no, anything else = the question could not be answered
  if (r.code === 0) return true;
  if (r.code === 1) return false;
  return null;
}

/** [aheadOfBase, behindBase] measured EXPLICITLY against the given base ref. */
export async function aheadBehind(base, tip) {
  const out = await gitLine(['rev-list', '--left-right', '--count', `${base}...${tip}`]);
  if (!out) return null;
  const [behind, ahead] = out.split(/\s+/).map(Number);
  // left side = commits in base not in tip (we are BEHIND by that many)
  // right side = commits in tip not in base (we are AHEAD by that many)
  return Number.isFinite(ahead) && Number.isFinite(behind) ? { ahead, behind } : null;
}

/**
 * git cherry: '+' = patch not present upstream, '-' = equivalent patch found.
 * Returns {absent, present} counts, or null if the command failed.
 * IMPORTANT: an empty result with exit 0 legitimately means "nothing differs";
 * callers must not read an empty array as failure (this exact ambiguity produced
 * a false all-clear during design -- see the learning packet).
 */
export async function cherryCounts(upstream, head) {
  const r = await git(['cherry', upstream, head]);
  if (!r.ok) return null;
  let absent = 0;
  let present = 0;
  for (const line of r.stdout.split('\n')) {
    const c = line.trim()[0];
    if (c === '+') absent++;
    else if (c === '-') present++;
  }
  return { absent, present };
}

/** Two-dot diff: is the tree at `tip` identical to `base`? */
export async function treeIdentical(base, tip) {
  const r = await git(['diff', '--quiet', base, tip]);
  if (r.code === 0) return true;
  if (r.code === 1) return false;
  return null;
}

/** Files changed between merge-base and tip, with add/delete counts. */
/**
 * Files changed between merge-base and tip.
 *
 * `-z` is REQUIRED: with core.quotePath (default on) any path containing a byte
 * >= 0x80 is emitted C-quoted -- `docs/café.md` becomes `"docs/caf\303\251.md"`.
 * That mangled string would then be fed back as a pathspec and match NOTHING,
 * silently dropping the file from the content check and pushing the result
 * toward a false "content present" -> [ARCHIVE].
 *
 * `--no-renames` is REQUIRED: with rename detection on (default since 2.9),
 * --numstat emits `old => new` as a single field, so the real path is never
 * checked and the pathspec matches nothing. Same silent-under-match failure.
 */
export async function diffStat(base, tip) {
  const r = await git(['diff', '--numstat', '-z', '--no-renames', `${base}...${tip}`]);
  if (!r.ok) return null;

  // -z numstat format: "added\tdeleted\t" then NUL-terminated path.
  const parts = r.stdout.split('\0').filter((s) => s.length > 0);
  const files = [];
  let added = 0;
  let deleted = 0;
  for (const chunk of parts) {
    const m = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(chunk);
    if (!m) continue;
    added += m[1] === '-' ? 0 : Number(m[1]) || 0;
    deleted += m[2] === '-' ? 0 : Number(m[2]) || 0;
    if (m[3]) files.push(m[3]);
  }
  return { files, added, deleted, fileCount: files.length };
}

/** Unix seconds of the tip commit. */
export async function commitTime(rev) {
  const out = await gitLine(['log', '-1', '--format=%ct', rev]);
  const n = Number(out);
  return Number.isFinite(n) ? n : null;
}

export async function commitSubjects(base, tip, limit = 50) {
  const lines = await gitLines(['log', `--max-count=${limit}`, '--format=%s', `${base}..${tip}`]);
  return lines ?? [];
}

/**
 * Blob SHA of `path` at `rev`, or null when absent. '' distinguishes "the ref
 * has no such file" (a real answer) from null ("we could not ask").
 */
export async function blobAt(rev, path) {
  const r = await git(['rev-parse', `${rev}:${path}`]);
  if (!r.ok) {
    // "path does not exist in rev" is a legitimate answer, not a failure.
    if (/does not exist|exists on disk, but not in|unknown revision|fatal: path/i.test(r.stderr)) return '';
    return null;
  }
  return r.stdout.trim();
}

/**
 * EXACT content-presence test: is every file the branch changed already
 * byte-identical at `base`?
 *
 * This replaces `git apply --reverse --check`, which was CRITICALLY wrong --
 * `git apply` without --cached tests against the WORKING TREE, not against a
 * ref. Proven: with refs held constant, dirtying the working tree flipped the
 * answer. On a repo checked out 1900 commits behind with a dirty tree, every
 * reverse-apply verdict was computed against the wrong content, and the result
 * was not reproducible between runs.
 *
 * Comparing blob SHAs is exact, deterministic, ref-only, and checkout-independent.
 * Returns { present, checked, differing, indeterminate }.
 */
export async function contentPresentInBase(base, tip, files, { limit = 2000, batch = 150 } = {}) {
  if (!files || files.length === 0) return null;
  const subset = files.slice(0, limit);

  // TWO-DOT diff (base tip): lists files whose content differs between the two
  // TREES. Two-dot is essential -- three-dot diffs against the merge-base and
  // would report the branch's own changes even when they already landed.
  //
  // --literal-pathspecs is REQUIRED: pathspecs are globs by default, so
  // `env[prod].js` parses as a character class and matches everything EXCEPT
  // itself -- silent under-match with exit 0, producing a false "present" and
  // an [ARCHIVE] recommendation. A leading ':' is also pathspec magic.
  //
  // Batching is REQUIRED on Windows: CreateProcess caps the command line at
  // 32,767 chars. 1000 paths x ~40 chars blows past it, spawn fails, and the
  // branch can never be content-confirmed.
  const differing = new Set();
  for (let i = 0; i < subset.length; i += batch) {
    const chunk = subset.slice(i, i + batch);
    const r = await git([
      '--literal-pathspecs', 'diff', '--name-only', '-z', '--no-renames',
      base, tip, '--', ...chunk,
    ]);
    if (!r.ok) {
      return {
        present: false, checked: i, total: files.length,
        differing: null, differingSample: [],
        truncated: files.length > limit, failed: true,
      };
    }
    for (const p of r.stdout.split('\0')) if (p) differing.add(p);
  }

  return {
    // Claim presence only when nothing differs AND we saw the whole file set.
    present: differing.size === 0 && files.length <= limit,
    checked: subset.length,
    total: files.length,
    differing: differing.size,
    differingSample: [...differing].slice(0, 5),
    truncated: files.length > limit,
    failed: false,
  };
}
