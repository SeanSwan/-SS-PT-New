# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 59.5s
> **Files:** docs/ai-workflow/blueprints/EQUIPMENT-VARIATION-ENGINE-DESIGN.md
> **Generated:** 3/6/2026, 1:34:26 PM

---

# Deep Architecture Review: EQUIPMENT-VARIATION-ENGINE-DESIGN.md

## Critical Observation

**This is a design document (Markdown specification), not actual source code.** I cannot perform a traditional code review with line-level bug detection, race conditions, or runtime errors because there is no executable code to analyze.

However, I can provide a **Design Specification Review** — identifying architectural flaws, logical inconsistencies, security concerns, and implementation risks that will become bugs when this design is coded.

---

## Review Findings

### 1. Architecture Flaws

#### Finding 1: Missing Authentication/Authorization Boundary
| Severity | HIGH |
|----------|------|
| Location | REST API Endpoints section (entire document) |
| What's Wrong | No authentication or authorization checks defined for any API endpoint. The design shows `POST /api/equipment-profiles`, `DELETE /api/equipment-profiles/:id`, etc., but doesn't specify who can access what. A client could potentially delete any profile or approve/reject equipment. |
| Fix | Add to design: `trainer_id` must match `current_user.id` for all profile operations. Add role-based checks for admin-only endpoints like `/api/equipment-items/pending`. |

---

#### Finding 2: No Rate Limiting on Expensive AI Operations
| Severity | CRITICAL |
|----------|----------|
| Location | "AI Equipment Recognition (Gemini Flash Vision)" section |
| What's Wrong | The `POST /api/equipment-profiles/:id/scan` endpoint calls Gemini Flash Vision API. There's no rate limiting defined. A malicious trainer could spam photos and drain the budget (Gemini Flash costs ~$0.001/image). |
| Fix | Add to design: Implement per-trainer rate limit (e.g., 10 scans/hour). Add request queuing with Redis. Add budget alerts. |

---

#### Finding 3: Circular Data Flow Risk in Variation Engine
| Severity | MEDIUM |
|----------|--------|
| Location | "Integration: How Systems Connect" section |
| What's Wrong | The feedback loop "Form Analysis → compensations feed back into Variation Engine" creates a circular dependency. If compensation detection is wrong, it corrupts future workout suggestions. No safeguards defined. |
| Fix | Add to design: Require human approval before compensation data auto-updates the variation engine. Add audit trail for compensation changes. |

---

### 2. Security Concerns

#### Finding 4: No Input Validation on AI Bounding Box Coordinates
| Severity | HIGH |
|----------|------|
| Location | Database Schema: `equipment_items.ai_bounding_box JSONB` |
| What's Wrong | The design accepts `bounding_box: {x, y, width, height}` from AI without validating ranges. Malicious input could have negative values, values > 1.0, or be non-numeric, causing rendering bugs or storage bloat. |
| Fix | Add validation: `0 <= x <= 1`, `0 <= y <= 1`, `0 < width <= 1`, `0 < height <= 1`, and all must be numbers. |

---

#### Finding 5: SQL Injection Risk in Exercise Name Queries
| Severity | CRITICAL |
|----------|----------|
| Location | "Variation Engine API" - `GET /api/variation/history?client_id=X&template_id=Y` |
| What's Wrong | The design shows raw query parameters in URLs. If `exercise_name` from `equipment_exercise_map` is used in dynamic queries without parameterized statements, SQL injection is possible. The `exercise_name VARCHAR(100) NOT NULL` is user-influenced. |
| Fix | Mandate: All database queries use parameterized queries (Sequelize ORM handles this, but must verify). Add input sanitization for `client_id` and `template_id` (must be valid UUIDs). |

---

#### Finding 6: Hardcoded Equipment Categories
| Severity | LOW |
|----------|-----|
| Location | Database Schema: `equipment_items.category VARCHAR(50)` |
| What's Wrong | Category values are hardcoded as comments: `'free_weights', 'machines', 'cables', 'bands', 'bodyweight', 'cardio', 'accessories', 'stability', 'plyometric', 'other'`. No enum constraint at DB level. |
| Fix | Add to schema: `CONSTRAINT category_check CHECK (category IN ('free_weights', 'machines', 'cables', 'bands', 'bodyweight', 'cardio', 'accessories', 'stability', 'plyometric', 'other'))` |

