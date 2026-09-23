---
lesson: "An oracle that shares a predicate with the gate it feeds is not evidence — it is the gate agreeing with itself. Check the provenance of your measurement, not just its result."
originating_model: claude-opus-5
date: 2026-08-26
surface: vs-claude
linear: SWA-211
status: durable
models_used:
  - model: claude-opus-5
    role: builder + first hostile pass
    did: "Built a two-dialect recipe parser, an equivalence selftest, and a resolver for a grammar ambiguity. Found 3 real defects in its own work. Also authored the circular resolver, a test that cannot fail, and a docstring guarantee the code does not have."
    cost: subscription
  - model: claude-fable-5
    role: independent hostile review (hand-driven by owner)
    did: "Found the resolver was circular with the gate it feeds — the round's most important finding. Also: an unread author gloss that answered the question outright, a 4th and 5th reading the resolver is architecturally blind to, and the 3rd self-asserting fixture."
    cost: subscription
  - model: gpt-5.6-sol
    role: independent hostile review (hand-driven by owner)
    did: "Independently re-derived the arithmetic against the spec and found the tool enforced UNION where the grammar states SUM — changing the result from 6 buildable to 7. Also: full-consumption failures, comments-as-geometry, a crash where the docstring promised a refusal."
    cost: subscription
  - model: z-ai/glm-5.3
    role: free panel seat
    did: "Named the oracle-is-under-test circularity one layer up (count oracle authored by the party it judges). Found the third reading and the fixture's axis-order blindness."
    cost: subscription
  - model: z-ai/glm-5.3-flash
    role: free panel seat (A/B against glm-5.3, same packet)
    did: "Caught a wrong counting formula already shipped to the roster author, the n=2-against-33%-corrupt-labels argument, unbounded expansion, and drifted spec text. 2.5x faster, comparable hit rate."
    cost: ~$0.0015
skills_touched:
  - id: rule-73 (Proof-Before-Done)
    change: reinforced
    failure: "Reported '6 of 18 buildable' with running-command evidence. The command ran and the number was still wrong, because the tool measured under a convention the spec does not use. Executing the instrument is not the same as validating it."
  - id: feedback_ox_alpha_always_in_panel
    change: retired
    failure: "Ox Alpha and GLM were treated as two seats for weeks. OpenRouter revealed Ox WAS GLM-5.3 Flash. Every 'both seats independently converged' conclusion was one lab twice."
  - id: proposed — fixture-reference rule
    change: proposed
    failure: "Third self-asserting test this session, the second written immediately after writing the prose rule against them. Prose did not hold it. Proposed mechanical form: a fixture must reference the symbol under test by name, or it is not a fixture."
---

# An oracle that shares a predicate with its gate is not evidence

## The lesson

A grammar had an ambiguity: a rule could be applied by the author when writing or by the reader when
parsing, and the two produce different geometry. I needed to determine which.

**First attempt:** decide from each creature's declared cell count. **Rejected on review** — and
correctly — because that count is produced by the same author whose counts the very same document
proves wrong on a third of the roster. The oracle was authored by the party under judgement.

**Second attempt:** decide from structure instead. Pick the reading under which fewest creatures
shatter into disconnected pieces. This felt principled: connectivity is a property of the geometry,
not of anyone's arithmetic. I shipped it, wrote a long commit message about why the first oracle was
untrustworthy, and reported the verdict as reached "on evidence that survives every declared count
being wrong."

**Fable's finding:** `len(components) > 1` — the shatter predicate — **is the identical predicate the
gate refuses on.** So the resolver does not select the reading the author meant. It selects the
reading under which the fewest creatures get rejected. It maximises assets-shipped and calls the
result semantics.

I had moved the circularity, not removed it. Version one let the author grade the author. Version two
let the tool grade the tool. Both times I was reasoning explicitly about circularity while
introducing it.

## Why it generalises

The failure is not about parsers. It is about **where a measurement comes from**. Three questions
that would have caught it, none of which I asked:

1. **Who produced this signal?** If the answer is "the thing being judged" or "the thing doing the
   judging," it is not independent evidence.
2. **What would this measurement say if the answer were the other one?** A structural score with a
   built-in prior — z-lifts break contact far more often than they create it — cannot distinguish
   "the author meant OFF" from "OFF looks better under any roster."
3. **Is there someone who simply knows?** The roster's author is a callable seat. Three independent
   reviewers each said, unprompted, that asking beats inferring. I was running statistics on a
   question with a person attached to it.

