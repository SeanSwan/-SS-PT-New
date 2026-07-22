---
name: swan-design-router
description: The only default-exposed design brain for SwanStudios. Routes all UI/visual work through the Swan Cinematic Design System and Asset Storyboarding source-of-truth docs. Enforces styled-components-first, Crystalline Swan palette, Dual-Button Glow rule, and anti-template discipline. Use for any component build, page design, redesign, or visual audit. Also handles Seedance 2.0 asset brief generation. Invoke at the start of any task that creates or modifies visible UI.
---

# Swan Design Router

**Role:** strict-model single default design brain for SS-PT. This is the ONLY skill that should auto-steer design work. All other design skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are explicit-invocation-only.

## Strict-model architecture (Phase 3 landed 2026-04-12)

**Default-exposed design surface = `swan-design-router` ONLY.**

As of Phase 3:
- `.claude/skills/` does **not** contain `frontend-design` or `ui-ux-pro-max`. Their former junction entries have been removed from the default-exposed surface.
- The canonical source locations for both are at `.agents/skills/`. This router loads them **by file path** from there.
- The 8 quarantined aesthetic/review skills have been relocated to `archive/quarantined-skills/2026-04-12/` and are no longer on the default-exposed surface. They remain reversible via `git mv` back.
- If either reference-library path is not present at runtime, the router continues with the already-loaded authoritative sources and reports the missing reference explicitly in the task thread rather than silently degrading. This fallback never overrides the stop condition for missing or stale source-of-truth files in load-order items 1-2.

## Load order (authoritative)

1. **`docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`** — stack truth, page-level narrative arc (B2), visual grammar, layout/interaction pattern library (C1-C12), generic-pattern bans
2. **`docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`** — asset archetypes, emotional jobs, per-section rules, Seedance 2.0 prompt templates
3. **`CLAUDE.md`** — rules 1-11 (stack + WCAG + palette + charts), 22-25 (premium + responsive + motion), 26-27 (surface receipts), 40-41 (design + closeout routing)
4. **`docs/ai-workflow/design-brain/index.md`** — the Design Brain (rule 40, added 2026-07-03). `design.md` is canonical; `design.html` is its visual mirror and design.md wins on any conflict. Load `design.md` plus only the topic files the task needs (`motion.md`, `components.md`, `anti-patterns.md`, `qa-gates.md`, `website-archetypes.md`, `cinematic-pages.md`, `external-reference-mcp.md` for Mobbin/Mobbin-like research, the matching `adapters/` file). The Design Brain is **subordinate** to SWAN-CINEMATIC-DESIGN-SYSTEM.md — on any conflict, item 1 wins. Adapters never coin tokens; semantic colors are success=Ice Wing / warn=Gilded Fern / info=Swan Lavender / danger=#E5484D.
5. **`.agents/skills/frontend-design/SKILL.md`** — reference only, for implementation constraint language (accessibility, responsiveness, anti-generic). Router borrows language, router does not delegate arbitration.
6. **`.agents/skills/ui-ux-pro-max/SKILL.md`** — reference only, for style-space and option generation. Router borrows breadth, router rejects Tailwind-biased suggestions.

Fallback precedence is deterministic:
- If item 1 or item 2 is missing, unreadable, or older than the current `CLAUDE.md` active palette, stop and notify Sean before proceeding. The design base is out of sync, and no lower-priority fallback may continue the task.
- If item 4 (`docs/ai-workflow/design-brain/`) is missing or unavailable while items 1-3 are valid, proceed from items 1-3 and report the missing Design Brain explicitly in the task thread.
- If item 5 or item 6 is missing or unavailable while items 1-4 are valid, proceed from the loaded authoritative sources and report the missing reference library explicitly in the task thread.

## External reference intake - Mobbin/Mobbin-like MCP

For net-new pages, major redesigns, Fable/Village design-implementation slices, or any prompt asking for modern UI references, run `docs/ai-workflow/design-brain/external-reference-mcp.md` before the concept-direction gate. First check whether a Mobbin/Mobbin-like connector is callable. If it is callable, use `search screens`, `search flows`, and `search sections` as appropriate, produce the external-reference receipt, then translate the extracted principles into Swan B2/C-pattern language.

If the connector is not callable in the current client, write `[MOBBIN UNAVAILABLE]` in the receipt and proceed from Swan source docs. Small polish, bugfix, and backend-only tasks can mark the gate not applicable. Never commit MCP connector URLs, OAuth URLs, screenshots, tokens, or copied external UI. External references are inputs; `SWAN-CINEMATIC-DESIGN-SYSTEM.md` still wins every conflict.

