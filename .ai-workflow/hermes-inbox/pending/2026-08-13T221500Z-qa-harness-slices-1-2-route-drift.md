---
surface: qa-harness
slug: slices-1-2-route-drift
agent: vs-claude (Opus 5)
date: 2026-08-13
---

# QA harness slices 1–2: the audit was blind to 45 live routes

## What happened

Continued the harness slice loop after the production audit run. Two slices landed plus a
hostile-review pass that found two more defects in my own work.

**Slice 1 (`72e07364d`)** — the expiring suppressions registry now governs every gate. The handoff
named three permanent allowlists; the sweep found **28** (three shared gates + 24 inline copies
across 15 smoke specs). All 28 permanently suppressed patterns the registry expires on 2026-11-10,
so on that date the crawl would start failing as designed while 28 gates kept swallowing the
identical message forever.

**Slice 2 (`3c8a038c4`)** — route-manifest drift gate. The crawl's ~85 routes were hand-typed and
connected to nothing, and coverage was computed as visited/total against that same hand-typed
total. First run found **45 live dashboard routes the audit had never visited**, all reported as
100% covered — including `/dashboard/trainer/earnings` (commission ledger),
`/dashboard/admin/trainer-payouts`, session-allocation, client-trainer-assignments,
trainer-permissions, the owner support inbox, and `/user-dashboard/groups`.

**Hostile fixes (`ec4090e6e`)** — the flat 600s crawl timeout would have failed permanently at the
new 61-route admin table; it is now derived from route count. And my own gate skipped the `user`
role entirely, which is how `/user-dashboard/groups` had stayed invisible.

## Lessons worth carrying

**Coverage measured against a hand-written list cannot detect absence.** visited/total where
`total` is the same hand-written list is a tautology — it reports 100% while omitting 45 pages.
Any coverage number must be computed against a source derived from the system under test.

**A gate with a hole reports green over the hole.** My drift gate covered 3 of 4 roles and looked
complete. The missing role was exactly where an unaudited shipped feature was hiding.

**A budget constant disconnected from the work becomes wrong silently.** The 600s timeout was
correct at 28 routes and wrong at 61, with no signal at the moment it became wrong.

## Mistakes I made

- **Probed for the Linear key wrongly for the ~10th time (Sean called this out directly).** Two
  independent traps and I only ever checked one: the key is a *Windows user* env var (invisible to
  Git Bash and absent from `.env`), and `linear-cli.mjs` only exists on trees current with
  `origin/main` (the stale main tree gives MODULE_NOT_FOUND, which reads as "the CLI doesn't
  exist"). Checking either axis alone yields a confident false "board is blocked". Fixed by writing
  the single correct command into the memory file with both traps named.
- **Reported `LINEAR: BLOCKED` last turn off that bad probe.** That was a false negative presented
  as fact.
- **Corrupted 15 files with a migration script.** I inserted an import between the `\r` and the
  `\n` of a CRLF pair, producing lone CRs, mixed line endings, and a diff that rewrote all 3,372
  lines. Tests still passed. Caught only because I checked `git diff --numstat` before committing.
  The lesson is that a green suite says nothing about diff *shape*.
- **Edited before sweeping — again.** Same error as the previous session, which I had already
  written up. I fixed `crawlWorklist.ts` first and only then ran the sweep that found five copies.
  The corrected habit (sweep as the first action) held for slice 2 and found 28 rather than 3.
- **Wrote a test using `__filename` in an ESM spec**, which threw "not defined" and made my own
  fail-loud test fail for the wrong reason. Caught by running it.
- **Tried to import a spec file from another spec file**, which Playwright forbids. Caught by
  running it; the helper moved to the report module where budget logic belongs.

## External-model calibration

None. No paid or external model was consulted this turn. Sean has authorised one Kimi review after
the remaining slices are complete; it has not been called yet.

## State for Hermes

- Branch `claude/qa-harness-slice0-20260811` in `C:/tmp/ss-qa-harness-slice0`. Commits
  `72e07364d`, `3c8a038c4`, `ec4090e6e`. Committed, NOT pushed.
- SWA-157 updated with both slices.
- Crawl table grew 85 → 124. None of the 39 added routes has ever been visited; the first
  authenticated crawl should be expected to surface real findings on them.
- Blocked on Sean: interactive per-role login to capture production auth states. No credential
  passes through an agent.
- Remaining slices: crawl depth 1 → fixpoint, cross-role journeys (needs seeded personas), boot
  drift tripwire.
