# SwanStudios Social — Complete Styling Reference for Gemini Review

**Preset:** F-Alt "Enchanted Apex: Crystalline Swan"
**Framework:** styled-components (NO MUI)
**File Modified:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/AdminSocialManagementView.tsx`
**Purpose:** This document contains EVERY style, token, animation, and component pattern used in the Admin Social Management tab rewrite. Nothing is omitted. Gemini can use this to provide enhanced design direction.

---

## Table of Contents

1. [Design Token Constants (T object)](#1-design-token-constants)
2. [Keyframe Animations](#2-keyframe-animations)
3. [Styled Components — Full CSS-in-JS Code](#3-styled-components)
   - 3.1 SocialContainer
   - 3.2 SocialHeader
   - 3.3 HeaderTitle
   - 3.4 HeaderActions
   - 3.5 ActionButton
   - 3.6 MetricsGrid
   - 3.7 MetricCard
   - 3.8 ContentGrid
   - 3.9 GlassPanel
   - 3.10 SectionHeader
   - 3.11 SearchAndFilters
   - 3.12 FilterButton
   - 3.13 PostCardStyled
   - 3.14 StatusBadge
   - 3.15 ActionIcon
   - 3.16 ActivityItem
   - 3.17 EmptyState
   - 3.18 LoadingDots
4. [Component Structure & Data Flow](#4-component-structure)
5. [Responsive Breakpoints](#5-responsive-breakpoints)
6. [Rarity System — Status/Badge Coloring](#6-rarity-system)
7. [Glass Surface Spec](#7-glass-surface-spec)
8. [Motion & Animation Spec](#8-motion-animation-spec)
9. [Typography Spec](#9-typography-spec)
10. [Icon Usage Map](#10-icon-usage-map)
11. [Backend API Integration Points](#11-backend-api-integration)

---

## 1. Design Token Constants

These are the F-Alt "Crystalline Swan" brand tokens defined as a constant object `T` at the top of the file. Every styled component references these.

```typescript
const T = {
  // ── Primary Palette ──
  midnightSapphire: '#002060',   // Primary surface/nav — deepest background
  royalDepth:       '#003080',   // Surface — cards, panels, elevated elements
  iceWing:          '#60C0F0',   // Gaming Accent — CTAs, highlights, primary interactive
  arcticCyan:       '#50A0F0',   // Secondary Accent — links, badges, secondary interactive
  gildedFern:       '#C6A84B',   // Luxury Accent — gold borders, rarity, premium feel
  frostWhite:       '#E0ECF4',   // Text on dark — primary text color
  swanLavender:     '#4070C0',   // Tertiary — subtle accents, active filter backgrounds

  // ── Derived / Composite Tokens ──
  glass:       'rgba(0, 32, 96, 0.55)',       // Glass surface background (midnightSapphire at 55% opacity)
  glassBorder: 'rgba(198, 168, 75, 0.2)',     // Gilded border (gildedFern at 20% opacity)
  glassHover:  'rgba(0, 48, 128, 0.7)',       // Hover state glass (royalDepth at 70% opacity)
  textPrimary: '#E0ECF4',                     // Same as frostWhite — primary text
  textMuted:   'rgba(224, 236, 244, 0.6)',    // Frost white at 60% opacity — secondary text
  success:     '#22c55e',                     // Green — approved status
  warning:     '#f59e0b',                     // Amber — pending/flagged warning
  danger:      '#ef4444',                     // Red — rejected/removed status
};
```

### Token Usage Rules
- **All backgrounds** use `T.glass` (glass surface) or gradient combinations of `T.royalDepth` → `T.iceWing`
- **All borders** use `T.glassBorder` (gilded gold at 20%) as default, `T.iceWing` borders on focus/active
- **All primary text** uses `T.frostWhite` (#E0ECF4)
- **All secondary/muted text** uses `T.textMuted` (rgba(224, 236, 244, 0.6))
- **Interactive elements** glow with `T.iceWing` on hover
- **Status colors** use `T.success`, `T.warning`, `T.danger` for semantic states

---

## 2. Keyframe Animations

### 2.1 Aurora Shift (Header Title Gradient)
```typescript
const auroraShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
```
- **Used on:** HeaderTitle (animated gradient text)
- **Duration:** 6s ease infinite
- **Effect:** Shifts a tri-color gradient (ice-wing → frost-white → gilded-fern) across the text
- **Requirement:** `background-size: 200% 200%` on the parent element

### 2.2 Pulse Glow (Defined but reserved for future use)
```typescript
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(96, 192, 240, 0.2); }
  50%      { box-shadow: 0 0 20px rgba(96, 192, 240, 0.4); }
