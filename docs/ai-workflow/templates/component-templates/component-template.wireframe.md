# [Component Name] - Wireframe & Visual Design Specification

**Component:** [Component Name]
**Created:** [Date]
**Last Updated:** [Date]
**Assigned To:** Gemini (UI/UX Specialist)
**Figma Link:** [Link to Figma design] (if applicable)

---

## 📋 OVERVIEW

This file documents the pixel-perfect visual design for [Component Name] across all states and breakpoints.

**Design Files:**
- `[component-name]-desktop.png` - Desktop layout (1280px+)
- `[component-name]-tablet.png` - Tablet layout (768px-1279px)
- `[component-name]-mobile.png` - Mobile layout (320px-767px)
- `[component-name]-states.png` - All UI states (loading, empty, error, success)

---

## 🎨 GALAXY-SWAN THEME COMPLIANCE

**Core Theme Elements (REQUIRED):**
- ✅ Galaxy core gradient + starfield background
- ✅ Glass surfaces with gradient borders
- ✅ Cosmic micro-interactions (120-180ms scale pulse on hover)
- ✅ Display serif for H1/H2 headings
- ✅ Swan motifs (crest, wing dividers, or constellation patterns)
- ✅ No generic template visuals

**Color Palette:**
```css
/* Background Gradients */
--bg-primary: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 60%, #2a1f4a 100%);
--bg-glass-primary: rgba(255, 255, 255, 0.06);
--bg-glass-secondary: rgba(255, 255, 255, 0.03);

/* Cosmic Accents */
--cosmic-purple: #a855f7;
--cosmic-blue: #3b82f6;
--cosmic-cyan: #06b6d4;
--cosmic-pink: #ec4899;

/* Gradients */
--gradient-primary: linear-gradient(135deg, #a855f7, #3b82f6);
--gradient-border: linear-gradient(135deg, #a855f7, #06b6d4);

/* Text */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
--text-disabled: rgba(255, 255, 255, 0.4);

/* Status Colors */
--status-success: #10b981;
--status-error: #ef4444;
--status-warning: #f59e0b;
--status-info: #3b82f6;
```

---

## 📱 RESPONSIVE BREAKPOINTS

### **Mobile (320px - 767px)**

**Layout:**
```
┌─────────────────────────────────┐
│  [Header]                       │ ← Sticky, 60px height
├─────────────────────────────────┤
│  [Main Content]                 │ ← Stacked vertically
│  ┌───────────────────────────┐  │
│  │ [Section 1]               │  │ ← Full width
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ [Section 2]               │  │ ← Full width
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ [Section 3]               │  │ ← Full width
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Specifications:**
- **Padding:** 16px (mobile), 20px (mobile-large 375px+)
- **Touch Targets:** 44x44px minimum (WCAG AAA)
- **Typography:**
  - H1: 24px (display serif)
  - H2: 20px (display serif)
  - Body: 16px (sans-serif)
  - Small: 14px
- **Spacing:** 16px between sections
- **Card Radius:** 12px
- **Images:** Lazy-loaded, max-width 100%

**Mobile-Specific Features:**
- Bottom navigation (if applicable)
- Collapsible sections to save space
- Swipe gestures for navigation
- Pull-to-refresh for data updates

---

### **Tablet (768px - 1279px)**

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  [Header]                                       │ ← Sticky, 80px height
├─────────────────────────────────────────────────┤
│  [Main Content]                                 │
│  ┌────────────────┬────────────────────────────┐│
│  │ [Section 1]    │ [Section 2]                ││ ← 50/50 split
│  │                │                            ││
│  └────────────────┴────────────────────────────┘│
│  ┌──────────────────────────────────────────────┐│
│  │ [Section 3]                                  ││ ← Full width
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Specifications:**
- **Padding:** 24px
- **Touch Targets:** 44x44px minimum
- **Typography:**
  - H1: 32px
  - H2: 24px
  - Body: 16px
- **Spacing:** 24px between sections
- **Card Radius:** 16px

---

### **Desktop (1280px+)**

**Layout:**
```
┌───────────────────────────────────────────────────────────┐
│  [Header]                                                 │ ← Fixed, 100px height
├───────────────────────────────────────────────────────────┤
│  [Main Content]                                           │
│  ┌──────────┬──────────────────────┬──────────────────┐  │
│  │[Section1]│ [Section 2]          │ [Section 3]      │  │ ← 25/50/25 split
│  │(Sidebar) │ (Main)               │ (Details Panel)  │  │
│  │          │                      │                  │  │
│  └──────────┴──────────────────────┴──────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Max Width:** 1920px (content centered on larger screens)
- **Padding:** 32px
- **Typography:**
  - H1: 48px
  - H2: 32px
  - Body: 16px
- **Spacing:** 32px between sections
- **Card Radius:** 16px
- **Hover States:** Scale 1.02 + glow effect (180ms ease)

---

## 🎭 UI STATES

### **1. Loading State**

