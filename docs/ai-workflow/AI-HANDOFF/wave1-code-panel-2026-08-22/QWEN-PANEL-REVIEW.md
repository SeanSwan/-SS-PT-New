# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-CODE-REVIEW-PACKET-2026-08-22.md
**Tokens (Ollama):** 26593 in / 1944 out | **Wall:** 26.2s | **done_reason:** stop

---
## VERDICT
REVISE — The diff is fundamentally sound and fail-closed, but it contains a P0 authorization bypass in the `create` scope that allows a free-tier client to inject themselves into an existing group conversation containing a stranger, and a P1 compliance gap where the re-consent prompt is defined but never wired to the UI.

## BLOCKERS
1. **P0 — Authorization Bypass via `create` Scope (IDOR/Group Injection)**
   - **Failure Scenario:** A free-tier client (with an active trainer assignment) calls `POST /conversations` with `participantIds: [STRANGER_ID]`. The middleware checks if `STRANGER_ID` is in the client's `counterparties` set. It is not, so it returns 403. **HOWEVER**, if the client instead calls `POST /conversations/:id/participants` (Add group participants) with `participantIds: [STRANGER_ID]`, the middleware uses `scope: 'conversation'`. It checks if the *actor* is a member of conversation `:id` and if the *other* participants are counterparties. If the actor is already in a group with their trainer, and they add a stranger, the middleware checks if the *stranger* is a counterparty. It is not. It returns 403. **WAIT**, let me re-read the `create` scope logic.
   - **Correction:** The `create` scope logic is: `ids.every((id) => counterparties.has(id))`. If I try to create a conversation with a stranger, it fails.
   - **Real P0:** The `conversation` scope logic for `POST /conversations/:id/participants` (Add participants) allows a user to add *anyone* to a conversation they are already in, **provided the existing other participants are counterparties**.
     - **Scenario:** Client A (free, trainer T) is in a group conversation with Trainer T and Client B (stranger). This group was created by Trainer T (who has staff bypass). Client A is a member. Client A calls `POST /conversations/:id/participants` with `participantIds: [Client C]`.
     - **Middleware Check:** `scope: 'conversation'`. `loadConversationMembers` returns `actorIsMember: true`, `others: [T, B]`. `counterparties: [T]`.
     - **Logic:** `allInside = membership.others.every((id) => counterparties.has(id))`.
     - **Result:** `T` is in `counterparties`. `B` is **NOT** in `counterparties`. So `allInside` is `false`. It returns 403.
     - **Wait, the logic is correct for existing members.**
   - **Let's look at `create` again.** `POST /conversations`. `body.participantIds`. If I pass `[Trainer, Stranger]`, it fails. If I pass `[Stranger]`, it fails.
   - **Is there a bypass?**
     - What if I create a conversation with **only** my trainer? `participantIds: [Trainer]`. `allInside` is true. `next()`. The controller creates the conversation. I am now a member.
     - Now I call `POST /conversations/:id/participants` with `participantIds: [Stranger]`.
     - Middleware `scope: 'conversation'`. `loadConversationMembers` returns `others: [Trainer]`. `counterparties: [Trainer]`. `allInside` is true. `next()`.
     - **The Controller adds the Stranger to the conversation.**
     - **Result:** I have successfully added a stranger to a conversation. I can now send messages to this group. The stranger can see my messages. This is a **P0 IDOR/Group Injection**. The `create` scope restricts who you can *initiate* with, but the `conversation` scope (used for adding participants) only checks if the *existing* members are counterparties, not the *new* ones being added. The `addConversationParticipants` controller receives `req.body.participantIds` and adds them. The middleware does **not** validate the *new* participants against the counterparties set in the `conversation` scope. It only validates the *existing* ones.
     - **Evidence:** `requireMessagingAccess.mjs` lines 240-250 (scope === 'conversation'). It checks `membership.others.every(...)`. It does **not** check `req.body.participantIds`. The `addConversationParticipants` route uses `messagingThread` (scope: 'conversation').

2. **P1 — Re-consent Prompt Not Wired**
   - **Failure Scenario:** `aiConsentCopy.ts` defines `AI_CONSENT_RECONSENT_PROMPT` and states "v1.0 consents... require re-consent." However, `AiConsentScreen.tsx` and `ConsentSection.tsx` do not import or render this prompt. They only render the new `v2.0` disclosure. Users who granted consent under `v1.0` are not prompted to re-consent. They are simply shown the new text on their next visit, but the system does not explicitly flag that their previous consent is invalid or requires re-confirmation. This is a compliance gap.
   - **Evidence:** `aiConsentCopy.ts` line 138 defines the prompt. `AiConsentScreen.tsx` and `ConsentSection.tsx` do not import it.

## ATTACKS
- **Correctness:**
  - **Race Condition in `create` Scope:** If two requests are made simultaneously to create a conversation with the same participants, the middleware checks `counterparties` before the controller creates the conversation. This is safe.
  - **Null/Undefined:** `toId` handles null/undefined. `loadAssignedCounterpartyIds` returns `null` on error, which is treated as deny. Good.
  - **Stale State:** `resolveCurrentEntitlement` is cached in `req._resolvedEntitlement`. If the user's tier changes during the request, it won't be reflected. This is acceptable for a single request.
  - **Unhandled Error Paths:** `resolveMessagingCapabilities` catches errors and returns `DENY_ALL`. Good.

- **Security:**
  - **IDOR:** As identified in Blocker 1, the `conversation` scope does not validate new participants in `addConversationParticipants`.
  - **Injection:** SQL queries use parameterized replacements (`:id`, `:convId`). Good.
  - **SSRF:** No external requests made in the middleware.
  - **Secret Handling:** No secrets logged. `logger.info` logs field names, not values. Good.
  - **Replay/Idempotency:** Not applicable to this diff.
  - **Multi-tenant Scope Leaks:** The `client_trainer_assignments` table is queried by `clientId` or `trainerId`. No cross-tenant leak.
  - **Rate-limit/DoS:** No rate limiting added, but this is not a new risk.

- **Data-truth / schema drift:**
  - **Model Column vs Caller Field Drift:** The `conversation_participants` table is snake_case, and the query uses `user_id`, `conversation_id`. Good.
  - **PascalCase-vs-snake_case Table Drift:** The `client_trainer_assignments` table is snake_case, and the query uses `"clientId"`, `"trainerId"` (quoted camelCase columns). The comment in the file confirms this is the correct schema. Good.
  - **FK Target Drift:** Not applicable.
  - **Frontend Response-shape Drift:** `useMessagingCapabilities` expects `canMessageAssignedCoach` and `canUseCommunityDirectMessages`. The backend `resolveMessagingCapabilities` returns these exact fields. Good.

## HIGHEST RISK
The **P0 Authorization Bypass** in the `conversation` scope for `addConversationParticipants`. The cheapest way to de-risk this is to add a check in the `conversation` scope of `requireMessagingAccess` that validates `req.body.participantIds` (if present) against the `counterparties` set, similar to the `create` scope. This can be done in a single line: `if (req.body?.participantIds) { const newIds = req.body.participantIds.map(toId).filter(Boolean); if (!newIds.every((id) => counterparties.has(id))) return sendOutsideRelationship(res); }`.

## CONFIDENCE
I am confident in the P0 blocker because the code path is clear: `addConversationParticipants` uses `messagingThread` (scope: 'conversation'), which does not validate new participants. I am less confident in the P1 blocker because the re-consent prompt might be handled elsewhere in the codebase (e.g., in the `grantConsent` API or a separate component), but the diff does not show it. I would need to see the `grantConsent` implementation to confirm.
