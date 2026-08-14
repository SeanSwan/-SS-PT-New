# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-hostile-review-architecture-plan-2026-08-12.md
**Seed:** docs/ai-workflow/AI-HANDOFF/BLUEPRINT-PART-A-decisions-and-diagrams-2026-08-12.md
**Tokens:** 10120 in / 18849 out | **Cost:** ~$0.3131 | **Wall:** 668.4s | **finish_reason:** stop

---

# BUILD PLAN — PART B (Deliverables 7–12)

Continuation of Part A. All names, paths, regexes, thresholds and decisions from Part A are reused without modification. All surfaces are terminal/file only (S8); no ANSI colour is load-bearing anywhere below.

---

## 7. ASCII wireframes — exact text, copied verbatim

Placeholder conventions used below (and implemented by the builder): `<NNNN>` = zero-padded round number, `<lane>` ∈ `claude|codex`, `<sha>` = full lowercase hex HEAD sha, `<ISO>` = ISO-8601 UTC timestamp, `<...>` = substituted value. Everything else is literal.

### 7.1 `.ai-workflow/coordination/review-counter.json` (single JSON document, hook-written only)

```json
{"version":1,"next_round":7,"updated_ts":"2026-08-12T14:03:11.204Z","last":{"round":6,"lane":"claude","reviewer":"opus","verdict_path":".ai-workflow/qa/verdicts/round-0006-claude.md","sha":"9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6"}}
```

### 7.2 `.ai-workflow/coordination/review-ledger.jsonl` (one entry per line, hook-appended only)

```json
{"round":6,"lane":"claude","reviewer":"opus","verdict":"FINDINGS","sha":"9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6","verdict_path":".ai-workflow/qa/verdicts/round-0006-claude.md","vantage_path":".ai-workflow/qa/vantages/round-0006-claude","fixes_claimed":3,"fixes_verified":3,"session_id":"2026-08-12T13-58-02Z-claude","ts":"2026-08-12T14:03:11.204Z"}
```

Anchor rounds (reviewer `kimi`) use `"vantage_path":null`. Rounds with no fix claims use `"fixes_claimed":0,"fixes_verified":0`.

### 7.3 Verdict artifact `.ai-workflow/qa/verdicts/round-0020-claude.md` (kimi anchor round)

```
---
round: 20
lane: claude
reviewer: kimi
verdict: FINDINGS
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
---
finish_reason: stop
model: moonshotai/kimi-k3
effort: high
tokens_in: 4533
tokens_out: 12415
cost_usd: 0.1998
wall_s: 113.5

# Hostile review — round 20

<review body; MUST be > 2048 bytes total file body below the frontmatter for reviewer: kimi (R7d)>
```

Self-review draft (reviewer `opus` or `codex`) — same frontmatter shape, `finish_reason` line omitted, no body-size floor; it is a **claim** until the hook performs the R7(e) counter write:

```
---
round: 7
lane: claude
reviewer: opus
verdict: CLEAN
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
---

# Self-review — round 7

<findings or CLEAN justification>
```

Frontmatter must match, against the first 512 bytes:
`/^---\nround: \d+\nlane: (claude|codex)\nreviewer: (kimi|opus|codex)\nverdict: (CLEAN|FINDINGS|BLOCKED)\nsha: [0-9a-f]{40,64}\n---/`

### 7.4 Sentinel `.ai-workflow/qa/kimi-9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6.done`

```json
{"exit":0,"bytes":5123,"finish_reason":"stop"}
```

Gates check `bytes > 0` (bytes of the verdict artifact) and grep `finish_reason` ∈ `stop|length`. The `exit` field is recorded for diagnostics and is **never** used for a gate decision (S6).

### 7.5 Vantage artifacts — `.ai-workflow/qa/vantages/round-0007-claude/`

`vantage.json`:
```json
{"type":"locale-rerun","command":"npm test","ts":"2026-08-12T14:01:44.910Z"}
```

`command.txt` (entire file, one line):
```
npm test
```

`output.txt` (captured stdout+stderr, must be > 0 bytes, written by `vantage-run.mjs`, never by the agent):
```
> personal-training-saas@1.4.0 test
> node --test tests/

# tests 142
# pass 142
# fail 0
```

`type` must be in the closed enum `["locale-rerun","golden-corpus","mutation-run","double-parse"]`. Any other value — including any prose framing — is rejected by enum membership.

### 7.6 `.ai-workflow/qa/pending/fixes-claude.json` (agent-written claim; never evidence)

```json
[{"file":"src/schedule/slots.ts","pattern":"assertSlotOwner\\(","expect":"present"},{"file":"src/payments/refund.ts","pattern":"TODO\\(refund-race\\)","expect":"absent"},{"file":"scripts/hooks/review-round-gate.mjs","pattern":"padStart\\(4,'0'\\)","expect":"present"}]
```

### 7.7 `.ai-workflow/qa/gate-telemetry.jsonl` (exactly one line per gate run — allow, block, or error)

```json
{"ts":"2026-08-12T14:03:11.204Z","gate":"review-round-gate","boundary":"turn","result":"block","reason":"vantage-missing","latency_ms":42}
```

`gate` ∈ `privacy-boundary-gate|fix-integrity-gate|review-round-gate|push-gate|vantage-run|mutation-harness|kimi-anchor-runner|escape-log|review-counter-repair|gate-common-selftest`. `boundary` ∈ `turn|push|tool`. `result` ∈ `allow|block|fail-open|error`.

### 7.8 Mutation report `.ai-workflow/qa/mutation-2026-08-12-claude.json`

