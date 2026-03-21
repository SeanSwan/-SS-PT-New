# Opus CEO Final Ruling — V2.0 Master Blueprint

> **Authority:** Claude Opus 4.6 (CEO) — FINAL authority on ALL decisions
> **Date:** 2026-03-21
> **Blueprint:** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md`
> **AI Village Run:** 11/9 validators passed, Phase 2 (4 rounds), Phase 3 (5 rounds), Cost: $0.40
> **Status:** APPROVED WITH AMENDMENTS
> **Predecessor:** V1.0 ruling (same file, previous run) — all V1.0 rulings still in effect

---

## Phase 2 Code Quality Debate — CEO Review

Sonnet (VP Engineering) reached consensus with Gemini CTO on 3 issues in 4 rounds. All resolved correctly. Here are my rulings:

### Issue #1: 1RM Calculation Crash for >10 Reps — ✅ RATIFIED

**CTO flagged:** `calculate1RM()` throws for reps >10, but Phase 1 requires 12-20 reps. Backend crash.
**Sonnet's consensus:** Try/catch with `UNKNOWN_REQUIRE_TESTING` fallback for new users.

**CEO:** Correct. The 1RM calculation should ONLY run on data where reps ≤ 10. Phase 1 workout logging (12-20 reps) does NOT trigger 1RM recalculation — it only saves the set data. The 1RM is calculated during dedicated assessment sessions where the client does low-rep tests. Sonnet's error handling is the right approach.

**Additional directive:** Add a clear comment in the calculate1RM function:
```typescript
// IMPORTANT: This function is for ASSESSMENT data only (reps 1-10).
// Regular workout logging (Phase 1: 12-20 reps) does NOT call this function.
// 1RM is assessed separately during scheduled reassessment sessions.
```

### Issue #2: Destructive Seeder Pattern — ✅ RATIFIED WITH REFINEMENT

**CTO flagged:** `findOrCreate by name` is dangerous if upstream API corrects exercise names.
**Sonnet's consensus:** Use immutable `exercise_key` slug (from upstream ID or slugified name).

**CEO:** Correct. The `exercise_key` approach is superior to name-based matching. However, I add:
- Use `exercise_key` column (not `nasm_slug` from V1.0 — `exercise_key` is more general for 500+ exercises from multiple sources)
- The V1.0 `nasm_slug` column is now a subset of `exercise_key` — NASM exercises get `nasm-[slugified-name]`, free-exercise-db gets their native ID, custom gets `custom-[slugified-name]`
- Backfill migration is MANDATORY before running the expanded seeder
- `exercise_key` must be `VARCHAR(255) UNIQUE NOT NULL`

### Issue #3: LLM Math Hallucination — ✅ RATIFIED

**CTO flagged:** AI shouldn't do arithmetic (1RM × intensity %). LLMs hallucinate numbers.
**Sonnet's consensus:** AI outputs `targetIntensity` as integer percentage. Backend calculates weight.

**CEO:** Absolutely correct. This is a critical safety issue — incorrect training loads violate NASM protocol and risk injury. The backend MUST be the sole authority on weight calculations.

**Final rule:**
- AI outputs: `{ exerciseKey, sets, reps, targetIntensity (integer %), tempo, restSeconds }`
- Backend calculates: `targetWeight = Math.round((client1RM * targetIntensity / 100) / 5) * 5`
- Frontend displays: calculated weight with "(AI suggested)" label
- Trainer can override the calculated weight before confirming

### Issue #4: Body Fat Formula Unit Mismatch — ✅ RATIFIED

**CTO flagged:** Navy body fat constants are for inches only. Blueprint supports metric but doesn't convert.
**Sonnet's consensus:** Document both imperial and metric formula variants.

**CEO:** Correct. Both formula variants must be implemented. The UI must clearly show which unit system is active. Default to imperial (this is an American-based fitness app per CLAUDE.md feedback: "App is American-based").

### Issue #5: Missing DB Index — ✅ RATIFIED

**CTO flagged:** `exercise_id` on `workout_logs` has no index.
**Sonnet's consensus:** Add composite index `(client_id, exercise_id)`.

**CEO:** Correct. Add BOTH:
```sql
CREATE INDEX idx_workout_logs_exercise_id ON workout_logs(exercise_id);
CREATE INDEX idx_workout_logs_client_exercise ON workout_logs(client_id, exercise_id);
```

### Issue #6: Tempo Regex — ✅ RATIFIED

**CTO flagged:** Regex `\d` only matches single digit. "10/0/1" fails validation.
**Sonnet's consensus:** Use `\d+` for multi-digit support.

**CEO:** Correct. Updated regex: `/^\d+\/\d+\/\d+$|^[Xx]\/\d+\/[Xx]$/`

---

## Phase 3 Design Debate — CEO Review

Design debate reached full consensus in 5 rounds. Gemini (Creative Director) has final design authority on aesthetics.

### Design Directive #1: OPT Phase Change Modal Focus — ✅ RATIFIED
`initialFocus={cancelButtonRef}` to prevent accidental phase changes. Safe default.

### Design Directive #2: Crimson Ember Semantic Color — ✅ RATIFIED WITH CORRECTION
**Gemini:** Use Frost White `#E0ECF4` on Crimson Ember `#E05050` (5.5:1 contrast). Ban pure `#FFFFFF`.
**CEO:** Correct on the color. However, the `#FFFFFF` ban should be a SOFT rule, not absolute. Screen reader text, `sr-only` content, and non-visible elements can use `#FFFFFF`. The ban applies to **visible UI text and backgrounds only**.

