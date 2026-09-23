# Coach Command Center — audit and redesign blueprint

Artifact: SPA-COACH / owner: Coach frontend lead + Sean / version 1.0, 2026-09-06.
Status: PROPOSED, AUDIT ONLY. Extends the existing September 6 experience packet; Universe V3 persistence/review authority remains governing.

## Outcome and audit boundary

Turn Coach into a place a trainer can use through a real session: choose the client once, see the relevant evidence, talk or type, review a concrete proposal, save and see the receipt. For clients, present their own conversation and workout/pain context. Do not make clients manage an operator console.

The whole currently mounted Coach surface was inspected across Talk, Review (Intake, Audio, Drafts) and History. This covers the visible shell and empty/available queue states, plus source tracing of integrations. It does not claim a submitted onboarding, microphone recording, confirmed command, live client-role sign-in or production persistence test. This audit does not cover every dashboard in SS-PT.

## Audit findings and proposed treatment

| Priority / ID | Evidence | User consequence | Concrete redesign and acceptance |
|---|---|---|---|
| P1 CC-A1 | Live empty Talk input below 1097px viewport; 190px context header | Start a conversation requires finding the composer | Header ≤88px in desktop content area; grid bounds transcript with reachable composer; no initial document scroll needed for primary input |
| P1 CC-A2 | Live selected-client header with “No client selected” new thread; multiple main/current selectors | Uncertain recipient for a write | One authoritative target; explicitly separate pinned default from current thread only when they differ; target preview before any commit |
| P1 CC-A3 | Intake next-action hold versus “no active intake work” summary | Conflicting instructions undermine trust | One queue state projection; selected item has one status and one next action; unknown/error distinct from clear |
| P1 CC-A4 | roleConfig normalizes unknown to admin | Wrong controls can appear during role uncertainty | Pending/denied role, never default-admin UI; server authorization unchanged and tested |
| P2 CC-A5 | Review blends task queue, audio roster, onboarding coverage, chat and multiple actions | Too many mental contexts | Review opens a queue→working document pattern; one active artifact and contextual action footer |
| P2 CC-A6 | History mixed scopes without explicit all-clients label | Easy to reopen wrong conversation | Default current-client History; explicit All clients for authorized staff, search and preview target/date/status |
| P2 CC-A7 | Live Audio no matching target while header selected | Lost context and unclear recovery | State whether no matching imported speaker/client, no roster data or fetch error; retain user target and provide explicit reassignment review |
| P2 CC-A8 | Local FocusLens uses tiny decorative Three.js, 8px caption | Occupies attention with little session value | Replace with compact meaningful evidence chips or optional functional Pain Atlas preview; no decorative 3D dependency in chat startup |
| P2 CC-A9 | Wide left ops rail plus shell/title/secondary descriptions | Content density spent on instructions | Navigation rail is collapsible; one concise helper per task, details on demand; backend tools live in contextual menus |
| P2 CC-A10 | Multiple implementation worktrees and stale source-structure tests | Cosmetic merge can regress durable writes | S0 reconcile chosen source; preserve V3 action state machine and replace obsolete structural assertions with behavior coverage |

CC-A2/A3/A7 are observed inconsistent presentations; their backend causes are UNPROVEN. Record controlled fixture reproductions before repair. Current code and live deployment differ; neither can substitute for release identity.

## Three directions and choice

| Direction | Four-phase arc | Useful design patterns / emotional job | Signature and motion | Tradeoff |
|---|---|---|---|---|
| A — Swan Care Console (doctrine-led) | Orient → inspect → act → acknowledge | Crystalline cards, labeled context, visible coaching tools; confidence and brand continuity | Sapphire evidence spine, restrained panel transitions | Closest to current brain; can preserve too much chrome if every module becomes a card |
| B — Session Desk (independent proposal) | Select client → work in conversation → inspect document → finish | One header, transcript, contextual working document; speed and concentration | Typographic task title and precise status rail, minimal motion | Strong ergonomics; needs brand/material detail to avoid generic chat-product identity |
| C — Coaching Desk (recommended hybrid) | Know who → understand evidence → approve next step → see saved proof | B's task structure plus A's colors, geometry and disciplined evidence styling | Functional anatomy when relevant, otherwise task document; one signature per screen | Requires careful context state ownership and progressive disclosure, addressed below |

These are design proposals generated in this session after applying the Swan Design Brain. They are not outputs from three independent paid models and the preference is not a measured usability result. See visual review and the controlled evaluation plan before deciding empirically.

## Final information architecture

Desktop app shell → compact Coach header → tabs **Talk / Review / History**. Keep existing tab identities and route/query aliases until consumers migrate. Header contains target, optional session context and one “More” menu. Target selection exposes no duplicate full roster. An unsaved draft or active operation requires keep-current/cancel-switch/discard-draft resolution; data never follows the wrong client.

Talk: 56–64ch readable conversation column, composer in a bounded bottom grid row, optional right working panel. Empty state: one actionable prompt and at most three contextual quick actions, based on actual role/data. Quick actions insert or open review; they never silently execute writes. Coach explanations cite workout/pain evidence with observation date. “Thinking” has stop behavior and honest timeout, not fake progressive output from a synchronous endpoint.