```json
{"cycle_id":"2026-08-12-claude","ts":"2026-08-12T15:10:02.511Z","kill_rate_post_adjudication":0.9,"hooks":[{"cycle_id":"2026-08-12-claude","hook":"review-round-gate.mjs","mutants_total":10,"mutants_killed":9,"mutants_equivalent":1,"kill_rate_post_adjudication":1.0,"ts":"2026-08-12T15:10:02.511Z"},{"cycle_id":"2026-08-12-claude","hook":"fix-integrity-gate.mjs","mutants_total":10,"mutants_killed":8,"mutants_equivalent":0,"kill_rate_post_adjudication":0.8,"ts":"2026-08-12T15:10:02.511Z"}]}
```

One `hooks[]` record per mutated hook, fields exactly as the `MUTATION_REPORT` entity in Part A §6. Top-level `kill_rate_post_adjudication` = **minimum** across `hooks[]`. Push gate requires **every** hook record ≥ 0.80. Operators drawn only from {string-literal swap, regex-anchor removal, boundary off-by-one, negated condition}; equivalents adjudicated in `docs/ai-workflow/mutation-equivalents.md`.

### 7.9 `.ai-workflow/qa/escapes.jsonl` (append-only)

```json
{"id":"ESC-0001","reported_ts":"2026-08-20T09:12:00.000Z","push_sha":"9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6","fix_sha":"aa11bb22cc33dd44ee55ff66001122334455aa66","severity":"high","detected_by":"client"}
```

`detected_by` ∈ `owner|client|monitoring`. `severity` ∈ `low|medium|high|critical`.

### 7.10 Gate block messages — Stop hooks (stdout, exit 0)

Every Stop-hook block is exactly one line of JSON on stdout, exit code 0. Each `reason` ends with `To unblock: <literal command>` (S11).

**TB1 — privacy scanner error (fail-closed, R8-1):**
```json
{"decision":"block","reason":"PRIVACY-BOUNDARY-GATE: the privacy scanner itself errored (fail-closed per R8-1; a gate that cannot scan cannot allow). Error: <err.message>. To unblock: node scripts/hooks/privacy-boundary-gate.mjs --selftest"}
```

**TB2 — gitignored staged / PII match (fail-closed, no waiver):**
```json
{"decision":"block","reason":"PRIVACY-BOUNDARY-GATE: gitignored content staged for commit or PII pattern matched in LLM-bound artifact. Offending paths: <path1>, <path2>. No waiver exists. To unblock: git reset -- <path1> && node scripts/hooks/privacy-boundary-gate.mjs --selftest"}
```

**TB3 — claimed round fails R7(a)-(d) (treated as NO review):**
```json
{"decision":"block","reason":"REVIEW-ROUND-GATE: turn claims review round <N> but the verdict artifact fails R7: <failed-check, one of a-missing|b-stale|b-not-newer-than-HEAD|c-frontmatter|d-finish_reason|d-body-bytes>. A turn claiming a review without (a)-(e) is treated as NO review; no waiver string exists. To unblock: node scripts/hooks/review-round-gate.mjs --diagnose <NNNN> <lane>"}
```

**TB4 — anchor in flight:**
```json
{"decision":"block","reason":"REVIEW-ROUND-GATE: round <N> is a paid anchor round (round 1, N mod 20 = 0, or push anchor) requiring reviewer kimi. Detached runner spawned; sentinel .ai-workflow/qa/kimi-<sha>.done not yet valid. To unblock: node scripts/hooks/kimi-anchor-runner.mjs --status <sha>  then end the turn again so this gate re-runs"}
```

**TB5 — vantage missing/invalid:**
```json
{"decision":"block","reason":"REVIEW-ROUND-GATE: self-review round <N> lacks a valid mechanical vantage at .ai-workflow/qa/vantages/round-<NNNN>-<lane>/ (need vantage.json with type in [locale-rerun, golden-corpus, mutation-run, double-parse], command.txt, output.txt bytes>0, mtimes inside this session). Interpretive vantages do not count. To unblock: node scripts/hooks/vantage-run.mjs --type locale-rerun --round <NNNN> --lane <lane> -- npm test"}
```

**TB6 — fix-integrity mismatch:**
```json
{"decision":"block","reason":"FIX-INTEGRITY-GATE: <k> of <n> fix claims in .ai-workflow/qa/pending/fixes-<lane>.json do not match current file contents. First mismatch: <file> — pattern /<pattern>/ expected <present|absent>. To unblock: node scripts/hooks/fix-integrity-gate.mjs --diagnose"}
```

**Disabled-gate fail-open is silent on stdout** (exit 0, no output) with one telemetry line `{"result":"fail-open","reason":"disabled",...}`.

### 7.11 Push-gate terminal output

**PASS (exit 0):**
```
PUSH-GATE: PASS
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
rounds_in_batch: 6
counter: next_round=7 consistent with ledger (6 entries)
privacy: clean (23 files in batch diff scanned)
mutation: kill_rate=0.90 post-adjudication (floor 0.80, cycle 2026-08-12-claude)
fix-integrity: 3/3 claims verified against working tree
anchor: kimi-9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6.done bytes=5123 finish_reason=stop verdict=FINDINGS triaged_in_ledger=true
telemetry: last line 2026-08-12T15:11:40.002Z (fresh)
Paste this block verbatim into the push approval request.
```

**REFUSE (exit 1) — one variant per refusal cause; every variant ends with `To unblock:`:**

PB0 — stale telemetry (silent-crash detector):
```
PUSH-GATE: REFUSE
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
reason: gate-telemetry.jsonl last line is older than session start — a gate crashed silently this session; a crashed gate and a satisfied gate must not be observationally identical
To unblock: node scripts/hooks/privacy-boundary-gate.mjs --selftest && node scripts/hooks/review-round-gate.mjs --diagnose <NNNN> <lane>
```

