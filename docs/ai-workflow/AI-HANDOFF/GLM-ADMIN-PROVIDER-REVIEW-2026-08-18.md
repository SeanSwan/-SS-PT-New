# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/ADMIN-PROVIDER-CHOICE-LOCAL-QWEN-DESIGN-2026-08-18.md
**Tokens:** 1773 in / 11130 out (reasoning: 8799) | total 12903
**Wall:** 160.2s

---

## Verdicts up front

- **Architecture: C is the target shape, but ship the first slice looking like B.** "Local" should be a distinct *mode*, not a fifth member of the provider chain. B as you've framed it is not stable — it becomes C the moment Sean wants his preference on a second browser.
- **Your three best-sounding claims for B are overstated:** "strongest privacy result available," "fails safe, locally and visibly," and "no inbound exposure." Details in Q2.
- **The silent-fallback concern is right in substance, over-engineered in one clause.** Split it three ways (Q4).
- **The cost reframing is correct**, with one real exception you didn't list (Q3).

---

## 1. A, B, or C — and what you got wrong about B

**C's shape, B's first slice.** But the decisive question is one your doc never answers: **does admin chat currently ground in platform data?** If the backend assembles context — client records, program history, adherence data — into the prompt, then B delivers a chatbox that can't see the platform, which is not what "when I do my work as an admin" means. If admin chat is context-free Q&A today, B is fine and cheap. Everything downstream forks on this, and you should verify it before choosing, not after.

What you got wrong about B specifically: you treat it as the stable endpoint. It isn't. B has no home for the preference — it's localStorage — so "Sean selects his provider" silently degrades to "Sean selects his provider on one machine in one browser." Your own con list already concedes this ("may be precisely the scope"), but the honest reading is that B is C with the persistence deferred, so design for C now and slice B.

Where you're too hard on A: "an unauthenticated tunnel is an open LLM proxy" is true but it's arguing against a design nobody would ship — you already run Cloudflare Tunnel for PLAUD; front Ollama with Cloudflare Access (service token) and the exposure is one API behind auth, not "an inbound path to Sean's home machine." The *real* killers for A are (a) your fallback's availability is "is the desktop awake / did Windows update reboot it," which is a terrible property for the thing whose job is to catch Gemini failing, and (b) "bound to the Render egress" is harder than you imply — Render egress IPs aren't static; you want the Access token or mTLS, not an IP allowlist.

## 2. What actually breaks in B

This is the list you asked to have dug out. Eight concrete losses:

1. **Persistence and history.** Server-side chat storage never sees local messages. No history, no cross-device continuity, threads break at provider boundaries. Fixing it means POSTing transcripts back to the backend — which reinstates the exact data flow B exists to avoid.
2. **Your own requirement #3 becomes unenforceable.** "The response must state which provider actually answered" — the server can't stamp or audit messages it never sees. For a platform with WA/NV health-data exposure, "admin AI interactions with client data leave zero server-side trace" is a compliance liability, not the privacy win you're claiming.
3. **Moderation is lost twice.** Server-side moderation is bypassed *and* local Qwen has no vendor safety layer (your own Q6 point, which you never connect back to B). Local + browser-direct is the only configuration with **zero guardrails on health-data conversations**.
4. **Context assembly / grounding** — the big one, per Q1. Either the local model gets no platform context, or the frontend fetches client data via API and builds prompts in-tab — putting client health data into the DOM/JS heap where any XSS reads it. That's what kills "strongest privacy result available": you removed the third-party processor and added first-party client-side exposure in exchange.
5. **Tool dispatch.** If chat can act (adjust a program, run a report), those tools execute server-side with authz. In B: either no tools, or a browser-resident tool loop calling admin endpoints, driven by an unmoderated local model. The second option is a *worse* security surface than A's authenticated tunnel.
6. **Usage telemetry.** The provider chain meters per call; local calls are invisible. You can't measure what Sean saved (the whole stated premise), can't debug, can't cap.
7. **Transport fork.** The backend normalizes Gemini/OpenAI/Anthropic/Venice and streams SSE; Ollama streams NDJSON. The frontend re-implements a client, adapter, prompt templating, context truncation, and retry policy for exactly one provider. This is where behaviour silently diverges — the same objection you raise against C, except undocumented.
8. **"No inbound exposure" is only true of the LAN.** Setting `OLLAMA_ORIGINS` opens browser-borne exposure: a POST with `Content-Type: text/plain` is a CORS-simple request — no preflight, it executes even with restrictive origins (Ollama doesn't enforce content-type), so any tab in Sean's browser can drive his GPU or hit `/api/pull`; with `*` they can read responses too. And any XSS in your own frontend now reaches a local inference endpoint. Restrict origins to the exact app origin, keep bound to 127.0.0.1, and say so in the setup docs.

Also: "fails safe: fails locally and visibly" — visible to Sean, invisible to logs, and the 11pm temptation is a frontend retry-into-the-backend-Gemini-endpoint. That's silent fallback rebuilt client-side where no server log can catch it. Your #2 concern doesn't disappear under B; it migrates to the least auditable layer.

Finally, admin-gating is decorative in B — the "local" flag is a localStorage bit anyone can set. Harmless to others (it's their own localhost), but don't claim role enforcement you don't have.

## 3. The cost reframing

Correct, and you should hold the line. Sean's own chat is the smallest term. The one real argument you're missing: **dev/eval iteration.** Running prompt experiments, regression loops, and feature development against a local model instead of Gemini is a genuine token saving — that's the legitimate cost story for admin-local, and it's worth saying to Sean because it's true. Bulk admin/trainer operations are only the spend driver if bulk-generation features exist — grep for them; if they do, they run server-side anyway, which B doesn't help and A would. The real levers are the ones you listed (per-tier quotas, cheap-model routing, caching, context caps, spend ceiling) — separate ticket, and note that B's telemetry loss (Q2.6) means you can't even measure savings.

## 4. Silent fallback — right or over-engineering?

**Right in substance; one clause is over-engineered.** Split it three ways:

- **Provider stamp visible on every message, all providers: mandatory and cheap.** ~20 lines through the response envelope. This is your requirement #3 and it's correct.
- **Never auto-cross the local→cloud boundary: mandatory, and not hypothetical.** The existing chain selects by key-presence priority — silent continuation *is the default implementation path*. Whoever wires Ollama in will follow the venice pattern and get silent fallback for free. Make `local` a terminal selection: if it errors, it errors. This is the version of your finding I'd fight for.
- **"Arguably opt-in per message": over-engineering.** For one admin, a session-level toggle plus a visible badge does the job. But note *why* the one-admin objection is fragile: the moment a second user or a bulk job touches the chain, "it's just Sean" stops being true, and the stamp is the only thing that survives that transition — which is another reason to ship stamps now, not the per-message ceremony.

## 5. Smallest first slice

1. **Provider stamp** on every AI response, rendered in the UI — all providers, backend one-field change. Unlocks audit under any architecture.
2. **Fix SWA-107's allowlist** (enum, admin-only override) — prerequisite; adding a provider before this compounds the gap, as you said.
3. **"Local Mode" toggle in admin chat:** localStorage flag, direct fetch to `127.0.0.1:11434`, NDJSON adapter, hard-labeled *"Local — not logged, not moderated, no platform context,"* explicit error with `OLLAMA_ORIGINS` instructions when down, terminal failure, ephemeral transcript (never persisted — see Q6).
4. **Defer** the `AdminSettings` field and any tunnel. Exit criterion: Sean asking for history, platform context, or phone access is the vote for C/A — build it then, with requirements you'll actually know.

## 6. Local model + client health data

- **Licensing:** Qwen2.5/Qwen3 weights are generally Apache-2.0 (commercial use fine), but the Ollama registry tag is not a license guarantee — earlier Qwen releases were non-commercial. Verify the model card for the exact tag you pull.
- **Provenance:** the Ollama registry has tag-squatting/impersonation history. Pin by digest; prefer official library images over third-party quants.
- **No vendor safety layer** is a bigger deal than you treat it: a local model will produce confident, unrebutted medical-adjacent advice about a named client. Your platform moderation is the only guardrail — and per Q2.3, option B removes that too. Put your own constraints in the system prompt of the adapter, at minimum, and make the zero-guardrail state a conscious, labeled decision.
- **WA (MHMD) / NV:** going local removes the third-party *sharing* problem but not your regulated-entity obligations — consent at collection still applies. And processing consumer health data on a personal desktop drags that machine into your processing surface: laptop theft is now breach-scope. The cheap mitigation is structural: **never persist local transcripts** — ephemeral, in-tab, gone on close. The moment you add local history, you've created an unencrypted DSR target with no tooling.
- **Habit risk:** a "safe" local channel trains paste-client-data-into-chat muscle memory; a mislabeled toggle then leaks. The distinct visual mode + provider stamp is the mitigation — another reason both ship in slice one.

**Bottom line on B:** it's acceptable as a scoped, labeled *mode* — a free, private, ungrounded scratchpad. It is not acceptable as "just another provider," and every claim you made that it's the privacy-optimal *architecture* rather than the privacy-optimal *scratchpad* is where you're wrong.
