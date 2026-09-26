/**
 * a4b-editor.test.mjs — the OVERRIDE EDITOR: what the PANE offers.
 *
 * SPLIT FROM `a4b-overrides.test.mjs` at the seam this project already uses elsewhere
 * (`a4-routes` vs `a4-surface`, `a3-surface` vs `a3-transport`): what the BOUNDARY
 * refuses versus what the PANE offers. That file is the boundary; this is the pane.
 * The split was forced by Rule 4's own guard, which caught the combined file at 331
 * lines — the second slice in a row where the budget check found a real problem rather
 * than a number.
 *
 * WHY AN EDITOR AT ALL. `01-REQUIREMENTS.md` §4 names three legal dials, and
 * `slotOverrides` is one of them — but until A4b the surface drew the twelve slots as
 * read-only cells while the registry advertised a `[STAGE OVERRIDES]` button. A rendered
 * control with no handler is a DEAD CONTROL, and this one was worse than most: the layer
 * it names is the ONE layer `resolveSlots` applies LAST, so it is the only thing in the
 * system that can overwrite a decided value. A dial that powerful being invisible is the
 * defect these tests exist to keep closed.
 *
 * THE TWO HALVES OF THE CONTRACT ARE ASSERTED AGAINST EACH OTHER, ON PURPOSE:
 *   * the PANE must not offer a key the API refuses, because an invitation to a
 *     guaranteed refusal is worse than an absent control; and
 *   * the API must refuse it anyway, because a pane is a suggestion and the boundary is
 *     the enforcement.
 * Both read ONE policy object (`core/overrides.mjs`), and the test below asserts the
 * pane renders THAT object's own string rather than a re-typed copy of it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSlots } from '../surface/paneSlots.mjs';
import { SLOT_ORDER, slotsForEditor } from '../surface/slotView.mjs';
import { CONTROLS } from '../surface/controls.mjs';
import { escapeHtml } from '../surface/shell.mjs';
import { handleApi } from '../surface/api.mjs';
import { BLOCKED_OVERRIDE_KEYS, overridableKeys } from '../core/overrides.mjs';
import { withServer, TEST_TOKEN as TOKEN } from './helpers/serverHarness.mjs';

const OVERRIDABLE = overridableKeys(SLOT_ORDER);

/**
 * The editor's inputs, read off the rendered markup.
 *
 * Match the whole tag and then read its attributes, rather than encoding an attribute
 * ORDER in the pattern — the row writes `data-key` first and `aria-label` last, and a
 * regex that assumes that order breaks the day someone reorders harmless attributes.
 */
const EDITABLE_TAGS = (html) => [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0])
  .filter((t) => t.includes('data-control="slots.override"'));
const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
/**
 * The rendered slot rows, INCLUDING their opening `<tr>` tag.
 *
 * `m[0]`, not `m[1]`. The inner-only version was the second way this file lied on its
 * first run: the row's state lives in the opening tag (`class="slot slot--locked"`), so
 * capturing only the body made `assert.match(row, /slot--locked/)` fail against markup
 * that plainly carried it. A row is the tag plus the body; anything less is a fragment
 * that cannot answer questions about the row.
 */
