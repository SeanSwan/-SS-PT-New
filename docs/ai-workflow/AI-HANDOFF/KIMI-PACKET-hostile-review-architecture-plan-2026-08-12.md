# Build packet — architect the hostile-review system that replaces our broken dry-loop

**Date:** 2026-08-12 · **Architect requested:** Kimi K3 · **Builder:** Claude Opus 5 (this repo)
**Your previous review of this system is the input to this packet — do not re-derive it.**

You are the **architect**. Produce a plan complete enough that a competent builder AI executes it
without asking you a single follow-up question. The builder is Opus 5 working in this repo. Your
plan is the specification; the builder makes no design decisions.

---

## 1. What you already concluded (carried forward — treat as settled)

You reviewed this workflow earlier today. Your findings, condensed:

- **Load-bearing cause:** the searcher, judge, witness and court reporter are the same mind. No
  termination rule that mind executes can exceed its own beliefs. Self-review round N+1 has ≈0
  marginal information; a different-prior reviewer's round 1 found 17 defects on the same code.
- **The gate enforces a string,** not a process (`/DRY-LOOP:\s*(CLEAN\s*[×x]\s*2|N\/A)/i` +
  `/PROOF:\s*\S/i` against the last assistant message). Both are trivially satisfiable.
- **Do NOT ship attack-surface checklists as a gate** — the author's beliefs make the sweep nominal.
  Checklists are briefing input to the external reviewer only.
- **An agent-written round ledger is forgeable** — six plausible entries written in one shot at
  closeout. The hook must own ledger writes; the agent emits structured round-events. And the
  ledger's real value is as the external reviewer's briefing document, not as enforcement.
- **Mechanical vantages** (rerun under a different locale, double-spaced query, golden corpus with a
  known answer) generate new information; **interpretive vantages** (re-read as "security reviewer")
  do not — same weights, same blind spots, new chair. Only mechanical vantages should count toward
  termination.
- **Termination should be measured, not testified.** Strongest available: mutation-calibrated
  termination (seed known faults, refuse to terminate until ≥X% caught). Next: termination by failed
  falsification — every surface has an *executed* attack with command + output on disk.
- **Your ranked interventions:** ① independent review at the **push boundary** (repo gates are law,
  turn gates are UX) ② artifact + freshness + terminal sentinel verification instead of exit codes
  ③ delete the free-text `N/A` waiver, enumerate exempt shapes mechanically ④ fix-application
  integrity check (claimed fixes ↔ diff hunks) ⑤ hook-owned ledger ⑥ mutation seeding ⑦ checklists.
- **Blind spots you named:** silent fail-open with zero telemetry (a crashed gate and a satisfied
  gate are observationally identical); no escape-rate metric so every fix is unfalsifiable;
  fix-application integrity (a batch patch applied 8 of 9 hunks and the agent believed all 9 landed);
  `fileWrites >= 2` is gameable by one-write-per-turn decomposition with zero visibility into turns
  that route around it; the doctrine has no concept of an oracle; `PROOF:` should be a set of paths
  that must exist and be fresh, not a string in a message.

---

## 2. The owner's requirements (binding — design within these, do not relitigate)

The owner (a solo founder running a production personal-training SaaS; the codebase is enterprise-
grade and handles client PII, payments and scheduling) has specified:

**R1 — Kimi K3 opens every hostile-review cycle.** The FIRST hostile review of a cycle is Kimi.

**R2 — Kimi returns on a fixed cadence: reviews #1, #20, #40, #60…** Every 20th hostile review is
Kimi again. This is a **token-budget constraint** — the owner cannot afford Kimi on every round.

**R3 — All other rounds are performed by the AI currently doing the work** (Opus 5 today).

**R4 — Hostile reviews use high-end models.** "Since this is an enterprise app, I'm preferring to
use high-end models for the hostile reviews so we get as much accuracy as possible." Do not propose
cheap-model reviewers for the hostile role. (Cheap models remain acceptable for mechanical,
non-judgement stages — you decide where that line sits.)

