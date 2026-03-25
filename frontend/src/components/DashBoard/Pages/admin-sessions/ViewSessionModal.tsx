/**
 * ============================================================================
 * FILE: ViewSessionModal.tsx
 * PURPOSE: View session details with full workout exercise/set breakdown
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays session scheduling details AND workout
 * exercise data with per-set weight/reps/tempo/RPE when a session has
 * associated workout logs.
 *
 * HOW IT FITS IN THE APP: Admin Sessions → View button on session row
 * KEY DECISIONS: Fetches workout logs on modal open to show per-set data
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Calendar, Edit, Dumbbell, Clock, MapPin,
  User, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { ChipContainer } from './styled-admin-sessions';
import apiService from '../../../../services/api.service';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  availableSessions: number;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
}

interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: Client | null;
  trainer?: Trainer | null;
}

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

interface WorkoutSessionData {
  id: string;
  title?: string;
  intensity?: number;
  totalSets?: number;
  totalReps?: number;
  totalWeight?: number;
  logs: WorkoutLog[];
}

interface ViewSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onEdit: (session: Session) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ViewSessionModal: React.FC<ViewSessionModalProps> = ({
  open, onClose, session, onEdit
}) => {
  const [workoutData, setWorkoutData] = useState<WorkoutSessionData | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [showExercises, setShowExercises] = useState(true);

  // Fetch workout logs when modal opens for a completed session
  useEffect(() => {
    if (!open || !session?.client?.id) {
      setWorkoutData(null);
      return;
    }

    const fetchWorkoutData = async () => {
      setLoadingWorkout(true);
      try {
        const res = await apiService.get(`/api/admin/clients/${session.client!.id}/workouts`, {
          params: { limit: 10 }
        });
        const workouts = res.data?.workouts || res.data?.data || [];
        // Find workout matching this session's date
        const sessionDate = new Date(session.sessionDate).toLocaleDateString();
        const match = workouts.find((w: any) =>
          new Date(w.date).toLocaleDateString() === sessionDate
        );
        if (match) {
          setWorkoutData(match);
        } else if (workouts.length > 0) {
          // Show most recent if no date match
          setWorkoutData(workouts[0]);
        }
      } catch {
        // Silently fail - workout data is supplementary
      } finally {
        setLoadingWorkout(false);
      }
    };

    fetchWorkoutData();
  }, [open, session]);

  if (!open) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return 'Invalid Date'; }
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return 'Invalid Time'; }
  };

  // Group logs by exercise name
  const groupLogs = (logs: WorkoutLog[]) => {
    const groups: Record<string, WorkoutLog[]> = {};
    for (const log of logs) {
      const key = log.exerciseName || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.setNumber - b.setNumber);
    }
    return groups;
  };

  return (
    <Overlay onClick={onClose}>
      <ModalPanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderRow>
            <Calendar size={20} style={{ color: '#60C0F0' }} />
            <ModalTitle>Session Details</ModalTitle>
          </HeaderRow>
          <CloseBtn onClick={onClose} aria-label="Close">&times;</CloseBtn>
        </ModalHeader>

        <ModalBody>
          {session ? (
            <>
              {/* Session Info Grid */}
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Status</InfoLabel>
                  <ChipContainer chipstatus={session.status}>
                    {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
                  </ChipContainer>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Date & Time</InfoLabel>
                  <InfoValue>{formatDate(session.sessionDate)} at {formatTime(session.sessionDate)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel><Clock size={14} /> Duration</InfoLabel>
                  <InfoValue>{session.duration || 'N/A'} minutes</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel><MapPin size={14} /> Location</InfoLabel>
                  <InfoValue>{session.location || 'N/A'}</InfoValue>
                </InfoItem>
              </InfoGrid>

              {/* Client Info */}
              {session.client && (
                <PersonRow>
                  <PersonAvatar>
                    {session.client.photo
                      ? <img src={session.client.photo} alt="" />
                      : <>{session.client.firstName?.[0]}{session.client.lastName?.[0]}</>
                    }
                  </PersonAvatar>
                  <PersonInfo>
                    <PersonName>{session.client.firstName} {session.client.lastName}</PersonName>
                    <PersonEmail>{session.client.email}</PersonEmail>
                  </PersonInfo>
                  <SessionsBadge>{session.client.availableSessions ?? 0} sessions</SessionsBadge>
                </PersonRow>
              )}

              {/* Notes */}
              {session.notes && (
                <NotesSection>
                  <InfoLabel>Notes</InfoLabel>
                  <NotesBox>{session.notes}</NotesBox>
                </NotesSection>
              )}

              {/* Workout Exercise Data */}
              {loadingWorkout ? (
                <WorkoutSection>
                  <SectionHeader>
                    <Dumbbell size={18} style={{ color: '#8B5CF6' }} />
                    <span>Loading workout data...</span>
                  </SectionHeader>
                </WorkoutSection>
              ) : workoutData && workoutData.logs && workoutData.logs.length > 0 ? (
                <WorkoutSection>
                  <SectionHeader
                    as="button"
                    onClick={() => setShowExercises(!showExercises)}
                    style={{ cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                  >
                    <Dumbbell size={18} style={{ color: '#8B5CF6' }} />
                    <span>Workout Exercises</span>
                    <WorkoutMeta>
                      {workoutData.totalSets && <MetaChip><Zap size={12} /> {workoutData.totalSets} sets</MetaChip>}
                      {workoutData.intensity && <MetaChip>Intensity: {workoutData.intensity}/10</MetaChip>}
                    </WorkoutMeta>
                    {showExercises ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </SectionHeader>

                  {showExercises && (
                    <ExerciseList>
                      {Object.entries(groupLogs(workoutData.logs)).map(([exName, sets]) => (
                        <ExerciseBlock key={exName}>
                          <ExerciseName>{exName}</ExerciseName>
                          <SetTable>
                            <thead>
                              <tr>
                                <SetTh>Set</SetTh>
                                <SetTh>Weight</SetTh>
                                <SetTh>Reps</SetTh>
                                <SetTh className="hide-sm">Tempo</SetTh>
                                <SetTh className="hide-sm">RPE</SetTh>
                                <SetTh className="hide-sm">Rest</SetTh>
                              </tr>
                            </thead>
                            <tbody>
                              {sets.map(set => (
                                <tr key={set.id || set.setNumber}>
                                  <SetTd><SetBadge>{set.setNumber}</SetBadge></SetTd>
                                  <SetTd $bold>{set.weight ? `${set.weight} lbs` : '—'}</SetTd>
                                  <SetTd $bold>{set.reps || '—'}</SetTd>
                                  <SetTd className="hide-sm">{set.tempo || '—'}</SetTd>
                                  <SetTd className="hide-sm">{set.rpe ? `${set.rpe}/10` : '—'}</SetTd>
                                  <SetTd className="hide-sm">{set.rest ? `${set.rest}s` : '—'}</SetTd>
                                </tr>
                              ))}
                            </tbody>
                          </SetTable>
                        </ExerciseBlock>
                      ))}
                    </ExerciseList>
                  )}
                </WorkoutSection>
              ) : session.status === 'completed' ? (
                <WorkoutSection>
                  <EmptyWorkout>
                    <Dumbbell size={24} style={{ opacity: 0.4 }} />
                    <span>No workout exercises logged for this session</span>
                  </EmptyWorkout>
                </WorkoutSection>
              ) : null}
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading session details...</p>
          )}
        </ModalBody>

        <ModalFooter>
          <GlowButton text="Close" theme="cosmic" size="small" onClick={onClose} />
          <GlowButton
            text="Edit Session"
            theme="purple"
            size="small"
            leftIcon={<Edit size={16} />}
            onClick={() => session && onEdit(session)}
            disabled={!session}
          />
        </ModalFooter>
      </ModalPanel>
    </Overlay>
  );
};

export default ViewSessionModal;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  padding: 1rem;
`;

const ModalPanel = styled.div`
  background: linear-gradient(135deg, #1e3a8a, #0a0a0f);
  border: 1px solid rgba(96,192,240,0.2);
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px rgba(0,32,96,0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(96,192,240,0.15);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModalTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 1.5rem;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  &:hover { color: #fff; background: rgba(255,255,255,0.1); }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
  @media (max-width: 500px) { grid-template-columns: 1fr; }
`;

const InfoItem = styled.div``;

const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 4px;
`;

const InfoValue = styled.div`
  font-size: 0.95rem;
  font-weight: 500;
  color: #E0ECF4;
`;

const PersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(96,192,240,0.1);
  border-radius: 10px;
  margin-bottom: 1rem;
`;

const PersonAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(139,92,246,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
  font-weight: 700;
  font-size: 0.85rem;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PersonInfo = styled.div`
  flex: 1;
`;

const PersonName = styled.div`
  font-weight: 600;
  color: #E0ECF4;
`;

const PersonEmail = styled.div`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
`;

const SessionsBadge = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.2);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.6);
`;

const NotesSection = styled.div`
  margin-bottom: 1rem;
`;

const NotesBox = styled.div`
  padding: 0.75rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #E0ECF4;
  font-size: 0.875rem;
  white-space: pre-wrap;
  min-height: 40px;
`;

const WorkoutSection = styled.div`
  margin-top: 0.5rem;
  border-top: 1px solid rgba(139,92,246,0.2);
  padding-top: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #E0ECF4;
  margin-bottom: 0.75rem;
  padding: 0;
`;

const WorkoutMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
`;

const MetaChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(139,92,246,0.15);
  color: #8B5CF6;
  font-size: 0.7rem;
  font-weight: 600;
`;

const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ExerciseBlock = styled.div``;

const ExerciseName = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: #60C0F0;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SetTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  .hide-sm { @media (max-width: 500px) { display: none; } }
`;

const SetTh = styled.th`
  text-align: left;
  padding: 4px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.4);
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const SetTd = styled.td<{ $bold?: boolean }>`
  padding: 6px;
  color: ${p => p.$bold ? '#E0ECF4' : 'rgba(255,255,255,0.6)'};
  font-weight: ${p => p.$bold ? 600 : 400};
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid rgba(255,255,255,0.04);
`;

const SetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: rgba(96,192,240,0.12);
  color: #60C0F0;
  font-size: 0.7rem;
  font-weight: 700;
`;

const EmptyWorkout = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem;
  color: rgba(255,255,255,0.4);
  font-size: 0.875rem;
  font-style: italic;
`;
