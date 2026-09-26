/**
 * shell.mjs — the page shell, and the required states, as functions.
 *
 * THE STATES ARE FUNCTIONS, NOT MARKUP SOMEONE REMEMBERS TO WRITE. `03-INTERFACE.md`
 * §2.6 requires every pane to define ten states, and the copy rule for each is
 * specific: empty names *why* it is empty ("no compiles yet — start in Compose",
 * never a bare "No data"); partial says *"3 of 5 lawChecks shown — the rest failed
 * to load"* and never silently truncates; denied says *"this is a write; the console
 * needs the mutation token"*; failure prints the error code VERBATIM and never
 * "Something went wrong". A state that is a function taking the reason as an
 * argument cannot be rendered without one.
 *
 * `escapeHtml` is applied to every interpolated value without exception. The brief
 * is operator-supplied free text, the compile's `promptText` is generated from it,
 * and a LAW violation's `detail` quotes the offending slot — all three are
 * attacker-shaped input on a loopback origin that a browser will happily run script
 * on. Escaping at the one place that builds markup is the only version of this that
 * survives a new pane.
 */

import { badgeFor, READ_ONLY_PANES } from './controls.mjs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ASTRA_ROOT } from '../core/paths.mjs';

/**
 * THE STYLESHEETS THE SHELL LINKS, IN CASCADE ORDER — and the function that checks the list.
 *
 * THE ORDER IS NOT DECORATION. `.panel--notice` and `.panel` have EQUAL specificity (one
 * class each), so whichever sheet loads last wins on the properties they share. `astra.css`
 * must therefore come first, and a `readdirSync().sort()` would put it last — `'-'` sorts
 * before `'.'` — silently reverting the notice background to the plain panel colour. So the
 * order is stated.
 *
 * AND THE LIST IS VERIFIED RATHER THAN TRUSTED. A hand-kept list of files to load is a list
 * that stops covering the sheet someone adds next slice — the defect A4b found when "every
 * module under 300 lines" turned out to mean "every `.mjs` module, and not the two shipped
 * assets". `stylesheetsOnDisk()` reads the directory, and a test asserts the two agree in
 * both directions. That is what keeps the smoke suite's `overflow-x` scan honest: the scan
 * walks `stylesheetsOnDisk()`, so a new stylesheet is scanned the moment it exists.
 */
export const STYLESHEETS = Object.freeze([
  '/static/astra.css',
  '/static/astra-tune.css',
  '/static/astra-boards.css',
]);

