# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 72.4s
> **Files:** frontend/src/pages/HomePage/components/HomePage.V4.tsx
> **Generated:** 4/4/2026, 10:27:37 PM

---

# Code Review: `HomePage.V4.tsx`

**File:** `frontend/src/pages/HomePage/components/HomePage.V4.tsx`
**Reviewer:** Senior TypeScript/React Code Quality Review
**Theme:** Enchanted Apex — Crystalline Swan

---

## Executive Summary

This is a large, ambitious cinematic homepage (~1000+ lines visible, truncated). The visual design intent is clear and the motion system is thoughtful. However, there are **significant structural, typing, and maintainability issues** that will cause production pain as the codebase scales. Several findings are CRITICAL for accessibility and correctness.

---

## 🔴 CRITICAL Findings

### C-1: Retired Galaxy-Swan Color Values Still Present in Production Code

**Location:** `IconWrapper`, `GlassCard`, `CTAContainer`, `ResultBadge`, multiple inline styles

```tsx
// VIOLATION — hardcoded retired palette values
background: rgba(${theme.colors?.primary === '#8B5CF6' ? '0, 255, 255' : '120, 81, 169'}, 0.1)
// #00FFFF and #7851A9 are RETIRED Galaxy-Swan colors

// Also in CTAContainer:
background: linear-gradient(180deg, rgba(139, 92, 246, 0.08) ...)
box-shadow: 0 0 80px rgba(139, 92, 246, 0.04);
border: 1px solid rgba(139, 92, 246, 0.15);

// And GlassCard hover:
box-shadow: 0 20px 40px rgba(139, 92, 246, 0.08);
```

**Problem:** `#7851A9` (hex `120, 81, 169`) and `#00FFFF` are explicitly retired. The `IconWrapper` ternary is also a broken theme check — it compares a hex string to derive RGB values, which is fragile and wrong. `rgba(139, 92, 246, ...)` (Wing Purple) is used as a hardcoded fallback throughout instead of consuming theme tokens.

**Fix:**
```tsx
// Define theme-aware CSS custom properties or use theme tokens directly
const IconWrapper = styled.div`
  background: ${({ theme }) => theme.colors?.wingPurple
    ? `${theme.colors.wingPurple}1A`  // 10% opacity via hex alpha
    : 'rgba(139, 92, 246, 0.10)'};
  color: ${({ theme }) => theme.colors?.arcticCyan || '#50A0F0'};
`;

// CTAContainer — use theme tokens, not hardcoded Wing Purple
const CTAContainer = styled(motion.div)`
  background: linear-gradient(
    180deg,
    ${({ theme }) => `${theme.colors?.wingPurple || '#8B5CF6'}14`} 0%,
    ${({ theme }) => `${theme.colors?.wingPurple || '#8B5CF6'}0A`} 100%
  );
  border: 1px solid ${({ theme }) => `${theme.colors?.wingPurple || '#8B5CF6'}26`};
`;
```

---

### C-2: `useParallax` Returns Wrong Ref Type — Silent Runtime Failure

**Location:** `useParallax` hook, all call sites

```tsx
// Hook returns:
const ref = useRef<HTMLElement>(null);

// Used as:
<SectionEl ref={featuresParallax.ref as React.Ref<HTMLElement>}>
<SectionEl ref={golfParallax.ref as React.Ref<HTMLElement>}>
```

**Problem:** `SectionEl` is a `styled.section`, which resolves to `HTMLElement` — but `useScroll`'s `target` expects a `RefObject<Element>`. The `as` cast suppresses the type error without fixing it. More critically, `useParallax` is called **unconditionally** but the `y` transform is conditionally applied (`prefersReduced ? undefined : { y: ... }`). The hook itself has no reduced-motion awareness, so `useScroll` and `useTransform` run regardless, wasting computation.

**Fix:**
```tsx
const useParallax = (
  range: [string, string] = ['-15%', '15%'],
  disabled = false
) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // useTransform is cheap when unused, but be explicit
  const y = useTransform(scrollYProgress, [0, 1], disabled ? ['0%', '0%'] : range);
  return { ref, y };
};

// Call site:
const featuresParallax = useParallax(['-15%', '15%'], prefersReduced);

// Usage — no conditional needed:
<ParallaxBg style={{ y: featuresParallax.y }} />
```

