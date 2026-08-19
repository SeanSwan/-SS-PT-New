---
originating_model: claude-opus-5
tier: fable
date: 2026-08-15
topic: Git drift measurement — "ahead N" lies in two distinct ways
durable: true
models_used:
  - model: claude-opus-5
    role: orchestrator, synthesis, verification
    did: enhanced the design brief with measured scale; ran the git probes that found both traps; caught and retracted its own false alarm; fused three designs; resolved the read-only contradiction
    cost: subscription
  - model: moonshotai/kimi-k3
    role: design panel — correctness
    did: three-layer architecture, (tip_sha,main_sha) cache key, 24h stale-main hard-fail, reverse-apply layer for squash-merges, measure-before-build gate, non-mutating `git stash create`
    cost: $0.1351
  - model: glm-5.3 (Z.ai coding plan)
    role: design panel — systems thinking
    did: `regression-risk` verdict (merge forbidden by construction), `active-lane` verdict, sensitivity-weighted aging, self-snitch metric, named the false-confidence↔abandonment tension
    cost: subscription; 25,671 out of which 18,889 reasoning (73%), 386.7s
  - model: tencent/hy3
    role: design panel — information design
    did: group-by-action report, [PUSH]/[ARCHIVE]/[HUMAN] markers, negative confirmation. ALSO proposed a destructive `git stash` on a live working tree — rejected
    cost: $0.0040
skills_touched:
  - id: recon (proposed, unbuilt)
    change: proposed
    motivated_by: audits read origin/main while unshipped work sits in 409 local branches, so findings describe stale reality and unpushed risk is never audited
  - id: drift-check (existing)
    change: amended-by-implication
    motivated_by: detects "you are behind"; has no inverse direction (work that exists but never shipped). recon is the complement, not a replacement
  - id: rule-51 confidence tags
    change: reinforced
    motivated_by: a `[LIKELY]`-grade inference from `[ahead 77]` was written into a spec as an "Immediate finding" without a verification tag
---

# Git drift measurement: "ahead N" lies in two distinct ways

## The lesson

Two independent failure modes make branch-drift counts unusable as evidence. Both were
measured on a real 409-branch repo, not reasoned about.

**Trap 1 — squash-merge inflates content-absence.** `[ahead 68]` vs **1** genuinely-absent
commit (`git cherry -v origin/main <branch>`). 67 landed by squash-merge; branch never deleted.

**Trap 2 — `%(upstream:track)` measures the wrong target.** `[ahead 77]` on a branch whose
`git merge-base origin/main <branch>` returns *the branch's own tip* — i.e. an ancestor of main,
**0 ahead**, fully shipped. The 77 counts distance from `origin/<branch>`, the branch's own
remote copy, which is irrelevant once work lands in main via PR.

Trap 2 is the more dangerous: an overcount is wrong, a **category error** is wrong while
looking right. Every branch with a stale remote copy reports "ahead" forever.

## Correct probe order (cheapest first, short-circuiting)

1. `git merge-base --is-ancestor <tip> origin/main` → contained ⇒ landed (high confidence)
2. two-dot `git diff origin/main <tip>` empty ⇒ landed (catches rebases; commits differ, tree matches)
3. `git cherry -v origin/main <tip>` ⇒ patch-id absence. **Defeated by squash-merge.**
4. net-patch reverse-apply onto main (finalists only) ⇒ catches what 3 misses. **Defeated by context drift.**
5. methods disagree ⇒ `unknown`. Never average, never guess.

Every failure mode above points the same direction — toward false "absent." A tool built on
these must expect over-reporting and be measured for false-absent rate before expensive layers
are built on it.

## Who did what

**Opus 5 (me)** ran the probes and found both traps, then committed the exact error the work
exists to prevent — see mistakes. Enhanced the brief with measured scale before spending models,
which is why all three returned specific rather than generic designs. Resolved the one dangerous
contradiction in the panel.

**Kimi K3** produced the most *correct* engineering: the cache-key insight (keying on tip SHA
alone lets stale verdicts survive when main moves), the stale-main hard-fail, and the
reverse-apply layer that specifically covers `git cherry`'s squash-merge blind spot. Also the
only model to use `git stash create` — a dangling snapshot commit that does not touch the
working tree or stash list.

**GLM-5.3** produced the best *systems* thinking. Two verdicts nobody else had: `regression-risk`
as a state where merge is forbidden **by construction** rather than discouraged, and
`active-lane` as untouchable. It also named the tension no one else articulated: hardening
against false confidence adds gates, and gates cause abandonment — so the two top failure modes
have directly opposed fixes and there is no solution, only a dial.

