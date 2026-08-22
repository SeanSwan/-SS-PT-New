# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/TRAINER-DASHBOARD-AUDIT-REVIEW-PACKET-2026-08-21.md
**Tokens (Ollama):** 5449 in / 2822 out | **Wall:** 26.6s | **done_reason:** stop

---
## VERDICT
REJECT the plan as a basis for building, because it mandates breaking live sessions (fail-closed flips on a production SaaS) without defining migration paths, rollback mechanisms, or verifying that the "vulnerabilities" exist in the current `origin/main` codebase.

## WHERE THE AUDIT IS PROBABLY WRONG

1.  **Claim:** "Challenge moderation is not assignment-scoped... One trainer can reach submissions belonging to another trainer's clients."
    *   **Alternative Explanation:** The backend likely enforces assignment scoping via a Sequelize `scope` or a `WHERE clause` in the `getManagedChallengeSubmissionQueue()` implementation that the static reviewer missed because they only looked at the function signature. The "global" nature might be a design choice where trainers see *all* studio challenges (common in boutique gyms) but can only *moderate* their own, or the "moderation" action is strictly admin-gated at the route level despite the shared role check.
    *   **Probe:** `grep -r "getManagedChallengeSubmissionQueue" server/` and inspect the SQL generation or Sequelize query builder for `assignmentId` or `trainerId` filters. If the query joins `client_trainer_assignments`, the P0 is false.

2.  **Claim:** "Swan Coach chat authorization can outlive client unassignment... A trainer can create a conversation... In that case, later messages do not satisfy `conversation.role === "trainer"`."
    *   **Alternative Explanation:** The "soft access" flag `AI_CHAT_CLIENT_ACCESS_SOFT=true` is likely a development-only flag that is explicitly disabled in the production environment configuration (Render env vars). The "escape hatch" might be a feature for "guest" or "trial" clients who are not yet assigned to a trainer but are in the studio, which is a valid business flow, not a vulnerability. The "stale" context might be handled by the frontend clearing the context on 403 responses, which the static audit cannot see.
    *   **Probe:** Check `render.yaml` or `.env.example` for `AI_CHAT_CLIENT_ACCESS_SOFT`. If it is `false` or unset in production, the "production escape hatch" claim is invalid. Also, check the `sendMessage` controller for a `WHERE trainer_id = req.user.id` clause that overrides the conversation role check.

3.  **Claim:** "Schedule conflict endpoint trusts arbitrary trainer/client IDs... A trainer could therefore probe another trainer's calendar."
    *   **Alternative Explanation:** The `check-conflicts` endpoint is likely a *read-only* utility for UI rendering (e.g., "Is this slot free?") that does not return PII. The "full name" disclosure might be a misreading of a generic "Client A" or a hashed ID. If the endpoint returns only boolean availability or generic slot data, it is not a P0 data leak. The "probing" risk is low because the attacker already has a valid account and can see their own schedule; probing for *other* trainers' schedules is a low-severity info leak, not a cross-tenant data breach.
    *   **Probe:** `curl -X POST /api/sessions/check-conflicts` with a valid trainer token and a fake `trainerId`. Inspect the JSON response. If it returns `{"available": true}` or `{"slots": [...]}` without names, the severity is P2/P3, not P0.

4.  **Claim:** "Selected-client state is stale and not actor-scoped... Wrong client can remain pinned after account changes."
    *   **Alternative Explanation:** The `GlobalClientContext` is likely a *UI state* helper, not an authorization boundary. The backend *always* re-validates the assignment on every write. The "stale" state only affects the UI display (showing the wrong name in a dropdown), not the data integrity. The audit conflates a UX bug (stale UI state) with a security vulnerability (cross-tenant data access). If the backend rejects the write, the "wrong-subject risk" is mitigated by the server.
    *   **Probe:** Attempt a write operation (e.g., log a workout) with a stale `ss-active-client` in localStorage. If the backend returns 403/404, the security risk is zero; the UX risk is low.

5.  **Claim:** "AI consent fails open... The chat path allows AI processing when no consent row exists."
    *   **Alternative Explanation:** The "consent" might be a *client* consent (client agrees to AI analysis), not a *trainer* consent. If the client has consented, the trainer can use AI. The "fail-open" might be a default for new clients who have not yet been asked, which is a business logic choice, not a security flaw. The audit assumes a GDPR-style "opt-in" requirement that may not apply to this B2B2C model.
    *   **Probe:** Check the `consent` table schema and the `createConversation` logic. If the consent is tied to the `clientId` and the client has a `consent_status = 'active'` row, the "missing consent" scenario is a data integrity issue, not a security bypass.

## WHAT THE AUDIT MISSED (absence-first)

