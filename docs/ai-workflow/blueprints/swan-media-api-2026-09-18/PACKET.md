# Swan Media API — Astra Blueprint Packet

**Artifact ID:** SWAN-MEDIA-API-BP-PACKET-2026-09-18
**Purpose:** request the architecture-authority pass (Mega Blueprints v3.1 role) that decides how the existing video provider layer becomes a **callable API** — one surface fronting the local 5090 ComfyUI stack and the hosted Higgsfield catalogue.
**Owner:** Sean · **Authored by:** DSH agent session · **Status:** PLAN — awaiting adjudication
**Repo:** `SS-PT` @ `main` `2b3e7a62a` (sparse worktree `C:/tmp/ss-media-api`, branch `feat/media-api-2026-09-18`)
**Supersedes:** none. Extends `shared/providers/video/*`, which is DATA + BEHAVIOUR already shipped on `main`.

---

## 0. Remit

Act as `gpt-6-astra`: architecture authority for the Swan Media API. Decide and specify. Do **not** restate this packet back.

Every claim you make about fit, cost, memory or performance must be either (a) derived from the measured numbers below, or (b) explicitly registered as an unmeasured hypothesis with the measurement that will settle it. A `published` vendor figure is not a measurement.

Two sentences we need in plain language, because they drive the whole design:

1. What is the **right request/response contract** for one API that fronts both a local GPU queue and a remote per-second-billed vendor — and where must the two be kept *deliberately* different rather than smoothed into one shape?
2. How is **money** bounded when one provider is free at the margin and the other bills by the second, and the caller is an autonomous agent rather than a human?

---

## 1. Verified baseline — the provider layer (already shipped on `main`)

This is not a greenfield. `shared/providers/video/` is a working, licence-enforcing provider abstraction with 10 modules:

| Module | Role | State |
|---|---|---|
| `catalogue.mjs` | **DATA.** Frozen provider rows + declared capabilities + licence. Every row ships `enabled: false`. | 3 rows: `comfyui/minimax-h3`, `comfyui/wan-2.2`, `minimax/hailuo-hosted` |
| `registry.mjs` | **BEHAVIOUR.** Selection, licence enforcement, request validation, response normalisation. | Fail-closed; refuses at SELECTION time |
| `comfyuiLocal.mjs` | Local ComfyUI adapter: `capabilities()` / `generate()` / `verify()` | **Proven.** Produced real video |
| `comfyuiGraph.mjs` | Graph load + injection. Detection, never creation. | Splits at the 300-line cap (rule 4) |
| `spendGuard.mjs` | Volume + spend ceilings, enforced BEFORE submission. Day-scoped JSON ledger. | Spend defaults **$0/day**; volume defaults **50/day** |
| `provenance.mjs` | Frozen per-asset licence snapshot, schema 1 | Backs a written commitment to a licensor |
| `promptPolicy.mjs` | Prompt-shape policy | present |
| `transportRetry.mjs`, `openrouterImage.mjs`, `openrouterModels.mjs` | Retry policy; the image lane's real adapter | present |

**Three design rules already load-bearing, which the API must not break:**

1. **Tri-state provenance.** Every capability is `probed` / `published` / `claimed`. `registry.capabilities()` reports anything merely `claimed` as **`null`**, because *"a consumer that can see a claimed value will eventually treat it as a fact."*
2. **The image-first law binds only where its cause exists.** It is enforced for any provider where `costPerRunUsd === null || > 0`. A local provider with `costPerRunUsd: 0` is exempt — enforcing it there *"would block the exact zero-cost path Sean asked for, in the name of saving money that is not spent."* **An unknown price counts as a billing price.**
3. **Licence is structural.** `comfyui/minimax-h3` carries `commercialUse: 'requires-grant'`, `excludedTerritories: ['US']`, `restricts: 'model-execution'`. The restriction is on **running the weights**, explicitly **not** on the generated output. `comfyui/wan-2.2` is Apache 2.0, `restricts: 'none'`.

### Measured evidence already on record