PB1 — privacy (fail-closed R8-1):
```
PUSH-GATE: REFUSE
sha: <sha>
reason: privacy boundary hit in batch diff (gitignored content or PII pattern), or privacy scanner errored — fail-closed per R8-1, no waiver
detail: <path or scanner error>
To unblock: git reset -- <path> && node scripts/hooks/push-gate.mjs
```

PB2 — counter corrupt (fail-closed R8-2):
```
PUSH-GATE: REFUSE
sha: <sha>
reason: review-counter.json missing/corrupt at push boundary — fail-closed per R8-2
To unblock: node scripts/hooks/review-counter-repair.mjs --confirm
```

PB3 — mutation floor (S7):
```
PUSH-GATE: REFUSE
sha: <sha>
reason: mutation kill rate 0.70 post-adjudication is below floor 0.80 for hook fix-integrity-gate.mjs (cycle 2026-08-12-claude) — termination refused per S7
To unblock: node scripts/hooks/mutation-harness.mjs --cycle 2026-08-12-claude  then strengthen the failing hook's test and re-run node scripts/hooks/push-gate.mjs
```

PB4 — batch fix-integrity:
```
PUSH-GATE: REFUSE
sha: <sha>
reason: batch fix-integrity mismatch — 1 of 5 claims in the batch diff unverified. First: src/payments/refund.ts pattern /TODO\(refund-race\)/ expected absent
To unblock: node scripts/hooks/fix-integrity-gate.mjs --diagnose  then re-run node scripts/hooks/push-gate.mjs
```

PB5 — anchor sentinel missing:
```
PUSH-GATE: REFUSE
sha: <sha>
reason: no push-anchor sentinel .ai-workflow/qa/kimi-<sha>.done for HEAD — every push requires a paid anchor review of the batch diff (T1)
To unblock: node scripts/hooks/kimi-anchor-runner.mjs --spawn <sha>  then re-run node scripts/hooks/push-gate.mjs after the sentinel appears
```

PB6 — anchor transport failure (fail-closed R8-3):
```
PUSH-GATE: REFUSE
sha: <sha>
reason: anchor sentinel present but finish_reason missing/invalid — transport failure at the push boundary fails CLOSED per R8-3
To unblock: node scripts/hooks/kimi-anchor-runner.mjs --spawn <sha> --force  then re-run node scripts/hooks/push-gate.mjs
```

PB7 — findings not triaged:
```
PUSH-GATE: REFUSE
sha: <sha>
reason: anchor verdict is FINDINGS and the ledger contains no triage entry for round <N> — address or explicitly accept each finding in a new verified round
To unblock: node scripts/hooks/review-round-gate.mjs --diagnose <NNNN> <lane>  complete the round, then re-run node scripts/hooks/push-gate.mjs
```

### 7.12 Escape-rate report — `node scripts/hooks/escape-log.mjs --report`

```
ESCAPE-RATE REPORT — generated 2026-10-11T00:00:00.000Z
window: 2026-08-12 .. 2026-10-11 (60 days)
pushes in window: 14
escapes in window: 3
escapes/push: 0.21
baseline escapes/push (pre-system, 2026-06-13 .. 2026-08-11): 0.80
ratio to baseline: 26%
CLEAN-verdict escapes: 0
verdict: PASS
criteria (S5): PASS requires escapes/push < 50% of baseline AND zero CLEAN-verdict escapes; FAIL on any CLEAN-verdict escape OR escapes/push >= baseline
```

---

## 8. File-by-file build order

Ordered so each step is independently shippable and leaves the repo working. All executables are Node ESM `.mjs`, zero new npm dependencies, every executable < 300 lines. Tests use the built-in `node:test` runner and end with the literal line `RESULT: PASS (n/n)`.

