---
packet_id: 20260822-a-default-remit-outlives-its-workstream
title: A default remit outlives its workstream
date: 2026-08-22
originating_model: claude-opus-5
tier_basis: "Sean's explicit designation 2026-08-10 - Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist. Provenance is first-hand: authored by the running session model, not relayed. Fable 5's ruling is quoted, not relayed as my own."
surface: ai-handoff, panel-tooling, consult-fable, user-dashboard verification plan
decision: A verification plan must be able to detect the return of the bug it was written to verify; and a hardcoded default remit is a template that silently outlives the workstream it was written for.
status: shipped
supersedes: none
privacy: IDs, roles and code identifiers only; no PII, no credentials, no client data
models_used:
  - model: claude-opus-5
    role: author of the plan under review; ran the panel, disposed of findings, and ran nine self-hostile rounds
    did: wrote v1, commissioned and read the 7-seat panel, verified or discarded each finding against the code, applied Fable's eight, and found six more itself
    cost: subscription
  - model: anthropic/claude-fable-5
    role: Final Decider (CLAUDE.md Co-Orchestrator Hierarchy)
    did: LOCK-WITH-CHANGES; found 8 items all seven seats missed including 2 P0s; issued RULING ZERO refusing to ratify a phantom decision register, which exposed that its own invoking script was stale
    cost: $0.6761
  - model: openai/gpt-5.6-sol-pro
    role: hostile review seat
    did: only REJECT; 7 of 7 blockers real, incl. the PII-by-construction path and the happy-path-only gap
    cost: $0.3474 (3.4x its estimate, unexplained)
  - model: x-ai/grok-4.6
    role: hostile review seat
    did: fixture treasure-hunt, missing failure owner, URL-is-not-a-capability
    cost: $0.0613
  - model: moonshotai/kimi-k3
    role: hostile review seat
    did: sharpest single catch - the plan settled claims by code-reading while arguing code-reading is insufficient proof
    cost: $0.0459
  - model: deepseek/deepseek-v4-pro
    role: hostile review seat
    did: PII exposure and unprovisioned test data
    cost: $0.0302
  - model: deepseek/deepseek-v4-flash
    role: hostile review seat
    did: proposed a staging environment; verified afterwards that none exists
    cost: $0.0013
  - model: glm-5.3
    role: hostile review seat
    did: "all journeys pass and the titular bug survives" framing
    cost: $0 (Z.ai subscription)
  - model: qwen-3.8 (local)
    role: hostile review seat
    did: cleanest statement of the highest risk - capture current values BEFORE mutating
    cost: $0 (local 5090)
skills_touched:
  - id: consult-fable-explicit-remit
    change: proposed
    motivating_failure: the shared checkout's consult-fable.mjs default remit hardcodes a different workstream's decision register, so every default-remit consult is asked to rule on phantoms
  - id: verification-plan-must-force-failure
    change: proposed
    motivating_failure: a plan verifying "surfaces that claim success they did not earn" tested only successful saves, and could not have detected its own bug class returning
  - id: run-the-instruction-you-are-handing-over
    change: proposed
    motivating_failure: a bundle-identity command shipped in a handoff returned 0 against the live site because it was written case-sensitive against a camelCase minified prop
  - id: prove-the-blocker-before-writing-it
    change: proposed
    motivating_failure: declared fixture provisioning a blocking precondition without opening frontend/e2e/, where an existing mock-based harness made almost all of it unnecessary; seven reviewers ratified the phantom blocker because they were reasoning from my document
---

## The lesson - a plan can carry the disease it was written to cure

The artifact under review was the verification plan for a workstream whose entire subject
was **surfaces claiming success they did not earn**. Wave 1's P0 was a Settings panel that
reported "Saved" while discarding privacy and health fields.

The plan asked the next agent to change a setting, save, refresh, and confirm the value
persisted. **It never once asked anyone to make a save fail.**

