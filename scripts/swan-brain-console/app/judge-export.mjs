/**
 * judge-export — the pure half of Judge Mode.
 * @module scripts/swan-brain-console/app/judge-export
 *
 * WHY THE EXPORT IS SEPARATED FROM THE UI
 * The exported file IS the promotion evidence: it is what a reviewer reads to decide
 * whether a variant earned its place. If it is built inside the DOM layer, the only way
 * to test it is to drive a browser, so in practice nobody tests it — and the artifact
 * that justifies a decision becomes the least-checked code in the workstream.
 *
 * So this module is deliberately PURE: no DOM, no network, no filesystem, no clock
 * unless one is passed in. Everything it needs arrives as an argument, which makes it
 * runnable under `node:test` and makes the output a function of its input.
 *
 * "EACH PAIR IS JUDGED AT MOST ONCE" is enforced here rather than in the UI. A verdict
 * is keyed by pair index, so a second keypress REPLACES the first instead of appending
 * — the summary counts pairs, never keypresses. Counting keypresses would let a
 * fidgeting operator outvote a deliberate one.
 */

/** The four verdict kinds, in keyboard order. */
export const VERDICT_KINDS = Object.freeze(['left', 'right', 'tie', 'neither']);

/** The keyboard map. Lower-case keys; the UI lower-cases before lookup. */
export const KEY_TO_VERDICT = Object.freeze({
  1: 'left',
  2: 'right',
  e: 'tie',
  n: 'neither',
});

/** Human labels, so the export and the UI cannot disagree about what a key meant. */
export const VERDICT_LABELS = Object.freeze({
  left: 'left wins',
  right: 'right wins',
  tie: 'too close to call',
  neither: 'neither survives',
});

/**
 * Pair the fleet for judging. Ten pairs from twenty variants, in registry order.
 * An odd row out is returned separately rather than silently dropped: a variant that
 * cannot be judged is a fact about the tournament, not a rounding error.
 */
export function pairsFrom(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const pairs = [];
  for (let i = 0; i + 1 < list.length; i += 2) {
    pairs.push({ index: pairs.length, left: list[i], right: list[i + 1] });
  }
  const unpaired = list.length % 2 === 1 ? list[list.length - 1] : null;
  return { pairs, unpaired };
}

/** Resolve a keypress to a verdict kind, or null for anything unmapped. */
export function verdictForKey(key) {
  if (typeof key !== 'string') return null;
  const kind = KEY_TO_VERDICT[key.toLowerCase()];
  return VERDICT_KINDS.includes(kind) ? kind : null;
}

/**
 * Record a verdict. Pure: returns a NEW object, never mutates.
 *
 * `at` is the only source of a timestamp, so the caller owns the clock and a test can
 * pin it. Re-judging a pair overwrites — see the module note on "at most once".
 *
 * THE UPPER BOUND IS NOT DECORATION. An earlier version checked only `pairIndex < 0`,
 * so a verdict at index 999 was accepted and counted. `verdictRows` filters by the real
 * pair list and would have hidden it, but `summarize` counts the verdict MAP — so
 * `judged` could reach `total` while a genuine pair sat unjudged, and a half-finished
 * session would export as `complete: true`. That is the "green suite certifying a broken
 * invariant" failure this project has already been bitten by, found by a test that
 * asserted an out-of-range index must be ignored.
 */
export function applyVerdict(state, pairIndex, kind, at) {
  if (!Number.isInteger(pairIndex) || pairIndex < 0) return state;
  if (!VERDICT_KINDS.includes(kind)) return state;
  if (Number.isInteger(state?.pairCount) && pairIndex >= state.pairCount) return state;
  return {
    ...state,
    verdicts: { ...state.verdicts, [pairIndex]: { kind, at: at ?? null } },
  };
}

/** Clear one pair. Used by the UI's undo, and by a test to prove clearing is not judging. */
export function clearVerdict(state, pairIndex) {
  const verdicts = { ...state.verdicts };
  delete verdicts[pairIndex];
  return { ...state, verdicts };
}

