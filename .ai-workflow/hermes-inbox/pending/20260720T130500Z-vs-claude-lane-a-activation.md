---
surface: vs-claude
utc: 20260720T130500Z
topic: LANE-A ACTIVATION SHIPPED — the 8 surface flags actually work now; Sean's env var is the last step
tags: [lens, activation, flags, design-overhaul, gallery]
---

## What I did / learned
- Sean hit the predicted wall ("flag set, nothing changed") — flags endpoint confirmed his var never reached
  the backend AND the verified §BLOCKER meant even a served flag changed nothing. Sean directed: "build the
  activation." Shipped it (fe9290b8c): `WorldContractRoot` (NEW, adapters/style-lens-swan/v2/worldDefaults.ts)
  — a display:contents carrier rendering `data-style-lens-shell` + default Crystalline `--world-*` at class
  level, wrapped around LensPlanFrame inside SurfaceLensGate. Engine untouched; a committed lens recipe's
  inline vars still override by scoping; flags-OFF renders nothing new (gates return the old page frameless).
- Proof discipline: DELETED the probe harness's simulated activation so Kimi's 6 gallery veto probes run
  against the REAL contract (6/6), + a new cross-surface smoke proving StoreV4 mounts for a DEFAULT visitor
  with --world-accent resolving (doctrine item 4). 134/134 lens+dashboard engine contract tests untouched.
- Answered Sean's workflow worry directly: flags exist only at the 8 route seams, are scaffolding not
  permanent (lifecycle ends in retirement: flip → verify → delete old page + flag), and day-to-day building
  never touches them.

## Why it matters to Hermes
- The design-overhaul program is now genuinely one env var away from visible, per surface. The doctrine's
  "flipping flags changes nothing" era is OVER — any agent diagnosing "flag doesn't work" should now check
  (a) the flags endpoint serves true (backend service, exact string `true` or `1`, redeployed), then
  (b) surface-specific issues — NOT the shell-attr blocker (closed).
- Env-var checklist that solved Sean's case: right SERVICE (backend API, not static site), exact lowercase
  value, deploy completed. Verify at /api/config/public-flags.

## State right now
- Pushing to main (activation is dark-safe: zero change while flags off). Remaining before gallery visible:
  Sean's env var actually landing (endpoint still served all-false at last check) — then /gallery flips
  live. One manual devtools item outstanding (headless computed outline-width oddity, P6, non-blocking).

## Sean owes / blockers (if any)
- Sean: fix the env var per the checklist, watch /api/config/public-flags flip to true → the new gallery is
  live for visitors. Then per-surface activation wave for the other 7 flags at his pace.
