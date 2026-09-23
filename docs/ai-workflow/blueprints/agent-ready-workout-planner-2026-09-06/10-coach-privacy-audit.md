# Current Coach connection and privacy audit decision

Version 2.0 · Source validation 2026-09-08 UTC · Read-only app audit.
Canonical Codex Security scan: 45443178-19e1-46bc-9ef8-1558c13b4060.
The generated sealed report and canonical JSON will be retained under evidence/security/.

## Decision

Keep Swan Coach as the accessible default; make personal OpenRouter/local models optional.
Do not build the new connection feature on the assumption that current middleware is complete.
The reviewed checkout has meaningful protections **and material gaps**. Its policy deliberately preserves medical/fitness information while stripping identity. That is not a promise that medical history never leaves Swan.

The next backend slice is privacy/authorization repair and shared outbound policy, then customer connections. No runtime repairs, provider calls, production data access, deployment or live exposure verification occurred in this pass.

## Exact source boundary

Actual repository: C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT.
Current working checkout: wip/comms-notifications-2026-07-05 at a89cbf0f080644877ae8a45729d3f0a59d4cb8b8, with unrelated existing changes.
The configured old cwd no longer exists. Source tests used the moved path explicitly.

This privacy audit targets the **current working source**, not the newer main snapshot used for the September 6 Planner audit. That Planner snapshot is 53120649f356c3efccee32872b530096d386642f. Do not claim these findings exist in the deployed bundle until each is reconciled against current main and the mounted release. Source hashes for the five executed reproductions are in evidence/privacy-reproductions.json. The broader scan target snapshot is recorded by the security tooling.

## What is actually connected

| Surface | Verified source chain | Implication |
|---|---|---|
| Coach chat | useAIChat → /api/ai-chat → aiChatService.sendChatMessage | Own legacy chain; Gemini first when its key exists, followed by OpenAI, Anthropic, Venice |
| Command classification | aiCommandRoutes → commandExecutor → intentClassifier → sendChatMessage | Another outbound model call before later backend command validation |
| Workout generation | aiWorkoutController / longHorizonController → providerRouter → adapters | Separate configurable provider order and retry logic |
| Transcription / TTS | aiChatRoutes → Google direct calls | Changing a chat/workout model does not move speech |
| Connection storage | Existing server environment references; OpenAI-compatible workout adapter | Useful adapter seam, no verified personal customer connection lifecycle |
| Conversations | AiConversation owner-filtered storage + target association | Stored role must not substitute for current role authorization |

The architecture review in evidence/coach-architecture.json retains precise source anchors, effective resource chains, assumptions and counterevidence. Actual deployed provider keys, models, endpoints, retention settings and egress were not inspected. No secret values are included.

## Validated findings and scope limits

| Candidate | Parent disposition | Practical effect |
|---|---|---|
| PRIV-01 | High; source + isolated reproduction | Ordinary role-user account can change another client's AI consent because only client/trainer cases are restricted |
| PRIV-02 | Medium; source validated | Stored conversation role can bypass current assignment checks after demotion |
| PRIV-03 | Medium; source validated | Chat allows missing consent records and failed consent queries before enrichment/dispatch |
| PRIV-04 | Medium; source + isolated reproduction | A current signed waiver can override explicit later AI withdrawal |
| PRIV-05 | Medium; source + isolated provider capture | previousContext is appended after the command message's PHI scan |
| PRIV-06 | Medium; source validated | Transcription/TTS omit equivalent consent/disclosure checks; raw audio reaches Google before text redaction |
| PRIV-07 | Medium; source + isolated reproduction | Structural de-identification leaves a known name embedded in retained medical free text |
| PRIV-08 | Medium; source + isolated reproduction | Identity lookup error becomes null; name stripping returns normally, bypassing outer withholding catch |
| PRIV-11 | Medium; source validated | Stored goal titles enter system context after request scrubbing, without equivalent identity filtering |
| PRIV-09 | Deferred policy/coverage gap; release blocker | No authoritative age/guardian decision established at the reviewed provider boundaries; actual supported child workflow and required policy need verification |
| PRIV-10 | Deferred schema prerequisite | Debate route lacks assignment/consent checks, but selected User columns are absent in the inspected model; live schema compatibility unknown |

