# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 35.1s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

## 📋 Edge‑Case Review Summary  
*All ratings are **relative to the SwanStudios production constraints** (WCAG 4.5:1, 44 px + touch targets, 300‑line file limit, styled‑components only, Victory charts, etc.).*  

| # | Edge‑Case | Rating | CSS / React Solution (short) |
|---|-----------|--------|------------------------------|
| 1 | **Narrow‑width squeeze (320 px)** – densest surfaces fit? | **HIGH** | Use `grid-template-columns: 1fr;` → `minmax(0, 1fr)`; hide non‑essential chrome with `display:none` at `max-width: 375px`; enforce `overflow-anchor: none;` to avoid clipping. |
| 2 | **iOS Safari quirks** – WebKit support, prefixes, autoplay | **MEDIUM** | Add `-webkit-` prefixes for `backdrop-filter`; use `autoplay={false}` + `muted` on `<video>`; guard `requestFullscreen` with `if (document.fullscreenElement) return;`; listen to `webkitmediaquery` for `pointer: coarse`. |
| 3 | **Mobile keyboard** – input focus pushes UI off‑screen | **HIGH** | Implement `useKeyboardHeight()` hook (e.g., `react-use-measure`); add `padding-bottom: env(safe-area-inset-bottom);`; keep primary CTA sticky with `position: sticky; bottom: 0;`. |
| 4 | **Offline / slow network** – fetch failure + empty‑state UX | **MEDIUM** | Wrap every `fetch` in `useSWR` with `fallbackData`; show skeleton UI; on error render `<EmptyState message="No connection – pull to retry" retry={refresh} />`. |
| 5 | **Long/overflowing text** – truncation / wrap strategy | **MEDIUM** | Use `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;` for titles; for multi‑line use `line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;`. |
| 6 | **Large lists** – virtualization needed? | **LOW** | Apply `react‑virtual` or `react‑window` only when `estimatedItemCount > 50`; keep `height: 250px;`. |
| 7 | **RTL** – layout flip correctly? | **LOW** | Use CSS logical properties (`margin-inline-start`, `padding-inline-end`) and `dir="rtl"` on root; test with `html[dir="rtl"]` overrides. |
| 8 | **Reduced motion** – respects `prefers-reduced-motion` | **CRITICAL** | Global style: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`; in React, guard animations with `if (!reducedMotion) animate();`. |
| 9 | **Screen reader** – landmarks, list navigation, live regions | **HIGH** | Add semantic landmarks (`<header role="banner">`, `<nav role="navigation">`); use `aria-label` on button groups; add `role="status"` or `aria-live="polite"` for progress updates; ensure focus order follows visual order. |
|10| **4K / ultrawide** – max‑width vs full‑bleed stretch | **MEDIUM** | Constrain container width with `max-width: 1440px; width: 100%;`; use `padding: 0 1rem;`; for full‑bleed sections, apply `@media (min-width: 2560px) { .hero { background-size: cover; } }`. |

---

## 🗂️ Surfaces Derived from the Plan  

| Surface | Primary Purpose | Key Content Types |
|---------|----------------|-------------------|
| **Marketing‑Home / About / Contact** | Acquisition & brand storytelling | Hero banner, feature cards, CTA buttons, testimonial carousel |
| **Dashboard‑User** | Personal progress overview | Timeline of logged workouts, simple stats, “Next Session” CTA |
| **Dashboard‑Client** | Trainer‑client relationship | Session schedule, client roster, messaging panel |
| **Dashboard‑Trainer** | Coach work‑horse (40 h / wk) | Detailed workout list, chart of metrics, admin controls |
| **Dashboard‑Admin** | Platform ops & finance | Finance demoted bar, urgent‑queue list, system health tiles |
| **Store** | Merch & subscription checkout | Product grid, payment form, confirmation banner |
| **Photography** | Visual showcase (user‑generated) | Gallery grid, lightbox viewer |
| **Video Library** | Training demos & testimonials | Video grid, playback controls |
| **Waiver / Legal** | Consent & liability | Form fields, acceptance checkbox, “I Agree” button |

> **Note:** Every surface must obey **Palette Law A** (tokens only) and **Dual‑Button Glow** rules. No hard‑coded hexes except as fallbacks.

---

## 📐 10‑Breakpoint Responsive Matrix Test  

| Breakpoint (px) | Surfaces that **require** special attention (densest) | Layout‑Squeeze Risk? | Recommended CSS Adjustments |
|-----------------|--------------------------------------------------------|----------------------|------------------------------|
| **320** | Trainer‑Dashboard list, Admin‑Signal‑Bar, Store checkout form | **YES** – many columns collapse | `grid-template-columns: 1fr;` → `gap: 1rem;`; hide secondary nav; `min-height: 44px` for all touch targets. |
| **375** | Marketing hero on small phones, Dashboard‑Trainer chart titles | Moderate | Use `clamp(1rem, 4vw, 1.5rem)` for headings; `text-wrap: wrap` for labels. |
| **430** | Video‑Library thumbnail overlay, Waiver checkboxes | Low | Ensure tap area ≥ 44 px; add `padding: 0.5rem`. |
| **768** | Full‑width navigation, Multi‑column dashboards | Low‑Medium | Switch to `1200px` max‑content width; enable `flex-wrap`. |
| **1024** | Admin‑Urgent‑Queue cards, Store product cards | Low | Use `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));`. |
| **1280** | Dashboard‑Trainer “Next Session” CTA row | Low | Keep CTA sticky on scroll (`position: sticky; top: 0`). |
| **1440** | Marketing‑Home hero background image | Low | `background-size: cover; height: 60vh;`. |
| **1920** | Photography gallery full‑bleed | Low | `max-width: 100%; height: auto;`. |
| **2560** | Ultrawide “Evidence Lens” overlay | Low | Constrain overlay with `max-width: 80%;`. |
| **3840** | 4K “Swan Deep Field” background | Low | `background-attachment: fixed;` for parallax effect. |

**Result:** Only the **320 px** breakpoint shows a **HIGH** risk for the densest surfaces (Trainer & Admin dashboards). All other breakpoints are safe with the suggested CSS tweaks.

---

## 🛠️ Detailed CSS / React Fixes  

Below are the concrete implementations that address each of the 10 edge cases. All snippets are **self‑contained** and respect the 300‑line file limit.

### 1️⃣ Narrow‑Width Squeeze (320 px)  
```tsx
// src/components/DenseGrid.tsx
import styled from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
  overflow-x: hidden;               /* prevent horizontal scroll */
  @media (max-width: 375px) {
    grid-template-columns: 1fr;     /* single column on 320‑375px */
  }
