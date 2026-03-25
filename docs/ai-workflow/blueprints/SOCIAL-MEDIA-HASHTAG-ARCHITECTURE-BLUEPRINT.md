# SwanStudios Social Media Architecture Blueprint — Hashtag Discovery System

> **Status:** PLANNING (Pre-AI Village Validation)
> **Author:** Claude Opus 4.6 (CEO) | **Date:** 2026-03-24
> **Scope:** Replace rigid category tabs with hashtag-driven content discovery
> **Priority:** HIGH — Core social media UX refactor

---

## 1. VISION: Beyond the Gym

SwanStudios isn't just a fitness platform — it's a **creative social ecosystem**. Think TikTok's discovery + Instagram's profiles + Strava's fitness tracking + Meetup's community events — unified under one premium brand where fitness meets art, music, dance, gaming, comedy, and real human connection.

### The Problem with Category Tabs
The current architecture defines 12 post types as rigid ENUM values:
```
general, workout, achievement, challenge, milestone, creative, dance, music, singing, art, gaming, comedy
```

**Why this fails at scale:**
| Problem | Impact |
|---------|--------|
| Empty categories look dead | With 12 tabs and ~20 users, most tabs show 0 posts — signals a dead platform |
| Single-category lock | A user dancing while working out can only pick ONE type — loses cross-pollination |
| Rigid/hardcoded | Adding "cooking" or "fashion" requires migration + code changes + redeploy |
| Navigation fatigue | 12 tabs overwhelms — users default to "general" and ignore the rest |
| No discoverability | Can't trend, can't follow interests, can't surface emerging topics |

### The Hashtag Solution
Replace category tabs with a **hashtag-driven discovery system** modeled after TikTok/Instagram:

| Feature | How It Works |
|---------|-------------|
| **#hashtags in posts** | Users add `#dance #fitness #music` to any post — multi-category naturally |
| **3 broad feed filters** | All, Fitness, Creative, Community — simple top-level navigation |
| **Trending hashtags** | Algorithm surfaces popular tags (last 24h/7d) — creates FOMO engagement |
| **Follow hashtags** | Users follow `#legday` or `#beatmaking` — personalized discovery feed |
| **Auto-suggest** | AI suggests hashtags based on post content + media type |
| **Hashtag pages** | Click `#dance` → dedicated page showing all posts with that tag |

---

## 2. ARCHITECTURE: Data Model

### 2a. New Backend Model: Hashtag

```
TABLE: Hashtags
├── id (PK, INTEGER, auto-increment)
├── name (STRING, unique, lowercase, indexed)
│   └── normalized: strip #, lowercase, alphanumeric + underscores only
├── slug (STRING, unique, URL-safe version of name)
├── category (ENUM: 'fitness', 'creative', 'community', 'general')
│   └── auto-classified by keyword matching or admin override
├── usageCount (INTEGER, default 0)
│   └── incremented on post create, decremented on post delete
├── weeklyCount (INTEGER, default 0)
│   └── reset weekly by cron/scheduled task
├── isOfficial (BOOLEAN, default false)
│   └── admin-curated hashtags get special styling
├── isBanned (BOOLEAN, default false)
│   └── admin can ban inappropriate hashtags
├── createdAt (DATE)
├── updatedAt (DATE)
```

### 2b. Join Table: PostHashtags

```
TABLE: PostHashtags
├── id (PK, INTEGER, auto-increment)
├── postId (FK → SocialPosts.id, ON DELETE CASCADE)
├── hashtagId (FK → Hashtags.id, ON DELETE CASCADE)
├── createdAt (DATE)
└── UNIQUE CONSTRAINT: (postId, hashtagId)
```

### 2c. User Hashtag Follows

```
TABLE: UserHashtagFollows
├── id (PK, INTEGER, auto-increment)
├── userId (FK → Users.id, ON DELETE CASCADE)
├── hashtagId (FK → Hashtags.id, ON DELETE CASCADE)
├── createdAt (DATE)
└── UNIQUE CONSTRAINT: (userId, hashtagId)
```

### 2d. SocialPost Model Changes
- **KEEP** the `type` ENUM for internal classification (workout, achievement, challenge, milestone, general)
  - These are *system* types that drive special rendering (workout stats card, achievement badge, etc.)