Three of seven seats reached that independently. A successful save says nothing about the
failure path, and the failure path is where the bug lived. The plan could have been
executed end to end, every journey marked pass, and the original defect could have been
sitting in production untouched.

I had run nine hostile rounds against the *code* this plan verifies and caught six real
defects there. I did not notice that the plan itself had the same shape of hole. **Hostile
review applied to an artifact does not transfer to the document describing how to check
that artifact.** They are separate surfaces and each needs its own adversary.

The executable form:

> A verification plan is only valid if it can fail. Before shipping one, ask: what would
> this plan look like if the bug were still present, and would any step come back red?
> If not, the plan is a ritual.

## The second lesson - a default remit is a template that silently outlives its workstream

Fable's ruling opened with something I did not ask for and did not expect. It refused to
rule on "§8 decisions D1-D8", "the F10 override (L1->L3 fast path)", "§9.1 UX", "§10
slices incl. S1.5", and "§14 audit" — **none of which exist in the document under
review.** It struck them from the record and said why: ratifying them would send a
worker-bot hunting for an L1->L3 fast path that does not exist, and it would improvise
one.

I had not written any of that. The cause was in the tooling: `scripts/consult-fable.mjs`
carries a hardcoded `REMIT` string, and the copy in the shared checkout still contains the
decision register of **a completely different past workstream**. Every consult that does
not pass `--remit` inherits it.

Two things make this worth a durable packet.

**First, the failure is invisible from the calling side.** The script runs, the model
answers, a verdict file lands. Nothing errors. A weaker reviewer would have produced a
confident, well-structured ruling on decisions that were never proposed — and that
document would then be quoted downstream as authority.

**Second, main had already fixed it.** `origin/main`'s copy of the same script carries a
workstream-agnostic remit ("Rule on every open decision in the document"). The bug existed
only in the stale shared checkout. Which brings the third lesson, which is mine.

## The third lesson - I walked into the trap I had just written down for someone else

The session-start drift-check told me the shared Desktop checkout is **2165 commits behind
main**. I read it. I then wrote that fact into the handoff as trap #1, in bold, for the
next agent. And within the hour I ran two consult scripts out of that same tree without
checking whether they were current.

The panel scripts turned out to be fine — they exist *only* in that tree, so running them
there was correct. `consult-fable.mjs` was not fine, and cost a whole section of Fable's
output to RULING ZERO instead of to my plan.

**Writing a trap into a document is not a control.** It is a note to a future reader, and
I was not that reader — I was the author, who already "knew". The knowledge that makes you
write the warning is exactly the knowledge that makes you feel exempt from it.

The executable form is a habit, not an attitude: **before running any `scripts/*.mjs` from
the shared tree, diff it against main.**

```bash
git cat-file -e "origin/main:scripts/<name>.mjs" 2>/dev/null \
  && diff <(git show origin/main:scripts/<name>.mjs) scripts/<name>.mjs \
  || echo "not on main - shared-tree-only tooling, running it here is correct"
```

That distinction matters: absence from main means local-only tooling (fine), while
*divergence* from main means stale (not fine). Two different answers from one command.

## Who did what

`claude-opus-5` wrote the plan under review, commissioned the panel, verified or discarded
every finding against the code, and ran nine self-hostile rounds.

**Fable 5, as Final Decider, earned its $0.6761 outright.** It found eight items that all
seven seats and I had missed, two of them P0 — including one that was *physically
impossible to execute*: the plan told an agent to measure a 44px touch target by calling
`getBoundingClientRect()` on an `::after` pseudo-element. Pseudo-elements are not in the
DOM. Seven hostile reviewers and the author read past it. A binding house rule was resting
on an instruction that walks a literal agent into a wall.

It also caught a contradiction that would have deadlocked the plan (a privacy rule
forbidding recording field values, next to a step requiring the original values be
restored), and an auth-failure injection that does not work in this codebase at all —
`authMiddleware.mjs:94` states plainly the design **cannot revoke tokens**, so "log out in
a second tab and save" succeeds legitimately and the agent records a false red against
correct behaviour. I verified that one against the source before accepting it.

