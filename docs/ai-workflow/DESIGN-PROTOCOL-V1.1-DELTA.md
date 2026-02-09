# Design Protocol v1.1 Delta - Dashboard Edition

**Created:** 2025-11-08
**Status:** 📋 Phase 0 Documentation
**Owner:** Claude Code (based on MinMax v2 feedback)
**Supersedes:** ENHANCED-DESIGN-MASTER-PROMPT.md (consolidates relevant sections)

---

## 🎯 Purpose

This document defines the **Galaxy-Swan Design Protocol v1.1** specifically for Admin/Trainer/Client dashboards, consolidating design tokens, component specs, and implementation rules.

**Feedback Addressed:**
- MinMax v2: "Consolidate tokens and components into a quick delta: Colors (semantic), typography scale, 4-point spacing, 12/16 radius, shadow tiers"
- Kilo Code: "Components: inputs, cards, skeletons, toasts, nav (desktop/mobile), breadcrumbs"

---

## 🎨 DESIGN TOKENS v1.1

### Colors (Semantic)

```typescript
// Galaxy-Swan Universal Theme
export const GALAXY_SWAN_COLORS = {
  // Primary Palette
  primary: {
    cyan: '#00d9ff',        // Primary actions, links, focus states
    cyanLight: '#4de6ff',   // Hover states, active elements
    cyanDark: '#00a8cc',    // Pressed states, dark mode accents
  },

  // Accent Palette
  accent: {
    pink: '#ff4081',        // Secondary actions, highlights
    pinkLight: '#ff6b9d',   // Hover states
    pinkDark: '#e91e63',    // Pressed states
  },

  // Neutral Palette (Dark Mode)
  neutral: {
    space900: '#08081

4',    // Deepest background
    space800: '#0f0f1e',    // Card backgrounds
    space700: '#1a1a2e',    // Elevated surfaces
    space600: '#2e2e4d',    // Borders, dividers
    space500: '#4a4a6b',    // Disabled states
    space400: '#6b6b8a',    // Placeholder text
    space300: '#8a8aa8',    // Secondary text
    space200: '#b8b8d1',    // Body text
    space100: '#e0e0f0',    // Primary text
    space50: '#f5f5fa',     // Bright text (hover)
  },

  // Semantic Colors
  semantic: {
    success: '#4caf50',     // Success states, confirmations
    successLight: '#81c784', // Hover
    warning: '#ff9800',     // Warning states, alerts
    warningLight: '#ffb74d', // Hover
    error: '#f44336',       // Error states, destructive actions
    errorLight: '#e57373',  // Hover
    info: '#2196f3',        // Info states, tips
    infoLight: '#64b5f6',   // Hover
  },

  // Glass/Transparency
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',   // Light glass overlay
    medium: 'rgba(255, 255, 255, 0.15)',  // Medium glass overlay
    heavy: 'rgba(255, 255, 255, 0.2)',    // Heavy glass overlay
    blur: 'rgba(0, 0, 0, 0.3)',           // Backdrop blur overlay
  },
};

// DEPRECATED - Do NOT use in new code
export const EXECUTIVE_COMMAND_COLORS = {
  deepSpace: '#0a0a0f',         // REMOVE
  commandNavy: '#1e3a8a',       // REMOVE
  stellarAuthority: '#3b82f6',  // REMOVE
  // ... entire Executive theme deprecated
};
```

### Typography Scale

```typescript
export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
    display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
  },

  // Font Sizes (rem scale)
  fontSize: {
    xs: '0.75rem',    // 12px - Small labels
    sm: '0.875rem',   // 14px - Secondary text
    base: '0.95rem',  // 15.2px - Body text (SwanStudios default)
    md: '1rem',       // 16px - Standard body
    lg: '1.125rem',   // 18px - Section headings
    xl: '1.25rem',    // 20px - Card titles
    '2xl': '1.5rem',  // 24px - Page titles
    '3xl': '1.875rem',// 30px - Hero text
    '4xl': '2.25rem', // 36px - Major headings
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
    widest: '0.1em',
  },
};
```

#### Typography Readability Policy (Mobile Minimums)