`;
```
- **Color:** Ice Wing at 20%→40% glow
- **Intended for:** Notification badges, pending items, or attention-grabbing elements

### 2.3 Loading Dots (Inline Animated Ellipsis)
```typescript
keyframes`
  0%  { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
`
```
- **Used on:** LoadingDots component during data fetch
- **Duration:** 1s steps(1) infinite

### 2.4 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```
- Applied at the `SocialContainer` level — disables ALL animations for accessibility

---

## 3. Styled Components — Full CSS-in-JS Code

### 3.1 SocialContainer (Root Wrapper)
```typescript
const SocialContainer = styled(motion.div)`
  padding: 1.5rem;
  min-height: 100%;

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;
```
- **Framer Motion props:** `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.4 }}`
- **Notes:** Fade-up entrance animation; no background set (inherits from admin dashboard shell)

### 3.2 SocialHeader (Top Bar)
```typescript
const SocialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${T.glassBorder};
  flex-wrap: wrap;
  gap: 1rem;
`;
```
- **Layout:** Flexbox space-between, wraps on small screens
- **Border:** Gilded gold separator (1px solid rgba(198, 168, 75, 0.2))

### 3.3 HeaderTitle (Aurora Gradient Text)
```typescript
const HeaderTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.frostWhite} 50%, ${T.gildedFern} 100%);
  background-size: 200% 200%;
  animation: ${auroraShift} 6s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;

  .header-icon {
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    border-radius: 12px;
    padding: 0.6rem;
    color: ${T.frostWhite};
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-text-fill-color: ${T.frostWhite};
  }
`;
```
- **Text effect:** Animated aurora gradient across text (ice-wing → frost-white → gilded-fern)
- **Icon container:** Gradient pill with ice-wing glow shadow (0 4px 16px rgba(96, 192, 240, 0.3))
- **Icon used:** `<Sparkles size={22} />` from lucide-react

### 3.4 HeaderActions (Button Group)
```typescript
const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;
```

### 3.5 ActionButton (Primary Interactive Button)
```typescript
const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.6rem 1.25rem;
  border-radius: 12px;
  min-height: 44px;
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary': return T.iceWing;
      case 'danger': return T.danger;
      default: return T.glassBorder;
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return `linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing})`;
      case 'danger': return T.danger;
      default: return T.glass;
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
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;
```
- **Touch target:** 44px minimum height (mobile-first)
- **Variants:**
  - `default` — glass surface with gilded border
  - `primary` — royal-depth → ice-wing gradient with ice-wing border
  - `danger` — solid red background with red border
- **Hover:** Lifts 2px, adds ice-wing glow shadow
- **Easing:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — smooth deceleration

### 3.6 MetricsGrid (4-Column Dashboard Metrics)
```typescript
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`;
```
- **Breakpoints:** 4-col → 2-col (≤1280px) → 1-col (≤640px)

### 3.7 MetricCard (Glass Stat Card with Accent Bar)
```typescript
const MetricCard = styled(motion.div)<{ $accent?: string }>`
  background: ${T.glass};
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid ${T.glassBorder};
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$accent || T.iceWing};
    border-radius: 16px 16px 0 0;
  }

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 8px 32px rgba(0, 32, 96, 0.4), 0 0 20px rgba(96, 192, 240, 0.1);
  }

  .metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(96, 192, 240, 0.1);
    color: ${props => props.$accent || T.iceWing};
    margin-bottom: 0.75rem;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: ${T.frostWhite};
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
- **Glass surface:** `rgba(0, 32, 96, 0.55)` + `backdrop-filter: blur(20px)`
- **Accent bar:** 3px top border, color set by `$accent` prop (T.iceWing, T.success, T.gildedFern, T.warning)
- **Hover:** Border brightens to ice-wing, dual shadow (deep sapphire + ice glow)
- **Icon container:** 40x40px rounded square with tinted background matching accent
- **Framer Motion:** `whileHover={{ y: -3 }}` (lifts on hover)