### Two aesthetic lanes — Mobbin is NOT the ceiling

Mobbin (and Mobbin-like real-product reference) is the lane for **conventional app-UI** — dashboards, forms, flows, settings, portals: the surfaces where the job is *task completion* and the win is convention done crisply. Do not expect Mobbin to make a surface feel *magical* — that was never its job, and mistaking it for the taste ceiling is why conventional-reference-driven work can feel "fine but not special."

The **higher aesthetic ceiling** for hero/landing/showcase/brand surfaces — the surfaces whose job is *awe* — is the **Extreme Macro-Journey grammar (§B2.4)** and the **C13 scroll-bound macro-journey** pattern, produced via `cinematic-pages.md`. When a surface's job is to make a stranger stop breathing, steer to that lane, not to Mobbin. Two lanes, no conflict: Mobbin for the working surfaces, the cinematic-journey tier for the awe surfaces. A surface can even use both (a cinematic Act-1 hook over a Mobbin-crisp conversion section below).

## Ideation gate — 2-3 concept directions before coding (MANDATORY for net-new surfaces and major redesigns)

Before writing any styled-components for a **net-new page, new surface, or major redesign**, produce 2-3 distinct concept directions in the task thread. Sean steers which one becomes the implementation. This is the ideation gate — Sean's first look at the design, before any file is touched.

### When the ideation gate applies
- New marketing pages or landing pages
- New dashboard pages or new dashboard sections that occupy >50% of a surface
- Any redesign of an existing surface where the visual direction may change
- Any surface build where Sean has not already approved a direction

### When the ideation gate can be skipped (small polish tasks)
- Typo fixes
- Single-property CSS adjustments (color, spacing, one radius)
- Single-component bug fixes (chart NaN error, mapper shape correction)
- Work explicitly scoped as "do this specific fix, do not redesign"
- Any task where Sean has already explicitly named the direction

If in doubt, run the gate. The cost of running it is one paragraph per concept. The cost of skipping it on something that needed it is a redesigned page Sean did not ask for.

### Mandatory output for the ideation gate

Produce 2-3 concept directions, each with this exact structure:

```
=== CONCEPT DIRECTION [N] ===

NAME: [short evocative name — e.g. "Glacier Cathedral" or "Rainforest Ledger"]

PAGE STORY ARC: [from SWAN-CINEMATIC-DESIGN-SYSTEM.md B2]
  - Act 1: [what act 1 feels like in this direction]
  - Act 2: [what act 2 feels like in this direction]
  - Act 3: [what act 3 feels like in this direction]
  - Act 4: [what act 4 feels like in this direction]
  (for dashboards, use the 4-phase arc: orientation / current state / progress-insight / next-best-action)

SECTION PATTERN STACK:
  Act 1 → [C1/C4/etc.]
  Act 2 → [C3/C6/C8/etc.]
  Act 3 → [C2/C5/C9/etc.]
  Act 4 → [C7/C10/etc.]

EMOTIONAL JOBS PER ACT:
  Act 1 → [awe/curiosity/etc.]
  Act 2 → [trust/curiosity/etc.]
  Act 3 → [momentum/aspiration/etc.]
  Act 4 → [celebration/intimacy/etc.]

SIGNATURE MOMENT: [the one memorable visual move this direction is built around]

ASSET TYPE NEEDED:
  [A1 video loop / A2 scroll-scrubbed sequence / A3 hero still / A4 carousel / A5 illustration / A6 3D / A7 letterform-embedded / A8 chart-as-narrative]
  per act or per section as appropriate

MOTION TIER: [tier-1 full cinema / tier-2 lean / tier-3 reduced — pick baseline expectation]

WHY IT FITS THE PAGE STORY: [2-3 sentences naming what this direction does that the other directions do not]

WHY IT COULD BE WRONG: [one explicit tradeoff or risk — "heavier on motion, may not land on tier-3", "asset-heavy, requires Seedance run first", etc.]
```

### Breadth pass before the directions (net-new AWE surfaces — marketing/showcase/brand)

For a net-new marketing/showcase/brand surface whose Act-1 job is **awe**, and where the concept space is still open (Sean has not already handed a concept), run the **concept-breadth pass** BEFORE developing the 2-3 directions (full doctrine: `cinematic-pages.md` §18):

