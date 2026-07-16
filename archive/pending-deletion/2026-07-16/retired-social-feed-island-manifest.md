# Retired Full Social Feed Island Archive - 2026-07-16

## Purpose

This companion manifest records the retired full-feed tab, its closed dependency island, and source-only tests moved during the pre-launch audit. Original paths remain recoverable; no file was deleted.

## Evidence

- `UserDashboardTabs.tsx` does not import `DashboardFeedTab`; contract tests explicitly lock that Workstream O removal.
- `main-routes.tsx:284-290,795-805` redirects old Social routes to User Dashboard Home or current tabs.
- The only production-source incoming imports for `SocialCoachDock`, `SocialFeed`, and `SocialRightRail` came from the unmounted `DashboardFeedTab`.
- A resolved-import closure proved the 33 source files below form a closed island.
- Nine tests below exercised only that retired island and were archived with it.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/UserDashboard/components/DashboardFeedTab.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UserDashboard/components/DashboardFeedTab.tsx` | unmounted retired feed-tab root |
| `frontend/src/components/Social/CoachDock/InlineChallengeFinder.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineChallengeFinder.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/InlineChallengeFinder.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineChallengeFinder.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/InlineCheerPicker.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineCheerPicker.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/InlineMilestoneShare.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineMilestoneShare.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/InlineMilestoneShare.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineMilestoneShare.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/SocialCoachDock.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/SocialCoachDock.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/SocialCoachDock.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/SocialCoachDock.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/milestoneResolver.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/milestoneResolver.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/ActivityTicker.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/ActivityTicker.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/CreatePostCard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/CreatePostCard.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/NotificationBell.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/NotificationBell.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/SocialFeed.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/SocialFeed.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CategoryOverrideSelector.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CategoryOverrideSelector.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreatePostForm.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreatePostForm.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreatePostHashtagAssist.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreatePostHashtagAssist.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreatePostMediaUpload.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreatePostMediaUpload.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreatePostTypeSelector.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreatePostTypeSelector.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreateWorkoutAttachmentPanel.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreateWorkoutAttachmentPanel.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/CreateWorkoutAttachmentPanel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/CreateWorkoutAttachmentPanel.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/FeedCoverIdentity.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/FeedCoverIdentity.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/FeedCoverStudio.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/FeedCoverStudio.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/FeedCoverStudio.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/FeedCoverStudio.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/SocialFeedPostStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/SocialFeedPostStream.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/SocialFeedReady.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/SocialFeedReady.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/SocialFeedSections.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/SocialFeedSections.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/components/SocialFeedState.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/SocialFeedState.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/hooks/useCreatePostForm.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/hooks/useCreatePostForm.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/hooks/useSocialFeedViewModel.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/hooks/useSocialFeedViewModel.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/hooks/useWorkoutAttachmentBuilder.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/hooks/useWorkoutAttachmentBuilder.ts` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` | dependency used only by retired full-feed island |
| `frontend/src/pages/Social/components/SocialRightRail.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/components/SocialRightRail.styles.ts` | dependency used only by retired full-feed island |
| `frontend/src/pages/Social/components/SocialRightRail.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/components/SocialRightRail.tsx` | dependency used only by retired full-feed island |
| `frontend/src/components/Social/CoachDock/SocialCoachDock.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/SocialCoachDock.test.tsx` | source-only test for retired feed island |
| `frontend/src/components/Social/CoachDock/InlineMilestoneShare.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineMilestoneShare.test.tsx` | source-only test for retired feed island |
| `frontend/src/components/Social/CoachDock/InlineCheerPicker.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineCheerPicker.test.tsx` | source-only test for retired feed island |
| `frontend/src/components/Social/CoachDock/InlineChallengeFinder.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CoachDock/InlineChallengeFinder.test.tsx` | source-only test for retired feed island |
| `frontend/src/components/Social/Feed/SocialFeed.retryContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/SocialFeed.retryContract.test.ts` | source-only test for retired feed island |
| `frontend/src/components/Social/Feed/SocialFeed.coverStudio.contract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/SocialFeed.coverStudio.contract.test.ts` | source-only test for retired feed island |
| `frontend/src/components/Social/Feed/CreatePostCard.workoutAttachment.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/CreatePostCard.workoutAttachment.test.tsx` | source-only test for retired feed island |
| `frontend/src/components/Social/Feed/CreatePostCard.contract.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/CreatePostCard.contract.test.tsx` | source-only test for retired feed island |
| `frontend/src/pages/Social/components/SocialRightRail.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/components/SocialRightRail.test.tsx` | source-only test for retired feed island |

## Explicitly retained shared Social primitives

Mounted Home/community code still owns `useSocialFeed`, `HomeCommunityFeed`, `PostCard`, `SocialFeedPanels`, `SocialFeedStyles`, group feed components, activity state, and all other imports reachable from current User Dashboard tabs.

## Restore procedure

Restore only after proving a mounted consumer and product need, then rerun User Dashboard Home/community tests, social API tests, typecheck, production build, full frontend suite, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
