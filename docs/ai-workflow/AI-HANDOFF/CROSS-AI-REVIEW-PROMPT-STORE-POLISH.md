# Cross-AI Review Prompt: Store Page EW Polish

## Context
The SwanStudios store page (5 files) was migrated from V1 Galaxy theme to Ethereal Wilderness (EW) design tokens. The card visual language was aligned with the homepage ProgramsOverview.V3 pattern.

## Files Changed
1. `frontend/src/pages/shop/components/PackageCard.tsx` - Card redesign (primary target)
2. `frontend/src/pages/shop/components/PackagesGrid.tsx` - Section titles + grid
3. `frontend/src/pages/shop/components/HeroSection.tsx` - Hero video area
4. `frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx` - Container shell
5. `frontend/src/pages/shop/components/FloatingCart.tsx` - Cart FAB

## EW Design Tokens (reference)
```typescript
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;
```

## Review Instructions

Please review the 5 changed files against these criteria. For each, assign a severity (Critical/High/Medium/Low/Info) and provide specific file:line references.

### 1. Token Consistency
- Are ALL color values using the `T` token object? (No hardcoded hex outside of `T`)
- Are rgba values derived from `T` tokens? (e.g., `rgba(0, 212, 170, 0.3)` for `T.primary`)
- Is there any remaining V1 hex (`#00ffff`, `#1e1e3f`, `#0a0a0f`)?

### 2. Card Visual Language
- Do cards use: 16px border-radius, 1px border, glass-morphism (`backdrop-filter: blur`)?
- Does hover state use `translateY(-8px)` + border/shadow enhancement?
- Are badge styles consistent with ProgramsOverview.V3 pill badge pattern?

### 3. Typography
- Headings: Cormorant Garamond with appropriate weights?
- Body: Source Sans 3 with `T.textSecondary` for descriptions?
- No remaining system sans-serif fallback as primary font?

### 4. Reduced Motion Compliance
- Does every CSS keyframe have a `noMotion` helper OR `@media (prefers-reduced-motion: no-preference)` gate?
- Is `MotionConfig reducedMotion="user"` wrapping all Framer Motion JSX in each file?
- Are hover transforms gated with `@media (hover: hover) and (prefers-reduced-motion: no-preference)`?

### 5. Accessibility
- Is `onKeyDown` used (not deprecated `onKeyPress`)?
- Is `focus-visible` used for keyboard-only focus rings?
- Are `aria-label` attributes present on interactive elements?

### 6. Business Logic Preservation
- Are `handleAddToCart`, `fetchPackages`, `handleTogglePrice` callback signatures unchanged?
- Is the `StoreItem` interface unchanged?
- Is the `CheckoutView` / `OrientationForm` modal integration intact?
- Are fallback package IDs (50-57) preserved?

### 7. Performance
- Is `will-change: transform` removed from cards?
- Is `memo()` still applied to all components?
- Are `useMemo`/`useCallback` dependency arrays stable?

## Output Format

| # | Severity | Finding | File:Line | Suggestion |
|---|----------|---------|-----------|------------|

If no findings at a given severity, state "None" for that level.

### Missing Controls Checklist
- [ ] Any file with > 3 hardcoded colors outside T tokens
- [ ] Any CSS keyframe without reduced-motion gate
- [ ] Any MotionConfig missing from a component with Framer animations
- [ ] Any `onKeyPress` usage
- [ ] Any `will-change: transform` on cards
- [ ] Any business logic change (cart, checkout, pricing)
