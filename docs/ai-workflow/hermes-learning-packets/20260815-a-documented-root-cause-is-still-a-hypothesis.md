---
originating_model: claude-opus-5
tier: fable
date: 2026-08-15
topic: verification discipline — instruments, layered defences, and inherited root causes
models_used:
  - model: claude-opus-5
    role: reviewer + builder
    did: ran the hostile review, live-exploited three defects, corrected the inherited root cause, wrote the fixes
    cost: subscription
  - model: moonshotai/kimi-k3
    role: hostile panel
    did: named the link escape as the most under-rated item (correct); explained why mutation testing cannot separate the traversal layers (correct); rated the boot check medium (correct); claimed an exclusive-open probe proves nothing about a live lock owner (POSIX-correct, wrong for the Windows host it ran on)
    cost: $0.2132
  - model: tencent/hy3
    role: hostile panel
    did: independently named the same link escape (correct); rated the boot-check defect "none" (WRONG — it was live-reproducible and would have retired a healthy instance)
    cost: $0.0143
skills_touched:
  - id: rule-73 proof-before-done
    change: reinforced
    failure: a passing unit suite would have missed all three defects; only booting the real bundle surfaced them
  - id: feedback_validate_probe_before_absence_claim
    change: amended in practice
    failure: the memory covers disbelieving a NEGATIVE; I nearly shipped a false POSITIVE from the same root cause (unvalidated instrument)
title: A documented root cause is still a hypothesis
tier_basis: fable
decision: unknown
status: draft
privacy: secret-scan clean (key/token/DB-URL shapes only); PII NOT independently verified
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-tier; decision=unknown [CORRECTED 2026-08-16 — topic left in place; a subject is not a rule]; status=draft (never reviewed against a contract); privacy<-key-shape scan only (PII unverified) [CORRECTED 2026-08-16]); originating_model untouched
---

# A documented root cause is still a hypothesis

## The lesson

An inherited handoff said: *"Git takes the index lock BEFORE it validates
arguments. A malformed command strands the lock."* It was written up in a
handoff, a panel record, and a durable learning packet. Three artifacts, one
untested claim.

It is wrong. A pathspec error self-cleans:

```
git commit -o -- nonexistent.txt -m "x"   → exit 1, no .git/index.lock
```

What actually strands the lock is a git process that **blocks on stdin or dies
mid-operation**:

```
git commit -a -F -   (stdin never closed)
→ .git/index.lock held, 251 bytes, for as long as it waits
→ other agents: "fatal: Unable to create '.git/index.lock': File exists"
```

The 0-byte locks the fleet actually saw came from processes *killed* before
writing. The prescribed mitigation ("pass `-F <file>` before the `--`") is true
about pathspec parsing and **would not have prevented the recurrence.**

## Who did what

Opus 5 reproduced all three static-handler defects live and corrected the root
cause. Kimi K3 and HY3 *independently* converged on the same under-rated finding
— a link inside the build root defeating lexical containment — and both were
right; it was exploitable in one request. On a second finding they split: Kimi
rated the boot check medium, HY3 rated it "none", and HY3 was wrong. The pattern
worth keeping: **agreement between two models raised the priors usefully;
disagreement was the signal to go and test, and the cheaper model lost.**

## Skills created or changed

Nothing new was built. Two existing disciplines were reinforced by failure:
proof-before-done (a green 868-test suite hid all three defects — only the
running binary showed them), and instrument validation, which I had written up
for *negative* claims and then nearly violated on a *positive* one.

## Mistakes I made

- Probed a server on a port where two processes were listening and read a foreign
  app's response as my own. One step from reporting a critical routing
  vulnerability that did not exist. Caught only because the headers did not match
  the source.
- **I created the exact orphaned lock I was reviewing.** My `git commit -o` ran
  past a 2-minute harness timeout and was killed **while holding
  `.git/index.lock`** — leaving a 1.6 MB orphan in the shared tree, the fourth of
  the day. This is the strongest possible confirmation of the corrected root
  cause (killed mid-write, not malformed arguments) and the worst possible way to
  get it. `--only` rebuilds a temporary index against the whole tree; on a 706 MB
  repo with 417 dirty files that exceeds any short timeout. **A git write must
  never run under a timeout that can kill it** — background it.
- **My lock-liveness probe was itself broken, and I nearly believed it.** It
  reported `HELD OPEN` when the real message was *path not found* — I had
  interpolated a Git Bash `/c/...` path into a Windows API call, producing
  `C:\c\Users\...`. Had I trusted the verdict label I would have concluded the
  lock was live and left the tree wedged for the next agent. **Second instrument
  failure of the session**, same root cause as the first.
- Killed every `git.exe` on the machine with `taskkill //IM` while reviewing a
  problem caused by killed git processes. No damage — verified `fsck` clean, no
  stranded locks — but it was the wrong instrument.
- Wrote `-m` after `--` in a probe, reproducing the very mistake the handoff
  described.
- Read `exit=$?` after a pipe and reported the exit status of `head`.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Believed a probe before validating the instrument | **2** (port collision; then the lock probe's own bad path) | **Yes** — written up, then recurred TWICE in the session that cited it | Make the probe print what it found (listener count, file size, resolved path) so a wrong instrument is visibly wrong. A verdict string is not evidence. |
| Killed a git write mid-flight | 1 | Yes — I was reviewing this exact failure | Never run a git write under a kill-capable timeout; background it |
| Trusted an inherited claim because it was documented | 1 | No | Reproduce the failure before repeating the mitigation |
| Over-broad process kill | 1 | No | Kill by PID; `//IM` is never right on a shared machine |
| Exit status read through a pipe | 1 | No | `PIPESTATUS`, or do not pipe the command being judged |

The first two rows are the point of this packet. Both lessons **were already
written down** — one in my own memory, one in the handoff I was reviewing — and
both recurred anyway, inside the session that cited them. That proves a write-up
is not a fix. The corrections that survive are mechanical: a probe that prints
its evidence, and a git write that cannot be killed by a timeout. Neither is an
intention.

Note the shape of the second one: I orphaned a lock **while writing the document
explaining orphaned locks**. The instrument that then told me whether it was safe
to clear was itself broken. Two layers of tooling failed in the five minutes
after I declared the analysis complete — which is the argument for
worktree-per-agent in its most concrete form, since none of it could have touched
another agent if the index had not been shared.

## External-model calibration

| Model | Findings real | Disproven on verification | Cost | Worth it? |
|---|---|---|---|---|
| Kimi K3 | link escape, cache-by-convention, boot check, `commit -o` excludes untracked, URL-normalisation insight | exclusive-open probe critique (wrong for Windows) | $0.2132 | Yes — found two of the three fixed defects |
| HY3 | link escape, cache-by-convention | boot check rated "none" (live-reproducible) | $0.0143 | Yes at that price — independent convergence was the useful signal |

Total $0.2275 for three fixed defects, two of which were live-exploitable. Note
for routing: HY3 at 1/15th the cost produced most of Kimi's *top* finding but
misjudged severity twice. Use it for breadth and convergence; do not let it set
severity alone.
