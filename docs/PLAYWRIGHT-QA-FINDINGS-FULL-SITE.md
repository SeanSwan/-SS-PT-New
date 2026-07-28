le upload# Full-Site Playwright QA Findings Report

> **Date:** 2026-03-13
> **Tester:** Claude (Playwright MCP)
> **Site:** https://sswanstudios.com
> **Viewport:** 1280x720 (desktop) + 375x812 (mobile)
> **Auth:** SeanSwan (admin role)
> **Screenshots:** `qa-screenshots/smoke-comprehensive/`

---

## Executive Summary

22 pages/viewports audited across public pages, admin dashboard (10 sidebar tabs), client dashboard, and mobile viewports. Found **8 CRITICAL bugs**, **6 HIGH bugs**, and **12 MEDIUM issues**.

---

## CRITICAL Bugs (P0 — Fix Immediately)

### 1. Contact Page — Empty Content
- **URL:** `/contact`
- **Screenshot:** `12-contact-desktop.jpeg`
- **Issue:** Hero section renders ("Let's Connect") but `<main>` element is completely empty. The contact form does not render at all — just a dark void below the hero.
- **Impact:** Users cannot contact the business. Conversion blocker.
- **Likely Cause:** Component lazy-load failure or missing import.

### 2. Waiver Page — Empty Content
- **URL:** `/waiver`
- **Screenshot:** `20-waiver.jpeg`
- **Issue:** Hero renders ("Activity Waiver & Release" with swan lake background) but the waiver form below is invisible. `<main>` element is empty.
- **Impact:** New clients cannot sign waivers before sessions. Legal/liability risk.
- **Likely Cause:** Same root cause as Contact page — component not rendering below hero.

