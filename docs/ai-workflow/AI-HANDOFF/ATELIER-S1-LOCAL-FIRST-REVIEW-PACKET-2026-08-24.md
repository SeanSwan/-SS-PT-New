---
decision: Invert S1 Compose to local-first ($0 on the 5090) and wire the Swan taste brain into the Atelier lane — hostile review + enhancement pass
status: open
supersedes: none
---

# Atelier S1 — LOCAL-FIRST inversion + taste-brain tie-in · HOSTILE REVIEW PACKET

**Author:** Fable 5 (Final Decider — does not vote) · 2026-08-24
**Seats:** Ox Alpha, GLM-5.3, Qwen (standing free seat). Retries authorized on seat failure.
**Remit:** hostile review of shipped code + the two proposals below, PLUS an explicit enhancement remit: name the missing logic/features this studio should have and doesn't. Rank by value. Do not restate ground truth back to me.

---

## §1 — SEAN'S DIRECTIVE (this supersedes part of the shipped S1)

1. **"We are using my 5090… I planned on using MiniMax H3… so it could be free."** The Still rung I shipped routes through OpenRouter (hosted, billed, $0.0039/image, OFF until a budget is set). Sean wants generation **based on the local 5090 at $0**. Hosted must demote to explicit opt-in fallback, not default.
2. **"I did create a prompt maker tied into the Midjourney brain, the Swan Brain… make sure that is actually tied into the Comfy too."** Verify + wire the taste brain into the Atelier lane, in whatever shape is best.
3. Hostile review the shipped S1 (commit `383c218e9`) and name enhancements/missing features.

## §2 — GROUND TRUTH `[VERIFIED this session]`

### 2.1 The shipped S1 (all tests green, 30/30 + 110 siblings)

- `backend/services/atelier/composeStills.mjs` (294 ln) — gates: empty-brief → provider-verify → price-known → ledger → run-cap → spend-ceiling → compile → idempotency (process-local store, derived seeds, 60s bucket). Batch honesty: 207 partial, per-image failures, charged-vs-total split. **Hosted-only**: generator = `openrouterImage.generate`, prices hardcoded `{'openai/gpt-5.4-image-2': 0.0039}`, `SWAN_ATELIER_MAX_SPEND_USD_DAILY` defaults $0 (lane OFF).
- `backend/routes/atelierComposeRoutes.mjs` (189 ln) — `POST /api/atelier/compose/{estimate,stills}`, `GET /limits`, all `protect, adminOnly`. STATUS map: 402/429/409/503/207. No Motion endpoint (deliberate — approval must bind an asset id+hash; no asset store exists yet).

### 2.2 The two prompt brains

- **`shared/swanPromptCompiler.mjs`** — slot-based (`resolveSlots` → intent defaults, surface rules, facets, personify), law filter (`assertLawful`), serializes per provider capability. Consumed by composeStills, openrouterImage, forge scripts.
- **Swan taste brain** (separate repo `swan-taste-brain`): a local HTTP server (`node prompter/serve.mjs` → `127.0.0.1:7331`), endpoint `GET /api/prompt?n=&mode=taste|surprise&ar=&cinematic=1&seed=`. Returns `{prompts:[{prompt}...], seed}`. Feeds on Sean's rated taste files + the Midjourney archive. **Already inside ComfyUI** as custom node `Swan/SwanPrompt` (a pointer stub at `C:/ComfyUI/custom_nodes/swan_prompt/__init__.py` importing from the taste-brain repo — one implementation, no drift copy). Node inputs: mode/aspect/count/index/cinematic_only/seed/endpoint; outputs `(prompt, batch, seed)`. Fails LOUD into the output string when the server is down. Server binds localhost, unauthenticated by design (it can WRITE taste files).
- **These two systems share nothing today.** The Atelier lane cannot reach the taste brain; the taste brain cannot reach the law filter.

### 2.3 The local video lane (what "free" actually looks like)