### 3.8 ContentGrid (Main 2-Column Layout)
```typescript
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;
```
- **Layout:** 2:1 ratio (posts panel : activity sidebar)
- **Collapses:** Single column at ≤1024px

### 3.9 GlassPanel (Reusable Glass Container)
```typescript
const GlassPanel = styled.div`
  background: ${T.glass};
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  overflow: hidden;
`;
```
- **Core glass pattern:** Used for both content management panel and activity sidebar
- **Border radius:** 16px (consistent across all panels)

### 3.10 SectionHeader (Panel Title Bar)
```typescript
const SectionHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.1);
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
- **Separator:** More subtle than main header — gilded at 10% opacity
- **Typography:** 1.1rem, 600 weight, frost white

### 3.11 SearchAndFilters (Search Bar + Filter Buttons)
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
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: ${T.textMuted};
    }
  }

  .search-input {
    width: 100%;
    padding: 0.6rem 1rem 0.6rem 2.5rem;
    border: 1px solid rgba(96, 192, 240, 0.2);
    border-radius: 10px;
    background: rgba(0, 32, 96, 0.4);
    color: ${T.frostWhite};
    font-size: 0.875rem;
    min-height: 44px;
    box-sizing: border-box;

    &::placeholder { color: ${T.textMuted}; }
    &:focus {
      outline: none;
      border-color: ${T.iceWing};
      box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.15);
    }
  }
`;
```
- **Search input:** Dark glass background (midnightSapphire at 40%), ice-wing border on focus with 3px glow ring
- **Touch target:** 44px min-height on input
- **Responsive:** Wraps on narrow screens, search has min-width 200px

### 3.12 FilterButton (Status Filter Pill)
```typescript
const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border: 1px solid ${props => props.$active ? T.iceWing : 'rgba(96, 192, 240, 0.2)'};
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${T.royalDepth}, ${T.swanLavender})`
    : 'transparent'};
  color: ${props => props.$active ? T.frostWhite : T.textMuted};
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${T.iceWing};
    color: ${T.frostWhite};
  }
`;
```
- **Active state:** Royal-depth → swan-lavender gradient, ice-wing border, frost-white text
- **Inactive state:** Transparent, muted border/text
- **Touch target:** 44px min-height

### 3.13 PostCardStyled (Post Row in Moderation List)
```typescript
const PostCardStyled = styled(motion.div)`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.08);
  display: flex;
  gap: 1rem;
  transition: background 0.2s ease;

  &:hover { background: rgba(0, 48, 128, 0.3); }
  &:last-child { border-bottom: none; }

  .post-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${T.frostWhite};
    font-weight: 600;
    font-size: 0.9rem;
    flex-shrink: 0;
    border: 2px solid ${T.glassBorder};
  }

  .post-body { flex: 1; min-width: 0; }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .user-name { font-weight: 600; color: ${T.frostWhite}; font-size: 0.9rem; }
  .post-time { font-size: 0.75rem; color: ${T.textMuted}; }
  .post-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }

  .post-text {
    color: ${T.textMuted};
    line-height: 1.6;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
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
- **Avatar:** 44x44px circle with royal-depth → ice-wing gradient, gilded border (2px)
- **Hover:** Row background shifts to royal-depth at 30% opacity
- **Separator:** Ultra-subtle gilded line at 8% opacity
- **Content:** Post text is muted color with 1.6 line-height for readability
- **Framer Motion:** Staggered entrance (`initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`)

### 3.14 StatusBadge (Moderation Status Pill)
```typescript
const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;

  ${props => {
    switch (props.$status) {
      case 'approved':
        return `
          background: rgba(34, 197, 94, 0.15);
          color: ${T.success};
          border: 1px solid rgba(34, 197, 94, 0.3);
        `;
      case 'pending':
        return `
          background: rgba(198, 168, 75, 0.15);
          color: ${T.gildedFern};
          border: 1px solid rgba(198, 168, 75, 0.3);
        `;
      case 'flagged':
        return `
          background: rgba(239, 68, 68, 0.15);
          color: ${T.danger};
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;
      default:
        return `
          background: rgba(96, 192, 240, 0.1);
          color: ${T.iceWing};
          border: 1px solid rgba(96, 192, 240, 0.2);
        `;
    }
  }}
`;
```
- **Pattern:** Tinted background (15% opacity) + matching text + border (30% opacity)
- **Status mapping:**
  - `approved` → green (#22c55e) — success semantic
  - `pending` → gold (#C6A84B) — gilded/luxury attention
  - `flagged` → red (#ef4444) — danger semantic
  - `default` → ice-wing (#60C0F0) — neutral
- **Shape:** Full pill (20px border-radius)

### 3.15 ActionIcon (Moderation Action Buttons)
```typescript
const ActionIcon = styled(motion.button)<{ $variant?: 'approve' | 'reject' | 'flag' | 'edit' }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'approve': return 'rgba(34, 197, 94, 0.1)';
      case 'reject':  return 'rgba(239, 68, 68, 0.1)';
      case 'flag':    return 'rgba(245, 158, 11, 0.1)';
      default:        return 'rgba(96, 192, 240, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'approve': return T.success;
      case 'reject':  return T.danger;
      case 'flag':    return T.warning;
      default:        return T.iceWing;
    }
  }};

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 12px ${props => {
      switch (props.$variant) {
        case 'approve': return 'rgba(34, 197, 94, 0.3)';
        case 'reject':  return 'rgba(239, 68, 68, 0.3)';
        case 'flag':    return 'rgba(245, 158, 11, 0.3)';
        default:        return 'rgba(96, 192, 240, 0.3)';
      }
    }};
  }
