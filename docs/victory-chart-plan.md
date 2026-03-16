# Victory Charts Migration Plan — 50 Charts (5 per Category)

## Overview
Migrate from Nivo to Victory for cross-platform compatibility (React web now, React Native for App Store/Google Play later).
Build 50 production charts: 5 demo variations per chart type category.

## Step 1: Package Changes
- Uninstall: @nivo/bar, @nivo/bullet, @nivo/core, @nivo/funnel, @nivo/heatmap, @nivo/line, @nivo/pie, @nivo/radar, @nivo/scatterplot, @nivo/stream
- Install: victory
- Victory provides: VictoryLine, VictoryBar, VictoryPie, VictoryArea, VictoryScatter, VictoryPolarAxis, VictoryStack, VictoryGroup, VictoryChart, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer, VictoryZoomContainer

## Step 2: Rewrite chartTheme.ts
- Convert Nivo theme to Victory theme format (VictoryTheme.material base, override with Crystalline Swan tokens)
- Same color palettes (CHART_COLORS, FULL_PALETTE, MACRO_PALETTE, STREAM_PALETTE)
- Keep existing styled-components (ChartCard, DashboardGrid, TooltipBox)
- Add Victory-specific: custom tooltip component, container configs

## Step 3: 50 Charts — 10 Categories x 5 Each

### Category 1: Line Charts (Weight/Progress Tracking)
1. WeightProgressionLine — Client weight over 12 weeks (smooth curve, area fill)
2. StrengthProgressionLine — 1RM progression for bench/squat/deadlift
3. CardioEnduranceLine — Running pace or distance over time
4. SessionFrequencyLine — Sessions per week over 6 months
5. BodyFatTrendLine — Body fat % decline over training period

### Category 2: Bar Charts (Volume and Comparisons)
6. WeeklyVolumeBar — Total volume (sets x reps x weight) per week
7. ExerciseComparisonBar — Top 10 exercises by total volume
8. MonthlyRevenueBar — Revenue by month (stacked by package type)
9. ClientRetentionBar — New vs returning clients per month
10. TrainerWorkloadBar — Sessions per trainer per week

### Category 3: Radar Charts (Multi-Metric Profiles)
11. MuscleGroupRadar — Distribution across chest/back/legs/shoulders/arms/core
12. FitnessAssessmentRadar — Strength/endurance/flexibility/balance/power
13. ClientEngagementRadar — Attendance/completion/feedback/social/goals
14. NutritionBalanceRadar — Protein/carbs/fats/fiber/hydration
15. TrainerSkillsRadar — Certifications/client ratings/retention/specializations

### Category 4: Pie/Donut Charts (Distributions)
16. MacroDonut — Protein/carbs/fat macro split
17. SessionTypeDonut — Personal/group/virtual/assessment breakdown
18. RevenueSourcePie — Package sales/drop-ins/merchandise/subscriptions
19. ClientDemographicsPie — Age groups or fitness levels
20. ExerciseTypePie — Strength/cardio/flexibility/HIIT distribution

### Category 5: Heatmap Charts (Patterns and Density)
21. WorkoutHeatmapCalendar — GitHub-style workout frequency calendar
22. HourlyActivityHeatmap — Busiest hours x days of week
23. MuscleRecoveryHeatmap — Recovery status by muscle group by day
24. ClientCheckInHeatmap — Check-in patterns over months
25. ExerciseIntensityHeatmap — RPE by exercise by session

### Category 6: Area/Stream Charts (Trends and Composition)
26. TrainingLoadArea — Weekly training load (volume x intensity) stacked
27. BodyCompositionArea — Fat/muscle/water composition over time
28. RevenueStreamArea — Revenue streams stacked over months
29. WorkoutDurationArea — Session duration trends
30. CalorieBurnArea — Daily calorie burn stacked by activity type

### Category 7: Stream Charts (Flow and Evolution)
31. ExerciseFrequencyStream — Exercise category popularity over months
32. ClientFlowStream — Client acquisition/churn flow
33. MoodEnergyStream — Pre/post workout mood and energy levels
34. TrainingPhaseStream — Periodization phases (hypertrophy/strength/deload)
35. NutrientIntakeStream — Macro/micro nutrient intake over weeks

### Category 8: Funnel Charts (Conversion and Completion)
36. CompletionFunnel — Workout plan assigned to started to completed to logged
37. ClientOnboardingFunnel — Lead to trial to signup to active to retained
38. SessionBookingFunnel — Available to booked to confirmed to attended
39. GoalAchievementFunnel — Set to in progress to near completion to achieved
40. SalesConversionFunnel — Visit to inquiry to consultation to purchase

### Category 9: Scatter Charts (Correlations)
41. VolumeIntensityScatter — Volume vs intensity per session
42. AttendanceProgressScatter — Attendance rate vs fitness score improvement
43. PriceRetentionScatter — Package price vs client retention months
44. AgePerformanceScatter — Client age vs performance gains
45. RestRecoveryScatter — Rest time vs recovery quality

### Category 10: Bullet/Gauge Charts (Goal Progress)
46. GoalProgressBullet — Current vs target for key metrics
47. SessionQuotaBullet — Used sessions vs available sessions
48. RevenueTargetBullet — Monthly revenue vs target
49. ClientCapacityBullet — Current clients vs max capacity per trainer
50. NutritionGoalBullet — Daily calories/protein vs targets

## Step 4: Chart Gallery UI
- Bento Box layout: featured Core 6 at top (1 from each of first 6 categories)
- Category tabs/filter below for browsing all 50
- Search by chart name
- Each chart in a glassmorphic ChartCard with title, subtitle, and chart container
- Lazy load each category group
- Mobile responsive: single column below 768px

## Step 5: File Structure
frontend/src/components/Charts/
  chartTheme.ts (REWRITE for Victory)
  ChartGallery.tsx (REWRITE with category tabs)
  victoryTheme.ts (NEW Victory theme object)
  charts/line/ (5 files)
  charts/bar/ (5 files)
  charts/radar/ (5 files)
  charts/pie/ (5 files)
  charts/heatmap/ (5 files)
  charts/area/ (5 files)
  charts/stream/ (5 files)
  charts/funnel/ (5 files)
  charts/scatter/ (5 files)
  charts/bullet/ (5 files)
  demos/ (OLD Nivo demos - DELETE after migration)

## Design Constraints
- Crystalline Swan theme (NOT Galaxy-Swan which is RETIRED)
- All charts use Victory theme object with Crystalline Swan tokens
- Glassmorphic ChartCard wrappers (existing styled-component)
- Custom tooltips with backdrop-blur, Wing Purple border, Fira Code values
- Mobile: axes hidden/decimated below 768px, legends below chart
- 44px min touch targets on all interactive elements
- Lazy loading per category group
- Empty states: skeleton loaders with aspirational messaging
- Interactive dimming on hover (focused series highlighted, others at 0.2 opacity)
- Victory chosen for React Native compatibility (victory-native)
