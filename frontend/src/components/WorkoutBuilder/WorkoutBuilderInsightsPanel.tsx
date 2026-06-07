import type { GeneratedPlan, GeneratedWorkout } from '../../hooks/useWorkoutBuilderAPI';
import {
  ContextCard,
  ContextLabel,
  ContextMeta,
  ContextValue,
  InsightCard,
  InsightDetail,
  InsightMessage,
  Panel,
  PanelTitle,
  SectionDivider,
} from './WorkoutBuilderPage.styles';

interface WorkoutBuilderInsightsPanelProps {
  workout: GeneratedWorkout | null;
  plan: GeneratedPlan | null;
}

type WorkoutBuilderExplanationRow = {
  type: string;
  message: string;
};

const workoutBuilderInsightKey = (explanation: WorkoutBuilderExplanationRow): string =>
  `${explanation.type}|${explanation.message}`;

const workoutBuilderInsightDetailKey = (
  explanation: WorkoutBuilderExplanationRow,
  detail: string
): string => `${workoutBuilderInsightKey(explanation)}|${detail}`;

const formatPlanningList = (values: string[] | undefined): string =>
  values && values.length > 0 ? values.slice(0, 6).join(', ') : 'None logged';

const WorkoutBuilderInsightsPanel: React.FC<WorkoutBuilderInsightsPanelProps> = ({ workout, plan }) => {
  const planning = workout?.swanCoachPlanning || plan?.swanCoachPlanning || null;
  const dataCategoriesUsed = planning?.dataCategoriesUsed ?? [];
  const missingDataCategories = planning?.missingDataCategories ?? [];

  return (
    <Panel>
      <PanelTitle>Swan Coach Planning Insights</PanelTitle>
      {planning && (
        <>
          <ContextCard $severity="info">
            <ContextLabel>Planning System</ContextLabel>
            <ContextValue>Swan Coach Planning</ContextValue>
            <ContextMeta>{planning.safetyGate?.reviewMessage || 'Trainer approval still required.'}</ContextMeta>
          </ContextCard>
          <ContextCard $severity="info">
            <ContextLabel>Data Used</ContextLabel>
            <ContextValue>{formatPlanningList(dataCategoriesUsed)}</ContextValue>
          </ContextCard>
          {missingDataCategories.length > 0 && (
            <ContextCard $severity="warn">
              <ContextLabel>Needs Review</ContextLabel>
              <ContextValue>{formatPlanningList(missingDataCategories)}</ContextValue>
            </ContextCard>
          )}
        </>
      )}
      {workout && workout.explanations.map((exp) => (
        <InsightCard key={workoutBuilderInsightKey(exp)} $type={exp.type}>
          <InsightMessage>{exp.message}</InsightMessage>
          {exp.details && exp.details.map((d) => (
            <InsightDetail key={workoutBuilderInsightDetailKey(exp, d)}>{d}</InsightDetail>
          ))}
        </InsightCard>
      ))}
      {!workout && !plan && (
        <ContextMeta $center $pad={24}>
          Use Swan Coach Planning to see data coverage and coaching rationale
        </ContextMeta>
      )}
      {workout && (
        <>
          <SectionDivider>Workout Summary</SectionDivider>
          <ContextCard $severity="info">
            <ContextLabel>Session Type</ContextLabel>
            <ContextValue>{workout.sessionType.toUpperCase()}</ContextValue>
          </ContextCard>
          <ContextCard $severity="info">
            <ContextLabel>NASM Phase</ContextLabel>
            <ContextValue>Phase {workout.nasmPhase}: {workout.phaseParams.name}</ContextValue>
            <ContextMeta>{workout.phaseParams.focus}</ContextMeta>
          </ContextCard>
          <ContextCard $severity={workout.context.painExclusions > 0 ? 'danger' : 'info'}>
            <ContextLabel>Safety</ContextLabel>
            <ContextValue>
              {workout.context.painExclusions} exclusion(s), {workout.context.painWarnings} warning(s)
            </ContextValue>
          </ContextCard>
          <ContextCard $severity="info">
            <ContextLabel>Compensations Addressed</ContextLabel>
            <ContextValue>{workout.context.compensations} pattern(s) in warmup</ContextValue>
          </ContextCard>
        </>
      )}
    </Panel>
  );
};

export default WorkoutBuilderInsightsPanel;
