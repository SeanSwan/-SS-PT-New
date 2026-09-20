/*
 * S1 exit-criterion verification (not a unit test — a real end-to-end run).
 *
 * 08-slices-operations.md S1 exit evidence requires: "R2/R3 visible on real
 * fixture store". That means bridge + built web app together, not StatusBoard
 * against fixtures in isolation.
 *
 * Runs: seed a temp store -> start the real bridge -> fetch /api/status ->
 * fetch the built app -> then corrupt registry.json and confirm R3's refusal.
 *
 * NOTE the helper contract: `getJson` returns `{status, body}` and does NOT
 * throw on a non-2xx. Read `.body`, assert on `.status`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { startBridge } from '../server.mjs';
import { fixtureRoot, getJson } from '../test/fixtures.mjs';

const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
}

const r = fixtureRoot('s1-exit');
const handle = await startBridge({ r });
const base = handle.url;

try {
  // ---- R2: the status instrument is real, from the store ----
  const { status: httpStatus, body: status } = await getJson(base, '/api/status');
  check('R2 · GET /api/status answers 200', httpStatus === 200, `HTTP ${httpStatus}`);

  const R2_FIELDS = [
    'ytdlp', 'creators', 'state', 'budget', 'backlog', 'throttle',
    'census', 'lock', 'lastRun', 'lastGood', 'documents', 'publishedBrains', 'recentRuns',
  ];
  const missing = R2_FIELDS.filter((f) => !(f in (status ?? {})));
  check('R2 · every StatusInstrument field is present', missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${R2_FIELDS.length} fields`);

  check('R2 · creators are real store data, not zeros',
    typeof status?.creators?.total === 'number' && status.creators.total > 0,
    `total=${status?.creators?.total} enabled=${status?.creators?.enabled}`);
  check('R2 · backlog is engine-formatted lines',
    Array.isArray(status?.backlog?.lines), `lines=${status?.backlog?.lines?.length ?? 0}`);

  // ---- the built web app is actually served ----
  const indexRes = await fetch(`${base}/`);
  const html = await indexRes.text();
  check('web app served at /', indexRes.ok && /<div id="root">/.test(html), `HTTP ${indexRes.status}`);

  const assetMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  check('index.html references a built JS chunk', Boolean(assetMatch), assetMatch?.[1] ?? 'none');
  if (assetMatch) {
    const jsRes = await fetch(`${base}${assetMatch[1]}`);
    const js = await jsRes.text();
    check('the JS chunk is served and non-trivial', jsRes.ok && js.length > 1000, `${js.length} bytes`);
  }

  // ---- R3: corrupt registry.json and confirm the refusal reaches the client ----
  //
  // H6b (found 2026-09-18): the REAL behaviour differs from what 05 §2a and 06
  // T-B2 claimed. `/api/status` does NOT 409 — it answers 200 and reports the
  // damage as a FIELD (`creators.damaged`), because StatusInstrument types it
  // that way and the UI needs it to render a banner. `/api/creators` is the one
  // that 409s. Asserted as-built; the docs were corrected to match.
  fs.writeFileSync(path.join(r, 'registry.json'), '{ this is not valid json');

  const damagedStatus = await getJson(base, '/api/status');
  check('R3 · /api/status answers 200 and reports damage as a field',
    damagedStatus.status === 200 && damagedStatus.body?.creators?.damaged !== null,
    `HTTP ${damagedStatus.status}, damaged=${JSON.stringify(damagedStatus.body?.creators?.damaged?.file ?? null)}`);
  check('R3 · the field names the file (what the banner renders)',
    damagedStatus.body?.creators?.damaged?.file === 'registry.json',
    `file=${damagedStatus.body?.creators?.damaged?.file}`);

  const damagedCreators = await getJson(base, '/api/creators');
  check('R3 · /api/creators answers 409 STORE_DAMAGED',
    damagedCreators.status === 409 && damagedCreators.body?.error?.code === 'STORE_DAMAGED',
    `HTTP ${damagedCreators.status} code=${damagedCreators.body?.error?.code}`);
  check('R3 · that envelope names the file too',
    damagedCreators.body?.error?.file === 'registry.json',
    `file=${damagedCreators.body?.error?.file}`);
  check('R3 · a refusal is never an empty array masquerading as "no creators"',
    !Array.isArray(damagedCreators.body), `body is ${Array.isArray(damagedCreators.body) ? 'an array' : 'an error envelope'}`);
} finally {
  await handle.shutdown();
}

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
