# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/CONSULT-PACKET.md
**Seed:** (none)
**Tokens:** 2331 in / 2144 out | **Cost:** ~$0.0392 | **Wall:** 20.5s | **finish_reason:** stop

---

## Ranked Ideas (max 10)

| # | Idea | Surface | Why it wins (today / evergreen / future) | Core-loop metric it moves | Effort (S/M/L) | Risk |
|---|------|---------|------------------------------------------|---------------------------|----------------|------|
| 1 | **Streak Saver + Comeback Streaks** — Duolingo-style streak freeze (1/week, earned via XP) wired into the existing Observatory streak system; auto-trigger existing `ComebackChallenge` model when a streak breaks | Home right rail + Notifications | Streaks are the #1 reason-to-return-today mechanic ever shipped; you already have the models, this is UI + one cron | DAU / weekly adherence | S | Low — models exist |
| 2 | **Workout Proof Cards** — auto-generated shareable card from `socialWorkoutData` (real PRs, volume, streak) rendered as a crystalline "achievement shard" image (R2-hosted, OG-tagged) | Home feed composer + PostCard | Strava's entire feed is proof-of-work; kills "mock content" gap and makes every log a social object | Posts per workout logged | M | Low — data pipeline exists |
| 3 | **Coach Reacts** — one-tap coach reactions (🔥 "Proud", 💪 "Strong set", 📈 "On track") from CoachDock onto any workout post; push notification to member | CoachDock + PostCard | Peloton high-fives + trainer-led accountability; the cheapest coach↔member moment possible, and it's the business | Coach intervention rate / retention | S | Low |
| 4 | **Weekly Faction War Recap Reel** — auto-generated 15s Victory-animated recap (points swing, MVP, comeback moment) posted to Reels every Monday | Reels + Home | Variable-reward + tribal belonging (Discord/Peloton leaderboard); gives Reels tab a guaranteed weekly content heartbeat | Reels views / faction participation | M | Med — auto-gen quality must be curated or templated tightly |
| 5 | **BeReal-style "Proof Window"** — optional daily 2-hour window: post a real gym photo/check-in, see your friends' posts only after you post | Friends + Notifications | Reciprocity gate is the strongest lightweight-creation mechanic of the decade; fits "real workout proof" ethos perfectly | Daily posts / friend graph density | M | Med — needs to stay optional or it annoys |
| 6 | **Swan Spotlight feed** (the bridge output — see below) | Home, pinned lane above feed | Sean steers mood; positive-only curated news is a differentiator no fitness app has | Session length / return visits | M | Med — depends on bridge discipline |
| 7 | **Challenge Spectator Mode** — non-participants can follow a challenge, get a notification at the dramatic moment (photo finish, upset), and "cheer" (adds bonus XP to cheered participant) | Challenges + Notifications | Twitch/Strava club energy; turns every challenge into community theater instead of a private leaderboard | Challenge enrollment next round | M | Low |
| 8 | **Milestone → Party auto-invite** — when a member hits a Legendary-tier milestone, auto-spawn a 24h Party (existing Party model) with a celebration thread | Parties + Notifications | Evergreen: celebration is the oldest social glue; uses shipped-but-likely-underused Party surface | Party participation / member retention | S | Low |
| 9 | **AI Weekly Digest (on-device summary, zero PII out)** — "Your week: 3 workouts, +12% volume, your faction needs you" rendered as a Home card; aggregate stats only, no LLM on raw user text | Home | Future-facing personalization without violating the zero-PII rule (template + stats, not generative on user data) | Weekly return rate | M | Med — keep it templated, not LLM-generated, to honor constraints |
| 10 | **Cosmetic Shard Drops on workout verification** — variable-reward loot (existing rarity tiers) dropped on verified workout posts, tradeable/displayable on RPGProfileHeader | RPG + Profile | Gacha-style variable reward (Genshin/TikTok gifts) but earned by real effort — monetization-adjacent via cosmetic shop later | Workout logging frequency | M | Med — variable rewards near fitness can feel manipulative; cap drop rates, no paid rolls at launch |

## Bridge Architecture (SwanGuard → SwanStudios feed + reverse operator stats)

**Transport:** Signed webhooks both directions, HTTPS, HMAC-SHA256 over `timestamp + body`, shared secret per direction in env vars (`SWAN_BRIDGE_SECRET_OUT/IN`), 5-min timestamp window, idempotency key = `event_id` (UUID v7) stored in a `bridge_events` table on each side with unique constraint. Retries: exponential backoff (5 attempts over 1h), then dead-letter queue surfaced in SwanGuard's Command Center. Survives independent Render deploys because neither side holds state about the other's liveness — receivers are dumb, idempotent, and replayable.

