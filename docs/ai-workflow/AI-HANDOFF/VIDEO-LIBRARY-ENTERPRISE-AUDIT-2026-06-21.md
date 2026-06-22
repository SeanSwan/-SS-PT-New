# SwanStudios Video Library — Consolidated Enterprise Audit (2026-06-21)

**Auditor:** Lead consolidation pass over 5 parallel maps (A frontend, B backend, C coach/AI, D vision, E AAA benchmark). All cross-map contradictions resolved against live code with file:line evidence per Rule 26. Verification commands and reads were run in-session; claims carry confidence tags (Rule 51).

**Status:** Decision-ready. Seeds the Sean requirements interview (`grill-me`, Rule 64) → `swan-orchestrator` → `swan-design-router` → build → `closeout-evidence-lock`.

**Trigger:** Sean 2026-06-21 — "audit the video library tab + Swan Studios app, upgrade/enhance to enterprise-level AAA, tied into the SwanStudios vision (not generic), useful for me + clients, interconnected with the app and the AI hive-mind/Coach so the AI can see and manipulate it like every other dashboard."

---

## 1. EXECUTIVE SUMMARY (plain-English)

SwanStudios has **two separate video systems**, and the maps disagreed about which one is "live" — that was the single most important thing to settle. The **canonical, production-reachable** Video Library is the **V2-era "video catalog" system**: a public page at `/video-library` (`VideoLibraryV3.tsx`) that calls `/api/v2/videos`, backed by the `video_catalog` family of tables (catalog, collections, access-grants, watch-history, outbound-clicks, job-log). This system is **genuinely live and unusually complete on the backend** — full admin CRUD, two-phase R2 uploads with checksum verification, YouTube import, a real entitlement engine (public/members_only/unlisted × free/member/premium + per-user grants), signed-URL playback, and analytics tables. The **older "exercise-library" system** (`/api/admin/exercise-library` → `exercise_videos`/`exercise_library`, the legacy NASM library) is **legacy**: still mounted at the backend, but its admin UI was archived 2026-05-17 (`AdminVideoLibrary.tsx`). The biggest **opportunity** is not the backend — it is that the rich backend is barely surfaced: the player is a bare HTML5 element (no chapters/captions/loop/speed despite the schema being ready), the **trainer "assign video to client" workflow does not exist** (the `VideoAccessGrant` table is built but no write path uses it), and **Swan Coach is completely blind to video** — there are zero video commands in the AI command registry, so the AI brain cannot search, recommend, or assign a single video. The single highest-leverage move: **wire the existing entitlement schema to a trainer/Coach "assign + recommend video" loop**, because that converts already-built infrastructure into the coaching-amplification value the vision promises with near-zero new data model.

---

## 2. CANONICAL SURFACE RECEIPT (Rule 26)

**The proven-live public Video Library surface — full chain:**

