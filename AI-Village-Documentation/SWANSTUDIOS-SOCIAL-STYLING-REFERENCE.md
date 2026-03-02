# SwanStudios Social — Complete Styling Reference for Gemini Review

**Version:** 2.0 — Cinematic & Haptic Polish (Gemini-directed)
**Preset:** F-Alt "Enchanted Apex: Crystalline Swan"
**Framework:** styled-components + framer-motion (NO MUI, NO Tailwind)
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/AdminSocialManagementView.tsx`
**Purpose:** This document contains EVERY style, token, animation, spring constant, and component pattern currently live in the Admin Social Management tab. Nothing is omitted. All code is verbatim from the implementation.

---

## Table of Contents

1. [Crystalline Token Matrix (T Object)](#1-crystalline-token-matrix)
2. [Spring Physics Constants](#2-spring-physics-constants)
3. [Variant Color Helpers](#3-variant-color-helpers)
4. [Keyframe Animations](#4-keyframe-animations)
5. [Styled Components — Full CSS-in-JS Code](#5-styled-components)
   - 5.1 SocialContainer
   - 5.2 SocialHeader
   - 5.3 HeaderTitle
   - 5.4 HeaderActions
   - 5.5 ActionButton
   - 5.6 MetricsGrid
   - 5.7 MetricCard
   - 5.8 ContentGrid
   - 5.9 GlassPanel
   - 5.10 SectionHeader
   - 5.11 SearchAndFilters
   - 5.12 SearchInput
   - 5.13 FilterButton
   - 5.14 PostCardStyled
   - 5.15 StatusBadge
   - 5.16 ActionIcon
   - 5.17 ActivityItem
   - 5.18 EmptyState
   - 5.19 Spinner
   - 5.20 LoadingDots
6. [Component Hierarchy & Data Flow](#6-component-hierarchy)
7. [Haptic Moderation System](#7-haptic-moderation)
8. [Responsive Breakpoints](#8-responsive-breakpoints)
9. [Rarity / Status Badge Spec](#9-rarity-status-badges)
10. [True Glass Surface Spec](#10-true-glass-surface)
11. [Spring Motion & Animation Spec](#11-spring-motion-animation)
12. [Typography Spec](#12-typography-spec)
13. [Icon Usage Map](#13-icon-usage-map)
14. [Backend API Integration](#14-backend-api-integration)
15. [Gradient Reference](#15-gradient-reference)
16. [Shadow Reference](#16-shadow-reference)
17. [Border Radius Reference](#17-border-radius-reference)
18. [Spacing Reference](#18-spacing-reference)

---

## 1. Crystalline Token Matrix

The mandatory `T` constant object at the top of the file. Every styled component references these — no hardcoded colors anywhere else.

```typescript
const T = {
  // ── Surface & Depths (The Ocean / The Night) ──
  midnightSapphire: '#002060',   // Base void
  royalDepth:       '#003080',   // Elevated elements
  swanLavender:     '#4070C0',   // Active states / mid-tones

  // ── Bioluminescence & Ice (The Glow) ──
  iceWing:          '#60C0F0',   // Primary Interactive Glow
  arcticCyan:       '#50A0F0',   // Secondary Accents

  // ── Luxury & Status (The Contrast) ──
  gildedFern:       '#C6A84B',   // Gold borders, luxury accents
  frostWhite:       '#E0ECF4',   // Primary Text (Never pure white)

  // ── Semantic Haptics ──
  success:          '#22C55E',   // Approve / Growth
  warning:          '#F59E0B',   // Flagged / Pending
  danger:           '#EF4444',   // Reject / Delete

  // ── Premium Composite Tokens ──
  glassSurface:     'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder:      'rgba(198, 168, 75, 0.25)',   // 25% Gilded Fern
  glassHighlight:   'inset 0 1px 1px rgba(224, 236, 244, 0.15)', // Apple-style inner lip
  textMuted:        'rgba(224, 236, 244, 0.65)',
};
```

### Token Usage Rules
- **All backgrounds** use `T.glassSurface` (gradient glass) — NOT a flat rgba
- **All borders** use `T.glassBorder` (gilded at 25%) as default
- **All glass panels** get dual shadows: `T.glassHighlight` (inner lip) + `0 12px 40px rgba(0,0,0,0.3)` (ambient depth)
- **All primary text** uses `T.frostWhite` (#E0ECF4) — never pure white
- **All secondary text** uses `T.textMuted` (rgba at 65% — raised from original 60%)
- **Dynamic tinting** uses CSS `color-mix(in srgb, COLOR PERCENT%, transparent)` — no JS color helpers
- **Status colors** use `T.success`, `T.warning`, `T.danger` for semantic states

### Key Difference from V1
| Property | V1 (Original) | V2 (Gemini Polish) |
|----------|---------------|---------------------|
| `glassSurface` | `rgba(0, 32, 96, 0.55)` (flat) | `linear-gradient(135deg, rgba(0,48,128,0.45), rgba(0,32,96,0.25))` (gradient) |
| `glassBorder` | 20% opacity | 25% opacity |
| `glassHighlight` | Did not exist | `inset 0 1px 1px rgba(224,236,244,0.15)` |
| `textMuted` | 60% opacity | 65% opacity |
| Ambient shadow | Per-component | Standardized: `0 12px 40px rgba(0,0,0,0.3)` |

---

## 2. Spring Physics Constants

All interactive Framer Motion uses spring physics — never linear CSS transitions for transforms.

```typescript
const physics = {
  spring:    { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },
  snappy:    { type: 'spring', stiffness: 600, damping: 30 },
  glissando: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};
