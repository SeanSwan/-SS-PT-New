# CONSULT PACKET P2 — HOSTILE REVIEW OF THE PLANS THEMSELVES

**Requested by:** Sean (operator) · **Dispatched by:** Sable (WorkBuddy) · **Date:** 2026-09-21
**Subject:** `BLUEPRINT-cinematic-frontend-2026-09-19` — the full plan set, judged as a *plan*
**Repo:** `SS-PT` @ `15a814e7ab7551d519cdc87837fb0789c66e8ab2`, branch
`creator-brains-engine-r2-20260915`
**Prior consult:** P1 returned the package under review. Its reply, its meta receipt, and the
adjudication of it are all included below.

---

## §0 — REMIT

You produced the package under review (consult P1). You are now asked to review **the plans
themselves**, adversarially, on two axes the P1 remit did not cover:

**Axis 1 — Is this the best available approach, judged against the current state of the art?**
Not "is it internally consistent" (it mostly is), but "is it the *right* design." Cover:
- **Open-source practice.** What do the leading open-source projects in this exact space
  (React Three Fiber ecosystem, GSAP-free WebGL enhancement, headless/primitive UI, motion
  systems, progressive-enhancement 3D) actually do in 2026? Where does this plan diverge from
  what the field has settled on, and is the divergence defensible or just idiosyncratic?
- **Premium/commercial practice.** What do the paid, best-in-class options do — and, more
  usefully, **is there a paid product that makes this plan's custom work unnecessary?** The
  plan hand-builds a tier policy, a motion token system, an R3F enhancement boundary, and a
  full test apparatus. Some of that is likely reinventing a maintained library. Name the
  specific products and the specific plan sections they would replace, plus the cost of
  adopting them (license, bundle weight, vendor lock, migration).
- **The core bet.** The plan's central architectural choice is a ~10-file, hand-rolled
  progressive-enhancement 3D boundary with its own capability policy, its own motion tokens,
  and its own dual-gate reduced-motion strategy. Is that the state of the art, or is it a
  2019-era pattern that better tooling has since obviated? Be specific about what you would do
  instead and why.

**Axis 2 — Attack the plans.** Find what is wrong, weak, over-built, under-specified, or
dangerous. You have already reviewed this package once (P1) and made corrections that were
adopted. Do not repeat those. Find **new** defects, and specifically attack **your own prior
decisions** — three of them became binding, and one of them (the canonical tier policy in
`03-contracts.md`) has never been stress-tested.

**Also required:** the operator has recorded three contradictions found by an intake pass
against reality (§4 below). Address them directly — do not treat "the operator will decide" as
a resolution.

---

## §1 — WHAT YOU ARE REVIEWING

The package is at `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/`:

| File | What it decides |
|---|---|
| `00-README.md` | Delivery shape, 15 binding decisions, scope limits, release authority |
| `01-architecture.md` | Canonical surfaces, user flow, capability flow, ownership, 9 proposed NEW files, signature state machine, doctrine replacement text |
| `02-wireframes.md` | Exact Act-1 copy, exact palette bindings, desktop/mobile contracts, state table |
| `03-contracts.md` | Canonical tier policy (pure resolution rules), subscriptions, vocabulary migration, motion values, helper behavior, signature contract, fallback/cancellation, home motion budget, dependency contracts |
| `04-build-order.md` | A0 intake (9 evidence items), dependency graph, implementation order, session-size rule |
| `05-slices.md` | 24 slices A0–A11, B1a–d, B2a–c, each with acceptance command; disposition of 9 defects |
| `06-bans.md` | 25 prohibitions |
| `07-checkpoints.md` | C0–C6 gates with numeric thresholds |
| `08-decision-density-self-test.md` | Your own P1 self-test |
| `09-tests.md` | 8 new unit/integration test files, 4 new Playwright specs, ~60 named cases, 4 measurement protocols |
| `A0-INTAKE-RECEIPT.md` | The operator's read-only intake pass, with 3 contradictions |
| `VERIFICATION-NOTES.md` | Adjudication of your P1 reply (14 confirmed, 1 refuted in part, 2 against the packet, 6 unproven) |
| `HOSTILE-REVIEW.md` | Your P1 Part A output |
| `CONSULT-PACKET.md` | The P1 packet you were given |
| `ASTRA-REPLY.md` + `.meta.json` | Your P1 reply verbatim, and its receipt |

**Plan text is reproduced verbatim in §5** so you do not have to infer it. Where you need more
depth than §5 gives, say so and mark it `[NEEDS-VERBATIM]` rather than assuming.

---

## §2 — CONTEXT THAT CHANGED SINCE P1

**Your P1 run receipt — read this, it constrains your confidence in your own P1 work:**

```json
{ "model": "gpt-6-astra", "servedModel": null, "provider": "openai-codex",
  "billing": "chatgpt-subscription", "authMode": "chatgpt_subscription",
  "transport": "codex-cli", "megaBlueprint": true, "megaBlueprintArmedBy": ["document"] }
```

`servedModel` is **null**. The P1 output is recorded as *"requested `gpt-6-astra`, served
identity unverified"*. If you are not the model that wrote P1, say so — the adjudication
already notes that P1's identity was never established.

