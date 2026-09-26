/**
 * paneTune.mjs — the Tune pane. Slice A4.
 *
 * A SIBLING MODULE RATHER THAN AN ADDITION TO panes.mjs, which sits at 289 of Rule 4's 300
 * lines. `renderNotBuilt` is re-exported from `panes.mjs` below because `export … from`
 * alone creates no local binding — the house pattern, recorded in A3's landing record after
 * it bit three times.
 *
 * THE THREE STATES ARE VISUALLY DISTINCT, and that is the pane's whole job:
 *   LIVE    — matches disk, nothing staged. The header says so.
 *   STAGED  — differs from disk, NOT written. The header carries the count.
 *   COMMITTED — the write landed, and the prior bytes are recorded.
 * A pane that showed a staged number in the same style as a live one would be a pane where
 * the operator cannot tell whether they have changed the engine's tuning.
 *
 * THE PREVIEW COLUMN IS WHY THE FIXTURE EXISTS. `auto.S 0.82 → 0.86` is a number; "auto-merges
 * 1/12 → 0/12 (−1)" is a consequence. `AC4.2` requires the preview to run against a fixed
 * fixture set precisely so the operator sees the second thing before committing the first.
 *
 * THE BLAST RADIUS IS RENDERED AS A WARNING, NOT A COLUMN. `auto.` and `weights.` feed the
 * auto-corroboration gate — the one automated write to canon-adjacent state — so a staged
 * change touching them gets an explicit ⚠ block naming the consequence. `T-I-05` requires it.
 */

import { escapeHtml, badge, controlAttr, stateEmpty, stateFailure } from './shell.mjs';
import { CONTROLS } from './controls.mjs';
import { renderNotBuilt } from './panes.mjs';

const byId = (id) => CONTROLS.find((c) => c.id === id);
const ctl = (id) => byId(id) ?? { id, kind: 'dial', effect: 'unregistered control' };

/** The knob rows the operator can see, in the order the config declares them. */
export const KNOB_ORDER = Object.freeze([
  'auto.S', 'auto.O', 'auto.margin', 'auto.minTokens',
  'mergeBand.low',
  'weights.jaccard', 'weights.overlap', 'weights.trigram',
  'novelty.window', 'novelty.productive', 'novelty.tappedOut',
  'novelty.minKnownClaims', 'novelty.minWindowReceipts',
]);

/** Is this key's family one that can move state without human review? */
const isGate = (key) => key.startsWith('auto.') || key.startsWith('weights.');

const fmt = (v) => (typeof v === 'number' ? String(v) : JSON.stringify(v));

/**
 * One knob row.
 *
 * THE STAGED CELL IS AN INPUT, and that is not decoration. `03-INTERFACE.md` §2.3's flow
 * diagram has `T2[Sean edits knobs]`, and `01-REQUIREMENTS.md` AC4.1 calls this surface
 * "the knob editor". A4 first shipped the knob values as read-only text, which made the
 * registry's `tuning.knob` (declared `element: 'input'`, `rendered: true`, `repeated:
 * 'per knob'`) a claim the markup did not support — and made the pane a display rather
 * than an editor. The cross-check in `a3-surface.test.mjs` caught it, in the direction
 * that test exists to catch: declared-rendered and never found.
 *
 * The input goes in the STAGED column because that is what it edits. Its `value` is the
 * staged value when one exists and the live value otherwise, which is exactly what the
 * spec's mock shows (`0.86` staged, `0.60` unchanged).
 *
 * `step` follows the live value's type: `1` for the integer knobs, `0.01` for the floats.
 * A number input that rejects the engine's own precision would be a form that cannot
 * express a legal value.
 *
 * `effect` is the whole-fixture consequence of the STAGED patch, shown only on rows that
 * are actually staged — a number repeated on thirteen rows reads as noise and would
 * imply each knob independently produces the same count.
 */
function knobRow(key, current, staged, preview) {
  const isStaged = Object.hasOwn(staged, key);
  const next = isStaged ? staged[key] : current;
  const step = typeof current === 'number' && !Number.isInteger(current) ? '0.01' : '1';
  const stagedCell = `<input type="number" class="knob-input" data-key="${escapeHtml(key)}"
      step="${step}" value="${escapeHtml(fmt(next))}" data-current="${escapeHtml(fmt(current))}"
      aria-label="${escapeHtml(key)} staged value" ${controlAttr(ctl('tuning.knob'))}>`
    + (isStaged ? ' <b class="staged">staged</b>' : '');

  let effect = '<span class="muted">unchanged</span>';
  if (isStaged && preview) {
    const before = preview.current.bands.auto;
    const after = preview.staged.bands.auto;
    const delta = after - before;
    const sign = delta === 0 ? 'no change' : `${delta > 0 ? '+' : ''}${delta}`;
    effect = `auto-merges <b>${before}/12</b> → <b>${after}/12</b>`
      + ` <span class="${delta === 0 ? 'muted' : 'delta'}">(${sign})</span>`;
  }

  return `<tr class="knob${isStaged ? ' knob--staged' : ''}${isGate(key) ? ' knob--gate' : ''}">
    <td class="k"><code>${escapeHtml(key)}</code>${isGate(key) ? ' <span class="gate-mark" title="feeds the auto-corroboration gate">⚠</span>' : ''}</td>
    <td class="n">${escapeHtml(fmt(current))}</td>
    <td class="n">${stagedCell}</td>
    <td class="fx">${effect}</td>
  </tr>`;
}

