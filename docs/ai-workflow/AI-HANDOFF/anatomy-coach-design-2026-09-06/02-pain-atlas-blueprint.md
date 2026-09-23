# Swan Pain Atlas — build the pain chart around Human Atlas

Artifact: SPA-PAIN / owner: Sean / version: 1.3, 2026-09-07 / status: PLANNING ONLY.
Supersedes the v1.0 anatomy presentation, basic-body asset strategy and schematic body wireframes. Preserved originals: .ai-workflow/vault/anatomy-coach-completed-20260906/manifest.json. Existing pain history/privacy, recovery and Coach contracts still apply.

## Corrected product decision

**Easy pain chart is the default.** Clients tap an area, confirm the side, set the pain level and save. Muscle groups, bones and joints are the primary optional location aids. Nobody must choose a tissue type or identify the cause of pain. Veins, nerves, organs, system trees, opacity and explode tools are secondary, behind Explore anatomy. The same detailed Three.js body stays mounted.

**Port the actual Human Atlas viewer and browser-ready anatomy as the fidelity baseline. Its full depth, Swan interface and approved reference/derivative assets become the pain chart.** Sean rejected a simplified body inspired by the reference. The full model and anatomical depth remain the visual foundation. Default reporting exposes a focused musculoskeletal selection view; advanced tools and all individual structures remain available on demand.

