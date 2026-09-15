---
packet_id: 2026-08-19-validate-against-the-contract-not-the-artifact
date: 2026-08-19
originating_model: claude-opus-5
tier: fable-tier
surface: design governance / validation
status: durable
models_used:
  - model: claude-opus-5
    role: author, grill interviewer, fusion, dry-loop
    did: ran the deep grill (11 decisions), fused 8 skeletons from 3 sources, built and ran every gate, found the D8 contract violation in round 3, made 7 recorded mistakes
    cost: subscription
  - model: moonshotai/kimi-k3
    role: design peer + hostile reviewer
    did: 4 concept directions, 8 hostile findings; caught that the hero asset had never been inspected, which was the highest-value finding of the session
    cost: $0.0721 (cap $1.50, worst case $0.9229)
  - model: glm-5.3
    role: design peer
    did: 4 concept directions with honest self-stated failure modes; predicted its own design's empty-state problem
    cost: $0 (subscription)
skills_touched:
  - id: rule-64 grill-me
    change: reinforced
    failure: three identical open-ended vision questions were ignored; the same question answered instantly as discrete options with a recommendation. Open-ended is not the same as deep.
  - id: swan-atelier-studio (fingerprint gate)
    change: proposed
    failure: the gate proves designs differ from EACH OTHER and cannot see that all of them contradict a shared constant. Needs a contract-conformance pass alongside the distinctness pass.
  - id: rule-73 proof-before-done
    change: reinforced
    failure: six passing gates read as proof; they were six self-referential checks.
---

# Validate against the contract, not the artifact

## The lesson

Eight design skeletons passed a fingerprint gate (28 pairs, 0 collisions), required-field checks, a
banned-language sweep, a copy-fidelity diff against the source pack, and a naive-loop check. Six gates,
all green.

Then one new check — comparing each skeleton against the **shared constants every skeleton inherits**
rather than against its own declared fields — found that **4 of 8 violated the constant requiring people
in the world.** They would have rendered as beautiful empty places and deleted the community half of a
page whose entire argument is community.

**Every gate I had built read the artifact's own declarations.** Distinctness compares items to each
other. Field-presence asks whether an item filled its own slots. Lint reads the item's text. None of them
can see that an item contradicts a rule that lives *outside* the item, because nothing loads both unless
you write that comparison deliberately.

**Generalised: a validator that only reads the thing being validated will pass a thing that is
internally perfect and externally wrong.** Whenever a set of artifacts inherits shared constraints —
design skeletons under a brief, migrations under a schema contract, components under a design system,
API handlers under an interface spec — the conformance check must load the constraint document as a
separate input and assert against it. If your gate never opens the contract, it is not checking the
contract.

**The tell:** if all your checks would still pass when the shared constraint document is deleted, none of
them are checking it.

## Who did what

- **Opus 5 (me)** built all six passing gates and, crucially, also built the seventh that caught the
  real defect — but only after the closeout hook forced a dry loop I had skipped. Left to my own
  judgement I would have shipped eight skeletons with a silent contract violation and called it verified,
  because six green gates felt like proof. **The gates were mine, the blind spot was mine, and the
  discipline that caught it was procedural, not intellectual.**
- **Kimi K3** found what I could not see about my own brief: that eight designs were being built on a
  hero video nobody had ever opened. It was right. Measuring took four minutes and returned a
  0.694 loop-seam SSIM — the asset does not loop, which invalidated an assumption running through months
  of prior design conversation. **Kimi attacked the premises; I had only attacked the outputs.**
- **GLM-5.3** contributed four directions and volunteered its own designs' failure modes unprompted.
  A peer that predicts how its own idea breaks is more useful than one that defends it.
- **Sean** twice supplied context no model had: that the site is a two-sided marketplace with a 15% take
  rate, and that the swan is his surname and Chickasaw heritage rather than a brand choice. Neither was
  derivable from the repo. **The most load-bearing facts of the session came from the interview, not the
  code** — which is the entire argument for the grill gate.

## Skills created or changed

