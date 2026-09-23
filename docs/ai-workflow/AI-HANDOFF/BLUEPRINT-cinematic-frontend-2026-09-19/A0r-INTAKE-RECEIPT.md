# A0r — Reconciliation Intake Receipt

**Slice:** A0r (supersedes A0; see §0 for what A0 got wrong)
**Package:** `BLUEPRINT-cinematic-frontend-2026-09-19` / `P2-FORGED/`
**Authority:** `P2-FORGED/04-build-order.md` §A0r, items 1–10
**Mode:** read-only against `frontend/src`. No source file was created, edited, moved or deleted for this receipt.
**Taken:** 2026-09-21, session clock 21:10–21:14 PDT

---

## §0 — What this replaces, and why

A0 was executed against the **P1** package. P2 (`ASTRA-REPLY-P2.md`, 912 lines, 12/12 findings
confirmed) replaced A0's ordering, its addition set and several of its dependency edges. Three of
A0's own conclusions did not survive P2:

| A0 said | Reality |
|---|---|
| Praised `07-checkpoints.md#C4` ("lean/reduced requests no scene chunk") as a well-formed gate | **Unpassable as written.** The header independently pulls the three/spec chunks (`Header/header.tsx:14` → `Logo.tsx:17` → `Logo.tsx:225` → `SwanMark3D.tsx:154–157`). P2 `06-bans.md` now explicitly forbids the claim that this gate covers header-requested chunks. |
| Praised the `SwanMark3D` contract tests as evidence of a mature disposal pattern | **Source-text contracts cannot establish lifecycle correctness** (Astra F11). A file can contain `dispose()`, `cancelAnimationFrame()` and `forceContextLoss()` while calling them on the wrong resources. |
| Framed the plan as rejecting a stronger option "literally named for the project's own design language" | **Overstated.** `Crystalline Swan` is a **token preset**, not a sixth page (`cinematic-tokens.ts:2,92,123,127,154`). The defect survives; the amplification does not. |

A0 also recorded item 8 as PARTIAL and took no baseline. A0r takes it.

**A0r is not a new review.** It is the reconciliation P2 demanded before any slice runs: exact paths
and hashes, a P2→P3 conflict table, and an honest list of what could not be measured.

---

## §1 — Receipt 1: branch, HEAD, dirty state, worktree ownership

| Reading | Value |
|---|---|
| Branch | `creator-brains-engine-r2-20260915` |
| HEAD | `6e45e2392f2289f9c48e24d9c7f4dabe1f28c9a4` |
| HEAD commit | `fix(redact): round-9d — composition over original input, independent coverage inventory, fail-safe canary` |
| HEAD committed | 2026-09-21 12:18:37 −0700 |
| Dirty paths | **1,295** (`git status --porcelain \| wc -l`) |
| `.git/index.lock` | absent |
| Repo root | `<REPO>` |

**HEAD moved twice during this consult series.** A0 measured `fe388691fbfbcd9a23eba380c929ce1e10c9d736`;
P1's packet was built on `15a814e7a`; P2 landed on `6e45e239`. The dirty count moved with it
(1,129 → 1,272 → 1,295). **The receipt is the only place any of these numbers is load-bearing** — the
plan's contracts are path-and-symbol based, not commit-based, so HEAD drift does not invalidate the
package. It does mean any pre-change state used for rollback must be captured at slice start, not here.

### Worktree ownership

Three sibling worktrees exist. **None owns any cinematic-frontend path.**

| Path | Branch |
|---|---|
| `C:/tmp/ss-media-api` | `feat/media-api-2026-09-18` |
| `tmp/worktrees/brain-console-salvage-20260918` | (salvage) |
| `tmp/worktrees/swan-coach-astra-owned-20260906` | `codex/swan-coach-astra-owned-20260906` |

### Edited-path clearance

The nine cinematic target paths were checked against P3's blueprint directory (Receipt 2) and against
the three sibling worktrees. **No collision found.**

> **Missing evidence, stated plainly:** "dirty state = 1,295" is a count, not a clearance. I did not
> enumerate all 1,295 paths and match each against the nine cinematic targets. What I did instead is
> the check that actually matters: grep the exact target paths across the P3 blueprint tree and the
> sibling worktrees. **A full 1,295-path diff against the cinematic target list was not performed.**

---

## §2 — Receipt 2: P3 identifiers, hashes, affected paths, accepted decisions

### P3 is not what the name suggests

P3 is **not** the cinematic frontend workstream. It is the **creator-brains-console** workstream:

`docs/ai-workflow/blueprints/creator-brains-console-20260917/`

A nine-round Astra mega-consult (r3 → r9d). Its adjudication returned 16 findings (5 fixed, 11 held);
`19-held-findings.md` records five subsequently closed.

### Hashes (md5, first 16 hex chars — recomputed this session)

| File | md5[:16] | bytes |
|---|---|---|
| `17-astra-mega-packet-r9.md` | `70666fcb5b99c3af` | 219,876 |
| `17-astra-adjudication.md` | `0b189939c963f13c` | 8,473 |
| `08-slices-operations.md` | `310a181a439b21dc` | 6,873 |
| `07-traceability.md` | `0137bc0982d045fc` | 14,087 |
| `19-held-findings.md` | `a14b12e7fe38a0b9` | 12,727 |
| `14-decisions-20260918.md` | `9c2e5a1dc3d054f7` | 10,705 |
| `16-s1-hostile-review.md` | `7279d6cf84e538a6` | 67,482 |

