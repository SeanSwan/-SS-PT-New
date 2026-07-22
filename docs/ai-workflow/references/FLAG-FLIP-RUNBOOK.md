---
status: active-feature-only
supersedes: design-surface-flag-flip-workflow
effective_at: 2026-07-21
---

# Feature-Only Flag Runbook

> **Permanent boundary:** Design surfaces never gate. Use the Design Studio. A page redesign is promoted or
> rolled back through Git and the canonical route, never through Launch Control, Render variables, build
> variables, query parameters, or local storage.

## Approved Launch Control registry

Launch Control may expose exactly these three feature controls:

| Key | Purpose | Enforcement truth |
|---|---|---|
| `dashboardV2Finance` | Money-adjacent dashboard finance behavior | Retained but dormant; server controller reads `DASHBOARD_V2_FINANCE` directly |
| `prismCapture` | Speed-to-lead capture | Public flag controls UI; public POST route reads `PRISM_CAPTURE_ENABLED` directly |
| `postSaveHandoff` | Workout completion proof card | Database override is consumed server-side and client-side |

The backend contract fails CI if another key is added, with:

`Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.`

## Control-plane truth

The board's resolved value is the public flag response. It is not automatically proof that every backend
consumer uses the database override. This release intentionally preserves existing feature behavior:

- `postSaveHandoff` is the only approved key with verified end-to-end runtime override enforcement.
- A `prismCapture=false` override hides the canonical UI immediately, but the public POST route remains governed
  by the Render baseline until redeploy. Enabling from a false baseline also requires
  `PRISM_CAPTURE_ENABLED=true` and a deploy.
- `dashboardV2Finance` is dormant while dashboard v2 is parked. Its server controller remains governed by
  `DASHBOARD_V2_FINANCE`; do not operate this switch in the de-gate release.

The admin UI therefore says to verify feature-specific server enforcement and does not promise “instant,
no redeploy” universally.

## Before any feature change

- [ ] Name the feature consumer and its actual server/API enforcement boundary.
- [ ] Confirm the key is one of the three approved keys above.
- [ ] Capture current and intended state without copying secret material into a ticket or prompt.
- [ ] Define one positive smoke, one failure/rollback smoke, and the abort signal.
- [ ] Confirm the owner and observation window.
- [ ] For money, auth, PII, billing, or external-message behavior, obtain Sean's explicit approval.

## Feature procedures

### Post-save handoff

1. Change `postSaveHandoff` in Admin → Launch Control.
2. Verify the public response after one cache cycle or the board's Verify action.
3. Complete a workout through the real save path.
4. ON: proof card is returned/rendered after the save. OFF: the prior completion flow remains and saved workout
   truth is unchanged.
5. If the abort signal fires, restore the prior override and record the audit receipt.

### PRISM capture

1. To enable end-to-end from a false baseline, set the approved backend baseline
   `PRISM_CAPTURE_ENABLED=true` through Sean's Render process and deploy.
2. Use Launch Control for public UI visibility/preview, but do not treat its override as the server-route kill
   switch.
3. Verify canonical Home and submit through the existing lead route; confirm the owner-alert path without
   exposing lead PII in logs or prompts.
4. To disable end-to-end, hide the UI with the board for immediate containment, then set the backend baseline
   false and deploy. Verify the public POST route returns its flag-off response.

### Dashboard finance

Do not flip in this release. It has no canonical dashboard consumer while v2 is parked. Any later activation
requires a separate money-path decision, server-enforcement receipt, and finance regression suite.

## Design promotion procedure

1. Preview unfinished work in Admin → Design Studio.
2. Prove data, auth, accessibility, responsive behavior, and money-path parity.
3. Change the canonical route/component import in code.
4. Run the full release gates and hostile review.
5. Obtain Sean's push approval.
6. Verify the deployed route and asset.
7. Roll back with a Git revert if necessary.

Do not add a temporary design flag “just for safety.” The reversible unit is the commit.

## Environment cleanup

Use `docs/receipts/de-gate-2026-07-21/S4-render-environment-owner-checklist.md`. Retired design keys are
removed/unset, not set to false. The three backend feature baselines remain unchanged. Never manually clear
`flag_audit`; the de-gate migration removes retired registry rows/overrides while preserving history.
