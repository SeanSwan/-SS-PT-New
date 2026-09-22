# Harness coverage — four evidence states, not one

> **Established:** 2026-09-21, S3 of `BLUEPRINT-coordination-discovery-2026-09-20`,
> closing Astra hostile review **F08** (and the evidence half of **F03/F07**).
> **Machine:** Sean's Windows workstation. **Checkout:** this repo, main tree.
> **Rule:** this file records what has been **measured**. It is not a plan and not a
> capability summary. A row moves only when the measurement below it is captured.

## Why four states and not one

Astra F08 named the exact failure: *"configuration presence is being promoted into
cross-harness execution evidence."* A settings file on disk proves that somebody
**wrote** a hook. It does not prove a harness **read** it, that the harness has the
**capability** to run one, or that the hook **executed**. Those are four different
claims and they were being reported as one. Keeping them apart is not pedantry: the
F06 timeout defect was live for weeks *precisely because* the config file existed and
nobody had asked whether it had ever run.

| State | Question it answers | How it is established |
|---|---|---|
| **1. Instruction file present** | Is there a file at the path this harness reads? | `ls` / `existsSync` on the path |
| **2. Rules loaded** | Did the harness actually put those rules in the model's context? | The agent quotes a unique string from the file that it was never told |
| **3. Hook configured** | Does a settings file wire an event to this script? | Read the settings file; confirm event, matcher, command, timeout |
| **4. Hook observed** | Did the hook process actually run, with what result? | Captured output from the hook itself, with timestamp and cwd |

**State 2 is not state 4.** An instruction file can be loaded while the hook that
automates the same step never fires, and vice versa. Neither is inferable from the
other, and neither is inferable from a file's existence.

## The matrix

Measured 2026-09-21 against this checkout. `UNVERIFIED` means exactly that — not
"probably fine".

| Harness | 1. File present | 2. Rules loaded | 3. Hook configured | 4. Hook observed |
|---|---|---|---|---|
| **Claude Code** | ✅ `CLAUDE.md` | ⚠️ presumed — the session reading it is this one, but no unique-string probe was captured | ✅ `.claude/settings.json` → `SessionStart` (no matcher) → `lane-session-start.mjs`, `timeout: 60` *(was 15 — F06, fixed 2026-09-21)* | ❌ **never observed** |
| **Codex** | ✅ `AGENTS.md` | ❌ unverified | ❌ no hook wiring found | ❌ never observed |
| **OpenCode** | ✅ `AGENTS.md` + `.opencode/SEAT.md` | ❌ unverified | ❌ none — `.opencode/SEAT.md` documents this gap itself: "no orient-gate hook on this seat — the ORIENT block is manual discipline here, not enforced" | ❌ never observed |
| **WorkBuddy** | ✅ `CODEBUDDY.md` | ⚠️ presumed — same caveat as Claude | ✅ `.codebuddy/settings.json` → `SessionStart` × 4 matchers (`startup`, `resume`, `clear`, `compact`) → `lane-session-start.mjs`, `timeout: 60` | ❌ **never observed** |
| **Cursor** | ✅ `.cursor/rules/01-coordination-lane.mdc` (`alwaysApply: true`) | ❌ unverified | ❌ no hook mechanism wired | ❌ never observed |
| **Copilot** | ✅ `.github/copilot-instructions.md` | ❌ unverified | ❌ none found; hook capability itself unestablished | ❌ never observed |
| **Gemini CLI** | ✅ `GEMINI.md` | ❌ unverified | ❌ none found | ❌ never observed |

**Zero rows are verified in state 4.** That is the honest state of this machine, and
it is the single most important line in this file.

## What closes a row

To move any row to verified in state 4, capture and record **all** of:

1. Harness name and version, and the OS.
2. The actual command shell the harness uses for hooks.
3. The event that fired (startup / resume / clear / compact — where supported).
4. The starting cwd **and** the resolved checkout, which are often different.
5. The hook's own output, with a timestamp.
6. The effective timeout behaviour — did it complete inside the platform's budget?
7. Whether that output reached the agent **before its first edit**.

Point 7 is the one that matters and the one most easily skipped. A hook that fires at
minute nine, after the agent has already edited, is indistinguishable from no hook at
all for the purpose Rule 67 exists to serve.

An event the harness does not support is recorded as **unsupported** — never silently
counted as passed.

## Consequences while rows are unverified

- Treat orientation on **every** harness as **manual discipline**. Run
  `node scripts/lane-at-root.mjs orientation` yourself; do not assume a hook did it.
- Do not write "the hook orients the session" as a fact in any doc. Write "the hook is
  configured; execution is unverified" — which is what this file does.
- A harness may ship with a documented manual procedure while its automatic hook
  stays unverified. It may **not** be labelled automatically covered. (Blueprint S3
  stop clause: *"no 'every harness' claim without observed execution on every claimed
  automatic surface."*)