---

### C-3: Missing `key` Prop on Trainer Feature Cards — React Reconciliation Bug

**Location:** Section 1c "Trainers" inline array `.map()`

```tsx
{[
  { icon: <Dumbbell size={28} />, title: '840+ Exercises', ... },
  ...
].map((item, i) => (
  <motion.div key={i}  // ← index key on inline array literal
```

**Problem:** The array is defined **inline inside JSX**, meaning it's recreated on every render. Using index as key on an unstable array reference causes unnecessary unmount/remount cycles. Additionally, the array contains JSX (`icon: <Dumbbell size={28} />`) — JSX in data arrays is an anti-pattern that prevents proper memoization and makes the data non-serializable.

**Fix:**
```tsx
// Move outside component, use stable string keys, separate icon component type
const TRAINER_FEATURES: Array<{
  iconType: React.ElementType;
  title: string;
  desc: string;
}> = [
  { iconType: Dumbbell, title: '840+ Exercises', desc: '...' },
  { iconType: Mic2,     title: 'Voice-First AI Coach', desc: '...' },
  { iconType: Shield,   title: 'Fair Fees, Always', desc: '...' },
  { iconType: MapPin,   title: 'Works Anywhere', desc: '...' },
] as const;

// In JSX:
{TRAINER_FEATURES.map((item) => (
  <motion.div key={item.title} variants={cinematicReveal}>
    <item.iconType size={28} />
    ...
  </motion.div>
))}
```

---

### C-4: Inline Style Objects with `style` Prop — Breaks Memoization, Causes Re-renders

**Location:** Mission section (1b), Trainers section (1c), multiple `motion.div` elements

```tsx
<motion.div
  style={{
    maxWidth: '900px',
    margin: '0 auto',
    background: 'rgba(20, 20, 25, 0.85)',  // ← hardcoded retired-adjacent dark
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(224, 236, 244, 0.05)',
    borderRadius: '16px',
    padding: 'clamp(1.5rem, 4vw, 3rem)',
  }}
>
  <p style={{ color: 'var(--text-primary, #E0ECF4)', fontSize: 'clamp(...)' }}>
```

**Problems:**
1. New object reference on every render → Framer Motion re-evaluates layout
2. Mixes CSS custom properties (`var(--text-primary)`) with hardcoded hex fallbacks — inconsistent with styled-components theme system
3. `rgba(20, 20, 25, 0.85)` is close to the retired `#0a0a1a` Galaxy-Swan background
4. `clamp()` in inline styles is not reusable

**Fix:** Extract to named styled-components:
```tsx
const MissionCard = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors?.glass || 'rgba(0, 32, 96, 0.4)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.colors?.glassBorder || 'rgba(224, 236, 244, 0.05)'};
  border-radius: 16px;
  padding: clamp(1.5rem, 4vw, 3rem);

  p {
    color: ${({ theme }) => theme.text?.primary || '#E0ECF4'};
    font-size: clamp(0.95rem, 1.8vw, 1.15rem);
    line-height: 1.8;
    margin-bottom: 1.25rem;
    opacity: 0.9;

    &:last-child { margin-bottom: 0; }
  }
`;
```

---

### C-5: `<track>` Element Missing `src` — Accessibility Violation (WCAG 2.1 AA)

**Location:** Hero `<VideoEl>`

```tsx
<VideoEl ...>
  <source src={VIDEO.swans} type="video/mp4" />
  <track kind="captions" srcLang="en" label="English captions" />
  {/* ↑ No src attribute — invalid HTML, captions won't load */}
</VideoEl>
```

**Problem:** A `<track>` element without `src` is invalid HTML and provides no actual captions. Since the video is `aria-hidden="true"`, captions aren't strictly required for this decorative video — but the empty `<track>` is misleading and will generate browser warnings. If the video ever becomes non-decorative, this is a WCAG 2.1 AA failure.

**Fix:**
```tsx
<VideoEl aria-hidden="true" ...>
  <source src={VIDEO.swans} type="video/mp4" />
  {/* Video is decorative (aria-hidden). Captions omitted intentionally. */}
  {/* If video becomes content-bearing, add: */}
  {/* <track kind="captions" src="/captions/hero-en.vtt" srcLang="en" label="English" default /> */}
