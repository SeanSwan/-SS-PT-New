# SwanStudios Social + RPG Community Platform Upgrade Plan

> **Author:** Claude Opus 4.6 (CEO) + Sean Swan (Owner)
> **Date:** 2026-03-31
> **Status:** PENDING AI VILLAGE REVIEW
> **Scope:** Transform the social media layer from "dead page" to a sticky, engaging fitness community platform

---

## 1. EXECUTIVE VISION

SwanStudios is NOT just a personal training app. It is a **benevolent fitness social community platform** that combines:

- **Meetup-style** group workout events, community meetups, training partner matching
- **Nextdoor-style** local/city-based communities, area events, location-based discovery
- **Social media** profiles with workouts, goals, before/after photos, art, music, dance, gaming, comedy
- **RPG life simulator** where your real body is the main character — factions, parties, companion pets, loot drops, streak fortresses
- **Clean living philosophy** — organic food advocacy, urban farming/gardening, supporting local farmers, clean water, health-conscious lifestyle

### Target Audience
ALL ages, ALL backgrounds — not just gym enthusiasts. Personal trainers, community wellness advocates, content creators, clean eating advocates, urban farmers, anyone pursuing a healthier life.

### Revenue Model
| Tier | Price | Features |
|------|-------|----------|
| Free Community | $0 (donation optional) | Social feed, community, basic challenges, public profiles |
| AI Fitness | $9.99/mo | Coach Assistant, workout generation, macro logging, AI features |
| Premium | $24.95/mo | Advanced analytics, content studio, priority AI, all RPG features, creator tools |

### Growth Strategy
- YouTube marketing funnel → drive traffic → free community sign-up → paid conversion
- Attract personal trainers as platform users who bring their own clients
- Word-of-mouth through positive community energy and unique RPG mechanics

---

## 2. CURRENT STATE ANALYSIS

### What's Built & Working
| Feature | Status | Quality |
|---------|--------|---------|
| Social Feed (12 post types) | FULLY BUILT | Good — needs engagement polish |
| Post Creation (text, workout, achievement, transformation, creative) | FULLY BUILT | Good |
| Reactions (thumbs_up, heart, swan) | FULLY BUILT | Functional |
| Comments | FULLY BUILT | Basic — no threading |
| Friends System (request, accept, block) | FULLY BUILT | Functional |
| Challenges (10+ types, XP rewards) | FULLY BUILT | Good |
| Explore Page (trending, discover people) | FULLY BUILT | Decent |
| Hashtags (auto-classification, trending) | FULLY BUILT | Good |
| Reels (TikTok-style vertical video) | FULLY BUILT | Polished |
| User Profiles (badges, stats, privacy) | FULLY BUILT | Decent |
| Content Moderation (reports, auto-mod, admin panel) | FULLY BUILT | Enterprise-grade |
| Gamification Points Integration | FULLY BUILT | Good |
| Messaging (DMs via Socket.IO) | PARTIALLY BUILT | Basic structure |
| UserFollow (6 relationship types, granular privacy) | MODEL ONLY | Rich schema, no routes |

### What's Built But Not Connected to Social
| Feature | Status | Gap |
|---------|--------|-----|
| Aegis HUD (5 needs bars + moodlets) | Built | Not visible on social profiles |
| Companion Pets (5 species, evolution) | Built | Not visible on social feed |
| Streak Fortress (6 visual tiers) | Built | Not on profiles/feed |
| Job Classes (5 FFXIV-style) | Built | Not shown in social context |
| Ghost Mode (personal PR comparison) | Built | No social sharing of "ghost beats" |
| Vault Decryption (loot drops) | Built | No social celebration/sharing |
| Victory Charts (50 built) | Built | Not connected to profiles |

