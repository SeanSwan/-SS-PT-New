---
title: Reachability is severity, not a footnote
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist
date: 2026-08-16
decision: external audits are routed for FINDING, never for PRIORITISING — severity is re-derived locally from mount/import reachability and a sibling sweep before any finding is acted on or escalated
status: draft
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
topic: "An audit can quote the code correctly and still rank it wrong — reachability IS severity, and a file-dump audit structurally cannot compute it"
models_used:
  - model: z-ai/glm-5.3
    role: security auditor (money path + auth core, 12 files, 58k tokens)
    did: produced 6 findings; 2 verified exactly right and exploitable (cart role escalation, ACH hardening gap), 1 correct in every code claim but rated HIGH on a module imported by nothing; listed its own reachability gaps as open items rather than bluffing; missed a 4th instance of its own finding-class that a sibling sweep found in one grep
    cost: flat-rate Z.ai coding plan
  - model: claude-opus-5
    role: verifier, builder, hostile reviewer
    did: reproduced the escalation in a runtime test before fixing, resolved the audit's open mount question, downgraded one finding, found a 4th instance the audit missed, mutation-tested its own guard
    cost: subscription (flat)
skills_touched:
  - id: rule-30-subagent-skepticism
    change: proposed-amendment
    failure: the rule says treat findings as hypotheses until verified against the real caller path, but it reads as being about CORRECTNESS; here every code claim was correct and the SEVERITY was wrong — verification must cover reachability, not just accuracy
  - id: rule-20-54-sibling-sweep
    change: confirmed
    failure: none — the sweep did its job, surfacing a 4th instance of the vulnerability class that the external audit never saw because file-dump audits cannot sweep
  - id: test-driven-development
    change: proposed-amendment
    failure: a source-text guard that greps for a string is only an assertion about today's file; nothing required proving the guard goes RED when the defect is reintroduced
---

# Reachability is severity, not a footnote

## The lesson

An external auditor (glm-5.3) rated a finding **HIGH**: suspended admins retain access via
`adminAuth.mjs`, because it never checks `decoded.tokenType === 'access'` and its account-status
check reads `user.status`, a column that does not exist on the `User` model.

Every one of those claims was **true**. I verified each against the source. There is no
`tokenType` gate. The `User` model has `isActive`, `isLocked`, `accountDeactivatedAt` — and no
`status` field at all, so `user.status === 'suspended'` is permanently `undefined === 'suspended'`.

And the finding was still **wrong**, because `adminAuth.mjs` is imported by nothing. One test file
references it. Zero runtime modules do. The `requireAdmin` that actually guards the admin routers
lives in a *different file*, and every router that mounts it mounts `protect` first — which does
enforce `tokenType`, a per-request DB re-lookup, `isActive`, and `isLocked`.

> **Correct code claims + zero reachability = dead code, not a HIGH.
> "What mounts this?" is not a follow-up question. It is half the severity.**

This is not the auditor being sloppy. It is a **structural limit of the format**. GLM was handed 12
files. Mount order lives in `core/routes.mjs`, which it never saw — and it said so, listing
*"Actual mount points of `adminAuth.requireAdmin` vs `protect + adminOnly` (determines blast radius
of Finding 1)"* in its own open-items section. It flagged the gap honestly and I still had to be
the one to close it.

The same limit produced a second, opposite error — a **false negative**. GLM's Finding 2 was a real
unpaid role escalation at add-to-cart. My required sibling sweep found a **fourth instance of that
exact class** in a file GLM was never given: `POST /api/roles/test-upgrade`, self-service unpaid
promotion behind nothing but `NODE_ENV !== 'production'`. A file-dump audit finds instances in the
files you hand it. It cannot sweep for siblings. **The sweep is yours to run, always.**

## The routing rule this produces

| Question | Who can answer it |
|---|---|
| Is this code doing what the auditor says? | The external model — reliably |
| Is this code *reachable*? | Only a local mount/import sweep |
| Are there other instances of this class? | Only a local sibling sweep |
| How bad is it? | Reachability × instances — so, only locally |

Send audits out. **Rank them at home.**

