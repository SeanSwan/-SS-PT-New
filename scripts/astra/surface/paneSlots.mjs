/**
 * paneSlots.mjs — the 12 SLOTS table, and the OVERRIDE EDITOR on it.
 *
 * SPLIT FROM `panes.mjs` for Rule 4, at the seam that file already uses for
 * `paneTune.mjs`: one pane's markup, in its own module. It is imported for local
 * use AND re-exported from `panes.mjs`, so every existing caller keeps its import
 * path — and because `export ... from` alone binds nothing locally.
 *
 * WHY THIS IS AN EDITOR AND NOT A READ-OUT. `01-REQUIREMENTS.md` §4 names three
 * legal dials, and `slotOverrides` is one of them — but until now the surface drew
 * the twelve slots as read-only cells while the registry advertised a
 * `[STAGE OVERRIDES]` button. That is a DEAD CONTROL: it takes focus, announces a
 * name, and does nothing. Worse, the layer it names is the one layer
 * `resolveSlots` applies LAST, so it is the only thing in the system that can
 * overwrite a decided value. A dial that powerful should not be invisible.
 *
 * `negative` IS NOT EDITABLE, AND THE PANE SAYS SO. Slot 11 carries LAW 3's
 * kill-list. `03-INTERFACE.md` §2.1 draws it as `(kill-list applied)` rather than
 * as a value, and the policy that refuses it lives in ONE place —
 * `core/overrides.mjs` — which this pane and the API both read. The wireframe and
 * the API therefore cannot disagree about which keys are on offer; the reason
 * rendered here is the same string the 400 returns.
 *
 * AN EMPTY SLOT STILL RENDERS ITS REASON (`AC1.1`). Slot 2 is *"often deliberately
 * empty"* per the contract, and the reason now lives in the input's `placeholder`
 * so an editable field can still explain itself rather than showing a dash.
 */

import { escapeHtml, badge, controlAttr, stateEmpty } from './shell.mjs';
import { CONTROLS } from './controls.mjs';
import { BLOCKED_OVERRIDE_KEYS, overridableKeys } from '../core/overrides.mjs';

const byId = (id) => CONTROLS.find((c) => c.id === id);
const ctl = (id) => byId(id) ?? { id, kind: 'dial', effect: 'unregistered control' };

/**
 * One editable slot row.
 *
 * `data-baseline` is the value resolved WITHOUT any override. The client diffs
 * against it to compute the complete override set, which is what makes editing a
 * slot BACK to its resolved value remove the override rather than pin it.
 */
function editableRow(s, index) {
  const staged = s.overridden === true;
  const value = s.empty ? '' : String(s.value ?? '');
  const placeholder = s.empty ? `(${s.emptyReason ?? 'empty — no reason recorded'})` : '';
  // The baseline is carried as a TITLE, not as a fourth column of text. It was text
  // first, and it broke `T-A-01`: the resolved value of `light` is a whole sentence,
  // so a `white-space: nowrap` cell pushed the table past 360px and the surface
  // overflowed horizontally. The baseline is reference information — hover is the
  // right affordance for it, and the column keeps its width.
  const title = staged ? `resolved value: ${s.baseline ?? ''}` : '';
  return `<tr class="slot${staged ? ' slot--staged' : ''}">
  <td class="n">${index + 1}</td>
  <td class="k">${escapeHtml(s.key)}</td>
  <td><input type="text" class="slot-input" ${controlAttr(ctl('slots.override'))}
    data-key="${escapeHtml(s.key)}" data-baseline="${escapeHtml(s.baseline ?? '')}"
    data-staged="${staged ? 'true' : 'false'}"
    value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"
    title="${escapeHtml(title)}"
    aria-label="${escapeHtml(s.key)} override"></td>
  <td class="slot-state">${staged ? '<b class="staged">staged</b>' : '<span class="muted">resolved</span>'}</td>
</tr>`;
}

/**
 * A slot that is NOT overridable. Rendered as a value-less, control-less cell.
 *
 * It carries no `data-control`, because it is not a control — registering it
 * would mean labelling a read-out `DIAL`, which is the thing `AC4.6` exists to
 * prevent. The reason is rendered, not implied.
 */
function lockedRow(s, index) {
  const reason = BLOCKED_OVERRIDE_KEYS[s.key];
  return `<tr class="slot slot--locked">
  <td class="n">${index + 1}</td>
  <td class="k">${escapeHtml(s.key)}</td>
  <td class="slot-locked" title="${escapeHtml(reason)}">(kill-list applied)
    <span class="muted">— not editable</span></td>
  <td class="slot-state"><span class="muted">locked</span></td>
</tr>`;
}

/**
 * The 12 slots and the override editor.
 *
 * @param {{slots: Array|null, overrides?: Record<string,string>}} args
 *   `slots` are the RESOLVED slots (already carrying any staged override), each
 *   with `baseline` = the value before overrides. `overrides` is the staged map,
 *   used only to report what is staged in the button row.
 */
export function renderSlots({ slots = null, overrides = {} } = {}) {
  const stage = ctl('slots.stageOverrides');
  const reset = ctl('slots.reset');
  const heading = `<h2 id="slots-h">12 SLOTS <span class="muted">the override layer — the brief above never changes</span></h2>`;

  if (!slots || slots.length === 0) {
    return `<section class="panel" aria-labelledby="slots-h">
  ${heading}
  ${stateEmpty({
    what: 'No slot values yet',
    reason: 'slots are resolved by a compile, and nothing has been compiled in this session',
  })}
</section>`;
  }

  const canOverride = new Set(overridableKeys(slots.map((s) => s.key)));
  const rows = slots.map((s, i) => (canOverride.has(s.key) ? editableRow(s, i) : lockedRow(s, i))).join('\n');
  const stagedKeys = Object.keys(overrides);
  const state = stagedKeys.length
    ? `<b class="staged">${stagedKeys.length} staged</b> <span class="muted">${escapeHtml(stagedKeys.join(', '))}</span>`
    : '<span class="muted">nothing staged — the next compile uses the resolved values</span>';

  return `<section class="panel" aria-labelledby="slots-h">
  ${heading}
  <p class="slot-intro muted">${badge(ctl('slots.override'))} edit a value and press STAGE OVERRIDES.
    Only the overridden slots change; the brief text above is never touched.</p>
  <table class="slots slots--editable"><tbody>${rows}</tbody></table>
  <p class="row-actions">
    <button type="button" ${controlAttr(stage)}>STAGE OVERRIDES</button>
    <button type="button" ${controlAttr(reset)}>RESET</button>
    <span class="slot-staged-summary">${state}</span>
  </p>
  <p class="state-detail muted">${escapeHtml(BLOCKED_OVERRIDE_KEYS.negative)}</p>
</section>`;
}
