# Dashboard Acceptance Criteria - Per-Dashboard Checklists

**Created:** 2025-11-08
**Status:** 📋 Phase 0 Documentation
**Owner:** Claude Code (based on AI Village feedback)

---

## 🎯 Purpose

This document defines acceptance criteria for Admin, Trainer, and Client dashboards so all AIs and QA share a single definition of "complete."

**Feedback Addressed:**
- Kilo Code: "Create three tight checklists (one per dashboard) so AIs and QA share a single definition of 'complete.'"
- ChatGPT-5: "What's the QA checklist before deploying these fixes?"

---

## 🔐 ADMIN DASHBOARD ACCEPTANCE CRITERIA

### Critical Functionality (Phase 1 - Must Pass Before Production)

**Page Load & Rendering:**
- [ ] `/dashboard/default` loads without JavaScript errors
- [ ] No `TypeError: we.div is not a function` in console
- [ ] Admin dashboard renders in < 3 seconds (LCP)
- [ ] All navigation items visible in AdminStellarSidebar
- [ ] No 503 errors blocking page load
- [ ] Service worker cache cleared (no stale chunks)

**Client Onboarding Integration:**
- [ ] `/dashboard/client-onboarding` route exists inside admin layout
- [ ] Client Onboarding wizard renders within ExecutivePageContainer
- [ ] Navigation item "Client Onboarding" visible in AdminStellarSidebar
- [ ] NO "Client Onboarding" link in main header navigation
- [ ] NO "Client Onboarding" link in mobile menu
- [ ] Clicking sidebar link navigates to `/dashboard/client-onboarding`

**Authentication & Authorization:**
- [ ] Only users with `role='admin'` can access `/dashboard/default`
- [ ] Non-admin users redirected to `/unauthorized` (403)
- [ ] Unauthenticated users redirected to `/login` (401)
- [ ] JWT token validated on every admin route
- [ ] Expired tokens redirect to `/login?expired=true`

**Theme Consistency (Phase 2 Requirement):**
- [ ] All admin sections use Galaxy-Swan theme (no Executive Command Intelligence)
- [ ] Primary color: #00d9ff (cyan) used consistently
- [ ] Accent color: #ff4081 (pink) used for secondary actions
- [ ] Background: Space900 (#080814) for main background
- [ ] Cards use glass morphism or solid Space800 backgrounds

### Admin Dashboard Routes (Must All Load)

**Core Routes:**
- [ ] `/dashboard/default` - Admin home with overview stats
- [ ] `/dashboard/analytics` - User analytics dashboard
- [ ] `/dashboard/user-management` - All users management
- [ ] `/dashboard/trainers` - Trainer management
- [ ] `/dashboard/trainers/permissions` - Trainer permissions config
- [ ] `/dashboard/client-trainer-assignments` - Assign trainers to clients
- [ ] `/dashboard/client-management` - Client progress view
- [ ] `/dashboard/clients` - Client registry
- [ ] `/dashboard/client-onboarding` - **NEW** - Create new clients
- [ ] `/dashboard/packages` - Package management
- [ ] `/dashboard/admin-sessions` - Session management
- [ ] `/dashboard/content` - Content moderation
- [ ] `/dashboard/revenue` - Revenue analytics
- [ ] `/dashboard/gamification` - Gamification admin
- [ ] `/dashboard/notifications` - Notification management (graceful 503 handling)
- [ ] `/dashboard/mcp-servers` - MCP/AI configuration
- [ ] `/dashboard/settings` - Admin settings

**Missing Routes (Phase 4 - Optional):**
- [ ] `/dashboard/social-media` - Social media management
- [ ] `/dashboard/business-intelligence` - BI suite
- [ ] `/dashboard/performance-reports` - Performance analytics
- [ ] `/dashboard/nasm-compliance` - NASM compliance tracking

### Data Display & Functionality

**Dashboard Home (`/dashboard/default`):**
- [ ] User count metrics visible (total, admin, trainer, client)
- [ ] Recent activity feed loads
- [ ] Quick actions menu functional
- [ ] Charts/graphs render without errors
- [ ] Data updates on page load (not stale cached data)

**Client Onboarding (`/dashboard/client-onboarding`):**
- [ ] 7-step wizard renders (Basic, Goals, Health, Nutrition, Lifestyle, Training, Summary)
- [ ] Form validation works on each step
- [ ] "Next" button advances to next step
- [ ] "Previous" button returns to previous step
- [ ] "Submit" button on final step sends POST to `/api/onboarding`
- [ ] Success modal shows Spirit Name, Client ID, Email, Temp Password
- [ ] Error handling displays validation messages
- [ ] JWT token sent in Authorization header

**Client Registry (`/dashboard/clients`):**
- [ ] All clients displayed in table/grid
- [ ] Search/filter functionality works
- [ ] Clicking client navigates to client detail page
- [ ] Create new client button visible (links to `/dashboard/client-onboarding`)
- [ ] Edit/delete actions require confirmation
- [ ] Data scoped to admin (sees all clients)

### Performance & Accessibility

**Performance:**
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] No layout shifts on page load
- [ ] Lazy loading for heavy sections (Business Intelligence, Social Media)

