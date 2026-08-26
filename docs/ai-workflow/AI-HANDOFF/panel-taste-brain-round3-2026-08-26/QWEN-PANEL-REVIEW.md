# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND3-PANEL-PACKET-2026-08-26.md
**Tokens (Ollama):** ? in / ? out | **Wall:** 37.7s | **done_reason:** ?

---
## VERDICT
REVISE — the render-loop security surface is largely sound, but the `Make` route lacks namespace validation, allowing any memory to queue renders into Sean's ComfyUI and pollute his output directory with cross-namespace tokens.

## BLOCKERS
1. **P1** — `handleMakeRoutes` does not validate `profileId`/`projectId` before minting intents or posting to ComfyUI.
   - **Failure**: `POST /api/make` with `{"profileId":"partner","projectId":"x","prompts":[{"prompt":"test prompt here"}]}` mints an intent into `taste/profiles/partner/x/renders/intents.jsonl` and posts the graph to ComfyUI with prefix `swan/<token>`. The render file lands in Sean's shared output dir. If Sean later judges a grid for `partner/x`, the never-show-twice set includes this token, but the file is physically in Sean's render dir. Worse: if Sean's `sean/default` memory is active and he browses `/api/renders?profile=sean&project=default`, the `listRenders` scan reads `sean/default`'s intents, which do NOT include this token, so it is invisible to Sean — but it still consumed a ComfyUI queue slot, GPU time, and disk space. If the partner memory is later deleted, the orphaned file remains in Sean's output dir.
   - **Evidence**: `routes-make.mjs:83` calls `mintIntent({ profileId: body.profileId, projectId: body.projectId, ... })` without any prior check that `body.profileId` is in `PROFILES` or that `body.projectId` is a valid slug for that profile. `mintIntent` in `renders.mjs:66` does call `nsOk`, but `nsOk` only checks `PROFILES.includes(p) && isProjectId(j) && Boolean(readProject(p, j))` — it does NOT verify that the caller is authorized to write to that namespace. The origin gate in `serve.mjs:166` only checks the Host/Origin headers, not the namespace.
   - **Smallest fix**: In `handleMakeRoutes`, before the loop, add:
     ```javascript
     const ns = { profile: body.profileId ?? DEFAULT_PROFILE, project: body.projectId ?? DEFAULT_PROJECT };
     if (!PROFILES.includes(ns.profile) || !isProjectId(ns.project) || !readProject(ns.profile, ns.project)) {
       json(res, 400, { error: 'unknown memory' }); return true;
     }
     ```
     And pass `ns.profile`/`ns.project` to `mintIntent` instead of `body.profileId`/`body.projectId`.

2. **P2** — `applyTo` in `workflow.mjs` does not validate that the `prompt` string is non-empty or within a reasonable length before substituting it into the graph.
   - **Failure**: `POST /api/make` with `{"prompts":[{"prompt":""}]}` passes `mintIntent` (which requires ≥3 words, so this is actually caught — **SPECULATIVE**, retracted). However, if a prompt is exactly 3 words but contains null bytes or extremely long strings, `applyTo` will substitute them into the graph JSON. ComfyUI may reject it, but the intent is already minted and the token is recorded. This is a minor resource waste, not a security breach. **SPECULATIVE** — no concrete crash or wrong output demonstrated.

3. **P2** — `parseRange` in `range.mjs` does not handle the case where `rawStart` is a very large number that overflows `Number.isSafeInteger`.
   - **Failure**: `Range: bytes=9999999999999999999999999999999
