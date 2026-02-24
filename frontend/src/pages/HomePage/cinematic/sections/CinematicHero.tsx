/**
 * CinematicHero.tsx — 100dvh hero section with gradient overlay and weighted text animation.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { HeroContent } from '../HomepageContent';
import { heroTextContainer, heroTextItem } from '../cinematic-animations';
import { AccentBadge, MagneticButton } from '../cinematic-shared';

interface CinematicHeroProps {
  content: HeroContent;
  tokens: CinematicTokens;
}

// ─── Styled Components ───────────────────────────────────────────────

const HeroWrapper = styled.section<{ $tokens: CinematicTokens }>`
  position: relative;
  width: 100%;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: ${({ $tokens }) => $tokens.palette.bg};
`;

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const GradientOverlay = styled.div<{ $tokens: CinematicTokens }>`
  position: absolute;
  inset: 0;
  background: ${({ $tokens }) => {
    const { bg, surface, gaming, accent } = $tokens.palette;
    return `
      radial-gradient(ellipse at 20% 50%, ${gaming}12 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, ${accent}10 0%, transparent 40%),
      radial-gradient(ellipse at 50% 100%, ${surface} 0%, ${bg} 70%)
    `;
  }};
  background-size: 200% 200%;
  animation: ${gradientFlow} 20s ease infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: 100% 100%;
  }
`;

const floatParticle = keyframes`
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.3; }
  50% { transform: translateY(-60vh) translateX(20px); opacity: 0.15; }
  90% { opacity: 0; }
  100% { transform: translateY(-100vh) translateX(-10px); }
`;

const ParticleField = styled.div<{ $tokens: CinematicTokens }>`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  span {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: ${({ $tokens }) => $tokens.palette.gaming};
    animation: ${floatParticle} 12s ease-in-out infinite;
    opacity: 0;

    &:nth-child(1) { left: 10%; bottom: -5%; animation-delay: 0s; animation-duration: 14s; }
    &:nth-child(2) { left: 25%; bottom: -5%; animation-delay: 2s; animation-duration: 16s; }
    &:nth-child(3) { left: 45%; bottom: -5%; animation-delay: 4s; animation-duration: 12s; }
    &:nth-child(4) { left: 65%; bottom: -5%; animation-delay: 1s; animation-duration: 18s; }
    &:nth-child(5) { left: 80%; bottom: -5%; animation-delay: 3s; animation-duration: 15s; }
    &:nth-child(6) { left: 90%; bottom: -5%; animation-delay: 5s; animation-duration: 13s; }
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const ContentContainer = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const HeadingLine = styled(motion.h1)<{ $tokens: CinematicTokens }>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: ${({ $tokens }) => $tokens.typography.headingWeight};
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const HeadingAccent = styled(motion.span)<{ $tokens: CinematicTokens }>`
  display: block;
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  font-weight: 500;
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 1.05;
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subheading = styled(motion.p)<{ $tokens: CinematicTokens }>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.7;
  max-width: 640px;
  margin: 0;
`;

const ButtonRow = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
`;

const PrimaryLink = styled(Link)<{ $tokens: CinematicTokens }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  min-height: 44px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const SecondaryLink = styled(Link)<{ $tokens: CinematicTokens }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  background: transparent;
  color: ${({ $tokens }) => $tokens.palette.accent};
  border: 1.5px solid ${({ $tokens }) => $tokens.palette.accent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  min-height: 44px;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: ${({ $tokens }) => $tokens.palette.accent}10;
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const ScrollIndicator = styled(motion.div)<{ $tokens: CinematicTokens }>`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-family: ${({ $tokens }) => $tokens.typography.monoFamily};

  @media (max-width: 768px) {
    display: none;
  }
`;

const scrollBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
`;

const ScrollDot = styled.div<{ $tokens: CinematicTokens }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $tokens }) => $tokens.palette.accent};
  animation: ${scrollBounce} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ─── Component ───────────────────────────────────────────────────────

const CinematicHero: React.FC<CinematicHeroProps> = ({ content, tokens }) => {
  const showParticles = tokens.motion !== 'low';

  return (
    <HeroWrapper $tokens={tokens}>
      <GradientOverlay $tokens={tokens} />

      {showParticles && (
        <ParticleField $tokens={tokens}>
          <span /><span /><span /><span /><span /><span />
        </ParticleField>
      )}

      <ContentContainer
        variants={heroTextContainer(tokens.motion)}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={heroTextItem(tokens.motion)}>
          <AccentBadge $tokens={tokens}>
            <Sparkles size={14} />
            {content.badge}
          </AccentBadge>
        </motion.div>

        <HeadingLine $tokens={tokens} variants={heroTextItem(tokens.motion)}>
          {content.heading}
          <HeadingAccent $tokens={tokens}>
            {content.headingAccent}
          </HeadingAccent>
        </HeadingLine>

        <Subheading $tokens={tokens} variants={heroTextItem(tokens.motion)}>
          {content.subheading}
        </Subheading>

        <ButtonRow variants={heroTextItem(tokens.motion)}>
          <PrimaryLink to={content.ctaPrimary.path} $tokens={tokens}>
            {content.ctaPrimary.label}
            <ArrowRight size={18} />
          </PrimaryLink>
          <SecondaryLink to={content.ctaSecondary.path} $tokens={tokens}>
            {content.ctaSecondary.label}
          </SecondaryLink>
        </ButtonRow>
      </ContentContainer>

      <ScrollIndicator
        $tokens={tokens}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        Scroll
        <ScrollDot $tokens={tokens} />
      </ScrollIndicator>
    </HeroWrapper>
  );
};

export default CinematicHero;
