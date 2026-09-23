# A0 — Intake Receipt

**Slice:** A0 (evidence extraction) · **Status:** COMPLETE, with 3 contradictions returned
**Date:** 2026-09-19 · **Mode:** read-only (no file in `frontend/src` was written)
**Repo:** `<REPO>`
**HEAD:** `fe388691fbfbcd9a23eba380c929ce1e10c9d736` · **Branch:** `creator-brains-engine-r2-20260915`
**Working tree:** 1,129 dirty paths · no `.git/index.lock` present

This document records what the nine numbered items in `04-build-order.md` actually returned.
Where reality contradicts a decided interface in this package, the contradiction is **returned
here, not resolved** — per `04-build-order.md`: *"If reality contradicts a decided interface or
requires broader architecture, stop that slice and return the exact contradiction."*

Three contradictions were found. They are §C1–§C3 below and they change the shape of the
blueprint. **Read those first.**

---

## Method and limits

- Every claim below is backed by a command run against the working tree at the HEAD above.
- Nothing in `frontend/src` was modified. This slice produced this file only.
- **Not measured:** production-build performance, Lighthouse, and baseline screenshots (item 8,
  partial — see §8). No build was run, so no number is reported. Recording a fabricated or
  inherited perf figure here would defeat the purpose of the receipt.
- **Not measured:** runtime behaviour of anything. This is static evidence.

---

## 1. Repo and coordination state

| Fact | Value |
|---|---|
| HEAD | `fe388691fbfbcd9a23eba380c929ce1e10c9d736` |
| Branch | `creator-brains-engine-r2-20260915` |
| Dirty paths | **1,129** |
| `.git/index.lock` | absent — no other agent holds the index |

1,129 dirty paths means this tree is not a clean base. Any slice that assumes "only my changes
are present" is wrong. Slice commits will need surgical path selection, not `git add -A`.

No competing review request was found in the package directory.

## 2. Enclosing route and V4 mount

- `frontend/src/main-routes.tsx:58-61` — `HomePage.V4` lazy-imported, with `HomePage.V3` as the
  declared fallback.
- `frontend/src/main-routes.tsx:319` — `<HomePage />` mounted as the index route inside
  `<Suspense fallback={<PageLoader />}>`.

Confirmed as described in the package. No contradiction.

## 3. Providers and hook consumers

| Symbol | Where it lives | Consumers |
|---|---|---|
| `PerformanceTierProvider` | `frontend/src/core/perf/PerformanceTierProvider.tsx` | mounted in `App.tsx` |
| `usePerformanceTier` | same file | `LivingConstellation.tsx` (1 file) |
| `useAnimationTier` / `useTierFlags` | `frontend/src/hooks/useAnimationTier.ts` | **3 files total**: its own definition, `About.V4.tsx`, `HomePage.V4.tsx` |

**Correction to the package's framing.** The package speaks of the marketing home as if a dozen
sections each consume the tier ladder. In fact `useAnimationTier` has exactly **two** real
consumers. The ladder is real and wired, but its blast radius is much smaller than implied.

The two tier vocabularies still coexist: `full/balanced/essential` (hook) vs
`enhanced/standard/minimal` (`PerformanceTierProvider`). The provider is the only detector that
reads `deviceMemory`, `connection.saveData`, and `effectiveType` — and the marketing home does
**not** consume it. The marketing home runs on the weaker detector.

The previously identified defect at `PerformanceTierProvider.tsx:127` stands:
`}, [forceTier, tier]);` while the effect body calls `setTier`.

## 4. `motion-helpers.tsx` callers

**ZERO importers.** Verified by searching all `.ts/.tsx/.js/.jsx` under `frontend/src` for the
string `motion-helpers`, excluding the file itself:

```
=== motion-helpers importers (any form) ===
NONE OUTSIDE SELF
```

`frontend/src/utils/motion-helpers.tsx` is **170 lines of dead code**, including `withMotion`,
`createMotionComponent`, and `animationVariants`. `withMotion` has **no inputs to enumerate**,
because nothing calls it.

