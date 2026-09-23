---
decision: "Handoff: chase ~204 tok/s on local Qwen 3.8 — requires a runtime with speculative decoding, not Ollama tuning"
status: open
supersedes: none
originating_model: claude-opus-5
date: 2026-08-16
linear: SWA-160
---

# Hermes throughput handoff — getting from ~100 to ~204 tok/s

> **Linear (keep this title):** `SWA-160 — Hermes terminal (ui-tui) rebuild + Qwen 3.8 upgrade — update 4,657 commits before any reskin`

**For:** the next agent · **From:** Opus 5 · **Read time:** ~5 min

---

## 1. WHERE WE STARTED

Sean's asks, in his order:

1. *"My Hermes is on Qwen 3.6. 3.8 just came out. Upgrade it."*
2. Update Hermes itself if an update exists.
3. Audit his Hermes setup — *"the disgusting looking terminal… every time I have to go work on Hermes it feels like a chore compared to Claude and Codex."*
4. Use GLM 5.3 for the plan and Kimi K3 + HY3 for hostile + hostile-**security** review.

Starting state: Hermes v0.19.0 (3 weeks / 4,657 commits stale), Ollama 0.32.6 (too old to even pull qwen3.8), a stale `.git/shallow.lock` from 2026-07-30 silently blocking every fetch, and two uncommitted local patches at risk of being destroyed by any update.

---

## 2. WHERE WE ARE NOW — all verified

| Item | State |
|---|---|
| Hermes | **v0.20.1 (`v2026.8.13`)**, boots clean |
| Branch | `swan/alias-security-hardening-20260816` @ `a8f45e7e1`, tree clean |
| Tests | **560 passed** (was 553; +7 security regression tests) |
| Terminal chrome | **34/40 → 2/40 rows** at 120×40 — Sean's #1 complaint, solved |
| Ollama | **0.32.13** |
| Local model | `hermes-fast-38:latest` = qwen3.8:27b-mtp-q4_K_M + `num_ctx 65536`, `temperature 1` |
| Throughput | **93.7 / 99.7 / 100.2 tok/s** (3 clean runs) |
| VRAM | 17 GB weights, **100% GPU**, load-tested at **36,308 tokens** → 23.8/32.6 GB used |
| Gateway | running, PID 1214, `approvals.mode=manual` |
| Email auth | SPF ✅ · DKIM `s1`/`s2` ✅ · DMARC live but `p=none`, **no `rua=`** |

