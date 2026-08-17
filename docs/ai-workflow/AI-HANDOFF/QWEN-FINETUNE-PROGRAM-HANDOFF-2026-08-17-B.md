---
decision: "Second handoff of the SWA-169 Three Local Brains program: factory published and proven end-to-end on real GPU, hostile residue closed, S2a probe complete; next slices are S2b config fix, the prompt-ceiling honest baseline, and the never-run gates (judge calibration, quant-drop, rollback)"
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/QWEN-FINETUNE-PROGRAM-HANDOFF-2026-08-17.md
sanitized: true
---

# HANDOFF B — Three Local Brains Qwen Fine-Tuning (SWA-169)
**Date:** 2026-08-17 · **Author:** Opus 5 · **For:** the next AI, picking this up cold with no memory of the chat

> Read this file, then the plan's Revision R1 block, then SWA-169's comment trail. **Handoff A is superseded but not deleted** — its §4 (behavioral laws from the ten-round marathon) and §7 (environment gotchas, incl. the U1 additions) are still the best statement of those, and this file does not repeat them in full. Read A's §4 and §7.
>
> **Stale-check law applies to this file too.** Every live-state claim below was verified 2026-08-17 ~20:20Z. Parallel agents share this tree — re-verify before acting. The previous handoff had **three wrong live-state claims** and that cost real time; assume this one has decayed too.

---

## 1. What this program is (the 30-second version)

Sean is fine-tuning **three local Qwen models** on his RTX 5090 (32GB, Ollama, Unsloth Studio), from a standalone factory repo at `Desktop\ai-agent-tuning` — **not** inside SS-PT.

When Sean lists them from memory he reliably names two and forgets the third. The three are:

| Track | What it is | Why it exists |
|---|---|---|
| **A — Swan Coach** (8B class) | Behavior tune: safety/escalation, brand voice (never "AI", "26+ years / NASM-protocol", never yoga/meditation), tool policy, accessibility-as-training-data | His business. Long-term candidate private brain for SwanStudios |
| **B — Classroom Copilot** (4B, on-device) | Task tune: a teacher's chaotic voice dump → strict records JSON, on her Android phone via llama.rn | **The one he forgets.** Also the one where tuning pays MOST — small on-device models need it most, task is narrow and machine-checkable |
| **C — Coder + Designer** | Discipline tune: house coding law + design judgment in the weights, brand tokens kept OUT of them | The work he personally loves and uses daily |

**HARD LAW on Track B:** child data never leaves the teacher's device. Training data is **100% synthetic**. Teacher-voiced *fictional-children* dumps are the future eval crown jewel — **eval only, never trained.** Track B is gated on the classroom event-contract freeze; everything built against the current `0.0.0-provisional` contract is **disposable by design** (the manifest carries a machine-checkable `disposable: true`).

**Track C is a gated bet**, not scheduled work: SC0 (a baseline experiment, no training) must run first and show headroom. See §7 — I think the current gating on C is too conservative and recommend changing it.

---

## 2. Where we are — VERIFIED state as of 2026-08-17 20:20Z

### The factory repo (`Desktop\ai-agent-tuning`)
- **Published.** `origin/main` = `f10f56c` at `github.com/SeanSwan/ai-agent-tuning` (private). Working tree clean. **34/34 tests pass**, verified from a clean clone of the remote (not just the working tree).
- 23 tracked files. Leak-checked: no `agent-tuning-local/`, no `.jsonl`, no `sealed/` tracked. All training data stays local and gitignored.
- Commits authored as `<id>+SeanSwan@users.noreply.github.com` — Sean authorized this rewrite to keep his real address private after GitHub rejected the first push with **GH007**. `user.email` is set locally in that repo; future commits inherit it.

### SS-PT
- Branch `wip/comms-notifications-2026-07-05`, **fully pushed** (0 unpushed as of handoff). My commit `4e72731d8`; a parallel agent's coach dry-loop closed at round 25 in the same batch.
- **Render deploys from `main` ONLY.** This wip branch has a boot-breaker (SWA-79). **Never merge it silently.** Nothing in this program has deployed or should deploy.

