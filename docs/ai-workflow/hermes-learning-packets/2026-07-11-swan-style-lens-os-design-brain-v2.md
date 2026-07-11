---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-11
topic: Swan Style Lens OS Default, SwanStudios Lens Pack, and Design Brain v2
surfaces: [style-lens-os, swanstudios-lens-pack, workout-design-lab, appearance-studio, design-brain]
---

# Hermes Learning Packet: Swan Style Lens OS and Design Brain v2

## Executive outcome

The conversation began as a request to create 25 polished, highly differentiated workout-interface worlds inside the Workout Design Lab. That first set was completed, verified, pushed to the production branch with explicit approval, deployed by Render, and verified live.

The request then expanded into a second, fundamentally different system: 25 whole-application style lenses capable of changing dashboard composition, navigation, controls, motion, and presentation across client, trainer, user, and administrative experiences. The final output of this chat is a reviewed implementation architecture and phased execution plan. The second system has not yet been implemented or deployed.

The final ruling was **LOCK-WITH-CHANGES**. The concept is approved after incorporating the mandatory architectural, privacy, accessibility, state-safety, and performance corrections recorded below. No additional Fable review is required before starting the locked slices, except for the explicit checkpoint after the first five sentinel lenses.

## Beginning: the original request

The original brief asked for exactly 25 vivid, original workout-design views in the existing Workout Design Lab. Each world needed to preserve the same workout-planning data and Exercise Rolodex while changing the visual environment and composition. The brief emphasized:

- strong contrast and usability on extremely small phones;
- tablet and desktop adaptations up to 4K;
- premium animation and richer desktop presentation;
- no cloning of Mobbin or other reference products;
- structurally different compositions, not simple palette swaps;
- shared product logic and truthful prototype behavior;
- complete verification and a production push only with approval.

The 25-world Workout Design Lab reached production. Its canonical route is `/dashboard/admin/workout-design-lab`. The implementation uses a shared prototype view model and read-only Exercise Rolodex feed. Focused tests, TypeScript, production build, responsive browser checks, keyboard and reduced-motion checks, and accessibility sweeps were completed before the approved push. Render reported a live deployment and the production route and bundle were verified.

## Expansion: from themes to a Style Lens operating system

The next request asked for 25 more themes, but not as another set of workout canvases. These themes must transform the entire dashboard experience: shell, navigation, hierarchy, buttons, cards, action placement, responsive behavior, and motion. Mobile must remain minimal, beautiful, legible, and fast; desktop may use richer cinematic presentation.

The user selected the **Swan Style Lens OS** direction and added an important portability requirement:

1. Preserve a brand-neutral **Default Lens OS** that can be reused by other products.
2. Build a separate **SwanStudios Lens Pack** on top of that core.
3. Keep palette selection separate from structural style selection.
4. Make the Workout Design Lab a proving ground for both the existing 25 workout worlds and the new 25 application lenses.
5. Evolve the Design Brain from passive documentation into an active design-production and critique system.

## Repository findings that changed the plan

The audit established several facts:

- SwanStudios already has 38 palette themes and a real grouped color-theme picker.
- The existing theme system changes colors, gradients, typography, and shadows, but not application structure or navigation.
- Admin, trainer, and client dashboard roles largely share `UniversalDashboardLayout`; the user dashboard has a separate `UserDashboard.V3` composition.
- A nested theme provider can shadow theme state. This must be remediated before structural lenses can be trusted.
- The local Lens Foundry is a useful untracked prototype for composing prompts and review packets, but it is not yet a runtime, persistence layer, schema, or safe dashboard transformation engine.

Therefore the Style Lens OS must be a new typed composition layer, not an extension that overloads the existing color-theme object.

## External research and how it was used

References were treated as context, never as layouts to clone.

- **Mobbin:** used for shipped workflow truth: discoverability, picker patterns, preview/apply/cancel behavior, and mobile bottom-sheet ergonomics. Its screens are not a Swan brand direction.
- **Dribbble:** used as an edge laboratory for visual hierarchy and expressive ideas. Fake metrics, tiny labels, decorative HUD noise, and indiscriminate neon were rejected.
- **Higgsfield:** informed modular cinematic controls, focal-media hierarchy, editable parameters, and prompt-to-asset workflows. Its marketplace layout and black/lime identity were not copied.
- **Seedance 2.0:** informed an asset-shot ledger: subject, depth, lighting, camera movement, pacing, start/end frames, and fallback stills. Generated media remains an enhancement layer, not an architectural dependency.

The reusable research lesson is: use shipped products to learn workflow, concept galleries to explore edges, and generative-media tools to author controlled assets. None should determine the product's information architecture or brand identity.

## Review sequence and provenance

The review path was deliberately staged:

