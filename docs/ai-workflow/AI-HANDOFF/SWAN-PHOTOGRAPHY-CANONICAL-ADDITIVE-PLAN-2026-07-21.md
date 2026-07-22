---
status: QUEUED_AFTER_DEGATE_GATE
date: 2026-07-21
owner: Codex
linear: SWA-31
depends_on: codex/degate-design-overhaul-20260721
---

# SwanStudios Photography - Canonical Additive Plan

## Decision

The photography queue item is accepted as an additive functional lane. It does not resume the rejected public
Gallery vNext redesign, add a design flag, or change the de-gating decision.

The implementation target is the photography system that already exists:

- Public: `/gallery` and `/gallery/:slug` -> `GalleryPage`.
- Admin: `/dashboard/admin/gallery` -> `AdminGalleryStudio`.
- Parked preview: `gallery-vnext` remains browse-only inside Admin -> Design Studio.
- Launch Control: no photography design switch and no environment-variable gate.

This lane starts only after the de-gate release candidate clears its Final Decider gate and Sean approves the
release sequence. It must branch from that final de-gate commit, not from the stale shared checkout.

## Reconciliation finding

The queue item's WIP warning was accurate for an older shared checkout but is stale against current
`origin/main`. The canonical admin gallery and ZIP work have already landed in Git. Do not recover the old
untracked directory wholesale and do not copy its route, navigation, package-lock, or GalleryPage files over the
current baseline.

Relevant landed gallery history to preserve includes:

- `9670eeb83` - restored Photo Gallery Studio.
- `63deeb0da` - streamed download-all ZIP.
- `b1f8d691d` - un-watermarked print-master pipeline.
- `dbc1ca484` - admin print-order fulfillment view.

Current committed dependency truth is `archiver@^7.0.1` with the default import. The queue item's `archiver@8` named-import instruction belongs to the stale WIP and must not force a dependency upgrade. P5 must runtime-check the API actually installed on its fresh baseline.

The photography lane may touch shared gallery files only through a fresh branch and a current file-level diff.
Print behavior receives regression protection, not new feature scope.

## Current canonical evidence

| Concern | Current evidence | Classification |
|---|---|---|
| Public route import | `frontend/src/routes/main-routes.tsx:84-85` imports `GalleryPage` | canonical |
| Public gallery list | `main-routes.tsx:390-394` mounts `GalleryPage` | canonical |
| Public event URL | `main-routes.tsx:398-402` mounts `GalleryPage` | canonical |
| Admin route | `UniversalDashboardLayout.routes.tsx:125` mounts `AdminGalleryStudio` | canonical |
| Admin navigation | `dashboard-tabs.ts:198` points to `/dashboard/admin/gallery` | canonical |
| Design preview | `UniversalDashboardLayout.routes.tsx:116` mounts Design Studio | canonical admin preview |
| Gallery vNext | registered only as parked Design Studio material | dormant/parked |
| Client progress photos | `/dashboard/admin/photos/:clientId?` domain | separate canonical domain |
| User/social gallery | UserDashboard photo/social domain | separate canonical domain |
| Print fulfillment | existing gallery commerce subdomain | active but excluded from this plan |

Before implementation, P0 must expand this into the complete Rule 26 Canonical Surface Receipt, Rule 27 surface
classification, Rule 29 schema cross-check, and Rule 31 narrow route-shadow audit.

## What already exists and must be preserved

| Capability | Current truth | Action |
|---|---|---|
| Named gallery and hashed passcode | Backend requires name/password and stores a bcrypt hash | preserve |
| Stable gallery model default | `GalleryEvent.isPublished` defaults false | preserve model |
| Admin UI draft default | `EMPTY_EVENT_DRAFT.isPublished` is currently true | repair |
| Upload limits | UI allows 500 files; backend single upload is 25 MB | preserve and test |
| Queue safety | Current hook uploads sequentially with an inter-file gap | preserve first |
| Run control | Progress, retry, cancellation, and stale-run guard exist | preserve and test |
| Public access | Email plus passcode issues a 24-hour event-scoped token | preserve |
| Individual download | Event-scoped public route exists | preserve |
| Download-all | Streams one R2 object at a time and deduplicates names | preserve and harden |
| Publish/unpublish | Existing event update flow | preserve with guards |
| Passcode reset | PATCH can replace `passwordHash` | expose clearly in admin |
| Print pipeline | Already landed and adjacent | regression-only |

