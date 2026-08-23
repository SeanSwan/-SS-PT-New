---
name: spend-guard
description: Keeps paid-AI spend inside Sean's budget — a whole workstream costs $2-3, not $5. Carries the cumulative ledger, the two-ask approval rule, and the routing table that puts cheap and free seats first. Fires automatically as a PreToolUse hook on every consult-fable/sol/kimi/grok/panel call; load it when a call is blocked, when planning a review that will spend, or when Sean says "how much did that cost", "spend", "budget", "too expensive", "/spend-guard".
---

# Spend Guard

## Why this exists

One trainer-dashboard workstream (2026-08-21/22) cost **~$4.87**:

| Model | Calls | Spend |
|---|---|---|
| Fable 5 | 4 | **$3.47** |
| GPT-5.6 Sol Pro | 2 | $0.92 |
| Grok / Kimi / DeepSeek ×2 | 8 | ~$0.48 |

Sean: *"That is way too much... shouldn't cost me no more than two or three bucks
for that whole thing max. Three dollars is a lot for one call... I would be asked
twice before approving."*

**Two spend controls already existed and neither fired.** `--confirm-spend` on the
panel, and a `premium: true` opt-in on the Fable and Sol seats. Both are per-call
and both were satisfied. The most expensive single call was $0.97 — perfectly
reasonable. **Four reasonable calls in a row are what blew the budget.** A
per-call ceiling would have approved every one of them.

That is the entire design lesson: **the control has to be cumulative**, because
the failure mode is not one extravagant call, it is a sequence of defensible ones.

## The gate

`scripts/hooks/spend-guard-gate.mjs` runs as a **PreToolUse hook on Bash**. It
intercepts any `consult-fable|sol|kimi|grok|panel` invocation before it spends.
Not a rule the model has to remember — this session proved repeatedly that a
written rule gets skipped. Deterministic, or it is not a control.

It lives at the harness boundary rather than inside the consult scripts for two
reasons: the two priciest scripts were being edited by another agent (Rule 67),
and a gate inside the thing it gates is bypassed by calling the model another way.

### Caps

| Cap | Default | Env override |
|---|---|---|
| Per call | **$1.00** | `SWAN_SPEND_CAP_CALL` |
| Per topic (one workstream) | **$3.00** | `SWAN_SPEND_CAP_TOPIC` |
| Per day | **$5.00** | `SWAN_SPEND_CAP_DAY` |

"Topic" is derived from the `--document` / `--out` filename stem — the best
available proxy for "that whole thing".

Worst-case pricing is deliberately conservative (assumes a large input packet and
the full `--max-tokens`), so the number Sean is shown is never flattering. In
practice a normal Fable call estimates ~$1.66 against a real ~$0.90, which means
**every Fable call trips the gate**. That is intended: at ~$1 a call, three Fable
calls are the entire workstream budget.

### The two-ask rule

A breach is **refused on the first attempt**. The gate mints a single-use token
bound to that exact model+topic+cost and prints the itemised numbers.

1. **First ask** — blocked. Show Sean the numbers. Do NOT re-run on your own.
2. **Second ask** — only after Sean's explicit yes, re-run with
   `SWAN_SPEND_APPROVE=<token> <the same command>`.

One flag an agent can type becomes a reflex — that is exactly how
`--confirm-spend` stopped working. The token cannot be self-issued in a single
step, and the number is put in front of Sean twice.

Tokens are single-use. A reused token is refused and a fresh one minted.

## Before spending anything, try these first

| Seat | Cost | When |
|---|---|---|
| **Qwen 3.8** | **$0, local** | Always. Free forever (Sean 2026-08-17). Fire it in every panel. |
| **GLM 5.3** | subscription | Free at the margin. |
| **DeepSeek V4 Flash / Pro** | ~$0.00 / ~$0.01 | Cheapest paid seats; Pro has produced adopted findings. |
| **Grok 4.6** | ~$0.05–0.14 | Strong value; found a crux finding for five cents. |
| **Kimi K3** | ~$0.09 | ONE review per topic; a second needs a fresh yes. |
| **Sol Pro** | ~$0.40–0.52 | Premium. Ask first. |
| **Fable 5** | ~$0.62–0.97 | Premium, and the Final Decider. Ask first. |

**Observed twice now: cost does not predict value.** The $0.05 and $0.09 seats
produced adopted findings in the same round where the most expensive seat's
headline claim had to be walked back. Fable's value is in *arbitration* — run it
once, at the end, as the gate. Not as one more opinion.

## Rules of thumb that actually save money

1. **Fable once per workstream, at the end.** It ran four times in the incident
   above. Two of those were the same ruling redone because the seed diff was
   stale — check the packet contains the claimed changes *before* sending.
2. **Never re-run a paid call to fix your own input error** without telling Sean
   that is what it is. ~$0.92 of the $4.87 was exactly that.
3. **Cheap seats first, always.** Let them find what they can; reserve the
   expensive seat for what survives.
4. **One panel round, then fix, then one gate.** Not a paid round per iteration —
   the hostile loop between rounds is the model's own job, not a vendor's.
5. **Record real spend** with `recordSpend()` from `scripts/lib/spend-ledger.mjs`
   so the ledger reflects reality rather than estimates.

## Checking the damage

    node -e "import('./scripts/lib/spend-ledger.mjs').then(m=>{const l=m.readLedger();console.log('today $'+m.spentToday(l).toFixed(2));const t={};l.forEach(e=>t[e.topic]=(t[e.topic]||0)+e.usd);console.table(t)})"

Ledger: `.ai-workflow/spend/ledger.jsonl` — gitignored, machine-local, IDs and
costs only, never prompt content (Rules 8/44/59).

## When Sean asks for a number

Give the real one from the ledger, itemised per model, and say plainly what
portion was wasted on rework. Under-reporting the total by scoping it to the
current turn — which happened in the incident above — makes the budget decision
on bad data.
