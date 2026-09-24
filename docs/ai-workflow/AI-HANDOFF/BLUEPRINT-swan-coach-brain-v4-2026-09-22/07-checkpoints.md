# 07 — Checkpoints

A phase is done only when its checkpoint receipt is filled in with **current-session
output**. A checkpoint that cites an earlier run is marked `STALE`, not `PASS`. Each phase
exit also files a hostile review under Rule 86 (`Z:\HostileReviews`) that cites the
receipt, and the review must reach a round with no new findings (dry) before the PR merges.

## Receipt template (copy per phase)

```
PHASE: P_
BRANCH / HEAD: <branch> @ <sha>      PUSHED: <remote ref or NO>
DIRTY: <count>   LANE LOCK OWNER: <agent>
REQUIREMENTS: J__, J__
RED EVIDENCE: <test id> failed with <message> at <sha-before>
GREEN EVIDENCE: <command> → <pass/fail counts>
MOUNTED: smoke 375/414/1440 → <3/3?>     SCREENSHOTS: <paths>
BOUNDARIES REAL (not mocked): <list>     MOCK-ONLY: <list>
FILE SIZES: <touched files, wc -l, all ≤ 300?>
HOSTILE REVIEW: <review_id>, rounds: <n>, dry at round <n>
OPEN: <anything NOT RUN / BLOCKED, with owner>
STATE: PLAN READY | IMPLEMENTATION VERIFIED | DEPLOYED
```

## Gates

| Phase | Must be true to exit | Measured by |
|---|---|---|
| P0 | One lineage; S83 backend in a pushed commit; smoke 3/3 on the consolidated branch; unit suites ≥ 1,538 FE / 1,298 BE AI; lane lock active; PR merged to main | `git branch -r --contains`, T-C2, suite JSON, `check-lane-lock` control and refusal |
| P1 | First token ≤ 1.5 s p50 (staging, 30 turns); cancel ≤ 1 s; 0 silent terminals; alias canary 0 leaks | `scripts/qa/stream-soak.mjs`, T-J03a/b, T-J02, T-J11a |
| P2 | Probe ≥ 11/12; golden tool-selection ≥ 90% (primary brain); no write reachable | T-J04, T-J10, T-J06a |
| P2b | ≥ 3 brains pass the conformance kit; leaderboard committed; fallback event observed | T-J09, T-J10, fault injection |
| P3 | 0 mutations before approve; exactly-once under 20 concurrent approves; invalidation matrix green; Redis in production confirmed | T-J06, T-J06b, `GET /api/ai-command/health` store kind = `redis` |
| P4 | ≤ 12 first-paint controls (desktop); transcript ≥ 70% mobile height; 0 colour literals; axe 0 serious; lens switch diff clean | T-J13, T-J14, T-J13a |
| P5 | Approved fact visible in the next turn's prompt; forget removes it; 5 new read domains in the coverage table | T-J08, T-J12 |
| P6 | Hands-free round trip on a real phone; no duplicate send under delayed callbacks; barge-in stops TTS ≤ 300 ms | Device recording + live-blueprint tests |

## Readiness receipt for this package (now)

| Item | State |
|---|---|
| Canonical artefact links | this directory |
| Preservation | Nothing deleted. The prior packages stay in place, mapped in `00-README` |
| Test commands and actual results | baseline only (see `00-README`); **every J-test is NOT RUN** |
| Unresolved decisions | D1–D8 (`PART-C-decisions.md`) |
| Coverage gaps | U1–U6 from the hostile review |
| Next authorised slice | **P0.1** (the vs-claude lane) and **P0.2** (the coach lane, after D1) |
| State | **PLAN DRAFT.** Not plan-ready until D1 is decided and P0.1 has landed |
