# User Dashboard Banner And Feed Audit Record - 2026-05-25

## Phase Header

- Phase: User Dashboard banner composer plus feed composer/readout refinement
- Scope: profile banner media controls, persisted banner presentation settings, feed card category cleanup, achievement disclosure, SwanStudios author logo, smart post intent and hashtag assist
- Date: 2026-05-25
- Reviewed by: Codex builder and hostile-review pass
- Final verdict: APPROVED FOR RENDER PUSH after listed verification commands pass

## Files Involved

| File | Lines | Purpose |
| --- | ---: | --- |
| `backend/controllers/profileController.mjs` | 894 | Persists banner crop, fit, height, collage media, carousel, sticky strip, and preset fields through the profile API. |
| `backend/models/User.mjs` | 613 | Adds user profile columns for banner presentation and presets. |
| `backend/migrations/20260525000100-add-banner-presentation-presets.cjs` | 57 | Render migration for carousel layout, sticky carousel, and saved presets. |
| `backend/tests/api/profileBannerCropContract.test.mjs` | 98 | Backend contract tests for banner storage, migration coverage, uploads, and proxy allowlists. |
| `backend/utils/startupMigrations.mjs` | 695 | Startup repair migration alignment for banner storage fields. |
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | 174 | Wires dynamic banner height into dashboard layout flow. |
| `frontend/src/components/UserDashboard/UserDashboardBannerCrop.contract.test.ts` | 162 | Frontend contract coverage for crop, tile, collage, carousel, sticky strip, and content flow. |
| `frontend/src/components/UserDashboard/components/UserDashboardBannerCollageStrip.tsx` | 203 | Adaptive collage and carousel strip rendering. |
| `frontend/src/components/UserDashboard/components/UserDashboardBannerCropControls.tsx` | 222 | User-facing cover controls for fit, tile, collage, carousel, sticky strip, and presets. |
| `frontend/src/components/UserDashboard/components/UserDashboardBannerCropControls.test.tsx` | 285 | Component tests for banner controls and persistence behavior. |
| `frontend/src/components/UserDashboard/components/UserDashboardBannerMediaLayer.tsx` | 171 | Banner media renderer for images, videos, tile, collage, and carousel modes. |
| `frontend/src/components/UserDashboard/components/UserDashboardProfileHeaderV3.tsx` | 234 | Keeps identity and right-rail cards below the dynamic banner. |
| `frontend/src/components/UserDashboard/components/UserDashboardBannerRepositionPanelContent.tsx` | 215 | Extracted reposition panel body to keep controls manageable. |
| `frontend/src/components/UserDashboard/hooks/useBannerCompositionState.ts` | 294 | Local and persisted state for all banner composition settings. |
| `frontend/src/components/UserDashboard/hooks/useBannerCompositionState.test.tsx` | 200 | Hook tests for rollback, uploads, sticky carousel, and presets. |
| `frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts` | 225 | Dashboard controller bridge for banner persistence. |
| `frontend/src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts` | 283 | Banner control placement away from right-rail cards. |
| `frontend/src/components/UserDashboard/styles/DashboardV3BannerCarouselStyles.ts` | 83 | Carousel and sticky mini-strip styling. |
| `frontend/src/components/UserDashboard/styles/DashboardV3BannerCompositionStyles.ts` | 220 | Tile, collage, and adaptive media frame styling. |
| `frontend/src/components/UserDashboard/styles/DashboardV3BannerPresetStyles.ts` | 88 | Saved preset styling. |
| `frontend/src/components/UserDashboard/styles/DashboardV3BannerStyles.ts` | 170 | Dynamic banner shell styling. |
| `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` | 17 | Dashboard-level spacing variable support. |
| `frontend/src/services/profileService.ts` | 656 | Profile API client payload and parser support for new banner fields. |
| `frontend/src/components/Social/Feed/CreatePostCard.tsx` | 250 | Simplifies manual post intent choices and adds hashtag assist. |
| `frontend/src/components/Social/Feed/components/CreatePostHashtagAssist.tsx` | 52 | Smart intent label and suggested hashtag chip component. |
| `frontend/src/components/Social/Feed/components/CreatePostTypeSelector.tsx` | 82 | Focused post type selector copy for the smaller manual picker. |
| `frontend/src/components/Social/Feed/components/PostContent.tsx` | 196 | Mobile-friendly achievement summary disclosure. |
| `frontend/src/components/Social/Feed/components/PostHeader.tsx` | 200 | SwanStudios author logo and single text-area post type badge. |
| `frontend/src/components/Social/Feed/components/PostMediaDisplay.tsx` | 49 | Removes media-overlay category badges. |
| `frontend/src/components/Social/Feed/hooks/useCreatePostForm.ts` | 284 | Auto-infers post intent and hashtags before submit. |
| `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` | 652 | Composer smart-assist styles. |
| `frontend/src/components/Social/Feed/styles/PostCardStyles.ts` | 851 | Feed card logo, video shell, and achievement disclosure styles. |
| `frontend/src/components/Social/Feed/types/CreatePostTypes.ts` | 166 | Type support for smart intent return values. |
| `frontend/src/components/Social/Feed/types/PostCardTypes.ts` | 231 | Category labels and color mapping. |
| `frontend/src/components/Social/Feed/utils/postIntentInference.ts` | 137 | Keyword-based post intent and hashtag suggestion helper. |
| `frontend/src/components/Social/Feed/utils/postIntentInference.test.ts` | 31 | Unit tests for smart intent and hashtag behavior. |
| `frontend/src/components/Social/Feed/PostCardDisplay.contract.test.tsx` | 78 | Feed card regression tests for duplicate badges, logo, and achievement disclosure. |
| `frontend/src/components/Social/Feed/CreatePostCard.contract.test.tsx` | 14 | Composer regression test for the focused manual picker. |

