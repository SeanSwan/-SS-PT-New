# Dashboard Consolidation Audit — Playwright QA Results

## Current State: 9 Sidebar Items, 50+ Tabs (TOO MANY)

### Raw Tab Count Per Workspace
| Workspace | Tabs | Inner Tabs | Total Clicks to Reach |
|-----------|------|------------|----------------------|
| Dashboard | 4 | 0 | 2 |
| Clients & Team | 10 | 0 | 2 |
| Workouts | 4 | 0 | 2 |
| Scheduling | 3 | 0 | 2 |
| Gamification | 4 | 4 (duplicated!) | 3 |
| Store & Revenue | 3 | 0 | 2 |
| Content Studio | 4 | 6 | 3 |
| Analytics | 4 | 0 | 2 |
| System | 8 | 0 | 2 |
| **TOTAL** | **44** | **10** | **54 unique views** |

---

## PROBLEMS IDENTIFIED

### P1: Duplicate Tabs (Same Content, Different Location)
- **Assignments** appears in BOTH Clients & Team AND Scheduling
- **Gamification** has 4 outer tabs that mirror 4 identical inner tabs
- **Analytics** tab exists in Gamification AND as a standalone workspace
- **Social Command** in Analytics overlaps with Social Intelligence widget in Dashboard

### P2: Orphaned / Low-Value Tabs
- **System > Sales Scripts** — not connected to anything, likely placeholder
- **System > Launch Checklist** — one-time use, not daily workflow
- **System > Style Guide** — developer reference, not trainer workflow
- **Content Studio > Design** — unclear purpose for trainer
- **Analytics > Live User Activity** — shows FAKE data (Alex P., Emma R., Sarah M. from Seattle/NY/Miami)

### P3: Too Many Client-Related Tabs Scattered
Client data is spread across 3 workspaces:
- **Clients & Team**: Clients, Users, Trainers, Onboarding, Measurements, Progress, Waivers
- **Scheduling**: Sessions (client sessions)
- **Workouts**: Plans, Logger, Movement (all client-specific)

### P4: Tabs That Should Be Merged
- **Users + Trainers + Clients** = one "People" view with role filters
- **Measurements + Progress** = one "Client Progress" tab
- **Onboarding + Orientation Queue + Waivers** = one "Intake" flow
- **Messages** doesn't belong in Clients & Team — it's communication

---

## PROPOSED CONSOLIDATION: 7 Workspaces, ~25 Tabs

### Workspace 1: Command Center (replaces Dashboard)
**Tabs:** Overview, Notifications
- Merge "Pending Approvals" into Notifications with filter
- Merge "System Snapshot" into Overview as a collapsible section
- ADD: AI Assistant drawer (persistent, accessible from any workspace)
- ADD: Daily Briefing widget (AI-generated summary)

### Workspace 2: Clients (replaces Clients & Team)
**Tabs:** All Clients, Intake, Progress
- **All Clients**: Merged Users/Trainers/Clients with role filter dropdown
- **Intake**: Merged Onboarding + Orientation Queue + Waivers (one flow)
- **Progress**: Merged Measurements + Progress tracking
- MOVE Messages out → accessible via AI drawer or header icon
- MOVE Assignments → into client detail view (not its own tab)

### Workspace 3: Workouts (keep as-is, it works well)
**Tabs:** Plans, Logger, Movement, AI Protocols
- Already consolidated and working per our earlier fixes
- AI Protocols connects to Swan AI assistant

### Workspace 4: Schedule (replaces Scheduling)
**Tabs:** Calendar, Sessions
- **Calendar**: Master Schedule (already great)
- **Sessions**: Session list with filters
- REMOVE duplicate Assignments tab (handled in client detail)

### Workspace 5: Revenue (replaces Store & Revenue + Analytics > Revenue)
**Tabs:** Orders, Packages, Analytics
- **Orders**: Current pending orders view
- **Packages**: Package management + Specials (merge Specials into Packages)
- **Analytics**: Revenue analytics + BI Drilldowns (from Analytics workspace)

### Workspace 6: Content (replaces Content Studio + Analytics > Social)
**Tabs:** Videos, Social, Exercises
- **Videos**: Video library with YouTube integration (flatten inner tabs into filters)
- **Social**: Social Command + Moderation + Social Intelligence (merged)
- **Exercises**: Exercise database management
- REMOVE: Design tab (not trainer workflow)

### Workspace 7: System (streamlined)
**Tabs:** Health, Settings
- **Health**: System health + Automation + MCP (merged into one monitoring view)
- **Settings**: Pricing + general settings
- REMOVE: Sales Scripts, Launch Checklist, Style Guide (move to docs or admin-only hidden panel)

### Gamification: ABSORBED
- Achievements/Rewards → visible in client detail view + AI briefing
- Settings → System > Settings
- Analytics → Revenue > Analytics or client-level progress
- Not its own workspace — it's a cross-cutting feature

---

## CLICK REDUCTION ANALYSIS

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Sidebar items | 9 | 7 | 22% fewer |
| Total tabs | 54 | ~25 | 54% fewer |
| Max clicks to reach any view | 3 | 2 | 33% fewer |
| Duplicate views eliminated | 0 | 6 | - |
| Fake/placeholder views removed | 0 | 5 | - |

---

## AI ASSISTANT INTEGRATION POINTS

The Swan AI drawer replaces the need for several standalone tabs:
- **Messages**: AI drafts and sends messages → no dedicated tab needed
- **Notifications**: AI triages → surfaces critical items in briefing
- **Social Command**: AI manages content calendar → embedded in Content workspace
- **Sales Scripts**: AI generates on-demand → no static tab needed
- **Gamification Analytics**: AI reports milestones → no dedicated workspace

---

## IMPLEMENTATION PHASES

### Phase 0: Audit & Document (THIS DOCUMENT)
- [x] Playwright audit of all workspaces
- [x] Tab inventory
- [x] Consolidation proposal
- [ ] AI Village validation

### Phase 1: Remove Duplicates & Dead Tabs (Quick Wins)
- Remove duplicate Gamification inner tabs
- Remove fake Analytics data (Live User Activity)
- Remove Sales Scripts, Launch Checklist, Style Guide tabs
- Remove Design tab from Content Studio

### Phase 2: Merge Related Tabs
- Users + Trainers + Clients → unified People view
- Measurements + Progress → Client Progress
- Onboarding + Orientation Queue + Waivers → Intake flow
- Specials → into Packages tab

### Phase 3: Consolidate Workspaces
- Gamification → absorbed into client views + System settings
- Analytics Revenue + BI → into Revenue workspace
- Social Command → into Content workspace
- Assignments → into client detail (remove standalone tabs)

### Phase 4: AI Assistant Drawer
- Build AIDrawer component (Gemini specs)
- Build DictationOrb FAB
- Wire to backend AI router
- Contextual awareness per workspace

### Phase 5: UX Polish
- Ensure all views are ≤2 clicks from sidebar
- Mobile responsive audit
- 44px touch targets on all new components
- Framer Motion transitions between consolidated views