| # | Path | Purpose | ~Lines | Depends on |
|---|---|---|---|---|
| 1 | `scripts/hooks/lib/gate-common.mjs` | Shared helpers: `appendTelemetry(entry)`, `readJsonSafe`, `appendJsonl`, `acquireCounterLock`/`releaseCounterLock` (O_EXCL via `fs.openSync(p,'wx')`, stale TTL 120 000 ms, one force-unlink retry), `headSha()`, `sessionId()`, `isDisabled(name)` (checks `.ai-workflow/qa/disabled/<name>`), `failOpen(name,boundary,reason)` | 180 | none |
| 2 | `scripts/hooks/lib/gate-common.test.mjs` | Unit tests for #1 incl. lock contention and stale-lock TTL | 130 | #1 |
| 3 | `scripts/hooks/privacy-boundary-gate.mjs` | Stop + PreToolUse(`git commit`) gate: gitignored-staged detection, PII regex over LLM-bound artifacts, scanner-error fail-closed. Carries inline byte-identical `isRealUserLine`. `--selftest` mode | 230 | #1 |
| 4 | `scripts/hooks/privacy-boundary-gate.test.mjs` | Tests incl. scanner-error path and fail-closed semantics | 160 | #3 |
| 5 | `scripts/hooks/fix-integrity-gate.mjs` | Stop gate: verifies `fixes-<lane>.json` claims (`expect: present|absent`) against current file contents. Inline `isRealUserLine`. `--diagnose` mode | 170 | #1 |
| 6 | `scripts/hooks/fix-integrity-gate.test.mjs` | Tests incl. 8-of-9-hunks case | 140 | #5 |
| 7 | `scripts/hooks/vantage-run.mjs` | Tool: executes mechanical vantage, writes `command.txt`/`output.txt`/`vantage.json` itself; rejects types outside the enum | 150 | #1 |
| 8 | `scripts/hooks/vantage-run.test.mjs` | Tests incl. enum rejection and output capture | 120 | #7 |
| 9 | `scripts/hooks/kimi-anchor-runner.mjs` | Tool: detached spawn of `consult-kimi.mjs`; post-processes output into `verdicts/round-<NNNN>-<lane>.md` (prepends R7 frontmatter); writes `kimi-<sha>.done`. `--spawn <sha> [--force]`, `--status <sha>` | 190 | #1 |
| 10 | `scripts/hooks/kimi-anchor-runner.test.mjs` | Tests with a stubbed transport incl. empty-write (exit 0, bytes 0) case | 150 | #9 |
| 11 | `scripts/hooks/review-round-gate.mjs` | Stop gate: R7(a)–(e) verification, counter increment under lock, ledger append, vantage check, anchor spawn/sentinel check. Inline `isRealUserLine`. `--diagnose <NNNN> <lane>` mode | 285 | #1, #7 formats, #9 sentinel format |
| 12 | `scripts/hooks/review-round-gate.test.mjs` | Tests incl. R7 regex, mtime-vs-HEAD, contention retry, anchor-in-flight block | 210 | #11 |
| 13 | `scripts/hooks/mutation-harness.mjs` | Tool: 10 mutants/hook/cycle from the fixed 4-operator set against `scripts/hooks/*.mjs`, runs each hook's co-located test in a temp copy, writes `qa/mutation-<cycle_id>.json` | 270 | #1 |
| 14 | `scripts/hooks/mutation-harness.test.mjs` | Tests on a fixture hook with known killable mutants | 150 | #13 |
| 15 | `scripts/hooks/push-gate.mjs` | Push boundary: telemetry-freshness assert, privacy scan of batch diff, counter integrity, mutation floor, batch fix-integrity, anchor sentinel; prints §7.11 output; exit 0 PASS / exit 1 REFUSE | 270 | #1, #3, #5, #11, #13 formats |
| 16 | `scripts/hooks/push-gate.test.mjs` | Tests walking PB0–PB7 and PASS | 220 | #15 |
| 17 | `scripts/hooks/review-counter-repair.mjs` | Owner-run: rebuilds `next_round` by scanning `verdicts/round-*.md` + ledger; prints reconstruction; requires literal `--confirm` | 150 | #1 |
| 18 | `scripts/hooks/review-counter-repair.test.mjs` | Tests reconstruction from fixture verdicts | 120 | #17 |
| 19 | `scripts/hooks/escape-log.mjs` | Owner/tool: `--add` append to `escapes.jsonl`; `--baseline` record; `--report` prints §7.12 | 190 | #1 |
| 20 | `scripts/hooks/escape-log.test.mjs` | Tests report math incl. CLEAN-verdict-escape auto-FAIL | 130 | #19 |
| 21 | `scripts/hooks/pre-push-shim.sh` | Tracked source for `.git/hooks/pre-push`: `#!/bin/sh` + `exec node scripts/hooks/push-gate.mjs`; install step documented in runbook (`.git/hooks` is untracked) | 12 | #15 |
| 22 | `.claude/settings.json` (modify) | Add Stop entries (in this order, before existing gates): `privacy-boundary-gate`, `review-round-gate`, `fix-integrity-gate`, each `timeout: 30`; add PreToolUse entry matcher `Bash` → `privacy-boundary-gate.mjs` (self-filters to `git commit`). Existing hooks untouched | +30 | #3, #5, #11 |
| 23 | `scripts/hooks/gate-window-parity.test.mjs` (modify) | Add `privacy-boundary-gate.mjs`, `review-round-gate.mjs`, `fix-integrity-gate.mjs` to the parity set so their inline `isRealUserLine` predicates are byte-compared against the existing four gates | +6 | #3, #5, #11 |
| 24 | `docs/ai-workflow/mutation-equivalents.md` | Written adjudication of equivalent mutants per cycle (S7) | 80 | #13 |
| 25 | `docs/ai-workflow/hostile-review-runbook.md` | Operator runbook: install shim, repair command, escape logging protocol, disable mechanism | 150 | all |

**settings.json wiring (literal fragment the builder merges):**
```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [ { "type": "command", "command": "node scripts/hooks/privacy-boundary-gate.mjs", "timeout": 30 } ] },
      { "matcher": "", "hooks": [ { "type": "command", "command": "node scripts/hooks/review-round-gate.mjs", "timeout": 30 } ] },
      { "matcher": "", "hooks": [ { "type": "command", "command": "node scripts/hooks/fix-integrity-gate.mjs", "timeout": 30 } ] }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "node scripts/hooks/privacy-boundary-gate.mjs --pretool", "timeout": 30 } ] }
    ]
  }
}
```

**Gate-window-parity membership (binding):** every new Stop hook — `privacy-boundary-gate.mjs`, `review-round-gate.mjs`, `fix-integrity-gate.mjs` — carries an inline, byte-identical copy of the `isRealUserLine` predicate and is added to the file list in `gate-window-parity.test.mjs`. `push-gate.mjs` is not a Stop hook and is not in the parity set.

---

## 9. Numbered slices with executable acceptance criteria

Universal conventions: tests print `RESULT: PASS (n/n)` as their final line. `<TEL>` means "a JSON line matching the shown shape with any valid `ts`". The **S10 rollback drill** is part of every slice and uses the uniform disable mechanism: `touch .ai-workflow/qa/disabled/<name>` → component fails open with a telemetry line → `rm` it → component passes.

