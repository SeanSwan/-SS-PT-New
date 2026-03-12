# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 43.4s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 11:48:35 AM

---

As the Lead UI/UX Architect and Co-Orchestrator, I have reviewed the backend API contracts for the Gallery and AI Form Analysis systems. 

The secondary scanner provided generic, surface-level observations. We are building a **premium, high-ticket SaaS platform**, not a basic CRUD app. The backend reveals a highly sophisticated feature set (AI pose estimation, VIP conversion funnels, print-on-demand, micro-transactions). If the frontend UI looks like a standard Bootstrap or Material template, we will fail to justify the $175 VIP price tag or the print markups.

Here is my authoritative design vision and exact implementation directives for Claude to execute.

---

### 1. DESIGN VISION: The "Crystalline Vault" Experience
The Gallery is a high-intent lead generation engine disguised as a photo viewing experience. It must feel like entering a **Deep-Ocean Luxury Vault**. 
*   **Backgrounds:** Deep, immersive `Midnight Sapphire #002060` transitioning into `Royal Depth #003080`.
*   **Surfaces:** Frosted glass (glassmorphism) using `Frost White #E0ECF4` at 5-10% opacity with heavy background blur.
*   **Accents:** Interactive elements glow with `Ice Wing #60C0F0`. High-ticket/VIP elements are exclusively branded with `Gilded Fern #C6A84B`.
*   **Typography:** `Plus Jakarta Sans` for clean UI reading, `Sora` for numbers/pricing, and `Cormorant Garamond Italic` for dramatic, elegant headers (e.g., *"Your Moments, Immortalized"*).

---

### 2. DESIGN DIRECTIVES FOR CLAUDE

#### DIRECTIVE 1: The Access Gate (Event Password Screen)
*   **Severity:** CRITICAL
*   **Location:** Frontend route mapping to `POST /api/gallery/events/:slug/access`
*   **Design Problem:** Standard login forms feel cheap. This is the user's first impression of the event gallery. It needs to feel exclusive.
*   **Design Solution:** A centered, glassmorphic "Vault" card over a slow-moving, blurred background image of the event cover photo.
*   **Implementation Notes for Claude:**
    1.  Create `<VaultGateWrapper>`: `min-height: 100vh; display: grid; place-items: center; background: linear-gradient(to bottom, #002060, #003080);`
    2.  Implement `<GlassCard>`:
        ```css
        background: rgba(224, 236, 244, 0.03); /* Frost White ultra-sheer */
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(224, 236, 244, 0.1);
        border-radius: 24px;
        box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(224, 236, 244, 0.2);
        padding: 48px;
        ```
    3.  **Inputs:** Floating labels. Bottom-border only until focus, then expand to a full rounded rectangle with an `Ice Wing #60C0F0` glow (`box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.3)`).
    4.  **Animation:** Use Framer Motion. The card should `initial={{ opacity: 0, y: 20, scale: 0.95 }}` and `animate={{ opacity: 1, y: 0, scale: 1 }}` with a `spring` transition (stiffness: 100, damping: 20).

#### DIRECTIVE 2: AI Form Analysis Overlay (The "Crystalline Scan")
*   **Severity:** HIGH
*   **Location:** Frontend consumer of `POST /api/gallery/analyze-form` & `formAnalysisService.mjs`
*   **Design Problem:** The backend takes time to fetch the image from R2 and run Gemini Vision. A standard spinner will cause users to abandon. The resulting skeleton data needs a stunning visualization.
*   **Design Solution:** A cyber-magical "scanning" state, followed by a glowing skeleton overlay mapped exactly to the COCO 17-keypoints.
*   **Implementation Notes for Claude:**
    1.  **Loading State:** While waiting for the API, overlay the photo with a `<Scanline>` component:
        ```css
        position: absolute;
        top: 0; left: 0; right: 0; height: 4px;
        background: #50A0F0; /* Arctic Cyan */
        box-shadow: 0 0 20px 4px rgba(80, 160, 240, 0.6);
        animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        /* @keyframes scan { 0% { transform: translateY(0); } 100% { transform: translateY(100%); } } */
        ```
    2.  **Skeleton Render:** Once data returns, use an HTML5 `<canvas>` overlaid on the image.
    3.  **Bones:** Draw lines between connected joints using `Frost White #E0ECF4` with `globalAlpha = 0.6` and `lineWidth = 3`.
    4.  **Joints:** Draw circles at keypoints. Fill: `#002060`, Stroke: `#60C0F0`, `lineWidth = 2`.
    5.  **Corrections (from `assessForm`):** If a joint has a correction (e.g., knee valgus), pulse that specific joint with `Wing Purple #8B5CF6` and attach a tooltip using `Fira Code` for the angle data (e.g., `158°`).

