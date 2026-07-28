/**
 * Training tab section content router.
 * ====================================
 *
 * BLUEPRINT: Client Hub training section renderer.
 * Parent: TrainingTabContent. Children: lazy workout builder, plan vault,
 * logger, PLAUD merge, Copilot, and history receipt panels.
 *
 * Keeps the selected-client training workspace shell free of route-like switch
 * rendering. Each section stays lazy-loaded and mounted through this canonical
 * Client Hub path.
 */

import React, { Suspense } from 'react';
import ClientTrainingSaveReceipt, {
  type ClientTrainingSavedWorkout,
} from './ClientTrainingSaveReceipt';
import { PlaceholderCard, ShimmerLoader } from './TrainingTabContent.styles';

const WorkoutPlanBuilder = React.lazy(
  () => import('../../../../WorkoutManagement/WorkoutPlanBuilder')
);

const ClientWorkoutPlansPanel = React.lazy(
  () => import('./ClientWorkoutPlansPanel')
);

const WorkoutLogger = React.lazy(
  () => import('../../../../WorkoutLogger/WorkoutLogger')
);

const HistoricalWorkoutImportPanel = React.lazy(
  () => import('./HistoricalWorkoutImportPanel')
);

const PlaudMergeWorkspace = React.lazy(
  () => import('../../../../PlaudClipMerge/PlaudMergeWorkspace')
    .then((m) => ({ default: m.PlaudMergeWorkspace }))
);

const WorkoutCopilotPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel')
);

const WorkoutHistoryPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel')
);

export type TrainingSection = 'architect' | 'plans' | 'logger' | 'import' | 'plaud' | 'copilot' | 'history';

interface TrainingSectionContentProps {
  activeSection: TrainingSection;
  clientName?: string;
  lastSavedWorkout: ClientTrainingSavedWorkout | null;
  loadTodayPlanSignal: number;
  planVaultRefreshSignal: number;
  safeClientId: number;
  scheduledSessionCreditHint: number | null;
  scheduledSessionDate: string | null;
  scheduledSessionId: string | null;
  onArchitectPlanCreated: () => void;
  onLogTodayFromPlan: () => void;
  onOpenHistoryImport: () => void;
  onOpenProgress?: () => void;
  onWorkoutCancel: () => void;
  onWorkoutComplete: (savedWorkout: unknown) => void;
}

const SuspenseFallback: React.FC = () => (
  <ShimmerLoader role="status" aria-live="polite" aria-label="Loading content">
    <div />
    <div />
    <div />
  </ShimmerLoader>
);

const historyFallback = (
  <PlaceholderCard><p>Loading workout history...</p></PlaceholderCard>
);

const sectionRenderers: Record<TrainingSection, (props: TrainingSectionContentProps) => React.ReactNode> = {
  architect: ({ clientName, onArchitectPlanCreated, safeClientId }) => (
    <WorkoutPlanBuilder
      clientId={String(safeClientId)}
      clientName={clientName}
      onPlanCreated={onArchitectPlanCreated}
    />
  ),
  plans: ({ clientName, onLogTodayFromPlan, planVaultRefreshSignal, safeClientId }) => (
    <ClientWorkoutPlansPanel
      clientId={safeClientId}
      clientName={clientName}
      onLogToday={onLogTodayFromPlan}
      refreshSignal={planVaultRefreshSignal}
    />
  ),
  logger: ({
    loadTodayPlanSignal,
    onOpenHistoryImport,
    onWorkoutCancel,
    onWorkoutComplete,
    safeClientId,
    scheduledSessionCreditHint,
    scheduledSessionDate,
    scheduledSessionId,
  }) => (
    <WorkoutLogger
      clientId={safeClientId}
      loadTodayPlanSignal={loadTodayPlanSignal}
      scheduledSessionCreditHint={scheduledSessionCreditHint}
      scheduledSessionDate={scheduledSessionDate}
      scheduledSessionId={scheduledSessionId}
      onOpenHistoryImport={onOpenHistoryImport}
      onComplete={onWorkoutComplete}
      onCancel={onWorkoutCancel}
    />
  ),
  import: ({ clientName, safeClientId }) => (
    <HistoricalWorkoutImportPanel clientId={safeClientId} clientName={clientName} />
  ),
  plaud: ({ clientName, safeClientId }) => (
    <PlaudMergeWorkspace initialClientId={safeClientId} initialClientName={clientName} embedded={true} />
  ),
  copilot: ({ clientName, safeClientId }) => (
    <WorkoutCopilotPanel
      inline={true}
      open={true}
      onClose={() => undefined}
      clientId={safeClientId}
      clientName={clientName || 'Client'}
    />
  ),
  history: ({ clientName, lastSavedWorkout, onOpenProgress, safeClientId }) => (
    <>
      {lastSavedWorkout && (
        <ClientTrainingSaveReceipt
          clientName={clientName || 'Client'}
          savedWorkout={lastSavedWorkout}
          onOpenProgress={onOpenProgress}
        />
      )}
      <Suspense fallback={historyFallback}>
        <WorkoutHistoryPanel
          clientId={safeClientId}
          clientName={clientName || 'Client'}
          variant="embedded"
          active={true}
        />
      </Suspense>
    </>
  ),
};

const TrainingTabSectionContent: React.FC<TrainingSectionContentProps> = (props) => (
  <Suspense fallback={<SuspenseFallback />}>
    {sectionRenderers[props.activeSection](props)}
  </Suspense>
);

export default TrainingTabSectionContent;
