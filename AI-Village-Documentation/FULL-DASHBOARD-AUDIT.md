# Full Dashboard Audit - All 4 Dashboards (Playwright Live Audit)

> **Date:** 3/7/2026
> **Method:** Live Playwright browser automation on sswanstudios.com
> **Auditor:** Claude Opus 4.6

---

## Dashboard Inventory

| Dashboard | Route | Role | Sidebar Items | Status |
|-----------|-------|------|---------------|--------|
| Admin Dashboard | `/dashboard/*` | admin | 9 workspaces, 44+ tabs | Production |
| Trainer Dashboard | `/trainer-dashboard` | trainer/admin | 6 sections, 17 items | Mixed (8 WIP) |
| Client Dashboard | `/client-dashboard` | client/admin | 3 sections, 10 items | Production |
| User Dashboard | `/user-dashboard` | all authenticated | 5 content tabs (no sidebar) | Production |

**Total unique views across all dashboards: ~86**

---

## Dashboard 1: Admin Dashboard (`/dashboard/*`)

### 9 Sidebar Workspaces

| Workspace | Tabs | Inner Tabs | Total |
|-----------|------|------------|-------|
| Dashboard | 4 (Overview, Notifications, Pending Approvals, System Snapshot) | 0 | 4 |
| Clients & Team | 10 (Clients, Users, Trainers, Onboarding, Measurements, Progress, Waivers, Messages, Orientation, Assignments) | 0 | 10 |
| Workouts | 4 (Plans, Logger, Movement, AI Protocols) | 0 | 4 |
| Scheduling | 3 (Calendar, Sessions, Assignments) | 0 | 3 |
| Gamification | 4 (Achievements, Rewards, Analytics, Settings) | 4 (duplicated!) | 8 |
| Store & Revenue | 3 (Orders, Packages, Specials) | 0 | 3 |
| Content Studio | 4 (Videos, Social, Exercises, Design) | 6 | 10 |
| Analytics | 4 (Revenue, Social Command, BI Drilldowns, Live User Activity) | 0 | 4 |
| System | 8 (Health, Automation, MCP, Pricing, Sales Scripts, Launch Checklist, Style Guide, Settings) | 0 | 8 |
| **TOTAL** | **44** | **10** | **54** |

### Problems
- Gamification inner tabs mirror outer tabs (duplicate)
- Assignments in BOTH Clients & Team AND Scheduling
- Analytics > Live User Activity shows FAKE data
- System has 3 dead tabs (Sales Scripts, Launch Checklist, Style Guide)
- Content Studio > Design tab has unclear purpose

---

## Dashboard 2: Trainer Dashboard (`/trainer-dashboard`)

### 6 Sidebar Sections, 17 Items

| Section | Item | Status | Overlaps With |
|---------|------|--------|---------------|
| **Command Center** | Training Overview | REAL | Admin > Dashboard |
| | Training Schedule | PARTIAL | Admin > Scheduling (SAME Universal Master Schedule component) |
| **Core Features** | Log Workout | REAL | Admin > Workouts > Logger |
| | Client Progress | REAL | Admin > Clients & Team > Progress |
| | Client Messages | WIP | Admin > Clients & Team > Messages |
| **Client Training** | My Clients | REAL | Admin > Clients & Team > Clients |
| | Form Assessments | PARTIAL | Admin > Workouts > Movement |
| | Goal Tracking | WIP | -- |
| **Content Studio** | Training Videos | WIP | Admin > Content Studio > Videos |
| | Form Check Center | WIP | -- |
| | Content Library | WIP | Admin > Content Studio |
| | Upload Center | WIP | Admin > Content Studio |
| **Performance** | Training Analytics | PARTIAL | Admin > Analytics |
| | Client Achievements | PARTIAL | Admin > Gamification |
| | Engagement Metrics | WIP | -- |
| **Trainer Tools** | Notifications | WIP | Admin > Dashboard > Notifications |
| | Training Reports | PARTIAL | Admin > Analytics |
| | Trainer Settings | REAL | Admin > System > Settings |

### Summary
- **5 REAL** / **4 PARTIAL** / **8 WIP** = only 29% fully functional
- **11 of 17 items overlap** with admin dashboard features
- Content Studio section (4 items) is entirely WIP
- Uses same Universal Master Schedule as admin/client

---

## Dashboard 3: Client Dashboard (`/client-dashboard`)

### 3 Sidebar Sections, 10 Items

| Section | Item | Content | Overlaps With |
|---------|------|---------|---------------|
| **Priority** | Overview | Mission Control: onboarding cards, gamification stats, next session, progress snapshot, recent achievements | -- |
| | Onboarding | Questionnaire (0% complete) + NASM Movement Screen | Admin > Clients & Team > Onboarding |
| | Schedule | Universal Master Schedule (client mode with "Book Recurring") | Admin > Scheduling, Trainer > Training Schedule |
| **Core Features** | Workouts | Workout history from trainer-logged sessions | Admin > Workouts |
| | Progress | Progress tracking and metrics | Admin > Clients & Team > Progress |
| | Body Map | Body measurement visualization | Admin > Clients & Team > Measurements |
| | Gamification | XP, achievements, streaks, level display | Admin > Gamification |
| | Messages | Client-to-trainer messaging | Admin > Clients & Team > Messages |
| **Account** | My Account | Account settings and profile | -- |