> **Correction of the record.** The hashes carried in the P2-era notes for `08-slices-operations.md`
> and `07-traceability.md` (`b07c2e157434770f`, `ec89a4b22c858717`) **do not match** what these files
> hash to now. The files were edited in the r9d round after those hashes were taken. The table above is
> the current reading; the older values should be treated as stale, not as a second source.

### Affected paths — overlap is ZERO

All nine cinematic target paths were grepped across the entire P3 blueprint directory:

```
PremiumParallax · SwanMark3D · swanMarkScene · useAnimationTier
PerformanceTierProvider · HeroSection · HomePage.V4 · motion-helpers
HomePage/cinematic
```

**Result: 0 files.** A separate sweep for any `frontend/src/...` reference anywhere in P3's 40+
documents also returned **0**.

### What P3 does own

| Path | P3 involvement |
|---|---|
| `lib/registry.mjs` | `addCreator` contains the blocking `execFileSync` call at `lib/registry.mjs:109–112` |
| `lib/ytdlp.mjs` | `runOperation` is synchronous; `execFileSync` at `lib/ytdlp.mjs:184` |
| `lib/health-probe.mjs` | A1-10 off-thread health probe design |

### Accepted decisions that could reach the cinematic workstream

| P3 decision | Does it bind cinematic? |
|---|---|
| S1-H12 (event-loop starvation) | **No.** The finding is explicitly *"additive and console-side, NOT an engine change"* (corrected 2026-09-20, R2-06). It touches no frontend path. |
| Boundary: console-side changes are additive only | **Yes, as precedent.** Confirms the same additive discipline the cinematic plan already carries in `06-bans.md`. No conflict. |
| Engine files frozen for console work | **No conflict.** Cinematic touches zero engine files. |

**Conclusion for Receipt 2: P3 poses no blocking authority over the cinematic frontend.** An unrelated
P3 finding does not block the workstream — which is exactly what `04-build-order.md` says.

---

## §3 — Receipt 3: F / F-Alt token excerpts and variant→preset mapping

### Location

`frontend/src/pages/HomePage/cinematic/cinematic-tokens.ts` (359 lines). Ten exported token objects.

### The two under discussion

**Preset F — `enchantedApexTokens`** (id `'A'`, name `'Enchanted Apex'`, declared L94)

**Preset F-Alt — `crystallineSwanTokens`** (id `'B'`, name `'Crystalline Swan'`, declared L125)

`crystallineSwanTokens` (L125–151) **is the Crystalline Swan palette verbatim** and matches the
approved Swan token set exactly — midnight-sapphire `#002060`, ice-wing `#60C0F0`, gilded-fern
`#C6A84B`, frost-white `#E0ECF4`, wing-purple `#8B5CF6`, obsidian-black `#0A0A0F`.
**A0's `[NEEDS-VERBATIM]` marker is closed.**

### Variant → preset mapping (the part P2 asked to be pinned)

`VARIANT_TOKENS` (L345) maps `A | B | C`.
`NEW_VARIANT_TOKENS` (L351) maps the five named variants by slug.

| Variant `.tsx` | Imported token object | Preset |
|---|---|---|
| `ObsidianBloom.tsx` | `obsidianBloomTokens` (L180) | own |
| `FrozenCanopy.tsx` | `frozenCanopyTokens` (L215) | own |
| `EmberRealm.tsx` | `emberRealmTokens` (L246) | own |
| `TwilightLagoon.tsx` | `twilightLagoonTokens` (L280) | own |
| `NebulaCrown.tsx` | `nebulaCrownTokens` (L311) | own |

**Verified: each of the five variant `.tsx` files imports its own `*Tokens`. None imports
`crystallineSwanTokens`.** `VARIANT_TOKENS` maps `B → crystallineSwanTokens`, and **no `.tsx` imports
`VARIANT_TOKENS['B']`.**

**Crystalline Swan is a token preset with no page consumer.** It exists, it is correct, and nothing
renders it. This is the fact that corrected my own §4 framing in the P2 packet.

### Hazard found in this receipt

F-Alt assigns:

| Role | F-Alt value | Token | Doctrine |
|---|---|---|---|
| `secondary` | `#50A0F0` | Arctic Cyan | `design.md:53` — **"DATA ONLY — chart series. NOT buttons, NOT glow"** |
| `gaming` | `#60C0F0` | Ice Wing | documented as "gaming/action accent" |

**Adopting F-Alt verbatim would place a data-only token on an interactive role.**

This is not hypothetical. The shipped header logo glow already uses raw Arctic Cyan channel values:

`Header/components/Logo.tsx:111–127` — `drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))`, escalating to
`rgba(0, 217, 255, 0.9)` on hover. `rgba(0, 217, 255)` is **not a Swan token at all** — it is brighter
and greener than `#50A0F0`, and it sits inside the atmosphere where the closed-token rule is supposed to
hold.

**No banned hex anywhere in the cinematic subtree**: `#0a0a1a`, `#00FFFF`, `#7851A9` all absent.

---

## §4 — Receipt 4: CTA route → mounted hero → handler → orientation interface → submission contract

### The chain, end to end