### 3. Client Dashboard — Retired Galaxy-Swan Theme
- **URL:** `/client-dashboard`
- **Screenshot:** `18-client-dashboard.jpeg`
- **Issue:** Entire client dashboard uses the **retired Galaxy-Swan theme** (`#0a0a1a` background, cosmic purple gradients, "Galaxy" in sidebar header, "Galaxy Dashboard v2.0" label at bottom). This violates the active Crystalline Swan palette directive.
- **Impact:** Brand inconsistency. Admin dashboard uses Crystalline Swan but client dashboard looks like a completely different app.
- **Active Theme:** Should use Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0` per CLAUDE.md.

### 4. Analytics Page — Raw Unrounded Float Values
- **URL:** `/dashboard/analytics`
- **Screenshot:** `16-admin-analytics.jpeg`
- **Issue:** All percentage values display raw JavaScript floats:
  - `22.703744974779248%` (Total Users trend)
  - `20.81023746895907%` (Active Today trend)
  - `24.498308457218094%` (New This Week trend)
  - `32.04961352076447%` (Engagement Score trend)
  - Engagement Score shows `7.753933517474638/10`
- **Impact:** Looks extremely unprofessional. Visible to admin on every dashboard visit.
- **Fix:** Apply `toFixed(1)` or `Math.round()` to all percentage/score displays.

### 5. Analytics — Fake "Live User Activity" Data
- **URL:** `/dashboard/analytics`
- **Issue:** "Live User Activity" section shows hardcoded mock users (Alex P., David K., Jessica L., Rachel T.) with fake actions ("Purchased Premium Plan", "Completed HIIT Workout") and fake cities. These are NOT real users.
- **Impact:** Admin sees fake data mixed with real data — destroys trust in analytics.
- **Fix:** Either connect to real visitor tracking data or hide the widget until real data exists.

### 6. System Health — Raw Float Uptime
- **URL:** `/dashboard/home` (Overview tab, System Health widget)
- **Screenshot:** `11-admin-system-health.jpeg` (from prior session)
- **Issue:** Database uptime shows `1.88%` instead of expected ~99.9%. The raw value `99.8688966020258%` was seen in prior QA sessions.
- **Impact:** Admin sees alarming uptime figures that don't reflect reality.

### 7. Notification Bell — Hardcoded / Not Wired
- **URL:** All pages (header)
- **Issue:** Notification bell icon exists in header but shows no count badge on most pages. On admin dashboard it shows but is not wired to real notification API. This is documented in the master prompt as "was `3`, fixed to `0`".
- **Impact:** Core notification UX is non-functional.

### 8. Canada Immigration — 4 API Errors
- **URL:** `/dashboard/immigration`
- **Screenshot:** `17-admin-canada-immigration.jpeg`
- **Console Errors:**
  - `GET /api/immigration/seed` → server error
  - `GET /api/immigration/study-sessions` → server error
  - `GET /api/immigration/tasks` → server error
  - `GET /api/immigration/documents` → server error
- **Visible Error:** "Failed to load study sessions" red banner
- **Impact:** Immigration tracker overview renders but all interactive data (tasks, documents, study sessions) fails to load.

---

## HIGH Bugs (P1 — Fix Before Deploy)

### 9. Dashboard Overview — System Health Shows 1.88% Uptime
- **URL:** `/dashboard/home`
- **Issue:** The System Health widget in the Overview tab shows "Database: 1.88% uptime" which is clearly wrong (server is up and responding).
- **Fix:** The uptime calculation formula is incorrect — likely computing uptime since last deploy instead of actual availability.

### 10. Social Hub — Notifications Button Disabled
- **URL:** `/social`
- **Issue:** The "Notifications" button in the Social Hub sidebar is disabled (grayed out, not clickable).
- **Impact:** Users cannot access social notifications. Breaks the notification integration goal.

### 11. Video Library Hero — "GALAXY FITNESS" Branding
- **URL:** `/video-library`
- **Screenshot:** `19-video-library.jpeg`
- **Issue:** Hero background image shows "GALAXY FITNESS" text branding from the retired Galaxy-Swan theme.
- **Impact:** Brand inconsistency with Crystalline Swan rebrand.

### 12. About Page — "By The Numbers" Counters Show 0
- **URL:** `/about`
- **Issue:** The counter section ("By The Numbers") shows all zeros. Intersection Observer for counter animation doesn't fire in some contexts.
- **Impact:** Missing social proof — years of experience, clients trained, etc. all show 0.

### 13. Checkout Page — Payment Section Empty
- **URL:** `/checkout`
- **Screenshot:** `13-checkout-desktop.jpeg`
- **Issue:** Customer Information and Order Summary render correctly, but the entire payment method area below is empty/dark. No Stripe form, no payment buttons.
- **Impact:** Cannot complete purchases. This may be because the multi-payment system hasn't been built yet, but the existing Stripe form should still render.

### 14. Business Intelligence — 100% Churn Rate
- **URL:** `/dashboard/home` (Overview, Business Intelligence section)
- **Issue:** Shows "Churn Rate: 100.0%" which is alarming but likely a calculation artifact from having only 2 active clients and test accounts.
- **Fix:** Add guard for small sample sizes — if total clients < 5, show "N/A" or "Insufficient data".

---

## MEDIUM Issues (P2 — Fix This Sprint)

### 15. Dark Content Below Heroes
- **URLs:** Homepage, About, Store (full-page screenshots)
- **Issue:** Full-page screenshots show extremely dark/invisible content below hero sections. Content exists but contrast is very low.
- **Impact:** Content below the fold may be invisible to users on low-brightness screens.

### 16. Homepage Title Inconsistency
- **URL:** `/`
- **Issue:** Page title is "SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision" — very long and mentions "AI Precision" which may confuse personal training clients.
- **Recommendation:** Shorten to "SwanStudios | Elite Personal Training — NCEP Certified".

### 17. Connection Status Banner Visible on Every Page Load
- **All Pages**
- **Issue:** "🔄 Connecting to Server / Retrying... (0/1)" banner appears on every page navigation for 2-5 seconds before auth resolves.
- **Impact:** Looks janky — users see a loading/retry state on every navigation.
- **Fix:** Hide the connection banner during initial load, only show on actual failure.

### 18. Admin Sidebar — "!" Badge on Admin Command
- **URL:** `/dashboard/*`
- **Issue:** "Admin Command" in sidebar has a red "!" badge. Purpose unclear — is this a real alert or decorative?
- **Impact:** Alert fatigue if decorative; missed alerts if real.

### 19. Orientation Intake — Shows "0" with No Explanation
- **URL:** `/dashboard/home`
- **Issue:** "Orientation Intake 0" widget with "No pending orientation submissions" — functional but no context about what this means or how to use it.

### 20. Content Studio — Video Shows "Invalid Date"
- **URL:** `/dashboard/content/video-studio`
- **Screenshot:** `15-admin-content-studio.jpeg`
- **Issue:** The one published YouTube video shows "Invalid Date" in the card metadata.
- **Fix:** Parse the date field correctly or show "Date unknown" as fallback.

### 21. Multiple Admin Dashboard Tabs — Similar Content
- **URL:** `/dashboard/home` tabs
- **Issue:** Dashboard has 4 tabs (Overview, Notifications, Pending Approvals, System Snapshot) — the Notifications tab here overlaps with the separate Notifications widget in Overview and the notification bell in header.
- **Recommendation:** Consolidate notification views to avoid confusion.

### 22. Mobile Navigation — No "Login/Signup" Links Visible
- **URL:** `/` (375px viewport)
- **Issue:** Mobile nav shows hamburger menu but the visible header only has bell, cart, lightning bolt, profile pic. "Sign in" button exists but uses a tiny icon — easy to miss.
- **Recommendation:** Make login CTA more prominent on mobile for unauthenticated visitors.

### 23. Store Page — Packages Below Fold
- **URL:** `/store`
- **Issue:** Hero takes up entire viewport. Packages (the actual product listings) are all below the fold.
- **Recommendation:** Add a visual indicator or reduce hero height to show package previews above fold.

### 24. Gamification — All Counters at 0
- **URL:** `/dashboard/gamification`
- **Issue:** Achievement cards show "1 completion" counts but the overall gamification stats (points, streaks) are all 0.
- **Impact:** Gamification system appears unused/untested.

### 25. Upcoming Check-ins — All "0d Overdue"
- **URL:** `/dashboard/home`
- **Issue:** All 4 check-ins (QABot Tester Full Measurement, QABot Tester Weigh-In, Vickie Valdez Full Measurement, Vickie Valdez Weigh-In) show "0d overdue".
- **Impact:** Should be triaged — are these real or from test data?

### 26. Immigration — All Progress at 0%
- **URL:** `/dashboard/immigration`
- **Issue:** All phases show 0%, all category breakdowns show 0/0, all tasks show 0 completed. The API errors (finding #8) prevent any data from loading.
- **Impact:** Immigration tracker is effectively non-functional until API routes are fixed.

---

## Pages Audited (22 Total)

### Desktop (1280x720)
| # | Page | URL | Status |
|---|------|-----|--------|
| 1 | Homepage | `/` | OK (dark below fold) |
| 2 | Store | `/store` | OK (packages below fold) |
| 3 | Login | `/login` | OK (video bg, glassmorphic card) |
| 4 | About | `/about` | OK (counters show 0) |
| 5 | Gallery | `/gallery` | OK (hero + events render) |
| 6 | Contact | `/contact` | BROKEN (empty main) |
| 7 | Checkout | `/checkout` | PARTIAL (no payment form) |
| 8 | Video Library | `/video-library` | OK (Galaxy branding in hero) |
| 9 | Waiver | `/waiver` | BROKEN (empty main) |
| 10 | Admin Overview | `/dashboard/home` | OK (many widgets) |
| 11 | Admin Clients & Team | `/dashboard/clients` | OK (11 tabs, 2 clients) |
| 12 | Admin Workouts | `/dashboard/workouts` | OK (10 tabs) |
| 13 | Admin Scheduling | `/dashboard/scheduling` | OK (calendar) |
| 14 | Admin Gamification | `/dashboard/gamification` | OK (achievements) |
| 15 | Admin Store & Revenue | `/dashboard/store` | OK (6 tabs) |
| 16 | Admin Content Studio | `/dashboard/content/video-studio` | OK (Invalid Date bug) |
| 17 | Admin Analytics | `/dashboard/analytics` | BROKEN (raw floats) |
| 18 | Admin System | `/dashboard/system` | OK (from prior session) |
| 19 | Admin Canada Immigration | `/dashboard/immigration` | PARTIAL (4 API errors) |
| 20 | Client Dashboard | `/client-dashboard` | THEME BUG (Galaxy-Swan) |
| 21 | Social Hub | `/social` | OK (notifications disabled) |

### Mobile (375x812)
| # | Page | URL | Status |
|---|------|-----|--------|
| 22 | Homepage | `/` | OK (responsive, CTAs visible) |
| 23 | Store | `/store` | OK (hero responsive) |

---

## Notification-Specific Findings

### Current State of Notifications
1. **Bell icon in header** — Present but NOT wired to API (shows no count)
2. **Admin Business Intelligence Alerts** — Shows 13 contact form notifications (real data)
3. **Dashboard Notifications tab** — Exists but content not audited
4. **Social Hub Notifications button** — Disabled/grayed out
5. **No toast notifications** observed during testing
6. **No real-time Socket.IO pushes** observed (though backend claims WebSocket connected)
7. **NotificationSettings model exists** but no UI for preferences found

### Gaps Confirmed (From Master Prompt)
- Header bell not wired to `GET /api/notifications/count` ✅ Confirmed
- No real-time toast on Socket.IO push ✅ Confirmed
- No notification preferences UI ✅ Confirmed
- Gallery/Social/Payment notifications don't trigger ✅ Confirmed
- Cross-role routing not implemented ✅ Confirmed

---

## Recommendations for AI Village

1. **P0 Fix First:** Contact page and Waiver page broken content — likely same root cause
2. **P0 Fix First:** Analytics raw floats — embarrassing for production site
3. **Theme Migration:** Client Dashboard Galaxy→Crystalline Swan is a major UI task
4. **Notification Integration:** Confirms every gap identified in the master prompt
5. **Payment System:** Checkout payment section is blank — multi-payment system needed
6. **Data Quality:** Fake analytics data, test user data, 0% counters need cleanup
7. **Connection Banner:** The "Retrying..." banner on every page load hurts perceived performance

---

*Generated by Playwright MCP QA automation — SwanStudios Full-Site Upgrade Project*
