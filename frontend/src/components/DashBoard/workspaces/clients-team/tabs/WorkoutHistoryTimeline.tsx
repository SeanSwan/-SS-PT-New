/**
 * ┌─── SUB-COMPONENT: WorkoutHistoryTimeline ─────────────────┐
 * │ PARENT: TrainingTabContent (replaces Vault History placeholder) │
 * │ PURPOSE: Chronological workout history with expandable exercises│
 * │          + inline edit capability via PATCH API                  │
 * │ Props: { clientId, clientName }                                 │
 * └────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Calendar, ChevronDown, ChevronRight, Edit3, Save, X, Dumbbell, Clock, Flame, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ActionRow,
  AddSetButton,
  Container,
  DateBadge,
  EditInput,
  EmptyIcon,
  EmptyState,
  EmptyText,
  EmptyTitle,
  ExerciseGroup,
  ExerciseList,
  ExerciseName,
  Header,
  MetaItem,
  SetHeaderRow,
  SetLabel,
  SetNote,
  SetRow,
  SmallBtn,
  StatusBadge,
  Title,
  TitleIcon,
  WorkoutCard,
  WorkoutHeader,
  WorkoutInfo,
  WorkoutMeta,
  WorkoutTitle,
} from './WorkoutHistoryTimeline.styles';

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
interface WorkoutLog {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
}

interface Workout {
  id: string;
  title: string;
  date: string;
  duration: number;
  intensity: number;
  status: string;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  logs: WorkoutLog[];
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
interface WorkoutHistoryTimelineProps {
  clientId: number | string;
  clientName?: string;
}

const WorkoutHistoryTimeline: React.FC<WorkoutHistoryTimelineProps> = ({ clientId, clientName }) => {
  const { authAxios } = useAuth() as any;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLogs, setEditLogs] = useState<WorkoutLog[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authAxios || !clientId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await authAxios.get(`/api/admin/clients/${clientId}/workouts`, { params: { limit: 50 } });
        if (res.data.success) setWorkouts(res.data.workouts || []);
      } catch (err) {
        console.warn('Failed to fetch workout history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [authAxios, clientId]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setEditingId(null);
  }, []);

  const startEdit = useCallback((workout: Workout) => {
    setEditingId(workout.id);
    setEditLogs([...workout.logs]);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditLogs([]);
  }, []);

  const updateLog = useCallback((logIndex: number, field: string, value: string) => {
    setEditLogs(prev => prev.map((l, i) => i === logIndex ? { ...l, [field]: field === 'exerciseName' || field === 'notes' ? value : Number(value) || 0 } : l));
  }, []);

  const removeLog = useCallback((logIndex: number) => {
    setEditLogs(prev => prev.filter((_, i) => i !== logIndex));
  }, []);

  const addSet = useCallback((exerciseName: string) => {
    const existing = editLogs.filter(l => l.exerciseName === exerciseName);
    const nextSet = existing.length + 1;
    setEditLogs(prev => [...prev, {
      id: -Date.now(), exerciseName, setNumber: nextSet, reps: 0, weight: 0
    }]);
  }, [editLogs]);

  const saveEdit = useCallback(async (workoutId: string) => {
    if (!authAxios) return;
    setSaving(true);
    try {
      // Group logs by exercise for the PATCH payload
      const exerciseMap = new Map<string, WorkoutLog[]>();
      for (const log of editLogs) {
        if (!exerciseMap.has(log.exerciseName)) exerciseMap.set(log.exerciseName, []);
        exerciseMap.get(log.exerciseName)!.push(log);
      }

      const exercises = Array.from(exerciseMap.entries()).map(([name, sets]) => ({
        name,
        sets: sets.map((s, i) => ({
          setNumber: i + 1,
          reps: s.reps,
          weight: s.weight,
          tempo: s.tempo || undefined,
          rest: s.rest || undefined,
          rpe: s.rpe || undefined,
          notes: s.notes || undefined,
        })),
      }));

      const res = await authAxios.patch(`/api/admin/clients/${clientId}/workouts/${workoutId}`, { exercises });
      if (res.data.success) {
        // Update local state with response
        setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...res.data.workout } : w));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to save workout edit:', err);
    } finally {
      setSaving(false);
    }
  }, [authAxios, clientId, editLogs]);

  const groupLogs = (logs: WorkoutLog[]) => {
    const groups: { name: string; sets: WorkoutLog[] }[] = [];
    const seen = new Map<string, WorkoutLog[]>();
    for (const log of logs) {
      if (!seen.has(log.exerciseName)) {
        seen.set(log.exerciseName, []);
        groups.push({ name: log.exerciseName, sets: seen.get(log.exerciseName)! });
      }
      seen.get(log.exerciseName)!.push(log);
    }
    return groups;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <EmptyState>Loading workout history...</EmptyState>;
  if (workouts.length === 0) return (
    <EmptyState>
      <EmptyIcon><Dumbbell size={40} /></EmptyIcon>
      <EmptyTitle>No workouts logged yet</EmptyTitle>
      <EmptyText>Log a workout or import from another platform via the Swan Coach</EmptyText>
    </EmptyState>
  );

  return (
    <Container>
      <Header>
        <Title>
          <TitleIcon><Calendar size={20} /></TitleIcon>
          Workout History ({workouts.length})
        </Title>
      </Header>

      {workouts.map(w => {
        const isExpanded = expandedId === w.id;
        const isEditing = editingId === w.id;
        const logs = isEditing ? editLogs : w.logs;
        const groups = groupLogs(logs);

        return (
          <WorkoutCard key={w.id}>
            <WorkoutHeader type="button" onClick={() => toggleExpand(w.id)}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <DateBadge>{formatDate(w.date)}</DateBadge>
              <WorkoutInfo>
                <WorkoutTitle>{w.title}</WorkoutTitle>
                <WorkoutMeta>
                  <MetaItem><Clock size={11} /> {w.duration} min</MetaItem>
                  <MetaItem><Flame size={11} /> RPE {w.intensity}/10</MetaItem>
                  <MetaItem><Dumbbell size={11} /> {w.totalSets} sets · {w.totalReps} reps</MetaItem>
                  {w.totalWeight > 0 && <MetaItem>{Math.round(w.totalWeight).toLocaleString()} lbs</MetaItem>}
                </WorkoutMeta>
              </WorkoutInfo>
              <StatusBadge $status={w.status}>{w.status}</StatusBadge>
            </WorkoutHeader>

            {isExpanded && (
              <>
                <ExerciseList>
                  <SetHeaderRow>
                    <div>Set</div>
                    <div>Reps</div>
                    <div>Weight</div>
                    <div>RPE</div>
                    <div>Notes</div>
                  </SetHeaderRow>

                  {groups.map(group => (
                    <ExerciseGroup key={group.name}>
                      <ExerciseName>{group.name}</ExerciseName>
                      {group.sets.map((set, si) => (
                        <SetRow key={`${set.id}-${si}`}>
                          <SetLabel>#{set.setNumber}</SetLabel>
                          {isEditing ? (
                            <>
                              <EditInput type="number" value={set.reps} onChange={e => updateLog(logs.indexOf(set), 'reps', e.target.value)} />
                              <EditInput type="number" value={set.weight} onChange={e => updateLog(logs.indexOf(set), 'weight', e.target.value)} />
                              <EditInput type="number" value={set.rpe || ''} onChange={e => updateLog(logs.indexOf(set), 'rpe', e.target.value)} placeholder="—" />
                              <SmallBtn type="button" $variant="danger" onClick={() => removeLog(logs.indexOf(set))} title="Remove set">
                                <Trash2 size={12} />
                              </SmallBtn>
                            </>
                          ) : (
                            <>
                              <div>{set.reps}</div>
                              <div>{set.weight > 0 ? `${set.weight} lbs` : '—'}</div>
                              <div>{set.rpe || '—'}</div>
                              <SetNote>{set.notes || ''}</SetNote>
                            </>
                          )}
                        </SetRow>
                      ))}
                      {isEditing && (
                        <AddSetButton type="button" onClick={() => addSet(group.name)}>
                          <Plus size={12} /> Add Set
                        </AddSetButton>
                      )}
                    </ExerciseGroup>
                  ))}
                </ExerciseList>

                <ActionRow>
                  {isEditing ? (
                    <>
                      <SmallBtn type="button" onClick={cancelEdit}><X size={12} /> Cancel</SmallBtn>
                      <SmallBtn type="button" $variant="save" onClick={() => saveEdit(w.id)} disabled={saving}>
                        <Save size={12} /> {saving ? 'Saving...' : 'Save Changes'}
                      </SmallBtn>
                    </>
                  ) : (
                    <SmallBtn type="button" onClick={() => startEdit(w)}>
                      <Edit3 size={12} /> Edit Workout
                    </SmallBtn>
                  )}
                </ActionRow>
              </>
            )}
          </WorkoutCard>
        );
      })}
    </Container>
  );
};

export default memo(WorkoutHistoryTimeline);
