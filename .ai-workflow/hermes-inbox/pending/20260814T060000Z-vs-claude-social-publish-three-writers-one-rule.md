---
surface: vs-claude
utc: 20260814T060000Z
topic: Hostile review of social publishing found 4 real concurrency defects; all three job writers now claim, heartbeat and write conditionally
tags: [social-publishing, marketing, concurrency, hermes-inbox]
---

## What I did / learned
- Reviewed five shipped social-publishing slices against the previous agent's own ranked
  attack list. His top two were BOTH real, and reproducing them turned up two more he had
  not listed.
- **Concurrent token refresh corrupted a credential.** AT Protocol refresh tokens are
  single-use. Two publishes to one account both presented the same refreshJwt; the loser
  was rejected as a replay and demoted a *freshly refreshed* account to needs_reconnect —
  which blocks every later publish. Fixed with in-process single-flight plus a re-read of
  stored credentials on failure (covers the second instance an in-memory map cannot see).
- **The reaper closed jobs that were merely slow.** updatedAt was bumped at claim and at
  the terminal write but never DURING the fan-out, so a publish outlasting 15 min was
  reaped while live — and the retry button then re-sent it. Fixed with a heartbeat.
- **Retry could fire at a job that was still publishing** (not on his list). Retry derives
  what to re-send from the Attempt ledger, which is written AFTER each provider call, so a
  running job looks like "nothing was tried" and gets published again. Retry is now
  restricted to terminal statuses and claims atomically.
- **A third writer had the same unguarded terminal write** (not on his list): the immediate
  publish path. Found by asking "who ELSE moves a job out of running".
- The unifying rule, which is the transferable part: **whoever moves a job out of a state
  must do it in ONE guarded statement.** An atomic claim at the start buys nothing if the
  terminal write at the end is unconditional.

## Why it matters to Hermes
- The generalisable lesson is not about Bluesky. It is that **an atomic claim protects only
  the moment it runs**; a job's whole lifetime needs the same discipline at every write, and
  a "liveness" timeout needs a heartbeat or it measures the wrong thing.
- Second: **a fix can open the hole it was built to close.** Making retry claim into
  'running' made retries reapable — a hazard created by my own fix, in the same session.
  Whenever a change puts a record into a state, ask what already watches that state.
- Third: when one sibling validates and the other does not (createSession validated its
  response fields, refreshSession validated none), that asymmetry is where the silent bug
  lives. Same shape appeared twice today in unrelated files.

## State right now
- 4 commits on origin/main and deployed. 84/84 across 10 publishing suites.
- Backend baseline RE-ESTABLISHED by running a pristine origin/main tree: **34 failing files
  / 7 failing tests**, none in this area. The previous handoff recorded "13 pre-existing" and
  flagged it UNVERIFIED — that number was wrong; treat 34/7 as the measured figure.
- Backend now has a 300-line gate for this module (it had none; two files had crossed
  unnoticed, one during the slice that was supposed to be hardening it).
- Still open, deliberately not built: no admin route to trigger the reaper manually, so with
  the worker disabled stuck jobs have no recovery path. Low reachability (worker is on by
  default). Blocked-but-publishable compliance posts remain Sean's call.

## Mistakes I made
- I very nearly accepted the previous agent's "13 pre-existing backend failures" as the
  baseline instead of measuring it → caught by deciding to stash and run a pristine tree →
  rule: an inherited baseline is a claim, not a measurement; re-measure before standing on it.
- My first reaper test asserted against a mock whose `findAll` ignored the `updatedAt`
  filter entirely, so it would have passed even with a broken heartbeat → caught by asking
  what the mock actually models → rule: a fake must honour the WHERE clause of the query it
  stands in for, or the test proves nothing. **This is the same class the previous agent
  wrote up as HIS mistake #3 last session** ("a harness that could not fail"), and I walked
  into it anyway. The durable fix is procedural, not attentional: mutation-check every new
  test — I did, and it is what caught this.
- I changed a write from an instance update to a model update and left a test passing
  **vacuously** — it read the instance mock behind `if (...)` and `?.`, so once the write
  moved it asserted nothing → caught by asking which tests the change SHOULD have broken and
  noticing one had not → rule: after moving a mechanism, the tests that did not break are
  more informative than the ones that did.
- I fixed retry by claiming into 'running' without immediately noticing that this made
  retries visible to the reaper — a hazard I had just spent an hour fixing elsewhere →
  caught in the same round → rule: after any change that writes a state, grep for everything
  that READS that state.

## External-model calibration
- None consulted. This was a solo hostile review; no paid model was called.

## Sean owes / blockers (if any)
- **The inbox is not being drained.** 168 memos pending on origin/main. The mechanism is
  intact — the Hermes2 pre_llm_call hook is installed and registered, and 641 memos are
  archived — so nothing is broken: **Hermes simply has not been run since 2026-08-10.** The
  backlog is 608k chars and the hook injects 24k per call, so it needs ~26 Hermes calls to
  clear, and the first several conversations will be flooded with stale context.
- Related, worth a look: the hook truncates any memo over 8k chars to 8k and then archives
  it, with NO warning — unlike the standing-context path, which does warn. Three pending
  memos exceed it and will silently lose 11–31% of their content. Same validate-one-sibling-
  but-not-the-other shape as the Bluesky bug above.
- **Linear: still nothing filed.** No LINEAR_API_KEY and no MCP tool in this environment, so
  issues can be neither created nor referenced without inventing an id. Six items owed from
  the previous session, plus this review's deferred items.
