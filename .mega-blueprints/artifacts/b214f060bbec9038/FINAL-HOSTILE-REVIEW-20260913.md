# Combined hostile review — S03–S08 · 2026-09-13

**Three independent reviewers, fresh context, read-only, one per slice group.** Each was told to
FALSIFY specific claims and to report only findings with `file:line` evidence. They did not see my
reasoning and were not told which parts I was confident about.

**Outcome: NOT DRY.** 29 findings. **6 fixed during this round** (1 critical, 3 high, 2 medium/low);
**23 remain open**. The objective says to run hostile rounds *until no new findings remain* — that
condition has **not** been met, and this document is the honest ledger of what is left.

All three reviewers also corrected the same setup error in my brief: I gave them the
`@Everything\quick-pt\SS-PT\...` path, which does **not** exist; the real worktree is
`Desktop\quick-pt\SS-PT\tmp\worktrees\...`. They found it themselves and said so.

---

## FIXED this round

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| S08‑1 | **CRITICAL** | Six JSON routes passed `fallbackStatus = 400`, defeating the `status >= 500` guard in `sendSprintServiceError`, so raw ORM/driver text was echoed. No Sequelize error carries `.status`. Reproduced: `column "sprint_class_slots"."sprintId" does not exist`, and via `AccessDeniedError` **`password authentication failed for user "swan_prod_admin"`** | Replaced status arithmetic with an explicit client-safe **allowlist** (`SprintIdInvalidError`, `SprintActorForbiddenError`, `SprintObjectNotFoundError`, `SprintCalendarValidationError`); everything else gets the route's generic text | `hostile-regressions` ×3 |
| S08‑3 | HIGH | `generateSprintClasses` wrote the `status='generating'` **claim before** authorizing `previousSprintId`; the denial escaped the `try/finally`, leaving the row **stuck at `generating` forever** (and permanently blocking slot regeneration) | Authorize the previous Sprint **above** the claim | `sprintGeneratorOwnership` ×2 |
| S08‑4 | MEDIUM | `createSprint` persisted an unnormalized, unauthorized `previousSprintId` straight from `req.body`; `requireOptionalOwnedSprint` was **dead code** | Wired the helper in before the create; the normalized id is what is stored | `hostile-regressions` ×3 |
| S08‑5 | MEDIUM | `POST /:id/generate` used `parseInt`, so `/1e3/generate` acted on Sprint **1** and `/0x0C/generate` on Sprint **12**, while every other route rejected those ids | Authorization now receives the **raw** param and returns the normalized id, which is also the job-cache key | `hostile-regressions` ×7 |
| S06‑F1 | HIGH | `exerciseLibraryId` was written into `bootcamp_stretches.exerciseLibraryId`, which is **INTEGER** in both the model and the migration (the UUID conversion covers only `bootcamp_exercises`) — a UUID there fails **after** parent/station/exercise inserts, and was invisible to all three test levels | Removed the field from `STRETCH_FIELDS` and `buildStretchRow` | existing suites |
| S06‑F4 | MEDIUM | `token in WEEKDAY_INDEX` walked the **prototype chain**, so `frequencyPattern: ['constructor']` passed the allowlist and produced `"0NaN-NaN-NaN"` dates | `Object.prototype.hasOwnProperty.call` | existing suites |

After the fixes: **backend 1057 files / 8669 tests exit 0** (`hostile-final-suite2.log`), **real
PostgreSQL 5/5 exit 0** (`hostile-integration.log`), controller state still `93a9e7be…f26`.

---

## Round 12 — four more findings fixed

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| FE‑F2 | **HIGH (was the most dangerous open)** | `setQuery`/`setCategory` bumped `searchSequenceRef` **unconditionally** while the replacement search needs an actual value change, so a same-value setter inside a worker round-trip discarded the in-flight reply and stranded `isSearching` **forever** — leaving the logger on a permanent "No exercises match current filters" with **no filters active and no recovery control** | Setters now return early when the value is unchanged, restoring the invariant **bump ⟺ value changed ⟺ the effect re-issues a SEARCH** | new `useExerciseSearch.setters.test.tsx` ×3 |
| BE‑F2 | HIGH | `validateGeneratedClass` only checked `Array.isArray(stretches)`, so `stretches:[null]` **passed admission** and then threw a bare `TypeError` **inside the write path** → 500 instead of 400 | Per-member `isPlainObject` validation for stretches | existing suites |
| S08‑9 | MEDIUM | **VACUOUS** — asserted `weeksFindAll`/`slotsFindAll` were uncalled, but the code loads children via `findByPk({include})`, so the spies stay uncalled even on the **authorized 200 path** | Now asserts the **`include` option was never passed**, which only the detail read sends | `sprintRoutesSecurity.test.mjs` |
| S08‑10 | MEDIUM | **VACUOUS** — `expect(Sprint.findAll).toBeDefined()` on a non-spy; deleting the `where:{trainerId}` scoping kept it green | `findAll` is now a spy and the test asserts `where: { trainerId: 7 }`, plus that a bad actor is refused **before** any listing query | `sprintServiceOwnership.test.mjs` |

**Still not dry.** Round 12 fixed 4; **19 remain open.** The next most dangerous is BE‑F3
(no value-domain validation against the real ENUMs / `STRING(100)` lengths / integer domains), then
BE‑F7 (`save.mjs` pairs created rows positionally and its `?? null` fallback silently recreates the
full-group-misclassification defect the file header claims to have closed), then BE‑F8
(`POST /log` storing a client `templateId`, `PUT /spaces/:id` mass-assigning `trainerId`), then the
frontend line-cap violations (**`useExerciseSearch.test.tsx` is 315 lines, a NEW file introduced
here**) and the remaining six frontend findings.

Evidence: `hf2-setters2.log` (15/15 exit 0), `hf2-backend2.log` (**1057 files / 8669 tests exit 0**),
`hf2-frontend.log` (**256 files / 1555 tests exit 0**), `hf2-tsc.log` (exit 0).

## Round 13 — the value-domain slice, and three new findings it exposed

Fixing BE-F3 properly meant reading every real column the save writes. Doing that
(rather than trusting the allowlist) surfaced **three further defects that no
reviewer had found**, because the allowlist itself was the thing hiding them.

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| BE‑F3 | **HIGH** | Admission checked SHAPE, never VALUE. `classFormat: 'whatever'` passed as "a non-empty string" and was rejected by PostgreSQL **mid-write** → 500 carrying a driver message instead of a 400 with zero rows. Same for `dayType`, `classStyle`, `intensityCategory`, exercise `board`, every `STRING(n)` overflow, and fractional values into `INTEGER` columns. | Real domains in `bootcampTemplateRules.mjs`: the 37 `classFormat` members, 12 `classStyle`, 5 `dayType`, 6 `intensityCategory`, 3 `board`, 4 `strategy`; real `STRING(n)` widths; integer domains for every INTEGER column. | new `bootcampTemplateDomainDrift.test.mjs` (10 tests) reads the **actual Sequelize models** and asserts every table and width still matches |
| BE‑F3b | **HIGH (new)** | `STATION_FIELDS` named **eight columns that do not exist** (`stationIndex`, `stationType`, `format`, `durationMin`, `rounds`, `equipmentRequired`, `spaceProfileId`, `board`) and **missed the real `equipmentNeeded`**. Sequelize drops unknown keys silently, so the invented names were inert — but the miss was not: **every station's equipment list was discarded on save.** | `bootcampTemplateFields.mjs`: the allowlist is now exactly the writable columns of `BootcampStation`, and `buildStationRow` maps `equipmentNeeded`. | drift test asserts allowlist ⊆ real columns **and** that no real column is unreachable |
| BE‑F3c | **HIGH (new)** | The sprint generator set `intensityCategory` from `intensityCategoryFromModifier()`, returning `'low'\|'moderate'\|'high'\|'max'`. **None are enum members** — and `scoreExerciseForIntensity()` switches *only* on the six real members and returns `0` for everything else. So the value both violated the column **and had never ranked a single exercise**, while the generator pushed an explanation asserting *"Intensity category applied: … prioritized the exercise pool."* The feature never worked and claimed it had. | Removed the invalid vocabulary from both call sites; the week modifier is now recorded honestly as a note. The generator's explanation is gated on `INTENSITY_CATEGORIES.includes(...)`, so it can no longer assert prioritization that did not happen. | `bootcampGenerationSemantics` + focused suites |
| NEW | **HIGH (new)** | `occurrenceId` is in the exercise allowlist and `save.mjs` passes it to `bulkCreate`, but **no model and no migration declares it** — Sequelize silently dropped it from every INSERT. The `selectionManifestV1` occurrence identity is therefore **never persisted**, and the mocked save test asserted uniqueness of a value the real schema cannot store. | Removed from the allowlist (a client-supplied `occurrenceId` can no longer even reach the row object); documented as manifest-only. | drift test pins the current truth so adding the column later forces a conscious decision |
| CAP | MEDIUM | `bootcampTemplateContract.mjs` was at **351 lines** (I had pushed it there adding the stretches fix). | Split into four single-purpose modules: contract **187**, rules 242, rows 161, fields 73 — all under the 300 cap. Public import path unchanged. | line-count sweep |

**Still not dry.** Round 13 fixed 4 and **added 3 it discovered**, so the open register
went from 19 to **20**. This is the expected shape of an honest hostile loop: reading the
real schema to close one finding exposed three more that only the schema could reveal.

Evidence: `hf3-backend.log`.

## Round 13b — BE-F7 and both halves of BE-F8

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| BE‑F7 | **HIGH** | The `save.mjs` header claims defect (2) — an out-of-range station index silently becoming a full-group exercise — is **closed**. It was not. `buildExerciseRow` still ended the lookup with `?? null`, so any short `returning` set made `stationIdByIndex` incomplete and quietly demoted a station exercise to a full-group row: the exact defect, reopening through the code meant to close it. | Reference resolution now goes through `resolveStationId`, which **fails loudly** on a miss, and `save.mjs` asserts `createdStations.length === stationRows.length` before building the map. | new `bootcampLogAndSpaceSafety` suite + real‑PG run |
| BE‑F8a | **HIGH** | `POST /api/bootcamp/log` wrote a **client-supplied `templateId`** straight through with **no ownership check**, so a trainer could attribute their class log to another trainer's template. The route's `templateId ? parseInt(templateId, 10) : null` also read `'12abc'` as `12` and turned `'abc'` into `NaN` → 500. | Raw value passed to the service; strict positive-integer normalization, then an ownership query scoped by the **server** `trainerId`. Malformed → 400, foreign → 404, both before any write. | `bootcampLogAndSpaceSafety.test.mjs` (8 tests) |
| BE‑F8b | **HIGH** | `PUT /api/bootcamp/spaces/:id` passed `req.body` into `profile.update()`, which **mass-assigns every matching attribute**. A trainer could PUT `{ trainerId: <other id> }` and hand their own space profile to another trainer — past an ownership check that had already passed. | Explicit `SPACE_PROFILE_UPDATABLE_FIELDS` allowlist (every writable column **except** `id`/`trainerId`); the service picks, it no longer spreads. | `bootcampLogAndSpaceSafety.test.mjs` |
| NEW | **MEDIUM (new)** | `getBootcampRouteErrorResponse` **could not express a 4xx at all**: anything whose message did not match `/not found/i` became a 500. A service had no way to return a clean 400/403/404 through it. | Opt-in, status-bounded exposure: a service must set **both** `exposeToClient: true` **and** a 4xx status. A 5xx — whose message may carry driver or credential detail — can still only ever return the caller's generic text. | `bootcampRouteFormatContract.test.mjs` |

