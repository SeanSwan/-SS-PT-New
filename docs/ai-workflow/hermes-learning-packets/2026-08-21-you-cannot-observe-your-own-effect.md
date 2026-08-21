---
schema: 1.1.0
date: 2026-08-21
originating_model: claude-opus-5
tier_basis: claude-opus-5 is Fable-tier by Sean's explicit designation 2026-08-10 (Rule 68 source gate)
topic: Two upsert/concurrency laws, learned by shipping both mistakes and having a panel find one
decision: absent ≠ erase; delete a guard that can only false-positive; panels earn their cost on data-mutation review
status: shipped (ff78c96, SwanGuard; committed not pushed) — SWA-70
privacy: IDs/roles only; no client data; no secrets; credentials referenced by presence only
models_used:
  - model: claude-opus-5 / builder + arbiter / wrote the reviewed code, reproduced the data-loss bug live, judged every panel finding, implemented and verified the fixes / subscription
  - model: glm-5.3 / hostile seat / deepest review — null-clobber, racy invariant, silent seed drops, non-object JSON body, decodeURIComponent 500; one blocker was wrong but its underlying point held / Z.ai plan credit, 260s
  - model: x-ai/grok-4.6 / hostile seat / independently found the null-clobber AND the sharper title-placeholder sub-case that defeats a plain coalesce / ~$0.11, 268s
  - model: qwen3.8 local / free seat / concurrency gap + racy invariant; P0 overstated (factory options vs runtime interface) but self-flagged low confidence / $0, 30s
  - model: gemini-3.1-pro / design-authority seat / async job queue + status UI; reached the double-click risk from a pure UX angle / subscription
skills_touched:
  - id: Rule 73 (Proof-Before-Done) / held under pressure / the fix was proven by reproducing the bug live FIRST, then re-running the identical command after
  - id: DRY-LOOP law / reinforced / my own dry loop had run clean on code containing a live data-loss bug — a clean loop bounds effort, it does not certify correctness
  - id: consult-panel.mjs / calibrated / recorded per-seat value on a data-mutation review; see the routing note below
  - id: consult-gemini.mjs / defect found, not fixed / silently exits 0 when the --file path cannot be resolved, leaving a month-old artifact in place to be misread as fresh
---

# You cannot observe your own effect

Two durable laws, both learned the expensive way: I shipped the first mistake and a paid panel
found it; I then made the second mistake while fixing the first.

## Law 1 — an absent value is not an instruction to erase

An upsert that writes `col = excluded.col` treats *silence in the source* as *an assertion of
NULL*. Those are not the same statement and conflating them destroys data.

The concrete case: a seed file populated `discovery_reason` for one platform's entries only.
Every re-import therefore erased that column on the other platform's 40 rows. The same shape
would revert handles, counts and playlist ids whenever the snapshot lacked a field the database
had — including anything a *different writer* (a discovery flow, a live stats refresh, the
owner) had put there since.

The fix is `coalesce(excluded.x, target.x)`, but the rule matters more than the SQL: **when
merging a partial source into a fuller record, absence must mean "no opinion", never "delete".**

**And coalesce alone is not always enough.** A mapper that fills a missing name with the record's
own id produces a *non-null placeholder*, which sails straight through coalesce and overwrites a
real value. Any defaulting done upstream of a merge becomes an assertion at the merge. If a
mapper substitutes for missing data, the merge has to be able to recognise the substitute.

## Law 2 — you cannot establish "did I change X" by observing X before and after

I had written a runtime guard: count the enabled rows at the start of the import transaction,
count them at the end, throw if they differ. Three independent review seats predicted it would
false-positive under READ COMMITTED. It did, live — a concurrent enable made a perfectly correct
import abort and accuse itself of something it had not done.

I narrowed it to the only direction the feared regression can move. **The very next run failed
the mirror way**, when a concurrent *disable* looked identical to the regression.

That is the law: **both snapshots contain everyone else's committed work, so the delta between
them is not your effect — it is the world's.** Narrowing the predicate cannot fix it, because
the problem is not which change you watch for, it is that the observation cannot attribute.
Observing your own effect would require the write to report it, and an upsert's `RETURNING`
gives post-statement state, which includes their commits too.

### The corollary: delete a guard that can only false-positive

The guard was removed, not repaired. It had **zero detection power the deterministic tests did
not already have** — the column is absent from both the INSERT list and the DO UPDATE, a pinned
column-list test asserts `enabled` appears nowhere in the statement, a mutation test proves that
assertion has teeth, and the database's own triggers are the floor. Against that, its only
demonstrated behaviour was aborting real work.

