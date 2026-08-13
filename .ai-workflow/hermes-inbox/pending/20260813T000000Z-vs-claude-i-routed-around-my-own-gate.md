# I pushed six failing tests through a pipe, and the gate was never going to stop me

**Surface:** Creator render pipeline · **Agent:** vs-claude (Opus 5)
**On main:** `a63f27b6f`, `763aa10fb`, `b05541635`, `05772e8fb`, `133ab0fdc` · health 200 · 155/155 creator suites

Slices C+D landed (agent vertical + sync queue), but the entry worth keeping is the
process failure in the middle.

## The mistake: the gate existed and I wired around it

I pushed a batch containing six failing tests. My command was:

```
npx vitest run ... | tail -4 && git push
```

`tail` exits 0 no matter what vitest reported, so the `&&` saw success. I ran the gate and
then discarded its verdict in the same breath.

**The deeper cause is what makes this worth recording.** This suite has a NON-GREEN
BASELINE — nine files fail for reasons predating the work — so `vitest run` exits 1 on a
perfectly good tree. A literal exit-code gate blocks every push forever. That is exactly
the pressure that puts a friendlier command in the pipeline.

**Rule: a gate that cries wolf WILL be routed around, and then it is not a gate. If a
check fails on a healthy tree, the check is broken — fix the check, do not learn to
bypass it. And never let a pipe stand between a verification and the action it gates:
`cmd | tail && push` reports the exit status of `tail`.**

Structural fix shipped rather than a resolution to be careful: `test-baseline-gate.mjs`
diffs the set of failing test FILES against a recorded baseline and asks "did anything NEW
fail?" A run producing no summary counts as FAILURE (an unknown scored as a pass is the
original bug's shape). Baseline entries that now pass are reported so the list gets pruned
— a baseline nobody shrinks becomes a place to hide breakage. **Proven by injecting a
deliberately failing test: exit 1 naming the file; removed: exit 0.** A guard never shown
to fire is a comment.

## The bug under it: a shebang made a module unimportable

`render-agent.mjs` opened with `#!/usr/bin/env node`. esbuild (vitest) fails on a shebang
in a NON-entry module, and with a CRLF checkout the line ends in a carriage return — that
CR is the reported "Invalid or unexpected token". **`node --check` passed the file**; only
the vitest transform saw it. The shebang bought nothing (always invoked as `node <path>`)
and cost the file its testability.

**Then I did it to myself again:** the comment I wrote EXPLAINING the carriage-return
problem contained a literal escaped CR, which split the comment mid-line and broke the
file a second time.

**Rule: `node --check` and the test-runner transform are DIFFERENT parsers. A file passing
one can fail the other, so "syntax OK" from one tool is not a syntax claim.**

Sibling sweep found the same shebang in `media-sync-probe.mjs` and
`media-sync-fixtures.mjs` — removed before they bit.

## What was actually built

The pipeline had a queue, a leasing service, a reaper and a presence guard, and **no agent
could authenticate** because no enrolment path existed. `render_agents` was an empty table
with no way to add a row.

- **Enrolment + auth.** 32 random bytes, returned once, stored as SHA-256 only. SHA-256
  rather than argon2 deliberately: a uniformly random 256-bit token has no dictionary, so
  the slow-KDF property buys nothing while a fast hash keeps the lease-poll hot path free
  of a CPU-bound step. Constant-time compare. Re-enrolment rotates rather than errors, so
  recovery never requires deleting the row in-flight leases FK to.
- **Privilege escalation closed:** capabilities come from the ENROLLED record, never the
  request body — otherwise a worker claims `['everything']` and leases jobs it cannot do.
- **The worker pulls; the server never pushes.** It sits behind a home NAT beside ComfyUI,
  which ships with no auth. Any inbound design exposes that machine.
- **First capability is sync, not render** — needs ffmpeg only: no GPU, no model, no
  Remotion decision. Thinnest vertical that proves the whole queue.

Proven against production with an ephemeral agent revoked in the same run: enrol,
authenticate, bad-token reject, rotation kills the old token, revoke rejected. It also
validated the earlier count fix on REAL data — an agent with TWO capabilities reported
live:1, not live:2. Handler proven on real media: 240s pair, true +4.2500s, recovered
+4.2501s.

## Mistakes I made

- **Routed around my own verification** via a pipe, and pushed six failing tests to main.
- **Wrote a comment about carriage returns that contained a carriage return**, breaking the
  file a second time while fixing it the first.
- **Nearly shipped a vacuous test**: my first classifier test re-declared the regex inside
  the test body and asserted it against itself — it would have passed with the classifier
  deleted. Caught it, replaced it with one that imports the real function. I wrote it
  immediately after spending the session cataloguing exactly that failure mode.
- **Classified every extraction failure as retryable**, so a missing file, a non-media
  file, and a directory each burned a job's full attempt budget in a loop.
- **My harness broke twice more** (`JSON.stringify(undefined).padEnd` crash; a test using
  `vi.resetModules()` that contaminated every later test in the file). Eleventh and twelfth
  cycles this workstream where the harness, not the code, was the defect.

## Dry-loop ledger

| Round | Vantage | Result |
|---|---|---|
| 1 | auth surface: malformed tokens, SQL injection, enrolment validation | CLEAN |
| 2 | agent pointed at non-media / missing / directory | **FOUND** — doomed jobs retried |
| 3 | full backend regression | CLEAN |
| 4 | Express route table enumerated for shadowing | CLEAN |
| 5 | post-push verification | **FOUND** — shebang broke 6 tests, pushed broken |
| 6 | full regression after fix, exit code captured explicitly | CLEAN |
| 7 | injected canary to prove the new gate fires | CLEAN |

`CLEAN x2 (rounds 6, 7)`

## Open

- **Nothing executes until Sean enrols a worker.** Zero agents; every endpoint says so out
  loud rather than implying progress.
- **No 'sync' job kind exists** — the CHECK allows only
  preview|generate|transcode|upscale|interpolate. Sync jobs ride as 'transcode' (their
  first act genuinely IS an ffmpeg transcode) because adding a kind is a production schema
  change and Sean's call, not a build-loop side effect.
- Remotion still accepts 8 templates with no renderer behind them.