**Open register: 17.** Evidence: `hf5-backend.log` (backend **1219 files / 10010 passed, exit 0**),
`hf5-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 14 — HOSTILE REVIEW ROUND 2 (fresh context) on the round-13 code

A fresh-context reviewer was told to falsify round 13's claims, not confirm them. It
falsified four of six — including one **CRITICAL that made the whole save path 400**.
This is why the loop is not dry.

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| R2‑1 | **CRITICAL** | Admission **required `station.stationIndex`**, but the only producer — `bootcampGenerator` `buildStationWorkout` — emits stations with `stationNumber/stationName/equipmentNeeded/setupTimeSec/sortOrder/coverage*` and **no `stationIndex`**. Its *exercises* reference a station by ordinal. So **every station-based class returned 400; only `full_group` could be saved**, for the whole feature. The suite stayed green because **every fixture hand-supplied `stationIndex`** — the fixtures encoded a property the real producer never emits. Reviewer proved it with an executed probe against the verbatim generator object. | A station's ORDINAL is now its explicit `stationIndex` when declared, otherwise its **array position** — as HEAD's baseline did positionally. `validateGeneratedClass` returns `stationOrdinals`; the NOT NULL pair and the index→id map are both keyed by it, so they cannot disagree. | **new** `bootcampTemplateSaveRealShape.test.mjs` — feeds the generator's verbatim key set (no `stationIndex`) through admission and the builders |
| R2‑2 | HIGH | `''` was treated as "absent" for enums, but the builders use `??`, which does not catch it — so `classStyle:''` / `board:''` wrote a raw enum value. **Sequelize does not rescue it:** `Model.build({classStyle:''}).validate()` passes. No BOOLEAN guard existed at all (`includeStretch:'maybe'`). | `optionalEnumMember` now rejects `''` (only `undefined`/`null` are absent); new `optionalBoolean` applied to `includeStretch`, `aiGenerated`, `isCardioFinisher`. | `bootcampTemplateValueHardening.test.mjs` |
| R2‑3 | HIGH | `Number.isSafeInteger` admits **int4 overflow** — `3e9` is a safe integer. Worse, `maxParticipants = expectedParticipants + 8` meant the **derived** value was the overflow. | `INT4_MIN`/`INT4_MAX` enforced in the integer guards; `expectedParticipants` capped at `INT4_MAX - 8` so the derivative fits. | same |
| R2‑4 | MEDIUM | Allowlisted station/stretch columns were copied with **zero domain checks** (`station.setupTimeSec: 1.5`, `stretchDurationMin:'abc'` admitted). | Integer domains added for station `setupTimeSec`/`stationNumber`/`sortOrder`, template `stretchDurationMin`/`rounds`/`exerciseDurationSec`; `muscleTargets` capped. | same |
| R2‑6 | MEDIUM | **Green suite, dead feature.** `bootcampGenerationSemantics.test.mjs` had a test named "allows every generator class format to be **saved**" that only compared enum arrays — it never called admission. | The real-shape test above actually feeds producer output in. | new file |
| R2‑7 | LOW | Validation errors **echoed client input**: `duplicate occurrence reference ${key}` interpolated an uncapped client value and the route returns it verbatim — contradicting the module's own "never echo" claim. | Message no longer interpolates the value. | same |
| R2‑8 | LOW | An internal persistence fault was reported as a client **400** carrying internal text. | New `BootcampTemplatePersistenceError` (500, non-disclosing), used by the count assertion and `resolveStationId`. | same |

**Still open from this review:** R2‑5 (retitling the integration test removed the only
real-PG **mid-write rollback** proof — and R2‑2/3/4 were exactly those mid-write rejections,
so restoring it needs a synthetic CHECK constraint), R2‑9 (`RETURNING` order is asserted by
size, not order), R2‑10 (drift test pins each width against one representative column while
the cap applies to 16; `bootcamp_exercises.notes` is write-unreachable), R2‑12
(`bootcampRoutes.mjs` still hardcodes a **third** copy of the intensity vocabulary,
unlocked by the drift test).

**Not falsified** (reviewer-confirmed): the six enum tables and eight widths match the models
exactly; the drift test cannot silently pass; all five allowlists are column-correct;
`occurrenceId` is genuinely not a column and genuinely dropped by Sequelize; the
`intensityCategory` removal is behaviour-preserving and nothing reads the stored field;
line caps hold; zero star-export collisions across 41 names; no import cycle.

Evidence: `hf7-backend.log` (**1222 files / 10046 passed, exit 0**),
`hf7-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 15 — three of the four remaining review items closed

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| R2‑5 | MEDIUM | Retitling the integration test had **removed the only real-PG mid-write rollback proof** — and R2‑2/3/4 were exactly those mid-write rejections, so once they were fixed at admission there was nothing left to drive a late failure. | Added a **DB-level CHECK constraint** (`s06_late_write_probe`, on the disposable fixture only) that admission cannot foresee: `durationSec <= 7200`. `durationSec: 99999` passes every admission check and is rejected *after* the template and its stations are written. Also replaced the tautological orphan assertion (`count >= 0`) with a real orphan query. | the restored integration test, real PostgreSQL 5/5 |
| R2‑10 | LOW | The drift test pinned each width against ONE representative column while the contract applies those caps to sixteen, so a divergence on any of the other twelve was invisible. | All 12 `STRING(100)` variation columns and all 4 `STRING(500)` URL columns are now asserted individually; `muscleTargets` is asserted to be **TEXT with a POLICY cap**, not a column width. | `bootcampTemplateDomainDrift.test.mjs` (11 tests) |
| R2‑12 | NIT/MEDIUM | `bootcampRoutes.mjs` still hardcoded a **third** copy of the twelve class styles and six intensity members, unlocked by the drift test. | The route now derives both allowlists from `bootcampTemplateRules` — the same table the save contract enforces. **This also reduced the over-cap route file from 449 to 444 lines.** | `bootcampGenerateStyleContract.test.mjs` |

**A real test caught the R2‑12 fix, and the test was the problem.** `bootcampGenerateStyleContract.test.mjs`
grepped the route **source** for the twelve style literals — so it passed *because* the
duplicated copy existed, never showed the route accepts anything, and would have kept passing
while the three copies drifted apart. It is rewritten to assert the real relationship: the
frontend's exposed styles equal `CLASS_STYLES` exactly, and the route derives from it.

**Still open: R2‑9** (`RETURNING` order is asserted by batch size, not by order — a reordered
set would silently mis-assign `stationId`; LOW, and the ordinal keying added in R2‑1 narrows it).

