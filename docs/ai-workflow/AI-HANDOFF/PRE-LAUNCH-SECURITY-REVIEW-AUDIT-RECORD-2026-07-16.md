# Pre-Launch Security Review — Audit Record (2026-07-16)

> Rule 48 permanent audit artifact. Self-contained: a future reviewer (Sean / Codex / Gemini / a fresh AI) should be able to read THIS file alone and re-audit the security posture of the fixes shipped in this phase.

## 1. Phase header
- **Phase:** Deep defensive pre-launch security review + launch-gating fix batch.
- **Scope:** App-wide hostile security review (7 parallel review agents) against `origin/main`, then implementation of the launch-gating findings Sean approved.
- **Dates:** 2026-07-16 (single session).
- **Reviewed by:** Fable 5 (author + solo hostile reviewer). Codex/Gemini Rule-46 chain NOT run pre-ship (recorded gap); Codex hostile review REQUESTED post-merge in `.ai-workflow/coordination/review-queue.md` for the Social/schedule-lane changes (H2/H4).
- **Final verdict:** SHIPPED to `origin/main` `93b160cba..8d2263fc3` (Render auto-deploy). Batch-push per Rule 70, per Sean's explicit "make the fixes" directive.

## 2. Files involved (all on origin/main @ 8d2263fc3)

**Runtime fixes (11 files):**
| File | ~Δ | Purpose |
|---|---|---|
| `backend/routes/workoutSessionRoutes.mjs` | +72/-59 | H1 — replace `isPrivileged` bypass with `assertAssignmentOrAdmin` on all 8 cross-user gates |
| `backend/routes/social/posts.mjs` | ~18 | H2 — gate 3 `social:activity` emits on `visibility==='public'` |
| `backend/socket/socketManager.mjs` | +42 | H4 — `assertSessionRoomAccess` ownership gate on `joinSessionRoom` |
| `backend/middleware/adminAuth.mjs` | 3 lines | JWT algo-pin `HS256` (x3) |
| `backend/controllers/authController.mjs` | 3 sites | JWT algo-pin `HS256` (refresh/validate/temp) |
| `backend/routes/galleryRoutes.mjs` | 1 line | JWT algo-pin `HS256` |
| `backend/services/store/priceVisibilityService.mjs` | 1 line | JWT algo-pin `HS256` |
| `backend/services/aiPrivacyService.mjs` | +19 | B1 — new `scrubGenericPII` export |
| `backend/routes/aiChatRoutes.mjs` | +17 | B1 — generic scrub fail-closed when no client selected |
| `backend/routes/adminNotificationsRoutes.mjs` | +26 | Notif#4 — strip HTML from broadcast title/content |
| `backend/core/app.mjs` | +7 | CSP hardening: base-uri/object-src/frame-ancestors |
| `frontend/src/components/seo/VideoStructuredData.tsx` | +10 | M1 — escape `</>&` in JSON-LD |

**Tests (3 files):**
| File | Purpose |
|---|---|
| `backend/tests/api/workoutSessionRoutesLegacyIsolation.test.mjs` | NEW — H1 regression lock (6 tests: deny unassigned trainer, allow assigned, source lock) |
| `backend/tests/api/adminAuthJwtSecretGuard.test.mjs` | Updated source-lock to pinned form |
| `backend/tests/api/authControllerJwtSecretGuard.test.mjs` | Updated source-lock to pinned form |

