# 09 — Tests and traceability

Every test here is **NOT RUN** until a slice runs it. RED must fail for the intended
reason. Setup or import errors are not RED.

## Commands

| Level | Command (from repo root) |
|---|---|
| Frontend unit | `cd frontend && npx vitest run src/components/DashBoard/Pages/coach-workspace src/components/DashBoard/Pages/coach-assistant src/hooks` |
| Backend unit | `cd backend && npx vitest run tests/unit/coach* tests/unit/ai* tests/unit/coachBrain*` |
| Mounted smoke (mocked APIs) | `cd frontend && npx playwright test e2e/coach-command-center-mobile-smoke.spec.ts e2e/coach-workspace-*.spec.ts` |
| Golden eval | `cd backend && node eval/coach-brain/runGolden.mjs --brains <keys> --out ../docs/.../evidence/golden-<date>.json` |
| Stream soak | `node scripts/qa/stream-soak.mjs --base <staging-url> --seconds 120` |
| Real Postgres (S83 harness) | `node backend/run-coach-postgres.mjs` (disposable DB only; per S83 package) |

## Test catalogue

| ID | Req | Level | Given → When → Then | Forbidden side effect |
|---|---|---|---|---|
| T-C2 | J02 | e2e | Admin with no client → types "hello" → a coach reply renders within 5 s (**RED on coach branch today, GREEN on main**) | — |
| T-C2u | J02 | unit | Staff binding, no admitted client → `getSnapshot()` returns a `scope:'self'` snapshot | — |
| T-J02a | J02 | unit | Each of the 14 `return null` sites in `sendMessageWithConversation` (useAIChat.ts:1048-1194) trips → a typed refusal renders its sentence | no `superseded` except a real abort |
| T-J02b | J02 | unit | Stream closes without a terminal event → `STREAM_LOST` note + retry | no automatic resend |
| T-J03a | J03 | unit | Fake brain streams → events in `seq` order, exactly one terminal | — |
| T-J03b | J03 | unit | Cancel mid-stream → adapter signal aborted ≤ 1 s; partial text persisted as `stopped` | no second provider call |
| T-J03c | J03 | staging | 30 turns → first token p50 ≤ 1.5 s, p95 ≤ 3 s | — |
| T-J04 | J04 | eval | The 12 probe utterances (hostile review H1) → the expected tool or answer; ≥ 11/12 | no write executed |
| T-J05 | J05 | unit | Brain that always asks for tools → loop stops at 8 calls / 4 rounds / 45 s with `turn.completed` + a budget note | — |
| T-J06 | J06 | integration | Each write tool → `approval.required`; DB row counts unchanged until approve | 0 mutations pre-approve |
| T-J06c | J06 | integration | 20 concurrent approves of one approval → exactly 1 commit, 19 × 409 | 1 success audit only |
| T-J06d | J06 | integration | Approve with changed payloadHash / stale recordVersion / other actor / expired → 409; no write | — |
| T-J06a | J06 | unit | P2 tool registry exposes no tool of kind `write` | — |
| T-J06b | J06 | unit | Static scan: every dispatcher calling `create/update/destroy/save/upsert/bulkCreate/increment` or raw `INSERT/UPDATE/DELETE` maps to a registry entry flagged write | — |
| T-J07 | J07 | unit | Each of the 9 proposal types resolves to exactly one write tool with the same payload schema | — |
| T-J08 | J08 | integration | Fact approved in turn N → present in turn N+1 context bundle; forgotten → absent; machine proposal stays `proposed` | no auto-activation |
| T-J09 | J09 | unit | Adapter conformance kit (text, tool call, usage, abort) passes for each adapter; grep finds no model-ID literal in `coach-brain/**` | — |
| T-J10 | J10 | eval | Golden set on ≥ 3 brains → tool-selection ≥ 90% (primary), write-without-approval = 0 on all | — |
| T-J11 | J11 | integration | Synthetic roster names planted in text, history, facts and tool rows → captured final provider request contains none | — |
| T-J11a | J11 | unit | `rosterAlias` round trip; overlapping names ("Ann" / "Anna"); names inside words not replaced | — |
| T-J12 | J12 | unit | Each new read tool: RBAC + clientScope refusal cases + happy path | no write |
| T-J13 | J13 | e2e | Workspace at 375/414/1440 → ≤ 12 first-paint controls (desktop), transcript ≥ 70% height (mobile), overflowX 0 | — |
| T-J13a | J13 | e2e | axe-core on idle, streaming and approval states → 0 serious/critical | — |
| T-J14 | J14 | lint + e2e | No hex/rgb/hsl literal in `coach-workspace/**`; lens switch → screenshot diff shows re-skin, no layout shift | — |
| T-J17 | J17 | unit | Primary brain throws → `brain.degraded` event → backup answers; classifier/brain timeout aborts fetch | — |
| T-J18 | J18 | CI | `wc -l` ≤ 300 for every touched file (count by `wc -l`, not `Measure-Object`) | — |
| T-J19 | J19 | integration | Completed turn → trace row with provider, model, tokens, cost, per-tool latency | no raw user text in trace |
| T-J20 | J20 | unit | `check-lane-lock`: control (owner commits) passes; other worktree staging coach paths is refused | — |

