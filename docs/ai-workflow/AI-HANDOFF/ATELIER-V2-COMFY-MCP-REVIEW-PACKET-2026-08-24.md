---
decision: Should Content Studio v2 adopt the ComfyUI local MCP as its control plane, and what is the correct architecture for a multi-project asset studio?
status: open
supersedes: none
---

# Content Studio -> Swan Atelier v2 — ComfyUI-MCP upgrade · REVIEW PACKET

**Author:** Opus 5 (vs-claude) · 2026-08-24
**Seats requested:** GLM-5.3, Ox Alpha, Qwen (local). Opus 5 is the Final Decider and does not vote.
> **CORRECTION APPENDED 2026-08-24, after the panel returned.** §2.1 below states `comfyuiLocal.mjs` is 296 lines. **It is 227** — the figure was lifted from an August handoff written before a refactor. Two seats built a "split before touching the 300-line cap" blocker on that stale number. The text is left as sent so the panel replies stay legible against what they actually read. The real cap violation, which no seat could see because this packet did not name the file, is `backend/routes/contentStudioRoutes.mjs` at **659 lines**. See the blueprint's §9.

**Remit:** architecture + product review of the proposal in §4. Attack it. Do not restate §2 back to me.

---

## §1 — WHAT SEAN ASKED FOR

1. He already built a Content Studio inside SwanStudios. It was *supposed* to be **an application for creating videos, images and assets for his site** — and it is not there yet.
2. He wants it upgraded to **"the next level"** by integrating what the ComfyUI-local-MCP transcript describes (§3).
3. Critical scope expansion: **"more in line for me creating designs for different projects."** He will use this **across the other websites he develops**, not only SwanStudios. It must be **strong, powerful**, with **excellent logic**, and carry the features he needs to build his exercise/brand videos *and* the rest of his sites.
4. Deliverable he wants back: **blueprint + mermaid flowchart + wireframes**, precise enough that a worker-bot builds it without asking follow-up questions (Rule 68 detail bar).

---

## §2 — GROUND TRUTH: WHAT ALREADY EXISTS ON `origin/main` [VERIFIED]

Every row below was read from `origin/main` this session. This is shipped code, not aspiration.

### 2.1 The provider layer — DATA/BEHAVIOUR split, licence-as-code

| File | Role |
|---|---|
| `shared/providers/video/catalogue.mjs` | **DATA** — provider ids, declared capabilities, licence terms |
| `shared/providers/video/registry.mjs` | **BEHAVIOUR** — `resolve()`, licence gate, validation, response normalization |
| `shared/providers/video/comfyuiLocal.mjs` (296 ln) | ComfyUI adapter — `capabilities()` / `generate()` / `verify()` |
| `shared/providers/video/comfyuiGraph.mjs` | builds a run from an operator-supplied **API-format** graph + node-id bindings |
| `shared/providers/video/promptPolicy.mjs`, `provenance.mjs`, `spendGuard.mjs` | prompt policy, provenance-to-asset, spend ceiling |
| `shared/providers/video/workflows/` | `minimax_h3_t2v_api.json`, `minimax_h3_firstframe_api.json`, `comfy-object-info.cache.json` |
| `shared/providers/openrouterImage.mjs` / `openrouterModels.mjs` | the **image** lane, same three-function contract |

Two fail-closed env switches, deliberately separate: `SWAN_VIDEO_PROVIDERS_ENABLED` (provider on) and `SWAN_VIDEO_LICENCE_GRANTS` (a written grant arrived). Enabling never confers commercial rights.

Graphs are **operator-supplied, not hardcoded** — and that decision already paid: the adapter was written for MiniMax H3, and the first video it ever produced was **Wan 2.2 in 26.73s on the RTX 5090 with zero change to the adapter**, because the graph is an input. One adapter now serves every ComfyUI-hosted model.

### 2.2 The execution layer

| File | Role |
|---|---|
| `backend/scripts/render-agent.mjs` (+ `start-render-agent.ps1`) | **local worker on the 5090** — polls the queue, dispatches `HANDLERS` |
| `backend/scripts/handlers/generateVideo.mjs` (152 ln) | the `generate` handler + retry classification |
| `backend/routes/renderAgentRoutes.mjs`, `services/renderAgentAuthService.mjs` | queue API + token auth for the agent |
| `backend/services/videoJobQueue.mjs`, `videoRenderJobService.mjs`, `videoRenderArtifactUpload.mjs` | job queue, job lifecycle, artifact upload |
| `backend/services/mediaSync/{audioExtract,crossCorrelation,driftModel}.mjs` | audio sync — **the strongest shipped asset** (recovered a true +4.2500s offset as +4.2501s on real media) |
| `backend/routes/contentStudioRoutes.mjs` (167 ln) | content-studio API incl. job creation |
| `backend/scripts/build-comfy-workflow.mjs` | workflow build helper |

