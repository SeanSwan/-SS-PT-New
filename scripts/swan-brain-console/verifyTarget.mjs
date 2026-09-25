/**
 * verifyTarget — prove the server about to be measured is THIS build, not merely a
 * Swan Brain Console.
 * @module scripts/swan-brain-console/verifyTarget
 *
 * WHY THIS EXISTS (measured, 2026-09-19)
 * The orchestrator's readiness probe proves identity with a substring: the console must
 * contain `Swan Brain Console`. That is strictly better than an HTTP 200 — but it still
 * cannot tell THIS build from ANY build of the same app, and a stale console satisfies it
 * perfectly.
 *
 * That is not hypothetical. Running the console verifier during S5:
 *
 *     Error: listen EADDRINUSE: address already in use 127.0.0.1:4599
 *
 * A server left over from an earlier session owned the port. It answered `200` on `/`,
 * its title contained `Swan Brain Console`, and it was a **pre-S3 build** — it served
 * only five routes and returned `{"error":"not found"}` for `/registry/tabs.json`. The
 * probe passed. Every subsequent check would have measured the wrong build while the
 * probe reported success. (Same defect class as `shot-diff`'s readiness probe, and as
 * ban 34's sibling: reachability is not identity.)
 *
 * WHAT "IDENTITY" MEANS HERE
 * Not a title, and not a version string the server could be lying about — the CONTENT of
 * the files this repo would serve. The probes below fetch a small, load-bearing set of
 * paths from the target and compare them against the same files on local disk. A stale
 * worktree, a different branch, or another app entirely all fail, and the failure names
 * the path that disagreed.
 *
 * `readRegistry` is deliberately in the set: it is the S3 deliverable, so its very
 * presence distinguishes this build from anything before it.
 *
 * BOUNDS: no network beyond the given base URL, no writes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_ROUTES } from './assetRoutes.mjs';
import { BUILD_FINGERPRINT } from './buildIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, 'app');

/** Strip a BOM and normalise line endings, so a checkout difference is not a false alarm. */
function normalise(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

/**
 * The paths compared, and how.
 *
 * `json` compares parsed values, because the server re-serialises a registry rather than
 * streaming the file — byte equality would fail on formatting alone and the check would
 * be noise. `text` compares normalised content, because assets ARE streamed verbatim.
 *
 * THE ASSET PROBES ARE DERIVED FROM `ASSET_ROUTES`, NOT LISTED BY HAND. An earlier version
 * named four routes explicitly. That is the same drift class as ban 36: a hand-written list
 * beside a table it must agree with goes stale the moment a route is added, and it CRASHES
 * at import if a route is removed (`ASSET_ROUTES['/app-gates.mjs'].file` on `undefined`).
 * Deriving from the table means every route is covered automatically and no key can be
 * assumed to exist.
 */
export const IDENTITY_PROBES = Object.freeze([
  { url: '/registry/tabs.json', file: join(ASSETS, 'tabs.json'), kind: 'json' },
  ...Object.entries(ASSET_ROUTES).map(([url, asset]) => ({
    url,
    file: join(ASSETS, asset.file),
    kind: 'text',
  })),
]);

/** Read the expected value for one probe from local disk. Never throws. */
export function expectedFor(probe) {
  if (!existsSync(probe.file)) return { ok: false, reason: `missing on disk: ${probe.file}` };
  try {
    const raw = readFileSync(probe.file, 'utf8');
    return { ok: true, value: probe.kind === 'json' ? JSON.parse(raw) : normalise(raw) };
  } catch (err) {
    return { ok: false, reason: `unreadable: ${err?.message ?? err}` };
  }
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare the RUNNING PROCESS's backend fingerprint against this build's (round 12, Astra F15).
 *
 * The content probes above compare served bytes to disk bytes, and Astra graded the resulting
 * claim precisely: they cover the BROWSER's files and one registry, and nothing about the
 * server's own logic. Editing `gateClassify.mjs` changes no asset, so a process started before
 * that edit serves byte-identical assets while computing DIFFERENT gate statuses — and every
 * probe above passes.
 *
 * A MISSING `/api/build` IS A FAILURE, not a skip. A server predating this endpoint is exactly
 * the stale case being hunted, and treating its 404 as "no opinion" would restore the hole.
 */
async function compareBuildIdentity(base, { fetchImpl, expectedFingerprint }) {
  const url = '/api/build';
  let res;
  try {
    res = await fetchImpl(`${base}${url}`);
  } catch (err) {
    return { problems: [{ url, detail: `unreachable — ${err?.message ?? err}` }], checked: [] };
  }
  if (!res.ok) {
    return {
      problems: [{
        url,
        detail: `HTTP ${res.status} — the target publishes no build identity, so its backend `
          + 'cannot be distinguished from a stale one',
      }],
      checked: [],
    };
  }
  let served;
  try {
    served = JSON.parse(await res.text());
  } catch {
    return { problems: [{ url, detail: 'build identity is not valid JSON' }], checked: [] };
  }
  if (served?.fingerprint !== expectedFingerprint) {
    return {
      problems: [{
        url,
        detail: `the running server loaded ${served?.fingerprint ?? 'no fingerprint'}, this build `
          + `is ${expectedFingerprint} — a stale process is serving current assets`,
      }],
      checked: [],
    };
  }
  return { problems: [], checked: [url] };
}

/**
 * Fetch every probe from `baseUrl` and compare it to local disk.
 *
 * Returns a verdict rather than throwing, so it is testable and so the caller decides
 * how loudly to fail. `problems` is empty exactly when the target is this build.
 */
export async function compareTargetToDisk(baseUrl, {
  fetchImpl = fetch, probes = IDENTITY_PROBES, expectedFingerprint = BUILD_FINGERPRINT,
} = {}) {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const problems = [];
  const checked = [];

  for (const probe of probes) {
    const expected = expectedFor(probe);
    if (!expected.ok) {
      problems.push({ url: probe.url, detail: `cannot establish expected content — ${expected.reason}` });
      continue;
    }

    let res;
    try {
      res = await fetchImpl(`${base}${probe.url}`);
    } catch (err) {
      problems.push({ url: probe.url, detail: `unreachable — ${err?.message ?? err}` });
      continue;
    }

    if (!res.ok) {
      problems.push({ url: probe.url, detail: `HTTP ${res.status} — the target does not serve this path` });
      continue;
    }

    const body = await res.text();
    let served;
    try {
      served = probe.kind === 'json' ? JSON.parse(body) : normalise(body);
    } catch {
      problems.push({ url: probe.url, detail: 'served content is not valid for its kind' });
      continue;
    }

    if (!equal(served, expected.value)) {
      problems.push({
        url: probe.url,
        detail: probe.kind === 'json'
          ? 'served registry differs from the registry on disk'
          : 'served asset differs from the asset on disk',
      });
      continue;
    }

    checked.push(probe.url);
  }

  /*
   * ROUND 12 (2026-09-20), Astra F15. Runs AFTER the content probes so a plainly foreign target
   * is still reported by the path that disagreed, but before the verdict is returned — a server
   * whose assets match and whose backend does not is the case this closes.
   */
  const build = await compareBuildIdentity(base, { fetchImpl, expectedFingerprint });
  problems.push(...build.problems);
  checked.push(...build.checked);

  return { ok: problems.length === 0, problems, checked };
}

/**
 * Throwing form, for a gate. The message names the port problem explicitly, because the
 * realistic cause is a leftover server from another session or worktree.
 */
export async function assertTargetIdentity(baseUrl, options = {}) {
  const verdict = await compareTargetToDisk(baseUrl, options);
  if (verdict.ok) return verdict;
  const lines = verdict.problems.map((p) => `  ${p.url} — ${p.detail}`).join('\n');
  throw new Error(
    `${baseUrl} is NOT this build. Refusing to measure it.\n${lines}\n`
    + '  A leftover server from another session or worktree is the usual cause — '
    + 'check what owns the port before re-running.',
  );
}