| Fact | Value | Provenance |
|---|---|---|
| Wan 2.2 TI2V-5B, 832×480×49f, 20 steps | **26.73 s wall, 25,385 MiB peak VRAM**, RTX 5090 | **probed** |
| MiniMax H3 smoke, 640×384, 39 frames, 1.625 s | ~59 s wall, local ComfyUI 0.33.0 / RTX 5090 (34.2 GB), **zero API cost** | **probed** |
| H3 first-frame conditioning, 1280×704 | ~120 s, `logo_flf_00001_.mp4`, zero credits | **probed** |
| H3 reference config, 1344×768 @24fps, 124 frames | **29,850 MiB peak** on a 32 GB 5090 | **probed** |
| H3 Studio `MiniMaxH3ImageToVideo` | `first_frame` / `last_frame` are **OPTIONAL** — omitting them IS the text-only path | verified against `/object_info` |

### The local graph, as bound today

`workflows/minimax_h3_t2v_api.json` — `SWAN_COMFYUI_NODE_PROMPT = 6`, `SWAN_COMFYUI_NODE_SEED = 8`.

**`duration` is deliberately UNBOUND, and this is a trap the API must not re-open.** The API's `duration` is in **seconds**; node 6's matching input is `length`, which is neither seconds nor a 1:1 frame count — `length=25` produced **39 frames**. `FIELD_CANDIDATES` maps `duration → ['value','length','duration','frames']`, so binding them would name-match happily and **silently render a 4-frame clip for a "4 second" request.**

### The local node-name trap

ComfyUI ships two MiniMax families with near-identical names. The **category** is the only reliable tell:

| Category | What it is |
|---|---|
| `partner/video/MiniMax` | **HOSTED.** Sends the prompt to MiniMax's servers, bills credits per run. |
| `model/conditioning/minimax`, `model/latent/minimax`, `model/patch/minimax` | **LOCAL.** Runs on the GPU. Free. |

**Anything under `partner/` costs money.** Every shipped graph uses only `model/` nodes.

### Prior adjudication that constrains this one

Astra Pro already ruled on `docs/ai-workflow/blueprints/miniswan-comfyui-2026-09-16` (**PLAN REVISED**):

- **H3 is rejected on MiniSwan** (RTX 4080 SUPER, 16,376 MiB): measured peak **29,850 MiB**, exceeding the card's total by **13,474 MiB**.
- **No concurrent residency.** GSQ's measured load leaves only **2,224 MiB** free.
- MiniSwan day-one service is **CPU ffmpeg**; Wan 5B is **research-gated** behind enforceable phase-separated offload.
- **Bare `generate` must not be advertised** until profile-aware routing exists.

**Consequence for this packet: the local generation lane is the 5090, not MiniSwan.** The API must not present MiniSwan as a generation worker, and must not assume the two boxes are interchangeable.

---

## 2. Verified baseline — the hosted side (Higgsfield)

Researched at source, 2026-09-18. The transcript that prompted this work is ASR-garbled; these are the vendor's own docs.

**Contract:**

```
Base URL     https://api.higgsfield.ai
Auth         Authorization: Key <KEY_ID>:<KEY_SECRET>
             (legacy hf-api-key / hf-secret still accepted; new work uses Authorization)
Submit       POST https://api.higgsfield.ai/<model-path>
             → { status, request_id, status_url, cancel_url }
Poll         GET  /requests/<request_id>/status
Cancel       POST /requests/<request_id>/cancel     (only while all jobs still queued; 400 once started)
```

**Statuses:** `queued`, `in_progress` (non-terminal) → `completed`, `failed`, `nsfw`, `canceled` (terminal).
**Outputs:** image → `images: [{url}]`; video → `video: {url}`. Some ops add `zip`/`mov`/`jsx`/`fbx`/`ply`.
**Retention:** output URLs are kept **at least 7 days** — the vendor explicitly tells integrators to copy to their own storage.
**Billing:** prepaid USD balance, **per second of output** for video, flat per image. **Failed requests are not billed and their cost returns to the balance.** Balance cannot go below zero. Top-ups expire after one year.
**Credential shape:** key ID **and** secret, both required, shown in full only once. Vendor instructs: server-side only, never in browser/mobile code, never in logs or support messages.

**Published list rates (vendor-published, `published` provenance — NOT probed):**