This confirms the correction already recorded in `VERIFICATION-NOTES.md`: the earlier "390 files
inherit motion-helpers" claim was false — 385 files import `framer-motion`, which is a different
thing. Consequences: packet defects §6.4–§6.7 describe a file that cannot affect any page, and
any slice premised on "fix the shared motion helper" is premised on a file with no call sites.

Note `animationVariants` also contains `staggerChildren: 0.1` (100 ms), which violates the
doctrine's ≤80 ms stagger ceiling — but it is unreachable, so it is currently inert.

## 5. `PremiumParallax` — effects, resources, cleanup, callers

**File:** `frontend/src/components/PremiumParallax/PremiumParallax.tsx` — 680 lines.
**Mounted callers: ZERO.** The only matches for the name in `frontend/src` are the file's own
leading comment, its definition at L457, and its export at L681.

Three effects:

| # | Lines | What it does | Cleanup |
|---|---|---|---|
| 1 | 472–516 | Appends **50** `<div class="particle">` nodes to `.particles-overlay` | **NONE** — no `return`. StrictMode double-invoke yields 100 particles |
| 2 | 519–554 | GSAP pointer-tilt on the plan card | Listeners **are** removed (L549–552). The `gsap.to()` tweens are **not** killed on unmount |
| 3 | 557–561 | `controls.start("visible")` when in view | n/a (framer `useAnimation`) |

`ScrollTrigger` is imported at L6 and registered at L14, and is **never used** anywhere else in
the file. It is a dead import carrying a live registration side-effect.

**Correction to the packet.** `CONSULT-PACKET.md` §6.8 claimed a GSAP listener leak here. That
was **refuted** — the listeners are cleaned up. The real, smaller defect is the uncleaned tween
plus the genuinely uncleaned particle append. Astra had correctly downgraded the packet claim to
`[HYPOTHESIS]`; the particle leak is the part that survives.

Because the file has zero callers, **none of this is currently reachable**. It is a latent
defect, not a live one.

## 6. SwanMark — this is the finding that matters

The package treats 3D as something to be introduced. It is not. There is a **complete, shipped,
tested Three.js integration in the header today**.

**Chain:**

| Artifact | Path | Lines | Role |
|---|---|---|---|
| Component | `frontend/src/components/SwanMark3D/SwanMark3D.tsx` | 271 | thin React wrapper; dynamic-imports `three` + spec |
| Scene host | `frontend/src/components/SwanMark3D/swanMarkScene.ts` | 282 | `createSwanMarkScene()` → `SwanMarkScene` |
| Support | `frontend/src/components/SwanMark3D/sceneSupport.ts` | — | `computeBacking`, `hasWebGL` |
| Factory | `frontend/src/three/swanMark/swanMarkFactory.ts` | — | `createSwanMark(spec, opts)`, `createFramedCamera` |
| Spec | `frontend/src/three/swanMark/swan-mark.mesh.json` | 323 KB | dynamically imported |
| Tests | `SwanMark3D.contract.test.ts`, `swanMarkPayload.contract.test.ts` | — | contract + payload tests |
| **Mounted at** | `frontend/src/components/Header/components/Logo.tsx:225` | — | `<SwanMark3D className="logo-mark" decorative alt="SwanStudios Logo" />` |

**The architecture is explicit and it is not R3F.** `swanMarkScene.ts` opens:

> `swanMarkScene.ts — framework-free host for the SwanStudios swan mark.`
> `Deliberately React-free so the sizing policy, the render-on-demand contract and disposal can be tested without mounting a component.`

The established house pattern for 3D is therefore:

1. raw `three` — imported as `* as THREE`, `new THREE.WebGLRenderer(...)`, `new THREE.Scene()`
2. a **React-free scene controller** exposing a narrow imperative API
3. a thin React wrapper that owns the lifecycle and calls `dispose()`
4. an explicit disposal contract — `dispose()` cancels rAF, disposes the swan, clears the scene,
   disposes the renderer, and calls `forceContextLoss()`
