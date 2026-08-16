# Creator / Video Studio — MASTER HANDOFF

- **Date:** 2026-08-15 · **Author:** Opus 5 (vs-claude) · **Supersedes:** `CREATOR-PIPELINE-HANDOFF-GLM53-2026-08-15.md` (keep both; that one is the review remit, this is the full arc)
- **For:** the next agent, and GLM-5.3's hostile review + blueprint update
- **Read time:** ~10 minutes. Everything needed to continue is here. Re-derive nothing.

---

## §1 — WHERE WE STARTED (Sean's original ask, in his words)

The workstream began from a transcript about **MiniMax H3 (Hailuo 3)** and one intent:

> *"I despise Higgsfield… that needs to be completely obliterated. That needs to be set up so that I could just use my RTX 5090 to build the videos."*
> *"I'm not trying to pay for nothing. all my own tokens."*
> *"this should be like a model harness too as well so I should be able to bring in other models if I want to."*
> *"I need to be able to put that in there and make the AI smart enough to be able to have it sync perfectly. That's very important with the sound."*

Five things, in his priority order:

1. **MiniMax H3 generating video LOCALLY on the RTX 5090** — zero API cost, no hosted provider
2. **A model harness** — swap in Seedance 2.5, Wan, others without a rewrite
3. **A video-creation interface** in the Content Studio
4. **A YouTube production studio** for Sony A7R IV footage (~15 GB/take)
5. **Audio sync** between camera and DJI mics — *"very important"*

Later additions:
- **2026-08-15:** *"we should have probably made this thing as an individual component that can be used in other applications as well, not just this or standalone."*
- **2026-08-15:** *"I want to run it locally for my own private use."*

---

## §2 — WHERE WE LANDED (honest state)

**#5 shipped and is genuinely good. #1, #2, #3, #4 do not exist.**

| # | Ask | State | Evidence |
|---|---|---|---|
| 1 | MiniMax H3 local on 5090 | **NOT BUILT · license-blocked** | `git grep -lI -iE "hailuo\|minimax" origin/main -- backend/ frontend/src/` → **1 file**, a test |
| 2 | Model harness | **NOT BUILT** | no provider registry on main |
| 3 | Video-creation UI | **NOT BUILT** | the shipped "Render Queue" tab is an operator console; it generates nothing |
| 4 | YouTube studio | **NOT BUILT** | blueprinted only |
| 5 | Audio sync | **SHIPPED · PROVEN** | true +4.2500s offset recovered as **+4.2501s** on real 240s media |

**What actually got built is the substrate: a job queue, a worker, enrolment, and an audio-sync engine.** All correct, all tested, none of it the studio Sean pictured. He opened Content Studio, saw a control panel, and said so. He was right.

**Root cause, stated plainly:** every slice closed honestly on its own terms, and the chain still walked away from the original ask. No slice-level gate re-reads the *original request* — they check the last slice's spec. Sean became the first integration test of "is this the right thing."

---

## §3 — THE MINIMAX H3 LICENSE QUESTION (Sean asked directly)

**What is restricted is the right to RUN the weights, not the ownership of what they produce.**

- The H3 Community License grants commercial use free under **$20M/yr revenue** — but **carves out the US, EU, UK and South Korea** from that automatic grant.
- **Personal, non-commercial local use** is not the problem.
- **Output published on sswanstudios.com** — a commercial product — is commercial use of the model, in an excluded territory, without a grant.
- **Nobody is saying Sean cannot use what he creates.** A US business needs written authorization to run the weights commercially. It is free to request.
- **The hosted MiniMax API carries none of this** — normal paid service, unblocked today.

**Verified constraints for when local runs** (`MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md`):
- ~21GB pruned INT8 on a 32GB 5090; peaks ~31.7GB; 8s clips ≈ 2–14 min
- **2K runs locally** via ComfyUI dynamic offloading (an earlier "768p ceiling" claim was wrong)
- **"MiniMax H3" must be displayed prominently** in commercial product UI
- Training/distilling on H3 outputs is **prohibited**

