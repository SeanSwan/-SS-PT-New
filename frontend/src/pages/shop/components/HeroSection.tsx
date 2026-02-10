/**
 * HeroSection.tsx - Store Hero Section (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness token migration. Video background preserved.
 *
 * Responsibilities:
 * - Video background display
 * - Logo and branding
 * - Hero content (title, subtitle, description)
 * - Call-to-action buttons
 * - Scroll indicator
 *
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Optimized scroll event handling
 * - Reduced-motion gated animations
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, useAnimation, useInView, MotionConfig } from 'framer-motion';
import { ThemedGlowButton } from '../../../styles/swan-theme-utils';

// EW Design Tokens
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// Asset paths
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";

// Keyframe animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const HeroContainer = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  overflow: hidden;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(10, 10, 26, 0.5),
      rgba(10, 10, 26, 0.75),
      rgba(10, 10, 26, 0.95)
    );
    z-index: 1;
  }

  video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: 0;
  }
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5rem;
  z-index: 2;
  filter: drop-shadow(0 0 15px rgba(0, 212, 170, 0.4));
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} 6s ease-in-out infinite;
  }

  img {
    height: 160px;
    max-width: 90%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    img { height: 120px; }
    margin-bottom: 1rem;
  }

  @media (max-width: 480px) {
    img { height: 100px; }
    margin-bottom: 0.5rem;
  }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  background: ${T.surface};
  padding: 2.5rem;
  border-radius: 16px;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 212, 170, 0.15);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 0.9rem;
  padding: 10px 18px;
  border: 1px solid rgba(0, 212, 170, 0.25);
  border-radius: 50px;
  background: rgba(0, 212, 170, 0.1);
  backdrop-filter: blur(10px);
  color: ${T.primary};
  z-index: 3;
  letter-spacing: 3px;
  font-weight: 700;
  text-transform: uppercase;
`;

const HeroTitle = styled(motion.h1)`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 3.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${T.text};
  letter-spacing: 1px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient(
    to right,
    ${T.primary},
    ${T.accent},
    ${T.secondary},
    ${T.primary}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${shimmer} 4s linear infinite;
  }
`;

const HeroSubtitle = styled(motion.h2)`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  color: ${T.primary};
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 1.15rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 1.05rem;
  margin-bottom: 2rem;
  line-height: 1.7;
  color: rgba(240, 248, 255, 0.85);
  max-width: 700px;
  margin: 0 auto 2rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;
  position: relative;
  z-index: 3;

  & > div,
  & > button {
    position: relative;
    flex: 1 1 auto;
    min-width: 180px;
    max-width: 250px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;

    & > div,
    & > button {
      width: 100%;
      max-width: 280px;
    }
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.75rem;
  color: ${T.textSecondary};
  letter-spacing: 2px;
  text-transform: uppercase;
  z-index: 2;
  ${noMotion}

  &::after {
    content: "\\2193";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    color: ${T.primary};

    @media (prefers-reduced-motion: no-preference) {
      animation: ${float} 3s ease-in-out infinite;
    }
  }
`;

// Component Props Interface
interface HeroSectionProps {
  onBookConsultation: () => void;
  onViewPackages: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const buttonMotionProps = {
  whileHover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  whileTap: {
    scale: 0.95
  }
};

// Memoized HeroSection Component
const HeroSection: React.FC<HeroSectionProps> = memo(({
  onBookConsultation,
  onViewPackages
}) => {
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroControls = useAnimation();
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setAnimateScrollIndicator(window.scrollY < 200);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isHeroInView) {
      heroControls.start("visible");
    }
  }, [isHeroInView, heroControls]);

  return (
    <MotionConfig reducedMotion="user">
      <HeroContainer ref={heroRef}>
        <VideoBackground>
          <video autoPlay loop muted playsInline key="hero-bg-video">
            <source src={swanVideo} type="video/mp4" />
          </video>
        </VideoBackground>

        <PremiumBadge
          initial={{ opacity: 0, x: 20 }}
          animate={heroControls}
          variants={itemVariants}
          transition={{ delay: 0.5 }}
        >
          PREMIER
        </PremiumBadge>

        <motion.div
          initial={{ opacity: 0 }}
          animate={heroControls}
          variants={containerVariants}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2
          }}
        >
          <LogoContainer variants={itemVariants}>
            <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
          </LogoContainer>

          <HeroContent variants={itemVariants}>
            <HeroTitle variants={itemVariants}>
              Elite Training Designed by{' '}
              <AnimatedName>Sean Swan</AnimatedName>
            </HeroTitle>
            <HeroSubtitle variants={itemVariants}>
              25+ Years of Experience &amp; NASM-Approved Protocols
            </HeroSubtitle>
            <HeroDescription variants={itemVariants}>
              Discover a revolutionary workout program tailored to your unique goals.
              Leveraging over two decades of expertise and cutting-edge techniques,
              Sean Swan delivers results that redefine your limits.
            </HeroDescription>
            <ButtonsContainer variants={itemVariants}>
              <motion.div {...buttonMotionProps}>
                <ThemedGlowButton
                  text="Book Consultation"
                  variant="primary"
                  size="large"
                  onClick={onBookConsultation}
                />
              </motion.div>
              <motion.div {...buttonMotionProps}>
                <ThemedGlowButton
                  text="View Packages"
                  variant="secondary"
                  size="large"
                  onClick={onViewPackages}
                />
              </motion.div>
            </ButtonsContainer>
          </HeroContent>
        </motion.div>

        {animateScrollIndicator && (
          <ScrollIndicator
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            DISCOVER SWANSTUDIOS
          </ScrollIndicator>
        )}
      </HeroContainer>
    </MotionConfig>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