Severity is calibrated below the independent candidate ratings where a content, demotion, configuration or workflow prerequisite reduces likelihood. The original independent candidates remain preserved. Child policy is not legal analysis, and absence of a runtime proof is not evidence of safety.

**Executed:** node --experimental-vm-modules privacy-reproduce.mjs with SWAN_AUDIT_ROOT set to the exact reviewed checkout. Five unmodified source modules ran with fake dependencies and synthetic identities only; no real SQL, HTTP or provider dispatch. Reproduction assertions intentionally confirm current gaps. They are not passing privacy acceptance tests or proof of an actual incident.

**Not verified:** real auth+DB end-to-end, deployed SHA, actual provider envelopes, network negative controls, every attachment/memory/embedding/alternate AI consumer, all backend files, provider-retention contracts or current child-account state. Coverage remains partial. Never label this a whole-repository clean bill of health.

## Controls worth preserving

Authentication reloads current account role/status. Conversations are owner-scoped.
Normal trainer chat uses a fail-closed access helper. Workout generation checks self/assignment.
Critical PII middleware, known-client stripping and several stored clinical-field scrubbers exist.
Notes with unavailable identity are explicitly withheld. Conversation length, upload size, rate and timeout controls exist. Provider keys are sent in headers on the reviewed Google paths; transcription logging drops the raw filename. Client-facing fallback traces are normalized.

Those controls operate at different points and do not protect every later-added field or modality. Existing tests that mock a throwing stripper miss the lower-level helper that catches its database error and returns null.

## Required repair and verification sequence

1. Reconcile each finding onto current main and the existing Coach implementation lane. Preserve both source packets; do not overwrite another agent's repair.
2. Fix ownership using a positive role allowlist; test user/client/trainer/admin/unknown roles for self and cross-client grant, withdrawal and status.
3. Make explicit withdrawal terminal; deny absent consent and fail closed on verification error. Recheck consent/assignment immediately before dispatch and approval.
4. Use current role and current object access on every request. Test existing conversations after demotion, reassignment, deactivation and revocation.
5. Build the final allowlisted provider envelope after all context assembly. Test current message, previous context, stored goal/notes, medical fields, tool results and model fallback independently.
6. Separate modality/subject policy: raw audio, TTS, attachments, memory and embeddings have their own external sinks. A local-only profile must reject every cloud fallback.
7. Establish child and unknown-age rules with verified guardian grants; no self-asserted checkbox substitutes for authorization. New cloud mode defaults denied until this is implemented.
8. Run an isolated real DB/API suite and actual sink-capture canaries, including thrown and swallowed identity failures. Observe zero prohibited network requests during local/offline failures.
9. Verify redacted logs/errors/retention and provider policy evidence. Enable new model connections only after these boundaries pass.

The report does not certify that an external provider will never misuse data. Swan can minimize disclosures, enforce explicit recipient policies and verify its own egress; provider behavior and contracts require separate evidence. 09 defines that separation.

## Completion and source stability

The Codex Security tooling sealed the report with **1 high and 8 medium findings**, plus two deferred candidates. Generated artifacts: [report](evidence/security/report.md), [findings](evidence/security/findings.json), [coverage](evidence/security/coverage.json), [manifest](evidence/security/scan-manifest.json).

The tool warned that the shared working tree changed during the audit. A final check confirmed all five reproduction-module hashes and all nine reported control snippets still matched; see evidence/privacy-finish-stability.json. This does not establish that the rest of the working tree or deployed source is unchanged.

Tool-reported usage: 13,317,660 total tokens, including 12,628,352 cached input tokens, across four recorded threads. This is rollout/thread aggregation including the surrounding planning conversation, not an isolated audit-only cost meter; dollar cost is unavailable. See evidence/security-completion.json. No OpenRouter inference was called.