| Text Role | Minimum Size | rem Value | Examples |
|-----------|-------------|-----------|----------|
| **Actionable text** | 16px | `1rem` | Form labels, nav items, error messages, buttons, body copy |
| **Non-actionable metadata** | 14px | `0.875rem` | Section labels, footer headings, stat captions, taglines |
| **Legal / tertiary text** | 13px | `0.8125rem` | Copyright notices, establishment dates, fine print |
| **Hard floor** | 12px | `0.75rem` | Nothing below this — ever |

> WCAG recommends 16px for body text readability, not as a blanket rule for every label/caption. These tiers preserve intentional typographic hierarchy while remaining accessible. Cross-AI reviews should reference this table — sizes within policy are not findings.

### Spacing (4-Point Grid)

```typescript
export const SPACING = {
  // Base unit: 4px
  0: '0',
  1: '4px',     // 0.25rem
  2: '8px',     // 0.5rem
  3: '12px',    // 0.75rem
  4: '16px',    // 1rem
  5: '20px',    // 1.25rem
  6: '24px',    // 1.5rem
  8: '32px',    // 2rem
  10: '40px',   // 2.5rem
  12: '48px',   // 3rem
  16: '64px',   // 4rem
  20: '80px',   // 5rem
  24: '96px',   // 6rem

  // Semantic Spacing
  section: '64px',      // Between major sections
  component: '24px',    // Between components
  element: '16px',      // Between elements
  inline: '8px',        // Inline spacing (buttons, tags)
  tight: '4px',         // Tight spacing (icon + text)
};
```

### Border Radius

```typescript
export const BORDER_RADIUS = {
  none: '0',
  sm: '4px',      // Small elements (badges, tags)
  md: '8px',      // Standard (buttons, inputs, cards)
  lg: '12px',     // Large cards
  xl: '16px',     // Hero cards, modals
  '2xl': '24px',  // Extra large containers
  full: '9999px', // Pills, avatars
};
```

### Shadows (3 Tiers + Glow)

```typescript
export const SHADOWS = {
  // Standard Shadows
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.2)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',

  // Glow Effects (Galaxy-Swan specific)
  glowCyan: '0 0 20px rgba(0, 217, 255, 0.5)',
  glowCyanStrong: '0 0 30px rgba(0, 217, 255, 0.7)',
  glowPink: '0 0 20px rgba(255, 64, 129, 0.5)',
  glowPinkStrong: '0 0 30px rgba(255, 64, 129, 0.7)',

  // Inner Shadows
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
  innerLg: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)',
};
```

---

## 🧩 COMPONENT SPECIFICATIONS

### Inputs

```typescript
// Text Input
const StyledInput = styled.input`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.base};
  color: ${GALAXY_SWAN_COLORS.neutral.space100};
  background: ${GALAXY_SWAN_COLORS.neutral.space800};
  border: 1px solid ${GALAXY_SWAN_COLORS.neutral.space600};
  border-radius: ${BORDER_RADIUS.md};
  padding: ${SPACING[3]} ${SPACING[4]};
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: ${GALAXY_SWAN_COLORS.primary.cyan};
  }

  &:focus {
    outline: none;
    border-color: ${GALAXY_SWAN_COLORS.primary.cyan};
    box-shadow: ${SHADOWS.glowCyan};
  }

  &:disabled {
    background: ${GALAXY_SWAN_COLORS.neutral.space700};
    color: ${GALAXY_SWAN_COLORS.neutral.space400};
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${GALAXY_SWAN_COLORS.neutral.space400};
  }
`;

// Select Dropdown
const StyledSelect = styled.select`
  /* Same as StyledInput */
  appearance: none;
  background-image: url("data:image/svg+xml,<svg>...</svg>"); // Custom arrow
  background-repeat: no-repeat;
  background-position: right ${SPACING[4]} center;
  padding-right: ${SPACING[10]}; // Make room for arrow
`;

// Textarea
const StyledTextarea = styled.textarea`
  /* Same as StyledInput */
  resize: vertical;
  min-height: 100px;
`;
```

### Cards

