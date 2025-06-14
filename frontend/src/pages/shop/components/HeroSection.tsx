/**
 * HeroSection.tsx - Decomposed Hero Section Component
 * ================================================================
 * Extracted from monolithic GalaxyThemedStoreFront.tsx
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
 * - Stable animation references
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useAnimation, useInView } from 'framer-motion';
import { ThemedGlowButton } from '../../../styles/swan-theme-utils';

// Galaxy Theme Constants
const GALAXY_COLORS = {
  deepSpace: '#0a0a0f',
  nebulaPurple: '#1e1e3f',
  cyberCyan: '#00ffff',
  stellarWhite: '#ffffff',
  cosmicPurple: '#7851a9',
  starGold: '#ffd700',
  energyBlue: '#00c8ff',
  plasmaGreen: '#00ff88',
  warningRed: '#ff416c'
};

// Asset paths
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";
const swanIcon = "/Logo.png";

// Keyframe animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const starSparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const galacticShimmer = keyframes`
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

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient( 
      to bottom, 
      rgba(0, 0, 0, 0.6), 
      rgba(10, 10, 30, 0.8), 
      rgba(30, 30, 60, 0.9) 
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
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.6));
  margin-bottom: 1.5rem;
  z-index: 2;
  will-change: transform;

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
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.6), rgba(120, 81, 169, 0.3));
  padding: 2rem;
  border-radius: 20px;
  backdrop-filter: blur(15px);
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  padding: 12px 20px;
  border: 2px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.6));
  backdrop-filter: blur(10px);
  color: ${GALAXY_COLORS.stellarWhite};
  z-index: 3;
  letter-spacing: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:before {
    content: "";
    width: 24px;
    height: 24px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    background-size: 200% auto;
    animation: ${galacticShimmer} 3s linear infinite;
    border-radius: 8px;
  }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}, 
    ${GALAXY_COLORS.cyberCyan}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${galacticShimmer} 3s linear infinite;
  padding: 0 5px;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${galacticShimmer} 4s linear infinite;
  display: inline-block;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  max-width: 800px;
  margin: 0 auto 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
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
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  z-index: 2;
  
  &:after {
    content: "↓";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    animation: ${float} 3s ease-in-out infinite;
    color: ${GALAXY_COLORS.cyberCyan};
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

// Button motion props
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

  // Optimized scroll handler
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

  // Animation trigger
  useEffect(() => {
    if (isHeroInView) {
      heroControls.start("visible");
    }
  }, [isHeroInView, heroControls]);

  return (
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
            25+ Years of Experience & NASM-Approved Protocols
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
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;