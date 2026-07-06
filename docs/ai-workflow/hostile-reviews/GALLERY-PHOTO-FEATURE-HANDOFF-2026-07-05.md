# Gallery / Photography Deals Feature — Handoff & Hostile-Review Tracker (2026-07-05)

> **Purpose:** any AI or human picking this up sees, in one file: (1) what SHIPPED, (2) what needs HOSTILE REVIEW, (3) EVERY remaining slice to FINISH the feature, and (4) a ready-to-paste prompt to continue. Filed in `hostile-reviews/` so we come back, review, fix, and finish.
> **Feature:** the photoshoot "deals" gallery — admin uploads passcode-protected event galleries; clients unlock with email + passcode, view + download their shoot; future: buy prints. (Distinct from the client progress-photo manager and the user creative galleries — see §2.)
> **Owner:** Sean. **Built by:** Claude Opus 4.8 (VS-Claude), 2026-07-05. **Last verified commit:** origin/main `63deeb0da`.

---

## 0. TL;DR STATUS
- ✅ **SHIPPED** to `origin/main @ 63deeb0da` (Render auto-deploying): **Slice 1** (admin Photo Gallery Studio) + **Slice 2** (batch "download all" ZIP).
- 🔍 **NEEDS HOSTILE REVIEW:** Codex review of slices 1+2 (REQs open in `.ai-workflow/coordination/review-queue.md`, targeting `9670eeb83` / `63deeb0da`) + the residual-risk list in §3.
- 🏗️ **REMAINING TO FINISH:** **Slice 3** — selling prints via **Prodigi drop-ship**. 6 sub-slices, plan free-triangle-approved, **NOT built**. Full spec: [`AI-HANDOFF/GALLERY-PRINT-FULFILLMENT-SLICE-3-PLAN-2026-07-05.md`](../AI-HANDOFF/GALLERY-PRINT-FULFILLMENT-SLICE-3-PLAN-2026-07-05.md).
- ⚠️ **ENVIRONMENT TRAP (READ FIRST):** the shared checkout `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT` is on branch **`wip/comms-notifications-2026-07-05`** — **132 commits behind `origin/main`, with 762 files staged** (the whole comms/notifications/challenges/messaging workstream, NOT gallery work). **DO NOT `git add`/commit from that checkout.** Work in a clean git worktree off `origin/main` (see §6). This trap was independently hit by two Claude sessions on 2026-07-05.

---

## 1. WHAT SHIPPED (Slices 1+2 @ 63deeb0da)

**Slice 1 — `9670eeb83` `feat(admin-gallery): restore Photo Gallery Studio`**
- Rebuilt the archived admin photoshoot-upload UI (the old `AdminGalleryManager` had been archived + orphaned). 16 new files under `frontend/src/components/DashBoard/Pages/admin-gallery/` (all ≤300 lines): `AdminGalleryStudio.tsx` (shell) + 3 hooks (`useGalleryEvents`, `useGalleryUpload`, `useEventPhotos`) + 9 components (StorageBanner, GalleryStatsRow, CreateEventForm, ToggleField, EventList, PhotoUploader, EventPhotoGrid, Lightbox, ConfirmModal) + `adminGalleryApi.ts`, `types.ts`, `styles.ts`.
- Mounted at **`/dashboard/admin/gallery`** (route in `UniversalDashboardLayout.routes.tsx` + lazy in `routeComponents.tsx`) + sidebar nav (`dashboard-tabs.ts` WORKSPACE_CONFIG `photo-gallery`, `Camera` icon in `AdminStellarSidebar.tsx`).
- Consumes the **already-live** `/api/admin/gallery/*` backend (unchanged). Upload = `POST /events/:id/upload-single`, one photo at a time via `apiService` (axios) with live progress, cancel (AbortController), retry-failed, watermark toggle. Grid uses `thumbnailUrl`; lightbox uses `url`.

**Slice 2 — `63deeb0da` `feat(gallery): batch download-all as a streamed ZIP`**
- Backend `GET /api/gallery/events/:slug/download-all` (`backend/routes/galleryRoutes.mjs`): `requireGalleryAccess` + dedicated per-visitor `downloadAllLimiter` (15/hr); `archiver` streaming zip **one R2 object at a time** (flat memory on Render); `store:true`; **all JSON guards before the zip headers**; teardown on client-disconnect + archive-error; collision-safe number-prefixed entry names. Serves the same **watermarked** `storage_key` bytes the single-download serves.
- Frontend "Download all N photos (ZIP)" button on `GalleryPage.tsx` — direct-nav with `?token=` so the browser streams to disk (no tab OOM on large galleries).
- Added dep `archiver ^8.0.0` (`backend/package.json` + lock). New test `backend/tests/api/galleryDownloadAllRouteContract.test.mjs`.