#### DIRECTIVE 3: The 402 Enhancement Upsell Flow
*   **Severity:** HIGH
*   **Location:** Frontend handler for `POST /api/gallery/enhancement-request` (when returning `402 credits_required`)
*   **Design Problem:** Hitting a paywall abruptly feels punitive. We need to pivot this into an exciting premium upgrade opportunity.
*   **Design Solution:** A bottom-sheet modal (mobile) or centered modal (desktop) that presents the pricing tiers as luxury cards.
*   **Implementation Notes for Claude:**
    1.  Intercept the `402` response. Do *not* show a toast error. Instead, trigger the `<CreditUpsellModal>`.
    2.  **Tier Cards:** Display the 3 tiers (`single`, `bundle5`, `vip`).
    3.  **VIP Tier Styling:** The VIP tier ($175) must dominate the visual hierarchy.
        ```css
        background: linear-gradient(135deg, rgba(198, 168, 75, 0.1), rgba(0, 32, 96, 0.8));
        border: 1px solid #C6A84B; /* Gilded Fern */
        box-shadow: 0 0 30px rgba(198, 168, 75, 0.15);
        position: relative;
        transform: scale(1.05);
        z-index: 10;
        ```
    4.  Add a subtle shimmer effect across the VIP card using a CSS pseudo-element with a linear gradient translating across the X-axis.

#### DIRECTIVE 4: High-Performance Photo Grid & Interactions
*   **Severity:** HIGH
*   **Location:** Frontend consumer of `GET /api/gallery/events/:slug/photos`
*   **Design Problem:** Rendering hundreds of photos will destroy mobile performance and feel clunky without proper choreography.
*   **Design Solution:** Virtualized masonry grid with staggered reveals and micro-interactions.
*   **Implementation Notes for Claude:**
    1.  Use `react-virtuoso` or a similar virtualization library for the masonry grid.
    2.  **Image Loading:** Use the `thumbnailUrl` first, blurred. Transition to `url` once loaded.
    3.  **Hover State (Desktop):**
        ```css
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        &:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(96, 192, 240, 0.3); /* Ice Wing glow */
          z-index: 2;
        }
        ```
    4.  **Action Bar:** On hover/tap, reveal a glassmorphic action bar at the bottom of the photo containing: [Enhance ✨] [Vote 👍/👎] [Print 🖼️].

#### DIRECTIVE 5: VIP Conversion Wizard (The $175 Package)
*   **Severity:** CRITICAL
*   **Location:** Frontend flow for `/vip-signup` -> `/vip-checkout`
*   **Design Problem:** The backend requires a multi-step process (create user -> stripe checkout -> activate). If the UI feels disjointed, conversion rates will plummet.
*   **Design Solution:** A seamless, state-driven "Black Card" wizard.
*   **Implementation Notes for Claude:**
    1.  Create a unified `<VipConversionWizard>` component that manages the state across the 3 backend endpoints.
    2.  **Step 1: Account Creation:** "Secure your VIP Access". Use `Plus Jakarta Sans`.
    3.  **Transition:** When `/vip-signup` succeeds, do *not* reload the page. Slide the form out to the left, and slide in the Checkout summary from the right using Framer Motion (`x: 100%` to `x: 0`).
    4.  **Urgency Banner:** The backend exposes `GET /api/gallery/vip-spots`. Fetch this. If spots < 5, display a sticky banner at the top of the wizard: `font-family: 'Sora'; color: #C6A84B;` "Only {spots} VIP Unlimited spots remaining for this event."

#### DIRECTIVE 6: Print-on-Demand Drawer
*   **Severity:** MEDIUM
*   **Location:** Frontend consumer of `/print-products` and `/print-order`
*   **Design Problem:** Users need to understand what they are buying (Canvas vs Metal vs Print) without leaving the gallery context.
*   **Design Solution:** A right-side sliding drawer (desktop) or bottom sheet (mobile) that overlays the gallery.
*   **Implementation Notes for Claude:**
    1.  **Backdrop:** `background: rgba(0, 32, 96, 0.6); backdrop-filter: blur(8px);`
    2.  **Drawer Surface:** `background: #002060; border-left: 1px solid rgba(224, 236, 244, 0.1);`
    3.  **Product Selection:** Use large, touch-friendly radio cards (min 60px height). When selected, border turns `Arctic Cyan #50A0F0` and background shifts to `Royal Depth #003080`.
    4.  **Price Display:** Use `Sora` font, size `24px`, color `Frost White #E0ECF4`.

### Execution Mandate for Claude
Claude, when you implement these components, you are to strictly adhere to the CSS values, Framer Motion specs, and component architectures outlined above. Do not fall back to generic component libraries. Build these bespoke using `styled-components`. Prioritize the `402` Upsell and the VIP Conversion Wizard first, as these are the primary revenue drivers for the platform.

---

*Part of SwanStudios 7-Brain Validation System*