---

### 3. Data Integrity Issues

#### Finding 7: No Transaction Boundary for Profile Deletion
| Severity | HIGH |
|----------|------|
| Location | "REST API Endpoints" - `DELETE /api/equipment-profiles/:id` |
| What's Wrong | Deleting a profile cascades to `equipment_items` and `equipment_exercise_map`. If `workout_variation_log` references a deleted `profile_id`, orphaned records remain. No soft-delete for default profiles. |
| Fix | Change to soft-delete (`is_active = FALSE`). Add foreign key with `ON DELETE SET NULL` for `workout_variation_log.profile_id`. Validate no active clients use profile before hard delete. |

---

#### Finding 8: Race Condition in Variation Suggestion
| Severity | HIGH |
|----------|------|
| Location | "Variation Engine API" - `POST /api/variation/suggest` |
| What's Wrong | The engine filters "recently used (last 2 sessions)" but doesn't lock the suggestion. Two trainers could get different suggestions for the same client simultaneously, then both accept, causing duplicate or conflicting workout logs. |
| Fix | Add optimistic locking: `suggestion_id` with expiration (e.g., 5 minutes). Reject accept if suggestion expired or already accepted. |

---

#### Finding 9: No Uniqueness Constraint on Equipment Names Per Profile
| Severity | MEDIUM |
|----------|--------|
| Location | Database Schema: `equipment_items` table |
| What's Wrong | A profile could have duplicate equipment names (e.g., two "Bench Press" entries). This breaks the "equipment inventory" concept and causes confusing UI. |
| Fix | Add: `UNIQUE(profile_id, name)` constraint, or `UNIQUE(profile_id, trainer_label)` if trainer can override. |

---

### 4. Integration Issues

#### Finding 10: Frontend-Backend Contract Mismatch on NASM Confidence
| Severity | MEDIUM |
|----------|--------|
| Location | "SwapCard Component" section shows `[NASM: Phase 2]` badge, but API response format not defined |
| What's Wrong | The design shows the UI expects `nasm_confidence` or `nas m_phase` in the swap suggestion, but the "Variation Engine API" response format is not specified. Frontend will fail to render. |
| Fix | Define exact API response: `{ suggested_swaps: [{ exercise_name: string, nasm_phase: number, nasm_confidence: 'Stabilization Endurance' | 'Strength Endurance' | ... }] }` |

---

#### Finding 11: Missing Error States for AI Scan Failure
| Severity | HIGH |
|----------|--------|
| Location | "AI Equipment Recognition" section |
| What's Wrong | If Gemini API fails, times out, or returns malformed JSON, there's no defined error handling. User sees nothing or a generic 500. |
| Fix | Define error responses: `{ error: 'AI_UNAVAILABLE' | 'INVALID_IMAGE' | 'ANALYSIS_FAILED' }`. Add retry logic with exponential backoff. Show user-friendly message: "Scan failed. Please try again." |

---

#### Finding 12: No Pagination on Equipment List Endpoint
| Severity | MEDIUM |
|----------|--------|
| Location | "REST API Endpoints" - `GET /api/equipment-profiles/:id/items` |
| What's Wrong | A profile could have hundreds of equipment items (Move Fitness likely has 50+). Returning all at once causes slow response and UI lag. |
| Fix | Add pagination: `GET /api/equipment-profiles/:id/items?page=1&limit=20`. Return `{ items: [], total: 47, page: 1, limit: 20 }`. |

---

### 5. Logic & Business Rule Issues

#### Finding 13: 2-Week Rotation Logic Has Edge Case
| Severity | MEDIUM |
|----------|--------|
| Location | "Sean Swan's 2-Week Rotation Principle" |
| What's Wrong | Pattern shown: `BUILD → BUILD → SWITCH → BUILD → BUILD → SWITCH`. But what happens at Week 3? Does it reset to Week 1 pattern? What if a session is missed? The "2-Week" concept breaks with irregular scheduling. |
| Fix | Define algorithm: Track actual session count per rotation cycle, not calendar weeks. If client misses Day 4, next session is still SWITCH position (not reset). Add "rotation_position" counter in DB. |

