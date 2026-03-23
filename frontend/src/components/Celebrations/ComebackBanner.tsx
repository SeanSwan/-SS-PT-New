/**
 * ┌─── SUB-COMPONENT: ComebackBanner ──────────────────────────┐
 * │ PARENT: ClientDashboard / UserDashboard                     │
 * │ PURPOSE: Dismissible banner showing active comeback challenge│
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────┐            │
 * │ │ 🔥 Welcome Back! Complete 3 workouts for 2x  │ [Accept] [✕]│
 * │ │    XP this week! (2/3 done)                   │            │
 * │ └──────────────────────────────────────────────┘            │
 * │ Props: { challenge, onAccept, onDismiss }                   │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Accept] → POST /comeback-challenge/accept → Shows progress │
 * │ [✕] → Hides banner (localStorage remembers)                │
 * │ GAMIFICATION: Comeback challenges award 2x XP multiplier    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

interface ComebackChallenge {
  id: number;
  type: string;
  status: string;
  targetWorkouts: number;
  completedWorkouts: number;
  xpMultiplier: number;
  endDate: string;
}

interface ComebackBannerProps {
  challenge: ComebackChallenge;
  onAccept: (challengeId: number) => void;
  onDismiss: () => void;
}

const slideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const BannerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #002060 0%, #003080 100%);
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
  animation: ${slideDown} 400ms ease-out;
  min-height: 44px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const BannerTitle = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #E0ECF4;
`;

const BannerDetail = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: #E0ECF4;
  opacity: 0.7;
`;

const ProgressText = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  color: #C6A84B;
  font-weight: 600;
`;

const AcceptButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: #8B5CF6;
  color: #E0ECF4;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: transform 0.15s, box-shadow 0.15s;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4);
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: #E0ECF4;
  opacity: 0.5;
  cursor: pointer;
  font-size: 1.25rem;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { opacity: 1; }
`;

const CHALLENGE_MESSAGES: Record<string, { title: string; detail: string }> = {
  welcome_back: {
    title: 'Welcome Back!',
    detail: 'Complete workouts this week for bonus XP!',
  },
  fresh_start: {
    title: 'Fresh Start Challenge',
    detail: 'Ease back in with a reduced daily goal.',
  },
  streak_recovery: {
    title: 'Streak Recovery!',
    detail: 'Recover your streak with consistent workouts.',
  },
};

const ComebackBanner: React.FC<ComebackBannerProps> = ({
  challenge,
  onAccept,
  onDismiss,
}) => {
  const messages = CHALLENGE_MESSAGES[challenge.type] || CHALLENGE_MESSAGES.welcome_back;
  const isAccepted = challenge.status === 'accepted';
  const progress = `${challenge.completedWorkouts}/${challenge.targetWorkouts}`;
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <BannerWrapper role="alert">
      <BannerContent>
        <BannerTitle>
          {messages.title} — {challenge.xpMultiplier}x XP
        </BannerTitle>
        <BannerDetail>
          {messages.detail} {daysLeft}d left
        </BannerDetail>
        {isAccepted && (
          <ProgressText>Progress: {progress} workouts</ProgressText>
        )}
      </BannerContent>
      {!isAccepted && (
        <AcceptButton onClick={() => onAccept(challenge.id)}>
          Accept
        </AcceptButton>
      )}
      <DismissButton onClick={onDismiss} aria-label="Dismiss banner">
        ×
      </DismissButton>
    </BannerWrapper>
  );
};

export default ComebackBanner;
