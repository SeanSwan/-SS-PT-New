# Swan Coach Universe V3 — bounded blueprint review packet

## REVIEW SCOPE

Perform a hostile architecture and handoff review of the current Swan Coach
Universe V3 package and the implementation boundary described below. Identify
contradictions, missing contracts, unsafe assumptions, false completion claims,
and the smallest blueprint upgrades needed before a lower-cost builder can
implement the remaining slices. This is advisory input only. Do not propose
unbounded autonomous writes, therapy/diagnosis, or a replacement of the
existing domain-authority services.

Required review shape: `## VERDICT`, `## BLOCKERS`, `## ATTACKS`,
`## HIGHEST RISK`, `## CONFIDENCE`. Include accepted/rejected blueprint changes
and name the exact slice/card they affect. Treat all claims below as hypotheses
to attack, not as proof.

## REPOSITORY AND ARTIFACT IDENTITY

- Product: SwanStudios personal-training SaaS; Swan Coach is the AI-assisted
  training/workflow surface.
- Review branch: `codex/swan-coach-universe-v3-implementation-20260904`.
- Review head: `b88dd9e5c8`.
- Package: `docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/`.
- Package status: implementation in progress; local isolated branch only;
  no live migration, production database, authenticated browser journey,
  provider evaluation, push, or deploy is claimed.
- Canonical planning set: `01-audit.md` through `10-readiness.md`,
  `README.md`, and `wireframes.html`. The HTML is static synthetic design
  material, not a runtime screen.

## VERIFIED MOUNT AND ROUTE EVIDENCE

- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:109`
  maps `/coach-assistant` to `CoachCommandCenterPage` for the admin role.
- The same file maps `/coach-assistant` to the same component for trainer and
  client role configurations at lines 211 and 238.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:72`
  lazy-loads the component; the route table entries above are the JSX route
  configuration evidence.
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`
  renders the command bar, transcript, review panel, history, and console dock.
- `backend/core/routes.mjs:715` mounts `aiCommandRoutes` at
  `/api/ai-command` after `/api/ai-chat` and before later AI mounts.
- `backend/routes/aiCommandRoutes.mjs:216,490,515,575,588,765,843,875`
  expose execute, pending read, intent list/read, confirm, cancel, command
  catalog, and health endpoints.
- Frontend command submission and confirmation use the `/api/ai-command`
  family. Existing proposal and workout services remain the intended domain
  write authority.

## CURRENT IMPLEMENTATION CLAIMS TO VERIFY

The branch contains S1 provenance and shared confirmation wiring; S2 server-owned
command policy; a S3 `CoachIntent` model, additive migration, bounded read routes,
and claim/completion/failure/unknown reconciliation helpers; S4 a deterministic
workout read-back verifier plus a narrow transaction receipt hook; S5a degraded
context evidence, S5b provider policy, S5c bounded conversation responses; and
S8a deterministic progress evidence calculations. The branch's own receipt says
these are not yet route-wide durable intent transaction integration, authorized
workout read-back, full chat caller adoption, canonical progress caller adoption,
or the S6–S11 experience/activation slices.

The durable model is `backend/models/CoachIntent.mjs`. Its key fields are
`actorId`, `requestKey`, `requestHash`, `commandType`, `targetClientId`,
`status`, `operationId`, `proposalId`, `result`, `errorCode`, `expiresAt`, and
`completedAt`; it has a unique `(actorId, requestKey)` index. The service in
`backend/services/ai/coachIntentService.mjs` is deliberately a coordinator and
receipt boundary: retries must not redispatch effects, and unknown intents may
only be promoted after an independent read proves the effect.

## BLUEPRINT PROMISES UNDER REVIEW

The package proposes a Session Desk: conversation beside an editable workout
draft, visible context/memory status, and a timeline showing what actually
persisted. It also proposes later slices for reliable voice, real-record
training intelligence, visible/correctable memory, quiet proactive assistance,
and evaluation/staged activation. It requires permission, privacy, human review,
explicit uncertainty, recovery, no dependency/shame optimization, and bounded
fitness scope rather than therapy or diagnosis.

The package currently lists 48 acceptance scenarios, nine Mermaid diagrams,
mobile/desktop wireframes, contracts, and traceability. It reports package and
focused tests as green while clearly distinguishing them from planned
end-to-end/live evidence. A prior review found that the biggest risk was
connecting the pieces without creating a second write authority.

## QUESTIONS TO ATTACK

1. Does the role-shared route create a hidden mismatch between client-safe,
   trainer-assigned, and admin/operator capabilities? What route-context and
   authorization contract must be explicit before Session Desk is shared?
2. Does `findOrCreate` plus the unique request key actually prove race-safe
   idempotency under PostgreSQL, retries, transaction rollback, and a lost
   response? What exact states/events/constraints are missing?
3. Are `claimed`, `completed`, `failed`, `unknown`, and `cancelled` sufficient
   once approval, execution, commit, read-back verification, and compensation
   are visible to the UI? If not, recommend a compatibility-safe state model.
4. Can a receipt be written atomically with every domain effect, or does the
   current narrow workout hook create a false cross-domain guarantee? Identify
   the integration seam and proof required for each command family.
5. What prevents stale drafts, wrong-client rebinding, duplicate confirmation,
   unsafe replay, partial multi-record effects, and an “unknown” result from
   becoming an automatic retry?
6. Does the blueprint make memory deletion, scope, consent, cache invalidation,
   model-provider egress, health information, and offline persistence testable?
7. Are voice provenance, transcript retention, barge-in, recorder fallback,
   accessibility, keyboard/focus, reduced motion, and mobile states fully
   represented in the wireframes and acceptance tests?
8. Does “AGI/Jarvis-like” remain a safe product aspiration, or do any docs imply
   consciousness, therapy, diagnosis, autonomous coaching, or dependency
   incentives? Recommend precise language and a capability boundary.
9. What observability and evaluation data are required to distinguish proposed,
   approved, committed, verified, refused, unknown, and user-corrected outcomes
   without collecting unnecessary personal or emotional data?
10. Which missing decision must be owned by the product owner rather than
    guessed by Luna, and which defaults can be safely encoded now?

## REQUIRED OUTPUT CONSTRAINTS

- Keep findings bounded to this packet and current blueprint work.
- Separate `VERIFIED`, `LIKELY`, and `UNPROVEN` claims.
- Do not treat static wireframes or focused tests as live runtime proof.
- Do not recommend new generic SQL, arbitrary tool execution, or a new domain
  write authority without naming the existing authority it would replace and
  the migration/rollback proof.
- End with a prioritized blueprint delta: P0 blockers, P1 hardening, P2
  experience improvements, each mapped to a package file and test/gate.
