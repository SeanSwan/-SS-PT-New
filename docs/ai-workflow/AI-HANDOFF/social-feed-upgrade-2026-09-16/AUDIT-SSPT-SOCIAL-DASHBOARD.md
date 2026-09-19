# Audit — SwanStudios Social Surface & User Dashboard (2026-09-16)

Scope: canonical social surface of SS-PT as mounted today. Evidence = file:line reads this session.
Classification per rule 27. This audit is the context base for the Social Feed Upgrade blueprint.

## 1. Canonical surface map

| Surface | Status | Evidence |
|---|---|---|
| `/user-dashboard` (UserDashboard.V3 "Observatory") | **canonical** — the social hub | `frontend/src/routes/main-routes.tsx:272-275` mounts `UserDashboard.V3`; comment at `:268-271`: "the V3 Observatory IS the main hub… absorbed everything the retired /social page had (full feed + coach dock + right rail on the feed tab; friends/challenges/notifications tabs)" |
| `/social`, `/social/feed` | retired → redirect | `main-routes.tsx:277-287` `SocialTabRedirect` → `/user-dashboard[/:tab]`; `/social/:postId` → `SocialPostRedirect` |
| `SocialPage.V3.tsx` (763 ln), `SocialPage.tsx` (556 ln) | **legacy, unmounted (files stay per rule 34)** | `main-routes.tsx:274` comment |
| `UserProfilePage` | canonical profile page | `main-routes.tsx:259-262` lazy mount from `pages/Social/UserProfilePage` |
| Dashboard tabs | canonical: `home, reels, friends, challenges, notifications, creative, photos, about, activity, nutrition, progress, profile` | `frontend/src/components/UserDashboard/types/UserDashboardTypes.ts:113-126`; `community` + `feed` unroutable (comments at :105-112: feed folded into Home, workstream O) |

## 2. Dashboard shell architecture (verified)

- `UserDashboard.V3.tsx` — 222-line shell. URL-driven tabs (`:tab` param, unknown → home,
  `:45-54`); Home renders TabBar + TeachMeGuide + TabsV3 (`:116-143`); non-home tabs render
  inside `ObservatoryShell` with sidebar + level/points/streak props (`:145-187`).
- Observatory gamification: tier, rank title, level, points, progress %, XP-to-next, streak days,
  top badges (props at `:150-155`).
- Background system: `useUserDashboardBackgroundPreference` + controls disclosure (`:65-76`).

## 3. Social component inventory (`frontend/src/components/Social/`)

Feed (home tab): `SocialFeed.tsx` (variant-driven, view-model hook `useSocialFeedViewModel`),
`PostCard.tsx` (299 lines — at the 300-line ceiling), `CreatePostCard.tsx` (+ workout-attachment
tests), `NotificationBell.tsx`, `ActivityTicker.tsx`, `TrendingHashtags.tsx`, `PostMediaLightbox`.
Reels: `VerticalReels.tsx` (+ model/status/styles/actions). Families: Friends, Challenges, Events,
Explore, Hashtags, LiveStreaming, Messaging, Notifications, Profile, RPG + `RPGProfileHeader`,
CreatorEconomy, CoachDock (`SocialCoachDock.tsx` — coach entry into social context).
Dashboard home sections: `ClientDashboardHome.feedSections.tsx` (216 ln — feed/composer/workout/
insight), `ClientDashboardHome.railSections.tsx` (133 ln — right rail incl. Faction War).

## 4. Backend social inventory

- Routes `backend/routes/social/`: `posts`, `friendships`, `hashtags`(+`hashtagUtils`),
  `challenges`, `events`, `factions`, `parties`, `socialGoalRoutes`, `socialWorkoutData`
  (wires REAL workout logs into feed context — data-truth rule), `feedEnrichment`,
  `socialRouteResponse.helpers`, index hub mounts `/feed-enrichment` with `protect`
  (`backend/routes/social/index.mjs:16`).
- Models `backend/models/social/`: SocialPost, SocialComment, SocialLike, Friendship, UserFollow,
  Hashtag, PostHashtag, UserHashtagFollow, Challenge(+Participant/Team), ComebackChallenge,
  Faction(+Membership), Party(+Member), ModerationAction, PostReport (+ `enhanced/` subdir).
  Adjacent: GoalComment, GalleryEvent, OlympicEvent, SocialPublishing{Account,Job,Attempt},
  UserWatchHistory, FoodScanHistory.
- Admin outbound publishing: `backend/routes/adminSocialPublishingRoutes.mjs` — prefix
  `/api/admin/social-publishing`, protect+adminOnly, native provider adapters primary
  (Postiz optional), compliance checks, scheduling/planning helpers. This is Sean's
  "upload more stuff myself" pipeline (SwanStudios → external platforms).

## 5. KEY FINDING — the positive-content precedent already exists

`backend/routes/social/feedEnrichment.mjs` implements the exact policy shape Sean wants for the
news bridge:
- `bannedTerms` blocklist incl. `politic*, election, partisan, war, violence, shooting,
  prescription, diagnosis, medical advice, campaign, injury cure` (`:11-23`)
- `allowedSources` allowlist incl. **`swan-curated`** (`:25-31`)
- `allowedCategories`: space, nature, motivation, movement, growth (`:33-39`)
- Safe-URL checks (http/https only), direct-video URL gate, whitespace/truncation/ISO-date
  normalizers (`:41-100`)
- Hardcoded `curatedSparks` — five Sean-voice motivational cards with `source: 'swan-curated'`
  (`:78-107`) — **the Swan Spotlight bridge replaces these hardcoded sparks with SwanGuard-
  published, signed stories.** Cache pattern: 30-min TTL, 3.5s fetch timeout, max 10 items
  (`:8-10`).

## 6. Gaps / risks noted (no code written)

1. `PostCard.tsx` at 299/300 lines — any feed-card feature needs extraction first.
2. Reels supply: panel should assess whether a small community can feed a vertical-video tab.
3. Legacy `SocialPage*.tsx` files remain unmounted (kept intentionally); any "social page"
   edits must target the dashboard tabs, NOT these files.
4. `bannedTerms` is substring-based — fine for EN blocklist, will need expansion for the
   bridge's second-gate role (defense in depth behind SwanGuard's curation).
5. SocialPublishing{Account,Job,Attempt} gives an audited outbound-publish precedent
   (attempts + jobs) — pattern reusable for bridge egress receipts on the SwanGuard side.
