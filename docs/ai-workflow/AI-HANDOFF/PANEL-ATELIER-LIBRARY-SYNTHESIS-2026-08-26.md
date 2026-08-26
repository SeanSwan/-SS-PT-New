---
decision: "The asset library ships. Four seats converged on the unverified JSONB query — already settled by a probe run while they reviewed. GLM found a real row-loss bug in the cursor that eats exactly the object the product makes most: a batch."
status: shipped
supersedes: none
---

# Panel synthesis — the asset library · 2026-08-26 (loop iteration 5)

**Seats:** Ox Alpha, GLM-5.3, Qwen 3.8, HY3, Grok 4.6 — **Kimi dropped on purpose**, per this lane's own calibration: it has been the priciest seat with the fewest findings twice, and this is gate-shaped review rather than breadth-limited.
**Estimated spend ~$0.0434** — roughly a third of the six-seat rounds, for a round that produced the sharpest single finding yet.
**Verdicts:** REVISE. **Final Decider:** Fable 5.

## The consensus finding, and why it was already answered

**Four of five seats flagged the same thing: `Op.contains` on a JSONB array was asserted but never executed** (GLM P0, HY3 P0, Grok P1, Qwen P1). They were right to — the packet said so itself.

While they reviewed, I ran the probe I should have run first. Sequelize's own generator, real Postgres dialect:

```sql
"tags" @> '["brandkit:universal","workspace:ws-1"]'
```

That is the correct JSONB-array containment form, not the `ARRAY[...]` construction Qwen and HY3 specifically feared. It is now pinned by a test that generates the SQL rather than asserting an object.

**This is last round's lesson applied correctly.** Iteration 4 shipped its central defect as an open question and six seats spent findings confirming it. This round I probed the open question *while the panel ran*, so their agreement became confirmation rather than discovery.

## The finding I did not have: the cursor eats batches

**GLM P1 #3, and it is the best finding of the round.** `created_at` is `TIMESTAMPTZ NOT NULL DEFAULT now()` — Postgres stores **microseconds**. A JavaScript `Date` holds **milliseconds**. So a cursor built from a row is already truncated, and `created_at < cursor` then excludes every row inside the remaining sub-millisecond window: rows *older* than the cursor row but within the same millisecond are silently skipped and never appear on any page.

That is not a rare edge. **A four-up Compose batch writes four rows inside one millisecond** — so the product's most common object is exactly the thing this loses, and it loses it silently, on page two, where nobody looks.

Fixed by sorting and comparing at a precision the cursor can represent:

```sql
WHERE (date_trunc('milliseconds', "created_at") < '2026-08-26 10:00:00.000 +00:00'
    OR (date_trunc('milliseconds', "created_at") = '2026-08-26 10:00:00.000 +00:00'
        AND "id" < 'aaaaaaaa-...-001'))
ORDER BY date_trunc('milliseconds', "created_at") DESC, "id" DESC
```

Both halves truncate, so the slice is cut against the same key it sorts by. Pinned by a test asserting the generated SQL, not the clause object.

## Also fixed

| Finding | Seat | What landed |
|---|---|---|
| **Filter allowlist would drift from the model** | GLM (P2) | **It already had.** My list was `['image','video']`; `MEDIA_ASSET_KINDS` has allowed `'audio'` all along, so an audio asset could be written and never filtered for. Fixed, and pinned by a drift test that compares the two lists |
| A connection-string-shaped literal in a test | the secret scanner, not a seat | `new Sequelize({ dialect: 'postgres' })` needs no URL. A scanner that cries wolf is one people learn to ignore |

## Disproven, with evidence

| Claim | Seat | Why it does not hold |
|---|---|---|
| Owner scope can vanish because Sequelize drops `undefined` where-keys, returning every user's assets | GLM (P0) | Real mechanism, already guarded: `if (!req.userId) throw E_BAD_OWNER` runs before the clause is built, and a test asserts an owner-less request refuses rather than listing. Genuinely the sharpest *hypothetical* of the round |
| No limit clamp — cheap DoS amplification | GLM (P2), Grok (P2) | Clamped to `MAX_PAGE` 100, tested at 10000 → 100 and 0 → 1. The packet failed to mention it; the code always had it |
| The type gate may not cover the hub where the tab is wired | GLM (P1) | It does — the include list is glob-generated and contains `ContentStudioHub.tsx`. That list *was* stale one hour earlier, which is why the question was fair |
| The prompt in provenance violates zero-PII-to-LLMs | Qwen (P0) | Misread. The prompt is the operator's own creative input, sent to the model *as the prompt*, and displayed back only to its author. `buildProvenance` documents this. The adjacent real risk — a prompt containing a client name — is prompt-PII lint, already on the backlog |

## Accepted and deferred, with the trigger named

**"You have shipped the index without retrieval"** (GLM P1 #4, Grok P1 #1). Fair, and the strongest criticism of the slice. The card shows dimensions and the prompt text, not the image — so finding "the glacier one" works by *reading*, not by *recognising*. That is a weaker library than it should be.

The mechanism is known: the list would carry a short-lived signed preview URL per row, which means signing N objects per page. **The trigger is the next slice**, not a someday — it is the top of the backlog, above sequence and taste-feedback.

Also deferred: selecting an asset *into* Compose or Motion (the "reuse" in the slice's name, and honestly not delivered by a list), deletion, sort and date filters, and the indexes — which now want `(owner_user_id, date_trunc('milliseconds', created_at) DESC, id DESC)` as an expression index, joining the index note rather than adding a new problem.

## Proof

Backend **400/400 across 20 vitest suites** and **188/188 across 18 `node:test` files**; frontend **117/117 across 14**; `tsc` exit 0 over the corrected 15-file include; `vite build` exit 0 with `AtelierLibrary.Bme8TQc7.js` beside the `CreatorRenderQueue` control chunk; every file ≤300; secret scan CLEAN.

**Real SQL generated** for both the containment operator and the cursor comparison. **Not proven:** that the statement executes. Calling the generator directly also bypasses attribute→column mapping, so the low-level output shows `"ownerUserId"` rather than `owner_user_id`; the evidence that mapping works on the real path is the shipped persistence code — `findOrCreate({ where: { r2Key } })` against a column declared `field: 'r2_key'`, in production today.
