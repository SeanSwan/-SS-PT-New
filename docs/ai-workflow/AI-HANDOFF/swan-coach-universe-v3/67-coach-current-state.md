# Swan Coach — current product and repair status

Status snapshot:2026-09-12, after B2 command/speech retirement verification. **Work remains; the candidate is not release-ready and has not been committed, pushed or deployed by this review.** This is a summary of the existing canonical plan, not a competing architecture. [48 contains detailed evidence and gaps](48-capability-truth-and-release-gaps.md); [31 remains the implementation contract](31-gwen-execution-handoff.md).

## What is usable or present

| Area | What exists | What the evidence supports |
|---|---|---|
| Training conversation | Mounted Talk, Review and History, selected-client context, typed/voice entry and Logger/Planner navigation | Actual local authenticated Coach is mounted. Complete selection safety and all-role journeys still need integration. |
| Workout actions | Proposal review, explicit confirmation, operation identity, transactional execution and persisted readback machinery | Isolated PostgreSQL paths were exercised. The full Coach-to-current-Logger flow is incomplete; an older submit event remains unsafe until R60-A. |
| Domain UI commands | 139 registry definitions: 112 server dispatch, 18 frontend events, 4 asynchronous debates, 4 manual only and 1 chat fallback | Classification is not end-to-end verification. It does not implement arbitrary computer or screen control. |
| Training evidence | Canonical workout and exercise readers, source references and bounded context | Real PostgreSQL/default-reader/registered-model checks exist. Exercise search still uses limited full-message matching; broader reasoning quality needs evaluation. |
| Voice | Microphone entry and premium speech with browser fallback | Capture retirement was repaired earlier. TTS/audio retirement passes the B2 tests. Sean selected current speech access; existing generation tracking and privacy middleware are retained. |
| Session Desk | Draft editor, exercise library, strict numeric inputs and existing shell-owned draft/selection metadata | Component and actual numeric browser checks passed. Desk is deliberately unmounted until selection/Logger/approval connections are complete. |
| Memory and proactive help | Fact services/model/migrations plus nudge decision helpers | They are not yet a complete user-facing memory inspector or scheduled delivery system. |

## What this hostile review has repaired

Earlier bounded slices corrected canonical workout evidence, privacy/consent boundaries and final prompt sanitization; strict actor handling; conversation read authorization; target-preserving creation; runaway mounted SessionProvider reads; decimal workout input; canonical exercise lookup; and fact forgetting/purge behavior. Each has its own local receipt. Their test totals overlap and should not be added into a single product-certification number.

The latest completed slice, B1, fixes chat publication races. A retired actor/thread cannot publish old messages, action events, paywalls, cached history or optimistic state. Selecting another thread and returning does not revive a captured Send callback. Malformed responses and false-success deletes are refused. Older renames cannot overwrite newer local results; delayed history cannot resurrect a deleted row. Bound creation waits for the exact current thread acknowledgement before sending its first message.

**B1 evidence:**55 focused tests passed;97 tests passed across ten compatibility files, including those55; five real Axios-factory checks passed; canonical TypeScript and scoped whitespace checks exited0. First-run failures, repaired tests and source hashes are preserved in [the B1 receipt](../../../../tmp/coach-astra-hostile-20260912/b1-local-exit.json). These tests use controlled network/auth bindings. A real factory adapter test proves interceptor behavior, not live billing or complete mounted selection. Final combined review remains pending.

## Required work to reach the intended assistant

1. Repair clipped mobile transcript geometry, then connect every client/thread/route/pin change to one admitted selection. Old replies, confirmations and audio must stay retired.
2. Complete Planner edit ownership, exact rest adjustments and reviewed Logger submission. An acknowledgement must distinguish accepted work from an actual applied or saved result.
3. Mount the Session Desk through its existing owner; prove approval, saved readback and recovery with real role/target/browser journeys.
4. Connect progress interpretation, substitutions and sharing to current authoritative data and deliberate review.
5. Expose approved memory with inspect/edit/forget controls, and connect proactive help only with consent, delivery rechecks, dedupe and quiet hours.
6. Run the frozen scenario/holdout quality evaluation, privacy and provider boundaries, restart/Redis/migration/restore/performance checks and final combined Astra adjudication.

