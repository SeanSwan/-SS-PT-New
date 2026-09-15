---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: "Four times in one session I shipped a fix whose proof could not have failed. Every one was caught by a different vantage, never by re-reading. The fix is procedural: prove on the shape least like the one you developed against."
models_used:
  - model: claude-opus-5
    role: builder, self-reviewer, handoff author
    did: repaved a rotted doctrine corpus (25 dangling refs, 4 index-law breaches, 4 orphans, 20 wrong-target pointers), built a six-class structural gate, ran 14 dry-loop rounds, and produced every defect in this packet
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile reviewer, three rounds
    did: found the original rot; then found that the fix committed the sin it existed to purge; then found the fixes-to-the-fix introduced worse bugs than they closed. Verdicts merge-with-fixes twice
    cost: flat-rate Z.ai coding plan
skills_touched:
  - id: verification-before-completion
    change: proposed-amendment
    failure: four separate "proven by injection" claims were true and worthless — each test used an input shape on which the bug was invisible by construction
  - id: check-brain-links.mjs
    change: created
    failure: a canon rewrite renumbered §1-28 to §1-17 and no satellite followed; 25 refs dangled for weeks, invisible to reading and to two generations of hand grep
  - id: closeout-evidence-lock
    change: proposed-amendment
    failure: a PROOF line can cite a passing test that could never have failed; proof of execution is not proof of coverage
---

# Prove it on the shape least like the one you built against

## The lesson

Four times in one session I fixed a real bug, wrote a test that demonstrated the fix, watched it pass, and shipped a defect. Not because the tests were sloppy — each one exercised the exact mechanism I had changed. Because each one used **the input shape I had been developing against**, and on that shape the remaining bug was invisible by construction.

The clearest case: I re-keyed a lookup table from basename to full path. D4 still looked it up by basename. Every file in a subdirectory silently got nothing back; one file silently got a *different file's* data. I then "re-proved all four defect classes by injection" — using a **root-level file**, where `basename(path) === path` and the two keying schemes are identical.

**The test could not have failed.** It was not a weak test. It was a test of the wrong shape, and no amount of care applied to it would have surfaced anything.

The others were the same move in different clothes:

- Bounded a denial-of-service on dash-ranges (`§§1–99999` → 99,982 findings), tested dash-ranges, shipped with **comma-chains still unbounded**.
- Widened a filename→section separator from "whitespace only" to a three-character wildcard, tested the backtick form, shipped **one character too narrow** for `` `design.md` — §9 ``.
- "Proved" the orphan check by injecting a row pointing at a file deleted outright — **the class that had never happened** — while the class that had happened twice in this repo was explicitly exempted by code I wrote in the same commit.

## Why re-reading never caught it

Not one of the four was found by me reviewing my own work. Every one was found either by an external hostile reviewer or by a dry-loop round that changed **vantage** — ran from a different directory, used adversarial rather than valid input, read the comparisons instead of executing them, checked a subdirectory instead of a root file.

That is the empirically load-bearing part of the dry-loop discipline, and it is not the repetition. Re-reading your own work re-runs the same mental model that produced the gap, on the same examples that fit it. **A second pass with the same vantage is the first pass with more confidence.**

## The procedure

When you have fixed something and are about to prove it:

1. **Name the shape you developed against.** Root file. Valid input. Lower-case name. Dash separator. The happy example that was in your head.
2. **Prove it on the shape least like that.** Subdirectory. Hostile input. Capitalised. The separator you did not think of. If your fix is about a map, test the key that differs from the value; if it is about a bound, test past the bound; if it is about a class of thing, test the member you would never write yourself.
3. **Ask what input would make this test pass while the bug survives.** If you can name one in under thirty seconds, that input is the test.

The question that would have caught all four: *"is there an input where my new code and my old code do the same thing?"* — because that is exactly where a root-level file, a dash-only range, and an all-lower-case corpus all sit.

## The corollary that cost the most

**A count is a property of the instrument, not of the world.** My count of dangling references in an unchanged corpus went 10 → 16 → 25 as the tool improved. Every published figure was confident, cited, and low — and each one propagated into commit messages and a tracker before the next revision exposed it.

So "build the counter before you quote the count" was insufficient advice, because I built it and improved it three times while leaving stale figures behind. The full rule needs the second clause: **when the instrument changes, re-measure and correct every figure it already produced.**

## Tests inherit their blind spots from their data

Three separate case-comparison bugs shipped green. Every one would break on the first capitalised filename; none did, because every file in the corpus is lower-case — and the fixtures share the coincidence. The suite could not distinguish "correct" from "correct by accident."

Reading the comparisons found all three in minutes. Running them would never have. **"Tests pass" is evidence about the inputs the tests contain, and silence about every input they don't.**

## Who did what

**Opus 5 (me)** built all of it and produced every defect in this packet — the four unfalsifiable proofs, three case bugs from one habit, a DoS introduced by my own fix, a repair that made a reference permanently unverifiable, and four instances of documentation drifting from the code it described.

