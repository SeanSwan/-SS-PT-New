/**
 * ledgerTrend.mjs — the `rejected_all` trend. `AC6.1` / `AC6.3`, `T-E-03`.
 *
 * SPLIT OUT OF `ledger.mjs` FOR RULE 4, ON A REAL SEAM. The Ledger answers two questions that
 * share a pane and nothing else: *"what did the operator throw away, and what does that say
 * about the slots and facets?"* (here) and *"what did it cost versus what we said it would?"*
 * (`ledger.mjs`). They have different sources — this one is ASTRA'S OWN compile registry, the
 * cost one is the Forge variant store — and different failure modes, so they are different
 * files.
 *
 * THE SOURCE IS NOT THE VARIANT STORE. `02-BLUEPRINT.md` §3 says `core/ledger.mjs` reads
 * `outcome` from the variant store. Measured: the store's record has no `outcome` field at
 * all. `rejected_all` is written by `core/session.mjs`'s `setOutcome()` against a COMPILE, and
 * that is where this reads it from. Recorded as `C50`.
 */

/** The four outcomes the ERD names (`03-INTERFACE.md` §6.1). Astra owns this vocabulary. */
export const OUTCOMES = Object.freeze(['pending', 'accepted', 'refined', 'rejected_all']);

/**
 * The one outcome the Ledger exists to count. The contract calls it *"the highest-value tuning
 * signal the system will ever produce"* — a batch the operator looked at and threw away
 * entirely is a stronger signal than any single pick.
 */
export const REJECTED_ALL = 'rejected_all';

/**
 * How many rejections before a "trend" is a trend.
 *
 * A STATED JUDGEMENT, NOT A COMPUTED ONE, and deliberately not dressed as statistics: below
 * this the view still renders the COUNTS and says plainly that it is not yet reading a trend.
 * The failure mode this prevents is the one this repo keeps fixing — a share computed from a
 * denominator of two, printed to one decimal place, looking like a finding.
 */
export const TREND_MIN_REJECTED = 3;

/**
 * Build the rejected-all trend from the compile registry. PURE — takes entries, does no I/O.
 *
 * `bySlot` and `byFacet` answer `AC6.3`'s *"viewable by slot and by facet"*. What is counted is
 * deliberately narrow and stated: a slot counts toward a compile when it is **non-empty** (an
 * empty slot says nothing about taste — it says a facet emptied it), and a facet counts when it
 * was **applied**. Both are presence counts, not attributions: this view can say *"`Form>Abstract`
 * was applied in 4 of the 5 rejected batches"* and cannot say the facet caused the rejection.
 * Nothing here computes a causal claim, and the pane's copy says so.
 */
export function rejectedAllTrend(compiles = []) {
  const rows = compiles.map((c) => ({
    compileId: c?.compileId ?? null,
    outcome: c?.outcome ?? 'pending',
    slots: c?.view?.slots ?? [],
    facets: c?.view?.facetsApplied ?? [],
  }));

  const byOutcome = {};
  for (const o of OUTCOMES) byOutcome[o] = 0;
  for (const r of rows) {
    // An outcome outside the vocabulary is not silently folded into `pending` — it is counted
    // under its own name, because a fifth outcome appearing is a fact the operator needs to
    // see, not a row to swallow.
    byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
  }
  const rejected = rows.filter((r) => r.outcome === REJECTED_ALL);

  // --- by slot: which slots were populated when batches were thrown away ---------
  const slotKeys = new Set();
  for (const r of rows) for (const s of r.slots) if (s?.key && !s.empty) slotKeys.add(s.key);

  const bySlot = [...slotKeys].sort().map((key) => {
    const all = rows.filter((r) => r.slots.some((s) => s?.key === key && !s.empty));
    const hit = rejected.filter((r) => r.slots.some((s) => s?.key === key && !s.empty));
    // The VALUE histogram is the actionable half: "the slot was in play" is background,
    // "this slot said `dusk` in three of the five rejections" is a tuning lead.
    const values = new Map();
    for (const r of hit) {
      const v = r.slots.find((s) => s?.key === key && !s.empty)?.value ?? '';
      if (v) values.set(v, (values.get(v) ?? 0) + 1);
    }
    return {
      key,
      rejected: hit.length,
      all: all.length,
      // A PRECONDITION GUARD, AND IT IS UNREACHABLE BY CONSTRUCTION — stated rather than
      // left for a reader to discover. `key` entered `slotKeys` only because some row
      // populated it, so `all.length >= 1` for every row here and the `null` arm never
      // fires. It is kept because the alternative on a zero denominator is `Infinity`, and
      // an arithmetic module should not be able to emit that from a bad argument. The
      // REACHABLE half of the same rule lives in `paneLedger.mjs`'s `pct()`, where a
      // hand-made trend CAN carry `all: 0` and `a6-pane.test.mjs` proves it renders `—`
      // rather than `NaN%`. A guard whose only test is injection belongs where injection is
      // possible.
      share: all.length ? hit.length / all.length : null,
      values: [...values.entries()].map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    };
  });

  // --- by facet ------------------------------------------------------------------
  const facetNames = new Set();
  for (const r of rows) for (const f of r.facets) if (f) facetNames.add(f);
  const byFacet = [...facetNames].sort().map((facet) => {
    const all = rows.filter((r) => r.facets.includes(facet));
    const hit = rejected.filter((r) => r.facets.includes(facet));
    // Same precondition guard, same unreachability, same reasoning as `bySlot` above.
    return { facet, rejected: hit.length, all: all.length, share: all.length ? hit.length / all.length : null };
  }).sort((a, b) => b.rejected - a.rejected || a.facet.localeCompare(b.facet));

  const sufficient = rejected.length >= TREND_MIN_REJECTED;
  return {
    n: rows.length,
    byOutcome,
    rejected: rejected.length,
    rejectedIds: rejected.map((r) => r.compileId),
    bySlot,
    byFacet,
    sufficient,
    minRejected: TREND_MIN_REJECTED,
    note: sufficient
      ? `${rejected.length} rejected batches — enough to read a direction, and still not enough to read a cause.`
      : `${rejected.length} rejected batch(es). Below ${TREND_MIN_REJECTED} a "trend" is a coincidence; `
        + 'the counts below are shown, the reading is withheld.',
  };
}
