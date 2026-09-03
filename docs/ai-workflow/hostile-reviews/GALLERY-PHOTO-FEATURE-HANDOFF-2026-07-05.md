# Gallery / Photography Deals Feature — Handoff & Hostile-Review Tracker (2026-07-05)

> **Purpose:** any AI or human picking this up sees, in one file: (1) what SHIPPED, (2) what needs HOSTILE REVIEW, (3) EVERY remaining slice to FINISH the feature, and (4) a ready-to-paste prompt to continue. Filed in `hostile-reviews/` so we come back, review, fix, and finish.
> **Feature:** the photoshoot "deals" gallery — admin uploads passcode-protected event galleries; clients unlock with email + passcode, view + download their shoot; future: buy prints. (Distinct from the client progress-photo manager and the user creative galleries — see §2.)
> **Owner:** Sean. **Built by:** Claude Opus 4.8 (VS-Claude), 2026-07-05. **Last verified commit:** origin/main `63deeb0da`.

---

## 0. TL;DR STATUS
- ✅ **SHIPPED** to `origin/main @ 63deeb0da` (Render auto-deploying): **Slice 1** (admin Photo Gallery Studio) + **Slice 2** (batch "download all" ZIP).
- 🧱 **BUILT 2026-07-06, UNCOMMITTED (pending EOD Codex batch review):** **Slice 3a** (un-watermarked master pipeline) + **Slice 3b** (Stripe webhook money-loop + the missing `print_orders` table). Worktree `c:/tmp/ss-gallery-slice3a-20260706` @ `origin/main 3205bb4aa`, branch `claude/gallery-slice3a-master-pipeline-20260706`. Full review packet in **§7 below** — this is the batch-review target for Codex today.
- 🔍 **NEEDS HOSTILE REVIEW:** Codex review of slices 1+2 (REQs open in `.ai-workflow/coordination/review-queue.md`, targeting `9670eeb83` / `63deeb0da`) + **3a+3b (§7)** + the residual-risk list in §3.
- 🏗️ **REMAINING TO FINISH:** **Slice 3** — selling prints via **Prodigi drop-ship**. After 3a+3b: **3c** Prodigi fulfillment · **3d** admin fulfillment view · **3e** Stripe Tax · **3f** enable storefront UI. Full spec: [`AI-HANDOFF/GALLERY-PRINT-FULFILLMENT-SLICE-3-PLAN-2026-07-05.md`](../AI-HANDOFF/GALLERY-PRINT-FULFILLMENT-SLICE-3-PLAN-2026-07-05.md).
- ⚠️ **ENVIRONMENT TRAP (READ FIRST):** the shared checkout `<REPO>` is on branch **`wip/comms-notifications-2026-07-05`** — **132 commits behind `origin/main`, with 762 files staged** (the whole comms/notifications/challenges/messaging workstream, NOT gallery work). **DO NOT `git add`/commit from that checkout.** Work in a clean git worktree off `origin/main` (see §6). This trap was independently hit by two Claude sessions on 2026-07-05.

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

---

## 7. SLICES 3a + 3b — BUILT 2026-07-06, PENDING EOD CODEX HOSTILE REVIEW

> **State:** built + self-hostile-reviewed + free multi-agent adversarially verified, **UNCOMMITTED, NOT pushed**. Worktree `c:/tmp/ss-gallery-slice3a-20260706` @ `origin/main 3205bb4aa`, branch `claude/gallery-slice3a-master-pipeline-20260706`. Sean is batching all Codex hostile reviews to end-of-day — **this section is the review target.** Nothing deploys until Sean commits + pushes.

### 7.1 Files (8 modified, 4 new — commit together per Rule 42)
**Backend (modified):** `models/GalleryPhoto.mjs` · `routes/adminGalleryRoutes.mjs` · `services/r2StorageService.mjs` · `webhooks/stripeWebhook.mjs`
**Backend (new):** `migrations/20260706010000-add-original-storage-key-to-gallery-photos.cjs` · `migrations/20260706020000-create-print-orders-table.cjs` · `tests/api/galleryPrintMasterContract.test.mjs` · `tests/api/galleryPrintWebhookContract.test.mjs`
**Frontend (modified):** `admin-gallery/AdminGalleryStudio.tsx` · `admin-gallery/adminGalleryApi.ts` · `admin-gallery/components/PhotoUploader.tsx` · `admin-gallery/hooks/useGalleryUpload.ts`
Combined diff: **322 insertions, 13 deletions.**

