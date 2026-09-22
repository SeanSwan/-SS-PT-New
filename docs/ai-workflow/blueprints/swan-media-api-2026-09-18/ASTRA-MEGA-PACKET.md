# Swan Media API — MEGA BLUEPRINT packet (hostile review of the blueprints)

**Artifact ID:** SWAN-MEDIA-API-MEGA-PACKET-2026-09-19
**Lane:** `C:/tmp/ss-media-api` @ `90f8e34ed`, branch `feat/media-api-2026-09-18`
**Base:** `SS-PT` @ `main` `2b3e7a62a`
**Gate state at this commit:** 29 gates, 1097 assertions, all green
**Owner:** Sean · **Authored by:** Sable (WorkBuddy session) · **Status:** PLAN — adjudicated once, now under Mega Blueprint pass

---

## 0. What this packet is

This is the **second** adjudication request for this lane. The first was answered — `PACKET.md`
(§1, below) was the remit, and `ASTRA-PRO-REPLY.md` (§2, below) is the reply: **PLAN REVISED**.

**So `PACKET.md` §6's output contract (VERDICT / D-A…D-H / CONFIDENCE) is ALREADY ANSWERED.**
Do not re-answer it in that shape. This pass runs under the Mega Blueprint contract instead
(PART A / PART B / PART C), and the standing decisions from `ASTRA-PRO-REPLY.md` are the
*baseline being attacked*, not questions being asked again.

The lane has since run **23 rounds of hostile review** against the code. The blueprints have
**never** been attacked the same way. That is the gap this packet exists to close.

## 1. Scope declaration — read this before anything else

**INCLUDED** (exact, so nothing is inferred):

| § | Artifact | Size |
|---|---|---|
| 2 | `PACKET.md` — the original remit and the non-negotiable constraints, in full | 16.3 KB |
| 3 | `ASTRA-PRO-REPLY.md` — the prior adjudication, in full | 32.9 KB |
| 4 | `README.md` — the lane's ledger, **four sections only**, listed below | 145.4 KB |

```
  README.md §1-421
  README.md §422-536
  README.md §1038-1128
  README.md §1129-1420
```

**EXCLUDED, and named so you do not have to guess:**

```
README.md lines 537-1037 — the per-round NARRATIVES for rounds 9-22
(roughly 55.0 KB). These are the forensic log of the hostile loop, not the blueprint.
Every defect they describe is carried in the rounds table above (rows 437-519, one row per defect,
87 rows). EXCLUDED FROM THIS PACKET — do not claim to have reviewed them. If you believe a decision
turns on a round narrative you cannot see, say so and name which round.
```

**NOT REACHABLE, and not evidence of anything:**

- No provider is enabled. Every catalogue row ships `enabled: false`.
- No live Higgsfield call has ever been made. No Higgsfield credential exists.
- ComfyUI is **not running**. The 5090 has not been touched by this lane.
- The 62-file handover patch described in §4 was generated on 2026-09-18 and **cannot be
  regenerated** — `gen-lane-patch.sh` is absent. The commit `90f8e34ed` is the handover of record.

## 2. Non-negotiables (restated so they bind this pass too)

- No paid ComfyUI nodes. `partner/` nodes bill credits; `model/` nodes do not.
- Loopback only. ComfyUI has no auth; remote access is SSH forwarding, never a LAN/tailnet bind.
- Zero PII to models; no keys in packets, logs, or error messages.
- The 5090 stays the reference and the rollback tree. Nothing in this plan modifies its install.
- Do not break the GSQ path (`miniswan-gsq` on 18082).
- The licence gate stays. Do not route around it by renaming a provider.
- The 300-line file cap (rule 4) applies.
- **Honesty over optimism.** "Cannot be determined from these figures" is an acceptable answer.

---


---

# §2 — PACKET.md (the original remit, answered once already)

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


---

# §3 — ASTRA-PRO-REPLY.md (the prior adjudication: PLAN REVISED)

# Consult reply — GPT-6 Astra Pro (openai/gpt-6-astra-pro) — 2026-09-18T21:23:38.510Z

> tokens: prompt=30173 completion=15656 | finish_reason: stop | max_tokens: 60000

VERDICT                  **PLAN REVISED**

Adopt a **neutral, asynchronous quote → job → asset API**, with provider-specific execution, duration, pricing, licence and cancellation facts kept visible. Do not make “local GPU execution” and “hosted billable generation” interchangeable merely because both produce video.

**Money is bounded by server-owned caller allowances, atomic reservations before submission, and explicit approval of a priced route—not by an agent’s willingness to supply a spending limit.** Unknown prices, unknown billable quantities and ambiguous submissions must stop further spending rather than trigger retries or fallback.

Below, limits and retention periods are **proposed policy defaults**, not measured performance claims. Packet measurements remain scoped to their recorded configurations; vendor documentation remains `published`.

## D-A SURFACE CONTRACT

### Decision: neutral `/v1` API; do not mirror Higgsfield

Ranked priorities:

1. Prevent unauthorized execution and spending.
2. Preserve durable job identity across crashes.
3. Normalize lifecycle and artifact access.
4. Preserve—not conceal—backend differences.

All endpoints require gateway authentication. JSON responses include `request_id`; timestamps use UTC ISO 8601. Reject unknown request fields.

### Endpoints

| Method and path | Request | Success |
|---|---|---|
| `GET /v1/models` | None | `200 {models:[...]}` |
| `POST /v1/quotes` | Generation specification below | `201 {quote:...}`; creates no provider submission or spending reservation |
| `POST /v1/jobs` | `{quote_id, max_cost_usd}` plus required `Idempotency-Key` header | `202 {job:...}`, `Location: /v1/jobs/:id` |
| `GET /v1/jobs/:id` | None | `200 {job:...}` |
| `POST /v1/jobs/:id/cancel` | `{}` | `202 {job:...}` if cancellation requested; `200` if already canceled |
| `GET /v1/assets/:id` | None | `200` metadata, checksum, media metadata and provenance |
| `GET /v1/assets/:id/content` | None | `200` binary content; `206` for supported range requests |
| `GET /v1/wallet` | None | `200` authorized caller’s limits, reservations, settlements and GPU usage |

No public model-path passthrough, arbitrary graph submission, vendor URL submission or generic proxy endpoint.

### Quote request

```json
{
  "route": {
    "provider_model": "comfyui/wan-2.2",
    "execution_profile": "wan22-ti2v5b-832x480-49f-20steps"
  },
  "operation": "text-to-video",
  "input": {
    "prompt": "A paper sailboat crossing a painted sea",
    "seed": 1234
  },
  "output": {
    "duration_mode": "profile"
  },
  "use_context": {
    "commercial": true
  },
  "preview_asset_id": null
}
```

The profile identifier above is a **proposed identifier for the measured configuration**, not a claim that this profile is already registered.

Rules:

- Exactly one of `route.provider_model` or `route.model`.
- `execution_profile` is required for local execution.
- Operations are an enum: `text-to-video`, `image-to-video`, `text-to-image`; each is additionally gated by that route’s capabilities.
- Image conditioning uses a server-owned `input.image_asset_id`, never an arbitrary URL or filesystem path.
- `output.duration_mode` is either:
  - `profile`: no `duration_seconds` allowed;
  - `seconds`: positive `duration_seconds` required and validated against the retrieved model schema.
- Width, height and other tunables are accepted only where the selected profile/schema explicitly binds them. No generic property forwarding.
- `use_context.commercial` cannot override stricter server-owned licence context.
- `preview_asset_id` invokes the existing image-first policy. A caller-provided boolean such as `preview_done:true` is insufficient.

### Quote response

A quote contains:

```text
id, created_at, expires_at, normalized_request_hash,
selected_route, execution_profile_hash,
requested_output, duration_binding,
licence_decision, capability_evidence,
pricing, cancellation, requirements
```

`pricing` contains:

```text
currency: "USD"
basis: "none" | "output_second" | "generation" | "image"
rate_usd: decimal-string | null
rate_provenance: "probed" | "published" | "claimed" | null
rate_source, rate_checked_at
billable_quantity: number | null
estimated_usd: decimal-string | null
reservation_usd: decimal-string | null
bound_basis: object | null
```

A successful quote must be admissible under current policy. Unpriceable or non-runnable requests receive an error, not a spendable quote with an optimistic zero.

**Policy:** quotes expire after five minutes. Job admission rechecks provider enablement, credentials, price version, licence, preview evidence, profile hash and available budget. A quote is neither a reservation nor permission to execute indefinitely.

### Job response

```text
id, state, state_reason, created_at, updated_at,
selected_route, execution_profile, requested_output,
execution, billing, cancellation, assets, error
```

States:

```text
queued → submitting → running → finalizing → succeeded
                     ↘ reconciling
terminal alternatives: failed | nsfw | canceled
```

`reconciling` is nonterminal and may require operator intervention. A polling timeout is not a provider failure.

Deliberate differences:

| Field | Local | Hosted |
|---|---|---|
| `execution.kind` | `local_gpu` | `hosted` |
| Execution identity | Worker/profile/graph hash | Vendor/model/schema version |
| Duration | Fixed profile unless a mapping is proven | Validated model-specific seconds |
| Money | Zero provider/API charge for audited local graph | Published pricing plus reservation |
| Resource accounting | Exclusive GPU occupancy | Hosted billable units |
| Cancellation | Depends on ownership-safe queue/interrupt support | Published queued-only cancellation |
| Licence | Local weight-execution restrictions | Independently evidenced hosted-service rights |

Expose `cancellation.supported_now` and `cancellation.reason`; never promise that “cancel requested” means “execution stopped” or “not billed.”

### Status and error contract

```json
{
  "error": {
    "code": "DURATION_UNBOUND",
    "message": "This profile does not accept duration in seconds.",
    "retryable": false,
    "details": {}
  },
  "request_id": "..."
}
```

| Status | Meaning |
|---|---|
| `400` | Malformed JSON or missing idempotency header |
| `401` | Missing/invalid authentication |
| `403` | Scope, licence, enablement, preview or allowance refusal |
| `404` | Unknown or unauthorized object |
| `409` | Ambiguous route, changed quote, idempotency conflict or cancellation too late |
| `410` | Expired quote or deleted artifact |
| `413` | Request/input exceeds configured size limit |
| `422` | Unsupported capability, unbound duration, invalid schema or unbounded price |
| `429` | Rate, daily run or queue-admission ceiling |
| `503` | Durable store/resource policy unavailable; admission fails closed |

Budget refusals use `403 BUDGET_EXCEEDED`; include sanitized available/reserved amounts.

An accepted asynchronous job reports subsequent provider failure through its job record, not by retroactively changing its submission HTTP status.

## D-B MODEL IDENTITY + ROUTING

### Decision: provider-qualified execution identity is authoritative

Retain:

- `comfyui/minimax-h3`
- `comfyui/wan-2.2`
- `minimax/hailuo-hosted`

Add Higgsfield identities only as disabled catalogue data until their contracts are retrieved:

- `higgsfield/minimax-h3`
- Corresponding verified catalogue identifiers for other vendor offerings.

Use a separate family identity such as `minimax-h3` for discovery. Also record profile, checkpoint/workflow hash or hosted model version where available.

**The packet establishes common model branding, not identical weights, settings, output quality or execution behaviour.** Hosted/local equivalence is an unmeasured hypothesis; resolving it requires vendor version evidence and controlled comparison runs.

### Model-only requests

Permitted for quoting only when a **server-owned routing profile** maps the model family to exactly one provider-qualified target.

- No profile or multiple candidates: `409 ROUTE_SELECTION_REQUIRED`.
- The quote discloses the selected provider and price.
- Job submission executes only that quoted target.
- No default “cheapest eligible provider” search.
- No bare `generate` advertisement without this routing support.

### Licence order

1. Resolve identity through the explicit request or pinned routing profile.
2. Apply the existing licence gate.
3. Validate capabilities, duration and pricing.
4. Produce a quote.

If the selected local H3 route fails the licence gate, return `403 LICENSE_DENIED`. Do not search for another provider.

Retain the exact distinction between weight execution and output rights. Apply grant and territory rules from the existing licence policy; a caller’s claim of a different location is not evidence.

The packet’s description of hosted H3 as “permitted” is **not sufficient hosted licence evidence**. Retrieve hosted commercial-use and territory terms before enabling that row. Local restrictions neither automatically transfer to hosted execution nor disappear merely because a provider is renamed.

**Silent fallback is prohibited.** A different provider requires a new quote and a new explicit submission. A failed local job must never silently become a paid hosted job.

## D-C WALLET

### Decision: extend the existing ledger into a multi-resource reservation ledger

One wallet accounts for:

```text
admitted runs
USD reserved
USD settled
USD unresolved exposure
GPU occupancy seconds, measured
GPU occupancy seconds, reserved when an enforceable bound exists
```

This is an extension of `spendGuard.mjs`, not a second spending system.

### USD admission

Use fixed-point decimal/integer arithmetic, never binary floating-point money arithmetic.

Before backend submission, atomically check:

```text
settled today
+ all unresolved outstanding reservations
+ new reservation
<= applicable daily USD allowance
```

Also enforce per-job, per-caller and global ceilings. The caller’s `max_cost_usd` can only reduce a server allowance.

Keep the current defaults:

- USD: **$0/day**
- Volume: **50 admitted jobs/day**

Rejected preflight calls consume neither. Admitted jobs consume volume even if subsequently failed or canceled; refunds must not enable unlimited retry traffic. Idempotent replays consume nothing additional.

Outstanding reservations survive midnight and continue reducing available allowance. Also enforce total prepaid funding/exposure limits; a day boundary cannot create credit.

### Per-second pricing

For a contractually fixed billable duration:

```text
estimate = published rate × contract-defined billable seconds × output count
```

For published Higgsfield H3 pricing:

```text
$0.13 × 6 = $0.78
```

That is **published-rate arithmetic**, not a measured invoice and not proof that the unresolved H3 endpoint accepts six seconds.

A reservation requires a documented maximum charge under the actual request schema, including rounding, minimum duration, variants and fees. An arbitrary percentage buffer is not evidence of a bound.

DoP must use its published per-generation basis; images use per-image pricing. Do not infer pricing units from media type.

### Unbound local duration

For the current H3 graph:

- `duration_mode:"profile"` is admissible if all other gates pass.
- Any requested seconds return `422 DURATION_UNBOUND`.
- Never bind seconds to `length`, `frames`, or `value` through name matching.
- Return actual artifact duration after decoding/probing the completed file.
- Do not advertise an inferred input-to-duration mapping.

A paid route with unknown billable duration is refused, regardless of whether another local profile can run.

### GPU budget

**Local runs consume measured GPU-occupancy accounting, but day one does not pretend to enforce a predictive GPU-minute spending budget.**

Start with the existing resource policy’s exclusive lease, admitted-run ceiling and a bounded gateway queue. Proposed queue policy: eight waiting local jobs, one active lease.

Measure occupancy from acquisition through safe release, including loading/finalization while the GPU remains reserved. Record render wall time separately.

An enforceable hard GPU-minute allowance requires:

- A documented maximum lease duration;
- Safe, ownership-scoped termination;
- Recovery proof after timeout.

Until those exist, report `gpu_budget_enforcement:"metered_only"` and refuse requests requiring a guaranteed GPU-time cap.

The recorded Wan and H3 runs establish observed timings and memory peaks, not runtime maxima, sustained throughput or coexistence capacity. Do not size concurrency from them. Extend `worker-resource-policy.mjs`; do not create another GPU lock.

## D-D AUTH + EXPOSURE

### Decision: loopback and per-caller opaque tokens

- Gateway binds `127.0.0.1` only; IPv6, if enabled, binds `::1` explicitly.
- ComfyUI remains loopback-only.
- Remote callers use SSH forwarding exclusively.
- No LAN/tailnet bind, browser credential delivery or direct vendor access.
- Disable browser CORS by default.

Use independently revocable, high-entropy opaque bearer tokens. Store only token verifiers, with constant-time comparison. Server records bind each token to:

```text
principal_id
principal_type: human | agent | service
scopes
allowed_routes
per-job/day/volume limits
routing profile
approval policy
```

Suggested scopes: `models:read`, `quotes:create`, `jobs:create`, `jobs:read`, `jobs:cancel`, `assets:read`, `wallet:read`.

A request is classified by its authenticated principal, **not by a `human:true` body field or User-Agent**. This identifies the credential’s authority; it cannot prove a human physically initiated the request.

Agent tokens default to zero paid allowance. A human-controlled administrative action may establish a capped grant tied to principal, routes, expiry and optional quote/input hash. The agent cannot issue or enlarge its own grant.

Higgsfield key ID and secret remain gateway-only in an OS-restricted secret source. Neither component belongs in the repo.

### Never log

- Authorization headers, caller tokens, vendor key ID or secret;
- Raw vendor error bodies;
- Signed output URLs;
- Raw prompts, reference media or request bodies by default;
- PII, secret-bearing configuration or support dumps.

Log allowlisted identifiers, state transitions, safe error codes and accounting amounts. Redact before serialization and exception reporting.

Zero-PII submission is an admission requirement for both lanes. Use approved synthetic/nonpersonal inputs initially; reject inputs that cannot meet the existing prompt/input policy. Automated PII detection alone cannot honestly guarantee absence of PII.

Vendor polling/cancel URLs are untrusted input: validate against the configured vendor origin and retrieved endpoint contract. Never forward credentials to a supplied alternate host. Downloads require SSRF controls, redirect validation, size limits and no vendor Authorization header leakage.

## D-E JOB STORE

### Decision: readable JSON with one serialized durable writer

Use an OS-restricted runtime directory outside the checkout:

```text
state/
  jobs/<job-id>.json
  quotes/<quote-id>.json
  transactions/<transaction-id>.json
  spend-ledger.json
assets/<asset-id>/...
```

Keep JSON readably formatted. `transactions/` is a crash-recovery journal for updates to the **existing ledger and job records**, not a separate accounting authority.

Require one gateway writer/process lock. Write through temporary files, flush, atomically replace and validate startup recovery on the actual Windows filesystem. A file’s readability is not evidence of crash safety.

### Internal job record

```text
schema_version
id, owner_principal_id
idempotency_key_digest, normalized_request_hash
quote_snapshot
provider_model, model_family, worker_id
execution_profile_hash, graph_hash, schema_hash
licence_snapshot, input_provenance_refs
state, state_reason, transition_timestamps
backend:
  kind, prompt_id?, request_id?, validated_poll_ref?, validated_cancel_ref?
submission:
  attempt_id, intent_persisted_at, dispatch_state
resource_lease_ref
ledger_reservation_ref
cancellation:
  requested_at, provider_acknowledged_at, effective_at, reason
assets[]
sanitized_error
reconciliation:
  last_observed_provider_state, last_poll_at, next_poll_at, operator_required
```

Freeze per-asset provenance using the existing module. The public response excludes credentials, raw vendor URLs and internal filesystem paths.

### Submission and restart rules

1. Validate.
2. Durably commit job, idempotency mapping and reservation.
3. Persist submission intent.
4. Submit once.
5. Persist backend ID.
6. Poll/reconcile.
7. Copy and verify outputs; then publish asset references.

The critical failure window is **backend acceptance before backend ID persistence**.

- Search by durable correlation metadata only if the backend demonstrably supports it.
- Without reliable recovery, enter `reconciling`, keep the reservation and require intervention.
- Never blindly repeat a generation POST.
- `transportRetry.mjs` must distinguish safe GET retries from potentially duplicate paid submissions.

On gateway death during a local render, ComfyUI is a separate process. Expected behaviour is continued rendering, but this lifecycle property must be tested in Slice 1. On restart, reconcile the recorded `prompt_id` against queue/history and the existing resource lease.

Missing history is not proof of failure. Keep the job unresolved until queue/history/artifact or operator evidence settles it.

A gateway crash must not release an active GPU lease or admit an overlapping job. Recovery must use the existing resource-policy authority. If that authority cannot recover ownership, block dispatch.

### Cancellation and completion

- Gateway-queued, undispatched job: cancel locally and release its reservation.
- Dispatched local job: cancel only through ownership-safe adapter behaviour. Never issue a global interrupt that could stop unrelated work.
- Hosted queued job: request cancellation; vendor acknowledgment and accounting evidence are distinct.
- Vendor cancellation `400` after start maps to `409 CANCEL_TOO_LATE`, not `canceled`.

`completed` at the vendor becomes `finalizing` locally. `succeeded` means the artifact has been copied to controlled storage, verified and associated with provenance. Artifact-ingest failure must not erase a successful billable vendor generation.

### Retention policy

Proposed defaults:

- Nonterminal/unresolved jobs and reservations: never automatically purge.
- Terminal job metadata and idempotency records: 90 days.
- Artifacts: 30 days unless pinned.
- Ledger audit events: 365 days.
- Licence/provenance snapshots: at least artifact lifetime, extended by the actual licensor commitment.

Forbid reuse of an expired idempotency key rather than treating it as a fresh paid request. Expired artifacts return `410`.

Higgsfield’s “at least seven days” retention is a **vendor-published claim**. Copy immediately; do not design around waiting until day seven.

## D-F COST TRUTH

### Decision: distinguish price evidence, estimated obligation and settled charge

A `published` rate can support a clearly labeled estimate. It cannot by itself prove the final charge.

Keep separate fields:

```text
estimated_usd
reserved_usd
vendor_reported_gross_usd
vendor_reported_refund_usd
settled_net_usd
settlement_evidence
settlement_status: pending | reconciled | disputed
```

Do not label vendor-reported accounting as independently measured. Preserve source and timestamp.

### Hosted enablement gate

Before enabling a priced route, require:

1. Exact model path and archived request/response schema;
2. Valid duration and output-count constraints;
3. Pricing units, rounding and maximum-charge basis;
4. Hosted licence evidence;
5. Explicit owner acceptance of published pricing for bounded execution;
6. Reconciliation evidence source;
7. Image-first compliance;
8. Explicit provider enablement and positive allowance.

At present, those prerequisites are incomplete. Hosted catalogue discovery may be built, but live hosted submission remains disabled.

Unverifiable estimate or unknown maximum charge: `422 PRICE_UNBOUNDED`. No “submit and learn the invoice.”

Use a configurable pricing-freshness policy; proposed initial default is 24 hours. Freshness is not a vendor price lock. If pricing cannot be revalidated to policy, fail closed.

### Settlement

- Vendor-reported charge: record it with evidence and release only the unused reservation.
- Vendor-reported zero charge: settle at zero.
- Confirmed debit followed by confirmed refund: preserve both events; net them in the wallet.
- Failure without accounting evidence: record the failure and leave settlement pending.
- `nsfw` does not imply a refund; the packet provides no such billing assurance.
- Vendor status `failed` plus a published refund policy is an expected refund, not proof that a particular refund posted.

Thus the ledger **models refunds**, but never fabricates them.

If observed charge exceeds reservation, record the full charge, mark the breach and disable further paid submissions pending review. Accounting must not clip reality to the budget.

### What actually bounds money

The gateway can bound admitted exposure under a validated pricing contract. It cannot force an external vendor to honor that contract.

Use a dedicated funded vendor balance/account where available, prohibit automatic top-ups, and isolate unrelated spending. The published “balance cannot go below zero” statement is an additional **vendor assurance**, not a measured gateway guarantee. If balance isolation cannot be established, do not present account balance as this API’s exclusive spending cap.

Local `$0` means **zero provider/API charge for audited local execution**. It does not establish zero electricity, depreciation, operator time or opportunity cost.

## D-G SLICES (ordered, entry/exit evidence, no-go)

| Slice | Entry evidence | Exit evidence | No-go boundary |
|---|---|---|---|
| **1. Local over-wire vertical slice** | Existing adapter/policy tests; audited Wan workflow matching the measured configuration; resource-policy availability; explicit temporary operator enablement for the test | Authenticated HTTP quote → job → polling → verified downloaded video; durable job and ledger entry; frozen provenance; zero external provider requests; restart mid-poll successfully reconciled | No production-default enablement, H3 licence bypass, 5090 install changes, GSQ changes, paid nodes or remote credentials |
| **2. Admission and crash hardening** | Slice 1 evidence | Concurrent budget/idempotency tests; write-boundary crash recovery; loopback enforcement; licence and duration refusal over HTTP; resource ownership survives restart | No dispatch after uncertain reservation/lease recovery; no blind POST retries |
| **3. Hosted contract, offline only** | Retrieved model-specific OpenAPI and terms, versioned beside code | Disabled catalogue rows; bounded-price calculations; mocked submit/poll/cancel/artifact flows; credential-redaction and refund tests | No guessed paths, live calls, enabled hosted capability or claim of probed verification |
| **4. Optional owner-authorized hosted verification** | Separate explicit spending approval; credentials provisioned securely; all D-F gates met; fixed caller/job/funding ceilings | One approved request’s lifecycle, stored artifact and accounting reconciliation; observed capabilities marked `probed` only for the tested route/configuration | Not authorized by this packet; no run if charge bound or licence evidence is missing |
| **5. Explicit routing profiles and operations** | Proven route-specific contracts; owner-approved profiles | Model-only quoting selects one disclosed target; operator recovery procedure; retention restore test; wallet reflects outstanding and settled exposure | No silent fallback, MiniSwan generation registration or unmeasured latency/quality promises |

Slice 1 is not “build endpoints and mock success.” Its exit is an actual video served over the authenticated API.

If the measured Wan graph is not available to the existing adapter, Slice 1’s entry gate is unmet. Locate and audit the actual graph; do not invent a workflow or quietly switch to restricted H3.

All slices keep modules under the 300-line cap, documentation beside graph JSON, catalogue defaults disabled and `--disable-api-nodes` intact. Audit graph node definitions/categories and nested execution paths—not display names alone—to exclude `partner/` execution.

## D-H TEST IDS (requirement -> test -> evidence)

| Requirement | Test ID and test | Required evidence |
|---|---|---|
| D-A strict validation | **API-001**: malformed JSON, unknown fields, mutually exclusive route/duration fields, invalid enums | Expected `400/422`; adapter call count zero |
| D-A durable async admission | **API-002**: submit through loopback HTTP and retrieve actual local artifact | `202`, durable transitions, checksum, decoded media metadata |
| D-B licence at boundary | **LIC-001**: US commercial local H3 without sufficient recorded grant | `403 LICENSE_DENIED`; no reservation or submission; no hosted fallback |
| D-B truthful model identity | **ROUTE-001**: model-only request with absent/ambiguous profile; selected route becomes ineligible | `409` or explicit refusal; never another provider |
| D-C spend before submission | **PAY-001**: positive-price request with default zero allowance | `403`; vendor transport never called |
| D-C atomic allowances | **PAY-002**: concurrent submissions exceed remaining budget; cross midnight with held reservations | Only admissible reservations commit; exposure remains counted |
| D-C/F price dimensions | **PRICE-001**: published H3 six-second arithmetic, DoP generation pricing, image counts, unknown rounding | `$0.78` labeled published; proper units; unknown bound refused |
| D-C duration trap | **DUR-001**: current H3 receives `duration_seconds:4` | `422 DURATION_UNBOUND`; node 6 `length` unchanged; no submission |
| D-C profile duration | **DUR-002**: run profile-only request and inspect output | No fabricated requested seconds; actual duration from artifact inspection |
| D-C exclusive resource | **GPU-001**: two local jobs, existing competing lease, gateway crash | No overlapping gateway execution or second lock; preserved lease authority |
| D-D authentication | **AUTH-001**: missing/invalid/revoked token and cross-principal job access | `401/404`; no backend calls or object disclosure |
| D-D authority | **AUTH-002**: agent sends `human:true`, larger limits or forged approval | Rejected; server principal/allowances unchanged |
| D-D network boundary | **NET-001**: attempt non-loopback bind, inspect listeners, exercise SSH forwarding | No LAN/tailnet listener; forwarded authenticated call succeeds |
| D-D secret/PII controls | **SEC-001**: injected keys in vendor errors, signed URLs, disallowed inputs, hostile redirects | No secrets in responses/logs; blocked inputs/downloads |
| D-E state reconciliation | **JOB-001**: replay all Higgsfield states, local history states and transient poll failures | Correct mapping; timeout is nonterminal; no premature refund |
| D-E restart mid-job | **JOB-002**: terminate gateway during real local render and restart | Same job/backend identity, one render, recovered lease and artifact |
| D-E uncertain submission | **JOB-003**: crash after backend accepts but before ID persists | Recovered correlation or held `reconciling`; no duplicate POST |
| D-E durable accounting | **STORE-001**: terminate at every journal/write/rename boundary | Recovered job and reservation agree; corrupt state blocks dispatch |
| D-E cancellation | **CANCEL-001**: undispatched local, owned active local, hosted queued and hosted started | Truthful state; no unrelated interrupt; late cancellation `409` |
| D-E artifact ownership | **ASSET-001**: vendor completes but copying fails; later URL expires | No false success or erased charge; eventual recovery or explicit ingest failure |
| D-F refund truth | **BILL-001**: failed without evidence, confirmed zero charge, debit/refund, unbilled `nsfw` evidence | Pending where unknown; zero only with evidence; auditable refund events |
| D-A/B honesty | **CAP-001**: claimed capability, disabled route, missing graph, unbound duration, missing hosted schema | Claimed values remain `null`; `runnable:false` with reasons; quotes refused |
| No paid nodes | **GRAPH-001**: graphs with misleading names, `partner/` categories and indirect forbidden nodes | Rejected before ComfyUI submission |
| Preserve baseline | **REG-001**: existing registry, image-first, provenance and GSQ regression suite | No weakened licence/policy checks, GSQ configuration changes or new competing ledger |

For `CAP-001`, readiness must distinguish:

```text
declared support
evidence level
current enablement
verified executable binding
last readiness observation
```

A published vendor capability may remain visible as published data. It must not become `runnable:true` merely because its name exists in the catalogue.

## IMPOSSIBLE HERE

This API cannot honestly promise:

- Arbitrary local H3 duration in seconds with the present graph.
- Identical local and hosted H3 outputs, weights or quality.
- A render-time SLA, sustainable throughput or safe parallel GPU residency from the recorded single-run observations.
- Hosted eligibility based solely on catalogue branding.
- Exact hosted spending from a list rate without the billable-quantity contract.
- Automatic refund settlement without accounting evidence.
- Exactly-once backend execution across an acceptance/persistence crash window without backend recovery or idempotency support.
- Cancellation after hosted work starts, or ownership-safe local interruption before it is tested.
- Generation on MiniSwan.
- Zero total economic cost for local generation.
- Absolute PII detection or a cryptographic proof that a request was personally initiated by a human.

**Open measurements:** repeat each approved local profile under controlled starting residency to characterize runtime/peak-memory distributions; test crash/cancellation ownership; inspect output duration for each exact graph configuration; reconcile a separately authorized hosted charge against its quote. Until then, those performance, recovery and billing behaviours remain unmeasured hypotheses.

## BIGGEST RISK

**Treating a model name and a published price as an executable, bounded contract.**

That shortcut simultaneously reopens the `duration → length` bug locally and invents hosted request/billing semantics. Days will disappear debugging apparently valid “unified” requests whose units, licence or executable target were never established. Pin exact execution profiles and retrieved hosted schemas before generalizing.

## REJECTED

- **Vendor-shaped public API:** bakes one vendor’s endpoint and cancellation quirks into both lanes.
- **“Same model, interchangeable backend”:** branding is not operational equivalence.
- **“Hosted H3 is permitted” without terms evidence:** unsupported licence conclusion.
- **A flat catalogue `costPerRunUsd` for variable-duration video:** retain compatibility where necessary, but derive the scalar per validated request.
- **Zero as the fallback for unknown cost:** violates existing fail-closed and image-first semantics.
- **Duration name matching:** dimensionally unsafe and already contradicted by observed output.
- **Silent fallback or automatic generation retries:** can duplicate execution and spend.
- **Immediate refund on `failed` or `nsfw`:** confuses a status/policy statement with settlement evidence.
- **Plain JSON writes without transactional recovery:** readable state is not consistent state.
- **Predictive GPU-minute guarantees from smoke timings:** observations are not enforceable maxima.
- **Any second resource lock, ledger or policy engine:** extend the existing authorities.
- **Any implied authorization to enable providers or spend:** neither is granted by this adjudication.

## CONFIDENCE

| Decision | Confidence | Reason |
|---|---|---|
| **D-A** | **High** | Neutral asynchronous admission fits both documented lifecycles without hiding backend differences. |
| **D-B** | **High** | Explicit provider identity and no fallback preserve existing policy; hosted rights remain an enablement gate. |
| **D-C** | **High** | Reservation accounting resolves variable-unit pricing; GPU hard limits correctly remain unavailable without enforcement evidence. |
| **D-D** | **High** | Loopback, SSH-only access and per-principal limits satisfy the stated exposure constraints. |
| **D-E** | **Medium** | Design handles ambiguity explicitly, but Windows crash durability and existing resource-lease recovery require tests. |
| **D-F** | **Medium** | Accounting policy is clear; actual Higgsfield charge bounds and reconciliation interfaces remain unresolved. |
| **D-G** | **High** | First exit is genuine local over-wire execution; paid verification is separately gated. |
| **D-H** | **High** | Tests target the specified failure modes with observable refusal, recovery and accounting evidence. |


---

# §4 — README.md, the lane ledger (selected sections; see §1 scope declaration)


## §4.1 — README.md §1-421 — the ledger, part 1: what was asked, the verdict, what exists now, the readiness receipt, the flow demonstrated over a real socket

# Swan Media API — 2026-09-18

**Read this file first.** It is the index for the packet, the adjudication, the code that came
out of them, and — most importantly — the honest line between what is proven and what is not.

| File | What it is |
|---|---|
| `PACKET.md` | The consult packet sent to Astra. Remit, verified baseline, the gap, decisions D-A…D-H, constraints. |
| `ASTRA-PRO-REPLY.md` | The adjudication. Live, 30,173 prompt / 15,656 completion tokens, `finish_reason: stop` — not truncated. |
| `README.md` | This file. Verdict, decision summary, readiness receipt, open work. |

---

## What was asked

Sean's request, in one sentence: *make the MiniMax H3 / ComfyUI setup I already have behave like my own
callable API, and add Higgsfield's API model to it — get it as close as we can, then hand it over so I
can take over.*

Three decisions he made up front, and they shaped everything below:

- **Target** — a new worktree off `main`, not the engine branch.
- **Astra** — run it live on OpenRouter, not offline.
- **Surface** — a REST gateway: submit a generation, poll status, fetch the artifact.

---

## Verdict: **PLAN REVISED**

Astra did not approve the plan and did not reject it. It rewrote three load-bearing parts, and all
three had already been built before the review ran — which is the entire argument for running the
review live rather than offline.

> Adopt a **neutral, asynchronous quote → job → asset API**, with provider-specific execution,
> duration, pricing, licence and cancellation facts kept visible. Do not make "local GPU execution"
> and "hosted billable generation" interchangeable merely because both produce video.
>
> **Money is bounded by server-owned caller allowances, atomic reservations before submission, and
> explicit approval of a priced route — not by an agent's willingness to supply a spending limit.**

### The three things that were already built and were rejected

| Built | Astra's ruling | What changed |
|---|---|---|
| A **Higgsfield-shaped** public API (`POST /v1/generations` → `{request_id, status_url, cancel_url}`) | *"Do not make 'local GPU execution' and 'hosted billable generation' interchangeable merely because both produce video."* | Rewrote to `POST /v1/quotes` (prices, spends nothing) → `POST /v1/jobs` (requires the quote, a `max_cost_usd` ceiling, and an `Idempotency-Key`). Submission and payment are no longer the same act. |
| `commercialUse: 'permitted'` on the hosted rows | *"The packet's description of hosted H3 as 'permitted' is NOT sufficient hosted licence evidence."* | The rows carry `evidence: 'unretrieved'` / `commercialUse: 'unverified'`, and `registry.resolve()` **refuses** any commercial request against a row in that state. The previous value let a hosted call proceed on the strength of an assumption. |
| **Float** money arithmetic (`toFixed(4)`) | *"Use fixed-point decimal/integer arithmetic, never binary floating-point money arithmetic."* | Rewrote `costEstimate.mjs` around integer micro-dollars. `0.1 + 0.2 !== 0.3` in binary floating point, and a ledger that accumulates that error drifts in the direction that admits a run the ceiling should have refused. |

The third one is the one that would have been invisible. It looked correct, it produced `0.78`, and it
was wrong at exactly the boundary where being wrong costs money.

---

## What exists now

### Provider layer — `shared/providers/video/`

| File | Role | Lines |
|---|---|---|
| `catalogue.mjs` | **DATA.** Local rows whose behaviour was measured on hardware we own. Validates every row at import. Round 16 gave every row a real `modelVersion` — the WEIGHTS, not the provider. | 208 |
| `catalogueHosted.mjs` | **DATA.** Hosted rows whose behaviour is a vendor's published claim. Round 16 derives each row's `modelVersion` from the same rate-card entry that names the model. | 183 |
| `provenanceTags.mjs` | `probed` / `published` / `claimed`, extracted to break an import cycle. | 25 |
| `provenance.mjs` | **The durable record promised to the licensor.** Freezes the licence as it stood at generation time and welds the policy flags to the asset. **Round 16** stopped it filling an EVIDENCE field with a fallback: `modelVersion` no longer falls back to the provider id, a non-array exclusion list is recorded as `null` rather than spread into characters, and a boolean the caller never supplied is recorded as unknown instead of `false`. Round 17 moved `PROVENANCE_SCHEMA` to **2** — a field whose domain widens to `null` is a parse change — and made `auditProvenance` refuse a record whose model version repeats its provider. | 275 |
| `specShape.mjs` | **The shape contract.** `assertSpecShape`, extracted from `catalogue.mjs` for rule 4. Round 14 added the LICENCE block: a row whose licence is a bare string, or whose `commercialUse` is outside the vocabulary, is now rejected at import rather than read as a permission at request time. Round 16 added `modelVersion` (a non-blank string that may not equal the provider id) and required `licence.requiresAttribution` to be a boolean, because both are copied into the provenance record. Round 17 made the id comparison **normalised**, so a padded or differently-cased id is rejected too. | 257 |
| `registry.mjs` | **BEHAVIOUR.** `resolve()`, `validateVideoRequest()`, the licence evidence gate. Round 16 exposes `modelVersion` through `capabilities()` — its absence was why every record fell back to the provider id. | 283 |
| `licenceTerms.mjs` | **The CLOSED licence vocabulary, as DATA.** `COMMERCIAL_USE` (four positions), `evidenceUnretrieved()`, `exclusionList()`. Shared by the validator and the judgement so the two cannot disagree about which values exist — the same move `provenanceTags.mjs` makes for provenance, for the same reason. | 146 |
| `licenceGate.mjs` | **The licence JUDGEMENT**, extracted from `registry.mjs` for rule 4. Returns a refusal; `territories()` decides who names the jurisdiction. Round 14 made it fail **closed** on anything it does not recognise, including a missing position; round 15 made `commercial` itself a strict boolean. | 201 |
| `normalizeResponse.mjs` | Vendor response-envelope flattening, extracted from `registry.mjs` for rule 4. | 50 |
| `promptPolicy.mjs` | **The content guardrail, and a named commitment.** The 2026-08-16 request promised *"a policy filter runs on every prompt before submission; no depiction of identifiable real people without consent, no minors, no deceptive or impersonating content."* Round 5 fixed a false-positive guard that was tested against the WHOLE prompt, so a place name suppressed the person-name flag for every name in it. **Round 18 found it had no row in this table** — the same omission as `provenance.mjs` in round 16, which is why section G of round 18's probe now asserts that every module in the lane has one. | 260 |
| `costEstimate.mjs` | Rate × duration → cost, in integer micro-dollars. | 248 |
| `spendGuard.mjs` | **The GLOBAL ceiling.** Volume + spend caps, fail-closed. Refuses a ledger count it cannot trust. Takes an OPTIONAL caller scope as its fourth parameter. | 188 |
| `usageLedger.mjs` | **Persistence**, split out of `spendGuard.mjs` for rule 4. The day-scoped usage ledger, now with an additive per-caller split. **Round 21** attacked its WRITE half, which twenty rounds had left alone, and found it undoing everything the read half refuses: `record()` wrote over a file it could not parse (clearing `degraded` and re-enabling billing after one free run), the 30-day trim silently discarded the day being recorded, and a write that failed threw from `generateVideo.mjs` after the render had already succeeded. `dayRecordIsTrustworthy` is now the one predicate both halves call, and a write that does not land degrades the ledger rather than failing the job. | 268 |
| `ceilingGate.mjs` | **The per-JOB judgement.** `jobRefusal()` applies the caller's `max_cost_usd` to the CHARGE. Returns refusals, never throws. Round 13 split the per-caller half out for rule 4 and re-exports it, so no import path changed. | 124 |
| `callerCeiling.mjs` | **The per-CALLER judgement**, split out of `ceilingGate.mjs` in round 13 when the combined file reached 347 lines. `callerRefusal()`, `callerLimits()`, `callerScope()`. | 263 |
| `comfyuiLocal.mjs` | **The local adapter — the first thing to run on the render box.** `capabilities()`, `generate()`, `verify()`. **Round 18** found `verify()` reporting `ok: true` for three configurations in which every run fails — a template that is not JSON, a GUI-format export ComfyUI answers with a 400, and a prompt binding naming a node the graph does not contain — because its template check was `existsSync` and it never read the graph. It now loads the graph and inspects the bindings, so the answer is about USABILITY rather than presence. **Round 19** took the completion decision out of its poll loop: `entry?.status?.completed || entry?.outputs` could not tell a failed run from a finished one, because ComfyUI reports both as `{}`. It now asks `comfyuiHistory.mjs`, and raises `E_GRAPH_FAILED` carrying the node and its own exception. Its `E_NO_OUTPUT` branch is the same message it always was — but it is now reached only when the graph genuinely finished, which is what makes that message true. | 283 |
| `comfyuiGraph.mjs` | **The GRAPH: loading a ComfyUI workflow and injecting one request into it**, split out of `comfyuiLocal.mjs` for rule 4. **Round 18** turned three prototype-chain lookups into own-property tests and gave `loadGraph` a shape check: a slot named after an `Object.prototype` member threw a `TypeError` where a refusal belonged, `'constructor' in node.inputs` was TRUE on every node — so the DETECTION-NEVER-CREATION guard would have "detected" an input that does not exist and written the prompt to a key ComfyUI ignores — and a node id such as `constructor` resolved to a function the code then wrote to, creating `Object.inputs` on the global `Object`. | 241 |
| `comfyuiHistory.mjs` | **What a ComfyUI history entry MEANS**, split out of `comfyuiLocal.mjs` for rule 4 — the same seam that produced `comfyuiGraph.mjs`, one direction over: that file is about the document we SEND, this one about the document we READ BACK. **Round 19** replaced a truthiness test that could not answer the question it was asked. `entry?.outputs` is truthy for `{}`, and `{}` is what ComfyUI reports BOTH for a graph that raised and for one that has not produced anything yet — so `terminalState()` decides FAILURE before COMPLETION, and reads `status_str`, the only field that separates the two. It also reads the node's own exception out of `status.messages`, which nothing had ever opened. It returns a descriptor rather than throwing, so the adapter owns the error code. | 147 |
| `higgsfield.mjs` | The hosted adapter: `verify()` and `generate()`. **Round 20** — the first hostile round to reach this file — found `verify()` calling the credential **accepted** for a 500, a 429 and a 302, because it treated every status that was not 401/403 as proof. It now separates a DECISION the API made (2xx, or a non-auth 4xx) from the vendor failing, rate-limiting or redirecting before any decision, and will not call the latter a yes. It also refuses an artifact URL that is not https, because that URL comes out of the vendor's response body and was previously fetched unvalidated. | 222 |
| `higgsfieldTransport.mjs` | Credentials, auth header, submit/poll/cancel, status vocabulary. **Round 20** added the three checks this file was missing: `insecureBaseUrl()` refuses to send a credential to a non-https base URL (measured pre-fix: `Authorization: Key <id>:<secret>` went out in cleartext), `poll()` refuses immediately on a 401/403 instead of spinning for fifteen minutes and then claiming the request "may still be running and billing", and `describePollTimeout()` reports what was actually observed — how many polls completed and how many were refused. | 286 |