/** Every `.css` in the static root, by URL path. The list the shell's list is checked against. */
export function stylesheetsOnDisk() {
  return readdirSync(join(ASTRA_ROOT, 'static'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => `/static/${f}`)
    .sort();
}

/** Escape for text and attribute contexts. `'` is included because attributes use it. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The DIAL / PROPOSAL badge. `AC4.6` — no control renders without one. */
export function badge(control) {
  const kind = control.kind === 'dial' ? 'dial' : 'proposal';
  return `<span class="badge badge-${kind}" title="${escapeHtml(control.effect)}">${badgeFor(control)}</span>`;
}

/** A control's `data-control` attribute — the hook the registry test walks. */
export const controlAttr = (control) => `data-control="${escapeHtml(control.id)}"`;

export const PANES = Object.freeze([
  { id: 'compose', label: 'COMPOSE', href: '/' },
  { id: 'choose', label: 'CHOOSE', href: '/choose' },
  { id: 'think', label: 'THINK', href: '/think' },
  { id: 'tune', label: 'TUNE', href: '/tune' },
  { id: 'law', label: 'LAW', href: '/law' },
  { id: 'state', label: 'STATE', href: '/state' },
  { id: 'ledger', label: 'LEDGER', href: '/ledger' },
]);

/**
 * The page. `brainVersion` is passed in from `readBrainVersion()` — this module
 * never spells a version, so there is no literal to go stale.
 */
export function layout({ title, activePane, brainVersion, body, note = '', measure = '' }) {
  const rail = PANES.map((p) => {
    const on = p.id === activePane ? ' class="rail-item rail-item--on" aria-current="page"' : ' class="rail-item"';
    return `<li><a href="${p.href}"${on}>${p.label}</a></li>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Astra</title>
${STYLESHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <span class="brand">ASTRA · Design Brain Console</span>
  <span class="topbar-meta">
    <span class="kv">brainVersion <b data-brain-version>${escapeHtml(brainVersion)}</b></span>
    <span class="kv">127.0.0.1</span>
  </span>
</header>
<div class="frame">
  <nav class="rail" aria-label="Panes">
    <ul>${rail}</ul>
  </nav>
  <main id="main" class="pane">
    <div id="api-status" class="state" role="status" aria-live="polite" hidden></div>
${body}
  </main>
</div>
${note ? `<footer class="note">${escapeHtml(note)}</footer>` : ''}
<pre id="measure" hidden aria-hidden="true">${escapeHtml(measure)}</pre>
<script type="module" src="/static/astra.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// §2.6 required states. Each takes its REASON as an argument.
// ---------------------------------------------------------------------------

/** loading — skeleton rows, and it names what is loading. */
export function stateLoading(what) {
  return `<div class="state state-loading" role="status" aria-live="polite">
  <p class="state-line">Loading ${escapeHtml(what)}…</p>
  <div class="skeleton" aria-hidden="true"></div>
  <div class="skeleton skeleton--short" aria-hidden="true"></div>
</div>`;
}

/** empty — the reason it is empty, never a bare "No data". */
export function stateEmpty({ what, reason, action = '' }) {
  return `<div class="state state-empty">
  <p class="state-line"><b>${escapeHtml(what)}</b> — ${escapeHtml(reason)}</p>
  ${action ? `<p class="state-action">${action}</p>` : ''}
</div>`;
}

/** partial — never silently truncate. */
export function statePartial({ shown, total, reason }) {
  return `<div class="state state-partial" role="status">
  <p class="state-line"><b>PARTIAL</b> — ${escapeHtml(shown)} of ${escapeHtml(total)} shown.
  ${escapeHtml(reason)}</p>
</div>`;
}

/** denied — 401/403 explained, and it says what the missing thing is. */
export function stateDenied({ message }) {
  return `<div class="state state-denied" role="alert">
  <p class="state-line"><b>DENIED</b> — ${escapeHtml(message)}</p>
</div>`;
}

/** failure — the error code VERBATIM, plus the offending slot when there is one. */
export function stateFailure({ code, detail = '', slot = null }) {
  return `<div class="state state-failure" role="alert">
  <p class="state-line"><code>${escapeHtml(code)}</code>${slot ? ` at slot <b>${escapeHtml(slot)}</b>` : ''}</p>
  ${detail ? `<p class="state-detail">${escapeHtml(detail)}</p>` : ''}
</div>`;
}

/** validation-error — field-level, and it names the slot. */
export function stateValidation({ field, problem }) {
  return `<p class="field-error" role="alert">${escapeHtml(field)}: ${escapeHtml(problem)}</p>`;
}

/** retry/recovery — ONE action, labelled with what it will redo. */
export function stateRetry({ what, action }) {
  return `<div class="state state-retry">
  <p class="state-line">${escapeHtml(what)}</p>
  <p class="state-action">${action}</p>
</div>`;
}

/** A pane that is not built yet, said plainly rather than left blank. */
export function stateNotBuilt({ pane, slice, what }) {
  return `<div class="state state-empty">
  <p class="state-line"><b>${escapeHtml(pane)}</b> — this pane is not built yet (slice
  ${escapeHtml(slice)}). ${escapeHtml(what)}</p>
</div>`;
}

/**
 * The READ-ONLY BY DESIGN notice, read from `READ_ONLY_PANES`.
 *
 * RENDERED ON THE PANE IT GOVERNS, and read from the registry rather than re-typed. The
 * reason `02-BLUEPRINT.md` §5 gives for the Law pane ("a console with an 'ignore' button
 * here would be the most expensive feature in the product") is a decision, and a decision
 * that lives only in a registry entry is one an operator never sees. A later author who
 * wants to add a control here has to delete the entry that says why they should not — and
 * now they have to delete the sentence on the screen as well.
 *
 * It carries `data-read-only`, NOT `data-control`: the `AC4.6` walk must see zero controls
 * on these panes, and a notice that registered itself as a control would make the
 * structural test in `T-I-07` pass while proving the opposite.
 */
export function readOnlyNotice(pane) {
  const entry = READ_ONLY_PANES.find((p) => p.pane === pane);
  if (!entry) return '';
  return `<section class="panel panel--notice" data-read-only="${escapeHtml(pane)}">
  <h2>READ-ONLY BY DESIGN</h2>
  <p>${escapeHtml(entry.reason)}</p>
</section>`;
}
