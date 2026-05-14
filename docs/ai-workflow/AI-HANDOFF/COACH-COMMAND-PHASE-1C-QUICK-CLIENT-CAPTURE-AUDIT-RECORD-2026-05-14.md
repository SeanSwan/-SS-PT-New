# Coach Command Phase 1C Quick Client Capture Audit Record - 2026-05-14

## Phase header

- Phase: Coach Command Phase 1C - quick client capture and live queue rail
- Scope: Admin `/dashboard/admin/coach-assistant`
- Start/end date: 2026-05-14
- Reviewed by: Codex builder self-review; focused vitest red/green evidence
- Final verdict: APPROVED FOR PUSH PENDING FULL BUILD AND SMOKE

## Files involved

| File | Lines | Purpose |
| --- | ---: | --- |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` | 994 | Canonical admin command center UI; adds quick client capture and live queue rail values. |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.styles.ts` | 982 | Styled-components shell; adds quick client capture form states. |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx` | 272 | Focused regression tests for conversation wiring, PLAUD embedding, live queue counts, and quick client capture. |
| `frontend/src/services/coachCommandClientService.ts` | 78 | Small frontend service for name-only client stubs via the existing onboarding endpoint. |
| `frontend/src/services/coachCommandClientService.test.ts` | 60 | Unit tests for name splitting, onboarding payload, and empty-name short-circuit. |

## Architecture & runtime flow

```text
Admin route
  /dashboard/admin/coach-assistant
    -> CoachCommandCenterPage
      -> useCoachIntakeQueue(scope=actionable)
      -> useAIChat conversations for coach threads
      -> PlaudMergeWorkspace embedded for PLAUD review
      -> Quick client capture form
        -> createQuickCoachCommandClient()
        -> POST /api/clients/onboard
        -> backend creates client stub and optional claim code
        -> UI stages composer context
```

The quick capture flow creates only a client stub. It does not approve PLAUD merge requests, log workouts, apply drafts, or write AI-generated client data.

## Security logic & posture

- Operator gate: copy and logs explicitly state that no workout log was written and final writes still require operator approval.
- Existing endpoint reuse: quick capture posts to `POST /api/clients/onboard`, which already validates trainer/admin auth and required `clientSource`.
- Minimal data: only name, client source, assignment flag, claim-code flag, zero sessions, and a system note are sent.
- No raw HTML insertion: dynamic logs continue through React state/rendering, not `innerHTML`.
- Zero automatic workout writes: workout append remains behind the existing admin workout logger and PLAUD approval paths.
- Failure behavior: empty names reject before network; API failures show an inline error and add a no-write log entry.

Bypass risk to re-review later: if future code calls the service from an AI auto-apply path, the operator-only guarantee would be weakened. Keep this service attached to explicit user form submission only.

## Best practices applied

- Rule 8: no PII is sent to an LLM by this slice; the client name is sent only to the app backend.
- Rule 26/27: canonical admin route and overlapping PLAUD surfaces were classified before changes.
- Rule 43: no shared styled-components interpolated mixins added.
- TDD: service and component behavior were added with failing tests first, then made green.
- WCAG/mobile: form controls use labels and existing 44px minimum touch target styling.

## Known limitations / non-goals

- This slice does not build the full automated AppLaude folder watcher.
- This slice does not add the ultimate client workout/chart modal.
- This slice does not infer client identity from PLAUD audio.
- This slice does not create workout logs from chat content.
- `CoachCommandCenterPage.tsx` and its style file remain above the project 300-line target; they were already large and should be split in a follow-up component extraction pass.

## Performance & UX considerations

- The quick capture sits in the operations rail so desktop operators can create a stub without leaving the queue.
- On mobile, the same right rail is available through the Ops drawer; the bottom command dock remains the main working surface.
- Dynamic queue health removes stale prototype values, reducing operator confusion.
- Success moves focus back to the command composer with client context staged.

## Test coverage summary

- `frontend/src/services/coachCommandClientService.test.ts`
  - name splitting
  - onboarding payload
  - empty-name no-network rejection
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx`
  - command center labels and dock actions
  - conversation thread loading
  - real AI chat send path
  - mobile drawer aria/Escape behavior
  - unified Coach intake and PLAUD merge embedding
  - dynamic queue rail counts
  - quick client capture composer staging

Not tested here: authenticated browser write against production data. That remains intentionally manual/operator-approved.

## Rollback plan

1. Revert the commit that includes this audit record and the quick capture service/UI changes.
2. Redeploy from the previous Render main commit.
3. If a partial rollback is required, remove the quick capture panel import/call path from `CoachCommandCenterPage.tsx`; the backend onboarding endpoint can remain because it predates this slice.

## Future review hooks

- Verify whether the `POST /api/clients/onboard` auth policy still allows only trainer/admin roles.
- Split `CoachCommandCenterPage.tsx` into smaller rail, banner, composer, and operations components.
- Add authenticated Playwright coverage for mobile drawer focus trap when a test admin token is available.
- Add a staged PLAUD-to-client approval flow once the AppLaude folder/webhook runtime is confirmed.
- Recheck whether client source should include `external` for non-Move Fitness field clients.

## Codex / AI review log

- Codex red pass: service import missing, static rail counts, and absent quick capture controls failed as expected.
- Codex green pass: focused frontend vitest passed 10/10 after implementation.
