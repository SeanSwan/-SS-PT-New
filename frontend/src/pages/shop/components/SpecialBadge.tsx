import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

interface SpecialBadgeProps {
  name: string;
  bonusSessions: number;
  endsAt: string;
}

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const BadgeContainer = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Badge = styled.div`
  background: linear-gradient(
    135deg,
    #7851A9 0%,
    #9B6FCF 50%,
    #7851A9 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 3s linear infinite;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(120, 81, 169, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  min-width: 100px;
`;

const BonusText = styled.div`
  font-size: 0.875rem;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const Sparkle = styled.span`
  font-size: 0.75rem;
`;

const CountdownText = styled.div`
  font-size: 0.625rem;
  font-weight: 500;
  opacity: 0.9;
  margin-top: 2px;
`;

const getTimeRemaining = (endDate: string): string => {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 7) return `Ends in ${days} days`;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
};

export const SpecialBadge: React.FC<SpecialBadgeProps> = ({
  name,
  bonusSessions,
  endsAt
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(endsAt));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft === 'Expired') return null;

  return (
    <BadgeContainer>
      <Badge title={name}>
        <BonusText>
          <Sparkle>✨</Sparkle>
          +{bonusSessions} BONUS
          <Sparkle>✨</Sparkle>
        </BonusText>
        <CountdownText>{timeLeft}</CountdownText>
      </Badge>
    </BadgeContainer>
  );
};

export default SpecialBadge;
