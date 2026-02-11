# Cross-AI Review Prompt: Follow Our Journey — Social Feed v2.0

## Context
The SwanStudios homepage "Follow Our Journey" section (formerly "Instagram Feed") was refactored from a 6-card uniform Instagram-only grid with stock images into a 3-card platform-diverse social mosaic (Facebook, Instagram, YouTube). The V1ThemeBridge wrapper was removed; the component now uses Ethereal Wilderness (EW) design tokens natively.

## Files Changed
1. `frontend/src/components/InstagramFeed/InstagramFeed.tsx` — **Complete rewrite** (648 → ~1130 lines). New `SocialFeed` component with 3 platform card variants.
2. `frontend/src/pages/HomePage/components/HomePage.V2.component.tsx` — Removed `V1ThemeBridge` wrapper around lazy import, updated Suspense fallback text.

## EW Design Tokens (reference)
```typescript
const T = {
  bg: '#0a0a1a',
  cardGlass: 'rgba(15, 20, 35, 0.55)',
  cardGlassFallback: 'rgba(15, 20, 35, 0.88)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
  textMuted: '#5A7A8A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.18)',
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
} as const;
```

## Platform card types
- **FacebookCard**: Page header (avatar + name + verified badge + timestamp), post text, link preview (image + URL + title), reaction row (emoji + count + comments + shares)
- **InstagramCard**: Username header with story-ring avatar, square image, action icons (heart/comment/send + bookmark), likes count, caption with bold handle + hashtags, comments link, timestamp
- **YouTubeCard**: 16:9 thumbnail with play button overlay + duration badge, video title, channel info (avatar + name + subscribers), view count + timestamp, thumbs-up + comments count

## Review Instructions

Please review the 2 changed files against these criteria. For each finding, assign a severity (Critical / High / Medium / Low / Info) and provide specific file:line references.

### 1. Token Consistency
- Are ALL color values using the `T` token object? (No hardcoded hex outside of `T`)
- Are rgba values derived from `T` tokens?
- Is there any remaining V1 hex (`#00ffff`, `#1e1e3f`, `#0a0a0f`)?
- Are platform accent colors (`facebook`, `instagram`, `youtube`) defined in `T`?

### 2. Card Visual Language
- Does `CardBase` use: `border-radius: 20px`, `1px` border, glassmorphism (`backdrop-filter: blur`)?
- Does hover state use `translateY(-6px)` + border/shadow enhancement?
- Are platform badge pills consistent in size and positioning?
- Is each card type visually distinct while maintaining brand cohesion?
- Does `@supports not (backdrop-filter)` fallback use `T.cardGlassFallback`?

### 3. Typography
- Section heading: Cormorant Garamond, italic, 600 weight?
- Body/caption text: Source Sans 3 with `T.textSecondary` or `T.textMuted`?
- YouTube video title: Cormorant Garamond?
- Facebook post text: Source Sans 3?
- No remaining system sans-serif fallback as primary font?

### 4. Reduced Motion Compliance
- Does every CSS transition have a `@media (prefers-reduced-motion: reduce)` gate?
- Are Framer Motion animation durations set to `0` when `prefersReducedMotion` is true?
- Are stagger delays set to `0` when reduced motion is preferred?
- Is hover `transform` disabled under `prefers-reduced-motion: reduce`?

### 5. Accessibility
- Does every card have a wrapping `<a>` (CardLink) with `aria-label`?
- Are decorative images (avatars, icons) using empty alt or `aria-hidden`?
- Are content images (post photo, video thumbnail) using descriptive `alt` text?
- Is `focus-visible` used for keyboard focus rings (not `:focus`)?
- Does the section have `aria-label="Follow Our Journey"`?
- Are platform icon links at bottom using `aria-label` with platform name?
- Do all interactive elements meet 44px minimum touch target?

### 6. Semantic Structure
- Is the section an `<section>` with `id="instagram"` (backward compat)?
- Is each card an `<article>` element?
- Is the YouTube video title an `<h3>` heading?
- Is the card grid using CSS Grid (not flexbox)?
- Is the section-level heading an `<h2>`?

### 7. Responsive Layout
- Desktop (1280w): 3-column grid, equal-width cards?
- Tablet (768w): 2-column grid with YouTube spanning full width (`grid-column: 1 / -1`)?
- Mobile (375w): single column stack?
- No horizontal overflow at any breakpoint?
- Section height reasonable (no massive dead space)?

### 8. Performance
- No `will-change: transform` on cards?
- No infinite CSS animations (all keyframes bounded or triggered by state)?
- Are images reasonably sized for display area?
- `useInView` uses `once: true` (animations don't re-trigger)?
- Lazy loading via `React.lazy()` preserved in homepage?

### 9. Integration with HomePage.V2
- Was `V1ThemeBridge` wrapper removed (not needed for EW-native component)?
- Is the lazy import path unchanged (`InstagramFeed/InstagramFeed`)?
- Is the Suspense fallback text updated to "Loading social feed"?
- Is the component still wrapped in `<Suspense>` boundary?

## Playwright Verification Results (reference)

### Section Dimensions
| Breakpoint | Width | Height | H-Overflow |
|------------|-------|--------|------------|
| 1280×720   | 1272px | 1142px | No |
| 375×812    | 367px  | 1840px | No |

### Touch Targets (375w mobile)
| Element | Size | Passes 44px |
|---------|------|-------------|
| Facebook card link | 338×475 | Yes |
| Instagram card link | 338×588 | Yes |
| YouTube card link | 338×385 | Yes |
| Facebook icon link | 48×48 | Yes |
| Instagram icon link | 48×48 | Yes |
| YouTube icon link | 48×48 | Yes |

### Before vs After
| Metric | Before (v1.0) | After (v2.0) |
|--------|---------------|--------------|
| Card count | 6 (identical) | 3 (distinct) |
| Platforms | Instagram only | Facebook + Instagram + YouTube |
| Touch targets passing 44px | 2/8 (25%) | 6/6 (100%) |
| Keyboard accessible cards | 0/6 | 3/3 |
| Reduced motion support | None | Full |
| Section height (1280w) | 1774px | 1142px |
| H-overflow | No | No |
| Aria landmarks | None | `aria-label` on section |
| Card semantic elements | `<div>` | `<article>` + `<a>` |

## Output Format

| # | Severity | Finding | File:Line | Suggestion |
|---|----------|---------|-----------|------------|

If no findings at a given severity, state "None" for that level.

### Missing Controls Checklist
- [ ] Any color value hardcoded outside `T` tokens
- [ ] Any CSS transition/animation without reduced-motion gate
- [ ] Any `useInView` without `once: true`
- [ ] Any interactive element without `aria-label`
- [ ] Any image without `alt` text (content images only)
- [ ] Any touch target below 44px minimum
- [ ] Any horizontal overflow at tested breakpoints
- [ ] Any V1ThemeBridge still wrapping this component
- [ ] Any console errors from the component
- [ ] Any business logic changes (routes, RBAC, auth, payments)