## Gaps this lane will close

### P0 - Truth packet and failing contracts

1. Create the full canonical receipt and surface classification.
2. Record committed baseline, inherited de-gate delta, and exact photography branch.
3. Map every matching Express mount/handler in order.
4. Cross-check all `GalleryEvent` and `GalleryPhoto` fields used by routes/services.
5. Write failing frontend and backend contracts before behavior changes.
6. Verify whether original R2 objects or their URL forms are publicly guessable.

Gate: no product code until the receipt, route order, schema table, and tests exist.

### P1 - Storage and state integrity

1. Move static `DELETE /photos/bulk-delete` before `DELETE /photos/:photoId`, or choose a non-overlapping
   endpoint, and add a route-order regression test.
2. Add one shared idempotent gallery-object cleanup service over the existing
   `r2StorageService.deleteObject` primitive. Never permanently remove the only DB cleanup proof unless R2
   deletion succeeded or a durable retry record was created transactionally.
3. Account for `storageKey`, `thumbnailKey`, `thumbKey`, `mediumKey`,
   `enhancedStorageKey`, and any supported staged key in metadata.
4. Use a narrow durable cleanup job/outbox only if repository discovery proves there is no existing retry
   mechanism. Do not silently claim deletion after an R2 failure.
5. Update `photoCount` once per bulk operation and repair `coverPhotoId` deterministically when its photo is
   deleted.
6. Keep slug immutable on rename. Current `PATCH /events/:id` regenerates it and breaks durable links.
7. Reject publishing an empty gallery at the backend boundary.
8. Add the narrow orphan-reconciliation tool only if an inventory proves orphaned gallery objects exist.

Gate: focused tests prove event scoping, every key deletion, retry/idempotence, route order, atomic count/cover
behavior, immutable slug, and empty-publish rejection.

### P2 - Draft creation and delivery panel

1. Make the admin creation form draft by default.
2. Preserve required name/passcode and optional date, sport/type, location, and description.
3. After creation, show a one-time access card using only the passcode still held in local component state:
   gallery link, copy link, copy access instructions, and open gallery.
4. Never return stored plaintext and never put the passcode in the URL.
5. Add explicit passcode reset for existing galleries.
6. Add the selected-gallery delivery panel: Draft/Published, photo count, stable link, copy instructions, open
   public gallery, passcode reset, and optional copy-message template.
7. Warn before upload/delete mutations to a published gallery.

Gate: creation/copy/reset tests plus keyboard, error, and mobile state coverage.

### P3 - Large-batch upload hardening

1. Keep one multi-file selection with a managed sequential/low-concurrency queue.
2. Keep JPEG-first, 25 MB per file, and 500 selected files per operator batch.
3. Do not restore browser RAW upload contradictions. Reconcile the current backend extension/MIME allowlist with the JPEG-first contract before changing upload behavior.
4. Show total, uploaded, processing, failed, remaining, overall progress, per-file status, cancel remaining, and
   retry failed.
5. One failed file must not cancel the remaining queue.
6. Gallery switch/reset must abort the old run and suppress stale state writes.
7. A photo is complete only after its DB row and required R2 variants exist.
8. Use presigned direct-to-R2 only after batch reservation, R2 CORS, collision, and confirmation semantics are
   proven. Sequential upload remains the safe default.

Gate: a 500-file test proves bounded request concurrency without materializing 500 simultaneous requests.

### P4 - Curation contact sheet

