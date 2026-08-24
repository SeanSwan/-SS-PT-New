# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/NEXT-SLICE-PLAN-BRIEF-2026-08-20.md
**Tokens:** 1018 in / 11014 out (reasoning: 9031) | total 12032
**Wall:** 213.2s

---

# VERDICT UP FRONT

**Q1 — Slice A as written is the wrong shape at the right time.** Building product code (feature flag, V5 route, main deploy) against a direction the owner has not ratified is the 16th-rejection machine with extra steps. The impulse is correct — a scroll-journey direction *cannot* be approved from a static board; motion is the one thing rule 76's PNG gate cannot show. But the plan conflates the approval instrument with the product. Split it.

**Q2 — Back extracted-frames-on-canvas.** `video.currentTime` scrubbing on iOS Safari is asynchronous, coalesced, and keyframe-bound: with a normal 2s-keyframe MP4, seeks during momentum scroll render stale frames for hundreds of ms; fixing it with an all-intra re-encode produces a file the size of an image sequence anyway, minus the control. Canvas scrub gives deterministic frame→scroll mapping, identical cross-browser behavior, LRU memory control, and progressive loading. Budget I'd demand: mobile ≤ 240 frames @ ≤960w WebP/AVIF, avg ≤ 50KB (≈12MB ceiling, poster ≤ 200KB as LCP fallback), decoded-frame LRU ≤ 120MB with explicit bitmap eviction, drop-frame ratio < 5% on iPhone 12-class devices, zero long tasks > 50ms during scrub, hero chunk ≤ ~50KB gz and lazy. Kill-switch: flag default OFF; auto-downgrade to a single shared StaticHero fallback on `Save-Data`, `deviceMemory < 4`, rolling drop-ratio > 10%, frame-fetch error rate > 5%, plus `prefers-reduced-motion`. Note for Slice C: the 60fps master is a *source-quality* asset — you sample it, you never ship 900 frames.

---

## P0 — blocks Slice A

