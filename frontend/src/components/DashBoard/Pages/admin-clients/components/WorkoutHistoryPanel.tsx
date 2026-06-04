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
import {
  Dumbbell, Clock, Target, Trophy, BarChart3,
  ChevronDown, ChevronUp, Flame, Activity, Share2,
  Edit3, Save, X as XIcon, Plus, Trash2, AlertTriangle,
} from 'lucide-react';
import ShareToFeedModal from '../../../../Shared/ShareToFeedModal';
import { CenterContent, Spinner } from './copilot-shared-styles';
import {
  useWorkoutAnalytics,
  type WorkoutSession,
  type WorkoutLogEntry,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { calcBrzycki1RM } from '../../../../../hooks/analytics/workoutAnalyticsUtils';
import { useAuth } from '../../../../../context/AuthContext';
import { resolveExerciseNote, splitLegacyStoredNote } from './workoutHistoryNotes';
import {
  getPersonalRecordKey,
  groupSessionLogs,
  sortPersonalRecords,
} from './workoutHistoryPanelData';
import { buildWorkoutEditExercises } from './workoutHistoryEditPayload';
import { buildEditableWorkoutLogs } from './workoutHistoryEditSession';

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

const SummaryBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(96, 192, 240, 0.05);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  flex-wrap: wrap;
`;

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-family: 'Sora', sans-serif;
  color: var(--text-primary, #E0ECF4);

  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${p => p.$active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.875rem;
  font-family: 'Sora', sans-serif;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  border-bottom: 2px solid ${p => p.$active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }
`;

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

const SessionCard = styled.div`
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 12px;
  /* Phase 15.3: overflow: visible so expanded edit controls (notes inputs,
     add-set buttons, save/cancel bar) are never clipped by the card
     boundary. The prior overflow: hidden was cosmetic (rounded-corner
     clip) — border-radius alone handles that in modern browsers when
     the content does not actually overflow horizontally. */
  overflow: visible;
  transition: border-color 0.2s ease;

  &:hover { border-color: rgba(96, 192, 240, 0.2); }
`;

const SessionHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--text-primary, #E0ECF4);
  gap: 12px;
`;

const SessionToggleButton = styled.button`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  min-height: 44px;
  text-align: left;

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }
`;

const SessionTitle = styled.span`
  font-weight: 600;
  font-size: 0.9375rem;
`;

const SessionMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const MetaChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
`;

const ExerciseTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  color: var(--text-secondary, #8BA8C8);
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`;

const Td = styled.td`
  padding: 8px 12px;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`;

const ExerciseNameCell = styled(Td)`
  font-weight: 500;
  vertical-align: top;
`;

const LoadingText = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin: 0.5rem 0 0;
`;

const ErrorPanel = styled.div`
  padding: 1rem;
  background: rgba(201, 42, 84, 0.1);
  border: 1px solid rgba(201, 42, 84, 0.3);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const RetryButton = styled.button`
  background: transparent;
  border: 1px solid rgba(201, 42, 84, 0.4);
  color: var(--text-primary, #E0ECF4);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  min-height: 44px;
`;

const SessionHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExerciseTableViewport = styled.div`
  padding: 0 16px 16px;
  overflow-x: auto;
`;

const WeightCell = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
`;

const TempoCell = styled.span`
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Fira Code', monospace;
  font-size: 0.8em;
`;

const RPECell = styled.span<{ $value: number }>`
  font-family: 'Fira Code', monospace;
  font-weight: 600;
  color: ${p => {
    if (p.$value >= 9) return '#C92A54';
    if (p.$value >= 7) return '#C6A84B';
    if (p.$value >= 5) return '#60C0F0';
    return '#4caf50';
  }};
`;

const OneRMCell = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.85em;
`;

const PRBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  color: #C6A84B;
  background: #0A0A0F;
  border: 1px solid #C6A84B;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 0 8px rgba(198, 168, 75, 0.4); }
`;

const PRCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-surface, #141419);
  border: 1px solid rgba(198, 168, 75, 0.2);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(198, 168, 75, 0.4); }
`;

const PRDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const PRExerciseName = styled.div`
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
`;

const PRDateText = styled.div`
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
`;

const PRActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const PREstimate = styled.span`
  font-size: 0.6875rem;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary, #94a3b8);

  svg { opacity: 0.4; margin-bottom: 12px; }
`;

const AddSetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const SessionTotals = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(96, 192, 240, 0.08);
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
`;

const TotalLabel = styled.span`
  color: var(--text-secondary, #8BA8C8);
`;

const TotalValue = styled.span`
  color: var(--accent-primary, #60C0F0);
`;

const SessionNotes = styled.p`
  color: var(--text-secondary, #8BA8C8);
  font-size: 0.8125rem;
  margin: 12px 0 0;
  font-style: italic;
`;

const ShareIconBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.12);
  color: #E0ECF4;
  font-size: 0.6875rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    background: #8B5CF6;
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.4);
  }
