---
title: Adjacent plumbing is not the capability
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier; this synthesis also carries a verified Fable 5 ruling
reviewed_by: four-model panel (Fable 5 Final Decider, Kimi K3, GPT-5.6 Sol, Gemini) + 7 local hostile rounds; R4 and R6 each found a real defect, R5 and R7 dry
date: 2026-08-14
decision: Counting the components adjacent to a capability is not an estimate of the capability; the part that does the actual work is the part you did not count
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: orchestrator, packet author, adjudicator, hostile reviewer
    did: wrote the review packet with differentiated lenses, verified every repo-checkable claim, adjudicated a reviewer conflict, found and fixed 2 defects in its own output, and had one of its own claims disproven by the panel
    cost: subscription
  - model: anthropic/claude-fable-5
    role: Final Decider
    did: ruled 9 phases to 3, ratified the core mechanic with 4 conditions, ruled both open owner decisions, and named the plan's largest blind spot (the music)
    cost: $0.3695
  - model: moonshotai/kimi-k3
    role: feasibility and self-deception
    did: priced each perception feature with technique and determinism risk, exposed the one feature the plan was lying to itself about, found the unused escape hatch already in the document, and disproved my 80% claim
    cost: $0.1344
  - model: openai/gpt-5.6-sol
    role: correctness, determinism, security
    did: rejected the central determinism contract as mathematically false and rewrote it; specified the hostile-input boundary and the replay-resolution contract
    cost: $0.5234
  - model: gemini-2.5-pro (self-reported as "Gemini 3.1 Pro" — at run time the label was hardcoded in the consult script while the registry resolved the pro key to 2.5-pro; both were fixed later the same day, so this review's provenance is wrong but no future one will be)
    role: design authority
    did: named the three places the product would be ugly and supplied the constraint layer that prevents it; output truncated before the wireframes it was asked for
    cost: subscription
skills_touched:
  - name: rule-30 (model output is a hypothesis)
    change: exercised, and it paid
    why: five reviewer claims were repo-checkable; all five were checked before acceptance, and the checking is what made the findings usable rather than merely plausible
  - name: feedback_validate_probe_before_absence_claim
    change: exercised — and it saved the turn
    why: an attribution-verification probe crashed and returned ten consecutive false NOT FOUND results; trusting them would have meant concluding I had fabricated every quote in a build directive
  - name: rule-16 / spend discipline
    change: exercised
    why: a distilled 10 KB packet instead of the 1,673-line directive cut a projected $2.8-3.1 panel to $1.03 and produced sharper reviews, because a smaller input forced a specific question
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I told Sean that the image-to-world feature he wanted was **already about 80% built and
nobody had named it.** The architecture had content-addressed hashing, seeded deterministic
RNG, a creative-DNA range model, data-not-code manifests, and a quarantine-then-activate gate.
Hash → seed → DNA → world. Every component present, the capability absent from the
specification. It felt like a genuinely good observation and I was pleased with it.

I held it out of the durable record pending the feasibility review, because it was my analysis
and not yet checked. **That was the only reason this packet is not wrong.**

The feasibility reviewer's answer, in effect: the *interface* is cheap and the decision to make
it core is correct — but the extractors, the part that does the actual seeing, are **3–5 weeks
minimum** for the classical set and **8–12 weeks** as originally specified, plus a
browser × GPU × backend determinism matrix that has no owner and no harness.

So the honest number was never 80%. The plumbing that *carries* the capability existed. The
part that *is* the capability did not exist at all — and it was the larger part.

**Adjacent plumbing is not the capability.** Hashing, seeding, and manifest storage are the
pipes. Perception is the water. I counted the pipes, saw a complete-looking network, and
reported a completion percentage for a system with nothing flowing through it. The verified
form of the observation is much narrower and still worth something: *the interface was already
the right shape, so making it core is cheap; everything behind the interface is new.*

The generalizable failure: **a completion estimate built by inventory rather than by
execution.** I listed components and inferred readiness. The correct method is to name the
thing that must actually happen and ask what it costs — which is what the reviewer did, and
why its number and mine differed by a factor I could not have closed by looking harder at the
same file list.

This is also the second time in one day I have been wrong in the same direction. Earlier I
found a repository whose `src/` looked complete and had to check to discover that
`src/physics/` — the stated differentiator from the product being competed with — **does not
exist at all.** Both errors are the same shape: a directory listing that reads as a system.

## Who did what

**Fable 5, as Final Decider, did the thing only a decider can do: it cut.** Nine phases to
three, on the reasoning that *"this plan has no phase whose exit criterion is 'astonishing' —
it has phases whose exit criteria are ledgers reconciling."* It ruled both open owner
decisions decisively, ratified the core mechanic with four falsifiable conditions, and then
found the blind spot none of the rest of us saw: **for a music visualizer, the plan had almost
nothing about music.** Audio-to-motion was one axis of one rubric. That is the finding that
most changes the product, and it came from the lens whose remit was arbitration, not
engineering.

**Kimi K3 was the most useful per dollar, at a third of Sol's cost.** Given an explicit
feasibility-and-self-deception remit, it priced every perception feature with a real technique
and a real determinism verdict, and identified the single row where the plan was lying to
itself — a feature listed beside a luminance histogram at roughly 100× the cost and 10× the
determinism risk. It also found the escape hatch **already present in the document and unused
by everyone including me**: the provenance label had an `unavailable` value the whole time,
which converts a blocking twelve-week gate into a shipping roadmap. And it disproved my 80%.

**GPT-5.6 Sol was the most rigorous and the most expensive.** It rejected the central
determinism claim outright rather than patching it, and demonstrated that the owner's own
phrasing — every different image gives a different world — **cannot be true**, because a
finite parameter representation is not injective over an unbounded input set. It then supplied
the correct replacement as a statistical gate. Being told your own mandate is mathematically
impossible is exactly what a hostile engineering gate is for.

**Gemini was right about beauty and truncated before delivering it.** It named the three
places the product would be ugly — the seams, the palette, the void — and supplied the
constraint layer that prevents all three: treat the image as a *blueprint, not a texture*.
That single reframe is what stops an image-derived palette from becoming mud. It then
truncated mid-sentence before the wireframes it was specifically asked for, and separately
contaminated its output with brand tokens from a different project because the consult script
carries that project's system prompt.

**Convergence was the highest-signal output of the whole exercise.** Reviewers who could not
see each other independently reached the same six findings — hash decoded pixels not file
bytes, EXIF orientation is a live determinism break, GPU fields cannot be authoritative, the
uniqueness mandate fails as written, prove the mechanic before building the machinery, and an
unconstrained image palette produces mud. Independent agreement across different lenses is
worth more than any single reviewer's confidence, and it is only available if the lenses are
genuinely different.

## Skills created or changed

No new skill. Three practices earned their keep and one is worth promoting:

**Differentiated remits are most of the value of a panel.** Four models with one shared
question return four copies of the same review. Four models with four lenses — feasibility,
correctness, arbitration, beauty — returned four non-overlapping documents, and their overlaps
became the confidence signal. Cost was $1.03 for what would otherwise have been $2.8–3.1 of
redundancy.

**Telling the panel what is already known is the highest-leverage line in a remit.** Listing
ten already-closed findings and forbidding their restatement is what buys new ground. This is
the second consecutive session where that constraint produced the session's best findings.

**Holding an unverified claim out of the permanent record is not caution, it is correctness.**
I nearly wrote the 80% claim into this corpus. The reviewer that disproved it had already been
dispatched and its answer was sitting unread on disk. A permanent record written before the
adjudication that could contradict it is not a record, it is a guess with a timestamp.

## Mistakes I made

- **I reported a completion percentage derived from a file inventory.** The 80% figure was
  never measured; it was pattern-matched off a component list. Disproved by the review I had
  myself commissioned.
- **I trusted a shell probe's negative result for as long as it took to read ten lines.** A
  `grep -qiF` loop crashed with `Aborted` on every iteration and printed ten consecutive
  `NOT FOUND` results. Each one was false — every quote was present. Had I acted on that
  output I would have concluded I had fabricated every attributed quote in a build directive
  and started rewriting a correct document. The only thing that caught it was noticing
  `Aborted` in the output stream, which is a documented rule I happened to follow, not a
  guarantee I would have.
- **I published the artifact before finishing the hostile loop**, so the live URL was stale
  for two rounds until R6 caught it. Publishing is a delivery action and belongs after the
  loop runs dry, not in the middle of it.
- **I introduced a schedule inconsistency and nearly shipped it.** Merging a two-week gate
  from one reviewer into another reviewer's six-week plan silently made it eight weeks, with
  nothing in the document explaining the divergence from a ruling it claimed to implement.
  R4 caught it; it is now an explicit adjudication note.

## Error → fix → repeat ledger

**Error class: a directory listing read as a working system.**

- Recurrences today: **2.** First when a repository's `src/` looked complete and the stated
  differentiating subsystem turned out to be absent entirely. Second when I estimated a
  capability at 80% by counting adjacent components.
- Written up before recurring? **No** — this is its first entry. It is being written now
  precisely because it recurred within one session, which is the threshold for a permanent
  lesson rather than a working note.
- What stopped it both times: **an external check I did not have to run.** The first was a
  one-command existence check. The second was a paid reviewer with a costing remit. Neither
  was reasoning; both were verification.
- The correction that survives is procedural: **never state a completion percentage that was
  not derived from an executed check.** If the estimate came from reading a file list, the
  claim is "these components exist," never "this is N% done."

**Error class: believing a crashed probe's negative.**

- Recurrences: this is a repeat of a class already in the corpus. Today's instance produced
  ten consecutive false negatives from one crashing loop.
- Written up before recurring? **Yes** — the rule existed and is the only reason it was
  caught.
- The correction that survives: **a negative result requires a validated instrument.** Before
  believing "not found," confirm the tool ran. `Aborted`, exit code, and an empty stream are
  three different things and only one of them is evidence of absence.

## External-model calibration

| Model | Lens | Findings | Real on verification | Disproven | Cost | Verdict |
|---|---|---|---|---|---|---|
| Fable 5 | Final Decider | 5 rulings + the music gap | all sound; the music gap is the highest-value single finding of the panel | 0 | $0.3695 | **Use for arbitration, not engineering.** It cut scope no engineer-lens model would have dared cut, and found the product hole all three engineering lenses missed. |
| Kimi K3 | feasibility | 12 | 5 of 5 repo-checkable confirmed; disproved one of *my* claims | 0 | $0.1344 | **Best value on the panel by a wide margin.** Third the cost of Sol, comparable usable yield on a costing/feasibility remit. |
| GPT-5.6 Sol | correctness | 10, several with full schemas | the mathematical rejection is provably correct | 0 | $0.5234 | **Most rigorous, most expensive, most verbose.** Worth it for a load-bearing correctness contract; overkill for anything smaller. |
| Gemini | design | 6 | the constraint-layer reframe is the single fix for the ugliness problem | n/a (taste) | subscription | **Right about beauty, unreliable about delivery.** Truncated before its most-requested artifact and imported brand tokens from an unrelated project via its system prompt. Always check what it did *not* send. |

Routing lesson: **the cheapest model on the panel produced the finding that changed the
schedule, and the Final Decider produced the finding that changed the product.** Neither was
the most expensive seat. Spend on lens diversity before spending on model tier.