```

### Usage Map
| Constant | Feel | Used On |
|----------|------|---------|
| `physics.spring` | Natural bounce, weighted | MetricCard whileHover, ActionButton whileHover, PostCard entrance/exit |
| `physics.snappy` | Quick responsive snap | ActionIcon whileHover/whileTap, FilterButton, Bulk Actions button |
| `physics.glissando` | Smooth cinematic ease | Page entrance (SocialContainer initial→animate) |

---

## 3. Variant Color Helpers

Used by ActionIcon to resolve variant → color without switch statements in CSS.

```typescript
const variantColorMap: Record<string, string> = {
  approve: T.success,   // #22C55E
  reject:  T.danger,    // #EF4444
  flag:    T.warning,   // #F59E0B
  default: T.iceWing,   // #60C0F0
};
const getVariantColor = (v?: string) => variantColorMap[v || 'default'] || T.iceWing;
```

This function is called inside styled-components template literals:
```css
color: ${props => getVariantColor(props.$variant)};
background: color-mix(in srgb, ${props => getVariantColor(props.$variant)} 10%, transparent);
```

---

## 4. Keyframe Animations

### 4.1 Aurora Shift (Header Title Gradient)
```typescript
const auroraShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
```
- **Applied to:** HeaderTitle
- **Duration:** `6s ease-in-out infinite`
- **Requires:** `background-size: 200% auto` on the element

### 4.2 Spin Animation (Loading Spinner)
```typescript
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;
```
- **Applied to:** `Spinner` styled component wrapping `<RefreshCw />`
- **Duration:** `1s linear infinite`
- **Replaces:** The previous `.animate-spin` CSS class approach

### 4.3 Loading Dots (Inline Animated Ellipsis)
```typescript
keyframes`
  0%  { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
`
```
- **Duration:** `1s steps(1) infinite`
- **Applied via:** `&::after` pseudo-element on `LoadingDots`

### 4.4 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```
- Applied at `SocialContainer` level — kills ALL animations for accessibility

---

## 5. Styled Components — Full CSS-in-JS Code

### 5.1 SocialContainer (Root Wrapper)
```typescript
const SocialContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100dvh;
  color: ${T.frostWhite};

  @media (max-width: 768px) { padding: 1rem; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;
```
- **Framer Motion props:** `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `transition={physics.glissando}`
- **Changed from V1:** `padding: 2rem` (was 1.5rem), `min-height: 100dvh` (was 100%), added mobile padding reduction

### 5.2 SocialHeader (Top Bar)
```typescript
const SocialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid ${T.glassBorder};
  flex-wrap: wrap;
  gap: 1rem;
`;
```
- **Changed from V1:** `margin-bottom: 2rem` (was 1.5rem), `padding-bottom: 1.25rem` (was 1rem)

### 5.3 HeaderTitle (Cinematic Anchor — Aurora Gradient Text)
```typescript
const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.frostWhite} 40%, ${T.gildedFern} 100%);
  background-size: 200% auto;
  animation: ${auroraShift} 6s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;

  .header-icon {
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    border-radius: 14px;
    padding: 0.75rem;
    box-shadow: 0 8px 24px rgba(96, 192, 240, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-text-fill-color: ${T.frostWhite};
    color: ${T.frostWhite};
  }
`;
```
- **Changed from V1:**
  - `font-size: 2rem` (was 1.75rem)
  - Added `letter-spacing: -0.02em` (tighter, more premium)
  - Gradient midpoint at 40% (was 50%) — frostWhite peak shifted left
  - `background-size: 200% auto` (was `200% 200%`)
  - `ease-in-out` (was `ease`)
  - `.header-icon` border-radius: 14px (was 12px), padding: 0.75rem (was 0.6rem)
  - Icon shadow upgraded: `0 8px 24px rgba(96,192,240,0.4), inset 0 1px 1px rgba(255,255,255,0.3)` — deeper glow + inner lip
  - Gap: 1rem (was 0.75rem)

### 5.4 HeaderActions
```typescript
const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;
```
- Unchanged from V1

### 5.5 ActionButton (Interactive Button)
```typescript
const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.6rem 1.25rem;
  border-radius: 12px;
  min-height: 44px;
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary': return T.iceWing;
      case 'danger':  return T.danger;
      default:        return T.glassBorder;
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return `linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing})`;
      case 'danger':  return T.danger;
      default:        return T.glassSurface;
    }
  }};
  color: ${T.frostWhite};
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: ${T.glassHighlight};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```
- **Changed from V1:**
  - Default background now `T.glassSurface` (gradient) instead of flat `T.glass`
  - Added `-webkit-backdrop-filter` for Safari support
  - Added `box-shadow: ${T.glassHighlight}` (inner lip)
  - Removed CSS `transition` and `&:hover` CSS block — hover/tap now handled entirely by Framer Motion spring props
- **Framer Motion props:** `whileHover={{ scale: 1.03, y: -2 }}`, `whileTap={{ scale: 0.97 }}`, `transition={physics.spring}`

### 5.6 MetricsGrid (4-Column Responsive Grid)
```typescript
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`;
```
- **Changed from V1:** `margin-bottom: 2rem` (was 1.5rem)