- **`swan-atelier-studio` — proposed addition: a contract-conformance pass.** The existing fingerprint
  gate is a *divergence* check (are these different enough from each other). It structurally cannot catch
  *convergent* failure — all N artifacts breaking the same shared rule. Divergence and conformance are
  orthogonal and need separate passes. Built against the failure above.
- **`grill-me` — reinforced, with a format finding.** Depth does not come from open-endedness. Three
  open vision questions were ignored; the same question, posed as discrete options each carrying a
  recommendation and a stated consequence, was answered immediately and richly. The skill already
  mandates "always recommend an answer" — the failure was mine for not applying it to the vision tier,
  where it matters most because the question is hardest to answer cold.
- **Rule 73 (proof-before-done) — reinforced.** Six passing gates is not proof when all six share a
  blind spot. Proof requires at least one check whose vantage is outside the artifact.

## Mistakes I made

- **Repeated a stale blocker I had already been corrected on.** Reported the MiniMax H3 licence as
  "unsent" from a 2026-08-15 doc. A 2026-08-17 doc said GRANTED, the machine env var was set, and Sean
  had already told me directly. The inbox already held a memo about miscommunicating this same licence.
- **Named a restriction without naming what was not restricted** — the H3 attribution requirement, framed
  so it read as a constraint on the work. Identical failure class to the existing "blocked for commercial
  use" memo, which exists precisely to prevent this.
- **Committed, then kept editing.** The commit captured pre-fix state while its message described
  post-fix state. Caught only by diffing HEAD against the working tree.
- **Fixed an inconsistency by introducing one** — made a field mandatory, filled it on 4 of 8.
- **Hand-typed "verbatim" copy** instead of generating it from the source pack, manufacturing the exact
  drift exposure the copy-is-material law exists to prevent, one session after being caught on copy.
- **Asked the same question three times** before changing format.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Stale blocker repeated from a doc without verifying current state | 1 | **YES** — `feedback_stale_check_reverify_before_repeating`, and a prior inbox memo on this exact licence | Sean's correction. Nothing procedural caught it. **The write-up did not prevent the repeat.** The fix that would have: read the *newest* doc on a topic before quoting any doc, and prefer a machine/state probe over any doc. |
| Empty grep read as absence (wrong cwd) | 4+ | **YES** — `feedback_validate_probe_before_absence_claim` | A control probe run before trusting each negative. This one DID hold — the memory worked, every time. The residual failure was re-creating the hazard by not `cd`-ing, not by believing the negative. |
| Self-referential validation (gates that never open the contract) | 1 | NO — new | The dry-loop requirement to find a **new vantage** each round. Round 3 was the first round forced to look somewhere I had not already looked. |
| Commit/working-tree drift after a fix | 1 | NO — new | Round 6 diffing `HEAD:<path>` against the working tree. Should be a standing final round, not a lucky vantage choice. |

**Highest-signal row is the first one.** A lesson that was documented and then repeated proves the
write-up was not a fix. "Re-verify before repeating a blocker" is resolutional — it asks the model to
remember to be careful. The procedural version that would actually have worked: **before quoting any
status from a document, list all documents on that topic by modification date and read the newest, and
if the status is machine-observable, probe the machine instead.** That is a command, not a virtue.

## External-model calibration

| Model | Cost | Findings | Real on verification | Verdict |
|---|---|---|---|---|
| Kimi K3 | $0.0721 | 8 | ~6 clearly real, 1 legitimate judgement call escalated to owner, 1 arguable | **High value per dollar for attacking a brief's premises.** Best used where the author is weakest: assumptions, not outputs. One call was sufficient. |
| GLM-5.3 | $0 | 4 directions + review | Directions all usable; self-stated tradeoffs accurate | **Strong free design peer.** Not a substitute for the hostile pass — its critique was gentler than Kimi's. |

Both returned valid structured JSON first try from a **self-contained** brief. The previous run of this
same workflow failed because the brief was under-specified and the peers invented context. Brief quality,
not model quality, was the variable.

## Privacy

IDs and roles only. No client data, no PII, no secrets. Secret scan run on all committed artifacts:
7 files, 0 hits, CLEAN. Nothing shipped to production; `HomePage.V4` untouched.
