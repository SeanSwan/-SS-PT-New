/**
 * COMPONENT: TrainerWorkoutForgeNextActions
 * PURPOSE: Post-save command panel that moves a trainer draft into logging or Workout Planner review.
 */
import { ClipboardCheck, Dumbbell, ListChecks } from 'lucide-react';
import {
  ActionBtn,
  ButtonRow,
  Card,
  CardTitle,
  HelperCopy,
} from './TrainerWorkoutForgePage.styles';
import type { SavedTrainerForgePlan } from './TrainerWorkoutForgePage.data';

interface TrainerWorkoutForgeNextActionsProps {
  savedPlan: SavedTrainerForgePlan;
  onLogToday: () => void;
  onOpenPlanner: () => void;
}

const TrainerWorkoutForgeNextActions = ({
  savedPlan,
  onLogToday,
  onOpenPlanner,
}: TrainerWorkoutForgeNextActionsProps) => (
  <Card as="section" aria-label="Plan saved next actions">
    <CardTitle>
      <ClipboardCheck size={18} /> Draft Plan Saved
    </CardTitle>
    <p>
      <strong>{savedPlan.title}</strong> for {savedPlan.clientName} is ready to use.
    </p>
    <ButtonRow>
      <ActionBtn type="button" onClick={onLogToday}>
        <Dumbbell size={18} /> Log Today
      </ActionBtn>
      <ActionBtn type="button" $variant="secondary" onClick={onOpenPlanner}>
        <ListChecks size={18} /> Open Workout Planner
      </ActionBtn>
    </ButtonRow>
    <HelperCopy>
      Logger opens with today's plan loaded. Workout Planner keeps the draft in the review lane.
    </HelperCopy>
  </Card>
);

export default TrainerWorkoutForgeNextActions;
