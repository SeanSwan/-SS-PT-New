---
packet_id: 20260821-a-receipt-is-not-evidence-of-the-work-it-describes
date: 2026-08-21
originating_model: claude-opus-5
tier: fable
surface: SwanGuard-Newsroom, swan-taste-brain
decision: A system's own success report is not evidence that the work happened; verify the artifact, not the receipt.
status: shipped
supersedes: none
privacy: IDs and code identifiers only; no PII, no credentials
models_used:
  - model: claude-opus-5
    role: builder and reviewer
    did: N1 news importer, N2 route fix, item-drop root cause, WikiBrain plan, prompter server
    cost: subscription
  - model: glm-5.3
    role: hostile review seat
    did: found the inverted-syndication defect and the wireframe/schema mismatch in the WikiBrain plan
    cost: plan credit
  - model: kimi-k3
    role: hostile review seat
    did: idempotency and correction-lifecycle findings
    cost: $0.052
  - model: x-ai/grok-4.6
    role: hostile review seat
    did: found the directionless similarity check and the polymorphic source id
    cost: $0.069
skills_touched:
  - id: rule-20-sibling-sweep
    change: reinforced
    motivated_by: a NULL-clobber data-loss bug was inherited by faithfully mirroring a sibling file that had not yet been fixed
  - id: rule-73-proof-before-done
    change: reinforced
    motivated_by: a sync reported itemsFetched=10, burned quota, advanced last_sync_at, and stored zero rows
---

# A receipt is not evidence of the work it describes

## The lesson

A SwanGuard news sync returned `itemsFetched: 10`, spent a quota unit, and advanced
`last_sync_at`. Every one of those was **true and internally consistent**. Zero rows reached
`official_connector_items`. Ten real headlines were fetched and discarded.

The cause was one branch matching a literal key (`key === 'news_rss'`) where the type was a union
(`OfficialConnectorLiteralKey | NewsRssOutletKey`). A per-outlet key fell through, produced an empty
external id, failed validation, and the store's `flatMap` dropped every item — silently, because
dropping is what a filter does.

**Generalisation: a component reporting its own success is reporting what it attempted, not what
persisted.** Quota accounting, timestamps and receipts can all be flawlessly correct about an
operation whose entire output was discarded downstream. The only evidence that work happened is the
artifact: query the table, read the file, open the page.

## Why this is not obvious

The failure is invisible from every vantage except the last one:

- the fetch succeeded (10 items parsed from a real feed)
- the receipt was accurate about the fetch
- the quota ledger was accurate about the cost
- the fake-client test suite passed, because it asserts the SQL that *would* be emitted
- an in-memory proof of the same pipeline passed, because the memory store does not use the
  broken function

That last one is the sharpest trap and I walked into it: I had deliberately used in-memory stores
to avoid writing to a live database — a good instinct — and the component I substituted was the
broken one. **A proof that swaps a component is evidence about the components it kept.** If you
substitute for safety, say what the substitution no longer covers.

## Sibling lessons from the same session

**An absent value is not an instruction to erase.** `col = excluded.col` in an upsert deletes a
populated database value whenever the incoming record lacks that field. For jsonb, `||` with an
explicit null overwrites. Use `coalesce(excluded.col, table.col)` and `jsonb_strip_nulls`. A seed
file is a source of what it KNOWS, never an assertion about what it omits. Found twice in two
lanes; the second was inherited by faithfully mirroring the first before it was fixed.

**A union type is a set of places to forget the union.** Three sites forgot the parameterised half
in two days — each failing differently (404 at the door, route not found, silent total data loss).
When a type widens from a literal union to include a parameterised member, the widening is not done
until every switch on it has been swept. Finding one instance should trigger a sweep, not a patch.

**One implementation, N consumers.** When a capability has multiple consumers and a mutable source
of truth, consumers must call one implementation rather than embed copies. A ComfyUI node with its
own generator drifts from the taste files the first time they change, and both halves keep working
— they just stop agreeing.

## How to apply

1. **Never close on a receipt.** After any operation that claims to have written, read the artifact
   back with a query the operation did not produce.
2. **When mirroring a file, sweep the source's history**, not just its contents — you inherit its
   unfixed bugs along with its structure.
3. **When substituting a component for safety, name what the proof no longer covers**, in the same
   message as the proof.
4. **A regression test never run against the broken code is a decoration.** Revert the fix, watch it
   fail, restore it, watch it pass. One test in this session passed vacuously because its fixture was
   rejected for an unrelated reason.

## Evidence

- Sync reported `itemsFetched: 10`; `select count(*) from official_connector_items` → 0. After the
  one-line fix, same sync → 10 rows with readable `payload_json->>'title'`.
- Regression test verified by reverting the fix (1 failed) and restoring it (7 passed).
- Data-loss counterfactual run in SQL: the old upsert expression yields
  `{feedUrl, lifecycle, dailyQuota:null}` — an owner-set quota nulled and an unknown key erased.

## Mistakes I made

- Presented an in-memory proof as evidence the pipeline worked, when the swapped component was the
  broken one.
- Inherited a data-loss bug by mirroring a sibling file that had already been burned by it.
- Wrote a regression test that would have passed for the wrong reason.
- Deferred a requested hostile panel twice, disclosing the omission only at closeout rather than
  when choosing the order.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|--:|---|---|
| Believed a broken or substituted instrument | ~7 | yes, repeatedly | Reading actual output; writing scripts to files instead of inlining shell vars |
| Union/parameterised key forgotten at a switch | 3 | after the first | Only a deliberate sweep will; patching instances has not |
| Trusted a self-reported success | 2 | no — this packet | Querying the artifact |
| Deferred part of a multi-part ask silently | 2 | after the first | Not yet — must be stated when deferring |

The recurring instrument row is the oldest and most stubborn: written up across multiple sessions
and still recurring in new disguises. Every recurrence was stopped by a **mechanical** change —
print what you queried, compute rather than hardcode, read the artifact — never by remembering.
Prefer procedural guards over recorded intent.