| Model | Type | Rate |
|---|---|---|
| Seedance 2.5 | video | $0.0738 / sec |
| Kling 3.0 | video | $0.112 / sec |
| PixVerse 6 | video | $0.115 / sec |
| DoP | video | $0.125 / generation |
| **MiniMax H3** | video | **$0.13 / sec** |
| LTX 2.5 Pro | video | $0.17 / sec |
| Wan 3.0 | video | $0.20 / sec |
| Grok Imagine Video 1.5 | video | $0.25 / sec |
| Soul 2 / Soul Cinema | image | $0.0032 / image |
| Marketing Studio Image | image | $0.0059 / image |
| Qwen Image 3 | image | $0.03 / image |
| Recraft 4.1 | image | $0.035 / image |
| Ideogram 4.0 / Grok Imagine 2.0 | image | $0.06 / image |

**The number that matters most: Higgsfield hosts MiniMax H3 at $0.13/sec.** The 5090 already runs that same model locally at zero marginal cost. A 6-second clip is **$0.78 hosted vs $0 local.** This is the entire commercial argument for the local lane, and it is now quantifiable rather than asserted.

**Catalog families** (vendor statement): video — Seedance, Kling, Wan, MiniMax, LTX, PixVerse, Grok, DoP. Image — Recraft, Ideogram, Qwen, Soul 2, Soul Cinema, Marketing Studio Image.

**Unresolved and must not be guessed:** the exact `<model-path>` for each video model (docs show `/higgsfield-ai/soul/v2/standard` for image and the SDK shows `/v1/image2video/dop` and `flux-pro/kontext/max/text-to-image`). **The per-model paths and request schemas live behind a generated OpenAPI reference and were not all retrieved.** Any catalogue row added from this packet carries `published` provenance and an unprobed `verify()`.

---

## 3. The gap this packet exists to close

The provider layer is **internal modules**. Today the only way to use it is to import it in-process. The transcript's model — *"use the API to do X"* — requires a **callable surface**.

**What is missing:**

1. **No HTTP surface.** No way for Claude Code, Codex, a script, or a scheduler to submit a generation over the wire.
2. **No Higgsfield row.** The catalogue's only hosted entry is `minimax/hailuo-hosted` with `costPerRunUsd: null` — which the spend guard correctly treats as *unbounded-cost* and therefore refuses.
3. **No unified job model.** A local job is a ComfyUI `prompt_id` polled against `/history`. A remote job is a `request_id` with vendor-supplied `status_url`/`cancel_url`. Nothing reconciles them.
4. **No pre-flight cost estimate.** `checkRunAllowed` needs `costPerRunUsd`, a **per-run** scalar. Higgsfield video is billed **per second** — a scalar cannot express "6 seconds of Kling 3.0". This is a real type mismatch, not a config gap.
5. **No wallet surface.** The ledger exists but nothing can read the day's usage without importing the module.

**What is NOT missing, and must not be rebuilt:** licence enforcement, provenance, the spend ceilings, the image-first law, the tri-state honesty rule, the ComfyUI adapter, the graph injection. The API is a **transport and a job store** in front of a layer that already works.

---

## 4. Decisions we need from you

**D-A — Surface contract.** Specify the exact REST shape: paths, methods, request bodies, response bodies, status codes. Decide explicitly whether to mirror Higgsfield's `POST <model-path>` + `/requests/:id/status` + `/requests/:id/cancel` (integration familiarity, and one shape for both lanes) or a neutral own shape (no vendor's quirks baked in). Name the fields where the two lanes **must** differ and must not be smoothed over.

**D-B — Model identity and routing.** `comfyui/minimax-h3` (free, local, licence-restricted) and `higgsfield/minimax-h3` ($0.13/s, hosted, permitted) are **the same model at different cost and different licence**. Specify: the naming scheme, whether a caller may request a *model* without naming a provider, whether any automatic fallback is permitted, and how the licence gate interacts with a request that named only a model. State plainly whether silent fallback is allowed — the existing layer treats automatic fallback as a **rejected** behaviour.

**D-C — The wallet.** Unify local (free at the margin, but consumes exclusive GPU time) and remote (per-second USD) under one accounting model. `spendGuard` today counts **runs** and **USD**. Decide: does a local run consume a GPU-minute budget? How is a per-second video price converted to a per-run cost *before* submission, given duration is a request field? What happens when duration is unbound (as it deliberately is for the H3 graph today)?