`;
```
- **Size:** 36x36px (compact — pairs of these in post rows)
- **Hover:** Scales 1.1x with colored glow matching variant
- **Framer Motion:** `whileHover={{ scale: 1.1 }}`, `whileTap={{ scale: 0.9 }}`

### 3.16 ActivityItem (Sidebar Activity Row)
```typescript
const ActivityItem = styled.div`
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.08);
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

  .activity-text { font-size: 0.85rem; color: ${T.textPrimary}; margin-bottom: 0.15rem; }
  .activity-time { font-size: 0.75rem; color: ${T.textMuted}; }
`;
```
- **Icon:** 32px circle with ice-wing tint
- **Separator:** Ultra-subtle gilded line at 8% opacity

### 3.17 EmptyState (No Content Placeholder)
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
- **Generous padding:** 3rem top/bottom for breathing room
- **Icon:** 40% opacity, centered above text
- **Title:** Frost white, 1.1rem
- **Body:** Muted text, 0.9rem

### 3.18 LoadingDots (Animated Ellipsis)
```typescript
const LoadingDots = styled.span`
  &::after {
    content: '';
    animation: ${keyframes`
      0%  { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
    `} 1s steps(1) infinite;
  }
`;
```
- **Pure CSS animation** — no JS timer needed

---

## 4. Component Structure & Data Flow

### Component Hierarchy
```
AdminSocialManagementView (root)
├── SocialHeader
│   ├── HeaderTitle (aurora gradient text + Sparkles icon)
│   └── HeaderActions
│       ├── ActionButton (Refresh — triggers fetchPosts())
│       └── ActionButton[$variant="primary"] (Export — placeholder)
│
├── MetricsGrid (4-column responsive)
│   ├── MetricCard[$accent=T.iceWing] → Total Posts (live from API)
│   ├── MetricCard[$accent=T.success] → Active Posters (unique userId count)
│   ├── MetricCard[$accent=T.gildedFern] → Total Engagement (sum of likesCount)
│   └── MetricCard[$accent=T.warning] → Pending Moderation (filtered count)
│
└── ContentGrid (2:1 layout)
    ├── GlassPanel (Content Management)
    │   ├── SectionHeader ("Content Management" + Bulk Actions button)
    │   ├── SearchAndFilters
    │   │   ├── search-input (text search)
    │   │   └── FilterButton × 4 (All / Approved / Pending / Flagged)
    │   └── PostCardStyled × N (from filtered API data)
    │       ├── post-avatar (initials circle)
    │       ├── post-header (username + timestamp + action buttons)
    │       ├── post-text (content)
    │       ├── post-metrics (likes / comments / type)
    │       └── StatusBadge (moderation status)
    │
    └── GlassPanel (Recent Activity sidebar)
        ├── SectionHeader ("Recent Activity")
        └── ActivityItem × 4 (from latest posts)
```

