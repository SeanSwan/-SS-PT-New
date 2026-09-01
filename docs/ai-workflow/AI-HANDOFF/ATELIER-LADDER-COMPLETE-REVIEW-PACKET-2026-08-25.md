---
decision: The Compose ladder (Brief → Still → persist → Motion → Publish) is complete in code on feat/atelier-v2-compose — hostile review + enhancement pass before merge
status: open
supersedes: none
---

# Swan Atelier — the complete Compose ladder · HOSTILE REVIEW + ENHANCEMENT PACKET

**Author:** Fable 5 (Final Decider — does not vote) · 2026-08-25
**Seats:** Ox Alpha, GLM-5.3, Kimi K3, Grok 4.6, Qwen 3.8, HY3 — Sean's explicit roster.
**Remit (Sean's words):** hostile review PLUS *"look for any enhancements, upgrades, or anything we can possibly do; any gaps; any context that may be missing that goes along with this plan; any ideas you recommend."* Attack what exists, then say what should exist. Rank by value. Do not restate §2.

---

## §1 — WHAT THIS IS FOR

A local-first asset studio inside the SwanStudios admin, on Sean's RTX 5090 (32 GB), for producing images and video for **SwanStudios and the other websites he builds**. Sean's constraints: free by default (local), the taste brain (his rated Midjourney corpus, served at `127.0.0.1:7331`) must feed it, commercial safety (licences as code), and honesty over polish — the UI must never promise what the server will refuse.

## §2 — WHAT EXISTS ON THE BRANCH `[VERIFIED — every file read this session]`

All on `feat/atelier-v2-compose` (PR #73, unmerged; 15 commits over origin/main). Every backend module ≤300 lines; every test injects its collaborators (no DB/R2/GPU in the build env).

### 2.1 The ladder — one endpoint family, `backend/routes/atelierComposeRoutes.mjs`
| Rung | Endpoint | Module | What it guarantees |
|---|---|---|---|
| Brief | `POST /estimate` | `composeStills` | price + lane BEFORE the button; lanes the server would refuse are dead |
| Still | `POST /stills` | `composeStills` + `localStillLane` + `promptSources` | 4-up; local lane (`comfyui/wan-2.2`, $0, single-flight, live-VRAM admission) is **`claimed`** and refuses until `SWAN_ATELIER_LOCAL_STILLS=probed`; hosted (OpenRouter) OFF until `SWAN_ATELIER_MAX_SPEND_USD_DAILY>0`; taste-brain prompts are **local-only**, GET-only, loopback-pinned, law-filtered; `lawProfile: full\|universal` |
| persist | (inside `/stills`) | `persistStills` | still → R2 (key = sha256) → `MediaAsset` row with `buildProvenance`; refuses when R2 unconfigured; never hides a still |
| asset | `GET /asset/:id` | `persistStills.readAsset` | owner-scoped record + provenance + read URL |
| Motion | `POST /motion` | `motionBind` + agent `handlers/initImageBind` | binds `{assetId, sha256}` (a prompt alone is refused); server checks recorded hash; queues on the existing video queue with `initImage` as an OBJECT; **agent re-hashes at the point of use**, uploads into ComfyUI input, then the graph sees a filename |
| Publish | `POST /asset/:id/status`, `GET /asset/:id/reference` | `publishAsset` | `draft→approved→published` (no jumps); publish refused by the FROZEN provenance: unconfirmed consent flag, missing required attribution, grant-required model run used commercially with no grant; read URL + `<img>/<video>` snippet + attribution **withheld until published** |

### 2.2 Cross-cutting facts
- Idempotency: reserve-at-start, coalescing (`composeStills`); hash-keyed (`persistStills`); derived per asset+hash+prompt+minute (`motionBind`).
- Spend: image lane has its own `SWAN_ATELIER_*` keys; unpriced hosted model refused (`E_PRICE_UNKNOWN`) — the seam where `undefined` fell through `spendGuard`'s `null` check was the first defect found.
- **No spend ledger yet** — ceilings are per batch, not per day, and `/limits` says so.
- Compose UI (`AtelierCompose.tsx` + api/styles/grid): reads `/limits` first; lane strip in semantic colour (gold = unproven); Motion unlocks only for a selected persisted still; job polled on the Render Queue's endpoint; Publish panel with Approve/Publish/Unpublish, copy link, copy snippet, attribution.
- Provenance policy flags exist in the record with `consentConfirmed:false` as the honest start state — **nothing in the pipeline sets a flag yet**, so today the consent gate never trips.
- MCP (`comfy-mcp 0.10.0`): 39 tools, no per-tool disable; `stop_comfyui`/`free_memory` reach no consent gate; the client-side allow-list is a doc, not config (Sean's call).
- Weights on the box: Wan 2.2 TI2V-5B (local), MiniMax H3 fp8 (`Z:` drive). No image checkpoint. The Wan single-frame still path is **unprobed**; both senior seats predicted a video-latent decoder makes poor stills; FLUX.1-schnell A/B is the probe protocol (SWA-207).
- Workspaces (multi-project) do **not** exist; `workspaceId` rides in `tags`; `MediaAsset.projectId` is a content_projects FK and is left null.
- Tests: backend 195+ across 12 suites; frontend 30+; nothing proven against a real ComfyUI, R2 or DB.

## §3 — THE QUESTIONS (adversarial; rank your answers)

1. **Break the bind.** `initImage` object → agent ticket → download → re-hash → ComfyUI upload → filename. Where does it fail on real hardware first? What state does a half-failed bind leave (uploaded to ComfyUI but job failed; hash mismatch after upload)? Is `permanent:true` on mismatch right, or does it strand a legitimately re-uploaded asset?
2. **Break Publish.** The consent gate can never trip because nothing sets a policy flag. What SHOULD set one, where, and from what signal? Is "grant-required model used commercially" derivable from the frozen licence snapshot alone, or does it need the territory at publish time? Is a signed read URL in an `<img>` snippet the right thing to hand a site, given it expires (4h default)?
3. **Break the lanes.** Single-flight is in-process; admission reads live VRAM once. A batch of 4 on a 27s/frame model is ~2 min inside one HTTP request. What does the operator experience, and what should the contract be (sync vs job)? Local single-frame stills: if the probe fails, what is the honest fallback that keeps the studio free?
4. **Break persistence.** Key = sha256 per owner per month. Same bytes twice in different months = two objects; is that acceptable? `projectId` null + workspace in tags — what breaks first when a second site arrives?
5. **What is missing** — absence-first, ranked by value to a solo operator producing site assets weekly: (candidates: a spend ledger; batch/matrix; sequence + the shipped audio-sync engine; taste feedback (keep/reject → the taste server's `/api/rate`); an asset library with reuse search; workspaces/brand kits; a Doctor surface for the MCP handshake; policy-flag detection; CDN/public URLs instead of signed ones; a Remotion/ffmpeg publish for social sizes). Kill what is not worth it yet. Add what I have not listed.
6. **The one thing most likely to kill this whole studio** for its actual user — one paragraph.

**Constraints reviewers must respect:** styled-components only; Crystalline Swan tokens with fallbacks; 44px targets; 300-line cap; Victory for charts; zero PII to LLMs; fail-closed licence/spend gates; tri-state capability honesty (`claimed` until probed); Wan 2.2 = commercial-safe default, H3 non-commercial until grant; Rule 9 vocabulary and "26+ years / NASM-protocol" phrasing (enforced by LAW10).
