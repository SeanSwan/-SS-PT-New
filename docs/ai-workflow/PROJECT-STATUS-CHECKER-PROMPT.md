# 🔍 PROJECT STATUS CHECKER - REUSABLE PROMPT
## SwanStudios Personal Training Platform - Health Check & Flow Pattern Validator

**Purpose**: Use this prompt to systematically check project status, verify implementation quality, and ensure adherence to architectural patterns (mermaid diagrams, flowcharts) to minimize errors and technical debt.

**When to Use**:
- Before starting a new feature
- After completing a major milestone
- When debugging persistent issues
- During code review
- Monthly health checks

---

## 📋 PROMPT TEMPLATE

```
I need a comprehensive status check of the SwanStudios Personal Training Platform.

## ANALYSIS SCOPE

### 1. CURRENT IMPLEMENTATION STATE
Analyze the following areas and report status (✅ Working / ⚠️ Partial / ❌ Broken / 🔲 Not Started):

**Core Business Features**:
- User authentication & RBAC (admin/trainer/client roles)
- Client-trainer assignment system (`ClientTrainerAssignment` model)
- Workout session logging (`WorkoutSession` API)
- Progress tracking (charts, metrics)
- Session scheduling (`/api/sessions`)
- Package sales & checkout (Genesis Checkout v2, Stripe)

**AI Systems**:
- AI chat interface with three-tier permissions (admin/trainer/client)
- Master Prompt System (JSONB schema, Twilio SMS, photo analysis)
- Coach Cortex v3.1 (personal training + boot camp integration)

**UI/UX**:
- HomePage v2.0 (LivingConstellation, Galaxy-Swan theme)
- Client Dashboard (gamification, progress)
- Trainer Dashboard (assigned clients, workout logging)
- Admin Dashboard (client management, system settings)

**Advanced Features**:
- Gamification V1 (achievements, challenges, leaderboards)
- Social features (user follows, challenges, feed)
- Food scanner
- iPad PWA app (offline-first, voice commands)

### 2. ARCHITECTURAL PATTERN VERIFICATION

**Mermaid Diagrams** - Check if these critical workflows are documented:
1. Client-Trainer Assignment Flow (admin assigns → trainer accesses → client views)
2. AI Chat Permissions Flow (role check → data filter → context build → AI response)
3. Workout Logging Flow (trainer logs → database update → client progress update)
4. Gamification Point Economy (action triggers → XP calculation → level/badge unlock)
5. Master Prompt System (onboarding → Twilio SMS → photo analysis → AI insights)

**Flowcharts** - Verify decision trees exist for:
1. Permission checks (admin vs trainer vs client access)
2. Photo quality gates (blur detection → lighting check → auto-retake)
3. Workout session validation (form validation → safety checks → database save)
4. Error handling patterns (API failures → retry logic → fallback UI)

**Data Flow Diagrams** - Confirm documentation for:
1. User registration → role assignment → onboarding flow
2. Package purchase → Stripe payment → session allocation
3. Real-time data sync (frontend ↔ backend via WebSocket)

**Action**: For EACH missing diagram, flag as **🔴 CRITICAL GAP** and note location in documentation where it should exist.

### 3. TECHNICAL DEBT ASSESSMENT

**Search for TODO/FIXME comments** in these high-risk areas:
- `frontend/src/components/ui-kit/background/WebGLBackground.tsx` (LivingConstellation)
- `frontend/src/components/Header/*` (Notification components)
- `frontend/src/components/DashBoard/Pages/admin-dashboard/*` (Admin sections)
- `frontend/src/components/AdvancedGamification/*` (Gamification components)
- `backend/routes/clientTrainerAssignmentRoutes.mjs` (Client-trainer API)
- `backend/controllers/*` (All controller implementations)

**Categorize by priority**:
- 🔴 **P0 (Blocking MVP)**: Must fix before production
- 🟡 **P1 (Post-MVP)**: Fix after launch
- 🟢 **P2 (Future)**: Nice-to-have improvements

### 4. API ENDPOINT HEALTH CHECK

**Test critical endpoints** (manual or automated):
1. `POST /api/auth/login` - User authentication
2. `GET /api/client-trainer-assignments` - List assignments
3. `POST /api/client-trainer-assignments` - Create assignment (admin only)
4. `GET /api/workout/sessions` - List workout sessions (filtered by role)
5. `POST /api/workout/sessions` - Create workout session (trainer/admin)
6. `GET /api/v1/gamification/*` - Gamification endpoints
7. `POST /api/v2/payments/create-checkout-session` - Stripe checkout

**For each endpoint**:
- ✅ Returns expected HTTP status code
- ✅ Response schema matches documentation
- ✅ Permission checks work (admin vs trainer vs client)
- ✅ Error handling returns proper error messages

**Action**: Flag any endpoint that fails with **🔴 BROKEN** and note error details.

### 5. DATABASE SCHEMA VALIDATION

**Verify critical models exist and match documentation**:
- `User` (role, masterPromptJson, gamification fields)
- `ClientTrainerAssignment` (clientId, trainerId, assignedBy, status)
- `WorkoutSession` (userId, experiencePoints, totalWeight, avgRPE)
- `ChatSession`, `ChatMessage` (for AI chat system - expected in Phase 2)
- Gamification models (`Achievement`, `Challenge`, `PointTransaction`)

**Check for**:
- Missing indexes (performance risk)
- Missing foreign key constraints (data integrity risk)
- JSONB fields without schema validation (data corruption risk)

### 6. FRONTEND-BACKEND INTEGRATION GAPS

**Identify disconnects** where frontend expects data but backend doesn't provide:
- Component calls API endpoint that doesn't exist
- API returns different schema than frontend expects
- Missing error handling for API failures
- Real-time features (WebSocket) not connected

**Action**: List ALL integration gaps with file paths.

### 7. SECURITY AUDIT (QUICK SCAN)

**Check for common vulnerabilities**:
- SQL injection risks (raw queries, unparameterized)
- XSS risks (user input not sanitized before rendering)
- CSRF protection (session cookies without CSRF tokens)
- Authentication bypass (routes missing `protect` middleware)
- Data leaks (trainer accessing non-assigned client data)

**Action**: Flag any security issues as **🔴 CRITICAL**.

### 8. PERFORMANCE BOTTLENECKS

**Identify potential performance issues**:
- Database queries without pagination (N+1 queries)
- Large bundle sizes (MUI still in use?)
- WebGL rendering issues (LivingConstellation)
- Missing API response caching
- Inefficient React re-renders (missing React.memo, useMemo)

---

## DELIVERABLE FORMAT

### SECTION 1: EXECUTIVE SUMMARY (1-2 paragraphs)
- Overall project health (🟢 Healthy / 🟡 Needs Attention / 🔴 Critical Issues)
- MVP readiness percentage (0-100%)
- Top 3 blocking issues
- Top 3 quick wins

### SECTION 2: FEATURE STATUS MATRIX
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| User Authentication | ✅ Working | P0 | Production-ready |
| Client-Trainer Assignment | ⚠️ Partial | P0 | API needs testing |
| AI Chat System | ❌ Broken | P1 | Not implemented |
| ... | ... | ... | ... |

### SECTION 3: ARCHITECTURAL GAPS
List missing mermaid diagrams and flowcharts:
1. 🔴 **Client-Trainer Assignment Flow** - Missing from `docs/ai-workflow/personal-training/`
2. 🔴 **AI Chat Permissions Flow** - Missing from `docs/ai-workflow/AI-CHAT-SYSTEM.md`
3. ...

### SECTION 4: TECHNICAL DEBT REPORT
List all TODO/FIXME comments by priority:
- 🔴 **P0 (Blocking MVP)**: [file:line] - Description
- 🟡 **P1 (Post-MVP)**: [file:line] - Description
- 🟢 **P2 (Future)**: [file:line] - Description

### SECTION 5: API HEALTH REPORT
| Endpoint | Status | HTTP Code | Error Details |
|----------|--------|-----------|---------------|
| POST /api/auth/login | ✅ Working | 200 | - |
| GET /api/client-trainer-assignments | 🔴 BROKEN | 500 | Controller not implemented |
| ... | ... | ... | ... |

### SECTION 6: SECURITY ISSUES
List critical security vulnerabilities:
1. 🔴 **SQL Injection** - `backend/controllers/workoutController.mjs:42` - Raw query with user input
2. 🔴 **Data Leak** - `/api/workout/sessions` returns all users' data without role filter
3. ...

### SECTION 7: PERFORMANCE RECOMMENDATIONS
List top 5 performance improvements:
1. Add pagination to `/api/workout/sessions` (currently fetches all)
2. Implement React.memo in `WorkoutSessionCard.tsx` (re-renders on every keystroke)
3. ...

### SECTION 8: ACTION ITEMS (PRIORITIZED)
**This Week** (P0):
1. [ ] Fix ClientTrainerAssignment API controller
2. [ ] Test workout logging end-to-end
3. [ ] Create Client-Trainer Assignment Flow mermaid diagram

**Next 2 Weeks** (P1):
1. [ ] Implement AI Chat permissions middleware
2. [ ] Add pagination to workout sessions API
3. [ ] Complete Admin Dashboard TODOs

**Future** (P2):
1. [ ] Eliminate MUI from codebase
2. [ ] Build social feed
3. [ ] Implement Master Prompt System

---

## END OF PROMPT

```

---

## 🎯 USAGE INSTRUCTIONS

### How to Use This Prompt:

1. **Copy the entire PROMPT TEMPLATE section** (from "I need a comprehensive status check..." to "END OF PROMPT")
2. **Paste into any AI** (Claude Code, ChatGPT, Gemini, MinMax, Roo Code)
3. **AI will auto-analyze** the SwanStudios codebase and generate the report
4. **Review the report** and prioritize action items
5. **Update documentation** with missing mermaid diagrams/flowcharts

### Recommended Frequency:
- **Weekly**: During active development (Phases 0-2)
- **Bi-weekly**: During maintenance (Phases 3-4)
- **Monthly**: After production launch

### Integration with AI Village:
- **Claude Code**: Run full analysis (best for comprehensive reports)
- **Roo Code**: Quick health checks (faster, economical)
- **Gemini**: Database schema validation + pattern analysis
- **MinMax v2**: UX/frontend integration gap analysis
- **ChatGPT-5**: Security audit + performance recommendations

---

## 📊 EXAMPLE OUTPUT (ABBREVIATED)

```
# SWANSTUDIOS PROJECT STATUS REPORT
**Date**: 2025-11-06
**Analyst**: Claude Code
**Health**: 🟡 Needs Attention (75% MVP Ready)

## EXECUTIVE SUMMARY
The project has a solid foundation with most core features implemented. Key gaps: AI chat system (not started), ClientTrainerAssignment API needs verification, and LivingConstellation WebGL rendering broken (using static fallback). MVP can ship in 2-4 weeks with Phase 0 + Phase 1 completion.

**Top 3 Blocking Issues**:
1. 🔴 ClientTrainerAssignment API controller implementation unknown
2. 🔴 Workout logging end-to-end testing incomplete
3. 🔴 AI Chat permissions system not implemented (defer to Phase 2)

**Top 3 Quick Wins**:
1. ✅ Accept LivingConstellation static fallback (1 hour - update docs)
2. ✅ Remove or fix Notifications API 503 errors (1 day)
3. ✅ Complete Admin Dashboard TODOs (2-3 days)

## FEATURE STATUS MATRIX
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| User Authentication | ✅ Working | P0 | JWT + RBAC production-ready |
| Client-Trainer Assignment | ⚠️ Partial | P0 | Database ready, API needs testing |
| Workout Session Logging | ⚠️ Partial | P0 | Backend API exists, E2E test needed |
| AI Chat System | ❌ Not Started | P1 | Phase 2 feature |
| Master Prompt System | ❌ Not Started | P2 | Phase 4 feature |
| LivingConstellation | 🔴 Broken | P1 | WebGL broken, using static fallback |

## ARCHITECTURAL GAPS
1. 🔴 **Client-Trainer Assignment Flow** - Missing mermaid diagram in `docs/ai-workflow/personal-training/`
2. 🔴 **AI Chat Permissions Flow** - Missing flowchart in `docs/ai-workflow/AI-CHAT-SYSTEM.md`
3. 🟡 **Gamification Point Economy** - Documented but not visualized with mermaid

## TECHNICAL DEBT REPORT
**P0 (Blocking MVP)**:
- 🔴 `backend/routes/clientTrainerAssignmentRoutes.mjs` - Controller implementation status unknown

**P1 (Post-MVP)**:
- 🟡 `frontend/src/components/ui-kit/background/WebGLBackground.tsx:42` - TODO: Fix WebGL rendering
- 🟡 `frontend/src/components/Header/ActionIcons.tsx:15` - FIXME: Notification count incorrect

**P2 (Future)**:
- 🟢 `frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx:78` - TODO: Add keyboard shortcuts

## API HEALTH REPORT
| Endpoint | Status | HTTP Code | Error Details |
|----------|--------|-----------|---------------|
| POST /api/auth/login | ✅ Working | 200 | - |
| GET /api/client-trainer-assignments | ⚠️ Unknown | - | Needs manual testing |
| POST /api/workout/sessions | ✅ Working | 201 | - |
| GET /api/notifications | 🔴 BROKEN | 503 | Service unavailable |

## SECURITY ISSUES
1. 🟡 **Permission Check Missing** - `/api/workout/sessions` should filter by ClientTrainerAssignment for trainers
2. 🟢 **Rate Limiting** - Consider adding to `/api/ai-chat/message` (Phase 2)

## PERFORMANCE RECOMMENDATIONS
1. Add pagination to `/api/workout/sessions` (currently fetches all sessions)
2. Implement React.memo in workout logging components
3. Consider lazy loading admin dashboard sections

## ACTION ITEMS
**This Week**:
1. [ ] Test ClientTrainerAssignment API endpoints
2. [ ] Create Client-Trainer Assignment Flow mermaid diagram
3. [ ] Accept LivingConstellation static fallback (update docs)

**Next 2 Weeks**:
1. [ ] Build session scheduling UI
2. [ ] Complete progress tracking dashboard
3. [ ] Fix or remove Notifications API

**Future**:
1. [ ] Implement AI Chat system (Phase 2)
2. [ ] Build Master Prompt System (Phase 4)
```

---

## 🔄 CONTINUOUS IMPROVEMENT

### After Each Status Check:
1. **Update this prompt** if new critical areas emerge
2. **Add new mermaid diagram types** as system evolves
3. **Refine priority categories** based on real-world impact

### Integration with Git Workflow:
```bash
# Run status check before major commits
git add .
# Paste prompt into Claude Code
# Review report, fix P0 issues
# Then commit with detailed message referencing status report
git commit -m "fix: Complete ClientTrainerAssignment API controller

Status check revealed missing controller implementation.
Added GET/POST/PUT/DELETE endpoints with permission checks.

Fixes: #42 (P0 blocking issue from 2025-11-06 status report)
"
```

---

## 📝 MAINTENANCE NOTES

**Last Updated**: 2025-11-06 (Initial creation)
**Version**: 1.0
**Next Review**: After Phase 0 completion (Week 2)

**Document Owner**: Sean (<OPERATOR>)
**AI Village Contact**: Claude Code (Status Checker Specialist)

---

**End of Reusable Prompt Documentation**
