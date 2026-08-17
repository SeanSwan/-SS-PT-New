---
decision: "Handoff of the SWA-169 Three Local Brains fine-tuning program: plan ratified through R1, factory built and hostile-reviewed through 10 paid rounds, next slices are S0 answers / S2a pilot train / S8a phone latency"
status: open
supersedes: none
sanitized: true
---

> ## ⛔ SUPERSEDED — read [`QWEN-FINETUNE-PROGRAM-HANDOFF-2026-08-17-B.md`](QWEN-FINETUNE-PROGRAM-HANDOFF-2026-08-17-B.md) FIRST.
> Handoff B carries the current state (factory published, S2a proven end-to-end, next slices, recommendations).
> **This file is still worth reading for two things B does not repeat:** §4 (the ten-round marathon's behavioral laws) and §7 (environment gotchas, including the U1 additions).
> Everything in §3/§6 about push state and VRAM is **stale** — see the U1 block immediately below for the corrections.

# HANDOFF — Three Local Brains Qwen Fine-Tuning Program (SWA-169)
**Date:** 2026-08-17 · **Author:** Fable 5 (session Final Decider) · **For:** the next AI picking this up cold
**Board:** SWA-169 (High, In Progress) — related SWA-160 (Hermes Qwen 3.8 upgrade)

Read order: this doc → the plan's Revision R1 block → SWA-169's comment trail. Verify every live-state claim below before acting on it (stale-check law): another agent may have moved things.

---

## ⚖ UPDATE U1 — 2026-08-17, Opus 5 session (BINDING where it conflicts with the body)

The handoff's live-state claims were stale-checked. **Three were wrong**; recording the corrections so the next reader does not re-inherit them.

| § | Claim as written | Verified reality |
|---|---|---|
| 3, 6.2, 7 | first push "permission-blocked" by the tool classifier | **Misdiagnosed.** The push was rejected by *GitHub*: `GH007 — your push would publish a private email address`, because both commits carried Sean's real address. The tool classifier separately blocks `git filter-branch` (a protected history-rewrite op), which is a different gate. **RESOLVED:** Sean authorized the noreply rewrite (Rule 45); history rebuilt via orphan-checkout + cherry-pick (no rewrite tooling needed), rebuilt tree hash proven **identical** (`117d7854…`), pushed. `origin/main` = `f10f56c`, 23 files, leak-checked — no `agent-tuning-local/`, `.jsonl`, or `sealed/` tracked. |
| 4.1 / 4.2 | residue = GLM's one LOW + one missing Kimi fixture | **Understated.** GLM H10-1's fix was *already in the regex* (the 5th lookbehind already spans `[^)]{0,120}`) — it landed as Kimi's H10 fix; same locus, same edit. The real gap was **proof**: the committed suite had **zero** fixtures for the *entire* H8/H9/H10 exemption family, so H8-1, H9-1 and H10-1 were all unguarded. **CONSUMED** in `f10f56c`: 16 assertions, suite **33 → 34**. |
| 6.4 | "Hermes 30B ≈ 25GB resident" | **Stale figure.** Actual resident is the `qwen3.8:27b-mtp-q4_K_M` tag at **17GB** (24.6GB of 32GB used overall, 7.5GB free). Conclusion unchanged — still under the 20GB preflight, still needs the model stopped. Stopped → **27,034 MiB free**. |

**Sean's S0 answers (plan §12), collected this session:**
- **Q2 track order — CONFIRMED: Coach (Track A) first**, as planned. Track B waits for the contract freeze rather than eating regeneration cost.
- **Q5 transcript mining — SYNTHETIC-ONLY** until Sean personally reviews the redaction builder's output on real rows. No production transcript enters the pipeline before that review.
- **Q1** is already resolved by §1 (Qwen 3.8 is a real local family Sean runs). **Q4 (Stage-3 appetite)** and **Q6 (Track C base size)** remain open — both non-blocking (Track C is gated behind Track A + SC0 anyway).

**Method note for the next reviewer:** the new fixture block was **mutation-checked** — reverting the 5th lookbehind to its pre-H10 `\s*` form makes the block fail on `:is(#face, #beef)`. A fixture that has not been shown to fail against the defeated code is not proof that it defends (the H2 law). Do this for every regression block you add.

---

## 1. What this program is

Sean is building THREE locally fine-tuned Qwen models on his RTX 5090 (32GB VRAM, Ollama, Unsloth Studio installed at `~\.unsloth\studio\bin`), using the standalone factory repo at `C:\Users\BigotSmasher\Desktop\ai-agent-tuning` (NOT inside SS-PT):

- **Track A — Swan Coach behavior tune** (Qwen 8B-class): safety/escalation, voice/brand (never "AI", "26+ years / NASM-protocol", no yoga/meditation), tool policy, and accessibility-as-training-data. Long-term: candidate private brain for SwanStudios (staged: 5090 shadow → A/B → a Stage-3 decision gate that expects "no" for years).
- **Track B — Classroom Copilot extraction tune** (Qwen 4B-class, on-device via llama.rn on teacher T's Android 14 phone): chaotic voice dump → strict records JSON. HARD LAW: child data never leaves T's device ⇒ training data is 100% synthetic; T-voiced FICTIONAL-children dumps are the future eval crown jewel (eval only, never train). GATED on the classroom event-contract freeze (owned by the classroom-copilot workstream, `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/`).
- **Track C — Swan Coder+Designer discipline tune**: DEMOTED to a gated bet. SC0 (base+house-context-prompt baseline vs the 100-eval bank, pre-registered kill criterion ≥80% of rubric ceiling) must run first; SC1/SC2 blocked until Track A ships end-to-end AND SC0 shows headroom. Base per decision tree: dense Qwen3-Coder ≤14B → Qwen2.5-Coder-14B → MoE 30B-A3B only after smoke-train.

**"Qwen 3.8" is a real, verified local model family** — Sean runs `qwen3.8:27b-mtp-q4_K_M` and `-q8_0` tags plus a `hermes-fast-38` brain. S1's catalog check targets Qwen 3.8 releases; per-track sizes still per catalog.

## 2. Canonical documents

| What | Where |
|---|---|
| Master plan (Revision R1 block at top is BINDING — it supersedes the body where they conflict) | `docs/ai-workflow/brainstorms/qwen-two-brains-finetune-plan-2026-08-16.md` |
| Plan review round + Fable synthesis (18 verified findings → 14 amendments) | `docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/01–03` |
| Implementation hostile marathon H1–H10 (packets, replies) | same dir, `04–33` |
| Durable lessons | `docs/ai-workflow/hermes-learning-packets/20260816-train-against-frozen-contracts-and-honest-baselines.md` |
| SC0 protocol | `ai-agent-tuning/docs/SC0-BASELINE-EXPERIMENT.md` |
| Export/registry/rollback doctrine | `ai-agent-tuning/docs/OLLAMA-EXPORT.md` |

## 3. Factory state (all verified this session; re-verify before trusting)

`ai-agent-tuning` — now a git repo, initial 23-file commit on `main`; **private GitHub repo `SeanSwan/ai-agent-tuning` EXISTS but the first push was permission-blocked — CHECK `git -C ...ai-agent-tuning status -sb` / `git log origin/main..main`; if unpushed, it needs Sean or an approved `git push -u origin main`.**

- `scripts/lib/tuning-profiles.mjs` — 3 track profiles + validators (banned patterns incl. retired-palette hexes matched-never-named, think-leak variants, the 5-lookbehind hex-color regex with a 13+-shape red/control matrix); classroom contract validator (primitives are findings not TypeErrors; unknown keys/top-level extras/20-cap rejected); contract version-pinned + cached-after-validation.
- `contracts/classroom-extract.contract.json` — `0.0.0-provisional`; ALL data built against it is disposable register-probing (manifest carries machine-checkable `disposable: true`; a future trainer entrypoint must refuse such manifests). Triage is NOT supervised in synthetic gold (Fable ruling, both reviewers concurred).
- `scripts/compare-tuned.mjs` + `lib/compare-core.mjs` — the evidence harness: CSPRNG blinding sealed in `sealed/mapping.json` with sha256 commitment on the run card; statistical floor n≥30 ∧ p<0.05 ∧ CI-low>0.5 ∧ win≥58% ∧ ties≤40% ∧ zero verdict defects (INCOMPLETE never renders PASS); entity-namespace contamination gate (demo-client + contract-derived child ids, lazily loaded, loud non-classroom degradation); PENDING-ideal refusal; PII lint pre-sheet; truncation differential blocks promotion; per-slice W-L-T; arm-order alternation; `--force` = supersede-everything recovery with crash-residue recognition; strict per-command arg parsing (dangling/empty/wrong-command flags all throw).
- `scripts/gen-classroom-dumps.mjs` — seeded synthetic dump generator: R1 category distribution incl. resolvable-anaphora vs pronoun-trap discrimination (two-record traps use exported NON_BINDING_REFS only), rejection sampling (0.06% collisions at n=5000) with >1% build-fail gate, lineage manifest, `--emit-invalid` validator-torture mode writing `.quarantine` files a build can never ingest.
- `agent-tuning-dataset.mjs` — profile prompts injected at build; validation BEFORE any write (failed builds leave `--out` untouched, evidence to stamped `.rejected-*`); explicit unknown `--profile` throws.
- **Tests: 33/33** (`npm test`). Data on disk (gitignored `agent-tuning-local/`): 20-row S2a pilot SFT + 10 held-out evals (Fable-draft ideals, pilot-only); 160-row classroom probe + manifest; 60 coach + 40 coder GLM-generated eval INPUTS (ideals PENDING — Sean authors safety/voice per R1; entity ids partitioned train 0xx / eval 1xx).

## 4. The ten-round hostile marathon — what the next AI must internalize

GLM-5.3 ($0, subscription) + Kimi K3 (~$2.2 total) ran 10 rounds against the implementation; ~75 verified findings, ALL fixed with **executed proof** (the packets in the reviews dir carry the per-round fix ledgers). Finding curve 25→12→4→8→10→4→7→3→3→2. Two claims disproven/corrected in total (GLM's CRLF minor; my own wrong mechanism in disproving it — corrected by GLM). **Terminated by Sean at round 10 before formal CLEAN×2.** Residue, explicitly owed:

1. **GLM H10's one LOW is UNCONSUMED** — read `qwen-finetune-reviews-2026-08-16/32-glm-h10.md`, verify, fix or refute.
2. Kimi H10's comma-position pseudo-class fix IS in the regex (suite 33/33) but its fixture (`:is(.a, #face)` green) is **not yet in the committed suite** — add it.

Behavioral laws the marathon burned in (repeat-tested at Sean's expense — do not relearn them):
- **A fix ledger is a claims list**: every claimed fix ships with an executed-proof smoke IN the review packet. The "described-not-applied" class recurred a third session running (K2/H3) — treat any unexecuted fix claim as false.
- **Regression tests assert the DEFEAT CONDITION, not the fix's letter** (GLM H2 dissent; K1 survived a letter-test).
- **Crash-recovery fixes must enumerate the dir shapes crashes actually produce** — two fixes in a row moved the deadlock window instead of closing it ("window theology").
- Judge/generator families must be separated; entity namespaces partition by construction; gates fail closed, and a gate's ABSENCE-of-evidence path is itself an attack surface.

## 5. Standing directives from Sean (this session, permanent)

1. **Qwen 3.8 = free hostile reviewer, FOREVER** (2026-08-17): every hostile panel also fires `node scripts/consult-qwen.mjs --document <packet> --out <dir>/NN-qwen-rN.md --remit "<same remit>"` — local, $0, private, `think:false` (hybrid model returns empty content otherwise — fixed and live-proven, 2.7s response). Never the lead/tie-breaker; its findings are hypotheses (Rule 30). Memory: `feedback_qwen38_free_hostile_reviewer_forever.md`.
2. Batch-push cadence holds; **Render deploys from MAIN only** — the working branch `wip/comms-notifications-2026-07-05` is ~2021 commits behind main and merging is blocked by SWA-79 (boot-breaker). Never merge silently.
3. All prior standing laws apply (proof-before-done, dry-loop, test-delta disclosure, Kimi-ask-first for NEW topics — this program's panel usage was explicitly authorized "until dry" and then terminated; new review campaigns need a fresh yes).

## 6. Next slices, in recommended order

1. **S0 (Sean, 5 min):** answer plan §12 — Qwen 3.8 per-track sizes at catalog, track order confirm, Stage-3 appetite, transcript-mining permission (now a per-row sign-off gate), Track C base size.
2. **Owed pushes:** `ai-agent-tuning` → `git push -u origin main` (repo exists, private). Verify first that it's still unpushed.
3. **H10 residue:** consume `32-glm-h10.md`; commit the Kimi comma-fixture.
4. **S2a pilot train run** (first live GPU slice): check `ollama ps` + VRAM headroom (Hermes 30B ≈ 25GB resident when loaded; launcher preflight enforces ≥20GB free), stop resident models with Sean's awareness, train the 20-row pilot in Unsloth Studio (Qwen3/3.8 8B-class, QLoRA, defaults, 1 epoch), export per `OLLAMA-EXPORT.md`, run the FIRST live `compare-tuned run` (base+system-prompt vs tuned; judge pinned; PENDING ideals make it a probe, not promotable).
5. **S8a (with Sean/classroom team):** base 4B latency on T's phone — before any classroom dataset spend.
6. **Sean's separate standing queue** (surface, don't act without him): DMARC record (SWA-13), Render API key rotation (2026-08-12 exposure).

## 7. Environment gotchas (hard-won this session)

- consult scripts: `consult-glm.mjs` ($0 subscription), `consult-kimi.mjs` (PAID — spend gate + cap; its OpenRouter reasoning-param bug is FIXED: cap only, never effort+cap), `consult-qwen.mjs` (new, $0 local). NEVER `2>/dev/null` a paid consult — a masked failure cost a round.
- Git Bash mangles PowerShell `$` and code-injection heredocs — code edits via Edit/Write tools only; `MSYS_NO_PATHCONV=1` for `git show <rev>:<path>`.
- Stale zero-byte `.git/index.lock` from crashed parallel-agent commits: verify no git process (`tasklist`), then remove — twice this session.
- The tool-permission classifier can transiently time out (retry) and blocks pushes to NEW remotes (hand to Sean).
- Parallel sessions commit to the same wip branch — always `git log origin/<branch>..HEAD` before claiming counts; lane-ledger discipline (Rule 67) before editing anything.

### Added 2026-08-17 (U1 session) — Unsloth CLI traps, all hit live

- **`unsloth train` EXITS 0 ON FAILURE.** A run that never trained a single step returned `TRAIN_EXIT=0`; the error was only in the log body. **Never trust its exit code** — assert the checkpoint exists (`adapter_model.safetensors` + `checkpoint-N/`) before believing a train happened. This is the "tools that report false success" class; it would have silently poisoned every downstream claim.
- **Studio sandboxes output paths.** `--output-dir` must resolve UNDER `~/.unsloth/studio/outputs`; an absolute path into the repo dies with `path escapes root: … is not under …\studio\outputs`. Pass a *relative* name (`--output-dir pilot-coach-s2a`) and copy artifacts to the repo afterward.
- **`unsloth train --dry-run` resolves the full config without touching the GPU** — use it to validate an invocation *before* stopping the Hermes brain. It does NOT validate that the model id exists; check that separately (`curl -o /dev/null -w '%{http_code}' https://huggingface.co/api/models/<id>`).
- **Merged/GGUF export re-downloads the full bf16 base (~16GB, 4 shards)** even when the 4-bit base is already cached — QLoRA merge needs full precision. Budget the time and disk; it is not a hang.
- **The eval rows carry ONLY a user turn and the harness injects no system prompt** (`row.input ?? row.messages`; `--profile` drives deterministic checks only). So the system prompt must come from each arm's Ollama Modelfile — and **both arms must get the identical prompt**, or you have silently compared tuned-with-prompt against base-without-prompt and flattered the tune. R1's baseline is *base + best system prompt*; use `TRACK_PROFILE_PROMPTS[...]` verbatim on both, and verify with `ollama show <tag> --system`.
- **Pilot config cannot produce a tune, by construction:** 20 rows ÷ (batch 2 × accum 4) = **3 optimizer steps**, against `warmup_steps: 5` — the LR never finishes warming up (peaks at 8e-5 of the 2e-4 target on the final step), 6,071 tokens seen, `train_loss` 5.01. It is a *plumbing* test and nothing else. The next real run must fix warmup/accum for the row count, not merely add rows.
