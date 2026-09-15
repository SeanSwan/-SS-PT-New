# Creator Brains — external hostile review remit (2026-09-13)

**You are being asked to attack a repair, not to summarise it.** The packet after
this file contains: the authoritative repair record, the engine blueprint
(including its single readiness receipt), the machine-readable readiness receipt,
the generated requirement-to-test mapping, the mutation log, both reviewer-instrument
logs, the readiness-gate verdict, and the engine source for the modules this repair
touched.

Everything you need is in the packet. Do not ask for the repository; do not assume
anything that is not in the packet. Where a claim cannot be checked from the packet,
say **UNKNOWN** and name what would settle it — an honest UNKNOWN is worth more than
a confident guess.

## What happened, in one paragraph

A hostile review of this engine returned **REVISE** with 26 findings (HR01–HR26) and
reproduced 24 invariant violations against the reviewed revision. The engine was
repaired finding-by-finding; each repair was supposed to be proven by converting the
reviewer's reproduction into a RED→GREEN regression **at the real boundary**. The
reviewer's own two instruments now report 0/20 and 0/4. The last finding (HR26)
demanded receipt reconciliation: one authoritative status, a complete
requirement-to-test mapping, reproducible mutation definitions, exact source hashes,
real logs, review identities, and no past or missing review recorded as passed.

## Attack these claims, in this order

1. **"Every repair is proven by a RED→GREEN regression at the real boundary."**
   Is any test actually asserting the defect, or only a proxy? Look for tests that
   would still pass if the fix were reverted, tests that assert a helper instead of
   the caller boundary, and any finding whose "regression" cannot fail.
2. **"10/10 mutations killed, reproducibly."** The definitions are in
   `mutations.mjs`; the runner in `mutation-check.mjs`. Attack the KILLER, not just
   the mutation: does the named test fail *because of the mutated invariant*, or for
   an incidental reason (a broken import, a count assertion, a file that moved)?
   A mutation killed for the wrong reason is a false kill, and the harness's own
   `CREATOR_BRAINS_MUTATION_RUN` stand-down is a place to look.
3. **"The requirement-to-test mapping is complete and honest."** 26 requirements,
   6 test entries, bidirectional traceability. Is any requirement satisfied only by
   a command that cannot fail? Is any test entry's `proves` string broader than what
   its evidence file shows? Does any evidence file contradict the count it is cited
   for?
4. **The readiness gate verdict.** `structurallyReady: true` is reference integrity
   only. Find where the receipt's *content* overclaims relative to its own
   `scope`, `nextSlice`, `reviewIdentity`, or the records it cites.
5. **The HR22 census and HR23 bounds implementations** (the newest code, most
   likely to hide defects): `lib/sweep.mjs`, `lib/checkpoints.mjs`,
   `lib/discover-phase.mjs`, `lib/bounds.mjs`, `lib/throttle.mjs`, `lib/passes.mjs`.
   Specifically: can a resumable census ever certify a corpus it did not fully walk?
   Can a checkpoint be stale in a way that matters? Can the per-run bound be
   bypassed, or overshot by more than one unit of work? Can a throttle cooldown be
   shortened, lost, or ignored?
6. **Contradictions across surfaces.** The banner, §13 receipt, the record, and the
   JSON receipt all restate the same facts. Find any number, status or scope claim
   that disagrees between them, or that contradicts the logs.

## Output budget (this is a hard limit, not a preference)

The seat streams a reply and the transport only accepts a **finished** one: a reply
that stops because it ran out of room is discarded as INCOMPLETE and the round is
spent for nothing. So write to fit.

- **At most 3,000 words**, and no preamble, no restatement of the packet, no summary
  of what the engine does.
- **At most 15 findings**, highest severity first. Each finding is four short lines
  (severity · claim · why · falsification) — one sentence per line is enough.
- **Then one verdict paragraph** (which claim groups survive, and the single
  highest-risk item).
- **If you cannot cover everything in that budget, say so explicitly** and name what
  you did not examine. A short review that states its own coverage is worth far more
  than a long one that was cut off mid-sentence.
- This packet is **one of three focused dispatches**: (1) the documents, claims and
  receipts — this one; (2) the engine source for the newest code; (3) a single
  Final-Decider ruling. Attack what is in front of you; do not ask for the rest.


## Output format

Numbered findings, each with:

- **Severity**: BLOCKER / HIGH / MEDIUM / LOW / NIT.
- **Claim attacked**: quote the sentence or name the file:line.
- **Why it is wrong**: the reasoning, from packet contents only.
- **Falsification**: the exact command or minimal edit that would prove you right
  (e.g. "revert `<file>` line N to X, run `<test>`; if it still passes, the claim
  is unproven").
- **What would settle it**: the artifact you would need if the packet is silent.

Then a short **verdict**: which of the six claim groups survive, which do not, and
the single highest-risk item. No praise, no restatement of the repair, no summary
of what the engine does.

## Per-seat remit

- **GLM 5.3 (deep, iterative).** All six groups. This seat will be re-run after each
  fix round; prefer findings that are *checkable* over findings that are merely
  plausible, and state explicitly which of your findings you consider already
  settled by the packet.
- **GLM 5.3 Flash (cheap sweep).** Group 6 first (contradictions, stale numbers,
  unresolved references, scope overclaim), then group 3. Keep it short and concrete:
  one line per finding is acceptable if it names the file and the contradiction.
- **Fable 5.1 (single ruling, one call).** Treat the packet as a Final-Decider
  brief: rule on whether the repair claims are *supportable as stated*, name the one
  thing most likely to be wrong in production, and say what you would require before
  calling this verified. One ruling; no re-run will follow this call.

## Standing constraints on your answer

- Do not invent file contents, line numbers or command output.
- Do not treat a green test count as evidence that a defect is fixed.
- Do not treat the absence of a finding from the previous review as evidence of
  correctness.
- If the packet is internally consistent but insufficient to judge something, that
  is UNKNOWN — say so plainly.