### What's Model-Only (Schema Ready, No Routes/UI)
| Feature | Backend Model | What's Missing |
|---------|--------------|----------------|
| Communities | Community.mjs, CommunityMembership.mjs | Routes + UI |
| Events/Meetups | EventManagement.mjs (Event, Attendance, Discussion, Photo) | Routes + UI |
| Live Streaming | LiveStreaming.mjs (Stream, Viewer, Chat, Poll) | Routes + streaming infra |
| Creator Economy | CreatorEconomy.mjs (Profile, Partnership, Subscription) | Routes + payment |
| Social Commerce | SocialCommerce.mjs (Product, Review, Cart, Wishlist) | Routes + payment |
| AI Recommendations | AIRecommendations.mjs (Preferences, Interactions, Similarity) | Routes + engine |
| Social Analytics | SocialAnalytics.mjs (Dashboard, Insight, Benchmark) | Routes + UI |
| Enhanced Notifications | EnhancedNotification.mjs, NotificationPreference.mjs | Routes + push |

### What's Not Built At All
| Feature | Priority | Why It Matters |
|---------|----------|----------------|
| Location/city-based communities | HIGH | Core Nextdoor-style differentiator |
| Group workout events/RSVPs | HIGH | Core Meetup-style differentiator |
| Faction Warfare (Vanguard, Syndicate, Sentinels) | HIGH | RPG social engagement driver |
| Party/Linkshell system (shared HP) | HIGH | Group accountability mechanic |
| Comment threading/replies | MEDIUM | Conversation depth |
| Post editing | MEDIUM | User expectation |
| Activity feed ("Jackie just finished Leg Day") | HIGH | Social proof, FOMO driver |
| Weekly recap cards (Instagram Stories format) | MEDIUM | Re-engagement hook |
| Local farmer/market directory | LOW | Clean living vision (future) |
| Post sharing/reposting | MEDIUM | Content amplification |

---

## 3. THE UPGRADE — PHASED PLAN

### Phase 1: Make the Feed Alive (Week 1-2)
**Goal:** Transform the social feed from "dead page" to a living, breathing activity stream.

#### 1A. Live Activity Ticker
- Real-time banner: "Marcus just completed Leg Day (+50 XP)" / "Sarah hit a new PR: Bench 135x8!"
- Socket.IO broadcast on workout completion, achievement unlock, level up, streak milestone
- Shows on feed header — creates FOMO and social proof
- Clickable → view the post or user profile

#### 1B. Post-Workout Celebration Card (Auto-Post)
- When a user completes a workout, auto-generate a rich social post:
  - Exercise summary, total volume, duration, XP earned
  - Companion pet reaction (happy sprite animation)
  - Ghost Mode result ("Beat your ghost by 2 reps!")
  - Streak fortress status
  - Loot drop result (if any)
- User can edit/customize before posting, or skip
- Template: workout achievement card with Crystalline Swan styling

#### 1C. Comment Threading
- Replies to comments (1 level deep — not infinite nesting)
- @mentions in comments → notification
- Reaction support on comments (thumbs_up, heart)

#### 1D. Post Editing & Pinning
- Edit own posts (within 24 hours, show "edited" badge)
- Pin 1 post to top of own profile
- Admin can pin announcements to community feed

### Phase 2: RPG Social Integration (Week 2-3)
**Goal:** Make RPG features visible and social — the unique differentiator.

#### 2A. Social Profile RPG Showcase
- Profile header shows: Job Class title + icon, Faction badge, Level + Tier
- Companion Pet widget on profile (animated, friends can "pet" it → +1 Social need)
- Streak Fortress mini-visualization on profile
- Moodlet badge visible (Elated/Focused/Tired etc.)
- Top 3 achievements with rarity glow

#### 2B. Faction Warfare (Social Layer)
- 3 factions: Vanguard (strength), Syndicate (agility), Sentinels (endurance)
- Choose faction during onboarding or from profile settings
- Faction leaderboard (total XP contributed by all members)
- Faction chat channel (filtered social feed for your faction)
- Weekly faction challenges: "Vanguard vs Syndicate: Most total bench volume this week"
- Faction-specific cosmetics (profile border color, badge style)
- Faction recruitment posts on social feed

#### 2C. Party/Linkshell System
- Create a party (3-5 people) with shared weekly HP bar
- Everyone works out → HP stays full → party XP multiplier (1.25x)
- Someone misses → party takes "damage" (visible to all members)
- Party chat (lightweight group DM)
- Party challenges: "Our party's combined squat volume this week"
- Party visible on each member's profile
- Accountability without toxicity — "Your party needs you!" notification

