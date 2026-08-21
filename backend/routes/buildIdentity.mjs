/**
 * buildIdentity.mjs — which build is actually answering.
 * ======================================================
 *
 * WHY THIS EXISTS (2026-08-21)
 *
 * After the money-path workstream merged, `/health` answered
 *
 *     200 { status: 'healthy', server: 'listening', ready: true }
 *
 * and that response was IDENTICAL to the one the previous build would have
 * given. The endpoint proved the process was up; it could not prove which code
 * was up. "The deploy succeeded" was an assumption dressed as a check — the
 * same defect class as a safety guard that reports a pass without running.
 *
 * Render populates RENDER_GIT_COMMIT / RENDER_GIT_BRANCH / RENDER_SERVICE_NAME
 * in the service environment. Surfacing them turns deploy verification from
 * "the site still loads" into a one-command comparison:
 *
 *     curl -s https://<service>/health | jq -r .build.commit
 *     git rev-parse --short HEAD
 *
 * PURE AND DEPENDENCY-FREE, for the reason `healthStatus.mjs` states in its own
 * header: a health check nobody can test is the last place you want untested
 * logic. Everything here is a function of its arguments, so the behaviour that
 * matters is exercised without express, a database, or a network.
 *
 * TWO DELIBERATE RESTRAINTS.
 *
 * 1. SHORT SHA ONLY. Seven characters is enough to verify a deploy against
 *    `git rev-parse --short`, which is the entire job. This endpoint is
 *    unauthenticated, and publishing the exact full revision of a repository
 *    that may later become private is disclosure that buys no extra
 *    operational value.
 *
 * 2. AN EXPLICIT ALLOWLIST, never an enumeration of `process.env`. A health
 *    endpoint that iterates the environment is one refactor away from
 *    publishing a database URL. Only the four fields below are ever returned,
 *    and a test asserts the key set exactly.
 *
 * NEVER LET THIS THROW. It runs inside a liveness probe. An env var being
 * absent — local dev, CI, any non-Render host — must degrade to 'unknown',
 * because a health check that 500s on missing metadata converts an
 * observability gap into an outage.
 *
 * @module routes/buildIdentity
 */

/** Characters of the commit SHA published. Matches `git rev-parse --short`. */
export const SHORT_SHA_LENGTH = 7;

const UNKNOWN = 'unknown';

/**
 * Normalize one env value to a non-empty trimmed string, or 'unknown'.
 * Non-strings are coerced rather than trusted, so a malformed environment
 * cannot put an object into a JSON response.
 */
const readable = (value) => {
  if (value === null || value === undefined) return UNKNOWN;
  const text = String(value).trim();
  return text.length > 0 ? text : UNKNOWN;
};

/**
 * Describe the running build.
 *
 * @param {Object} [env] environment to read (defaults to `process.env`)
 * @param {Function} [uptimeSource] returns seconds this process has been up;
 *   injectable so the uptime branch is testable without waiting
 * @returns {{commit: string, branch: string, service: string, uptimeSeconds: number}}
 */
export function deriveBuildIdentity(env = process.env, uptimeSource = () => process.uptime()) {
  const source = env && typeof env === 'object' ? env : {};

  const commit = readable(source.RENDER_GIT_COMMIT);

  let uptimeSeconds = 0;
  try {
    const raw = Number(uptimeSource());
    // Floor, and never negative: a clock adjustment must not produce a
    // nonsensical figure in an operator-facing field.
    uptimeSeconds = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    uptimeSeconds = 0;
  }

  return {
    commit: commit === UNKNOWN ? UNKNOWN : commit.slice(0, SHORT_SHA_LENGTH),
    branch: readable(source.RENDER_GIT_BRANCH),
    service: readable(source.RENDER_SERVICE_NAME),
    uptimeSeconds,
  };
}

export default { deriveBuildIdentity, SHORT_SHA_LENGTH };
