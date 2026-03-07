# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 53.1s
> **Files:** backend/models/CustomExercise.mjs, backend/routes/customExerciseRoutes.mjs, frontend/src/hooks/useCustomExerciseAPI.ts, frontend/src/components/FormAnalysis/BiomechanicsStudio.tsx
> **Generated:** 3/6/2026, 3:36:47 PM

---

As the Lead UI/UX Architect and CO-ORCHESTRATOR for SwanStudios, I have reviewed the `BiomechanicsStudio.tsx` implementation. 

Right now, this component looks like a generic corporate dashboard (`#002060` backgrounds, basic accordions). It completely misses the **Galaxy-Swan premium dark cosmic aesthetic**. A "Biomechanics Studio" should not feel like a tax form; it should feel like a high-tech, elite sports science HUD (Heads Up Display). 

We charge premium SaaS prices. The UI must radiate precision, advanced technology, and effortless power. 

Here are my authoritative design directives. Claude, you will implement these exactly as specified.

---

### VISION & DESIGN PHILOSOPHY: "The Cosmic HUD"
1. **Deep Space Foundation:** The background must be true deep space (`#0a0a1a`), not navy blue. We will use a subtle radial nebula gradient using our cosmic purple (`#7851A9`).
2. **Glassmorphic Precision:** Panels must use heavy background blurs (`backdrop-filter: blur(24px)`) with ultra-thin, low-opacity cyan borders (`rgba(0, 255, 255, 0.15)`).
3. **Neon Typography & Data:** Standard text is pure white (`#FFFFFF`) or starlight gray (`#A0AABF`). Data points, angles, and landmarks must use a monospace font with a cyan glow to emphasize the "computational" nature of the biomechanics engine.
4. **Fluid Choreography:** Accordions must not "snap." They must breathe. We will use Framer Motion's `layout` prop for seamless, spring-based height transitions.

---

## DESIGN DIRECTIVES FOR CLAUDE

### DIRECTIVE 1: Inject the Galaxy-Swan Token System
**Severity:** CRITICAL
**File & Location:** `frontend/src/components/FormAnalysis/BiomechanicsStudio.tsx` (Top of file, styled-components definitions)
**Design Problem:** Hardcoded, off-brand colors (`#002060`, `#e0ecf4`) destroy the brand identity.
**Design Solution:** Establish a strict token dictionary within the styled-components and apply the true Galaxy-Swan palette.

**Implementation Notes for Claude:**
1. Delete the current `PageWrapper` background.
2. Implement this exact `PageWrapper` and global token structure:

```tsx
// Claude: Insert this above your styled components
const theme = {
  space: '#0a0a1a',
  cyan: '#00FFFF',
  cyanDim: 'rgba(0, 255, 255, 0.15)',
  purple: '#7851A9',
  purpleDim: 'rgba(120, 81, 169, 0.2)',
  textMain: '#FFFFFF',
  textMuted: '#A0AABF',
  surface: 'rgba(10, 10, 26, 0.6)',
  surfaceHover: 'rgba(15, 15, 35, 0.8)',
  danger: '#FF2A55',
  warning: '#FFD700',
  success: '#00FF88',
};

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: ${theme.space};
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(120, 81, 169, 0.08), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(0, 255, 255, 0.05), transparent 25%);
  color: ${theme.textMain};
  padding: 32px 24px;
  font-family: 'Inter', -apple-system, sans-serif;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;
```

### DIRECTIVE 2: Glassmorphic HUD Accordions (StepCards)
**Severity:** HIGH
**File & Location:** `StepCard`, `StepHeader`, `StepNumber`
**Design Problem:** The steps look like basic HTML boxes. They lack depth and hierarchy.
**Design Solution:** Implement a glassmorphic layered effect. The active step should "float" closer to the user with a subtle cyan drop shadow.

**Implementation Notes for Claude:**
1. Update the `StepCard` to use Framer Motion's `layout` prop so the container smoothly resizes when steps open/close.
2. Apply these exact styles:

```tsx
const StepCard = styled(motion.div)<{ $active: boolean; $completed?: boolean }>`
  background: ${theme.surface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${({ $active }) => ($active ? theme.cyan : theme.cyanDim)};
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${({ $active }) => ($active ? '0 8px 32px rgba(0, 255, 255, 0.08)' : 'none')};
`;

const StepHeader = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: transparent;
  border: none;
  color: ${theme.textMain};
  cursor: pointer;
  text-align: left;
  outline: none;
`;

const StepNumber = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 12px; /* Squircle, not perfect circle */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace; /* Tech feel */
  background: ${({ $active, $completed }) =>
    $completed ? theme.success : $active ? theme.cyan : theme.surfaceHover};
  color: ${({ $active, $completed }) =>
    $completed || $active ? theme.space : theme.textMuted};
  box-shadow: ${({ $active }) => ($active ? `0 0 12px ${theme.cyanDim}` : 'none')};
  transition: all 0.3s ease;
`;
```

### DIRECTIVE 3: High-Fidelity Form Controls
**Severity:** HIGH
**File & Location:** `Input`, `Select`, `TextArea`, `Label`
**Design Problem:** Inputs are muddy (`rgba(0, 16, 64, 0.6)`) and lack premium interaction states.
**Design Solution:** Inputs must feel like precision instruments. Darker backgrounds, crisp borders, and a glowing focus state.

**Implementation Notes for Claude:**
1. Apply these exact styles. Note the `48px` minimum height for mobile touch targets (WCAG AA).

```tsx
const Label = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: ${theme.textMuted};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const sharedInputStyles = `
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${theme.cyanDim};
  border-radius: 10px;
  color: ${theme.textMain};
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: ${theme.cyan};
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.6);
  }

  &::placeholder {
    color: rgba(160, 170, 191, 0.4);
  }
