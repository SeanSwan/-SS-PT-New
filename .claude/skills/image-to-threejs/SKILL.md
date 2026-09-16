---
name: image-to-threejs
description: Turn one reference image into a 3D model built entirely from code - a parametric Three.js factory of primitives, procedural materials, and generated geometry, never downloaded meshes. Spec-gated before codegen, pass-by-pass side-by-side review, honest confidence about what the image cannot show. Use for landing-page / awe-surface 3D heroes and product objects.
---

# Image -> Three.js (reconstruction-by-code)

- **Status:** ACTIVE house skill (2026-09-15). Hardened from img2threejs (Apache-2.0, ~16k stars) into SwanStudios doctrine. This file is the discipline; the upstream repo's ~90-module Python forge is an optional install, not a requirement.
- **Companions:** `three` (`.agents/skills/three/`) owns deterministic RENDERING (HyperFrames adapter contract). `swan-design-router` owns whether an awe surface should exist and its concept direction (rule 40). This skill owns the image-to-code MODEL pipeline between them.
- **When:** landing heroes, showcase/product objects, gamification relics - the awe/showcase tier only. NOT for client/data cards or working surfaces (house low-motion card rule).

## Non-negotiables

1. **Reconstruction-by-code only.** No downloaded meshes, no photogrammetry, no base64 geometry blobs, no CDN GLTF for the hero object. Output is a typed `THREE.Group` factory (one TS file + one spec JSON) - diffable, reviewable, under 1MB.
2. **Spec gate before codegen (fail-closed).** Write the spec FIRST: subject class, identity-defining detail inventory (bevels/rounding, panel seams, fasteners, painted or engraved linework, gloss-vs-matte zones, wear), landmark coordinates, camera pose, palette sample table. Fewer than 5 identity-defining details with pixel evidence = spec is BLOCKED - request a better image or a second angle instead of faking it.
3. **Derive from pixels, not memory.** Every color/finish/gradient stop cites its sampled reference value and maps to a house token where one exists (`var(--token, #fallback)`, rule 6). Flag any color that will not survive tone-mapping against the dark surfaces (`#0A0A0F`, `#002060`).
4. **Pass ladder with side-by-side review per pass.** blockout -> structure -> form -> material -> surface -> lighting -> interaction -> optimization. Each pass renders ONE comparison sheet (reference beside current render); the model judges pass/fail against that sheet. Never advance on an unverified pass; never regenerate the whole model per pass - patch only the unlocked pass.
5. **Honest confidence.** Per-region confidence in the spec: regions the image cannot show (hidden sides, back geometry) are `[LIKELY]` at best and marked invented-by-convention. Never present invisible regions as verified.
6. **Motion budget (rule 25).** GPU-safe transform animation only; `prefers-reduced-motion` gets a static hero frame; interaction capped at drag-rotate plus one gesture; pin pixel ratio for mobile performance.

## Pipeline

1. Intake: read the image, sample the palette, inventory identity details, estimate pose.
2. Spec: write `<object>.spec.json` (detail inventory + confidence table + token map). Gate review - BLOCKED means stop and ask.
3. Build per pass: emit or patch the factory for the currently unlocked pass only.
4. Review: render the side-by-side sheet; pass unlocks the next pass; fail fixes in-pass.
5. Rig (characters/creatures only): skeleton from the component tree; skip for objects.
6. Integrate: mount per the `three` skill contract (deterministic time where applicable); surface passes the router's QA gates.

## Verification

- Final side-by-side sheet saved with task artifacts and flagged as a QA artifact in closeout (rule 38).
- Page check: renders at 375 / 1440 / 2560 widths, transform-only 60fps motion, reduced-motion static fallback present.
- Frontend-only by design: no rule 42 backend audit unless the object fetches data (it should not).

## Real-tool path (optional)

Upstream is Apache-2.0, Python 3.10+ stdlib only, with per-stage token-cost docs (`docs/TOKEN_COST.md`):

```
git clone https://github.com/img2threejs/img2threejs.git .claude/skills/img2threejs
```

Adopt only if the house pass-rate proves worse than the forge's strict-quality gates - measure before adding (gate-mode convention).
