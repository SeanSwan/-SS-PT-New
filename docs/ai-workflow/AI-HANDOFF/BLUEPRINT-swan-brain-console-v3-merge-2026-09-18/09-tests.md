# 09 — Test plan

Mega Blueprint adds this document because the Forge keeps acceptance criteria inside
`05-slices.md`, and tests are an artifact in their own right. This file names **every test
file, every case, the exact command, and what each case proves** — and, just as importantly,
the cases that **do not exist yet** and the ones whose green is weaker than it looks.

---

## 0. The one command

```bash
npm run verify          # → node scripts/swan-brain-console/verify-all.mjs
```

`verify-all.mjs` is the single local gate. It exists because round 3 found that every green
number depended on a human remembering six invocations and a server incantation — *"a guard
you have to assemble by hand is a guard that quietly stops running"* (`verify-all.mjs:8-10`).

It runs five stages, **all of which always execute**, and prints a full summary at the end:

| # | Stage | Command it runs (cwd) | Measured 2026-09-19 |
|---|---|---|---|
| 1 | Type check (project) | `node node_modules/typescript/bin/tsc --noEmit` (`frontend/`, `NODE_OPTIONS=--max-old-space-size=14336`) | **NOT RUN by me — UNVERIFIED** (see §5) |
| 2 | Fleet + runtime contracts | `node node_modules/vitest/vitest.mjs run src/pages/HomePage/three-worlds/__tests__/` (`frontend/`) | **74 passed (74)** ✅ |
| 3 | Engine + server contracts | `node --test scripts/swan-brain-console/{engine,server}-contract.test.mjs` (repo) | **18 pass / 0 fail** ✅ |
| 4 | Gallery verification | `node scripts/swan-brain-console/gallery-verify.mjs` (repo; needs the Vite harness up) | **110/110 checks passed** ✅ |
| 5 | Console verification | `node scripts/swan-brain-console/console-verify.mjs` (repo; needs the console server up) | **17/17 checks passed** ✅ |

> **Correction (round 2, 2026-09-19).** This document previously described the gate as
> *"fail-fast"*. It is not, and never was: `run()` returns a status that `main()` never
> inspects, so every stage always executes. The behaviour is deliberate — one run should
> show every failure, not just the first — so the **sentence** was corrected, not the code.
> Falsified by Astra (gpt-6-astra), which is exactly the kind of false sentence a green
> suite does nothing to catch.

Stages 4 and 5 boot their own servers as direct `node` processes and kill them in a `finally`
block (`verify-all.mjs:86-118`), so the gate is clean on Windows and CI alike.

**Total executed and green: 219 checks** (74 + 18 + 110 + 17), on the tree as it stands.

### Running the browser gates by hand (they take a base URL)

Both verifiers accept an override as `argv[2]`, which is how you run them without the wrapper:

```bash
# stage 4 — the harness must be up first
cd frontend && node node_modules/vite/bin/vite.js --port 5299 --strictPort
# then, from the repo root:
node scripts/swan-brain-console/gallery-verify.mjs http://127.0.0.1:5299/qa-worlds.html

# stage 5
node scripts/swan-brain-console/server.mjs --port 4599
node scripts/swan-brain-console/console-verify.mjs http://127.0.0.1:4599/
```

**Two environment traps, measured — read before you conclude a stage is broken.**

1. **Port 5199 is shared with the theme-lens workstream.** `verify-all.mjs` hardcodes
   `http://127.0.0.1:5199/qa-worlds.html` (`:91`) and its `waitFor` accepts any `res.ok`
   (`:58`). A Vite dev server for a *different* app on that port answers **200** for
   `/qa-worlds.html` (measured: it serves a page titled `Theme Lens Harness`, while the real
   harness is `Three.js fleet QA harness`). Reachability is not identity. Use a free port and
   pass the URL explicitly, as above.
2. **The safe-delete shim blocks Vite's cache clear.** Vite force-re-optimises and tries to
   `rm` `frontend/node_modules/.vite/deps` (130 entries); the shim's bulk-delete guard refuses
   anything over 50 and the server exits with `SAFE_DELETE_BULK_CONFIRM_REQUIRED`. Move the
   directory aside instead of deleting it (`mv .vite/deps .vite/deps.bak-<date>`); Vite then
   rebuilds it fresh.

