/**
 * One-action command band for the client My Workouts surface.
 * It keeps the workout history page teachable by turning stats into one
 * obvious next move without writing or logging anything automatically.
 */
import React from 'react';
import styled from 'styled-components';
import { Dumbbell, MessageCircle, Sparkles } from 'lucide-react';
import { HeaderActions, LogBtn } from './ClientMyWorkoutsStyles';

interface ClientMyWorkoutsNextMoveProps {
  coachPath: string;
  onNavigate: (path: string) => void;
}

const Panel = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin: 0 0 1rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent));

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  display: grid;
  gap: 0.35rem;

  p {
    margin: 0;
    color: var(--text-secondary, #94a3b8);
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const Kicker = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
`;

const ClientMyWorkoutsNextMove: React.FC<ClientMyWorkoutsNextMoveProps> = ({ coachPath, onNavigate }) => (
  <Panel aria-label="Client workouts next best move">
    <Copy>
      <Kicker><Sparkles size={16} /> Next best move</Kicker>
      <p>Review the latest page, log today if you trained, or ask Coach what to adjust.</p>
    </Copy>
    <HeaderActions aria-label="Workout next actions">
      <LogBtn type="button" onClick={() => onNavigate('/dashboard/client/log-workout?loadPlan=today')}>
        <Dumbbell size={16} /> Log Today's Workout
      </LogBtn>
      <LogBtn type="button" onClick={() => onNavigate(coachPath)} aria-label="Ask Coach Next">
        <MessageCircle size={16} /> Ask Coach Next
      </LogBtn>
    </HeaderActions>
  </Panel>
);

export default ClientMyWorkoutsNextMove;
