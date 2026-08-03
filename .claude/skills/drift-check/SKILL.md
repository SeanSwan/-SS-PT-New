---
name: drift-check
description: Detect the six ways Swan repos silently lie to an agent — mirror divergence, stale branch, stale registry, stale index, missing tooling a doc promises, and guard coverage gaps. Run at session start on any repo, before trusting a governance file, and after any structural change. Use when Sean says "drift check", "are the docs in sync", "is this branch current", or /drift-check.
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

## The six checks

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
git rev-list --left-right --count main...HEAD   # left = behind, right = ahead
```

Hundreds behind means the files you are reading may not reflect reality, and a fix you
make here does **not** fix `main`.

> Found 2026-08-02: a working branch 684 commits behind main. A tool the docs referenced
> was "missing" — it existed on main and postdated the branch by two days.

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
