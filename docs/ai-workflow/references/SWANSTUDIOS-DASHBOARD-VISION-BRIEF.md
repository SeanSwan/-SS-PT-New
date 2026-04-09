# SwanStudios Dashboard Vision Brief
> Compact source-of-truth brief for user, client, trainer, and admin dashboard direction.
> Use when: auditing dashboard IA, compacting tabs, placing Swan Coach, or sequencing dashboard redesign work.

## Goal
Turn the dashboard layer into a coherent product system instead of a collection of separate tools.

SwanStudios should feel like:
- a premium fitness operating system
- a benevolent, high-energy social home
- a dictation-first training workflow
- a premium membership product with clear reasons to upgrade

The dashboards must support revenue, daily return behavior, and fast operations without breaking live backend flows.

## Live Surfaces In Scope
### User dashboard
- Route: `/user-dashboard`
- Live file: `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`
- Actual tabs today: `feed`, `creative`, `photos`, `about`, `workouts`, `activity`, `nutrition`
- Core feed surface today: `frontend/src/components/Social/Feed/SocialFeed.tsx`

### Client dashboard
- Entry route: `/dashboard/client/*`
- Live shell: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
- Current nav is driven by `ClientStellarSidebar.tsx`

### Trainer dashboard
- Entry route: `/dashboard/trainer/*`
- Live shell: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
- Current nav is driven by `TrainerStellarSidebar.tsx`

### Admin dashboard
- Entry route: `/dashboard/*`
- Live shell: `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx`
- Admin is already moving toward workspace grouping: home, people, scheduling, store, workouts, gamification, content, analytics, system

## Shared Diagnosis
1. The product has real capability, but the dashboard layer does not present it with enough hierarchy.
2. User, client, trainer, and admin surfaces do not feel like one family. They feel like separate products.
3. Swan Coach exists as a destination page, but not yet as the operating layer that ties the app together.
4. The user dashboard is the weakest strategic surface. It reads more like a profile shell than a place people want to live in.
5. Client and trainer dashboards are too tool-list oriented. They need stronger home tabs and tighter task grouping.
6. Admin is closest to the correct information architecture because workspaces already exist. The main risk there is route drift and too many specialty leaves.
7. Duplicate dashboard variants create product blur and future maintenance drift.

## Non-Negotiable Dashboard Rules
1. Every dashboard needs a real `Home` or `Overview` surface with a clear reason to return daily.
2. User, client, and trainer should stay at about 5 top-level tabs or clusters. Do not let them turn into long utility menus.
3. Tabs must group jobs, not implementation artifacts.
4. Swan Coach must behave like a contextual operating layer, not a detached novelty page.
5. Fitness, motivation, accountability, and benevolent community must outweigh vanity-social mechanics.
6. Mobile at `375px` and `414px` is mandatory. No cramped chip rows or overflow-heavy shells.
7. Do not add random third-party news just to make the product feel busy. Internal momentum, challenges, local community, and creator activity are more on-brand.

## User Dashboard: Deep Analysis
### What is already working
- The route already points to the intended live file, not an old fallback.
- The social backend is real. `SocialFeed` already supports posts, reactions, factions, party systems, activity ticker, and hashtags.
- Gamification data already exists and can support stronger daily-return loops.
- Profile header, badges, charts, and social identity are conceptually aligned with the brand.

### What is making it feel bland
1. The default landing tab is `feed`, but the page shell is still profile-first, not home-first.
2. `creative`, `photos`, `about`, and `activity` consume prime navigation space but do not create strong return behavior.
3. The tab model is already drifting: `UserDashboard.V3.tsx` renders a `workouts` tab, but `UserDashboardTypes.ts` still omits `workouts` from `TabId`.
4. There is not enough "today" energy: no mission card, no next action, no community pulse module, no transformation highlight, no guided challenge path.
5. The dashboard does not yet express a benevolent culture in the product structure. The tone is friendly, but the IA does not reward encouragement, mentorship, or belonging.
6. Swan Coach is missing from the center of the experience, so the page loses one of SwanStudios' strongest differentiators.

### What to keep
- Unified social feed
- achievement showcase and level/tier display
- progress and nutrition adjacency
- profile identity and shareability
- workout-related content, but not necessarily as a top-level tab forever

### What to demote or merge
- `creative` and `photos` should likely become sub-sections of profile/media instead of top-level first-pass tabs
- `about` should merge into profile
- `activity` should merge into home or progress unless it becomes truly distinct and high-value

### Recommended top-level model
Use this order:
1. `Home`
2. `Feed`
3. `Progress`
4. `Community`
5. `Profile`

### What `Home` should contain
- a daily momentum card: streak, next milestone, today's mission
- next workout or next session block
- a "start here" CTA stack for the most likely next action
- community pulse: encouraging posts, active challenges, helpful nearby/community activity
- featured transformation or creator spotlight
- short-form motivational content or story rail driven by SwanStudios content, not random generic news
- elite Swan Coach dock or teaser

### What `Feed` should become
- the main social stream
- not just a list of posts, but also challenge participation, badge shares, helpful trainer tips, and short-form content
- community-first rather than pure vanity metrics

### What `Progress` should become
- workouts, nutrition, recovery, streaks, charts, and achievements in one performance-focused surface
- less scattered than separate `workouts`, `activity`, and chart-heavy fragments