### Summary
- Well-structured with clear sections
- Uses RevolutionaryClientDashboard component
- WebSocket-connected for real-time updates
- Gamification data loads via dedicated API
- Schedule shows "Low credits: 0 sessions remaining" with store link
- Overview acts as a true command center for clients

---

## Dashboard 4: User Dashboard (`/user-dashboard`)

### Social Profile Layout (No Sidebar), 5 Content Tabs

| Tab | Content |
|-----|---------|
| **Feed** | Social feed with posts, quick post composer (default visibility: Friends), like/comment/share, "Load more posts" |
| **Creative** | Creative content gallery |
| **Photos** | Photo gallery |
| **About** | User profile information |
| **Activity** | Activity and engagement history |

### Profile Header
- Cover photo (custom swan pattern)
- Profile photo with edit button
- Username (@seanswan), role badge (ADMIN)
- Posts / Followers / Following counts
- Bio text
- Edit Profile, share, and settings buttons

### Quick Stats Sidebar
- Workouts count
- Level
- Points

### Summary
- Instagram/social-media-style profile page
- Completely separate from training functionality
- Post visibility defaults to "Friends" (limits discoverability)
- Seed content from jasmine Swan is showing (auto-posts working)
- No sidebar navigation -- uses horizontal tab bar

---

## Cross-Dashboard Duplicate Matrix

| Feature | Admin | Trainer | Client | User | Recommendation |
|---------|-------|---------|--------|------|----------------|
| Schedule | Scheduling workspace | Training Schedule | Schedule tab | -- | KEEP: Same component (Universal Master Schedule), different modes. Good. |
| Client list | Clients & Team (10 tabs) | My Clients | -- | -- | MERGE: Trainer sees filtered view of admin's client list |
| Messages | Messages tab | Client Messages (WIP) | Messages tab | -- | CONSOLIDATE: One messaging system, accessible from AI drawer |
| Gamification | Full workspace (4+4 tabs) | Client Achievements (partial) | Gamification tab | Quick Stats | ABSORB: Remove admin workspace, embed in client/trainer views |
| Analytics | Full workspace (4 tabs) | Training Analytics (partial) | Progress tab | Activity tab | CONSOLIDATE: Revenue analytics -> Revenue workspace, training -> inline |
| Content/Videos | Content Studio (4+6 tabs) | Content Studio (4 WIP items) | -- | Creative tab | MERGE: One Content workspace in admin, remove trainer duplicate |
| Workout Logging | Workouts workspace (4 tabs) | Log Workout | Workouts tab | -- | KEEP: Different roles see different views. Good. |
| Notifications | Dashboard > Notifications | Notifications (WIP) | -- | -- | CONSOLIDATE: AI drawer handles notifications |
| Settings | System workspace (8 tabs) | Trainer Settings | My Account | Edit Profile | STREAMLINE: System for admin, simple settings for others |

---

## Total View Count & Reduction Target

| Dashboard | Current Views | Target Views | Reduction |
|-----------|---------------|--------------|-----------|
| Admin | 54 | ~25 | -54% |
| Trainer | 17 | ~8 | -53% |
| Client | 10 | 8 | -20% |
| User | 5 | 5 | 0% |
| **TOTAL** | **86** | **~46** | **-47%** |

---

## Recommended Consolidation (Updated with All Dashboards)

### Admin Dashboard: 7 Workspaces, ~25 tabs
(See DASHBOARD-CONSOLIDATION-AUDIT.md for details)

### Trainer Dashboard: 3 Sections, ~8 items
| Section | Items |
|---------|-------|
| **Command Center** | Training Overview, Schedule |
| **Clients** | My Clients (with progress/goals inline), Log Workout |
| **Tools** | Form Assessments, Training Reports, Settings |
- REMOVE: All 4 Content Studio WIP items (use admin Content Studio)
- REMOVE: Client Messages (use AI drawer messaging)
- REMOVE: Notifications (use AI drawer)
- MERGE: Client Achievements + Engagement Metrics -> inline in client cards
- REMOVE: Goal Tracking WIP, Training Videos WIP, Form Check Center WIP, Upload Center WIP

### Client Dashboard: Keep mostly as-is (well designed)
- Already lean and well-organized
- Only change: Messages -> AI drawer

### User Dashboard: Keep as-is
- Social profile is a separate concern
- Works well as a standalone experience

---

## Implementation Priority

### Phase 1: Quick Wins (Admin Dashboard)
1. Remove Gamification inner tab duplication
2. Remove fake Analytics > Live User Activity data
3. Remove System > Sales Scripts, Launch Checklist, Style Guide
4. Remove Content Studio > Design tab

### Phase 2: Trainer Dashboard Cleanup
1. Remove all 8 WIP sidebar items (they show nothing useful)
2. Keep only the 5 REAL + 4 PARTIAL items
3. Group into 3 clean sections

### Phase 3: Cross-Dashboard Merges
1. Absorb Gamification workspace into client/trainer inline views
2. Consolidate Messages into AI drawer
3. Merge Analytics revenue data into Revenue workspace

### Phase 4: AI Assistant Drawer
1. Build AIDrawer component (replaces standalone Messages, Notifications)
2. Build DictationOrb FAB
3. Contextual awareness per dashboard/workspace