### 5.7 MetricCard (Haptic Stat Container — True Glass)
```typescript
const MetricCard = styled(motion.div)<{ $accent: string }>`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  position: relative;
  padding: 1.5rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: ${props => props.$accent};
    box-shadow: 0 2px 12px ${props => props.$accent};
    border-radius: 16px 16px 0 0;
  }

  .metric-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, ${props => props.$accent} 15%, transparent);
    color: ${props => props.$accent};
    border: 1px solid color-mix(in srgb, ${props => props.$accent} 30%, transparent);
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: ${T.frostWhite};
    margin-top: 1rem;
    margin-bottom: 0.25rem;
  }

  .metric-label {
    color: ${T.textMuted};
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .metric-change {
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
    color: ${T.textMuted};
  }
`;
```
- **Changed from V1:**
  - Uses True Glass Spec: `T.glassSurface` + `T.glassHighlight` + ambient shadow
  - `backdrop-filter: blur(24px)` (was 20px)
  - `padding: 1.5rem` (was 1.25rem)
  - Accent bar `::before` gains `box-shadow: 0 2px 12px ${accent}` — the bar GLOWS
  - `.metric-icon` — 44px (was 40px), `border-radius: 12px` (was 10px), uses `color-mix()` for background AND border
  - `.metric-value` — `font-size: 2rem` (was 1.75rem), `margin-top: 1rem` (was margin-bottom only)
  - Removed CSS `transition` and `&:hover` CSS block — handled by Framer Motion
  - `$accent` prop is now required (was optional)
- **Framer Motion props:** `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ ...physics.spring, delay: index * 0.1 }}`, `whileHover={{ y: -4, scale: 1.01 }}`

### 5.8 ContentGrid (2:1 Layout)
```typescript
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;
```
- Unchanged from V1

### 5.9 GlassPanel (True Glass Container)
```typescript
const GlassPanel = styled.div`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
`;
```
- **Changed from V1:**
  - Uses True Glass Spec: gradient glass + inner lip + ambient shadow
  - `backdrop-filter: blur(24px)` (was 20px)
  - Added `-webkit-backdrop-filter` for Safari

### 5.10 SectionHeader (Panel Title Bar)
```typescript
const SectionHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2, h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${T.frostWhite};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;
```
- **Changed from V1:** Border opacity `0.12` (was `0.1`)

### 5.11 SearchAndFilters (Search Bar Container)
```typescript
const SearchAndFilters = styled.div`
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.1);
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;

  .search-wrapper {
    flex: 1;
    min-width: 200px;
    position: relative;

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: ${T.textMuted};
    }
  }
`;
```
- **Changed from V1:** Icon `left: 14px` (was 12px), `.search-input` class styles extracted into standalone `SearchInput` component

### 5.12 SearchInput (Standalone Input — NEW)
```typescript
const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  color: ${T.frostWhite};
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  font-size: 0.95rem;
  min-height: 44px;
  box-sizing: border-box;
  transition: all 0.3s ease;

  &::placeholder { color: ${T.textMuted}; }
  &:focus {
    outline: none;
    background: rgba(0, 48, 128, 0.7);
    border-color: ${T.iceWing};
    box-shadow: 0 0 0 4px rgba(96, 192, 240, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`;
