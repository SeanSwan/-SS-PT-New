# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 18.8s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

# 📱 Edge‑Case Review for **Training Command Unification** (SwanStudios)

**Project:** SwanStudios – personal‑training SaaS (React + TS + styled‑components)  
**Theme:** *Enchanted Apex: Crystalline Swan* – dark‑first, 18 swappable themes, **all colours are CSS custom properties** with a brand fallback.  

```css
:root {
  /* Brand fallbacks – never hard‑code hex in JSX */
  --c-midnight-sapphire: #002060;
  --c-royal-depth:       #003080;
  --c-ice-wing:          #60c0f0;
  --c-arctic-cyan:       #50a0f0;
  --c-gilded-fern:       #c6a84b;
  --c-frost-white:       #e0ecf4;
  --c-swan-lavender:     #4070c0;
  --c-wing-purple:       #8b5cf6;
  --c-obsidian-black:    #0a0a0f;
  --c-carbon:            #141419;
  --c-graphite:          #1a1a24;

  /* Dual‑Button Glow */
  --c-blue-bg:           #002060;   /* Midnight Sapphire */
  --c-purple-glow:       #8b5cf6;   /* Wing Purple */
  --c-cyan-glow:         #50a0f0;   /* Arctic Cyan */

  /* Misc */
  --font-base:           'Inter', sans-serif;
  --radius:              4px;
  --transition:        0.2s ease;
}

/* Dark‑first palette – every colour is a CSS var */
body { background: var(--c-carbon); color: var(--c-frost-white); }
a, .btn-primary { background: var(--c-royal-depth); color: #fff; }
.btn-primary:hover { box-shadow: 0 0 0 8px var(--c-purple-glow); }
.btn-secondary { background: var(--c-ice-wing); color: #000; }
.btn-secondary:hover { box-shadow: 0 0 0 8px var(--c-cyan-glow); }
```

> **Rule:** *Never* write a hex literal in JSX/TS – always reference `var(--token)` (or the fallback above).  

---  

## 📊 Responsive Matrix (Mandatory)

| Breakpoint | Width (px) | Min Touch Target |
|------------|------------|------------------|
| 1️⃣ | 320 | 44 px (56 px on < 768 px) |
| 2️⃣ | 375 | 44 px |
| 3️⃣ | 430 | 44 px |
| 4️⃣ | 768 | 44 px |
| 5️⃣ | 1024 | 44 px |
| 6️⃣ | 1280 | 44 px |
| 7️⃣ | 1440 | 44 px |
| 8️⃣ | 1920 | 44 px |
| 9️⃣ | 2560 | 44 px |
| 🔟 | 3840 | 44 px |

All components must respect the **44 px** (or **56 px** on small screens) tap area and **scale** with the matrix.  

---  

## 🔎 Edge‑Case Review & Ratings  