1. A free subscription-based fusion attempt was started but produced no completed answers and was terminated. It is not counted as a review result.
2. A repository AI Village planning run completed 16 of 18 tracks and all three specialty debates. Two research brains cited 36 sources. Competitive Intelligence and Trinity full-stack integration failed immediately and were excluded from consensus. Recorded model spend: approximately `$0.3425`.
3. The useful Village consensus was separated from scope creep in a Fable seed packet.
4. Fable 5 acted as the final judge using `anthropic/claude-fable-5`: 12,587 input tokens, 10,086 output tokens, approximately `$0.6302`, and 137.4 seconds.
5. Total recorded paid model spend for the successful Village plus Fable sequence was approximately `$0.9727`.

Fable rejected speculative expansion such as mandatory WebGPU/WebXR/React Three Fiber, biometric or sponsor slots, unrelated compliance/product features, and a low-power fallback that silently forced one Swan lens.

## Final locked architecture

### Default OS and Swan adapter

- Core location: `frontend/src/core/style-lens-os/`.
- Swan adapter: `frontend/src/style-lenses/swanstudios/`.
- Do not extract an npm package in version 1.
- Add a boundary test early so the core does not import Swan-specific branding or product code.
- The core owns schemas, profile resolution, slot contracts, registry behavior, persistence interfaces, transition state, and fallback rules.
- The Swan pack owns the flagship Swan lens, Swan tokens, Swan renderers, brand assets, and product-specific composition choices.

### Palette and style remain separate

The existing palette system and the new structural lens system must be independent providers. A selected palette can color a selected style lens, but neither object should absorb the other's responsibilities. Every valid combination must satisfy contrast and fallback rules.

### Frozen eleven-slot composition contract

Version 1 has exactly eleven semantic slots:

1. shell
2. navigation
3. orientation
4. context-bar
5. current-state
6. insight
7. progress-proof
8. next-action
9. secondary-rail
10. action-dock
11. overlay-root

A twelfth slot requires an RFC. Coach state and similar product concerns are invariants or portals, not new slots.

### Layout and motion are orthogonal

There are three layout profiles:

- mobile-minimal;
- tablet;
- desktop-enhanced.

Reduced motion is not a fourth layout. Motion mode is an independent dimension. The same information architecture must remain usable when animation is reduced or disabled.

### Typed registry and renderer safety

- Lenses are static typed manifests.
- Renderers are referenced only through allowlisted IDs.
- A synchronous baseline renderer must always exist.
- Enhanced renderers may load lazily.
- No arbitrary component names, code strings, or remotely supplied renderer identifiers may execute.
- Every lens must resolve to the Default safety lens in no more than one fallback hop; Default falls back to itself.

### Persistence and preview

- Version 1 uses local storage only.
- `manifestSchemaVersion` and `profileSchemaVersion` are separate fields.
- Profiles require migrations and invalid data fails closed to the brand-neutral Default safety lens, not the Swan flagship.
- Preview state and committed state are separate contexts.
- Appearance Studio preview is isolated and must never mutate the live dashboard until Apply.
- Cross-tab synchronization is suppressed during an administrator's view-as session.

## Highest-risk failure mode

The largest risk is not visual. It is silent corruption or loss of live dashboard state while switching lenses, especially when combined with nested theme shadowing.

Before any sentinel manifests are accepted, a headless transition harness must prove preservation of:

- dirty form values;
- an open modal;
- active query state;
- scroll position;
- keyboard focus;
- in-progress workout state;
- queued lens switches;
- environments without View Transitions support;
- every layout profile and motion mode.

If this harness is not green, implementation stops. No lens is allowed to remount or discard canonical workflow state merely to achieve a new visual composition.

## Five sentinel lenses and the hard checkpoint

The first implementation wave contains five deliberately different lenses:

1. Quiet Meridian
2. Blueprint Fold
3. Kintsugi Circuit
4. Analog Flight Recorder
5. Candy Glass Arcade

They are a structural proof set, not merely the first five names. They must demonstrate that the schema can support quiet minimalism, technical blueprint composition, repaired-organic luxury, instrumentation density, and playful glass-like presentation without special-case architecture.

Fable performs a mandatory checkpoint after these five and before lens number six. If the schema or slots require repeated exceptions, the system is corrected before the remaining twenty are produced.

## Design Brain v2: active but bounded

Version 1 upgrades the Design Brain through four active subsystems only:

1. **Intake compiler:** converts a product brief into constraints, workflow invariants, responsive requirements, evidence needs, and prohibited patterns.
2. **Composition and lens grammar:** produces typed slot/layout proposals rather than prose-only mood boards.
3. **Motion and asset ledger:** records purpose, trigger, duration, fallback, reduced-motion behavior, performance budget, and any generative-media shot intent.
4. **Critic and promotion system:** scores hierarchy, originality, contrast, touch ergonomics, workflow preservation, motion restraint, and brand fit before a lens can move from experimental to approved.