const rows = (html) => [...html.matchAll(/<tr class="slot[^"]*">[\s\S]*?<\/tr>/g)].map((m) => m[0]);

/**
 * The slot a row is ABOUT, read from its own key cell.
 *
 * NOT `row.includes('negative')`. That is what this helper replaced, and the loose
 * version failed on the first run — for the right reason, which is the only useful way
 * for a test to fail. `composition`'s default value is *"single dominant gesture,
 * generous negative space"*, so a substring search for `negative` matched slot 5 and the
 * assertion was made against an EDITABLE row while claiming to be about the LOCKED one.
 *
 * The general rule this is an instance of: a slot's value is free-form prose and may
 * contain ANY slot's name, so searching rendered markup for a slot name is not the same
 * as finding that slot. Match the cell that carries the key.
 */
const rowKey = (row) => /<td class="k">([^<]*)<\/td>/.exec(row)?.[1] ?? null;

/** A real projection from a real brief — the editor is driven by the compiler's own slots. */
const editorSlots = (overrides = {}) => slotsForEditor({ text: 'a frozen lake', intent: 'hero' }, overrides);

// ---------------------------------------------------------------------------
// The editor: one control per overridable slot, and no control on a law
// ---------------------------------------------------------------------------

test('the editor renders one input per OVERRIDABLE slot, keyed per slot', () => {
  const slots = editorSlots();
  const html = renderSlots({ slots, overrides: {} });
  const tags = EDITABLE_TAGS(html);
  // RELATIONAL ON PURPOSE, and it needs the test below to be sound. `overridableKeys` is
  // the same function `renderSlots` calls, so if it wrongly admitted `negative` this
  // assertion would expect 12 and the renderer would draw 12 and both would agree — a
  // tautology. The specific blocked key is therefore pinned with a LITERAL in the next
  // test, which no change to the policy can move. Do not "strengthen" this one by
  // hard-coding 11: that would only duplicate the literal check and rot when a slot is
  // added to the compiler.
  assert.equal(tags.length, OVERRIDABLE.length,
    `${OVERRIDABLE.length} slots are overridable but the editor rendered ${tags.length} inputs`);
  assert.deepEqual(tags.map((t) => attr(t, 'data-key')).sort(), [...OVERRIDABLE].sort(),
    'every overridable slot needs exactly one input, keyed by its own slot key');
  assert.equal(slots.length, SLOT_ORDER.length, 'the editor table covers every compiler slot');
});

test('the negative slot renders as (kill-list applied), with NO control on it', () => {
  const html = renderSlots({ slots: editorSlots(), overrides: {} });
  assert.match(html, /\(kill-list applied\)/, '03-INTERFACE.md §2.1 draws slot 11 this way');
  assert.ok(!EDITABLE_TAGS(html).some((t) => attr(t, 'data-key') === 'negative'),
    'negative must not be an editable input — it carries LAW 3\'s kill-list');

  // The row must still EXIST and still be numbered. Skipping it would leave the operator
  // counting 11 rows and unable to tell whether slot 11 is missing or merely locked.
  const all = rows(html);
  assert.equal(all.length, SLOT_ORDER.length, 'the locked slot is rendered, not omitted');
  const locked = all.find((r) => rowKey(r) === 'negative');
  assert.ok(locked, 'the negative row must render');
  assert.match(locked, /slot--locked/, 'and it must be marked locked, not left looking editable');
  assert.ok(!locked.includes('data-control'),
    'a read-out is not a control — labelling it DIAL is the one thing AC4.6 prevents');

  // ONE DEFINITION, TWO SURFACES — and the assertion is AGREEMENT, not self-comparison.
  //
  // This started as `assert.ok(html.includes(escapeHtml(BLOCKED_OVERRIDE_KEYS.negative)))`,
  // which is a TAUTOLOGY: the expectation is read from the same module the pane renders
  // from, so replacing the reason with `"x"` left it green. Mutation testing caught it
  // (M2 reddened the fence file and left this one untouched) — a check that cannot fail
  // for the reason it claims to protect is worse than no check, because it reports safety.
  //
  // What is actually invariant is that the pane and the boundary cannot DISAGREE. So:
  // assert a PROPERTY the policy has to earn, then assert the two surfaces quote the
  // identical string.
  const api = handleApi('overrides-stage', {
    method: 'POST', body: { overrides: { negative: '' } }, state: { brief: {} },
  });
  assert.equal(api.status, 400, 'the boundary refuses the key the pane withholds');
  const reason = BLOCKED_OVERRIDE_KEYS.negative;
  assert.match(reason, /LAW 3/, 'the reason must NAME the law it protects — a property, not a string');
  assert.ok(reason.length > 60, 'the reason is operator copy, not a log token');
  assert.ok(api.body.error.message.includes(reason),
    'the API refusal must quote the shared reason verbatim');
  assert.ok(html.includes(escapeHtml(reason)),
    'and the pane must render the SAME string — the wireframe cannot disagree with the API');
});

test('every control the editor renders is REGISTERED — no orphan markup', () => {
  const html = renderSlots({ slots: editorSlots(), overrides: {} });
  const ids = [...new Set([...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]))];
  assert.ok(ids.length > 0, 'the editor rendered no controls at all');
  for (const id of ids) {
    const c = CONTROLS.find((x) => x.id === id);
    assert.ok(c, `the editor emits data-control="${id}" which the registry does not declare`);
    assert.ok(['dial', 'proposal'].includes(c.kind), `${id} carries no DIAL/PROPOSAL label`);
  }
  // And the editor's own control must be the REPEATED one. Eleven near-identical
  // registrations would be eleven places to forget when the twelfth slot arrives.
  assert.equal(CONTROLS.find((c) => c.id === 'slots.override').repeated, 'per overridable slot');
});