## Architecture And Runtime Flow

User Dashboard route flow:

`/user-dashboard` route -> `UserDashboard` -> `UserDashboardTabsV3` -> `SocialFeed` -> `CreatePostCard` and `PostCard`

Banner flow:

`UserDashboard.V3` loads profile state -> banner composition hook normalizes local edits -> controls preview crop, fit, tile, collage, carousel, sticky strip, and presets -> profile service sends persisted profile patch or media upload -> backend profile controller validates and stores fields on `User`.

Feed composer flow:

User writes a post -> manual picker only exposes Post, Workout, Transformation, Achievement, Challenge -> `inferSmartPostIntent` reads caption and selected core intent -> hashtag assist suggests discovery tags -> submit uses the selected workout-first intent or inferred creative intent when the user leaves the picker on general.

Feed display flow:

Backend feed returns post -> `PostCard` renders media without category overlays -> `PostHeader` renders one category chip in the text/meta area -> SwanStudios authors get the SwanStudios mark beside the author name -> achievement posts render a 44px disclosure button that opens the summary on tap, click, or keyboard activation.

## Security Logic And Posture

- No new LLM call path was added, so no user content or PII is sent to an AI provider.
- Smart categorization is deterministic client-side keyword inference, not server-side moderation and not a security boundary.
- Banner media upload stays on the existing authenticated profile API path and proxy allowlists.
- Collage removal and upload rollback behavior is tested so failed persistence does not silently corrupt the local banner state.
- Profile fields are stored as structured JSON/strings instead of dynamic code or unsafe HTML.
- The post card continues rendering React text nodes, not injected HTML.
- The browser smoke was blocked by auth and only verified the protected redirect had no console errors.

## Best Practices Applied

