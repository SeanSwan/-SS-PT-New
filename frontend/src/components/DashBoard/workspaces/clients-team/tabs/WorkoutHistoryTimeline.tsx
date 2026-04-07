/**
 * ┌─── SUB-COMPONENT: WorkoutHistoryTimeline ─────────────────┐
 * │ PARENT: TrainingTabContent (replaces Vault History placeholder) │
 * │ PURPOSE: Chronological workout history with expandable exercises│
 * │          + inline edit capability via PATCH API                  │
 * │ Props: { clientId, clientName }                                 │
 * └────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Calendar, ChevronDown, ChevronRight, Edit3, Save, X, Dumbbell, Clock, Flame, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
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
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WorkoutCard = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  background: var(--bg-surface, #1A1A24);
  margin-bottom: 12px;
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
`;

const WorkoutHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent); }
`;

const DateBadge = styled.div`
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const WorkoutInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkoutTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WorkoutMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  display: flex;
  gap: 12px;
  margin-top: 2px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ExerciseList = styled.div`
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

const ExerciseGroup = styled.div`
  margin-top: 10px;
`;

const ExerciseName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  margin-bottom: 4px;
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: 40px 70px 70px 60px auto;
  gap: 6px;
  align-items: center;
  padding: 3px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const SetLabel = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-size: 11px;
`;

const EditInput = styled.input`
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  text-align: center;

  &:focus { outline: none; box-shadow: 0 0 6px rgba(96, 192, 240, 0.3); }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px 12px;
  justify-content: flex-end;
`;

const SmallBtn = styled.button<{ $variant?: 'save' | 'cancel' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  min-height: 32px;
  ${({ $variant }) => {
    if ($variant === 'save') return `background: rgba(96,192,240,0.15); color: #60C0F0;`;
    if ($variant === 'danger') return `background: rgba(201,42,84,0.15); color: #C92A54;`;
    return `background: rgba(224,236,244,0.08); color: rgba(224,236,244,0.6);`;
  }}
  &:hover { opacity: 0.8; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px;
  text-align: center;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  ${({ $status }) => {
    if ($status === 'completed') return `background: rgba(16,185,129,0.15); color: #10B981;`;
    if ($status === 'planned') return `background: rgba(59,130,246,0.15); color: #3B82F6;`;
    if ($status === 'skipped') return `background: rgba(107,114,128,0.15); color: #6B7280;`;
    return `background: rgba(224,236,244,0.08); color: rgba(224,236,244,0.85);`;
  }}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
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

  // Fetch workout history
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

  // Group logs by exercise name
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
      <Dumbbell size={40} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 16, fontWeight: 600 }}>No workouts logged yet</div>
      <div style={{ fontSize: 13 }}>Log a workout or import from another platform via the Swan Coach</div>
    </EmptyState>
  );

  return (
    <Container>
      <Header>
        <Title>
          <Calendar size={20} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
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
            <WorkoutHeader onClick={() => toggleExpand(w.id)}>
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
                  <SetRow style={{ fontWeight: 700, fontSize: 10, color: 'rgba(224,236,244,0.75)', marginBottom: 4 }}>
                    <div>Set</div>
                    <div>Reps</div>
                    <div>Weight</div>
                    <div>RPE</div>
                    <div>Notes</div>
                  </SetRow>

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
                              <SmallBtn $variant="danger" onClick={() => removeLog(logs.indexOf(set))} title="Remove set">
                                <Trash2 size={12} />
                              </SmallBtn>
                            </>
                          ) : (
                            <>
                              <div>{set.reps}</div>
                              <div>{set.weight > 0 ? `${set.weight} lbs` : '—'}</div>
                              <div>{set.rpe || '—'}</div>
                              <div style={{ color: 'rgba(224,236,244,0.75)', fontSize: 11 }}>{set.notes || ''}</div>
                            </>
                          )}
                        </SetRow>
                      ))}
                      {isEditing && (
                        <SmallBtn onClick={() => addSet(group.name)} style={{ marginTop: 4 }}>
                          <Plus size={12} /> Add Set
                        </SmallBtn>
                      )}
                    </ExerciseGroup>
                  ))}
                </ExerciseList>

                <ActionRow>
                  {isEditing ? (
                    <>
                      <SmallBtn onClick={cancelEdit}><X size={12} /> Cancel</SmallBtn>
                      <SmallBtn $variant="save" onClick={() => saveEdit(w.id)} disabled={saving}>
                        <Save size={12} /> {saving ? 'Saving...' : 'Save Changes'}
                      </SmallBtn>
                    </>
                  ) : (
                    <SmallBtn onClick={() => startEdit(w)}>
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
