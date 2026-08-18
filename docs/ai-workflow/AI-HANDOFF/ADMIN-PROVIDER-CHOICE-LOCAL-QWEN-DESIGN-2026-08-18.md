---
title: "Admin-selectable AI provider + local Qwen on the 5090 — design for hostile review"
date: 2026-08-18
author: Claude Fable 5 (vs-claude)
decision: PENDING — architecture choice (A/B/C) and whether the cost premise holds
status: draft
privacy: "No secrets, no key values, no client data. Env var NAMES and endpoints only."
linear: SWA-107 (adjacent — same provider-chain surface)
---

# What Sean asked for

1. Add **local Qwen 3.8 on his desktop 5090** as a chat provider — a fallback if Gemini fails or
   "starts acting funny."
2. **As administrator, choose his own provider.** Everyone else defaults to Gemini; Sean runs on
   his own GPU for admin work.
3. Stated motivation: **cost control as he onboards users** — "how people who use the site can
   utilize the AI, but it's not gonna cost me crazy."

Reviewers: attack all three. The third is the one I think is misframed.

# Ground truth, verified today

| Claim | Evidence |
|---|---|
| The SwanStudios **backend has no local/Ollama provider** | `grep -rln "ollama\|qwen"` across `backend/services` + `backend/routes` → **zero hits**. Net-new. |
| `scripts/consult-qwen.mjs` is **dev tooling, not a production path** | Defaults to `--endpoint http://127.0.0.1:11434` (line 30) — localhost only |
| Production backend runs on **Render**, not Sean's machine | Render auto-deploys `main`; the 5090 is a home desktop |
| The provider chain has **no allowlist and no per-user selection** | `aiChatService.getAvailableProviders()` pushes gemini / openai / anthropic / venice purely on env-key presence, fixed priority |
| No provider-preference field exists | No `aiProvider` / `preferredProvider` anywhere in `backend/`. `AdminSettings.mjs` exists as a possible home |

**The load-bearing consequence: Render cannot reach `127.0.0.1:11434` on a home desktop.** Any
server-side design needs a tunnel. That is the crux of the architecture choice.

# Three architectures

## A — Server-side provider (Render → tunnel → 5090)

Backend gains an `ollama` provider whose base URL is a tunnel (Cloudflare Tunnel is already used
for PLAUD, so the pattern exists in-house).

- ✅ Works from any device, anywhere, including Sean's phone
- ✅ Same code path as every other provider — one place to reason about
- ❌ Creates an **inbound path to Sean's home machine** from a cloud service
- ❌ Desktop asleep / rebooting / Ollama not running = admin chat degrades
- ❌ Tunnel needs its own auth; an unauthenticated tunnel is an open LLM proxy on a home LAN
- ❌ Client data now travels **Render → home** — a new data flow to document, not fewer

## B — Browser-side direct (Sean's browser → `127.0.0.1:11434`)

The frontend, when Sean selects "Local (my GPU)", calls Ollama directly from his browser. The
backend is not in the loop for those messages.

- ✅ **No tunnel, no inbound exposure, no Render dependency**
- ✅ **Strongest privacy result available:** client data never leaves his machine — no third-party
  processor at all, which is exactly the WA/NV exposure the current workstream is about
- ✅ Fails safe: if Ollama is not running, the call fails locally and visibly
- ❌ Only works at that desk, in that browser (Sean said "when I do my work as an admin" — this may
  be precisely the scope)
- ❌ Needs `OLLAMA_ORIGINS` set so the browser may call it; that is a real local-CORS decision
- ❌ Server-side features that post-process AI output (logging, moderation, tool dispatch) would be
  bypassed unless deliberately re-added — **this is the biggest hidden cost and reviewers should
  dig here**

## C — Hybrid

Preference stored server-side on `AdminSettings`; the value `local` is *resolved in the browser*,
every other value resolves server-side.

- ✅ One preference concept, correct execution per provider
- ❌ Two execution paths for one feature — the classic place behaviour silently diverges

**My leaning: B, possibly growing into C.** Sean's framing is desk-bound admin work, and B removes
the entire tunnel/exposure/uptime problem rather than managing it. Attack this.

# The premise I think is wrong

