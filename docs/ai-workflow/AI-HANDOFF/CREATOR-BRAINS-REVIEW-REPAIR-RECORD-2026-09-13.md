# Creator Brains — hostile review repair record (2026-09-13)

> **Status: the reviewed invariants are repaired and independently re-verified.**
> The reviewer's own two instruments now report **zero violations** against this
> tree, and every finding has a RED→GREEN regression at the real boundary.
> **The receipt is reconciled (§4.3):** one authoritative status and next slice in
> the blueprint §13, a generated requirement-to-test mapping, ten reproducible
> mutation definitions (**10/10 killed**, from 4/10 on the first run), exact source
> hashes, and the installed readiness gate reporting `structurallyReady: true`.
> **What is NOT done:** live OAuth authorization (owner action), the deferred
> semantic-retrieval lane, the owner-run vault copy, and the reconciliation of a
> source spec that was never on disk (§4).
> Do not read this as a full completion receipt for the upstream plan's scope.

Governing plan: [`CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md`](../CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md)
Review packet: `creator-brains-hostile-review-2026-09-13/` (26 findings)

## 0. Verification — every instrument green

| Instrument | Result |
|---|---|
| Engine offline suite (22 files) | **177 / 177 pass** |
| Engine live suite (real YouTube) | **6 / 6 pass** |
| Reviewer `reproduce.mjs` | **0 / 20 violations**, exit **0** |
| Reviewer `transport-probes.mjs` | **0 / 4 violations**, exit **0** |
| Readiness gate (`check-readiness.mjs`) | **structurallyReady: true**, no errors |
| Mutation check (`mutation-check.mjs`) | **10 / 10 killed** — first run was 4 / 10, see §4.3 |
| Real multi-process concurrency (HR14) | **6 / 6 pass** — actual child processes |
| OAuth lane (HR10) | **33 / 33 pass** — PKCE, exchange, refresh, revocation, consent, cancel, timeout, pagination, completeness, secret containment |
| Backup / restore / rollback (HR25) | **11 / 11 pass** — including a real child killed mid-publish |
| Execution bounds (HR23) | **14 / 14 pass** — RED first, then green (§4.1) |
| Resumable census (HR22) | **10 / 10 pass** — RED first, then green (§4.2) |
| Rule 4 line cap | every engine file ≤ 300 lines (largest: exactly 300) |

At intake the same two reviewer instruments reported **20/20** and **4/4**
violations against the reviewed revision.

### 0.1 How much of the reviewer's instrument is unmodified

The packet anticipated adaptation: *"A changed public contract may also require
adapting these diagnostic callers; report such setup failures separately from RED
behavior."* Two call sites needed it, both marked `REPAIR-ADAPT` in the file with
a header block explaining each:

| # | Finding | Why it could not be shimmed |
|---|---|---|
| 1 | HR09 | It read `brains/<slug>/timeline.md`. A display-name directory is exactly what HR07 removed, so that path cannot work without reverting the fix. It now resolves the live generation through `current.json`. |
| 2 | HR07 | Its assertion was `a.slug === b.slug`, which is now **correctly** true — two channels may share a display name; that is what a label is for. The invariant is distinct immutable identity, so it now asserts the namespaces differ, the generations are distinct directories, and **no display-name directory was created** (the actual bug). |

**Nothing was weakened.** Every other diagnostic runs against the repaired engine
unmodified, and the engine keeps backward-compatible NAMES wherever semantics did
not change: `store.loadState`, `buildBrain(root, creator)`, `renderBrain`,
`queryBrains().conflicts`, `deps.listUploads` and `requireDiscovered` all still
work — carrying the REPAIRED behaviour, not the old one.

## 1. The review was right, and my "verified" claim was wrong

I reproduced all of it before changing a line:

```
node <packet>/reproduce.mjs                 -> 20/20 invariant violations
node <packet>/transport-probes.mjs          -> 4/4  invariant violations
```

The review's central criticism is correct and I am recording it plainly: **"built
and verified" overstated the result.** The suite was green while the engine could
overwrite damaged state, exceed its own hourly budget, fetch a creator that was
not asked for, merge "always" and "never" into one doctrine, and keep claims
whose source document was gone. A green suite proved what the suite tested, and
the suite tested helpers rather than the caller boundaries.

Two details from the packet are worth keeping in view because they are about my
own process, not the code:

- The 54 passing tests used `CREATOR_BRAINS_YTDLP=node.exe` as a stub for the
  version lookup. That is not proof yt-dlp was available.
- "11/11 mutations killed" was not reproducible from the packet — the blueprint
  listed six mutations and a re-run. I should not have stated eleven.

## 2. What was rebuilt, by finding