```
HeroSection.tsx:22    interface HeroProps { ...; onOpenOrientation: () => void; }
HeroSection.tsx:136   <GlowButton colorScheme="accent" size="large"
                                 onClick={onOpenOrientation}>Find a Trainer</GlowButton>
HeroSection.tsx:135   <GlowButton colorScheme="primary" size="large"
                                 onClick={() => navigate('/signup')}>Join the Community</GlowButton>

HomePage.V4.tsx:52    const [showOrientation, setShowOrientation] = useState(false);
HomePage.V4.tsx:69    onOpenOrientation={() => setShowOrientation(true)}
HomePage.V4.tsx:106   {showOrientation && <OrientationForm onClose={() => setShowOrientation(false)} />}

orientationForm.tsx:23   interface OrientationFormProps { onClose: () => void; }
orientationForm.tsx:592  formData = { fullName, email, phone, healthInfo,
                                      waiverInitials, trainingGoals, experienceLevel }

orientationForm.tsx:727  authAxios.post('/api/orientation/signup',
                             {...payload, source: 'authenticated'})   // when user?.id
orientationForm.tsx:734  fetch('/api/orientation/submit', {
                             method: 'POST',
                             body: JSON.stringify({...payload, source: 'website'}) })  // otherwise
```

### Backend half

| Layer | File | Line |
|---|---|---|
| Mount | `backend/core/routes.mjs:368` | `app.use('/api/orientation', orientationRoutes)` |
| Alt mount | `backend/routes/api.mjs:50` | `router.use('/orientation', orientationRoutes)` |
| Router | `backend/routes/orientationRoutes.mjs` (138 L) | — |
| `POST /signup` | `orientationRoutes.mjs:23–43` | `protect` + express-validator (5 required fields) |
| `POST /submit` | `orientationRoutes.mjs:51–70` | **no auth middleware**, same 5 validators |
| Controller | `backend/controllers/orientationController.mjs` (593 L) | — |
| `orientationSignup` | `:48–100` | `Orientation.create({..., userId: req.user.id, status:'pending', source:'authenticated'})` → `successResponse(..., 201)` |
| `orientationSubmit` | `:108–180` | normalizes 5 fields, dedupes on lowercased email, `Orientation.create({..., userId: null, status:'pending', source:'website'})` → `successResponse(..., 200)`; duplicate returns the **same generic success** |
| Model | `backend/models/Orientation.mjs` | `tableName: 'orientations'` |
| `status` | `Orientation.mjs:59–63` | ENUM `pending\|scheduled\|completed\|cancelled`, default `pending` |
| `source` | `Orientation.mjs:76–80` | STRING, NOT NULL, default `'website'` |
| `experienceLevel` | `Orientation.mjs:47–50` | ENUM `Beginner\|Intermediate\|Advanced`, nullable |
| `userId` | `Orientation.mjs:51–58` | nullable FK → `users.id` (null for prospect submissions) |
| timestamps | `Orientation.mjs:86` | `timestamps: true` |

**Both endpoints share one contract.** `sendOrientationNotifications()` (`:186–310`) fires the same
user + admin email/SMS path for authenticated and public submissions; it does not branch on `source`.

### Conflict A — the plan's CTA copy does not exist in the shipped hero

| | Value |
|---|---|
| P2 plan verbatim | CTA `Book an orientation` |
| Shipped hero | `Find a Trainer` (`HeroSection.tsx:136`) |
| Plausible origin | The related function is `orientationSignup`; the related admin verb is "link" — `POST /api/orientation/:id/link-user` (`orientationRoutes.mjs:94`). "Book" appears in neither the controller nor the model. |

**Section replacement would silently introduce copy production has never shown.** Whether the plan
wants the new copy or wants the shipped copy is a product decision, not a reconciliation.

### Conflict B — the plan asserts a singular hero CTA; the shipped hero has two

P2 plan verbatim: *"No secondary hero CTA."*

Shipped (`HeroSection.tsx:135`): `Join the Community` → `navigate('/signup')` — a **second** hero CTA,
already present, already wired.

The plan's rule reads as a constraint on new work. Applied as written to the file it *does* delete the
existing `/signup` path's only hero entry point. Grep confirms `/signup` appears on **one** line in the
whole HomePage subtree — that line.

### Consistent, for the record

The hero's logo mark is `decorative` (`HeroSection.tsx:120`, `aria-hidden`), so the plan's
"decorative swan" clause is consistent with the shipped markup. `SwanMark3D` receives
`decorative alt="SwanStudios Logo"` from `Logo.tsx:225`, where an ancestor `LogoContainer` already
carries `role="button"` and `aria-label="Go to homepage"`.

---

## §5 — Receipt 5: provider mount scope and actual consumer inventory

### `useAnimationTier` — the two-file hook inventory

Defined: `frontend/src/hooks/useAnimationTier.ts` (58 L). Exports `AnimationTier`, `useAnimationTier`, `useTierFlags`.

| Consumer | Line |
|---|---|
| `frontend/src/pages/about/About.V4.tsx` | `:14` import, `:44` `useAnimationTier()`, `:45` `useTierFlags()` |
| `frontend/src/pages/HomePage/components/HomePage.V4.tsx` | `:14` import, `:50` `useAnimationTier()`, `:51` `useTierFlags()` |

**Three files total: the definition plus two consumers.** P2's `03-contracts.md` says exactly this —
*"The three-file hook inventory includes its definition. Do not call this a twelve-section hook
migration."* **Confirmed.**

### The classifier is `full | balanced | essential` — NOT `full | lean | reduced`

`useAnimationTier.ts:16` → `export type AnimationTier = 'full' | 'balanced' | 'essential';`

