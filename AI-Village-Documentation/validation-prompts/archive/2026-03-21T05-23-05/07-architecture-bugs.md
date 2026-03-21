# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 108.9s
> **Files:** docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md
> **Generated:** 3/20/2026, 10:23:05 PM

---

# Deep Architecture Review: EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md

This is a **blueprint/design document review** — not runtime code. The findings below are architectural issues, specification gaps, and potential implementation bugs that would manifest when this blueprint is coded.

---

## 1. Bug Detection (Specification-Level)

### 1.1 API Contract Mismatch — Ambiguous Exercise Search

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 9: API Contract | Two separate search endpoints listed with unclear distinction: `GET /api/exercises/search?q=` (existing) vs `GET /api/exercises/nasm?bodyPart=Chest&difficulty=Beginner` (new). The document doesn't clarify if the new endpoint replaces or augments the existing one. | Clarify: `/api/exercises/search` handles ALL exercises (NASM + custom) with filters; `/api/exercises/nasm` is an optimization for read-only NASM subset with different response shape. |

### 1.2 Voice Transcription API — Missing Response Shape

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 9: API Contract | The new endpoint `POST /api/ai-chat/transcribe` is documented but the response contract is missing. The workout logger needs structured exercises, not just raw transcription. | Add response schema:<br>`{ success: true, transcript: string, structuredData?: ParsedExercise[], confidence: number }` |

### 1.3 Phase 5 vs Phase 6 Overlap — Unclear Responsibility Split

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 10: Phase 5 (line ~"AI-to-Logger Pipeline Enhancement") vs Phase 6 | Phase 5 describes "AI returns structured exercises incrementally" — Phase 6 also describes "Logger populates cards as each exercise is parsed". These appear to be the same feature. | Consolidate into single phase with clear distinction:<br>• Phase 5: Server-side parsing (AI → structured JSON)<br>• Phase 6: Client-side real-time UI population |

### 1.4 Exercise Name Alias Matching — Ambiguous Mapping

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 6: AI Matching Logic | The alias rule: `"squats" → "Prisoner Squat" (bodyweight) or context-aware (if weight mentioned → "Barbell Deadlift" pattern)` is logically impossible — there's no "Barbell Deadlift" pattern that maps to "squats". This is a spec bug. | Fix the alias rule:<br>• "squats" → "Prisoner Squat" (default)<br>• "weighted squats" / "barbell squats" → "Barbell Back Squat" (from NASM list which is missing!)<br>• Note: "Barbell Deadlift" is NOT a squat movement |

