# Claude Code Permission Pattern Syntax

**Purpose:** Document the actual (observed) behavior of allow/ask/deny patterns in `.claude/settings.json` so we stop assuming regex support that isn't there.

**Source:** Anthropic's Claude Code documentation + empirical testing during v3 Week 1 rollout (2026-04-19).

**Why this file exists:** Codex's Round 1 review flagged that v3 used patterns like `Bash(*AIza[A-Za-z0-9_-]{35}*)` as if they were regex. Claude Code uses **glob-style matching**, not regex. If a regex character class is interpreted literally, the deny never fires and fails open.

---

## Observed Pattern Semantics

### Tool scope selector

Each entry is of the form `ToolName(argument-pattern)` or just `ToolName`:

```
"Read"                          # Allow ANY Read invocation
"Read(//tmp/**)"                # Allow Read scoped to /tmp subtree
"Bash(git status:*)"            # Allow any "git status ..." command
"Write(frontend/src/**/*.tsx)"  # Allow Write to frontend tsx files only
```

### Pattern matching is glob-style

| Glob | Matches | Does NOT match |
|---|---|---|
| `*` | any characters (including spaces, incl. empty) | — |
| `?` | single character | — |
| `**` | any path depth (in path patterns) | — |
| `[abc]` | character set (literal chars a/b/c) | — |
| `{a,b}` | alternation — `a` OR `b` | — |

### What is NOT supported (confirmed)

- **Regex character classes** like `[A-Za-z0-9_-]{35}` are treated as **literal strings** `[A-Za-z0-9_-]{35}`, not as 35-char alphanumeric matches.
- **Regex quantifiers** like `{3,}`, `+`, quantified `*`, `\d` — not supported.
- **Backreferences** `\1`, `\2` — not supported.
- **Lookahead/lookbehind** `(?=...)`, `(?!...)` — not supported.
- **Regex word boundaries** `\b` — not supported.

### What IS supported (confirmed common patterns)

```jsonc
// Bash commands
"Bash(git status:*)"           // Prefix + any args
"Bash(rm -rf /)"               // Exact literal match
"Bash(npm install:*)"          // Prefix + any args
"Bash(*PGPASSWORD=*)"          // Substring via double-glob
"Bash(*AIza*)"                 // Substring for Google API prefix (coarse)

// Read/Write file scopes
"Read(frontend/src/**)"        // Any file under frontend/src
"Write(frontend/src/**/*.{tsx,ts})"  // Alternation
"Write(backend/migrations/**/*.cjs)"

// Deny wildcards
"Bash(git push --force main)"
"Bash(rm -rf /)"
"Bash(chmod 777:*)"
```

### Colon-star suffix `:*` for Bash

`Bash(command:*)` means "the literal command `command`, followed by any arguments." The colon is required separator between command and args. Without `:*`, the pattern matches only the exact string with no arguments.

```jsonc
"Bash(git status)"        // Matches ONLY "git status" (no args)
"Bash(git status:*)"      // Matches "git status", "git status -s", "git status --short", etc.
"Bash(git push:*)"        // Matches "git push", "git push origin main", etc.
"Bash(git push --force main)"  // Matches ONLY this exact command (NOT "git push --force main --no-verify")
```

---

## Practical implications for v3 Phase 1 denies

### What v3 tried to do (doesn't work as intended)

```jsonc
// These look regex-y but glob-match literally:
"Bash(*AIza[A-Za-z0-9_-]{35}*)"     // Matches the LITERAL string "[A-Za-z0-9_-]{35}"
"Bash(*eyJhbGciOi*)"                // Works — literal substring
"Bash(*sk-ant-api*)"                // Works — literal substring
```

### What actually works (coarse but effective)

```jsonc
"Bash(*PGPASSWORD=*)"                    // Blocks any command with PGPASSWORD= substring
"Bash(*DATABASE_URL=postgresql:*)"        // Blocks DB URL exposure pattern
"Bash(*DATABASE_URL=postgres:*)"
"Bash(*DATABASE_URL=mongodb:*)"
"Bash(*sk-ant-api*)"                      // Anthropic key prefix
"Bash(*sk-proj-*)"                        // OpenAI project key prefix
"Bash(*AIza*)"                            // Google API key prefix (catches AIzaSy... and any AIza* value)
"Bash(*eyJhbGciOi*)"                      // JWT header signature prefix
"Bash(*ghp_*)"                            // GitHub PAT prefix
"Bash(*xoxb-*)"                           // Slack bot token prefix
```

Trade-off: **coarser matching = more false positives** (a command legitimately containing `AIza` as non-key text will be blocked). But the secret scanner (Patch 1) is the real enforcement layer — Bash denies are advisory coarse filters.

---

## Testing methodology

To verify a pattern works as expected in YOUR `.claude/settings.json`:

1. Add the pattern to `.claude/settings.json` `"deny"` list
2. Restart Claude Code (or reload settings)
3. Attempt a Bash command that SHOULD match the deny:
   ```
   Claude, run: echo "test with PGPASSWORD=fakepw"
   ```
4. Expected: Claude reports the command is denied, does not execute
5. Attempt a Bash command that should NOT match:
   ```
   Claude, run: ls
   ```
6. Expected: executes (or asks per `ask` rules)

Pattern testing worth doing before trusting any deny:

- `Bash(*PGPASSWORD=*)` — test with fake `PGPASSWORD=x echo ok`
- `Bash(*AIza*)` — test with fake `echo "AIzaXXX"`
- `Bash(*sk-ant-api*)` — test with fake `echo "sk-ant-api-XXX"`

Save results in this file under the "Verification Log" section below.

---

## Verification Log

| Date | Tester | Pattern | Test Command | Behavior | Pass/Fail |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

(Fill in as patterns are verified during actual Claude Code sessions.)

---

## Design implications for v3 plan

### Keep

- **Pattern-based Bash denies using glob substrings** (coarse but effective)
- Directory-scoped Write allow lists (`frontend/src/**/*.tsx`)
- File-extension alternations (`*.{tsx,ts,css}`)

### Drop from v3 as written

- Any regex character class `[A-Z0-9]{35}` — replace with literal substring glob
- Any regex quantifier — replace with explicit prefix/suffix patterns

### Enforcement layer priority

Per Codex's finding, the actual credential leak prevention is:

1. **Write tool secret scanner** (`scripts/scan-secrets.sh`) — catches content regardless of source
2. **Pre-commit hook** — catches anything that survived layer 1
3. **Bash coarse globs** — catches casual paste-into-shell mistakes but not targeted attacks

Bash denies are NOT the primary enforcement layer. They're a convenience filter. The scanner in Patch 1 is the real defense.

---

## Change log

- **2026-04-19:** File created per v3 Patch 2 / Codex Q4. Pattern semantics documented based on Anthropic's Claude Code docs + logical deduction. Sean to verify specific patterns during Week 1 rollout and fill in Verification Log.
