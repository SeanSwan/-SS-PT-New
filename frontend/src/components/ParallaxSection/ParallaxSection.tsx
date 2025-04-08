// frontend/src/components/ParallaxSection/ParallaxSection.tsx
import React, { useEffect } from "react";
import styled, { keyframes } from "styled-components";
// Import useScroll instead of useViewportScroll
import { motion, useScroll, useTransform } from "framer-motion";
import GlowButton from "../../components/Button/glowButton"; // Using your existing glowing button

// Keyframe animations from your existing premium components
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
`;

// Styled components for the enhanced ParallaxSection
const ParallaxSectionContainer = styled.section`
  position: relative;
  width: 100%;
  height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  overflow: hidden;
`;

const VideoBackground = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ParallaxContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 800px;
  padding: 2.5rem;
  background: rgba(20, 20, 40, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 15px;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 5s linear infinite;
    z-index: -1;
  }
`;

const ParallaxTitle = styled(motion.h2)`
  font-size: 2.8rem;
  margin-bottom: 1rem;
  font-weight: 600;
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff,
    #a9f8fb
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;

  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const ParallaxText = styled(motion.p)`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ButtonContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 1rem;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;

    & > button, & > div {
      width: 100%;
    }
  }
`;

// Animation variants for smooth entrances
const contentVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: 0.2
    }
  }
};

const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const textVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: "easeOut",
      delay: 0.3
    }
  }
};

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      delay: 0.5
    }
  }
};

const ParallaxSection = () => {
  // Use framer-motion useScroll hook for parallax effect
  // Destructure scrollY directly from useScroll()
  const { scrollY } = useScroll();
  const videoY = useTransform(scrollY, [0, 500], [0, 200]); // useTransform should work similarly

  // Animation timing on component mount
  useEffect(() => {
    // Additional effects can be added here if needed
  }, []);

  return (
    <ParallaxSectionContainer>
      {/* Apply the transformed y value to the VideoBackground */}
      <VideoBackground style={{ y: videoY }}>
        <video autoPlay loop muted playsInline>
          <source src="/src/assets/Waves.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>

      <ParallaxContent
        initial="hidden"
        animate="visible"
        variants={contentVariants}
      >
        <ParallaxTitle
          variants={titleVariants}
        >
          Transform Your Performance
        </ParallaxTitle>

        <ParallaxText
          variants={textVariants}
        >
          Our premium training programs combine cutting-edge science with over 25 years
          of elite coaching experience. We don't just transform bodies—we elevate your entire
          approach to fitness and wellness for extraordinary, lasting results.
        </ParallaxText>

        <ButtonContainer variants={buttonVariants}>
          <GlowButton
            text="View Programs"
            theme="cosmic"
            size="large"
            animateOnRender
            onClick={() => window.location.href = '/store'}
          />

          <GlowButton
            text="Schedule Consultation"
            theme="purple"
            size="large"
            animateOnRender
            onClick={() => console.log('Schedule consultation')} // Consider navigating or opening a modal
          />
        </ButtonContainer>
      </ParallaxContent>
    </ParallaxSectionContainer>
  );
};

export default ParallaxSection;