### The gateway — `media-api/`

| File | Role | Lines |
|---|---|---|
| `server.mjs` | Routing, the detached runner, the fail-closed bind. The runner's catch cannot itself reject. | 288 |
| `http.mjs` | HTTP primitives: constant-time compare, bearer check, capped body read, envelope. **Round 22** — the first hostile round to reach this file — found the bearer check THROWING when `req.headers` was absent (so a request it could not read became a 500 rather than a 401), `readBody()` resolving `null` and every other non-object JSON as success (a body of `null` reaches a route and surfaces as a 500 where it is a 400), `send()` letting `extraHeaders` replace the `content-type` and `content-length` it exists to impose, and `safeEqual()` reporting two ABSENT values as equal. | 156 |
| `router.mjs` | The route table, extracted from `server.mjs` as a pure `(method, path)` function. | 38 |
| `routes.mjs` | The **executing** surface: quotes, jobs, cancel, assets. Ownership before expiry. | 281 |
| `routesCatalog.mjs` | The **read-only** surface: models, wallet, estimate. Round 15 made the published `evidence` field the gate's own reading rather than a `??` default; round 16 publishes `model_version` beside the provider id, because the id cannot answer which weights a row serves. | 172 |
| `preflight.mjs` | The gate order, run before anything is created. | 171 |
| `store.mjs` | Atomic JSON job + quote stores. | 221 |
| `wire.mjs` | Error envelope, status mapping, public job projection. **Round 18** gave the **eighteen adapter refusal codes** a status — they had none, and fell through to the fallback 400 — after round 7's coverage sweep was found to have omitted all four adapter modules from its list. The code says WHICH LAYER refused: 500 our provisioning, 502 the provider, 504 a timeout, 422 a content refusal. `retryable` is a separate, named field, so "which layer" and "should I retry" are not the same axis. **Round 19** added a nineteenth: `E_GRAPH_FAILED` → 502, for a graph ComfyUI EXECUTED and a node that raised. The boundary with `E_SUBMIT_REJECTED` (500) is the point — a 4xx submit is a graph refused before it ran, which is ours; this is the provider running it and the run blowing up. **Round 20** added the hosted lane's three: `E_POLL_REJECTED` and `E_INSECURE_BASE_URL` are 500 (our provisioning — a key the vendor rejects, a base URL that would carry that key in cleartext), and `E_BAD_ARTIFACT_URL` is 502 (the provider reported completion and handed back a URL this process will not fetch). | 181 |

### Verification artifacts — `media-api/`

| File | What it proves |
|---|---|
| `media-api.test.mjs` | 48 unit tests, `node --test`, zero dependencies. |
| `demo-http-flow.mjs` | The authenticated flow over a **real socket**. 44 checks. |
| `hostile-http-probe.mjs` | Round 1. The adversarial half. 24 checks. |
| `hostile-round2-probe.mjs` | Round 2. HTTP primitives, auth, idempotency, ceiling types. 26 checks. |
| `hostile-round3-probe.mjs` | Round 3. Money rounding, store pruning, estimate/quote agreement. 23 checks. |
| `hostile-round4-probe.mjs` | Round 4. Undeterminable cost, ledger asymmetry, exact enablement. 27 checks. |
| `hostile-round5-probe.mjs` | Round 5. Prompt policy, claimed-value evasions, code coverage sweep. 24 checks. |
| `hostile-round6-probe.mjs` | Round 6. The catalogue/registry shape contract and what the ceilings enforce. 71 checks. |
| `hostile-round7-probe.mjs` | Round 7. Extraction identity, money PROPERTIES, the route table, code coverage. **Round 18 widened its `GATEWAY` list, which had omitted all four adapter modules** — the files that raise the most refusal codes — so the sweep was green about the modules it listed and silent about the ones that would have failed it. 51 checks. |
| `hostile-round8-probe.mjs` | Round 8. The dry pass: principal, the body-cap boundary, the quote store, gate order. 42 checks. |
| `hostile-round9-probe.mjs` | Round 9. The ledger READ BACK, quote ownership in every state, store invariants, the route table, the auth primitive. 49 checks. |
| `hostile-round10-probe.mjs` | Round 10. The runner: the cancellation window measured, terminal-state guarantees, a failing store write, idempotency, the artifact path. 27 checks. |
| `hostile-round11-probe.mjs` | Round 11. The licence and enablement layer: who names the territory, the parsers, the evidence gate. 39 checks. |
| `hostile-round12-probe.mjs` | Round 12. The three ceilings **driven rather than read**: the per-job ceiling through `runGenerate`, the per-caller ceiling on the free and billed lanes, and the ledger's per-caller split. 35 checks. |
| `hostile-round13-probe.mjs` | Round 13. The round-12 code attacked **as new code**: whether the ceilings refuse things they should not, money compared in micro-dollars rather than binary floats, prototype-named callers, and a cap that overflows to `Infinity`. 30 checks. |
| `hostile-round14-probe.mjs` | Round 14. The licence gate attacked where it fails **OPEN**: an unrecognised `commercialUse`, an evidence flag matched by exact string, a licence that is not an object, a territory list read with `.includes()`, and the one assertion that the vocabulary has a single definition. 52 checks. |
| `hostile-round15-probe.mjs` | Round 15. The **round-14 code attacked as new code**: whether an ambiguous `commercial` value disables the gate, whether the wire and the gate read `evidence` the same way, whether the validator's evidence-vs-position asymmetry is deliberate, and whether all three new codes are reachable and classified. 40 checks. |
| `hostile-round16-probe.mjs` | Round 16. The **provenance record**, where a wrong field is worse than a crash: whether `modelVersion` identifies the weights or repeats the provider, whether the licence snapshot corrupts what it copies, and whether a boolean the caller never supplied is recorded as a negative. 29 checks. |
| `hostile-round17-probe.mjs` | Round 17. **Round 16's own code attacked as new code**: whether "not the provider id" is defeated by padding or case, whether the AUDIT checks the property the validator guarantees, whether a widened value domain moved the version number, and whether the adapter branch the record prefers is reachable at all. 29 checks. |
| `hostile-round18-probe.mjs` | Round 18. **The GPU-facing surface, attacked for the first time**: whether `verify()` answers about a configuration that can actually run, three prototype-chain lookups in the graph helper, a `loadGraph` that checked JSON syntax but never JSON shape, and the coverage sweep whose module list was blind to the files that raise the most codes. **Round 21 added G5** — the re-verification block's file count, which round 21 had to correct by hand because G2 covers only the closing block — so it now carries 67 checks. **Round 23** emptied its `NOT_LANE_OWNED` exemption map and added a redundant-exemption control — a module that is both exempted and documented now fails — so the check that this round's new file tripped on its first run is the one that also closed the gap that let `completion.mjs` hide behind it. |
| `hostile-round19-probe.mjs` | Round 19. **What a failed GPU run is reported as**: whether a graph that RAISED is distinguishable from one that finished with nothing (both are `outputs: {}`), whether `completed: true` alongside an execution error is read as success, whether a still-EXECUTING job is read as a finished one, and whether `E_TIMEOUT` asserts a cause it never observed. It also carries the round's own two vacuous checks as defect rows, because a probe that passes on the pre-fix tree is a defect like any other. 24 checks. |
| `hostile-round20-probe.mjs` | Round 20. **The hosted adapter, attacked for the first time**: whether `verify()` calls a credential accepted on the strength of the vendor failing, whether a rejected credential becomes a fifteen-minute timeout that asserts billing, whether the credential's destination is checked for https, and whether the artifact URL out of the response body is validated before this process fetches it. It also measures that the credential *leaves the process* by recording every request the stub receives. 32 checks. |
| `hostile-round21-probe.mjs` | Round 21. **The usage ledger's WRITE path**: whether `record()` overwrites a ledger it could not read, whether the 30-day trim can discard the day it just counted, and whether a write that fails becomes a failed render. Every check drives the real `makeFileLedger` through an injected `fs`, and the money consequences through the real `checkRunAllowed` and `assertRunAllowed`. Carries four mutation controls, one per defect, each of which re-introduces its defect into a copy of the module and requires the round's own assertion to fail there. 41 checks. |
| `hostile-round22-probe.mjs` | Round 22. **The HTTP primitives, attacked for the first time**: whether `authorized()` refuses or throws when it cannot read the request, whether `readBody()` accepts JSON the routes cannot dereference (a body of `null` reached a route and became a 500), whether `send()` can have its own envelope overridden by the caller it exists to constrain, and whether `safeEqual()` calls two absent values equal. Carries four mutation controls, one per defect. 31 checks. |
| `hostile-round23-probe.mjs` | Round 23. **The queue-completion projection, attacked for the first time** — the one module the file-table assertion exempted by name. Whether `mimeForFilename` can return a non-string through `Object.prototype` (it could: `.constructor` gave the `Object` constructor, and `JSON.stringify` then dropped the key, so the queue stored a completion with no mime), whether `completionBody`'s `\|\|` guarantees a string (it is an absence test), and whether `completionSummary` still prints the string its own header calls "worse than silence". Also asserts the ledger's own stated totals are self-consistent, which is how round 23's two stale counts were found. Carries three mutation controls, one per defect. 43 checks. |
| `control-round12-checks.mjs` | **The control for the controls.** Replays round 12's new source-text assertions against MUTATED sources and fails if any still matches. 16 checks. |
| `smoke-adapters.mjs` | The adapter gate ladder, one rung at a time. |

### Adapter registration — `backend/scripts/handlers/`

| File | Change |
|---|---|
| `adapters.mjs` | **New.** The transport registry, split out of `generateVideo.mjs` to stay inside rule 4. Hosted ids are **derived** from the catalogue, so a row cannot exist without an adapter. |
| `ceilings.mjs` | **New in round 12.** Composes the three ceilings in the order the handler needs them. It lives here, not in a shared module, because composing them would make `spendGuard` and `ceilingGate` import each other. |
| `generateVideo.mjs` | 300 → 293 lines across rounds 11–12. Reads `job.maxCostUsd`, names the caller when charging the ledger, and re-exports `ADAPTERS` and `ComfyError` so no caller changes an import. |
| `completion.mjs` | **The queue-completion projection.** `completionBody` / `completionSummary` / `mimeForFilename` — what the agent reports to the queue when a job finishes, and the line the operator reads. **Round 23** attacked it for the first time: it had been the file-table assertion's one named exemption, on the grounds that "the lane has never modified it", which is a fact about the **patch** and not about the lane's dependency surface — `generateVideo.mjs` imports `mimeForFilename` from here, so every video job's `r2Key` and mime are built out of this file. Found the prototype-lookup class round 18 fixed three times in `comfyuiGraph.mjs` (`MIME_BY_EXT['constructor']` returned the `Object` **constructor**, a truthy non-string that `JSON.stringify` then dropped, so the queue stored a completion with no mime at all), a fallback that shipped the exact string its own header calls "worse than silence", and an `\|\|` doing an absence test where a type was required. |

Every source file is **under rule 4's 300-line cap.** The test file is 526, matching the repo's own
precedent (`backend/tests/unit/videoProviderRegistry.test.mjs` is 635).

---

## Readiness receipt

All **twenty-nine** gates, run in this session, all green — **1097 assertions**:

```
cd backend && npx vitest run tests/unit/videoProviderRegistry.test.mjs
#   ✓ tests/unit/videoProviderRegistry.test.mjs (63 tests) — 63 passed (63)
#   the suite is UNCHANGED — git reports no diff against main for it
#   (git diff --stat main -- <file> is empty; the only byte delta is CRLF
#    checkout conversion, which every file in the repo shares)

cd backend && npx vitest run tests/unit/videoComplianceControls.test.mjs
#   ✓ tests/unit/videoComplianceControls.test.mjs (64 tests) — 64 passed (64)
#   GATE 16. This suite existed the whole time and NO gate ran it until round 12.
#   It covers the spend guard, the usage ledger, the prompt policy and the generate
#   handler — i.e. exactly the code the ceilings touch. The fifteen-gate receipt was
#   green while 64 relevant tests went unrun. See "The gate that was never run" below.

node --test media-api/media-api.test.mjs
#   # tests 48   # pass 48   # fail 0

node media-api/demo-http-flow.mjs
#   ALL 44 CHECKS PASSED

node media-api/hostile-http-probe.mjs
#   ALL 24 CHECKS PASSED

node media-api/hostile-round2-probe.mjs   # 26 CHECKS — 26 passed, 0 failed
node media-api/hostile-round3-probe.mjs   # 23 CHECKS — 23 passed, 0 failed
node media-api/hostile-round4-probe.mjs   # 27 CHECKS — 27 passed, 0 failed
node media-api/hostile-round5-probe.mjs   # 24 CHECKS — 24 passed, 0 failed
node media-api/hostile-round6-probe.mjs   # 71 CHECKS — 71 passed, 0 failed
node media-api/hostile-round7-probe.mjs   # 51 CHECKS — 51 passed, 0 failed
node media-api/hostile-round8-probe.mjs   # 42 CHECKS — 42 passed, 0 failed
node media-api/hostile-round9-probe.mjs   # 49 CHECKS — 49 passed, 0 failed
node media-api/hostile-round10-probe.mjs  # 27 CHECKS — 27 passed, 0 failed
node media-api/hostile-round11-probe.mjs  # 39 CHECKS — 39 passed, 0 failed
node media-api/hostile-round12-probe.mjs  # 35 CHECKS — 35 passed, 0 failed
node media-api/hostile-round13-probe.mjs  # 30 CHECKS — 30 passed, 0 failed
node media-api/hostile-round14-probe.mjs  # 52 CHECKS — 52 passed, 0 failed
node media-api/hostile-round15-probe.mjs  # 40 CHECKS — 40 passed, 0 failed
node media-api/hostile-round16-probe.mjs  # 29 CHECKS — 29 passed, 0 failed
node media-api/hostile-round17-probe.mjs  # 29 CHECKS — 29 passed, 0 failed
node media-api/hostile-round18-probe.mjs  # 67 CHECKS — 67 passed, 0 failed
node media-api/hostile-round19-probe.mjs  # 24 CHECKS — 24 passed, 0 failed
node media-api/hostile-round20-probe.mjs  # 32 CHECKS — 32 passed, 0 failed
node media-api/hostile-round21-probe.mjs  # 41 CHECKS — 41 passed, 0 failed
node media-api/hostile-round22-probe.mjs  # 31 CHECKS — 31 passed, 0 failed
node media-api/hostile-round23-probe.mjs  # 49 CHECKS — 49 passed, 0 failed
#   GATE 28. 21 of these 49 FAILED on the round-22 tree restored from HEAD (9f9957b1b), which
#            is the control. Three of those 21 are the mutation controls, which fail there for
#            the reason they should: the strings they re-introduce do not exist until the fix
#            lands. Four more are section E, which asserts the LEDGER's own stated totals
#            rather than the module — it failed on the round-22 document because two of those
#            totals were stale, and that is the round's fourth finding. Section E is also the
#            only check in the lane that reads the document's arithmetic, which is why nothing
#            had caught the drift before.
#   GATE 27. 21 of these 41 FAILED on the round-20 tree, which is the control. Four of
#            those 21 are the mutation controls, which fail there for the reason they
#            should: the strings they re-introduce do not exist until the fix lands.
#   GATE 26. 18 of these 32 FAILED on the round-19 tree, which is the control.
#   GATE 25. 18 of these 24 FAILED on the round-18 tree, which is the control.

node media-api/control-round12-checks.mjs # 16 passed, 0 failed
#   GATE 17. The control for the controls — see "A green gate that could not fail".

node media-api/smoke-adapters.mjs
#   ALL CHECKS PASSED
```

### The gate that was never run

Round 12 set out to close two ceiling gaps and found a third defect on the way in, in the
verification rather than the code.

`backend/tests/unit/videoComplianceControls.test.mjs` — **64 tests** over the spend guard, the
usage ledger, the prompt policy and the generate handler — sat in the repo the whole time and
**no gate ran it.** The three verifications the handoff named cover
`videoProviderRegistry.test.mjs` and `media-api.test.mjs`, and every probe was written by this
lane; nothing pointed at this file. It passes, and it passed before any of round 12's changes.

The failure mode this creates is the one the patch saga already taught, one level up: **a green
receipt can be green because it never looked.** The gate count was fifteen and the assertion
count was 545, and both were true of the gates that ran. Sixty-four tests covering the exact
modules about to be modified were outside the count entirely.

It is now **gate 16**, and the assertion total is **1097** (853 when this section was written; round 18 added its own gate and 67 checks, round 19 one gate and 24, round 20 one gate and 32, round 21 one gate and 41, round 22 one gate and 31, round 23 one gate and 49). The other `video*`/`render*` suites in
that directory import modules outside this lane (`routes/contentStudioRoutes.mjs`) and fail in a
sparse checkout for that reason alone; this one is self-contained, which is why it is the one
that must run.

### Re-verified from the patch, on a fresh `main` base

The receipt above is from the worktree. It was then reproduced **from the patch itself**, because a
patch generated off a stale index is the failure mode this repo has already produced once.

**It had already produced it here, and the first version of this section missed it.** The handover
patch carried **23 files**. Two of them were missing that this lane had genuinely changed:

