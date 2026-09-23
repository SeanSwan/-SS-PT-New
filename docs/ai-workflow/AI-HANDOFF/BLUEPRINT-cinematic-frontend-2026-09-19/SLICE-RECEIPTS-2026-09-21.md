# A-slice receipts — 2026-09-21 execution round

**Scope of this round:** A1, A2, A3, A4, A6 — the five slices that need no
new browser infrastructure and no controller surgery. **A7, A8, A9, A10, A11 are
NOT done** and are not claimed (see "Not done, and why" below).

**Baseline:** HEAD `6e45e2392f2289f9c48e24d9c7f4dabe1f28c9a4`, branch
`creator-brains-engine-r2-20260915`.

**Mandatory prerequisite, applied to every type check below:**
`NODE_OPTIONS=--max-old-space-size=8192`. Without it this tree OOMs at the ~4 GB
default and exits 134 with **no diagnostics**, which reads as a code failure.

---

## Sean's four §12 rulings — applied

All four were ruled 2026-09-21 and are recorded as binding in
`A0r-INTAKE-RECEIPT.md` §12 (with the pre-ruling text preserved beneath a
collapsible block).

| # | Ruling | Effect on this round |
|---|---|---|
| 1 | Keep `Find a Trainer` | No copy change. The plan's `Book an orientation` recorded as a P1 drafting error. |
| 2 | Keep **both** hero CTAs | `Join the Community` → `/signup` retained. The plan's "no secondary CTA" recorded as an error. A7 applies motion restraint only. |
| 3 | Enforce Arctic Cyan DATA ONLY | `#50A0F0` must not reach an interactive role. Header logo's raw `rgba(0,217,255)` leak is in scope for A7. |
| 4 | Keep shipped `maxBacking = 1024` | A8 verifies the shipped clamp; the plan's 2048/4.19M formula is superseded. |

---

## A1 — Pure resolution with a distinct pending phase

**Created:** `src/core/perf/performanceTierPolicy.ts` (268 lines).
**Created:** `src/core/perf/performanceTierPolicy.test.ts`.

Implements `CanonicalTier`, `CapabilitySnapshot`, `CapabilityState`
(`phase: 'pending' | 'ready'`), `resolveTier`, `resolveCapability`,
`applyOverride`, `lowerTier`, and the three predicates
`mayAttemptEnhancement` / `isMotionSuppressed` / `isLatchedFailure`.

**The F05 fix is enforced structurally, not by convention.** `isLatchedFailure`
returns `false` for any `pending` state by construction, so no conforming
implementation can latch signature disablement from a pre-detection reading —
which is exactly the P1 composition Astra flagged.

**Command and result:**

```
node node_modules/vitest/vitest.mjs run src/core/perf/performanceTierPolicy.test.ts
→ 18 passed (18)
```

**Exit evidence: MET.** P1 tests pass.

---

## A2 — Stable provider subscriptions; lower-only overrides

**Rewrote:** `src/core/perf/PerformanceTierProvider.tsx`.
**Rewrote:** `src/core/perf/PerformanceTierContext.ts` (now carries
`CapabilityState`, not a bare tier).
**Rewrote:** `src/core/perf/PerformanceTierProvider.test.tsx`.

**The §6.2 fix.** The old effect had `[forceTier, tier]` in its dependency array,
so every tier change tore down and re-added the connection listener — churn
concentrated exactly when the network was unstable. The rewrite has one effect
with `[recompute]` only, subscribes to reduced-motion **and** connection once, and
re-resolves through a functional updater so it never reads stale state.

**Command and result:**

```
node node_modules/vitest/vitest.mjs run src/core/perf/PerformanceTierProvider.test.tsx
→ 13 passed (13)
```

