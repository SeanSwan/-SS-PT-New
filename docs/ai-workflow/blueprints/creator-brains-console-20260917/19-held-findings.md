# 19 — Held findings: corrections and what is still owed

**Status:** amendments applied 2026-09-20 · **amends:** `05`, `06`, `README` · **does not amend:**
`11`, `12`, `14`, `16`, `17-astra-*` (historical receipts — see §6)

---

## 1. What this document is

The Astra adjudication (`17-astra-adjudication.md`) returned **16 findings**: 5 fixed in that pass and
**11 held** with named owners. This document is the record of the second pass, where **five of the
eleven were closed** and the remaining six had their corrections written down.

**A finding without a fix is not a finding.** So each entry below states the correction, where it
landed, and — where the work is genuinely owned by a slice that does not exist yet — what the slice
must prove. An entry that says "noted" and nothing else is a failure of this document, not a
disposition.

| # | Finding | Severity | Disposition | Where it landed |
|---|---|---|---|---|
| A1-03 | Adapter contract lost implementation corrections | High | **CLOSED** | `05 §1` (rewritten), `web/src/adapters/types.ts`, `fixtures.ts` |
| A1-04 | Drawer has no claims; identifier misdescribed | High | **CLOSED** | `lib/brains.mjs`, new `lib/hits.mjs`, `05 §1`, tests A1-04a–d |
| A1-05 | Acceptance and completion lack correlation | High | **AMENDED** | `05 §1` `startDailyRun`; proof owed by S4 |
| A1-06 | A console mutex cannot protect the shared journal | High | **GATED** | §4 — **S3 (repair) AND S4 (daily)** cannot ship without the two-process test |
| A1-07 | Repair is not the documented operation | High | **AMENDED** | `05 §1` `repair()`; proof owed by S3 |
| A1-13 | "Non-2xx means nothing changed" is too broad | High | **AMENDED** | §5 — the two failure classes are now distinct |
| A1-14 | Tests and visual contracts leave material gaps | Medium | **PARTLY CLOSED** | `06` §3; 375px drawings owed by S5 |
| A1-16 | Attribution and cost claims disagree inside the packet | Low | **CLOSED** | `README` §Evidence; §6 |

---

## 2. A1-03 — the contract now says what the code does

`05 §1` declared **numeric** creator counts, **omitted** brain generation, and **narrowed** canary
provenance to `{ok, version, reason}`. All three were narrower than the shipped implementation, which
is the direction of error that makes a document worse than useless: a reader trusts it and stops
looking.

- `CanaryReading` is now a named type carrying `checkedAt`, `ageMs`, `source`, `stale`, `note`.
  **`source` is three-valued and `unknown` is a real value, not an absence** — since A1-10 the
  production probe runs off the event loop, so a cold read has started a probe and has no verdict
  yet. Reporting that as `source:'probe'` would present "we have not checked" as a live reading.
- `CreatorRow.videos`/`fetched` are `number | null`. `null` means the count **could not be taken**;
  `0` means it was taken and is zero. The distinction is the whole point: a guard value presented as
  a measurement renders "0 videos" for a creator that has videos.
- `BrainDoc` carries `generation` — the pinned generation the markdown **and** the claims both come
  from.
- `QueryHit` declares `statement` and `topic`, which **both routes already served**. The type
  under-declared them, and `web/src/adapters/fixtures.ts` had been written to the narrow type, so the
  fixture was missing two fields the server returns. `tsc` caught it the moment the type was widened
  — which is the argument for publishing corrected types rather than leaving them aspirational.

**A1-03 also demanded "validate every newly consumed response".** `parseStatusInstrument` already
does this for `/api/status` (S1-H18); the remaining routes are covered in `web/src/adapters/validate.ts`
and the scope decision is recorded there.

---

## 3. A1-04 — the drawer serves claims, and the key is a channel ID

