# Swan body library and asset adaptation strategy

Artifact: SPA-ASSETS / version 1.2 / effective 2026-09-07 / owner: Sean + future anatomy/design leads.
Status: PLANNING ONLY. Supersedes v1.1's Black-only asset scope and mandatory full custom rebuild. [Viewer](02-pain-atlas-blueprint.md), [personalization and Planner](15-profile-driven-body.md).

## Inclusive product direction

Support clients of all nationalities and backgrounds. Offer a growing, diverse library and appearance controls spanning skin tones, hair textures/styles, facial features, silhouettes and supported adult anatomical reference sets. Nationality is not a geometry preset: do not infer appearance, sex-specific anatomy, ethnicity or body proportions from country, name or account labels. Let the person choose the reference they want.

The earlier strong Black male, 6′2″ / 220 lb reference and Black female direction remain optional concepts within this broader library. Neither is the only supported identity or an automatic client default. Client measurements affect supported shape only in “Use my measurements” mode; “Choose a reference body” preserves the chosen visual reference independently. Both modes retain every available Atlas system and tool.

Separate anatomical reference set, appearance preset and shape parameters. They are related through reviewed compatibility, not a single nationality enum. Present only real available assets and controls. Never label one model as representing an entire nationality or claim an exhaustive biological catalog.

## Three.js and what makes it Swan

Use **Three.js** for the native detailed viewer, object selection, visibility, explode/reassemble, camera and independent overlays. Adapt the existing source scene onto Swan's installed React/Three stack; no forced R3F/framework migration. This functional 3D use is explicitly authorized and supersedes doctrine that limits Three.js to decorative accents.

SwanStudios is the project brand; “Tron Studios” is treated as a transcription of SwanStudios in this request, not authorization for a separate brand migration. Apply Crystalline Swan materials and controls: sapphire/obsidian surroundings, Frost White typography, restrained Ice Wing/Wing Purple focus and selection, Gilded Fern accents, 44 px controls and styled-components tokens. Preserve natural tissue colors and readable anatomy. Do not recolor the whole body into a neon hologram.

Make the experience ours through composition, navigation, reporting, personalization, workout evidence, Coach handoff, accessible controls and distinctive interaction feedback. Do not display the upstream application shell as the final Swan product. The public iframe is a reference-only planning aid; the production viewer/assets are Swan-hosted with retained credits.

## Feasible asset tracks — explicitly authorized fallback

| Track | Work | Acceptance / decision |
|---|---|---|
| A — retained source | Port original browser-ready geometry and viewer. Apply Swan interface/theme, controls, reporting, data adapters and honest reference labels | Required usable baseline. Preserve full source detail and tools. Available for every client; do not claim unsupported appearance or patient-specific anatomy |
| B — derivative assets, preferred where practical | Use licensed original structures as a base; improve materials/exterior/compatible appearances, edit or retarget selected geometry and update bounds/mapping/export | Prove one representative exterior + shoulder/torso/deep-layer sample before extending. Full asset family must remain coherent; reject detached layers or lost picking |
| C — fuller custom library | Add anatomy/appearance variants or larger reviewed morph range when source coverage and B's export/rig workflow support it | Release incrementally per reviewed catalog version. A female reference requires its own accurate scoped anatomy; a reshaped male exterior alone is insufficient |

Start with A and conduct a bounded B feasibility spike during later implementation. Report actual authoring steps, retained/replaced structures, export compatibility, tools/licenses, measured GPU cost and an effort range for completion. Do not invent calendar estimates or purchase assets now.

Continue B when the sample preserves identities, detail, layer alignment, selection, explosion/reassembly and existing performance targets through a maintainable export path. If it requires a wholesale anatomy rebuild, unavailable source coverage, unaffordable licensed assets, unsupported rigging or cannot pass those checks after one focused correction pass, record DEFER CUSTOM and continue Track A. No repeated speculative rebuild loop or new dependency purchase.

Sean has explicitly authorized keeping the existing assets if adaptation is too much work. That fallback does not require another routine design approval. It also does not waive honesty: show actual available options, label reference-only anatomy and keep unsupported personalization controls unavailable with an explanation. Later B/C releases expand capability without blocking the base pain chart.

## Reuse and ownership evidence

