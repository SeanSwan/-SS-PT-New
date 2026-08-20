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
