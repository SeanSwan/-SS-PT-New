/**
 * recon/inventory.mjs -- Phase 0 census. Every place work can hide.
 *
 * Read-only. The working-tree snapshot uses `git stash create`, which writes a
 * dangling commit object and leaves the tree AND the stash list untouched.
 * Plain `git stash` would disturb a live session and is forbidden here --
 * one panel model proposed exactly that and it was rejected.
 */

import { git, gitLines, commitTime } from './git.mjs';

export const KIND = {
  BRANCH: 'branch',
  WORKTREE: 'worktree',
  STASH: 'stash',
  WORKING_TREE: 'working-tree',
};

/**
 * All local branches with their tip, last-commit time, and the UNTRUSTED
 * upstream:track figure. That figure is carried for display only so the report
 * can show the correction; it never reaches classification or ranking.
 */
export async function listBranches() {
  const fmt = '%(refname:short)%09%(objectname)%09%(committerdate:unix)%09%(upstream)%09%(upstream:track)';
  const lines = await gitLines(['for-each-ref', `--format=${fmt}`, 'refs/heads']);
  // Returning [] on failure would render "we could not enumerate branches" as
  // "there are no branches" -- a success-shaped empty report. Throw instead.
  if (lines === null) throw new Error('recon: could not enumerate refs/heads (git for-each-ref failed)');
  return lines.map((line) => {
    const [name, tip, ts, upstream, track] = line.split('\t');
    let untrustedAhead = null;
    if (track) {
      const m = /ahead (\d+)/.exec(track);
      if (m) untrustedAhead = Number(m[1]);
    }
    return {
      kind: KIND.BRANCH,
      id: `branch:${name}`,
      ref: name,
      tip,
      lastCommitAt: Number(ts) || null,
      hasUpstream: Boolean(upstream),
      untrustedAhead,
      untrustedTrack: track || '',
    };
  });
}

/** Linked worktrees -- a branch checked out in one is IN FLIGHT, not stranded. */
export async function listWorktrees() {
  const r = await git(['worktree', 'list', '--porcelain']);
  // Returning [] here disarms the ACTIVE_LANE guard silently: no branch gets
  // marked inWorktree, so a branch someone is actively working in can be
  // classified LANDED and printed [ARCHIVE]. Same bug class as D7/D9.
  if (!r.ok) { const e = []; e.failed = true; return e; }
  const out = [];
  let cur = {};
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur.path) out.push(cur);
      cur = { path: line.slice(9).trim() };
    } else if (line.startsWith('branch ')) {
      cur.branch = line.slice(7).trim().replace('refs/heads/', '');
    } else if (line.startsWith('HEAD ')) {
      cur.head = line.slice(5).trim();
    } else if (line.trim() === 'detached') {
      cur.detached = true;
    }
  }
  if (cur.path) out.push(cur);
  return out.map((w) => ({ kind: KIND.WORKTREE, id: `worktree:${w.path}`, ...w }));
}

export async function listStashes() {
  const lines = await gitLines(['stash', 'list', '--format=%gd%09%H%09%ct%09%gs']);
  // [] on failure would assert "no stashes" when we could not look.
  if (lines === null) { const e = []; e.failed = true; return e; }
  return lines.map((line) => {
    const [selector, sha, ts, subject] = line.split('\t');
    return {
      kind: KIND.STASH,
      id: `stash:${selector}`,
      ref: selector,
      tip: sha,
      lastCommitAt: Number(ts) || null,
      subject: subject || '',
    };
  });
}

/**
 * The working tree as ONE item, never N files. `git stash create` produces a
 * preservation pointer with zero mutation; if there is nothing to stash it
 * returns empty, which is the correct "clean tree" signal.
 */
