// frontend/src/components/ParallaxSection/ParallaxSection.tsx
import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import GlowButton from "../../components/Button/glowButton";

// Import correct video path
import wavesVideo from "/Swans.mp4"; // Adjust path if needed

// Keyframe animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
`;

// Styled components
const ParallaxSectionContainer = styled.section`
  position: relative;
  width: 100%;
  height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: #09041e; // Matched with button theme background
  overflow: hidden;
`;

const VideoBackground = styled(motion.div)`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0;

  &:after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      160deg, 
      rgba(120, 81, 169, 0.4), 
      rgba(9, 4, 30, 0.7), 
      rgba(0, 159, 253, 0.3)
    );
    z-index: 1;
  }

  video {
    width: 100%; height: 100%;
    object-fit: cover;
    filter: brightness(0.8);
  }
`;

// Content container - adjusted to match hero aesthetics
const ParallaxContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 800px;
  width: 90%;
  padding: 3rem;
  background: rgba(10, 10, 30, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.65);
  
  // Adding subtle pulsating glow to match hero elements
  animation: ${glow} 6s ease-in-out infinite;
`;

// Corrected ParallaxTitle: Match hero section styling
const ParallaxTitle = styled(motion.h2)`
  font-size: clamp(2.2rem, 5.5vw, 3rem);
  margin-bottom: 1.2rem;
  font-weight: 700;
  position: relative;
  z-index: 1;

  /* Gradient effect - exact match with Hero Section */
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
  
  /* Text shadow to match hero */
  text-shadow: 0 0 30px rgba(120, 81, 169, 0.8);

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const ParallaxText = styled(motion.p)`
  font-size: clamp(1rem, 2.5vw, 1.15rem);
  margin-bottom: 2.5rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
     margin-bottom: 2rem;
  }
`;

const ButtonContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 1.5rem;
  position: relative;
  z-index: 3;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    & > div, & > button {
      width: 100%;
      max-width: 250px;
    }
  }
`;

// Animation variants - fully implemented
const contentVariants = {
  hidden: { 
    opacity: 0,
    y: 30
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.7, 
      ease: "easeOut",
      delayChildren: 0.2,
      staggerChildren: 0.15
    }
  }
};

const titleVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

const textVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

const buttonVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

// --- ParallaxSection Component ---
const ParallaxSection: React.FC = () => {
  const { scrollY } = useScroll();
  const videoY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(contentRef, { once: true, amount: 0.3 });

  return (
    <ParallaxSectionContainer>
      <VideoBackground style={{ y: videoY }}>
        <video autoPlay loop muted playsInline poster="/video-poster.jpg">
          <source src={wavesVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>

      <ParallaxContent
        ref={contentRef}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={contentVariants}
      >
        <ParallaxTitle variants={titleVariants}>
          Transform Your Performance
        </ParallaxTitle>

        <ParallaxText variants={textVariants}>
          Our premium training programs combine cutting-edge science with over 25 years of
          elite coaching experience. We don't just transform bodies—we elevate your entire
          approach to fitness and wellness for extraordinary, lasting results.
        </ParallaxText>

        <ButtonContainer variants={buttonVariants}>
          <GlowButton
            text="View Programs"
            theme="cosmic"
            size="large"
            animateOnRender={false}
            onClick={() => (window.location.href = "/store")}
          />
          <GlowButton
            text="Schedule Consultation"
            theme="purple"
            size="large"
            animateOnRender={false}
            onClick={() => console.log("Schedule consultation")}
          />
        </ButtonContainer>
      </ParallaxContent>
    </ParallaxSectionContainer>
  );
};

export default ParallaxSection;