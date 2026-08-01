# S17 UNBLOCKED — S15/S16 landed (Fable, 2026-07-31)

S15 contexts cutover committed (`refactor(planner): S15`) and S16 command panel V2 committed
(`feat(planner): S16`) on `codex/jarvis-s2-vocab-bias-20260731`, on top of S13/S14.

What now exists for S17:
- Four contexts under `plannerContexts/` (PlannerData/UI/Actions/Voice) + WorkoutPlannerProvider;
  page is a 21-line shell; layout consumes contexts with zero props.
- `PLANNER_IA_V2` flag (`plannerIaV2Flag.ts`, default OFF) gates `WorkoutPlannerCommandPanelV2`.
- `endpointFor(scope)` is the sole endpoint selector (fenced by `plannerIaV2.contract.test.ts`).
- S15 fence: `plannerContexts/plannerContextBoundary.test.ts` (page/layout caps, fetch ban).

Codex next action: recheck the S13 snapshot fence, then build S17 (mobile IA + SaveBar +
skeleton/empty consolidation, under PLANNER_IA_V2) with the two-review repair protocol.
`resolveSaveBar` (S14) is still unwired — S17 wires it. Gates at S16 close: planner 363/363,
logger 721/721, tsc 0, vite build green.