**Sol 5.6 Pro** was the only REJECT and had the best hit rate of the panel: seven blockers,
seven real. **Kimi K3** produced the sharpest single catch — that the plan settled
questions by code-reading and forbade re-litigation, while arguing in its own first section
that code-reading is insufficient proof for exactly this bug class. **Qwen 3.8, free and
local,** produced the cleanest statement of the highest risk: capture the current values
*before* mutating, because "restore afterwards" is not an instruction you can follow
otherwise. **GLM 5.3, also free,** framed the headline better than any paid seat: all
journeys pass and the titular bug survives.

Two findings were wrong and I discarded them after checking the code: both the admin and
trainer routes reach the same `ClientsWorkspace` (the trainer one is a 16-line wrapper), and
the document contains no client PII. Fable confirmed the first and amended the second —
genericise the machine path anyway, since this repo has a credential-leak history and was
once public. That amendment was right and I had not thought of it.

## Skills created or changed

- **`consult-fable-explicit-remit` (proposed).** Always pass `--remit`; add the
  diff-against-main check above to any runbook that invokes shared-tree scripts.
- **`verification-plan-must-force-failure` (proposed).** Before shipping a verification
  plan, ask what it would look like if the bug were still present and whether any step
  goes red.
- **`run-the-instruction-you-are-handing-over` (proposed).** Every command in a handoff
  gets executed once by its author against the real target before the handoff ships.

## Mistakes I made

- **Ran a stale script from the shared tree — the exact trap I had just written into the
  handoff for the next agent**, an hour after the drift-check warned me.
- **Shipped a verification command I had never run.** `grep -c 'lostpointercapture'`
  returns 0 against the live bundle; React's prop minifies as camelCase
  `onLostPointerCapture`. My earlier manual check had used `-i` and passed, which is why
  I believed it. It surfaced only when I executed my own instructions in a later round.
- **Wrote a plan that could not detect its own bug class** — the headline finding, and the
  reason the panel was worth its price.
- **Introduced two new defects while fixing the panel's findings**: a selector that would
  measure the wrong `<main>`, and a section heading contradicting sequencing I had just
  added three sections above. Fixing under review pressure is a defect source in its own
  right.
- **Nearly inherited a causal claim from the Final Decider.** Fable attributed Sol's 9x
  input-token count to a hostile-loop harness re-sending the packet each round.
  `consult-sol.mjs` contains no loop. Final authority on a *decision* is not authority on
  a *mechanism*; I checked, and recorded the anomaly as unexplained rather than passing
  along a plausible answer that would then be quoted as settled.
- **Quoted a cost estimate without a caveat.** $0.2631 estimated, $0.4861 actual.

## Postscript, same day - the third violation of a lesson I authored

Hours after this packet was written, Sean approved the plan's sequencing and I began the
regression-recommendation step. That step invalidated a load-bearing claim in my own
handoff.

I had declared fixture provisioning a **blocking precondition**, and the transformation-
photo pair "genuinely blocked" on hand-placing R2 objects. Four panel seats had flagged
missing fixtures; Fable ratified the gate. Then I opened `frontend/e2e/` - a directory I
had never looked at while writing an entire plan about verification - and found ~25
working specs built on a synthetic `alg:none` JWT in `localStorage` plus
`page.route('**/api/**')` interception. `/api/profile`, the exact endpoint the Settings
hub PUTs to, was already mocked in three of them. Four already drove `user-dashboard`
routes as `role: 'client'`.

Almost nothing was blocked. The forced-failure test - the headline finding of the entire
panel - is not merely unblocked but *better* automated (`route.fulfill({status:500})`)
than the manual procedure I had specified.

**Seven reviewers ratified a blocker that did not exist**, because every one of them was
reasoning from my document, and my document never mentioned the test harness. Panel
consensus validates your framing, not the world. That is a sharper statement of the
Full-Spectrum Panel Law's limit than the law itself makes: diverse models cannot correct
a shared premise none of them can see past.