Thresholds, verbatim:

| Condition | Tier |
|---|---|
| `prefersReduced` | `essential` |
| `cores >= 8` | `full` |
| `cores >= 4` | `balanced` |
| otherwise | `essential` |

Initial state is **`balanced`** (L20), not `reduced`/`essential`. Resolution runs in a `useEffect`.

`useTierFlags` (L46–58): `showParallax`/`showParticles`/`showCharSplit` = `full` only; `showBlur`/
`showStagger`/`showHoverEffects`/`showGlow` = `!== essential`; `isEssential`, `isFull`.

**This makes three coexisting tier vocabularies in the repo:**

| Vocabulary | Where |
|---|---|
| `full \| lean \| reduced` | P2 `03-contracts.md` (canonical, planned) |
| `full \| balanced \| essential` | `useAnimationTier` (shipped) |
| `enhanced \| standard \| minimal` | `PerformanceTierProvider` (shipped) |

`03-contracts.md` says migrate the hook "as their actual contracts require", so this is a known
conversion, not a contradiction. **Recording it because the mapping is not 1:1:**
`balanced` must decide whether it becomes `lean`, and `essential` must decide whether it becomes
`reduced` — and the shipped `essential` conflates *low cores* with *prefers-reduced-motion*, which the
canonical vocabulary separates into `reduced` (preference) vs `lean` (capability).

### `PerformanceTierProvider` — mount scope and consumers

Mounted once, high in the tree: `frontend/src/App.tsx:244`, closing `:276`. It sits **above**
`UniversalThemeProvider`, `ConfigProvider`, `AuthProvider`, `FeatureAccessProvider`, `PaywallProvider`
and `ToastProvider` — i.e. above everything the home route can reach.

| Artifact | Path | Note |
|---|---|---|
| Provider | `frontend/src/core/perf/PerformanceTierProvider.tsx` | `:49` component def; `forceTier` prop supported (`:44`) |
| Context | `frontend/src/core/perf/PerformanceTierContext.ts` | — |
| Hook | `frontend/src/hooks/usePerformanceTier.ts` | `:37` def; `:42–43` **throws** outside a provider |
| Barrel | `frontend/src/core/perf/index.ts` | re-exports both |
| Test | `frontend/src/core/perf/PerformanceTierProvider.test.tsx` | existing |

**Actual consumers outside its own module and test: exactly one.**

`frontend/src/components/ui-kit/background/LivingConstellation.tsx:4` (import), `:124`
(`const autoDetectedTier = usePerformanceTier()`).

`hooks/index.ts:17` re-exports it; that is a barrel, not a consumer.

**So the "measured direct provider consumer" in `03-contracts.md` is `LivingConstellation`, and there
is exactly one.** Confirmed, and the number is 1.

### `ui-kit/cinematic` — 34-file claim re-measured

`frontend/src/components/ui-kit/cinematic/` contains **four** files, 367 lines total:
`ParallaxHero.tsx`, `ScrollReveal.tsx`, `SectionDivider.tsx`, `TypewriterText.tsx`.

Grep for `ui-kit/cinematic` across `frontend/src`: **72 import lines.**
**A0's "34 importers" was a distinct-file count of an earlier, narrower grep; the correct reading is
72 import statements across those four components.** No file count is disputed — the kit is four files.

---

## §6 — Receipt 6: controller construction signature, frame scheduling, backing, resource ownership

Controller: `frontend/src/components/SwanMark3D/swanMarkScene.ts` (281 L) + `sceneSupport.ts` (54 L).

### Construction signature

`createSwanMarkScene(opts: SwanMarkSceneOptions): SwanMarkScene` (`:99`). Options (`:58–76`):

| Option | Type | Default |
|---|---|---|
| `canvas` | `HTMLCanvasElement` | required — **the DISPLAYED canvas, owned by the caller** |
| `spec` | `SwanMarkSpec` | required |
| `supersample` | `number` | `2` |
| `minBacking` | `number` | `1` |
| `maxBacking` | `number` | `1024` |
| `maxPixelRatio` | `number` | `2` |
| `yaw`, `pitch`, `badgeDepth`, `relief` | `number` | — |
| `drift` | `number` | `0` |

**The five public methods P2's `03-contracts.md` says to retain — all exist, matching exactly:**
`setSize(cssW, cssH)`, `setView(yaw, pitch)`, `setDrift(radPerSec)`, `requestRender()`, `dispose()`.

Two additional **read-only** accessors exist today and are not in P2's retain list: `backing`
(`:87–95`, getter) and `stats: { triangles, facets }` (`:96`). Neither is a method; the contract does
not name them, and they are consumed by `SwanMark3D.tsx:145–147` to write
`data-swanbacking` / `data-swangl` onto the host.

### The P2 "proposed extensions" are correctly labelled — none exist

`beginReveal`, `onPresented`, `onError` are absent from `SwanMarkSceneOptions` and from the returned
object. P2 calls them *"proposed extensions, not claims about the current API."* **Accurate.**

### Frame scheduling

| Behaviour | Where |
|---|---|
| `draw()` renders, then blits `drawImage(glCanvas, …, canvas)` with `imageSmoothingQuality = 'high'` | `:162–170` |
| `requestRender()` **coalesces** — early-returns if `rafId !== 0` | `:172–178` |
| Continuous `tick` loop runs only while moving; `dt` clamped to `0.1 s` | `:183–191` |
| `setDrift(nonzero)` starts the loop once; `setDrift(0)` cancels and settles one final frame | `:193–205` |
| Loop starts at construction only if `driftRate !== 0` | `:207–209` |

