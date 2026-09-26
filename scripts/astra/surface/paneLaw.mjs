/**
 * paneLaw.mjs — the Law pane: the guardrail board. `T-U-07` (Law half) / `T-I-07`.
 *
 * IT EMITS ZERO CONTROLS, AND THAT IS THE DESIGN, NOT AN OMISSION. `READ_ONLY_PANES` in
 * `controls.mjs` carries the reason and this pane RENDERS it — so the decision is visible
 * on the screen it governs rather than living only in a registry entry a reader would have
 * to go looking for. `T-I-07` asserts the structural half (no control is registered against
 * this pane); this file is the other half (none is emitted).
 *
 * WHY THERE IS NO "ignore this check" BUTTON, STATED ON THE PANE. `02-BLUEPRINT.md` §5: a
 * console with an ignore button here would be the most expensive feature in the product.
 * A failed law blocks the compile, and the fix is the direction — not a dismissal. The pane
 * says so, because an operator who cannot see the reason will eventually add the button.
 *
 * THE CITATION IS RENDERED PER ROW, INCLUDING WHEN IT IS MISSING. A row whose marker could
 * not be found renders as `INCONCLUSIVE` with the reason — never as ENFORCED. That is the
 * whole point of the board: it is a citation, so a citation that does not resolve has to
 * look different from one that does. A table that printed six green ticks from a hand-typed
 * count would be the defect this engagement spent itself on.
 */

import { escapeHtml, stateFailure, readOnlyNotice } from './shell.mjs';

/** One law row. A row with no resolved source is NOT rendered as enforced. */
function renderLawRow(row) {
  const sourced = !row.sourceMissing;
  const cls = sourced ? 'enforced' : 'inconclusive';
  const mark = sourced ? '✓' : '·';
  const word = sourced ? 'ENFORCED' : 'INCONCLUSIVE';
  const citation = sourced
    ? `<code class="cite">${escapeHtml(row.source)}</code>`
    : `<span class="muted">no source — ${escapeHtml(row.reason ?? 'marker not found')}</span>`;
  return `<tr class="law law--${cls}">
    <td class="mark">${mark}</td>
    <td class="k"><code>${escapeHtml(row.law)}</code></td>
    <td>${escapeHtml(row.protects)}</td>
    <td class="law-why">${escapeHtml(row.onFailure)}</td>
    <td class="law-src"><b class="law-status law-status--${cls}">${word}</b><br>${citation}</td>
  </tr>`;
}

/**
 * The Law pane. PURE — it renders the board it is handed and does no I/O.
 *
 * `board` is required, and its absence is a NAMED failure rather than an empty table. An
 * empty `<tbody>` renders as nothing, which reads as "no laws" — and "no laws are enforced"
 * is the one thing this pane must never imply. The caller resolves the board; this file
 * only decides what it looks like.
 */
export function renderLaw({ board = null, error = null } = {}) {
  if (error) return stateFailure({ code: error.code ?? 'E_LAW_BOARD', detail: error.message ?? '' });
  if (!board) {
    return stateFailure({
      code: 'E_LAW_BOARD_UNRESOLVED',
      detail: 'the caller did not resolve the law board, so there is nothing to cite. This is a '
        + 'programming error, not an empty result — an empty table here would read as "no laws".',
    });
  }
  return renderLawBoard(board);
}

function renderLawBoard(board) {
  const { byStatus, killList, covered } = board;
  const enforced = byStatus.ENFORCED ?? 0;
  const rows = board.board.map(renderLawRow).join('');
  const entries = killList.entries.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
  const killCite = killList.sourceMissing
    ? `<span class="muted">no source — ${escapeHtml(killList.reason ?? 'marker not found')}</span>`
    : `<code class="cite">${escapeHtml(killList.source)}</code>`;
  return `<header class="pane-head">
  <span class="kv">LAW · the guardrail board</span>
  <span class="kv">source <code>shared/swanLawFilter.mjs</code></span>
  <span class="kv"><b data-law-enforced>${enforced}</b> of ${board.board.length} enforced</span>
</header>
<section class="panel" aria-labelledby="law-h">
  <h2 id="law-h">LAWS <span class="muted">${escapeHtml(enforced)} of ${board.board.length} with a
    resolved enforcement site</span></h2>
  <table class="law-table law-table--board">
    <thead><tr><th></th><th>law</th><th>protects</th><th>on failure</th><th>enforcement site</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>
<section class="panel" aria-labelledby="kill-h">
  <h2 id="kill-h">LAW 3 KILL-LIST <span class="muted">${killList.count} families</span></h2>
  <p class="state-detail">Definition: ${killCite}</p>
  <ul class="kill-list">${entries}</ul>
  <p class="muted">The negative slot must still name at least one of these. An override that
    empties the slot deletes the law, so <code>negative</code> is not an overridable key.</p>
</section>
${readOnlyNotice('law')}
<p class="muted pane-foot">Order and coverage come from <code>LAW_NAMES</code>:
  ${escapeHtml(covered.join(', '))}.</p>`;
}