- **REMOVE** creative sub-types from ENUM: `dance, music, singing, art, gaming, comedy, creative`
  - These become hashtags instead: `#dance`, `#music`, `#singing`, `#art`, `#gaming`, `#comedy`
- **ADD** `hashtags` virtual field (populated from PostHashtags join)

**New ENUM:** `('general', 'workout', 'achievement', 'challenge', 'milestone')`

The creative content types move from rigid ENUMs to flexible hashtags — posts that were `type: 'dance'` become `type: 'general'` with `#dance` hashtag.

---

## 3. ARCHITECTURE: API Routes

### Hashtag Routes (`/api/social/hashtags`)

```
GET  /trending              — Top 20 trending hashtags (by weeklyCount)
     Query: ?period=24h|7d|30d&category=fitness|creative|community
     Returns: [{ id, name, slug, category, usageCount, weeklyCount, isOfficial }]

GET  /search                — Search hashtags by prefix
     Query: ?q=dan&limit=10
     Returns: [{ id, name, slug, usageCount }]
     Use case: Autocomplete while typing #

GET  /:slug                 — Hashtag detail page
     Returns: { hashtag, posts: [...], followerCount }
     Supports pagination: ?page=1&limit=20

GET  /:slug/posts           — Posts with this hashtag (paginated)
     Query: ?page=1&limit=20&sort=recent|popular
     Returns: { posts: [...], total, hasMore }

POST /follow/:hashtagId     — Follow a hashtag
DELETE /unfollow/:hashtagId  — Unfollow a hashtag

GET  /following              — User's followed hashtags
     Returns: [{ id, name, slug, usageCount }]

GET  /suggestions            — Suggested hashtags for user (based on post history)
     Returns: [{ id, name, slug, reason }]
```

### Modified Post Routes
- **POST /api/social/posts** — Extract hashtags from content, create/link Hashtag records
- **GET /api/social/feed** — Add `?hashtag=slug` filter, `?category=fitness|creative|community` filter

### Admin Routes (`/api/admin/hashtags`)
```
PUT  /:hashtagId/ban         — Ban a hashtag
PUT  /:hashtagId/unban       — Unban a hashtag
PUT  /:hashtagId/official    — Mark as official/curated
PUT  /:hashtagId/category    — Override auto-category
GET  /moderation             — Flagged/suspicious hashtags
```

---

## 4. ARCHITECTURE: Frontend Components

### 4a. Feed Filter Bar (replaces category tabs)

```
WIREFRAME:
┌────────────────────────────────────────────────────────────────┐
│ [🔥 All] [💪 Fitness] [🎨 Creative] [👥 Community]  [🔍 Search] │
├────────────────────────────────────────────────────────────────┤
│ Trending: #legday  #transformation  #beatmaking  #dance  ...  │
│           (scrollable horizontal chip row)                      │
└────────────────────────────────────────────────────────────────┘
```

- **3 broad filters** + All = 4 total (not 12 tabs)
- **Trending row** below filters — horizontal scroll, tap to filter by hashtag
- Each chip shows usage count badge
- Official hashtags get a checkmark icon

### 4b. Hashtag Input (in post creation)

```
WIREFRAME:
┌────────────────────────────────────────────────────────────────┐
│ What's on your mind?                                           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Just crushed leg day! New PR on squats 🦵 #legday       │   │
│ │ #squats #personalrecord                                  │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ Suggested: #fitness #strength #legs #workout      [+ Add]      │
│                                                                │
│ [📷 Media] [👁 Friends ▼] [✨ +15 XP]            [Post →]     │
└────────────────────────────────────────────────────────────────┘
```

- Hashtags are typed inline (natural, like Twitter/Instagram)
- AI auto-suggests hashtags based on content keywords
- Suggested hashtags appear as clickable chips below the input
- Tapping a suggestion appends it to the post content

### 4c. Hashtag Page

```
WIREFRAME:
┌────────────────────────────────────────────────────────────────┐
│ #dance                                          [Follow] 1.2k  │
│ Category: Creative  |  847 posts  |  234 followers             │
├────────────────────────────────────────────────────────────────┤
│ [Recent ▼] [Popular] [This Week]                               │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│ │ Post 1  │ │ Post 2  │ │ Post 3  │  ← masonry/grid view      │
│ │ media   │ │ media   │ │ media   │                           │
│ │ caption │ │ caption │ │ caption │                           │
│ └─────────┘ └─────────┘ └─────────┘                           │
│ Related: #hiphop #choreography #movement #freestyle            │
└────────────────────────────────────────────────────────────────┘
```