**Visual:**
```
┌─────────────────────────────┐
│  [Skeleton Header]          │ ← Shimmer animation
│  ┌─────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░   │    │ ← Skeleton card
│  │ ░░░░░░░░░░░░░░░░░   │    │
│  │ ░░░░░░░░░░░░░░░░░   │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░   │    │ ← Skeleton card
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**Implementation:**
- **Skeleton UI:** 3-5 placeholder cards with shimmer animation
- **Animation:** Gradient shimmer left-to-right, 1.5s duration, infinite loop
- **No Spinner:** Use skeleton UI instead for better UX
- **Accessible:** ARIA label "Loading [component name]"

---

### **2. Empty State**

**Visual:**
```
┌─────────────────────────────┐
│                             │
│      [Illustration]         │ ← Swan constellation (empty state)
│                             │
│   No [Data] Yet             │ ← H2, center-aligned
│                             │
│   [Friendly message about   │ ← Body text, center-aligned
│    why empty + next steps]  │
│                             │
│   [+ Add [Data]] CTA        │ ← Primary button, centered
│                             │
└─────────────────────────────┘
```

**Content:**
- **Illustration:** Swan constellation with no stars (cosmic theme)
- **Heading:** "No [Data] Yet" (friendly, not alarming)
- **Message:** "You haven't [action] yet. [Benefit of action]."
- **CTA:** Primary button, action-oriented ("Add Your First [Data]")

---

### **3. Error State**

**Visual:**
```
┌─────────────────────────────┐
│  ⚠️  Something Went Wrong   │ ← Error banner, red background
│                             │
│  [Error message]            │ ← Body text, specific error
│                             │
│  [Retry Button] [Dismiss]   │ ← Actions
└─────────────────────────────┘
```

**Error Messages:**
- **Network Error:** "Connection lost. Please check your internet and try again."
- **Auth Error:** "Your session expired. Please log in again."
- **Server Error:** "Our servers are experiencing issues. Please try again in a few moments."
- **Permission Error:** "You don't have permission to access this. Contact your admin."
- **Validation Error:** "[Specific field] is invalid. [Guidance on how to fix]."

**Actions:**
- **Retry Button:** Primary style, attempts action again
- **Dismiss Button:** Secondary style, closes error banner

---

### **4. Success State (Normal)**

**Visual:**
```
┌─────────────────────────────┐
│  [Component Header]         │ ← H1, display serif
│  ┌─────────────────────┐    │
│  │ [Data Card 1]       │    │ ← Glass card, gradient border
│  │ [Content]           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ [Data Card 2]       │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ [Data Card 3]       │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**Card Design (Glass Morphism):**
```css
background: rgba(255, 255, 255, 0.06);
backdrop-filter: blur(12px);
border: 1px solid;
border-image: linear-gradient(135deg, #a855f7, #06b6d4) 1;
border-radius: 16px;
padding: 24px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
```

---

## ♿ ACCESSIBILITY ANNOTATIONS

### **Keyboard Navigation:**
- **Tab Order:** Logical top-to-bottom, left-to-right
- **Focus Indicators:** 2px solid cyan ring, 2px offset
- **Skip Links:** "Skip to main content" link at top
- **Escape Key:** Closes modals/dropdowns

### **Screen Reader Support:**
- **ARIA Labels:** All interactive elements labeled
- **ARIA Live Regions:** Dynamic content changes announced
- **ARIA Roles:** `role="main"`, `role="navigation"`, `role="complementary"`
- **Alt Text:** All images have descriptive alt text

### **Color Contrast:**
- **Text on Dark Background:** WCAG AA (4.5:1 minimum)
- **Large Text:** WCAG AA (3:1 minimum)
- **Interactive Elements:** WCAG AA (3:1 minimum)
- **Focus Indicators:** WCAG AA (3:1 minimum)

**Contrast Verification:**
```
Background (#0a0a1a) + Text (#ffffff) = 19.1:1 ✅ (exceeds AAA)
Background (#0a0a1a) + Secondary Text (rgba(255,255,255,0.7)) = 13.4:1 ✅ (exceeds AAA)
Background (#0a0a1a) + Disabled Text (rgba(255,255,255,0.4)) = 7.6:1 ✅ (exceeds AA)
```

### **Touch Targets:**
- **Minimum Size:** 44x44px (WCAG AAA)
- **Spacing:** 8px between tappable elements
- **Visual Feedback:** Scale 0.95 on touch, 180ms ease

---

## 🎬 MICRO-INTERACTIONS

### **Cosmic Breath Animation (Hover):**
```css
@keyframes cosmicBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.interactive-element:hover {
  animation: cosmicBreath 3s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
}
```

### **Gradient Border Animation:**
```css
@keyframes borderGradient {
  0% { border-image-source: linear-gradient(135deg, #a855f7, #06b6d4); }
  50% { border-image-source: linear-gradient(135deg, #06b6d4, #a855f7); }
  100% { border-image-source: linear-gradient(135deg, #a855f7, #06b6d4); }
}

.card:hover {
  animation: borderGradient 3s ease-in-out infinite;
}
```

### **Loading Shimmer:**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%);
  background-size: 1000px 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## ✅ DESIGN REVIEW CHECKLIST

**Before marking this file as complete, verify:**

- [ ] All breakpoints designed (mobile, tablet, desktop)
- [ ] All UI states designed (loading, empty, error, success)
- [ ] Galaxy-Swan theme applied (gradients, glass, swan motifs)
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text/UI)
- [ ] Touch targets ≥44x44px (WCAG AAA)
- [ ] Focus indicators visible (2px ring, high contrast)
- [ ] Typography hierarchy clear (display serif for headings, sans-serif for body)
- [ ] Micro-interactions specified (hover, active, focus)
- [ ] Responsive images optimized (lazy-loaded, srcset for retina)
- [ ] No generic template visuals (custom swan/cosmic illustrations)

**Assigned AI:** Gemini
**Review Status:** [ ] In Progress [ ] Complete [ ] Needs Revision
**Completion Date:** [Date]

---

## 📝 DESIGN NOTES

[Any design decisions, rationale, or special considerations]

**Example:**
- Used swan constellation for empty state to reinforce brand
- Gradient border animates on hover for cosmic effect
- Skeleton UI preferred over spinner for better perceived performance
