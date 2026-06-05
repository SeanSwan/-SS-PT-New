/**
 * ┌─── SHARED SUB-COMPONENT: WorkoutHistoryPanel ───────────────┐
 * │ PURPOSE: Canonical admin-grade workout history surface      │
 * │ OWNER: Claude Opus 4.6 | LAST MODIFIED: 2026-04-15 (Phase 13)│
 * │                                                              │
 * │ Phase 13 consolidation: extracted from EnhancedWorkoutsModal │
 * │ so the richer architecture (SummaryBar + History/Charts/PRs  │
 * │ tabs + conditional Tempo/Rest/RPE/Est.1RM columns) can be    │
 * │ reused by both call sites:                                   │
 * │                                                              │
 * │   1. EnhancedWorkoutsModal — renders it inside the dialog    │
 * │      shell with ModalHeader + close button.                  │
 * │   2. TrainingTabContent (Clients & Team "Workout History")   │
 * │      tab — mounts it embedded, no modal wrapper.             │
 * │                                                              │
 * │ Before Phase 13 the Clients & Team tab used a separate       │
 * │ WorkoutHistoryTimeline with its own fetch + a weaker table.  │
 * │ WorkoutHistoryTimeline is now dormant.                       │
 * │                                                              │
 * │ Props: { clientId, clientName, variant, active }             │
 * │                                                              │
 * │ `variant` controls chrome:                                   │
 * │   'modal'    — shows SummaryBar + TabBar + ScrollBody        │
 * │                intended for inside a modal WidePanel shell   │
 * │   'embedded' — same content, no outer shell styling; sized   │
 * │                for an embedded card with its own chrome      │
 * │                                                              │
 * │ `active` is a gate for the shared hook — when false the      │
 * │ panel does not fetch. The modal passes `open`; the embedded  │
 * │ surface passes `true`.                                       │
 * │                                                              │
 * │ DATA FLOW: useWorkoutAnalytics(clientId) → analytics API     │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { Dumbbell } from 'lucide-react';
import ShareToFeedModal from '../../../../Shared/ShareToFeedModal';
import { CenterContent, Spinner } from './copilot-shared-styles';
import {
  useWorkoutAnalytics,
  type WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { useAuth } from '../../../../../context/AuthContext';
import { sortPersonalRecords } from './workoutHistoryPanelData';
import {
  buildWorkoutHistoryShareModalState,
} from './workoutHistorySharing';
import WorkoutHistoryPanelHeader, { type WorkoutHistoryPanelTab } from './WorkoutHistoryPanelHeader';
import WorkoutHistorySessionCard from './WorkoutHistorySessionCard';
import {
  EmbeddedHeader,
  EmptyState,
  ErrorPanel,
  LoadingText,
  RetryButton,
} from './WorkoutHistoryPanel.layoutStyles';
import WorkoutHistoryPersonalRecordsTab from './WorkoutHistoryPersonalRecordsTab';
import { useWorkoutHistoryEditor } from './useWorkoutHistoryEditor';

/**
 * Charts tab now mounts the canonical 12-chart Victory grid scoped to the
 * admin-selected client (same component the ClientDetailView "Progress" tab
 * uses). This replaced the older `WorkoutChartsTab`, which rendered an
 * ad-hoc Weekly-Training-Volume + mixed-chart layout off the legacy
 * `useWorkoutAnalytics` shape and did not match the canonical Phase 14
 * 12-chart contract that the client-side dashboard already uses.
 */
const AdminProgressChartsGrid = lazy(
  () => import('../../../workspaces/clients-team/tabs/AdminProgressChartsGrid'),
);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (extracted verbatim from the modal)
// ─────────────────────────────────────────────────────────────

const ScrollBody = styled.div<{ $variant: 'modal' | 'embedded' }>`
  flex: 1;
  padding: 16px 24px;
  /*
   * Phase 13.2 (2026-04-15) scroll ownership:
   *   - 'modal'    → own the inner scroll, capped at 60vh so the dialog
   *                  fits inside WidePanel's 90vh max-height. Matches the
   *                  prior behavior for EnhancedWorkoutsModal.
   *   - 'embedded' → overflow visible, no inner trap. The embedded tab
   *                  relies on document / page-level scroll after the
   *                  TrainingTabContent fix. Keeping an inner auto-scroll
   *                  here would re-create the unreachable-lower-content
   *                  bug on the Clients & Team route.
   */
  ${p => p.$variant === 'modal'
    ? 'overflow-y: auto; max-height: 60vh;'
    : 'overflow: visible;'}
`;

