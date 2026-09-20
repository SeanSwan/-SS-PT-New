# 10 — Astra consult: what it costs, and what it is worth

- **Date:** 2026-09-17 · **Question answered:** *"give me an idea how many credits an astra review would take on this"*
- **Status:** the cost model is [VERIFIED] against this repo's own routing doc and harness code; the token volumes are [ESTIMATE] with the arithmetic shown so you can check it.

---

## 1. The short answer

**Astra costs you $0 in credits.** It does not draw on a credit balance at all —
it rides the **Codex $200/month 20x subscription**, and the only thing it
consumes is **plan usage**, which is metered as a rate limit and a rolling
window, not as a dollar or credit figure.

So the honest answer to "how many credits" is: **none — but it is currently
blocked by the plan's usage limit, and the limit resets 2026-09-19 22:12.**

What you actually spend on this call is **≈ 75k tokens of plan usage** in one
shot (see §3), against a 20x seat. That is the number that matters, because it
is the number that determines whether the call succeeds or bounces.

| Fact | Value | Evidence |
|---|---|---|
| Billing model | Codex **$200/mo, 20x usage** — flat rate | `PROVIDER-SUBSCRIPTION-ROUTING.md` §"The stack", Astra row [VERIFIED, Sean-stated tier math: $100 tier = 5x] |
| Metered per-token cost | **$0** — no metered fallback in the harness | `consult-codex.mjs` header: *"Local, read-only harness around the authenticated Codex CLI. This file has no .env loader, network client, or metered fallback."* [VERIFIED] |
| Current blocker | **Seat usage-limited until 2026-09-19 22:12** | Direct provider response, recorded in 09 §3 [VERIFIED 2026-09-17] |
| Spend-guard gate | **Does not fire on Codex** — the gate intercepts only `consult-fable\|sol\|kimi\|grok\|muse\|panel` | `scripts/hooks/spend-guard-gate.mjs:73` INVOCATION regex [VERIFIED] |
| Cost of the failed attempt | **$0 and ~0 plan usage** — died at flag-parse, before any provider call | 09 §3 [VERIFIED] |

---

## 2. Why "credits" is the wrong unit here, but the concern is right

Three separate things get casually called "credits" in this repo, and conflating
them is how the ~$100 OpenAI API overrun happened (per the routing doc's
non-negotiable #1):

1. **Codex plan usage** — what Astra burns. Flat-rate; shows up as a rate limit
   ("try again Sep 19th"), never as a bill. **This is the one that applies.**
2. **GLM coding-plan credit** — Z.ai's meter (2,000/5h, 10,000/wk for scripted
   seats). Applies to the GLM review lane, not Astra.
3. **OpenRouter dollars** — per-token money. Applies to HY4, Kimi, Fable, Sol.
   **Does not apply to Astra.**

The failed attempt cost nothing because it never reached a model. The **re-fire
will** consume real plan usage, and that is the thing to size correctly.

---

## 3. The size of one Astra review on THIS packet — the arithmetic

The single authorized call sends a 6-file packet. Measured inputs:

| Component | Chars | Est. tokens (÷4) |
|---|---|---|
| `00-consult-brief.md` | 10,984 | 2,746 |
| `README.md` | 3,385 | 846 |
| `01-requirements.md` | 7,825 | 1,956 |
| `02-blueprint.md` | 9,951 | 2,488 |
| `05-contracts.md` | 6,931 | 1,733 |
| `09-hostile-review.md` | 5,686 | 1,422 |
| **Files subtotal** | **44,762** | **11,191** |
| Prompt + protocol wrapper | — | ~500 |
| **Total input** | | **≈ 11,700 tokens** |

[ESTIMATE — the packets are read from disk; the ÷4 ratio is the repo's own
working heuristic, and `consult-codex.mjs` caps a single file at 60,000 chars and
the whole diff at 200,000, so this packet is comfortably inside the harness's
own limits. VERIFIED: no file in the set is truncated.]

Output side. The v3.1 footer caps a consult at **≤8,000 output tokens** and
**≤600 s**, one in flight (`PROVIDER-SUBSCRIPTION-ROUTING.md` §Recovery rules
[VERIFIED]). A Mega-Blueprints adjudication is a long document, so assume it uses
most of that ceiling rather than a chat-length reply:

| Output assumption | Tokens |
|---|---|
| Typical adjudication | ~4,000 |
| At the v3.1 cap | 8,000 |

**One Astra review on this packet ≈ 11,700 in + ~4,000–8,000 out ≈ 16k–20k
tokens of plan usage.** Round it up and call it **~20k per pass.**

### What that means against the seat

