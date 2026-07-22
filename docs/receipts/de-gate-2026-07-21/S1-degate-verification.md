---
decision: S1 de-gates seven design surfaces and shrinks Launch Control to operational features
status: verified-local
supersedes: none
---

# S1 De-Gate Verification

## Outcome

The canonical router now mounts the original Home, Store, About, Contact, Video, Gallery, and universal
dashboard implementations directly. The parked redesign directories remain in the repository, but no public
route imports their gates or runtime flag hooks.

Launch Control now resolves and seeds only `dashboardV2Finance`, `prismCapture`, and `postSaveHandoff`. The
registry migration deletes the seven design rows inside one transaction. The existing `flags ->
flag_overrides` cascade is the single override-clearing mechanism; `flag_audit` is never queried or mutated by
the migration.

## Test-first evidence

The initial RED run failed on the old gated route mounts, the generic preview override, all ten backend flag
keys, and the missing registry migration. After implementation and hostile repairs:

- Frontend de-gate, preview whitelist, and PRISM mount contracts: 14/14 passed.
- Backend resolver and migration contracts: 15/15 passed.
- Protected Store V3, Gallery, workout handoff regressions: 18/18 passed.
- Protected backend proof-card and dormant dashboard-finance regressions: 45/45 passed.
- `npm run type-check`: exit 0.
- `npm run build`: exit 0; 6,604 modules transformed.
- `git diff --check`: exit 0 (line-ending conversion warnings only).
- Removed design env/localStorage/query-preview plumbing grep: zero hits outside parked directories and docs.

## Hostile review loop

Pass 1 found dead preview/danger styles and stale gate-era comments; both were removed. Pass 2 found the
registry delete/regroup operations were not atomic; both migration directions now run in one transaction and
the test asserts transaction propagation. The fresh structural pass after those repairs produced no further
S1 findings.

## Remaining gates

This is local branch evidence only. Design Studio restoration, full 33-link sidebar parity, the permanent
three-feature CI whitelist, Sean's Render environment checklist, batch push approval, and post-deploy proof
remain in S2-S5.