// Layout/status styles live in WorkoutHistoryPanel.layoutStyles.ts.
// Session, table, PR, and share styles live in WorkoutHistoryPanel.sessionStyles.ts.
// Edit and notes styles live in WorkoutHistoryPanel.styles.ts.

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface Props {
  clientId: number;
  clientName: string;
  /**
   * 'modal'    → rendered inside EnhancedWorkoutsModal's WidePanel
   * 'embedded' → rendered directly inside a Clients & Team tab card
   */
  variant?: 'modal' | 'embedded';
  /**
   * Gate for the shared analytics fetch. When false, the hook receives
   * `null` for userId and does not fetch. Modal call site passes `open`;
   * embedded call site passes `true`.
   */
  active?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const WorkoutHistoryPanel: React.FC<Props> = ({
  clientId,
  clientName,
  variant = 'modal',
  active = true,
}) => {
  const { data, isLoading, error, refetch } = useWorkoutAnalytics(active ? clientId : null);
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkoutHistoryPanelTab>('history');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [shareSession, setShareSession] = useState<WorkoutSession | null>(null);
  const sortedPersonalRecords = useMemo(
    () => sortPersonalRecords(data?.personalRecords ?? []),
    [data?.personalRecords],
  );
  const shareModalState = useMemo(
    () => buildWorkoutHistoryShareModalState(clientName, shareSession),
    [clientName, shareSession],
  );

  const expandSession = useCallback((id: string) => {
    setExpandedSessions(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const {
    editingSessionId,
    editLogs,
    saving,
    saveError,
    startEdit,
    cancelEdit,
    updateEditField,
    removeEditRow,
    updateExerciseNoteForGroup,
    addEditRow,
    saveEdit,
  } = useWorkoutHistoryEditor({
    authAxios,
    clientId,
    refetch,
    expandSession,
  });

  const toggleSession = useCallback((id: string) => {
    if (editingSessionId && editingSessionId !== id) {
      cancelEdit();
    }
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [cancelEdit, editingSessionId]);

  return (
    <>
      {/* Embedded surface gets its own client header (the modal already has
          one in the ModalHeader). Keeps client context visible on the
          Clients & Team tab without duplicating inside the modal shell. */}
      {variant === 'embedded' && (
        <EmbeddedHeader>
          <Dumbbell size={16} />
          Workout history — <strong>{clientName}</strong>
        </EmbeddedHeader>
      )}

      <WorkoutHistoryPanelHeader
        data={data}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <ScrollBody $variant={variant}>
        {isLoading && (
          <CenterContent>
            <Spinner />
            <LoadingText>
              Loading workout data...
            </LoadingText>
          </CenterContent>
        )}

        {error && (
          <ErrorPanel>
            <span>{error}</span>
            <RetryButton type="button" onClick={refetch}>
              Retry
            </RetryButton>
          </ErrorPanel>
        )}

        {/* HISTORY TAB */}
        {!isLoading && !error && activeTab === 'history' && data && (
          <>
            {data.sessions.length === 0 ? (
              <EmptyState>
                <Dumbbell size={40} />
                <p>No workouts recorded yet</p>
              </EmptyState>
            ) : (
              data.sessions.map((session) => (
                <WorkoutHistorySessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSessions.has(session.id)}
                  editingSessionId={editingSessionId}
                  editLogs={editLogs}
                  saving={saving}
                  saveError={saveError}
                  onToggle={toggleSession}
                  onShareSession={setShareSession}
                  updateEditField={updateEditField}
                  removeEditRow={removeEditRow}
                  updateExerciseNoteForGroup={updateExerciseNoteForGroup}
                  addEditRow={addEditRow}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  startEdit={startEdit}
                />
              ))
            )}
          </>
        )}

        {/* CHARTS TAB — canonical 12-chart Victory grid (admin-scoped).
            AdminProgressChartsGrid owns its own data fetch via
            useAdminClientProgressCharts(clientId), so we don't gate on the
            local `data` shape from useWorkoutAnalytics. */}
        {activeTab === 'charts' && (
          <Suspense fallback={<CenterContent><Spinner /><LoadingText>Loading charts...</LoadingText></CenterContent>}>
            <AdminProgressChartsGrid clientId={clientId} clientName={clientName} />
          </Suspense>
        )}

        {/* PRs TAB */}
        {!isLoading && !error && activeTab === 'prs' && data && (
          <WorkoutHistoryPersonalRecordsTab
            records={sortedPersonalRecords}
            onShareSession={setShareSession}
          />
        )}
      </ScrollBody>

      {/* Share to Social Feed — rendered as a sibling (NOT nested inside a
          backdrop-filter container) to keep position:fixed semantics intact.
          Both modal and embedded call sites inherit this safe placement. */}
      <ShareToFeedModal
        open={!!shareSession}
        onClose={() => setShareSession(null)}
        postType={shareModalState.postType}
        workoutSessionId={shareModalState.workoutSessionId}
        prefilledContent={shareModalState.prefilledContent}
      />
    </>
  );
};

export default WorkoutHistoryPanel;
