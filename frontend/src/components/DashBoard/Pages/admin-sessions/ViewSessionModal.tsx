/**
 * ============================================================================
 * FILE: ViewSessionModal.tsx
 * PURPOSE: View session details with full workout exercise/set breakdown.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * Displays session scheduling details and supplementary workout exercise data
 * for Admin Sessions row actions.
 */

import React, { useEffect, useState } from 'react';
import {
  Calendar, Edit, Dumbbell, Clock, MapPin,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import { ChipContainer } from './AdminSessionsStatus.styles';
import apiService from '../../../../services/api.service';
import { getClientSessionSignal } from '../../workspaces/clients-team/clientSessionSignal';
import {
  formatSessionDate,
  formatSessionTime,
  groupWorkoutLogs,
} from './ViewSessionModal.helpers';
import type {
  ViewSessionModalProps,
  WorkoutSessionData,
} from './ViewSessionModal.types';
import {
  CloseBtn,
  HeaderAccentIcon,
  HeaderRow,
  InfoGrid,
  InfoItem,
  InfoLabel,
  InfoValue,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  ModalTitle,
  NotesBox,
  NotesSection,
  Overlay,
  PersonAvatar,
  PersonEmail,
  PersonInfo,
  PersonName,
  PersonRow,
  SessionsBadge,
} from './ViewSessionModal.styles';
import {
  EmptyWorkout,
  EmptyWorkoutIcon,
  ExerciseBlock,
  ExerciseList,
  ExerciseName,
  MetaChip,
  SectionHeader,
  SectionToggleButton,
  SetBadge,
  SetTable,
  SetTd,
  SetTh,
  WorkoutAccentIcon,
  WorkoutMeta,
  WorkoutSection,
} from './ViewSessionModalWorkout.styles';

type WorkoutResponseItem = WorkoutSessionData & { date?: string };

const ViewSessionModal: React.FC<ViewSessionModalProps> = ({
  open, onClose, session, onEdit
}) => {
  const [workoutData, setWorkoutData] = useState<WorkoutSessionData | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [showExercises, setShowExercises] = useState(true);

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
        const workouts = (res.data?.workouts || res.data?.data || []) as WorkoutResponseItem[];
        const sessionDate = new Date(session.sessionDate).toLocaleDateString();
        const match = workouts.find((workout) =>
          workout.date && new Date(workout.date).toLocaleDateString() === sessionDate
        );

        if (match) {
          setWorkoutData(match);
        } else if (workouts.length > 0) {
          setWorkoutData(workouts[0]);
        }
      } catch {
        // Workout data is supplementary to the session record.
      } finally {
        setLoadingWorkout(false);
      }
    };

    fetchWorkoutData();
  }, [open, session]);

  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalPanel
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-session-modal-title"
      >
        <ModalHeader>
          <HeaderRow>
            <HeaderAccentIcon><Calendar size={20} aria-hidden="true" /></HeaderAccentIcon>
            <ModalTitle id="view-session-modal-title">Session Details</ModalTitle>
          </HeaderRow>
          <CloseBtn type="button" onClick={onClose} aria-label="Close">&times;</CloseBtn>
        </ModalHeader>

        <ModalBody>
          {session ? (
            <>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Status</InfoLabel>
                  <ChipContainer chipstatus={session.status}>
                    {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
                  </ChipContainer>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Date & Time</InfoLabel>
                  <InfoValue>
                    {formatSessionDate(session.sessionDate)} at {formatSessionTime(session.sessionDate)}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel><Clock size={14} aria-hidden="true" /> Duration</InfoLabel>
                  <InfoValue>{session.duration || 'N/A'} minutes</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel><MapPin size={14} aria-hidden="true" /> Location</InfoLabel>
                  <InfoValue>{session.location || 'N/A'}</InfoValue>
                </InfoItem>
              </InfoGrid>

              {session.client && (() => {
                const clientSessionSignal = getClientSessionSignal(session.client);

                return (
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
                    <SessionsBadge title={clientSessionSignal.note}>{clientSessionSignal.label}</SessionsBadge>
                  </PersonRow>
                );
              })()}

              {session.notes && (
                <NotesSection>
                  <InfoLabel>Notes</InfoLabel>
                  <NotesBox>{session.notes}</NotesBox>
                </NotesSection>
              )}

              {loadingWorkout ? (
                <WorkoutSection>
                  <SectionHeader>
                    <WorkoutAccentIcon><Dumbbell size={18} aria-hidden="true" /></WorkoutAccentIcon>
                    <span>Loading workout data...</span>
                  </SectionHeader>
                </WorkoutSection>
              ) : workoutData && workoutData.logs && workoutData.logs.length > 0 ? (
                <WorkoutSection>
                  <SectionToggleButton onClick={() => setShowExercises(!showExercises)}>
                    <WorkoutAccentIcon><Dumbbell size={18} aria-hidden="true" /></WorkoutAccentIcon>
                    <span>Workout Exercises</span>
                    <WorkoutMeta>
                      {workoutData.totalSets && <MetaChip><Zap size={12} aria-hidden="true" /> {workoutData.totalSets} sets</MetaChip>}
                      {workoutData.intensity && <MetaChip>Intensity: {workoutData.intensity}/10</MetaChip>}
                    </WorkoutMeta>
                    {showExercises ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                  </SectionToggleButton>

                  {showExercises && (
                    <ExerciseList>
                      {Object.entries(groupWorkoutLogs(workoutData.logs)).map(([exerciseName, sets]) => (
                        <ExerciseBlock key={exerciseName}>
                          <ExerciseName>{exerciseName}</ExerciseName>
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
                                  <SetTd $bold>{set.weight ? `${set.weight} lbs` : '-'}</SetTd>
                                  <SetTd $bold>{set.reps || '-'}</SetTd>
                                  <SetTd className="hide-sm">{set.tempo || '-'}</SetTd>
                                  <SetTd className="hide-sm">{set.rpe ? `${set.rpe}/10` : '-'}</SetTd>
                                  <SetTd className="hide-sm">{set.rest ? `${set.rest}s` : '-'}</SetTd>
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
                    <EmptyWorkoutIcon><Dumbbell size={24} aria-hidden="true" /></EmptyWorkoutIcon>
                    <span>No workout exercises logged for this session</span>
                  </EmptyWorkout>
                </WorkoutSection>
              ) : null}
            </>
          ) : (
            <EmptyWorkout>Loading session details...</EmptyWorkout>
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