**A guard capable only of false positives is worse than no guard.** It costs real failures and
it trains everyone to ignore the alarm. When a runtime check duplicates a structural guarantee,
the structure wins and the check goes.

## Who did what

I wrote the reviewed code, and I shipped the null-clobber bug in it while reporting the slice as
proven. My hostile loop had run clean over it. **GLM 5.3 and Grok 4.6 independently found it**
for about eleven cents; I reproduced it on the live database before accepting it, and Grok
supplied the sharper sub-case (the placeholder that defeats coalesce) that I would otherwise
have missed even while fixing the main bug. Qwen (local, free) independently reached the
concurrency gap; its headline P0 was overstated — it conflated a factory parameter with the
runtime interface — and it said so itself under CONFIDENCE. Gemini, reviewing as design
authority, reached the same double-click risk from a pure UX direction.

Every seat's finding was treated as a hypothesis and verified before action. One of GLM's
blockers was simply wrong on the facts (a default did exist) while its underlying concern was
right — which is the normal shape of a good hostile finding, and the reason verification is
non-optional rather than ceremonial.

## Skills created or changed

- **`consult-gemini.mjs` has a silent-failure defect** (found, not fixed): given a `--file` path
  it cannot resolve, it prints "File not found" and **exits 0**, leaving the previous run's
  artifact in place. The stale file was a month old and about an unrelated subject. Anyone
  reading the artifact rather than the exit path would relay it as a fresh verdict.
- **The DRY-LOOP law was reinforced by being insufficient.** My hostile loop ran clean on code
  containing live data loss. A clean dry loop bounds how long you search; it does not certify
  that what you shipped is correct. The two claims must not be conflated in a closeout.
- **Panel routing, calibrated.** Yesterday's packet recorded that mechanically-specified slices
  do not need a panel. That holds for *specifying* the work and is **wrong for reviewing it**
  when the code MUTATES owner data. The distinguishing feature here: correct and incorrect
  behaviour produced *identical row counts*, so no test I would have thought to write could see
  the difference — only a reader asking "what does this column do when the source omits it".

## Mistakes I made

- Shipped the null-clobber and called the slice proven. I had written the governing principle —
  "could the owner have changed this since the source was authored?" — and applied it only to
  the columns I EXCLUDED, never to the ones I refreshed. **Review the inclusion list with the
  same hostility as the exclusion list.**
- Let two live test suites assert global database state while sharing one database. They passed
  individually and failed together; every green I had reported came from running them apart.
- Repaired the racy guard by narrowing it, without first asking whether the observation was
  possible at all. The narrowed version failed on the next run.
- Missed a third exit-0-on-failure tool by default, catching it only because a timestamp looked
  wrong — one day after authoring a packet that named exactly this failure mode.

## Error → fix → repeat ledger

| Error class | This session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| Trusting a tool that exited 0 without doing the work | 1 (third instance in two days) | **YES — I wrote the packet naming it yesterday** | Reading the artifact's own timestamp. Not the exit code, and demonstrably not having written the warning |
| Reviewing only the decisions made consciously | 1 | no | For every field written, ask what it overwrites and when the source is silent |
| Global-state assertions in shared-resource tests | 1 | no | Assertions scope to what the subject controls |
| Fixing a broken mechanism instead of questioning it | 1 | no | Before narrowing a failing check, ask whether the thing can be observed from here at all |

The first row again, one day on: the write-up did not prevent the repeat. What prevented harm
was noticing a stale date at the moment of the claim. This is now the second consecutive packet
in which the highest-signal entry is *a failure I had already documented*, which is itself the
finding — **documentation is a lookup table for the next reader, not a control on the author.**

## External-model calibration

| Seat | Cost | Real on verification | Keep? |
|---|---|---|---|
| GLM 5.3 | $0 (plan credit) | 4 of 5 blockers real; deepest analysis; one factually wrong blocker with a right underlying concern | Yes — best value on the panel |
| Grok 4.6 | ~$0.11 | Both blockers real, plus the sub-case nobody else saw | Yes — cheapest paid seat, earned it |
| Qwen 3.8 local | $0 | 2 of 3 real; P0 overstated but self-flagged | Yes — free, fire always, never lead |
| Gemini 3.1 Pro | $0 (sub) | Correct but scope-shifted to UI work that the build order defers | Yes for UX; not for data-layer correctness |

Total spend to find a live data-loss bug in production-bound code: **~$0.11**. Recorded so the
routing table learns the positive case as precisely as yesterday's packet recorded the negative
one: **specification rarely needs a panel; review of data-mutating code does.**
