// frontend/src/pages/HomePage/components/Hero-Section.V2.tsx

/**
 * Hero Section v2.0 - Homepage Refactor
 *
 * **Major Changes from v1.0:**
 * 1. Replaced 8MB video background with LivingConstellation (performance tier system)
 * 2. Replaced custom backdrop-filter card with FrostedCard (thick glass)
 * 3. Added ParallaxSectionWrapper (fast speed for dynamic foreground)
 * 4. Respects prefers-reduced-motion (auto-switches to minimal tier)
 * 5. GPU-accelerated animations (will-change, transform)
 *
 * **Performance Targets:**
 * - LCP: ≤ 2.5s (v1.0: ~4.5s with video)
 * - CLS: ≤ 0.1
 * - FPS: ≥ 30 FPS (v1.0: ~20 FPS with video on mid-range devices)
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 2) - Hero Section
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 * @see docs/ai-workflow/WEEK-1-COMPLETION-REPORT.md
 */

import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// v2.0 Foundation Components
import LivingConstellation from "../../../components/ui-kit/background/LivingConstellation";
import FrostedCard from "../../../components/ui-kit/glass/FrostedCard";
import ParallaxSectionWrapper from "../../../components/ui-kit/parallax/ParallaxSectionWrapper";

// Existing components
import GlowButton from "../../../components/ui/buttons/GlowButton";
import OrientationForm from "../../../components/OrientationForm/orientationForm";

// Hooks
import { useUniversalTheme } from "../../../context/ThemeContext";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// Assets
import logoImg from "/Logo.png";

// --- Animation Keyframes ---

const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0); }
`;

const subtleRotate = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(0.5deg); }
  75% { transform: rotate(-0.5deg); }
  100% { transform: rotate(0deg); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0,255,255,0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
`;

const stellarGlow = keyframes`
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
`;

const textShine = keyframes`
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
`;

// --- Styled Components ---

const HeroContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
  padding-top: 6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 1.5rem;
    padding-top: 5rem;
  }
`;

/**
 * v2.0 Background Container
 * Replaces VideoBackground with LivingConstellation
 * Performance: 0-10% CPU vs 15-25% CPU for video
 */
const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden;
`;

const LogoContainer = styled(motion.div)`
  margin: 0 auto;
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  margin-top: 2rem;
  z-index: 5;
  transform-origin: center center;

  img {
    height: 160px;
    max-width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.6));
    transition: filter 0.3s ease;
  }

  &:hover img {
    filter: drop-shadow(0 0 25px rgba(0, 255, 255, 0.8));
  }

  @media (max-width: 768px) {
    img {
      height: 120px;
    }
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 480px) {
    img {
      height: 100px;
    }
  }
`;

/**
 * v2.0 Hero Content Wrapper
 * Now using FrostedCard for consistent glassmorphism
 * Max-width increased for better content breathing room
 */
const HeroContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  max-width: 900px;
  width: 92%;
  margin: 0 auto;

  @media (max-width: 768px) {
    width: 95%;
  }

  @media (max-width: 480px) {
    width: 97%;
  }
`;

/**
 * Inner content padding (inside FrostedCard)
 */
const HeroInner = styled(motion.div)`
  padding: 2.5rem 2rem;

  @media (max-width: 768px) {
    padding: 1.8rem 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1.5rem 1.2rem;
  }
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #00FFFF, #7851A9);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(120, 81, 169, 0.8);
  letter-spacing: 1px;
  text-align: center;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const TaglineContainer = styled(motion.div)`
  margin: 2rem 0;
  overflow: hidden;

  @media (max-width: 768px) {
    margin: 1rem 0;
  }
`;

const Tagline = styled(motion.h2)`
  font-size: 2.2rem;
  font-weight: 300;
  line-height: 1.4;
  color: #E8F0FF;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.15rem;
  line-height: 1.8;
  color: #E8F0FF;
  margin-bottom: 2.5rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);

  strong {
    color: #00FFFF;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 1rem;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
    gap: 1rem;

    button {
      width: 100%;
    }
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
  font-size: 0.9rem;
  color: #E8F0FF;
  opacity: 0.7;
  transition: opacity 0.3s ease;
  z-index: 10;

  &:hover {
    opacity: 1;
  }

  &::after {
    content: "↓";
    display: block;
    text-align: center;
    font-size: 1.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    bottom: 1.5rem;
  }
`;