export async function snapshotWorkingTree() {
  const porcelain = await gitLines(['status', '--porcelain']);

  // CRITICAL distinction: null means `git status` FAILED (index lock held by a
  // parallel agent is routine in this repo). Coercing null to [] reported a
  // CLEAN TREE on failure -- the report would state there is no uncommitted
  // work when we simply could not look. That is the single most dangerous
  // silent failure in the engine: it under-reports unaudited surface area.
  if (porcelain === null) {
    return {
      kind: KIND.WORKING_TREE,
      id: 'working-tree',
      dirty: null,                 // UNKNOWN, not false
      statusFailed: true,
      fileCount: null,
      dirs: [],
      snapshotSha: null,
      snapshotStatus: 'FAILED: git status could not be read — working-tree state UNKNOWN',
    };
  }

  const entries = porcelain;
  if (entries.length === 0) {
    return {
      kind: KIND.WORKING_TREE, id: 'working-tree', dirty: false,
      statusFailed: false, fileCount: 0, dirs: [], snapshotSha: null,
      snapshotStatus: 'clean',
    };
  }

  // Directory-level summary only -- never a file list in a committed report.
  const dirCounts = new Map();
  for (const e of entries) {
    const path = e.slice(3);
    const dir = path.includes('/') ? path.split('/').slice(0, 2).join('/') : '(root)';
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }
  const dirs = [...dirCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([dir, n]) => ({ dir, n }));

  // READ-ONLY snapshot: dangling commit, tree and stash list untouched.
  //
  // `git stash create` can FAIL (index lock held by a parallel agent, permission
  // error, "could not write index"). A failure must never be reported the same
  // way as "clean tree, nothing to snapshot" -- that renders a preservation
  // failure as reassuring silence. Distinguish the three outcomes explicitly.
  const stash = await git(['stash', 'create']);
  const sha = stash.ok ? stash.stdout.trim() : '';
  let snapshotStatus;
  if (!stash.ok) {
    snapshotStatus = `FAILED: ${(stash.stderr || 'unknown error').split('\n')[0].slice(0, 120)}`;
  } else if (!sha) {
    // ok + empty is legitimate: `stash create` ignores untracked-only changes.
    const trackedDirty = entries.some((e) => !e.startsWith('??'));
    snapshotStatus = trackedDirty
      ? 'FAILED: stash create returned empty despite tracked modifications'
      : 'none needed (untracked files only — nothing tracked to snapshot)';
  } else {
    snapshotStatus = 'ok';
  }

  return {
    kind: KIND.WORKING_TREE,
    id: 'working-tree',
    dirty: true,
    fileCount: entries.length,
    untrackedCount: entries.filter((e) => e.startsWith('??')).length,
    dirs,
    snapshotSha: sha || null,
    snapshotStatus,
  };
}

/** Branch names with an active lane lock -- these are in flight and untouchable. */
export async function activeLaneRefs(laneDir) {
  const { readdir, readFile } = await import('node:fs/promises');
  const active = new Set();
  active.unreadable = false;
  try {
    const files = await readdir(laneDir);
    const now = Date.now();
    for (const f of files) {
      if (!f.endsWith('.lane.md')) continue;
      const body = await readFile(`${laneDir}/${f}`, 'utf8');
      const upd = /Updated:\s*(.+)/i.exec(body);
      if (upd) {
        const t = Date.parse(upd[1].trim());
        // A lane older than 2h is advisory only (repo rule R5: never silently seize).
        if (Number.isFinite(t) && now - t > 2 * 60 * 60 * 1000) continue;
      }
      const br = /branch\s+([^\s·|]+)/i.exec(body);
      if (br) active.add(br[1].trim());
    }
  } catch (err) {
    // ONLY "the directory isn't there" is benign. EACCES/EMFILE/corrupt reads
    // would otherwise silently disarm the in-flight guard.
    if (err?.code !== 'ENOENT' && err?.code !== 'ENOTDIR') active.unreadable = true;
  }
  return active;
}

export async function census({ laneDir }) {
  const [branches, worktrees, stashes, workingTree, lanes] = await Promise.all([
    listBranches(), listWorktrees(), listStashes(), snapshotWorkingTree(), activeLaneRefs(laneDir),
  ]);

  const worktreeBranches = new Set(worktrees.map((w) => w.branch).filter(Boolean));
  for (const b of branches) {
    b.inWorktree = worktreeBranches.has(b.ref);
    b.laneLocked = lanes.has(b.ref);
  }

  return {
    branches, worktrees, stashes, workingTree,
    laneLockedRefs: [...lanes],
    degraded: {
      worktrees: worktrees.failed === true,
      stashes: stashes.failed === true,
      lanes: lanes.unreadable === true,
      status: workingTree.statusFailed === true,
    },
  };
}

export { commitTime };
