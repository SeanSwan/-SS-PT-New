/*
 * Swan Brain Console — Judge Mode's rendering layer.
 * @module scripts/swan-brain-console/app/app-judge-render
 *
 * WHY THIS IS SEPARATE FROM `app-judge.js` (round 11, 2026-09-20)
 * The split is by SUBJECT, and Rule 4 is what forced it rather than tidiness. Closing round 11's
 * F10 (the `localStorage` getter was read outside every try block) needed an `acquireStorage`
 * boundary, and that helper must NOT live in `judge-export.mjs` — that module's purity is
 * enforced by `judge-export.test.mjs`, and a function that reads an ambient browser global
 * belongs on the DOM side of the line, not the pure one. So it belongs in `app-judge.js`, which
 * was already at 302 lines.
 *
 * What is here: build a pair row, build a variant card, render the panel, and offer the two
 * downloads. What is NOT here: any decision about what a verdict means (`judge-export.mjs`) and
 * any wiring of input (`app-judge.js`). Every class assigned here is a `judge-*` token that
 * `judge.css` defines or `style-hooks.test.mjs` fails — see that suite.
 *
 * XSS DISCIPLINE: every value reaching the DOM goes through `textContent`. Variant titles and
 * tradeoffs come from repo files, so rendering them as HTML would make a stray tag in a commit
 * into a stored-XSS surface. No `innerHTML` in this file.
 */
import { pairsFrom, summarize, buildExport, VERDICT_LABELS } from './judge-export.mjs';

/** Which pair the keyboard acts on. Exported so the UI and tests agree on the name. */
export const ACTIVE_ATTR = 'data-pair-index';

/**
 * Create an element with text-safe content.
 *
 * Exported because `app-judge.js` builds the host element with it. One definition, so the two
 * halves of this panel cannot disagree about how a text node is made.
 */
export function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = String(text);
  return n;
}

/**
 * One variant's structural summary — what is being judged, and on what basis.
 *
 * ROUND 10 (2026-09-20) — THE SIDE IS NOW SPOKEN, NOT ONLY ENCODED. `judge-left` /
 * `judge-right` were the ONLY record of which variant was "1" and which "2", and no
 * stylesheet defined either — while `pairRow`'s legend says "1 left wins · 2 right wins"
 * and `judge.css` stacks the two at ≤720px. The label is load-bearing, not decoration.
 */
function variantCard(row, side) {
  const card = node('div', `judge-variant judge-${side}`);
  card.append(
    node('p', 'judge-side', side === 'left' ? 'Left' : 'Right'),
    node('h4', null, `${row.id} — ${row.title}`),
    node('p', 'judge-tuple', `${row.nav_model} · ${row.hero_mechanics} · ${row.grid}`),
    node('p', 'judge-tradeoff', row.tradeoff || 'no tradeoff recorded'),
  );
  if (row.wildcard) card.append(node('p', 'judge-wild', `wildcard: ${row.wildcard}`));
  return card;
}

/** One judged pair, with its current verdict shown rather than remembered. */
function pairRow(pair, verdict, total) {
  const wrap = node('div', 'judge-pair');
  wrap.setAttribute(ACTIVE_ATTR, String(pair.index));
  wrap.tabIndex = 0;
  /*
   * ROUND 12 (2026-09-20). This read `Pair ${pair.index + 1} of 10` — a literal that was correct
   * only because the fleet happens to hold twenty variants and `pairsFrom` pairs adjacently. It
   * is the same defect Astra's F14 named one level up: a fact written down where it could have
   * been read. The total now arrives from the caller, so a 19-row fleet says "of 9" rather than
   * telling the operator there are ten pairs while showing nine.
   */
  const head = node('p', 'judge-head', `Pair ${pair.index + 1} of ${total}`);
  const state = node(
    'p',
    verdict ? 'judge-verdict recorded' : 'judge-verdict',
    verdict ? `recorded: ${VERDICT_LABELS[verdict.kind]}` : 'not judged yet',
  );
  const sides = node('div', 'judge-sides');
  sides.append(variantCard(pair.left, 'left'), variantCard(pair.right, 'right'));
  const keys = node('p', 'judge-keys', 'Keys: 1 left wins · 2 right wins · E too close · N neither · 0 clear');
  wrap.append(head, sides, state, keys);
  return wrap;
}

/** The two download buttons. Both artifacts, because a caller should not have to choose. */
function exportBar(state, pairs, doc) {
  const bar = node('div', 'judge-export');
  bar.append(node('p', 'judge-note',
    'Exporting downloads both a .json and a .md. Nothing is promoted by exporting — '
    + 'promotion is a reviewed commit.'));

  const make = (label, ext, pick) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'judge-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      const out = buildExport(state, pairs, { generatedAt: new Date().toISOString() });
      download(doc, `${out.filenameBase}.${ext}`, pick(out), ext);
    });
    return b;
  };

  bar.append(
    make('Download .json', 'json', (o) => o.json),
    make('Download .md', 'md', (o) => o.markdown),
  );
  return bar;
}

/** Trigger a client-side download. No network, no server, no write route. */
function download(doc, filename, body, ext) {
  const type = ext === 'json' ? 'application/json' : 'text/markdown';
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Render the whole panel into `container`.
 *
 * Re-renders from state rather than patching, because the panel is ten rows and a full
 * rebuild cannot drift out of step with the verdicts the way selective updates can.
 */
export function renderJudge(container, rows, state, doc = document, activeIndex = 0) {
  container.replaceChildren();

  const { pairs, unpaired } = pairsFrom(rows);
  const summary = summarize(state);

  const head = node('div', 'judge-summary');
  head.append(
    node('p', 'judge-progress',
      `${summary.judged} of ${summary.total} pairs judged`
      + (summary.complete ? ' — complete' : ' — incomplete')),
    node('p', 'judge-tally',
      `left ${summary.byKind.left} · right ${summary.byKind.right}`
      + ` · too close ${summary.byKind.tie} · neither ${summary.byKind.neither}`),
  );
  container.append(head);

  if (unpaired) {
    // Reported, not dropped. A variant that cannot be judged is a fact about the
    // tournament, and hiding it would let a 19-row fleet look like a complete bracket.
    container.append(node('p', 'judge-wild',
      `Unpaired: ${unpaired.id} — an odd row out cannot be judged in a pair.`));
  }

  const list = node('div', 'judge-list');
  for (const pair of pairs) list.append(pairRow(pair, state.verdicts[pair.index], pairs.length));
  container.append(list);

  container.append(exportBar(state, pairs, doc));

  /*
   * FOCUS FOLLOWS THE JUDGEMENT (round 11, finding F11). This used to focus
   * `list.firstElementChild` unconditionally, and `wireJudgeKeys` resolves its target from
   * `event.target.closest([data-pair-index])` — so FOCUS IS THE CURSOR. Judging pair two moved
   * focus to pair one and the next keypress recorded a verdict there: an operator judging ten
   * pairs silently overwrote pair one nine times, and the panel looked like it was working.
   * Astra reproduced it against the real renderer with a DOM stub.
   *
   * `activeIndex` is the pair just acted on, matched by walking `list.children` — the same
   * attribute read the key handler does.
   */
  let target = null;
  for (const child of list.children) {
    if (child.getAttribute?.(ACTIVE_ATTR) === String(activeIndex)) { target = child; break; }
  }
  if (!target) target = list.firstElementChild;
  if (target) target.focus();
  return { pairs, summary };
}
