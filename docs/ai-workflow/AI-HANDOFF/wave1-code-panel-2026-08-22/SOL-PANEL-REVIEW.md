# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-CODE-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 133383 in / 36006 out · **Cost:** ~$0.5508 · **Wall:** 280.2s · **finish:** stop

---

## VERDICT
REJECT — the diff permits relationship-lane authorization escalation and sends data inconsistent with both the consent disclosure and the binding zero-PII policy.

## BLOCKERS
1. **P0 — arbitrary direct identifiers can reach the LLM.** Input such as `{ notes: "Client Jane Smith trains at 14 Main Street", client: { passportNumber: "X123" } }` is not on the path denylist and contains neither an email nor phone pattern, so it survives de-identification and is forwarded. The document itself admits that “everything else the caller includes is forwarded.” This violates the non-negotiable zero-PII rule and makes the “training-relevant information only” disclosure false. Evidence: `backend/services/deIdentificationService.mjs:293-307`, `frontend/src/content/aiConsentCopy.ts:17-25`.

2. **P1 — the disclosure falsely says sleep data is never sent.** With default configuration, `lifestyle.sleepHours: 7` remains in the outbound payload, while every changed consent surface says sleep data is withheld or “never sent.” Setting `COACH_HEALTH_FIELDS_ENABLED=true` also forwards the other sleep, stress, and supplement fields without any code-enforced consent-version check. Evidence: `backend/tests/api/aiPrivacy.test.mjs:218-231`, `backend/services/deIdentificationService.mjs:68-89`, `frontend/src/content/aiConsentCopy.ts:85-99`, `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx:649-653`.

3. **P1 — a relationship-lane group owner can add unrelated users.** State: free client is owner/admin of a group containing only themselves and their assigned trainer. Request: `POST /conversations/:id/participants` with `participantIds:[STRANGER_ID]`. The middleware validates only the existing members, never the requested additions or `adminIds`, then the controller’s documented owner/admin policy can add the stranger. This bypasses the elite community-DM rule and may expose existing coach/client thread history to the added user. Evidence: `backend/routes/messagingRoutes.mjs:57-62`, `backend/middleware/requireMessagingAccess.mjs:224-250`.

4. **P1 — list scope exposes old community conversations after downgrade.** State: a formerly elite client has conversations with unrelated members, then downgrades while retaining an active trainer assignment. `GET /conversations` passes solely because any assignment exists; the controller is only self-scoped, not relationship-scoped, so it can return all of that user’s conversations, including unrelated community threads and their metadata/previews. Community access is therefore not actually elite-gated for reads. Evidence: `backend/middleware/requireMessagingAccess.mjs:184-193,215-217`, `backend/routes/messagingRoutes.mjs:41-42`.

5. **P1 — assignment and participant checks are TOCTOU authorization checks.** State: assignment and membership are active when middleware performs its two queries; assignment is revoked or an unrelated participant is added before the controller writes. The middleware has already called `next()`, so the message or mutation proceeds against state that no longer authorizes it. No transaction, row lock, authorization predicate in the write, or revision check connects the checks to the operation. Evidence: `backend/middleware/requireMessagingAccess.mjs:228-250`.

6. **P1 — v1 consent is declared invalid but no re-consent enforcement is wired.** State: an existing user has a stored v1 consent. The diff changes displayed text to v2 and defines a re-consent prompt, but shows no consent-record version update, server-side version comparison, invalidation, or use of `AI_CONSENT_RECONSENT_PROMPT`. Unless undisclosed existing code already performs that comparison, the old consent remains usable while the system claims it “require[s] re-consent.” Evidence: `frontend/src/content/aiConsentCopy.ts:49-58,132-140`; `AiConsentScreen.tsx:666` and `ConsentSection.tsx:253-260` use the version only in displayed copy.

