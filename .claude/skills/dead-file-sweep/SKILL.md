---
name: dead-file-sweep
description: Finds and quarantines dead files — unrouted, unimported, unmounted code sitting beside live code where it traps the next agent into editing the wrong file. Two tiers - agent scratch artifacts are auto-removed, pre-existing suspect files are evidenced and proposed for quarantine (never moved silently). Use at closeout, during repo-hygiene scans, when a grep returns two plausible implementations of one thing, or when Sean says "dead files", "clean up the orphans", "/dead-file-sweep".
---

# Dead-File Sweep

**Rule 77 execution surface.** A dead file next to a live one is a trap: the next agent greps, finds the dead twin, edits it, verifies nothing, and ships a change no route reaches. Rules 26/27 exist to *recover* from that confusion. This skill *removes the trap*.

## The two tiers — get this right or you will either leave landmines or destroy work

| | Tier 1 — agent scratch | Tier 2 — pre-existing suspect |
|---|---|---|
| **What** | Files THIS session created as working artifacts | Files that existed before this session and look unreferenced |
| **Action** | **Delete.** No approval. | **Propose.** Never move silently. |
| **Why safe** | Nothing pre-existing is destroyed | Sean's call — Rule 34 |

**Never blur these.** Auto-deleting a Tier-2 file is destroying someone's work. Leaving a Tier-1 file is planting the exact landmine this rule exists to prevent.

## Tier 1 — agent scratch (auto-remove, every closeout)

Anything the current session wrote as a working artifact and never intended to keep:

```
*.tmp.*      *.before.*     *.after.*      probe-*.mjs
verify-*.mjs  *-copy.*      *.orig         *.bak (created this session)
```
…plus any file you wrote next to source instead of into the scratchpad directory.

**Procedure:** before closeout, run `git status --porcelain` and read the untracked list. Every entry must be either (a) intentional deliverable, or (b) deleted. There is no third category.

> **Real instance that created Rule 77:** a `phiScanner.before.tmp.mjs` A/B copy was left sitting beside the live `phiScanner.mjs`. Caught by the closeout diff audit — one grep away from a future agent editing the dead twin and "verifying" a file nothing imports.

**Prevention beats cleanup:** write scratch to the session scratchpad directory, not beside source. Reach for Tier 1 only when you already broke that rule.

## Tier 2 — pre-existing suspects (evidence, then propose)

### Step 1 — find candidates
Name-shape sweep (fast, high precision):
```bash
find backend/services backend/routes backend/controllers frontend/src \
  -type f \( -name "*.mjs" -o -name "*.ts" -o -name "*.tsx" \) \
  | grep -iE "\.(bak|old|orig|backup|disabled|deprecated|unused)\.|[-_](old|backup|copy|deprecated|unused|legacy|final|new)\.(mjs|ts|tsx)$|\([0-9]\)"
```
Reference sweep (slower, catches unnamed orphans): for a suspect module, `rg` its basename across the repo excluding itself.

### Step 2 — prove it is actually dead (all four, no shortcuts)
1. **Imports:** `rg "<basename>" --glob '!node_modules'` — every hit classified.
2. **Route mounts** (backend): is it reachable from `core/routes.mjs`? Trace the chain, don't assume.
3. **JSX usage** (frontend): an `import()` declaration is **NOT** proof of mount (Rule 26). Find the rendered usage or prove there is none.
4. **Dynamic references:** `rg` for the basename as a *string* — template-built paths, registry keys, config values, dynamic `import()`.

If any of the four finds a reference, it is **not dead**. Stop.

### Step 3 — the dormant-on-purpose exception (read this before proposing anything)
**Zero consumers does NOT mean dead.** Some modules are deliberately unwired:
- `voiceConfirmationTier.mjs` — zero consumers **on purpose** (SWA-67). Wiring it would gate commands behind a spoken confirmation no surface can collect.
- `notImplementedCheck` stubs — exist to fail *honestly* rather than manufacture a passing safety check.

**Read the file header first.** A file explaining why it is dormant is doing its job. If it is dormant-on-purpose but has no header saying so, the correct action is **add the header**, not move the file.

### Step 4 — propose (never execute unasked)
Layout — use the existing convention, do not invent one:
```
archive/pending-deletion/<YYYY-MM-DD>/<original/path/preserved>
archive/pending-deletion/<YYYY-MM-DD>/MANIFEST.md
```
Path is preserved underneath so it can be restored exactly. `MANIFEST.md` gets one line per file:
`<original path> | <date> | <evidence summary> | <approved by>`

Never `archive/` root. Never a sibling `_old/` beside live code — the entire point is getting it **out of the working tree's grep path**.

### Step 5 — execute only on explicit approval
Rule 34 governs. Use `git mv` so history follows. Forbidden language, always: *"safe to delete"*, *"guaranteed deletable"*, *"nothing to lose"*. Say instead: *"appears unreferenced based on the four checks above; requires your approval to move."*

## Closeout line (required — Rule 38)

Every substantial task ends with exactly one of:
```
DEAD-FILES: none created, none found
DEAD-FILES: removed N tier-1 scratch artifacts (<names>); M tier-2 candidates proposed (see MANIFEST)
```

## Anti-goals
- Do **not** run a full-repo sweep on every task. Scope to what you touched, plus anything a grep surfaced as a competing implementation.
- Do **not** delete Tier-2 files. Ever. Propose only.
- Do **not** treat "no importers" as sufficient evidence — check dynamic references and read the header.
- Do **not** quarantine tests, fixtures, migrations, seeders, or type-only declaration files by name-shape alone.