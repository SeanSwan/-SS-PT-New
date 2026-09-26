/**
 * serverHarness.mjs — one `withServer` for the Astra suites.
 *
 * WHY THIS EXISTS. Five suites in `scripts/astra/tests/` had grown their own copy of
 * the same twenty-line helper, each with its own token constant. Five copies is five
 * places for the request shape to drift, and the copies had already diverged: some
 * sent the token as a header, some omitted it entirely and relied on the route being
 * free. A test that forgets the token does not fail — it gets a 401 and asserts
 * against an error body, which is the "a check that cannot fail for the right reason"
 * class this project keeps finding.
 *
 * The older four suites still carry their own copies. Migrating them is a mechanical
 * change to four files this slice does not otherwise touch, and doing it here would
 * bury the override-editor work in a test refactor. Recorded as a residual: this is
 * the home for new suites, and the old ones should move when something else takes
 * them past the point of editing.
 *
 * `port: 0` lets the OS choose, so two suites running at once cannot collide. The
 * server is always closed in a `finally`, so a failing assertion cannot leak a
 * listener into the next test.
 */

import { startServer } from '../../surface/server.mjs';

/** One token for every suite. A per-file constant is how the copies diverged. */
export const TEST_TOKEN = 'astra-test-token';

/**
 * Run `fn` with a live server, and close it afterwards whatever happens.
 *
 * @param {(t: {base: string, req: Function, get: Function, post: Function, json: Function}) => any} fn
 * @param {{token?: string}} [opts]
 */
export async function withServer(fn, { token = TEST_TOKEN } = {}) {
  const s = await startServer({ port: 0, token });
  const base = s.url.replace(/\/$/, '');
  const req = async (path, opts = {}) => {
    const r = await fetch(base + path, opts);
    return { status: r.status, text: await r.text(), headers: r.headers };
  };
  const post = (route, body, t = token) => req(`/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(t ? { 'x-astra-token': t } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  /**
   * The body, SPREAD AT THE TOP LEVEL, plus the status and the raw text.
   *
   * That is deliberate and it has bitten twice: a helper that nested the body under
   * `body` makes `r.error.code` read as `undefined` and a test then asserts against
   * `undefined === 'E_...'`. The spread keeps `r.error` and `r.view` where the route
   * put them, which is also where a reader expects them.
   */
  const json = async (route, body, t = token) => {
    const r = await post(route, body, t);
    return { ...JSON.parse(r.text), status: r.status, text: r.text };
  };
  try {
    return await fn({ base, req, get: (p) => req(p), post, json });
  } finally {
    await s.close();
  }
}
