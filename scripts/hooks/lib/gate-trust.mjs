/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-trust.mjs
 * PURPOSE: Trust-root and git resolution — the two inputs an adversary attacked
 *          most cheaply. Split out of gate-common.mjs after the GLM-5.3 hostile
 *          review found both CRITICALs living here.
 * AUTHOR: Opus 5 | CREATED: 2026-08-16 | FIXES: GLM Q1 (CRITICAL), Q10a (CRITICAL)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS. Two confirmed exploits, both one command, both against
 * code that had already survived two hostile reviews:
 *
 *   Q1  — `SWAN_GATE_ROOT=/tmp/trust git commit` relocated EVERY trust path
 *         (telemetry, counter, lock, session anchor, disable markers) into a
 *         directory the examinee had just built. Verified 2026-08-16: one env
 *         var moved all five.
 *   Q10a — `GIT_DIR=/tmp/fakerepo` made `headSha()` return a sha the examinee
 *         chose, EVEN THOUGH the call passes `-C <cwd>`. Verified 2026-08-16:
 *         headSha returned the fake repo's HEAD. This defeats amendment A2 at
 *         its root, because A2's whole claim is that the trust side recomputes
 *         HEAD independently. It does not, if the adversary owns the env.
 *
 * THE RULE THIS ENCODES: **environment variables are adversary-controlled
 * input, not configuration.** The examinee is an AI agent that spawns the shell
 * that invokes the hook, so it owns `process.env` wholesale. Anything the trust
 * path reads from env is a value the examinee chose. Test seams therefore move
 * to in-process setters: a spawned process cannot reach module state, but it can
 * always reach inherited env.
 *
 * HONEST RESIDUAL — read before trusting this file. `PATH` still selects the
 * `git` binary. A shim earlier in PATH returns any sha the examinee wants, and
 * stripping GIT_* does not touch that. `setGitBinary()` lets a hook pin an
 * absolute path recorded at install time, which is the real mitigation; the
 * default remains bare `git` because pinning must be done by the installer, not
 * guessed here. A same-privilege adversary is not defeated by any of this — see
 * the file footer for what actually would.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Derived from this file's own location — the one root the examinee cannot re-point. */
export const DEFAULT_ROOT = resolve(HERE, '..', '..', '..');

let gateRootOverride = null;
let disableRootOverride = null;
let gitBinary = 'git';

/**
 * Retarget the gate root. **Tests and privileged hook installers only.**
 *
 * This replaces `SWAN_GATE_ROOT`. It is deliberately NOT env-backed: the whole
 * point of Q1's fix is that a value the examinee can set is not a value the
 * trust path may read. Pass `null` to restore the default.
 */
export function setGateRoot(dir) {
  gateRootOverride = dir === null || dir === undefined ? null : resolve(dir);
  return gateRootOverride;
}

/** Retarget the disable-marker root. Tests and privileged hook installers only. */
export function setDisableRoot(dir) {
  disableRootOverride = dir === null || dir === undefined ? null : resolve(dir);
  return disableRootOverride;
}

/** Pin an absolute `git` path. Hook installers only — mitigates the PATH residue. */
export function setGitBinary(path) {
  gitBinary = path || 'git';
  return gitBinary;
}

export function gateRoot() { return gateRootOverride ?? DEFAULT_ROOT; }

/**
 * Git environment variables that redirect what "the repository" means. Stripping
 * these is what closes Q10a. `GIT_DIR` alone is sufficient to forge HEAD.
 */
export const HOSTILE_GIT_ENV = Object.freeze([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_CEILING_DIRECTORIES',
  'GIT_NAMESPACE',
  'GIT_CONFIG',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_SYSTEM',
]);

/** Env vars that relocate the gate's own trust root. Honored nowhere; stripped at entry. */
export const HOSTILE_GATE_ENV = Object.freeze([
  'SWAN_GATE_ROOT',
  'SWAN_DISABLE_ROOT',
  'SWAN_GATE_SESSION_ID',
]);

