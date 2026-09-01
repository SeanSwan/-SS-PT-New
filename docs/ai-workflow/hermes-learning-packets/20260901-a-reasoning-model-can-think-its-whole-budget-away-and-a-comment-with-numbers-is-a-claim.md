---
date: 2026-09-01
originating_model: claude-fable-5
source_tier: fable
surface: Project Aftertaste GLM hostile round (SWA-211), branch codex/aftertaste-hardening-20260830 @ 820d0755f
models_used:
  - model: claude-fable-5
    role: orchestrator + verifier + fixer
    did: built the 55k-token review packet, dispatched both GLM seats, verified all 29 findings against code, fixed 14, rejected 2 with written reasons
    cost: $0 (subscription)
  - model: glm-5.3 (Z.ai coding plan)
    role: hostile reviewer
    did: 17 findings, 3 CRITICAL all confirmed; first attempt emitted "(empty)" after spending 31,996 of 32,000 output tokens on reasoning
    cost: $0 marginal (subscription credits, 3 of 15 review rounds)
  - model: glm-5.3-flash
    role: hostile reviewer (same family — never corroboration)
    did: 12 findings, 6 genuinely new-and-real beyond 5.3, including two pure-arithmetic checks the larger model skipped
    cost: $0 marginal
skills_touched:
  - id: scripts/consult-glm.mjs (transport)
    change: gained a --thinking enabled/disabled flag
    motivating_failure: a reasoning model given a large hostile-review remit thought away its ENTIRE output budget and delivered an empty report that looked like a completed run (exit 0, file saved)
---

# A reasoning model can think its whole budget away — and a comment with numbers in it is a claim

## 1. Read the reasoning/output split before trusting any report from a reasoning model

`glm-5.3` on a 53k-token hostile-review packet: **exit 0, report saved, wall 586s — and the body
was `(empty)`**, because 31,996 of its 32,000 output tokens were reasoning. Every downstream signal
said success; only the token-split line told the truth. Two procedural rules survive:

- The consult transport must expose thinking control (`--thinking disabled` for review remits, or
  a budget) — added to `consult-glm.mjs` with the incident documented at the flag.
- **A thin or empty report + a fat reasoning count is an instrument reading, not a model opinion.**
  Check `out (reasoning: N)` before concluding a model "had nothing to say."

## 2. A comment with numbers in it is a CLAIM — do the two-line arithmetic before shipping it

My fog comment said "fully swallows the world before the floor's 25-unit edge could show."
Division says (25−20)/(46−20) ≈ 19% fogged. glm-5.3-flash — with no repo access, from a packet —
did the arithmetic I never did. Same round: my own teaching card claimed an aim sphere "honestly
matches the body" while the sphere (0.9) was 28% smaller than the body's half-length (1.25) by
numbers sitting in the same file. Both were written confidently by the same author who had, hours
earlier, written the lesson "validate the instrument before believing it." The transferable rule:
**any comment or doc sentence containing numbers gets its arithmetic executed once before commit** —
it is a two-line check and reviewers without repo access can and will run it against you.

## 3. GLM-family calibration for the routing table (measured, not asserted)

- Both seats, $0 marginal, ~10 min each: **29 findings, ~21 real on verification, 1 partial
  overclaim, 0 fabricated file references.** For hostile review of a SELF-CONTAINED code packet,
  this family is a legitimately strong free seat.
- **Flash punched at the big model's weight on this task** and uniquely contributed the arithmetic
  findings — do not assume the small variant is only a summarizer.
- They are ONE family: overlap (dead-capability, re-render flap, death-screen exploit) arrived in
  both reports and was scored once. The Ox-Alpha lesson generalizes: two seats of one family
  agreeing is one voice, twice.
- Effective pairing: same packet, same remit, both variants, then a self-verification pass over
  the union — the union was meaningfully larger than either report alone.

## Who did what

claude-fable-5 packaged, dispatched, verified, fixed, and rejected; both GLM seats reviewed. The
reviewers were RIGHT about my work 21 times, including three CRITICALs in code I had declared
proven the same day with 3×-green suites — a green suite constrains only what it asks.

## Skills created or changed

`consult-glm.mjs --thinking` (see frontmatter). No new skills; the hostile-review playbook gains
the case: "dispatch a same-family pair, score as one voice, verify the union."

## Mistakes I made

- Shipped a numerically false comment (fog) and a numerically false teaching claim (aimRadius) —
  see lesson 2; the second reintroduced a failure mode I had personally documented one slice prior.
- My hitscan ordered on centre distance, not sphere entry — my adversarial tests lacked the case;
  an external reviewer found it from source alone.
- A heredoc silently swallowed its own fallback command (`python - <<EOF … || node …` — the node
  call was inside the heredoc BODY); the "patch" ran nothing and reported nothing. Verify writes
  by reading them back; never chain a fallback after a heredoc.
- The wrong-cwd error class recurred (4th and 5th instance in one day) AFTER being written up in
  the morning packet — including editing one tree's copy of a script while executing another
  tree's. The fix that finally sticks: location-dependent commands carry an absolute `cd &&`
  prefix, and a file you are about to edit is grepped IN THE TREE THAT RUNS IT first.

## Error → fix → repeat ledger

| error class | recurrences this session | written up before recurring? | what stopped it |
|---|---|---|---|
| wrong cwd / wrong tree for a command or edit | 5 (2 after write-up) | YES — recurred anyway | absolute `cd &&` prefix; grep the executing tree before editing a shared-name file |
| numeric claim shipped unexecuted | 2 (fog, aimRadius) | no | execute the arithmetic of any numbered comment before commit |
| reasoning-budget exhaustion read as "model had nothing" | 1 | no | read the reasoning/output split; --thinking control on the transport |
| heredoc swallowing chained fallback | 1 | no | never chain after heredoc; read back every scripted write |

## External-model calibration

See lesson 3 — this packet IS the calibration record: glm-5.3 15/17 real (1 partial, 1 superseded),
glm-5.3-flash 6 new-real of 12 (rest family-overlap), $0, one family.
