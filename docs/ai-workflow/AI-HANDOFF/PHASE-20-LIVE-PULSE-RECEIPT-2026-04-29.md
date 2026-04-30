# Phase 20 - Live Pulse - Canonical Surface Receipt 2026-04-29

> **Doc-only slice (Rule 26 prerequisite).** No code in this slice. Receipt classifies each Phase 20 surface so the implementation slice that follows has a Rule-26-compliant evidence base.
> **Date:** 2026-04-29
> **Author:** Claude Opus 4.7
> **Trigger:** Sean's Phase 19 closeout intent shifted from "preserve existing surfaces, omit unbacked decoration" to "make the mockup real by building missing logic." Phase 19 receipt's `omit-this-slice` decisions are being inverted into `build-or-wire` decisions per surface, sequenced as their own phases.
> **Stop-and-report condition:** if any surface in the spec table cannot fit into one of the four decision values defined below, halt and surface to Sean before coding.

---

## Section 1 - Status

**Verdict:** PRE-CODE RECEIPT ONLY. Runtime implementation remains blocked until Sean / Third Eye review returns APPROVE.

**Phase 20 scope (locked after Sean's Q1-Q4 decisions 2026-04-29):**
- Surface A: **Trending hashtags right-rail panel** - mount existing `TrendingHashtags` in the dashboard right rail. Placed between Top Badges and Next Best Action panels (Q3 answer (a)).
- Surface B: **Avatar glow ring + hex Level badge** - pure CSS visual upgrade reading existing `levelProgress.level`. Visible only on tabs that already render the ProfileHeader (matches `activeTab !== 'home'` existing behavior, Q4 answer (a)).
- Surface C: **Cinematic banner CSS treatment** - token-driven gradient + SVG aurora layer when `profile.bannerPhoto` is unset. Real banner photos still take precedence. Sean approved the CSS-only path for Phase 20 (Q2 answer (a)) AND requested the Seedance asset path be built in parallel as Phase 20C so he can choose between treatments at runtime.
- Surface D: **Dashboard Feed tab mobile responsiveness** - investigation-driven targeted fixes for `/user-dashboard` Feed tab at 375-414px viewports. Sean flagged the Feed tab as "not ultra mobile responsive" 2026-04-29; Phase 20 absorbs targeted CSS fixes if surgical (less than ~50 lines net), promotes to Phase 20E if structural restructure required.

**Phase 20C - Seedance Cinematic Banner Asset (queued, separate slice):**
- Generate a Seedance / NanoBanana banner asset that approximates the mockup mountain/swan/aurora imagery.
- Upload to R2 via the existing `scripts/upload-videos-to-r2.mjs` pattern (or image-equivalent).
- Add a feature toggle in `BackgroundSection` or a profile preference so a user (or admin globally) can choose between the CSS treatment and the asset treatment.
- Will produce its own Rule 26 receipt before implementation.

**Deferred from Phase 20 to follow-up phases (with reasons):**
- **Phase 20A: Activity Ticker Context Lift.** `useActivityTicker.ts:64` opens a socket per mount with no internal dedupe. Right-rail "Live Activity" requires either a cross-component refactor (ActivityTickerContext at V3 level + consumer rewrite in SocialFeed + HomeTab) OR accepting a 3rd socket per session. Both options are bigger than Tier 1 quick-win scope. Phase 20A handles this as a focused refactor.
- **Phase 20B: Crystal Voyager tier ladder expansion.** No `crystal_voyager` in `frontend/src/types/gamification.ts:29-49`. Five-tier ladder is `bronze_forge / silver_edge / titanium_core / obsidian_warrior / crystalline_swan`. Adding a sixth tier requires synchronized frontend type union + TIER_DISPLAY constant + backend tier-mapping update + level-threshold definition. Phase 20B handles this as a tier-system slice (frontend + backend).

**Other Tier-2 / Tier-3 surfaces (Reels Spotlight, Top Categories, XP Recent Events, Stories from the Garden, Active Challenge system, Mobile Inbox)** remain on the post-Phase-20 roadmap as named in the prior conversation summary. Each will get its own Rule 26 receipt before implementation.

---

## Section 2 - Phase 20 Visual Target Spec

For each Phase 20 surface, the four-column decision is:

- `existing-surface`: backed by an existing hook/component/route; just renders existing data.
- `lift-from-existing-mount`: existing data, but mounted differently to avoid hook duplication or fetch redundancy.
- `build-new-logic`: requires net-new backend / model / endpoint / hook to make the surface real (NOT in Phase 20 scope; deferred).
- `static-decorative`: pure CSS / SVG visual upgrade; no data dependency.

| Surface | Decision | Evidence |
|---|---|---|
| Trending hashtags right-rail panel | `existing-surface` (mount existing component) | `TrendingHashtags.tsx:38` defines self-fetching memoized component; `TrendingHashtags.tsx:42` calls `GET /api/social/hashtags/trending?limit=8`. Mounting in dashboard right rail does NOT duplicate the SocialFeed-compact path (compact does not render TrendingHashtags). One incremental fetch on dashboard load. |
| Avatar glow ring | `static-decorative` | Wraps existing `ProfileImageContainer` at `UserDashboard.V3.tsx:352`. Pure CSS box-shadow + gradient ring. No new data, no new hook, no JSX shape change to `ProfileImage`. |
| Hex Level badge on avatar | `existing-surface` | Reads `levelProgress?.level` already in V3.tsx scope at `UserDashboard.V3.tsx:185`. Renders the real value. No hardcoded number. Hex shape via CSS clip-path. |
| Cinematic banner CSS treatment | `static-decorative` | Modifies existing `BackgroundSection` styled component at `DashboardV3Styles.ts` to render a token-driven gradient + SVG aurora overlay when `$backgroundImage` is unset. Real `profile.bannerPhoto` continues to take precedence. No new data dependency. |
| Dashboard Feed tab mobile responsiveness | `existing-surface` (targeted CSS fixes) | Investigation-driven. Affects `SocialFeed.tsx` compact-variant rendering inside `/user-dashboard` Feed tab at 375-414px viewports. Specific fixes determined during implementation; bounded to less-than-50-line CSS changes. Structural restructure escalates to Phase 20E. No JSX restructure, no new components, no hook changes. |

---

## Section 3 - Canonical Surface Receipts

### Section 3.1 - Surface A: Trending Hashtags Right-Rail Panel

**Live URL:** `/user-dashboard` (any tab; right rail is global to the shell)

**Mount evidence:**
- Will render inside `ObservatoryRightRail` between Top Badges and Next Best Action panels.
- Component reuse only: `frontend/src/components/Social/Feed/TrendingHashtags.tsx` (existing).

**Consumer hook / fetch:**
- `TrendingHashtags.tsx:42` - `api.get('/api/social/hashtags/trending?limit=8')`.
- Self-fetches on mount, caches state locally. No new hook needed.

**Frontend API path string literal:**
- `/api/social/hashtags/trending?limit=8` at `TrendingHashtags.tsx:42`.

**Backend route match:**
- `backend/core/routes.mjs` mounts `app.use('/api/social', socialRoutes)` (per Phase 19 receipt Section 5).
- `backend/routes/social/index.mjs` mounts `router.use('/hashtags', hashtagsRoutes)` (assumed; will be verified at implementation Rule 31 sweep).
- Backend already serves this endpoint (TrendingHashtags renders successfully in SocialFeed full variant today).

**Authoritative model fields:**
- `weeklyCount`, `name`, `category`, `id` per `TrendingHashtags.tsx:27-32` `TrendingTag` interface.
- No new fields; consumer reads what backend already returns.

**Surface classification:** canonical primary (will be the only mount on the dashboard).

---

### Section 3.2 - Surface B: Avatar Glow Ring + Hex Level Badge

**Live URL:** `/user-dashboard` (renders inside the existing `ProfileHeader` when active tab != home).

**Mount evidence:**
- Modifies `ProfileImageContainer` styled component at `DashboardV3Styles.ts` to add concentric glow ring + outer gradient.
- Adds new `<HexLevelBadge>` styled component overlaid on the lower-right of `ProfileImage`.
- JSX edit at `UserDashboard.V3.tsx:352-368` (existing `ProfileImageContainer` JSX block) to add the hex badge child.

**Consumer hook (Level value):**
- `useGamificationData()` already mounted at `UserDashboard.V3.tsx:185`.
- `levelProgress?.level` already destructured in scope.

**Authoritative model fields:**
- `Gamification.level` per `Gamification.mjs:36` (cited in Phase 19 receipt Section 6).
- Falls back to `displayStats.level` (which falls back to `1`) for users with no gamification record.

**Surface classification:** existing-surface enhancement (not a new surface; visual refinement of an existing component).

---

### Section 3.3 - Surface C: Cinematic Banner CSS Treatment

**Live URL:** `/user-dashboard` (renders inside `ProfileHeader` BackgroundSection when active tab != home).

**Mount evidence:**
- Modifies `BackgroundSection` styled component at `DashboardV3Styles.ts` (declared with `$backgroundImage?: string` prop).
- When `$backgroundImage` is set: render the user's banner photo as today (no change).
- When `$backgroundImage` is unset/null: render a token-driven cinematic gradient + SVG aurora overlay. No raster image asset. No Seedance dependency.

**Data path:**
- `profile.bannerPhoto` per `User.mjs:69` (cited in Phase 19 receipt Section 6).
- Loaded into `backgroundImage` state at `UserDashboard.V3.tsx:201-203`.
- Passed to `BackgroundSection $backgroundImage={backgroundImage}` at `UserDashboard.V3.tsx:344`.

**Surface classification:** existing-surface enhancement (refines fallback rendering of an existing component).

---

## Section 4 - Logic Preservation List

The following must NOT change in Phase 20:

| Anchor | Locked behavior |
|---|---|
| `UserDashboard.V3.tsx:220-225` | Upload validation (5MB max, JPEG/PNG/WebP) |
| `UserDashboard.V3.tsx:244` | Blob URL revoke in upload finally block |
| `UserDashboard.V3.tsx:592-601` | EditProfileModal save path |
| `SocialFeed.tsx:570-581` | All 8 PostCard callbacks |
| `SocialFeed.tsx:343` | `variant?: 'full' \| 'compact'` prop semantics |
| `UserDashboardTypes.ts:81` | 5-tab `TabId` union unchanged |
| `useActivityTicker` mount count | Unchanged - Phase 20 does NOT add a third mount; deferred to Phase 20A |
| `useGamificationData` mount count | Unchanged - same single mount in V3.tsx |
| `useSocialFeed`, `useFaction`, `useParty` | Unchanged |

No new hooks. No new endpoints. No `TabId` mutation. No new theme presets. No backend edits. No fake surfaces.

---

## Section 5 - Implementation Footprint

| File | Status | Estimated change | Purpose |
|---|---|---|---|
| `frontend/src/components/UserDashboard/components/ObservatoryRightRail.tsx` | modified | +6 lines | Mount `<TrendingHashtags />` between Top Badges and Next Best Action panels. Wrapped in `<ObservatoryGlassPanel>` for visual consistency with the other 3 cards. |
| `frontend/src/components/UserDashboard/styles/ObservatoryRightRailStyles.ts` | unchanged or +N | possibly +5-10 | Optional: light wrapper styling around the embedded TrendingHashtags so its existing internal styles still feel native to the right rail. |
| `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` | modified | +30-50 lines | New `HexLevelBadge` styled component; updated `ProfileImageContainer` with concentric glow ring; updated `BackgroundSection` with token-driven gradient + SVG aurora fallback. |
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | modified | +3-5 lines | Add `<HexLevelBadge>{levelProgress?.level ?? 1}</HexLevelBadge>` JSX inside the existing `ProfileImageContainer`. No restructure. |
| `frontend/src/components/Social/Feed/TrendingHashtags.tsx` | unchanged | 0 | Reuse as-is; no internal modification. |

Estimated total: ~50-70 lines net add across 3 files. No new components extracted. No new test files (visual-only changes do not warrant unit tests; existing UserDashboardTokenAudit covers token discipline).

---

## Section 5.5 - Performance Scalability Requirements (Sean directive 2026-04-29)

The dashboard must hold visual quality across the full device spectrum:

| Tier | Device floor | Device ceiling | Visual budget |
|---|---|---|---|
| Low-end mobile | iPhone XR (414 portrait, A12 Bionic, 3GB RAM) | iPhone 12 / Pixel 6 | Minimal `backdrop-filter`, no animated motion above 60fps cost, prefer static SVG over animated, glow rings simplified to single-layer box-shadow, banner aurora as static SVG (no `transform` keyframes per frame) |
| Mid-range mobile / tablet | iPhone 13/14, iPad mini | iPhone 16 Pro Max, iPad Pro | Standard `backdrop-filter: blur(12px)` allowed, single-layer ambient motion OK, glow rings can use 2-layer box-shadow |
| Standard desktop | 1280-1920 viewport, integrated GPU | 1920-2560 viewport, dedicated GPU | Full `backdrop-filter` + glow + ambient motion + SVG aurora animation OK |
| High-end desktop | 2560-3840 4K | 3840+ ultrawide | Above + may include opt-in extra cinematic flourish (Phase 20C asset path is the eventual home for this) |

**Scaling strategy (applied in Phase 20):**

1. **Default-light, enhance-on-capable.** Start every visual at the simplest cost. Use `@media (hover: hover) and (pointer: fine) and (min-width: 1280px)` to enhance on mouse-driven desktop class. This naturally excludes touch devices from the heaviest treatments.
2. **`prefers-reduced-motion: reduce` honored everywhere.** Already standard in Phase 19 styles; Phase 20 surfaces extend the same discipline. Aurora animation is animated-static (CSS gradient at fixed phase) when reduced motion is requested.
3. **`backdrop-filter` only on existing glass panels.** Phase 20 does not introduce new `backdrop-filter` surfaces. Existing 4 glass panels (left rail nav, momentum cards, right rail panels) continue with their existing blur(12px) per Phase 19 spec.
4. **Glow ring rendered as static box-shadow, not animated.** A 2-layer box-shadow on `ProfileImageContainer` is GPU-cheap on iPhone XR. No keyframe animation on the ring itself.
5. **Hex Level badge is pure CSS clip-path + static gradient fill.** No motion. Reads value once.
6. **Cinematic banner aurora is static SVG with CSS-driven token colors.** No per-frame animation. On `prefers-reduced-motion: reduce` and on mobile `(hover: none) and (pointer: coarse)`, render an even simpler gradient with no SVG layer.
7. **Trending hashtags panel inherits SocialFeed's existing render cost.** No new layout cost beyond mounting.
8. **`contain: paint` and `contain: layout`** continue on glass panels and grid containers per Phase 19 patterns.

**Smoke verification matrix (post-deploy):**

- 414px (iPhone XR portrait, real device or DevTools throttled): visual budget satisfied, no scroll jank, ambient motion respected.
- 768px (tablet portrait): single-column, mobile-bottom-nav, no overflow.
- 1024px (tablet landscape / small laptop): two-column tablet layout per Phase 19 spec.
- 1280-1440px (standard desktop): full three-column observatory shell with all enhancements.
- 1920px (1080p desktop): visual headroom verified, no element stretches awkwardly.
- 2560px (QHD): same.
- 3440px (ultrawide) and 3840px (4K): max-width caps in place; content does not stretch indefinitely.

## Section 6 - Tier-A Strategy

1. Run targeted vitest for the existing UserDashboard / theme tests:
   - `UserDashboardTokenAudit.test.ts`
   - `ActivitySection.test.tsx`
   - `ProfileChartsGrid.test.tsx`
   - `UniversalThemeContext.themeCycle.test.ts`
2. Run `npm run build` to confirm no chunk-size regression > 50KB.
3. Optional: full `tsc --noEmit` with `NODE_OPTIONS=--max-old-space-size=16384`. Honesty per Rule 56: report `[VERIFIED]` only if it actually completes; otherwise carry the existing `[UNVERIFIED]` baseline forward.
4. Production smoke after deploy:
   - Visit `/user-dashboard` at 1280, 1440 (right rail visible).
   - Confirm Trending Hashtags panel renders below Top Badges and above Next Best Action.
   - Confirm avatar glow ring + hex Level badge appear on the profile/banner header (any tab except home).
   - Confirm cinematic banner gradient renders for users without a `bannerPhoto`; real banner photo continues to render for users with one set.
   - Cycle 3 themes; verify gradient + glow tokens repaint.
   - Zero new console errors / network failures.

---

## Section 7 - Success Criteria

- Trending hashtags panel renders in the right rail with real backend data.
- Avatar shows glow ring + hex Level badge with real `levelProgress.level` value.
- Cinematic banner CSS treatment renders when `bannerPhoto` is unset; real banner photo takes precedence when set.
- All Phase 19 spec rows still hold: no Crystal Voyager hardcode, no global +25 XP hardcode, no weekday completion dots, no decorative Top Categories label, no Reels Spotlight stats, no Strength Surge specifics, no persistent fake XP toast, no dead Inbox icon.
- Targeted vitest 4 files / 6 tests still green.
- `npm run build` passes.
- Production smoke clean at 1280 + 1440 for the new panel and the avatar/banner upgrades.
- Theme reactivity holds across the new surfaces.

---

## Section 8 - Out of Scope

- Live Activity rail panel (deferred to Phase 20A).
- Crystal Voyager tier ladder expansion (deferred to Phase 20B).
- Reels Spotlight, Top Categories shelf, XP Recent Events, Stories from the Garden, Active Challenge system, Mobile Inbox (deferred to dedicated phases per the post-Phase-19 roadmap).
- Backend changes of any kind.
- New theme presets (Phase 19A.3).
- Custom theme creator (Phase 19C).
- Full typecheck baseline recovery (recommended before Phase 20A / 20B).
- `UserDashboard-optimized.tsx` orphan deletion (Rule 38 cleanup-backlog).

---

## Section 9 - Pending Review Questions

1. Does Third Eye approve the three-surface Phase 20 scope (Trending hashtags rail + Avatar glow/hex Level + Cinematic banner CSS) with Live Activity and Crystal Voyager deferred to 20A and 20B?
2. Does Sean approve the cinematic banner CSS-only approach (token gradient + SVG aurora) instead of an image-asset approach (Seedance / NanoBanana hero asset)?
3. Does Sean want the Trending hashtags panel placed between Top Badges and Next Best Action (recommended), or in a different right-rail order?
4. Does Sean want the Avatar glow ring to be visible on ALL tabs (currently the ProfileHeader hides on the Home tab), or only on the tabs that already render the ProfileHeader?

---

**End of Phase 20 receipt.** Pre-code only. Runtime code untouched.
