---
title: "Trainer Dashboard Deep Audit — hostile review packet"
decision: "Is the trainer-dashboard audit's finding set, severity ranking, and 5-gate remediation plan correct enough to build from?"
status: open
supersedes: none
---

# DOCUMENT UNDER REVIEW — Trainer Dashboard Deep Audit (SS-PT-NEW)

## 0. What you are reviewing, and what you are NOT

You are reviewing an **audit report + remediation plan**, not code. The report was
produced by a single AI reviewer doing a static source + repo-metadata pass. It has
**not** been verified against the running system, and its findings have **not** been
independently reproduced.

Your job is to attack the *report and its plan*: its correctness, its severity
calls, its ordering, its blast radius, and above all **what it did not look at**.

**Anti-consensus instruction (binding).** The failure mode this panel exists to
prevent is seven models each reading a confident document and each concluding
"broadly correct, ship the plan." A claim is not true because it is repeated. You
are scored on what you find WRONG or MISSING in this report, not on how well you
restate it. If you can find nothing wrong, say that explicitly and accept that your
seat contributed nothing — do not manufacture agreement to fill space.

## 1. Ground truth about the target (verified locally, not taken from the report)

| Fact | Value | How verified |
|---|---|---|
| Repo | `github.com/SeanSwan/-SS-PT-New` | `git remote -v` in the working tree |
| Audited commit | `66ffde60784c1e47f8344c44b113214b1a529e7d` | exists locally; `git cat-file -t` returns `commit` |
| Audited commit is a merge | `Merge remote-tracking branch 'origin/main' into claude/refund-lifecycle-20260819` | `git log --oneline -1` |
| Ancestor of `origin/main`? | YES | `git merge-base --is-ancestor` exit 0 |
| Drift since audit | `origin/main` is **8 commits ahead** (tip `978f5d197`) | `git rev-list --count` |

Consider whether an audit anchored to a merge commit on a feature branch, now 8
commits stale, can support the release-gate conclusions it draws.

## 2. Stack and house rules the plan must not violate

Production personal-training SaaS on Render. React 18 + TypeScript +
styled-components (no MUI). Node/Express + Sequelize + PostgreSQL. Victory charts
only. Dark-first Crystalline Swan palette via `var(--token,#fallback)`. 44px touch
targets. WCAG 4.5:1. Max 300 lines per file. Zero PII to LLMs (IDs and roles only).
Known production hazard: a **dual `users` / `"Users"` table** exists; FK constraints
must target `"Users"`.

The trainer dashboard is the **coach workflow surface**: fast client workout logging,
reviewable history, progress charts from real logged data, low-friction plan
adjustments. Trainers are the paying B2B side of a B2B2C product. **A fix that locks
a trainer out mid-session is a worse outcome than the vulnerability it closes** —
weigh every proposed control against that.

---

# 3. THE AUDIT REPORT (verbatim)

## Executive verdict: Conditional no-go

The trainer dashboard has a strong foundation and is substantially more capable than
an ordinary trainer portal. However, it is not yet hardened enough to call flawless
or production-secure. The active implementation is the universal dashboard shell with
approximately 26 trainer routes — not the retired standalone trainer dashboard.

The central architectural weakness is inconsistent enforcement of the relationship
between: the authenticated trainer, the dashboard surface being shown, the selected
client, the trainer's current assignment to that client, and the specific operation
being performed.

## Release blockers

| Priority | Finding | Practical risk |
|---|---|---|
| P0 | Challenge moderation is not assignment-scoped | One trainer can reach submissions belonging to another trainer's clients |
| P0 | Swan Coach chat authorization can outlive client unassignment | Revoked client context may remain available in an existing conversation |
| P0 | Schedule conflict endpoint trusts arbitrary trainer/client IDs | Trainers can probe other trainers' schedules and expose client names |
| P0 | Selected-client state is stale and not actor-scoped | Wrong client can remain pinned after account changes or unassignment |

### 3.1 Trainer challenge moderation is globally scoped

The trainer route registry still mounts `/dashboard/trainer/challenges`. The sidebar
deliberately hides it and contains a source comment acknowledging that the moderation
queue is not assignment-scoped. Hiding a link is not authorization because the route
and API remain directly reachable.

The backend confirms the problem:

