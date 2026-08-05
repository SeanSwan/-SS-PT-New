---
surface: vs-claude
utc: 20260804T214500Z
topic: Hostile round closed two evasions in the gates I had shipped hours earlier
tags: [governance, hooks, linear-sync, hermes-inbox]
---

## What I did / learned
- Ran a hostile loop against my own two new Stop gates using the inputs they will actually meet in real closeouts. Found and fixed **two real evasions**, both the same class.
- **Linear gate:** my "tightened" marker `LINEAR:\s*(?:[^\n]*\b)?SWA-\d+` still allowed **arbitrary prose between the label and the id**, so `LINEAR: none — but SWA-9 exists` and `blah LINEAR: pending, see SWA-5 later` passed — reassembling the exact accidental-pass hole the tightening existed to close. Fixed: the id must follow the label directly (whitespace / markdown emphasis only).
- **Hermes mistakes gate:** `## Mistakes-adjacent notes` satisfied the contract because `\b` matches at a hyphen. A gate waivable by renaming a heading is the same deny-list failure the whole chain exists to prevent. Fixed with a `(?!-)` guard.
- Verified end-to-end through the **real stdin contract** (not just unit tests): block on evasion, allow on a genuine claim, fail-open on a missing transcript and on malformed stdin — all four correct. Also ran the Hermes gate against a **real pending memo** (allowed, because it genuinely has the section).

## Why it matters to Hermes
- **The recurring lesson, now hit four times:** a guard that looks strict can still be satisfied by text an agent writes for other reasons. When designing any marker, ask *"can a compliant-looking turn pass by accident?"* — if yes, it is not a gate. Prefer a token only a deliberate act produces, and prove it by writing the evasive input yourself.
- Practical: `LINEAR: SWA-<n>` must be the label followed directly by the id. `LINEAR: none`, `LINEAR: pending`, or an issue cited elsewhere in prose will now be blocked.

## State right now
- `main = 2a779fdbc`, pushed and live-verified: `/api/health` 200 healthy/ready, frontend 200, `/api/assignments/my-trainer` 401 (gate intact).
- All five hook suites green: dry-loop 15, dual-tier 1, gate-window-parity 5, hermes-closeout 18, linear-sync 14 — **53 tests, 0 failures**.
- Both fixes mutation-proven with anchor verification (reverting each turns exactly its own test red, then restores). Tree clean, no leftover mutations, no control characters.

## Mistakes I made
- **Shipped both gates with evasions still open** hours earlier, and only found them because I attacked my own work afterward → caught by writing adversarial inputs against my own regex → rule: for any guard, write the evasion attempts as tests *in the same slice* that introduces it, not in a later round.
- **My first "want" expectation in the probe was wrong** — I flagged `LINEAR:\nSWA-144` (label, newline, id) as a failure, but that is a legitimate deliberate claim; I nearly "fixed" correct behaviour → caught by reasoning about intent before editing → rule: when a probe disagrees with the code, decide which one is wrong before changing anything.
- Earlier in the same session I had already logged "never write regex through a shell heredoc" and still used a `node -e` string to patch a regex line — it worked only because I verified the output line afterward → rule stands: patch code with the editor tool, verify the rendered line every time.

## External-model calibration
- None consulted this turn (no paid calls).

## Sean owes / blockers (if any)
- Standing flag (unchanged): the stricter Linear marker affects **all** agents — Codex included. Anything that used to pass by citing an issue now needs a real board write, an explicit `LINEAR: SWA-<n>`, or `LINEAR: N/A — reason`. Veto-able if the friction is unwanted.
- Config drift still unowned: main and the local shared tree wire different hook sets (`drift-check-gate.mjs` vs `hermes-inbox-reminder.mjs`). Tracked on SWA-144.