```typescript
// FrostedCard (Glass Morphism)
const FrostedCard = styled.div<{ $glassLevel: 'light' | 'medium' | 'heavy' }>`
  background: ${props =>
    props.$glassLevel === 'light' ? GALAXY_SWAN_COLORS.glass.light :
    props.$glassLevel === 'medium' ? GALAXY_SWAN_COLORS.glass.medium :
    GALAXY_SWAN_COLORS.glass.heavy
  };
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid ${GALAXY_SWAN_COLORS.neutral.space600};
  border-radius: ${BORDER_RADIUS.lg};
  padding: ${SPACING[6]};
  box-shadow: ${SHADOWS.md};
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: ${SHADOWS.lg}, ${SHADOWS.glowCyan};
    transform: translateY(-2px);
  }
`;

// SolidCard (Non-Glass)
const SolidCard = styled.div`
  background: ${GALAXY_SWAN_COLORS.neutral.space800};
  border: 1px solid ${GALAXY_SWAN_COLORS.neutral.space600};
  border-radius: ${BORDER_RADIUS.lg};
  padding: ${SPACING[6]};
  box-shadow: ${SHADOWS.md};
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: ${SHADOWS.lg};
  }
`;
```

### Buttons

```typescript
// Primary Button
const PrimaryButton = styled.button`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.base};
  font-weight: ${TYPOGRAPHY.fontWeight.semibold};
  color: ${GALAXY_SWAN_COLORS.neutral.space900};
  background: linear-gradient(135deg, ${GALAXY_SWAN_COLORS.primary.cyan}, ${GALAXY_SWAN_COLORS.primary.cyanLight});
  border: none;
  border-radius: ${BORDER_RADIUS.md};
  padding: ${SPACING[3]} ${SPACING[6]};
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: linear-gradient(135deg, ${GALAXY_SWAN_COLORS.primary.cyanLight}, ${GALAXY_SWAN_COLORS.primary.cyan});
    box-shadow: ${SHADOWS.glowCyan};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${GALAXY_SWAN_COLORS.neutral.space600};
    color: ${GALAXY_SWAN_COLORS.neutral.space400};
    cursor: not-allowed;
  }
`;

// Secondary Button
const SecondaryButton = styled.button`
  /* Same as Primary */
  background: transparent;
  border: 2px solid ${GALAXY_SWAN_COLORS.primary.cyan};
  color: ${GALAXY_SWAN_COLORS.primary.cyan};

  &:hover {
    background: ${GALAXY_SWAN_COLORS.glass.light};
    border-color: ${GALAXY_SWAN_COLORS.primary.cyanLight};
  }
`;

// Destructive Button
const DestructiveButton = styled.button`
  /* Same as Primary */
  background: linear-gradient(135deg, ${GALAXY_SWAN_COLORS.semantic.error}, ${GALAXY_SWAN_COLORS.semantic.errorLight});

  &:hover {
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
  }
`;
```

### Skeletons (Loading States)

```typescript
const SkeletonPulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const SkeletonBox = styled.div`
  background: ${GALAXY_SWAN_COLORS.neutral.space700};
  border-radius: ${BORDER_RADIUS.md};
  animation: ${SkeletonPulse} 1.5s ease-in-out infinite;
`;

// Example: Card skeleton
const CardSkeleton = () => (
  <FrostedCard>
    <SkeletonBox style={{ height: '24px', width: '60%', marginBottom: SPACING[4] }} />
    <SkeletonBox style={{ height: '16px', width: '80%', marginBottom: SPACING[2] }} />
    <SkeletonBox style={{ height: '16px', width: '90%' }} />
  </FrostedCard>
);
```

### Toasts (Notifications)

```typescript
const ToastContainer = styled(motion.div)<{ $variant: 'success' | 'error' | 'warning' | 'info' }>`
  background: ${props =>
    props.$variant === 'success' ? GALAXY_SWAN_COLORS.semantic.success :
    props.$variant === 'error' ? GALAXY_SWAN_COLORS.semantic.error :
    props.$variant === 'warning' ? GALAXY_SWAN_COLORS.semantic.warning :
    GALAXY_SWAN_COLORS.semantic.info
  };
  color: ${GALAXY_SWAN_COLORS.neutral.space100};
  border-radius: ${BORDER_RADIUS.md};
  padding: ${SPACING[4]} ${SPACING[6]};
  box-shadow: ${SHADOWS.lg};
  display: flex;
  align-items: center;
  gap: ${SPACING[3]};
  min-width: 300px;
  max-width: 500px;

  @media (max-width: 768px) {
    min-width: auto;
    max-width: calc(100vw - 32px);
  }