### State Management
```typescript
const [refreshing, setRefreshing] = useState(false);       // Refresh button spinner
const [searchTerm, setSearchTerm] = useState('');           // Search input value
const [statusFilter, setStatusFilter] = useState('all');    // Active filter tab
const [posts, setPosts] = useState<SocialPost[]>([]);       // API post data
const [loading, setLoading] = useState(true);               // Initial load state
const [totalPosts, setTotalPosts] = useState(0);            // Pagination total
const [recentActivity, setRecentActivity] = useState([]);   // Derived from posts
```

### API Calls
```typescript
// Fetch posts feed
GET /api/social/posts/feed?limit=50&offset=0
→ Response: { success: true, posts: SocialPost[], pagination: { total } }

// Moderate a post
PUT /api/social/posts/${postId}
→ Body: { moderationStatus: 'approved' | 'rejected' | 'flagged' }
→ Optimistic UI update: setPosts(prev => prev.map(p => p.id === postId ? { ...p, moderationStatus } : p))
```

### Computed Metrics (Derived from posts array)
```typescript
const pendingCount = posts.filter(p => p.moderationStatus === 'pending').length;
const flaggedCount = posts.filter(p => p.moderationStatus === 'flagged').length;
const totalLikes   = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
const uniqueUsers  = new Set(posts.map(p => p.userId)).size;
```

---

## 5. Responsive Breakpoints

| Breakpoint | MetricsGrid | ContentGrid | SearchAndFilters |
|-----------|-------------|-------------|-----------------|
| ≥1281px | 4 columns | 2:1 (posts : sidebar) | Single row |
| 768–1280px | 2 columns | 2:1 (posts : sidebar) | Wraps |
| ≤1024px | 2 columns | Single column (stacked) | Wraps |
| ≤640px | 1 column | Single column (stacked) | Wraps, search full-width |

### Touch Targets (Mobile-First)
- All buttons: `min-height: 44px`
- Search input: `min-height: 44px`
- Filter buttons: `min-height: 44px`
- Post avatar: `44px × 44px`
- Action icons: `36px × 36px` (compact, but grouped — total touch area exceeds 44px per row)

---

## 6. Rarity System — Status/Badge Coloring

This is the core visual language for distinguishing content states:

| Status | Background | Text Color | Border | Usage |
|--------|-----------|-----------|--------|-------|
| Approved | `rgba(34, 197, 94, 0.15)` | `#22c55e` | `rgba(34, 197, 94, 0.3)` | Verified content |
| Pending | `rgba(198, 168, 75, 0.15)` | `#C6A84B` | `rgba(198, 168, 75, 0.3)` | Awaiting review (gilded = attention) |
| Flagged | `rgba(239, 68, 68, 0.15)` | `#ef4444` | `rgba(239, 68, 68, 0.3)` | Reported/problematic |
| Default | `rgba(96, 192, 240, 0.1)` | `#60C0F0` | `rgba(96, 192, 240, 0.2)` | Neutral/unknown |

### Metric Card Accents (Top Border Bar)
| Metric | Accent Color | Meaning |
|--------|-------------|---------|
| Total Posts | `#60C0F0` (Ice Wing) | Primary metric |
| Active Posters | `#22c55e` (Success) | Growth/positive |
| Total Engagement | `#C6A84B` (Gilded Fern) | Luxury/premium |
| Pending Moderation | `#f59e0b` (Warning) when >0, `#60C0F0` otherwise | Attention needed |

---

## 7. Glass Surface Spec

### Standard Glass Panel
```css
background: rgba(0, 32, 96, 0.55);     /* Midnight Sapphire at 55% */
backdrop-filter: blur(20px);
border-radius: 16px;
border: 1px solid rgba(198, 168, 75, 0.2);  /* Gilded Fern at 20% */
overflow: hidden;
```

### Glass Hover State
```css
border-color: rgba(96, 192, 240, 0.3);  /* Ice Wing at 30% — brighter on hover */
box-shadow: 0 8px 32px rgba(0, 32, 96, 0.4),  /* Deep sapphire shadow */
            0 0 20px rgba(96, 192, 240, 0.1);   /* Ice Wing glow */
```

### Glass Input Field
```css
background: rgba(0, 32, 96, 0.4);       /* Slightly transparent */
border: 1px solid rgba(96, 192, 240, 0.2);
color: #E0ECF4;
&:focus {
  border-color: #60C0F0;
  box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.15);  /* Focus ring */
}
```

