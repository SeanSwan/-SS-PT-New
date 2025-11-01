# 🚀 Galaxy-Swan Theme v2.0: Master Blueprint

**Version:** 2.1 (Final)
**Status:** ✅ FINALIZED - Ready for AI Village Phase 0 Approval
**Created:** 2025-10-31

**Summary:** This document is the single source of truth for the Galaxy-Swan Theme v2.0. It consolidates the design vision with concrete technical specifications, performance budgets, architectural patterns, and AI Village integration protocols, based on reviews from Claude Code, Codex, and Roo Code.

---

## 0. 🚀 Quick Start for Developers (NEW)

**Before diving into the full blueprint, developers need a 5-minute overview.**

### What's New in v2.0?
1.  **Living Constellation** - Animated WebGL background (hero sections)
2.  **Frosted Glass** - New default surface material (replaces solid cards)
3.  **Parallax Layouts** - Depth and scrolling effects (public pages)
4.  **Cyberpunk Dashboard** - Neon theme for admin only

### Do I Need to Rewrite Existing Components?
**No!** v2.0 is **additive** and **opt-in**:
-   Existing components using v1.0 theme continue to work
-   New components use v2.0 features
-   Migration happens gradually over 4 weeks

### Where Do I Start?
1.  **Read this blueprint** (15 minutes)
2.  **Review existing v1.0 theme** at `docs/current/GALAXY-SWAN-THEME-DOCS.md`
3.  **Check component templates** at `docs/ai-workflow/component-docs/templates/`
4.  **Start with LivingConstellation** (simplest new component)

### Quick Reference: What Changed?
| Feature | v1.0 | v2.0 |
|:--------|:-----|:-----|
| Background | Static gradient | Animated constellation (WebGL) |
| Surfaces | Solid cards | Frosted glass (backdrop-filter) |
| Layout | Standard sections | Parallax + sticky (optional) |
| Dashboard | Galaxy theme | Cyberpunk theme (scoped) |
| Bundle Size | Baseline | +25KB max |

---

## 1. 🎭 Design Philosophy: "A Living Interface"

Our core principle of "Elegant Fusion" evolves. The interface is no longer a static design; it is a living, breathing environment that is responsive, tactile, and immersive. This is achieved through four pillars:

1.  **Depth:** We create an illusion of 3D space using parallax scrolling, layered elements, and perspective.
2.  **Materiality:** Surfaces have tangible properties. "Glass" is our primary material, creating a sense of transparency and focus.
3.  **Context:** The theme adapts its personality. Public-facing pages are elegant and immersive, while internal tools are futuristic and data-focused.
4.  **Performance:** The interface lives, but never at the cost of user experience. Effects scale with device capabilities, and critical content loads first.

---

## 2. 🎨 Core Color Palette & Usage

The v1.0 palette is maintained. All new components will draw from this established palette with strict application rules.