### 7.2 Slice 3a — un-watermarked master pipeline
- `GalleryPhoto.originalStorageKey` (nullable `original_storage_key`) + additive/idempotent migration.
- Single (`upload-single`) + batch (`upload`) handlers: gated by a new opt-in **`storeMaster`** flag (default OFF → storage only doubles for print galleries; new-galleries-only, no back-fill). When on, they PUT the **pristine pre-watermark** buffer to an **UNGUESSABLE private key** `gallery-originals/{slug}/{n}-{randomBytes(16)hex}.jpg` (`CacheControl: private, no-store`, **never `buildUrl()`'d**), and record `original_storage_key` (single = raw INSERT column; batch = ORM create field).
- `r2StorageService.generateGalleryOriginalUrl()` — short-lived (900s) `attachment` presigned GET (mirrors the video presign pattern) — the ONLY delivery path.
- New admin-gated `GET /api/admin/gallery/photos/:photoId/original-url` (inherits the file-wide admin|trainer gate; `parseInt` id guard; 404-no-master; 503-no-R2).
- Frontend: "Store print master" toggle (default OFF) threaded `PhotoUploader → useGalleryUpload → adminGalleryApi` FormData.
- **PAYWALL AUDIT (self, hostile):** every public + admin photo read uses EXPLICIT columns without `original_storage_key` (public grid `galleryRoutes.mjs:364`, admin grid `adminGalleryRoutes.mjs:1398`); download-all zip selects only `storage_key`; the 3 `findOne`-without-attributes (vote/print-order/analyze-form) never serialize the full photo object. **No leak path found.**

**3a review asks:** (a) any serialization path that leaks the master key I missed (Stripe metadata? enhancement include? serve-photo proxy §3.2)? (b) is `randomBytes(16)` unguessable-enough given the bucket is public via `R2_PUBLIC_URL`, or force a private bucket/prefix? (c) IDOR on `/original-url` — any admin can fetch any gallery's master (judged acceptable: staff-wide, no per-event ownership anywhere in this router).

### 7.3 Slice 3b — Stripe webhook money-loop  ⚠ HIGH-STAKES BILLING
- New `metadata.type==='print_order'` case in `stripeWebhook.mjs` → `fulfillPrintOrder(session)`.
- **Idempotency = the proven gallery pattern:** `processed_stripe_sessions` INSERT `ON CONFLICT ("sessionId") DO NOTHING RETURNING id` (tier `'gallery-print'`) — first delivery wins, Stripe at-least-once redelivery no-ops. Mirrors `fulfillGalleryCredits`/`fulfillGalleryDonation`.
- **Mapping is server-set only:** resolve `PrintOrder` by `stripeSessionId = session.id` (stored server-side at checkout, `galleryRoutes.mjs:1822`), fallback to server-set `metadata.orderId` (parsed+validated). **Never client input.** Row-locked (`lock: t.LOCK.UPDATE`).
- **Fail-closed capture:** conditional `UPDATE print_orders SET status='paid', paid_at=NOW() WHERE id AND status='pending'` — idempotent by construction. `payment_status !== 'paid'` → skip.
- **One transaction** wraps the replay-guard INSERT + the flip → a fulfillment failure rolls back the 'processed' marker so Stripe's retry re-processes (closes the stuck-in-pending hole the existing credit/donation handlers technically have, since they insert `processed` outside a txn).
- **Orphan-payment safety** (implements the plan's "never leave a captured order invisible"): a PAID session with no matching order → rollback + `logger.error` + **best-effort admin alert** ('Print Payment Needs Attention'), then 200-ack (a retry can't conjure a deleted order).
- Prodigi/print-lab submission is **DEFERRED to 3c** — 3b stops at `paid` (no `printProviderOrderId` write, no `processing`).

> **⚠ CORRECTION to §4's 3b line:** §4 said "ATOMIC idempotency (compare-and-set on `printProviderOrderId`)". That was a plan mis-statement — `printProviderOrderId` is NULL until Prodigi (3c), so it can't be 3b's idempotency key. 3b's atomic idempotency is the `processed_stripe_sessions` ON-CONFLICT ledger + the `status='pending'` conditional flip, both inside one transaction. The `printProviderOrderId` CAS belongs to **3c** (never resubmit to Prodigi).

**3b review asks (attack the money loop):** (a) any double-charge/double-fulfill under Stripe at-least-once + concurrent delivery? (b) is the ON-CONFLICT-in-transaction serialization of two concurrent same-session deliveries correct (2nd blocks → sees no row → skips)? (c) stuck-pending recovery — does the txn rollback truly let a retry re-process? (d) the orphan-payment branch 200-acks instead of 500-retrying (agent rated `low`, "unreachable with real payment") — agree, or force a retry? (e) defense-in-depth: session `amount_total` is NOT cross-checked vs `order.priceUsd` (agent: not exploitable — amounts are server-set + Stripe-signed) — want the check anyway?

### 7.4 ⚠⚠ CRITICAL Rule-58 FINDING — the `print_orders` table never existed
Direct **read-only live-DB check** (2026-07-06): **`print_orders` does NOT exist in production** (no table matching `%print%`, no indexes). `processed_stripe_sessions` exists (3b's replay guard is fine). Root cause: no `createTable` migration was ever written (the Slice-3 plan §1 mis-stated one existed); the May 2026 idempotency-index migration `20260520000001` calls `describeTable('print_orders')` which **threw** on the missing table, and Render's safe-migrate marked it COMPLETED (silent-fail) — so it's in `SequelizeMeta` as done, never created the table OR the idempotency unique index, and will not re-run. Invisible only because the storefront is dormant (nothing hits it).
- **Fix (in 3b):** `migrations/20260706020000-create-print-orders-table.cjs` — creates `print_orders` matching `PrintOrder.mjs` exactly (all columns + enums) **plus** the `idx_print_orders_idempotency_key` partial UNIQUE index the checkout's `claimIdempotentRecord` depends on (May never applied it). Guarded idempotent (skips if the table exists; cleans orphaned enum types).
- **Codex verify:** the createTable matches the model 1:1; the unique index arg-order/partial-predicate matches what the checkout race-safety needs; enum-type cleanup is safe; and confirm no OTHER model has the same silent-fail-marked-complete table-absence (spot-check: does `Order`/`orders` exist? the same May migration touches it).

### 7.5 Verification (this build)
- Backend: **`galleryPrintWebhookContract` 15/15 + `galleryPrintMasterContract` 18/18** + adjacent (`galleryCreditWebhookIdempotency`, `galleryDonationWebhook`, `adminGalleryRouteDisclosure`, `adminGalleryUploadFilenameEntropy`, `galleryDownloadAllRouteContract`) all green; `node --check` on all touched/new files.
- Frontend (3a): `tsc --noEmit` 0 (whole project, 8GB); `vite build` OK 12.43s.
- **Free multi-agent adversarial verification** (7 skeptics × replay/race/stuck-pending/IDOR/fail-open/schema-drift/cross-handler → independent refute pass): **0 confirmed bugs**; the two `low`/note items are folded into §7.3 asks (d)(e). (Agents verified vs the model+migrations; they could NOT see the live DB — §7.4 is the human-added DB catch.)
- Secret scan CLEAN. **Rule 56:** vitest/tsc ran against `node_modules` junctioned from the 132-behind shared checkout (deps may lag) → CI must re-run. **Rule 55:** no R2/Stripe in dev → live staging probe required (see below).

### 7.6 Live staging probes required before go-live (Rule 55)
1. **3a:** upload with "Store print master" ON → confirm a `gallery-originals/` object exists, is NOT reachable at a public URL, and `GET /photos/:id/original-url` returns a working signed link; download-all + public grid must NOT expose it.
2. **3b:** with the new migration deployed (creates `print_orders`), run a **Stripe test-mode** print checkout → confirm the webhook flips the order `pending→paid` + sets `paid_at`; redeliver the same event from the Stripe dashboard → confirm it no-ops (no double flip); confirm the admin 'Print Order Paid' notification fires.

### 7.7 Residuals (named, not fixed)
- Deleting a photo orphans its R2 objects TODAY (public+thumb+medium already; the 3a master is no special case) → future R2-GC slice.
- `storeMaster` is per-upload, not per-event → a print gallery uploaded across 2 sessions needs re-ticking; per-event flag is 3d/3f polish.
- 3b orphan-payment branch 200-acks (see §7.3 ask d); amount cross-check deferred (ask e).
- `PrintOrder` still not in `associations.mjs` (needed for 3d eager-loads, NOT for 3b's raw-SQL/findByPk path).

---

## 8. SLICE 3c — Prodigi fulfillment (BUILT flag-OFF, 19-hostile-review-HARDENED, UNCOMMITTED)

> **State:** built + hardened through **19 hostile reviews** (2 multi-agent workflow waves + refute passes + manual rounds), each followed by fixes; **65/65 contract tests green**. Same worktree/branch as §7. **UNCOMMITTED.** Sean's decisions: build the scaffold now, **flag-OFF**; free verify + this EOD Codex batch (no paid Village).

### 8.1 Files (all new/changed commit together — Rule 42; stripeWebhook is LIVE)
**New:** `backend/services/print/{prodigiConfig,prodigiClient,printFulfillmentService}.mjs` · `backend/routes/print/prodigiWebhookRoutes.mjs` · `backend/tests/api/galleryPrintFulfillmentContract.test.mjs`.
**Modified:** `backend/webhooks/stripeWebhook.mjs` (shipping capture + LAZY flag-gated hand-off) · `backend/routes/galleryRoutes.mjs` (checkout `shipping_address_collection`, removed `commission` from response, PII exclude on `/print-orders`) · `backend/routes/adminGalleryRoutes.mjs` (`POST /print-orders/:id/retry-fulfillment`) · `backend/core/routes.mjs` (mount `/api/print/webhooks`).

### 8.2 Design
- **Flag-OFF** (`PRINT_FULFILLMENT_PRODIGI_ENABLED`, default off; sandbox `PRODIGI_ENV`). SKU map is placeholders → `resolveProdigiSku` returns null for `REPLACE_ME` → **fail-closed** (never a wrong print).
- **submitToProvider** (webhook hand-off / admin retry): fail-closed preconditions (no SKU / no shipping / no master → order stays `paid` + admin alert); **atomic + EXCLUSIVE claim** (`paid` immediately; `processing` only if >5min stale → concurrent submits can't double-claim); signed-master asset (3a presigned, 1h); Prodigi `createOrder` with **Idempotency-Key** (belt) + DB CAS (suspenders); on Prodigi-accept-but-write-fail → held at `processing` (NOT reverted — Prodigi has it); reconcile via `getProdigiOrder` on retry.
- **applyProviderStatus** (Prodigi status webhook, shared-secret **header-only + timingSafeEqual**): idempotent `→ shipped` + tracking (+ tracking backfill on a later callback).

### 8.3 The 11 hostile-review fixes (all applied + test-locked)
1. Stuck-`processing` recovery **+ 5-min staleness gate** (the gate closes a concurrent double-claim race my own recovery fix first re-opened).
2. No-revert after Prodigi accepted (`provider_id_write_failed` held at `processing`, never re-charge).
3. **PII:** exclude `shippingAddress` + `commissionUsd` from `GET /print-orders`.
4. **Rule-20 sibling:** remove `commission` from the `POST /print-order` checkout response (the fix's missed twin).
5. Webhook secret **header-only + constant-time** (was a query-param log-leak).
6. **Boot-safety:** LAZY-import 3c from the LIVE `stripeWebhook` (was static — partial commit / print-module fault could crash all payments).
7. Shipping capture across Stripe API-version shapes (`shipping_details || collected_information`).
8. `reconcileFromProvider` wires the previously-dead `getProdigiOrder` + closes a missed-shipped-callback gap.
9. Tracking backfill after `shipped`.
10. De-dup Prodigi body parsing into one exported `extractProviderStatus` (Rule 63).
11. Un-export `PRODIGI_SKU_MAP` (Rule 63 dead export).

### 8.4 Codex EOD review asks
- Re-attack the **5-min staleness gate**: any remaining concurrent double-submit, or a legit slow order wrongly re-claimed? (submitted orders short-circuit to reconcile before the claim.)
- The **lazy-import** boot-safety: confirm `core/routes` static mount of `prodigiWebhookRoutes` is the only remaining static print dep, and that Rule-42 commit-together fully covers it.
- Prodigi **API fidelity** [HYPOTHESIS, TODO-live]: payload shape, status vocabulary (`isShippedStatus` regex), and idempotency same-key⇒same-body semantics — confirm against Prodigi docs when the account exists.
- Confirm the PII fixes are complete (no third leak surface) and the pre-existing **access-endpoint lateral-visitor** issue (email + shared password mints a token for an existing visitor) is correctly classified pre-existing/out-of-scope.

### 8.5 Residuals (documented, not fixed)
Pre-existing: access-endpoint lateral impersonation; single-upload raw INSERT omits medium/thumb keys; oversized `adminGalleryRoutes`/`stripeWebhook`. Out-of-3c-scope: presign/confirm upload path doesn't wire `storeMaster`; no admin print-order list (=3d); Prodigi crop (`cropData` ignored until the 3f crop UI). TODO-live: Prodigi status vocab + idempotency-body semantics.

### 8.6 LIVE ACTIVATION checklist (Sean, later)
Prodigi account → set `PRODIGI_API_KEY` + `PRODIGI_WEBHOOK_SECRET` → fill real SKUs in `PRODIGI_SKU_MAP` → configure Prodigi to send status callbacks to `/api/print/webhooks/prodigi/status` with the `x-prodigi-webhook-secret` header → `PRINT_FULFILLMENT_PRODIGI_ENABLED=true` (sandbox `PRODIGI_ENV` first) → sandbox test end-to-end → `PRODIGI_ENV=live`.

---

## 9. SLICE 3d — admin fulfillment view (BUILT, hostile-reviewed, UNCOMMITTED)

> **State:** built + self-review + 5-agent adversarial verify (refute pass); **76/76 backend tests, tsc 0, build OK**. Same worktree/branch. **UNCOMMITTED.** Resolves the §8.5 "no admin print-order list" residual + registers `PrintOrder` associations.

### 9.1 Files
**Modified:** `backend/models/associations.mjs` (register PrintOrder belongsTo visitor/photo/event) · `backend/routes/adminGalleryRoutes.mjs` (3 routes) · frontend `admin-gallery/{adminGalleryApi.ts, types.ts, AdminGalleryStudio.tsx}`.
**New:** `backend/tests/api/galleryPrintAdminFulfillmentContract.test.mjs` · frontend `admin-gallery/{hooks/usePrintOrders.ts, components/PrintOrdersPanel.tsx, components/PrintOrderStatusBadge.tsx}`.

### 9.2 Design
- `GET /print-orders?status=` — list with buyer/photo/event eager-load (admin|trainer); **commissionUsd excluded for the trainer role**; status-filter allowlisted; limit 200.
- `POST /print-orders/:id/mark-shipped {trackingNumber?}` — idempotent; only advances a **paid/processing** order (never a never-paid `pending` one).
- `POST /print-orders/:id/refund` — **ADMIN-ONLY**; server-side PaymentIntent resolution (`checkout.sessions.retrieve` → `payment_intent`); `stripe.refunds.create` with a stable **idempotency key** (`print-refund:{id}`) so a double-click/retry never double-refunds; refundable-states-only; → `cancelled`.
- Frontend `PrintOrdersPanel` (filter, order cards, retry/ship/refund) mounted in the studio; refund is inline two-step confirm **and** hidden from non-admins; `PrintOrderStatusBadge` tokenized; `usePrintOrders` hook.

### 9.3 Hostile-review fixes (all applied + test-locked)
1. Refund gated **admin-only** (was admin|trainer — trainers shouldn't reverse payments).
2. mark-shipped guard `status IN ('paid','processing')` — a never-paid `pending` order can no longer be flipped to shipped via a direct API call.
3. List excludes `commissionUsd` (internal margin) for the trainer role.
4. Refund button hidden from non-admins (matches the backend gate); tracking input raised to 44px (Rule 2).

### 9.4 Codex EOD review asks
- Refund atomicity: refund-succeeds-then-status-write-fails returns a misleading 500 but self-heals on retry (idempotency key) — acceptable, or make it cleaner?
- Confirm the admin-only refund gate + the trainer margin-exclude are complete; any other trainer-visible margin/PII surface?
- List: 200-row cap has no pagination (silent truncation of oldest) — v1 acceptable?

### 9.5 Residuals (documented)
Refund does not auto-cancel a Prodigi order already in production (admin cancels provider-side separately); list truncates at 200 (pagination = follow-up); manual-fulfillment full ship-to address is not shown in the list row (name + city/state only — a detail view is a follow-up); shared `busyId` cross-order (money-safe, idempotent).

---

## 10. SLICE 3e — Stripe Tax on the print checkout (BUILT, flag-OFF)

> One focused, flag-gated change to `backend/routes/galleryRoutes.mjs` (`POST /print-order`) + `backend/tests/api/galleryPrintTaxContract.test.mjs`. **44/44 tests, node-check clean.**
- `PRINT_STRIPE_TAX_ENABLED` (default OFF). When ON: `automatic_tax: { enabled: true }` + line-item `tax_behavior: 'exclusive'` + `product_data.tax_code: 'txcd_99999999'` (tangible goods). Stripe computes sales tax from the collected ship-to address (3c's `shipping_address_collection`).
- **Flag OFF = byte-identical** to the prior checkout (the spreads collapse to `...{}`). It MUST stay off until Stripe Tax is enabled in the dashboard — enabling `automatic_tax` without Stripe Tax active errors checkout.
- No hardcoded rate (avoids the pre-existing v2PaymentRoutes 8% gotcha) — test-locked.
- **Codex ask:** confirm the flag-off byte-identity, the tax_code choice for prints, and that `priceUsd`/`commissionUsd` stay pre-tax (tax is added on top + remitted via Stripe Tax).
- **Live activation (Sean):** enable Stripe Tax in the Stripe dashboard + register for sales tax (CDTFA seller's permit / resale cert for the Prodigi wholesale) → `PRINT_STRIPE_TAX_ENABLED=true`.

---

## 11. SLICE 3f — enable the client storefront (BUILT, flag-OFF) — LAST PRINT SLICE

> Un-gates the **pre-existing** `PrintStore.tsx` (product/size/qty picker + Stripe checkout) that was built-but-unreachable. Files: `backend/routes/galleryRoutes.mjs` (photos response), `frontend/src/pages/GalleryPage.tsx` (thread the flag), `frontend/src/pages/gallery/PhotoDetailModal.tsx` (un-gate the "Order Print" button), `backend/tests/api/galleryPrintStorefrontContract.test.mjs`. **46/46 tests, tsc 0, build OK.**
- Runtime flag `PRINT_STOREFRONT_ENABLED` (backend env, default OFF) → surfaced in the gallery photos response → threaded to `PhotoDetailModal`.
- **OFF (default) = byte-identical**: the "Order Print" card stays `disabled` + "Coming Soon" (current UX). **ON**: the card enables → `onClick` opens the existing `PrintStore` → POST `/print-order` → Stripe checkout (now with shipping-address collection + Stripe Tax + Prodigi fulfillment behind it) → webhook flips to paid.
- No new checkout code — reuses 3a–3e's chain. Ordering still requires a valid gallery access token (`requireGalleryAccess`).
- **⚠ Review item before go-live:** `PrintStore.tsx` is PRE-EXISTING code (from an earlier session), not part of this slice's build — it should get its own hostile review before the flag flips live (it's the client-facing checkout UI). Confirmed only that its checkout wiring hits `/print-order` + redirects to `checkoutUrl`.
- **Live activation (Sean, the final flip):** after Prodigi (§8.6) + Stripe Tax (§10) are ready and sandbox-verified → `PRINT_STOREFRONT_ENABLED=true`. That's the whole feature live.

### Print feature status: 3a✅ 3b✅ 3c✅ 3d✅ 3e✅ 3f✅ — CODE-COMPLETE, all flag-OFF. Go-live = Sean's Prodigi account + Stripe Tax + flip the 3 flags.
