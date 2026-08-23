---
originating_model: claude-opus-5
tier: fable
date: 2026-08-21
topic: A green suite is evidence only about what you thought to check
decision: Mutation-test any test written to prove a fix; verify the target environment before calling a gate green
status: shipped
supersedes: none
privacy: ids-and-roles-only
models_used:
  - model: claude-opus-5
    role: grounded verifier, builder, Final Decider
    did: falsified 4 of 13 claims in an external audit by file-read; built S11/S4a/S4b/S2/S5/S6; then committed the SAME over-claiming error class five times in its own work and caught four of the five itself
    cost: subscription
  - model: z-ai/glm-5.3
    role: hostile panel seat
    did: caught the private-repo 7GB runner vs 12GB heap blocker that would have shipped a red-on-arrival gate; caught the gate silently skipping 150 test files; caught the empty not_wired bucket; named the HMAC-is-inert argument
    cost: $0 (Z.ai plan credit)
  - model: x-ai/grok-4.6
    role: hostile panel seat
    did: caught the incomplete Map facade behind a byte-for-byte claim; proposed the env-fallback grep as a new investigative action rather than only judging
    cost: ~$0.19
  - model: moonshotai/kimi-k3
    role: hostile panel seat
    did: caught five precise numbers written into a block declaring every number in it wrong; caught the sweep force-releasing live locks; challenged an unverified opacity contrast
    cost: ~$0.05
  - model: qwen3.8:27b local
    role: free hostile seat
    did: agreed on substance in both panels; misread an audit's proposal as a claim of existence — right conclusion, wrong reason
    cost: $0
skills_touched:
  - id: Rule 56 (Tier-A baseline disclosure)
    change: reinforced
    failure: claimed a CI check green on evidence from a 66GB dev machine when the target runner has ~7GB — the disclosure rule exists for exactly this and was not applied
  - id: Rule 73 (proof-before-done)
    change: extended in practice
    failure: a passing test was treated as proof a fix worked; mutation testing showed the test passed with the fix deleted
  - id: Rule 4 (300-line cap)
    change: reinforced
    failure: shipped a 370-line test file in the same workstream that exists to enforce standards; three seats flagged it independently
---

# A green suite is evidence only about what you thought to check

## The lesson

**A passing test proves the test passes. It does not prove the code works.** The only
way to know a test is load-bearing is to break the thing it guards and watch it go red.

Three separate times this session a test or a guard looked protective and protected
nothing:

- A UI badge stretched full-width like a banner instead of hugging its text. **All 853
  frontend tests passed** throughout. Tests assert behaviour; nothing asserted geometry.
- A boot-time safety guard was written, reviewed, and committed **without being wired to
  anything**. It would have logged nothing, forever.
- A rate-limiter test asserted `not.toThrow()` and "user allowed again". Both pass with
  the entire fix deleted — the second because a pre-existing auto-release path produces
  the same observable.

The third one is the important one, because **the replacement I wrote for it was equally
vacuous, and only mutation testing revealed that.** I deleted the sweep loop, re-ran, and
my new test still passed. The reason was structural: the code already filtered stale
entries on every call, so eviction had *no behavioural signature at all*. No behavioural
test could ever have worked. The fix was a minimal read-only inspection seam — counts
only, never keys — so the property could be asserted rather than asserted-about.

## The second lesson: verify the environment, not just the code

The single highest-value finding across two panels was environmental, not logical.

A CI gate was built with every blocking check "verified green locally first" — a
principle written into the workflow's own header. One of those checks asks for a 12 GB
heap. The repository is **private**, so the CI runner has **~7 GB total**. The check
cannot run there at any heap setting. The local verification was performed on a 66 GB
machine and proved nothing about the target.

**Local green is not CI green. Prove the constraint, not just the code.** The cheapest
version of this check is one command: confirm repo visibility, because it determines
runner size.

## Who did what

**Opus 5** did the grounded verification that falsified the original audit — reading
`/confirm` and finding it accepts only an `operationId`, killing a fabricated headline
P0. It then built six slices and committed the same class of error it had just spent
hours documenting, five times over.

**GLM 5.3** was the strongest external seat across both panels. It found the 7 GB runner
blocker, the 150 silently-skipped test files, and the empty `not_wired` bucket that
weakened the audit's headline framing. Its "the HMAC is inert" argument — with a
per-process secret *and* a per-process store, no signed payload crosses a trust boundary,
so the crypto guards nothing — reordered the entire fix list. Slowest seat (172s, 351s);
worth the wait every time.

**Grok 4.6** was the only seat that proposed a *new investigative action* rather than
only judging: grep every `process.env.X || fallback` as a systemic class. Running it
narrowed its own hypothesis — 25 hits, 24 benign, one security-critical. A seat that
generates work is worth more than one that grades it.

