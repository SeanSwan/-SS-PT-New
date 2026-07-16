/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: LiveStreamingView                                 ║
 * ║  PURPOSE: Live streaming feature preview (coming soon)        ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-28         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │           🎥 Live Streaming                                │
 * │                                                            │
 * │   ┌──────────┐  ┌──────────┐  ┌──────────┐               │
 * │   │ 🏋️ HIIT   │  │ Mobility │  │ 💪 Strength│               │
 * │   │ Live Now  │  │ Scheduled │  │ Scheduled │               │
 * │   └──────────┘  └──────────┘  └──────────┘               │
 * │                                                            │
 * │         Coming Soon — Stay tuned for live workouts!        │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * API Calls: GET /api/live-streams/config
 * Children: none (self-contained)
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Radio, Video, Zap, Users, Calendar, Star } from 'lucide-react';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 3rem 1.5rem;
  text-align: center;
`;

const IconCircle = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  border: 2px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  animation: ${float} 3s ease-in-out infinite;
  color: var(--accent-secondary, #8B5CF6);
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-heading, #E0ECF4);
  margin: 0 0 0.5rem;
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  max-width: 420px;
  line-height: 1.6;
  margin: 0 0 2.5rem;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-width: 600px;
  width: 100%;
  margin-bottom: 2.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
    max-width: 280px;
  }
`;

const FeatureCard = styled.div`
  padding: 1.25rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-surface, #1A1A24);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-surface, #1A1A24));
  }
`;

const FeatureIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
`;

const FeatureLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 1.25rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-secondary, #8B5CF6);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Video, label: 'Live Workouts' },
  { icon: Users, label: 'Watch Together' },
  { icon: Zap, label: 'Real-time Chat' },
  { icon: Calendar, label: 'Schedule Ahead' },
  { icon: Star, label: 'Earn XP' },
  { icon: Radio, label: 'Stream + Record' },
];

const LiveStreamingView: React.FC = () => {
  const { isElite, isTrial } = useSubscription();
  const hasBroadcastAccess = isElite || isTrial;

  return (
    <CrystallineLockOverlay
      isLocked={!hasBroadcastAccess}
      featureName="Live Streaming"
      description="Stream live workouts to your community and earn XP"
      ctaLabel="Upgrade to Crystalline Swan"
      onConfigure={() => { window.location.href = '/ascension'; }}
    >
    <Container>
      <IconCircle>
        <Radio size={40} />
      </IconCircle>

      <Title>Live Streaming</Title>
      <Subtitle>
        Watch live workouts, join group sessions, and stream your own training.
        Chat in real-time, earn XP, and replay anytime.
      </Subtitle>

      <FeatureGrid>
        {FEATURES.map(({ icon: Icon, label }) => (
          <FeatureCard key={label}>
            <FeatureIcon><Icon size={22} /></FeatureIcon>
            <FeatureLabel>{label}</FeatureLabel>
          </FeatureCard>
        ))}
      </FeatureGrid>

      <Badge>
        <LiveDot />
        Coming Soon
      </Badge>
    </Container>
    </CrystallineLockOverlay>
  );
};

export default LiveStreamingView;