5. **contract tests that read source text** and assert the contract holds
6. progressive enhancement: `three` and the spec are dynamically imported into their own chunks;
   a 128 px PNG holds the layout box until WebGL is live, and forever if it never is
7. reduced-motion gating: `drift` is forced to 0 under `prefers-reduced-motion`, with a live
   media-query listener so a mid-session change is honoured
8. render-on-demand: the rAF loop runs **only while something moves**; a static logo costs zero
   GPU when idle

`SwanMarkScene`'s public surface is `setSize`, `setView`, `setDrift`, `requestRender`, `dispose`,
and readonly `backing` / `stats`. This is a mature, measured, documented interface — the file
records browser-measured resampling error tables and explicitly notes that an earlier
Python/LANCZOS model gave the wrong answer and that only in-browser measurement caught it.

## 7. Package manager, lockfiles, versions, commands

- **Package manager:** npm. **Two lockfiles:** root `package-lock.json` and
  `frontend/package-lock.json`. `frontend/package-lock.json` is `lockfileVersion: 3`, 1,061 packages.
- **Resolved versions (from the lockfile, not the ranges):**

| Package | Resolved |
|---|---|
| `react` | **18.3.1** |
| `react-dom` | **18.3.1** |
| `three` | **0.169.0** |
| `framer-motion` | **10.18.0** |
| `styled-components` | 6.1.19 |
| `vite` | 5.4.19 |
| `typescript` | 5.9.3 |

- **Commands:** `npm run type-check` (`tsc --noEmit`, 8 GB heap) · `npm run build` (vite) ·
  `npm run build:check` · `npm run test` (vitest) · `npm run test:run` (sharded) ·
  `npm run test:e2e` (playwright) · `npm run lint:check` (`--max-warnings 0`).
- **Absent from `dependencies` entirely:** `gsap`, `@react-three/fiber`, `@react-three/drei`,
  `lenis`, `motion`.

## 8. Home / shared-shell motion inventory

**The packet missed a 9,238-line cinematic home implementation.** This is the second finding
that changes the blueprint.

`frontend/src/pages/HomePage/cinematic/` — 21 files:

| Layer | Files | Lines |
|---|---|---|
| Tokens | `cinematic-tokens.ts` | 359 |
| Shared | `cinematic-shared.ts` | 331 |
| Animations | `cinematic-animations.ts` | 279 |
| Content | `HomepageContent.ts` | 578 |
| Sections | 11 `Cinematic*.tsx` + `index.ts` | ~2,884 |
| **Variants** | `EmberRealm`, `FrozenCanopy`, `NebulaCrown`, `ObsidianBloom`, `TwilightLagoon` | **4,645** |
| Manifest | `ASSET-MANIFEST.md` | — |
| **Total** | | **9,238** |

Five complete, distinct homepage designs, each 869–1,010 lines.

**Critical properties:**

- **No `three`, no `gsap`, no `@react-three/*`, no `lenis` anywhere in the subtree.** Zero hits.
  The motion is framer-motion + CSS only. The name "cinematic" here means *motion-rich*, not
  *WebGL*.
- `cinematic-tokens.ts` header: *"Design tokens for Preset F (Enchanted Apex) and F-Alt
  (Crystalline Swan)."* A Crystalline Swan variant already exists as a token set.
- **No banned hex** (`#0a0a1a`, `#00FFFF`, `#7851A9`) anywhere in the subtree.
- **Reachability: the variants are orphaned.** They are imported only by
  `frontend/src/components/DashBoard/Pages/admin-design/HomepageDesignLab.tsx`, which is itself
  **referenced by nothing** in `frontend/src` — no static import, no dynamic import, no registry
  entry. The design lab and all five variants are currently unreachable.

