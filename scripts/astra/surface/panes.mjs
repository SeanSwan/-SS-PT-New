/**
 * panes.mjs — the Compose, Choose and Think panes, rendered from plain data.
 *
 * THESE FUNCTIONS DO NO I/O AND IMPORT NO BRAIN. The server resolves the data and
 * passes it in, so a pane can be rendered in a test from a literal object — which is
 * how `T-M-03` (a compile record missing `lawChecks` renders as PARTIAL with a
 * banner, never as "0 checks passed") is provable without standing up a server or
 * manufacturing a broken compile.
 *
 * EVERY CONTROL IS EMITTED FROM THE REGISTRY, not hand-written. `controlAttr()` puts
 * the registry id on the element, so `AC4.6`'s test can walk the rendered markup and
 * the registry against each other in both directions. A hand-written control would
 * pass a registry-only test while being absent from the inventory.
 *
 * THE TIER BADGE AND ITS REASON ARE ALWAYS RENDERED TOGETHER. `AC2.2` and the
 * `Direction` contract require `tierReason` to be ALWAYS present precisely so a
 * `prior` card cannot be mistaken for an `evidence` one. Rendering the badge without
 * the reason would leave the distinction to a colour.
 */

import { escapeHtml, badge, controlAttr, stateEmpty, statePartial, stateFailure, stateNotBuilt } from './shell.mjs';
import { CONTROLS, controlsForPane } from './controls.mjs';
// The 12 SLOTS table and its override editor. Imported for LOCAL use AND
// re-exported — `export ... from` alone creates no local binding (bitten 3×).
import { renderSlots } from './paneSlots.mjs';

export { renderSlots };

const byId = (id) => CONTROLS.find((c) => c.id === id);
const ctl = (id) => byId(id) ?? { id, kind: 'dial', effect: 'unregistered control' };

const select = (id, value, options) => {
  const opts = options.map((o) => {
    const on = String(o) === String(value) ? ' selected' : '';
    return `<option value="${escapeHtml(o)}"${on}>${escapeHtml(o)}</option>`;
  }).join('');
  return `<select id="${escapeHtml(id)}" ${controlAttr(ctl(id))}>${opts}</select>`;
};

/** The brief fields. DIALS — they affect one compile and nothing else. */
export function renderBriefForm({ brief = {}, slotOverrides = 0 }) {
  return `<section class="panel" aria-labelledby="brief-h">
  <h2 id="brief-h">BRIEF <span class="muted">verbatim · immutable · rev ${escapeHtml(brief.rev ?? 1)}</span>
    ${badge(ctl('brief.text'))}</h2>
  <label class="sr-only" for="brief-text">Brief text</label>
  <textarea id="brief-text" rows="2" ${controlAttr(ctl('brief.text'))}
    >${escapeHtml(brief.text ?? '')}</textarea>
  <div class="fields">
    <label>intent ${select('brief.intent', brief.intent ?? 'hero', ctl('brief.intent').options)}</label>
    <label>aspect ${select('brief.aspect', brief.aspect ?? '16:9', ctl('brief.aspect').options)}</label>
    <label>surfaceClass ${select('brief.surfaceClass', brief.surfaceClass ?? 'public', ctl('brief.surfaceClass').options)}</label>
    <label>seed <input id="brief-seed" type="text" size="8" value="${escapeHtml(brief.seed ?? 'auto')}"
      ${controlAttr(ctl('brief.seed'))}></label>
  </div>
  <p class="row-actions">
    <button type="button" class="primary" ${controlAttr(ctl('directions.request'))}>Show directions</button>
    <span class="muted">Gate 0 · ZERO COST · nothing generated yet</span>
  </p>
</section>`;
}

/** One direction card. `swatches` are derived from facet NAMES — no generation cost. */
function renderDirection(d, index) {
  const tier = d.tier === 'evidence' ? 'evidence' : 'prior';
  const strip = (d.swatches ?? []).map((s) => `<i class="sw" style="background:${escapeHtml(s.hex)}"
    title="${escapeHtml(s.facet)}"></i>`).join('');
  const ids = (d.evidenceEventIds ?? []).length
    ? `<p class="tier-why muted">picks: ${escapeHtml((d.evidenceEventIds ?? []).join(', '))}</p>` : '';
  return `<article class="card card--${tier}" data-direction-index="${index}">
  <p class="card-tier"><span class="badge badge-${tier}">${tier.toUpperCase()}</span></p>
  <h3>${escapeHtml(d.name)}</h3>
  <p class="card-sentence">${escapeHtml(d.sentence)}</p>
  <p class="card-phenomenon"><b>the ONE impossible thing:</b> ${escapeHtml(d.phenomenon)}</p>
  <div class="swatches" aria-label="facet swatches">${strip}</div>
  <p class="card-palette muted">palette: ${escapeHtml(d.paletteLaw)}</p>
  <p class="tier-why">${escapeHtml(d.tierReason ?? '')}</p>
  ${ids}
  <p class="row-actions">
    <button type="button" ${controlAttr(ctl('direction.choose'))}>CHOOSE</button>
    <button type="button" ${controlAttr(ctl('direction.preview'))}>PREVIEW $</button>
  </p>
</article>`;
}

