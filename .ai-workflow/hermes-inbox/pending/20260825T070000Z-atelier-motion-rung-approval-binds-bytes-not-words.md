# The Motion rung — approval binds bytes, not words; and a warning in the codebase recurred in new code

**From:** vs-claude (Fable 5) · terminal · 2026-08-25 · commit `fd2dc5d45` on `feat/atelier-v2-compose` (PR #73)
**Surface:** atelier / motionBind / handlers/initImageBind / renderAgentRoutes / Compose UI
**Type:** feature slice (Motion rung) + hostile rounds. PR #73 still unmerged; SWA-207 probe still Sean's.

## What shipped

`POST /api/atelier/compose/motion` takes `{assetId, sha256}` — a prompt alone is refused. Server verifies the recorded artifact hash IS the approved hash, runs the video registry's licence gate + validation, and queues a normal job on the existing video queue with `params.initImage = {assetId, r2Key, sha256, mime}` (an object, never a filename). Agent side (`handlers/initImageBind.mjs`) resolves it at the moment of use: read ticket from the server (`POST /api/render-agents/jobs/:id/init-image`, lease-holder only, key from the job's own params), download, **re-hash, refuse on mismatch (permanent)**, upload into ComfyUI's input dir, then the graph sees a filename. UI: the locked button unlocks only for a selected still that is a persisted asset with a hash; the queued job is polled on the Render Queue's endpoint and described honestly.

## The lesson

**A bind is verified at the point of use, not only at the point of queueing.** Between "queued" and "rendered" the object can change; the agent re-hashes so the graph animates the approved bytes or nothing.

**A warning written in the codebase does not protect new code in the same codebase.** `generateVideo.mjs` carries a docblock: *"Derived from the INJECTED env, not process.env. Letting the registry fall back to its own default would make the env parameter decorative."* I wrote `motionBind.mjs` the same afternoon, called the same registry, and made the same mistake — `resolveProvider` never received `d.env`. The bind's own "disabled provider" test caught it. The warning is procedural in its own file and invisible one directory over.

## Live-state facts

- `initImage` was injected into the LoadImage node **verbatim**; before this slice an object would have reached the graph as `[object Object]`. A plain filename still passes through (operator contract intact).
- `generateVideo.mjs` is at exactly 300 lines; the spend gate is now `spendGate()`; the bind is one call.
- A real bound render is **unproven** here — no ComfyUI/R2/DB. It renders for real only after SWA-207.
- Test delta (RE-ANCHOR, disclosed): the route test that asserted Motion was ABSENT now asserts the stronger property (binds `assetId+sha256`, refuses prompt-only).

## Mistakes I made

- **Called the registry without the injected env in `motionBind`** — the exact defect the handler's docblock warns about, one directory away. Caught by my own test. **MECHANISM:** any call to `resolveProvider` passes `grants: readGrants(env)` and `enabled: readEnabled(env)` explicitly; a call without them is a review blocker regardless of which file it is in.
- **Let the handler grow to 312 lines** with a try/catch that belonged in the bind module. Caught by the caps check. **MECHANISM:** error-class semantics live beside the error class; a handler gets one call.
- **Wrote a frontend edit as a bash heredoc that bash could not parse** (JS template literals + apostrophes), lost the turn, and re-did it from a script file. **MECHANISM:** multi-file frontend edits go through a script file, not a heredoc.
- **Left a test asserting the ABSENCE of a feature I was about to build** and only noticed when it failed. **MECHANISM:** before building a feature, grep the tests for assertions that it does not exist and re-anchor them first.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Injected env made decorative by a registry default | 1 new + 1 latent (handler docblock records the earlier one) | **Yes — in the code itself** | My own test, not the docblock |
| File crosses the cap by accretion | 2 today | Yes (earlier today) | Caps check both times |
| Heredoc parse failure on frontend edits | 1 | No | Script file |
| Absence claim without a control | 0 — chunk walk carried the control again | Yes | The command shape held |

## External-model calibration

None ran.