- `shared/providers/video/spendGuard.mjs` — round 4's `costFrom`, which is what stops an absent,
  empty or unparseable cost being read as **ZERO** (`Number(x) || 0`). Applying the 23-file patch to a
  fresh base would have **restored that defect**, silently, on the one guard that protects money.
- `shared/providers/video/promptPolicy.mjs` — round 5's per-matched-name false-positive guard.

The old verification reported all five gates green, and it was **right about the five it ran**. It was
green because the patch omitted the probes that would have caught the omission: a patch and its
verification can be wrong in the *same direction* and agree with each other. **A verification is only
as complete as the artifact it is verifying.**

#### The same omission happened twice more, and the third time it was caught before handover

Correcting the count to 35, then 37, did not fix the *procedure* that produced the wrong count — and
the procedure failed again. The patch regenerated after round 11 carried **37 files and was missing
two the lane depended on**:

- `shared/providers/video/licenceGate.mjs` — round 11's new module, imported by `registry.mjs`,
  `media-api/preflight.mjs` **and** `backend/scripts/handlers/generateVideo.mjs`. Applying that patch
  to a fresh base would not have restored a silent defect; it would have failed outright with
  `MODULE_NOT_FOUND` on **every** gate. Loud, but still wrong.
- `media-api/hostile-round11-probe.mjs` — the probe for the round-11 defect, so the same patch that
  omitted the fix's probe would also have omitted the fix's proof.

The cause is structural and was recorded in the "regenerate after the last edit" lesson without being
fixed: **`git diff <base>` reads the INDEX, and a newly created file is untracked, therefore invisible
to it.** Regenerating on a newer index cannot help; the file is never in the index at all.

The fix is a generator that refuses to write a patch it cannot prove complete —
`gen-lane-patch.sh` in the session workspace — asserting five things, any of which aborts:

1. **no untracked file in the lane** (the exact hole: an untracked file is silently omitted);
2. the patch's file set **equals** the set of files whose *content* differs from the base;
3. the count matches, so a silent truncation is caught;
4. **no path outside the lane** (the patch may not smuggle unrelated changes);
5. **no relatively-imported module is shipped missing** — the check that catches the
   `licenceGate.mjs` case by name.

Guards 2–5 are mechanical. Guard 1 is the one that matters, and a guard with no control can pass
vacuously — so it was tested against the defective artifact: replaying the old 37-file list through
guard 5 flags `shared/providers/video/licenceGate.mjs` by name. **The control fails, which is why the
guard is trusted.**

A second, subtler trap surfaced while writing it, and it is worth stating because it produced a
*false alarm* rather than a false pass. The natural way to build the expected set is
`git diff <base>` unioned with `git diff --cached`. **In this worktree that is wrong**, because HEAD
is unborn: `git diff --cached` compares the *empty tree* to the index, so it lists **every** lane file
in the index — including the eight that are byte-identical to `main` modulo line endings. The union
came to **47** against the patch's 39 and reported eight files as missing. They were not missing;
they were unchanged. Verified individually: `completion.mjs`, `comfyuiGraph.mjs`, `comfyuiLocal.mjs`,
`provenance.mjs`, `workflows/README.md`, `comfy-object-info.cache.json` and both
`minimax_h3_*_api.json` files are **line-endings-only** differences from `main`, which is why
`git diff` reports no change while a raw `sha256sum` differs. **The only correct source of truth is a
content diff against the base.** (The branch was unborn for twenty-one rounds, which is what made
`git diff --cached` meaningless here — it compared the empty tree to the index. That is no longer
true: see "There was no commit for twenty-one rounds" below. The content diff remains the right
source of truth for the file set, since a patch must describe *changes*, not a tree.)

