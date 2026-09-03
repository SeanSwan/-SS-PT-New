---
decision: "The local-Qwen hardware thread located and reconstructed; Sean's 4080-Super/112GB box is VRAM-limited not RAM-limited, which inverts the obvious plan; four candidate next slices put to Sean, undecided"
status: open
supersedes: none
sanitized: true
---

# Local-Qwen Hardware Thread — cold-start handoff
**Date:** 2026-09-03 · **Author:** Opus 5 (`vs-claude`, remote container) · **For:** the next agent, cold

---

## 0. Why this file exists

Sean asked an agent to find a prior conversation about running Qwen locally on a 5090
with "128 GB of RAM," so he could continue from it. Past chat sessions are **not**
retrievable — they do not live in the repo. What follows is the reconstruction from the
durable record, plus the correction that changes the plan.

**Nothing was built this session. No code touched. One search, one correction, one open question.**

---

## 1. Environment truth (verified, do not inherit)

```
hostname                 -> vm
command -v nvidia-smi    -> NOT PRESENT
command -v ollama        -> NOT PRESENT
```

The session that wrote this ran in a **remote cloud container, not on Sean's hardware.**
Every hardware figure below is quoted from a repo document; none was measured live.
The next agent, if it runs on Sean's box, should re-measure before acting — and should
run `nvidia-smi` before ever claiming there is no GPU (see
`hermes-learning-packets/20260817-check-the-machine-you-are-standing-on.md`).

## 2. Where the thread actually lives

| Doc | What it carries |
|---|---|
| `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/170-hermes-performance-upgrade-prompt.md` | **The sizing conversation.** Fable-authored 2026-07-07. VRAM budget, KV math, model doctrine, §E paste-ready fix list |
| `docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-17-C.md:50` | Live-state line: `ollama ps -> qwen3.8:27b-mtp-q4_K_M, 17GB, 32768 ctx` |
| `docs/ai-workflow/references/archive/ROUTER-UPGRADES-GT6.md:147` | The 4080 box already has a designated role: *"4080 PC — Ollama inference, needs bandwidth"* |

Quoted verbatim from doc 170:
- Brain: `qwen3:30b-a3b-instruct-2507-q4_K_M` (18 GB), Windows-host Ollama, weights on `Z:\ollama-models`
- GPU: **RTX 5090, 32,607 MiB**, ~4.4 GB consumed by desktop idle
- KV math: 48 layers, 4 KV heads, head_dim 128 → ~96 KB/token fp16 →
  **64K ctx ≈ 6.0 GB fp16 / 3.0 GB q8_0 · 128K ≈ 12.1 / 6.3 GB**
- Doctrine B6: *"Stay Qwen3-30B-A3B Q4_K_M daily (MoE ≈3.3B active → fast). Q6 only at 64K
  (Q6+128K does NOT fit). Dense 72B = proven RAM-spill, special cases only"*

**Re-derived counts (this session):** 12 files cite `qwen3.8:27b-mtp-q4_K_M`;
9 `QWEN-PANEL-REVIEW` files across 12 panel directories. The local seat is doing real,
recurring, $0 work — it is not an experiment.

## 3. The correction that inverts the plan

Sean's recollection was **"128 GB of RAM."** The 128 in the source doc is **128K context**,
not gigabytes of system RAM. The entire budget in doc 170 is drawn against the 5090's
**32 GB of VRAM**. System RAM appears only as the thing you spill *into* — and doctrine B6
names that spill as the reason dense-72B is off the daily menu.

Sean's stated hardware:
- **Main PC:** RTX 5090 (32 GB VRAM) + 64 GB system RAM ← runs the local brain today
- **Other PC:** RTX 4080 Super (**16 GB VRAM**) + 3x32GB + 1x16GB = **112 GB** system RAM
  (he said 115; 112 is the arithmetic, ~111 usable after Windows)

So the 112 GB machine is, for inference, the **weaker** of the two: half the VRAM.
Abundant DDR does not rescue a model that will not fit in 16 GB — it converts a fast model
into a slow one. "115 GB is good" is true for almost every workload *except* the one
being planned.

**Consequence:** the intuitive slice ("put the bigger Qwen on the big-RAM box") is the
one the evidence argues against. The defensible slices are about *parallelism* and
*freeing the 5090*, not about model size.

## 4. Open decision — Sean has not chosen

Four candidates were put to him; none selected as of this writing:

1. **Second inference seat on the 4080** — same ~17 GB-class model, always-on, so panel
   seats / Hermes stop competing with video renders and gaming on the 5090.
   *Fits the 16 GB ceiling; highest value-per-effort.*
2. **Bigger local model** — push past 27B. Needs real numbers first; doc 170's own doctrine
   is the counter-argument.
3. **Apply doc 170 §E** — the keep-alive bug (`OLLAMA_KEEP_ALIVE=120` → 5-15s cold reload of
   18 GB on most messages), the staged-but-unapplied 128K Modelfile, `num_batch 1024` prefill.
   **Status UNVERIFIED — that doc is 2026-07-07; these may already be applied.** Re-check
   before proposing. Cheapest real win if still open.
4. Something else from the original conversation not surfaced here.

## 5. First moves for the next agent

- **Do not trust §4.3 without re-checking.** Run the stale-check: on Sean's box,
  `ollama ps`, `nvidia-smi`, and the env scopes for `OLLAMA_KEEP_ALIVE` /
  `OLLAMA_FLASH_ATTENTION` / `OLLAMA_KV_CACHE_TYPE`. Doc 170 is ~2 months old.
- **Ask Sean which slice before building.** He asked to *find* the thread, not to execute it.
- If slice 1 is chosen: the network prerequisites are already scoped in
  `ROUTER-UPGRADES-GT6.md` (QoS rank 3, Dev VLAN) — read it before touching networking.

## 6. Mistakes I made

- **Said "~10 panel reviews" from a skim**, then re-derived and found 9 review files / 12
  citing files. Small, but it was an unverified number stated as fact — corrected to Sean
  in-session before it reached this document.
- **Nearly repeated Sean's "115 GB" back to him unexamined.** The sticks he described
  (3x32 + 1x16) sum to 112. Arithmetic anyone can do, which is exactly the kind of number
  that slides through because it sounds settled.

## 7. Paste-ready prompt for the next session

> Load the `handoff` skill first. Then read
> `docs/ai-workflow/AI-HANDOFF/LOCAL-QWEN-HARDWARE-THREAD-HANDOFF-2026-09-03.md`.
> It reconstructs the local-Qwen hardware thread and ends on an undecided question: which
> of four slices to run. Do **not** start building. First re-verify §4.3 (are doc 170's
> §E fixes already applied?) with live commands on Sean's machine, then ask Sean which
> slice he wants. Key correction to carry: his second box is 4080 Super / 16 GB VRAM /
> 112 GB RAM — VRAM-limited, not RAM-limited, which argues against "run a bigger model
> there" and for "run a second seat there."
