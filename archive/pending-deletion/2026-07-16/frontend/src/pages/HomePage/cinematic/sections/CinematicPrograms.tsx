/**
 * CinematicPrograms.tsx — 3 interactive program cards with badges and feature lists.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown, Zap } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { ProgramCard } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription, GlassCard } from '../cinematic-shared';

interface CinematicProgramsProps {
  sectionTitle: string;
  sectionDescription: string;
  cards: ProgramCard[];
  bottomCta: { label: string; path: string };
  tokens: CinematicTokens;
}

// ─── Styled Components ───────────────────────────────────────────────

interface TP { $tokens: CinematicTokens }

const CardsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const ProgramCardStyled = styled(motion.div)<TP>`
  position: relative;
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const BadgeLabel = styled.div<TP & { $type: string }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.375rem 0.875rem;
  border-radius: 1.5rem;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: ${({ $tokens, $type }) =>
    $type === 'Most Popular'
      ? `linear-gradient(135deg, ${$tokens.palette.accent}, ${$tokens.palette.gaming})`
      : `linear-gradient(135deg, ${$tokens.palette.gaming}80, ${$tokens.palette.secondary})`};
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
`;

const CardTitle = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.5rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0 0 0.25rem;
`;

const CardSubtitle = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  font-size: 1rem;
  color: ${({ $tokens }) => $tokens.palette.accent};
  margin: 0 0 0.75rem;
`;

const IdealFor = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  margin: 0 0 1.25rem;
  font-style: italic;
`;

const FeatureList = styled.ul<TP>`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const FeatureItem = styled.li<TP>`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    color: ${({ $tokens }) => $tokens.palette.gaming};
    margin-top: 2px;
  }
`;

const CardCta = styled(Link)<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  background: transparent;
  color: ${({ $tokens }) => $tokens.palette.accent};
  border: 1.5px solid ${({ $tokens }) => $tokens.palette.accent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  align-self: flex-start;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: ${({ $tokens }) => $tokens.palette.accent}10;
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const BottomCtaRow = styled.div`
  display: flex;
  justify-content: center;
`;

const BottomCtaLink = styled(Link)<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  min-height: 44px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

// ─── Component ───────────────────────────────────────────────────────

const CinematicPrograms: React.FC<CinematicProgramsProps> = ({
  sectionTitle,
  sectionDescription,
  cards,
  bottomCta,
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
        <motion.div variants={staggerItem(tokens.motion)}>
          <SectionHeading $tokens={tokens}>{sectionTitle}</SectionHeading>
        </motion.div>
        <motion.div variants={staggerItem(tokens.motion)}>
          <SectionDescription $tokens={tokens}>{sectionDescription}</SectionDescription>
        </motion.div>

        <CardsGrid variants={staggerContainer(tokens.motion)}>
          {cards.map((card, i) => (
            <ProgramCardStyled
              key={card.title}
              $tokens={tokens}
              variants={staggerItem(tokens.motion)}
            >
              {card.badge && (
                <BadgeLabel $tokens={tokens} $type={card.badge}>
                  {card.badge === 'Most Popular' ? <Crown size={12} /> : <Zap size={12} />}
                  {' '}{card.badge}
                </BadgeLabel>
              )}
              <CardTitle $tokens={tokens}>{card.title}</CardTitle>
              <CardSubtitle $tokens={tokens}>{card.subtitle}</CardSubtitle>
              <IdealFor $tokens={tokens}>Ideal for: {card.idealFor}</IdealFor>
              <FeatureList $tokens={tokens}>
                {card.features.map((f) => (
                  <FeatureItem key={f} $tokens={tokens}>
                    <Check size={16} />
                    {f}
                  </FeatureItem>
                ))}
              </FeatureList>
              <CardCta to={card.ctaPath} $tokens={tokens}>
                {card.ctaLabel}
                <ArrowRight size={16} />
              </CardCta>
            </ProgramCardStyled>
          ))}
        </CardsGrid>

        <BottomCtaRow>
          <BottomCtaLink to={bottomCta.path} $tokens={tokens}>
            {bottomCta.label}
            <ArrowRight size={18} />
          </BottomCtaLink>
        </BottomCtaRow>
      </motion.div>
    </SectionShell>
  </SectionBackground>
);

export default CinematicPrograms;
