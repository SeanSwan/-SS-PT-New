# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Status:** incomplete (finish-not-stop)
**Tokens:** 2253 in / 12000 out (reasoning: 9954) | total 14253
**Wall:** 169881ms

---

## Ranked Ideas (max 10)

| # | Idea | Surface | Why it wins (today / evergreen / future) | Core-loop metric it moves | Effort (S/M/L) | Risk |
|---|------|---------|------------------------------------------|---------------------------|----------------|------|
| 1 | **Proof Shot** — ephemeral 24h photo prompt that *only unlocks when `socialWorkoutData` reports a completed session* ("show us your last set"); posts to a dedicated Home lane | Home feed + PostCard variant | Today: BeReal-style authenticity wave; Evergreen: real proof beats polished; Future: human-verified content is the anti-AI-slop differentiator. Hook: authenticity + reciprocity (see others' after you post) | DAU on training days; feed posts per active user | S/M | Low — ModerationAction/PostReport exist; add R2 image scan |
| 2 | **Coach Shoutouts** — one-tap golden PostCard from CoachDock celebrating a real logged result | CoachDock → Home feed | Evergreen: authority-bestowed status (Peloton instructor shout-outs) is the highest-trust recognition in a B2B2C product. Rationed frequency keeps it precious | Coach touchpoints per client per week → adherence | S | Low — don't let it become boilerplate; cap per client/week |
| 3 | **Swan Spotlight** — curated positive-only editions from SwanGuard (see architecture below) | New Home lane above PostCard stream | Today: human curation is the anti-algorithm play (WeChat curated Moments); Evergreen: daily reason-to-return Sean fully controls; Future: "editor steers the mood" is a real 2026 media pattern | DAU / next-day return rate | M | Medium — needs policy carve-out, positive-gate discipline, kill switch |
| 4 | **Live Feathers** — "Training Now" strip (right rail): tap to send a feather to anyone mid-session; 60s polling, no new infra | Right rail + LiveStreaming + activity | Today: Peloton high-fives = ambient co-presence; Evergreen: real-time reciprocity makes solo training feel accompanied | Interactions during active sessions; session completion rate | M | Medium — presence accuracy; make visibility opt-in |
| 5 | **Weekly Glow-Up Recap** — auto-generated shareable card from real Victory-chart data; rarity-tiered frame (Legendary animated gradient for 4/4 weeks) | Progress tab → share to feed | Today: Strava Recap / Snapchat Memories ritual; Evergreen: converts private effort into shareable identity — this IS the existing "shareable milestone" loop, productized | Shares/referrals; WAU | M | Low |
| 6 | **Party Quest** — weekly co-op goal sized to party size ("Log 30 sessions collectively"); comeback credit via ComebackChallenge | Parties + Challenges models | Evergreen: Duolingo Friend Quest / Fortnite co-op — borrowed accountability beats personal willpower; your log helps *them* | Weekly group adherence; party retention | S | Low |
| 7 | **Faction War Seasons** — 2-week seasons with Enchanted Apex lore drops; champion faction earns a season-exclusive Legendary cosmetic | Home right rail (existing Faction War) | Today: Discord seasonal events = cadenced appointment return; Evergreen: status + belonging. Lore drops are variable rewards | WAU; faction participation rate | M | Medium — needs faction-balance guardrails or you get death-spiral |
| 8 | **Playbook Remix Cards** — Creative tab turns a *real logged workout* into a styled chrome-edge card; others "Save to my plan" (coach-visible intent) | Creative tab + Explore | Today: Xiaohongshu note-cards — pretty, structured, saveable expertise; Evergreen: creative expression with a coaching funnel at the end | Saves → plan starts | M | Low |
| 9 | **"This Week in the Flock" AI digest** — aggregate-only, zero-PII weekly summary (counts, streaks, faction results, Spotlight link), coach/Sean approves before send | Notifications + Home | **Future-facing (2026+):** AI-summarized community digest — but human-in-loop approval and aggregates-only keeps the zero-PII-to-LLMs rule intact | Weekly reactivation | M | Medium — LLM guardrails; must never include names/free text |
| 10 | **Adherence-as-Status cosmetics** — rarest cosmetic tiers unlock ONLY via real consistency milestones (100 coached sessions, 12-month streak) | Profile + RPGProfileHeader rarity tiers | Evergreen status economics; **Monetization-adjacent without pay-to-win:** the paid coaching output (consistency) becomes the visible status currency — fuels renewals, never sold | Renewal-churn delta vs. cosmetic ownership | S | Low — must *never* sell these tiers later |

## Bridge Architecture (SwanGuard → SwanStudios feed + reverse operator stats)

**Recommendation: signed-webhook push + outbox + reconciliation pull.** Not pure polling (kills Sean's same-day freshness); not a shared read API as primary (couples uptime of two independently deployed Render services); shared DB is forbidden anyway.

**Forward path (Spotlight):**
1. **Curation in SwanGuard Newsroom:** add a "Spotlight" lane to `FeedLanes`; `StorySheet` gains "Stage for Swan Spotlight." Hard state machine: `sourced → fact-checked (existing pipeline) → positive-gate → staged (live preview) → published → retired`. The positive-gate is a *state*, not a flag: automated blocklist (politics/violence/tragedy) + explicit operator clearance recorded through SwanGuard's existing grant-ceremony pattern. Items can't reach `published` without `positiveGate: cleared` + operator ID in the audit record.
2. **Delivery:** on publish, write `SpotlightEdition` + outbox row. Background worker POSTs to `sswanstudios.com/api/bridge/spotlight/ingest` with Stripe-style headers: `X-Swan-Sig: t=<unix>,v1=HMAC-SHA256(secret, t+'.'+rawBody)` and `X-Swan-Delivery: <ULID>` (idempotency key). Retries: exponential backoff 1m→24h, then dead-letter lane in SwanGuard ops. Secret via env (per-direction secrets), dual-key rotation grace.
3. **Ingest (SwanStudios):** `routes/bridge/spotlightIngest.ts` verifies signature + ±5min timestamp + replay cache; upserts by `editionId` (idempotent); **copies media into SwanStudios' R2 bucket** so rendering never depends on SwanGuard uptime; new `SpotlightEdition`/`SpotlightItem` models; feature flag `BRIDGE_SPOTLIGHT_ENABLED`; returns `{receiptId}` which SwanGuard stores as its audit receipt.
4. **Reconciliation:** SwanStudios cron `GET SwanGuard /public/spotlight/current` with `If-None-Match` ETag every 15 min — self-heals missed webhooks after either side's deploy.
5. **Kill switches (both sides, independent):** SwanGuard owner kill-switch halts the delivery worker; SwanStudios flag hides instantly; a `spotlight.purge` event type hard-removes editions.
6. **Policy:** explicit amendment in SwanGuard docs — "Exception: curated Spotlight editions to SwanStudios via signed bridge, positive-gated, operator-granted, audit-receipted." Each payload carries `policyRef: "SG-POL-2026-001"`.

**Payload v1** (zod schema lives in SwanGuard `packages/contracts`, mirrored to SwanStudios `backend/src/contracts/swanBridge.ts` with a CI checksum test in both repos; additive-only, unknown-major-version dropped):

```json
{ "v": 1, "type": "spotlight.edition.published | spotlight.edition.retired | spotlight.purge",
  "deliveryId": "dl_01J...", "editionId": "ed_01J...",
  "publishedAt": "ISO-8601", "expiresAt": null, "policyRef": "SG-POL-2026-001",
  "edition": { "headline": "...", "items": [ { "id": "it_...", "kind": "story|clip|quote",
      "title": "...", "summary": "≤240 chars", "mediaUrl": "...",
      "creditLabel": "display-only source label", "citations": ["..."] } ] } }
```

**Rendering in SwanStudios:** "Swan Spotlight" carousel at the top of the Home feed column (below CoachDock, above the PostCard stream — don't touch the coach dock). Chrome-edge card on the sapphire gradient with the **gold token** as accent rail and an eyebrow label — deliberately distinct from ice-cyan user content so it reads editorial, not algorithmic. Max 5 items, horizontally swipeable, 44px targets, poster-frame media (no autoplay; reduced-motion safe). Split into `SpotlightLane.tsx` + `SpotlightCard.tsx` to respect the 300-line cap. Per-edition dismiss ("Not interested") + lane-level "Hide Spotlight" preference. **No comments/likes in v1** — zero new moderation surface, preserves editorial tone. One Home-tab badge per edition, max.

**Reverse path (operator stats, SwanStudios → SwanGuard):** hourly signed webhook `ss.community.stats` (same HMAC pattern, separate secret, idempotent on `deliveryId