## Who did what

**Fable found the composition error.** Every local step in my resolver was defensible; the
composition was wrong. That is the class of defect a builder's own tests structurally cannot reach,
because the tests are written from inside the same composition. It also found that the answer was
written in a parenthetical in the file I had open — *"(validator-visible asymmetry)"* — pointing to
the reading opposite the one I concluded.

**Sol found the arithmetic error by recomputing rather than reviewing.** The grammar states
`cells = Σ(dx·dy·dz)`; my tool counted a deduplicated set. It re-derived the buildable set
independently and got 7 where I reported 6. **Reviewers who recompute find different defects than
reviewers who read.** Both are needed.

**GLM named the circularity one layer up** and I acted on it — then reproduced it one layer down.
Acting on a finding is not the same as understanding its class.

**GLM-Flash caught an error already in flight**: a counting formula I had written into the brief
being sent back to the roster author, which would have manufactured the next round of exactly the
defect I was complaining about.

**I was wrong twice in the direction of my own competence.** Both errors came from building a clever
instrument where a question would have done.

## Skills created or changed

- **Rule 73 (Proof-Before-Done) reinforced, not amended.** I had current-session proof: the command
  ran, printed 6, and reproduced. The proof was real and the number was wrong, because I proved the
  tool's behaviour rather than the tool's correctness. **Running the instrument is not validating
  it.** Rule 73's existing "validate the instrument before believing a negative" already covers
  this; what was missing was applying it to a *positive* result.
- **`feedback_ox_alpha_always_in_panel` retired.** Two panel seats were the same lab. Independence
  must be checked by *provider*, not by seat name.
- **Proposed: the fixture-reference rule.** A test fixture must reference the symbol under test by
  name. `check("the fixture pins axis order", len({3,2,1}), 3)` names a requirement and tests
  nothing. Prose against self-asserting tests did not hold — I violated it in the same pass that
  wrote it.

## Mistakes I made

- Enforced a counting convention the spec does not state, then reported two creatures as
  self-contradictory when the tool was the one contradicting.
- Built the circular resolver while writing paragraphs about circularity.
- Wrote a test that cannot fail, minutes after documenting that tests must not do that. Third
  instance in one session.
- Claimed three readings were exhaustive; there are at least five, and two are invisible to the
  instrument I chose.
- Shipped a docstring guarantee — "one malformed block is never fatal" — that a one-line input
  falsifies with an uncaught `ValueError`.
- Declared a semantic question empirical without reading the sentence in the source that answers it.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| A suite defends the builder's assumption, not the requirement | 3 | **Yes — twice** | Nothing yet. Prose failed. A mechanical rule (fixture must name the symbol under test) is proposed, unimplemented. |
| Reasoning about a flaw while reproducing it one layer down | 2 | Yes, in the same commit message | Named here as a class; unfixed |
| A number typed rather than measured | 2 | Yes | `len(RAN)` — mechanical, held |
| A mutation script reporting success without verifying the mutation | 2 | Yes | Asserting the anchor exists before writing — held on the second attempt |
| Reading my own echo as evidence a command ran | 1 | Yes (session-prior) | Checking the tool's output, not the shell's |

**The highest-signal row is the first.** It was documented twice and recurred twice after
documentation, which proves the write-up was not the fix. Every correction that survived in this
session was mechanical — a counter, an assertion, a regex. Every correction that failed was a
resolution to be careful.

## External-model calibration

| Seat | Provider | Blockers raised | Verified real | Unique catch |
|---|---|---|---|---|
| Fable | Anthropic | 4 | 4 | Resolver/gate circularity; the unread author gloss |
| Sol (GPT-5.6) | OpenAI | 5 | 5 | Sum-vs-union — changed the result |
| GLM 5.3 | Z.AI | 7 findings | 6 | Third reading; axis-order blindness |
| GLM 5.3 Flash | Z.AI | 8 findings | 7 | Formula already in flight to the author |
| Opus 5 (self) | Anthropic | 3 | 3 | Zero-extent silent vanish |

**Routing conclusion:** for structural critique of a *design*, Fable. For independent re-derivation
of a *result*, Sol. For volume review at speed, Flash over GLM 5.3 — comparable hit rate, 2.5×
faster, materially cheaper. Two Z.AI tiers never corroborate each other; independence is a property
of the provider, not the seat name.
