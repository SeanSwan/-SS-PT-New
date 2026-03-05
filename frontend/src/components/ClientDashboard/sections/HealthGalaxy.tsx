/**
 * HealthGalaxy.tsx
 * ================
 * Client-facing Pain & Injury Body Map section.
 * Allows clients to self-report pain so their trainer can see it
 * when generating AI workouts.
 *
 * Ultra-responsive from 320px phones to 4K ultrawide.
 */
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { HeartPulse, Info } from 'lucide-react';
import BodyMap from '../../BodyMap';
import { useAuth } from '../../../context/AuthContext';
import { device } from '../../../styles/breakpoints';

// ── Styled Components ───────────────────────────────────────────────────

const Container = styled(motion.div)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;

  ${device.md} {
    padding: 0 24px;
  }

  ${device.xxxl} {
    max-width: 1600px;
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  }
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.6)'};
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
`;

const InfoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.background?.card || 'rgba(0, 255, 255, 0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.1)'};
  border-radius: 12px;
  margin-bottom: 24px;

  svg {
    color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const InfoText = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.7)'};
  font-size: 13px;
  margin: 0;
  line-height: 1.5;
`;

// ── Component ───────────────────────────────────────────────────────────

const HealthGalaxy: React.FC = () => {
  const { user } = useAuth() as any;

  if (!user?.id) {
    return null;
  }

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Header>
        <Title>
          <HeartPulse size={24} />
          Pain & Injury Map
        </Title>
        <Subtitle>
          Report pain or discomfort so your trainer can create safe, effective workouts.
        </Subtitle>
      </Header>

      <InfoCard>
        <Info size={18} />
        <InfoText>
          Tap any area on the body where you feel pain or discomfort. Your trainer will
          see this information when planning your workouts, and the AI workout generator
          will automatically avoid or modify exercises for affected areas.
        </InfoText>
      </InfoCard>

      <BodyMap userId={user.id} mode="client" />
    </Container>
  );
};

export default HealthGalaxy;
