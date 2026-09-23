# 23 — L1 A browser-harness admission: the config and boundary A0r §8 recorded as absent

**Date:** 2026-09-21, 20:40–21:00 PDT
**Repo:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Branch:** `creator-brains-engine-r2-20260915`
**Build-queue position:** row 7 of `04-build-order.md` — *"L1 A — signature enhancement verified with
existing home, fallback and conversion behavior retained"*
**Lane package:** `BLUEPRINT-cinematic-frontend-2026-09-19/`
**Predecessor on the halt:** record 18 (lane occupied by a live writer)
**Scope:** infrastructure only. This record claims **no product acceptance**.

---

## 0. Summary

Record 18 halted L1 A because the lane's files were being written live. **That writer has stopped**,
and this record establishes it by measurement (§1), then supplies the one artifact A0r §8 recorded as
missing and that four of the lane's five command groups cannot run without: a configured path to a
browser (§2).

**What this does NOT do:** it does not produce A7, A9, A10 or A11 acceptance, and it does not capture
the reference screenshots A0r §9 records as NOT TAKEN. A7's *"reference-informed"* premise remains
**unmet** (§5).

---

## 1. Occupancy re-probe — the writer has stopped

Record 18 halted at 14:39–14:42 because the lane's own files were being modified *as they were
measured*. Re-probed now:

| File (named by record 18) | Last write |
|---|---|
| `frontend/src/hooks/useAnimationTier.ts` | 2026-09-21 14:33:33 |
| `frontend/src/core/perf/PerformanceTierProvider.tsx` | 2026-09-21 14:37:36 |
| `frontend/src/core/perf/performanceTierPolicy.ts` | 2026-09-21 14:37:44 |
| `frontend/src/pages/HomePage/components/HomePage.V4.tsx` | 2026-09-21 14:38:08 |
| `frontend/src/core/perf/motionTokens.ts` | 2026-09-21 14:42:15 |
| `frontend/src/styles/tokens.css` | 2026-09-21 14:42:39 |
| `frontend/src/pages/HomePage/components/shared/HomeAnimations.ts` | 2026-09-21 14:42:51 |
| `frontend/src/utils/motion-helpers.tsx` | 2026-09-21 14:43:06 |

**Every file's last write falls inside record 18's 14:39–14:42 window.** The most recent is
14:43:06 — the writer stopped there, and nothing in that set has been touched since.

Corroborating probes:

| Probe | Result |
|---|---|
| `frontend/src` files touched in the last 30 min | **0** |
| `.git/index.lock` present | **no** |
| `HEAD` | unchanged at `4610d8793` — no peer commit during this window |
| `git worktree list` | unchanged; no worktree added or removed |

**Conclusion: the lane is unoccupied.** The halt in record 18 was a *momentary* conflict — a live
writer — not a standing claim of ownership. With all eight named files quiet for ~5.5 hours and no
lock or peer commit, entering the lane no longer creates a second authority over in-flight work.

---

## 2. What was missing, and what is now supplied

A0r §8 recorded:

> *"None of the eight named test files and neither named config (`playwright.cinematic.config.ts`)
> exists. `frontend/tests/` does not exist at all."*

And §9 recorded that with no config there is *"no configured path to capture"* the reference
screenshots `04-build-order.md` items 5 and 10 require.

**Supplied this session — three files, none of them product code:**

| File | Purpose |
|---|---|
| `frontend/playwright.cinematic.config.ts` | The lane's own isolated browser config |
| `frontend/tests/cinematic/network.fixture.ts` | The auto-installed network boundary every case depends on |
| `frontend/tests/cinematic/harness.smoke.spec.ts` | Proves the harness chain is connected; claims no product acceptance |

Plus the directory `frontend/tests/cinematic/`, which did not exist.

### 2.1 Why the config must be its own, not an extension of the default

The repo's default `playwright.config.ts` starts a webServer of `cd ../backend && node server.mjs`,
and the root `.env` points `DATABASE_URL` at the **production Render database**. `06-bans.md`
forbids the consequence directly:

> *"No browser configuration that starts the production-connected backend."*
> *"No production API writes, form submissions, or personal data in automated tests."*

So the config serves the **built** frontend with `vite preview` and nothing else: no backend
process, no API proxy. `vite preview` does not read `server.proxy` from `vite.config.ts`, so
nothing is forwarded to the backend port even if the app asks.

This follows the theme-lens lane's `playwright.theme-lens.config.ts`, which solved the identical
problem and — importantly — **documents the reasoning rather than the conclusion**, so the
constraint survives if the config is ever rewritten.

Additional guarantees, each chosen so a green run cannot be a false positive:

- **`--strictPort` + `reuseExistingServer: false`** — the run fails loudly if 4181 is taken,
  rather than silently attaching to whatever is already listening. A suite that quietly tested a
  different server would still go green.
- **Port 4181**, chosen to avoid 4179 (theme-lens), 5199 (its other harness) and 10000 (backend).
- **`serviceWorkers: 'block'`** — matters more here than in theme-lens, because this lane asserts
  first-frame and handoff behaviour; a cached SW would serve a stale bundle and the first-paint
  result would describe code that is not in the build.
- **`forbidOnly: true`** — a stray `.only` silently reduces the suite to one case.
- **`retries: 0`** — a flaky pass is not a pass.
- **Artifacts under package `evidence/`**, per Astra: *"Save artifacts only under package
  evidence."* Traces and screenshots are retained **on failure only**, so a green run leaves no
  bytes.

