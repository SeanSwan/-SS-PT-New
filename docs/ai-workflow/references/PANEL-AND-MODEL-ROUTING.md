---
decision: Hostile review runs as a 6-seat panel (Sol Pro + Kimi K3 + GLM 5.3 + Qwen 3.8 + Grok 4.6 + Fable); the half-price ":batch" OpenRouter listings are rejected for interactive review
status: shipped
supersedes: none
---

# Hostile-Review Panel & OpenRouter Model Routing

**Established 2026-08-18 by Sean.** One command fires the whole hostile-review
panel; Fable synthesizes. This doc is the routing truth — pricing here was read
from the live OpenRouter catalog, not from memory.

## The panel

| Seat | Model ID | Billing | Gate |
|---|---|---|---|
| sol | `openai/gpt-5.6-sol-pro` | OpenRouter $2.50/M in · $15/M out | `--confirm-spend` |
| kimi | `moonshotai/kimi-k3` | OpenRouter $3.00/M in · $15/M out | `--confirm-spend` + own $3 cap + **one review per topic** |
| glm | `glm-5.3` (Z.ai coding plan) | subscription — no per-token cost | none (burns plan credit) |
| qwen | `qwen3.8:27b-mtp-q4_K_M` (local Ollama, 5090) | $0, fully private | none — standing directive: in every panel, never the lead |
| grok | `x-ai/grok-4.6` | OpenRouter $2.00/M in · $6.00/M out (cache read $0.50/M, 500K ctx) | `--confirm-spend` |
| **fable** | **claude-fable-5 (me)** | — | **Final Decider — reads all five, arbitrates, owns the verdict** |