1. Generate **8-12 radically different awe concepts** — each one line, most in the `inside → through → across → out` shape (SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), but **at least 3 must be non-macro or use a sanctioned variant** (reverse journey / orbit / time-lapse metamorphosis / human-scale transformation) — a field of 12 identical macro-journeys is breadth theater, one concept twelve times. Radically different = different object/scale/strategy, not palette swaps; two concepts sharing the same starting object count as one.
2. Every concept must resolve to real Swan brand meaning AND contain a brand-ownable object (swan anatomy, wing geometry, Crystalline refraction, the vault, real training detail) — breadth is over *worlds*, not over whether it's on-brand, and an abstract-particle journey with a logo at the end is rejected.
3. Present the field **ranked, with a one-line "why this could win" per concept** — then let Sean's taste cut it to the 2-3 worth developing. Do NOT silently pick; surface the field so the human's taste is the selector (ideas are cheap for the model, taste is the human's job).
4. The surviving 2-3 become the full concept directions below.

Skip the breadth pass when: the surface is a working/dashboard surface (awe is not its job), or Sean already handed a concept (develop his directly). This is the front of the ideation gate, not a replacement for it.

**On C13 (the whole-page scroll-film): the default answer is NO.** C13 is maximalist and highest-risk — the risk is *premature* use. Offer a full C13 direction only when awe is the entire job, there is exactly one CTA, and Sean has (or will) sign off on a §18 breadth pass + Seedance budget. Absent that, the awe hook is C1/C3 (video-as-accent Act-1), not a whole-page scrub. Scarcity keeps C13 premium.

### Rules for the 2-3 directions

1. **They must be meaningfully different.** Three variations of the same hero pattern with different palettes is not three directions. Three directions must disagree about the *story structure*, *pattern stack*, or *signature moment*.
2. **At least one must be on the more restrained side.** Do not present three maximalist directions. One of the 2-3 must be lower-motion, lower-asset-weight, faster-to-ship — so Sean has a real tradeoff space.
3. **At least one must use Act 1's emotional target of "awe"** (for marketing) or "orientation clarity" (for dashboards). The opening beat is where Swan wins or loses the user.
   - **For marketing/showcase/brand surfaces, at least one direction's awe hook must be an Extreme Macro-Journey** (SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4) with its four beats (inside/through/across/out) named explicitly. Awe is not left to chance. If the surface warrants the maximalist treatment, one direction may be a full **C13 Scroll-Bound Macro Journey** (the creative IS the page) — flag it as the higher-effort/higher-ceiling option with its 60fps-scrub + tour-mode gates called out.
4. **No direction may violate CLAUDE.md rules 1-11, 22-25, or the Dual-Button Glow rule.** All three must be valid Swan directions.
5. **Each direction must be implementable end-to-end.** Do not present an exploratory fragment as a concept direction. If it cannot be built with the existing pattern library (C1-C12), name the new pattern it would require.

### After Sean picks a direction

Once Sean responds with "go with direction 2" (or similar):
- Echo back which direction he picked and which he rejected
- Produce the mandatory pre-task receipt (below) for the chosen direction only
- Then implementation may begin

If Sean asks for a hybrid ("take the shelf pattern from direction 1 but the dashboard arc from direction 3"), produce a fourth combined direction and wait for explicit sign-off on that one before coding.

### Do not skip the gate under time pressure

The existence of this gate is the single strongest tool against "Claude built something Sean did not actually want." Running it costs 5 minutes of planning. Skipping it costs a redesign.

---

## Mandatory pre-task receipt

Before writing any design code, produce a mini-receipt in the task thread:

```
SURFACE: [component name or page path]
SECTION TYPE: [C1-C12 from pattern library]
EMOTIONAL JOB: [awe|trust|momentum|calm|aspiration|celebration|intimacy|curiosity]
SIGNATURE MOMENT: [the one memorable visual move this section gets]
STACK CHECK: styled-components-first confirmed | Victory for any chart | no Tailwind
PALETTE CHECK: Crystalline Swan tokens only | no Galaxy-Swan | Dual-Button Glow if buttons present
FALLBACK TIERS: tier-1 [full cinema] | tier-2 [lean] | tier-3 [reduced-motion]
ASSETS NEEDED: [Seedance brief required? Y/N — if Y, produce brief per SWAN-ASSET-STORYBOARDING.md E1-E2]
```

No design code before this receipt.

## 2026 surface standard (hard gate)

Before implementation, every major UI/redesign task must pass this gate in the task thread. If any item is unknown, inspect the live surface before coding.

```
PRIMARY JOB: [one sentence: what the user came here to finish]
PRIMARY ACTION: [the one action that should be most visually and functionally prominent]
SECONDARY ACTIONS: [max 3 visible priority actions; extras move to menu/drawer/toolbar; each must execute, navigate, open a real detail surface, or toggle state]
DEAD-CONTROL SWEEP: [Y/N - every button/icon/tab has a wired handler, route, or state change]
DESKTOP SCALE PLAN: [how 1440, 1920, 2560/4K avoid tiny centered islands]
SCROLL MODEL: [one page scroll | one panel scroll | justified nested scroll; name sticky regions]
MOBILE COLLISION PLAN: [tabs/actions wrap, scroll, collapse, or become menu; no overlap]
REAL-DATA STRESS CASE: [longest labels, empty state, error state, high count, low count]
```

Hard rules:
- Dashboard content must use monitor-class space intentionally. On 2560px+ widths, do not leave the primary task trapped in a small low-density island unless the surrounding canvas has a real information job.
- Primary dashboard body text must remain readable at desktop scale: normal labels generally 15-18px, key status 18-28px, hero/decision copy larger. Do not solve density by shrinking text below professional operator-console readability.
- One primary scroll owner per region. Nested scrollbars are rejected unless the inner scroll is a deliberate virtualized list, transcript, code/log panel, or table with a stated reason and tested wheel/touch behavior.
- Every interactive element must have a purpose. Buttons without handlers, routes, state transitions, or disabled explanations are removed or rendered as plain status text.
- Tabs and segmented controls must preserve 44px targets and cannot depend on a single no-wrap row on mobile. Use wrap, horizontal scroll with snap, or an overflow/menu pattern.
- Cards must not clip their own content at common data lengths. If equal-height cards are used, lock the grid rhythm with min/max constraints and test long labels; if content meaning differs, use intentional hierarchy instead of false uniformity.
- A "premium" dashboard is not more chrome. It is clear information architecture, crisp scale, disciplined actions, responsive states, and one memorable visual decision.

## Swan binding rules this router enforces

### Palette (from CLAUDE.md)
- Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0` (**data-only, not buttons/glow**), Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Obsidian Black `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`
- Retired, **banned**: Galaxy-Swan `#0a0a1a`, `#00FFFF`, `#7851A9`

### Dual-Button Glow rule (mandatory)
- Blue bg → Purple glow
- Purple bg → Cyan glow
- Any library suggestion that conflicts (including `design-taste-frontend`'s LILA BAN) is **rejected**, not adapted

### Typography
- Plus Jakarta Sans (headings/UI), Cormorant Garamond Italic (drama/editorial), Fira Code (data/code), Sora (gaming-adjacent UI)
- Never Inter/Roboto/Arial/Helvetica as display faces

### Stack
- styled-components-first, CSS Grid + Flexbox composition, Framer Motion default, GSAP only when scroll choreography genuinely benefits, R3F only for small surgical moments with `<Suspense>` fallback
- No Tailwind classes in new code. When `ui-ux-pro-max` suggests a Tailwind idiom, translate it to styled-components idiom or reject it.
- No MUI (CLAUDE.md rule 1)
- Victory only for charts (rule 10)

### Composition discipline
- Grid must break — no `grid-template-columns: repeat(4, 1fr)` as default
- One signature moment per section
- Asymmetry > symmetry
- Editorial hierarchy: headlines 64-120px, stats 96-160px, body 16-18px
- 10 explicit bans from SWAN-CINEMATIC-DESIGN-SYSTEM.md section B — apply all

## When the router says no

The router actively rejects these outputs even if an underlying reference library suggests them:

1. **Equal 4-up box grid as the default layout** — rejected, require asymmetry or shelf/editions pattern (C5)
2. **Empty hero with centered heading + 2 buttons + abstract blob** — rejected, every hero needs a media surface co-lead (C1)
3. **KPI row without media anchors** — rejected, use C9 media-first KPI block
4. **Generic chart cards with identical framing** — rejected, use C11 premium dashboard chart environment
5. **Tailwind class strings in styled-components files** — rejected, rewrite as styled-components composition
6. **Centered everything for every section in sequence** — rejected, break the cadence with left-aligned editorial moments
7. **Stock photography for full-bleed backgrounds** — rejected, require Seedance-generated asset aligned to the page's story
8. **Decorative motion without an information job** — rejected, every motion beat must communicate
9. **Galaxy-Swan color tokens** — hard rejected, retired theme
10. **Purple button glow banned by LILA BAN** — rejected, Dual-Button Glow rule wins
11. **Tiny desktop command centers** - rejected when 4K/fullscreen turns the workflow into a miniature widget with empty dead space around it
12. **Nested scrollbar mazes** - rejected unless each scroll container has a named job and was wheel/touch tested
13. **Dead or vague controls** - rejected; every button must do something concrete or be removed
14. **Mobile tab collisions** - rejected; tabs/actions must wrap, scroll, collapse, or overflow without overlap
15. **Equal-card cargo culting** - rejected when uniform cards hide hierarchy, clip content, or create fake parity between unlike items
16. **Unreadable operator density** - rejected when primary dashboard labels, status text, or actions are too small to read comfortably on QHD/4K

## Pattern library (C1-C12 quick reference)

Full definitions in SWAN-CINEMATIC-DESIGN-SYSTEM.md section C. Quick reference:

| Pattern | When to use |
|---|---|
| C1 Cinematic hero + video header | top-of-funnel declaration |
| C2 Parallax story section | mid-page story beats (60-70% scroll) |
| C3 Sticky foreground / changing background | 3-5 feature explanation |
| C4 Embedded-media wordmark/letterform | signature brand moment |
| C5 Shelf / editions / poster wall | storefront, content library, lineups |
| C6 Flippable detail card | front/back content pairs |
| C7 Hover tilt / depth card | gallery grids, storefront |
| C8 Clustered / orbiting media nodes | feature discovery, "what can Swan do" |
| C9 Media-first KPI / counter block | impact sections, about pages |
| C10 Narrative section divider | every major section boundary |
| C11 Premium dashboard chart environment | every Victory chart in dashboards |
| C12 Subtle electric / glass panel system | underlying card/modal/drawer treatment |
| C13 Scroll-bound macro journey (creative IS the page) | one flagship pure-awe surface; scroll drives the video playhead — governed by cinematic-pages.md §8, gates: 60fps scrub + tour mode |

## Asset flow (when a task needs generated media)

1. Identify the section type (C1-C12)
2. Identify the emotional job (awe/trust/momentum/calm/aspiration/celebration/intimacy/curiosity)
3. Identify the asset archetype from SWAN-ASSET-STORYBOARDING.md section A (A1-A8)
4. Produce a Seedance brief using the master template (E1) and the matching vertical variant (E2)
5. Include: scene, style, palette (with hex tokens named explicitly), motion, duration, aspect ratio, fallback still description, negative prompts
6. Remind Seedance in the negative prompt to avoid retired Galaxy-Swan tones
7. Document the brief in the task thread for Sean to run through Seedance 2.0
8. Provision fallback tiers (tier-2 still, tier-3 CSS gradient) in the same component as the tier-1 video

## Responsive audit matrix (required before closeout)

Per CLAUDE.md rule 24, verify layouts at:
- `320px` minimum handset
- `375px` small iPhone
- `414px` iPhone XR / Plus-class portrait
- `768px` tablet portrait
- `1024px` tablet landscape / small laptop
- `1280px` laptop
- `1440px` desktop
- `1920px` 1080p desktop
- `2560px` QHD / scaled 4K
- `3840px` native 4K when Sean reports fullscreen/4K defects or when a dashboard/command center is redesigned
- `3440px` ultrawide

## Dual-pass design critique (required, CLAUDE.md rule 23)

After the first-pass build, run the hostile design critique checklist from CLAUDE.md's Premium Design Critique Loop before declaring the task complete:
- generic/template feel
- weak hierarchy or unclear CTA
- inconsistent spacing rhythm
- cheap-looking shadows, borders, or icon treatment
- flat backgrounds with no depth or atmosphere
- unreadable density or squeeze on mobile
- motion that feels dead, noisy, or excessive
- weak contrast or muddy dark-mode presentation
- acceptable-but-not-premium components
- 2026 surface gate failures: tiny 4K scale, inert controls, nested scroll traps, mobile tab collisions, clipped cards, fake equal-card grids

Fix the weakest areas before closeout. Report what was improved and which viewport widths were actually checked.

## Interaction with other Swan skills

- **`swan-orchestrator`** may call this router as part of task dispatch
- **`canonical-surface-audit`** may be called before this router if the task is to fix an existing surface (rule 26 receipt first, design work second)
- **`closeout-evidence-lock`** runs at the end of every task that used this router, to enforce the claim-to-evidence lock and the dual-pass design critique

## Non-goals

- This skill does not produce non-visual code
- This skill does not perform route tracing or schema audits — that is `canonical-surface-audit`
- This skill does not perform repo hygiene — that is `repo-hygiene-scan`
- This skill does not write commits
- This skill does not invoke quarantined aesthetic skills without explicit user request