**SwanGuard → SwanStudios (Swan Spotlight):**
- **Policy carve-out:** add a `PublishingChannel` enum to SwanGuard's contracts package (`internal | swan_spotlight`) with an owner kill-switch and audit receipt per publish (fits existing Trust+Safety layer and grant-ceremony discipline).
- **Curation flow in Newsroom UI:** new lane in `FeedLanes` — "Spotlight Queue." Any story board gets a "Curate for Swan" action → enters `draft → positivity_gate → approved → published` state machine. The positivity gate is a hard checklist UI (no politics tag, no negativity tag, source cited, Sean's explicit approve click) — curator-gated by construction, no auto-import path exists in code.
- **Payload:** `{ event_id, type: "spotlight.published"|"spotlight.retracted", story: { id, headline, summary(≤280), image_r2_key?, source_name, source_url, published_at, curator_note? } }`. No comments, no engagement data flows back.
- **SwanStudios side:** new `SpotlightPost` model (separate from SocialPost — do not contaminate the social graph), `backend/routes/spotlight/` receiver with signature verification, rendered as a pinned "Swan Spotlight ✦" lane at the top of Home tab. Card design: chrome-edge card, gold `#C6A84B` accent border, frost-white headline, source chip, "Read at source" external link. Per-user dismissal stored server-side (`SpotlightDismissal`); a global mute toggle in profile settings. Retraction webhook removes the card everywhere within one poll cycle.

**SwanStudios → SwanGuard (operator stats):**
- Nightly + on-demand signed packet: `{ event_id, period, aggregates: { dau, wau, workouts_logged, posts_created, active_challenges, faction_standings: [{faction_id, points}], milestones: [{tier, count}] }, health: { api_p95_ms, error_rate, r2_usage_pct } }`. **IDs and counts only — zero names, zero post bodies.** Milestones are tier+count, never user-attributed.
- Renders in SwanGuard as a new "Sister Ops" panel in the Command Center shell using its existing ledger-rail pattern.
- **Kill switches both ways:** env flag `BRIDGE_ENABLED=false` on either side; SwanGuard side also gets the owner kill-switch ceremony treatment per its existing conventions.

## "Fun" Mechanics Worth Copying

- **Duolingo** — streak freeze + streak repair: loss aversion is the strongest daily-return hook ever measured, and you already have the streak system.
- **Strava** — proof-of-work feed + segment-style kudos: every workout is content; kudos (Coach Reacts) cost nothing and mean everything in a coaching product.
- **BeReal** — reciprocity gate ("post to unlock"): solves the empty-feed cold-start by making consumption contingent on creation.
- **Peloton** — leaderboard + high-fives: live social presence during effort; your Faction War is already 80% there, it just needs the weekly recap ritual.
- **Discord** — faction/guild identity + dramatic recaps: belonging through teams with narrative, not just points.
- **TikTok** — variable-reward drops: unpredictable rewards on verified effort; use sparingly and only on real workout proof.

## What NOT to Do (top 3 anti-patterns for THIS product)

1. **Do not build a public/global feed or follower-count flexing.** SwanStudios is a trainer-led coaching OS; open virality mechanics (follower counts, global explore ranking) import comparison anxiety and trolling into a trust product. Keep the graph to friends/factions/challenges.
2. **Do not let the Swan Spotlight become a news feed.** No infinite scroll of stories, no comments on Spotlight cards, no auto-import "to save Sean time." The moment it looks like a news app, the news-free positioning and the curated-mood differentiator both die. Cap at ~3 pinned cards, curator-gated, dismissible.
3. **Do not put generative AI on user content.** No LLM summaries of posts, no AI coach chat reading diaries. The zero-PII rule and coaching trust position make this a one-way door; templated stat digests only.

## Top 3 If We Can Only Build Three

1. **Streak Saver + Comeback automation (#1)** — cheapest, highest retention ROI, models already exist.
2. **Workout Proof Cards + Coach Reacts (#2+#3 as one workstream)** — turns the real data pipeline into the social engine and creates the coach↔member moment that is literally the business model.
3. **Swan Spotlight bridge (#6)** — it's Sean's stated vision, the architecture above is deploy-safe, and a curated positive-mood lane is a genuine differentiator no competitor can copy without a second app.