- `getManagedChallengeSubmissionQueue()` retrieves all pending or under-review submissions without receiving the authenticated viewer.
- The controller does not pass `req.user`.
- Moderation loads a submission directly by ID.
- Trainers and admins share the same API role gate.
- No active trainer-client assignment is checked before starting review, requesting changes, rejecting, or approving the submission.

Required correction: temporarily make trainer moderation server-disabled or
admin-only. Then scope trainer queues through an active `client_trainer_assignments`
join and recheck the assignment inside the moderation transaction.

### 3.2 Target-client Swan Coach chat can survive assignment revocation

Conversation creation checks whether a trainer may target a client. However, it also
contains a production escape hatch — `AI_CHAT_CLIENT_ACCESS_SOFT=true` — that changes
a denial into a warning.

The larger flaw appears when sending subsequent messages. Assignment access is
rechecked only when all of these are true: `conversation.targetUserId` exists;
`conversation.role === "trainer"`; authenticated user role === `"trainer"`.

A trainer can create a conversation with a client audience role and a target client.
In that case, later messages do not satisfy `conversation.role === "trainer"`. If that
trainer is subsequently unassigned, the thread can continue without the current
assignment being revalidated, while client-specific enrichment is still selected from
`targetUserId`.

Required correction: authorize based on the authenticated actor and target subject —
not the conversation's audience role. Revalidate assignment on conversation creation,
listing, retrieval, every message, metadata updates, exports, and archive/delete
operations. Existing client-bound threads should become inaccessible or explicitly
de-identified immediately after unassignment. The soft-access environment flag should
also be rejected during production startup.

### 3.3 Schedule conflict checking exposes other trainers' operational data

`POST /api/sessions/check-conflicts` is trainer/admin-only, but it trusts
caller-supplied `trainerId`, `clientId`, `excludeSessionId`. A trainer is not
restricted to their own trainer ID or assigned clients.

The conflict service then queries sessions for those identifiers and can return:
session ID, session date and duration, status, trainer availability, alternative time
slots, and the conflicting client's full name. A trainer could therefore probe another
trainer's calendar by trying IDs and time ranges.

Required correction: force `trainerId = req.user.id` for trainers; require an active
assignment for any supplied client; ensure `excludeSessionId` belongs to the
authorized scope; return a generic "slot unavailable" message rather than another
client's identity or session ID; preserve global scope only for administrators.

### 3.4 The selected client can remain stale across actor and assignment changes

`GlobalClientContext` stores a full client object under a fixed session-storage key:
`ss-active-client`. The key is not namespaced by authenticated user or role. When the
client list refreshes, an active client absent from the new authorized list is not
cleared; the reconciliation effect simply returns. There is also no provider-level
clearing tied to logout, authenticated-user change, or role change.

Swan Coach then resolves its effective client from route parameters, thread context,
or this stored active client. It can continue using the stale object when it is no
longer in the current trainer roster. Even where the backend later rejects a write,
the trainer can still be shown or prompted with the wrong client context. For a health
and fitness system, that is a release-blocking wrong-subject risk.

Required correction: use `ss-active-client:{actorId}:{actorRole}`; persist only the
client ID, not the client record; rehydrate exclusively from the newly fetched
authorized roster; clear immediately when the actor, role, session, or assignment
changes; clear client-bound pending Coach operations at the same time; display a
persistent subject chip — client name, assignment state, and action target — on every
client-bound write or confirmation.

## 4. High-priority hardening findings

**Assignment lifecycle contracts are internally inconsistent.** The backend uses
`status: 'active'` and returns wrapper objects such as `{ success, assignments,
totalClients }`. The shared frontend assignment type expects `isActive: boolean`, and
several service methods expect raw arrays. Reassign and unassign logic filters on
`a.isActive`, while deactivation calls a route that does not exist: `PUT
/:id/deactivate`. The backend supports `PUT /:id` with status, or `DELETE /:id`.
Depending on the path, this can produce `.filter is not a function`, a silent no-op,
or a 404. Reassignment is also implemented as multiple client-side requests rather
than one atomic backend transaction. Correction: create a canonical generated
assignment contract, standardize on `status`, remove the nonexistent endpoint, and add
one transactional reassign operation.