### What `Community` should become
- friends, factions, challenges, local/community groups, events, and benevolent discovery
- reward encouragement, collaboration, and consistency over toxic comparison

### What `Profile` should become
- identity card, bio, links, media, privacy settings, chart visibility, and personal archives
- this is where `creative`, `photos`, and `about` belong

### Swan Coach on the user dashboard
- Everyone can see Swan Coach as part of the product story.
- Full embedded Swan Coach access on the user/social dashboard should be reserved for `Crystalline Swan` (`elite`) members.
- Lower tiers should see a premium teaser state with clear upgrade value, not a dead or misleading control.
- The coach context here should be social-home aware: streak, goals, current challenge, recent activity, and next best action.

### Benevolent community product rules
- Surface encouragement before controversy.
- Reward consistency, kindness, and useful help.
- Keep leaderboards secondary to mission, support, and progress.
- Use copy that feels uplifting and grounded, not spammy hype.
- Make the community feel like a place to belong, not just perform.

## Client Dashboard: Heads-Up Architecture
### Current problem
The client dashboard has the right ingredients, but the grouping still feels like a tool menu:
- overview
- workouts
- progress
- pain chart
- meal planner
- AI consent
- schedule
- community
- messages
- profile
- rewards
- my home

This is too fragmented for a client trying to understand "what do I do next?"

### Recommended top-level model
1. `Home`
2. `Train`
3. `Recover`
4. `Community`
5. `Account`

### Suggested mapping
- `Home`: today's plan, next session, streak, coach preview, priority CTA
- `Train`: workouts, workout logging, progress highlights, nutrition
- `Recover`: pain chart, recovery guidance, habit reminders, coaching check-ins
- `Community`: messages, challenges, community feed, live/community moments
- `Account`: profile, rewards, consent, settings, avatar home

### Swan Coach placement
- Show Swan Coach in `Home` and `Train`.
- Respect privacy and consent boundaries before enabling action-capable flows.
- Use context-aware prompts like "log today's workout" or "help me prep for my next session."

## Trainer Dashboard: Heads-Up Architecture
### Current problem
The trainer sidebar is still too broad and equal-weight:
- clients
- logging
- progress
- assessments
- bootcamp
- planner
- videos
- nutrition
- schedule
- messages
- home

This makes everything feel important and nothing feel prioritized.

### Recommended top-level model
1. `Home`
2. `Clients`
3. `Build`
4. `Schedule`
5. `Studio`

### Suggested mapping
- `Home`: today's sessions, trainer KPIs, quick actions, coach command bar
- `Clients`: client roster, progress, pain charts, assessments, messaging entry
- `Build`: workout planner, workout forge, bootcamp, sprint planner, equipment
- `Schedule`: schedule, booking, live session workflow
- `Studio`: video library, creator tools, trainer content, community-facing publishing

### Swan Coach placement
- Swan Coach should be first-class in `Home` and `Clients`.
- Trainers should be able to dictate into real actions from the surfaces where they work.
- The Coach page can remain, but it should no longer be the only place where Swan Coach feels present.

## Admin Dashboard: Heads-Up Architecture
### Current state
Admin is already on the right path because `UnifiedAdminRoutes.tsx` groups work into workspaces.
Do not blow that up.

### Recommended rule
Admin should stay workspace-first, with specialty pages living under canonical groups instead of as competing top-level destinations.

### Canonical workspace model
1. `Home`
2. `People`
3. `Scheduling`
4. `Programs`
5. `Store`
6. `Content`
7. `Analytics`
8. `System`
9. `Gamification`

### Mapping rule
- `Programs` owns workouts, nutrition, equipment, bootcamp, and movement tooling
- `People` owns clients, trainers, assignments, notes, waivers, orientations, progress, and messaging
- `Content` owns video studio, moderation, publishing, creator workflows, and marketing-adjacent content production
- `Analytics` owns BI, revenue, charts, social analytics
- `System` owns settings, automation, MCP, security, diagnostics

### Admin caution
- Keep redirects canonical.
- Do not reintroduce old flat routes as new top-level habits.
- Keep admin as command-center dense, but not route-chaotic.

## Swan Coach Access Model Across Dashboards
- User dashboard: visible to all, fully interactive only for `elite` on that surface
- Client dashboard: consent-gated and role-safe
- Trainer dashboard: always available as an operations copilot
- Admin dashboard: always available with stronger routing and admin boundaries
- Sean-only Hermes operator power remains separate from normal in-app Swan Coach behavior

## Recommended Rollout Order
1. Redesign the user dashboard into a real `Home`-first social destination.
2. Compact the client dashboard into journey-based tabs.
3. Compact the trainer dashboard into workflow-based tabs.
4. Tighten admin naming and route discipline without blowing up the existing workspace model.
5. Embed Swan Coach into the correct surfaces with the right tier, consent, and role gates.

## Success Standard
This dashboard layer is on track when:
- users immediately understand where to go next
- the user dashboard feels like a place to come back to daily
- clients see a guided journey instead of a menu of tools
- trainers can operate faster with fewer navigation jumps
- admin remains powerful without becoming chaotic
- Swan Coach feels native to the product, not bolted on
