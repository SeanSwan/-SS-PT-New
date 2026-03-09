# SwanStudios AI Assistant - Master Blueprint

## Vision Statement
An AI-powered business assistant deeply integrated with the SwanStudios platform that serves as a personal trainer's command center — automating workout logging, managing clients, driving social media strategy, staying current with exercise science, and enabling voice-driven real-time workout dictation across all devices.

## Core Identity
- **Name:** Swan AI (working title)
- **Role:** AI Business Partner for Personal Trainers
- **Access Model:** Role-based (Admin/Trainer/Client) with privacy-first architecture
- **Integration:** Deep platform integration with SwanStudios database, services, and UI

---

## SECTION 1: AI ASSISTANT CORE ENGINE

### 1.1 Multi-Provider AI Router (Existing Pattern)
Leverage the existing WorkoutCopilotPanel provider router pattern:
- **Primary:** OpenAI GPT-4o (conversation, analysis)
- **Fallback 1:** Anthropic Claude (reasoning, safety checks)
- **Fallback 2:** Google Gemini 3.1 Pro (design authority, long context)
- **Free Tier Pool:** DeepSeek, MiniMax, Gemini Flash (via OpenRouter)
- **Validation:** AI Village orchestrator for recursive quality checks

### 1.2 Knowledge Domains
The AI must be expert-level in:

| Domain | Sources | Priority |
|--------|---------|----------|
| NASM OPT Model (Phases 1-5) | NASM textbook, certified protocols | CRITICAL |
| Squat University | Dr. Aaron Horschig's methodology | CRITICAL |
| Nutrition & Macro Planning | ISSN guidelines, macro calculators | HIGH |
| Injury Rehabilitation | NASM-CES protocols, PT referral triggers | HIGH |
| Flexibility & Mobility | FMS screening, corrective exercise | HIGH |
| Sport-Specific Training | Golf, basketball, baseball, soccer, football, track, hockey | HIGH |
| Cardiovascular Programming | ACSM guidelines, HR zone training | HIGH |
| Scientific Research | PubMed, JSCR, NSCA journals | MEDIUM |
| Social Media Marketing | Platform algorithms, content strategy | MEDIUM |
| Business Analytics | Revenue tracking, client acquisition | MEDIUM |

### 1.3 Research & Trend Engine
- **Auto-scan** fitness journals (PubMed, JSCR, Sports Medicine) weekly
- **Reddit monitoring:** r/personaltraining, r/fitness, r/NASM, r/SquatUniversity
- **Trend detection:** Track viral workout trends, new exercise science findings
- **Study summaries:** Auto-generate trainer-friendly summaries of relevant papers
- **Alert system:** Notify when new research impacts current client programming

---

## SECTION 2: WORKOUT AUTOMATION

### 2.1 Workout Logger Auto-Fill
**Problem:** Trainer manually fills out workout forms after every session.
**Solution:** AI parses workout data and fills DailyWorkoutForm in the backend automatically.

**Data Sources for Auto-Fill:**
1. Voice dictation during session (real-time)
2. Voice memo upload (post-session)
3. Photo/video upload of written workout notes
4. AI-generated workout plans (from WorkoutCopilotPanel)
5. Manual text input via chat

**Auto-Fill Pipeline:**
```
Input (voice/text/photo) → Transcription (Whisper API) →
NLP Parsing (extract exercises, sets, reps, weight, RPE, notes) →
Exercise Matching (fuzzy match against Exercises table) →
Form Population (create DailyWorkoutForm via API) →
Trainer Review & Confirm → Session Deduction
```

### 2.2 Real-Time Dictation Mode
- **Active Session Mode:** Phone stays listening while trainer works with client
- **Background Execution:** Service Worker + Web Audio API for screen-off recording
- **Wake Word:** "Hey Swan" or tap-to-talk toggle
- **Progressive Web App (PWA):** Immediate capability via existing PWA infrastructure
- **Native App (Future):** React Native or Capacitor wrapper for iOS/Android/Desktop
- **Offline Buffer:** Record locally, sync when connection available