### Hardware / runtime
- Ollama resident: `qwen3.8:27b-mtp-q4_K_M`, 17GB, 32768 ctx — **this is Hermes' brain and it is currently UP.** (Handoff A's "Hermes 30B ≈25GB" was a stale figure.)
- The launcher preflight requires **≥20000 MB free**. With Hermes up you will NOT clear it. Stopping Hermes is a Sean-awareness action — he approved it for the S2a window and it was restored afterward. Do the same: stop → train → restore, and say so.
- Free VRAM reads low (~4GB) even with only Hermes resident; desktop/browser GPU use accounts for the rest. Per-process reads are permission-blocked. Just run the preflight.

### Data on disk (all gitignored, `agent-tuning-local/`)
| File | Rows | State |
|---|---|---|
| `datasets/pilot-coach-sft.jsonl` | 20 | S2a pilot, **used** |
| `evals/pilot-coach-eval.jsonl` | 10 | Fable-draft ideals, **pilot-only**, used |
| `evals/coach-eval-inputs-glm.jsonl` | 60 | **ALL 60 IDEALS ARE `PENDING`** — Sean must author safety/voice ideals per R1 |
| `evals/coder-eval-inputs-glm.jsonl` | 40 | ideals PENDING |
| `datasets/classroom-probe-sft.jsonl` | **153** | disposable probe (provisional contract). Handoff A said "160-row" — that was wrong, and I repeated it here before counting. Count, don't inherit. |
| `runs/20260817-compare-pilot-s2a/` | — | complete run: sealed outputs, blinded sheet, verdicts, scorecard, **filled run card** |

---

## 3. What this session did

1. **Closed the ten-round hostile marathon's residue.** The last unconsumed finding (GLM H10-1) proposed widening a validator lookbehind. Executing its own 12-row matrix against live code: **the fix was already there** — it had landed as the co-reviewer's same-locus edit. Two reviewers converged on one hole; one never learned the other closed it.
   **The real gap was proof, not code.** The committed suite had **ZERO fixtures** for the entire H8/H9/H10 exemption family — not the one missing case the old handoff named. Three rounds of review work sat unguarded. Added 16 assertions (**33 → 34**) and **mutation-checked** them: reverting the lookbehind to its pre-H10 form makes the block fail, so they assert the defeat condition, not the fix's letter.
2. **Published the factory** after diagnosing the real push blocker (GH007, not the tool classifier).
3. **Ran S2a — the first live exercise of the entire factory:** train → export → Ollama registry → generate → blind → judge → score. **The floor correctly refused to pass.**
4. **Corrected three wrong live-state claims** in Handoff A and recorded the Unsloth CLI traps (Handoff A §7, U1 block).
5. Collected two of Sean's S0 answers.

### The S2a result, and what it does and does not mean
Tuned 4 / Base 5 / Tie 1 · win **44.4%** (n=9 non-tie) · CI [18.9%, 73.3%] · p=1.00 → **FLOOR FAIL**.
Deterministic checks: **0 hits on both arms** — no thinking-leak (the Qwen3 hybrid lock held on the export), no truncation, no banned language.

**This is not evidence about tuning.** 20 rows ÷ (batch 2 × accum 4) = **3 optimizer steps**, against `warmup_steps: 5`. The learning rate never finishes warming up — it peaks at 8e-5 of its 2e-4 target *on the final step*. `train_loss` 5.01, 6,071 tokens seen. It was a plumbing test and it succeeded as one.

**Watch item for the real run:** `safety_escalation` went **0-2 to base** and `refusal_trap` 0-1 to base. Noise at 3 steps — but those are the slices that matter most, and the promotion rule requires the safety slice to clear 50% CI *separately*. If that pattern survives a real run, it is the single most important signal in the program.

---

## 4. Sean's S0 answers (plan §12)

| Q | Answer |
|---|---|
| Q1 "Qwen 3.8" | Resolved — a real local family Sean runs (`qwen3.8:27b` tags) |
| **Q2 Track order** | **CONFIRMED: Coach (A) first.** Track B waits for the contract freeze rather than eating regeneration cost |
| **Q5 Transcript mining** | **SYNTHETIC-ONLY** until Sean personally reviews the redaction builder's output on real rows. No production transcript enters the pipeline before that review |
| Q4 Stage-3 hosting appetite | **STILL OPEN** — non-blocking |
| Q6 Track C base size | **STILL OPEN** — non-blocking (C is gated anyway) |

---

## 5. Traps that will bite you (all hit live — do not relearn these)

**Read Handoff A §7 in full.** The load-bearing ones:

