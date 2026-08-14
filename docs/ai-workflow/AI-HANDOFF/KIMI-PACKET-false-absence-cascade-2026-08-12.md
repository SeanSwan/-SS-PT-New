# Hostile review — a one-session cascade of confidently-wrong ABSENCE claims

**Date:** 2026-08-12 · **Reviewer:** Kimi K3 · **Subject:** the agent's own verification failures.

You are reviewing a **failure cascade**, not a codebase. In a single session, one agent (Opus 5,
working in a production SaaS repo) made **six** confidently-wrong claims. Every one was a claim that
something was *absent, broken, empty, or complete*. Every one was believed because an **instrument
was trusted without being validated**. In five of six cases the error was caught only because the
human owner pushed back — and retiring that human-as-sensor role is the entire goal of the system
being built.

The bitter irony: this happened *while the agent was designing and building a gate system whose
stated purpose is to stop exactly this*, using a blueprint you authored earlier the same day.

Be hostile. The agent's self-diagnosis is included so you can attack it, not accept it.

---

## 1. The six incidents (all same session, all verifiable from the transcript)

**I1 — Review job reported success while writing nothing.** A paid review CLI was invoked as
`node consult-kimi.mjs ... 2>&1 | tail -6`. The call aborted on a 900s timeout. Because the command
was **piped**, the shell reported *tail's* exit status — 0 — and the harness announced "exit code 0,
completed". Nothing was written.

**I2 — A stale artifact passed a freshness-free check.** The agent's verification for I1 was "does
the output file exist and is it non-empty?" A **previous** run's output sat at the same path, so the
check passed. The agent read a 12-minute-old design review believing it was a freshly generated
architecture blueprint. Caught only by comparing mtime to wall-clock afterwards. Note: the agent had
adopted a rule *that same hour* requiring artifact freshness (mtime newer than the reviewed commit)
and violated it within the hour.

**I3 — A mutation score of 1.00 computed against a RED test suite.** The agent planted 8 known bugs
to test its own test suite; all 8 "died"; score 1.00. But the baseline suite was failing at the
time, so every mutant died trivially. A perfect quality number produced by a broken measurement.

**I4 — A "fix" that was a no-op, reported as applied.** A raw NUL byte was accidentally written into
a source file. Two successive repair scripts reported `replaced=1` while the NUL remained, because
the replacement string was itself being converted into a NUL one layer up (shell/tool escaping). The
agent believed the fix landed twice before checking the actual bytes.

**I5 — A narrow check reported as a broad conclusion.** Asked to sync work to the Linear issue
tracker, the agent checked exactly two places (the current shell's env, and one `.env` with an
anchored grep), found nothing, and told the owner **"board unreachable this session."** In fact the
MCP server was configured all along. The check was accurate about its two locations; the conclusion
covered the world.

**I6 — A broken probe's silence read as evidence of absence.** Pushed by the owner, the agent probed
the Windows registry: `reg query "HKCU\Environment" /v LINEAR_API_KEY >/dev/null 2>&1 && echo
EXISTS || echo "not found"`. It printed "not found" — **and that form of the command fails silently
in this shell, so the `||` branch fires regardless**. Proven by running the identical probe against
`TEMP`, a variable that certainly exists: also "not found". Listing without `/v` showed the owner's
key sitting right there. The agent had reported a **tool malfunction as a fact about the world**,
twice, to an owner who had correctly fixed the thing and was being told he hadn't.

**I7 — Compounding context: the agent was auditing the wrong tree entirely.** All of the above
happened on a branch **1,791 commits behind `origin/main`** (and 87 ahead). A `SessionStart` hook had
printed, verbatim, at session start: *"branch is 1787 commits behind origin/main. Files here may not
reflect reality, tooling may appear 'missing' when it exists on main."* The agent read it and
proceeded anyway. The Linear CLI it declared nonexistent (`scripts/linear-cli.mjs`) was committed to
`origin/main` that same day, specifically titled *"MCP-independent board access so capture stops
silently failing."*

Divergence is two-directional and unresolved: `origin/main` has `lesson-recall-gate.mjs`,
`frontend-guards.mjs`, `hermes-inbox-reminder.mjs`, `linear-sync-gate.test.mjs` that the working
branch lacks; the working branch has `db-blast-radius-gate.mjs`, `drift-check-gate.mjs` that main
lacks. **Slice 1 of your blueprint was built into this stale tree.**

---

## 2. The agent's self-diagnosis (attack this)

**D1 — The unifying defect is the unvalidated instrument.** Every incident is a NEGATIVE claim
("absent", "empty", "clean", "nothing found", "complete") produced by an instrument whose own health
was never established. A positive claim carries its own evidence — you found the thing. A negative
claim is indistinguishable from a broken detector. The system has controls for thoroughness of
review but none for *instrument validity*.

**D2 — Silence is being treated as signal.** Exit code 0, an empty grep, a file that exists, a
passing mutant, a quiet probe — all were read as "the world is thus" when each was equally
consistent with "the measurement did not happen."

**D3 — Scope laundering.** Findings true of a narrow scope (this shell, this tree, these two files)
were reported at world scope ("unreachable", "does not exist"), with no scope qualifier surviving
into the claim.

**D4 — The existing blueprint may not cover this class.** The gate system you designed verifies that
*reviews happened* (verdict artifacts, freshness, hook-written counters) and that *tests are
non-nominal* (mutation floor). None of that catches a gate that reports CLEAN because it crashed,
looked in a stale tree, or ran a probe that silently no-ops. **A gate is itself an instrument making
absence claims.**

---

## 3. What we want from you

1. **Is D1 the right unifying frame,** or is there a sharper one? If the agent is pattern-matching
   six unrelated bugs into a false unity, say so.
2. **What is the minimum mechanical guard for absence claims?** Concretely: what must an agent be
   forced to do before the words "missing / absent / broken / clean / none found / complete" are
   permitted? A control probe (query something known-present, as the `TEMP` test did) is the obvious
   candidate — where does that fail, and what does it cost when the "known-present" control is
   itself wrong?
3. **Does your blueprint need amending,** and if so exactly how? Specifically: what stops the new
   gates from producing their own false CLEANs? Is a self-test-with-known-positive required at every
   gate invocation, or is that too expensive per-turn?
4. **The stale-tree problem.** A hook warned in plain language and was ignored. Is warning-at-session-
   start structurally the wrong place? Should branch staleness **block** rather than warn, and at
   which boundary? Note the owner batches many slices and pushes once per session.
5. **Slice 1 was built on the stale tree.** Rebase now onto main, or continue and merge later? Main
   has been landing hook work all month, including a `lesson-recall-gate.mjs` whose name suggests
   overlap with the system being built.
6. **What are we still not seeing?** The highest-value part. This agent has now produced two
   self-diagnoses in one day, and you refuted the first one's priority ordering. Assume this one is
   similarly wrong somewhere.

Rank by (impact × cheapness). Where you disagree, say so plainly. Do not soften — the owner's
explicit complaint is that he has been the error-detector all day and wants that role automated
away.
