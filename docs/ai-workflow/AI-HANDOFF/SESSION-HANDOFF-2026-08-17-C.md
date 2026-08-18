---
decision: "Session handoff C: the handoff skill + Rule 83 + context-watch gate shipped to main; SWA-169 fine-tuning program state and its two approved recommendations carried forward; the context-watch gate is built and tested but deliberately UNWIRED pending live verification"
status: open
supersedes: none
sanitized: true
---

# SESSION HANDOFF C — 2026-08-17
**Author:** Opus 5 · **For:** the next agent, cold, with no memory of the chat
**Written at ~98% of a 1M context** — which is itself the reason the context-watch gate below exists.

---

## 0. READ THIS FIRST

**Load the `handoff` skill (`.claude/skills/handoff/SKILL.md`) at the start of your session.** It is new as of this session (Rule 83). If your session will also end in a transfer — and it will — the chain breaks at link one if you do not.

**Two branches are in play. This matters more than anything else in this document.**

| Branch | What lives there | Deploys? |
|---|---|---|
| `main` | The handoff skill, Rule 83, the context-watch gate, **this file** | **YES** — Render auto-deploys |
| `wip/comms-notifications-2026-07-05` | The **entire SWA-169 fine-tuning program**: plan, reviews, Handoffs A and B | **NO** — boot-breaker SWA-79 blocks the merge |

**The fine-tuning program's docs live on a branch that cannot merge.** That is a real structural problem, not a filing quirk — see §5.3. Do not "fix" it by merging the wip branch.

**Stale-check law:** every live claim below was verified 2026-08-17 ~21:30Z with a command. Parallel agents share this tree. Re-verify before acting — a previous handoff in this program shipped **three wrong live-state claims**, and this one had a wrong row count until a verification pass caught it.

---

## 1. What happened this session, in order

1. Picked up the SWA-169 fine-tuning program cold from Fable 5's handoff. Stale-checked every live claim — **three were wrong**.
2. **Closed the ten-round hostile marathon's residue.** The last open finding proposed a fix that was *already in the code*; the real gap was that the committed test suite had **zero fixtures** for three rounds' worth of fixes. Added 16 assertions (33→34) and mutation-checked them.
3. **Published the factory repo** to GitHub after diagnosing the real push blocker (GitHub GH007 private-email rejection — not the tool classifier, as the old handoff claimed).
4. **Ran S2a**, the first live exercise of the whole factory: train → export → Ollama → generate → blind → judge → score. The quality floor **correctly refused to pass**.
5. Wrote **Handoff B** with 8 recommendations. Sean approved the top two.
6. Built the **`handoff` skill + Rule 83 + the context-watch gate** and shipped them to `main`.

---

## 2. Verified state (command + result)

```
git -C ai-agent-tuning ls-remote origin refs/heads/main   -> f10f56c
cd ai-agent-tuning && npm test                            -> 34 tests, 34 pass, 0 fail
git log origin/main -1                                    -> cc0e1c8f3 (handoff skill + rule 83)
node scripts/sync-agents-mirror.mjs --check               -> IN SYNC (body sha e1891fe720828de4)
node scripts/hooks/context-watch-gate.test.mjs            -> 15 passed, 0 failed
ollama ps                                                 -> qwen3.8:27b-mtp-q4_K_M, 17GB, 32768 ctx (Hermes brain UP)
```

- `wip/comms-notifications-2026-07-05`: fully pushed as of `3ffef7e72`. Nothing of mine is unpushed.
- Factory data (all gitignored, `ai-agent-tuning/agent-tuning-local/`): pilot SFT **20** rows, pilot eval **10**, coach eval bank **60** (**all 60 ideals PENDING**), coder bank **40**, classroom probe **153** (Handoff A said 160 — it was wrong).

---

## UPDATE — 2026-08-18: Tasks 1-4 below are DONE. Read this before §3.

All four tasks in §3 were completed in the session that wrote this file. §3 is retained as
the record of what was asked and why; **do not re-do it.** What actually happened:

| §3 Task | Outcome |
|---|---|
| 1. Wire the context-watch gate | **DONE** (`0a676df92`). My "it's broken" call was **wrong** — my test harness passed a Git-Bash path Node cannot resolve on Windows, so the gate correctly failed open, and a stale debug reading made me expect a block. Live-verified allow/block/no-nag/fail-open, then wired last in the Stop array. |
| 2. SC0-A baseline | **DONE** (`ed4a25b` in ai-agent-tuning). Protocol written with a pre-registered kill criterion; **Half 1 executed** — see the result below. Half 2 still blocked on Sean's ideals. |
| 3. Guard layer standalone | **DONE** (same commit). `scripts/lib/guard-layer.mjs` — repairs vocabulary, escalates meaning, never silently rewrites a claim. |
| 4. S2b config fix | **DONE** (`80938bf`). 3 optimizer steps → 20; loss 5.01 → 3.66; LR now reaches its 2e-4 target instead of peaking at 8e-5 on the final step. |

**The SC0-A Half 1 result is the most decision-relevant thing in this document.** Across all
60 coach eval inputs, with arms differing only by the system prompt (0 vs 679 chars):
bare base **18** banned-pattern hits → base+prompt **5**. A 72% reduction, and it eliminates
the highest-legal-risk violation (`nasm_certified_claim`) outright. All 5 survivors sit in
the `voice_brand` slice — the prompt holds normally and fails under deliberate pressure.

Two consequences: (a) Track A's SFT is worth little on the *enumerable* axis, so Half 2 must
justify the tune on non-enumerable judgment; (b) the survivors were 100% enumerable, which is
exactly what the guard layer now closes deterministically.

**Also fixed en route:** the shared brand validator's `/\bmeditat(?:e|ion|ing)\b/` let both
-s forms through — "meditates" and "meditations" were never banned. Widened to the stem,
fixtures added, mutation-checked. SC0-A's counts were re-derived against the fixed validator
and are unchanged (18/5), so the reported numbers stand. And `package.json` enumerated its
test files by hand, so a new test file ran zero times — switched to a glob, 34 → 47 tests.

**What is actually next:** Sean authoring the eval ideals (10 at a time, safety slice first).
That is the critical path and nothing promotable can happen without it. Everything else in
the program is now either done or waiting on it.

---

## 3. YOUR WORK, in order

### Task 1 — Live-verify and wire the context-watch gate ⚠ **do this first**

`scripts/hooks/context-watch-gate.mjs` is built, documented, and **15/15 tested**, but is **NOT wired into `.claude/settings.json`**. Its pure logic is proven; I could not get its stdin/IO path to fire in my own test harness and refused to add an unverified gate to the Stop chain — a gate that silently never fires is precisely the failure it exists to prevent.

**What it does:** reads real token usage from the transcript (`input_tokens + cache_creation + cache_read` off the last assistant message), self-calibrates the context window, then blocks once at **70%** (advise) and again at **85%** (urgent), instructing the model to produce a handoff.

**Why window detection is self-calibrating:** the transcript records the model as `claude-opus-5` with **no `[1m]` suffix**, so the window cannot be read directly. Assuming 200k on a 1M session would report 174% and block every single turn. It infers the smallest standard window the usage fits. Underclaiming only *delays* a handoff; overclaiming *spams* one — delay is the safe error. `SWAN_CONTEXT_WINDOW` overrides.

**Debug notes so you do not repeat my dead ends:**
- Node on Windows **cannot** read a Git-Bash path (`/c/Users/...`). One of my "the gate is broken" results was my *test* passing a bad path — the gate correctly failed open. Convert to `C:/...` before testing.
- I confirmed: stdin reading works in isolation; the transcript reads fine (2.1 MB); `currentUsage` returns the right number (984,662 when I last measured); `decide` returns the right verdict. Yet piping a well-formed payload to the script produced no stdout. **The remaining suspect is the direct-invocation guard on the last line** (`process.argv[1].endsWith(...)`) or an early return in `main()`. Instrument `main()` with `console.error` traces and find it — do not guess.
- Compare against `scripts/hooks/dual-tier-gate.mjs`, which uses a different guard form (`import.meta.url.endsWith(...)`) and demonstrably works. **Copying its exact guard is the likeliest one-line fix.**

**Acceptance:** piping a real payload with a high-usage transcript prints a `{"decision":"block"}` JSON; a low-usage one prints nothing; `stop_hook_active:true` prints nothing; a missing transcript prints nothing. Then add it to the `Stop` array in `.claude/settings.json` and confirm it fires once and does not nag.

### Task 2 — Sean's recommendation #1: an SC0 for Track A ("the prompt ceiling")

