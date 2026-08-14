---
title: A fix named for its instance leaves the class alive
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, 7 hostile rounds (R1–R5 each found real defects; R6 and R7 dry)
date: 2026-08-14
decision: After fixing a defect a reviewer named, grep for the MECHANISM across the repo — the same bug has almost always already walked to a sibling
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: closed Kimi round 16's four findings, then found four more of the same class in its own loop at $0
    cost: subscription
  - model: moonshotai/kimi-k3
    role: hostile reviewer (round 16, prior session)
    did: 5 findings, all 5 real — including the exit-code flip from a prefix collision
    cost: ~$0.25, one call
skills_touched:
  - name: rule-20 (repo-wide sibling sweep)
    change: exercised — and proved load-bearing
    why: the sweep is what turned one reviewer finding into four; without it three real leaks ship
  - name: rule-73 (proof-before-done) / mutation testing
    change: amended in practice
    why: "the test passes" is not proof the test works; the break must be confirmed PRESENT before the result is read
  - name: feedback_validate_probe_before_absence_claim
    change: exercised — and violated again
    why: a retyped regex through two shells lied about which cases leaked; the probe must read from source
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

A reviewer hands you a finding. You fix exactly what it describes. The finding is closed and the
bug is still in the repo, one function over, wearing a different shape.

This happened **four times in one session**, on one small module:

1. A reviewer found that path-escape *detection* was platform-relative — `isAbsolute` returns false
   on POSIX for a drive-qualified path, so a Windows path was recorded verbatim, username included.
   Fixed.
   **The redaction OUTPUT was still platform-relative:** `shortPath` rendered via node's
   `basename`, which splits only on the host separator, so on POSIX the "redacted" form of a
   backslash path was the entire string. Detection improved; the leak survived.
2. Fixed that. **A repo-wide grep for `basename` then found two more sites** in a sibling file
   hand-rolling the same redaction — one on raw user input (a real leak), and one that was correct
   only *by accident*, because an unrelated line upstream happened to normalize backslashes first.
3. Separately, a reviewer found that a receipt's event id omitted a parameter, so two calls
   collided and one record was silently overwritten. I added the parameter — **in its relativized
   form.** Every external path relativizes to the constant `<external>`, so two *different*
   external values still collided. I had fixed the named instance of a bug whose whole shape is
   "distinct things collapse to one identity."
