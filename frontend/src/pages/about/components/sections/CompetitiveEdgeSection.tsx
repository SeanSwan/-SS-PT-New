/**
 * CompetitiveEdgeSection — Luxury visual cards showcasing SwanStudios differentiators
 * ====================================================================================
 * Replaces the old WhySwanStudios comparison table with premium glass morphism cards.
 * Each card highlights ONE differentiator — feels like Apple/Rolex, not a feature checklist.
 *
 * Layout: 2-column grid on desktop, single column on mobile.
 * Animation: stagger reveal on scroll, cross-pollinated glow on hover.
 * Tier-aware: full=blur+stagger+glow, balanced=blur+fade, essential=static.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Dumbbell, TrendingUp, MessageCircle,
  BookOpen, Trophy, Heart,
} from 'lucide-react';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine, SectionSubtitle } from '../shared/AboutStyles';
import { competitiveEdgeCards } from '../shared/AboutData';
import { staggerContainer, getReveal } from '../shared/AboutAnimations';

interface CompetitiveEdgeSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const ICONS = [Dumbbell, TrendingUp, MessageCircle, BookOpen, Trophy, Heart];
const VARIANTS: Array<'cyan' | 'purple' | 'gold'> = ['cyan', 'purple', 'gold', 'cyan', 'purple', 'gold'];

const subtleGlow = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
`;

const EdgeGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1.25rem, 3vw, 2rem);

  @media (max-width: 768px) { grid-template-columns: 1fr; }
  @media (min-width: 2560px) { gap: 2.5rem; }
`;

const GLOW_COLORS = {
  cyan: { border: 'rgba(96, 192, 240, 0.15)', hover: 'rgba(96, 192, 240, 0.35)', inner: 'rgba(139, 92, 246, 0.06)' },
  purple: { border: 'rgba(139, 92, 246, 0.15)', hover: 'rgba(139, 92, 246, 0.35)', inner: 'rgba(96, 192, 240, 0.06)' },
  gold: { border: 'rgba(198, 168, 75, 0.15)', hover: 'rgba(198, 168, 75, 0.35)', inner: 'rgba(198, 168, 75, 0.04)' },
};

const EdgeCard = styled(motion.div)<{ $variant: 'cyan' | 'purple' | 'gold'; $disableBlur: boolean }>`
  position: relative;
  padding: clamp(1.75rem, 4vw, 2.5rem);
  border-radius: 20px;
  background: ${({ $disableBlur }) => $disableBlur ? 'rgba(0, 32, 96, 0.85)' : 'rgba(0, 32, 96, 0.4)'};
  backdrop-filter: ${({ $disableBlur }) => $disableBlur ? 'none' : 'blur(16px)'};
  -webkit-backdrop-filter: ${({ $disableBlur }) => $disableBlur ? 'none' : 'blur(16px)'};
  border: 1px solid ${({ $variant }) => GLOW_COLORS[$variant].border};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  min-height: 44px;

  &:hover {
    border-color: ${({ $variant }) => GLOW_COLORS[$variant].hover};
    box-shadow: 0 20px 48px ${({ $variant }) => GLOW_COLORS[$variant].hover.replace('0.35', '0.12')},
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 0 40px ${({ $variant }) => GLOW_COLORS[$variant].inner};
    transform: translateY(-6px);
  }

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(0, 32, 96, 0.85);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }

  @media (max-width: 320px) {
    padding: 1.25rem;
    border-radius: 16px;
  }
`;

const CardGlowOrb = styled.div<{ $color: string }>`
  position: absolute;
  top: -30%;
  right: -20%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, ${({ $color }) => $color} 0%, transparent 70%);
  opacity: 0.06;
  pointer-events: none;
  animation: ${subtleGlow} 6s ease-in-out infinite;
`;

const ICON_BG = {
  cyan: 'rgba(96, 192, 240, 0.1)',
  purple: 'rgba(139, 92, 246, 0.1)',
  gold: 'rgba(198, 168, 75, 0.1)',
};

const ICON_BORDER = {
  cyan: 'rgba(96, 192, 240, 0.2)',
  purple: 'rgba(139, 92, 246, 0.2)',
  gold: 'rgba(198, 168, 75, 0.2)',
};

const ICON_COLOR = {
  cyan: 'var(--accent-primary, #60C0F0)',
  purple: 'var(--accent-secondary, #8B5CF6)',
  gold: 'var(--accent-gold, #C6A84B)',
};

const IconCircle = styled.div<{ $variant: 'cyan' | 'purple' | 'gold' }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  background: ${({ $variant }) => ICON_BG[$variant]};
  border: 1px solid ${({ $variant }) => ICON_BORDER[$variant]};
  color: ${({ $variant }) => ICON_COLOR[$variant]};
  transition: transform 0.3s ease;

  ${EdgeCard}:hover & {
    transform: scale(1.08);
  }
`;

const CardSubtitle = styled.span`
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 0.5rem;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.125rem, 2.5vw, 1.375rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;
  line-height: 1.2;

  @media (max-width: 320px) { font-size: 1rem; }
  @media (min-width: 2560px) { font-size: 1.5rem; }
`;

const CardBody = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  line-height: 1.7;
  margin: 0;

  @media (max-width: 320px) { font-size: 0.8125rem; }
  @media (min-width: 2560px) { font-size: 1.05rem; }
`;

const SectionLabel = styled(motion.p)`
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--accent-gold, #C6A84B);
  text-align: center;
  margin: 0 0 0.75rem;
`;

const ORB_COLORS = {
  cyan: '#60C0F0',
  purple: '#8B5CF6',
  gold: '#C6A84B',
};

const CompetitiveEdgeSection: React.FC<CompetitiveEdgeSectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';
  const reveal = getReveal(isEssential);

  return (
    <SectionEl>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionLabel>Why SwanStudios</SectionLabel>
          <SectionTitle>
            {isFull ? (
              <TextSplitter text="What Sets Us Apart" as="span" mode="words" />
            ) : (
              'What Sets Us Apart'
            )}
          </SectionTitle>
          <AccentLine />
          <SectionSubtitle>
            Generic AI chatbots answer fitness questions. SwanStudios is a complete
            fitness platform with coaching built in — not just a chatbot.
          </SectionSubtitle>
        </ScrollReveal>

        <EdgeGrid
          variants={isEssential ? undefined : staggerContainer}
          initial={isEssential ? undefined : 'hidden'}
          whileInView={isEssential ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.1 }}
        >
          {competitiveEdgeCards.map((card, i) => {
            const Icon = ICONS[i];
            const variant = VARIANTS[i];
            return (
              <EdgeCard
                key={card.title}
                $variant={variant}
                $disableBlur={isEssential}
                variants={isEssential ? undefined : reveal}
              >
                {isFull && <CardGlowOrb $color={ORB_COLORS[variant]} />}
                <IconCircle $variant={variant}>
                  <Icon size={26} />
                </IconCircle>
                <CardSubtitle>{card.subtitle}</CardSubtitle>
                <CardTitle>{card.title}</CardTitle>
                <CardBody>{card.body}</CardBody>
              </EdgeCard>
            );
          })}
        </EdgeGrid>
      </Container>
    </SectionEl>
  );
};

export default CompetitiveEdgeSection;
