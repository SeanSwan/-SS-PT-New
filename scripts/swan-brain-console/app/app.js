/*
 * Swan Brain Console — client behaviour.
 * @module scripts/swan-brain-console/app/app
 *
 * Renders the read-only snapshot from /api/state. No framework, no build step.
 *
 * Two deliberate choices:
 *   1. All text is inserted with textContent, never innerHTML. The values shown
 *      come from repo files, and a console that renders repo content as HTML is a
 *      stored-XSS surface the moment someone commits a stray tag.
 *   2. The active tab is real ARIA: roving tabindex, arrow-key navigation, and
 *      aria-selected maintained. A tab strip that only responds to clicks is
 *      unusable by keyboard, which the QA gates forbid.
 */

import { initShell } from './app-shell.js';
import { initJudge } from './app-judge.js';
import { initGates } from './app-gates.mjs';
import { planBanner, applyBanner } from './app-banner.mjs';

const el = (id) => document.getElementById(id);

/**
 * The ONE place the banner is written (round 11, finding F08).
 *
 * The shell used to write it too, and this file then overwrote it, so a registry failure
 * vanished the moment the snapshot arrived. Every caller now CONTRIBUTES a message and
 * `planBanner` composes them; nothing here assigns the element directly.
 */
function renderBanner(parts) {
  return applyBanner(document, planBanner(parts));
}

/** Create an element with text-safe content. */
function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = String(text);
  return n;
}

function card(label, value, note, warn = false, key = null) {
  const c = node('div', warn ? 'card warn' : 'card');
  // A stable machine-readable key. The verifier used to read this card by POSITION
  // (`.nth(2)`) and then assert on the CHARACTER '0' anywhere in its text — which
  // accepts a collision count of 10, 20, or any other number containing a zero.
  // Publishing the value under a named attribute lets the check assert the number.
  if (key) c.dataset.card = key;
  c.append(node('h3', null, label), node('p', 'value', value));
  if (note) c.append(node('p', 'note', note));
  return c;
}

/* ── Tab controller ─────────────────────────────────────────────────────────
 * MOVED TO `app-shell.js` (S3). The strip used to be a hardcoded 8-item literal
 * here, which made adding a panel a two-file edit in the shell. It is now built from
 * `tabs.json`, so a new panel is one registry row — see `app-shell.js` for the pure
 * planning functions and the ARIA roving-tabindex implementation that replaced this.
 *
 * The static `<button>` list in `index.html` is kept as a NO-JS FALLBACK and is
 * replaced at boot. `app-shell.test.mjs` asserts every fallback button has a registry
 * row, so the two cannot silently drift apart.
 */

/* ── Renderers ────────────────────────────────────────────────────────────── */
function renderStatus(state, shell) {
  el('stat-doctrine').textContent = `${state.doctrine.presentCount}/${state.doctrine.declaredCount}`;
  el('stat-fleet').textContent = String(state.fleet.summary.total);
  el('stat-archetypes').textContent = String(state.doctrine.archetypes.count);
  const engine = el('stat-engine');
  engine.textContent = state.engine.durableWrites;
  engine.classList.toggle('blocked', state.engine.durableWrites !== 'DECLARED_BLOCKED' && state.engine.durableWrites !== 'VERIFIED_BLOCKED');

  // The shell's registry errors ride along rather than being overwritten — see `renderBanner`.
  renderBanner({ shellErrors: shell?.errors ?? [], snapshot: state });
}

