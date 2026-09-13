# HOSTILE REVIEW PACKET — DeepSeek Harness provider workflow package

You are reviewing a **provider/workflow governance package**, not application code.
Author: the DeepSeek Harness session. Date: 2026-09-13. Repo under audit (read-only): a heavily dirty
canonical SS-PT checkout. No application source was modified.

## What you are reviewing

1. `provider-registry.yaml` — an INERT registry. Nothing loads it: not settings.yaml, not a cordis patch,
   not a profile bundle. It records, per model: provider, exact id, billing lane, credential REFERENCE
   (never a value), endpoint family, harness, role, authority, privacy class, identity-verification method,
   status, file:line sources, rollback, notes. Plus 6 invariants and 7 open decisions.
2. `provider-registry.check.mjs` — a dependency-free validator (imports only node:fs, node:path; no network
   primitives). It reports 11/11 PASS.

## Verified context the package depends on (already established, do not re-derive)

- GLM 5.3 and GLM 5.3 Flash route DIRECT to the Z.ai subscription coding endpoint
  (`https://api.z.ai/api/coding/paas/v4/chat/completions`, `ZAI_API_KEY`), never OpenRouter.
  `scripts/lib/redact-egress.mjs:229-249` THROWS on any `z-ai/` model sent to an OpenRouter host,
  so an OpenRouter GLM route fails closed before the socket.
- `anthropic/claude-fable-5.1` was verified present in the live OpenRouter catalog (1M ctx,
  $10/M input, $50/M output, same price as Fable 5) by a free metadata query — no inference.
  The repo still defaults to `anthropic/claude-fable-5`; 5.1 appears in zero scripts and zero config.
- `gemini-2.0-flash` is retired by Google yet referenced by 9+ backend call sites (recorded as a defect).
- The DeepSeek "$5/month hard cap" has NO implementing code: no script reads `process.env.DEEPSEEK_*`,
  and `DEEPSEEK_BASE_URL` has zero occurrences repo-wide.
- Credential metadata only was inspected: `ZAI_API_KEY` present in the Windows USER env (49 chars) but
  ABSENT from the harness process env; `.dsh/.credentials.yaml` holds refs `DEEPSEEK_API_KEY` and
  `ZAI_CODING_CN_API_KEY`; the SS-PT `.env` files contain entries named `OPENROUTER_API_KEY` and
  `GEMINI_API_KEY`. No values were read, printed, or transmitted.

## YOUR REMIT — hostile review. Attack the package, not the prose.

Find defects that a careful reviewer would call real. Specifically consider, and answer each:

1. **Claim-vs-evidence**: does any registry row assert more than its cited `source` supports? Name row + field.
2. **Wrong lane**: is any model assigned the wrong billing lane (subscription vs direct API vs OpenRouter
   vs local)? A wrong lane is a money bug. Name it and say what the correct lane is.
3. **Missing rows**: which live model/route in this stack is absent from the registry? Which row is
   fabricated or unverifiable?
4. **Authority errors**: is any seat given authority the source does not grant — or denied authority it has?
   Note the known conflict: Fable is named Final Decider in the root policy while Astra owns
   adjudication/repair in a dated override.
5. **Validator blind spots**: what real defect class could pass all 11 checks? Be concrete — name the
   check and the defect it would miss. Note that the validator asserts on its own IMPORT GRAPH rather
   than substrings.
6. **Inertness claim**: is "nothing loads this file" actually true as stated, and does the package's
   value depend on it being true?
7. **Secret hygiene**: any path by which this package could leak a credential or client PII?
8. **Decision quality**: are the 7 open decisions genuinely open, correctly owned, and is any
   `defaultUntilDecided` unsafe?

## How to report

- Findings only. No praise, no summary of what the package does.
- Each finding: `id | severity P0..P3 | file:line or row id | the defect in one sentence | what would prove it`.
- If a category yields nothing, say "none found" for that category rather than inventing a finding.
- Do NOT propose making provider calls. Do NOT ask for credentials. You are reviewing an artifact.
- If you believe a claim in this packet is false, say so explicitly and cite what contradicts it.

---
## ARTIFACT 1 of 2 — provider-registry.yaml

