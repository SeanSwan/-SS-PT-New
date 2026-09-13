# EVIDENCE INDEX — Rolodex / Workout Planner server-repair packet

**Created:** 2026-09-13 (round 113) · **Artifacts dir:** `.mega-blueprints/artifacts/b214f060bbec9038/`
**Why this file exists:** two of my own number defects this round were caught by re-running commands, and a
third trap was found underneath them — see §2. This index tells a reader where a claim's evidence lives and
**how to read it**, so the next person does not repeat the false-negative search described below.

---

## 1. The logs cited by the current authoritative artifacts

| Log | What it proves | The receipt row that cites it |
|---|---|---|
| `hg118-backend-full.log` | Backend suite: 1242 files (1241 passed, 1 skipped) / 10303 passed, 6 skipped — exit 0. **Excludes `tests/integration/**` by config (`vitest.config.mjs:22`), so it proves no real-DB phrase.** | §4 Backend suite |
| `hg115-db-recheck.log` | Real-PostgreSQL suite against the owned fixture: **15/15, exit 0**. Reproduced identically as `hg119-db-final.log` five minutes later. | §4 Real-PostgreSQL suite |
| `hg103-acceptance.log` | Contract acceptance set (§8 line 311, minus the two never-built rows): 82 passed, exit 0. | §4 Contract acceptance set |
| `hg87-frontend-full.log` | Frontend suite: 1637 files / 8455 passed, exit 0. | §4 Frontend suite |
| `hg88-typecheck.log` | Real TypeScript gate (`node ./node_modules/typescript/bin/tsc --noEmit`): exit 0, 0 errors. | §4 Frontend type-check |
| `hg120-boot-gate.log` | **New this round.** Boot gate: 81 changed/untracked backend code files (37 production + 44 test) parse clean; 3/3 mount links ok; `ROUTE_GRAPH_LINKS_OK`; `BOOT_GATE_OK`; exit 0. Produced by the reproducible script `boot-gate.mjs` in this directory. | §4 Boot gate |

**Key lines of `hg120-boot-gate.log`, quoted here so they are greppable as UTF-8 text:**

```
changed/untracked backend code files: 81 (37 production, 44 test)
PARSE_OK: all 81 modules parse under node --check
  mount link ok  core/routes.mjs -> routes/bootcampRoutes.mjs
  mount link ok  core/routes.mjs -> routes/sprintRoutes.mjs
  mount link ok  routes/sprintRoutes.mjs -> routes/sprintStream.mjs
ROUTE_GRAPH_LINKS_OK
BOOT_GATE_OK
```

Exit code 0. Probe evidence that this gate is discriminating (not vacuous) is recorded in
`CONTINUATION-STATUS-20260913e.md` §2v: probe A (a duplicate-`import` file — the exact historical bug)
→ `PARSE-FAIL` + exit 1; probe B (a broken mount specifier plus a wrong named export) →
`UNMOUNTED` + `BAD-EXPORT` + exit 1; the gate script was then restored byte-identically
(SHA-256 `1341ccea78acbaa6f377669ca9d0b1d25f612276115a999d00de607febd695ad`).

### 1a. Logs added later in round 113 (all UTF-8, all carrying an `*_EXIT=` marker)

