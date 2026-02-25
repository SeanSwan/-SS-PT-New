# Smart Workout Logger - Phase 0 Authenticated Playwright Follow-Up

- **Date:** 2026-02-25T01:19:14.548Z
- **Target:** https://sswanstudios.com
- **Roles tested:** admin (trainer/client skipped — no credentials)
- **Total authenticated states captured:** 8
- **Console errors captured:** 32
- **Failed network requests captured:** 8
- **State-level execution errors:** 4
- **Failed assertions (informational + hard):** 18

## Results by State

- **admin / dashboard-home / 375-mobile** -- URL: `/login?returnUrl=%2Fdashboard`, console: 4, network: 1, assertions: 0 pass / 5 fail
- **admin / clients-page / 375-mobile** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 1 pass / 2 fail
- **admin / client-onboarding-panel / 375-mobile** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 0 pass / 1 fail, error: locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('[role="tabpanel"] button:has(svg)').filter({ hasNotText: /\w/ }).first() to be visible[22m

- **admin / client-workout-logger-modal / 375-mobile** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 0 pass / 1 fail, error: locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('[role="tabpanel"] button:has(svg)').filter({ hasNotText: /\w/ }).first() to be visible[22m

- **admin / dashboard-home / 1280-desktop** -- URL: `/login?returnUrl=%2Fdashboard`, console: 4, network: 1, assertions: 0 pass / 5 fail
- **admin / clients-page / 1280-desktop** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 1 pass / 2 fail
- **admin / client-onboarding-panel / 1280-desktop** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 0 pass / 1 fail, error: locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('[role="tabpanel"] button:has(svg)').filter({ hasNotText: /\w/ }).first() to be visible[22m

- **admin / client-workout-logger-modal / 1280-desktop** -- URL: `/login?returnUrl=%2Fdashboard%2Fpeople%2Fclients`, console: 4, network: 1, assertions: 0 pass / 1 fail, error: locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('[role="tabpanel"] button:has(svg)').filter({ hasNotText: /\w/ }).first() to be visible[22m


## Artifact Locations

- Screenshots: `docs/qa/playwright-phase0/authenticated/`
- JSON results: `docs/qa/playwright-phase0/authenticated-audit-results.json`

## Notes

- This is a Phase 0 evidence pass (load/render + route/auth + UI-open checks), not full workflow mutation testing.
- Review any failed assertions and decide whether they are selector drift vs real regressions.