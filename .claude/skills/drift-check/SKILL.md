---
name: drift-check
description: Detect the seven ways Swan repos silently lie to an agent — mirror divergence, stale branch, stale registry, stale index, missing tooling a doc promises, guard coverage gaps, and registered hooks whose files do not exist. Run at session start on any repo, before trusting a governance file, and after any structural change. Use when Sean says "drift check", "are the docs in sync", "is this branch current", or /drift-check.
---

# Drift Check

**The failure this prevents:** a document that reads as complete and authoritative while
being wrong. Not an error — no exception, no red test. An agent reads it, believes it,
and builds confidently in the wrong direction.

Every instance below was found in production on 2026-08-02, in a single session.

## When to run

- **Session start**, on any repo you are about to change. Cheap; ~30 seconds.
- **Before trusting** a governance file, registry, or index you did not just verify.
- **After any structural change** — merging files, renaming, moving a slice, adding a
  guard. Your own change is the most likely source of the next drift.
- Whenever an agent's behavior contradicts a rule you know exists. That usually means it
  never read the file carrying the rule.

## The seven checks

### 1. Mirror drift — two files that must be identical, aren't

`AGENTS.md` and `CLAUDE.md` are supposed to carry the same law. They drift silently
because **each file reads as complete**, so nobody notices one is missing a rule.

Discovery is *first-match-wins* and `AGENTS.md` sorts first, so a rule living only in
`CLAUDE.md` is invisible to anything relying on auto-discovery.

```bash
# SS-PT — AGENTS.md = 45-line Codex adapter + mirrored CLAUDE.md body.
# NEVER make these byte-identical; that would delete the adapter.
node scripts/sync-agents-mirror.mjs --check     # reports drift, writes nothing
node scripts/sync-agents-mirror.mjs             # regenerates the body from CLAUDE.md

# SwanGuard — these ARE byte-identical mirrors of one merged document.
cd <swanguard> && cmp -s AGENTS.md CLAUDE.md && echo OK || echo DRIFT
```

**Know which contract each repo uses before "fixing" anything.** The same symptom has
opposite correct responses in these two repos.

> Found 2026-08-02: SwanGuard 140 vs 53 lines, neither a superset — the slice-continuity
> rule was invisible. SS-PT drifted on both this branch **and main**.

### 2. Stale branch — you are auditing a fossil

```bash
git fetch --quiet origin main                          # local `main` is itself a branch
git rev-list --left-right --count origin/main...HEAD   # left = behind, right = ahead
```

Hundreds behind means the files you are reading may not reflect reality, and a fix you
make here does **not** fix `main`.

**Measure against `origin/main`, never local `main`.** Local `main` only moves when someone
checks it out and pulls, so it silently becomes its own fossil — and then this check reports
a comforting number instead of a true one.

> Found 2026-08-02: a working branch 684 commits behind main. A tool the docs referenced
> was "missing" — it existed on main and postdated the branch by two days.
>
> Found 2026-08-03: that 684 was itself wrong. Local `main` had not moved since 2026-07-16
> and sat 746 commits behind origin, so the real distance was **1430**. The staleness
> detector was stale. Always name the ref alongside the number, so the reader can audit it
> rather than trust it.

### 3. Stale registry — the task board does not know about the current program

An agent told to "read the registry and state the next slice" will happily follow a
months-old entry and drift, *because it did what it was told.*

```bash
grep -cE "<current program marker>" docs/11-slice-registry.md   # 0 = stale
tail -20 docs/11-slice-registry.md                              # what does it think is next?
```

> Found 2026-08-02: zero mentions of a fully-planned six-slice chain. An agent sent to the
> registry would have drifted a second time — because of the instruction, not despite it.

### 4. Stale index — the recall layer points at content that moved

Indexes decay quietly. A row whose source hash no longer matches is worse than a missing
row: it is confidently wrong.

