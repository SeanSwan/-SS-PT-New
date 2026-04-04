# Dashboard Architecture
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: dashboard page work, admin/client/trainer dashboards

---

## Dashboard Architecture (MANDATORY Reference)

### Admin Dashboard (19 specialty pages)
All under `frontend/src/components/DashBoard/Pages/`:

| Page | Key Component | AI Context | Gamification |
|------|---------------|------------|--------------|
| Overview | `admin-dashboard-view.tsx` | `general` | Dashboard KPIs |
| Clients | `ClientManagementDashboard.tsx` | `client_review` | Client XP/tier display |
| Sessions | `admin-sessions-view.tsx` | `scheduling` | Session completion points |
| Exercises | `AdminExerciseCommandCenter.tsx` | `exercise_library` | Exercise XP values |
| Gamification | `admin-gamification-view.tsx` | `gamification` | Full admin controls |
| Packages | `admin-packages-view.tsx` | `store` | Purchase rewards |
| Video Studio | `VideoStudioManager.tsx` | `content` | View completion XP |
| Onboarding | `UnifiedOnboardingWizard.tsx` | `onboarding` | Onboarding milestone badges |
| Movement Analysis | `MovementAnalysisWizard.tsx` | `assessment` | Assessment completion |
| Reports | `ReportAnalyticsDashboard.tsx` | `data_analysis` | — |

### 9 Workspace Containers
Located in `frontend/src/components/DashBoard/workspaces/`:
Dashboard, Clients, Scheduling, Workouts, Store, Content, Gamification, Analytics, System

### Client Dashboard
`frontend/src/components/ClientDashboard/` — Sections: GamificationSection, SocialProfileSection, CommunitySection, ProfileSection
`frontend/src/components/DashBoard/Pages/client-dashboard/` — AchievementsCard, ScheduledSessionsCard, NasmCategoryProgress, ChallengesCard, RewardsCard
