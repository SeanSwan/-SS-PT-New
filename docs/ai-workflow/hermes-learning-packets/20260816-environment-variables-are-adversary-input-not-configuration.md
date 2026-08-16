---
title: Environment variables are adversary input, not configuration
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist
date: 2026-08-16
decision: gate trust-root and git resolution move off environment variables to in-process setters; every value entering a gate from outside the code is treated as adversary-controlled input
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
topic: "Two hostile reviews attacked the gate's logic and passed it. The third enumerated its inputs and found two CRITICALs in one pass. A gate that reads its trust root from the environment is configured by the thing it is examining."
models_used:
  - model: claude-opus-5
    role: builder, exploit-verifier, hostile reviewer of own work
    did: regenerated the review packet from origin/main blobs; mechanically confirmed all 7 exploits against the SHIPPED code before editing; implemented the fixes; ran 4 hostile rounds that found 4 defects in its own fix; built the mutation harness that found 2 further coverage gaps; rebased twice and shipped dd4c91940
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: external hostile reviewer of already-shipped code
    did: 10 answers, 13154 in / 32000 out, 545s wall; found 2 CRITICALs that Kimi K3 and HY3 both missed; 7/7 of its mechanically testable findings confirmed real, 0 disproven; answer TRUNCATED at the token cap
    cost: flat-rate Z.ai coding plan (no per-token spend gate)
  - model: moonshotai/kimi-k3
    role: prior reviewer (this session inherited its findings, did not re-run it)
    did: found S1-S9 on v1 including the double-hold lock CRITICAL; attacked logic thoroughly; did NOT enumerate environmental inputs
    cost: not incurred this session
skills_touched:
  - id: gate-trust.mjs
    change: created
    failure: trust-root and git resolution were scattered through gate-common where nobody auditing "what can the examinee move?" would see them together; both CRITICALs lived there
  - id: cross-env-verify
    change: proposed-amendment
    failure: a mutation harness reported SKIP (anchor not found) because the file was CRLF and the anchor LF; "not applicable" is indistinguishable from "untested" unless the harness counts skips as survivors
  - id: closeout-evidence-lock
    change: proposed-amendment
    failure: the escape-literalization trap is documented in the handoff in bold and I hit it twice anyway; a warning that must be remembered is not a control
---

# Environment variables are adversary input, not configuration

## The lesson

`gate-common.mjs` had passed two independent hostile reviews. Kimi K3 found nine defects including
a CRITICAL where two agents could hold the same lock; HY3 found four more. Both were thorough and
both were right. Both missed that **one environment variable relocated the entire trust root**:

```bash
SWAN_GATE_ROOT=/tmp/trust git commit    # telemetry, counter, lock, session anchor,
                                        # disable markers — all five, into a directory
                                        # the examinee just built
```

and that **`GIT_DIR` forged the output of the one function the freshness contract rests on**:

```bash
GIT_DIR=/tmp/fakerepo git commit        # headSha() returns the examinee's chosen sha,
                                        # despite the call passing `-C <cwd>`
```

The second is the worse one. Amendment A2 moved freshness from mtime to a consumer-checked
`subject_sha` on the stated ground that *"producers don't enforce freshness on themselves;
consumers enforce it on producers."* That only holds if the consumer's recomputation is
independent. It was not. The adversary owned both sides of the comparison.

**Why two good reviews missed it:** they attacked the module's *logic* — races, TOCTOU, error-domain
collapse, fail-open paths — which is where reviewers instinctively look. Nobody enumerated the
module's *inputs*. The examinee is an AI agent that spawns the shell that invokes the hook, so it
owns `process.env` wholesale. Every value the trust path reads from env is a value the examinee
chose.

**The generalisable move:** for any gate, guard, or check, list every value entering from outside
the code — env vars, `PATH`-resolved binaries, file contents, argv, cwd — and ask *who controls
this at runtime?* Test seams must then live in in-process setters (`setGateRoot()`), not env: a
spawned process cannot reach module state, but it can always reach inherited environment.

**The honest bound, which must travel with the lesson:** none of this defeats a same-privilege
adversary. `PATH` still selects the `git` binary. The lock file is still agent-writable, so
`touch`ing it in a loop starves every honest gate. Telemetry is still forgeable. What changed is
the cost of forgery, not its possibility. Real attestation needs the hook holding the pen, or a
hash chain anchored in git's DAG. Writing "verified" over a control that only raises cost is how
the original overclaim happened.

