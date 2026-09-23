# R5-03/R5-04 status correction — 2026-09-21

**Trigger:** while recording round 7's blockers I read the Rule 86 archive, as the rule requires, and
found that a prior session had already established part of what my packet's §6.2 described as
`[UNKNOWN]`. This corrects the record.

**Corrected artifact:** `R1-REVIEW-ROUND-7-PACKET.md` §6.2 (committed as `944ad39d1`).
**Archival sources:** `Z:\HostileReviews\2026-09-20-181511-social-bridge-d7-d8-d9-closed-the-ban-50-split.md`
(round 5, workbuddy seat) · `Z:\HostileReviews\2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md`
(round 6, Astra).

---

## 1. What my §6.2 said, and why it was wrong

§6.2 closed with:

> *"So R5-03/R5-04 remain `[UNKNOWN]`, now for a named reason: not 'nobody tried', but 'the live-DB
> connection could not be authorised in this session.'"*

The second clause is true. The first is **too broad**, and the archive says so:

**`WHERE revision < ?` was already proven against a real PostgreSQL 17 on 2026-09-20** — with A/B
controls — in the round-5 review:

| claim | method | recorded result |
|---|---|---|
| D1/F06 — the DB refuses a stale revision | live PostgreSQL 17, `WHERE revision < ?` | **PROVEN.** `rowCount=0` for the stale write; stored revision stays `7`. |
| D1/F06 — the `WHERE` is load-bearing | same statement, `WHERE` removed | **PROVEN.** The row regresses to `3`. The guard does the work. |

Evidence file: `C:/tmp/sspt-race-proof.mjs` (10,183 bytes, mtime 2026-09-20 17:59) — **still present and
read in full while writing this correction.** So the mechanism `applyBridgeSpotlightRevision` depends on
is not `[UNKNOWN]`. Saying so was an error in my record.

---

## 2. The precise status, which is narrower than either story

Reading the harness rather than trusting its filenames produced the real distinction:

**`sspt-race-proof.mjs` Claim 1 is SINGLE-CONNECTION.** It calls `const c = await connect()` **once**
(line 46) and issues its `UPDATE`s **sequentially on that one client**. The interleaving it relies on is
"a newer delivery *then* a delayed older delivery" — a *sequence*, not a *race*. Nothing contends.
Claim 2 **does** use two connections (`c1`, `c2`, lines 103-104), and its control is a genuine
two-transaction interleaving.

So the honest split is:

| proposition | status | basis |
|---|---|---|
| Postgres refuses a stale revision via `WHERE revision < ?` as a **single-statement fact** | ✅ **PROVEN** | round 5, with a load-bearing control, on a real PG 17 |
| The `WHERE` clause is **load-bearing** (drop it and the row regresses) | ✅ **PROVEN** | same |
| Two **concurrent connections** racing that predicate **serialize** | ⚠️ **NOT PROVEN** | Claim 1 never opened a second connection on this statement |
| R5-03/R5-04's specific new claims — the sentinel keeps `imageUrl` out of the UPDATE, and an explicit `null` is written | ✅ **asserted + mutation-proven at the mock level**; ⚠️ **not exercised live** | this session's probe (below) plus Astra round 6 |

The middle row is the one my §6.2 flattened away, and it is the row that actually matters: it is the
difference between *"the SQL predicate means what we think"* and *"two writers cannot beat each other
to it."*

**This is a defect in the evidence base, and it is small and fixable:** Claim 1 needs a second
connection. Two clients, one holding a transaction open between its read and its write, the other
landing the newer revision in that window, asserting the loser sees `rowCount=0` **because it was
actually racing**. Claim 2 already demonstrates the two-connection pattern; Claim 1 simply did not adopt
it. "Race" in the filename was aspirational for half the file.

---

## 3. Astra round 6 had already ruled on R5-03, and its ruling is still live

The round-6 review (`2026-09-21-142804-…`, published 14:28 today, before this session) says of R5-03:

> *"R5-03 meaningfully asserts column omission, explicit clearing, and insert initialization. **Its
> purported newer-image case adds no interleaving: `B` is never injected.**"*

Both halves matter:

* **The positive half** — "meaningfully asserts column omission" — corroborates this session's probe
  independently. That is the first independent confirmation the sentinel logic has had, and it is
  worth more than my own measurement because Astra did not write the fix.
