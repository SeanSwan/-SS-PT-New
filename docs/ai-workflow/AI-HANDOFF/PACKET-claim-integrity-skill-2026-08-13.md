# Design packet — turn the "claim integrity" discipline into a callable SKILL

**Date:** 2026-08-13 · **Reviewers:** Kimi K3 (architect) + HY3 (second opinion)
**Deliverable requested:** a build blueprint with **mermaid flowchart**, **wireframes**, and a
file-by-file build plan for a new `.claude/skills/` skill — plus your own enhancements beyond what
is asked here.

---

## 1. Why this skill must exist (evidence, not theory)

In one session an agent (Opus 5) made **six confidently-wrong claims**, every one a claim that
something was *absent, empty, broken, clean, or complete*. The owner caught five of six by pushing
back — the exact role he is trying to automate away.

| # | Claim made | Reality | Failing stage |
|---|---|---|---|
| I1 | "review completed, exit 0" | job aborted on timeout, wrote nothing; `cmd \| tail` reported **tail's** status | report |
| I2 | "artifact verified (exists, non-empty)" | leftover from a previous run at the same path | predicate (no freshness term) |
| I3 | "mutation kill rate 1.00" | computed against a **RED** baseline; every mutant dies for free | preconditions |
| I4 | "NUL byte removed, replaced=1" | replacement string was itself a NUL; two successive no-ops reported success | postcondition / self-report |
| I5 | "Linear board unreachable this session" | checked 2 locations, reported at world scope; server was configured all along | scope |
| I6 | "LINEAR_API_KEY not set" (told to the owner **twice**, about a key he had correctly set) | `reg query ... /v NAME \|\| echo "not found"` — MSYS rewrote the `/v` flag into a path; `\|\|` fired on the entire nonzero domain | probe |
| I7 | "scripts/linear-cli.mjs does not exist" | exists on `origin/main`; the agent's tree was ~1,800 commits behind, and a SessionStart hook had said so in plain words | scope (version axis) |

**Compounding finding:** `lesson-recall-gate.mjs` — the hook whose job is recalling past lessons —
was absent from that tree and **never executed**. The agent repeated a lesson it had written an hour
earlier, with the anti-repeat mechanism missing.

## 2. The frame (settled — build to this, don't relitigate)

A prior hostile review established: the defect is **not** "unvalidated instruments" (that names one
stage). The defect is that the agent **has no representable UNKNOWN** — every outcome is coerced
into a success-shaped boolean.

> A negative or terminal claim is only as sound as its **(probe, scope, predicate, preconditions,
> independence)** tuple, and each of the five fails silently.

Key laws already ratified:
- **A control probe never tells you the answer; it tells you whether you're allowed to have one.**
- Tool outputs are **claims by a tool**, not observations of the world. No claim survives on one
  channel — two mechanistically independent channels, or it stays UNKNOWN.
- `probe.status ≠ completed` → UNKNOWN. `universe.N == 0` → UNKNOWN. `control ≠ PASS` → UNKNOWN.
  UNKNOWN may never coerce to CLEAN.
- Rules stated in prose decay (one was violated within the hour). **Enforcement must live in a
  consumer, not an instruction.**

## 3. What the skill must do (minimum bar)

Trigger whenever the agent is about to assert **missing / absent / broken / empty / clean / none
found / unreachable / nothing / complete / done / passing / no matches / not set / does not exist**.

Must carry, at minimum:
- The **control-probe rule** with a concrete selection rule (control must share everything except
  the target's state — same shell, same quoting path, same hive).
- The **platform trap table**: `MSYS_NO_PATHCONV=1` for Windows `/flag` commands (`reg`, `sc`, `net`,
  `schtasks`, `wmic`) and for `git show <rev>:<path>`; `PIPESTATUS`/`pipefail` because a pipe reports
  the LAST command's status; never route a probe's stderr to `/dev/null` when you intend to believe
  its negative.
- The **tri-state**: `case $? in 0) FOUND;; 1) NOT_FOUND;; *) UNKNOWN;; esac` — never
  `probe || echo "not found"`, which collapses the whole error domain into "absent."
- **Scope-in-the-sentence**: report the scope actually searched (paths, ref+sha, env-keys, host),
  never a world-scope adverb.
- **Version axis**: any repo-absence claim re-checks `origin/main` (fetch if stale) before the words
  leave. Path-scoped, not blanket.
- **Freshness**: an artifact is not evidence until proven fresh — prefer consumer-checked
  `subject_sha` over mtime.
- **Preconditions**: a metric with a broken precondition (red baseline, N=0) is not a number.
- **Postcondition law**: after any mutation, verify on the object via an independent read path
  (hash before/after); `before_hash == after_hash` means the operation claimed nothing.
- **Mechanism escalation**: a failed operation retried by the *same* mechanism is not evidence;
  escalate the mechanism (string-replace → byte-level; `grep` → `git ls-tree`).

## 4. Enhancements the requesting agent proposes (critique these — reject freely)

- **E1 — Ship an executable, not just prose.** A `probe.mjs` helper that takes a target command and
  a control command, runs both, and emits the tri-state verdict plus a serialized discharge record.
  Prose decays; a callable does not. Should the skill's core be a script the agent MUST call?
- **E2 — A negative-claim log + owner-pushback SLO.** Every absence claim appends its discharge
  record; every time the owner corrects the agent, increment a counter. The trend line is the only
  proof the human sensor is actually being retired.
- **E3 — Wire it to the existing Stop-gate family** (there are already 4–7 deterministic Stop hooks
  in this repo) so an unqualified absence claim in a closeout is *blocked*, not merely discouraged.
- **E4 — Cover positive-signal misattribution too**, not just absence: `exit 0`, `replaced=1`,
  `1.00`, "tests pass" are positive signals that lied here. Is "claim integrity" the right scope, or
  should the skill stay narrowly about absence?
- **E5 — Self-application clause.** The prior diagnosis contained its own undischarged absence claim
  ("the system has no control for X" — checked on a stale tree). Should the skill explicitly bind
  *the agent's claims about the system itself*, including "this skill doesn't exist yet"?
- **E6 — Session-entry qualification.** Before any audit whose conclusion could be "X does not
  exist", require: fetch freshness, branch divergence named concretely, and a list of tooling present
  on main but absent locally.

## 5. Required output

1. **Decision summary** — what the skill is, its exact trigger set, and where enforcement lives.
2. **Mermaid flowchart** — the decision path from "agent is about to make a claim" through probe /
   control / scope / preconditions / independence to FOUND | NOT_FOUND | UNKNOWN, including every
   point where the claim is downgraded. Must be syntactically valid in a fenced ```mermaid block.
3. **Mermaid sequence or state diagram** — how the skill, the helper script, the log, and the Stop
   gate interact across one claim.
4. **ASCII wireframes** — the discharge record format, the log line, the block message (ending
   `To unblock: <literal command>`), and the SLO report. Exact text a builder copies.
5. **The skill file itself** — a `SKILL.md` body: frontmatter `name`/`description`, trigger list,
   the procedure, the platform trap table, and worked examples drawn from I1–I7 above.
6. **File-by-file build plan** with line counts and dependencies; executables under 300 lines.
7. **Numbered slices** with **literal executable acceptance criteria** (command + expected output).
8. **Do-NOT list** — the wrong turns a builder would plausibly take.
9. **Your own additions** — the owner explicitly asked what *you* would add that is not in §3 or §4.
   What lanes does this not cover that it should? Be expansive here, then rank by value.

Terminal/file surfaces only — no UI, no DOM, no design rubric applies. Every path, regex, field name
and threshold you write will be implemented literally, so be exact.