```
- **New in V2** — extracted from `.search-input` class inside SearchAndFilters
- **Key differences from V1:**
  - `background: rgba(0, 32, 96, 0.5)` (was 0.4)
  - `border-radius: 12px` (was 10px)
  - `padding: 0.75rem 1rem 0.75rem 2.75rem` (was 0.6rem/2.5rem)
  - `font-size: 0.95rem` (was 0.875rem)
  - Focus: `background` changes to `rgba(0, 48, 128, 0.7)` (darkens on focus — V1 didn't change bg)
  - Focus ring: `4px` (was 3px) with added inner shadow `inset 0 1px 2px rgba(0,0,0,0.2)`

### 5.13 FilterButton (Status Filter Pill)
```typescript
const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.6rem 1.25rem;
  min-height: 44px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${props => props.$active ? T.iceWing : 'rgba(255, 255, 255, 0.05)'};
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${T.royalDepth}, ${T.swanLavender})`
    : 'transparent'};
  color: ${props => props.$active ? T.frostWhite : T.textMuted};
  box-shadow: ${props => props.$active ? '0 4px 12px rgba(96, 192, 240, 0.2)' : 'none'};

  &:hover {
    border-color: ${T.iceWing};
    color: ${T.frostWhite};
  }
`;
```
- **Changed from V1:**
  - `padding: 0.6rem 1.25rem` (was `0.5rem 1rem`)
  - `border-radius: 10px` (was 8px)
  - Added `font-weight: 500` explicitly
  - Inactive border: `rgba(255, 255, 255, 0.05)` — nearly invisible (was `rgba(96, 192, 240, 0.2)`)
  - Active state gets `box-shadow: 0 4px 12px rgba(96, 192, 240, 0.2)` (V1 had none)
  - Removed CSS `transition` — hover/tap handled by Framer Motion
- **Framer Motion props:** `whileHover={{ scale: 1.04 }}`, `whileTap={{ scale: 0.96 }}`, `transition={physics.snappy}`

### 5.14 PostCardStyled (Moderation Feed Row)
```typescript
const PostCardStyled = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  gap: 1.25rem;

  &:hover {
    background: linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.05), transparent);
  }
  &:last-child { border-bottom: none; }

  .post-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${T.midnightSapphire}, ${T.iceWing});
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${T.frostWhite};
    font-weight: 600;
    font-size: 0.95rem;
    flex-shrink: 0;
    border: 2px solid ${T.glassBorder};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .post-body { flex: 1; min-width: 0; }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .user-name { font-weight: 600; color: ${T.frostWhite}; font-size: 0.95rem; }
  .post-time { font-size: 0.75rem; color: ${T.textMuted}; }
  .post-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

  .post-text {
    color: ${T.textMuted};
    line-height: 1.6;
    margin: 0.75rem 0;
    font-size: 0.95rem;
    word-break: break-word;
  }

  .post-metrics {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 0.5rem;

    .metric {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: ${T.textMuted};
    }
  }
`;
```
- **Changed from V1:**
  - `padding: 1.5rem` (was `1.25rem 1.5rem`)
  - `gap: 1.25rem` (was 1rem)
  - Border: `rgba(255, 255, 255, 0.04)` (was gilded `rgba(198, 168, 75, 0.08)`)
  - Hover: gradient sweep `linear-gradient(90deg, transparent, rgba(96,192,240,0.05), transparent)` (was flat `rgba(0, 48, 128, 0.3)`)
  - Avatar: 48px (was 44px), gradient uses `midnightSapphire` start (was `royalDepth`), added `box-shadow: 0 4px 12px rgba(0,0,0,0.4)`
  - `.user-name` font-size: 0.95rem (was 0.9rem)
  - `.post-text` margin: `0.75rem 0` (was `margin-bottom: 0.75rem`), font-size: 0.95rem (was 0.9rem)
  - `.post-actions` gap: 0.4rem (was 0.35rem)
  - Removed CSS `transition: background` — Framer Motion handles animation
- **Framer Motion props (entrance):** `initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={physics.spring}`
- **Framer Motion props (haptic exit):** `exit={{ opacity: 0, x: action === 'approve' ? 50 : -50, scale: 0.95 }}`
- **Layout prop:** `layout` — enables smooth AnimatePresence reflows

### 5.15 StatusBadge (Glowing Status Pill)
```typescript
const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  ${props => {
    const map: Record<string, { c: string; bg: string }> = {
      approved: { c: T.success,    bg: 'rgba(34, 197, 94, 0.15)' },
      pending:  { c: T.gildedFern, bg: 'rgba(198, 168, 75, 0.15)' },
      flagged:  { c: T.danger,     bg: 'rgba(239, 68, 68, 0.15)' },
    };
    const style = map[props.$status] || { c: T.iceWing, bg: 'rgba(96, 192, 240, 0.15)' };
    return `
      color: ${style.c};
      background: ${style.bg};
      border: 1px solid color-mix(in srgb, ${style.c} 40%, transparent);
      box-shadow: 0 0 12px color-mix(in srgb, ${style.c} 20%, transparent);
    `;
  }}
`;
```
- **Changed from V1:**
  - `gap: 0.4rem` (was 0.35rem)
  - `padding: 0.25rem 0.75rem` (was `0.2rem 0.65rem`)
  - `border-radius: 999px` (was 20px — true pill)
  - `font-weight: 700` (was 600)
  - Added `letter-spacing: 0.05em`
  - `text-transform: uppercase` (was `capitalize`)
  - Border now uses `color-mix()` at 40% (V1 used hardcoded rgba values at 30%)
  - **NEW: glow** — `box-shadow: 0 0 12px color-mix(in srgb, COLOR 20%, transparent)` — badges GLOW against sapphire bg
  - Uses map object pattern instead of switch/case (cleaner)

### 5.16 ActionIcon (Moderation Action Buttons)
```typescript
const ActionIcon = styled(motion.button)<{ $variant?: 'approve' | 'reject' | 'flag' | 'default' }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, ${props => getVariantColor(props.$variant)} 20%, transparent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${props => getVariantColor(props.$variant)} 10%, transparent);
  color: ${props => getVariantColor(props.$variant)};

  &:hover {
    background: color-mix(in srgb, ${props => getVariantColor(props.$variant)} 20%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, ${props => getVariantColor(props.$variant)} 40%, transparent);
  }