Separately, `frontend/src/components/ui-kit/cinematic/` (`ParallaxHero`, `ScrollReveal`,
`SectionDivider`, `TypewriterText`) is a **live, widely used** kit — **34 files** import it,
including `About.V3`, `ContactV3`, `StoreV3`, `SocialPage.V3`, `VideoLibraryV3`, `HomePage.V3`,
and 12 sections under `HomePage/components/sections/`.

**Other measured facts:**

- 385 files under `frontend/src` import `framer-motion`.
- 185 `motion.*` element usages under `frontend/src/pages/HomePage`.
- `HomePage.V4.tsx` is 113 lines and renders 12 sections, each accepting `tier`.

**Not measured in this item:** baseline screenshots and production-build performance. No
screenshot harness output and no Lighthouse artifact was found for the home page. Reporting a
number here would require running a build, which this slice did not do. **Item 8 is therefore
PARTIAL — the inventory is complete, the performance baseline is not taken.**

## 9. Doctrine conflicts

Doctrine lives at `docs/ai-workflow/design-brain/`:

`README.md` · `index.md` · `motion.md` · `cinematic-pages.md` · `website-archetypes.md` ·
`components.md` · `anti-patterns.md` · `qa-gates.md` · `design.md` · `design.html` ·
`swan-element-intelligence.md` · `external-reference-mcp.md` · `mobbin-learning-system.md` ·
plus `adapters/`, `graphify/`, `mockups/`, `obsidian/`.

Doctrine is **consistent with the measured reality**, and inconsistent with parts of this
package:

- `motion.md` §9 already ratifies the division of labour: *"Framer for enter/exit/hover/layout;
  GSAP only for genuinely long pinned timelines; R3F only when 3D is the point."* So GSAP and R3F
  are **conditionally** permitted — not mandated.
- `cinematic-pages.md` §7 governs 3D: progressive enhancement, R3F as a *surgical accent* behind
  `<Suspense>`, **one canvas per page maximum**, GSAP earns its import only for long ScrollTrigger
  sequences, one GSAP context per page killed on unmount, lazy chunking, LCP ≤2.5 s mobile,
  DPR ≤2, <3 ms/frame.
- `website-archetypes.md` defines archetype #2 "Cinematic 3D scroll site" at motion budget **M3**,
  licensed only for #2/#2b/#3; working surfaces cap at M1.

The doctrine's own hedge — *"R3F only when 3D is the point"* — is the hinge. The header logo is
3D, and the point there is a **logo**, which is why the shipped solution is a render-on-demand
raw-three scene and not an R3F canvas.

---

# CONTRADICTIONS RETURNED

Per the A0 rule, these are returned rather than resolved. Each one changes a decided interface.

## C1 — `gsap` is undeclared and uninstalled, yet a file imports it

The package's binding decision reads:

> *Existing GSAP defect | Repair `PremiumParallax` lifecycle separately. Do not mount it on Home merely to justify the repair.*

That decision is **unexecutable as written**, because the file cannot resolve its own imports.

| Check | Result |
|---|---|
| `gsap` in root `package.json` | **ABSENT** |
| `gsap` in `frontend/package.json` | **ABSENT** |
| `gsap` in root `package-lock.json` | **0 occurrences** |
| `gsap` in `frontend/package-lock.json` | **0 occurrences** |
| `node_modules/gsap` on disk | **NOT INSTALLED** (root and frontend both) |
| Import sites in the whole repo | **exactly 2**, both in `PremiumParallax.tsx` (L5 `gsap`, L6 `gsap/ScrollTrigger`) |

So: the only GSAP file in the repository is dead code that would fail module resolution the
moment it were imported. "Repair the `PremiumParallax` lifecycle" has no runnable target. Either
`gsap` gets declared (a dependency decision) or the file gets deleted (a deletion decision) —
**both are Sean's call, not A0's.**

This also reframes the stack question that opened this work. The premise was "Three.js + GSAP +
one more thing." Measured reality: **Three.js is installed and shipping. GSAP is not installed
anywhere.** The two are not peers in this repo today.

