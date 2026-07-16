/**
 * CinematicCreative.tsx — Creative expression section with 4 discipline cards.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Music, Palette, Mic, Heart } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { CreativeCard } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, GlassCard, IconContainer } from '../cinematic-shared';

interface CinematicCreativeProps {
  sectionTitle: string;
  sectionBody: string;
  sectionBodyBold: string;
  sectionBodyContinued: string;
  cards: CreativeCard[];
  tokens: CinematicTokens;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Music, Palette, Mic, Heart,
};

interface TP { $tokens: CinematicTokens }

const BodyText = styled(motion.p)<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.8;
  max-width: 800px;
  margin: 0 0 3rem;
  text-align: center;

  strong {
    color: ${({ $tokens }) => $tokens.palette.accent};
    font-weight: 700;
  }
`;

const CardsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CreativeCardStyled = styled(motion.div)<TP>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const CardTitle = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.25rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const CardDesc = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.95rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const BulletList = styled.ul<TP>`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BulletItem = styled.li<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '\u2726'; /* ✦ */
    position: absolute;
    left: 0;
    color: ${({ $tokens }) => $tokens.palette.gaming};
  }
`;

const CenteredContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CinematicCreative: React.FC<CinematicCreativeProps> = ({
  sectionTitle,
  sectionBody,
  sectionBodyBold,
  sectionBodyContinued,
  cards,
  tokens,
}) => (
  <SectionBackground $tokens={tokens} $variant="surface">
    <SectionShell $tokens={tokens}>
      <motion.div
        variants={staggerContainer(tokens.motion)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
      >
        <CenteredContent>
          <motion.div variants={staggerItem(tokens.motion)}>
            <SectionHeading $tokens={tokens} style={{ textAlign: 'center' }}>
              {sectionTitle}
            </SectionHeading>
          </motion.div>
          <BodyText $tokens={tokens} variants={staggerItem(tokens.motion)}>
            {sectionBody} <strong>{sectionBodyBold}</strong> {sectionBodyContinued}
          </BodyText>
        </CenteredContent>

        <CardsGrid variants={staggerContainer(tokens.motion)}>
          {cards.map((card) => {
            const Icon = ICON_MAP[card.icon] || Heart;
            return (
              <CreativeCardStyled
                key={card.title}
                $tokens={tokens}
                variants={staggerItem(tokens.motion)}
              >
                <CardHeader>
                  <IconContainer $tokens={tokens}>
                    <Icon size={24} />
                  </IconContainer>
                  <CardTitle $tokens={tokens}>{card.title}</CardTitle>
                </CardHeader>
                <CardDesc $tokens={tokens}>{card.description}</CardDesc>
                <BulletList $tokens={tokens}>
                  {card.bullets.map((b) => (
                    <BulletItem key={b} $tokens={tokens}>{b}</BulletItem>
                  ))}
                </BulletList>
              </CreativeCardStyled>
            );
          })}
        </CardsGrid>
      </motion.div>
    </SectionShell>
  </SectionBackground>
);

export default CinematicCreative;
