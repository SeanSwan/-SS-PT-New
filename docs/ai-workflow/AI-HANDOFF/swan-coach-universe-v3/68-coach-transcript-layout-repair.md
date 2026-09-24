# Coach transcript containment repair

Version1, 2026-09-12. Continuation of plans55/48, not a replacement architecture. B2 actual mobile observation found a production layout defect; repair before the existing HR12 queue. Root Astra owns adjudication, Luna bounded implementation. Final combined review stays deferred under Sean's override; no provider/spend/release authority changes.

## Requirements and preserved baseline

R68-1: real CoachIntentBar sits above the transcript at390x844 and1440x900. R68-2: transcript/message text remain horizontally contained and readable; document overflow alone is insufficient. R68-3: composer controls, keyboard interaction and existing mobile minimums remain usable. R68-4: preserve real auth, target/thread, save/confirm rules and existing dark-first design; no new layout component or data behavior.

Actual baseline b2-mounted-browser-reviewed-receipt.json reports7 transport/DOM checksPASS but VISUAL REVISE. Screenshot b2-mounted-browser-01.png proves a narrow clipped right-hand transcript. No fixture controls were injected. Real page162 mounts IntentBar + Transcript siblings; crystallineFocusStyles140 declares display:flex without direction, leaving a row. bridgeDockStyles sets column only on the transcript. shell overflow-x:hidden conceals this from document width. Authenticated trainer fixture and controlled replies are not provider-quality evidence. Preserve all original receipts; they remain limited, not retroactively passed visual proof.

## Blueprint, ownership and exact files

Only crystallineFocusStyles.ts and existing e2e/coach-command-center-mobile.spec.ts are editable in this slice. Set column direction and shrinkable width ownership on the existing chat panel/transcript. Keep existing components, shell, intent controls and composer. Do not expand to IntentBar styles unless measured independent overflow establishes a separate exact amendment. No production/test debug hooks.

## Desktop/mobile wireframes and states

Both existing layouts: [header/client] -> [Talk Review History] -> [intent chip/input/mic/Send] -> [full-width transcript header/stream] -> [composer]. Desktop may keep existing outer panels; these two Talk children always stack. Mobile390px: each child occupies the available panel width, with no text beyond the stream. Empty/loading/current error/retry/permission denied retain existing content and actions in that same geometry. Keyboard focus and44px controls stay unchanged. This textual wireframe extends existing plan55 visual contract; actual screenshots must be inspected, not just measured.

## Flowchart and contracts

Mermaid source (render NOT RUN):

~~~mermaid
flowchart TD
 A[Mount actual Coach Talk] --> B[Stack intent controls above transcript]
 B --> C{Bounds and text readable?}
 C -->|yes| D[Composer interaction and visual inspection]
 C -->|no| E[Record measured failure and repair exact styles]
 E --> B
 D --> F{All required checks pass?}
 F -->|yes| G[Local receipt; continue HR12]
 F -->|no| E
 E --> H[Restore only scoped snapshot if rollback needed]
~~~

Contract: existing .chat-panel/.chat-transcript/.transcript-stream class ownership and DOM order remain; no API/events/storage/auth changes. State/sequence/ERD/privacy data diagrams N/A because this is CSS containment, not a new state or data path. Existing permission/PII/confirmation boundaries remain unchanged. No new memory, persistence or migrations.

## Tests, traceability and operations

R68-1/2 -> T68-geometry: strengthen existing mobile matrix with panel/intent/transcript bounds, above/below relation, minimum usable width and visible message text containment. Existing suite's height/global-overflow checks alone are insufficient. Observe intended geometry RED on current style, then GREEN after repair. Real browser fixture must retain actual page/owner/auth hierarchy; provider/message replies controlled and network isolated. Inspect actual390px +1440px screenshots. R68-3 -> T68-controls: retain original composer input/More/Mic/Send matrix checks. R68-4 -> T68-scope: exact diff, source hashes, no save/provider requests; existing B2 1280test compatibility is a historical baseline, not a fresh layout result.

Commands: existing Playwright test file with the task-owned Vite4990 via explicit BASE_URL; use a task-local configuration if default config starts unrelated services. Isolated authenticated fixture may repeat the existing two-reply route journey at390/1440, exact synthetic owned row cleanup only. Do not reset shared DBs. Tests NOT RUN for the new geometry assertions. Root records actual commands/exits, viewports, failures and screenshots.

Entry: B2 narrow transport exit recorded, this plan and preserved source hashes; no active source writer. Exit: meaningful geometry regression, controls, screenshots inspected, scoped diff, actual source hashes. No new runtime loop or performance cost expected from CSS; measure stable frame/layout without animation changes. Rollback restores only scoped style/test snapshots after checking ownership; preserve evidence. Operational owner is existing Coach frontend. Missing evidence blocks layout verification. Final combined review, full C selection/Desk/Logger, other pending defects, backend gaps and production release remain separate requirements.