---

## 1. `frontend/src/pages/HomePage/three-worlds/__tests__/fleet.contract.test.ts`

**17 tests.** Proves the *fleet is structurally what it claims*: twenty variants, real
geometry, unique divergence, a clean copy pack. It cannot prove a single pixel reaches the
screen — that is stage 4's job.

| Case | Proves |
|---|---|
| `T3 fleet registry › exposes exactly 20 parked variants` | The fleet size is 20, not "about 20". |
| `T3 › gives every variant a non-empty tradeoff (R10)` | Every candidate states what it costs, so comparison is possible. |
| `T4 real three usage › resolves every variant to a scene family that builds real geometry` | Each variant maps to a family that constructs actual geometry — not a stub. |
| `T4 › ships a real component file per variant that mounts the shared world` | A file exists per variant and mounts the shared runtime; no orphan registry rows. |
| `T4 › gives every variant a distinct scene family signature` | Families are not duplicated under different names. |
| `T5 skeleton divergence › carries a complete skeleton contract for all 20` | Every variant declares nav model, hero mechanics and grid — no blanks. |
| `T5 › has no duplicate nav_model + hero_mechanics + grid tuple (config uniqueness only)` | **The hard gate.** `findCollisions()` must return empty. The parenthetical is deliberate: this proves *configuration* uniqueness, **not visual distinctness**. |
| `T5 › carries exactly one alien wildcard` | The deliberate outlier stays singular — a second one would stop being an outlier. |
| `T7 anti-slop copy gate › contains zero banned phrases across the copy pack` | No banned phrasing ships in any variant's copy. |
| `T7 › catches stem inflections of banned slop verbs` | The gate is not a naive substring match — `delve`/`delveing` are both caught (the e-drop fix). |
| `T7 › catches unhyphenated variants of hyphenated intensifiers` | Spacing evasion does not defeat the gate. |
| `T7 › bans the credentials-claim vocabulary by house rule` | House rule, not a general style preference — asserted separately so it cannot be dropped silently. |
| `T7 › does not let the new classes catch honest protocol references` | **The must-not-fire case.** A gate that flags honest technical prose trains people to ignore it. |
| `T7 › writes every headline, sub and CTA label as a finished literal` | Copy is authored, not templated at runtime. |
| `T6 canonical isolation › never lets a route import the parked registry` | Parked candidates cannot leak into a shipped route. |
| `T6 › keeps HomePage.V4 as the mounted homepage` | The live homepage is pinned, so parking 20 variants cannot change what users see. |
| `rule 4 line cap › keeps every new variant file at or under 300 lines` | Rule 4 (300 lines/module) is enforced mechanically, not by review. |

---

## 2. `frontend/src/pages/HomePage/three-worlds/__tests__/runtime.contract.test.ts`

**57 tests** (49 original + 8 added in round 2). The largest suite, and the one that carries this workstream's *history*: most
cases are named after a defect that actually shipped. Grouped by the invariant they defend.

### 2a. Context-loss policy — *"telemetry must not report health on a corpse"* (6)

| Case | Proves |
|---|---|
| `starts healthy with no losses` | Baseline: no false alarm on a clean boot. |
| `reports lost, and asks to stop, on the first loss` | The **first** loss is surfaced, not swallowed. Gating the poster on the second left a frozen canvas while telemetry claimed health. |
| `reports recovered once a restore follows` | Recovery is reported, so a transient loss does not permanently condemn a world. |
| `reports LOST again on a loss AFTER a successful restore` | The policy is not one-shot; a second loss is still a loss. |
| `ignores a late restore once it has given up, so the verdict cannot flap` | Terminal state is terminal — the verdict cannot oscillate. |
| `keeps instances independent` | Two worlds' policies do not share state. |

### 2b. `resolveMotion` — *"a user who asked for less motion never gets a loop"* (4)

| Case | Proves |
|---|---|
| `returns poster whenever prefers-reduced-motion is set, at EVERY tier` | The a11y floor is absolute; a capable device does not override the user's request. |
| `returns poster on the essential tier even without a reduced-motion request` | Weak hardware gets the static poster rather than a broken canvas. |
| `returns poster when WebGL is unavailable, rather than mounting a broken canvas` | Absent WebGL degrades; it does not throw. |
| `returns live only when every gate passes` | `live` is the strict conjunction, so no single satisfied gate can force it. |