**Status: the request email is DRAFTED and UNSENT. It needs 4 fields from Sean** (legal entity, state, name/title, distribution scope). Not legal advice — but sending it costs five minutes and unblocks the entire zero-cost path.

**Architectural consequence: build for both.** The provider registry must support local-H3 and hosted-API as peers, so a refused or slow license does not invalidate the UI.

---

## §4 — THE MISTAKE THAT MATTERS MOST

**I deleted the code the blueprint had named as the path to MiniMax.**

- Removed `backend/services/contentStudioVideoGenerationService.mjs` in `f45bc34ed` — *"the AI-video path that could never return a video."* True: fail-closed without provider keys, so every call returned "queued" and produced nothing. By the lying-endpoint rule I was enforcing, correct.
- **Four days earlier**, `SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md` §1.1 assessed that same file as *"EXISTS and is well-built"* — generic REST transport, `normalizeProviderResponse()` already collapsing provider shapes — and concluded:

  > **"adding MiniMax Hailuo is a provider registration, not a rewrite. The hard architectural work is already done."**

Both true. It returned nothing AND it was the designed extension point.

- **Recoverable:** `git show f45bc34ed^:backend/services/contentStudioVideoGenerationService.mjs`
- **GLM-5.3 must judge this call.** Restore, or confirm the deletion and name the replacement.

---

## §5 — WHERE WE'RE GOING (recommended build order)

