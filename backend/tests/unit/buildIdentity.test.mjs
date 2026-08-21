/**
 * buildIdentity.test.mjs
 * ======================
 * The gap this closes, from the 2026-08-21 money-path deploy: `/health`
 * reported `status: healthy, server: listening, ready: true` and I could not
 * prove from outside WHICH COMMIT was serving it. A healthy response from the
 * previous build is indistinguishable from a healthy response from the new one,
 * so "the deploy succeeded" was an assumption, not an observation.
 *
 * Pure and dependency-free for the same reason `healthStatus.mjs` is — that
 * module's header says it best: "A health check nobody can test is the last
 * place you want untested logic."
 */
import { describe, it, expect } from 'vitest';
import { deriveBuildIdentity, SHORT_SHA_LENGTH } from '../../routes/buildIdentity.mjs';

describe('deriveBuildIdentity', () => {
  const FULL_SHA = 'cf58d18ed0a1b2c3d4e5f60718293a4b5c6d7e8f';

  it('shortens the commit to a verifiable prefix', () => {
    const build = deriveBuildIdentity({ RENDER_GIT_COMMIT: FULL_SHA });

    expect(build.commit).toBe(FULL_SHA.slice(0, SHORT_SHA_LENGTH));
    expect(build.commit).toHaveLength(SHORT_SHA_LENGTH);
  });

  it('does NOT expose the full commit hash', () => {
    // Short is enough to verify a deploy against `git rev-parse --short`, and
    // this endpoint is unauthenticated. Publishing the exact full revision of a
    // repository that may later become private is disclosure with no added
    // operational value.
    const build = deriveBuildIdentity({ RENDER_GIT_COMMIT: FULL_SHA });

    expect(JSON.stringify(build)).not.toContain(FULL_SHA);
  });

  it('reports branch and service when Render provides them', () => {
    const build = deriveBuildIdentity({
      RENDER_GIT_COMMIT: FULL_SHA,
      RENDER_GIT_BRANCH: 'main',
      RENDER_SERVICE_NAME: 'ss-pt-new',
    });

    expect(build.branch).toBe('main');
    expect(build.service).toBe('ss-pt-new');
  });

  it('says "unknown" rather than throwing when nothing is set', () => {
    // Local dev, CI, and any non-Render host. A health endpoint must never be
    // the thing that 500s because an env var is absent.
    const build = deriveBuildIdentity({});

    expect(build.commit).toBe('unknown');
    expect(build.branch).toBe('unknown');
    expect(build.service).toBe('unknown');
  });

  it('survives a completely absent env object', () => {
    expect(() => deriveBuildIdentity(undefined)).not.toThrow();
    expect(deriveBuildIdentity(undefined).commit).toBe('unknown');
  });

  it('treats blank and whitespace-only values as unknown', () => {
    const build = deriveBuildIdentity({
      RENDER_GIT_COMMIT: '   ',
      RENDER_GIT_BRANCH: '',
    });

    expect(build.commit).toBe('unknown');
    expect(build.branch).toBe('unknown');
  });

  it('tolerates a commit shorter than the short length', () => {
    const build = deriveBuildIdentity({ RENDER_GIT_COMMIT: 'abc' });
    expect(build.commit).toBe('abc');
  });

  it('trims surrounding whitespace', () => {
    const build = deriveBuildIdentity({ RENDER_GIT_COMMIT: `  ${FULL_SHA}  ` });
    expect(build.commit).toBe(FULL_SHA.slice(0, SHORT_SHA_LENGTH));
  });

  it('coerces non-string values instead of leaking objects into the response', () => {
    const build = deriveBuildIdentity({ RENDER_GIT_COMMIT: 12345678901234 });
    expect(typeof build.commit).toBe('string');
  });

  it('reports how long this process has been up, as an integer', () => {
    // A restart is the observable side of a deploy: uptime resetting to near
    // zero is the second signal that new code is live.
    const build = deriveBuildIdentity({}, () => 1234.987);

    expect(build.uptimeSeconds).toBe(1234);
  });

  it('never reports a negative or fractional uptime', () => {
    expect(deriveBuildIdentity({}, () => -5).uptimeSeconds).toBe(0);
    expect(deriveBuildIdentity({}, () => 0.4).uptimeSeconds).toBe(0);
  });

  it('does not include any env value it was not asked for', () => {
    // A health endpoint enumerating process.env is how a secret gets published.
    //
    // The sentinel is assembled at runtime rather than written literally. A
    // realistic-looking connection string here trips the repo's own pre-commit
    // secret scanner — which is correct behaviour on its part, since it cannot
    // distinguish a test fixture from a live credential, and allowlisting the
    // file would blunt the scanner on every future edit. The assertion needs a
    // value that must not appear, not a plausible one.
    const SENTINEL = ['NEVER', 'IN', 'RESPONSE'].join('-');
    const build = deriveBuildIdentity({
      RENDER_GIT_COMMIT: FULL_SHA,
      DATABASE_URL: SENTINEL,
      STRIPE_SECRET_KEY: SENTINEL,
      SOME_FUTURE_SECRET: SENTINEL,
    });

    const serialized = JSON.stringify(build);
    expect(serialized).not.toContain(SENTINEL);
    // The stronger guarantee: an exact key set, so a field added later cannot
    // quietly start carrying something.
    expect(Object.keys(build).sort()).toEqual(
      ['branch', 'commit', 'service', 'uptimeSeconds'].sort(),
    );
  });
});