/** The blast-radius block: the consequence, named, before anything is written. */
function blastBlock(preview, stagedKeys) {
  if (stagedKeys.length === 0) {
    return '<p class="muted">nothing staged — no blast radius to report</p>';
  }
  const rows = (preview?.blastRadius ?? []).map((b) => `<li>
    <b>${escapeHtml(b.family)}</b>${b.gate ? ' <span class="gate-mark">⚠</span>' : ''}
    — ${escapeHtml(b.affects)}</li>`).join('');
  return `<div class="blast${(preview?.blastRadius ?? []).some((b) => b.gate) ? ' blast--gate' : ''}">
    <p class="blast-h"><b>⚠ BLAST RADIUS</b> ${escapeHtml(String(stagedKeys.length))} knob(s) staged</p>
    <ul>${rows}</ul>
  </div>`;
}

/**
 * The Tune pane.
 *
 * `state` is the server's per-session view: `{ staged, note, lastCommit }`. This function
 * does no I/O and imports no brain beyond the registry, so a test can render every state
 * from a literal.
 */
export function renderTune({
  current = {}, staged = {}, note = '', preview = null, lastCommit = null,
  error = null, path = null, order = KNOB_ORDER,
} = {}) {
  if (error) return stateFailure({ code: error.code ?? 'E_TUNING', detail: error.message ?? '' });

  const keys = Object.keys(current);
  if (keys.length === 0) {
    return stateEmpty({
      what: 'No knobs read',
      reason: 'the config produced no leaf keys, so there is nothing to tune. '
        + 'That is a config problem, not an empty state.',
      action: 'check <code>scripts/design-brain/config/tuning.json</code>',
    });
  }

  const stagedKeys = Object.keys(staged);
  const stateWord = stagedKeys.length > 0 ? `STAGED (${stagedKeys.length})` : 'LIVE';
  const stateClass = stagedKeys.length > 0 ? 'staged' : 'live';

  // Render in the declared order, then anything the config has that the order does not know
  // about — an unlisted knob is exactly the case where the operator most needs to see it.
  const known = order.filter((k) => Object.hasOwn(current, k));
  const extra = keys.filter((k) => !order.includes(k));
  const rows = [...known, ...extra].map((k) => knobRow(k, current[k], staged, preview)).join('');

  // THE TEXTAREA CARRIES ITS OWN ID, NOT `tuning.stage`'s. A4 first wrote
  // `controlAttr(ctl('tuning.stage'))` here, which was inert while the client had no
  // `tuning.stage` handler — and became a live hazard the moment one was added: the
  // client's dispatcher is `closest('[data-control]')`, so a CLICK INTO THE NOTE FIELD
  // would have fired the stage action. The field is a control in its own right, and the
  // registry now says so.
  const noteBlock = `<label class="note-label" for="tuning-note">NOTE <span class="muted">(required —
    the commit is refused without one)</span></label>
  <textarea id="tuning-note" rows="2" ${controlAttr(ctl('tuning.note'))}
    placeholder="why this change, so a future reader can review it">${escapeHtml(note)}</textarea>`;

  const priorLine = lastCommit
    ? `<span class="kv prior">prior values recorded ✓ <code>${escapeHtml(lastCommit.hashBefore.slice(0, 12))}</code> → <code>${escapeHtml(lastCommit.hashAfter.slice(0, 12))}</code></span>`
    : '<span class="muted">no commit yet in this session — nothing recorded</span>';

  return `<header class="pane-head">
  <a href="/">&larr; COMPOSE</a>
  <span class="kv">TUNE · <code>${escapeHtml(path ?? 'config/tuning.json')}</code> ${badge(ctl('tuning.knob'))}</span>
  <span class="kv">state: <b class="state-${stateClass}">${escapeHtml(stateWord)}</b></span>
  <span class="kv">fixture set: <b>${escapeHtml(String(preview?.fixture?.pairs ?? 12))}</b> pairs</span>
</header>

<section class="panel" aria-labelledby="knobs-h">
  <h2 id="knobs-h">KNOBS <span class="muted">staged values are NOT written until you commit</span></h2>
  <table class="knobs">
    <thead><tr><th>KNOB</th><th>CURRENT</th><th>STAGED</th><th>PREVIEW EFFECT (fixture set: 12 pairs)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>

${blastBlock(preview, stagedKeys)}

<section class="panel" aria-labelledby="note-h">
  <h2 id="note-h">NOTE</h2>
  ${noteBlock}
  <p class="row-actions">
    <button type="button" ${controlAttr(ctl('tuning.stage'))}>PREVIEW</button>
    <button type="button" class="primary" ${controlAttr(ctl('tuning.commit'))}>COMMIT (atomic + note)</button>
    <button type="button" ${controlAttr(ctl('tuning.discard'))}>DISCARD STAGE</button>
    <button type="button" ${controlAttr(ctl('tuning.revert'))}>REVERT TO PRIOR</button>
    ${priorLine}
  </p>
</section>`;
}

export { renderNotBuilt };