| Log | What it proves |
|---|---|
| `hg121-backend-fresh.log` | Backend suite re-run on the CURRENT bytes after the final probe revert (10305 passed after the media fix; 10303 at that point), `BACKEND_EXIT=0` |
| `hg133-backend-final2.log` | The same gate re-run after the encoding repair — **1242 files / 10305 passed, 6 skipped, `BACKEND_EXIT=0`**. This is the freshest backend evidence. |
| `hg134-boot-gate-final2.log` | Boot gate on the final tree — **82 files (37 production + 45 test) parse clean, `ROUTE_GRAPH_LINKS_OK`, `BOOT_GATE_OK`, exit 0** |
| `hg122-db-exit.log` / `hg129-db-final.log` | Real-PostgreSQL suite with a recorded exit code: 15/15, `DB_SUITE_EXIT=0` |
| `hg123-acceptance-exit.log` / `hg130-acceptance-final.log` | Contract acceptance set (the 7 files that exist): 82 passed, `ACCEPTANCE_EXIT=0` |
| `hg124-encoding-scan.log` / `hg132-encoding-final.log` | Encoding scans — 383 paths, 376 text files, 7 binary assets, **0 invalid text files** after the repair |
| `hg125-media-red.log` | RED for the F3/F4 inherited-media case against the OLD code (the discrimination proof) |
| `hg126-media-green.log` | GREEN after the fix: 4/4 in the file, the legitimate-substitute case still hydrating |
| `hg137-media-guard.log` | Media suite at **5/5** after the round-113 review tightened the rule with an `ownName !== sourceName` guard. Also records **probe M37**: deleting that guard makes the guard test FAIL (`1 failed \| 4 passed`), and the production file was restored **byte-identically** (SHA-256 compared before/after, `e3bad8f1…`). |
| `hg138-backend-guard.log` | Backend suite after the guard fix — `BACKEND_EXIT` recorded in the log |
| `hg139-boot-gate-guard.log` | Boot gate after the guard fix, with its own enumeration and exit marker |
| `hg136-typecheck-recorded.log` | Frontend type-check that records **the command, the resolution path and both exit codes**: from `frontend/` `npx tsc --version` = **5.9.3** (real compiler), from the repo root it is the npm placeholder; explicit-path `tsc --noEmit` → `TSC_EXIT=0`; the same check via `npx` → see the log (`TSC_NPX_EXIT`) |
| `hg140-backend-final3.log` / `hg141-boot-gate-final3.log` | The gates as they stood before the review-driven tooling changes (10306 passed; 82/37/45) |
| `hg142-bootgate-preflight.log` / `hg143-bootgate-preflight.log` | **Boot gate + mount-regex probe + freshness preflight** in one log. `hg143` is the current one: gate `BOOT_GATE_OK` exit 0, probe `MOUNT_REGEX_DISCRIMINATES` exit 0, preflight `FRESHNESS_OK` exit 0. (`hg142` is superseded — its probe run exposed a bug in the PROBE, not in the gate; see below.) |
| `probe-parser-lib.mjs` | The import-extraction probe: 14 fixtures covering every false-pass shape four rounds of review produced (nested template, backslash continuation, regex literal containing `/*`, two imports on one line, quoted `/*`), plus a control and a parse-error case. `PARSER_LIB_DISCRIMINATES`. |
| `probe-extra-cases.mjs` | Nine RESOLUTION-shaped cases (re-export of a missing target, `export * as ns`, side-effect import, query-string specifier, bare directory, `.cjs` target, shebang, dynamic import, import attributes). `EXTRA_CASES_DISCRIMINATE`. **It found a real false pass while being written:** the resolver used to accept a bare directory by trying `index.mjs`, and Node refuses those outright — verified against Node's own `ERR_UNSUPPORTED_DIR_IMPORT`. |
| `probe-reverse-edges.mjs` | Counts and lists the import edges INTO changed modules from UNCHANGED importers — the blind spot the audit closed in round 126. |
| `coverage-report.mjs` | Static reachability from the three mounted route modules: answers "how much of the changed set does the RUNTIME gate actually load?" — 34 of 37 changed production modules, with the 3 unsafe-to-import classes named. |
| `gate-source-manifest.json` | **The new ordering evidence (round 124): sha256 of all 8681 source files under `backend/` + `frontend/`, recorded at the moment the gates ran.** Written by `preflight-freshness.mjs --record` (which refuses unless a qualifying gate log postdates every source file); verify mode requires every current file to match it, so a touched log, a gitignored file, a skip-worktree file or a restored backup all fail. |
| `hg237-*` / `hg242-attack-replay.log` / `hg246-preflight.log` | The preflight's discrimination probes: the reviewer's four attacks (mtime forged forward, gitignored new file, skip-worktree, negated receipt row) replayed against the shipped design — control OK, all four FAILED — plus the final clean verify. |
| `hg221`-`hg234` | Round-122 evidence: the whitespace pin (`hg221`), the NBSP pin (`hg229`), the backend suite measured at 10309 (`hg230`), boot gate (`hg231`), drift audit with both resolver false passes closed (`hg232`), real-DB 17/17 (`hg233`), and the preflight whose receipt-citation rule was tightened to require every changed area's newest log. |
| `hg220-extra-cases-probe.log` | That probe's run, all ten assertions green. |
| `probe-export-surface.mjs` | The export-surface probe: a commented-out export must NOT count, `export const a = 1, b = 2` must yield both names, `export * as ns` must yield `ns`, an unparseable module must report `parseError` + wildcard. `EXPORT_SURFACE_DISCRIMINATES`. |
| `hg207`-`hg218` | Round-116 tooling evidence: both probes, the frontend attempts (cited green run `hg211-frontend-attempt2.log`), the backend gate set (`hg213`-`hg216`), and the preflight (`hg218`) that now reads this receipt. |
| `boot-gate.mjs` | The boot gate: `node --check` over every changed backend module, a real `import()` of each mounted router, and the mount graph. **Its mount check has been wrong twice and is now the third form:** a filename SUBSTRING (satisfied by a comment), then a REGEX on the filename (satisfied by an import inside a block comment, inside a template literal, or from a different file sharing the basename — review round 114 F1), and now **specifier RESOLUTION** through `lib-imports.mjs`. `probe-mountregex.mjs` carries all six shapes. |
| `probe-mountregex.mjs` | Proves the strengthened mount regex discriminates: real mounter matches; the import line commented out does not; a filename mentioned only in a comment/string does not. **Its own first version was buggy** — it commented the import out with a regex whose `^\s*` anchor slid onto the PREVIOUS import line, so the "commented" fixture still contained a live import and the probe reported the gate as undiscerning. It is now line-based and **asserts that the mutation applied**. |
| `hg147-h29-fixture-script.log` | The H29 fixture-migration script fixed and run TWICE back-to-back: both runs prove the unique index, the duplicate rejection and the NULL-key coexistence, both exit 0, and each removes the 4 probe rows it inserted (`cleanup: removed 4 probe row(s)`). Before the fix a re-run crashed on the unique index, and a FAILED proof still exited 0. |
| `hg148-fixture-roundtrip.log` | Fixture round-trip re-proved against a CLEAN baseline (`bootcamp_class_log=0`, after the script's leftovers were removed): table list and every row count identical before and after, `IDENTICAL_BEFORE_AFTER=True`, suite 15/15. |
| `lib-imports.mjs` | The ONE import scanner now (masking block comments AND template literals; statement accumulation across lines; specifier resolution). Shared by `boot-gate.mjs` and `drift-audit.mjs` because each had its own wrong version: a filename substring match (three false-pass shapes), a cross-statement regex, and a single-line regex that skipped multi-line imports. |
| `hg150`–`hg160` | Round-114 gate runs: backend suite, boot gate, drift audit, mount probe, preflight (all exit 0). |
| `hg161`/`hg163` | `SlotDetailPanel.test.tsx` 8/8 and **probe M39** — deleting the rendered refusal notice fails the new test; file restored byte-identically. |
| `hg162`/`hg163` | `useBootcampTaughtLog.latch.test.tsx` 2/2 and **probe M40** — restoring the old `[bootcamp]` latch dependency fails the latch test; hook restored byte-identically. |
| `hg164`/`hg167` | Frontend suite: **1638 files / 8459 passed, exit 0** (before and after the LOW fixes). |
| `hg165`/`hg168` | Frontend type-check with the command recorded: `TSC_EXIT=0`, 0 errors. |
| `hg166` | The three hook/panel suites together: 14 tests, exit 0. |
| `hg170`/`hg171`/`hg172`/`hg173` | Round-115 tooling: boot gate `BOOT_GATE_OK`; drift audit `DRIFT_AUDIT_OK` with **0 unverifiable** after wildcard-following; preflight `FRESHNESS_OK` citing the real gate logs; and the preflight hardening probe, which rejects four forgery shapes. |
| `hg174-acceptance-recheck.log` / `hg175-media-identity-suites.log` | The contract's § 8 acceptance set re-run after the media/identity change: **7 files / 82 passed**, and the three identity suites together **27 passed** — both exit 0. |
| `hg169-tooling-gates.log` | Round-114 final tooling gates: `BOOT_GATE_OK`, `DRIFT_AUDIT_OK`, `MOUNT_REGEX_DISCRIMINATES`, `FRESHNESS_OK` — each with its exit code. |
| `hg149-tooling-gates.log` | All four round-114 tooling gates in one log: boot gate `BOOT_GATE_OK`, drift audit `DRIFT_AUDIT_OK` (231 imports, 0 unresolved, 0 unexported), mount-regex probe `MOUNT_REGEX_DISCRIMINATES`, preflight `FRESHNESS_OK` — each with its own exit code. |
| `drift-audit.mjs` | **Pre-push rule-42 audit** (round 114): resolves every relative import in all 82 changed/untracked backend modules and checks each named import against the target's export surface. `DRIFT_AUDIT_OK` — 231 imports, 0 unresolved, 0 unexported, 31 unverifiable (`export *`). Probe-verified against both boot-crash classes. |
| `hg145-drift-audit.log` / `hg146-drift-audit.log` / `hg171-drift-audit.log` | The audit's history: `hg145` exposed two bugs in the AUDIT itself (a cross-statement regex that invented failures, then a single-line one that silently skipped every multi-line import), `hg146` added the discrimination probe, and **`hg171` is the current evidence** — it also FOLLOWS `export *` re-exports, which took the "unverifiable" count from 31 to **0**. |
| `preflight-freshness.mjs` | Fails when any changed/untracked backend code file is newer than the newest gate log (review F01, which correctly showed an earlier receipt revision cited gates older than two source files). Compares mtimes — proves ORDER, not correctness. |
| `MEDIA-RED-STATE-20260913.md` | The archived RED state for the media read-refusal rule (review F05): an explicit **reconstruction** (the pre-fix file was untracked, so no git baseline exists) plus a reproduction recipe. |
| `hg135-fixture-roundtrip.log` | **Fixture round-trip proof.** Table list and row counts snapshotted before and after a real-DB run: `IDENTICAL_BEFORE_AFTER=True`, `DB_SUITE_EXIT=0`. This is what turns "left as found" from a claim into a measurement. |

**Why the earlier logs had no exit markers:** they were captured with `*>` and the wrapper line was
appended only to some of them. Every log added after `hg121` records its own exit code in the file, so
"exit 0" is read rather than inferred.


---

## 2. GREPPING THE LOGS — RESOLVED in round 127; every log is now UTF-8

**Current state, measured:** all **268** `hg*.log` files are **UTF-8 without a BOM**; **0** are UTF-16LE.
Plain `grep` / `ripgrep` / `Select-String` all work with no encoding flag. The check that produced this
sentence, if it ever needs repeating:

```powershell
# count logs whose first two bytes are the UTF-16LE BOM
@(Get-ChildItem .\hg*.log | Where-Object { ([System.IO.File]::ReadAllBytes($_.FullName))[0..1] -join ',' -eq '255,254' }).Count
```

**What the problem WAS, kept because it is why the conversion exists.** Logs of vintage `hg01`–`hg119`
were captured with PowerShell `*>` redirection, which writes **UTF-16LE with a BOM**. `grep` and
`ripgrep` treat those as **binary** and silently return **no matches** for ASCII patterns present in
them. The old text here claimed the split was cleanly "`hg1`–`hg119` are UTF-16, `hg120` onward are
UTF-8" — **the measurement refuted that**: only **116** files were UTF-16LE, the highest-numbered one
is `hg119`, and **four** logs at or below that number were already UTF-8 (`hg21-subgraph`,
`hg22-typecheck16`, `hg40-typecheck16`, `hg67-typecheck`). The split is by FILE, not by number, which is
exactly the kind of tidy-but-false range claim this packet keeps having to correct.

**This produced a real false negative.** Searching the whole artifacts directory with a plain `rg`-style
grep for `ROUTE_GRAPH_LINKS_OK` returned zero hits, which I read as "no log ever contained the boot-gate
marker". An encoding-aware search (`Select-String`) returned `hg120` at line 34. The conclusion happened
to survive; the *method* that produced it was broken and would have hidden real evidence.

**Converted in round 127** by `convert-evidence-encoding.mjs` (`--apply`), with the audit record in
`evidence-encoding-conversion.json`: **116 files converted**, every one satisfying a per-file
**decode-compare** (the UTF-8 bytes must decode to exactly the string the UTF-16 bytes decoded to —
sha256 over the decoded text, before vs after) and a **round-trip** proof (re-encoding the decoded text
must reproduce the original payload byte-for-byte, so a non-text file is refused rather than mangled).
`ENCODING_CONVERSION_OK`, exit 0. The marker that started this — `ROUTE_GRAPH_LINKS_OK` — is now found
by a plain grep in **31** logs.

**The one thing that went wrong, and it is recorded rather than smoothed over.** The first applied run
restored timestamps with `Date` objects, which hold whole milliseconds, so every converted log lost its
sub-millisecond mtime fraction — `hg01-h09-f3f4.log` went `.6475162` → `.6480000` (≈ +0.48 ms),
`hg98-backend-full.log` `.5126259` → `.5130000` (≈ +0.37 ms), measured with .NET `LastWriteTimeUtc`
either side. The tool did **not** catch it, because its check compared `Date.getTime()` on both sides:
two *rounded* values agreeing with each other while printing "mtime drift: 0". That matters because
`preflight-freshness.mjs` compares `statSync().mtimeMs`, which is a **float**. The restore now derives
fractional seconds from `mtimeNs`, and a self-test on a synthetic UTF-16LE log **refuted the first
version of that fix too** — the assertion fired at **700 ns**, because a ~1.79e9-second value cannot be
represented as a double to better than a few hundred nanoseconds. The tolerance is therefore **1 ms**
(a zero tolerance fails forever, and a tool that always fails gets ignored; the gate's ordering decision
separates a log from a source file by seconds or more), the **measured** drift is printed on every run
even when it passes, and a drift beyond tolerance fails the run. The true sub-millisecond fractions of
the 116 converted logs are **not recoverable**; their recorded values are accurate to the millisecond.

**Why this was safe to do at packet close but not earlier:** the objection was "do not rewrite what a
reviewer may be holding". Content identity is *asserted per file* here, not assumed, so any reviewer
conclusion drawn from a log's CONTENT survives the conversion; only the encoding and up to ~0.5 ms of
mtime changed, and both are recorded.


---

## 3. Non-log evidence

| Artifact | Role |
|---|---|
| `READINESS-RECEIPT-20260913.md` | The current authoritative claim set (commands, results, gaps, local/tested/deployed separation). |
| `CONTRACT-TRACEABILITY-AUDIT-20260913.md` | Contract clause → assertion mapping, the four investigated misses, the two stale rows, and the scope limits on "covered". |
| `CONTINUATION-STATUS-20260913e.md` | Round-by-round history (§2a–§2v); §2v carries this round's three self-caught number defects. |
| `H01-H30-DISPOSITION-20260913.md` | Every register row (H01–H30) with its status: 15 built, 4 partial, 3 recorded-not-claimed, 7 never mentioned by this packet, 1 namespace-ambiguous. Written because a completeness check found IDs that appeared nowhere, and revised after its own first draft mis-stated four of them. |
| `execution-ledger.md` | Append-only execution log with the final gates of every round. |
| `H01-H30-REMAINING-SCOPE.md` | The register items that remain open and why. |
| `boot-gate.mjs` | The reproducible boot gate (see §1). Read its header before changing its expectations. |
| `state-relocated.json` | **The controller's state file. Untracked by git, NOT part of this packet's changes, and not to be migrated or edited.** `sha256 = 93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26`, mtime 2026-09-13 00:31:10. |

### 3a. Round 127–128 artifacts (encoding + the probes behind the two HIGH findings)

| Artifact | What it is and what it settled |
|---|---|
| `convert-evidence-encoding.mjs` | Converts the UTF-16LE logs to UTF-8 with per-file **decode-compare** and **round-trip** proof, and a **nanosecond** mtime assertion. Dry run is the default; `--apply` writes `evidence-encoding-conversion.json`. Read its header before trusting a run: it records the two occasions its own check was wrong (a `Date`-based restore that rounded to whole milliseconds and compared two rounded values, and a float-seconds restore that a self-test then refuted at 700 ns). |
| `evidence-encoding-conversion.json` | The audit record: 116 conversions, `runs[]` per invocation, cumulative so a later run cannot erase an earlier one. Carries `precisionNote` — the correction of record that the 116 original sub-millisecond mtime fractions are **not recoverable**. Companion `evidence-encoding-conversion-run1.json` is the untouched first-run copy. |
| `scratch-routehunt-01.mjs` | Round-127 route-mount probe (supertest, both real routers mounted in `core/routes.mjs` order, auth stripped, no Postgres). Proved every edited handler is the one a request reaches; result was **NO GAP FOUND**. |
| `scratch-identity-rereg.test.mjs` | Round-128 probe that found the **second HIGH**: it drives real `confirmSlotUsed` + `regenerateSlot` + `logBootcampClass` against an in-memory ORM and shows a confirmed slot can be regenerated into a permanently unconfirmable state. Run via `vitest/node`'s `startVitest` (the config's include is `tests/**`, so a plain `vitest run <path>` reports "No test files found"). |
| `scratch-fixhunt-freeze.test.tsx` | Round-128 adversarial probe against the round-127 fix (body frozen with the operation key). **Its first run proved NOTHING and exited 0** — see the trap below. Re-run by me as `frontend/src/hooks/zzfixhunt.test.tsx` (paths rewritten, file deleted after): 3/3 pass (`hg285`). |
| `hg273-claimskip-red.log` | The RED that proved the **second door** to the round-128 harm: the full generation loop regenerated a CLAIMED slot whose `status` had been reset (a write `validateSlotUpdate` permits), before any fix was applied. |
| `encoding-scan.mjs` | The receipt's Encoding row as a runnable command (it used to be an inline pipeline, so the numbers could not be re-derived). Enumerates both rule-42 classes, validates with a STRICT decoder, and reports an invalid file by name with its byte offset and surrounding bytes. Separates `INVALID` from `BINARY` so a PNG cannot read as a pass. |
| `markdown-table-check.mjs` | Docs-integrity gate added in round 129: GFM does not error on a broken table, it **silently drops** cells past the header count, so an artifact can lose content that a grep still finds. Found **23 such rows across 4 files**, all fixed. It ignores `\|` — its own first version counted every pipe and buried three real defects under four false positives. |

