# SwanStudios UI/UX Redesign - Master Implementation Prompt
## Version 2.0 | February 2026

---

## Role

You are acting as a **Principal Product Designer + Staff Frontend Engineer + QA Lead** for SwanStudios (`SS-PT`), a social-media-enabled personal training platform at [sswanstudios.com](https://sswanstudios.com).

---

## Mission

Upgrade the UX/UI and frontend architecture to enterprise quality - pixel-perfect, mobile-first, and distinctively branded - without breaking backend functionality, existing APIs, RBAC, billing/session logic, or schedule behavior.

---

## Business Context

- **Platform**: Personal training SaaS with social features, session booking, scheduling (MindBody-style), e-commerce store, client/trainer/admin dashboards
- **Tech Stack**: React 18 + Vite + TypeScript, styled-components (Galaxy-Swan theme), Redux Toolkit, React Router v6, Framer Motion, MUI (partial), Lucide icons
- **Hosting**: Render (auto-deploy on push to `main`)
- **Priority**: Monetization-critical training workflows first, social features second

### Business KPIs (Measure Before and After Each Phase)
| Metric | Where Measured | Hard Fail Gate | Soft Target |
|--------|---------------|---------------|-------------|
| Package purchase conversion | Store -> Checkout -> Success | Must not drop below 90% of baseline | Improve over baseline |
| Failed checkout rate | Checkout error/abandon events | Must not increase more than 10% over baseline | Reduce |
| Session booking completion | Schedule -> Create/Book -> Confirmed | Must not drop below 90% of baseline | Improve over baseline |
| Admin task completion time | Dashboard CRUD operations | Must not increase more than 20% | Hold steady |
| Bounce rate (homepage) | Analytics / session duration | Must not increase more than 15% | Reduce after redesign |
| Time to first interaction | LCP + INP | LCP < 4s, INP < 500ms (absolute max) | LCP < 2.5s, INP < 200ms |

**Measurement protocol:** Capture baseline numbers during Phase 0 using analytics. After each Phase 3 page rollout, compare against baseline for 48 hours minimum before proceeding. Any hard fail gate breach triggers immediate rollback.

### Theme Direction Candidates (owner will choose after seeing 5 concepts):
1. **Nature Wellness** - Blue sky, grass prairie fields, poppy fields, sunflower fields, ocean, cherry blossoms, exotic plants, fresh air
2. **Cyberpunk Premium** - Neon-drenched, high-tech, dark futuristic
3. **Marble Professional Luxury** - Ultra-clean, refined, marble textures, gold accents
4. **Hybrid** - Nature meets tech (organic forms with precise engineering)
5. **Fun & Bold** - Playful, energetic, unexpected - because "it should be fun"

---

## Design Philosophy (Informed by Anthropic Frontend-Design Skill)

> Source: [anthropics/skills/frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)

### Before Coding, Commit to a BOLD Aesthetic Direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme - brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial, brutalist, art deco, soft/pastel, industrial. Use these for inspiration but design one that is TRUE to the aesthetic.
- **Differentiation**: What makes this UNFORGETTABLE? What is the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute with precision. Bold maximalism and refined minimalism both work - the key is **intentionality, not intensity**.

### Aesthetic Rules:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. AVOID generic fonts (Arial, Inter, Roboto, system fonts). Pair a distinctive display font with a refined body font. Use Google Fonts or self-hosted.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables/theme tokens for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Prioritize high-impact moments - one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth - gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

### NEVER Use (Anti-Patterns):
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliche color schemes (purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter designs lacking context-specific character
- The same design repeated across concepts - VARY between light/dark, different fonts, different aesthetics

### Match Complexity to Vision:
- Maximalist designs need elaborate code with extensive animations and effects
- Minimalist designs need restraint, precision, and careful attention to spacing, typography, and subtle details
- Elegance comes from executing the vision well

---

## UI/UX Pro Max Intelligence (Supplementary)

> Source: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

### Rule Categories by Priority:
1. **CRITICAL - Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support, focus management, ARIA roles, color contrast >= 4.5:1 (text), >= 3:1 (large text/UI)
2. **CRITICAL - Touch & Interaction**: Min 44x44px touch targets, proper hit areas, gesture support, hover fallbacks on mobile
3. **HIGH - Performance**: Lazy loading, code splitting, image optimization, efficient re-renders, bundle analysis
4. **HIGH - Layout & Responsive**: Mobile-first breakpoints, fluid typography (clamp()), container queries where supported, no horizontal scroll on mobile
5. **MEDIUM - Typography & Color**: Purposeful font scale (rem), consistent vertical rhythm, semantic color tokens
6. **MEDIUM - Animation**: 60fps, prefers-reduced-motion respect, GPU-promoted transforms only, no layout-thrashing animations
7. **MEDIUM - Style Selection**: Cohesive design language, appropriate for audience and industry
8. **LOW - Charts & Data**: Clear data visualization, accessible charts, responsive chart sizing

### Pre-Delivery Checklist:
- [ ] All interactive elements keyboard accessible
- [ ] Touch targets >= 44px
- [ ] Color contrast passes WCAG AA
- [ ] Responsive at 320px through 3840px (mobile through 4K)
- [ ] No layout shift on load (CLS < 0.1)
- [ ] Animations respect prefers-reduced-motion
- [ ] Images lazy-loaded with proper alt text
- [ ] Focus states visible and styled
- [ ] Error states clear and actionable
- [ ] Loading states present for async operations
- [ ] Orientation changes handled (portrait <-> landscape)
- [ ] iOS safe-area-inset respected (notch, home indicator)
- [ ] Virtual keyboard / IME does not obscure focused inputs
- [ ] Dynamic viewport units (dvh/svh) used where appropriate for mobile

---

## Current Site Architecture (UI Inventory)

### User-Facing Pages:
| Page | Route | Component Location |
|------|-------|-------------------|
| Homepage/Landing | `/` | `pages/HomPage/EnhancedHomePage.tsx` |
| Login | `/login` | `pages/login/Login.tsx` |
| Sign Up | `/signup` | `pages/signup/SignUp.tsx` |
| Store | `/store`, `/shop` | `pages/Shop/*.tsx` |
| Contact | `/contact` | `pages/contact/ContactPage.tsx` |
| About | `/about` | `pages/about/AboutContent.tsx` |
| Client Dashboard | `/client-dashboard` | `components/ClientDashboard/` |
| Trainer Dashboard | `/trainer-dashboard` | `components/TrainerDashboard/` |
| Admin Dashboard | `/dashboard/*` | `components/DashBoard/` |
| Universal Schedule | `/dashboard/admin/master-schedule` | `components/UniversalMasterSchedule/` |
| User Dashboard | `/user-dashboard` | (lazy loaded) |

### Shared Components:
- **Header**: `components/Header/header.tsx` -> delegates to `NavigationLinks.tsx`, `MobileMenu.tsx`, `Logo.tsx`, `ActionIcons.tsx`
- **Layout**: `components/Layout/layout.tsx` (wraps Header + main content)
- **ErrorBoundary**: `components/ui/ErrorBoundary.tsx`
- **DashboardSelector**: `components/DashboardSelector/`

### Current Theme System:
- `styles/galaxy-swan-theme.ts` - Primary theme tokens (colors, gradients, shadows, spacing)
- styled-components with transient props (`$active`, `$density`, etc.)
- Some MUI components mixed in (IconButton, Box, etc.)
- Partial CSS variables usage
- Framer Motion for animations

### Known Pain Points:
- Inconsistent styling (some pages use Galaxy-Swan theme, others use inline/ad-hoc styles)
- Homepage is text-heavy, lacks visual hierarchy and memorable design moments
- Mobile responsiveness is inconsistent across pages
- MUI + styled-components mixing creates bundle bloat and style conflicts
- No formal design tokens system (theme file exists but is not comprehensive)
- Navigation does not highlight current page consistently on all routes

---

## Non-Negotiable Constraints

1. **Do NOT break backend contracts or route behavior** - Every existing API call, route, and data flow must continue working
2. **Do NOT regress RBAC/privacy** - Client sees only own data, trainer only assigned clients, admin rules explicit
3. **Do NOT introduce AI-slop defaults** - No generic purple gradients, no system fonts, no cookie-cutter templates
4. **Maintain production-safe incremental rollout** - Feature flags or route-level swaps where needed. Never deploy a half-broken page.
5. **Mobile-first, pixel-accurate responsiveness across ALL display sizes** - Full breakpoint matrix:
   - `320px` - iPhone SE (minimum supported width)
   - `375px` - iPhone 13/14
   - `430px` - iPhone 15 Pro Max
   - `768px` - iPad / tablets
   - `1024px` - iPad Pro / small laptops
   - `1280px` - Standard laptops
   - `1440px` - Common desktop / MacBook Pro 16"
   - `1920px` - Full HD (1080p)
   - `2560px` - QHD / 1440p monitors
   - `3840px` - 4K / UHD displays

   **Large display rules**: Content must NOT stretch edge-to-edge on ultrawide/4K - use `max-width` containers with centered layouts. Typography, spacing, and grid columns should scale up gracefully. Images/cards should fill available space without looking sparse. Consider 3-4 column grids on 1440p and 4-6 columns on 4K where appropriate.

   **Mobile device rules**: Respect `safe-area-inset-*` for notched devices. Use `dvh`/`svh` for full-screen sections (not `100vh` which breaks on mobile with address bar). Handle orientation changes gracefully. Ensure virtual keyboard does not obscure focused inputs (use `visualViewport` API or scroll-into-view).

6. **Preserve all existing functionality** - Every button, form, modal, and interaction must still work after restyling
7. **No new dependencies without justification** - Prefer leveraging existing stack (styled-components, Framer Motion, Lucide) over adding new UI libraries

---

## Visual QA & Browser Automation Setup

### Playwright MCP (Recommended Primary)
> Source: [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

MCP configuration for `.claude/mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Two modes of operation** (use both as appropriate):
- **Accessibility snapshots** - Structured text representation of the DOM. Token-efficient. Best for verifying element presence, ARIA roles, text content, and functional correctness. Use this as the default mode.
- **Visual screenshots** (`--caps "vision"`) - Actual pixel capture. Use for layout verification, spacing checks, color/contrast auditing, and visual regression comparison. More token-heavy but necessary for design QA.

**Key flags**:
- `--browser chromium` (works with Brave as Chromium-based)
- `--headless` for CI, headed for visual QA
- `--viewport-size "375x812"` for mobile testing
- `--caps "vision,devtools"` for screenshot + devtools access

**Brave Compatibility**: Brave is Chromium-based, so Playwright's `chromium` channel works. For persistent profile with Brave specifically:
```
--browser chromium --user-data-dir /path/to/brave/profile
```

### Chrome DevTools MCP (Supplementary)
Provides direct Console, Network, and Performance Profiler access. Useful for:
- Checking LCP/CLS/INP metrics
- Capturing console errors during interactions
- Network waterfall analysis

### Seed Data Contract
**All QA runs MUST use the same fixture data for reproducible comparisons.**
- **Fixture file**: `backend/scripts/seed-qa-data.mjs` (create if missing)
- **Reset command**: `node backend/scripts/seed-qa-data.mjs --reset`
- **Required fixture accounts** (resolved by email, not hardcoded ID):
  - Admin: `qa-admin@swanstudios.test` (role: admin)
  - Trainer: `qa-trainer@swanstudios.test` (role: trainer, has sessions assigned)
  - Client: `qa-client@swanstudios.test` (role: client, has active package + booked sessions)
  - At least 3 sessions on today's date (for schedule views)
  - At least 2 store packages (for store/checkout flow)
- **Canonical method**: The seed script MUST use upsert-by-email (findOrCreate), then resolve the actual database IDs at runtime. This prevents breakage on non-clean databases where IDs 1/4/5 may already be taken.
  ```javascript
  // Example pattern in seed script:
  const [admin] = await User.findOrCreate({
    where: { email: 'qa-admin@swanstudios.test' },
    defaults: { firstName: 'QA', lastName: 'Admin', role: 'admin' }
  });
  ```
- **Rule**: If fixture file does not exist yet, create it during Phase 0. All QA screenshots and flow tests use this data.

### Visual QA Protocol
**Fixed test conditions for reproducible comparisons:**
1. Reset to seed data before each QA run (see Seed Data Contract above)
2. Deterministic viewport list (all 10 breakpoints defined above)
3. Screenshot naming convention: `{page}-{breakpoint}w-{variant}.png`
   - Example: `homepage-375w-dark.png`, `store-1440w-light.png`
4. Diff thresholds (global defaults):
   - 0.5% pixel difference = investigate
   - 2% pixel difference = fail
5. **Component-level overrides for monetization zones** (stricter thresholds):
   - Hero CTA button/section: 0.1% = investigate, 0.5% = fail
   - Checkout button/form: 0.1% = investigate, 0.5% = fail
   - Store "Add to Cart" button: 0.1% = investigate, 0.5% = fail
   - Session booking confirm button: 0.1% = investigate, 0.5% = fail
   These are captured as separate region screenshots (crop to component bounding box) and diffed independently.
6. Baseline screenshots taken BEFORE any changes (Phase 0)
7. Candidate screenshots taken AFTER each page refactor (Phase 3)
8. Compare baseline vs candidate for each page at each breakpoint

### Visual Diff Tooling
**Required implementation** (choose one, configure during Phase 0):
- **Option A: Pixelmatch** (lightweight, zero-dependency)
  ```bash
  npm install --save-dev pixelmatch pngjs
  ```
  Compare script: reads baseline + candidate PNGs, outputs diff image + mismatch percentage. Fail if mismatch > 2%.
- **Option B: Playwright built-in snapshot comparison**
  ```typescript
  await expect(page).toHaveScreenshot('homepage-375w.png', {
    maxDiffPixelRatio: 0.02, // 2% threshold
  });
  ```
  Stores snapshots in `__screenshots__/` directory with auto-generated diffs on failure.

**Whichever option is chosen**, the diff tool MUST:
- Output a numeric mismatch percentage per comparison
- Generate a visual diff image highlighting changed pixels
- Return a non-zero exit code when threshold is exceeded
- Be runnable via a single npm script: `npm run qa:visual-diff`

**Workflow per page:**
1. Start local dev server (`npm run dev` in frontend)
2. Use Playwright MCP to navigate to the page
3. Take accessibility snapshot first (verify functional correctness)
4. Take screenshots at all 10 breakpoints
5. Verify interactive elements (dropdowns, modals, forms)
6. Check contrast ratios and focus states
7. Document any regressions in a QA report

---

## Execution Plan

### Phase 0: Audit + Baseline (Before Any Design Work)

**Deliverables:**
- [ ] Complete UI inventory of all user-facing pages (DONE - see table above)
- [ ] Current pain points: layout, responsiveness, accessibility, interaction friction
- [ ] Performance baseline (LCP/CLS/INP per page, scroll jank hotspots)
- [ ] RBAC/privacy touchpoints that could break with UI refactors
- [ ] Baseline screenshot gallery at all 10 breakpoints for every page

**Definition of Done:**
- Baseline screenshots saved to `docs/qa/baseline/` with naming convention
- Performance numbers recorded in a table
- RBAC risk register lists every permission check and which component owns it
- All pain points documented with severity (blocks monetization / cosmetic / nice-to-have)

**Fail gate:** Do not proceed to Phase 1 until baseline is captured. You cannot measure regression without a baseline.

---

### Phase 1: Design Exploration (Homepage - 5 Concepts)

Create 5 fully distinct homepage designs.

**IMPORTANT - Concept Route Safety:**
Design concept routes MUST be guarded behind a dev-only flag. They must NEVER ship to production.
```typescript
// In route config:
if (import.meta.env.VITE_DESIGN_PLAYGROUND === 'true') {
  routes.push(
    { path: '/designs/1', element: <DesignConcept1 /> },
    { path: '/designs/2', element: <DesignConcept2 /> },
    // ...
  );
}
```
Add `VITE_DESIGN_PLAYGROUND=true` to `.env.development` only. Do NOT add it to `.env.production` or Render env vars.

**Requirements per concept:**
- Each MUST include desktop (1440px+) and mobile (375px) variants
- Each MUST be genuinely different (not template variations)
- Each MUST include: hero section, value proposition, CTA, social proof, pricing hint, footer
- Each MUST have a clear path to the Store (monetization CTA)
- Each MUST work with the existing Header/Footer or provide replacement designs for them

**Concept Directions** (one per design):
1. **Nature Wellness** - Organic shapes, earth tones, sky blues, botanical imagery, breathing animations, cherry blossom accents
2. **Cyberpunk Premium** - Dark base, neon cyan/magenta, glitch effects, grid overlays, tech-forward typography, holographic cards
3. **Marble Luxury** - Clean white/cream, gold/brass accents, serif typography, marble textures, subtle parallax, premium feel
4. **Hybrid Nature-Tech** - Organic forms meet precise engineering, bioluminescent colors, fluid gradients, nature photography with tech overlays
5. **Fun & Bold** - Bright unexpected colors, playful typography, interactive micro-animations, asymmetric layouts, personality-forward

**For each design, document:**
- Rationale and mood
- Typography choices (display + body fonts with Google Fonts links)
- Color palette tokens (primary, secondary, accent, background, surface, text hierarchy)
- Interaction language (how buttons feel, how pages transition, what animates)
- One "unforgettable moment" - the thing someone remembers
- How the monetization CTA (Store link / pricing) is presented

**Definition of Done:**
- 5 distinct, working homepage designs accessible at `/designs/1` through `/designs/5` (dev only)
- Each renders without errors at 375px and 1440px minimum
- Each has documented rationale, palette, and typography
- Owner has reviewed all 5 and selected top 2 favorites

**Fail gate:** Do not proceed to Phase 2 until owner has explicitly chosen favorites.

---

### Phase 2: Decision + Design System

**After owner picks a direction:**
- [ ] Decision matrix scoring all 5 (brand fit, conversion clarity, implementation risk, accessibility, mobile usability)
- [ ] Chosen direction documented with owner sign-off
- [ ] Design system tokens extracted:
  - Colors (CSS variables + styled-components theme)
  - Typography scale (font families, sizes, weights, line heights)
  - Spacing scale (4px base grid)
  - Border radius tokens
  - Shadow tokens
  - Motion tokens (duration, easing curves)
- [ ] Component standards document (button styles, card patterns, form inputs, navigation behavior)
- [ ] Responsive behavior rules (breakpoints, layout shifts, touch adaptations)
- [ ] New theme file created at `styles/swan-theme-v2.ts` alongside existing `galaxy-swan-theme.ts`

**Definition of Done:**
- `swan-theme-v2.ts` exists with complete token set
- ThemeProvider wrapper can switch between v1 and v2 via feature flag
- At least 3 core components (Button, Card, Input) rebuilt with new tokens
- Visual comparison shows new components match the chosen concept direction

**Fail gate:** Do not proceed to Phase 3 until theme file is complete and core components pass visual review.

---

### Phase 3: Page-by-Page Implementation

**Order** (monetization-critical first):
1. **Homepage** - First impression, conversion funnel entry
2. **Store/Package Flows** - Revenue generation (purchase conversion must not regress)
3. **Client Dashboard** - Core user experience (session booking must not regress)
4. **Universal Master Schedule** - Core training workflow
5. **Trainer Dashboard** - Trainer retention
6. **Admin Dashboard** - Internal tooling (lower priority for polish)
7. **Auth Pages** (Login/Signup) - Conversion rate impact
8. **Contact/About** - Brand polish

**For each page:**
- [ ] Read existing component thoroughly
- [ ] Identify all business logic, API calls, state management to PRESERVE
- [ ] Restyle UI layer only - do NOT touch data fetching, RBAC checks, or Redux logic
- [ ] Test at all 10 breakpoints before moving on
- [ ] Verify all interactive elements still function (forms submit, modals open, dropdowns work)
- [ ] Run Playwright MCP visual check (accessibility snapshot + screenshots)
- [ ] Compare candidate screenshots against baseline (Phase 0)
- [ ] For Store/Schedule pages: verify end-to-end flows still complete (add to cart, book session, etc.)

**Definition of Done (per page):**
- Page renders without console errors at all 10 breakpoints
- All existing functionality preserved (manual verification)
- Screenshot comparison against baseline shows intentional changes only
- No RBAC regressions (tested with client, trainer, and admin accounts)
- Performance: LCP < 2.5s, CLS < 0.1, INP < 200ms

**Fail gate:** Do not move to the next page until the current page passes all checks. Fix forward, not past broken pages.

---

### Phase 4: QA + Automation

- [ ] Visual regression screenshots at all 10 breakpoints for all pages
- [ ] Accessibility audit (keyboard nav, contrast, focus, ARIA) per page
- [ ] Performance check per page (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] Cross-browser check (Chrome, Brave, Firefox, Safari via WebKit)
- [ ] Mobile device matrix (iPhone SE, iPhone 13, iPhone 15 Pro Max, Pixel 7, Galaxy S24)
- [ ] Large display matrix (1440p @ 2560px, 4K @ 3840px, ultrawide @ 3440px)
- [ ] Verify max-width containers prevent edge-to-edge stretch on 4K
- [ ] Verify grid columns scale appropriately (2 -> 3 -> 4 -> 6 columns as width increases)
- [ ] Verify typography remains readable at all sizes (fluid clamp() values)
- [ ] Orientation test: portrait and landscape on tablet/phone viewports
- [ ] iOS safe-area test: notch and home indicator do not obscure content
- [ ] Virtual keyboard test: focused inputs remain visible when keyboard opens
- [ ] End-to-end monetization flow test: homepage -> store -> add to cart -> checkout

**Definition of Done:**
- QA report document with pass/fail per page per check
- All critical/high issues resolved
- Medium issues documented with tickets for follow-up
- Owner sign-off on final visual state

---

## Release Controls

### Dark Launch Strategy

**Important**: Vite `VITE_*` env vars are **build-time only** - they are baked into the JS bundle at build. Changing them in Render requires a redeploy. For true instant rollback, use a **runtime flag** instead:

**Option A: Runtime remote flag (preferred for instant rollback)**
```typescript
// In app init or ThemeProvider:
const THEME_CACHE_KEY = 'ss_theme_flag';
const THEME_FETCH_TIMEOUT_MS = 1500;

async function resolveThemeFlag(): Promise<boolean> {
  // 1. Serve from localStorage cache immediately to prevent flicker
  const cached = localStorage.getItem(THEME_CACHE_KEY);
  const fallback = cached === 'true';

  try {
    // 2. Fetch fresh value with timeout so slow network never blocks render
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), THEME_FETCH_TIMEOUT_MS);
    const res = await fetch('/api/feature-flags', { signal: controller.signal });
    clearTimeout(timer);
    const flags = await res.json();
    const fresh = flags.useNewTheme ?? false;

    // 3. Update cache for next load
    localStorage.setItem(THEME_CACHE_KEY, String(fresh));
    return fresh;
  } catch {
    // Network error or timeout: use cached value, never block render
    return fallback;
  }
}
```
Backend serves flags from a simple JSON config or database row. Change the flag, no redeploy needed. The localStorage cache prevents flash-of-wrong-theme on page load; the 1.5s timeout ensures slow networks never block rendering.

**Option B: Build-time flag (simpler, requires redeploy to rollback)**
```
# .env.production on Render
VITE_USE_NEW_THEME=true
```
Rollback = set to `false` + trigger Render redeploy (takes 2-5 minutes).

**Rollout stages:**
1. Initial: Enable for admin accounts only (test in production)
2. Staged: Enable for all authenticated users
3. Full: Enable for all visitors (including unauthenticated)

**Rollback triggers** (any of these = immediate rollback):
- Checkout completion rate drops > 5% vs baseline
- Session booking rate drops > 5% vs baseline
- Console error rate spikes > 2x baseline
- LCP exceeds 4s on any page
- Any hard fail gate from the KPI table is breached

### Telemetry Events (Add to Key Interactions)
```typescript
// Pattern: track before/after redesign
gtag('event', 'store_cta_click', { theme: 'v2', page: 'homepage' });
gtag('event', 'checkout_complete', { theme: 'v2' });
gtag('event', 'session_booked', { theme: 'v2' });
```

---

## Key Technique: The "5 Designs" Method

From research on AI-driven design workflows, this technique dramatically improves design output:

> "When the model within its context is doing multiple different designs with the instruction of making them unique, you are more likely to get unique designs than if you just roll five times - because it knows the other four designs and goes out of its way to make sure this one is unique."

**Workflow:**
1. Generate 5 distinct designs in a single session
2. Have the owner pick their 2 favorites
3. Tell the model what was liked about those 2
4. Generate 5 more iterations inspired by the favorites
5. Iterate until the direction is locked

This works because the model can reference all designs within context and intentionally differentiate. The key insight: Opus with the frontend-design skill is significantly better at **iterating on favorites** than other models - it understands what you liked and builds on it, rather than generating from random templates.

---

## Implementation Notes

### What to Keep:
- All Redux slices and state management
- All API service files and hooks (useCalendarData, etc.)
- All RBAC logic and permission checks
- All route definitions and lazy loading
- ErrorBoundary component
- Drag-and-drop infrastructure (@dnd-kit)

### What to Replace/Upgrade:
- Galaxy-Swan theme -> New design system tokens (`swan-theme-v2.ts`)
- Inconsistent styled-components -> Unified component library
- Ad-hoc responsive breakpoints -> Standardized breakpoint system (10 breakpoints)
- Mixed MUI + styled-components -> Prefer styled-components (reduce MUI surface area over time)
- Generic page layouts -> Distinctive, branded layouts per the chosen direction

### Migration Strategy:
1. Create `swan-theme-v2.ts` alongside existing `galaxy-swan-theme.ts`
2. Add ThemeProvider wrapper that reads `VITE_USE_NEW_THEME` flag
3. Migrate page-by-page, testing each before moving on
4. Once all pages migrated and owner approves, remove old theme
5. Clean up feature flag and ThemeProvider branching

---

## Sources & References

- [Anthropic Frontend Design Skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- [UI/UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Playwright MCP Server](https://github.com/microsoft/playwright-mcp) - Microsoft official browser automation MCP
- [skills.sh](https://skills.sh) - Skill directory and leaderboard
- [Best MCP Servers 2026](https://www.builder.io/blog/best-mcp-servers-2026) - Builder.io comparison
