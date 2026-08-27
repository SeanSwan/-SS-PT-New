/**
 * HeroSection — About page hero with parallax video background
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import TypewriterText from '../../../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../../../components/ui-kit/cinematic/ParallaxHero';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import logoImg from '../../../../assets/Logo.png';
import { VIDEO } from '../../../../config/videoAssets';
import { YEARS_EXPERIENCE_CLAIM } from '../../../../content/marketingStats';

interface HeroSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const pulseGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.15)); }
  50% { filter: drop-shadow(0 0 35px rgba(139, 92, 246, 0.3)); }
`;

const HeroLogo = styled.img`
  border-radius: 50%;
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  animation: ${pulseGlow} 3s ease-in-out infinite;

  @media (min-width: 2560px) { width: 160px; height: 160px; }
  @media (min-width: 3840px) { width: 200px; height: 200px; }
`;

const HeroHeadline = styled.h1`
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 1rem;
  line-height: 1.15;

  @media (max-width: 320px) { font-size: 1.6rem; }
  @media (min-width: 2560px) { font-size: 4.5rem; }
  @media (min-width: 3840px) { font-size: 6rem; }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(0.95rem, 2vw, 1.2rem);
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  text-align: center;

  @media (max-width: 320px) { font-size: 0.85rem; max-width: 280px; }
  @media (min-width: 2560px) { font-size: 1.5rem; max-width: 800px; }
  @media (min-width: 3840px) { font-size: 1.9rem; max-width: 1000px; }
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: 320px) {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
`;

const HeroSection: React.FC<HeroSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const isFull = tier === 'full';

  return (
    <ParallaxHero
      imageSrc="/images/parallax/about-hero-bg.png"
      videoSrc={VIDEO.waves}
      overlayOpacity={0.6}
      minHeight="100vh"
    >
      <HeroLogo src={logoImg} alt="SwanStudios logo" />
      <HeroHeadline>
        {isFull ? (
          <TextSplitter text="Achieve Your Best Self" as="span" mode="words" />
        ) : (
          <TypewriterText text="Achieve Your Best Self" as="span" speed={55} />
        )}
      </HeroHeadline>
      <HeroSubtitle>
        Discover a training experience built on {YEARS_EXPERIENCE_CLAIM} years of expertise,
        cutting-edge science, and an unwavering commitment to your success.
      </HeroSubtitle>
      <HeroButtons>
        <ForgeButton
          text="Book Consultation"
          variant="primary"
          size="large"
          onClick={() => navigate('/contact')}
          animateOnRender
        />
        <ForgeButton
          text="View Programs"
          variant="accent"
          size="large"
          onClick={() => navigate('/shop')}
          animateOnRender
        />
      </HeroButtons>
    </ParallaxHero>
  );
};

export default HeroSection;