The 20x seat's limit is a rolling window, not a per-day byte meter — which is why
the failure mode you actually hit was a *time* refusal ("try again Sep 19th"),
not a truncation. The practical read:

- **One review is cheap in plan terms.** ~20k tokens is a normal-sized Codex turn;
  this is not a heavy ask for a 20x seat.
- **The pending call is ONE call, not a panel.** The existing packet is built as a
  single adjudication pass. It cannot run away into four calls unless someone
  deliberately fires four — which is exactly the per-call-vs-cumulative lesson
  the spend guard was written for, and why the "exactly one, no auto-retry"
  discipline is recorded in 09 §3.
- **If it were metered (it is not),** the same call at Sol Pro's $2.50/M in /
  $15/M out would be ≈ $0.03 in + $0.06–0.12 out ≈ **$0.09–0.15**. That is the
  number to keep in your head as the "what it would have cost on an API" figure.
  It is not what you pay.

---

## 4. What you get for it — and whether it is worth firing

The one authorized call is an **architecture adjudication**, not a review of the
code. Its remit is to accept, reject, or rewrite the seed decisions **D1–D9** in
02 §5 — `raw three.js` vs `@react-three/fiber`, zero-dep `node:http` bridge vs
Vite middleware, polling vs SSE for run progress, the v1 command scope, token
mode, the standalone shell, the in-repo home, the embed contract, and the
constellation's idle-motion budget.

**My honest recommendation: fire it, but fire it at the right moment.**

- The three.js slice (**S5**, now CD3-shaped) is the one place where an Astra
  overturn would cost real rework — it is the only slice whose design the
  adjudication could plausibly change.
- Everything before S5 (S0–S4) is direction-independent by construction. S0 is
  already built and green. So an adjudication landing *after* S0–S4 and *before*
  S5 gets you the maximum decision value for the minimum rework risk.
- The seat resets **2026-09-19 22:12**. Firing before then is guaranteed to
  bounce and burn the one authorized attempt on a rate-limit error. **Do not
  fire early.**

### The window, stated plainly

| When | What happens |
|---|---|
| Now → 2026-09-19 22:12 | Seat refuses. Firing wastes the authorized attempt on a limit error. |
| After 2026-09-19 22:12 | Fire the single call — harness is already repaired and pinned (10/10 in `swan-council-subscription.test.mjs`). |
| Any time | S0–S4 are not blocked by this. Only S5 waits on it. |

---

## 5. The gap this leaves right now, and how it is covered

Because the Astra seat is both **flag-blocked** (now repaired) and
**usage-limited** (until Sep 19), this packet's seed decisions currently carry
**no independent adjudication**. The rule-46 unavailability fallback applies, and
the honest state is recorded rather than papered over:

- 09 §1 carries the builder's own hostile pass (H1–H10).
- The **HY4 independent review** now stands in as the external lens on S0
  (verdict recorded in `11-hy4-review.md`). HY4 is a *different* model family
  from the builder, which is the property that makes its findings worth
  something — per this repo's own recorded lesson, a builder's tests encode the
  builder's assumptions. It returned **REVISE** with 7 findings, all now closed;
  it also cost **$0.056**, which is the real price of an independent lens on this
  packet today.
- **D1–D9 remain recommendations, not adjudications.** Any slice that touches a
  D-decision before Astra lands is doing so on the builder's judgment, and should
  say so in its receipt.

---

## 6. If you ever DO want a metered second opinion on the architecture

For completeness, since the question "how many credits" usually means "what does
this cost me somewhere":

| Seat | Billing | Cost on this 6-file packet (~11.7k in, ~6k out) |
|---|---|---|
| **Astra (gpt-6-astra)** | Codex 20x subscription | **$0 metered**; ~20k plan tokens |
| HY4 (`tencent/hy4-preview`) | OpenRouter | **≈ $0.056 measured on this packet** (11 §1: one $0 transport failure + one $0.0563 billed call) |
| DeepSeek V4.1 Flash | Metred API, $5/mo cap | ≈ $0.002–0.004 |
| Kimi K3 | OpenRouter | ≈ $0.13 |
| Sol Pro | OpenRouter | ≈ $0.12 |
| Fable 5 | OpenRouter | ≈ $0.42 |

[HY4 and Fable figures grounded in this repo's `.ai-workflow/spend/ledger.jsonl`;
others are the panel registry's own `inPerM`/`outPerM` rates applied to the same
token volume.]

**The useful ordering:** Astra is free-at-the-margin and the architecture
authority, so it goes first once unblocked. HY4 is the cheap independent lens for
catching what a builder's tests structurally cannot. Nobody needs Fable on this
until there is a genuine disagreement to arbitrate — Fable's value is
*arbitration*, not one more opinion.