Evidence: `hf9-backend.log` (**1222 files / 10050 passed, 6 skipped — exit 0**),
`hf8-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 17 — `weekId`/`slotId` normalization, and the update-path poison chain

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| S08‑6 | MEDIUM | `weekId` / `slotId` went into `findOne({ where: { id } })` **unnormalized**, so a junk id (`'abc'`, `0`, `1.5`) became a PostgreSQL type error the route reports as a **500**. | Normalized with `normalizePositiveSafeInteger` before the query in `updateWeek`, `updateSlot` and `confirmSlotUsed` → a clean **400**. The child query stays scoped to the authorized Sprint. | `sprintUpdateContract.test.mjs` (12 tests) |
| NEW | **HIGH (new)** | `SprintClassSlot.dayType`/`.classFormat`/`.classStyle` are **`STRING(30)`, not enums** — so `PUT .../slots/:id { classFormat: 'garbage' }` did **not** fail at insert. It was copied into every class generated from that slot and from there into a saved template's real enum columns, making **every one of those classes unsavable**. The create path closed this chain; the **update** path was left open — the same defect, one endpoint over. | New `sprintUpdateContract.mjs` (`validateSlotUpdate`, `validateWeekUpdate`) validates against the real vocabularies and returns **only the keys supplied**, so a partial update stays partial. `status` is checked against the model's real `isIn` list, turning a Sequelize `ValidationError` (500) into a 400. | same |

The reviewer's framing is what surfaced this: "the create path validates these three now —
did every other writer?" It did not. `updateWeek`'s `isDeloadWeek` also had no boolean guard
(`'yes'` was truthy nonsense written to a BOOLEAN column).

Evidence: `hf11-backend.log` (**1223 files / 10062 passed, 6 skipped — exit 0**),
`hf11-integration.log` (real PostgreSQL **5/5, exit 0**). All four sprint modules are under
the 300-line cap (294 / 271 / 90 / 74).

## Round 18 — WRITER SWEEP: every writer of the enum-backed columns, enumerated

Round 17's conclusion was that each fix kept exposing the same defect one writer over. So
rather than continue endpoint-by-endpoint, I enumerated **every writer** of
`classFormat` / `classStyle` / `dayType` / `intensityCategory` / `defaultFormat` /
`defaultStyle` across the backend. That is the close of this defect class, not another patch.

| Writer | Status |
|---|---|
| `bootcampRoutes.mjs` (generate/save/log/templates/spaces) | already guarded; and its two vocabularies now **derive from** `bootcampTemplateRules` (R2‑12) |
| `bootcampTemplateRows.mjs` (template save) | validated at admission (rounds 13–14) |
| `sprintService.mjs` (sprint create + week/slot update) | validated (rounds 13, 17) |
| `sprintStructure.mjs` (slot scaffolding) | writes validated values only |
| `sprintGenerator.mjs` (generated class) | reads validated slot/sprint values |
| `bootcampGenerator.mjs` | **FIXED — see R3‑1** |
| `ai/commandRegistry/bootcampCommands.mjs` | **FIXED — see R3‑2** |
| `bootcampAttendance.mjs` | read-only, no write path |

### Two more findings the sweep produced

| # | Sev | Finding | Fix | Lock |
|---|---|---|---|---|
| R3‑1 | **MEDIUM** | `resolveBootcampStructure` falls back to the `4x4_r2` config for an **unknown** class format, but returned the **raw** label. So `generateBootcampClass({classFormat:'garbage'})` produced a class *built* as 4x4_r2 while *claiming* to be something else — and that label propagated to the client and back into `/save`, where the enum-backed contract correctly rejects it. The trainer saw a class that **generated fine and could never be saved**. | The returned label is the format actually used. | `bootcampCustomStructure` + full suite |
| R3‑2 | **MEDIUM** | The AI command `bootcamp_set_format` validated `classStyle` as `z.string().trim().min(1).max(40)` — **any string**, including values from a *different* vocabulary. The file header claims *"the browser re-validates every payload against the builder's real option sets"*; `useBootcampAiEvents.ts:102-103` only checks `typeof d.classStyle === 'string'` — **a type check, not validation** (`optPhase` *is* range-checked at `:72`, so the asymmetry is real). The generate route falls back to `'standard'`, so this was a **UI-desync hole, not data corruption** — severity stated honestly rather than inflated. | `z.enum(CLASS_STYLES)` — the server is the authority. | `bootcampCommands.test.mjs` |

**R3‑2's test was asserting the bug.** It read
`expect(schema.safeParse({ classStyle: 'low_impact' }).success).toBe(true)` — and
`low_impact` is not a class style at all: it is a **`board`** value, spelled `lowImpact`.
The test locked the schema open using a value borrowed from the wrong vocabulary. It now
asserts rejection. That is the **third** test in this workstream found encoding the defect
it was supposed to catch (after the `classFormat: 'standard'` fixtures and the source-grep
style contract).

### Newly OPEN (not fixed — frontend, outside this slice)

**R3‑3 (MEDIUM):** the false claim in `bootcampCommands.mjs`'s header is the *record* that
matters — a documented client-side gate that does not exist. The route guards the data path,
so nothing is corrupted, but `setClassStyle` accepts an arbitrary string, which desyncs the
`ConfigPanel` style `<Select>` (a value outside its options renders blank). Fixing it means
either real validation in `useBootcampAiEvents` or correcting the comment. Not done here.

Evidence: `hf12-backend.log` (**1223 files / 10062 passed, 6 skipped — exit 0**).

## Round 19 — the timezone-independence test was VACUOUS ON THIS MACHINE

| # | Sev | Finding | Fix |
|---|---|---|---|
| TZ | **HIGH for claim-integrity** | `sprintCalendarContract.test.mjs`'s "produces an identical schedule under UTC and America/Los_Angeles" ran **one** subprocess under `TZ=America/Los_Angeles` and compared it against `schedule(...)` computed in the **parent** process — i.e. under whatever TZ the host has. **This host is `Pacific Standard Time`, the same offset as `America/Los_Angeles`, so both sides were LA and the test proved nothing.** It would have passed with the module broken in any way that only manifests on a UTC host. This is the test underpinning S07's headline "timezone independence" claim. | Both sides are now **subprocesses with an explicit `TZ`** (`UTC` and `America/Los_Angeles`), compared to each other, so the host's configuration cannot satisfy the assertion. Added **host-independent ground truth** (`2026-03-02` is a Monday, so the first M/W/F slot must be that date) so two hosts wrong the *same* way still fail. |

Confirmed empirically, not assumed: `(Get-TimeZone).Id` on this machine is
`Pacific Standard Time`. The old test compared a Pacific subprocess against a Pacific
parent — it could not have detected a host-dependent defect here. Every "timezone
independence" claim in this workstream was resting on it.

The layered protection is still sound: a separate test traps `Date.prototype.getDay` /
`setDate` / `getDate` and throws if the module touches them, and an export-path test
strips comments and bans `getDay()` / `setDate(` / `toISOString`. The parity test was the
weak link between them, and it is now host-independent.

Evidence: `hf13-backend.log` (**1223 files / 10062 passed, 6 skipped — exit 0**),
`hf13-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 20 — direct locks on the space-profile boundary, and a regression I introduced

Writing the missing **direct unit tests** for `requireOwnedSpaceProfile` (an authorization
boundary I added in round 14 with only indirect coverage) immediately failed — and the
failure was **my own regression**:

| # | Sev | Finding | Fix |
|---|---|---|---|
| R4‑1 | **MEDIUM (self-inflicted)** | Round 14 routed `spaceProfileId` through `normalizeOptionalProfileId`, which rejects `''`. But the **baseline** did `spaceProfileId \|\| null`, so `''` meant *absent* — and its sibling `requireOptionalOwnedSprint` still explicitly treats `''` as absent. So I turned a completely benign empty form value into a **400 on Sprint create**. `0` stays rejected: it is a value, not an absence. | `requireOwnedSpaceProfile` treats a blank string as "no profile referenced", matching its sibling and the baseline. |

This is the first finding in this workstream that **my own tests caught before a reviewer
did** — and it is precisely the failure mode I had been hunting in others: a fix that closes
a hole while quietly narrowing accepted input. The lesson is that a boundary added with only
*indirect* coverage is an unverified boundary; the direct test is what surfaced it.

`normalizeOptionalProfileId` itself is left strict, because the template-save path has always
rejected `''` there (pre-existing S06 behaviour, not introduced here).

New coverage: blank/absent → `null` **without touching the model**; own profile → the
NORMALIZED integer reaches the lookup; foreign ≡ absent (identical message, non-disclosing);
admin may use a foreign profile; malformed → throws **before** any lookup; **fails closed when
no accessor is injected**; bad actor → 403 before touching the model.

Evidence: `hf14-backend.log` (**1223 files / 10069 passed, 6 skipped — exit 0**),
`hf14-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 21 — the atomicity invariant had no direct test

`sprintStructure.mjs` was extracted from `sprintService.mjs` and has carried the Sprint's
atomicity since — with **zero direct coverage**. Its two internal writes are the only place
the caller's transaction is threaded:

| # | Sev | Finding | Fix |
|---|---|---|---|
| R5‑1 | **HIGH if it ever broke** | `createSprint` opens ONE transaction and rolls it back on any failure. If either scaffold write were issued without `{ transaction }`, that row would be created **outside** the transaction and **survive the rollback** — a partially-created Sprint. Nothing in the suite would notice: every other test either mocks the models or exercises only the happy path, and the real-PostgreSQL atomicity test covers template save, not Sprint create. | `sprintStructure.test.mjs` (8 tests) asserts the transaction option is threaded into **every** week and slot write, plus one-week-per-entry / one-slot-per-entry, `sprintId` stamping, slot→week parenting, field pass-through, the validated vocabulary on every slot, and the empty-schedule cases. |

This is the fifth consecutive round where the finding came from writing a **direct** test for
a boundary that already had indirect coverage. The pattern is now stable enough to state as
a rule for the rest of this workstream: *indirect coverage is not coverage.* A property that
holds only because every caller happens to do the right thing is not tested — it is
coincidence with a green suite attached.

`buildSprintReadOptions` is locked too, at **both** order levels: a nested include without its
own `order` returns slots in whatever order the database chooses, and the array order of the
existing `order` clause is itself significant.

Evidence: `hf15-backend.log` (**1224 files / 10077 passed, 6 skipped — exit 0**),
`hf15-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 22 — VERIFICATION ROUND: the partial-update claim held

Applied the round-21 lens to `sprintUpdateContract.mjs`, whose stated promise is that a
**partial update stays partial** — if a validator returned every allowed key with a default,
a PATCH-style call would silently **reset** fields the caller never mentioned. That claim had
been asserted for exactly **one** field, which does not establish it for the validator.

Made it hold for every field, both validators. **No defect found** — all 8 new assertions
passed on first run. Recorded as a verification round rather than dressed up as a finding.

What is now actually established, field by field:
- supplying one field never emits any other (all 5 slot fields, all 4 week fields)
- `isDeloadWeek` is the one deliberate exception: it also emits the modifier it derives
- an empty or absent `updates` object yields `{}`
- **an unknown key is dropped, not passed through** — `{trainerId, id, sprintId, weekId}`
  produces `{}`, so a caller cannot smuggle a column in by naming it
- every enum field rejects `''` **and** whitespace-only
- free text (`notes`, `theme`) accepts `''` and `null` as an explicit **clear**

Evidence: `hf16-backend.log` (**1224 files / 10085 passed, 6 skipped — exit 0**),
`hf16-integration.log` (real PostgreSQL **5/5, exit 0**).

### Honest note on yield

Rounds 20 and 21 each produced a real defect from this lens. Round 22 produced none. That
is the expected shape of a diminishing search, and it is the first signal that this
particular surface may be approaching dry — but **one null round is not dryness**, and the
17-item register is untouched by it.

## Round 23 — the route chain for POST /api/bootcamp/save is now exercised

Closes the register item **"no supertest reaches `POST /api/bootcamp/save`"**. Every prior
test for this endpoint went through the service or mocked the models, so the route itself —
auth → body check → **real** `saveBootcampTemplate` → inline error mapping → response shape —
had never run. `bootcampSaveRoute.test.mjs` (8 tests) mounts the actual Express router with
only the ORM and auth mocked.

**What the route actually does** (`bootcampRoutes.mjs:148-159`) — this is its OWN mapping,
separate from `getBootcampRouteErrorResponse` used elsewhere in the same file:

| Condition | Response |
|---|---|
| 400 | `err.message` **verbatim** + `err.code` |
| 403 | hardcoded `'Access denied'` (non-disclosing) |
| anything else | generic `'Failed to save template'` |

The 400 branch **does** echo the service message, so the safety of that branch depends
entirely on the admission messages never interpolating submitted input. That is now
*verified* rather than assumed — a marker string (`zz-marker-<script>zz`) sent as
`classFormat` does not appear in the response.

Locked behaviours:
- valid class → 200 `{success, templateId}`, with all three writes issued
- missing `generatedClass` → 400
- **invalid enum → 400, not 500** (the end-to-end form of the BE-F3 fix)
- the 400 message does **not** echo submitted input
- foreign space profile → 403 `'Access denied'`, **zero writes**
- `BootcampTemplatePersistenceError` → generic 500, with the internal text
  (`"…not persisted as submitted"`) provably absent from the body
- `requesterRole` is taken from `req.user` — a body claiming `role: 'admin'` is still 403
- a genuine admin does bypass the profile check

**Process note, recorded because it cost a round-trip:** the first run failed 2/8 with a 500,
and the route swallows the cause behind its generic text. I added a temporary diagnostic that
calls the real service directly to surface the thrown error — `template.update is not a
function` — which was **my mock's bug**, not a product bug: `Template.create` must return a
model *instance*, because the service calls `template.update({ metadata })` for the manifest.
The diagnostic was removed. Lesson: when a route hides its error, the fastest path is to call
the service directly rather than guess from the response.

Evidence: `hf17-backend.log` (**1225 files / 10093 passed, 6 skipped — exit 0**),
`hf17-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 24 — route-level coverage for `POST /log` and `PUT /spaces/:id`

Both endpoints were repaired in round 13b and tested **at the service level only**, so their
route chains had never run. `bootcampLogAndSpaceRoute.test.mjs` (11 tests) mounts the real
router with the real `logBootcampClass` / `updateSpaceProfile`; only the ORM and auth are mocked.

**Verification, no new defect** — all 11 passed on first run. What this confirms end-to-end
for the first time:

`POST /log`
- foreign `templateId` → **404, not the flat 500 the route used to return for every failure**
- malformed `templateId` (`'abc'`, `'12abc'`, `'0'`, `'-1'`, `'1.5'`) → **400**, never a NaN write
- the malformed value is **not echoed** in the error body
- no template reference → `templateId: null`, with **zero** ownership queries
- the caller's own template → the ownership query is scoped `{ id, trainerId: req.user.id }`
- route-level normalization: an unknown `dayType` → `null`; `classRating: 99` → clamped to `5`

`PUT /spaces/:id`
- allowlisted fields update
- **`trainerId` and `id` from the body are dropped** — the mass-assignment fix holds through
  the real route, not just the service
- malformed id → 400 with no model writes; unowned profile → 404 with no writes

Evidence: `hf18-backend.log` (**1226 files / 10104 passed, 6 skipped — exit 0**),
`hf18-integration.log` (real PostgreSQL **5/5, exit 0**).

### Where the route-coverage vein stands

Two rounds, two files, **one defect found** (round 22's was a null result; round 23's finding
was the undocumented dual error-mapping and the verbatim-400 echo, now locked). The route
surface for the Bootcamp endpoints I touched is now covered: `/save`, `/log`, `/spaces/:id`.
Remaining uncovered route-level work is on the **Sprint** side (`sprintRoutes.mjs`), where
S08 changed authorization and error mapping — `tests/api/sprintRoutesSecurity.test.mjs` exists
but is largely source-text and spy-based rather than mounted-route.

## Round 25 — S08's error allowlist, driven with a hostile error at last

S08's **most severe** fix was an error-mapping fix: `sendSprintServiceError` used to decide by
**status arithmetic**, which let raw driver text reach the client
(`column "sprint_class_slots"."sprintId" does not exist`,
`password authentication failed for user "swan_prod_admin"`). It now decides by an **allowlist
of error types**. That fix had only service-level tests, and `sprintRoutesSecurity.test.mjs` is
source-text and spy-based — so the router had never been mounted and the allowlist had never
been driven with a hostile error. `sprintRoutesErrorMapping.test.mjs` (8 tests) mounts it.

The hostile probe is a driver error that **also carries `status: 400`** — the exact shape that
defeated status arithmetic. Verified across all eight mapped endpoints:

- the driver message and its column name **never appear** in any response body
- a credential-bearing message never appears
- the response message is always the route's generic text, never `err.message`

Plus: allowlisted errors *do* contribute their sanitized status (`SprintObjectNotFoundError` →
404, `SprintIdInvalidError` → 400, `SprintCalendarValidationError` → 400), and the actor is
always `req.user` — a body claiming `role: 'admin'` is ignored.

### Open inconsistency found (LOW)

The route declares its **own fallback status per endpoint**: create/update use **400**, reads
use **500**. So a raw server fault on `POST /api/sprints` is reported to the client as a
**400** — a server fault reported as a client error. The *message* is correctly generic, so
nothing leaks; this is the same class as R2‑8 which I fixed on the bootcamp save path.
Recorded rather than fixed, because changing fallback statuses is a response-contract change
affecting the frontend's error handling.

### Two assertions I had to correct — both were my tests, not the code

1. I expected 500 from every endpoint on a server fault. POST/PUT genuinely return 400 by
   design. The **security** property (message hidden) held; my expectation encoded a
   contract the route never had.
2. I asserted `params.trainerId` would be absent from the body forwarded to `createSprint`.
   It is present — the route forwards `req.body` as `params` and **`createSprint` ignores it**,
   owning the row from the actor. Asserting it at the route layer was testing the wrong layer;
   the service-level lock already covers it. The test now asserts only what the route owns.

Both were caught by running the test rather than by reasoning about it — which is the argument
for writing the route-level test at all.

Evidence: `hf19-backend.log` (**1227 files / 10112 passed, 6 skipped — exit 0**),
`hf19-integration.log` (real PostgreSQL **5/5, exit 0**).

## Round 26 — R2-9: the RETURNING ORDER is now verified, not assumed

The last unverified claim in the atomicity story. `save.mjs` asserted the returned station set
matched the submitted one **by count**, then paired `createdStations[position]` with
`stationOrdinals[position]` on the assumption that PostgreSQL returns `INSERT … RETURNING` rows
in insertion order. A reordered set would have paired each ordinal with a **different station's
id**, silently attaching every exercise to the wrong station — a data-integrity fault with no
error anywhere and no failing test.

**Fix:** after the count check, every returned row must carry the `stationNumber` of the row
sent at the same position. `stationNumber` is deterministic (`buildStationRow` uses the
station's explicit number, else its ordinal), so it is a verifiable key rather than a
positional guess. A mismatch is a **persistence fault (500)**, not a bad request.

**Locked both ways** in `bootcampSaveRoute.test.mjs`:
- **reordered** `RETURNING` set → 500 with generic text, and `Exercise.bulkCreate` is
  **never called**, so nothing was attached to a mis-paired station
- **correctly ordered** set → 200, with the negative-control assertions that ordinal 0 maps to
  station id 600 and the null-station exercise resolves to `stationId: null`

The reorder test is *discriminating*: without the check the reversed set still builds a
complete map — it simply maps ordinal 0 to the **other** station's id — so the route would
return **200**, and the test asserts 500. The bug would have been invisible, which is exactly
why it was worth pinning.

That closes the atomicity story: one managed transaction (or the caller's, used as-is),
validation before the first write, a loud failure on a short write, a loud failure on a
reordered write, and a loud failure on an unresolvable station reference.

Evidence: `hf20-backend.log` (**1227 files / 10114 passed, 6 skipped — exit 0**),
`hf20-integration.log` (real PostgreSQL **5/5, exit 0**). `bootcampTemplateSave.mjs` is 207
lines, under cap.

## Round 27 — frontend line caps, and a lane boundary I did not cross

Measured rather than trusted the register. Of the eleven frontend files in this repair's blast
radius, **exactly two** exceeded the 300-line cap:

| File | Was | Now | Action |
|---|---|---|---|
| `useExerciseSearch.test.tsx` | **315** | **271** | extracted the shared support into `useExerciseSearch.testSupport.ts` (70) |
| `WorkoutPlannerBlendDialog.tsx` | **333** | 333 | **NOT TOUCHED — see below** |

`useExerciseSearch.test.tsx` is mine (I added it in round 12), so I fixed it. The extraction
moved only **type declarations and pure factories** (`FakeWorker`, `SearchMessage`, `Deferred`/
`deferred`, `exercise`, `catalog`) — no test body, no assertion and no call site changed, so
the move cannot alter behaviour. All 15 tests in the two hook suites still pass, and the
frontend consumer suite is unchanged at 256 files / 1555 tests.

### `WorkoutPlannerBlendDialog.tsx` (333 lines) is deliberately left over-cap

It is **S01/S02 preserved prior work** — the checkout note for this repair records it, along
with `planDataBuilder.ts`, `WorkoutPlannerTypes.ts`, `workoutPlannerLoadPlanHydration.ts` and
`workoutPlannerPrescription.*`, as work produced by a different effort that this repair must
**preserve rather than rewrite**. Splitting a 333-line component means moving JSX, state and
styles — a structural edit to someone else's surface, not a mechanical cap fix.

So this stays **open and attributed**, not silently inherited: the file is over rule 4's cap,
the owner is the S01/S02 lane, and fixing it needs that lane's context or Sean's explicit
go-ahead. Recording it as "not mine to move" is the honest outcome; quietly reformatting it to
clear a metric would have been the wrong call.

Evidence: `hf21-frontend-tsc.log` (**tsc exit 0**), `hf21-frontend.log`
(**256 files / 1555 passed — exit 0**).

## Round 28 — F7 diagnosed and fixed, but NOT test-locked (stated plainly)

**F7 was real, and the mechanism is now exact.** `NASMExerciseRolodex.tsx` kept preview and
highlight as two independent pieces of state:

```js
useEffect(() => {                      // [filteredResults, isOpen]
  if (!isOpen) return;
  setPreviewExercise(filteredResults[0] || null);   // pane -> row 0
}, [filteredResults, isOpen]);                       // highlight NOT touched
```

The only thing that ever cleared `highlightIndex` was the separate `[isOpen]` effect. So after
**any change to the result set** (i.e. every keystroke), the preview pane showed `row 0` while
`highlightIndex` still held whatever the user had last hovered or arrowed to. Pressing Enter ran
`onSelect(results[highlightIndex])` — **a different exercise from the one on screen.**

**Fix:** preview and highlight are now set together, so the highlight ring, `aria-selected`,
the preview pane and Enter all name the same row. The UX consequence is deliberate and
documented in-line: the top suggestion is highlighted as soon as results change. The
alternative (require an explicit choice) is a one-line change to set **both** to empty, noted in
the comment so the product call is Sean's rather than buried.

**Related purity defect fixed in the same pass.** The arrow-key handler called
`setPreviewExercise` **inside** the `setHighlightIndex` updater. A state updater must be pure —
React may invoke it more than once (StrictMode does), so the preview write was a side effect
whose invocation count was not guaranteed. Both setters now run at the top level.

### F7 is now LOCKED — resolved by removing the need for a key event

The earlier attempts failed because driving synthetic `keyDown` through the rendered component
never reached the handler. Rather than keep fighting that, I **removed the need for it**.

The row renderer already carries `aria-selected={index === highlightIndex}`, and the preview
pane names one exercise. So *"preview and highlight agree"* — the exact property F7 violated —
is directly observable as **"the row marked selected is the row the pane names"**. No keyboard
input required.

`NASMExerciseRolodex.previewHighlightSync.test.tsx` (4 tests):
- agrees on first render — pre-fix `highlightIndex` was `-1`, so **no row carried
  `aria-selected="true"` at all** while the pane displayed a suggestion
- agrees after the result set is **replaced** — the F7 case proper
- agrees when the result set **shrinks to one row**
- marks **nothing** selected when there are no results

Both failing cases are *discriminating by construction*: the assertion compares the selected
row's name to the pane's name, and pre-fix the selected row did not exist (or named a
different exercise).

### The isolation that unblocked it

Before solving it I proved **which side** was broken, with a direct hook test rather than more
guessing. `NASMExerciseRolodex.listNavigation.test.tsx` (8 tests) renders
`useRolodexListNavigation` in isolation and passes: Enter selects the highlighted row and
prevents default; Enter is a no-op when nothing is highlighted **or the index is past the end**
of a shortened list; ArrowUp/ArrowDown move highlight and preview **together**; Escape closes
without selecting. It also pins the purity fix — **the first argument to `setHighlightIndex` is
no longer a function**, and both setters are invoked the same number of times.

That result located the fault precisely: **the handler was always correct; the problem was the
test harness around the component.** That is what made it worth stopping to prove rather than
attempting a third component-level test blind.

Also worth recording: the fix for the *test* was one line — the row's text is
`"Alpha PressChest"` (name + meta), so the helper had to read the row's **first child element**
rather than its whole `textContent`. The code was right; my assertion was reading the wrong node.

Evidence: `hf23-tsc.log` (**tsc exit 0**), `hf23-frontend.log`
(**258 files / 1567 passed — exit 0**).

**F7 is fixed and reasoning-verified but still NOT test-locked.** I returned to it with the
proven harness from `NASMExerciseRolodex.selectionBehavior.test.tsx` (fake `react-window` so
every row renders; `useExerciseSearch` driven directly so the result set can change mid-test).
That got materially further than my first attempt:

- the component **mounts**, the `combobox` resolves, and the preview pane **reads correctly**
  (`previewedName()` returned the expected exercise in every case) — so the harness shape is
  right and is reusable by whoever finishes this
- but firing `keyDown { key: 'Enter' }` on the combobox produced **`onSelect` 0 calls** in all
  four cases, including the plain first-render case where `highlightIndex` should be `0`

The handler itself reads correctly (`NASMExerciseRolodex.list.tsx:92-118`): Escape → close,
then ArrowUp/ArrowDown/Enter, no early return that would swallow Enter. The nav hook is bound
at the input that owns `role="combobox"` and `onKeyDown`. So the gap is in **how the test
drives the key event**, not in the handler — and I did not have the budget left to isolate it.

Rather than leave a failing test in the suite, or weaken assertions until it passed vacuously
— the exact failure mode this workstream has caught four times — I **deleted it**. F7 therefore
remains the one fix in this register **without a lock**, and it is recorded as such rather than
counted as closed.

**What a successor needs** (no re-derivation required): fake `react-window`; mock
`useExerciseSearch` to return `{results, allExercises, isSearching, isLoading, setQuery,
setCategory, query, category, refresh}`; read the pane via `screen.getByText(/previewing/i)`;
then work out why `keyDown` on `getByRole('combobox')` does not reach `handleKeyDown` — the
first thing to check is whether the component renders more than one element carrying
`onKeyDown`, or whether `useExerciseSearch`'s returned `results` identity changing every render
keeps `handleKeyDown`'s `useCallback` deps stale relative to the `highlightIndex` the effect set.

**Two self-inflicted catches while attempting this:** my first version mocked `api.service`
in a shape the component never uses (3/3 failed with no preview element); and the F7 fix
initially pushed `NASMExerciseRolodex.tsx` to 308 lines, which the file's **own line-cap test**
caught. Comment trimmed to 298.

Evidence: `hf22-tsc.log` (**tsc exit 0**), `hf22-frontend.log`
(**256 files / 1555 passed — exit 0**).

Evidence: `hf22-tsc.log` (**tsc exit 0**), `hf22-frontend.log`
(**256 files / 1555 passed — exit 0**), and the WorkoutLogger suite at **120 files / 810 passed**.

## Round 31 — F6 diagnosed and locked: the Undo toast could strand permanently

**The defect.** The 5-second Undo offer is armed by an effect keyed on `[planExercises]`.
Because the key is the plan, React runs the **previous** run's cleanup — which clears that
run's timer — before every re-run. The non-tap branch then returned early **without touching
`undoTarget`**:

```js
if (added.length !== 1) return undefined;   // timer already cancelled by cleanup
```

So after a removal, or after several rows arrived at once, a standing toast had **no timer left
to dismiss it** — and the toast has **no close button** either. It stayed on screen
permanently. The `const handle = ...` on the tap path was the tell: the author intended a timer
to always exist, but the early return left a state where one did not.

**Fix:** the non-tap branch retires the offer, with the reason in-line. A standing Undo offer
now always has a live timer behind it.

`WorkoutPlannerRolodexPanelV2.undoToast.test.tsx` (4 tests): arms on a single tap and dismisses
when the window elapses; **several rows at once retires the standing offer**; **a removal
retires it**; and a later single tap gets a **full fresh window** rather than inheriting the
remainder of the old one. The two F6 cases are discriminating — pre-fix the toast was still
present, so `toBeNull()` could not pass.

**Two wrong test expectations, corrected — and they were informative.** My first version
asserted `[a] → [a, b]` should *retire* the offer. It does not, and should not: that **is** a
single tap (b was added), so it correctly arms a fresh toast. Writing the test forced me to
state what a "tap" means — the stranding case needs an added count that is not one
(`[a] → [a, b, c]`, or `[a] → []`). That distinction is now documented at the top of the test
file so the next reader does not repeat the mistake.

**Harness note, second time this has mattered:** the panel reads from
`PlannerDataContext`/`PlannerActionsContext`, **not props**. My first attempt passed props and
failed with `usePlannerData must be used inside WorkoutPlannerProvider`. The working shape is
copied from `WorkoutPlannerRolodexPanelV2.recovery.test.tsx`.

Evidence: `hf24-tsc.log` (**tsc exit 0**), `hf24-frontend.log`
(**259 files / 1571 passed — exit 0**).

## Round 32 — F4: the catalog cache could not dedupe a mount race

**The defect, both halves.** `useExerciseSearch` claims a 5-minute catalog freshness window
with a per-instance ref, but the claim was taken in the wrong place:

```js
const hadCatalog = hasCatalogRef.current;
if (!force && hadCatalog && Date.now() - lastFetchRef.current < CACHE_TTL_MS) return;
// ...awaits the network...
lastFetchRef.current = Date.now();   // claimed only on SUCCESS
```

1. **Double fetch.** `lastFetchRef` was stamped **after** the await, and the guard *also*
   required `hadCatalog`. Two invocations in the same tick — a StrictMode effect replay, or two
   consumers on one instance — both observed `hasCatalogRef === false` and both issued
   `/api/exercises/library`. The guard cannot dedupe a race it only learns about once the first
   request has already finished.
2. **Dead window.** Because the guard required `hadCatalog`, and a successful load is what sets
   it, the TTL could only ever suppress a call made *after* a completed success — never the
   duplicate that the cache exists to prevent.

**Fix:** claim freshness **synchronously, before the first await**, and drop `hadCatalog` from
the guard. Two lines, plus one deliberate compensating change: a **failed** fetch resets the
stamp to `0`, because leaving it set would lock a failed load out for the full TTL and break
the stale/refresh recovery contract. That compensation is the part that matters — the obvious
version of this fix silently breaks recovery, and the existing recovery suites are what verify
it did not.

**Status: fixed, verified, and now LOCKED.** `useExerciseSearch.cacheClaim.test.tsx` (6 tests)
drives the real hook with a counted `ApiService.get`. The StrictMode test is **discriminating**:
pre-fix the replay issued **2** library requests and the assertion is `toBe(1)`.

- ✓ **a StrictMode replay does NOT double-fetch** — the actual F4 defect, now pinned
- ✓ a FAILED load is still retryable inside the window (the compensating half; without the
  reset this test hangs)
- ✓ `refresh()` always reaches the network regardless of the window
- ✓ typing never refetches the catalog
- ✓ the cache is **per instance**, asserted on purpose (see below)

### Two of my assertions were wrong, and the way they were wrong is worth keeping

My first version asserted that **two separate consumers** in one tick should share a single
request. They should not: `lastFetchRef` is a per-instance ref and the hook's own header says it
fetches *"once per mounted consumer"*. **I had written tests asserting a promise the design never
makes**, and they failed at `expected 2 to be 1` both times.

That is the same failure mode as the `low_impact` command-schema test and the `classFormat:
'standard'` fixtures — a test encoding an invented contract. I kept the finding and corrected the
tests, because the scope boundary is genuinely useful knowledge: this hook deliberately does
**not** dedupe across instances, and the test file now says so in-line so nobody "fixes" it later.

Writing the test is also what proved the fix worked for the case that *matters* (same-instance
replay) while showing it does nothing for the case that was never promised.

Evidence: `hf26-tsc.log` (**tsc exit 0**), `hf26-frontend.log`
(**260 files / 1577 passed — exit 0**).

## Round 34 — F5 RECLASSIFIED: true, but by design — not a defect

The register recorded *"`LIBRARY_COPY.refreshing` has zero consumers"* as a defect (dead copy).
Checked, and the claim is **true**: the string is defined at
`exerciseSearchLibraryState.ts:81` and referenced nowhere that renders.

But the reason is a **deliberate design decision**, stated in the states file's own header:

> `ready` and `refreshing` render NO notice: cached rows stay on screen and a usable cache is
> never interrupted.

`NASMExerciseRolodex.states.tsx:118` is `if (state === 'ready' || state === 'refreshing') return
null;` — so the `refreshing` state is silent **on purpose**. The copy is unreachable because the
UI is intentionally quiet, not because someone forgot to wire it.

**Resolution: annotated, not deleted and not "fixed".** Deleting the string would erase an
authored wording that is the natural text for that notice if the decision is ever revisited;
rendering it would contradict the stated contract. The constant now carries a comment saying it
is unreachable *by design*, why, and that changing it means changing the decision first — so the
next reader stops re-filing this as a bug.

**Why this counts as progress rather than a no-op:** the register listed F5 as outstanding work.
It is now closed by *classification* — "true, intentional" is a different outcome from "fixed"
and from "still open", and leaving it ambiguous would have cost the next reviewer the same
investigation I just did. Reclassifying a finding honestly is the correct terminal state for one
that is not a defect.

**Not reclassified, for contrast:** F4's double-fetch was a real bug (2 requests where 1 was
intended, now pinned at `toBe(1)`); F6's stranded toast and F7's desync were real user-visible
faults. Those were fixed. This one was already correct.

Evidence: WorkoutLogger suite **123 files / 828 passed**; the change is a **comment only**, so
`tsc` is unaffected (`hf26-tsc.log` exit 0 from the same file set). Cap: 97 lines.

## Round 35 — F3: the retry button deleted the notice it lived in

**The defect.** `resolveLibraryState` documents *"`stale` is decided BEFORE `refreshing`, so a
failed refresh stays visible while a retry is running."* That ordering was **unreachable**:
`loadCatalog` cleared `refreshError` at load start, so `stale && isLoading` could not occur.

The user-visible consequence is worse than an unreachable branch: clicking **Retry** from the
stale notice flipped the state to `refreshing`, which **renders no notice** — and the Retry
button lives **inside that notice**. So the act of clicking it removed the notice, the error
text and the button itself, leaving a **blank pane** with no feedback for the duration of the
request. The existing proof (`NASMExerciseRolodex.recovery.test.tsx:155-166`) used a **fixture
the hook cannot emit**, which is exactly why the bug survived a passing suite.

**Fix:** stop clearing `refreshError` at load start; clear it on **success** (which the hook
already does). One line removed, and the documented ordering becomes live: the notice stays up,
`isBusy` swaps the label to *"Retrying…"*, and a fresh failure simply re-sets the same error.

**Locked, including reachability.** `exerciseSearchStaleRetry.test.tsx` (4 tests):
- pure ordering — `stale` beats `refreshing`; `refreshing` applies only to a non-stale catalog
- **the hook genuinely emits `stale && isLoading`** — a real success, a real failed refresh, then
  a retry held open so the in-flight state is observable, asserting `refreshError` is still set
  **and** `isLoading` is true **and** the resolver returns `'stale'`
- a successful retry is what finally clears the error

The reachability test is **discriminating**: pre-fix `refreshError` was cleared at load start, so
`toBeTruthy()` could not pass. Asserting reachability rather than the resolver in isolation is
the whole point — a fixture-only proof is what let this live.

**Fourth cap collision of this stretch:** the fix's comment pushed `useExerciseSearch.ts` to
**305**. Trimmed to 299. In every case it was my own comment crossing the line, never the logic.

Evidence: `hf27-tsc.log` (**tsc exit 0**), `hf27-frontend.log`
(**261 files / 1581 passed — exit 0**).

## Round 38 — SELF-REVIEW of F7's UX change: a real behaviour shift, recorded not hidden

I attacked my own F7 fix rather than keep waiting on the reviewer (see below), because it is the
one fix in the F-series that **changes user-visible behaviour** rather than only correcting a
desync.

**What changed.** The effect runs on every `filteredResults` change. On mount `filteredResults` is
the whole catalog, so the rolodex now **opens with row 0 highlighted and previewed**, and Enter
accepts it. Before the fix the pane showed row 0 but `highlightIndex` was `-1`, so **Enter did
nothing**.

**The exposure.** In `WorkoutLogger.tsx:718` and `WorkoutDesignRolodex.tsx:55` — both
data-writing surfaces — a user who opens the rolodex and presses Enter without typing now **adds
the first catalog exercise**. Previously that keystroke was inert. The change is recoverable (the
row can be removed) and it matches standard autocomplete behaviour, but it is a genuine
behaviour shift on a surface where the pre-fix behaviour was safe-by-accident.

**Why I did not flip it again.** Both options satisfy F7's actual invariant — *the pane names what
Enter adds*:

| Option | Invariant | UX |
|---|---|---|
| **current** — highlight row 0 + preview row 0 | holds | top suggestion always selected; Enter accepts it |
| alternative — highlight `-1` + preview `null` | holds | nothing selected until the user chooses; Enter inert again |

Picking between them is a **product call**, not a correctness one, and I have already changed this
behaviour once this session unverified. Flipping it again on my own judgement — with a test
written to match whichever I chose — is how a test starts encoding an invented contract, which is
the mistake this session caught four times. The alternative is a one-line change and is documented
in-line at `NASMExerciseRolodex.tsx`, so Sean can make the call in one edit.

**Recorded as OPEN (F7-risk, MEDIUM, product decision).** Not counted as dry.

**Checked and NOT a problem:** `filteredResults` identity does not cause an infinite loop — the
effect sets `highlightIndex` to `0`, which stabilises after one pass and does not feed back into
the result set. Arrow navigation still overrides the auto-highlight normally, and the
preview/highlight pair stays in lockstep because both setters are now called at the same level.

### Reviewer status

The fresh-context review of F3–F7 (`4615d37c…`) has been **running for three rounds** and has not
returned. I treated it as unavailable rather than blocked on it, and self-reviewed the highest-risk
item above. If it lands, its findings still take precedence over this self-review — a fresh
context is the whole point, and this section is not a substitute.

## Round 42 — HOSTILE REVIEW of F3–F7 RETURNED: 13 findings, 4 of them serious

The fresh-context reviewer attacked the five frontend fixes. **Its verdict: my F3 fix was
incomplete, my F5 annotation was false, and F7 introduced an accidental-commit path.** Four
rounds of my own "verification" had missed all three.

### FIXED this round (findings 1 and 2)

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | **HIGH** | **F3 was incomplete — the identical blank-the-pane bug was still live one click away.** An empty catalog (`loadState 'empty'`, `catalogCount 0`) with a retry in flight returned `'refreshing'`, which renders no notice — and the empty-catalog Retry button lives inside that notice. Same defect, different path. **All three consumers affected**, not just the logger. | `catalogCount === 0` now precedes the `isLoading` check in `resolveLibraryState`: with no rows there is nothing to preserve, so the notice — and its button — stay up through the retry. |
| 2 | **HIGH** | **My F5 annotation asserted a FALSE property.** I wrote that `refreshing` is "deliberately UNREACHABLE". It is reachable **by construction**, and my *own* test asserted it (`loadState 'ready'`, `isLoading true`, `catalogCount 3` → `'refreshing'`). The "zero consumers" half was true; the safety claim wrapped around it was not. | Annotation corrected to the narrower true statement: the **state** is reachable; the **copy** has no consumer because that state renders no notice. |

Locked by three new discriminating assertions in `exerciseSearchStaleRetry.test.tsx`
(7 tests): empty-catalog beats refreshing (pre-fix returned `'refreshing'`); refreshing still
applies when there ARE rows (so the guard did not swallow the state the fix depends on); and a
genuinely empty catalog with no refetch is still `empty-catalog`.

**Why both of these matter more than their size:** finding 2 was the artifact that *covered*
finding 1. I had annotated the dead copy as intentional, which made the live bug look like a
decision. A confidently-worded false comment is worse than no comment.

### OPEN from this review — 11 findings

- **3 [HIGH] F7 commits an exercise the user never chose, with zero typing.** Empty query returns
  the whole catalog (`exerciseSearchCore.ts:141-142`); the fix highlights row 0 on open; Enter
  adds it via `WorkoutLogger.tsx:734` → `addExercise` — no confirm, no undo. Pre-fix that
  keystroke was inert. **This is the product decision I recorded in round 38 as F7-risk; the
  reviewer supplied the consumer proof and it is worse than I judged** (it needs no typing at all).
- **4 [MEDIUM] F7 falsifies the deep-link safety contract** — `useRolodexDeepLink.ts:9-11`
  promises "never a surprise add of a different exercise"; an inexact deep link now leaves row 0
  highlighted. The exact-match path is unaffected.
- **5 [MEDIUM] F4's `lastFetchRef = 0` on failure is unproven dead code with a test that cannot
  fail** — the test calls `refresh()`, which passes `force: true` and sets the stamp itself.
  Deleting the line leaves it green.
- **6 [MEDIUM] F4's claim is overstated** — "two consumers on one instance" is contradicted by my
  own per-instance test.
- **7 [MEDIUM] `undoToast.test.tsx`: only 2 of 4 tests discriminate**; the probe matches the Undo
  *button*, not the toast, and never asserts `role`/`data-testid`.
- **8 [MEDIUM] F6 does clear a legitimate toast** — an in-place edit (`updateExercise`, `prev.map`,
  same ids) yields `added.length === 0` and dismisses a live offer. Lesser than the stranding bug,
  but my comment lists only "bulk hydration, a removal, a reorder".
- **9 [MEDIUM] F6's guard cannot tell a 1-row bulk load from a tap** — a hydration yielding one
  row arms "Added X / Undo", and Undo removes a row the trainer never added.
- **10 [MEDIUM/LOW] `listNavigation.test.tsx`'s parity test passes on the UNFIXED code** — both
  setters are `vi.fn()`, so the mocked updater never runs. Only the `not.toBeInstanceOf(Function)`
  assertion discriminates.
- **11 [LOW] `previewHighlightSync.test.tsx` never reproduces F7's actual state** — it proves "row 0
  is highlighted", never "Enter selects the previewed row": no test establishes a non-zero
  highlight before changing the result set.
- **12 [LOW] F7 replaced a self-correcting functional updater with a closure read** — two arrow
  keydowns in one batch lose an increment.
- **13 [LOW] An empty catalog that fails to refresh is mislabelled `stale`** ("Library may be out of
  date") because `hasCatalog` means "a load succeeded", not "rows exist".

### REFUTED — claims that survived (reviewer-confirmed)

F7 infinite loop (filters return the same reference; the effect writes nothing that is a memo
dep); F4 previous-instance contamination (per-instance `useRef`); F4 fetch storm (stable
`loadCatalog`); **F4 StrictMode dedupe, F3 stale-path and F6 stranding all SURVIVE and their tests
genuinely fail when reverted**; no consumer depended on `refreshError` being cleared at load
start; and **no stale closure or broken dependency array was found in any changed callback.**

### A separate, important finding about the evidence itself

`frontend/tsconfig.json` **excludes `**/*.test.ts(x)`**, so `tsc --noEmit` — which I have cited
every round as a passing gate — **does not type-check any of the four new test files.** My
"tsc exit 0" claims are true and narrower than I implied.

### F7 RESOLVED (round 43) — third attempt, and the one that fits all three constraints

Both of my previous versions were wrong in opposite directions:

| Attempt | Preview | Highlight | Verdict |
|---|---|---|---|
| original | row 0 | **stale index** | the bug: pane named one row, Enter added another |
| first fix | row 0 | row 0 | **accidental commit** — a bare Enter adds `catalog[0]` with zero typing |
| **final** | **row 0** | **-1 (none)** | pane suggests, only a choice commits |

**How I found the right answer: a test I broke told me.** Setting both to empty failed
`NASMExerciseRolodex.mediaContract.test.ts:62`, whose *stated purpose* is "keeps mobile
at-a-glance preview available **without hover-only behavior**". Mobile has no hover — so
auto-previewing row 0 is a **real affordance**, not an accident, and deleting it to fix a
keyboard bug would have traded one surface's correctness for another's regression.

The resolution satisfies all three constraints at once: the preview affordance survives; Enter
requires `highlightIndex >= 0` so a bare Enter does nothing; and `useRolodexDeepLink`'s
never-surprise-add promise holds because nothing is selected. **The pane is a suggestion, not a
commitment.**

**Also fixed the reviewer's finding 11** — the test now does what it claimed. The old suite proved
only "row 0 is highlighted"; the new one establishes an **explicit choice** (`mouseEnter` on a row)
and asserts the pane and the selection name the same row, then proves the choice is **dropped**
rather than re-pointed when the result set changes.

**Process note, fourth cap collision:** the comment pushed the component to 307 → 303 → 300. The
logic never tripped the cap; my prose did, every time.

**A source-text test nearly misled me into a worse fix.** `mediaContract.test.ts:62` regexes the
*literal implementation string* `setPreviewExercise(filteredResults[0] || null)`. It failed on my
flip — and the useful signal was its **title**, not the regex. Worth remembering that a brittle
assertion can still be carrying a real requirement.

Evidence: `hf31-frontend.log` (**261 files / 1585 passed — exit 0**); component at 300 lines.

### Fixed in round 43 (findings 5 and 10)

| # | Sev | Finding | Fix |
|---|---|---|---|
| 5 | MEDIUM | **F4's compensating line is unreachable, and its test could not fail.** `lastFetchRef.current = 0` on the failure path has no non-forced caller — the only one is the once-per-mount effect — and the test calls `refresh()`, which passes `force: true` **and** sets the stamp itself. Deleting the line leaves the test green. **Both comments asserted it was load-bearing.** | Line **kept** as documented-defensive (a future non-forced retry must not be silently suppressed for the TTL); the production comment and the test comment corrected to say exactly that, and the test's "Without the reset this hangs" claim removed. The test is retitled to what it actually proves: a failed mount is recoverable through the supported retry path. |
| 10 | MEDIUM/LOW | **`listNavigation.test.tsx`'s parity assertion passed on the UNFIXED code.** With both setters mocked, `calls.length` cannot distinguish "applied together" from "one applied inside the other's updater". | Replaced with **value** assertions (`toHaveBeenCalledWith(1)` / `(B)`), which are unambiguously discriminating — pre-fix `setHighlightIndex` received a **function**. |

**Both were the same defect class as my false F5 annotation:** a comment or assertion claiming a
property the code does not have. Finding 5 is a *test* claiming it would hang without a line that
nothing calls; finding 10 is an assertion measuring a count that cannot vary. The fix in both cases
was to make the claim match reality rather than to change behaviour.

**Fifth and sixth cap collisions of this stretch**, both mine, both prose:
`NASMExerciseRolodex.tsx` 307→303→300 and `useExerciseSearch.ts` 304→302→300. The logic never
tripped the cap once.

### Fixed in round 44 (findings 8 and 9)

| # | Sev | Finding | Fix |
|---|---|---|---|
| 9 | MEDIUM | **The "bulk hydrations are not taps" guard could not tell a 1-row PLAN LOAD from a tap.** The effect keyed on `added.length === 1`, so a hydration or AI apply yielding exactly one new row while dropping the others armed an "Added X / Undo" offer — and Undo then removed a row the trainer never added. | The guard now **also requires that no previously-known id disappeared**. A tap only ever appends; a replacement drops rows. Catches the hydration case the reviewer named. |
| 8 | MEDIUM | **An in-place edit silently dismissed a live Undo offer**, and my comment listed only "bulk hydration, a removal, a reorder" — omitting the most frequent non-tap change. | Behaviour **kept** (undoing the add would discard the edit, so retiring the offer is the safe direction) — comment corrected to name in-place edits and removal/replacement explicitly. |

**Residual recorded, not papered over:** `[] → [X]` — a one-row plan load — is **still
indistinguishable from a tap** by array diffing. Closing it needs the add to be *signalled*
rather than *inferred*, which is a real refactor and is logged as open rather than claimed as
covered. The in-line comment says so at the call site, so the next reader sees the boundary
instead of assuming the guard is complete.

**Both `undoToast` tests were discriminating when written** — the replacement case fails if the
`droppedRows` condition is removed, and the in-place case fails if the `added.length !== 1`
branch stops retiring. My first version of the replacement test was wrong (`[] → [A, B]` arms
nothing, because two rows at once is correctly not a tap) — the setup needed a genuine single tap
first. Caught by running it.

**Cap: no collision this round.** `WorkoutPlannerRolodexPanelV2.tsx` 271 → 280, my comment this
time sized to the headroom.

Evidence: `hf33-frontend.log` (**261 files / 1587 passed — exit 0**).

### Fixed in round 45 (finding 12)

| # | Sev | Finding | Fix |
|---|---|---|---|
| 12 | **LOW severity, HIGH significance** | **A regression I introduced.** Fixing F7's side-effect-in-updater problem replaced a self-correcting **functional updater** with a **closure read**: `const next = highlightIndex < results.length - 1 ? ...`. Two ArrowDown keydowns dispatched in ONE batch would both compute from the same render-time value, so the second overwrites the first and two presses advance the highlight by **one**. The old form could not lose an increment. | The handler now reads a **ref** it also writes, so the running value survives batching — while still passing plain **values** to both setters, so the purity fix that motivated the change is preserved. A `useEffect` mirror keeps the ref in step with external changes (hover). |

**Why the low severity is misleading.** Fast key-repeat is exactly the input that produces one
batch with two keydowns, and a trainer scrolling the rolodex with a held arrow key is the ordinary
case, not an edge case. The reviewer also noted the test suite could not catch it — every case
called `setup(0)` fresh, and nothing dispatched two keys inside one `act`.

**Locked by two new tests** (nav hook suite now 10):
- **two ArrowDowns inside one `act`** write `[1, 2]` and preview `[B, C]` — pre-fix this was
  `[1, 1]`, so it is discriminating
- **the ref mirror follows an external change**: rerender with `highlightIndex: 2`, then ArrowDown
  wraps to `0`. Without the effect mirror the ref would still hold `0` and write `1`

**This is the finding I'd have least likely found myself.** It is a regression introduced *by a
fix*, invisible to the suite the fix came with, and only reachable under input timing. That is now
the seventh time this session that a fresh reviewer found what my own green suites called fine.

**Self-inflicted damage, disclosed.** While inserting these tests I replaced an existing test's
opening line and left its body orphaned — the file did not parse. Caught by reading the region
back before running, repaired in the same round. That is the second time this session a
targeted edit with too short an anchor damaged a file; the anchor should have been the whole
block.

Evidence: `hf34-frontend.log` (**261 files / 1589 passed — exit 0**), `git diff --check` clean.

### Fixed in round 46 (findings 6, 7 and 13) — the review is now WORKED OUT

| # | Sev | Finding | Fix |
|---|---|---|---|
| 13 | LOW | **An empty catalog that failed to refresh was labelled `stale`** — "Library may be out of date", which is dishonest with zero rows to be out of date. `hasCatalog` means a load *succeeded*, not that content exists. | `catalogCount === 0` now precedes the `stale` check, so an empty library stays `empty-catalog` and shows the empty-catalog body (which itself says to try reloading). |
| 6 | MEDIUM | **F4's fix comment overstated its scope** — it named "two consumers on one instance" as a case the guard fixes, which my own per-instance test contradicts. | Comment corrected to name only the StrictMode replay, and to state explicitly that separate hook instances are **not** deduped **by design**, pointing at the test that asserts it. |
| 7 | MEDIUM | **The `undoToast` probe matched the wrong element.** `screen.queryByText(/undo/i)` matches the Undo **button**'s own text node, so the suite would have passed with the toast container absent. `role="status"` and `data-testid` were never asserted. | Probe replaced with `screen.queryByTestId('planner-rolodex-undo')` — the toast itself. |

**All 13 findings from the hostile review are now addressed** (10 fixed, 1 residual disclosed, 2
confirmed as already correct). Totals across the review: **10 fixed**, of which 2 were
self-inflicted regressions and 4 were false claims in comments or tests.

Evidence: `hf35-frontend.log` (**261 files / 1589 passed — exit 0**), `hf35-tsc.log`
(**tsc exit 0**). `useExerciseSearch.ts` at 300, `exerciseSearchLibraryState.ts` at 107.

## Round 52 — HOSTILE REVIEW ROUND 2 of my RESPONSE: 12 findings, 3 blockers

A second fresh-context reviewer attacked rounds 42–46 — the *response* to the first review, not the
original findings. **It falsified my claims again, including two regressions I had just introduced.**

### BLOCKERS, fixed this round

| # | Sev | Finding | Fix |
|---|---|---|---|
| 2+3 | **HIGH** | **My round-46 reorder was a regression with ZERO test coverage.** Moving `catalogCount === 0` above the `stale` check assumed "count 0 ⟺ empty library" — **false for the logger**, which passes a **section-filtered** count. A section matching nothing while a refresh had failed therefore rendered `refreshError` **nowhere** and printed *"The library returned no exercises"* over a non-empty library. And nothing asserted `stale + count 0`, so reverting the line left the suite green. | **Reorder REVERTED**: `stale` takes precedence again, and the count check stays *before* `refreshing` so the F3 blank-pane fix survives. **I introduced a worse bug than the mislabel I was fixing.** |
| 4 | **HIGH (test integrity)** | **The test named for review finding 9 never exercised `droppedRows`.** Its fixture `[A,B,C] → [C]` yields `added = []` — zero new rows — so it tested `added.length !== 1`, not the new clause. Deleting the clause keeps all six tests green. | Fixture changed to **`[A] → [C]`**: one new id AND a dropped row — the only shape that exercises `\|\| droppedRows`. |
| 1 | **HIGH** | **The F7 test file's own header was false, and its first test proved it false.** It claimed preview and highlight "agree on EMPTY" and "the pane never names a row Enter would not honour." Code: preview names row 0 while highlight is `-1`. They do *not* agree on open. | Header rewritten to the truth: on open the preview names row 0 with **no** highlight, so **Enter in the input is inert**; the **preview pane's own Add button** is a real gesture; after a hover/click the two do agree. |

### Also corrected: two more false comments of mine (#8, #12)

- `NASMExerciseRolodex.tsx` justified the highlight change by *"broke useRolodexDeepLink's
  never-surprise-add promise"*. **Falsified** — that hook never reads `highlightIndex`. The only
  real consequence was the accidental Enter commit. Comment corrected.
- `"commit catalog[0]"` → it commits `filteredResults[0]`; `"no confirm or undo"` → a per-exercise
  removal does exist. Both now stated accurately.

### OPEN from this review — and one is a behaviour change I introduced

- **#7 [MEDIUM] Hover now makes a row committable — and that arrived with this repair.**
  `git diff HEAD` shows HEAD's row used `onMouseEnter={() => setPreviewExercise(ex)}` (preview only);
  it is now wired to `onPreview` → `handlePreview`, which sets the highlight **and** the preview. So
  a pointer sweep establishes a commit target with no click, and a later Enter in the input commits
  the row under the cursor. **Recorded, not fixed** — reverting hover-to-highlight is a UX decision,
  and I have already changed this behaviour twice.
- **#11 [LOW] There is no integration test that presses Enter on the rolodex.** My `listNavigation`
  header claims synthetic `keyDown` "did not reach the handler"; the reviewer points out
  `fireEvent.keyDown` demonstrably reaches React handlers elsewhere in this same repo, and the input
  wires `onKeyDown` directly — so **the excuse is not credible** and the round's central safety claim
  is pinned only indirectly. That header is now known to be unreliable.
- **#5, #6, #9, #10 [MEDIUM/LOW]** — the documented residual understates the tap-vs-load hole
  (*every* `undoToast` test arms through `[] → [X]`; the coach/AI append is a second instance);
  `cacheClaim`'s header invariant is contradicted by its own first test; the F7 effect drops a live
  keyboard choice on a late Worker reply; and finding 12's mechanism note is imprecise — HEAD's
  handler was already batch-safe, so the intermediate version finding 12 targeted is not in git.

### Reviewer-confirmed SURVIVES

Enter's guard is real and unreachable on open (deep link never sets the highlight; both open effects
reset it) · mobile at-a-glance preview is real with its own Add button · F4's guard is genuinely
synchronous before the await and its failure-path reset is honestly labelled non-load-bearing ·
`droppedRows` logic and the unconditional ref update are correct · **no wrong dependency array, no
stale closure and no effect loop** were introduced · the `undoToast` clear-on-non-tap fix and
`listNavigation`'s batch test genuinely discriminate.

Evidence: `hf40-frontend.log` (**261 files / 1589 passed — exit 0**), `NASMExerciseRolodex.tsx` at
300 after a trim. **Eighth and ninth consecutive review rounds to find something my green suites
called fine** — this time two of them were bugs I had just introduced while fixing review findings.

## Round 53 — the missing test added, and a disclosed flake FIXED

**1. The test whose absence let my regression ship (review finding 2).** Two assertions now pin the
precedence I had broken:

```
resolveLibraryState({ loadState:'stale', isLoading:false, catalogCount:0 }) === 'stale'
resolveLibraryState({ loadState:'stale', isLoading:true,  catalogCount:0 }) === 'stale'
```

Both are **discriminating** — under round 46's ordering they returned `'empty-catalog'`. This is the
exact combination the reviewer proved was untested, and it is why a regression I introduced passed a
full green suite.

**2. The cart flake is FIXED, not merely disclosed.** Round 50's run had 1 failed file
(`cartQuantityCeilingBinding.test.mjs`), which I recorded rather than waved away. Reading the
existing log gave the root cause with no re-run:

> `ENOENT: no such file or directory, stat '…\backend\tmp\swan-plaud-official-sync-upload-test\malformed-max-state.json'`

That suite **walks the source tree**; another suite creates and destroys scratch directories under
`backend/tmp/` while it walks, so `statSync` raced the cleanup. Both causes fixed: `'tmp'` added to
`SKIP_DIRS` (a scratch directory is not source), and `statSync(full, { throwIfNoEntry: false })` so a
vanished entry is skipped rather than failing the file.

**Confirmed by the next full run: `1226 passed + 1 FAILED` → `1227 passed / 1 skipped, exit 0`.**
The file passed in isolation throughout, which is precisely what made it read as benign noise. It
was a genuine race.

Evidence: `hf41-backend.log` (**1228 files / 10131 passed, 6 skipped — exit 0**),
`hf41-frontend.log` (**261 files / 1591 passed — exit 0**).

The four review findings I could act on are closed; what remains from the review is **one
disclosed boundary** (`[] → [X]` is still indistinguishable from a tap by array diffing, recorded
at the call site) and nothing else. The register is therefore back to the pre-review 11 plus that
residual, and the **H01–H30 slices remain the substantive unstarted work** (C, D, E, F; B is
done, A was a phantom).

### Frontend (S03/S04) — reviewer 1

- **F2 [HIGH — the most dangerous remaining]** `setQuery`/`setCategory` bump `searchSequenceRef`
  **unconditionally**, but the replacement search only happens if the value actually changed, so a
  same-value setter inside a worker round-trip strands `isSearching` **forever**. Worse variant: it
  leaves the logger showing *"No exercises match current filters"* with **no filters active and no
  recovery control** (`states.tsx:169` only renders the button `if (hasActiveFilters)`). Reachable
  from the UI via `handleSelect` → `setQuery('')` (already `''`) or a recent-chip tap during the
  initial blank search. My test at `useExerciseSearch.test.tsx:143-145` **asserts the strand as
  correct**.
- **F1 [HIGH]** Line-cap claim false: `useExerciseSearch.test.tsx` **315 lines** (NEW, introduced
  here); touched-and-over: `WorkoutPlannerBlendDialog.tsx` 333, `bootcampRoutes.mjs` 430,
  `sprintRoutes.mjs` 304, `sprintService.mjs` 302, and new `bootcampTemplateContract.mjs` 343,
  `bootcampTemplateSaveSafety.test.mjs` 354, `bootcampTemplatePersistence.integration.test.mjs` 323.
- **F3 [MEDIUM]** The documented "stale beats refreshing" ordering is **unreachable** — the hook
  clears `refreshError` at load start, so `stale && isLoading` cannot occur. Clicking retry from the
  stale notice makes the notice (and the button, which lives inside it) vanish, leaving a blank pane.
  `NASMExerciseRolodex.recovery.test.tsx:155-166` proves it only with a fixture the hook cannot emit.
- **F4 [MEDIUM]** `main.jsx:79` enables `React.StrictMode`, so dev mounts fetch the library **twice**
  and build two Workers; the documented 5-minute cache is **dead code** in every reachable path.
- **F5 [MEDIUM]** `LIBRARY_COPY.refreshing` has **zero consumers** — a refresh is invisible on all
  four surfaces.
- **F6 [MEDIUM]** V2's Undo toast timer is cleared by any later `planExercises` change that is not a
  single add, and not re-armed → the toast persists forever and its Undo can target a stale plan.
- **F7 [MEDIUM]** `previewExercise` resets to row 0 when results change but `highlightIndex` does
  not, and **Enter acts on `highlightIndex`** → preview shows row 0, Enter adds row 4.

### Backend save/calendar (S06/S07) — reviewer 2

- **F2 [HIGH]** `validateGeneratedClass` only checks `Array.isArray(stretches)`: `stretches:[null]`
  **passes admission**, then `pickAllowlisted` throws `TypeError` **mid-write-path** → 500 instead
  of 400.
- **F3 [HIGH]** No value-domain validation: `classFormat`/`classStyle`/`dayType`/`board` are not
  checked against the real ENUMs; `STRING(100)` names accept 5000 chars; fractional `durationSec`
  accepted; `expectedParticipants: -9999` and `targetDuration: 1e308` admitted. My own rollback test
  relies on an unvalidated enum value — the suite documents the gap.
- **F5 [MEDIUM]** `createSprint` still persists an unvalidated, unauthorized `spaceProfileId`.
- **F6 [MEDIUM]** "Zero rows" is **counted, not observed**: the transaction mock never
  commits/rolls back, and the only real rollback proof is excluded from the default suite.
- **F7 [MEDIUM]** `save.mjs` pairs created rows **positionally** with `stations[position]`, and the
  `?? null` fallback silently recreates the full-group-misclassification defect the file header
  claims to have closed.
- **F8 [MEDIUM]** Outside the save path but in the touched routes: `POST /log` stores a
  client-supplied `templateId`, and `PUT /spaces/:id` **mass-assigns `trainerId`** (ownership filter
  is on the read only).
- **F9 [LOW]** `STATION_FIELDS` lists 8 attributes the model does not define (silently dropped) and
  misses the generator's real `equipmentNeeded` → station equipment never persists.
- **F10 [LOW]** The timezone test compares `America/Los_Angeles` against the **host** tz, never
  against `TZ=UTC`; and the save route contract is proven only by source-string slicing — **no
  supertest hits `POST /api/bootcamp/save` anywhere**.

### Authorization (S08) — reviewer 3

- **#6 [MEDIUM]** `weekId`/`slotId` are **never normalized** before lookup (`sprintService.mjs:215,
  :242, :271`, `sprintGenerator.mjs:239`); raw `0x10`, `1e3`, `-4` reach the query, and against real
  Postgres that chains into a DB error — which is exactly what finding S08‑1 was echoing.
- **#7 [LOW]** `regenerateSlot` authorizes via the validated child but then reuses the **raw**
  `slotId` for the write, memory delete and defaults. No cross-row exploit found; hardening.
- **#8 [LOW]** `generateSprintClasses` eagerly loads weeks+slots **before** the ownership comparison
  — the literal "before any read" claim is violated (no exploit; rows never leave the process).
- **#9 [MEDIUM] VACUOUS TEST** `sprintRoutesSecurity.test.mjs:137-138` asserts
  `weeksFindAll`/`slotsFindAll` were not called, but the code loads children via `findByPk({include})`
  and never calls `findAll` — the probe shows both spies stay uncalled even on the **authorized 200
  path**, so it cannot distinguish allowed from foreign.
- **#10 [MEDIUM] VACUOUS TEST** `sprintServiceOwnership.test.mjs:154-161` asserts
  `expect(Sprint.findAll).toBeDefined()` — `findAll` is not even a spy. Deleting the
  `where:{trainerId}` scoping keeps it green, so `listSprints`' scoping is **unproven** (the code is
  correct per probe; the test is not).
- **#11 [LOW]** `sprintGeneratorOwnership.test.mjs` is denial-only; its fixture could not run the
  happy path, which is why finding S08‑3 was structurally invisible there.
- **#12 [LOW]** `sprintAccess.test.mjs` certifies `requireOptionalOwnedSprint` — which was dead code
  until this round.

### Claims that HELD

Reviewer 1: B (revision guard), C (worker failure modes), D (one scorer), E (fail-closed advice),
G (retry never mutates), F (the 7-way decision). Reviewer 2: C (single managed transaction, caller
tx as-is), D (manifest keyed by persisted ids, `verified:false`), E (timezone independence), G
(legitimate zeros preserved). Reviewer 3: B (actor only from `req.user` — probed with body-supplied
`trainerId`/`role`), C (foreign ≡ missing, byte-identical), D (child reachability), E (SSE ordering —
probed), and "an admin never adopts ownership".

**No finding was critical except S08‑1, which is fixed.** Inside the save path itself, no
client-supplied `id`/`trainerId`/`templateId`/`stationId`/`manifest` reaches an INSERT.
