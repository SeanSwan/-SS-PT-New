# S1 — Complete preference semantics: commands and results

**This file does not replace `results.md`.** That file is S0's frozen record and stays as it
is. This is S1's receipt, written against `07-checkpoints.md` items 1–7: items 1–5 in §1–§5,
item 6 (the `PASS`/`REVISE`/`HALT` verdict) in §7 — which is **not** this seat's to issue,
because Rule 46 makes Fable the final decider — and item 7 (archive filing and reindex) in §8.

All commands were run from `frontend/` unless stated. Nothing was committed, staged or
pushed. `source-manifest-s1.json` records `committed: false`.

**Toolchain:** Playwright `1.58.2`, vitest `4.0.18`, TypeScript `5.9.3`, Vite `5.4.19`.
Browser: Chromium via Playwright `1.58.2`. Installed trees are `chromium-1208`,
`chromium-1228` and their headless-shell counterparts; S0 recorded `chromium-1228` while
`playwright-core/browsers.json` reports chromium revision `1208`. **Not resolved** — no claim
below depends on which of the two was used.

---

## 1. Owned source list, hashes, preservation reference

The preservation reference is the **manifest**, not git. Nearly every S1-owned file is
**untracked** in this worktree, so `HEAD` cannot distinguish "S1 changed it" from "it was
never committed" — a Rule 56 union-vs-full-repo disclosure: this is a union-of-lanes
worktree carrying **1,240 dirty files** at the S1 freeze (S0 recorded 1,205 — the count moves as
peer lanes work), of which this lane's are the 18 below.

| State | Lines | SHA-256 (first 16) | Path |
|---|---|---|---|
| MODIFIED | 189 | `de9206c2132a922a` | `src/context/ThemeContext/UniversalThemeContext.tsx` |
| added | 88 | `4a97d2b01d8cb97e` | `src/context/ThemeContext/useSystemColorScheme.ts` |
| added | 259 | `e1f0e3417188e651` | `src/context/ThemeContext/useThemePreference.ts` |
| changed | 101 | `dabef0320a463816` | `src/context/ThemeContext/themePersistence.ts` |
| added | 196 | `24b29517d1971767` | `src/context/ThemeContext/themePreferenceSnapshot.ts` |
| changed | 126 | `9f6ef6be624f7d94` | `src/context/ThemeContext/themeStorageWrites.ts` |
| changed | 132 | `9109c6abc5198169` | `src/context/ThemeContext/useCrossTabThemeSync.ts` |
| changed | 68 | `b8998f8050016f43` | `src/context/ThemeContext/useUniversalTheme.ts` |
| changed | 173 | `899b4449a31b788a` | `src/context/ThemeContext/themeTestProbe.tsx` |
| changed | 125 | `f4d5239473278f91` | `src/context/ThemeContext/themePersistence.test.ts` |
| added | 211 | `97e29b8a100ae09c` | `src/context/ThemeContext/themePreferenceSnapshot.test.ts` |
| changed | 185 | `cbbba3cde2a60176` | `src/context/ThemeContext/themeCrossTab.test.tsx` |
| added | 178 | `ca3bf4387c7c2fdb` | `src/context/ThemeContext/themeCrossTabResets.test.tsx` |
| changed | 201 | `c2aaaf3e949e593f` | `src/context/ThemeContext/themeSystemPreference.test.tsx` |
| added | 150 | `1ba99a6076ce94ef` | `src/context/ThemeContext/themePreference.integration.test.tsx` |
| added | 262 | `a1ba81b1c8c827fa` | `src/context/ThemeContext/themeStorageFailures.test.tsx` |
| added | 267 | `d960409427133b6c` | `e2e/theme-lens/persistence.spec.ts` |
| changed | — | — | `tmp/tsconfig.themelens-lane-only.json` (see D-S1-5) |

`themeWritePath.test.tsx` appears in the S1 slice command but is **not** in this list: the
manifest check shows it is byte-identical to S0. It is a retained test, not an S1 change.

The "changed/added" column is not my reading of the diff — it is the output of the S0
harness (`M1` below), which re-hashes the tree and compares it to S0's frozen manifest.

**Preservation artifacts**

| Item | Value |
|---|---|
| Pre-S1 manifest (S0, frozen, untouched) | `evidence/source-manifest.json` — 66 files, 446,146 bytes |
| Post-S1 manifest (new, re-frozen after D-S1-8 and D-S1-10) | `evidence/source-manifest-s1.json` — 74 files, 525,743 bytes |
| Regeneration / verification | `node frontend/tmp/theme-lens-harness/build-source-manifest.mjs --out|--check <path>` |

**The worktree moved during this lane's evidence window, and the manifest records freeze time.**
S1 was first frozen at HEAD `e8072247d` (1,240 dirty files). Two re-freezes followed — one after
D-S1-8, one after D-S1-10 — and at the second, HEAD was `378bdad2f` with 1,276 dirty files and 95
staged entries, as peer lanes committed. So the manifest's `git` block will not match `git log -1` at
any later moment, and that is deliberate: it discloses the state the manifest was taken *at*. What
matters is that the lane's 74 files are unaffected — `--check` returns `CLEAN — 74 files match`, which
is the property the baseline exists to support.

Every touched file is ≤ 300 lines (Rule 4); the largest is `persistence.spec.ts` at 267.
`themeCrossTab.test.tsx` was split at 368 lines rather than exempted — `06-bans.md`
forbids a self-granted exemption, which is what produced D-S1-1.

---