**Capability limitation you reported in P1:** *"Local read commands were rejected by execution
policy."* Your P1 `[VERIFIED]` tags therefore meant "supported by the excerpt I was given."
Keep that discipline. Use `[EXCERPT-SUPPORTED]`, `[UNVERIFIED]`, `[HYPOTHESIS]` honestly, and
mark anything you assert about a library's current behaviour as `[UNVERIFIED]` unless it is in
this packet.

**What the operator's A0 intake then found (§4).** The intake was run because §7 of your P1
reply warned it was required. It returned three contradictions your P1 package could not have
seen, because P1 never read the repo.

**Repository drift:** HEAD moved
`fe388691fbfbcd9a23eba380c929ce1e10c9d736` → `15a814e7ab7551d519cdc87837fb0789c66e8ab2`
(**59 commits**, including work on "master-reconciliation", "containment", "redact", and an
explicit commit titled *"docs(round 9c): reconcile the four planning contradictions Astra P3 #8
named"* — a **separate, later** Astra consult this packet does not contain). Dirty paths went
1,129 → 1,272. The cinematic package itself was **not** modified in that window except by A0.

---

## §3 — THE OPERATOR'S THREE DECIDED RESOLUTIONS (ruled 2026-09-21)

The operator has ruled on A0's C1–C3. These are **binding decisions, not open questions.**
Review them as decisions — attack them if they are wrong, but do not treat them as unresolved.

**R1 — GSAP: DELETE, do not adopt.** The repo will **not** take a GSAP dependency. The plan's
binding decision ("repair `PremiumParallax` lifecycle separately") and slice **A6** are
**cancelled**, to be replaced by a deletion slice: `PremiumParallax.tsx` (680 lines, zero
mounted callers, unimportable as-written) is removed along with its orphaned style/asset
files, and the plan's `00-README.md` row *"Existing GSAP defect"* is retired. Consequence the
operator accepts: the repo's GSAP story becomes "GSAP is not used here," and
`cinematic-pages.md` §7's GSAP clauses remain in doctrine unexercised.

**R2 — House raw-three pattern wins; R3F is NOT adopted for this surface.** The plan's
binding `"R3F | One lazy scene, R3F 8 on React 18"` decision and the R3F-dependent slices
**A8/A9** and the R3F clauses in `01-architecture.md`, `06-bans.md`, `07-checkpoints.md` and
`09-tests.md` are to be **rewritten around the shipped `swanMarkScene` scene-controller
pattern** — raw `three`, React-free controller, imperative `setSize/setView/setDrift/render/
dispose`, contract tests that read source text.

**R3 — The orphaned cinematic subtree is ADOPTED as reference, not as base.** The five variants
stay where they are and are **not** promoted, not wired into any route, and not deleted in this
workstream. `HomePage.V4` remains the target surface. The subtree's tokens, section structure,
and copy patterns are **fair game to mine** for Act 1 and later sections.

**Question for you on R1–R3 (required):** are these three resolutions *individually* right, are
they *mutually consistent*, and what **second-order consequences** do they create that the plan
has not yet absorbed? R2 in particular removes the only reason the plan's 9 new files were
split the way they were.

---

## §4 — THE FOURTH CONTRADICTION THE OPERATOR FOUND *AFTER* A0 WAS FILED

Read this carefully; it is the sharpest thing in the packet.

The plan's scope (`00-README.md` Delivery + Scope limits, `06-bans.md` lines 1 and 8,
`02-wireframes.md` line 60) is: **do not replace the twelve-section home; add one Act-1
signature; do not add a new particle field.**

But `02-wireframes.md` **line 8** — the *Direction decision* — is where the plan actually
rejected a concept:

> `| Generic geode/particle field | Rejected: weaker brand connection and additional scene/asset work. |`

**Measured reality:** `frontend/src/pages/HomePage/cinematic/` contains **9,238 lines across
21 files**, including **five complete homepage variants** (`EmberRealm` 926 L, `FrozenCanopy`
959 L, `NebulaCrown` 1,010 L, `ObsidianBloom` 869 L, `TwilightLagoon` 881 L), a
`cinematic-tokens.ts` whose header reads *"Design tokens for **Preset F (Enchanted Apex)** and
**F-Alt (Crystalline Swan)**"*, a shared animation module, a content model, and an asset
manifest. It contains **zero `three`, zero `gsap`, zero R3F** — it is framer-motion + CSS.

It is reachable **only** through
`frontend/src/components/DashBoard/Pages/admin-design/HomepageDesignLab.tsx`, which is itself
imported by **nothing** in `frontend/src`.

So: the plan selected a direction by **rejecting a "generic geode/particle field"** — while the
same repo already contained **five complete, named, tokenized designs, one of which is
literally named for the project's own design language**, none of which the plan's P1 packet
knew about, and one of which (`Crystalline Swan`) is a *stronger* brand connection than
anything the plan invented.

**Required, and do not soften it:** was the P1 direction decision made **on evidence that
excluded the best available option**? If yes, say so plainly, and say what the plan's
`00-README.md` and `02-wireframes.md` should be rewritten to. If the rejection still holds on
its merits **now that you know the subtree exists**, say that instead — but argue it, do not
assert it.