**This is the highest-value item in the fine-tuning program and Sean explicitly approved it.**

The promotion rule is *beat base + best system prompt* — and nobody has ever measured how good base+prompt actually is for Swan Coach. `ai-agent-tuning/docs/SC0-BASELINE-EXPERIMENT.md` already states this logic perfectly, with a **pre-registered kill criterion**… but only for Track C, because Track C got demoted and demotion is what triggered the scrutiny. **The track we are actually spending on has no baseline and no kill criterion.**

Write `SC0-A-BASELINE-EXPERIMENT.md` mirroring the Track C protocol: same structure, same pre-registered kill threshold fixed *before* the run. The **scored** half needs Sean's authored ideals (see §4) and is blocked; the **unscored** half — deterministic checks, brand/refusal-trap behavior on base+prompt — can run immediately and is already informative. Run that now.

Weak but real supporting signal: in S2a the *untrained* base won 5-4 overall and won **both** safety items.

### Task 3 — Sean's recommendation #2: ship the guard layer standalone

R1 already rules that enumerable rules (banned strings, retired palette tokens, MUI, hex-vs-token) belong in a **deterministic inference-time filter**, not in model weights. Those validators already exist in `ai-agent-tuning/scripts/lib/tuning-profiles.mjs` and are now well tested (34/34, including the H8/H9/H10 family I added).

Today they only *grade* datasets and eval outputs. Wrap them as an inference-time filter and you get brand + safety enforcement on **any** model — tuned or not — **today, with zero training**, and it keeps working if no tune ever ships. Highest value-per-hour in the program.

### Task 4 — S2b: make the pilot capable of training

The pilot config **cannot train**: 20 rows ÷ (batch 2 × accum 4) = **3 optimizer steps** against `warmup_steps: 5`, so the learning rate never finishes warming up (peaks at 8e-5 of its 2e-4 target on the final step). Fix warmup/accumulation relative to row count and say why you chose what you chose. **Do not "fix" a warmup problem by adding rows.**

Procedure: `unsloth train --dry-run` first (validates config without touching the GPU) → VRAM preflight (needs ≥20000 MB free; Hermes' brain holds 17 GB, so stop it **with Sean's awareness**) → train → export per `ai-agent-tuning/docs/OLLAMA-EXPORT.md` → re-run `compare-tuned` → **restore Hermes' brain** → fill the run card.

---

## 4. Sean's standing queue (only he can do these)

- **ROTATE THE RENDER API KEY** — exposed 2026-08-12. Remind him until confirmed.
- **DMARC record (SWA-13)** — his explicit standing ask, ~10 min at Namecheap.
- **Author the 60 coach eval ideals.** This is the program's critical path and cannot be delegated — R1 says he authors safety and voice personally because they encode *his* judgment. **Recommended: 10 at a time, safety slice first**, in a session where you present the input and he dictates the ideal. A 60-item block will never start.
- Open + non-blocking: Stage-3 hosting appetite; Track C base size.
- He must review the redaction builder's output before any production transcript is mined (his own answer: **synthetic-only** until then).

---

## 5. Traps and structural problems

### 5.1 Traps that cost time this session
- **`unsloth train` EXITS 0 ON FAILURE.** A run that trained nothing returned success; the error was only in the log body. **Assert the checkpoint artifact, never the exit code.**
- **Unsloth sandboxes output paths** — `--output-dir` must resolve under `~/.unsloth/studio/outputs`; pass a relative name.
- **GGUF export re-downloads the full bf16 base (~16 GB)** even with the 4-bit base cached. Not a hang.
- **The A/B rigs itself by default.** Eval rows carry only a user turn and the harness injects no system prompt. If you give the tuned arm a SYSTEM line and point base at the stock model, you have compared *tuned-with-prompt vs base-without-prompt*. **Both arms must carry the identical prompt** — verify with `ollama show <tag> --system` and state the char counts.
- **Git Bash mangles heredocs and hand-escaped shell.** Use file-write tools. I hit this *after* documenting it.
- **Validate a probe before believing a negative.** Twice this session an instrument I wrote reported a false failure — once a benign `Cache check failed:` line, once a bad path. Both times the thing under test was healthy.

