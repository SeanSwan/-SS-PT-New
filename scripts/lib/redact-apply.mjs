/**
 * redact-apply.mjs — SPAN RESOLUTION for the redactor: the answer to "what happens
 * when two shapes overlap?"
 *
 * WHY THIS IS ITS OWN MODULE (and not five more lines in `applyAll()`).
 * `fetchForEgress()` is the last gate before a request body leaves the machine, and until
 * now its replacement strategy was `out = out.replace(re, repl)` in table order. That is a
 * SEQUENTIAL strategy: row N+1 sees the output of row N. It is also how round 9d's worst
 * defect happened.
 *
 * THE DEFECT, MEASURED. With the table in order, `sk-` (row 0) runs before the bot-token row:
 *
 *   ['12345678:AAAA-', 'sk-', A32].join('')  ->  '12345678:AAAA-<REDACTED-KEY>'
 *   ['12345678:',      'sk-', A32.slice(2)].join('')  ->  '<REDACTED-KEY>'
 *
 * The second line is the sharp one. A 40-character bot token is reported as redacted while
 * THIRTY of its own characters — everything before the `sk-` — are still in the clear, and
 * the placeholder that claims otherwise. That is the failure mode this module exists to make
 * impossible: PARTIAL REDACTION IS WORSE THAN A MISS, because a miss is visible in the hits
 * report and a partial redaction looks like success.
 *
 * WHAT SEQUENTIAL REPLACEMENT DOES WRONG. Every row's match is computed against a string that
 * an earlier row has already edited. A row therefore cannot know that the text it is about to
 * replace sits INSIDE another row's match, because that match has not happened yet — and once
 * the earlier row runs, the enclosing match's evidence is gone. No lookahead on any single row
 * can repair this; the defect is in the ORDER, not in the patterns. (Astra, round 9d: "Merely
 * changing the bot's trailing lookahead cannot fix this.")
 *
 * THE STRATEGY: SENSITIVE SPANS ARE COMPUTED AGAINST UNCHANGED INPUT.
 *   1. find every match of every row in the ORIGINAL string — no row sees another's output
 *   2. resolve overlap by ORIGINAL span, not by table order:
 *        - disjoint            -> both are redacted, in whichever order
 *        - identical           -> earlier table row wins (deterministic, table-authored)
 *        - strictly contained  -> the ENCLOSING match wins, whichever row it came from
 *        - partial overlap     -> the UNION is redacted (conservative: refuse to guess which
 *                                 half is the secret, and never emit half of each)
 *   3. apply the surviving spans RIGHT-TO-LEFT, so no replacement shifts an index still to come
 *
 * `enclosing wins` is the direction that matters: a token that CONTAINS another shape is the
 * broader secret, and redacting its inside first destroys the outer match forever. The reverse
 * (a key that contains a token) is not expressible — keys are shorter than the tokens they
 * would have to span.
 *
 * The hits report keeps the sequential shape callers already depend on: one entry per
 * replacement label, with a count. It is derived from the resolved spans, so a redaction that
 * did not happen is not counted, and two different rows that resolve to the same span are
 * reported once under whichever row supplied the label.
 */

/** Collect `{start, end, repl, row}` for every match of every pattern in `text`. */
function collectSpans(text, patterns) {
  const spans = [];
  patterns.forEach(([re, repl], row) => {
    // A non-global pattern would loop forever below; matchAll requires `g`, and the table's
    // rows all carry it. Re-stated defensively rather than assumed, because a row added
    // without `g` would otherwise silently contribute ONE match per document.
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    const global = new RegExp(re.source, flags);
    for (const m of text.matchAll(global)) {
      // A zero-width match cannot be redacted and would make the overlap arithmetic
      // meaningless. No current row can produce one; the guard is here so that adding one
      // later is a caught error rather than a corrupted body.
      if (m[0].length === 0) continue;
      spans.push({
        start: m.index, end: m.index + m[0].length,
        // `$1$2`-style templates keep the syntax they name: the keyed-id row preserves the
        // key and separator so the output stays a JSON object rather than a bare placeholder.
        repl: m[0].replace(new RegExp(re.source, flags), repl),
        // ...and the RAW template, kept alongside it for the hits report. The two differ for
        // the keyed-id row, and the distinction is load-bearing for callers: hit entries are
        // keyed by label, so reporting the EXPANDED text gives one entry per distinct body
        // instead of one per shape and silently breaks `hits[].replacement === repl`.
        label: repl,
        row,
      });
    }
  });
  return spans;
}

/**
 * Reduce overlapping spans to a disjoint set, resolving on ORIGINAL positions.
 * Exported for direct testing: the rules below are the load-bearing part of this module and
 * an assertion about them should not require going through a whole redaction to exercise.
 */
export function resolveSpans(spans) {
  // Sorted by start, then by DESCENDING length: when two spans begin together the longer is
  // the enclosing one, so it is considered first and wins on the rule below.
  const sorted = [...spans].sort((a, b) => (a.start - b.start) || (b.end - a.end));
  const out = [];
  for (const span of sorted) {
    const prev = out[out.length - 1];
    if (prev === undefined || span.start >= prev.end) {
      // Strictly outside everything already accepted: disjoint, replace one-for-one.
      out.push({ ...span });
      continue;
    }
    if (span.end > prev.end) {
      // PARTIAL OVERLAP — neither contains the other. Redact the UNION: the overlap is the
      // part we cannot attribute, and emitting either row's placeholder over a half-shared
      // region would leave the other half in the clear. `prev` keeps its label because it
      // started first; the count grows to cover the union, which is what actually happened.
      prev.end = span.end;
      continue;
    }
    // Strictly contained (span.end <= prev.end) — the enclosing match wins and this one is
    // dropped. This is the rule that repairs the defect: the bot token survives because the
    // `sk-` match inside it is not applied at all.
  }
  return out;
}

/**
 * Redact `text` using `patterns` ([regex, replacement] rows, table order significant).
 * @returns {{out: string, hits: Array<{replacement: string, count: number}>}}
 */
export function applyAll(text, patterns) {
  const spans = resolveSpans(collectSpans(text, patterns));
  // Right-to-left: applying from the end means every index still pending is unaffected by the
  // replacements already made. Left-to-right would require offset bookkeeping, and an
  // off-by-one there corrupts the body silently — the exact class this module is about.
  let out = text;
  for (let i = spans.length - 1; i >= 0; i -= 1) {
    const s = spans[i];
    out = out.slice(0, s.start) + s.repl + out.slice(s.end);
  }
  // One hit entry per SHAPE (by its raw replacement template), in the order the spans appear.
  // Keyed by `label`, not by the expanded text: the keyed-id row expands to `chat_id=<REDACTED-ID>`
  // for one body and `chat:<REDACTED-ID>` for another, and grouping on those would split one
  // shape into as many entries as it had bodies. Callers compare this field to the table.
  const hits = [];
  for (const s of spans) {
    const entry = hits.find((h) => h.replacement === s.label);
    if (entry) entry.count += 1;
    else hits.push({ replacement: s.label, count: 1 });
  }
  return { out, hits };
}