**R5 — The owner must stop being the sensor.** The entire point is that he no longer has to notice
the defect and ask for another review. Anything requiring him to remember something has failed.

**R6 — Deliverables:** the plan must be a **blueprint** with **wireframes**, **flowcharts**, and
**mermaid** diagrams.

---

## 2A. Amendments already adopted (from your own review of this packet — settled, build on them)

You reviewed an earlier draft of this packet and returned 2 Critical / 3 High / 3 Medium / 3 Low.
All corrections below are **adopted verbatim as binding**. Do not re-derive or re-litigate them;
design the rest of the system around them.

**R7 — a hostile review round exists only as a hook-verified artifact** (your S1, the fix you called
the only one whose absence voids the rest):

```
A round counts toward the R2 cadence iff, at gate time, ALL of:
  (a) verdict file exists: .ai-workflow/qa/verdicts/round-<NNNN>-<lane>.md
  (b) mtime within the current session AND newer than the HEAD commit it reviews
  (c) first 512 bytes match:
      /^---\nround: \d+\nlane: (claude|codex)\nreviewer: (kimi|opus|codex)\n
      verdict: (CLEAN|FINDINGS|BLOCKED)\nsha: [0-9a-f]{40,64}\n---/
  (d) for reviewer: kimi — file contains /^finish_reason: (stop|length)/m AND body > 2048 bytes
  (e) the hook — never the agent — appends to .ai-workflow/coordination/review-counter.json
A turn claiming a review without (a)-(e) is treated as NO review. No waiver string exists.
```

**Requirement precedence under conflict** (your S2), highest first:
`R5 > privacy boundary > R1 > R4 > R2 > R3`. If R2's cadence conflicts with a justified
push-boundary anchor, the anchor wins and the cadence shifts: next paid review fires at push OR
round #20, **whichever is first**.

**Counter concurrency invariant** (your S3): exactly one round may hold counter value N. Writes use
an `O_EXCL` lockfile (`.ai-workflow/coordination/review-counter.lock` via `fs.openSync(p,'wx')`,
stale-lock TTL 120s). The loser re-reads and retries with N+1. Contention events append to
`gate-telemetry.jsonl`.

**R8 — fail-closed set, exhaustive** (your S4): (1) privacy boundary — gitignored content staged for
commit, or PII-pattern matches in LLM-bound artifacts: block, no waiver; (2) counter missing/corrupt
at the PUSH boundary: block until the owner runs a repair command; (3) a mandated anchor round with
transport failure: turn boundary fails **OPEN** with telemetry, push boundary fails **CLOSED**.
Everything else fails open plus one JSONL line to `.ai-workflow/qa/gate-telemetry.jsonl`:
`{ts, gate, boundary, result, reason, latency_ms}`.

**Escape definition + falsification instrument** (your S5): an escape is a defect reported by
owner/client/monitoring within 14 days of a push whose fixing commit touches a file in that push's
diff. Capture: append-only `.ai-workflow/qa/escapes.jsonl` —
`{id, reported_ts, push_sha, fix_sha, severity, detected_by}`. 60-day pass: escapes/push < 50% of
the pre-system baseline AND zero escapes in files a gate verdict marked CLEAN. Fail: any
CLEAN-verdict escape, or escapes/push ≥ baseline.

**Latency constraint** (your S6 — this one is a build-time landmine): **no Stop hook may invoke
`consult-kimi.mjs` synchronously.** Stop hooks are capped at 30s; a high-effort Kimi call runs
minutes (the two calls behind this packet took 219s and 654s). Paid reviews run either (i) at the
pre-push boundary, which has no 30s limit, or (ii) detached, writing a sentinel
`.ai-workflow/qa/kimi-<sha>.done` containing `{exit, bytes, finish_reason}`; gates `stat` for
bytes>0 and grep `finish_reason` — never exit codes. Because `git push` is permission-gated to the
owner, the agent must run the push-gate check standalone and paste its verdict into the push
approval request, so he approves with the gate result visible rather than blind.

