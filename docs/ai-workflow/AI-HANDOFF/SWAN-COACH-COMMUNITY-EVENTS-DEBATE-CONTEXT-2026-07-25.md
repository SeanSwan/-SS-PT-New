# Swan Coach Community Event Studio - Debate Context

Date: 2026-07-25  
Status: code-grounded planning input; no build authorization  
Council roles: Opus 5 is lead architect/orchestrator. Kimi K3 is context challenger and co-designer.

## Reconstructed Goal

Extend the existing Swan Coach and existing community-event stack into an owner-facing Event Studio. Swan Coach should:

1. read privacy-safe, aggregate product signals;
2. explain what those signals suggest;
3. propose several event ideas, including creative ideas not forced by the data;
4. brainstorm and refine ideas with Sean;
5. turn Sean's selected idea into a complete event draft;
6. require explicit owner approval before publication;
7. measure RSVP, attendance, engagement, workout/progress impact, and follow-up outcomes so later suggestions improve.

This must preserve the workout-progress-first product loop. It must not autonomously publish, expose client PII to an LLM, invent statistics, or create a second disconnected Coach/chat system.

## Canonical Surface Receipt

| Layer | Current truth |
|---|---|
| Dashboard route mount | `frontend/src/routes/main-routes.tsx:857-863` mounts `UniversalDashboardLayout` under `/dashboard/*`. |
| Role route rendering | `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:91-111` maps the active role's route definitions into rendered `<Route>` elements. |
| Client community route | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:182-195` maps `/dashboard/client/community` to `ClientCommunityPage`. |
| Mounted event UI | `ClientCommunityPage.tsx:208-211` renders `<EventsList />`. |
| Consumer hook | `EventsList.tsx:34-35` calls `useEvents()`. |
| Frontend API literals | `useEvents.ts:92,106,117,125` calls `/api/social/events`, `/my`, create, and RSVP paths. |
| Backend mount | `backend/core/routes.mjs:420-423` mounts `socialRoutes` at `/api/social`; `backend/routes/social/index.mjs:22` mounts protected event routes at `/events`. |
| Backend handlers | `backend/routes/social/events.mjs:55-89,92-119,122-157,164-209,212-260,267-348` implements list, my events, detail, create, update, cancel, RSVP, and attendees. |
| Authoritative schema | `backend/models/social/enhanced/EventManagement.mjs:13-405` defines `SocialEvent`; `:410+` defines attendance. |
| Swan Coach owner surface | `UniversalDashboardLayout.routes.tsx:95-99,152` mounts `CoachCommandCenterPage` at `/dashboard/admin/coach-assistant` and makes it the admin default. |
| Coach command transport | `frontend/src/hooks/useCoachCommand.ts:86-170` sends execute/confirm requests to `/api/ai-command/*`; `backend/routes/aiCommandRoutes.mjs:119-289,296-314` runs the review-gated command pipeline. |

## Existing Assets To Reuse

- `SocialEvent` already supports rich event data: category, fitness level, one-time/recurring/series timing, venue/virtual data, capacity, waitlist, approval settings, price, equipment, visibility, engagement metrics, status lifecycle, challenge/workout-plan links, AI tags, recommendation score, and target audience.
- `EventAttendance` provides RSVP/attendance records.
- The client Community page already displays upcoming events and RSVP controls.
- Swan Coach already has a command registry, intent classifier, dispatcher map, audit logs, confirmation receipts, and an owner/trainer Coach Command Center.
- Admin aggregate analytics already expose user activity and completed-session counts, but some engagement fields are placeholders (`adminUserAnalyticsService.mjs:238-260`).
- Existing challenge infrastructure can be linked through `challengeId`; it must not be rebuilt as an event system.
- Notification and marketing-calendar systems exist and may be downstream adapters, not competing event sources of truth.

## Surface Classification

| Surface | Classification | Reason |
|---|---|---|
| `SocialEvent` + `/api/social/events` + client `EventsList` | canonical active runtime | Proven mounted end to end above. |
| `ChallengeCommandWorkspace` + `/api/v1/gamification/challenges` | canonical adjacent system | Challenge campaigns are distinct but linkable to events. |
| `SocialCoachDock` on the social feed | canonical companion surface | Quick social actions only; its own header explicitly forbids becoming a second chat surface. |
| `GalleryEvent` + `/api/admin/gallery/events` | active but separate domain | Photo-gallery shoots and lead capture, not community scheduling. |
| `MarketingCalendarItem` + `/api/admin/marketing-calendar` | active but separate domain | Content/publishing calendar; may receive promotion tasks after approval. |
| personal/trainer `Session` scheduling | active but separate domain | Training appointments, not community-event source of truth. |

## Hostile Findings / Gaps

1. Any authenticated user can currently create an event because `/api/social/events` is only protected by authentication; create immediately forces `status: 'published'` (`events.mjs:164-193`). This conflicts with an owner-governed, Coach-assisted flow.
2. The client Community page exposes a Create button to every viewer (`EventsList.tsx:54-60`). There is no dedicated admin Event Studio.
3. No event commands exist in `commandRegistry/socialCommands.mjs`; it only covers moderation.
4. No event read/write dispatcher exists in `commandDispatcher.mjs`.
5. There is no privacy-safe aggregate event-idea context/read model joining workout adherence, challenge participation, social interests, RSVP/attendance, time-slot availability, and event outcomes.
6. There is no draft -> owner review -> publish Coach proposal type for community events.
7. Existing create validation is shallow, publication is immediate, and no event route tests were found.
8. RSVP state increments attendee counts optimistically in the hook and can overcount when changing statuses (`useEvents.ts:124-129`); backend interested/current-attendee counters also need transactional/idempotency review.
9. The very large `EventManagement.mjs` and `events.mjs` files exceed current repository line standards; any implementation should extract services/schemas rather than expand them.

## Required Council Output

Produce a feasibility verdict and a builder-exact decision packet, not code. It must include:

- three materially different product/UX directions and a recommendation;
- owner workflow and client workflow wireframes;
- Mermaid architecture, event lifecycle, data-flow, and approval flow;
- privacy-safe aggregate signal contract with minimum cohort thresholds and no names/free-text sent to models;
- exact model/API/command/proposal/dispatcher/UI changes;
- authorization matrix for admin, trainer, client, Swan Coach, and background jobs;
- deterministic draft/publish rules, audit receipt, idempotency, notification, calendar, challenge, and rollback behavior;
- outcome metrics and feedback loop;
- migration/backfill strategy if schema changes are necessary;
- responsive/accessibility/loading/empty/error states;
- exact implementation slices, file-level responsibilities, tests, acceptance criteria, and explicit non-goals;
- unresolved owner decisions clearly separated from builder instructions.

Only mutual same-contract consensus may authorize a builder packet. If the council cannot remove contradictions, return no build authorization.