### 2.3 The UI layer — `frontend/src/components/DashBoard/Pages/content-studio/`

`ContentStudioHub.tsx` renders a 9-stage project workflow rail (idea -> script -> shot_list -> scheduled -> filmed -> editing -> qa -> youtube_ready -> uploaded) plus **6 tabs**, each lazy-loaded and **gated** (`requiresService` / `requiresFlag` — the hub deliberately ships *no* tab rather than a broken one):

`Workflow` · `Video Library` · `Coverage Tracker` · `Video Optimizer` · `Badge Assets` (NanoBanana) · `Render Queue`

Plus `ContentStudioStorageMeter`, `ContentStudioProjectQueue`, `CreatorRenderQueue{,.api,.styles,TokenModal}`, `VideoOptimizerPanel`, `CrystallineCoverageTracker`, `videoCompression.logic.ts`.

### 2.4 The context layer Sean already owns (this matters for §4)

- **Swan Brain / Karpathy Wiki** — `~/hermes2/brain-vault`, 4,618 files, FTS + MCP, reachable via `node scripts/swan-brain.mjs "<query>"`. Includes a Midjourney reference archive and **Sean's own recorded visual taste**.
- **Swan Taste Brain + prompter** (SWA-186) — Midlibrary archive + taste-steered prompter, wired into Hermes.
- **`swan-atelier-studio` skill** + `docs/ai-workflow/design-brain/archetypes/01..11` (premium SaaS landing, cinematic 3D scroll, luxury product, fitness coaching, portfolio, agency, AI app, operator dashboard, client portal, pricing, onboarding funnel).
- **Seedance skills** (`seedance-swan-video`, workout + cinematic branches) with a hard 2499-char prompt cap and a five-beat teaching rhythm.
- **Hermes** — operator bridge with T0-T4 effect tiers, approval gates, audit receipts, kill switches.

### 2.5 The honest gap

The machinery generates video. **What does not exist is the studio Sean pictured**: no place to *describe* an asset and watch it become a picture then a video; no multi-project home; no model/workflow install or diagnosis path; no bridge from a ComfyUI graph to the brand/taste context; and the render surface is a **queue console**, not a creation surface. The previous handoff states the root cause plainly: *every slice closed honestly on its own terms and the chain still walked away from the original ask, because no slice-level gate re-reads the ORIGINAL request.*

---

## §3 — WHAT THE TRANSCRIPT ADDS (the new capability)

ComfyUI shipped a **local MCP** (following their June cloud MCP). Install: `pip install comfy-cli` -> `comfy set-default "<path to ComfyUI containing main.py>"` -> `pip install comfy-mcp` -> add the MCP block to the agent config -> restart -> ComfyUI must be **running** for the handshake.

What the agent gains once connected:

- **Handshake/introspection** — server state, ComfyUI version, PyTorch + CUDA version, GPU + VRAM, compatibility warnings. Version staleness silently gates which models can run; Torch/CUDA gates which Sage-Attention build is correct.
- **Server lifecycle** — start/stop, needed when installing new nodes.
- **Workflow ops** — work with specific workflow files; install the missing **nodes and models** a workflow needs; **diagnose errors**; recommend models **fitted to the actual machine** (it argued *against* GGUF quants on a 3060 Ti because they were larger than the official weights — a machine-specific, non-obvious call).
- **Run generations** through workflows; track jobs and their output files.
- **558 built-in templates.**
- **Comfy Cloud authorization** — separate from being logged into the ComfyUI GUI; needs its own auth flow. Unlocks **API/partner nodes** (Nano Banana/Google, Runway, Recraft, Pika, MiniMax, Kling, Ideogram, Black Forest Labs, Grok suite) on **pay-per-generation credits, not a subscription** — the same balance as Comfy Cloud. Outdated installs silently expose *fewer* partner nodes.

The transcript's thesis: **Higgsfield/Freepik are a front-end plus an upcharge over the same backend.** Going direct is cheaper. But the real differentiator it names is **context** — "imagine if all the projects you were working on had the context of why you were doing them." It proposes wrapping a **skill around a folder of hand-tuned workflows** explaining what each is for and when to use it, so the model navigates ComfyUI **technically (MCP)** *and* **contextually (second brain)**.

