# S2 — assignment-scoped staff access

Owner Astra; version 1; PLAN READY after S1 exits. Implements R4 / BE-01 and BE-02; no new permission system. UI N/A: existing renewal/debate callers retain their contract; denial/unavailable states remain JSON handled by callers. Source authority: backend-audit.md plus actual middleware `assertAssignmentOrAdmin` and `listAssignedClientIds`.

## Exact architecture

Debate `/start`: strictly parse positive safe client IDs; reject malformed IDs before data reads. For trainer client-reference lookup, pass `{trainerId: req.user.id}` into existing resolver. Apply fresh `assertAssignmentOrAdmin(req.user.id, req.user.role, resolvedClientId)` before profile/enrichment reads and before `startDebate`. Existing staff gate and job ownership remain. Unknown/inactive client still not found. Never include out-of-scope suggestions or start providers in tests.

Renewals: route authentication and staff role gate remain. Trainer collections and stats must pass the current active assignment set to the service and apply a Sequelize `userId IN assignedIds` condition BEFORE limits, aggregation and enrichment. Empty assignment set means no rows/counts, never global. Assignment lookup failure returns unavailable, never empty-success. Admin remains global. User-specific reads and alert-ID writes authorize the target; read the persisted alert userId before contacted/renewed/dismissed, not a caller-provided substitute. Missing alert returns 404, forbidden scope 403, malformed IDs 400. Manual creation stays available to admin or assigned trainer, consistent with the existing service's trainer flag workflow; correct the misleading route header. No mutation writes can occur before authorization. Do not expose stack/provider/database errors to callers.

Preserve internal cron/service callers and defaults while requiring requester scope on HTTP entry. An additive service options object is preferred over duplicating business logic. No schema changes, no production data/provider/mail. Current per-request assignment reads are required; do not cache across revocation. All raw identifiers in tests are synthetic.

## Tests / traceability

R4→BE-T01→debate scope: real Express router with synthetic authentication, model/DB/provider dependencies replaced. Trainer-assigned positive, unassigned direct/ref negative with zero domain reads/provider starts; admin pass; client role denied; malformed/inactive/unknown target; result job ownership regression remains.

R4→BE-T02→renewal scope: disjoint trainer fixtures, collection/critical/stats scoping, revoked assignment, lookup unavailable, cross-client user read and alert-ID contacted/renewed/dismissed; manual create policy; admin global; client/user role denied. Exercise controller/service composition and assert actual generated query filters, not only source strings. Existing renewal cron/API tests and middleware access tests remain green. Meaningful RED precedes changes. No network listener outside temporary test harness and no production DB.

Flow: authenticate→staff→parse target/scope→assignment lookup→authorized operation→authoritative response; invalid/denied/unavailable→no data/write; retry reruns permission; cancel changes nothing. ERD unchanged (User–ClientTrainerAssignment–RenewalAlert). Privacy is enforced at the existing backend assignment boundary. Rollback: revert scoped code, retain reports and test evidence; no data migration. Final hostile review deferred, not approved.