Source of visual and functional truth: [Human Atlas live viewer](https://human-atlas-seven.vercel.app/) and [repository](https://github.com/ashemag/human-atlas). The source describes 2,234 distinct meshes across 15 systems. Treat the pinned source manifest as the implementation acceptance inventory; those figures were not independently counted here.

“Easy to use” means a thoughtful control hierarchy and fast reporting. It does not mean a simpler body, flatter rendering, opaque outer silhouette or a miniature anatomy widget next to a form. The body is the dominant workspace on desktop and mobile. The rejected schematic SVG is removed from the current review and preserved only in v1.0 history.

## Diverse references, shared choice and practical asset adaptation

v1.2,2026-09-07: diverse body references for all backgrounds; explicit measured/manual choice shared with Workout Planner; Three.js native Swan integration; derivative assets preferred where practical, retained source assets authorized as fallback.

[14-custom-anatomy-assets.md](14-custom-anatomy-assets.md) governs source/derivative/custom tracks and their feasibility decision. [15-profile-driven-body.md](15-profile-driven-body.md) defines both selection modes, provenance and shared Planner integration. The original source is a valid retained-asset release if custom production is impractical; that fallback preserves full detail, Three.js interaction and Swan branding. It does not claim unsupported anatomy or appearance coverage.

## What to reuse, and what Swan adds

**Reuse the viewer foundation:** existing anatomy assets and metadata, scene composition, materials, camera behavior, orbit/zoom/pan, selection, structure inspection, system visibility, search, isolation, transparency, exploded layout and reassembly. Establish visual/functional parity first. Do not start by rebuilding BodyParts3D, remeshing the anatomy, generating an approximation or replacing the renderer.

**Add Swan's application layer:** role-aware client context; pain and recovery overlays on the actual structures; plain-language report composer; episode history; staff review; workout evidence; Coach integration; accessible controls and brand treatment. All anatomy remains available in the same scene. A client can use the body directly or choose the equivalent region from an accessible list.

**Own the adaptation:** host the reviewed port and assets through Swan's build/asset system, retain code/data credits, and document the changes. The public demo is a review reference only. Production must not send health data to, or depend on an iframe hosted by, the upstream site.

## Three modes of the same full viewer

| Mode | Body and interaction | Controls and workflow |
|---|---|---|
| Pain Chart, default | The full approved source or derived/custom anatomy on the native Three.js viewer; reviewed assembled preset, direct structure/area selection, orbit/zoom and front/back | Compact Report / Recovery / Anatomy navigation. One “Anatomy tools” control reveals the complete toolset without swapping models. Selecting an area opens a contextual report panel |
| Training recovery | The identical anatomy scene and IDs with muscle-group exposure/estimate overlays; pain markers remain independent | Legend, asOf, selected muscle evidence and source workouts. All anatomy tools remain reachable; model gates in 11-training-recovery.md still apply |
| Explore anatomy | The identical scene, assets and selection with full systems/tree/search/inspection controls expanded | Isolate/hide/show, opacity, full and system-specific exploded inventory, presets, source credits and immediate reassembly |

The baseline reproduces the upstream assembled reference preset. Final custom bodies use a reviewed equivalent with recognizable appearance and accessible muscle/anatomy detail, rather than a featureless skin view. Keep the full catalog addressable. The future builder records that preset, camera and source version explicitly. Patient sex/gender does not select or rename a reference anatomy.

Switching mode changes the tool layout and overlays, not the renderer/model. Store the last viewer state separately from the symptom draft. Return to reporting restores the reporting camera and assembled state without losing the selected area, any underlying structure references or draft. “Return to report” may focus the selected region; it must not reset the target client.

## Premium visual direction — Swan Anatomy Studio

The four-phase use arc is **arrive at the human → locate the area → understand the context → record and follow up**. The emotional job is confidence through visible detail and precise feedback. The signature asset is the actual anatomy, not decorative particles or a stylized mannequin.

- **Composition:** a generous, uninterrupted anatomy stage. At desktop sizes, at least 65% of the usable workspace belongs to the viewer while a report panel is open; with tools collapsed, the model can use almost the whole workspace. No tall marketing banner inside the product.
- **Material and light:** retain the source model's tissue colors, depth, silhouette, separation and readable surfaces. Establish original lighting/camera/material parity before Swan theming. Use sapphire/obsidian chrome, Frost White labels and restrained gold accents around the stage. Do not recolor the entire body blue, hide fine anatomy in darkness or wash it out with bloom.
- **Hierarchy:** slim header with target and date, stage-centered tools, selected-part callout, and one contextual report panel. Details expand where they are used. The eye goes to the human first and the next useful action second.
- **Typography:** Swan heading/UI/data families, strong region labels, small but readable metadata. Avoid a grid of tiny anatomical labels over the body; show hovered/selected labels and a searchable inventory.
- **Motion:** precise focus transition and source-quality explode/reassemble motion, cancellable at any point. Pain glow follows actual selected/reported geometry and preserves surface detail. Recovery overlays use the same mapping. Pause/reduced motion and no-idle-render rules remain.
- **Controls:** 44px targets, recognizable layer/search/view/isolate controls, clear active state and tooltips available by focus. Keep the body rotatable without accidentally submitting a report.
- **Density:** extensive capability belongs in organized tool panels. It is valuable depth; preserve it. Reduce repeated instructions, decorative borders and duplicate selectors instead of removing useful anatomy.
- **Mobile:** real detailed 3D body first, never a separate cartoon mobile model. A bottom tool dock and draggable report sheet leave the selected area visible; expanded details can occupy a full sheet while retaining the same scene. Fallback list/2D reporting is available on failure or deliberate user choice, never the main design.

The visual review embeds the public source viewer in the proposed stage beside synthetic Swan reporting controls. This is a planning composition: the source iframe is interactive, while Swan controls are wireframes and do not modify it or save anything. It demonstrates the required visual foundation without claiming an implemented integration.

## Upstream port map — verified source paths

| Upstream file | Preserve | Proposed Swan destination / boundary |
|---|---|---|
| [app/scene.tsx](https://github.com/ashemag/human-atlas/blob/main/app/scene.tsx) | AnatomyScene, scene/camera/material setup, GPU state, picking and renderer lifecycle | BodyMap/atlas/upstream/AnatomyScene.tsx initially; small compatible adapter, then owned extractions after parity |
| [app/anatomy.ts](https://github.com/ashemag/human-atlas/blob/main/app/anatomy.ts) | Atlas/system/type vocabulary, source identity and state conventions | atlas/upstream/anatomy.ts; bridge source IDs to Swan regions without replacing them |
| [app/explosion-layout.ts](https://github.com/ashemag/human-atlas/blob/main/app/explosion-layout.ts) | Visible-part layout and bounds behavior | atlas/upstream/explosion-layout.ts; no rewrite before port passes original validation |
| [app/model-download.ts](https://github.com/ashemag/human-atlas/blob/main/app/model-download.ts) | Existing packaged-geometry decoder/download contract | atlas/upstream/model-download.ts; Swan asset-base resolver, progress, abort and checksum handling |
| [app/pointer-tap.ts](https://github.com/ashemag/human-atlas/blob/main/app/pointer-tap.ts) | Tap-versus-drag distinction | atlas/upstream/pointer-tap.ts; device acceptance retained |
| [app/page.tsx](https://github.com/ashemag/human-atlas/blob/main/app/page.tsx) | Capability inventory, state transitions and source presets | Adapt into Swan tools and facade; translate presentation to styled-components without losing behavior |
| public/ source assets and attribution | Browser-ready geometry, identity metadata and source credits | Versioned Swan asset namespace; preserve exact binaries for the initial parity baseline |
| scripts/validate-atlas.mjs and validate-interactions.mjs | Upstream asset/interaction validation | Preserve in the isolated port test harness and add Swan integration tests |

The existing scene exposes atlas/state and selection/progress/error callbacks, uses batching and per-part GPU state, and owns the rendering lifecycle. Extend that seam. Do not bolt a second anatomy canvas onto the old SVG. [Source scene](https://github.com/ashemag/human-atlas/blob/main/app/scene.tsx).

Compatibility needs an explicit port: source package declares React19 and Three ^0.159, while Swan uses React18 and declares Three ^0.169. Match actual lockfiles and test shader/decoder/controls behavior. Port the viewer onto Swan's stack; do not downgrade Swan globally, install duplicate Three runtimes, or copy the source's full shadcn/Tailwind/Recharts package set. [Upstream package](https://github.com/ashemag/human-atlas/blob/main/package.json).

The current upstream commit SHA is NOT PINNED by this planning turn. GitHub source pages were inspected; the metadata API attempt failed. First port slice freezes the exact source commit, lockfile, licenses, model manifest and screenshots before any adaptation. A moving main URL is not a build dependency.

## Swan component and data ownership

Retain the proven BodyMap route/props facade. Proposed layers:
1. AtlasSourceAdapter owns compatibility with the pinned source viewer and public asset URLs.
2. PainAtlasWorkspace owns role/target and mode composition, with one mounted scene.
3. AtlasSelectionBridge translates selected source part/concept IDs into a reviewed broad region/side and preserves the original IDs.
4. PainOverlayLayer and TrainingRecoveryOverlayLayer own versioned visual state keyed to source parts. They must not overwrite base anatomy materials, visibility or selection state.
5. PainReportSheet, PainEpisodeTimeline and TrainerPainReview own DOM reporting/history/review against the existing proposed server contracts.
6. AnatomyToolPanels expose the retained source functions through Swan controls; AtlasAccessibleInventory provides equivalent search/selection without canvas dependence.

Proposed selection event: {catalogVersion, sourcePartIds, sourceConceptId?, regionId?, side?, mappingStatus}. A mesh/concept reference is not a medical conclusion. When mapping is unavailable, ask for the broad region before saving; keep the anatomical selection in the draft rather than guessing tissue damage. Store stable source IDs under PainLocation.structureIds with a catalog-qualified namespace; renderer batch indices never become persistent IDs.

Report data remains owned by the proposed v2 pain service and immutable observations in 03-contracts-data-privacy.md. A scene click prepares a report; only Save commits it. Actor/target/access epoch fences every response. Existing revision/replay, staff-field privacy, workout evidence and Coach confirmation boundaries remain unchanged.

## Retained capabilities and acceptance inventory

The port must preserve every source system and part, named concepts, search, direct selection, orbit/zoom/pan, camera presets, selected-part focus, system presets, visibility, isolate/hide/show-all, transparency, exploded inventory, reassembly, descriptions/credits, responsive tools and any optional viewer-only integration present in the pinned source. Inventory optional integrations and keep them educational/read-only; a port must not silently expose Swan health data through upstream WebMCP or other public tools.

Mesh count, concept membership, systems, materials and transforms are checked against the pinned baseline. Reference counts are a starting expectation, not substitutes for a real manifest. Rendering the same counts with a visibly degraded body does not pass.

Swan enhancements remain: same-episode observations; uncertain-area reporting; optional symptom context; trainer review/follow-up; actual workout links; separate pain and recovery overlays; private Coach discussion; keyboard/list parity. Existing external body-display alternatives can remain optional reference choices, accurately labeled. The final chart uses the approved source/derivative/custom track under14/15. Detailed source anatomy is the authorized fallback; an exterior-only avatar cannot replace its deep layers.

## Port-first slices and measurable quality gates

S3A: pin and run the unmodified source in an isolated comparison harness; capture assembled, focused shoulder/knee, muscle/skeleton presets, isolated patella and exploded/reassembled views. Run upstream check/asset/interaction commands. No production data.

S3B: copy the reviewed source viewer/assets into Swan's mounted facade with a minimal adapter. Prove the same reference scenes and tools on Swan's installed Three/React versions. Gate before styling or pain overlays.

S3C: run the derivative feasibility sample, then continue reviewed variants or record DEFER CUSTOM and retain source assets (P10/T28,P13/T31). S3D: implement measured/manual reference choice and shared Planner preferences; expose morphology only within the approved rig capability (P11/T29,P12/T30). Baseline and derivative geometry use separate acceptance gates.

S4: introduce the Swan workspace/report sheet and selection bridge; prove same viewer identity across report/recovery/explorer, real save/history and accessible fallback. S5 adds independent glow/recovery overlays and complete tool parity. Existing S6+ workout/Coach/calibration slices remain.

**Fidelity gate T26 / P09 (unmodified source port baseline):** compare source and Swan at the same viewport, device-pixel ratio, camera, preset and asset version. Require identical source inventory and successful interaction fixtures; use image differences to locate defects, then inspect tissue readability, small structures, depth/lighting and selected-area visibility. Any intentional visual departure is documented with before/after evidence. A silhouette, generic mannequin, simplified replacement mesh or “equivalent-looking” redraw fails this gate.

Performance: keep a responsive DOM loading shell, progress/cancel/retry and optional list fallback while the real model loads. Retain the source browser-ready assets for parity; optimize transfer/caching/chunking only after visual and picking equivalence. Delete the old ≤2MiB basic-body target: it incentivized the wrong product. Start with the source-documented payload (approximately33MiB per upstream documentation) and profile representative devices; preserve anatomical content if delivery needs staged loading. No fake complete model during partial loading.

Render-on-demand, reduced motion, disposal, context-loss recovery, 30fps phone/50fps desktop interaction targets and ≤100ms picking feedback remain acceptance targets. Do not claim those passed here. Test small-screen/QHD/4K compositions with the actual model and keep the selected structure clear of panels.

## License, scope and hostile correction

Source app code is MIT; anatomy data uses its separately documented attribution license. Retain notices and credits in Swan's distributed assets/help. [Current official data license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). No source deployment, geometry import, application implementation or production write occurred in this revision.

The v1.0 failure was architectural: it treated the beautiful reference as inspiration while substituting a basic reporting body. This revision makes the actual viewer the dependency and visual acceptance baseline. Beauty and depth are explicit requirements; quick reporting is designed around them.

## v1.3 easy selection contract — P14 / T32

Easy pain chart is the default when clients or staff start a new report, including after an earlier Explore session. A deliberate Explore link can open that workspace with one visible Back to easy pain chart action. Never persist the last advanced view as the default for a new pain report.

Initial scene: assembled body, front/back controls and plain-language selectable regions. Show muscle groups naturally; Areas / Not sure, Muscles, Bones and Joints are optional selection aids. Reviewed musculoskeletal selection proxies make shoulders, knees and back easy to tap without pixel-accurate mesh picking. Hidden veins, nerves and organs cannot intercept Easy-mode picking. Their complete meshes remain available in Explore; hiding layers never deletes or simplifies the anatomy.

Primary action order: location -> confirm/change left/right/center/both -> pain level -> Save report. Never silently guess side from a mirrored camera. A muscle, bone or joint selection describes the client's chosen location, not a diagnosis. Feeling, timing, triggers, notes and precise structure refinement stay under Add details (optional). Broad region/side/score are sufficient to save.

Common-language search and the accessible region list share the same reviewed mapping and save path. Shoulder, knee and lower back return familiar region/side choices first. Joint regions can map to several structures; reporting does not require selecting every mesh or identifying damaged tissue.

An explicit Explore anatomy action reveals system trees, veins/nerves/organs, detailed search, isolation, opacity, explode and reassembly. Training recovery stays secondary to reporting. Returning to Easy atomically restores assembled musculoskeletal presentation and its picking mask, while preserving target, chosen body, semantic location and the unsaved report. Save does not require an Explore visit.

PainAtlasWorkspace owns viewMode and easySelectionCategory; AtlasSelectionBridge owns hit masks and canonical region/side. PainReportSheet owns one draft independently of filters. AnatomyToolPanels own advanced presentation. Loading or failed assets retain complete list reporting; denied access and target switches follow existing private-state clearing rules.

T32 covers entry defaults, optional tissue aids, hidden hit targets, broad/uncertain location, Explore return, keyboard/mobile and identical save semantics. Planned usability median: <=30 seconds from entering Pain Chart to a saved broad-location receipt, without opening Explore. Existing source fidelity/performance budgets still govern. Application acceptance NOT RUN.