**Mutation scoping** (your S7): scope mutants to `scripts/hooks/*.mjs`; 10 mutants per hook per
cycle from a fixed operator set (string-literal swap, regex-anchor removal, boundary off-by-one,
negated condition); equivalent mutants adjudicated in writing in the plan; detection floor **80%
post-adjudication** — below that, termination is refused.

**Line limit scope** (your S9): ≤300 lines applies to executable files (`.mjs/.ts/.tsx`). Docs under
`docs/ai-workflow/` and the blueprint itself are exempt.

**Rollback drill** (your S10): every slice's acceptance criteria must include: disable → run the
acceptance command → assert fail-open **with a telemetry line** → re-enable → assert pass.

**Block-message contract** (your S11): every block-message wireframe ends with
`To unblock: <literal command>`.

**Surface binding** (your S8): all surfaces in this system are terminal/file — state that exemption
explicitly in the plan, and ANSI colour may never be the sole carrier of gate semantics
(block/allow must be textual). If you introduce any HTML surface, it binds to Crystalline Swan
dark-first tokens, styled-components, Victory charts, 44px targets, WCAG 4.5:1, reduced-motion,
and the 320→3840 viewport matrix.

---

## 3. Design tensions you must resolve (this is the hard part)

**T1 — R1/R2 put the independent mind at the START; your own #1 finding put it at the END.**
Under R2, rounds 2–19 are self-review — precisely the plateau you diagnosed. Kimi opening the cycle
seeds findings the author could never generate, but every fix made in rounds 2–19 is then reviewed
only by the mind that wrote it. Today's live evidence for why that matters: one fix taught the
system to *see* a class of file while a sibling fix made it unable to *describe* that file — two
halves of one feature working against each other, found only on a fifth pass.
**Relevant budget fact you may not know:** this repo uses a **batch-push cadence** — many slices are
built back-to-back, committed locally, and pushed **once** at batch end. So a push-boundary reviewer
fires roughly **once per session**, not once per slice. That may make a push-boundary Kimi call
cheaper than the every-20-rounds cadence, or complementary to it. **Decide and justify the placement
of the paid anchor calls within R2's budget.** If you believe R1/R2 alone is insufficient, say so
explicitly and specify the minimum addition — the owner will accept a justified cost increase, but
not an unjustified one.

**T2 — What is the counting unit for "hostile review #N", and where does the counter live?**
A round? A task? A slice? It must survive session restarts, be shared across **two agents working
the same tree simultaneously** (Claude and Codex, coordinated via a gitignored lane ledger), and be
non-trivially forgeable by the agent whose behaviour it governs. Specify the file, its format, its
writer, its concurrency story, and what happens when it is missing or corrupt.

**T3 — What structurally compensates for rounds 2–19 being self-review?** This is where your
mechanical-vantage, golden-corpus, fix-integrity and mutation ideas need to become concrete,
enforceable machinery rather than doctrine. Be specific about what the builder implements.

**T4 — Enforcement placement.** We currently have four `Stop` hooks (turn closeout). You argued for
the push boundary. Specify exactly which checks live at which boundary — `Stop` hook, pre-push git
hook, or both — and what each blocks. Note the repo's push command is `git push`, run by the agent,
and `git push` is permission-gated to the owner's approval today.

**T5 — Failure and honesty semantics.** Every gate here fails open today so a broken gate never
wedges a session. You identified that as invisible-failure risk. Specify the telemetry contract and
which conditions (if any) should fail **closed**.

---

## 4. System facts the builder works within (accurate as of today)

- **Platform:** Windows 11, Git Bash available, PowerShell available. Node ESM.
- **Hooks:** `scripts/hooks/*.mjs`, wired in `.claude/settings.json`. Existing Stop hooks:
  `hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate`, `dual-tier-gate` (30s timeout each).
  SessionStart: `drift-check-gate`, `lane-session-start`. PreToolUse on Bash:
  `push-blast-radius.mjs`. Each hook has a co-located `*.test.mjs`.