### 4d. Component Tree

```
graph TD
  A[SocialFeed] --> B[FeedFilterBar]
  A --> C[TrendingHashtags]
  A --> D[PostList]
  A --> E[CreatePostCard]

  B --> B1[CategoryFilter: All|Fitness|Creative|Community]
  B --> B2[SearchInput]

  C --> C1[HashtagChip x N — horizontal scroll]

  D --> D1[PostCard x N]
  D1 --> D1a[PostHashtags — clickable chips in post]

  E --> E1[HashtagAutocomplete — inline # detection]
  E --> E2[SuggestedHashtags — AI-suggested chips]

  F[HashtagPage] --> F1[HashtagHeader — name, stats, follow btn]
  F[HashtagPage] --> F2[HashtagPostGrid — masonry layout]
  F[HashtagPage] --> F3[RelatedHashtags — linked tags]
```

---

## 5. CONTENT CATEGORIES (Hashtag-Powered)

Instead of rigid tabs, content naturally flows through these **broad categories** with hashtag granularity:

### Fitness (auto-categorized by hashtag keywords)
| Hashtag Examples | Content |
|-----------------|---------|
| `#legday` `#chestday` `#backday` | Workout split posts |
| `#transformation` `#beforeafter` | Progress photos |
| `#personalrecord` `#pr` `#newpr` | PR celebrations |
| `#fitnesschallenge` `#30daychallenge` | Challenge participation |
| `#mealprep` `#nutrition` `#macros` | Nutrition content |
| `#stretching` `#flexibility` `#mobility` | Recovery/flexibility |
| `#bootcamp` `#hiit` `#cardio` | Workout types |

### Creative (auto-categorized by hashtag keywords)
| Hashtag Examples | Content |
|-----------------|---------|
| `#dance` `#choreography` `#freestyle` `#hiphop` | Dance & movement |
| `#music` `#beats` `#production` `#producer` | Music production |
| `#singing` `#vocals` `#cover` `#original` | Singing & vocals |
| `#art` `#digitalart` `#photography` `#drawing` | Art & expression |
| `#gaming` `#esports` `#streaming` `#setup` | Gaming content |
| `#comedy` `#standup` `#skits` `#memes` | Comedy content |

### Community (auto-categorized by hashtag keywords)
| Hashtag Examples | Content |
|-----------------|---------|
| `#meetup` `#localevent` `#groupworkout` | Real-world events |
| `#swanstudios` `#swanfam` `#community` | Platform community |
| `#accountability` `#goals` `#motivation` | Motivational content |
| `#newmember` `#introduction` `#welcome` | New user intros |

### Auto-Classification Algorithm
```javascript
const CATEGORY_KEYWORDS = {
  fitness: ['workout', 'fitness', 'gym', 'lift', 'squat', 'deadlift', 'bench',
            'cardio', 'hiit', 'pr', 'personalrecord', 'transformation', 'gains',
            'legday', 'chestday', 'backday', 'armday', 'shoulderday', 'nutrition',
            'mealprep', 'macros', 'stretching', 'flexibility', 'mobility',
            'bootcamp', 'crossfit', 'strength', 'endurance', 'bodyweight'],
  creative: ['dance', 'choreography', 'music', 'beats', 'singing', 'vocals',
             'art', 'drawing', 'photography', 'gaming', 'streaming', 'comedy',
             'standup', 'skits', 'producer', 'hiphop', 'freestyle', 'cover',
             'original', 'digitalart', 'painting', 'sculpture', 'film'],
  community: ['meetup', 'event', 'community', 'welcome', 'introduction',
              'accountability', 'goals', 'motivation', 'challenge', 'groupworkout',
              'swanfam', 'swanstudios', 'newmember']
};

function classifyHashtag(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'general';
}
```

---

## 6. HASHTAG EXTRACTION & PROCESSING

### Post Creation Flow
```
User types: "Just crushed leg day! New PR on squats 🦵 #legday #squats #personalrecord"

1. EXTRACT: Regex finds ['legday', 'squats', 'personalrecord']
2. NORMALIZE: lowercase, strip special chars, max 30 chars each
3. UPSERT: For each tag → Hashtag.findOrCreate({ name })
4. LINK: Create PostHashtag join records
5. CLASSIFY: Auto-set category on new hashtags
6. COUNT: Increment usageCount and weeklyCount
7. SUGGEST: Return "Related hashtags" for the user to add
```

