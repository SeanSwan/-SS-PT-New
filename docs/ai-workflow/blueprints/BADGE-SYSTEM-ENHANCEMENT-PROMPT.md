# SwanStudios Gamification Badge System — Full Enhancement Prompt

## CONTEXT: Current System State

### Achievement Catalog (82 Total)
The gamification system has 82 achievements across 6 categories:
- **USER (19):** USR-101 Swan Hatchling, USR-102 Friendly Swan, USR-103 Connector, USR-104 Social Butterfly, USR-105 First Step, USR-106 Active Week, USR-107 Monthly Marathon, USR-108 Year of the Swan, USR-109 Positivity Beacon, USR-110 Community Mentor, USR-111 Rising Star, USR-112 Lifelong Learner, USR-113 Challenge Participant, USR-114 Feather of Unity, USR-115 Swan Advocate, USR-116 Community Builder, USR-117 Early Bird, USR-118 Night Owl, USR-119 Explorer Badge
- **CLIENT (8):** CLT-201 New Client, CLT-202 On Track, CLT-203 Goal Achiever, CLT-204 VIP Swan, CLT-205 Loyal Client, CLT-206 Referral Bonus, CLT-207 Priority Booking Access, CLT-208 Milestone 100 Classes
- **TRAINER (9):** TRN-301 Certified Trainer, TRN-302 First Class Delivered, TRN-303 Rising Coach, TRN-304 Elite Coach, TRN-305 Mentor Trainer, TRN-306 Community Builder (Trainer), TRN-307 Earnings Milestone $1000, TRN-308 Diversity Champion, TRN-309 Trainer of the Month
- **CREATOR (9):** CRT-401 First Creation, CRT-402 Creative Contributor I, CRT-403 Creative Contributor II, CRT-404 Creative Visionary, CRT-405 Popular Creator, CRT-406 Collaborator, CRT-407 Community Inspirer, CRT-408 Earnings Milestone $100, CRT-409 Patron Supported
- **MODERATOR (4):** MOD-501 Guardian of the Community, MOD-502 Peacekeeper, MOD-503 Swan Sentinel, MOD-504 Feather of Justice
- **CROSS-ROLE (7):** XRL-601 Anniversary 1 Year, XRL-602 Swan Legend, XRL-603 Free Class Pass, XRL-604 Merchandise Discount 10%, XRL-605 Avatar Custom Swan Wings, XRL-606 Heart of Gold, XRL-607 Dual Talent