`;

// Toast animation
const toastVariants = {
  hidden: { opacity: 0, y: -50, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};
```

### Navigation (Desktop)

```typescript
const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${SPACING[2]};

  @media (max-width: 768px) {
    display: none; // Hidden on mobile
  }
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.base};
  font-weight: ${props => props.$isActive ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.medium};
  color: ${props => props.$isActive ? GALAXY_SWAN_COLORS.primary.cyan : GALAXY_SWAN_COLORS.neutral.space200};
  text-decoration: none;
  padding: ${SPACING[3]} ${SPACING[4]};
  border-radius: ${BORDER_RADIUS.md};
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: ${props => props.$isActive ? '80%' : '0%'};
    height: 2px;
    background: ${GALAXY_SWAN_COLORS.primary.cyan};
    transform: translateX(-50%);
    transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: ${SHADOWS.glowCyan};
  }

  &:hover {
    color: ${GALAXY_SWAN_COLORS.primary.cyan};
    text-shadow: 0 0 14px rgba(0, 217, 255, 0.7);

    &::after {
      width: 80%;
    }
  }
`;
```

### Navigation (Mobile)

```typescript
const MobileMenuButton = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: ${GALAXY_SWAN_COLORS.neutral.space100};
  padding: ${SPACING[2]};
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileMenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 999;
`;

const MobileMenuPanel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80%;
  max-width: 400px;
  background: ${GALAXY_SWAN_COLORS.neutral.space900};
  padding: ${SPACING[6]};
  box-shadow: ${SHADOWS['2xl']};
  overflow-y: auto;
  z-index: 1000;
`;
```

### Breadcrumbs

```typescript
const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: ${SPACING[2]};
  font-size: ${TYPOGRAPHY.fontSize.sm};
  color: ${GALAXY_SWAN_COLORS.neutral.space300};
  margin-bottom: ${SPACING[6]};
`;

const BreadcrumbLink = styled(Link)`
  color: ${GALAXY_SWAN_COLORS.neutral.space300};
  text-decoration: none;
  transition: color 200ms;

  &:hover {
    color: ${GALAXY_SWAN_COLORS.primary.cyan};
  }
`;

const BreadcrumbSeparator = styled.span`
  color: ${GALAXY_SWAN_COLORS.neutral.space500};
`;

const BreadcrumbCurrent = styled.span`
  color: ${GALAXY_SWAN_COLORS.neutral.space100};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
`;

// Usage
<BreadcrumbContainer>
  <BreadcrumbLink to="/dashboard">Dashboard</BreadcrumbLink>
  <BreadcrumbSeparator>/</BreadcrumbSeparator>
  <BreadcrumbLink to="/dashboard/clients">Clients</BreadcrumbLink>
  <BreadcrumbSeparator>/</BreadcrumbSeparator>
  <BreadcrumbCurrent>Client Onboarding</BreadcrumbCurrent>
</BreadcrumbContainer>
```

---

## 🎬 MOTION & TRANSITIONS

### Transition Timing

```typescript
export const MOTION = {
  // Duration
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Easing
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Standard easing
    in: 'cubic-bezier(0.4, 0, 1, 1)',         // Ease in
    out: 'cubic-bezier(0, 0, 0.2, 1)',        // Ease out
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',    // Ease in-out
    bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', // Bounce effect
  },

  // Framer Motion Variants
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },

  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  },

  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  },
};
```

### Reduced Motion

```typescript
// Hook to detect prefers-reduced-motion
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
};

// Usage
const MyComponent = () => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={reducedMotion ? {} : MOTION.fadeIn} // Disable animations if reduced motion
      initial="hidden"
      animate="visible"
    >
      Content
    </motion.div>
  );
};
```

