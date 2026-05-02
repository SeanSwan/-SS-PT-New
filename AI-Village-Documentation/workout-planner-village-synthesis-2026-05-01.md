# Workout Planner — Village Synthesis (Anti-Sycophancy Pass)

**Run:** 2026-05-01 (commit `cf08ee98a` baseline)
**Cost:** $0.7266 | **Time:** 490s | **Files:** 7 (page, styles, types, service, goalConfig, route, model)
**Status:** Phase 1 ✅ 13/14 | Phase 2A ✅ Security debate consensus | Phase 2B ✅ Code Quality consensus | **Phase 2C ❌ Gemini quota 429** | Phase 3 ✅ escalations OK

> **Anti-sycophancy doctrine applied** (rule 30 + rule 51). Every CRITICAL Village finding was verified against the real code before acceptance. This file marks `[VERIFIED]` / `[HALLUCINATED]` / `[PARTIAL]` per finding.

---

## Top-line: Village got real value but over-flagged

**Village hallucinated 4 of the 6 named CRITICAL findings.** Code Quality + Security debates BOTH reached "consensus" on bugs that don't exist in the real code. This is Codex's documented Village skepticism case — the Village is a hypothesis generator, never a gate.

The phase 2C UX debate (the one most aligned with Sean's actual ask) **failed mid-run** on Gemini quota exhaustion. So the Village answered the wrong questions thoroughly and the right questions not at all.

**Recommendation:** treat this output as a 60% useful audit. Real findings ship in W1-W4. Hallucinated ones get logged here and not acted on. The UX debate gets re-run tomorrow when Gemini quota resets, OR we consult Gemini 3.1 Pro directly via `consult-gemini.mjs` for the UX questions.

---

## Findings — Verification Pass

### `[HALLUCINATED]` — do NOT act on these

| # | Village Claim | Reality | Why Village Was Wrong |
|---|---|---|---|
| **CRIT-01** | "react-window API mismatch — list will not render, 840 exercises silently invisible" | `package.json` has `react-window@2.2.7`. v2 API IS `rowComponent`/`rowCount`/`rowHeight`. Sean's screenshot shows 883 exercises rendering. | Both Claude Sonnet 4.6 and Nemotron 3 Super applied v1.x knowledge to v2.x code. No version check. |
| **F-01** | "IDOR — Unauthenticated Plan Load via Predictable Integer ID, no ownership check" | `workoutPlanRoutes.mjs:137` is `router.get('/:id', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), ...)`. The `verifyClientAccessByPlanId` middleware was Phase B mitigation we shipped earlier this session. | Village did not read the route file we passed in. Static analysis only on the page. |
| **F-02** | "Stored XSS via Unsanitized AI Explanation Strings — CRITICAL" | Lines 987-997 render `{exp.message}` and `{exp.details}` as JSX text nodes. React auto-escapes. No `dangerouslySetInnerHTML` exists in the file. | Village's own report admits: "React escapes this in JSX text nodes, but the risk escalates to CRITICAL if `dangerouslySetInnerHTML` is introduced." That's a hypothetical, not a real CRITICAL. |
| **F-03** | "Trainer IDOR — Client List Endpoint Exposes Cross-Trainer Client Data via tampering `user.id`" | `user.id` comes from JWT auth context (server-set), not user input. Backend has its own `String(trainerId) !== String(requestingUserId)` check (commit `c05fb1eea` this session). | Village treated client-side `user.id` as user-controllable. It isn't. |
| **CRIT-03 partial** | "handleSave stale closure on fetchSavedPlans" | `handleSave` deps include `authAxios`; `fetchSavedPlans` deps are `[authAxios]`. They re-create together. Self-correcting. | Theoretically sound dependency hygiene observation, but not a real bug in this codebase. Adding `fetchSavedPlans` to `handleSave` deps is defensive cleanup, not a critical bug. |

### `[VERIFIED REAL]` — these are actual bugs

| # | Finding | Severity | Evidence |
|---|---|---|---|
| **F-12** | `Math.random()` called during render at SkeletonBar | MEDIUM-HIGH | `WorkoutPlannerPage.tsx:888-889`. Causes hydration mismatches + re-render thrash. Same class as Codex caught earlier sessions. |
| **CRIT-04** | `isDirty` inverted for "load + edit" flow | MEDIUM | `WorkoutPlannerPage.tsx:553`: `isDirty = planExercises.length > 0 && !loadedPlanId`. Loading a plan and modifying it → `loadedPlanId` truthy → `isDirty=false` → no unsaved-changes warning when navigating away. |
| **WCAG-01** | Color contrast fails 4.5:1 in places | HIGH | Rule 7 violation. UX track called this out without specific selectors — needs targeted audit, not blanket fix. |
| **TOUCH-01** | MiniInput + Chip components <44px hit area on mobile | HIGH | Rule 2 violation. Visible in Sean's screenshot. |
| **MULTI-WEEK** | "Mesocycle day select vs main planExercises builder ambiguity" | HIGH (matches Sean's #1 complaint) | UX track agreed: clearly indicate which day's workout the builder is editing within the 4-week structure. |
| **HARDCODE** | Hardcoded color values bypass theme tokens | MEDIUM | Rule 6 violation. Style file has some `#hex` values — needs token + fallback pass. |
| **F-09** | MiniInput accepts any value, DOM manipulation bypasses min/max | MEDIUM | Real defensive concern. Add input validation + clamping. |
| **F-07** | New `details: err.message` we shipped in `cf08ee98a` leaks internal error to UI | MEDIUM | Real: my own commit. Trade-off was diagnostic visibility for trainers. For prod, should sanitize before surfacing. |
| **F-10** | `console.error('AI generation failed:', err)` may dump JWT in error.config.headers | MEDIUM | Real, easy fix — strip headers/sensitive props from logged error. |
| **REDUCED-MOTION** | Animations don't respect `prefers-reduced-motion` | MEDIUM | Rule 25 violation. |
| **JSON-PARSE-BLOCK** | Render-blocking JSON parsing on planData | MEDIUM | Worth measuring; if planData JSONB is large, parse off-main-thread or memoize. |
| **F-16** | Lazy `AITerminalPanel` has no error boundary | LOW | Real, easy fix — wrap in `<ErrorBoundary>`. |
| **F-15** | `parseInt(x)` without radix in some places | LOW | Hygiene. |
| **EXISTING-WORK** | Sean's specific complaints (4-week display, rolodex squish, mesocycle expand, PDF, save flow, Coach awareness) | — | Confirmed by UX track. Village didn't add new requirements but validated Sean's diagnosis. |

### `[NEEDS RE-RUN]`

- **Phase 2C UX/UI Design Debate** failed at Gemini quota 429. Sean's brief explicitly asked for mobile density, multi-week display patterns (3 options compared), mesocycle modal-vs-drawer-vs-inline, PDF strategy, IA placement on 3 dashboards, Coach handoff disclosure. None of these got debated.
- **Action:** re-run `consult-gemini.mjs --design --file <files>` tomorrow when Gemini quota resets, OR direct Gemini consult with the 6 specific questions from the brief.

---

## Updated W1–W4 phasing (Village evidence baked in)

### **Phase W1 — Quick wins + safety patches (3-4 hours, ship today)**

Quick UX + real bug fixes, no design decisions required:

1. **Fix `Math.random()` in render** — `WorkoutPlannerPage.tsx:888-889`. Replace with stable `useMemo`-derived widths so skeleton is consistent across renders. (F-12)
2. **Fix Rolodex squishing** — clean up MetaTag wrap behavior in row, increase row height OR truncate badges responsively. (Sean's #2)
3. **Fix `isDirty` for edit flow** — track `originalPlanSnapshot` separately so loaded-and-edited plans warn on nav. (CRIT-04)
4. **Touch targets ≥44px** on MiniInput + Chip. (TOUCH-01)
5. **`prefers-reduced-motion` guards** on framer-motion animations. (REDUCED-MOTION)
6. **Sanitize console.error** — strip Axios `error.config.headers` before logging. (F-10)
7. **Sanitize the new `details: err.message`** I added in `cf08ee98a` — map known errors to safe-message dictionary, fall through to "Generation failed, try again" for unknowns. (F-07 — my own commit)
8. **Error boundary** around lazy `AITerminalPanel`. (F-16)

### **Phase W2 — Multi-week display + Save flow (5-7 hours)**

Needs design decisions. Defer until Gemini UX debate re-runs OR Sean picks pattern from the 3 options I propose.

1. **Multi-week display redesign** — surface all 12 sessions across 4 weeks. Three pattern candidates:
   - **A.** Week 1/2/3/4 tabs ABOVE existing day tabs (nesting)
   - **B.** Single scrollable calendar-grid view (Week × Day matrix)
   - **C.** Collapsible week sections with day-row expansion
   *Recommend: get Gemini's call before building.*
2. **Wire "Save Plan" properly** — already has handleSave (line 464); verify save→reload→edit cycle works end-to-end after fixing isDirty.
3. **Trainer dashboard "My Saved Plans" tab** — list saved plans per client, click to load.
4. **Client dashboard "Your Plan" panel** — read-only view of active plan for the client.
5. **Admin dashboard oversight** — admin can view any saved plan across all trainers.

### **Phase W3 — Mesocycle expand + PDF (4-6 hours)**

1. **Mesocycle card click** → expand pattern (modal/drawer/inline — needs Gemini design call).
2. **PDF export** — start with browser print + dedicated print stylesheet (lowest blast radius). If Gemini recommends server-side rendering for polish, defer to W4+.

### **Phase W4 — Coach plan-awareness (3-4 hours, backend)**

1. **Coach Assistant queries `WorkoutPlan` first** for the client.
2. **Default behavior:** reference saved active plan in responses.
3. **Override:** trainer says "regenerate" → falls through to current generate flow.
4. **Disclosure**: Coach reasoning panel shows "Reading from active plan" vs "Generated fresh" indicator.

### Deferred / explicitly not in scope

- F-05 (prototype pollution via JSONB) — theoretical, defensive review later
- F-08 (window.confirm CSRF) — theoretical
- F-15 (parseInt radix) — hygiene cleanup pass
- F-06 (any casts) — TS hygiene cleanup pass

---

## Recommended starting slice

**Ship Phase W1 now (auto-mode action).** Eight items, all narrow scope, all backed by real evidence. Each item is a 5-30 min fix.

**After W1 lands**: re-run Gemini UX debate (Phase 2C only — `consult-gemini.mjs --design`) so W2-W4 design decisions have the input the failed Village run was supposed to provide. Then W2 starts with concrete pattern direction.

**3-Brain review chain** (rule 46) applies for any non-trivial slice in W2-W4: Claude builds → Gemini reviews → Codex final gate. W1 is a bundle of small fixes — runs through normal closeout-evidence-lock per rule 41.

---

## Sign-off

- **Sean approves**: ship W1 immediately? OR pick a different starting point?
- **Village**: ack the 4 hallucinations, kept the real findings, captured the UX debate gap as a pending re-run.
- **No code touched yet** — this is the synthesis step. W1 starts on Sean's go.