**The controller alone owns rAF.** No timer in the caller. P2's clause *"The controller alone owns rAF
scheduling. The reveal sampler owns no timer"* describes the **target** state; the current controller
has one owner today, so the constraint is preservable.

### Backing calculation

```
dpr        = min(window.devicePixelRatio || 1, maxPixelRatio)       // :214
dispLong   = max(1, round(max(cssW,cssH) × dpr))                    // :219
dispShort  = max(1, round(dispLong × min(cssW,cssH) / max(cssW,cssH)))
g          = computeBacking(dispLong, 1, supersample, minBacking, maxBacking)   // :223
gShort     = max(1, round(g × dispShort / dispLong))
```

`computeBacking` (`sceneSupport.ts:45–54`):
`max(minBacking, min(maxBacking, round(cssSize × dpr × supersample)))`.

**A discrepancy worth recording.** P2's `03-contracts.md` derives scratch dimensions as:

```
supersample = min(2, 2048 / max(displayW, displayH), sqrt(4194304 / (displayW × displayH)))
scratchW    = floor(displayW × supersample)
```

The shipped code does not compute a derived `supersample`; it takes a scalar option (default `2`) and
clamps the **resulting edge** with `maxBacking = 1024`. The plan's formula caps **area** at 4,194,304 px²
and edge at 2048; the shipped code caps edge at 1024, which implies area ≤ 1,048,576 px².
**These are not the same policy.** The plan does say *"Treat supersample two as a candidate derived from
the existing method, not a proven hero-size optimum"* — which is honest — but the two formulas produce
different buffers for the same input, and `03-contracts.md` presents its version as a contract.

P2 also states *"Hero CSS dimensions are capped at 560×560, so this contract does not require a
supersample below one."* The plan's own DPR figures, as Astra's F08 found, already disagree with each
other (`[1, 1.5]` vs `≤2`).

### Resource ownership

| Resource | Owner | Disposal |
|---|---|---|
| Displayed canvas | **caller** (`canvas` option) | never disposed by the controller |
| Detached GL canvas | controller (`:115` `document.createElement`) | `forceContextLoss()` at `:268` |
| `THREE.WebGLRenderer` | controller (`:116`, `preserveDrawingBuffer: true`) | `renderer.dispose()` `:265` |
| Scene / camera / `swan` group | controller (`:136–144`) | `swan.dispose()` `:263`, `scene.clear()` `:264` |
| 2D context on the display canvas | controller (`:130`) | never explicitly released |

`dispose()` is idempotent via a `disposed` flag (`:259–260`), cancels the rAF, then tears down. **One
WebGL context per controller instance.** P2's *"No second hero WebGL context, second displayed hero
canvas, or extra scratch buffer"* is satisfiable with the existing design — one displayed 2D + one
detached WebGL, exactly as P2 permits.

`hasWebGL()` (`sceneSupport.ts:24–35`) probes **before** three is asked for a context and immediately
releases the probe context via `WEBGL_lose_context`. Good hygiene; unrelated to the hero.

### The reveal-sampler question

P2 calls for *"an opt-in finite reveal operation"* with `beginReveal` accepting *"the fixed home reveal
specification."* **No sampler, no reveal, and no such specification exists in the controller today.**
This is net-new construction, correctly labelled as such. The reveal's easing/curve values are exactly
what P2's A4 slice ("one motion-values module and CSS projection") is meant to own — so the
specification does not yet exist anywhere in the repo and must not be invented inside the controller.

---

## §7 — Receipt 7: exact R1 deletion allowlist, reference-checked

Target: `frontend/src/components/PremiumParallax/PremiumParallax.tsx` (681 L, sole file in its
directory; `export default PremiumParallax` at `:681`).

### Runtime importers of the component

```
grep -rn "PremiumParallax" --include=*.tsx --include=*.ts frontend/src
→ PremiumParallax.tsx:1   (its own path comment)
→ PremiumParallax.tsx:457 (own declaration)
→ PremiumParallax.tsx:681 (own default export)
```

**Zero external importers. Zero callers. The component is unmounted, not merely unused.** A6 is a
deletion with no consumer to migrate.

### Its dependency edges, checked one by one

| Import (`:2–11`) | Resolves to | Exclusive to PremiumParallax? | Verdict |
|---|---|---|---|
| `react` | node_modules | no | **stays** |
| `styled-components` | node_modules | no | **stays** |
| `framer-motion` | node_modules | no (385 importers) | **stays** |
| **`gsap`** | **node_modules — NOT INSTALLED** | — | **stays deleted** |
| **`gsap/ScrollTrigger`** | **NOT INSTALLED** | — | **stays deleted** |
| `react-icons/fa` | node_modules | no | **stays** |
| `../Button/glow` → resolves to `components/ui/buttons/GlowButton.tsx` | 71 importers | no | **stays** |
| `../../../../config/videoAssets` → `src/config/videoAssets.ts` | 24 importers (23 others) | no | **stays** |
| `../../../../assets/Logo.png` → 1,206,009 bytes | 37 importers (36 others) | no | **stays** |

### The verified allowlist

**`frontend/src/components/PremiumParallax/PremiumParallax.tsx` — one file. Nothing else.**

