# Store Page Polish - Analysis Document

## Date: 2026-02-09
## AI: Claude Code (Opus 4.6)
## Scope: Store page EW theme migration + card redesign

---

## Before-State Audit Findings (Severity-Sorted)

| # | Severity | Finding | File:Line | Root Cause |
|---|----------|---------|-----------|------------|
| 1 | **High** | V1 color system throughout - `#00ffff`, `#1e1e3f`, `#0a0a0f` hardcoded in 5 files | PackageCard:26-36, PackagesGrid:25-28, HeroSection:25-35, StoreFront:48-54, FloatingCart:23-28 | Each file duplicates its own `GALAXY_COLORS` constant with V1 tokens |
| 2 | **High** | Card visual language mismatches homepage - 25px border-radius, 2px cyan border, theme-based gradient backgrounds vs homepage 16px radius, 1px subtle border, glass-morphism surface | PackageCard:175-220 | Store was built pre-EW migration |
| 3 | **Medium** | No reduced-motion gating - `galacticShimmer`, `starSparkle`, `stellarPulse`, `float` keyframes all run unconditionally | PackageCard:169, PackagesGrid:73, HeroSection:43, FloatingCart:39 | No `noMotion` helper or `prefers-reduced-motion` media queries |
| 4 | **Medium** | No `MotionConfig reducedMotion="user"` - Framer Motion springs/staggers not gated | PackageCard:521, PackagesGrid:178, FloatingCart:237 | MotionConfig not imported |
| 5 | **Medium** | Typography mismatch - store uses system sans-serif with `font-weight: 300/600`, homepage uses Cormorant Garamond headings + Source Sans 3 body | PackageCard:358-373, PackagesGrid:103-152 | Pre-EW font stack |
| 6 | **Medium** | Section titles use inline swan-icon pseudo-elements with `filter: hue-rotate` hack instead of EW gradient text | PackagesGrid:103-152 | Legacy Galaxy theme pattern |
| 7 | **Low** | `onKeyPress` deprecated - should use `onKeyDown` | PackageCard:600 | Legacy React pattern |
| 8 | **Low** | `will-change: transform` on every card - potential compositing overhead | PackageCard:190 | Over-optimization |
| 9 | **Low** | `text-shadow: 0 0 15px rgba(0, 255, 255, 0.6)` creates glow bleed at small sizes | PackageCard:362 | V1 neon aesthetic |
| 10 | **Low** | AuthBanner uses V1 cyan border + swan icon sparkle animation | StoreFront:141-175 | Consistent with old Galaxy theme |

## Responsive Audit Results (Before)

| Breakpoint | H-Overflow | Layout | Touch Targets | Verdict |
|-----------|------------|--------|---------------|---------|
| 375px | None | Single-column | >= 44px | PASS |
| 768px | None | Single-column | >= 44px | PASS |
| 1280px | None | 2-col cards | >= 44px | PASS |
| 1920px | None | 3-col cards | >= 44px | PASS |

## Functional Audit (Before)

- Package load (fallback mode): 8 packages render correctly
- Video backgrounds on cards: All load from public folder
- Add to Cart button: Present, disabled (not logged in) - correct behavior
- Checkout navigation: AnimatePresence modal pattern - intact
- AuthBanner: Displays correctly for unauthenticated users

## Files in Scope

| File | Lines | Role |
|------|-------|------|
| `frontend/src/pages/shop/components/PackageCard.tsx` | ~730 | Card component (primary target) |
| `frontend/src/pages/shop/components/PackagesGrid.tsx` | ~320 | Grid layout + section titles |
| `frontend/src/pages/shop/components/HeroSection.tsx` | ~455 | Hero video + branding |
| `frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx` | ~700 | Container shell + state |
| `frontend/src/pages/shop/components/FloatingCart.tsx` | ~330 | Cart FAB button |

## Critical Constraints

- No backend API changes
- No request payloads, route paths, or checkout flow changes
- No product/package business logic or pricing logic changes
- No cart total calculation changes
- No navigation to checkout/success/cancel changes
- `StoreItem` interface unchanged in business logic
- `handleAddToCart`, `fetchPackages`, `handleTogglePrice` logic unchanged
- `CheckoutView`, `OrientationForm` modal integration unchanged