#### 2D. Social Loot & Ghost Celebrations
- When you get an Epic/Legendary loot drop → auto-post to feed (opt-in)
- When you beat your Ghost → shareable "Ghost Defeated!" card
- When Companion Pet evolves → celebration post with before/after pet sprites
- When you level up → animated level-up card on feed

### Phase 3: Community & Local Discovery (Week 3-4)
**Goal:** Meetup + Nextdoor functionality — local connections.

#### 3A. Community Groups (Activate Existing Models)
- Create/join communities by interest: "LA Runners", "Vegan Bodybuilders", "Senior Fitness", "Urban Farmers"
- Community feed (filtered posts), member list, community challenges
- Community roles: owner, moderator, member
- Community categories: fitness, nutrition, outdoor, creative, farming, wellness
- Discovery page: browse communities by category, location, popularity
- Community-specific challenges and leaderboards

#### 3B. Group Workout Events (Activate EventManagement Models)
- Create events: "Saturday Morning Park Run — Griffith Park, 7am"
- Event details: location (map embed), date/time, max participants, difficulty level
- RSVP system: going, interested, can't make it
- Event discussion thread (comments on event)
- Event photos (upload after event)
- Recurring events (weekly run club, monthly group challenge)
- Event reminders (push notification 24h + 1h before)
- Post-event auto-summary: "12 people ran 5K together! Total distance: 60km"

#### 3C. Location-Based Discovery
- Users set their city/area in profile settings
- "Near You" tab in Explore: shows events, communities, and users in your area
- Privacy: exact location never shared — city/zip level only
- Area leaderboards: "Top 10 in Los Angeles this week"
- Local farmer's market directory (Phase 5 — future, manual curation initially)

### Phase 4: Engagement & Retention Loops (Week 4-5)
**Goal:** Keep people coming back daily.

#### 4A. Daily Check-In & Activity Summary
- Daily login → update Aegis HUD needs → earn 10 XP
- Morning notification: "Your party is at 85% HP. Log a workout to keep it green!"
- Evening recap: "Today: 1 workout, 3 macros logged, 2 comments. Your Companion Pet is happy!"
- Weekly recap card (Instagram Stories format) — shareable to social feed

#### 4B. Suggested Actions Feed
- AI-driven suggestions based on activity gaps:
  - "You haven't posted in 3 days — share your latest workout?"
  - "Sarah in your party hasn't logged in 2 days — send encouragement?"
  - "New challenge starting tomorrow: 30-Day Cardio — join?"
  - "3 events near you this weekend — check them out"
- Inline action buttons (post, encourage, join, view)

#### 4C. Achievement Sharing & Social Proof
- Milestone auto-posts: "100 workouts completed!", "Level 25 reached!", "30-day streak!"
- Before/after transformation sharing with timeline slider
- Chart sharing: select a Victory chart → generate shareable image → post to feed
- Badge showcase: arrange top badges on profile (drag-and-drop reorder)

#### 4D. Content Diversity Beyond Fitness
- Encourage creative posts: art, music, dance, comedy, gaming, cooking, gardening
- Category filters on feed: Fitness | Creative | Community | Clean Living | All
- Highlight "best of" creative posts weekly (admin-curated or AI-recommended)
- Clean Living category: gardening tips, farmer's market finds, meal prep, water quality info

### Phase 5: Creator & Trainer Platform (Week 5-6)
**Goal:** Attract trainers and content creators as platform users.

#### 5A. Trainer Profiles (Public-Facing)
- Trainer showcase page: certifications, specialties, client transformations
- "Train with me" CTA → booking flow or contact
- Trainer leaderboard: most active, highest client success rate
- Trainer content feed: workout tips, form videos, nutrition advice
- Clients can leave reviews (moderated)

#### 5B. Content Creator Tools
- Post scheduling (write now, publish later)
- Post analytics: views, likes, comments, reach
- Series/collection: group related posts ("My 12-Week Transformation", "Cooking Clean Monday")
- Embed support: YouTube videos, Spotify playlists in posts

#### 5C. Referral & Growth System
- Invite friends → earn 200 XP + referral badge
- Trainer referral: bring clients → earn platform credits
- "Share to external" button: generate link for Twitter/Instagram/WhatsApp
- Referral leaderboard
- Milestone rewards: 5 referrals = Rare badge, 25 = Epic badge, 100 = Legendary

