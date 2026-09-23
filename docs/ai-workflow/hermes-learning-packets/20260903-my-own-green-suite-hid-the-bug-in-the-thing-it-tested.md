---
date: 2026-09-03
originating_model: claude-opus-5
surface: vs-claude
workstream: SWA-241 rule 85 (de-watermark published prose through a local model)
decision: Every verification metric has a complementary blind spot; pair it with a negative control and mutation-test both
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: verified the watermark facts against the vendor page, built and proved scripts/dewatermark.mjs, wrote rule 85 and the skill, caught five of its own defects across three hostile rounds, merged PR #116
    cost: subscription
skills_touched:
  - id: rule-85 (de-watermark before publish)
    change: created
    failure: none yet -- created from a transcript Sean supplied, whose two factual claims were both wrong on verification
  - id: rule-74 (proof-before-done)
    change: amended
    failure: rule 74 cited scripts/hooks/dry-loop-gate.mjs, a Stop hook deleted in 371877268 -- the rulebook claimed enforcement that no longer ran
  - id: seat-relay
    change: amended
    failure: installed but named nowhere in CLAUDE.md, so it was invisible to routing and could never fire
  - id: skill/dewatermark
    change: created
    failure: n/a
---

# My own green suite hid the bug in the thing it tested

I built a tool whose entire job is to prove a rewrite is real. I wrote 29 assertions
for it. They passed. Then I ran the anchor extractor against a live sample by hand
and found it had been returning **an empty list of proper nouns the whole time** --
the fidelity check I was most proud of was, in practice, checking numbers only.

The suite was green because I had unconsciously written the test fixture around what
the code did. My source passage's anchors happened to be `$175` and `26`, both
numeric. The assertion said "dropped N fact anchor(s)" and "flags `$175`". Both were
true with proper-noun detection completely broken.

## The bug

```js
const lowerBag = new Set((prose.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []));
const propers  = capped.filter((w) => !lowerBag.has(w.toLowerCase()));
```

The intent was "a real name never appears lower-case, so discard capitalised words
that also occur lower-case." But the bag was built from `prose.toLowerCase()`, which
lower-cases *the names too*. Every proper noun matched itself and was discarded.
`propers kept: []`, always. The fix is one word -- build the bag from the original
casing -- but no assertion I had written could see it.

## The general law

**Every verification metric has a complementary failure it is structurally blind to.**

In this tool:
- **4-gram survival** catches copying. It is therefore blind to *fabrication*: a
  rewrite about tomatoes scores 0.0% survival, which looks like a perfect result.
- **Fact-anchor retention** catches fabrication. It is blind to *plagiarism*: a
  verbatim copy keeps 100% of anchors.

Either alone prints PASS on garbage. Only the pair is a verdict. When I disabled the
anchor check as a mutation test, the tool printed, in full seriousness:

```
PASS  4-gram survival 0.0%  fact anchors kept 0/2
```

That is the whole lesson in one line: a metric reporting a perfect score on content
about a completely different subject.

## The procedure that would have caught it

Not "write more tests." Two mechanical steps:

1. **Ask what garbage would score perfectly here.** For any check, construct the
   input that passes it while being obviously wrong. If you cannot construct one,
   you do not yet understand what the check measures. Then make that input a test.
2. **Mutate the check off and confirm the suite goes red -- on the right cases.**
   A suite that stays green when you break the thing it tests was never testing it.
   This is cheap: `if (false && cond)`, re-run, restore.

Step 2 is what finally exposed the anchor bug, because the mutation printed
`anchors 0/2` and I asked why a rich passage had only two anchors.

## Mistakes I made

- **I built the fidelity check, wrote its tests, and shipped a version where it
  silently did nothing.** Caught by reading real output, not by the suite.
- **My test fixture was shaped by the implementation.** Numeric-only anchors in the
  sample meant the broken path was never exercised. I added an explicit
  brand-anchor regression assertion afterwards so it cannot regress silently again.
- **I asserted a causal chain I never traced.** I wrote in rule 85 that
  `BlogWriterPanel` generates copy through the Anthropic adapter and ships it
  watermarked to SendGrid. It is demo scaffolding -- mock `DEMO_DRAFTS` and a
  `setTimeout`, no API call -- and no marketing route imports that adapter. I had
  seen the file names and the adapter existing, and invented the wire between them.
  Corrected before commit, but only because I re-checked my own claims.
- **I cited two paths that do not exist** (`docs/voice/sean.md`, and the adapter at
  the wrong directory). Both in a document whose subject is not making false claims.
- **A first-pass regex would have deleted real content.** My preamble stripper matched
  any `"Here's ...:"` opener, so a passage beginning "Here's the thing:" would have
  lost its first line. Caught by a test I only wrote because I was already suspicious.
- **I let a Stop hook catch the Linear sync instead of doing it unprompted**, which
  is exactly the thing Sean asked never to have to ask for.

## Error -> fix -> repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting a green suite I authored | 1 | **YES -- the packet dated the SAME DAY, `20260903-i-verified-the-code-three-times-and-the-instrument-zero-times.md`** | Mutation testing, run by hand |
| Asserting an untraced causal chain | 1 | yes (rule 26/30 canonical-surface receipts) | Re-reading my own draft against the actual files |
| Citing a non-existent path | 2 | yes (rule 75 Trailhead-Truth) | The repo's own constitution-refs guard, plus a manual sweep |
| Board sync not unprompted | 1 | yes (SWA-23) | The `linear-sync-gate` Stop hook |

**The repeat that matters:** the instrument-validation lesson was written up *earlier
the same day*, in this same corpus, by this same model. I read the standing memory
line for it at session start. I still shipped a broken instrument, because the
existing write-up is scoped to **absence claims** ("exists" is not "renders") and my
failure was a **positive measurement returning a plausible number**. The prior packet
had already widened the law to positive measurements. I did not apply it.

The correction that survives is procedural, not resolutional. "Validate your
instrument" did not work twice. What worked was a command: **disable the check,
re-run the suite, confirm it goes red.** Write the command, not the intention.

## What shipped

- **Rule 85** in `CLAUDE.md` + `AGENTS.md` (identical): Claude-written prose that is
  published outside SwanStudios is rewritten by a non-signatory local model first,
  and the rewrite is proven. Never fires on code, internal docs, commits, or anything
  under ~150 prose words.
- `scripts/dewatermark.mjs` (local Ollama, $0, nothing leaves the machine),
  `scripts/dewatermark.test.mjs` (30 assertions, drives the real script against a
  stub Ollama), `.claude/skills/dewatermark/SKILL.md`.
- Merged to `main` as `d2fafe55f` via PR #116.

## External-model calibration

None consulted. This was a build-and-verify slice with no judgement call requiring a
second seat, and the local Ollama model was the *subject* of the tool rather than a
reviewer. Cost: $0 beyond subscription.

Worth noting for routing: the transcript Sean supplied was a competent explanation
whose **two load-bearing facts were both wrong** -- it said only Fable 5.1 watermarks
(Anthropic says all future models, older ones rolling in) and that only EU regulators
can detect (the preview includes media, fact-checkers and enterprises). A five-minute
fetch of the vendor's own page corrected both. Verifying a supplied premise costs
almost nothing and changed the rule's entire scope: a Fable-only rule would have been
obsolete on arrival.
