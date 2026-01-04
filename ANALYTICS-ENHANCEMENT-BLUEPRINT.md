# ANALYTICS & DASHBOARD WIDGETS - ENHANCEMENT BLUEPRINT

## EXECUTIVE SUMMARY

**Objective:** Enhance the analytics capabilities of the platform by introducing new chart types, more granular milestones, and actionable admin dashboard widgets. This will provide deeper insights for both clients and trainers, driving engagement and retention.

---

## 1. ADDITIONAL CHART TYPES

The current system uses line and bar charts. The following chart types will be added to the `WorkoutProgressCharts.tsx` component to provide a more holistic view of progress.

### a) Body Composition Treemap

**Purpose:** To visualize the client's body composition (muscle vs. fat vs. other) at a specific point in time.
**Location:** Client Dashboard, within the `WorkoutProgressCharts` component.
**Data Source:** `BodyMeasurement` model (latest entry).
**Implementation:** Use Recharts `Treemap` component.

**UI Wireframe:**
```
┌─ BODY COMPOSITION ──────────────────────────┐
│                                             │
│  ┌───────────────────┬───────────────────┐  │
│  │ Muscle Mass       │ Fat Mass          │  │
│  │ 150.5 lbs (81.1%) │ 25.0 lbs (13.5%)  │  │
│  │                   ├──────────┬────────┤  │
│  │                   │ Bone     │ Other  │  │
│  │                   │ 10.0 lbs │        │  │
│  └───────────────────┴──────────┴────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### b) Strength vs. Endurance Radar Chart

**Purpose:** To show a client's balance between pure strength (low rep, high weight) and muscular endurance (high rep, low weight).
**Location:** Client Dashboard, `WorkoutProgressCharts` component.
**Data Source:** Aggregated `Set` data, categorized by rep range.
**Implementation:** Use Recharts `RadarChart` component.

**UI Wireframe:**
```
┌─ STRENGTH PROFILE ──────────────────────────┐
│                                             │
│              Max Strength (1-5 reps)        │
│                     / \                     │
│                    /   \                    │
│ Hypertrophy (6-12) ---------- Endurance (15+)│
│                    \   /                    │
│                     \ /                     │
│                 Power (explosive)           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 2. ADDITIONAL MILESTONE TYPES

The following milestones will be added to the `measurementMilestoneService.mjs` detection logic to celebrate a wider range of achievements.

### a) Consistency Milestones

-   **`consistency_streak_7_days`**: Client logged a workout or check-in 7 days in a row.
-   **`consistency_streak_30_days`**: 30-day streak.
-   **`consistency_perfect_month`**: Client completed 100% of scheduled workouts in a calendar month.

### b) Performance Milestones

-   **`pr_squat_225lbs`**: Client squatted 225 lbs for at least one rep. (Create for major lifts: Bench, Deadlift).
-   **`total_volume_1M_lbs`**: Client's all-time total workout volume (reps * weight) exceeded 1,000,000 lbs.
-   **`first_pull_up`**: Client successfully completed their first unassisted pull-up.

### c) Health & Wellness Milestones

-   **`sleep_avg_7_hours`**: Client averaged 7+ hours of sleep over a 30-day period.
-   **`hydration_goal_met_7_days`**: Client met their daily water intake goal for 7 consecutive days.

---

## 3. NEW ADMIN DASHBOARD WIDGETS

These widgets will be created as new components and added to the main admin dashboard view (`admin-dashboard-view.tsx`) to provide at-a-glance operational insights.

### a) Client Activity Feed

**Purpose:** A real-time feed of significant client activities.
**Component:** `ClientActivityWidget.tsx`
**Data Source:** A new real-time event stream (WebSocket) or polling a new `/api/admin/activity-feed` endpoint.

**UI Wireframe:**
```
┌─ LIVE ACTIVITY FEED ───────────────────────┐
│                                             │
│ 🎉 Sarah J. just achieved "Lost 10 Pounds!" │
│ 🏋️ Mike D. just completed "Upper Body Day". │
│ 📉 Emma W. missed her workout yesterday.     │
│ 💬 Lisa M. sent a new SMS check-in.        │
│                                             │
└─────────────────────────────────────────────┘
```

### b) High-Risk Clients (Low Compliance)

**Purpose:** Identify clients who are falling off track to allow for proactive intervention.
**Component:** `HighRiskClientsWidget.tsx`
**Data Source:** `/api/admin/reports/compliance`

**UI Wireframe:**
```
┌─ LOW COMPLIANCE CLIENTS ───────────────────┐
│                                             │
│ 1. James Brown (45% compliance last 30d)    │
│    - Missed 5 workouts, 12 check-ins.       │
│                                             │
│ 2. Patricia L. (52% compliance last 30d)    │
│    - Low energy reported for 5 days.        │
│                                             │
└─────────────────────────────────────────────┘
```

### c) Top Performing Trainers

**Purpose:** Gamify performance for trainers and identify top performers.
**Component:** `TopTrainersWidget.tsx`
**Data Source:** `/api/admin/reports/trainer-performance`

**UI Wireframe:**
```
┌─ TRAINER LEADERBOARD (THIS MONTH) ─────────┐
│                                             │
│ 🥇 1. Jessica P. - 98% Client Compliance   │
│ 🥈 2. David R. - 95% Client Compliance      │
│ 🥉 3. Emily S. - 92% Client Compliance      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PLAN

1.  **Backend:** Add new milestone detection logic to `measurementMilestoneService.mjs`.
2.  **Backend:** Create new API endpoints for the dashboard widgets (`/api/admin/activity-feed`, etc.).
3.  **Frontend:** Implement new chart types within `WorkoutProgressCharts.tsx` using Recharts.
4.  **Frontend:** Create the three new admin widget components.
5.  **Frontend:** Integrate the new widgets into the main admin dashboard grid.
```

#### New File: `docs/systems/NOTIFICATION-TEMPLATES.md`
This document provides ready-to-use templates for SMS and email notifications, ensuring consistent and professional communication.

```diff