# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-S1-LOCAL-FIRST-REVIEW-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 2704 in / 4378 out · **Cost:** ~$0.0000 · **Wall:** 167.3s · **finish:** stop

---

## VERDICT

REVISE — P-A and P-B are directionally correct and the tri-state honesty discipline is right, but the packet ships a "local-first stills" capability that has no probed local generator behind it, routes personal taste-corpus prompts into a paid third-party LLM on the hosted fallback (zero-PII violation), and the proposed changes physically cannot fit inside `composeStills.mjs` under the 300-line cap.

## BLOCKERS

1. **P1 — Zero-PII-to-LLMs violation baked into the hosted fallback path.** The taste brain "feeds on Sean's rated taste files + the Midjourney archive." Those prompts encode a private individual's aesthetic history. P-B wires taste output directly into dispatch; on the hosted lane (`openrouterImage.generate`, §2.1) that corpus-derived text goes to OpenAI/OpenRouter. Constraint list says "zero PII to LLMs (IDs only)." Scenario: `promptSource:'taste'`, ComfyUI down or operator explicitly requests hosted → archive-derived prompt transmitted to third party. Evidence: §3 P-B (no scrubbing/redaction step specified), §2.1 hosted lane unchanged. Fix: taste-source requests are pinned to the local lane only, or pass through a redaction/allowlist stage before any hosted dispatch.

2. **P1 — House-rule line-cap violation is structurally guaranteed.** `composeStills.mjs` is already 294 ln against a hard ≤300 cap (§2.1). P-A adds a provider abstraction with two lanes; P-B adds a second prompt source, a fetch, and a fail-closed error path. There is no way both fit in 6 lines. The proposal as written forces either a rule breach or an unplanned mid-review refactor. Evidence: §2.1 file size vs. §3 P-A/P-B scope. Fix: specify the split now — e.g., `atelier/providerLanes.mjs`, `atelier/promptSources.mjs` — and review those files, not a mutated monolith.

3. **P1 — "Local-first stills" advertises a capability nothing backs.** Catalogue declares `kind: ['text2video','image2video']` — "no text2image kind exists"; no SD/Flux checkpoints installed; custom_nodes contains only `swan_prompt` + websocket save (§2.3). P-A's still path is therefore "Wan 2.2 emitting a single frame," marked `claimed`. If this merges and the UI reads `GET /limits`, the product claims local stills that have never produced one acceptable frame. Evidence: §2.3 bullet 4, §3 P-A. Fix: block merge on the probe (see HIGHEST RISK), keep `claimed` out of `/limits` responses or label it machine-readably as non-advertisable.

4. **P2 — Idempotency store is process-local; the spend ceiling inherits the hole.** §2.1: "idempotency (process-local store…60s bucket)." Under PM2 cluster mode, a second worker, or a restart, the same brief replays past dedup and re-charges; concurrently, the check-then-write spend-ceiling sequence is a TOCTOU — two parallel `POST /compose/stills` both read headroom under the daily cap and both dispatch, exceeding `SWAN_ATELIER_MAX_SPEND_USD_DAILY`. Harmless at $0 local; real money on the hosted fallback. Evidence: §2.1 gates description. Fix: Redis/SQLite-backed dedup + atomic ledger increment before dispatch, not after.

5. **P2 — MCP `stop_comfyui` ungated + `restart_comfyui` composes stop+launch (§2.3) while P-A makes the entire default lane dependent on that same server.** One ungated tool call kills the production image lane mid-batch, and the batch's failure mode (per §2.1's 207 semantics) was designed for per-image provider errors, not "the GPU host vanished at image 3 of 12." Deny-list fix is named but not yet implemented — make it a merge precondition for P-A, not a footnote.

## ATTACKS