### Glass Button (Default Variant)
```css
background: rgba(0, 32, 96, 0.55);
backdrop-filter: blur(12px);
border: 1px solid rgba(198, 168, 75, 0.2);
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(96, 192, 240, 0.25);
}
```

---

## 8. Motion & Animation Spec

### Page Entrance
```typescript
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4 }}
```

### Post Card Entrance (Staggered)
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.25 }}
```

### Button Interactions
```typescript
whileHover={{ scale: 1.03 }}  // Subtle scale on buttons
whileTap={{ scale: 0.97 }}    // Press feedback
```

### Metric Card Hover
```typescript
whileHover={{ y: -3 }}        // Lifts 3px
transition={{ duration: 0.2 }}
```

### Action Icon Interactions
```typescript
whileHover={{ scale: 1.1 }}   // More pronounced for small targets
whileTap={{ scale: 0.9 }}     // Strong press feedback
```

### Easing Curves
- **Primary transition:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — smooth deceleration (used on hover transforms)
- **Quick transitions:** `ease` with 0.2s (used on color/opacity changes)
- **Aurora animation:** `ease` with 6s (slow, ambient)

### Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 9. Typography Spec

| Element | Size | Weight | Color | Usage |
|---------|------|--------|-------|-------|
| HeaderTitle (h1) | 1.75rem | 700 | Aurora gradient (animated) | Page title |
| SectionHeader (h2/h3) | 1.1rem | 600 | #E0ECF4 (Frost White) | Panel titles |
| MetricCard .metric-value | 1.75rem | 700 | #E0ECF4 | Big stat numbers |
| MetricCard .metric-label | 0.85rem | 500 | rgba(224, 236, 244, 0.6) | Stat labels |
| MetricCard .metric-change | 0.8rem | 500 | rgba(224, 236, 244, 0.6) | Change indicator |
| ActionButton | 0.875rem | 500 | #E0ECF4 | Button text |
| FilterButton | 0.85rem | 400 | #E0ECF4 (active) / muted | Filter labels |
| PostCard .user-name | 0.9rem | 600 | #E0ECF4 | Author name |
| PostCard .post-text | 0.9rem | 400 | rgba(224, 236, 244, 0.6) | Post content (line-height: 1.6) |
| PostCard .post-time | 0.75rem | 400 | rgba(224, 236, 244, 0.6) | Timestamp |
| PostCard .metric | 0.8rem | 400 | rgba(224, 236, 244, 0.6) | Like/comment counts |
| StatusBadge | 0.75rem | 600 | Status-specific | Status label (capitalized) |
| ActivityItem .activity-text | 0.85rem | 400 | #E0ECF4 | Activity description |
| ActivityItem .activity-time | 0.75rem | 400 | rgba(224, 236, 244, 0.6) | Activity timestamp |
| EmptyState h3 | 1.1rem | 400 | #E0ECF4 | Empty state title |
| EmptyState p | 0.9rem | 400 | rgba(224, 236, 244, 0.6) | Empty state body |

---

## 10. Icon Usage Map

All icons from `lucide-react`:

| Icon | Size | Usage | Location |
|------|------|-------|----------|
| Sparkles | 22px | Header title icon | HeaderTitle .header-icon |
| RefreshCw | 15px | Refresh button | HeaderActions |
| BarChart3 | 15px | Export button | HeaderActions |
| MessageSquare | 20px / 18px / 40px | Posts metric / Section header / Empty state | MetricCard / SectionHeader / EmptyState |
| Users | 20px | Active Posters metric | MetricCard |
| Heart | 20px / 14px / 12px | Engagement metric / Post like count / Metric change | MetricCard / PostCard / MetricCard |
| Shield | 20px | Pending Moderation metric | MetricCard |
| TrendingUp | 12px | "Live data" / "Unique users" indicator | MetricCard .metric-change |
| AlertTriangle | 12px | Flagged count indicator | MetricCard .metric-change |
| Settings | 15px | Bulk Actions button | SectionHeader |
| Search | 15px | Search input icon | SearchAndFilters |
| CheckCircle | 14px / 11px | Approve action / Approved status | ActionIcon / StatusBadge |
| Flag | 14px / 11px | Flag action / Flagged status | ActionIcon / StatusBadge |
| Trash2 | 14px | Reject/remove action | ActionIcon |
| MoreHorizontal | 14px | Details/overflow action | ActionIcon |
| Clock | 11px / 28px | Pending status / Empty activity | StatusBadge / EmptyState |
| MessageCircle | 14px | Comment count | PostCard .post-metrics |
| Eye | 14px | Post type indicator | PostCard .post-metrics |
| Activity | 16px | Recent Activity section header | SectionHeader |

---

## 11. Backend API Integration Points

### Working Endpoints (Wired in this Component)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/social/posts/feed?limit=50&offset=0` | GET | Fetch all posts with user info | 200 — Working |
| `/api/social/posts/${id}` | PUT | Update moderation status | 200 — Working |

