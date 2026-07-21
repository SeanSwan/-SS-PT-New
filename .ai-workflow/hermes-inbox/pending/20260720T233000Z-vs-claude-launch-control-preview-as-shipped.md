---
surface: vs-claude
utc: 20260720T233000Z
topic: Launch Control (runtime flag control) + Swan-video heroes + R3 preview-as all shipped to main
tags: [launch-control, feature-flags, home-hero, contact-hero, style-lens]
---

## What I did / learned
- Shipped **Launch Control** to main: an admin board (`/dashboard/admin/launch-control`) that flips the flag-gated redesign surfaces (home, dashboards, store, about, video, contact, gallery, prism) ON/OFF at runtime with **no Render redeploy**. Backend = `flags`/`flag_overrides`/`flag_audit`/`flag_health` tables + a PURE fail-safe resolver; public-flags overlays overrides on the env baseline. Migration **auto-runs on Render deploy** (`render.yaml` buildCommand → `npm run migrate:production`).
- Rebuilt the **home hero** (`HeroOptics.tsx`) to Sean's "Swan resolves" direction: `swan.mp4` video under a dimmed optics canvas, crystallize kept, giant Swan mark (`Logo.png`, `mix-blend-mode: screen` drops the dark disc over video) resolving in as the payoff.
- Restored the **contact** Swan-video hero ("The Swan Answers") reusing a new shared `ui-kit/cinematic/SwanVideoBackdrop` primitive (ref-muted autoplay, poster fallback, offscreen/tab-hide pause, data-saver → poster) — the production-safe video lives in ONE place now.
- Shipped **R3 preview-as**: each Launch Control row has a "👁 Preview" link → opens the surface with `?swanpreview=<flag>` for THAT browser only. Gated by a `swan_preview_ok` localStorage marker that ONLY the admin-gated board sets. Flag precedence is now: **preview > runtime (kill switch) > localStorage QA > env**.
- Reviewer this session was **Kimi K3** (two hostile passes, both SHIP-WITH-CHANGES); all real defects fixed (hero autoplay/battery/blank-hero edge; flag atomic-audit + honest health chip). No triangle/Village run.

## Why it matters to Hermes
- "Flip a redesign live" is now a 1-tap admin action, not a deploy — if Sean asks to turn a surface on/off, the answer is Launch Control, NOT a Render env var change.
- All redesign surfaces are DEPLOYED but DARK behind flags except `galleryVNext` (on). Don't assume a surface is un-built because it's not visible — it's flag-gated.
- Preview-as means Sean can see a dark vNext privately; if he says "I can't see it," check whether he's flipped the flag vs just previewing.

## State right now
- On main (deploying at memo time): 8+ commits ending ~`f5afada77`. Home + contact heroes flag-dark; Launch Control live once deploy finishes.
- Kimi flag-system roadmap R1-R9 is queued; Sean has NOT yet picked the next one (candidates: R1 fail-dark, R2 instant-refetch, R6 one-click retirement, R5 auto-kill, R7 audit-history UI).
- Deferred: contact form-internal UX (intent chips, name+email one row); gate telemetry wiring (light the health chips from real ErrorBoundary events); server-side admin gate to harden preview.
- Coordination: Codex pushed a `scripts/design-brain/*` novelty-dial commit to main mid-session; merged cleanly (no file overlap).

## Sean owes / blockers (if any)
- Sean to (a) verify the deploy + open Launch Control, (b) use Preview links / flip home+contact+about+store+video on when happy, (c) pick the next flag-system roadmap item.
- Known non-blocking limitation: the `swan_preview_ok` preview marker persists on a shared browser after logout (non-secret — vNext is deployed code).