---

## §5 — PLAN TEXT, VERBATIM

### §5.1 `00-README.md` — binding decisions and scope

**Delivery**
- **A:** Retain `HomePage.V4`, its twelve sections, its route-level V3 fallback, and existing
  conversion flow. Add one progressively enhanced crystalline SwanMark signature.
- **B Stage 1:** Independently remove compatible dependency blockers while remaining on React 18.
- **B Stage 2:** Perform a bounded React 19 migration after Stage 1, on an isolated branch with
  a complete dependency cohort and rollback.
- A does not depend on either B stage.

**Binding decisions**

| Concern | Decision |
|---|---|
| Capability authority | Existing `PerformanceTierProvider.tsx`, with detector extracted only as needed for testing/file length. |
| Target vocabulary | `full / lean / reduced`. |
| Existing home hook | Preserve `useAnimationTier` and `useTierFlags` names; make them provider consumers. |
| Lenis | Excluded. Native scrolling remains. |
| New home GSAP | Excluded; the selected signature does not need a pinned timeline. |
| Existing GSAP defect | Repair `PremiumParallax` lifecycle separately. Do not mount it on Home merely to justify the repair. |
| Signature | Existing SwanMark geometry, crystalline treatment, one 720ms rotational reveal. |
| R3F | One lazy scene, R3F 8 on React 18. |
| Drei | No new dependency; this scene does not require its helpers. |
| Motion tokens | TypeScript source of truth with generated CSS projection. |
| Media | Static hero composition remains complete; no new video, remote model, HDRI, or texture request. |
| Conversion | Preserve the existing verified orientation-opening flow. |
| Backend | No endpoint, model, migration, or data-contract changes. |

**Scope limits:** No dashboard redesign, Framer-wide rewrite, global animation scheduler,
section-list replacement, new metrics, new form, scroll hijacking, production-data tests, or
repository cleanup.

**Release authority:** Implementation evidence goes through Gemini review, Codex hostile
review, and Fable's final decision. Advisory, not a commit or deployment approval. No push to
`main` is authorized here.

### §5.2 `03-contracts.md` — the canonical tier policy (your P1 design; never stress-tested)

```ts
type CanonicalTier = 'full' | 'lean' | 'reduced';

type CapabilitySnapshot = Readonly<{
  reducedMotion: boolean;
  cores?: number;
  memoryGiB?: number;
  saveData?: boolean;
  effectiveType?: string;
}>;
```

Pure resolution rules, evaluated in order:
1. Reduced motion → `reduced`.
2. Known positive cores below 4, or known positive memory below 4GiB → `reduced`.
3. Save-data enabled, or effective connection `slow-2g`, `2g`, or `3g` → `lean`.
4. Known cores of at least 8, without an earlier restriction → `full`.
5. Otherwise → `lean`.

Missing APIs are neutral; invalid numeric readings are treated as unknown. Unknown network
strings do not invent a connection class. Core count is a capability heuristic, not proof of
GPU speed. Before client detection, return `reduced`; after detection, ordinary unknown
hardware resolves to `lean`. No scene request occurs before detection.

**Subscriptions and overrides:** one provider owns reduced-motion and connection-change
subscriptions; effects depend on subscription inputs, not the state they update; compute the
next tier, use a functional state update, remove `tier` from the dependency array; do not log
inside a functional updater; `forceTier` may lower a tier, never raise it above detected
restrictions; preference and connection downgrades apply immediately; a disabled/failed
signature does not restart during the same home mount even if the provider later upgrades.

**Vocabulary migration**

| Old provider | Old home | Canonical |
|---|---|---|
| `enhanced` | `full` | `full` |
| `standard` | `balanced` | `lean` |
| `minimal` | `essential` | `reduced` |

**Motion values** — TypeScript authoritative; CSS strings and Framer seconds are projections.

| CSS token | Authoritative value |
|---|---|
| `--motion-ambient` | 12000ms |
| `--motion-response-fast` | 120ms |
| `--motion-response` | 200ms |
| `--motion-response-slow` | 320ms |
| `--motion-narrative` | 720ms |
| `--ease-out-quint` | `[0.16, 1, 0.3, 1]` |
| `--ease-in-quad` | `[0.55, 0.085, 0.68, 0.53]` |
| Stagger interval | 60ms |
| Maximum stagger group | 5 children |

**Signature contract:** subject is the existing SwanMark, not a new mark; home adapter reuses
verified existing geometry/material construction; rotation is **one Y-axis movement from −0.14
radians to 0**, fixed camera; **720ms** using the canonical out easing; no particle field,
camera flight, bloom, postprocessing, shadows, video, or pointer tracking; no remote assets;
one Canvas maximum; explicit DPR range `[1, 1.5]`; demand rendering; native scrolling unchanged.

