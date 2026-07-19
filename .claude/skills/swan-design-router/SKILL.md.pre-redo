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
- If either reference-library path is not present at runtime, the router falls back to CLAUDE.md + SWAN-CINEMATIC-DESIGN-SYSTEM.md alone and reports the missing reference explicitly in the task thread rather than silently degrading.

## Load order (authoritative)
1. **`docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`** — stack truth, page-level narrative arc (B2), visual grammar, layout/interaction pattern library (C1-C12), generic-pattern bans
2. **`docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`** — asset archetypes, emotional jobs, per-section rules, Seedance 2.0 prompt templates
3. **`CLAUDE.md`** — rules 1-11 (stack + WCAG + palette + charts), 22-25 (premium + responsive + motion), 26-27 (surface receipts), 40-41 (design + closeout routing)
4. **`docs/ai-workflow/design-brain/index.md`** — the Design Brain (rule 40, added 2026-07-03). `design.md` is canonical; `design.html` is its visual mirror and design.md wins on any conflict. Load `design.md` plus only the topic files the task needs (`motion.md`, `components.md`, `anti-patterns.md`, `qa-gates.md`, `website-archetypes.md`, `cinematic-pages.md`, `external-reference-mcp.md`, the matching `adapters/` file). Query the World Engine progressively: read `worlds.md` metadata first; load full world entries only after suitability filtering; load `techniques.md`, `psychology.md`, and `experience-mode.md` only when the selected licence or WFX IDs require them. The Design Brain is **subordinate** to SWAN-CINEMATIC-DESIGN-SYSTEM.md — on any conflict, item 1 wins. Adapters never coin tokens; semantic colors are success=Ice Wing / warn=Gilded Fern / info=Swan Lavender / danger=#E5484D.
5. **`.agents/skills/frontend-design/SKILL.md`** — reference only, for implementation constraint language (accessibility, responsiveness, anti-generic). Router borrows language, router does not delegate arbitration.
6. **`.agents/skills/ui-ux-pro-max/SKILL.md`** — reference only, for style-space and option generation. Router borrows breadth, router rejects Tailwind-biased suggestions.

If `docs/ai-workflow/design-brain/` is missing at runtime, fall back to items 1-3 and report the missing Design Brain explicitly in the task thread rather than silently degrading (same policy as the reference libraries).

For net-new pages, major redesigns, Fable/Village design implementation, or Sean-requested reference-backed work, complete the receipt in `external-reference-mcp.md` before proposing directions. If no connector is callable, record `[MOBBIN UNAVAILABLE]` and proceed from Swan's canonical docs. Small polish, bugfix, and backend-only work may mark the gate not applicable.

If any of files 1-2 are missing or older than the current CLAUDE.md active palette, stop and notify Sean before proceeding — the design base is out of sync.

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

WORLD ID: [stable ID from worlds.md, or NONE for M0-M3 product work]
WORLD CATALOG VERSION: [version/date from worlds.md]
SELECTION SEED: [recorded deterministic seed, or MANUAL]
PALETTE LAW: [A Swan-native | B world-native non-Swan]
EXPERIENCE LICENCE: [M0 | M1 | M2 | M3 | M4]
WFX SET: [WFX-01...WFX-13 IDs actually proposed]
PSYCHOLOGY HYPOTHESES: [PSY IDs, evidence signals, and falsifiers]
RENDER BACKENDS: [B0 semantic/poster | B1 CSS/media | B2 WebGL2 | B3 WebGPU experimental]

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

MOTION BUDGET: [M0 restrained | M1 expressive | M2 cinematic-section | M3 launch-cinema | M4 experience]
RUNTIME QUALITY: [Full | Lean | Still; Reduced Motion is an accessibility override, not a quality tier]

WHY IT FITS THE PAGE STORY: [2-3 sentences naming what this direction does that the other directions do not]

