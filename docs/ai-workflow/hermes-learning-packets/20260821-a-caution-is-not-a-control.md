---
packet_id: 20260821-a-caution-is-not-a-control
date: 2026-08-21
originating_model: claude-opus-5
tier: fable
surface: classroom-hermes, 5090 serving stack, SwanGuard-Newsroom schema
decision: A lesson phrased as a caution will be violated by the agent that just read it; only a lesson phrased as an executable step survives contact with work.
status: shipped
supersedes: none
privacy: IDs, roles and code identifiers only; no PII, no credentials, no child data
models_used:
  - model: claude-opus-5
    role: sole investigator, builder and hostile reviewer
    did: read-only audit of the 5090 serving stack and overlay, SwanGuard schema review, the server-side prep runbook, and the five-round hostile loop that found four defects in its own output
    cost: subscription
skills_touched:
  - id: feedback_validate_probe_before_absence_claim
    change: amended in spirit — the existing memory is a caution and was violated within an hour of being read; it needs an executable form
    motivating_failure: declared the SwanGuard opportunity schema non-existent on the strength of a grep filter that could not have matched its real table names
  - id: serving-exposure-audit
    change: proposed, not built
    motivating_failure: nearly recommended a loopback rebind that would have taken a fail-closed local assistant offline, because the audit shape had no dependent-consumer step
  - id: drift-check
    change: proposed extension
    motivating_failure: deterministic gate scripts hardcode one repo's paths and are inert in the repo where the package actually lives, so they report nothing rather than failing
---

# A caution is not a control

## The lesson

I began this session by reading a memory titled *validate the instrument before
believing a negative*, written after six false "it's missing" claims in a prior
session. Within the hour I made the same error: I filtered a table listing
through a keyword set, found no match, and wrote "no opportunity/deals table
exists in any migration." The table exists. It is called
`marketplace_listing_drafts`, and no keyword in my filter could ever have matched
it.

The write-up did not prevent the repeat, and the reason is instructive. It is
phrased as a disposition — *be careful about negatives* — and dispositions do not
fire at the moment of action. They describe how one ought to feel while working,
and feeling careful is exactly what an agent believes it is doing when it makes
this mistake.

The version that would have worked is a step: **before writing "X does not
exist," print the complete set X would belong to.** That is checkable. A reviewer
can ask "did you print the set?" and get a yes or no. Nobody can audit whether I
was careful.

This generalises past this one error. The corrections that hold in this project
are procedural — run this command, print this set, show this diff. The ones that
keep getting re-learned are resolutional. When a lesson recurs despite being
documented, the fix is not to document it harder; it is to convert it into
something with a pass/fail.

## The second lesson — ask what depends on it before you close it

The session's most dangerous moment was a recommendation, not a defect. An
inference port was over-exposed: bound to all interfaces, unauthenticated, with
firewall rules overriding a block default. The obvious remedy is to bind it to
loopback and drop the rules.

That remedy would have taken the operator's own assistant offline. Its runtime
lives in a NAT-mode Linux subsystem that reaches the port via a gateway address,
where loopback is unreachable; and the firewall rules I proposed deleting are
plausibly what permits that hop at all. The assistant is fail-closed, so it would
not have degraded — it would have gone dark, silently, with the hardening step
reporting success.

I caught it in the fifth hostile round, by asking *what currently depends on this
port* rather than *is this port too open*. Both questions are about the same
port. Only one of them can tell breakage from success.

The durable form: **a hardening change's acceptance test must have two halves —
the thing that should now fail, and the thing that must still work.** A test that
only confirms closure cannot distinguish a secured service from a broken one.

## The third lesson — a schema with no narrative column can still accept a narrative

The marketplace schema I initially missed turned out to be well-shaped: no notes
field, no description, no observation column, a controlled reason code. The right
instinct, visibly applied.

It also has four bare `jsonb` columns with no `CHECK` constraint. Any object fits
in one. A requirement that the schema "physically rejects" a class of field is
not satisfied by the absence of a *named* column for it, because a schemaless
column is a named column for everything. The same codebase constrains JSON with
`jsonb_typeof` checks thirteen times elsewhere — the mechanism was available and
simply not reached for here.

Worth carrying: when a schema is audited against a prohibition, the audit is over
the columns that accept arbitrary structure, not the ones with recognisable
names. The dangerous column is the one whose name tells you nothing.

## Who did what

Opus 5 did all of it, unaided — investigation, deliverable, and the hostile loop.
No paid seat was consulted, correctly: every question was answerable by reading
the machine in front of me, and a panel would have added cost and latency to
questions that a command answers in a second.

The distribution of defects is the part worth recording. Five rounds of hostile
review found four real defects, and **two of them were in my recommendations
rather than my findings** — the impossible tailnet topology and the rebind that
would have killed the assistant. The findings were mostly right on the first
pass; the advice was not. An agent reviewing its own work tends to re-check what
it observed and take on faith what it concluded. The rounds that paid were the
ones aimed at the conclusions.

## Skills created or changed

Nothing was built. Three candidates, each named with the failure that motivated
it, are in the frontmatter — the proposed `serving-exposure-audit` shape is the
one with a specific gap to fill, because the dependent-consumer step is precisely
the step an agent skips and precisely the step that prevents an outage.

I deliberately did not touch a deterministic tripwire I found red, even though
the fix is two lines and evidence-backed. It encodes a review panel's result, and
this project has already paid for the lesson that post-clearance improvements are
its largest defect source. A red gate reported is cheaper than a green gate
edited by whoever happened to be passing.

## Mistakes I made

- Declared a schema absent on the strength of a filter that could not have
  matched it — a **repeat** of an already-documented lesson, made within an hour
  of reading it. This is the packet's subject.
- Recommended a network topology without checking it was achievable; one daemon
  instance holds one overlay, so the recommendation would have disconnected the
  host from its existing one.
- Proposed the loopback rebind described above.
- Wrote a probe whose failure mode was silent success (`where X | head -1 ||
  echo absent` — the fallback can never fire) and nearly presented its output as
  evidence. The conclusion was right by luck; the instrument was not.
- Searched for the working repo by an exact directory name and missed it, then
  spent a stretch treating a stale temporary snapshot as authoritative.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Believing a negative produced by a narrow filter | 2 | **Yes** — and violated anyway | Enumerating and reading the complete set |
| Asserting tool behaviour from training memory | 2 | No | Running the command in the same turn as the claim |
| Probe whose failure is indistinguishable from success | 1 | No | Re-running with a command whose exit code carries meaning |
| Hardening advice that ignores the dependent consumer | 1 | No | Asking what depends on the thing before closing it |

Row 1 is the signal. Documentation was not the missing piece — the document
existed, was indexed, and was read. What was missing was a form that fires at the
moment of writing the claim.

## External-model calibration

No external model was consulted. Cost $0. Recorded deliberately: this is the
right call for a session whose questions are all local and command-answerable,
and it is worth having a data point for what a paid seat is *not* needed for.