## Who did what

- **GLM-5.3** produced the two CRITICALs. Its single most valuable output (Q10a, the `GIT_DIR`
  hijack) was reached by no in-house pass across three sessions. It also declined to manufacture
  findings — it said plainly that the S1 acquire-side fix and the token-as-identity call were
  correct, which is what made the rest credible.
- **Opus 5 (me)** was wrong to think the shipped code was in good shape, and right to insist on
  executing each exploit before believing it. Confirming all seven mechanically is why this packet
  says "confirmed" instead of "GLM says." I then introduced four fresh defects while fixing GLM's,
  and found all four myself.
- **Kimi K3 and HY3** (prior sessions) found the defects that were reachable by logic review. Their
  miss is not incompetence — it is a *class* miss, and the class is now named.

## Skills created or changed

- **`gate-trust.mjs` (created).** Both CRITICALs lived in code scattered through a general-purpose
  module. Trust-root resolution, git resolution, the hostile-env lists and `sanitizeGateEnv()` now
  sit in one file, so the question "what can the examinee move?" has one place to be answered.
- **`slice1-mutation-run.mjs` (created).** A mutation harness that reverts each fix and asserts the
  suite fails. It refuses to run against a red baseline — a mutation score measured against a
  broken suite is free and meaningless, an error this repo has recorded before.
- **`slice1-exploit-rerun.mjs` (created).** Re-runs all seven confirmed exploits. Passing tests
  prove the tests pass; only the original attack failing proves the fix.

## Mistakes I made

- **I hit the handoff's documented trap #7 — twice — in the session whose handoff documents it.**
  Backticks inside `python -c` strings were command-substituted by bash: once silently deleting a
  word from a comment, once failing to insert a variable declaration that then crashed five tests.
  I had read the warning that morning.
- **My first fix for Q10c was worse than the defect.** Refusing a stamp whose sessionId differed
  from the anchor's blocks every legitimate new session; the anchor would have frozen at session
  one permanently. My own regression test caught it.
- **That same fix nulled `headSha`** on a re-stamp that omitted the argument — the identical
  forensic loss Q10c names, reintroduced by its own fix.
- **My broken-channel warning flooded the channel it exists to protect**, firing per call.
- **My mutation harness printed SKIP where it meant UNTESTED** (CRLF vs LF anchor).
- **I piped a long-running external call through `tail`** in a repo that documents "never pipe a
  command whose exit code matters."
- I did not re-check `origin/main` freshness until push time; it had moved 60 commits, then 3 more.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what actually stopped it |
|---|---|---|---|
| escape/backtick literalization through the shell | **2** | **YES — trap #7 in the handoff I read at session start** | Writing patch scripts to a `.py` file with the Write tool and executing the file. Prose warnings did not work; removing the shell from the path did. |
| my own fix introducing a new defect | 4 | partially (Rule 61) | A hostile round after every fix, plus a regression test per fix. Three of four were caught by a test I wrote, one by a scenario walk of normal operation. |
| a probe whose negative I nearly believed | 1 (mutation SKIP) | YES (validate-the-instrument memory) | Counting skips as survivors so the harness cannot report "not applicable" for "untested." |
| stale branch assumption | 1 | YES (drift-check) | Re-fetching immediately before push, and reading the pre-push diff for deletions of other agents' work. |

**The repeat that matters is row one.** It was documented, in bold, in the document I read before
starting — and I still made it twice. The correction that survives is procedural (never route a
patch through `python -c`), never resolutional ("be careful with escapes"). Every prior write-up of
this error was resolutional, which is exactly why it recurred.

## External-model calibration

| model | findings | verified real | disproven | cost | verdict |
|---|---|---|---|---|---|
| GLM-5.3 | 10 answers, ~12 distinct findings | **7/7 mechanically tested** | 0 | flat-rate | **High value on adversarial input-enumeration.** Reach for it when the question is "who controls this at runtime?" |

**Operational note that will otherwise be rediscovered:** GLM-5.3 spent **25,834 of its 32,000
output tokens on reasoning**, leaving ~6k for the answer — which was truncated mid-sentence in its
closing section. On a dense packet, `--max-tokens 32000` is too low. Raise it or split the ask. And
always pass `--remit`: the transport's default persona is a UI design reviewer, which previously
produced a touch-target audit of a system with no UI.