### 3b. Round 129 — the attendance split (extracted, not reworded)

| Artifact | What it is |
|---|---|
| `backend/services/bootcamp/bootcampAttendancePayloads.mjs` | The PURE half of attendance log-back (canonical-form assertions + `buildAttendancePayloads`), extracted when the roster fix pushed the service from 298 to 366 lines. Comments travelled verbatim with the code; nothing here writes, reads a database, or knows about HTTP. |
| `backend/services/bootcamp/bootcampAttendanceRoster.mjs` | The roster rule: `namesSameRoster` + `resolveRecordedAttendance` + the 409 whose message the trainer reads. Its header carries the full write-up of the MED that let a corrected roster answer 200 while silently dropping the extra attendees' forms. |
| `backend/tests/unit/bootcampAttendanceRosterConflict.test.mjs` | 5 tests pinning no-op-versus-conflict (identical resend, wider roster, no-show lock, guests, message shape). RED observed first at `hg292`. |
| `backend/tests/unit/bootcampAttendance.test.mjs` | **Its "second submission is a no-op" fixture was WRONG and is corrected.** It stored roster `[5]` and submitted `[11]` — a DIFFERENT roster — while asserting `alreadyRecorded: true`, so it certified the data-loss path it appeared to guard. The third instance in this packet of a fixture contradicting its own test name. |