**Fallback and cancellation:** static mark and reserved dimensions exist before any scene
import; begin loading only after the base hero has painted, the hero is visible, and full
capability is established; **5000ms** import/preparation timeout latches failure; promise
completion checks a generation token, mount status, and current eligibility; a tier downgrade
prevents a late import from mounting a canvas; poster-to-scene handoff only after a successful
first frame with **no opacity crossfade**; context loss immediately restores the poster;
offscreen during the beat finishes logically without replay; Suspense handles pending work, a
separate boundary handles failures.

**Home motion budget:** at most three home-controlled targets may animate together — (1)
signature canvas, counted conservatively as one animated target; (2) `ScrollProgress`, one
transform; (3) one `SectionTransition` wrapper, opacity and transform. Sections animate at most
one wrapper; no simultaneous nested character, particle, counter, or card animations. Section
reveal: 200ms, once, max 12px translation. **If another section reveal is active, newly visible
sections appear immediately in their final state; do not queue hidden content.** CTA
hover/press/focus changes immediately. Noise remains static. Counters display final values on
Home. Existing shell motion counts toward the viewport cap. A conflicting shell requiring
unrelated changes is a scoped blocker, not permission for a global redesign.

**Dependency contracts**

| Stage | Binding rule |
|---|---|
| A | Retain installed React 18 and React DOM pair. Select highest stable R3F 8 release whose published peers accept the installed React, types, and Three.js versions. Freeze exact version. |
| B1 Framer | Select highest stable `framer-motion` **12.x** release whose peers accept both installed React 18 and intended React 19. Retain import paths. If no candidate qualifies, block this slice. |
| B1 Lucide | Verify packet candidate `1.47.0`, peer ranges, exports, installed caller APIs before freezing. |
| B1 Helmet | Verify packet candidate `3.0.0`, provider API, metadata behavior, React peers. |
| B1 Simple Maps | Verify packet candidate `5.0.5`, its one reported consumer, React peers. |
| B2 | Verify packet target React/React DOM `19.3.0`; matching runtime versions. Freeze compatible React 19 type packages, R3F 9, and React Leaflet 5 together. |

The packet's exact package versions are `[UNKNOWN] as independently verified registry facts`.
Missing candidates stop only their dependency slice. No `--force`, `--legacy-peer-deps`,
dependency alias, or unreviewed override.

### §5.3 `01-architecture.md` — the nine proposed NEW files

| NEW path | Responsibility |
|---|---|
| `frontend/src/core/perf/performanceTierPolicy.ts` | Pure canonical capability decision. |
| `frontend/src/core/perf/motionTokens.ts` | Numeric timings and easing tuples. |
| `frontend/src/core/perf/motionTokenStyles.ts` | CSS projection using styled-components `css`. |
| `frontend/src/three/swanMark/homeHeroSpec.ts` | Home pose, timing, resource limits, frozen refs to verified existing mark configuration. |
| `frontend/src/three/swanMark/homeHeroFactory.ts` | Adapter around verified existing geometry construction; **no renderer**. |
| `frontend/src/pages/HomePage/components/sections/HeroSignature.tsx` | Eligibility, lazy boundary, lifecycle state, fallback ownership. |
| `frontend/src/pages/HomePage/components/sections/HeroSignatureScene.tsx` | R3F canvas and one-shot motion. |
| `frontend/src/pages/HomePage/components/sections/HeroSignaturePoster.tsx` | Verified existing mark asset or static projection of the same mark. |
| `frontend/src/pages/HomePage/components/sections/HeroSignature.styles.ts` | Responsive composition and CSS motion gate. |

**Ownership rules:** the provider owns capability detection and subscriptions; each enhancement
boundary owns loading, cancellation, errors, and its fallback; R3F owns the new renderer and
rendering lifecycle; the reused factory supplies geometry/material resources, not another
renderer or animation loop; explicit resources are disposed once, shared resources are not
disposed by a single consumer; new scene code follows the existing `spec → factory → scene`
separation.

**Signature state machine:** `[*] → Poster → Loading → Preparing → Running → Settled →
{Failed|Disabled} → Poster`. Failure/disablement is **latched for the current route mount**;
there is no automatic retry or replay. Returning to a route creates a new lifecycle.

**Doctrine replacement text (binding amendments):**
- `motion.md#3`: "A shared capability authority supplies the tier. Every enhanced surface owns
  a complete static fallback and independently enforces CSS and JavaScript reduced-motion
  behavior. **MotionConfig alone does not establish that all motion has stopped.**"
- `motion.md#9`: Replace "in the same file" with "at the enhancement boundary, using the shared
  tier authority; policy, scene and styles may be separated to meet file-size limits."
- `cinematic-pages.md#7`: "One GSAP ownership context per mounted page timeline. Existing
  reusable components must clean their own scoped resources. No global trigger cleanup."
- `website-archetypes.md#2`: "8–14 viewport heights is desktop compositional guidance,
  subordinate to content, text scaling, and native scrolling."
- `design.md#27`: Existing bans remain binding.

### §5.4 `02-wireframes.md` — copy, palette, and the direction decision

**Direction decision**

| Concept | Decision |
|---|---|
| Existing SwanMark emerging from a crystalline composition | Selected: brand-specific, reuses existing geometry, one bounded moment. |
| **Generic geode/particle field** | **Rejected: weaker brand connection and additional scene/asset work.** |