### 2c. Colour handling (10)

| Case | Proves |
|---|---|
| `hasWebGL › returns a boolean and never throws` | The capability probe is safe in a non-DOM environment. |
| `isColorLike › accepts real hex forms, including 4- and 8-digit alpha` | Alpha hex is not rejected as malformed. |
| `isColorLike › accepts legacy comma rgb()/hsl()` | Legacy syntax Three parses deterministically is accepted. |
| `isColorLike › accepts modern space-separated syntax, because CSS accepts it` | The validator tracks CSS, not a personal preference. |
| `isColorLike › accepts named colours Three does not know, via the browser parse` | Validation defers to the browser where Three is narrower. |
| `isColorLike › rejects blanks and nonsense` | The function is not a rubber stamp. |
| `toColor › returns the fallback for a CSS-wide keyword instead of white` | **The silent-whitening bug.** `initial`/`inherit` must not become white. |
| `toColor › returns the fallback for nonsense instead of white` | Same class, second input shape. |
| `toColor › NORMALIZES modern syntax rather than falling back or whitening` | Valid-but-unusual input is *converted*, not discarded. |
| `toColor › NORMALIZES a named colour Three cannot parse` / `honours a valid value over the fallback` | Normalisation is real, and the fallback is genuinely last-resort. |

### 2d. Scroll progress — the 15% bug and the Fable regression (12)

The densest cluster, because this is where two shipped regressions lived.

| Case | Proves |
|---|---|
| `scrollProgressFor › produces intermediate values across a SHORT host (the regression)` | The original bug: progress was effectively binary on short hosts. |
| `starts at ZERO on load, for hosts both taller and shorter than the viewport` | A hero opens on its authored pose. |
| `is still zero while the host sits below the fold` | No scrubbing before the reader arrives. |
| `ramps monotonically to 1 as the host travels up, and stays there` | No reversal, no overshoot. |
| `does NOT finish in the first fraction of a viewport (the 15% bug)` | Named after the defect: the animation used to complete in the first 15% of travel. |
| `spreads a taller hero across its own height, taking a full transit to finish` | Tall hosts scale correctly. |
| `clamps to 0..1 and never returns NaN for degenerate boxes` | Zero-area and inverted boxes cannot produce NaN. |
| `travel anchor › is 0 on entry at the viewport bottom and 1 at full exit` | The anchor's endpoints are exact. |
| `travel anchor › is genuinely positive while the band is fully on screen (the Fable regression)` | Named after the review that found it. |
| `travel anchor › monotonically spans the whole readable life, then clamps` | Full transit, monotone, clamped. |
| `travel anchor › leaves the load anchor untouched` | The fix for travel did not alter the served hero's pose. |
| `scrollAnchorFor › classifies a host at the document top as load-anchored` / `…anything genuinely below the first fold as travel-anchored` / `never returns NaN-bearing output for garbage input` | The classifier's three cases, including garbage. |

### 2e. Input, tokens, and the slot pool (5)

| Case | Proves |
|---|---|
| `pointerFor › maps the box centre to (0,0) and corners to +/-1` | Pointer normalisation is correct. |
| `pointerFor › does not divide by zero for a zero-area box` | Degenerate box is finite. |
| `tokenCssVars › carries every TOKEN_FALLBACKS entry verbatim` | **The static literal cannot drift from the token table.** |
| `tokenCssVars › declares the styled-layer house aliases` | The styled-components aliases exist. |
| `renderSlots › caps acquisitions at MAX_LIVE_WORLDS and refuses beyond it` | The context budget is a real pool. |
| `renderSlots › hands a released slot to a waiter (the hand-off primitive)` | The hand-off *primitive* works. |
| `renderSlots › never counts below zero and unsubscribes cleanly` | `inUse` cannot go negative; listeners are removed. |

### 2f. Torn-down telemetry and the QA predicate (8 — added round 2, 2026-09-19)