**TRAP — a frontend probe placed in this directory CANNOT RUN, and vitest still exits 0.** The packet's
reviewer instructions say to put scratch probes here; for the **backend** that is safe, because
`vitest.config` includes `tests/**`, so a probe outside it fails loudly with `No test files found`. For
the **frontend** it is silently useless: `frontend/vitest.config.ts:24` is
`include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}']`, so a file outside `src/` is never collected, and
`npx vitest run <that path>` from `frontend/` exits **0** having run only whatever the filter happened
to match. A round-128 reviewer wrote three probes, ran them, read "1 file / 5 tests passed", and
correctly noticed its own file was not among them — the count was the only thing standing between a
green run and a false certificate. **Rule that follows: a frontend probe must live under
`frontend/src/` (and be deleted afterwards); a probe run from this directory proves nothing about the
frontend.** The backend's loud failure is the reason this trap is only dangerous on one side.

**TRAP 2 — `--reporter=basic` runs ZERO tests in this repo and looks like a pass.** A round-130 reviewer
hit `Failed to load custom Reporter from basic`; its first probe produced no test evidence at all until
it switched to the default reporter. Use `dot` or `verbose` explicitly. Every gate log cited in the
receipt uses one of those two, so no evidence in this packet is affected — but a probe log that shows a
reporter error and no counts must never be read as green.