### Color Application Hierarchy
-   **Text:** Always use `swan.pure` (#FFFFFF) or `swan.silver` (#E8F0FF).
-   **Backgrounds:** `galaxy.void` → `galaxy.stardust` → `swan.pearl` (dark to light).
-   **Accents:** `swan.cyan` for primary CTAs, `galaxy.cosmic` for supporting actions.
-   **Data Viz:** Use `galaxy.pink`, `galaxy.nebulaPurple`, and `swan.cyan` for charts.

### Forbidden Combinations (Accessibility)
-   ❌ `swan.ice` on `swan.pearl` (low contrast).
-   ❌ `galaxy.cosmic` text on `galaxy.stardust` background (fails WCAG AA).
-   ✅ Use a utility like `themeUtils.getAccessibleColor(bg, fg)` to ensure compliance.

---

## 2.5 🎨 Enhanced Theme Object Structure (NEW)

### New v2.0 Theme Tokens
```typescript
// frontend/src/styles/galaxy-swan-theme-v2.ts
export const galaxySwanThemeV2 = {
  ...galaxySwanTheme, // Inherit all v1.0 tokens
  
  // NEW: Glass opacity tokens
  glass: {
    thin: 0.06,
    mid: 0.10,
    thick: 0.14,
    opaque: 0.95,
  },
  
  // NEW: Parallax timing functions
  parallax: {
    slow: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    medium: 'cubic-bezier(0.33, 0.66, 0.44, 1)',
    fast: 'cubic-bezier(0.44, 0.72, 0.52, 1)',
  },
  
  // NEW: Cyberpunk neon colors (dashboard only)
  cyberpunk: { // Refined for a unique, less jarring electric look
    electricTeal: '#0CF5E4',   // A vibrant, unique cyan-green
    hyperPink: '#F72585',      // A deep, energetic magenta
    plasmaViolet: '#9D4EDD',  // A rich, glowing purple
    darkBg: '#0a0a1a',         // Deep space background (unchanged)
    darkSurface: '#1e1e3f',    // Dark surface color (unchanged)
  },
  
  // NEW: Performance tier detection
  performanceTier: 'enhanced' | 'standard' | 'minimal', // Auto-detected
};
```

### Backward Compatibility
All v1.0 components will continue to work because `galaxySwanThemeV2` extends (not replaces) v1.0:
```typescript
// Old v1.0 component (still works)
const OldCard = styled.div`
  background: ${props => props.theme.swan.pearl}; // ✅ Still available
`;

// New v2.0 component (uses new tokens)
const NewCard = styled.div`
  background: ${props => props.theme.swan.mist};
  backdrop-filter: blur(14px);
  opacity: ${props => props.theme.glass.mid}; // ✅ New token
`;
```

---

## 3. ✨ Unified Visual Systems (The Core of v2.0)

### 3.1. The Living Constellation Background

This replaces static backgrounds on hero sections and key landing pages.

#### Technical Specifications
-   **Library:** Three.js or a custom WebGL shader.
-   **Performance Tiers:**
    -   **Enhanced (Default):** WebGL with 800-1200 particles (desktop) / 200-400 (mobile).
    -   **Standard:** Canvas 2D fallback for mid-tier devices.
    -   **Minimal:** Static gradient with SVG stars for low-end devices or if `prefers-reduced-motion` is enabled.
-   **Optimizations:**
    -   Pause animation when off-screen (`IntersectionObserver`) or tab is hidden (`visibilitychange`).
    -   Use a Web Worker or `OffscreenCanvas` to avoid blocking the main thread.
    -   Pool buffers and avoid per-frame memory allocations.
-   **Component API:**
    ```typescript
    // frontend/src/components/effects/LivingConstellation/LivingConstellation.tsx
    interface LivingConstellationProps {
      tier?: 'enhanced' | 'standard' | 'minimal'; // Auto-detected by default
      particleDensity?: number; // Overrides default
      interactionStrength?: number; // 0-1, default: 0.3
      isPaused?: boolean;
    }
    ```

### 3.2. Immersive Layout & Structure

A component-based system for creating narrative, single-page experiences.

#### Technical Specifications
-   **Mechanism:** Use CSS `position: sticky` and `transform`-based parallax for smooth, 60fps scrolling. Throttled `requestAnimationFrame` for calculations.
-   **Behavior:** Parallax effects are disabled on mobile and when `prefers-reduced-motion` is enabled.
-   **Required UI Kit Components:**
    -   `<ParallaxSection>`: Wrapper with `speed` and `background` props.
    -   `<StickyHeader>`: Galaxy-Swan themed sticky navigation.
    -   `<ContentFold>`: Full-screen section container.

### 3.3. Frosted Glass Surfaces

The new default material for UI cards, modals, and containers.

#### Technical Specifications
-   **Effect:** Use `backdrop-filter: blur(14px)`.
-   **Opacity Tokens:** Introduce new theme tokens for glass opacity: `glass.thin` (0.06), `glass.mid` (0.10), `glass.thick` (0.14).
-   **Fallback:** Use `@supports` to detect browser compatibility. If `backdrop-filter` is not supported, fall back to a semi-opaque `background-color` from the theme.
-   **Component API:**
    ```typescript
    // frontend/src/components/surfaces/FrostedCard/FrostedCard.tsx
    interface FrostedCardProps {
      elevation?: 1 | 2 | 3;
      opacity?: 'thin' | 'mid' | 'thick';
      isInteractive?: boolean;
    }
    ```

### 3.4. Cyberpunk Dashboard Theme

A specialized, high-impact theme applied **only** to the admin dashboard.

#### Technical Specifications
-   **Glows:** Use a single `::after` pseudo-element with `filter: blur()` instead of stacked `box-shadow` for better performance.
-   **Theme Switching:**
    -   An isolated `DashboardThemeContext` will provide the theme variant (`lively` or `dark`).
    -   The context provider will wrap **only** the admin routes (`/admin/*`).
    -   This ensures the cyberpunk theme never leaks into public-facing pages.
-   **Persistence:** User theme preference will be stored in `localStorage` and synced via a new API endpoint.

---

## 4. ⚡ Performance Budgets & Guardrails

The "living" interface must not compromise core web vitals.

### Core Metrics
| Metric | Target |
| :--- | :--- |
| **LCP (Largest Contentful Paint)** | ≤ 2.5s (on mid-tier 4G) |
| **CLS (Cumulative Layout Shift)** | ≤ 0.1 |
| **TTI (Time to Interactive)** | ≤ 3.5s |
| **Target Frame Rate** | 60 FPS (with graceful degradation) |
| **WebGL CPU Usage** | ≤ 10% (desktop), ≤ 25% (mobile) |
| **Total JS Bundle Size Increase** | ≤ 25KB gzipped |

### Monitoring
-   **CI/CD:** Lighthouse CI will run on every pull request, failing builds that miss performance targets.
-   **RUM:** Sentry will be used for Real User Monitoring to track these metrics in production.
-   **Auto-Disable:** A global script will monitor frame rates and automatically disable heavy effects (like WebGL) if FPS drops below 20 for more than 5 seconds.

---

## 5. ♿ Accessibility (WCAG 2.1 AA)

Accessibility is not an afterthought.

### Compliance Checklist
-   [ ] **Motion:** All effects MUST respect `prefers-reduced-motion`. A manual "Disable Effects" toggle will also be provided.
-   [ ] **Transparency:** A `prefers-reduced-transparency` media query will be handled, falling back to opaque surfaces.
-   [ ] **Contrast:** All text on glass surfaces must meet a 4.5:1 contrast ratio. This may require semi-opaque "scrims" behind the text.
-   [ ] **Focus:** Keyboard focus indicators (`focus-visible`) must be clearly visible on all surfaces, including glass and neon elements.
-   [ ] **Screen Readers:** All decorative effects must be hidden from screen readers via `aria-hidden="true"`.

---

## 6. 📁 File Structure & Documentation

To avoid monolithic files, the v2.0 theme documentation and components will be modular.

### New Documentation Structure
The `docs/current/GALAXY-SWAN-THEME-DOCS.md` will be simplified and link to a new, structured bundle:

```
docs/current/theme-v2/
├── OVERVIEW.md
├── LIVING-BACKGROUND.md   # WebGL specs, tiers, budgets
├── PARALLAX-LAYOUT.md     # Parallax patterns and rules
├── GLASS-SURFACES.md      # Glass mixins, tokens, fallbacks
├── CYBERPUNK-DASHBOARD.md # Scoped theme rules
├── PERFORMANCE-BUDGETS.md # Detailed metrics and test scripts
└── ACCESSIBILITY.md         # Motion, transparency, and focus rules
```

### New Component Structure
All new components will follow the 7-file component documentation standard and be organized as follows:

```
frontend/src/
├── components/
│   ├── effects/
│   │   └── LivingConstellation/
│   ├── layout/
│   │   ├── ParallaxSection/
│   │   └── ContentFold/
│   ├── surfaces/
│   │   └── FrostedCard/
│   └── dashboard/
│       └── CyberpunkButton/
└── context/
    └── DashboardThemeContext.tsx
```

---

## 7. 🔄 Migration & Implementation Plan

### Phase 1: Foundational Components (Weeks 1-2)
-   [ ] Create `LivingConstellation`, `FrostedCard`, `ParallaxSection`, and `CyberpunkButton` components.
-   [ ] Develop the `DashboardThemeContext`. (Roo Code)
-   [ ] Write comprehensive tests for each new component in isolation.

### Phase 2: Homepage Integration (Week 3)
-   [ ] Replace the static homepage background with `<LivingConstellation />`.
-   [ ] Convert existing homepage cards to use `<FrostedCard />`.
-   [ ] Add a `<ParallaxSection />` to the hero area.
-   [ ] Conduct a full responsive and accessibility audit of the new homepage. (ChatGPT-5)

### Phase 3: Dashboard Theme Rollout (Week 4)
-   [ ] Wrap all admin routes with the `DashboardThemeContext` provider.
-   [ ] Add the theme toggle UI to the admin header.
-   [ ] Benchmark dashboard performance before and after the theme change.

---

## 7. 🔄 Migration & Implementation Plan (ENHANCED)

### Why This Order?
**Phase 1 builds foundations, Phase 2 validates, Phase 3 expands.**

Each phase is **gated** - we don't proceed until current phase is proven stable.

### Phase 1: Foundational Components (Weeks 1-2)
**Goal:** Build and test components in isolation

**Why Start Here:**
1.  **LivingConstellation** - Most complex, needs WebGL expertise, high risk
2.  **FrostedCard** - Simplest, validates glass effect approach, low risk
3.  **ParallaxSection** - Moderate complexity, tests scroll performance
4.  **CyberpunkButton** - Dashboard-scoped, won't affect public site

**Gate Criteria (Pass ALL before Phase 2):**
-   [ ] All components pass 7-checkpoint review
-   [ ] Lighthouse performance scores ≥ 85
-   [ ] No accessibility violations (axe-core)
-   [ ] Bundle size increase ≤ 25KB
-   [ ] 60 FPS maintained on target devices

### Phase 2: Homepage Integration (Week 3)
**Goal:** Validate v2.0 in production environment

**Why Homepage First:**
-   High traffic (validates performance under load)
-   Public-facing (validates accessibility compliance)
-   Non-critical (can rollback without breaking workflows)
-   Visual impact (validates design vision)

**Gate Criteria:**
-   [ ] Homepage LCP ≤ 2.5s (p75)
-   [ ] CLS ≤ 0.1
-   [ ] No user complaints about motion/effects
-   [ ] Mobile performance acceptable (FPS ≥ 30)

### Phase 3: Dashboard Theme Rollout (Week 4)
**Goal:** Apply cyberpunk theme to admin dashboard

**Why Dashboard Last:**
-   Lower traffic (safer to experiment)
-   Internal users (faster feedback loop)
-   Scoped theme (isolated risk)
-   Non-public (can iterate quickly)

**Gate Criteria:**
-   [ ] Theme toggle works reliably
-   [ ] No theme leakage to public pages
-   [ ] localStorage + API sync working
-   [ ] Admin users approve design (informal poll)

### Rollback Plan
-   A global feature flag, `ENABLE_V2_THEME`, will be used.
-   If critical performance or visual issues are detected, this flag can be toggled off to immediately revert to the v1.0 theme.

### Emergency Rollback Procedures
**If any gate fails:**
1. Set `ENABLE_V2_THEME=false` in environment variables
2. Deploy immediately (< 5 minutes)
3. Site reverts to v1.0 automatically
4. No database rollback needed (v1.0 ignores new columns)
5. Analyze failures, fix, re-test, re-deploy

---

## 8. ⚙️ Backend & API Requirements

While the theme is primarily frontend, it requires minimal backend support for persistence.

### New API Endpoint
-   **Endpoint:** `POST /api/user/theme-preference`
-   **Purpose:** To save a user's preferred dashboard theme (`lively` or `dark`) and animation settings.
-   **Request Body:**
    ```json
    {
      "theme": "cyberpunk-lively" | "cyberpunk-dark" | "galaxy-default",
      "animationsEnabled": true | false
    }
    ```

#### Rate Limiting (NEW)
To prevent abuse, this endpoint will be rate-limited.
```javascript
// Example implementation in Express.js
const rateLimit = require('express-rate-limit');
const themeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many theme changes, please try again later.'
});
app.use('/api/user/theme-preference', themeLimiter);
```

### New API Endpoint: Theme Performance Analytics (NEW)
-   **Endpoint:** `POST /api/analytics/theme-performance`
-   **Purpose:** To collect real-user monitoring (RUM) data on theme performance.
-   **Request Body:**
    ```json
    {
      "theme": "cyberpunk-lively",
      "fps": 58.3,
      "memoryUsage": 45.2, // MB
      "loadTime": 1250, // ms
      "deviceTier": "enhanced"
    }
    ```

### Database Schema Changes
-   **Table:** `users`
-   **New Columns:**
    ```sql
    ALTER TABLE users ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'galaxy-default';
    ALTER TABLE users ADD COLUMN animations_enabled BOOLEAN DEFAULT true;
    ```

#### New Table: `theme_analytics` (NEW)
```sql
CREATE TABLE theme_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  theme VARCHAR(50),
  fps DECIMAL(5,2),
  memory_mb DECIMAL(6,2),
  load_time_ms INTEGER,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_theme_analytics_user_theme ON theme_analytics(user_id, theme);
CREATE INDEX idx_theme_analytics_created_at ON theme_analytics(created_at);
```

#### Optional Table: `user_theme_history` (for analytics)
```sql
CREATE TABLE user_theme_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  theme_preference VARCHAR(50),
  changed_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50) -- 'manual', 'auto', 'os-preference'
);
```

---

## 9. 🤖 AI Village Integration

This entire initiative is a **Phase 0** feature and requires full AI Village protocol adherence.

### Phase 0 Approval
-   This document serves as the primary design artifact.
-   It requires formal approval from all 5 AI reviewers before implementation begins.
-   **Current Status:** This document incorporates feedback from initial reviews and is ready for final consensus.

### Component Documentation
-   Every new component (`LivingConstellation`, `FrostedCard`, etc.) must have its own complete 7-file documentation package *before* implementation, as per the standard in `docs/ai-workflow/component-docs/templates/`.

### 7-Checkpoint Pipeline
-   All code written for this theme update must pass the full 7-checkpoint approval pipeline before being merged.

---

## 10. ✅ Final Approval Checklist

This blueprint is considered final and ready for implementation once all checks are complete.

| AI Reviewer | Role | Status |
| :--- | :--- | :--- |
| **Claude Code** | Integration & Architecture | ✅ Approved |
| **Codex** | Performance | ✅ Approved |
| **Roo Code** | Backend & Code Quality | ✅ Approved |
| **ChatGPT-5** | QA & Testing | ◻️ Pending |
| **Gemini** | Frontend & UI/UX | ✅ Approved |

---

## 11. ⚠️ Real-World Edge Cases & Solutions (NEW)

### Edge Case 1: User on Slow 3G Connection
**Problem:** LivingConstellation loads slowly, blocks content

**Solution:**
```typescript
// Lazy-load WebGL after critical content
const LivingConstellation = lazy(() => {
  return new Promise((resolve) => {
    // Wait for idle time OR 3 seconds (whichever first)
    const timeout = setTimeout(() => resolve(import('./LivingConstellation')), 3000);
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        clearTimeout(timeout);
        resolve(import('./LivingConstellation'));
      });
    }
  });
});
```

### Edge Case 2: User Has 120Hz Display
**Problem:** 60 FPS target is too low, animations look choppy

**Solution:**
```typescript
// Auto-detect refresh rate and adjust
const refreshRate = window.screen?.refreshRate || 60;
const targetFPS = Math.min(refreshRate, 120); // Cap at 120

// Adjust animation frame timing
const frameTime = 1000 / targetFPS;
```

### Edge Case 3: Browser Tab Sent to Background
**Problem:** WebGL continues running, drains battery

**Solution:**
```typescript
// Pause ALL effects when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause WebGL, stop requestAnimationFrame
    pauseAllEffects();
  } else {
    // Resume only if user hasn't disabled effects
    if (userPreferences.effectsEnabled) {
      resumeEffects();
    }
  }
});
```

### Edge Case 4: User Resizes Browser Window
**Problem:** Parallax calculations break, glass blur looks off

**Solution:**
```typescript
// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    recalculateParallax();
    recalculateGlassBlur();
  }, 150); // Wait for resize to finish
});
```

### Edge Case 5: Dark Mode OS Preference
**Problem:** User has OS dark mode, but we default to "lively" cyberpunk

**Solution:**
```typescript
// Respect OS preference for initial theme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = prefersDark ? 'cyberpunk-dark' : 'cyberpunk-lively';

// Still allow manual override
```

### Edge Case 6: Older iPhone (< iPhone X)
**Problem:** WebGL performance is terrible, backdrop-filter not supported

**Solution:**
```typescript
// Device detection + feature detection
const isOldiPhone = /iPhone [6-9]/.test(navigator.userAgent);
const supportsBackdrop = CSS.supports('backdrop-filter', 'blur(10px)');

if (isOldiPhone || !supportsBackdrop) {
  // Force minimal tier
  performanceTier = 'minimal';
}
```

---

## 12. 🧪 Testing Strategy (NEW)

### Unit Tests (Jest + React Testing Library)
**Every component needs:**

```typescript
describe('FrostedCard', () => {
  it('renders children correctly', () => {
    // Basic render test
  });
  
  it('applies correct opacity based on prop', () => {
    // Test glass.thin vs glass.thick
  });
  
  it('falls back to opaque background when backdrop-filter unsupported', () => {
    // Mock CSS.supports to return false
  });
  
  it('respects prefers-reduced-transparency', () => {
    // Mock media query
  });
});
```

### Visual Regression Tests (Chromatic or Percy)
**Critical for theme changes:**
-   Homepage hero with LivingConstellation
-   FrostedCard at all 3 opacity levels
-   Parallax section at different scroll positions
-   Cyberpunk dashboard in both modes

### Performance Tests (Lighthouse CI)
**Run on every PR:**
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    npm run build
    lhci autorun --config=.lighthouserc.json
    
# Fail build if:
# - LCP > 2.5s
# - CLS > 0.1
# - Performance score < 85
```

### Accessibility Tests (axe-core + Manual)
**Automated:**
```typescript
import { axe } from 'jest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<FrostedCard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Manual Checklist:**
-   Test with NVDA (Windows)
-   Test with VoiceOver (Mac)
-   Test keyboard navigation
-   Test with effects disabled
-   Test with high contrast mode

### Device Testing Matrix
| Device | Browser | Test |
|:-------|:--------|:-----|
| iPhone 12 | Safari | WebGL performance |
| Pixel 5 | Chrome | Glass effect rendering |
| iPad Air | Safari | Parallax smoothness |
| Desktop 4K | Chrome | High DPI rendering |
| Low-end Android | Chrome | Graceful degradation |

### Load Testing (Optional - If High Traffic Expected)
```bash
# Simulate 1000 concurrent users
artillery quick --count 1000 --num 10 https://sswanstudios.com/
```

---

## 13. 🔧 Troubleshooting Common Issues (NEW)

### Issue 1: WebGL Not Rendering
**Symptoms:** Black screen where LivingConstellation should be

**Debug Steps:**
1.  Check console for WebGL errors
2.  Verify browser supports WebGL:
    ```javascript
    const canvas = document.createElement('canvas');
    const hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    console.log('WebGL supported:', hasWebGL);
    ```
3.  Check if GPU is blacklisted (some corporate laptops)
4.  Verify Three.js loaded correctly
5.  Check if `performanceTier` forced to 'minimal'

**Solution:** Force fallback to Canvas 2D or static SVG.

### Issue 2: Janky Scrolling on Parallax
**Symptoms:** Scroll feels choppy, FPS drops

**Debug Steps:**
1.  Open Chrome DevTools > Performance
2.  Record 6-second scroll session
3.  Look for:
    -   Long tasks (> 50ms)
    -   Excessive layout recalculations
    -   Non-composited animations

**Solution:**
-   Use `will-change: transform` on parallax elements
-   Throttle scroll handlers more aggressively
-   Reduce particle count

### Issue 3: Glass Effect Looks Wrong
**Symptoms:** Blurry text, incorrect transparency

**Debug Steps:**
1.  Check if `backdrop-filter` is supported:
    ```javascript
    CSS.supports('backdrop-filter', 'blur(10px)');
    ```
2.  Inspect element > Computed styles
3.  Look for conflicting background or opacity rules

**Solution:** Add explicit fallback in `@supports` block.

### Issue 4: Cyberpunk Theme Leaking to Public Pages
**Symptoms:** Public pages have neon colors

**Debug Steps:**
1.  Check React DevTools > Components
2.  Verify `DashboardThemeContext` is NOT wrapping public routes
3.  Check if theme CSS is scoped correctly

**Solution:** Ensure `ThemeProvider` only wraps `/admin/*` routes:
```typescript
<Routes>
  <Route path="/admin/*" element={
    <DashboardThemeProvider>
      <AdminRoutes />
    </DashboardThemeProvider>
  } />
  <Route path="/*" element={<PublicRoutes />} /> {/* No theme wrapper */}
</Routes>
```

### Issue 5: Effects Disabled But Still Running
**Symptoms:** User disabled effects, but WebGL still active

**Debug Steps:**
1.  Check `localStorage`:
    ```javascript
    localStorage.getItem('animationsEnabled');
    ```
2.  Check if event listeners are properly removed
3.  Verify `useEffect` cleanup functions

**Solution:**
```typescript
useEffect(() => {
  if (!animationsEnabled) {
    stopWebGL();
    return; // Don't start
  }
  
  startWebGL();
  
  return () => {
    stopWebGL(); // Cleanup
  };
}, [animationsEnabled]);
```

---

## 14. 💰 Resource Estimate & Timeline (NEW)

### Development Time (Realistic Estimates)
| Phase | Component | Estimated Hours | Assigned To |
|:------|:----------|:----------------|:------------|
| **Phase 1** | | **160-200 hours** | |
| | LivingConstellation | 60-80 hours | Gemini + Codex |
| | FrostedCard | 20-30 hours | Gemini |
| | ParallaxSection | 30-40 hours | Gemini |
| | CyberpunkButton | 15-20 hours | Gemini |
| | DashboardThemeContext | 10-15 hours | Roo Code |
| | Component docs (7 files × 5 components) | 25-30 hours | All AIs |
| **Phase 2** | | **40-60 hours** | |
| | Homepage integration | 20-30 hours | Gemini + Claude Code |
| | Responsive testing | 10-15 hours | ChatGPT-5 |
| | Accessibility audit | 10-15 hours | ChatGPT-5 |
| **Phase 3** | | **30-40 hours** | |
| | Dashboard theme rollout | 15-20 hours | Gemini |
| | Theme toggle UI | 10-15 hours | Gemini |
| | Performance benchmarks | 5-10 hours | Codex |
| **TOTAL** | | **230-300 hours** | |

### Cost Breakdown (If Using Paid AI Services)
-   **Gemini (Frontend):** ~100 hours @ $0/hour (included in Google Workspace)
-   **Claude Code (Integration):** ~50 hours @ $0/hour (VS Code extension)
-   **Roo Code (Backend):** ~20 hours @ ~$0.50/hour (OpenRouter Grok) = **~$10**
-   **ChatGPT-5 (QA):** ~40 hours @ $0.08/hour (ChatGPT Plus) = **~$3.20**
-   **Codex (Performance):** ~30 hours @ $0/hour (GitHub Copilot)

**Total AI Cost:** ~$13.20 (negligible!)

### Human Oversight Required
-   **Design Decisions:** 10-15 hours (user approval of designs)
-   **Phase Gate Reviews:** 5-10 hours (reviewing Phase 1/2/3 completions)
-   **Final QA:** 5-10 hours (manual testing before production)

**Total Human Time:** 20-35 hours

### Infrastructure Costs
-   **Lighthouse CI:** Free (GitHub Actions)
-   **Sentry RUM:** $26/month (existing subscription)
-   **Chromatic (Visual Regression):** $149/month (optional)

**New Monthly Cost:** $0-$149 depending on visual regression testing