## C2 — The house 3D pattern is raw Three.js with a React-free controller, not R3F

The shipped, tested, mounted 3D surface (`SwanMark3D` → `swanMarkScene` → `swanMarkFactory`)
is explicitly **"Deliberately React-free"** and uses imperative `three` with a hand-rolled
lifecycle, a `dispose()` contract, `forceContextLoss()`, render-on-demand, and contract tests
that assert the source text.

If the package mandates React Three Fiber as the mechanism for the cinematic home, that
introduces a **second 3D paradigm** into a codebase that already has a working, tested, opposite
one. Additionally:

- `@react-three/fiber` and `@react-three/drei` are **not installed**.
- R3F v9 requires React 19; this app is on **React 18.3.1**. Any R3F use must pin
  `@react-three/fiber@^8` + `@react-three/drei@^9`.
- `cinematic-pages.md` §7 permits R3F only as a *surgical accent* behind `<Suspense>`, with
  **one canvas per page maximum** — which is compatible with the raw-three approach too.

**Question returned:** is the intended mechanism R3F (new paradigm, new deps, React-18 pin), or
the house raw-three scene-controller pattern (no new deps, existing contract tests as the
template)? This is an architecture decision, not an evidence gap.

## C3 — A 9,238-line five-variant cinematic home already exists, orphaned

The package's slice plan treats the cinematic marketing home as work to be designed and built.
It is substantially **already built** — five complete variants, shared tokens, shared animations,
a content model, and an asset manifest — and it is **unreachable**, because its only entry point
(`HomepageDesignLab.tsx`) is referenced by nothing.

Two consequences:

1. **The slice plan may be re-doing paid work.** Any slice that specifies a cinematic home
   structure should first reconcile against `cinematic/sections/` and the five variants.
2. **A decision is owed:** adopt one of the five variants as the base (which one?), promote the
   design lab to a reachable preview route, or treat the subtree as reference-only. The package
   contains no instruction covering an existing implementation, because the packet did not know
   one existed.

Note also that this subtree contains **no three and no GSAP** — so whatever "cinematic" means in
this package, the existing implementation and the package may mean different things by the word.

---

## What this changes

| Package assumption | Measured reality |
|---|---|
| Cinematic 3D home is largely greenfield | 9,238-line 5-variant implementation exists, orphaned |
| Three.js + GSAP are the paired stack | Three.js installed & shipping; **GSAP not installed at all** |
| 3D to be introduced | Raw-three scene controller shipped in the header with contract tests |
| Tier ladder spans the marketing home | `useAnimationTier` has exactly **2** real consumers |
| Shared motion helper needs fixing | `motion-helpers.tsx` has **0** importers — dead code |
| `PremiumParallax` has a GSAP defect to repair | File is dead **and** unbuildable; defects latent, not live |

## Gaps this receipt does not close

1. **No performance baseline.** Item 8's screenshots and production-build measurement were not
   taken. Any perf gate in `07-checkpoints.md` currently has no "before" number.
2. **No type-error manifest.** The previously noted 162 figure was an occurrence count from
   overlapping regexes, not a work count. A real manifest must come from `tsc`.
3. **Reachability of the design lab** was checked statically across `frontend/src` and found to
   be nil; it was not verified at runtime.
4. **1,129 dirty paths are unexplained.** Their contents may overlap this work.

## Recommended next action

**Return C1–C3 to Sean before executing any further slice.** Each is a decision the package
cannot make for itself:

- **C1:** declare `gsap`, or delete `PremiumParallax`?
- **C2:** R3F (new paradigm + React-18 pin) or the house raw-three scene-controller pattern?
- **C3:** adopt / promote / reference-only for the five existing variants?

A1's remaining slices are design work; they can proceed in parallel. No implementation slice
should start until C2 is answered, because C2 determines the mechanism every later slice assumes.

---

*A0 · intake receipt · read-only · HEAD `fe38869` · 2026-09-19*