The patch is now **62 files** — the same 9 modified (`generateVideo.mjs`, `catalogue.mjs`, `promptPolicy.mjs`,
`registry.mjs`, `spendGuard.mjs`, **`provenance.mjs`**, **`comfyuiLocal.mjs`** and **`comfyuiGraph.mjs`** — new in round 18 — and **`completion.mjs`**, new in round 23) plus 53 new (the whole `media-api/` surface, `router.mjs`,
`normalizeResponse.mjs`, `specShape.mjs`, `licenceGate.mjs`, `licenceTerms.mjs`, `ceilingGate.mjs`,
`usageLedger.mjs`, `ceilings.mjs`, `callerCeiling.mjs`, `comfyuiHistory.mjs`, and every round's probe) — and it is verified by running **all twenty-nine** gates on the patched base, not the five that happened to be in it:

```
git clone --local --branch main --single-branch <SS-PT> C:/tmp/ss-media-api-patch-verify-20260918.R10
cd C:/tmp/ss-media-api-patch-verify-20260918.R10
#   base = 2b3e7a62a, and it has NO media-api/ and NO adapters.mjs  (genuinely pre-work)

git apply --check <patch>      # exit 0
git apply <patch>              # exit 0
#   62 files changed; every path is inside the lane's directories
#   git status --porcelain -uall | wc -l   ->  62, and zero paths outside the lane
#   each of the 62 files hashes identical to the worktree once CR is stripped   -> 62/62
#   (roughly 12.6k inserted lines and 247 deleted lines. The exact line count, like the
#    byte count, is a property of THIS snapshot — this README is inside the patch, so
#    editing this sentence changes it. Stated as a bound, not as a figure to trust.)

cd backend && npm ci           # 489 packages; the patch touches no dependency manifest
npx vitest run tests/unit/videoProviderRegistry.test.mjs   # 63 passed (63)      <- gate 01
npx vitest run tests/unit/videoComplianceControls.test.mjs # 64 passed (64)      <- gate 16
cd .. && node --test media-api/media-api.test.mjs          # 48 pass, 0 fail
node media-api/hostile-http-probe.mjs                      # ALL 24 CHECKS PASSED
node media-api/hostile-round2-probe.mjs                    # 26 passed, 0 failed
node media-api/hostile-round3-probe.mjs                    # 23 passed, 0 failed
node media-api/hostile-round4-probe.mjs                    # 27 passed, 0 failed
node media-api/hostile-round5-probe.mjs                    # 24 passed, 0 failed
node media-api/hostile-round6-probe.mjs                    # 71 passed, 0 failed
node media-api/hostile-round7-probe.mjs                    # 51 passed, 0 failed
node media-api/hostile-round8-probe.mjs                    # 42 passed, 0 failed
node media-api/hostile-round9-probe.mjs                    # 49 passed, 0 failed
node media-api/hostile-round10-probe.mjs                   # 27 passed, 0 failed
node media-api/hostile-round11-probe.mjs                   # 39 passed, 0 failed
node media-api/hostile-round12-probe.mjs                   # 35 passed, 0 failed
node media-api/hostile-round13-probe.mjs                   # 30 passed, 0 failed
node media-api/hostile-round14-probe.mjs                   # 52 passed, 0 failed
node media-api/hostile-round15-probe.mjs                   # 40 passed, 0 failed
node media-api/hostile-round16-probe.mjs                   # 29 passed, 0 failed
node media-api/hostile-round17-probe.mjs                   # 29 passed, 0 failed
node media-api/demo-http-flow.mjs                          # ALL 44 CHECKS PASSED
node media-api/smoke-adapters.mjs                          # ALL CHECKS PASSED
node media-api/control-round12-checks.mjs                  # 16 passed, 0 failed  <- gate 17
```

The artifact and the safety net are now the **same set of files**, which is the point: the safety net
is built *from the patch's own file list* (`build-safety-net.sh`), so
`patch file count == safety-net file count == lane content-diff count` is one number, checkable three
ways. An earlier attempt built the net from `git status`, which under an unborn HEAD yields **47**
(39 changed + the 8 unchanged) against a 39-file patch — two artifacts, two counts, no way to tell
which was right. That ambiguity is what let the first two defective patches through.

One more thing the patch re-verification caught, and it is the same lesson a second time. The first
regeneration of this section reported **35 files** and a full green run — and both were true of the
patch that existed at that moment. It stopped being true the instant rounds 9, 10 and 11 landed,
because a patch is a snapshot of an index, not a live view of a worktree. **The patch is regenerated
after the last edit, not before it** — and, as the licenceGate omission shows, regenerating is not
sufficient on its own unless the generator *asserts completeness*. The receipt above is from the
asserted artifact, verified by applying it to a fresh `main` clone and running all twenty-nine gates
there.

**Round 16 moved the count by TWO, and the reason is the same lesson this section is about.** `provenance.mjs` had never been in the patch: its only difference from `main` was line endings, and `git diff` reports no change for those. Round 16 changed its content, so it entered the patch as a sixth MODIFIED file. A file can be absent from the artifact for a reason that looks like "nothing to ship" and is actually "nothing shipped yet" — which is why the generator asserts the patch set equals the *content*-diff set rather than trusting a count that happened to be stable.

**Round 18 moved it by THREE, for the same reason one more turn out.** `comfyuiLocal.mjs` and `comfyuiGraph.mjs` had never been in the patch either — this lane had never touched them — so the moment round 18 changed them, two files that have always existed in `main` entered the artifact as MODIFIED. Nothing about the count would have revealed their absence: they were in the worktree, the probes import them, and every gate was green. A file that is genuinely unchanged is invisible to a patch by design, and that is correct. The thing to distrust is a count, never the mechanism.

One honest detail: the patch's blobs are LF, and `git apply` writes them out through
`core.autocrlf`, so the applied files are CRLF. Content is identical — stripping CR makes every file
hash-match the worktree — and CRLF is what the rest of this checkout uses. It is a checkout
convention, not a content difference, and it is why "byte-identical" is stated above as "git reports
no diff" rather than as a raw hash claim.

Three gotchas worth recording, each already paid for once:

- `git apply <patch>` needs a **Windows-style** path (`C:/…`); `/c/…` fails with "can't open patch".
  The same trap applies to `git clone --local`.
- `git status --porcelain` **collapses untracked directories**, so a patch that creates `media-api/`
  from nothing reports as ~15 entries rather than 39. Use `--untracked-files=all` before concluding a
  patch is complete — the first count here said 15 and looked like a *different* bug.
- **A hand-escaped regex inside a double-quoted shell string is not a reliable way to inspect a
  patch.** `grep -c 'replace(/\\r\\n/g'` against the patch returned **0** and made a *current* patch
  look stale; the same pattern also nearly hid the licenceGate omission, because a grep that matches
  nothing looks exactly like a grep for something that is genuinely absent. Use `grep -F` with a
  literal string, and confirm the check can *fail* before trusting it to pass.

### The flow, demonstrated over a real socket

`demo-http-flow.mjs` binds a real server on `127.0.0.1`, drives it with `fetch`, and asserts:

- **The auth boundary.** No token → 401. Wrong token → 401. Valid token → 200. Unauthenticated quote → 401.
- **The catalogue.** The enabled local row reports the **runtime** enablement, with the shipped default kept separately.
- **Quote.** `201`; id captured; local lane priced `0.0000`; `basis: "run"`; `grant_recorded: false`; carries the note that a quote authorises nothing.
- **Job.** Missing `Idempotency-Key` → `400 E_NO_IDEMPOTENCY_KEY`. With it → `202`. Same key replayed → **same job id, same body shape, no second render.**
- **Polling.** `states seen: running -> succeeded` — the loop observed the job **in flight**, not merely at rest.
- **Asset.** `sha256` present; provenance carries the licence snapshot (`commercialUse: "requires-grant"`, `excludedTerritories: ["US"]`, `usedCommercially: false`) and the prompt hash.
- **The bytes.** `content -> 200`, `content-type: video/mp4`, and **the served bytes hash to the recorded sha256** (`8ea2ae02…` on both sides). `ffprobe`: `codec_name=h264 width=320 height=240 nb_frames=20` — real, decodable video.
- **The ledger.** `runs: 1` counted; `spend_usd: 0`; `gpu_budget_enforcement: "metered_only"`; `ledger_degraded: false`.
- **The refusals.** Cancelling a finished job → `409`. Unknown job → `404`. Unknown route → `404`. A hosted row → `403`.

**The engine ran for real.** Only the *transport* is injected (`deps.adapters`). So `runGenerate`'s
licence gate, `validateVideoRequest`, `assertPromptAllowed`, `checkRunAllowed`, the ledger `record()`
and `buildProvenance` all executed. The provenance record and the ledger entry are the evidence: a
stubbed `runGenerate` would have produced neither.

### What the hostile pass looked for, and what it found

The probe attacks five surfaces. It found **four defects**, all now fixed and re-verified:

| # | Defect | How it surfaced | Fix |
|---|---|---|---|
| 1 | **`/v1/models` reported the catalogue's shipped default, not runtime enablement.** With the provider enabled, a quote and job for it both succeeded while the catalogue said `enabled:false, runnable:false`. An agent reading the catalogue would conclude it had nothing to call. | Driving the real flow and reading the response | `listModels` now reads `readEnabled(env)`, reports runtime state as `enabled`, and keeps the shipped default as `readiness.catalog_enabled`. |
| 2 | **`generateVideo.mjs` dropped `sha256`.** It was used for the upload-url body and then omitted from the return, so `server.mjs`'s `out.sha256 ?? null` put a **null on every asset** — a caller could download the bytes with nothing to verify them against. The provenance record had the hash; the asset metadata did not. | Fetching the artifact and comparing hashes | `sha256: result.sha256 ?? null` added to the return. |
| 3 | **A 413 that could never be delivered.** `readBody` called `req.destroy()` the instant the cap was crossed, resetting the socket while the client's body was still in flight — so `fetch` threw and the caller never saw the status. The limit worked; the refusal was unreachable. | Sending a 300 KB body from the probe | Stop buffering, keep draining, reject immediately; `connection: close` on the 413. Memory stays bounded because the chunks are discarded. |
| 4 | **One endpoint, two body shapes.** The idempotency replay returned a hand-rolled `{id, state}` while the first call returned the full projection — so a client written against the first `202` read `undefined` for every field it needed. | Comparing the two responses | The replay now returns `publicJob(existing)`. |

Two further clarity defects, found by reading with hostile intent:

- `pricing.basis` fell through to `'none'` for a per-run provider, so `rate.unit: "run"` and
  `pricing.basis: "none"` described the same fact two ways. Now `basis: "run"`.
- `grant_recorded: pre.usage && false` was a truthiness dance that read as though a grant could be
  inherited from a usage record. It cannot. Now plainly `false`.

And one thing the probe asserted that was **wrong about the code**: trailing OWS on the bearer header
is tolerated (`"Bearer x "` matches). That is benign — trimming can only make a *correct* token match,
never a wrong one, since the comparison is still constant-time with a length check. Recorded as
accepted behaviour, not "fixed".



## §4.2 — README.md §422-536 — the rounds table: all 87 defects from rounds 2-23, one row each, plus round 8 (the dry pass)

### Rounds 2–23 — the hostile loop, run until a pass finds nothing

Rule 74 cannot be satisfied by one adversarial pass. The loop is: find defects → fix → re-verify →
repeat until a full pass finds **nothing new**. Rounds 2–23 have done that, and each round's probe is
now a permanent gate. **87 further defects**, every one with a passing control beside it.

(That count is the number of rows below, which is what the table is for. It previously read "20" while
the table held 21 — an under-claim in the one section whose whole point is not under-claiming. It then
read "70" while the table held 83: rounds 21 and 22 added nine rows and never moved the number, and
**no assertion read it** until round 23's section E derived it from the table itself. The same
paragraph is now checked by arithmetic rather than by attention, which is the only version that keeps
working.)

| Round | Defect | Why it mattered |
|---|---|---|
| 2 | `readBody` leaked its handler on client abort | A client that promised a body, sent 10 bytes and reset emitted neither `end` nor `error`. The promise stayed **pending forever**, retaining the handler, request and response for the process lifetime. Unbounded memory from an unauthenticated caller. |
| 2 | **`authorized()` authenticated `Bearer undefined`** | `safeEqual` stringifies both sides, so an `undefined` token became the 9-character string `"undefined"` and matched. An authentication bypass wearing the costume of a type coercion. |
| 2 | **A malformed `Host` header killed the process** | `new URL(req.url, req.headers.host)` throws on `127.0.0.1:99999999`, `:8080`, `a b`, `[::1`, and the throw escaped the request listener. **Unauthenticated, pre-auth remote kill switch.** |
| 2 | `createReadStream(...).pipe(res)` with no `'error'` listener | An `EISDIR` on an artifact path with no error listener is an unhandled `'error'` event — a process kill, reachable from any job whose `localPath` stopped being a file. |
| 2 | `E_ARTIFACT_MISSING` leaked the absolute server path | An error message is the one place a caller reads a deployment's layout off the wire. Now names only `basename(path)`. |
| 2 | `max_cost_usd` type coercion | `Number(true)` is 1 and `Number([5])` is 5, so `max_cost_usd: true` silently authorised **$1**. The one field where a coercion bug is a money bug, so it is type-checked rather than coerced. |
| 3 | `toMicros` **truncated** a rate | Truncating understates the cost a rate produces, which is the unsafe direction for money. `0.9999999` became 999999 instead of 1000000. Now rounds half-up with a guard digit. |
| 3 | `formatUsd` **truncated** a cost | The string a caller reads a ceiling comparison off rendered 1234567 micros as `"1.2345"` — below the truth. |
| 3 | **A newly created job could be pruned and lost** | `prune()` sorts by `createdAt` descending; on a timestamp tie a stable sort keeps insertion order, putting the NEWEST job last, where `.slice(0, maxJobs)` cuts. A `202` for a job the server never persisted. |
| 3 | `/v1/estimate` priced providers `/v1/quotes` refuses | `capabilities()` resolves any catalogue row, so the estimate cheerfully priced `minimax/hailuo-hosted` while the quote refused the identical request. The documented flow is estimate → quote → job, so this walked a caller into a wall it was told was clear. |
| 4 | **`checkRunAllowed` read an absent cost as free** | `Number(x) \|\| 0` turned an absent field, an empty string and `'not-a-number'` all into ZERO — three ways to give a billing provider a free run by malforming its cost. |
| 5 | **A place name disabled the person-name flag** | The false-positive guard was tested against the WHOLE prompt, so `New York` suppressed the possible-real-person flag for every name in it. Now tested per matched name. |
| 6 | **`null * duration === 0`** | An unwrapped rate made `trusted()` return `undefined`, `toMicros` return `null` for it, and `null * 6` is **ZERO** in JavaScript — so a billing provider authored in the wrong shape was priced at nothing. The `rateMicros === 0` guard never fired, because `null !== 0`. |
| 6 | `trusted()` silently accepted a bare field | It read `.value` off a non-envelope, yielding `undefined` instead of `null`. Now requires the `{value, provenance}` envelope. |
| 6 | `assertSpecShape` checked the envelope, not the payload | `{value: '', provenance: 'published'}` passed validation, and an empty-string rate is read by `costEstimate` as **explicitly free** — a billing provider priced at $0.00 that the ceiling is never charged for. |
| 6 | **`Number(rate) === 0` priced `''`, `false`, `' '` as free** | The same coercion class as `max_cost_usd: true`. A rate cell authored empty became a free billed run. Found by sweeping the unreadable shapes rather than enumerating expected values. |
| 6 | **The guard and the estimator disagreed about one malformed rate** | `spendGuard.costFrom` returned `Infinity` for `''` while `costEstimate` returned `0` for the same value — two halves of one decision, opposite verdicts. A guard is only as strong as its worst reading, and this was the worst. |
| 6 | **A prototype key resolved as a provider spec** | `VIDEO_PROVIDERS['constructor']` resolves through the prototype chain to the `Object` constructor. It failed closed, but as `E_BAD_SPEC` — "our catalogue is broken" — for what is plainly an unknown provider. `Object.hasOwn` now. |
| 6 | **The catalogue was never validated at import** | `assertSpecShape` was reachable only from `capabilities()`, so a malformed row shipped and was discovered by whoever requested it — as a 500, or as a 500 for the **whole** of `/v1/models` if the row was served. The docstring had always claimed import-time enforcement. It now has it. |
| 6 | `E_BAD_SPEC` / `E_NO_ATTRIBUTION` unmapped | The fallback is 400, and 400 says "your request was malformed" about a row the caller never wrote — the exact wrong-layer mistake `wire.mjs` already documents in the other direction. |
| 7 | **`/v1/estimate` published only the display string** | `formatUsd` renders four decimals, so a cost below 0.00005 USD renders as `"0.0000"` — indistinguishable from free in the field a caller reads first. The QUOTE response carried `pricing.estimated_micros`; the estimate carried only the string, so the two halves of the same documented flow disagreed about what "the cost" is. Now returns `estimate_micros` beside `estimate_usd`. |
| 9 | **A tampered ledger bought back the whole ceiling** | `record()` is monotonic and clamps at zero, so this code can never WRITE a negative count — but `usageFor` read one back through `Number(x) \|\| 0`. A ledger containing `{"runs":-999,"spendUsd":-999}` produced `projectedSpendUsd: -994` for a $5 run against a $10 ceiling, and `checkRunAllowed` said **ALLOWED**. The write path had been hardened against exactly this exploit; the read path had not. | A count that is not a non-negative finite number now sets `degraded`, which refuses anything that bills. Clamping to zero would have been the wrong repair: **zero IS a fresh day**, so a tampered `-999` clamped to 0 still returns the entire ceiling. |
| 9 | **The quote-ownership check ran AFTER the expiry check** | `createJob`'s own comment reads "404, not 403: a caller should not learn that another principal's quote exists." But another principal's **expired** quote answered `410` while a quote that does not exist answered `404` — and that difference IS the oracle the comment says does not exist. Unreachable while `principal` is hardcoded to `'owner'`, which is exactly why it would have shipped. | Ownership is tested first, so the two refusals are the same answer in every state. |
| 10 | **The runner's `catch` could itself reject into nothing** | `.catch((err) => jobs.update(...))` was the guarantee that "the runner must never reject into nothing". But `jobs.update` is precisely what throws when the STORE fails — a full disk, a read-only volume, or `E_STORE_CORRUPT` from the store's own refusal to read a file it cannot parse. The first update throws, the catch runs, its update throws again, out of a detached promise where nothing is listening. Node exits on an unhandled rejection by default, so **one bookkeeping fault would have killed every other in-flight render.** | The catch's own update is wrapped in a guard that logs; the job is left non-terminal for the next boot's `reconcileOrphans`, and the process survives. Proven by injecting a store whose every write throws and asserting **zero** unhandled rejections. |
| 11 | **The licence exclusion was SELF-CERTIFIED by the caller** | The H3 row is `requires-grant` **and** excludes US territory. The territory that decides whether the exclusion applies was read as `params.territory \|\| env.SWAN_OPERATOR_TERRITORY \|\| 'US'` — so the caller named its own jurisdiction. Measured over HTTP with **no grant on file**: `commercial: true, territory: "US"` → `403 E_LICENCE_GRANT_REQUIRED`, while the IDENTICAL request with `territory: "CA"` → **201 and a quote**. A licence gate a caller can self-certify past is not a gate. Present in all three call sites, including the enforcement path in `generateVideo.mjs`. | The territory is an OPERATOR fact — the licence restricts where the *weights run*, and a request cannot move the machine. `licenceGate.territories()` builds the list from the operator's declaration and appends a request-named territory only in the direction that cannot weaken the gate: **any refusal among them wins**, the same rule `max_cost_usd` already follows against the server's allowance. The provenance record now states the operator's territory too, rather than a claim. |
| 12 | **The caller's `max_cost_usd` was never enforced against the CHARGE** | `routes.createJob` type-checked it, compared it against the quote's **estimate** and stored it on the job — and `runGenerate` never read the field. So the caller's ceiling was an assertion about a *forecast*, and a quote is valid for five minutes while the charge happens after. Named by Sean as an honest-scope gap against Astra's *"enforce per-job, per-caller and global ceilings"*; the global one existed, this one did not. | `ceilingGate.jobRefusal()` compares the stored ceiling against the cost the guard authorised, in integer micro-dollars, and refuses `E_JOB_COST_EXCEEDED` — **permanently**, because a retry re-reads the same ceiling and the same catalogue price. It can only ever refuse, never widen, like the submission check it mirrors. Proven end to end through `runGenerate`, including that a refused job is **not** charged to the ledger. |
| 12 | **There was no per-caller ceiling at all** | `checkRunAllowed` took `(caps, usage, limits)` — no principal — and the ledger was keyed by UTC day alone, so every caller shared one budget. Named by Sean alongside the gap above. | The guard takes an OPTIONAL fourth parameter (a caller scope), and the ledger records an **additive** per-caller split beside the global totals. Both caps default to **unset**, so an unconfigured deployment is byte-for-byte the three-argument function it was — which is what makes it a new ceiling rather than a new outage. |
| 12 | **64 relevant tests were outside every gate** | `backend/tests/unit/videoComplianceControls.test.mjs` — 64 passing tests over the spend guard, the usage ledger, the prompt policy and the generate handler — was never run by any gate. The three verifications the handoff named point at two other suites, and every probe was written by this lane. **A green receipt can be green because it never looked**: "fifteen gates, 545 assertions" was true of the gates that ran, while the exact modules about to be modified were outside the count. | It is now **gate 16**. Found by listing the directory rather than trusting the gate list — the same move that found the incomplete patch, one level up. |
| 12 | **Round 6's `max_cost_usd` disclosure check passed VACUOUSLY after the refactor** | The check asserted the *absence* of `maxCostUsd` from `generateVideo.mjs`. Round 12 moved the ceiling logic into `ceilings.mjs`, so the string was absent — and the check went on passing, now testing nothing. An absence assertion cannot tell "the behaviour was fixed" from "the code moved". Its sibling, `CONTROL: the runner source was read`, **did** fail, which is the only reason the section was re-examined. | Section H now reads the files the code actually lives in, strips comments before asserting on code, and states the current contract. **And the assertions are themselves controlled**: `control-round12-checks.mjs` replays each new pattern against a MUTATED source — the exact edit a regression would make — and fails if any still matches. It is gate 17. |
| 13 | **The per-caller ceiling admitted only callers the ledger had ALREADY seen** | Round 12 read an absent caller as an unknown share and refused. That is right for a day with no split — and wrong for a day whose split is complete, and the difference is **decidable**: `record()` writes an entry for every caller it sees and increments the day's total for every run, so `sum(callers[*].runs) === runs` means the split accounts for the whole day and an absent caller has provably used nothing. Round 12 collapsed both readings into the conservative one, so the **second caller of any day was refused for the rest of the day**. A refusal that fires on the normal case is not fail-closed, it is broken — the feature was unusable for its stated purpose, and it would have shipped silently because every round-12 check tested refusals. The message compounded it: it said "no per-caller split" about a day that had one. | `attributedRuns()` reconciles the split against the day's total. Reconciled → an absent caller is a **known zero** and proceeds. Not reconciled (no split, an unattributed run, or an unreadable entry) → refused, with a message that says *which* unknown it is. A malformed entry for the caller themselves is refused unconditionally, so tampering cannot reset a caller to zero and hand back their ceiling. |
| 13 | **The per-caller spend cap compared money in binary floating point** | `spend + runCostUsd > spendCap` — so `0.1 + 0.2` is `0.30000000000000004`, and a caller landing **exactly** on their ceiling was refused. Astra's ruling for this lane is *"never binary floating-point money arithmetic"*; the global guard and the per-job ceiling both honour it in micro-dollars, and the per-caller cap was the one place that broke it. The error direction is over-restrictive rather than money-losing, which is why no earlier probe caught it — but the boundary is wrong, and a ceiling is inclusive. | All three values snap to the micro grid and the comparison is integer: `300000 > 300000` is false, so a caller exactly at their ceiling proceeds. A one-micro overshoot (`300001`) is still refused, so the boundary moved by the rounding error and nothing else. |
| 13 | **A cap that OVERFLOWS to `Infinity` silently disabled the ceiling** | `optionalCapFrom` rejects a non-numeric cap with `E_BAD_CAP` — and a digit-only string passes that test. `Number('9'.repeat(400))` is `Infinity`, so the check missed it, and the value lands exactly where it does the most harm: `callerScope()` returns `null` when neither cap is finite, and `callerRefusal()` reads a non-finite cap as unconfigured. **An operator who set a cap got no cap**, with no error — the precise "typo reads as unset" outcome the existing check exists to prevent, arriving through the one shape it does not cover. | A finiteness check beside the shape check, throwing `E_BAD_CAP`. One keystroke-hold was the whole distance between "enforced" and "absent". |
| 13 | **A caller named after a prototype member resolved through the chain** | `all.callers[who]` with `who = 'constructor'` returns the `Object` constructor; `who = '__proto__'` returns `Object.prototype`, which **is** an object and so passes the bare `typeof` shape test and is read as a recorded entry. It failed closed in both cases — but by accident, and it is the same class round 6 fixed on the provider catalogue (`VIDEO_PROVIDERS['constructor']`). A caller name is caller-supplied on the very path this ceiling protects, so "it happens to fail closed" is not the standard. | `Object.hasOwn` for the lookup, in both the gate and the ledger's write path. Also asserted that a **computed** key (`[who]:`) keeps `__proto__` an own data property, which is what lets a caller be named anything without polluting the object. |
| 13 | **The round-13 fix itself breached rule 4, and the split broke section H** | Closing the three defects above pushed `ceilingGate.mjs` to **347 lines**, past the 300-line cap. Splitting it moved the per-caller code into a new module — and `hostile-round6-probe.mjs`'s section H immediately failed **two** checks, because it asserted where that code *used to* live. That is the third occurrence of this class in this lane (round 12's vacuous pass was the second), and it is why the failure is recorded as a defect rather than a nuisance: the probe caught it, and the probe's own control caught it too. | Split on the seam the module's header already named — a judgement about a JOB vs about a CALLER — into `callerCeiling.mjs`, with `ceilingGate.mjs` **re-exporting** every name so no import path changed. Section H now reads the file the code lives in, and both it and gate 17's control gained an assertion that the re-export bridge exists, so the split cannot silently become a copy. |
| 14 | **`commercialUse` was a CLOSED vocabulary stored in an OPEN string** | The gate recognised exactly one restrictive value (`requires-grant`) and treated the entire rest of the string space as permission — `'prohibited'`, `'unknown'`, `'unverified'`, `'No'`, and the empty space left by a **missing field**. The live consequence was not hypothetical: `catalogueHosted.mjs` instructs the operator to clear the hosted refusal by setting `commercialUse` "to what they actually say" and dropping `evidence`, and terms that FORBID commercial use are as common as terms that permit it. Following that instruction with a prohibitory reading moved the row from **REFUSED to PERMITTED** — the documented way to clear the flag was the documented way to open the hole, which is the worst shape a gate can have, because the operator is doing what the code told them to do. | The vocabulary is enumerated in `licenceTerms.mjs` — a data module, so the validator that rejects a row at import and the gate that refuses it at request time read **one list** and cannot drift. An unrecognised or absent position now refuses as `E_LICENCE_POSITION_UNKNOWN`; `'prohibited'` refuses as `E_LICENCE_PROHIBITED` (no grant can fix a prohibition, so there is nothing to apply for) and `'unverified'` as `E_LICENCE_UNVERIFIED`. All three are mapped to **403**, not the 400 default: they are authorisation, not syntax, and mapping them to 400 would repeat round 11's defect where a licence refusal surfaced as a server fault. |
| 14 | **The evidence flag was matched by exact string equality** | Guard one was `licence.evidence === 'unretrieved'` — an exact match on a field nothing validated. Not the catalogue, not `assertSpecShape`, not the registry. So the **entire** fail-closed guarantee for the hosted lane rested on one string literal matching by luck, and every plausible near-miss — `'pending'`, `'claim'`, `'not-retrieved'`, a typo, a different case, stray whitespace — read as PERMITTED. | The test is now the flag's **presence**: a row that carries an evidence marker of any value is saying its terms have not been established. That is what the field already meant in prose, and it makes the instruction and the implementation agree — the only thing that clears the flag is removing it. `routesCatalog.mjs`'s wire-level `?? 'retrieved'` default is a rendering decision about a response body and never reaches the gate; that distinction is now written down rather than assumed. |
| 14 | **`licence` had to exist but never had to BE an object** | `assertSpecShape` required the field to be present and rejected only `undefined`, so `licence: 'Apache-2.0'` was a legal catalogue row. The gate then did `licence \|\| {}` and read `.evidence` and `.commercialUse` off a **string** — both `undefined` — and every guard fell through to PERMITTED. This is the same bare-value trap the cost fields are already protected from, in the one field whose failure mode is **legal** rather than financial: no amount of arithmetic reveals it. | `specShape.mjs` now validates the licence block the way it already validated `costPerSecondUsd` — the record must be a plain object, `commercialUse` must be in the shared vocabulary, and `excludedTerritories` must be an array. It also **rejects a row that carries an evidence flag AND claims `permitted` or `requires-grant`**, which is the original hosted defect ("asserted `permitted` by analogy with another vendor") made impossible to reintroduce: it now fails at boot, where the operator is looking. |
| 14 | **`excludedTerritories` was read with `.includes()` on whatever type was there** | `(licence.excludedTerritories \|\| []).includes(territory)` on a **string** is `String.prototype.includes` — a substring test, and it mis-reads in **both** directions. `'CANADA'.includes('CA')` is TRUE, so the gate invented an exclusion on a territory the operator never listed and asked them for a grant to it. And `'US'.includes('CA')` is FALSE, so an unreadable list read as an **empty** one and the row was permitted outright — the fail-open direction, and the one an author reaches by writing the field the obvious wrong way. Neither is decidable from the value. | `exclusionList()` returns `null` for a non-array and the gate refuses as `E_LICENCE_POSITION_UNKNOWN`: "cannot be evaluated" must not resolve to "no exclusion". An **absent** list is still `[]`, matching the behaviour it always had — the validator makes absence impossible for a catalogue row, so no caller's behaviour changes. |
| 15 | **`commercial` was read by TRUTHINESS, so an ambiguous value skipped the whole gate** | Round 14's rule is that a field the gate reads as a known, enumerated fact must be validated as closed, and a value it does not recognise is not a yes. It applied that rule once per field it reads — and not to the field that decides **whether the gate runs at all**. `if (!commercial) return null` took the non-commercial branch for `0`, `''`, `null`, `NaN` and `undefined`, so a row that requires a grant and excludes the operator territory was permitted outright. "Not commercial" is a **claim**, and the only value that makes it is the boolean `false`. | `commercial === false` is the only bypass. Both HTTP boundaries already read `params.commercial !== false`, so nothing reachable over the wire changes — and the probe asserts that coupling at the source, so relaxing either boundary to a truthiness test fails the probe rather than quietly opening the gate. The same lesson as round 13's "a guard whose safety rests on another file deserves an assertion", applied to the guard that gates every other guard. |
| 15 | **The wire and the gate read `evidence` by two different rules** | `routesCatalog.listModels` published `caps.licence.evidence ?? 'retrieved'`, which catches null and undefined and nothing else — while the gate's test is "the flag is present and non-empty". Two rules for one field, **one module apart**, which is precisely the defect round 14 fixed inside the gate; round 15 found it surviving outside it. With `??` the wire published `"pending"`, `""` or `"  "` — values the field is not documented to carry — and published `"retrieved"` about a row the gate refuses. | The route derives the field from the shared predicate (`evidenceUnretrieved`), so what a caller is told and what the gate decides cannot drift. The probe drives the **real route** over all nine served rows and asserts agreement, and asserts the source-level derivation too, because the shipped rows are all the same shape and a behaviour check alone cannot tell "derives it" from "happens to be right about these rows". |
| 15 | **The round-15 probe's first draft asserted against its own copy of the old rule** | Section B's headline check reimplemented the route's expression locally as `evidence ?? 'retrieved'` and compared it to the gate. That check can only ever report what the **old** code did — it kept failing after the route was fixed, because it was testing a constant, not the route. This is round 6's vacuous pass one level down: an assertion that has stopped being about the thing it names. | Rewritten to drive `listModels()` and assert the published values, with the local expression kept only as a **CONTROL** that the two rules genuinely differ — which is what makes the source assertion load-bearing rather than stylistic. Recorded as a defect rather than a nuisance because it is the third time this class has appeared and the first time it appeared in a probe written specifically to catch it. |
| 16 | **`modelVersion` always held the provider id** | `provenance.mjs` built it as `result?.modelVersion \|\| caps.modelVersion \|\| caps.provider`, and `capabilities()` never exposed the field and no adapter returned one — so the last term was the only term, on **every** record this lane has ever built. The record's own comment says *"which weights produced this is not answerable from the provider name alone"*, one line above the code that answers it with the provider name. `auditProvenance` then read the fallback as an answer and reported the record **complete** — a completeness check satisfied by a fabrication, in the artifact that exists to be the licensor's evidence. Astra's rule for this lane is *"zero is never the fallback for an unknown cost"*; the provider name is never the fallback for an unknown model version. | All ten rows declare a real `modelVersion` (the weights — `Wan 2.2 TI2V-5B`, not `comfyui/wan-2.2`), `capabilities()` and the catalogue route publish it, and `specShape.mjs` requires a non-blank string that is **never equal to the provider id**, so a new row cannot reintroduce it. The record falls back to `null` and the audit names the gap. Proven by driving the real catalogue, by the route, and by a source-level assertion **controlled** against a mutated copy with the fallback restored. |
| 16 | **The licence snapshot spread a string into characters** | `snapshotLicence` did `Object.freeze([...(lic.excludedTerritories \|\| [])])`. On a string that is `String.prototype[Symbol.iterator]`, so a row authored `excludedTerritories: 'US'` recorded `['U','S']` in the durable record — a territory list nobody wrote, inside the artifact whose whole purpose is immutability. Round 14 made the validator reject that row and the gate refuse it, so it is unreachable *from the catalogue*; the record must not be the one place an unreadable value is reshaped into a plausible one. | A non-array records `null` — "not read", the same answer `licenceTerms.exclusionList()` gives — and a control asserts a real list is still copied, frozen and **not** an alias of the catalogue row. |
| 16 | **A boolean in an evidence record collapsed "not told" into `false`** | `commercial === true`, `grantRecorded === true` and `requiresAttribution === true` each recorded `false` for two different facts: "the caller said this was not commercial" and "nobody said anything". The auditor's question is *was this run authorised?*, and those two answer it differently — so the record asserted a refusal, and a licence condition, that were never claimed. Same mistake as round 13's money coercion, in the fields that decide whether a licence was needed at all. | A boolean in the record is now **tri-state**: `true`, `false`, or `null` for "not told" — deliberately falsy everywhere the old `false` was, so nothing downstream reads it as a grant. The two caller-supplied flags change nothing the runner does (it always passes a boolean); for the catalogue-supplied `requiresAttribution` the validator now **requires** a boolean, because `auditProvenance` reads it to decide whether a missing attribution makes the record incomplete. |
| 16 | **The round-16 probe's first draft compared two absences** | The route check read `listed.model_version === capabilities(LOCAL).modelVersion && listed.model_version !== listed.id` and **passed against the pre-fix tree** — both sides `undefined`, and `undefined !== 'comfyui/minimax-h3'`. An assertion that compares two absences is satisfied by a field that does not exist: the same vacuity as the `expect(r.modelVersion).toBeTruthy()` this round exists to replace, written by the probe that exists to replace it. | It asserts a real string before the equality, and the round is **controlled** by running the finished probe against the round-15 tree: **12 failures there, 29/29 here**. Recorded rather than quietly corrected, because it is the fourth appearance of this class in this lane. |
| 17 | **"Not the provider id" was an EXACT test, so padding and case defeated it** | Round 16's validator compared `spec.modelVersion === id`, which rejects only the byte-identical string — while the plausible authoring mistake is a copy-paste of the id with a stray space. `' comfyui/minimax-h3 '` and `'COMFYUI/MINIMAX-H3'` both PASSED, and the record then repeated the provider id in the field that exists to distinguish it: round 16's defect, surviving inside round 16's fix, reachable by the one near-miss a human actually types. The record also stored the value UNTRIMMED, so `'  MiniMax H3  '` and `'MiniMax H3'` — the same model — compared unequal. | The comparison is normalised (`trim` + case-fold) on BOTH sides, and the record returns the label trimmed. Deliberately **not** extended to internal whitespace: collapsing that would make `'Sora 2'` and `sora2` equal and refuse a legitimate row at boot — measured, not argued, and pinned as a CONTROL so the boundary cannot drift. Controlled against a mutated source with the exact test restored. |
| 17 | **The AUDIT never checked the property the validator guarantees** | Round 16 stopped the RECORD filling `modelVersion` with the provider id and left `auditProvenance` reading truthiness — so a record built from any `caps` that never went through the catalogue (the function is exported and takes whatever it is handed) could still repeat the provider id and be reported **COMPLETE**. The validator covers catalogue rows; the audit is the last check before a reader, and it was the one place the property was not asserted. Round 13's lesson — a guard whose safety rests on another file's validation needs an assertion of its own — applied to round 16's own fix. | The audit now refuses such a record with a **distinct** token, `modelVersion.duplicatesProvider`, because "add a value" and "change this value" are different repairs and one token for both would send a reader to do the wrong one. A CONTROL pins that a record from the real catalogue is still complete. |
| 17 | **A widened value domain did not move the schema version** | Round 16 made three fields `boolean \| null` and one `Array \| null`, then asserted `PROVENANCE_SCHEMA` was unchanged because "the record's shape did not move, only what its fields are allowed to claim". **That claim was false.** A reader of v1 parses `licence.excludedTerritories` as an array and calls `.includes()` on it; it now throws on a record this code happily produces. The constant's own comment is *"Bump when the RECORD SHAPE changes, so a reader can tell how to parse it"* — and a widened domain IS a parse change. It is not theoretical: `snapshotLicence({ licence: { name: 'x' } }, {})` yields four nulls, and both it and `buildProvenance` are exported. | `PROVENANCE_SCHEMA` is **2**, so a reader can tell. A v1 record now audits as `missing: ['schema']` — the fail-closed direction, and deliberate: "we cannot tell you this is complete" beats a green tick from a parser that read the field as the wrong type. `demo-http-flow.mjs` pinned the literal `1` and now imports the constant, which is the round-15 lesson (a check that names a copy of the artifact can only be right about the copy) in the end-to-end demo. |
| 17 | **The round-17 probe's first draft demanded a normalisation that would have broken the rule** | Section A's third check asserted that `'comfyui / minimax-h3'` — the id with a space around the slash — must be rejected, and it FAILED against the fixed code. It was the probe that was wrong: closing that hole requires deleting ALL whitespace before comparing, which makes `'Wan 2.2'` equal to `wan2.2`, so a provider id without a vendor prefix plus a model name differing only by a space would be **refused at boot**. A rule that refuses the normal case is broken, not fail-closed. | Converted into a CONTROL that pins the boundary and carries the counter-example, so the next reader finds the reason rather than filing the bug. Recorded rather than quietly corrected: it is the **fifth** appearance of "the probe was the defect" in this lane, and the second in a probe written specifically to catch it. |
| 18 | **`verify()` reported `ok: true` for a template that cannot be used** | Its template check was `Boolean(path) && existsSync(path)` — which answers "is there a file at that path", and was read as "is this provider ready". Measured: a file containing `{ this is not json` and a GUI-format export both returned `verify().ok === true` with all three checks green, while every run against either throws. This is the one command whose whole purpose is to be *"the first command run on the render box, by whoever has not finished setting it up"*, and it was answering a different question. | It now calls `loadGraph` — the same function `buildGraph` uses — so the check reports what a run would actually get, and names the file and the code when it fails. A template that is present but unloadable is no longer "ok". |
| 18 | **`verify()` never checked that the binding names a node the template DECLARES** | `SWAN_COMFYUI_NODE_PROMPT=99` against a template containing only nodes `1` and `9` reported `ok: true`. Every run then throws `E_NO_NODE` — but `buildGraph` runs INSIDE `generate()`, which the queue reaches only after the quote was authorised and the job created, so the typo costs a JOB. The check that exists to prevent exactly that could not see it. | `inspectBindings()` compares each SET binding against the loaded graph and reports the node id, the ids that ARE present, and the environment variable to change. The optional bindings get their own line, so a broken duration/seed/image binding is named rather than hidden behind a healthy prompt binding. `buildGraph` and `inspectBindings` iterate ONE table (`BINDINGS`), because two lists would drift and the drift is invisible in the direction that matters — a report calling a configuration healthy that every run refuses. |
| 18 | **`FIELD_CANDIDATES[slot]` walked the prototype chain and returned a FUNCTION** | `FIELD_CANDIDATES['constructor']` is `Object`, so `(FIELD_CANDIDATES[slot] || [slot]).find` threw `is not a function` — a raw `TypeError` where a named refusal belongs, which is the "fails as the wrong answer" failure `wire.mjs` names. Same class as round 6's `VIDEO_PROVIDERS['constructor']` and round 13's `all.callers['__proto__']`, in a third shape. | An `own()` helper (`Object.hasOwn`, with a null guard) replaces every prototype-resolving lookup, and a slot named after an `Object.prototype` member now raises `E_NO_INPUT`. The fallback to the slot's own name is deliberately KEPT, so an unknown slot behaves as it did. |
| 18 | **`'constructor' in node.inputs` was TRUE on every node — which broke the guard's core promise** | The comment above that line says DETECTION, NEVER CREATION, and explains why creating an input is the worst available failure: *"ComfyUI silently ignores an input a node does not declare, so the graph would run at full GPU cost, render whatever placeholder prompt the template was saved with, and report success."* `in` resolves through the prototype chain, so `'constructor' in {}` is `true`. Had the line above it been fixed alone, a prototype-named slot would have been "detected" and the prompt written to a key ComfyUI ignores — the exact failure the guard exists to prevent, introduced by fixing its neighbour. | The `.find` predicate is an own-property test, so a phantom input cannot be detected, and a CONTROL replays the assertion against a source with `in` restored. This is the fourth shape of the prototype-lookup class in this lane, and the first one where the bug was in the GUARD rather than in a lookup table. |
| 18 | **A node id resolving to a prototype member made the code WRITE to a global built-in** | `graph[nodeId]` resolves `graph['constructor']` to a FUNCTION, and `node.inputs = node.inputs || {}` then wrote to it. Measured: `SWAN_COMFYUI_NODE_PROMPT=constructor` created `Object.inputs` on the global `Object` constructor — a mutation of a process-wide built-in, triggered by an operator-set environment variable, from a function whose contract is to be a pure graph helper. It failed closed for the run (`E_NO_INPUT` afterwards), which is why it would not have been noticed. | The node is fetched only when `own(graph, nodeId)` holds, and a value that is not an object is refused as `E_NO_NODE`. The probe asserts the code AND that `Object.inputs` was not created — a control that fails if the write returns. |
| 18 | **`loadGraph` validated JSON *syntax* and never JSON *shape*** | `JSON.parse('null')` succeeds, so a template file containing `null` was returned as a "graph", and the next call ran `Object.keys(null)` inside its own `E_NO_NODE` message and threw `Cannot read properties of null (reading '1')`. A bare array and a scalar parsed the same way. A refusal that cannot say what is wrong is a refusal the operator cannot act on. | `loadGraph` now requires a non-null, non-array object and refuses anything else as `E_BAD_WORKFLOW`, naming the file and what it actually contained. The GUI-format check keeps its own, more specific code. `verify()` reports it too, since it loads through the same path. |
| 18 | **The code-coverage gate was blind to the four modules that raise the most codes** | Round 7's check asks *"of the codes the GATEWAY can raise, which have no defined status?"* — and its `GATEWAY` list contained no adapter module. **Eighteen** codes (`E_NOT_CONFIGURED`, `E_NO_WORKFLOW`, `E_BAD_WORKFLOW`, `E_GUI_FORMAT_WORKFLOW`, `E_NO_NODE`, `E_NO_INPUT`, `E_NO_OUTPUT_PATH`, `E_SUBMIT_REJECTED`, `E_SUBMIT_FAILED`, `E_NO_PROMPT_ID`, `E_NO_REQUEST_ID`, `E_DOWNLOAD_FAILED`, `E_EMPTY_ARTIFACT`, `E_NO_OUTPUT`, `E_GENERATION_FAILED`, `E_CANCEL_FAILED`, `E_TIMEOUT`, `E_NSFW`) had no status anywhere and fell through to 400 — which says *"your request was malformed"* about a graph the caller never wrote. Third appearance of the same lesson in this lane: a green gate can be green because it never looked. | All four adapter modules are in the `GATEWAY` list, and all eighteen codes are mapped to the layer that actually refused — 8 at 500 (our provisioning or our graph), 8 at 502 (the provider failed or broke its contract), `E_TIMEOUT` at 504, `E_NSFW` at 422. The probe writes the expected map out itself rather than reading it back, and asserts the boundary the adapter's own comment draws: a 4xx submit is OUR graph at 500, a 5xx is the PROVIDER at 502. **Reachability is stated rather than assumed** — an adapter refusal reaches a caller as `job.error.code` on a 200 job fetch, so this mapping changes no response today. |
| 18 | **The round-18 probe's own CONTROLS passed vacuously against the pre-fix tree** | Three of them asserted an ABSENCE — "the load is gone", "the `in` test is restored", "the adapter is missing from the list" — by testing that a string was not present. Against the pre-fix tree the string was never there, so the mutation was a no-op and the control passed for the wrong reason: one of them passed *because the defect it was checking for was still in the code*. **An absence assertion cannot tell "removed" from "never there"** — the trap this lane has now walked into four times. | Each control asserts that the mutation CHANGED the source (`mutated !== original`) as well as the absence. Caught by reading the pre-fix control output rather than the post-fix one, which is the whole point of running the control. Recorded rather than quietly corrected, because a control that cannot fail is the defect it was written to catch. |
| 18 | **The README's own file tables had omitted both files this round is about — and a third module besides** | Round 16 found `provenance.mjs` missing from the provider-layer table. Round 18 found `comfyuiLocal.mjs` and `comfyuiGraph.mjs` missing from it: the same gap, in the round whose entire subject they are, and nothing noticed either time. Once section G made it an assertion, the check immediately found a **third** — `promptPolicy.mjs`, 260 lines holding the licensor's content-policy commitment, absent from the table since it was written. Under-claiming is a correctness problem (rule 75), and a table nobody checks drifts silently in the direction that looks like "nothing to say". | All three now have rows, and section G asserts that every module in `shared/providers/video/`, `media-api/` and `backend/scripts/handlers/` has a ROW in the document — 53 modules. **The check's own first version was vacuous**, and that is worth recording: it asked whether the name appeared ANYWHERE, and the round-17 README satisfied it for both comfyui modules because round 17's narrative names them in a sentence. It passed for the two files whose absence was the defect. It now requires a table row (`| \`name\``), which prose cannot satisfy, and carries a mutation control. One pre-existing handler, `completion.mjs`, is exempt BY NAME with its reason — the lane has never modified it and it is absent from the patch — and a stale exemption fails. |
| 19 | **A graph that RAISED on the GPU was reported as a graph that FINISHED with nothing** | ComfyUI reports an errored run as `outputs: {}` with `status_str: "error"`. `{}` is TRUTHY, so `entry?.status?.completed \|\| entry?.outputs` broke the loop, `findOutputFile` found no video, and the refusal was `E_NO_OUTPUT`: *"ComfyUI reported completion but produced no video output. Check that the graph ends in a video-saving node."* Measured with a fixture whose node raised `CUDA out of memory` — which was sitting in `status.messages` the whole time, in a field no code path had ever opened. | A failed run now raises `E_GRAPH_FAILED`, and the message names the node, its type and its own exception, quoted verbatim. The reporting half is closed; the permanence half is item 21 under "NOT proven", because it lives in the runner. |
| 19 | **The break condition was a truthiness test on a CONTAINER, not a completion test** | `entry?.outputs` is not a question about completion — it is a question about whether the key exists. `{}` is truthy, `[]` is truthy, and ComfyUI emits `{}` for a run that has not produced anything YET as well as for one that raised. So an entry that was still executing on the first poll was read as a finished graph and reported as `E_NO_OUTPUT`. | `terminalState()` answers `pending` / `done` / `failed` from the entry, decides `failed` BEFORE `done`, and consults `outputs` only after `status_str` and `completed` have both been read. The unknown direction is `pending`, deliberately: a false failure abandons a render that is still running, while a false pending costs only the timeout that was already budgeted. |
| 19 | **`completed: true` alongside an execution error was unreachable, because `\|\|` short-circuits** | The two facts are not mutually exclusive in ComfyUI's wire format, and the loop tested `completed` FIRST — so whenever the flag was set the error branch could never run. Measured: the same failing entry with `completed: true` produced `E_NO_OUTPUT`. | The failure is decided first, unconditionally. Pinned by a check that feeds the identical error payload twice, once with the flag clear and once with it set, and requires the same code both times. |
| 19 | **A still-EXECUTING job was read as a finished one** | Same line, different direction: `{ status: { completed: false }, outputs: {} }` — an entry that exists, has not finished, and has an empty outputs object — broke the loop on its first poll and was reported as a graph that finished with nothing. | It is now `pending`, and the run ends in `E_TIMEOUT` with the "still running" wording. The fixture is synthetic and is labelled as such in the probe: the shape is plausible, the measured fact is that the predicate cannot distinguish it from a failure. |
| 19 | **`E_TIMEOUT` asserted "The job is still queued on the GPU" without knowing it** | The message was unconditional. When the history endpoint never answered a single poll, or answered every poll without ever holding the prompt, the code had established the OPPOSITE — that it had no evidence of a queued job at all — and still stated a cause. The same defect as round 16's fabricated provenance field, one file over: a report must not state something it does not know. | The loop now counts what it actually observed (`historyOk`, `sawEntry`) and `describeTimeout()` reports one of three situations: no record at all, an entry that is genuinely still running, or a history endpoint that never answered. The sub-second budget is also printed as milliseconds, because "within 0s" reads as a broken message rather than a short one. |
| 19 | **Two of the round-19 probe's own checks passed on the pre-fix tree** | The first version of the `E.` absence check STRIPPED the offending string from the source and then asserted it was absent — which passes pre-fix, because the strip is what removed it. That is round 18's vacuity one level down: a check that mutates its own subject and then asserts the mutation took effect tests the mutation, not the code. The `D.` disclosure check asked only `isPermanentCode('E_GRAPH_FAILED') === false`, which is false for every string the runner has never heard of — so it passed on a tree where the code did not exist. | The control now runs in the other direction: RE-INTRODUCE the defect into a copy and require the assertion to fail on it. The disclosure now requires the code to EXIST as well as to be retryable. Both were caught by reading the PRE-FIX control output rather than the green run. |
| 20 | **`verify()` called the credential ACCEPTED on the strength of the vendor failing** | The probe is a status GET for a non-existent request id, and the code treated every status that was not 401/403 as proof the credential worked. Measured: a **500**, a **503**, a **429**, a **301** and a **302** each produced `ok: true` with the detail *"host reachable, credential accepted (probe answered 500)"*. This is the first command run on a machine that is not set up, and it answered YES because the vendor was down. Round 18's finding 1, in the other adapter. | A status now proves the credential only if the API reached a DECISION about the request — a 2xx, or a non-auth 4xx. A 5xx, a 429 and a redirect are INCONCLUSIVE, the check fails, and the detail names which of the three it was. `ok: false` is right on its own terms too: a vendor that cannot answer is not a usable provider. |
| 20 | **A rejected credential became a fifteen-minute timeout that asserted billing** | `poll()` treated every non-ok response as a blip, so a status endpoint answering **401 on every poll** spun to the deadline and then raised `E_TIMEOUT` carrying *"The request may still be running and billing."* The code had established the opposite: it had never read a status at all. The credential is identical on every poll, so no amount of waiting can change the answer — and the job spent its whole attempt budget discovering that. | A 401/403 on the status endpoint refuses immediately with `E_POLL_REJECTED`, naming the status and the two variables to check. Every other failure is still a blip, and the timeout now reports what was observed — `describePollTimeout` distinguishes *no poll completed*, *every poll was refused*, *some were*, and *a genuinely slow render*, and only the last keeps the billing warning. |
| 20 | **The credential's destination was never checked for https** | `SWAN_HIGGSFIELD_URL` was used verbatim, so a base URL of `http://` put `Authorization: Key <id>:<secret>` on the wire in cleartext on every request — measured, with the header quoted out of the probe's own recorder. The vendor's authentication page instructs integrators to keep credentials out of anything observable. | `insecureBaseUrl()` refuses a non-https base URL **when a credential is present**, before the header is built, so nothing leaves the process. It deliberately returns null when there is no credential to protect: an http base URL pointing at a local stub is a legitimate way to exercise this module, and refusing it would break the normal case of a test. |
| 20 | **The response body chose what this process fetched** | `findArtifactUrl` returns a string out of the vendor's body and `generate()` issued a server-side GET to it with no validation of any kind, then wrote the bytes to disk. Measured: `http://169.254.169.254/latest/meta-data/` was fetched. A vendor response — or anything that can influence it — picked the target of a request made from inside this process. | The URL must be absolute https, checked before the fetch, with `E_BAD_ARTIFACT_URL` naming what was wrong. The SCHEME is what is checked, not the origin: the vendor may legitimately serve artifacts from a CDN, and an origin allowlist built on infrastructure this lane has never observed would refuse real artifacts. Recorded as a limitation, not as a protection. |
| 20 | **The probe's own fixture never exercised the path it was written to test** | Section D's first version built the completed status body as `{ status: 'completed' }` — without the artifact URL in it — so `findArtifactUrl` returned `null` and the run ended at `E_NO_OUTPUT`. The section would have measured the wrong branch entirely and reported the unvalidated fetch as "not reached". Caught by reading the fixture against the code path before the control run rather than by a vacuous pass, which is the cheaper half of the round-19 lesson: a check that cannot reach its subject is the same defect as one that cannot fail. | The fixture now carries `video: { url }` so the URL reaches `generate()`, and the `E_NO_OUTPUT` control passes `{ video: null }` explicitly — the two branches are now separable, which is what the section needed to be. |
| 20 | **Two hand-written counts in the prose had drifted, and nothing read them** | The closing block said "the same **55**-file list" while the same paragraph said "**58 files**" twice. 55 dated from the round when the patch held 55 files and had survived **three rounds** (round 18 was 57 files, round 19 was 57, round 20 is 58) because no assertion had ever read this prose. The gate-16 section carried a second instance: it said "the assertion total is **936**" — round 19's total — while its own parenthetical, *853 + 59 + 24 + 32*, summed to 968. The round-20 update corrected the total in two places and missed the third. Both are row 18's defect in a new costume: a hand-written count with no assertion over it drifts silently in the direction that reads as "nothing changed", and a reader reconciling the block against the artifact finds two different numbers in one paragraph with no way to tell which is the receipt. | Both counts are corrected, and round 18's section G now asserts them — **G2** requires the closing block to state ONE file count in all three sentences that mention it, **G3** requires the modified/new split to add up to the total, and **G4** requires the stated assertion total to equal the sum of the parts its own parenthetical lists. All three are checkable **without git**, deliberately: the patch is generated after this document and does not exist in the clone, so a git-derived count would be green in the worktree and red in the receipt — the exact failure the apply-to-a-fresh-base ritual exists to prevent. The **byte** count stays approximate and the document says why; the file count has no such excuse. The new control also had to be written carefully: it re-introduces a stale count into a copy, and **it failed on the first run** because the document already contained the defect, so the mutation was a no-op — which is the rule that a control must assert the mutation CHANGED the source, catching its own author. |
| 21 | **`record()` laundered a ledger it could not read, and the next free run re-enabled billing** | The READ half was hardened over four rounds: a truncated file, a misshapen day and a count that is not a count each degrade the ledger and refuse billing. The WRITE half was never attacked, and it undid all three. `read()` returns `{}` for a corrupt file, and `record()` wrote `{...{}, [day]: next}` — a file that parses, carrying one day, with every other day gone and the corruption invisible. `degraded` cleared and billing resumed against a counter rebuilt from nothing. This is reachable from the lane the refusal deliberately leaves open: **the free local path still runs while degraded**, and its first `record()` is the laundering. Measured: $40 recorded of a $50 ceiling, file truncated to `{`, ONE free local run, then a $12 billing run admitted. | `record()` will not write over a ledger it could not read, and returns `null`. Not recording costs nothing already lost — while degraded, `usageFor` reports zero, so the volume ceiling already cannot bind — and it keeps the corrupt file visible until a human does what the error message already says: repair it or delete it. |
| 21 | **A day whose totals could not be read was replaced by totals this code invented** | `all[day] \|\| { runs: 0, spendUsd: 0 }` followed by `Number(rec.runs) \|\| 0` reads a string as an empty record and `"many"` as `0`. So a day record of `'yesterday-was-busy'`, `[1,2,3]`, `-5` or `'many'` was overwritten with a fresh count — and the replacement parses, so `degraded` cleared. One level below the row above, and the same defect: a value the reader refuses is one the writer went on to replace. | `dayRecordIsTrustworthy` is now ONE predicate both halves call, so they cannot drift — the same move `licenceTerms.mjs` makes for the licence vocabulary. `record()` refuses a day it cannot read; `usageFor` still refuses to return it as a count. |
| 21 | **The 30-day trim silently discarded the day it was recording** | The trim sorted descending and sliced 30, so a day outside the window vanished while `record()` still returned its total and `usageFor` then read `0/0` with `degraded: false`. Two ways in. The obvious one is a backdated day with 30 newer ones present. The one that matters is **30 future-dated days planted in the file**: those are valid JSON holding valid counts, so the file is not corrupt and nothing degrades — today's usage is evicted on **every** write and the ceiling never accumulates. The anti-truncation fix detects a file it cannot **parse**, not one that **forgets**. | `trimKeeping` always retains the day being recorded, displacing the oldest retained entry instead of the newest. Retention is still 30. Today's row is the one the ceiling is computed from; the oldest row is the one that answers no question this guard asks. |
| 21 | **A ledger write that failed became a failed render — and an unwritable ledger read as a fresh day forever** | `record()` runs at `generateVideo.mjs:207`, **after** `adapter.generate` has returned, and its `fs.writeFileSync` was unguarded. A ledger path whose directory does not exist (or a read-only disk, or EACCES) threw ENOENT out of a completed job — for a billing provider the vendor had already charged. And because ENOENT is deliberately excluded from `degraded`, the same path read as a fresh ledger on every subsequent request: the ceiling never bound **and** every job failed after succeeding. | The write is caught, and a write that does not land sets a **sticky** `writeFault`, so the ledger degrades and the next billing run is refused while the free lane keeps running — the asymmetric degradation this module already uses for a read fault, applied to the write. Two faults are tracked separately on purpose: a read fault is recomputed every read, because a repaired file must stop being degraded, while a write fault cannot be cleared by a read, because the file being parseable says nothing about whether the spend was recorded. |
| 22 | **`authorized()` threw instead of refusing when it could not read the request** | `req.headers.authorization` raised a TypeError when `req.headers` was absent. An auth check that throws is not a 401: `server.mjs` catches it and answers **500** with a stderr line, so "I cannot tell whether you are authorised" and "the gateway broke" became the same response. The file already states the governing principle about its own `token` argument — *a guard that only holds because of a caller's precondition is not a guard* — and applied it to `token` but not to `req`. | A request carrying no headers presented no credential, so it returns `false`. The three real decisions (right token, wrong token, missing header) are unchanged and asserted. |
| 22 | **`readBody()` reported success on JSON the routes cannot dereference** | `JSON.parse` accepts `null`, a number, a string, a boolean and an array, and every one of them was resolved as a valid body. `null` is the one that bites: `server.mjs:218` hands it to a route, the route reads `body.provider`, and the TypeError surfaces to the caller as **500** where a body this gateway cannot use is **400 E_BAD_JSON**. Measured through the real `createQuote`, not described. A parse layer that reports success on input its own consumer cannot use has not finished its job. | Only a plain JSON object is accepted; everything else is `E_BAD_JSON`, naming what arrived. Arrays are refused with the scalars because `typeof []` is `'object'` and no route in this gateway takes a list. |
| 22 | **`send()` could have its own envelope taken away by the caller it exists to constrain** | The docstring says the function exists so that *no route invents its own envelope*, and `...extraHeaders` sat **last** in the header object — so a caller passing `content-type` or `content-length` replaced both. Measured: `content-length: 999` on a 7-byte payload, which either truncates the body or desynchronises the next response on a keep-alive socket. | Caller headers are applied first and the two invariants overwrite them, so extra headers still work (`server.mjs` sends `connection: close` on a 413) while the fields this function owns cannot be removed from it. |
| 22 | **`safeEqual()` called two ABSENT values equal** | `Buffer.from(String(undefined))` is the nine-character string `"undefined"` on both sides, so `safeEqual(undefined, undefined)` was `true` — as were `(null, null)` and `("", "")`. "Neither side supplied a value" read as "the values agree". Unreachable through `authorized` only because that function validates `token` first: the token bypass this file already fixed, reached through the other argument. | Both arguments must be strings. Equal strings still compare equal, different strings still do not, and a length mismatch is still a mismatch without throwing — all three asserted. |
| 21 | **The close-out: round 20's count assertions covered one block, and the other drifted** | Round 20 asserted the file count in the **closing** block (G2/G3) and the assertion total in the gate-16 sentence (G4). The **re-verification** block states the same file count in five more places, and round 21 had to correct all five by hand — they said 58 while the closing block said 59, with every gate green. It is the round-20 finding one more time, in the block that finding did not reach: **asserting a count in one place does not cover the other places it is written.** | **G5** requires the re-verification block's count to equal the closing block's, in all six places, with a mutation control in the re-introduce direction. The lesson generalises: a self-consistency check has to be TOTAL over the places the fact is stated, not over the one the author happened to be editing. |
| 23 | **`mimeForFilename` resolved an extension through `Object.prototype`** | `MIME_BY_EXT` is a plain object literal — `Object.freeze` does not remove the prototype — so `MIME_BY_EXT[ext]` is not a miss for a name that lives on `Object.prototype`. Measured: `mimeForFilename('out.constructor')` returned the **`Object` constructor, a function**, and `('out.__proto__')` returned `Object.prototype`. Both are truthy, so `completionBody`'s `\|\|` passed them through, and `JSON.stringify` then **dropped the key entirely** — the queue received a completion body with **no mime at all**. Only names that are already lowercase can reach the prototype, which is why the obvious probe (`a.toString` → `tostring`) came back clean and hid this. The same class round 18 fixed three times in `comfyuiGraph.mjs`, in the one module the file-table check had formally exempted. | `Object.hasOwn` for the lookup, plus a type assertion, because the value goes into a JSON body (which drops a function) and an HTTP header (which stringifies one). Probed TOTAL over `Object.getOwnPropertyNames(Object.prototype)` rather than over the two names that happen to work, so a hand-written list cannot drift. |
| 23 | **`completionBody` used `\|\|` where a TYPE was required** | `\|\|` answers "is it absent", and a function is not absent — so the fallback that reads as "a string is guaranteed here" guaranteed nothing. Its sibling `r2Key` had the same shape, and a non-string there serialises away just as silently. | Both fields go through one predicate, `str(v)` — a non-empty string or `null` — so "undeclared" and "wrong type" reach the same fallback and the payload always carries a usable string. |
| 23 | **`completionSummary` shipped the exact string its own header indicts** | The docstring says `offset undefineds usable=undefined` is *"worse than silence, because it reads as a measurement that ran and failed"* — and then leaves that expression as the default for any handler that declares no summary. The `??` fix only helped callers that already declared one, and `render-agent.mjs:262` prints this unconditionally to the operator log. | The offset line is reached only when **both** of mediasync's fields are present; otherwise the line names the gap (`no summary declared by this handler`). No test covered the absent case, so nothing could have caught it — the round adds those cases, including `summary: ''` and a whitespace summary. |
| 23 | **The ledger's own totals had drifted, and the assertion covered only some of them** | Round 21's **G5** made the *file* count total over all six places it is written, and left the **gate count** and the **defect total** with no assertion at all. Both had drifted: the patch paragraph said *"twenty-seven gates"* while three other sentences said twenty-eight, and the rounds table held **83 rows** under a sentence claiming **70** — rounds 21 and 22 added nine rows and never moved the number. A third instance sits one paragraph away: the gate-16 total was corrected in two places and missed a third. | Round 23's section **E** asserts the gate count in every sentence that states it, requires it to equal the number of commands the receipt itself lists, requires the defect total to equal the table's own row count, and requires the stated assertion total to equal the sum of the parts the receipt lists — each with a re-introduce-direction control. The broader draft ("every sentence stating the total agrees") was **narrowed, not kept**: it fired on row 20's narrative, where `936` is a *quotation of a corrected defect* rather than a live claim, and a guard that fires on the document's own account of a fixed bug is a guard the next author deletes. Recorded as a rejected rule so it is not re-proposed as a gap. |

