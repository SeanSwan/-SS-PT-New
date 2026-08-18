---
title: "Audit the frame, not just the code — 25 rounds inside a false premise"
packet: audit-the-frame-not-just-the-code
date: 2026-08-18
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance is first-hand, not relayed"
surface: SwanStudios-wide privacy posture / Rule 8 enforcement
decision: "Rule 8 gains a binary-egress clause: any new binary-body POST or capture API is a Rule 8 event. And before a long-blocked decision consumes more work, audit the premise that blocked it."
privacy: "No secrets, no key values, no client data. Env var NAMES only; service and route paths only."
status: draft
models_used:
  - model: claude-fable-5
    role: builder, investigator, Final Decider
    did: "Ran the 25-round dry-loop; then traced the shipped path and falsified the premise the whole loop had assumed; ran the detection sweep that found six egress points; wrote and revised the decision brief"
    cost: subscription (flat rate)
  - model: moonshotai/kimi-k3
    role: hostile reviewer of the decision brief (Sean-authorised paid call)
    did: "Returned REVISE. Caught that my exposure ranking rested on an unchecked contractual fact; inverted my 'Swan never holds the audio' claim into a governance hole; showed accept-and-document is a fig leaf without client consent; raised WA My Health My Data, all-party consent, BIPA; named the unify-transports option nobody had"
    cost: "~$0.20"
  - model: z-ai/glm-5.3
    role: second hostile reviewer
    did: "Dispatched; blocked by repeated HTTP 429s. Verdict pending at packet time — recorded as pending, NOT as a zero"
    cost: "ZAI subscription"
skills_touched:
  - id: rule-8 (zero PII to LLMs)
    change: gap found, clause proposed
    failure: "The enforcement was text-shaped — it greps for JSON fields and PII names. Binary media in FormData/inlineData evaded it for months across six services."
  - id: stale-check
    change: extended
    failure: "STALE-CHECK covers carried FACTS (figures, blockers). It did not cover carried FRAMINGS, and a framing survived 25 rounds unexamined."
  - id: rule-30 (external output is a hypothesis)
    change: applied in both directions
    failure: "The paid reviewer's hygiene findings were assumed-missing controls that verification showed were already present; adopting them uncritically would have produced busywork and a false 'we fixed it' narrative."
---

# Audit the frame, not just the code

A 25-round hostile-review loop ran to completion — 77 verified findings, two consecutive clean
rounds — on a dictation feature that was **blocked the whole time by a premise nobody tested**.

The premise, inherited from a session handoff: *this feature sends client audio to a third-party
model, which violates Rule 8, so it cannot ship until the owner decides how to handle that.*

Falsifying it took four greps.

## What was actually true

The **shipped** product — the voice-recording feature already in production — sends the audio blob to
`/api/ai-chat/transcribe`, which forwards it to Google's Gemini API as `inlineData`. The redaction
and PII-stripping machinery runs on **text after transcription**; it cannot touch audio.

So the unshipped feature was being held to a stricter standard than the shipped one, while nobody
looked at the shipped one. Every round of review attacked the CODE. No round audited the PREMISE.

## The class finding underneath it

Sweeping for the *pattern* rather than the instance found **six production services** sending client
binary media to the same third-party model: voice (names, injuries, schedules), **meal photos**,
three equipment-scan pipelines, content studio, badge images, TTS.

**Rule 8 says "zero PII to LLMs." Its enforcement is text-shaped** — it looks for JSON bodies and PII
field names. Binary payloads in `FormData` / `inlineData` are invisible to that shape of audit. Six
egress points accumulated without one review noticing, including this loop's 25 rounds.

**A policy decision fixes one instance. A detector fix fixes the class.** Proposed Rule 8 clause:
*any new binary-body POST or capture API is a Rule 8 event.* Sweep:
`git grep -lE "inlineData|FormData|multer|getUserMedia|MediaRecorder|SpeechRecognition"`

## The lesson, stated generally

**When a decision has been blocked for a long time, the highest-value move is not more work inside
the frame — it is auditing the frame.** Long-blocked items accrete effort in whatever direction the
original framing pointed. Nobody re-derives the premise because it arrived as settled context.