`;

const Input = styled.input`${sharedInputStyles}`;
const TextArea = styled.textarea`${sharedInputStyles} min-height: 80px; resize: vertical;`;
const Select = styled.select`
  ${sharedInputStyles}
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300FFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 16px top 50%;
  background-size: 10px auto;
  
  option {
    background: ${theme.space};
    color: ${theme.textMain};
  }
`;
```

### DIRECTIVE 4: Rule Cards as "Logic Nodes"
**Severity:** MEDIUM
**File & Location:** `RuleCard`, `RuleTypeBadge`, `SeverityBadge`
**Design Problem:** The rules look like generic list items. They need to look like programmable logic nodes in a biomechanics engine.
**Design Solution:** Add a left-border status indicator based on severity. Use monospace fonts for the badges.

**Implementation Notes for Claude:**
1. Update `RuleCard` to have a dynamic left border.
2. Update badges to look like technical tags.

```tsx
const RuleCard = styled.div<{ $severity?: string }>`
  background: rgba(10, 10, 26, 0.4);
  border: 1px solid ${theme.cyanDim};
  border-left: 4px solid ${({ $severity }) => 
    $severity === 'danger' ? theme.danger : 
    $severity === 'warning' ? theme.warning : 
    theme.cyan};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  position: relative;
`;

const BadgeBase = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
`;

const RuleTypeBadge = styled(BadgeBase)<{ $type: string }>`
  background: ${({ $type }) =>
    $type === 'angle_threshold' ? 'rgba(0, 255, 255, 0.1)' :
    $type === 'landmark_deviation' ? 'rgba(120, 81, 169, 0.15)' :
    'rgba(0, 255, 136, 0.1)'};
  color: ${({ $type }) =>
    $type === 'angle_threshold' ? theme.cyan :
    $type === 'landmark_deviation' ? '#D4B3FF' :
    theme.success};
  border: 1px solid currentColor;
`;
```

### DIRECTIVE 5: Primary Action Buttons & Hover Choreography
**Severity:** MEDIUM
**File & Location:** `Button`
**Design Problem:** The primary button gradient is okay, but lacks a premium hover state. Disabled states are just opaque.
**Design Solution:** Add a glowing hover state and a distinct disabled state.

**Implementation Notes for Claude:**
1. Replace the `Button` styled-component with this:

```tsx
const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0 24px;
  min-height: 48px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  background: ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 42, 85, 0.1)' :
    $variant === 'secondary' ? 'transparent' :
    `linear-gradient(135deg, ${theme.cyan} 0%, ${theme.purple} 100%)`};
    
  color: ${({ $variant }) =>
    $variant === 'danger' ? theme.danger :
    $variant === 'secondary' ? theme.cyan :
    theme.space};
    
  border: 1px solid ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 42, 85, 0.3)' :
    $variant === 'secondary' ? theme.cyanDim :
    'transparent'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${({ $variant }) =>
      $variant === 'primary' ? `0 8px 20px rgba(0, 255, 255, 0.25)` :
      $variant === 'danger' ? `0 8px 20px rgba(255, 42, 85, 0.15)` :
      `0 8px 20px rgba(0, 255, 255, 0.1)`};
    background: ${({ $variant }) => $variant === 'secondary' && 'rgba(0, 255, 255, 0.05)'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(100%);
  }
`;
```

### DIRECTIVE 6: Component Architecture - Render Optimization
**Severity:** LOW / ARCHITECTURAL
**File & Location:** `BiomechanicsStudio.tsx` (Main Component)
**Design Problem:** The file is monolithic. While acceptable for a single view, we must ensure Framer Motion doesn't cause unnecessary re-renders of the entire form when a single input changes.
**Design Solution:** Ensure `AnimatePresence` wraps the `StepBody` correctly.

**Implementation Notes for Claude:**
In the main render loop, ensure the accordion body uses this exact Framer Motion configuration to prevent layout snapping:
```tsx
<AnimatePresence initial={false}>
  {activeStep === index && (
    <StepBody
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Step Content */}
    </StepBody>
  )}
</AnimatePresence>
```

**Claude, proceed with these exact implementations.** Do not dilute the colors or simplify the CSS. The Galaxy-Swan aesthetic relies on these precise opacities, blurs, and hex codes.

---

*Part of SwanStudios 7-Brain Validation System*