7. **P2 — binding house rules are violated.** The new messaging test is 343 lines, exceeding the 300-line maximum; modified production files already extend past lines 648 and 732; and a touched consent line uses hard-coded `#10b981` instead of `var(--token,#fallback)`. These are non-negotiable ship gates regardless of runtime behavior. Evidence: `backend/tests/api/messagingRelationshipLane.test.mjs:1-343`, `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx:648-669`, `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx:732-740`.

## ATTACKS
- **Correctness:**
  - Capabilities are fetched only on mount or manual `refresh`, which is not used here. Assignment or trial changes leave the UI stale until remount; revocation leaves the composer open while the API begins rejecting operations.
  - `MessagingView` ignores the capability request’s `error`, so a network or server outage is rendered as an upsell rather than an operational failure.
  - `canUseCommunityDirectMessages` is fetched but not used to constrain compose/search UI. A relationship-only client sees the general messaging surface and discovers restrictions through 403 responses.
  - `toId()` uses permissive `parseInt`; values such as `"900junk"` resolve to `900`. Route validators run after the authorization middleware, causing authorization queries against a different value from the eventual validated input.
  - The focus trap explicitly does not make the background `inert`. Keyboard focus is contained, but screen-reader virtual navigation may still reach the page behind the modal drawer.

- **Security:**
  - Group participant additions and `adminIds` are not authorized against assigned counterparties.
  - Relationship authorization is separated from mutations, permitting assignment-revocation and participant-membership races.
  - Staff bypasses all middleware checks and therefore depends entirely on every downstream controller enforcing conversation membership and tenant scope.
  - The new capability endpoint performs entitlement and assignment queries without a shown rate limit; authenticated request floods can amplify database load.
  - Real-time socket handlers are absent from the packet. If messages or subscriptions can occur over sockets, they may retain the old tier rule, deny the intended users, or bypass the new relationship rule entirely.
  - `/users/search` remains open to every authenticated user. Enabling the full messaging UI for relationship-only clients may expose a pre-existing user-directory or tenant-scope leak.

- **Data-truth / schema drift:**
  - The gate covers selected path spellings, not semantic categories. `lifestyle.sleepHours` already demonstrates the drift between “sleep data” and enumerated sleep fields.
  - All values under `health.conditions` are forwarded; nothing establishes that each condition “affect[s] exercise,” as the disclosure claims.
  - New aliases such as `currentMedications`, `sleep_hours`, `physicianName`, free-text notes, or nested contact records will pass unless separately denylisted.
  - The de-identification comment initially categorizes “conditions” as denied while the implementation deliberately preserves them, making future maintenance error-prone.
  - The claimed single source of consent truth is not actually used for the protection bullets: both `AiConsentScreen` and `ConsentSection` duplicate prose instead of rendering `AI_CONSENT_PROTECTIONS`.
  - The supplied assignment and participant SQL matches the stated quoted-camelCase and snake_case schemas; I found no demonstrated table-name drift in those queries.

## HIGHEST RISK
The denylist boundary can send arbitrary direct identifiers and sensitive free text to the LLM. Cheapest de-risk: disable Swan Coach outbound processing for this release, then replace the denylist with an explicit outbound allowlist DTO and add a test containing sentinel names, addresses, account numbers, and unknown nested fields that must never appear in the provider request.

## CONFIDENCE
I could not verify the downstream messaging controllers, socket handlers, conversation-list response shape, whether newly added participants receive historical messages, consent database schema, production value of `COACH_HEALTH_FIELDS_ENABLED`, queued-job behavior after withdrawal, or the audit-log claim that only hashes—and never raw prompts—are stored.

Evidence that would settle those gaps:

- Full `messagingController.mjs` and all messaging Socket.IO handlers, including membership and tenant predicates.
- A real-database integration test that revokes an assignment or adds a participant between authorization and message insertion.
- The consent model, grant/status endpoints, AI-generation gate, and a test proving a stored v1 consent receives 403 until v2 is recorded.
- Production deployment configuration proving the health-field flag is off and cannot be toggled without a consent migration.
- The context builder and captured provider-bound payload for representative production schemas.
- AI interaction logging and queue code proving raw prompts, responses, and withdrawn users are handled as the disclosure claims.