### Phase 1 — Provider registry (the keystone)
One interface, N providers: **local H3 via ComfyUI**, **hosted MiniMax**, **Seedance 2.5**, **Wan 2.2**. Capability-declared: `text2video` / `image2video`, max duration, max resolution, cost-per-run, **required attribution string** (H3's license demands prominent display — make it a required field so a provider cannot be enabled without it).

This is what makes the license outcome survivable: if local H3 is refused, hosted registers as another provider and nothing above it changes.

### Phase 2 — `generate` handler in the agent
Alongside the existing `mediasync` handler. Job → ComfyUI on `127.0.0.1` → artifact → R2 → complete. **The lease/heartbeat/crash-recovery machinery already works and is proven** — this is the cheapest phase.

### Phase 3 — The studio surface
Describe → choose model → see options → pick → refine → render → preview → publish. **`SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md` already specifies most of this** — Sean has asked GLM-5.3 to hostile-review and update it before building. Do not design from scratch.

### Phase 4 — Extractability (Sean's new requirement)
Decide the seam before more code welds it in. Current coupling: `video_render_jobs.user_id` → `"Users"(id)`, `project_id` → `content_projects`, `exercise_id` → `"Exercises"`. The **agent script is already nearly standalone** — HTTP + bearer token + one handler — and is the natural extraction nucleus.

### Phase 5 — A7R IV / YouTube pipeline
Proxy workflow, conform to master, Whisper captions, YouTube upload. **Note: YouTube API audit application has not been filed** — unverified projects are locked to private uploads permanently, no appeal.

---

## §6 — WHAT EXISTS AND WORKS (do not re-derive)

### 6.1 Audio sync — the strongest asset
`backend/services/mediaSync/{crossCorrelation,driftModel,audioExtract}.mjs`

- **Real-media proof:** 240s stereo-48k AAC vs mono-44.1k AAC → true +4.2500s recovered as **+4.2501s** (0.1ms; one frame at 30fps = 33.3ms)
- Drift: synthesised 300ppm → measured **−295.2ppm**, correct sign
- **Refuses rather than guesses.** Two files sharing no content → `insufficient-overlap-to-judge`
- 79 tests + ~2500 fuzz cases, 0 confidently-wrong answers
- **AGC robustness settled:** survives 60:1 compression + aggressive gating with 0.6–6.3ms error. A planned rolling-normalization step was **deleted, not deferred**, after measurement disproved the need.
- **OPEN:** at the 8s overlap floor, worst spurious correlation measured **0.349 vs a 0.3 gate** (p99 0.280) → ~1% of unrelated pairs can clear it *at* the floor. Kimi's proposed peak/runner-up ratio gate was **measured and FAILS** (worst spurious 2.11–2.66, above its own 2.0 gate). **Do not re-propose it without measuring in the sub-floor regime.**

### 6.2 Queue + worker
| File | Role |
|---|---|
| `backend/services/videoRenderJobService.mjs` | Postgres-leased queue, `FOR UPDATE SKIP LOCKED`, heartbeat leases, idempotency |
| `backend/services/renderLeaseSweeperCron.mjs` | reclaims jobs from dead workers (was built and wired to nothing) |
| `backend/services/renderAgentAuthService.mjs` | enrolment; 32-byte token, SHA-256 at rest, rotation on re-enrol |
| `backend/routes/renderAgentRoutes.mjs` | lease / heartbeat / complete / fail |
| `backend/scripts/render-agent.mjs` | the worker — **polls outbound only** |
| `backend/scripts/start-render-agent.ps1` | launcher; token entered once → gitignored `.swan-agent.env` |

**Topology is a security decision, not convenience:** the worker sits behind home NAT beside ComfyUI, which ships with **no authentication**. Any design where the server initiates the connection exposes that machine. Keep outbound-only.

**Privilege escalation closed:** capabilities come from the enrolled record, never the request body.

### 6.3 UI
`frontend/src/components/DashBoard/Pages/content-studio/CreatorRenderQueue*.tsx` — Content Studio → **Render Queue**. Designed with Kimi K3 + HY3.

Core rule: **motion is a guarantee, not decoration.** One animation exists, reachable only from `rendering` where the backend has proof of work. Three distinct blocked states (`NO_WORKER_ENROLLED` / `NO_WORKER_ONLINE` / `NO_WORKER_WITH_CAPABILITY`) because each has a different operator fix.

### 6.4 QA
`backend/scripts/test-baseline-gate.mjs` — the suite has a **non-green baseline** (9 pre-existing failing files), so `vitest run` exits 1 on a healthy tree. A literal exit-code gate blocks every push forever, which is what pressures someone into piping it somewhere friendlier. This gate asks *"did anything NEW fail?"* instead.

---

## §7 — SEAN'S IMMEDIATE BLOCKER

He enrolled machine `SS-5090` and has the token. **Where it goes:**

```powershell
C:\tmp\ss-mediasync\backend\scripts\start-render-agent.ps1
```

Type it — **do not paste with a `PS C:\...>` prefix**, which broke three earlier attempts. Prompts once (hidden), writes `backend/.swan-agent.env`, never asks again.

**Two caveats the next agent must fix:**
1. That path is `C:\tmp\` — **scratch space**. Sean's own repo is on `wip/comms-notifications-2026-07-05`, ~1948 commits behind main, so the script genuinely is not there. **A permanent worktree is owed.**
2. **Even running, the agent can only do audio sync.** Sean will connect his 5090 and find nothing to render. Phase 2 (§5) is what makes connecting it meaningful.

---

## §8 — MY OWN DEFECTS (attack these, don't trust my verification)

Real bugs I shipped and later caught:

1. A `queued` job with no worker looked identical to one about to run
2. Presence query counted **capabilities, not agents** (`COUNT(*)` after `LEFT JOIN LATERAL`) — 3 agents/2 live reported as 5/4; invisible in production *because zero agents existed*
3. Idempotency without a time window meant **"render once, ever"** — no retry even after failure
4. Lease sweeper ran and **logged nothing** — `Number({requeued,failed})` is `NaN`
5. Every extraction failure marked **retryable** — a missing file burned a job's whole attempt budget
6. A missing icon import **crashed the entire Content Studio hub — and `vite build` passed twice.** Bundlers do not evaluate modules. **A green build is not proof the code runs.**
7. **Seven verifications that proved nothing:** `npx tsc` grabbed a decoy package; I read a **stale log from shared Windows temp** written by another process; a patch script asserted before writing and printed success anyway

**Pattern: ~12 times this workstream, my test or harness was the defect rather than the code.** Distrust my verification claims specifically. Re-run them.

---

## §9 — READING LIST

**Vision / original plans:**
- `docs/ai-workflow/AI-HANDOFF/SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md` — **the describe→picture→video spec. Most important doc here. Sean wants GLM-5.3 to hostile-review and UPDATE it.**
- `docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-ATELIER-UNIFIED-2026-08-11.md` — parent; Forge is its B3 module
- `docs/ai-workflow/AI-HANDOFF/MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md` — the blocker + the drafted email
- `docs/ai-workflow/AI-HANDOFF/CREATOR-PIPELINE-HANDOFF-GLM53-2026-08-15.md` — the review remit
- `docs/ai-workflow/references/SEEDANCE-CINEMATIC-VIDEO-RULES.md`, `SEEDANCE-WORKFLOW-RULES.md`
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`, `SWAN-ASSET-STORYBOARDING.md`
- `CLAUDE.md` — rules 1–11, 22–25, 26–31, 40–41, 73

**Session record — five memos, each with a `## Mistakes I made` section:**
`.ai-workflow/hermes-inbox/pending/2026081*`

**Commit arc (all on `main`):**
`99d2f3849` → `36d240f8d` → `15eba8b05` → `ec94f372b` → `a63f27b6f` → `763aa10fb` → `b05541635` → `05772e8fb` → `133ab0fdc` → `8b208c4dd` → `0421f7f41` → `579da7a16` → `f7a91c117` → `65ba01d31`

**Coordination:** lane ledger at `.ai-workflow/coordination/`. Claim before editing:
`node scripts/lane.mjs claim --task "..." --files "..."`

---

## §10 — DECISIONS THAT ARE SEAN'S

1. **Send the MiniMax H3 licensing request?** Drafted, needs 4 fields. Gates the zero-cost local path. *(Sean has now clarified: he wants local. This is the unblocking action.)*
2. **Hosted API as interim** while the license is pending? Costs per generation.
3. **Extractable component — what seam?** npm package / separate service / monorepo package.
4. **Was deleting `contentStudioVideoGenerationService.mjs` correct?** (§4)
5. **Remotion** — the render endpoint accepts 8 templates with no renderer behind any. Build or drop.
6. **`sync` job kind migration** — CHECK allows only `preview|generate|transcode|upscale|interpolate`; sync rides as `transcode`. Production schema change.
7. **YouTube API audit application** — unfiled; blocks public uploads permanently until done.

---

## §11 — FIRST THREE MOVES FOR THE NEXT AGENT

1. **Read `SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md` before writing any code.** It already specifies the studio. Sean's instruction is that GLM-5.3 hostile-reviews and *updates* it — not that a new plan gets invented.
2. **Settle §4** — restore the deleted transport or justify its replacement. Everything in Phase 1 depends on that answer.
3. **Get Sean generating one video on his 5090.** Not the full studio — one video, one provider, end to end. The queue, worker, and crash recovery already work; what is missing is a `generate` handler and a provider. That is the shortest path from "control panel" to "the thing I asked for."

**Guiding correction for whoever continues:** slice-level proof does not compose into product-level correctness. Periodically re-read §1 — the *original* ask — and state plainly which parts Sean can actually do today.

---

## §12 — PHASES 1 AND 2 ARE BUILT (2026-08-16)

**§4 is settled, with evidence.** Two independent greps (ripgrep + POSIX grep) confirm the
deleted `contentStudioVideoGenerationService.mjs` left **zero code references** — it appears
only in documentation, so its removal crashed nothing. But the deletion was **lossy**, and the
verdict is *right direction, wrong execution*:

| Part of the deleted file | Verdict |
|---|---|
| `resolveVideoGenerationConfig` | **Superseded.** `env.DREAMINA_API_URL ? 'dreamina' : 'seedance'` is a two-provider if-statement; it cannot express capability or licence. Left dead. |
| `validateVideoGenerationInput` | **Restored + improved.** Duration is now bounded by the *provider's* declared maximum instead of a fixed `[5,10,15,30]` set that contradicted every real model's 6s cap. |
| `normalizeProviderResponse` | **Restored near-verbatim.** Each alternative in its lookup chain is a shape a real API actually returned; re-deriving it would mean re-making the same mistakes. |

### What now exists

| File | Lines | Role |
|---|---|---|
| `shared/providers/video/catalogue.mjs` | 148 | DATA — providers, declared capabilities, licence terms |
| `shared/providers/video/registry.mjs` | 256 | BEHAVIOUR — selection, licence gate, validation, normalization |
| `shared/providers/video/comfyuiLocal.mjs` | 296 | The local ComfyUI adapter — `capabilities()` / `generate()` / `verify()` |
| `backend/scripts/handlers/generateVideo.mjs` | 145 | The agent's `generate` handler + retry classification |
| `backend/tests/unit/videoProviderRegistry.test.mjs` | — | 58 tests |

`render-agent.mjs` gained exactly two lines: an import, and `generate` in `HANDLERS`.

The split mirrors the image lane exactly (`openrouterModels` = DATA, `openrouterImage` =
BEHAVIOUR), and the three-function provider contract is the one that file's docblock already
described as *"the same contract creator Claude adopted for the video lane."*

### The licence is now code, not memory

`resolve()` refuses a commercial run of H3 in an excluded territory unless a grant is recorded,
and **its refusal message states which thing is restricted** — running the weights, not the
video produced. That sentence is asserted by a test, because the prose version of it decayed
into "commercial use is blocked" and misled its own author for days.

Enablement and licence grant are **separate acts**: `SWAN_VIDEO_PROVIDERS_ENABLED` switches a
provider on; `SWAN_VIDEO_LICENCE_GRANTS` records the grant. Switching a provider on does not
confer the right to run it commercially. Both are fail-closed — unset grants nothing.

**This is what makes the licence outcome survivable.** If the grant is refused, the hosted
entry is already a registered peer and nothing above it changes.

### Setup on the 5090

```powershell
# 1. Build the H3 graph once in the ComfyUI GUI, then File > "Save (API format)".
#    A GUI-format export is rejected with a named error telling you this.
$env:SWAN_COMFYUI_WORKFLOW   = "C:\path\to\h3-workflow-api.json"
$env:SWAN_COMFYUI_NODE_PROMPT = "6"        # node id whose text input is the positive prompt
$env:SWAN_COMFYUI_NODE_DURATION = "7"      # optional
$env:SWAN_COMFYUI_NODE_SEED     = "8"      # optional
$env:SWAN_COMFYUI_URL        = "http://127.0.0.1:8188"   # default
$env:SWAN_VIDEO_PROVIDERS_ENABLED = "comfyui/minimax-h3"

# 2. Non-commercial runs need no grant. Commercial runs in the US do:
# $env:SWAN_VIDEO_LICENCE_GRANTS = "comfyui/minimax-h3"   # only after the grant arrives

# 3. Advertise the capability when starting the agent:
node backend/scripts/render-agent.mjs --capabilities ffmpeg,mediasync,generate
```

`verify()` is the single command that reports which of those pieces is missing, each with the
variable name to fix it. The default capability list is deliberately unchanged — an agent that
advertised `generate` without ComfyUI configured would claim work it cannot do.

### What is PROVEN, and what is NOT

**Proven this session:** 58/58 tests pass; the suite is non-vacuous — three mutations (licence
gate disabled, image-first disabled, retry classification neutered) killed 4, 2 and 5 tests
respectively. All five modules pass `node --check` and evaluate under a real import.

**NOT proven:** no video has been generated. There is no ComfyUI and no 5090 in this
environment, so the full submit → poll → download path is proven only against a fake ComfyUI,
never a real one. **The first person with access to the 5090 should expect to find defects in
the real transport.** Sean can now *try*, which he could not before — that is the whole claim.

**Known limitations, stated rather than discovered later:**
- `normalizeProviderResponse` is tested but has **no production caller** until a hosted adapter
  lands. It is preserved knowledge, not live code.
- The licence gate necessarily trusts the caller's declared `commercial` flag. No code can know
  how a video will eventually be used.
- `render-agent.mjs` is 330 lines, over the rule-4 cap. It was 329 before this work; the import
  added one. Extracting `runMediaSync` is a separate pass on proven code, not this slice's job.
- R2 upload is still absent. The handler returns `uploaded: false` rather than claiming an
  object that does not exist.

### Next

Phase 3 (the studio surface) is unchanged: read the Forge blueprint and **update** it — do not
invent a new plan. The keystone it depended on now exists.