- **`unsloth train` EXITS 0 ON FAILURE.** A run that trained nothing returned success; the error was only in the log body. **Assert the checkpoint artifact** (`adapter_model.safetensors` + `checkpoint-N/`), never the exit code.
- **Studio sandboxes output paths.** `--output-dir` must resolve under `~/.unsloth/studio/outputs`. Pass a *relative* name; copy artifacts out afterward.
- **`unsloth train --dry-run`** resolves the full config without touching the GPU. Use it to validate *before* stopping Hermes. It does **not** validate that the model id exists — check that separately against the HF API.
- **GGUF export re-downloads the full bf16 base (~16GB, 4 shards)** even with the 4-bit base cached. Not a hang. Budget ~10 min.
- **The A/B rigs itself by default.** Eval rows carry **only a user turn**; the harness injects no system prompt (`--profile` drives deterministic checks only). If you define the tuned arm with a SYSTEM line and point base at the stock model, you have compared *tuned-with-prompt vs base-without-prompt* and manufactured a meaningless win. **Both arms must carry the identical prompt** — use `TRACK_PROFILE_PROMPTS[...]` verbatim and verify with `ollama show <tag> --system` on both.
- **Check `steps = rows ÷ (batch × accum)` against `warmup_steps`** before believing any small-dataset run.
- **Do not hand-escape shell commands** — this environment mangles them. Use file-write tools. (I did this after reading a warning about it. So will you.)
- **Validate a probe before trusting a negative.** My export-watcher grepped `error|failed` and matched a benign `Cache check failed:` cache-miss line, reporting a healthy export dead.

---

## 6. Next slices, in order

### S2b — fix the training config (THE next slice; details in §8's agent prompt)
The pilot config cannot train. Resize warmup/accumulation to the row count and re-run so a result is interpretable. **This is a config-and-measurement slice, not a dataset slice.** Do not add rows to fix a warmup problem.

### S2c — the prompt-ceiling honest baseline (I recommend doing this WITH S2b; see §7.1)
### S3 — Sean authors the 60 coach eval ideals (human bottleneck, gates everything promotable)
### S8a — base 4B latency on the teacher's actual phone. Still unstarted. **Still the cheapest decision-lethal test in the program** — if prefill >4s the whole Track B target changes, and it costs ~$0 to learn.
### Never-run gates that doctrine already requires (§7.4)

---

## 7. Recommendations — what I think is missing from the plan

*Sean asked for this explicitly. These are my calls, not his; each is a proposal for him to accept, modify, or reject. Ranked by what I think they're worth.*

### 7.1 — Track A needs an SC0 of its own **[highest value]**
The promotion rule is *beat base + best system prompt*. **Nobody has ever measured how good base+prompt actually is for Track A.** If a well-prompted Qwen3-8B already handles Swan Coach voice and safety, the dataset work buys nothing — and the pilot gave a small hint in that direction (base won 5-4, and won *both* safety items).

**The strongest argument for this is that the plan already agrees with it — for a different track.** `ai-agent-tuning/docs/SC0-BASELINE-EXPERIMENT.md` exists for Track C and states the logic exactly: *"measure how far base + house-context system prompt already gets — because CLAUDE.md fits in context, and if the prompt alone reaches the rubric ceiling, the fine-tune is cargo."* It even carries a **pre-registered kill criterion** (≥80% of rubric ceiling → Track C shrinks or dies), decided before the run *so the result cannot be argued with afterwards*.

**Track A has no such experiment and no kill criterion.** That asymmetry is not deliberate — it's an artifact of Track C being demoted to a "gated bet" and therefore getting the scrutiny, while Track A was waved through as the proving ground. The track we're actually spending on is the one with no baseline.

**Recommendation:** write an `SC0-A` for Swan Coach mirroring the Track C protocol — same structure, same pre-registered kill criterion, run against the 60-item coach bank once Sean's ideals exist. Inference only; no training, no dataset. Do it *before* dataset spend.