Round 7 was built to be the dry pass and was not, so Round 8 was. **Round 8's first run found no defect
in the code at all** — all three of its failures were the probe asserting something the code
deliberately does not do. That is what a dry pass looks like, and the three are worth recording
because each one nearly became a false accusation:

| Round 8 assertion | Why it was wrong |
|---|---|
| "a valid free local request passes the gates" | The probe passed `env: {}`, so nothing was enabled and everything returned `E_PROVIDER_DISABLED`. An unset `SWAN_VIDEO_PROVIDERS_ENABLED` enables nothing — the fail-closed reading. The probe was wrong about the default, not the code about the gate. |
| "provenance carries the prompt HASH, not the prompt" | Provenance carries **both**: up to `PROMPT_KEEP_CHARS` (500) of the prompt for human review, plus a sha256 of the *full* prompt. Deliberate and documented. The check now tests the BOUND — including that the recorded hash is of the full prompt, so a truncated slice cannot reproduce it. |
| "an empty prompt is refused as INPUT, before any licence question" | Licence precedes input shape, and that is **correct**: a commercial request against H3 is unlawful whatever the prompt says, so telling the caller to fix their prompt would be true and useless. The probe now asserts the order that exists, both ways. |

Round 8 also confirmed three things it was designed to be able to falsify: the body cap is
off-by-one-safe (exactly 262,144 bytes accepted, 262,145 refused **with a deliverable parsed 413**),
the quote store's expiry is an exclusive bound evaluated on read and pruned on write, and the gate
order is enablement → licence → input shape.



