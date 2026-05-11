# User Dashboard Tab Navigation Bug + Cover Photo Crop — Opus/Codex Debate

**Date:** 2026-05-10
**Builder:** Claude Opus 4.7 (CEO)
**Status:** PRE-CODE — Receipt v2 (corrected) + Hypothesis ready for AI Village (15-brain) → Gemini → Codex review chain
**Surface:** `/user-dashboard` (user dashboard, ProtectedRoute)

---

## ROUND 1 — Opus opening (no code written yet)

### 1. User-reported symptoms (verbatim, Sean 2026-05-10)

- From the user dashboard Home tab, clicking **Feed** navigates to the Feed view but then "I can't click on any of the other tabs. They become inoperable."
- Same symptom when clicking **Progress** from home, and **Community** from home.
- Cover/banner photo: Sean uploaded a portrait photo and "only shows like the chest of the two people standing there. It's not showing the whole picture." Wants resizing/repositioning, or a split-banner layout (two images side-by-side).
- Broader directive: scan the dashboard surface for ANY bugs / UI-UX issues / dead buttons / missing logic so the surface lands at "Facebook / Instagram / TikTok / YouTube / Nextdoor / Twitch level." Workout/health focus, with creative arts (dance, art, singing, modeling) integrated.

### 2. Canonical Surface Receipt v2 (Rule 26) — CORRECTED

The original Round-1 draft cited `pages/UserDashboard.V3.tsx`. **That path is wrong.** The canonical file lives in `components/UserDashboard/`. Verified:

| Layer | File | Evidence |
|---|---|---|
| Route mount | [main-routes.tsx:359-363](frontend/src/routes/main-routes.tsx#L359-L363), [:803](frontend/src/routes/main-routes.tsx#L803) | `lazyLoadWithErrorHandling(() => import('../components/UserDashboard/UserDashboard.V3'))`; mounted JSX at line 803. |
| Page JSX (CANONICAL) | [UserDashboard.V3.tsx:1-687](frontend/src/components/UserDashboard/UserDashboard.V3.tsx) | CANONICAL — verified mounted (not just imported). |
| Tab state | [UserDashboard.V3.tsx:203](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L203) | `const [activeTab, setActiveTab] = useState<TabId>('home');` |
| **Observatory shell wrap** | [UserDashboard.V3.tsx:380-650](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L380-L650) | **NEW FINDING:** Everything below renders inside `<ObservatoryShell>` which has its own children layout. |
| Observatory grid layout | [ObservatoryShellLayoutStyles.ts:19-42](frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts#L19-L42) | 1024px+ adds left rail; 1280px+ adds right rail; <1024px is single column. |
| Observatory left-rail nav | [ObservatoryLeftRail.tsx:77-90](frontend/src/components/UserDashboard/components/ObservatoryLeftRail.tsx#L77-L90) | **2nd nav surface** — sticky on desktop (>=1024px), 5 tab buttons identical to in-tree TabNavigation. |
| Observatory mobile nav | [ObservatoryMobileNav.tsx:36-73](frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx#L36-L73) | **3rd nav surface** — bottom-fixed on <1024px. **Only 4 buttons: Home / Reels / Create / Profile. Progress and Community are MISSING from mobile bottom nav.** |
| In-tree TabNavigation | [UserDashboard.V3.tsx:578-604](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L578-L604) | The 5-button strip Sean is reporting on. Lives **inside** `<MainContent>` inside `<ContentGrid>` inside `<ObservatoryMain>` inside `<ObservatoryShell>`. |
| Tab panels | [UserDashboard.V3.tsx:608-647](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L608-L647) | Conditional `activeTab === 'X' && <Panel/>` pattern inside `<Suspense>`. |
| ProfileHeader conditional | [UserDashboard.V3.tsx:394](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L394) | `{activeTab !== 'home' && <ProfileHeader …>}` |
| Sidebar conditional | [UserDashboard.V3.tsx:521](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L521) | `{activeTab !== 'home' && <Sidebar …>}` |
| TabNavigation styling | [DashboardV3Styles.ts:1519-1555](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts#L1519-L1555) | NO `position: sticky`, NO `z-index`. |
| MainContent wrapper | [DashboardV3Styles.ts:1498-1517](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts#L1498-L1517) | `motion.div`, `overflow: hidden` — would prevent sticky from working without remediation. |
| BackgroundSection (cover photo) | [DashboardV3Styles.ts:240-287](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts#L240-L287) | `height: 320px`, `background: url(...) center / cover no-repeat`. No object-position knob. |
| Backend banner field | [User.mjs:69](backend/models/User.mjs#L69), [profileRoutes.mjs:63-110](backend/routes/profileRoutes.mjs#L63-L110) | `bannerPhoto: VARCHAR(255)` exists. No `bannerObjectPosition` column. |

### 3. Surface Classification Table (Rule 27)

| File | Status | Evidence |
|---|---|---|
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | **canonical** | `main-routes.tsx:360` lazy import; line 803 JSX mount. |
| `frontend/src/components/UserDashboard/UserDashboard.tsx` | **legacy fallback** | only loaded if V3 import fails (`main-routes.tsx:362`). |
| `frontend/src/components/UserDashboard/UserDashboardV3.tsx` (no dot) | **dormant** | exists but not referenced from any active route mount. |
| `frontend/src/components/UserDashboard/UserDashboard-optimized.tsx` | **dormant** | exists but not referenced. |
| `frontend/src/components/UserDashboard/components/ObservatoryShell.tsx` and rails | **canonical** | wrapped around the V3 page; verified via the line-380 JSX. |

No competing canonical surfaces. The four `UserDashboard*.tsx` siblings need a separate hygiene pass (Rule 32) — flagged in the post-task hygiene section.

### 4. Failure-mode analysis — corrected with ObservatoryShell context

**The original Round-1 hypothesis was directionally right but missed the three-nav-surface architecture.** Real picture:

- **>=1024px desktop** — three nav surfaces:
  1. Left rail nav (sticky `top: 1rem`, always visible) — 5 tabs.
  2. In-tree TabNavigation (inside ObservatoryMain → MainContent → ContentGrid) — 5 tabs, NOT sticky.
  3. (No mobile bottom nav at this width.)
- **<1024px tablet/mobile** — two nav surfaces:
  1. In-tree TabNavigation (5 tabs) — moves with ProfileHeader scroll.
  2. Mobile bottom nav (fixed) — **only 4 items: Home / Reels / Create / Profile.** Progress and Community CANNOT BE REACHED from the mobile bottom nav at all.

**[HYPOTHESIS] (Rule 51) — primary root cause, refined:**

When Sean clicks Feed/Progress/Community from Home:
1. ProfileHeader mounts (320px tall on desktop, smaller on mobile).
2. The page reflows by ~320px+ vertically.
3. Sean's mouse / eye are still pointing at the old in-tree-TabNavigation position (now empty space above ProfileHeader).
4. The in-tree TabNavigation has scrolled below the fold OR Sean reads the empty top of the page as "tabs are gone."

**On desktop (>=1024px):** Sean still has the sticky left rail to navigate back. Why does he report tabs as "inoperable"? Either (a) he's not noticing the left rail, (b) the left rail also becomes blocked somehow, or (c) Sean is testing on a viewport <1024px (laptop with narrower window, or mobile testing).

**On mobile (<1024px):** The in-tree TabNavigation is the ONLY way to reach Progress and Community. After ProfileHeader mounts, the TabNavigation is well below the viewport fold. The mobile bottom nav cannot help. This matches "inoperable" exactly.

**Probe to confirm (Rule 55):** Sean should test at 1440px desktop, 768px tablet, and 414px iPhone XR portrait. The mobile case should reproduce the bug deterministically; the desktop case may not (left rail provides escape hatch).

### 5. Secondary findings (informational, surface during this trace)

1. **Mobile bottom nav drops Progress and Community.** [ObservatoryMobileNav.tsx:36-73](frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx#L36-L73). On mobile, those two tabs are reachable ONLY through the in-tree TabNavigation. If that scrolls out of view, mobile users are stranded.
2. **Mobile "Reels" CTA navigates to `/social/reels`** but the tab strip has no Reels — different IA on different viewports. Need to verify `/social/reels` is mounted and live, not a dead route.
3. **Mobile "Create" CTA sets activeTab to 'feed'** ([ObservatoryMobileNav.tsx:58](frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx#L58)) — assumes feed panel exposes a Create Post card. Need to verify SocialFeed in `compact` variant actually surfaces a CreatePostCard.
4. **`MainContent` has `overflow: hidden`** ([DashboardV3Styles.ts:1503](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts#L1503)) — this prevents `position: sticky` from working on TabNavigation if applied naively. Needs handling in the fix.
5. **Four sibling files** at `components/UserDashboard/UserDashboard*.tsx` (V3, V3-without-dot, legacy, -optimized). Hygiene scan candidate (Rule 32) — out of scope for THIS slice but flagged.
6. **`HexLevelBadge` reads `levelProgress?.level` and renders only when defined** ([UserDashboard.V3.tsx:429-433](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L429-L433)) — good, but verify the hex z-index doesn't sit over the new sticky tab strip.
7. **`profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'User'`** ([line 451](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L451)) — `||` precedence trap. If `profile.role === ''`, the expression becomes `'' || 'User' === 'User'`, fine. If `profile.role === undefined`, `undefined.charAt(0)` throws. Need null-safe chain. **Defect candidate.**
8. **`alert('Profile link copied to clipboard!')`** ([line 326](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L326)) — using the native browser `alert()` for a toast. Below enterprise-app polish bar (rule 22). Should be a styled Crystalline toast.

### 6. Cover photo crop analysis — confirmed

[BackgroundSection at DashboardV3Styles.ts:240-287](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts#L240-L287):

- `height: 320px` (fixed).
- `background: url(${$backgroundImage}) center / cover no-repeat` — fixed center, no user-side reposition.
- No `object-fit` (because this is CSS background-image, not `<img>`).
- For a portrait photo of two standing people: image scales so its narrow dimension (width) fills the 320px height. Then center-cropped horizontally. Result: only the vertical-center band of the photo shows — torso/chest level. Exactly Sean's report.

### 7. Proposed fixes — refined for the Village + Codex chain

#### Fix A — Tab bar reachability (PRIMARY)

Three options, ordered by invasiveness:

- **A1 (minimal):** Add `position: sticky; top: 0; z-index: 50;` to TabNavigation. Remove `overflow: hidden` from MainContent.
- **A2 (cleaner IA):** Move the TabNavigation JSX out of MainContent, place it above ProfileHeader, sticky to ContentWrapper. Eliminates the layout shift entirely.
- **A3 (mobile-completeness, NEW):** Also fix the mobile bottom nav so Progress and Community are reachable. Either: (a) replace Reels with a 5-tab dock matching the in-tree set, (b) add a "More" overflow that opens a sheet listing Progress + Community, or (c) accept Reels and Create CTAs but ensure Progress + Community are present somewhere persistently visible on mobile (e.g. a sticky in-tree tab bar).

**Recommendation pre-Village:** A2 + A3-c (sticky in-tree tab bar via A2 makes A3 partly redundant — Progress/Community become reachable on mobile through the now-always-visible sticky tab strip). A1 is the smaller patch.

#### Fix B — Cover photo crop (Sean's request)

- **B1 (smallest):** Switch from CSS background-image to an `<img>` element with `object-fit: cover` + a `data-position` state stored on the user model (`bannerObjectPosition VARCHAR(32) DEFAULT 'center center'`). Show a small "Reposition" pencil overlay when banner is uploaded. Five preset positions (top, center, bottom, left, right) covers 90% of cases; full free-positioning is a follow-up.
- **B2 (split layout, Sean's idea):** Add a "Split banner" toggle — render two `<img>` slots side-by-side in `grid-template-columns: 1fr 1fr`. Each slot independently uploaded and positioned. Backend needs `bannerPhoto2 VARCHAR(255)` field.
- **B3 (combined):** Ship B1 first. B2 as a v2 if Sean still wants split banners after B1 ships.

**Recommendation pre-Village:** B1 first.

### 8. Scope, scope-locks, what this fix WILL NOT touch

- **WILL touch:** [UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx), [DashboardV3Styles.ts](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts), [ObservatoryMobileNav.tsx](frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx), [ObservatoryShellLayoutStyles.ts](frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts) (if A2 needs grid changes), and for B1: [User.mjs](backend/models/User.mjs), a new migration, [profileRoutes.mjs](backend/routes/profileRoutes.mjs), [profileService.ts](frontend/src/services/profileService.ts), [useProfile.ts](frontend/src/hooks/profile/useProfile.ts).
- **WILL NOT touch:** SocialFeed.tsx, HomeTab.tsx, CommunityTab.tsx, observatory left/right rails (their nav already works), or the routing tree.
- **Per Rule 60 next-slice:** Slice 1 = tab nav fix (A2 + sticky behavior + mobile-nav reachability for Progress/Community). Slice 2 = cover photo position control (B1). Slice 3 (if Sean wants) = split banner (B2).

### 9. Risk / what could break

- Removing `overflow: hidden` from MainContent: low risk. Verify no nested motion.div animation depends on x-axis clipping.
- Sticky `z-index: 50` could overlap modals or dropdowns inside the dashboard. Need to verify modal z-indices (BadgeDetailModal, ReportPostModal, ProfileEditModal) are higher.
- Restructuring TabNavigation out of MainContent (A2) could affect motion.div enter/exit animation feel. Mitigate by keeping motion.div on the panel, not the bar.
- `<img>`-based banner (B1) needs `object-position` to be sanitized on the backend (it lands in CSS — XSS surface if not validated). **Whitelist enum** of preset strings is safer than allowing free `\d{1,3}% \d{1,3}%` until explicitly approved.
- B1 schema change requires a migration. Per Rule 42, run pre-push backend audit and verify both `addColumn` migration files AND model field declaration are committed before push.
- Mobile-nav restructure (A3): if a 5-tab dock replaces the 4-button dock, the visual density changes — verify each tab still meets the 44px touch target at 320px width.

### 10. Verification plan (pre-merge)

- **Tier-A:** add a vitest test that mounts UserDashboard.V3 with `activeTab` toggled across all 5 tabs, asserts TabNavigation element's `getBoundingClientRect()` `top` is always within `[0, viewport_height - 44]` (i.e. tab strip stays in viewport).
- **Manual smoke (Sean local):** home → feed → home → progress → home → community, verify tab bar visible & clickable at every step at 320 / 414 / 768 / 1024 / 1440 / 1920px.
- **Tier-B (Gemini → Codex):** consult on the corrected receipt + fix plan after the Village's findings are incorporated.
- **Tier-C (AI Village 15-brain):** **TRIGGERED** — Sean has explicitly authorized this run. Scope: comprehensive audit of the user dashboard surface for bugs / dead buttons / UX gaps / missing logic, in addition to validating the tab-nav and cover-photo fixes. Output → `AI-Village-Documentation/validation-prompts/latest/`. This deviates from Rule 50's narrow Tier-C trigger envelope; Sean's explicit authorization stands per Rule 16.

---

## AI Village (15-brain) — input scope

Files for Phase-1 13-brain analyst sweep:

```
frontend/src/components/UserDashboard/UserDashboard.V3.tsx
frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts
frontend/src/components/UserDashboard/components/ObservatoryShell.tsx
frontend/src/components/UserDashboard/components/ObservatoryLeftRail.tsx
frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx
frontend/src/components/UserDashboard/components/ObservatoryShellAdapter.ts
frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts
```

Village goal: validate the corrected receipt, the failure-mode hypothesis, and Fix A/B options; surface any additional defects (security, perf, a11y, UX gaps, dead buttons, missing logic) the receipt did not capture.

---

## Codex review prompt (after Village → Opus synthesis)

> Read ONLY this debate file. Do not re-load full CLAUDE.md context.
>
> You are Codex, acting as final-gate reviewer per CLAUDE.md Rule 46. Claude (Opus) has produced the analysis above for two issues on the user dashboard at `/user-dashboard` (canonical file `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`):
>
> 1. Tab bar becomes "inoperable" after the user navigates from Home to Feed/Progress/Community.
> 2. Cover banner photo crop is broken — only the vertical-center band of portrait photos shows.
>
> The Village (15-brain) ran first on the dashboard surface; its findings are appended below. Tasks:
>
> 1. Validate the corrected three-nav-surface root cause. Cite file:line if you disagree.
> 2. Pick A1 / A2 / A2+A3-c for the tab-bar fix. State the tradeoff.
> 3. Pick B1 / B2 / B1-then-B2 for the cover photo. Same.
> 4. Risk audit: any modal/dropdown z-index that breaks with a new `z-index: 50` sticky tab bar? Any motion animation that relies on MainContent's `overflow: hidden`? Any backend validation needed for `object-position`?
> 5. Verdict. APPROVE / REVISE / REJECT for the plan above.
>
> Output: APPROVE/REVISE/REJECT + 1-2 paragraphs. If REVISE, name the specific changes you want before code lands.

---

## Village output (15-brain run completed 2026-05-10 13:57)

**Run stats:** 14/14 Phase-1 validators (3 FAIL on free-model timeouts: Trinity, Data Safety, Security II Nemotron — others passed). Phase 2 Security/Code/UX-UI debates all reached consensus. Phase 3 Smart Escalation skipped (no CRITICAL). Cost $0.61, time 7.4 min. Archive at `AI-Village-Documentation/validation-prompts/archive/2026-05-10T20-57-13/`.

**Key consensus findings (mapped to this slice's plan):**

1. **[Security CRITICAL — CHAIN-1] Raw URL interpolation in `BackgroundSection` styled-component** — `background: url(${$backgroundImage})` allows CSS injection / stored XSS via a compromised `profile.bannerPhoto`. Same pattern in `ProfileImage`. **Independent confirmation** of my Round-1 risk #4.
   - Fix (Sonnet 4.6 Security): add a `sanitizeImageUrl()` utility (origin allowlist + reject CSS-special chars `()'"\\`), wrap URL in double quotes, escape backslash/quote on output.
   - Priority: HIGH for this slice — incorporate into Slice 1 since the same file is being touched.

2. **[Code Quality CRITICAL/H6 — Phase 2B consensus] Blob URL revoked too early in `handleFileUpload`** — current code at [line 261-288](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L261-L288) revokes the preview blob URL in `finally` while the React state still references it → broken image until `profile.bannerPhoto` effect fires. Also adds a concurrent-upload race (H6).
   - Fix (Claude/Nemotron consensus): use `previewUrlRef` + `uploadIdRef`, success-path revoke via `useEffect` watching `profile.bannerPhoto`, failure-path revoke gated by upload-ID match, unmount cleanup.
   - Priority: HIGH for this slice — same file, same handler that powers the cover-photo upload Slice 2 will extend.

3. **[Architecture & Bug Hunter] Same blob URL bug independently flagged** — strengthens the case (multiple-brain corroboration).

4. **[UX/UI Phase 2C consensus, Gemini 3.1 Pro = design authority]** Tab nav fix not directly addressed but the broader directives were:
   - "Legibility is Luxury" (remove text gradients, solid color fallbacks) — out of scope for Slice 1, queue for design polish slice.
   - "Honest Interaction" (StatItem currently has cursor:pointer + hover but is a div with no onClick — fake interactivity) — quick fix, can include in Slice 1.
   - "Dual-Glow Focus" (purple focus ring everywhere) — out of scope for Slice 1.
   - Tiered shadow tokens — out of scope.

5. **[UX & Accessibility] WCAG contrast risk** — flagged "many" likely failures; no specific selectors. Out of scope for Slice 1; queue for accessibility audit slice.

6. **[Bug Hunter II Nemotron] No additional findings beyond above.**

**No Village brain disputed the tab-nav layout-shift hypothesis** — and the Phase-2B consensus confirms `MainContent`'s `overflow: hidden` + non-sticky `TabNavigation` as the structural cause.

### Synthesized implementation plan post-Village

**Slice 1 (this commit) — Tab nav reachability + concurrent CRITICAL fixes:**
- A2 lite: add `position: sticky; top: 0.5rem; z-index: 50; background: var(--bg-elevated)` to `TabNavigation`. Remove `overflow: hidden` from `MainContent` and `ContentGrid`.
- Security CHAIN-1: introduce `frontend/src/utils/imageUrl.ts` with `sanitizeImageUrl()` (origin allowlist + char reject). Apply in `UserDashboard.V3.tsx` before `setBackgroundImage`, AND in styled-component template by wrapping URL in `"..."` and escaping `"`/`\\`.
- Code Quality C1/H6: rewrite `handleFileUpload` per Phase-2B consensus (previewUrlRef + uploadIdRef + success-via-effect + unmount cleanup).
- Quick UX win: drop `cursor: pointer` and `whileHover` from non-interactive `StatItem` (rule 22 anti-fake-interactivity).
- Add Tier-A vitest regression test for the sticky tab strip behavior.

**Slice 2 (next, separate commit) — Cover photo positioning:**
- B1: switch `BackgroundSection` from CSS `background-image` to `<img>` element with `object-fit: cover` + `object-position`. Add `bannerObjectPosition VARCHAR(32)` column to `User.mjs` with enum whitelist. Migration + startup migration. Backend route accepts the field. Frontend "Reposition" overlay with 5 presets.

**Slice 3+ (deferred, separate slices):** WCAG contrast audit, design "Legibility is Luxury" pass, dual-glow focus rollout, fix dead `/social/reels` mobile nav button (or build the route), DRY refactor of repeated breakpoint media queries, split-banner B2.

**Codex review queued AFTER Slice 1 lands** per Rule 46.

---

## Slice 1 — closeout (2026-05-10)

### Files touched

| File | Change |
|---|---|
| [frontend/src/utils/imageUrl.ts](frontend/src/utils/imageUrl.ts) | NEW — `sanitizeImageUrl()` origin-allowlisted CSS-injection gate + `cssUrlValue()` quote helper. |
| [frontend/src/utils/imageUrl.test.ts](frontend/src/utils/imageUrl.test.ts) | NEW — 11 sanitizer tests; locks the allowlist + char-reject contract. |
| [frontend/src/components/UserDashboard/UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx) | Sanitize bannerPhoto at the boundary; rewrite `handleFileUpload` per Phase-2B consensus (preview ref + upload ID + success-via-effect + unmount cleanup); drop `whileHover` from 3 non-interactive `StatItem` sites. |
| [frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts) | TabNavigation `position: sticky; top: 0.5rem; z-index: 50`. Remove `overflow: hidden` from MainContent + ContentGrid. Quote-wrap `BackgroundSection` and `ProfileImage` `url(...)` interpolations + strip `\`/`"`. Drop unused `theme` param. `cursor: default` on StatItem. |
| [frontend/src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts](frontend/src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts) | NEW — 7 source-text regression assertions on the sticky/overflow/url-wrap contract. |

### Hostile review (Rule 61) — internal pass before declaring done

- **Concurrent-upload race:** previewUrlRef + uploadIdRef pair handles failure-path stale clobber. A minor flicker can occur if upload A's server-confirmed URL effect fires while upload B is still in flight; the user sees A briefly then B. Not Sean's reported scenario; acceptable for Slice 1.
- **Deployment risk:** `sanitizeImageUrl()` defaults accept `sswanstudios.com`, `cdn.sswanstudios.com`, `www.sswanstudios.com`, `media.sswanstudios.com`, plus any `VITE_PHOTO_ORIGINS` override. If production R2_PUBLIC_URL doesn't match a fallback or an env override, banners render as the gradient. **Flagged for deployment QA.** Local-fallback `/uploads/...` relative URLs already pass.
- **Modal z-index:** verified — BadgeDetailModal/EditProfileModal/PhotoGallery modal at 1000; sticky tab at 50; safe gap.
- **Mobile sticky behavior:** MobileBottomNav at `position: sticky; bottom: 0`; in-tree TabNavigation at `position: sticky; top: 0.5rem`. Distinct axes, no conflict.
- **Sibling sweep (Rule 20):** the same `url(${...})` CSS-injection pattern appears at [PhotoGallery.tsx:196](frontend/src/components/UserDashboard/components/PhotoGallery.tsx#L196), [ProfileStyles.ts:202](frontend/src/components/UserDashboard/styles/ProfileStyles.ts#L202), [ConversationList.tsx:247](frontend/src/components/Messaging/ConversationList.tsx#L247), [TestimonialSlider.tsx:259](frontend/src/components/TestimonialSlider/TestimonialSlider.tsx#L259), [VerticalReels.tsx:76](frontend/src/components/Social/Reels/VerticalReels.tsx#L76), [HomeStyles.tsx:67](frontend/src/pages/HomePage/components/shared/HomeStyles.tsx#L67). **Out of scope for Slice 1.** Logged for a dedicated security slice. Grep command: `rg -n 'background(-image)?:\s*url\(\$\{' frontend/src` (excluding `_archived/`).

### Verification

- Targeted vitest: **18/18 pass** (`src/utils/imageUrl.test.ts` 11 tests + `src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts` 7 tests).
- IDE diagnostics on touched files: **0 new errors introduced.** 4 pre-existing TS errors (`pointsToNextLevel` typo at line 276, two `Object is possibly 'undefined'` at line 499 around the `profile?.role` concat, `UserProfile` index-signature at line 719) are baseline, unrelated to this slice.
- Tier-A baseline status: **non-clean** — `npx tsc --noEmit` OOMs on the full repo (known baseline issue, not caused by this slice). Slice files type-check cleanly per IDE.
- Manual smoke: **NOT yet executed by Sean.** Tab-strip-stays-in-viewport reproduction is the primary acceptance criterion across the full CLAUDE.md responsive audit matrix: **320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 / 3440 px** (and 3840 if a 4K-native panel is on hand). Sticky `top` offset scales 0.5rem → 0.75rem (1920+) → 1rem (2560+) → 1.25rem (3440+) → 1.5rem (3840+) so the strip stays proportional to ContentWrapper's 4-5rem top padding at large breakpoints.

### Deferred to Slice 2 / 3+

- **Slice 2:** Cover photo positioning (B1) — `<img>` with `object-fit: cover` + `object-position` + `bannerObjectPosition VARCHAR(32)` column + 5-preset reposition UI.
- **Slice 3 (security):** Apply `sanitizeImageUrl()` to the 6 sibling surfaces enumerated above.
- **Slice 4 (mobile nav):** Either build `/social/reels` or replace the dead-link button.
- **Slice 5 (a11y):** WCAG contrast audit + dual-glow focus rollout + Phase-2C "Legibility is Luxury" pass.

### Next slice (Rule 60)

`Next slice: Slice 2 — cover photo positioning. Sean cleared the smoke gate verbally pending QHD/4K breakpoint scaling, which landed in this commit (top: 0.5 → 0.75 → 1 → 1.25 → 1.5rem across 1920 / 2560 / 3440 / 3840). Slice 2 ships <img>+object-position + bannerObjectPosition column + 5-preset reposition UI; both slices then go to Codex for a single combined hostile review.`

---

## Slice 2 — closeout (2026-05-10)

### Files touched

**Backend (3):**

| File | Change |
|---|---|
| [backend/models/User.mjs](backend/models/User.mjs) | Add `bannerObjectPosition` field as `ENUM(9 presets)` with `defaultValue: 'center center'`. |
| [backend/migrations/20260510000001-add-banner-object-position.cjs](backend/migrations/20260510000001-add-banner-object-position.cjs) | NEW — idempotent Postgres ENUM type create + column add (`up`) and reverse (`down`). |
| [backend/utils/startupMigrations.mjs](backend/utils/startupMigrations.mjs) | Boot-time `DO $$ BEGIN IF NOT EXISTS … CREATE TYPE … END $$` + `ALTER TABLE Users ADD COLUMN` so a brand-new dev/prod env converges without manual `sequelize-cli` runs. |
| [backend/controllers/profileController.mjs](backend/controllers/profileController.mjs) | Add `bannerObjectPosition` to the `updateUserProfile` allowlist + hard-whitelist Set check; returns 400 if the value isn't one of the 9 presets. |

**Frontend (3):**

| File | Change |
|---|---|
| [frontend/src/services/profileService.ts](frontend/src/services/profileService.ts) | Export `BANNER_OBJECT_POSITION_PRESETS` (`as const`) + `BannerObjectPosition` string-literal union + `isBannerObjectPosition()` type guard. Add `bannerObjectPosition?: BannerObjectPosition` to `UserProfile`. |
| [frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts](frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts) | `BackgroundSection` — eliminate ALL `url(${$backgroundImage})` interpolations (no CSS-injection surface remaining). NEW styled components: `BannerImage` (`<img>` with `object-fit: cover` + literal default `object-position`), `BannerRepositionButton`, `BannerRepositionPanel`, `BannerRepositionCell`. |
| [frontend/src/components/UserDashboard/UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx) | `bannerObjectPosition` state + hydration effect gated by `isBannerObjectPosition()` + `handleBannerPositionChange` optimistic-then-persist handler. Render `<BannerImage>` + reposition UI inside `<BackgroundSection>` when a banner is loaded. |

**Tests (1 NEW):**

| File | Change |
|---|---|
| [frontend/src/services/bannerObjectPosition.test.ts](frontend/src/services/bannerObjectPosition.test.ts) | NEW — 7 tests locking the 9-preset row-major order, whitelist exactness, and `isBannerObjectPosition()` rejection of casing/spacing/CSS-injection variants. |
| [frontend/src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts](frontend/src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts) | Updated — the BackgroundSection url-wrap assertion now reverses to "must NOT contain any `url(${...})` interpolation" (the surface is gone); added a positive assertion that `BannerImage` declares `object-fit: cover` + literal default `object-position: center center` with no template interpolation. |

### Three-layer defense against CSS-injection / poisoned writes

| Layer | Where | What it blocks |
|---|---|---|
| Frontend type guard | `isBannerObjectPosition()` at hydration ([UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx)) | A malformed/poisoned server value never reaches local state; the default `'center center'` holds. |
| Backend route validator | `BANNER_OBJECT_POSITION_PRESETS` Set check in [profileController.mjs](backend/controllers/profileController.mjs) | A poisoned client write returns HTTP 400 before reaching the model. |
| Postgres ENUM | `enum_Users_bannerObjectPosition` column type | An out-of-whitelist value is rejected at the storage layer even if both code layers were bypassed. |

### Hostile review (Rule 61) — pass before declaring done

- **Concurrent banner upload + reposition race:** `updateProfile({ bannerObjectPosition })` and `uploadBannerPhoto(file)` target different fields on `User.update(...)`. Sequelize emits targeted UPDATE statements, so neither clobbers the other. Effects re-sync local state from `profile` after each completes. No regression.
- **Optimistic failure path:** if `updateProfile` rejects, local state stays on the chosen preset until the next profile refresh — then the unchanged server value rehydrates via the `isBannerObjectPosition`-gated effect. User sees the snap-back, which is correct behavior.
- **CSS-injection on `style={{ objectPosition }}`:** React serializes inline style values as the property value, not raw CSS. Only the enum-validated state ever lands here, and the enum is closed.
- **Sibling sweep (Rule 20):** [UserProfilePage.tsx](frontend/src/pages/Social/UserProfilePage.tsx) reads `profile.bannerPhoto` for read-only views of other users. It does NOT yet read `bannerObjectPosition`. Out of scope — that surface shows other users' banners, not the owner's edit UI. Logged as Slice 3+ candidate so other users see your chosen crop too. Sibling-sweep grep: `rg -n 'bannerPhoto' frontend/src/` → 8 hits, all classified.
- **Migration safety:** `addColumnIfMissing` + `IF NOT EXISTS` pattern is idempotent at startup; the standalone migration file is the canonical migration for fresh DBs; both are guarded.
- **Reposition panel UX:** clicking outside the panel doesn't close it (no document-level handler). Toggle button or cell selection closes. Minor polish gap; deferred.
- **Mobile button arithmetic:** BannerUploadButton (44 + 12 right) + 8px gap → BannerRepositionButton right = 64px. Verified on 320 / 414 / 768.
- **Touch targets:** all picker cells 44×44px (Rule 2 passes); reposition button min-height 44px (mobile circle 44×44).
- **a11y:** `role="dialog"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-label` per cell with full preset name ("Crop left top" etc), `aria-pressed` for current selection.

### Verification

- Targeted vitest **26/26 pass** across `bannerObjectPosition.test.ts` (7) + `imageUrl.test.ts` (11) + `DashboardV3Styles.stickyTab.test.ts` (8).
- Tier-A baseline: per Slice 1's disclosure — full-repo `npx tsc --noEmit` OOMs (pre-existing). IDE diagnostics on touched files: **0 new errors introduced**, only pre-existing baseline hints (unused imports, `pointsToNextLevel` typo at line 244, etc.).
- Backend Rule 42 pre-push audit owed at commit time: `git ls-files --others --exclude-standard backend/` + `git diff --name-only HEAD backend/`. Both run before push.

### Deferred (still)

- **Slice 3 (security sibling sweep):** apply `sanitizeImageUrl()` to PhotoGallery, ProfileStyles, ConversationList, TestimonialSlider, VerticalReels, HomeStyles — same `url(${...})` pattern in 6 other surfaces.
- **Slice 3 (banner field flow-through):** UserProfilePage.tsx render `bannerObjectPosition` for read-only views so other users see the owner's chosen crop.
- **Slice 4:** Build `/social/reels` route OR replace the dead mobile-nav Reels CTA.
- **Slice 5 (a11y):** WCAG contrast audit + dual-glow focus rollout + Phase-2C "Legibility is Luxury" pass.
- **Slice 6:** Reposition panel — click-outside-to-close polish.

### Next slice (Rule 60)

`Next slice: Codex final-gate hostile review of Slice 1 + Slice 2 combined. After Codex APPROVE, Sean runs local smoke (tab nav across the responsive matrix + reposition flow + banner upload preview behavior). On smoke green, commit per Rule 13 (type(scope): description) and push.`

---

## Codex review prompt — Slice 1 + Slice 2 combined hostile review

> Read ONLY this debate file. Do not re-load full CLAUDE.md context.
>
> You are Codex, acting as final-gate reviewer per CLAUDE.md Rule 46. Claude (Opus) has shipped TWO slices on the `/user-dashboard` surface:
>
> **Slice 1 (tab-nav reachability + concurrent CRITICAL fixes from the 15-brain Village run):**
> - Sticky in-tree `TabNavigation` (`position: sticky; top: 0.5rem → 1.5rem` scaled across 1920/2560/3440/3840; z-index: 50). Removed `overflow: hidden` from `MainContent` and `ContentGrid` so sticky resolves to the page-scrolling ancestor.
> - NEW `frontend/src/utils/imageUrl.ts` — origin-allowlisted `sanitizeImageUrl()` + `cssUrlValue()`. Applied at `UserDashboard.V3.tsx` boundary AND defense-in-depth quote-wrap in `BackgroundSection` (later removed by Slice 2) + `ProfileImage` (still present).
> - Rewrote `handleFileUpload` per Phase-2B consensus: `previewUrlRef` + `uploadIdRef` + success-revoke-via-effect + unmount cleanup. Closes the "broken-image-until-profile-effect" leak from the original code.
> - Removed fake interactivity from `StatItem` (`cursor: default`, dropped `whileHover`).
>
> **Slice 2 (cover photo positioning):**
> - Backend: `bannerObjectPosition` ENUM column (9 presets, `'center center'` default) on `User` model + migration + startup migration. Route validator + Postgres ENUM = two backend layers.
> - Frontend: switched `BackgroundSection` from CSS `background-image` to a child `<BannerImage>` `<img>` element with `object-fit: cover` + inline `object-position` from enum-validated state. Eliminated ALL `url(${...})` interpolations from `BackgroundSection`. Reposition UI: `Move` button + 3×3 grid picker popover, all keyboard/touch-target compliant.
> - Three defense layers locked: `isBannerObjectPosition()` (frontend), allowlist Set (backend route), Postgres ENUM (storage).
>
> **Tests:** 26/26 pass on the slice files. **Baseline:** full-repo `tsc --noEmit` OOMs (pre-existing); IDE diagnostics show 0 new errors from these slices, only pre-existing baseline issues.
>
> **Tasks:**
>
> 1. **Validate the root-cause fixes hold.** Does the sticky-tab structural change actually fix Sean's "tabs become inoperable after Home→non-home" report? Any modal/overlay z-index in the wider repo I missed that would clash with z-50?
> 2. **CSS-injection defense audit.** Is the three-layer defense on `bannerObjectPosition` complete? Did I miss any path where a `bannerPhoto` URL or `bannerObjectPosition` value could land in CSS without sanitation/whitelist?
> 3. **Migration safety.** Will the `bannerObjectPosition` column add safely converge on production (Render Postgres) AND fresh dev environments? Idempotency / order-of-operations issues?
> 4. **Hostile sweep on what's NOT in this slice but should be.** The Slice 1 sibling sweep flagged 6 other surfaces with `url(${...})` injection. Slice 2 also flagged UserProfilePage.tsx not consuming `bannerObjectPosition`. Anything else you'd block on before shipping these two slices?
> 5. **Verdict.** APPROVE / REVISE / REJECT for Slice 1 + Slice 2 combined.
>
> Output: APPROVE / REVISE / REJECT + 1-3 paragraphs. If REVISE, name the specific blockers before code commits.

---

## Codex Round 1 verdict (2026-05-11 03:04, openai/gpt-5.5, 90.0s, 49,760 in / 4,099 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: REVISE.** Two blockers, both legitimate:

1. **[HIGH] Sticky tab placement insufficient.** Codex correctly identified that CSS `position: sticky` only pins AFTER the element scrolls to its threshold. My in-tree TabNavigation (inside `MainContent`, AFTER conditional `ProfileHeader`) started ~320px below the viewport top on non-home tabs, so sticky was a no-op until the user scrolled down 320px to reach the strip — and on mobile the strip was off-screen entirely on first paint. **Required fix:** move the TabNavigation JSX above ProfileHeader (the A2 placement I'd originally proposed but deferred to A1-lite in Round 1). I should have shipped A2 from the start.

2. **[MEDIUM] `profile.photo` flows into ProfileImage CSS without origin allowlist.** Slice 1's sanitizer was applied to `bannerPhoto` but not to `photo` — same `background: url(${...})` interpolation surface in `ProfileImage`. The styled-component's defensive quote-strip survives, but my CHAIN-1 claim was incomplete. **Required fix:** apply `sanitizeImageUrl()` at the React boundary for `profile.photo`, mirroring the bannerPhoto path.

## Round-2 revisions (this commit)

| Fix | File | Change |
|---|---|---|
| HIGH-1 | [UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx) | Cut `<TabNavigation>` JSX (5 tabs) from inside `<MainContent>` and re-mount it as the FIRST child of `<ObservatoryShell>`, immediately before the conditional `<ProfileHeader>`. The strip is now always the top of the scrollable content area; sticky pins from the first frame regardless of which tab is active. |
| MEDIUM-1 | [UserDashboard.V3.tsx](frontend/src/components/UserDashboard/UserDashboard.V3.tsx) | Wrap `profile?.photo` in `sanitizeImageUrl()` before passing to `<ProfileImage $image=...>`. Sanitiser returns null on rejection → initials fall back (same UX as a missing photo). |

**Tier-A regression suite:** 26/26 still pass (`bannerObjectPosition.test.ts` 7 + `imageUrl.test.ts` 11 + `DashboardV3Styles.stickyTab.test.ts` 8).

**Codex round-2 review queued** with the revised JSX + sanitizer placement.

---

## Codex Round 2 verdict (2026-05-11 03:21, openai/gpt-5.5, 68.6s, 47,900 in / 3,093 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: APPROVE.** Both round-1 blockers verified fixed in the inlined source:

1. `<TabNavigation>` confirmed mounted as the first child inside `<ObservatoryShell>` before the conditional `<ProfileHeader>` — sticky now pins from the top of the scroll area regardless of which tab is active.
2. `profile.photo` confirmed passing through `sanitizeImageUrl()` at the React boundary; the styled-component's quote-strip remains as defense in depth.

**One LOW non-blocking finding patched in the same revision:**

- Codex flagged that the bannerPhoto `useEffect` only cleared local state when `!profile?.bannerPhoto`, leaving the safe banner visible if the server value transitioned to a truthy-but-rejected URL. Security-safe (poisoned value never reached CSS) but contradicted the doc comment. Patched: the `else` branch now fires on both empty and rejected, falling back to the aurora gradient. Verified in [UserDashboard.V3.tsx:237-260](frontend/src/components/UserDashboard/UserDashboard.V3.tsx#L237-L260).

**Final Tier-A:** 26/26 still pass.

---

## Final commit gate state

- ✅ AI Village 15-brain consensus (3/3 specialty debates, no escalations, $0.61)
- ✅ Claude Opus 4.7 hostile self-review (Slice 1 + Slice 2)
- ✅ Codex round 1 → REVISE (2 legitimate blockers caught)
- ✅ Round-2 fixes applied (A2 tab placement + photo sanitizer + stale-banner edge case)
- ✅ Codex round 2 → APPROVE
- ✅ Tier-A regression suite: 26/26 pass
- ⏳ Sean local smoke awaited
- ⏳ Commit per Rule 13 (`type(scope): description`) + Rule 42 pre-push backend audit on push

**Next slice (Rule 60):** `Sean local smoke on /user-dashboard across 320 / 414 / 768 / 1024 / 1440 / 1920 / 2560 / 3440 px — verify Home → Feed → Home → Progress → Home → Community → Profile leaves the tab strip clickable at every step. Verify the Reposition button shows the 3×3 picker and persists the chosen crop across refresh. Verify avatar still renders with a saved photo. If green → commit and push. If regression → REVISE and re-run Codex.`

---

## Rebase + Round-3 port (2026-05-10, branch `feat/sticky-tabs-cover-photo-positioning`)

**Cause for rebase.** On commit-attempt, the local branch `codex/four-surface-command-center` was discovered to be **5 commits behind `origin/main`** on the exact files Slices 1 + 2 touched. Critically, two structural refactors had landed on main while this branch was offline:

- `128fa4978 refactor(dashboard): split user dashboard v3 styles` — `DashboardV3Styles.ts` split from a 1700-line monolith into 12 focused modules.
- `2d4a5acc5 refactor(user-dashboard): split v3 shell` — `UserDashboard.V3.tsx` shrank from ~700 lines to ~70; logic now lives in `useUserDashboardV3Controller.ts`, `UserDashboardProfileHeaderV3.tsx`, `UserDashboardTabsV3.tsx`, `UserDashboardSidebarV3.tsx`, `UserDashboardStatusStatesV3.tsx`.

The Canonical Surface Receipt and Codex round 1+2 verdicts pointed at file:line evidence that **no longer matched the live `origin/main` layout**. A blind push would have destroyed 14+ dashboard commits.

**Recovery (Sean approved).** Stashed the slice, fetched `origin/main`, created `feat/sticky-tabs-cover-photo-positioning`, ported every change to the new file layout:

| Concern | Pre-split location | Post-rebase location |
|---|---|---|
| Sticky TabNavigation | `DashboardV3Styles.ts` | `DashboardV3NavigationStatusStyles.ts` |
| MainContent / ContentGrid no-overflow | same monolith | `DashboardV3NavigationStatusStyles.ts` + `DashboardV3LayoutStyles.ts` |
| BackgroundSection URL removal + BannerImage/Reposition components | same monolith | `DashboardV3BannerStyles.ts` |
| ProfileImage CSS-escape | same monolith | `DashboardV3ProfilePhotoStyles.ts` |
| StatItem `cursor: default` | same monolith | `DashboardV3StatsStyles.ts` |
| Tab strip JSX (A2 placement) | inside `<MainContent>` | NEW `UserDashboardTabBarV3.tsx` mounted as first child of `<ObservatoryShell>` |
| `handleFileUpload` rewrite + `bannerObjectPosition` state + reposition handler + sanitised banner effect | inside V3.tsx | `useUserDashboardV3Controller.ts` |
| Reposition UI JSX + `profile.photo` sanitisation | inside V3.tsx | `UserDashboardProfileHeaderV3.tsx` (Reposition button sits inside `BannerActionRow` via new `BannerRepositionAnchor`) |

**Net new files (no conflicts):**
- `frontend/src/utils/imageUrl.ts`
- `frontend/src/utils/imageUrl.test.ts`
- `frontend/src/services/bannerObjectPosition.test.ts`
- `frontend/src/components/UserDashboard/components/UserDashboardTabBarV3.tsx`
- `frontend/src/components/UserDashboard/styles/DashboardV3Styles.stickyTab.test.ts`
- `backend/migrations/20260510000001-add-banner-object-position.cjs`

**Architecture adaptations:**
- New `BannerRepositionAnchor` styled component gives the 3×3 picker popover a `position: relative` context inside the flex-row `BannerActionRow`.
- `handleFileUpload` has an early-return for `type === 'profile'` since the optimistic preview machinery is banner-only.
- Fixed a pre-existing TS strict-null trap on the `role` Capitalize chain in `UserDashboardProfileHeaderV3.tsx` while rewriting that file (`profile?.role ? ... : 'User'` ternary).

**Tier-A regression suite — REBASED:** 27/27 pass.
- `bannerObjectPosition.test.ts` (7) — enum-whitelist contract
- `imageUrl.test.ts` (11) — sanitiser contract
- `DashboardV3Styles.stickyTab.test.ts` (9 — adds StatItem cursor regression) — reads from the split files

**IDE diagnostics on touched files:** baseline non-clean (pre-existing on origin/main — `UserProfile` id-type mismatch, `Record<string, unknown>` index-signature mismatch, stale node-types in test files). **0 new errors introduced by the port.**

**Codex round-3 review queued** against the rebased branch.

---

## Codex Round 3 verdict (2026-05-11, openai/gpt-5.5, 95.8s, 44,832 in / 5,446 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: REVISE.** Codex verified all five rebase-port checks landed correctly (sticky TabBar above ProfileHeader, BackgroundSection url() removed, BannerImage object-fit, profile.photo sanitized, handleFileUpload uses previewUrlRef+uploadIdRef+success-via-effect, banner effect else branch on empty/rejected). But found three follow-ups:

| # | Severity | Issue | Required fix |
|---|---|---|---|
| R3-1 | HIGH | `ProfileContainer` still has `overflow: hidden` — ancestor of the sticky TabNavigation. CSS spec: nearest non-visible-overflow ancestor establishes the sticky containing block, which can poison sticky behaviour. | Change to `overflow-x: hidden` (preserves horizontal clipping for the ProfileHeader full-bleed `margin-left: calc(-50vw + 50%)` trick without poisoning vertical sticky). |
| R3-2 | MEDIUM | Concurrent upload race: if upload A completes AFTER upload B has started, A's profile.bannerPhoto effect revokes B's blob preview because `previewUrlRef.current` now points at B's blob. | Tag preview with its owning upload ID (`previewUploadIdRef`); guard the success-effect with "newer upload pending? skip revoke". |
| R3-3 | MEDIUM | Backend `updateUserProfile` allowlist still includes `photo` as an arbitrary string. Dashboard surface is now sanitized at the React boundary, but the DB poisoning path remains open for any future consumer that skips sanitation. | Either drop `photo` from the allowlist (force upload endpoint as the only write path), or server-side validate against the same origin policy. |

## Round-4 revisions (this commit)

- **R3-1 (HIGH) fixed.** `ProfileContainer` in [DashboardV3LayoutStyles.ts](frontend/src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts) — `overflow: hidden` → `overflow-x: hidden`. Horizontal clipping preserved; vertical sticky no longer constrained.
- **R3-2 (MEDIUM-1) fixed.** [useUserDashboardV3Controller.ts](frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts):
  - New `previewUploadIdRef` tags the current preview with its owning upload ID.
  - Set at preview creation: `previewUploadIdRef.current = thisUploadId`.
  - Reset by `revokePreview()` to 0.
  - The banner-sync effect guards: `if (previewUrlRef.current !== null && previewUploadIdRef.current < uploadIdRef.current) return;` — when a newer upload is still in flight, the older upload's server-success no longer clobbers the newer optimistic preview.
- **R3-3 (MEDIUM-2) deferred** to a follow-up slice. The dashboard surface is now hardened at the React boundary; tightening the backend allowlist touches `updateUserProfile`, `updateClientProfile`, and any internal scripts that update `photo`. Out of scope for this slice; tracked in the deferred list below.

**Tier-A regression suite — REBASED + Round-4:** 27/27 pass.

**Codex round-4 review queued.**

---

## Codex Round 4 verdict (2026-05-11, openai/gpt-5.5, 53.0s, 16,687 in / 3,652 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: REVISE.** Codex verified the HIGH fix (`ProfileContainer overflow-x`) and confirmed the race-fix code was syntactically present. But caught that my race-fix logic was **ineffective for the exact race it claimed to fix**:

- My guard: `previewUrlRef.current !== null && previewUploadIdRef.current < uploadIdRef.current`.
- At preview creation I set `previewUploadIdRef.current = thisUploadId === uploadIdRef.current` (both equal to the just-incremented value), so `previewUploadIdRef < uploadIdRef` is ALWAYS false.
- When upload A's server URL arrives mid-B-flight, the effect proceeds, revokes B's blob, and snaps to A's older URL.

Codex's blocker direction: "key the server-success acceptance to the resolving upload, not to `previewUploadIdRef.current < uploadIdRef.current`."

## Round-5 revisions (this commit)

Redesigned the race fix per Codex's direction:

1. **The banner-sync effect refuses to act while a preview is showing.** New body: `if (previewUrlRef.current !== null) return;` then `setBackgroundImage(sanitizeImageUrl(profile?.bannerPhoto))`. This effect's role is now ONLY external hydration — initial load + sibling-surface refetches. During an upload, the optimistic preview owns the visible state.
2. **The success branch in `handleFileUpload` explicitly commits.** Right after `await uploadBannerPhoto(file)` resolves, if `thisUploadId === uploadIdRef.current` (I am still the latest), revoke preview + setBackgroundImage to the just-mutated `profileRef.current?.bannerPhoto`. Otherwise, do nothing — a newer upload is in flight and will commit when it resolves.
3. **New `profileRef` bridges effect-time profile state into the post-await closure.** `useProfile.uploadBannerPhoto` already setProfile()s the new bannerPhoto into parent state synchronously before its promise resolves, but the handler's closure captured the pre-upload profile. profileRef stays current via `useEffect(() => { profileRef.current = profile; }, [profile])`.
4. **Removed `previewUploadIdRef`** — it was load-bearing only for the broken guard. The new design uses `previewUrlRef !== null` as the "mid-upload" signal and `uploadIdRef === thisUploadId` as the "still latest" signal.

Trace of the original race under the new design:

1. Upload A (id=1): previewUrlRef=blob_A; setState(blob_A); await.
2. Upload B (id=2) starts mid-A-flight: revokePreview revokes blob_A; previewUrlRef=blob_B; setState(blob_B); await.
3. A's await resolves first. useProfile setProfile(bannerPhoto=serverA). Effect fires: previewUrlRef=blob_B (≠null), **skip**. ✓ A's success branch: thisUploadId(1) !== uploadIdRef(2), **skip commit**. ✓
4. B's await resolves. useProfile setProfile(bannerPhoto=serverB). Effect fires: previewUrlRef=blob_B (≠null), **skip**. ✓ B's success branch: thisUploadId(2) === uploadIdRef(2), revokePreview, setState(serverB). ✓

User sees B continuously — no A flash. A's blob and B's blob both properly revoked.

**Tier-A regression suite — REBASED + Round-5:** 27/27 still pass.

**Codex round-5 review queued.**

---

## Codex Round 5 verdict (2026-05-11, openai/gpt-5.5, 52.0s, 16,161 in / 3,636 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: REVISE.** Codex verified the round-5 code changes were syntactically present (effect early-out, success-branch upload-id gate, profileRef sync, old previewUploadIdRef removed). But caught a deeper flaw: **`profileRef.current` is only updated by a useEffect that runs AFTER React commit. The success branch reads it immediately after `await uploadBannerPhoto`, which can return BEFORE the profile sync effect fires.**

Codex's scenario:
1. Upload A in flight, profileRef = serverInit.
2. Upload B starts mid-A-flight, profileRef = serverInit.
3. A resolves: useProfile setProfile(bannerPhoto=serverA). React schedules re-render. profileRef sync effect runs after commit → profileRef = serverA.
4. B resolves: B's await resumes. B's success branch executes: `thisUploadId(2) === uploadIdRef(2)` true. Reads profileRef.current — **but it could be serverA, not yet serverB.**
5. setBackgroundImage(serverA). User sees A flash.
6. profileRef sync eventually updates to serverB; banner effect then commits serverB. Visually correct end state, but the contract "user sees B continuously, no A flash" is violated.

Codex's required fix: "Prefer making `uploadBannerPhoto(file)` return the uploaded banner URL/updated profile and commit that direct under the upload-id gate."

## Round-6 revisions (this commit)

Followed Codex's preferred direction — return the URL from the upload hook:

1. **[useProfile.ts](frontend/src/hooks/profile/useProfile.ts):** `uploadBannerPhoto` signature changed from `Promise<void>` to `Promise<string | null>`. Returns `result.bannerPhoto` after setProfile completes. Returns null if no user / upload fails.
2. **[useFileUpload.ts](frontend/src/components/UserDashboard/hooks/useFileUpload.ts):** sibling type updated to match.
3. **[useUserDashboardV3Controller.ts](frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts):** removed `profileRef` entirely. Success branch now captures the resolved server URL directly: `const serverUrl = await uploadBannerPhoto(file); if (thisUploadId === uploadIdRef.current) { revokePreview(); setBackgroundImage(sanitizeImageUrl(serverUrl)); }`. There is now no ambiguity about WHICH upload's URL is being committed — it's literally the return value of THIS upload's promise. Failure branch reads `profile?.bannerPhoto` from closure (which is the correct pre-upload rollback target since failure does NOT mutate profile).

Re-traced race under round-6 design:

1. Upload A (id=1): previewUrlRef=blob_A, setState(blob_A), await.
2. Upload B (id=2) starts: revokePreview, previewUrlRef=blob_B, setState(blob_B), await.
3. A resolves first: serverA returned. handler: thisUploadId(1) !== uploadIdRef(2). **Skip commit.** ✓ Effect fires from useProfile setProfile: previewUrlRef=blob_B (≠null), **skip.** ✓
4. B resolves: serverB returned. handler: thisUploadId(2) === uploadIdRef(2). revokePreview, setBackgroundImage(serverB). ✓

User sees B continuously. No A flash possible — `serverUrl` is unambiguously B's URL when B's success branch runs.

**Tier-A regression suite — Round-6:** 27/27 pass.

**Codex round-6 review queued.**

---

## Codex Round 6 verdict (2026-05-11, openai/gpt-5.5, 54.8s, 20,752 in / 3,426 out)

Full response: `AI-Village-Documentation/codex-consults/latest.md`.

**Verdict: REVISE.** Codex verified all four round-6 items syntactically (`uploadBannerPhoto` returns `Promise<string | null>`, useFileUpload type matches, controller commits serverUrl directly, profileRef removed). But caught a flaw in the OTHER race direction: **"older upload resolves SECOND."**

Scenario:
1. Upload A in flight.
2. Upload B starts mid-A-flight; B resolves FIRST.
3. B's controller commit fires (revokePreview, setBackgroundImage(serverB)).
4. A resolves second. A's `useProfile.uploadBannerPhoto` STILL calls `setProfile(serverA)` (no upload-id awareness inside the hook).
5. The hydration effect fires: previewUrlRef === null (B revoked it), no preview showing. Effect accepts: setBackgroundImage(serverA). **A clobbers B.**

Codex's required fix: "make stale upload completions unable to mutate profile/banner state." Three options listed; I picked **option 1: sequencer inside `useProfile.uploadBannerPhoto`.**

## Round-7 revisions (this commit)

[useProfile.ts](frontend/src/hooks/profile/useProfile.ts):

- New `bannerUploadSeqRef` (useRef counter) lives at the hook instance level.
- Each call to `uploadBannerPhoto` captures `const mySeq = ++bannerUploadSeqRef.current` BEFORE awaiting.
- After the `await profileService.uploadBannerPhoto(file)` resolves, the function checks `if (mySeq !== bannerUploadSeqRef.current) return null;` — a stale older upload that resolves out-of-order drops its result silently and never calls `setProfile`.
- The catch branch only surfaces the error if the call is still the latest (`mySeq === bannerUploadSeqRef.current`) so a stale rejection doesn't poison the UI's error state with an out-of-date message.
- The finally branch only clears `isUploading` for the latest call so the loading-state stays true while the latest upload is still in flight.
- Added missing `useRef` import.
- Also added an explicit `null` return from the stale-catch path so the new `Promise<string | null>` return type is satisfied without rethrowing for stale errors.

Re-traced "older upload resolves SECOND" under round-7 design:

1. Upload A (id=1, seq=1): previewUrlRef=blob_A, setState(blob_A), await.
2. Upload B (id=2, seq=2) starts: revokePreview, previewUrlRef=blob_B, setState(blob_B), await.
3. B resolves first (seq=2). useProfile: mySeq(2) === seq(2). setProfile(serverB). Returns serverB.
4. B's controller commit: thisUploadId(2) === uploadIdRef(2). revokePreview, setBackgroundImage(serverB). ✓
5. A resolves second (seq=1). useProfile: mySeq(1) !== seq(2). Returns null. **No setProfile.** ✓
6. A's controller branch: thisUploadId(1) !== uploadIdRef(2). Skip. ✓ No hydration-effect tick from A; profile.bannerPhoto stays at serverB.

User sees B continuously. Older upload that resolved second is fully isolated.

**Sibling-sweep:** [UserDashboardV3.tsx](frontend/src/components/UserDashboard/UserDashboardV3.tsx) and [UserDashboard-optimized.tsx](frontend/src/components/UserDashboard/UserDashboard-optimized.tsx) are dormant per the Phase 19 receipt but also consume `uploadBannerPhoto`. The hook-level sequencer protects them too — race-safe behaviour ships to every consumer for free.

**Tier-A regression suite — Round-7:** 27/27 pass.

**Codex round-7 review queued.**