**Exact new Act-1 copy:** Eyebrow `SWANSTUDIOS` · H1 `Build strength.` / `See your progress.` ·
Body `Personal training built around your goals, your workouts, and your next step.` · Primary
CTA `Book an orientation`. No secondary hero CTA, invented statistics, autoplay control,
loading message, or technical error copy.

**Exact palette bindings:** page base `var(--bg-base, #030712)` · hero depth
`var(--obsidian-black, #0A0A0F)` · sapphire composition `var(--midnight-sapphire, #002060)` ·
raised plane `var(--royal-depth, #003080)` · primary text `var(--frost-white, #E0ECF4)` ·
static mark highlight `var(--ice-wing, #60C0F0)` · decorative seam `var(--gilded-fern, #C6A84B)`
· button background `#002060` · button border `#60C0F0` · button glow `var(--wing-purple,
#8B5CF6)` · focus outline `#60C0F0`. Canvas colors come from resolved CSS tokens, then the
installed Three.js color-management convention; **raw `var(...)` strings are not passed as
Three.js colors.**

**Desktop contract:** content max width 1440px, centered, 48px gutters; two columns
`minmax(0,1.05fr) minmax(0,0.95fr)`, 48px gap; H1 Plus Jakarta Sans 700
`clamp(48px, 4.5vw, 76px)` / 1.06; body Sora 18px / 1.6, max 48ch; CTA min-height 48px, 24px
padding; decorative square max 560px, `aspect-ratio: 1`; content controls height; no
fixed-height crop or pinned viewport; retain width and type caps at QHD/4K.

**Mobile contract:** single column below 768px, 20px gutters; H1 38px / 1.08 at 375px; body
16px / 1.6; CTA full width, min 48px; mark centered, max 280px, stable square; copy and CTA
precede decoration in DOM and visual order; no horizontal overflow, negative-margin breakout,
or fixed hero height.

**State table:** initial render / eligible import pending / full signature / full settled /
lean / reduced motion / failure / keyboard focus (2px Ice Wing outline, 3px offset, no animated
focus glow). The mark is decorative: `aria-hidden`, no tab stop, no pointer interception.

### §5.5 `05-slices.md` — the 24 slices (abbreviated; acceptance commands verbatim)

| Slice | Work | Acceptance |
|---|---|---|
| A0 Intake | Read-only receipt, caller inventories, dependency metadata, baseline, doctrine check | `git status --short`; `npm ls …`; baseline type/build |
| A1 Pure tier policy | NEW `performanceTierPolicy.ts` + test | `vitest run src/core/perf/performanceTierPolicy.test.ts` |
| A2 Provider lifecycle | `PerformanceTierProvider.tsx`; functional updates; restricted overrides | `vitest run src/core/perf/PerformanceTierProvider.test.tsx` |
| A3.n Consumer migration | `useAnimationTier.ts`, real provider consumers, twelve sections, background/video; batches ≤8 files | `vitest run src/hooks/useAnimationTier.test.tsx`; type check |
| A4 Token projection | NEW motion token modules + style-root integration | `vitest run src/core/perf/motionTokens.test.ts` |
| A5.n Helper repair | `motion-helpers.tsx` **and actual callers only** | `vitest run src/utils/motion-helpers.test.tsx` |
| A6 GSAP cleanup | `PremiumParallax.tsx`; extract styles/effects if needed for file cap | `vitest run …PremiumParallax.lifecycle.test.tsx`; browser mount-cycle |
| A7 Static Act 1 | Existing `HeroSection` + V4 integration; NEW poster/styles | `playwright test -c playwright.cinematic.config.ts tests/cinematic/home.spec.ts` |
| A8 Scene construction | NEW spec/factory/Scene; **exact compatible R3F 8 pin**; reuse geometry | `vitest run src/three/swanMark/homeHeroFactory.test.ts`; peer check; build |
| A9 Enhancement boundary | NEW `HeroSignature.tsx`; cancellation, first-frame handoff, errors, context loss | `vitest run …HeroSignature.test.tsx`; full/fallback browser cases |
| A10.n Motion budget | Existing animation primitives + section callers, ≤8 files/batch | `playwright test … motion-budget.spec.ts` |
| A11 Acceptance | Real V4 route, screenshots, accessibility, bundle, performance | commands in `09-tests.md`; no waived thresholds disguised as passes |
| B1a Framer | Verified candidate, lockfile, API adjustments; **keep import names** | helper tests, home motion tests, type/build |
| B1b Lucide | Verified candidate; compiler-proven export/API changes only | type/build; icon smoke on changed callers |
| B1c Helmet | Verified candidate; retain provider architecture | metadata mount/update/unmount tests |
| B1d Simple Maps | Verified candidate + its one consumer | synthetic-data render/interaction test |
| B2a React 19 prep | Compiler/dependency/caller manifest; React-18-compatible type fixes in ≤8-file batches | type/build on React 18 |
| B2b Cohort switch | Isolated branch: React/DOM, types, R3F 9, Leaflet 5, verified peers | clean install, peer validation, type/build, React 19 suite |
| B2c Runtime acceptance | Error boundaries/reporting, metadata, charts, drag/drop, lazy maps, scene lifecycle | real caller tests; complete-cohort rollback rehearsal |