These requirements are the path to a more capable assistant: it can understand the current training task, explain the evidence, prepare the right action, show what will change, act through the existing approval rules and verify the result. Current code does not establish that the whole experience is complete or superior to a fictional assistant.

## Known blockers and release path

- Current client self-history regression: a normal client-created null-target thread can be omitted from history and return404 on detail. Actual local reproduction was3PASS/2FAIL; plan65 is queued to repair it.
- The latest broader backend run has1086PASS, two obsolete source-guard failures and four skipped speech probes, plus58 Node tests. Plan64 repairs the guard tests; plan66 replaces speech skips with the current-access contract. A broader PASS is not claimed.
- A duplicate context hook resolves differently in Vite and TypeScript; plan62 remains required despite the canonical type-check passing.
- Producer/receiver identity, complete mounted integrations, memory delivery, proactive workers and full quality/release gates remain incomplete. The original six hostile findings still require explicit final adjudication.
- GitHub access and push permission are verified. The branch remains27 commits behind and81 ahead of the fetched main at53120649f; integration and exact public artifact selection are pending. No push/merge occurred.
- Render CLI2.20.0 is installed, but its read-only service listing exits1 with a login diagnostic. The repository's Render blueprint is marked inactive. The actual live service, branch, build settings and deployed commit are unverified; no deployment action occurred.

Next controller slice:M68-MOBILE-LAYOUT;9 admitted slices remain including that layout repair, with later integration still outside that count. Final Astra review is deferred under Sean's override, never marked passed. No paid API or usage-reset credit was consumed. Future status changes must preserve this snapshot and update the authoritative receipts.


## B2 local exit — 2026-09-12

Seven exact source/test paths verified locally: command execute/confirm/cancel and TTS now bind publication to actual actor plus optional selection snapshot, captured render generation and operation identity. Old A-B-A callbacks, responses, events, errors/paywalls and finally blocks cannot publish into newer work. Confirm/execute require truthful response discriminators; malformed confirmation and contradictory fallback no longer invent execution/chat success. Exact digest/channel are forwarded without inventing a physical gesture. Server-side work already sent is not undone by local abort. Existing caller cancellation announcements still need C3 adjudication.

TTS retires pending requests, audio and browser fallback on stop, toggle-off, hidden page, actor/selection changes and unmount. Old audio completion/play rejection cannot revoke newer audio or clear its state. Bounded32KiB JSON billing blobs are decoded with an ownership recheck after await. Current authenticated raw-user speech remains distinct from client/staff and cannot adopt their publication binding; existing backend generation access and PII rules are unchanged. Four skipped obsolete speech API probes still await plan66.

Evidence:59 focused testsPASS/3files;1280 compatibility testsPASS/200files (includes the focused cases); canonical npm run type-check05 exit0; seven-file git diff --check exit0. Initial behavioral RED19FAIL/9PASS, Blob boundary4FAIL/15PASS and raw-user compatibility1FAIL/22PASS were repaired. These overlap and are not unique defect counts. Broader compatibility initially failed115 AuthProvider setups, then5 in an independent voice fixture; both fixtures now use the same actual-auth identity across imports. Test-scope configuration repairs preserve original snapshots, all earlier tested statuses, accounting and review history; no production auth fallback was introduced.

Actual mounted mobile run: real login/AuthContext/target42 create201, two controlled replies, same thread15 and no page errors. Row cleanup verified. Seven automated checks passed but screenshot inspection found the Talk children laid out horizontally and clipped: VISUAL REVISE, not a mobile usability pass. Full source-bound corrected receipt b2-mounted-browser-reviewed-receipt.json supersedes the first broad verdict, preserving both. B1 desktop6checks remain historical and its header still says New chat/No client selected. Command fallback was unexercised in both direct-chat probes. No real provider, speech generation, complete selected-scope C integration or production verification was performed.

Next slice is plan68's exact two-file mobile transcript containment repair, then original HR12 queue. Existing textual wireframes/state/error/rollback contracts apply; Mermaid render remains NOT RUN. Native hooks remain NOT PROVEN. B2 local exit is not whole-Coach readiness; original six findings/final combined Astra adjudication, client self-history, Planner/Logger/selection/memory/proactive and full release gates remain pending. No commit, push, deploy, paid API or usage reset.

Account usage at final read:99% consumed. This is a preserved continuation checkpoint, not a claim that review findings ran dry. Plan68 is prepared but its two source/test files remain unchanged.
