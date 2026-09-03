---
title: An updater that switches branches silently unships your own security fix — a local patch is only alive while it sits in the deployed ref
date: 2026-09-02
originating_model: claude-fable-5
tier: fable
tier_basis: Authored by Claude Fable 5.1 (runtime id claude-fable-5-1), the current Fable release; Fable is Sean's Final Decider tier by designation 2026-06-10 and the allowlist id claude-fable-5 is the family key that predates the 5.1 point release
decision: Before any operation that moves the deployed ref, run git cherry -v against upstream and commit WIP; a local fix is only alive while it is in the ref that runs
status: draft
privacy: IDs/roles only; no PII, no secrets, no absolute paths
surface: hermes-agent install (WSL) / hermes update / cron continuity
models_used:
  - model: claude-fable-5-1 / builder + hostile reviewer + final decider / inspected the install read-only, preserved WIP as a commit, ran the v0.21 update, verified gateway+Telegram+MCP+model round-trip, enabled cron continuity / subscription
  - model: qwen3.8-ctx131k (local) / smoke target / answered the PONG probe through the new code in 37 s / $0.00
  - model: none-external / no paid seat consulted / upstream release notes came from GitHub, not a model / $0.00
skills_touched:
  - id: hermes cron be0178803f69 --continuity / amended / v0.21 lets a cron job see its previous run; the Morning Ops Briefing had been restarting from zero every day
  - id: memory project_hermes_v021_update_2026_09_02 / created / the parked security branch would otherwise be forgotten until the hole was rediscovered
---

## The lesson

**`hermes update --branch main` did exactly what it said: it switched the checkout to
`main`, pulled 5,331 commits, and restarted the gateway. What it did not say is that the
nine commits on the branch it left — four of them a fail-closed fix for quick-command alias
shadowing that upstream still does not have — are no longer in the running process.** Nothing
errored. `git cherry` shows all nine as `+` (not upstream). The install is newer and the
specific hole Sean patched on 2026-08-16 is open again in the TUI gateway.

The general form: **a local fix lives only while it is in the ref that is deployed.** A branch,
a stash, a WIP file — each is a place a fix can be *stored*, and none of them is a place it
*runs*. Any operation that moves the deployed ref (an updater, a `checkout`, a rebase, a
container rebuild from a tag) unships every local-only change without a diagnostic, because
from git's point of view nothing was lost.

Consequences that were live in this session:

1. **Inventory local-only commits BEFORE the ref moves, not after.** `git cherry -v origin/main HEAD`
   answers "which of my commits does upstream lack" in one line. Run it first; it is the only
   moment the answer is cheap. After the switch the branch is still there, but nobody is
   looking at it.
2. **Uncommitted work must become a commit before any branch switch — even an auto-stashing one.**
   The updater's `non_interactive_local_changes: stash` would have parked a 379-line
   transcription fix in a stash that, popped onto main, would conflict on three of its four
   files. A WIP commit on the feature branch (`1e7ac6a708`) costs nothing and has a name.
3. **"Upstream fixed it" needs a symbol-level check, not a changelog read.** Upstream's `cli.py`
   now honours `display.compact` (one of the four fixes) on its own; upstream's
   `tui_gateway/` has no fixpoint or reserved-name guard at all (the other three). The release
   notes said "security hardening across the board" and that sentence covered neither case.
4. **Diff against the artefact made immediately before the change.** My first config diff used
   an 08-27 backup because it was the nearest `.bak`; it attributed Sean's deliberate
   `verify_on_stop` restore to the migration. The updater had written its own
   `pre-update-…zip` one minute earlier. Nearest-looking is not nearest-in-time.

## Who did what

Fable 5.1 did the whole path: read-only inspection, upstream fetch and `git cherry`, the WIP
commit, `hermes update --yes --backup --branch main`, then the hostile pass (gateway PID and
log-file identity, Telegram reconnect timestamp, MCP 61/7, doctor, model round-trip, invariant
grep, cron continuity). The local Qwen answered the probe. No paid model was consulted; the
v0.21 feature list was verified against the GitHub release page rather than the YouTube
transcript Sean pasted, which turned out accurate but incomplete (it omitted the
`max_iterations` default change and the 25 bundled skills dropped from the manifest).

## Skills created or changed

- **Cron continuity on the Morning Ops Briefing** — v0.21 feature, switched on with
  `hermes cron edit <id> --continuity`. Motivating failure: the daily briefing had no memory of
  yesterday's briefing, so "Sean owes" items repeated verbatim instead of showing deltas.
- **Memory record of the parked branch** — created because the failure mode in this packet is
  *silent*; without a written pointer the next agent would see a clean v0.21 install and no
  reason to look for a branch.

## Mistakes I made

- Diffed config against an 08-27 backup instead of the updater's own pre-update zip → wrong
  attribution of one change; caught by reading the backup's filename suffix. MECHANISM: baseline = the artefact the change itself produced (the updater's pre-update zip), never the nearest-looking backup.
- Put a T2 write (`cron edit --continuity`) inside a read-only verification script → the
  auto-mode classifier refused the whole script and the read results were lost with it. Rule:
  one write per command, never inside a read batch. MECHANISM: T2 writes are issued as a bare single command so a refusal costs nothing else.
- Read the bg-launcher's `~/hermes2/logs/gateway.log` and saw "telegram disconnected" as its
  last line → nearly reported a regression. The updater-started gateway logs to
  `~/hermes2/.hermes/logs/gateway.log`, where "telegram connected" followed 32 s later.
  MECHANISM: resolve the running process's log file (its fd or the newest file in HERMES_HOME/logs) before reading any log for a health verdict.
- `pgrep -f` inside a script returned nothing for a gateway that was demonstrably running →
  did not trust the negative; re-checked with `ps -eo args` and the launcher pattern matched
  (`-m hermes_cli.main gateway run --replace`). MECHANISM: a negative from one probe is confirmed by a second, differently-built probe before it is reported.

## Error → fix → repeat ledger

| error class | recurred this session | written up before? | what stopped it |
|---|---|---|---|
| nearest-looking backup used as baseline | 1 | no | read the artefact name; use the one produced by the change itself |
| write bundled into a read-only batch | 1 | no (classifier behaviour, not a rule) | one write per command |
| wrong log file → false negative | 1 | yes — instrument-check skill, 2026-08 | locate the process fd / newest file first |
| trusted `pgrep` empty result | 0 (caught before asserting) | yes — "validate the instrument before a negative" | `ps -eo args` cross-check |

## External-model calibration

No paid or external model consulted. Transcript claims vs GitHub release notes: 7 of 7
headline features confirmed; 2 material omissions (iteration default 50→250, 25 bundled
skills dropped from manifest); 0 false claims.
