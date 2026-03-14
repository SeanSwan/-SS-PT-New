# SwanStudios Full-Site Notification Integration & Enhancement Master Prompt

> **Goal:** Build a comprehensive notification API that seamlessly connects every component across the entire SwanStudios platform, while simultaneously enhancing and upgrading every page and tab — with zero breaking changes.

---

## 1. VISION

Every user action that matters should produce a notification. Every notification should reach the right person through the right channel (in-app bell, real-time Socket.IO push, optional email/SMS). The notification bell in the header must be the single source of truth for all unread notifications across every dashboard role (admin, trainer, client).

This is NOT just a notification project — it's a full site upgrade. Every page Playwright visits will be audited for enhancement opportunities (UX, performance, accessibility, design consistency with Crystalline Swan theme) and upgraded alongside the notification integration.

---

## 2. EXISTING NOTIFICATION INFRASTRUCTURE

### Backend (Already Built)
| Component | File | Status |
|-----------|------|--------|
| Notification model | `backend/models/Notification.mjs` | EXISTS — has type, message, userId, read, metadata fields |
| NotificationSettings model | `backend/models/NotificationSettings.mjs` | EXISTS — per-user preferences (email, SMS, push toggles) |
| AdminNotification model | `backend/models/AdminNotification.mjs` | EXISTS — admin-specific notifications |
| EnhancedNotification model | `backend/models/EnhancedNotification.mjs` | EXISTS — extended notification with priority, category |
| Notification controller | `backend/controllers/notificationController.mjs` | EXISTS — CRUD: getAll, markAsRead, markAllAsRead, delete, create, createAdmin |
| Notification service | `backend/services/notificationService.mjs` | EXISTS — SendGrid email, Twilio SMS, Socket.IO real-time delivery |
| Notification routes | `backend/routes/notificationRoutes.mjs` | EXISTS — GET /, GET /count, PUT /:id/read, PUT /read-all, DELETE /:id |
| Admin notification routes | `backend/routes/adminNotificationsRoutes.mjs` | EXISTS — admin-specific endpoints |
| Socket.IO server | `backend/socket.mjs` | EXISTS — JWT auth, room-based delivery (admin/trainer/client rooms), online status |

### Frontend (Already Built)
| Component | File | Status |
|-----------|------|--------|
| NotificationSection | `frontend/src/components/Notifications/NotificationSection.tsx` | EXISTS — notification list UI |
| NotificationList | `frontend/src/components/Notifications/NotificationList.tsx` | EXISTS — list rendering |
| EnhancedNotificationSection | `frontend/src/components/Notifications/EnhancedNotificationSection.tsx` | EXISTS — enhanced UI |
| AdminNotificationCenter | `frontend/src/components/DashBoard/Pages/admin-dashboard/components/AdminNotificationCenter.tsx` | EXISTS — admin notification panel |
| useAdminNotifications hook | `frontend/src/hooks/useAdminNotifications.ts` | EXISTS — admin notification state |

### Existing Notification Types
`orientation`, `system`, `order`, `workout`, `client`, `admin`, `session`, `achievement`, `reward`, `measurement`

### What's MISSING (Gap Analysis Needed)
1. **Header notification bell** — exists visually but shows hardcoded count (was `3`, fixed to `0`). NOT wired to real API.
2. **Real-time Socket.IO integration on frontend** — backend emits events but frontend components don't listen.
3. **Notification triggers** — most backend actions (new order, session booked, friend request, message received, workout completed, etc.) do NOT create notifications.
4. **Cross-role routing** — when a client books a session, both the client AND the trainer should get notified.
5. **Notification preferences UI** — NotificationSettings model exists but no frontend settings page.
6. **Toast notifications** — no real-time toast/popup when a new notification arrives while user is on the site.
7. **Gallery notifications** — new photo uploads, donation received, event created — none trigger notifications.
8. **Social notifications** — friend request received/accepted, post liked, challenge completed — none trigger notifications.
9. **Payment notifications** — Zelle/check/Venmo pending payment submitted, payment confirmed — none trigger notifications.
10. **Immigration tab notifications** — document deadline approaching, IELTS score update — none trigger notifications.

---

## 3. COMPLETE ROUTE INVENTORY (150+ Routes to Audit)

### Public Pages (No Auth)
- `/` — Homepage (hero, programs, testimonials, CTA)
- `/login` — Login with video background
- `/signup` — Signup with video background
- `/about` — About page (hero, content, carousel)
- `/contact` — Contact form
- `/store` — Package store (pricing grid)
- `/checkout` — Multi-payment checkout (Stripe, Zelle, Venmo, Check)
- `/gallery` — SwanStudios Photography public gallery
- `/waiver` — Digital waiver form