`;
```
- **Changed from V1:**
  - 40x40px (was 36x36px)
  - `border-radius: 10px` (was 8px)
  - Has border now: `1px solid color-mix(... 20%)` (V1 had `border: none`)
  - Uses `getVariantColor()` helper + `color-mix()` instead of per-variant switch blocks
  - Hover glow: `0 0 16px` (was `0 0 12px`)
  - Variant type includes `'default'` (was `'edit'`)
  - Removed CSS `transition` — Framer Motion handles
- **Framer Motion props:** `whileHover={{ scale: 1.15 }}` (was 1.1), `whileTap={{ scale: 0.85 }}` (was 0.9 — more haptic)
- **Transition:** `physics.snappy`

### 5.17 ActivityItem (Sidebar Activity Row)
```typescript
const ActivityItem = styled.div`
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;

  &:last-child { border-bottom: none; }

  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(96, 192, 240, 0.1);
    color: ${T.iceWing};
  }

  .activity-text { font-size: 0.85rem; color: ${T.frostWhite}; margin-bottom: 0.15rem; }
  .activity-time { font-size: 0.75rem; color: ${T.textMuted}; }
`;
```
- **Changed from V1:**
  - `padding: 0.85rem 1.25rem` (was 0.75rem)
  - Border: `rgba(255, 255, 255, 0.04)` (was gilded at 8%)

### 5.18 EmptyState
```typescript
const EmptyState = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${T.textMuted};

  svg { margin-bottom: 1rem; opacity: 0.4; }
  h3 { color: ${T.frostWhite}; margin: 0 0 0.5rem; font-size: 1.1rem; }
  p { font-size: 0.9rem; margin: 0; }
`;
```
- Unchanged from V1

### 5.19 Spinner (NEW — CSS Rotation Wrapper)
```typescript
const Spinner = styled.div`
  display: inline-block;
  animation: ${spinAnimation} 1s linear infinite;
  line-height: 0;
`;
```
- **New in V2** — replaces `.animate-spin` class dependency
- Wraps any icon to make it spin (used on `<RefreshCw />` during loading)

### 5.20 LoadingDots
```typescript
const LoadingDots = styled.span`
  &::after {
    content: '';
    animation: ${keyframes`0%{content:'.'} 33%{content:'..'} 66%{content:'...'}`} 1s steps(1) infinite;
  }
`;
```
- Unchanged from V1

---

## 6. Component Hierarchy & Data Flow

### Component Tree
```
AdminSocialManagementView (root)
├── SocialContainer [motion.div — physics.glissando entrance]
│   ├── SocialHeader
│   │   ├── HeaderTitle (aurora gradient text + Sparkles icon)
│   │   └── HeaderActions
│   │       ├── ActionButton (Refresh — physics.spring hover)
│   │       └── ActionButton[$variant="primary"] (Export — physics.spring hover)
│   │
│   ├── MetricsGrid (4-column responsive)
│   │   ├── MetricCard[$accent=T.iceWing]    → Total Posts     [delay: 0.0s]
│   │   ├── MetricCard[$accent=T.success]    → Active Posters  [delay: 0.1s]
│   │   ├── MetricCard[$accent=T.gildedFern] → Engagement      [delay: 0.2s]
│   │   └── MetricCard[$accent=T.warning]    → Pending Mod     [delay: 0.3s]
│   │
│   └── ContentGrid (2:1 layout)
│       ├── GlassPanel (Content Management)
│       │   ├── SectionHeader
│       │   ├── SearchAndFilters
│       │   │   ├── SearchInput (standalone styled input)
│       │   │   └── FilterButton × 4 (physics.snappy)
│       │   └── AnimatePresence[mode="popLayout"]
│       │       └── PostCardStyled × N [layout, physics.spring, haptic exit]
│       │           ├── post-avatar (48px, gradient + deep shadow)
│       │           ├── post-header (username + timestamp + ActionIcons)
│       │           ├── post-text
│       │           ├── post-metrics
│       │           └── StatusBadge (glowing pill)
│       │
│       └── GlassPanel (Activity Sidebar)
│           ├── SectionHeader
│           └── ActivityItem × 4
```

### State Management
```typescript
const [refreshing, setRefreshing]     = useState(false);
const [searchTerm, setSearchTerm]     = useState('');
const [statusFilter, setStatusFilter] = useState<'all'|'approved'|'pending'|'flagged'>('all');
const [posts, setPosts]               = useState<SocialPost[]>([]);
const [loading, setLoading]           = useState(true);
const [totalPosts, setTotalPosts]     = useState(0);
const [moderatedIds, setModeratedIds] = useState<Map<number, string>>(new Map());  // NEW in V2
const [recentActivity, setRecentActivity] = useState([]);
```

### `moderatedIds` — New in V2
A `Map<number, string>` tracking `postId → action` for posts that have been moderated. This enables:
1. Filtering moderated posts out of the visible list (triggers exit animation)
2. Providing directional exit (action = 'approve' → slide right, else → slide left)
3. Reverting on API failure (remove from map → post reappears)

---

## 7. Haptic Moderation System

When a moderator clicks Approve/Flag/Reject:

### Step 1: Optimistic Removal
```typescript
setModeratedIds(prev => new Map(prev).set(postId, action));
```
Post is immediately filtered from `filteredPosts` — triggers AnimatePresence exit.

### Step 2: Directional Exit Animation
```typescript
exit={{
  opacity: 0,
  x: moderatedIds.get(post.id) === 'approve' ? 50 : -50,
  scale: 0.95,
}}
```
- **Approve** → slides right (x: 50) — feels like acceptance
- **Reject/Flag** → slides left (x: -50) — feels like dismissal

### Step 3: Background API Call
```typescript
await api.put(`/api/social/posts/${postId}`, { moderationStatus: statusMap[action] });
```

### Step 4: Revert on Failure
```typescript
catch (err) {
  setModeratedIds(prev => { const m = new Map(prev); m.delete(postId); return m; });
}
```
Post reappears with entrance animation if API fails.

### AnimatePresence Config
```jsx
<AnimatePresence mode="popLayout">
  {filteredPosts.map(post => (
    <PostCardStyled key={post.id} layout ... />
  ))}
