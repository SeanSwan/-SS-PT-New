# Video Library → Streaming-Grade Upgrade — FINAL PLAN (2026-06-21)

**Status:** Plan locked. Ready for `swan-orchestrator` → build (Phase 0). Awaiting Sean's go to start coding.
**Owner:** Sean (CEO Orchestrator). **Builder:** Claude (Opus 4.8). **Design lead:** GLM 5.2 (direct consult).
**Companion docs:** `VIDEO-LIBRARY-ENTERPRISE-AUDIT-2026-06-21.md` (audit) · `tmp/glm-video-library-design-output.md` (full GLM visual spec, gitignored/regenerable) · `AI-Village-Documentation/validation-prompts/latest/synthesis.md` (Opus panel synthesis) · `latest/02-architecture-design.md` (file trees).
**Privacy:** IDs/roles only (Rule 8).

---

## 1. How this plan was produced (provenance)

1. **Audit** mapped the live surface: `VideoLibraryV3` → `/api/v2/videos` → `video_catalog` family. Read backend strong; player bare; Coach blind to video; `video_access_grants`/`user_watch_history` built but unsurfaced.
2. **AI Village 15-brain (plan mode)** — $0.67, 16/19 tracks passed. ⚠ Its Phase 2C design debate is **hardcoded to the "Coach Assistant" surface** ([validation-orchestrator.mjs:1376](../../../scripts/validation-orchestrator.mjs#L1376)) and ignored our plan doc — so it designed a chat UI. The **Opus 4.8 synthesis judge caught the mismatch itself** and produced an on-target fused verdict; the on-target Phase-1 analysts (architecture, performance, UX, personas, frontend, data-safety, API, strategic) gave real video-library intelligence.
3. **Recovery: GLM 5.2 direct consult** — $0.05, 37K-char implementation-ready spec for the *correct* surface.
4. **Hostile review (Rule 61)** of GLM's spec — findings in §4.

---

## 2. Locked decisions (Sean, 2026-06-21)

| Decision | Choice |
|---|---|
| Design direction | **"Crystalline Vault"** — dark-luxury sapphire, coaching-first Netflix in Disney+ program rhythm, Crystalline Swan DNA. |
| Build appetite | **Full-stack — every new frontend surface ships WITH its backend in the SAME phase** (Sean 2026-06-21: "if there's new frontend stuff, we will create backend always"). ALL GLM-recommended backend is in scope, not deferred: BFF `GET /api/v2/video-library/home`, `?shelf=continue\|assigned\|personalized` params, `POST`/`DELETE /api/v2/videos/grants` (assign/revoke), `POST /api/v2/videos/recommendations`, `POST /api/v2/videos/my-list` + new `user_video_saves` table, `preview_key` column on `video_catalog`, `POST /api/v2/videos/collections/:slug/complete`. |
| Routes | **Keep current top-level** (`/video-library`, `/watch/:slug`, `/collections/:slug`); add `/my-list`, `/members/videos` alongside. NO nesting migration. |
| Coach video powers | **Read tools now; write (assign/revoke) in Phase 5** behind idempotency keys + `clientAccess` gate + a failing IDOR regression test. |
| Scope | Full streaming experience (browse + watch + collection/program + My List + Member Vault) + Coach/AI seams. |
| Member-Vault pricing | Design surface; **no pricing hard-wired** (reads `billing_tiers` config — deferred billing slice). |
| Theme | Dark default; **must survive all 18 themes** via tokens. |

---

## 3. Architecture backbone (non-negotiable)

- **`PlayerCore.tsx` = the RN-portability seam.** Pure `<video>` wrapper, refs + event handlers only, NO styled-components, NO `document`/`window` in props. Chrome (`CoachingPlayer`) wraps it. On React Native, only this file swaps to `react-native-video`. (Architecture analyst + GLM agree.)
- **`useVideoActions` = the ONE shared path** for assign/recommend/add-to-program. Trainer UI dialogs AND Swan Coach AI tools both call it → both hit the same service (`POST /api/v2/videos/grants`, `/recommendations`, `/collections/:slug/items`). **No third API family.** This is the architectural guarantee behind "the AI sees + manipulates it like every dashboard."
- **Entitlement is server-authoritative.** The signed R2 URL *is* the proof; `GET /watch/:slug` returns 403 + no URL for unauthorized tiers. Client-side gate = UX only (upgrade CTA), never security. Preview clips = **separate truncated `preview_key` assets**, never the full signed URL time-limited client-side.
- **Server state via React Query/TanStack** (panel consensus) — solves multi-shelf fetch, optimistic My List, cache invalidation, continue-watching staleness.
- **BFF home endpoint** `GET /api/v2/video-library/home` collapses the shelf waterfall (Continue Watching fetches on mount; other shelves `IntersectionObserver`-triggered).
- **File budget ≤300 lines** — decomposition per GLM §3 / analyst file trees (`VideoHero/`, `VideoCard/`, `CoachingPlayer/`, `CollectionPage/`, `actions/`, hooks split into data / UI-state / business-logic).

---

## 4. Hostile-review corrections applied to GLM's spec (before build)

1. **TOKEN RECONCILIATION [MEDIUM] — mandatory.** GLM invented a `--ss-*` namespace with generic hex fallbacks (`#3B82F6`, `#D4AF37`, `#F2F6FF`). **Do NOT introduce a parallel token system.** Map GLM's structural model (depth × accent × gold × tier × progress) onto the **existing `UniversalThemeContext` CSS variables**, with fallbacks set to the **real Crystalline Swan palette**: Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0`, Gilded Fern `#C6A84B` (gold — NOT `#D4AF37`), Frost White `#E0ECF4` (text — NOT `#F2F6FF`), Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Obsidian `#0A0A0F` / Carbon `#141419` / Graphite `#1A1A24` (dark surfaces). Dual-Button Glow consumes theme-overridable glow-pair tokens so vivid themes (cyberpunk-edgerunners, ember-realm) swap the pair, not the component. Phase 0 task: produce the token map that reconciles GLM's contract with the live theme vars; verify WCAG 4.5:1 in dark/light/mono + 2 vivid themes.
2. **BACKEND NET-NEW [HIGH] — built IN-PHASE with the frontend (Sean's full-stack directive 2026-06-21):** these do NOT exist yet and are now first-class build items, each shipped in the SAME phase as the UI that consumes it (no deferral): `GET /api/v2/video-library/home` (BFF); `?shelf=continue|assigned|personalized` params; `POST /videos/grants` + `DELETE /videos/grants/:id` (assign/revoke); `POST /videos/recommendations`; `POST /videos/my-list` + a **`user_video_saves` table** (panel-flagged gap); `preview_key` column on `video_catalog` for paywall clips; `POST /collections/:slug/complete` (gamification hook). Each new endpoint follows Rule 8 (zero-PII to LLMs in any Coach-facing path), server-enforced entitlement (§3), and a regression test. Existing reads already available: `GET /api/v2/videos`, `/watch/:slug`, `/collections[/:slug]`, member `/history` + `/:id/progress|track|outbound-click`.
3. **ROUTES [resolved]** — keep top-level per Sean; ignore GLM's `/video-library/*` nesting.
4. **Regulatory (panel, Analyst 12) — track, don't block:** FDA 2026 CDS/wellness disclaimer on coach-assigned content ("not intended to diagnose/treat"); FTC click-to-cancel + AI-washing for Member Vault; WCAG 2.2 audio descriptions + flashing-content (captions alone no longer meet AA). Fold into Phases 2/6.
5. ✅ Clean: styled-components (no MUI), Victory SafeChart, 44px, reduced-motion everywhere, coaching-over-vanity ("Assigned by Coach" shelf above Trending; autoplay-next only within a program).

---

## 5. Phased build order (high-stakes flagged)

> **Full-stack per phase:** each phase ships its frontend surface AND the backend it needs (endpoints/columns/migrations) together — no deferred backend (Sean's directive 2026-06-21). ⚠ Schema migrations (`user_video_saves`, `preview_key`) are **prod-gated** — local dev uses the prod DB, so flag every migration for Sean before running (per the Nutrition 0.3/0.4 precedent).
> 🟢 reversible · 🟡 data-truth/canonical-sensitive · 🔴 entitlement/billing/auth (Tier-B review + tests)

**Phase 0 — Foundation** 🟢🎨: token reconciliation map (§4.1) + CSS var injection per theme; route shells (top-level); `useVideoCatalog`/`useCollection` + types; `VideoCard` + `ContentShelf` + `ShelfSkeleton` (SheenCard geometry).
**Phase 1 — Browse** 🟢🎨: `BillboardHero` (static poster first, then muted autoplay preview desktop ≥1024); shelves (Continue/Trending/New/type rows) on existing reads; `SearchOverlay` + `FacetFilters` + `ExerciseFormFinder`.
**Phase 2 — Player depth** 🟢🎨 (high-visibility): `PlayerCore` (pure `<video>` seam) → `CoachingPlayer` chrome (play/scrub/speed/CC/PiP/fullscreen) → **LOOP** ⭐ (A→B + repeat, default ON for `content_type=exercise`) → `ChapterRail` (5-beat) → `CaptionRenderer` → `AutoplayNext`.
**Phase 3 — Continue Watching + progress** 🟡🔴 (auth/member state): `useWatchHistory` + `useWatchProgress` (throttled POST) + resume `/watch/:slug?t=`; *backend slice:* `?shelf=continue` / BFF home.
**Phase 4 — Collections/Programs** 🟢🎨: `CollectionPage` + `ProgramHero` + `EpisodeList` + completion % + badge hook + within-collection autoplay-next.
**Phase 5 — Coach seam + Assign** 🔴 (entitlement writes): `useVideoActions` (single path) → `AssignToClientDialog`/`AddToProgramDialog`/`RecommendForExercise` → "Assigned by your Coach" shelf → register Coach AI tools (`view_video_catalog`, `search_videos_by_exercise` = read now; `assign_video_to_client`, `recommend_video_for_exercise` = write here). *Gate:* idempotency keys, `clientAccess` scope, **failing IDOR regression test first** (trainer cannot grant outside assigned clients), Tier-B review.
**Phase 6 — My List + Member Vault** 🔴 (billing boundary): My List (optimistic + `user_video_saves` sync) + Member Vault surface + preview clips (separate `preview_key`, no full-URL leak) + upgrade banner (reads `billing_tiers`, no hard-wired pricing) + outbound-click tracking.
**Phase 7 — Personalization + Analytics + polish** 🟢🟡: "Because you trained [muscle]" shelf; admin compliance analytics (Victory SafeChart, real `user_watch_history`); aurora particles + motion polish.

Each phase: `swan-design-router` for visual surfaces, slice-internal hostile review (Rule 61), Tier-A verification, triangle fusion review on the high-stakes 🔴 slices.

---

## 6. Separate slice (not bundled — Rule 37)

**Fix the orchestrator's hardcoded debate prompts.** `validation-orchestrator.mjs` Phase 2C design debate (`:1372-1391`) and Phase 2A security debate (`:1325`) are hardcoded to the "Coach Assistant" task and ignore the plan document — so every planning run mis-designs. Fix: parameterize these prompts to consume `planContent`/`opts.document` like the Phase-1 planning tracks do. Also: `latest/` accumulates stale files across runs (today's = 09:39; old 12:18/20:27 leftovers) — propose a per-run clean or timestamped subdir. Both are infra fixes; propose to Sean, don't auto-apply mid-build. Candidate for `skill-harvest`/`auto-research`.

---

## 7. Next slice

**Phase 0 — Foundation** (token reconciliation + shells + VideoCard/ContentShelf). It's reversible, unblocks every later phase, and the token map is the gate that makes the whole thing survive all 18 themes. Route through `swan-orchestrator` → `swan-design-router` on Sean's go.
