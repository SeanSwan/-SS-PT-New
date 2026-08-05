---
surface: vs-claude
utc: 20260804T173000Z
topic: Linear board-sync gate accepted any incidental SWA mention — tightened to an explicit claim
tags: [governance, hooks, linear-sync]
---

## What I did / learned
- Sean asked whether Linear was actually being updated "across the board." It was not — and the gate that was supposed to guarantee it had a hole.
- **The hole:** `linear-sync-gate.mjs` accepted ANY bare `SWA-\d+` anywhere in the closeout. Closeouts cite issues for context constantly ("see SWA-111", "filed as SWA-126"), so **citing an issue was indistinguishable from syncing one** and the gate effectively never fired. The previous turn shipped a governance change (new rule + hook) to main with **zero board activity** and still passed.
- **Fix (main `b945ef186`):** the marker is now an explicit claim — `LINEAR: SWA-<n>` — or the unchanged `LINEAR: N/A — reason`. A real `save_issue`/`save_comment` call still passes with no marker (preferred path), so all documented escape hatches survive; only the accidental pass is closed.
- **Second gap:** this gate shipped with **no tests at all** — an unprotected guard is one that can be silently broken, exactly the class of gap it exists to prevent. Added 12 contract tests.

## Why it matters to Hermes
- Any agent's "LINEAR: SWA-n" in a closeout is now a **claim of sync**, not a citation. Treat it as such when reading closeouts.
- The three pass paths are unchanged in spirit: real board write (best) → explicit sync claim → explicit N/A with a reason.
- Generalizable: **a marker that matches text agents already write by habit is not a gate.** When designing a guard, ask "would a compliant-looking turn pass by accident?" — if yes, the marker must be something only a deliberate act produces.

## State right now
- `main = b945ef186`. Linear gate 12/12, Hermes closeout gate 16/16, both mutation-proven. Working tree clean; live health 200/ready.
- Verified the gate IS wired on main (7 Stop hooks) — my earlier "not on main" reading was a Git Bash `<rev>:<path>` false negative.
- SWA-144 filed for the mistakes-reporting enforcement shipped last turn (the board update I had skipped).

## Mistakes I made
- **Skipped the board entirely last turn** while passing the gate by merely citing issue numbers → caught when Sean asked directly → rule: a closeout must carry `LINEAR: SWA-<n>` only when the issue was actually updated this turn; otherwise do the write or state N/A.
- **Nearly reported a false finding** ("Linear gate is NOT on main", "main has zero hooks wired") from `git show origin/main:<path>` in Git Bash, which silently mangles the path → caught by recognizing the documented `MSYS_NO_PATHCONV` trap in my own memory before reporting → rule: always `MSYS_NO_PATHCONV=1` for `<rev>:<path>`, and treat an "absent/empty" result from it as unproven until re-run.
- **Wrote a mutation that broke the regex instead of faithfully reverting it** (double-escaping again), so the first mutation run proved the wrong thing — 2 unrelated tests went red while the test I actually wanted to prove stayed green → caught by reading which tests failed → rule: a mutation must be the *faithful* inverse of the change; verify the mutated line reads exactly like the original.

## External-model calibration
- None consulted this turn (no paid calls).

## Sean owes / blockers (if any)
- **Behaviour change to flag:** other agents (Codex, other lanes) that previously passed by incidentally citing an issue will now be blocked until they write `LINEAR: SWA-<n>`, do a real board write, or state `LINEAR: N/A — reason`. Sean can veto the tightening if that friction is unwanted.
- **Config drift, unowned:** main's `.claude/settings.json` wires 7 hooks but not `drift-check-gate.mjs`; the local shared tree wires it and lacks `hermes-inbox-reminder.mjs`. Noted in SWA-144 for reconciliation.
