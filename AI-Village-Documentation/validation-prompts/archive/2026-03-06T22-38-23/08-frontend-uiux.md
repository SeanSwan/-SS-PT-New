# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 40.0s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CLASS-BUILDER-DESIGN.md
> **Generated:** 3/6/2026, 2:38:23 PM

---

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the `BOOTCAMP-CLASS-BUILDER-DESIGN.md` blueprint. 

The backend architecture and AI logic are sound, but the frontend design outlined in Section H is too utilitarian. A premium SaaS platform charging top-tier prices cannot rely on standard grids and static text cards. The "Galaxy-Swan" theme (#0a0a1a, #00FFFF, #7851A9) must be executed with absolute precision—utilizing glassmorphism, deep cosmic shadows, neon typography, and fluid micro-animations to make the software feel alive, intelligent, and tactile.

Furthermore, trainers use this software on the gym floor (iPads/tablets) or on the go (iPhones). A rigid 3-pane desktop layout is a fundamental architectural flaw.

Here are my authoritative design directives. Claude, you will implement these exact specifications.

---

### DIRECTIVE 1: The "Galaxy-Swan" Cosmic Design System Tokens
**Severity:** CRITICAL
**File & Location:** Global Theme Provider (`src/styles/theme.ts`)
**Design Problem:** The document mentions a "Swan Cyan gradient" but lacks a cohesive token system. Without strict tokens, dark mode becomes a muddy, inaccessible mess of grays. We need deep space depth, neon accents, and strict WCAG 2.1 AA contrast.
**Design Solution:**
We will use a 3-tier elevation system using pure deep space black (`#05050A`), surface black (`#0A0A1A`), and glassmorphic overlays.

```typescript
// theme.ts
export const swanTheme = {
  colors: {
    space: '#05050A', // App background
    surface: '#0A0A1A', // Card background
    surfaceGlass: 'rgba(10, 10, 26, 0.6)', // For sticky headers/nav
    border: 'rgba(0, 255, 255, 0.15)',
    borderGlow: 'rgba(0, 255, 255, 0.4)',
    
    primary: '#00FFFF', // Swan Cyan
    primaryHover: '#33FFFF',
    primaryGlow: '0 0 12px rgba(0, 255, 255, 0.5)',
    
    secondary: '#7851A9', // Cosmic Purple
    secondaryGlow: '0 0 12px rgba(120, 81, 169, 0.5)',
    
    text: {
      primary: '#FFFFFF', // High contrast
      secondary: '#A0A0B0', // Muted but readable (WCAG AA compliant against #0A0A1A)
      accent: '#00FFFF',
    },
    
    status: {
      easy: '#4ADE80', // Neon Green
      medium: '#FBBF24', // Neon Yellow
      hard: '#F87171', // Neon Red
      cardio: '#00FFFF', // Cyan
    }
  },
  shadows: {
    card: '0 8px 32px rgba(0, 0, 0, 0.4)',
    neonCyan: '0 0 10px rgba(0, 255, 255, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
    neonPurple: '0 0 10px rgba(120, 81, 169, 0.3), 0 0 20px rgba(120, 81, 169, 0.1)',
  },
  transitions: {
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }
};
```
**Implementation Notes for Claude:**
1. Inject these tokens into the `styled-components` `<ThemeProvider>`.
2. Never use hardcoded hex values in components; map everything to `props.theme`.
3. Ensure all text on `#0A0A1A` has a minimum contrast ratio of 4.5:1.

---

### DIRECTIVE 2: Fluid "Class Builder" Architecture (Tablet-First)
**Severity:** HIGH
**File & Location:** Section H - Class Builder View (`src/features/bootcamp/ClassBuilder.tsx`)
**Design Problem:** A static 3-pane layout (300px / fluid / 350px) will break on an iPad Pro (1024px) and is unusable on mobile. Trainers build classes on tablets.
**Design Solution:**
The layout must be a CSS Grid that collapses into a bottom-sheet architecture on screens `< 1024px`. The center canvas (Station Grid) is the hero.

```tsx
const BuilderLayout = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.space};
  overflow: hidden;

  @media (max-width: 1280px) {
    grid-template-columns: 240px 1fr 280px;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    /* Sidebars become Framer Motion bottom sheets triggered by FABs */
  }
`;

const CanvasArea = styled.main`
  padding: 24px;
  overflow-y: auto;
  scroll-behavior: smooth;
  
  /* Custom Scrollbar for Webkit */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 10px;
  }
`;
```
**Implementation Notes for Claude:**
1. Implement `BuilderLayout` using the exact breakpoints above.
2. For `< 1024px`, the Left (Config) and Right (AI Insights) panels must be converted into `framer-motion` `<AnimatePresence>` bottom sheets.
3. Add a Floating Action Bar (FAB) at the bottom of the screen on mobile/tablet to toggle these sheets. Touch targets for FABs must be exactly `56x56px`.

---

### DIRECTIVE 3: Station Card Micro-Interactions & Progressive Disclosure
**Severity:** HIGH
**File & Location:** Section H - Center: Class Canvas (`src/features/bootcamp/components/StationCard.tsx`)
**Design Problem:** The mockup shows a wall of text. During a high-energy boot camp, a trainer cannot read 12 lines of text per station. Information density is too high.
**Design Solution:**
Cards must use progressive disclosure. Show the primary exercise, time, and a visual indicator for equipment. Hide modifications behind a smooth accordion toggle.

```tsx
const CardContainer = styled(motion.div)`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  backdrop-filter: blur(12px);
  transition: border 0.3s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderGlow};
    box-shadow: ${({ theme }) => theme.shadows.neonCyan};
  }
`;

const ExerciseRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const ExerciseTitle = styled.h4`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const ModPill = styled.span<{ $tier: 'easy' | 'hard' | 'knee' }>`
  font-size: 11px;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${({ theme, $tier }) => 
    $tier === 'easy' ? 'rgba(74, 222, 128, 0.1)' : 
    $tier === 'hard' ? 'rgba(248, 113, 113, 0.1)' : 
    'rgba(120, 81, 169, 0.1)'};
  color: ${({ theme, $tier }) => 
    $tier === 'easy' ? theme.colors.status.easy : 
    $tier === 'hard' ? theme.colors.status.hard : 
    theme.colors.secondary};
  border: 1px solid currentColor;
`;
```
**Implementation Notes for Claude:**
1. Use `framer-motion` for the card container. Add `whileHover={{ y: -4 }}` and `whileTap={{ scale: 0.98 }}`.
2. The "Mods" (Easy, Hard, Knee, etc.) must be hidden by default. Add a chevron icon button (`44x44px` touch target) that expands the card using Framer Motion's `layout` prop for smooth height animation.
3. Use the `$tier` prop logic exactly as written to color-code the modifications.

---

### DIRECTIVE 4: AI "Cosmic Forge" Loading Choreography
**Severity:** CRITICAL
**File & Location:** Section C - AI Class Generation (`src/features/bootcamp/components/AILoadingOverlay.tsx`)
**Design Problem:** AI generation takes time. A standard spinner will make the app feel broken. We need to use this time to build anticipation and showcase the AI's value.
**Design Solution:**
A full-screen glassmorphic overlay with staggered text reveals and a pulsing cosmic gradient.

```tsx
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 10, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const GlowingOrb = styled(motion.div)`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, ${({ theme }) => theme.colors.primary} 0%, transparent 70%);
  filter: blur(20px);