```bash
node scripts/catalog-regen.mjs --check          # exit 2 = re-distillation needed
```

**Index rows are pointers, never canon.** Open the source file before acting on a row.

### 5. Missing tooling — a doc promises a script that does not exist

Documents outlive their tooling. A maintenance instruction with no working command is
how a mirror contract goes unenforced for weeks.

```bash
# Extract every script path a governance doc references, then test each one
grep -ohE '(node|bash|python3?) [a-zA-Z0-9_./-]+\.(mjs|js|sh|py)' AGENTS.md CLAUDE.md \
  | awk '{print $2}' | sort -u | while read -r s; do
      [ -f "$s" ] && echo "OK   $s" || echo "MISS $s"
    done
```

> Found 2026-08-02: `AGENTS.md` documented a regeneration script that was absent from the
> branch — which is precisely why the mirror had drifted.

### 6. Guard coverage gaps — a guard exists, but only for one case

**The most dangerous class.** A scoped guard reads as protection and leaves everything
outside its scope completely unguarded — and the gap is invisible because the guard
*works* where it applies.

```bash
ls -1 <hermes-skills>/ | grep -- '-rule-router'   # one per active repo?
```

Ask directly: **which contexts does this guard NOT cover, and do they now look
protected?** Also confirm mutual exclusivity — loading the *wrong* guard is worse than
loading none, because it imports another product's law.

> Found 2026-08-02: a rule router existed for one product only. For the other, no
> repository law loaded at all. A build ran with no product boundary and adopted a
> blueprint belonging to a different application.

### 7. Hook-registration integrity — a registered guard whose file is absent

**Worse than check 6, because check 6's guard at least runs.** Here the guard does not
exist at all, and *the harness reports that identically to success.*

A hook the harness cannot find emits nothing. A healthy hook that finds no problems
also emits nothing. They are byte-identical from inside the session — no error, no
warning, no degraded mode. The system reports perfect health precisely because the
component that would report ill health is the one that is gone.

**Registration is not existence.** Any config naming an executable — hooks, cron
entries, CI steps, systemd units, MCP servers — must be checked against the filesystem.

```bash
node scripts/hooks/drift-check-gate.mjs      # check 7 runs automatically at SessionStart
```

This is now mechanical, and it must stay mechanical: **you cannot detect this from
inside a session by observation.** The only prior detection was a human noticing a
second-order symptom from outside — agents ignoring each other's notes for weeks.

Also covers the wider case: a settings file that is not valid JSON runs **none** of the
hooks it declares. Same failure, larger blast radius.

> Found 2026-08-22 by Sean, from outside the system: `.claude/settings.json` registered
> `lane-session-start.mjs` (SessionStart) and `push-blast-radius.mjs` (PreToolUse), and
> neither file existed on the branch. Every agent session skipped its coordination
> briefing and every push went unguarded — silently, for weeks. The branch had forked
> from `main` before those hooks were written; the settings naming them came across and
> the files did not.
>
> The lesson that made this a mechanical check rather than a note: the *previous* fix in
> the same session (a module imported but never committed) taught nothing about the
> class until someone ran the loop over every referenced path. Fixing an instance does
> not generalise. Encode the sweep.

## Reporting

State each check as `OK` / `DRIFT` / `N/A`, with the command output. For any DRIFT, say
whether you fixed it, and whether the fix reaches `main` or only the current branch.

**Never report "docs are in sync" without pasted command output.** That claim is exactly
the kind of confident-and-wrong statement this skill exists to catch.

## After fixing — re-run

Your own fix is the next drift's most likely source. On 2026-08-02, merging two files
into mirrors immediately falsified a guard written an hour earlier that described them as
*"two different documents, not mirrors"* — and fixing that falsified the two steps beneath
it.

**Changing a fact invalidates every document describing the old fact.** After any
structural change, grep for documents asserting the previous state — especially ones you
wrote yourself this session, because those feel verified and get skipped.