These guard the fix for the defect the browser verifier caught (§5.2): a handed-off world
kept advertising `frames=132` and `running=yes` with no canvas in the DOM.

| Case | Proves |
|---|---|
| `publishTornDown › clears the four context-liveness signals` | `frames`/`running`/`drawCalls`/`primitives` are zeroed on teardown, so a dead world stops advertising a context. |
| `publishTornDown › does NOT erase contextLosses — cumulative history, not a claim about a context` | The fix is scoped: it must not destroy the card's loss history. **This is the must-not-fire case.** |
| `publishTornDown › leaves onScreen and tabVisible to the observers that own them` | The teardown path does not overreach into attributes another subsystem owns. |
| `isPresenting › is true for a running loop drawing real primitives` | Baseline. |
| `isPresenting › is false for a running loop with a LOST context — that loop draws nothing` | The predicate's whole reason for existing. |
| `isPresenting › is false for a torn-down world, which is exactly what publishTornDown produces` | The two functions compose: teardown output satisfies the predicate's negative case. |
| `isPresenting › accepts a Lines/Points scene that draws 0 triangles but real primitives` | Pins the lines+points fix — a triangles-only test failed 6 of 20 variants that rendered fine. |
| `isPresenting › is false when nothing was drawn at all` | A loop with zero draws is a black rectangle. |

---

## 3. `scripts/swan-brain-console/engine-contract.test.mjs`

**12 tests** (`node --test`, dependency-free, 2 suites). Proves the console **reports the
engine honestly** — the three-state verdict, and that the verdict is *derived* rather than
asserted.

| Case | Proves |
|---|---|
| `reports the gate as DECLARED, never as a bare verified BLOCKED` | The bare word `BLOCKED` is never emitted. `VERIFIED_BLOCKED` would claim a probe that does not exist. |
| `exposes no write control whatsoever` | `writeControls: []` is real, not decorative. |
| `states a real gate reason rather than a placeholder` | No `TODO`/`lorem` in the operator-facing reason. |
| `quotes the matched clause as evidence, not just a verdict` | The operator can audit the basis of the verdict. |
| `quotes the engine README instead of paraphrasing it` | Paraphrase is how a negation gets lost. |
| `reports real counts read at call time, not transcribed constants` | Counts are read, so they cannot go stale. |
| `the engine really is present, so the verdict means gated and not merely missing` | `DECLARED_BLOCKED` ≠ "file not found". |
| `R7 — the verdict is derived, not asserted › reports DECLARED_BLOCKED when the README declares the gate` | Positive case. |
| `… › reports UNKNOWN when the README NEGATES the gate` | **The negation guard.** A README saying *"must no longer remain fail-closed"* contains the declaration phrase and asserts the opposite. |
| `… › reports UNKNOWN — never a false all-clear — when the declaration is gone` | Absence of a declaration is not a declaration of absence. |
| `… › reports UNKNOWN when the README is absent entirely` | Missing file is UNKNOWN, not BLOCKED and not clear. |
| `… › the real repo currently declares the gate (guards against silent drift)` | Pins the live repo so a README edit cannot quietly change the verdict. |

---

## 3b. `scripts/swan-brain-console/server-contract.test.mjs` (NEW — round 2)

**6 tests** (`node --test`). Talks to a real server over a raw socket, because the claim
under test is about *ordering* and cannot be checked by calling a function.

| Case | Proves |
|---|---|
| `THE ORDERING TEST: a bad Host AND a malformed target returns 403, not 400` | **The decisive case.** If the URL is parsed before the Host check, this pair can only yield 400 or a hang. 403 is reachable *only* if the Host allowlist is genuinely first — which is what `server.mjs` claimed and did not do. |
| `a well-formed request with a bad Host is refused` | The DNS-rebinding guard still works. |
| `a malformed target with an ALLOWED Host is a bounded 400, not a hang` | The parse failure is caught, so the async handler cannot reject and leave the request unanswered. |
| `a malformed target does not echo the attacker-controlled target back` | The 400 body does not reflect request-controlled input. |
| `an allowed Host on a real route still works` | The fix did not break the happy path. |
| `a non-GET method is still refused on an allowed Host` | Read-only-ness is unaffected. |

---

## 4. Browser gates

### 4a. `scripts/swan-brain-console/gallery-verify.mjs` — **110 checks**

