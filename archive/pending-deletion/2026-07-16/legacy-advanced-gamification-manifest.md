# Legacy Advanced Gamification Island Archive - 2026-07-16

## Purpose

This companion manifest records a closed legacy gamification dependency island moved during the pre-launch audit. Original paths remain recoverable under the pending-deletion archive; no file was deleted.

## Evidence

- Production-only Fallow classified all 29 source files as unreachable from current runtime entry points.
- Repo-wide path-import search found no consumer outside the closed island.
- The sole test in this batch covered only the archived `gamificationHelpers.ts`.
- The canonical standalone surface is `AdvancedGamificationPage` (`main-routes.tsx:266-268,758-764`).
- The canonical admin surface is `AdminGamificationView` (`UniversalDashboardLayout.routes.tsx:134`; `routeComponents.tsx:27`).
- Active Aegis HUD, Companion Pet, Ghost Mode, Job Class Selector, `gamificationPath.ts`, and their hardening tests remain in the runtime tree.
- Staged Vault Decryption files remain because active hardening tests exercise them.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/AdvancedGamification/components/AchievementShowcase.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/AchievementShowcase.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/ChallengeCenter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/ChallengeCenter.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/ChallengeSystem/ChallengeCard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/ChallengeSystem/ChallengeCard.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/ChallengeSystem/ChallengeList.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/ChallengeSystem/ChallengeList.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatar.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatarStyles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatarStyles.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatarTypes.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/CrystallineAvatar/CrystallineAvatarTypes.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/CrystallineAvatar/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/CrystallineAvatar/index.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/GamificationHub.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/GamificationHub.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/index.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/LeaderboardWidget.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/LeaderboardWidget.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/ProgressTracker.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/ProgressTracker.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/StreakFortress/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/StreakFortress/index.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/components/StreakFortress/StreakFortress.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/components/StreakFortress/StreakFortress.tsx` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/hooks/admin/useGamificationSettings.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/hooks/admin/useGamificationSettings.tsx` | legacy island data layer |
| `frontend/src/components/AdvancedGamification/hooks/useGamificationData.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/hooks/useGamificationData.tsx` | legacy island data layer |
| `frontend/src/components/AdvancedGamification/services/adminGamificationAPI.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/services/adminGamificationAPI.ts` | legacy island data layer |
| `frontend/src/components/AdvancedGamification/services/gamificationAPI.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/services/gamificationAPI.ts` | legacy island data layer |
| `frontend/src/components/AdvancedGamification/shared/AnimatedButton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/AnimatedButton.tsx` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/shared/FormComponents/ChallengeTypeSelector.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/FormComponents/ChallengeTypeSelector.tsx` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/shared/FormComponents/DifficultySlider.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/FormComponents/DifficultySlider.tsx` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/shared/GamificationCard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/GamificationCard.tsx` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/shared/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/index.ts` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/shared/TabNavigation.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/shared/TabNavigation.tsx` | legacy island shared UI dependency |
| `frontend/src/components/AdvancedGamification/types/achievement.types.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/types/achievement.types.ts` | legacy island type contract |
| `frontend/src/components/AdvancedGamification/types/challenge.types.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/types/challenge.types.ts` | legacy island type contract |
| `frontend/src/components/AdvancedGamification/types/gamification.types.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/types/gamification.types.ts` | legacy island type contract |
| `frontend/src/components/AdvancedGamification/utils/challengeValidation.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/utils/challengeValidation.ts` | legacy island UI or utility |
| `frontend/src/components/AdvancedGamification/utils/gamificationHelpers.determinism.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/utils/gamificationHelpers.determinism.test.ts` | source-only test for archived helper |
| `frontend/src/components/AdvancedGamification/utils/gamificationHelpers.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/AdvancedGamification/utils/gamificationHelpers.ts` | legacy island UI or utility |

## Restore procedure

Restore only after proving a mounted consumer, moving the complete required dependency slice back to its original paths, and rerunning typecheck, build, focused gamification tests, the full frontend suite, and lint.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