Every one of its nine import edges terminates in an asset or module with other consumers. There is no
exclusively-referenced style, asset, CSS URL, manifest entry, public-path reference or test fixture.
`06-bans.md` says *"A shared or unresolved asset stays in place"* — under that rule, **nothing joins the
allowlist.**

> **Correction of the record.** `PremiumParallax.tsx:9` imports
> `import { VIDEO } from "../../../../config/videoAssets";` — four levels up from
> `src/components/PremiumParallax/`, which lands **outside** `src/` and does not resolve as written.
> There is no `frontend/config/videoAssets.*`; the real file is `frontend/src/config/videoAssets.ts`
> (three levels up). This is a **pre-existing broken import path** in a file with no importers, so Vite
> never chases it and it has never surfaced. **It must not be "fixed" during A6** — repairing it would
> change the file being deleted, and deleting the file resolves it permanently. Recorded so a later
> reader does not treat it as a new defect introduced by this workstream.

### GSAP: the contradiction stands as A0 found it

`gsap` is **not in `package.json`** (no `dependencies` entry) and **not installed**
(`node_modules/gsap/package.json` absent). Grep for `from 'gsap'` across `frontend/src` returns
**exactly one line** — `PremiumParallax.tsx:5`.

**A6 deletes the only reference to an undeclared, uninstalled package. No install is required or
authorized.** `05-slices.md` A6 exit evidence: *"no GSAP install"* — satisfiable, and satisfied.

---

## §8 — Receipt 8: baseline build, type check, header resource counts

### Production build — **FAILED**, and the failure is environmental

`npm run build` → **EXIT=1**

```
vite v5.4.19 building for production...
✓ 6389 modules transformed.
x Build failed in 39.13s
error during build:
[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
  {"count":50,"threshold":50,"scope":"turn",
   "targets":["...\\frontend\\dist\\swan-tile-big.png"],"targetCount":1}
    at checkBulkDeleteGuard (.../node-safe-delete-shim.cjs:214:19)
    at emptyDir (.../vite/dist/node/chunks/dep-C6uTJdX2.js:17082:19)
    at prepareOutDir (.../vite/dist/node/chunks/dep-C6uTJdX2.js:65730:7)
```

**Vite compiled all 6,389 modules successfully**, then failed in `prepareOutDir` while emptying
`dist/`. The sandbox's `node-safe-delete-shim` intercepted the unlink with a 50-delete-per-turn guard
and `targetCount: 1` — a per-turn counter already spent.

**This is a sandbox artifact, not a repository defect.** No source file is implicated. **No build
baseline was obtained from a fresh compile.**

### What was measured instead — the existing `dist/` from a prior good build

I preserved `dist/` to `/tmp/a0r-dist-baseline-20260921` before it could be touched.

| Chunk | Bytes | KB |
|---|---|---|
| `dist/v3/index.D3dgaSvM.js` (entry) | 610,516 | 596 |
| `dist/v3/react-vendor.KKBzzUuA.js` | 206,338 | 201 |
| `dist/v3/three.module.WAXnx5F7.js` | 471,015 | 459 |
| `dist/v3/swan-mark.mesh.DH1ehJjj.js` | 297,213 | 290 |
| `dist/v3/icons-vendor.Dabs5jYT.js` | 127,169 | 124 |

**Header resource counts, read off the build the plan cares about:**

- `three.module` (**459 KB**) and `swan-mark.mesh` (**290 KB**) are **separate chunks** — the dynamic
  imports at `SwanMark3D.tsx:154–157` did their job. Neither is in the entry chunk.
- `SwanMark3D`'s own comment (`:153`) claims *"~600 KB"* for three and *"323 KB"* for the spec.
  Measured: **459 KB and 290 KB**. The comment overstates both. Harmless, but it is a number in a
  source comment that does not match the build.
- The entry chunk carries **596 KB** of JavaScript **before** three or the mesh are requested.

**Provenance:** `dist/v3/index.D3dgaSvM.js` is dated **2026-09-20 04:02:19 −0700**. That is **before**
the current HEAD (`6e45e239`, 2026-09-21 12:18:37). This is a **near-baseline, not a current baseline.**

### Type check — **PASSED, but only above the default heap ceiling**

Two runs, same command, different heap:

| Run | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | **EXIT=134 — OOM.** `FATAL ERROR: Ineffective mark-compacts near heap limit. Mark-Compact 4026.2 (4130.8) -> 4011.3 (4131.0) MB` |
| 2 | `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | **EXIT=0 — zero errors.** `grep -c "error TS"` → **0** |

**The tree type-checks clean. The default ~4 GB heap is simply too small for it.**

> **This is a prerequisite, not a pass, and the distinction matters.** `05-slices.md` A6 exit evidence
> requires D2 ("type/build") and the plan's other slices cite *"type check pass"* as exit evidence.
> A slice run with a plain `tsc --noEmit` — or with the plan's literal
> `node node_modules/typescript/bin/tsc --noEmit`, which inherits the same default heap — **will OOM
> and look like a failure that has nothing to do with the slice.** Whoever runs A6/A7 must set the heap
> ceiling first, or they will misread an environmental limit as a code defect.
>
> **Baseline established:** zero type errors at HEAD `6e45e239`. Any type error appearing after a slice
> is attributable to that slice — which is exactly what D2 needs and did not previously have.

Note also that run 1 reported **zero** `error TS` lines while exiting 134: **the OOM killed the compiler
before it emitted a single diagnostic.** An error count of 0 from a crashed process is not a clean bill
of health. Run 2 is the only reading that means anything.

### Initial LCP — **NOT MEASURED**

No production preview server was started, and — more importantly — **no Playwright cinematic config
exists.**

| Expected by the plan | Reality |
|---|---|
| `frontend/tests/cinematic/home.spec.ts` | **absent** — `frontend/tests/` does not exist |
| `frontend/tests/cinematic/signature.spec.ts` | **absent** |
| `frontend/tests/cinematic/motion-budget.spec.ts` | **absent** |
| `frontend/tests/cinematic/performance.spec.ts` | **absent** |
| `frontend/tests/cinematic/build-boundary.test.ts` | **absent** |
| `frontend/playwright.cinematic.config.ts` | **absent** |
| `frontend/src/core/perf/performanceTierPolicy.test.ts` | **absent** |
| `frontend/src/hooks/useAnimationTier.test.tsx` | **absent** |
| `frontend/src/core/perf/motionTokens.test.ts` | **absent** |

Existing infrastructure:

| Artifact | Path | Config |
|---|---|---|
| Playwright | `frontend/playwright.config.ts` | `testDir: './e2e'`, baseURL `http://localhost:5173`, three projects (Desktop Chrome, Mobile Chrome, API Tests), `webServer` starts backend `:10000` + `npm run dev :5173` |
| Playwright (alt) | `frontend/playwright.theme-lens.config.ts` | separate |
| Vitest | `frontend/vitest.config.ts` | `environment: 'jsdom'`, `include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}']` |

**All eight named test files and both named configs are planned, not present.** `05-slices.md`
already says *"All named tests are planned, NOT RUN in this consultation"* — **confirmed, and the
stronger statement is that they are planned and NOT YET WRITTEN.**

**Consequence:** `frontend/tests/cinematic/*` sits outside `vitest include` (`src/**` only), so those
tests need the Playwright config that does not exist; and `build-boundary.test.ts` would be a Vitest
test but is placed in a directory Vitest does not scan.

---

## §9 — Receipt 9: reference screenshots

> **Status: NOT TAKEN.**
>
> `04-build-order.md` item 5 requires desktop/375px reference screenshots for the selected Act-1
> composition; item 10 requires baseline screenshots.
>
> No screenshots were captured. The dev server was not started and no browser was driven. Combined with
> §8's finding that **`playwright.cinematic.config.ts` does not exist**, there is no configured path to
> capture them today.
>
> **What exists instead:** `frontend/e2e/screenshots/` (a prior harness directory) and
> `frontend/src/assets/user-dashboard/dashboard-export/open-design-reference-pack-2026-05-14/` — a
> dated design reference pack. Neither is an Act-1 reference capture at desktop and 375px.
>
> A7's exit evidence is *"H1–H3 pass; missing CTA receipt blocks wiring changes."* The CTA receipt is
> now complete (§4). **The reference screenshots are not, and A7's "reference-informed" premise is
> therefore unmet.**

---

## §10 — Conflict table: P2 requirement → P3 decision → resolution

`04-build-order.md` item 3 requires this explicitly, and adds: *"An unrelated P3 finding does not block
the whole workstream. Missing overlapping authority blocks only affected slices."*

| # | P2 requirement | P3 decision | Resolution |
|---|---|---|---|
| 1 | A8 extends the house raw-three controller (`swanMarkScene`) | S1-H12 touches `lib/registry.mjs` / `lib/ytdlp.mjs` (engine) | **No overlap.** Different trees entirely. |
| 2 | A0 `06-bans.md`: "No source-text assertion presented as runtime proof" | P3 `17-traceability.md` relies on source-text assertions for engine guards | **No conflict.** Different repositories' test conventions; the ban is scoped to this surface. |
| 3 | A2/A3 migrate the tier provider and hook | P3 A1-10 uses a worker-thread pattern for the health probe | **No overlap.** Different subsystems. |
| 4 | All nine cinematic target paths | 0 references anywhere in P3's 40+ documents | **No overlap.** Verified by grep, both directions. |
| 5 | Additive-only boundary for Home changes | P3 corrected itself to "additive and console-side, NOT an engine change" | **Agreement, not conflict.** Same discipline. |
| 6 | A6 deletes `PremiumParallax` | P3 has no frontend deletion scope | **No overlap.** |
| 7 | A0r item 8 needs baseline screenshots | P3 captured no cinematic baselines | **Gap shared, not authority.** Neither workstream holds one. |
| 8 | `frontend/src/...` paths | zero in P3 | **No overlap.** |

**Result: zero conflicts. Zero missing overlapping authority.** The single repeated theme is that P3
and the cinematic workstream do not touch the same files, which is the outcome `04-build-order.md`
anticipates with *"An unrelated P3 finding does not block the whole workstream."*

---

## §11 — What this receipt does NOT establish

Stated plainly, because P2's item 9 requires an explicit missing-evidence list and Rule 73 asks for
current-session evidence before anything is called done.