### Slice 1 — Shared gate library
**Scope:** telemetry contract, counter lock, disable mechanism.
**Files:** #1, #2.
**Acceptance:**
```
$ node scripts/hooks/lib/gate-common.test.mjs
RESULT: PASS (14/14)
$ node -e "import('./scripts/hooks/lib/gate-common.mjs').then(m=>{m.appendTelemetry({gate:'gate-common-selftest',boundary:'tool',result:'allow',reason:'smoke',latency_ms:1});console.log('telemetry-append-ok')})"
telemetry-append-ok
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"gate-common-selftest","boundary":"tool","result":"allow","reason":"smoke","latency_ms":1}
```
**S10 drill:** gate-common is not a gate; drill the disable primitive it owns:
```
$ mkdir -p .ai-workflow/qa/disabled && touch .ai-workflow/qa/disabled/gate-common-selftest
$ node -e "import('./scripts/hooks/lib/gate-common.mjs').then(m=>process.exit(m.isDisabled('gate-common-selftest')?0:1))" && echo fail-open-ok
fail-open-ok
$ node -e "import('./scripts/hooks/lib/gate-common.mjs').then(m=>m.failOpen('gate-common-selftest','tool','disabled'))" && tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"gate-common-selftest","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/gate-common-selftest
$ node scripts/hooks/lib/gate-common.test.mjs
RESULT: PASS (14/14)
```

### Slice 2 — Privacy boundary gate (fail-closed)
**Scope:** R8-1 at turn boundary and on `git commit`.
**Files:** #3, #4, #22 (privacy entries only), #23 (add `privacy-boundary-gate.mjs`).
**Acceptance:**
```
$ node scripts/hooks/privacy-boundary-gate.test.mjs
RESULT: PASS (16/16)
$ node scripts/hooks/privacy-boundary-gate.mjs --selftest
PRIVACY-BOUNDARY-GATE: selftest clean
$ node scripts/hooks/gate-window-parity.test.mjs
RESULT: PASS (5/5)
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/privacy-boundary-gate
$ echo '{"stop_hook_active":false,"transcript_path":"/dev/null"}' | node scripts/hooks/privacy-boundary-gate.mjs ; echo "exit=$?"
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"privacy-boundary-gate","boundary":"turn","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/privacy-boundary-gate
$ node scripts/hooks/privacy-boundary-gate.mjs --selftest
PRIVACY-BOUNDARY-GATE: selftest clean
```

### Slice 3 — Fix-integrity gate
**Scope:** claimed fixes ↔ working-tree content (the 8-of-9-hunks machine).
**Files:** #5, #6, #22 (add Stop entry), #23 (add `fix-integrity-gate.mjs`).
**Acceptance:**
```
$ node scripts/hooks/fix-integrity-gate.test.mjs
RESULT: PASS (12/12)
$ mkdir -p .ai-workflow/qa/pending && printf '[{"file":"package.json","pattern":"\\"name\\"","expect":"present"}]' > .ai-workflow/qa/pending/fixes-claude.json
$ node scripts/hooks/fix-integrity-gate.mjs --diagnose
FIX-INTEGRITY-GATE: 1/1 claims verified
$ node scripts/hooks/gate-window-parity.test.mjs
RESULT: PASS (6/6)
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/fix-integrity-gate
$ echo '{"stop_hook_active":false,"transcript_path":"/dev/null"}' | node scripts/hooks/fix-integrity-gate.mjs ; echo "exit=$?"
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"fix-integrity-gate","boundary":"turn","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/fix-integrity-gate
$ node scripts/hooks/fix-integrity-gate.mjs --diagnose
FIX-INTEGRITY-GATE: 1/1 claims verified
```

### Slice 4 — Mechanical vantage runner
**Scope:** T3(a); tool-written vantage artifacts.
**Files:** #7, #8.
**Acceptance:**
```
$ node scripts/hooks/vantage-run.test.mjs
RESULT: PASS (10/10)
$ node scripts/hooks/vantage-run.mjs --type locale-rerun --round 0001 --lane claude -- node -e "console.log('vantage-smoke')"
VANTAGE-RUN: captured 14 bytes to .ai-workflow/qa/vantages/round-0001-claude/output.txt
$ cat .ai-workflow/qa/vantages/round-0001-claude/vantage.json
{"type":"locale-rerun","command":"node -e \"console.log('vantage-smoke')\"","ts":"<ISO>"}
$ node scripts/hooks/vantage-run.mjs --type security-reviewer --round 0001 --lane claude -- true ; echo "exit=$?"
VANTAGE-RUN: REFUSE type "security-reviewer" not in [locale-rerun, golden-corpus, mutation-run, double-parse]
exit=1
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/vantage-run
$ node scripts/hooks/vantage-run.mjs --type locale-rerun --round 0001 --lane claude -- true ; echo "exit=$?"
VANTAGE-RUN: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"vantage-run","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/vantage-run
$ node scripts/hooks/vantage-run.mjs --type locale-rerun --round 0001 --lane claude -- node -e "console.log('vantage-smoke')"
VANTAGE-RUN: captured 14 bytes to .ai-workflow/qa/vantages/round-0001-claude/output.txt
```

