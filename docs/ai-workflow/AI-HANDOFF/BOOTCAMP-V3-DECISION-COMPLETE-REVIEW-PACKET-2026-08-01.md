# SwanStudios Bootcamp Creator V3 — Decision-Complete Review Packet

**Date:** 2026-08-01  
**Audience:** Opus 5, Kimi K3, HY3  
**Purpose:** Independent, hostile, implementation-ready blueprint reviews  
**Privacy:** Sanitized repository evidence only. No client PII, secrets, credentials, production exports, or private identifiers.  
**Exclusion:** Do not call, cite, or gate on Fable.

## The assignment

Design the Bootcamp Creator as an enterprise-grade trainer class operating system. You have authority to recommend refactoring any relevant frontend, backend, API, model, service, or state-management layer needed to reach that quality. Your plan must name the migration, compatibility, verification, and rollback path. Do not prescribe a greenfield rewrite merely because it is cleaner.

Sean needs a decision-complete blueprint describing **how you would build it**, not generic suggestions and not a list of choices for another engineer to make. Make the decisions. Where a viable alternative exists, choose one and briefly say why the other is rejected. Only surface an owner question where an external product decision is truly unavoidable; include your recommended default and its consequence.

## Product outcome

Build a trainer-facing system that can:

1. Generate challenging, exciting, non-generic classes from the canonical Exercise Rolodex.
2. Keep every class draft editable, whether it began as AI-generated, manual, hybrid, copied, or dictated.
3. Add, replace, swap, move, reorder, duplicate, pin/lock, delete, and mix exercises freely.
4. Copy real classes taught at work into reusable, editable drafts and save them as templates without overwriting the source.
5. Accept natural voice dictation for creation and edits, always with transcript, proposed change, confirmation, and undo.
6. Capture fast post-class ratings/feedback, then learn bounded, explainable trainer preferences without collapsing into the same favorite exercises.
7. Produce high-intent muscle stations—especially quads, chest, lats/back—with real exercise quality, movement variety, safe alternatives, and exciting class flow.
8. Support high-intensity, low-impact, beginner, joint-friendly, and heart-rate-capped training within the same class, without singling out participants.
9. Feel premium and practical at 6 a.m., not tacky, overly glassy, or generic.

Bootcamp generation is trainer/class centered, not client-personalized. Group constraints may be anonymous (for example, knee-sensitive count); do not introduce client PII or per-person public accommodations.

## Canonical surface receipt

The canonical surface is the admin/trainer dashboard Bootcamp route, not the legacy standalone alias.