### Extraction Regex
```javascript
// Matches #hashtag in post content (alphanumeric + underscores, 2-30 chars)
const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,30})/g;

function extractHashtags(content) {
  const matches = content.match(HASHTAG_REGEX) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}
```

### Rendering in Posts
Hashtags in post content become clickable links:
```jsx
function renderContentWithHashtags(content) {
  return content.replace(HASHTAG_REGEX, (match, tag) =>
    `<HashtagLink to="/social/hashtag/${tag.toLowerCase()}">${match}</HashtagLink>`
  );
}
```

---

## 7. TRENDING ALGORITHM

```javascript
// Trending score = weighted combination of recency and volume
function calculateTrendingScore(hashtag) {
  const { weeklyCount, usageCount } = hashtag;
  const recencyWeight = 0.7;  // Recent usage matters more
  const volumeWeight = 0.3;   // Total volume for stability

  return (weeklyCount * recencyWeight) + (Math.log10(usageCount + 1) * volumeWeight * 10);
}

// Weekly reset: Cron job resets weeklyCount every Monday 00:00
// This ensures trending reflects CURRENT activity, not historical
```

---

## 8. SEED HASHTAGS (Official/Curated)

These hashtags are pre-created with `isOfficial: true` for immediate platform identity:

```javascript
const SEED_HASHTAGS = [
  // Fitness
  { name: 'fitness', category: 'fitness', isOfficial: true },
  { name: 'legday', category: 'fitness', isOfficial: true },
  { name: 'chestday', category: 'fitness', isOfficial: true },
  { name: 'backday', category: 'fitness', isOfficial: true },
  { name: 'armday', category: 'fitness', isOfficial: true },
  { name: 'personalrecord', category: 'fitness', isOfficial: true },
  { name: 'transformation', category: 'fitness', isOfficial: true },
  { name: 'nutrition', category: 'fitness', isOfficial: true },
  { name: 'stretching', category: 'fitness', isOfficial: true },
  { name: 'bootcamp', category: 'fitness', isOfficial: true },
  { name: 'hiit', category: 'fitness', isOfficial: true },
  { name: 'cardio', category: 'fitness', isOfficial: true },
  { name: 'strength', category: 'fitness', isOfficial: true },
  { name: 'mobility', category: 'fitness', isOfficial: true },

  // Creative
  { name: 'dance', category: 'creative', isOfficial: true },
  { name: 'music', category: 'creative', isOfficial: true },
  { name: 'singing', category: 'creative', isOfficial: true },
  { name: 'art', category: 'creative', isOfficial: true },
  { name: 'gaming', category: 'creative', isOfficial: true },
  { name: 'comedy', category: 'creative', isOfficial: true },
  { name: 'photography', category: 'creative', isOfficial: true },
  { name: 'hiphop', category: 'creative', isOfficial: true },
  { name: 'freestyle', category: 'creative', isOfficial: true },
  { name: 'beats', category: 'creative', isOfficial: true },

  // Community
  { name: 'swanstudios', category: 'community', isOfficial: true },
  { name: 'swanfam', category: 'community', isOfficial: true },
  { name: 'meetup', category: 'community', isOfficial: true },
  { name: 'motivation', category: 'community', isOfficial: true },
  { name: 'accountability', category: 'community', isOfficial: true },
  { name: 'goals', category: 'community', isOfficial: true },
  { name: 'challenge', category: 'community', isOfficial: true },
  { name: 'newmember', category: 'community', isOfficial: true },
];
```

---

## 9. GAMIFICATION INTEGRATION

| Action | XP | Notes |
|--------|-----|-------|
| Create post with 1+ hashtags | 15 | Base post XP (existing) |
| Use a new hashtag for first time | +5 bonus | Encourages exploration |
| Post in 3+ categories in a week | +25 bonus | "Renaissance Creator" achievement |
| Hashtag you created reaches 100 uses | +50 | "Trendsetter" achievement badge |
| Follow 5 hashtags | +10 | "Explorer" achievement |