1.  **WebSocket/Socket.io Authentication:** The audit mentions "Swan Coach chat" but does not address the real-time layer. If the chat uses WebSockets, the `socket.io` middleware must validate the token on *every* message, not just on connection. A stale token in a long-lived socket connection is a classic vulnerability. **Missing Check:** `grep -r "io.use" server/` to verify socket-level auth.
2.  **File Upload Path Traversal:** The audit mentions "voice-upload" but does not check for `path.join` vulnerabilities or MIME type spoofing. If the upload handler uses `req.file.path` without sanitization, a trainer could write files to arbitrary locations. **Missing Check:** Inspect the `multer` or `busboy` configuration for `dest` and `filename` sanitization.
3.  **Rate Limiting on AI Endpoints:** The audit mentions "bulk-operation limits" for Coach commands but not for the AI inference endpoints. A single trainer could DoS the LLM provider by spamming requests, impacting all other trainers. **Missing Check:** Verify `express-rate-limit` or `cloudflare` rules on `/api/ai/*` routes.
4.  **PII in LLM Prompts:** The audit states "Zero PII to LLMs" as a house rule, but does not verify that the *prompt construction* code strips PII. If the `buildPrompt` function includes `client.name` or `client.email`, the house rule is violated. **Missing Check:** `grep -r "buildPrompt" server/` and inspect the string interpolation for PII fields.
5.  **Database Row-Level Security (RLS):** The audit relies on application-level checks. If the Postgres database does not have RLS policies, a SQL injection or ORM bug could bypass all application checks. **Missing Check:** `psql -c "SELECT * FROM pg_policies;"` to verify RLS is enabled on `client_trainer_assignments` and `sessions`.
6.  **Session Fixation:** The audit mentions "refresh tokens in localStorage" but does not check for session fixation attacks. If the session ID is not regenerated on login, an attacker could fixate a session. **Missing Check:** Verify `express-session` or `passport` configuration for `regenerate` on login.

## BLAST RADIUS OF THE FIX

1.  **Gate 1 (Assignment Check on Every Request):**
    *   **Who Breaks:** All trainers.
    *   **How it Presents:** If the `client_trainer_assignments` table is slow or unavailable, every request will hang or fail. A "cold cache" on a new Render instance will cause a 200-500ms latency spike on the first request of the day.
    *   **Rollback:** There is no rollback. If the check is added, it is always on. If it is buggy, trainers are locked out. **This is a worse outcome than the vulnerability.**
    *   **Mitigation:** Implement a circuit breaker. If the assignment check fails 3 times in 10 seconds, fall back to a cached assignment or allow the request with a warning log. Do not fail-closed on a live product without a fallback.

2.  **Gate 2 (Stale Client State):**
    *   **Who Breaks:** Trainers with multiple clients.
    *   **How it Presents:** If the "rehydrate exclusively from the newly fetched authorized roster" logic is buggy, trainers may lose access to clients they are still assigned to.
    *   **Rollback:** Revert the frontend state management. The backend checks remain, so security is preserved.
    *   **Mitigation:** A/B test the new state management on 10% of trainers before full rollout.

3.  **Gate 3 (Consent Fail-Closed):**
    *   **Who Breaks:** Trainers with clients who have not consented.
    *   **How it Presents:** Trainers will see "AI Unavailable" for clients who have not consented. This may be a business blocker if the consent flow is not user-friendly.
    *   **Rollback:** Revert to fail-open. This is a business decision, not a security one.
    *   **Mitigation:** Add a "Request Consent" button in the UI that sends a notification to the client. Do not block the trainer entirely.

4.  **Gate 4 (Protect `main`):**
    *   **Who Breaks:** Developers who push directly to `main`.
    *   **How it Presents:** Pushes will be rejected.
    *   **Rollback:** Disable branch protection.
    *   **Mitigation:** This is a low-risk change. Implement it first.

## SEQUENCING AND PLAN QUALITY

The 5-gate order is **wrong**.

1.  **Gate 4 (Protect `main`) should be first.** It is low-risk, high-reward, and prevents future regressions. It can be shipped in parallel with everything else.
2.  **Gate 1 (Assignment Check) should be last.** It is the highest-risk change. It should be implemented after the other gates are stable, and with a circuit breaker.
3.  **Gate 2 (Stale State) and Gate 3 (Consent) can be shipped in parallel.** They are independent.
4.  **Gate 5 (UX) should be last.** It is low-risk but low-priority.

**Smallest change to remove most risk:** Protect `main` (Gate 4). This prevents the most common source of vulnerabilities: unreviewed code.

**Single-point-of-failure:** `authorizeSubjectAccess()`. If this function is buggy, all trainer operations fail. **Mitigation:** Implement a "bypass" mode for admins that is logged and alerted. Do not make it a hard dependency for all requests.

**Mechanism to make the check impossible to skip:** Use a **Sequelize Scope** that is automatically applied to all queries involving `clientId`. This is a database-level control that cannot be bypassed by application code.

## HIGHEST RISK

**The highest risk is the "Fail-Closed" flip on a live product.** The audit proposes flipping several fail-open gates to fail-closed without a migration path. This will lock out paying trainers, causing churn and support tickets. The vulnerability is theoretical (static audit), but the breakage is real.

**Cheapest way to de-risk:** Implement a **"Shadow Mode"** for the new checks. Log the violations but do not block the requests. Monitor the logs for 1-2 weeks. If no violations are found, the vulnerability is false. If violations are found, implement the fail-closed check with a circuit breaker.

## CONFIDENCE

**What I could NOT determine:**
1.  Whether the `getManagedChallengeSubmissionQueue()` function actually lacks assignment scoping. (Static audit claim, unverified.)
2.  Whether the `AI_CHAT_CLIENT_ACCESS_SOFT` flag is enabled in production. (Static audit claim, unverified.)
3.  Whether the `check-conflicts` endpoint returns PII. (Static audit claim, unverified.)

**Exact evidence that would settle each:**
1.  `grep -r "getManagedChallengeSubmissionQueue" server/` and inspect the query.
2.  Check `render.yaml` or `.env.example` for `AI_CHAT_CLIENT_ACCESS_SOFT`.
3.  `curl -X POST /api/sessions/check-conflicts` with a valid token and fake `trainerId`.

**My uncertainty:** I am 80% confident that the audit is overestimating the severity of the findings. The "P0" labels are likely inflated. The "Fail-Closed" plan is dangerous and should be rejected. The "Protect `main`" gate is the only one that should be shipped immediately.
