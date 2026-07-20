---
surface: vs-claude
utc: 20260720T103000Z
topic: Gallery vNext PUSHED to main/Render (dark) — design-overhaul program now 8/8 built, 0/8 activated
tags: [gallery, deploy, design-overhaul, flags, activation]
---

## What I did / learned
- Sean gated the push: `claude/build-swan-lens` → origin/main `dcb40d752..45b8d11ce` (fast-forward after
  merging TWO upstream races mid-push — main is moving fast; always re-fetch immediately before push).
- Push order deliberately inverted: Sean pushed AHEAD of the triangle review. Safe because the entire
  gallery vNext is dark (`GALLERY_VNEXT_ENABLED` unset → current GalleryPage renders). The triangle +
  flag-ON browser QA now gate the FLAG FLIP, not the push.
- All gates re-verified ON THE MERGED TIP before pushing (tsc 0, vitest 25/25, firewall clean, build 0,
  Rule 42 clean both checks, stale-base deletions check = none). The earlier foreign `contact.mjs`
  uncommitted drift resolved itself upstream (owner committed it).
- Tracker corrected: rows #8/#9 are ONE surface (GalleryPage) — now BUILT + pushed dark. BUT the
  KIMI-COVER-GALLERY blueprint actually reviewed the DASHBOARD CreativeGallery (milestone-native rewire,
  SEND-BACK) — that is a DIFFERENT surface and remains UNBUILT, pending Sean's call.

## Why it matters to Hermes
- Program truth: the 14-surface design overhaul is now **8/8 public surfaces BUILT, 0/8 ACTIVATED** — all
  value is dark behind env flags (DASHBOARD_V2 / STORE_V4 / HOME_VNEXT / ABOUT_VNEXT / VIDEO_VNEXT /
  CONTACT_VNEXT / GALLERY_VNEXT + other lanes' ENABLE_POST_SAVE_HANDOFF, PRISM_CAPTURE). The highest-leverage
  open slice on the whole board is an ACTIVATION WAVE (per-flag QA → flip → verify → next), not more building.
- FormAnalysisOverlay is a FINISHED feature with a real AI backend and zero consumers — a dark differentiator
  ("your coach's AI reads your lift") queued as gallery Phase 2's signature moment.

## State right now
- main @ `45b8d11ce`, Render auto-deploying (watcher confirms bundle swap + /api/health).
- Gallery open items before flag-on: triangle (Codex+Gemini) + flag-ON browser QA (responsive matrix,
  reduced-motion, keyboard) → flip `GALLERY_VNEXT_ENABLED`. Instant revert = set false, no rebuild.
- Deferred (Sean-scoped): gallery Phase 2 (proof-strip, gratitude donation, Analyze-My-Form, filmstrip/zoom),
  OG/deep-link slice, 9-modal restyle, dashboard CreativeGallery blueprint decision.

## Sean owes / blockers (if any)
- Sean: decide the dashboard CreativeGallery blueprint (in program vs parked); gate the flag flips after
  triangle+QA; the activation-wave plan lands next.