1. **[P0|Q1] Slice A builds unapproved direction into product architecture on main.** Remedy: split into A0 — a framework-agnostic approval probe (scrub engine sketch + liquid-chrome headline + CTA pair, deployed to a noindexed staging URL, time-boxed ≤ 3 days, *used as the owner's verdict instrument*) — and A1, productization, gated on sign-off.
2. **[P0|Q3] No interface contract with the mediasync agent; Slice A's core technique, memory model, and weight budget all depend on an undefined deliverable.** Remedy: written spec before any scrub code — ≤ 240–300 sampled frames, dual-width ladder (960w mobile / 2560w desktop), AVIF+WebP, poster, frame-manifest JSON, due date, merge owner.
3. **[P0|Q3] A shared unpushed branch 25+ commits ahead with a parallel agent is a standing-gate violation happening *right now*, not a future risk.** Remedy: push today; split into per-agent branches (mediasync owns media outputs only); PR + CI between them; enforce the batch-push gate or delete it.
4. **[P0|Q3] Both hero CTAs point at pages that may not exist ("Find a Trainer" → trainer directory? fee/training page stubbed nowhere) — a dead-end funnel in front of the owner poisons the verdict.** Remedy: define resolvable destinations (stub routes or interim targets) before any CTA renders in any artifact the owner sees.
5. **[P0|Q2] No kill-switch or runtime downgrade design; `prefers-reduced-motion` alone doesn't cover Save-Data, low-memory devices, thermal jank, or fetch failure.** Remedy: one StaticHero fallback component (designed poster frame, not frame 0) reused by every downgrade trigger listed above; flag default off; downgrades logged.
6. **[P0|Q2] "Technique open" means Slice A has no acceptance criteria and cannot pass any gate.** Remedy: decide now — canvas frame-sequence v1, single code path, budgets as stated above, `video.currentTime` desktop enhancement explicitly deferred.

## P1 — must land during A/B

7. **[P1|Q3] SEO/LCP unaddressed on a video-first hero: flagged V5 route will duplicate content and split crawl; canvas-hero risks a JS-dependent LCP.** Remedy: noindex + canonical→V4 while flagged; H1 as real DOM text (not chrome-effect canvas); verify SSR/prerender so crawlers and no-JS get headline + CTAs; poster is the LCP fallback.
8. **[P1|Q4] Zero analytics or decision framework — the flag will be flipped on vibes, which is how the last 15 rejections happened.** Remedy: pre-register events (hero_seen, scrub-depth quartiles, CTA clicks, fallback_downgrades) and ship criteria (CTA CTR ≥ V4 baseline, LCP p75 ≤ 2.5s, bounce neutral) before A1 sees traffic.
9. **[P1|Q1] A new dark-chrome hero bolted atop 13 V4 sections is a Frankenstein page; showing it contaminates the verdict on the hero itself.** Remedy: A0 is a hero-only page; A1 needs a designed transition band or simultaneous restyle of the first V4 section.
10. **[P1|Q4] Rule 76 cannot gate motion — you are repeating your documented root-cause failure in a new modality.** Remedy: motion clause — real-device screen recordings (iPhone Safari, mid-tier Android Chrome) plus a scrub FPS/dropped-frame table, viewed by the agent before presenting.
11. **[P1|Q4] The "responsive matrix 320→3840" is width-only; nobody named a device, browser, DPR, or network profile.** Remedy: pin a six-device matrix (iOS Safari 15+, mid Android Chrome, desktop Safari/Chrome/Firefox, DPR 1–3, Save-Data profile).
12. **[P1|Q3] Accessibility scoped to reduced-motion only.** Remedy: real-text headline, `aria-hidden` canvas, skip-past-scrub link so keyboard users aren't marched through 300vh, focus-visible contrast over chrome type, 44px targets, and a pause API in the component for the future autoplay worlds (WCAG 2.2.2).
13. **[P1|Q3] Rollback story is the word "feature flag."** Remedy: runbook — flag off = V4, canary 5→50→100%, auto-revert on error-rate or LCP regression, React error boundary around the hero so it cannot take the page down.
14. **[P1|Q4] Frame-delivery infrastructure unmentioned: 240 files need immutable hashed caching, a manifest, progressive idle preload after LCP, and a fetch-failure state (poster-hold, not blank canvas).** Remedy: bake CDN/cache strategy and failure states into the A1 acceptance list.
15. **[P1|Q3] 1280×704 source cannot feed the 2560w+ end of your own matrix; desktop scrub will be soft.** Remedy: dual-width ladder in the mediasync contract (finding 2) or an explicit, owner-visible decision to accept upscale.
16. **[P1|Q3] Copy drift will re-enter through Slice B: the 107/107 verbatim check exists for the board, not for styled-components ports.** Remedy: re-run the fidelity check on every ported section as a gate condition, not just render.
17. **[P1|Q3] Mis-order: Slice D defers honesty labeling while Slice B ships mock events/groups — the owner scrolling "live" sample data is a trust breach.** Remedy: SAMPLE-tag honesty ships with the *first* mock-bearing slice; Slice D keeps only the API wiring.

## P2 — backlog

18. **[P2] Slice A scope creep: the waterline fast-lane strip is a non-hero component inside a hero MVP.** Remedy: cut from A0; justify its presence in A1 as choreography or move to B.
19. **[P2] WebCodecs single-file scrub and CSS scroll-timeline() are credible future simplifications.** Remedy: one-day spike after C lands; do not touch v1.
20. **[P2|Q4] Nobody costed the hero: 10–15MB per engaged mobile visit is a CDN bill and a slow-network bounce risk.** Remedy: set a per-visit media cost ceiling with an alert; idle-preload only after LCP.
21. **[P2|Q4] No deep-linking or scroll-restoration story for scrub positions (back-navigation lands mid-journey, share links can't target sections).** Remedy: define hash anchors per scrub chapter when A1 productizes.

---

**Bottom line:** The plan's sequencing sin is building A before ratifying direction and before the mediasync contract exists — findings 1, 2, and 3 are each individually sufficient to stop the line. Cheapest de-risk is A0: a throwaway probe on staging that exists to extract a verdict, not to survive one.