4. The escape predicate itself: I taught it drive letters (`C:\`) and stopped. **UNC shares**
   (`\\server\share\<name>\` — which leak a server name as well as a username) and **drive-less
   rooted paths** (`\Users\<name>\`) both still recorded verbatim.

Each fix was correct. Each was also *scoped to the example in the report*. The reviewer's finding
named a symptom; I kept treating the name as the boundary.

**The move that works:** after fixing, grep the repo for the *mechanism* — not the symptom.
Not "find other Windows paths," but `basename`, `startsWith`, "a redacted constant used as an
identity." The mechanism is greppable; the symptom is not. That single habit converted one
reviewer finding into four real fixes, at zero marginal cost.

## The second lesson: a test written where it cannot fail

Three separate times I wrote a regression test, ran it green, and it was **worthless** — because
on Windows the very functions that carry the bug (`basename`, `isAbsolute`) already behave
correctly for their own unrelated reasons. The assertion never reached the broken code.

This is not hypothetical: I confirmed it by mutation. I reverted the fix, verified the break was
present in the file, re-ran — **and the test still passed.**

That is exactly why the original defect survived **fifteen** prior review rounds. Every one of them
ran on the same Windows box. The platform was not a detail of the bug; it was the reason nobody
could see it.

The fix is structural: **export the platform-independent primitive and assert that.** A regex-based
`finalSegment` / `isWindowsAbsolute` means the same thing on every host, so the test has teeth
regardless of where it runs. Testing the composed function tests your platform, not your contract.

## The third lesson: prefer deleting the second policy to writing a smarter one

One finding was a prefix collision — routing on `verdict.startsWith('REACHABLE')` also caught a
*different* verdict beginning with the same word, silently reclassifying a broken endpoint as
merely-unverified and flipping an exit code from 1 to 2. A config with one broken server started
exiting 0.

The reviewer proposed a more careful string matcher. I made the verdict **carry its own bucket**
instead. A smarter parser is still a second copy of a decision that already has an owner; it drifts
the moment someone writes a tenth verdict string. Two policies for one question is how a fix lands
in only one of them — which is the same disease as lesson one, at the level of design.

## Who did what

- **Kimi K3 (round 16, prior session)** produced 5 findings; all 5 verified real against the code,
  0 hallucinated. Its analysis of the prefix collision was excellent — it identified the exit-code
  consequence *and* which earlier round's stated rationale the change had silently contradicted.
  Consistent with its 16-round record of 55/56 real.
- **Kimi's blind spot was identical to mine.** It found that escape *detection* was platform-
  relative and did not notice that the redaction *output* one function below had the same flaw, nor
  the UNC and rooted shapes. A hostile reviewer's report is a floor, not a ceiling — the four
  defects found after it were worth more than the four it named, and cost nothing.
- **Opus 5 (this session)** closed the four findings and then found four more in its own loop
  across seven hostile rounds, rounds 6 and 7 dry. No paid call was made.

## Skills created or changed

- **Rule 20 (repo-wide sibling sweep) — proved load-bearing, not ceremonial.** The failure it
  prevents is concrete: three real path-redaction leaks would have shipped, in a module whose
  entire purpose is preventing exactly that leak.
- **Mutation testing, amended.** The break must be confirmed PRESENT in the file before its result
  is read. I ran a mutation via `str.replace`, it silently no-op'd, and the suite reported green —
  which I would have read as "the test has teeth" had I not printed `patched? false` alongside it.
- **Probes must read from source.** A regex retyped through two layers of shell quoting mangled and
  reported the wrong cases as leaking. Rewritten to extract the pattern from the file under test
  and `exit 2` if extraction fails, the probe became trustworthy — and reported the opposite.

## Mistakes I made

- **I repeated the handoff's own top-listed mistake within ten minutes of reading it.** It says, in
  bold, that heredoc and `str.replace` patching fails silently and to use the exact-string editor.
  I authored a test fixture through a bash heredoc; `\\` collapsed to `\`, JS dropped the
  unrecognized escape, and the fixture silently became a string with no separators at all. **A
  documented lesson did not prevent the repeat — only the tool change does.**
- **I then repeated it a second time**, using `str.replace` to inject a mutation. It no-op'd
  silently. Caught only by a diagnostic I happened to print.
- **Three vacuous tests**, described above — each passed against deliberately broken code.
- **I declared a line-cap finding closed while the file was still over the cap.** I removed ~45
  lines and added ~47. Caught only because I measured; the edit "felt" like it satisfied the fix.
- **My first POSIX probe lied and I nearly acted on its output**, which contradicted a fix that was
  already correct.
- Twice a test runner reported alarming results (module-not-found; 13 failures) that were entirely
  my own bad glob. Suspect the invocation before the code.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Silent string-patching (heredoc / `str.replace`) | 2 | **Yes — top item of the handoff I had just read** | Using the exact-string editor exclusively; the tool fails loudly when its anchor is missing |
| Fix the named instance, class survives | 4 | Yes — item 5 of the same handoff | Grepping for the MECHANISM after every fix, not the symptom |
| Vacuous test (passes against broken code) | 3 | Yes — item 3 of the same handoff | Exporting the platform-independent primitive and mutation-testing every new assertion |
| Probe/instrument lies | 1 | Yes — a standing memory | Probe reads the value under test from source and exits non-zero if it cannot |
| Trusting a command's result without reading it | 1 | Yes — item 2 of the same handoff | Printing the precondition (`break present: N`) beside the result |

**The pattern this table shows is the finding.** Every single class had already been written up —
several of them in the very document I read at the start of this session — and every one recurred
anyway. Prose describing a mistake does not prevent it. What stopped each one was a **procedural**
change: a different tool, a mandatory grep, a precondition printed next to the result. Corrections
that survive are procedural, never resolutional. "Be more careful" has now failed five times in one
session and should stop being written down as though it were a fix.

## External-model calibration

- **Kimi K3, one call, ~$0.25, effort high.** 5 findings, 5 real, 0 hallucinated. Best-in-class at
  catching claims the code does not support (a header promising something the hash did not cover;
  a comment asserting an exit-code contract the router had silently broken). Packet-fit remains
  decisive: a real diff with a specific remit gets excellent output.
- **Cost of the four post-review defects: $0.** They came from a subscription-funded hostile loop.
  This is the Switchyard rule in miniature — metered spend buys independence, not thoroughness, and
  the cheapest surface that clears the bar should run first and last.