## Second lesson: a "move X to Y" may already be done

The brief said *move the role promotion to payment-success*. Before writing that code I grepped for
every `role: 'client'` write in the backend. Payment-success **already** promoted correctly —
`SessionGrantService.buildUserPurchaseUpdate`, gated on `sessionsToAdd > 0 && user.role === 'user'`,
keyed on sessions actually granted rather than a display-name substring, plus an equivalent in the
package-checkout rail.

So the fix was a **deletion**, not a migration. Implementing the brief literally would have created
a second promotion path that double-fires.

> **Before implementing "move X to Y", verify Y doesn't already do X.**
> The cost of checking is one grep. The cost of not checking is a duplicate write path on the
> money rail.

## Third lesson: a source-text guard is worthless until you prove it goes red

I wrote a regression suite with two layers: four runtime supertest cases asserting `User.update` is
never called on an unpaid add, plus a source-level guard asserting the route file contains no
name-substring promotion logic.

The source guard **failed on my own explanatory comment** — I documented the removed vulnerability
in the file, and my grep-style assertion matched the prose describing it. Fixed by stripping
comments before matching. But that near-miss exposed the real risk in the other direction: had the
stripper been slightly too aggressive, the guard would have passed **while hiding real code**.

So I mutation-tested it: reintroduced the vulnerability, confirmed the suite went red on both
layers, reverted, confirmed green.

```
mutation applied  -> 2 failed / 4 passed   (runtime case for the reintroduced tier + source guard)
mutation reverted -> 6 passed
```

> **A guard you have never seen fail is a guard you have not tested — you have only tested that
> today's file happens to satisfy it.** Reintroduce the defect once. It costs two minutes.

Note which layer carries the proof: the **runtime** cases are the evidence, and they never depend on
the comment-stripper at all. The source guard is defense-in-depth against reintroduction. Build
proof at the layer that executes the code; use text guards only to stop regressions.

## Fourth lesson: one payment rail's fix is not the fleet's fix

`offlinePaymentRoutes.mjs` filters purchasable items on `isActive: true`, with a comment naming the
audit that added it. `achPaymentRoutes.mjs` — the sibling rail, same shape, same purpose — does not.
The hardening landed on one rail and was never propagated. Same for quantity validation:
offline enforces `parseInt` + `Number.isInteger` + `>= 1`; ACH does `item.quantity || 1`.

> **When a fix lands on one rail of a multi-rail money path, the next question is "which sibling
> rails exist, and did they get it?" — asked in the same session, not the next audit.**

## Who did what

**z-ai/glm-5.3** audited 12 money-path and auth-core files and produced 6 findings. Two were exactly
right and exploitable. One was correct in every quoted line and **wrong at HIGH severity**, because
the module it described has zero runtime importers — a fact the audit could not have known, and
said so, listing the mount question in its own open-items section. It missed a fourth instance of
its own finding-class entirely, because a file-dump audit cannot sweep for siblings.

**claude-opus-5** verified every finding against the real caller path before touching anything,
reproduced the escalation in a runtime test *before* fixing it, resolved the mount question the
audit had left open, downgraded one finding, found the fourth instance by the sibling sweep the
audit's own finding required, and mutation-tested its guards. It also made the same
severity-before-reachability error itself on first read — the auditor did not mislead it; its
reading order did.

## Skills created or changed

- **Rule 30 (subagent/external-output skepticism) — proposed amendment.** The rule says treat
  findings as hypotheses until verified against the real caller path, which reads as being about
  *correctness*. Here every code claim was correct and the *severity* was wrong. Add: verification
  must cover **reachability**, not only accuracy — "what mounts this?" is half the severity.
- **Rules 20/54 (sibling sweep) — confirmed, no change.** The sweep did exactly its job, surfacing a
  fourth instance of the vulnerability class the external audit never saw.
- **`test-driven-development` — proposed amendment.** A source-text guard is only an assertion about
  today's file until you have watched it go red. Add: mutation-test every guard once.

## Mistakes I made

