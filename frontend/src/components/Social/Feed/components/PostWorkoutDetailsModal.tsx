import React from 'react';
import { Clock, Dumbbell, Flame, FileText, Timer, Weight, X, Zap } from 'lucide-react';
import { AuthContext } from '../../../../context/authContextState';
import {
  getDashboardRolePath,
  getLogWorkoutDashboardPath,
} from '../../../UserDashboard/components/swanCoachDashboardRoute';
import type { WorkoutPostData, WorkoutPostExercise } from '../types/PostCardTypes';
import {
  ActionLink,
  CloseButton,
  DetailChip,
  DetailChips,
  EmptyState,
  ExerciseItem,
  ExerciseList,
  ExerciseName,
  Eyebrow,
  HeaderCopy,
  MetricCard,
  MetricGrid,
  MetricLabel,
  MetricValue,
  ModalActions,
  ModalBackdrop,
  ModalBody,
  ModalFrame,
  ModalHeader,
  ModalSubtitle,
  ModalTitle,
  NotesBlock,
  SectionTitle,
} from './PostWorkoutDetailsModal.styles';

interface PostWorkoutDetailsModalProps {
  open: boolean;
  workoutData?: WorkoutPostData;
  postContent: string;
  onClose: () => void;
}

const hasText = (value?: string): value is string => Boolean(value?.trim());

const hasAttachedWorkoutDetails = (workoutData?: WorkoutPostData): boolean => {
  if (!workoutData) return false;
  return Boolean(
    hasText(workoutData.title) ||
    hasText(workoutData.focus) ||
    hasText(workoutData.duration) ||
    hasText(workoutData.exerciseCount) ||
    hasText(workoutData.totalWeight) ||
    hasText(workoutData.caloriesBurned) ||
    hasText(workoutData.notes) ||
    Boolean(workoutData.exercises?.some(exercise => hasText(exercise.name)))
  );
};

const buildExerciseChips = (exercise: WorkoutPostExercise): string[] => [
  exercise.sets ? `${exercise.sets} sets` : '',
  exercise.reps ? `${exercise.reps} reps` : '',
  exercise.weight ? `${exercise.weight}` : '',
  exercise.duration ? `${exercise.duration}` : '',
  exercise.rest ? `${exercise.rest} rest` : '',
].filter(hasText);

const formatSource = (source?: string): string => {
  if (source === 'logger') return 'From logged workout';
  if (source === 'plan') return 'From training plan';
  if (source === 'pdf') return 'From uploaded workout';
  if (source === 'manual') return 'Shared workout';
  return 'Workout details';
};

const PostWorkoutDetailsModal: React.FC<PostWorkoutDetailsModalProps> = React.memo(({
  open,
  workoutData,
  postContent,
  onClose,
}) => {
  const titleId = React.useId();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const hasDetails = hasAttachedWorkoutDetails(workoutData);
  // Read the context directly rather than via useAuth(): this is a leaf display
  // modal and must not throw when rendered outside an AuthProvider. An absent
  // role degrades to the client route, which is the behaviour that shipped
  // before — just no longer hard-coded for everyone else.
  const user = React.useContext(AuthContext)?.user;
  // The `client` segment used to be hard-coded here, so trainers and admins
  // were sent to a route that is not theirs.
  const logWorkoutPath = getLogWorkoutDashboardPath(user?.role);
  const workoutsPath = `/dashboard/${getDashboardRolePath(user?.role)}/workouts`;
  const exercises = workoutData?.exercises?.filter(exercise => hasText(exercise.name)) ?? [];
  const exerciseCount = workoutData?.exerciseCount || (exercises.length ? String(exercises.length) : undefined);

  React.useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const metrics = [
    { label: 'Duration', value: workoutData?.duration, icon: Clock, suffix: 'min' },
    { label: 'Exercises', value: exerciseCount, icon: Dumbbell, suffix: '' },
    { label: 'Volume', value: workoutData?.totalWeight, icon: Weight, suffix: 'lbs' },
    { label: 'Calories', value: workoutData?.caloriesBurned, icon: Flame, suffix: '' },
  ].filter(metric => hasText(metric.value));

  return (
    <ModalBackdrop onMouseDown={onClose}>
      <ModalFrame
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={event => event.stopPropagation()}
      >
        <ModalHeader>
          <HeaderCopy>
            <Eyebrow>{hasDetails ? formatSource(workoutData?.source) : 'Workout tag'}</Eyebrow>
            <ModalTitle id={titleId}>Try This Workout</ModalTitle>
            <ModalSubtitle>
              {hasDetails
                ? workoutData?.title || 'Shared workout details'
                : 'Details unavailable'}
            </ModalSubtitle>
          </HeaderCopy>
          <CloseButton ref={closeButtonRef} type="button" aria-label="Close workout details" onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {hasDetails ? (
            <>
              {hasText(workoutData?.focus) && <NotesBlock>{workoutData?.focus}</NotesBlock>}

              {metrics.length > 0 && (
                <MetricGrid>
                  {metrics.map(({ label, value, icon: Icon, suffix }) => (
                    <MetricCard key={label}>
                      <MetricLabel><Icon size={16} />{label}</MetricLabel>
                      <MetricValue>{value}{suffix}</MetricValue>
                    </MetricCard>
                  ))}
                </MetricGrid>
              )}

              {exercises.length > 0 && (
                <section aria-label="Workout exercises">
                  <SectionTitle>Exercises</SectionTitle>
                  <ExerciseList>
                    {exercises.map((exercise, index) => {
                      const chips = buildExerciseChips(exercise);
                      return (
                        <ExerciseItem key={`${exercise.name}-${index}`}>
                          <ExerciseName>{exercise.name}</ExerciseName>
                          {chips.length > 0 && (
                            <DetailChips>
                              {chips.map(chip => <DetailChip key={chip}>{chip}</DetailChip>)}
                            </DetailChips>
                          )}
                          {hasText(exercise.notes) && <NotesBlock>{exercise.notes}</NotesBlock>}
                        </ExerciseItem>
                      );
                    })}
                  </ExerciseList>
                </section>
              )}

              {hasText(workoutData?.notes) && <NotesBlock>{workoutData?.notes}</NotesBlock>}
            </>
          ) : (
            <EmptyState>
              <SectionTitle>No workout details attached</SectionTitle>
              <ModalSubtitle>
                This post was tagged as Workout from the post text, but no workout was shared with it.
              </ModalSubtitle>
              <NotesBlock>{postContent}</NotesBlock>
              <ModalActions>
                <ActionLink href={logWorkoutPath}>
                  <Zap size={16} />
                  Open Workout Logger
                </ActionLink>
              </ModalActions>
            </EmptyState>
          )}

          {hasDetails && (
            <ModalActions>
              <ActionLink href={logWorkoutPath}>
                <Timer size={16} />
                Open Workout Logger
              </ActionLink>
              {workoutData?.source === 'pdf' && (
                <ActionLink href={workoutsPath}>
                  <FileText size={16} />
                  View Workouts
                </ActionLink>
              )}
            </ModalActions>
          )}
        </ModalBody>
      </ModalFrame>
    </ModalBackdrop>
  );
});

PostWorkoutDetailsModal.displayName = 'PostWorkoutDetailsModal';

export default PostWorkoutDetailsModal;