# NEXT SESSION PROMPT — 2026-04-07 (Phase 3 Build Sprint Continuation)

## Copy everything below this line and paste to Claude in the new session:

---

We're continuing from a massive build sprint. Here's where we are:

## Completed & Deployed (All Committed + Pushed to Main)

### Bug Fix Tiers (from prior session)
| Commit | What | Status |
|--------|------|--------|
| `9d82f517` | Tier 3: 5 feature-completion fixes | Deployed, Codex R2 |
| `54fbdb55` | Tier 4: WCAG contrast audit — 26 files, 37 opacity fixes | Deployed, Codex R2 |
| `b7ed91e5` | Codex: hero CTAs + store scroll jank fix | Deployed |

### Phase 1 Builds (All Deployed, Codex Reviewed)
| Commit | Feature | Status |
|--------|---------|--------|
| `82b7fd8e` | **6.4 Social Media Phase 1** — Postiz client, FTC/FDA compliance, 5 platforms | Deployed, Codex R4 |
| `a5c5a7db` | **6.10 Video Chat Phase 1** — LiveKit service, VideoSession model, PreCallCheck, VideoRoom | Deployed, Codex R4 |
| `e361b993` | **6.2 Gamification V3 Phase 1** — AvatarHome, Level 10 unlock, HomeWorld, MinimalistView | Deployed, Codex R4 |
| `681061ee` | **6.3 Badge Creator Phase 1** — Recraft V3 service, 40 art styles, StyleBrowser, BadgeCreatorPage | Deployed, Codex R6 |

### Phase 2 Builds (All Deployed, Codex Reviewed)
| Commit | Feature | Status |
|--------|---------|--------|
| `fca8ea6e` | **6.4 Social Media Phase 2** — scheduling, SocialAnalyticsDashboard, platform connections | Deployed, Codex R4 |
| `137a4a29` | **6.10 Video Chat Phase 2** — FreezeFrameAnnotator, AssessmentNotesPanel, MicroWinOverlay, 5-type XP | Deployed, Codex R4 |
| `a17af5ab` | **6.2 Gamification Phase 2** — CompanionPetPanel, PetAdoptionModal, VirtualOlympicsPage, Ghost Racing, Recovery Day Wisdom XP | Deployed, Codex R4 |
| `c7023137` | **6.3 Badge Creator Phase 2** — BadgeGalleryPanel, rarity borders, assignment system (achievement/tab/milestone), public tab-icons API | Deployed, Codex R2 |

### Phase 3 Builds (In Progress)
| Feature | Status | Details |
|---------|--------|---------|
| **6.4 Social Media Phase 3** | **BUILT, NOT YET COMMITTED** — Awaiting Codex R2 | ContentCalendarPanel (7-day AI calendar, best-time-to-post, auto-post templates with live DB stats), 3 new backend endpoints |

## What Needs To Happen Next (IN ORDER)

### 1. Commit 6.4 Social Media Phase 3 (awaiting Codex)
- **Debate file:** `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-6.4-PHASE3-2026-04-07.md`
- Either Codex R2 is already in the file, or Sean needs to send the prompt
- After consensus → commit + push these files:
  - `backend/routes/adminSocialPublishingRoutes.mjs` (modified — 3 new endpoints)
  - `frontend/src/components/DashBoard/workspaces/marketing/ContentCalendarPanel.tsx` (new)
  - `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx` (modified — AI Calendar tab)

### 2. Phase 3 Builds (continue in order)
| Feature | Phase 3 Scope | CEO Ruling Reference |
|---------|---------------|---------------------|
| **6.3 Badge Creator** | Batch generation (5 variations), style mixing, avatar icons for pets, animated badges (Lottie) | `opus-ceo-ruling-badge-creator.md` |
| **6.10 Video Chat** | ROM tracking via MediaPipe, Recovery Score, wearable data (HealthKit/Google Fit), Deepgram transcription, WCAG video player | `opus-ceo-ruling-video-chat-webrtc.md` |
| **6.2 Gamification** | LangGraph pet AI (DEFERRED — deterministic first), Crystalline Marketplace, Corporate Faction hooks (architecture only), HealthKit recovery data, Ready Player Me avatar | `opus-ceo-ruling-gamification-v3-sims.md` |

