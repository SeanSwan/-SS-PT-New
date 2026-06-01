import { AnimatePresence, motion } from 'framer-motion';
import type { GeneratedPlan, GeneratedWorkout } from '../../hooks/useWorkoutBuilderAPI';
import {
  AiBadge,
  ContextCard,
  ContextLabel,
  ContextMeta,
  ContextValue,
  ExerciseCard,
  ExerciseHeader,
  ExerciseName,
  ExerciseParams,
  InlineReason,
  InsightCard,
  InsightMessage,
  MuscleTag,
  MuscleTags,
  ParamChip,
  PhaseName,
  SectionDivider,
  SuccessBanner,
} from './WorkoutBuilderPage.styles';

interface WorkoutBuilderResultsProps {
  workout: GeneratedWorkout | null;
  plan: GeneratedPlan | null;
}

type WorkoutBuilderWarmupRow = GeneratedWorkout['warmup'][number];
type WorkoutBuilderCooldownRow = GeneratedWorkout['cooldown'][number];

const workoutBuilderWarmupKey = (exercise: WorkoutBuilderWarmupRow): string =>
  [
    'warmup',
    exercise.type,
    exercise.name,
    exercise.duration ?? '',
    exercise.sets ?? '',
    exercise.reps ?? '',
    exercise.reason ?? '',
  ].join('|');

const workoutBuilderCooldownKey = (exercise: WorkoutBuilderCooldownRow): string =>
  [
    'cooldown',
    exercise.name,
    exercise.duration ?? '',
    exercise.sets ?? '',
    exercise.reps ?? '',
  ].join('|');

const workoutBuilderRecommendationKey = (recommendation: string): string =>
  `recommendation|${recommendation}`;

const WorkoutBuilderResults: React.FC<WorkoutBuilderResultsProps> = ({ workout, plan }) => (
  <>
    <AnimatePresence>
      {workout && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SectionDivider>
            {workout.sessionType.toUpperCase()} Session | Phase {workout.nasmPhase}: {workout.phaseParams.name}
          </SectionDivider>
          {workout.warmup.length > 0 && (
            <>
              <SectionDivider>Warmup (CES Protocol)</SectionDivider>
              {workout.warmup.map((w) => (
                <ExerciseCard key={workoutBuilderWarmupKey(w)}>
                  <ExerciseHeader>
                    <ExerciseName>{w.name}</ExerciseName>
                    <AiBadge>{w.type}</AiBadge>
                  </ExerciseHeader>
                  <ExerciseParams>
                    {w.duration && <ParamChip>{w.duration}</ParamChip>}
                    {w.sets && <ParamChip>{w.sets} x {w.reps}</ParamChip>}
                    {w.reason && <InlineReason>{w.reason}</InlineReason>}
                  </ExerciseParams>
                </ExerciseCard>
              ))}
            </>
          )}
          <SectionDivider>Main Exercises</SectionDivider>
          {workout.exercises.map((ex) => (
            <ExerciseCard key={ex.exerciseKey} $aiOptimized>
              <ExerciseHeader>
                <ExerciseName>{ex.exerciseName}</ExerciseName>
                <AiBadge>AI Optimized</AiBadge>
              </ExerciseHeader>
              <ExerciseParams>
                <ParamChip>{ex.sets} sets</ParamChip>
                <ParamChip>{ex.reps} reps</ParamChip>
                <ParamChip>{ex.tempo} tempo</ParamChip>
                <ParamChip>{ex.rest} rest</ParamChip>
              </ExerciseParams>
              <MuscleTags>
                {ex.muscles.slice(0, 4).map(m => (
                  <MuscleTag key={m}>{m.replace(/_/g, ' ')}</MuscleTag>
                ))}
              </MuscleTags>
            </ExerciseCard>
          ))}
          {workout.cooldown.length > 0 && (
            <>
              <SectionDivider>Cooldown</SectionDivider>
              {workout.cooldown.map((c) => (
                <ExerciseCard key={workoutBuilderCooldownKey(c)}>
                  <ExerciseName>{c.name}</ExerciseName>
                  <ExerciseParams>
                    {c.duration && <ParamChip>{c.duration}</ParamChip>}
                    {c.sets && <ParamChip>{c.sets} x {c.reps}</ParamChip>}
                  </ExerciseParams>
                </ExerciseCard>
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {plan && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SectionDivider>
            {plan.planSummary.durationWeeks}-Week Plan | {plan.planSummary.totalSessions} Sessions
          </SectionDivider>
          <SuccessBanner $bottom={12}>
            {plan.recommendations.length} AI recommendations applied
          </SuccessBanner>
          {plan.mesocycles.map(mc => (
            <ExerciseCard key={mc.mesocycle}>
              <ExerciseHeader>
                <ExerciseName>Mesocycle {mc.mesocycle}: Weeks {mc.weeks}</ExerciseName>
                <AiBadge>Phase {mc.nasmPhase}</AiBadge>
              </ExerciseHeader>
              <PhaseName>{mc.phaseName}</PhaseName>
              <ExerciseParams>
                <ParamChip>{mc.params.sets} sets</ParamChip>
                <ParamChip>{mc.params.reps} reps</ParamChip>
                <ParamChip>{mc.params.intensity}</ParamChip>
                <ParamChip>{mc.params.rest} rest</ParamChip>
              </ExerciseParams>
              <ContextMeta $top={6}>{mc.overloadStrategy}</ContextMeta>
              {mc.deloadWeek && <ContextMeta $warning>Deload: Week {mc.deloadWeek}</ContextMeta>}
            </ExerciseCard>
          ))}
          <SectionDivider>Weekly Schedule</SectionDivider>
          {plan.weeklySchedule.map(day => (
            <ContextCard key={day.dayNumber} $severity="info">
              <ContextLabel>Day {day.dayNumber}</ContextLabel>
              <ContextValue>{day.focus}</ContextValue>
            </ContextCard>
          ))}
          <SectionDivider>Recommendations</SectionDivider>
          {plan.recommendations.map((rec) => (
            <InsightCard key={workoutBuilderRecommendationKey(rec)} $type="nasm_phase">
              <InsightMessage>{rec}</InsightMessage>
            </InsightCard>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </>
);

export default WorkoutBuilderResults;
