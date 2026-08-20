# Brainstorm: SwanGuard — up to speed + radar ingest

**Date:** 2026-08-20 · **Status:** complete (Phase 1 + Phase 2 delivered; all 7 Phase-2 suggestions ADOPTED as build constraints) · **For:** SWA-70 (SwanGuard → Personal Intelligence Command Center); successor to the station brainstorm (`marketing-station-spare-pc-2026-08-20.md`, complete — its decisions are NOT re-asked here)

## Summary

Sean's instruction: grill SwanGuard, get it "up to speed", then wire the radar station into it.
This doc grills the SwanGuard side only: what it IS, its real current state, what "up to speed"
means to Sean, and what it needs to receive the radar's `StoryNode` data.

## Repo state (explored 2026-08-20, rule 49 — measured, not asked)

Repo: `Desktop/SwanGuard-Newsroom` (monorepo: `apps/web`, `apps/api`, `packages/{contracts,database,domain}`)

- **The handoff's picture is 3 weeks stale.** Work did NOT stop at `refactor/shell-rebuild-20260721`.
  Current checkout: `codex/swanguard-newsroom-recovery-20260801` — **64 commits ahead of `origin/main`,
  and main is only 2 commits ahead of it.** The merge is nearly clean, not the scary divergence the
  handoff implied.
- Recovery branch carries: newsroom fixes (SWA-70 — focus trap, 44px targets, false "Saved to Archive"),
  **creator catalog + news-RSS with default-off law**, `httpStoryService.ts` (+ tests) — i.e. a REAL
  API-backed story service exists, not just demo mode — and a slice registry "through F1".
- `origin/main` tip: civic intelligence cockpit + local archive, Phase 127 HTTP hardening, Phase 128
  observability queued.
- `apps/api` is substantial: agentRuntime, full auth stack, civicArchive, audit.
- `render.yaml`: one service `swanguard-staging-demo` (static web, monorepo root build).
- **`StoryNode` lives ONLY in `apps/web/src/newsroom/` (frontend-local), NOT in `packages/contracts`**
  — the radar ingest contract is not yet a shared package.
- Desktop launchers exist: "Swan Guard (Newsroom).cmd" (demo mode, self-healing root, mounts the
  newsroom) vs "Swan Guard.cmd" (backend mode, old 14-module shell).
- Build trap (recorded in handoff §4): plain `vite build` without `VITE_SWANGUARD_API_MODE=demo` +
  `VITE_SWANGUARD_ALLOW_STAGING_DEMO=true` renders the OLD app, not the newsroom.

## Key Decisions

- **SwanGuard = Personal Intelligence Command Center, Sean-only** — civic news is one section (Q1)
- **Hosting = the 3600 station, always-on, Tailscale-only, zero public surface** (Q2)
- **One store: SwanGuard's DB is the canonical StoryNode store** — radar POSTs, Hermes GETs top-N (Q3)
- **The 14-module shell retires; the newsroom is the only shell** — civic cockpit migrates in later (Q4)
- **Auth = existing stack + long-lived trusted-device sessions**, Tailscale as perimeter (Q5)
- **X read via xAI Live Search, called from the station directly** — Hermes's three X locks stay (Q6)
- **All 7 Phase-2 suggestions (S1–S7) adopted as build constraints** — Sean 2026-08-20

## Q&A Log

### Q1: What IS SwanGuard, as of today?
- **Recommended:** Personal Intelligence Command Center (Sean-only) — newsroom + creators + radar
  feed, civic news as one section inside it. Matches SWA-70's title, the radar architecture, and the
  "evidence-not-oracle — you conclude" doctrine.
- **Sean's answer:** ✅ Personal intel center (accepted the recommendation).
- **Implication:** the recovery branch's newsroom identity WINS; main's civic cockpit becomes a
  section, not the product. "Up to speed" = the newsroom line becomes the mainline. Sean-only
  posture governs auth/deploy decisions until he says otherwise.

### Q2: What does "up to speed" concretely mean — where does SwanGuard run?
- **Recommended:** Station hosts it — merge recovery→main, then web+api+db run on the 3600 station,
  always-on, Tailscale-only, zero public surface. Radar writes to localhost; Render staging-demo
  stays as a demo.