```yaml
# DeepSeek Harness provider registry (INERT)
#
# Status: INERT DATA. Nothing under $DSH_HOME loads this file. It is NOT a
# cordis patch, NOT settings.yaml, and NOT a profile bundle. Adding or editing
# it cannot change harness boot, routing, or spend. Routing truth lives only in
# settings.yaml (llm-pi-ai namespace); this file records what is true today.
#
# No credential VALUES appear here. `credential.reference` is a NAME resolved by
# the harness credential seam (~/.dsh/.credentials.yaml refs) or an env var.
#
# Written 2026-09-13 by the DeepSeek Harness session after a read-only audit of
# the canonical SS-PT checkout (C:/Users/<operator>/Desktop/@Everything/quick-pt/SS-PT,
# branch wip/comms-notifications-2026-07-05 @ fbca1bb2b, 964 dirty entries).
# Evidence convention: every row cites file:line that was read, not remembered.
schemaVersion: 1
registryId: dsh-provider-registry
lastVerifiedUtc: "2026-09-13T08:30:00Z"
verifiedBy: deepseek-harness-session
canonicalRepo: "C:/Users/<operator>/Desktop/@Everything/quick-pt/SS-PT"

# ---------------------------------------------------------------------------
# Billing lanes are mutually exclusive. A model id never implies a lane.
# ---------------------------------------------------------------------------
billingLanes:
  subscription-zai:
    provider: Z.ai
    mode: subscription
    meter: "plan credit (GLM-ZAI-ACCESS.md:65 â€” 2,000/5h, 10,000/week)"
    spendGate: none-in-repo
  subscription-codex:
    provider: OpenAI via Codex workspace
    mode: subscription
    meter: "seat usage"
    spendGate: none-in-repo
  subscription-claude:
    provider: Anthropic
    mode: subscription
    meter: "Claude Max 20x, teacher discount"
    spendGate: none-in-repo
  direct-google:
    provider: Google
    mode: api
    meter: "Google-side usage; $0 against the OpenRouter wallet"
    spendGate: "action-time verification required"
  direct-deepseek:
    provider: DeepSeek
    mode: api
    meter: "per-token; off-peak is half price"
    spendGate: "policy $5/month hard cap â€” ENFORCER NOT IMPLEMENTED"
  openrouter:
    provider: OpenRouter
    mode: api-wallet
    meter: "per-token wallet"
    spendGate: "SWAN_VILLAGE_MAX_USD for Tier 3; per-run estimate; --confirm-spend"
  local:
    provider: Ollama (host GPU)
    mode: local
    meter: "$0 compute"
    spendGate: none

models:
  # ---------------------------- Z.ai (direct, subscription) -----------------
  - id: glm-5.3
    provider: Z.ai
    billingLane: subscription-zai
    credential: { reference: ZAI_API_KEY, source: windows-user-env }
    endpointFamily: "https://api.z.ai/api/coding/paas/v4/chat/completions"
    harness: "scripts/consult-glm.mjs"
    role: hostile-review-seat (advisory)
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "requested-only (receipt records billing=coding-plan; no served-model echo)"
    status: VERIFIED
    source: ["scripts/consult-glm.mjs:17", "scripts/consult-glm.mjs:37", "scripts/consult-glm.mjs:73-74"]
    rollback: "scripts/consult-ox.mjs pins glm-5.3-flash separately"
    notes: "Registry entry ABSENT from config/MODEL_VERSIONS.md â€” unregistered but live."
  - id: glm-5.3-flash
    provider: Z.ai
    billingLane: subscription-zai
    credential: { reference: ZAI_API_KEY, source: windows-user-env }
    endpointFamily: "https://api.z.ai/api/coding/paas/v4/chat/completions (via consult-glm.mjs child; prints route=direct-zai)"
    harness: "scripts/consult-ox.mjs"
    role: hostile-review-seat (advisory)
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "requested-only; wrapper REFUSES a --model override"
    status: VERIFIED
    source: ["scripts/consult-ox.mjs:35", "scripts/consult-ox.mjs:45", "scripts/consult-ox.mjs:49"]
    rollback: "revert to consult-glm.mjs --model glm-5.3"
    notes: "Same Z.ai lineage as glm-5.3 â€” not independent-provider corroboration."
  - id: z-ai/glm-5.2
    provider: Z.ai via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/validation-orchestrator.mjs"
    role: design-debate-lead
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: none
    status: BLOCKED
    source: ["scripts/validation-orchestrator.mjs:85", "scripts/validation-orchestrator.mjs:1666", "scripts/lib/redact-egress.mjs:229-249"]
    rollback: "switch to scripts/consult-glm.mjs (direct Z.ai)"
    notes: "BLOCKED BY DESIGN: the z-ai/ subscription-seat guard now throws before the socket. This lane cannot run; the fix is to switch seats, never to bypass the guard."

  # ---------------------- Codex / OpenAI (subscription, no API key) ---------
  - id: gpt-6-astra
    provider: OpenAI via Codex
    billingLane: subscription-codex
    credential: { reference: "codex-client-auth (/codex/auth.json)", source: harness-store }
    endpointFamily: "openai-codex app transport"
    harness: "codex-cli >= 0.153.4 (app-bundled) / mcp__codex_app__send_message_to_thread"
    role: architecture, adjudication, repair
    authority: gate-owner (final-astra cadence)
    privacyClass: repo-source-only
    identityVerification: "requested-model must be accepted by the client; CLI 0.146.1 REFUSES it (HTTP 400)"
    status: VERIFIED
    source: ["AGENTS.md:1174", "CLAUDE.md:1106", "observed 2026-09-13: npm cli 0.146.1 -> HTTP 400; app binary 0.153.4 -> turn.completed"]
    rollback: "npm CLI upgrade, or re-run from a surface holding the codex-app MCP tools"
    notes: "ADMISSION WINDOW IS 600s AND IS ENFORCED AT IMPORT TIME. A completed review imported after the deadline is quarantined, not approved."
  - id: gpt-5.6-luna
    provider: OpenAI via Codex
    billingLane: subscription-codex
    credential: { reference: "codex-client-auth", source: harness-store }
    endpointFamily: "openai-codex app transport"
    harness: "codex workspace"
    role: bounded implementation
    authority: builder-only
    privacyClass: repo-source-only
    identityVerification: "per-run seat preflight"
    status: POLICY-ONLY
    source: ["AGENTS.md:1174", "CLAUDE.md:1106"]
    rollback: n/a
    notes: "Named in policy; no DSH-side route exists or is proposed."

  # --------------------------- Anthropic via OpenRouter ---------------------
  - id: anthropic/claude-fable-5
    provider: Anthropic via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-fable.mjs"
    role: Final Decider (SS-PT co-orchestrator contract)
    authority: final-decider
    privacyClass: repo-source-only
    identityVerification: "requested-only; no served-model assertion in-script"
    status: VERIFIED (as the live default literal)
    source: ["scripts/consult-fable.mjs:54", "scripts/consult-fable.mjs:7", "config/MODEL_VERSIONS.md:70", "AGENTS.md:34", "AGENTS.md:871"]
    rollback: "SWAN_FUSION_JUDGE_MODEL env override"
    notes: "Price table in-script: $10/M in, $50/M out. No finish_reason truncation guard."
  - id: claude-fable-5-1
    provider: Anthropic via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: none
    role: candidate (rotation)
    authority: none
    privacyClass: repo-source-only
    identityVerification: NOT ESTABLISHED
    status: CANDIDATE â€” DO NOT PROMOTE
    source: ["docs/ai-workflow/hermes-learning-packets/2026-09-03-a-500-only-logged-in-users-see-on-a-fresh-deploy-is-a-boot-race.md:5", "docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION-BLUEPRINT-2026-09-03.md:5", "0 occurrences in scripts/", "0 occurrences in config/"]
    rollback: "none needed while unpromoted"
    notes: "The literal 'claude-fable-5-1' appears in ZERO scripts and ZERO config; 'claude-fable-5.1' appears nowhere. Promotion requires: catalog id re-query, price re-read, served-identity proof, and a guard test â€” none done. Silent replacement of the Final Decider is forbidden."

  # ------------------------------- Google (direct API) ---------------------
  - id: gemini-2.5-pro
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY (fallback GOOGLE_AI_KEY)", source: sspt-env-file }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "scripts/consult-gemini.mjs"
    role: lead-design-authority console
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "requested-only; script LABELS ITSELF 'Gemini 3.1 Pro' while requesting gemini-2.5-pro"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/consult-gemini.mjs:81", "config/MODEL_VERSIONS.md:39", "scripts/consult-gemini.mjs:452"]
    rollback: "registry key gemini-pro-model"
    notes: "Key travels in the URL query (?key=) here, unlike consult-gemini-panel.mjs which uses the x-goog-api-key header. Label/behaviour mismatch is a reportable defect."
  - id: gemini-3.1-pro-preview
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY (fallback GOOGLE_AI_KEY)", source: sspt-env-file }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "scripts/consult-gemini-panel.mjs"
    role: panel seat (design debate)
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "requested-only; key sent as x-goog-api-key header"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/consult-gemini-panel.mjs:55", "config/MODEL_VERSIONS.md:53", "scripts/consult-gemini-panel.mjs:172"]
    rollback: "registry key gemini-31-pro"
    notes: "Key sent as a header here (correct pattern); this is the panel seat, distinct from the design-authority console above."
  - id: gemini-3.8-flash
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY", source: sspt-env-file }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: none
    role: candidate (opt-in)
    authority: none
    privacyClass: repo-source-only
    identityVerification: NOT ESTABLISHED
    status: CANDIDATE â€” OPT-IN ONLY
    source: ["config/MODEL_VERSIONS.md:39 (the current default is gemini-2.5-pro; no 3.8 consumer exists)", "owner-supplied: Google official docs list gemini-3.8-flash"]
    rollback: "none needed while unpromoted"
    notes: "Must not be repointed onto the design-authority consumer. Gemini design-vision use of Flash 2.5 is banned by policy; a newer Flash is not automatically promoted to that role."
  - id: gemini-2.0-flash
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY", source: sspt-env-file }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "backend services (not the consult stack)"
    role: none
    authority: none
    privacyClass: repo-source-only
    identityVerification: n/a
    status: RETIRED BY PROVIDER â€” LOCAL CALL SITES STILL PRESENT
    source: ["owner-supplied: Google lists gemini-2.0-flash as shut down", "backend/services/aiChatService.mjs:2245", "backend/services/ai/costConfig.mjs:36", "backend/services/ai/modelSelector.mjs:46", "backend/services/mealPlanService.mjs:185", "backend/services/foodPhotoService.mjs:96", "backend/services/formAnalysisService.mjs:98", "backend/services/equipmentScanSupport.mjs:30", "backend/eval/ab/abRunner.mjs:34", "backend/routes/contentStudioRoutes.mjs:195 (gemini-2.0-flash-exp)"]
    rollback: "repoint each call site to a current model"
    notes: "Nine-plus backend call sites reference a shut-down model. This is a DEFECT, not a registry annotation, and belongs in an SS-PT repair ticket â€” not in this inert file's scope to fix."

  # ------------------------------ DeepSeek ---------------------------------
  - id: deepseek-v4.1-flash
    provider: DeepSeek
    billingLane: direct-deepseek
    credential: { reference: DEEPSEEK_API_KEY, source: harness-store-ref }
    endpointFamily: "api.deepseek.com (guarded host: scripts/hooks/egress-chokepoint-guard.mjs:71)"
    harness: none
    role: experimental cheap builder / benchmark rival
    authority: none â€” never authoritative, never a required gate
    privacyClass: repo-source-only
    identityVerification: NOT ESTABLISHED
    status: POLICY-ONLY â€” NO ROUTE AND NO ENFORCER
    source: ["PROVIDER-SUBSCRIPTION-ROUTING.md:2", "PROVIDER-SUBSCRIPTION-ROUTING.md:46", "PROVIDER-SUBSCRIPTION-ROUTING.md:96", "0 scripts read process.env.DEEPSEEK_*", "DEEPSEEK_BASE_URL: 0 occurrences repo-wide"]
    rollback: n/a
    notes: "The '$5/month hard cap' has NO implementing code. The only DeepSeek credential reference outside the harness store is a BLOCKLIST entry (scripts/mcp/swan-council-subscription.mjs:18) that strips it from child env. If the cap is to be real it needs a spend-guard-gate entry â€” a separate authorization."
  - id: deepseek/deepseek-v4-pro
    provider: DeepSeek via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-grok.mjs (shared transport, SWAN_GROK_MODEL override)"
    role: paid panel seat
    authority: advisory; DISALLOWED as a fusion judge
    privacyClass: repo-source-only
    identityVerification: "script reports Requested vs Served and flags SUBSTITUTED"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/lib/panel-seats.mjs:101-104", "scripts/consult-grok.mjs:236", "scripts/lib/fusion-synthesis.mjs:43"]
    rollback: "seat removal from panel-seats.mjs"
    notes: "THIS IS A DIFFERENT LANE FROM deepseek-v4.1-flash: OpenRouter wallet, V4 Pro not V4.1 Flash. The policy forbids silently mixing the two."

  # -------------------------- Other OpenRouter seats -----------------------
  - id: moonshotai/kimi-k3
    provider: Moonshot via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-kimi.mjs"
    role: panel seat / cheaper orchestrator tier
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "requested-only; non-moonshotai/kimi-* override refused"
    status: VERIFIED (as literal)
    source: ["scripts/consult-kimi.mjs:14", "scripts/consult-kimi.mjs:119"]
    rollback: "SWAN_KIMI_MODEL (moonshotai/kimi-* only)"
    notes: "Dry-run is the DEFAULT; capUsd default $3 and hard-max $3; requires --confirm-spend."
  - id: openai/gpt-5.6-sol-pro
    provider: OpenAI via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-sol.mjs"
    role: premium panel seat
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "script reports served cost; no served-model assertion"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/consult-sol.mjs:59", "scripts/lib/panel-seats.mjs:49", "scripts/consult-sol.mjs:111"]
    rollback: "SWAN_SOL_MODEL"
    notes: "PRICE DIVERGENCE: consult-sol.mjs hardcodes $2/$10 per M while panel-seats.mjs lists $2.50/$15 for the same slug. Never trust either for a spend estimate without re-reading the catalog."
  - id: x-ai/grok-4.6
    provider: xAI via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-grok.mjs"
    role: panel seat / shared transport
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: "reports Requested and Served, flags SUBSTITUTED"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/consult-grok.mjs:60", "scripts/lib/panel-seats.mjs:97"]
    rollback: "SWAN_GROK_MODEL"
    notes: "SuperGrok via Kilo/OpenCode OAuth is a SEPARATE subscription route; do not mix it with this OpenRouter seat or its spend accounting."
  - id: tencent/hy3
    provider: Tencent via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-hy3-design.mjs"
    role: design seat
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: none
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/lib/panel-seats.mjs:144", "scripts/consult-hy3-design.mjs"]
    rollback: "seat removal"
    notes: "Implementation-present, policy-absent: not named in AGENTS.md/CLAUDE.md."
  - id: minimax/minimax-m2.7
    provider: MiniMax via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/hermes-village.mjs (design partner)"
    role: design partner
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: none
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["scripts/hermes-village.mjs:79", "config/MODEL_VERSIONS.md"]
    rollback: "n/a"
    notes: "Replaced the previous z-ai GLM design partner in this harness."
  - id: stealth/ox-alpha
    provider: stealth via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "panel 'ox' seat"
    role: panel seat
    authority: advisory
    privacyClass: repo-source-only
    identityVerification: none
    status: BROKEN â€” SEAT CANNOT RUN
    source: ["scripts/lib/panel-seats.mjs:121", "scripts/lib/panel-seats.mjs:118-125", "scripts/consult-ox.mjs:43-47", "scripts/consult-glm.mjs:24"]
    rollback: "remove the seat or drop the unsupported flag"
    notes: "The 'ox' seat passes --effort high into consult-ox.mjs -> consult-glm.mjs, whose flag set has no --effort: guaranteed invalid-arguments, exit 2. Registry entry also self-documents an expiry ~2026-08-27."

  # ---------------------------- Local --------------------------------------
  - id: qwen3.8:27b-mtp-q4_K_M
    provider: Ollama
    billingLane: local
    credential: { reference: none, source: n/a }
    endpointFamily: "http://127.0.0.1 (Ollama)"
    harness: "scripts/consult-qwen.mjs"
    role: free local reviewer
    authority: advisory
    privacyClass: "LOCAL-COMPUTE-BUT-PRIVACY-SENSITIVE (files are read by a local model)"
    identityVerification: "model tag is explicit in the request"
    status: NOT RUN (Ollama service not confirmed running this session)
    source: ["scripts/consult-qwen.mjs", "docs/ai-workflow/references/PANEL-AND-MODEL-ROUTING.md:19"]
    rollback: "n/a"
    notes: "An optional uncensored variant, if present, is opt-in and advisory only; it must never become the default or an authority seat."

  # ------------------- Harness-side route (settings.yaml) ------------------
  - id: zai-coding-cn
    provider: Z.ai (Coding Plan, CN)
    billingLane: subscription-zai
    credential: { reference: ZAI_CODING_CN_API_KEY, source: harness-store-ref }
    endpointFamily: "declared by the installed pi-ai catalog for this provider"
    harness: "$DSH_HOME/settings.yaml -> llm-pi-ai.providers.zai-coding-cn"
    role: harness route (not yet used by any agent preset)
    authority: none
    privacyClass: repo-source-only
    identityVerification: "MISSING_CREDENTIAL / INVALID_CREDENTIAL failure codes from the credential seam"
    status: CONFIGURED-BUT-UNVERIFIED
    source: ["$DSH_HOME/settings.yaml:3-6 (llm-pi-ai.providers.zai-coding-cn.apiKeyEnv)", "$DSH_HOME/.credentials.yaml (ref name only, value never read)", "dsh --profile web --dump-config (read-only composition, no boot)"]
    rollback: "remove the providers.zai-coding-cn block from settings.yaml"
    notes: "DISTINCT from ZAI_API_KEY (windows-user-env, len 49) used by the SS-PT scripts. Two names, two stores: presence of one is not evidence about the other. No DSH agent preset selects this route today."

# ---------------------------------------------------------------------------
# Invariants the harness must keep. These are assertions a validator can check;
# none of them is enforced by the harness itself.
# ---------------------------------------------------------------------------
invariants:
  - id: no-glm-via-openrouter
    statement: "A z-ai/ model must never be sent to an OpenRouter host."
    enforcedBy: "scripts/lib/redact-egress.mjs:229-249 (SS-PT side)"
  - id: no-secret-in-config
    statement: "This file and settings.yaml carry credential REFERENCES only."
    enforcedBy: "validator (see tests/provider-registry.check.mjs)"
  - id: no-silent-downgrade
    statement: "A substituted served model must be reported, never silently accepted."
    enforcedBy: "partial: consult-grok.mjs:292"
  - id: no-auto-retry
    statement: "A failed paid call is never retried automatically."
    enforcedBy: "partial â€” scripts/consult-openrouter-panel.mjs:97-101 DOES retry once on 4xx (same model, no re-confirm). Known exception, recorded rather than smoothed over."
  - id: cap-before-spend
    statement: "Every metered lane discloses a worst-case estimate before it runs."
    enforcedBy: "scripts/consult-kimi.mjs:130-134 (hard cap), scripts/lib/spend-guard-gate.mjs"
  - id: dirty-checkout-read-only
    statement: "The canonical SS-PT checkout is read-only for harness work while dirty and shared."
    enforcedBy: "process rule (no repo rule forbids editing it; AGENTS.md has no such rule)"

openDecisions:
  - id: fable-5-1-promotion
    question: "Promote anthropic/claude-fable-5.1 over the live claude-fable-5 Final-Decider route?"
    owner: Sean
    defaultUntilDecided: hold
  - id: gemini-3-8-flash
    question: "Adopt gemini-3.8-flash as an opt-in candidate?"
    owner: Sean
    defaultUntilDecided: hold
  - id: deepseek-cap-enforcer
    question: "Authorize a real $5/month DeepSeek cap in the spend guard, or drop the claim?"
    owner: Sean
    defaultUntilDecided: claim stands unimplemented and is marked as such
  - id: glm-credential-name
    question: "Is ZAI_API_KEY (windows-user-env) or ZAI_CODING_CN_API_KEY (harness store) the intended GLM credential for the harness?"
    owner: Sean
    defaultUntilDecided: SS-PT scripts use ZAI_API_KEY; the harness route uses its own store ref
  - id: route-activation
    question: "Activate provider routes in settings.yaml, or keep the registry inert?"
    owner: Sean
    defaultUntilDecided: inert
  - id: sc-v3-carveout
    question: "Does AGENTS.md:1174 (GLM->Flash->Astra for every slice) need an explicit Swan-Coach-Universe-V3 carve-out to match AGENTS.md:15-17?"
    owner: Sean
    defaultUntilDecided: both statements stand; conflicts are surfaced, never silently resolved
  - id: push-rule
    question: "Which governs: AGENTS.md:36 (no push to main without approval) or AGENTS.md:908 + rule 13 (always push to deploy)?"
    owner: Sean
    defaultUntilDecided: no push performed by this session

```\n
## ARTIFACT 2 of 2 — provider-registry.check.mjs