### Available but Not Yet Wired

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/social/posts` | POST | Create new post | 201 — Working |
| `/api/social/posts/${id}` | GET | Get single post + comments | 200 — Working |
| `/api/social/posts/${id}/like` | POST | Like/unlike a post | 200 — Working |
| `/api/social/posts/${id}/comments` | POST | Add comment to post | 201 — Working |

### Broken (DB Tables Missing — Do Not Wire)

| Endpoint | Method | Error |
|----------|--------|-------|
| `/api/social/friendships` | GET | 500 — Sequelize model error |
| `/api/social/challenges` | GET | 404 — Route not registered |
| `/api/v1/gamification/social-feed` | GET | 500 — `user_follows` table missing |
| `/api/v1/gamification/discover-users` | GET | 500 — `user_follows` table missing |
| `/api/v1/gamification/profile` | GET | 404 — Route not found |

---

## 12. Gradient Reference (Quick Lookup)

### Aurora Title Gradient
```css
linear-gradient(135deg, #60C0F0 0%, #E0ECF4 50%, #C6A84B 100%)
```

### Primary CTA Gradient
```css
linear-gradient(135deg, #003080, #60C0F0)
```

### Active Filter Gradient
```css
linear-gradient(135deg, #003080, #4070C0)
```

### Avatar Gradient
```css
linear-gradient(135deg, #003080, #60C0F0)
```

---

## 13. Shadow Reference (Quick Lookup)

| Name | Value | Usage |
|------|-------|-------|
| Header icon shadow | `0 4px 16px rgba(96, 192, 240, 0.3)` | Sparkles icon container |
| Button hover shadow | `0 4px 16px rgba(96, 192, 240, 0.25)` | ActionButton hover |
| Card hover shadow | `0 8px 32px rgba(0, 32, 96, 0.4), 0 0 20px rgba(96, 192, 240, 0.1)` | MetricCard hover |
| Action icon hover glow | `0 0 12px rgba(R, G, B, 0.3)` | ActionIcon hover (color matches variant) |
| Focus ring | `0 0 0 3px rgba(96, 192, 240, 0.15)` | Search input focus |

---

## 14. Border Radius Reference

| Value | Usage |
|-------|-------|
| 16px | GlassPanel, MetricCard, MetricCard accent bar top corners |
| 12px | ActionButton, HeaderTitle .header-icon |
| 10px | MetricCard .metric-icon, SearchAndFilters .search-input |
| 8px | FilterButton, ActionIcon |
| 20px | StatusBadge (full pill) |
| 50% | Post avatar, Activity icon (circle) |

---

## 15. Spacing Reference

| Token | Value | Usage |
|-------|-------|-------|
| Container padding | 1.5rem | SocialContainer |
| Section gap | 1.5rem | Between MetricsGrid and ContentGrid |
| Card padding | 1.25rem | MetricCard |
| Panel header padding | 1.25rem 1.5rem | SectionHeader |
| Post row padding | 1.25rem 1.5rem | PostCardStyled |
| Activity row padding | 0.75rem 1.25rem | ActivityItem |
| Grid gap (metrics) | 1rem | MetricsGrid |
| Grid gap (content) | 1.5rem | ContentGrid |
| Button gap | 0.75rem | HeaderActions |
| Icon-text gap | 0.5rem | SectionHeader h2/h3, ActionButton |
| Inline metric gap | 1.25rem | PostCard .post-metrics |
| Empty state padding | 3rem 1.5rem | EmptyState |

---

*Generated for Gemini review — SwanStudios Social Phase A: Admin Social Management View*
*Preset F-Alt "Enchanted Apex: Crystalline Swan"*
*Date: 2026-03-01*
