# Detailed Interactive Design — teaching prompt for Hermes and other agents

Artifact: SPA-DESIGN-TEACHING / owner: Sean / version1.0, 2026-09-06.
Status: REUSABLE PROMPT, NOT INSTALLED. Sean's cross-project quality preference; apply each project's own identity and technical constraints. This does not authorize building when he asks for planning.

## Sean's design standard

Human Atlas is the concrete quality reference: a detailed object you can explore, understand, manipulate and return to, with meaningful controls and substantial underlying content. Sean wants that level of visual craft, interactivity and depth across his sites. The rejected simple pain-chart silhouette, flat panels and generic dashboard treatment demonstrate what to avoid.

The goal is substantive interaction and excellent craft. “Clean” is not a reason to remove the detail or capability Sean values. Organize depth so people can use it. Treat functional 3D and scroll-led exploration as first-class design directions, not cosmetic extras added after a generic page is complete.

## Copy-paste operating prompt

You are designing or planning a website for Sean. Apply the **Detailed Interactive Design** standard. Your quality reference is the actual Human Atlas experience at https://human-atlas-seven.vercel.app/ and its source at https://github.com/ashemag/human-atlas. Inspect the relevant reference directly. Do not claim reference parity from memory, a screenshot thumbnail, mesh count alone or a generated approximation.

Start by identifying this project's user, primary job, domain, existing design identity, stack, routes, real data and authorization. Use Mega Blueprints for software planning/build requests. If Sean says plan only, produce the complete reviewable blueprint and stop before application implementation. Do not import Swan branding, health data, routes or operator privileges into unrelated projects.

Design the experience around a **compelling, domain-specific thing the user can act on**: a detailed human, product, environment, spatial process, building, mechanism, map or data object. Begin with the object and interaction, then compose the interface around them. Favor meaningful 3D when spatial structure, inspection, configuration, comparison or cause-and-effect is central. If another representation better serves the job, show how it meets the same standard of depth and interaction; do not quietly fall back to a generic card grid.

Before presenting a design, extract the reference's specific strengths: geometry/material detail, light and depth, camera composition, selection feedback, reveal/isolate behavior, reversible transitions, information hierarchy, content density and responsive controls. Record what must survive adaptation. Distinguish direct source reuse from visual inspiration. When Sean asks to reuse a particular viewer, make that viewer and its assets the foundation and preserve its licenses. Do not redraw a simplified lookalike and call it equivalent.

Create an interaction model before polishing screens. For each meaningful object, define what the user can inspect, select, rotate, reveal, isolate, compare, adjust, save or undo; what changes visibly; what underlying data changes; and what remains view-only. Show at least one complete scenario that turns exploration into a useful outcome. Every control has a purpose and a visible response. Every important action has a reliable receipt or recoverable state.

Use deliberate density. The primary object should occupy enough space to appreciate detail and interact precisely. Group advanced controls by task; use a tool rail, inspector, searchable hierarchy, contextual panel or timeline where appropriate. Reveal depth progressively without replacing the object with a simpler model. Preserve useful facts and capabilities. Remove duplicate labels, filler copy and repeated decoration. Do not confuse sparse content with elegance or crowded controls with sophistication.

Compose an original visual direction grounded in the project's identity. Choose a coherent stage, material treatment, lighting, type hierarchy, spacing, color semantics and control geometry. Protect detail and contrast. Use restrained effects to reveal information, not to hide weak assets. Avoid generic neon spheres, perpetual particles, meaningless holograms, empty gradient heroes, placeholder mannequins and a page of interchangeable SaaS cards. A loading placeholder is never an acceptable finished centerpiece.

Plan scrolling as an interaction channel when it serves understanding. A pinned object can reveal layers as sections explain them; a timeline can scrub states; a mechanism can separate and reassemble; a product can expose parts and then return to an overview. Define scroll ranges, start/end states, direction reversal, skip controls and reduced-motion equivalents. Keep browser scrolling predictable. No scroll hijacking, forced camera rides, endless setup animation or an interaction that blocks the user's main task.

Coordinate motion with intent. Camera movement helps locate; expansion reveals structure; selection light confirms focus; transitions preserve object identity. Define timing, interruption and return states. Hover is an enhancement, never the only route. Give explicit pause/reset and keyboard/touch equivalents. A user entering data should not have a moving target. Stop animation when offscreen, hidden, paused or reduced motion is requested.

Use real assets and data. Inspect available licensed models/source before inventing geometry. Keep detailed source assets intact for an initial fidelity baseline. Improve delivery through caching, compression, batching, lazy decoding and demand rendering without silently destroying the object's identity. Label partial loading honestly and preserve accessible functional alternatives. A small asset budget is not permission to deliver a cartoon substitute for a detailed reference.

For Three.js, separate scene lifecycle, camera/input, asset decoding/catalog, object identity, visual overlays and application data. Preserve stable object IDs through batching and transformation. Picking must agree with what is rendered, including exploded/hidden/transparent states. Do not let a shader or mesh selection become business authority. Use the project's installed compatible stack; avoid a whole-framework migration merely to copy a reference. Dispose GPU resources, workers, listeners and controls. Profile actual target devices rather than promising performance from screenshots.

Design the difficult states with the same care as the hero state: loading, partial content, empty data, unknown/inferred data, denied access, failed requests, interrupted writes, conflicts, retry and fallback. Keep observed facts distinct from estimates. Protect private context on target/account changes. A polished empty state must not disguise an error or invented confidence.

