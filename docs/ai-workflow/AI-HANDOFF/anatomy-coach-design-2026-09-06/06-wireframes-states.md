# Wireframes and interaction states

Artifact: SPA-WIREFRAMES / owner: frontend/design lead / version 1.3, 2026-09-07.
Status: v1.3 SOURCE-VIEWER COMPOSITION. Open review.html. The rejected schematic body has been removed. The actual public Human Atlas viewer occupies the anatomy stage; surrounding Swan controls are non-saving wireframes. The external iframe demonstrates the reference only; production uses an in-app source port with no private data crossing to that site.

## Required layouts in the visual review

Desktop Pain: compact target/header → Pain Chart / Training recovery / Explore anatomy → dominant full Human Atlas stage plus contextual Swan report panel → episode history. Pain is default. Report panel begins with plain-language region/side, score and save. Feeling and other symptom details are optional and collapsed. Recent entries never require entering the explorer.

Mobile Pain: one-column title and tabs → the same detailed Human Atlas body with accessible region selector → compact report bottom panel; report opens a full-height sheet on selection. Sticky save is within safe area and appears after required inputs; background scene pauses. A “Choose from list” path remains complete without WebGL.

Desktop Recovery: body with group-level overlay, independent reported-pain outline, legend and asOf → selected muscle evidence showing source workout, set count, last-trained time, mapping coverage and estimate status → private Victory trend with an accessible data table. Empty or invalid data produces no “fresh” color.

Desktop Explore: system tree/search at left, assembly center, selected structure details at right, explosion/opacity tools at bottom. Back to Pain Chart is always visible. List and search offer identical selection effects. Fifteen systems remain available; no conversion of internal structures to diagnostic symptom locations.

Mobile Explore: body first; search and systems in accessible sheets, tools in a labeled drawer. Do not pack fifteen tiny icon toggles above the model. One active sheet; Back restores canvas focus/selection. Reset view resets viewer transforms/visibility, not the pain draft.

Coach desktop: one target header; Talk/Review/History; conversation and bottom composer; optional working document. Coach mobile: same task hierarchy, document replaces conversation in a sheet. Three concept cards in review compare A/B/C; the recommended hybrid has both desktop and mobile wireframes.

## State coverage matrix

The visual review's state selector renders compact examples for all rows below; these are not live backend results. Full interactions and wording are specified here for builders.

| State | Pain / recovery | Coach | Focus and next action |
|---|---|---|---|
| Loading | Geometry progress independent from records; list entry usable; recovery skeleton says loading | One target skeleton, chat list pending, composer disabled only for necessary boundary | No shifting focus; announce completion once |
| Empty | “No pain reports yet” after successful authorized empty response; recovery “No logged workouts” | One prompt with relevant quick actions; empty queue truthful | Report/select action first; no fabricated data |
| Partial | Some systems unavailable: retry layer; incomplete muscle mapping labeled | Available evidence remains; failed queue subsection has retry | Do not disable unrelated work; clear missing source label |
| Success | Saved receipt with episode/date and undo only if real correction flow exists | Committed result plus open saved record | Focus receipt heading, retain target; no duplicate confirm |
| Denied | Clear private body overlays and draft on revoked access, retain public geometry only | No admin affordances during role load; blocked target | Focus denial heading; choose allowed target or sign in |
| Validation error | Region/side/score inline errors, summary links; entered details retained | Concrete missing draft fields and target mismatch | Focus first invalid field; no request issued until valid |
| Failure | “Couldn't load reports/recovery”; retry; never no-pain/no-flags success | Scope affected task and preserve unsent text | Retry same read; write outcome checked before retry |
| Retry / unknown save | “Checking whether your report saved”; same mutation ID | Confirm result unknown; recover durable receipt | Disable fresh duplicate submit; cancel UI cannot undo committed result |
| Recovery / conflict | Show latest server observation and draft difference; choose reviewed update | Refresh proposal from changed source before reconfirm | Focus conflict summary; no automatic overwrite |
| Cancel / defer | Keep drafting, discard unsaved, or return; no health localStorage | Defer proposal/queue item under existing server support | Return to trigger; explain tab-lifetime draft persistence |
| WebGL unavailable | DOM region list and 2D fallback; report/save fully usable | Evidence panel text remains, canvas optional | Retry 3D without losing draft; never mandatory GPU support |
| Stale / incomplete estimate | asOf badge, coverage reasons, no healing/clearance statement | Coach cites stale/unknown evidence and requests refresh | Separate Refresh and Review pain actions |