Proves all 20 variants **actually render**, in isolation per variant, plus the pool behaviour
on the all-20 page. The honest signal is the runtime's presented-frame counter; `readPixels`
is deliberately not used, because under software rendering the back buffer is undefined after
compositing and reports pure black for scenes that are visibly drawing (`:24-26`).

Per variant (× 20): animating with real draws · layout overlap guard · token mutation reaches
the scene · house-rule text contrast · house-rule 44px controls. Then the page-level checks:

| Check | Proves |
|---|---|
| `fleet: all 20 render distinctly` | 20/20 unique screenshot digests — not merely 20 non-blank canvases. |
| `layout: 20 cards coexist on one page` | All 20 are in the DOM together. |
| `layout: every card shows a canvas or its poster` | No blank card. |
| `layout: all 20 divergence tuples are unique on screen` | The *rendered* page agrees with the registry's uniqueness claim. |
| `context budget: live worlds stay under the cap` | Measured at scroll 0: `4 live / cap 4`. |
| `context budget: DOM canvas count equals live worlds` | `4 canvases == 4 live` — a canvas without a slot is a dead context waiting to be evicted. |
| `context budget: slots hand off to newly visible worlds` | The round-4 finding: the receipt *claimed* hand-off since round 3 and nothing implemented it. |
| `context budget: a torn-down world reports no live context` | **Added round 2, and it went RED before the fix** — `FAIL … 4/16 torn-down worlds still advertise a context: v01(frames=132, running=true)…`, 108/110. After the fix: `PASS … 16 torn-down worlds all report frames=0, running=no`, 110/110. Fails when the dead set is empty, so it cannot pass vacuously. |
| `v01` / `v18`: `reduced-motion freezes to the poster` | The a11y floor honoured **by the browser**, end to end: `motion=poster, 0 canvases, 0 frames`. |

### 4b. `scripts/swan-brain-console/console-verify.mjs` — **17 checks**

Drives real Chromium against the running server, because the console's job is to be a surface
a human reads — asserting a function returns HTML would not catch a tab unreachable by
keyboard, a panel that overlaps at 375px, or JS that throws on boot.

`boot: no console errors` · `boot: title` · `engine: status reads BLOCKED` · `engine: no write
control anywhere` · `fleet: 20 rows rendered` · `fleet: zero fingerprint collisions` ·
`a11y: arrow keys traverse all 8 tabs in order` · `a11y: every tab reveals its panel` ·
`a11y: every control >= 44px tall` · `responsive phone-320/375/414 · tablet-768 · laptop-1280
· qhd-2560: no h-overflow` (6) · `copy: 20 copy entries rendered` · `copy: no banned phrases
visible`.

---

## 5. What green does NOT prove — the honest limits

Recorded here so a later reader does not mistake a passing suite for a broader guarantee.

1. **The project-wide `tsc --noEmit` stage is UNVERIFIED by me.** I ran the *lane-scoped*
   `tsc -p tsconfig.three-worlds.json --noEmit` and it exited **0** with no output. The
   project-wide variant needs a 14 GB heap (`verify-all.mjs:70`) and pulls in
   `components/Header/**`, which is why the scoped config exists. A green lane is not a green
   project.
2. **The hand-off assertion's `frames` term was weaker than it read — FIXED round 2, RED then GREEN.**
   It fails only if a live world has `frames <= 2` (`gallery-verify.mjs:440`). `framesRef` was
   created once at hook scope and the only write fleet-wide was an increment — **never reset** —
   so the counter was cumulative *per card*, not per context. Worse, teardown only *cancelled*
   the diagnostics timer, so the last snapshot **froze on the element**: a handed-off world
   reported `frames=132` and `running=yes` while holding no canvas. Measured reproducibly over
   three runs. Fixed in `teardown.ts` (reset the counter, publish the honest torn-down state);
   guarded by `gallery-verify`'s new check, which was **observed RED at 108/110 before the fix
   and GREEN at 110/110 after**. The residual limit is honest: on today's page the two live sets
   are disjoint, so the original `frames <= 2` term would still not have caught a broken
   *rebuild* — the new check catches the *stale-telemetry* form of the defect, which is the one
   that was live.
