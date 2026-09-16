---
title: Verify the enforcement plane, not just the mechanism
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-18
decision: Before designing enforcement, verify the PLANE it runs on with a live query — "add it to CI" is a claim about infrastructure, and infrastructure is a fact to check, never an assumption to inherit.
status: draft
models_used:
  - model: claude-opus-5
    role: designer; wrote the blueprint and found the plane defect
    did: grounded four recommendations against the repo, which corrected three of them before any code was written
    cost: subscription (flat-rate)
  - model: tencent/hy3
    role: blueprint hostile reviewer
    did: found the wiring meta-test is circular for its CI half, and that the build order would trigger day-one red and permanent bypass
    cost: ~$0.0035
  - model: glm-5.3
    role: blueprint hostile reviewer
    did: review returned; unread at packet time
    cost: $0 marginal
  - model: moonshotai/kimi-k3
    role: blueprint hostile reviewer, design judgment on failure-message copy
    did: in flight at packet time
    cost: pending
skills_touched:
  - id: swan-orchestrator
    change: proposed
    motivated_by: a pre-task gate that forces recursive planning did not force verifying that the infrastructure a plan depends on actually runs
  - id: cross-env-verify
    change: proposed
    motivated_by: the skill exists to stop agents believing something is broken without checking; the inverse failure — believing something WORKS without checking — has no equivalent gate
privacy: IDs and roles only; no client data; paths repo-relative; secret-scanned before commit
---

# Verify the enforcement plane, not just the mechanism

## The one-line lesson

**"Put it in CI" is a claim about infrastructure.** Verify the plane your enforcement runs on with a live query before designing on top of it. Checking that your *mechanism* works at every level is not the same as checking that the *thing you plan to attach it to* works at all.

## What happened

After shipping a documentation-integrity gate that turned out to run on only one machine, the obvious fix was "put the check in CI." That recommendation survived my own writing, three reviewer dispatches, and a commit message.

Then I ran one command:

```
gh run list --limit 15   →   15 of 15: startup_failure, 0s
```

Every run. Including my own pushes from minutes earlier, on `main`. All four workflow files parse. Actions are enabled with `allowed_actions: all`. The repo is private, so runs consume paid minutes — cause narrowed to billing, **not verified**, because the billing endpoint needs an auth scope I declined to self-grant.

A second, independent check:

```
gh api .../branches/main/protection   →   403, requires GitHub Pro (private repo)
```

**So CI does not run, and even fixed it could not block a merge.** The entire recommendation rested on an enforcement plane that does not exist in this repository.

## Why this is worse than an ordinary miss

**The answer was already written down.** A handoff from five days earlier stated *"CI is dead. All 30 most recent runs are startup_failure."* It sat in the same directory I was writing into. The repo's own coordination doctrine says to read peers' committed findings before forming a plan; I formed the plan anyway.

**The precedent I chose to copy is itself an instance of the disease.** I cited an existing workflow as the model, approvingly quoting its header:

> *"the guards were shipped as npm scripts wired to NOTHING — no workflow, no hook, no build step — so they only ran if a human remembered to type them. A guard nobody runs is not a guard."*

**That workflow has never run once.** A perfect articulation of the lesson, living inside a live violation of it. **Good prose is not evidence of a working mechanism** — which is the thesis of the entire workstream, and I fell for it inside a blueprint about it.

## Who did what

- **Opus 5 (me)** — wrote four recommendations from reasoning, then grounded them, which corrected three. Found the plane defect by verifying the one assumption underneath everything. Wrote the blueprint before code, which is the only reason this cost minutes instead of hours.
- **HY3** — two HIGH architectural findings, both correct: the "wiring meta-test" is circular for its CI half (it only executes because a workflow invoked it, so a deleted workflow means it never fires — it validates the case that cannot happen); and the build order would produce day-one red, whose predictable human response is `--allow-fail`, defeating the gate permanently.
- **GLM-5.3 / Kimi K3** — dispatched on the same blueprint; results outside this packet's window.

## Skills created or changed

None built. Two proposed:

- **A plane-verification step in the pre-task gate.** Recursive planning already forces a plan; nothing forces *"list the infrastructure this plan assumes, and query each one live."* One command would have caught this.
- **An inverse to `cross-env-verify`.** That skill exists to stop an agent believing something is *broken* without checking. The mirror failure — believing something *works* without checking — has no equivalent gate, and it is the more expensive of the two because it produces confident designs rather than wasted searches.

## Mistakes I made

- **Recommended a fix built on unverified infrastructure**, and carried it through writing, review dispatch, and a commit before testing it.
- **Did not read the handoff that already answered the question**, in the directory I was actively writing to.
- **Quoted a precedent approvingly without checking it ran** — selected *because* its comment articulated the lesson well.
- **Proposed a cleanup from a hunch.** "Audit the enforcement claims, the hit rate suggests more." Measured: 17 artifacts cited, **zero unresolvable**. I would have built a cleanup for a clean corpus. Measurement also revealed the re-scoped gate needs an exemption for deliberate *negative* citations — without which it fails on the very commit that cured the disease.
- **Got the build order backwards**, caught by a reviewer rather than by me.

## Error → fix → repeat ledger

| error class | times this session | written up before recurring? | what finally stopped it |
|---|---|---|---|
| Believing a mechanism works without querying it | 2 (the gate's own distribution; then CI itself) | **yes** — the first instance was written up hours before the second | Nothing yet. Proposed: a plane-verification step in the pre-task gate. |
| Designing from reasoning rather than measurement | 1 of 4 recommendations (R4) | no | Grounding every recommendation before writing code |
| Not reading peers' committed findings before planning | 1 | **yes**, it is written doctrine (R1c) | Nothing yet |
| Claim asserted from local state as repository state | 2 | yes | Proposed: evidence stamps cite a SHA/CI run |

**The first row is the payload.** The same class fired twice in one session: first the gate that worked but did not travel, then the CI plane that does not run. The first was written up in a durable packet *before* the second occurred. **A lesson documented and then repeated is proof the write-up is not the fix** — every correction that has actually held this session was procedural (`git -C`, use the file tool, cite a SHA), never resolutional.

## External-model calibration

- **HY3** (~$0.004) — best value observed this session. Both findings were architectural and load-bearing; neither was cosmetic. Its two HYPOTHESIS items were cheap to settle and both were disproven by one command each, which is the correct way for a reviewer to be wrong.
- **Standing pattern across every model this workstream:** reviewers are strong on observation and architecture, and their *mechanism* claims need executing. That rule applies to the author too, and this packet exists because I exempted myself from it on the one claim that mattered most.

## Open — owner-gated

- **GitHub Actions billing.** Blocks real enforcement for this repo and four other dead workflows. Cannot be verified or fixed by an agent.
- If it clears, ship the designed order (pin known-red tests → CI workflow → consumer/artifact gates).
- If it does not, build the checks trivially runnable and loud, and **state in canon that enforcement here is procedural, not mechanical.** Writing "enforced by CI" into doctrine while CI does not run would be the same defect, one more time.
