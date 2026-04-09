# Swan Coach Sprint A Acceptance Checklist
> Pass/fail checklist for Sprint A of Swan Coach V1.
> Use when: reviewing implementation of shell unification and command-aware Coach Assistant behavior.

## Sprint A Scope
Sprint A is only about these outcomes:
- unify Swan Coach behavior across the page, drawer, persistent panel, and command bar
- make the main Coach Assistant surface command-aware
- show confirmation-required states inline
- show execution results inline
- preserve graceful fallback to standard chat

Sprint A is not for:
- Hermes escalation
- broad voice overhaul
- full user-dashboard embed
- full sitewide redesign

## Files In Scope
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx`
- `frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanel.tsx`
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`
- `frontend/src/components/Shared/AICommandBar/AICommandBar.tsx`
- `backend/routes/aiCommandRoutes.mjs`
- `backend/services/ai/commandExecutor.mjs`

## Blocking Acceptance Criteria
### 1. Shell consistency
- [ ] The full page, drawer, persistent panel, and command bar all route into the same Swan Coach behavior model.
- [ ] Swan Coach naming, paywall handling, and context semantics are consistent across shells.
- [ ] Alternate shells do not invent their own unsupported commands or contradictory copy.
- [ ] A user can start in a lightweight shell and continue in the main Coach Assistant without losing the behavior model.

### 2. Command lane routing
- [ ] `useCoachAssistant` can distinguish between conversational guidance and structured action execution.
- [ ] Supported intents route to the command lane without the user manually choosing a mode.
- [ ] Unsupported or ambiguous requests fall back to standard conversational guidance.
- [ ] Plain questions are not incorrectly swallowed as fake commands.

### 3. Confirmation rendering
- [ ] Create, update, delete, and other risky writes render a confirmation summary before execution.
- [ ] The confirmation state names the intent, target, and structured fields clearly enough for the user to verify.
- [ ] Low-confidence interpretations do not auto-execute.
- [ ] Destructive actions require a stronger confirmation path than read-only or navigation actions.

### 4. Execution result rendering
- [ ] Successful actions render a visible result in the conversation stream.
- [ ] The result states what actually changed, not generic success copy.
- [ ] Failed actions render a visible failure state plus a real next step.
- [ ] No result depends on console inspection or hidden logs.

### 5. Role and scope safety
- [ ] Role checks are enforced for client, trainer, and admin actions.
- [ ] Client-aware actions cannot drift to the wrong target client.
- [ ] Non-admin users cannot trigger admin-only operations.
- [ ] The frontend never implies an action succeeded if the backend rejected it.

### 6. Paywall, tier, and consent behavior
- [ ] Existing paywall mechanics still work when the Coach flow hits a subscription boundary.
- [ ] Consent or privacy requirements are still honored where Swan Coach touches protected client data.
- [ ] If a user-dashboard Swan Coach teaser is surfaced during this sprint, full access there is `elite`-gated and lower tiers see a valid teaser or paywall state.

### 7. Mobile and UI quality
- [ ] The main Coach Assistant and lightweight shells work at `320px`, `375px`, `414px`, and `768px`.
- [ ] Interactive controls still meet the 44px touch target rule.
- [ ] Focus-visible states remain clear across buttons, toggles, and inline action controls.
- [ ] No shell introduces clipped panels, horizontal overflow, or unusable input bars.

### 8. Error and fallback behavior
- [ ] Network or backend failures stay visible inside the assistant UI.
- [ ] Retry or fallback guidance is shown when execution fails.
- [ ] The assistant still supports plain chat when command services are temporarily unavailable.
- [ ] There are no dead-end states where the user must refresh to recover.

### 9. Code and architecture discipline
- [ ] Sprint A does not create a second command router hidden in another shell.
- [ ] Shared logic stays centralized instead of duplicating lane decisions in each UI wrapper.
- [ ] New code follows the installed repo patterns instead of inventing a parallel assistant architecture.
- [ ] File growth is controlled by extracting hooks, helpers, and UI pieces instead of bloating one file.

## Real Caller Paths To Verify
At minimum, verify these paths:
1. Admin/trainer/client route into the main Coach Assistant page
2. Lightweight shell launch into the same behavior model
3. Supported command from input bar to confirmation to result
4. Ambiguous request falling back to normal chat
5. Paywalled request surfacing the correct upgrade state

## Minimum Command Cases
Use real examples like:
- `Navigate me to my schedule`
- `Log a workout for Client #47`
- `Create a workout draft for tomorrow`
- `What does this screen do?`
- `Delete that meal entry`

The point is to prove:
- navigation works without over-confirmation
- standard writes confirm and execute
- explanations stay conversational
- destructive requests do not silently run

## Explicit Fail Conditions
Sprint A fails if any of these are true:
- a shell behaves differently enough that users need to relearn Swan Coach
- confirmations are missing, vague, or misleading
- results say `done` without showing what changed
- role or client scope can drift
- lower-tier or non-consented flows break into dead controls
- mobile layout becomes cramped or clipped
- the UI still feels like a smart chat box instead of an action-capable operator

## Exit Standard
Sprint A is complete only when:
- Swan Coach feels like one product across all shells
- the main page can actually execute supported commands
- confirmations and results are first-class UI states
- paywall, consent, and role boundaries still hold
- the implementation survives hostile review from the real caller paths
