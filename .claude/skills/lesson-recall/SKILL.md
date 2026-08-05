---
name: lesson-recall
description: Catches the highest-signal failure mode there is — repeating a lesson you already learned and wrote down, in the same session. Fires on every build-shaped turn via scripts/hooks/lesson-recall-gate.mjs, and names the two shapes that keep recurring: the HALF-FIXED RULE (a rule enforced at one layer when it must hold at several) and the DUPLICATED VALUE (a constant or calculation declared in one place that two layers must agree on). Use when fixing a defect class, adding a guard/validation/cap, introducing a constant, or whenever the closeout is about to claim a class is closed.
---

# Lesson Recall — stop repeating your own written-down lessons

> **Origin (Sean, 2026-08-04).** A store/checkout audit ran 35 hostile rounds. In the final
> pass, **two of five mistakes were repeats of lessons recorded earlier in that same audit** —
> written down, committed, and then re-committed as fresh defects hours later. Sean: *"we need
> to turn this into a skill that fires that looks out for this issue so we do not keep making
> the same mistake."*
>
> This is not a memory problem. The lessons were written down. It is a **recall-at-the-moment-of-
> writing-code** problem, and prose cannot fix it — CLAUDE.md rule 57 already records why: *"a
> duty enforced only by the model remembering is a duty that will eventually be dropped."*
> Hence a hook.

## The two shapes (both drawn from real repeats, not invented)

### Shape 1 — THE HALF-FIXED RULE
**You fix the first surface a defect appears on and call the class closed.**

Real instances from one audit:
- Cancel-recovery deep link fixed on `StoreV3`; `StoreV2` (the live lazy-fallback store) still
  had the dead link. Round 7.
- "Never show a buyer a raw transport error" fixed on checkout and the post-payment screen —
  then found again in the cart panel (round 15), then again on the store page itself (round 16).
  **Three rounds for one class.**
- A quantity cap enforced at the cart routes but **not** at checkout, so a pre-existing
  oversized row still reached Stripe. **This one repeated the lesson after it was written up.**

**The tell:** you added a guard, validation, cap, filter, redaction, or refusal — in exactly
one file.

**The discipline:** *before committing, enumerate every layer that must enforce the rule.*
Write the list down. A rule that must hold at N layers is not fixed until all N enforce it, or
until you have said in the commit why the others are exempt.

### Shape 2 — THE DUPLICATED VALUE
**You declare a value or calculation in one place that two layers must agree on.**

Real instances from the same audit:
- Displayed cart total vs charged Stripe total — two independent implementations that disagreed
  on malformed quantity: `quantity: 0` showed **$0.00** and charged **$175.00**. Round 24.
- Cart session count vs granted session count — two implementations; a package could render as
  *"$8,400 for 0 sessions."* Round 25.
- Then, hours later, `MAX_CART_ITEM_QUANTITY = 99` declared inside a single route file — which
  would have forced a second copy the moment the checkout layer enforced it.
  **The same defect class, reintroduced by the person removing it.**

**The tell:** a new named constant with a literal value, or a second function computing
something the system already computes elsewhere.

**The discipline:** *a value two layers must agree on belongs in one shared module the first
time — not after the second consumer appears.* Duplicated values always diverge; the only
question is when and how expensively.

## Procedure (run before any commit that closes a defect class)

1. **Recall.** Read the lessons already recorded *this session* — Hermes memos in
   `.ai-workflow/hermes-inbox/pending/`, and this branch's commit subjects. The gate prints
   them for you. **This step exists because the lessons were already written and still repeated.**
2. **Enumerate enforcement points.** For the rule you just implemented, list every layer that
   must hold it: route handlers, the service, the checkout/commit boundary, the UI, the DB
   constraint. Name them explicitly in the commit body.
3. **Grep for siblings.** Search the repo for the symbol, error code, or literal you introduced.
   Anything that appears elsewhere is a candidate enforcement point you have not covered.
4. **Check for a second home.** If you introduced a constant or a calculation, ask: does any
   other layer need to agree with it? If yes, it goes in a shared module **now**.
5. **State the scope honestly in the commit.** Either "enforced at all N layers: …" or
   "enforced at layer X only, because …". Silence reads as "all of them" and is how a half-fix
   ships looking complete.

## What the hook does

`scripts/hooks/lesson-recall-gate.mjs` (Stop, deterministic, fail-open):

- **Always, on build-shaped turns:** prints the lessons this session already recorded, so recall
  is forced at the moment of closeout rather than left to memory.
- **BLOCKS on high-confidence Shape 2:** a new `const NAME = <literal>` whose identifier already
  exists elsewhere in the repo bound to the same literal — i.e. a value that now lives in two
  places. The message names both locations.
- **WARNS on Shape 1:** a new refusal/guard (`res.status(4xx)` with a new error code, or a new
  `throw`) added in exactly one file, when sibling files reference the same symbol.

It fails open on any internal error — a broken gate must never wedge a session — and it never
blocks a docs-only turn.

## Escape hatch

If a duplicate or single-layer fix is genuinely correct, say so in the closeout:

```
LESSON-RECALL: N/A — <why this is not a repeat>
```

Use it honestly. "It's fine" is not a reason; "the second layer is exempt because X validates
upstream and is covered by test Y" is.

## Relationship to the other gates

- **dry-loop-gate** proves a hostile loop ran. This proves the loop's *lessons were applied*.
- **hermes-closeout-gate** captures mistakes after the fact. This tries to prevent the repeat
  before the commit.
- **closeout-evidence-lock** proves the work. This asks whether the work is *complete across
  layers* — the difference between "the bug is fixed" and "the class is closed."
