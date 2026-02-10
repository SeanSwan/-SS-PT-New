import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import GlowButton from "../../../components/ui/buttons/GlowButton";
import logoImg from "../../../assets/Logo.png";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// ═══════════════════════════════════════════════════
// Ethereal Wilderness Hero — Production Homepage
// ═══════════════════════════════════════════════════
// Video bg (desktop only), floating orbs, mist layers,
// faint cyberpunk grid, Cormorant Garamond + Source Sans 3
// ═══════════════════════════════════════════════════

// --- Design Tokens (from EtherealWildernessTheme) ---
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

// --- Custom hook: desktop media query (no MUI) ---
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

// --- Animations ---
const mistDrift = keyframes`
  0%   { transform: translateX(-30px) scaleX(1);   opacity: 0.3; }
  50%  { transform: translateX(30px) scaleX(1.15);  opacity: 0.5; }
  100% { transform: translateX(-30px) scaleX(1);   opacity: 0.3; }
`;

const mistDriftReverse = keyframes`
  0%   { transform: translateX(40px) scaleX(1.1);  opacity: 0.25; }
  50%  { transform: translateX(-40px) scaleX(1);   opacity: 0.45; }
  100% { transform: translateX(40px) scaleX(1.1);  opacity: 0.25; }
`;

const orbFloat = keyframes`
  0%   { transform: translateY(0) translateX(0);     opacity: 0; }
  15%  { opacity: 0.7; }
  50%  { transform: translateY(-180px) translateX(20px); opacity: 0.9; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-360px) translateX(-10px); opacity: 0; }
`;

const gridPulse = keyframes`
  0%   { opacity: 0.015; }
  50%  { opacity: 0.04; }
  100% { opacity: 0.015; }
`;

const logoHalo = keyframes`
  0%   { box-shadow: 0 0 20px rgba(0, 212, 170, 0.15); }
  50%  { box-shadow: 0 0 40px rgba(0, 212, 170, 0.3), 0 0 60px rgba(72, 232, 200, 0.1); }
  100% { box-shadow: 0 0 20px rgba(0, 212, 170, 0.15); }
`;

const gentleFloat = keyframes`
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-8px); }
  100% { transform: translateY(0); }
`;

// --- Reduced motion mixin ---
const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// --- Styled Components ---
const HeroContainer = styled.section`
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: ${T.bg};
  padding: 0 2rem;

  @media (max-width: 768px) {
    padding: 0 1rem;
    min-height: 90vh;
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.35;
  }

  /* Dark overlay for text readability over smoke */
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(10, 10, 26, 0.55) 0%,
      rgba(10, 10, 26, 0.35) 35%,
      rgba(10, 10, 26, 0.45) 65%,
      rgba(10, 10, 26, 0.75) 100%
    );
    z-index: 1;
  }
`;

const GradientBackground = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(0, 212, 170, 0.12), transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(120, 81, 169, 0.08), transparent 50%),
    linear-gradient(180deg, ${T.bg} 0%, #0d1a1a 100%);
`;

const MistLayer = styled.div<{ $top: string; $delay: string; $reverse?: boolean }>`
  position: absolute;
  width: 120%;
  height: 180px;
  left: -10%;
  top: ${({ $top }) => $top};
  background: radial-gradient(
    ellipse at center,
    rgba(0, 212, 170, 0.06) 0%,
    rgba(72, 232, 200, 0.03) 40%,
    transparent 70%
  );
  filter: blur(40px);
  z-index: 2;
  pointer-events: none;
  animation: ${({ $reverse }) => $reverse ? mistDriftReverse : mistDrift}
    ${({ $reverse }) => $reverse ? '22s' : '18s'}
    ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  ${noMotion}
`;

const GridOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: ${gridPulse} 6s ease-in-out infinite;
  ${noMotion}
`;

// --- Floating Orbs ---
interface OrbProps {
  $size: number;
  $left: string;
  $bottom: string;
  $duration: string;
  $delay: string;
  $hue: number;
}

const Orb = styled.div<OrbProps>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  left: ${({ $left }) => $left};
  bottom: ${({ $bottom }) => $bottom};
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(${({ $hue }) => $hue === 0 ? '0, 212, 170' : '72, 232, 200'}, 0.8),
    rgba(${({ $hue }) => $hue === 0 ? '0, 212, 170' : '120, 81, 169'}, 0.2),
    transparent
  );
  box-shadow:
    0 0 ${({ $size }) => $size * 2}px rgba(0, 212, 170, 0.3),
    0 0 ${({ $size }) => $size * 4}px rgba(72, 232, 200, 0.1);
  z-index: 3;
  pointer-events: none;
  animation: ${orbFloat} ${({ $duration }) => $duration} ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  ${noMotion}
`;

// --- Content ---
const ContentWrapper = styled.div`
  position: relative;
  z-index: 10;
  max-width: 1000px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: clamp(2rem, 4vw, 3.5rem);
  background: rgba(10, 15, 25, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  border: 1px solid rgba(0, 212, 170, 0.08);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);

  @media (max-width: 768px) {
    padding: 2rem 1.25rem;
    border-radius: 16px;
  }
