# SwanStudios Ultimate Audit Mega Prompt V2

> **AI Village Validated:** 2026-03-24 | 11/11 tracks PASS | Phase 2+3 debates: CONSENSUS
> **V1 Full Detail:** docs/ai-workflow/SWANSTUDIOS-ULTIMATE-AUDIT-MEGA-PROMPT.md (24KB)

## What V2 Adds Over V1

V1 is the 24KB audit blueprint. V2 adds AI Village 11-brain consensus:

1. **Transaction Safety**: All workout saves MUST be ACID with rollback
2. **API Security**: Client routes JWT-only, Admin uses :clientId + validateClientAccess
3. **AI Image Privacy**: Consent modal, EXIF strip, zero-retention, 5/day, medical disclaimer
4. **Theme TypeScript**: Strict theme.ts with as-const colors, no hardcoded hex
5. **Victory Palette**: 5-color + Teal Mist #4ECDC4 (Creative Director approved), Rule of 5
6. **Typography Fallbacks**: Font stacks prevent FOUT
7. **FOUC Prevention**: Inline critical theme CSS in HTML head
8. **Skeleton Loaders**: CrystallineSkeleton, 16:9 ratio, CLS < 0.1
9. **RBAC Matrix**: Explicit endpoint-role mapping, client 403 on AI gen
10. **Performance SLAs**: TTI <2.5s, TBT <300ms, LCP <2.0s, API P95 <200ms

---

## EXECUTION PLAN (Sprints 7-12)

### Completed (Sprints 0-6)
| Sprint | Commit | Scope |
|--------|--------|-------|
| 0 | a779c594 | WorkoutsTab real data |
| 1 | 083db46d | Data pipeline + Victory + design |
| 2 | 6d8e235b | AI context expansion (4 new types) |
| 3 | 09c7b5a1 | Dark theme + badge paths |
| 4 | 6ca3dfb0 | Logger + demo banners + badges |
| 5 | 668b0056 | RBAC + WCAG + stubs |
| 6 | 64c20017 | Theme tokens + motion + ARIA |

### Sprint 7: Core Data Pipeline Completion
**Goal:** Every chart shows real data. No mock data anywhere.
1. Verify/fix all analytics API endpoints return real data
2. Create QA test data: 32 sessions (4/wk x 8 wks), 4-6 exercises each
3. Migrate top 3 Recharts to Victory (ClientAnalytics, ClientProgress, BI)
4. Connect charts to real data in client/trainer dashboards
5. Remove all MOCK_* constants and demo fallbacks
6. Add CrystallineSkeleton loading states
7. AI Village validation

### Sprint 8: AI Assistant Full Integration
**Goal:** SwanStudios Assistant in every tab with context awareness.
1. Embed AITerminalPanel in all remaining dashboard tabs
2. Connect /api/ai/workout-generation for trainer/admin
3. FRONTEND_DISPATCH listeners in logger + nutrition + goals
4. Auto-populate client context (pain, OPT phase, history)
5. Block client generation (403 + UI disabled)
6. AI dictation flow: voice > parse > populate logger
7. Draft approval workflow for AI-generated plans
8. AI Village validation

### Sprint 9: Theme + UI Cinematic Polish
**Goal:** All dashboards premium cinematic dark.
1. Create frontend/src/styles/theme.ts (strict TS theme object)
2. Audit components for hardcoded colors > CSS variables
3. Fix client dashboard dark theme
4. Fix trainer dashboard dark theme
5. FOUC prevention (inline critical CSS)
6. Move Fitness vs SwanStudios logo on client cards
7. Decompose top 3 monoliths (sessions 2848, clients 2403, gallery 1911)
8. AI Village validation

### Sprint 10: Missing Features
**Goal:** Body map, PDF, impersonation, photo upload.
1. Body Map in client dashboard (submit pain for trainer review)
2. Photo upload + AI analysis with consent flow
3. PDF/print workout plans (binder format, org branding)
4. Admin impersonation (view-as) into routing
5. Long-horizon workout plan UI + AI
6. Gamification badge art fix
7. AI Village validation

### Sprint 11: QA + Production Hardening
**Goal:** Zero defects. Production-ready.
1. Remaining Recharts > Victory (13 files)
2. Remaining monolith decomposition (10 files)
3. TODO/FIXME resolution (18+)
4. Console cleanup
5. 7-star docs on modified files
6. Playwright E2E (admin, trainer, client, mobile)
7. Mobile 10 breakpoints
8. WCAG pass
9. Security audit (RBAC, PII, rate limits)
10. FINAL AI Village recursive until ZERO findings

### Sprint 12: Launch
1. Production smoke test (sswanstudios.com)
2. E2E onboarding: create > assessment > orientation > workout > charts
3. Gamification production verify
4. PDF production verify
5. Document V1 limitations
6. GO LIVE

---

## KEY SPECS

### Victory Colors: #50A0F0 #8B5CF6 #4070C0 #4ECDC4 #60C0F0 | PR: #C6A84B
### RBAC: Admin=all, Trainer=assigned, Client=own(JWT), AI gen=admin+trainer
### Errors: Crimson #C92A54 border + Frost White text
### SLAs: TTI<2.5s TBT<300ms LCP<2.0s CLS<0.1 API-P95<200ms
### Monoliths: 13 files, 21,165 lines (P0: sessions 2848, clients 2403)
### Recharts migration: 16 files pending

*AI Village Validated. 11/11 PASS. Sprint 7 cleared.*