/**
 * The directions, or an honest empty state.
 *
 * The empty state names the REASON and offers the action that fixes it — §2.6's
 * copy rule. A blank grid here would be the failure mode where the operator cannot
 * tell "not asked yet" from "asked and got nothing".
 */
export function renderDirections({ directions = null, error = null }) {
  if (error) return stateFailure({ code: error.code ?? 'E_DIRECTIONS', detail: error.message ?? '' });
  if (!directions) {
    return stateEmpty({
      what: 'No directions yet',
      reason: 'Gate 0 has not been asked. Nothing has been generated and nothing has been billed.',
      action: `<button type="button" class="primary" ${controlAttr(ctl('directions.request'))}>Show directions</button>`,
    });
  }
  if (directions.length === 0) {
    return stateEmpty({
      what: 'No directions',
      reason: 'the brief resolved to no substantive content, so Gate 0 had nothing to work from. '
        + 'That is a brief problem, not a failure — widen the brief text.',
    });
  }
  const cards = directions.map(renderDirection).join('\n');
  return `<section class="panel" aria-labelledby="dir-h">
  <h2 id="dir-h">DIRECTIONS <span class="muted">Gate 0 · ZERO COST · nothing generated yet</span></h2>
  <div class="cards">${cards}</div>
  <p class="row-actions"><button type="button" ${controlAttr(ctl('direction.noneFit'))}>None of these fit</button></p>
</section>`;
}

/**
 * The Compose screen: brief, then directions, then the slot layer. (§2.1)
 *
 * `renderSlots` lives in `paneSlots.mjs` (Rule 4 split) and is imported for local
 * use AND re-exported below. `overrides` is the staged override map, passed
 * straight through — the pane reports what is staged, it does not decide it.
 */
export function renderCompose({ brief, directions, directionsError, slots, overrides = {} }) {
  return [renderBriefForm({ brief }), renderDirections({ directions, error: directionsError }),
    renderSlots({ slots, overrides })].join('\n');
}

/** One LAW row. `passed: null` is NOT OBSERVED — never rendered as a pass. */
function renderLawCheck(c) {
  const mark = c.passed === true ? '✓' : (c.passed === false ? '✗' : '·');
  const word = c.passed === true ? 'PASS' : (c.passed === false ? 'FAIL' : 'NOT OBSERVED');
  const cls = c.passed === true ? 'pass' : (c.passed === false ? 'fail' : 'unobserved');
  const slot = c.slot ? ` at slot ${escapeHtml(c.slot)}` : '';
  const detail = c.detail ? ` — ${escapeHtml(c.detail)}` : '';
  return `<tr class="law law--${cls}"><td class="mark">${mark}</td><td class="k">${escapeHtml(c.law)}</td>
    <td>${word}${slot}${detail}</td></tr>`;
}

/**
 * The Think pane — the explanation, derived only from the compile record.
 *
 * A blocked or partial view gets a BANNER, not a quieter table. `T-M-03` is explicit
 * that a missing `lawChecks` must never render as "0 checks passed": zero passes and
 * five unobserved checks are different findings, and only one of them is a problem
 * with the compile.
 */
