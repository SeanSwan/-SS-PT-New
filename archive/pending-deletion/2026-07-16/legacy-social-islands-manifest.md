# Legacy Social Roots and Orphan Islands Archive - 2026-07-16

## Purpose

This companion manifest records two unmounted social roots plus closed social feature islands moved during the pre-launch audit. Original paths remain recoverable; no file was deleted.

## Evidence

- `main-routes.tsx:274-290` declares `UserDashboard.V3` as the main hub and redirects `/social` compatibility URLs into it.
- `DashboardFeedTab.tsx:16-18,65-70` mounts `SocialCoachDock`, `SocialFeed`, and `SocialRightRail`.
- A resolved-import closure retained all 32 candidate files reachable from those three mounted roots.
- The 20 source files below had no incoming import outside the dead candidate set; the one test covered only the archived V3 root.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/Social/CreatorEconomy/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/CreatorEconomy/index.ts` | unconsumed placeholder or legacy barrel |
| `frontend/src/components/Social/Explore/ExploreStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Explore/ExploreStyles.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Explore/ExploreTypes.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Explore/ExploreTypes.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Explore/ExploreView.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Explore/ExploreView.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Explore/useExplore.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Explore/useExplore.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Feed/components/FriendSuggestionsSidebar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/components/FriendSuggestionsSidebar.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Feed/styles/SidebarStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Feed/styles/SidebarStyles.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/LiveStreaming/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/LiveStreaming/index.ts` | unconsumed placeholder or legacy barrel |
| `frontend/src/components/Social/Messaging/E2EEIndicator.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Messaging/E2EEIndicator.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Messaging/E2EESettings.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Messaging/E2EESettings.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Messaging/SafetyNumberDialog.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Messaging/SafetyNumberDialog.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/BadgeDetailModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/BadgeDetailModal.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/BadgeDetailModalStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/BadgeDetailModalStyles.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/BadgesTab.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/BadgesTab.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/BadgesTabStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/BadgesTabStyles.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/ProfileBadgeShowcase.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/ProfileBadgeShowcase.tsx` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/ProfileBadgeShowcaseTypes.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/ProfileBadgeShowcaseTypes.ts` | closed orphaned social feature island |
| `frontend/src/components/Social/Profile/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/Social/Profile/index.ts` | unconsumed placeholder or legacy barrel |
| `frontend/src/pages/Social/SocialPage.V3.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/SocialPage.V3.tsx` | explicitly unmounted legacy social root |
| `frontend/src/pages/Social/SocialPage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/SocialPage.tsx` | explicitly unmounted legacy social root |
| `frontend/src/pages/Social/SocialPageCoachEntry.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/Social/SocialPageCoachEntry.test.ts` | source-only test for archived V3 root |

## Retained mounted closure

The mounted Social Feed, Coach Dock, Right Rail, post composer, workout attachment, notification, and related style/hook dependencies remain in place.

## Restore procedure

Restore only after proving a mounted consumer and product need, then rerun the dashboard feed tests, social tests, typecheck, production build, full frontend suite, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