| Layer | Evidence (file:line) | Proof type |
|---|---|---|
| (a) Route mount | `frontend/src/routes/main-routes.tsx:404-412` — `path: 'video-library'` → `<VideoLibrary />` inside `<Suspense>` | **JSX-mounted** `[VERIFIED]` |
| (b) Lazy binding | `main-routes.tsx:106-111` — `VideoLibrary = lazyLoadWithErrorHandling(() => import('../pages/VideoLibraryV3'), 'Video Library V3', () => import('../pages/VideoLibraryV2'))` | V3 primary, V2 fallback `[VERIFIED]` |
| (b') Page component | `frontend/src/pages/VideoLibraryV3.tsx` — default export; ParallaxHero + sticky search + grid + pagination + collections | rendered JSX `[VERIFIED]` |
| (c) Consumer hook | `VideoLibraryV3.tsx:48-104` inline `fetchVideos` / `fetchCollections` via `apiService.get(...)` | `[VERIFIED]` |
| (d) Frontend API path | `VideoLibraryV3.logic.ts:127-137` — `buildVideoListPath()` → `` `/api/v2/videos?${params}` ``; collections → `'/api/v2/videos/collections?limit=6'` | **exact literal** `[VERIFIED]` |
| (e) Backend mount | `backend/core/routes.mjs:311` — `app.use('/api/v2/videos', videoCatalogPublicRoutes)` | `[VERIFIED]` |
| (e') Route handler | `backend/routes/videoCatalogPublicRoutes.mjs:11-17` — `router.use(optionalAuth)`; `GET /`, `/watch/:slug`, `/collections`, `/collections/:slug` | `[VERIFIED]` |
| (f) Controller | `backend/controllers/videoCatalogPublicController.mjs` — `browseVideos`, `watchVideo`, `browseCollections`, `getCollection` | `[VERIFIED]` |
| (g) Model | `backend/models/VideoCatalog.mjs` — `creatorId` is `INTEGER`, `field: 'creator_id'`, FK to `"Users"` (capital U) at `:216-221` | **quoted from model** `[VERIFIED]` |

**Support surfaces (also canonical):** `/watch/:slug` → `VideoWatch.tsx`; `/collections/:slug` → `CollectionDetail.tsx`; `/members/videos` → `MembersVault` (protected).

**Claim-to-Evidence lock:** This proves the **public-browse** surface end-to-end. It does NOT prove the player feature-set works (player is basic HTML5), nor that the catalog holds real data (see §10 — backfill is a separate gate).

---

## 3. SURFACE CLASSIFICATION TABLE (Rule 27)

> Physical cleanup is a **separate, Sean-approved pass per Rule 34** — nothing below is "safe to delete"; dispositions are recommendations pending a Phase-2 reference check.

### Frontend page surfaces

| Surface | File:line | Class | URL | Disposition |
|---|---|---|---|---|
| **VideoLibraryV3** | `pages/VideoLibraryV3.tsx`; `main-routes.tsx:108,409` | **CANONICAL** | `/video-library` | KEEP — primary |
| **VideoLibraryV2** | `pages/VideoLibraryV2.tsx`; `main-routes.tsx:110` | **DORMANT (error fallback)** | `/video-library` if V3 import fails | KEEP fallback or retire later |
| **VideoLibrary (V1)** | `pages/VideoLibrary.tsx` | **LEGACY** | none | RETIRE candidate (pending import grep) |
| **VideoWatch** | `pages/VideoWatch.tsx`; `main-routes.tsx:415-422` | **CANONICAL (support)** | `/watch/:slug` | KEEP |
| **CollectionDetail** | `pages/CollectionDetail.tsx`; `main-routes.tsx:424-432` | **CANONICAL (support)** | `/collections/:slug` | KEEP |
| **MembersVault** | `main-routes.tsx:434-439` | **CANONICAL (support)** | `/members/videos` | KEEP |
| **VideoLibraryPage** (dashboard alias) | `UniversalDashboardLayout.routes.tsx:71,151` → `import('../../pages/VideoLibraryV3')` | **CANONICAL (re-mount of V3)** | `/dashboard/trainer/videos` | KEEP |
| **TrainerVideosPage** | `DashBoard/Pages/trainer-dashboard/TrainerVideosPage.tsx` | **COMPETING/AMBIGUOUS** | route table aliases this path to V3 | **RESOLVE before trainer-video UI work** |
| **AdminVideoLibrary / VideoLibraryTest** | `archive/pending-deletion/2026-05-17/...` | **LEGACY / ARCHIVED** | none | already archived |

**Open contradiction:** the trainer dashboard route binds `/dashboard/trainer/videos` to `VideoLibraryPage` (=V3 alias), but `TrainerVideosPage.tsx` exists as if it serves the same path. `[HYPOTHESIS]` TrainerVideosPage is dormant and the trainer route renders V3. **Settle by** reading `UniversalDashboardLayout.routes.tsx:140-155` + grepping `TrainerVideosPage` for a JSX mount **before** building any trainer-video feature (Rule 26 failure mode otherwise).

### Backend route surfaces

| Surface | Mount | Class | Tables | Disposition |
|---|---|---|---|---|
| `videoCatalogPublicRoutes` | `routes.mjs:311` `/api/v2/videos` | **CANONICAL** | `video_catalog`, `video_collections` | KEEP |
| `videoCatalogMemberRoutes` | `:312` `/api/v2/videos` | **CANONICAL** | `user_watch_history`, `video_outbound_clicks` | KEEP |
| `videoCatalogRoutes` (admin) | `:313` `/api/v2/admin/videos` | **CANONICAL** | `video_catalog` | KEEP |
| `youtubeImportRoutes` | `:314` `/api/v2/admin/youtube` | **CANONICAL** | `video_catalog`, `video_job_log` | KEEP |
| `videoAnalyticsRoutes` | `:315` `/api/v2/admin/video-analytics` | **CANONICAL** | analytics | KEEP |
| `videoCollectionRoutes` | `:316` `/api/v2/admin/collections` | **CANONICAL** | collections + items | KEEP |
| `publicVideoRoutes` | `:319` `/api/videos` | **LEGACY** | `exercise_videos` | RETIRE candidate (pending grep) |
| `videoLibraryRoutes` | `:438` `/api/admin/exercise-library` | **LEGACY** | `exercise_videos`, `exercise_library` | RETIRE candidate — admin UI archived |
| `videoSessionRoutes` | `:452` `/api/video-sessions` | **CANONICAL (different product)** | `video_sessions` (LiveKit) | KEEP — NOT the library; do not merge |

**Route-shadow resolution `[VERIFIED]`:** lines 311-312 mount two routers on the same `/api/v2/videos`. No shadow — the public router defines only `GET /`, `/watch/:slug`, `/collections*`, `POST /:id/refresh-url`; member sub-paths (`/members`, `/history`, `/:id/progress|track|outbound-click`) fall through correctly. Mount order is safe.

**Map A vs Map D contradiction — RESOLVED.** Two different backends. The live public page calls `/api/v2/videos` → `video_catalog`, NOT `/api/admin/exercise-library` → `exercise_videos`. The legacy exercise-library system was documented (in `VIDEO-LIBRARY-COMPLETE-STATUS.md`) as if it were the live vision target; it is retired. The exercise tie-in is re-implemented in the new system via `video_catalog.exercise_id` (`VideoCatalog.mjs:210-215`). **"Every exercise needs a form video" must target `video_catalog.exercise_id`, not legacy `exercise_videos`.**

---

## 4. CURRENT CAPABILITY INVENTORY

### Authoritative data model (real columns, quoted per Rule 29)

**`video_catalog`** (`VideoCatalog.mjs`, paranoid): `id`(UUID), `title`, `slug`(partial-unique), `description`, `long_description`, `content_type`(ENUM exercise|tutorial|behind_scenes|vlog|testimonial|course_lesson), `source`(upload|youtube), `visibility`(public|members_only|unlisted), `access_tier`(free|member|premium), `status`(draft|published|archived), `youtube_video_id/channel_id/cta_strategy/playlist_url`, `hosted_key`(R2), `file_size_bytes`, `file_checksum_sha256`, `thumbnail_key/url`, `poster_key`, `duration_seconds`, `captions_key`(VTT), `hls_manifest_url`, `tags`(JSONB GIN), `chapters`(JSONB `[{time,title}]`), `seo_title/description`, `view_count`, `like_count`, **`exercise_id`(UUID FK→exercise_library) `:210-215`**, **`creator_id`(INTEGER FK→"Users") `:216-221`**, `published_at`, `featured`, `sort_order`, `metadata_completed`(publish gate), `upload_mode`(A/B immutable via PG trigger), `declared_checksum`(immutable), `pending_object_key`, `legacy_import`, timestamps + `deleted_at`.

**`video_collections`**: id, title, slug, description, `type`(playlist|series|course), visibility, access_tier, thumbnail_key, creator_id, sort_order.
**`video_collection_items`**: collection_id, video_id, sort_order, added_at (M:N).
**`video_access_grants`**: user_id, video_id XOR collection_id, `grant_type`(role_based|individual|purchase), `grant_status`(active|expired|revoked), granted_by, expires_at, revoked_at. ← **entitlement substrate for "assign to client."**
**`user_watch_history`**: user_id, video_id, progress_seconds, completion_pct, completed, last_watched_at.
**`video_outbound_clicks`**: video_id, user_id(nullable), `click_type`(watch_on_youtube|subscribe|playlist|channel), clicked_at, session_id.
**`video_job_log`**: `job_type`(youtube_import|youtube_sync|analytics_rollup|backfill|checksum_verify|draft_cleanup), status, payload/result(JSONB).
**`video_sessions`**: LiveKit remote-assessment — **separate product.**

### What works today

**Backend (high completeness):** public browse/watch (entitlement-gated signed URLs, probing-resistant 404s, `refresh-url` rate-limited 10/hr); admin catalog CRUD; two-phase R2 upload (Mode A checksum / Mode B fallback → HEAD verify → atomic bind; immutable trust-fields via PG trigger); YouTube single + playlist import (BullMQ); collections CRUD + reorder; entitlement engine (`videoEntitlementService.mjs:99-177`: status → public/free → unlisted/member → members_only role + premium grant check); analytics tables + endpoints (some aggregations stubbed).

**Frontend (partial — display works, depth missing):** V3 browse (parallax hero, sticky search, content-type filter, 20/page pagination, 6-collection showcase, skeleton/empty/error, locked + duration badges, lazy images, WCAG focus, reduced-motion, mobile stack ≤430px); watch page (HTML5/YouTube player, member-gate banner, progress save, related videos, JSON-LD). **Player is bare `<video controls>`** — no chapter UI, caption render, speed, loop, PiP, auto-next, despite schema readiness.

---

## 5. COACH / AI HIVE-MIND INTEGRATION

**How the AI acts today:** `commandExecutor.mjs` → `intentClassifier` → `commandRegistry/*` (Zod-schema'd defs) → `commandDispatcher.mjs` `DISPATCHERS` map (`:212-320`, 100+ commands) → handler → DB. Fail-closed `clientAccess.mjs` scopes reads (admin→any; trainer→assigned/session-history; user→self). `deIdentifier.mjs` maps names→`Client-{id}` server-side. Domains: workout, measurement, nutrition, pain, coach-intake, schedule, availability, briefs, admin/BI, gamification, goals, onboarding, social moderation.

**The video gap — `[VERIFIED]`:** grep of `backend/services/ai/commandRegistry/` for video/library = **0 matches.** Coach cannot see, search, recommend, or assign any video. The data plane + entitlement engine already exist; only the AI tool surface is missing. This is the most self-contained build opportunity in the audit.

**Proposed video tool surface** (reuse existing `/api/v2/...` controllers; apply `clientAccess` + de-identifier; IDs only, Rule 8):

**Read tools (ship first, no destructive risk):**
1. `view_video_catalog` → `GET /api/v2/videos?contentType=&status=published`
2. `search_videos_by_exercise` → `video_catalog` JOIN `exercise_id` (NEW FK, not legacy)
3. `view_video_collections` → `GET /api/v2/videos/collections`
4. `view_client_video_entitlements` → `video_access_grants WHERE user_id=:clientId AND grant_status='active'` — **return count + tier only, never titles tied to a named client** (Rule 8)
5. `view_video_analytics` → per-video viewCount/completion (admin/trainer)

**Write tools (destructive → `requiresConfirmation`, role-gated, idempotency-keyed):**
6. `assign_video_to_client` → create `video_access_grant`; admin/trainer + `clientAccess` gate; check partial-unique index
7. `revoke_video_access` → set `grant_status='revoked'`
8. `recommend_video_for_exercise` → rank by `exercise_id` + focus, top-N + justification
9. (later) `create_video_collection_for_client`, `add_video_to_collection`

**Context-engine:** add a `videoEntitlements` loader to `coachContextEngine.mjs` (counts + highest tier only) so "what should I assign next?" is answerable.

---

## 6. GAP ANALYSIS vs ENTERPRISE-AAA

✅ have · ◐ partial · ✗ missing

| Domain | Capability | Status | Priority | SwanStudios value |
|---|---|---|---|---|
| **Content model** | Catalog, content-types, multi-source, draft/publish/archive, visibility×tier | ✅ | table-stakes | Strong foundation |
| | Collections (playlist/series/course) | ✅ | differentiator | Coaching programs/series |
| | Chapters (5-beat teaching rhythm) | ◐ schema/✗ player | differentiator | Setup→Action→Signature→Proof→Reset jumps |
| | Exercise→video link | ◐ | table-stakes | "Watch form" inline in workout |
| **Discovery** | Content-type/tag filter, featured sort | ✅ | table-stakes | Browse works |
| | Full-text + faceted search | ✗ | differentiator | "find shoulder-pain exercise" |
| | Continue-watching / recommendations | ◐ tracked/✗ surfaced | differentiator | Adherence loop |
| **Player** | HTML5 + YouTube + signed-URL R2 | ✅ | table-stakes | Plays |
| | Captions, chapters nav, speed, **loop**, PiP, auto-next | ✗ | differentiator | **Loop critical for form drills** |
| | HLS adaptive | ✗ | advanced | Scale-time |
| **Engagement** | Like/save, ratings, comments | ✗ | differentiator | Social proof |
| | Share / progress-proof cards | ◐ | differentiator | **Organic acquisition** |
| **Personalization** | Coach-assigns-video, role grants, expiry | ◐ **schema/✗ workflow** | **differentiator #1** | Core coaching amplification — biggest gap-vs-value |
| | Course progression gating, badge-on-completion | ✗ | differentiator | Programs that unlock |
| **Monetization** | Free/member/premium gating, grants, revoke | ✅ engine/◐ UI | table-stakes (**high-stakes**) | Member-vault $9.99 lane |
| | Preview-clip paywall, purchase, gifting | ✗ | advanced | Future upsell |
| **Admin** | 2-phase upload+checksum, YouTube import, publish | ✅ backend/◐ UI | table-stakes | Content ops |
| | Scheduled/bulk publish, versioning | ✗ | advanced | Cadence ops |
| **Analytics** | Total/top views, outbound CTR, job health | ✅ (some stubs) | table-stakes | Proof-of-value |
| | Completion rate, drop-off, per-client watch, funnel | ◐ data/✗ agg+UI | differentiator | Retention truth |
| **Distribution** | YouTube CTA + click tracking, JSON-LD SEO | ✅ | differentiator | Funnel: YouTube→member |
| | Social share, video sitemap, OG tags | ✗ | differentiator | Acquisition |
| **AI layer** | Coach video read/assign/recommend tools | ✗ **ALL missing** | **differentiator #2** | Dictation-first assignment |
| | Auto-caption, auto-chapter, semantic search | ✗ | advanced | Phase 5+ |
| **Infra** | R2 + signed URLs + BullMQ jobs | ✅ | table-stakes | Solid |
| **Mobile** | Responsive player/browse | ◐ | table-stakes | Daily-use surface |
| | RN parity / offline download | ✗ | advanced | App Store roadmap |

**Highest value × already-built:** Personalization (Coach-assign) + AI layer — both ride existing schema. Cheapest paths to the vision's coaching amplification.

---

## 7. VISION ALIGNMENT

The Video Library is **not** generic hosting — it is the **coaching bridge**, serving the core loop (log → save → progress proof → next best action → shareable) at four touchpoints: (1) **form reference** inline in the workout plan via `video_catalog.exercise_id`; (2) **Content-Studio output** feeding the YouTube→member-vault funnel; (3) **progress-proof clips** as one-tap shareable acquisition; (4) **adherence analytics** (completion %) proving coaching effectiveness.

- **Client:** form video ≤1 tap from the exercise in Train; "watch what coach assigned" row (needs grant write path).
- **Trainer:** assign/curate **by voice** ("add the squat form video to the client's next leg day") — needs Coach write tools + assign workflow. Today: impossible.
- **Admin:** seed/approve/publish, watch analytics, push member-vault content, answer "which videos drive compliance?" — endpoints exist, dashboards thin.
- **Monetization funnel:** free public/YouTube → Guardian (donation) → Crystalline ($24.99) + optional Member Vault (+$9.99 R2 playlists) → 1:1 PT. Entitlement engine already encodes `free|member|premium` × grants → funnel is **enforceable today**; needs purchase/gift UI + vault polish. **High-stakes (billing/authz).**

---

## 8. RECOMMENDED ENHANCEMENT ROADMAP

Ordered by **value × reversibility**. 🟢 reversible/low-risk · 🟡 data-truth/canonical-sensitive · 🔴 entitlement/billing/auth (high-stakes, Tier-B+ review) · 🎨 needs `swan-design-router`.

### NOW
1. 🟢 **Coach video READ tools** (`view_video_catalog`, `search_videos_by_exercise`, `view_video_collections`) — pure reads over `/api/v2/...`; makes Coach video-aware immediately.
2. 🟡 **Resolve TrainerVideosPage vs VideoLibraryPage ambiguity** (§3) before any trainer-video UI — one grep + one route read.
3. 🟢🎨 **"Continue Watching" + locked-badge polish** on V3 (schema live; frontend-only).
4. 🟢🎨 **Player depth pass: loop + speed + caption render + chapter nav** — schema ready; biggest UX win for a coaching product (loop = form drills).

### NEXT (core differentiators — ride existing schema)
5. 🔴 **Trainer "Assign Video to Client" workflow** + `assign_video_to_client`/`revoke_video_access` Coach tools. Touches `video_access_grants` → idempotency keys, `clientAccess` gate, Tier-B review, failing IDOR regression test (trainer cannot grant outside assigned clients). **#1 value move.**
6. 🟡 **`recommend_video_for_exercise`** + context-engine `videoEntitlements` loader (counts only, Rule 8).
7. 🔴🎨 **Member Vault surface + purchase/gift entry** — only after entitlement edge cases tested; billing-adjacent.
8. 🟡 **Completion-rate / per-client watch analytics + admin dashboard** (Victory, real `user_watch_history`).

### LATER (advanced / scale-time)
9. Full-text + semantic search; auto-caption/auto-chapter (Deepgram); HLS transcode + dead-letter queue; course-progression gating + badge-on-completion; social share + video sitemap/OG; RN parity + offline.
10. 🟡 **Legacy retirement pass (separate Rule-34 approved cleanup):** propose retiring `videoLibraryRoutes`/`publicVideoRoutes`/`exercise_videos` + `VideoLibrary.tsx` after a consumer grep — its own approved pass, never bundled (Rule 37).

---

## 9. OPEN QUESTIONS FOR SEAN

1. **Exercise↔video tie:** confirm canonical link is `video_catalog.exercise_id` (new) and legacy `exercise_videos`/`exercise_library` is to be retired.
2. **Coach manipulation rights:** read-only first (search/recommend) or full assign/revoke from day one? Trainer-scoped only, or admin too?
3. **Member Vault monetization:** separate +$9.99 SKU or folded into Crystalline $24.99? Does `access_tier='premium'` map to a Stripe product; who issues `purchase` grants (webhook or admin)?
4. **Which V is canonical long-term:** keep V2 as error fallback; retire V1 now?
5. **Player priority:** loop/chapters/captions player pass before the assign workflow?
6. **Content source-of-truth:** is the live catalog populated, or does `backfill-video-catalog.mjs` still need a CONFIRM run?
7. **Trainer upload rights:** can trainers upload/publish, or admin-only?
8. **Progress-proof sharing:** is one-tap shareable PR/transformation clips a library feature or social-feed?

---

## 10. RISKS / CONSTRAINTS

- **Privacy (Rule 8) — high:** Coach tools reading `video_access_grants` per client must return **counts/tiers, not titles bound to a named client**, via `deIdentifier.mjs`. Titles/exercise names are content (safe); *who* is entitled is PII-adjacent.
- **Entitlement/authz — high:** assign/revoke touches the access-control plane. Needs failing regression test (trainer-scope isolation / no IDOR), idempotency keys, Tier-B review.
- **Schema drift (Rule 58) — medium:** `creator_id` is **INTEGER** FK to `"Users"` (capital U) `[VERIFIED]` `VideoCatalog.mjs:216-221`. Any caller treating it as UUID, or referencing lowercase `users`, breaks (dual-table gotcha).
- **Competing-surface cleanup (Rules 27/34/37) — medium:** three video backends + three frontend V's coexist. Resolve §3 ambiguity before new features. Cleanup is a separate approved pass.
- **Data-truth (Core Loop) — medium:** confirm `video_catalog` has real rows before claiming "works"; empty catalog renders an empty page that looks broken.
- **Mobile/RN — low now:** player rebuilds should stay RN-portable; `hosted_key` supports future offline.
- **Map D caveat:** treat Map D as vision/intent, not a surface receipt — its "live" claims describe the retired exercise-library system.

---

**Next slice:** Coach video READ tools (§8 slice 1) — highest value-per-risk. Settle Open Questions 1-2 first (they scope it). Route the build through `grill-me` → `swan-orchestrator` before any code.
