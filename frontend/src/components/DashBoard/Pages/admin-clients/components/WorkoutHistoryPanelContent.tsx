/**
 * COMPONENT: WorkoutHistoryPanelContent
 * PURPOSE: Render the status states and active tab body for WorkoutHistoryPanel.
 * CALLERS: WorkoutHistoryPanel only.
 * DATA FLOW: Parent hook data -> tab-specific read-only/edit surfaces.
 * SAFETY: No new API calls except the existing lazy progress charts grid.
 */
import React, { lazy, Suspense } from 'react';
import { Dumbbell } from 'lucide-react';

import type {
  AnalyticsData,
  PersonalRecord,
  WorkoutLogEntry,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { CenterContent, Spinner } from './copilot-shared-styles';
import type { WorkoutHistoryPanelTab } from './WorkoutHistoryPanelHeader';
import WorkoutHistoryExerciseLedgerTab from './WorkoutHistoryExerciseLedgerTab';
import {
  EmptyState,
  ErrorPanel,
  LoadingText,
  RetryButton,
} from './WorkoutHistoryPanel.layoutStyles';
import WorkoutHistoryPersonalRecordsTab from './WorkoutHistoryPersonalRecordsTab';
import WorkoutHistorySessionCard from './WorkoutHistorySessionCard';

const AdminProgressChartsGrid = lazy(
  () => import('../../../workspaces/clients-team/tabs/AdminProgressChartsGrid'),
);

interface WorkoutHistoryPanelContentProps {
  activeTab: WorkoutHistoryPanelTab;
  clientId: number;
  clientName: string;
  data: AnalyticsData | null;
  editLogs: WorkoutLogEntry[];
  editingSessionId: string | null;
  error: string | null;
  expandedSessions: Set<string>;
  isLoading: boolean;
  records: PersonalRecord[];
  saving: boolean;
  saveError: string | null;
  addEditRow(exerciseName: string): void;
  cancelEdit(): void;
  onRetry(): Promise<unknown> | unknown;
  onShareSession(session: WorkoutSession): void;
  onToggleSession(sessionId: string): void;
  removeEditRow(logIndex: number): void;
  saveEdit(workoutId: string): void;
  startEdit(session: WorkoutSession): void;
  updateEditField(logIndex: number, field: keyof WorkoutLogEntry, value: string): void;
  updateExerciseNoteForGroup(exerciseName: string, value: string): void;
}

type HistoryTabProps = Pick<
  WorkoutHistoryPanelContentProps,
  | 'addEditRow'
  | 'cancelEdit'
  | 'editLogs'
  | 'editingSessionId'
  | 'expandedSessions'
  | 'onShareSession'
  | 'onToggleSession'
  | 'removeEditRow'
  | 'saveEdit'
  | 'saveError'
  | 'saving'
  | 'startEdit'
  | 'updateEditField'
  | 'updateExerciseNoteForGroup'
> & {
  data: AnalyticsData;
};

const WorkoutHistoryLoadingState: React.FC = () => (
  <CenterContent>
    <Spinner />
    <LoadingText>
      Loading workout data...
    </LoadingText>
  </CenterContent>
);

const WorkoutHistoryErrorState: React.FC<{
  error: string;
  onRetry(): Promise<unknown> | unknown;
}> = ({ error, onRetry }) => (
  <ErrorPanel>
    <span>{error}</span>
    <RetryButton type="button" onClick={onRetry}>
      Retry
    </RetryButton>
  </ErrorPanel>
);

const WorkoutHistoryChartsTab: React.FC<{
  clientId: number;
  clientName: string;
}> = ({ clientId, clientName }) => (
  <Suspense fallback={<CenterContent><Spinner /><LoadingText>Loading charts...</LoadingText></CenterContent>}>
    <AdminProgressChartsGrid clientId={clientId} clientName={clientName} />
  </Suspense>
);

const WorkoutHistoryHistoryTab: React.FC<HistoryTabProps> = ({
  data,
  expandedSessions,
  editingSessionId,
  editLogs,
  saving,
  saveError,
  onToggleSession,
  onShareSession,
  updateEditField,
  removeEditRow,
  updateExerciseNoteForGroup,
  addEditRow,
  cancelEdit,
  saveEdit,
  startEdit,
}) => {
  if (data.sessions.length === 0) {
    return (
      <EmptyState>
        <Dumbbell size={40} />
        <p>No workouts recorded yet</p>
      </EmptyState>
    );
  }

  return (
    <>
      {data.sessions.map((session) => (
        <WorkoutHistorySessionCard
          key={session.id}
          session={session}
          isExpanded={expandedSessions.has(session.id)}
          editingSessionId={editingSessionId}
          editLogs={editLogs}
          saving={saving}
          saveError={saveError}
          onToggle={onToggleSession}
          onShareSession={onShareSession}
          updateEditField={updateEditField}
          removeEditRow={removeEditRow}
          updateExerciseNoteForGroup={updateExerciseNoteForGroup}
          addEditRow={addEditRow}
          cancelEdit={cancelEdit}
          saveEdit={saveEdit}
          startEdit={startEdit}
        />
      ))}
    </>
  );
};

const buildTabContent = (props: WorkoutHistoryPanelContentProps): Record<WorkoutHistoryPanelTab, React.ReactNode> => ({
  history: props.data ? <WorkoutHistoryHistoryTab {...props} data={props.data} /> : null,
  charts: <WorkoutHistoryChartsTab clientId={props.clientId} clientName={props.clientName} />,
  exercises: props.data ? <WorkoutHistoryExerciseLedgerTab sessions={props.data.sessions} /> : null,
  prs: props.data ? (
    <WorkoutHistoryPersonalRecordsTab
      records={props.records}
      onShareSession={props.onShareSession}
    />
  ) : null,
});

const WorkoutHistoryPanelContent: React.FC<WorkoutHistoryPanelContentProps> = (props) => {
  if (props.isLoading) return <WorkoutHistoryLoadingState />;
  if (props.error) return <WorkoutHistoryErrorState error={props.error} onRetry={props.onRetry} />;
  return <>{buildTabContent(props)[props.activeTab]}</>;
};

export default React.memo(WorkoutHistoryPanelContent);
