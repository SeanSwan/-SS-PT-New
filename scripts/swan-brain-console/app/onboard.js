/*
 * onboard.js — first-run briefing, glossary helpers and gallery deep links.
 * @module scripts/swan-brain-console/app/onboard
 *
 * Runs AFTER app.js (module order). Owns three concerns and nothing else:
 *   1. The welcome card: shown on first visit (localStorage flag), dismissible,
 *      reopenable from the header "?" button. Non-modal by design — it must never
 *      block the tabs or panels.
 *   2. Gallery deep links: after app.js renders the fleet table and canvas
 *      artboards (signalled by the console:rendered event), decorate each row and
 *      artboard with a "Watch it move" link into the visual gallery.
 *   3. data-goto buttons: jump to a tab by clicking the real tab control, so all
 *      ARIA state stays owned by app.js's tab controller.
 *
 * House contract: everything is textContent (no innerHTML — repo content is
 * rendered nowhere as HTML), every link is >=44px, and no failure here may break
 * the console: every lookup is guarded, because orientation is a luxury layer.
 */

const SEEN_KEY = 'swan-console-onboarded-v1';
/** The visual gallery the deep links open. Requires the QA harness (vite :5199). */
const GALLERY_BASE = 'http://127.0.0.1:5199/qa-worlds.html';

const el = (id) => document.getElementById(id);

function setWelcome(visible) {
  const card = el('welcome');
  if (card) card.hidden = !visible;
}

function initWelcome() {
  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage may be blocked */ }
  setWelcome(!seen);

  // The engine chip reads as an odd acronym on first sight; give it its meaning
  // on hover/focus without changing the text the verifier asserts on.
  el('stat-engine')?.setAttribute(
    'title',
    'The engine documentation declares durable writes locked — expected today, not an error. See the Engine tab or the glossary.',
  );

  el('welcome-dismiss')?.addEventListener('click', () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: just hide */ }
    setWelcome(false);
  });
  el('help-toggle')?.addEventListener('click', () => {
    const card = el('welcome');
    if (card) setWelcome(card.hidden);
  });

  for (const btn of document.querySelectorAll('[data-goto]')) {
    btn.addEventListener('click', () => {
      const tab = el(`tab-${btn.getAttribute('data-goto')}`);
      tab?.click();
    });
  }
}

/** A 44px link that opens one variant live in the gallery. */
function renderLink(id) {
  const a = document.createElement('a');
  a.className = 'render-link';
  a.href = `${GALLERY_BASE}?only=${encodeURIComponent(id)}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'Watch it move';
  a.title = `Opens variant ${id} live (needs the QA harness on port 5199)`;
  return a;
}

function decorate() {
  // Fleet rows: one render cell per row. The header <th> ships in index.html.
  for (const tr of document.querySelectorAll('#fleet-rows tr')) {
    if (tr.querySelector('.render-link')) continue;
    const id = tr.querySelector('td.id')?.textContent?.trim();
    if (!id) continue;
    const td = document.createElement('td');
    td.append(renderLink(id));
    tr.append(td);
  }
  // Canvas artboards: the id is the leading vNN in the artboard heading.
  for (const art of document.querySelectorAll('#canvas-rounds .artboard')) {
    if (art.querySelector('.render-link')) continue;
    const match = art.querySelector('h4')?.textContent?.match(/v\d{2}/);
    if (!match) continue;
    const p = document.createElement('p');
    p.className = 'artlink';
    p.append(renderLink(match[0]));
    art.append(p);
  }
}

initWelcome();
window.addEventListener('console:rendered', decorate);
// If app.js booted before this module executed, the event already fired — decorate now.
if (el('fleet-rows')?.children.length) decorate();
