---
originating_model: claude-opus-5
co_reviewers: none (solo hostile review — no paid or external model consulted)
captured: 2026-08-14
surface: admin Marketing Command Center (readiness cockpit, speed-to-lead instant reply)
boards: SWA-40 lane (not updated — no Linear tool loaded in this environment)
status: shipped to branch claude/marketing-readiness-s2l-2026-08-14 (288470b8c, 18ab2724a) — NOT merged, NOT pushed
models_used:
  - model: claude-opus-5
    role: auditor + builder + hostile reviewer + final decider
    did: audited the marketing section against an external curriculum, built the speed-to-lead readiness card, ran 3 hostile rounds to dry, proved an existing security assertion was fixture luck before changing it
    cost: subscription (flat rate)
skills_touched:
  - id: rule-52 (anti-rework burden of proof)
    change: reinforced
    motivated_by: my change broke an existing security test; the rule forced me to prove the test was wrong from origin/main rather than assume my code was right
  - id: rule-27/28 (surface classification / claim-to-evidence)
    change: reinforced
    motivated_by: I built a UI upgrade before proving the component was mounted — the parent workspace does not lazy-load it, so it looked dormant
  - id: rule-56 (baseline disclosure)
    change: reinforced
    motivated_by: a borrowed node_modules produced 3 tsc errors that were install drift, not baseline defects — reporting "tsc clean" or "tsc broken" would both have been false
---

# A passing test is not a proven invariant

Durable lessons from auditing and extending a mature marketing subsystem. Privacy: IDs and
roles only.

---

## 1. A test can pass for a reason that has nothing to do with what it claims to protect

A security test asserted the readiness payload never contains the string `sendgrid_api_key`.
It had passed for months. My change broke it.

The reflex — mine, and the one worth naming — is to assume the test encodes a real invariant and
bend the new code around it. The opposite was true. The original service **already** emits that
env var *name* in `buildEmail`'s `nextAction` ("Set SENDGRID_API_KEY to enable…") and
`SOCIAL_TOKEN_ENCRYPTION_KEY_ID` in `buildSocial`'s. The assertion only passed because the test
fixture set `SENDGRID_API_KEY`, which nulled that branch and kept the string out of the payload.

It was **fixture luck**. Unmodified code under a different env would have failed it identically.
My change did not create the defect; it surfaced one that had been latent since the test was
written.

The distinction the test had collapsed: **naming an env var is not disclosing its value.** Naming
it is the entire point of operator guidance. Disclosing it is the thing that must never happen.
The replacement strips guidance fields, asserts the data surface carries no credential, then
asserts no secret *value* appears anywhere including guidance — strictly stronger than what it
replaced.

**The transferable rule:** when a pre-existing test breaks, first determine whether it encodes an
invariant or a coincidence. Ask what makes it pass *today* and whether that is the property it
names. A test that passes by fixture arrangement is a false sense of security, and it will fail
on the next unrelated change too. Proving this cost one `git grep` against origin/main. Weakening
it without that proof would have been indistinguishable from covering up a real leak — which is
exactly why rule 52 puts the burden on the person holding the diff.

## 2. "Built" and "on" are different states, and the gap between them is where revenue dies

The audit's headline finding was not a missing feature. Every major piece of the acquisition path
existed and was tested: capture, suppression, nurture sequences, instant reply, RBAC. And the
instant reply was flag-off, automation was disarmed, and DMARC was unset.

The external curriculum that prompted the audit teaches constraint thinking — a pipeline's
throughput equals its narrowest step, so automating a non-bottleneck returns nothing. Applied
honestly, it inverted the obvious plan. The intuitive next move (build a creative batch engine)
would have widened a step that was not the constraint while the constraint sat at zero.

**The transferable rule:** before proposing to build, establish whether what exists is *running*.
"We don't have X" and "we have X and it is switched off" demand opposite responses, and an
inventory of files cannot tell them apart. Check flags, arm states, and cron enablement as part of
the audit, not after.

A corollary the cockpit now encodes: **dark-by-default must not render as an alarm.** The card
reports an unset flag as `ready` with "Dark (safe)", and only escalates when the operator
*believes* it works and it does not. A cockpit that cries wolf about intentional defaults trains
the operator to ignore it, which costs more than having no cockpit.

## 3. Encode the standard's default, not its strictest reading

I shipped an on-brand-domain check as an exact apex match, `@sswanstudios\.com$`. My own hostile
round caught that a from-address on a subdomain would be reported off-domain and degraded — on a
configuration that is correct. DMARC's default alignment mode is **relaxed**, which treats any
subdomain of the organizational domain as aligned.