## §4.3 — README.md §1038-1128 — round 23, the most recent pass, in full

### Round 23 — the queue-completion projection, and the ledger's own arithmetic

The ledger test picked this surface by the rule that has found every good surface in this lane:
`backend/scripts/handlers/completion.mjs` is the **one module the file-table assertion exempted by
name**, on the stated grounds that *"this lane has never modified it (absent from the patch)"*.

That reason is a fact about the **patch**, not about the lane's dependency surface.
`generateVideo.mjs` imports `mimeForFilename` from it, so every video job's `r2Key`, its mime and the
line the operator watches are all built out of this file. An exemption justified by "we never edited
it" cannot distinguish a module *outside* the lane from a module the lane *depends on and never
looked at* — and the second kind is exactly where the best finds are. Twenty-two rounds attacked the
money, the licence, the provenance record, both adapters, the ledger's write path and the HTTP
primitives, and left the one module the review had formally excluded from its own coverage
assertion unexamined.

**Three defects in the module, and one in the document.**

1. **`mimeForFilename` resolved an extension through `Object.prototype`.** `MIME_BY_EXT` is a plain
   object literal, and `Object.freeze` does not remove the prototype. Measured:

   ```
   mimeForFilename('out.constructor')  ->  [function]   the Object constructor
   mimeForFilename('out.__proto__')    ->  [object]     Object.prototype
   mimeForFilename('out.toString')     ->  'application/octet-stream'   (clean — see below)
   ```

   The third line is why this hid for twenty-two rounds. The extension is lowercased before the
   lookup, so only names that are *already* lowercase can reach the prototype; `toString` becomes
   `tostring` and misses. **The obvious probe comes back clean and the defect does not.** Both
   reachable values are truthy, so `completionBody`'s `||` passed them straight through — and
   `JSON.stringify` then dropped the key, because a function is not JSON:

   ```
   {"r2Key":"jobs/j1/mediasync.json","output":{}}
   ```

   **No `mime` at all.** The queue stored a completion with no artifact type, which is the same
   defect this module was extracted to fix — a queue that believes something it was never told —
   one layer down. The probe now enumerates `Object.getOwnPropertyNames(Object.prototype)` rather
   than the two names that happen to work, so a hand-written list cannot drift out from under it.

2. **`completionSummary` shipped the exact string its own header indicts.** The docstring calls
   `offset undefineds usable=undefined` *"worse than silence, because it reads as a measurement that
   ran and failed rather than a field that was never meant to apply"* — and leaves that expression
   as the default. The `??` fix only helped handlers that already declared a summary, and
   `render-agent.mjs:262` prints the result unconditionally to the operator log. The offset line is
   now reached only when **both** of mediasync's fields are present; anything else names the gap.
   No test covered the absent case, which is why nothing caught it — so the round adds those cases,
   including `summary: ''` and a whitespace summary.

3. **`completionBody` used `||` where a TYPE was required.** `||` answers "is it absent", and a
   function is not absent. The fallback that reads as *"a string is guaranteed here"* guaranteed
   nothing, and `r2Key` had the identical shape. Both now go through one predicate — a non-empty
   string or `null` — so "undeclared" and "wrong type" reach the same fallback.

**And the fourth finding is not in the code at all.** Round 21 established that a self-consistency
check has to be **total** over the places a fact is written, and then made the *file* count total
over all six of its homes — while leaving the **gate count** and the **defect total** with no
assertion whatsoever. Both had drifted:

- The patch paragraph said **"twenty-seven gates"** while three other sentences said twenty-eight.
- The rounds table held **83 rows** under a sentence claiming **70** — rounds 21 and 22 added nine
  rows and never moved the number.

Neither is findable by reading, which is the whole point: both are checkable by *arithmetic*, and
nothing was doing the arithmetic. Round 23's section E now asserts the gate count in every sentence
that states it, requires it to equal the number of commands the receipt itself lists, requires the
defect total to equal the table's own row count, and requires the stated assertion total to equal
the sum of the parts the receipt lists — each with a re-introduce-direction control.

**One rule was drafted and then narrowed, and the narrowing is recorded rather than hidden.** The
first version of E4 asserted that *every* sentence stating the assertion total agrees. It fired on
row 20's narrative, where `936` appears as a **quotation of a defect that was corrected** — not a
live claim. A guard that fires on the document's own account of a fixed bug is a guard the next
author deletes, so the rule became arithmetic over the receipt's own parts. This is skill §20.6's
"reject noisy guards loudly, and record the rejection" — recorded here so it is not re-proposed as
a gap.

**The exemption is gone, and its control is stronger.** `completion.mjs` now has a row in the
handler table, the `NOT_LANE_OWNED` map is empty, and section G gained a **redundant-exemption**
control: a module that is both exempted *and* documented fails. Round 18's own list had only a
staleness check, and a staleness check cannot see an exemption that has stopped being needed —
which is where uncomfortable findings go to stop being visible.

**The control for the round, stated as a number.** The finished 49-check probe was run against the
round-22 tree restored from `HEAD` (`9f9957b1b`): **21 failures there, 0 here.** Three are the
mutation controls failing there for the reason they should — the strings they re-introduce do not
exist until the fix lands — four are section E on the stale document, and the rest are sections A
and B driving the real module. All three restored files were verified byte-identical by `sha256`
afterwards, so the "before" number is reproducible rather than remembered.



## §4.4 — README.md §1129-1420 — the headline number, the NOT-proven list, the branch divergence, Next, and Deliberately not done

### The headline number

```
hosted  MiniMax H3 @ 6s : $0.78
local   MiniMax H3 @ 6s : $0.00   (the 5090 already runs these weights)
```

That comparison is the whole commercial argument for the local lane, and before this work it was an
assertion rather than a number.

---

## NOT proven — read this part

1. **The GPU never ran. Astra's Slice 1 exit gate is still UNMET.** ComfyUI is not running on this
   machine, so the demo's adapter renders a real H.264 MP4 with **ffmpeg on the CPU**. The artifact is
   genuine, decodable media and every gate around it is real — but **no model produced it**, so this is
   not the "verified downloaded video" Astra's Slice 1 requires. Closing it needs ComfyUI up with the
   real graph, which needs Sean's explicit go-ahead (see "Next").
2. **The hosted lane is dispatchable but not runnable, on purpose.** It reaches the spend guard and
   stops at `E_UNKNOWN_COST`, because `costPerRunUsd` is `null` on every per-second row. The guard
   cannot bound a price it cannot express. `costEstimate.mjs` computes the number (`$0.6720`) and
   `/v1/estimate` already returns it — but wiring it into the guard would make hosted spend possible
   *without* the reservation ledger Astra gated hosted enablement behind. **Loosening a money gate to
   make a smoke test green is the wrong trade.**
3. **`toUsdNumber()` is a float bridge and a known weak link.** `spendGuard.checkRunAllowed` still
   compares floats. Converting micros back for it reintroduces exactly the arithmetic Astra ruled out,
   at the one boundary that matters. Named `toUsdNumber` rather than `asNumber` so a reader cannot
   mistake it for the authoritative path. **Round 13 widened this entry rather than narrowing it:**
   round 12's per-caller spend cap added a SECOND float comparison on the same money
   (`spend + runCostUsd > spendCap`, which refused a caller landing exactly on their ceiling), and
   round 13 removed that one. So the per-caller cap is now integer — and this entry is the only
   float money comparison left, which is why it is stated as a count and not as an example.
4. **The licence record's OTHER fields are still free-form, and the `evidence` flag's meaning changed.** Round 14 closed the vocabulary for `commercialUse` and the type of `excludedTerritories`, and it did **not** touch `name`, `restricts` or `grantRequestDoc` — three unvalidated strings a human reads, not a gate. Nor does anything check that a row declaring `requires-grant` actually lists a territory: because the restriction is territorial, such a row refuses nothing, which is correct for H3 and would be wrong for a licence whose restriction is not. One deliberate behaviour change, disclosed rather than smuggled: `evidence` went from *"the value is the string `unretrieved`"* to *"the field is present and non-empty"*. A hypothetical row that stored `evidence: 'retrieved'` would previously have passed and now refuses. No row does, and the documented way to clear the flag has always been to remove it — but it is a change, so it is stated. |
5. **A billed run that FAILS is not counted against the ceiling.** `ledger.record()` sits *after*
   `adapter.generate()` in `runGenerate`, so a failure records nothing. For the free local lane that is
   correct — a failed free render costs nothing. For a billed provider it would under-count, and
   Astra's `vendor_reported_gross_usd` / `settled_net_usd` split is exactly what is missing. Hosted is
   blocked today, so the live exposure is zero; the accounting gap is real.
6. **What the ceilings actually enforce, and what they only record.** Round 6's section H pinned
   three related gaps as executable disclosures. **Two of the three were closed in round 12** and the
   disclosure checks were rewritten to assert the new contract rather than the old gap — see
   "A green gate that could not fail" below for why that rewrite was not optional:
   - **A quote is not single-use.** The probe created a second job from one quote and got `202`, so a
     job can execute against a price captured up to five minutes earlier. `E_QUOTE_USED` and
     `E_QUOTE_CHANGED` are mapped in `wire.mjs` and **never thrown**; they are now labelled as reserved
     where they appear, because a code in that table that nothing raises claims an enforcement that
     does not exist. Reuse is *safe rather than lax* — every run re-runs the gates and charges the
     ledger, so the daily caps bind across reused quotes — but the table was overstating.
   - **~~`max_cost_usd` is a submission-time floor assertion, not a runtime ceiling.~~ CLOSED in
     round 12.** This was true when written: `max_cost_usd` was type-checked, compared against the
     quote's estimate, and stored on the job, and `generateVideo.mjs` never read it. It is now read
     and enforced — `ceilingGate.jobRefusal()` compares the caller's stored ceiling against the cost
     the guard authorised, and refuses `E_JOB_COST_EXCEEDED` permanently when the charge is over.
     Proven end to end through `runGenerate` in round 12's section B, including that a refused job is
     **not** charged to the ledger. The disclosure was left in place, struck through, because the
     original reasoning is what justifies the shape of the fix.
   - **~~There is no per-caller ceiling at all.~~ CLOSED in round 12.** `checkRunAllowed` now takes an
     OPTIONAL fourth parameter — a caller scope from `ceilingGate.callerScope()` — and the ledger
     records an additive per-caller split. Both caps come from the environment
     (`SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER`, `SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER`) and **both
     default to unset**, which is what makes the change additive rather than a new way to refuse
     everyone: with nothing configured the scope is `null` and the guard is byte-for-byte the
     three-argument function it always was.
7. **The per-caller ceiling binds at RUN time, not at quote time.** `preflight.mjs` still calls the
   guard with three arguments, so a caller can be **quoted** and then refused at submission. This is
   deliberate rather than overlooked — refusing at quote time would change the quote path, which is a
   separate decision — but it is a real difference from the global ceiling, which is checked in both
   places. Stated so the round-12 fix is not read as "every ceiling is enforced everywhere".
8. **The runner costs a run from the catalogue's per-run figure; `preflight` uses the
   duration-adjusted estimate.** `preflight` calls `checkRunAllowed(withEstimatedRunCost(caps,
   request), …)`; `runGenerate` passes `caps` straight through. For a per-second row the two
   therefore disagree: the quote is priced from `costPerSecondUsd × duration` and the run is refused
   with `E_UNKNOWN_COST` because the catalogue's `costPerRunUsd` is `null` on those rows. **No money
   is mis-spent** — the refusal is the fail-closed direction — but the message is misleading and the
   two paths are not one policy. Round 12 deliberately did **not** change the runner's cost basis:
   that is an engine behaviour change rather than a gate, and the two ceilings it added are
   refusal-only and cannot alter any outcome that currently succeeds. Making the runner cost a run
   the way `preflight` does is the next honest step and is Sean's call.
