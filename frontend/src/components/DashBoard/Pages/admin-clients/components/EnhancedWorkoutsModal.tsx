/**
 * ┌─── SUB-COMPONENT: EnhancedWorkoutsModal ───────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Full workout history with exercise details,        │
 * │          Victory charts, and personal records               │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────┐            │
 * │ │ Workouts — Client Name                 [X]   │            │
 * │ │ [Summary Stats: 7 workouts | 67 exercises]   │            │
 * │ │ [History] [Charts] [PRs]                     │            │
 * │ │ ┌── History Tab ──────────────────────────┐  │            │
 * │ │ │ Session Title — 3/5/2026               │  │            │
 * │ │ │ ┌ Exercise    Sets Reps Weight ────────┐│  │            │
 * │ │ │ │ Leg Press   3    12   180 lbs        ││  │            │
 * │ │ │ │ Hip Add.    3    15   90 lbs         ││  │            │
 * │ │ │ └──────────────────────────────────────┘│  │            │
 * │ │ └────────────────────────────────────────┘  │            │
 * │ └──────────────────────────────────────────────┘            │
 * │ Props: { open, clientId, clientName, onClose }              │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Tab] → switches between History/Charts/PRs views           │
 * │ [Session card] → expands to show exercise detail table      │
 * │ DATA FLOW: useWorkoutAnalytics(clientId) → analytics API    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, lazy, Suspense } from 'react';
import styled from 'styled-components';
import {
  X, Dumbbell, Clock, Target, Trophy, BarChart3,
  ChevronDown, ChevronUp, Flame, Activity, Share2,
} from 'lucide-react';
import ShareToFeedModal from '../../../../Shared/ShareToFeedModal';
import {
  ModalOverlay, ModalPanel, ModalHeader, ModalTitle,
  CloseButton, ModalBody, CenterContent, Spinner,
} from './copilot-shared-styles';
import { useWorkoutAnalytics, type WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';

const WorkoutChartsTab = lazy(() => import('./WorkoutChartsTab'));

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const WidePanel = styled.div`
  background: var(--bg-elevated, rgba(10, 10, 15, 0.98));
  border-radius: 12px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #141419);
  }
`;

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
  color: var(--text-secondary, #94a3b8);

  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
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
  color: ${p => p.$active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)'};
  font-size: 0.875rem;
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

const ScrollBody = styled.div`
  overflow-y: auto;
  flex: 1;
  padding: 16px 24px;
  max-height: 60vh;
`;

const SessionCard = styled.div`
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover { border-color: rgba(96, 192, 240, 0.2); }
`;

const SessionHeader = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--text-primary, #E0ECF4);
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
  color: var(--text-secondary, #94a3b8);
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Td = styled.td`
  padding: 8px 12px;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`;

const WeightCell = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const PRBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #C6A84B;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.3);
`;

const PRCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(198, 168, 75, 0.15);
  border-radius: 10px;
  margin-bottom: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary, #94a3b8);

  svg { opacity: 0.4; margin-bottom: 12px; }
`;

const ShareIconBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.08);
  color: #8B5CF6;
  font-size: 0.6875rem;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  &:hover { background: rgba(139, 92, 246, 0.15); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const EnhancedWorkoutsModal: React.FC<Props> = ({ open, clientId, clientName, onClose }) => {
  const { data, isLoading, error, refetch } = useWorkoutAnalytics(open ? clientId : null);
  const [activeTab, setActiveTab] = useState<'history' | 'charts' | 'prs'>('history');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [shareSession, setShareSession] = useState<WorkoutSession | null>(null);

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group exercise logs by exercise name for display
  const groupLogs = useMemo(() => {
    return (session: WorkoutSession) => {
      const groups: Record<string, { sets: { setNumber: number; reps: number; weight: number; rpe?: number }[] }> = {};
      for (const log of session.logs) {
        if (!groups[log.exerciseName]) groups[log.exerciseName] = { sets: [] };
        groups[log.exerciseName].sets.push({
          setNumber: log.setNumber,
          reps: log.reps,
          weight: log.weight,
          rpe: log.rpe,
        });
      }
      return Object.entries(groups);
    };
  }, []);

  if (!open) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <WidePanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Dumbbell size={20} />
            Workouts — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        {/* Summary stats */}
        {data && (
          <SummaryBar>
            <StatChip><Dumbbell size={14} /> <strong>{data.summary.totalWorkouts}</strong> workouts</StatChip>
            <StatChip><Activity size={14} /> <strong>{data.summary.totalExercises}</strong> exercises</StatChip>
            <StatChip><Flame size={14} /> <strong>{Math.round(data.summary.totalVolume).toLocaleString()}</strong> lbs volume</StatChip>
            <StatChip><Target size={14} /> <strong>{data.summary.avgIntensity}</strong>/10 avg intensity</StatChip>
            <StatChip><Trophy size={14} /> <strong>{data.personalRecords.length}</strong> PRs</StatChip>
          </SummaryBar>
        )}

        {/* Tabs */}
        <TabBar>
          <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            <Dumbbell size={16} /> History
          </Tab>
          <Tab $active={activeTab === 'charts'} onClick={() => setActiveTab('charts')}>
            <BarChart3 size={16} /> Charts
          </Tab>
          <Tab $active={activeTab === 'prs'} onClick={() => setActiveTab('prs')}>
            <Trophy size={16} /> PRs
          </Tab>
        </TabBar>

        <ScrollBody>
          {isLoading && (
            <CenterContent>
              <Spinner />
              <p style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))', marginTop: '0.5rem' }}>
                Loading workout data...
              </p>
            </CenterContent>
          )}

          {error && (
            <div style={{
              padding: '1rem', background: 'rgba(201, 42, 84, 0.1)',
              border: '1px solid rgba(201, 42, 84, 0.3)', borderRadius: 8,
              color: '#E0ECF4', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{error}</span>
              <button onClick={refetch} style={{
                background: 'transparent', border: '1px solid rgba(201,42,84,0.4)',
                color: '#E0ECF4', padding: '0.4rem 0.75rem', borderRadius: 6,
                cursor: 'pointer', minHeight: 36,
              }}>
                Retry
              </button>
            </div>
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
                  const exerciseGroups = groupLogs(session);
                  return (
                    <SessionCard key={session.id}>
                      <SessionHeader onClick={() => toggleSession(session.id)}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ShareIconBtn onClick={(e) => { e.stopPropagation(); setShareSession(session); }}>
                            <Share2 size={12} /> Share
                          </ShareIconBtn>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </SessionHeader>

                      {isExpanded && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <ExerciseTable>
                            <thead>
                              <tr>
                                <Th>Exercise</Th>
                                <Th>Set</Th>
                                <Th>Reps</Th>
                                <Th>Weight</Th>
                                {session.logs.some(l => l.rpe) && <Th>RPE</Th>}
                              </tr>
                            </thead>
                            <tbody>
                              {exerciseGroups.map(([exerciseName, { sets }]) =>
                                sets.map((set, idx) => (
                                  <tr key={`${exerciseName}-${set.setNumber}`}>
                                    {idx === 0 && (
                                      <Td rowSpan={sets.length} style={{ fontWeight: 500, verticalAlign: 'top' }}>
                                        {exerciseName}
                                      </Td>
                                    )}
                                    <Td>{set.setNumber}</Td>
                                    <Td>{set.reps}</Td>
                                    <Td><WeightCell>{set.weight > 0 ? `${set.weight} lbs` : 'BW'}</WeightCell></Td>
                                    {session.logs.some(l => l.rpe) && <Td>{set.rpe || '—'}</Td>}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </ExerciseTable>
                          {session.notes && (
                            <p style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))', fontSize: '0.8125rem', marginTop: 12, fontStyle: 'italic' }}>
                              {session.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </SessionCard>
                  );
                })
              )}
            </>
          )}

          {/* CHARTS TAB */}
          {!isLoading && !error && activeTab === 'charts' && data && (
            <Suspense fallback={<CenterContent><Spinner /><p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Loading charts...</p></CenterContent>}>
              <WorkoutChartsTab data={data} />
            </Suspense>
          )}

          {/* PRs TAB */}
          {!isLoading && !error && activeTab === 'prs' && data && (
            <>
              {data.personalRecords.length === 0 ? (
                <EmptyState>
                  <Trophy size={40} />
                  <p>No personal records yet</p>
                </EmptyState>
              ) : (
                data.personalRecords
                  .sort((a, b) => b.weight - a.weight)
                  .map((pr, idx) => (
                    <PRCard key={`${pr.exercise}-${idx}`}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #E0ECF4)', marginBottom: 4 }}>
                          {pr.exercise}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94a3b8)' }}>
                          {pr.date ? new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PRBadge>
                          <Trophy size={14} />
                          {pr.weight > 0 ? `${pr.weight} lbs` : 'BW'} × {pr.reps}
                        </PRBadge>
                        <ShareIconBtn onClick={() => setShareSession({
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
                      </div>
                    </PRCard>
                  ))
              )}
            </>
          )}
        </ScrollBody>

        {/* Share Workout to Social Feed */}
        <ShareToFeedModal
          open={!!shareSession}
          onClose={() => setShareSession(null)}
          postType="workout"
          workoutSessionId={shareSession?.id}
          prefilledContent={shareSession
            ? shareSession.id.startsWith('pr-')
              ? `🏆 New Personal Record! ${clientName} hit ${shareSession.totalWeight} lbs × ${shareSession.totalReps} reps on ${shareSession.title}!`
              : `💪 ${clientName} crushed a ${shareSession.title} workout! ${shareSession.logs.length} exercises, ${Math.round(shareSession.totalWeight).toLocaleString()} lbs total volume.`
            : ''
          }
        />
      </WidePanel>
    </ModalOverlay>
  );
};

export default EnhancedWorkoutsModal;