**HY3** produced the best *report*, and a dangerous mechanism. Group-by-action with
`[PUSH]`/`[ARCHIVE]`/`[HUMAN]` markers beat both competitors on scannability, and it alone
included negative confirmation ("payments/: verified NO unpushed changes"). But it proposed
`git stash` on a live 419-file working tree, and over-trusted patch-id — the signal squash-merge
defeats, which is this repo's dominant merge style.

## Skills created or changed

- **`recon` (proposed, unbuilt)** — motivated by: audits read `origin/main`, unshipped work is
  invisible to them, and the naive implementation is destroyed by both traps above. Phase 1 is
  the truth filter alone, gated on measuring false-absent rate ≤20% before further build.
- **`drift-check` (existing)** — recon is its inverse. drift-check answers "am I behind?";
  recon answers "what have I written that never shipped?" They should cross-reference, not merge.
- **Rule 51 (confidence tags)** — reinforced by failure: an inference was written into a spec as
  a finding with no tag. Had it carried `[HYPOTHESIS]`, the verification would have been forced.

## Mistakes I made

- **Wrote a false launch-blocking alarm into a deliverable.** Flagged `equipment-p0-safety`
  as possible unshipped P0 safety work missing from a pre-launch security audit. Four git
  commands disproved it. The damning part: I did this **inside a document whose central thesis
  is "commit counts lie."** Knowing a rule and applying it while carrying momentum are separate
  capabilities, and the second one fails under time pressure.
- **Nearly accepted an empty probe as a negative result.** `git cherry` returned zero lines;
  first reading was "nothing stranded." Empty output cannot distinguish "no differences" from
  "command failed." Only separately checking exit code, branch existence, and merge-base
  resolved it. A prior memory on validating instruments before believing absences is the only
  reason that check ran.
- **Assumed environment inheritance instead of testing it.** Three attempts at one consult:
  key missing in Git Bash, then missing in a PowerShell child, before loading it explicitly.
  Windows children inherit the parent's **environment block**, not the registry — a USER-scope
  variable set after a shell starts is invisible to that shell and everything it spawns.
- **Called a reasoning model without streaming.** GLM-5.3 emitted nothing for ~300s while
  spending 18,889 reasoning tokens; Node's fetch aborts at `UND_ERR_HEADERS_TIMEOUT`. Reasoning
  models require `stream: true` so headers return immediately. Silent trap: identical code works
  on non-reasoning models.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Trusted a structural anomaly's *headline number* instead of resolving it | **2** — the key's odd character earlier, `[ahead 77]` here | **YES** — written up hours earlier in the same session | Nothing yet. Both times the correct move was one cheap command run *last* instead of first. Needs a procedural trigger, not a resolution. |
| Believed an absence without validating the probe | 1 (caught) | YES — prior memory | The memory fired; explicit exit-code + merge-base cross-check |
| Assumed env/config inheritance rather than testing | 1 | no | Explicit registry→process load |
| Called a long-running model without streaming | 1 | no | `stream: true` + progress ticks |

**The first row is the highest-signal entry in this packet.** The same error class recurred
**within a single session**, after being explicitly documented in that same session, in a
document *about* that error class. This proves write-ups do not prevent recurrence. The
correction that has any chance of surviving is procedural: **when a number looks alarming,
resolving it is the first command, not the last** — because alarm creates the momentum that
suppresses verification.

## External-model calibration

| Model | Cost | Findings real on verification | Best used for |
|---|---|---|---|
| Kimi K3 | $0.1351 | All correct; caught the squash-merge/patch-id interaction unprompted | correctness-critical design, adversarial review |
| GLM-5.3 | subscription, 73% reasoning tokens, 386s | All correct; unique structural verdicts | systems architecture where tradeoffs matter more than speed |
| HY3 | $0.0040 | Design excellent; **one destructive mechanism**, one over-trusted signal | presentation/IA layers where a human sees wrong answers immediately — never mechanisms that execute |

**Routing rule earned here:** the 30× cheaper model won on information design and failed on
correctness. Spend by *consequence of being wrong*, not by task size. A wrong report layout is
visible instantly; a wrong git mechanism runs against a live working tree.

**Convergence signal:** all three architectures independently named "false confidence at the
human approval moment" as top-severity. Independent convergence across differing designs is
stronger evidence than any single model's confidence.