test('AC1.1 an EMPTY slot still renders its reason — in an editable field, not a dash', () => {
  // Hand-built rather than resolved, because the subject is the RENDER of an empty slot,
  // not which brief happens to empty one. Slot 2 is "often deliberately empty".
  const slots = [
    { key: 'intent', value: 'hero', empty: false, baseline: 'hero', overridden: false },
    {
      key: 'composition', value: '', empty: true,
      emptyReason: 'the brief named no composition', baseline: '', overridden: false,
    },
  ];
  const html = renderSlots({ slots, overrides: {} });
  const tag = EDITABLE_TAGS(html).find((t) => attr(t, 'data-key') === 'composition');
  assert.ok(tag, 'an empty slot must still be EDITABLE — filling it is the point of an override');
  assert.equal(attr(tag, 'value'), '', 'an empty slot renders no value');
  assert.match(attr(tag, 'placeholder'), /the brief named no composition/,
    'the reason goes in the placeholder, so the field explains itself instead of showing a dash');
});

// ---------------------------------------------------------------------------
// The editor reports its own state — staged, and what is NOT staged
// ---------------------------------------------------------------------------

test('the editor reports what is staged, and marks the staged rows', () => {
  const overrides = { light: 'flat overcast light' };
  const html = renderSlots({ slots: editorSlots(overrides), overrides });
  assert.match(html, /<b class="staged">1 staged<\/b>/, 'the button row must say HOW MANY are staged');
  assert.match(html, /class="slot slot--staged"/, 'the staged row must be marked, not just counted');
  const tag = EDITABLE_TAGS(html).find((t) => attr(t, 'data-key') === 'light');
  assert.equal(attr(tag, 'data-staged'), 'true');
  assert.equal(attr(tag, 'value'), 'flat overcast light', 'the field shows the EFFECTIVE value');
  // The BASELINE must travel with it. Without the baseline the client cannot tell
  // "never edited" from "edited back to the resolved value", and an override becomes
  // impossible to remove one field at a time.
  assert.match(attr(tag, 'title'), /resolved value:/,
    'the baseline is carried so editing back to it REMOVES the override instead of pinning it');
});

test('the editor names the slots it is NOT staging', () => {
  const html = renderSlots({ slots: editorSlots(), overrides: {} });
  assert.match(html, /nothing staged — the next compile uses the resolved values/,
    'an unlabelled absence reads as "staged but hidden"');
  assert.doesNotMatch(html, /class="slot slot--staged"/, 'nothing is staged, so nothing is marked');
});

// ---------------------------------------------------------------------------
// End to end: the stage the pane offers is the stage the server keeps
// ---------------------------------------------------------------------------