### 2.3 Dictation Data Model
```
Voice Input: "Sean did 3 sets of bench press, 185 for 8, 195 for 6, 205 for 4, RPE 8"
Parsed Output: {
  clientName: "Sean",
  exercises: [{
    name: "Bench Press",
    exerciseId: "matched-uuid",
    sets: [
      { setNumber: 1, weight: 185, reps: 8, rpe: null },
      { setNumber: 2, weight: 195, reps: 6, rpe: null },
      { setNumber: 3, weight: 205, reps: 4, rpe: 8 }
    ]
  }]
}
```

---

## SECTION 3: CLIENT MANAGEMENT AUTOMATION

### 3.1 Onboarding Auto-Fill
- Parse voice memos or dictation to fill:
  - Client Onboarding Questionnaire
  - Movement Analysis forms
  - Baseline Measurements
  - Medical history / injury notes
  - Goal setting forms
- AI extracts structured data from unstructured conversation

### 3.2 Measurement Tracking
- Voice-driven body measurement entry
- Photo-based progress tracking (pose comparison)
- Auto-generate progress reports for clients
- Trend analysis with visual charts

### 3.3 Communication Automation
- Draft and send messages via the Messages tab
- Auto-respond to common client questions (availability, pricing)
- Session reminders with personalized motivation
- Birthday/milestone celebrations
- Re-engagement messages for inactive clients

### 3.4 Notification Intelligence
- Triage notifications by revenue impact priority
- Daily briefing: "You have 3 pending actions that affect revenue"
- Smart batching: Group similar notifications
- Escalation: Flag critical items (payment issues, cancellations)

---

## SECTION 4: NUTRITION & MACRO PLANNING

### 4.1 Macro Calculator Engine
- **Inputs:** Client weight, height, age, activity level, goals, dietary restrictions
- **Methods:** Mifflin-St Jeor, Harris-Benedict, Katch-McArdle (if body fat % available)
- **Output:** Daily calories, protein/carbs/fat targets, meal timing recommendations
- **Adjustments:** Auto-adjust based on progress data (weight trends, performance)

### 4.2 Meal Plan Generation
- Template-based meal plans aligned with macro targets
- Grocery list generation
- Meal prep scheduling
- Restaurant-friendly options
- Allergy/restriction aware

### 4.3 Supplement Recommendations
- Evidence-based supplement suggestions per client goals
- Dosing protocols aligned with ISSN position stands
- Integration with SwanStudios store (affiliate → white-label pipeline)
- Contraindication checks against client medical history

---

## SECTION 5: SOCIAL MEDIA AI MANAGER

### 5.1 Content Calendar Intelligence
- Auto-generate weekly content calendar based on the 5-pillar system (Educate/Inspire/Connect/Convert/Community)
- Suggest post topics based on:
  - Trending fitness topics
  - Upcoming client milestones
  - Seasonal relevance (New Year, summer body, etc.)
  - Exercise database (most-used exercises → content ideas)
  - Local events (Anaheim Hills calendar)

### 5.2 Post Generation
- Draft posts with platform-specific formatting (Instagram, Facebook, YouTube, Nextdoor, LinkedIn, Bluesky)
- Generate hashtag sets per platform
- Create caption variants for A/B testing
- Schedule optimal posting times per platform

### 5.3 Video Content Strategy
- Analyze Exercise database → suggest which exercises need videos first
- Prioritize by: most assigned to clients, trending searches, no existing video
- Generate video scripts with hook/body/CTA structure
- Thumbnail text suggestions
- YouTube SEO titles and descriptions

### 5.4 Social Media Accountability Widget
- Dashboard widget tracking social media plan adherence
- "You've posted 3/7 times this week" progress bar
- Streaks and gamification for the trainer (practice what you preach)
- Weekly performance review: engagement metrics, follower growth, lead attribution