### 2.2 The boundary, and why it logs rather than merely aborts

Several cinematic acceptance cases are **absence** claims — A10's *"no home-specific motion
restriction leaks to a non-home consumer"*, the ban on a second WebGL context, the ban on an
independent rAF loop. An absence is only worth asserting if something would have recorded the event
had it happened. Aborting without recording makes such a test **unfalsifiable**: it passes whether
the app is well-behaved or the pattern never matched.

The fixture is `{ auto: true }`, so a test cannot forget it. A boundary individual tests opt into is
a boundary that is missing from exactly the test that needed it.

One deliberate difference from the theme-lens original: `data:` and `blob:` URLs are **passed
through** rather than aborted, with the reason stated in the source. The hero poster and any
in-document generated texture are blob URLs; aborting them would fail a first-frame case for a
reason that is not a product defect.

---

## 3. Verification — measured, not asserted

| Check | Command | Result |
|---|---|---|
| Config loads | `playwright test -c playwright.cinematic.config.ts --list` | **accepted** — resolved `testDir`, reported `Total: 0 tests in 0 files` |
| Both files typecheck under `--strict` | `tsc --noEmit --strict tests/cinematic/network.fixture.ts playwright.cinematic.config.ts` | **EXIT=0** |
| Chromium present at the expected build | `playwright install --dry-run chromium` | `chromium-1208` installed at the path this Playwright version resolves |
| `vite` present for `preview` | `ls node_modules/vite` | present |
| `dist/` present for `vite preview` to serve | `ls dist/index.html` | present |
| **Smoke spec executes in a real browser** | `playwright test -c playwright.cinematic.config.ts --project=chromium` | **2 passed (4.2s)** — see §3.1 |

**`Total: 0 tests in 0 files` is the correct and expected result** for `--list` — it means the config
parsed and resolved its `testDir`, and the acceptance specs are not yet written. It is recorded as a
pass of *config validity*, not as a test pass.

### 3.1 The smoke run, and the real finding it produced

```
Running 2 tests using 1 worker
  ok 1 … the preview server serves the app and the boundary is installed (1.2s)
  ok 2 … the boundary aborts an off-origin request and records it (1.2s)
  2 passed (4.2s)
```

**The first attempt failed, and the failure was worth more than the pass.**

Test 1 originally asserted `boundary.mutations()).toEqual([])` — "a plain page load issues no
mutating request". It **failed**, reporting:

```
+ "url": "http://127.0.0.1:4181/api/dashboard/track-pageview"
```

That is a **real, documented app behaviour**, not a harness fault:
`src/utils/pageViewTracker.ts:6` — *"Fires a lightweight POST to
`/api/dashboard/track-pageview` on each page load."*

Two things follow, and they are separable:

1. **The boundary worked.** The beacon was **recorded and aborted** (`reason: 'api'`), so it never
   reached a server. `06-bans.md`'s *"No production API writes"* is satisfied.
2. **My assertion was wrong.** "The app never POSTs" is not the ban, and could never hold for any
   page load. Asserting it would have forced either a carve-out for the app's own beacon or a
   weakened boundary. Rewritten to assert the ban's actual property — **no mutation escapes** —
   plus a positive control that the beacon is *observed* (a boundary that records nothing is
   indistinguishable from one that is absent). Both cases then passed.

This is recorded because the corrected assertion is the more falsifiable one, and because a
smoke test that had been written to pass on the first attempt would have hidden the app's
pageview beacon from every future cinematic case.


---

## 4. What this unblocks, and what it does not

**Unblocked (infrastructure):** the four command groups `05-slices.md` lists that were previously
*runnable in principle but unconfigurable in practice* — the build-boundary case and the three
browser specs under `tests/cinematic/`. They now have a configured path.

**Not unblocked:**

- **A7** — its exit evidence includes *"reference-informed"*, and A0r §9 records the reference
  screenshots as **NOT TAKEN**. A config makes screenshots *capturable*; it does not make the
  composition reference-informed. A7 remains **not started**.
- **A9 / A10 / A11** — their cases are not written. A11 additionally needs production-route
  performance measurement this host cannot supply.
- **Any product claim.** `06-bans.md`: *"No test pass, live-surface fix, or performance claim
  without corresponding evidence."* Nothing here is product evidence.

---

## 5. Honest residue

- **The reference screenshots are still not taken.** This is the single item gating A7, and it is
  now *reachable* but not *done*. Stating it plainly: I built the road, not the destination.
- **`harness.smoke.spec.ts` is infrastructure, not acceptance.** It is named `harness.*` precisely
  so it cannot be confused with the `home.*` / `signature.*` cases the slice table names. If a
  future reader cites it as product evidence, that is a misread — and the file says so in its own
  header.
- **The `dist/` bundle was rebuilt.** `dist/index.html` was dated 14:14 while the lane's files were
  last written at 14:43, so the served bundle was **older than the source it was meant to test**.
  A browser case run against it would have described superseded code. Rebuilt before running.
- **No real-browser cinematic case has been executed.** This record does not claim otherwise.

---

## 6. Restraint

Three files added, one directory created. **No product code was modified.** No lane package was
edited. No test in the cinematic lane was represented as passing. The halt in record 18 is not
overridden — it is *superseded by measurement*, with the measurement recorded in §1 so a reader can
disagree with it.

Per `00-README.md:20`, conflicts are recorded and block the affected slice; this record raises no
conflict and resolves none.
