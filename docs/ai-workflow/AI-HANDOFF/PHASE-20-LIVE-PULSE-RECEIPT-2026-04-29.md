# Phase 20 - Live Pulse - Canonical Surface Receipt 2026-04-29

> **Doc-only slice (Rule 26 prerequisite).** No code in this slice. Receipt classifies each Phase 20 surface so the implementation slice that follows has a Rule-26-compliant evidence base.
> **Date:** 2026-04-29
> **Author:** Claude Opus 4.7
> **Trigger:** Sean's Phase 19 closeout intent shifted from "preserve existing surfaces, omit unbacked decoration" to "make the mockup real by building missing logic." Phase 19 receipt's `omit-this-slice` decisions are being inverted into `build-or-wire` decisions per surface, sequenced as their own phases.
> **Stop-and-report condition:** if any surface in the spec table cannot fit into one of the four decision values defined below, halt and surface to Sean before coding.

---

## Section 1 - Status

**Verdict:** This is a **Rule 26 Canonical Surface Receipt** for the Phase 20 implementation slice. It is **NOT** a Rule 48 phase-close audit record. The Rule 48 Phase 20 audit record fires AT phase close when Sean explicitly declares Phase 20 complete (matching the Phase 19 close pattern at commit `ae4a69c74`). Anyone reading "Phase 20 receipt exists" should NOT pattern-match that as "Phase 20 closed."

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

**Scaling strategy (applied in Phase 20 - actual implementation):**

1. **Default-rich, simplify-on-touch.** The full visual treatment ships by default for every viewport that is not explicitly downgraded. `@media (hover: none) and (pointer: coarse)` strips the heaviest layers (drop-shadow on the hex badge, `::before` aurora overlay on the banner) so phones and tablets get a cheaper render. Mouse-driven desktops (mid-range and up) inherit the rich treatment. This is the inverse of a strict "default-light, enhance-on-capable" strategy and was a deliberate trade-off: the iPhone XR / Android-mid floor was protected by the simplify-on-touch query rather than by gating enhancements on min-width + pointer:fine. Receipt-and-code parity restored 2026-04-30 (Phase 20.1 hostile-review B2).
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

### Pre-deploy (commit-time gates)

- Trending hashtags panel mounts in the right rail markup with the boundary + Suspense scaffolding.
- Avatar Hex Level badge JSX renders only when `levelProgress?.level` is defined.
- Cinematic banner CSS treatment renders when `bannerPhoto` is unset; real banner photo takes precedence when set.
- All Phase 19 spec rows still hold: no Crystal Voyager hardcode, no global +25 XP hardcode, no weekday completion dots, no decorative Top Categories label, no Reels Spotlight stats, no Strength Surge specifics, no persistent fake XP toast, no dead Inbox icon.
- Targeted vitest 4 files / 6 tests still green.
- `npm run build` passes.

### Post-deploy (production smoke gates)

