/**
 * app-banner-contract — what the console's status banner says, and who is allowed to say it.
 * @module scripts/swan-brain-console/app/app-banner.test
 *
 * WHY THIS SUITE EXISTS (round 11, finding F08)
 * The banner had TWO writers that both ASSIGNED `textContent`. `initShell` wrote the registry
 * failure, `renderStatus` then wrote the ordinary learning-engine message over it, and the
 * second one won. Astra demonstrated the consequence against the real writers: a failed
 * `/registry/tabs.json` replaced the message
 * `"Shell registry problem: tabs: could not load (HTTP 500)"` with the normal engine text, so
 * the operator saw tabs disappear from the strip with no visible explanation anywhere on the
 * page. Both messages were individually correct. The defect was that neither writer composed.
 *
 * WHAT IS ASSERTED
 * That the banner is a COMPOSITION, not a last-writer-wins cell: a registry failure survives a
 * successful snapshot, a snapshot failure survives alongside a registry failure, and a healthy
 * load produces a hidden banner rather than an empty one. The last of those matters because the
 * old code expressed "nothing to say" by NOT RUNNING, which is exactly how a message gets
 * erased instead of composed.
 *
 * Run: node --test scripts/swan-brain-console/app/app-banner.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const banner = await import(pathToFileURL(join(HERE, 'app-banner.mjs')).href);

/** A snapshot shaped like the real one, reduced to what the banner reads. */
const snapshot = (durableWrites = 'DECLARED_BLOCKED') => ({ engine: { durableWrites } });

/** A DOM stub: one element, looked up by id. */
function fakeDoc(id = banner.BANNER_ID) {
  const el = { id, hidden: null, textContent: null };
  return { doc: { getElementById: (want) => (want === id ? el : null) }, el };
}

describe('F08 — the banner is a composition, not a last-writer-wins cell', () => {
  test('RED — a registry failure SURVIVES a successful snapshot', () => {
    /*
     * The exact round-11 reproduction. Before the fix this text was whatever `renderStatus`
     * wrote last, and the registry failure was simply gone.
     */
    const plan = banner.planBanner({
      shellErrors: ['tabs: could not load (HTTP 500)'],
      snapshot: snapshot(),
    });
    assert.equal(plan.hidden, false);
    assert.match(plan.text, /Shell registry problem: tabs: could not load \(HTTP 500\)/);
    assert.match(plan.text, /Learning engine: DECLARED_BLOCKED/);
  });

  test('the registry failure is stated FIRST — order is the only severity signal a text banner has', () => {
    const plan = banner.planBanner({
      shellErrors: ['seats: could not load (HTTP 500)'],
      snapshot: snapshot(),
    });
    assert.ok(
      plan.text.indexOf('Shell registry problem') < plan.text.indexOf('Learning engine'),
      `the structural problem was not stated first: ${plan.text}`,
    );
  });

  test('RED — a snapshot failure and a registry failure are BOTH reported', () => {
    const plan = banner.planBanner({
      shellErrors: ['tabs: could not load (HTTP 500)'],
      snapshotError: 'state request failed: 503',
    });
    assert.match(plan.text, /Shell registry problem/);
    assert.match(plan.text, /could not read a snapshot: state request failed: 503/);
  });

  test('a snapshot failure is reported even when a snapshot object was somehow supplied', () => {
    // Belt and braces: a caller that passes both is reporting a failure, and the failure wins.
    const plan = banner.planBanner({ snapshot: snapshot(), snapshotError: 'boom' });
    assert.match(plan.text, /could not read a snapshot: boom/);
    assert.ok(!/Learning engine/.test(plan.text), 'a failed read was reported as a healthy engine');
  });

  test('a healthy load produces a HIDDEN banner, not an empty visible one', () => {
    // The old code set `hidden = false` in three separate places and expressed "nothing to say"
    // by not running. Deriving the flag means an erased message is not reachable.
    const plan = banner.planBanner({ snapshot: snapshot() });
    assert.equal(plan.count, 1);
    assert.equal(plan.hidden, false);
    assert.equal(banner.planBanner({}).hidden, true);
    assert.equal(banner.planBanner({}).text, '');
  });

  test('a shell failure with no snapshot at all is still visible', () => {
    // The boot path where the registry fails AND the state request never returns.
    const plan = banner.planBanner({ shellErrors: ['tabs: could not load (HTTP 500)'] });
    assert.equal(plan.hidden, false);
    assert.match(plan.text, /Shell registry problem/);
  });

  test('every shell error is named, not just the first', () => {
    const plan = banner.planBanner({ shellErrors: ['tabs: bad row 2', 'seats: could not load (HTTP 500)'] });
    assert.match(plan.text, /tabs: bad row 2/);
    assert.match(plan.text, /seats: could not load \(HTTP 500\)/);
  });
});

describe('applyBanner — the only writer of the element', () => {
  test('it writes both the text and the derived visibility', () => {
    const { doc, el } = fakeDoc();
    const out = banner.applyBanner(doc, banner.planBanner({ snapshot: snapshot() }));
    assert.equal(out.applied, true);
    assert.equal(el.hidden, false);
    assert.match(el.textContent, /Learning engine/);
  });

  test('it reports a missing element instead of throwing', () => {
    const out = banner.applyBanner({ getElementById: () => null }, banner.planBanner({ snapshot: snapshot() }));
    assert.equal(out.applied, false);
    assert.match(out.reason, /no #engine-banner element/);
  });
});

describe('wiring — the banner has exactly one writer', () => {
  test('the shell no longer writes the banner', () => {
    /*
     * A WIRING assertion, and labelled as one. The composition above can be perfect while a
     * second writer reappears — which is precisely how this defect arrived, and it would arrive
     * again as the most innocent-looking edit in the file. The shell must RETURN its errors and
     * let `app.js` present them.
     */
    const src = readFileSync(join(HERE, 'app-shell.js'), 'utf8');
    assert.ok(!/engine-banner/.test(src), 'app-shell.js writes the banner again — there are two writers');
    assert.match(src, /return \{ \.\.\.loaded, applied/, 'the shell must still return its errors');
  });

  test('app.js renders the banner through planBanner, and passes the shell errors to it', () => {
    const src = readFileSync(join(HERE, 'app.js'), 'utf8');
    assert.match(src, /planBanner/, 'app.js no longer composes the banner');
    assert.match(src, /shellErrors: shell\?\.errors/, 'app.js drops the shell errors instead of presenting them');
  });
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the banner module and this suite stay within 300 lines', () => {
  for (const f of ['app-banner.mjs', 'app-banner.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
