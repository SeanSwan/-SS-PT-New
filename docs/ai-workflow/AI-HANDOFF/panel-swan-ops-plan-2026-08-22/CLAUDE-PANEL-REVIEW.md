# Claude Opus 5 — seat review (the author's own hostile pass)

**Conflict of interest, stated up front:** I wrote the plan under review. Everything below is
verified by execution against the code, not by recollection, precisely because self-review is
the weakest seat on this panel.

## Q1 — Does the plan tell the truth about the code? MOSTLY YES.

Verified true by execution:

| Plan claim | Verified |
|---|---|
| `Swan-Ops.ps1` 299 lines, under its 300 cap | ✔ 299 |
| suite 53/53, e2e 5/5 | ✔ both green, exit 0 |
| `OPEN-2`: `@playwright/mcp@latest` unpinned in `$pwArgs` | ✔ `BrowserPolicy.ps1:86` |
| `OPEN-3`: `https://www.google.com` in the origin allowlist | ✔ `BrowserPolicy.ps1:69` |
| gate uses an 8 MB ceiling and a 40-line head window | ✔ `Publish.ps1:81,83` |
| exit codes 0 / 3 / 1 / 4 | ✔ e2e covers 0, 3, 1 through the REAL launcher |

**No claim I checked was contradicted by the code.** I found one apparent P0 and disproved it:
the e2e suite ends in `Remove-Item (Join-Path $Tool 'reports') -Recurse -Force`, which reads
like it deletes the two real recon reports. It does not — `$Tool` is a temp copy. Both reports
are intact on disk. **I nearly filed that as critical before tracing the variable**, which is
the same failure mode as the two false reviewer claims this workstream has already caught.

## C1 — HIGH — The freeze is the tool's primary safety control and has ZERO test coverage

The plan's §5 and §3 both cite `-Yes → exit 4` as *measured*. It is. But:

```
grep -rn "exit 4|freeze|-Yes" tests/   →   (no matches)
```

**Nothing in either suite asserts the freeze exists.** A future edit — or a merge, or an agent
"simplifying" the main block — removes the six lines that enforce it and **every test still
passes**. The plan then reads as authoritative about a control that is gone.

This is the exact defect class the 9-round panel spent itself on: a guardrail that is real
today but has no mechanism keeping it real. The irony is sharp — the freeze was itself a
*round-2 fix* for "the freeze is unenforced prose", and fixes were never swept for their own
coverage. A one-time measurement is not a regression guard.

**Fix:** one e2e case asserting `-Yes` exits 4 and spends nothing. Cheap, and it makes §5's
claim self-defending.

## C2 — HIGH — `OPEN-2` is misranked, and the freeze does not touch it

The plan ranks `OPEN-1` CRITICAL and `OPEN-2` HIGH, and schedules pinning as "Slice 4" — behind
a decision (§2) that does not gate it. Two things are wrong with that:

1. **The freeze mitigates `OPEN-1` and does nothing for `OPEN-2`.** §5's whole argument is that
   attended-only runs on a credential-poor machine shrink `OPEN-1`'s blast radius. True. But
   every *attended* run still executes `npx @playwright/mcp@latest`, resolving tip-of-npm,
   **outside the codex sandbox, as the user**. The freeze does not reduce that by one bit.
2. **`OPEN-2` needs no injection at all.** `OPEN-1` requires an attacker to first capture the
   agent through hostile page content. `OPEN-2` is RCE on the owner's machine via a compromised
   npm release with **zero attacker interaction with swan-ops**. Shorter attack path, no
   precondition.

And the fix is **one line** — pin a semver — against `OPEN-1`'s multi-session project.

**This should be done now, regardless of how §2 is answered.** A plan that parks a one-line
supply-chain fix behind an invest/freeze decision has mis-sequenced its own backlog.

## C3 — MEDIUM — §14's acceptance test can pass while the hole stands

§14 accepts Slice 2 when, from inside a run, `curl https://example.com` and reading `~/.ssh`
both fail with the failure in the log. **That proves `curl` is blocked. It does not prove
egress is blocked.**

The spec's own mechanism is "a local proxy the child is pointed at, or an equivalent OS-level
control." A proxy the child is *pointed at* is honored through environment variables — and a
captured agent is exactly the actor who will not honor them. `node`'s fetch, PowerShell's
`Invoke-WebRequest` with explicit `-NoProxy`, or a raw socket all route around it. The plan
elsewhere argues at length that prompt-level guardrails are requests rather than controls;
an env-var proxy is the same category one layer down.

The only clause that would actually bind is "or an equivalent OS-level control" — a firewall
rule scoped to the codex process tree, or a container/VM with allowlisted egress — and that is
the clause the spec hand-waves.

**Fix:** name the OS-level mechanism as the requirement, demote the proxy to a convenience, and
widen the acceptance test to at least three transports (`curl`, `node -e fetch`,
`Invoke-WebRequest`), because a single-transport negative is what makes this test look stronger
than it is.

## C4 — MEDIUM — §2 declines to make a call the author is best placed to make

Handoff v3 recommended: freeze the tool, spend the hours on acquisition. **v4 went neutral** —
§2 lays out invest-vs-freeze even-handedly and picks neither.

That is a regression in usefulness. The evidence is one-sided and the plan itself states all of
it: one report produced, its finding already extracted, no scheduled next run, Slice 2 is a
multi-session security project, and the owner's stated #1 priority is a different project
entirely. An author with that much context who presents two options neutrally is not being
even-handed; they are declining to be wrong in writing.

**Fix:** restore an explicit recommendation with its reasoning, and keep the decision the
owner's. "Here is what I would do and why — your call" beats "your call."

## Q5 — What is missing entirely

- **No answer for "what if the decision is never made."** The honest answer is that the tool
  sits frozen and safe indefinitely, which is a fine outcome and should be said, because
  otherwise the plan reads as blocked rather than parked.
- **No inventory of what a second recon would actually cost.** §2 asks invest-or-freeze without
  pricing either branch. Slice 2 is "multi-session"; that is the only number offered.
- **`OPEN-9` (9.3 MB / 812 JWT-shaped third-party strings) has no expiry.** The plan says prune
  it. Nobody owns that, and it grows ~1–1.5 MB per run.

## Verdict

The plan is factually accurate about its code — I could not break a single claim I tested. Its
defects are of judgment and sequencing, not of truth: an untested safety control, a one-line
supply-chain fix parked behind an unrelated decision, an acceptance test narrower than the
property it claims, and a recommendation withdrawn.

**REVISE**