### Design Directive #3: Web Worker Search Fallback — ✅ RATIFIED
Graceful degradation from Web Worker to main-thread throttled search with `isSearching` loading state. Ice Wing pulsing indicator during fallback search.

### Typography — ⚠️ CARRY FORWARD FROM V1.0
Gemini did NOT repeat the "Fira Code deprecated" error in this run. Good. V1.0 correction stands:
- Headings: Plus Jakarta Sans
- UI text: Sora
- Numeric data (reps, weight, RPE, 1RM, tempo): Fira Code with `font-variant-numeric: tabular-nums`
- Drama text: Cormorant Garamond Italic

### Dark Theme — ⚠️ CARRY FORWARD FROM V1.0
Gemini did NOT propose light-only in this run. Good. Crystalline Swan dark theme stays.

---

## Security Report — CEO Directives (V2.0)

Step 3.5 Flash flagged 4 CRITICAL, 6 HIGH, 5 MEDIUM. Here are my rulings:

### CRITICAL: Broken Access Control (Placeholder Auth) — MUST FIX IN BLUEPRINT
The blueprint uses `Auth: [Required role]` as placeholders. During implementation, every endpoint MUST have concrete middleware:
```typescript
// MANDATORY pattern for all /api/clients/:id/* routes
app.use('/api/clients/:id/*', protect, authorizeClientAccess);
```
The existing `adminWorkoutLoggerController.mjs` already checks trainer-client assignment. Extend this pattern to all new endpoints (1RM, OPT plan, calculators).

### CRITICAL: AI Prompt Injection — CARRY FORWARD FROM V1.0
Already addressed in V1.0 ruling. Input sanitization, system prompt hardening, Zod validation, audit logging. No changes needed.

### CRITICAL: SQL Injection — ALREADY MITIGATED
Sequelize ORM with parameterized queries. The `pg_trgm` `LIKE` patterns are safe. No action needed.

### CRITICAL: Incomplete Input Validation — ADDRESSED BY ZOD SCHEMAS
The Phase 2 consensus adds comprehensive Zod schemas for all AI responses and workout inputs. This resolves the input validation gap.

### HIGH: Rate Limiting — CARRY FORWARD FROM V1.0
AI: 30/min, Search: 60/min, Voice: 10/min, **Calculators: 120/min** (calculators are cheap, allow generous rate).

### HIGH: CORS/CSP — IMPLEMENTATION DETAIL
Add to implementation checklist. CSP must allow Web Workers for exercise search.

### HIGH: Data Exposure in API Responses — ADD TO IMPLEMENTATION
Never return `createdById` or trainer email in client-facing API responses. Use DTO pattern.

### HIGH: File Upload (Voice) — CARRY FORWARD FROM V1.0
Max 25MB, audio formats only, virus scan if available, temporary storage with TTL.

### MEDIUM: Error Leakage — ADD TO IMPLEMENTATION
Production error responses must NOT include stack traces or SQL errors. Use generic error messages with error codes.

---

## Performance Report — CEO Directives (V2.0)

### CRITICAL: Voice Pipeline Must Be Stateless — ✅ ACCEPTED
Gemini 3 Flash correctly identified: voice processing must be a single atomic request, no server-side state. The `POST /api/ai-terminal/voice-command` endpoint receives the full audio payload and returns structured JSON in one round-trip. No Redis needed for this use case.