**Swan Coach confirmation does not centrally reauthorize.** The Coach command lane has
meaningful safeguards: operation ownership, expiration, single-use retrieval, HMAC
protection for destructive commands, per-user pending-operation limits, bulk-operation
limits, a write kill switch, and command auditing. However, after confirmation the
executor dispatches directly to the registered handler. The dispatcher performs no
central role, assignment, consent, or resource-version authorization. Individual
handlers may protect themselves, but the architecture provides no universal guarantee.
This leaves a time-of-check/time-of-use gap when a trainer's assignment or permission
changes between preview and confirmation. Correction: introduce one
`authorizeCommandAtExecution()` boundary that revalidates current role, capability,
assignment, consent, record ownership, resource version, and idempotency immediately
before every command executes.

**Pending Coach operations are not durable.** Pending operations are stored in a
process-local `Map`. The code comments that Redis is disabled in production. The
signing key also falls back to a newly generated random value when
`OPERATION_SIGNING_KEY` is absent. Consequences: operations disappearing after
restart; confirmation failing when requests hit different instances; inconsistent
signatures between instances; no reliable atomic consumption across replicas.
Correction: persist pending commands in Redis or PostgreSQL with atomic consume
semantics, require a stable managed signing key, and use an idempotency ledger for
every confirmed write.

**AI consent fails open.** The chat path allows AI processing when no consent row
exists. It also treats a consent-query failure as nonfatal and continues. Correction:
require an explicit consent record before client-specific enrichment. Missing consent
should deny processing; an unavailable consent store should return a temporary service
error rather than authorize by default.

**Access and refresh credentials are exposed to browser JavaScript.**
`ProductionTokenManager` stores the access token, refresh token, and user object in
`localStorage`, and JavaScript submits the refresh token during renewal. Correction:
use an HttpOnly, Secure, appropriately SameSite refresh cookie — or a
server-side/BFF session — while keeping short-lived access credentials in memory. Add
rotation, reuse detection, revocation, and CSRF protections.

**Workout transcript ingestion permits any trainer-client combination.** The
last-weights endpoint correctly calls `assertAssignmentOrAdmin`. The primary
voice-upload and historical-preview paths do not. Their scope helper explicitly allows
a trainer to supply any client ID. Because these files and transcripts feed
client-specific parsing and AI workflows, assignment checks must occur immediately
after multipart fields are parsed and before transcription, document extraction, or
LLM processing.

**Optional trainer permissions fail open during errors.** The fine-grained permission
middleware allows access when no permission rows exist and also allows access when its
lookup fails because of schema or database errors. That may have been chosen to avoid
historical trainer lockouts, but it means an outage disables the permission
restriction. Correction: introduce explicit modes — `DISABLED`, `MIGRATION_COMPAT`,
`ENFORCED`. In `ENFORCED`, lookup failures must deny or return 503. Assignment
authorization should remain mandatory regardless of optional feature-permission mode.

**`main` is unprotected.** The audited branch reports `protected: false`, required
status-check enforcement off, no required contexts, unsigned audited commit. The
repository contains useful scripts for type-checking, building, unit testing,
Playwright, and linting, but the presence of scripts is not the same as a required
merge gate. Required controls: protect `main`; require pull requests and review;
CODEOWNERS for authorization/Coach paths; require frontend type-check, build, lint,
and tests; require backend authorization and Coach-command tests; require the trainer
Playwright suite; enable CodeQL, dependency review, and secret scanning; retain
screenshots, route coverage, and test reports as build artifacts.

## 5. Product and UX findings

The trainer home is already the correct conceptual direction: a Coach-centered
operations cockpit with priorities, sessions, interventions, and rapid actions.
However, the route registry defaults trainers to `/schedule` rather than `/overview`.

- **KPI truth:** "Hours Logged" currently derives from fetched session duration rather than strictly completed/logged training time, and the completion-rate denominator can mix incompatible statuses.
- **Delegated preview:** model actor, surface role, subject client, and operate-versus-preview mode explicitly.
- **Recovery:** the My Clients error-state test currently expects no in-place retry button; add one and distinguish empty roster, 403, offline, and backend failure.
- **Navigation:** reorganize the 26-route inventory around trainer jobs — Today, Clients, Program, Communicate, Business, Studio Tools.
- **Accessibility:** add a required WCAG 2.2 AA gate covering focus visibility, focus not obscured, drawer focus trapping/return, non-drag alternatives, status announcements, target sizes, and reduced motion.
- **Dead implementation:** the live Videos route mounts `VideoLibraryV3`, but a separate dormant `TrainerVideosPage` remains exported and contains placeholder/TODO behavior. Remove or archive the duplicate.