- **My own regression guard failed on my own comment.** I asserted the route file contains no
  `role: 'client'`, then documented the removed vulnerability *in that file* using that exact
  string → caught by running the suite (5 failed / 1 passed, one failure entirely self-inflicted)
  → rule: **a source-text assertion must strip comments before matching, or assert a code-shaped
  pattern.** Prose describing a vulnerability is not the vulnerability. Worse, the near-miss ran
  the other way too: an over-aggressive stripper would have made the guard pass while hiding real
  code — which is why the runtime cases, not the text guard, must carry the proof.
- **I nearly shipped an absence claim off a single empty grep.** `grep -rn "adminAuth" routes/ core/`
  returned nothing and I was one sentence from writing "adminAuth is unmounted" → caught by my own
  standing rule to validate the instrument first (confirmed the file exists and a control grep
  returned 10 in-file hits before trusting the empty result) → rule: **an empty grep is evidence
  only once the grep is proven able to find something.** This is a mistake class I have written up
  before — six false "it's missing" claims in one prior session. This time the check ran *before*
  the claim rather than after, which is the only reason it is not on this list as a repeat.
- **I started from the brief's framing instead of the repo's truth.** The task said "move the
  promotion to payment-success"; payment-success already did it correctly. Had I coded the brief
  literally I would have added a **second promotion path on the money rail that double-fires** →
  caught by grepping every `role: 'client'` write before implementing → rule: **before implementing
  "move X to Y", verify Y doesn't already do X.**
- **Three failed `mklink` attempts** from fighting Git Bash path conversion and then `printf`
  mangling `\U` in a Windows path → caught by the shell erroring each time → rule: **on Windows,
  write the `.bat` file rather than escaping through two shell layers.** Cost minutes, no
  correctness impact, but it is the third session this exact friction has appeared.
- **Wrong severity accepted on first read.** I initially treated F1 as a live HIGH because every
  quoted line checked out, and only downgraded after asking what mounts it → caught by the mount
  sweep → rule: **verify reachability before accepting severity, even when the code claims are
  all correct.** This is the packet's headline lesson and I made the error myself before catching
  it — the auditor did not mislead me, my own reading order did.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Absence claim from an unvalidated search | 1 near-miss | **Yes** — six false "it's missing" claims in a prior session, already written up | The habit fired *before* the claim this time: control-grep first, then trust the empty result. This is the write-up working. |
| Severity accepted before reachability checked | 1 (mine, then the auditor's) | No — this packet is the write-up | Asking "what mounts this?" as a required step, not an afterthought |
| Source-text assertion matching my own prose | 1 | No | Stripping comments before matching; runtime cases carry the proof |
| Windows shell escaping (`mklink` via Git Bash) | 3 attempts | Informally, twice before | Write the `.bat` file. Still not a written rule — **candidate for one.** |

The absence-claim row is the useful one: it is the only class here that had a prior write-up, and
it is the only one that did **not** become a real error. A lesson that changes the order of your
commands works; a lesson that only adds caution does not.

## External-model calibration

- **z-ai/glm-5.3** (money-path + auth-core audit, 12 files, 43k in / 15k out, 319s): 3 findings
  verified this session → **2 real exactly as described** (F2 cart role escalation — reproduced
  live in a runtime test; F3 ACH `isActive` + quantity gaps — both halves confirmed at file:line),
  **1 real-in-code but wrong-in-severity** (F1: accurate reading of a module with zero runtime
  importers, rated HIGH). It also **missed a 4th instance of its own F2 class** that a local sibling
  sweep found in one grep.
  **Verdict:** GLM reads code accurately, quotes it honestly, and — importantly — declared its own
  reachability gaps in an open-items list rather than bluffing past them. Worth its cost for
  *finding* money-path defects. It is structurally incapable of *ranking* them from a file dump, and
  cannot sweep for siblings. Route to it for discovery; rank and sweep at home, always.

## What carries forward

1. Verify **reachability** before accepting any external finding's severity. Mount order beats code reading.
2. Validate the instrument before believing a negative — prove your grep can find something before trusting an empty result.
3. Before "move X to Y", check whether Y already does X.
4. Mutation-test every guard you write: see it go red once.
5. Run the sibling sweep yourself. An external audit sees the files you gave it and nothing else.