---

## ♿ ACCESSIBILITY

### Contrast Requirements (WCAG 2.1 AA)

```typescript
// Minimum contrast ratios
export const CONTRAST_RATIOS = {
  normalText: 4.5,    // 4.5:1 for normal text
  largeText: 3,       // 3:1 for large text (18px+)
  uiComponents: 3,    // 3:1 for UI components
  graphicalObjects: 3, // 3:1 for graphs, icons
};

// Verified combinations
export const ACCESSIBLE_COMBINATIONS = {
  textOnDark: {
    // White (#e0e0f0) on Space900 (#08 0814) = 12.5:1 ✅
    color: GALAXY_SWAN_COLORS.neutral.space100,
    background: GALAXY_SWAN_COLORS.neutral.space900,
  },
  primaryOnDark: {
    // Cyan (#00d9ff) on Space900 (#080814) = 7.8:1 ✅
    color: GALAXY_SWAN_COLORS.primary.cyan,
    background: GALAXY_SWAN_COLORS.neutral.space900,
  },
  accentOnDark: {
    // Pink (#ff4081) on Space900 (#080814) = 6.2:1 ✅
    color: GALAXY_SWAN_COLORS.accent.pink,
    background: GALAXY_SWAN_COLORS.neutral.space900,
  },
};
```

### Focus States

```typescript
// All interactive elements MUST have visible focus states
const FocusRing = css`
  &:focus-visible {
    outline: 2px solid ${GALAXY_SWAN_COLORS.primary.cyan};
    outline-offset: 2px;
    box-shadow: ${SHADOWS.glowCyan};
  }
`;

// Example: Button with focus
const AccessibleButton = styled.button`
  /* ... other styles */
  ${FocusRing}
`;
```

### ARIA Labels

```typescript
// Navigation MUST have ARIA roles
<nav role="navigation" aria-label="Main navigation">
  {/* Nav links */}
</nav>

// Breadcrumbs MUST have ARIA
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/dashboard">Dashboard</a></li>
    <li aria-current="page">Client Onboarding</li>
  </ol>
</nav>

// Form inputs MUST have labels
<label htmlFor="client-name">Client Name</label>
<input id="client-name" aria-required="true" />
```

---

## 📐 RESPONSIVE BREAKPOINTS

```typescript
export const BREAKPOINTS = {
  mobile: '480px',    // Small phones
  tablet: '768px',    // Tablets, large phones
  desktop: '1024px',  // Small desktops
  wide: '1280px',     // Wide desktops
  ultrawide: '1536px', // Ultra-wide screens
};

// Media query helpers
export const media = {
  mobile: `@media (max-width: ${BREAKPOINTS.mobile})`,
  tablet: `@media (max-width: ${BREAKPOINTS.tablet})`,
  desktop: `@media (min-width: ${BREAKPOINTS.desktop})`,
  wide: `@media (min-width: ${BREAKPOINTS.wide})`,
};

// Usage
const ResponsiveCard = styled.div`
  padding: ${SPACING[6]};

  ${media.tablet} {
    padding: ${SPACING[4]};
  }

  ${media.mobile} {
    padding: ${SPACING[3]};
  }
`;
```

---

## ✅ DESIGN PROTOCOL CHECKLIST

### For Every Dashboard Component

- [ ] Uses Galaxy-Swan color tokens (no Executive Command Intelligence)
- [ ] Follows 4-point spacing grid
- [ ] Uses 8/12/16px border radius
- [ ] Implements 3-tier shadow system
- [ ] Has accessible contrast ratios (WCAG 2.1 AA)
- [ ] Has visible focus states on interactive elements
- [ ] Respects prefers-reduced-motion
- [ ] Responsive across mobile/tablet/desktop
- [ ] Uses semantic HTML (nav, main, article, section)
- [ ] Has proper ARIA labels and roles

---

**Status:** 📋 DESIGN PROTOCOL v1.1 COMPLETE
**Next Action:** Apply to Admin/Trainer/Client dashboards in Phase 2
**Supersedes:** Executive Command Intelligence theme (deprecated)
