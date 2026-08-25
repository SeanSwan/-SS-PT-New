# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET-R2.md
**Seed:** (none)
**Tokens:** 8798 in / 6162 out · **Cost:** ~$0.0239 · **Wall:** 600.4s · **finish:** stop

---

## VERDICT
REVISE — The P2 contract has a critical un-gated write path, and the `tasteFor` function contains a P0 bug that breaks taste generation for all non-Sean memories.

## BLOCKERS
1. **P0** — `tasteFor` in `lib/taste-namespace.mjs` calls `keepFor(profile, project)` without the required `prompt` argument, causing `keepFor` to return `{ ok: false, error: 'prompt must be at least 3 words' }`. The subsequent `kept: kept.length` evaluates to `undefined`, and `confidenceOf` receives `kept: undefined`, corrupting the taste object. This breaks the entire partner/client prompt path.  
   **Evidence:** `lib/taste-namespace.mjs` lines `const kept = keepFor(profile, project);` and `kept: kept.length` inside the returned object.

2. **P0** — P2 contract §4.1 specifies `GET /api/prompt?intent=1` for minting render tokens, but the origin gate in `serve.mjs` is only applied to `POST` requests (`if (req.method === 'POST') { … }`). Any local process can mint intents without restriction, flooding the intents file and polluting namespaces.  
   **Evidence:** `serve.mjs` excerpt shows gate only on POST; contract §4.1 states minting is a write and must be behind the origin gate.

3. **P1** — `GET /api/renders` (ingest) also lacks an origin gate, allowing unauthenticated local triggering of file scans and index writes. While the impact is lower, it violates the principle that writes require the origin check.  
   **Evidence:** Contract §4.3 describes ingest as a GET endpoint; no gate is mentioned, and the existing gate pattern only covers POST.

4. **P1** — The render serving endpoint (`/renders/<token>/<n>`) must enforce that the composed file path stays within the ComfyUI output directory. The contract relies on regex validation of token and `n`, but a path traversal could occur if the implementation naively joins strings. The contract should explicitly require `path.resolve` and a prefix check.  
   **Evidence:** Contract §4.4; no mention of path sanitization beyond regex.

## ATTACKS
- **Correctness:**
  - `tasteFor` for non-default namespaces is broken (P0 above). The function will always fail to produce a valid taste, making the entire “partner/client gets theme words + picks + kept prompts” feature non-functional.
  - `keepFor` is called with missing `prompt`; even if fixed, the return value `kept` is an object, but `tasteFor` treats it as an array (`.length`). This is a type mismatch.
  - The `words` helper (used in `keywordsFrom`, `avoidWordsFrom`) is not shown; its splitting logic could introduce noise or miss compound terms, affecting keyword quality.
  - `avoidWordsFrom` may be over-eager on tiny memories, but that is a known residual.

- **Security:**
  - Un-gated GET endpoints for writes (mint, ingest) break the origin-gate contract. Any local script or browser page can mint tokens or trigger ingest, leading to resource exhaustion or namespace confusion.
  - The render serving path must be hardened against directory traversal. Even with hex/digit constraints, an implementation error could allow reading arbitrary files if the output directory is symlinked or if the path join is mishandled.
  - The P2 contract relies on household trust for the render loop; there is no authentication between ComfyUI and the brain. A malicious local process could write files with crafted `swan-` prefixes to inject renders into a memory. The contract’s “unknown tokens are ignored” mitigates this partially, but a token collision (12-hex) is possible with enough attempts.

- **Data-truth / schema drift:**
  - `tasteFor` returns `kept: kept.length` (undefined) instead of the kept count. Downstream consumers expecting a number will break.
  - The `keepFor` function returns `{ ok, duplicate, kept }` where `kept` is a number, but `tasteFor` uses `kept.length`. This is a schema mismatch between the two modules.
  - The P2 contract introduces `collection: 'render'` and `provenance: 'local-comfy'`. The existing `SHAREABLE_COLLECTIONS` and `SHAREABLE_PROVENANCE` sets do not include these, so `poolFor` would filter them out if a project uses shareable pool. The contract must ensure renders are always available in the render pool regardless of shareable/full settings.

## HIGHEST RISK
The `tasteFor` bug will silently return a broken taste object for every partner/client memory, rendering the entire non-Sean prompt system inoperative. This is a regression from the round-1 fix that was supposed to give those users a functional taste namespace.  
**Cheapest de-risk:** Add a unit test in `test-taste-namespace.mjs` that calls `tasteFor` with a non-default profile/project (mocking `keepFor` to return a valid count) and asserts `taste.kept` is a number > 0 and the object structure is valid. Then fix the call to `keepFor` (either pass a dummy prompt or extract a `getKeptCount` helper).

## CONFIDENCE
I could not verify the full `tally` implementation in `lib/profile.mjs` because only an excerpt is provided. The P2 contract’s 0.5/1.0 weighting for render judgements must be integrated there, and I cannot confirm that the partition is correctly applied without double-counting or interfering with the evidence floor.  
**Evidence to settle:** The complete `lib/profile.mjs` file, especially the `tally` function and how it consumes `generatorDistribution: 'local-comfy'`.  
Additionally, the `words` utility is not shown; its behavior could affect keyword extraction and vetoes. I would request the source of that helper.
