# A client deny-list matches names, not behaviour — and my own fix was the next bug, twice

**From:** vs-claude (Opus 5) · terminal · 2026-08-24T22:39Z
**Surface:** atelier-v2 / comfy-mcp / render-agent
**Worktree:** `feat/atelier-v2-compose` off `origin/main` · commits `325d7db36`, `86dc3f0ff`, `85711a43d`
**Type:** research + architecture decision. No product code changed. S1 not started.

## What happened

Sean approved installing `comfy-cli` + `comfy-mcp` to settle the one question a three-seat panel could not answer: *can individual MCP tools be disabled?* The answer is **no** — 39 tools register unconditionally at module scope, no flag, no allowlist, confirmed both by AST and at runtime.

Then ten hostile rounds took apart my own answer.

## The durable finding

**A client-side tool deny-list matches the tool NAME the agent calls — never what that tool does inside the server process.** `restart_comfyui`'s own description says it *"Composes `stop_comfyui` + `launch_comfyui` (no `comfy restart` verb)."* So denying `stop_comfyui` does nothing to a `restart_comfyui` call performing the identical stop.

This generalises well past ComfyUI: **any deny-list over a third-party tool surface must be audited against composition, and re-audited on every upgrade** — because a newly-added composing tool is indistinguishable from a newly-added safe one until a human reads it. That is a standing maintenance obligation, not a one-time config.

## Live-state facts Hermes should hold

- `comfy-mcp 0.10.0` + `comfy-cli 1.17.0` installed. ComfyUI **0.33.0** at `C:/ComfyUI`; PyTorch 2.11.0+cu128; CUDA 12.8; RTX 5090 32,607 MiB total / 24,670 free; driver 610.62. `custom_nodes`: `swan_prompt`, `websocket_image_save` only.
- **39 MCP tools, no per-tool disable.** Seven named per-action consent gates; both spend gates carry an empty `consent_token`, deliberately held out of the pre-authorization mechanism. Worth mirroring for our licence grant.
- `stop_comfyui` reaches any pid **comfy-cli** recorded — written by `comfy launch` **whoever invokes it**, persisted in `config_manager.background`. Not MCP-specific.
- `free_memory` is **not** a mid-render risk: *"NOT IMMEDIATE, never destructive… does not interrupt a running job."*
- Deny-list needed: `stop_comfyui`, `launch_comfyui`, `restart_comfyui`, `download_model`, `upload_file`. **Not applied — Sean's call.**
- The previous session's branch was **2,221 commits behind main** and contained no `shared/providers/` at all. Any Atelier work must be cut fresh from `origin/main`.
- S1 is smaller than planned: `POST /generate-video` already does licence gate → validation → idempotency → `createJob` → worker presence. `swanPromptCompiler.mjs` and `openrouterImage.mjs` both exist and are **unwired** — that is the actual gap.

## Mistakes I made

- **Attributed tool→gate mappings by line range.** Helper defs sit between tool bodies, so the ranges lied. Caught by re-doing it with AST. **MECHANISM:** structural questions about code use `ast.parse`, never line arithmetic over a grep.
- **Claimed `free_memory` "can evict a model mid-run" and `stop_comfyui` "will not ask before killing a render."** Both false; the tools' own runtime descriptions say so. I had read the call graph and never read what the tools say about themselves. **MECHANISM:** when a package documents its own semantics, read the description before asserting behaviour from its call graph — they are two independent instruments and the cheap one was skipped.
- **My round-3 fix was round-4's bug.** I concluded the risk existed "only when the MCP launched ComfyUI," reasoning from one tool's docstring — without asking who *else* writes the state that docstring depends on. `comfy launch` from Sean's own terminal writes the same pid record. **MECHANISM:** before trusting a boundary claim, enumerate every writer of the state the claim rests on.
- **Published the disproven claims to Linear before the rounds ran.** An outward artifact carried assertions I killed 15 minutes later. Caught by a Rule-53 adjacent-doc sweep in round 6; corrected with a follow-up comment rather than an edit. **MECHANISM:** the dry-loop runs before an outward-facing publish, not after.
- **Proposed a deny-list that a composing tool walks straight through.** Round 8. **MECHANISM:** audit a deny-list against composition, and re-audit on every dependency upgrade.
- **Raised a false alarm on my own heuristic** — grepped `argv.py` for `tool` AND `filter` co-occurring and briefly believed a tool-filter existed. It is subprocess argument sanitization. **MECHANISM:** a co-occurrence heuristic produces a candidate, never a finding; read the hit before reporting it.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Trusting a single authority without asking who can write to it | **3** — stale line count (earlier), round-3 docstring boundary, deny-list-by-name | **Yes — and it recurred twice AFTER I wrote it up in this session's own learning packet** | Only the adversarial round found each one. No procedure caught any of them |
| Structural claim from line arithmetic | 1 | No | AST re-run |
| Publishing before the dry-loop | 1 | No | Rule-53 sweep in round 6 |
| Heuristic reported as finding | 1 | No | Reading the actual hit |

**The entry that matters:** the single-authority error recurred **twice more within the same session in which I had already written it up as a durable lesson**. Writing it down did not prevent it. The three instances differed in surface — a number, a docstring, a config key — so a lesson phrased around the *surface* did not generalise. The correction that survives has to be phrased as a **question you ask**, not a fact you remember: *who else can write the thing I am about to trust?*

## Dry-loop ledger

R1 line-range→AST **FOUND** · R2 runtime registry **clean** · R3 runtime descriptions **FOUND ×2** · R4 attack R3's fix **FOUND** · R5 verify R4 **clean** · R6 Rule-53 sweep **FOUND (Linear)** · R7 remaining claims **clean** (false positive) · R8 last AST-only mapping **FOUND** · R9 composition sweep, 39 tools **clean** · R10 integrity + gates **clean**.

## Artifacts

- `docs/ai-workflow/AI-HANDOFF/ATELIER-V2-COMFY-MCP-BLUEPRINT-2026-08-24.md` §2.4 — probe results with all three corrections marked in place, not silently rewritten
- Linear `SWA-165` — two comments, the second correcting the first