### Rarity System
- **Common** (Swan Lavender #4070C0) — 1.0x XP
- **Rare** (Gilded Fern #C6A84B) — 1.5x XP
- **Epic** (Wing Purple #8B5CF6) — 2.0x XP, glow animation
- **Legendary** (Gold gradient, pulse animation) — 3.0x XP

### Rarity Tier Names
- Cygnus Initiate = Common
- Frostwing Ascendant = Rare
- Gilded Sovereign = Epic
- Amethyst Apex = Legendary
- Crystalline Swan = Diamond (aspirational)

### Current Badge Rendering (3-tier fallback)
1. iconUrl — Cloud image URL (Achievement model field, currently empty for all)
2. iconEmoji — Emoji character (default trophy)
3. Award icon — Lucide icon component

### Existing Models
- Achievement — Full model with iconEmoji, iconUrl, rarity, category, xpReward, requirements, skillTree
- Badge — Separate model for static badge images (id, name, description, imageUrl, xpReward)
- UserAchievement — Junction table with progress tracking, social sharing, verification
- Gamification — User snapshot (level, XP, streaks, tier)
- GamificationSettings — Global config (point values, tier thresholds, feature flags)

### Skill Trees (Octalysis Framework — defined but not rendered)
awakening, forge_nasm, iron_gravity, tribe_social, free_spirit, unbroken_streaks

### Existing Social System
- Friendship model — pending/accepted/declined/blocked
- UserFollow model — follow/friend/workout_buddy/training_partner/mentor/mentee with per-relationship privacy controls
- SocialPost model — visibility: public/friends/private
- UserProfilePage — Public profile at /profile/:userId showing stats, posts, badges
- Privacy compliance — GDPR/CCPA/PIPEDA framework exists

### MISSING Features (Identified)
- NO profileVisibility field on User model (all profiles are public by default)
- NO showBadges, showAchievements, showStats privacy toggles
- NO end-to-end encryption for private data
- NO visual skill trees
- NO badge assignment UI (admin cannot map 3D art to achievements)
- User profile page still uses OLD Galaxy-Swan theme colors
- Achievement showcase uses emoji fallback (no 3D art wired in)

---

## ENHANCEMENT REQUEST

### 1. 3D Badge Art Generation (Per Achievement)
Generate a unique 3D badge image for EVERY achievement in the catalog (82 total) using Nano Banana 2 (Gemini 2.5 Flash Image). Each badge should visually represent the achievement name and meaning.

Art Style Approach:
- 20 different 3D art styles available: claymation, low-poly crystal, isometric, popmart, glass, metallic coin, chibi, oil-painting-3d, gemstone, porcelain, holographic, neon-wireframe, watercolor-3d, enamel-pin, stained-glass, origami, inflatable, frozen-ice, plush-felt, steampunk
- Generate 2-3 style variants per achievement so admin can choose favorites
- Swan motifs woven into as many badges as thematically appropriate
- NO dark/gothic/evil themes — pure beautiful, cute, cool, nature, human, swan-themed
- Extra swan variations: ~50 additional swan-themed bonus badges across styles

Badge Image Requirements:
- Square 1:1 format, centered composition
- Dark navy background #002060 (Midnight Sapphire)
- Collectible badge/icon aesthetic
- Each badge should be immediately recognizable for its achievement
- Rarity should influence visual richness (Common=simple, Legendary=elaborate+effects)

### 2. Badge Wiring System
- Admin UI to assign generated 3D art to achievements (map iconUrl to achievement)
- Badge Gallery tab in admin Analytics workspace for browsing/filtering/selecting
- Batch assignment: select a style, auto-assign to all achievements in a category
- Preview system: side-by-side current emoji vs new 3D badge

### 3. Enhanced Badge Display in User Dashboard
- Upgrade AchievementShowcase component with 3D badge support
- Animated unlock sequence when earning new badges (particle effects, glow)
- Featured Badge slot on user profile (existing badgesPrimary UUID FK)
- Badge detail modal with full-size art, description, rarity info, earn date
- Progress visualization for in-progress badges
- Badge collection completion percentage per category

### 4. Public/Private Profile System
- Add profileVisibility enum to User model: public | friends_only | private
- Add granular privacy toggles: showBadges, showAchievements, showStats, showWorkoutHistory, showLevel
- Profile visibility logic: Public = anyone sees all, Friends Only = accepted friends only, Private = self only
- Friend badge comparison: See how your badges compare to a friend
- Profile privacy settings page in user settings

### 5. End-to-End Encryption (WhatsApp-style) — Analysis Needed
Should we implement E2E encryption? Consider:
- What to encrypt: Direct messages, private profile data, workout logs marked private
- What NOT to encrypt: Public profiles, achievement data, leaderboard data, public social posts
- Implementation options: Signal Protocol for DMs, per-user encryption keys, at-rest encryption for health data, client-side encryption with server-side key management
- Tradeoffs: complexity vs trust, moderation challenges, key management, performance
- AI Village recommendation needed: Full E2E vs field-level encryption vs transport-only (TLS)

### 6. Additional Enhancements to Consider
- Skill Tree Visualization: Interactive tree UI showing achievement progression paths
- Badge Trading/Gifting: Let friends send badge copies as gifts
- Seasonal/Limited Badges: Time-limited event badges with special art
- Badge Rarity Analytics: Admin dashboard showing unlock rates, popular badges
- Social Proof Notifications: Your friend just earned a badge
- QR Code Badge Sharing: Generate QR codes for badge flexing IRL

---

## TECHNICAL CONTEXT

### Theme: Crystalline Swan (Enchanted Apex)
- Midnight Sapphire #002060 (Primary)
- Royal Depth #003080 (Surface)
- Ice Wing #60C0F0 (Gaming Accent)
- Arctic Cyan #50A0F0 (Secondary)
- Gilded Fern #C6A84B (Luxury Gold)
- Frost White #E0ECF4 (Background)
- Swan Lavender #4070C0 (Tertiary)
- Wing Purple #8B5CF6 (Glow Accent — ALL interactive elements)
- RETIRED: Galaxy-Swan (#0a0a1a, #00FFFF, #7851A9) — do NOT reference

### Stack
- Frontend: React 18 + TypeScript + styled-components (NO MUI)
- Backend: Node.js + Express + Sequelize + PostgreSQL
- Image Gen: Nano Banana 2 via scripts/generate-badges.mjs
- Social: Friendship + UserFollow + SocialPost models
- Auth: JWT + RBAC (admin/trainer/client roles)

### Key Files
- Achievement Model: backend/models/Achievement.mjs
- UserAchievement: backend/models/UserAchievement.mjs
- Badge Model: backend/models/Badge.mjs
- User Model: backend/models/User.mjs
- Gamification Routes: backend/routes/gamificationRoutes.mjs
- Achievement Showcase: frontend/src/components/AdvancedGamification/components/AchievementShowcase.tsx
- Badge Gallery: frontend/src/components/Charts/BadgeGallery.tsx
- User Profile: frontend/src/pages/Social/UserProfilePage.tsx
- Friendship Model: backend/models/social/Friendship.mjs
- UserFollow Model: backend/models/UserFollow.mjs
- Privacy Service: backend/services/privacy/PrivacyCompliance.mjs
- Badge Catalog: docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json

---

## AI VILLAGE VALIDATION REQUEST

Analyze this enhancement plan across all tracks:
1. UX/Accessibility — Badge display accessibility, WCAG, screen reader support, animation controls
2. Code Quality — Model schema changes, migration safety, backward compatibility
3. Security — E2E encryption recommendation, privacy toggle enforcement, RBAC
4. Performance — 82+ badge images loading, lazy loading, CDN caching, image optimization
5. Competitive Intel — How do Peloton, Strava, Apple Fitness, Duolingo, Nike Run Club handle badges and profile privacy?
6. User Research — What privacy controls do fitness app users expect? Is E2E overkill?
7. Architecture — Schema design for privacy fields, encryption key management, badge CDN
8. Frontend/UI — Badge gallery UX, unlock animations, profile privacy settings UI, responsive badge grid

Return: Enhanced plan with prioritized implementation phases, specific technical recommendations, and consensus on the E2E encryption question.
