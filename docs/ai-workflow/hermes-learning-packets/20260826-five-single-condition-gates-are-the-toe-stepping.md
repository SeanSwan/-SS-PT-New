---
title: "Five single-condition Stop gates ARE the toe-stepping"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-26
decision: "Governance review verdict REVISE on the in-house 'shrink CLAUDE.md' analysis; built Slice 1 — merged hermes-closeout-gate, linear-sync-gate and dual-tier-gate into ONE closeout-gate.mjs that emits one block listing every missing item."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: quality-gates / governance / stop-hooks
models_used:
  - model: claude-fable-5
    role: hostile reviewer + blueprint + builder (Sean overrode the Fable build gate explicitly)
    did: "Read origin/main CLAUDE.md, SOUL.md, 38 hook files, 151 memories and 40 session transcripts; measured the block census; classified all 84 rules on the intervention ladder; then built and proved the unified gate (311/311 hook tests, 3 live spawns)."
    cost: subscription
  - model: glm-5.3
    role: parallel reviewer of the same packet
    did: "Right on residency-split, compliance-decay math, rule lifecycle and the incident-response ratchet; overstated memory-file injection as the smoking gun (measured: median 0 memory files recalled per session — the index is the channel, not the files)."
    cost: "$0 (subscription)"
skills_touched:
  - id: closeout-gate (new hook)
    action: created
    motivated_by: "Transcript census over 40 sessions: Linear 59, Hermes memo 44, dry-loop 38, dual-tier 16, proof 15 serialized Stop blocks; 24-38 blocks in the heaviest sessions, each a full turn of governance prose before the next gate asked for the next thing."
  - id: hermes-closeout-gate / linear-sync-gate / dual-tier-gate
    action: retired (superseded, unregistered, files kept one release for their tests)
    motivated_by: "Same as above — the checks were fine; the SERIALIZATION was the defect."
  - id: rule-74
    action: amended (one sentence)
    motivated_by: "It named scripts/hooks/dry-loop-gate.mjs as its enforcer; that file did not exist on origin/main. Prose citing a hook that is not there is the prose/hook drift GLM predicted, found live."
---

## The lesson

**When an owner says "the agent keeps stepping on its own toes", read the transcripts before reading the rulebook.** The in-house analysis and both external transcripts aimed at the 53k-token CLAUDE.md. The transcripts showed something else: seven `Stop` hooks, five of which each blocked on ONE condition, in sequence. The agent finished its work, was blocked for a memo, wrote the memo, was blocked for a ledger, wrote the ledger, was blocked for a summary — up to five extra turns, 24-38 blocks in a heavy session. Every block was individually "correct". Together they were the complaint. **Correct gates composed serially are an incorrect system.** The fix is structural, one day of work, and no amount of rulebook trimming would have touched it.

