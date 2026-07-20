---
surface: vs-claude
utc: 20260720T063500Z
topic: Gallery vNext — full feature parity + hostile-review-to-dry complete (flag-OFF, push gated on Sean)
tags: [gallery, billing, design-overhaul, hostile-review, parity]
---

## What I did / learned
- Closed EVERY parity gap between the Gallery vNext and the shipped monolith by reading the monolith's full
  render region line-by-line first (GalleryPage.tsx:1712-2219) — the gap list came from ground truth, not
  memory: hero + covers/badges, photographer note, Download-All ZIP, GalleryInfoCard, the $15/$50/$175
  pricing modal with its truth-locked VIP/referral chains, all four money/support modals (bind-only, exact
  shipped prop contracts), the post-enhancement support sheet, vip=success + signup-redirect effects, the
  signed-in-client VIP branch (→ /store), browser-back lightbox close, 24-per-batch loading.
- Hostile review ran DRY (2 consecutive clean passes) after catching 5 REAL bugs in my own build:
  (1) IntersectionObserver created in an effect AFTER callback refs ran → the entire grid stayed blurred
  forever (fix: pre-observer element queue + no-IO fallback — a pattern worth reusing anywhere IO + callback
  refs mix); (2) no img onError rendition fallback; (3) empty gallery = infinite skeleton (loading heuristic
  vs a real loaded flag); (4) the photos-error retry button retried the EVENTS list; (5) the gate card
  rendered below the fold instead of replacing the list.
- Useful discoveries: `enhanceSelections`/FloatingCart in the monolith is DEAD code (only an underscore-
  prefixed toggle feeds it) — parity did not require rebuilding it; `PrintStore` is mounted INSIDE
  PhotoDetailModal so reusing the modal carries print for free; `FormAnalysisOverlay` has ZERO consumers
  anywhere (dormant — it is the natural Phase-2 "Analyze My Form" signature, not a parity gap).

## Why it matters to Hermes
- The gallery redesign is now functionally COMPLETE behind `galleryVNext` (flag-OFF, zero user impact) with
  its own mirrored money truth tests. What stands between this and flag-on: triangle review (Codex+Gemini)
  + live browser QA + Sean's push gate. Treat any future claim of "gallery vNext shipped" as false until
  those run.
- Cross-agent flag: `backend/models/contact.mjs` sits modified-uncommitted in the shared worktree (another
  agent's isEmail validation WIP). Every Rule 42 audit will flag it until its owner commits or drops it.

## State right now
- Branch `claude/build-swan-lens` @ `08fbfeafd`, 9 ahead of origin/main, NOT pushed. GalleryPage.tsx
  byte-for-byte untouched (its 5 truth tests green). Gates: tsc 0 · eslint 0 errors/0 warnings · vitest
  25/25 · de-Galaxy + token-discipline clean (gallery-vnext registered in both) · build 0 (43.7kB lazy
  chunk) · every file under the 300-line cap.
- Deferred by scope: Phase 2 (proof-strip, gratitude-timed donation, Analyze-My-Form elevation,
  filmstrip/zoom), OG/deep-link backend slice, 9-modal Crystalline restyle.

## Sean owes / blockers (if any)
- Sean gates: the push, then `GALLERY_VNEXT_ENABLED` flag flip after triangle + browser QA. Nothing live
  until then.