### 1.5 Missing NASM Exercise — Barbell Back Squat

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Appendix A | The document claims 75 NASM exercises but lacks "Barbell Back Squat" — the most fundamental quad exercise. The "Legs — Squats & Quads" category has 12 exercises but lists none for barbell back squat. | Add "Barbell Back Squat" to Legs — Squats & Quads, or verify if "Barbell Deadlift" was intended to serve this purpose (it shouldn't). Recount total. |

---

## 2. Architecture Flaws

### 2.1 No Global Error State for Embedded Terminal

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 3: Embedded AI Terminal Architecture | The component spec shows happy paths but doesn't define error states: What happens when AI is unreachable? When transcription fails? When context switch fails? | Add to EmbeddedAITerminal spec:<br>• `error: string \| null` state<br>• Error banner UI in collapsed/expanded states<br>• Retry mechanism for failed API calls<br>• Offline indicator |

### 2.2 Client Selection State — No Persistence Specified

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 3: Tab-to-Context Mapping + Implementation | `selectedClientId` is passed as prop to EmbeddedAITerminal, but there's no spec for persistence. If trainer selects "Jackie", switches tabs, then returns — is the client still selected? | Add: "Client selection persists in URL query param (`?client=123`) and localStorage as fallback. On tab switch, client context carries forward." |

### 2.3 Missing GET Single Exercise Endpoint

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 9: API Contract | The spec lists CRUD for custom exercises but doesn't include `GET /api/exercises/:id`. This is needed when editing a workout that references an exercise. | Add: `GET /api/exercises/:id` — returns single exercise with full metadata |

### 2.4 Soft-Delete Race Condition in Custom Exercise

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 5: Admin Custom Exercise Management (rule #7) | Rule 7: "Deleting sets `isActive: false` so historical workout logs referencing that exercise still display correctly." This creates a display problem: if an exercise is soft-deleted, future autocomplete must exclude it, but historical logs need to show it. | Clarify query logic:<br>• `GET /api/exercises/search` excludes `isActive: false`<br>• Workout log GET endpoints JOIN and resolve exercise names from a snapshot stored at log creation time, OR<br>• Add `exerciseSnapshot: { name, bodyParts, equipment }` column to `workout_sets` table |

---

## 3. Integration Issues

### 3.1 Frontend-Backend Contract — Inconsistent Naming Convention

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 9: API Contract | Frontend code (Section 4 "Workout Logger Redesign") expects `ExerciseAutocomplete` with "autocomplete" naming, but backend endpoint is `/api/exercises/search`. No frontend service wrapper defined. | Add frontend service spec in Section 9 or Appendix:<br>`const searchExercises = (query: string, bodyPart?: string) => get('/api/exercises/search', { params: { q: query, bodyPart } })` |

### 3.2 Route Guard Bypass — No Auth Spec for Embedded Terminal

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 3: Implementation (Shared Layout) | The spec shows EmbeddedAITerminal in UnifiedAdminDashboardLayout but doesn't specify which roles can access it. Can clients use it? Guests? | Add: "EmbeddedAITerminal visible to roles: admin, trainer. Hidden for client role. Context defaults to 'general' if unauthorized." |

### 3.3 WebSocket/SSE — Real-Time Dictation Missing

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 6: Voice-First Dictation Workflow | The flow shows "interim transcript preview" and "AI returns structured exercises incrementally" — but there's no push mechanism. HTTP POST can't stream incremental results. | Specify real-time transport:<br>• Option A: WebSocket `/ws/ai-chat` for streaming<br>• Option B: Server-Sent Events `/api/ai-chat/stream`<br>• Update Mermaid diagram to show SSE/WS, not just REST |

### 3.4 Mobile Overlay — Z-Index/Stack Order Not Specified

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Section 3: Mobile Behavior | "Tap mic → full-screen overlay for dictation" — but overlay z-index relative to existing modals, bottom sheets, or navigation drawer is not defined. | Add: "Mic overlay uses z-index: 9999, above all other elements. Background backdrop: rgba(0,0,0,0.8)." |

---

## 4. Dead Code & Tech Debt

### 4.1 Duplicated Exercise Data — Frontend vs Backend

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Appendix B: New Files | Lists `frontend/src/data/nasm-exercises.ts` (static NASM data, ~500 lines). This duplicates the seeded database. Shouldn't frontend query the API? | Remove static file. Frontend fetches from `/api/exercises/nasm` or caches via React Query with stale-while-revalidate. Static file creates sync burden. |

### 4.2 Floating FAB Still Referenced — Confusion Point

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Section 3: "Keep floating FAB as fallback for non-admin pages" | The spec replaces floating drawer with embedded terminal, but mentions keeping floating FAB "as fallback". This is contradictory — if terminal is embedded everywhere, when is FAB used? | Clarify: "Floating FAB remains only on public/marketing pages (non-dashboard), and as manual-trigger on dashboard when EmbeddedAITerminal is collapsed by user preference." |

### 4.3 Exercise ID Type — Number vs UUID Inconsistency

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 5: Data Schema + Section 9 | `NASMExercise.id` is typed as `number`. Custom exercises likely use database UUID. Mixing types causes bugs in equality checks. | Standardize: All exercise IDs use UUID (`string`). Migration converts NASM numeric IDs to UUID strings. |

---

## 5. Production Readiness

### 5.1 Hardcoded Context Strings — No Enum/Constant

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Section 3: Tab-to-Context Mapping | Tab contexts listed as string literals: `general`, `scheduling`, `workout_generation`, `client_review`, `progress_analysis`, `onboarding`, `exercise_library`, `data_analysis`. No TypeScript enum. | Add to TypeScript constants:<br>`export const AI_CONTEXT = { GENERAL: 'general', SCHEDULING: 'scheduling', ... } as const;` |

### 5.2 Missing Rate Limiting on AI Chat Endpoint

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 9: API Contract | AI transcription and chat endpoints are expensive. No rate limiting specified. A malicious or buggy client could flood with voice requests. | Add spec: "Rate limit: 10 requests/minute per user on `/api/ai-chat/*`. Return 429 with `Retry-After` header when exceeded." |

### 5.3 No Input Validation on Voice Transcript Endpoint

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Section 9 | `POST /api/ai-chat/transcribe` accepts audio but no max file size, no content-type validation, no timeout. Could cause DoS. | Add validation spec:<br>• Max payload: 10MB<br>• Allowed types: audio/webm, audio/mp4, audio/wav<br>• Timeout: 30 seconds server-side<br>• Return 413 if exceeded |

### 5.4 No Logging Strategy Documented

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Entire document | No mention of observability for AI operations. How to debug when AI misparses? | Add to Section 11: "AI Village logs all requests/responses to separate audit table. Trainer can view 'AI Session Log' for debugging." |

---

## Summary Table

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Bug Detection | 5 | 1 | 3 | 1 | 0 |
| Architecture Flaws | 4 | 1 | 1 | 2 | 0 |
| Integration Issues | 4 | 1 | 1 | 2 | 1 |
| Dead Code & Tech Debt | 3 | 0 | 0 | 2 | 1 |
| Production Readiness | 4 | 0 | 2 | 1 | 1 |
| **TOTAL** | **20** | **3** | **7** | **8** | **2** |

### Top 5 Ship Blockers (Must Fix Before Coding)

1. **Missing Barbell Back Squat** — Core exercise absent from NASM library
2. **No WebSocket/SSE for real-time transcription** — Current spec can't deliver "incremental" AI responses
3. **Soft-delete race condition** — Historical workouts will break when exercises are deleted
4. **No rate limiting on AI endpoints** — Production DoS vulnerability
5. **AI alias matching contains impossible rule** — "squats" → "Barbell Deadlift" is technically incorrect

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