**Kimi K3** was accurate and found what others missed on the second pass, including the
self-contradiction of writing five precise numbers into a block that declares every
number in it wrong.

**Qwen 3.8** got the substance right in both panels and the reasoning wrong once,
calling a proposed architecture "a hallucination" when the audit had proposed it as
future state and never claimed it existed. Free, fast, worth hearing, never the lead.

**All four external seats missed** that a whole "gap" in the original audit was false —
a proactive nudge subsystem that ships and starts at boot. It fell outside the evidence
packet they were given. **A seat's silence is unverified, never agreement.**

## Skills created or changed

- **Mutation testing became the standard for any test written to prove a fix.** Not a
  general practice — specifically: when a test's job is to demonstrate that a repair
  works, delete the repair and confirm the test fails. Adopted after a fix-verifying
  test passed against the deleted fix.
- **Environment-constraint check before claiming a CI gate green.** Repo visibility
  determines runner size; runner size determines what can run at all. One command,
  before writing "verified".
- **The evidence packet defines the panel's blind spot.** Findings outside what the
  packet contains cannot be produced by any seat, however good. Panel silence carries no
  information about anything not in the packet.

## Mistakes I made

- **Claimed "the backend suite is green" having measured only one subdirectory.** The
  full suite was still red on five files. Scoped measurement, unscoped claim.
- **Built a safety guard and never wired it.** Committed as if complete. This is the
  same "looks protective, protects nothing" defect I had criticised in the HMAC twenty
  minutes earlier.
- **Wrote a test asserting an expiry exists but never that it is enforced.** An expired
  approval could have been accepted with every test green.
- **Wrote "byte-for-byte the previous Map" about a facade missing five Map methods.**
  Audit showed nothing broke — but the claim was wider than the evidence.
- **Wrote five precise numbers into a comment block that says every number in it is
  wrong.** Reproduced the exact drift mechanism the block warns about, in the block.
- **Shipped a 370-line file in the workstream enforcing a 300-line cap.**
- **Called a CI check verified on a machine 9× the size of the target runner.**
- **Put required closeout sections in the message before the final one, twice**, so the
  closing message carried neither.
- **Broke my own files twice with the same shell-quoting error** — backticks inside a
  double-quoted `python -c`, command-substituted by bash, silently eating words from
  comments. Second occurrence came after the first was diagnosed.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Already written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Claim wider than evidence** | **5** (suite-green, byte-for-byte, unwired guard, registry numbers, CI-verified) | **Yes — I authored the report about it, then repeated it 5×** | Nothing procedural yet. Four were caught by changing vantage; one by an external seat. Awareness demonstrably did not prevent it. |
| Test that cannot fail | 3 (geometry, expiry, sweep ×2) | Yes, after the first | **Mutation testing** — the only method that caught the vacuous replacement |
| Shell backtick corruption | 2 | Yes, diagnosed on first occurrence | Not fixed by awareness. Procedural fix: never put backticks in a double-quoted `python -c`; use a file or single quotes. |
| Closeout sections misplaced | 2 | Yes | Put every required section in the *final* message, never a preceding one |

**The highest-signal row is the first.** I wrote a 400-line report whose thesis is
"an audit that says *appears to* has told you it inferred rather than read" — and then
made that identical error five times within hours. **Documenting a failure mode provides
no protection against it.** Every instance that was caught was caught by a *procedure*:
running a different command, attacking from a vantage not yet used, deleting the code and
re-running, or a second model reading the diff. None were caught by remembering.

## External-model calibration

| Model | Findings real on verification | Disproven | Cost | Verdict |
|---|---|---|---|---|
| GLM 5.3 | Nearly all, incl. the only true blocker | 0 material | $0 (plan) | **Best seat two panels running.** Slow; always worth it |
| Grok 4.6 | High | 1 narrowed (env-fallback class → single instance) | ~$0.23 total | Only seat that proposes new investigation |
| Kimi K3 | High | 1 partly (facade break was hypothetical; no call site affected) | ~$0.11 total | Accurate, finds what others miss on second pass |
| Qwen 3.8 | Substance yes | 1 reasoning error both panels | $0 | Free, fast, never lead |

Two panels, nine seat-runs, **~$0.33 total external spend.** The single 7 GB finding
would have cost far more than that in a broken required check that teaches everyone to
bypass the gate.

## What a future agent should do differently

1. Before writing "verified green" about CI, check what the runner actually is.
2. When a test's purpose is to prove a fix works, delete the fix and confirm red.
3. When reviewing your own work, change vantage — different command, different directory,
   different layer. Re-reading is not a round.
4. Treat panel silence as unverified. It reflects the packet, not the code.
5. Assume you will repeat the error class you just documented. Build the procedure.