// --- Component ---

const HeroSectionV2: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useUniversalTheme();
  const prefersReducedMotion = useReducedMotion();

  const [showOrientation, setShowOrientation] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // Hide scroll indicator on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToServices = () => {
    const servicesSection = document.getElementById("services");
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Animation variants (disabled if prefers-reduced-motion)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
        delayChildren: prefersReducedMotion ? 0 : 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <HeroContainer>
      {/* v2.0 Background: LivingConstellation replaces video */}
      <BackgroundContainer>
        <LivingConstellation
          density="medium"
          interactive={true}
          paused={false}
          colorFrom="#00FFFF" // Swan Cyan (primary)
          colorTo="#7851A9"   // Cosmic Purple (secondary)
        />
      </BackgroundContainer>

      {/* v2.0 Parallax wrapper for dynamic foreground */}
      <ParallaxSectionWrapper speed="fast" disabledOnMobile={true}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <LogoContainer
            variants={itemVariants}
          >
            <img src={logoImg} alt="SwanStudios Logo" loading="eager" />
          </LogoContainer>

          {/* v2.0 Hero Content: FrostedCard (thick glass) */}
          <HeroContentWrapper>
            <FrostedCard
              glassLevel="thick"
              elevation={3}
              interactive={true}
              borderVariant="elegant"
            >
              <HeroInner>
                {/* Title */}
                <Title
                  variants={itemVariants}
                >
                  Welcome to SwanStudios
                </Title>

                {/* Tagline */}
                <TaglineContainer variants={itemVariants}>
                  <Tagline>
                    TRANSFORM YOUR BODY. <br />
                    ELEVATE YOUR LIFE.
                  </Tagline>
                </TaglineContainer>

                {/* Description */}
                <HeroDescription variants={itemVariants}>
                  Welcome to SwanStudios—the world's first{" "}
                  <strong>Fitness Social Ecosystem</strong> where every workout,
                  every meal, and every connection is supercharged. We fuse the
                  passion of <strong>expert trainers</strong> with the power of
                  intelligent AI to unleash your ultimate potential. Serving Orange
                  County's most dedicated professionals from Anaheim Hills to
                  Newport Beach, and Los Angeles from Beverly Hills to Manhattan
                  Beach. Your transformation isn't just possible—
                  <strong>it's inevitable. ARE YOU READY?!</strong>
                </HeroDescription>

                {/* CTA Buttons */}
                <ButtonsContainer variants={itemVariants}>
                  <GlowButton
                    text="START MY FITNESS JOURNEY"
                    variant={currentTheme === 'swan-galaxy' ? 'primary' : currentTheme === 'admin-command' ? 'primary' : 'cosmic'}
                    size="large"
                    animateOnRender={false}
                    onClick={() => setShowOrientation(true)}
                    aria-label="Start your personalized fitness journey"
                  />
                  <GlowButton
                    text="PREVIEW MY UNIVERSE"
                    variant={currentTheme === 'swan-galaxy' ? 'cosmic' : currentTheme === 'admin-command' ? 'primary' : 'purple'}
                    size="large"
                    animateOnRender={false}
                    onClick={() => navigate("/store")}
                    aria-label="Preview your personalized SwanStudios universe"
                  />
                </ButtonsContainer>
              </HeroInner>
            </FrostedCard>
          </HeroContentWrapper>
        </motion.div>
      </ParallaxSectionWrapper>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <ScrollIndicator
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: prefersReducedMotion ? 0 : 1.5,
            duration: prefersReducedMotion ? 0 : 0.8,
          }}
          onClick={scrollToServices}
          aria-label="Scroll down to discover more"
        >
          Scroll
        </ScrollIndicator>
      )}

      {/* Orientation Form Modal */}
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </HeroContainer>
  );
};

export default HeroSectionV2;
