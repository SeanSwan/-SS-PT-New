# qa-gates.md — Responsive · Accessibility · Visual QA Gates

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL
- **Consolidation note:** this file deliberately merges the originally-planned `responsive-qa.md` + `accessibility-qa.md` + `visual-qa.md` into one three-gate document — one read before any "done" claim, recorded in `index.md`.
- Every UI slice passes ALL THREE gates before closeout (rule 41). Each gate ends in a binary pass/fail an agent can self-apply.

---

## Gate 1 — RESPONSIVE

The full matrix (CLAUDE.md Premium Design Critique Loop §5). Check every row that can render the surface:

| Viewport | Class | What to check |
|---|---|---|
| `320px` | Minimum handset | Nothing overlaps/clips; stack > squeeze; CTA reachable without horizontal scroll |
| `375px` | Small iPhone | Type ≥16px body; thumb-zone CTA placement; 44px + 8px gap targets |
| `414px` | iPhone XR / Plus portrait | The Swan Card Standard width: cards, tabs, biometrics, action rows must not overlap, clip, or require hover |
| `768px` | Tablet portrait | Grid transitions (1→2 col); tables may remain tables above this only |
| `1024px` | Tablet landscape / small laptop | Nav rail behavior; drawer vs modal choices |
| `1280px` | Laptop | Baseline desktop composition |
| `1440px` | Desktop browser width | ⚠ `1440px` width ≠ 1440p — this is just a browser width |
| `1920px` | 1080p desktop | Section gaps at full scale; hero media crop |
| `2560×1440` | **1440p/QHD monitor class (Sean's)** | Density scales by MORE columns, not bigger cards (design.md §24); no stretched cards |
| `3840×2160` | 4K monitor class | Same; prose capped ~72ch; dashboards cap ~1920px centered or add columns |
| `3440px` | Ultrawide | Full-bleed only for cinematic media; content never ribbon-stretches |

If the QA tool accepts width only: use `2560px`/`3840px` widths and state the tested height separately. **1440p means the 2560×1440 viewport class.**

**PASS =** every applicable row checked and listed in the receipt with findings; zero overlap/clip/hover-dependence at ≤414px; wide-monitor rows show added columns, not stretched cards. Anything unchecked = say so explicitly (`[UNVERIFIED]`), which fails the gate for phone widths and merely flags for monitor widths.

## Gate 2 — ACCESSIBILITY

1. **Contrast:** 4.5:1 minimum for text (rule 7), checked against the ACTUAL rendered background (glass panels: check against the darkest AND lightest blur state; media: brightest frame per `cinematic-pages.md`). Known trap: raw `--swan-lavender` (#4070C0) text on dark surfaces computes ~4.0:1 — use it for borders/fills, or use lightened text tints.
2. **Focus:** `:focus-visible` ring on every interactive element (glow-color, 2px, offset 2px per design.md §10); logical tab order; **focus restoration to trigger on modal/drawer close** (WCAG 2.4.3 — a repeat offender in this repo, now source-locked in several suites).
3. **Keyboard paths:** every pointer path has a keyboard path; no hover-only reveals (anti-patterns); ESC closes non-destructive overlays.
4. **Touch:** ≥44px targets, ≥8px between adjacent targets; no nested interactive elements (invalid DOM + trap).
5. **Reduced motion:** DUAL gating verified — CSS `@media (prefers-reduced-motion)` AND `useReducedMotion()` for framer-motion/JS (`motion.md` §4; the 2026-06-20 lesson).
6. **Color-independence:** state/tier/delta never color-alone — always paired text/icon (design.md §15).
7. **Forced-colors:** headline gradients and glow chrome degrade to `CanvasText`-sane output (pattern: H1 forced-colors fallback, SESSION-H fix).
8. **ARIA:** labels on icon-only buttons; `aria-describedby` for field errors; live regions for async state changes; loading regions accessible (labeled skeleton region pattern).

**PASS =** all eight lines verified on the touched surface with evidence (test, axe pass, or explicit manual check named in the receipt). Hand-computed contrast is acceptable but must be labeled `[hand-computed]`; instrument-measured preferred.

## Gate 3 — VISUAL QA (the hostile design critique)

Run AFTER building, in hostile-reviewer mode (rule 23): actively try to prove the design is generic, tacky, flat, crowded, or inconsistent — then fix the weakest area before claiming done.

**The checklist (from the Premium Design Critique Loop, mapped to Design Brain docs):**
- Generic/template feel? (anti-patterns §layout — is there a named B2 arc and editorial asymmetry?)
- Weak hierarchy or unclear CTA? (one primary action per view; the biggest thing = the biggest idea)
- Inconsistent spacing rhythm? (every gap on the design.md §7 scale?)
- Cheap shadows/borders/icons? (glass + tinted glow only; lucide icons, no emoji controls)
- Flat, depthless backgrounds? (atmosphere layers + grain on large dark surfaces)
- Unreadable density / mobile squeeze? (Gate 1 evidence)
- Motion dead, noisy, or excessive? (`motion.md` §9 earned-motion test; calm zones clean)
- Weak contrast / muddy dark-mode? (Gate 2 evidence; "dark room lit by glowing objects," not gray-on-gray)
- Acceptable-but-not-premium components? (does the surface have its one signature moment?)
- Signature moment present and singular? (zero = template; two+ = noise)

**Tooling:** screenshot-diff loop per `docs/ai-workflow/references/VISUAL-DIFF-LOOP.md`; supervised Browser Harness sessions per `adapters/reviewers.md` (read-only, receipt-producing); Brave for Playwright QA (standing preference).

**Receipt format (required output of every QA pass):**

```
QA RECEIPT — <surface> — <date>
Viewports checked: <list with pass/fail each>
Accessibility: <8-line status w/ evidence class per line>
Critique findings: <ranked weakest-first>
Fixed this pass: <list>
Residual (disclosed): <list + why acceptable or deferred>
Verdict: PASS | FAIL (binary — no "looks good")
```

**PASS =** every checklist line answered with evidence, the weakest finding FIXED (not just noted), and the receipt written. A pass with an empty "Fixed this pass" section is suspicious — hostile review that finds nothing usually didn't look (rule 17).

---

## One-line summary for builders

Gate 1 proves it works everywhere, Gate 2 proves it works for everyone, Gate 3 proves it's worth shipping — receipts for all three, or it isn't done.
