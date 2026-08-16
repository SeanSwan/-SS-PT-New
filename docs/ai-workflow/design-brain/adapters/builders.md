# Builders Adapter — Claude Code & Codex

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for Claude Code and Codex implementing UI
- **Scope:** any slice that creates or modifies visible SwanStudios UI. Both builders share this contract; lane ownership and commit safety stay in `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md` (rule 67), not here.

---

## 1. Pre-build load order (read from disk, in order, stop when satisfied)

1. `../design.md` — tokens, typography, spacing scale, a11y floors. **Always.** Not from memory; tokens drift, memory drifts faster.
2. `../components.md` — does the pattern I need already exist? Reuse before forking a near-duplicate.
3. `../anti-patterns.md` — is what I'm about to build on the ban list?
4. `../qa-gates.md` — the viewport matrix + hostile-critique checklist I will be judged against.
5. **Mounted-surface receipt** (CLAUDE.md rule 26) — file:line proof of the route that mounts the target URL, the JSX actually rendered (a lazy `import()` is NOT proof of mount), consumer hook/service, exact frontend API path, backend route match, authoritative model fields. No UI code before this receipt exists in the task thread.
6. Only if the task is a net-new page or major redesign: the direction doc Fable produced per `fable.md` (the 2–3 concept gate output). Builders do not self-ideate directions for net-new pages.

## 2. Build contract (non-negotiable)

- **styled-components only.** No MUI (rule 1), no Tailwind, no `className` utility stacks.
- **`css`` ` helper for every shared style fragment that interpolates** a keyframe, mixin, or styled primitive. A plain template string bakes a `toString()`'d class name into CSS and crashes at mount with styled-components error #12 (rule 43; incident 2026-04-12 `AdminOverviewPanel.tsx`). Build passes, types pass — it only dies on mount. If a template literal interpolates a styled-components primitive, it is `` css`` ``, full stop.
- **`var(--token, #fallback)`** for every color (rule 6); fallbacks are Crystalline Swan hexes from `../design.md`. No raw hex outside a fallback position. New token = proposal to Sean, never a hardcode.
- **300-line cap** per file (rule 4) — extract hooks/styles/types as you approach it, not after.
- **44px minimum touch targets** (rule 2) on every interactive element, including icon buttons.
- **Dark-first** (rule 3): default renders correctly on `var(--bg-base, #030712)` with no light-theme assumption anywhere.
- **Reduced motion, both layers:** CSS `@media (prefers-reduced-motion: reduce)` for styled-component animation, AND `useReducedMotion()` from framer-motion for JS-driven variants. One without the other is a half-fix — CSS media queries do not stop framer springs.
- **Victory only** for new charts (rule 10), themed via the shared chart theme.
- **WCAG 4.5:1** text contrast (rule 7).
- **Real data truth:** no decorative/mock metrics on shipping surfaces; a mock is a flagged gap, not a feature.

## 3. Pre-commit design self-check (run before staging, every UI slice)

- [ ] Every color traces to a token with a dark fallback; zero orphan hexes (`grep -n '#[0-9A-Fa-f]\{6\}'` on touched files — each hit must be inside `var(...)` or a documented shadow/rgba recipe from `../design.md`)
- [ ] Every shared interpolated fragment is `` css`` `` -wrapped (rule 43)
- [ ] Touched files ≤300 lines; blueprint header present on components >100 lines (rule 5)
- [ ] Interactive elements ≥44px; no nested interactive elements; no hover-only access to core controls
- [ ] Loading / empty / error states exist for every data-dependent view
- [ ] Reduced-motion verified in BOTH CSS and framer-motion paths
- [ ] Viewports from `../qa-gates.md` Gate 1 checked — at minimum 320 / 375 / 414 / 768 / 1440, plus 2560×1440 for dashboard surfaces
- [ ] Hostile design critique pass run (rules 17/23): tried to prove it generic, crowded, flat, or template-like — and fixed the weakest area
- [ ] Not on the `../anti-patterns.md` ban list (equal 4-up grids, centered-hero template, card-in-card…) nor the source-doc §C10 bans (bare `<hr>` dividers, bare KPI rows)

## 4. Builder receipt (leave in the task thread / slice doc — required)

```
DESIGN RECEIPT — <surface name>
Surface:      <route + mounted component, file:line>   (rule 26 receipt: <link/anchor>)
Direction:    <Fable direction name, or "polish — no direction gate needed">
Tokens used:  <list — design.md §6 names only, e.g. --bg-base, --ice-wing, --gilded-fern>
Patterns:     <C-patterns / components.md entries reused — e.g. C12 glass panel (obsidian variant), C11 chart env>
Viewports:    <widths actually checked, with any monitor-class dims>
Motion:       <framer variants + reduced-motion handling, or "static">
Deviations:   <anything not covered by design.md — each one PROPOSED, not silently shipped>
Verification: <tests/commands run + hostile-critique weakest-area fix>
```

## 5. Worked example receipt

```
DESIGN RECEIPT — Client Progress chart panel
Surface:      /dashboard/progress → ClientProgressPanel.tsx:41 mounted via DashboardRoutes.tsx:88
              (rule 26 receipt in slice thread, 2026-07-03)
Direction:    n/a — polish slice on existing canonical surface
Tokens used:  --bg-base, --carbon, --ice-wing(#60C0F0), --arctic-cyan(#50A0F0 charts only),
              --gilded-fern(#C6A84B delta), --frost-white(#E0ECF4)
Patterns:     C11 premium chart environment (narrative column left, chart 65% right);
              C12 glass panel, obsidian variant; Victory line chart w/ shared chartTheme
Viewports:    320, 375, 414, 768, 1024, 1440, 2560×1440 (narrative column stacks above chart <768)
Motion:       framer fade+rise on scroll-in via useInView; useReducedMotion() → variants disabled;
              CSS @media reduced-motion kills the sparkline draw animation
Deviations:   none
Verification: npx vitest run ClientProgressPanel.test.tsx (5/5); tsc --noEmit clean on slice files
              (baseline status disclosed per rule 56); hostile pass → empty-state was a bare
              "no data" label, replaced with Cormorant italic explanation per C11
```

## 6. Verification before done (self-apply)

- [ ] Load order §1 followed from disk, receipt from §4 posted
- [ ] Every §2 contract line consciously checked, not assumed
- [ ] §3 checklist green; failures fixed before staging, not annotated around
- [ ] Deviations proposed upward (`../design.md` change or token proposal), never silently shipped
- [ ] Other builder's lane checked before edit (rule 67); no `git add -A` while lanes are locked