### 5.5 Marketing Motivation Coach
- Daily marketing nudges: "Time to post your Form Friday content!"
- Suggestions based on what's working: "Your mobility videos get 3x more engagement"
- Competitive intelligence: Monitor local trainer social media presence
- Revenue attribution: Track which posts led to client inquiries

---

## SECTION 6: BUSINESS INTELLIGENCE

### 6.1 Revenue Analytics (Admin Only)
- Monthly revenue tracking with projections
- Client lifetime value calculations
- Package sell-through rates
- Session utilization rates
- Revenue per client segment (Fairmont parents, golfers, seniors, etc.)

### 6.2 Growth Recommendations
- "You're at $8K/month. To hit $12K, you need 3 more clients on 10-packs"
- Identify upsell opportunities: "5 clients on 10-packs could be upgraded to 24-packs"
- Churn prediction: Flag clients at risk of dropping off
- Optimal pricing analysis based on market data

### 6.3 Milestone Tracking (per Social Media Master Strategy)
- Phase 1-8 progress tracking
- Automated milestone celebrations
- Next-action recommendations per phase

---

## SECTION 7: SECURITY & PRIVACY ARCHITECTURE

### 7.1 Data Privacy Framework
**Problem:** AI providers are cloud services. Client PII must not be exposed.

**Solution: Tokenized Context Protocol**
```
Client Data Flow:
1. Raw client data stays in SwanStudios PostgreSQL (never leaves)
2. AI receives TOKENIZED context: "Client_A (male, 35, goal: strength, injury: rotator cuff)"
3. AI generates recommendations using tokens
4. Backend de-tokenizes and applies to real client records
5. No PII (names, emails, phones, addresses) ever sent to AI providers
```

### 7.2 Role-Based AI Permissions

| Capability | Admin | Trainer | Client |
|-----------|-------|---------|--------|
| Revenue analytics | YES | NO | NO |
| All client data | YES | Own clients only | Own data only |
| Social media AI | YES | NO | NO |
| Workout generation | YES | Own clients | Own workouts |
| Exercise library | YES | YES | YES |
| Notification triage | YES | Own notifications | Own notifications |
| Message drafting | YES | Own clients | Own trainer |
| Business intelligence | YES | NO | NO |
| Site security monitoring | YES | NO | NO |
| Supplement recommendations | YES | YES | View only |
| Video library suggestions | YES | YES | Browse only |

### 7.3 Security Monitoring
- AI monitors failed login attempts, unusual API patterns
- Rate limiting awareness and alerting
- Dependency vulnerability scanning (npm audit integration)
- SSL certificate expiry monitoring
- Database query performance alerts

---

## SECTION 8: UX/UI CONSOLIDATION

### 8.1 Problem: Too Many Pages
Current state has separate pages for:
- Workout Logger, Workout Plans, Movement Analysis, AI Protocols
- Client onboarding, measurements, nutrition, notes
- Messages, notifications, scheduling
- Social media, content calendar, analytics

### 8.2 Solution: Unified Workspace Model
Consolidate into minimal tab structure:

**Admin Dashboard Workspaces (7 total):**
1. **Command Center** — Dashboard overview, notifications, AI chat, daily briefing
2. **Clients & Team** — Client profiles, onboarding, measurements, notes (all-in-one)
3. **Workouts** — Plans, Logger, Movement, AI Protocols (already consolidated)
4. **Scheduling** — Calendar, availability, session management
5. **Content Studio** — Social media, video library, content calendar, analytics
6. **Store & Revenue** — Packages, supplements, orders, revenue analytics
7. **System** — Settings, security, integrations

**Key Principle:** The AI Assistant is accessible from ANY workspace via a persistent chat drawer (not a separate page). Slide open from right edge or voice-activate.

