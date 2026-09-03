---
title: "A guard that blocks the desired state, and three other bugs only execution finds"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5[1m] (harness-stamped in system context) — Fable-tier by Sean's designation 2026-08-10, on the Rule 68 allowlist"
date: 2026-08-17
decision: "SwanGuard S1 live-path launcher shipped and proven; 4 defects found by execution, none by inspection; dry loop CLEAN×2 over 10 rounds"
status: draft
privacy: "Repo-relative paths and container/service names only; no PII, no secrets, no credentials. The dev Postgres password quoted nowhere; it is a throwaway local compose default."
models_used:
  - model: claude-opus-5
    role: builder / verifier
    did: "Built the launcher and the opt-in postgres mode, executed every stage rather than reasoning about it, found and fixed 4 defects, ran the dry loop to CLEAN×2"
    cost: subscription
skills_touched:
  - id: verification-before-completion
    action: applied
    motivating_failure: "Three of the four defects were invisible to file reading; the fourth was invisible to any test that only exercises the failing direction"
  - id: blast-radius-guard
    action: applied
    motivating_failure: "The convenient way past a migration gate was to rename the database into the allowlist — which would have disarmed the guard protecting the owner's saved data"
---

# A guard that blocks the desired state, and three other bugs only execution finds

Shipping a local-dev launcher produced four defects. **Zero were findable by reading code.**
Three needed a running Docker daemon; the fourth needed the launcher to be run *twice*.

## The headline lesson

**A guard that blocks the desired state is worse than the collision it prevents.**

I wrote a port pre-flight that refused to start when the database port was occupied — correct,
and it protected an unrelated running service on the first launch. But `docker compose up -d`
is *idempotent*: an already-running healthy container is not a conflict, it is **success**. The
guard could not tell "someone else owns this port" from "I already own this port," so it would
have converted a working system into a failing one on its second use, forever.

I tested the guard against the case where it *should* fire, saw it fire, and shipped it.
**A guard tested only in its firing direction is half-tested.** Every guard needs a test for
the case where it must stay silent — that is the case the user actually lives in.

## The three that needed a running daemon

1. **`container_name:` in a compose file is daemon-GLOBAL, not project-scoped.** A container
   abandoned by a *different checkout* of the same repo — exited, five days old — blocked
   `compose up` with an error that reads like a broken database. Remove `container_name` and
   let Compose derive it per project; address the service by its compose service name instead.
2. **A Docker-published port is invisible to `netstat` until the Docker engine is running.**
   My pre-flight ran before starting Docker and reported a taken port as free. **Port checks
   must run after the daemon that owns the ports** — and I had the contradiction in hand
   (I saw the port go from free to allocated the moment Docker booted) and did not read it.
3. **A hardcoded host port makes every sibling service a coin-flip over who boots first.**
   The loser fails with "port is already allocated," which reads like a broken database rather
   than a booked port. Make it configurable, default it off the crowded number, and **move
   yours — never stop the other service to win the port.**

## The safety call worth generalizing

The migration runner refused the hub database because its name was not on a fixture allowlist
(`*_test` / `*_smoke`). The one-character fix was to rename the database into the allowlist.

That would have been **exactly wrong.** The allowlist exists so destructive smoke suites cannot
target a real database. Renaming the owner's real corpus into the allowlist would have made the
gate pass by *disarming the guard protecting his data*. The right move was the opposite: keep
the non-fixture name precisely so the smokes keep refusing it, and scope the override flags to
the single additive migration command, never to app runtime.

**Generalization: when a guard blocks you, find out what it protects before you make it pass.**
The cheap way past a safety gate is usually to widen what it permits. That is almost always the
wrong direction — the gate is information, not an obstacle.

## Mistakes I made

- Wrote a guard and tested it only where it should fire.
- Ordered a port pre-flight before the daemon that owns the ports, while holding the evidence
  that contradicted it.
- Promised the owner this slice would show him "real news." It does not — it puts him on the
  live path with an honestly empty feed. I corrected it in the launcher's own copy, but I set
  the false expectation first.
- Burned three tool calls on MSYS path mangling — **a lesson already recorded in this
  project's memory** — before applying the known fix.

## Error → fix → repeat ledger

| Error class | Times | Written up before? | What actually stopped it |
|---|---|---|---|
| Guard tested only in its firing direction | 1 | No | End-to-end run. **Fix: every guard gets a must-not-fire test.** |
| MSYS path mangling on `cmd /c` | 3 | **Yes — already in memory** | The recorded lesson did NOT prevent the repeat. Only the mechanical prefix does: **always `MSYS_NO_PATHCONV=1` + absolute Windows path, never a relative or space-bearing path.** |
| Evidence gathered, contradiction unread | 1 | No | Forced by the e2e run. |
| Over-promised an outcome | 1 | No | Self-caught while writing user-facing copy. |

The repeat is the MSYS one, and it is instructive: **it had already been written down and it
happened anyway.** A lesson stored as knowledge does not change behavior; a lesson stored as a
mechanical prefix does. Prefer procedural corrections to resolutional ones.

## What proved it

`postgres-migration-runner` applied 27 / skipped 0 then 0 / skipped 27 (idempotent); 54 tables;
`news_rss_sources` present with 0 rows; `/api/health` ok; web 200; `dev-sign-in` 201 with the
user row readable **inside the Postgres container** (the decisive proof that postgres mode was
genuinely in effect rather than the in-memory store); `/api/civic/official-sources` → 200 with
`{"items":[],"sourceState":"dormant"}` — the honest empty state, not fixtures;
`node --test scripts/*.test.mjs` 119/119; dry loop CLEAN×2 over 10 rounds.