* **The negative half** — "`B` is never injected" — is **still true, and my new tests do not change it.**
  My five added cases assert payload shape on a happy path; none injects the concurrent `B` delivery
  that the R5-03 story is *about*. My probe doc is careful not to claim otherwise (§6: "Closes
  nothing"), but a reader could reasonably infer more from a suite that grew than it should.

**Astra round 6's other Medium was already remediated** before this session: the R5-04 attachment test
now asserts `mockUpdate` was called **twice** and inspects the second call's payload and predicate,
with an in-file note recording the mutant that proved the old assertions vacuous
(`bridgeSpotlightImageOwnership.regression.test.mjs:192-199`). So round 6 was not a list of open items —
one of its two mediums is closed and mutation-proven.

---

## 4. The two-connection race was run, and it closes the gap

The correction above identified the unproven proposition precisely — and a precise statement of a gap
is a specification for closing it. The harness named in §5 of the round-7 packet was written and
**executed against a real PostgreSQL 17** in this session:

`backend/tests/db/sspt-predicate-race-2conn.mjs` — two live connections, a genuine window (c2 holds an
uncommitted write on the contended row), and a control that runs the *identical* choreography with the
`WHERE` removed so the claim cannot pass for the wrong reason.

**Measured result:**

| | contention observed | loser `rowCount` | final revision |
|---|---|---|---|
| **Claim A** — WITH the shipped predicate | ✅ `contended=true` — a backend held a `Lock` wait | **0** | **9** (winner holds) |
| **Claim B** — CONTROL, `WHERE` removed | ✅ `contended=true` | **1** | **7** (loser clobbers) |

All four assertions PASS. Contention was **observed via `pg_stat_activity`, not assumed** — the window
is real, and the control shows the predicate is load-bearing under that real contention.

**So the middle row of the §2 table is no longer `[UNKNOWN]`.** Two concurrent connections racing
`WHERE revision < ?` serialize, proven live, with a control.

### The harness deadlocked itself first, and the diagnosis is the interesting part

The first run **hung** and was killed by a 90 s timeout; the server logged
`unexpected EOF on client connection with an open transaction` **twice**. This was a bug in the
harness, and understanding it is worth more than the fix:

Under `READ COMMITTED`, c1's `UPDATE … WHERE revision < 7` must evaluate the predicate against c2's
**uncommitted** row. Reading an uncommitted row means contending for the lock c2 holds — so **c1
blocks**. The first version awaited c1's racing write *before* reaching `c2 COMMIT`, so c1 was waiting
on c2 while c2 was waiting on the script: a cycle closed by the harness. **The fix is to fire c1's
write without awaiting it, commit c2 to release the lock, and only then await c1.** That ordering is
also what ships in practice — `applyBridgeSpotlightRevision` does not hold a transaction open across
the conditional write, so the product path never forms this cycle.

**A hang, not a failure, was the first symptom**, and a hang is the more dangerous one: a failing
assertion reports itself, while a hang looks like patience. The deadlock is recorded in the harness's
own docblock so the next reader does not rediscover it.

### Residual, stated honestly

* The harness runs against a **scratch `postgres:17-alpine`** on a free port, created and removed in
  this session. It exercises the **SQL mechanism** under real two-connection contention. It does **not**
  run the Express handler, the HMAC path, or the image I/O — that limit is unchanged from round 5
  (*"the mechanism is proven; the composed system is not"*).
* **R5-03's sentinel and R5-04's attachment are still not exercised under contention.** The harness
  proves the predicate; it does not inject a second writer into `applyBridgeSpotlightRevision` itself.
  Astra round 6's *"`B` is never injected"* still applies to the TypeScript-level tests.

## 5. What this correction changes

**Nothing about the product.** No shipped source file is edited by this correction. The pin and the
apply path are exactly as committed in `bdc02b7bc`. The one added file is a test harness under
`backend/tests/db/`, which nothing imports and no product path reaches.

**Everything about the claim.** The correct statement of the gap, after §4, is:

> The predicate's single-statement semantics are **proven live with a load-bearing control** (round 5,
> 2026-09-20). Two **concurrent connections** racing that predicate **serialize** — now also proven
> live, with an observed contention window and a control (this session, §4). What remains unproven is
> narrower: that **`applyBridgeSpotlightRevision` itself**, with a second writer injected into it,
> behaves as the R5-03 sentinel and R5-04 attachment assertions claim under real contention. No harness
> has yet injected that second writer at the module level.

So the remaining work shrank twice in one session: from *"is the predicate even true?"* to *"do two
writers serialize on it?"* to *"does the module do the right thing when they do?"* — and each step was
taken by reading prior evidence rather than by re-deriving it.

## 6. Why this correction exists, in my own words

I wrote `[UNKNOWN]` because the connection was refused, and I stopped there. That was a measurement I
did not take: the archive was **one directory listing away**, and Rule 86 exists precisely so a prior
verdict is not re-derived. I read `query.mjs`'s output only after committing `944ad39d1`.

The finding is not that the gap is larger than I said. It is that **it is smaller, and differently
shaped** — and that I described it from the blocker outward instead of from the evidence inward.
