# S2b — unavailable data, reachable intervention queue, honest KPIs

Owner Astra; version 1. Next bounded contract after access repair. Requirements R4/R5/R10; findings BE-04/05 and orchestrator KPI finding. Review deferred to final Astra. No migration, provider or production write.

## Backend boundaries

Mount intended `/api/admin/compliance/at-risk` trainer route before the global admin-only router, using the narrowest existing router mount possible. Do not expose admin siblings: `/analytics/business-kpis` remains admin-only and other `/api/admin/*` endpoints retain their current guards. Actual Express mount-order harness must verify this, not a string-order test alone. Keep active-assignment SQL in `buildAtRiskComplianceQuery`.

At-risk and business-KPI required SQL failures return a typed unavailable non-success response; never successful empty/zero defaults. Successful empty arrays and aggregate zero rows remain legitimate. Business response keys remain compatible; no unsupported financial comparisons are invented.

Day brief retains schedule but explicitly reports missing credit/pain data, or returns `day_brief_unavailable`; never `All clients clear` unless required domains successfully loaded. Debate enrichment must propagate required profile/pain/workout/macro/goal query failure before generation; both direct route and command-executor context service must agree. Keep true empty history valid. Update tests that previously asserted swallowed failures only with an explicit new truth contract. Providers remain stubbed in all tests.

## Mounted frontend states and wireframes

TrainerInterventionQueue remains mounted in TrainerHomeTab. Replace silent hiding with accessible loading/error/retry card for network/permission/malformed responses; true empty list alone shows no-current-interventions. Reset failed state on retry, abort/ignore stale actor/unmount completions, validate row array. Admin compliance widget's existing error/retry remains used. No UI can show old user's rows during refetch.

```text
Desktop: [Client interventions                      Refresh]
         [Unable to load intervention data.        Retry  ]
Mobile:  [Client interventions]
         [Unable to load data]
         [Retry — 44px control]
```

KPI dashboard preserves selected-period controls and existing layout. Remove unsupported monthly-revenue percentages, count-as-percent changes and fabricated utilization target trends. Rename selected-period revenue-per-current-client field accurately; it is not lifetime value. Show loading, unavailable+Retry, valid-zero and valid-data states distinctly. Ignore older-period response when newer selection resolves first. No generic optimistic zero fallback for malformed payload. Desktop grid and mobile cards retain >=44px controls, aria-live alert, visible text and stable focus.

## Tests / operations

Mounted compliance positive assigned trainer, unrelated trainer filtering, client denial, admin success and unrelated-admin-path denial. Reject each SQL domain independently; valid []/zero still succeeds. Day/context fault tests must assert no all-clear/provider start. Frontend trainer retry, malformed success payload and account-change tests; KPI semantic labels, absent unsupported trends, rejection/malformed/retry and delayed period-response ordering. Tests link R4/R5/R10 and exact source paths in appended controller scope. Full integration remains synthetic except separately named DB tests.

Flow: auth/scope→query→validated results→render; query or payload failure→unavailable+retry; selection change→cancel stale result; explicit retry→fresh scope/query. ERD unchanged. Rollback is isolated code revert, no data rewrite. Logs record error category only; no client health, names or credentials in artifacts.