Its own caveats: an LLM layer adds latency, so this is **not** worth it for one image — it is a **scale/production** and **diagnosis** play.

---

## §4 — THE PROPOSAL UNDER REVIEW (attack this)

**Thesis: the MCP is a control plane, not a product. Sean already owns the two halves nobody else has — a licence-gated provider registry with a real queue, and a taste/brain context layer. v2's job is to fuse them and put a creation surface on top.**

**P1 — MCP is a *second* control plane, alongside the existing HTTP adapter; it never becomes the render path.**
`comfyuiLocal.mjs` keeps owning production generation (deterministic, testable, licence-gated, queue-audited). The MCP owns what the adapter structurally cannot do: install nodes/models, diagnose a failed graph, report machine capability, and author/repair workflow JSON. Rationale: a non-deterministic agent in the hot path breaks provenance, spend guard, and the licence gate.

**P2 — The graph library becomes a first-class, described catalogue.**
Today graphs are env-var-bound paths. v2 promotes `shared/providers/video/workflows/` into a manifest: each graph carries id, model, purpose, when-to-use, VRAM floor, expected runtime, required custom nodes, node-binding map, sample output. This is the transcript's "skill wrapped around your workflows" — but as **data the registry already reads**, not prose in a skill file.

**P3 — Comfy Cloud partner nodes register as ordinary hosted providers in `catalogue.mjs`.**
Nano Banana, Kling, Seedance, Runway, BFL et al. arrive through the *existing* provider contract with declared capabilities, licence terms, and per-generation cost. Local vs hosted becomes a **routing decision** (cost/latency/licence/quality), not two codebases. This is the peer-provider structure that already made the H3 licence outcome survivable.

**P4 — One creation surface: `Compose`.**
A new tab that is the missing product: describe -> brief (taste-steered from Swan Brain) -> still image -> approve -> animate -> variants -> asset. The existing Render Queue stays as the honest execution console beneath it.

**P5 — Multi-project is the schema change, and it is the highest-risk item.**
Sean will use this for *other websites*. Every project needs its own brand kit, archetype (from the 11 design-brain archetypes), asset library, and prompt/taste memory. SwanStudios becomes **project #1**, not the container. An earlier handoff already flagged the queue's FK coupling against extractability.

**P6 — A Doctor surface.**
Machine capability, ComfyUI/Torch/CUDA versions, missing nodes per workflow, VRAM headroom, partner-node availability, Cloud auth state, credit balance. This is where the MCP's diagnosis value becomes visible instead of living in a chat log.

**P7 — Cost truth.** Local runs are $0 plus electricity; partner nodes burn credits. Every route shows its price *before* it runs, and spend accrues to a ledger honouring the existing `spendGuard`.

---

## §5 — WHAT I WANT FROM YOU (answer these; be specific and adversarial)

1. **Is P1 right?** Make the strongest case that the MCP *should* be in the render path, or that keeping two control planes is a drift trap that will produce two divergent truths. If you think it is a trap, name the mechanism that prevents drift.
2. **P5 multi-project.** What is the correct data model for "one studio, many projects"? Where does it break in a system whose queue is FK-coupled to SwanStudios? Is a shared studio with project scoping right, or should the studio be **extracted into a standalone app** that SwanStudios consumes as a client? Name the decision criteria, not a preference.
3. **The Compose surface.** Sean's stated pain is that the studio is not the application he pictured. What is the minimum surface that makes it feel like a *creation tool* rather than a job console? Where does the describe->still->video ladder mislead a user, and what must be visible at each rung?
4. **Sequencing.** Give an ordered, independently-shippable slice list. The first slice must produce something Sean can *see and use* — not more substrate. Justify slice #1 against the failure recorded in §2.5.
5. **What is missing from §4 entirely?** Absence-first: what should exist in a serious multi-project asset studio in 2026 that this proposal does not mention at all? Rank by value left on the table.
6. **The one thing most likely to kill this.** One paragraph. Be concrete.

**Constraints you must respect:** styled-components only (no MUI); dark-first Crystalline Swan tokens with `var(--token, #fallback)`; 44px targets; 300-line file cap; Victory for charts; zero PII to LLMs; fail-closed licence and spend gates; the existing three-function provider contract (`capabilities`/`generate`/`verify`) is **not** to be reinvented.