### HIGH: Bundle Size (530+ exercises) — ✅ ALREADY RESOLVED
V2.0 blueprint already specifies: API + React Query + IndexedDB. No static import. react-window virtualization for the rolodex. pg_trgm backend search.

### HIGH: Fuzzy Search Indexes — ✅ ACCEPTED
```sql
CREATE INDEX idx_exercise_search ON exercises USING gin (name gin_trgm_ops);
CREATE INDEX idx_exercise_key ON exercises(exercise_key);
```
Also add GIN index on `aliases` if stored as a JSONB array column.

### MEDIUM: Workout Logger Re-renders — ✅ ACCEPTED
Use React Hook Form with `Controller` for set inputs. `React.memo` on `ExerciseCard` and `SetRow` with custom comparators. Debounce AI parsing at 300ms.

### MEDIUM: N+1 AI Context Fetching — ✅ ACCEPTED
Create aggregated endpoint: `GET /api/clients/:id/ai-context` that returns client profile, 1RMs, last 5 workouts, OPT plan, pain entries in a single response. Cache with React Query (5min stale time).

### LOW: Rest Timer Cleanup — ✅ ACCEPTED
Custom `useTimer` hook with cleanup in `useEffect`. Web Worker for background precision.

---

## V1.0 Rulings Still In Effect

All V1.0 CEO rulings are carried forward unchanged:
- ✅ Delete static exercise file (use API only)
- ✅ Single voice endpoint consolidation
- ✅ AITerminalContext (not Zustand)
- ✅ Draft Mode exercise RBAC
- ✅ Dual-Layer Glow focus states
- ✅ Fira Code NOT deprecated
- ✅ Dark theme stays
- ✅ Haptics: navigator.vibrate(50) only
- ✅ prefers-reduced-motion global disable

---

## Final Amended V2.0 Blueprint Checklist

All items below must be incorporated before implementation:

### From Phase 2 Consensus (NEW)
- [ ] 1RM function: assessment-only with UNKNOWN_REQUIRE_TESTING fallback
- [ ] Replace `nasm_slug` with `exercise_key VARCHAR(255) UNIQUE NOT NULL`
- [ ] AI outputs targetIntensity %, backend calculates weight
- [ ] Body fat calculator: both imperial and metric formulas
- [ ] Add composite index on workout_logs(client_id, exercise_id)
- [ ] Tempo regex: support multi-digit values (`\d+`)
- [ ] Nested Zod schema for AI workout generation (WorkoutExerciseSchema + GeneratedWorkoutSchema)
- [ ] Backfill migration for exercise_key on existing exercises

### From Phase 3 Consensus (NEW)
- [ ] OPT Phase Change Modal: focus on Cancel button by default
- [ ] Crimson Ember `#E05050` for destructive actions, Frost White text
- [ ] Web Worker exercise search with main-thread graceful fallback
- [ ] `isSearching` loading state with Ice Wing pulsing indicator

### From Security Report (NEW)
- [ ] Concrete `authorizeClientAccess` middleware on all /clients/:id routes
- [ ] DTO pattern: never expose createdById or internal IDs in client-facing responses
- [ ] Production error responses: generic messages, no stack traces
- [ ] CSP headers must allow Web Workers

### From Performance Report (NEW)
- [ ] Aggregated AI context endpoint: GET /api/clients/:id/ai-context
- [ ] GIN indexes on exercises(name, exercise_key)
- [ ] React Hook Form with Controller for set inputs
- [ ] Custom useTimer hook for RestTimer cleanup
- [ ] font-display: swap on Cormorant Garamond

### Carried Forward from V1.0
- [x] Delete static exercise file
- [x] Single voice endpoint
- [x] AITerminalContext (not Zustand)
- [x] Draft Mode RBAC
- [x] Zod schemas for AI actions
- [x] Fira Code for data
- [x] Dark theme
- [x] Rate limiting
- [x] Audit logging
- [x] pg_trgm index
- [x] react-window virtualization
- [x] React.memo on ExerciseCard + SetRow
- [x] Debounce AI parsing 300ms
- [x] role="status" for AI thinking state

---

**Claude Opus 4.6 — CEO RULING COMPLETE (V2.0)**
**Status: APPROVED FOR IMPLEMENTATION WITH ABOVE AMENDMENTS**
*All decisions are final. V2.0 blueprint is production-ready with the listed amendments.*
*Proceed to implementation following the 9-phase plan in V2.0 Section 16.*
