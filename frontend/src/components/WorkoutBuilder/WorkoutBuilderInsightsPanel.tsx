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

type SwanCoachPlanning = GeneratedWorkout['swanCoachPlanning'];

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

const selectPlanning = (
  workout: GeneratedWorkout | null,
  plan: GeneratedPlan | null
): SwanCoachPlanning | null => {
  if (workout) return workout.swanCoachPlanning;
  if (plan) return plan.swanCoachPlanning;
  return null;
};

const getSafetyReviewMessage = (planning: SwanCoachPlanning): string =>
  planning.safetyGate?.reviewMessage || 'Trainer approval still required.';

const PlanningSummaryCards: React.FC<{ planning: SwanCoachPlanning | null }> = ({ planning }) => {
  if (!planning) return null;

  return (
    <>
      <ContextCard $severity="info">
        <ContextLabel>Planning System</ContextLabel>
        <ContextValue>Swan Coach Planning</ContextValue>
        <ContextMeta>{getSafetyReviewMessage(planning)}</ContextMeta>
      </ContextCard>
      <ContextCard $severity="info">
        <ContextLabel>Data Used</ContextLabel>
        <ContextValue>{formatPlanningList(planning.dataCategoriesUsed)}</ContextValue>
      </ContextCard>
      <MissingDataCard values={planning.missingDataCategories ?? []} />
    </>
  );
};

const MissingDataCard: React.FC<{ values: string[] }> = ({ values }) => {
  if (values.length === 0) return null;

  return (
    <ContextCard $severity="warn">
      <ContextLabel>Needs Review</ContextLabel>
      <ContextValue>{formatPlanningList(values)}</ContextValue>
    </ContextCard>
  );
};

const WorkoutExplanationCards: React.FC<{ workout: GeneratedWorkout | null }> = ({ workout }) => {
  if (!workout) return null;

  return (
    <>
      {workout.explanations.map((exp) => (
        <InsightCard key={workoutBuilderInsightKey(exp)} $type={exp.type}>
          <InsightMessage>{exp.message}</InsightMessage>
          {exp.details?.map((detail) => (
            <InsightDetail key={workoutBuilderInsightDetailKey(exp, detail)}>{detail}</InsightDetail>
          ))}
        </InsightCard>
      ))}
    </>
  );
};

const EmptyInsightsState: React.FC<{ hasGeneratedOutput: boolean }> = ({ hasGeneratedOutput }) => {
  if (hasGeneratedOutput) return null;

  return (
    <ContextMeta $center $pad={24}>
      Use Swan Coach Planning to see data coverage and coaching rationale
    </ContextMeta>
  );
};

const WorkoutSummaryCards: React.FC<{ workout: GeneratedWorkout | null }> = ({ workout }) => {
  if (!workout) return null;

  const safetySeverity = workout.context.painExclusions > 0 ? 'danger' : 'info';

  return (
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
      <ContextCard $severity={safetySeverity}>
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
  );
};

const WorkoutBuilderInsightsPanel: React.FC<WorkoutBuilderInsightsPanelProps> = ({ workout, plan }) => {
  const planning = selectPlanning(workout, plan);
  const hasGeneratedOutput = Boolean(workout ?? plan);

  return (
    <Panel>
      <PanelTitle>Swan Coach Planning Insights</PanelTitle>
      <PlanningSummaryCards planning={planning} />
      <WorkoutExplanationCards workout={workout} />
      <EmptyInsightsState hasGeneratedOutput={hasGeneratedOutput} />
      <WorkoutSummaryCards workout={workout} />
    </Panel>
  );
};

export default WorkoutBuilderInsightsPanel;