The [Human Atlas repository](https://github.com/ashemag/human-atlas) identifies original application code as MIT and its anatomy as separately licensed data. The [official BodyParts3D license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), checked 2026-09-07, permits derivative works and redistribution under CC BY 4.0 with required attribution. Pin the exact assets and included notices before import; dependencies and any newly sourced models have their own terms.

Retain MIT notices, source/data credits, attribution text and a record of modifications. Swan owns its original interface/workflow contributions and authored additions subject to applicable source licenses; renaming does not make source geometry exclusively ours. A model-format export is not a rights transfer.

The repository already contains browser-ready geometry and an optional rebuild pipeline. Prefer reusing that pipeline and original source meshes for a derivative experiment over reconstructing thousands of parts. No geometry download, source fork, conversion, artwork generation or purchase was performed in this plan revision.

## Whole-asset integrity

For every shipped asset/version, account for exterior skin/head/hair/materials where provided, muscle/bone/connective structures, organ/vessel/nerve scope, labels/concepts, picking proxies, bounds, exploded layout, presets, thumbnails and derivative LODs. Optional custom work never means unchecked internal layers.

Manifest: schemaVersion, assetTrack, variantId, assetVersion, sourceBaselineCommit, anatomicalReferenceSetId, appearancePresetIds, compatibleMorphSchema, supportedDomain, units/restPose/axes, parts/concepts/systems, hashes, source correspondences, credits, capabilityFlags, reviewStatus. Do not add nationality-to-geometry rules.

Keep immutable variantPartId plus semanticStructureId, laterality, sourcePartIds[] and catalogVersion. Source baseline T26 requires original geometry hashes; derivative T28 intentionally uses different hashes with reviewed semantic coverage. Manual body choice or morphing must not relocate saved pain to a different structure.

Atomic variant loading prevents a mixed exterior/skeleton. Missing mappings preserve broad region/side and show a limitation. Retain skin appearance while making overlays legible with outlines/labels/patterns; do not lighten skin to make a marker visible.

## Production and ownership

Proposed asset namespace: frontend/public/anatomy/catalog/<variantId>/<assetVersion>/, with source/adaptation manifests and credits. Registry/selection/morph adapters: frontend/src/components/BodyMap/atlas/catalog/. Authoring sources and landmark/export recipes live in versioned asset storage with restore proof; large scenes do not enter application Git automatically.

Owners: design lead for Swan composition and diverse appearance coverage; anatomy lead for scoped structure correctness/alignment; frontend lead for Three.js export/picking/GPU; backend lead for reference preferences and target boundaries. Asset sourcing/spend keeps existing authorization rules.

Default reporting uses the same detailed human as Explore. Advanced tools collapse; anatomical depth does not disappear. Reduced motion stops continuous effects, while direct manipulation and full anatomy remain available. Actual GPU failure/user choice can use the accessible region-list fallback.

## Acceptance and rollback — P10/T28, P13/T31

| Gate | Required observable result |
|---|---|
| A baseline | P09/T26 source fidelity, natural detail and all retained source tools on native Swan Three.js |
| Diverse options | Actual catalog inventory, appearance/shape compatibility and explicit availability; no nationality inference, fabricated coverage or blanket Black-only restriction |
| B/C anatomy | Every declared structure accounted for; female-specific scope reviewed where offered; correct layers/landmarks throughout supported morph envelope |
| All interactions | Search/select/isolate all indexed IDs; 100 explode/reset cycles return to current rest transforms within 1e-6; accurate hidden/exploded picking |
| Reference choice | Chosen appearance/shape survives measurement updates in manual mode; measured facts, plans and pain reports remain unchanged |
| Feasibility branch | T31 executes both CONTINUE DERIVATIVE and DEFER CUSTOM fixtures; fallback retains source detail and Swan workflow without fake custom-asset completion |
| Failure/rollback | Corrupt chunks, delayed versions and rejected exports restore previous approved assets; no mixed body or destroyed health facts |

Future commands: node scripts/anatomy/validate-variants.mjs --registry <registry>; frontend npx playwright test e2e/pain-atlas/variants.spec.ts; representative asset feasibility review above. NOT RUN here.

Release receipt identifies Track A/B/C and actual supported variants. Track A can satisfy the authorized retained-assets release while custom work is deferred. It must not claim the diverse custom library or measured morphology is fully implemented if those remain unavailable.
