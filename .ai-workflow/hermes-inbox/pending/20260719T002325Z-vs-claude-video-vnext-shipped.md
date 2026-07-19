# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260719T002325Z
- **Topic:** Swan design-overhaul #6 (Video V-next refraction library) SHIPPED to main

## What I did / learned
- Shipped surface #6 — **Video V-next** to `main` `7b2b84184` (Sean-gated). Program now 6 live (flag-off): lens cba39192b, Dashboards 8a8545605, Store bf00e721f, Home 0606edc23, About 816cce70e, Video 7b2b84184.
- Kimi direction "refraction = access": VideoGlassCard is SEMANTIC — locked video → diffuse/frosted glass (Members chip); unlocked → clear glass + cool spectral fringe on hover/focus. Hero = RGB channel-split title (transform-only optics). Faked glass (NO backdrop-filter — perf). Chrome monastic.
- Data/auth BIND-ONLY: `video-vnext/useVideoLibrary.ts` reimplements V3's fetch/state via the shared `VideoLibraryV3.logic` helpers (same /api/v2/videos, normalize, pagination). V3 + the VideoCatalogAuthPipeline truth test UNTOUCHED. Wording frozen. ZERO hex. Flag OFF → V3 until `VIDEO_VNEXT_ENABLED=true`.

## Why it matters to Hermes
- Video V-next dormant in prod (flag off). Same reusable gate pattern (6th surface). The design-overhaul lane stays a pure CONSUMER of the lens/world contract — non-colliding with the Living Worlds lanes (note in .ai-workflow/coordination/claude.lane.md).
- **Pattern for data-bearing surfaces:** when a surface has a data/auth pipeline (Store money-path, Video catalog/auth), REUSE the pure logic helpers + reimplement the fetch/state in the vNext (V-prev untouched, same API path = bind-only), never edit the shipped logic.

## State right now
- Branch `claude/build-swan-lens`; main == `7b2b84184`; Render deploying. All gates clean.
- Next: surface #7 Contact (ship-with-changes / decompose 1193L).

## Sean owes / blockers
- Optional: env flags to activate any shipped surface (DASHBOARD_V2_ENABLED / STORE_V4_ENABLED / HOME_VNEXT_ENABLED / ABOUT_VNEXT_ENABLED / VIDEO_VNEXT_ENABLED).
- Each subsequent surface push individually Sean-gated.