*(Note the sequencing constraint: a scored ceiling needs Sean's ideals, so §7.5 gates the scoring half. The unscored half — deterministic checks, refusal/brand-trap behavior — can run immediately and is already informative.)*

### 7.2 — Ship the deterministic guard layer NOW, independent of any tune **[highest value-per-hour]**
R1 already rules that enumerable rules (banned strings, retired tokens, MUI, hex-vs-token) belong in a deterministic inference-time filter, not in weights. **The validators already exist** in `scripts/lib/tuning-profiles.mjs` and are now well-tested (34/34, including the H8/H9/H10 family).

They are currently only used to *grade* datasets and eval outputs. Wrap them as an **inference-time filter** and you get brand + safety enforcement on **any** model — tuned or not, today, with zero training. That is most of the practical value of Track A, available immediately, and it degrades gracefully if the tunes never ship. It is also the piece most likely to still be useful in a year.

### 7.3 — Unblock SC0 (Track C's baseline experiment) now; keep SC1/SC2 blocked
SC0 requires **no training** — it's bare-model vs context-prompted against the 40-item coder bank, with a pre-registered kill criterion. Its base is **already pulled locally** (`qwen3:14b`), so the marginal cost is inference time and nothing else.

It's currently gated behind "Track A ships end-to-end," which I think is over-conservative. SC0 answers a question Sean actually cares about (coding is the work he loves and uses daily), and it can *kill* Track C cheaply — which is worth a lot, because the alternative is discovering that after the dataset work.
**Keep SC1/SC2 blocked** — that gate is correct. Only the baseline experiment should move.

### 7.4 — Three doctrine gates exist on paper and have never been executed
Each is required by R1/the export doc before anything is promotable, and each is untested procedure. Untested procedure fails at the worst moment:
- **Judge calibration** — R1 requires ≥25 judgments at ≥80% Sean-agreement, else the rubric is rebuilt. Until this runs, *every judge verdict in the program is unvalidated*, including S2a's.
- **Quant-drop check** — ±3 points bf16 vs q4_K_M. Never run.
- **Rollback** — champion/challenger/previous tags are documented; **nobody has ever executed a rollback.** Test it once, deliberately, before anything is promoted. A rollback plan that has never run is a rollback plan on paper.

### 7.5 — The eval ideals are the real bottleneck, and they're human-only
60 coach + 40 coder eval inputs exist; **all ideals are PENDING**, and R1 says Sean authors the safety and voice ones personally. Nothing is promotable until that happens. It is the critical path and it cannot be delegated to a model (the whole point is that they encode *his* judgment).
**Recommendation:** don't schedule "author 60 ideals" as one block — it won't happen. Do **10 at a time**, safety slice first, in a structured session where the agent presents the input and Sean dictates the ideal. Ten good safety ideals unblock more than sixty mediocre ones.

### 7.6 — Start the teacher ask early, even though Track B is gated
The Track B crown jewel is teacher-voiced *fictional-children* dumps — real register, zero child data, eval-only. That's a human dependency with a long lead time and it does not depend on the contract freeze. Ask now; it can mature while the contract settles.

### 7.7 — Be honest about program size
Three fine-tunes plus eval banks plus a judge-calibration regime is a lot of program for one person alongside running a business. If §7.1 and §7.2 land, Sean may find that **the guard layer + a strong prompt gets 80% of the value with none of the training burden**, and that the one tune genuinely worth finishing is whichever the prompt-ceiling test shows the largest gap on. I'd rather he learn that from a cheap measurement than from six months of dataset work.

### 7.8 — Hermes: the right integration shape (Sean asked about this directly)
**Nothing in this program requires Hermes.** All of it runs from the terminal. Hermes is a convenience layer, and the tempting version of it is the wrong one.

- **Wrong shape:** "Hermes trains models." Training is long-running, GPU-exclusive, and takes arbitrary parameters. Handing that to a chat interface means a phone message can exhaust the GPU, evict Hermes' own brain, or launch a 12-hour run by typo.
- **Right shape — mostly read, narrowly write:**
  - **T0 (read):** "what did the last run score?" → return the run card. "is the GPU free?" → preflight status. "what's pending?" → eval ideals outstanding. This is genuinely useful and completely safe.
  - **T2 (bounded write):** trigger a **pre-registered, named** training config (`run pilot-coach-v2`), never free-form arguments. The config lives in the repo, reviewed; Hermes selects, it does not compose.
  - **Never:** arbitrary training args, model deletion, promotion to champion. Promotion is a human decision with an evidence gate — it must not be reachable from a chat message.
- **Ordering:** do this **after** S2b. Adding a remote control to a machine that cannot yet train is polish before function. When it is built, it must register in the AI Skill & Operator Registry (unregistered = blocked) and carry a kill switch.

---

## 8. THE AGENT PROMPT — paste this to the next agent

> You are picking up the SWA-169 "Three Local Brains" Qwen fine-tuning program. Your predecessor (Opus 5) wrapped the whole session into this handoff. Work in this exact order.
>
> **1. ORIENT.** Read `docs/ai-workflow/AI-HANDOFF/QWEN-FINETUNE-PROGRAM-HANDOFF-2026-08-17-B.md` fully, then §4 and §7 of the superseded `...2026-08-17.md` (marathon behavioral laws + environment gotchas — not repeated in B), then the BINDING Revision R1 block atop `docs/ai-workflow/brainstorms/qwen-two-brains-finetune-plan-2026-08-16.md`. Check the lane ledger and SWA-169 before touching anything.
>
> **2. VERIFY, DON'T TRUST.** Stale-check every live-state claim before acting on it (branch position, `origin/main` of ai-agent-tuning, `ollama ps`, 34/34). Handoff A shipped with three wrong live-state claims; B was accurate when written and has been decaying since. Parallel agents share this tree.
>
> **3. STANDING LAW (Sean, permanent).** Every hostile-review panel fires THREE reviewers — GLM (`consult-glm.mjs`, $0), Kimi (`consult-kimi.mjs`, **PAID — ask Sean before any NEW review campaign**), and local Qwen 3.8 (`consult-qwen.mjs`, $0, private, **never the lead**). A fix ledger is a claims list: no claimed fix ships without an executed-proof smoke in the packet. Regression tests assert the **defeat condition**, not the fix's letter — and mutate the code back to watch the test die before you call it proof. Proof-before-done and the dry-loop law apply to you.
>
> **4. THE WORK, in order:**
>
> **(a) S2b — make the pilot capable of training.** The current config yields 3 optimizer steps against a 5-step warmup, so the LR never warms up and no result is interpretable. Fix warmup/accumulation relative to row count (and say why you chose what you chose). Then: `--dry-run` first, VRAM preflight, stop Hermes' brain with Sean's awareness, train, export per `ai-agent-tuning/docs/OLLAMA-EXPORT.md`, re-run `compare-tuned`, **restore Hermes' brain**, fill the run card. **Both compare arms must carry the identical system prompt — verify with `ollama show <tag> --system` on both, and state the char counts.** Assert the checkpoint artifact; never trust `unsloth train`'s exit code.
>
> **(b) S2c — the prompt-ceiling baseline (handoff §7.1).** Measure how good base+best-system-prompt actually is against the coach bank. Nobody has ever measured the thing every tune is required to beat. Report it as a number.
>
> **(c) Present handoff §7 (recommendations) to Sean and get his verdicts.** Do not implement them unilaterally — several change program scope (unblocking SC0, shipping the guard layer standalone, re-sequencing the ideals work). Ask, record his answers in SWA-169, then act on what he approves.
>
> **(d) If Sean wants Hermes wired in, build ONLY the shape in §7.8** — T0 read (run cards, GPU status, pending ideals) plus T2 trigger of *pre-registered named configs*; never free-form training args, never promotion. Register it in the AI Skill & Operator Registry with a kill switch. Do this after (a), not before.
>
> **5. HARD GUARDRAILS.** Render deploys from `main` ONLY — the wip branch has a boot-breaker (SWA-79); never merge it silently. Child data never leaves the teacher's device: classroom training data is synthetic-only and everything built against the provisional contract is disposable until the freeze. Track C's SC1/SC2 stay blocked (SC0 is Sean's call per §7.3). Sean authors all safety and voice eval ideals personally — do not generate them.
>
> **6. CLOSE** with the house gates: dual-tier summary (plain English first), dry-loop ledger, Linear sync to SWA-169, Hermes memo. Report blockers first, evidence always.

---

## 9. Sean's standing queue (surface, do not act without him)
- **ROTATE THE RENDER API KEY** — exposed 2026-08-12; only Sean can revoke it at Render.
- **DMARC record (SWA-13)** — his explicit standing ask; ~10 min at Namecheap.
- S0 leftovers: Stage-3 hosting appetite, Track C base size.
- **60 coach + 40 coder eval ideals** — the program's critical path (§7.5).
- Review the redaction builder's output before any transcript mining (his own Q5 answer).

## 10. Loose ends I deliberately did not touch
- **16 learning packets sit untracked** in `docs/ai-workflow/hermes-learning-packets/` — parallel-session files, not mine to sweep, but the durable corpus is meant to be committed. Worth a cleanup pass with Sean's ok.
- `c:/tmp/aat-verify-1` — throwaway clone I made to verify the pushed remote passes tests. Deletable.
- Quant-drop, judge calibration, and rollback remain unexecuted (§7.4).