- **Hook contract:** stdin = `{ stop_hook_active, transcript_path, ... }`; allow = exit 0 silent;
  block = exit 0 + stdout `{"decision":"block","reason":"..."}`. The transcript is JSONL.
- **Known trap, already fixed once:** a Stop hook's own feedback is written back into the transcript
  as a `user` entry; counting it as the user speaking resets the turn window and blinds the gate.
  All four gates carry a byte-identical `isRealUserLine` predicate with a parity test
  (`gate-window-parity.test.mjs`). Any new gate must join that parity set.
- **Paid-review transport (already built and working):** `node scripts/consult-kimi.mjs --document
  <path> --out <path> --effort high --max-tokens 60000 --cap-usd <n> [--confirm-spend]`. Without
  `--confirm-spend` it is a zero-call preflight printing model, prompt size, and worst-case cost.
  It writes a markdown artifact with a header (model, tokens in/out, cost, wall time, finish_reason).
  Sibling CLIs exist for other models. **It has twice reported success while writing nothing**
  (timeout, exit 0) — your ② is aimed at this.
- **Operational stores:** gitignored dirs under `.ai-workflow/` (e.g. `coordination/`, `continuity/`,
  `hermes-inbox/`, `qa/`) hold local agent state; tracked docs live in `docs/ai-workflow/`. Anything
  gitignored is local-only and must never be merged with tracked content (privacy boundary).
- **Constraints:** prefer zero new npm dependencies. Files ≤300 lines. Privacy: IDs and roles only,
  never client PII or secrets, in anything an LLM reads or that gets committed.
- **Rules the builder is bound by:** proof-before-done (no completion claim without current-session
  reproducible evidence in the same message); no speculative success language; regression test first
  for bug fixes where feasible.

---

## 5. Required output format (all of it — this is R6)

Produce a single self-contained blueprint document containing, in this order:

1. **Decision summary** — your resolutions to T1–T5, each with a one-paragraph justification. If you
   are overriding or amending an owner requirement, say so explicitly and give the cost/benefit.
2. **Architecture overview** — the components, what each owns, and the trust boundary between
   agent-written and hook-written state.
3. **Mermaid: state diagram** of one hostile-review cycle from first round to authorised push,
   showing where the paid anchor reviews fire and what each state transition requires as evidence.
4. **Mermaid: sequence diagram** of a single review round — agent, hook, ledger, external reviewer,
   artifacts — showing exactly who writes what and in what order.
5. **Mermaid: flowchart** of the gate decision logic (both boundaries), including every fail-open and
   fail-closed path and the telemetry emission points.
6. **Mermaid: ER or class diagram** of the persisted state — ledger entries, counter, escape ledger,
   verdict artifacts — with field names and types the builder will implement literally.
7. **ASCII wireframes** of every human- or agent-readable surface: the ledger file format, the
   gate's block message, the external reviewer's verdict artifact, the escape-rate report, and the
   terminal output of any CLI you introduce. Exact text, not descriptions — the builder copies these.
8. **File-by-file build order** — every file created or modified, with its path, purpose, approximate
   line count, and its dependencies on other files in the list. Ordered so each step is independently
   shippable and leaves the repo working.
9. **Numbered slices**, each with: scope, the exact files it touches, and **executable acceptance
   criteria** (the literal command to run and the literal output that constitutes a pass). A slice
   whose acceptance criterion is "it works" is a defect in your plan.
10. **Do-NOT list** — the specific wrong turns a builder would plausibly take here, named so they are
    avoided. Include the ones you already identified (checklists as gates, agent-written ledgers,
    interpretive vantages counting toward termination).
11. **Rollback plan** — how to disable each piece if it misfires, without losing evidence.
12. **The falsification test** — the specific measurement that will tell the owner in 60 days whether
    this worked, and what number would mean it did not.

Be concrete. Use real paths, real function names, real regexes, real file formats. Where you specify
a threshold (rounds, percentages, cadence), state the number and why that number. The builder will
implement exactly what you write, so ambiguity in your plan becomes a defect in the system.