### 3. Unstarted Tier 5 Items (need planning first)
| Item | Category | Notes |
|------|----------|-------|
| **6.1** Subscription Tier Restructuring | Opus planning (free) | Competitive research needed |
| **6.5** Nutrition Intelligence | Already AI Village approved (2026-03-31) | 6-phase plan exists, not built |
| **6.6** Content Studio Overhaul | Gemini CTO consult | Merge Marketing → Content Studio |
| **6.7** Calendar System Overhaul | Opus planning | 24hr support, admin-only, Coach AI |
| **6.8** Teach Me Mode | Gemini CTO consult | Every tab needs educational overlay |
| **6.9** Client Dashboard Consolidation | Opus planning | Widget-based overview redesign |
| **6.11** Playwright QA Test Suite | Opus planning | Full regression suite |

### 4. Deferred Tier 3 (need recursive planning)
| Item | Why Deferred |
|------|-------------|
| **4.1** Joint-friendly alternatives | Major backend + frontend refactor |
| **4.11** Merge Workout Intelligence + Planner | Major refactor across routing/sidebar/components |

## Key Architecture Decisions Made This Sprint
- **Postiz** (open-source) for social media scheduling — NOT building OAuth from scratch
- **LiveKit** for video chat — NOT raw WebRTC
- **Recraft V3** for badge generation — specializes in icons
- **Ghost Racing** for Virtual Olympics — async, not real-time multiplayer
- **Level 10 progressive unlock** for 3D avatar home — NOT day 1
- **50/month global badge generation cap** — DB-backed, survives deploys
- **Deterministic state machine** for pet AI (Phase 2) — LangGraph deferred to Phase 3
- **Recovery Day = Wisdom XP** — rewarding smart rest, not just volume
- **Public /api/badge-tab-icons** — dashboard icon overrides without admin auth
- **Fitness industry best-time data** for social posting intelligence

## Key Files Created This Sprint

### Phase 2 Files (already committed)
- `backend/models/OlympicEvent.mjs` — Virtual Olympics performances
- `backend/routes/olympicRoutes.mjs` — 6 endpoints (events, submit, ghosts, leaderboard, recovery-day, recovery-status)
- `frontend/src/components/AvatarHome/CompanionPetPanel.tsx` — pet display + interactions
- `frontend/src/components/AvatarHome/PetAdoptionModal.tsx` — 5 species selection
- `frontend/src/components/VirtualOlympics/VirtualOlympicsPage.tsx` — 3 events + Ghost Racing + leaderboard
- `frontend/src/components/BadgeCreator/BadgeGalleryPanel.tsx` — filterable gallery + assignment UI

### Phase 3 Files (not yet committed — awaiting Codex on 6.4)
- `frontend/src/components/DashBoard/workspaces/marketing/ContentCalendarPanel.tsx` — AI calendar + best times + auto-post templates

## AI Village Runs (4 completed, $1.30 total)
All CEO rulings in `AI-Village-Documentation/validation-prompts/latest/`:
- `opus-ceo-ruling-social-media-publishing.md`
- `opus-ceo-ruling-video-chat-webrtc.md`
- `opus-ceo-ruling-gamification-v3-sims.md`
- `opus-ceo-ruling-badge-creator.md`

## Master Registry
All issues documented in: `docs/ai-workflow/AI-HANDOFF/MASTER-ISSUE-REGISTRY-2026-04-07.md`

## Debate Protocol
- Per-phase debate files (not mega-files)
- Archive on consensus to `docs/ai-workflow/AI-HANDOFF/debate-archive/`
- Max 500 lines per debate file
- Details in CLAUDE.md under "Opus-Codex Recursive Debate Protocol"