### Slice 5 — Review-round gate (R7 + counter + ledger)
**Scope:** T2, R7(a)–(e), hook-owned ledger, contention retry.
**Files:** #11, #12, #22 (add Stop entry), #23 (add `review-round-gate.mjs`).
**Acceptance:**
```
$ node scripts/hooks/review-round-gate.test.mjs
RESULT: PASS (18/18)
$ node scripts/hooks/review-round-gate.mjs --diagnose 0001 claude
REVIEW-ROUND-GATE: round 0001 lane claude — verdict: missing | vantage: present | counter: next_round=1
$ node scripts/hooks/gate-window-parity.test.mjs
RESULT: PASS (7/7)
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/review-round-gate
$ echo '{"stop_hook_active":false,"transcript_path":"/dev/null"}' | node scripts/hooks/review-round-gate.mjs ; echo "exit=$?"
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"review-round-gate","boundary":"turn","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/review-round-gate
$ node scripts/hooks/review-round-gate.test.mjs
RESULT: PASS (18/18)
```

### Slice 6 — Kimi anchor runner + sentinel verification
**Scope:** S6 detached transport; R7(d) sentinel semantics; anchor-in-flight blocking in `review-round-gate`.
**Files:** #9, #10 (and the anchor branch already in #11).
**Acceptance (uses the built-in stub transport, no paid call):**
```
$ node scripts/hooks/kimi-anchor-runner.test.mjs
RESULT: PASS (12/12)
$ node scripts/hooks/kimi-anchor-runner.mjs --spawn 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6 --stub
KIMI-ANCHOR-RUNNER: spawned detached (stub transport) for sha 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
$ node scripts/hooks/kimi-anchor-runner.mjs --status 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
KIMI-ANCHOR-RUNNER: sentinel valid bytes=5123 finish_reason=stop
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/kimi-anchor-runner
$ node scripts/hooks/kimi-anchor-runner.mjs --status 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6 ; echo "exit=$?"
KIMI-ANCHOR-RUNNER: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"kimi-anchor-runner","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/kimi-anchor-runner
$ node scripts/hooks/kimi-anchor-runner.mjs --status 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
KIMI-ANCHOR-RUNNER: sentinel valid bytes=5123 finish_reason=stop
```

### Slice 7 — Mutation harness + equivalents doc
**Scope:** T3(c), S7 floor machinery.
**Files:** #13, #14, #24.
**Acceptance:**
```
$ node scripts/hooks/mutation-harness.test.mjs
RESULT: PASS (11/11)
$ node scripts/hooks/mutation-harness.mjs --cycle 2026-08-12-claude --fixture-only
MUTATION-HARNESS: cycle 2026-08-12-claude fixture-hook.mjs mutants=10 killed=9 equivalent=1 kill_rate_post_adjudication=1.00
$ node -e "const r=require('./.ai-workflow/qa/mutation-2026-08-12-claude.json');process.exit(r.kill_rate_post_adjudication>=0.8?0:1)" && echo floor-ok
floor-ok
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/mutation-harness
$ node scripts/hooks/mutation-harness.mjs --cycle 2026-08-12-claude --fixture-only ; echo "exit=$?"
MUTATION-HARNESS: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"mutation-harness","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/mutation-harness
$ node scripts/hooks/mutation-harness.mjs --cycle 2026-08-12-claude --fixture-only
MUTATION-HARNESS: cycle 2026-08-12-claude fixture-hook.mjs mutants=10 killed=9 equivalent=1 kill_rate_post_adjudication=1.00
```

### Slice 8 — Push gate + pre-push shim
**Scope:** T4 push boundary; PB0–PB7; PASS/REFUSE output.
**Files:** #15, #16, #21, #25 (install instructions).
**Acceptance (fixture state seeded by the test):**
```
$ node scripts/hooks/push-gate.test.mjs
RESULT: PASS (20/20)
$ node scripts/hooks/push-gate.mjs --fixture pass
PUSH-GATE: PASS
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
rounds_in_batch: 6
counter: next_round=7 consistent with ledger (6 entries)
privacy: clean (23 files in batch diff scanned)
mutation: kill_rate=0.90 post-adjudication (floor 0.80, cycle 2026-08-12-claude)
fix-integrity: 3/3 claims verified against working tree
anchor: kimi-9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6.done bytes=5123 finish_reason=stop verdict=FINDINGS triaged_in_ledger=true
telemetry: last line <ISO> (fresh)
Paste this block verbatim into the push approval request.
$ node scripts/hooks/push-gate.mjs --fixture counter-corrupt ; echo "exit=$?"
PUSH-GATE: REFUSE
sha: 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6
reason: review-counter.json missing/corrupt at push boundary — fail-closed per R8-2
To unblock: node scripts/hooks/review-counter-repair.mjs --confirm
exit=1
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/push-gate
$ node scripts/hooks/push-gate.mjs --fixture pass ; echo "exit=$?"
PUSH-GATE: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"push-gate","boundary":"push","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/push-gate
$ node scripts/hooks/push-gate.mjs --fixture pass
PUSH-GATE: PASS
<full PASS block as above>
```

### Slice 9 — Counter repair (owner tool)
**Scope:** R8-2 recovery path.
**Files:** #17, #18.
**Acceptance:**
```
$ node scripts/hooks/review-counter-repair.test.mjs
RESULT: PASS (9/9)
$ node scripts/hooks/review-counter-repair.mjs --confirm --fixture
REVIEW-COUNTER-REPAIR: scanned 6 verdict files, ledger 6 entries, reconstructed next_round=7
REVIEW-COUNTER-REPAIR: wrote .ai-workflow/coordination/review-counter.json
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/review-counter-repair
$ node scripts/hooks/review-counter-repair.mjs --confirm --fixture ; echo "exit=$?"
REVIEW-COUNTER-REPAIR: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"review-counter-repair","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/review-counter-repair
$ node scripts/hooks/review-counter-repair.mjs --confirm --fixture
REVIEW-COUNTER-REPAIR: scanned 6 verdict files, ledger 6 entries, reconstructed next_round=7
REVIEW-COUNTER-REPAIR: wrote .ai-workflow/coordination/review-counter.json
```