### 8.3 AI Chat Interface
- **Persistent drawer** on right side of screen (not a modal, not a full page)
- **Contextual awareness:** AI knows which workspace you're in and adapts suggestions
- **Quick actions:** Buttons for common tasks (Log Workout, Draft Post, Check Revenue)
- **Voice toggle:** Microphone button for dictation mode
- **File upload:** Drop zone for voice memos, photos, workout notes
- **Conversation history:** Searchable chat history with the AI

### 8.4 Mobile-First Dictation UX
- **Floating mic button** (FAB) on mobile for instant voice capture
- **Waveform visualizer** showing active recording
- **Background recording indicator** (status bar notification via PWA)
- **Quick review screen** after dictation: parsed workout summary before confirmation
- **Offline queue** with sync indicator

---

## SECTION 9: SOCIAL MEDIA MASTER STRATEGY INTEGRATION

### 9.1 Strategy Data Model
Store the entire social media strategy in the database:
- Phases (1-8) with milestones and triggers
- Content pillars (Educate/Inspire/Connect/Convert/Community)
- Target client segments with acquisition channels
- Revenue milestones and tracking
- Weekly content calendar template
- Platform-specific posting rules

### 9.2 AI-Driven Execution
The AI doesn't just suggest — it helps execute:
- "It's Form Friday — here's a script for your next exercise demo video based on exercises your clients do most"
- "3 Fairmont parents haven't been contacted in 2 weeks. Draft a check-in?"
- "Your LinkedIn hasn't been posted to in 5 days. Here's a thought leadership draft about desk worker mobility"
- "Nextdoor has 2 new 'looking for trainer' posts in Anaheim Hills. Want me to draft responses?"

### 9.3 Photography Workflow Integration
- Track which exercises have been filmed vs. need filming
- Suggest batch filming sessions based on content calendar gaps
- Auto-generate YouTube descriptions and tags from exercise metadata
- Cross-platform content distribution checklist

---

## SECTION 10: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)
- [ ] AI Chat drawer component (persistent, contextual)
- [ ] Tokenized context protocol (PII protection)
- [ ] Voice-to-text integration (Whisper API or Web Speech API)
- [ ] Basic workout dictation parsing
- [ ] Exercise fuzzy matching against database

### Phase 2: Workout Automation (Weeks 3-4)
- [ ] Auto-fill DailyWorkoutForm from parsed dictation
- [ ] Voice memo upload and transcription
- [ ] Workout review/confirm flow before submission
- [ ] Real-time dictation mode with background recording (PWA)

### Phase 3: Client Management (Weeks 5-6)
- [ ] Onboarding form auto-fill from dictation
- [ ] Measurement entry via voice
- [ ] Message drafting and sending
- [ ] Notification triage and daily briefing

### Phase 4: Social Media AI (Weeks 7-8)
- [ ] Content calendar with AI suggestions
- [ ] Post drafting per platform
- [ ] Video content prioritization from exercise database
- [ ] Social media accountability widget
- [ ] Marketing motivation nudges

### Phase 5: Business Intelligence (Weeks 9-10)
- [ ] Revenue analytics dashboard
- [ ] Growth recommendations engine
- [ ] Client segment tracking (per master strategy)
- [ ] Milestone tracking for 8-phase plan

### Phase 6: Research & Trends (Weeks 11-12)
- [ ] Scientific paper scanning (PubMed API)
- [ ] Reddit trend monitoring
- [ ] Auto-generated research summaries
- [ ] Trending workout alerts

### Phase 7: Native Apps (Future)
- [ ] React Native / Capacitor wrapper
- [ ] iOS app with background audio recording
- [ ] Android app with background audio recording
- [ ] Windows desktop app (Electron or Tauri)
- [ ] Push notifications across all platforms

---

## SECTION 11: SOCIAL MEDIA MASTER STRATEGY (ENHANCED)

### Revenue Targets (Original + Enhanced)

