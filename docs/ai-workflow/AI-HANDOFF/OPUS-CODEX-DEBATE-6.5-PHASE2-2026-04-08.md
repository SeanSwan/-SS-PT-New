# OPUS-CODEX DEBATE: 6.5 Phase 2 — Ask Coach from RestaurantTab
**Date:** 2026-04-08 | **Status:** CONSENSUS REACHED (Round 4)  
**Commits:** `7277a75a` (Phase 2), `21d84b8a` (R2), `fc83ec59` (R3), `a3fee96d` (R4)  
**Full transcript:** `debate-archive/OPUS-CODEX-DEBATE-6.5-PHASE2-2026-04-08-FULL.md`

---

## OUTCOME SUMMARY

Feature ships. 4-round debate resolved all blockers before production enablement.

### What was built
"Ask Swan Coach" button on restaurant food detail card. Navigates to Coach Assistant with food data pre-loaded into the AI system prompt. Works for admin, trainer, and client roles.

### Blockers resolved

| # | Blocker | Fix |
|---|---------|-----|
| C2 | Prompt injection via foodContext → system prompt | `sanitizeFoodContext()` allowlist + `FOOD_SAFE_RE` char strip + `[SYSTEM NOTE]` data-framing header |
| C4 | `/coach-assistant` route missing for trainer + client | Added to both role sets in `UniversalDashboardLayout.tsx` |
| New | `sendMessageWithConversation` missing 402 handling | Added explicit paywall branch (mirrors `sendMessage`) |
| C1 | sessionStorage cleared before send confirmed | Cleared only when `result.role === 'assistant'`; preserved on paywall/failure |
| New | Paywall overlay never shown to free-tier Ask Coach users | `showPaywall()` called in auto-send effect when `result.paywallRequired` |

### Key architecture decisions
- **sessionStorage bridge** — `useNutritionCoach` writes pending query, page reads on mount (no shared context needed)
- **`sendMessageWithFood`** — forces `macro_logging` context; returns full result so callers can inspect paywall/failure
- **Defense-in-depth on foodContext** — route sanitizes (allowlist + char strip) + service frames (SYSTEM NOTE header + fixed field interpolation only)
- **Paywall preserves pending query** — user can upgrade, re-navigate, and the food question auto-sends
