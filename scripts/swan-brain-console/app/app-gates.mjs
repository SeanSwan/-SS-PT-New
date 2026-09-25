/**
 * app-gates — the Gate Health panel (S4.1).
 * @module scripts/swan-brain-console/app/app-gates
 *
 * WHY THIS PANEL EXISTS
 * The console reports many numbers, and almost all of them can be read as "fine". Gate
 * health is the one place where the ABSENCE of evidence is the finding: a gate that never
 * ran, a result from six months ago, a green result produced by a mock run, and a genuine
 * pass are four different situations that all look like silence from the artifact side.
 * This panel's job is to make that difference impossible to skim past.
 *
 * So the vocabulary is deliberately blunt. `not_run` renders as "NOT RUN" in the unknown
 * tone, never as a blank cell and never in the passing tone. A row that is merely neutral
 * has failed at the panel's only real requirement.
 *
 * BROWSER-SAFE BY CONSTRUCTION: this module imports nothing. It does not reach into
 * `gateHealth.mjs`, because that module reads the filesystem and cannot load in a page.
 * The consequence is that the status vocabulary is defined here and swept against
 * `gateHealth.mjs` by `app-gates.test.mjs`, so drift is caught by a test rather than by a
 * duplicated constant nobody notices.
 *
 * All text is inserted with `textContent`, never `innerHTML` — the values come from repo
 * files, and a console that renders repo content as HTML is a stored-XSS surface.
 */

/** How each status is spelled for an operator. Blunt on purpose. */
export const STATUS_TEXT = Object.freeze({
  pass: 'PASS',
  fail: 'FAIL',
  stale: 'STALE',
  not_run: 'NOT RUN',
  unreadable: 'UNREADABLE',
  not_evidence: 'NOT EVIDENCE',
});

/**
 * How each status is coloured. `unknown` is the tone for "we do not know", and it is
 * deliberately NOT `ok` — the entire defect class this panel addresses is unknown-ness
 * being rendered as success.
 */
export const STATUS_TONE = Object.freeze({
  pass: 'ok',
  fail: 'bad',
  stale: 'warn',
  not_run: 'unknown',
  unreadable: 'bad',
  not_evidence: 'warn',
});

/** The label for a status. An unrecognised status reads as UNKNOWN, never as PASS. */
export function statusText(status) {
  return STATUS_TEXT[status] ?? 'UNKNOWN';
}

/** The tone for a status. An unrecognised status is never the passing tone. */
export function statusTone(status) {
  return STATUS_TONE[status] ?? 'unknown';
}

/**
 * One line an operator can act on.
 *
 * It names how many gates have NO RESULT separately from how many passed, because "2 of 5
 * passing" invites the reader to assume the other three failed, when the more common and more
 * dangerous case is that there was nothing to read.
 *
 * ROUND 15 (Astra K07) — IT USED TO SAY "never ran", AND THAT WAS A CLAIM THIS PANEL CANNOT MAKE.
 * The reader sees a path with no committed result. That is NOT the same as a gate that did not
 * run: `three-worlds-render` is produced by CI, which uploads the artifact and never commits it,
 * so its absence here says nothing about whether it ran. And for a gate whose contract declares no
 * producer at all, no result can EVER appear, so "never ran" describes a state that is not even
 * reachable. Astra's finding was that the internal refusal was honest while this headline was not.
 *
 * So the phrasing is now about what is observable — "no committed result" — and the producerless
 * gates are called out as a subset rather than folded into a count that reads as a failure to run.
 * MUTATION: restore `never ran`. The suite's headline test goes RED.
 */
export function headline(summary = {}) {
  const total = Number(summary.total ?? 0);
  const pass = Number(summary.pass ?? 0);
  const withoutResult = Number(summary.not_run ?? 0);
  const producerless = Number(summary.producerless ?? 0);
  if (total === 0) return 'No gates declared.';
  const base = `${pass} of ${total} gate${total === 1 ? '' : 's'} passing`;
  const parts = [];
  if (withoutResult > 0) parts.push(`${withoutResult} with no committed result`);
  if (producerless > 0) {
    parts.push(`${producerless} of those with no producer declared`);
  }
  return parts.length > 0 ? `${base} — ${parts.join(', ')}` : base;
}

/**
 * Project the report into render rows. Pure, tolerant, and order-preserving.
 *
 * A malformed gate is rendered as an unknown-tone row rather than dropped: silently
 * omitting a gate would hide exactly the thing this panel exists to expose.
 */