| Milestone | Monthly Revenue | What It Takes | AI Assistant Role |
|-----------|----------------|---------------|-------------------|
| Month 1-3 | $3,000-$5,000 | 3-4 clients on 10-packs | Lead gen automation, Nextdoor monitoring, Fairmont photo delivery |
| Month 4-6 | $6,000-$9,000 | 5-7 clients + mobility class | Content calendar execution, class promotion, referral tracking |
| Month 7-12 | $10,000-$14,000 | 8-12 clients + supplements | Upsell recommendations, supplement store launch, churn prevention |
| Year 2-3 | $20,000-$30,000 | 15-20 clients + trainers | Trainer onboarding, multi-trainer scheduling, franchise playbook |

### Platform Priority Matrix (AI-Enhanced)

| Platform | Priority | AI Automation Level | Content Type |
|----------|----------|-------------------|--------------|
| Nextdoor | HIGHEST | Auto-draft responses to "looking for trainer" posts | Hyperlocal tips, class announcements |
| Instagram | HIGH | Caption generation, hashtag optimization, scheduling | Reels, professional photos, Stories |
| YouTube | HIGH | SEO titles, descriptions, thumbnail text, Shorts cuts | Exercise library, challenge series |
| Facebook | MEDIUM-HIGH | Event creation, group engagement, parent networking | Events, community, senior content |
| LinkedIn | MEDIUM | Corporate outreach drafts, thought leadership | B2B wellness, golf performance |
| Bluesky | LOW | Cross-post from Instagram | Brand presence |

### Content Batching System (AI-Assisted)
The AI pre-generates the entire week's content during Sunday batch:
1. Scans exercise database for under-represented exercises
2. Checks content calendar for pillar balance
3. Drafts 7 days of captions with platform-specific formatting
4. Suggests filming priorities for Wednesday batch session
5. Pre-schedules posts (integration with Buffer/Later/native APIs)

### Client Acquisition Funnels (AI-Tracked)

```
Funnel 1: Fairmont Pipeline
Photos → Parent Contact → Free Assessment → 10-Pack Close → Referral Ask
AI tracks: Photos delivered, contacts made, assessments booked, close rate

Funnel 2: Mobility Class Pipeline
Nextdoor Post → Free Class → Assessment Offer → Package Close
AI tracks: Post reach, class attendance, conversion rate, revenue per attendee

Funnel 3: Corporate Pipeline
LinkedIn Connect → Workshop Offer → Demo Session → Corporate Contract
AI tracks: Connections sent, responses, workshops delivered, contracts signed

Funnel 4: Golf Pipeline
Golf Course Networking → Mobility Demo → Assessment → 24-Pack Close
AI tracks: Contacts made, demos given, assessments, close rate

Funnel 5: Online Pipeline
Social Content → sswanstudios.com → Free Assessment → Package Purchase
AI tracks: Traffic source, page views, assessment bookings, online sales
```

---

## SECTION 12: TECHNOLOGY DECISIONS

### Voice Processing
- **Web Speech API** (free, browser-native) for real-time dictation
- **OpenAI Whisper API** for voice memo transcription (higher accuracy)
- **Fallback:** AssemblyAI or Deepgram for specialized fitness vocabulary

### Background Audio (PWA vs Native)
- **PWA (Phase 1):** MediaRecorder API + Service Worker for basic background recording
- **Limitation:** iOS Safari kills background audio after ~30 seconds
- **Native (Phase 7):** React Native with native audio modules for true background recording
- **Recommendation:** Start with PWA "tap to record segments" approach, native app later

### AI Context Window Management
- Keep conversation context focused (last 10 messages + system prompt)
- Store full conversation history in database for search
- Inject relevant context per workspace (client data, recent workouts, etc.)
- Token budget: Reserve 40% for system prompt + context, 60% for conversation

### Database Integration Points
- Read: Users, Sessions, Exercises, WorkoutSessions, DailyWorkoutForms, Orders, Messages, Notifications
- Write: DailyWorkoutForms (auto-fill), Messages (draft/send), Notifications (mark read)
- Analytics: Revenue queries, session stats, client engagement metrics
- All writes require trainer confirmation before execution