`brainDoc` returned `claims: []` **unconditionally**, while `03-wireframes.md` promised a claim
drawer and `types.ts` declared `claims: QueryHit[]` with a fixture that populated it. The client was
ready, the contract was published, and the server was a stub — an empty drawer that renders as "this
creator claimed nothing", which is the **S1-H15 shape** this route has already been burned by once.

- Claims are read from the **same pinned generation as the markdown**, through the engine's own
  `loadHits` — not a second reader of `rules.jsonl`, which would drift from that function's
  required-field list and skipped accounting.
- The claims come from the **same pinned generation as the markdown** — ONE pointer read names one
  generation directory, and every leaf is read from it. **Do not reintroduce a second resolution.**
  An earlier version re-resolved the pointer for claims and compared generations only *inside the loop
  over hits*, so an empty generation skipped the comparison entirely and served generation 1's markdown
  beside generation 2's (empty) claims. `R2-03b` now pins the reader to **exactly one** `readPointer`
  call site, and `R2-03`/`R2-03c` cover the behaviour; this paragraph previously *instructed* the
  second resolution, which would rebuild the defect.
- A generation with no `rules.jsonl` **reports it** in `skipped`, in the same `{file, reason}` shape
  the three markdown files use. Empty **and** explained.
- `getBrain(channelId)` — not `slug`. `lib/render.mjs` HR07 is explicit: "the storage namespace is the
  CHANNEL ID, never a display name." `slugify` exists in the engine but produces *filenames* for other
  surfaces; it does not name a brain namespace.

**One deliberate divergence, pinned rather than hidden.** The drawer reads the raw row and carries the
engine's real `claim_id`; `/api/query` reaches the shape through `queryBrains`, which **drops**
`claim_id`, so it falls back to `${videoId}:${tStartMs}` — an id that **collides** for two claims in
one video at the same millisecond. Discarding a correct identifier so that two routes can be wrong
together is worse than one route being visibly better, so the drawer keeps the real id and
`bridge.brains.test.mjs` **A1-04b asserts both values explicitly**. Every other field is asserted
identical, field for field.

> **New observation, engine-owned.** `queryBrains` does not pass `claim_id` (or a creator title)
> through, so `/api/query` cannot serve either. Fixing it is an engine change, which S0's
> additive-only boundary forbids here. **Owner: engine.** No console patch should work around it
> twice.

---

## 4. A1-05 / A1-06 / A1-07 — the run and repair contracts

**A1-05 — acceptance is not completion.** `startDailyRun` now returns
`{requestId: string, runId: string | null}`. The engine's `run-daily.mjs` does not accept a
caller-supplied run id, so an honest `runId` cannot exist at acceptance. The console returns its own
`requestId` immediately, correlates the child process to an engine journal entry, and uses **that**
entry's run id. **Never treat process exit, or a lock disappearing, as success.**

**A1-06 — a console mutex cannot protect the shared journal.** `lib/run.mjs:107` writes the journal
*before* attempting the engine lock at `:154`, so the console's own exclusion does not cover an
external runner (the CLI, or a second machine against a synced store). `09#H1` called the lock a
sufficient backstop; it is not.

> **S3 + S4 GATE (widened 2026-09-20, R3-05).** **Neither S3 (repair) nor S4 (daily run)** can ship
> until a **two-process journal-preservation test** passes: two runners against one store, asserting
> the journal is never interleaved or truncated. This entry previously gated **S4 alone**, which left
> the same journal reachable through S3's `POST /api/repair` — repair invokes the same `runDaily`
> journal path, so gating one door and shipping the other is gating nothing. If the test fails, the
> defect goes to the **engine owner**. No console patch to engine files — the boundary is additive-only.

