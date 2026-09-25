/**
 * contrast.scope.test — the out-of-scope declarations, and the reason each one has.
 * @module scripts/swan-brain-console/app/contrast.scope.test
 *
 * WHY THIS FILE EXISTS (the NINTH Rule 4 split in this subsystem)
 * `app/contrast.test.mjs` passed 300 lines when the round-16 partition assertions were added for
 * Astra's L05/K06 — 358 by the guard's own count. The file had already been trimmed once (301 → 299)
 * by shortening comments, and doing that a second time would be the same mistake twice: a budget kept
 * by deleting the reasoning that justifies the assertions is not a budget.
 *
 * The boundary is by SUBJECT, and it is a real one:
 *   `contrast.test.mjs`         asks whether a text colour is LEGIBLE — the ratio floor, the
 *                               shorthand/literal resolution, and whether any colour-declaring rule
 *                               escapes the check by being uncomputable.
 *   `contrast.scope.test.mjs`   asks whether a declaration that this suite EXCUSES still deserves
 *                               the excuse. `NON_OPAQUE` is a promise that a token's contrast cannot
 *                               be computed statically; if the token stops being semi-transparent,
 *                               the promise is stale and the token is unchecked for no reason.
 *
 * Those are different failure directions. A legibility failure ships an unreadable colour; a stale
 * excuse ships nothing today and silently removes a check tomorrow. They should be able to fail
 * separately, which is the same argument that produced every other split in this subsystem.
 *
 * EXCEPTION BINDING MOVED HERE IN ROUND 17, and it belongs here for the same reason. An entry in
 * `EXCEPTIONS` is an excuse of exactly the `NON_OPAQUE` kind: "this token is fine, because it only
 * renders on that surface". The binding is what makes the excuse falsifiable — the named selector
 * must exist and must actually declare the claimed background. An unbound or stale entry excuses a
 * token from a check it no longer deserves, which is the subject of this file and not of the floor.
 *
 * Run: node --test scripts/swan-brain-console/app/contrast.scope.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { NON_OPAQUE, EXCEPTIONS, palette, rules, exceptionBindingDefect } from './contrast.mjs';

describe('every out-of-scope declaration still has the reason it was excused for', () => {
  test('the out-of-scope tokens are still out of scope for the stated reason', () => {
    // `--muted` is excused because its contrast depends on what is behind it. If it becomes opaque
    // that reason evaporates and it must be declared instead. MUTATION: make it a hex. RED.
    const src = rules().map((r) => r.body).join(';');
    for (const [token, pattern] of Object.entries(NON_OPAQUE)) {
      const declared = src.match(new RegExp(`${token}\\s*:\\s*([^;]+)`));
      assert.ok(declared, `${token} is declared out of scope but no longer exists`);
      assert.match(declared[1].trim(), pattern,
        `${token} is no longer the semi-transparent value this suite excuses it for — declare its `
        + 'surface instead of leaving it unchecked');
    }
  });

  test('every exception is bound to a selector that declares its surface', () => {
    /*
     * The round-14 entry claimed purple rendered only inside `.judge-variant`; it also rendered in
     * `.wild` on `--carbon`, and nothing checked. The binding is what makes that claim falsifiable.
     *
     * This runs the binding on the REAL table (empty, so it asserts nothing there) AND on synthetic
     * entries that must fail, so the mechanism cannot rot into a no-op.
     *
     * MUTATION: make `exceptionBindingDefect` return null unconditionally. RED.
     */
    const pal = palette();
    for (const [token, entry] of Object.entries(EXCEPTIONS)) {
      assert.equal(exceptionBindingDefect(token, entry, pal), null,
        `the exception for ${token} is not supported by the stylesheets`);
    }
    assert.notEqual(
      exceptionBindingDefect('--purple', {
        surface: '--obsidian', selector: '.no-such-selector-anywhere',
      }, pal),
      null,
      'the binding accepted a selector that does not exist — the mechanism is vacuous',
    );
    assert.notEqual(
      exceptionBindingDefect('--purple', { surface: '--obsidian', selector: '.wild' }, pal),
      null,
      'the binding accepted a selector that does not declare that background — the mechanism is '
      + 'vacuous',
    );
  });
});
