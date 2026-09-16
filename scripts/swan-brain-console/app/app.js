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

const el = (id) => document.getElementById(id);

/** Create an element with text-safe content. */
function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = String(text);
  return n;
}

function card(label, value, note, warn = false) {
  const c = node('div', warn ? 'card warn' : 'card');
  c.append(node('h3', null, label), node('p', 'value', value));
  if (note) c.append(node('p', 'note', note));
  return c;
}

/* ── Tab controller (ARIA roving tabindex) ────────────────────────────────── */
const TAB_IDS = ['doctrine', 'fleet', 'canvas', 'copy', 'engine', 'seats', 'memory', 'ship'];

function selectTab(id) {
  for (const t of TAB_IDS) {
    const tab = el(`tab-${t}`);
    const panel = el(`panel-${t}`);
    const on = t === id;
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  }
}

function wireTabs() {
  TAB_IDS.forEach((id, i) => {
    const tab = el(`tab-${id}`);
    tab.addEventListener('click', () => selectTab(id));
    tab.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const next = TAB_IDS[(i + delta + TAB_IDS.length) % TAB_IDS.length];
      selectTab(next);
      el(`tab-${next}`).focus();
    });
  });
}

/* ── Renderers ────────────────────────────────────────────────────────────── */
function renderStatus(state) {
  el('stat-doctrine').textContent = `${state.doctrine.presentCount}/${state.doctrine.declaredCount}`;
  el('stat-fleet').textContent = String(state.fleet.summary.total);
  el('stat-archetypes').textContent = String(state.doctrine.archetypes.count);
  const engine = el('stat-engine');
  engine.textContent = state.engine.durableWrites;
  engine.classList.toggle('blocked', state.engine.durableWrites !== 'DECLARED_BLOCKED' && state.engine.durableWrites !== 'VERIFIED_BLOCKED');

  const banner = el('engine-banner');
  banner.hidden = false;
  banner.textContent =
    `Learning engine: ${state.engine.durableWrites}. Durable writes are refused by design — `
    + 'this console reports that state and offers no write control. See the Engine tab.';
}

function renderDoctrine(state) {
  const wrap = el('doctrine-archetypes');
  wrap.replaceChildren();
  const a = state.doctrine.archetypes;
  wrap.append(card('Archetypes', a.count, a.present ? `generated from ${a.generatedFrom}` : 'index.json missing', !a.present));
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
  cards.append(
    card('Archetypes', state.doctrine.archetypes.count, 'routing table the atelier loop reads first'),
    card('Doctrine docs', `${state.doctrine.presentCount}/${state.doctrine.declaredCount}`, 'present on disk'),
    card('Spec mode', String(state.doctrine.engineConfig.specModeEnabled), 'spec persistence is disabled by policy', true),
  );
  wrap.append(cards);
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */
async function boot() {
  wireTabs();
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`state request failed: ${res.status}`);
    const state = await res.json();
    renderStatus(state);
    renderDoctrine(state);
    renderFleet(state);
    renderCanvas(state);
    renderEngine(state);
    renderCopy(state);
    el('generated').textContent = `Snapshot generated at ${state.generatedAt}`;
    // Signal the onboarding layer (onboard.js) that rows/artboards exist to decorate.
    window.dispatchEvent(new CustomEvent('console:rendered'));
  } catch (err) {
    const banner = el('engine-banner');
    banner.hidden = false;
    banner.textContent = `Console could not read a snapshot: ${err.message}`;
  }
}

boot();
