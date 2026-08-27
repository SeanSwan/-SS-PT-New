---
lesson: "A redaction gate on the file READ is not a gate on the WIRE. Everything a caller assembles around the document — diffs, prompts, seeds, and the gate's own error messages — leaves unredacted. Put the control at the last point before the socket, and add a test that fails when anything bypasses it."
originating_model: claude-fable-5
date: 2026-08-26
surface: vs-claude
linear: none
status: durable
models_used:
  - model: claude-fable-5
    role: Final Decider review, then builder of the REVISE (hand-driven by owner)
    did: "Reviewed the egress-redactor packet: ruled the canary a real positive control on the instrument but not a coverage proof; found the fail-closed throw swallowed by a caller, the ENOENT message leaking the absolute path, five raw reads in 15 'wired' scripts, and a coverage claim that was false. Then built the transport gate, 26 new test rows, the regression guard, and rewired 15 scripts."
    cost: subscription
  - model: claude-fable-5 (second, parallel session)
    role: independent hostile review against the mid-edit tree
    did: "Found consult-gemini-panel.mjs sending the raw {text,hits} object as '[object Object]' — seed and remit silently dropped while every log line said protected. Also named the missing regression guard and the non-consult egress surfaces. Its blocker 1 and 3 were already closed in the tree it could not see."
    cost: subscription
  - model: claude-opus-5
    role: original builder of the read-time gate + packet author (prior session)
    did: "Built the module and canary, wired 15 scripts at the read, and wrote a §3 evidence table whose coverage row was false. Correctly listed 8 weak points to attack — the review confirmed 6 of them."
    cost: subscription
skills_touched:
  - id: rule-73 (Proof-Before-Done)
    change: reinforced
    failure: "'15/15 wired, 0 unwired' was written from a grep of consult-* files for an import, not from an enumeration of what leaves the socket. The claim was current-session and command-backed and still false — the instrument measured the wrong thing."
  - id: rule-67 R6 (commit safety) — proposed amendment
    change: proposed
    failure: "The git index is unowned shared state; 'stage explicit paths' does not stop another agent's bare `git commit` from sweeping them. Proposed: bare `git commit` without a pathspec is forbidden in a shared tree; use `git commit -- <paths>` (`git add -N` first for new files)."
  - id: scripts/lib/redact-egress.test.mjs regression guard
    change: created
    failure: "Nothing failed when a new consult script called bare fetch(. A convention became a control only when a test enumerates the bypass set."
---

## The lesson

The first egress redactor was correct and well-tested — at the point it ran. It ran at
`readFileSync`. The scripts that called it then built the real request from the redacted
document PLUS a git diff, a CLI prompt, a seed file read raw, and — on the error path —
Node's ENOENT message, which contains the absolute path with the operator's username. That
last one re-created the original incident class inside the fix for the incident.

The control belongs at the last point before the socket: `fetchForEgress(url, init)` redacts
`init.body` as a string, leaves headers alone (the API key lives there), and throws on a body
it cannot see. Per-read helpers stay as early, labelled reporting — defense in depth, not the
control.

The second half of the lesson: a gate is a convention until a test enumerates the bypass set.
The regression guard reads every `consult-*.mjs` and the shared transport lib, fails on any
bare outbound `fetch(`, and fails if a `fetchForEgress` caller forgot the import. A new script
now fails in the suite, not in an incident.

## Why it generalises

Any sanitizer, validator, or auth check placed at the *input* rather than the *boundary* has
the same shape of hole: everything composed after it is unchecked, and the error path is the
most-forgotten composition of all. The test for "is this a control or a convention" is: what
fails if someone bypasses it? If the answer is "nothing," it is documentation.

## Who did what

- **Fable (this session)** ruled on the packet's central question — the canary is a real
  positive control on the instrument (derivation worked, pipeline ran, patterns fire) and NOT a
  coverage proof; a regex that matched only its own canary would pass. It found the swallowed
  throw, the ENOENT channel, the five raw reads, and that the sanitizer consolidation had
  *lowered* coverage (Bearer/phone dropped; `rnd_` — the Render key Sean still has to rotate —
  never covered). Then it built the REVISE.
- **A second Fable session**, reviewing the same files while this one was mid-edit, found the
  `[object Object]` bug in `consult-gemini-panel.mjs` that this session's grep-based sweep had
  not yet reached. Two of its three blockers were already fixed in the tree it could not see —
  a reminder that parallel reviewers must state which snapshot they judged (it did).
- **Opus 5** built the original module and wrote a packet whose §4 weak-point list was
  unusually honest; six of eight items were confirmed. Its §3 coverage row was wrong.

## Skills created or changed

- `scripts/lib/redact-egress.test.mjs` gained the regression guard (created against the
  failure "nothing fails on bypass").
- Proposed amendment to Rule 67 R6 (pathspec commits) — the §5 index-race lesson, recorded in
  the packet's §8.4; not yet applied to CLAUDE.md.
- Rule 73 reinforced by a concrete instance of a command-backed claim that was still false.

## Mistakes I made

- I used a Bash heredoc to write a probe on this Windows host; the tool strips backslashes, so
  my first two probes were mangled and I briefly could not tell whether the `<OPERATOR>×1`
  discrepancy was the shell or the redactor. Fixed by writing probes with the file tool and
  proving the argv count (1) separately from the redactor count (2/2).
- I chased the pre-commit secret scanner one class per pass (`tail -2` hid the rest) for six
  rounds before listing every finding at once. Read the whole instrument output before fixing.
- My first ID rule (`\b\d{8,}\b`) ate the all-digit 9-char SHA `139437997` — which is in the
  packet itself. Caught by my own prose fixture; tightened to keyed 7+ / bare 10+.
- My grep sweep for raw `redactForEgress(` misuse ran only after the second Fable named the
  `[object Object]` bug. I had the `.text` fix in `consult-codex.mjs` and did not immediately
  ask where else the object was being used as a string.
- No repeated-from-a-prior-write-up mistakes this session.

## Error → fix → repeat ledger

| Error class | Recurred this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Bash heredoc strips backslashes on this host | 2× (probe.mjs, count.mjs) | no | write probe files with the file tool; memory already held the `MSYS_NO_PATHCONV` cousin |
| Reading only the tail of a multi-finding scanner | 6× | no | `grep "SECRET FOUND"` on the full output, fix all lines in one pass |
| Placing a control at the input instead of the boundary | 1× (inherited) | no — this packet is the write-up | `fetchForEgress` + the guard test |
| Command-backed claim that measured the wrong thing ("15/15 wired") | 1× (inherited) | yes — Rule 73, and the 2026-08-26 packet "verifying the mechanism is not verifying the symptom" | the guard test measures the bypass set, not the import |

## External-model calibration

- **Fable (second session), subscription:** 3 blockers, 6 findings. Real on the tree it saw: all.
  Still real on the current tree: blocker 2 (`[object Object]`), findings 1-4, the guard-test
  and egress-surface MISSED items. Already closed before its verdict arrived: blockers 1, 3.
  High-value, zero-cost; the snapshot caveat it stated up front made the fold-in trivial.
- No paid seats were spent this session.
