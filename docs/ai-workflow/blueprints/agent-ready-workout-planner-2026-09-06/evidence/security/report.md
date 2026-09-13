# Security Review: SS-PT

## Scope

Current working checkout: Swan Coach provider and outbound privacy controls

- Scan mode: scoped_path
- Target kind: git_worktree
- Target ID: target_sha256_d83e3e9775e4fbbbd0725d34852fa8bc9092ee2f1b20d7afffb0d15acaa52256
- Revision: a89cbf0f080644877ae8a45729d3f0a59d4cb8b8
- Snapshot digest: codex-security-snapshot/v1:sha256:053fb510129edc8352e61400554d0fa7afc6584d9843246b92f163a4db8b2230
- Inventory strategy: scoped_path
- Included paths: backend
- Excluded paths: none
- Runtime or test status: No live auth/SQL/provider egress or production deployment checked
- Artifacts reviewed: backend/middleware/aiConsent.mjs, backend/middleware/piiSanitizationMiddleware.mjs, backend/middleware/waiverGate.mjs, backend/middleware/optionalAuth.mjs, backend/middleware/aiCommandGuards.mjs, backend/controllers/aiConsentController.mjs, backend/controllers/publicWaiverController.mjs, backend/models/AiPrivacyProfile.mjs, backend/routes/aiRoutes.mjs, backend/routes/aiChatRoutes.mjs, backend/routes/aiCommandRoutes.mjs, backend/routes/publicWaiverRoutes.mjs, backend/services/aiPrivacyService.mjs, backend/services/voiceTranscriptionService.mjs, backend/services/deIdentificationService.mjs, backend/services/ai/aiEligibilityHelper.mjs, backend/services/ai/aiChatPromptPrivacy.mjs, backend/services/ai/phiScanner.mjs, backend/services/ai/deIdentifier.mjs, backend/services/ai/intentClassifier.mjs, backend/services/ai/providerRouter.mjs, backend/services/ai/contextEngine/clientAccess.mjs, backend/services/waivers/waiverVersionEligibilityService.mjs, backend/services/privacy/PIIManager.mjs, backend/tests/unit/aiChatPromptPrivacy.test.mjs, backend/utils/logger.mjs

Limitations and exclusions:
- Live selected providers, privacy retention and network egress were not checked.
- Newer main packet differs from this current working checkout; reconcile findings onto current main before repairs.
- Speech, attachment, embeddings, memory, logs, all secondary enrichment services and all backend files are not exhaustively runtime-tested.
- Child and unknown-age cloud processing must default deny in the proposed policy until verified guardian and age policy is approved.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 9 |
| Severity mix | high: 1, medium: 8 |
| Confidence mix | high: 9 |
| Coverage | partial |
| Validation mode | Static source plus five dependency-isolated reproductions; source unchanged |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Source-backed architecture review of the current repository at C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT, limited to Swan Coach provider connections and representative chat, command-classification, workout-generation, and voice privacy boundaries. This is architecture mapping, not completed security-audit coverage. Express mounts /api/ai, /api/ai-chat, and /api/ai-command separately (backend/core/routes.mjs:625-632). Coach's frontend chat action calls useAIChat, which posts conversations and messages to /api/ai-chat (frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts:203-204; frontend/src/hooks/useAIChat.ts:425-449). Chat and command classification use sendChatMessage with an internal provider chain; workout generation uses a separate registered-adapter router; transcription and TTS directly call Google. Render configuration starts the backend through npm start and render-start.mjs, while development uses an environment preload before server.mjs (render.yaml:12-23; backend/package.json:8-10; backend/scripts/render-start.mjs:92-95). Actual production configuration, credentials, database contents, network egress, and runtime behavior were not inspected.

### Assets

- Client identities and identity-linked health information: names, contact details, age, injuries, medications, measurements, pain, movement assessments, and workout histories. The documented chat policy deliberately retains fitness and medical information while stripping identity (backend/services/aiPrivacyService.mjs:14-18); workout generation explicitly loads waiver medicalConditions, injuries, and medications into generation context (backend/controllers/aiWorkoutController.mjs:565-578,641-654).
- Client and child privacy and consent decisions. User-supplied objective: verify protection of client, child, and medical data before deciding how to connect alternative brains. Existing application consent state includes aiEnabled, consentVersion, consentedAt, and withdrawnAt; trainers cannot grant consent for clients (backend/controllers/aiConsentController.mjs:49-98). Child-specific cloud eligibility remains an unresolved boundary in the representative chains.
- Conversation contents and target-client associations stored in ai_conversations.messages JSONB. The route stores message content after request middleware processing but before target-specific identity replacement; returned assistant content receives additional target-specific scrubbing when a client is selected (backend/models/AiConversation.mjs:62-66,94-102; backend/routes/aiChatRoutes.mjs:733-785).
- Server-held provider credentials and control over request destinations. Chat reads GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, and VENICE_API_KEY; the workout OpenAI adapter additionally accepts generic AI_API_KEY and AI_BASE_URL overrides (backend/services/aiChatService.mjs:2094-2115; backend/services/ai/adapters/openaiAdapter.mjs:29-31,137-162).
- Backend command authority remains distinct from model output. Command processing performs classification before registry validation, write kill-switch checks, RBAC, client resolution, confirmation, and execution (backend/services/ai/commandExecutor.mjs:516-526). The security of every individual dispatcher was outside this architecture pass.

### Trust Boundaries

- Authenticated browser to chat conversation: all aiChatRoutes require protect; creation assigns owner and role from req.user, and clients cannot select another target user. Sending messages loads an active conversation scoped to req.user.id (backend/routes/aiChatRoutes.mjs:283,308-329,553-562).
- Trainer to client records: selected-client chat invokes checkClientAccess when both stored conversation role and current role are trainer. The helper permits self, an active assignment, or session history, and denies verification failures. AI_CHAT_CLIENT_ACCESS_SOFT=true changes a denial into warn-and-continue behavior in this chat caller (backend/routes/aiChatRoutes.mjs:599-625; backend/services/ai/contextEngine/clientAccess.mjs:43-100). Workout generation independently requires active trainer assignment, with client requests limited to self (backend/controllers/aiWorkoutController.mjs:241-293).
- Chat consent to outbound AI: the inline chat check denies an existing disabled or withdrawn profile, but explicitly permits missing profiles and failed consent queries. This is materially different from strict requireAiConsent and from workout eligibility (backend/routes/aiChatRoutes.mjs:565-588).
- Chat message and history to cloud providers: strictPiiMiddleware runs on message submission; target-specific identity stripping occurs when enrichUserId exists; recent history is scrubbed again. The caller substitutes withholding placeholders when stripping throws. However, fetchClientIdentity internally returns null on query failure, and stripIdentityFromMessage continues using an empty identity list plus best-effort generic PII sanitization, so not every identity-resolution failure reaches that caller catch (backend/routes/aiChatRoutes.mjs:466,599-640,720-742; backend/services/ai/aiChatPromptPrivacy.mjs:20-47; backend/services/aiPrivacyService.mjs:38-49,112-154).
- Medical data to cloud providers: the request middleware flags medical conditions and medications without necessarily redacting or blocking them. The policy is identity stripping, not a prohibition on external medical-data processing. Server-derived medical context is appended to generation data after initial master-prompt de-identification (backend/middleware/piiSanitizationMiddleware.mjs:195-207; backend/services/aiPrivacyService.mjs:14-18; backend/controllers/aiWorkoutController.mjs:431-447,565-578,641-654).
- Command input to cloud classification: /api/ai-command/execute authenticates and rate-limits, then sanitizes and PHI-strips the primary message before classification. The same request passes previousContext separately, and the classifier inserts it after those message checks. The public route forces selectedClientName to null, providing counterevidence against treating the classifier's selectedClientName option as a current route-supplied identity disclosure (backend/routes/aiCommandRoutes.mjs:119-168; backend/services/ai/commandExecutor.mjs:175-215; backend/services/ai/intentClassifier.mjs:106-138).
- Workout generation to registered providers: controller checks target ownership and consent eligibility, de-identifies its master prompt, assembles server constraints, and invokes routeAiGeneration. The router controls provider order, configuration checks, circuit breakers, retries, and timeout budget, but does not itself establish per-client privacy or consent authorization (backend/controllers/aiWorkoutController.mjs:241-327,431-447,714-721; backend/services/ai/providerRouter.mjs:61-66,136-177).
- Raw audio to Google: /api/ai-chat/transcribe accepts an authenticated upload, enforces rate and size constraints, and sends base64 audio as inlineData to Google before a transcript exists. Text sanitization elsewhere cannot retroactively protect this audio transmission (backend/routes/aiChatRoutes.mjs:895-929; backend/services/voiceTranscriptionService.mjs:84-147).
- TTS text to Google: /api/ai-chat/tts accepts authenticated text, validates its type, length, and voice, then sends the text directly to a Google TTS model. Its route does not include strictPiiMiddleware or the chat conversation's consent/identity checks (backend/routes/aiChatRoutes.mjs:283,954-1008).
- Operator configuration to request recipients: chat has fixed cloud endpoints and an internal key-presence failover chain. Workout generation allows an OpenAI-compatible base URL and configurable provider order. Selecting a custom local workout endpoint does not redirect chat, classification, transcription, or TTS (backend/services/aiChatService.mjs:2015-2037,2094-2151,2155-2170,2191-2212,2232-2268,2312-2325; backend/services/ai/adapters/openaiAdapter.mjs:29-31,137-162; backend/services/ai/providerRouter.mjs:61-66).