| # | Edge Case | Rating | Why? | CSS / React Fix (with theme tokens) |
|---|-----------|--------|------|--------------------------------------|
| 1 | **Narrow‑width squeeze (320 px)** – densest surfaces fit? | **CRITICAL** | At 320 px the three child panes (Plan Builder, Logger, Import) are forced into a single column. Text overflows, icons clip, and the “Generate” button can be hidden behind the soft‑keyboard. | ```css
/* Force a minimum width for the densest container */
.training-tab-section-content {
  min-width: 320px;
  overflow-x: hidden;
}

/* Use logical spacing to avoid clipping */
@media (max-width: 320px) {
  .plan-builder, .workout-logger, .import-panel {
    flex-direction: column;
    gap: 1rem;
  }
  .btn-primary, .btn-secondary {
    width: 100%;
    min-height: 44px; /* 56px on <768px */
  }
}
``` |
| 2 | **iOS Safari quirks** – WebKit support, prefixes, autoplay/permission policies for any device/media API the plan uses | **HIGH** | The plan mentions “voice‑first” and “media‑capture” for dictation. iOS Safari only allows `getUserMedia` after a user gesture and blocks autoplay with sound. | ```tsx
// Wrap media‑capture in a user‑initiated click
const startDictation = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      // iOS requires a user gesture; this function is called from a button
      // Enable autoplay only after the first interaction
      audioCtx.resume();
    })
    .catch(err => console.warn('Mic not allowed', err));
};

// In JSX – no autoplay attribute
<button onClick={startDictation}>🎤 Dictate</button>
``` |
| 3 | **Mobile keyboard** – does any surface get pushed off‑screen? | **MEDIUM** | When the logger’s input (e.g., “Notes” field) receives focus, the bottom action strip can be hidden behind the soft‑keyboard on iPhone SE (320 px). | ```tsx
// Use `react-use-keyboard` or `window.innerHeight` to keep CTA visible
import { useKeyboardHeight } from 'react-use-keyboard';

function LoggerFooter() {
  const height = useKeyboardHeight();
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: height ? `${height}px` : '0',
        width: '100%',
        minHeight: '44px',
        background: 'var(--c-carbon)',
        display: 'flex',
        justifyContent: 'space-around',
      }}
    >
      <button className="btn-primary">Save</button>
      <button className="btn-secondary">Cancel</button>
    </footer>
  );
}
``` |
| 4 | **Offline / slow network** – failure + empty‑state UX for each new fetch | **HIGH** | Every new fetch (`/api/workout-plans/:userId`, `/api/workouts/:userId/current`, `/api/workout-logs/history-preview`) must have a graceful fallback. | ```tsx
// Wrapper hook
export const useFetch = <T>(url: string, opts?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { ...opts, signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => setData(json))
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
        else return; // silent abort
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, error, loading };
};

// Empty‑state component (styled)
export const EmptyState = ({msg}:{msg:string}) => (
  <div className="flex flex-col items-center py-8">
    <p className="text-frost-white text-lg">{msg}</p>
    <button className="btn-primary mt-4">Retry</button>
  </div>
);

// Usage
const {data, error, loading} = useFetch<Plan[]>('/api/workout-plans/client/123');
if (loading) return <SkeletonSkeleton />;
if (error) return <EmptyState msg="Unable to load plans – check your connection." />;
``` |
| 5 | **Long / overflowing text** – truncation / wrap strategy for dynamic titles, labels | **MEDIUM** | Generated plan titles can be arbitrarily long (e.g., “4‑Week Strength Cycle – Upper‑Body Focus”). At 320 px they must wrap or truncate without breaking layout. | ```css
/* Use `ch` based truncation with fallback to ellipsis */
.title {
  display: -webkit-box;
  -webkit-line-clamp: 2; /* max 2 lines */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Wrap when space permits */
.subtitle {
  max-width: 100%;
  word-break: break-word;
}

/* Ensure touch‑targets stay intact */
.title, .subtitle {
  padding: 0.5rem 0.75rem;
}
``` |
| 6 | **Large lists** – virtualization needed? Memory impact? | **HIGH** | The *Plan Catalog* can grow indefinitely (user‑generated plans). Rendering 200+ cards at 320 px would cause jank. | ```tsx
// Use `react-window` (lightweight) for virtualized list
import { FixedSizeList as List } from 'react-window';

const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
  <div style={style}>
    <PlanCard plan={plans[index]} />
  </div>
);

export const PlanCatalog = ({plans}:{plans:Plan[]}) => (
  <List
    height={300}               // fits within 768‑1280 breakpoint column
    itemCount={plans.length}
    itemSize={80}
    width="100%"
  >
    {Row}
  </List>
);
``` |
| 7 | **RTL** – do new layouts flip correctly? | **LOW** | The plan does not mention explicit RTL support, but all new surfaces use **CSS logical properties** (`margin-inline`, `padding-inline`). | ```css
.container {
  padding-inline: 1rem;
  margin-inline: auto;
}

/* Example: direction‑aware button group */
.btn-group {
  display: inline-flex;
  gap: 0.5rem;
}

/* When `dir="rtl"` is applied (e.g., via browser language), logical gaps flip automatically. */
``` |
| 8 | **Reduced motion** – every animation respects `prefers-reduced-motion` | **CRITICAL** | The plan adds “glow” transitions and animated plan‑advancement cues. Must be disabled for users who request reduced motion. | ```css
@media (prefers-reduced-motion: reduce) {
  .glow {
    animation: none;
    box-shadow: none;
  }
  .plan-advance-animation {
    animation: none;
  }
}

/* Example glow on dual‑button */
.btn-primary {
  transition: box-shadow var(--transition);
}
@media (prefers-reduced-motion: no-preference) {
  .btn-primary:hover { box-shadow: 0 0 0 8px var(--c-purple-glow); }
}
``` |
| 9 | **Screen reader** – landmarks, list navigation, control roles, live‑region announcements | **HIGH** | New surfaces expose “Training Command” workflow; must be fully navigable (ARIA landmarks, button roles, live region for plan‑load status). | ```tsx
/* Layout with ARIA landmarks */
<div role="main" aria-label="Training Command Workspace">
  <section aria-labelledby="plan-builder-heading">
    <h2 id="plan-builder-heading">Generate Plan</h2>
    {/* ... */}
  </section>

  <section aria-labelledby="logger-heading">
    <h2 id="logger-heading">Log Today</h2>
    {/* Input with aria‑describedby */}
    <textarea
      aria-describedby="logger-notes-desc"
      placeholder="Add notes…"
      rows={3}
    />
    <p id="logger-notes-desc" className="sr-only">
      Optional notes about the workout.
    </p>
  </section>

  <section aria-live="polite" aria-atomic="true" className="sr-only">
    {loading ? 'Loading plan…' : `Plan loaded: ${plan?.title}` }
  </section>
</div>
``` |
|10| **4K / ultrawide** – max‑width constraints vs full‑bleed stretch | **MEDIUM** | At 3840 px the UI should **not** stretch infinitely; max‑width must cap at a readable 1440‑1920 px while allowing side‑bars to expand for charts. | ```css
/* Constrain main container */
.main-workspace {
  max-width: 1440px;      /* fits 1440‑1920 breakpoint */
  width: 100%;
  margin-inline: auto;
}

/* Allow charts to stretch to the edges of the viewport */
.chart-container {
  width: 100%;
  aspect-ratio: 16 / 9;
}

/* On ultra‑wide screens, keep a gutter */
@media (min-width: 2560px) {
  .main-workspace { padding-inline: 2rem; }
}
``` |

