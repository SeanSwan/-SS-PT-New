# 05 — Slices (file by file)

These rules hold for every slice:

- one slice at a time;
- write the RED test first and show it failing for the intended reason;
- make it GREEN;
- keep every touched file ≤ 300 lines by `wc -l` (J18);
- post the diff and the evidence.

Paths are relative to the repo root. "New" means the file does not exist on any branch
today.

## P0 — Consolidate

| Slice | Files | Change | Test (RED first) |
|---|---|---|---|
| P0.1 land-S83 | `backend/run-coach-postgres.mjs`, `backend/tests/helpers/coach*.mjs`, `backend/vitest.coach-postgres.config.mjs`, the rest of the S83 backend delta from `tmp/worktrees/swan-coach-astra-owned-20260906/` | Commit it as found onto `vs-claude/coach-completion-r7-closure-20260922`, then push from the clean clone | `git cat-file -e <tip>:backend/run-coach-postgres.mjs` succeeds; `git branch -r --contains <tip>` ≥ 1 |
| P0.2 self-scope | `coach-assistant/hooks/useCoachSessionSelectionState.ts`, `useCoachCommandCenterSelection.ts` | Publish a `scope:'self'` snapshot for staff when no client is admitted; add `adoptCreatedThread` to the staff binding | **T-C2**: `e2e/coach-command-center-mobile-smoke.spec.ts` 3/3 (it is RED today) + new unit test: the staff binding with no client yields a non-null snapshot |
| P0.3 no-silent-null | `frontend/src/hooks/useAIChat.ts` (split first: `useAIChat.guards.ts`, `useAIChat.send.ts`), `CoachCommandCenter.chatResponse.ts` | Each of the 14 `return null` sites returns `{refused: code}`; `interpretCoachChatResponse` maps codes to rendered notes; only a real abort maps to `superseded` | **T-J02a**: a matrix over all 14 null-return sites → each renders its sentence |
| P0.4 merge-main | coach paths only | `git merge origin/main` into the base; resolve conflicts; the smoke and the suites run on the result | The smoke passes 3/3; suites ≥ baseline |
| P0.5 lane-lock | `.ai-workflow/lanes/coach.lock` (new) | Records the owner, worktree and branch; `scripts/check-lane-lock.mjs` (new) is refused by the pre-commit hook when coach paths are staged from another worktree | Unit test on the lock checker (control + refusal) |
| P0.6 index | this package → `docs/ai-workflow/AI-HANDOFF/`; `ACTIVE-INDEX.md` row | Makes this package canonical for coach-brain work | Link check |

## P1 — Stream

| Slice | Files | Change |
|---|---|---|
| P1.0 spike U1 | `backend/routes/aiStreamSpikeRoutes.mjs` (existing) + `scripts/qa/stream-soak.mjs` (new) | Stream 120 s of heartbeats through staging Render and record where the proxy cuts. **Evidence only** |
| P1.1 writer | `backend/services/coach-brain/turn/turnEventWriter.mjs` (new, ≤ 120) | SSE framing, `seq`, heartbeat, terminal-once guard |
| P1.2 route | `coach-brain/turn/coachTurnRoute.mjs` (new, ≤ 200); `backend/core/routes.mjs` (+2 lines) | Auth, rate limit, idempotency (`clientTurnId`, 24 h, Redis/DB), cancel endpoint |
| P1.3 assembler | `coach-brain/context/contextAssembler.mjs` (new, ≤ 200) | Calls `coachContextEngine`, recent 12 messages, surface tokens |
| P1.4 alias | `coach-brain/privacy/rosterAlias.mjs` (new, ≤ 150) | §P step 2 |
| P1.5 loop-0 | `coach-brain/turn/coachTurnLoop.mjs` (new, ≤ 220) | One round, streaming, via the *existing* `sendChatMessage`-compatible adapter wrapped to stream (interim) |
| P1.6 client | `frontend/src/hooks/useCoachTurn.ts` (new, ≤ 250), `useCoachTurn.reducer.ts` (new, ≤ 200) | fetch + `ReadableStream` parser, reducer, cancel, `STREAM_LOST` rendering |
| P1.7 mount | `coach-assistant/CoachCommandCenter.actions.ts` | Behind `COACH_BRAIN_V4_STREAM`, `submitCoachMessage` calls `useCoachTurn.send`; the legacy branch is unchanged |

**Tests:**
- **T-J03a:** the event order and terminal-once rule.
- **T-J03b:** cancel aborts the provider (fake adapter observes `signal.aborted` ≤ 1 s).
- **T-J02b:** a stream that ends early renders `STREAM_LOST`.
- **T-J11a:** alias canary on the P1 payload.

## P2 — Read tools

| Slice | Files | Change |
|---|---|---|
| P2.1 registry | `coach-brain/tools/toolRegistry.mjs` (new, ≤ 220); dependency `zod-to-json-schema` | Builds `ToolDefinition[]` from `getCommandsForRole`. The `kind` is derived from registry flags. FRONTEND_DISPATCH commands (`planner_*`, `rest_*`, `bootcamp_*`, `painchart_*`) are exposed only on their surface |
| P2.2 selector | `coach-brain/tools/toolSelector.mjs` (new, ≤ 180) | Role, then surface, then a lexical top-32 |
| P2.3 executor | `coach-brain/tools/toolExecutor.mjs` (new, ≤ 220) | Routes through `commandDispatcher` with the same RBAC and `clientScope` steps as `commandExecutor` (`stepRBAC`, `stepResolveClient`), extracted to `coach-brain/tools/sharedGuards.mjs` (new) rather than duplicated |
| P2.4 loop-n | `coachTurnLoop.mjs` | Multi-round with budgets. Tool results are quoted data (existing T23 rule in `coachInferenceBoundary.buildCoachPromptMessages`) |
| P2.5 timeline | `frontend/.../coach-workspace/ActivityTimeline.tsx` (new, ≤ 160), mounted in the old transcript under the flag | Renders `tool.call` and `tool.result` |