/** A copy of `env` with the repository-redirecting git vars removed. */
export function gitSafeEnv(env = process.env) {
  const clean = { ...env };
  for (const key of HOSTILE_GIT_ENV) delete clean[key];
  return clean;
}

/**
 * Strip adversary-controlled trust vars from this process. **Call once at the
 * top of every hook entry point**, before anything reads state. Returns the list
 * that was actually present, so a hook can telemeter the attempt rather than
 * silently cleaning up after it — an attempted relocation is a signal, not noise.
 */
export function sanitizeGateEnv(env = process.env) {
  const found = [];
  for (const key of [...HOSTILE_GATE_ENV, ...HOSTILE_GIT_ENV]) {
    if (Object.prototype.hasOwnProperty.call(env, key)) { found.push(key); delete env[key]; }
  }
  return found;
}

/**
 * Current HEAD sha, or null.
 *
 * `env: gitSafeEnv()` is load-bearing, not hygiene — without it `GIT_DIR` picks
 * the repository and the returned sha is the examinee's choice (Q10a, verified).
 * `exec` is injectable so the empty-output branch stays testable.
 */
export function headSha(cwd = gateRoot(), { exec = execFileSync, env = gitSafeEnv() } = {}) {
  try {
    const out = exec(gitBinary, ['-C', cwd, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env,
    });
    return String(out).trim() || null; // '' is falsy but poisons `sha === null` checks
  } catch {
    return null;
  }
}

/**
 * Session id from the harness, or null. Null means UNKNOWN — never invent one.
 * `SWAN_GATE_SESSION_ID` was removed: an examinee-settable session id lets the
 * agent mint a new "session" whenever the current one has inconvenient history.
 * The harness variable is the only source.
 */
export function sessionId() {
  return process.env.CLAUDE_SESSION_ID || null;
}


/*
 * Every gate path derives from the root above, so they live here rather than in
 * gate-common: a reader auditing "what can the examinee move?" sees the root,
 * the git resolution, and the paths in one file instead of three.
 */
export function qaDir() { return join(gateRoot(), '.ai-workflow', 'qa'); }
export function coordDir() { return join(gateRoot(), '.ai-workflow', 'coordination'); }
export function telemetryPath() { return join(qaDir(), 'gate-telemetry.jsonl'); }
export function counterPath() { return join(coordDir(), 'review-counter.json'); }
export function counterLockPath() { return join(coordDir(), 'review-counter.lock'); }
export function sessionAnchorPath() { return join(qaDir(), '.session-start'); }

/**
 * Disable markers. HY3 D1 (BLOCKER): an in-tree directory is a kill switch the
 * examinee can throw. The root is now set in-process (`setDisableRoot`) rather
 * than read from `SWAN_DISABLE_ROOT`, which GLM Q1 showed worked in BOTH
 * directions — an agent could point the root at an empty dir to silence a real
 * kill switch, or at a private dir to disable gates and then delete the evidence.
 */
export function disabledDir() {
  return disableRootOverride ?? join(qaDir(), 'disabled');
}

/*
 * WHAT WOULD ACTUALLY CLOSE THIS (not done here; architectural, slices 2+):
 *   1. The hook holds the pen — the reviewer writes its verdict to a pipe and the
 *      HOOK writes the artifact, so the agent never gets write access to a gate
 *      artifact's birth.
 *   2. Anchor the chain in git's DAG — each hook-written event extends a hash
 *      chain h_i = H(h_{i-1} || event), with the current h embedded in the commit
 *      the gate allows. Retroactive forgery then breaks shas later commits already
 *      depend on. This is the natural completion of amendment A6.
 * Until one of those exists, everything in this file raises the cost of forgery.
 * None of it makes forgery impossible against a same-privilege adversary, and no
 * consumer may describe it as if it did.
 */