## 6. What is already strong (explicitly not a rewrite recommendation)

The universal route shell already uses lazy-loaded components and route-level failure
handling. The trainer overview is correctly evolving toward a "today and next action"
operating cockpit. Swan Coach has genuine command-safety engineering rather than
merely presenting an AI chat interface. Challenge code already documents the missing
scope instead of pretending it is safe. Trainer assessments have useful loading,
failure, retry, explicit-client, and form-reset behavior. The My Clients truth test
rejects demo data and checks layout/console behavior. The production dashboard crawl
is intentionally read-only, detects console/network failures, fails loudly without
authentication, and covers the trainer route inventory. The correct strategy is
consolidation and centralized policy enforcement, not another dashboard rewrite.

## 7. Remediation order (the plan under review)

**Gate 1 — Create one subject-access boundary.** Implement a shared server
authorization function for every trainer operation involving a client or resource:

```
authorizeSubjectAccess({
  actor, action, subjectClientId, resource,
  currentAssignmentRequired, permission, consentRequired
})
```

Apply it to challenges, scheduling, conflicts, uploads, workouts, progress,
assessments, body map, nutrition, messaging, PLAUD, and both Coach lanes.

**Gate 2 — Eliminate wrong-client and stale-authorization states.** Namespace
selected-client state, revalidate it against the current roster, revoke existing
target conversations after unassignment, reauthorize every Coach command at
confirmation time.

**Gate 3 — Repair contracts and durability.** Standardize assignment response types,
move reassignment into one transaction, persist Coach pending operations, require a
stable signing key, make consent explicit and fail closed.

**Gate 4 — Establish required evidence.** Protect `main`; make the authorization
matrix, frontend build, backend tests, trainer Playwright tests, accessibility checks,
and security scans mandatory.

**Gate 5 — Refine the trainer experience.** Make `/overview` the landing page, correct
KPI definitions, simplify navigation, add retry/recovery states, remove dormant
implementations, expose capability-disabled states honestly.

## 8. Hardened definition of done (as proposed)

The trainer dashboard is not declared hardened until: every trainer endpoint accepting
a client or resource ID has cross-trainer tampering tests; client unassignment
immediately revokes UI context, API access, AI enrichment, and pending Coach actions;
selected-client state cannot survive an actor change without authorization
revalidation; challenge moderation is assignment-scoped or admin-only; conflict
checking cannot disclose another trainer's or client's schedule information;
assignment create/deactivate/unassign/reassign use one tested contract and atomic
transactions; Coach confirmation centrally reauthorizes and survives restart and
multi-instance deployment; AI consent is explicit and fail closed; refresh credentials
are no longer readable by ordinary page JavaScript; `main` is protected with required
green checks; every registered trainer route is functional or explicitly
feature-disabled; the production crawl, write-path authorization matrix, and
accessibility suite publish inspectable receipts.

---

# 4. Known limitations of this audit (disclosed, and themselves reviewable)

1. **Static-only.** No live authenticated trainer-browser certification was performed. No finding was reproduced against a running instance.
2. **No file:line evidence index in this packet.** The report's downloadable evidence index was not available to this panel. Every claim above is therefore an unverified assertion about code you cannot see.
3. **Single reviewer.** No second pass reproduced any finding before "P0" was assigned.
4. **Anchored to a stale merge commit** on a feature branch, now 8 commits behind `origin/main`.
5. **No exploit was demonstrated.** Every P0 is a reasoned reading of source, not an observed cross-trainer data access.
6. **No blast-radius analysis.** The plan proposes flipping several fail-open gates to fail-closed on a live product with paying trainers, without stating what breaks, for whom, or how it is rolled back.
7. **No effort estimate, no sequencing dependency graph, no owner.** Five gates are named; none is sized.
8. **No cost or latency budget.** Gate 1 inserts an assignment check in front of essentially every trainer request; the added query load is never mentioned.
