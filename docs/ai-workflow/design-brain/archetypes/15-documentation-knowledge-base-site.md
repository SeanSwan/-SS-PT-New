<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 15. Documentation / knowledge-base site

- **Use when:** product docs, help center, internal runbooks surfaced to users. The anti-cinematic archetype: speed of answer IS the design.
- **Feel:** quiet precision; the Fira Code archetype; dark-first library.
- **Arc:** orientation-first (dash-style): Phase 1 = search + top intents; Phase 2 = the answer; Phase 3 = related/deeper; Phase 4 = "did this help" + escalation path. **Hero:** search-first header — search field IS the hero. **Motion:** M0–M1 (affordance transitions only).
- **Sections in order:** search + 4–6 top-intent links (asymmetric weighting by usage, not equal grid) → category tree (left rail desktop / collapsible mobile) → article layout: title, updated-date, TOC, body, code blocks (Fira Code), callouts → footer: helpful?-widget + support escalation.
- **Conversion goal:** answer found fast; deflection from support with satisfaction, not frustration.
- **Trust:** updated-timestamps on every article; honest "this doesn't cover X yet"; versioned accuracy.
- **Mobile:** search sticky; TOC collapses; code blocks scroll horizontally in-container (never page-wide overflow).
- **A11y:** the flagship a11y archetype — full keyboard nav, landmark structure, skip links, heading hierarchy strict, contrast everywhere; this page family should pass audits with zero findings.
- **Components:** `GlassPanel` obsidian variant, search pattern + callout/code-block patterns from `components.md`; NO `SheenCard` sell treatment anywhere.
- **Anti-patterns:** marketing motion in docs; centered narrow-column article text at desktop widths wasting the rail; screenshot-only answers; dead-end 404s without search.
- **Fable brief:** "Docs surface for [product area]. Top 6 user intents: [list]. Directions: search-header composition, category IA, article-template density."
- **Builder brief:** "Direction [n]. Article layout as one template component; search verified against real content index; code blocks with copy buttons; 404 routes to search."
- **Harness QA:**
  - [ ] search returns results
  - [ ] keyboard-only journey to an answer
  - [ ] code block overflow contained at 320px
  - [ ] heading-structure audit
  - [ ] helpful-widget posts
- **Village questions:**
  - Time-to-answer for the top intent?
  - Does IA match how users ask (not how the org is structured)?
  - Stale-content strategy?