- Trending panel renders real backend data OR the boundary fallback OR the loading-state Suspense fallback (never a silent empty header).
- Hex Level badge appears with the real value on tabs that render the ProfileHeader (not on Home).
- Cinematic banner gradient renders for users without `bannerPhoto`; real banner photo unchanged for users with one set.
- Theme reactivity holds across 4-7 representative themes without reload.
- Zero new console errors / network failures.
- Captured screenshots at 414 / 1024 / 1280 / 1440.
- iOS Safari 16.2+ (and equivalent capable browsers) see the color-mix gradient stack; iOS <= 16.1 fall back to the flat-color first-declaration without invisible elements (`@supports` not strictly required because the cascade-fallback pattern handles it - see Section 5.5 #6).

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

## Section 8.1 - Hostile Review Disposition (Phase 20.1, 2026-04-30)

After the initial Phase 20 commit `784c81dfb`, a hostile code review surfaced four blockers and five high-priority findings. All addressed in the Phase 20.1 fix commit before any phase-close declaration.

| Finding | Severity | Resolution |
|---|---|---|
| **B1 - Silent-failure on Trending lazy chunk** | Blocker | `TrendingHashtagsBoundary` class component wrapping the `Suspense` block; visible "Trending unavailable right now." fallback when ChunkLoadError fires. Suspense fallback also upgraded to a "Loading trending..." message instead of `null`. |
| **B2 - Strategy doc contradicted code** | Blocker | Section 5.5 #1 rewritten to describe the actual "default-rich, simplify-on-touch" implementation rather than the inverse "default-light, enhance-on-capable" strategy. Code unchanged; doc-and-code parity restored. |
| **B3 - color-mix browser floor vs iPhone XR floor** | Blocker | Flat-color `background:` declared FIRST in `BackgroundSection` and `HexLevelBadge` as the iOS <= 16.1 fallback. The `color-mix` gradient stack follows on the next declaration; CSS cascade resolves to the supported declaration. No `@supports` block required because the property-cascade pattern handles it transparently. |
| **B4 - Phase-close audit record missing** | Blocker | This receipt is explicitly a **Rule 26 Canonical Surface Receipt** for the Phase 20 implementation slice. It is **NOT** a Rule 48 phase-close audit record. The Rule 48 Phase 20 audit record will be produced at phase close when Sean explicitly declares Phase 20 complete (matching the Phase 19 close pattern at `ae4a69c74`). Disclaimer added to Section 1 status block. |
| **H1 - Production smoke success criteria mismatched** | High | Section 7 split into pre-deploy (commit-time) and post-deploy (production smoke) gates. Production smoke is now correctly classified as a post-deploy verification gate, not a pre-commit success criterion. |
| **H2 - Two TrendingHashtags files not classified** | High | Classified per Rule 27 in Section 8.2 below. |
| **H3 - Sibling-sweep evidence missing** | High | `rg` output for `from '.*TrendingHashtags'` recorded in Section 8.3 below. |
| **H4 - Banner fallback drift to Wing Purple** | High | `--accent-secondary` fallback changed from `#4070C0` (Swan Lavender) to `#8B5CF6` (Wing Purple) is intentional and matches the project-wide convention. Documented in inline comment at the BackgroundSection declaration. |
| **H5 - Bottom fade fallback drift to Obsidian Black** | High | `--bg-base` fallback changed from `#002060` (old Royal Depth) to `#0A0A0F` (Obsidian Black) is intentional and matches the active dark-first theme. Verify smooth fade against light theme variants in production smoke; if visible band appears on `crystalline-light`, switch to `transparent` end-stop. |
| **M2 - Hex badge "1" flicker on data load** | Medium | Render guard added: badge only renders when `levelProgress?.level !== undefined`. Returning Level-N user no longer sees a confident "1" before real data resolves. |
| **M3 - pointer-events: none + screen reader** | Medium | `aria-label="Level X"` is on the badge node. Most screen readers announce labelled non-interactive elements; the visible text content is the label content. Acceptable for Phase 20.1; revisit in a dedicated a11y pass if NVDA/VoiceOver smoke surfaces issues. |
| **M4 - DashboardV3Styles.ts now 1,609 lines (Rule 4)** | Medium | Pre-existing debt worsened by Phase 20. Logged to Rule 38 cleanup-backlog. Future slice should split DashboardV3Styles.ts into `ProfileHeaderStyles.ts`, `BannerStyles.ts`, `AvatarStyles.ts`, `TabNavStyles.ts`, etc. Not in Phase 20 scope. |
| **M1, L1-L3** | Cosmetic / observational | Acknowledged. Hex polygon is stretched-pointy not regular (cosmetic, not regression). `prefers-reduced-motion` opacity halving on a static `::before` is a no-op rule that can be removed in a follow-up cleanup. |

## Section 8.2 - Two-TrendingHashtags Surface Classification (Rule 27 - resolves H2)

| File | Surface served | Classification | Consumers |
|---|---|---|---|
| `frontend/src/components/Social/Feed/TrendingHashtags.tsx` | Dashboard right rail (Phase 20) + SocialFeed full variant | **canonical for feed/dashboard surface** | `SocialFeed.tsx:28` (full variant, line 562); `ObservatoryRightRail.tsx` (Phase 20 lazy mount) |
| `frontend/src/components/Social/Hashtags/TrendingHashtags.tsx` | Social Explore + Feed Filter Bar | **canonical for hashtags surface** | `Social/Explore/ExploreView.tsx:41`; `Social/Hashtags/FeedFilterBar.tsx:52`; `Social/Hashtags/index.ts:13` (re-export) |

Both files are legitimate canonical surfaces serving different consumer chains. Neither is dormant. **Cleanup-backlog candidate (Rule 38):** rename to disambiguate (e.g., `FeedTrendingHashtags` and `HashtagsTrendingPanel`). Not in Phase 20 scope; future search-and-replace slice.

## Section 8.3 - Rule 54 Sibling-Sweep Evidence

Search command:

```
rg -n "from '.*TrendingHashtags'" frontend/src
```

Output (verified 2026-04-30):

```
frontend/src/components/Social/Explore/ExploreView.tsx:41:import TrendingHashtags from '../Hashtags/TrendingHashtags';
frontend/src/components/Social/Feed/SocialFeed.tsx:28:import TrendingHashtags from './TrendingHashtags';
frontend/src/components/Social/Hashtags/FeedFilterBar.tsx:52:import TrendingHashtags from './TrendingHashtags';
frontend/src/components/Social/Hashtags/index.ts:13:export { default as TrendingHashtags } from './TrendingHashtags';
```

Plus the Phase 20 lazy mount inside `ObservatoryRightRail.tsx` (not picked up by the import-statement regex because it uses dynamic `import()` syntax):

```
ObservatoryRightRail.tsx: const TrendingHashtags = lazy(() => import('../../Social/Feed/TrendingHashtags'));
```

Total surfaces touching TrendingHashtags components: 5 call sites across 4 distinct surfaces. None duplicate the right-rail fetch (compact SocialFeed at `SocialFeed.tsx:562` only renders TrendingHashtags when `variant === 'full'`).

## Section 9 - Pending Review Questions

1. Does Third Eye approve the three-surface Phase 20 scope (Trending hashtags rail + Avatar glow/hex Level + Cinematic banner CSS) with Live Activity and Crystal Voyager deferred to 20A and 20B?
2. Does Sean approve the cinematic banner CSS-only approach (token gradient + SVG aurora) instead of an image-asset approach (Seedance / NanoBanana hero asset)?
3. Does Sean want the Trending hashtags panel placed between Top Badges and Next Best Action (recommended), or in a different right-rail order?
4. Does Sean want the Avatar glow ring to be visible on ALL tabs (currently the ProfileHeader hides on the Home tab), or only on the tabs that already render the ProfileHeader?

---

**End of Phase 20 receipt.** Pre-code only. Runtime code untouched.

## Section 8.4 - Section 20.2 Closeout - Mobile + Trending Smoke Gaps 2026-04-30

Production smoke after `4e314f62d` surfaced four real findings beyond the hostile-review B1-B5 set. Phase 20.2 ships targeted fixes for three of them. SD2 (global asymmetric mobile gutter) is deferred as a cross-route layout investigation, not a feed-specific bug.

| Finding | Resolution |
|---|---|
| **Surface A.1 - Trending empty-data UX** | `TrendingHashtags.tsx` now accepts `showEmptyState?: boolean` prop. Default `false` preserves SocialFeed-full-variant behavior unchanged. Dashboard right rail passes `showEmptyState`, so the no-data case renders an honest "No trending hashtags yet." instead of leaving the panel header orphaned. Loading state (`loaded` state flag) prevents the empty message from flickering before the API resolves. |
| **Surface A.2 - Trending false affordance** | Removed `cursor: pointer` and `&:hover { opacity: 0.8 }` from `TagRow`. The rows had no click handler and no hashtag-filter route is wired - the affordance was a Rule 28 false-UI promise. If hashtag filtering ships later, restore the cursor + hover alongside the real onClick handler. |
| **SD1 - Mobile tab strip clipping at 375** | `TabNavigation` already had `overflow-x: auto` but lacked scroll-snap discipline. Added `scroll-snap-type: x proximity` + `overscroll-behavior-x: contain` to the strip; added `scroll-snap-align: start` to each `Tab`. New `@media (max-width: 414px)` breakpoint tightens tab padding from `0.75rem 1rem` to `0.625rem 0.75rem` and font-size from default to `0.85rem`. Min 44px touch target preserved. All five tabs now reachable at 375 portrait without page horizontal overflow. |
| **SD3 - Quick Stats vs Hex badge level mismatch** | Introduced `canonicalLevel = levelProgress?.level ?? stats?.level ?? 0` as the single source of truth used by BOTH the Sidebar Quick Stats card AND the Observatory hex Level badge. `displayStats.level` source updated from `stats?.level || 1` to `stats?.level ?? 0` so the no-data default is honest. The "Level 1" Quick Stats row no longer contradicts a "Level 0" hex badge for the same user. Inline `var(--text-secondary, #94a3b8)` Tailwind-slate fallback in the Sidebar replaced with Crystalline `rgba(224, 236, 244, 0.6)` Frost-White. |
| **SD2 - Global asymmetric mobile gutter** | DEFERRED. Body width 404 (vs viewport 414) and `right: 20` on outermost MAIN element are global dashboard layout behavior present across all routes at mobile. Not a feed-specific or Phase 20 regression. Logged for separate investigation phase covering UniversalDashboardLayout / page-level wrapper. |
| **SD4 - Post action row probe gap** | Logged as smoke-test gap. Not a code blocker - posts visually render at 375/414. Deeper probe in a future Surface D follow-up if action buttons turn out cramped at narrow widths. |

Files changed in Phase 20.2:
- `frontend/src/components/Social/Feed/TrendingHashtags.tsx` - empty-state prop, loading state, false-affordance removal, new `TagEmptyState` styled component.
- `frontend/src/components/UserDashboard/components/ObservatoryRightRail.tsx` - pass `showEmptyState`.
- `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` - tab scroll-snap + 414 padding breakpoint.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` - `canonicalLevel` source, Quick Stats Level row, inline Crystalline fallback.

Verification:
- Targeted vitest 4 files / 6 tests: pass
- `npm run build`: pass
- Full `tsc --noEmit`: still `[UNVERIFIED]` per Rule 56
- Production re-smoke at 375 / 414 / 1024 / 1280 / 1440 pending after deploy.
