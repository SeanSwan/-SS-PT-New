---
decision: "A document that contradicts the tool it documents loses to the tool — and a status you type is not a status you observed"
status: shipped
supersedes: none
originating_model: claude-opus-5
date: 2026-08-26
privacy: IDs/roles only. No PII, no secrets, no credentials.
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer (Final Decider fallback)
    did: executed six handoff recommendations in code; found and fixed two false claims in the handoff itself; four self-caught errors
    cost: subscription
  - model: z-ai/glm-5.3-flash (Ox Alpha, retired name)
    role: prior-session reviewer, carried in as documented verdicts
    did: raised 8 findings on the question letter — 4 DISPROVEN on verification, 4 REAL; the last REAL one (roster revision id) is closed by this work
    cost: ~$0.0015 prior session
skills_touched:
  - id: rule-75 (trailhead truth)
    change: applied
    failure: a handoff documented a path as dead while the tool still prescribed it in --help and three report branches
  - id: instrument-check
    change: applied
    failure: read a CLI's USAGE text (exit 2) as a clean scan result
  - id: rule-73 (proof-before-done)
    change: applied
    failure: asserted a git push state from memory that `git status -sb` disproved
---

# A doc that contradicts its own tool loses to the tool

## The situation

A session handoff for Project Aftertaste listed six carried-over debt items and told the next
agent what to do. The owner asked for all of it to be executed. Doing so surfaced that the handoff
was, in two places, describing a world that did not exist.

## Who did what

**claude-opus-5** built and hostile-reviewed. It closed all six items in code, then found two false
claims in the handoff and four errors of its own. Every defect in this packet is self-caught — no
external reviewer was spent.

**z-ai/glm-5.3-flash** (the seat formerly labelled Ox Alpha) supplied the finding that closed the
last open review item: *"no roster revision identifier — an answer could apply to drifted input."*
Worth recording that on the same packet it raised 8 findings and **half were disproven by running
them** — including a confident, well-argued claim that translations cannot change cell counts,
which is true only for non-overlapping copies. Sharp prose is not evidence. Score by verifying.

## The transferable lesson

**When a document and the tool it documents disagree, the tool wins by default — because the
operator reads the tool.** The handoff said in bold that there was no author to ask. The CLI's
`--help`, its exit-2 message, and three branches of the resolver's report all still said *"ask the
roster's author."* An operator who never opens the handoff — which is most of them, most of the
time — would have gone and asked. Writing a correction into prose while leaving the prescription in
the executable is not a correction; it is a second, contradictory source of truth.

The durable fix is not "remember to update both." It is to make the prose claim **mechanically
checkable**: the selftest now asserts the string `ASK THE AUTHOR` is *absent* from the resolver's
output. The doc's claim is now enforced by a test rather than by whoever reads it next.

## Skills created or changed

No new skill. Three existing disciplines got a concrete instance each:

- **Rule 75 (trailhead truth)** — extended in practice from "docs and in-app copy" to **CLI help
  text, error messages, and log lines**. Those are the copy an operator actually reads during work.
- **instrument-check** — a new failure shape for the catalogue: reading a tool's **usage/help block
  as a result**. `scan-secrets.sh` with no arguments exits 2 and prints help whose body contains the
  words "Exit 0 = clean". Recording "clean" from that is an absence claim built on an instrument
  that never ran.
- **Rule 73 (proof-before-done)** — a *status* is a claim like any other. "It was pushed" needs
  `git status -sb` in the same breath, not recall from one step earlier.

## Mistakes I made

- Wrote "the batch was pushed at batch end" into the handoff while the branch was 7 commits ahead
  of origin. Caught by running the command during my own hostile pass. Fixed by making the row
  refuse to answer: it now tells the reader to run `git status -sb`, because any written push-state
  is stale the moment anyone commits.
- Read a CLI's usage text as a result and recorded a clean secret scan that had not run. Re-ran
  correctly: 20 staged blobs, 0 hits, genuinely clean.
- Drafted a refusal table from memory ("the `off` list plus three") that the run disproved —
  `soldernat` is refused under `off` but builds under `on0`, because a z-lift can *create* face
  contact as well as break it. Computed it instead.
- Broke the build extracting a module: moved the budgets rule out and left `const b` behind while a
  later check still read it. Caught in seconds because the suites run on every edit.

## Error → fix → repeat ledger

| error class | times this session | already written up before recurring? | what actually stopped it |
|---|---|---|---|
| **Reported a status I did not observe** (push state) | 1 | **YES — the previous session's `grep -A1` truncation is the same class, and it was written into a commit message, a handoff section AND a memo** | Running `git status -sb`. The three write-ups did not prevent the repeat. The command did. |
| **Instrument that did not run reported clean** (usage text as result) | 1 | YES — this is the workstream's named failure class, 14 prior instances | Re-invoking with real arguments and reading the summary block |
| **Prose list contradicted by the tool** (on0 table) | 1 | YES — identical to yesterday's truncated defect table | Computing the list instead of recalling it |
| **Doc contradicts the tool it documents** | 1 | No — new class | A selftest asserting the dead string is absent |

**The repeat count is the finding.** The false-status class had been documented three separate ways
within twenty-four hours and I still committed it. That is decisive evidence about what a write-up
is worth: **a lesson recorded is not a lesson fixed.** The corrections that held were procedural and
mechanical every time — run the command, compute the list, assert the string's absence in a test.
The corrections that failed were resolutional — "be careful about truncation," which I had written
down, agreed with, and then violated in the next document.

Applied generally: when a lesson recurs after being written up, **stop writing it up again.** The
next artifact must be a command someone runs or a check that fails, or the recurrence is guaranteed.

## External-model calibration

- **z-ai/glm-5.3-flash** — 8 findings on one packet, **4 real / 4 disproven on verification**, ~$0.0015,
  ~121s. Roughly a coin flip, at a price where that is still worth paying for a first pass. Its
  disproven claims were the *most* confidently argued ones. Never credit a finding for its prose.
- Standing: the seats named "Ox Alpha" and "GLM" were sibling tiers of one lab. Every historical
  "both seats independently agreed" from that period is one family answering twice, not
  corroboration. Independence is a property of the provider, not the seat name.