/**
 * A fingerprint of the ORDERED pairing — which variant sits on which side of which pair.
 *
 * ROUND 11 (2026-09-20). A restored session was validated against `pairCount` ALONE, so a
 * fleet of the same LENGTH whose order had changed re-adopted every old verdict and applied
 * it to different variants. Ten pairs of twenty variants is ten verdicts either way; nothing
 * in the stored shape noticed that `v01 vs v02` had become `v20 vs v19`, or that a variant
 * had been replaced by a different one. The export then presented those inherited choices as
 * promotion evidence with their original timestamps. The fingerprint is the identity the
 * count was standing in for.
 */
export function pairingFingerprint(pairs) {
  return pairs.map((p) => `${p.left?.id ?? '?'}>${p.right?.id ?? '?'}`).join('|');
}

/** The empty state for a given pairing. */
export function emptyState(pairs) {
  return { pairCount: pairs.length, pairing: pairingFingerprint(pairs), verdicts: {} };
}

/** Storage key, versioned so a future shape change cannot misread an old session. */
export const STORAGE_KEY = 'swan-brain-console/judge/v1';

/**
 * Read a stored session. Returns null when absent, unreadable, or about a DIFFERENT pairing.
 *
 * Both the length and the ORDERED pairing are checked. It takes `pairs` rather than a count so
 * there is no way for a caller to supply one and forget the other — the count-only signature
 * is what let a reordered fleet inherit a complete set of judgements.
 *
 * Lives here rather than in `app-judge.js` because this module is the PURE half (that file's
 * own header says so): the function touches no DOM, only the `storage` object handed to it.
 */
export function loadStoredState(storage, pairs) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.pairCount !== pairs.length) return null; // a different fleet: start clean
    if (parsed.pairing !== pairingFingerprint(pairs)) return null; // same length, different fleet
    return { pairCount: pairs.length, pairing: parsed.pairing, verdicts: parsed.verdicts ?? {} };
  } catch {
    return null;
  }
}

/**
 * Persist a session. Returns whether it was ACTUALLY stored, never throws.
 *
 * ROUND 12 (2026-09-21) — `storage?.setItem(...)` MADE A MISSING STORE LOOK LIKE A SUCCESS.
 * Optional chaining short-circuits the entire call, so `saveState(null, state)` skipped the
 * write and returned `true`: a receipt for work that did not happen. Astra (G13) executed it
 * and got `true`. The caller then redrew the panel as though the judgements were durable, and
 * they vanished on reload with no warning shown.
 *
 * `null` storage means "there is nowhere to persist", which is exactly what this function
 * exists to report. A save that cannot happen is not a save that succeeded.
 *
 * The test at `app-judge.test.mjs` asserted the `true` — it had encoded the bug as the
 * contract. That assertion is corrected in the same round rather than worked around, because
 * a regression test that asserts the defect is worse than no test: it makes the fix look
 * like a regression.
 */
export function saveState(storage, state) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Summarise. `judged` counts PAIRS with a VALID verdict; `total` is the pair count. The two
 * are reported separately so a half-finished session cannot be mistaken for a complete one —
 * an export that reads as final when it is partial is worse than no export.
 *
 * ROUND 11 (2026-09-20) — `judged` USED TO COUNT OBJECT KEYS, NOT JUDGEMENTS. It read
 * `entries.length` while `byKind` counted only entries whose `kind` was valid, so the two
 * numbers answered different questions and could disagree without anyone noticing. Ten stored
 * `null` verdicts produced `judged: 10`, `complete: true`, every tally zero — and
 * `verdictRows` filtered those same nulls out, so the export announced a completed review and
 * carried an empty table. `complete` is the claim a reviewer acts on; it now counts the rows
 * the export will actually contain.
 */