`;

const EmbeddedHeader = styled.div`
  padding: 14px 24px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: var(--text-secondary, #8BA8C8);
  display: flex;
  align-items: center;
  gap: 8px;
  strong {
    color: var(--text-primary, #E0ECF4);
    font-weight: 600;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Inline edit styles (Phase 13.1 — ported from
// WorkoutHistoryTimeline so the canonical surface does not lose
// set-level edit capability during the consolidation)
// ─────────────────────────────────────────────────────────────

const EditActionBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  justify-content: flex-end;
  border-top: 1px solid rgba(96, 192, 240, 0.06);
  flex-wrap: wrap;
`;

const EditBtn = styled.button<{ $variant?: 'save' | 'cancel' | 'edit' | 'danger' | 'addSet' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  ${({ $variant }) => {
    switch ($variant) {
      case 'save':
        return `
          background: rgba(96, 192, 240, 0.15);
          border-color: rgba(96, 192, 240, 0.4);
          color: #60C0F0;
          &:hover { background: rgba(96, 192, 240, 0.25); }
        `;
      case 'cancel':
        return `
          background: rgba(224, 236, 244, 0.06);
          border-color: rgba(224, 236, 244, 0.15);
          color: #E0ECF4;
          &:hover { background: rgba(224, 236, 244, 0.12); }
        `;
      case 'danger':
        return `
          background: rgba(201, 42, 84, 0.12);
          border-color: rgba(201, 42, 84, 0.3);
          color: #ff8fa3;
          min-height: 32px;
          padding: 4px 8px;
          &:hover { background: rgba(201, 42, 84, 0.2); }
        `;
      case 'addSet':
        return `
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.3);
          color: #C9B8FF;
          min-height: 32px;
          padding: 6px 10px;
          font-size: 11px;
          &:hover { background: rgba(139, 92, 246, 0.2); }
        `;
      case 'edit':
      default:
        return `
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.3);
          color: #C9B8FF;
          &:hover { background: rgba(139, 92, 246, 0.2); }
        `;
    }
  }}
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const EditCellInput = styled.input`
  width: 100%;
  max-width: 72px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid rgba(96, 192, 240, 0.35);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color-scheme: dark;
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 1px;
  }
`;

const EditErrorBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.12);
  border: 1px solid rgba(201, 42, 84, 0.3);
  color: #ff8fa3;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Phase 13.2 notes display styles
// ─────────────────────────────────────────────────────────────

/**
 * Notes block rendered beneath each exercise group inside an expanded
 * session card. Cinematic treatment with a soft gold left border so the
 * coaching observation reads as premium content, not generic table chrome.
 */
const NotesBlock = styled.div`
  margin-top: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 3%, rgba(0, 0, 0, 0.2));
  border: 1px solid rgba(96, 192, 240, 0.14);
  border-left: 3px solid var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-primary, #E0ECF4);
`;

const NotesLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #C6A84B);
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
`;

const NotesItem = styled.div<{ $muted?: boolean }>`
  color: ${p => p.$muted
    ? 'var(--text-secondary, rgba(224, 236, 244, 0.55))'
    : 'var(--text-primary, #E0ECF4)'};
  font-style: ${p => p.$muted ? 'italic' : 'normal'};
  line-height: 1.5;
  padding: 2px 0;
  display: flex;
  gap: 8px;
  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    flex-shrink: 0;
    min-width: 48px;
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
  }
`;

const NotesEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    flex-shrink: 0;
    min-width: 48px;
    font-family: 'Fira Code', monospace;
  }
  input {
    flex: 1;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid rgba(96, 192, 240, 0.25);
    background: rgba(0, 0, 0, 0.25);
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 0.75rem;
    &:focus-visible {
      outline: 2px solid #60C0F0;
      outline-offset: 1px;
    }
  }
`;

const ExerciseNoteEditRow = styled(NotesEditRow)`
  strong {
    color: var(--accent-gold, #C6A84B);
    min-width: 72px;
  }
`;

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
  const [activeTab, setActiveTab] = useState<'history' | 'charts' | 'prs'>('history');
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
      setEditLogs((prev) =>
        prev.map((l, i) => {
          if (i !== logIndex) return l;
          // Strings for notes/tempo; coerced numbers for everything else.
          // Preserve undefined when the user clears a numeric cell so the
          // PATCH payload doesn't zero-stamp fields the user didn't touch.
          if (field === 'notes' || field === 'tempo') {
            return { ...l, [field]: value };
          }
          const trimmed = value.trim();
          if (trimmed === '') {
            return { ...l, [field]: undefined as unknown as number };
          }
          const n = Number(trimmed);
          return { ...l, [field]: Number.isFinite(n) ? n : 0 };
        }),
      );
    },
    [],
  );

  const removeEditRow = useCallback((logIndex: number) => {
    setEditLogs((prev) => prev.filter((_, i) => i !== logIndex));
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
      const nextValue = value.trim().length > 0 ? value : undefined;
      setEditLogs((prev) =>
        prev.map((l) =>
          l.exerciseName === exerciseName
            ? { ...l, exerciseNote: nextValue }
            : l,
        ),
      );
    },
    [],
  );

  const addEditRow = useCallback((exerciseName: string) => {
    setEditLogs((prev) => {
      const existingSets = prev.filter((l) => l.exerciseName === exerciseName);
      const nextSetNumber = existingSets.length + 1;
      const temporaryId = nextTemporarySetIdRef.current;
      nextTemporarySetIdRef.current -= 1;
      // Negative id marks this as a new row not yet persisted. The backend
      // rebuilds set rows on PATCH so the id only needs to be unique
      // client-side for React keys.
      return [
        ...prev,
        {
          id: temporaryId,
          exerciseName,
          setNumber: nextSetNumber,
          reps: 0,
          weight: 0,
        },
      ];
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

      {data && (
        <SummaryBar>
          <StatChip><Dumbbell size={14} /> <strong>{data.summary.totalWorkouts}</strong> workouts</StatChip>
          <StatChip><Activity size={14} /> <strong>{data.summary.totalExercises}</strong> exercises</StatChip>
          <StatChip><Flame size={14} /> <strong>{Math.round(data.summary.totalVolume).toLocaleString()}</strong> lbs</StatChip>
          {data.summary.avgIntensity > 0 && (
            <StatChip><Target size={14} /> <strong>{data.summary.avgIntensity}</strong>/10 intensity</StatChip>
          )}
          {data.summary.avgRPE > 0 && (
            <StatChip>RPE <strong>{data.summary.avgRPE}</strong></StatChip>
          )}
          <StatChip><Trophy size={14} /> <strong>{data.personalRecords.length}</strong> PRs</StatChip>
          {data.summary.longestStreak > 1 && (
            <StatChip>🔥 <strong>{data.summary.longestStreak}</strong> day streak</StatChip>
          )}
        </SummaryBar>
      )}

      <TabBar role="tablist" aria-label="Workout data views">
        <Tab type="button" $active={activeTab === 'history'} onClick={() => setActiveTab('history')}
          role="tab" aria-selected={activeTab === 'history'} aria-controls="tab-history">
          <Dumbbell size={16} /> History
        </Tab>
        <Tab type="button" $active={activeTab === 'charts'} onClick={() => setActiveTab('charts')}
          role="tab" aria-selected={activeTab === 'charts'} aria-controls="tab-charts">
          <BarChart3 size={16} /> Charts
        </Tab>
        <Tab type="button" $active={activeTab === 'prs'} onClick={() => setActiveTab('prs')}
          role="tab" aria-selected={activeTab === 'prs'} aria-controls="tab-prs">
          <Trophy size={16} /> PRs
        </Tab>
      </TabBar>

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
              data.sessions.map((session) => {
                const isExpanded = expandedSessions.has(session.id);
                  const exerciseGroups = groupSessionLogs(session);
                  return (
                    <SessionCard key={session.id}>
                    <SessionHeader>
                      <SessionToggleButton
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        aria-expanded={isExpanded}
                      >
                        <div>
                          <SessionTitle>{session.title}</SessionTitle>
                          <SessionMeta>
                            <MetaChip>
                              {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </MetaChip>
                            {session.duration > 0 && (
                              <MetaChip><Clock size={12} /> {session.duration}min</MetaChip>
                            )}
                            <MetaChip><Dumbbell size={12} /> {exerciseGroups.length} exercises</MetaChip>
                            {session.intensity > 0 && (
                              <MetaChip><Target size={12} /> {session.intensity}/10</MetaChip>
                            )}
                          </SessionMeta>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </SessionToggleButton>
                      <SessionHeaderActions>
                        <ShareIconBtn type="button" onClick={() => setShareSession(session)}
                          aria-label={`Share ${session.title} to social feed`}>
                          <Share2 size={12} /> Share
                        </ShareIconBtn>
                      </SessionHeaderActions>
                    </SessionHeader>

                    {isExpanded && (() => {
                      // Phase 13.1: when this session is being edited, the
                      // source of truth is editLogs; otherwise it's the
                      // analytics-derived session.logs. Re-group the active
                      // log set so column visibility flags reflect the live
                      // edit buffer (e.g. adding a tempo value lights up the
                      // Tempo column immediately).
                      const isEditing = editingSessionId === session.id;
                      const activeLogs: WorkoutLogEntry[] = isEditing ? editLogs : session.logs;
                      const hasTempo = activeLogs.some(l => l.tempo);
                      const hasRest = activeLogs.some(l => l.rest && l.rest > 0);
                      const hasRPE = activeLogs.some(l => l.rpe && l.rpe > 0);
                      const hasWeight = activeLogs.some(l => l.weight > 0);
                      // Group by exercise name for table rendering. This
                      // mirrors the non-editing groupLogs output shape but
                      // operates on whichever buffer is authoritative.
                      const editGroups = new Map<string, WorkoutLogEntry[]>();
                      for (const l of activeLogs) {
                        if (!editGroups.has(l.exerciseName)) editGroups.set(l.exerciseName, []);
                        editGroups.get(l.exerciseName)!.push(l);
                      }
                      return (
                        <ExerciseTableViewport>
                          {isEditing && saveError && (
                            <EditErrorBar data-testid={`edit-error-${session.id}`}>
                              <AlertTriangle size={14} />
                              <span>{saveError}</span>
                            </EditErrorBar>
                          )}
                          <ExerciseTable>
                            <thead>
                              <tr>
                                <Th>Exercise</Th>
                                <Th>Set</Th>
                                <Th>Reps</Th>
                                <Th>Weight</Th>
                                {hasTempo && <Th>Tempo</Th>}
                                {hasRest && <Th>Rest</Th>}
                                {hasRPE && <Th>RPE</Th>}
                                {!isEditing && hasWeight && <Th>Est. 1RM</Th>}
                                {isEditing && <Th aria-label="Row actions">{' '}</Th>}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(editGroups.entries()).map(([exerciseName, groupSets]) =>
                                groupSets.map((log, idx) => {
                                  // logIndex is the position in the FLAT
                                  // activeLogs array — editing handlers
                                  // address rows by flat index.
                                  const logIndex = activeLogs.indexOf(log);
                                  return (
                                    <tr key={`${exerciseName}-${log.id ?? idx}-${log.setNumber}`}>
                                      {idx === 0 && (
                                        <ExerciseNameCell rowSpan={groupSets.length}>
                                          {exerciseName}
                                        </ExerciseNameCell>
                                      )}
                                      <Td>{idx + 1}</Td>
                                      <Td>
                                        {isEditing ? (
                                          <EditCellInput
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            value={log.reps ?? ''}
                                            data-testid={`edit-reps-${logIndex}`}
                                            onChange={(e) => updateEditField(logIndex, 'reps', e.target.value)}
                                          />
                                        ) : (
                                          log.reps
                                        )}
                                      </Td>
                                      <Td>
                                        {isEditing ? (
                                          <EditCellInput
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step={0.5}
                                            value={log.weight ?? ''}
                                            data-testid={`edit-weight-${logIndex}`}
                                            onChange={(e) => updateEditField(logIndex, 'weight', e.target.value)}
                                          />
                                        ) : (
                                          <WeightCell>{log.weight > 0 ? `${log.weight} lbs` : 'BW'}</WeightCell>
                                        )}
                                      </Td>
                                      {hasTempo && (
                                        <Td>
                                          {isEditing ? (
                                            <EditCellInput
                                              type="text"
                                              value={log.tempo ?? ''}
                                              placeholder="1/1/0"
                                              data-testid={`edit-tempo-${logIndex}`}
                                              onChange={(e) => updateEditField(logIndex, 'tempo', e.target.value)}
                                            />
                                          ) : (
                                            <TempoCell>{log.tempo || '—'}</TempoCell>
                                          )}
                                        </Td>
                                      )}
                                      {hasRest && (
                                        <Td>
                                          {isEditing ? (
                                            <EditCellInput
                                              type="number"
                                              inputMode="numeric"
                                              min={0}
                                              value={log.rest ?? ''}
                                              data-testid={`edit-rest-${logIndex}`}
                                              onChange={(e) => updateEditField(logIndex, 'rest', e.target.value)}
                                            />
                                          ) : (
                                            log.rest ? `${log.rest}s` : '—'
                                          )}
                                        </Td>
                                      )}
                                      {hasRPE && (
                                        <Td>
                                          {isEditing ? (
                                            <EditCellInput
                                              type="number"
                                              inputMode="numeric"
                                              min={0}
                                              max={10}
                                              value={log.rpe ?? ''}
                                              data-testid={`edit-rpe-${logIndex}`}
                                              onChange={(e) => updateEditField(logIndex, 'rpe', e.target.value)}
                                            />
                                          ) : (
                                            log.rpe ? <RPECell $value={log.rpe}>{log.rpe}/10</RPECell> : '—'
                                          )}
                                        </Td>
                                      )}
                                      {!isEditing && hasWeight && (
                                        <Td>
                                          <OneRMCell>
                                            {calcBrzycki1RM(log.weight, log.reps) > 0
                                              ? `${calcBrzycki1RM(log.weight, log.reps)} lbs`
                                              : '—'}
                                          </OneRMCell>
                                        </Td>
                                      )}
                                      {isEditing && (
                                        <Td>
                                          <EditBtn
                                            type="button"
                                            $variant="danger"
                                            onClick={() => removeEditRow(logIndex)}
                                            aria-label={`Remove set ${idx + 1} of ${exerciseName}`}
                                            data-testid={`edit-remove-${logIndex}`}
                                          >
                                            <Trash2 size={12} />
                                          </EditBtn>
                                        </Td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </ExerciseTable>

                          {/* Phase 15.0/15.1: per-exercise notes block.
                              Reads `exerciseNote` directly from any row in
                              the group (all rows in a group carry the same
                              canonical value after the backend stamps them).

                              Legacy fallback scope — NARROW BY DESIGN:
                              only the ` · Coach: ` separator form of the
                              Phase 13.2 encoding is auto-split via
                              resolveExerciseNote. A bare `Coach: X` prefix
                              is treated as a plain set note — classification
                              safety requires we never promote it, because
                              a trainer's own set note like "Coach: said
                              this was heavy" would otherwise be misread as
                              an exercise-level observation.

                              Set notes are rendered verbatim: a trainer
                              note that begins with `Coach:` shows that
                              prefix in the set row, never a Coach line,
                              unless the separator form made it unambiguous.

                              Edit mode: the Coach input updates the entire
                              exercise group via updateExerciseNoteForGroup;
                              set note inputs update only their own row
                              without any merge/split string acrobatics. */}
                          {Array.from(editGroups.entries()).map(([exerciseName, groupSets]) => {
                            const resolved = resolveExerciseNote(groupSets);
                            const exerciseNoteValue = resolved.exerciseNote;
                            const isLegacy = resolved.source === 'legacy';

                            // For display, if the group is legacy-encoded we
                            // must strip the legacy marker off each row's
                            // visible set note so it doesn't double up with
                            // the Coach line. For canonical rows the set
                            // note renders verbatim — including a real
                            // trainer note that starts with "Coach:".
                            const perSetDisplay = groupSets.map((log) => {
                              if (isLegacy) {
                                const split = splitLegacyStoredNote(log.notes);
                                return {
                                  log,
                                  logIndex: activeLogs.indexOf(log),
                                  setNote: split.setNote,
                                };
                              }
                              return {
                                log,
                                logIndex: activeLogs.indexOf(log),
                                setNote: typeof log.notes === 'string' ? log.notes.trim() : '',
                              };
                            });
                            const setNotesPresent = perSetDisplay.some((r) => r.setNote.length > 0);
                            const anyNoteAtAll = setNotesPresent || exerciseNoteValue.length > 0;

                            return (
                              <NotesBlock
                                key={`notes-${session.id}-${exerciseName}`}
                                data-testid={`notes-block-${session.id}-${exerciseName}`}
                              >
                                <NotesLabel>
                                  <span>{exerciseName} — Notes</span>
                                </NotesLabel>

                                {isEditing ? (
                                  <>
                                    <ExerciseNoteEditRow>
                                      <strong>Coach</strong>
                                      <input
                                        type="text"
                                        placeholder="Exercise-level observation (e.g. knees caved on last set)"
                                        value={exerciseNoteValue}
                                        data-testid={`edit-notes-exercise-${session.id}-${exerciseName}`}
                                        onChange={(e) =>
                                          updateExerciseNoteForGroup(exerciseName, e.target.value)
                                        }
                                      />
                                    </ExerciseNoteEditRow>
                                    {perSetDisplay.map((row, i) => (
                                      <NotesEditRow key={`edit-note-row-${row.logIndex}`}>
                                        <strong>Set {i + 1}</strong>
                                        <input
                                          type="text"
                                          placeholder="Set-specific note"
                                          value={row.setNote}
                                          data-testid={`edit-notes-set-${row.logIndex}`}
                                          onChange={(e) =>
                                            updateEditField(row.logIndex, 'notes', e.target.value)
                                          }
                                        />
                                      </NotesEditRow>
                                    ))}
                                  </>
                                ) : anyNoteAtAll ? (
                                  <>
                                    {exerciseNoteValue && (
                                      <NotesItem data-testid={`notes-exercise-${session.id}-${exerciseName}`}>
                                        <strong>Coach</strong>
                                        <span>{exerciseNoteValue}</span>
                                      </NotesItem>
                                    )}
                                    {perSetDisplay.map((row, i) =>
                                      row.setNote ? (
                                        <NotesItem key={`note-row-${row.logIndex}`}>
                                          <strong>Set {i + 1}</strong>
                                          <span>{row.setNote}</span>
                                        </NotesItem>
                                      ) : null,
                                    )}
                                  </>
                                ) : (
                                  <NotesItem $muted data-testid={`notes-empty-${session.id}-${exerciseName}`}>
                                    <span>None given</span>
                                  </NotesItem>
                                )}
                              </NotesBlock>
                            );
                          })}

                          {isEditing && (
                            <AddSetRow>
                              {Array.from(editGroups.keys()).map((exerciseName) => (
                                <EditBtn
                                  type="button"
                                  key={`add-set-${exerciseName}`}
                                  $variant="addSet"
                                  onClick={() => addEditRow(exerciseName)}
                                  data-testid={`edit-add-set-${exerciseName}`}
                                >
                                  <Plus size={12} /> Add set to {exerciseName}
                                </EditBtn>
                              ))}
                            </AddSetRow>
                          )}
                          <SessionTotals>
                            <TotalLabel>
                              Vol: <TotalValue>{Math.round(session.totalWeight).toLocaleString()} lbs</TotalValue>
                            </TotalLabel>
                            <TotalLabel>
                              Sets: <TotalValue>{session.totalSets}</TotalValue>
                            </TotalLabel>
                            <TotalLabel>
                              Reps: <TotalValue>{session.totalReps}</TotalValue>
                            </TotalLabel>
                          </SessionTotals>
                          {session.notes && (
                            <SessionNotes>
                              {session.notes}
                            </SessionNotes>
                          )}
                          <EditActionBar>
                            {isEditing ? (
                              <>
                                <EditBtn
                                  type="button"
                                  $variant="cancel"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  data-testid={`edit-cancel-${session.id}`}
                                >
                                  <XIcon size={14} /> Cancel
                                </EditBtn>
                                <EditBtn
                                  type="button"
                                  $variant="save"
                                  onClick={() => saveEdit(session.id)}
                                  disabled={saving || editLogs.length === 0}
                                  data-testid={`edit-save-${session.id}`}
                                >
                                  <Save size={14} />
                                  {saving ? 'Saving…' : 'Save changes'}
                                </EditBtn>
                              </>
                            ) : (
                              <EditBtn
                                type="button"
                                $variant="edit"
                                onClick={() => startEdit(session)}
                                data-testid={`edit-start-${session.id}`}
                              >
                                <Edit3 size={14} /> Edit workout
                              </EditBtn>
                            )}
                          </EditActionBar>
                        </ExerciseTableViewport>
                      );
                    })()}
                  </SessionCard>
                );
              })
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
          <>
            {sortedPersonalRecords.length === 0 ? (
              <EmptyState>
                <Trophy size={40} />
                <p>No personal records yet</p>
              </EmptyState>
            ) : (
              sortedPersonalRecords
                .map((pr) => (
                  <PRCard key={getPersonalRecordKey(pr)}>
                    <PRDetails>
                      <PRExerciseName>
                        {pr.exercise}
                      </PRExerciseName>
                      <PRDateText>
                        {pr.date ? new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </PRDateText>
                    </PRDetails>
                    <PRActionRow>
                      <PRBadge>
                        <Trophy size={14} />
                        {pr.weight > 0 ? `${pr.weight} lbs` : 'BW'} × {pr.reps}
                      </PRBadge>
                      {pr.estimated1RM && pr.estimated1RM > 0 && (
                        <PREstimate>
                          Est. 1RM: {pr.estimated1RM} lbs
                        </PREstimate>
                      )}
                      <ShareIconBtn
                        type="button"
                        aria-label={`Share ${pr.exercise} personal record`}
                        onClick={() => setShareSession({
                          id: `pr-${pr.exercise}`,
                          title: pr.exercise,
                          date: pr.date,
                          duration: 0,
                          intensity: 0,
                          status: 'completed',
                          totalSets: 0,
                          totalReps: pr.reps,
                          totalWeight: pr.weight,
                          logs: [],
                        } as WorkoutSession)}>
                        <Share2 size={12} /> Share
                      </ShareIconBtn>
                    </PRActionRow>
                  </PRCard>
                ))
            )}
          </>
        )}
      </ScrollBody>

      {/* Share to Social Feed — rendered as a sibling (NOT nested inside a
          backdrop-filter container) to keep position:fixed semantics intact.
          Both modal and embedded call sites inherit this safe placement. */}
      <ShareToFeedModal
        open={!!shareSession}
        onClose={() => setShareSession(null)}
        postType={shareSession?.id.startsWith('pr-') ? 'achievement' : 'workout'}
        workoutSessionId={shareSession && !shareSession.id.startsWith('pr-') ? shareSession.id : undefined}
        prefilledContent={shareSession
          ? shareSession.id.startsWith('pr-')
            ? `New Personal Record! ${clientName} hit ${shareSession.totalWeight} lbs x ${shareSession.totalReps} reps on ${shareSession.title}!`
            : `${clientName} crushed a ${shareSession.title} workout! ${shareSession.logs.length} exercises, ${Math.round(shareSession.totalWeight).toLocaleString()} lbs total volume.`
          : ''
        }
      />
    </>
  );
};

export default WorkoutHistoryPanel;
