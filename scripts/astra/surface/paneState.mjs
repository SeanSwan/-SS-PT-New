/**
 * paneState.mjs — the State pane: the honest capability board. `T-U-07` / `T-U-08` / `AC5.1`–`AC5.4`.
 *
 * THE PANE'S ONE JOB IS TO NOT OVERSTATE. §2.4's wireframe header says it: *"source: code +
 * config, not prose"*. Every lane row carries the `file:line` that supports its status, and
 * a lane whose marker could not be found renders `INCONCLUSIVE` — never ACTIVE. That is the
 * mechanism `capabilities()` already implements; this file is the surface for it, and it
 * must not soften it. A board that printed a status without its citation would be the same
 * defect as a count with no count behind it.
 *
 * `AC5.4` IS STATED AND MEASURED ON THE PANE, NOT JUST IN A REGISTRY. The requirement is
 * *"no actor enables a REFUSED lane or spec mode"*, and the pane shows the sweep that proves
 * it: `auditEnable()` runs every actor against every lane and reports the attempts that
 * switched something on. It renders the result — an empty list, with the attempt count
 * beside it — because a claim printed on the screen the requirement is about is a claim the
 * next reader can check, and a claim in a test file is one they have to go looking for.
 *
 * ZERO CONTROLS. `READ_ONLY_PANES` carries the reason and it is rendered. There is no
 * toggle here because a toggle here would be the feature the whole slice exists to refuse.
 */

import { escapeHtml, stateFailure, readOnlyNotice } from './shell.mjs';
import { ACTORS, PROPOSE, authorityFor } from '../core/authority.mjs';

/** The status order the board is read in — the wireframe's order, ACTIVE first. */
const STATUS_ORDER = ['ACTIVE', 'REFUSED', 'RETIRED', 'DISABLED', 'INCONCLUSIVE'];

/** One lane row. The citation is rendered on every row, sourced or not. */
function laneRow(row) {
  const sourced = !row.sourceMissing;
  const cite = sourced
    ? `<code class="cite">${escapeHtml(row.source)}</code>`
    : `<span class="muted">no source — ${escapeHtml(row.reason ?? 'marker not found')}</span>`;
  // `gatedBy` is the thing `AC5.4` refuses to let anyone switch on. It is rendered on the
  // row so the refusal on the next section has a named cause rather than a bare status.
  const gate = row.gatedBy ? `<br><span class="muted">gate: ${escapeHtml(row.gatedBy)}</span>` : '';
  return `<tr class="lane lane--${escapeHtml(row.status.toLowerCase())}">
    <td class="k"><code>${escapeHtml(row.lane)}</code></td>
    <td class="lane-status"><b>${escapeHtml(row.status)}</b></td>
    <td class="lane-writes">${escapeHtml(row.writes ?? 'none')}</td>
    <td class="lane-src">${cite}${gate}</td>
  </tr>`;
}