### Client Dashboard (`/client-dashboard`)
- Overview tab (welcome, stats, quick actions)
- Schedule tab (upcoming sessions, calendar)
- Workouts tab (workout plans, exercise library)
- Progress tab (measurements, body map, progress photos)
- Messages tab (chat with trainer)
- Account tab (profile, settings, notification preferences)
- Social tab (social hub integration)
- Gamification tab (XP, achievements, challenges)

### User Dashboard (`/user-dashboard`)
- Similar to client dashboard but for non-paying users
- Limited feature set (no workout plans, no trainer messaging)

### Trainer Dashboard (`/trainer-dashboard`)
- Client list and management
- Session scheduling
- Workout builder
- Client progress tracking
- Messages (chat with clients)
- Content studio (exercise library management)

### Admin Dashboard (`/admin-dashboard`)
- **Overview** — KPIs, real-time signup monitoring, visitor intelligence
- **Users Management** — user CRUD, role assignment
- **Scheduling** — master calendar, session management
- **Store & Revenue** — orders, revenue analytics, package management
- **Specials Creator** — promotional pricing
- **Content Studio** — exercise/video library management
- **Messages** — admin messaging center
- **Gallery Management** — photo/event CRUD, donation tracking
- **Gamification** — XP rules, achievement definitions, challenge management
- **System Health** — server metrics, error logs
- **AI Protocols** — AI assistant configuration
- **Payment Settings** — Zelle/Venmo/Check configuration, pending payment confirmation
- **Immigration Tab** — Canada immigration tracker (admin-only)

### Social Hub (`/social`)
- Feed tab — post feed, create post, likes, comments
- Friends tab — friend list, friend requests, search
- Challenges tab — active challenges, leaderboards
- Reels tab — vertical video reels

---

## 4. NOTIFICATION TRIGGERS TO IMPLEMENT

### Client-Facing Notifications
| Trigger | Type | Recipients | Channel |
|---------|------|------------|---------|
| Session booked | `session` | Client + Trainer | Bell + Socket + Email |
| Session cancelled | `session` | Client + Trainer | Bell + Socket + Email |
| Session reminder (1hr before) | `session` | Client | Bell + Socket + Email/SMS |
| Workout plan assigned | `workout` | Client | Bell + Socket |
| Workout completed | `achievement` | Client + Trainer | Bell + Socket |
| New message received | `message` | Recipient | Bell + Socket + Badge |
| Order confirmed | `order` | Client + Admin | Bell + Socket + Email |
| Payment received (offline) | `order` | Client + Admin | Bell + Socket + Email |
| Achievement unlocked | `achievement` | Client | Bell + Socket + Toast |
| Challenge completed | `achievement` | Client | Bell + Socket + Toast |
| XP level up | `reward` | Client | Bell + Socket + Toast |
| New measurement logged | `measurement` | Client + Trainer | Bell + Socket |
| Friend request received | `social` | Recipient | Bell + Socket |
| Friend request accepted | `social` | Requester | Bell + Socket |
| Post liked | `social` | Post author | Bell + Socket |
| Post commented on | `social` | Post author | Bell + Socket |

### Admin/Trainer Notifications
| Trigger | Type | Recipients | Channel |
|---------|------|------------|---------|
| New user signup | `admin` | Admin | Bell + Socket |
| New order placed | `order` | Admin | Bell + Socket + Email |
| Pending payment submitted (Zelle/Check/Venmo) | `order` | Admin | Bell + Socket + Email |
| Client completed onboarding | `client` | Trainer + Admin | Bell + Socket |
| Gallery donation received | `admin` | Admin | Bell + Socket |
| Gallery event created | `admin` | Admin | Bell + Socket |
| System health alert | `system` | Admin | Bell + Socket + Email |
| New contact form submission | `admin` | Admin | Bell + Socket + Email |

---

## 5. IMPLEMENTATION ARCHITECTURE

### Backend Changes
1. **Notification trigger service** — centralized `createAndEmit(type, userId, message, metadata)` function that:
   - Creates DB record via Notification model
   - Emits Socket.IO event to user's room
   - Checks NotificationSettings for email/SMS preferences
   - Queues email/SMS if enabled
2. **Inject triggers** into existing route handlers (orders, sessions, social, gallery, etc.)
3. **Notification count endpoint** — ensure `GET /api/notifications/count` returns accurate unread count
4. **Batch mark-as-read** — support marking multiple notifications read at once

### Frontend Changes
1. **Wire header notification bell** to `GET /api/notifications/count` with polling (30s) + Socket.IO real-time
2. **Create `useNotifications` hook** — manages notification state, Socket.IO subscription, bell count
3. **Toast system** — show real-time toast when Socket.IO pushes a new notification
4. **Notification dropdown/panel** — clicking bell shows recent notifications with mark-as-read
5. **Notification preferences page** — in Account/Settings tab, wire to NotificationSettings model

