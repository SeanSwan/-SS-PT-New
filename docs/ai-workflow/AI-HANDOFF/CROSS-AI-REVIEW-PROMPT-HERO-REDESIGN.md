# Cross-AI Review Prompt — Full Homepage Redesign Plan

> **Purpose:** Have another AI review the full homepage redesign analysis and enhancement plan before implementation begins.
> **What to review:** `docs/ai-workflow/AI-HANDOFF/HERO-REDESIGN-ANALYSIS.md`

---

## Context for Reviewer

You are reviewing a **full production homepage enhancement plan** for SwanStudios (sswanstudios.com), a personal training SaaS platform. The plan proposes to upgrade **all 10 homepage sections** with the Ethereal Wilderness theme:

**Hero Section:**
- Video background (tropical Waves.mp4)
- Floating bioluminescent orbs (anime mystic forest aesthetic)
- Mist/cloud atmospheric layers
- Faint cyberpunk grid overlay
- Logo upgrade from PNG to SVG
- Typography upgrade (Cormorant Garamond + Source Sans 3)
- 10-breakpoint responsive matrix

**All Other Sections (Programs, Features, Creative, Trainers, Testimonials, Stats, Instagram, Newsletter):**
- Cormorant Garamond + Source Sans 3 typography throughout
- Ethereal Wilderness color palette replacing hardcoded colors
- Glass-morphism surfaces, mist/orb atmospheric effects
- Premium luxury copy upgrades for every section
- V1ThemeBridge removal
- Icon library consolidation (react-icons/fa → lucide-react)
- Route path audit for broken links

The owner wants the site to feel like **"digital nature that looks organically real"** — luxury, organic, premium polish for wealthy clients ages 16-80.

---

## Required Reading (in order)

### 1. The Plan Under Review
```
docs/ai-workflow/AI-HANDOFF/HERO-REDESIGN-ANALYSIS.md
```

### 2. Project Rules & Constraints
```
CLAUDE.md                                          — Project conventions, build commands, theme tokens
docs/ai-workflow/SWANSTUDIOS-UI-REDESIGN-MASTER-PROMPT.md — Design philosophy, KPIs, fail gates
```

### 3. Design Skills & Protocols
```
.claude/skills/frontend-design/                    — Design quality guidelines, anti-slop rules
.claude/skills/ui-ux-pro-max/                      — Design intelligence DB (styles, palettes, font pairings, UX rules, chart types). Run `python3 skills/ui-ux-pro-max/scripts/search.py --help` to query.
```

### 4. Existing Theme Reference
```
frontend/src/pages/DesignPlayground/concepts/EtherealWilderness/EtherealWildernessTheme.ts — Dark/light palettes
frontend/src/styles/galaxy-swan-theme.ts           — Current production theme tokens
frontend/src/components/ui/buttons/GlowButton.tsx  — Button component (don't modify)
```

### 5. Current Hero Implementation
```
frontend/src/pages/HomePage/components/Hero-Section.V2.tsx   — CURRENT production hero
frontend/src/pages/HomePage/components/Hero-Section.tsx      — V1 legacy (video reference)
frontend/src/pages/HomePage/components/HomePage.V2.component.tsx — Page structure
```

### 6. Cross-AI Review Format
```
docs/ai-workflow/AI-REVIEW-TEAM-PROMPT.md          — Review template, severity table
```

---

## Visual Inspection (MCP Playwright)

If you have access to the Playwright MCP server, inspect the live site:

```
URL: https://sswanstudios.com
```

### Screenshots to Capture
1. Hero at 375px (mobile) — check logo, title, CTA spacing
2. Hero at 768px (tablet) — check banner + hero balance
3. Hero at 1280px (desktop) — check overall composition
4. Hero at 1920px (large) — check scaling

### Video Assets to Preview
- `https://sswanstudios.com/Waves.mp4` — Proposed hero video (tropical turquoise)
- `https://sswanstudios.com/swan.mp4` — Alternative (alpine swans, portrait)
- `https://sswanstudios.com/Swans.mp4` — Alternative (dark moody water, landscape)