```js
#!/usr/bin/env node
/**
 * provider-registry.check.mjs â€” structural validator for $DSH_HOME/provider-registry.yaml
 *
 * NO NETWORK. This file imports no http/fetch library, spawns nothing, and reads
 * exactly one local file. That is what makes "model_calls=0" a real claim rather
 * than an assertion about intent.
 *
 * It is a CHECKER, not a schema authority: the harness does not load the registry.
 *
 * Usage: node provider-registry.check.mjs [path]
 * Exit:  0 = all checks passed, 1 = at least one failed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] || resolve(process.env.DSH_HOME || '.', 'provider-registry.yaml'));
const checks = [];
const check = (name, fn) => {
  try { const detail = fn(); checks.push({ name, ok: true, detail: detail || '' }); }
  catch (error) { checks.push({ name, ok: false, detail: error.message }); }
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };

if (!existsSync(target)) {
  console.error(`provider-registry.check: not found: ${target}`);
  process.exit(1);
}
const text = readFileSync(target, 'utf8');

// ---- structural parse: split rows on top-level list items under `models:` ----
const modelsStart = text.indexOf('\nmodels:');
assert(modelsStart !== -1, 'no top-level `models:` section');
// Bound the row scan to the `models:` section: `invariants:` and `openDecisions:`
// also use `  - id:` and must not be parsed as provider rows.
const modelsBlock = text.slice(modelsStart, text.indexOf('\ninvariants:'));
const rows = modelsBlock.split(/\n {2}- id: /).slice(1).map(chunk => {
  const idMatch = chunk.match(/^(\S+)/);
  const body = chunk.replace(/^\S+\n/, '');
  return { id: idMatch ? idMatch[1] : '(unparsed)', body };
});

const REQUIRED_FIELDS = ['provider', 'billingLane', 'credential', 'endpointFamily', 'harness',
  'role', 'authority', 'privacyClass', 'identityVerification', 'status', 'source', 'rollback', 'notes'];

check('rows parsed', () => {
  assert(rows.length >= 15, `expected >=15 registry rows, parsed ${rows.length}`);
  return `${rows.length} rows`;
});

check('every row declares all required fields', () => {
  const missing = [];
  for (const row of rows) {
    for (const field of REQUIRED_FIELDS) {
      // `m` anchors to line starts, so the FIRST field of a row (which has no
      // preceding newline after the id line is stripped) is matched too.
      if (!new RegExp(`^ {4}${field}:`, 'm').test(row.body)) missing.push(`${row.id}:${field}`);
    }
  }
  assert(missing.length === 0, `missing fields -> ${missing.join(', ')}`);
  return `${rows.length} rows x ${REQUIRED_FIELDS.length} fields`;
});

check('no credential VALUE is present (references only)', () => {
  const offenders = [];
  const secretShapes = [
    /sk-[A-Za-z0-9_-]{16,}/, /AIza[0-9A-Za-z_-]{20,}/, /eyJ[A-Za-z0-9_-]{10,}\./,
    /\bwhsec_[A-Za-z0-9]{10,}/, /\bxoxb-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i,
  ];
  for (const shape of secretShapes) if (shape.test(text)) offenders.push(String(shape));
  for (const row of rows) {
    const ref = row.body.match(/\n {4}credential: \{[^}]*reference: ([^,}]+)/);
    if (ref) {
      const value = ref[1].trim().replace(/^["']|["']$/g, '');
      const looksLikeValue = /^[A-Za-z0-9_\-]{24,}$/.test(value) && !/^[A-Z0-9_]+$/.test(value);
      if (looksLikeValue) offenders.push(`${row.id}:reference-shaped-like-a-key`);
    }
  }
  assert(offenders.length === 0, `possible secret material -> ${offenders.join(', ')}`);
  return 'references are NAMES only';
});

check('GLM never paired with an OpenRouter endpoint', () => {
  const bad = rows.filter(row => /z-ai\//.test(row.id) && /openrouter\.ai/.test(row.body) && !/BLOCKED/.test(row.body));
  assert(bad.length === 0, `mispaired rows -> ${bad.map(r => r.id).join(', ')}`);
  const blocked = rows.filter(row => /z-ai\//.test(row.id) && /BLOCKED/.test(row.body));
  return blocked.length ? `${blocked.length} z-ai row(s) correctly marked BLOCKED` : 'no z-ai rows';
});

check('direct Z.ai rows use the coding endpoint, not OpenRouter', () => {
  const direct = rows.filter(row => row.id === 'glm-5.3' || row.id === 'glm-5.3-flash');
  assert(direct.length === 2, 'expected both direct GLM rows');
  for (const row of direct) {
    assert(/api\.z\.ai\/api\/coding\/paas\/v4/.test(row.body), `${row.id} lacks the direct coding endpoint`);
    assert(!/openrouter\.ai/.test(row.body), `${row.id} mentions openrouter.ai`);
  }
  return 'both direct GLM rows pinned to api.z.ai/api/coding/paas/v4';
});

check('Fable 5.1 is recorded as a non-promoted candidate', () => {
  const row = rows.find(r => r.id === 'claude-fable-5-1');
  assert(row, 'claude-fable-5-1 row absent');
  assert(/CANDIDATE/.test(row.body), 'candidate row is not marked CANDIDATE');
  assert(/DO NOT PROMOTE/.test(row.body), 'candidate row lacks the do-not-promote marker');
  return 'candidate, unpromoted, rollback documented';
});

check('retired Gemini 2.0 Flash records its live local call sites', () => {
  const row = rows.find(r => r.id === 'gemini-2.0-flash');
  assert(row, 'gemini-2.0-flash row absent');
  assert(/RETIRED BY PROVIDER/.test(row.body), 'not marked retired');
  const sites = (row.body.match(/backend\/[A-Za-z0-9_/.]+:\d+/g) || []).length;
  assert(sites >= 5, `expected >=5 local call sites recorded, found ${sites}`);
  return `${sites} local call sites recorded`;
});

check('DeepSeek cap is marked unimplemented, not claimed', () => {
  const row = rows.find(r => r.id === 'deepseek-v4.1-flash');
  assert(row, 'deepseek-v4.1-flash row absent');
  assert(/NO ROUTE AND NO ENFORCER/.test(row.body), 'enforcer gap not disclosed');
  assert(/\$5\/month hard cap.*NO implementing code/i.test(row.body.replace(/\n/g, ' ')), 'cap gap wording missing');
  return 'cap disclosed as unimplemented';
});

check('every row cites at least one file:line source', () => {
  const bad = rows.filter(row => !/:\d+/.test(row.body));
  assert(bad.length === 0, `rows without file:line -> ${bad.map(r => r.id).join(', ')}`);
  return `${rows.length} rows cited`;
});

check('open decisions are recorded for the owner', () => {
  const decisionsStart = text.indexOf('\nopenDecisions:');
  assert(decisionsStart !== -1, 'no openDecisions section');
  const decisions = (text.slice(decisionsStart).match(/^ {2}- id: /gm) || []).length;
  assert(decisions >= 7, `expected >=7 open decisions, found ${decisions}`);
  assert(/owner: Sean/.test(text), 'no owner recorded');
  return `${decisions} decisions queued for Sean`;
});

check('no provider inference was attempted by this validator', () => {
  // Assert on the IMPORT GRAPH, not on substrings: a substring scan would match
  // its own forbidden-word list. No network module may be reachable from here.
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  const imports = [...self.matchAll(/^import .*?from '([^']+)'/gm)].map(m => m[1]);
  const reachable = imports.filter(spec => /^(node:)?(http|https|net|dgram|tls|child_process)$/.test(spec));
  assert(reachable.length === 0, `network/process modules imported -> ${reachable.join(', ')}`);
  return `model_calls=0; imports=[${imports.join(', ')}]`;
});

// ------------------------------- report -------------------------------------
const width = Math.max(...checks.map(c => c.name.length));
console.log(`provider-registry.check @ ${new Date().toISOString()}`);
console.log(`target: ${target}`);
console.log(`rows:   ${rows.length}   model_calls: 0\n`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(width)}  ${c.detail}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);

```\n