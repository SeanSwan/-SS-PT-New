---
title: A metric's dominant term can be blind to the question it adjudicates
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist.
date: 2026-08-20
decision: when a falsifiable acceptance test returns fail, decompose the metric before accepting OR overturning the verdict — and report both the verdict and the decomposition without redefining the bar you just failed
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: builder and measurer
    did: built a fourth world kernel against a pre-existing falsifiable acceptance test; measured it twice at n=24 on real hardware; reported FAIL against the stated bar; then decomposed the metric and found its dominant term structurally incapable of measuring the property under test; declined to restate the bar in the friendlier terms it had just discovered
    cost: subscription (flat)
skills_touched:
  - id: src/worlds/kernels/pelagos/kernel.ts
    change: created
    failure: three existing kernels were measured as ~one grammar, and no amount of parameter variation inside them could widen it — only a structurally different machine could
  - id: kernel liveness guard (headroom assertion)
    change: amended
    failure: the guard asserted a literal source string, "(1.0 - energy)", which is one design's spelling of boundedness — unsatisfiable by construction for a kernel that does not accumulate, so it would have blocked any non-feedback kernel forever
---

## What happened

A prior session measured that worlds from different kernels were only ~11% more
distant from each other than worlds from the *same* kernel, concluded the three
kernels were "one family with three accents", and wrote a falsifiable bar for
what would count as a genuinely new one: **beat the within-kernel mean by ≥50%
against every existing kernel.**

I built a kernel designed to break the two things the incumbents shared — no
history, and a horizon — and measured it. **It failed the bar: 1.07, 1.11, 1.07
against a required 1.5.**

Then I split the metric, and the failure turned out to be mostly the ruler.

## Who did what

**claude-opus-5** built and measured. The judgement that mattered was made
*after* the negative result: instead of accepting a clean number, I asked whether
the instrument could see the property at all — the same discipline that caught
four false negatives earlier in the same session, applied for once to a result
that was not obviously suspicious.

The decomposition: the descriptor is 36 colour dimensions at full weight against
16 orientation and 12 motion at 0.6. Measured separately, at n=24, twice:

| pair | structure | colour |
|---|---|---|
| incumbent × incumbent (×3) | 0.92 – 1.02 | 1.11 – 1.16 |
| new kernel × incumbent (×3) | **1.50 – 1.87** | **1.00 – 1.04** |

Colour separates *nothing* — because colour comes from a shared palette
generator that is identical for every kernel. It is kernel-blind by
construction, it is nearly half the metric at full weight, and it drags 1.85
down to 1.07.

## Skills created or changed

The liveness guard is the more transferable of the two. It asserted that every
kernel's source contained the literal string `(1.0 - energy)` — the admission
term of a shader that accumulates into its own previous frame. As a proxy for
"energy is bounded" it worked perfectly for three years' worth of one design, and
it was **unsatisfiable by construction** for the first kernel that did not
accumulate. A guard written against one implementation's spelling does not
generalise, and its failure mode is not a caught regression — it is a veto on
the only kind of change that could have helped.

Re-anchored to assert the property (bounded by headroom *or* by an explicit
clamp) rather than the spelling. Disclosed as a RE-ANCHOR, not a silenced check.

## Mistakes I made

- **My own new test failed on first run for the dumbest possible reason.** It
  checked whether a kernel's fragment contained `sampleField(` to prove it never
  reads the previous frame — but the shared prelude *defines* `sampleField` for
  every kernel, so the string is present in all of them. I was searching the
  whole fragment when I meant the kernel body. Caught by the test itself before
  any claim was made, which is the only reason it costs a line here instead of a
  retraction.
- **I nearly reported a clean negative without interrogating it.** The first
  measurement was a tidy 1.04–1.16 against a bar of 1.5 and I had a screenshot
  showing an obviously different image. I had to consciously stop and ask which
  of those two things was lying. The habit that saved it was built earlier the
  same day, on cheaper mistakes.

## Error → fix → repeat ledger

| error class | recurrences this session | previously written up? | what actually stopped it |
|---|---|---|---|
| Test asserts an implementation's spelling rather than its property | 1 (inherited guard) + 1 (my own, first run) | No | Writing the assertion against the narrowest correct scope, and letting the first run be the check |
| Believed a negative from an unvalidated instrument | 0 this slice — interrogated instead | Yes, twice, by me | Asking "can this ruler measure this property" as a standing step after any measured verdict |

The second row is the first time this class has gone to zero in a slice. What
changed is that the check moved from "be careful" to a fixed step performed after
every measurement, regardless of whether the result looked suspicious.

## The transferable finding

A falsifiable acceptance test is a large improvement on taste, and this program
was right to write one. But a metric is made of terms, and **a term that cannot
vary with the property under test does not merely add noise — it actively
compresses the signal toward the null.** Here, half the ruler measured palette,
palette is generated identically for every kernel, and so the more the metric was
dominated by colour the more every kernel looked like every other kernel *no
matter how different they were*.

That has a second consequence worth stating plainly: **the original 11% finding
was measured with the same conflation.** The decomposition confirms its
conclusion far more sharply than the original number did — on structure alone the
three incumbents score 0.92–1.02× against each other, at or *below* the
within-kernel baseline, which is a stronger statement than "11% apart". But the
number that was quoted, and the threshold derived from it, were both partly
measuring the palette system.

The discipline that follows:

1. **When a falsifiable test returns fail, decompose the metric before accepting
   the verdict — and equally before overturning it.** A pass deserves the same
   treatment; nobody audits a metric that agreed with them.
2. **Do not restate the bar in the friendlier terms you discovered by failing
   it.** That is the classic Goodhart move and it is indistinguishable, from the
   outside, from moving the goalposts. Report the verdict as it stands, report
   the decomposition beside it, and let the owner decide whether the metric
   changes. I reported FAIL.
3. **Ask what a metric's dominant term is a function of.** If the answer does not
   include the thing being adjudicated, the metric cannot adjudicate it, and the
   size of the term tells you how badly.

## External-model calibration

No paid model consulted. Routing note: this was a case where **the decisive
instrument was arithmetic on data I already had** — the split took one function
and no new samples. A reviewer model shown the failing number and the screenshot
would most likely have argued about whether the kernel looked different enough,
which is precisely the taste argument the falsifiable bar existed to replace.
