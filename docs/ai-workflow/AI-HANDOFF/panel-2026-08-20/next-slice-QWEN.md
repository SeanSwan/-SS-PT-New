# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/NEXT-SLICE-PLAN-BRIEF-2026-08-20.md
**Tokens (Ollama):** 1074 in / 1860 out | **Wall:** 84.9s | **done_reason:** stop

---
Here is the hostile review of the proposed plan.

### P0 Findings (Blocks Slice A)

1.  **Building on Unapproved Direction is Wasteful Churn**
    *   **Critique:** Slice A builds a complex, high-risk interactive component (scroll-scrubbing video) based on a board the owner has *not* approved. If the owner rejects the "cinematic scroll-journey" concept (which was one of the 15 rejected designs previously), you have wasted 2-3 days of engineering on a feature that will be deleted. The "cheapest de-risk" is not building the MVP; it is presenting the *static* board (which already exists and passed render gates) for approval *before* writing a single line of React for the hero.
    *   **Remedy:** Halt Slice A. Present the existing "Surface and Depth" board (static) to the owner for immediate verdict. Only start Slice A if "Cinematic Scroll" is explicitly approved.

2.  **LCP and SEO Catastrophe on Video-First Hero**
    *   **Critique:** A video-first hero on mobile Safari/Chrome with scroll-scrubbing will destroy LCP (Largest Contentful Paint) and Core Web Vitals. `video` elements are heavy; scrubbing via `currentTime` causes jank; canvas frame-scrubbing requires pre-loading 15s of frames (potentially 900+ images at 60fps) or heavy decoding. This violates the "0% dead space" and performance goals. You are proposing a performance regression on the most critical metric (LCP) without a mitigation strategy.
    *   **Remedy:** Mandate a static poster image (WebP/AVIF) as the LCP element. Video/Canvas must be lazy-loaded *after* LCP is achieved. Define a strict budget: <1.5s LCP, <100KB initial JS for hero.

3.  **Parallel Agent Merge Risk is Unmanaged**
    *   **Critique:** The mediasync agent is 25+ commits ahead on a shared branch. Slice A (React hero) and Slice C (60fps pipeline) are tightly coupled. If the mediasync agent pushes breaking changes to the video pipeline or asset structure while you are building the React scrubber, you face a massive merge conflict or runtime breakage. There is no mention of branch isolation, API contracts, or integration testing between the two agents.
    *   **Remedy:** Enforce strict branch isolation. Mediasync must publish a stable `video-manifest.json` and frame assets to a shared artifact store (S3/CDN) before Slice A begins. Slice A must consume only stable artifacts, not live branch state.

### P1 Findings (Must Land During A/B)

4.  **Missing Accessibility (A11y) for Scroll-Scrubbing**
    *   **Critique:** Scroll-driven video is inherently hostile to screen readers and `prefers-reduced-motion`. The plan mentions a "static hero" fallback but does not specify how the *content* (headline, CTA) remains accessible during the scrub. If the video is the primary visual, screen readers need a clear alternative text or aria-label for the hero section. The "liquid-chrome" type effect may also fail contrast checks if it relies on video background.
    *   **Remedy:** Define explicit `aria-label` for the hero section. Ensure text contrast ratio ≥ 4.5:1 against the *worst-case* video frame. Implement `prefers-reduced-motion` to disable scrubbing *and* replace video with a static image + normal scroll.

5.  **No Analytics/Conversion Measurement Plan**
    *   **Critique:** The plan mentions "CTA pair" but has zero strategy for measuring if the scroll-scrubbing *increases* or *decreases* conversion. Is the scroll interaction engaging users or distracting them? Without event tracking (scroll depth, video pause/resume, CTA clicks), you cannot prove the value of Slice A. This is a "vibe" feature, not a data-driven one.
    *   **Remedy:** Define 3 key metrics: (1) Scroll depth % on hero, (2) CTA click-through rate (CTR) vs. V4 baseline, (3) Time-on-page. Instrument these before launch.

6.  **Fee Page Disconnect**
    *   **Critique:** Copy was updated to strip fee numbers (P0 fix), but the plan does not mention where the "Find a Trainer" CTA leads. If it points to a page that doesn't exist or is outdated, you have a broken user journey. The "fee page" or "pricing" logic is missing from the slice plan.
    *   **Remedy:** Verify the target URL for "Find a Trainer" and "Join the Community." If the fee page is missing, add a Slice A.5: "Create/Update Pricing Page" before wiring CTAs.

7.  **Rollback Story is Vague**
    *   **Critique:** "Feature flag" is mentioned, but what happens if the scroll-scrubbing causes mobile crashes or battery drain? Is there a kill switch that reverts to V4 hero instantly? The plan does not specify the fallback mechanism.
    *   **Remedy:** Implement a `heroVersion` flag with values: `v4_static`, `v5_scrub`, `v5_static_fallback`. Default to `v4_static` until QA passes. Allow instant switch to `v5_static_fallback` if errors > 1%.

### P2 Findings (Backlog)

8.  **Slice B Ordering is Suboptimal**
    *   **Critique:** Slice B (porting board sections) is listed after Slice A. However, the board already exists and is render-verified. Porting the *static* sections (community, events, stats) is lower risk and higher value than the complex hero. Doing B before A allows you to ship a complete, static V5 page quickly, then layer the hero on top. This reduces the "big bang" risk.
    *   **Remedy:** Reorder: Slice A (Static V5 Sections) -> Slice B (Hero MVP) -> Slice C (60fps Upgrade).

9.  **Missing Performance Budget for Frame Extraction**
    *   **Critique:** "Extracted frames on canvas" for a 15s 60fps video is 900 frames. At 1280x704, this is ~500MB of data if uncompressed. Even compressed, it’s heavy. The plan does not address memory limits on mobile Safari (which has strict memory caps).
    *   **Remedy:** Limit frame extraction to 30fps (450 frames) or use video `currentTime` scrubbing with `preload="metadata"` and `muted` to avoid full load. Set a hard limit: <50MB total asset size for hero.

10. **No Mention of Image Optimization for Board Sections**
    *   **Critique:** Slice B ports "community aurora world," "event cards," etc. These likely contain images. The plan does not mention WebP/AVIF conversion, lazy loading, or responsive image sets (`srcset`). This will bloat page weight.
    *   **Remedy:** Add a gate: All images in Slice B must be <100KB, served as WebP/AVIF, with `loading="lazy"` and `srcset` for responsive breakpoints.

### Summary of Recommended Next Steps

1.  **STOP Slice A.** Do not build the scroll-scrub hero yet.
2.  **Present the Static Board** to the owner for approval. This is the cheapest de-risk.
3.  **If Approved:**
    *   **Slice A (New):** Port static board sections (community, events, stats) to React. Render-gate.
    *   **Slice B (New):** Implement static hero (poster image + CTA) as the LCP element.
    *   **Slice C (New):** Implement scroll-scrubbing as an *enhancement* behind a flag, with strict perf budgets and a11y fallbacks.
    *   **Slice D:** Wire up analytics and verify CTA targets.
4.  **Coordinate with Mediasync:** Ensure stable asset pipeline before starting any video work.

**Verdict:** The current plan is too aggressive, mis-ordered, and lacks critical performance/accessibility safeguards. It risks repeating the "rejected design" cycle by building a complex feature on an unapproved concept.