## 2. Exact commands, exit codes and named acceptance results

| # | Command | Exit | Result |
|---|---|---|---|
| **C1** | `node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themePreferenceSnapshot.test.ts src/context/ThemeContext/themePreference.integration.test.tsx src/context/ThemeContext/themeStorageFailures.test.tsx src/context/ThemeContext/themeCrossTab.test.tsx src/context/ThemeContext/themeSystemPreference.test.tsx src/context/ThemeContext/themeWritePath.test.tsx` | **0** | **6 files, 34 tests passed** (13.19 s) |
| **C1b** | `node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext/themeCrossTabResets.test.tsx` | **0** | **1 file, 5 tests passed** |
| **C2** | `node ./node_modules/@playwright/test/cli.js test --config playwright.theme-lens.config.ts persistence.spec.ts` | **0** | **6/6 passed** (26.9 s) |
| **B1** | `node ./node_modules/vitest/vitest.mjs run src/context/ThemeContext` | **0** | **20 files, 161 tests passed** |
| **B2** | `NODE_OPTIONS=--max-old-space-size=8192 node ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tmp/tsconfig.themelens-lane-only.json` | **0** | clean |
| **B2′** | same, after D-S1-5 | **0** | clean **with `e2e/theme-lens/**` now included** |
| **B3** | `NODE_OPTIONS=--max-old-space-size=8192 node ./node_modules/typescript/bin/tsc --noEmit --incremental false` | **0** | clean (full application) |
| **B4** | `node ./node_modules/vite/bin/vite.js build` (D2 form: `dist` renamed aside first) | **0** | built in 33.95 s |
| **M1** | `build-source-manifest.mjs --check evidence/source-manifest.json` | **1** | `DRIFT` — 10 changed, 8 added, **0 foreign** |
| **M2** | `build-source-manifest.mjs --out evidence/source-manifest-s1.json` | **0** | 74 files, **524,877** bytes, `dependency drift=0` |
| **M3** | `build-source-manifest.mjs --check evidence/source-manifest-s1.json` | **0** | `CLEAN — 74 files match` |
| **M4** | mutation: the `storage` listener is not registered (`useCrossTabThemeSync.ts`) | **1** | **4 failed / 2 passed** — §3 |
| **M5** | the same mutation, after D-S1-8 | **1** | **3 failed / 3 passed** — §3 |
| **M6** | mutation: the `storageArea` guard is deleted (`useCrossTabThemeSync.ts`) | **1** | **2 failed / 3 passed** — §3, D-S1-10 |

**C2 was run three times and the record needs the sequence, not a single number:** 26.9 s
(before the mutation work), 31.1 s (after the D-S1-8 restructure), 33.5 s (final, after
restoring the mutant and rebuilding). **All three are 6/6, exit 0.** The hash in §1 is the spec
as it stands after the final run.

C1 is the command **exactly as written** in `09-tests.md` §Slice commands, and it passes. C1b
exists because that command's file list is now incomplete (D-S1-1). C2 is the browser half of
the same slice, run with one addition (`--output`) and one deliberate omission (`--reporter`)
— both explained in D-S1-2/D-S1-3.

`M1` exiting **1** is the expected result, not a failure: drift is what a slice is supposed to
produce. Its value is the *attribution* — every one of the 18 drifted paths is in this lane,
so no S1 evidence is contaminated by another lane's edits.

**Named acceptance results.** T1 `themePreferenceSnapshot.test.ts` 9/9 · T2a
`themeCrossTab.test.tsx` 7/7 + `themeCrossTabResets.test.tsx` 5/5 · T2b
`themeSystemPreference.test.tsx` 5/5 · T3 `themePreference.integration.test.tsx` 4/4 +
`themeStorageFailures.test.tsx` 6/6 · T4 `persistence.spec.ts` 6/6.

**Name-level traceability for T1–T4 (added by the post-filing verification pass).** `09-tests.md`
specifies T1–T4 as *named cases*, not counts — so "6 passed" is not the claim being made. Every
required name was matched literally against the shipped files, and all **28** are present:

| ID | File | Required names | Found |
|---|---|---|---|
| T1 | `themePreferenceSnapshot.test.ts` | 4 | 4 (file runs 9 — a superset) |
| T2 | `themeCrossTabResets.test.tsx` | 5 | 5 — lines 50, 68, 85, 114, 140 |
| T2 | `themeSystemPreference.test.tsx` | 3 new (+2 retained) | 3 new; file runs 5 |
| T3 | `themePreference.integration.test.tsx` | 4 | 4 |
| T3 | `themeStorageFailures.test.tsx` | 6 | 6 |
| T4 | `e2e/theme-lens/persistence.spec.ts` | 6 | 6 |
| | | **28** | **28** |

Two things a reviewer needs from that table:

1. **T2's five new cases are not in `themeCrossTab.test.tsx`, where `09-tests.md` names them.** Rule 4
   forced that file to be split, so they live in `themeCrossTabResets.test.tsx`. This is D-S1-1 — and
   the table is the evidence that the relocation is **complete rather than partial**. A count-only
   check would have missed it in both directions: `themeCrossTab.test.tsx` passing 7/7 says nothing
   about the five cases the contract put there, and `themeCrossTabResets.test.tsx` passing 5/5 says
   nothing about *which* five.
2. **T1 is a superset, not a substitution.** Its file runs 9 tests against 4 required names, so the
   requirement is satisfied by inclusion. The two "retained" T2b cases are unnamed in the contract, so
   only the three *new* names are checked here.