| Not established | Consequence |
|---|---|
| **Clean `tsc --noEmit`** | **NOW ESTABLISHED** — zero errors at HEAD `6e45e239`, but only with `--max-old-space-size=8192`. See §8. |
| **Fresh production build** | §8. The sandbox guard blocked `prepareOutDir`; all baseline chunk sizes come from a 2026-09-20 build that predates HEAD. |
| **Header resource counts on the current tree** | §8. Measured on a one-day-stale artifact. |
| **Initial LCP** | §8. Not measured; no cinematic Playwright config exists. |
| **Baseline screenshots (desktop + 375px)** | §9. Not taken. |
| **Act-1 reference composition provenance** | §9. A7's premise. |
| **Full 1,295-path diff vs. the nine cinematic targets** | §1. I grepped paths instead of enumerating the dirty set. |
| **Runtime lifecycle correctness of the controller** | §6. Astra F11 stands: source-text contracts cannot establish it. Only a browser run can. |
| **Whether `balanced`→`lean` and `essential`→`reduced` is 1:1** | §5. The mapping is lossy; no slice has ruled on it. |

---

## §12 — Findings that required Sean's ruling before A7 — **RULED 2026-09-21**

Not contradictions in the plan — decisions the plan makes implicitly that production already answers
differently.

> **All four ruled by Sean 2026-09-21. These are BINDING and gate A7.**

1. **CTA copy — RULED: keep `Find a Trainer`.** Production wins. The plan's `Book an orientation` is
   recorded as a **P1 drafting error** written without sight of the shipped page. **No copy change is
   authorized.** A7 adopts the shipped string as the contract.

2. **Secondary hero CTA — RULED: keep BOTH CTAs.** The plan's *"No secondary hero CTA"* is recorded as
   an **error**. Removing `Join the Community` → `/signup` would delete the home page's only signup
   entry point — a real conversion loss, not a cleanup. Both CTAs stay live; A7 applies the plan's
   *motion-restraint* intent to them **without removing either**. The clause is re-read as motion-only.

3. **F-Alt token roles — RULED: enforce DATA ONLY.** `#50A0F0` (Arctic Cyan) must **not** be assigned
   to any interactive role — no buttons, no glow, no focus ring. Interactive accents use
   **gilded-fern `#C6A84B`** or **ice-wing `#60C0F0`**. The shipped header logo glow leaking raw
   `rgba(0,217,255)` is **in scope for A7** and must be replaced with a Swan token. F-Alt's
   `secondary` role binding is superseded by this ruling.

4. **Backing-size policy — RULED: keep the shipped `maxBacking = 1024` clamp.** A8 verifies the
   **shipped** scalar-plus-edge-clamp behaviour and records the plan's derived-supersample formula
   (edge 2048, area 4,194,304 px²) as **superseded**. Raising the cap to 2048 would as much as
   quadruple per-hero buffer memory on high-DPR displays with no measured benefit. Effective
   contract: **edge ≤1024, area ≤1,048,576 px².**

<details>
<summary>Original §12 text as written before the ruling (for the record)</summary>

1. **CTA copy.** Plan says `Book an orientation`; production says `Find a Trainer`. Restore, or adopt?
2. **Secondary hero CTA.** Plan says *"No secondary hero CTA."* Production has `Join the Community` →
   `/signup` on `HeroSection.tsx:135`, and it is the only `/signup` entry point in the HomePage
   subtree. Keep both, or is the plan's clause intended to remove it?
3. **F-Alt token roles.** `secondary: '#50A0F0'` is Arctic Cyan, which `design.md:53` marks
   **DATA ONLY — NOT buttons, NOT glow**. Adopting F-Alt verbatim puts a data-only token on an
   interactive role. The shipped header logo glow already leaks raw `rgba(0,217,255)`, which is not a
   Swan token at all.
4. **Backing-size policy.** The plan's derived-supersample formula (area cap 4,194,304 px², edge cap
   2048) and the shipped scalar+edge-clamp policy (`maxBacking = 1024`) produce different buffers for
   the same input. Which is the contract?

</details>

---

## §13 — Reconciliation status

| Item | Status |
|---|---|
| 1. Branch / HEAD / dirty / worktrees / path clearance | **MEASURED** (path clearance by grep, not full diff) |
| 2. P3 identifiers, hashes, paths, decisions | **COMPLETE** — 2 stale hashes corrected |
| 3. Conflict table | **COMPLETE** — 8 rows, zero conflicts |
| 4. F / F-Alt excerpts + variant→preset map | **COMPLETE** — plus one hazard, one closed marker |
| 5. Reference screenshots | **NOT TAKEN** |
| 6. CTA → hero → handler → orientation → submission | **COMPLETE** — 2 conflicts |
| 7. Provider mount scope and consumer inventory | **COMPLETE** — 2 consumers of the hook, 1 of the provider |
| 8. Controller signature / scheduling / backing / ownership | **COMPLETE** — 5 retained methods confirmed present |
| 9. Exact R1 deletion allowlist | **COMPLETE** — one file, zero exclusive assets |
| 10. Baseline build / type check / header counts / LCP | **PARTIAL** — type check **PASSED** (8 GB heap), header counts yes, build blocked by sandbox, LCP no |

**A0r can be called complete for items 2, 3, 4, 6, 7, 8, 9.** Item 10 is half-established: **the type
check now has a clean baseline** (`EXIT=0`, zero errors), the header resource counts are measured, but
the production build and the LCP reading both require infrastructure that does not yet exist. Items 1
and 5 remain partial.

**Carry-forward prerequisite:** every slice whose exit evidence includes a type check must export
`NODE_OPTIONS=--max-old-space-size=8192` first, or it will OOM and be misread as a defect.

The four items in §12 are Sean's to rule on.

**No implementation slice was run, and no `frontend/src` file was touched, during this intake.**
