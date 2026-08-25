---
name: every-layer-deferred-to-another-layers-placeholder
date: 2026-08-25
originating_model: claude-opus-5
tier: fable
surface: frontend/UniversalMasterSchedule + backend/services/sessions + backend/utils/cancellationPricing
commits: 896e20c5d, 9eed46fa2, 81746e740, 505220436, 3f4f753d3
models_used:
  - model: claude-opus-5
    role: auditor, builder, panel orchestrator, hostile reviewer
    did: five commits of pricing hardening; built both review packets; produced every defect listed below
    cost: subscription
  - model: tencent/hy3
    role: hostile review seat
    did: found the P0 that ran through the middle of four commits - the isFallback hole - which no other seat saw
    cost: $0.0055
  - model: moonshotai/kimi-k3
    role: hostile review seat
    did: duration-blindness - the server override does not know 30 vs 60 min in a two-rate business; deepest architectural finding
    cost: $0.1502
  - model: glm-5.3
    role: hostile review seat
    did: connection-pool livelock from calling a DB helper inside a transaction without passing it; client-cancel-default question
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile review seat (standing)
    did: audit-trail gap on the silent clamp; caught prospect-facing copy arithmetic (48 sessions is not "four per week for three months")
    cost: $0.0000
  - model: qwen3.8 (local)
    role: hostile review seat (standing, free)
    did: directionally correct on the fetch-window and placeholder retention
    cost: $0
  - model: deepseek/deepseek-v4-pro
    role: hostile review seat
    did: nothing - 502 mid-stream, empty output
    cost: $0.0000
skills_touched:
  - id: fail-closed design
    change: sharpened
    failure: a gate whose success condition was "HTTP 200 with a body" rather than "the server says this is real"
  - id: rule-26 / packet construction
    change: reinforced-positively
    failure: round 1 misled a panel with a dead file; round 2 led with a mount walk and no seat repeated it
---

# Every layer deferred to another layer's placeholder

## The lesson

Four commits of "fail-closed pricing" work had a hole running straight through
the middle of them, and each layer's guard is why.

`getClientPackagePricing` cannot always find a client's package. When it can't it
returns its own hardcoded figure **and flags it honestly**:
`{ pricePerSession: 175, isFallback: true }`. The endpoint passes that flag
through to the client. Then:

- the **frontend gate** cleared `pricingUnavailable` on any `success && data` —
  it never read `isFallback`, so it presented the placeholder as the client's
  real package price
- the **backend override** *did* read `isFallback`, and on seeing it, early-returned
  and left the caller's number alone — deferring to whatever the frontend sent

Each layer had a guard. Each guard was individually defensible. The frontend
assumed a 200 meant data; the backend assumed the frontend had sent something
verified. The placeholder walked through both and was persisted as a real charge
for any client without a completed order.

**The generalisable shape: when two layers each handle "unknown" by deferring to
the other, "unknown" has no handler at all.** Neither code review nor the tests
caught it, because every layer read correctly *in isolation*. It took a reviewer
holding both ends at once.

The narrower and equally reusable form: **a 200 carrying a placeholder is not
data.** A success gate must key on what the payload *says about itself*, not on
the transport status. The response literally contained a field named `isFallback`
and the gate ignored it.

## The second lesson: the packet is the panel

Round 1 of this review cost ~$0.07 and every seat's headline finding was wrong,
because I pasted an unmounted route file into the packet as server truth.

Round 2 cost ~$0.16. I opened it with a verified mount walk, an explicit
canonical-vs-legacy classification table, and a blunt warning that the previous
panel had been misled. **No seat repeated the error**, several said the
classification let them skip straight to real analysis, and the round produced a
P0, an architectural defect, and an infrastructure risk that were all real.

Same models. Same money. The only variable that changed was the quality of the
evidence I supplied. **A panel's output quality is bounded above by its packet,
and orchestrators control the packet entirely** — which makes packet
construction, not seat selection, the highest-leverage thing in a paid review.

## Who did what

**claude-opus-5** produced all five commits and every defect below. The pattern
across two rounds is consistent: I build a guard that is correct in the layer I
am looking at, and wrong about what the adjacent layer does.

**HY3** ($0.0055) found the P0 alone. Five other seats — including two more
expensive ones and one that had already reviewed this workstream — missed it.
That is the single strongest argument in the corpus for panel *breadth* over
panel *cost*: the cheapest seat found the thing that invalidated four commits.

**Kimi K3** ($0.1502) produced the deepest architectural finding: the server
override I added is duration-blind, and the business has two rates. A $110
30-min client cancelling a 60-min session derives the wrong number in either
direction. It correctly named this "the same defect class, moved server-side" —
i.e. my fix reproduced the bug it was fixing, one layer down. Earned its single
review.