**Verification (on current main, worktree):** frontend `tsc` 0 errors (8 GB heap = the project's `type-check` config), `vite build` OK, backend `node --check` OK, contract test **8/8**, diff clean, secret scan CLEAN.

**Deploy probe (run once Render finishes):** `curl -s -o /dev/null -w "%{http_code}" https://sswanstudios.com/api/gallery/events/probe/download-all` → **401** = live-and-mounted (auth rejects the tokenless probe); **404** = not deployed yet.

---

## 2. THE FEATURE MAP (do not conflate these 3 surfaces)
1. **Public deals gallery** — `GalleryPage.tsx` at `/gallery` + `/gallery/:slug`. Visitor enters email + event password → 24h `gallery_access` JWT → views + downloads. Backend `/api/gallery/*`. **← this is "the deals photography tab."**
2. **Admin Photo Gallery Studio** — `/dashboard/admin/gallery` (Slice 1). Create events + passcodes, upload shoots. Backend `/api/admin/gallery/*` (admin OR trainer).
3. **Client progress-photo manager** — `PhotoManager` at `/dashboard/admin/photos`. A DIFFERENT feature (before/after body photos keyed by clientId). Backend `/api/photos/*`. Not part of the deals gallery.

Storage: Cloudflare R2 (`R2_BUCKET_NAME`), watermarked on upload; `GalleryPhoto.storage_key` = `gallery/{slug}/{n}.jpg`. Served as public URL (if `R2_PUBLIC_URL` set) or a backend proxy → 1h signed URL.

---

## 3. HOSTILE-REVIEW ITEMS (review + verify these)
1. **Codex REQs open** (review-queue): slice-1 (admin studio) + slice-2 (download-all). Shipped before Codex reviewed (Sean's call). Review against `9670eeb83` / `63deeb0da`.
2. **serve-photo proxy is not JWT-gated** — `backend/core/routes.mjs:582` (gallery proxy) 302-redirects to a signed R2 URL WITHOUT re-checking the gallery access token. Image bytes are reachable by anyone who knows the `gallery/{slug}/{file}.jpg` path; **watermark is the only protection**. Confirm acceptable for a paid/gated gallery, or gate it.
3. **admin gallery routes allow `trainer`** — `adminGalleryRoutes.mjs:40-45` gates on role `admin` OR `trainer` despite the header saying admin-only. Intended?
4. **download-all streaming success path is NOT live-tested** — no R2 in local dev; the contract test is source-level only. Needs a real staging probe (valid token → actual zip) before trusting it at scale (Rule 55).
5. **downloads are watermarked** — `download-all` + single-download serve the watermarked `storage_key`. Correct for previews; the PRINT path (Slice 3) needs **un-watermarked masters** (§4, 3a).
6. **`bulk-delete` backend route is shadowed** — `adminGalleryRoutes.mjs:1700` is registered after `/photos/:photoId:1360`, so it never matches. The admin studio deletes per-photo in a loop instead. A backend route-order fix is a separate cleanup (do NOT rely on `bulk-delete`).
7. **PATCH `/events/:id` echoes `password_hash`** (`adminGalleryRoutes.mjs:166`). The admin API layer is typed to omit it; confirm the UI never reads/renders it.

---

## 4. REMAINING SLICES TO FINISH — Slice 3: Prodigi drop-ship prints

**Decisions LOCKED by Sean (2026-07-05):** Prodigi drop-ship · **un-watermarked masters = NEW GALLERIES ONLY** (existing galleries re-upload to sell prints) · **refund = MANUAL admin action for v1**.

**What already exists (dormant):** `PrintOrder` model + migration + tests; `/api/gallery/print-*` routes (catalog + Stripe checkout create with `metadata.type='print_order'`); `PrintStore.tsx` (unreachable — the gallery's "Order prints" card is a disabled "Coming Soon").
**What's missing:** the Stripe webhook `print_order` case (orders never leave `pending`), Prodigi fulfillment, admin fulfillment view, tax, un-watermarked masters.

Build order (each sub-slice = build → slice-internal hostile review → Codex review; 3b/3c/3e are high-stakes billing):
- **3a — un-watermarked master pipeline** *(prerequisite; touches the Slice-1 admin uploader)*: on upload, ALSO PUT an un-watermarked original to a PRIVATE R2 path (e.g. `gallery-originals/{slug}/{n}.jpg`) never served to the public gallery/zip; add `GalleryPhoto.originalStorageKey` (+ migration). New-galleries-only.
- **3b — Stripe webhook money-loop** *(high-stakes)*: add `metadata.type==='print_order'` to `stripeWebhook.mjs` — signature-verified, **ATOMIC idempotency** (compare-and-set / SELECT…FOR UPDATE on `printProviderOrderId`, NOT read-then-write), `pending→paid` + `paidAt`, fail-closed. Mark paid FIRST, then trigger 3c separately.
- **3c — Prodigi fulfillment**: on `paid` (and only if `printProviderOrderId` null), submit order + the un-watermarked master (delivered via **short-lived signed R2 URL**, never public) to Prodigi's REST API; store `printProviderOrderId`; consume Prodigi's status webhook → `processing→shipped` + `trackingNumber`. Prodigi 4xx/5xx → keep order `paid`, surface in admin view, allow retry.
- **3d — admin fulfillment view**: admin route(s) on `adminGalleryRoutes.mjs` + UI (Gemini `StatusBadge` spec, tokenized to `var(--token,#hex)`) to list/track/retry/mark-shipped/**refund** print orders. Register `PrintOrder` in `associations.mjs`.
- **3e — Stripe Tax** on the print checkout (`automatic_tax`, NOT the pre-existing hardcoded-8% v2PaymentRoutes rate). Operational prereqs (Sean): CDTFA seller's permit + resale certificate.
- **3f — enable storefront UI**: un-gate the "Order prints" card, wire `setShowPrintStore(true)`, build per Gemini's full PrintStore design spec (drawer/preview/type-selector/quantity-stepper/summary/CTA + un-watermarked preview as a trust feature). **Feature-flag default OFF** until 3a-3e are sandbox-verified (Stripe test mode + Prodigi sandbox). Flip only on Sean's go.

Open questions the reviewer/builder must resolve (see plan doc §8): paid-but-unfulfilled SLA, minor's-data/PII on shipping addresses (COPPA/PIPEDA), Prodigi SKU catalog mapping, Stripe-shipping-address → Prodigi-recipient schema fit.

---

## 5. READY-TO-PASTE HANDOFF PROMPT (for a fresh AI session)

```
You are continuing the SwanStudios photography "deals gallery" feature. Slices 1 & 2 shipped to origin/main @ 63deeb0da (admin Photo Gallery Studio + client batch "download all" ZIP). Your job is to FINISH it — Slice 3: selling prints via Prodigi drop-ship.

READ FIRST (in order):
1. docs/ai-workflow/hostile-reviews/GALLERY-PHOTO-FEATURE-HANDOFF-2026-07-05.md  (this tracker — status, review items, remaining slices)
2. docs/ai-workflow/AI-HANDOFF/GALLERY-PRINT-FULFILLMENT-SLICE-3-PLAN-2026-07-05.md  (the full Slice-3 spec + free-triangle review §12)
3. .ai-workflow/coordination/claude.lane.md + review-queue.md  (SESSION-T entry; open Codex REQs)

CRITICAL ENVIRONMENT: the shared checkout may be on a stale WIP branch (wip/comms-notifications-2026-07-05, ~132 behind main, 762 staged) — DO NOT commit from it. Create a clean git worktree off origin/main:
  git fetch origin && git worktree add -b <feat/gallery-slice3> c:/tmp/ss-gallery-3 origin/main
Build there, verify (frontend: NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit + npm run build; backend: node --check + npx vitest run <test>), commit explicit paths (never git add -A), then fast-forward main.

DECISIONS LOCKED: Prodigi drop-ship · un-watermarked masters = NEW GALLERIES ONLY · refund = MANUAL admin for v1.

BUILD ORDER (each = build → slice-internal hostile review → Codex review; 3b/3c/3e are high-stakes billing):
3a un-watermarked master pipeline (private R2 original + originalStorageKey + migration; touches the Slice-1 admin uploader)
3b Stripe webhook print_order case (signature + ATOMIC idempotency + pending→paid, fail-closed)
3c Prodigi fulfillment (atomic submit, signed-URL asset, status webhook, retry-on-fail)
3d admin fulfillment view (StatusBadge spec, refund action, register PrintOrder associations)
3e Stripe Tax on the print checkout
3f enable storefront UI (Gemini design spec), feature-flag OFF until sandbox-verified

RULES: styled-components + Crystalline Swan tokens (var(--token,#hex)) · ≤300 lines/file · no PII/secrets to LLMs · Stripe/Prodigi keys in env only · Rule 42 (commit package.json+lock with any new backend dep) · Rule 67 (read the lanes, claim files, no git add -A).
```

---

## 6. RE-ENTRY / COORDINATION
- **Clean worktree pattern** (avoids the stale-branch trap): `git fetch origin && git worktree add -b feat/gallery-slice3 c:/tmp/ss-gallery-3 origin/main`. Build + verify + commit explicit paths + `git push origin <branch>:main` (fast-forward; git rejects non-FF).
- **Open Codex REQs:** slice-1 + slice-2 in `review-queue.md` (target `9670eeb83`/`63deeb0da`) + the slice-3 PLAN review Codex leg (async triangle).
- **Stale comms branch:** `wip/comms-notifications-2026-07-05` (762 staged, 132 behind main) is a SEPARATE issue — the comms/notifications/challenges/messaging workstream is NOT on main. Needs Sean/Codex to reconcile; left 100% untouched by this gallery work.
- **Worktree from this session:** `c:/tmp/ss-gallery-slices` on branch `claude/gallery-photo-studio-20260705` (== main @ 63deeb0da). Safe to remove with `git worktree remove` once merged (it is merged into main).
