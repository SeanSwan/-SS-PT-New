# SOCIAL MEDIA & USER DASHBOARD — COMPREHENSIVE UPGRADE PROMPT

**Version:** 2.0 (AI Village Validated + Opus CEO Corrections)
**Date:** 2026-03-22
**Author:** Claude Opus 4.6 (CEO) + Sean (Owner)
**Status:** APPROVED — AI Village 11-Brain Validated + Phase 4 CEO Review Complete
**Scope:** UserDashboard, Social Hub, Profile, Gamification, Video Library, Theme System, Promotions

---

## 1. EXECUTIVE SUMMARY

SwanStudios is a **fitness social media platform** — not just a PT app. The social layer is the primary community engagement driver and must compete with AAA social platforms (Instagram, Strava, Fitocracy) while maintaining the Crystalline Swan design identity. This upgrade addresses critical gaps found via Playwright QA baseline and codebase audit.

---

## 2. PLAYWRIGHT QA BASELINE FINDINGS (2026-03-22)

### Critical (1)
- **CREATE_POST:** No create post button found on social feed page (possibly auth-gated route rendering issue)

### High (9)
- **SOCIAL_FEED:** No posts visible on social feed page
- **PROFILE:** No banner/cover photo area detected
- **PROFILE:** No profile picture/avatar detected
- **PROFILE_CHARTS:** 0 chart elements on profile page
- **PROFILE_BADGES:** 0 badge/achievement elements on profile page
- **FRIENDS:** No friend/people suggestion section on social page
- **THEME:** No theme toggle button found in header/dashboard
- **PROMOTIONS:** No promotions/sponsor area — needed for AG1, supplements
- **CONSOLE:** 4 console errors across session

### Medium (8)
- **PROFILE:** No edit profile button found
- **MESSAGING:** No messaging UI elements found
- **GAMIFICATION:** No level-up animation elements in DOM (admin + client dashboards)
- **TOUCH_TARGETS:** Multiple elements below 44px minimum

---

## 3. CODEBASE AUDIT — CURRENT STATE

### Monolith Files Violating 300-Line Rule (MUST decompose)
| File | Lines | Status |
|------|-------|--------|
| `UserDashboard.V3.tsx` | 1,861 | Massive monolith — banner, profile, tabs, modals all inline |
| `PostCard.tsx` | 1,434 | Post rendering + interactions + styling all-in-one |
| `CreatePostCard.tsx` | 1,283 | Post creation form — media upload, text, type selection |
| `SocialPage.V3.tsx` | 784 | Social hub — hero, sidebar, gamification, tab routing |
| `UserProfilePage.tsx` | 673 | Public profile view — should share components with dashboard |
| `ChallengesView.tsx` | 704 | Challenge cards, filters, creation |
| `SocialFeed.tsx` | 552 | Feed with infinite scroll |
| `VerticalReels.tsx` | 508 | TikTok-style vertical video reels |
| `FriendSuggestions.tsx` | 420 | Friend discovery |
| `FriendsList.tsx` | 383 | Friends list with status |

