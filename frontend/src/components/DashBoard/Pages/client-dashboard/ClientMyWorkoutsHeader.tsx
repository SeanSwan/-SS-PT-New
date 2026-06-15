import React from 'react';
import { Dumbbell, MessageCircle } from 'lucide-react';
import {
  AccentIconSlot,
  Header,
  HeaderActions,
  LogBtn,
  Title,
} from './ClientMyWorkoutsStyles';
import { buildClientWorkoutsCoachPath, CLIENT_WORKOUTS_COACH_PROMPT } from './ClientMyWorkoutsPage.logic';

export { CLIENT_WORKOUTS_COACH_PROMPT };
export const CLIENT_WORKOUTS_COACH_PATH = buildClientWorkoutsCoachPath();

interface ClientMyWorkoutsHeaderProps {
  onNavigate: (path: string) => void;
  coachPath?: string;
}

const ClientMyWorkoutsHeader: React.FC<ClientMyWorkoutsHeaderProps> = ({ onNavigate, coachPath = CLIENT_WORKOUTS_COACH_PATH }) => (
  <Header>
    <Title><AccentIconSlot><Dumbbell size={22} /></AccentIconSlot> My Workouts</Title>
    <HeaderActions>
      <LogBtn type="button" onClick={() => onNavigate('/dashboard/client/log-workout?loadPlan=today')}>
        <Dumbbell size={16} /> Log Workout
      </LogBtn>
      <LogBtn type="button" onClick={() => onNavigate(coachPath)} aria-label="Ask Coach about my workouts">
        <MessageCircle size={16} /> Ask Coach
      </LogBtn>
    </HeaderActions>
  </Header>
);

export default ClientMyWorkoutsHeader;
