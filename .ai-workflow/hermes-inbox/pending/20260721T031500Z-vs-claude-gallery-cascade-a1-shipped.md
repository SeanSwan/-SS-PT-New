---
surface: vs-claude
utc: 20260721T031500Z
topic: Gallery verdict corrected + Cascade A1 shipped (cascading-accordion event decks, live)
tags: [gallery-vnext, design-refactor, style-lens, launch-control]
---

## What I did / learned
- Sean flagged the gallery as possibly needing a structural refactor ("built after we abandoned flags"). Investigation PROVED the opposite: gallery-vnext was the PILOT (built before home/Launch Control), its gate is the template the other 6 surfaces copied, and it has no in-gallery theme picker (theming is 100% Style Lens). The real issue was Sean's DESIGN verdict: presentation reads tacky; he wants an exquisite, rare, cascading-accordion gallery.
- Kimi K3 ideation: VERDICT REBUILD-PRESENTATION (money spine + justified-row math stay). 3 directions; Direction A "Cascade" chosen (9.5 wow). Kimi's hostile review pinned the tells: blur-swap reveal, infinite hero sheen, flat dashboard-kit event cards, no lightbox choreography.
- SHIPPED Slice A1 to main (live — galleryVNext flag is ON): EventDeck.tsx (each event = deck of 6 strips cut from its COVER via background-position; hover fans a real accordion; touch/reduced-motion rest equal = cover reconstructs), waterfall stack, deal-in entrance, de-templated hero (ShimmerWord sheen deleted → static GradientWord), reserved z-0 VisualizerSlot for Sean's future music color-visualizer background.
- SAFETY CORRECTION to Kimi's design: its strips sliced per-event PHOTOS, but pre-unlock the API only exposes coverPhotoUrl (photos are paywalled) — slicing the cover keeps the identical visual with zero gated-data leakage.
- Money path untouched: gate, credits/VIP/referral/donation/print, ENTRY_SEARCH; money-truth tests 10/10.
- Standing law from Sean: NO per-surface theme pickers anywhere — the Style Lens is the only theming authority; new skins go INTO the Lens catalog. Kimi proposed 5 gallery/workout skins (Darkroom, Velocity, Chalk Dust, Arena Ice, Podium) + a hover-preview/commit-on-click Lens picker UX — queued for Sean.

## Why it matters to Hermes
- If Sean says "the gallery is broken/wrong," the architecture is NOT the problem — presentation slices are the active workstream (A2 next: FLIP lightbox, cadence accent rows, PhotosView hierarchy, PhotoTile reveal fix).
- The gallery events page LIVE look changed (decks instead of flat cards). Launch Control toggle = instant revert if Sean dislikes it.
- Future feature slot exists: gallery music color-visualizer mounts into VisualizerSlot with no relayout.

## State right now
- main @ d531a4e28 deploying (merged Codex's context-gateway lane; one benign CI-check conflict resolved as superset).
- Pending Sean: react to live decks · pick A2 go · Style Lens skin/UX proposals · flag roadmap (R1/R2/R6).

## Sean owes / blockers (if any)
- Sean to eyeball the live /gallery decks after deploy and say tune/keep/revert; then A2 build order.