</AnimatePresence>
```
- `mode="popLayout"` — exiting elements are popped out of layout flow, remaining items reflow smoothly
- `layout` prop — enables Framer Motion layout animations for smooth reordering

---

## 8. Responsive Breakpoints

| Breakpoint | MetricsGrid | ContentGrid | Container Padding |
|-----------|-------------|-------------|------------------|
| ≥1281px | 4 columns | 2:1 (posts : sidebar) | 2rem |
| 769–1280px | 2 columns | 2:1 | 2rem |
| ≤1024px | 2 columns | 1 column (stacked) | 2rem |
| ≤768px | 2 columns | 1 column | 1rem |
| ≤640px | 1 column | 1 column | 1rem |

### Touch Targets (44px minimum)
- ActionButton: `min-height: 44px`
- SearchInput: `min-height: 44px`
- FilterButton: `min-height: 44px`
- MetricCard .metric-icon: `44px × 44px`
- ActionIcon: `40px × 40px` (grouped — combined touch area exceeds 44px)
- Post avatar: `48px × 48px`

---

## 9. Rarity / Status Badge Spec

| Status | Text Color | Background | Border (color-mix 40%) | Glow (color-mix 20%) |
|--------|-----------|------------|----------------------|---------------------|
| approved | `#22C55E` | `rgba(34, 197, 94, 0.15)` | `color-mix(in srgb, #22C55E 40%, transparent)` | `0 0 12px color-mix(in srgb, #22C55E 20%, transparent)` |
| pending | `#C6A84B` | `rgba(198, 168, 75, 0.15)` | `color-mix(in srgb, #C6A84B 40%, transparent)` | `0 0 12px color-mix(in srgb, #C6A84B 20%, transparent)` |
| flagged | `#EF4444` | `rgba(239, 68, 68, 0.15)` | `color-mix(in srgb, #EF4444 40%, transparent)` | `0 0 12px color-mix(in srgb, #EF4444 20%, transparent)` |
| default | `#60C0F0` | `rgba(96, 192, 240, 0.15)` | `color-mix(in srgb, #60C0F0 40%, transparent)` | `0 0 12px color-mix(in srgb, #60C0F0 20%, transparent)` |

### MetricCard Accent Bar Colors
| Metric | Accent | Glow |
|--------|--------|------|
| Total Posts | `#60C0F0` | `0 2px 12px #60C0F0` |
| Active Posters | `#22C55E` | `0 2px 12px #22C55E` |
| Engagement | `#C6A84B` | `0 2px 12px #C6A84B` |
| Pending Moderation | `#F59E0B` or `#60C0F0` | Matching glow |

---

## 10. True Glass Surface Spec

