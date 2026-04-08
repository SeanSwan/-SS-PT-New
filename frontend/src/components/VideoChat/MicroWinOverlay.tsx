/**
 * ┌─── COMPONENT: MicroWinOverlay ─────────────────────────────┐
 * │ PURPOSE: "Perfect Form!" celebration animation triggered    │
 * │ by trainer during live video call. Crystalline Swan themed. │
 * │ Awards XP and shows on client's screen.                    │
 * │ CEO RULING: Phase 2 gamification micro-wins during call.   │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Sparkles, Star, Award, Zap, Heart } from 'lucide-react';

const popIn = keyframes`
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  60% { transform: scale(1.15) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const fadeOut = keyframes`
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-30px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Overlay = styled.div<{ $phase: 'enter' | 'exit' }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1200;
  pointer-events: none;
  animation: ${({ $phase }) => $phase === 'enter' ? popIn : fadeOut} ${({ $phase }) => $phase === 'enter' ? '0.5s' : '0.8s'} ease forwards;
`;

const Card = styled.div`
  padding: 32px 48px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(0, 32, 96, 0.95), rgba(139, 92, 246, 0.3));
  backdrop-filter: blur(20px);
  border: 2px solid rgba(198, 168, 75, 0.4);
  box-shadow: 0 0 40px rgba(96, 192, 240, 0.3), 0 0 80px rgba(139, 92, 246, 0.15);
  text-align: center;
  min-width: 280px;

  @media (max-width: 640px) {
    padding: 24px 32px;
    min-width: 240px;
  }
`;

const Title = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(90deg, #C6A84B, #E0ECF4, #60C0F0, #C6A84B);
  background-size: 200% 100%;
  animation: ${shimmer} 2s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;

  @media (max-width: 640px) { font-size: 22px; }
`;

const XPBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgba(198, 168, 75, 0.15);
  border: 1px solid rgba(198, 168, 75, 0.4);
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #C6A84B;
`;

const IconRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #C6A84B;
`;

// Micro-win types with messages and XP
const MICRO_WINS = {
  perfect_form: { title: 'Perfect Form!', xp: 25, icons: [Star, Sparkles, Star] },
  great_rep: { title: 'Great Rep!', xp: 10, icons: [Zap, Star, Zap] },
  full_rom: { title: 'Full Range of Motion!', xp: 15, icons: [Award, Sparkles, Award] },
  consistency: { title: 'Consistent Pace!', xp: 10, icons: [Heart, Star, Heart] },
  improvement: { title: 'Visible Improvement!', xp: 50, icons: [Sparkles, Award, Sparkles] },
} as const;

export type MicroWinType = keyof typeof MICRO_WINS;

interface MicroWinOverlayProps {
  type: MicroWinType;
  onComplete: () => void;
}

const MicroWinOverlay: React.FC<MicroWinOverlayProps> = ({ type, onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const win = MICRO_WINS[type];

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('exit'), 2000);
    const exitTimer = setTimeout(onComplete, 2800);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); };
  }, [onComplete]);

  return (
    <Overlay $phase={phase}>
      <Card>
        <IconRow>
          {win.icons.map((Icon, i) => (
            <Icon key={i} size={24} />
          ))}
        </IconRow>
        <Title>{win.title}</Title>
        <XPBadge>
          <Zap size={14} /> +{win.xp} XP
        </XPBadge>
      </Card>
    </Overlay>
  );
};

export default MicroWinOverlay;