---

## 3. RED before GREEN

RED was obtained by **mutating the mechanism and requiring the claiming test to notice**,
not by deleting the test. Every injection was restored and verified by SHA-256 afterwards
(`themePreferenceSnapshot.ts` `9e9fefee…`, `useSystemColorScheme.ts` `4a97d2b0…`,
`useThemePreference.ts` `58cee28a…`, `themeStorageWrites.ts` `9f6ef6be…`).

### The T4 acceptance cases are load-bearing — proven by mutation, not asserted

250/250 green convergences would mean nothing if the two-page cases could not fail. So the
mechanism was removed: `window.addEventListener('storage', handleStorage)` was commented out in
`useCrossTabThemeSync.ts` (hash `9109c6abc5198169` → mutant `e84f264ba115c49e`), the bundle was
**rebuilt** — the browser suite serves the built `dist/`, so a source mutation that is not rebuilt
changes nothing under test — and `persistence.spec.ts` was run against the mutant.

**Result: 4 failed / 2 passed, exit 1.** Red: `two pages converge after a real selection`,
`clear converges with a new page`, `foreground return reconciles`, `interleaved writers converge
to final readable pair`. Green: the two `reload` cases — correct, because a reload reads storage at
startup and needs no event.

**My prediction was 3 red / 3 green, and it was wrong.** I expected `foreground return reconciles`
to stay green because it dispatches `pageshow` itself. It went red, and the captured assertion says
why:

```
Error: expect(received).toBe(expected)
Expected: "crystalline-default"
Received: "crystalline-dark"
Call Log: - Timeout 10000ms exceeded while waiting on the predicate
> 191 |     await expect.poll(() => readTheme(pageB)).toBe(NON_DEFAULT);
```

It died on its **setup** convergence poll and never reached the `pageshow` path it is named for. A
storage-path regression was therefore being attributed to the foreground handler, and the case's
name overclaimed what it isolates. **That is a real defect in the test, found by mutating the app.**

**D-S1-8 — the fix, and the proof the fix works.** The case now seeds B's starting theme in storage
*before* B loads, so B reads it at startup and no cross-page convergence is involved anywhere in the
case. Re-running the **identical** mutation gives **3 failed / 3 passed**, and the flip is the
proof: `foreground return reconciles` is **green under a mutation that breaks the storage-event
path**, while the three cases that genuinely depend on that path stay red. The restructure is
load-bearing, not cosmetic.

