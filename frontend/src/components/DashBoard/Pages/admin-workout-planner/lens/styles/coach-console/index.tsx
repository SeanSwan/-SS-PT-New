/**
 * LENS: coach-console (§5.2 #6) — Coach + Teach lead in the left 40%; the
 * builder rides right. Generation-forward info order: Coach state →
 * generated preview → accept/edit. Subtle purple pulse on the Coach column
 * border (purple = Coach, per law L7), reduced-motion safe.
 */
import styled, { css, keyframes } from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const pulse = keyframes`
  0%, 100% { border-color: color-mix(in srgb, var(--accent-glow, #8B5CF6) 35%, transparent); }
  50% { border-color: color-mix(in srgb, var(--accent-glow, #8B5CF6) 70%, transparent); }
`;

const Console = styled.div`
  display: grid; gap: 14px; grid-template-columns: minmax(320px, 40%) 1fr;
  @media (max-width: 1279px) { grid-template-columns: 1fr; }
`;

const CoachColumn = styled.div`
  display: flex; flex-direction: column; gap: 12px;
  border: 1px solid transparent; border-radius: 14px; padding: 10px;
  ${css`animation: ${pulse} 3s ease-in-out infinite;`}
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-color: color-mix(in srgb, var(--accent-glow, #8B5CF6) 45%, transparent);
  }
`;

const BuilderColumn = styled.div` display: flex; flex-direction: column; gap: 12px; `;

const CoachConsole: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => (
  <Console>
    <CoachColumn>
      {coachDock}
      {teach}
      {rolodex}
    </CoachColumn>
    <BuilderColumn>{builder}</BuilderColumn>
  </Console>
);

export default CoachConsole;
