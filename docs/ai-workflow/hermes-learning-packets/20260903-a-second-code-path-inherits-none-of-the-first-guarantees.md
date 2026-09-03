---
packet_id: 20260903-a-second-code-path-inherits-none-of-the-first-guarantees
title: A second code path inherits none of the first one's guarantees
date: 2026-09-03
originating_model: claude-opus-5
tier_basis: "Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist. Provenance is first-hand: authored by the running session model, not relayed."
surface: user-dashboard settings hub, profile save path, frontend a11y
decision: When a bug is fixed by adding a fallback path, the fallback must be audited against the primary's success contract in the same slice — a diff and a pass count both render the asymmetry invisible.
status: shipped
supersedes: none
privacy: IDs, roles and code identifiers only; no PII, no credentials, no client data
models_used:
  - model: claude-opus-5
    role: sole reviewer and builder; hostile review of another session's shipped Wave-1 work
    did: reviewed commit bad6119ac against its own stated thesis, found five defects (weaker fallback save contract, no live region, discarded error message, 30px touch targets, leaked timer), fixed all five, found and fixed a sixth of its own making in round 2, mutation-proved three, wrote the review doc
    cost: subscription
  - model: x-ai/grok-4.6
    role: requested hostile seat — NOT RUN
    did: nothing; unreachable from a cloud container with no .env and no API key
    cost: $0.00
  - model: z-ai/glm-5.3
    role: requested hostile seat — NOT RUN
    did: nothing; same reason
    cost: $0.00
skills_touched:
  - id: rule-80 / cross-env-verify
    change: applied
    motivating_failure: "The requested handoff file did not exist. Three vantages (branch tree, origin/main tree, GitHub contents API) were checked before saying so, and the merged branch was checked separately to establish the work was real even though the doc was not."
  - id: rule-82 / full-spectrum-panel
    change: proposed
    motivating_failure: "consult-glm.mjs and consult-hy3-design.mjs compute `options.remit || defaultRemit`, and both defaults are narrow AND SwanStudios-branded. Omitting --remit silently reintroduces the exact lensing Rule 82 bans. Fixing the script defaults remains an unclaimed slice."
  - id: rule-74 / proof-before-done
    change: applied
    motivating_failure: "A green suite proves only that nothing broke. Each of the three testable fixes was reverted individually and confirmed red before the claim was made."
---

# A second code path inherits none of the first one's guarantees

## The lesson

Wave 1 existed to kill one defect: **Settings reported "Saved" without writing.** The
root cause was that the dashboard shell omitted `onUpdateProfile`, a wrapper coalesced
the missing prop to `async () => undefined`, the promise resolved, and the UI believed it.

The fix replaced that no-op with a real HTTP call. Correct — and it introduced a
**second save path**, which was given a weaker success contract than the first:

- `profileService.updateProfile` requires `success && user` in the body, and throws otherwise.
- The hub's direct-`apiService` fallback checked only the **HTTP status**.

So a `200 {success:false}` — a server explicitly reporting that it wrote nothing — still
rendered "Saved". The original bug class, alive inside the very branch the original bug
travelled through, four months later.

**Why nothing caught it.** The diff shows a new branch being *added*, which reads as
strictly more safety. The test suite asserted the fallback *was called*, never what it
does with a dishonest 2xx. A pass count cannot express "these two paths disagree about
what success means." The only thing that surfaces it is reading both paths side by side
and asking **which one is stricter, and why isn't the other one that strict.**

**The generalisation:** any fix of the form "add a fallback / retry / alternate route"
must, in the same slice, enumerate the guarantees the primary path holds and prove the
new path holds each one. Guarantees do not propagate by proximity.

## Who did what

**claude-opus-5** did all of it — review, fixes, mutation proofs, and the round-2 catch
on its own diff. No external seat contributed a finding, because none ran.

**Grok 4.6 and GLM 5.3 were requested by Sean and did not run.** This is worth recording
precisely, because it is a *structural* property of the cloud surface, not a one-off: a
Claude Code web session is a fresh clone with **no `.env`**, so every paid seat is
unreachable by construction. `consult-glm.mjs:21` reads `process.env.ZAI_API_KEY`; there
is none. Per the live handoff's §6 trap 7, `consult-panel.mjs` exists only in the shared
local tree and is not on `main`, so it is doubly unavailable there.

**Routing consequence for Hermes:** *any* multi-seat panel Sean asks for while working in
a cloud session must either be deferred to a keyed machine or dropped from the plan
up front. Promising a panel from that surface and discovering it mid-task is wasted turns.

## Skills created or changed

None created. Three applied, one proposal recorded (see `skills_touched` frontmatter).
The Rule 82 script-default flaw is the actionable one: two consult scripts fall back to a
narrow, project-branded remit whenever `--remit` is omitted, which quietly reintroduces
banned lensing *and* injects SwanStudios branding into non-Swan work.

## Mistakes I made

- **I trusted a wrapper's exit code over the actual command.** The background runner
  reported `exit 0` for an `npm ci` that had *errored* (puppeteer's Chromium download is
  blocked by the network policy). I was one step from building on an empty
  `node_modules`. Caught by checking the directory rather than the status. The durable
  fix is procedural, not attitudinal: **write the real status into the log yourself** —
  `cmd > log 2>&1; echo "REAL_EXIT=$?" >> log` — and grep for that token.
- **I let the working directory drift between chained tools, twice.** A python heredoc
  ran from the repo root while vitest ran from `frontend/`, so a patch script wrote
  nowhere and the suite lost its `@` alias — two distinct-looking failures, one cause.
  The second occurrence was after a session resume silently reset cwd.
- **I used `--reporter=basic`, removed in vitest 4.** The reporter-loading crash was
  indistinguishable from a test failure for one cycle.
- **My own fix introduced a defect.** Holding the status timer in a ref fixed the unmount
  leak and created a race: a save within 3s inherited the previous timer, which cleared
  the *new* status early. Round 2 caught it. This is the highest-value entry here — the
  hostile round earned its keep on my diff, not the original author's.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Trusting a pipeline/wrapper exit status | 2 | **Yes** — the repo's own exit-status gate blocked me once, and I still hit it again through a *different* mechanism (a background-task wrapper, not a pipe) | Writing `REAL_EXIT=$?` into the log and grepping that token |
| cwd drift between chained tools | 2 | No | One `cd` at the head of every command, or absolute paths throughout |
| A fix introducing an adjacent defect | 1 | Yes — this is Rule 74's entire premise | The round-2 hostile pass, run against my own diff from a new vantage |

**The repeat that matters is the first one.** The exit-status gate exists, fired
correctly, and I still repeated the class minutes later — because the gate guards
*pipelines* (`cmd | tail; echo $?`) and the failure arrived through a *background-task
wrapper's* reported status. **A guard scoped to one mechanism does not close the class.**
That is the Rule 73 "twice = codify" trigger and the `lesson-recall` HALF-FIXED RULE
shape: the rule is right, the enforcement covers one layer when it must cover several.
Concrete follow-up: extend the exit-status guard's notion of "untrustworthy status" to
include background-task completion summaries, or have the background runner surface the
child's real exit code rather than the wrapper's.

## External-model calibration

**No paid call was made; $0.00 spent this session.** Nothing to calibrate — recorded so
the absence is not later misread as "the seats found nothing."

Standing note for the routing table: the spend-guard's own observation that *cost does
not predict value* is untested here, but the cheapest seat available in a cloud session
is **the running model doing a disciplined hostile pass**, which found six defects for
$0.00. That is the correct first move before any spend, not a fallback after it.
