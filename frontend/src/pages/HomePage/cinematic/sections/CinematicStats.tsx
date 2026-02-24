/**
 * CinematicStats.tsx — Fitness stats with animated counter cards.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingDown,
  Clock,
  Flame,
  BarChart,
  Waves,
} from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { StatItem } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription, IconContainer } from '../cinematic-shared';

interface Props {
  sectionTitle: string;
  sectionDescription: string;
  stats: StatItem[];
  tokens: CinematicTokens;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Users, TrendingDown, Clock, Flame, BarChart, Waves,
};

interface TP { $tokens: CinematicTokens }

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)<TP>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const StatValue = styled.div<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 3rem);
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatLabel = styled.div<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
`;

const StatSublabel = styled.div<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
`;

const CinematicStats: React.FC<Props> = ({
  sectionTitle,
  sectionDescription,
  stats,
  tokens,
}) => (
  <SectionBackground $tokens={tokens}>
    <SectionShell $tokens={tokens}>
      <motion.div
        variants={staggerContainer(tokens.motion)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
      >
        <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center' }}>
          <SectionHeading $tokens={tokens} style={{ textAlign: 'center', margin: '0 auto 1rem' }}>
            {sectionTitle}
          </SectionHeading>
        </motion.div>
        <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
            {sectionDescription}
          </SectionDescription>
        </motion.div>

        <StatsGrid variants={staggerContainer(tokens.motion)}>
          {stats.map((stat) => {
            const Icon = ICON_MAP[stat.icon] || BarChart;
            return (
              <StatCard key={stat.label} $tokens={tokens} variants={staggerItem(tokens.motion)}>
                <IconContainer $tokens={tokens}>
                  <Icon size={24} />
                </IconContainer>
                <StatValue $tokens={tokens}>{stat.value}</StatValue>
                <StatLabel $tokens={tokens}>{stat.label}</StatLabel>
                <StatSublabel $tokens={tokens}>{stat.sublabel}</StatSublabel>
              </StatCard>
            );
          })}
        </StatsGrid>
      </motion.div>
    </SectionShell>
  </SectionBackground>
);

export default CinematicStats;
