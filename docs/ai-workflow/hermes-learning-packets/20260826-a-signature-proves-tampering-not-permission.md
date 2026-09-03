---
title: "A signature proves tampering, not permission"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10. This session did the finding, the fix, six hostile rounds and all 29 mutations itself; no paid seat was consulted."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-26
surface: "Swan Coach command lane — the confirmation window"
decision: "Authorize at the moment of the EFFECT, not the moment of the request. Anything queued between the two — a pending confirmation, a job, a signed token — must re-ask, because the answer can change while it waits."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "sole implementer, adversary and mutation-harness author"
    did: "closed the 120-second re-authorization window on both confirm lanes; found a fail-open catch that every test agreed with; turned a nine-time recurring escaping trap into a guard that refuses to run"
    cost: "subscription"
skills_touched:
  - id: "Rule 73 (proof-before-done)"
    change: "reinforced"
    why: "the window was named as open in three prior handoffs and never demonstrated. Writing the probe took it from a described risk to 3 green / 5 red — and only then was it worth fixing."
  - id: "packet 20260826-the-role-you-name-defines-the-ones-you-did-not"
    change: "extended"
    why: "same lane, same session, the third hole. That one is about a conditional's unnamed branches; this one is about a check that was in the right place at the wrong time."
  - id: "mutation harness"
    change: "escalated-to-mechanism"
    why: "a nine-occurrence escaping trap became a precondition the harness enforces, and running that guard taught the precise rule (leading newline fine, interior newline not) that four write-ups never contained."
  - id: "Rule 18 (existing-pattern-first)"
    change: "reinforced"
    why: "the denial outcome was invented (`blocked_reauthorization`) before being corrected to the documented `denied` with the reason in `errorCode`, which is where the pipeline already puts it."
---

# A signature proves tampering, not permission

## What happened

A Swan Coach command that requires confirmation is authorized once, in the pipeline, then
**parked for up to 120 seconds** while the user decides. Redemption verified three things:
ownership of the pending operation, expiry, and — on the destructive path — an HMAC
signature.

All three are correct. None of them is authorization.

The signature proves the operation was not tampered with. It says nothing about who may run
it **now**, because it was signed when the caller still could. If the caller's role is
revoked in that window, or the client is transferred to another trainer, every check still
passes and the operation executes.

Three consecutive handoffs named this and left it open, each describing it as bounded and
narrow. It is bounded. But **revocation is precisely the moment someone has a reason to
spend 120 seconds**, and a queued destructive operation is what they would spend it on.

## The general shape

Anything that sits between a decision and its effect inherits this problem: a pending
confirmation, a background job, a signed URL, a queued webhook, a retry. The authorization
was computed against a world that has since moved.

The fix is not to remember more. My first instinct was to record the role at minting and
compare — and that is the wrong question twice over. The operation never stored it, and
"did the role change" is not what anyone needs to know. **"May this caller do this now"** is
answerable without the operation remembering anything, and it is what every other gate in
the lane already asks.

## Where "cannot tell" nearly meant "allow"

The re-check looks up the command in the registry to find its `roleRequired`. What if the
registry has no entry?

My first version denied. That is the right instinct and it broke a real behaviour: the lane
has a deliberate, tested `not_wired` answer for a type nothing can execute, and replacing it
with a permission error would state something false. The resolution is a distinction worth
keeping:

> Refuse an unknown type **only when a dispatcher exists for it.** "Cannot tell" must not
> mean "allow" where something can actually run. Where nothing can run either way, the
> honest answer beats the safe-sounding one.

A side effect is that an uninitialized registry now denies everything — the right direction
for a boot-order accident to fail in.

## The mutation that survived

Twelve tests. Eleven of them green for the right reasons. Then:

```
SURVIVED  M26 confirm lane: fail OPEN when the access lookup throws
```

The access check is wrapped in a try/catch that denies on error. Nothing exercised it: the
mocked authorizer resolved `true` or `false`, and never rejected. Flipping the catch to
`permitted = true` left **every assertion green**.

A gate that fails open under load works in every test and stops working exactly when the
database is unhappy — which is when a queued destructive operation matters most. The
missing test is one line: make the dependency throw.

