/**
 * a5-capabilities.test.mjs — slice A5's tests.
 *
 * T-U-07  the lane board: statuses, and a CODE SOURCE for every row
 * T-U-08  a capability declared `claimed` renders as NOT VERIFIED
 *
 * THE EXPECTED CLASSIFICATION HERE DIFFERS FROM THE PACKET, DELIBERATELY.
 * `04-TESTS-TRACEABILITY.md` T-U-07 predicted `synthesize`, `corroborate`,
 * `adjudicate`, `emit-vault`, `log-receipt` = REFUSED. Three of those five were
 * MEASURED to be ACTIVE. The test asserts the measurement, and the packet is
 * corrected — a test that asserted the packet's guess would have locked a wrong
 * board in place with a green tick.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { capabilities, capabilitySummary, LANES } from '../core/capabilities.mjs';
import { explainCapabilities } from '../../../shared/swanExplain.mjs';
import { lanePath, REPO_ROOT, repoRelative } from '../core/paths.mjs';

const board = capabilities();
const statusOf = (lane) => board.find((r) => r.lane === lane)?.status;

test('T-U-07: exactly three lanes are RETIRED, and they THROW ON IMPORT', async () => {
  const retired = board.filter((r) => r.status === 'RETIRED').map((r) => r.lane).sort();
  assert.deepEqual(retired, ['attest', 'log-spec', 'redact-provenance']);
  // The classification is not a label: a RETIRED module must actually throw on
  // import. If one of these ever starts importing cleanly, the board is wrong.
  for (const lane of retired) {
    await assert.rejects(() => import(lanePath(lane)),
      (e) => typeof e.code === 'string',
      `${lane} is marked RETIRED but imported without throwing`);
  }
});

test('T-U-07: exactly three lanes are REFUSED, each with a code guard', () => {
  const refused = board.filter((r) => r.status === 'REFUSED').map((r) => r.lane).sort();
  assert.deepEqual(refused, ['adjudicate', 'corroborate', 'emit-vault']);
  for (const row of board.filter((r) => r.status === 'REFUSED')) {
    assert.ok(row.marker, `${row.lane} has no marker`);
    assert.ok(row.gatedBy, `${row.lane} is REFUSED with no named gate condition`);
  }
});

test('T-U-07: the lanes A0 called REFUSED that are actually ACTIVE are recorded as ACTIVE', () => {
  // Measured, not inferred: all three import cleanly and complete their work.
  for (const lane of ['synthesize', 'log-receipt', 'reference-modes']) {
    assert.equal(statusOf(lane), 'ACTIVE',
      `${lane} must be ACTIVE — it imports and runs; A0's REFUSED was a misread`);
  }
  // And the specific misread is documented on the row, so the correction travels
  // with the data rather than living only in a review file.
  assert.match(board.find((r) => r.lane === 'synthesize').note, /REFUSED <receiptId>/);
});

test('T-U-07: spec mode is DISABLED and is NOT a lane', () => {
  const row = board.find((r) => r.lane === 'spec-mode');
  assert.equal(row.status, 'DISABLED');
  assert.equal(row.file, 'spec-contract');
  assert.match(row.gatedBy, /enabled/);
});

test('T-U-07 / INV8: EVERY row resolves to a live file:line — no status without a source', () => {
  for (const row of board) {
    assert.equal(row.sourceMissing, false,
      `${row.lane} has no code source, so its status must not be asserted`);
    assert.match(row.source, /^scripts\/design-brain\/src\/.+\.mjs:\d+$/,
      `${row.lane} source is not a repo-relative file:line — got ${row.source}`);
    // And the cited line really contains the marker.
    const line = readFileSync(`${REPO_ROOT}/${row.source.split(':')[0]}`, 'utf8')
      .split('\n')[row.sourceLine - 1];
    assert.ok(line.includes(row.marker),
      `${row.lane}: ${row.source} does not contain its marker ${JSON.stringify(row.marker)}`);
  }
  assert.deepEqual(capabilitySummary().inconclusive, []);
});

test('T-U-07: the board DEGRADES rather than asserting an unsupported status', () => {
  // The mechanism, shown firing. A row whose marker does not exist must come back
  // INCONCLUSIVE — never ACTIVE. Without this the "every row has a source" claim
  // would be unfalsifiable.
  const bogus = capabilities([{
    lane: 'synthesize',
    status: 'ACTIVE',
    marker: 'THIS_MARKER_DOES_NOT_EXIST_ANYWHERE_12345',
    guardKind: 'none',
    gatedBy: null,
    writes: 'nothing',
  }]);
  assert.equal(bogus[0].status, 'INCONCLUSIVE');
  assert.equal(bogus[0].sourceMissing, true);
  assert.match(bogus[0].reason, /not found/);
});

test('T-U-07: an unreadable lane file degrades too, and does not throw', () => {
  const bogus = capabilities([{
    lane: 'no-such-lane-file',
    status: 'ACTIVE',
    marker: 'x',
    guardKind: 'none',
    gatedBy: null,
    writes: 'nothing',
  }]);
  assert.equal(bogus[0].status, 'INCONCLUSIVE');
  assert.match(bogus[0].reason, /E_LANE_UNREADABLE/);
});

test('T-U-07: every lane in the table is unique, and the counts are derived', () => {
  const names = LANES.map((r) => r.lane);
  assert.equal(new Set(names).size, names.length, 'duplicate lane in the table');
  const { byStatus } = capabilitySummary();
  assert.equal(byStatus.RETIRED, 3);
  assert.equal(byStatus.REFUSED, 3);
  assert.equal(byStatus.ACTIVE, 5);
  assert.equal(byStatus.DISABLED, 1);
});

test('T-U-07: the source paths are repo-relative and forward-slashed', () => {
  assert.ok(repoRelative(lanePath('corroborate')).startsWith('scripts/design-brain/src/'));
  assert.ok(!repoRelative(lanePath('corroborate')).includes('\\'),
    'a citation with a backslash is platform-dependent and will not match on CI');
});

// ---------------------------------------------------------------------------
// T-U-08 — `claimed` is NOT `verified`
// ---------------------------------------------------------------------------

test('T-U-08: a capability declared "claimed" renders as NOT usable', () => {
  const caps = explainCapabilities({ honorsNegativePrompt: 'claimed', seedIsDeterministic: 'claimed' });
  assert.equal(caps.honorsNegativePrompt, 'claimed');
  assert.equal(caps.negativePromptUsable, false, 'claimed must never be usable');
  assert.equal(caps.seedUsable, false);
});

test('T-U-08: only "verified" is usable — true/1/"yes" are all false', () => {
  for (const v of [true, 1, 'yes', 'true', undefined, null]) {
    const caps = explainCapabilities({ seedIsDeterministic: v, honorsNegativePrompt: v });
    assert.equal(caps.seedIsDeterministic, v === 'claimed' ? 'claimed' : 'false');
    assert.equal(caps.seedUsable, false, `${JSON.stringify(v)} must not read as verified`);
  }
  const ok = explainCapabilities({ seedIsDeterministic: 'verified', honorsNegativePrompt: 'verified' });
  assert.equal(ok.seedUsable, true);
  assert.equal(ok.negativePromptUsable, true);
});

test('T-U-08: the claimed fixture really is claimed, end to end', () => {
  const caps = JSON.parse(readFileSync(
    `${REPO_ROOT}/scripts/astra/fixtures/caps-claimed.json`, 'utf8',
  ));
  const rendered = explainCapabilities(caps, caps.provider, caps.modelVersion);
  assert.equal(rendered.provider, 'example-provider');
  assert.equal(rendered.seedUsable, false);
  assert.equal(rendered.negativePromptUsable, false);
});
