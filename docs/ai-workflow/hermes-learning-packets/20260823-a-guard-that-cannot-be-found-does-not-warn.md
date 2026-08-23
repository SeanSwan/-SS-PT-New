---
name: a-guard-that-cannot-be-found-does-not-warn
date: 2026-08-23
originating_model: claude-opus-5
tier_basis: "Opus 5 is Fable-tier by Sean's explicit designation 2026-08-10 (OPUS 5 IS FABLE TIER)"
decision: "A registered guard whose file is absent produces no output — which is byte-identical to a guard that ran and found nothing. Registration must be audited against the filesystem, because the failure is invisible exactly where it matters."
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + investigator
    did: "root-caused why agent sessions in this tree never received their coordination briefing; found two registered-but-absent hooks; restored all four coordination files byte-identical from main"
    cost: subscription
skills_touched:
  - id: rule-67-pair-coding-coordination
    change: repaired
    failure: "the SessionStart briefing hook was registered in settings.json but its file did not exist on this branch, so the entire Coordination Ledger was write-only for every session here"
  - id: SWA-197
    change: created
    failure: "coordination tooling drift had no board issue"
---

# A guard that cannot be found does not warn

## What was decided/built (Fable-tier lesson)

Sean asked why agents were leaving each other notes and nobody was acting on them.
The Coordination Ledger — lane files, lock table, review queue, activity log — was
being written faithfully by multiple agents and read by none at session start.

Root cause: `.claude/settings.json` on this branch registers
`scripts/hooks/lane-session-start.mjs` (SessionStart) and
`scripts/hooks/push-blast-radius.mjs` (PreToolUse). **Neither file exists on this
branch.** Both exist on `origin/main`. The branch forked 2026-06-28; the hooks were
built on main afterwards; the settings file naming them came across and the files
did not.

**The generalisable lesson: a missing guard is indistinguishable from a satisfied
guard.** When a hook's file is absent the harness emits nothing — and "nothing" is
exactly what a healthy guard that found no problems also emits. There is no error,
no warning, no degraded mode. The system reports perfect health precisely because
the thing that would have reported ill health is the thing that is gone.

This is why it survived so long: every session looked normal. The absence was only
detectable from OUTSIDE the system, by a human noticing a second-order symptom —
agents not reacting to each other's notes.

**Therefore: registration is not evidence of existence.** Any config that names an
executable — hooks, cron entries, CI steps, systemd units, MCP servers — must be
audited against the filesystem, and that audit belongs in the drift check that runs
at session start, not in a human's intuition six weeks later.

## Who did what

- **Opus 5 (me)** did all of it: read the ledger properly for the first time, found
  the review queue held Final-Decider requests addressed to me that I had never
  opened, traced the missing hooks, restored them, and verified.
- **No external model was consulted.** This was filesystem and git archaeology; a
  paid seat would have added cost and nothing else.
- **Prior unknown authors** deserve credit: `lane-session-start.mjs` carries a v2.1
  header describing a cwd-resolution bug that made it silently print nothing from a
  subdirectory. I independently rediscovered that identical class of bug in a Gemini
  adapter earlier the same day. Someone had already solved it and written it down —
  and I could not benefit, because the file carrying the write-up was the file that
  was missing. **A lesson stored only inside the artifact it describes is lost with
  it.** That is an argument for this corpus existing at all.

## Skills created or changed

Nothing edited. That is the deliberate part: all four restored files are **byte-
identical to `origin/main`**, verified with `git hash-object` on both sides. This
branch had already forked main's coordination implementation once — a stale,
untracked `scripts/lib/lane.mjs` that nothing imports — and re-forking canonical
files is the mechanism that created this outage. Behavioural fixes belong on main.

## Mistakes I made

- **I read three lane files, saw "idle", and concluded the ledger was quiet.** The
  directory holds 68 lane files, an activity log, a snapshot, and a review queue with
  open Final-Decider requests **addressed to me**. I never opened them. For an entire
  multi-turn session I asserted "Codex lane idle, no collision" as if that were the
  whole picture. It was three files out of seventy-plus.
- **I diagnosed a concurrent agent as "unclaimed" without checking the claim log.**
  I reported that something was editing 13 files with no lane. The activity log and
  snapshot existed the whole time and I had not read them.
- **Sean had to tell me the system existed.** It is documented in CLAUDE.md Rule 67,
  which was in my context from the first token. I read it as background rather than
  as an instruction to execute at session start.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Config references a file that was never carried across; failure is silent | **2** (`lib/panel-remit.mjs`, then these two hooks) | The first was committed hours before the second was found | Auditing registration against the filesystem instead of trusting the config — a loop over every path named in settings.json, testing existence |
| Treating a documented standing procedure as background context rather than a startup action | 1 (Rule 67 ledger) | Rule 67 is in CLAUDE.md and has been the whole time | The restored SessionStart hook now prints the digest, moving it from "something I should remember" to "something the harness performs" |
| Believing a negative without validating the instrument | 3 across the session | Yes, repeatedly | Control probes before any absence claim |

**The repeat that matters: the same missing-file class twice in one day on one
branch.** I fixed `panel-remit.mjs` in the morning and wrote a commit message about
how its sibling being tracked is what hid the gap — then spent the afternoon
unable to see that two registered hooks were absent for the identical reason. Fixing
an instance taught me nothing about the class. What generalised it was being forced
to ask "what ELSE is referenced but absent?" and running the loop.

## External-model calibration

None consulted this turn. Worth recording as a routing datum: this was pure
filesystem/git archaeology with a deterministic answer, and every paid seat would
have been pure cost. The correct spend on a "why is this not happening" question
with local evidence is $0.

## Findings reported, not fixed (they live on main)

- **68 lane files with no retention.** `coordination-prune.mjs` ages `review-queue.md`
  and `activity.log.md` but never lane files, so the session-start digest emits ~50
  stale-lane notes. Noise that loud trains agents to skip the briefing — which
  reintroduces this outage by a different route.
- **6 orphaned worktree-local ledgers** under `C:/tmp`: agents publishing lanes where
  no reader in the main tree will ever see them. Notes written where nobody listens.
- **`fable.lane.md` has two EDITING NOW sections**; only the first is read, so it can
  serve a stale claim indefinitely.

## Provenance & privacy

`originating_model: claude-opus-5` (Fable-tier, Sean's designation 2026-08-10).
IDs, paths and roles only; no PII, no secrets. Secret scan clean on every file in
the batch. Restored files verified byte-identical to `origin/main` before commit.