**This is the third time in one session that mutation caught what reasoning did not.** The
running total across two sessions is now six vacuous or missing assertions, none of which
survived a mutation, and none of which I noticed by reading.

## The trap that finally became a mechanism

Anchors in the mutation harness are literal strings. The sources are CRLF. A multi-line
anchor written with `\n` therefore matches nothing.

I hit this **five times in this session**, on top of four prior sessions in which it was
written up — including a handoff with four worked examples that I had read that morning. The
count is now nine. Prose has had nine chances.

So the harness now refuses to run on an anchor whose `\n` is anywhere but index 0. And
running that guard immediately taught the rule that nine write-ups never contained: it
flagged two anchors that were *working*, because a **leading** `\n` matches the `\n` half of
a `\r\n` and correctly anchors a line start. Only an **interior** newline fails, because the
source has a `\r` the anchor lacks.

The lesson is not the rule. The lesson is that I did not learn the rule by being told it
nine times, and learned it in thirty seconds from a guard that ran.

## Who did what

`claude-opus-5`, alone, $0.00. Six hostile rounds, the last two dry. The rounds found: the
registry-initialization behaviour and the unknown-command distinction (R1); the surviving
fail-open mutation, the invented audit vocabulary, and an audit assertion that would have
passed nothing (R2); and the fact that a *third* dispatch call site added later would pass
every behavioural test by not being exercised — now a contract that walks the function body
and fails on any dispatch not preceded by a gate (R4).

## Skills created or changed

No new skill. The change that matters is the mutation harness gaining a **precondition**
rather than another comment: it refuses to run on an anchor that cannot match, and reports
"anchor not found" as a state distinct from "did not fire". Those two failures demand
opposite responses — fix the anchor, versus rewrite a vacuous assertion — and a harness that
collapses them sends you to rewrite working tests.

Rule 73 and the earlier instrument-validation packet were both reinforced by the same event:
a fail-open branch that twelve passing tests agreed with. Rule 18 was reinforced negatively
— I invented an audit vocabulary before finding the one the model documents.

The harness itself lives in the session scratchpad. Promoting it into `scripts/` so the next
agent inherits the guard rather than rebuilding it is the single highest-value follow-up in
this packet, by the evidence of its own ledger.

## Mistakes I made

- Recorded the denial as `blocked_reauthorization`, an outcome outside the vocabulary the
  model documents. An outcome value nobody else uses is a row nobody else queries — the
  reason belongs in `errorCode`, which is where the pipeline already puts it.
- Asserted an audit row synchronously when the write is fire-and-forget behind a dynamic
  import. It failed — and it would have failed whether or not the row was ever written, so
  it proved nothing in either direction.
- Denied unknown command types outright, which broke a deliberate `not_wired` behaviour I
  had not looked for before changing the code path it lives on.
- Wrote a fail-closed catch and no test that makes anything throw.
- Five more CRLF anchor failures, after reading the write-up about them.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what stopped it |
|---|---|---|---|
| `\n` anchor against CRLF | 5 | **yes — nine times across five sessions** | a harness that refuses to run, which then taught the rule the write-ups never stated |
| assertion that cannot fail | 3 | **yes — repeatedly, including in my own packet this morning** | mutation. Never once caught by reading |
| invented a vocabulary the model documents | 1 | no | a hostile round reading the model file |
| assertion that proves nothing in either direction | 1 | adjacent — "validate the instrument" | it failed loudly, which is the only reason it was fixed rather than shipped green |
| changed a code path without reading what already lived on it | 1 | **yes — "an inherited claim is a hypothesis"** | the full-suite baseline gate |

Two entries are new. Three are repeats of lessons already in this corpus, and one of those
repeats is from a packet **I wrote earlier the same day**.

That is the finding worth carrying: writing the lesson down, even carefully, even
recently, even yourself, does not stop the recurrence. Of the five classes here, four were
stopped by something that RUNS — a guard, a mutation, a gate, a loud failure. None was
stopped by having been read.

## External-model calibration

None consulted. $0.00.

## What is still not proven

- **A role that changes DURING dispatch.** This closes the gap between minting and
  redemption, not between redemption and the write.
- **Dispatcher self-gating.** Handlers remain mocked.
- **Nothing is deployed.** Seven commits, unpushed, and every CI gate is dead at the account
  level, so no automation has confirmed any of it.
