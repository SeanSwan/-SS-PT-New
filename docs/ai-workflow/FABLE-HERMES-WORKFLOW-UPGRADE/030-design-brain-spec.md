# SwanStudios Design Brain Spec

Date: 2026-07-03
Scope: proposed documentation/design-brain package only. No implementation included.

## Executive Verdict

Do not replace the current Swan design system. Upgrade it into a callable Design Brain.

The current design truth is already strong:

- `SWAN-CINEMATIC-DESIGN-SYSTEM.md` is the active source of truth.
- `SWAN-ASSET-STORYBOARDING.md` is the asset-direction source of truth.
- `swan-design-router` is the only default-exposed design brain.
- `frontend-design`, `ui-ux-pro-max`, and `design-taste-frontend` are subordinate references.

What is missing is a compact, Fable/Hermes-friendly design brain folder that can be read quickly before a UI slice.

## Proposed Folder

Create later:

`docs/ai-workflow/design-brain/`

Proposed files:

1. `README.md`
   - What the design brain is.
   - Load order.
   - When to use it.
   - What it does not override.

2. `design.md`
   - The compact Swan visual operating system.
   - Palette, typography, touch target, motion, chart, and accessibility rules.

3. `design.html`
   - A local reference page with component examples and layout states.
   - Must be static and inspectable without a dev server.

4. `component-patterns.md`
   - Buttons, cards, chart panels, dashboards, drill-down dialogs, command docks, coach cards, forms, approval gates.

5. `motion-and-media.md`
   - Motion tiers, reduced motion, Seedance/asset rules, no generic vector mascot policy.

6. `anti-patterns.md`
   - Tailwind/shadcn drift, Galaxy-Swan drift, over-carded dashboards, fake metrics, hero-style dashboards, cramped mobile cards, hover-only controls.

7. `router-receipt-template.md`
   - Required pre-build receipt:
     - surface
     - role
     - emotional job
     - workflow job
     - data truth
     - pattern family
     - responsive risks
     - source files
     - verification plan

8. `fable-design-review-prompt.md`
   - Paste-ready prompt for Fable to review or generate design direction under Swan rules.

## Load Order

1. `AGENTS.md` / `CLAUDE.md`
2. `ACTIVE-INDEX.md`
3. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
4. `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`
5. `docs/ai-workflow/design-brain/README.md`
6. Relevant design-brain subfile
7. Mounted surface receipt

## Non-Negotiable Rules

- Styled-components only.
- No Material UI.
- No Tailwind for new Swan UI.
- Dark-first.
- 44px minimum touch targets.
- No hardcoded colors without CSS variable fallback.
- Victory for new charts.
- Real data over decorative metrics.
- No retired Galaxy-Swan theme.
- No yoga/meditation language. Use stretching/flexibility.
- Do not use generic SaaS hero layouts for dashboards.
- Do not put cards inside cards.
- Do not hide core controls behind hover-only interactions.
- Verify phone width and Sean monitor-class widths when feasible.

## Design Brain Should Do

- Make Fable/Codex/Claude/Hermes use the same Swan visual language.
- Prevent generic AI design drift.
- Turn broad design prompts into a route-specific surface plan.
- Keep dashboards dense but premium, not landing-page decorative.
- Preserve real workflow depth.
- Capture the "why" behind each visual choice.

## Design Brain Should Not Do

- Override app security.
- Override auth/role scoping.
- Override production stability.
- Override the source-of-truth design docs.
- Generate fake metrics.
- Convert the app to a new framework.
- Create a new design system outside Swan's current tokens.

## Fable Role

Fable should be used as a design synthesis and final-arbitration brain, not as an unsupervised implementer.

Ideal Fable work:

- Compress current design doctrine into the design-brain folder.
- Create 2 to 3 route-specific design directions for major UI surfaces.
- Hostile-review a proposed UI slice against Swan rules.
- Identify where generic design drift has entered the app.

Fable should not:

- Change production code directly without a slice plan.
- Invent a new brand language.
- Bypass `swan-design-router`.
- Approve unsafe data flows because the UI looks good.

## Acceptance Criteria For First Design Brain Slice

- New folder exists with the proposed files.
- No contradiction with `SWAN-CINEMATIC-DESIGN-SYSTEM.md`.
- `ACTIVE-INDEX.md` points to the folder.
- AGENTS/CLAUDE patch proposal references it, but code is not changed until Sean approves.
- One example router receipt is included for a real surface, ideally Client Progress or Coach Command Center.

