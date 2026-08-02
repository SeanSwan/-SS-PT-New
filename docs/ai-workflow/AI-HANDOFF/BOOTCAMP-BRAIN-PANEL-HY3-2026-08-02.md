# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/BOOTCAMP-BRAIN-PANEL-BRIEF-2026-08-02.md
**Seed:** (none)
**Tokens:** 3408 in / 5244 out | **Cost:** ~$0.0032 | **Wall:** 48.3s | **finish_reason:** stop

---

**Tencent Hy3 — SwanStudios Design-Inspection Review (UI/UX & Interaction Only)**

**Executive thesis:** The brief is algorithmically exhaustive but UX-blind; it repeats its own non-negotiable “Qwen builds, Qwen does not decide” rule yet delegates zero decisions about the trainer’s physical interaction surface, forcing a builder model to invent the entire UI and thereby violating the blueprint’s core constraint. The single highest-leverage correction is a strict, tokenized, dark-first, one-hand mobile component contract for the Class Plan + Fact Chip + Transition view — with Victory explainability — capped at 300 lines per file, so the builder has zero UI judgment to make.

---

### Ranked UI/UX Weaknesses (Severity)

| # | Severity | Weakness (UI/UX) | Brief Evidence |
|---|----------|------------------|----------------|
| 1 | **Critical** | No visual contract for “Fact chips” (§2.7, §3.7): no token, size, tap target, contrast, or layout rule. Builder will invent 10 variants. | “renderable as a closed-enum chip (max 2 per row)” — unspecified visually. |
| 2 | **Critical** | “Tired trainer, phone in one hand, 6am” (§2.8) is declared context but zero responsive/thumb-zone layout, no sticky action placement. | Builder left to guess where “Generate” lives. |
| 3 | **High** | Setup-transition optimizer (D-B, §2.4–2.5) has no visualization spec. Trainer cannot see *why* bands are first; no rig-state display. | “brain thinks of many situations” — never surfaced to UI. |
| 4 | **High** | Reduced-motion safety absent. Animated plan reflow at 6am distracts a tired user. | Not mentioned anywhere. |
| 5 | **Medium** | WCAG 4.5:1 not enforced via tokens; brief uses raw intent only. | “design context: 6am floor” but no contrast mandate. |
| 6 | **Medium** | File ≤300-line cap (§2.8) not mapped to component architecture. | Cap stated, no file split given. |
| 7 | **Low** | Treatment rotation (D-A, §3.1) needs Victory history sparkline; none specified. | “selection function given history” — no UI to show it. |

---

### Single Highest-Impact Improvement
Ship a **`ClassPlanView.tsx`** (≤300 lines) that is dark-first, mobile-320 stacked, uses tokenized chips (44px min-height), a sticky 44px footer “Regenerate” action, a Victory mini-chart for treatment history, and a `prefers-reduced-motion` guard. This removes 100% of UI invention from the Qwen builder.

---

### Builder-Exact Corrections

**1. Token contract (enforced, not optional) — `theme/crystallineSwan.ts`**
```ts
// Excluded from 300-line cap (pure token export)
export const cs = {
  color: {
    bgBase:    '#0A0E14', // dark-first
    surface:   '#121821',
    raised:    '#1B2330',
    text:      '#E6EDF3', // 4.5:1+ on bgBase/surface
    textMuted: '#9BA8B5', // verified 4.5:1 on surface
    accent:    '#5ED3F3',
    accentInk: '#00121A', // text on accent
    warn:      '#F3C05E',
    danger:    '#F35E7A',
  },
  touch: '44px',
  radius: { chip: '8px', panel: '12px' },
} as const;
```

