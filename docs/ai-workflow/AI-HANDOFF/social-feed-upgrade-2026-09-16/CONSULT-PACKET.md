# Consult Packet — SwanStudios Social Dashboard Upgrade + SwanGuard↔SwanStudios Curated-News Bridge

You are one seat on a four-AI ideation panel (alongside GLM 5.3, Fable 5, and GPT-5.1) advising
**SwanStudios** (production personal-training SaaS, sswanstudios.com) and its sister app
**SwanGuard**. The owner, Sean, wants ideas that are grounded in **what is popular today, what has
always worked in social products, and where social/fitness apps are heading next**. Be specific,
ranked, and honest about effort. Do NOT give generic fitness-app advice — everything below is
verified repo evidence; build on it.

Deliver your reply as:

```
## Ranked Ideas (max 10)
| # | Idea | Surface | Why it wins (today / evergreen / future) | Core-loop metric it moves | Effort (S/M/L) | Risk |
## Bridge Architecture (SwanGuard → SwanStudios feed + reverse operator stats)
## "Fun" Mechanics Worth Copying (name the app each is borrowed from and why it works)
## What NOT to Do (top 3 anti-patterns for THIS product)
## Top 3 If We Can Only Build Three
```

---

## PART A — SwanStudios product truth

**Stack:** React 18 + TypeScript + styled-components (CSS custom props, dark-first), Node/Express +
Sequelize + PostgreSQL on Render (paid plan). Charts: Victory only. Media: Cloudflare R2. Theme:
"Enchanted Apex: Crystalline Swan" (midnight sapphire `#002060`, ice cyan `#60C0F0`, wing purple
`#8B5CF6`, gold `#C6A84B`, frost white text, obsidian backgrounds). House style: deep sapphire
gradient surfaces, chrome-edge cards, 44px+ controls, GPU-safe motion with reduced-motion fallbacks.

**Product core loop (the business):** log workout → save diary entry → charts/progress proof →
coach/admin next-action → shareable milestones to community. It is a **trainer-led B2B2C coaching
OS** — community exists to reinforce coaching, adherence, retention, and trust. North-star
questions used to judge every feature: what is the trainee's next best action; which client needs
coach intervention; what progress can be shown; what brings the group back this week?

**Gamification already shipped:** XP/levels ("Observatory" tier/rank/points/streak system on the
dashboard shell), badges, factions ("Faction War" lives in the Home right rail), challenges,
comeback challenges, parties, events, rarity tiers on cosmetics (Common=Lavender, Rare=Gold,
Epic=Purple, Legendary=animated gradient).

**Canonical user dashboard** (route `/user-dashboard`, `UserDashboard.V3.tsx` — 222-line shell,
URL-driven tabs `/user-dashboard/:tab`; the old `/social` page is retired and redirects here):

- Tabs: `home, reels, friends, challenges, notifications, creative, photos, about, activity,
  nutrition, progress, profile`
- Home = first (feed widgets + coach dock + right rail incl. Faction War). Feed tab was folded
  into Home deliberately (workstream O) — do not propose re-splitting it.
- Frontend component families (`frontend/src/components/Social/`): Feed (PostCard, composer,
  NotificationBell), Reels, Friends, Challenges, Events, Explore, Hashtags, LiveStreaming,
  Messaging, Notifications, Profile, RPG + RPGProfileHeader, CreatorEconomy, CoachDock
  (coach entry into social context).
- Backend social routes (`backend/routes/social/`): posts, friendships, hashtags (+utils),
  challenges, events, factions, parties, feedEnrichment, socialWorkoutData (wires real workout
  data into the feed), socialRouteResponse helpers.
- Models (`backend/models/social/`): SocialPost, SocialComment, SocialLike, Friendship,
  UserFollow, Hashtag, PostHashtag, UserHashtagFollow, Challenge(+Participant/Team),
  ComebackChallenge, Faction(+Membership), Party(+Member), ModerationAction, PostReport.
  Plus goal comments (GoalComment) and social goal routes; GalleryEvent/OlympicEvent; a
  SocialPublishing trio (Account/Job/Attempt) powering admin cross-posting of SwanStudios
  content OUT to external platforms (Instagram etc.), and an InstagramFeed embed component.
- Data truth rule: feed progress content must come from real workout logs (mock = gap).
- Zero-PII to LLMs; client names never leave the client boundary.

## PART B — SwanGuard product truth (separate repo/deploy)

**Swan Guard Command** — greenfield web/PWA "command center" monorepo (npm workspaces:
`apps/web` Vite React + `apps/api` Express/TS + `packages/contracts|domain`), Postgres via
migration runner, in-memory backend mode for tests. Heavy test discipline (per-feature smoke
tests, bundle budgets, secret scans, owner kill-switches, operator grant ceremonies).