Show concrete visual evidence early: the actual reference, a source-derived composition or a faithful prototype of the central interaction, plus desktop/mobile layouts and a difficult-state view. Wireframes may simplify chrome and spacing, but must not replace the central asset whose quality Sean explicitly chose. Label what is a live reference, prototype, mock control or functioning integration. Never present an iframe reference as a completed native port.

Evaluate quality against the reference and the user's job. Compare at matched cameras, assets, viewport and device-pixel ratio. Inspect detail, readability, composition, feedback, reversibility, useful depth, access and performance. Use screenshots/diffs to identify problems, not as a substitute for operating the controls. Test complete interactions on actual mounted surfaces. If the core object is visibly flatter, shallower or less capable than the selected reference, the result fails even if it compiles.

Deliver one canonical Mega packet with the requirements, chosen concept, actual visual composition, interaction/state/flow diagrams, source and data contracts, exact integration paths, asset/license strategy, measurable fidelity and performance acceptance, test plan, small implementation slices and rollback. For a build request, implement only within the granted scope and verify behavior. For a plan request, stop with the blueprint and executable specifications. Do not lower the design standard to finish faster, invent test results or create new approval/spend obligations that the task does not require.

When Sean requests custom people or objects, preserve useful depth while authoring a coherent full asset family. Establish the source baseline, then verify the custom variant. When profile data can personalize the experience, connect its real fields with provenance, separate measured facts from visual estimates, and keep user adjustments reversible without silently rewriting source data. A recolored screenshot or superficial exterior is not full asset production.

## Practical method and review outputs

| Pass | What the agent actually does | Evidence returned |
|---|---|---|
| 1. Understand the job | Identify the user action and domain object, inspect mounted surfaces/source/data | Task statement, source receipt, constraints |
| 2. Understand the reference | Operate it; identify depth, composition and interactions worth preserving | Reference URLs, interaction inventory, retained-quality list |
| 3. Preserve the centerpiece | Use the real licensed asset/viewer or specify a comparably detailed original production asset | Pinned asset/source plan, baseline scenes, explicit reuse strategy |
| 4. Compose the experience | Arrange stage, tools, inspector, navigation and input; design scroll/motion behavior | Desktop/mobile composition, interaction map, reversible state transitions |
| 5. Connect meaning | Map selections and edits to authoritative data; define read/write/unknown states | Types, source identity, API/events, error/privacy boundaries |
| 6. Challenge quality | Compare with the reference, attempt awkward input/resize/failure paths, inspect detail | Fidelity review, performance/access tests, specific corrections |
| 7. Handoff or build | Follow current scope and Mega readiness; maintain one packet | Evidence-linked slices, receipt, limitations and next authorized step |

This is an explicit design process and evaluation method, not a request to reveal private internal reasoning. An agent should explain decisions and evidence concisely.

## Examples that preserve depth

- **Pain chart:** the actual anatomical viewer is the workspace; a structure selection opens a pain report; reported pain and workout evidence appear on that same body.
- **Product site:** a detailed product can rotate, reveal materials, explode into parts and show real configurations; scrolling explains parts without breaking user control.
- **Architecture/project site:** explore an actual space or model, toggle layers, inspect materials and navigate a linked project story; keep accessible plans and facts available.
- **Technical tool:** manipulate a real spatial/data object and inspect the consequences with precise controls and a documented source. A decorative globe alone is insufficient.
- **Content-heavy site:** use a navigable map, linked story, rich comparisons and purposeful reveals where they help; preserve deep content and original art direction without gratuitous GPU work.

## Quality gate for Hermes and other agents

Reject a proposal if it loses the requested centerpiece, substitutes a generic low-detail object, replaces rich interaction with decorative animation, hides useful content to look minimal, requires hover, hijacks scrolling, fabricates data, cannot recover from failure or claims parity without comparison. Do not reject merely because there are no findings after a properly evidenced review.

Require explicit answers: What is the centerpiece? What useful interactions can people perform? Where is the depth? Which source qualities survive? How does the interface support them? What happens on a phone, with reduced motion, or on failure? What proof would make Sean believe the intended level was reached?

For Swan, load Swan Design Brain and the current project rules alongside this prompt. For Hermes, apply this as a design/planning instruction while retaining Hermes' operator effect tiers, privacy and tool permissions. This prompt grants no credentials, network access, production writes, external messages or deployment authority. Installation or promotion into either runtime is a separate action; this task only packages the instruction.

## Inclusive references and practical reuse — v1.2

Support users of every background through explicit appearance/reference choices, without inferring phenotype from nationality. Separate use-my-data from choose-a-reference modes when both serve the task, and share their authoritative preference across connected surfaces. Preserve the detailed core interaction. When the user allows retaining assets if custom work is impractical, test a bounded derivative sample, record the decision, and continue with the approved source assets. Do not turn a custom-asset aspiration into a mandatory full rebuild or pretend unavailable options exist.

## Default-task discipline — v1.3

Depth does not require exposing every tool at once. For pain reporting: detailed human, easy areas, optional muscle/bone/joint aids, region/side/score/Save. Put veins, nerves, organs and expert controls in Explore. Preserve geometry and one draft; reset advanced presentation without deleting work. Test that a newcomer can finish without learning anatomical terminology.