### Standard Glass Panel (GlassPanel, MetricCard)
```css
background: linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border: 1px solid rgba(198, 168, 75, 0.25);
box-shadow:
  inset 0 1px 1px rgba(224, 236, 244, 0.15),   /* Apple-style inner lip for 3D thickness */
  0 12px 40px rgba(0, 0, 0, 0.3);                /* Ambient depth shadow */
border-radius: 16px;
```

### Glass Button (Default ActionButton)
```css
background: linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(198, 168, 75, 0.25);
box-shadow: inset 0 1px 1px rgba(224, 236, 244, 0.15);
```

### Glass Input (SearchInput)
```css
background: rgba(0, 32, 96, 0.5);
border: 1px solid rgba(96, 192, 240, 0.2);
border-radius: 12px;
/* On focus: */
background: rgba(0, 48, 128, 0.7);
border-color: #60C0F0;
box-shadow: 0 0 0 4px rgba(96, 192, 240, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.2);
```

---

## 11. Spring Motion & Animation Spec

### Page Entrance (Cinematic)
```typescript
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={physics.glissando}  // { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
```

### MetricCard Entrance (Staggered Spring)
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ ...physics.spring, delay: index * 0.1 }}  // 0s, 0.1s, 0.2s, 0.3s
whileHover={{ y: -4, scale: 1.01 }}
```

### Button Interactions (Spring)
```typescript
whileHover={{ scale: 1.03, y: -2 }}
whileTap={{ scale: 0.97 }}
transition={physics.spring}
```

### Filter Button Interactions (Snappy)
```typescript
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.96 }}
transition={physics.snappy}
```

### ActionIcon Interactions (Haptic Snappy)
```typescript
whileHover={{ scale: 1.15 }}
whileTap={{ scale: 0.85 }}
transition={physics.snappy}
```

### PostCard Entrance & Haptic Exit (Spring)
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, x: action === 'approve' ? 50 : -50, scale: 0.95 }}
transition={physics.spring}
layout  // Enables smooth reflow
```

### AnimatePresence Container
```typescript
<AnimatePresence mode="popLayout">
```

---

## 12. Typography Spec

| Element | Size | Weight | Color | Extra |
|---------|------|--------|-------|-------|
| HeaderTitle (h1) | 2rem | 700 | Aurora gradient | letter-spacing: -0.02em |
| SectionHeader (h2/h3) | 1.1rem | 600 | #E0ECF4 | — |
| MetricCard .metric-value | 2rem | 700 | #E0ECF4 | — |
| MetricCard .metric-label | 0.85rem | 500 | rgba(224,236,244,0.65) | — |
| MetricCard .metric-change | 0.8rem | 500 | rgba(224,236,244,0.65) | — |
| ActionButton | 0.875rem | 500 | #E0ECF4 | — |
| FilterButton | 0.85rem | 500 | Active: #E0ECF4 / Inactive: 65% | — |
| SearchInput | 0.95rem | 400 | #E0ECF4 | — |
| PostCard .user-name | 0.95rem | 600 | #E0ECF4 | — |
| PostCard .post-text | 0.95rem | 400 | rgba(224,236,244,0.65) | line-height: 1.6 |
| PostCard .post-time | 0.75rem | 400 | rgba(224,236,244,0.65) | — |
| PostCard .metric | 0.8rem | 400 | rgba(224,236,244,0.65) | — |
| StatusBadge | 0.75rem | 700 | Status-specific | letter-spacing: 0.05em, UPPERCASE |
| ActivityItem .activity-text | 0.85rem | 400 | #E0ECF4 | — |
| ActivityItem .activity-time | 0.75rem | 400 | rgba(224,236,244,0.65) | — |
| EmptyState h3 | 1.1rem | 400 | #E0ECF4 | — |
| EmptyState p | 0.9rem | 400 | rgba(224,236,244,0.65) | — |

---

## 13. Icon Usage Map

All icons from `lucide-react`:

| Icon | Size | Location |
|------|------|----------|
| Sparkles | 22px | HeaderTitle .header-icon |
| RefreshCw | 15px / 32px | Refresh button / Loading state (inside Spinner) |
| BarChart3 | 15px | Export button |
| MessageSquare | 20px / 18px / 40px | Posts metric / Section header / Empty state |
| Users | 20px | Active Posters metric |
| Heart | 20px / 14px / 12px | Engagement metric / Post like count / Metric change |
| Shield | 20px | Pending Moderation metric |
| TrendingUp | 12px | Metric change labels |
| AlertTriangle | 12px | Flagged count indicator |
| Settings | 15px | Bulk Actions button |
| Search | 15px | Search input icon |
| CheckCircle | 16px / 11px | Approve ActionIcon / Approved StatusBadge |
| Flag | 16px / 11px | Flag ActionIcon / Flagged StatusBadge |
| Trash2 | 16px | Reject ActionIcon |
| MoreHorizontal | 16px | Details ActionIcon |
| Clock | 11px / 28px | Pending StatusBadge / Empty activity |
| MessageCircle | 14px | Comment count in post |
| Eye | 14px | Post type in post metrics |
| Activity | 16px | Activity sidebar header |