**Accessibility (WCAG 2.1 AA):**
- [ ] All interactive elements have visible focus states
- [ ] Navigation has `role="navigation"` and `aria-label`
- [ ] Breadcrumbs have `aria-label="Breadcrumb"`
- [ ] Form inputs have associated `<label>` elements
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Color contrast ratio ≥ 3:1 for large text
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces page changes

**Responsive Design:**
- [ ] Mobile (< 480px): Sidebar collapses to hamburger menu
- [ ] Tablet (480-1024px): Reduced padding, stacked layout
- [ ] Desktop (1024px+): Full sidebar visible
- [ ] Wide (1280px+): Optimal spacing and layout
- [ ] No horizontal scrolling on any viewport

### Security & Error Handling

**Security:**
- [ ] PII lock overlay prevents unauthorized data exposure
- [ ] RBAC enforced: Admin can CRUD all resources
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (sanitized inputs)
- [ ] CSRF tokens on form submissions

**Error Handling:**
- [ ] 503 on `/api/notifications` shows non-blocking banner (not crash)
- [ ] Network errors display user-friendly messages
- [ ] Failed API calls don't break page rendering
- [ ] 404 routes redirect to custom NotFound page
- [ ] 500 errors captured and logged (Sentry/logging service)

---

## 👨‍🏫 TRAINER DASHBOARD ACCEPTANCE CRITERIA

### Critical Functionality

**Page Load & Rendering:**
- [ ] `/trainer-dashboard` loads without JavaScript errors
- [ ] Trainer dashboard renders in < 3 seconds
- [ ] Navigation visible (My Clients, Schedule, Sessions, Progress)
- [ ] Theme consistent with Galaxy-Swan protocol

**Authentication & Authorization:**
- [ ] Only users with `role='trainer'` can access
- [ ] Non-trainer users redirected to `/unauthorized` (403)
- [ ] Unauthenticated users redirected to `/login`
- [ ] JWT token validated on every route

### Trainer Dashboard Routes

