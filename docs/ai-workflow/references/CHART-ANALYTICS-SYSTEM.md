# Chart & Analytics System
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: chart/analytics work, Victory library, chart gallery

---

## Chart & Analytics System (MANDATORY)

SwanStudios uses **Victory** (v37.3.6) as the sole charting library for cross-platform compatibility (React web → React Native for App Store/Google Play).

### Library: Victory Only
| Library | Version | Purpose |
|---------|---------|---------|
| **Victory** | 37.3.6 | ALL charts — gallery, dashboards, analytics, profiles |
- **Why Victory:** Identical API between `victory` (web) and `victory-native` (React Native) — critical for mobile app roadmap
- **No Recharts for new work** — Legacy Recharts charts should be migrated to Victory over time

### 50-Chart Victory Gallery
Located in `frontend/src/components/Charts/` with bento-box layout:

| Category | Charts | Types |
|----------|--------|-------|
| Line | 5 | Weight progression, strength 1RM, cardio, session frequency, body fat trend |
| Bar | 5 | Weekly volume, exercise comparison, monthly revenue, client retention, trainer workload |
| Radar | 6 | Muscle group balance, fitness assessment, client engagement, nutrition, trainer skills |
| Pie/Donut | 5 | Macros, session types, revenue source, demographics, exercise types |
| Heatmap | 5 | Workout calendar (GitHub-style), hourly activity, muscle recovery, check-ins, intensity |
| Area | 5 | Training load, body composition, revenue stream, workout duration, calorie burn |
| Stream | 5 | Exercise frequency, client flow, mood/energy, OPT phase progression, nutrient intake |
| Funnel | 5 | Sales conversion, client onboarding, session booking, goal achievement, completion rates |
| Scatter | 5 | Volume vs intensity, attendance vs progress, price vs retention, age vs performance, rest vs recovery |
| Bullet/Gauge | 5 | Goal progress, session quota, revenue target, client capacity, nutrition goal |

- **Theme file:** `frontend/src/components/Charts/chartTheme.ts` (Crystalline Swan palette)
- **Error boundary:** `frontend/src/components/Charts/SafeChart.tsx` (per-chart isolation)
- **Animation config:** 800ms, cubicInOut easing
- **Color palettes:** `FULL_PALETTE`, `MACRO_PALETTE`, `STREAM_PALETTE`

### Chart → Profile Integration (NOT YET CONNECTED)
**TODO: Charts must be connected to client and user profile dashboards.**
- User profiles MUST display selected workout charts (since this is a social media platform)
- Each user/client can **toggle which charts are visible** on their public profile via privacy settings
- Chart visibility settings stored in user preferences: `chartVisibility: { [chartId]: boolean }`
- Default visible charts for new users: Weight Progression, Workout Heatmap, Muscle Group Radar, Goal Progress Gauge
- Admin can see ALL charts for any client regardless of client privacy settings
- Chart data comes from workout logs → analytics service → Victory/Recharts components

### Chart Visibility Toggle UI
```
┌─ Profile Settings → Chart Visibility ──────────────┐
│ ☑ Weight Progression    ☑ Workout Heatmap           │
│ ☑ Muscle Group Radar    ☐ Body Fat Trend            │
│ ☑ Goal Progress         ☐ Strength 1RM              │
│ ☐ Calorie Burn          ☑ Session Frequency          │
│                                                      │
│ [Save] [Preview Profile]                             │
└──────────────────────────────────────────────────────┘
```

### Recharts Dashboard Analytics
Located across dashboard pages — admin-specific panels that do NOT appear on public profiles:
- `frontend/src/components/ClientProgressCharts/` — Strength, body comp, 1RM, volume, form quality, consistency heatmap
- `frontend/src/components/FitnessStats/` — Bar progress, radar, area charts
- `frontend/src/components/Reports/` — Report analytics, data visualization, metrics panels
- `frontend/src/components/UniversalMasterSchedule/Charts/` — Trainer performance, session distribution, revenue
- `frontend/src/pages/workout/components/progress/` — Weekday bar, skill radar, intensity trend, muscle group, exercise type