### What EXISTS but is NOT CONNECTED
| Feature | Built? | Where? | Connected to Social/Dashboard? |
|---------|--------|--------|-------------------------------|
| 804 Achievement badges + 500 badge images (20 art styles) | YES | Backend seeder + `frontend/public/badges/` (500+ PNGs) | NO — not rendered on profiles |
| Level-up animations (FFXIV/Overwatch) | YES | `CelebrationPortal.tsx`, `AdminAchievementCelebration.tsx` (783 lines, 30-particle confetti, spring physics), `gamificationAnimations.ts` (619 lines, 24+ keyframes) | PARTIALLY — Provider in App.tsx but only triggers from admin exercise center, not from social |
| Badge art gallery | YES | `BadgeArtGallery.tsx` with filter by style (20), category (9), rarity (4) | NO — admin-only, not on user profiles |
| Achievement showcase | YES | `AchievementShowcase.tsx` + `AchievementGallery.tsx` | NO — not on social profiles |
| Leaderboard | YES | `LeaderboardWidget.tsx` + `Leaderboard.tsx` | NO — not visible in social feed sidebar |
| Gamification dashboards (admin/client/trainer) | YES | Full CRUD in `admin-gamification/`, `client-gamification/`, `trainer-gamification/` | YES — accessible via dashboard but disconnected from social |
| Badge manifests | YES | `badge-manifest.json` (700 lines) + `achievement-badge-manifest.json` (26,905 lines) | NO — manifests loaded by gallery but badges not on profiles |
| AdvancedGamificationHub | YES | Full hub with challenges, showcase, progress, leaderboard, services, hooks | NOT on social pages |
| Victory charts (12 live charts) | YES | `charts/live/` directory | NO — not on user profile page |
| Chart visibility toggles | YES | `ChartVisibilityToggle.tsx` | NO — toggle UI exists but no charts rendered |
| Exercise History mega-chart | YES | `ExerciseHistoryChart.tsx` | NO — not on profile |
| Video catalog system | YES | Backend models + routes | MINIMAL — `/videos` route exists but sparse |
| Workout logger | YES | Admin/trainer dashboard | NO — not on user dashboard |
| Theme toggle | YES | `UniversalThemeToggle.tsx` | NOT VISIBLE — toggle component exists but not in header |
| Creative Gallery | YES | Lazy-loaded in UserDashboard | YES — but user says this should be auto-categorized, not a separate tab |
| Friend suggestions | YES | `FriendSuggestions.tsx` | NOT VISIBLE on social feed |
| Challenge system | YES | Full CRUD | YES — accessible via social tab |

### What DOES NOT EXIST Yet
| Feature | Priority | Notes |
|---------|----------|-------|
| Cyberpunk theme | HIGH | User requested — Cyberpunk: Edgerunners aesthetic |
| True black theme | HIGH | Like workout logger's dark theme |
| Promotions/Sponsor section | HIGH | AG1, supplements, own products — persistent banner/sidebar |
| Video library → Exercise Rolodex connection | HIGH | YouTube exercise tutorials for each of 840+ exercises |
| World map showing user locations | MEDIUM | Free API — users pin their location, optional toggle |
| AI-powered post categorization | MEDIUM | Auto-tag posts as: fitness, art, music, gaming, motivation, etc. |
| Anti-racism/harassment content moderation | HIGH | Content filter algorithms |
| Messaging UI | MEDIUM | Models + routes + controller + `MessagingPage.tsx` exist — more built than expected, needs connection |
| City/state display on profiles | MEDIUM | Optional toggle — like Meetup |
| Community route (public) | HIGH | `/community` has no public route — but `/dashboard/client/community` exists with `CommunityDashboard.tsx` |

### Current Theme System (6 themes)
1. `crystalline-default` — Main Crystalline Swan
2. `crystalline-light` — Light variant
3. `crystalline-dark` — Void Crystal (current default)
4. `crystalline-mono` — Monochrome
5. `cinematic-ember` — Warm/ember
6. `frozen-aurora` — Aurora borealis

