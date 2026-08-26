---
originating_model: claude-opus-5
tier: fable-tier
decision: "A fix can be provably correct about the mechanism and still not touch the symptom, because the symptom lived in state the agent never looked at. Verify the user's actual state, not only your causal story."
status: shipped
supersedes: none
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only
models_used:
  - model: claude-opus-5
    role: Final Decider, builder, arbitrator
    did: "Root-caused a paid-render-path complaint, patched the launcher, proved it on a spare port, arbitrated a two-seat design panel, wrote the console blueprint."
    cost: subscription
  - model: stealth/ox-alpha
    role: design panel seat (adversarial)
    did: "Refused 6 of 10 feature ideas; supplied the governing visual law and the read-only-rail tripwire test."
    cost: $0.00
  - model: glm-5.3
    role: design panel seat (constructive)
    did: "Per-profile landing, the plate stage class, the containment shape for an autonomous pass; named the weakness that disproved its own central placement."
    cost: $0.00
skills_touched:
  - id: instrument-check
    change: proposed
    motivating_failure: "The existing lesson covers validating an instrument before believing a NEGATIVE ('it's missing', 'no results'). It does not cover the positive case: believing a FIX will reach the symptom. Same instrument, untested in the other direction."
  - id: rule-73 (proof-before-done)
    change: reinforced
    motivating_failure: "Source-level proof of a mechanism satisfied every internal check and would still have shipped a non-fix."
---

# Verifying the mechanism is not verifying the symptom

## The situation

The owner reported that his local render tool opened on a cloud template and kept asking him
to pay, when he wanted it to go straight to his own GPU.

I found a real, provable cause: the launcher did not pass the flag that disables the vendor's
227 paid cloud nodes, and the settings file had a paid model pinned as the template default. I
verified every link in that chain from source: the flag exists, it gates node loading at
`main.py`, it installs a `connect-src 'self'` CSP at `server.py`, and — the part I was most
pleased with — **none of the 13 node types his own workflows use are paid nodes**, so the flag
costs him nothing. I then booted a second server on a spare port with the flag and measured
227 paid nodes going to 0 with all 13 of his nodes intact.

By every standard I normally apply, that was done. Proof was current-session, reproducible,
and shown.

**It was also not a fix.**

## What the probe found

Before reporting, I opened the tool in a fresh browser profile to see what it actually does on
startup. A fresh profile opened the **stock default graph** — not the paid template.

Which means the paid template was never being served as a default. It was persisted in *his
browser's* local storage from a session weeks earlier. My flag would have removed the paid
nodes that his stale tab referenced, so on next launch he would have opened to a tab full of
missing-node errors: a worse-looking screen than the one he complained about, delivered with a
confident report saying it was fixed.

## The lesson

**I verified the causal story and never verified the state the symptom actually lived in.**

Everything I proved was true. The flag does what I said. The nodes are what I said. The
measurement was real. The gap was not in rigour — it was that I had proved things about the
*server* while the symptom lived in the *client*, and nothing in my checklist made me ask
which side the symptom was on.

The generalisation, which is what makes this worth keeping:

> A fix is only proven when you have observed the symptom's own state, not merely the mechanism
> you believe produces it. "I proved the cause" and "I proved this reaches the user's problem"
> are different claims, and the first one feels exactly like the second.

The existing repo lesson on validating an instrument covers the negative case — do not believe
"it's missing" until the probe is known to be able to find things. This is the mirror image:
do not believe "it's fixed" until you have looked at the thing that was broken, in the place it
was broken, in the state the user has it in. Both failures come from the same root — trusting a
proxy for the observation instead of making the observation.

## The concrete procedure this produces

Before any completion claim on a defect report, answer in writing:

1. **Where does the symptom live?** Server state, client state, cached artefact, user profile,
   a persisted preference, a build output. Name it.
2. **Have I observed *that* thing, in the state the user has it?** Not the code that writes it.
   The thing.
3. **If I cannot reach it** (their browser profile, their machine, their account) — say so
   explicitly, name the residual manual step, and do not claim the fix is complete without it.

Step 3 is what I did in the end: the launcher and settings are fixed and proven, and his one
stale browser tab is disclosed as a single manual close, with the reason it could not be
automated (the frontend exposes no supported workflow-open API, and his browser profile is not
reachable from the agent).

## Who did what

- **Opus 5 (me)** produced both the correct mechanism proof and the near-miss. The probe that
  caught it was my own, run because the report was about to go out — not because any gate
  required it. That is the uncomfortable part: **no rule in the book would have stopped this.**
  Rule 73 asks for current-session proof and I had it. The rule as written can be satisfied by
  proof of the wrong proposition.
- **Ox Alpha and GLM 5.3** were on a separate design question and played no part in this. Worth
  recording because it shows the failure was not a panel gap — a review of my *reasoning* would
  have approved it. Only an observation of the *world* caught it.

## Skills created or changed

- **`instrument-check` — proposed extension.** It currently guards absence claims. It should
  guard fix claims by the same mechanism, with the three-question procedure above. The
  motivating failure is this session: a fix that passed every internal check and would have
  reached nothing.
- **Rule 73 (proof-before-done) — reinforced, not amended.** The rule is right; the gap is that
  "proof" is unqualified as to *proposition*. The procedure above is the missing half.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Verified the mechanism, not the symptom's state | 1 (caught pre-report) | No — new class | A fresh-profile probe run out of habit, not by rule. Now proceduralised above. |
| Windows path handling from Git Bash (backslash, `/tmp` divergence) | 3 | **Yes — already in project memory** | Switching to an absolute scratchpad path and PowerShell invocation. The prior write-up did not prevent the repeat, which confirms the standing finding that a remembered lesson is not a control. The control would be a helper that always emits the correct form. |
| Dispatching a consult to a non-existent output directory | 1 | No | Create the directory before dispatch. One seat's script does `mkdirSync`, another does not; the asymmetry is the trap. |
| Trusting a figure two models agreed on | 1 (caught) | No | Computing the contrast table myself. Two seats estimating the same quantity is one estimate, not two. |
| **Believed a relative-path probe run from the wrong working directory** | 1 (caught) | **Yes — by this very packet, minutes earlier** | Re-running the listing with an explicit `cd` first. An `ls` of a relative path returned empty; I concluded the directory did not exist, then built a plausible narrative on top of it ("this branch is 2,285 commits behind main, so these live on main") that cited a real drift finding and was entirely wrong. Both directories existed, with 150 packets and 9 pending memos in them. |

**The highest-signal row is the last one, and it is worse than the second.** I wrote this packet
about trusting a proxy instead of making the observation, and then, within minutes, trusted an
empty `ls` from the wrong directory and invented a confident explanation for it. The invented
explanation was *more* convincing than the truth because it cited a real, unrelated drift
finding. That is the shape this failure takes: not "I did not check" but "I checked something
adjacent, and the result had a story ready to receive it." A lesson written down was repeated by
its own author in the same session — which is the standing proof, again, that documentation is
not prevention.

**Second-highest is the Windows-path row.** It had already been written up and recurred three
times inside a single session, which is the standing proof that documentation is not prevention.
The correction that survives is procedural, never resolutional.

## External-model calibration

| Seat | Cost | Findings real vs disproven | Verdict |
|---|---|---|---|
| Ox Alpha | $0.00 | all substantive; refused 6 of 10 ideas, correctly | Highest value per dollar available. Its refusals were the product. |
| GLM 5.3 | $0.00 | all substantive | Most directly implementable output. Named its own failure mode, which is what let me rule against its central proposal. |

Total external spend this session: **$0.00.**
