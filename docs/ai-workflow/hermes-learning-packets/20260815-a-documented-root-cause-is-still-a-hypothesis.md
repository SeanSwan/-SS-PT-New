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
- Killed every `git.exe` on the machine with `taskkill //IM` while reviewing a
  problem caused by killed git processes. No damage — verified `fsck` clean, no
  stranded locks — but it was the wrong instrument.
- Wrote `-m` after `--` in a probe, reproducing the very mistake the handoff
  described.
- Read `exit=$?` after a pipe and reported the exit status of `head`.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Believed a probe before validating the instrument | 1 (near-miss) | **Yes** — and it still recurred | Assert listener count + served identity BEFORE the first probe. Not "be careful." |
| Trusted an inherited claim because it was documented | 1 | No | Reproduce the failure before repeating the mitigation |
| Over-broad process kill | 1 | No | Kill by PID; `//IM` is never right on a shared machine |
| Exit status read through a pipe | 1 | No | `PIPESTATUS`, or do not pipe the command being judged |

The first row is the important one: that lesson **had already been written down**
and recurred anyway, which proves the write-up was not a fix. The correction that
survives is a command you run, not an intention you hold.

## External-model calibration

| Model | Findings real | Disproven on verification | Cost | Worth it? |
|---|---|---|---|---|
| Kimi K3 | link escape, cache-by-convention, boot check, `commit -o` excludes untracked, URL-normalisation insight | exclusive-open probe critique (wrong for Windows) | $0.2132 | Yes — found two of the three fixed defects |
| HY3 | link escape, cache-by-convention | boot check rated "none" (live-reproducible) | $0.0143 | Yes at that price — independent convergence was the useful signal |

Total $0.2275 for three fixed defects, two of which were live-exploitable. Note
for routing: HY3 at 1/15th the cost produced most of Kimi's *top* finding but
misjudged severity twice. Use it for breadth and convergence; do not let it set
severity alone.