**Security work:** three independent reviewers, run as an **adversarial relay** (each briefed to attack the *previous one's fix*, not the original code), found **three distinct HIGH holes** in the same ~20 lines — chained-alias blocklist bypass, a fail-OPEN hop cap (gateway + worker budgets are additive), and a bare `except` that disabled the whole control on config-load error. All fixed, each with a regression test **verified failing on the unfixed code**. Total spend **$0.29**.

**Terminal fix:** `display.compact` was unreachable dead config — `hermes_cli/main.py` does `getattr(args,"compact",False)` and no `--compact` flag exists, so an explicit `False` always won. Found by **instrumentation after seven code-reading hypotheses all failed**.

---

## 3. WHERE WE'RE GOING — the 204 tok/s target

Sean saw ~**204 tok/s** in a video and wants that. We measure ~**100**.

### ⚠ The single most important fact in this document

**We are already at ~93% of the hardware's theoretical maximum.**

```
RTX 5090 memory bandwidth  ≈ 1792 GB/s
Model size (Q4_K_M)         = 17 GB
Roofline for single-stream decode = 1792 / 17 ≈ 105 tok/s
Measured                          = 93.7 / 99.7 / 100.2
```

Single-stream autoregressive decode reads **the entire model from VRAM once per token**. That makes tok/s a pure function of `bandwidth ÷ model_size`. **No amount of Ollama tuning, threading, batching, context, or flag-twiddling can exceed ~105 tok/s for a 17 GB model on this card.** Anyone who tries to reach 204 by tuning Ollama settings is wasting their time — verify the roofline arithmetic yourself before spending an hour on it.

### Therefore 204 tok/s requires breaking "one full model read per token"

Only three things do that:

| Lever | Mechanism | Realistic gain | Notes |
|---|---|---|---|
| **Speculative decoding / MTP** | A draft head proposes N tokens; the big model verifies them in ONE pass. Amortises the memory read. | **~1.5–3×** | ✅ **The model already has the head — `qwen35.nextn_predict_layers=1`** |
| **Smaller weights** | Raises the roofline directly (`1792 / GB`) | linear | Q3/Q2 or a smaller model; quality cost |
| **Batching** | Amortises across concurrent requests | ~0× here | Does **not** help interactive single-stream latency |

### 🎯 The lead: the MTP head exists, and Ollama cannot use it

Verified this session:

- `curl /api/show` → **`qwen35.nextn_predict_layers=1`** — the draft head is present in the weights.
- `ollama run --help` → **no** `--draft` / `--speculative` / `--nextn` flag.
- `ollama serve --help` → only `OLLAMA_NUM_PARALLEL` (batching). **No speculative-decoding control exposed.**

**Conclusion: we bought an MTP model and are running it on a runtime that has no way to drive the MTP head.** That is almost certainly the entire gap between 100 and 204.

### Candidate runtimes to evaluate (in suggested order)

1. **llama.cpp directly** — has speculative decoding (`--model-draft` / `-md`, `--draft-max`). Closest to what Ollama already wraps, so lowest migration risk; can reuse GGUF weights.
2. **vLLM** — first-class speculative decoding and explicit **Qwen MTP** support. Strong throughput, but a heavier server and a different API surface for Hermes to call.
3. **SGLang** — MTP support, strong on Blackwell.
4. **TensorRT-LLM** — Blackwell-optimised, highest ceiling, highest setup cost.

**Also worth checking:** whether a newer Ollama than 0.32.13 has added speculative-decoding support since — that would be by far the cheapest win, since Hermes already speaks to Ollama and nothing else would need to change.

### ✅ RESOLVED 2026-08-16 — Sean supplied the video transcript. The premise was wrong.

**The reviewer never measured 206 tok/s.** His exact words:

> *"this model can **reportedly** hit around 206 tokens per second on a single RTX 5090 using the **NVFP4** and DGX Spark system"*

Three facts that dissolve the comparison:

1. **"Reportedly"** — he is quoting a published spec, not reporting a measurement.
2. **He was on an RTX 4090 / 24 GB**, not a 5090 — running Unsloth dynamic 4-bit through Open WebUI.
3. **He describes his own speed as slow:** *"it's quite slow still cuz I have a lot of applications and tabs open."*

So Sean's measured ~100 tok/s was being compared against a vendor figure nobody in the video reproduced, on different hardware, in a different format.

### The 206 figure is real but attached to NVFP4 — and Ollama can't serve it here

`qwen3.8:27b-nvfp4` **exists** in Ollama's library but returns **`412: this model requires macOS`** on Windows — verified twice, on two separate days. Ollama's NVFP4 build appears to be Apple/MLX-targeted despite NVFP4 being an NVIDIA Blackwell format. **Ollama on this machine cannot run the format the 206 number describes.**

### And NVFP4 alone still does not reach 206

```
RTX 5090 bandwidth                 1792 GB/s
Q4_K_M   (current, 17 GB)   ->  roofline 105 tok/s   (measured ~100 = 93% saturation)
NVFP4    (~13.5 GB)         ->  roofline 133 tok/s
206 tok/s implies                  8.7 GB read/token
```

**NVFP4 buys roughly +30%, not +100%.** Reaching 206 requires NVFP4 **and** speculative decoding (the MTP head we already have), or batching — which does not help interactive single-stream latency. Anyone promising 206 from a quant swap alone is wrong, and this arithmetic proves it in under a minute.

### Realistic targets to quote Sean

| Path | Expected | Cost |
|---|---|---|
| Stay on Ollama Q4_K_M | ~100 tok/s (at roofline today) | none |
| Runtime with MTP/speculative decoding, Q4 | ~150–200 tok/s | runtime migration |
| NVFP4 + speculative on TensorRT-LLM / vLLM | ~200+ tok/s | largest setup cost |

**Do not migrate runtimes before confirming Sean actually wants to leave Ollama** — Hermes speaks to Ollama today and nothing else needs to change while he stays.

---

## 4. TRAPS — do not re-learn these

- **`git grep <rev> -- <path>` returns EMPTY for every input on a shallow clone.** Silent false negative; produced a full round of confident, bogus results. `git show <rev>:<path>` works. **Always run a known-present control term first** — a probe returning zero for everything is broken, not informative.
- **`load_config()` without `HERMES_HOME` reads a non-existent `~/.hermes/config.yaml`** and returns built-in defaults. Config-dependent tests look "flaky" across runs when the real variable is whether that env var was exported. Always `export HERMES_HOME=/home/bigotsmasher/hermes2/.hermes`.
- **`ast.parse` cannot catch structural misplacement.** A method anchored inside `__init__` becomes a nested def — valid Python, "syntax OK" — while silently truncating the constructor. It crashed Hermes with `AttributeError: '_active_session_lease'`. **Assert AST structure** (member of the class, no nested defs, known attributes still assigned), never just that it parses.
- **A metric that overshoots the target is a defect signal.** Banner chrome went 34 → 2 (goal), then 2 → **0** on a broken patch. 0 meant the program had crashed and painted nothing.
- **Ollama's tray process being alive is NOT evidence the server is serving.** Found the tray running with port 11434 closed and Hermes silently brainless. **Test the port.**
- **Ollama 0.32.13 CRASHES on a massively oversized prompt** (229k tokens into a 65k window → server dead, HTTP 000, manual restart). Bound prompt size before sending.
- **Qwen 3.8 is a reasoning model.** `num_predict: 40` returns an **empty** `response` — the budget is consumed by `thinking`. Use ≥300 when testing.
- **Unquoted heredocs let bash command-substitute backticks** inside Python strings, silently deleting words from comments written into source files. Use `<<"EOF"` or a file.

---

## 5. SEAN-GATED — flag, do not fix

1. **`/fast` collides in his config.** `quick_commands.fast = {alias → "/model fast"}` duplicates the **builtin** `/fast`. Upstream test `test_commands_catalog_has_no_duplicate_or_alias_colliding_names` fails against his real config. **Proven pre-existing.** Fix = renaming his alias = his muscle memory.
2. **Hermes default model is still cloud** (`model.default=deepseek/deepseek-v4-flash`). Qwen 3.8 lives on the `qwen`/`quinn` aliases and menu option 8. Flipping the default is a one-line change he has not approved.
3. **Render API key rotation — deferred by Sean, explicitly "not yet."**
4. **DMARC** is live but `p=none` with no `rua=`. Adding `rua=` is the cheap next step.
5. **Q2** — exec quick-commands run through `subprocess.run(..., shell=True)`; alias args flow in unsanitised. Pre-existing upstream, rated MEDIUM by HY3.
6. **Supply chain** — 4,657 unsigned upstream commits, ~46 GB unverified model blobs. `git fsck --full` passed (integrity), which says nothing about authenticity.

---

## 6. ROLLBACK ASSETS

`/tmp/hermes-preupdate-HEAD.txt` (= `a61183b56`) · `stash@{0}` · `~/hermes2/.hermes/config.yaml.bak-20260815-pre-qwen38` · `config.yaml.bak-20260816-pre-qwen38-alias` · `/tmp/hermes-shallow.lock.bak-20260815` · `C:\tmp\hermes2-pc-launcher.ps1.bak-20260816` · `Start Hermes 2.cmd.bak-20260816` · `hermes-fast:latest` (the 3.6 build) still installed.

---

## 7. REVIEWER ROUTING (empirical)

| Model | Cost | Use for |
|---|---|---|
| **GLM 5.3** | flat-rate (Z.ai coding plan) | First-pass architecture + hostile review. **Ships a one-command probe per finding** — makes disproving it as cheap as agreeing. 9 findings last round: 2 real, 4 refuted by probe, 3 self-rated SAFE. |
| **Kimi K3** | ~$0.28 | **Attacking a proposed fix** — standout strength |
| **HY3** | ~$0.008 | Third perspective; supply-chain/posture blind spots; severity calibration |

**GLM transport:** `scripts/consult-glm.mjs`, **coding endpoint only** (`https://api.z.ai/api/coding/paas/v4`), streaming mandatory (wall >300s; ~84% of output is invisible reasoning). `ZAI_API_KEY` is USER-scope on Windows — `[Environment]::GetEnvironmentVariable('ZAI_API_KEY','User')`. Rules: `docs/ai-workflow/references/GLM-ZAI-ACCESS.md`.

**The relay prompt that produced three distinct HIGH findings:**
> *"Here is the previous reviewer's report and the fix I made from it. Find what they missed, and attack my fix. Echoing them is worthless."*