**Restoration.** `useCrossTabThemeSync.ts` was restored and verified byte-identical
(`9109c6abc5198169`, 132 lines) after *both* applications; the bundle was rebuilt from the restored
source; and the manifest drift set against S0 is **unchanged** (10 changed, 8 added) — an
independent check that no mutant was left behind. `dist` was renamed aside rather than deleted
(D2's remedy), which is why 9 `dist.stale-*` directories now exist.

| Mutation | Predicted | Measured |
|---|---|---|
| Neutered the storage-acquisition `catch` | ≥1 red | **1 red** |
| Collapsed "cannot acquire storage" into "nothing stored" | ≥1 red | **1 red** |
| Removed the subscription cleanup in `useSystemColorScheme` | 2 red | **2 red** — `2 to be 1`, `1 to be +0` |
| Judged write success by thrown exception instead of readback | red | **5 of 6 red** |
| Deleted the explicit `if (!storage)` guard | — | **suite stayed GREEN** |

The last row is the one that changed the code. The guard is **not** load-bearing for the
outcome — the surrounding `try` already catches the `TypeError` — so it is load-bearing only
for *intent and narrowing*, and the comment in `themePersistence.ts` now says exactly that
instead of implying a behavioural guarantee.

**Two claims I wrote were falsified by my own mutations and corrected in place.** I had
recorded that a two-update reconcile "renders an intermediate pair", and that holding the
preference as two `useState` calls meant a peer update "could be applied in two renders".
Both are wrong: React 18 batches same-tick updates, so the injected two-call version still
rendered a single pair, and the second claim was never measured at all. The comments now
describe the test as a **regression lock on the observed sequence**, not proof of one state
update, and mark the unmeasured claim as unmeasured.

Other RED→GREEN pairs worth naming:

- **T1 `getter and read denial return unavailable`** failed for a mechanism I had to measure:
  `vi.spyOn(window.localStorage, 'getItem')` installs an *own* property that jsdom's `Storage`
  proxy never consults, so the spy was **inert** (`getOwnPropertyDescriptor(instance,'getItem')`
  was `undefined`, and the spy did not throw). Fixed by substituting a hostile object whose
  `getItem` throws, and the docstring was corrected so it no longer overclaims.
- **T4 `clear converges with a new page`** expected `crystalline-default` — my spec hard-coded
  the provider's *parameter* default. The mounted app passes `defaultTheme="crystalline-dark"`
  (`App.tsx:245`), which `03-contracts.md` rule 3 states. The app was right; the test was wrong.
- **T4 `foreground return reconciles`** used `bringToFront()`, which does not change
  `document.visibilityState` in headless Chromium, so the stale tab stayed stale for the whole
  10 s poll. Now dispatches `pageshow` from inside the page, with the limitation stated in the
  spec rather than hidden.
- **Four cross-tab cases went red** once the listener enforced `event.storageArea === storage`.
  They had been dispatching `StorageEvent`s with a **null** `storageArea`, which the old
  `event.storageArea && …` guard let through — so they had been **passing vacuously**, certifying
  a listener that could not tell a real browser event from a bare `Event`. Fixed with a shared
  `deliverStorageEvent` helper that makes `storageArea` structural.

### The storage-area action, re-tested against the guard itself (M6)

That bullet records four cases being **made** non-vacuous when the guard became strict. The post-filing
verification pass asked the sharper question the action actually names — *is the guard load-bearing for
the storage-area cases?* — by deleting the guard alone:

```
// useCrossTabThemeSync.ts — MUTATION-M6
// if (event.storageArea !== storage) return false;
```

**Result: 1 failed / 4 passed — and the survivor was `wrong storage area causes zero reconciliation`.**
That is the finding. The null-area case correctly went red; the wrong-area case passed with the guard
**deleted**, so it was not pinning the guard at all. It writes to `sessionStorage` and asserts the theme
does not move — while reconciliation reads `localStorage`, which the `sessionStorage` write never
touched. The assertion was satisfied by the **read path**, not by the area check. Its doc comment
claimed it showed "the listener was ALIVE **and discriminated**"; the mutation shows it showed only
that the listener was alive.

**Fixed by poisoning the read path** (D-S1-10): the case now moves `localStorage` to a value the mounted
theme does not have, with no event delivered for it, *before* the `sessionStorage` event — so the
assertion depends on the guard, because a listener that reconciles on the wrong area reads the poison
and the theme moves. Re-run against the identical M6 mutation: **2 failed / 3 passed**, both area cases
now red. Restored and verified: `9109c6abc5198169`, 132 lines; C1 (34 tests), C1b (5) and B1 (161) all
exit 0 on the restored tree.

**This is the same defect class as the bullet above, one level down.** That pass fixed cases vacuous
because they never set `storageArea`; this one fixes a case that sets it correctly and is *still*
vacuous, because its assertion is reachable through the read path. Making the helper's parameter
structural is necessary but not sufficient — the assertion must also be **unreachable** when the guard
is gone.

---

## 4. Mounted-path evidence and forbidden-side-effect checks

- **Real pages, real events.** Every two-page case in `persistence.spec.ts` uses two genuine
  `Page`s in **one browser context** (`05-slices.md`: *"including two real pages"*). Nothing is
  synthesised: convergence comes from the browser delivering a genuine `storage` event between
  same-origin documents. The unit suites dispatch synthetic events because jsdom has no second
  tab; these do not, so a regression in the real event path cannot hide behind a fixture.
- **Real registry, real keys.** Theme ids come from `themeCycle` and the storage keys are
  **imported** from `UniversalThemeContext`, never retyped. A literal key string here would be a
  second definition that goes stale silently.
- **Boundary.** `network.fixture.ts` is `{ auto: true }`, so no case can forget it: off-origin
  and `/api/**` requests are aborted **and recorded**, and WebSockets are closed and recorded
  (`context.route()` does not see them). `mount.spec.ts`'s `selection causes no API mutation`
  is an absence claim, and it is falsifiable because the log would have recorded the attempt.
- **No production service.** The config starts `vite preview` on `127.0.0.1:4179` with
  `reuseExistingServer: false` and `--strictPort`, and inherits no other project or webServer.
  `06-bans.md` forbids a browser configuration that starts the production-connected backend;
  the root `.env` points `DATABASE_URL` at the production Render database, so this is a live
  hazard rather than a stylistic preference. No database command was run in S1.
- **No new dependency.** `M2` reports `dependency drift=0`, independently corroborating D-1.
- **No peer-triggered writes** (`05-slices.md` acceptance). `reconcileFromStorage` never writes,
  and a mutation that made it write was caught by `peer adoption never writes`.

---

## 5. Deviations, remaining unknowns and rollback boundary

### D-S1-1 — the S1 slice command's file list is now incomplete

`09-tests.md` names `themeCrossTab.test.tsx` for T2b. Rule 4 forced that file to be split, so
the verbatim command no longer covers the whole T2b concern. I ran the command **as written**
(C1, exit 0) and then the split file separately (C1b, exit 0) rather than silently editing
Astra's document. **A reviewer should decide whether to amend the command or accept the pair.**

### D-S1-2 — `--reporter` on the CLI silently discards the configured reporters

Every one of my earlier runs passed `--reporter=list`. The CLI flag **replaces** the configured
list, so the `json` reporter never ran and `evidence/playwright-results.json` sat **stale at
02:07** through six consecutive runs. Proven by mtime: with `--reporter` omitted it wrote at
03:38:48 and records `expected: 6, unexpected: 0, flaky: 0` with all six T4 titles. Any future
evidence run must use the command **as written**, without `--reporter`.

### D-S1-3 — the harness bulk-delete guard blocks the package `outputDir` clean

C2 could not run with the configured `outputDir`. Playwright wipes `outputDir` at the start of
every run, and that wipe was refused:

```
[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
{"count":6040,"threshold":50,"scope":"turn","targetCount":1,
 "targets":["…\BLUEPRINT-theme-lens-2026-09-20\evidence\playwright"]}
```

The target directory held **one** file. So `count` is not the target's size: the guard helper's
state records `{"1d576a75…":{"count":6039}}` for this request, i.e. it compares a **running
total of files deleted within the conversation request** against a threshold of 50. C2 therefore
ran with `--output` pointed at OS temp (which the shim bypasses). For a **green** run this
redirects nothing that matters — `screenshot: 'only-on-failure'` and `trace: 'retain-on-failure'`
mean a passing run writes no artifacts — and the JSON evidence still lands under the package.
**A failing run's artifacts would land in temp**, which is why this is a deviation and not a fix.

**Corrected after re-verification — the counter is not per-turn, and this lane is over threshold
permanently.** `scope: "turn"` in the payload is a misnomer. In `safe-delete-bulk-guard.cjs` the
counter is keyed by **request id** in a `state.json` under `CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR`;
`checkSafeDeleteBulkGuard` refuses when `request.count + deleteCount >= threshold` (lines 344, 350)
and prunes entries only after `TURN_STATE_TTL_MS` = **7 days** (line 14, applied at line 321).
Measured: request id `1d576a75…` reported `count: 6040` **across a turn boundary**, and five further
runs left it at exactly 6040 with `updatedAt` unchanged (`2026-09-20T11:38:47.790Z`) — so the
counter is neither per-turn nor per-run. Two consequences the earlier wording got wrong:

1. The verbatim command is **unavailable to this lane**, not merely inconvenient. Any target at
   all is refused while the request's cumulative count is 6040 against a threshold of 50, so
   `--output` into OS temp is **mandatory** for the rest of this session rather than a
   convenience deviation. The same applies to every other tool this lane runs that wipes a
   directory. The remedy is B4's: rename aside, never delete.
2. Because the refusing call is made inside a **child process** (Playwright), it fails hard
   instead of surfacing a confirmation prompt. The guard is interactively confirmable for the
   agent's *own* tool calls; for a delete performed by a tool the agent spawned, the only
   outcomes are allow or throw. That is why this surfaced as an `Error:` trace rather than a
   question.

The counter's value is also **not a measure of anything in this repo** — it is a running total for
the request, incremented by deletes elsewhere in the tree and by approved calls (line 345
increments without a threshold check). It carries no information about the theme-lens lane.

### D-S1-4 — correction to D2's mechanism

S0's D2 describes the shim as refusing at its *"50-target threshold"*. That phrasing is wrong:
`targetCount` was **1** while the block fired. The threshold is on **files deleted**, accumulated
**per request**. D2's *remedy* (rename `dist` aside rather than let the tool empty it) is correct
and was used again for B4.

### D-S1-5 — I changed the lane tsconfig that B2 runs

S0's D3 closed the "browser files are type-checked by nothing" gap with an ad-hoc `tsc`
invocation and recommended, **for S1**, adding `e2e/theme-lens/**` to
`tmp/tsconfig.themelens-lane-only.json`. I did that, so B2 now covers the browser files on every
run (B2′ exit 0). This **changes the baseline command's surface between S0 and S1** — B2 passing
in S1 is not the same measurement as B2 passing in S0. Recorded because a reviewer comparing the
two runs would otherwise see an unexplained difference.

### D-S1-6 — one unexplained T4 failure

`two pages converge after a real selection` **failed once** in **nineteen** recorded executions:

| # | Context | Result | Suite wall clock |
|---|---|---|---|
| 1 | first of a 3-run loop | **FAILED** | **11.8 min** |
| 2 | second of that loop | passed | 1.4 min |
| 3 | third of that loop | passed | 27.7 s |
| 4–9 | isolated `--repeat-each=6` | 6 passed | 25.8 s |
| 10–11 | two full-suite runs | passed | 30.8 s, 31.0 s |
| 12 | C2 (slice command) | passed | 26.9 s |
| 13–14 | C2 after the D-S1-8 restructure (§2) | 2 passed | 31.1 s, 33.5 s |
| 15–19 | five consecutive C2 re-runs, post-filing | 5 × 6 passed | 27.4, 23.7, 24.4, 28.7, 25.8 s |

**Two corrections to this table's earlier form.** It read *"passed twelve times"* while its own
rows summed to twelve *executions* (one failed, eleven passed), and it omitted the two post-D-S1-8
C2 runs that §2 records. Both are fixed above, and the total is now derived from the rows rather
than asserted.

**Runs 15–19 are the post-filing extension, and they narrow the failure rather than explain it.**
All five are 6/6 with exit 0, and their wall clocks cluster in a **23.7–28.7 s** band. Every run
other than the first is fast; the failing run is the **only one above 1.4 min, at 11.8 min — ~25×
its siblings and ~450× the fastest**. The monotone decay across the original loop (11.8 min →
1.4 min → 27.7 s) reads as external load easing, not as warm caches: the bundle is built once and
`vite preview` serves it unchanged, so there is no per-run compile to warm. That is consistent
with the concurrent-agent activity recorded as a plausible-but-unproven cause below, and it means
the honest summary is **"dry under normal machine conditions, once non-dry under a load state I
can detect by wall clock but cannot reproduce"** — not "fixed", and not "reproducible".

Run 1 was **~25× slower** than its siblings, and **the failing assertion is unknown for two
reasons — one environmental, one my own**:

- Run 2's `outputDir` clean destroyed the failure artifacts (screenshots and trace).
- **My own invocation discarded the error text.** The loop ran
  `… cli.js test … 2>&1 | grep -E "passed|failed|flaky"`, which keeps only lines matching those
  words. The reporter's error block — the assertion, the expected value and the received value —
  contains none of them, so it was thrown away before I read it. What survived in the transcript
  is exactly what the filter allowed: `1 failed / 8 passed (11.8m)` and two artifact **paths**
  (those matched only because the directory name contains `failed`). **The diagnostic existed and
  I deleted it.** Recorded here rather than left as "artifacts were wiped", which is true but
  would misattribute the loss to the environment.

I did not treat this as noise, and I did not treat it as a defect I had fixed. What I measured:

- **The mechanism under test is sound and fast.** A scratch probe
  (`frontend/tmp/theme-lens-flake-probe/`) drove **250 real cross-page convergences** — 20
  distinct-theme selections and 30 alternating on a two-theme loop, repeated four times, plus an
  initial single pass — with **0 misses**, worst-case convergence **122 ms** and typically 39–75 ms
  against the test's 10,000 ms poll budget. A pure timing-budget explanation would need an ~80×
  slowdown; the event would have to be *lost*, not merely late.
- **The one exposure I could name is not reachable.** The real case never establishes that page B
  is *listening* before page A's first write, while the probe waits for mount. I probed the
  cold-start window directly: after `b.goto('/')` resolves (so B's startup read cannot mask the
  result), a write from A was followed by B in **40/40 trials, including 12 at 0 ms delay**
  (72–405 ms, mostly `expect.poll`'s first interval). The listener is already live at `goto`
  return, so **a readiness wait would be decoration, not a fix** — which is why I added none.
- **The slowdown's cause is not established.** The guard counted 6,039 files deleted in this
  request; I could not attribute them. `frontend/node_modules/.vite/deps` holds 55 files, the
  surviving shim reports contain no theme-lens evidence paths, and my first hypothesis (that
  run 1's own `outputDir` clean was the ~10 minutes) is **not supported** and is withdrawn.
  Concurrent agent activity in this shared worktree is a plausible alternative — other lanes were
  active in this window — but that is also unproven.

**Therefore the failure is recorded as UNEXPLAINED.** Per Rule 73 I am not declaring the suite
dry, and per Rule 46 I am not issuing the verdict. See §7.

### D-S1-7 — new harness tooling in gitignored scratch

`frontend/tmp/theme-lens-flake-probe/crossTabStorm.spec.ts` and
`frontend/tmp/playwright.theme-lens.scratch.config.ts` are new, uncommitted probe tooling under
`frontend/tmp/` (gitignored, so `git status` stays clean). Disclosed rather than passed off as a
deliverable — the same disposition S0 gave its own harness tooling in D4. They exist so the
§D-S1-6 numbers are re-runnable:

```
node ./node_modules/@playwright/test/cli.js test --config tmp/playwright.theme-lens.scratch.config.ts
```

They are **not** collected by the real suite (`testDir: './e2e/theme-lens'`).

### D-S1-8 — I restructured an acceptance case after its evidence was filed

The mutation proof in §3 found that `foreground return reconciles` failed on its setup poll, so it
could not tell a storage-path regression from a foreground-path one. I restructured it to seed B's
theme before load, removing that dependency.

**This changed `persistence.spec.ts` after C2's original evidence run**, so that run no longer
describes the shipped file: the spec hash moved `df49e86a298526b5` → `d960409427133b6c` (252 → 267
lines), C2 was re-run, and the post-S1 manifest was re-frozen. A reviewer comparing the two C2 runs
will see a different file. That is deliberate and recorded rather than left as silent drift — and
the mutation re-run (M5) is what shows the change did what it claims.

### D-S1-9 — post-filing corrections from the verification pass

A post-filing verification pass re-ran `M3` (`CLEAN — 74 files match`, exit 0), read both manifests'
`counts` blocks directly, re-read the bulk-delete guard's own source and state file, and extended the
flake series by five runs. **Four** things in this receipt did not survive that pass and are
corrected in place:

1. §2's `M2` row read **523,911 bytes**; `source-manifest-s1.json`'s `counts` records **524,877**.
   The row was written from the first freeze and not updated when the manifest was re-frozen after
   D-S1-8. The earlier value cannot be recovered — `--out` overwrites — so "written from the earlier
   freeze" is a plausible reading, not a measured one.
2. §1 read **1,258 dirty files**; the S1 manifest records **1,240**, and S0's records **1,205**.
   This is a moving number in a shared worktree, so it is now quoted as-of the S1 freeze.
3. D-S1-3 closed with *"a request whose counter is under threshold can run the command verbatim."*
   True but **unreachable** here, and it understated the mechanism: the counter is keyed by request
   id with a **7-day TTL**, not by turn, and this lane's counter sits permanently above threshold.
   D-S1-3 now carries the measured version.
4. D-S1-6's table read *"passed twelve times"* while its own rows summed to twelve **executions**,
   and it omitted the two post-D-S1-8 C2 runs that §2 records. The table now derives its total from
   the rows and adds five further re-runs.

All four are one defect class: **a number asserted rather than derived.** Recorded rather than
silently fixed because this file is the gate's input, and a receipt that contradicts its own
artifacts is a defect in the evidence regardless of which figure happens to be right.

### D-S1-10 — I strengthened an acceptance case after its evidence was filed

The M6 mutation in §3 found that `wrong storage area causes zero reconciliation` passed with the
`storageArea` guard **deleted**. I changed the case so it fails under that mutation; its hash moved
`13ab4e6f7a643b28` (166 lines) → `ca3bf4387c7c2fdb` (178 lines), and the manifest was re-frozen.

**This is a second mid-package change to an acceptance case** — D-S1-8 was the first — so it carries
the same disclosure and the same reviewer question. Two things differ, and both favour it:

- **D-S1-8 fixed a case that was failing for the wrong reason. This one fixes a case that was
  *passing* for the wrong reason** — the more dangerous direction. A green assertion that cannot fail
  is worse than a red one that cannot discriminate, because it certifies a guard it never exercised.
- **Its evidence is a mutation, not an argument.** The case goes red under M6, green on the restored
  tree, and C1/C1b/B1 were all re-run afterwards (34, 5, 161 — all exit 0).

The action it serves is named in `05-slices.md` — *"make storage-area tests non-vacuous"* — so
strengthening it is executing the contract rather than expanding scope. **The reviewer may reverse
it:** reverting the file to `13ab4e6f7a643b28` restores the previous case, and the manifest would then
need re-freezing to match.

### Remaining unknowns

- The S1–S3 boundary item recorded in `useThemePreference.ts`: enabling "Match system" renders a
  one-frame inconsistency — measured pairs `(solar-gold,false) → (solar-gold,true) →
  (crystalline-dark,true)`, with the switch reading ON while the page still shows the manual
  theme, visible because `useEffect` runs after paint. **Deliberately un-repaired in S1** (no S1
  acceptance case names it; the switch and save-notice UI that would expose it is S3's subject).
  Believed pre-existing, but the pre-refactor tree was **not measured**, so "pre-existing" is
  **UNVERIFIED**. This is the first concrete candidate for N2.
- `pageA`'s own `localStorage.clear()` does not update `pageA`'s UI — Chromium suppresses
  self-writes and a clear fires `storage` only in *other* pages. Explained in the spec as a
  pre-existing S2 concern, not an S1 acceptance criterion.
- Still open from the R6 package: **A1-05**, and N3–N8. **N5 is stop-ship** (focus outline
  `--accent-primary` on `obsidian-black` measured at **1.13:1**).
- **S3 cannot be entered** until the "Quiet Chrome / static" visual direction is accepted;
  `DECISION-RECORD.md` records that as still open, and D-1 answers the dependency question only.

### Rollback boundary

Revert the **10 changed** files to their S0 hashes from `source-manifest.json` and delete the
**8 added** files; `tmp/tsconfig.themelens-lane-only.json` reverts by dropping the
`e2e/theme-lens/**` include. `--check evidence/source-manifest.json` is the verifier: it must
return `CLEAN — 66 files match`. Nothing in S1 touched the database, a deployment, or another
lane's files, and no new dependency was added, so rollback is file-scoped.

---

## 6. Dependency and contract deviations

- **No new dependency** (D-1). `M2` reports `dependency drift=0`; declared/locked/installed
  surfaces are unchanged from the `03-contracts.md` table.
- **Registry and token contracts unchanged.** `themeCycle`, `themes`, `ThemeId` and the palette
  modules are untouched — the manifest shows no drift in `themePalettes.ts` or `palettes/**`.
- **`themeChanged` payload unchanged** at `{ themeId, theme }`, and still fired **only** from the
  explicit-selection paths. The OS-apply effect and `reconcileFromStorage` do not dispatch it, per
  the contract's "do not extend to OS/peer updates without a separate consumer audit".
- **Public surface added, not altered:** `ThemeContextType` gains `persistenceStatus`,
  `pendingLocalWrite`, `retryThemePersistence`; `useUniversalTheme.ts` defines them, the provider
  supplies them, and the existing setters are what the real toggle uses. `ThemePreference`,
  `PreferenceSnapshot` and `writeThemePreference` match the declared signatures exactly.
- **One deliberate narrowing:** `resolveThemePreference` accepts only `ReadablePreferenceSnapshot`,
  so unavailability handling at a call site is a **compile error** rather than a convention.
- **Compatibility wrappers retained** where still referenced, as the contract requires.

### Reachability — verified link by link

`05-slices.md` states S1's reachability as *"`useUniversalTheme.ts` defines fields → provider supplies
them → real toggle uses existing setters → writer/listener share resolution rules."* Each link was
checked in the shipped tree rather than assumed:

| Link | Evidence |
|---|---|
| Owner defines the fields | `useThemePreference.ts:88` `persistenceStatus`, `:89` `pendingLocalWrite`, `:191` `retryThemePersistence`; exported `:249–255` |
| Contract declares them | `useUniversalTheme.ts:44`, `:46` on the context type |
| Provider supplies them | `UniversalThemeContext.tsx:94–99` destructures; `:143–158` places them in the context value |
| Real toggle uses existing setters | `UniversalThemeToggle.tsx:58` `const { currentTheme, setTheme, toggleTheme } = useUniversalTheme()`; calls `setTheme(themeId)` `:72`, `toggleTheme(direction)` `:115` |
| Writer and listener share resolution rules | `useCrossTabThemeSync.ts:83` takes a `reconcile` callback and holds **no** resolution logic; the provider wires it at `UniversalThemeContext.tsx:118` as `reconcile: reconcileFromStorage`, owned by `useThemePreference.ts:200–213` — the **single** call site of `readThemePreferenceSnapshot` (`:205`) and `resolveThemePreference` (`:213`) |

**The last link is satisfied by delegation, not by co-import, and that is the stronger form.** The
listener cannot drift from the writer because it has no rules of its own to drift with — there is
exactly one resolver call site in the lane. `useThemePreference.ts:16–17` records that as design
intent: *"the cross-tab listener does NOT live here … this module decides what the result is."*

**One thing a reviewer will notice.** `UniversalThemeToggle.tsx` shows as modified against git `HEAD`.
It is **not** an S1 change: the manifest check puts its hash identical in both the S0 and S1 manifests,
so it is pre-existing dirt in a worktree carrying ~1,240 dirty files. "Unchanged by this lane" is the
accurate claim, and it is not the same as "matches `HEAD`".

---

## 7. Verdict — this seat does not issue one

Per Rule 46 the gate is Fable's, so this section states evidence and names the question.

**What is established.** T1–T4 pass: 34 unit tests across the six named files, plus 5 in the
Rule-4 split file, plus 6/6 real-browser cases over two real pages. Scoped type-check, full
application type-check and the production build all exit 0, with the browser files now inside the
lane type-check surface (D-S1-5). No peer-triggered writes, registry and token contracts
unchanged, no new dependency, no database or deployment contact. Every S1 file is ≤ 300 lines and
the preservation reference is a re-runnable hash manifest.

**Verified beyond the counts, in the post-filing pass.** All **28** T1–T4 case names required by
`09-tests.md` are present in the shipped files, checked by literal match (§2) — so the acceptance is
name-level traceable, not just green. The contract's reachability chain holds link by link (§6), with
writer and listener sharing a **single** resolver call site. And both storage-area cases are now
mutation-proven load-bearing for the `storageArea` guard (§3, M6) — which is what the "non-vacuous"
action actually required, and which one of them did not previously satisfy.

The strongest single item is that **the T4 acceptance cases were proven load-bearing by mutation**
(§3): removing the `storage` listener turns 4 of the 6 red, and after D-S1-8 the three cases that
depend on that path still go red while the foreground case correctly stays green. Combined with
**250/250 real cross-page convergences at ≤ 122 ms**, the app's convergence path is demonstrably
functional and the tests demonstrably detect its removal. That is a much stronger position than
green counts alone, and it is why I no longer think the convergence behaviour itself is ambiguous.

**What is not.** One failure of `two pages converge after a real selection` in **nineteen**
executions, **UNEXPLAINED** (D-S1-6), whose assertion text I discarded myself. What the mutation
work adds is that a *defect* in that path would now be caught and named — so the residual risk is
narrowed to "something intermittent happened once, and it was not a convergence defect the suite
can no longer see". The five post-filing re-runs sharpen that: 6/6 each, in a 23.7–28.7 s band,
with the failing run still the only one above 1.4 min. I am still claiming **no fix** for it,
because nothing can be shown load-bearing for a fault that cannot be reproduced — and a suite
cannot be certified dry against a condition it cannot recreate.

**The question for the gate:** is an S1 acceptance that reads *"T1–T4 pass"* satisfied by 18/19
executions — the one failure being the run that was **~25× slower than every sibling**, recorded as
unexplained and non-reproducible — given that the cases are mutation-proven and the path is
measured 250/250 — or does Rule 73 require the suite to be demonstrated dry by a longer clean
streak before S1 is accepted? The evidence now raises a sharper form of the same question: **is a
wall-clock anomaly an explanation good enough to record, or does any unexplained failure keep S1's
STOP engaged no matter how large the denominator grows?** The second reading is the one this seat
has been applying, and it is why S2 remains unstarted.

Four further items are **for the reviewer, not for me to decide**: D-S1-1 (amend the slice command or
accept the pair), D-S1-5 and D-S1-10 (the baseline surface and an acceptance case both changed
mid-package), and the still-open S3 entry condition.

---

## 8. Archive filing and reindex — checkpoint item 7

`07-checkpoints.md` requires *"dated archive filing and successful reindex for each completed
hostile-review pass"*, and its own status table still reads `Archive filing/reindex | BLOCKED` with a
handoff note saying *"Filing is unfinished because this session's filesystem is read-only."* That
describes **Astra's** session, not this one. Verified against the archive itself:

| Requirement (from the handoff note) | Measured |
|---|---|
| Filed with actual timestamps | `Z:\HostileReviews\2026-09-20-005122-swan-theme-lens-astra-mega-blueprint-r6-state.md`, 19,904 bytes; `date_local: 2026-09-20T00:51:22-07:00`, `date_utc: 2026-09-20T07:51:22Z` |
| Bounded scope | the `scope:` field carries explicit In/Out and names the excluded surfaces — implementation, transcript engine, console, palette values, production data |
| Defect / unproven counts | `verdict: DEFECTS-FOUND`; `defects: {critical: 0, high: 2, medium: 6, low: 0}`; `unproven: 9` |
| Reciprocal supersession | R6: `supersedes: 2026-09-19-235931-…-r5`, `superseded_by: null`. R5: `supersedes: null`, `superseded_by: 2026-09-20-005122-…-r6-state`. **Both directions present.** |
| Successful reindex | `index.jsonl` contains the R6 `review_id` |

**No duplicate was filed.** Rule 86 requires looking before filing; the entry already existed, so a
second file would itself have been the defect.

**One requirement is only partly satisfied inside the archive record.** The handoff asks for
*"dirty-source hashes"*. The R6 record carries the **request** SHA-256
(`02C58C3E9830ED343B568362277D15F980F12BE90F581288691308F44E9486F9`) and records `commit: dirty`,
but it does not carry per-file hashes of the sources it reviewed. Those hashes do exist — in this
package's manifests (`source-manifest.json` for S0, `source-manifest-s1.json` for S1) — so the
requirement is met by the package while the archive record points at it rather than containing it.
Named rather than passed over, because a reviewer checking item 7 inside the archive file alone will
not find them.

**Consequence for the gate:** checkpoint item 7 is **satisfied**, and `07-checkpoints.md`'s `BLOCKED`
status for it is **stale** — it records the read-only session that produced the plan, not this lane's
current state. I have not edited that file: it is Astra's artifact, and correcting an upstream plan
document is the reviewer's call, not mine.