## Input and accessibility contract

Canvas is supplementary. Region list, left/right selectors, systems tree, search, structure information and transform controls are DOM controls with accessible names. No requirement to trace a precise pixel to log pain. Selection announces anatomical label + side + selected status once. Sliders support arrows, Home/End and numeric entry; reset has a clear scope label. Do not hijack arrow keys while the user types.

All controls ≥44×44px; text contrast ≥4.5:1, meaningful non-text controls ≥3:1. Visible focus follows token standards. Legends include label/icon/pattern, not color alone. Canvas gets a succinct description, not thousands of focusable meshes. Search list virtualizes without dropping focused option. Reduced motion replaces transitions with state changes, not hidden feedback.

Browser Back navigates predictably; session draft protection runs before target/route change, never after data is lost. Modal sheets trap focus, Escape closes when no commit is in flight, background inert, close returns to origin. At 200% zoom and 320px width, content reflows and actions remain reachable. Native text input and zoom are not blocked.

Required product QA widths: 320, 375, 414, 768, 1024, 1280, 1920, 2560×1440 and 3840×2160 CSS viewports. Include portrait/landscape mobile, keyboard open, reduced motion, high contrast and WebGL disabled. Log actual DOM viewport; unsupported requested sizes are NOT RUN. The earlier live browser override failure is explicitly recorded in 01-baseline-audit.md.

## Diagram applicability

All conditional diagrams apply: state (draft/command), sequence (authorized idempotent save), ERD (observations and derived recovery), permission matrix (self/assigned/admin), privacy flow (public assets vs private health vs bounded Coach), operations (feature flags, cache invalidation and rollback). No headless N/A exemption. Mermaid source is supplied in diagrams/ and rendered in review.html when its pinned public dependency is available; the final evidence records rendering success or limitation.

## v1.1 personalized-body composition

The review includes an HTML inspector wireframe for profile sources, appearance and reversible customization. Synthetic values demonstrate layout only; they do not morph the public source iframe. Desktop places the inspector beside the full scene; mobile uses a contextual sheet with the same model.14/15 govern diverse reference options, measured/manual modes, Planner integration and retained-source/derivative asset tracks. Personalized loading/partial/stale/denied, unsupported fit, preference conflict/cancel and rig rollback paths are specified in15 and rendered in personalization-flow.mmd.

## v1.2 shared mode wireframe

The review includes two interactive planning choices, Use my measurements / Choose a reference body. Each changes the inspector explanation only; neither alters the public source iframe. The same control opens from Planner client context. Desktop uses the contextual inspector; mobile shows the two44px choices and a sheet with mode, available reference/appearance, source/fit status, Use this body and Cancel. Saved manual mode survives new measurements. Missing assets, unsupported rig, stale data, conflict and denied access retain the states in15. No nationality chooser controls anatomical inference.

## v1.3 easy default — desktop/mobile and states

Desktop: dominant detailed body, front/back and region search; compact Areas / Muscles / Bones / Joints aids; selected region + side + pain level + Save. Add details (optional) is collapsed. Explore anatomy, recovery and body customization are secondary.

Mobile: same body, optional view selector, Choose from list and a report sheet with region/side/score/Save. Keep the selected area visible until sheet expansion. Controls remain at least 44px with keyboard/list parity. No system tree or tissue taxonomy is required.

States: no selection asks Where does it hurt?; ambiguous hit offers broad region / Not sure; filter changes retain selection; loading/failed mesh offers complete list reporting; invalid side/score retains draft; denied access clears private state; cancel never saves; Explore -> Easy restores assembled presentation and picking without discarding report/body preference.

The review demonstrates category selection, optional detail disclosure and Explore return through synthetic DOM controls. Its public reference iframe retains upstream panels; the final native Easy view will hide those advanced panels. No preview control manipulates that iframe or persists health data.