### Attacker Capabilities

- An unauthenticated remote party can reach the web application but does not possess an authenticated role, provider credential, database privilege, or permission to edit deployment configuration. Representative sensitive routes use protect (backend/routes/aiChatRoutes.mjs:283; backend/routes/aiCommandRoutes.mjs:119; backend/routes/aiRoutes.mjs:47-56).
- An authenticated client can submit messages, command context, audio, and TTS text; clients are constrained to self for selected-client chat creation and workout generation. A failed boundary could add another client's data access or cause prohibited outbound processing, but such an impact must be validated against the actual caller and data source (backend/routes/aiChatRoutes.mjs:326-329; backend/controllers/aiWorkoutController.mjs:241-256; backend/routes/aiCommandRoutes.mjs:121-168; backend/routes/aiChatRoutes.mjs:895-922,954-998).
- A trainer can request target-client processing and supply narrative or historical context, but does not automatically possess access to arbitrary clients or authority to grant their AI consent. Assignment/session checks and the no-trainer-consent-grant rule are relevant controls (backend/services/ai/contextEngine/clientAccess.mjs:61-100; backend/controllers/aiConsentController.mjs:54-59).
- External providers receive the request payloads emitted to them and return untrusted generated content. Provider fallback can send a request to another configured recipient. Providers do not thereby receive database credentials or automatic backend command authority (backend/services/aiChatService.mjs:2022-2037; backend/services/ai/providerRouter.mjs:149-189; backend/services/ai/commandExecutor.mjs:516-526).
- Administrative override and deployment-configuration authority are trusted, separately privileged capabilities. Do not assume an ordinary client can set AI_CHAT_CLIENT_ACCESS_SOFT, change AI_BASE_URL, or register adapters.

### Security Objectives

- Honor the user's requested client, child, and medical privacy boundaries at every outbound consumer, including classification, raw audio, TTS, server enrichment, and provider fallback.
- Require current actor-to-client authorization before loading or releasing target data; preserve independently enforced backend authorization and confirmation around model-proposed actions.
- Make consent withdrawal, missing consent, verification failure, admin override, and minor/guardian eligibility explicit and consistent with the chosen product policy; source evidence currently shows differing policies between chat and workout generation.
- Apply data minimization to the final complete outbound payload rather than assuming that a request-body middleware protects later-added server context or a separate modality.
- Keep credentials server-side and bind every allowed provider or local endpoint to an explicit recipient policy. A local-only option must also constrain fallback destinations across all affected consumers.
- Keep provider and privacy logs useful without recording sensitive contents; storage retention, encryption, and live log redaction require separate verification.

### Assumptions

- No authoritative threat model or knowledge base was supplied. Parent reported no root/backend SECURITY.md. A backend policy inventory using resolve_security_md.py found SECURITY.md files only under node_modules, with no nested application policy in this scope.
- Only current offline source was inspected. No application code or tests ran, no provider was contacted, no secret value was read, and no repository file was changed.
- The default chat provider is Gemini only when GEMINI_API_KEY is present; otherwise key presence determines the next provider. Current live key presence, selected models, endpoint overrides, and failover settings are unknown (backend/services/aiChatService.mjs:2094-2115).
- Startup paths differ: server.mjs attempts repository-root .env then dotenv's default lookup; development preloads repository-root .env or backend/.env before module evaluation. Some adapter defaults are module-level environment reads. Actual effective production configuration must be verified without exposing values (backend/server.mjs:22-34; backend/preload-env.cjs:5-13; backend/package.json:8-10; backend/services/ai/adapters/geminiAdapter.mjs:24; backend/services/ai/adapters/anthropicAdapter.mjs:21).
- Documentation/configuration discrepancy: the sendChatMessage comment describes OpenAI-first ordering, but getAvailableProviders implements Gemini-first ordering (backend/services/aiChatService.mjs:2011-2019,2094-2115).
- Documentation/control discrepancy: aiChatRoutes describes consent enforcement but explicitly permits absent profiles and consent query failures (backend/routes/aiChatRoutes.mjs:461-464,565-588).
- A successful identity-strip call is not proof that target identity was available: lookup failure can be swallowed inside aiPrivacyService. Notes have a stronger explicit null-identity withholding branch than current-message stripping (backend/services/aiPrivacyService.mjs:38-49,112-154,241-252).
- No age/guardian eligibility check was identified in the inspected chat, voice, consent-grant, or workout-consent consumer chains. This is a scoped open question, not proof that the entire repository lacks child-related controls.
- The intended medical policy must be clarified by the parent against user requirements: current source intentionally permits identity-stripped medical context to cloud AI. This architecture review does not certify anonymization or compliance.
- The OpenAI-compatible workout adapter could target a local endpoint through existing configuration, but the source does not establish that a local model is installed, reachable, configured, or isolated. Cloud fallback remains possible unless its order/configuration prevents it (backend/services/ai/adapters/openaiAdapter.mjs:29-31,137-162; backend/services/ai/providerRouter.mjs:61-66,149-189).

## Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [Ordinary role-user accounts can grant or withdraw another client's AI consent](#finding-1) | high | high | inline below |
| [Identity lookup failures silently disable client-name redaction](#finding-2) | medium | high | inline below |
| [Command history is appended after PHI scanning and sent to the cloud unchanged](#finding-3) | medium | high | inline below |
| [Chat discloses client data when AI consent is missing or cannot be verified](#finding-4) | medium | high | inline below |
| [Stored conversation roles preserve privileged client access after account demotion](#finding-5) | medium | high | inline below |
| [Speech endpoints bypass AI withdrawal and send raw sensitive content to Gemini](#finding-6) | medium | high | inline below |
| [An older signed waiver overrides an explicit AI-consent withdrawal](#finding-7) | medium | high | inline below |
| [Chat server enrichment inserts stored goal titles after all request PII scanning](#finding-8) | medium | high | inline below |
| [Workout de-identification preserves known client names embedded in clinical text](#finding-9) | medium | high | inline below |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Ordinary role-user accounts can grant or withdraw another client's AI consent

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | broken-access-control |
| CWE | CWE-862 |
| Affected lines | backend/controllers/aiConsentController.mjs:49-60 |

#### Summary

An ordinary account can re-enable a victim's withdrawn AI consent, disable their AI features, and retrieve their consent metadata. This finding does not independently grant access to the victim's clinical records.

#### Root Cause

User.role supports user and defaults to user: backend/models/User.mjs:123-126. Public registration permits/defaults to user: backend/controllers/authController.mjs:266,548-549. POST /api/public/waivers/submit uses optionalAuth; authenticated submissions link req.user.id directly, regardless of role: backend/controllers/publicWaiverController.mjs:280-303. POST /api/ai/consent/grant and /withdraw use protect without an admin gate: backend/routes/aiRoutes.mjs:68-72. grantAiConsent constrains role client and rejects trainer, but role user falls through to AiPrivacyProfile.findOrCreate/update for body.userId. withdrawAiConsent and getAiConsentStatus repeat the incomplete role restrictions.

**Missing privacy or authorization control** — `backend/controllers/aiConsentController.mjs:49-60`

Only an authorized administrator may manage another client's consent; ordinary accounts may manage only their own. Current source violates this boundary as traced above. Counterevidence: protect requires an active account and linked waiver for role user. Those prerequisites are achievable through the authenticated public waiver path. Target existence/client-role validation does not authorize the requester.

```javascript
    // RBAC: clients can only manage their own consent
    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Trainers cannot grant consent on behalf of clients
    if (requesterRole === 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Trainers cannot grant AI consent on behalf of clients.',
      });
    }
```

#### Validation

Only an authorized administrator may manage another client's consent; ordinary accounts may manage only their own. Current source violates this boundary as traced above. Counterevidence: protect requires an active account and linked waiver for role user. Those prerequisites are achievable through the authenticated public waiver path. Target existence/client-role validation does not authorize the requester.

Validation method: source review plus dependency-isolated synthetic reproduction

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

User.role supports user and defaults to user: backend/models/User.mjs:123-126. Public registration permits/defaults to user: backend/controllers/authController.mjs:266,548-549. POST /api/public/waivers/submit uses optionalAuth; authenticated submissions link req.user.id directly, regardless of role: backend/controllers/publicWaiverController.mjs:280-303. POST /api/ai/consent/grant and /withdraw use protect without an admin gate: backend/routes/aiRoutes.mjs:68-72. grantAiConsent constrains role client and rejects trainer, but role user falls through to AiPrivacyProfile.findOrCreate/update for body.userId. withdrawAiConsent and getAiConsentStatus repeat the incomplete role restrictions.

- **Source:** An active authenticated account with role user and its own linked waiver.

- **Sink:** backend/controllers/aiConsentController.mjs

- **Outcome:** An ordinary account can re-enable a victim's withdrawn AI consent, disable their AI features, and retrieve their consent metadata. This finding does not independently grant access to the victim's clinical records.

**Missing privacy or authorization control** — `backend/controllers/aiConsentController.mjs:49-60`

Only an authorized administrator may manage another client's consent; ordinary accounts may manage only their own. Current source violates this boundary as traced above. Counterevidence: protect requires an active account and linked waiver for role user. Those prerequisites are achievable through the authenticated public waiver path. Target existence/client-role validation does not authorize the requester.

```javascript
    // RBAC: clients can only manage their own consent
    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Trainers cannot grant consent on behalf of clients
    if (requesterRole === 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Trainers cannot grant AI consent on behalf of clients.',
      });
    }
```

#### Reachability

An active authenticated account with role user and its own linked waiver. protect requires an active account and linked waiver for role user. Those prerequisites are achievable through the authenticated public waiver path. Target existence/client-role validation does not authorize the requester.

- **Attacker:** An active authenticated account with role user and its own linked waiver.

- **Entry point:** User.role supports user and defaults to user: backend/models/User.mjs:123-126.

- **Outcome:** An ordinary account can re-enable a victim's withdrawn AI consent, disable their AI features, and retrieve their consent metadata. This finding does not independently grant access to the victim's clinical records.

#### Severity

**High** — Cross-account state mutation is reachable by a supported ordinary account with a linked waiver.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

For every consent operation, explicitly allow admin cross-account operations and constrain all ordinary account roles to self. Reject unknown roles. Add role-user cross-account grant, withdraw, and status regression cases.

Tests:
- For every consent operation, explicitly allow admin cross-account operations and constrain all ordinary account roles to self. Reject unknown roles. Add role-user cross-account grant, withdraw, and status regression cases.

<a id="finding-2"></a>

### [2] Identity lookup failures silently disable client-name redaction

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | fail-open |
| CWE | CWE-636 |
| Affected lines | backend/services/aiPrivacyService.mjs:45-50 |

#### Summary

A failed identity query leaves known client first/last names in outbound messages or retained history. The outer fail-closed logic does not execute because the lower layer reports ordinary success.

#### Root Cause

fetchClientIdentity catches database errors and returns null: backend/services/aiPrivacyService.mjs:38-50. buildIdentityTerms(null) returns an empty list: line 58. stripIdentityFromMessage continues and returns the message after generic PIIManager scanning: lines 117-160. PIIManager patterns do not recognize names: backend/services/privacy/PIIManager.mjs:10-16. The mounted route/history wrapper withholds only when the stripper throws: backend/routes/aiChatRoutes.mjs:630-638; backend/services/ai/aiChatPromptPrivacy.mjs:34-47.

**Missing privacy or authorization control** — `backend/services/aiPrivacyService.mjs:45-50`

The absence of the identity map must not be treated as successful identity stripping. Current source violates this boundary as traced above. Counterevidence: strictPiiMiddleware catches common identifiers and certain contextual full-name patterns in the current message. It does not cover arbitrary client-name mentions, and it does not rescan stored history. The existing history failure test mocks a throwing stripper rather than the real helper that swallows lookup errors. stripIdentityFromNotes correctly withholds when identity is null.

```javascript
    if (results.length === 0) return null;
    return results[0];
  } catch (err) {
    logger.warn('[AIPrivacy] Failed to fetch client identity for stripping:', err.message);
    return null;
  }
```

#### Validation

The absence of the identity map must not be treated as successful identity stripping. Current source violates this boundary as traced above. Counterevidence: strictPiiMiddleware catches common identifiers and certain contextual full-name patterns in the current message. It does not cover arbitrary client-name mentions, and it does not rescan stored history. The existing history failure test mocks a throwing stripper rather than the real helper that swallows lookup errors. stripIdentityFromNotes correctly withholds when identity is null.

Validation method: source review plus dependency-isolated synthetic reproduction

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

fetchClientIdentity catches database errors and returns null: backend/services/aiPrivacyService.mjs:38-50. buildIdentityTerms(null) returns an empty list: line 58. stripIdentityFromMessage continues and returns the message after generic PIIManager scanning: lines 117-160. PIIManager patterns do not recognize names: backend/services/privacy/PIIManager.mjs:10-16. The mounted route/history wrapper withholds only when the stripper throws: backend/routes/aiChatRoutes.mjs:630-638; backend/services/ai/aiChatPromptPrivacy.mjs:34-47.

- **Source:** No malicious actor required; an identity query failure plus a message/history item containing the target client's name.

- **Sink:** backend/services/aiPrivacyService.mjs

- **Outcome:** A failed identity query leaves known client first/last names in outbound messages or retained history. The outer fail-closed logic does not execute because the lower layer reports ordinary success.

**Missing privacy or authorization control** — `backend/services/aiPrivacyService.mjs:45-50`

The absence of the identity map must not be treated as successful identity stripping. Current source violates this boundary as traced above. Counterevidence: strictPiiMiddleware catches common identifiers and certain contextual full-name patterns in the current message. It does not cover arbitrary client-name mentions, and it does not rescan stored history. The existing history failure test mocks a throwing stripper rather than the real helper that swallows lookup errors. stripIdentityFromNotes correctly withholds when identity is null.

```javascript
    if (results.length === 0) return null;
    return results[0];
  } catch (err) {
    logger.warn('[AIPrivacy] Failed to fetch client identity for stripping:', err.message);
    return null;
  }
```

#### Reachability

No malicious actor required; an identity query failure plus a message/history item containing the target client's name. strictPiiMiddleware catches common identifiers and certain contextual full-name patterns in the current message. It does not cover arbitrary client-name mentions, and it does not rescan stored history. The existing history failure test mocks a throwing stripper rather than the real helper that swallows lookup errors. stripIdentityFromNotes correctly withholds when identity is null.

- **Attacker:** No malicious actor required; an identity query failure plus a message/history item containing the target client's name.

- **Entry point:** fetchClientIdentity catches database errors and returns null: backend/services/aiPrivacyService.mjs:38-50.

- **Outcome:** A failed identity query leaves known client first/last names in outbound messages or retained history. The outer fail-closed logic does not execute because the lower layer reports ordinary success.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Return an explicit failure status or throw on unavailable identity. Make every caller withhold sensitive free text on that result. Add tests invoking the actual stripper with a rejected identity query.

Tests:
- Return an explicit failure status or throw on unavailable identity. Make every caller withhold sensitive free text on that result. Add tests invoking the actual stripper with a rejected identity query.

<a id="finding-3"></a>

### [3] Command history is appended after PHI scanning and sent to the cloud unchanged

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | sensitive-data-exposure |
| CWE | CWE-359 |
| Affected lines | backend/services/ai/intentClassifier.mjs:121-135 |

#### Summary

A previousContext string containing names, medical narratives, emails, or SSNs bypasses the current-message privacy scan entirely and reaches configured cloud providers.

#### Root Cause

POST /api/ai-command/execute reads body.previousContext and passes it unchanged: backend/routes/aiCommandRoutes.mjs:121,163-168. stepPHIScan scans only ctx.sanitizedInput: backend/services/ai/commandExecutor.mjs:189-205. stepClassify passes previousContext separately: lines 211-215. classifyIntent prepends previousContext after scanning, then invokes sendChatMessage: backend/services/ai/intentClassifier.mjs:121-135. sendChatMessage performs provider dispatch without additional PII sanitization: backend/services/aiChatService.mjs:2015-2037,2255-2268.

**Missing privacy or authorization control** — `backend/services/ai/intentClassifier.mjs:121-135`

History and auxiliary context must receive the same privacy treatment as the current message. Current source violates this boundary as traced above. Counterevidence: The current message receives injection and PHI scanning. The mounted route deliberately passes selectedClientName:null, so that optional classifier input is not an additional mounted-route bypass. Route-context tokens are allowlisted.

```javascript
  if (previousContext) {
    contextualMessage = `[Recent context: ${previousContext}]\n\nCurrent message: ${contextualMessage}`;
  }

  const systemPrompt = buildClassificationPrompt(userRole);

  let classificationTimer;
  try {
    const result = await Promise.race([
      sendChatMessage(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextualMessage },
        ],
        { maxTokens: 1000, temperature: 0.1 }
```

#### Validation

History and auxiliary context must receive the same privacy treatment as the current message. Current source violates this boundary as traced above. Counterevidence: The current message receives injection and PHI scanning. The mounted route deliberately passes selectedClientName:null, so that optional classifier input is not an additional mounted-route bypass. Route-context tokens are allowlisted.

Validation method: source review plus dependency-isolated synthetic reproduction

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

POST /api/ai-command/execute reads body.previousContext and passes it unchanged: backend/routes/aiCommandRoutes.mjs:121,163-168. stepPHIScan scans only ctx.sanitizedInput: backend/services/ai/commandExecutor.mjs:189-205. stepClassify passes previousContext separately: lines 211-215. classifyIntent prepends previousContext after scanning, then invokes sendChatMessage: backend/services/ai/intentClassifier.mjs:121-135. sendChatMessage performs provider dispatch without additional PII sanitization: backend/services/aiChatService.mjs:2015-2037,2255-2268.

- **Source:** An authenticated command caller or a normal client sending sensitive previousContext content.

- **Sink:** backend/services/ai/intentClassifier.mjs

- **Outcome:** A previousContext string containing names, medical narratives, emails, or SSNs bypasses the current-message privacy scan entirely and reaches configured cloud providers.

**Missing privacy or authorization control** — `backend/services/ai/intentClassifier.mjs:121-135`

History and auxiliary context must receive the same privacy treatment as the current message. Current source violates this boundary as traced above. Counterevidence: The current message receives injection and PHI scanning. The mounted route deliberately passes selectedClientName:null, so that optional classifier input is not an additional mounted-route bypass. Route-context tokens are allowlisted.

```javascript
  if (previousContext) {
    contextualMessage = `[Recent context: ${previousContext}]\n\nCurrent message: ${contextualMessage}`;
  }

  const systemPrompt = buildClassificationPrompt(userRole);

  let classificationTimer;
  try {
    const result = await Promise.race([
      sendChatMessage(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextualMessage },
        ],
        { maxTokens: 1000, temperature: 0.1 }
```

#### Reachability

An authenticated command caller or a normal client sending sensitive previousContext content. The current message receives injection and PHI scanning. The mounted route deliberately passes selectedClientName:null, so that optional classifier input is not an additional mounted-route bypass. Route-context tokens are allowlisted.

- **Attacker:** An authenticated command caller or a normal client sending sensitive previousContext content.

- **Entry point:** POST /api/ai-command/execute reads body.previousContext and passes it unchanged: backend/routes/aiCommandRoutes.mjs:121,163-168.

- **Outcome:** A previousContext string containing names, medical narratives, emails, or SSNs bypasses the current-message privacy scan entirely and reaches configured cloud providers.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Construct a bounded, typed prompt envelope and sanitize all history/context before classification. Resolve client names locally to aliases before any LLM call. Add a provider-boundary test using sensitive previousContext with a harmless current message.

Tests:
- Construct a bounded, typed prompt envelope and sanitize all history/context before classification. Resolve client names locally to aliases before any LLM call. Add a provider-boundary test using sensitive previousContext with a harmless current message.

<a id="finding-4"></a>

### [4] Chat discloses client data when AI consent is missing or cannot be verified

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | fail-open |
| CWE | CWE-636 |
| Affected lines | backend/routes/aiChatRoutes.mjs:569-588 |

#### Summary

Clients who never opted into AI can have health and training data sent to cloud providers. A consent-table/query failure also bypasses an existing withdrawal.

#### Root Cause

Message route checks ai_privacy_profiles: backend/routes/aiChatRoutes.mjs:565-574. SQL errors become an empty result at line 572. Only an existing disabled/withdrawn record blocks; missing records are explicitly allowed at line 584. The outer catch also continues on consent errors. Client context is enriched and dispatched at lines 695-731.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:569-588`

The absence of affirmative AI consent, or inability to verify it, must prevent provider dispatch. Current source violates this boundary as traced above. Counterevidence: An existing disabled or withdrawn profile is denied when the query succeeds. protect's waiver gate requires only a linked waiver, not aiConsentAccepted, and exempts trainers/admins.

```javascript
      const [consentRows] = await sequelize.query(
        `SELECT "aiEnabled", "withdrawnAt" FROM ai_privacy_profiles WHERE "userId" = :userId LIMIT 1`,
        { replacements: { userId: consentTargetId }, type: sequelize.QueryTypes.SELECT }
      ).then(r => [r]).catch(() => [[]]);

      const consent = Array.isArray(consentRows) ? consentRows[0] : consentRows;
      if (consent) {
        if (!consent.aiEnabled || consent.withdrawnAt) {
          return res.status(403).json({
            success: false,
            error: 'AI consent has been withdrawn for this user. Please re-enable AI features in privacy settings.',
            code: 'AI_CONSENT_WITHDRAWN',
          });
        }
      }
      // If no consent record exists, allow (backwards-compatible — user may not have been through onboarding yet)
    } catch (consentErr) {
      // Non-fatal: if consent table doesn't exist yet (migration pending), allow through
      logger.warn('[AIChatRoutes] Consent check failed (non-fatal):', consentErr.message);
    }
```

#### Validation

The absence of affirmative AI consent, or inability to verify it, must prevent provider dispatch. Current source violates this boundary as traced above. Counterevidence: An existing disabled or withdrawn profile is denied when the query succeeds. protect's waiver gate requires only a linked waiver, not aiConsentAccepted, and exempts trainers/admins.

Validation method: independent and parent source review

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

Message route checks ai_privacy_profiles: backend/routes/aiChatRoutes.mjs:565-574. SQL errors become an empty result at line 572. Only an existing disabled/withdrawn record blocks; missing records are explicitly allowed at line 584. The outer catch also continues on consent errors. Client context is enriched and dispatched at lines 695-731.

- **Source:** Any authorized chat caller, including a client with a linked waiver that declined AI processing or an assigned trainer targeting that client.

- **Sink:** backend/routes/aiChatRoutes.mjs

- **Outcome:** Clients who never opted into AI can have health and training data sent to cloud providers. A consent-table/query failure also bypasses an existing withdrawal.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:569-588`

The absence of affirmative AI consent, or inability to verify it, must prevent provider dispatch. Current source violates this boundary as traced above. Counterevidence: An existing disabled or withdrawn profile is denied when the query succeeds. protect's waiver gate requires only a linked waiver, not aiConsentAccepted, and exempts trainers/admins.

```javascript
      const [consentRows] = await sequelize.query(
        `SELECT "aiEnabled", "withdrawnAt" FROM ai_privacy_profiles WHERE "userId" = :userId LIMIT 1`,
        { replacements: { userId: consentTargetId }, type: sequelize.QueryTypes.SELECT }
      ).then(r => [r]).catch(() => [[]]);

      const consent = Array.isArray(consentRows) ? consentRows[0] : consentRows;
      if (consent) {
        if (!consent.aiEnabled || consent.withdrawnAt) {
          return res.status(403).json({
            success: false,
            error: 'AI consent has been withdrawn for this user. Please re-enable AI features in privacy settings.',
            code: 'AI_CONSENT_WITHDRAWN',
          });
        }
      }
      // If no consent record exists, allow (backwards-compatible — user may not have been through onboarding yet)
    } catch (consentErr) {
      // Non-fatal: if consent table doesn't exist yet (migration pending), allow through
      logger.warn('[AIChatRoutes] Consent check failed (non-fatal):', consentErr.message);
    }
```

#### Reachability

Any authorized chat caller, including a client with a linked waiver that declined AI processing or an assigned trainer targeting that client. An existing disabled or withdrawn profile is denied when the query succeeds. protect's waiver gate requires only a linked waiver, not aiConsentAccepted, and exempts trainers/admins.

- **Attacker:** Any authorized chat caller, including a client with a linked waiver that declined AI processing or an assigned trainer targeting that client.

- **Entry point:** Message route checks ai_privacy_profiles: backend/routes/aiChatRoutes.mjs:565-574.

- **Outcome:** Clients who never opted into AI can have health and training data sent to cloud providers. A consent-table/query failure also bypasses an existing withdrawal.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Use one consent decision service with affirmative-consent semantics. Missing consent should deny; verification failure should return a service-unavailable response before enrichment or provider calls.

Tests:
- Use one consent decision service with affirmative-consent semantics. Missing consent should deny; verification failure should return a service-unavailable response before enrichment or provider calls.

<a id="finding-5"></a>

### [5] Stored conversation roles preserve privileged client access after account demotion

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | broken-access-control |
| CWE | CWE-863 |
| Affected lines | backend/routes/aiChatRoutes.mjs:599-610 |

#### Summary

A demoted account can continue obtaining newly fetched client medical, pain, measurement, and trainer-note context through old conversations.

#### Root Cause

Conversation creation persists req.user.role: backend/routes/aiChatRoutes.mjs:311,335. Message handling loads an owned active conversation: backend/routes/aiChatRoutes.mjs:553-559. Privileged enrichment is selected from conversation.role: backend/routes/aiChatRoutes.mjs:599-602. The client access gate runs only when conversation.role and req.user.role are BOTH trainer: backend/routes/aiChatRoutes.mjs:610. An old admin conversation therefore skips assignment authorization for a currently unassigned trainer. enrichWithUserData receives the old role, reads current health information and trainer notes, then sendChatMessage sends that context to the provider: backend/routes/aiChatRoutes.mjs:695-731.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:599-610`

Current role and current client authorization must govern every new read and provider disclosure. Current source violates this boundary as traced above. Counterevidence: Authentication reloads the current role from the database, and conversation ownership is enforced. Neither control fixes downstream authorization based on the historical role. The normal trainer-to-trainer path does call the fail-closed client access helper.

```javascript
    const isAdminOrTrainer = conversation.role === 'admin' || conversation.role === 'trainer';
    const enrichUserId = isAdminOrTrainer
      ? (conversation.targetUserId || null)   // null = no client selected → skip enrichment
      : (conversation.targetUserId || req.user.id);  // clients always enrich with their own data

    // ── TRAINER RBAC: Verify trainer is assigned to target client ──
    // Slice A1 (2026-06-10): HARDENED from soft warn-and-continue to the
    // canonical fail-closed gate (contextEngine/clientAccess.mjs — active
    // ClientTrainerAssignment OR session history; pending grants nothing).
    // Escape hatch: AI_CHAT_CLIENT_ACCESS_SOFT=true restores legacy
    // warn-only behavior if a real workflow breaks. Admins bypass.
    if (conversation.targetUserId && conversation.role === 'trainer' && req.user.role === 'trainer') {
```

#### Validation

Current role and current client authorization must govern every new read and provider disclosure. Current source violates this boundary as traced above. Counterevidence: Authentication reloads the current role from the database, and conversation ownership is enforced. Neither control fixes downstream authorization based on the historical role. The normal trainer-to-trainer path does call the fail-closed client access helper.

Validation method: independent and parent source review

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

Conversation creation persists req.user.role: backend/routes/aiChatRoutes.mjs:311,335. Message handling loads an owned active conversation: backend/routes/aiChatRoutes.mjs:553-559. Privileged enrichment is selected from conversation.role: backend/routes/aiChatRoutes.mjs:599-602. The client access gate runs only when conversation.role and req.user.role are BOTH trainer: backend/routes/aiChatRoutes.mjs:610. An old admin conversation therefore skips assignment authorization for a currently unassigned trainer. enrichWithUserData receives the old role, reads current health information and trainer notes, then sendChatMessage sends that context to the provider: backend/routes/aiChatRoutes.mjs:695-731.

- **Source:** A formerly privileged account that retains ownership of an existing conversation; for example, an administrator demoted to trainer.

- **Sink:** backend/routes/aiChatRoutes.mjs

- **Outcome:** A demoted account can continue obtaining newly fetched client medical, pain, measurement, and trainer-note context through old conversations.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:599-610`

Current role and current client authorization must govern every new read and provider disclosure. Current source violates this boundary as traced above. Counterevidence: Authentication reloads the current role from the database, and conversation ownership is enforced. Neither control fixes downstream authorization based on the historical role. The normal trainer-to-trainer path does call the fail-closed client access helper.

```javascript
    const isAdminOrTrainer = conversation.role === 'admin' || conversation.role === 'trainer';
    const enrichUserId = isAdminOrTrainer
      ? (conversation.targetUserId || null)   // null = no client selected → skip enrichment
      : (conversation.targetUserId || req.user.id);  // clients always enrich with their own data

    // ── TRAINER RBAC: Verify trainer is assigned to target client ──
    // Slice A1 (2026-06-10): HARDENED from soft warn-and-continue to the
    // canonical fail-closed gate (contextEngine/clientAccess.mjs — active
    // ClientTrainerAssignment OR session history; pending grants nothing).
    // Escape hatch: AI_CHAT_CLIENT_ACCESS_SOFT=true restores legacy
    // warn-only behavior if a real workflow breaks. Admins bypass.
    if (conversation.targetUserId && conversation.role === 'trainer' && req.user.role === 'trainer') {
```

#### Reachability

A formerly privileged account that retains ownership of an existing conversation; for example, an administrator demoted to trainer. Authentication reloads the current role from the database, and conversation ownership is enforced. Neither control fixes downstream authorization based on the historical role. The normal trainer-to-trainer path does call the fail-closed client access helper.

- **Attacker:** A formerly privileged account that retains ownership of an existing conversation; for example, an administrator demoted to trainer.

- **Entry point:** Conversation creation persists req.user.role: backend/routes/aiChatRoutes.mjs:311,335.

- **Outcome:** A demoted account can continue obtaining newly fetched client medical, pain, measurement, and trainer-note context through old conversations.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Use req.user.role for permissions and enrichment. Call checkClientAccess for every target before loading data, including historical conversations. Revalidate context permissions or invalidate incompatible conversations after role changes.

Tests:
- Use req.user.role for permissions and enrichment. Call checkClientAccess for every target before loading data, including historical conversations. Revalidate context permissions or invalidate incompatible conversations after role changes.

<a id="finding-6"></a>

### [6] Speech endpoints bypass AI withdrawal and send raw sensitive content to Gemini

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | sensitive-data-exposure |
| CWE | CWE-359 |
| Affected lines | backend/routes/aiChatRoutes.mjs:895-922 |

#### Summary

An account with withdrawn AI consent can still send identifiable spoken medical history or raw TTS text to Gemini. Text-chat scrubbing happens on a separate path and cannot undo the earlier audio disclosure.

#### Root Cause

The router applies protect globally: backend/routes/aiChatRoutes.mjs:282-283. /transcribe adds rate limiting and multer, but no AI consent, subject eligibility, or privacy gate: line 895. It passes the raw buffer to transcribeAudio: line 922. voiceTranscriptionService base64-encodes the entire audio and sends inlineData to Gemini: lines 116-137,150-163. /tts adds only the AI rate limiter and sends req.body.text directly to Gemini: backend/routes/aiChatRoutes.mjs:954,955-998.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:895-922`

Withdrawing AI consent must stop new AI disclosures, including voice content and text-to-speech. Current source violates this boundary as traced above. Counterevidence: Authentication, linked-waiver checks for client/user roles, upload limits, rate limits, and transcription timeout exist. Filename logging was correctly reduced to an extension. These do not authorize raw voice disclosure or enforce AI withdrawal.

```javascript
router.post('/transcribe', aiRateLimiter, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Atomic check-and-record: prevents race condition between check and record
    const { allowed, remaining } = checkAndRecordTranscription(req.user.id);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Transcription rate limit reached (10/hour). Please try again later.',
        remaining: 0,
      });
    }

    logger.info('[AI Chat] Transcription request', {
      userId: req.user?.id,
      // RULE 8: the upload filename is user-supplied and routinely carries client
      // PII ("sarah-jones-knee-injury.m4a"). Log the extension, not the name —
      // mimetype and size already cover every diagnostic use this line had.
      fileExt: getFileExt(req.file.originalname),
      size: req.file.size,
      mimetype: req.file.mimetype,
      remaining,
    });

    const transcript = await transcribeAudio(req.file.buffer, req.file.originalname);
```

#### Validation

Withdrawing AI consent must stop new AI disclosures, including voice content and text-to-speech. Current source violates this boundary as traced above. Counterevidence: Authentication, linked-waiver checks for client/user roles, upload limits, rate limits, and transcription timeout exist. Filename logging was correctly reduced to an extension. These do not authorize raw voice disclosure or enforce AI withdrawal.

Validation method: independent and parent source review

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

The router applies protect globally: backend/routes/aiChatRoutes.mjs:282-283. /transcribe adds rate limiting and multer, but no AI consent, subject eligibility, or privacy gate: line 895. It passes the raw buffer to transcribeAudio: line 922. voiceTranscriptionService base64-encodes the entire audio and sends inlineData to Gemini: lines 116-137,150-163. /tts adds only the AI rate limiter and sends req.body.text directly to Gemini: backend/routes/aiChatRoutes.mjs:954,955-998.

- **Source:** An authenticated speech caller; accidental disclosure is sufficient.

- **Sink:** backend/routes/aiChatRoutes.mjs

- **Outcome:** An account with withdrawn AI consent can still send identifiable spoken medical history or raw TTS text to Gemini. Text-chat scrubbing happens on a separate path and cannot undo the earlier audio disclosure.

**Missing privacy or authorization control** — `backend/routes/aiChatRoutes.mjs:895-922`

Withdrawing AI consent must stop new AI disclosures, including voice content and text-to-speech. Current source violates this boundary as traced above. Counterevidence: Authentication, linked-waiver checks for client/user roles, upload limits, rate limits, and transcription timeout exist. Filename logging was correctly reduced to an extension. These do not authorize raw voice disclosure or enforce AI withdrawal.

```javascript
router.post('/transcribe', aiRateLimiter, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Atomic check-and-record: prevents race condition between check and record
    const { allowed, remaining } = checkAndRecordTranscription(req.user.id);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Transcription rate limit reached (10/hour). Please try again later.',
        remaining: 0,
      });
    }

    logger.info('[AI Chat] Transcription request', {
      userId: req.user?.id,
      // RULE 8: the upload filename is user-supplied and routinely carries client
      // PII ("sarah-jones-knee-injury.m4a"). Log the extension, not the name —
      // mimetype and size already cover every diagnostic use this line had.
      fileExt: getFileExt(req.file.originalname),
      size: req.file.size,
      mimetype: req.file.mimetype,
      remaining,
    });

    const transcript = await transcribeAudio(req.file.buffer, req.file.originalname);
```

#### Reachability

An authenticated speech caller; accidental disclosure is sufficient. Authentication, linked-waiver checks for client/user roles, upload limits, rate limits, and transcription timeout exist. Filename logging was correctly reduced to an extension. These do not authorize raw voice disclosure or enforce AI withdrawal.

- **Attacker:** An authenticated speech caller; accidental disclosure is sufficient.

- **Entry point:** The router applies protect globally: backend/routes/aiChatRoutes.mjs:282-283.

- **Outcome:** An account with withdrawn AI consent can still send identifiable spoken medical history or raw TTS text to Gemini. Text-chat scrubbing happens on a separate path and cannot undo the earlier audio disclosure.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Introduce explicit speech-provider consent and target eligibility checks before dispatch. For identity-blind processing, perform transcription within the approved private boundary and redact text before external inference. Apply text sanitization and current consent to TTS.

Tests:
- Introduce explicit speech-provider consent and target eligibility checks before dispatch. For identity-blind processing, perform transcription within the approved private boundary and redact text before external inference. Apply text sanitization and current consent to TTS.

<a id="finding-7"></a>

### [7] An older signed waiver overrides an explicit AI-consent withdrawal

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | broken-access-control |
| CWE | CWE-863 |
| Affected lines | backend/services/ai/aiEligibilityHelper.mjs:91-120 |

#### Summary

The privacy settings withdrawal does not reliably stop subsequent processing of that client's health and training data.

#### Root Cause

withdrawAiConsent sets aiEnabled=false and withdrawnAt: backend/controllers/aiConsentController.mjs:170-173. checkAiEligibility records a disabled/withdrawn reason but does not return denial: backend/services/ai/aiEligibilityHelper.mjs:91-97. It then accepts any current linked waiver with AI consent: lines 107-120. Workout generation and long-horizon generation call this helper, then dispatch through routeAiGeneration: backend/controllers/aiWorkoutController.mjs:295-301,714-721; backend/controllers/longHorizonController.mjs:210-215,388.

**Missing privacy or authorization control** — `backend/services/ai/aiEligibilityHelper.mjs:91-120`

A recorded AI opt-out must not be revived implicitly through another consent source. Current source violates this boundary as traced above. Counterevidence: The waiver must be linked, AI-accepted, and version-current. Explicit admin overrides require a reason elsewhere, but this waiver path returns ordinary allow without an override warning.

```javascript
    if (!consentProfile) {
      noConsentReason = 'AI_CONSENT_MISSING';
    } else if (!consentProfile.aiEnabled) {
      noConsentReason = 'AI_CONSENT_DISABLED';
    } else if (consentProfile.withdrawnAt) {
      noConsentReason = 'AI_CONSENT_WITHDRAWN';
    }
  } else {
    logger.debug('[AiEligibility] AiPrivacyProfile model not available', {
      targetUserId,
      actorUserId,
      actorRole,
      featureType: featureType || null,
    });
  }

  // ── Source 2: Waiver — version-aware check (5W-F) ─────────────
  const waiverEligibility = await evaluateWaiverVersionEligibility({
    targetUserId,
    models,
  });

  if (waiverEligibility.hasWaiverConsent && waiverEligibility.isCurrent) {
    return {
      decision: 'allow',
      reasonCode: null,
      consentSource: 'waiver_signature',
      requiresAuditOverride: false,
      warnings: [],
    };
```

#### Validation

A recorded AI opt-out must not be revived implicitly through another consent source. Current source violates this boundary as traced above. Counterevidence: The waiver must be linked, AI-accepted, and version-current. Explicit admin overrides require a reason elsewhere, but this waiver path returns ordinary allow without an override warning.

Validation method: source review plus dependency-isolated synthetic reproduction

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

withdrawAiConsent sets aiEnabled=false and withdrawnAt: backend/controllers/aiConsentController.mjs:170-173. checkAiEligibility records a disabled/withdrawn reason but does not return denial: backend/services/ai/aiEligibilityHelper.mjs:91-97. It then accepts any current linked waiver with AI consent: lines 107-120. Workout generation and long-horizon generation call this helper, then dispatch through routeAiGeneration: backend/controllers/aiWorkoutController.mjs:295-301,714-721; backend/controllers/longHorizonController.mjs:210-215,388.

- **Source:** An otherwise authorized requester using workout or long-horizon generation for a client who withdrew AI consent.

- **Sink:** backend/services/ai/aiEligibilityHelper.mjs

- **Outcome:** The privacy settings withdrawal does not reliably stop subsequent processing of that client's health and training data.

**Missing privacy or authorization control** — `backend/services/ai/aiEligibilityHelper.mjs:91-120`

A recorded AI opt-out must not be revived implicitly through another consent source. Current source violates this boundary as traced above. Counterevidence: The waiver must be linked, AI-accepted, and version-current. Explicit admin overrides require a reason elsewhere, but this waiver path returns ordinary allow without an override warning.

```javascript
    if (!consentProfile) {
      noConsentReason = 'AI_CONSENT_MISSING';
    } else if (!consentProfile.aiEnabled) {
      noConsentReason = 'AI_CONSENT_DISABLED';
    } else if (consentProfile.withdrawnAt) {
      noConsentReason = 'AI_CONSENT_WITHDRAWN';
    }
  } else {
    logger.debug('[AiEligibility] AiPrivacyProfile model not available', {
      targetUserId,
      actorUserId,
      actorRole,
      featureType: featureType || null,
    });
  }

  // ── Source 2: Waiver — version-aware check (5W-F) ─────────────
  const waiverEligibility = await evaluateWaiverVersionEligibility({
    targetUserId,
    models,
  });

  if (waiverEligibility.hasWaiverConsent && waiverEligibility.isCurrent) {
    return {
      decision: 'allow',
      reasonCode: null,
      consentSource: 'waiver_signature',
      requiresAuditOverride: false,
      warnings: [],
    };
```

#### Reachability

An otherwise authorized requester using workout or long-horizon generation for a client who withdrew AI consent. The waiver must be linked, AI-accepted, and version-current. Explicit admin overrides require a reason elsewhere, but this waiver path returns ordinary allow without an override warning.

- **Attacker:** An otherwise authorized requester using workout or long-horizon generation for a client who withdrew AI consent.

- **Entry point:** withdrawAiConsent sets aiEnabled=false and withdrawnAt: backend/controllers/aiConsentController.mjs:170-173.

- **Outcome:** The privacy settings withdrawal does not reliably stop subsequent processing of that client's health and training data.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Treat an explicit disabled or withdrawn profile as terminal denial. Permit waiver fallback only when there is no later opt-out, using timestamps/versioned consent events if multiple grant sources must coexist.

Tests:
- Treat an explicit disabled or withdrawn profile as terminal denial. Permit waiver fallback only when there is no later opt-out, using timestamps/versioned consent events if multiple grant sources must coexist.

<a id="finding-8"></a>

### [8] Chat server enrichment inserts stored goal titles after all request PII scanning

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | sensitive-data-exposure |
| CWE | CWE-359 |
| Affected lines | backend/services/aiChatService.mjs:1750-1753 |

#### Summary

Stored goal titles containing a client's name, email, or identifying medical narrative bypass both request scrubbing and known-client term replacement, even during an otherwise harmless chat request.

#### Root Cause

enrichWithUserData fetches goals.title from storage: backend/services/aiChatService.mjs:1333-1340. It inserts g.title directly into the prompt: line 1752. The route adds the enrichment block to systemPrompt after the request middleware has run: backend/routes/aiChatRoutes.mjs:695-702. buildPromptMessages includes systemPrompt and sendChatMessage dispatches it: lines 728-731.

**Missing privacy or authorization control** — `backend/services/aiChatService.mjs:1750-1753`

Server-enriched context must be de-identified just like current messages. Current source violates this boundary as traced above. Counterevidence: Trainer notes, health concerns, session notes, nutrition descriptions, and several other enrichment fields explicitly call stripIdentityFromNotes. Goal titles do not. This is a data-minimization defect, not a claim of cross-account exploitation.

```javascript
    // ── 9. GOALS ──
    if (goals.length > 0) {
      dataParts.push(`\n--- GOALS ---\n${goals.map(g => `[${(g.priority || 'med').toUpperCase()}] ${g.title}: ${g.progressPercentage ?? 0}%${g.targetValue ? ` (${g.currentValue || 0}/${g.targetValue})` : ''}${g.deadline ? ` due:${g.deadline}` : ''}`).join('\n')}`);
    }
```

#### Validation

Server-enriched context must be de-identified just like current messages. Current source violates this boundary as traced above. Counterevidence: Trainer notes, health concerns, session notes, nutrition descriptions, and several other enrichment fields explicitly call stripIdentityFromNotes. Goal titles do not. This is a data-minimization defect, not a claim of cross-account exploitation.

Validation method: independent and parent source review

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

enrichWithUserData fetches goals.title from storage: backend/services/aiChatService.mjs:1333-1340. It inserts g.title directly into the prompt: line 1752. The route adds the enrichment block to systemPrompt after the request middleware has run: backend/routes/aiChatRoutes.mjs:695-702. buildPromptMessages includes systemPrompt and sendChatMessage dispatches it: lines 728-731.

- **Source:** A normal client or trainer whose stored goal title contains identifying information.

- **Sink:** backend/services/aiChatService.mjs

- **Outcome:** Stored goal titles containing a client's name, email, or identifying medical narrative bypass both request scrubbing and known-client term replacement, even during an otherwise harmless chat request.

**Missing privacy or authorization control** — `backend/services/aiChatService.mjs:1750-1753`

Server-enriched context must be de-identified just like current messages. Current source violates this boundary as traced above. Counterevidence: Trainer notes, health concerns, session notes, nutrition descriptions, and several other enrichment fields explicitly call stripIdentityFromNotes. Goal titles do not. This is a data-minimization defect, not a claim of cross-account exploitation.

```javascript
    // ── 9. GOALS ──
    if (goals.length > 0) {
      dataParts.push(`\n--- GOALS ---\n${goals.map(g => `[${(g.priority || 'med').toUpperCase()}] ${g.title}: ${g.progressPercentage ?? 0}%${g.targetValue ? ` (${g.currentValue || 0}/${g.targetValue})` : ''}${g.deadline ? ` due:${g.deadline}` : ''}`).join('\n')}`);
    }
```

#### Reachability

A normal client or trainer whose stored goal title contains identifying information. Trainer notes, health concerns, session notes, nutrition descriptions, and several other enrichment fields explicitly call stripIdentityFromNotes. Goal titles do not. This is a data-minimization defect, not a claim of cross-account exploitation.

- **Attacker:** A normal client or trainer whose stored goal title contains identifying information.

- **Entry point:** enrichWithUserData fetches goals.title from storage: backend/services/aiChatService.mjs:1333-1340.

- **Outcome:** Stored goal titles containing a client's name, email, or identifying medical narrative bypass both request scrubbing and known-client term replacement, even during an otherwise harmless chat request.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Prefer structured goal categories/numeric progress for provider context; otherwise run stored titles through the same identity scrubber. Add final-envelope assertions covering stored fields independently of the request body.

Tests:
- Prefer structured goal categories/numeric progress for provider context; otherwise run stored titles through the same identity scrubber. Add final-envelope assertions covering stored fields independently of the request body.

<a id="finding-9"></a>

### [9] Workout de-identification preserves known client names embedded in clinical text

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Parent source review and independent review agree. Five candidates additionally reproduced with real modules and isolated dependencies; deployed behavior not checked. |
| Category | sensitive-data-exposure |
| CWE | CWE-359 |
| Affected lines | backend/services/deIdentificationService.mjs:229-240 |

#### Summary

A synthetic payload containing clientProfile.name='Alice Example' and health.concerns='Alice Example has diabetes' loses the first name field but preserves the identifying clinical sentence in provider input. Similar free-text names can remain in goal notes and arbitrary retained fields.

#### Root Cause

Workout generation accepts body.masterPromptJson or the stored master prompt: backend/controllers/aiWorkoutController.mjs:348-358. The generated fallback includes user healthConcerns: lines 401-405. deIdentify clones the whole object, removes enumerated identifier paths, and runs only email/phone/SSN regex replacements: backend/services/deIdentificationService.mjs:167,214-230,274-307. It never replaces originalName throughout remaining string fields. SAFE_FIELD_PATHS is not used as an allowlist. buildWorkoutPrompt serializes the complete resulting object: backend/services/ai/promptBuilder.mjs:92-96. The OpenAI adapter sends that prompt directly: backend/services/ai/adapters/openaiAdapter.mjs:144-156.

**Missing privacy or authorization control** — `backend/services/deIdentificationService.mjs:229-240`

The advertised identity-blind workout payload must not combine a real client name with medical history. Current source violates this boundary as traced above. Counterevidence: Known structural name/contact/DOB fields are stripped; emails, phone numbers, and SSNs receive recursive replacement. Empty training context fails closed. Output validation runs after disclosure and cannot prevent this leak.

```javascript
  // 3. Deep PII scan: search all string values for email/phone patterns and redact
  scanAndRedactPII(payload, strippedFields);

  // 4. Double-check: ensure no real name leaked into the anonymous label
  if (originalName && typeof originalName === 'string' && originalName.length > 2) {
    const currentName = getNestedValue(payload, 'client.name') || '';
    if (typeof currentName === 'string' && currentName.toLowerCase().includes(originalName.toLowerCase())) {
      logger.warn('[DeIdentification] Real name leaked into label — using generic fallback');
      setNestedValue(payload, 'client.name', anonymousLabel);
      setNestedValue(payload, 'client.preferredName', anonymousLabel);
      strippedFields.push('name_leak_corrected');
    }
```

#### Validation

The advertised identity-blind workout payload must not combine a real client name with medical history. Current source violates this boundary as traced above. Counterevidence: Known structural name/contact/DOB fields are stripped; emails, phone numbers, and SSNs receive recursive replacement. Empty training context fails closed. Output validation runs after disclosure and cannot prevent this leak.

Validation method: source review plus dependency-isolated synthetic reproduction

Limitations:
- No live database, provider, deployed bundle, actual client disclosure or production configuration was tested.

#### Dataflow

Workout generation accepts body.masterPromptJson or the stored master prompt: backend/controllers/aiWorkoutController.mjs:348-358. The generated fallback includes user healthConcerns: lines 401-405. deIdentify clones the whole object, removes enumerated identifier paths, and runs only email/phone/SSN regex replacements: backend/services/deIdentificationService.mjs:167,214-230,274-307. It never replaces originalName throughout remaining string fields. SAFE_FIELD_PATHS is not used as an allowlist. buildWorkoutPrompt serializes the complete resulting object: backend/services/ai/promptBuilder.mjs:92-96. The OpenAI adapter sends that prompt directly: backend/services/ai/adapters/openaiAdapter.mjs:144-156.

- **Source:** An authorized caller supplying a master prompt or normal persisted profile text containing the client's name.

- **Sink:** backend/services/deIdentificationService.mjs

- **Outcome:** A synthetic payload containing clientProfile.name='Alice Example' and health.concerns='Alice Example has diabetes' loses the first name field but preserves the identifying clinical sentence in provider input. Similar free-text names can remain in goal notes and arbitrary retained fields.

**Missing privacy or authorization control** — `backend/services/deIdentificationService.mjs:229-240`

The advertised identity-blind workout payload must not combine a real client name with medical history. Current source violates this boundary as traced above. Counterevidence: Known structural name/contact/DOB fields are stripped; emails, phone numbers, and SSNs receive recursive replacement. Empty training context fails closed. Output validation runs after disclosure and cannot prevent this leak.

```javascript
  // 3. Deep PII scan: search all string values for email/phone patterns and redact
  scanAndRedactPII(payload, strippedFields);

  // 4. Double-check: ensure no real name leaked into the anonymous label
  if (originalName && typeof originalName === 'string' && originalName.length > 2) {
    const currentName = getNestedValue(payload, 'client.name') || '';
    if (typeof currentName === 'string' && currentName.toLowerCase().includes(originalName.toLowerCase())) {
      logger.warn('[DeIdentification] Real name leaked into label — using generic fallback');
      setNestedValue(payload, 'client.name', anonymousLabel);
      setNestedValue(payload, 'client.preferredName', anonymousLabel);
      strippedFields.push('name_leak_corrected');
    }
```

#### Reachability

An authorized caller supplying a master prompt or normal persisted profile text containing the client's name. Known structural name/contact/DOB fields are stripped; emails, phone numbers, and SSNs receive recursive replacement. Empty training context fails closed. Output validation runs after disclosure and cannot prevent this leak.

- **Attacker:** An authorized caller supplying a master prompt or normal persisted profile text containing the client's name.

- **Entry point:** Workout generation accepts body.masterPromptJson or the stored master prompt: backend/controllers/aiWorkoutController.mjs:348-358.

- **Outcome:** A synthetic payload containing clientProfile.name='Alice Example' and health.concerns='Alice Example has diabetes' loses the first name field but preserves the identifying clinical sentence in provider input. Similar free-text names can remain in goal notes and arbitrary retained fields.

#### Severity

**Medium** — Sensitive processing boundary is source-established; specific workflow, data content or state prerequisite limits likelihood.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Build a schema-allowlisted provider payload; recursively scrub known identity terms from all retained free text and validate the final serialized prompt. Apply the same check to serverConstraints added after de-identification.

Tests:
- Build a schema-allowlisted provider payload; recursively scrub known identity terms from all retained free text and validate the final serialized prompt. Apply the same check to serverConstraints added after de-identification.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Current-source Coach privacy review | not recorded | Reported | \[{"question":"Are these the mounted AI routes?","answer":"Yes, statically: backend/core/routes.mjs mounts /api/ai, /api/ai-chat, /api/ai-command, and /api/ai/debate at lines 625-635. Deployment and actual traffic were not examined."},{"question":"Does authentication provide an implicit affirmative AI-consent check?","answer":"No. protect reloads account role/status, then requireLinkedWaiver checks that a linked waiver exists for client/user roles. It does not check aiConsentAccepted, age, or guardian eligibility. Trainers/admins bypass this waiver gate."},{"question":"Does the privacy middleware remove all medical information?","answer":"No, by explicit implementation: piiSanitizationMiddleware flags medical conditions/medications while retaining them for training context at lines 195-208. The identity-blind model intentionally retains medical data. Medical text preservation alone was not treated as a vulnerability."},{"question":"Is there one provider/privacy router for every Coach path?","answer":"No. Chat/classification/debate call sendChatMessage, whose configured-key order is Gemini, OpenAI, Anthropic, Venice. Workout/long-horizon use providerRouter with AI_PROVIDER_ORDER and a separate default order. Speech directly calls Gemini. Privacy/consent is not revalidated centrally at these sinks."},{"question":"What protections were confirmed?","answer":"Current-role authentication, active/locked-account checks, linked-waiver gating for ordinary account roles, normal trainer chat assignment checks, strict critical-PII handling on chat messages, several scrubbed clinical enrichment fields, identity-unavailable withholding for notes, conversation ownership, debate-job ownership, rate limits, upload bounds, transcription timeouts, header-based Gemini API keys, safe client-facing failover codes, and removal of raw transcription filenames from normal logs."},{"question":"Do existing history tests prove real lookup failures fail closed?","answer":"No. backend/tests/unit/aiChatPromptPrivacy.test.mjs:39-55 mocks a stripper that throws. The actual identity lookup catches its database error and returns null, so that test does not cover the real failure boundary."},{"question":"Is logging fully privacy-scrubbed?","answer":"No general PII/PHI scrub exists in logger.mjs; it redacts API keys/JWTs and known secret values. intentClassifier.mjs:215-219,248-251 logs the first 200 characters of malformed provider responses. Chat/TTS/transcription also log provider error text. Actual provider echo of sensitive content into logs was not demonstrated, so no separate log-exfiltration finding is asserted."},{"question":"What remains unverified?","answer":"Runtime deployment, configured providers/settings, real child accounts, database schema compatibility for debate, actual external disclosures, final outbound payloads under synthetic integration fixtures, and all provider-retention settings. No tests or application code were executed."}\] |
| Parent source validation and synthetic reproductions | not recorded | Reported | Nine source-validated findings. PRIV-01/04/05/07/08 reproduced with actual module code and dependency fakes. Debate (PRIV-10) deferred because selected User columns were not present in inspected model; live schema unknown. Child/guardian (PRIV-09) is a release-blocking product policy gap; age threshold/eligibility policy and actual child-account existence unverified, so not a calibrated vulnerability. |

## Open Questions And Follow Up

- Live selected providers, privacy retention and network egress were not checked.
- Newer main packet differs from this current working checkout; reconcile findings onto current main before repairs.
- Speech, attachment, embeddings, memory, logs, all secondary enrichment services and all backend files are not exhaustively runtime-tested.
- Child and unknown-age cloud processing must default deny in the proposed policy until verified guardian and age policy is approved.
- Age/guardian policy and actual supported child workflows need authoritative definition and integrated tests; no legal threshold inferred.
  - Follow-up prompt: Review deferred unit PRIV-09 and close its stated proof gap.
- Route missing guards is source-established, but query selects age/fitnessGoals/nasmPhase absent from User model; actual DB compatibility unresolved.
  - Follow-up prompt: Review deferred unit PRIV-10 and close its stated proof gap.