**Session-size rule:** each builder session changes at most eight existing implementation files
plus narrowly related tests. A dependency slice changes one dependency family, its lockfile, and
its verified callers. **No session receives "fix all consumers," "finish the migration," or
another open-ended instruction.**

### §5.6 `06-bans.md` — 25 prohibitions (verbatim)

No replacement of the twelve-section home structure · No new capability detector outside the
canonical provider policy · No permanent old-tier adapters after A3 · No full-tier override of
reduced motion, save-data, or constrained-network policy · No R3F, Three.js scene machinery, or
new GSAP import through the initial home rendering graph · No R3F request in lean/reduced mode ·
No Lenis, scroll hijacking, new pinned home timeline, second canvas, or persistent render loop ·
No new particle field, remote model, texture, HDRI, bloom, or video · No disappearing copy,
delayed CTA, spinner-only hero, or blank failure state · No replay after downgrade, context
loss, or failed import during the same route mount · No global `ScrollTrigger` destruction · No
opacity-only "reduced" animation justified solely by MotionConfig · No animation of layout
properties, large blur, box-shadow, or background position · No more than two animated
properties per target or three animated targets in a viewport · No stagger over 80ms or more
than five children in a stagger group · No animated nested section children while their wrapper
animates · No MUI, new Tailwind, retired palette, Arctic Cyan button/glow, fake metrics, or
unapproved brand geometry · No new files over 300 lines; required component headers and
documentation apply · No claim that all Framer consumers inherit the helper repair · No React 19
install based solely on a "latest" table · No package-manager peer bypasses or type-check
suppression to pass the migration · No broad `any` substitution for changed React types · No
production API writes, form submissions, or personal data in automated tests · No whole-tree
rollback, cleanup, broad staging, or push to `main` · No test pass, live-surface fix, or
performance claim without corresponding evidence.

### §5.7 `07-checkpoints.md` — numeric gates

**C2 Static surface:** text contrast ≥4.5:1; interactive targets ≥44px; primary CTA ≥48px high;
layout passes 375×812, 414×896, 768×1024, 1280×800, 1920×1080, 2560×1440, 3840×2160; 200% text
zoom usable without clipping.

**C3 Motion/lifecycle:** exactly one signature eligible in full mode, none in lean/reduced;
signature executes once then demand rendering idles; import failure, timeout, late resolution,
context loss, route exit and runtime preference change all preserve the poster; GSAP owned-
resource counts return to baseline after repeated mounts; CSS and JS gates pass **independently**.

**C4 Performance:** production build retains lazy scene boundaries; lean/reduced navigate with
**no scene chunk request**; **canvas count ≤1; actual DPR ≤2**; mobile lab **LCP ≤2.5s**;
real-GPU scene cost **<3ms/frame**; **unsupported measurement produces INCONCLUSIVE, never a
pass**; pre-existing performance failure reported explicitly, not concealed by a no-regression
claim.

**C6:** this consultation created no local files, screenshots, or temporary artifacts.

### §5.8 `09-tests.md` — measurement protocols (abbreviated)

- **Runner:** NEW `frontend/playwright.cinematic.config.ts`; production Vite preview on
  `127.0.0.1:4173`; synthetic fixtures; reject unexpected non-read API requests; no backend
  against the production database; record exact browser versions; **missing runner/browser
  tooling is a preparation blocker, not permission to fetch an unpinned latest version.**
- **LCP case:** production build, 375×812, DSF 2, Chromium version + machine recorded, fresh
  context/cache per run, network 150ms/1.6Mbps down/750Kbps up, CPU 4× slowdown, five
  navigations per mode, buffered LCP before interaction, **pass when nearest-rank p75 ≤2500ms**,
  record actual LCP element and all five values. *"This is a lab gate, not a claim about
  production field p75."*
- **Scene cost case:** headed on recorded hardware with a **real GPU**; software rendering does
  not qualify; 375×812 and 2560×1440 at max configured scene DPR; instrument CPU scene update +
  renderer submission; measure GPU via **disjoint timer queries**; collect **every rendered
  signature frame across ten fresh mounts, including first frames — do not discard expensive
  first frames as warm-up**; reject disjoint/invalid samples; **gate: CPU scene cost + GPU
  render cost <3ms for every valid sampled frame**; missing GPU timing support yields
  **INCONCLUSIVE**; frame intervals and rAF deltas are not GPU timings.
- **Eight new unit/integration test files** with ~60 named cases, including negative controls:
  *"budget detector rejects deliberate violations"* (four moving targets must fail; a third
  animated property must fail; 100ms stagger must fail), and *"negative fixture: making the
  scene a static entry import must fail the checker."*
- **Explicit honesty clause:** *"A successful fallback-only run cannot satisfy full-scene
  performance acceptance."*

---

## §6 — THE P1 ADJUDICATION, IN FULL

`VERIFICATION-NOTES.md` adjudicated your P1 reply: **14 confirmed, 1 refuted in part, 2 against
the packet, 6 unproven.** The unproven list, which you should treat as your own open
obligations:

1. **Served model identity** — `servedModel: null`, requested `gpt-6-astra`, identity unverified.
2. **A1-05 runtime behaviour** — Framer `MotionConfig reducedMotion` opacity-permissiveness is
   asserted from primary docs, **never reproduced in this repo**. Confirm with a runtime fixture
   before relying on it.
3. **A1-08 residual** — whether `PremiumParallax`'s unused `ScrollTrigger` registration costs
   measurable bundle/runtime weight is untested. *Note: R1 cancels this slice entirely.*
4. **A1-10 perf budget** — no measurement apparatus exists; `<3ms/frame` remains **undefined**.
5. **A1-12 real type surface** — the compiler-derived manifest does not exist. The true count of
   files needing React 19 edits is **unknown**; only regex occurrence counts exist and they
   overstate.
6. **A1-14 CTA chain** — the hero handler and `OrientationForm` API were not read.

**Also for your attention:** `01-architecture.md` line 139 states *"The existing form's exact
submission path was not supplied and **must not be invented**."* That remained true after A0 —
A0 item 2 traced the route and mount chain but did **not** trace the CTA handler or the form.
The plan therefore still cannot bind A7's CTA to a verified caller.

---

## §7 — WHAT IS ACTUALLY KNOWN ABOUT THE REPO (measured, not inferred)

Everything here was produced by the operator's A0 pass and is **measured against the working
tree**, not inferred.

**Base:** HEAD `15a814e7ab7551d519cdc87837fb0789c66e8ab2` · branch
`creator-brains-engine-r2-20260915` · **1,272 dirty paths** · no `.git/index.lock`.

**The shipped 3D surface — the thing R2 pivots onto:**

| Artifact | Path | Lines |
|---|---|---|
| Component | `frontend/src/components/SwanMark3D/SwanMark3D.tsx` | 271 |
| Scene controller | `frontend/src/components/SwanMark3D/swanMarkScene.ts` | 282 |
| Support | `frontend/src/components/SwanMark3D/sceneSupport.ts` | — (`computeBacking`, `hasWebGL`) |
| Factory | `frontend/src/three/swanMark/swanMarkFactory.ts` | — (`createSwanMark`, `createFramedCamera`) |
| Spec | `frontend/src/three/swanMark/swan-mark.mesh.json` | 323 KB |
| Contracts | `SwanMark3D.contract.test.ts`, `swanMarkPayload.contract.test.ts` | — |
| **Mounted at** | `frontend/src/components/Header/components/Logo.tsx:225` | — |

`swanMarkScene.ts` line 4: *"Deliberately React-free so the sizing policy, the render-on-demand
contract and disposal can be tested without mounting a component."*

Its public surface: `setSize(cssW, cssH)`, `setView(yaw, pitch)`, `setDrift(radPerSec)`,
`requestRender()`, `dispose()`, readonly `backing` and `stats`. Its `dispose()` cancels rAF,
disposes the swan, clears the scene, disposes the renderer, and calls
`renderer.forceContextLoss()`.

Two canvases by design: a detached WebGL scratch buffer blitted into a displayed 2D canvas via
`drawImage` + `imageSmoothingQuality = 'high'`, because the browser's compositor downscale is
measurably worse than the image resampler. The file carries browser-measured error tables
(mean max-channel error 4.758 compositor vs 3.979 drawImage at k=2) and documents that
`supersample` past ~2× is **actively harmful**, and that an earlier Python/LANCZOS model
concluded 4× and was wrong — *"only in-browser measurement caught it."*

Render-on-demand: the rAF loop runs **only while something moves**; a static logo costs zero GPU
when idle. Reduced motion is read synchronously into a ref, forced drift to 0, and a live
media-query listener honours a mid-session preference change. `three` and the 323 KB spec are
dynamically imported into their own chunks; a 128 px PNG holds the layout box until live.

**Measured dependency state (`frontend/`):** npm, `frontend/package-lock.json` v3, 1,061
packages. Resolved: react **18.3.1**, react-dom **18.3.1**, three **0.169.0**, framer-motion
**10.18.0**, styled-components 6.1.19, vite 5.4.19, typescript 5.9.3. **Absent:** `gsap`, `lenis`,
`motion`, `@react-three/fiber`, `@react-three/drei`.

**Measured consumers:**
- `useAnimationTier` / `useTierFlags`: **3 files** — its own definition, `About.V4.tsx`,
  `HomePage.V4.tsx`. (The plan says "twelve sections" and A3.n names "twelve sections".)
- `usePerformanceTier`: **1 file** — `LivingConstellation.tsx`.
- `motion-helpers.tsx`: **zero importers**. 170 lines of dead code.
- `PremiumParallax.tsx`: **zero mounted callers**. 680 lines. Defects are latent, not live.
- `components/ui-kit/cinematic/` (4 files): **34 importers** — this kit is live and widely used
  (`About.V3`, `ContactV3`, `StoreV3`, `SocialPage.V3`, `VideoLibraryV3`, `HomePage.V3` + 12
  sections).
- 385 files import `framer-motion`; 185 `motion.*` usages under `HomePage/`.