Strict-by-reflex produced a false alarm on a legitimate setup, in the very card whose purpose is
to not cry wolf. The fix needed a boundary (`(?:@|\.)`) so lookalikes like `evil-sswanstudios.com`
still fail; coverage went from one negative case to seven.

**The transferable rule:** when encoding an external standard, look up its default mode. A stricter
check is not automatically a safer check — in a reporting surface, over-strictness manufactures
false positives, and false positives are how a monitor becomes noise.

## 4. A borrowed toolchain cannot establish a baseline

I ran the work in a git worktree off fresh main and linked `node_modules` from the primary tree to
avoid a full install. `tsc` then reported three missing-module errors. Both packages are declared
in origin/main's `package.json` and absent from the borrowed install — the primary tree's modules
were installed against an older branch.

Neither "tsc is clean" nor "the baseline has 3 errors" would have been true. The honest report is
that the slice is type-clean and the baseline is **not verifiable through a borrowed install**.

**The transferable rule:** a shared or borrowed dependency tree invalidates global quality claims.
Report the scope the instrument actually covered. This is the same class as validating a probe
before believing a negative — an instrument you did not set up can manufacture absence.

## Who did what

- **claude-opus-5** did all of it: the audit, the build, three hostile rounds, and the final call.
  It also produced the errors in the ledger below. No external or paid model was consulted, so
  nothing here is corroborated by a second brain — treat the judgment calls (especially the
  severity semantics in §2) as one model's reasoning, not a panel verdict.
- **A prior Fable session** wrote the activation runbook that made this slice cheap. It had already
  filed the exact gap I built, and it already answered the DMARC question I got wrong. The most
  valuable artifact in the whole task was a doc a previous agent left behind.

## Skills created or changed

No new skill. Three existing rules were exercised hard enough to be worth recording:

- **Rule 52** was the load-bearing one. It is what stopped me from quietly weakening a failing
  security assertion. Without it the cheapest path was to delete the line.
- **Rule 27/28** caught a build-before-proving-mount sequencing error (see ledger).
- **Rule 56** turned a confusing tsc result into an honest, scoped report instead of a false claim
  in either direction.

## Mistakes I made

- Characterised DMARC as gating the speed-to-lead flag → caught by reading the feature's own
  activation runbook, which says the opposite → rule: read the existing runbook for a feature
  before characterising its blockers.
- Built the UI card before proving the component was mounted; the parent workspace does not
  lazy-load it, so it genuinely looked dormant → caught by my own round-2 hostile pass → rule 27/28:
  prove the JSX mount *before* building, not after. It resolved clean, but the sequencing was
  backwards and on a different day that is a wasted slice.
- Shipped an apex-only domain match that would flag valid subdomain senders as broken → caught by
  my own round-1 hostile pass → rule: encode the standard's default mode.
- Ran `mklink` through Git Bash twice with mangled path escaping before switching to a batch file.
  Minor, but it is the third time this session class of Windows-path quoting has cost a round trip.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Assumed a blocker without reading the feature's own runbook | 1 | Yes — this is the STALE-CHECK class (re-verify a carried claim before repeating it) | Reading the runbook. **This is a repeat of a documented lesson**, which means the prior write-up did not change behaviour. The procedural fix that would have worked: grep `docs/ai-workflow/AI-HANDOFF/` for the feature name as step 1 of any audit, before forming any claim about its state. |
| Build-before-mount-proof sequencing | 1 | Partially — rule 27/28 exists, but as a *claim* gate, not a *sequencing* gate | My own hostile pass. Procedural fix: the mount grep belongs in the receipt, which by rule 26 precedes code — I wrote the receipt for the backend surface and skipped it for the frontend one. |
| Windows path quoting through Git Bash | 2 | Yes — `MSYS_NO_PATHCONV` memory exists for `<rev>:<path>` | Writing a `.bat` file instead of fighting the escaping. The existing memory covers `git show`, not `mklink`; the general rule is broader than the recorded instance. |

The first row is the highest-signal entry here: a lesson that was already documented, and repeated
anyway. That is proof the write-up was not the fix. The correction that survives is procedural
("grep the handoff dir before forming a claim"), never resolutional ("read more carefully").

## External-model calibration

None. No paid or external model was consulted this session, so there is no calibration data to
add. Worth noting for the routing table: this task — audit an existing subsystem, extend it by one
card, hostile-review it — was well inside a single model's capability and did not need a panel.
Spending a Kimi/Village call on it would have bought nothing. Sean pre-authorised a Kimi panel for
the *plan*, which is the right placement: the leverage is in arbitrating what to build next, not
in reviewing a 170-line read-only reporting module.