test('a staged override reaches the next pane render, and RESET takes it back out', async () => {
  await withServer(async ({ get, json }) => {
    const s = await json('overrides-stage', { overrides: { light: 'flat overcast light' } }, TOKEN);
    assert.equal(s.status, 200);
    assert.deepEqual(s.changedKeys, ['light']);
    assert.equal(s.wrote, false, 'staging must never claim to have written anything');

    // The PANE now shows it. This is the half that proves the editor is wired to the
    // stage rather than only to its own DOM — the defect the split test file exists for.
    const pane = await get('/');
    assert.equal(pane.status, 200);
    assert.match(pane.text, /1 staged/, 'the pane must reflect the session stage');
    const staged = EDITABLE_TAGS(pane.text).find((t) => attr(t, 'data-key') === 'light');
    assert.equal(attr(staged, 'data-staged'), 'true', 'the staged row must be marked in the served page');
    assert.equal(attr(staged, 'value'), 'flat overcast light');

    // RESET: the client sends the COMPLETE set it computed, so an empty set clears it.
    const r = await json('overrides-stage', { overrides: {} }, TOKEN);
    assert.deepEqual(r.overrides, {});

    const after = await get('/');
    assert.match(after.text, /nothing staged/);
    assert.doesNotMatch(after.text, /class="slot slot--staged"/, 'RESET must clear the marks too');
  });
});

test('AC3.1 staging an override never mutates the brief text — it is verbatim and immutable', async () => {
  // T-I-01's AC3.1 half: "submit brief, stage overrides, re-read persisted `text` →
  // byte-identical to what was typed". The override layer is the ONE layer that can
  // overwrite a decided value, so this is the invariant worth pinning: staging changes the
  // SLOTS and must not reach Sean's own words. The text is deliberately awkward — quotes,
  // an ampersand, angle brackets and a newline — because "byte-identical" is only a real
  // claim against input that would show up if anything escaped or normalised it.
  const TEXT = 'a "frozen" lake & <b>ice</b> — 4am\nsecond line';
  await withServer(async ({ get, json }) => {
    const d = await json('directions', { text: TEXT, intent: 'hero' }, TOKEN);
    assert.equal(d.status, 200, 'Gate 0 is free and must accept the brief');
    const before = await get('/');
    assert.ok(before.text.includes(escapeHtml(TEXT)),
      'the textarea must carry the text VERBATIM, escaped for the text context');

    const s = await json('overrides-stage', { overrides: { light: 'flat overcast light' } }, TOKEN);
    assert.equal(s.status, 200);

    const after = await get('/');
    assert.ok(after.text.includes(escapeHtml(TEXT)),
      'the brief text changed when an override was staged — the brief is not a dial');
    // And the stage really did happen, or the assertion above would pass on a no-op.
    assert.match(after.text, /1 staged/, 'the stage must have landed, or this test proves nothing');
  });
});

test('the STAGE route refuses negative too — pane and boundary share one policy', async () => {
  await withServer(async ({ json }) => {
    const r = await json('overrides-stage', { overrides: { negative: '' } }, TOKEN);
    assert.equal(r.status, 400);
    assert.equal(r.error.code, 'E_OVERRIDE_KEY_BLOCKED');
    assert.match(r.error.message, /LAW 3/, 'the refusal must name the law it protects');
    // A stage that accepted `negative` while a compile refused it would be a console
    // whose editor offers a key the engine rejects.
    assert.equal(r.overrides, undefined, 'a refused stage must not report a stage it did not set');
  });
});

test('the override stage is behind the token gate', async () => {
  await withServer(async ({ json }) => {
    // `null` as the token means the header is omitted entirely — not sent empty, which
    // would exercise the invalid-token path instead of the missing-token one.
    const r = await json('overrides-stage', { overrides: { light: 'flat overcast light' } }, null);
    assert.equal(r.status, 401, 'staging mutates server state, so it needs the mutation token');
    assert.match(r.error.code, /^E_TOKEN_/, 'and the refusal must say WHICH token problem it is');
  });
});
