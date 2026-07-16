/**
 * CinematicFeatures.tsx — Feature grid with glass micro-UI cards.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Activity,
  Apple,
  Heart,
  Monitor,
  Users,
  Trophy,
  Building,
} from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { FeatureItem } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription, GlassCard, IconContainer } from '../cinematic-shared';

interface CinematicFeaturesProps {
  sectionTitle: string;
  sectionDescription: string;
  items: FeatureItem[];
  tokens: CinematicTokens;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Activity, Apple, Heart, Monitor, Users, Trophy, Building,
};

interface TP { $tokens: CinematicTokens }

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled(motion.div)<TP>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s ease,
              border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
    border-color: ${({ $tokens }) => $tokens.palette.accent}40;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const FeatureTitle = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.1rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const FeatureDesc = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const CinematicFeatures: React.FC<CinematicFeaturesProps> = ({
  sectionTitle,
  sectionDescription,
  items,
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
          <SectionHeading $tokens={tokens} style={{ margin: '0 auto 1rem' }}>
            {sectionTitle}
          </SectionHeading>
        </motion.div>
        <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
            {sectionDescription}
          </SectionDescription>
        </motion.div>

        <Grid variants={staggerContainer(tokens.motion)}>
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] || Dumbbell;
            return (
              <FeatureCard
                key={item.title}
                $tokens={tokens}
                variants={staggerItem(tokens.motion)}
              >
                <IconContainer $tokens={tokens}>
                  <Icon size={24} />
                </IconContainer>
                <FeatureTitle $tokens={tokens}>{item.title}</FeatureTitle>
                <FeatureDesc $tokens={tokens}>{item.description}</FeatureDesc>
              </FeatureCard>
            );
          })}
        </Grid>
      </motion.div>
    </SectionShell>
  </SectionBackground>
);

export default CinematicFeatures;