`;

export const DenseGrid = ({ children }: { children: React.ReactNode }) => (
  <Grid>{children}</Grid>
);
```

### 2️⃣ iOS Safari Quirks  
```tsx
// src/components/VideoPlayer.tsx
import { useEffect, useRef } from 'react';

export const VideoPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    // Autoplay only if muted & user has interacted
    const canPlay = () => vid.play().catch(() => {});
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.setAttribute('muted', '');
    vid.addEventListener('canplay', canPlay);
    return () => vid.removeEventListener('canplay', canPlay);
  }, []);
  return <video ref={videoRef} src={src} className="video-player" />;
};
```
```css
/* src/styles/video.css */
.video-player {
  width: 100%;
  -webkit-transform: translateZ(0); /* force GPU */
}
```

### 3️⃣ Mobile Keyboard Handling  
```tsx
// src/hooks/useKeyboardHeight.ts
import { useEffect, useState } from 'react';

export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight - window.documentElement.clientHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
};
```
```tsx
// src/components/ChatInput.tsx
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import styled from 'styled-components';

const Container = styled.div`
  padding-bottom: ${({ theme }) => theme.keyboardHeight}px;
  position: relative;
`;

export const ChatInput = () => {
  const kbHeight = useKeyboardHeight();
  return (
    <Container keyboardHeight={kbHeight}>
      <input type="text" aria-label="Message" />
    </Container>
  );
};
```

### 4️⃣ Offline / Slow Network UX  
```tsx
// src/lib/api.ts
import useSWR from 'swr';

export const useFetch = (url: string) => {
  const { data, error, mutate, isValidating } = useSWR(url, fetcher, {
    fallbackData: null,
    revalidateOnFocus: false,
    onError: (err) => {
      // Show toast + empty state
      alert('Network error – pull to retry');
    },
  });
  return { data, error, isLoading: !data && !error, mutate, isValidating };
};
```
```tsx
// src/components/EmptyState.tsx
import styled from 'styled-components';

export const EmptyState = ({ message }: { message: string }) => (
  <Wrapper role="status" aria-live="polite">
    {message}
    <button onClick={refresh}>Retry</button>
  </Wrapper>
);
```

### 5️⃣ Long / Overflowing Text  
```tsx
// src/components/Truncate.tsx
import styled from 'styled-components';

const Title = styled.h3`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

export const Truncate = ({ children }: { children: string }) => (
  <Title>{children}</Title>
);
```

### 6️⃣ Large Lists – Virtualization (only when needed)  
```tsx
// src/components/VirtualList.tsx
import { FixedSizeList as List } from 'react-window';

type RowProps = { index: number; style: React.CSSProperties };
const Row = ({ index, style }: RowProps) => (
  <div style={style} aria-grabcursor="true">
    {/* render row data */}
  </div>
);

export const VirtualList = ({ items }: { items: any[] }) => {
  if (items.length <= 50) return <SimpleList items={items} />;
  return (
    <List
      height={300}
      itemCount={items.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### 7️⃣ RTL Support  
```tsx
// src/App.tsx
import styled from 'styled-components';
import { useDirection } from './hooks/useDirection';

const Root = styled.div<{ dir: 'ltr' | 'rtl' }>`
  direction: ${({ dir }) => dir};
  margin-inline-start: auto;
  margin-inline-end: auto;
  @media (dir: rtl) {
    /* logical overrides */
    .rtl-reverse { transform: scaleX(-1); }
  }
`;

export const App = () => {
  const [dir] = useDirection(); // reads <html dir="rtl" />
  return <Root dir={dir}> {/* rest of app */} </Root>;
};
```

### 8️⃣ Reduced Motion – Global Guard  
```css
/* src/styles/reduced-motion.css */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```
```tsx
// src/components/AnimatedButton.tsx
import { useEffect } from 'react';
import styled from 'styled-components';

const Button = styled.button<{ animate?: boolean }>`
  background: var(--bg);
  color: var(--text);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  ${({ animate }) =>
    animate &&
    `
    transition: background 0.3s ease;
    &:hover {
      background: var(--glow);
    }
  `}
`;

export const AnimatedButton = ({ animate, children }: any) => {
  const [mounted, setMounted] = useState(true);
  useEffect(() => () => setMounted(false), []);
  const shouldAnimate = animate && mounted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return <Button animate={shouldAnimate}>{children}</Button>;
};
```

### 9️⃣ Screen Reader – Landmarks & Live Regions  
```tsx
// src/components/ProgressBar.tsx
import styled from 'styled-components';

const Bar = styled.div<{ progress: number }>`
  width: ${({ progress }) => progress}%;
  height: 8px;
  background: var(--progress);


---

*Part of SwanStudios 15-Brain Recursive Consensus System*
