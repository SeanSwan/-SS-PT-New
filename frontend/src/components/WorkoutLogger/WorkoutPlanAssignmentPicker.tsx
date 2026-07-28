/**
 * WorkoutPlanAssignmentPicker
 * ===========================
 * In-logger selector for generated plan days returned by the current-plan API.
 * Non-current days load as draft exercises only; current active assignments may
 * submit plannedAssignment metadata through the existing save guard.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Download, ListChecks, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ApiService } from '../../services/api.service';
import { CS, withAlpha } from './WorkoutLoggerCS';
import type { CurrentWorkoutPlanResponse, PlanAssignmentPickerItem } from './WorkoutLogger.localTypes';

interface WorkoutPlanAssignmentPickerProps {
  clientId?: number;
  disabled?: boolean;
  onApplyAssignment: (assignment: PlanAssignmentPickerItem) => void;
}

const assignmentListFrom = (payload: CurrentWorkoutPlanResponse | null): PlanAssignmentPickerItem[] => {
  const candidate = payload?.assignmentPicker
    || payload?.data?.assignmentPicker
    || payload?.plan?.assignmentPicker
    || [];
  return Array.isArray(candidate) ? candidate : [];
};

const assignmentOptionLabel = (assignment: PlanAssignmentPickerItem): string => {
  const plan = assignment.planTitle || 'Plan';
  const week = assignment.weekNumber ? `W${assignment.weekNumber}` : 'W?';
  const day = assignment.dayNumber ? `D${assignment.dayNumber}` : 'D?';
  const label = assignment.dayLabel || assignment.title || 'Generated day';
  const mode = assignment.canSubmitPlannedAssignment ? 'current' : 'draft';
  return `${plan} - ${week}/${day} - ${label} (${mode})`;
};

const firstSelectableId = (assignments: PlanAssignmentPickerItem[]): string => (
  assignments.find((item) => item.isCurrent && item.isLoadable !== false)?.id
  || assignments.find((item) => item.isLoadable !== false)?.id
  || assignments[0]?.id
  || ''
);

const WorkoutPlanAssignmentPicker: React.FC<WorkoutPlanAssignmentPickerProps> = ({
  clientId,
  disabled = false,
  onApplyAssignment,
}) => {
  const [assignments, setAssignments] = useState<PlanAssignmentPickerItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedId) || null,
    [assignments, selectedId],
  );

  const loadAssignments = useCallback(async () => {
    if (typeof clientId !== 'number') {
      setAssignments([]);
      setSelectedId('');
      setStatus('No client selected.');
      return;
    }

    setLoading(true);
    try {
      const api = new ApiService();
      const response = await api.get(`/api/workouts/${clientId}/current`);
      const payload = (response?.data ?? response) as CurrentWorkoutPlanResponse;
      const nextAssignments = assignmentListFrom(payload);
      setAssignments(nextAssignments);
      setSelectedId((current) => (
        nextAssignments.some((assignment) => assignment.id === current)
          ? current
          : firstSelectableId(nextAssignments)
      ));
      setStatus(nextAssignments.length ? `${nextAssignments.length} generated plan days loaded.` : 'No generated plan days found.');
    } catch (error) {
      setAssignments([]);
      setSelectedId('');
      setStatus('Generated plan days could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const handleApply = useCallback(() => {
    if (!selectedAssignment) {
      toast.info('Select a generated plan day first.');
      return;
    }
    if (selectedAssignment.isLoadable === false) {
      toast.info('That generated day is not loadable.');
      return;
    }
    onApplyAssignment(selectedAssignment);
  }, [onApplyAssignment, selectedAssignment]);

  if (assignments.length === 0 && !loading) return null;

  return (
    <PickerShell aria-label="Generated workout plan day picker">
      <PickerTitle>
        <ListChecks size={16} aria-hidden="true" />
        Generated plan days
      </PickerTitle>
      <PickerControls>
        <PlanSelect
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          disabled={disabled || loading || assignments.length === 0}
          aria-label="Generated plan day"
        >
          {assignments.map((assignment) => (
            <option
              key={assignment.id}
              value={assignment.id}
              disabled={assignment.isLoadable === false}
            >
              {assignmentOptionLabel(assignment)}
            </option>
          ))}
        </PlanSelect>
        <IconButton type="button" onClick={loadAssignments} disabled={disabled || loading} aria-label="Refresh generated plan days">
          <RefreshCw size={16} aria-hidden="true" />
        </IconButton>
        <LoadButton type="button" onClick={handleApply} disabled={disabled || loading || !selectedAssignment}>
          <Download size={16} aria-hidden="true" />
          Load Selected
        </LoadButton>
      </PickerControls>
      {status && <StatusText role="status" aria-live="polite">{status}</StatusText>}
    </PickerShell>
  );
};

export default WorkoutPlanAssignmentPicker;

const PickerShell = styled.div`
  display: grid;
  gap: 0.7rem;
  margin: 0.75rem 0 1rem;
  padding: 0.85rem;
  border: 1px solid ${CS.glassBorder};
  border-radius: 8px;
  background: linear-gradient(135deg, ${withAlpha(CS.gaming, 0.08)}, ${withAlpha(CS.secondary, 0.05)}), ${CS.card};
`;

const PickerTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;

  svg { color: ${CS.gaming}; }
`;

const PickerControls = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px auto;
  gap: 0.55rem;
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 1fr 44px;

    button:last-child {
      grid-column: 1 / -1;
    }
  }
`;

const PlanSelect = styled.select`
  width: 100%;
  min-height: 44px;
  border: 1px solid ${CS.border};
  border-radius: 8px;
  background: ${CS.inputBg};
  color: ${CS.text};
  padding: 0 0.8rem;
  font-size: 0.88rem;
  min-width: 0;

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }
`;

const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 1px solid ${CS.border};
  border-radius: 8px;
  background: ${withAlpha(CS.gaming, 0.1)};
  color: ${CS.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.55; }
  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 2px; }
`;

const LoadButton = styled(IconButton)`
  width: auto;
  padding: 0 0.9rem;
  gap: 0.45rem;
  background: linear-gradient(135deg, ${CS.tertiary}, ${CS.secondary});
  border-color: ${withAlpha(CS.gaming, 0.35)};
  font-weight: 700;
`;

const StatusText = styled.p`
  margin: 0;
  color: ${CS.textMuted};
  font-size: 0.78rem;
`;