Working panel: visible only for a selected proposal, workout draft, pain episode, notes or evidence item. Its title states what it is and whose data it contains. One primary action, a secondary cancel/back, details accordion. A proposal includes before/after, target, source revision, affected records and permission-required state. Successful save replaces the editor with a receipt and “Open saved workout/report.” Do not leave an enabled Confirm button after a committed result.

Review: one task queue with filters by type/state/target, selected item details and next action. Intake steps and readiness derive from one server-backed state projection; Audio shows source matching/editable transcript with privacy-safe previews; Drafts shows onboarding/workout document and validation fields. Target changes require explicit scope choices; no hidden assignment of an all-client task to the header client.

History: selected-client scope by default; staff can choose All clients. List rows show task kind, date, target indicator and status. Open by stable server conversation ID. Pagination is visible, loading does not reset selection, and stale/deleted/forbidden conversations have a recoverable state. Preserve draft protection when opening another thread.

Mobile: compact header plus three tabs, one workspace at a time. Working panel becomes a full-height sheet with its own title, close button, focus trap and return focus. Composer uses visualViewport/safe-area behavior and remains reachable above keyboard; no second nested scroll trap. Review queue switches to detail and Back restores queue scroll. At 320px and 200% zoom, actions wrap instead of shrinking below 44px.

QHD/4K: expand evidence space, not text line length. Optional queue rail 280–360px + conversation 640–800px + working document 360–560px; remaining width supports purposeful margin or a selected evidence comparison. Do not mandate six columns. Panels can resize within accessible minimums; no empty giant central void or stretched chat bubbles.

## Capability retention map

| Existing capability / source | Destination | Contract that must remain |
|---|---|---|
| `useAIChat` conversations/messages; current page transcript/dock | Talk + History | `/api/ai-chat/conversations`, conversation detail/messages; actual synchronous response shape, retry/abort and server identity |
| `useCoachCommand` execute/confirm/cancel | Proposal panel + receipt | `/api/ai-command/execute`, `/api/ai-command/confirm`, `/api/ai-command/cancel` (`useCoachCommand.ts:96,170,207`); durable intent and duplicate-confirm protection from owned V3 |
| useCoachPinnedClient + client bar | Header default preference | Pinned client is a preference, not permission or automatic retargeting of existing thread |
| Notes / client notebook | Working panel, contextual open action | Main-client note scope, visibility, persistence and history remain; no health notes in localStorage |
| Workout logger/planner links | Talk quick actions + receipt deep links | Current role-aware route helpers and canonical `/api/exercises/library`; actual workout persistence remains backend-owned |
| `CoachReviewPanel` IntakeWorkspace | Review→Intake | Retention identity, duplicate matching, validation, saved source material and durable recoverability |
| `PlaudMergeWorkspace` | Review→Audio | Upload/merge identity, transcription source, matching review, provider permission and existing limits |
| `CoachWorkbenchPanel` / onboarding | Review→Drafts | `/api/clients/onboard` and current confirmed draft flow; no background account creation |
| Voice / `useGeminiTranscription` | Composer mic + recording state | Explicit user activation, recording indicator/stop, upload consent and current multipart contract; no ambient recording |
| Teach / owner operations / account tools | More menu, role-qualified workspace | Preserve role gating and explicit writes; never expose Sean-only Hermes/operator tooling to clients |
| Pain Atlas / recovery | Evidence panel + full-screen route link | Same target and source revision, private data; draft recommendation goes through existing confirmation |

Names identify current source capabilities, not proof all contracts passed. Inventory dynamic action registries, menu actions, keyboard shortcuts, deep links and hidden role gates in S0; every currently useful action receives a destination or an explicit owner-approved retirement. “Destroy the UI” authorizes a redesigned presentation, not loss of backend behavior or existing records.

## State and integration contract

One `CoachWorkspaceContext` owns actor/role, selected target, conversation ID, task ID and access epoch. Derived labels read it. Do not make three providers independently own the target. `useAIChat` remains conversation authority; durable command lifecycle remains server authority. A facade maps the reconciled current implementation into typed view models; it does not invent a second command executor.

Conversation states: idle → submitting → waiting → received; interrupted → checking server outcome → received or known-failed. Proposal states: draft → validating → reviewable → confirming → committed; rejected/conflict/expired/revoked return a scoped recovery state. Unknown outcome is distinct from failure. Client switch and logout abort display work, clear private caches, fence late responses by access epoch and never relabel an old result.

Keyboard: tab order follows target→tabs→workspace→composer/actions; Escape closes non-destructive popovers and restores trigger; never cancels a committed operation. Enter behavior documented (Enter send, Shift+Enter newline if that is current configured pattern); screen reader live regions announce status once. Status text contains specific action/next step. Error banners sit by the affected component; global auth expiry blocks private content.

Operational metrics: composer initially reachable, target switches with stale-response suppression, queue unknown-state rate, confirmed action duplicate count, receipt recovery success, p95 interaction latency. No conversation text or client identifiers in analytics. Plan usability goal: ≥90% correct-target completion on scripted tasks, zero unintended writes, median one navigation step to relevant evidence. These are acceptance targets, not measured results.

## Rollout boundary

Ship in facade → header/composer → Review → History → pain/recovery contextual integration slices. Retain old shell behind a flag until capability parity and real role/persistence tests pass. Rollback only the shell; keep server receipts and pending intents recoverable from either view. Review chain remains builder → Gemini review when authorized → Codex hostile input → Fable Final Decider/commit gate. No paid review or deployment occurred during this plan.