grok added 2026-08-20 by Sean's directive, on the authority of the rule-12
repeal (constitution PR #54, `chore/rule12-grok-repeal`). It is the **cheapest
paid seat** — a typical ~20k-in / 6k-out review packet costs ~$0.076, vs
~$0.14 for Sol Pro and ~$0.15 for Kimi. If PR #54 is ever reverted, retire
`scripts/consult-grok.mjs` and this seat with it.

```bash
# plan + cost estimate only, nothing sent
node scripts/consult-panel.mjs --document <packet.md> --dry-run

# free seats only (GLM + Qwen) — runs immediately, $0
node scripts/consult-panel.mjs --document <packet.md> --seats glm,qwen

# full panel, paid seats included (needs Sean's OK — Rule 16)
node scripts/consult-panel.mjs --document <packet.md> --confirm-spend
```

Default without `--confirm-spend`: free seats run, paid seats are **skipped with a
notice** and the INDEX marks the panel INCOMPLETE. The spend gate protects money
only — making free seats demand it would train the reflex of typing
`--confirm-spend` by habit, which is how a real spend gate stops working.

All seats get the **same remit with a fixed output contract** (VERDICT / BLOCKERS /
ATTACKS / HIGHEST RISK / CONFIDENCE). That is what makes replies comparable —
without it the panel returns four essays that can't be diffed and
consensus-detection degrades to vibes.

## The local Qwen seat has a second, opt-in model (abliterated)

**Added 2026-09-02 by Sean's directive: "make that an option where I can drop
down and pick it, but it won't be the default."**

`scripts/consult-qwen.mjs` resolves `--model` through a small alias map. The
default is unchanged and remains the stock model.

| Alias | Resolves to | Refusals |
|---|---|---|
| `default` (implicit) | `qwen3.8:27b-mtp-q4_K_M` | intact |
| `uncensored` | `hf.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF:Q4_K_M` | 98/100 -> 12/100 |

A short local tag `qwen3.8-uncensored:latest` was created with `ollama cp` so the model reads cleanly in any UI that enumerates Ollama models. It shares blobs with the HF tag, so it costs zero extra disk. The alias map deliberately points at the **HF path**, not this short tag, because the HF path is reproducible from a fresh `ollama pull` on any machine while the short tag is local-only.

Any raw Ollama tag still passes through unchanged, so nothing that worked before
this change stopped working.

```bash
node scripts/consult-qwen.mjs --document <packet.md>                       # stock, default
node scripts/consult-qwen.mjs --document <packet.md> --model uncensored    # opt-in
```

### What the abliterated build actually is

Produced with **Heretic**, which co-minimises refusal count against KL divergence
from the base model — no hand-written refusal-stripping code, no fine-tuning, no
extra training data. The LoRA was merged at bf16 before quantisation. Apache 2.0,
inherited from base Qwen3.8-27B. Q4_K_M fused-with-MTP is 16.8 GB, essentially the
same footprint as the stock 4-bit build, so it costs no extra VRAM on the 5090.

Capability deltas **as published on the model card**:

| Benchmark | Base | Abliterated | Delta |
|---|---|---|---|
| MMLU | 83.4 | 83.3 | -0.1 |
| ARC-Challenge | 58.9 | 57.7 | -1.2 |
| HellaSwag | 82.8 | 82.9 | +0.1 |
| Winogrande | 76.1 | 75.3 | -0.8 |

### The gap in those numbers — read this before trusting the seat

Those four are **not** the benchmarks abliteration is known to damage. The
comparative literature finds mathematical reasoning the most sensitive class,
with GSM8K the usual casualty, and reports TruthfulQA falling about 7 points
when a refusal direction is removed. **Neither GSM8K nor TruthfulQA appears on
this model card.** The published set is therefore the friendliest available
reading, not a neutral one, and the two most load-bearing numbers are absent.

Treat the deltas above as vendor-reported and unverified here. If this seat is
ever promoted beyond advisory use, the gate is a local GSM8K and TruthfulQA run
against both builds — not the card.

### Standing limits on the uncensored alias

- **Never the default.** The stock model stays the implicit choice.
- **Never a panel seat.** Do not add it to `scripts/lib/panel-seats.mjs`. A
  refusal-stripped model's verdict is not a peer review, and a panel that
  silently contains one is no longer the panel it reports itself to be.
- **Never write access.** Advisory, read-only output. Abliteration removes the
  refusals that catch a bad instruction before it runs, so it must not reach a
  path that can write to the repo, the database, or a shell.
- The seat prints a warning banner to stderr whenever the alias is selected, so
  an abliterated run is never mistaken for a stock one in a log.

## The ":batch" trap — why the cheaper listing is NOT the better buy

OpenRouter lists two entries per GPT-5.6 tier. Sean spotted the price gap and
asked for the cheaper one. Verified answer:

| Listing | In / Out per 1M | Transport |
|---|---|---|
| `openai/gpt-5.6-sol-pro` | $2.50 / $15.00 | synchronous `/chat/completions` |
| `openai/gpt-5.6-sol-pro:batch` | **$1.25 / $7.50** (exactly 50% off) | **async Batch API, 24-hour window** |

The discount is real and it is the *same model*. But `:batch` is served by a
different API — `POST /api/beta/batches`, then poll `GET /api/beta/batches/:id`,
status `validating → in_progress → finalizing → completed`, with a 24-hour
completion window. It is **not reachable from a synchronous chat call**, so it
cannot drop into the consult scripts.

**The economics kill it anyway.** A typical review packet is ~20k in / 8k out:

- standard: 20k×$2.50/M + 8k×$15/M ≈ **$0.17**
- batch: ≈ **$0.085**

**Savings: about nine cents, in exchange for up to a day of latency.** For
interactive hostile review that trade is strictly bad. Revisit `:batch` only for
a large queued overnight sweep where turnaround genuinely doesn't matter.

## Sol vs Sol Pro (the other pair that looks like a price difference)

`openai/gpt-5.6-sol` and `openai/gpt-5.6-sol-pro` are the **same weights at the
same price** ($2.50/$15). Pro is served with `reasoning.mode: pro` for higher
quality on complex tasks. There is no reason to review on the weaker tier —
`consult-panel.mjs` pins the sol seat to `-pro` via `SWAN_SOL_MODEL`.

Watch the context override: prompts **over 272k tokens** bill at roughly double
the headline rate. Large packets are not linearly priced.

## Drift caught while verifying this

`consult-sol.mjs` hardcoded `$5/M in, $30/M out` — **exactly 2× the real rate**.
Every cost line that script printed before 2026-08-18 overstated spend by double.
Fixed. Lesson: catalog pricing is live data, not a constant to be committed once
and trusted forever. Re-check before quoting cost:

```bash
curl -s https://openrouter.ai/api/v1/models | grep -A2 'gpt-5.6-sol'
```

## Standing rules that still govern

- **Rule 16** — paid seats need Sean's explicit per-run OK.
- **Kimi = ONE review per topic.** A second call on the same topic needs a fresh yes.
- **Rule 30** — a seat's finding is a HYPOTHESIS until verified against real code.
  Never relay a seat's verdict to Sean as fact.
- **Rule 8/44/59** — packets carry IDs and roles only. No PII, no keys. The panel
  script never reads or prints an API key; each seat loads its own.
- **Rule 46** — Fable is the Final Decider. The five seats are advisory input.