`;

const StatusText = styled(motion.p)`
  margin-top: 32px;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
`;
```
**Implementation Notes for Claude:**
1. Create an array of loading strings: `["Analyzing space constraints...", "Calculating transition times...", "Selecting NASM-approved exercises...", "Forging your boot camp..."]`.
2. Use `framer-motion` `AnimatePresence` to cycle through these strings every 2.5 seconds while the API request is pending.
3. Animate the `GlowingOrb` with `animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}` and `transition={{ duration: 2, repeat: Infinity }}`.

---

### DIRECTIVE 5: Space Analysis Media Dropzone
**Severity:** MEDIUM
**File & Location:** Section D - Space Analysis (`src/features/bootcamp/components/SpaceUploader.tsx`)
**Design Problem:** Standard `<input type="file">` elements ruin the premium feel. The upload zone must feel like a high-tech scanner input.
**Design Solution:**
A dashed, glowing dropzone that reacts to drag events.

```tsx
const DropZone = styled.div<{ $isDragActive: boolean }>`
  width: 100%;
  height: 240px;
  border: 2px dashed ${({ theme, $isDragActive }) => 
    $isDragActive ? theme.colors.primary : theme.colors.border};
  border-radius: 16px;
  background: ${({ theme, $isDragActive }) => 
    $isDragActive ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ${({ theme }) => theme.transitions.smooth};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(0, 255, 255, 0.02);
    box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.05);
  }
`;

const UploadIcon = styled.svg`
  width: 48px;
  height: 48px;
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: 16px;
  filter: drop-shadow(0 0 8px rgba(120, 81, 169, 0.5));
`;
```
**Implementation Notes for Claude:**
1. Use `react-dropzone`. Pass the `isDragActive` boolean to the styled component to trigger the `$isDragActive` styles.
2. Add a visually hidden `<input>` for accessibility, ensuring it has `aria-label="Upload 360 video or photos of gym space"`.
3. Implement client-side image compression (e.g., `browser-image-compression`) *before* uploading to R2 to ensure perceived performance is lightning fast.

---

### Claude, Proceed with Execution
These design directives override any generic UI assumptions. The SwanStudios platform must look and feel like a $200/month premium tool. Implement the CSS, Framer Motion specs, and responsive architectures exactly as prescribed. Let me know when you are ready to review the component structures.

---

*Part of SwanStudios 7-Brain Validation System*