---

## Review Checklist

### A. Design Quality
- [ ] Does the plan avoid "AI slop" (generic gradients, cookie-cutter patterns)?
- [ ] Is the aesthetic coherent? (Nature + Luxury + Galaxy-Swan blend)
- [ ] Will floating orbs look premium or gimmicky at the proposed sizes/counts?
- [ ] Is the video overlay dark enough for text readability over moving video?
- [ ] Will Cormorant Garamond + Source Sans 3 pair well with GlowButton's Inter?
- [ ] Does the "smidge of cyberpunk" grid risk feeling incongruent with nature theme?

### B. Accessibility
- [ ] Are `prefers-reduced-motion` provisions complete?
- [ ] Will text contrast meet 4.5:1 over video backgrounds?
- [ ] Are touch targets maintained at 44px minimum?
- [ ] Is the video `muted` and `playsInline` (no autoplay audio)?
- [ ] Does the gradient-only mobile fallback (no `<video>` in DOM) provide equivalent visual information?

### C. Performance
- [ ] Is 7.2MB video acceptable for desktop load? (vs current 0KB video)
- [ ] Is the mobile strategy sound? (no `<video>` element rendered, conditional via `useMediaQuery`)
- [ ] Will 10-16 orb CSS animations cause paint/composite issues?
- [ ] Does switching from 795KB PNG to 4.4KB SVG improve LCP?
- [ ] Are `will-change` properties used appropriately (not overused)?

### D. Responsive Design
- [ ] Does the 10-breakpoint matrix cover edge cases?
- [ ] Is the logo `clamp()` strategy sufficient? (vs discrete breakpoints)
- [ ] Will orb count scaling (4→16) feel natural or jarring at transitions?
- [ ] Is the video hidden on mobile a good UX decision?

### E. Scope & Risk
- [ ] Is the 10-file modification plan realistic and well-ordered?
- [ ] Are there hidden dependencies (font loading, video preload, etc.)?
- [ ] Will V1ThemeBridge removal cause visual regressions?
- [ ] Is the section-by-section implementation order sound?
- [ ] Is the performance budget realistic given 10 sections changing?
- [ ] Any risks to monetization flows (checkout, booking)?
- [ ] Are the proposed copy changes tonally consistent across all sections?

### F. Missing Items
- [ ] Should there be a fallback for video load failure?
- [ ] Should the banner notification be addressed? (takes hero space)
- [ ] Is there a plan for the scroll indicator from V1?
- [ ] Should the title copy change? ("Forge Your Body, Free Your Spirit" vs Ethereal Wilderness "Train in Harmony with Nature")
- [ ] Dark/light toggle — should it be included or deferred?
- [ ] Trainer photos are Logo.png placeholders — should real photos be required before launch?
- [ ] .jsx → .tsx conversion for NewsletterSignup — any typing issues anticipated?
- [ ] react-icons/fa → lucide-react migration — will this affect bundle size?
- [ ] Feature linkTo routes (/services/*) — do these routes exist or need fallbacks?

---

## Review Output Format

Use this structure for your review:

```markdown
## Hero Redesign Plan Review — [Your AI Name]

### Overall Assessment
[1-2 sentences: is this plan sound, risky, or needs rework?]

### Severity Table
| # | Severity | Category | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Critical/High/Medium/Low | Design/A11y/Perf/Scope | ... | ... |

### Strengths
- ...

### Concerns
- ...

### Missing Controls
- ...

### Recommended Changes Before Implementation
1. ...
2. ...

### Verdict
[ ] Approve as-is
[ ] Approve with minor changes
[ ] Needs revision before implementation
[ ] Reject — fundamental issues
```

---

## Post-Review Workflow

1. Review findings are incorporated into the plan
2. Revised plan gets final owner approval
3. Implementation begins (Hero-Section.V2.tsx only)
4. Playwright before/after screenshots at all 10 breakpoints
5. Build verification + no-regression check
6. Commit, push, verify on production