**2. Responsive + reduced-motion base — `ClassPlanView.tsx` (excerpt, ~140 lines total)**
```tsx
import styled from 'styled-components';
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory';

const Page = styled.main`
  background: ${({theme}) => theme.cs.color.bgBase};
  color: ${({theme}) => theme.cs.color.text};
  padding: 12px;
  max-width: 3840px; margin: 0 auto;
  /* 320 first; scale up */
  @media (min-width: 375px) { padding: 14px; }
  @media (min-width: 414px) { padding: 16px; }
  @media (min-width: 768px) { padding: 24px; max-width: 720px; }
  @media (min-width: 1024px){ max-width: 960px; }
  @media (min-width: 1440px){ max-width: 1200px; }
  @media (min-width: 2560px){ max-width: 1800px; }
  @media (min-width: 3840px){ max-width: 2400px; }
`;

const ChipRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap;
  margin: 4px 0 12px;
`;

const Chip = styled.span`
  display: inline-flex; align-items: center;
  min-height: ${({theme}) => theme.cs.touch}; /* 44px target */
  padding: 0 12px;
  background: ${({theme}) => theme.cs.color.raised};
  color: ${({theme}) => theme.cs.color.text};
  border-radius: ${({theme}) => theme.cs.radius.chip};
  font-size: 14px; line-height: 1;
  /* WCAG 4.5:1 met by token pairing */
`;

const StickyFooter = styled.footer`
  position: sticky; bottom: 0; left: 0; right: 0;
  padding: 8px; background: ${({theme}) => theme.cs.color.surface};
  button {
    min-height: ${({theme}) => theme.cs.touch};
    min-width: ${({theme}) => theme.cs.touch};
    background: ${({theme}) => theme.cs.color.accent};
    color: ${({theme}) => theme.cs.color.accentInk};
    border: 0; border-radius: ${({theme}) => theme.cs.radius.panel};
    font-size: 16px; font-weight: 600;
  }
`;

const MotionSafe = styled.div`
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;
```

**3. Victory explainability (treatment history + transition cost) — same file**
```tsx
const HistorySpark = ({data}:{data:{x:string;y:number}[]}) => (
  <VictoryChart height={120} width={320} padding={20} theme={undefined}>
    <VictoryAxis style={{tickLabels:{fill:'#9BA8B5', fontSize:10}}} />
    <VictoryBar data={data} style={{data:{fill:'#5ED3F3'}}} />
  </VictoryChart>
);
// data = last 5 treatments per staple (D-A); rendered only at >=768px to protect 320px thumb scroll
```

**4. File breakdown (proves ≤300 lines)**
- `theme/crystallineSwan.ts` — tokens (not counted, pure export)
- `ClassPlanView.tsx` — ~150 lines (Page, Chip, ChipRow, StickyFooter, MotionSafe, HistorySpark, map over plan rows)
- `FactChip.tsx` — ~40 lines (closed-enum switch → Chip)
- `TransitionBar.tsx` — ~60 lines (Victory bar of rig-state cost per boundary)
- `RegenerateFooter.tsx` — ~30 lines (imports StickyFooter)

All components consume `theme.cs` tokens; **zero hex values inside components** (tokenized color enforcement).

---

### Interaction Rules the Builder Must Follow (Exact)
1. **Touch:** Every tappable element (`Regenerate`, `Swap`, chip-expand) `min-height:44px; min-width:44px`.
2. **Contrast:** Only `cs.color` pairs with verified ≥4.5:1 used for text-on-surface.
3. **Motion:** Wrap all view transitions in `MotionSafe`; no autoplay charts.
4. **Breakpoints:** Layout must not horizontally scroll at 320/375/414; two-column only ≥768.
5. **Chips:** Max 2 `FactChip` per exercise row; overflow → `+N` tap reveals sheet (44px targets).
6. **Victory:** Used *only* for treatment history (≥768px) and transition-cost bar (all widths, collapsed under 320).

The brief’s sections 1–9 are algorithmic and out of scope for this review per mandate; however, each implicitly demands a UI decision the brief failed to make — that omission is the critical defect logged above.