- **Sean's answer:** ✅ Station hosts it (accepted the recommendation).
- **Implication:** "up to speed" = (1) merge `codex/swanguard-newsroom-recovery-20260801` → main
  (reconciling main's 2 civic commits under the Q1 hierarchy), (2) stand SwanGuard up as an
  always-on service on the station, reachable only over Tailscale. No public auth surface needed
  for Phase 1. The station's earlier brainstorm ("hands, not brain") is honored — SwanGuard's
  web+api is I/O, not inference.

### Q3: Is SwanGuard's DB the ONE canonical StoryNode store?
- **Recommended:** yes — radar collectors POST StoryNodes to SwanGuard's API; the Hermes 06:47
  briefing GETs top-N from the same API over Tailscale. One source of truth, no dual-store drift;
  SwanGuard's provenance/evidence fields become the system of record.
- **Sean's answer:** ✅ One store: SwanGuard's (accepted the recommendation).
- **Implication:** the ingest contract is an API surface on `apps/api` (`POST` stories + a ranked
  `GET` for the briefing). `StoryNode` must be promoted from `apps/web/src/newsroom/` (frontend-local
  today) into `packages/contracts` so web, api, and the station collectors share one type — that is
  now a build task, not a question. The radar needs no store of its own beyond scratch/cache.

### Q4: What happens to the old 14-module shell?
- **Recommended:** retire it — the newsroom shell IS SwanGuard. Old modules that still matter
  (main's civic cockpit + archive per Q1) migrate in as newsroom sections; the rest is legacy
  behind a flag nobody mounts.
- **Sean's answer:** ✅ Retire it (accepted the recommendation).
- **Implication:** merge scope is now unambiguous: the newsroom becomes the ONLY mounted shell;
  the "Swan Guard.cmd" backend-mode launcher gets retired/repointed; the build-trap env flags
  (`VITE_SWANGUARD_API_MODE`) stop being a trap once the newsroom is the default render. The civic
  cockpit's migration into a newsroom section becomes a named follow-up slice, not part of the
  up-to-speed merge.

### Q5: How should daily access feel on the Tailscale-only deployment?
- **Recommended:** trusted-device session — keep the existing `apps/api` auth stack, long-lived
  sessions per device; log in once per device, then instant open for months. Tailscale is the real
  wall; app auth is the ~0-click second layer.
- **Sean's answer:** ✅ Trusted-device session (accepted the recommendation).
- **Implication:** no auth code removal (the existing stack stays exercised); session TTL becomes a
  config choice on the station deployment; the Tailscale ACL is the perimeter. Daily open =
  0 clicks after day 1 per device. If SwanGuard ever goes public-facing (Q1 "future users"), only
  the TTL policy changes — no re-architecture.

### Q6: How does the radar read X/Twitter? (handoff open item #7)
- **Recommended:** xAI Live Search API — station gets its own xAI account/key, queries X natively,
  clean ToS, pay-per-use. Non-X collectors (RSS/news/events/venues) ship FIRST — zero credentials.
- **Sean's answer:** ✅ xAI Live Search API (accepted the recommendation).
- **Implication:** Sean owes one signup (xAI account + API key). The key lives on the STATION (its
  token broker), never in a repo, never in Hermes — so Hermes's `banned_providers` and disabled
  `x_search` locks stay untouched; the station calls xAI directly. Needs a daily query budget +
  spend cap from day 1 (see S7). Rule 8 governs xAI like any third party: public news queries only.

## Key Highlights

- **SwanGuard = Personal Intelligence Command Center, Sean-only** (Q1). Civic news is a section.
- **"Up to speed" = merge recovery→main + always-on web/api/db on the 3600 station, Tailscale-only** (Q2).
- **One store:** SwanGuard's DB is THE canonical StoryNode store; radar writes via API, Hermes
  briefing reads top-N from the same API (Q3).
- **The newsroom is the only shell** — the 14-module shell retires; civic cockpit migrates in as a
  section later (Q4).
- **Auth = existing stack + long-lived trusted-device sessions**; Tailscale is the perimeter (Q5).
- **X via xAI Live Search from the station directly** — all three Hermes-side locks stay in place (Q6).
- The handoff's SwanGuard picture was 3 weeks stale — the recovery branch (64 ahead, main only 2
  ahead) supersedes `refactor/shell-rebuild-20260721` as the merge source.

## Architecture Notes (parent / children / whole)

- **The fleet now has four surfaces:** SS-PT (the business product) · Hermes on the 5090 (operator
  brain) · the 3600 station (hands: collectors + browser + SwanGuard hosting) · SwanGuard (the
  intelligence record). **SwanGuard = system of record for "what the world is doing"; Hermes stays
  system of record for "what Sean's systems are doing."** The briefing is where the two meet.
- **Parent surface:** the newsroom shell (`apps/web/src/newsroom/NewsroomShell.tsx`), 3 tabs
  Feed / Sources / Archive.
- **Children:** Feed (ranked StoryNodes), Sources (creator catalog + collector registry), Archive
  (saved evidence), civic cockpit (future migrated section per Q4).
- **Data path:** station collectors → `POST /stories` (apps/api, station-local) → SwanGuard DB →
  (a) newsroom Feed over Tailscale, (b) Hermes briefing `GET /stories/top?n=…` at 06:47.
- **Contract:** `StoryNode` promotes from `apps/web/src/newsroom/` to `packages/contracts` with a
  schema-version field — web, api, and station collectors import one type.

## Suggestions & Enhancements (Phase 2)

- **S1 — Name the ranking brain's home NOW.** The station is "hands, not brain" (station doc), but
  dedupe/rank/summarize wants intelligence. Proposal: station does heuristic rank (recency, source
  weight, keyword match) with zero inference; LLM-grade summarization/clustering delegates to the
  5090's Qwen (private, $0) or a cheap cloud model — public news is PII-free so Rule 8 permits
  either. Never inference on the 3600.
- **S2 — Idempotent ingest or the feed double-fills.** Collectors re-run; `POST /stories` must be
  idempotent on a natural key (canonical URL + published-date hash). Same lesson as the gamification
  idempotency gotcha.
- **S3 — The station writes with a scoped machine token.** POST-only credential minted by SwanGuard
  (Publisher role, short TTL) — the radar can add stories, never read accounts or admin. Mirrors the
  GLM token-broker rule and SwanGuard's own auth stack (Q5 keeps it alive).
- **S4 — Briefing read-state lives in the one store.** The top-N endpoint marks stories delivered so
  the 06:47 briefing never re-briefs yesterday's items. Q3's single store is what makes this free.
- **S5 — Enroll SwanGuard in the Pi watchdog from day 1.** An always-on service nobody health-checks
  is the 25-day-blindness pattern; the station doc already designed the watchdog (its S6) — SwanGuard
  and the ingest pipeline register as monitored endpoints at deploy time, not later.
- **S6 — Civic-section migration is a named slice**, not merge scope (Q4). Keeps the up-to-speed
  merge small and reviewable.
- **S7 — xAI spend needs a cap + a canary.** Daily query budget, cost logged per day, and a weekly
  "known-result" canary query so silent key expiry is caught (the credential-EXPIRY failure mode GLM
  flagged for platform tokens applies to xAI too).

## Minimal-Click Opportunities

- **Open SwanGuard:** desktop launcher today → **1 tap** as a pinned PWA/home-screen icon pointing
  at the Tailscale URL (works phone + desktop; Q5 makes it 0-login).
- **Briefing story → evidence:** every StoryNode in the 06:47 briefing carries a deep link into the
  newsroom's evidence view — read briefing → tap → evidence = **2 taps** (vs. open app, search,
  find: ~4-5).
- **Save from the briefing:** reply "save 3" in the existing Telegram channel (same pattern as the
  station's approval-queue proposal) instead of open app → find → save: **3+ taps → 1 reply**.

## Open Flags

- [ ] Which branch the Render `swanguard-staging-demo` service actually watches (Render dashboard check)
- [ ] Sean: create the xAI account + API key when radar X-collection is ready to wire (Q6)
- [ ] The 2 civic commits on main (`36d1186`, `1d2cd34`) — verify they reconcile cleanly into the
  merge (expected yes; measured "main only 2 ahead")
- [ ] Station hosting stack: `docker-compose.dev.yml` exists — decide compose vs bare node services
  at build time (implementation detail, not a Sean decision)