3. **`isPresenting()` was dead code and is now only tested, not wired.** `diagnostics.ts:164` is
   documented as *"The single predicate QA should branch on"*, and it is still referenced nowhere
   outside its own module (verified across the whole frontend). Round 2 added unit coverage for
   it, which closes the "untested predicate" gap but **not** the "nothing branches on it" gap:
   `gallery-verify.mjs` still hand-rolls its own term. Wiring it is a design choice for the
   builder, and the builder has not made it.
4. **The collision check could not fail — FIXED round 2.** `console-verify.mjs` read the
   fingerprint-collision card by position and asserted `cardText.includes('0')`, a substring test
   on one character. Executed falsification: the old guard reports **PASS for 10, 20 and 100
   collisions**. `app.js` now publishes the count under `data-card="collisions"` and the check
   asserts the parsed integer equals 0.
5. **The copy snapshot is not the copy-gate result.** `03-contracts.md` describes per-variant
   `findSlop` results, but `copyPack.mjs` never calls `findSlop` — it returns extracted copy, an
   import-string indicator, and a count of phrase-like source lines. Those are *inputs* to the
   gate, not its verdict. The real gate runs in `fleet.contract.test.ts` T7.
6. **"Every number is read at read time" is false for skeleton-derived counts.** `fleetData.mjs`
   imports the same module URL repeatedly, and Node caches it — two calls returned the identical
   `SKELETONS` array object. The source is canonical; the *instance* is process-scoped, so a
   skeleton edit needs a console restart.
7. **The divergence fingerprint proves configuration uniqueness only.** The case name says so
   (`config uniqueness only`). Distinct tuples are not distinct *designs*; and the screenshot
   check compares **sampled PNG-byte hashes** (`gallery-verify.mjs:131-135,330-335`), which
   establishes differing captured bytes, not perceptual distinctness.
8. **The live set is scheduler-dependent.** `gallery-verify` reported the scroll-bottom live set
   as `v05..v08`; an immediate re-run reported `v13..v16`. Both are genuinely on screen and both
   pass. The check's own comment discloses this (*"which one wins a freed slot is scheduler
   order"*), so it is disclosed rather than defective — but the *evidence line* varies run to run.
9. **`verify-all`'s readiness probe checks reachability, not identity — FIXED round 2.** See §0
   trap 1. The probe now requires a body marker; a title check alone would not distinguish a
   *stale instance of the same app*, which is a residual gap.
10. **The 44px control claim covers height only, on one panel.** `console-verify.mjs` measures
    `height >= 44` with the Fleet tab selected, and the viewport loop retains that panel. It does
    not prove width, and does not prove every panel's responsiveness.

---

## 6. Cases that must exist and do not — the RED list

Each of these should be written **and observed failing** before the corresponding fix is
called done. A guard never seen red is not a guard (`07-checkpoints.md` §4).

| # | Test to write | Where | Status |
|---|---|---|---|
| T-1 | A world with no context must report no context (frames=0, running=no) | `gallery-verify.mjs` | **DONE round 2.** `context budget: a torn-down world reports no live context`. Observed **RED at 108/110** before the fix, **GREEN at 110/110** after. Supported by 3 unit cases for `publishTornDown`. |
| T-2 | `isPresenting › is false for a running loop with a lost context` | `runtime.contract.test.ts` | **DONE round 2 — but my original claim was FALSE.** I wrote that this "fails on current code". Astra (gpt-6-astra) falsified that: the predicate *already* returned false for a lost context. Missing coverage is not defective behaviour, and I had conflated the two. The 5 cases are still worth having — the predicate is now covered — but they were never RED. |
| T-3 | The gate must refuse a server that is not the QA harness | `verify-all.mjs` / new test | **PARTLY DONE round 2.** `waitFor` now requires a body marker, so a foreign app is rejected. **Still open:** a *stale instance of the same app* would pass a marker check, so identity is proven weakly. No test asserts the refusal itself. |
| T-4 | `renderSlots › a double release cannot under-count` | `runtime.contract.test.ts` | **OPEN.** `releaseSlot()` decrements unconditionally (`renderSlots.ts:48`) with no per-world identity. No reachable double release found; latent. |
| T-5 | `verify-all › awaits its owned child processes before exiting` | `verify-all.mjs` | **OPEN.** `kill()` is called at `:99` and `:117` without awaiting termination, so a stage's server may outlive the gate. Astra (F11). |
| T-6 | `server › a malformed target is bounded even when the Host check passes` | `server-contract.test.mjs` | **DONE round 2** — covered by the 6-case server boundary suite, whose ordering case is the decisive one. |

