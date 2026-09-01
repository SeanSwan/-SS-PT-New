---
name: spend-guard
description: Keeps paid-AI spend inside Sean's budget — a whole workstream costs $2-3, not $5. Carries the cumulative ledger, the two-ask approval rule, and the routing table that puts cheap and free seats first. Fires automatically as a PreToolUse hook on ANY paid seat (every consult-* and forge-*, not a fixed list) and blocks any command shape it cannot attribute; load it when a call is blocked, when planning a review that will spend, or when Sean says "how much did that cost", "spend", "budget", "too expensive", "/spend-guard".
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

`scripts/hooks/spend-guard-gate.mjs` runs as a **PreToolUse hook on Bash**. Not a
rule the model has to remember — this session proved repeatedly that a written
rule gets skipped. Deterministic, or it is not a control.

**It does not match a list of seat names.** It used to — `consult-fable|sol|kimi|
grok|panel` — and that enumeration drifted in both directions at once: it priced
`consult-grok.mjs`, which does not exist, while four live scripts that read
`OPENROUTER_API_KEY` matched nothing at all. Now it **parses the command** and
recognises any `consult-*` / `forge-*` seat, with the roster policed by a coverage
contract (`spend-coverage.test.mjs`) that fails the day a credential-bearing
script is neither priced nor allowlisted.

**It fails CLOSED on anything it cannot attribute.** A runner in eval mode, an
unrecognised wrapper head, a shell nested past the recursion limit, a command
carrying control characters — each blocks as *unpriced*, with no token minted,
because nobody yet knows what it costs. Ten rounds of hostile review found roughly
thirty bypasses in the previous "match the text" design; the parser plus this
inversion is what replaced it.

Every command shape any round has found lives as an executable row in
`scripts/hooks/spend-shapes.test.mjs` — 60 that must block, 32 that must not, plus
a wrapper × body cross-product. Three pre-commit gates run it, the coverage
contract, and a seat-parity check on any commit touching `scripts/`.

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

Pricing **measures the real `--document`** rather than assuming a size, floored at
the old flat assumption so it can only ever raise a number. A plain Fable call
estimates **$1.06**; the same call on a 257 KB packet estimates **$1.46**. Before
this was measured, every call was priced at a flat 26k input tokens — on the
packets this system actually sends, that under-counted Sol by $0.20 a call, which
made the hold too small and the number Sean approved too low.

**Every Fable call trips the gate.** That is intended: at ~$1 a call, three Fable
calls are the entire workstream budget.

### The two-ask rule

A breach is **refused on the first attempt**. The gate prints the itemised numbers
to stderr and mints a single-use token bound to that exact model+topic+cost.

**The token is NOT in the output you can see.** It is written to
`.ai-workflow/spend/PENDING-SPEND-APPROVAL.txt`, deliberately — a PreToolUse
refusal is read by the AGENT, not by Sean, so printing the token made the second
ask something the agent could satisfy alone and the protocol bound nothing.

1. **First ask** — blocked. Show Sean the numbers. Do NOT re-run on your own.
2. **Second ask** — ask Sean to read the token back to you, then re-run as
   `SWAN_SPEND_APPROVE=<token> <the same command>`, with the assignment **leading
   the command**. It is read from the parsed environment, not from the text, so a
   token quoted inside an argument does not redeem.

You can open that file. This is **friction and an audit trail against an eager
agent, not a wall against a hostile one** — helping yourself to the key is the
exact move it exists to make visible.

One flag an agent can type becomes a reflex — that is exactly how
`--confirm-spend` stopped working. Tokens are single-use and bound to
model+topic+cost: a token minted for one document does not work on another, a
replay is refused as *already spent*, and a fresh one is minted for the new ask.

## Before spending anything, try these first

| Seat | Cost | When |
|---|---|---|
| **Qwen 3.8** | **$0, local** | Always. Free forever (Sean 2026-08-17). Fire it in every panel. |
| **GLM 5.3** | subscription | Free at the margin. |
| **DeepSeek V4 Flash / Pro** | ~$0.00 / ~$0.01 | Cheapest paid seats; Pro has produced adopted findings. |
| **Grok 4.6** | ~$0.05–0.15 | Strong value; found a crux finding for five cents. |
| **Kimi K3** | ~$0.09–0.32 | ONE review per topic; a second needs a fresh yes. |
| **Sol** | ~$0.40–0.61 | Premium. Ask first. |
| **Fable 5** | ~$0.62–1.06 | Premium, and the Final Decider. Ask first. |

Costs above are *observed real spend*; the gate's pre-call **estimate** is higher
by design and rises with document size. Sol's row was corrected 2026-08-27: the
gate had priced it at half the rate its own provider record carries, and two price
tables disagreed by 2× with nothing comparing them. A cross-table test now does.

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

    node scripts/spend-report.mjs

**Not a `node -e` one-liner.** The command this section used to recommend was
exactly that, and the gate now **blocks its own documentation**: a runner in eval
mode whose body names a `.mjs` path is an execution the parser cannot attribute,
so it refuses rather than guessing. Verified — the doc's own command exits 2.

That is the fail-closed rule working as designed and costing a false block, which
is the trade it was chosen for. The fix is a real file, which is also what this
repo's standing rule already says: content with quoting or escapes does not travel
through a shell.

Ledger: `.ai-workflow/spend/ledger.jsonl` — gitignored, machine-local, IDs and
costs only, never prompt content (Rules 8/44/59).

## When Sean asks for a number

Give the real one from the ledger, itemised per model, and say plainly what
portion was wasted on rework. Under-reporting the total by scoping it to the
current turn — which happened in the incident above — makes the budget decision
on bad data.