/** One status group. A status with no lanes renders nothing rather than an empty header. */
function laneGroup(status, rows) {
  if (!rows.length) return '';
  const body = rows.map(laneRow).join('');
  return `<h3 class="lane-group">${escapeHtml(status)} <span class="muted">${rows.length}</span></h3>
  <table class="lane-table">
    <thead><tr><th>lane</th><th>status</th><th>writes</th><th>source</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/**
 * The `AC5.4` section — the requirement, and the sweep that proves it.
 *
 * `audit` IS PASSED IN, NOT COMPUTED HERE. The first version called `auditEnable()` with no
 * argument, which defaults to `capabilities()` — so the pane read the board a SECOND time,
 * behind the caller's back, and would have printed a sweep of a different board from the one
 * it was rendering. A5's hostile review proved it by handing this pane a two-lane summary
 * and watching the audit still report sixty attempts. A pane does no I/O, and that includes
 * not re-deriving the data it was given.
 *
 * The two numbers are the claim: `attempted` is every actor against every lane, and
 * `enabled` is the list of attempts that switched something on. Rendering the attempt count
 * beside the empty list is what stops "nothing was enabled" from being an assertion: it says
 * how many ways the claim was tried.
 */
function enableAuditSection(audit) {
  const actors = ACTORS.map((a) => {
    const cell = authorityFor(a, 'enable-spec');
    const note = cell === PROPOSE ? ' (may draft a proposal — that does not switch it on)' : '';
    return `<li><code>${escapeHtml(a)}</code> — <b>${escapeHtml(cell)}</b>${escapeHtml(note)}</li>`;
  }).join('');
  const enabled = audit.enabled.length
    ? `<p class="state-failure">${escapeHtml(audit.enabled.join(', '))} WERE ENABLED — AC5.4 is violated</p>`
    : `<p class="state-detail"><b>0</b> of <b>${audit.attempted}</b> attempts enabled anything.</p>`;
  return `<section class="panel" aria-labelledby="ac54-h">
  <h2 id="ac54-h">AC5.4 <span class="muted">no actor enables a REFUSED lane or spec mode</span></h2>
  <p>Activation requires signed approval outside this surface. This is measured by running
    every actor against every lane, not by reading the table below:</p>
  ${enabled}
  <h3>each actor's authority on enabling spec mode</h3>
  <ul class="authority">${actors}</ul>
</section>`;
}

/**
 * The State pane. PURE — it renders the summary and the audit it is handed, and does no I/O.
 *
 * `summary` is a `summarizeBoard()` result and `audit` an `auditEnable()` result; both are
 * required. Their absence is a NAMED failure, because an empty lane table would read as
 * "nothing is switched on", which is the opposite of the truth and the exact misreading
 * `T-U-07` exists to prevent.
 *
 * `audit` is required rather than defaulted for the reason in `enableAuditSection`: a default
 * would make the pane re-derive the board and render two of them.
 */
export function renderState({ summary = null, audit = null, specMode = null, taste = null, error = null } = {}) {
  if (error) return stateFailure({ code: error.code ?? 'E_STATE_BOARD', detail: error.message ?? '' });
  if (!summary || !audit) {
    return stateFailure({
      code: 'E_STATE_BOARD_UNRESOLVED',
      detail: `the caller did not resolve ${!summary ? 'the capability board' : 'the AC5.4 sweep'}, `
        + 'so there is nothing to cite. This is a programming error, not an empty result — an '
        + 'empty board here would read as "nothing is switched on", and a defaulted sweep would '
        + 'be a second read of the board behind the caller.',
    });
  }
  const groups = STATUS_ORDER
    .map((s) => laneGroup(s, summary.board.filter((r) => r.status === s)))
    .join('');
  const spec = specMode ?? { enabled: false, path: 'scripts/design-brain/config/spec-mode.json' };
  const tasteLine = taste
    ? `swan-taste-brain @ ${taste} · not connected`
    : 'swan-taste-brain · not configured';
  return `<header class="pane-head">
  <span class="kv">STATE · what is actually switched on</span>
  <span class="kv">source: code + config, not prose</span>
  <span class="kv"><b data-lane-count>${summary.board.length}</b> lanes</span>
</header>
<section class="panel" aria-labelledby="lanes-h">
  <h2 id="lanes-h">LANES <span class="muted">each row cites the line that supports it</span></h2>
  ${groups}
  ${summary.inconclusive.length
    ? `<p class="state-partial"><b>UNSOURCED</b> — ${escapeHtml(summary.inconclusive.join(', '))}.
      A status that no line of code supports is not asserted.</p>` : ''}
</section>
<section class="panel" aria-labelledby="mode-h">
  <h2 id="mode-h">SPEC MODE</h2>
  <p class="state-detail">enabled: <b>${escapeHtml(String(spec.enabled))}</b>
    <span class="muted">(${escapeHtml(spec.path)})</span> · no control to change it</p>
  <p class="muted">taste: ${escapeHtml(tasteLine)}</p>
</section>
${enableAuditSection(audit)}
${readOnlyNotice('state')}`;
}