9. **The global and per-caller ceilings are AGENT-side.** Whoever runs the agent can raise them. The
   original commitment said "server-side caps enforced before submission", and that is still owed;
   unchanged by round 12, which added a third ceiling without moving any of them server-side.
10. **No `Range` support.** Astra asked for `206` on asset content; the probe got `200`.
11. **`reconcileOrphans()` marks orphans `failed`; Astra asked for `reconciling`.** Astra's `reconciling`
   is **non-terminal** and requires operator intervention. A job marked `failed` is a terminal claim we
   have not earned. Recorded in `server.mjs` beside the critical window.
12. **`modelPath` is `null` on every hosted row.** The vendor's per-model paths live behind an OpenAPI
   reference that was not fully retrieved, and **inventing one is worse than leaving it null**: a wrong
   path fails at the vendor with an opaque 404 *after* the request has been authorised and costed. A
   null path fails at `verify()` with an instruction.
13. **The gateway has never been bound against the real ComfyUI**, and `start()` (as opposed to
   `buildServer`) has not been exercised.
14. **The API is single-tenant, so its owner-isolation checks are structurally vacuous.**
    `server.mjs` hardcodes `principal: 'owner'` for every request: the bearer token authenticates the
    **operator**, not a caller. Two clients sharing the token are one principal. `createJob` checks
    `quote.owner !== principal` and the idempotency lookup filters `j.owner === ctx.principal` — both
    are correct code and neither can be reached over HTTP today. This is a **scope gap, not a defect**,
    and it is why `AUTH-002` (per-caller opaque tokens and scopes) is a wiring job rather than a
    rewrite: the isolation logic is already written and tested, it simply has no caller identity to
    work with. Asserted in round 8's section A so it cannot quietly stop being true. Round 9's section B
    goes further and pins the *ordering* that makes it true: ownership is tested before expiry, so a
    foreign quote and a missing quote give the same answer in every state — including expired, where the
    reverse order leaked the difference as a 410-vs-404 oracle.
15. **`POST /v1/jobs/:id/cancel` can only ever refuse, and that is measured rather than argued.**
    `createJob` calls `runner()` before the 202 is written, and the runner's first act is a microtask
    that sets `running`. Node drains microtasks before it reads another request off the socket, so by
    the time any second request can be handled the job is already dispatched — the 202's
    `state: "queued"` is true at the instant it is written and **stale on arrival**. Round 10's section A
    submits and immediately cancels 12 times and records **0 successes**; every attempt is
    `409 E_CANCEL_TOO_LATE`, which is the *truthful* answer. So the endpoint is honest and useless rather
    than dishonest: it does not claim to have stopped anything. The branch becomes reachable as soon as
    dispatch is queued rather than immediate, and until then a caller who wants to abandon work should
    stop polling rather than expect a cancellation. Disclosed in `cancelJob`'s comment as well.
16. **The operator's territory is one variable, so a multi-jurisdiction operator gets the STRICTER
    reading rather than the one they wanted.** `SWAN_OPERATOR_TERRITORY` is a single value, and
    `licenceGate.territories()` evaluates it *plus* any territory the request names, with the first
    refusal winning. That is deliberate — the licence restricts where the weights run, and before round 11
    the request's territory was the FIRST thing read, which made the exclusion self-certified. The cost is
    that an operator genuinely running in two jurisdictions cannot declare that per request; they would
    have to run a process per jurisdiction. Not implemented, and named here so the limitation is a
    decision rather than a discovery.

17. **`agentVersion` is `null` in every provenance record, and the audit does not check it.** `buildProvenance` accepts it and `generateVideo.mjs` never passes it, so the field is present, always empty, and outside `auditProvenance`'s completeness check — a field that reads like provenance and carries none. Left that way deliberately rather than filled with a guess: an invented version string is a fact nobody can later disprove, which is worse than an acknowledged blank. Pinned by a DISCLOSURE check in round 16's section C so it cannot quietly stop being true.

18. **The record's `modelVersion` is the catalogue's DECLARATION, not a measurement of what ran.** `buildProvenance` prefers `result.modelVersion`, and **no shipped adapter returns one** — so the branch round 16 added as "the most specific source" never executes, and every record states what the catalogue says *should* run. Nothing in the record names the ComfyUI graph that actually selected the weights, so for a local run the record cannot be used to tell which graph produced the asset. Round 17 pins both facts as DISCLOSURE checks rather than fixing them: choosing a graph identity is an adapter change, and the adapter is Sean's call.
19. **Round 16's tri-state booleans are unreachable from the runner.** `generateVideo.mjs` passes `commercial: p.commercial !== false` and `grantRecorded: readGrants(env).has(providerId)` — a comparison and a `Set.has()`, both booleans by construction — so `usedCommercially: null` and `grantRecorded: null` never occur in production. The tri-state protects the exported API surface (a direct `buildProvenance` caller, or `snapshotLicence` with an incomplete licence) rather than the run path. Stated so the change is not read as "the runner can now record an unknown", which it cannot.

20. **~~A graph that fails ON THE GPU is reported as `E_NO_OUTPUT`, with the wrong message, and is retried.~~ The REPORTING half is CLOSED in round 19; the RETRY half is item 21.** ComfyUI reports a graph that errored as `outputs: {}` with `status_str: "error"` — and `{}` is TRUTHY, so the poll loop's `entry?.status?.completed || entry?.outputs` breaks on it and the adapter concludes the graph finished. `findOutputFile` then finds nothing and the refusal is `E_NO_OUTPUT`: *"ComfyUI reported completion but produced no video output. Check that the graph ends in a video-saving node."* The node's own exception — measured with `CUDA out of memory` — is sitting in `status.messages` and is never read, so the operator is sent to the wrong problem. And `E_NO_OUTPUT` is **not** in the runner's `PERMANENT_CODES`, so the queue re-renders the identical broken graph at full GPU cost on every attempt. Round 18 proves all three parts through `generate()` and **does not fix them**: the repair needs a new code and a permanence decision, and `PERMANENT_CODES` lives in `backend/scripts/handlers/generateVideo.mjs` — the runner, which is Sean's call. Named rather than silently closed, the way round 13 handled the ceilings. **Round 19 closed the reporting half** — a failed run raises `E_GRAPH_FAILED` naming the node and quoting its own exception, decided by `comfyuiHistory.mjs`; `E_NO_OUTPUT` survives with its exact wording but is now reached only for a graph that genuinely finished. The disclosure is left in place, struck through, because the original reasoning is what justifies the split.

---

21. **The two GPU-failure codes are BOTH still retryable, and that is the runner's call.** Round 19 gave a failed graph a code of its own, but `E_GRAPH_FAILED` is absent from `PERMANENT_CODES` in `backend/scripts/handlers/generateVideo.mjs`, exactly as `E_NO_OUTPUT` is. A graph that raises identically every time — an OOM on the same weights, a node that cannot load a missing model — is worth another full GPU render on each attempt, and the queue will spend it. Round 19 does **not** close this: changing the runner is an engine behaviour change, and it is Sean's call. The one-line change is to add `E_GRAPH_FAILED` (and arguably `E_NO_OUTPUT`) to that set. Both probes now carry a DISCLOSURE check that FLIPS the day it happens, so the disclosure cannot outlive the gap — the idiom round 13 used for the ceilings. What round 19 does guarantee is that the operator learns the truth on the FIRST attempt, whatever the queue then does.
22. **The mid-run history shape is synthetic.** The `B.` check proving that a still-executing job is not read as finished uses `{ status: { completed: false }, outputs: {} }`, which is the shape the predicate cannot distinguish from a failure — but this lane has never seen a real ComfyUI emit it mid-run, because ComfyUI is not running on this machine. The measured fact is about the PREDICATE, not about ComfyUI: `entry?.outputs` is truthy for `{}` whatever the server meant by it. Closing the gap needs the render box up.

23. **The hosted lane's three new codes are all still RETRYABLE, and the artifact guard is a scheme check rather than an allowlist.** `E_POLL_REJECTED`, `E_INSECURE_BASE_URL` and `E_BAD_ARTIFACT_URL` are all configuration or contract facts — a wrong key, a cleartext base URL, an artifact URL that cannot be trusted — so all three fail identically on every retry, and none is in the runner's `PERMANENT_CODES`. Same shape as item 21: `backend/scripts/handlers/generateVideo.mjs` is Sean's call, so round 20 maps them and names the gap, and the probe carries a DISCLOSURE check that flips the day they are added. Separately, the artifact guard asserts **https** and nothing else: a vendor response pointing at an arbitrary https host is still fetched. Closing that needs an origin allowlist, which needs a fact about the vendor's CDN that this lane has never observed — so it is recorded as a limit rather than guessed at.
24. **`redactSecrets` silently skips anything shorter than six characters.** The threshold exists so a one-character secret cannot rewrite a whole message, but it is a silent policy: a credential under six characters is echoed in full into a thrown message. Real vendor secrets are far longer, so this is theoretical — pinned by a DISCLOSURE check so the threshold cannot move without this note being revisited. No live call has ever been made, so the vendor's actual error-body shape remains unobserved (see item 1's sibling: `No live Higgsfield call`).

25. **The handover patch on disk is NOT the artifact this document describes.** Round 23 checked the
    receipt against the filesystem, which is the one thing the earlier rounds' "regenerate, then
    re-verify" rule assumes somebody did. `ss-media-api-2026-09-18.patch` in the session workspace is
    **500,862 bytes and 39 files**, dated `2026-09-18 20:38` — a round-12-era artifact — while the
    text below describes **62 files (9 modified, 53 new), ≈1002 KB**. The `gen-lane-patch.sh` that
    produced it is **not present** in either workspace, so it cannot be re-run from here and the
    documented artifact cannot be reproduced. This is skill §17.4's finding in the handover slot:
    *verify the artifact that exists, not the one the receipt names.* Two things follow, and the
    second is the one that matters: the patch is **superseded as the handover of record by the
    commit** (`9f9957b1b` on `feat/media-api-2026-09-18`, plus round 23's commit), because a commit
    is checkable with `git rev-parse` and a stale file is not; and **regenerating the patch is a
    deliberate omission, not an oversight** — writing a new generator with different completeness
    assertions than the one the document describes would produce an artifact whose receipt nobody
    can audit, which is worse than an acknowledged stale one. Named here so the next reader does not
    discover it by trying to apply it.

26. **`normalizeProviderResponse` reports a FAILED run as `completed` when a URL is present, and no
    shipped adapter calls it.** `status: videoUrl ? 'completed' : (rawStatus || 'queued')` — the rule
    is deliberate and round 7 pinned it (`{status: 'processing', videoUrl: 'd.mp4'}` → `completed`),
    because several APIs return a finished asset alongside a stale status. The gap is that the rule
    has **no exception for a failure**: a vendor envelope carrying `status: 'failed'` *and* a
    `videoUrl` reads as success, and `rawStatus` — which would say otherwise — is preserved beside it
    but is not what a consumer reads. Recorded as a **disclosure rather than a round-24 finding**,
    because `normalizeProviderResponse` has **no production caller**: `higgsfield.mjs` and
    `comfyuiLocal.mjs` each run their own poll loop and never reach it. A defect with no caller is a
    style opinion until an adapter uses the export, and inflating it into a finding would be the
    same error as deflating a real one. The moment an adapter does call it, this becomes a round.

## The branch divergence — reported, not papered over

This is material and it is not something I can fix from here.

```
main (2b3e7a62a)                        creator-brains-engine-r2-20260915 (83a19d456)
  shared/providers/video/       ✓         shared/providers/video/       ✗
  docs/.../miniswan-comfyui-…   ✗         docs/.../miniswan-comfyui-…   ✓
```

- The **provider layer** lives on `main`.
- The **prior Astra adjudication for the H3/ComfyUI work** (`miniswan-comfyui-2026-09-16/`) lives on
  `creator-brains-engine-r2-20260915` and is **not on `main`**.
- Neither branch has both. The code and the blueprint that produced it are on different branches.

The worktree is `C:\tmp\ss-media-api` on `feat/media-api-2026-09-18`, cut from `main` at `2b3e7a62a`
— so it sees the provider layer and **does not see the prior blueprint.**

### There was no commit for twenty-one rounds, and the reason was the git binary

`C:\tmp\ss-media-api` had **no HEAD commit** from the day the lane started until round 21, and the
document said so. The stated cause was wrong: *"writes into the main repo's `.git` do not persist
from an agent session."* They do persist. The actual cause is worth recording, because it cost this
lane three weeks of "commit-verified: no" and it will cost someone else the same:

**The bundled `PortableGit` 2.55.0 that this session's `git` resolves to fails silently when creating
a ref in a subdirectory of `refs/heads/` that does not already exist.** `git commit`, `git reset
--soft` and `git update-ref refs/heads/<a>/<b>` all exit **0**, write the commit object and the
reflog, and then write **no ref** — and git prunes the empty directory it just created, so there is
no trace. A flat ref (`refs/heads/<name>`) works; a nested one does not. `GIT_TRACE=1` shows the
built-in running and stopping, with no error. The system git at
`C:\Program Files\Git\bin\git.exe` (2.47.0) creates the same ref correctly, first try.

Two consequences, both now fixed:

- The lane's first commit was recoverable rather than lost. The reflog at
  `.git/logs/refs/heads/feat/media-api-2026-09-18` still named `ba588359`, a commit made at
  `02:15` whose parent is `main` — created by a session that hit the same wall, and orphaned when
  the ref write failed. Restoring it gave the branch real history instead of a root commit.
- **The work is now commit-verified.** `018daf366` — 54 files, 11,070 insertions, 561 deletions —
  on `feat/media-api-2026-09-18`, whose parent is `ba588359`, whose parent is `main` at
  `2b3e7a62a`. The worktree is clean.

**The lesson, stated because it generalises:** a tool that reports success and does nothing is worse
than a tool that fails loudly, and the way to catch one is to verify the outcome rather than the
exit code. `git commit` returned 0 for this twenty-one times. What caught it was
`git rev-parse HEAD` in a separate process afterwards — the same discipline as §7's "a probe that
has never failed is not evidence", applied to the toolchain.

Handover is a **patch**: `ss-media-api-2026-09-18.patch` in the session workspace — **62 files**
(9 modified, 53 new), ≈1002 KB. Verified by applying it to a fresh `main` base (`2b3e7a62a`) in a
scratch repo and running **all twenty-nine gates** there, not merely in the worktree the patch came
from: **1097 assertions, all green**. The same 62 files are also materialised as a safety net beside
it, built from the patch's own file list so the two cannot drift apart.

**Round 23 qualifies that receipt, and NOT-proven 25 carries the detail.** The patch actually on disk
is a **39-file, round-12-era artifact**, and the `gen-lane-patch.sh` that produced this receipt is
**not present in either workspace** — so the paragraph above describes an artifact that cannot be
reproduced from here. **The handover of record is therefore the COMMIT**,
`9f9957b1b` plus round 23's commit on `feat/media-api-2026-09-18`, because a commit is checkable with
`git rev-parse` and a stale file is not. The counts above describe the 62-file change set the commit
contains, which is the set the patch was always meant to carry.

One property of that receipt is worth stating rather than hiding: **this README is inside the patch**,
so the patch's byte count and `sha256` cannot be stated exactly inside itself. The count above is
approximate for that reason; the exact figures identify the snapshot that was *verified*, and they are
recorded beside the artifact rather than in it. Any further edit to this document produces a new
artifact with a different byte count and the same 62-file list — which is why the rule below is
"regenerate, then re-verify", and never "regenerate and inherit the previous receipt".

The patch is produced by `gen-lane-patch.sh`, which **refuses to emit a patch it cannot prove
complete** — see "Re-verified from the patch" above for the two occasions on which an unasserted patch
shipped, and for the control that shows the completeness guard actually fails on the defective
artifact rather than passing vacuously. Its first check is the one that matters most here: **a lane
file left untracked is invisible to `git diff` and is silently dropped from the patch**, which is the
exact defect that shipped twice. Round 12 added five new lane files, all of them untracked at first;
the guard named each one until it was staged.

One gotcha worth recording: `git worktree add -b <branch>` failed with `fatal: invalid reference`
because **`.git/refs/heads/feat/` did not exist as a directory**. Git reported success on
`git update-ref` while writing nothing. `mkdir -p` first, then `git update-ref`. If a branch creation
silently no-ops in this repo, check for a missing leading directory before assuming anything stranger.

---

## Next

**The one thing that would close Slice 1:** start ComfyUI on the 5090 with the real H3 graph and run
the demo against it with the adapter un-stubbed. That needs Sean's explicit go-ahead — it is his GPU,
Rule 67 says 4–8 agents may be live, and Astra's Slice 1 entry gate requires *"explicit temporary
operator enablement"*. Everything downstream of the transport is already proven, so this is a
configuration exercise rather than a build.

Then, in Astra's order:

| Slice | Build status | Hostile loop |
|---|---|---|
| **1. Local over-wire vertical slice** | Gateway built, tested, and demonstrated over HTTP. **Exit gate unmet**: the video came from ffmpeg, not the graph. | **Blocked, not dry.** Rounds 18–19 attacked the GPU-facing surface (`comfyuiLocal`, `comfyuiGraph`, `comfyuiHistory`) and found 15 defects between them. The remaining surface is the real ComfyUI, which needs Sean's go-ahead. |
| **2. Admission and crash hardening** | Partly done (atomic writes, idempotency keys, loopback enforcement, concurrent-submission probe). Missing: crash-at-every-write-boundary tests, `reconciling` instead of `failed`. | **Open.** Rounds 2, 8, 9, 10 and 22 attacked admission and the HTTP primitives; round 21 attacked the ledger's write half. The crash-at-every-write-boundary matrix is unbuilt, and `reconcileOrphans` still marks orphans `failed` where Astra asked for the non-terminal `reconciling` (NOT-proven 11). |
| **3. Hosted contract, offline only** | Mostly done: disabled rows, bounded-price arithmetic, credential redaction, `nsfw` carried through. Missing: mocked submit/poll/cancel fixtures, refund tests, retrieved OpenAPI paths. | **Open.** Round 20 attacked `higgsfield.mjs` and `higgsfieldTransport.mjs` and found 8 defects. The mocked submit/poll/cancel fixtures are still absent, so the poll loop's timing behaviour has never been driven against a stub. |
| **4. Optional owner-authorised hosted verification** | Not authorised by this packet. Requires separate spending approval and all D-F gates. | **Not started** — and correctly so. No live Higgsfield call has been made. |
| **5. Explicit routing profiles** | Not started. `409 ROUTE_SELECTION_REQUIRED` for model-only requests is unbuilt. | **Not started.** Nothing to attack yet. |

**The loop has not run dry, and round 23 is the evidence.** Twenty-three consecutive rounds have found
defects, and the two most recent found surfaces that every earlier round had walked past: round 22
found four in `http.mjs`, and round 23 found three in `completion.mjs` plus two stale counts in this
document. Each round's surface was chosen by the same rule — grep the ledger for the file, and a
surface with no mention is new ground — and that rule has not stopped producing. **Stopping is a
decision, not an observation:** the honest statement is that the next pass keeps earning its keep
until someone names a stopping point.

Also unbuilt, all named by Astra: per-caller opaque tokens and scopes (`AUTH-002`), the `transactions/`
crash journal (`STORE-001`), the multi-resource reservation ledger (`PAY-002`), the hosted enablement
gate's eight prerequisites (`D-F`), and duration binding for the local H3 graph (`DUR-001` / `DUR-002`
— `422 DURATION_UNBOUND`).

### Deliberately not done

- **No `enabled: true`** on any provider in the catalogue. Astra: *"Any implied authorization to enable
  providers or spend: neither is granted by this adjudication."* The demo enables a provider for the
  life of one process, from an env var, and says so.
- **No live Higgsfield call.** Nothing has been executed against `api.higgsfield.ai`.
- **No guessed model path.** See item 12. (This read "gap 8" until round 14, which was the wrong item even then — item 8 is about agent-side ceilings. Corrected rather than carried, because a cross-reference that points at the wrong paragraph is a small lie that a reader has no way to catch.)
- **No change to ComfyUI, the 5090 install, GSQ, or MiniSwan.** MiniSwan cannot run H3 — 29,850 MiB peak
  against a 16,376 MiB card, per the prior adjudication.
- **No paid nodes.** `partner/` nodes bill credits; `model/` nodes do not.

