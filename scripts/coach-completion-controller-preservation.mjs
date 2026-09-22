/**
 * coach-completion-controller-preservation.mjs — the CONTROLLER-PRESERVATION gate.
 *
 * WHY THIS IS ITS OWN MODULE (Rule 4). R7-02's fix added content-equality verification and a
 * `deepDiffs` helper; that took `coach-completion-admission.mjs` to 343 lines against Rule 4's 300
 * cap. The seam is the real subject boundary: `coach-completion-admission.mjs` asks *"may a successor
 * start"*, this module asks *"did a controller migration preserve what it must"*. They share a
 * caller and nothing else. Re-exported from `coach-completion-checkpoint.mjs`, so no import site
 * changed.
 *
 * Budget: <=300 lines (Rule 4).
 */

/**
 * Deep structural diff, reported as human-readable paths. R7-02's root cause was a join
 * (`beforeById.get(afterSlice.id)`) that matched NOTHING, so every per-field comparison was skipped
 * and the function returned `[]`. A join is only as good as the key overlap it happens to have;
 * CONTENT EQUALITY against an object we already hold has no such failure mode.
 *
 * Reports at most `limit` differences (a truncated list still says "there ARE differences", which is
 * the verdict that matters) and treats `null` as a real value distinct from a missing key.
 */
export const deepDiffs = (a, b, path = '$', limit = 10, acc = []) => {
  if (acc.length >= limit) return acc;
  if (a === b) return acc;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
    acc.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
    return acc;
  }
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) { acc.push(`${path}: ${aArr ? 'array' : 'object'} -> ${bArr ? 'array' : 'object'}`); return acc; }
  if (aArr) {
    if (a.length !== b.length) acc.push(`${path}: length ${a.length} -> ${b.length}`);
    for (let i = 0; i < Math.max(a.length, b.length) && acc.length < limit; i += 1) deepDiffs(a[i], b[i], `${path}[${i}]`, limit, acc);
    return acc;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (acc.length >= limit) break;
    if (!(k in a)) { acc.push(`${path}.${k}: ABSENT -> ${JSON.stringify(b[k])}`); continue; }
    if (!(k in b)) { acc.push(`${path}.${k}: ${JSON.stringify(a[k])} -> ABSENT`); continue; }
    deepDiffs(a[k], b[k], `${path}.${k}`, limit, acc);
  }
  return acc;
};

/**
 * Controller preservation.
 *
 * Field names here are NOT assumed: the schema-4 override state records history in `events` (there
 * is no `history` key) and the cadence lives at `authorization.cadence` (there is no top-level
 * `cadence`). An earlier revision of this function asserted both wrongly and reported two phantom
 * violations against a correct migration.
 *
 * ── R6-03: WHAT THIS GATE ONCE DID NOT SEE — now CLOSED (R6-10, task #55) ──────────────────────
 * Astra's finding was that `runAll` never CALLED this function. That is fixed. But the check itself
 * was BLIND to per-slice field loss: it compared slice COUNT, never the fields within a slice. That
 * was not hypothetical — the v7 -> v8 migration silently dropped `digest`, `frozen` and
 * `reviewDisposition` from five of nine slices and demoted them `tested -> build`, and THIS FUNCTION
 * RETURNED `[]` FOR THAT PAIR. It was caught only by diffing the two states by hand.
 *
 * MEASURED 2026-09-21 (tmp/r610-probe2.mjs) before the fix, with a baseline control proving the
 * probe was not measuring its own harness:
 *     BASELINE (identical before/after): []
 *     HOLLOWED (every field removed, statuses demoted): []   <- the whole defect, in one line
 *
 * The previous revision recorded this blind spot rather than fixing it, on the ground that closing
 * it needs a decision about which fields are load-bearing (provenance vs status) that belongs to the
 * slice plan. That reasoning was too cautious in one direction and too ambitious in the other: the
 * gate does not need to know which field is important. It needs to know that ONE THAT WAS THERE IS
 * GONE. So the fix derives the field set from the DATA rather than from a hardcoded list — no field
 * vocabulary is assumed, no slice-plan decision is made here, and a purely additive migration is
 * never flagged.
 */