### Slice 10 — Escape log + falsification report
**Scope:** S5 instrument (deliverable 12's machinery).
**Files:** #19, #20.
**Acceptance:**
```
$ node scripts/hooks/escape-log.test.mjs
RESULT: PASS (10/10)
$ node scripts/hooks/escape-log.mjs --add --push-sha 9f2c1a4b7d3e8f0a1b2c3d4e5f60718293a4b5c6 --fix-sha aa11bb22cc33dd44ee55ff66001122334455aa66 --severity high --detected-by client --fixture
ESCAPE-LOG: appended ESC-0001
$ node scripts/hooks/escape-log.mjs --report --fixture
ESCAPE-RATE REPORT — generated <ISO>
window: 2026-08-12 .. 2026-10-11 (60 days)
pushes in window: 14
escapes in window: 3
escapes/push: 0.21
baseline escapes/push (pre-system, 2026-06-13 .. 2026-08-11): 0.80
ratio to baseline: 26%
CLEAN-verdict escapes: 0
verdict: PASS
criteria (S5): PASS requires escapes/push < 50% of baseline AND zero CLEAN-verdict escapes; FAIL on any CLEAN-verdict escape OR escapes/push >= baseline
```
**S10 drill:**
```
$ touch .ai-workflow/qa/disabled/escape-log
$ node scripts/hooks/escape-log.mjs --report --fixture ; echo "exit=$?"
ESCAPE-LOG: DISABLED (fail-open)
exit=0
$ tail -n 1 .ai-workflow/qa/gate-telemetry.jsonl
{"ts":"<ISO>","gate":"escape-log","boundary":"tool","result":"fail-open","reason":"disabled","latency_ms":<n>}
$ rm .ai-workflow/qa/disabled/escape-log
$ node scripts/hooks/escape-log.mjs --report --fixture
ESCAPE-RATE REPORT — generated <ISO>
<full report as above>
```

---

## 10. Do-NOT list

1. **Do NOT ship attack-surface checklists as a gate.** Checklists are briefing input to the external reviewer only; the author's beliefs make a self-executed sweep nominal.
2. **Do NOT let the agent write `review-ledger.jsonl` or `review-counter.json`.** Hook writes only (R7e). An agent-written ledger is six plausible entries written in one shot at closeout.
3. **Do NOT count interpretive vantages toward termination.** "Re-read as security reviewer" is the same weights in a new chair. Vantage validity is enum membership in `["locale-rerun","golden-corpus","mutation-run","double-parse"]`, nothing else.
4. **Do NOT invoke `consult-kimi.mjs` synchronously from any Stop hook.** Stop hooks are capped at 30 s; observed paid calls ran 219 s and 654 s. Detached spawn + sentinel only (S6).
5. **Do NOT trust `consult-kimi.mjs` exit codes.** It has twice reported success while writing nothing. Gates `stat` for `bytes > 0` and grep `finish_reason`; the sentinel's `exit` field is diagnostic only.
6. **Do NOT refactor `isRealUserLine` into a shared import.** It must remain a byte-identical inline copy in each Stop gate, verified by `gate-window-parity.test.mjs`; a shared import silently defeats the parity mechanism's purpose (detecting drift in the turn-window predicate that already bit us once).
7. **Do NOT resurrect string gates.** No `DRY-LOOP:`/`PROOF:` regex against the transcript anywhere in the new code path; `PROOF:` is a set of fresh paths on disk, not a string in a message.
8. **Do NOT implement any waiver string.** The free-text `N/A` waiver is deleted; exempt shapes are enumerated mechanically or not at all. A turn claiming a review without R7(a)–(e) is NO review.
9. **Do NOT treat `fixes-<lane>.json` or `round-event-<lane>.json` as evidence.** They are claims; only hook-verified filesystem state counts.
10. **Do NOT widen the fail-closed set beyond R8.** Everything else fails open + exactly one telemetry line. In particular do not make a missing vantage or a stale verdict fail closed at the turn boundary "to be safe" — that wedges sessions and teaches the agent to route around gates.
11. **Do NOT swallow telemetry write errors silently.** If the telemetry append itself fails, the gate still exits per its normal semantics but prints a diagnostic to **stderr** (stderr is never gate semantics). Silence is the crash signal this system exists to eliminate.
12. **Do NOT use ANSI colour as the sole carrier of block/allow.** All semantics are textual (S8).
13. **Do NOT mutate hooks in place during mutation testing.** Copy to a temp dir, apply the operator there, run that hook's co-located test against the copy.
14. **Do NOT add npm dependencies.** Node stdlib only (`node:test`, `fs`, `crypto`, `child_process`, `path`).
15. **Do NOT exceed 300 lines in any `.mjs`.** If `review-round-gate.mjs` approaches the cap, move pure functions into `lib/gate-common.mjs` — never delete checks to fit.
16. **Do NOT let `push-gate.mjs` read the agent's pasted verdict or any transcript content.** It recomputes everything from hook-written state, tool-written state, and git.
17. **Do NOT merge gitignored `.ai-workflow/` state into tracked content**, and do not commit anything under it (privacy boundary).
18. **Do NOT use mtime alone for freshness.** R7(b) is mtime within the current session **and** newer than the HEAD commit the verdict reviews.
19. **Do NOT assume POSIX paths.** Windows 11 + Git Bash: use `path.join`, never string-concatenated `/` paths, and never shell out to `grep`/`stat` — use `fs` and JS regex.
20. **Do NOT re-enable the old `dry-loop-gate` as a fallback during rollback.** It was diagnosed as enforcing a string, not a process. Rollback means disabling the new gates with telemetry, not reverting to the broken one.

---

## 11. Rollback plan (per component, evidence-preserving)

Universal rules: (i) nothing under `.ai-workflow/` is ever deleted during rollback — counter, ledger, telemetry, verdicts, sentinels, vantage outputs, mutation reports and escapes are the evidence trail and survive any disable; (ii) the disable mechanism is `touch .ai-workflow/qa/disabled/<name>`, which converts the component to fail-open **with a telemetry line**, so a disabled gate is distinguishable from a crashed one; (iii) re-enable is `rm` of that file plus the slice's acceptance command.

| Component | Disable | Evidence retained | Re-enable / verify |
|---|---|---|---|
| `privacy-boundary-gate` | `touch .ai-workflow/qa/disabled/privacy-boundary-gate`; if it misfires badly also remove its two `settings.json` entries | telemetry lines incl. every block | `rm` flag; `--selftest` prints `PRIVACY-BOUNDARY-GATE: selftest clean` |
| `review-round-gate` | disable file; counter and ledger stop advancing but existing entries are untouched | counter, ledger, verdicts, vantages | `rm` flag; `--diagnose <NNNN> <lane>` |
| `fix-integrity-gate` | disable file | `fixes-<lane>.json` claims and telemetry | `rm` flag; `--diagnose` |
| `vantage-run` | disable file | all captured `output.txt` artifacts | `rm` flag; Slice 4 command |
| `kimi-anchor-runner` | disable file; note this makes push anchors unsatisfiable, so pushes will REFUSE at PB5 — disable `push-gate` too if pushes must proceed | sentinels and verdict artifacts | `rm` flag; `--status <sha>` |
| `mutation-harness` | disable file; push-gate will REFUSE at PB3 on next push unless also disabled — that coupling is intentional | `qa/mutation-*.json` reports | `rm` flag; Slice 7 command |
| `push-gate` | disable file **and** delete `.git/hooks/pre-push` (untracked shim; the tracked source `scripts/hooks/pre-push-shim.sh` stays) | full REFUSE/PASS history in telemetry | `rm` flag; reinstall shim; `--fixture pass` |
| `review-counter-repair` | disable file (owner tool; no automation depends on it) | reconstructed counter files | `rm` flag; Slice 9 command |
| `escape-log` | **Do not disable during the 60-day falsification window** — it is the measurement instrument. If it misfires, fix forward; the file is append-only so no data is lost by a bad line (mark corrections with a superseding entry, never edit history) | `escapes.jsonl`, baseline file | n/a during window |
| Whole system | `for g in privacy-boundary-gate review-round-gate fix-integrity-gate push-gate vantage-run kimi-anchor-runner mutation-harness; do touch .ai-workflow/qa/disabled/$g; done` and remove the three added Stop entries + one PreToolUse entry from `settings.json` | entire `.ai-workflow/` tree | reverse; run each slice's acceptance command in order 2→8 |

---

## 12. The falsification test (S5, adopted escape definition)

**Escape definition (binding):** an escape is a defect reported by owner, client, or monitoring within 14 days of a push whose fixing commit touches a file in that push's diff.

**Instrument:** `.ai-workflow/qa/escapes.jsonl` (§7.9) + `escape-log.mjs`. Capture protocol — for every qualifying defect, the owner (or the agent on his behalf, with the owner named in `detected_by`) runs:
```
node scripts/hooks/escape-log.mjs --add --push-sha <sha> --fix-sha <sha> --severity <low|medium|high|critical> --detected-by <owner|client|monitoring>
```
The tool validates the 14-day window and the diff-overlap condition mechanically (`git diff --name-only <push_sha>^ <push_sha>` ∩ `git diff --name-only <fix_sha>^ <fix_sha>` ≠ ∅) and refuses non-qualifying entries, so the metric cannot be padded or deflated by classification drift.

**Baseline (must be established at activation, before the system can affect it):** reconstruct pre-system escapes/push over the 60 days preceding activation from `git log` hotfix commits, client reports, and monitoring incidents; record via `node scripts/hooks/escape-log.mjs --baseline <escapes_per_push> --window-start <date> --window-end <date>`, which writes `.ai-workflow/qa/escape-baseline.json`. Without a recorded baseline the report prints `verdict: NO-BASELINE` and the test is void, not passed.

**Measurement at day 60:**
```
node scripts/hooks/escape-log.mjs --report
```
**Pass:** `escapes/push < 0.50 × baseline` **AND** `CLEAN-verdict escapes = 0` (a CLEAN-verdict escape is an escape whose push's anchor verdict artifact says `verdict: CLEAN` — checked by joining `escapes.jsonl` against the push record's `anchor_verdict_path`).
**Fail:** any CLEAN-verdict escape, **or** `escapes/push ≥ baseline`.
**Middle band (≥ 50% but < 100% of baseline, zero CLEAN escapes):** verdict `INCONCLUSIVE` — extend the window once by 30 days; it is neither pass nor fail, and the owner should treat the system as unproven, not broken.
**Sample-size guard:** fewer than 5 pushes in the window → `verdict: INSUFFICIENT-DATA`, extend 30 days.

**Why this number:** the pre-system state had no escape metric at all, which made every prior fix unfalsifiable. 50% of baseline is the smallest improvement that cannot be explained by variance in push cadence or reporting noise for a solo-founder SaaS pushing in batches, and the zero-CLEAN-escape clause is the direct test of the system's core claim — that a verified CLEAN verdict means something. One escape in a file a gate marked CLEAN falsifies that claim regardless of the ratio.