Practical test, cheap enough to run always: *what would have to be true for this blocker to be
false, and can I check it in under ten minutes?*

Corollary from the same episode: **a comparative claim requires the evidence that defines the
comparison.** I wrote that one path was "less exposure" than another, having ranked them by how the
data travels — when what defines exposure is what the vendor's contract permits afterward. I had
traced production file-by-file and stopped one hop short of the only hop that decides the answer.

## Who did what

- **claude-fable-5 (me)** — ran the loop, then broke my own framing, ran the sweep, wrote the brief,
  and got the central comparative claim wrong in the first draft.
- **kimi-k3** — best value-per-dollar review of the session at ~$0.20. It attacked the *reasoning*,
  not the code: my ranking axis was wrong; "Swan never holds the audio" is a governance hole, not a
  benefit (no DSAR answer, no deletion, no audit — and "we never touched it" is not a defence when
  Swan shipped the feature that made the disclosure); accept-and-document is a fig leaf unless the
  **client** is told, since owner acceptance is not data-subject consent. It also raised legal ground
  I never asked about — Washington My Health My Data and Nevada SB 370 treat fitness and injury data
  as consumer health data with opt-in requirements and a private right of action.
- **glm-5.3** — dispatched, blocked by repeated 429s, verdict pending. **Recorded as pending, never
  as a zero.**

## Skills created or changed

- **Rule 8 gains a binary-egress clause** (proposed above) — the detector fix, not the instance fix.
- **STALE-CHECK extended from facts to framings.** It already required re-verifying carried
  blockers; it now must also ask whether the carried *premise* still holds.
- **Rule 30 runs in both directions.** The paid reviewer's route-hygiene findings assumed missing
  controls; verification found auth, rate limits, a 25MB cap, a mimetype allowlist, and — critically
  — that the transcript is never logged. Adopting a good reviewer's list uncritically produces
  busywork and a false remediation narrative.

## Mistakes I made

1. **Inherited a handoff's framing and never tested it for 25 rounds.** Four greps.
2. **Made a comparative privacy claim without the contractual evidence that defines it** — in a
   document intended for an owner's signature. Exactly the unverified-claim class I had spent the
   whole session catching in others.
3. **Deferred the Linear board update for 25 rounds** behind "consolidated at dry," when the duty is
   explicitly unprompted and a one-liner per round would have cost nothing.
4. **Nearly adopted a reviewer's fix list wholesale** because the reviewer had been right about
   everything else. Being right four times does not make the fifth claim true.

## Error → fix → repeat ledger

| Error class | Occurrences | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Inheriting a frame/fact without re-verifying | 2 (audio premise; stale branch count) | Yes for facts, no for frames | Choosing to measure. Documentation did not |
| Comparative claim without its defining evidence | 1 | Yes — the session's whole proof discipline | The paid reviewer. My own 25 rounds never questioned it |
| Deferring an unprompted duty behind "at the end" | 1 (25 rounds) | Yes — the rule says unprompted | Doing it |
| Trusting a reviewer's list because its other findings were right | 0 (caught pre-action) | Rule 30 | Verifying each item; half were already implemented |

## External-model calibration

| Model | Verdict | Real? | Best at | Watch for |
|---|---|---|---|---|
| **kimi-k3** (~$0.20) | REVISE | Every reasoning finding survived verification | Attacking the FRAME and the ranking axis; surfacing legal/consent ground an engineer does not think to ask about | Its *code-hygiene* assumptions were stale — it assumed missing controls that were present. Verify its checklists; trust its reasoning |
| **glm-5.3** | pending (2× HTTP 429) | — | — | Transport flakiness is routine; a pending verdict is never a zero |

## How to apply next time

1. Before doing more work inside a long-blocked decision, ask what would have to be true for the
   blocker to be false — and check it.
2. Any comparative claim ships with the evidence that defines the comparison, or it does not ship.
3. When a rule is enforced by a pattern search, ask what shape of violation that search cannot see.
4. Verify a trusted reviewer's checklist item-by-item; a strong track record is not evidence for the
   next specific claim.