export const checkControllerMigration = ({ before, after }) => {
  const out = [];
  if (!before || !after) return ['controller: missing before/after state'];
  if (before.taskId !== after.taskId) out.push(`controller: taskId changed (${before.taskId} -> ${after.taskId})`);
  if (before.sessionId !== after.sessionId) out.push(`controller: sessionId changed (${before.sessionId} -> ${after.sessionId})`);
  const b = before.calls ?? 0, a = after.calls ?? 0;
  if (a < b) out.push(`controller: call consumption regressed (${b} -> ${a})`);
  // ── ACTIVE-SLICE SHRINKAGE, REVISITED FOR THE C→S VOCABULARY MIGRATION ──────────────────────
  // The original check flagged ANY drop in active slice count. That contradicted Astra's own
  // Review-6 C→S ruling, which MIGRATES nine S-slices to six C-slices while retaining the full
  // historical record in `origin` — measured on the real v9, the gate flagged the migration the
  // reviewer prescribed. The defect the gate hunts is HISTORY LOSS (the v7→v8 incident dropped
  // fields and demoted statuses), so shrinkage is now a violation only when it is NOT a supported
  // vocabulary migration. A migration is supported iff (a) an `explicit-migration` event exists,
  // (b) `origin.state` retains AT LEAST the prior slice set by id, and (c) origin still carries
  // the full prior event history (checked below, unchanged). Everything else that shrinks is
  // still refused, with a message that now says what would make it legal.
  const be2 = before.slices ?? [], ae2 = after.slices ?? [];
  if (before.slices != null && after.slices != null && ae2.length < be2.length) {
    const originSlices = after.origin?.state?.slices;
    const preserved = Array.isArray(originSlices) && be2.every((s) => originSlices.some((t) => t.id === s.id));
    const events = Array.isArray(after.events) ? after.events : [];
    const migrated = events.some((e) => e.type === 'explicit-migration') && preserved;
    if (!migrated) {
      out.push('controller: slice history shrank — legal only as a vocabulary migration that keeps an explicit-migration event and every prior slice id in origin.state');
    }
  }
  const be = before.events ?? [], ae = after.events ?? [];
  if (!Array.isArray(ae) || ae.length < be.length) out.push(`controller: event history was not preserved (${be.length} -> ${Array.isArray(ae) ? ae.length : 'none'})`);
  // ── SCOPED 2026-09-22: WHY THIS IS A PRESENCE CHECK AND NOT A LENGTH EQUALITY ───────────────────
  // This line used to demand `after.origin.events.length === before.events.length` on EVERY pair.
  // That is wrong in the only direction that costs a false positive: a migration is ENTITLED to append
  // to its own history (the real v9 does exactly that — it appends `explicit-migration`), so the
  // requirement could only ever pass for a pair that had appended NOTHING. For the supported v9 state
  // the declared predecessor carries 216 events while the migration's own event list carries 219, so
  // the strict form refused a correct migration. What the gate actually needs to know here is that
  // origin CARRIES the prior history at all; the DEEP prefix comparison below is what proves it was
  // carried UNCHANGED. A length check is neither necessary (the prefix check subsumes it) nor
  // sufficient (an equal-count replacement passes it — mutation M5).
  //
  // `null`/absent remains a violation; `[]` against a 216-event predecessor remains a violation
  // because 0 < 216. Only "origin carries MORE than the predecessor" is now admitted, and only past
  // the prefix comparison, which is where the real verification happens.
  if (!Array.isArray(after.origin?.events) || after.origin.events.length < be.length) {
    out.push(`controller: origin does not carry the full prior event history (expected at least ${be.length}, present ${Array.isArray(after.origin?.events) ? after.origin.events.length : 'none'})`);
  }

  // ── R7-02 (Astra Review 7, HIGH): THE PREDECESSOR SNAPSHOT MUST BE VERIFIED, NOT SHAPE-CHECKED ──
  // Everything above this line compares COUNTS, ID SETS, and top-level KEYS. Astra measured that the
  // gate still admitted all six of these mutations:
  //
  //   allowedFiles: ["a","b"] -> ["a"]              []      (content shrunk inside a surviving key)
  //   frozen: {file:"hash"}   -> {}                 []      (object emptied, key SURVIVES)
  //   digest: "digest"        -> null               []      (value nulled, key survives)
  //   same slice count, replacement slice ID        []      (id swap keeps the count)
  //   equal-count replacement of historical events  []      (event bodies swapped, count equal)
  //   almost-empty before/after controller          []      (both sides gutted together)
  //
  // I reproduced five of the six against the shipped function (`tmp/r702-mutation-probe.mjs`). The
  // root cause is structural and worth stating, because it is why the earlier fix did not generalise:
  // the per-slice field loop below calls `beforeById.get(afterSlice.id)`, and for the C→S vocabulary
  // migration the active ids are `C0…C5` while the historical ids are `S83…S90` — **zero overlap**.
  // Every lookup returns `undefined`, every iteration hits `if (!prior) continue`, and the loop body
  // NEVER RUNS on the one migration it was written to police.
  //
  // Astra's instruction is precise: *"require `after.origin.state` to equal the parsed, hash-verified
  // predecessor, require the complete historical event prefix, and validate the explicit old-to-new
  // scope mapping. Do not invent a generic status ordering inside this preservation checker."*
  //
  // So the check is now CONTENT EQUALITY against the predecessor we were handed, not a per-field
  // diff over a join that can silently match nothing. `origin.state` and `origin.events` are the
  // migration's claim about the IMMUTABLE PAST; if that claim is not the predecessor byte-for-byte,
  // the migration has rewritten history and no downstream field check can be trusted.
  //
  // ── SCOPING, MEASURED (2026-09-22) ──────────────────────────────────────────────────────────────
  // This block was first written UNCONDITIONALLY and it broke four long-standing admission tests
  // (`not ok 9 / 16 / 19 / 22`) with `[ 'controller: origin.state is MISSING …' ]` where `[]` was
  // required. That was MY error, not the tests': a uniform-size PASSING fixture has no `origin`
  // because a pair with nothing to hide has nothing to declare, and demanding a snapshot there
  // converts "no migration claimed" into "a migration failed to prove itself". The requirement
  // belongs to the case that exists BECAUSE of the snapshot — the one that RE-SCOPES history
  // (`origin`, `scopeCorrections`, `origin.state` appear in the real state for exactly that reason,
  // and only where a slice set was replaced). Applied to a non-shrinking pair it is a new
  // requirement invented by the checker, which is the defect this whole review keeps finding.
  //
  // So the whole snapshot-verification block runs iff the active slice set SHRANK. The mutations it
  // exists to catch are all shrink cases (the attack is "you lost history and rewrote the claim to
  // look consistent"), and for a non-shrinking pair there is no lost history for a snapshot to lie
  // about. NOTE the two checks that are NOT optional — "origin carries the prior events at all" and
  // "an explicit-migration event is recorded" — stay outside this guard, because they predate
  // R7-02 and are what keeps the non-shrinking path honest.
  if (ae2.length < be2.length) {
    const originState = after.origin?.state;
  if (originState == null) {
    out.push('controller: origin.state is MISSING — a vocabulary migration must carry the immutable predecessor snapshot');
  } else {
    const diffs = deepDiffs(before, originState, 'origin.state', 8);
    if (diffs.length) {
      out.push(`controller: origin.state does NOT equal the predecessor (${diffs.length} difference(s), first: ${diffs[0]}) — the snapshot must be the parsed, hash-verified predecessor`);
    }
  }
  // The event history's PREFIX must be the predecessor's events, element by element and deep. A
  // length comparison cannot see an equal-count replacement, which is one of the admitted mutations.
  const originEvents = after.origin?.events;
  if (!Array.isArray(originEvents)) {
    out.push('controller: origin.events is missing — the prior event history was not carried');
  } else {
    for (let i = 0; i < be.length; i += 1) {
      const d = deepDiffs(be[i], originEvents[i], `origin.events[${i}]`, 1);
      if (d.length) { out.push(`controller: origin.events preserved ${i} of ${be.length} prior events, then diverged — ${d[0]}`); break; }
    }
  }
  // An ACTIVE state that contains no slices is not a migration, it is an erasure — unless the
  // predecessor was itself empty. (This is the "almost-empty before/after" mutation: gutting BOTH
  // sides together passed, because every check compared the two gutted values to each other.)
  if (be2.length > 0 && ae2.length === 0) {
    out.push(`controller: active slices are EMPTY after the migration while the predecessor had ${be2.length} — a migration preserves or re-scopes history, it does not delete it`);
  }
  } // end of the shrink-scoped snapshot verification (see SCOPING above)
  // ── THE OLD→NEW SCOPE MAPPING: VALIDATED IF DECLARED, NOT MANDATED ──────────────────────────────
  // Astra's instruction is to "validate the explicit old-to-new scope mapping". My first attempt at
  // this MANDATED a `scopeMapping` field, and that refused the real, correct v9 migration — measured,
  // not feared (`tmp/r702-real-probe.mjs`: 1 violation against the declared predecessor). Two facts
  // decided the correction:
  //
  //   1. `scopeCorrections` in the real state lives three levels deep inside a nested historical
  //      snapshot (`origin.state.origin.state.origin.scopeCorrections`, 31 entries) and is ABSENT at
  //      the level a migration checker can legitimately read. Demanding it at the top level invents a
  //      requirement the supported state does not carry.
  //   2. The real 9→6 change replaces EVERY id (every predecessor id is absent from active). That is
  //      a vocabulary migration, and it is exactly what the `explicit-migration` event exists to
  //      authorise — so a total id replacement is NOT itself the defect.
  //
  // What R7-02 actually needs is that a declared mapping be CHECKED rather than trusted: entries
  // well-formed, and each side naming a real slice. An undeclared mapping stays legal (the event is
  // the authority); a DECLARED-BUT-WRONG mapping is a violation. That closes the mutation without
  // converting a correct migration into a failure.
  const corrections = after.origin?.scopeCorrections ?? after.scopeCorrections;
  if (corrections != null) {
    if (!Array.isArray(corrections)) {
      out.push('controller: origin.scopeCorrections is present but not an array — the old-to-new mapping must be a list of {from,to}');
    } else {
      for (const c of corrections) {
        if (!c || c.from == null || c.to == null) { out.push(`controller: scopeCorrection entry is incomplete (${JSON.stringify(c)}) — each needs {from,to}`); continue; }
        if (!be2.some((s) => s.id === c.from)) out.push(`controller: scopeCorrection names "${c.from}" which is NOT a predecessor slice id`);
        if (!ae2.some((s) => s.id === c.to)) out.push(`controller: scopeCorrection names "${c.to}" which is NOT an active slice id`);
      }
    }
  }
  if (!ae.some((e) => e.type === 'explicit-migration')) out.push('controller: no explicit-migration event recorded');
  const cadence = after.authorization?.cadence;
  if (cadence !== 'final-astra') out.push(`controller: cadence is "${cadence}", not final-astra (D12/Sean 2026-09-21)`);

  // ── R6-10 / #55: PER-SLICE FIELD LOSS — THE BLIND SPOT ABOVE, NOW MEASURED AND CLOSED ────────
  // The v7->v8 incident's actual damage was not shrinkage; it was five of nine slices keeping their
  // id and losing `digest`, `frozen` and `reviewDisposition` while being demoted `tested -> build`.
  // Every check above passed that pair. The fix derives the EXPECTED field set from `before` — it
  // never hardcodes a field name, so no slice-plan vocabulary decision is smuggled in here — and
  // reports any field present on a still-existing slice in `before` that the matching `after` slice
  // no longer carries. Purely ADDITIVE migration is therefore never flagged, which is the correct
  // bias: this gate exists to refuse loss, not to refuse change.
  //
  // Status gets the same treatment separately, because a status that moves FORWARD between any two
  // declared stages is a build, while a status that moves BACKWARD is the demotion the incident
  // exhibited. Without a declared order this would need assumptions, so it is reported as a
  // DISTINCT, NAMED observation rather than folded into field loss — the two have different fixes.
  const beforeById = new Map((Array.isArray(be2) ? be2 : []).map((s) => [s?.id, s]));
  for (const afterSlice of (Array.isArray(ae2) ? ae2 : [])) {
    const prior = beforeById.get(afterSlice?.id);
    if (!prior) continue; // a NEW slice is additive; nothing to lose
    for (const key of Object.keys(prior)) {
      if (key === 'id') continue;
      if (!(key in afterSlice)) {
        out.push(`controller: slice "${prior.id}" lost field "${key}" (present before, absent after)`);
        continue;
      }
      // A KEY THAT SURVIVES BUT IS EMPTIED IS THE SAME LOSS WEARING A DISGUISE. My first fix only
      // tested `key in afterSlice`, so `fields: ['a','b','c','d'] -> fields: []` passed — measured,
      // not assumed (the probe caught the status change and NOT the field emptying). The v7->v8
      // incident is exactly this shape, so an empty-vs-populated regression is reported too.
      const pv = prior[key], av = afterSlice[key];
      const emptiedArray = Array.isArray(pv) && pv.length > 0 && Array.isArray(av) && av.length === 0;
      const emptiedText = typeof pv === 'string' && pv.length > 0 && av === '';
      if (emptiedArray || emptiedText) {
        out.push(`controller: slice "${prior.id}" field "${key}" was EMPTIED (had ${Array.isArray(pv) ? pv.length : 'text'}, now empty)`);
      }
    }
    if (prior.status != null && afterSlice.status != null && prior.status !== afterSlice.status) {
      out.push(`controller: slice "${prior.id}" status changed ${prior.status} -> ${afterSlice.status} — legal only if the new state is a declared stage of the same slice`);
    }
  }
  return out;
};