**Tests:**
- **T-J04:** the 12-utterance probe, at least 11 correct.
- **T-J05:** budgets are enforced.
- **T-J06a:** no write dispatcher is reachable in P2.

## P2b — Brain harness

| Slice | Files |
|---|---|
| P2b.1 | `coach-brain/brain/brainAdapter.mjs` (interface + conformance test kit) |
| P2b.2 | `coach-brain/brain/adapters/anthropic.mjs`, `openai.mjs` (also serves OpenRouter via baseURL), `gemini.mjs`, `ollama.mjs`, each ≤ 200 |
| P2b.3 | `coach-brain/brain/modelRegistry.mjs` + `config/coach-brains.json` (D2) or migration `backend/migrations/2026MMDD-create-coach-brain-models.cjs` (`.cjs` only; see `retired-mjs-20260804/README.md`) |
| P2b.4 | `coach-brain/brain/brainRouter.mjs` (circuit breaker reuse), `costLedger.mjs` (wires `providerCostTracker.mjs`) |
| P2b.5 | `backend/eval/coach-brain/golden.jsonl` (≥ 60 utterances, synthetic names), `runGolden.mjs` |
| P2b.6 | `backend/routes/coachBrainAdminRoutes.mjs` (read-only traces, admin) |

**Tests:**
- **T-J09:** the conformance kit runs per adapter against a recorded fixture, and no hard-coded model string appears in `coach-brain/**`.
- **T-J10:** golden runs across 3 brains.

## P3 — Ledger

| Slice | Files | Change |
|---|---|---|
| P3.1 | `coach-brain/ledger/approvalLedger.mjs` (new, ≤ 200) | `prepare` → `destructiveOperations.prepareDestructiveOperation` / `preparePendingConfirmation`; adds `payloadHash` and `recordVersion` |
| P3.2 | `coach-brain/ledger/approvalRoutes.mjs` (new) | Approve, reject and edit; verify → recheck → dispatch → receipt |
| P3.3 | `coach-brain/tools/proposalTools.mjs` (new) | 9 proposal types → write tools (payload schemas reused from `coachActionProposalClassifier.mjs`) |
| P3.4 | `backend/tests/unit/coachToolWriteClassification.test.mjs` (new) | T-J06b: every dispatcher that mutates is flagged |
| P3.5 | `coach-workspace/ApprovalCard.tsx` (new, ≤ 220) | Diff, countdown, keyboard |

**Tests:** T-J06 (zero mutation before approve, concurrent approve, replay, hash
mismatch, version drift, expiry, actor switch).

## P4 — Workspace UI

**New files** under `frontend/src/components/DashBoard/Pages/coach-workspace/` (each
≤ 250):

- `CoachWorkspace.tsx`
- `ThreadSidebar.tsx`
- `ConversationColumn.tsx`
- `TurnView.tsx`
- `Composer.tsx`
- `ClientMentionChip.tsx`
- `SlashMenu.tsx`
- `InspectorPanel.tsx`
- `EmptyStateStarters.tsx`
- `workspaceTokens.ts`
- `CoachWorkspace.styles.ts`
- `useWorkspaceLayout.ts`

**Routing:** `UniversalDashboardLayout.routes.tsx` points the three `/coach-assistant`
routes to `CoachWorkspace` behind `COACH_BRAIN_V4`.

**Retire after the default flip:**

- the `SwanCoachAssistantPage.tsx` and 9 stale `PARENT:` headers (L1);
- `CoachIntentBar` from the talk surface;
- `CoachCommandOpsRail`/`Surface` (their content moves into the inspector and the slash menu).

**Tests:**
- **T-J13:** control count, transcript share, overflow at 375/414/1440.
- **T-J14:** literal-colour lint + a lens-switch screenshot diff.
- **T-J13a:** axe checks.

## P5 — Memory and coverage

| Slice | Files |
|---|---|
| P5.1 | `coach-brain/context/conversationSummary.mjs` (summary role brain; ≤ 1,200 chars; updated every 6 turns) |
| P5.2 | `contextAssembler.mjs` + `coachFactMemoryPolicy.getMemoryForTask` (first production caller) |
| P5.3 | `coach-brain/memory/factProposer.mjs` + `InspectorPanel` "Proposed memories" queue. `coachMemoryRoutes.mjs` deliberately exposes only inspect, correct and forget (its header, lines 40–48), so this slice adds a **human-only** approve/reject route that calls `coachFactService.approveFact`. The machine path still cannot activate a fact |
| P5.4 | New read tools, one registry file each (≤ 200): `commandRegistry/messagingReadCommands.mjs`, `sessionCreditReadCommands.mjs`, `orderReadCommands.mjs`, `waiverReadCommands.mjs`, `leadReadCommands.mjs` + dispatchers |

## P6 — Voice and proactive

- Port `CoachFreestyleOverlay.tsx`, `useFreestyleSession.ts` and `useFreestyleSpeech.ts` from the fork by slice, **splitting the 605-line overlay first**. They then feed `Composer` (atomic functional append; live-blueprint A1-04).
- Build `coach-workspace/useHandsFree.ts` (pause-to-send, TTS, barge-in).
- Build the inspector `TodayBrief.tsx` over the G10 nudge engine (`c88fa7039`) and `brief_my_day`.
