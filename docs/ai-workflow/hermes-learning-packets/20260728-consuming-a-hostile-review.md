---
originating_model: claude-fable-5
date: 2026-07-28
topic: How to consume an AI hostile review — the verification ratio, and why acting on an unverified finding can be destructive
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
---

# Learning Packet — a review finding is a hypothesis, and obedience to it is a failure mode

**The permanent lesson:** a hostile review's value is in *where it points*, not in *what it
concludes*. Across three rounds of AI review on one backend, roughly **half of all concrete
findings dissolved under verification** — and in the final round, **7 of 8 did**, including a
BLOCKER alleging privilege escalation and one whose "fix" would have **deleted user data**.
A reviewer that produces false positives is still enormously valuable; an implementer that
acts on them without checking is not.

## 1. The measured record (why this isn't cynicism)

Same reviewer, same repo, three rounds:
- **Round 1** (security core): 3 blockers — **all three real**, all shipped as fixes. One was
  a missing SQL bind placeholder that made stolen sessions unrevokable.
- **Round 2** (files round 1 couldn't see): 4 findings — **2 real** (an accepted cloned
  authenticator; an unsalted hash used as a credential), 1 already-safe, 1 partly real.
- **Round 3** (remaining surface): 8 concrete findings — **1 real** (a 500 where a 400
  belonged), **7 disproven**.

The trend is the signal: **precision falls as the reviewer moves away from what it can see
directly.** Round 3's bundle omitted files that held the answers, and the reviewer — correctly —
marked those NEEDS-PROOF rather than guessing. The findings that survived verification were
always in code the reviewer actually had.

## 2. The two failure modes, and only one is discussed

Everyone worries about **under-trusting** a review (ignoring a real bug). The rarer and more
expensive mistake is **over-trusting** it:
- A BLOCKER claimed owner-only endpoints were guarded by authentication alone — "any user could
  trigger emergency lockdown or mint operator grants." Reading the handlers showed three used an
  explicit owner-role assertion and the fourth used a *stronger* capability model that compares
  client-claimed against server-granted permissions. Acting on the report would have meant
  bolting redundant checks onto a correct design while broadcasting a phantom vulnerability.
- A SHOULD-FIX claimed the durable store lacked a cap the in-memory store enforced. The cap was
  present (`limit 100`); the durable store simply *retains* rows instead of discarding them —
  the better design. "Fixing" it meant **writing a DELETE against real user rows.**

**Obedience to a review is not diligence.** The reviewer optimizes for recall (say it, flag it,
demand proof); the implementer must supply precision.

## 3. The verification protocol that produced this ratio

For every finding, before any edit:
1. **Read the actual code named** — not the summary of it, not the file that looks like it.
2. **Trace to the caller** when the file lacks the control the finding wants. An authz guard one
   frame up is still an authz guard. (A file with zero authorization references *looked* like a
   missing-auth hole; the guard was one line above the call site.)
3. **Check the schema/migration** when the claim is about persistence (a cascade, a column, a
   constraint). Claims about durable behavior are settled by DDL, not by handler code.
4. **Run it** when the claim is about runtime. Attribution especially: re-run the failing command
   at a pre-change commit before blaming your own work — four self-blame theories in this arc
   were all wrong.
5. **Record the disproof**, in the commit message and the tracker. An unrecorded false positive
   gets re-reported next round and re-investigated at full cost.

## 4. What to do with the findings that survive but aren't defects

Some real findings are **design decisions wearing bug clothing**: bounded pagination, retention
policy, replacing a convention with a mechanism. These should be *filed with a recommended
shape*, not unilaterally implemented — especially when the fix changes an API contract, deletes
data, or touches infrastructure shared by many passing tests. **File the decision; fix the
defect.** A well-written issue with ranked options moves a project further than a risky repair.

## 5. Applying this
- Treat every finding as `NEEDS-VERIFICATION` until you have read the named code.
- Escalate scrutiny with severity: a BLOCKER earns *more* verification, not less — it is the one
  most likely to trigger reflexive action.
- Before any fix that deletes, truncates, or migrates, ask: *what if the finding is wrong?*
- Give the reviewer the files it says it lacks; NEEDS-PROOF is a request, not a verdict.
- Publish the disproofs alongside the fixes — the false positives are part of the record.