---

## 7. Traceability

| Requirement | Test that defends it |
|---|---|
| 20 distinct compositions across 8 scene families | `fleet.contract` T3/T4/T5 (9 cases) + `gallery-verify` `all 20 render distinctly` |
| Divergence is real, not nominal | `fleet.contract` `no duplicate … tuple` + `gallery-verify` `all 20 divergence tuples are unique on screen` |
| The browser does not lose WebGL contexts | `gallery-verify` context-budget trio + `renderSlots` cap cases |
| A user who asked for less motion gets no loop | `runtime.contract` `resolveMotion` (4) + `gallery-verify` `reduced-motion freezes to the poster` |
| The console reports the engine honestly | `engine-contract` (12) + `console-verify` `engine: status reads BLOCKED` |
| The console is read-only | `engine-contract` `exposes no write control whatsoever` + `console-verify` `engine: no write control anywhere` |
| The console is usable by keyboard and at 375px | `console-verify` a11y (3) + responsive (6) |
| No banned phrasing ships | `fleet.contract` T7 (6) + `console-verify` `copy: no banned phrases visible` |
| Rule 4 (300 lines/module) | `fleet.contract` `rule 4 line cap` |

---

## 8. Verification log

Measured on the worktree `tmp/worktrees/brain-console-20260913`, 2026-09-19, not inherited.
The **round-2** column is the state after the fixes below, which is the current state.

| Gate | Command | Result |
|---|---|---|
| Lane typecheck | `tsc -p tsconfig.three-worlds.json --noEmit` (8 GB heap) | **exit 0, no output** — clean (re-run after the round-2 edits) |
| Fleet contract | vitest, `__tests__/` | **17 passed** |
| Runtime contract | vitest, `__tests__/` | **57 passed** (49 + 8 added round 2) |
| Combined vitest | vitest, `__tests__/` | **74 passed / 0 failed** (round 1: 66; pre-existing docs claim 64 — stale by +2) |
| Engine contract | `node --test engine-contract.test.mjs` | **12 pass / 0 fail** |
| Server boundary | `node --test server-contract.test.mjs` | **6 pass / 0 fail** (NEW round 2) |
| Both node contracts | `node --test engine-contract.test.mjs server-contract.test.mjs` | **18 pass / 0 fail** |
| Gallery — RED before the fix | `gallery-verify.mjs http://127.0.0.1:5299/qa-worlds.html` | **108/110 — the new check failed**, exit 1 |
| Gallery — GREEN after the fix | same | **110/110 passed, exit 0** |
| Console | `console-verify.mjs http://127.0.0.1:4599/` | **17/17 passed, exit 0**; collision card now reads `0 collisions` by value |
| Project-wide typecheck | stage 1 of `verify-all` | **NOT RUN — UNVERIFIED** |
| `npm run verify` end to end | — | **NOT RUN — UNVERIFIED** (stages 4/5 hardcode ports 5199/4599; 5199 is held by another workstream) |

### 8b. Round-2 changes to the suite

| File | Change | Why |
|---|---|---|
| `runtime.contract.test.ts` | +8 cases (`publishTornDown`, `isPresenting`) | The predicate QA is told to branch on had no coverage; the teardown path had no guard. |
| `server-contract.test.mjs` | **NEW**, 6 cases | The Host-check ordering claim was falsified; ordering cannot be tested by calling a function. |
| `gallery-verify.mjs` | +1 check, crash-safe reporting | Torn-down telemetry was false; and a mid-loop crash used to discard all collected evidence. |
| `console-verify.mjs` | collision check rewritten | The old check asserted a substring on one character and passed for 10 collisions. |
| `verify-all.mjs` | readiness probes require a body marker; server contract wired in as stage 3 | Reachability was not identity; and a test the gate does not run is a test that stops running. |