| # | Finding | Repair |
|---|---|---|
| HR01 | Hourly cap reset every run | `ledger.mjs` — persistent reservation journal, **write-ahead**, read by every process. The unit is now explicit: one **yt-dlp transport operation**, reported by kind. Caps are validated (`0`, `NaN`, `Infinity`, fractions refused). |
| HR02 | `fetch <id>` fetched everybody | `run.mjs` takes `onlyCreators`; `pipeline.selectCreators` intersects it with the enabled set and *rejects* a disabled target. Flags are never read as creator refs. |
| HR03 | CLI returned 0 after failures | `cli.verdictExit()` derives the code from the run record. Documented contract: `0` ok · `1` failed · `2` refused · `3` deferred. |
| HR04 | Corruption protection syntax-only | `schema.mjs` — one strict, schema-validated reader for every caller. `null`, arrays, scalars, bad rows, bad versions and truncation are named failures. **`defaultValue()` throws on a damaged read**, so no caller can substitute an empty map by accident. Direct `discoverChannel` now refuses too. |
| HR05 | Corrupt registry became empty success and was overwritten | Registry reads are strict; `add`, `enable` and `sync` refuse to write over a damaged catalog. |
| HR06 | always/never merged into one doctrine | `lexicon.mjs` — **polarity is a first-class field**. Claims carry `polarity`, `action`, `object`, `condition`; doctrine groups by (phrase, polarity); opposite polarities on one phrase are reported as a stance conflict. |
| HR07 | Same-named creators overwrote each other | `brains/<channelId>/` is the namespace. Names are labels. Vault filenames carry the full channel id. |
| HR08 | Missing documents left stale claims live | New `reconcile` phase: a `fetched` row with no valid document becomes `missing_document` and is re-fetched. A creator with no readable documents publishes an **empty generation**, so stale claims stop being queryable. Export reaps from an ownership **manifest**, not the current list, so renamed/removed creators are cleaned too. |
| HR09 | 7-word cap allowed 14-word runs | `fidelity.mjs` — one gate over the **final serialized bytes** of every published file, NFKC-normalized with every non-alphanumeric as a separator. A failing generation is **quarantined**, never published. |
| HR10 | OAuth "just needs credentials" | **Implemented as its own slice.** `oauth.mjs` (PKCE/S256, consent URL with `access_type=offline` + `prompt=consent`, code exchange, refresh that preserves the existing refresh token, expiry with skew, revocation that is RECORDED), `consent.mjs` (loopback callback on an OS-chosen port, bounded wait, cancel via AbortSignal, `state` verified before any exchange), `subscriptions.mjs` (paginated `subscriptions.list` with a **completeness verdict** — a partial, looping, malformed or empty-but-successful walk can never be read as authoritative absence), and the `authorize` command. **Live authorization has NOT been performed**: no owner has consented on this machine, so `sync` reports `oauth_not_authorized` and names the command that fixes it. `OAUTH_STATUS` states all three facts separately, because "the exchange does not exist" and "nobody has consented yet" are different claims and the first one was false before. |
| HR11 | Idempotency ignored timings and trusted the stored hash | `docHash` covers cue text **and timings**, `text`, language, provenance and schema version; the prior hash is **recomputed** before it is trusted, so a tampered document is repaired rather than reported unchanged. |
| HR12 | Incomplete enumeration became a deletion verdict | Rows are JSON records (a tab in a title is data). `classifyEnumeration` returns an explicit completeness verdict; deletion confirmations advance **only on a complete walk**. |
| HR13 | Negative timings became "verified" links | `subtitles.validateCues()` at the engine boundary: finite, non-negative, ordered, non-empty. |
| HR14 | No writer lock; shared temp names | `lock.mjs` — exclusive-create lock with an owner token; a held lock is **never stolen on age alone** (reclaim needs same-host + provably-dead pid). Unique temp names per writer. The whole run holds the lock; a second writer is refused with a recorded outcome. |
| HR15 | "Disagreement" was modality labels under a keyword | A contradiction now requires the **same assertion with opposite polarity**. Compatible caution/directive no longer conflicts. |
| HR16 | Startup failures left no record | A run journal is opened **before preflight** and finalized last. Startup refusals, no-ops and lock-blocked runs all write a run record **and** a digest. Last **successful acquisition** is tracked separately from last attempt, and a run with nothing enabled does not claim one. |
| HR17 | Invalid documents vanished from coverage | `buildBrain` is pure: it receives documents already validated. Invalid ones are reported as gaps; gap rows are deduped by video id. |
| HR18 | Guard checked id existence, not ownership | `checkAuthority` requires the video's channel, the registry row and the enabled flag to agree with the named creator. A mismatch is `not_authorized` (permanent) with **no network call**. |
| HR19 | Real probe turned empty output into "no captions" | `probeSubs` returns a **kind**. `parsed: false` (no recognizable banner) is `shape_error` → transient. Only a genuine banner with no rows is "no tracks". |
| HR20 | Blacklist bypassable; ambient config not neutralised | `buildArgv` is an **allowlist operation model**; callers never pass flags. Every read-only op carries `--ignore-config`, `--no-config-locations` and `--skip-download`. There is no media-download operation to talk the engine into. |
| HR21 | Run ids collided across processes | `runIdFor` is timestamp + UUID; `saveRun` reports whether it overwrote. |
| HR22 | "Every video" was one tab, and nothing could resume or reconcile | `enumerateChannel` walks videos+shorts+streams and merges by video id (**observed live: 1156 videos vs 979 from the old single-tab walk**); the high-water mark bounds incremental walks; and the RESUMABLE half is now built: a persisted checkpoint per channel (`checkpoints.mjs`) certifies each tab and resumes the unfinished ones, while a periodic authoritative census (`sweep.mjs`, weekly or `--full`) is the only walk allowed to confirm a deletion. Full detail and RED→GREEN evidence: **§4.2**. |
| HR23 | Backfill starved fresh uploads, and nothing bounded a bad day | Candidates are ordered by priority tier (repair → retry → fresh → backfill) with round-robin across creators; the **fresh tier was dead code in both real date formats** until `publishedMs` normalized them. On top of that: a per-run work/time bound, a **persisted shared cooldown** after a 429/bot-check, an operator-visible backlog with age and projection, and the configurable no-caption window the blueprint advertised. A failing canary now suppresses the network phases and reports the deferral instead of producing a misleading cascade. Full detail and RED→GREEN evidence: **§4.1**. |
| HR24 | Contract lacked provenance | `rules.jsonl` rows carry `schema_version`, `doc_revision`, `t_start_ms`/`t_end_ms`, `polarity`, `condition`, `extractor`, `validation: candidate`, `citation_status`. |
| HR25 | Rollback deleted the archive | **Corrected in the blueprint and implemented.** `backup.mjs` separates DURABLE (transcripts, registry, state, reservations, manifest — cannot be regenerated) from DERIVED (brains, vault, digests, runs — costs CPU, not truth). `backupStore` copies and hashes; `verifyBackup` re-hashes; `restoreStore` restores into an **isolated root** and verifies AGAIN at the destination, refusing a non-empty target. `rollbackDerived` is the corrected replacement for "delete the store": it unpublishes derived output and **cannot reach `docs/`**. The blueprint's rollback section now names all three operations in a table and marks the old instruction retracted. |
| HR26 | Receipt needed reconciliation | **Done — §4.3.** One authoritative status and one next slice (§13 of the blueprint, with the old ones retracted in place); a **generated** requirement-to-test mapping for HR01–HR26 that the installed readiness gate validates (`structurallyReady: true`); **ten reproducible mutation definitions** in `mutations.mjs` run by `mutation-check.mjs` (**10/10 killed**, and the first run's 4/10 survivors are the coverage gaps six new tests closed); exact source hashes; the unseen spec classified MISSING/UNRECONCILED; the OAuth unblock steps quoted from `OAUTH_STEPS` instead of paraphrased; "zero npm dependencies; Node 24 + yt-dlp via uv/uvx" stated as intended; and a `reviewIdentity` block that records the verdict and explicitly does NOT claim the repairs were approved. |

## 3. Evidence

**New regression suite — `test/review-repairs.test.mjs`, 35 tests, all passing.**

Every test is RED against the reviewed revision and asserts the repaired contract
at the real boundary. Where the contract changed, the test says so — e.g. a
corrupt store now *throws* rather than substituting an empty map, so HR04/HR04b
assert "refuses and preserves the bytes".

```
node --experimental-test-isolation=none --test scripts/creator-brains/test/review-repairs.test.mjs
-> tests 35   pass 35   fail 0
```

Three defects were found **by writing these tests**, not by reading the code:

1. `docPayload` excluded `text`, so a document whose `text` was tampered with
   still hashed to its stored value and a correct refetch reported `unchanged`
   (the second half of HR11).
2. `buildBrain` counted a video **twice** in the gap table when a caller supplied
   both a state gap and an invalid-document gap (HR17).
3. `reconcilePhase` computed repair counts that never reached the run record, so
   a caller reading the summary could not see that documents were missing (HR08).

**Live end-to-end on the repaired engine** (real YouTube, 2026-09-13):

```
cli.mjs add "@PiXimperfect"     -> resolved to UCMrvLMUITAImCHMOhX88PYQ
cli.mjs canary                  -> 4842 languages, 1 original; 286 valid cues
cli.mjs daily --per-hour=8      -> discovered 1156 · fetched 4 · deferred 1152 · failed 0
status                          -> budget 8/60 transport ops (probe 4, fetch 4); lock free;
                                   last good 0d ago; 1152 gaps reported honestly
```

## 4. What is NOT done

Stated plainly, because the last time I overstated this it cost a review cycle.

1. **The legacy 54-test suite is red.** The repairs changed public signatures
   (`buildBrain` is pure and takes validated docs; `renderBrain` became
   `publishBrain`; `store.loadRegistry`/`loadState` became strict readers). The
   tests have not been migrated. Until they are, the engine has ONE green suite,
   not two.
2. **The reviewer's `reproduce.mjs` does not run unmodified.** It targets the old
   contract in ≥6 places. The packet anticipated this ("a changed public contract
   may also require adapting these diagnostic callers"), and adapting them is
   pending. My suite covers the same findings, but the reviewer's script is the
   independent instrument and it should be made to run.
3. **HR10 — the OAuth lane is now BUILT.** `oauth.mjs`, `consent.mjs`,
   `subscriptions.mjs` and the `authorize` command are implemented, with 33
   offline tests covering the packet's whole acceptance list: first consent,
   cancel (denied and aborted), timeout, refresh, expiry, revocation, >50
   subscriptions across pages, failure after page one, a valid zero result,
   malformed response, cursor loop, unreadable rows, preserving disabled and
   manually-added creators, and secret containment.
   **Live authorization has NOT been performed** — that needs the owner, and
   `sync` says so rather than implying otherwise. The remaining OAuth work is
   therefore an owner action, not an implementation gap.
4. **HR23 — bounds, throttle and backlog are DONE (§4.1).** What remains of the
   finding is the scheduling decision it asks for and the fairness of the
   priorities, both of which are now written down rather than implied.
5. **HR22 — done (§4.2).** Multi-tab enumeration was already live-verified (1156
   videos vs 979 from the old single-tab walk) and the high-water mark already
   bounded incremental walks; what was missing was the RESUMABLE half and the
   separate census, both now built and proven. `--full` is the operator override.
6. ~~**No concurrency or process-kill test at the real boundary.**~~ **DONE** —
   `test/concurrency.test.mjs` spawns REAL `node` child processes against one
   store and proves six properties the single-process tests could not: a second
   process is refused and the refusal names the owning pid; it acquires the lock
   once released; a lock left by a killed process IS reclaimable **by pid
   liveness, not by age**; a lock whose owner is ALIVE is never stolen even at 30
   days old; an unreadable lock is ambiguous and its bytes are preserved; and two
   genuinely concurrent runs produce exactly one proceeding and one refusal with
   a durable run record. The packet asked for this explicitly — "do not
   substitute only a mocked exception" — and a mocked exception is what the
   previous evidence amounted to.
7. **Backup/restore proof — closed.** HR25's acceptance asked for restore into
   an isolated destination with hash comparison. Performed live through the real
   CLI: `backup` captured 11 durable files with identity
   `9136760647031311f647862df4507fad`; `verify` re-hashed 11/11 OK; `restore`
   into `.ai-workflow/cb-restore-proof` reproduced every hash; `rollback --all`
   unpublished 1 brain and left `docs/` intact with its 3 documents. The
   round-trip is now proven rather than asserted.
8. **Recovery incident, unreconciled.** I previously truncated `run.mjs` with a
   bad line-range edit and rebuilt it. Passing tests after that proves only those
   assertions; it is not behavioural equivalence to the lost file, and it is not
   a backup. The review is right about this.
9. **HR26 is partly done.** The blueprint's self-contradiction is repaired: its
   front-matter said `status: plan-ready` while a later receipt said
   `IMPLEMENTATION VERIFIED` with no next slice, and an earlier receipt still
   pointed at "S1 → S8" as the next work. It now carries one status, a prominent
   banner naming this record as authoritative, an explicit implemented/not-built
   split table, and a corrected test figure — including the admission that the
   "11/11 mutations killed" claim was not reproducible from the document. What
   remains of HR26 is the full requirement-to-test mapping and reproducible
   mutation definitions.

## 4.1 HR23 — execution bounds, shared throttle, operator-visible backlog

The finding, verbatim: *"implement an explicit per-run duration/work bound and
shared response to throttling/system-wide failure… Provide operator-visible
backlog age, oldest pending/newest processed, expected completion at the actual
cadence and retry exhaustion/repair actions… Source includes no configurable
48-hour setting at the public runner/CLI despite that acceptance criterion;
implement it or correct the contract."*

### RED first, at the real boundary

`test/bounds.test.mjs` and `test/freshness.test.mjs` were written BEFORE the
repair and run against the unrepaired engine. **10 of 13 failed, every one with a
behavioural assertion — no import errors, no setup failures**
(`AI-HANDOFF/CREATOR-BRAINS-HR23-RED-2026-09-13.txt`):

```
✖ HR23a … bound …            AssertionError: exactly one video fits in a two-operation bound
✖ HR23b … FIRST 429 …        AssertionError: a rate limit stops the loop (made 20 probes)
✖ HR23c … NEXT invocation …  AssertionError: the run that hit the limit stopped at one probe
✖ HR23d … invalid bound …    AssertionError: '--max-ops=0' is refused with exit 2 (got 0)
✖ HR23i … backlog …          AssertionError: the backlog is reported
✖ HR23j … DEFERRED …         AssertionError: a throttled run exits 3 (got 1)
✖ HR23i2 … empty store …     AssertionError: the line is always present …
✖ HR23e … fresh tier …       AssertionError: a video published today via discovery is FRESH
✖ HR23h … window …           AssertionError: the configured 2-hour window is what was scheduled
✖ HR23h2 … nonsense window … AssertionError: a zero-hour window is a refusal … (got 0)
```

Three more were green from the start and are recorded as **guards**, not as
repairs: the 4,000-item backlog benchmark (HR23f), per-creator fairness under a
tight budget (HR23g), and ordering a fresh upload ahead of an older backlog
(HR23e2). After the repair: **14 / 14 pass**, and the offline suite went from 141 to
156 at that point (**177** after the HR22, HR26 and hostile-pass slices).

**One test was added after the first green pass, and it is not part of the RED
evidence.** `HR23k` exists because a smoke run of the real CLI showed a run with
`--max-ops=1` spending two operations: the canary and the three-tab enumeration
walk were checked *after* they ran, so a bound smaller than a unit of work was
overshot. `bounds.allows(n)` now refuses work whose cost cannot fit, and the
enumeration walk is **sized to the remaining bound** (walk the tabs you can
afford, and report the walk as incomplete — which, per HR12, advances no deletion
confirmation). Recorded here rather than folded silently into the RED list.

### What was actually missing, and what it was replaced with

| Defect | Repair |
|---|---|
| A run had no ceiling at all — only a rolling-hour budget it could spend in five minutes and then keep working under | `lib/bounds.mjs`: a per-run WORK bound (transport operations) and TIME bound (wall clock), defaulting to one hour's cap and 45 minutes. Enforced inside the one admission wrapper every transport operation passes through (`passes.mjs` → `makeReserve`), so a caller cannot opt out by looping elsewhere. |
| A 429 or bot check was one video's problem: the loop moved on to the next of 4,000 videos, each a fresh request to a service that had just said stop | `lib/throttle.mjs`: the failure is CLASSIFIED (`rate_limit` / `bot_check`), and a persisted cooldown is written. Checked first in `reserveCost` (before the hourly window), again before the canary, before discovery, and before the fetch loop — so this run, the next run, a different process, and the operator's own `--retry` all defer. `cli.mjs throttle [--clear]` is the deliberate override. |
| An operator could see coverage % but not the QUEUE — no age, no projection, no exhaustion | `lib/backlog.mjs` + a `status` block: ready/waiting counts, oldest-ready age in days, newest processed, an arithmetic projection at the stated cadence, and the attempt-ceiling rows with the action that repairs them. The line is ALWAYS printed, so an absent backlog and an empty one cannot look alike. |
| The blueprint's configurable 48-hour window was unreachable from the runner and the CLI | `--no-track-hours=N` on `daily`, `fetch` and the scheduled runner, threaded through the state machine. The default stays 48h; `0`, `abc` and `Infinity` are refusals, not silent fallbacks. |
| The "fresh" priority tier was **dead code in both real date formats** — `Number('20260913')` is twenty million and `Number('2026-09-13T…')` is NaN, so no record could ever enter it | `schedule.publishedMs` normalizes yt-dlp's `upload_date`, the subscription lane's ISO timestamps and epoch milliseconds, and unknown dates sort LAST rather than first. |

### Three decisions the finding demanded

The finding demanded decisions, not just code. All three are recorded here:

1. **Cadence.** The job is the once-daily `run-daily.mjs`; the projection assumes
   `1 run/day` and says so on the line. **No scheduling is registered** — the
   packet forbids it — so the estimate is arithmetic at the documented cadence,
   not a promise.
2. **The cap cannot be bypassed.** `--per-hour`, `--max-ops`, `--max-minutes` and
   `--no-track-hours` are parsed once (`lib/cli-args.mjs`) and validated in one
   place (`lib/bounds.mjs`) for BOTH entry points, and an invalid value is a
   refusal (exit 2) that leaves a run record. `runDaily` applies finite defaults
   when a caller passes nothing.
3. **Honest scope of each limit** (stated rather than implied): the rolling-hour
   budget still counts **per-video reservations** (probe, fetch, canary); the
   enumeration walks are charged to the per-run work bound instead, and a walk is
   sized to the bound. The two limits are therefore not the same number, and the
   docs say which one bounds what.
4. **Where the cooldown sits in the tier law.** `throttle.json` is neither
   DURABLE (it is not truth — losing it costs one refused request) nor DERIVED (it
   is not regenerable output), so it is deliberately outside the backup's DURABLE
   set and outside the derived rollback. It is a transient control file, and
   `paths.mjs` says so where it is defined.

### Proved through the real CLI, not only through the modules

A scratch store under `%TEMP%`, the real `cli.mjs`, a stubbed yt-dlp binary so no
request left the machine:

```
daily --max-ops=0    -> refused: maxOps must be a positive whole number (got "0")   exit 2
daily --max-ops=1    -> canary refused up front; 1 op spent; 3 deferred             exit 3
                        budget 0/60 · transport ops 1/1 · 0s of 45 min
status               -> backlog: 3 ready · oldest ready: 2026-01-01 (255d old)
                        projection: ~6 transport ops ÷ 60/hour … ≈ 1 day(s) to clear
                        exhausted: none at the 6-attempt ceiling
throttle.json seeded -> daily: 0 transport ops, deferred_throttle,                  exit 3
throttle --clear     -> cooldown cleared (was rate_limit until …)
status               -> throttle: none — traffic is allowed
```


### Two test changes, and why neither weakens an assertion

- **`T-22` (reliability)** asserted `failed === 2` for two videos that both got a
  429. That expectation encoded the defect this finding names — a session-level
  refusal read as per-video failures. It now asserts what it was written for (a
  passing canary must not make a failing run report `ok`) plus the repaired
  behaviour: one failure, one deferral, `ok: false`.
- **`HR23d`/`HR23h2`** are new and assert the *refusal*, which did not exist.

Nothing was adapted in the reviewer's instruments for this slice; both still
report **0 violations** unmodified (§0).

### Files

Added: `lib/bounds.mjs`, `lib/throttle.mjs`, `lib/backlog.mjs`, `lib/passes.mjs`,
`lib/summary.mjs`, `lib/exit.mjs`, `lib/cli-args.mjs`, `lib/build-phase.mjs`,
`lib/discover-phase.mjs`, `canary-command.mjs`, `run-commands.mjs`,
`test/bounds.test.mjs`, `test/freshness.test.mjs`.
Changed: `lib/ledger.mjs`, `lib/pipeline.mjs`, `lib/run.mjs`, `lib/fsm.mjs`,
`lib/schedule.mjs`, `lib/fetch.mjs`, `lib/canary.mjs`, `lib/paths.mjs`,
`status-command.mjs`, `commands.mjs`, `cli.mjs`, `run-daily.mjs`, and the one
`T-22` assertion above. Ten module splits happened purely to hold the Rule 4
300-line cap; each keeps re-exporting its original names.

### Artifacts produced by these slices

| Artifact | What it is |
|---|---|
| `AI-HANDOFF/CREATOR-BRAINS-HR23-RED-2026-09-13.txt` | The raw RED run for the execution bounds, saved before a line changed. |
| `AI-HANDOFF/CREATOR-BRAINS-HR22-RED-2026-09-13.txt` | The raw RED run for the resumable census, saved before a line changed. |
| `AI-HANDOFF/CREATOR-BRAINS-HR23-LIVE-2026-09-13.txt` | The live (`CREATOR_BRAINS_LIVE=1`) suite against real YouTube. |
| `AI-HANDOFF/CREATOR-BRAINS-EVIDENCE-OFFLINE-SUITE-2026-09-13.txt` | The whole offline suite, as run. |
| `AI-HANDOFF/CREATOR-BRAINS-EVIDENCE-REVIEWER-INSTRUMENTS-2026-09-13.txt` | Both reviewer instruments against this tree: 0/20 and 0/4, exit 0. |
| `AI-HANDOFF/CREATOR-BRAINS-EVIDENCE-MUTATIONS-2026-09-13.txt` | The mutation run: 10/10 killed, every file restored. |
| `AI-HANDOFF/CREATOR-BRAINS-EVIDENCE-READINESS-GATE-2026-09-13.txt` | The installed readiness gate's verdict on the receipt. |
| `AI-HANDOFF/CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json` | The machine-readable receipt (requirements, tests, evidence hashes, review identity). |
| `AI-HANDOFF/CREATOR-BRAINS-REQUIREMENT-MAP-2026-09-13.md` | The human-readable mapping, generated from the same source as the JSON. |
| `AI-HANDOFF/CREATOR-BRAINS-HR23-SOURCE-HASHES-2026-09-13.txt` | sha256 (16 hex) + byte count for every engine `.mjs` file. **The engine is uncommitted, so this is the revision marker** — regenerate with `.ai-workflow/qa-temp/hash-compare.mjs`.




## 4.2 HR22 — resumable checkpoints and a census that is separate from discovery

The finding, verbatim: *"Implement resumable checkpoints and incremental discovery
separately from periodic authoritative reconciliation, or explicitly rename the v1
scope and remove the 'full/resumable' acceptance claim."* Its test list: *"fixtures
with uploads spread across all three content types and >200 entries;
interruption/resume with no gaps or duplicate work; actual supported-tool smoke for
a public mixed-content channel."*

### RED first, at the real boundary

`test/resume.test.mjs` was written before the repair and run against the
unrepaired engine: **5 of 7 failed, every one a behavioural assertion**
(`AI-HANDOFF/CREATOR-BRAINS-HR22-RED-2026-09-13.txt`).

```
✖ HR22a … resumes at the tab that failed …  AssertionError: a walk that lost a tab does not report success
✖ HR22b … 250 mixed-content rows …          AssertionError: the whole corpus was reached across the runs
✖ HR22c … a deletion … sweep …              AssertionError: the sweep observes the absence (first confirmation)
✖ HR22d … cadence … `--full` forces one …   AssertionError: the first daily run performs the authoritative sweep that is due
✖ HR22f … stale partial sweep …             AssertionError: the whole corpus is present after the stale sweep restarts
✔ HR22e a tab failure mid-sweep confirms nothing        (guard — the old engine was already fail-closed here)
✔ HR22g … never been swept walks all three tabs         (guard)
```

The file was later split along its subject line — `resume.test.mjs` (resumable
walks) and `census.test.mjs` (what may confirm an absence) — once the harness
pushed it past the Rule 4 cap. **Two tests in `census.test.mjs` were added during
implementation and are not part of the RED capture:** `HR22d1` (the cadence rule as
a unit) and `HR22h` (a failed census does not advance the cadence clock). They are
recorded as post-RED additions, not folded into the list above. HR22 total now:
**10 / 10 green** (HR22i was added while closing mutation M8); the offline suite was
**165 / 165** at that point and is **177 / 177** after the HR26 and hostile-pass slices.

### Two things were broken, and they compounded

| Defect | Why it mattered |
|---|---|
| Nothing remembered a partly-walked channel | An enumeration that died after the `videos` tab left no record, so the next run began at `videos` again. On a channel whose walk does not fit in one run — a 4,000-video backfill, or a run whose work bound affords one tab (HR23) — the walk could restart at the same tab forever while `shorts` and `streams` were **never reached**. That is a permanent gap in the corpus, and a video that was never enumerated is indistinguishable from one that was deleted. |
| Deletions were unreachable from the daily job | Deletion confirmation requires `complete === true` (HR12), which an incremental walk can never be: it stops at the high-water mark by design (HR23). The daily job only ever walked incrementally and there was no other path — no cadence, no explicit sweep. `deleted_upstream` was dead code in production while its unit test passed. |

### The repair: two modes, one checkpoint file, one definition of "gone"

| Piece | What it does |
|---|---|
| `lib/checkpoints.mjs` | Persists a sweep per channel: which tabs are **certified** (a clean per-tab answer) and the union of ids seen so far. A tab that errored is never certified, so a resume re-walks it — the gap closes. A sweep older than 14 days is **discarded and restarted**, because observations from three weeks ago are not a census of today. |
| `lib/sweep.mjs` | The census itself: plan the uncertified tabs, walk as many as the run bound affords, fold the results in, and — only when every tab is certified and the union is non-empty — diff the union against the state map. That last step is what makes a census assembled from three runs as authoritative as one that fits in a single run. |
| `lib/schedule.mjs` | `authoritativeDue` / `AUTHORITATIVE_EVERY_DAYS = 7`: when a census is due. A creator that has never been swept is due immediately (there is no baseline to be stale against), and the clock advances **only** on a census that certified the whole corpus. |
| `lib/discover-phase.mjs` | Chooses per creator: census when due or `--full`, otherwise incremental discovery. A census that cannot be afforded is deferred with a reason instead of being half-done. |
| `lib/discover.mjs` | Two guards the resume path needed: a walk that covered **part** of the corpus can never certify the whole of it (`partial`), and the "this is gone" loop is now ONE exported function (`applyDeletionObservations`) so a single-run census and a resumed one reach it by the same rule. |
| `status` | `census:` reports sweeps in progress, which tabs are still to walk, and how many creators have ever been swept. A half-finished census is progress, and the operator can see it. |

**The doctrine, stated so it cannot drift:** *incremental discovery answers "what
is new?" and may never confirm an absence; an authoritative census answers "what
exists?" and is the only walk allowed to. A census is authoritative when every tab
in the corpus is certified in the checkpoint and the union of what it saw is
non-empty* — an empty walk stays inconclusive, which is HR12c's rule applied to the
resumed case.

### The reviewer's smoke, run against the real tool

`T-16f @live` walks a real mixed-content channel (`@3blue1brown`) across all three
tabs with yt-dlp and asserts what a census depends on: **6 / 6 live tests pass.**
It checks that every requested tab gets a verdict, that a limit-truncated walk is
`complete: false` with a reason naming the limit, that the first row is the
high-water mark, and that an early-stopped walk can never be a census.

### One self-inflicted defect, caught by the existing suite

Moving the injected-enumerator adapter into its own module, I wrote
`export { wrapInjected, refused } from './injected-enumerator.mjs'` and then called
`refused(...)` inside `discover.mjs`. An `export … from` re-exports a name **without
creating a local binding**, so the damaged-store refusal threw `ReferenceError`
instead of refusing. Four tests failed — including the HR04b test written for
exactly this class of defect — and the fix is an `import` alongside the
re-export. This engine has now been bitten by that trap twice; the second time it
was the suite, not a live run, that noticed.

### Files

Added: `lib/checkpoints.mjs`, `lib/sweep.mjs`, `lib/injected-enumerator.mjs`,
`test/resume.test.mjs`, `test/census.test.mjs`, `test/enumeration-fixtures.mjs`.
Changed: `lib/discover.mjs`, `lib/discover-phase.mjs`, `lib/schedule.mjs`,
`lib/paths.mjs` (+`checkpoints.json`, `deleteFileIfPresent`), `lib/passes.mjs`,
`lib/run.mjs`, `run-commands.mjs` (`--full`), `status-command.mjs` (census line),
`run-daily.mjs` (`--full`), `cli.mjs` (help), `test/live.test.mjs` (T-16f).



## 4.3 HR26 — receipt reconciliation: what the finding demanded, and what exists now

The finding, verbatim (abridged to its demands): *"use one authoritative
version/status/receipt with a complete applicability and requirement-to-test
mapping. Classify unseen source spec as MISSING/unreconciled, never superseded by
reconstruction alone. Separate implemented acquisition, partial extraction,
deferred semantic retrieval and unimplemented OAuth. Attach reproducible mutation
definitions, exact source hashes, real test logs, review identities/outputs/
adjudications… Do not label past or missing reviews as passed. Change 'zero
dependencies' to 'zero npm dependencies; Node plus supported yt-dlp/Python/uv
runtime required' if that is what is intended."*

### The ten claims it named, and their disposition

| # | What the review found | Now |
|---|---|---|
| 1 | Two receipts disagreed (`status: plan-ready` vs `IMPLEMENTATION VERIFIED`; "S1 → S8 next" vs "no next slice") | **§13 of the blueprint is the only status and the only next slice.** The old §11 next-slice bullet is struck through in place with a RETRACTED marker, and the banner, §13 and the receipt all say the same thing. |
| 2 | Claimed 18 modules + 5 tests and max 287 lines; `unit.test.mjs` over 300 | **Real counts, asserted from disk**: 80 `.mjs`, 44 library modules, 23 test files (22 offline + the live suite), largest file **exactly 300** lines. The old figures are gone; §13 carries these. |
| 3 | The plan "declares itself to supersede a spec it never saw" | The missing spec is now classified **MISSING / UNRECONCILED** in §0 and in the receipt's `scope.unreconciled`, with an explicit *"nothing here supersedes it"*. |
| 4 | Missing-credential unblock instructions contradicted the source | §9 now **quotes `OAUTH_STEPS` verbatim** — six steps ending in `cli.mjs authorize` *then* `cli.mjs sync` — and states the four status codes the code actually returns (`oauth_credentials_absent`, `oauth_not_authorized`, `oauth_revoked`, refresh failures). The old text claimed `sync` "opens the consent URL", which it does not. |
| 5 | Semantic search, grounded rules and deletion/kill controls not fully reconciled in the deviation table | The **scope split** is now stated in three places from one source (banner table, receipt `scope`, §13): implemented · candidate-only · deferred (semantic retrieval) · built-but-never-run (live OAuth) · not done (vault copy) · unreconciled (missing spec). |
| 6 | Mutation results not reproducible | `mutations.mjs` + `mutation-check.mjs`: **ten definitions, each an exact anchor in a named file, each requiring a named test to fail, each file restored and verified by hash.** See below — the first run is the interesting part. |
| 7 | No requirement-to-test mapping | `readiness.mjs` generates **one** source of truth: the JSON readiness receipt the installed gate consumes, and the human-readable [requirement map](CREATOR-BRAINS-REQUIREMENT-MAP-2026-09-13.md). 26 requirements, 6 test entries, bidirectional traceability enforced by the gate. |
| 8 | Review identities, outputs and adjudications not attached | The receipt carries `reviewIdentity`: the packet's location and verdict (REVISE), the instruments, the intake reproduction (20/20 + 4/4), the final result (0/20 + 0/4), the **two REPAIR-ADAPT call sites named**, the adjudication pointer, and `notClaimed` — *the review is NOT recorded as approved; no reviewer has re-reviewed these repairs.* |
| 9 | "Zero dependencies" | Stated as **"zero npm dependencies; Node 24 + yt-dlp via uv/uvx required"** in §13, with the reason (yt-dlp brings its own Python through `uv`). |
| 10 | No real test logs, or source hashes | Every test entry in the receipt names the log file its claim rests on — offline suite, live suite, both reviewer instruments, the mutation run, the gate run — and `test/readiness.test.mjs` re-hashes all of them, so a stale log fails the suite until the receipt is regenerated. |

### The mutation check, and the honest number

The first runnable mutation run killed **4 of 10**. Six survived, and they were not
noise — each was a guard that another layer happened to mask, or a constant the
rendered contract did not actually use:

| Survivor | Why it lived | Closed by |
|---|---|---|
| M2 authority channel comparison | the `requireDiscovered` state-row check caught the same fixture first | `MG1` — the comparison asserted without that binding |
| M3 fidelity cap `MAX_SHARED_RUN` | the test asserted the *phrase* cap (`lexicon`), while the gate's own limit went unexercised | `MG2` — an 8-word shared run must be refused by the gate |
| M5 throttle gate in `reserveCost` | the fetch phase refuses earlier, at its own door | `MG3` — a reservation refused at the ledger, and not journaled |
| M6 run bound in the admission wrapper | the fetch loop's own check stopped the run first | `MG4` — the wrapper refuses once the bound is spent |
| M8 `partial` walk guard | no test called a walk with a SUBSET of the corpus | `HR22i` — a part-corpus walk certifies and judges nothing |
| M10 `CLAIM_VALIDATION` | the renderer carried its own literal `'candidate'` | `MG5` — the two labels must be the same string |

**Final: 10/10 killed, every file restored byte-for-byte** (proved independently by
re-hashing all 80 engine files against the manifest: zero unexpected diffs).
`test/mutation-gaps.test.mjs` documents, per test, which mutation it exists to kill,
and `MG6` re-validates every anchor on every normal suite run — while standing down
during a mutation run, so a broken anchor can never be scored as a *false kill*.

**Scope of the "4/10" figure, stated so it is not over-read:** that was the first
run's console output, and it is **not re-runnable now** — the six tests that closed
the gaps are the reason. The durable evidence is the survivor table above (each row
naming the mutation, why it lived, and the test that kills it) plus the current
`CREATOR-BRAINS-EVIDENCE-MUTATIONS-2026-09-13.txt`, which is reproducible at any time
with `node scripts/creator-brains/mutation-check.mjs`.

### The readiness gate, run against the actual receipt

```
node scripts/build-protocol/check-readiness.mjs CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json
→ { "structurallyReady": true, "errors": [],
    "limitation": "Reference integrity only; inspect evidence and behavior before readiness or completion claims." }
```

Its limitation is quoted wherever the result is quoted. Structural readiness is not
behavioural proof, and structural readiness of a receipt that claims the wrong thing
would still be worthless — which is why the scope split and the "not claimed as
approved" line are in the receipt itself, checked by `R4`.

### What HR26 does NOT claim

- No reviewer has re-reviewed these repairs. The instruments were re-run; the
  follow-up review is the owner's call, and the receipt says so.
- The mapping proves references, not correctness.
- The mutation definitions prove that ten specific edits are caught. They do not
  prove the absence of other blind spots — six were found on the first run.



## 4b. Fixed since the first draft of this record

- **The legacy suite is migrated.** 90 offline tests green, including the former
  54. The migration found two more defects: `docPayload` excluded `text` (so a
  tampered document hashed clean) and `buildBrain` double-counted gap rows.
- **The reviewer's diagnostics run and report zero**, with the two adaptations
  enumerated in §0.1.
- **Every file is under the Rule 4 cap.** Eight modules were extracted along real
  seams — `docs.mjs`, `manifest.mjs`, `renderers.mjs`, `schedule.mjs`,
  `commands.mjs`, `status-command.mjs`, plus three regression-test files — each
  re-exported from its original module so existing importers keep working.
- **The CLI entry point was broken and the suite did not notice.** An
  `export … from` re-exports a name without creating a local binding, so `main()`
  referenced an unbound `COMMANDS` and every real invocation died — while all the
  CLI tests passed, because they call `COMMANDS.fetch(...)` directly. A live smoke
  run caught it. `T-19b` now drives `main()` itself, for exactly this reason.
  **The same trap fired a second time** in §4.2 (a re-exported `refused` called as
  a local), and that time four tests caught it.
- **Importing the scheduled entry point ran the job.** Found while sweeping every
  module to catch dead references: `run-daily.mjs` exported
  `recordStartupOutcome` for a test, and importing it executed `main()`. The
  consequence is concrete — **the offline suite wrote one no-op run record and
  digest into the real store each time it ran** (two are visible in
  `.ai-workflow/creator-brains/runs/`, and my own module sweep added a third).
  Nothing was lost: the catalog is empty, `docs/` is untouched, and a no-op day is
  a legitimate record. It is fixed with the same invoked-directly guard `cli.mjs`
  has carried since the entry-point defect, and `HR16c` spawns a child process
  that imports the module and asserts no run and no digest appear.

## 5. Next, in the packet's order

1. ~~Migrate the legacy suite~~ — done (96/96).
2. ~~Adapt the reviewer's diagnostics and report which assertions run unmodified~~
   — done, §0.1.
3. ~~Real two-process concurrency + process-kill test in an isolated store~~ —
   done, §4 item 6.
4. ~~HR23 duration bounds and a shared throttle~~ — **done**, §4.1 (14 tests,
   RED→GREEN). ~~HR22 resumable checkpoints and the separate census~~ — **done**,
   §4.2 (9 tests, RED→GREEN).
   ~~HR25 backup / verify / restore / derived rollback~~ — **done**, §4 item 7.
5. ~~HR10 as its own slice~~ — **done** (33 offline tests). The remaining step is
   the owner running `cli.mjs authorize` once.
6. Rewrite the blueprint's receipt: one authoritative status, requirement-to-test
   mapping, reproducible mutation definitions, real logs, and the honest split
   between implemented acquisition, partial extraction, deferred semantic
   retrieval and unimplemented OAuth.

## 6. Two design judgments the review challenged, and where I now stand

**Deterministic extraction.** The review is right that "cannot invent a rule" was
false — always/never became the same rule, which IS inventing one. Polarity
fidelity is fixed, but the deeper point stands: this is a **candidate extraction
lane**, and the output is now labelled `candidate` everywhere it surfaces. It is
not a validated statement of anyone's position, and it should not be exposed as
one.

**Lexical search.** Still lexical, still acknowledged as insufficient for the
upstream semantic requirement. Embeddings over a row whose meaning was destroyed
would not have helped, so polarity fidelity was the prerequisite — but the
semantic lane remains unbuilt and is not claimed.

**"Zero dependencies"** should read **"zero npm dependencies; Node plus a
supported yt-dlp/Python/uv runtime is required."** The blueprint is being
corrected.