**GLM 5.3** caught what nobody else did on infrastructure: calling
`getClientPackagePricing` inside an open transaction *without passing the
transaction*. Sequelize v6 has no CLS here, so it acquires a second pooled
connection while the first is held — under concurrent cancellations that is
pool-exhaustion livelock. Also asked the sharpest unanswered question: what
charge applies when a *client* cancels and `normalizeCancellationBillingOptions`
returns null?

**Ox Alpha** ($0) was consistent across both rounds — the audit-trail gap on the
silent clamp, and the only seat to check arithmetic in prospect-facing copy:
48 sessions is 12 weeks at four per week, not three months.

**DeepSeek V4 Pro** 502'd mid-stream and returned nothing. Recorded so the
routing table reflects reliability, not just price.

## Skills created or changed

No new skill. What changed is a design rule worth stating explicitly:

**A fail-closed gate must key on the payload's own honesty signal, not on
transport success.** If a helper is capable of returning a placeholder, every
consumer of that helper must read the flag that says so — and the flag must be
handled the same way at every layer, or the layers will defer to each other.

The gates that fired correctly again this round: heredoc-escape, lane-staged,
spend-guard (priced the panel before it ran), egress redaction.

## Mistakes I made

- Built a success gate on "HTTP 200 with a body" while the body carried a field
  explicitly saying the data was a placeholder.
- Respected `isFallback` on the backend and ignored it on the frontend, then
  never checked the two agreed.
- Called a DB helper inside an open transaction without passing the transaction.
- Clamped an operator's money decision in place with no record of what they
  actually asked for.
- Shipped a server-side rate override that does not know the session's duration,
  in a business with exactly two durations — reproducing the defect I was fixing.
- Wrote prospect-facing copy whose arithmetic did not hold.
- Asserted `creditRestored: true` to a client on server silence.
- Rendered currency without `toFixed(2)`.
- Half-applied a RE-ANCHOR again — fixed one assertion encoding a bug and left a
  sibling for the suite to catch. Third time this pattern has appeared.

## Error -> fix -> repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Layer assumes an adjacent layer validated something | 2 (isFallback both ends; backend deferring to frontend amount) | No — new class | An external reviewer holding both ends at once. No internal check would have found it. |
| Trusting an unvalidated instrument/file | 4 (earlier packet) | Yes — skill + memory + a packet written this same session | Still nothing procedural. Round 2 avoided it only because the *previous* failure was fresh enough to over-correct on. |
| Half-applied RE-ANCHOR | 3 across sessions | Yes | The test suite, every time. Never me. |
| `$$` eaten by String.replace | 2 | Yes (diagnosed this session) | Function replacers. Held this round — zero recurrences after the fix. |
| Silent money substitution | 3 variants (placeholder, clamp, duration) | Yes — it is this workstream's entire thesis | Panel review. I keep re-introducing the class I am actively fixing. |

The bottom row is the one to sit with. **This workstream exists to stop silent
money substitution, and I introduced three new variants of it while fixing it.**
Not from carelessness — each was a locally-reasonable choice (keep a fallback so
nothing crashes; clamp so nothing overcharges; derive server-side so nothing is
trusted). The through-line is that *every* silent default is the same bug wearing
a different hat, and "sensible default" is exactly what it looks like from
inside the layer that writes it.

The `$$` row is the good news and shows what a real fix looks like: root-caused
to a mechanism (`String.replace` treats `$$` as an escape), fixed with a
mechanism (function replacers), zero recurrences since. Compare the top row,
which has documentation and no mechanism, and recurs.

## External-model calibration

| Seat | Cost | Findings real on verification | Verdict |
|---|---|---|---|
| HY3 | $0.0055 | P0 ✅ (unique to it) | Extraordinary value. Add to the standing roster. |
| Kimi K3 | $0.1502 | duration-blindness ✅, comped-package edge ✅, toFixed ✅, creditRestored ✅ | Most findings-per-review of any paid seat. Worth its one-review budget. |
| GLM 5.3 | subscription | pool risk ✅, client-cancel-default ✅ (open), clamp audit ✅ | Best on systemic/infra reasoning. Free at the margin — always include. |
| Ox Alpha | $0.0000 | audit gap ✅, copy arithmetic ✅ | Consistent across two rounds at zero cost. Standing seat is correct. |
| Qwen 3.8 | $0 | directionally right, low specificity | Keep. Free, occasionally the only REJECT. |
| DeepSeek V4 Pro | $0.0000 | none — 502, empty | Unreliable this run. Do not count as coverage. |

**Round 1 ~$0.07, all headlines wrong (bad packet). Round 2 ~$0.16, three real
high-severity findings (good packet).** The routing lesson is not which seats to
buy — it is that spend on seats is wasted until the packet is verified, and that
the cheapest seat in the room found the finding that mattered most.
