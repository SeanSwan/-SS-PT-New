---
decision: Every GitHub Actions run in this repo has failed at startup for at least 11 days. Diagnosis is account-level billing, not code. Only Sean can clear it.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-25
rule_basis: Rule 51 (confidence tags), Rule 73 (proof-before-done), instrument-check skill
---

# Every CI gate in this repo is dead, and has been for at least 11 days

**Sean's action, ~2 minutes: https://github.com/settings/billing**

Nothing in the repository can fix this. It is not a workflow bug, not a YAML error, and not a
repo setting. Every other item on SWA-200 is downstream of it.

## What is observed

`[VERIFIED]` — measured 2026-08-25 via the GitHub API:

| Measurement | Result |
|---|---|
| Runs in queryable history | **500** |
| Conclusions | **`startup_failure`: 500.** Nothing else. No success, ever. |
| Oldest queryable run | 2026-08-14T05:59Z (the window may extend further back) |
| Newest | 2026-08-25T08:35Z — the push carrying the round-4 fixes |
| Events affected | `push`, `pull_request`, **and `schedule`** |
| Workflows affected | all three: `migration-shadow-check`, `ai-eval-gate`, `docs-check` |
| Jobs created | **zero** |
| Check-runs produced | **zero** |
| Annotations | **none** |
| Run `name` field | empty string |
| Run `path` field | `BuildFailed` |

## Why this is billing and not code

Each line below eliminates a candidate cause.

- **Not a repo-level Actions disable.** `GET /repos/SeanSwan/-SS-PT-New/actions/permissions`
  returns `{"enabled": true, "allowed_actions": "all"}`.
- **Not a YAML syntax error.** All three workflow files parse cleanly under `yaml.safe_load`.
  More decisively: a malformed workflow produces an **annotation naming the file and line**.
  This produces silence — zero check-runs, zero annotations, empty `name`.
- **Not one bad workflow poisoning the others.** Workflows are independent; a break in one
  cannot startup-fail the other two. All three fail identically.
- **Not branch- or event-specific.** `push`, `pull_request` and `schedule` all fail. `schedule`
  matters most: it fires with no human, no branch, and no diff, so nothing about a particular
  change can explain it.
- **Not transient.** 500 consecutive failures across 11+ days with a 0% success rate.
- **The `path: "BuildFailed"` sentinel with zero jobs** is what GitHub emits when it declines to
  build the run *before parsing any workflow* — the shape a billing or spending-limit block
  produces.
- **The repo is private and owned by a personal account**, so Actions minutes bill against the
  account allowance rather than being free.

`[VERIFIED]` every row above. `[UNVERIFIED]` — the billing page itself. The API endpoint
(`/users/SeanSwan/settings/billing/actions`) requires the `user` OAuth scope, which this token
does not carry, so the minutes balance could not be read directly. That is the one link in the
chain confirmed by elimination rather than observation, and it is the link Sean can see in one
click.

## What to check, in order

1. **https://github.com/settings/billing** → *Plans and usage*.
   Look at **Actions minutes used this month**. A personal account gets 2,000/month for private
   repositories; at 100% with no payment method, every run startup-fails exactly like this.
2. **Spending limit.** If it is `$0` (the default) and the included minutes are exhausted,
   Actions stops. Raising it, or adding a payment method, restores runs immediately.
3. **Payment method.** An expired or declined card produces the same silence.

## How to confirm it is fixed

```bash
gh workflow run migration-shadow-check.yml --ref main   # needs the file on the default branch
gh run list --limit 3
```

A conclusion that is anything other than `startup_failure` — including a **failure** — is
success here. A red run means the gate is finally executing and testing something.

## Why this matters more than another review round

Four hostile-review rounds have run against this gate (Claude, Ox Alpha, GLM 5.3, Kimi K3,
Tencent HY3, DeepSeek V4 Pro, Grok 4.6). Four REJECTs. Roughly twenty real defects found and
fixed, several of them classes where the gate reported success while testing nothing.

**Every one of those fixes is paper-verified only.** The workflow has never executed.

The round-2 defect is the argument in miniature: the guard step reported an authoritative
"0 pending" beside a nonzero delta, in every possible run. It took a paid review round to find.
**One real execution would have shown it in the log immediately.** GLM said so explicitly; every
seat in round 4 independently repeated the point.

## The wider finding

This is not only about SWA-200. **Every CI gate in this repository has been dead the entire
time it was trusted** — the migration gate, the AI-eval gate, the docs check. A workflow that
never starts and a passing build are indistinguishable from inside the repo, and this project
has been shipping against that assumption for at least eleven days.

The general lesson, recorded in the learning corpus: **before hardening a gate, prove the gate
runs.** The strongest possible gate logic and a billing block produce the same observable
state, which is silence.
