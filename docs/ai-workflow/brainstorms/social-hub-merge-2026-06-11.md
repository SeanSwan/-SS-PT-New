# Brainstorm: Social Hub Merge — /social absorbs the Observatory (Workstream M)

**Date:** 2026-06-11  ·  **Status:** active  ·  **For:** consolidating /social + /user-dashboard into ONE canonical social surface

## Summary
Sean: "the feed and the social page need to become one page and we need to take the best from both of them… you are allowed to upgrade and enhance or do a complete makeover, I give you permission." Plus: the Feed Cover Studio is loved but has an awkward bottom dead-zone on desktop + mobile, and the cover should become a real self-expression surface ("carousel of pictures and different options… artistic and expressive"), with ultra-modern feature recommendations welcome.

## Key Decisions
- **Q1 — Merge shape:** Sean picked **"One Hub — Observatory absorbed" (recommended)** over "Hub + Profile split" and "Observatory takeover."
  - /social stays the address and the bones (SocialPage.V3 skeleton, D1/D2 Coach work untouched).
  - The Observatory's best widgets migrate in: creator identity strip (avatar/name/XP/streak), Live Activity, Active Challenge, Leaderboard, Next Best Action; Quick Post merges into the composer.
  - /user-dashboard becomes a redirect to /social once parity lands. Nothing 404s.
  - Cover Studio gains real photo-carousel self-expression options; bottom-spacing bug dies.

## Surface truth (rule 27, file:line verified 2026-06-11)
- `/social[/:tab]` → SocialPage.V3 (main-routes.tsx:268-272, :743/:753) → feed tab renders `<SocialFeed />` = FULL sections (SocialFeedSections.tsx:76-87: bell, gamification header, recent activity, FullFeedStats, ticker, faction, party, trending). NO cover studio today.
- `/user-dashboard` → UserDashboard.V3 (main-routes.tsx:263-267, :691) → Feed tab `<SocialFeed variant="compact" />` (UserDashboardTabsV3.tsx:222) = COMPACT sections (SocialFeedSections.tsx:89-99: recent activity, **FeedCoverStudio**, ticker).
- Both render the same posts via useSocialFeed — the duplication Sean called out.
- The cover's "carousel panels" (CoverGrid/CoverPanel, FeedCoverStudio.styles.ts:228-254) are aria-hidden DECORATION today — they look like photo slots but hold no images. Making them real = the M5 enhancement.

## Slice plan (Workstream M)
1. **M1 — Cover lands on /social + spacing fix.** FeedCoverStudio joins the FULL sections (top, after the bell); FullFeedStats leaves full (its numbers duplicate the cover's metric rail — no-duplicate-facts rule); tighten the cover's bottom dead-zone (stage min-height on small containers, asymmetric shell padding).
2. **M2 — Identity strip.** Creator hero (avatar, name, @handle, tier, XP, streak) folded into/above the cover from real gamification + profile data; retires FullGamificationHeader.
3. **M3 — Right rail.** Desktop third column on the /social feed tab: Live Activity, Active Challenge (real challenges lane), Leaderboard top-3, Next Best Action. Mobile: condensed/stacked.
4. **M4 — Quick Post merge.** CreatePostCard absorbs Quick Post's value (+XP affordance up front); no second composer.
5. **M5 — Expressive cover studio.** The decorative panels become a real cover: photo carousel (R2 upload lane), gradient/aurora presets, auto highlight collage (recent PRs/badges). Needs rule-26 receipt on cover storage (no cover field exists yet — likely new model field or JSON prefs) + rule-29 schema check before code.
6. **M6 — Redirect /user-dashboard → /social.** Only after M2-M4 parity. UserDashboard.V3 classified for the cleanup backlog (rule 34 — no deletion in this workstream).

## Status: WORKSTREAM M COMPLETE (2026-06-12)
All six slices shipped + the M5b visual-QA pass: M1 `c69434eb2`, M2 `f1f40bc61`+`ac3de758e`, M3 `93ab9c040`, M4 `8874caf63`, M5a `e646671f8`, cleanup `d907e291f`, M5b `b7698d9a3`+`b8f43f307`+`d170f7cc6`, M6 `54cb786c7`. /user-dashboard now redirects to /social; the cover editor is embedded on /social (Sean's option 2).

## Open Flags
- [x] ~~D2-smoke anomaly~~ **RESOLVED (commit `6f6759f16`):** root cause was NOT the enhanced table — production never had the hashtag tables (migration in an unscanned subdirectory), so every hashtagged post poisoned its own transaction and silently rolled back while the API 201'd. Fixed at 3 layers (tables created + hashtags moved after commit + honest-receipt guards server- and client-side); verified live — post id 32 with hashtag id 1 (the first ever persisted) rendering at the top of the production feed. Feed-write paths are now trustworthy for M4/M5.
- [x] ~~Cover storage shape (M5)~~ **RESOLVED:** the banner system already existed in full (User model bannerPhoto/bannerCollagePhotos/bannerObjectFit/presets) — M5 became flaw fixes (M5a) + crossfade layout + mosaic chrome + /social surfacing (M5b), all shipped and visually verified.
- [x] ~~Observatory tabs keep-vs-drop~~ **RESOLVED at M6:** best widgets + composer types + the banner EDITOR migrated to /social; identity galleries (photos/posts/about) remain reachable at `/profile/:userId`; the Observatory's remaining one-offs (Stories strip, Reels Spotlight card) retired with the surface — recorded here, not silently dropped.
- [ ] **Cleanup backlog (rule 34 — needs Sean's approval as a separate pass):** UserDashboard.V3 + its Observatory-only components are now legacy/unmounted (route redirected, lazy chunk removed). The shared banner machinery (useProfile, useBannerCompositionState, RepositionPanelContent, media layer, banner styles) is STILL LIVE — consumed by the /social editor — so any future cleanup must NOT touch those files.