---

## 4. TECHNICAL ARCHITECTURE

### New Backend Routes Needed
```
POST   /api/social/events           — Create group event
GET    /api/social/events           — List events (with location filter)
GET    /api/social/events/:id       — Event details
POST   /api/social/events/:id/rsvp  — RSVP to event
DELETE /api/social/events/:id/rsvp  — Cancel RSVP

POST   /api/social/communities           — Create community
GET    /api/social/communities           — List/discover communities
POST   /api/social/communities/:id/join  — Join community
DELETE /api/social/communities/:id/leave — Leave community

POST   /api/social/parties           — Create party/linkshell
GET    /api/social/parties/:id       — Party details + HP bar
POST   /api/social/parties/:id/join  — Join party
DELETE /api/social/parties/:id/leave — Leave party

POST   /api/social/factions/:name/join  — Join faction
GET    /api/social/factions/leaderboard — Faction standings

GET    /api/social/activity/live     — SSE stream of live activity
GET    /api/social/nearby            — Location-based discovery

PUT    /api/social/posts/:id         — Edit post
POST   /api/social/posts/:id/pin     — Pin post to profile
POST   /api/social/comments/:id/reply — Reply to comment
```

### New Frontend Components
```
frontend/src/components/Social/
├── Activity/
│   ├── LiveActivityTicker.tsx       — Real-time activity banner
│   └── PostWorkoutCelebration.tsx   — Auto-generated workout card
├── Events/
│   ├── EventsView.tsx               — Browse/create events
│   ├── EventCard.tsx                — Event preview card
│   ├── EventDetail.tsx              — Full event page with RSVP
│   └── CreateEventModal.tsx         — Event creation form
├── Communities/
│   ├── CommunitiesView.tsx          — Browse/join communities
│   ├── CommunityCard.tsx            — Community preview
│   ├── CommunityDetail.tsx          — Community feed + members
│   └── CreateCommunityModal.tsx     — Community creation
├── Party/
│   ├── PartyWidget.tsx              — Party HP bar + members
│   ├── PartyChat.tsx                — Lightweight group chat
│   └── CreatePartyModal.tsx         — Party creation
├── Factions/
│   ├── FactionBadge.tsx             — Faction icon + colors
│   ├── FactionLeaderboard.tsx       — Cross-faction standings
│   └── FactionSelector.tsx          — Choose/switch faction
├── Profile/
│   ├── RPGProfileHeader.tsx         — Job class, faction, level, pet
│   ├── StreakFortressMini.tsx        — Compact fortress for profile
│   ├── BadgeShowcase.tsx            — Drag-and-drop badge arrange
│   └── ChartShareCard.tsx           — Generate shareable chart image
├── Discovery/
│   ├── NearYouTab.tsx               — Location-based events/communities
│   └── SuggestedActions.tsx         — AI-driven engagement prompts
└── Engagement/
    ├── DailyCheckIn.tsx             — Daily login + needs update
    ├── WeeklyRecap.tsx              — Instagram Stories-style recap
    └── MilestonePost.tsx            — Auto-celebration for achievements
```

### Existing Models to Activate (Routes Needed)
- `EventManagement.mjs` → event routes + controller
- `Community.mjs` + `CommunityMembership.mjs` → community routes + controller
- `UserFollow.mjs` → follow/unfollow routes (rich schema already exists)
- `EnhancedNotification.mjs` → notification routes for event reminders, party alerts

### New Models Needed
- `UserFaction.mjs` — faction membership, subrole, season progress
- `Party.mjs` + `PartyMember.mjs` — linkshell group with shared HP
- `UserLocation.mjs` — city/zip for location-based discovery (no exact coords)

### Socket.IO Events (Real-Time)
```
'social:activity'      — Live activity ticker events
'party:hp_update'      — Party HP changes
'party:message'        — Party chat messages
'faction:score_update' — Faction leaderboard changes
'event:rsvp_update'    — Event attendance changes
```

---

## 5. CONTENT & COMMUNITY PHILOSOPHY

