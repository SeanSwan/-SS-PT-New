# Visual Diff Loop
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: UI QA, Playwright screenshots, visual parity

---

## Visual Diff Loop (MANDATORY for UI work — adapted from Nick Saraev workflow)

After building or modifying any frontend component, run the screenshot-compare loop:

### The Loop
1. **Build** — Implement the component
2. **Screenshot** — Take Playwright screenshots at 3 breakpoints: 375px (mobile), 768px (tablet), 1440px (desktop)
3. **Compare** — Compare to admin dashboard reference for consistency (fonts, colors, spacing, theme token usage)
4. **Fix** — Fix any mismatches identified
5. **Re-screenshot** — Verify fixes
6. **Ship** — When visual parity achieved

### When to Run
- **Always** after creating or rebuilding a page/component
- **Always** after theme changes
- **Recommended** after responsive adjustments

### Reference Screenshots
- Admin dashboard is the gold standard — all other dashboards must match its visual language
- Store reference screenshots in `tests/screenshots/references/` (gitignored)
- Naming: `{page}-{breakpoint}w-{variant}.png` (e.g., `trainer-dashboard-375w-dark.png`)