**Missing themes requested by owner:**
- `cyberpunk-edgerunners` — Neon pink/yellow/cyan on black, scanlines, glitch effects
- `obsidian-black` — Pure black (#0A0A0F) background, minimal accent colors, like workout logger

---

## 4. USER DASHBOARD UPGRADE SPECIFICATION

### 4.1 Banner & Profile Section (Full-Width)
**Current:** Banner exists but doesn't utilize full screen width. Profile pic small.
**Target:**
- Banner spans 100% viewport width, 200-300px height
- Profile pic overlaps banner bottom edge (100-120px, circular with tier-colored glow border)
- User name, tier badge, level, streak counter displayed prominently
- Edit profile button clearly visible
- Background image upload via click-on-banner

### 4.2 Victory Charts Section (Below Banner)
**Current:** 0 charts on profile
**Target:**
- Charts rendered directly below profile header
- Toggle panel for showing/hiding individual charts
- Default visible: Workout Frequency, Muscle Group Radar, Exercise History Rolodex
- The giant Exercise Rolodex chart (2000+ exercises) should be a featured chart
- Responsive — stacks on mobile, grid on desktop

### 4.3 Tab Navigation (Redesigned)
**Current tabs:** Feed, Creative, Photos, About, Activity, Nutrition
**New tabs:**
| Tab | Content | Priority |
|-----|---------|----------|
| Feed | Social feed with posts, auto-categorized | Keep (enhanced) |
| Workouts | Workout logger (same as client dashboard) | NEW — HIGH |
| Videos | Exercise video library linked to rolodex | NEW — HIGH |
| Badges | Achievement showcase, 804 badges, rarity glow | NEW — HIGH |
| Friends | Friend list, suggestions, requests | Keep (enhanced) |
| About | Profile details, city/state, bio | Keep (enhanced) |

**Removed:**
- "Creative" tab → merged into Feed (auto-categorized posts)
- "Photos" tab → merged into Feed
- "Nutrition" → moved to dedicated page or collapsed into About

### 4.4 Auto-Categorized Posts (Replaces Creative Gallery)
**Current:** Separate Creative Gallery tab
**Target:**
- AI/algorithm auto-labels posts based on content:
  - Fitness (workout logs, PRs, progress photos)
  - Art (images with art keywords)
  - Music (audio, music links)
  - Gaming (gaming keywords)
  - Motivation (quotes, encouragement)
  - General (default)
- Filter chips on feed to filter by category
- SwanStudios logo in text-only posts should be larger (80-100px) and centered
- **AI Village Mandate (Finding 4):** AI suggests category during post creation (optimistic UI). User MUST be able to manually override or correct the AI-assigned category before publishing AND via the "Edit Post" menu. Non-deterministic AI without human override corrupts taxonomy.
- **AI Service Timeout Fallback:** If AI categorization service times out, fall back to manual category selection dropdown

### 4.5 Badge & Achievement Showcase
**Current:** 804 badges exist in DB, 0 rendered on profiles
**Target:**
- Top 3-6 badges displayed on profile header (below name) — direct DOM render (no virtualization needed for 6 items)
- Dedicated "Badges" tab showing all earned + locked badges
- **AI Village Mandate (Finding 2 — DOM Overload):** Badge grid MUST use `react-window` (already installed for Exercise Rolodex) for virtualized rendering. Do NOT render 804 badges simultaneously — this will crash mobile browsers.
- **CEO Correction:** Use `react-window` (existing dependency), NOT `@tanstack/react-virtual` (rejected — no new dep).
- Lazy-load badge SVGs using IntersectionObserver
- Badge cards with rarity glow (Common/Rare/Epic/Legendary)
- Click badge → modal with details, share button, XP info
- Level-up animation triggers when viewing newly earned badges
- FFXIV/Overwatch-style celebration on achievement unlock (already built — connect it)
- **Custom Scrollbar CSS** (from Gemini Creative Director — APPROVED):
  ```css
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: rgba(0, 32, 96, 0.2); border-radius: 8px; }
  &::-webkit-scrollbar-thumb { background: #4070C0; border-radius: 8px; }
  &::-webkit-scrollbar-thumb:hover { background: #60C0F0; }
  ```
- **Badge hover animation:** `transform: translateY(-4px) scale(1.02)`, 150ms, `ease-in-out`

### 4.6 Video Library Tab
**Current:** `/videos` route exists, minimal content
**Target:**
- Exercise tutorial videos linked to Exercise Rolodex (840+ exercises)
- YouTube embed integration — Sean's channel
- Each exercise in the rolodex can have a linked video
- Browse by body part, equipment, difficulty
- Playlist support for workout programs
- Video completion → gamification XP award

### 4.7 Promotions/Sponsor Section
**Current:** Does not exist
**Target:**
- Persistent sidebar card (desktop) or inline banner (mobile)
- AG1 promotion slot
- Supplement recommendations
- Future: Own supplement line products
- Admin-configurable via dashboard
- Non-intrusive but always visible

### 4.8 Friend Suggestions & Discovery
**Current:** Component exists but not visible on social feed
**Target:**
- "People You May Know" section in social feed sidebar
- Suggested based on: same trainer, similar workout patterns, location
- Add friend / Follow button with one tap
- Show mutual friends count

### 4.9 Messaging (Phase 2)
**Current:** Backend models exist, no frontend
**Target (Phase 2):**
- DM between members
- Trainer-client messaging
- Group chat for challenges
- Message notification badge

### 4.10 World Map (Phase 2)
**Current:** Does not exist
**Target:**
- Free API (Leaflet + OpenStreetMap)
- Pin showing where registered users are from
- **AI Village Mandate (Finding 1 — Location Privacy — CRITICAL):**
  - **Opt-In ONLY** (Privacy by Default) — location sharing MUST be explicitly enabled by user, not default on
  - Backend MUST "fuzz" coordinate data by random 1-2 mile radius before sending to frontend
  - NEVER store exact GPS coordinates from user devices for community/map features
  - NEVER expose raw lat/long to frontend APIs — only fuzzy city-level coordinates
  - Map load failure fallback: display text-based location list instead
  - Use Leaflet.markercluster for frontend pin clustering (prevents thousands of DOM nodes)
- Dashboard widget version for admin

---

## 5. THEME SYSTEM UPGRADE

### 5.1 New Themes to Add
| Theme ID | Name | Description |
|----------|------|-------------|
| `obsidian-black` | Obsidian Black | Pure Obsidian Black `#0A0A0F` bg, Carbon `#141419` cards, Graphite `#1A1A24` surfaces, minimal Wing Purple `#8B5CF6` accents. Like the workout logger aesthetic. **PHASE 1 PRIORITY — ship first.** |
| `cyberpunk-edgerunners` | Cyberpunk: Edgerunners | Neon Cyan `#05F2F2` (desaturated from `#00FFFF` to prevent OLED halation/smearing) on Obsidian Black `#0A0A0F`. **Branding Safeguard:** Swan logo in header MUST shift to Pure White (`#FFFFFF`) when this theme is active to prevent color-clashing. Font weights 600+ for primary interactive elements. Scanline overlay, glitch text effects. **PHASE 2 PRIORITY.** |

> **CEO Note:** `#0A0A0F` (Obsidian Black) is an ACTIVE palette token per CLAUDE.md. Do NOT confuse with retired Galaxy-Swan `#0a0a1a`. The cyberpunk cyan `#05F2F2` was approved by Gemini CTO to prevent OLED halation that pure `#00FFFF` causes on mobile screens.

### 5.2 Theme Toggle Visibility
- Theme toggle button MUST be visible in the header/navbar
- Posts, cards, and feed content must respect active theme colors
- Existing `UniversalThemeToggle.tsx` needs to be connected to the site header

---

## 6. EDIT PROFILE ENHANCEMENT

### Current Fields (Shallow)
- Basic name, email, bio

### Target Fields (Deep — inspired by Meetup/Instagram/Strava)
| Field | Type | Required | Privacy Toggle |
|-------|------|----------|---------------|
| Display Name | text | YES | N/A |
| Bio | textarea (500 char) | NO | N/A |
| Profile Photo | image upload | NO | N/A |
| Banner Photo | image upload | NO | N/A |
| City | text | NO | YES — show city or state-only |
| State | dropdown | NO | YES |
| Country | dropdown | NO | Always visible |
| Fitness Goals | multi-select chips | NO | YES |
| Current OPT Phase | display (from backend) | N/A | YES |
| Trainer (if assigned) | display | N/A | YES |
| Social Links | URL inputs (Instagram, YouTube, TikTok) | NO | YES |
| Preferred Equipment | multi-select from equipment list | NO | YES |
| Experience Level | dropdown (Beginner/Intermediate/Advanced/Elite) | NO | YES |

---

## 7. CONTENT MODERATION & SAFETY

### Anti-Harassment Algorithm
**EXISTING infrastructure (more built than expected):**
- `ContentModerationPanel.tsx` — Admin moderation UI
- `BulkModerationPanel.tsx` — Bulk approve/reject actions
- `SocialMediaCommandCenter.tsx` — Full social admin control
- `adminContentModerationController.mjs` + `adminContentModerationRoutes.mjs` — Backend routes
- Post status system: pending, approved, flagged, rejected, hidden
- Auto-moderation with confidence scoring already implemented
- `PostReport.mjs` + `ModerationAction.mjs` — User reporting + admin actions

**GAPS to fill:**
- Keyword filter for racist, sexist, homophobic content (need word lists + regex patterns)
- AI-powered toxicity scoring (integrate free API or expand built-in rules)
- Shadow-ban capability for repeat offenders
  - **AI Village Mandate (Finding 6):** Implement Sequelize `defaultScope` on Post and User models to automatically exclude `isShadowBanned: true` records from all standard read queries. Frontend-only shadow-banning leaks data into aggregate queries, trending algorithms, and direct URL access.
- Strike system UI on user profiles

### Post Content Guidelines
- Auto-detect and warn before posting content that may violate community standards
- Strike system: Warning → 24hr mute → 7-day ban → permanent ban

---

## 8. COMPETITOR RESEARCH REQUIREMENTS (AI Village Task)

Before implementation, AI Village must research and document:

### Social Media Platforms
1. **Instagram** — Profile layout, stories, reels, explore page
2. **Strava** — Fitness social feed, activity cards, kudos system, segments
3. **Fitocracy** — Gamification + social (quests, achievements, leveling)
4. **Peloton App** — Community, challenges, leaderboards
5. **Nike Run Club** — Achievement badges, streaks, social sharing

### Community/Meetup Platforms
6. **Meetup** — Location-based profiles, group discovery
7. **Discord** — Community structure, channels, roles

### Gamification Leaders
8. **Duolingo** — Streak mechanics, XP system, leaderboards
9. **Habitica** — RPG-style gamification, character progression

### Design Inspiration
10. **Cyberpunk: Edgerunners UI** — Neon aesthetic, glitch effects, terminal-style data displays

---

## 9. DECOMPOSITION PLAN (300-Line Rule Compliance)

### UserDashboard.V3.tsx (1,861 → ~15 files)
```
UserDashboard/
├── UserDashboard.tsx          (main orchestrator, <200 lines)
├── components/
│   ├── ProfileBanner.tsx       (banner + profile pic overlay)
│   ├── ProfileHeader.tsx       (name, tier, level, streak, edit button)
│   ├── ProfileCharts.tsx       (Victory chart grid + toggle)
│   ├── TabNavigation.tsx       (tab bar component)
│   ├── FeedTab.tsx            (social feed with auto-categorization)
│   ├── WorkoutTab.tsx         (workout logger embedded)
│   ├── VideosTab.tsx          (exercise video library)
│   ├── BadgesTab.tsx          (achievement showcase)
│   ├── FriendsTab.tsx         (friend list + suggestions)
│   ├── AboutTab.tsx           (profile details, location, goals)
│   ├── PromotionSidebar.tsx   (AG1, supplements, products)
│   └── EditProfileModal.tsx   (enhanced edit form)
├── hooks/
│   ├── useProfileData.ts      (profile fetch/update, TanStack Query w/ 5min stale-time)
│   ├── useFeedData.ts         (MUST implement cursor-based pagination, NOT offset-based — AI Village Finding 5)
│   ├── usePostCategories.ts   (auto-categorization logic with user override)
│   └── useVideoLibrary.ts     (video catalog integration)
├── styles/
│   └── UserDashboardStyles.ts (all styled-components)
└── types/
    └── UserDashboardTypes.ts  (interfaces)
```

### SocialPage.V3.tsx (784 → ~8 files)
### PostCard.tsx (1,434 → ~6 files)
### CreatePostCard.tsx (1,283 → ~5 files)
(Decomposition details per component in blueprint phase)

---

## 10. IMPLEMENTATION PHASES

### Phase 1: Foundation (P1 — This Sprint, BLOCKING)
1. Decompose monolith files (300-line compliance) — **PREREQUISITE for all feature work**
   - `UserDashboard.V3.tsx` (1,861 → ~15 files)
   - `PostCard.tsx` (1,434 → ~6 files)
   - `CreatePostCard.tsx` (1,283 → ~5 files)
   - `SocialPage.V3.tsx` (784 → ~8 files)
2. Implement 3-tier error boundary architecture
3. Blueprint all components per CLAUDE.md protocol
4. Add cursor-based pagination to social feed (`useFeedData.ts`)
5. Add Crystalline Shimmer skeleton loaders to all async components

### Phase 2: Core Features (P2)
1. Connect existing disconnected features:
   - Victory charts → profile (with toggle controls)
   - Badges/achievements → profile (top 6 + virtualized grid)
   - Level-up animations → social interactions (connect CelebrationPortal)
   - Theme toggle → header (connect `UniversalThemeToggle.tsx`)
   - Friend suggestions → social feed sidebar
2. Profile banner/photo upgrade (full-width, 100-120px profile pic)
3. Add workout logger tab to user dashboard
4. Add Obsidian Black theme (ship first, before Cyberpunk)

### Phase 3: Social Enhancements (P3)
1. Feed enhancements + create-post modal UX upgrade
2. AI post auto-categorization with user override
3. Add promotions sidebar (AG1, supplements)
4. Enhanced edit profile (deep fields — city/state, goals, social links)
5. Community route (public)

### Phase 4: Premium Features (P4)
1. Video library tab with YouTube exercise integration
2. World map with user pins (opt-in + coordinate fuzzing)
3. Content moderation frontend enhancements
4. Cyberpunk theme (`#05F2F2` + white logo)

### Phase 5: Polish & Future (P5)
1. Messaging UI (DMs, group chat)
2. Advanced AI-powered content algorithms
3. Exercise video recording/upload

---

## 11. AI VILLAGE VALIDATION TASKS

The AI Village 11-brain system should:

1. **Validate this prompt** — Check for completeness, contradictions, missing requirements
2. **Competitor research** — Document findings from 10 competitor platforms listed above
3. **Prioritize features** — Rank by impact vs. effort
4. **Security audit** — Content moderation, RBAC on social features, IDOR prevention
5. **Accessibility audit** — WCAG compliance on all social components
6. **Performance audit** — Lazy loading, virtualization for large feeds, image optimization
7. **Blueprint review** — Validate decomposition plan meets 300-line rule
8. **Design review** — Gemini 3.1 Pro (CTO) validates Crystalline Swan consistency
9. **Theme review** — Validate new theme tokens against design system
10. **Mobile-first audit** — Verify all components work at 320-430px viewports

---

## 12. ERROR HANDLING & RESILIENCE (AI Village Consensus — MANDATORY)

### 3-Tier Error Boundary Architecture
| Tier | Scope | UX |
|------|-------|-----|
| `RootErrorBoundary` | Wraps entire app | Midnight Sapphire bg, Ice Wing button. Logs error → clears storage → `history.back()` → fallback to `/`. Shattered Swan watermark (grayscale, clip-path, rotated) |
| `DataErrorBoundary` | Wraps data-fetching sections | Crystalline Error Card: Royal Depth `#003080` bg, 1px solid Arctic Cyan `#50A0F0`, "Recalibrate" retry button |
| `ComponentErrorBoundary` | Wraps individual widgets (Feed, Map, Badges) | Same Crystalline Error Card. Crash in one widget does NOT unmount the Dashboard tree |

### Resilience Rules
- **Network Failures:** Show inline retry buttons (NOT full-page errors)
- **Partial Data:** Render available content, show skeleton loaders for missing sections
- **AI Service Timeout:** Fall back to manual category selection
- **Map Load Failure:** Display text-based location list as fallback
- **Badge Fetch 500:** Show skeleton grid with "Retry" — never blank white page

### Premium Loading States (Crystalline Shimmer)
All async components MUST use skeleton fallbacks with this shimmer:
```css
background: linear-gradient(90deg, #003080 25%, #4070C0 50%, #003080 75%);
background-size: 200% 100%;
animation: swanShimmer 1.5s infinite linear;
border-radius: 12px;
@keyframes swanShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
Apply `contain: layout style paint;` to skeletons.

### Zero State (Empty Data)
- Headline: *Cormorant Garamond Italic* ("Your legacy awaits...")
- Body: *Plus Jakarta Sans Regular*
- CTA: *Sora SemiBold*
- Asset: `/public/assets/swan-emblem-watermark.svg` at `opacity: 0.15; mix-blend-mode: luminosity`

---

## 13. ACCESSIBILITY & MOTION PERFORMANCE (AI Village Consensus — MANDATORY)

### Accessibility (A11y)
- **Focus Ring (CLAUDE.md source of truth — CEO Correction 3):**
  ```css
  *:focus-visible {
    outline: 2px solid #60C0F0; /* Ice Wing — NOT Wing Purple */
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
  }
  ```
- Implement `react-focus-lock` for all modals (APPROVED dependency)
- Add visually hidden skip navigation links
- Descriptive `aria-label` on all badge images
- All interactive elements: 44px minimum touch target

### Motion Performance Budget
- Max 3 concurrent CSS animations in viewport (enforce via `IntersectionObserver`)
- ONLY `transform` and `opacity` animations (GPU-composited) — no `width`/`height`/`top`/`left`
- Respect `prefers-reduced-motion` (disable shimmer/reveals)
- **Chart animations:** Max 800ms duration, custom bezier: `cubic-bezier(0.25, 1, 0.5, 1)`
- **Badge hover:** `transform: translateY(-4px) scale(1.02)`, 150ms, `ease-in-out`

### Theme Validation CI/CD Check
**Eradicate retired Galaxy-Swan tokens** (CEO Correction 1 — `#0A0A0F` is ACTIVE, not retired):
```bash
grep -r "#00FFFF\|#0a0a1a\|#FF2D78\|#7851A9" src/ && exit 1
```
> **WARNING:** Do NOT include `#0A0A0F` in this check. Obsidian Black `#0A0A0F` is an ACTIVE palette token per CLAUDE.md.

---

## 14. IMPLEMENTATION PRIORITY (CEO Directive)

| Priority | Phase | Items | Blocking? |
|----------|-------|-------|-----------|
| P0 | Done | Backend model import fixes (7 files) | RESOLVED |
| P1 | Foundation | Decompose monolith files, error boundaries, cursor pagination | YES — prerequisite for all feature work |
| P2 | Core | Profile banner/photo upgrade, badge grid (react-window), Victory charts on profile | |
| P3 | Social | Feed enhancements, create-post modal, friend suggestions, theme toggle in header | |
| P4 | Premium | World map (opt-in + fuzzing), promotions area, workout logger on user dashboard | |
| P5 | Polish | Cyberpunk theme (`#05F2F2`), level-up animation connections, content moderation UI | |

### Dependency Rules
- No new dependencies without justification
- `react-window` for ALL virtualization (badge grid, exercise rolodex) — do NOT add `@tanstack/react-virtual`
- `react-focus-lock` for modals — APPROVED
- Leaflet + OpenStreetMap for world map — APPROVED
- TanStack Query (React Query) for social feed caching — APPROVED (5min stale-time profiles, 1min feed)

---

## 15. SUCCESS CRITERIA

### Foundation
- [ ] All social components have blueprint headers per CLAUDE.md protocol
- [ ] No file exceeds 300 lines of code (monoliths decomposed)
- [ ] 3-tier error boundary architecture implemented (Root, Data, Component)
- [ ] Crystalline Shimmer skeleton loaders on all async components
- [ ] Cursor-based pagination on social feed (NOT offset-based)

### Features
- [ ] Top 6 badges on profile header + virtualized badge grid (`react-window`) in Badges tab
- [ ] Level-up animations trigger on achievement unlock (connected from `CelebrationPortal`)
- [ ] Victory charts rendered on profile with toggle controls
- [ ] Theme toggle visible in header, affects all content
- [ ] Obsidian Black theme functional (Phase 1)
- [ ] Workout logger accessible from user dashboard
- [ ] Create post button visible and functional
- [ ] AI post categorization with user override capability
- [ ] Friend suggestions visible on social feed
- [ ] Promotions section present and admin-configurable

### Quality
- [ ] All interactive elements meet 44px minimum touch target
- [ ] 4.5:1 WCAG contrast ratio on all text
- [ ] Focus ring uses Ice Wing `#60C0F0` per CLAUDE.md (not Wing Purple)
- [ ] Zero retired Galaxy-Swan tokens (`#00FFFF`, `#0a0a1a`, `#FF2D78`, `#7851A9`) in src/
- [ ] `prefers-reduced-motion` respected on all animations
- [ ] Max 3 concurrent CSS animations in viewport
- [ ] Zero console errors on social pages
- [ ] Playwright QA passes with 0 CRITICAL, 0 HIGH findings

### Privacy & Security
- [ ] World map location data opt-in only (privacy by default)
- [ ] Backend coordinate fuzzing (1-2 mile radius) before sending to frontend
- [ ] Shadow-ban uses Sequelize `defaultScope` (database-level, not frontend-only)