And it is the **third** time in two sessions that I violated a caution I had personally
authored:

1. The stale-tree trap - written into the handoff as trap #1, in bold, violated within
   the hour.
2. The absence-claim lesson - "a claim of the form *X does not exist, I searched* is the
   single highest-value thing to re-verify" - recorded in this session's "Who did what"
   about a *previous* author's handoff, then committed myself, about fixtures, within a
   day.
3. This one.

The generalisation is uncomfortable and worth stating plainly: **authoring a warning
confers a feeling of compliance with it.** The act of writing it down discharges the
sense of obligation. Every one of these three would have been caught by a single command
run at a single moment, and in all three cases I had written prose instead.

Executable form, added to the skills list above:

> Before the words "blocked", "does not exist", or "must be created" enter a handoff, run
> the one command that would disprove them. For tooling: `ls` the directory it would live
> in. For a symbol: grep for it. The command is the control; the sentence is not.

## Error -> fix -> repeat ledger

| Error class | Times this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Ran/trusted something from the stale shared tree | 1 (plus the panel scripts, where it was correct) | **Yes — I wrote it into this very handoff as trap #1, hours earlier** | The `git cat-file -e` + `diff` one-liner above. The prose warning demonstrably did not, on its own author. |
| Shipped an instruction I had not executed | 1 | Partially — "validate the instrument" covers reading probes, not authoring them | Every command in a handoff gets run once by its author against the real target |
| Artifact carries the disease it was written to cure | 1 | No | Ask what the plan looks like if the bug is still present |
| Introduced defects while fixing review findings | 2 | No | Treat the post-review pass as its own review target; my rounds 2-8 existed for exactly this and caught both |
| Inherited a plausible causal claim from a higher-tier model | 0 (caught before it landed) | Adjacent to the "a number survives by being repeated" lesson | Verify mechanism claims even from the Final Decider; authority over decisions is not authority over facts |

The first row is the one Hermes should weight. **The trap was written down, in bold, by
me, in the document I was actively editing — and I violated it within the hour.** That is
the strongest evidence yet for the standing lesson in
`20260821-a-clean-tree-makes-stash-pop-a-loaded-gun.md`: a lesson phrased as a caution is
not a control. The only corrections that survive contact are commands you run at a
specific moment. Authorship provides no immunity; if anything it provides the illusion of
it.

## External-model calibration

| Seat | Cost | Findings real | Verdict |
|---|---|---|---|
| Fable 5 (Final Decider) | $0.6761 | 8, incl. 2 P0 | LOCK-WITH-CHANGES |
| GPT-5.6 Sol Pro | $0.3474 | 7 of 7 | REJECT |
| Grok 4.6 | $0.0613 | several | REVISE |
| Kimi K3 | $0.0459 | sharpest single | REVISE |
| DeepSeek V4 Pro | $0.0302 | several | REVISE |
| DeepSeek V4 Flash | $0.0013 | 1 strong | REVISE |
| GLM 5.3 | $0 | strong framing | REVISE |
| Qwen 3.8 (local) | $0 | 1 strong | REVISE |

**Panel $0.4861 against a $0.2631 estimate; with Fable, $1.1622 total.**

Calibration notes worth keeping:

- **Sol is under-estimated by ~3.4x** and the cause is unexplained (46,361 input tokens for
  a ~5,000-token document; the script makes a single call). Quote it from a `--dry-run`
  *and* warn it may run high.
- **Kimi came in UNDER estimate** ($0.0459 vs $0.1051) — the estimator is not uniformly
  optimistic.
- **The two free seats both produced real findings**, one of them the best framing of the
  headline. Free seats are not filler and should be in every panel.
- **Reviewing a plan is far better value than reviewing code.** A plan is cheap to review
  and expensive to execute wrong; this panel cost about a dollar and prevented a
  verification slice that would have concluded "all pass" while the original bug sat
  untouched in production.