**Core Routes:**
- [ ] `/trainer-dashboard` - Trainer home (today's schedule, quick stats)
- [ ] `/trainer-dashboard/my-clients` - List of assigned clients only
- [ ] `/trainer-dashboard/schedule` - Personal schedule (CRUD own sessions)
- [ ] `/trainer-dashboard/sessions` - Session logging (create own sessions)
- [ ] `/trainer-dashboard/progress` - Client progress tracking (assigned clients only)

### Data Scoping

**Client Access:**
- [ ] Trainer sees ONLY assigned clients (not all clients)
- [ ] Clicking client shows detail page (read-only)
- [ ] Cannot edit client profiles (admin-only)
- [ ] Cannot delete clients (admin-only)

**Session Access:**
- [ ] Trainer can create sessions for assigned clients
- [ ] Trainer can edit own sessions
- [ ] Trainer can view own sessions + assigned client sessions
- [ ] Cannot view other trainers' sessions

**Schedule Access:**
- [ ] Trainer can CRUD own schedule events
- [ ] Cannot view other trainers' schedules
- [ ] Cannot modify client schedules directly

### Performance & Accessibility

**Performance:**
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

**Accessibility (WCAG 2.1 AA):**
- [ ] Focus states visible
- [ ] ARIA labels on navigation
- [ ] Keyboard navigation works
- [ ] Color contrast ≥ 4.5:1

**Responsive Design:**
- [ ] Mobile: Stacked layout, hamburger menu
- [ ] Tablet: Reduced spacing
- [ ] Desktop: Full layout

### Security

**Data Scoping:**
- [ ] Backend validates trainer can only access assigned clients
- [ ] No PII exposure for unassigned clients
- [ ] Trainer cannot elevate role to admin

---

## 💪 CLIENT DASHBOARD ACCEPTANCE CRITERIA

### Critical Functionality

**Page Load & Rendering:**
- [ ] `/client-dashboard` loads without JavaScript errors
- [ ] Client dashboard renders in < 3 seconds
- [ ] Navigation visible (Today, Progress, Workouts, Gamification, Nutrition)
- [ ] Theme consistent with Galaxy-Swan protocol

**Authentication & Authorization:**
- [ ] Only users with `role='client'` can access
- [ ] Non-client users redirected to `/unauthorized` (403)
- [ ] Unauthenticated users redirected to `/login`
- [ ] JWT token validated on every route

### Client Dashboard Routes

**Core Routes:**
- [ ] `/client-dashboard` - Client home (today's workout, quick stats)
- [ ] `/client-dashboard/today` - Today's workout (specific workout plan)
- [ ] `/client-dashboard/progress` - Progress charts (weight, measurements, photos)
- [ ] `/client-dashboard/gamification` - Gamification hub (quests, achievements, constellation)
- [ ] `/client-dashboard/workouts` - Workout history (past workouts)
- [ ] `/client-dashboard/nutrition` - Meal plans (nutrition guidance)

### Data Scoping

**Self-Only Access:**
- [ ] Client sees ONLY own data (not other clients)
- [ ] Cannot view other clients' profiles
- [ ] Cannot view other clients' workouts
- [ ] Cannot modify other clients' data

**Trainer Visibility:**
- [ ] Client can view assigned trainer's name/photo (read-only)
- [ ] Cannot message trainer directly (unless feature exists)
- [ ] Cannot see trainer's schedule

### Gamification Integration

**Constellation System:**
- [ ] Client's constellation renders on dashboard
- [ ] Quest progress visible (active quests, completed quests)
- [ ] Achievements displayed (badges, milestones)
- [ ] Points/XP visible
- [ ] Level progression shown

**Quest Flow:**
- [ ] Active quests listed with progress bars
- [ ] Completing quest triggers celebration animation
- [ ] New quests suggested based on goals

### Performance & Accessibility

**Performance:**
- [ ] LCP < 2.5s (critical for client engagement)
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Images lazy-loaded (progress photos)
- [ ] Charts render smoothly (no janky animations)

**Accessibility (WCAG 2.1 AA):**
- [ ] Focus states visible
- [ ] ARIA labels on navigation
- [ ] Keyboard navigation works
- [ ] Color contrast ≥ 4.5:1
- [ ] Alt text on progress photos

**Responsive Design:**
- [ ] Mobile: Optimized for on-the-go access (gym use)
- [ ] Tablet: Comfortable reading size
- [ ] Desktop: Full layout with charts

### Security

**Data Privacy:**
- [ ] Backend validates client can only access own data
- [ ] No PII exposure for other clients
- [ ] Client cannot elevate role
- [ ] Progress photos stored securely (not publicly accessible URLs)

---

## ✅ CROSS-DASHBOARD ACCEPTANCE CRITERIA

### Common Requirements (All Dashboards)

**Authentication:**
- [ ] JWT token required for all dashboard routes
- [ ] Token expiration handled gracefully (redirect to login)
- [ ] Refresh token mechanism works (if implemented)

**Navigation:**
- [ ] DashboardSelector component shows correct role-based options
- [ ] Admin sees: Admin Dashboard, Trainer Dashboard (observer), Client Dashboard (observer)
- [ ] Trainer sees: Trainer Dashboard, Client Dashboard (observer)
- [ ] Client sees: Client Dashboard only
- [ ] Clicking role switches to that dashboard (if allowed)

**Theme Consistency:**
- [ ] All dashboards use Galaxy-Swan Design Protocol v1.1
- [ ] Primary color: #00d9ff (cyan)
- [ ] Accent color: #ff4081 (pink)
- [ ] Background: Space900 (#080814)
- [ ] Typography: System fonts, 0.95rem base

**Error Handling:**
- [ ] Network errors show toast notifications
- [ ] API failures don't crash the page
- [ ] Graceful degradation for missing features
- [ ] 404 routes show custom NotFound page
- [ ] 500 errors logged and user-friendly message shown

**Performance:**
- [ ] < 3s load time for all dashboards
- [ ] Lazy loading for heavy components
- [ ] Service worker caching for static assets
- [ ] No memory leaks (React components unmount properly)

**Accessibility:**
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast requirements met
- [ ] Prefers-reduced-motion respected

**Responsive Design:**
- [ ] Mobile: < 480px optimized
- [ ] Tablet: 480-1024px optimized
- [ ] Desktop: 1024px+ optimized
- [ ] No horizontal scrolling

---

## 🧪 TESTING PROTOCOL

### Manual Testing Checklist

**Before Every Deployment:**
1. [ ] Test each dashboard as the correct role (admin, trainer, client)
2. [ ] Test unauthorized access (wrong role, not logged in)
3. [ ] Test all routes load without errors
4. [ ] Test navigation (sidebar, breadcrumbs, DashboardSelector)
5. [ ] Test form submissions (Client Onboarding, Session logging)
6. [ ] Test on mobile, tablet, desktop viewports
7. [ ] Test in Chrome, Firefox, Safari, Edge
8. [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
9. [ ] Test keyboard navigation (Tab, Enter, Escape)
10. [ ] Test service worker cache clearing (hard refresh)

### Automated Testing (Phase 4)

**Unit Tests:**
- [ ] Dashboard component renders
- [ ] Navigation component shows correct links by role
- [ ] Form validation works
- [ ] API calls mock correctly

**Integration Tests:**
- [ ] Login → Dashboard flow works
- [ ] Dashboard → Route navigation works
- [ ] Form submission → API → Success modal flow works
- [ ] Role-based route guarding works

**E2E Tests (Playwright/Cypress):**
- [ ] Admin full workflow (login, navigate, create client, logout)
- [ ] Trainer full workflow (login, view clients, log session, logout)
- [ ] Client full workflow (login, view workout, check progress, logout)
- [ ] Unauthorized access scenarios

---

## 📊 SIGN-OFF CHECKLIST

### Phase 1: Critical Fixes
**Before Deployment:**
- [ ] Kilo Code: QA approval
- [ ] Claude Code: Technical implementation complete
- [ ] User: Manual testing passed

**Deployment:**
- [ ] GitHub push successful
- [ ] Render deployment successful
- [ ] Production smoke test passed (login, navigate, no errors)
- [ ] emergencyCacheClear() run in production

### Phase 2: Theme Unification
**Before Deployment:**
- [ ] MinMax v2: Visual design approval
- [ ] Kilo Code: QA approval
- [ ] Claude Code: Implementation complete

**Deployment:**
- [ ] No visual regressions
- [ ] Theme consistent across all dashboards
- [ ] Accessibility maintained

### Phase 3: Documentation
**Before Completion:**
- [ ] All AIs: Documentation review complete
- [ ] Trainer Dashboard documented
- [ ] Client Dashboard documented
- [ ] Component docs created (7-template standard)

### Phase 4: Feature Gaps
**Before Deployment:**
- [ ] ChatGPT-5: Feature completeness approval
- [ ] Kilo Code: QA approval
- [ ] All missing features implemented
- [ ] User acceptance testing passed

---

**Status:** 📋 ACCEPTANCE CRITERIA COMPLETE
**Next Action:** Use as QA checklist for each phase
**Owner:** All AIs + QA Team
