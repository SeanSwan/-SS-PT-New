---
artifact_id: SWAN-CHART-WRITER-DECISION-RECEIPT
owner: Sean decisions relayed by coordinating task; lead exact contract; Luna implementation
version: 3.2
effective: 2026-09-04
status: SEAN APPROVED1B/2A; BOUNDED KG1C0 DISPATCH IN25; MOUNTED ADAPTER STILL OPEN
supersedes: conflicting blanket displayed-unit/all-sets-explicit wording in12/15 as expressly decided below
---

# Two decisions before form or writer wiring

Storage is locally verified in22. After the requested pause and recommendation receipt,
the coordinating task relayed Sean's explicit choices1B/2A:

- Explicit lb/kg is required for every new or changed entered-weight write. Untouched
  historical unknown rows remain untouched; no unit inference/backfill.
- Original source-entry value/unit is storage truth. Conversions are display-only and must
  not overwrite it, including when converted drafts exceed DECIMAL12/6.

These behavioral decisions are now approved. The identity/revision/discriminator/transaction
details still need a source-backed bounded blueprint before Luna changes save paths. No new
question about historical units is needed: those units remain unproven. Alternatives below
are retained for the decision record, not simultaneous implementation choices.

## D1 — New explicit sets versus untouched historical unknowns

Evidence:15 currently requires every v1 set to carry explicit numeric weight+lb/kg.12 requires
historical unknowns to remain unknown. Existing daily/admin writers replace whole row sets;
therefore a notes/reps edit of mixed known/unknown history cannot simply resubmit all rows as
new explicit entries. Clearing every known pair through a legacy request would also lose evidence.

**Approved behavioral direction (1B):** new sets and actual weight edits always require an explicit
valid value/unit. Untouched existing weights use a separate, explicit preserve-recorded mode:
the server re-reads the referenced row inside the existing transaction and preserves its raw
weight and recorded pair exactly, includingNULL/NULL. No guessing, normalization or retagging.

Required safeguards if approved:

- Only an existing row belonging to the authorized target workout may be referenced.
- A current revision/concurrency check prevents stale preservation; mismatch rejects409,
  with zero writes. Do not invent a revision column without a separate schema decision.
- Preserve mode cannot also supply a replacement weight/unit or server-derived totals.
- New rows, imports and AI-created sets cannot use preserve mode to manufacture unknowns.
- Unit confirmation is an explicit weight edit with provenance, not a side effect of notes edits.
- Exact payload discriminator, revision source, authorizer path and atomic copy semantics must
  be specified and tested in the next writer blueprint; no guessed wire shape in Luna code.

Alternative: require explicit confirmation for every historical unknown before any whole-workout
edit can save. Simpler contract, but blocks ordinary historical notes/reps edits when nobody
knows the original unit. Rejected recommendation: default old rows tolb/kg or clear known pairs.

Adjudicated: preserve untouched existing weight evidence; do not require invented unit
confirmation to save unrelated edits. Exact server-preservation wire shape remains a lead gate.

## D2 — Source precision versus display-unit conversion

Evidence:12 keeps unrounded draft mass but says visible forms send their displayed unit.15
rejects more than six submitted fractional digits; actual NUMERIC12/6 rounds at SQL coercion.
An exact100kg→220.46226218487757lb conversion cannot be saved in that new unit losslessly
under the current type. Silent rounding or repeated toggle-and-save conversion changes evidence.

**Approved behavioral direction (2A):** keep the last explicitly entered value/unit as the draft's
authoritative source. A unit toggle changes the presentation only until the user edits the
numeric text. Saving an otherwise unchanged draft sends its original exact source pair.
Once numeric text is edited, that value and the currently selected unit become the new source,
subject to strict six-decimal validation before any SQL.

Required visible behavior if approved:

```text
Load shown:       220.46  [lb | kg]
Originally entered: 100 kg · converted display
Save preserves 100 kg unless you edit the number.
```

The equivalent label prevents a hidden mismatch between displayed and submitted units. A unit
chosen before first entry sets that entry's source unit. Unknown historical weights cannot be
converted; preserve them under D1 or require explicit confirmation. Viewer preference switches
never alter stored facts, records or calculations. Machine payloads always name the actual
source unit; the previous blanket 'send displayed unit' wording would need an explicit amendment.

Alternative: an explicit unit toggle creates a new converted entry rounded to six decimals,
with visible rounding disclosure and undo. Easier serialization, but no longer lossless and
needs error-bound/record-eligibility rules. Silent relabeling100kg as100lb is never acceptable.

Adjudicated: source-preserving display toggles; no rounded converted re-entry caused solely
by changing units. This receipt changes the approved behavior contract, not application code.

## Exit condition

Lead updated12/15; source receipt24 records actual mounted identity and route risks.
Blueprint25 specifies and dispatches a five-file pure operation/draft slice implementing
these approved behaviors. Its outer wire/revision/atomic reconciliation adapter remains
a subsequent exact lead contract. No new migration, provider payload or production change.