---  

## 📌 Summary of Ratings  

| Rating | # of Cases |
|--------|------------|
| **CRITICAL** | 2 (Narrow‑width squeeze, Reduced motion) |
| **HIGH**     | 4 (iOS Safari, Offline/Slow network, Large lists, Screen reader) |
| **MEDIUM**   | 3 (Mobile keyboard, Long/overflowing text, 4K/ultrawide) |
| **LOW**      | 1 (RTL) |

---  

## 🛠️ Implementation Checklist (React + styled‑components)

1. **Theme Tokens** – All colours, spacing, and glow effects must reference `var(--token)`.  
2. **Touch Targets** – Enforce `min-height: 44px` (or `56px` under 768 px) on every interactive element.  
3. **Responsive Breakpoints** – Use the mandatory 10‑breakpoint matrix in a `styled-components` `styled` helper:  

   ```tsx
   import styled from 'styled-components';

   const Container = styled.div`
     width: 100%;
     max-width: ${({ theme }) => theme.breakpoints['1280']}px;
     margin-inline: auto;
     padding-inline: ${({ theme }) => theme.spacing[1]};
   `;
   ```

4. **Virtualized Lists** – Add `react-window` for any list > 30 items.  
5. **Reduced Motion** – Wrap all `@keyframes`/transitions in `prefers-reduced-motion` media queries.  
6. **ARIA & Landmarks** – Apply the markup shown in #9; test with VoiceOver/NVDA.  
7. **iOS Media Capture** – Guard `getUserMedia` behind a user gesture; never autoplay audio.  
8. **Offline UX** – Use the `useFetch` wrapper; show `EmptyState` on error.  
9. **Logical Properties** – Replace `margin-left/right` with `margin-inline` for RTL safety.  
10. **4K/ultrawide** – Constrain the main workspace with `max-width` and provide side‑gutter padding.  

---  

### ✅ Final Takeaway  

All new surfaces **must** be built on the **CSS‑custom‑property palette**, respect the **44 px (56 px on < 768 px)** touch‑target rule, and be tested against the **10‑breakpoint matrix**. The edge‑case ratings above indicate where the **most urgent safeguards** (narrow width, reduced motion, offline failures, large lists, screen‑reader semantics) belong in the first production slice. Implement the solutions provided, then re‑run the matrix validation before merging to `main`.  

---  

*Prepared by the SwanStudios Mobile Web & Edge‑Case Team – 2025‑09‑28*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