export function gateRows(gates) {
  const list = Array.isArray(gates) ? gates : [];
  return list.map((g, i) => {
    const gate = g && typeof g === 'object' ? g : {};
    const id = String(gate.id ?? `gate-${i}`);
    const status = typeof gate.status === 'string' ? gate.status : 'unknown';
    return {
      id,
      label: String(gate.label ?? id),
      path: String(gate.path ?? ''),
      declaredBy: String(gate.declaredBy ?? ''),
      status,
      statusText: statusText(status),
      tone: statusTone(status),
      detail: String(gate.detail ?? ''),
      ageDays: gate.ageDays ?? null,
      /*
       * ROUND 15 (Astra K07). A gate with no declared producer has no result and CANNOT have one,
       * which is a different statement from "there is no result committed here". Carried onto the
       * row so the panel can qualify it; the status stays `not_run` because that is what the
       * reader has.
       */
      producerless: gate.producerless === true,
    };
  });
}

/* ── DOM layer ────────────────────────────────────────────────────────────── */

function node(doc, tag, className, text) {
  const n = doc.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = String(text);
  return n;
}

/**
 * Render the report into `#panel-gate-health`.
 *
 * ROUND 9 (2026-09-20): this used to say "the panel is created by the shell from the
 * `tabs.json` row". It no longer is — `index.html` authors it, because the static no-JS
 * fallback was missing it (and `judge`) entirely, and a panel the shell CREATES also got a
 * "no authored content yet" note rendered above this report. Both are fixed; the panel now
 * arrives from the document in every path.
 *
 * A missing panel still means the registry and the DOM disagree — reported as a value rather
 * than thrown, because a gate panel that takes the page down would be a worse failure than
 * the one it reports.
 */
export function renderGates(gates, doc = document) {
  const panel = doc.getElementById('panel-gate-health');
  if (!panel) return { ok: false, reason: 'panel-gate-health is not in the document' };

  let body = doc.getElementById('gate-body');
  if (!body) {
    body = node(doc, 'div', 'gate-body');
    body.id = 'gate-body';
    panel.append(body);
  }
  body.replaceChildren();

  const summary = gates?.summary ?? {};
  body.append(node(doc, 'p', 'gate-headline', headline(summary)));

  const cards = node(doc, 'div', 'cards');
  for (const key of ['pass', 'fail', 'stale', 'not_run', 'unreadable', 'not_evidence']) {
    const card = node(doc, 'div', `card tone-${statusTone(key)}`);
    card.dataset.gate = key;
    card.append(
      node(doc, 'h3', null, statusText(key)),
      node(doc, 'p', 'value', summary[key] ?? 0),
    );
    cards.append(card);
  }
  body.append(cards);

  /*
   * BOTH classes, and the first one is load-bearing.
   *
   * ROUND 7 (2026-09-20): this was `'gate-table'` alone, and `app.css` styles `.table`. The
   * gate table therefore matched NO rule — no padding, no borders, no header treatment, and
   * not the `@media (max-width: 700px)` rule that turns `.table` into its own horizontal
   * scroller precisely so a six-column table cannot push the page wide. Measured in a real
   * browser: the panel overflowed the document by 63px at 320px and 8px at 375px, and
   * `html { overflow-x: hidden }` made that overflow CLIPPED rather than scrollable.
   *
   * The two tables that were correctly styled (`#doctrine-table`, `#fleet-table`) live in
   * `index.html`, which is the no-JS FALLBACK — so the styled ones were the ones a working
   * console never uses, and the dynamically rendered one was unstyled.
   *
   * `gate-table` stays as a hook: `console-verify.mjs` selects
   * `#panel-gate-health .gate-table tbody tr` to count rows.
   */
  const rows = node(doc, 'table', 'table gate-table');
  const thead = node(doc, 'thead');
  const htr = node(doc, 'tr');
  for (const h of ['Gate', 'Status', 'Why', 'Declared by']) {
    htr.append(node(doc, 'th', null, h));
  }
  thead.append(htr);
  rows.append(thead);

  const tbody = node(doc, 'tbody');
  for (const r of gateRows(gates?.gates)) {
    const tr = node(doc, 'tr', `tone-${r.tone}`);
    tr.dataset.status = r.status;
    tr.dataset.gate = r.id;
    tr.append(
      node(doc, 'td', 'mono', r.label),
      node(doc, 'td', 'gate-status', r.statusText),
      node(doc, 'td', 'tradeoff', r.detail),
      node(doc, 'td', 'mono', r.declaredBy),
    );
    tbody.append(tr);
  }
  rows.append(tbody);
  body.append(rows);

  body.append(node(
    doc,
    'p',
    'note',
    'A gate is only PASS when its result file exists, parses, is inside the freshness '
    + 'window, was not produced by a simulated run, and reports zero failures. Anything '
    + 'else is reported as itself.',
  ));

  return { ok: true, rendered: gateRows(gates?.gates).length };
}

/** Entry point named by the `tabs.json` row. */
export function initGates(gates) {
  try {
    return renderGates(gates);
  } catch (err) {
    return { ok: false, reason: String(err?.message ?? err) };
  }
}
