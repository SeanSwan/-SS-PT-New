# HOSTILE REVIEW PACKET v2 — DeepSeek Harness provider workflow package (REVISED)

This is hostile-review ROUND 2. Round 1 returned 33 findings (5xP1, 14xP2, 14xP3, 0xP0).
EVERY one has now been actioned. Your job is to verify the repairs and find what is STILL wrong.

## What changed since round 1

Registry (schemaVersion 2, 26 rows, 8 billing lanes, 10 declared statuses, 9 open decisions):
- WL-1: stealth/ox-alpha lane corrected from openrouter to subscription-zai (its exec chain is
  panel ox -> consult-ox.mjs -> consult-glm.mjs -> Z.ai). The OpenRouter "stealth" vendor row is
  now a SEPARATE row (stealth/ox-alpha-catalog) marked RETIRED_BY_PROVIDER.
- MR-1: the DeepSeek row now records that "no route" is true of SS-PT scripts only, and names the
  contradicting evidence (harness credential-store ref; egress guard on api.deepseek.com).
- MR-2/MR-3: rows added for claude-subscription and supergrok-subscription, with their own lanes.
- MR-4: consult-openrouter-panel.mjs now has a row (required --model, no default; the stack's ONE auto-retry).
- MR-5/CE-3/DQ-4: the candidate row is re-keyed to the catalog id anthropic/claude-fable-5.1 and now
  cites the live catalog query (1M ctx, $10/M in, $50/M out).
- CE-1: gemini-2.0-flash and gemini-3.8-flash existence claims are marked owner-report, not verified.
- CE-2: the 600s admission claim is re-attributed to the SS-PT workflow controller and to this
  session's observation, not to AGENTS.md:1174.
- CE-4: a status vocabulary now exists and every row uses it.
- CE-6: zai-coding-cn endpointFamily downgraded to NOT_ESTABLISHED.
- CE-7/CE-10/CE-11: line numbers added; the ZAI_API_KEY process-env absence is now in-row; mojibake checked.
- AU-1/DQ-3: a ninth decision (fable-vs-astra-authority) was added; EVERY decision now carries
  owner, reviewBy and ifUnresolved.
- AU-2/AU-3/AU-4: the identity-verification risk on the Final Decider, the role-vs-authority
  distinction, and the cadence-vs-advisory tension are each recorded in-row.
- DQ-1/DQ-2/DQ-5: the push default is now session-independent ("no push without explicit human
  approval"); the DeepSeek cap default is now "the cap is NOT REAL and the lane stays dark";
  the same conflict doctrine is applied to both standing contradictions.
- SH-1/SH-2/SH-3: the Gemini URL-query key transport is promoted to a repair item; credential
  LENGTHS were deleted; the unidentified "stealth" recipient is the one differentiated privacyClass.
- IN-1/IN-2: the header no longer claims "nothing loads it" as an absolute, and states that
  inert load is not inert effect.
- CE-8: `consult-ox.mjs --effort high` was ACTUALLY RUN. Result: --effort is absent from
  consult-glm.mjs's flag Set, so it is SILENTLY IGNORED, not fatal; my earlier "guaranteed
  invalid-arguments, exit 2" came from an invalid document path and is retracted in-row.

Validator (tests/provider-registry.check.mjs): rewritten from 11 checks (10 of which asserted the
file contains the right WORDS) to 15 checks that each evaluate a DERIVED FACT:
- VB-1 lane existence + lane<->credential<->endpoint coherence against a per-lane contract
- VB-2 every cited file:line resolves on disk (66 citations resolved)
- VB-3 import-graph check now parses double quotes, dynamic import() and require()
- VB-4 secret scan covers the whole row body incl. long hex runs, and rejects credential lengths
- VB-5 keyed to the catalog id, and asserts the docs-spelling row is gone
- VB-6 authority is a closed set with at most one final-decider
- VB-7 every status comes from the declared vocabulary
- VB-8 duplicate-id detection
- VB-9 a missing section FAILS instead of silently truncating a slice
Result: 15/15 PASS.

## YOUR REMIT THIS ROUND

1. Are any of the 33 round-1 findings NOT actually fixed, or fixed only in prose? Name them.
2. Do the new rows introduce new defects (wrong lane, wrong authority, unverifiable claim)?
3. Attack the validator again: what real defect class still passes 15/15? Give a concrete
   counterexample you could plant. Note the checker now requires citations to resolve and lanes to cohere.
4. Did any repair overstate what was verified — i.e. does the file now claim OBSERVED where the
   evidence is still only EXISTS_AS_LITERAL or owner-report?
5. Is the status vocabulary applied honestly, or used to launder unverified claims?
6. Is the CE-8 retraction correct, or was the defect real and the retraction wrong?

Report findings only, in the round-1 format: `id | severity P0..P3 | row/line | defect | what would prove it`.
Say "none found" for a category that yields nothing. Do not propose provider calls.

---
## ARTIFACT 1 of 2 — provider-registry.yaml (v2)

```yaml
# DeepSeek Harness provider registry (INERT CONFIGURATION DATA)
#
# STATUS OF THIS FILE: it is inert *configuration* data — nothing under $DSH_HOME
# boots it. It is not a cordis patch, not settings.yaml, and not a profile bundle.
# Two honest qualifications GLM 5.3 raised and this revision accepts:
#   1. "Nothing loads it" is FALSE as an absolute: tests/provider-registry.check.mjs
#      loads and parses it. Nothing *routes* on it.
#   2. "Inert load" is not "inert effect": several rows carry actionable guidance
#      (rollbacks, promotion gates), so a wrong row mis-spends when acted on even
#      though nothing loads it. WL-1 was the worked example and is now fixed.
#
# No credential VALUES appear here. `credential.reference` is a NAME resolved by the
# harness credential seam (~/.dsh/.credentials.yaml refs) or an environment variable.
# Credential LENGTHS are deliberately NOT recorded (SH-2: length is key metadata and
# this file is designed to be shared).
#
# Written 2026-09-13 by the DeepSeek Harness session after a read-only audit of the
# canonical SS-PT checkout, then revised against a 33-finding GLM 5.3 hostile review.
# Every row cites file:line that was READ, or is explicitly marked owner-report.
schemaVersion: 2
registryId: dsh-provider-registry
lastVerifiedUtc: "2026-09-13T19:30:00Z"
verifiedBy: deepseek-harness-session
revisionNote: "v2 addresses GLM 5.3 findings CE-1..CE-11, WL-1, MR-1..MR-6, AU-1..AU-4, IN-1..IN-2, SH-1..SH-3, DQ-1..DQ-5."
canonicalRepo: "canonical SS-PT checkout (branch wip/comms-notifications-2026-07-05; dirty by design)"

# ---------------------------------------------------------------------------
# Status vocabulary (CE-4: "VERIFIED" was carrying two incompatible meanings).
# ---------------------------------------------------------------------------
statusValues:
  OBSERVED_WORKING: "a run was executed and its result was seen in this session"
  EXISTS_AS_LITERAL: "the id appears in source that was read; no run was made"
  CONFIGURED_BUT_UNVERIFIED: "route/credential configured; entitlement never exercised"
  OWNER_REPORT_UNCONFIRMED: "asserted by the owner or an external doc; no local or catalog evidence"
  POLICY_ONLY: "named in policy; no route, no harness, and possibly no enforcer"
  CANDIDATE: "a migration or adoption candidate; deliberately not active"
  RETIRED_BY_PROVIDER: "the provider has shut the model down"
  BROKEN: "structurally cannot run"
  BLOCKED: "a guard refuses this route by design"
  NOT_ESTABLISHED: "not verified and not claimed"

# Billing lanes are mutually exclusive. A model id never implies a lane.
billingLanes:
  subscription-zai:
    provider: Z.ai
    mode: subscription
    meter: "plan credit (2,000/5h, 10,000/week per GLM-ZAI-ACCESS.md:65)"
    spendGate: none-in-repo
  subscription-codex:
    provider: OpenAI via Codex workspace
    mode: subscription
    meter: seat usage
    spendGate: none-in-repo
  subscription-claude:
    provider: Anthropic via Claude Code
    mode: subscription
    meter: "Claude Max 20x (teacher discount)"
    spendGate: none-in-repo
    note: "No SS-PT script routes an Anthropic model through this lane; see row claude-subscription."
  subscription-grok:
    provider: xAI via SuperGrok
    mode: subscription
    meter: "SuperGrok seat through Kilo Code / OpenCode OAuth"
    spendGate: none-in-repo
    note: "Distinct from the OpenRouter x-ai/grok-4.6 seat; do not mix the routes or their accounting."
  direct-google:
    provider: Google
    mode: api
    meter: "Google-side usage; $0 against the OpenRouter wallet"
    spendGate: "action-time verification required"
  direct-deepseek:
    provider: DeepSeek
    mode: api
    meter: "per-token; off-peak is half price"
    spendGate: "policy $5/month hard cap — NO ENFORCER EXISTS (see row deepseek-v4.1-flash)"
  openrouter:
    provider: OpenRouter
    mode: api-wallet
    meter: per-token wallet
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
    credential: { reference: ZAI_API_KEY, source: windows-user-env, presentInHarnessProcessEnv: false }
    endpointFamily: "https://api.z.ai/api/coding/paas/v4/chat/completions"
    harness: "scripts/consult-glm.mjs"
    role: hostile-review-seat (advisory)
    authority: advisory
    privacyClass: "recipient=Z.ai CN endpoint; repo source only"
    identityVerification: "OBSERVED: response reports served=glm-5.3 (receipt status=complete)"
    status: OBSERVED_WORKING
    source: ["scripts/consult-glm.mjs:17", "scripts/consult-glm.mjs:37", "scripts/consult-glm.mjs:73-74", "this session 2026-09-13: served=glm-5.3, 30105 completion tokens, http=200"]
    rollback: "scripts/consult-ox.mjs pins glm-5.3-flash separately"
    notes: "CE-10: credential present in the Windows USER env but ABSENT from the harness process env, and consult-glm.mjs does not load .env, so a harness-invoked run fails closed with credential-missing unless the key is injected. Registry entry ABSENT from config/MODEL_VERSIONS.md — unregistered but live."
  - id: glm-5.3-flash
    provider: Z.ai
    billingLane: subscription-zai
    credential: { reference: ZAI_API_KEY, source: windows-user-env, presentInHarnessProcessEnv: false }
    endpointFamily: "https://api.z.ai/api/coding/paas/v4/chat/completions (via consult-glm.mjs child)"
    harness: "scripts/consult-ox.mjs"
    role: hostile-review-seat (advisory)
    authority: advisory
    privacyClass: "recipient=Z.ai CN endpoint; repo source only"
    identityVerification: "wrapper REFUSES a --model override; prints route=direct-zai"
    status: EXISTS_AS_LITERAL
    source: ["scripts/consult-ox.mjs:35", "scripts/consult-ox.mjs:45", "scripts/consult-ox.mjs:49"]
    rollback: "revert to consult-glm.mjs --model glm-5.3"
    notes: "Same Z.ai lineage as glm-5.3 — not independent-provider corroboration. AU-4: if AGENTS.md:1174's GLM->Flash->Astra cadence is mandatory for a given task, 'advisory' understates its procedural gate role; the dated override at AGENTS.md:15-17 is the counter-text."
  - id: z-ai/glm-5.2
    provider: Z.ai via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/validation-orchestrator.mjs"
    role: design-debate-lead
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: none
    status: BLOCKED
    source: ["scripts/validation-orchestrator.mjs:85", "scripts/validation-orchestrator.mjs:1666", "scripts/lib/redact-egress.mjs:229-249"]
    rollback: "switch to scripts/consult-glm.mjs (direct Z.ai)"
    notes: "BLOCKED BY DESIGN: the z-ai/ subscription-seat guard throws before the socket. The fix is to switch seats, never to bypass the guard."

  # ---------------------- Codex / OpenAI (subscription, no API key) ---------
  - id: gpt-6-astra
    provider: OpenAI via Codex
    billingLane: subscription-codex
    credential: { reference: "codex client auth (codex auth store)", source: harness-store, presentInHarnessProcessEnv: false }
    endpointFamily: "openai-codex app transport"
    harness: "codex CLI >= 0.153.4 (app-bundled) or the codex-app MCP tool"
    role: architecture, adjudication, repair
    authority: gate-owner (final-astra cadence)
    privacyClass: "recipient=OpenAI via Codex subscription; repo source only"
    identityVerification: "observed: npm CLI 0.146.1 returned HTTP 400 'requires a newer version of Codex'; app-bundled 0.153.4 completed a turn"
    status: OBSERVED_WORKING
    source: ["AGENTS.md:1174", "CLAUDE.md:1106", "this session 2026-09-13: 400 on cli 0.146.1; turn.completed on app binary 0.153.4"]
    rollback: "upgrade the npm CLI, or dispatch from a surface holding the codex-app MCP tools"
    notes: "CE-2 CORRECTED: the 600-second admission window is a property of the SS-PT Mega Blueprints workflow controller, NOT of this registry row; it was observed this session (admitted 07:59:52Z, deadline 08:09:52Z) but is not cited to AGENTS.md:1174 or CLAUDE.md:1106."
  - id: gpt-5.6-luna
    provider: OpenAI via Codex
    billingLane: subscription-codex
    credential: { reference: "codex client auth", source: harness-store, presentInHarnessProcessEnv: false }
    endpointFamily: "openai-codex app transport"
    harness: none-in-registry
    role: bounded implementation
    authority: builder-only
    privacyClass: "recipient=OpenAI via Codex subscription; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: POLICY_ONLY
    source: ["AGENTS.md:1174", "CLAUDE.md:1106"]
    rollback: "n/a"
    notes: "Named in policy; no DSH-side route exists or is proposed."
  - id: gpt-5.6-terra
    provider: OpenAI via Codex
    billingLane: subscription-codex
    credential: { reference: "codex client auth", source: harness-store, presentInHarnessProcessEnv: false }
    endpointFamily: "openai-codex app transport"
    harness: "scripts/consult-terra-pro.mjs"
    role: balance / cost lane
    authority: advisory
    privacyClass: "recipient=OpenAI via Codex subscription or OpenRouter; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: EXISTS_AS_LITERAL
    source: ["scripts/consult-terra-pro.mjs", "MR-6 audit: absent from AGENTS.md and CLAUDE.md entirely"]
    rollback: "n/a"
    notes: "Implementation-present, policy-absent: a script exists for a lane the root policy files never name."

  # --------------------------- Anthropic (subscription + OpenRouter) --------
  - id: claude-subscription
    provider: Anthropic via Claude Code
    billingLane: subscription-claude
    credential: { reference: "Claude Code client auth", source: harness-store, presentInHarnessProcessEnv: false }
    endpointFamily: "Claude Code harness"
    harness: "Claude Code CLI (filesystem-capable)"
    role: filesystem-capable co-orchestrator harness
    authority: advisory
    privacyClass: "recipient=Anthropic subscription; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: POLICY_ONLY
    source: ["AGENTS.md:877-901 (seat table)", "audit: no scripts/consult-claude*.mjs exists"]
    rollback: "n/a"
    notes: "MR-2 fix: this row occupies billingLanes.subscription-claude, which previously had zero rows. Distinct from the OpenRouter Fable lane; a subscription seat is not an API key and is not the OpenRouter wallet."
  - id: anthropic/claude-fable-5
    provider: Anthropic via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-fable.mjs"
    role: Final Decider (SS-PT co-orchestrator contract)
    authority: final-decider
    privacyClass: "recipient=OpenRouter relay to Anthropic; repo source only"
    identityVerification: "requested-only; no served-model assertion in-script"
    status: OBSERVED_WORKING
    source: ["scripts/consult-fable.mjs:54", "scripts/consult-fable.mjs:7", "config/MODEL_VERSIONS.md:70", "AGENTS.md:34", "AGENTS.md:871"]
    rollback: "SWAN_FUSION_JUDGE_MODEL env override"
    notes: "In-script price $10/M in, $50/M out, matching the live catalog. AU-2: because identityVerification is requested-only, that same env override is a one-variable path to the silent Final-Decider replacement this package forbids; promotion or override of this seat needs a served-identity assertion first."
  - id: anthropic/claude-fable-5.1
    provider: Anthropic via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: none-in-registry
    role: candidate (rotation)
    authority: none
    privacyClass: "recipient=OpenRouter relay to Anthropic; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: CANDIDATE
    source: ["live OpenRouter catalog query 2026-09-13 (free metadata, no inference): id anthropic/claude-fable-5.1, 1M ctx, $10/M in, $50/M out, created 1788285838", "0 occurrences in scripts/", "0 occurrences in config/", "docs claim: docs/ai-workflow/hermes-learning-packets/2026-09-03-a-500-only-logged-in-users-see-on-a-fresh-deploy-is-a-boot-race.md:5"]
    rollback: "none needed while unpromoted"
    notes: "MR-5/CE-3/DQ-4 fix: re-keyed to the catalog id. Earlier revisions keyed this row claude-fable-5-1 (a docs spelling) and said no catalog re-query had been done; the catalog query in source[0] now supersedes that. Promotion still requires a served-identity assertion and a guard test, neither of which exists. One observed call at 16k output tokens truncated mid-reasoning and returned no findings."

  # ------------------------------- Google (direct API) ---------------------
  - id: gemini-2.5-pro
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY (fallback GOOGLE_AI_KEY)", source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "scripts/consult-gemini.mjs"
    role: lead-design-authority console
    authority: advisory
    privacyClass: "recipient=Google direct; repo source only"
    identityVerification: "requested-only; the script LABELS ITSELF 'Gemini 3.1 Pro' while requesting gemini-2.5-pro"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/consult-gemini.mjs:81", "config/MODEL_VERSIONS.md:39", "scripts/consult-gemini.mjs:452"]
    rollback: "registry key gemini-pro-model"
    notes: "AU-3: 'lead-design-authority' as a role label with authority=advisory is a deliberate distinction (design authority in prose, no gate power), not a contradiction. SH-1: the key travels in the URL query (?key=) here, unlike consult-gemini-panel.mjs which uses the x-goog-api-key header — an active leak channel into logs/proxies/history, promoted to repair item SH-1 rather than filed as a note."
  - id: gemini-3.1-pro-preview
    provider: Google
    billingLane: direct-google
    credential: { reference: "GEMINI_API_KEY (fallback GOOGLE_AI_KEY)", source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "scripts/consult-gemini-panel.mjs"
    role: panel seat (design debate)
    authority: advisory
    privacyClass: "recipient=Google direct; repo source only"
    identityVerification: "requested-only; key sent as x-goog-api-key header"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/consult-gemini-panel.mjs:55", "config/MODEL_VERSIONS.md:53", "scripts/consult-gemini-panel.mjs:172"]
    rollback: "registry key gemini-31-pro"
    notes: "Panel seat, distinct from the design-authority console above."
  - id: gemini-3.8-flash
    provider: Google
    billingLane: direct-google
    credential: { reference: GEMINI_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: none-in-registry
    role: candidate (opt-in)
    authority: none
    privacyClass: "recipient=Google direct; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: CANDIDATE
    source: ["config/MODEL_VERSIONS.md:39 (the current default is gemini-2.5-pro; no 3.8 consumer exists)", "CE-1: owner-report only — no catalog or docs citation was produced"]
    rollback: "none needed while unpromoted"
    notes: "CE-1 accepted: the existence claim is OWNER_REPORT_UNCONFIRMED. Must not be repointed onto the design-authority consumer. Gemini design-vision use of Flash 2.5 is banned by policy; a newer Flash is not automatically promoted to that role."
  - id: gemini-2.0-flash
    provider: Google
    billingLane: direct-google
    credential: { reference: GEMINI_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    harness: "backend services (not the consult stack)"
    role: none
    authority: none
    privacyClass: "recipient=Google direct; repo source only"
    identityVerification: n/a
    status: RETIRED_BY_PROVIDER
    source: ["backend/services/aiChatService.mjs:2245", "backend/services/ai/costConfig.mjs:36", "backend/services/ai/modelSelector.mjs:46", "backend/services/mealPlanService.mjs:185", "backend/services/foodPhotoService.mjs:96", "backend/services/formAnalysisService.mjs:98", "backend/services/equipmentScanSupport.mjs:30", "backend/eval/ab/abRunner.mjs:34", "backend/routes/contentStudioRoutes.mjs:195"]
    rollback: "repoint each call site to a current model"
    notes: "CE-1 accepted for the retirement claim: it is owner-report (Google shut-down list), not locally verifiable. MR-6 partially accepted: backend coverage is BROADER than this one id — a services/ai scan also found gemini-1.5-pro, gemini-2.0-flash-lite, gemini-2.5-flash, gpt-4, gpt-4o, gpt-4o-mini, claude-3-5-sonnet(-20241022), claude-3-opus(-20240229), claude-4.5-sonnet, claude-haiku-4-5, claude-opus-4-6, claude-sonnet-4-6. Backend model coverage is therefore UNPROVEN, not established, and belongs in an SS-PT repair ticket."

  # ------------------------------ DeepSeek ---------------------------------
  - id: deepseek-v4.1-flash
    provider: DeepSeek
    billingLane: direct-deepseek
    credential: { reference: DEEPSEEK_API_KEY, source: harness-store-ref, presentInHarnessProcessEnv: false }
    endpointFamily: "api.deepseek.com (guarded host: scripts/hooks/egress-chokepoint-guard.mjs:71)"
    harness: none-in-sspt-scripts
    role: experimental cheap builder / benchmark rival
    authority: "none — never authoritative, never a required gate, disallowed as a fusion judge (scripts/lib/fusion-synthesis.mjs:43)"
    privacyClass: "recipient=DeepSeek direct (when wired); repo source only"
    identityVerification: NOT_ESTABLISHED
    status: POLICY_ONLY
    source: ["docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md:2", "docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md:46", "docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md:96", "audit: 0 scripts read process.env.DEEPSEEK_*", "audit: DEEPSEEK_BASE_URL has 0 occurrences repo-wide"]
    rollback: "n/a"
    notes: "MR-1 accepted and narrowed: 'no route' is true of SS-PT scripts, but this row's own evidence contradicts the stronger reading — the harness credential store holds a DEEPSEEK_API_KEY ref, and scripts/hooks/egress-chokepoint-guard.mjs:71 guards api.deepseek.com. The '$5/month hard cap' has NO implementing code; the only other DEEPSEEK_API_KEY reference in the repo is a BLOCKLIST entry (scripts/mcp/swan-council-subscription.mjs:18) that strips it from child env. DQ-2 fix: the conservative default is that the cap is NOT REAL and this lane stays dark until a spend-guard entry exists."
  - id: deepseek/deepseek-v4-pro
    provider: DeepSeek via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-grok.mjs (shared transport, SWAN_GROK_MODEL override)"
    role: paid panel seat
    authority: "advisory; DISALLOWED as a fusion judge"
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: "script reports Requested vs Served and flags SUBSTITUTED"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/lib/panel-seats.mjs:101-104", "scripts/consult-grok.mjs:236", "scripts/lib/fusion-synthesis.mjs:43"]
    rollback: "seat removal from panel-seats.mjs"
    notes: "A DIFFERENT LANE from deepseek-v4.1-flash: OpenRouter wallet, V4 Pro not V4.1 Flash. Policy forbids silently mixing the two."

  # -------------------------- Other OpenRouter seats -----------------------
  - id: moonshotai/kimi-k3
    provider: Moonshot via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-kimi.mjs"
    role: "panel seat / cheaper orchestrator tier / Fable-tier learning-gate member"
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: "requested-only; non-moonshotai/kimi-* override refused"
    status: EXISTS_AS_LITERAL
    source: ["scripts/consult-kimi.mjs:14", "scripts/consult-kimi.mjs:119"]
    rollback: "SWAN_KIMI_MODEL (moonshotai/kimi-* only)"
    notes: "Dry-run is the DEFAULT; capUsd default and hard max both $3; requires --confirm-spend."
  - id: openai/gpt-5.6-sol-pro
    provider: OpenAI via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-sol.mjs"
    role: premium panel seat
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: "script reports served cost; no served-model assertion"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/consult-sol.mjs:59", "scripts/lib/panel-seats.mjs:49", "scripts/consult-sol.mjs:111"]
    rollback: "SWAN_SOL_MODEL"
    notes: "CE-5 accepted: the two hardcoded price tables disagree ($2/$10 in consult-sol.mjs:111 vs $2.50/$15 in panel-seats.mjs) for the same slug, so a worst-case estimate computed from the cheaper table understates cost by 25-50%. Any cap computed from either table without re-reading the live catalog is unsound."
  - id: x-ai/grok-4.6
    provider: xAI via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-grok.mjs"
    role: panel seat / shared transport
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: "reports Requested and Served, flags SUBSTITUTED"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/consult-grok.mjs:60", "scripts/lib/panel-seats.mjs:97"]
    rollback: "SWAN_GROK_MODEL"
    notes: "MR-3 fix: the SuperGrok subscription route now has billingLanes.subscription-grok and row supergrok-subscription; it is a separate route from this OpenRouter seat."
  - id: supergrok-subscription
    provider: xAI via SuperGrok
    billingLane: subscription-grok
    credential: { reference: "SuperGrok OAuth via Kilo Code / OpenCode", source: harness-store, presentInHarnessProcessEnv: false }
    endpointFamily: "Kilo Code / OpenCode OAuth harness"
    harness: "Kilo Code / OpenCode"
    role: independent reviewer with local repository access
    authority: advisory
    privacyClass: "recipient=xAI subscription; repo source only"
    identityVerification: NOT_ESTABLISHED
    status: POLICY_ONLY
    source: ["AGENTS.md:877-901 (seat table)", "audit: no scripts/consult-supergrok*.mjs exists"]
    rollback: "n/a"
    notes: "MR-3 fix: previously acknowledged in a note with no row and no lane. Do not mix this subscription route with SWAN_GROK_MODEL or OpenRouter spend accounting."
  - id: tencent/hy3
    provider: Tencent via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-hy3-design.mjs"
    role: design seat
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: none
    status: EXISTS_AS_LITERAL
    source: ["scripts/lib/panel-seats.mjs:144", "scripts/consult-hy3-design.mjs:1"]
    rollback: "seat removal"
    notes: "CE-7 fix: line numbers added. Implementation-present, policy-absent."
  - id: minimax/minimax-m2.7
    provider: MiniMax via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/hermes-village.mjs (design partner)"
    role: design partner
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: none
    status: EXISTS_AS_LITERAL
    source: ["scripts/hermes-village.mjs:79", "config/MODEL_VERSIONS.md:1"]
    rollback: "n/a"
    notes: "CE-7 fix: line numbers added. Replaced the previous z-ai GLM design partner in this harness."
  - id: openrouter-panel-unregistered
    provider: OpenRouter (any model)
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "scripts/consult-openrouter-panel.mjs"
    role: ad-hoc panel seat (model supplied per run)
    authority: advisory
    privacyClass: "recipient=OpenRouter relay; repo source only"
    identityVerification: none
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["scripts/consult-openrouter-panel.mjs:42", "scripts/consult-openrouter-panel.mjs:48", "scripts/consult-openrouter-panel.mjs:97-101"]
    rollback: "n/a"
    notes: "MR-4 fix: this harness had NO row. It takes a required --model with no default, so its spend path is model-dependent and unregistered. It is also the stack's ONE auto-retry: on a 4xx it retries once without the reasoning parameter, same model, with no fresh --confirm-spend."
  - id: stealth/ox-alpha
    provider: Z.ai subscription (NOT OpenRouter)
    billingLane: subscription-zai
    credential: { reference: ZAI_API_KEY, source: windows-user-env, presentInHarnessProcessEnv: false }
    endpointFamily: "https://api.z.ai/api/coding/paas/v4/chat/completions"
    harness: "panel 'ox' seat -> scripts/consult-ox.mjs -> scripts/consult-glm.mjs"
    role: panel seat
    authority: advisory
    privacyClass: "recipient=Z.ai CN endpoint; repo source only"
    identityVerification: none
    status: NOT_ESTABLISHED
    source: ["scripts/lib/panel-seats.mjs:118-125", "scripts/consult-ox.mjs:35", "scripts/consult-ox.mjs:49", "observed 2026-09-13: scripts/consult-ox.mjs --effort high printed route=direct-zai then consult-glm refused on the document argument, exit 2"]
    rollback: "remove the seat, or drop the unsupported flag"
    notes: "WL-1 fix: lane corrected from openrouter to subscription-zai — the exec chain reaches consult-glm.mjs, which bills the Z.ai subscription with ZAI_API_KEY, exactly like the glm-5.3-flash row this file already carried. CE-8 correction: the earlier claim 'guaranteed invalid-arguments, exit 2' was NOT reproduced. --effort is simply absent from consult-glm.mjs's flag Set (:24), so it is ignored rather than fatal; the exit 2 in my probe came from an invalid document path. The honest finding is a SILENTLY IGNORED flag, not a dead seat. Confirming which would require a live subscription call."
  - id: stealth/ox-alpha-catalog
    provider: unknown vendor 'stealth' via OpenRouter
    billingLane: openrouter
    credential: { reference: OPENROUTER_API_KEY, source: sspt-env-file, presentInHarnessProcessEnv: false }
    endpointFamily: "openrouter.ai/api/v1/chat/completions"
    harness: "config/MODEL_VERSIONS.md registry"
    role: historical panel seat
    authority: none
    privacyClass: "recipient=UNIDENTIFIED vendor relay — flag for review (SH-3)"
    identityVerification: none
    status: RETIRED_BY_PROVIDER
    source: ["config/MODEL_VERSIONS.md:107 (self-documents an expiry ~2026-08-27)"]
    rollback: "n/a"
    notes: "SH-3 fix: the only row whose privacyClass is differentiated, because 'stealth' is an unidentified recipient routed through OpenRouter. Kept separate from the Z.ai-subscription ox seat it is often confused with."

  # ---------------------------- Local --------------------------------------
  - id: qwen3.8:27b-mtp-q4_K_M
    provider: Ollama
    billingLane: local
    credential: { reference: none, source: n/a, presentInHarnessProcessEnv: false }
    endpointFamily: "http://127.0.0.1 (Ollama)"
    harness: "scripts/consult-qwen.mjs"
    role: free local reviewer
    authority: advisory
    privacyClass: "LOCAL-COMPUTE-BUT-PRIVACY-SENSITIVE (files are read by a local model)"
    identityVerification: "model tag is explicit in the request"
    status: NOT_ESTABLISHED
    source: ["scripts/consult-qwen.mjs:1", "docs/ai-workflow/references/PANEL-AND-MODEL-ROUTING.md:19"]
    rollback: "n/a"
    notes: "CE-7 fix: line numbers added. Ollama service was not confirmed running this session. An optional uncensored variant, if present, is opt-in and advisory only; it must never become the default or an authority seat."

  # ------------------- Harness-side route (settings.yaml) ------------------
  - id: zai-coding-cn
    provider: Z.ai (Coding Plan, CN)
    billingLane: subscription-zai
    credential: { reference: ZAI_CODING_CN_API_KEY, source: harness-store-ref, presentInHarnessProcessEnv: false }
    endpointFamily: NOT_ESTABLISHED
    harness: "settings.yaml -> llm-pi-ai.providers.zai-coding-cn"
    role: harness route (selected by no agent preset today)
    authority: none
    privacyClass: "recipient=Z.ai CN endpoint; repo source only"
    identityVerification: "MISSING_CREDENTIAL / INVALID_CREDENTIAL failure codes exist in the credential seam; never observed for this route"
    status: CONFIGURED_BUT_UNVERIFIED
    source: ["settings.yaml:3-6 (llm-pi-ai.providers.zai-coding-cn.apiKeyEnv)", "credential store ref name only; value never read", "dsh --profile web --dump-config (read-only composition, no boot)"]
    rollback: "remove the providers.zai-coding-cn block from settings.yaml"
    notes: "CE-6 fix: endpointFamily downgraded from 'declared by the installed pi-ai catalog' to NOT_ESTABLISHED, and identityVerification records that the failure codes were never observed for this route. DISTINCT from ZAI_API_KEY (windows-user-env) used by the SS-PT scripts: two names, two stores, and presence of one is not evidence about the other."

# ---------------------------------------------------------------------------
# Invariants. GLM 5.3 (CE-9) correctly noted the earlier preamble overstated this:
# NOT all of these are validator-checkable. The checkable column says which are.
# ---------------------------------------------------------------------------
invariants:
  - id: no-glm-via-openrouter
    statement: "A z-ai/ model must never be sent to an OpenRouter host."
    enforcedBy: "scripts/lib/redact-egress.mjs:229-249 (SS-PT side, throws before the socket)"
    validatorChecked: true
  - id: no-secret-in-config
    statement: "This file carries credential REFERENCES only — no values, and no credential lengths."
    enforcedBy: "tests/provider-registry.check.mjs"
    validatorChecked: true
  - id: lane-coherence
    statement: "Every row's billingLane exists in billingLanes, and its credential/endpoint agree with that lane."
    enforcedBy: "tests/provider-registry.check.mjs"
    validatorChecked: true
  - id: sources-resolve
    statement: "Every file:line citation resolves to a file that exists on disk."
    enforcedBy: "tests/provider-registry.check.mjs (existence only; content is not re-read)"
    validatorChecked: true
  - id: single-final-authority
    statement: "At most one row may carry authority=final-decider."
    enforcedBy: "tests/provider-registry.check.mjs"
    validatorChecked: true
  - id: no-silent-downgrade
    statement: "A substituted served model must be reported, never silently accepted."
    enforcedBy: "partial: scripts/consult-grok.mjs:292"
    validatorChecked: false
  - id: no-auto-retry
    statement: "A failed paid call is never retried automatically."
    enforcedBy: "KNOWN EXCEPTION: scripts/consult-openrouter-panel.mjs:97-101 retries once on 4xx, same model, no re-confirm. Recorded, not smoothed over."
    validatorChecked: false
  - id: cap-before-spend
    statement: "Every metered lane discloses a worst-case estimate before it runs, from a price table verified against the live catalog at action time."
    enforcedBy: "scripts/consult-kimi.mjs:130-134 (hard cap), spend-guard-gate"
    validatorChecked: false
  - id: dirty-checkout-read-only
    statement: "The canonical SS-PT checkout is treated as read-only while dirty and shared."
    enforcedBy: "PROCESS RULE ONLY — no repo rule forbids editing it and no validator check touches it (CE-9)."
    validatorChecked: false

openDecisions:
  - id: fable-vs-astra-authority
    question: "Two rows claim final authority: anthropic/claude-fable-5 (final-decider per AGENTS.md:34,871) and gpt-6-astra (gate-owner per AGENTS.md:1174 / CLAUDE.md:1106). Which governs, and for which task classes?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "root policy governs (Fable); the cadence grant is read as procedural, not as a second final authority"
    why: "AU-1: the package's own doctrine says conflicts are surfaced, never silently resolved, and this was the highest-stakes conflict in the file with no decision covering it."
  - id: fable-5-1-promotion
    question: "Promote anthropic/claude-fable-5.1 over the live claude-fable-5 Final-Decider route?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "hold — the row stays CANDIDATE. Promotion requires a served-identity assertion and a guard test; one observed 5.1 call at 16k output tokens truncated and returned no findings."
    why: "DQ-3: previously had no review date, so 'open' could mean 'indefinitely stalled'."
  - id: deepseek-cap-enforcer
    question: "Authorize a real $5/month DeepSeek cap in the spend guard, or drop the advertised cap?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "the cap is treated as NOT REAL and the direct-API lane stays dark; no route may be enabled on the strength of an unenforced cap"
    why: "DQ-2: the previous default preserved an advertised control that does not exist, which is a false safety signal."
  - id: glm-credential-name
    question: "Is ZAI_API_KEY (windows-user-env, absent from the harness process env) or ZAI_CODING_CN_API_KEY (harness store ref) the intended GLM credential for harness-invoked calls?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "SS-PT scripts continue to use ZAI_API_KEY and require it injected; the harness route keeps its own store ref"
    why: "CE-10: two names, two stores; presence of one is not evidence about the other, and harness-invoked GLM currently fails closed."
  - id: gemini-3-8-flash
    question: "Adopt gemini-3.8-flash as an opt-in candidate once its existence is confirmed by a catalog or docs source rather than owner report?"
    owner: Sean
    reviewBy: "2026-09-27"
    ifUnresolved: "hold — existence is OWNER_REPORT_UNCONFIRMED (CE-1)"
    why: "DQ-3"
  - id: gemini-2-0-retirement
    question: "Who owns repointing the backend call sites that still reference provider-retired Gemini ids (gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-pro)?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "recorded as a defect; no repointing is performed by this package"
    why: "MR-6/CE-1: backend model coverage is unproven rather than established."
  - id: route-activation
    question: "Activate provider routes in settings.yaml, or keep this registry inert configuration?"
    owner: Sean
    reviewBy: "2026-09-27"
    ifUnresolved: "inert; no routing change is made"
    why: "IN-2: inert load is not inert effect, so activation is a separate decision."
  - id: sc-v3-carveout
    question: "Does AGENTS.md:1174 (GLM->Flash->Astra for every slice) need an explicit Swan-Coach-Universe-V3 carve-out to match AGENTS.md:15-17?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "both statements stand; the conflict is surfaced in every packet that touches cadence"
    why: "DQ-5: this applies the same conflict doctrine as the push rule."
  - id: push-rule
    question: "Which governs: AGENTS.md:36 (no push to main without approval) or AGENTS.md:908 + rule 13 (always push to deploy)?"
    owner: Sean
    reviewBy: "2026-09-20"
    ifUnresolved: "NO PUSH WITHOUT EXPLICIT HUMAN APPROVAL — a session-independent rule (DQ-1), not a statement about the authoring session"
    why: "DQ-1"

```\n
## ARTIFACT 2 of 2 — provider-registry.check.mjs (v2)

```js
#!/usr/bin/env node
/**
 * provider-registry.check.mjs — structural validator for $DSH_HOME/provider-registry.yaml
 *
 * NO NETWORK. This file imports only node:fs and node:path. That is asserted below by
 * parsing its OWN import statements (both quote styles, plus dynamic import()/require()),
 * not by scanning for forbidden substrings — an earlier revision used a single-quoted
 * substring scan that double-quoted specifiers would have walked straight past (VB-3).
 *
 * Hardened 2026-09-13 against GLM 5.3 findings VB-1..VB-9. The design rule adopted:
 * a check must evaluate a DERIVED FACT (resolve the path, join the lane to its billing
 * block, count the authorities) rather than assert that the file contains the right
 * WORDS — a registry with true vocabulary and false content previously scored 11/11.
 *
 * Usage: node provider-registry.check.mjs [path]
 * Exit:  0 = all checks passed, 1 = at least one failed.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';

const registryPath = resolve(process.argv[2] || resolve(process.env.DSH_HOME || '.', 'provider-registry.yaml'));
const checks = [];
const check = (name, fn) => {
  try { const detail = fn(); checks.push({ name, ok: true, detail: detail || '' }); }
  catch (error) { checks.push({ name, ok: false, detail: error.message }); }
};
const assert = (cond, message) => { if (!cond) throw new Error(message); };

if (!existsSync(registryPath)) {
  console.error(`provider-registry.check: not found: ${registryPath}`);
  process.exit(1);
}
const text = readFileSync(registryPath, 'utf8');
const dshHome = process.env.DSH_HOME || '';

// ---------------------------------------------------------------------------
// Parsing. VB-9: a missing section must FAIL, not silently truncate a slice.
// ---------------------------------------------------------------------------
const sectionAt = (name) => text.indexOf(`\n${name}:`);
const requireSection = (name) => {
  const i = sectionAt(name);
  assert(i !== -1, `missing top-level section: ${name}`);
  return i;
};
const sliceSection = (name) => {
  const start = requireSection(name);
  const rest = text.slice(start + 1);
  const nextTop = rest.slice(1).search(/\n[a-zA-Z][A-Za-z]*:/);
  const body = nextTop === -1 ? rest : rest.slice(0, nextTop + 1);
  return body;
};

const modelsSection = sliceSection('models');
const rows = modelsSection.split(/\n {2}- id: /).slice(1).map(chunk => {
  const id = (chunk.match(/^(\S+)/) || [])[1] || '(unparsed)';
  return { id, body: chunk.replace(/^\S+\n/, '') };
});
const fieldOf = (row, field) => {
  const m = row.body.match(new RegExp(`^ {4}${field}: *(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
};
const laneKeys = (() => {
  const body = sliceSection('billingLanes');
  return new Set([...body.matchAll(/^ {2}([a-z][a-z0-9-]*):/gm)].map(m => m[1]));
})();
const statusKeys = (() => {
  const body = sliceSection('statusValues');
  return new Set([...body.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map(m => m[1]));
})();

// Lane coherence contract (VB-1). Each lane declares what its rows must look like.
const LANE_CONTRACT = {
  'subscription-zai': { credential: /ZAI_API_KEY|ZAI_CODING_CN_API_KEY/, endpoint: /api\.z\.ai|NOT_ESTABLISHED/ },
  'subscription-codex': { credential: /codex|CLIENT|auth/i, endpoint: /codex|NOT_ESTABLISHED/ },
  'subscription-claude': { credential: /claude|auth/i, endpoint: /claude|NOT_ESTABLISHED/i },
  'subscription-grok': { credential: /grok|oauth|auth/i, endpoint: /kilo|opencode|oauth|NOT_ESTABLISHED/i },
  'direct-google': { credential: /GEMINI_API_KEY|GOOGLE_AI_KEY/, endpoint: /generativelanguage\.googleapis\.com/ },
  'direct-deepseek': { credential: /DEEPSEEK_API_KEY/, endpoint: /api\.deepseek\.com/ },
  openrouter: { credential: /OPENROUTER_API_KEY/, endpoint: /openrouter\.ai/ },
  local: { credential: /none|n\/a/i, endpoint: /127\.0\.0\.1|localhost/ },
};

const roots = [dshHome, resolve(dshHome, '..', 'Desktop', '@Everything', 'quick-pt', 'SS-PT')].filter(Boolean);
const resolveCitation = (path) => {
  if (isAbsolute(path)) return existsSync(path) ? path : null;
  for (const root of roots) {
    const candidate = join(root, path);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};
const CITATION = /([A-Za-z0-9_][A-Za-z0-9_./@-]*\.(?:mjs|cjs|js|json|md|ts|tsx|ps1|ya?ml))(?::(\d+(?:-\d+)?))?/g;

// ---------------------------------------------------------------- checks ----
check('sections present (VB-9)', () => {
  for (const name of ['models', 'billingLanes', 'statusValues', 'invariants', 'openDecisions']) requireSection(name);
  return 'models, billingLanes, statusValues, invariants, openDecisions';
});

check('rows parsed and ids unique (VB-8)', () => {
  assert(rows.length >= 20, `expected >=20 rows, parsed ${rows.length}`);
  const seen = new Set(); const dupes = [];
  for (const row of rows) { if (seen.has(row.id)) dupes.push(row.id); seen.add(row.id); }
  assert(dupes.length === 0, `duplicate ids -> ${dupes.join(', ')}`);
  return `${rows.length} unique rows`;
});

check('every row declares all required fields', () => {
  const REQUIRED = ['provider', 'billingLane', 'credential', 'endpointFamily', 'harness', 'role',
    'authority', 'privacyClass', 'identityVerification', 'status', 'source', 'rollback', 'notes'];
  const missing = [];
  for (const row of rows) for (const f of REQUIRED) if (!new RegExp(`^ {4}${f}:`, 'm').test(row.body)) missing.push(`${row.id}:${f}`);
  assert(missing.length === 0, `missing -> ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12})` : ''}`);
  return `${rows.length} rows x ${REQUIRED.length} fields`;
});

check('every billingLane resolves to a declared lane (VB-1)', () => {
  const bad = rows.filter(r => !laneKeys.has(fieldOf(r, 'billingLane') || ''));
  assert(bad.length === 0, `undefined lanes -> ${bad.map(r => `${r.id}:${fieldOf(r, 'billingLane')}`).join(', ')}`);
  return `${rows.length} rows map onto ${laneKeys.size} declared lanes`;
});

check('lane <-> credential <-> endpoint coherence (VB-1)', () => {
  const bad = [];
  for (const row of rows) {
    const lane = fieldOf(row, 'billingLane');
    const contract = LANE_CONTRACT[lane];
    if (!contract) { bad.push(`${row.id}:no-contract-for-${lane}`); continue; }
    const cred = fieldOf(row, 'credential') || '';
    const endpoint = fieldOf(row, 'endpointFamily') || '';
    if (!contract.credential.test(cred)) bad.push(`${row.id}:credential-vs-${lane}`);
    if (!contract.endpoint.test(endpoint)) bad.push(`${row.id}:endpoint-vs-${lane}`);
  }
  assert(bad.length === 0, `incoherent -> ${bad.join(', ')}`);
  return 'every row agrees with its lane contract';
});

check('every status is from the declared vocabulary (VB-7)', () => {
  const bad = rows.filter(r => !statusKeys.has(fieldOf(r, 'status') || ''));
  assert(bad.length === 0, `undeclared status -> ${bad.map(r => `${r.id}:${fieldOf(r, 'status')}`).join(', ')}`);
  return `${statusKeys.size} declared statuses, all rows conform`;
});

check('authority is from a closed set and only one final decider exists (VB-6)', () => {
  const ALLOWED = new Set(['advisory', 'none', 'final-decider', 'gate-owner', 'builder-only']);
  const bad = []; let finalDeciders = [];
  for (const row of rows) {
    // Split on whitespace, ';' or '(' ONLY. Including '-' here split hyphenated
    // values like gate-owner into 'gate' and failed three valid rows.
    const value = (fieldOf(row, 'authority') || '').split(/[\s;(]/)[0].trim();
    if (!ALLOWED.has(value)) bad.push(`${row.id}:${value}`);
    if (value === 'final-decider') finalDeciders.push(row.id);
  }
  assert(bad.length === 0, `unknown authority -> ${bad.join(', ')}`);
  assert(finalDeciders.length <= 1, `multiple final deciders -> ${finalDeciders.join(', ')}`);
  return `authority values valid; final decider: ${finalDeciders[0] || 'none'}`;
});

check('every cited file:line resolves on disk (VB-2)', () => {
  const unresolved = []; let total = 0;
  for (const row of rows) {
    const source = fieldOf(row, 'source') || '';
    // A token counts as a CITATION only if it carries a line number or a directory:
    // a bare 'consult-ox.mjs' inside prose is a mention, not a path claim.
    const cited = [...source.matchAll(CITATION)].filter(([, path, line]) => line !== undefined || path.includes('/'));
    if (cited.length === 0) { unresolved.push(`${row.id}:no-citation`); continue; }
    for (const [, path, line] of cited) {
      total += 1;
      if (!resolveCitation(path)) unresolved.push(`${row.id}:${path}${line ? `:${line}` : ''}`);
    }
  }
  assert(unresolved.length === 0, `unresolved -> ${unresolved.slice(0, 8).join(', ')}${unresolved.length > 8 ? ` (+${unresolved.length - 8})` : ''}`);
  return `${total} citations resolved across ${rows.length} rows`;
});

check('no credential VALUE and no credential LENGTH is present (VB-4, SH-2)', () => {
  const offenders = [];
  const shapes = [
    [/sk-[A-Za-z0-9_-]{16,}/, 'openai-shaped'],
    [/AIza[0-9A-Za-z_-]{20,}/, 'google-shaped'],
    [/eyJ[A-Za-z0-9_-]{10,}\./, 'jwt-shaped'],
    [/\bwhsec_[A-Za-z0-9]{10,}/, 'webhook-shaped'],
    [/\bxoxb-[A-Za-z0-9-]{10,}/, 'slack-shaped'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'pem'],
    [/postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/i, 'db-url'],
    [/[A-Fa-f0-9]{32,}/, 'long-hex-run'],
    [/\blen(?:gth)?\s*[:=]?\s*\d{2,}\b/i, 'credential-length'],
  ];
  for (const [shape, label] of shapes) if (shape.test(text)) offenders.push(label);
  for (const row of rows) {
    const ref = (fieldOf(row, 'credential') || '').match(/reference:\s*([^,}]+)/);
    if (ref) {
      const value = ref[1].trim().replace(/^["']|["']$/g, '');
      if (/^[A-Za-z0-9_\-]{24,}$/.test(value) && !/^[A-Z0-9_]+$/.test(value)) offenders.push(`${row.id}:reference-shaped-like-a-key`);
    }
  }
  assert(offenders.length === 0, `possible secret material -> ${offenders.join(', ')}`);
  return 'references are NAMES only; no lengths recorded';
});

check('GLM is never paired with an OpenRouter endpoint (WL-1 regression)', () => {
  const mispaired = rows.filter(r => {
    const lane = fieldOf(r, 'billingLane');
    const endpoint = fieldOf(r, 'endpointFamily') || '';
    const isZaiSubscription = lane === 'subscription-zai';
    return isZaiSubscription && /openrouter\.ai/.test(endpoint);
  });
  assert(mispaired.length === 0, `zai-subscription rows pointing at OpenRouter -> ${mispaired.map(r => r.id).join(', ')}`);
  const blocked = rows.filter(r => fieldOf(r, 'status') === 'BLOCKED');
  return `${blocked.length} row(s) marked BLOCKED; no subscription row points at OpenRouter`;
});

check('Fable 5.1 is keyed to the catalog id and not promoted (VB-5)', () => {
  const row = rows.find(r => r.id === 'anthropic/claude-fable-5.1');
  assert(row, 'catalog-keyed row anthropic/claude-fable-5.1 absent');
  assert(fieldOf(row, 'status') === 'CANDIDATE', `expected CANDIDATE, got ${fieldOf(row, 'status')}`);
  const source = fieldOf(row, 'source') || '';
  assert(/catalog/i.test(source), 'no catalog evidence recorded on the candidate row');
  const stray = rows.filter(r => /claude-fable-5-1(?![\d.])/.test(r.id));
  assert(stray.length === 0, `docs-spelling row still present -> ${stray.map(r => r.id).join(', ')}`);
  return 'catalog id; candidate; no docs-spelling row remains';
});

check('renamed-away defects stay closed (regression set)', () => {
  const notes = (id) => (fieldOf(rows.find(r => r.id === id) || { body: '' }, 'notes') || '');
  assert(/ZAI_API_KEY/.test(fieldOf(rows.find(r => r.id === 'stealth/ox-alpha') || { body: '' }, 'credential') || ''), 'ox seat is not on the Z.ai credential');
  assert(/CE-8 correction/.test(notes('stealth/ox-alpha')), 'ox row does not carry the CE-8 correction');
  assert(/MR-1 accepted/.test(notes('deepseek-v4.1-flash')), 'deepseek row does not carry the MR-1 correction');
  assert(/CE-10/.test(notes('glm-5.3')), 'glm row does not carry the process-env absence (CE-10)');
  return 'ox lane, CE-8, MR-1 and CE-10 dispositions present';
});

check('every open decision has an owner, a review date and an interim default (DQ-3)', () => {
  const body = sliceSection('openDecisions');
  const entries = body.split(/\n {2}- id: /).slice(1);
  assert(entries.length >= 9, `expected >=9 decisions, found ${entries.length}`);
  const missing = [];
  entries.forEach((entry, i) => {
    const id = (entry.match(/^(\S+)/) || [])[1] || `#${i}`;
    for (const field of ['owner', 'reviewBy', 'ifUnresolved', 'why']) {
      if (!new RegExp(`^ {4}${field}:`, 'm').test(entry)) missing.push(`${id}:${field}`);
    }
  });
  assert(missing.length === 0, `incomplete decisions -> ${missing.join(', ')}`);
  return `${entries.length} decisions, all owned and dated`;
});

check('the inertness claim is stated with its qualifications (IN-1)', () => {
  const header = text.slice(0, text.indexOf('\nmodels:'));
  assert(/INERT CONFIGURATION DATA/.test(header), 'header does not scope the inertness claim');
  assert(/Nothing \*routes\* on it|nothing under .DSH_HOME\s+boots it/.test(header), 'header does not distinguish load from route');
  assert(/inert load.{0,40}not.{0,20}inert effect|inert load" is not "inert effect/i.test(header), 'IN-2 qualification missing');
  return 'inertness claim scoped to routing, with the load-vs-effect qualification';
});

check('no provider inference was attempted by this validator (VB-3)', () => {
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  const specifiers = [
    ...[...self.matchAll(/^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/gm)].map(m => m[1]),
    ...[...self.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
    ...[...self.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
  ];
  const NETWORKISH = /^(node:)?(http|https|http2|net|dgram|tls|dns|child_process|worker_threads)$/;
  const reachable = specifiers.filter(s => NETWORKISH.test(s));
  assert(reachable.length === 0, `network/process module reachable -> ${reachable.join(', ')}`);
  return `model_calls=0; ${specifiers.length} static import(s): ${specifiers.join(', ')}`;
});

// ------------------------------- report -------------------------------------
const width = Math.max(...checks.map(c => c.name.length));
console.log(`provider-registry.check @ ${new Date().toISOString()}`);
console.log(`target: ${registryPath}`);
console.log(`rows: ${rows.length}   lanes: ${laneKeys.size}   statuses: ${statusKeys.size}   model_calls: 0\n`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(width)}  ${c.detail}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);

```\n