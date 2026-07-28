# Local Current-State Audit

Date: 2026-07-03
Scope: local SwanStudios repository files only.
Status: planning and audit artifact only. No production code was changed.

## Executive Verdict

SwanStudios already has the bones of a high-end AI operating system:

- Prompt routing exists through `prompt-watcher`.
- Strategy pressure exists through `grill-me`, `chromie`, `swan-orchestrator`, and the hostile-review loop.
- Design routing exists through `swan-design-router`.
- Closeout routing exists through `closeout-evidence-lock`.
- AI Village exists as an expensive, gated validation layer.
- Hermes exists as a Sean-only operator lane and has an in-app `/api/hermes` task surface.
- The Swan Coach Cortex brain vault exists as Obsidian-compatible markdown for future Hermes ingestion.

The problem is not lack of ideas. The problem is that the system is split across many docs and partly stale references. Before giving Hermes more authority or asking Fable to build more, the next upgrade should consolidate the routing map, fix stale doc references, and make a canonical "which brain/tool handles which job" registry.

## Local Evidence Used

Core operating docs:

- `AGENTS.md`
- `CLAUDE.md`
- `ACTIVE-INDEX.md`
- `.ai-workflow/coordination/claude.lane.md`
- `.ai-workflow/coordination/review-queue.md`

Design docs:

- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`

Hermes docs:

- `docs/ai-workflow/references/HERMES-WIKI-MYTHOS-MASTER-PLAN.md`
- `docs/ai-workflow/AI-HANDOFF/HERMES-ARCHITECTURE-UPGRADE-2026-04-22.md`
- `docs/ai-workflow/AI-HANDOFF/HERMES-BRIDGE-NEXT-PHASE-PLANNING-INPUT-2026-04-22.md`
- `docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`

Coach brain docs:

- `docs/ai-workflow/coach-brain/README.md`
- `docs/ai-workflow/coach-brain/05-client-output-privacy.md`
- `docs/ai-workflow/coach-brain/06-full-plan-pdf-contract.md`
- `docs/ai-workflow/coach-brain/07-implementation-roadmap.md`
- `scripts/coach-brain/brain-contract.mjs`
- `scripts/__tests__/coach-brain-contract.test.mjs`

Runtime surfaces:

- `backend/core/routes.mjs`
- `backend/routes/hermesRoutes.mjs`
- `backend/routes/aiVillageRoutes.mjs`
- `backend/routes/aiCommandRoutes.mjs`
- `backend/routes/aiChatRoutes.mjs`
- `backend/controllers/aiConsentController.mjs`
- `backend/controllers/plaud/plaudMergeController.mjs`
- `backend/controllers/plaud/plaudApplaudWebhookController.mjs`
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx`
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx`

## Current Repo State

`git status --short` shows a very dirty shared tree with many modified and untracked backend/frontend files, AI Village report changes, and this new packet. That means this audit must not stage broadly, commit broadly, or claim the tree is clean.

Claude's lane says active work is happening in an isolated `c:/tmp/ss-fable` worktree. This local checkout has many unrelated WIP files. Therefore the safest next move is documentation-only consolidation here, then implementation in isolated worktrees per slice.

## What Is Already Strong

1. The high-level product doctrine is strong.
   `AGENTS.md` and `CLAUDE.md` both define SwanStudios as trainer-led B2B2C, workout-progress-first, and real-data-first.

2. The core loop is clear.
   Log workout -> save diary/session -> chart progress -> guide trainer/admin/client action -> share meaningful milestones.

3. The prompt handling model is unusually mature.
   `prompt-watcher` classifies SIMPLE vs VISION, then routes broad ideas through `grill-me`, `chromie`, `swan-orchestrator`, `swan-design-router`, build, and `closeout-evidence-lock`.

4. Design has a real source of truth.
   The design system explicitly bans generic AI pages, Tailwind drift, Material UI, retired Galaxy-Swan colors, and motion without purpose.

5. The Swan Coach brain vault is the right shape.
   It is Obsidian-compatible markdown, has frontmatter, privacy rules, full-plan PDF rules, and a contract test for future Hermes ingestion.

6. Hermes has both planning docs and runtime endpoints.
   `backend/routes/hermesRoutes.mjs` exposes task create/list/get/cancel, and `backend/core/routes.mjs` mounts it at `/api/hermes`.

7. AI Village is already gated.
   `AGENTS.md` and `CLAUDE.md` require Sean permission and reserve it for high-stakes work.

8. The privacy posture is not casual.
   AI consent routes, PII stripping, strict PII middleware, PLAUD cipher handling, and coach-brain privacy docs all point toward a real security posture.

## Main Gaps Found

1. Broken/stale Hermes bridge reference.
   `AGENTS.md`, `CLAUDE.md`, and brainstorm docs reference `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`, but local search did not find that file. This is a major doc-integrity gap because that file is supposed to clarify public Swan Coach vs Sean-only Hermes.

2. Missing `docs/11-slice-registry.md`.
   The requested prompt named it, but the file is not present locally. Slice/state registry information is spread across Active Index, handoffs, lanes, and review queue.

3. AI Village docs are drifted.
   Some docs describe a 7-brain or 14-brain system, while current AGENTS/CLAUDE rules describe 15-brain/Tier 3/Fable-synthesis style governance. The local system needs one canonical AI Village packet.

4. Design system exists, but there is no dedicated Design Brain folder.
   The current source of truth works, but it is still a reference system. A Fable-ready `design-brain` bundle should make the rules more callable for Claude, Codex, Hermes, Fable, and browser audits.

5. Hermes has multiple identities.
   Local docs discuss Pi/Telegram/SSH/tmux Hermes, Windows Hermes, in-app `/api/hermes` tasks, Mythos wiki, Karpathy wiki, Obsidian brain, and browser harness. These are related but not yet normalized into one permission ladder.

6. Browser Harness/admin audit lane is not fully specified.
   Prior Hermes output blocked admin audit because the safe lane was public/read-only. The repo needs a documented supervised admin-audit mode with explicit scope: human-authenticated page, console/network capture only, no writes.

7. The coach brain vault is not yet runtime truth.
   The docs say runtime generation, PDF export, database schema, preference storage, and Hermes ownership are pending.

8. The PLAUD pipeline is powerful but sensitive.
   Local controllers show webhook verification, bounded fetch, merge locks, encryption, and approval flows. This must stay under redact-first/local-private policy when client transcripts or injury notes are involved.

9. There is no single "operator command map."
   The app has `/api/ai-command`, `/api/hermes`, `/api/ai-village`, `/api/coach/intake`, `/api/coach/proposals`, PLAUD merge/intake, analytics, onboarding, claim, messaging, workout logs. Hermes needs a registry that says which are read-only, draft-only, approval-required, or forbidden.

10. The tree is too dirty for broad implementation.
   The safest work pattern is still isolated slice worktrees with explicit-path staging, then Render verification only after Sean approves release.

## Runtime Surface Map

Backend mount points verified in `backend/core/routes.mjs`:

- `/api/onboarding` and `/api/clients/onboard`
- `/api/messaging`
- `/api/workout-logs`
- `/api/coach/intake`
- `/api/coach/proposals`
- `/api/plaud/clips`, `/api/plaud/intake`, `/api/plaud/merge`, `/api/plaud/merge-requests`
- `/api/analytics` and `/api/client/analytics`
- `/api/claim`
- `/api/ai`
- `/api/ai-chat`
- `/api/ai-command`
- `/api/hermes`
- `/api/ai-village`

Hermes routes verified in `backend/routes/hermesRoutes.mjs`:

- `POST /api/hermes/tasks`
- `GET /api/hermes/tasks`
- `GET /api/hermes/tasks/:id`
- `POST /api/hermes/tasks/:id/cancel`

AI command routes verified in `backend/routes/aiCommandRoutes.mjs`:

- `POST /api/ai-command/execute`
- `POST /api/ai-command/confirm`
- `POST /api/ai-command/cancel`
- `GET /api/ai-command/commands`
- `GET /api/ai-command/health`

AI Village routes verified in `backend/routes/aiVillageRoutes.mjs`:

- `POST /api/ai-village/run`
- `GET /api/ai-village/status/:jobId`
- `GET /api/ai-village/stream/:jobId`
- `GET /api/ai-village/latest`
- `GET /api/ai-village/archive`
- `GET /api/ai-village/health`

Dashboard route surface verified in `UniversalDashboardLayout.routes.tsx`:

- Admin, trainer, client, and user surfaces each mount role-specific dashboard routes.
- Coach Command Center appears on admin, trainer, client, and user role paths.
- PLAUD routes redirect into Coach Command Center on relevant admin/trainer surfaces.
- Client progress and trainer client-progress surfaces are active.

## Security and Privacy Posture

Verified local patterns:

- AI Village is admin-only in route code and permission-gated by docs.
- AI command has command confirm/cancel lanes.
- AI chat applies subscription, rate limits, and strict PII middleware on message route.
- AI consent separates client self-consent, trainer visibility, and admin management.
- PLAUD merge encrypts transcript and parsed workout payloads.
- PLAUD webhook verifies signatures/nonces and uses bounded audio fetch.
- Coach brain docs forbid restating surgery, diagnosis, trauma, private body concerns, detailed pain history, or embarrassing client context in client-facing artifacts.

Required hard rule:

Any raw client transcript, injury note, PLAUD content, health context, or private client narrative must use local/private redaction first. No MOA/provider fanout for raw sensitive text.

## Hostile Review of The Current Setup

The current system is high potential but brittle because the decision graph is too distributed. A future agent can easily read the wrong doc, run the wrong tier, or blur public Swan Coach with Sean-only Hermes if the missing bridge doc remains unresolved.

The most dangerous failure mode is not "Hermes cannot do enough." The dangerous failure mode is "Hermes does too much without a single authority map." The upgrade must be permission architecture first, capability second.

## Recommended Direction

Do not start by giving Hermes more browser/admin power.

Start with:

1. Fix stale references and create the missing bridge/registry docs.
2. Create a canonical skill/tool/brain registry.
3. Create a Fable-ready Design Brain bundle from existing Swan design docs.
4. Create an operator command map with read-only, draft-only, approval-required, and forbidden lanes.
5. Only then add stronger Browser Harness and Hermes admin-audit capabilities.