- Rule 2: touch targets for achievement disclosure and hashtag chips are at least 44px.
- Rule 6: new feed achievement colors use CSS variables with fallbacks.
- Rule 8: no PII leaves the client for inference.
- Rule 17: hostile review ran after implementation and before commit.
- Rule 18: changes follow existing shared `SocialFeed` and `UserDashboard` surfaces.
- Rule 21: task-specific tests and production build ran before push.
- Rule 24: visual route smoke was attempted, but auth prevented protected dashboard inspection.
- Rule 42: backend untracked and modified-file audit ran before push.

## Known Limitations And Non-Goals

- The smart post intent helper is keyword-based. It is intentionally lightweight and can be upgraded later to an authenticated server classifier if privacy gates and moderation requirements are defined.
- The local browser did not have a production auth token, so authenticated dashboard visuals still need a real Render smoke after deploy.
- Existing large style files remain over 300 lines. This slice avoided unrelated file surgery while extracting the new banner reposition body.
- Hashtag suggestions are guidance, not enforcement.

## Performance And UX Considerations

- The feed composer removes the long creative category picker from the main path to reduce decision fatigue.
- Hashtag chips are capped and deduped to avoid tag stuffing.
- Feed media no longer carries duplicate overlays, keeping images unobstructed.
- Achievement summaries use progressive disclosure so mobile users can tap for context without reading a permanent block every time.
- Banner collage and carousel modes use adaptive sizing so uploaded media does not collapse into fixed empty cells.

## Test Coverage Summary

- `frontend/src/components/Social/Feed/utils/postIntentInference.test.ts`: validates smart labels and hashtag behavior.
- `frontend/src/components/Social/Feed/PostCardDisplay.contract.test.tsx`: validates no media overlay label, SwanStudios logo mark, and mobile achievement disclosure.
- `frontend/src/components/Social/Feed/CreatePostCard.contract.test.tsx`: validates focused manual picker.
- `frontend/src/components/UserDashboard/UserDashboardBannerCrop.contract.test.ts`: validates banner behavior contract.
- `frontend/src/components/UserDashboard/components/UserDashboardBannerCropControls.test.tsx`: validates control interactions.
- `frontend/src/components/UserDashboard/hooks/useBannerCompositionState.test.tsx`: validates persistence and rollback.
- `backend/tests/api/profileBannerCropContract.test.mjs`: validates backend migration/storage/upload contract.

## Rollback Plan

1. Revert the deploy commit with a normal `git revert <commit-sha>` and push to `main`.
2. If Render migration has already added columns, leave additive columns in place unless they cause runtime issues; the app will ignore them after revert.
3. If a banner preset or collage payload causes user-specific display problems, clear the affected user's banner composition columns through an audited admin DB action.
4. If feed composer inference creates bad labeling, revert the feed helper and `useCreatePostForm` submit change first; posts already stored with supported enum types remain readable.

## Future Review Hooks

- Re-examine keyword inference once real community posts exist; add examples from actual post copy and remove false positives.
- Audit mobile screenshots of the authenticated feed at 414px, 768px, 1440px, 2560px, and 3840px after Render deploy.
- Confirm production migration applied on Render and profile payloads include the new banner fields.
- Consider server-side hashtag normalization if hashtag search becomes a core discovery surface.
- Add a privacy-reviewed AI classifier only if keyword inference stops being good enough.
- Revisit the over-300-line legacy style files in a separate cleanup pass.

## Codex / AI Review Log

- 2026-05-25: Canonical surface receipt traced `/user-dashboard` to `SocialFeed`, `CreatePostCard`, and `PostCard`.
- 2026-05-25: Browser research checked progressive disclosure, mobile tooltip/disclosure accessibility, hashtag usage, and AI tagging UX direction.
- 2026-05-25: Red/green tests added for feed-card duplicate labels, SwanStudios logo mark, achievement disclosure, manual picker simplification, and smart hashtag/intent behavior.
- 2026-05-25: Hostile review removed broad author-logo matching and corrected new achievement colors to tokenized CSS.
- 2026-05-25: Playwright attempted protected route smoke and confirmed unauthenticated redirect to login with no console errors.