**D-D — Auth, exposure, and the blast radius.** ComfyUI has **no authentication**; the 5090 binds loopback for that reason. The gateway will hold a Higgsfield key ID **and** secret, plus the ability to spend money. Specify: bind address, auth scheme, whether the key is a shared secret or per-caller, what the gateway must never log, and how a request arriving from an agent is distinguished from one arriving from a human. Note the existing constraint: **remote access is SSH forwarding only, never a LAN/tailnet bind.**

**D-E — The job store.** Local jobs have `prompt_id` and are polled against ComfyUI history; remote jobs have `request_id` plus vendor-supplied URLs. Specify: one job record shape, where it lives (the repo already prefers a JSON file a human can read over a schema migration), retention, what survives a gateway restart, and how an in-flight local render behaves when the gateway dies mid-poll.

**D-F — Cost truth and fail-closed pricing.** Rates above are `published`, not `probed`. Specify: how a pre-flight estimate is produced and displayed, whether an unverifiable estimate refuses or proceeds, how the ledger records a *vendor-reported* actual cost against the estimate, and how a `failed`/`nsfw` request that was never billed is recorded without inventing a spend. The vendor states failed requests are refunded to the balance — decide whether the ledger models that or refuses to.

**D-G — Slices.** Ordered slices with entry evidence, exit evidence, and a no-go boundary. The first slice must end with something **demonstrably working end-to-end over the wire**, not with a research result.

**D-H — Test plan.** Requirement-linked test IDs. At minimum: request validation, licence refusal at the API boundary, spend refusal before submission, the duration/`length` trap, job-state reconciliation, gateway restart mid-job, auth rejection, and a capability-honesty test proving the API cannot offer what it cannot run.

---

## 5. Constraints that are not negotiable

- **No paid ComfyUI nodes.** `partner/` nodes bill MiniMax credits per run. `--disable-api-nodes` stays.
- **Loopback only.** ComfyUI has no auth. Remote access is SSH forwarding, never a LAN/tailnet bind.
- **Zero PII to models; no keys in packets, logs, or error messages.** The existing `openrouterImage.mjs` already redacts a key out of a vendor error body — the same discipline applies.
- **The 5090 stays the reference and the rollback tree.** Nothing in this plan modifies the 5090's install.
- **Do not break the GSQ path.** Hermes depends on `miniswan-gsq` on 18082.
- **The licence gate stays.** `comfyui/minimax-h3` cannot be selected for commercial output in the US without a recorded grant. Do not route around it by renaming the provider.
- **Honesty over optimism.** "Cannot be determined from these figures" is an acceptable answer. A `published` rate presented as a measured cost is not.
- **The 300-line file cap (rule 4) applies**, as does the repo's rule that documentation lives beside a JSON graph, never inside it.

---

## 6. Required output contract (fixed, so the reply is diffable)

```
VERDICT                  one of: PLAN APPROVED / PLAN REVISED / BLOCKED
D-A SURFACE CONTRACT
D-B MODEL IDENTITY + ROUTING
D-C WALLET
D-D AUTH + EXPOSURE
D-E JOB STORE
D-F COST TRUTH
D-G SLICES (ordered, entry/exit evidence, no-go)
D-H TEST IDS (requirement -> test -> evidence)
IMPOSSIBLE HERE          what this API cannot honestly promise, stated plainly
BIGGEST RISK             the one thing most likely to waste days
REJECTED                 anything in this packet you are rejecting, and why
CONFIDENCE               high/medium/low per decision, with the reason
```

---

## 7. What this packet is NOT asking for

- It is **not** asking to install ComfyUI anywhere. MiniSwan's install remains gated by the 2026-09-16 adjudication and Sean's Slice 0 approval.
- It is **not** asking to enable any provider. Every catalogue row ships `enabled: false`; enablement stays an explicit act.
- It is **not** asking for a second GPU lock, a second policy module, or a second ledger. The existing `worker-resource-policy.mjs`, `spendGuard.mjs` and `provenance.mjs` are extended, not paralleled.
- It is **not** asking to spend money. No Higgsfield credential has been created. The gateway must be able to exist and be tested with the hosted lane switched off.
