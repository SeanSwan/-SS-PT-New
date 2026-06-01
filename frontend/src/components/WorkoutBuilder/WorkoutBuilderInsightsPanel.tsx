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

const WorkoutBuilderInsightsPanel: React.FC<WorkoutBuilderInsightsPanelProps> = ({ workout, plan }) => (
  <Panel>
    <PanelTitle>AI Insights</PanelTitle>
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
        Generate a workout to see AI reasoning and insights
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

export default WorkoutBuilderInsightsPanel;