### Socket.IO Frontend Integration
1. **Create `useSocket` hook** — manages Socket.IO connection lifecycle, auto-reconnect
2. **Subscribe to notification events** in the `useNotifications` hook
3. **Room-based delivery** — on auth, join role-specific room (admin/trainer/client)

---

## 6. FULL SITE ENHANCEMENT SCOPE

Beyond notifications, every page Playwright visits should be audited for:

### UX Enhancements
- Loading states (skeleton loaders vs spinners)
- Error states (error boundaries, retry buttons)
- Empty states (helpful messaging when no data)
- Mobile responsiveness (44px touch targets, proper spacing)
- Scroll behavior (smooth scroll, scroll-to-top on navigation)

### Performance
- Lazy loading for heavy components
- Image optimization (WebP, srcset, lazy loading)
- Bundle splitting per route
- Memoization of expensive computations

### Design Consistency (Crystalline Swan Theme)
- All colors from active palette (no Galaxy-Swan remnants)
- Wing Purple `#8B5CF6` for all interactive glows
- Consistent glassmorphism (backdrop-filter, border, shadow)
- Typography hierarchy (Plus Jakarta Sans, Cormorant Garamond, Fira Code, Sora)

### Accessibility
- ARIA labels on all interactive elements
- Focus management (visible focus rings, focus trapping in modals)
- Color contrast (WCAG AA minimum)
- Screen reader compatibility

---

## 7. DESIGN ARCHITECTURE (From Gemini Gap Analysis)

### Z-Index Scale (Site-Wide)
All new notification components must follow this strict z-index hierarchy:
| Layer | Z-Index | Component |
|-------|---------|-----------|
| Base content | 1 | Dashboard panels, cards |
| Sticky nav | 100 | Header, mobile tab bar |
| Dropdown | 500 | Notification dropdown, user menu |
| Modal backdrop | 900 | Modal overlays |
| Modal | 1000 | Modals, dialogs |
| Toast | 2000 | Toast notifications |
| Tooltip | 3000 | Tooltips, popovers |

### Mobile Safe Areas
- Toasts on mobile must respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- Notification dropdown on mobile: full-width sheet rising from bottom, not desktop-style dropdown
- Swipe-to-dismiss on touch devices for toasts

### Toast Limits & Stacking
- **Maximum 3 toasts visible** at once — oldest auto-dismisses when 4th arrives
- Success toasts: 3s auto-dismiss
- Error toasts: 5s auto-dismiss (or manual dismiss)
- Toasts stack vertically with 8px gap

### Notification Type Visual Hierarchy
| Type | Icon | Accent Color |
|------|------|-------------|
| `session` / `workout` | Dumbbell/Calendar | Ice Wing `#60C0F0` |
| `social` / `achievement` | Trophy/Heart | Wing Purple `#8B5CF6` |
| `admin` / `system` | Shield/Alert | Warning Amber `#F59E0B` |
| `order` | ShoppingBag | Gilded Fern `#C6A84B` |
| `message` | MessageCircle | Arctic Cyan `#50A0F0` |
| `reward` | Star | Gilded Fern `#C6A84B` |

### Bell Animation ("Swan Pulse")
When a new notification arrives via Socket.IO, the header bell gets a subtle physics-based ring animation:
- Scale 1 → 1.1 with ±15° rotation oscillation
- Glow ring expands from bell icon and fades
- Total duration: 600ms with `cubic-bezier(0.4, 0, 0.2, 1)`

### Glassmorphic Notification Dropdown
- Width: `380px` desktop / `calc(100vw - 32px)` mobile
- Max height: `480px` with custom scrollbar (4px width, Wing Purple thumb)
- Background: `rgba(0, 32, 96, 0.85)` with `backdrop-filter: blur(16px)`
- Border: `1px solid rgba(96, 192, 240, 0.15)`
- Border radius: `16px`
- Shadow: `0 24px 48px rgba(0, 0, 0, 0.4)`

### Empty State
When notification tray is empty: low-opacity Swan motif SVG with "You're all caught up" in Fira Code

---

## 8. CONSTRAINTS

- **ZERO breaking changes** — all enhancements are additive
- **No new dependencies** unless absolutely necessary (prefer what's already installed)
- **Crystalline Swan theme** must be preserved
- **Existing Stripe checkout** must not be touched
- **Admin RBAC** must be respected on all new endpoints
- **Mobile-first** — all enhancements must work on 375px+
- **Production site** — changes deploy to sswanstudios.com via Render

---

## 8. EXECUTION ORDER

1. Full Playwright QA of entire site (every route listed above)
2. Run Playwright findings through 9-Brain AI Village
3. AI Village produces enhancement recommendations per page
4. Create phased implementation plan
5. Implement phase by phase (notification core → triggers → frontend → enhancements)
6. Final Playwright QA to verify zero regressions
