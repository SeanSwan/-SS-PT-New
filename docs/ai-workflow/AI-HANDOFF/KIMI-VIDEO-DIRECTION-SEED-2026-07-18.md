# VIDEO LIBRARY upgrade — creative direction (elevate execution; freeze data/auth + wording)

You are Kimi K3, the SwanStudios design architect. We shipped 5 surfaces on this exact pattern (lens,
Dashboards, Store, Home optics hero, About caustic swan-occluder). Now the **Video Library** page. Give a
**focused, buildable creative direction** (not a spec) to elevate the LOOK to that caliber. The tracker
calls the Video signature a **"refraction system."**

## Caliber + constraints (identical to the 5 shipped — respect them)
- Get out of the way; one signature moment; taste over framework; **zero new npm deps** (`framer-motion` +
  SVG + CSS gradients + hand-rolled `<canvas>` only). Swan thesis: "optics, not creatures" — refraction,
  caustics, dispersion, glass. 60fps mid-Android, DPR≤2, IntersectionObserver, transform/opacity only,
  reduced-motion = designed static frame (framer entrance disabled in JS, not just CSS — hard-won lesson).
- **Reversible + skinnable:** all color/shape via `--video-*` tokens → the REAL shipped lens slots
  (`--world-bg/panel/text/muted/accent/action/title-font`, `--lens-canvas/elev-1..3/panel-radius/z-*/
  fx-glow-primary/ease-standard/ease-crystallize`). ONE tokens file, prefer ZERO hex. Galaxy trio BANNED
  incl. channel forms (`rgba(0,255,255,…)`). Gate/flag mirror the shipped Home/Store/About: `useVideoVNextFlag`
  (runtime `/api/config/public-flags.videoVNext` → env `VITE_VIDEO_VNEXT` → false; kill switch absolute over
  QA `ff_videoVNext`), `VideoGate` (lazy + ErrorBoundary + world-contract probe → VideoLibraryV3), backend flag.
- **Consume the SHIPPED lens Crystallize** (`useCrystallizeTransition`/`CrystallizeOverlay`, no children).
  `useId()` for any SVG def ids (multi-instance safe — Codex lesson). styled-components only; 44px targets;
  4.5:1 contrast (scrim behind hero text); no naked outline:none; Victory-only if any chart.

## FREEZE (non-negotiable): the data + auth pipeline + wording
- The catalog/pagination/auth LOGIC lives in `VideoLibraryV3.logic.ts` — REUSE it verbatim, never redesign:
  `normalizeVideoCatalogResponse`, `buildVideoListPath` → `GET /api/v2/videos?…`, `formatDuration`, pagination
  helpers, `getVideoWatchPath`/`getCollectionPath`, error meta. There is a `VideoCatalogAuthPipeline` truth
  test + a hardening test — the auth-GATED content behavior must not change. This is the "money-path" of Video.
- Keep the page's copy/labels + IA: a hero, a filter/search control row (content-type + search), a paginated
  VIDEO CARD GRID (thumbnail, title, duration, content-type), collections, and the gated-content affordance.
  Elevate the LOOK, not the words or the data flow.

## Give me (bounded — a brief, not a spec)
1. **The signature "refraction system"** — concrete, buildable: how light disperses/refracts as the SIGNATURE
   (a prism/dispersion hero? video thumbnails behind a glass-refraction card treatment? a spectral sweep on
   hover?). Specify the ONE hero moment (Crystallize charge) + how the CARD treatment carries the refraction
   language WITHOUT a per-card canvas (CSS/SVG gradient glass, one shared canvas at most). Perf budget +
   reduced-motion static frame. The cards are the main content — the refraction must live in them cheaply.
2. **Visual language** — palette via lens tokens (slot → role), premium type direction, motion vocabulary
   (dispersion/refract reveals bound to `--lens-ease-*`), the glass-card architecture (chrome edge, elevation).
3. **Control row + grid + pagination elevation** — how the filter/search controls, the card grid, and the
   pagination get the premium glass/refraction treatment while staying legible + 44px + accessible.
4. **The ONE highest-impact change.**
Keep it tight + buildable. The builder (Opus) executes with freedom, mirroring the 5 shipped surfaces.