| Layer | Evidence |
|---|---|
| Dashboard route catchall | `frontend/src/routes/main-routes.tsx:926` |
| Canonical `/bootcamp` role route | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:152,203` |
| Mounted page | `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:86` (`BootcampBuilderPage`) |
| Legacy alias | `frontend/src/routes/main-routes.tsx:668` (`/bootcamp-builder`) |
| Generation hook | `frontend/src/hooks/useBootcampAPI.ts:61` |
| Exact API path | `frontend/src/hooks/useBootcampAPI.ts:80` (`/api/bootcamp/generate`) |
| Backend mount | `backend/core/routes.mjs:425` (`/api/bootcamp`) |
| Adjacent mount | `backend/core/routes.mjs:426` (`/api/bootcamp-sprints`); no shadow of `/generate` |
| Generation handler | `backend/routes/bootcampRoutes.mjs:59` |
| Template/log/history handlers | `backend/routes/bootcampRoutes.mjs:127-205` |
| Authoritative Exercise fields | `backend/models/Exercise.mjs:70,82,96,341,350` |

## Current-state truth

### Voice / Swan Coach

Mounted: `BootcampBuilderPage` mounts `BootcampCoachDockMount`; that mounts the shared microphone-enabled `SurfaceCoachDock`. `useBootcampAiEvents.ts` can adjust class structure, duration, and format.

Defects: `AI_BOOTCAMP_PLACE_EXERCISE` and `AI_BOOTCAMP_LOAD_TEMPLATE` are explicitly unhandled. Voice cannot add, replace, move, pin, remove, or copy exercises/templates. There is no editable transcript, proposed-diff preview, Apply, Cancel, Undo, or operation receipt. It is a settings shortcut, not a real class-building interface.

### Manual / Hybrid Rolodex

Mounted: Builder supports AI, Manual, and Hybrid. Manual/Hybrid expose a Rolodex panel. `handleAddFromRolodex` can add to the active/first station; `handleDeleteExercise` can delete.

Defects: AI-generated classes are less editable because delete/station editing is disabled in AI mode. There is no coherent replace-in-place, move-to-station, reorder, duplicate, pin/lock, multi-select, or accessible no-drag workflow. The trainer browses a static list when the high-frequency job is a fast, legal replacement for one specific class slot.

### Copy / reuse / remix

Mounted: `POST /api/bootcamp/save` saves templates. `GET /api/bootcamp/templates` returns hydrated templates. `useBootcampAPI.getTemplates` exists. `BootcampTemplate` already carries `timesUsed`, `lastUsedAt`, tags, metadata, class style, intensity category, format, duration, and difficulty.

Defects: no mounted Class Vault/template library in the canonical Builder; no Copy to Draft, Duplicate, Remix, version history, provenance, or Save as New. Voice loading is unhandled. A real class taught at work cannot be captured, normalized against the Rolodex, reviewed, and made reusable in one flow.

### Ratings / learning

Mounted: `POST /api/bootcamp/log` accepts `classRating` (1–5) and `energyLevel`; `BootcampClassLog` stores rating, energy, notes, modifications, exercise use, participation, and date. `BootcampTaughtPanel` displays historical ratings.

Defects: current Mark as Taught payload omits rating, energy, and notes; no rating interaction is mounted. Generator does not learn from ratings and primarily excludes recently taught exercise names. No transparent preference profile, confidence threshold, decay, reset, or explanation exists.

### Immediate selection-quality repair already in local WIP

An uncommitted repair handles the taxonomy/repetition defect: canonical station-token mapping, muscle-specific ranking, compound/exercise-quality scoring, movement-family diversity, recent-history avoidance, and station variety. Local evidence: 108/108 backend Bootcamp tests, 134/134 frontend Bootcamp tests, Vite production build green; Rolodex diagnostic reports 916 active exercises and zero unknown target buckets; two Quads/Chest/Lats generations had zero name overlap. Treat this as V3 baseline—not as the solution to workflow, learning, copy/remix, or voice.

## Existing plans to preserve and improve

Repo blueprints already propose canonical Rolodex sourcing, inline autocomplete, Manual + Hybrid editing, template duplication, class history/rating, drag/reorder, and a `SwapDeck`: show a few validated replacements for the current slot and make Browse All a secondary escape hatch. Preserve existing routes, models, media/PDF plumbing, the Builder/Runner split, and tested Rolodex integration unless you identify the precise defect and transition path.

The accepted dignity rule is station-level alternatives and anonymous group constraints—not per-person public swaps.

## External UX reference principles (visually inspected; do not copy visuals)

1. Exercise list editors work best with numbered slots, visible local actions, inline search/add, and explicit save/reorder. Drag is optional convenience, never the only operation.
2. Template libraries should show usage/last-used metadata; Duplicate creates a separate editable draft and preserves source provenance.
3. Dictation needs explicit permission and idle/listening/stop states; transcription stays editable before submission.
4. Post-class feedback should be progressive: one overall rating first, optional reason chips and notes second.

## Design system and operating constraints

- Sean selected **Crystalline Class Rail**.
- Dense trainer/admin working surface, not a cinematic marketing page.
- Dark-first Crystalline Swan tokens, styled-components only; no Material UI or Tailwind.
- 44px minimum interactive targets; 64px primary live-class actions when appropriate.
- WCAG 2.2 AA, keyboard path, visible focus, reduced motion, and non-drag alternatives.
- First-class layouts at 414px, 768px, 1024px, 1440p/QHD, and 4K.
- Reject giant heroes, identical-card walls, purple/cyan overload, glow spam, glass-on-glass nesting, hidden hover-only controls, tiny chips, and drag-only editing.
- One signature interaction: Class Rail should make class structure/progression tactile, calm, and immediately legible.

## Mandatory blueprint deliverable

Return an implementation-ready specification—not production code—with every item below.

1. Executive thesis: exactly what you would build and why.
2. Complete screen inventory: each screen/panel/drawer/modal/sheet/state and responsive variant, with entry point, purpose, primary/secondary actions, exit, undo.
3. Exact information architecture linking Builder, Class Rail, station canvas, contextual SwapDeck, full Rolodex, Class Vault, Runner, voice review tray, and post-class feedback.
4. Two Mermaid diagrams:
   - user/data flow: generate or copy → edit → run → taught log → feedback → bounded learning → next generation;
   - component/service/data flow naming frontend state boundaries, endpoints, services, models, and persistence.
5. Detailed text wireframes for desktop Builder, phone Builder, live-class Runner/quick-swap, Class Vault/copy-to-draft, and feedback sheet. Label hierarchy, controls, state, and 44px+/64px targets.
6. Interaction contracts for add, replace, swap, move, reorder, duplicate, pin/lock, delete, undo, save draft, save as template, update existing, copy taught class, and discard. Identify reversible vs persisted operations.
7. Voice command grammar: at least 20 natural trainer utterances across generate/copy/edit/swap/reorder/accessibility/format/save. For each include parsed intent, entities, ambiguity handling, proposed diff, confirmation, and undo receipt. Voice may never silently mutate a saved class.
8. Full data/API blueprint: Sequelize models, columns/types/indexes/relations, migration order, request/response contracts, auth, errors, idempotency/concurrency, provenance/version/draft semantics, audit records, retention/reset policies.
9. Exact generation/learning algorithm: hard filters, ranking inputs, diversity, recency, cold start, feedback features, min sample/confidence, decay, exploration, anti-overfit behavior, explainability payload, reset/disable. Separate deterministic safety from learned preferences.
10. Inclusive programming contract: how primary intensity, low-impact, equipment-poor, beginner, joint-friendly, and heart-rate-capped variations coexist without weakening intent or calling out people.
11. Visual system specification: token roles, type, spacing, geometry, density, motion/reduced motion, focus/accessibility, and explicit anti-tacky constraints sufficient for a builder to implement without taste decisions.
12. Phased delivery plan: slice order, likely files/modules, dependencies, migration and compatibility path, flags, tests, rollout, acceptance criteria per slice.
13. Decision register: numbered choices, rationale/tradeoff, rejected alternative, and consequence.
14. Hostile validation plan: failure modes, abuse, accessibility, responsiveness, migration rollback/forward, and exact tests before release.

### Opus 5: hostile architecture and product authority

Return the 10 highest-risk defects; choose the smallest coherent refactor for immutable source template + editable draft/remix, typed voice operations, bounded learning, always-editable drafts, and Slot-aware Rolodex operations. Specify model/API/migration/concurrency/undo/audit/privacy/backward compatibility. Critique Class Rail for tackiness, density, accessibility, and live-floor ergonomics. Include V3 core / fast follow / later / rejected cut list.

### Kimi K3: class intelligence and community-energy authority

Design exact class ranking and pacing logic balancing muscle intent, quality, equipment/setup cost, flow, novelty, intensity, accessibility, and learned trainer preference. Define inclusive class archetypes that are joyful, communal, musical, and high-energy without stereotype or cultural cosplay. If web research is available, study public ethical examples of community bootcamps serving Black neighborhoods and diverse communities; cite sources, separate evidence from inference, and extract transferable principles only. Define Teach → Rate → Learn, real dictation grammar, and a full implementation path.

### HY3: UX/UI systems authority

Define the complete responsive information architecture and controls for the always-editable Builder, Rail, station canvas, SwapDeck, Rolodex, Vault, voice tray, and feedback. Provide 2–3 fully described concept variations within Crystalline Class Rail, recommend one, and provide the exact no-tacky visual guardrails. Include desktop/tablet/phone/QHD/4K behavior, loading/error/empty/success states, keyboard, touch, and non-drag paths.

## Cross-review quality bar

Rank findings P0–P3. Name assumptions and genuine uncertainty. Do not claim a surface or feature is live unless supported by the evidence above. Do not make a vague essay substitute for artifacts. Do not write production code. This is a decision-complete technical, product, and UX specification for a subsequent implementation slice.