**`PerformanceTierProvider.tsx` line 127** reads `}, [forceTier, tier]);` while the effect body
calls `setTier` — the defect A2 exists to fix.

**Not measured:** production-build performance, Lighthouse, and baseline screenshots. **No
"before" number exists for any performance gate** in `07-checkpoints.md`.

---

## §8 — REQUIRED OUTPUT

Use this structure exactly. The splitters downstream depend on it.

```
## PART A — HOSTILE REVIEW OF THE PLANS
   (Axis 1: state of the art · Axis 2: attack the plans · R1–R3 assessment ·
    the §4 direction-decision question · new findings, each with a severity and a
    concrete replacement)
## PART B — FORGED REPLACEMENT PLAN
## PART C — DECISION-DENSITY SELF-TEST
```

**In PART A, for each finding give:** an ID · a severity (C/H/M/L) · one sentence · the plan
location · what is wrong · **what it should say instead** · your evidence tag.

**You MUST address, explicitly and by name:**
1. **The §4 direction-decision question.** Was the P1 rejection of "geode/particle field" made
   on evidence that excluded a stronger, already-built option? Answer plainly.
2. **R1 (delete GSAP)** — does cancelling A6 and deleting `PremiumParallax` create any problem
   the plan does not yet know about? Consider doctrine: `cinematic-pages.md` §7's GSAP clauses
   become unexercised.
3. **R2 (raw three, no R3F)** — rewrite `01-architecture.md`'s nine-file list, the R3F clauses
   in `06-bans.md`, and the A8/A9 slices around the shipped scene-controller pattern. **Then
   justify or attack your own P1 decision to mandate R3F in the first place.** What does the
   plan gain and lose by the pivot?
4. **R3 (adopt the subtree as reference)** — what should `02-wireframes.md` mine from
   `cinematic-tokens.ts` and the five variants, if anything? Note `Crystalline Swan` is already
   a named token preset in that file, and the plan's palette in `02-wireframes.md` was invented
   independently.
5. **Your own canonical tier policy (§5.2).** Stress-test it. It has never been attacked. The
   measured repo has `useAnimationTier` with **3** consumers, not twelve — is the vocabulary
   migration in `03-contracts.md` proportionate to that? What breaks on a device that reports
   `hardwareConcurrency = 4` and `saveData = true`? Is the `[1, 1.5]` DPR range in the signature
   contract justified when the shipped `SwanMark3D` uses `supersample = 2` with measured
   evidence that 2 is optimal and more is harmful?
6. **The 300-line file cap vs nine new files.** Is a 10-file boundary for one 720ms rotation
   over-built? What would the state of the art do?
7. **The measurement apparatus.** `09-tests.md` specifies CPU+GPU instrumentation across ten
   fresh mounts with disjoint timer queries. Is this proportionate? **Is it even achievable?**
   If not, what should replace it?
8. **`<3ms/frame` is undefined.** The adjudication records this. Define it properly, or delete
   the gate.
9. **The 720ms / −0.14 rad signature.** Attack the actual motion design. Is one Y-rotation of
   0.14 radians the state of the art for a hero signature in 2026?
10. **Ancestry.** The two most recent commits on this branch are *"docs(round 9c): reconcile the
    four planning contradictions Astra P3 #8 named"* and a containment fix. A **separate, later
    Astra consult (P3)** exists in this repo and is **not in this packet**. Does its existence
    change how this plan should be sequenced? Say what you would need to see.

**In PART B,** forge the replacement plan **only for what actually changed**: the R1 deletion
slice, the R2 raw-three rewrite of architecture/bans/slices, the R3 wireframe mining, and
whatever else PART A proves must change. Do not re-forge the B2 React 19 migration. Keep the
existing doc structure and filenames so it drops into the same package.

**In PART C,** self-test your own output for decision density, as you did in P1.

---

## §9 — CONSTRAINTS ON YOUR REPLY

1. **Do not explore the repository. Do not read files. Do not list directories. Do not run shell
   commands.** Everything you need is in this packet. If a fact is genuinely absent, mark it
   `[UNVERIFIED]` — that is a correct answer, not a failure.
2. **A read-only sandbox is expected and is not a blocker.** You cannot save artifacts or file
   reviews; the operator does both. Do not report it.
3. **Do not invent repo facts.** Where §7 does not cover something, say `[NEEDS-VERBATIM]`.
4. **Recommendations must name real, checkable products.** For licences, pricing models, current
   versions and peer ranges, mark your confidence — you cannot check a registry from here, and
   the plan already carries a standing rule that a "latest" table is not verification.
5. **Version currency:** your P1 reply recommended `framer-motion@11.18.2`. The plan now demands
   **`framer-motion` 12.x**. Check that against what you actually know; if the 12.x line does not
   exist or does not peer-cover React 18, say so — that would block slice B1a.
6. **Attack your own P1 decisions.** Three of them became binding. One of them (the tier policy)
   has never been stress-tested. The most valuable thing you can produce here is a defect in
   your own prior design.
7. **Be concrete and hostile.** "Consider reviewing X" is not a finding. Every finding gets a
   replacement.
