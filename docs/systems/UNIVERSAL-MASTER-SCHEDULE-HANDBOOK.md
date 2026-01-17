# Universal Master Schedule System - Complete Handbook

## System Overview
The Universal Master Schedule System unifies scheduling across Admin, Trainer, and Client dashboards. It replaces disparate calendar implementations with a single, robust, mobile-first solution that mirrors industry-standard features (MindBody) while adhering to SwanStudios' Galaxy-Swan design system.

**Core Philosophy:** "One Calendar, Three Views"
- **Admin View:** Full control, all trainers, all clients, override capabilities.
- **Trainer View:** Personal schedule, client management, availability blocks.
- **Client View:** Booking, cancellation, history, credit tracking.

## User Roles & Permissions

### Admin
- **Create Sessions:** Single or recurring (daily, weekly, monthly).
- **Manage Trainers:** Assign/reassign trainers to sessions.
- **View All:** See the entire studio schedule.
- **Credits:** Manually adjust client session credits.
- **Overrides:** Book without credit limits (for special cases).
- **Notifications:** Toggle notifyClient on/off per action (silent booking).

### Trainer
- **View Schedule:** See assigned sessions and client details.
- **Availability:** Block out personal time or vacation.
- **Completion:** Mark sessions as completed/no-show.
- **Notes:** Add private trainer notes and public client feedback.

### Client
- **Book:** View available slots and book (requires credits).
- **Cancel:** Cancel upcoming sessions (enforces 24h policy).
- **History:** View past and upcoming sessions.
- **Credits:** View remaining balance.

## Session Lifecycle

1. **Availability Created:** Admin/Trainer opens a slot or sets recurring availability.
   - Status: `available`
2. **Booking:** Client books a slot.
   - Status: `scheduled`
   - Action: Credit deducted (tentative).
3. **Confirmation:** System/Trainer confirms (optional auto-confirm).
   - Status: `confirmed`
   - Action: Notification sent (if enabled).
4. **Execution:** Session takes place.
5. **Completion:** Trainer marks as complete.
   - Status: `completed`
   - Action: History updated, stats calculated.
6. **Cancellation:**
   - Status: `cancelled`
   - Action: Credit refunded if >24h notice.
7. **Blocked Time:** Admin/Trainer blocks a slot.
   - Status: `blocked`
   - Action: Slot is unavailable for booking.

## Session Credit System

- **Allocation:** Credits added via package purchase (Storefront).
- **Usage:** 1 Credit = 1 Session (standard).
- **Expiration:** Credits tied to package expiration date.
- **Refunds:** Automatic refund for cancellations >24h before start time.

## Notification & Opt-Out Flow

- **Silent Mode:** Admin/Trainer can uncheck notifyClient during booking/cancellation to suppress emails/SMS.
- **Client Preferences:** Clients can opt out of specific notification types (email or SMS) in their profile settings.
- **Urgent Alerts:** Cancellations <24h always trigger notifications unless explicitly overridden by Admin.
- **Storage:** notifyClient is stored per session to preserve the decision at time of action.

## Timezone Policy

- Store all timestamps in UTC.
- Display in the viewer's local timezone.
- Trainer and client timezone differences must be resolved at booking time.

## Database Schema (Key Fields)

**Session Model:**
- `id`: Integer (PK)
- `sessionDate`: Date/Time
- `duration`: Integer (30, 60, 90)
- `status`: Enum (available, scheduled, confirmed, completed, cancelled, blocked)
- `userId`: Integer (FK User - Client)
- `trainerId`: Integer (FK User - Trainer)
- `isRecurring`: Boolean
- `recurringGroupId`: UUID (links recurring sessions)
- `recurrenceRule`: String (RFC 5545)
- `notifyClient`: Boolean (snapshot of preference at creation)
- `isBlocked`: Boolean (blocked time indicator)

## API Endpoints

### Core
- `GET /api/sessions`: Fetch sessions (filtered by role/date).
- `POST /api/sessions`: Create single session.
- `PUT /api/sessions/:id`: Update session details.
- `DELETE /api/sessions/:id`: Cancel/Delete session.

### Actions
- `POST /api/sessions/recurring`: Create a recurring series using recurrenceRule.
- `POST /api/sessions/:id/book`: Client books a slot.
- `POST /api/sessions/:id/complete`: Trainer marks complete.
- `POST /api/sessions/:id/block`: Trainer/Admin blocks time.

## Frontend Components

### `UniversalSchedule.tsx` (New Master Component)
- **Path:** `frontend/src/components/Schedule/UniversalSchedule.tsx`
- **Features:**
  - Responsive Calendar (Day/Week/Month/Agenda).
  - Drag-and-drop rescheduling (Admin/Trainer).
  - Click-to-book (Client).
  - Recurring session modal.
  - Notification toggle (SMS/Email).

### Dashboard Integration
- **Admin:** Imports `UniversalSchedule` with `mode="admin"`.
- **Trainer:** Imports `UniversalSchedule` with `mode="trainer"`.
- **Client:** Imports `UniversalSchedule` with `mode="client"`.

## MindBody Feature Parity Checklist

- [ ] **Recurring Sessions:** Book "Every Monday at 10am for 10 weeks".
- [ ] **Block Out Time:** "Trainer unavailable" slots.
- [ ] **Notification Toggle:** "Send SMS?" checkbox on booking/cancel.
- [ ] **Mobile Optimization:** Full functionality on phone (no desktop required).
- [ ] **Waitlist:** (Phase 2)
- [ ] **Late Cancel Fees:** (Phase 2)