export function renderThink({ view = null, compileId = null, error = null }) {
  if (error) return stateFailure({ code: error.code ?? 'E_EXPLAIN', detail: error.message ?? '' });
  if (!view) {
    return stateEmpty({
      what: 'No compile selected',
      reason: 'this pane explains a compile by id, and none was given',
      action: 'start in <a href="/">Compose</a>',
    });
  }

  const checksReported = Array.isArray(view.lawChecks);
  const checks = checksReported ? view.lawChecks : [];
  const passed = checks.filter((c) => c.passed === true).length;
  const failed = checks.filter((c) => c.passed === false).length;
  const unobserved = checks.filter((c) => c.passed === null).length;

  // A COUNT IS A CLAIM ABOUT COMPLETENESS, so it may only be made when the record can
  // support it. `T-M-03`: an incomplete record that prints "0 run, 0 passed" states a
  // finding the data cannot support — zero passes and five unrun checks are different
  // findings, and only one of them is a problem with the compile. So when the record is
  // partial, or never reported its checks at all, the heading says so and offers no total.
  const lawSummary = () => {
    if (view.partial) return 'counts withheld — this record is PARTIAL';
    if (!checksReported) return 'not reported in this record';
    return `${checks.length} run, ${passed} passed`
      + `${failed ? `, ${failed} FAILED` : ''}${unobserved ? `, ${unobserved} not observed` : ''}`;
  };

  const banner = view.partial
    ? statePartial({
      shown: checks.length,
      total: view.lawChecksExpected ?? 'the full set',
      reason: view.partialReason
        ? escapeHtml(view.partialReason)
        : 'the compile record is incomplete.',
    })
    : '';

  const blockedBanner = view.blocked
    ? stateFailure({
      code: 'E_LAW_VIOLATION',
      detail: 'this compile is blocked. No override is offered here, by design.',
      slot: (checks.find((c) => c.passed === false) || {}).slot ?? null,
    })
    : '';

  const slotRows = (view.slots ?? []).map((s, i) => `<tr><td class="n">${i + 1}</td>
    <td class="k">${escapeHtml(s.key)}</td>
    <td>${s.empty ? `<span class="muted">(${escapeHtml(s.emptyReason ?? 'empty')})</span>` : escapeHtml(s.value)}</td>
  </tr>`).join('');

  const lawRows = checks.map(renderLawCheck).join('');
  // A record that never reported `lawChecks` gets a stated REASON, not an empty table.
  // An empty `<tbody>` renders as nothing, which reads as "all clear".
  const lawTable = checksReported
    ? `<table class="law-table"><tbody>${lawRows}</tbody></table>`
    : `<p class="state-detail">the compile record carries no <code>lawChecks</code> field.
      That is NOT the same as every law passing — it means this record never reported them.</p>`;
  const capRows = Object.entries(view.capabilities ?? {}).map(([k, v]) => {
    // `claimed` is rendered WITH its consequence: the compiler treats it as false.
    const consequence = v === 'claimed' ? ' <span class="muted">→ treated false</span>' : '';
    return `<li><code>${escapeHtml(k)}</code> <b class="cap-${escapeHtml(v)}">${escapeHtml(v)}</b>${consequence}</li>`;
  }).join('');

  return `<header class="pane-head">
  <a href="/">&larr; COMPOSE</a>
  <span class="kv">THINK · compile <code>${escapeHtml(compileId ?? view.compileId ?? '')}</code></span>
  <span class="kv">brainVersion <b data-brain-version>${escapeHtml(view.brainVersion ?? 'unknown')}</b></span>
  <span class="kv">seed ${escapeHtml(view.seed ?? '—')}</span>
  <span class="kv">${escapeHtml(view.provider ?? '—')}</span>
</header>
${blockedBanner}
${banner}
<div class="two-col">
  <section class="panel" aria-labelledby="res-h">
    <h2 id="res-h">RESOLVED SLOTS</h2>
    <table class="slots"><tbody>${slotRows}</tbody></table>
  </section>
  <section class="panel" aria-labelledby="law-h">
    <h2 id="law-h">LAW CHECKS <span class="muted">${escapeHtml(lawSummary())}</span></h2>
    ${lawTable}
    ${view.truncated ? statePartial({
      shown: 'prompt', total: 'full', reason: 'the compiled prompt was truncated — see dropped segments.',
    }) : ''}
    ${capRows ? `<h3>CAPABILITIES <span class="muted">target: ${escapeHtml(view.provider ?? '—')}</span></h3>
      <ul class="caps">${capRows}</ul>` : ''}
  </section>
</div>
<section class="panel" aria-labelledby="prompt-h">
  <h2 id="prompt-h">COMPILED PROMPT</h2>
  <p class="row-actions">
    <button type="button" ${controlAttr(ctl('think.copyPrompt'))}>COPY</button>
    <button type="button" ${controlAttr(ctl('think.whyNot'))}>WHY NOT?</button>
  </p>
  <pre class="prompt">${escapeHtml(view.promptText ?? '')}</pre>
</section>
<section class="panel" aria-labelledby="run-h">
  <h2 id="run-h">THIS RUN</h2>
  <p class="row-actions">
    <span class="kv">outcome: <b>${escapeHtml(view.outcome ?? 'pending')}</b></span>
    <span class="kv">est ${escapeHtml(view.estimatedCents ?? '—')}¢</span>
    <button type="button" ${controlAttr(ctl('think.markRejectedAll'))}>MARK REJECTED-ALL</button>
  </p>
</section>`;
}

/** A pane whose slice has not run yet. Says so, and names the slice. */
export function renderNotBuilt(pane, slice, what) {
  return stateNotBuilt({ pane: pane.toUpperCase(), slice, what });
}

/** Every registry control that claims to be rendered, for the markup cross-check. */
export function renderedControlIds(pane = null) {
  const all = CONTROLS.filter((c) => c.rendered);
  return (pane ? all.filter((c) => c.pane === pane) : all).map((c) => c.id);
}

export { controlsForPane };