Modules: Command Center shell; Creator Board (YouTube official-API only, no scraping); Family
Trust Shopping; Fair Access Checkout rules; Household Readiness; **News + Civic Intelligence
(evidence-first story boards/timelines)**; Comment Claim Intelligence (paste → cited claim cards);
Influence Intelligence + Intelligence Wiki (redacted, cited; currently **no public publishing**);
Impact Layer; Marketplace Safety Gate; Hermes Bridge (redacted export packets); Trust+Safety layer.

**Existing Newsroom surface (the curation substrate):** web screens — `NewsroomShell`, `Feed`,
`FeedLanes`, `StorySheet`, `SourcesWall`, `SpectrumBar`, `PollTicker`, `Archive`, desktop ledger
rail; API — `newsroomAtlas`, `newsroomInvestigations`, `newsroomPolls`, `civicArchive`,
`civicOfficialSources`, `intelligenceWiki`, fact-check + fact-ticker pipelines.

**Stance toward SwanStudios (current docs):** "separate sister product… Cross-promotion is opt-in
and account linking is deferred." There is NO bridge today — no shared DB, no service auth, no
publishing path from SwanGuard to SwanStudios. Any bridge proposal must define the contract.

## PART C — Sean's vision (the ask)

1. Make the SwanStudios dashboard social side **funner** and more alive — popular-today +
   evergreen + future-facing mechanics — without burying workout/progress truth.
2. **SwanGuard = the newsroom; SwanStudios = news-free.** Sean curates positive-only stories
   (beautiful, uplifting; ZERO politics/negativity) in SwanGuard during his day, then publishes
   a curated set that appears to **all SwanStudios users** in the dashboard (a "Swan Spotlight"
   feed). He steers the site's mood while keeping protocol.
3. **SwanGuard is also Sean's operator dashboard**: SwanStudios updates (community stats, site
   health, notable member milestones — redacted/aggregated, zero PII) should surface inside
   SwanGuard. Two apps, one chair.
4. Brother-sister relationship: separate apps that share an explicit, authenticated, auditable
   information contract. No account merge, no shared database.

## PART D — Hard constraints (any idea violating these will be cut)

- Dark-first styled-components + CSS tokens (no MUI, no hardcoded hex), 44px touch targets,
  WCAG 4.5:1, premium not template-y; mobile checked at 414px; GPU-safe motion.
- Max 300 lines/file; Victory charts only; feature-flag anything cross-app.
- Zero PII crossing to SwanGuard (aggregate counts, IDs only). Secrets via env, never prompts.
- SwanGuard: official APIs only, no scraping; publishing outside SwanGuard is currently
  forbidden by its own policy — the bridge needs an explicit policy carve-out + audit receipts.
- News visibility on SwanStudios is **curator-gated** (Sean) — no auto-import of raw feeds.
- Render free->paid: both apps are separate Render services; bridge must survive independent
  deploys (webhook + signature, retries, idempotency).

## PART E — The questions

1. **Feed & fun (max 10 ranked ideas):** concrete upgrades to the dashboard social surfaces
   (home feed, reels, friends, challenges, notifications, creative) that make it funner TODAY
   while staying a coaching-first product. Name the popular app each mechanic is proven in
   (TikTok/Douyin, Duolingo, Strava, BeReal, Discord, Peloton, WeChat/Xiaohongshu, etc.) and the
   psychological hook (streaks, variable rewards, social accountability, status, reciprocity…).
   Weight ideas toward: reason-to-return-today, lightweight creative expression, celebrating
   real workout proof, coach↔member moments, community belonging.
2. **Bridge architecture:** recommend the concrete SwanGuard→SwanStudios publishing contract
   (transport, auth, payload schema, curation/review states, idempotency, kill switch) and the
   reverse SwanStudios→SwanGuard operator-stats packet. Separate services, no shared DB.
   Consider: signed webhooks vs polling vs shared read API; how Sean's curation queue and
   positive-only gate should work in SwanGuard's existing Newsroom UI; how the Swan Spotlight
   renders in the SwanStudios dashboard (surface, card design language, dismissal/muting).
3. **Future-facing:** which 2-3 emerging patterns (2026+) should this pair of apps adopt early
   (e.g., AI companions, social audio, ephemeral squads, wearable-shared moments, AI-summarized
   community digest)? Be concrete about what ships in THIS codebase.
4. **Monetization-adjacent (light touch):** any social mechanic that strengthens the paid
   coaching loop (not ads, not data selling).
5. **Anti-patterns:** what would kill the vibe or violate a coaching-first trust position.

Be decisive. If you think an idea is bad for THIS product, say so and why. No filler.
