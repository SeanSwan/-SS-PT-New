---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-11
topic: Fable-locked contract for safe structural dashboard appearance
surfaces: [style-lens-os, universal-dashboard, appearance-studio, workout-design-lab]
---

## What was decided/built (Fable-tier lesson)

Fable locked a two-layer system: an extractable, brand-neutral Style Lens OS and a separate SwanStudios adapter. The core owns schema, validation, semantic slots, state, persistence, capability resolution, and transition coordination. The adapter owns Swan tokens, role mappings, navigation recipes, and branded lenses.

Implementation began with the safety foundation before any visual lens expansion. The core now fails unknown, malformed, unpromoted, or multi-hop-fallback manifests closed to Default. Appearance changes use isolated preview, explicit Apply or Cancel, rollback on persistence failure, and scoped runtime attributes.

## Why (the rationale Hermes should carry forward)

A structural theme switch is riskier than a color switch because remounting or rewriting the route tree can lose active workout state, dirty forms, focus, modal state, query state, and scroll position. The lens system must therefore transform presentation around the existing product state, never replace that state.

The universal dashboard previously nested a complete theme object that shadowed the outer Crystalline Swan theme. Parent-theme composition is now the required integration pattern.

## Reusable pattern / rule Hermes should apply next time

- Separate generic runtime contracts from product-specific adapters with a tested import boundary.
- Treat preview as pending state; only validated Apply changes committed state.
- Preserve navigation destinations and DOM identity across every structural style change.
- Resolve mobile, tablet, and desktop layout independently from motion capability.
- Coalesce interrupted switches so the last explicit user intent wins.
- Suppress persistence during administrator view-as or impersonation contexts.
- Ship five sentinel lenses, run real-dashboard state-preservation and visual QA, then require the Fable checkpoint before authoring lenses 6 through 25.

## Risks / guardrails

- The current branch contains S0-S2 foundation only, not the 25 visible lenses and not a Render release.
- Arbitrary HTML, remote renderer execution, MUI, Recharts, and Swan route imports are prohibited in the generic core.
- Every compact control remains at least 44 pixels, contrast remains at least 4.5 to 1, and reduced motion is mandatory.