function renderDoctrine(state) {
  const wrap = el('doctrine-archetypes');
  wrap.replaceChildren();
  const a = state.doctrine.archetypes;
  /*
   * `status`, NOT `present` (round 11, finding F17). The old note was
   * `a.present ? \`generated from ${a.generatedFrom}\` : 'index.json missing'`, and a parse
   * failure reported `present: true` — so a CORRUPT catalogue rendered as
   * "Archetypes | 0 | generated from undefined": no warning, and a zero an operator would read
   * as "the routing table is empty" rather than "the file could not be parsed". The error is now
   * what gets shown, because it is the only thing that says which of the two it is.
   */
  wrap.append(card(
    'Archetypes',
    a.count,
    a.status === 'ok' ? `generated from ${a.generatedFrom}` : (a.error ?? `archetype table is ${a.status}`),
    a.status !== 'ok',
  ));
  wrap.append(card('Doctrine lines', state.doctrine.totalLines, 'across the canonical documents'));
  const spec = state.doctrine.engineConfig;
  wrap.append(card(
    'Spec mode',
    spec.specModeEnabled === null ? 'unknown' : String(spec.specModeEnabled),
    spec.specModeEnabled === false ? 'engine spec persistence is disabled' : 'verify before relying on it',
    spec.specModeEnabled !== false,
  ));
  for (const rel of a.relevant ?? []) {
    wrap.append(card(`#${rel.n} ${rel.id}`, `motion ${rel.motion}`, rel.thesis));
  }

  const rows = el('doctrine-rows');
  rows.replaceChildren();
  for (const f of state.doctrine.files) {
    const tr = node('tr');
    tr.append(
      node('td', 'mono', f.path.replace('docs/ai-workflow/design-brain/', '')),
      node('td', 'tradeoff', f.role),
      node('td', 'mono', f.lines),
      node('td', 'mono', f.headings),
      node('td', f.present ? '' : 'missing', f.present ? 'present' : 'MISSING'),
    );
    rows.append(tr);
  }
}

function renderFleet(state) {
  const s = state.fleet.summary;
  const wrap = el('fleet-summary');
  wrap.replaceChildren();
  wrap.append(card('Variants', s.total, `${s.variantDirs} component dirs on disk`));
  wrap.append(card('Distinct nav models', s.navModels, `grids: ${s.grids} · hero mechanics: ${s.mechanics}`));
  wrap.append(card(
    'Fingerprint collisions',
    state.fleet.collisions.length,
    state.fleet.collisions.length ? state.fleet.collisions.join('; ') : 'every tuple is unique',
    state.fleet.collisions.length > 0,
    'collisions',
  ));
  wrap.append(card('Wildcards', s.wildcards, s.wildcardId ? `alien seed on ${s.wildcardId}` : 'none', s.wildcards !== 1));
  wrap.append(card('Reference lane', s.referenceDisclosure, 'Mobbin connector registered but not callable in this runtime', true));

  const rows = el('fleet-rows');
  rows.replaceChildren();
  for (const v of state.fleet.rows) {
    const tr = node('tr');
    const title = node('td', 'mono', v.title);
    if (v.wildcard) title.append(node('div', 'wild', `wildcard: ${v.wildcard}`));
    if (!v.hasDir) title.append(node('div', 'missing', 'component dir missing'));
    tr.append(
      node('td', 'id', v.id),
      title,
      node('td', 'mono', v.nav_model),
      node('td', 'mono', v.hero_mechanics),
      node('td', 'mono', v.grid),
      node('td', 'tradeoff', v.tradeoff || 'MISSING TRADEOFF'),
    );
    rows.append(tr);
  }
}

function renderCanvas(state) {
  const wrap = el('canvas-rounds');
  wrap.replaceChildren();
  const rows = state.fleet.rows;
  const size = 5;
  for (let i = 0; i < rows.length; i += size) {
    const round = node('div', 'round');
    const slice = rows.slice(i, i + size);
    round.append(node('h3', null, `Round ${i / size + 1} of ${Math.ceil(rows.length / size)} — ${slice.length} artboards`));
    const board = node('div', 'board');
    for (const v of slice) {
      const art = node('div', 'artboard');
      art.append(
        node('h4', null, `${v.id} ${v.title}`),
        node('p', 'tuple', `${v.nav_model} · ${v.hero_mechanics} · ${v.grid}`),
        node('p', 'tnote', v.tradeoff || 'no tradeoff recorded'),
      );
      board.append(art);
    }
    if (slice.length < size) {
      const ghost = node('div', 'artboard ghost', 'Shared plate manifest — what all artboards in this round hold constant.');
      board.append(ghost);
    }
    round.append(board);
    wrap.append(round);
  }
}