**Second: a fail-open gate makes a broken probe look like a pass.** My first live spawn of the new gate printed nothing — which is exactly what "allow" looks like. It was actually a Git-Bash `$TEMP` backslash path the hook could not read, so it failed open. I noticed only because I had a control case that MUST block and it also printed nothing. Positive control first, every time (SOUL reflex #1); a gate whose failure mode is silence needs a case that must be loud.

**Third: prose that names its enforcer is a claim to verify, not a fact.** Rule 74 said `dry-loop-gate.mjs BLOCKS…`; the file had been deleted earlier that day and the rule still said it. The rulebook cited a hook that did not exist and nothing checked. Hook-provenance tests check that registered hooks exist; nothing checks that hooks NAMED IN PROSE exist. That is the general shape: any file-path or command a rule cites is a link, and links rot.

## Who did what

- **claude-fable-5** did the measurement that changed the diagnosis (transcript block census; telemetry: hermes would-block 36%, dual-tier 8%), classified the 84 rules (A=9 / C=33 / S=15 / X=10 / P=17), wrote the ≤4k-token target shape, and built the gate. Also produced every mistake below.
- **glm-5.3** independently reached "residency split + status-memory purge + rule lifecycle"; its "memory injection is the smoking gun" claim did not survive measurement (0-7 files/session, median 0) — the stale-status channel is `MEMORY.md` itself, which is loaded every session and carries statuses inline.
- **Sean** overrode the "Fable is review-and-blueprint only" gate for this slice explicitly ("You're gonna build it") — recorded because the seat-relay skill says otherwise and the override should be visible, not silent.

## Skills created or changed

- `scripts/hooks/closeout-gate.mjs` (+ `.test.mjs`, 32 cases): one signals pass, three checks under the predecessor ids so `gate-mode.json` shadow entries and telemetry history keep working, per-check shadow honoured, one block. Threshold unified at ≥2 non-emission writes OR commit/push (Hermes check was ≥3 before — it now joins the same block rather than asking separately).
- Rule 74 enforcement sentence re-pointed from the deleted `dry-loop-gate.mjs` to `closeout-gate.mjs`; `gate-window-parity.test.mjs` re-scoped; skill pointers in `closeout-evidence-lock`, `hermes-inbox`, `hermes-learning-packet`, and the packet `_schema.json` updated.
- Governance verdict + full ladder classification live outside the repo at the review packet (`C:/tmp/governance-review-20260826/out/fable-5.md`); slices 2-4 (CI billing + hooksPath, ≤16 KB residency split, memory status purge + write hook) are queued there.

## Mistakes I made

- Exported `SWAN_GATE_FORCE_NORMAL=1` for the whole test run → `gate-shadow.test` case 5a "shadowed hook writes NOTHING" failed → caught by re-running the glob with a clean env (311/311) → rule: set test-pinning env vars per command, never `export` them across a multi-suite run.
- Wrote `echo "[exit $?]"` after a pipeline → caught by the `exit-status-gate` PreToolUse hook before it ran → rule: this is SOUL reflex #6 and the hook exists precisely because prose did not hold it; it held me too.
- Built the transcript path from Git-Bash `$TEMP` (backslashes) → the gate failed OPEN and printed nothing, indistinguishable from "allow" → caught only because the must-block control also went silent → rule: validate the instrument before believing a negative (SOUL reflex #1; memory `feedback_validate_probe_before_absence_claim`). **This is a repeat of a lesson already written up in this repo** — the corpus has "the tools were wronger than the work" and "verifying the mechanism is not verifying the symptom" from the same day. Writing it up did not stop it; the control case did.
- First edit script used literal `\n` matching on CRLF files → "no change" throw on the first file → caught immediately by the throw I had added → rule: normalise CRLF before literal replace on this repo (Windows checkout), restore after.
- The build packet I wrote for Opus said "merge five hooks"; main had already deleted one (`dry-loop-gate`) and shadowed two — I audited a branch 2,285 commits stale for the first pass and the packet inherited that → caught when I read `git log` on the fresh worktree → rule: `feedback_verify_branch_freshness_before_audit` — I had that memory in context and still wrote the packet from the stale count.

## External-model calibration

- glm-5.3: 6 headline claims → 4 real (residency split, compliance-decay framing, rule lifecycle/ratchet, AGENTS.md as build artifact), 1 overstated (memory-file injection as proximate cause — measured near zero), 1 unverifiable-as-stated (hook retry-thrash from denials without remedies — the block messages here DO carry remedies). Verdict: strong on structure, weak on the one claim it did not measure. $0.

## Error → fix → repeat ledger

| error class | recurrences this session | already written up before? | what finally stopped it |
|---|---|---|---|
| broken probe read as a pass (silent fail-open) | 1 | yes — twice, same day, in this corpus | a must-block control case run alongside every must-allow case |
| `$?` after a pipe | 1 (blocked before execution) | yes — 44 hits in the corpus | the PreToolUse hook, not memory |
| env var leaked across test suites | 1 | no | per-command env |
| CRLF literal-match miss | 1 | no | normalise/restore helper |
| stale-branch numbers copied into a handoff | 1 | yes — `verify-branch-freshness` memory | reading `git log -1` on the worktree before writing |