`;

const Logo = styled(motion.img)`
  height: clamp(70px, 10vw, 130px);
  width: auto;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 0 20px rgba(0, 212, 170, 0.2));
  border-radius: 50%;
  animation: ${logoHalo} 4s ease-in-out infinite, ${gentleFloat} 6s ease-in-out infinite;
  ${noMotion}

  @media (max-width: 430px) {
    height: clamp(60px, 18vw, 80px);
  }
`;

const Badge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: rgba(0, 212, 170, 0.08);
  border: 1px solid rgba(0, 212, 170, 0.2);
  border-radius: 50px;
  backdrop-filter: blur(10px);
  color: ${T.primary};
  font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  box-shadow: 0 0 20px rgba(0, 212, 170, 0.08);
`;

const Title = styled(motion.h1)`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: clamp(2.4rem, 5vw, 5rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -1px;
  color: ${T.text};
  margin: 0;

  span {
    background: linear-gradient(135deg, ${T.text} 0%, ${T.accent} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 430px) {
    font-size: clamp(2rem, 8vw, 2.6rem);
  }
`;

const Subtitle = styled(motion.p)`
  font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  color: ${T.textSecondary};
  max-width: 700px;
  line-height: 1.7;
  margin: 0;
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;

  @media (max-width: 600px) {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
    & > div, & > button { width: 100% !important; }
  }
`;

// --- Orb configuration ---
interface OrbConfig {
  size: number;
  left: string;
  bottom: string;
  duration: string;
  delay: string;
  hue: number;
}

const ORB_CONFIGS_MOBILE: OrbConfig[] = [
  { size: 4, left: '15%', bottom: '10%', duration: '8s',  delay: '0s',   hue: 0 },
  { size: 6, left: '45%', bottom: '20%', duration: '10s', delay: '2s',   hue: 1 },
  { size: 3, left: '75%', bottom: '5%',  duration: '7s',  delay: '4s',   hue: 0 },
  { size: 5, left: '30%', bottom: '15%', duration: '9s',  delay: '1s',   hue: 1 },
  { size: 4, left: '60%', bottom: '25%', duration: '11s', delay: '3s',   hue: 0 },
];

const ORB_CONFIGS_DESKTOP: OrbConfig[] = [
  ...ORB_CONFIGS_MOBILE,
  { size: 5, left: '10%', bottom: '30%', duration: '12s', delay: '5s',   hue: 1 },
  { size: 7, left: '85%', bottom: '15%', duration: '9s',  delay: '6s',   hue: 0 },
  { size: 3, left: '55%', bottom: '35%', duration: '8s',  delay: '7s',   hue: 1 },
  { size: 6, left: '25%', bottom: '40%', duration: '10s', delay: '2.5s', hue: 0 },
  { size: 4, left: '70%', bottom: '45%', duration: '11s', delay: '4.5s', hue: 1 },
];

// --- Component ---
const HeroSectionV2: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();

  const orbConfigs = useMemo(
    () => prefersReducedMotion ? [] : (isDesktop ? ORB_CONFIGS_DESKTOP : ORB_CONFIGS_MOBILE),
    [isDesktop, prefersReducedMotion]
  );

  return (
    <HeroContainer>
      {/* Background: video on desktop, gradient on mobile */}
      {isDesktop && !prefersReducedMotion ? (
        <VideoBackground>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster=""
          >
            <source src="/smoke.mp4" type="video/mp4" />
          </video>
        </VideoBackground>
      ) : (
        <GradientBackground />
      )}

      {/* Atmospheric layers */}
      <GridOverlay aria-hidden="true" />
      <MistLayer $top="15%" $delay="0s" aria-hidden="true" />
      <MistLayer $top="55%" $delay="4s" $reverse aria-hidden="true" />
      {isDesktop && <MistLayer $top="80%" $delay="8s" aria-hidden="true" />}

      {/* Floating orbs */}
      {orbConfigs.map((orb, i) => (
        <Orb
          key={i}
          $size={orb.size}
          $left={orb.left}
          $bottom={orb.bottom}
          $duration={orb.duration}
          $delay={orb.delay}
          $hue={orb.hue}
          aria-hidden="true"
        />
      ))}

      {/* Content */}
      <ContentWrapper>
        <Logo
          src={logoImg}
          alt="SwanStudios"
          width={130}
          height={130}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
        />

        <Badge
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
          <Star size={14} fill="currentColor" />
          Elite Personal Training
        </Badge>

        <Title
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2 }}
        >
          Forge Your Body,<br /><span>Free Your Spirit</span>
        </Title>

        <Subtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.4 }}
        >
          The world's first Fitness Social Ecosystem. Expert coaching refined by 25 years
          of science, AI-powered tracking, and a community that fuels your transformation.
        </Subtitle>

        <ButtonGroup
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.6 }}
        >
          <GlowButton
            text="View Packages in Store"
            theme="cosmic"
            size="large"
            rightIcon={<ArrowRight />}
            onClick={() => navigate('/shop')}
            animateOnRender
          />
          <GlowButton
            text="Book Free Movement Screen"
            theme="primary"
            size="large"
            onClick={() => navigate('/contact')}
            animateOnRender
          />
        </ButtonGroup>
      </ContentWrapper>
    </HeroContainer>
  );
};

export default HeroSectionV2;
