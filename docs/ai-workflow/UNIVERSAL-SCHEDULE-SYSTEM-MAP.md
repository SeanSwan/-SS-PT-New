# Universal Master Schedule - System Map

> **Last Updated:** 2026-02-10
> **Status:** Living Document
> **Audience:** Any AI session or developer working on the scheduling system

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [Custom Hooks (23)](#custom-hooks)
4. [Services](#services)
5. [Redux State](#redux-state)
6. [Backend API Endpoints](#backend-api-endpoints)
7. [Backend Models](#backend-models)
8. [Auth / RBAC](#auth--rbac)
9. [Role Capability Matrix](#role-capability-matrix)
10. [Data Flow](#data-flow)
11. [Design Tokens](#design-tokens)
12. [Known Architecture Issues](#known-architecture-issues)

---

## Architecture Overview

The Universal Master Schedule (UMS) is a **role-aware scheduling system** shared across Admin, Trainer, and Client roles. A single component tree handles all three personas, with role-based gating applied at both the frontend (UI visibility) and backend (RBAC middleware) layers.

### Route Structure

```
Standalone route:
  /schedule --> EmergencyAdminScheduleIntegration (fallback wrapper)
             --> UniversalSchedule (auth wrapper, resolves role from AuthContext)
             --> UniversalMasterSchedule (838 lines, main component)

Dashboard tab integrations:
  /dashboard          --> AdminScheduleTab   --> UniversalSchedule mode="admin"
  /client-dashboard   --> ClientScheduleTab  --> UniversalSchedule mode="client"
  /trainer-dashboard  --> TrainerScheduleTab --> UniversalSchedule mode="trainer"
```

`UniversalSchedule` reads the authenticated user's role from `AuthContext` and passes the resolved `mode` and `userId` down to `UniversalMasterSchedule`. Each dashboard embeds the same component with an explicit mode override so the schedule renders in the correct persona context.

---

## Component Hierarchy

```
UniversalMasterSchedule (838 lines) .............. Main orchestrator
|
+-- ScheduleHeader (474 lines)
|     Date navigation, view selector, toolbar buttons,
|     admin scope toggle (Global / My), layout & density controls
|
+-- ScheduleStats (156 lines)
|     Session metrics, credit display
|
+-- ScheduleCalendar (566 lines) ................. Routes to active view, manages drag-drop context
|   |
|   +-- MonthView (358 lines) .................... Month grid, session indicators, click-to-drill-down
|   +-- DayView (534 lines) ...................... Hourly slots, trainer columns, drag-drop, buffer zones
|   +-- DayViewStacked (535 lines) ............... Vertical trainer sections (MindBody-style layout)
|   +-- AgendaView (335 lines) ................... Chronological list
|   +-- ViewSelector (339 lines) ................. View switching control
|
+-- ScheduleModals (756 lines) ................... Orchestrates 13 dialog types
|   |
|   +-- SessionFormDialog (858 lines) ............ Create / edit session
|   +-- RecurringSessionModal .................... Create recurring series
|   +-- BlockedTimeModal ......................... Block trainer availability
|   +-- SessionDetailModal (1928 lines) .......... View / edit session details
|   +-- RecurringSeriesModal ..................... Manage recurring series
|   +-- ClientRecurringBookingModal .............. Client books multiple slots
|   +-- AvailabilityEditor (223 lines) ........... Set trainer availability windows
|   +-- AvailabilityOverrideModal ................ Override availability constraints
|   +-- ApplyPaymentModal ....................... Apply session credits to sessions
|   +-- ConflictPanel ........................... Scheduling conflict resolution
|   +-- NotificationPreferencesModal ............ Alert settings
|   +-- BulkActionsConfirmationDialog ........... Confirm bulk operations
|
+-- SessionTypeManager ........................... Session type CRUD (admin only)
```

---

## Custom Hooks

The schedule system relies on **23 custom hooks**. Below they are grouped by concern.

### Data Fetching & State

| Hook | Lines | Purpose |
|------|-------|---------|
| `useCalendarData` | 650+ | Fetches sessions, trainers, clients; manages real-time refresh |
| `useSchedule` | -- | Redux-backed view/date state (thin wrapper around `scheduleSlice`) |
| `useCalendarState` | 334 | Local calendar UI state (selected cell, open modals, etc.) |
| `useFilteredCalendarEvents` | 217 | Applies filters to the fetched event list |

### Interaction & Handlers

| Hook | Lines | Purpose |
|------|-------|---------|
| `useCalendarHandlers` | 648 | Event handlers for calendar interactions (click, drag, drop, resize) |
| `useKeyboardShortcuts` | 73 | Keyboard shortcuts (arrow keys, Enter, Escape, etc.) |
| `useMicroInteractions` | 544 | Animation feedback on user actions |

### Session Management

| Hook | Lines | Purpose |
|------|-------|---------|
| `useSessionCredits` | 40 | Client session credit balance tracking |
| `useSessionTemplates` | 85 | Template CRUD for reusable session configurations |
| `useSessionTypes` | 138 | Session type management (admin) |
| `useClientProgress` | 59 | Client progress tracking and display |

### Layout & Responsive

| Hook | Lines | Purpose |
|------|-------|---------|
| `useResponsiveLayout` | 79 | Mobile detection, suggested layout mode and density |
| `useMobileCalendarOptimization` | 543 | Mobile-specific performance optimizations |

### Real-Time & Collaboration

| Hook | Lines | Purpose |
|------|-------|---------|
| `useRealTimeUpdates` | 708 | WebSocket subscriptions for live session changes |
| `useCollaborativeScheduling` | 911 | Multi-user scheduling coordination (locks, presence) |
| `useAdminNotifications` | 607 | Admin notification stream |

### Operations & Analytics

| Hook | Lines | Purpose |
|------|-------|---------|
| `useBulkOperations` | 497 | Bulk session operations (update, assign, delete) |
| `useBusinessIntelligence` | 522 | Analytics calculations for schedule insights |

---

## Services

### `universal-master-schedule-service.ts` (3000+ lines)

The primary API client for the schedule system. Provides typed methods for every endpoint the frontend consumes: session CRUD, booking, availability, bulk operations, statistics, exports, and more.

### `schedule-service.ts` (970 lines)

Legacy / alternative service layer. Some older code paths still reference this service. Over time these call sites should migrate to `universal-master-schedule-service.ts`.

---

## Redux State

The schedule UI state is managed in `scheduleSlice.ts`:

```typescript
{
  schedule: {
    view: 'month' | 'day' | 'week' | 'agenda',
    selectedDate: string,              // ISO 8601
    selectedSessionId: string | null,
    filters: FilterOptions,
    layoutMode: 'columns' | 'stacked',
    density: 'comfortable' | 'compact',
    expandedTrainerIds: (string | number)[]
  }
}
```

- **view** -- Controls which calendar view component is rendered.
- **selectedDate** -- The date the calendar is centered on.
- **layoutMode** -- `columns` renders trainers side-by-side (DayView); `stacked` renders them vertically (DayViewStacked).
- **density** -- Controls row height and spacing.
- **expandedTrainerIds** -- In stacked layout, tracks which trainer sections are expanded.

---

## Backend API Endpoints

The session routes file (`sessionRoutes.mjs`) contains **55+ endpoints** across 5,214 lines. Additional routes exist in supplementary route files.

### Core CRUD

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/sessions` | All (role-filtered) | List sessions |
| `POST` | `/api/sessions` | Admin only | Create session |
| `PUT` | `/api/sessions/:id` | Admin only | Update session |

### Booking

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/sessions/book/:userId` | All auth | Book a session |
| `POST` | `/api/sessions/book-recurring` | All auth | Book recurring sessions |
| `PUT` | `/api/sessions/reschedule/:sessionId` | All auth | Reschedule a session |
| `DELETE` | `/api/sessions/cancel/:sessionId` | All auth | Cancel a session |
| `PATCH` | `/api/sessions/:sessionId/cancel` | All auth | Cancel with metadata |

### Admin Operations

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/sessions/allocate-from-order` | Admin | Allocate sessions from an order |
| `POST` | `/api/sessions/assign-trainer` | Admin | Assign trainer to session |
| `POST` | `/api/sessions/bulk-update` | Admin | Bulk update sessions |
| `POST` | `/api/sessions/bulk-assign-trainer` | Admin | Bulk assign trainer |
| `POST` | `/api/sessions/bulk-delete` | Admin | Bulk delete sessions |
| `PUT` | `/api/sessions/drag-drop/:id` | Admin | Drag-drop reschedule |
| `GET` | `/api/sessions/statistics` | Admin | Aggregate statistics |
| `GET` | `/api/sessions/export` | Admin | Export session data |

### Availability

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/availability/:trainerId` | All auth | Get trainer availability |
| `GET` | `/api/availability/:trainerId/slots` | All auth | Get available booking slots |
| `PUT` | `/api/availability/:trainerId` | Trainer/Admin | Update availability |
| `POST` | `/api/availability/:trainerId/override` | Trainer/Admin | Create availability override |

### Additional Route Files

| File | Purpose |
|------|---------|
| `sessionPackageRoutes.mjs` | Session package management |
| `trainingSessionRoutes.mjs` | Training-specific session operations |
| `sessionDeductionRoutes.mjs` | Session credit deductions |
| `sessionMetricsRoutes.mjs` | Session metrics and analytics |

---

## Backend Models

| Model | Lines | Purpose |
|-------|-------|---------|
| `Session.mjs` | 326 | Main session record (date, time, status, trainer, client, type) |
| `WorkoutSession.mjs` | 231 | Workout tracking data linked to sessions |
| `SessionType.mjs` | 108 | Session type configuration (name, duration, color, price) |
| `SessionPackage.mjs` | 65 | Session packages (bundles of sessions sold together) |
| `TrainerAvailability.mjs` | 111 | Trainer availability windows (day-of-week, start/end times) |

---

## Auth / RBAC

### Middleware (`authMiddleware.mjs`)

| Middleware | Purpose |
|------------|---------|
| `protect` | Verifies JWT, attaches user to request |
| `adminOnly` | Requires `admin` role |
| `trainerOnly` | Requires `trainer` role |
| `clientOnly` | Requires `client` role |
| `trainerOrAdminOnly` | Requires `trainer` or `admin` |
| `authorize(roles)` | Generic role-array check |
| `ownerOrAdminOnly` | Resource owner or admin |
| `checkTrainerClientRelationship` | Verifies trainer-client assignment |

### RBAC Helper (`sessionRbacHelper.mjs`)

| Function | Purpose |
|----------|---------|
| `buildSessionVisibilityFilter()` | Returns Sequelize `where` clause scoped to user role |
| `canViewSession()` | Boolean check: can this user see this session? |
| `canModifySession()` | Boolean check: can this user edit/cancel this session? |
| `sanitizeSessionForRole()` | Strips fields the user's role should not see |

---

## Role Capability Matrix

| Feature | Admin | Trainer | Client |
|---------|:-----:|:-------:|:------:|
| View all sessions | Global / My toggle | Assigned only | Own only |
| Create sessions | Yes | No | No |
| Create recurring series | Yes | No | No |
| Block time | Yes | Yes | No |
| Manage availability | Yes | Yes (own) | No |
| Quick-book slots | No | No | Yes |
| Reschedule | Yes (any) | Yes (assigned) | No |
| Cancel sessions | Yes (any) | No | Yes (own) |
| Override conflicts | Yes | No | No |
| Assign trainers | Yes | No | No |
| Manage session types | Yes | No | No |
| Bulk operations | Yes | No | No |
| View statistics | Yes | Limited | No |
| Drag-drop | Yes | Yes | No |
| Apply payments | Yes | No | No |
| Export data | Yes | No | No |

---

## Data Flow

```
1. Route / Dashboard Tab
   |
   v
2. UniversalSchedule
   - Reads authenticated user from AuthContext
   - Resolves role --> mode ("admin" | "trainer" | "client")
   - Passes mode + userId to UniversalMasterSchedule
   |
   v
3. UniversalMasterSchedule
   - Initializes 23 hooks
   - useCalendarData fires API requests:
       GET /api/sessions?role=...&date=...
       GET /api/availability/...
   |
   v
4. Backend
   - authMiddleware.protect verifies JWT
   - sessionRbacHelper.buildSessionVisibilityFilter() scopes query
   - sessionRbacHelper.sanitizeSessionForRole() strips restricted fields
   - Returns filtered, sanitized payload
   |
   v
5. Frontend receives data
   - useFilteredCalendarEvents applies client-side filters
   - ScheduleCalendar renders the active view (Month / Day / Stacked / Agenda)
   |
   v
6. User Interaction
   - Click / drag / form submit --> handler from useCalendarHandlers
   - Handler calls service method (universal-master-schedule-service.ts)
   - Service POSTs/PUTs to backend
   - Backend validates, applies RBAC, persists
   - Response returns --> refreshData() re-fetches
   - useRealTimeUpdates pushes changes to other connected clients via WebSocket
```

---

## Design Tokens

The schedule currently uses `galaxySwanTheme` tokens directly. It has **not yet** been migrated to the Ethereal Wilderness (EW) design token system.

### Colors in Use

| Token | Hex | Usage |
|-------|-----|-------|
| Background gradient | `linear-gradient(135deg, #0f172a, #1e293b, #334155)` | Schedule container background |
| Text | `#ffffff` (white) | All primary text |
| Available | `#22c55e` | Available session slots |
| Scheduled | `#3b82f6` | Scheduled sessions |
| Confirmed | `#0ea5e9` | Confirmed sessions |
| Completed | `#6c757d` | Completed sessions |
| Cancelled | `#ef4444` | Cancelled sessions |
| Requested | `#f59e0b` | Pending / requested sessions |

### Galaxy-Swan Core Tokens (project-wide)

| Token | Hex |
|-------|-----|
| Galaxy Core | `#0a0a1a` |
| Swan Cyan | `#00FFFF` |
| Cosmic Purple | `#7851A9` |

---

## Known Architecture Issues

1. **galaxySwanTheme colors used directly, not through EW design token system.**
   The schedule bypasses the design token abstraction. When the EW migration happens, every color reference in the schedule tree will need updating.

2. **Some handlers use raw `fetch()` instead of service methods.**
   Specifically, `checkConflicts` and `reschedule` handlers bypass `universal-master-schedule-service.ts` and call the API directly. This skips any centralized error handling, retry logic, or token refresh the service provides.

3. **18 `useState` hooks in the main component.**
   `UniversalMasterSchedule` manages 18 pieces of local state. This high count signals the component is doing too much; further decomposition into sub-components or consolidation into a reducer would improve maintainability.

4. **`SessionDetailModal` is 1,928 lines.**
   This modal handles viewing, editing, status changes, notes, payment application, and more. It is a strong candidate for decomposition into smaller focused sub-components.

5. **`transform: translateZ(0)` on `ScheduleContainer` creates a CSS stacking context.**
   This causes dropdown menus and modals rendered inside the container to be trapped under elements with higher z-index outside the container. The workaround is to add `position: relative; z-index` to the parent, or portal modals/dropdowns to `document.body`.