export function summarize(state) {
  const total = state.pairCount ?? 0;
  /*
   * ROUND 12 (2026-09-21) — A VERDICT UNDER A KEY THAT IS NOT A PAIR IS NOT A JUDGEMENT.
   *
   * This counted every entry carrying a valid `kind`, while `verdictRows` emits only verdicts
   * sitting at real pair indices. Astra (G04) executed the gap: ten valid `left` verdicts under
   * keys `100…109` with `pairCount: 10` produced `{ judged: 10, complete: true }` and a verdict
   * table of length ZERO. The export announced a completed review and carried nothing.
   *
   * `pairsFrom` assigns `index: pairs.length`, so the only keys that can name a pair are the
   * integers `0 … pairCount - 1`. The filter is on the CANONICAL spelling: `verdictRows` looks
   * up `state.verdicts[p.index]`, and a JS object lookup with the number `1` finds `"1"` but NOT
   * `"01"`. Both functions now derive from one population, so they cannot disagree.
   */
  const entries = Object.entries(state.verdicts ?? {})
    .filter(([key]) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < total);
  const byKind = Object.fromEntries(VERDICT_KINDS.map((k) => [k, 0]));
  let judged = 0;
  for (const [, v] of entries) {
    if (VERDICT_KINDS.includes(v?.kind)) {
      byKind[v.kind] += 1;
      judged += 1;
    }
  }
  return {
    total,
    judged,
    unjudged: Math.max(0, total - judged),
    complete: total > 0 && judged === total,
    byKind,
  };
}

/** One line per judged pair, in pair order. Deterministic, so two runs diff cleanly. */
export function verdictRows(state, pairs) {
  /*
   * ROUND 11 — the filter tests the verdict's KIND, not the verdict's truthiness. A stored
   * `{kind: 'bogus'}` is truthy, so it used to pass this filter and then render
   * `VERDICT_LABELS[undefined]` into the table. This is the same population `summarize`
   * counts, so `judged` and the row count can no longer disagree.
   */
  return pairs
    .filter((p) => VERDICT_KINDS.includes(state.verdicts?.[p.index]?.kind))
    .map((p) => {
      const v = state.verdicts[p.index];
      return {
        pair: p.index + 1,
        left: p.left?.id ?? '?',
        right: p.right?.id ?? '?',
        kind: v.kind,
        label: VERDICT_LABELS[v.kind],
        at: v.at,
      };
    });
}

/** The markdown body. Written for a reviewer, so it leads with the summary. */
export function toMarkdown(state, pairs, meta = {}) {
  const s = summarize(state);
  const rows = verdictRows(state, pairs);
  const lines = [
    '# Swan Brain Console — Judge Mode export',
    '',
    `- Generated: ${meta.generatedAt ?? 'unknown'}`,
    `- Pairs judged: **${s.judged} of ${s.total}**${s.complete ? '' : ' — INCOMPLETE'}`,
    `- Left wins: ${s.byKind.left} · Right wins: ${s.byKind.right}`
      + ` · Too close: ${s.byKind.tie} · Neither: ${s.byKind.neither}`,
    '',
    'A verdict is recorded once per pair; a later keypress replaces the earlier one, so',
    'these counts are pairs and not keypresses.',
    '',
    '| Pair | Left | Right | Verdict | Recorded |',
    '|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(`| ${r.pair} | ${r.left} | ${r.right} | ${r.label} | ${r.at ?? '—'} |`);
  }
  if (!rows.length) lines.push('| — | — | — | _nothing judged yet_ | — |');
  lines.push('');
  lines.push('Nothing was promoted by producing this file. Promotion is a reviewed commit.');
  return lines.join('\n');
}

/**
 * Build both export artifacts. The single entry point the UI calls.
 *
 * `json` is machine-readable and carries the raw kinds; `markdown` is the human
 * artifact. Both are returned so a caller cannot ship one and forget the other.
 */
export function buildExport(state, pairs, meta = {}) {
  const s = summarize(state);
  const rows = verdictRows(state, pairs);
  const json = JSON.stringify(
    {
      generatedAt: meta.generatedAt ?? null,
      source: meta.source ?? 'swan-brain-console/judge',
      pairCount: s.total,
      judged: s.judged,
      unjudged: s.unjudged,
      complete: s.complete,
      byKind: s.byKind,
      verdicts: rows,
    },
    null,
    2,
  );
  return {
    json,
    markdown: toMarkdown(state, pairs, meta),
    filenameBase: `swan-judge-${(meta.generatedAt ?? 'undated').replace(/[:.]/g, '-')}`,
    summary: s,
  };
}