---

#### Finding 14: Default Profiles Cannot Be Deleted But Can Be Edited
| Severity | LOW |
|----------|--------|
| Location | "Default Profiles (Built-in, Cannot Delete)" section |
| What's Wrong | Design says "Cannot Delete" but doesn't prevent editing into useless state (e.g., rename "Move Fitness" to "XXX", delete all equipment). |
| Fix | Add: Default profiles are read-only for `name`, `location_type`, and `is_default`. Only `description` and `equipment_items` are editable. |

---

#### Finding 15: Exercise Name Matching is Fragile
| Severity | HIGH |
|----------|--------|
| Location | "Equipment-to-Exercise mapping" and "Variation Engine" |
| What's Wrong | Exercise matching uses string comparison (`exercise_name VARCHAR(100)`). If AI returns "Push-up" vs "Pushup" vs "Push up", mappings break. No normalization. |
| Fix | Add: Canonical exercise name table with aliases. Normalize all inputs to lowercase with hyphens before matching. Example: `normalize("Push-up") → "pushup"`. |

---

### 6. Production Readiness

#### Finding 16: No Logging Strategy Defined
| Severity | MEDIUM |
|----------|--------|
| Location | Entire document |
| What's Wrong | No mention of logging AI scans, variation suggestions, or admin actions. For debugging and compliance, need audit trail. |
| Fix | Add to design: Log all AI scans with `trainer_id`, `profile_id`, `timestamp`, `result`. Log all variation accepts with `trainer_id`, `client_id`, `swap_details`. |

---

#### Finding 17: No Webhook or Notification for Pending Approvals
| Severity | LOW |
|----------|--------|
| Location | "Admin Dashboard Widget" section |
| What's Wrong | Widget shows "3 pending" but doesn't specify how admin is notified. No push notification, email, or in-app alert defined. |
| Fix | Add: When `approval_status` becomes 'pending', create notification record. Poll or push to admin dashboard. |

---

#### Finding 18: Missing Index on Workout Variation Log
| Severity | MEDIUM |
|----------|--------|
| Location | Database Schema: `workout_variation_log` |
| What's Wrong | Index is `idx_variation_log_client ON workout_variation_log(client_id, session_date)`. But "recently used" query filters by `session_date` range + `template_id`. Missing composite index on `(client_id, template_id, session_date)`. |
| Fix | Add: `CREATE INDEX idx_variation_log_template_session ON workout_variation_log(client_id, template_id, session_date DESC)` |

---

### 7. Dead Code / Tech Debt (Design-Level)

#### Finding 19: Duplicate Muscle Group Taxonomy
| Severity | LOW |
|----------|--------|
| Location | "NASM Muscle Group Taxonomy" section vs `exercise_muscle_map` table |
| What's Wrong | Muscle groups are defined in two places: as a text list in the design doc and as a database table. These can drift. |
| Fix | Remove the text list. Reference `exercise_muscle_map.muscle_group` as the single source of truth. |

---

#### Finding 20: Undefined `resistance_type` in Variation Engine
| Severity | MEDIUM |
|----------|--------|
| Location | "Equipment-to-Exercise mapping" table has `resistance_type`, but Variation Engine logic doesn't use it |
| What's Wrong | The substitution algorithm filters by "equipment available" but doesn't consider resistance type compatibility (e.g., swapping barbell squat for dumbbell squat). |
| Fix | Update algorithm step 5: Filter by `resistance_type` matching client's available equipment resistance capability. |

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 (Rate limiting, SQL injection) |
| HIGH | 7 |
| MEDIUM | 7 |
| LOW | 4 |

**Top 3 Ship Blockers:**
1. **No rate limiting on AI scan endpoint** — Budget drain risk
2. **SQL injection vulnerability in exercise queries** — Security breach risk
3. **No authentication on API endpoints** — Unauthorized access risk

---

## Recommendation

This design document requires revision before implementation. The critical security and data integrity issues must be addressed. Once actual code is generated from this design, a second review should be performed on the TypeScript/Node.js implementation to catch the runtime bugs that this design-level review cannot detect.

---

*Part of SwanStudios 7-Brain Validation System*