> ### ⚠️ THE GATE WAS BUILT 2026-09-21 AND IT **FAILS**. THE DEFECT IS ENGINE-OWNED.
>
> `scripts/creator-brains/test/journal-preservation.test.mjs` (5 cases; real child processes, because
> the claim is that an EXTERNAL runner is uncovered and a same-process test would beg the question).
> **Two cases are RED and must stay red until the engine is fixed.** They are not a flaky test and not
> an unfinished console: they are the measurement this gate was widened to obtain.
>
> **What the defect actually is — measured, and NOT what the entry above predicted.** The journal is
> *not* torn and *not* byte-interleaved: `writeJsonAtomic` (`lib/paths.mjs:136`) writes a pid-unique
> temp file and renames, so a reader never sees a half-written journal. An assertion that "the file
> still parses" therefore passes while the damage happens. The journal is a **single slot** — one
> whole-file overwrite — opened **before** the lock, so the two lost-update failures are:
>
> 1. **Truncation by open.** Two runners each `writeRunJournal` at `:107`; the second replaces the
>    first outright. One run's entry is simply gone.
> 2. **Truncation by refusal.** `finalizeRunJournal` (`store.mjs:249`) **reads the current journal and
>    overwrites it** with its own concluding record. So a run **REFUSED by the lock still concludes**
>    and stamps `status: failed` over whatever was there — including the entry of the run holding the
>    lock. Reproduced end to end against the shipped engine, output verbatim:
>
>    ```
>    [1] while the run is in flight, the console says:
>        lastRun = {"status":"running","runId":"SCHEDULED-OK"}
>    [2] after a REFUSED repair, the console says:
>        lastRun = {"status":"failed","runId":"REFUSED-REPAIR"}
>    ```
>
>    The reader driven there is the **console's own** `runState` (`status.mjs:151,173`), so the
>    consequence is operator-visible, not internal: **the console reports a failed last run, naming a
>    run that was refused, while the run actually holding the store is succeeding.** `05 §2b` already
>    says a `409 RUN_LOCKED` is "a refusal of the run, NOT proof the store is untouched"; this is the
>    same defect one layer in, and it is the reason the console checks `lockStatus` before entering
>    `runDaily` (see `lib/repair.mjs`). That console-side ordering closes the door *for this client* —
>    it cannot close it for the CLI, a scheduled task, or a second machine on a synced store. **That is
>    precisely the residual A1-06 names, and it can only be fixed in the engine.**
>
> **What a fix must do (engine owner's call; recorded so it is not rediscovered):** a refused run must
> not write the journal at all, *and* a finalize must not clobber an entry belonging to another run id.
> The single slot appears **intentional** — HR16's rationale is "an INTERRUPTED run is visible as an
> open journal rather than as silence", i.e. a current-status heartbeat, not an audit log (`runs/` and
> the ledger carry history). So the likely shape is a **guarded** slot rather than a multi-slot file:
> refuse the write when the journal belongs to a *different, live* run id. **This document does not
> prescribe the fix** — it records the measurement and names the owner.
>
> **Slice status, stated plainly rather than optimistically.** S3's other exit criteria are green
> (T-B9/**B10**, T-W5; zero-hit + skipped honesty; `409 RUN_LOCKED {holder}`). The gate case that binds
> S3 to this journal is now **written and red**, which is a strictly better state than an untested
> claim: the defect is named, reproduced, and routed. **S3 and S4 do not ship until the engine fix
> lands and these two cases go green.** Shipping either door now would ship the exact truncation this
> gate exists to catch.

**A1-07 — repair is a projection, not a return value.** The engine's repair path
(`run-commands.mjs:156–163`) runs reconciliation, build and export and returns an **exit code**. It
does not return `{requeued}`, which `05#2b` and T-B10 assumed. The console now documents
`repair(): Promise<{repaired, built, emptied}>` — a **projected** engine result, produced by invoking
the same `runDaily` configuration through a wrapper and sharing the run-operation exclusion gate with
`startDailyRun`.

---

## 5. A1-13 — two failure classes, not one

`16#S1-H9` correctly prohibits a post-write application refusal: a committed mutation must never be
reported as refused. But that rule **cannot** be extended to "non-2xx means nothing changed" in
general, because two situations are not the same thing:

| Class | Meaning | What the console may say | Retry |
|---|---|---|---|
| **Confirmed pre-write refusal** | The request was refused *before* any mutation was attempted — validation, unknown route, refused write gate, damaged store read *before* the write | "Nothing changed." | Safe to retry |
| **Uncertain outcome** | The connection dropped, timed out, or the process died after dispatch | "The outcome is unknown." **Not** "nothing changed" | **Never automatic** — reconcile with an authoritative read first |

The distinction is now part of the contract, and the rule that follows from it is absolute:
**never automatically retry a mutation after a timeout or disconnect.** Reconcile with
`GET /api/creators` and the engine's own journal, then decide. An automatic retry on an uncertain
outcome is how one intended write becomes two.

---

## 6. A1-14 / A1-16 — the gaps this document does not close

**A1-14 — three gaps, one of them closed.** `06 §3` now **enumerates** the non-live tests explicitly
rather than relying on a glob that reads as if it excludes them. Still owed, and named so they are
not mistaken for done:

- **375px layouts.** `03-wireframes.md` draws 414px only. A console on a phone-width window is
  undrawn, and undrawn means unverified.
- **A measurable motion limit.** "<5% visual energy" is not a number anyone can check. It needs a
  measurement definition before it can be a contract.
- **A boundary-specific mock matrix.** `07` claims almost no mocks while the suite uses fake fetch,
  WebGL and browser stubs. Which boundary each stub stands in for must be stated, or the coverage
  claim is unfalsifiable.

**A1-16 — attribution and cost.** The README certified HY4 as an independent review while `12#Attribution`
records the correction. The README now marks the **served identity unverified** and points at `12`.

⚠️ **CORRECTED 2026-09-20 (R2-10).** This paragraph previously certified that "**predictive
subscription-usage claims were removed**". **They were not removed.** `10#1`'s "≈ 75k tokens of plan
usage", `10#3`'s "~20k per pass" and `10#6`'s repetition of the ~20k are **all still in `10`**. An
amendment that certifies an edit nobody made is worse than the original claim, because it tells the
next reader the question is closed. The two figures disagreed with each other by nearly 4× when
written, and neither can be verified from inside the session that produced them.

**`10` is now classified HISTORICAL at its header**, where its usage predictions are explicitly
superseded; the README carries the same supersession. Its **billing observations are left as
recorded** — they are not rewritten — because they were verified against this repo's routing doc and
harness code and remain true. **This document, and `10`, make no claim about remaining allowance.**

---

## 7. What this document does NOT establish

1. **No new hostile pass.** Everything here is the *disposition* of a review; the round-2 pass against
   the rebuilt packet is what re-tests it.
2. **No claim that the held items are fixed.** Five are closed with tests; the rest carry a gate or a
   named owner. `A1-06` in particular is a **gate on S3 AND S4** — widened from S4 alone on
   2026-09-20 (§4 above, R3-05). This line said "a gate on S4" until round 9c, which contradicted §4
   and is exactly the drift that makes a gate look narrower than it is: repair reaches the same
   `runDaily` journal path as the daily run, so gating one door and shipping the other gates nothing.
   **As of 2026-09-21 the gate's test EXISTS and FAILS** (§4): the journal loses an entry under a
   concurrent runner, and a *refused* run overwrites the journal of the run holding the store. That is
   an **engine** defect with the engine as owner, and **S3 and S4 do not ship until it is fixed**.
3. **No engine change.** Every correction here is console-side or documentary. Two items need the
   engine and are recorded with the engine as owner: `queryBrains` dropping `claim_id`, and the
   **journal truncation** in §4 (found by this gate on 2026-09-21, not by reading).
4. **Historical receipts are untouched.** `11`, `12`, `14`, `16`, `17-astra-*` keep their stale paths
   and counts on purpose: they are evidence of what was true when they were written. Correcting them
   would destroy the record that makes the current state legible.