**GLM-5.3** was the reason any of it surfaced. Three rounds: found the original rot; found that my fix had committed the exact sin it existed to purge (a doc claiming the gate caught a class the gate exempted); then found the fixes-to-the-fix carried worse bugs than they closed, including the unfalsifiable proof above. It also flagged one dangling reference in round 1 that **I dismissed** because my own grep was blind to it — it was right and my instrument was broken. Its one failure was the opposite kind: in round 1 it asserted a linter enforces canon. That linter does not exist, and the fiction would have licensed me to change button geometry across the app. **Trust its observations; verify its mechanisms.**

**Sean** interjected once, early, to ask whether uncommitted work existed. That question forced the check that revealed the working branch was ~1,948 commits stale and missing nine of the files under review. Without it the entire session would have audited a corpus that does not exist.

## Skills created or changed

- **`scripts/design-brain/check-brain-links.mjs` (created).** Six classes: dangling refs (canon and satellite-to-satellite, ranges expanded), files missing from the index, index rows pointing at retired or deleted docs, bare `§N` that resolves under no reading, citations of files that exist nowhere, and citations of atticked doctrine (with a dated baseline). Plus a startup self-check that refuses to run if the file emits a class its own header does not document — **which caught its author shipping an undocumented class within the hour.**
- **`verification-before-completion` (proposed amendment).** Should require naming the input shape the fix was developed against, and proving on a different one.
- **`closeout-evidence-lock` (proposed amendment).** A `PROOF:` line should distinguish *executed* from *capable of failing*. Mine cited passing tests four times over bugs those tests could not detect.

## Mistakes I made

- Four fixes shipped with proofs that could not have failed (root file, dash-only, backtick-only, wrong-defect-class).
- Wrote in a doc that the gate "now catches" a rot class that the code I wrote in the same commit specifically exempted — the branch committing the exact sin it existed to purge.
- Dismissed a correct external finding twice because an unvalidated grep returned nothing.
- Three case-comparison bugs from one habit, all green in tests.
- Published three different counts of one unchanged corpus, each propagated to commits and a tracker before correction.
- Documentation drifted from behaviour four times, including once *after* I built the mechanism meant to stop it — the mechanism read one file and the drift was in another, and I treated it as having closed the class.
- Bounded one DoS and left its sibling one separator over.
- Destroyed two of my own fixes with `git checkout --` during a probe; the gate caught it going CLEAN → FAIL.
- Burned four attempts on a code move by guessing line indices instead of searching by content.

## Error → fix → repeat ledger

| Error class | Times this session | Documented before it recurred? | What actually stopped it |
|---|---|---|---|
| **Proof scoped to the input shape I had in mind** | **4** | No — this packet is the first write-up | Only ever an external reviewer or a *different-vantage* dry-loop round. Never re-reading. Procedure above is the first attempt at a real fix. |
| Believing a negative from an unvalidated instrument | 5 | **Yes — twice, including a durable packet the same morning** | Positive controls, applied consistently only after the third occurrence. Two earlier write-ups did not stop it. |
| Documentation drifting from behaviour | 4 | n/a — discovered here | A startup self-check that fires on the author. Worked, within a scope narrower than I assumed. |
| Publishing a count from an unvalidated instrument | 3 | Partially — the morning packet named the lesson | Nothing. The missing clause is "re-measure when the instrument changes." |
| Normalising case ad hoc | 3 | No | Reading the comparisons rather than running them. |

**Row two is the warning.** That lesson was written up twice, once in a durable packet on the morning of the same day, and recurred three more times before the procedural form stuck. A lesson stated as a resolution ("be careful about negatives") does not survive; the one that survived was mechanical ("run a positive control before reporting any absence"). **Row one is now written up for the first time — watch whether the procedural form holds, and if it recurs a fourth time, it needs a hook and not another packet.**

## External-model calibration

**GLM-5.3 — Z.ai coding plan, flat-rate, four calls, ~$0 marginal.**

- **Observations: near-perfect.** Round 1: five verifiable design findings, 5/5 confirmed true against source. Rounds 2 and 3: ten and twelve ranked findings, nearly all real, with accurate per-finding grading of its own prior round — including correctly marking two of my fixes as only PARTIAL.
- **Causal attributions: one fabrication, in round 1, consequential.** It concluded a file was "dead letter" *because the lint enforces canon*. No such lint exists. That invented mechanism was precisely what would have licensed me to resolve a token conflict without the owner. Zero fabrications in rounds 2–3.
- **Operational:** both long reviews truncated at the 32k output cap with ~30k spent on reasoning. Round 3's packet demanded **tables before prose** and lost only prose. Do that by default.
- **Routing verdict:** excellent for corpus-scale hostile review of a target that fits in ~70–80k tokens, and unusually good at reviewing its own prior findings honestly. **Trust what it observed; verify what it claims caused it.**