</VideoEl>
```

---

## 🟠 HIGH Findings

### H-1: `useCountUp` Has Stale Closure Risk on `target` Change

**Location:** `useCountUp` hook

```tsx
const useCountUp = (target: number, isVisible: boolean, prefersReduced: boolean) => {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    // ...
    hasAnimated.current = true;
    const animate = (currentTime: number) => {
      // `target` is captured from closure — if target changes mid-animation,
      // the rAF loop uses the stale value
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, prefersReduced]);
  // ↑ `target` in deps but `hasAnimated.current` prevents re-run — correct for
  //   "animate once" but the rAF callback still captures stale `target`
```

**Problem:** The `requestAnimationFrame` callback captures `target` from the closure at the time the effect runs. If `target` were to change (e.g., data fetched async), the animation would use the stale value. The `hasAnimated` ref also means the effect won't re-run for prop changes. This is acceptable for static data but should be documented.

**Fix:**
```tsx
const useCountUp = (target: number, isVisible: boolean, prefersReduced: boolean) => {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const targetRef = useRef(target);

  // Keep ref current without re-triggering effect
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    if (prefersReduced) {
      setValue(targetRef.current);
      hasAnimated.current = true;
      return;
    }
    hasAnimated.current = true;
    const duration = 2500;
    const startTime = performance.now();
    let rafId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * targetRef.current));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);

    // Cleanup: cancel animation if component unmounts mid-count
    return () => cancelAnimationFrame(rafId);
  }, [isVisible, prefersReduced]); // target intentionally excluded — use ref

  return value;
};
```

---

### H-2: No `cancelAnimationFrame` Cleanup — Memory Leak on Unmount

**Location:** `useCountUp` hook (same as H-1, separate concern)

```tsx
const animate = (currentTime: number) => {
  // ...
  if (progress < 1) requestAnimationFrame(animate); // ← no cleanup
};
requestAnimationFrame(animate);
// No return cleanup function
```

**Problem:** If `StatCounter` unmounts while the animation is running (e.g., user navigates away), the rAF loop continues calling `setValue` on an unmounted component. React 18 suppresses the "setState on unmounted component" warning but the loop still runs, wasting CPU.

**Fix:** See H-1 — the `return () => cancelAnimationFrame(rafId)` cleanup handles this.

---

### H-3: `CINEMATIC_EASE` Type Assertion Breaks Framer Motion Typing

**Location:** Motion variant definitions

```tsx
const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;
// Type: readonly [0.16, 1, 0.3, 1]

const cinematicReveal = {
  visible: {
    transition: { duration: 1.2, ease: CINEMATIC_EASE },
    // Framer Motion's `ease` expects: Easing | Easing[] | EasingFunction
    // readonly tuple is not assignable to number[] (Framer's bezier type)
  },
};
```

**Problem:** `as const` produces `readonly [0.16, 1, 0.3, 1]` which is not assignable to Framer Motion's `ease` type (`BezierDefinition = [number, number, number, number]`). TypeScript may not catch this if Framer's types are loose, but it's semantically wrong and will cause type errors with stricter configs.

**Fix:**
```tsx
import type { BezierDefinition } from 'framer-motion';

const CINEMATIC_EASE: BezierDefinition = [0.16, 1, 0.3, 1];
// Now properly typed as mutable tuple matching Framer's expectation
```

---

### H-4: `CapsuleButton` Inline Color Map — Not Theme-Aware, DRY Violation

**Location:** `capsuleColors` constant and `CapsuleButton` styled component

```tsx
const capsuleColors: Record<CapsuleVariant, { ... }> = {
  default:    { border: 'rgba(96,192,240,0.2)', ... },   // Ice Wing
  gilded:     { border: 'rgba(198,168,75,0.35)', ... },  // Gilded Fern
  wingPurple: { border: 'rgba(139,92,246,0.35)', ... },  // Wing Purple
  arcticCyan: { border: 'rgba(80,160,240,0.35)', ... },  // Arctic

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
