# Legacy Chart Gallery Island Archive - 2026-07-16

## Purpose

This companion manifest records an unreachable chart showcase island moved during the pre-launch audit. Original paths remain recoverable under the pending-deletion archive; no file was deleted.

## Evidence

- Production-only Fallow classified both gallery roots and all 53 source dependencies as unreachable from current runtime entry points.
- A resolved-import graph found no consumer outside this candidate set except two tests that covered only their archived chart source.
- Mounted social, nutrition, progress, and marketing consumers were enumerated and retained.
- `chartTheme.ts`, `SafeChart.tsx`, `lensChartPalette.tsx`, `ExerciseHistoryChart.tsx`, mounted live charts, `WorkoutHeatmapCalendar.tsx`, `GoalProgressBullet.tsx`, `MacroDonut.tsx`, and `NutritionBalanceRadar.tsx` remain active.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/Charts/BadgeGallery.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/BadgeGallery.tsx` | unmounted badge showcase root |
| `frontend/src/components/Charts/ChartGallery.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/ChartGallery.tsx` | unmounted chart showcase root |
| `frontend/src/components/Charts/charts/area/BodyCompositionArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/area/BodyCompositionArea.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/area/CalorieBurnArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/area/CalorieBurnArea.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/area/RevenueStreamArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/area/RevenueStreamArea.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/area/TrainingLoadArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/area/TrainingLoadArea.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/area/WorkoutDurationArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/area/WorkoutDurationArea.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bar/ClientRetentionBar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/ClientRetentionBar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bar/ExerciseComparisonBar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/ExerciseComparisonBar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bar/MonthlyRevenueBar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/MonthlyRevenueBar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bar/TrainerWorkloadBar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/TrainerWorkloadBar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bar/WeeklyVolumeBar.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/WeeklyVolumeBar.test.tsx` | source-only test for archived chart |
| `frontend/src/components/Charts/charts/bar/WeeklyVolumeBar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bar/WeeklyVolumeBar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bullet/ClientCapacityBullet.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bullet/ClientCapacityBullet.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bullet/NutritionGoalBullet.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bullet/NutritionGoalBullet.test.tsx` | source-only test for archived chart |
| `frontend/src/components/Charts/charts/bullet/NutritionGoalBullet.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bullet/NutritionGoalBullet.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bullet/RevenueTargetBullet.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bullet/RevenueTargetBullet.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/bullet/SessionQuotaBullet.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/bullet/SessionQuotaBullet.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/funnel/ClientOnboardingFunnel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/funnel/ClientOnboardingFunnel.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/funnel/CompletionFunnel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/funnel/CompletionFunnel.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/funnel/GoalAchievementFunnel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/funnel/GoalAchievementFunnel.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/funnel/SalesConversionFunnel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/funnel/SalesConversionFunnel.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/funnel/SessionBookingFunnel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/funnel/SessionBookingFunnel.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/heatmap/ClientCheckInHeatmap.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/heatmap/ClientCheckInHeatmap.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/heatmap/ExerciseIntensityHeatmap.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/heatmap/ExerciseIntensityHeatmap.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/heatmap/HourlyActivityHeatmap.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/heatmap/HourlyActivityHeatmap.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/heatmap/MuscleRecoveryHeatmap.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/heatmap/MuscleRecoveryHeatmap.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/line/BodyFatTrendLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/line/BodyFatTrendLine.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/line/CardioEnduranceLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/line/CardioEnduranceLine.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/line/SessionFrequencyLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/line/SessionFrequencyLine.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/line/StrengthProgressionLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/line/StrengthProgressionLine.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/line/WeightProgressionLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/line/WeightProgressionLine.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/live/CardioEnduranceLine.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/live/CardioEnduranceLine.tsx` | unconsumed alternate live chart |
| `frontend/src/components/Charts/charts/live/MuscleGroupFocusRadar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/live/MuscleGroupFocusRadar.tsx` | unconsumed alternate live chart |
| `frontend/src/components/Charts/charts/live/MuscleRecoveryHeatmap.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/live/MuscleRecoveryHeatmap.tsx` | unconsumed alternate live chart |
| `frontend/src/components/Charts/charts/live/RPEByExerciseScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/live/RPEByExerciseScatter.tsx` | unconsumed alternate live chart |
| `frontend/src/components/Charts/charts/live/SessionFrequencyArea.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/live/SessionFrequencyArea.tsx` | unconsumed alternate live chart |
| `frontend/src/components/Charts/charts/pie/ClientDemographicsPie.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/pie/ClientDemographicsPie.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/pie/ExerciseTypePie.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/pie/ExerciseTypePie.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/pie/RevenueSourcePie.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/pie/RevenueSourcePie.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/pie/SessionTypeDonut.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/pie/SessionTypeDonut.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/radar/ClientEngagementRadar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/radar/ClientEngagementRadar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/radar/FitnessAssessmentRadar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/radar/FitnessAssessmentRadar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/radar/MuscleGroupRadar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/radar/MuscleGroupRadar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/radar/TrainerSkillsRadar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/radar/TrainerSkillsRadar.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/scatter/AgePerformanceScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/scatter/AgePerformanceScatter.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/scatter/AttendanceProgressScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/scatter/AttendanceProgressScatter.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/scatter/PriceRetentionScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/scatter/PriceRetentionScatter.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/scatter/RestRecoveryScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/scatter/RestRecoveryScatter.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/scatter/VolumeIntensityScatter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/scatter/VolumeIntensityScatter.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/stream/ClientFlowStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/stream/ClientFlowStream.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/stream/ExerciseFrequencyStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/stream/ExerciseFrequencyStream.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/stream/MoodEnergyStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/stream/MoodEnergyStream.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/stream/NutrientIntakeStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/stream/NutrientIntakeStream.tsx` | showcase-only chart dependency |
| `frontend/src/components/Charts/charts/stream/TrainingPhaseStream.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Charts/charts/stream/TrainingPhaseStream.tsx` | showcase-only chart dependency |

## Restore procedure

Restore only after proving a mounted consumer, moving the complete required dependency slice back to its original paths, and rerunning typecheck, production build, focused chart tests, the full frontend suite, and lint.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