---

## SECTION 13: EXISTING SYSTEM INTEGRATION (CRITICAL)

### 13.1 Form Analysis / Virtual Training (Python MediaPipe Service)
**Existing:** `backend/services/form-analysis/` — Python-based pose estimation using MediaPipe
- Real-time exercise form analysis via webcam/video upload
- Angle calculation for joint positions
- Exercise-specific rule engine for form corrections
- Movement profile tracking per client
- FormAnalysis model + FormAnalysisRoutes

**AI Assistant Integration:**
- AI explains form analysis results in natural language: "Your squat depth is 15 degrees short of parallel. Focus on ankle mobility."
- Auto-generate corrective exercise prescriptions based on form deficiencies
- Track form improvement over time with trend analysis
- Voice coaching during virtual sessions: "Drive your knees out, you're caving in"
- Compare client form to NASM ideal movement patterns
- Flag injury risk patterns and auto-suggest modifications

### 13.2 Gamification System
**Existing:** Full gamification stack with:
- `gamificationRoutes.mjs`, `gamificationV1Routes.mjs`, `gamificationApiRoutes.mjs`
- Badges, achievements, XP points, streaks, challenges
- Point transactions, leaderboards
- Challenge participants tracking

**AI Assistant Integration:**
- AI suggests new challenges based on client capabilities and goals
- Auto-award badges when milestones detected in workout data
- Generate personalized challenge descriptions
- "You're 2 workouts away from your 30-day streak badge!"
- Social media content from gamification milestones: "Congratulations to [Client] for earning their Iron Swan badge!"
- Competitive leaderboard insights: "Your client base completed 47 sessions this month, up 23% from last month"

### 13.3 Video Library System
**Existing:** Exercise videos, video catalog, video analytics
- YouTube embed integration
- Exercise-to-video mapping
- Watch time analytics

**AI Assistant Integration:**
- "These 5 exercises are assigned most but have no demo videos — film these next Wednesday"
- Auto-generate video descriptions and tags from exercise metadata
- Suggest playlist organization based on NASM phases
- Track which clients watch which videos (engagement insights)
- Create workout playlists for clients: "Here's your Week 3 video playlist"

### 13.4 Movement Analysis (7-Step Wizard)
**Existing:** Movement analysis workspace with:
- Prospect support, auto-match from WaiverRecord
- Draft/Completed/Linked/Archived status flow
- Score-based assessment

**AI Assistant Integration:**
- Voice-dictated movement analysis during assessment
- AI suggests corrective exercise protocols based on movement scores
- Auto-generate movement analysis reports for clients
- Track movement improvement across assessments
- Cross-reference with form analysis data for comprehensive movement profile

### 13.5 Social Feed & Messaging
**Existing:** Social posts, messaging system, notifications
- `social/posts.mjs` routes
- Message conversations with participants
- Notification system with multiple types

**AI Assistant Integration:**
- Draft social posts from workout milestones
- Auto-respond to common client messages
- Generate motivational messages based on client progress
- Schedule message campaigns (re-engagement, session reminders)
- Notification priority triage with revenue impact scoring

---

## AI VILLAGE VALIDATION CHECKLIST

This blueprint should be validated against:
- [ ] NASM OPT model accuracy and completeness
- [ ] Security review of tokenized context protocol
- [ ] UX accessibility (voice-first, mobile-first)
- [ ] Performance implications of real-time dictation
- [ ] Competitive analysis vs. other trainer platforms (Trainerize, TrueCoach, PT Distinction)
- [ ] Revenue model validation against Anaheim Hills market data
- [ ] Privacy compliance (HIPAA-adjacent for health data, CCPA for California)
- [ ] Social media strategy effectiveness (platform algorithm changes)
- [ ] Technical feasibility of background recording in PWA
- [ ] Exercise science accuracy for all training domains