Sean framed this as **cost control for onboarding users**. Moving *his own admin traffic* to a
local GPU does not reduce what *clients* cost. He is the smallest consumer of his own API budget;
onboarded users are the growth term.

If the real goal is "AI stays affordable as users arrive," the levers are different: per-tier rate
limits and quotas, cheaper models for cheap tasks, response caching, capping context size, and
degrading gracefully at a spend ceiling. Those are a separate piece of work.

**This design is still worth doing** — for provider resilience, for independence from Gemini's
behaviour, and above all as a privacy win. But it should not be sold to Sean as the fix for client
AI cost, because it is not.

Reviewers: is that reading correct, or is there a cost argument I am missing (e.g. admin//trainer
bulk operations being the actual spend driver)?

# Security concerns I have already identified

1. **A user-chosen provider is a user-chosen outbound destination.** If the preference is ever a
   free-text base URL, that is SSRF. It must be an **enum resolved server-side against a fixed
   allowlist**, never a URL from the client, and only `role === 'admin'` may set a non-default.
2. **Silent fallback is a privacy failure, not a convenience.** If "local" quietly falls back to
   Gemini when Ollama is down, Sean believes client data stayed on his GPU while it went to a third
   party. Any fallback must be **explicit and visible in the response**, and arguably should be
   *opt-in per message* rather than automatic. This is the finding I care most about.
3. **The response must state which provider actually answered.** Without it there is no way to
   audit where any given conversation went.
4. **The existing chain has no allowlist** (see SWA-107): setting any key silently enrols a vendor.
   Adding a provider without fixing that compounds an existing governance gap.
5. If A is chosen: the tunnel must be authenticated, bound to the Render egress, and killable.

# VERIFIED AFTER DRAFTING — this falsifies my preference for B

GLM's first challenge was that my doc never establishes whether admin chat grounds in platform
data, and that everything forks on it. It was right to ask, and the answer kills my leaning.

| Question | Answer | Evidence |
|---|---|---|
| Does chat carry client data? | **Yes, and it is health data** | `aiChatService.mjs:42` reads `client.availableSessions`; the system prompt instructs collection of `firstName`, `lastName`, and `healthConcerns (injuries, surgeries, chronic conditions, medications, limitations — be thorough)` (`:688`, `:872`) |
| Is chat persisted server-side? | **Yes** | `models/AiConversation.mjs` |
| Does chat drive real actions? | **Yes** | Model emits `coach_action_proposal` (`:720`) and `frontend_dispatch` events — `AI_ADD_EXERCISE`, `AI_LOAD_TEMPLATE`, `AI_TOGGLE_NASM_ITEM` |
| Who builds the prompt? | The route, not the service | `aiChatRoutes.mjs:728` calls `buildPromptMessages(systemPrompt, …)` |

**So admin chat is a client-onboarding and health-intake surface**, not general Q&A. Consequences:

- My claim that B is "the strongest privacy result available" is **wrong**. B removes a third-party
  processor but pulls client health data into the browser heap, and drops `AiConversation`
  persistence — meaning admin health-data conversations would leave **zero server-side trace**.
  That is a compliance liability under exactly the WA/NV regime this workstream exists to address.
- One nuance that cuts *against* GLM: tool dispatch is **already client-executed** via
  `frontend_dispatch`, so B does not "lose tools." The real risk is worse and different — an
  **unmoderated local model would emit `coach_action_proposal` payloads containing client health
  fields**, with no server in the loop to validate them.

**Revised position: B is viable only as a clearly-labeled, ungrounded, unpersisted scratchpad —
never as a provider inside the existing chat.** Reviewers should now attack *that* claim.

# Questions for the panel

1. **A, B, or C** — and what did I get wrong about the one I favour?
2. What breaks in B that I have not listed? Specifically: what server-side behaviour sits between
   the chat endpoint and the model that would be lost by going direct from the browser?
3. Is the cost reframing correct, or is there a real cost argument for admin-local?
4. Is "explicit, visible, non-silent fallback" the right call, or is it over-engineering for a
   one-admin system?
5. What is the smallest first slice that delivers real value without locking in the wrong shape?
6. Anything about running a local model against **client health data** that changes the analysis —
   licensing, model provenance, or the fact that a local model's outputs are unreviewed by any
   vendor safety layer?