**Correctness**
- *Two seed authorities.* `composeStills` uses "derived seeds" for idempotency (§2.1); P-B passes `seed=` to the taste server which returns its own `{seed}` (§2.2). Which seed governs the rendered image? If the taste server's returned seed differs from the derived one, replay-after-60s produces a different prompt for the "same" request. Specify: derived seed is authoritative, passed *into* the taste call, returned seed ignored or asserted-equal.
- *Law filter failure semantics.* `assertLawful` throws (it's an assert, §2.2). In a taste batch where 3 of 8 prompts trip the filter, you get 3 hard failures and a 207 — every time, deterministically, because the taste corpus is static. Filter-after-taste needs a bounded reject-and-resample loop (re-draw from `/api/prompt` with seed+n), otherwise taste mode ships with a permanent failure tax.
- *Health-check routing.* "Default route = local when ComfyUI answers `/system_stats`" (§3 P-A) tests liveness, not capacity. Server up with 24GB VRAM consumed by a Wan render → still job enqueues and hangs. You need admission (free-VRAM threshold), not a ping.
- *Unbounded inputs.* Brief max length and batch count ceiling are nowhere stated. A 2MB unicode brief (zero-width joiners, RTL overrides) passes the "empty-brief" gate and goes straight into a ComfyUI node string field. Define byte caps and a normalization step.

**Security**
- *Deployment coupling as attack/breakage surface:* the taste server binds `127.0.0.1:7331`, unauthenticated, and **can write taste files** (§2.2). P-B means the Atelier backend must run on the 5090 workstation. Any other local process (or a compromised dependency) can poison the taste corpus that now feeds production generation. Cheap control: read-only mode flag on the server for the Atelier consumer, or a Unix-socket/per-user bind.
- *Hosted-lane prompt exfiltration* — covered in Blocker 1; also note the brief itself goes to OpenRouter verbatim today. If briefs ever contain client program details, that's the same violation on the already-shipped path.
- *Operator-supplied graph JSON* (§2.3): trusted-operator assumption is fine for a solo studio, but env-binding suffixes (`SWAN_COMFYUI_WORKFLOW_<SFX>`) should be validated against an allowlist — an unsanitized suffix is a trivial config-injection vector into node wiring.
- *No rate limit evidenced* on `/api/atelier/compose/*` beyond run-cap/spend-ceiling; on the free local lane the ceiling is "volume cap only" with no number given. An unbounded free lane = GPU thermals + websocket-save disk fill. State the cap.

**Data-truth / schema drift**
- *Hardcoded price map* `{'openai/gpt-5.4-image-2': 0.0039}` (§2.1): when OpenRouter reprices, estimates lie and the spend ceiling meters against fiction. Fetch-at-boot with cached fallback, or version the price table.
- *`MediaAsset` as FK target* (§3 P-C): the packet itself says "no asset store exists yet." Proposing persistence into a table whose schema isn't shown invites exactly the PascalCase/snake_case and column-vs-caller drift this panel hunts. Spec the schema in the same doc, or don't name the table.
- *Frontend response-shape drift:* STATUS map 402/429/409/503/207 (§2.1) — no response body contract is documented. The 207 partial shape (`charged-vs-total`) especially needs a frozen schema or the frontend will hand-roll it wrong.
- *House-vocabulary drift through the taste corpus:* Midjourney-archive prompts can contain "yoga/meditation" language and persona text that drifts off "26+ years / NASM-protocol" phrasing. If `assertLawful` doesn't enforce the house lexicon and credential phrasing, P-B becomes a regression engine for both rules. Verify; extend the law filter if not.

## HIGHEST RISK

The single most dangerous item: **the local-first inversion's headline benefit ($0 stills) rests on a still-generation path that has never run once** — no text2image kind, no checkpoints, a video model repurposed by assertion. If the Wan-single-frame probe produces mediocre stills (likely: video-latent decoders are tuned for temporal coherence, not single-frame fidelity), Sean bounces back to hosted, the inversion is dead, and the migration work bought nothing. Cheapest de-risk *before writing any lane code*: one afternoon, download one SDXL/Flux GGUF quant, run 10 fixed-seed prompts spanning the site's actual asset archetypes through ComfyUI manually, blind-compare against the hosted model's output on the same briefs, record wall time + VRAM. Promote to `probed` only on human-acceptable ≥80%; otherwise P-A ships as motion-only local-first and stills stay hosted-opt-in — an honest, smaller win.

## CONFIDENCE

What I could not verify from the document alone:
- **Whether `assertLawful` enforces the house lexicon** (yoga/meditation ban, NASM-protocol credential phrasing) or only the generation "laws." The doc describes it as a law filter without enumerating rules. Settle by reading `shared/swanPromptCompiler.mjs`.
- **Whether the deployed topology ever puts the backend on the 5090 box.** Every localhost assumption in P-B (and the existing Comfy adapter) collapses if the backend runs elsewhere. Settle with one deployment diagram.
- **Actual taste-prompt failure rate against the law filter.** I flagged reject-and-resample as necessary, but if the corpus is already law-clean the loop is dead weight. Settle by dry-running 50 corpus prompts through `assertLawful` and counting rejects.
- **Whether the 30 shipped tests cover concurrency at all.** I inferred the TOCTOU from the described gate ordering; the tests' actual coverage is unstated. Settle by reading the test file for parallel-execution cases.
- **Wan 2.2 single-frame quality** — genuinely unknowable until probed; my "quality trap" judgment is a prior, not a measurement, which is exactly why the probe must precede the merge.

I am confident in the PII finding, the line-cap violation, and the process-local idempotency critique — those rest on facts stated in the packet itself.
