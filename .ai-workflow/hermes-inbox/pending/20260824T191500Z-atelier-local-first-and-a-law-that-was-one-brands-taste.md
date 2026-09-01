# Local-first stills, the taste brain wired in — and a law filter that was one brand's taste

**From:** vs-claude (Fable 5) · terminal · 2026-08-24 · commit `bbc2c46ac` on `feat/atelier-v2-compose`
**Surface:** atelier compose / local still lane / taste-brain client / law filter
**Type:** feature slice + 3-seat hostile panel ($0: Ox, GLM-5.3, Qwen) + Fable arbitration

## What Sean asked, and what was wrong

"We are using my 5090 … so it could be free" and "make sure the prompt maker tied into the Swan brain is actually tied into the Comfy too." The shipped S1 was hosted-billed only, and the two prompt brains (`swanPromptCompiler` in SS-PT; the taste server the ComfyUI `SwanPrompt` node calls) shared nothing.

## What shipped

- **Two lanes.** `local` = Wan 2.2 through the existing `comfyuiLocal` adapter, $0, single-flight, admitted on live `vram_free`. `hosted` = OpenRouter, OFF until budgeted, now the opt-in fallback. `auto` prefers local.
- **Local still lane ships `claimed`** and refuses until `SWAN_ATELIER_LOCAL_STILLS=probed`. Wan's `length` accepts 1 so a single-frame still is valid; nobody has rendered one; `/limits` says non-advertisable.
- **Taste brain as a prompt source** — same `127.0.0.1:7331` server the Comfy node uses. GET-only, loopback-pinned, allowlisted params, fail-closed. **Local-only**: taste+hosted is refused before any fetch.
- **`lawProfile: full | universal`** — see the lesson.
- Idempotency reserves at start (the completion-time write was a TOCTOU). Brief capped + NFC-normalized. Retry-After on busy. Adapter gained an optional `outputMatch` (SaveImage → `.png` was invisible to the video matcher).

## The lesson

**A compliance filter written for one brand becomes a failure tax the moment the product serves a second one.** `assertLawful` rejects "a lone swan on a glacier lake" — correct for SwanStudios (the swan is optics, never a bird) and wrong for every other project Sean designs, where NatGeo wildlife is his default vocabulary. Hostile round 2 found it by running the real module on a real sentence. Fix: laws are now classified — LAW3 kill-list / LAW9 retired palette / LAW10 content (Rule 9) are house rules and hold everywhere; LAW4 creatures / LAW2 gold are brand taste and drop only under an explicit `universal` profile. Never silently.

## Live-state facts

- **H3 weights ARE on the box** — `Z:\AI-Weights\ComfyUI\diffusion_models\minimax_h3_fl2va_pruned_fp8_scaled.safetensors` (19.5 GB) via `extra_model_paths.yaml`. My earlier probe only looked in `C:\ComfyUI\models`. Local `C:` has Wan 2.2 5B + VAE + umt5 only.
- The GPU is **32 GB**, not 24 — Qwen's number was wrong, its concurrency point stands (Wan peak 25.4 GB).
- `/system_stats` exposes live `vram_free` → admission control is real, not aspirational.
- `stop_comfyui` remains ungated in comfy-mcp; the deny/allow-list is still only in a doc (Sean's call).
- No spend ledger, no `MediaAsset` persistence for stills yet (`r2Key` NOT NULL; only upload path is agent-side presigned). Named, deferred.
- Panel tooling (`consult-panel.mjs`) lives on the **wip branch**, not main — run it from the old checkout with absolute paths.

## Mistakes I made

- **Shipped a compliance gate that would have been a no-op.** Wrapping taste strings into `assertLawful` was the fix *for* that, but I only saw the shape mismatch because GLM named it. **MECHANISM:** before reusing a validator on a new input type, read its signature — a filter that accepts the wrong shape passes everything.
- **Applied a brand law universally and only noticed by running a real sentence.** The unit tests were green; the hostile round used the real module. **MECHANISM:** every hostile round includes at least one probe of the real module with a realistic input, not a fixture.
- **Three failed attempts to fix one broken line** (a literal newline inside `.join('…')`) via regex/perl before using an exact-string edit. **MECHANISM:** for a known byte-exact defect, use the exact-match editor first; regex is for patterns, not for one line you can see.
- **Wrote the idempotency store at completion in the first S1** — a race three seats caught. **MECHANISM:** an idempotency key is reserved before the work, never recorded after it.
- **Told the panel "no H3 on the box"** by implication — I checked one models dir and not `extra_model_paths.yaml`. **MECHANISM:** an absence claim about installed weights checks every configured model path, not the default one.

## External-model calibration

| Seat | Real | Disproven/demoted | Cost |
|---|---|---|---|
| Ox Alpha | taste→hosted exfiltration; line-cap breach; unprobed lane advertised; process-local idempotency; house-lexicon question (answered: LAW10 enforces it) | "hardcoded price vs catalogue = two truths" (hosted image models aren't in the video catalogue) | $0 |
| GLM-5.3 | law-filter shape mismatch (the top find); no asset sink; TOCTOU; sync-vs-27s; taste write endpoints; FLUX A/B protocol | "MediaAsset persistence ≈ 60 lines" (r2Key NOT NULL + agent-only upload path) | subscription |
| Qwen 3.8 | VRAM concurrency; unauth write-capable taste server | "24 GB card" (it is 32); REJECT verdict built on a SaaS-multi-tenant frame | $0 |

## Sean-gated, not done

1. **The probe**: install FLUX.1-schnell (Apache), blind A/B vs Wan frame-0 on 4 real briefs, record wall/VRAM, then set `SWAN_ATELIER_LOCAL_STILLS=probed` + the three `SWAN_ATELIER_STILL_*` keys.
2. MCP allow-list in `.claude/settings.json`.
3. Taste server read-only mode — lives in the other repo.
4. `MediaAsset` persistence + Motion bind — next slice.
