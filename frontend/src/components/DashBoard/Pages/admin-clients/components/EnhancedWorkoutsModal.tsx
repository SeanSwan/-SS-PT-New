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
import { useWorkoutAnalytics, calcBrzycki1RM, type WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';

const WorkoutChartsTab = lazy(() => import('./WorkoutChartsTab'));

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

/**
 * ARCHITECTURAL NOTE: WidePanel uses backdrop-filter which creates a CSS
 * containing block. Do NOT nest position:fixed modals inside this component.
 * Render modals as siblings instead (see ShareToFeedModal placement below).
 */
const WidePanel = styled.div`
  background: var(--bg-elevated, #0A0A0F);
  border-radius: 12px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 48, 128, 0.4);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #0A0A0F);
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

  // Group exercise logs by exercise name with full NASM fields
  const groupLogs = useMemo(() => {
    return (session: WorkoutSession) => {
      const groups: Record<string, { sets: { setNumber: number; reps: number; weight: number; rpe?: number; tempo?: string; rest?: number; est1RM: number }[] }> = {};
      for (const log of session.logs) {
        if (!groups[log.exerciseName]) groups[log.exerciseName] = { sets: [] };
        groups[log.exerciseName].sets.push({
          setNumber: log.setNumber,
          reps: log.reps,
          weight: log.weight,
          rpe: log.rpe,
          tempo: log.tempo,
          rest: log.rest,
          est1RM: calcBrzycki1RM(log.weight, log.reps),
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

        {/* Tabs */}
        <TabBar role="tablist" aria-label="Workout data views">
          <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}
            role="tab" aria-selected={activeTab === 'history'} aria-controls="tab-history">
            <Dumbbell size={16} /> History
          </Tab>
          <Tab $active={activeTab === 'charts'} onClick={() => setActiveTab('charts')}
            role="tab" aria-selected={activeTab === 'charts'} aria-controls="tab-charts">
            <BarChart3 size={16} /> Charts
          </Tab>
          <Tab $active={activeTab === 'prs'} onClick={() => setActiveTab('prs')}
            role="tab" aria-selected={activeTab === 'prs'} aria-controls="tab-prs">
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
                          <ShareIconBtn onClick={(e) => { e.stopPropagation(); setShareSession(session); }}
                            aria-label={`Share ${session.title} to social feed`}>
                            <Share2 size={12} /> Share
                          </ShareIconBtn>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </SessionHeader>

                      {isExpanded && (() => {
                        const hasTempo = session.logs.some(l => l.tempo);
                        const hasRest = session.logs.some(l => l.rest && l.rest > 0);
                        const hasRPE = session.logs.some(l => l.rpe && l.rpe > 0);
                        const hasWeight = session.logs.some(l => l.weight > 0);
                        return (
                          <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
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
                                  {hasWeight && <Th>Est. 1RM</Th>}
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
                                      {hasTempo && <Td><TempoCell>{set.tempo || '—'}</TempoCell></Td>}
                                      {hasRest && <Td>{set.rest ? `${set.rest}s` : '—'}</Td>}
                                      {hasRPE && <Td>{set.rpe ? <RPECell $value={set.rpe}>{set.rpe}/10</RPECell> : '—'}</Td>}
                                      {hasWeight && <Td><OneRMCell>{set.est1RM > 0 ? `${set.est1RM} lbs` : '—'}</OneRMCell></Td>}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </ExerciseTable>
                            {/* Session volume summary */}
                            <div style={{
                              display: 'flex', gap: 16, marginTop: 12, paddingTop: 8,
                              borderTop: '1px solid rgba(96, 192, 240, 0.08)',
                              fontSize: '0.75rem', fontFamily: "'Fira Code', monospace",
                            }}>
                              <span style={{ color: '#8BA8C8' }}>
                                Vol: <span style={{ color: '#60C0F0' }}>{Math.round(session.totalWeight).toLocaleString()} lbs</span>
                              </span>
                              <span style={{ color: '#8BA8C8' }}>
                                Sets: <span style={{ color: '#60C0F0' }}>{session.totalSets}</span>
                              </span>
                              <span style={{ color: '#8BA8C8' }}>
                                Reps: <span style={{ color: '#60C0F0' }}>{session.totalReps}</span>
                              </span>
                            </div>
                            {session.notes && (
                              <p style={{ color: 'var(--text-secondary, #8BA8C8)', fontSize: '0.8125rem', marginTop: 12, fontStyle: 'italic' }}>
                                {session.notes}
                              </p>
                            )}
                          </div>
                        );
                      })()}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <PRBadge>
                          <Trophy size={14} />
                          {pr.weight > 0 ? `${pr.weight} lbs` : 'BW'} × {pr.reps}
                        </PRBadge>
                        {pr.estimated1RM && pr.estimated1RM > 0 && (
                          <span style={{ fontSize: '0.6875rem', color: '#C6A84B', fontFamily: "'Fira Code', monospace" }}>
                            Est. 1RM: {pr.estimated1RM} lbs
                          </span>
                        )}
                        <ShareIconBtn
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
                      </div>
                    </PRCard>
                  ))
              )}
            </>
          )}
        </ScrollBody>

      </WidePanel>

      {/* Share to Social Feed — rendered OUTSIDE WidePanel to escape
       * backdrop-filter containing block (position:fixed modals break
       * when nested inside backdrop-filter elements). */}
      <ShareToFeedModal
        open={!!shareSession}
        onClose={() => setShareSession(null)}
        postType={shareSession?.id.startsWith('pr-') ? 'achievement' : 'workout'}
        // Only pass workoutSessionId for real workout sessions, not fabricated PR entries
        workoutSessionId={shareSession && !shareSession.id.startsWith('pr-') ? shareSession.id : undefined}
        prefilledContent={shareSession
          ? shareSession.id.startsWith('pr-')
            ? `New Personal Record! ${clientName} hit ${shareSession.totalWeight} lbs x ${shareSession.totalReps} reps on ${shareSession.title}!`
            : `${clientName} crushed a ${shareSession.title} workout! ${shareSession.logs.length} exercises, ${Math.round(shareSession.totalWeight).toLocaleString()} lbs total volume.`
          : ''
        }
      />
    </ModalOverlay>
  );
};

export default EnhancedWorkoutsModal;