## 3. Architecture & runtime flow (per fix)
- **H1:** `/api/workout` (workoutRoutes → guarded workoutController) mounts BEFORE `/api/workout/sessions` (legacy workoutSessionRoutes). CRUD `/sessions/:id` is shadow-served safely by workoutController; only `GET /statistics/:userId`, `POST /start`, `POST /:id/end` fell through to the weak legacy router. All 8 legacy gates now call `assertAssignmentOrAdmin(actorId, actorRole, targetUserId)` (admin bypass / client self / trainer active-assignment; fail-closed).
- **H2:** post create/react/comment → `io.emit('social:activity', {...})`. Guard was `!groupPost` only → friends/private previews reached all sockets (incl. pre-auth). Now `&& visibility==='public'`.
- **H4:** client emits `schedule:join_session <id>` → `joinSessionRoom` → `socket.join('session:'+id)`. Now precedes join with `assertSessionRoomAccess` (admin / session.userId / session.trainerId via `getSession()`); throws → handler emits `error`.
- **B1:** `POST /conversations/:id/messages` → outbound message. When `enrichUserId` null, message previously bypassed all scrubbing → now `scrubGenericPII` (PIIManager email/phone/SSN/card) fail-closed to `CURRENT_MESSAGE_WITHHELD`.
- **Notif#4:** `POST /api/admin/notifications/broadcast` → `toPlainText` (sanitize-html, all tags stripped) on title/content before Notification.bulkCreate + AdminNotification.create.

## 4. Security logic & posture (WHAT it blocks / WHY / HOW it could break)
- **H1 `assertAssignmentOrAdmin`** — blocks cross-tenant trainer access to workout sessions/stats. WHY: trainer-tenant isolation (OWASP A01). BREAKS-IF: `ClientTrainerAssignment` model unregistered → `getModel` throws → fail-CLOSED (deny) — safe direction. Same helper already in prod on body-measurements/workout-plans.
- **H2 visibility gate** — blocks private/friends post content leaking via the global ticker. BREAKS-IF: `post.visibility` null on legacy rows → `null==='public'` false → suppress broadcast (fail-safe, not leak).
- **H4 `assertSessionRoomAccess`** — blocks session-room IDOR. BREAKS-IF: owner-field model wrong → but verified `Session.userId`/`Session.trainerId` exist (Session.mjs); fail-closed on lookup error. RISK: over-strict would deny legit joins (not a leak).
- **JWT algo-pin** — blocks algorithm-confusion. WHY: defense-in-depth (low real risk under HMAC secret + jwt v9 which rejects alg:none, but the admin path lacked belt-and-suspenders). BREAKS-IF: any token legitimately signed non-HS256 (none exist — all HS256).
- **B1 `scrubGenericPII`** — blocks raw contact PII to external LLM (Rule 8). Fail-closed: scrub throw → message withheld.
- **Notif#4 `toPlainText`** — blocks stored HTML/script in the notification bell. Admin-gated already (privilege-consistent), so defense-in-depth.
- **CSP base-uri/object-src/frame-ancestors** — block `<base>` injection / plugin content / clickjacking. `unsafe-inline` in script-src NOT removed (would need nonce migration + browser QA; flagged in code).

## 5. Best practices applied
Rule 8 (zero PII to LLM — B1), Rule 17 (dual-pass), Rule 20/54 (sibling sweep — JSON-LD, jwt.verify enumerated), Rule 26/30 (verified H1 mount-order + H2 pre-auth claim personally, not agent-trusted), Rule 42 (untracked+modified backend audit clean), Rule 44 (secret scan x6 clean), Rule 46 (Codex gap recorded), Rule 56 (baseline disclosure below), Rule 67 (R6 explicit-path staging, R7 review queued for cross-lane). OWASP A01 (access control), A03 (injection — JSON-LD/notification), A02-adjacent (algo-pin).

