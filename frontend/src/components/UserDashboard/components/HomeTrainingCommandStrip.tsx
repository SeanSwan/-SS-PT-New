/**
 * FILE: HomeTrainingCommandStrip.tsx
 * PURPOSE: First-screen training command strip for /user-dashboard Home.
 */

import React from 'react';
import styled from 'styled-components';
import { BarChart3, Dumbbell, MessageCircle, ShieldCheck } from 'lucide-react';
import { Eyebrow, Panel } from './HomeTabVision.styles';

interface HomeTrainingCommandStripProps {
  coachPath: string;
  logWorkoutPath: string;
  onNavigate: (path: string) => void;
  onProgress: () => void;
}

const ACTIONS = [
  {
    key: 'log',
    label: 'Log Workout',
    detail: 'Save today before memory fades',
    Icon: Dumbbell,
  },
  {
    key: 'progress',
    label: 'View Progress',
    detail: 'Check proof',
    Icon: BarChart3,
  },
  {
    key: 'coach',
    label: 'Ask Coach',
    detail: 'Get direction',
    Icon: MessageCircle,
  },
] as const;

const HomeTrainingCommandStrip: React.FC<HomeTrainingCommandStripProps> = ({
  coachPath,
  logWorkoutPath,
  onNavigate,
  onProgress,
}) => {
  const handleAction = (key: (typeof ACTIONS)[number]['key']) => {
    if (key === 'log') onNavigate(logWorkoutPath);
    if (key === 'progress') onProgress();
    if (key === 'coach') onNavigate(coachPath);
  };

  return (
    <StripShell aria-label="Training command strip">
      <StripLead>
        <Eyebrow>
          <ShieldCheck size={14} aria-hidden="true" />
          Train first
        </Eyebrow>
        <LeadCopy>Log the work, inspect proof, then ask Coach.</LeadCopy>
      </StripLead>
      <ActionGrid aria-label="User training today flow">
        {ACTIONS.map(({ key, label, detail, Icon }, index) => (
          <ActionStep key={key}>
            <CommandButton
              type="button"
              $primary={key === 'log'}
              onClick={() => handleAction(key)}
              aria-label={`Step ${index + 1}: ${label}`}
            >
              <IconWrap><Icon size={18} aria-hidden="true" /></IconWrap>
              <span>
                <ActionOverline>Step {index + 1}</ActionOverline>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </CommandButton>
          </ActionStep>
        ))}
      </ActionGrid>
    </StripShell>
  );
};

const StripShell = styled(Panel)`
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(180px, 0.85fr) minmax(0, 2fr);
  margin: 0 auto 1rem;
  max-width: 1760px;
  z-index: 1;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StripLead = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

const LeadCopy = styled.p`
  color: var(--vision-soft);
  margin: 0;
  line-height: 1.35;
`;

const ActionGrid = styled.ol`
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ActionStep = styled.li`
  min-width: 0;
`;

const CommandButton = styled.button<{ $primary?: boolean }>`
  align-items: center;
  background: ${({ $primary }) => (
    $primary
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0))'
      : 'color-mix(in srgb, var(--bg-elevated, #141419) 82%, transparent)'
  )};
  border: 1px solid ${({ $primary }) => (
    $primary
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)'
  )};
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  gap: 10px;
  min-height: ${({ $primary }) => ($primary ? '64px' : '56px')};
  min-width: 44px;
  padding: 9px 11px;
  box-shadow: ${({ $primary }) => (
    $primary
      ? '0 0 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
      : 'none'
  )};
  text-align: left;

  strong,
  small {
    display: block;
    line-height: 1.15;
  }

  small {
    color: var(--vision-soft);
    margin-top: 3px;
  }

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ActionOverline = styled.small`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  margin: 0 0 4px;
  text-transform: uppercase;
`;

const IconWrap = styled.span`
  align-items: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent);
  border-radius: 12px;
  color: var(--accent-primary, #60C0F0);
  display: inline-flex;
  flex: 0 0 auto;
  height: 38px;
  justify-content: center;
  width: 38px;
`;

export default HomeTrainingCommandStrip;