WHY IT COULD BE WRONG: [one explicit tradeoff or risk — "heavier on motion, may not preserve the Lean/Still story", "asset-heavy, requires Seedance run first", etc.]
```

### Rules for the 2-3 directions
1. **They must be meaningfully different.** Three variations of the same hero pattern with different palettes is not three directions. Three directions must disagree about the *story structure*, *pattern stack*, or *signature moment*.
2. **At least one must be on the more restrained side.** Do not present three maximalist directions. One of the 2-3 must be lower-motion, lower-asset-weight, faster-to-ship — so Sean has a real tradeoff space.
3. **At least one must use Act 1's emotional target of "awe"** (for marketing) or "orientation clarity" (for dashboards). The opening beat is where Swan wins or loses the user.
4. **No direction may violate CLAUDE.md rules 1-11, 22-25, or the Dual-Button Glow rule.** All three must be valid Swan directions.
5. **Each direction must be implementable end-to-end.** Do not present an exploratory fragment as a concept direction. If it cannot be built with the existing pattern library (C1-C12), name the new pattern it would require.

### World roulette and M4 routing
World selection is suitability-filtered before it is random. Filter by surface licence, audience, content density, emotional job, proof/action needs, asset availability, and runtime budget. Then run the exact `world-roulette.v1` algorithm in `worlds.md` with its NFC/UTF-8 seed, SHA-256 rejection sampling, ASCII sorting, recent-use rules, family balancing, tie-break, and replay receipt. Substituting a platform PRNG or merely recording a different algorithm is rejected.

- **M0-M3 product surfaces:** `WORLD ID: NONE` unless a world contributes only a static, pausable, prerecorded M2 preview that obeys the host product licence. Live M4 runtimes are refused.
- **M4-eligible non-product surfaces:** marketing pages, launch campaigns, brand films, editorial experiments, and approved showcase galleries may promote M4 to the host licence after explicit Sean approval.
- **Palette Law A:** Swan-native; canonical Crystalline Swan tokens remain authoritative.
- **Palette Law B:** world-native non-Swan; the output must not be branded or represented as a Swan product surface.
- **Accessibility:** B0 is always present. Still mode, Pause Effects, semantic navigation, and the primary action cannot depend on canvas meaning.
- **Evidence:** record the world catalog version, selection seed, WFX set, render backends, PSY hypotheses, and outcome signals in the direction receipt.

If no world survives the filters, use no world. The catalog is a creative option space, not a requirement to force spectacle into every surface.

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
EXTERNAL REFERENCE RECEIPT: [link/hash/reference, or MOBBIN UNAVAILABLE / N-A with reason]
WORLD RECEIPT: [world ID + catalog version + seed, or NONE]
PALETTE LAW: [A Swan-native | B world-native non-Swan]
EXPERIENCE LICENCE: [M0-M4]
WFX / PSY RECEIPT: [IDs + measurable hypotheses/falsifiers, or N-A]
RENDER LADDER: B0 [semantic/poster] | B1 [CSS/media] | B2 [WebGL2] | B3 [WebGPU experimental or N-A]
RUNTIME MODES: Full | Lean | Still | Reduced Motion override
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
- styled-components-first, CSS Grid + Flexbox composition, Framer Motion default, GSAP only when scroll choreography genuinely benefits. For M0-M3, R3F remains limited to small surgical moments with `<Suspense>` and B0/B1 fallbacks. M4 may license a broader experience runtime only through `experience-mode.md`; it never changes the host licence automatically.
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
17. **Live M4 on product or Hermes operations surfaces** - rejected; only static or pausable prerecorded previews may appear under the host's M0-M3 licence
18. **Law B output branded as Swan** - rejected; world-native non-Swan palettes cannot masquerade as Swan product surfaces
19. **Canvas-only meaning or action** - rejected; B0 semantic structure and the primary action must survive every renderer failure
20. **WebGPU-only delivery** - rejected; B3 is experimental enhancement and must have a tested B2 or B1 fallback

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

## Asset flow (when a task needs generated media)
1. Identify the section type (C1-C12)
2. Identify the emotional job (awe/trust/momentum/calm/aspiration/celebration/intimacy/curiosity)
3. Identify the asset archetype from SWAN-ASSET-STORYBOARDING.md section A (A1-A8)
4. Produce a Seedance brief using the master template (E1) and the matching vertical variant (E2)
5. Include: scene, style, palette (with hex tokens named explicitly), motion, duration, aspect ratio, fallback still description, negative prompts
6. Remind Seedance in the negative prompt to avoid retired Galaxy-Swan tones
7. Document the brief in the task thread for Sean to run through Seedance 2.0
8. Provision Full/Lean/Still in the same surface: Full video where licensed, Lean poster/encoded media, and Still static composition; Reduced Motion removes nonessential movement across all three

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
- **`swan-world-factory`** may batch approved M4 experiments. It is a manual-only thin orchestrator, writes only ignored experiment output, delegates single-site composition to `adapters/cinematic-site-generator.md`, and never promotes output into production

## Non-goals

- This skill does not produce non-visual code
- This skill does not perform route tracing or schema audits — that is `canonical-surface-audit`
- This skill does not perform repo hygiene — that is `repo-hygiene-scan`
- This skill does not write commits
- This skill does not invoke quarantined aesthetic skills without explicit user request