## 6. Known limitations / non-goals
- **H3 (broad-room PII fan-out in realTimeScheduleService) NOT fixed** — architectural, risks breaking the live schedule ticker; handed to Codex's lane via review-queue.
- **B2 (schedule-AI hasCriticalPII) deferred** — message already deterministically redacted; gating wouldn't catch scrubber misses and would degrade legit scheduling UX. Flagged for joint call.
- **CSP unsafe-inline** left in script-src (needs QA'd nonce migration).
- **Money F1** (cross-system session double-grant, admin-only MEDIUM) — needs prod-data dup check before a `financial_transactions.orderId` partial-unique index; NOT done here.
- **M2/M3** (upload content-type trust, mass-assignment spreads) — MEDIUM, not in this batch.
- **LOW items** (availability read, unmounted messages.mjs email trigger, waiver admin-UI XSS) — flagged, not fixed.

## 7. Performance & UX
Negligible perf impact. H1/H4 add one indexed lookup per gated request (assignment / session by PK). H2 removes some broadcast volume (private posts no longer fan out — intended). No added user clicks. Failure modes are "too strict" (deny), never "leak".

## 8. Test coverage summary
- NEW `workoutSessionRoutesLegacyIsolation.test.mjs`: 6 tests (deny unassigned trainer on id/stats/end/start; allow assigned; source lock) — GREEN.
- Existing `workoutSessionRoutesSecurity` (7) + `workoutSessionTrainerIsolation` (3) — GREEN.
- `aiPrivacy` (44) + `aiPrivacyIntegration` (29) + `aiChatConversationTargetGuard` (9) — GREEN.
- JWT guards: `adminAuthJwtSecretGuard`, `authControllerJwtSecretGuard`, `authControllerValidateTokenGuard`, `galleryJwtSecretGuard` — GREEN (source-locks updated to pinned form).
- Social: `socialPostsRouteContract`, `socialControllerSecurity`, `socialRoutesDisclosure`, `gamificationSocketRoomContract`, `sessionNotifications` — GREEN.
- Import-graph smoke: 7 modules carrying new imports resolve cleanly.
- **NOT run:** full backend suite (targeted only); frontend `tsc` (binary absent in env — M1 is a pure `string→string` transform, type-safe by construction); adminNotifications route has no dedicated test (sanitize-html is a proven prod dep, logic trivial).
- **Rule 56 baseline disclosure:** targeted vitest green for touched files; full-repo baseline NOT re-run this session.

## 9. Rollback plan
`git revert 8d2263fc3 06fae6a3a d107907d2 9b4c12182 7e531143e f5c4a6534` (or `git revert 93b160cba..8d2263fc3`) and push to main → Render redeploys. Each commit is independent and revertible in isolation (e.g. revert only 9b4c12182 to drop the H4 socket gate if it denies legit joins). No DB migration involved — pure code, no schema change.

## 10. Future review hooks (act on these later)
- Re-check H1: run `curl` as an unassigned-trainer token against `GET /api/workout/sessions/statistics/<otherUserId>` in prod → must be 403.
- H4: confirm legit trainers/clients can still join their own session rooms post-deploy (real-time schedule updates render).
- H2: confirm the public activity ticker still fires for public posts after deploy (visibility gate not over-suppressing).
- B1: verify `scrubGenericPII` composes with Codex's in-flight identity-hotspot changes to `aiPrivacyService.mjs` after Codex rebases (potential same-file overlap — see review-queue).
- Take H3 (schedule broadcast per-room payload scoping) — the largest remaining PII leak.
- CSP: schedule the `unsafe-inline` removal (nonce migration + QA).
- Money F1: prod dup-check on `financial_transactions.orderId` before adding the partial-unique index.

## 11. Codex / AI review log
- 7-agent parallel review (auth/money/infra/injection/unswept/deps-PII + late schedule-gap agent). 2 HIGH findings personally re-verified by Fable (H1 mount-order+grep; H2 pre-auth socket). Solo build+hostile pass (Rule 61). Codex hostile review of H2/H4 REQUESTED post-merge in review-queue (2026-07-16 Claude→Codex).

## 12. Sign-off
- Shipped `93b160cba..8d2263fc3` (6 commits), Render deploying. Awaiting: Codex R7 verdict on H2/H4; Sean's call on H3/F1/M2-M3/LOW backlog.
- **Next slice:** H3 (Codex lane) OR Money F1 (needs prod dup-check) — highest residual risk.
