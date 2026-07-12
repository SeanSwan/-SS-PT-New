# Style Lens OS Expansion Override and Implementation Plan — 2026-07-11

## Decision receipt

Sean replied `continue` twice after being offered exactly two choices: preserve the hard stop for another adjudication, or explicitly override and proceed. The corrected Fable run accepted the evidence record and repeated that Sean may override. This document records the repeated instruction as the expansion override. It does not authorize `main` or Render.

## Architecture

The existing route tree, dashboard shell, workout state, and authorization remain mounted. A lens commit changes validated root attributes and scoped CSS variables only.

Data flow:

`Appearance Studio pending profile -> validate against registry -> explicit Apply -> root attributes -> save bounded v1 envelope -> storage-event reconciliation`

No route ownership, API, model, or production-write behavior changes.

## File manifest

- `core/style-lens-os/types.ts`: brand-neutral renderer ID contracts.
- `core/style-lens-os/constants.ts`: one allowlist for approved renderers.
- `core/style-lens-os/appearancePersistence.ts`: versioned, namespaced, bounded persistence.
- `adapters/style-lens-swan/manifests/*.ts`: one small manifest per lens.
- `adapters/style-lens-swan/index.ts`: promoted batch registry.
- `adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts`: scoped structural recipes.
- `adapters/style-lens-swan/visuals.ts`: contrast, glow, asset, and signature receipts.
- adapter/core/browser tests: registry, differentiation, palette, persistence, reduced-motion, overflow, axe, and no-write evidence.

## Batch taxonomy

1–5 are the approved sentinels. Batch 6–10 is Recovery Cloister, Tempo Forge, Coach Ledger, Signal Garden, and Split Horizon. Planned 11–25: Prism Terminal, Tidal Columns, Monastic Grid, Orbit Atlas, Carbon Atelier, Kinetic Kanban, Aurora Index, Modular Harbor, Terrain Console, Chronograph Board, Glass Rail, Meridian Magazine, Lunar Stack, Cedar Workshop, and Crystalline Cathedral.

Every promoted sibling must differ in at least two of navigation behavior, density/grouping, grid topology, and shell chrome. Stable string IDs are mandatory; no lens stores an array index.

## Performance and rollback

Apply stays root-attribute/CSS-variable based and outside route remounting. Appearance Studio remains lazy. The sentinel matrix stays test-only. Each batch is a separate commit; rollback is a commit revert with no migration or backend action. Unknown/removed IDs resolve to Default Safety.

## Workout Design Lab 25+25

The existing canonical Lab already owns 25 independently composed workout worlds over one shared view model. The Style phase adds a second orthogonal axis with 25 structural lenses. The bounded experience will expose World, Style, and Compare modes while preserving one workout session; it will not create 625 duplicated components.

## Release gates

Feature-branch implementation may continue. `main`/Render still require physical-device Safari checks, authenticated-route/security review, hosted CI artifacts, and Sean's explicit production authorization.