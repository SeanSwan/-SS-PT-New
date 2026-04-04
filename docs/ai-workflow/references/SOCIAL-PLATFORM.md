# Social Media Platform
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: social features, feed, posts, friends, community

---

## Social Media Platform (MANDATORY)

SwanStudios is NOT just a PT app — it is a **fitness social media platform**. Every feature must consider the social layer.

### Core Social Features
| Feature | Frontend | Backend Model | Status |
|---------|----------|---------------|--------|
| Social Feed | `frontend/src/components/Social/Feed/` | `backend/models/social/SocialPost.mjs` | Built |
| Posts (text, workout, achievement, milestone) | `CreatePostCard.tsx`, `PostCard.tsx` | `SocialPost.mjs` | Built |
| Likes/Reactions (thumbs_up, heart, swan) | In PostCard | `backend/models/social/SocialLike.mjs` | Built |
| Comments | In PostCard | `backend/models/social/SocialComment.mjs` | Built |
| Friends/Requests | `frontend/src/components/Social/Friends/` | `backend/models/social/Friendship.mjs` | Built |
| Following (6 types) | Social hooks | `backend/models/UserFollow.mjs` | Built |
| Challenges | `frontend/src/components/Social/Challenges/` | `backend/models/social/Challenge.mjs` | Built |
| Vertical Reels | `frontend/src/components/Social/Reels/VerticalReels.tsx` | — | Built |
| User Profiles | `frontend/src/pages/Social/UserProfilePage.tsx` | `backend/controllers/profileController.mjs` | Built |
| Community | `frontend/src/components/DashBoard/Pages/community/` | `backend/models/social/enhanced/Community.mjs` | Built |
| Direct Messaging | — | `backend/models/social/enhanced/Messaging.mjs` | Model only |
| Live Streaming | — | `backend/models/social/enhanced/LiveStreaming.mjs` | Model only |
| Creator Economy | — | `backend/models/social/enhanced/CreatorEconomy.mjs` | Model only |

### Social → Gamification Integration (MANDATORY)
- **Social post creation** → awards 15 points (social category)
- **Comments/reviews** → awards 15 points
- **Referrals** → awards 200 points
- **Challenge participation** → awards variable points based on difficulty
- **Achievement sharing** → increases `shareCount` on UserAchievement, tracked for social engagement metrics
- All social gamification points feed into the same leveling/tier system as workout points

### User Profile = Social Profile + Fitness Dashboard
Every user profile page MUST contain:
1. **Profile header** — Photo, name, tier badge, level, streak count
2. **Achievement showcase** — Top 3-6 badges with rarity glow
3. **Chart section** — User-selected Victory charts (toggle-able visibility)
4. **Social feed** — User's recent posts and workout logs
5. **Stats summary** — Total workouts, longest streak, current OPT phase, XP to next level
6. **Friends/followers count** — Social proof metrics

### Privacy Controls
- Post visibility: public / friends-only / private
- Chart visibility: per-chart toggle (see Chart Visibility Toggle above)
- Profile visibility: public / friends-only / private
- Granular per-relationship settings: share workouts, achievements, progress, allow DMs, allow challenges

### Content Moderation
- `backend/models/social/PostReport.mjs` — User flagging
- `backend/models/social/ModerationAction.mjs` — Admin actions
- Auto-moderation confidence scoring on posts/comments
- Admin panel: `frontend/src/components/DashBoard/Pages/admin-dashboard/components/SocialMediaCommand/`