**TRAP 3 — the freshness gate could report a MISSING RECEIPT because the working directory was wrong.**
`preflight-freshness.mjs` derived its root as `path.resolve(process.cwd(), '..')`, i.e. it silently
*assumed* the caller was standing in `backend/`. Run it from the packet root — **which is the invocation
this packet's own receipt documented, alone among its sibling rows in omitting the "(from `backend/`)"
qualifier they all carry** — and it resolved `tmp\worktrees\.mega-blueprints\artifacts\...` and printed
`PREFLIGHT_FAILED: no receipt at <that path>`. The message asserts a *lost receipt*, so a perfectly
correct tree reads as a broken packet, and the actual fault (a wrong directory) is nowhere in it. Nothing
was wrong with the tree: from `backend/` the same bytes returned `FRESHNESS_OK` on 8691 hashes with both
areas cited. Round 147 replaced the assumption with a walk up from CWD that requires a directory holding
**both** `backend/` and the receipt, and made the failure state what it looked for
(`no packet root at or above <cwd>`). Verified three ways: packet root → `FRESHNESS_OK`; `backend/` →
`FRESHNESS_OK`, so the repair changed no verdict and invalidated no evidence; an unrelated directory →
the new diagnostic, exit 1. **The general lesson is the one this packet keeps relearning: a failing gate
must name the ACTUAL fault. An error message that asserts the wrong cause is worse than no message,
because it sends the reader to repair the wrong thing** — here, to hunt for a receipt that was present
the whole time.