1. Responsive thumbnail contact sheet with intrinsic dimensions where available.
2. Accessible 44px delete action with rollback and visible failure handling.
3. Select one, select multiple, select all visible, clear, and delete selected.
4. Confirmation names the exact deletion count.
5. Keyboard-capable lightbox with filename/photo number and previous/next navigation.
6. No nested interactive controls and no hover-only actions.
7. Preserve existing print, enhancement, voting, and cover behavior unless a regression test requires a narrow
   compatibility change.

Gate: desktop and mobile interaction tests, including 390px and 414px.

### P5 - Recipient delivery and token privacy

1. Preserve email/passcode re-entry and the 24-hour event-scoped access token.
2. Preserve thumbnail grid, lightbox, individual download, and streamed ZIP.
3. Remove the long-lived gallery bearer token from the download-all query string.
4. Issue a short-lived, single-purpose download ticket or use an equivalent non-referrer-bearing handoff.
5. Keep ZIP event-scoped, one-object-at-a-time, and flat-memory.
6. Cover empty galleries, missing R2, missing objects, duplicate names, archive errors, and disconnects.
7. Keep rate limits and prevent secrets, internal keys, complete signed URLs, recipient emails, passcodes, and
   tokens from logs.

Gate: runtime import proves the installed Archiver API; cross-event and token-leak tests pass.

### P6 - Verification and hostile-review loop

Run the exact focused gallery suites, runtime imports, frontend typecheck/build, backend syntax checks, scoped
`git diff --check`, exact-file secret scan, browser smoke, and R2 existence/deletion proof without exposing
secrets.

Hostile-review targets:

- upload concurrency and stale runs;
- R2 deletion durability and orphan behavior;
- event/token/IDOR scoping;
- static/dynamic route order;
- stable share URLs and passcode handling;
- published-gallery mutations;
- ZIP memory/error/disconnect behavior;
- mobile curation and keyboard access;
- print-pipeline regressions.

Repair findings and repeat until a fresh pass is dry. Then obtain Gemini review and Fable Final Decider input
under the repository's current review policy. No push or deploy without Sean's explicit approval.

## Design material that may be harvested

Only functional and accessibility lessons may be harvested from the parked Gallery vNext/Kimi work:

- clear primary delivery CTA hierarchy;
- responsive image renditions and intrinsic dimensions;
- non-nested gallery tile controls;
- accessible lightbox behavior;
- optional later deep-linked lightbox/favorites/proofing if separately approved.

Do not harvest the full visual replacement, its route gate, feature flags, environment controls, or an assumption
that the public page must be redesigned. The current `GalleryPage` remains canonical throughout this lane.

## Explicit exclusions

- No full public gallery redesign.
- No design flag, Launch Control photography switch, Render variable, or local-storage gate.
- No new print-fulfillment scope.
- No merge with client progress photos, user/social posts, CreativeGallery, badges, or Swan Lens.
- No RAW browser upload revival.
- No facial recognition, biometric grouping, or AI culling.
- No wholesale cherry-pick from the stale shared branch.
- No unrelated cleanup, push, deploy, database mutation, or R2 mutation during planning.

## Merge choreography

1. Clear the de-gate Final Decider gate.
2. Commit the de-gate S5 slice only after its gate is satisfied.
3. Obtain Sean's push/deploy approval for the de-gate batch.
4. Create a fresh `codex/` photography branch from the resulting approved commit.
5. Re-run origin/main drift, coordination, route, schema, and storage truth checks.
6. Implement P0-P6 in bounded slices with hostile review after every material slice.
7. Stage explicit paths only; never overwrite current route/nav/package-lock files with stale WIP.
8. Keep the photography Linear issue related to the de-gate issue, but track implementation independently.

## Definition of success

Sean can create a draft photoshoot gallery, queue a large selection safely, curate single or multiple photos,
publish a non-empty gallery, copy durable access instructions, reset its passcode, and let a recipient return to
view and download one photo or a streamed ZIP. Deleted images are removed or durably queued for deletion across
all R2 variants, share URLs remain stable, access stays event-scoped, and the feature requires no design gate.