## Golden utterance set (P2b.5) — seed rows

The first 12 are the hostile-review probe, and they must stay in the set. Names are
synthetic.

| # | Utterance | Expected |
|---|---|---|
| 1 | Hey coach, log 3 sets of squats at 185 for Maria | write `log_workout` → approval |
| 2 | I need to cancel tomorrow's 6am | read schedule → write `cancel_session` → approval |
| 3 | Move Sarah's Thursday session to Friday at 3pm | `reschedule_session` → approval |
| 4 | What does John's week look like? | `view_week_schedule` + `view_workout_history` |
| 5 | Who hasn't trained in two weeks? | `at_risk_clients` |
| 6 | Text Mike that I'm running 10 minutes late | `notify_client` → approval |
| 7 | Swap Maria's bench for dumbbell press | planner surface: `planner_swap_exercise`; else plan proposal |
| 8 | How is revenue this month vs last? | `view_revenue` (admin); refusal for trainer |
| 9 | Remind me to call Dana Friday | `create_hermes_task` or clarification |
| 10 | Schedule Sarah for Friday at 3pm | `schedule_session` → approval |
| 11 | Log 3 sets of squats at 185 for Maria | write → approval |
| 12 | Cancel tomorrow's 6am | read → write → approval |

Rows 13–60 are to be added by P2b.5: multi-step, ambiguous client, wrong-role,
injection-in-tool-result, long dictation, and offline cases.

## Traceability

| Req | Artefact | Tests | Slice | Evidence today |
|---|---|---|---|---|
| J01 | 04 §P0, 06 #1–6 | T-J20 | P0.4–P0.6 | rev-list counts (review C1) |
| J02 | 03 §A, 02 states | T-C2, T-J02a/b | P0.2, P0.3, P1.6 | smoke RED coach / GREEN main |
| J03 | 03 §A | T-J03a/b/c | P1.* | NOT RUN; U1 open |
| J04 | 03 §B | T-J04 | P2.* | probe 3/12 today |
| J05 | 01 §4 | T-J05 | P2.4 | — |
| J06 | 03 §C, 01 §5 | T-J06, a, b, c, d | P3.* | ledger primitives exist (coach branch) |
| J07 | 03 §B | T-J07 | P3.3 | 139 + 9 split today |
| J08 | 03 §E | T-J08 | P5.1–P5.3 | 0 production readers today |
| J09 | 03 §D | T-J09 | P2b.* | hard-coded models today |
| J10 | 09 golden | T-J10 | P2b.5 | — |
| J11 | 03 §P | T-J11, T-J11a | P1.4 | regex loop, 6 rounds |
| J12 | 05 §P5 | T-J12 | P5.4 | coverage table (review M2) |
| J13 | 02 | T-J13, T-J13a | P4 | 36 / 24 controls today (review M1) |
| J14 | 02 lens | T-J14 | P4 | 210 literals today |
| J15 | 04 §P6 | live-blueprint set | P6 | freestyle only on fork |
| J16 | 04 §P6 | device check | P6 | G10 engine exists (coach branch) |
| J17 | 03 §D | T-J17 | P2b.4 | M4 open |
| J18 | 06 #20 | T-J18 | all | 5 core files over the cap |
| J19 | 03 §D | T-J19 | P2b.6 | — |
| J20 | 06 #1–6 | T-J20 | P0.5 | — |

**Mock-only boundaries (flagged):** T-C2, T-J13 and T-J14 run against mocked APIs.
T-J03c, T-J06 (with real Postgres), T-J11 (captured provider request) and the P6 device
checks are the real-boundary proofs, and a phase cannot exit on mocks alone.