- `shared/providers/video/catalogue.mjs`: `comfyui/wan-2.2` — **Apache 2.0, commercial permitted, no grant needed, `costPerRunUsd: 0`, PROBED on this 5090**: 832x480x49f, 20 steps, **26.73s wall, 25,385 MiB peak VRAM**. `comfyui/minimax-h3` — `costPerRunUsd: 0`, but licence `requires-grant` for **commercial** execution in US (grant drafted, unsent); non-commercial local runs need nothing. `minimax/hailuo-hosted` — the fallback peer, `costPerRunUsd: null`.
- `comfyuiLocal.mjs` adapter: graph is an operator-supplied input (API format), per-provider env bindings (`SWAN_COMFYUI_WORKFLOW_<SFX>`, `SWAN_COMFYUI_NODE_{PROMPT,IMAGE,DURATION,SEED}_<SFX>`), fail-closed on missing bindings. Proven: first render ever was Wan 2.2 with zero adapter change.
- Both local providers declare `kind: ['text2video','image2video']` — **no text2image kind exists in the catalogue.** ComfyUI itself can run image graphs, and Wan-class TI2V models can emit single frames, but nothing has probed a still path locally. `custom_nodes` installed: only `swan_prompt` + websocket save — no SD/Flux checkpoints known.
- Existing workflow graphs on main: `minimax_h3_t2v_api.json`, `minimax_h3_firstframe_api.json`.
- MCP facts (probed this session): 39 tools, no per-tool disable; `stop_comfyui` ungated on comfy-cli-recorded pids; deny-list must include `restart_comfyui` (it composes stop+launch).

## §3 — PROPOSALS UNDER REVIEW (attack these)

**P-A — Invert to local-first.** `composeStills` gains a provider abstraction with two lanes: `local` (ComfyUI via the existing `comfyuiLocal` adapter + an operator-supplied **still graph**, `costPerRunUsd: 0`, volume cap only, no spend ceiling — mirroring spendGuard's free-local branch) and `hosted` (the shipped OpenRouter path, stays budget-gated OFF by default). Default route = local when the ComfyUI server answers `/system_stats`; hosted only on explicit request. The still graph is Wan 2.2 emitting a single frame (or lowest-frame-count run) — **capability marked `claimed` until probed**, per tri-state honesty; first probe records real wall time and VRAM. H3 stays the motion-test target (non-commercial until grant); **Wan 2.2 remains the commercial-safe default** and the packet must not blur that.

**P-B — Taste brain becomes a prompt SOURCE for Compose.** `composeStills` gains `promptSource: 'brief' | 'taste'`. `taste` fetches `127.0.0.1:7331/api/prompt` (n=count, ar=aspect, seed), then **feeds each returned prompt through the law filter** (`assertLawful`) before dispatch — taste supplies the creativity, the compiler stays the compliance gate. Fail-closed: server down → `E_TASTE_UNREACHABLE`, never a silent fallback to the plain brief. The ComfyUI-GUI path (SwanPrompt node inside a graph) remains for hand-driven work; the Atelier path is for the ladder. Both hit the same server — one generator, one taste corpus, per the node's own design doctrine.

**P-C — What else?** Absence-first enhancement remit: given §2, what should this studio have that neither the shipped S1 nor P-A/P-B provides? (Candidates I already suspect: asset persistence into `MediaAsset` with provenance+graphHash; a still→motion bind flow; taste feedback loop — keep/reject writes back to the taste brain's rating store; VRAM-aware admission; batch matrix.) Rank by value; kill anything speculative.

## §4 — QUESTIONS (answer these, adversarially)

1. **P-A's still path**: is single-frame-from-a-video-model the right local still, or is that a quality trap that sends Sean back to hosted? What's the honest probe protocol before the UI advertises it?
2. **P-B's boundary**: the taste server is unauthenticated-by-design and can WRITE taste files. The Atelier backend calling it — any hazard worth a control? And is law-filter-after-taste correct, or does filtering a taste prompt destroy what makes it a taste prompt?
3. **The shipped gates** (§2.1): break them. Race, replay, unicode brief, count boundary, header abuse, error-map hole — anything the 30 tests missed.
4. **Enhancements** (P-C): rank the missing features by value to a solo operator producing site assets weekly. Name what I listed that is NOT worth building yet.
5. **The one thing most likely to kill the local-first inversion.** One paragraph.

**Constraints:** styled-components only; Crystalline Swan tokens; 44px; 300-line cap; zero PII to LLMs; fail-closed licence/spend gates; three-function provider contract reused, never reinvented; tri-state capability honesty (`claimed` until probed); Wan 2.2 = commercial-safe default, H3 non-commercial until grant.
