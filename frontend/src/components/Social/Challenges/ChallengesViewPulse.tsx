/**
 * Challenge board pulse.
 * Shows a compact real-data summary above the client challenge cards.
 */
import React from 'react';
import styled from 'styled-components';
import type { Challenge } from '../../../hooks/useChallenges';

interface ChallengeBoardPulseProps {
  challenges: Challenge[];
}

const PulseGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-card, #141419) 88%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent)),
    var(--bg-card, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  padding: clamp(12px, 2vw, 18px);

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const PulseTile = styled.div`
  display: grid;
  min-width: 0;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent);
  padding: 12px;

  span {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
    font: 800 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  }

  strong {
    color: var(--text-primary, #E0ECF4);
    font: 900 1.4rem/1 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }
`;

const countCompleted = (challenge: Challenge): boolean => (
  challenge.status === 'completed' || challenge.participantStatus === 'completed'
);

const checkInTotalFor = (challenge: Challenge): number => {
  const count = Number(challenge.checkInsCount);
  return challenge.joined && Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
};

export function ChallengeBoardPulse({ challenges }: ChallengeBoardPulseProps) {
  const live = challenges.filter((challenge) => challenge.status === 'active').length;
  const joined = challenges.filter((challenge) => challenge.joined).length;
  const checkIns = challenges.reduce((sum, challenge) => sum + checkInTotalFor(challenge), 0);
  const ready = challenges.filter((challenge) => challenge.status === 'active' && !challenge.joined).length;
  const completed = challenges.filter(countCompleted).length;

  const metrics = [
    ['Live', live],
    ['Joined', joined],
    ['Check-ins', checkIns],
    ['Ready', ready],
    ['Completed', completed],
  ] as const;

  return (
    <PulseGrid aria-label="Challenge board pulse">
      {metrics.map(([label, value]) => (
        <PulseTile key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </PulseTile>
      ))}
    </PulseGrid>
  );
}

export default ChallengeBoardPulse;
