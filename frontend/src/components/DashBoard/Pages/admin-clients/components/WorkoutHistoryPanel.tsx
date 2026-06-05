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

import React, { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { Dumbbell } from 'lucide-react';
import ShareToFeedModal from '../../../../Shared/ShareToFeedModal';
import { CenterContent, Spinner } from './copilot-shared-styles';
import {
  useWorkoutAnalytics,
  type WorkoutSession,
  type WorkoutLogEntry,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { useAuth } from '../../../../../context/AuthContext';
import { sortPersonalRecords } from './workoutHistoryPanelData';
import { buildWorkoutEditExercises } from './workoutHistoryEditPayload';
import { buildEditableWorkoutLogs } from './workoutHistoryEditSession';
import {
  buildWorkoutHistoryShareModalState,
} from './workoutHistorySharing';
import {
  appendWorkoutEditRow,
  removeWorkoutEditRow,
  updateWorkoutEditField,
  updateWorkoutExerciseNote,
} from './workoutHistoryEditRows';
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
  // ── Phase 13.1 inline edit state ──────────────────────────────
  // Ported from the dormant `WorkoutHistoryTimeline` so the canonical
  // consolidated surface does not silently lose edit capability. One
  // session is editable at a time; cancelling or switching sessions
  // discards in-memory edits without touching the server.
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editLogs, setEditLogs] = useState<WorkoutLogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nextTemporarySetIdRef = useRef(-1);
  const sortedPersonalRecords = useMemo(
    () => sortPersonalRecords(data?.personalRecords ?? []),
    [data?.personalRecords],
  );
  const shareModalState = useMemo(
    () => buildWorkoutHistoryShareModalState(clientName, shareSession),
    [clientName, shareSession],
  );

  const toggleSession = (id: string) => {
    // Collapsing a session mid-edit discards the edit — matches the old
    // timeline behavior and prevents an orphaned edit buffer from
    // leaking into a different session.
    if (editingSessionId && editingSessionId !== id) {
      setEditingSessionId(null);
      setEditLogs([]);
      setSaveError(null);
    }
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Phase 13.1 inline edit handlers ──────────────────────────
  // Phase 15.0 update: when a session is loaded for edit, lazy-migrate
  // only the UNAMBIGUOUS SEPARATOR FORM of the Phase 13.2 legacy
  // encoding:
  //
  //     notes = "<set note> · Coach: <exercise note>"
  //
  // For rows matching that exact separator shape we lift the exercise
  // note text into the in-memory `exerciseNote` field and strip the
  // separator from the set note. Saving the edit then writes the
  // canonical Phase 15 shape back to the backend in one pass.
  //
  // We do NOT touch rows whose `notes` happens to start with a bare
  // `Coach: ` prefix — classification safety. A trainer note like
  // "Coach: said this was heavy" is indistinguishable from a
  // Phase 13.2 row whose set 1 had no own note, so auto-promoting it
  // would reintroduce the exact misclassification bug Phase 15.0
  // fixes. Those rows stay exactly as stored until a human cleans
  // them up or an explicit maintenance script is run.
  //
  // Rows that already have `exerciseNote` populated (either fresh
  // Phase 15 writes or rows already migrated on a prior edit) are
  // passed through unchanged — we re-stamp the value on every row of
  // the group so the in-memory buffer respects the "every row carries
  // the note" invariant even if the DB state was transitional.
  const startEdit = useCallback((session: WorkoutSession) => {
    const migrated = buildEditableWorkoutLogs(session);
    setEditingSessionId(session.id);
    setEditLogs(migrated);
    setSaveError(null);
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.add(session.id);
      return next;
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingSessionId(null);
    setEditLogs([]);
    setSaveError(null);
  }, []);

  const updateEditField = useCallback(
    (logIndex: number, field: keyof WorkoutLogEntry, value: string) => {
      setEditLogs((prev) => updateWorkoutEditField(prev, logIndex, field, value));
    },
    [],
  );

  const removeEditRow = useCallback((logIndex: number) => {
    setEditLogs((prev) => removeWorkoutEditRow(prev, logIndex));
  }, []);

  /**
   * Phase 15.0: update the exercise-level note for an entire exercise
   * group. Writes the same value to `exerciseNote` on every row of that
   * group, so deleting any single row preserves the note on the rest.
   * The group identity is `exerciseName` — Phase 15 stores the same
   * exerciseNote on every row of the same-named group.
   */
  const updateExerciseNoteForGroup = useCallback(
    (exerciseName: string, value: string) => {
      setEditLogs((prev) => updateWorkoutExerciseNote(prev, exerciseName, value));
    },
    [],
  );

  const addEditRow = useCallback((exerciseName: string) => {
    setEditLogs((prev) => {
      const temporaryId = nextTemporarySetIdRef.current;
      nextTemporarySetIdRef.current -= 1;
      return appendWorkoutEditRow(prev, exerciseName, temporaryId);
    });
  }, []);

  const saveEdit = useCallback(
    async (workoutId: string) => {
      if (!authAxios) {
        setSaveError('Auth context unavailable — try reloading.');
        return;
      }
      setSaving(true);
      setSaveError(null);
      try {
        const exercises = buildWorkoutEditExercises(editLogs);

        await authAxios.patch(
          `/api/admin/clients/${clientId}/workouts/${workoutId}`,
          { exercises },
        );
        // Refetch analytics so the summary bar, charts, PRs, and history
        // table all reflect the edit in a single source of truth. The
        // shared hook is the only data source — there is no local copy
        // to re-sync manually.
        await refetch();
        setEditingSessionId(null);
        setEditLogs([]);
      } catch (err: unknown) {
        const e = err as { message?: string; response?: { data?: { error?: string } } };
        setSaveError(
          e.response?.data?.error || e.message || 'Failed to save workout changes',
        );
      } finally {
        setSaving(false);
      }
    },
    [authAxios, clientId, editLogs, refetch],
  );

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