All screenshots or critic inputs must use synthetic personas and synthetic workout data. No client PII may be sent to an LLM critic.

## Asset and performance ladder

Each lens must have a progressive asset path:

- **Rung 1:** premium static CSS, SVG, or poster treatment suitable for the LCP path.
- **Rung 2:** optional locally rendered enhancement.
- **Rung 3:** optional Seedance-generated cinematic asset.

Direct Rung 1 to Rung 3 is allowed only when the shot ledger is complete. The experience must remain coherent if every enhanced asset fails to load.

Animation must remain GPU-safe, avoid layout thrashing, respect reduced motion, and never hide essential actions behind hover. Mobile is the information-contract baseline; desktop enhancement is additive.

## CI and accessibility laws

The implementation must enforce:

- styled-components; no Material UI;
- Victory for new charts; no Recharts;
- CSS variable tokens with approved fallbacks;
- Swan Dual-Button Glow rules where the Swan pack applies;
- 44px minimum touch targets even in compact mode;
- 4.5:1 text contrast against the dark-first default for every lens;
- prohibited-language linting;
- file-size and documentation rules;
- responsive verification at small-phone, tablet, QHD, and 4K classes;
- no hover-only controls;
- no loss of focus, scroll, form, modal, query, or workout state during a lens switch.

## Final implementation sequence

The approved slices are:

- **S0:** preflight, isolated worktree, CI laws, ownership and scope fences.
- **S1:** typed schema and registry, including the core/Swan dependency boundary.
- **S1.5:** data backbone that preserves canonical workflow state independently from presentation.
- **S2:** runtime, reducer/state machine, transition harness, and nested theme-shadow remediation.
- **S3:** Swan adapter skeleton, Default safety lens, and Swan flagship lens.
- **S4:** Appearance Studio with isolated preview, Apply, Cancel, reset, search, and accessible mobile sheet.
- **S5:** five sentinel lenses and the mandatory Fable checkpoint.
- **S6:** Workout Design Lab dual-mode support for the existing 25 workout worlds and the new 25 application lenses.
- **S7:** remaining twenty lenses in waves of 7, 7, and 6.
- **S8:** 38 palettes by 25 lenses semantic contrast and visual matrix.
- **S9:** Design Brain v2's four active subsystems.
- **S10:** performance, accessibility, responsive QA, regression review, production build, and Render release gate.

## What was built versus what remains

Built and live:

- the original 25-world Workout Design Lab;
- the canonical Workout Design Lab route and shared prototype data contract;
- production deployment and live verification for that first set.

Designed, reviewed, and locked but not yet implemented:

- Default Style Lens OS;
- SwanStudios Lens Pack;
- the 25 whole-dashboard lenses;
- Appearance Studio;
- Design Brain v2 active subsystems;
- runtime transition harness and persistence;
- 38-by-25 palette/lens compatibility matrix.

No Style Lens OS source implementation, commit, push, migration, or Render deployment occurred in the latter portion of this chat.

## Reusable Hermes rules from this situation

1. Distinguish a palette theme from a structural interface lens before designing schemas.
2. Preserve a brand-neutral core and put brand expression in an adapter.
3. Treat external galleries as evidence, not templates; extract principles and record what must not be copied.
4. Protect workflow state before investing in visual variety.
5. Prove a schema with a deliberately diverse sentinel set before mass-producing variants.
6. Keep layout, palette, motion, data, and assets as independent dimensions with explicit contracts.
7. Use a safe one-hop fallback graph and version persisted profiles.
8. A failed or incomplete AI consultation is not consensus and must be recorded as failed.
9. Separate useful review consensus from speculative scope expansion before giving material to a final judge.
10. State clearly whether the ending artifact is live code, a locked plan, or a future implementation gate.

## Durable source artifacts

- Review brief: `C:/tmp/swan-style-lens-os-review-brief-2026-07-11.md`
- Village-to-Fable seed: `C:/tmp/swan-style-lens-os-village-seed-for-fable-2026-07-11.md`
- Fable final ruling: `C:/tmp/swan-style-lens-os-fable-final-ruling-2026-07-11.md`
- Consolidated final implementation plan: `C:/tmp/swan-style-lens-os-final-implementation-plan-2026-07-11.md`
- Village run evidence: `AI-Village-Documentation/hermes-village-prompts/latest/` in the isolated Style Lens worktree.

## Privacy and delivery note

This packet contains product architecture, review evidence, role labels, model provenance, and approximate cost only. It intentionally excludes secrets, environment values, private customer data, and personal identifiers. Before ingestion, Hermes should treat the final plan and Fable ruling as authoritative for this workstream and treat the broader Village output as supporting evidence rather than binding scope.