### 5.2 Numbers get re-derived, never inherited
I wrote "assume this file has decayed — re-verify" and then, four paragraphs later in the same document, copied an unverified row count from the file I was superseding. It was wrong (160 vs 153). Knowing the rule did not prevent breaking it; a mechanical pass that re-derived every number did. **Do that pass.**

### 5.3 The structural problem worth raising with Sean
The entire SWA-169 program — plan, reviews, both prior handoffs — lives on `wip/comms-notifications-2026-07-05`, which **cannot merge** (SWA-79 boot-breaker). Work there never reaches `main`. Rule 83 had to be added on `main` precisely because the wip branch's CLAUDE.md is 9 rules behind and would have collided. Someone should decide whether the program's docs get cherry-picked to `main`, or whether SWA-79 gets fixed. Raise it; do not act unilaterally.

### 5.4 Loose ends deliberately untouched
- **16 learning packets sit untracked** in `docs/ai-workflow/hermes-learning-packets/` — parallel-session files, not mine to sweep, but the durable corpus is meant to be committed.
- `c:/tmp/aat-verify-1` and the `feat/handoff-skill` worktree at `c:/tmp/ss-handoff-skill` — deletable.
- Quant-drop check, judge calibration, and rollback: all three are required by doctrine and **have never been executed**. Until judge calibration runs, every judge verdict in the program — including S2a's — is unvalidated.

---

## 6. PASTE-READY AGENT PROMPT

> You are picking up SwanStudios work mid-program. Read `docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-17-C.md` fully — it is written for someone with zero context.
>
> **First, load the `handoff` skill** (`.claude/skills/handoff/SKILL.md`, Rule 83). Your session will also end in a transfer; the chain breaks if you skip this.
>
> **Branch discipline, critical:** `main` deploys to Render. The SWA-169 fine-tuning program lives on `wip/comms-notifications-2026-07-05`, which **cannot merge** (SWA-79 boot-breaker) — never merge it, and never assume work there reaches production. For SWA-169 context read Handoffs A and B on that branch (§4 and §7 of A carry the marathon laws and environment gotchas), plus the BINDING Revision R1 block in `docs/ai-workflow/brainstorms/qwen-two-brains-finetune-plan-2026-08-16.md`.
>
> **Verify, don't trust.** Stale-check every live claim before acting. A prior handoff in this program shipped three wrong live-state claims; the one you are reading shipped a wrong row count until a verification pass caught it. Re-derive numbers from live commands — never inherit them.
>
> **Standing laws.** Proof-before-done: no "done/fixed/passing" without current-session reproducible evidence in the same message. Dry-loop: hostile rounds until one finds nothing, then one more confirming round. Every hostile panel fires THREE reviewers — GLM (`consult-glm.mjs`, $0), Kimi (`consult-kimi.mjs`, **PAID — ask Sean before any new review campaign**), and local Qwen (`consult-qwen.mjs`, $0, never the lead). Regression tests assert the **defeat condition** — mutate the code back and watch the test die before calling it proof. Batch-push: commit per slice, push once at the end.
>
> **Your work, in order:**
> 1. **Live-verify and wire the context-watch gate** (handoff §3 Task 1). It is built and 15/15 tested but deliberately unwired. Read the debug notes — the likeliest fix is one line, copying `dual-tier-gate.mjs`'s direct-invocation guard. Acceptance criteria are in the handoff. Sean specifically asked for a hook because prose in CLAUDE.md "isn't firing" — do not hand him another gate that does not fire.
> 2. **Write `SC0-A-BASELINE-EXPERIMENT.md`** (§3 Task 2) — mirror the existing Track C protocol including a pre-registered kill criterion. Run the unscored half now; the scored half waits on Sean's ideals.
> 3. **Ship the deterministic guard layer standalone** (§3 Task 3) — inference-time filter from the existing validators; zero training required.
> 4. **S2b** (§3 Task 4) — fix warmup/accumulation so a training result is interpretable.
>
> **Hard guardrails:** Render deploys from `main` only. Child data never leaves the teacher's device — classroom training data is synthetic-only and everything built against the provisional contract is disposable. Sean authors all safety and voice eval ideals personally; never generate them. Track C's SC1/SC2 stay blocked. Stopping Hermes' brain for GPU work requires Sean's awareness, and you restore it afterward.
>
> **Close** with the house gates: dual-tier summary (plain English first), dry-loop ledger, Linear sync to SWA-169, Hermes memo. Report blockers first, evidence always.
