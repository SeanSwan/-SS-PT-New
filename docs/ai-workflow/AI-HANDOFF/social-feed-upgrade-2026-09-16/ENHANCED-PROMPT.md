# Enhanced Prompt — Social Dashboard Upgrade + SwanGuard↔SwanStudios Brother-Sister Bridge

Origin: Sean's voice prompt 2026-09-16, enhanced per prompt-watcher (rule 66) and prompt
reconstruction protocol. Gaps Sean's original left open are filled inline and marked **[gap-fill]**.

---

## The Mission

Upgrade the **social side of the SwanStudios user dashboard** (canonical surface:
`/user-dashboard`, the V3 "Observatory" — home feed, reels, friends, challenges, notifications)
so it is measurably **funner**, stickier, and more shareable — informed by **what is popular
today, what has always worked, and where social/fitness apps are heading next**.

In parallel, stand up the **brother-sister bridge between SwanGuard (Swan Guard Command) and
SwanStudios**:

1. **SwanGuard is the newsroom; SwanStudios stays news-free.** Sean curates stories in
   SwanGuard's Newsroom (positive-only: uplifting, beautiful, fitness-adjacent-OK; ZERO
   politics, zero negativity, zero rage-bait), then publishes a curated **"Swan Spotlight"**
   feed that appears inside every SwanStudios user's dashboard.
2. **SwanGuard is also Sean's operator dashboard**: SwanStudios site health, community
   stats, and notable member activity flow BACK into SwanGuard so Sean sees both apps from
   one chair.
3. Both apps stay **separate deployables** (separate repos, separate Render services) —
   siblings that share information over an explicit, authenticated, auditable contract.
   No shared database. No merged codebases. **[gap-fill]** SwanGuard's product map currently
   says "account linking is deferred" — this bridge is an opt-in, service-to-service
   evolution of that stance, not an account merge.

## Working Method (in order)

1. **Audit both apps** and write the audit into the workstream folder (canonical surfaces
   with file:line evidence — no memory-based claims): SS-PT social/dashboard, SwanGuard
   newsroom/civic surfaces.
2. **Consult panel** (comprehensive packet, not half-assed context) — one seat per brain:
   - **GLM 5.3** — via Sean's Z.AI subscription (consult-glm.mjs). Sean explicitly wants
     5.3's opinion; GLM 5.3 Flash (this builder) executes.
   - **Fable 5** (claude-fable-5 via OpenRouter) — the "Fable 5.1" seat; 5.1 snapshot is no
     longer listed on OpenRouter, -5 is the live Fable family model.
   - **GPT-5.1** (the "Astro 5.1" seat) — **first probe Sean's Codex CLI subscription**
     (check credits/auth BEFORE spending; default OpenAI models to his Codex connection);
     if the subscription is unavailable, fall back to `openai/gpt-5.1` on OpenRouter.
   - **HY4 was requested but is not on OpenRouter** (Tencent tops out at hy3/hy3-preview).
     Substitute: **Qwen 3.8 Max** — strongest available non-Western-flagship perspective on
     social-product patterns (super-app mechanics: Douyin/Xiaohongshu/WeChat). Sean can veto.
3. **Mega Blueprint** via `fable-blueprint-forge` doctrine: architecture docs, mermaid
   flows, ERD deltas, wireframes (desktop + mobile), file-by-file build order, exact API
   contracts, per-slice acceptance criteria, "do NOT" bans — so any builder can execute
   without inventing.
4. **Build all slices back-to-back**, hostile review (rule 61) at each slice boundary,
   verify per task-type Definition of Done, keep `< 300`-line files, feature-flag the
   bridge, no push to main without Sean.

## Success Criteria

- A Sean-curated positive story published in SwanGuard appears in SwanStudios dashboards
  (feature-flagged) with zero politics/negativity path to production (curator UI has
  positive-only gate + review state).
- The dashboard social surfaces gain at least: a reason-to-return-today loop (daily
  social hook), lighter creative expression (reactions/media), and a shareable progress
  moment — each tied to a Product Core Loop metric (workout logs, streaks, adherence).
- SwanGuard shows a SwanStudios operator panel (site stats + last curated posts).
- Blueprints + consult replies + audit all live in
  `docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/`.
- Spend: consult panel capped (≤ ~$1 total OpenRouter worst case; GLM via subscription).

## Explicit Non-Goals

- No politics, news aggregation for the public site, or negative-sentiment content — ever.
- No scraping (SwanGuard house rule: official APIs/sources only).
- No shared database or auth merge between the two apps.
- No client PII in any consult payload (rule 8: IDs/roles only).
- No removal of the retired `/social` legacy files (rule 34: they stay).