### The Benevolent Community Standard
This is NOT Instagram/TikTok where engagement = outrage. SwanStudios community values:

1. **Supportive, never competitive** — Celebrate others' progress, don't tear down
2. **All bodies, all levels** — Beginner posting their first push-up gets as much love as a powerlifter
3. **Clean living advocacy** — Organic food, local farming, gardening, clean water
4. **Creative expression welcome** — Art, music, dance, comedy alongside fitness
5. **Education over selling** — Teach people new skills, don't hard-sell services
6. **Privacy-first** — Granular controls over what's shared, location is city-level only
7. **No dark patterns** — No manipulation, no guilt-tripping, no pay-to-win

### Moderation Approach
- Auto-mod scoring (already built) catches spam and abuse
- Community moderators for each community group
- Report system (already built) with admin review queue
- Positive reinforcement > punishment — encourage good behavior with XP bonuses

---

## 6. COMPETITIVE DIFFERENTIATION

### What Competitors Do
| Platform | Focus | Weakness |
|----------|-------|----------|
| Trainerize | Trainer-client management | No social, no community |
| Strong/JEFIT | Workout logging | No social feed, no RPG elements |
| Strava | Activity tracking + social | Fitness-only, no community features |
| Fitocracy | Fitness + RPG (defunct) | Shut down — we inherit their audience |
| Habitica | RPG habit tracking | No fitness specificity, no social events |
| Meetup | Group events | No fitness tracking, no gamification |
| Nextdoor | Local community | No fitness, no gamification |

### Our Unique Position
**SwanStudios = Strava's social feed + Meetup's events + Nextdoor's locality + Fitocracy's RPG + Habitica's habits + Instagram's creativity — unified under a clean living philosophy.**

No one else combines ALL of these. The RPG layer (factions, parties, pets, loot) is the hook. The community (events, local, clean living) is the glue. The AI training tools are the value.

---

## 7. SUCCESS METRICS

| Metric | Current | Target (3 months) | Target (6 months) |
|--------|---------|--------------------|--------------------|
| Daily Active Users | ~2 | 50+ | 200+ |
| Posts per week | ~0 | 50+ | 200+ |
| Avg session duration | Unknown | 8+ minutes | 12+ minutes |
| Day-7 retention | Unknown | 40%+ | 55%+ |
| Day-30 retention | Unknown | 20%+ | 35%+ |
| Events created/month | 0 | 5+ | 20+ |
| Communities | 0 | 10+ | 30+ |
| Paid conversions | 0 | 5%+ of free users | 10%+ |
| Trainer sign-ups | 1 (Sean) | 3+ | 10+ |

---

## 8. QUESTIONS FOR THE 14-BRAIN AI VILLAGE

1. **UX Research:** What do Strava, Peloton, and Nike Run Club do for social engagement that we should adopt or avoid?
2. **Competitive Intel:** Is there a fitness social platform that successfully combined Meetup-style events with RPG gamification? What can we learn?
3. **Architecture:** Should party/faction state be managed via Redis for real-time, or is PostgreSQL + polling sufficient at our scale?
4. **Security:** What are the risks of location-based features? How do we protect user privacy while enabling "near you" discovery?
5. **Performance:** With Socket.IO broadcasting live activity to potentially hundreds of connected clients, what's the scalability plan?
6. **User Research:** For the "all ages, all backgrounds" target, what onboarding flow prevents overwhelming new users with RPG complexity?
7. **Mobile/Edge:** How should events with map embeds work on mobile? Embed Google Maps or use a lightweight alternative?
8. **Data Safety:** Faction/party state needs to be consistent — what happens if a party member deletes their account mid-season?
9. **API Design:** Should events, communities, and parties use a unified "group" abstraction or separate models?
10. **Strategic Research:** What fitness/wellness community platforms have scaled successfully? What were their growth levers?
11. **Frontend Patterns:** For the live activity ticker, should we use SSE, WebSocket, or polling? What's the battery impact on mobile?
12. **Gap Analysis:** What are we missing? What would make someone choose SwanStudios over just using Instagram + a workout app?
13. **Clean Living Integration:** How do other platforms (like Farmigo, LocalHarvest, community garden apps) handle local food/farming features? What's the minimum viable version for us?