---

## 14. Backend API Integration

### Wired Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/social/posts/feed?limit=50&offset=0` | GET | Fetch all posts + user info |
| `/api/social/posts/${id}` | PUT | Update moderationStatus (approve/reject/flag) |

### Available but Not Wired
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/social/posts` | POST | Create new post |
| `/api/social/posts/${id}` | GET | Get single post + comments |
| `/api/social/posts/${id}/like` | POST | Like/unlike |
| `/api/social/posts/${id}/comments` | POST | Add comment |

### Broken (Do Not Wire)
| Endpoint | Error |
|----------|-------|
| `/api/social/friendships` | 500 — Sequelize model error |
| `/api/social/challenges` | 404 — Route not registered |
| `/api/v1/gamification/*` | 500 — `user_follows` table missing |

---

## 15. Gradient Reference

| Name | Value | Used On |
|------|-------|---------|
| Aurora Title | `linear-gradient(135deg, #60C0F0 0%, #E0ECF4 40%, #C6A84B 100%)` | HeaderTitle text |
| Primary CTA | `linear-gradient(135deg, #003080, #60C0F0)` | ActionButton[primary], header-icon |
| Active Filter | `linear-gradient(135deg, #003080, #4070C0)` | FilterButton[active] |
| Glass Surface | `linear-gradient(135deg, rgba(0,48,128,0.45), rgba(0,32,96,0.25))` | GlassPanel, MetricCard, ActionButton |
| Avatar | `linear-gradient(135deg, #002060, #60C0F0)` | PostCard .post-avatar |
| Hover Sweep | `linear-gradient(90deg, transparent, rgba(96,192,240,0.05), transparent)` | PostCard hover |

---

## 16. Shadow Reference

| Name | Value | Used On |
|------|-------|---------|
| Glass inner lip | `inset 0 1px 1px rgba(224, 236, 244, 0.15)` | All glass surfaces (T.glassHighlight) |
| Ambient depth | `0 12px 40px rgba(0, 0, 0, 0.3)` | GlassPanel, MetricCard |
| Header icon glow | `0 8px 24px rgba(96, 192, 240, 0.4), inset 0 1px 1px rgba(255,255,255,0.3)` | HeaderTitle .header-icon |
| Accent bar glow | `0 2px 12px ${accent}` | MetricCard ::before |
| Active filter glow | `0 4px 12px rgba(96, 192, 240, 0.2)` | FilterButton[active] |
| Action icon hover | `0 0 16px color-mix(in srgb, COLOR 40%, transparent)` | ActionIcon hover |
| Status badge glow | `0 0 12px color-mix(in srgb, COLOR 20%, transparent)` | StatusBadge |
| Avatar shadow | `0 4px 12px rgba(0, 0, 0, 0.4)` | PostCard .post-avatar |
| Focus ring | `0 0 0 4px rgba(96, 192, 240, 0.15), inset 0 1px 2px rgba(0,0,0,0.2)` | SearchInput focus |

---

## 17. Border Radius Reference

| Value | Used On |
|-------|---------|
| 16px | GlassPanel, MetricCard, accent bar top corners |
| 14px | HeaderTitle .header-icon |
| 12px | ActionButton, SearchInput, MetricCard .metric-icon |
| 10px | FilterButton, ActionIcon |
| 999px | StatusBadge (true pill) |
| 50% | Post avatar (48px circle), Activity icon (32px circle) |

---

## 18. Spacing Reference

| Token | Value | Used On |
|-------|-------|---------|
| Container padding | 2rem (1rem on mobile ≤768px) | SocialContainer |
| Header margin-bottom | 2rem | SocialHeader |
| Metrics margin-bottom | 2rem | MetricsGrid |
| Card padding | 1.5rem | MetricCard, PostCardStyled |
| Panel header padding | 1.25rem 1.5rem | SectionHeader |
| Activity row padding | 0.85rem 1.25rem | ActivityItem |
| Grid gap (metrics) | 1rem | MetricsGrid |
| Grid gap (content) | 1.5rem | ContentGrid |
| Post card gap | 1.25rem | PostCardStyled |
| Button gap | 0.75rem | HeaderActions |
| Icon-text gap | 0.5rem / 1rem | SectionHeader / HeaderTitle |
| Inline metric gap | 1.25rem | PostCard .post-metrics |
| Action icon gap | 0.4rem | PostCard .post-actions |
| Empty state padding | 3rem 1.5rem | EmptyState |

---

*Generated for Gemini review — SwanStudios Social Phase A: Admin Social Management View*
*Version 2.0 — Cinematic & Haptic Polish*
*Preset F-Alt "Enchanted Apex: Crystalline Swan"*
*Date: 2026-03-01*