**TRAP 3, swept — the same assumption was in TWO more gates, and there it produced a false PASS.**
The rule-20 sibling sweep (rule 53's wording-class logic applied to a defect class) found
`path.resolve(process.cwd(), '..')` in **`encoding-scan.mjs:33`** and **`drift-audit.mjs:43-44`** as well.
For those the wrong root is not a false failure but a **false success**, which is strictly worse: from
the artifact directory `encoding-scan.mjs` enumerated **zero files** and printed `ENCODING_SCAN_OK` with
**exit 0**, because its verdict is `invalid.length === 0` — vacuously true when nothing was read. A green
line for bytes nobody read is the exact failure this packet's evidence discipline exists to prevent, and
it very nearly entered this round's report: I ran the scan from the artifact directory, read
`ENCODING_SCAN_OK`, and only caught it because the freshness gate had just taught me to distrust a
verdict whose directory I had not checked. From the packet root `drift-audit.mjs` crashed outright. All
three now walk up to a directory holding **both** `backend/` and `.mega-blueprints/`, and each carries a
**vacuity guard**: `encoding-scan` fails when it scanned no paths or no text files, `drift-audit` fails
when it found no changed modules — a verdict whose every clause is a zero-count test is not a pass, it is
an absence of evidence. Verified across three directories inside the packet, where all three gates now
return **identical real counts** (435 changed/untracked paths; 85 changed backend modules, agreeing with
the rule-42 exposure of 63 untracked + 22 modified), and from an unrelated directory, where all three
refuse and exit 1. Figures re-recorded as `hg374` (encoding) and `hg375` (drift); the encoding count moved
from round 132's **412** to **435** — not drift in the scan, but the truth after rounds 134–140 added
files, with the same 7 binaries so the entire delta is text.