### New Achievements (Badge System)
| Achievement | Criteria | Rarity | Badge Art |
|-------------|----------|--------|-----------|
| Trendsetter | Create a hashtag that reaches 100 uses | Epic | Crystal hashtag with purple glow |
| Renaissance Swan | Post in all 3 categories in one week | Rare | Multi-color swan wings |
| Community Voice | 50 posts with community hashtags | Rare | Megaphone with ice glow |
| Creative Spirit | 25 posts with creative hashtags | Common | Palette with wing purple accent |
| Fitness Scholar | 100 posts with fitness hashtags | Rare | Dumbbell with gold accent |

---

## 10. MIGRATION STRATEGY

### Phase 1: Add hashtag infrastructure (this sprint)
1. Create `Hashtags` table + `PostHashtags` join table + `UserHashtagFollows` table
2. Add hashtag extraction to post creation route
3. Seed official hashtags
4. Build trending algorithm

### Phase 2: Migrate existing posts
1. Scan existing posts with creative type ENUMs (dance, music, etc.)
2. Auto-create hashtags from their types
3. Link via PostHashtags join table
4. Keep `type` field but stop using creative sub-types for new posts

### Phase 3: Frontend refactor
1. Replace category tabs with 3 broad filters + trending bar
2. Add inline hashtag detection to post creation
3. Build hashtag pages
4. Add follow/unfollow UI

### Phase 4: Simplify ENUM
1. Migration to remove creative sub-types from ENUM
2. Update type to: `('general', 'workout', 'achievement', 'challenge', 'milestone')`
3. All creative categorization now through hashtags only

---

## 11. COMPETITIVE RESEARCH

| Platform | How They Handle Categories | What We Take |
|----------|---------------------------|--------------|
| **TikTok** | 100% hashtag-driven, trending page, follow hashtags | Trending bar, hashtag pages, auto-suggest |
| **Instagram** | Hashtags + Explore page with AI curation | Follow hashtags, hashtag search, related tags |
| **Strava** | Activity types (Run, Ride, Swim) + hashtags in description | Keep system types for workouts, hashtags for everything else |
| **Fitocracy** | Groups (communities) + tags on workouts | Group challenges + hashtag discovery |
| **Twitter/X** | Hashtags + trending topics + "For You" algorithm | Trending algorithm, inline hashtag detection |
| **Twitch** | Category tags on streams (just chatting, gaming, music) | We DON'T copy rigid categories — hashtags are more flexible |

### SwanStudios Differentiator
- **Fitness + Creative in ONE feed** — Strava is fitness-only, TikTok is everything. We bridge both worlds.
- **Gamification on hashtag usage** — No other platform awards XP for using/creating trending hashtags
- **Trainer-curated hashtags** — Trainers can pin official hashtags to workouts (#nasmphase1, #stabilization)
- **Premium aesthetic** — Crystalline Swan theme makes hashtag pages feel like luxury brand lookbooks, not generic social media

---

## 12. IMPLEMENTATION CHECKLIST

### Backend (Priority Order)
- [ ] Create Hashtag model (`backend/models/social/Hashtag.mjs`)
- [ ] Create PostHashtag join model (`backend/models/social/PostHashtag.mjs`)
- [ ] Create UserHashtagFollow model (`backend/models/social/UserHashtagFollow.mjs`)
- [ ] Create migration for all 3 tables
- [ ] Add hashtag extraction to POST /api/social/posts
- [ ] Build hashtag routes (trending, search, follow, hashtag page)
- [ ] Add hashtag admin routes (ban, official, category override)
- [ ] Create hashtag seed file with official tags
- [ ] Add gamification hooks for hashtag achievements
- [ ] Weekly count reset cron job

### Frontend (Priority Order)
- [ ] Build FeedFilterBar component (All|Fitness|Creative|Community)
- [ ] Build TrendingHashtags component (horizontal scroll chips)
- [ ] Build HashtagChip component (clickable, with count badge)
- [ ] Add inline hashtag detection to CreatePostCard
- [ ] Build HashtagAutocomplete component (dropdown on # keypress)
- [ ] Build SuggestedHashtags component (AI suggestions below post input)
- [ ] Build HashtagPage component (header + post grid + related tags)
- [ ] Refactor ClientCommunityPage to use new feed system
- [ ] Add follow/unfollow hashtag UI
- [ ] Wire up to existing gamification celebration triggers

---

*SwanStudios Social Media Architecture Blueprint v1.0*
*Ready for AI Village Validation*