async function renderCopy(state) {
  const wrap = el('copy-body');
  wrap.replaceChildren();
  const pack = state.copy ?? {};
  const head = node('div', 'cards');
  head.append(
    card('Variants with copy', (pack.variants ?? []).length, 'every variant resolves a headline and subhead'),
    card('Control headline', pack.shared?.headline ?? '—', 'held constant so structure is what gets judged'),
    card('Overridden headlines', (pack.variants ?? []).filter((v) => v.overridden).length, 'variants whose conceit changes the words'),
    card('Stat source', pack.statsModule ?? 'unknown', 'figures resolve from the canonical marketing module', pack.statsModule !== 'marketingStats'),
  );
  wrap.append(head);

  const list = pack.variants ?? [];
  if (!list.length) {
    wrap.append(node('p', 'planned', 'Copy pack could not be read from disk. See the receipt for the exact path.'));
    return;
  }
  for (const v of list) {
    const item = node('div', 'copy-item');
    item.append(
      node('p', 'hl', `${v.id} — ${v.headline}`),
      node('p', 'sb', v.sub),
      node('p', 'nt', v.note),
    );
    wrap.append(item);
  }
}

function renderEngine(state) {
  const wrap = el('engine-body');
  wrap.replaceChildren();

  const gate = node('div', 'gate');
  gate.append(
    node('h3', null, `Durable writes: ${state.engine.durableWrites}`),
    node('p', 'quote', state.engine.reason),
    node('p', null, 'The engine README is the authority for this state; the console echoes it rather than paraphrasing.'),
  );
  const ul = node('ul', 'nolist');
  ul.append(node('li', null, 'Source modules present: ' + state.engine.sourceFiles));
  ul.append(node('li', null, 'Test files present: ' + state.engine.testFiles));
  ul.append(node('li', null, 'README present: ' + String(state.engine.readmePresent)));
  ul.append(node('li', null, 'Write controls exposed by this console: ' + state.engine.writeControls.length));
  gate.append(ul);
  wrap.append(gate);

  const cards = node('div', 'cards');
  /*
   * `null` MEANS UNKNOWN AND IS SPOKEN AS SUCH (round 11, finding F17). This read
   * `String(state.doctrine.engineConfig.specModeEnabled)`, so a missing config directory —
   * which reported the key as absent — printed the literal string `undefined` as if it were a
   * value. The key is always present now, and `null` renders as `unknown`.
   */
  const specMode = state.doctrine.engineConfig.specModeEnabled;
  cards.append(
    card('Archetypes', state.doctrine.archetypes.count, 'routing table the atelier loop reads first'),
    card('Doctrine docs', `${state.doctrine.presentCount}/${state.doctrine.declaredCount}`, 'present on disk'),
    card('Spec mode', specMode === null ? 'unknown' : String(specMode), 'spec persistence is disabled by policy', true),
  );
  wrap.append(cards);
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */
async function boot() {
  /*
   * `initShell()` IS INSIDE THE TRY (round 11, finding F08). It used to be awaited before it,
   * so anything it threw escaped `boot()` entirely: no banner, no status, an unhandled
   * rejection, and a page that looked merely empty. The shell is the thing most likely to fail
   * on a broken registry, and it was the one step whose failure had no reporting path.
   *
   * `shell` is declared first so the catch can still report a registry problem it did discover
   * before something later went wrong.
   */
  let shell = { errors: [], applied: false };
  try {
    shell = await initShell();
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`state request failed: ${res.status}`);
    const state = await res.json();
    renderStatus(state, shell);
    renderDoctrine(state);
    renderFleet(state);
    renderCanvas(state);
    renderEngine(state);
    renderCopy(state);
    /*
     * Judge Mode (S2). It renders into `#panel-judge` — the panel the shell CREATED
     * because the registry row had no authored markup, which is the whole point of D15's
     * "arrive as one registry row". A failure here is reported and ignored: Judge Mode
     * going quiet must not take the other eight tabs down with it.
     */
    const judge = initJudge(state.fleet.rows);
    if (!judge.ok) console.warn('[console] Judge Mode unavailable:', judge.reason);
    /*
     * Gate Health (S4.1). Renders into `#panel-gate-health`, created by the shell from the
     * registry row. Reported and ignored on failure for the same reason as Judge Mode: a
     * panel that cannot draw must not take the other nine tabs down with it.
     */
    const gates = initGates(state.gates);
    if (!gates.ok) console.warn('[console] Gate Health unavailable:', gates.reason);
    el('generated').textContent = `Snapshot generated at ${state.generatedAt}`;
    // Signal the onboarding layer (onboard.js) that rows/artboards exist to decorate.
    window.dispatchEvent(new CustomEvent('console:rendered'));
  } catch (err) {
    renderBanner({ shellErrors: shell.errors ?? [], snapshotError: err.message });
  }
}

boot();