**Mutation proof — the fix is load-bearing.** I re-injected the P1 defect
(`state.tier` back into the subscription effect's deps) and re-ran:

```
→ 3 failed | 10 passed (13)
   × one subscription survives tier changes
   × one subscription survives media-query changes
   × cleanup removes exactly the subscriptions it added
```

Then restored the fixed version and confirmed 13/13 again. **The churn tests are
not vacuous** — they detect the exact regression they claim to.

**Exit evidence: MET.** P2 tests pass; no listener accumulation.

---

## A3 — Migrate measured hook/provider consumers

**Rewrote:** `src/hooks/useAnimationTier.ts` — now reads the provider and runs
**no detector of its own** (it previously read `hardwareConcurrency` and the
reduced-motion media query independently, creating a second authority that could
disagree with the provider inside one tree).

**Rewrote:** `src/hooks/usePerformanceTier.ts` — exposes `useCapabilityState()`
(canonical, with `phase`) alongside the legacy string projection, so
`LivingConstellation` is unaffected.

**Swept 21 section components** to a shared `SectionAnimationTier` alias and
converted their comparisons (`'essential'` → `'reduced'`, `'balanced'` → `'lean'`):
12 HomePage sections + 9 About sections.

> **Scope note for the record.** The plan's *"three-file hook inventory"* counts
> the hook definition and its two direct page consumers. It does **not** count the
> 21 leaf components that *receive* `tier` as a prop and compare against the old
> literals. Widening the vocabulary therefore could not stay inside three files.
> I introduced one shared deprecated alias rather than rewrite 21 components'
> internal logic — the contract forbids calling this a section migration, and the
> alias keeps the canonical vocabulary single-sourced. **The prop-drilling pattern
> itself is untouched and remains a follow-up.**

**Type check before the sweep:** 23 errors (22 prop-drilling sites + 1 real bug I
introduced). **After:** 0.

**Commands and results:**

```
NODE_OPTIONS=--max-old-space-size=8192 node node_modules/typescript/bin/tsc --noEmit
→ EXIT=0, zero output lines   (real exit code, verified with a writable output path)

node node_modules/vitest/vitest.mjs run src/hooks/useAnimationTier.test.tsx
→ 7 passed (7)
```

**Exit evidence: MET.** P3 tests and type check pass.

---

## A4 — One motion-values module and CSS projection

**Created:** `src/core/perf/motionTokens.ts`.
**Created:** `src/core/perf/motionTokens.test.ts`.
**Fixed two duplicate authorities:**
`src/pages/HomePage/components/shared/HomeAnimations.ts` and
`src/utils/motion-helpers.tsx` now derive every duration and stagger value from
the module. **Projected** to `src/styles/tokens.css` at the established token root.

**What this actually fixed.** The same stagger token existed as **three different
values**: `0.12` in `HomeAnimations`, `0.1` in `motion-helpers`, and `0.06` in the
contract. Every shared helper duration was `0.5` where the contract specifies the
200ms response value. `motion-helpers` also had `delayChildren: 0.3` where the
contract specifies `0`.

**Command and result:**

```
node node_modules/vitest/vitest.mjs run src/core/perf/motionTokens.test.ts
→ 12 passed (12)
```

The suite reads `tokens.css` from disk and asserts each projected token appears
exactly once with the value the TypeScript authority produces — so a re-added
duplicate fails the build.

**Exit evidence: MET.** P4 tests pass; no independent duplicate values.

---

## A6 — Bounded deletion (reclassified from "cleanup")

**Removed:** `frontend/src/components/PremiumParallax/PremiumParallax.tsx`
(md5 `878f2dae471260dc3a41fb3e3cf99ca2`, 680 lines).

**R1 pre-deletion checklist — all clean, each checked separately:**

| Check | Result |
|---|---|
| Runtime importers | **0** |
| Re-exports / barrels | **0** |
| CSS URLs | **0** |
| Manifests | **0** |
| Public-path references | **0** |
| Test fixtures | **0** |

All nine import edges terminate in shared modules, so under *"a shared or
unresolved asset stays in place"* **nothing else joins the allowlist.** The
allowlist is exactly one file.

**Deletion method.** No trash CLI (`gio`, `trash-put`) exists in this
environment, so the file was **moved** to `frontend/.a6-quarantine-20260921/`
(reversible) with a README recording the provenance, and copied to
`~/a6-deleted-20260921/`. No `rm` was used on it.

**Commands and results:**

```
NODE_OPTIONS=--max-old-space-size=8192 node node_modules/typescript/bin/tsc --noEmit
→ EXIT=0, zero output lines

grep -rn "from 'gsap'" src
→ ZERO gsap imports remain
```

**No dependency cleanup was required or performed.** `gsap` was never declared in
`package.json` — it was an undeclared import in a file with no importers. A6
forbids a GSAP install and none was done.

**Exit evidence: MET.** D1 inventory and D2 type/build checks pass.

---

## Regression status

**The full suite was NOT run.** It contains **1,260 test files** and exceeded a
600s timeout. Running it is not a meaningful regression signal here.

Instead I searched for every test touching the changed surface
(`useAnimationTier`, `usePerformanceTier`, `PerformanceTierProvider`,
`motion-helpers`, `PremiumParallax`, `useTierFlags`):

```
src/core/perf/PerformanceTierProvider.test.tsx
src/core/perf/motionTokens.test.ts
src/hooks/useAnimationTier.test.tsx
```

**Only my three new files.** No pre-existing test exercised the vocabulary I
changed — which is a **coverage gap in the existing suite**, not a clean bill of
health. Recorded as an honest limitation rather than reported as a pass.

The one pre-existing test that renders an edited section
(`trainerRecruitmentLinks.contract.test.ts`) passes: 2/2.

**Combined result for this round:**

```
node node_modules/vitest/vitest.mjs run \
  src/core/perf/performanceTierPolicy.test.ts \
  src/core/perf/PerformanceTierProvider.test.tsx \
  src/hooks/useAnimationTier.test.tsx \
  src/core/perf/motionTokens.test.ts
→ Test Files 4 passed (4) · Tests 50 passed (50)
```

---

## Not done, and why

These are **not** claimed. Each needs infrastructure or design work this round did
not have.

| Slice | Status | What blocks it |
|---|---|---|
| **A7** | **NOT STARTED** | Hero poster, static composition, reference provenance, and the header logo `rgba(0,217,255)` fix. The four rulings that gated its *wiring* changes are now cleared, so it is unblocked — but it needs the hero composition work. |
| **A8** | **NOT STARTED** | Needs `swanMarkReveal.ts` and the controller extensions (`beginReveal`, `onPresented`, `onError`). Ruling 4 fixes the backing contract to the shipped 1024 clamp, so the A0r §6 discrepancy is now resolved in favour of production. |
| **A9** | **NOT STARTED** | Needs `HeroSignature.tsx` + `.styles.ts` and the lazy boundary with generation/deadline guards. |
| **A10** | **NOT STARTED** | Home motion restrictions through mounted callers. |
| **A11** | **NOT STARTED** | Requires browser infrastructure that **does not exist**: no `playwright.cinematic.config.ts`, no `frontend/tests/` directory. `vitest.config.ts` has `include: src/**`, so `tests/cinematic/*` falls outside it. |

**Also still outstanding from A0r:** reference screenshots (item 5), the production
build and LCP (item 10 — the build is blocked by the sandbox delete guard), and the
full 1,295-dirty-path diff (item 1).

---

## Files changed this round

| File | Change |
|---|---|
| `src/core/perf/performanceTierPolicy.ts` | **NEW** — pure resolution + phase |
| `src/core/perf/motionTokens.ts` | **NEW** — motion authority |
| `src/core/perf/PerformanceTierProvider.tsx` | Rewritten — stable subscriptions |
| `src/core/perf/PerformanceTierContext.ts` | Rewritten — carries `CapabilityState` |
| `src/hooks/useAnimationTier.ts` | Rewritten — reads provider, no detector |
| `src/hooks/usePerformanceTier.ts` | Rewritten — canonical + legacy projection |
| `src/pages/HomePage/components/shared/HomeAnimations.ts` | Derived from motion tokens |
| `src/utils/motion-helpers.tsx` | Derived from motion tokens |
| `src/styles/tokens.css` | Motion tokens projected into `:root` |
| `src/pages/HomePage/components/HomePage.V4.tsx` | `isReduced` flag; literal removed |
| `src/pages/HomePage/components/sections/*.tsx` (12) | `SectionAnimationTier` alias |
| `src/pages/about/components/sections/*.tsx` (9) | `SectionAnimationTier` alias |
| `src/components/PremiumParallax/PremiumParallax.tsx` | **DELETED** (quarantined) |
| `src/core/perf/performanceTierPolicy.test.ts` | **NEW** — 18 tests |
| `src/core/perf/PerformanceTierProvider.test.tsx` | Rewritten — 13 tests |
| `src/hooks/useAnimationTier.test.tsx` | **NEW** — 7 tests |
| `src/core/perf/motionTokens.test.ts` | **NEW** — 12 tests |

**Rollback:** `git checkout -- <path>` for each modified file restores its
pre-slice state. A6 restores from `.a6-quarantine-20260921/` or
`~/a6-deleted-20260921/`.

---

## A7 — shipped-surface acceptance contract · PARTIAL · 2026-09-21 (late)

**Commits:** `0af46f4db` (A1–A4/A6/A8 re-created) · `a6bc0b2f1` (A7)
**Files:** `frontend/tests/cinematic/home.spec.ts` (new, 18 cases) ·
`frontend/src/components/Header/components/Logo.tsx` (ruling 3) ·
`frontend/playwright.cinematic.config.ts` + `tests/cinematic/{harness.smoke.spec,network.fixture}.ts`
(authored 19:41–19:43 by another session, committed here so they stop being untracked).

### What the rulings made A7 into

Rulings 1 and 2 turn A7 from *replace the hero* into *prove the hero survives*. So this slice
delivers the **preservation contract**, not the Act-1 composition. Ruling 3's one implementation
item — the header logo glow leaking raw `rgba(0,217,255)` — is fixed to Ice Wing `#60C0F0`.

### Evidence

| Gate | Result |
|---|---|
| Playwright, real Chromium, against `npm run build` output | **20/20 passed** (18 A7 + 2 harness smoke) |
| `npm run build` | EXIT=0, 15.5s |
| `tsc --noEmit` (8 GB heap) | EXIT=0, zero diagnostics |
| Unit surface unchanged | 109/109 |

### Mutation proof — the tests are load-bearing

Two source mutations, each with a full rebuild; `HeroSection.tsx` restored and md5-verified
(`409e2055cfb25e54dda6737c4834cc87`) between:

| Mutation | Fails | Correctly stays green |
|---|---|---|
| Remove `Join the Community` (the ruling-2 regression) | **7** | clipping ×4, section order, V3 fallback, a11y, H3 ×3, video |
| Remove the `/waiver` capsule | **5** | all others |

Discrimination matters as much as the count: a suite where everything fails on any change
localizes nothing.

### Three things measured, not assumed

1. **`Join the Community` appears twice** — hero and footer `CTASection`. A page-wide locator
   resolves to 2. The dangerous direction is not the false failure: a laxer assertion would be
   satisfied by the **footer** button after the hero one was deleted, passing straight through the
   regression it exists to catch. All hero assertions are scoped to `#hero`.
2. **The hero holds eight buttons, not six** — `GlowButton` sets its own `aria-label`. Replaced the
   count with a full label-**set** comparison, which also fails on rename and on an extra control.
3. **`TextSplitter` splits headings per character in `full` tier**, so `getByText()` matches in
   `reduced` and not in `full` — a test using it would pass or fail by machine. All text lookups
   normalize whitespace against concatenated `textContent`.

### NOT done — A7 is PARTIAL, not complete

- The **Act-1 static composition**, the **hero poster**, and **reference provenance**. All three
  depend on A0r §13 item 5 (desktop/375px reference screenshots), still **NOT TAKEN**. No
  composition has been selected, and inventing one would be the design substitution the build
  order forbids.
- H2's `poster and first frame preserve registration` and `handoff does not resize the hero` —
  both need `HeroSignature`, which is unbuilt (A9).
- Chromium only. Firefox/WebKit are explicit additional gates per `09-tests.md`; not run, not claimed.

### Two packet blockers falsified

`A11 needs browser infra that does not exist` → it exists and runs 20/20.
`Production build blocked by sandbox delete guard` → `npm run build` EXIT=0.
Both rows corrected in `05-slices.md`.

### Environment note

Both commits are **re-creations**. The originals (`492ab1e52`, `4e750da5f`) were destroyed along
with ~85,000 objects by a repack that rewound this branch four days. History was recovered by
fetching origin (70 commits, fast-forward); six unpushed commits stayed lost and their content
remains uncommitted in the working tree. Full record:
`../../../../../SS-PT-CINEMATIC-RESCUE-20260921/INCIDENT-AND-RESCUE-README.md`.

---

## A9 — lazy boundary, handoff, terminal fallbacks · DONE · 2026-09-21/22

**Commit:** `0f1db1cdc` · **Files:** `HeroSignature.tsx`, `heroSignatureMachine.ts`, both suites,
`HeroSection.tsx` (mount).

Split in two because A8 proved extraction hides code from the suite — there, 46/46 stayed green
while two planted mutations in the newly extracted modules survived. The machine therefore has
its own suite aimed at boundaries, not just whatever paths the component happens to take.

| Gate | Result |
|---|---|
| L1–L5 (`HeroSignature.test.tsx`) | **15/15** |
| machine suite (`heroSignatureMachine.test.ts`) | **29/29** |
| real browser (`signature.spec.ts`, other session) | **6/6** |
| `tsc --noEmit` · `npm run build` | EXIT=0 · EXIT=0 |

**Two real defects the suite caught while being written.** The load effect had `phase` in its
deps and called `setPhase('loading')`, so it tore itself down and set `cancelled = true` on its
own in-flight import — nine cases sat at `loading` forever. And `posterPresent()` queried role
`img`, but a decorative `alt=""` image has role `presentation`, so the helper reported "no
poster" in every state and silently inverted the assertion it existed to make.

**Mutation proof — 4 planted, 3 killed, 1 survivor reported.**

| Mutation | Result |
|---|---|
| poster hidden during `revealing` (the one-frame hole) | 5 failed — killed |
| deadline `>` instead of `>=` | 1 failed — killed |
| missing-observer gate removed | 1 failed — killed |
| `disabled` terminal guard deleted | **0 failed — SURVIVED** |

The survivor is not a coverage gap. Enumerating all six `{phase} × {tier}` combinations shows
every remaining path already returns `disabled`, so the guard is genuinely redundant *today*. It
is kept — the property is currently an accident of the branches below it — and the redundancy is
documented in source so nobody "simplifies" it away. The single-case assertion that passed
without the guard was describing that accident, and is replaced by an exhaustive one.

**Mounted, not merely built.** The poster is the shipped logo at the same 120px inside a host
carrying the identical glow and float, so the fallback IS the current design. Proof it did not
regress the shipped hero: A7's browser suite still passes against a fresh build, including
`decorative mark is absent from keyboard navigation` — the case that catches a focusable canvas.

---

## A11 Q1 — the lazy boundary, verified against the real build · DONE · 2026-09-22

**Commit:** `faec…` (this commit's parent) · **Files:** `tests/cinematic/build-boundary.test.ts`,
`vitest.cinematic.config.ts`, `playwright.cinematic.config.ts` (testMatch).

Measured: the emitted `HomePage.V4` chunk's **static** import closure contains zero edges to
`three.module` or `swan-mark.mesh`, and it does carry `import()` for both. A9's central claim is
now verified rather than asserted.

Four of six cases validate the instrument, not the product: a violating fixture must be flagged,
a dynamic-import fixture must not be, the renderer must still be dynamically reachable (an
absence-only check is satisfied by *deleting* the renderer), and the chunks must stay separate so
header-shared cost is attributable to the header.

**The mutation that mattered.** The first real-build mutation SURVIVED — a static import bound to
an unused `const` was tree-shaken away, so no static edge was ever emitted and the detector was
right to report a clean graph. *A mutation the toolchain optimises away is not a mutation.*
Re-run with the symbol genuinely used, the detector fired and named both offenders.

**Two runners, one directory.** `vitest.config.ts`'s `include: ['src/**']` makes
`frontend/tests/**` invisible, and an explicit path is filtered against `include` rather than
overriding it. The lane got its own config instead of widening the shared one. The suffix is the
boundary: `*.spec.ts` → Playwright, `*.test.ts` → vitest. Load-bearing, not cosmetic — Playwright's
default testMatch also accepts `.test.ts`, collected the vitest file, and the two matcher
implementations collided (`Cannot redefine property: Symbol($$jest-matchers-object)`), killing the
entire browser run before one case executed.

**Q2/Q3 NOT DONE.** LCP is unmeasured and the GPU/presentation cases need recorded real hardware.
Chromium only; Firefox/WebKit remain explicit additional gates per `09-tests.md`.

---

## A10 — home motion budget, enforced through mounted callers · DONE · 2026-09-22

**Commit:** `dbd144194` · **Files:** `HomeAnimations.ts` (the switch), five gated callers,
`tests/cinematic/motion-budget.spec.ts` (8 cases).

### Measured first, then fixed

| | Concurrent animated targets (settled viewport) |
|---|---|
| Before | **41** — almost all `span(filter+opacity+transform)`, TextSplitter's per-glyph spans |
| After | **3** — exactly the cap, each animating exactly ONE property |

The remaining three match the contract's named three: a transform wrapper, the signature host,
and a pulse. **Confirmed non-vacuous** by setting the cap to `-1` and reading the reported count,
rather than trusting a green tick on a possibly-empty measurement.

### Why not `document.getAnimations()`

It sees CSS animations, transitions and WAAPI. Framer Motion — which drives nearly all home
motion here — writes inline styles from a rAF loop and creates **no Animation object at all**. A
budget check built on it would report "0 animated targets" on a page with a dozen things moving,
confidently and forever. The detector samples what actually changes.

### Two false-positive classes, found by reading output rather than relaxing the threshold

1. **Mount reflow.** First run reported 6 targets, five of them `height` changing as the document
   grew — `main#main-content` among them. Motion and layout properties are now separated; layout
   change is reported but not counted.
2. **The entrance.** Sampling through it reported 13. The contract's three named targets are all
   sustained or scroll-driven; a one-time 200ms entrance is a different thing. The cap is asserted
   on steady state.

### Instrument validation — half the suite

`four targets fail`, `third animated property fails`, `100ms stagger fails`, **and** `a compliant
fixture is NOT flagged`. The fourth is not decoration: a detector that fires on everything passes
the first three and is worthless.

### Recorded violation, deliberately NOT fixed

During the hero entrance, **13 targets** animate, nine of them framer-motion wrappers each doing
`filter+opacity+transform`. Against `03-contracts.md:282` *"Sections animate at most one wrapper"*
that is a real violation.

It is surfaced rather than taken because collapsing the hero's five staggered wrappers changes the
shipped hero's entrance feel, and Sean's §12 rulings were specifically about not altering the
shipped hero without his call — ruling 2 recorded the plan's hero changes as an **error**, not an
instruction. Gating per-glyph splitting was inside A10's remit (the contract names nested character
animation outright); re-choreographing the entrance is a design decision.

**This needs Sean's ruling.** Meanwhile the suite asserts what is defensible: the entrance must
DECAY, because an entrance that never ends is sustained motion wearing an entrance's clothes.

### Not claimed

M1/M2 (`signature.spec.ts` lifecycle cases: import failure, WebGL unavailable, context loss,
route-exit resource release) are unwritten. No frame-rate, GPU-time or jank measurement — that is
Q3 and needs recorded real hardware.
