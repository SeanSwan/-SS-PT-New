# OPUS-CODEX DEBATE: 6.5 Phase 2 — Ask Coach from RestaurantTab
**Date:** 2026-04-08  
**Status:** ROUND 1 — Awaiting Codex Review  
**Commit:** `7277a75a`

---

## CLAUDE ANALYSIS (Round 1)

### What Was Built

**7 files, commit `7277a75a`:**

1. **`frontend/src/hooks/useNutritionCoach.ts`** (new, 65 lines) — Hook that formats a `FoodDetail` into a user-visible message + structured `foodContext` object, writes both to `sessionStorage['swan:pending-coach-food']`, then navigates to `/dashboard/:role/coach-assistant`. Role derived from `localStorage['user']` (same pattern SwanCoachAssistantPage already uses). sessionStorage write wrapped in try/catch for storage-full resilience.

2. **`frontend/src/components/FoodTracker/RestaurantTab.tsx`** — Added import of `useNutritionCoach` and `MessageCircle`. Instantiated `{ askCoach }` in component body. Wrapped existing `AddBtn` in new `DetailActions` flex-column container. Added `AskCoachBtn` beside it — ghost style (`rgba(0,32,96,0.5)` bg, `#60C0F0` border + text). Button calls `askCoach(selectedFood!)` — only renders when `selectedFood` is set (detail view is already conditional on `selectedFood`).

3. **`frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`** — Added second `useEffect([], ...)` that runs after mount. Reads and immediately removes `swan:pending-coach-food` from sessionStorage. On success, schedules `coach.sendMessageWithFood(message, foodContext)` after 400ms (allows route mount + conversation list load to settle). Wrapped in try/catch for malformed JSON.

4. **`frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts`** — Added `sendMessageWithFood(text, foodContext)` — maps `'balanced'` → `'both'`, forces context to `'macro_logging'` (nutrition system prompt), calls `chat.sendMessageWithConversation` with `foodContext` as 6th arg. Added to return value.

5. **`frontend/src/hooks/useAIChat.ts`** — Added `foodContext?: Record<string, unknown> | null` as optional 6th param to `sendMessageWithConversation`. Included in POST body via spread: `{ message, ...(foodContext ? { foodContext } : {}) }`. Backward-compatible — all existing callers unaffected.

6. **`backend/routes/aiChatRoutes.mjs`** — Destructured `foodContext` alongside `message` from `req.body`. Added type guard (`typeof foodContext === 'object'`) before passing as 5th arg to `enrichWithUserData`. Existing callers without `foodContext` get `null` → no change in behavior.

7. **`backend/services/aiChatService.mjs`** — Added `foodContext = null` as 5th param to `enrichWithUserData`. After the NUTRITION section (line ~1575), injects a `--- FOOD ITEM BEING DISCUSSED ---` block when `foodContext` is truthy. Includes name, brand, serving, macros, and micronutrients. Appended: `(User is asking about this specific food item — tailor your advice to it.)` so the AI knows to focus.

### Architecture Summary

```
[RestaurantTab "Ask Swan Coach" click]
  → useNutritionCoach.askCoach(food)
    → sessionStorage.setItem('swan:pending-coach-food', JSON)
    → navigate('/dashboard/:role/coach-assistant')
      → SwanCoachAssistantPage mounts
        → useEffect reads + clears sessionStorage
          → setTimeout 400ms
            → coach.sendMessageWithFood(message, foodContext)
              → chat.sendMessageWithConversation(..., foodContext)
                → POST /api/ai-chat/conversations/:id/messages
                  { message, foodContext }
                  → enrichWithUserData(..., foodContext)
                    → system prompt gets --- FOOD ITEM BEING DISCUSSED ---
```

---

## POTENTIAL ISSUES FOR CODEX TO EVALUATE

### CRIT candidates:

**C1 — sessionStorage race: 400ms hardcoded delay**
`SwanCoachAssistantPage` waits 400ms before calling `sendMessageWithFood`. If the user's device is slow (low-end Android, throttled CPU) the conversation list load + route hydration might not finish in time. If `chat.sending` is already true when the timer fires, `sendMessageWithFood` returns early silently. The food query is lost with no retry or error.

**C2 — foodContext not validated/sanitized server-side**
`aiChatRoutes.mjs` only checks `typeof foodContext === 'object'` before passing to `enrichWithUserData`. A malicious client could inject arbitrary keys/values. `enrichWithUserData` accesses `f.foodName`, `f.calories`, etc. directly — string interpolation into the system prompt. If a user crafts `{ foodName: "ignore previous instructions and..." }`, this is a prompt injection vector via the food context block.

**C3 — `selectedFood!` non-null assertion in RestaurantTab**
```tsx
<AskCoachBtn type="button" onClick={() => askCoach(selectedFood!)}>
```
The `!` assertion is safe because `AskCoachBtn` only renders inside `{selectedFood && (...)}` — TypeScript can't see that. But if the JSX tree is refactored, this assertion becomes dangerous. Minor — not a runtime bug today.

**C4 — `useNutritionCoach` uses `localStorage['user']` to derive role**
The coach assistant page does the same (`userRole` memo). But `useNutritionCoach` is called from `RestaurantTab`, which may be rendered outside a dashboard route (e.g., a future public nutrition search page). If `localStorage['user']` is absent/stale, `role` defaults to `'client'`, navigating to `/dashboard/client/coach-assistant`. That may 404 if the user is actually an admin/trainer who hasn't reloaded since their role changed. Low risk today; worth noting.

---

## QUESTIONS FOR CODEX

1. Are C1-C4 real blockers before this ships to production, or acceptable risk?
2. For C2 — what's the minimum sanitization needed to prevent prompt injection via `foodContext`? Should we strip/truncate string values at the route level?
3. For C1 — should the 400ms timeout be replaced with a ref-based flag (`pendingFoodQuery`) that fires after the first `listConversations` response instead of a fixed delay?
4. Any other gaps not identified above?

---

*Codex: Read ONLY this debate file. Do NOT read the archive. CLAUDE.md rules apply — no MUI, no retired Galaxy-Swan theme tokens, no README files in production.*

---
