// src/pages/HomePage/components/Hero-Section.jsx - Fixed and enhanced version

import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import heroVideo from "../../assets/swan.mp4";
import GlowButton from "../../components/Button/glowButton";

// ---------------------------
// HeroPageStore Styled Components with improved z-index handling
// ---------------------------
const HeroStoreContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  isolation: isolate; /* Creates a new stacking context */
`;

// Video background with improved positioning
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  opacity: 0.9;
`;

// Color overlay with better gradient
const ColorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom right,
    rgba(75, 0, 130, 0.85),
    rgba(0, 0, 0, 0.8)
  );
  z-index: -1;
`;

// Content with improved positioning and responsive design
const HeroContent = styled.div`
  position: relative;
  z-index: 10; /* Explicitly higher than background elements */
  padding: clamp(1.5rem, 5vw, 3rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: clamp(900px, 80vw, 1800px);
  margin: 0 auto;
  
  /* Ultra-responsive adjustments */
  @media (max-width: 480px) {
    padding: 1.5rem 1rem;
  }
  
  @media (min-width: 2560px) {
    max-width: 2200px;
  }
`;

// Ultra-responsive title
const HeroTitle = styled(motion.h1)`
  font-size: clamp(2rem, 5vw, 4rem);
  margin-bottom: clamp(0.5rem, 2vw, 1.5rem);
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  width: 100%;
  
  /* Ultra-wide adjustment */
  @media (min-width: 2560px) {
    font-size: 5rem;
  }
`;

// Ultra-responsive subtitle
const HeroSubtitle = styled(motion.h2)`
  font-size: clamp(1rem, 2.5vw, 1.8rem);
  margin-bottom: clamp(1rem, 3vw, 2.5rem);
  color: var(--silver, #C0C0C0);
  width: 100%;
  
  /* Ultra-wide adjustment */
  @media (min-width: 2560px) {
    font-size: 2.5rem;
  }
`;

// Ultra-responsive description
const HeroDescription = styled(motion.p)`
  font-size: clamp(0.9rem, 1.8vw, 1.3rem);
  margin-bottom: clamp(1.5rem, 3vw, 3rem);
  line-height: 1.6;
  color: #ffffff;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;
  
  /* Ultra-wide adjustment */
  @media (min-width: 2560px) {
    font-size: 1.6rem;
    max-width: 70%;
  }
`;

// Improved button container with guaranteed foreground positioning
const ButtonContainer = styled(motion.div)`
  position: relative;
  z-index: 20; /* Extremely high z-index to guarantee foreground */
  margin-top: clamp(1rem, 2vw, 2rem);
  display: flex;
  justify-content: center;
  width: 100%;
`;

// Animation variants
const titleVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const subtitleVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.2 } },
};

const descriptionVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.4 } },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.6 } },
};

// HeroSection component
const HeroSection = () => {
  const [showOrientation, setShowOrientation] = useState(false);

  const handleOrientationClick = () => {
    setShowOrientation(true);
  };

  return (
    <>
      <HeroStoreContainer id="store-hero">
        {/* Video background */}
        <VideoBackground autoPlay loop muted playsInline>
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </VideoBackground>
        
        {/* Color overlay */}
        <ColorOverlay />
        
        {/* Content */}
        <HeroContent>
          <HeroTitle 
            initial="hidden" 
            animate="visible" 
            variants={titleVariants}
          >
            Excellence in Performance Training
          </HeroTitle>
          
          <HeroSubtitle 
            initial="hidden" 
            animate="visible" 
            variants={subtitleVariants}
          >
            Over 25 Years of Elite Coaching & NASM Certified Methods
          </HeroSubtitle>
          
          <HeroDescription 
            initial="hidden" 
            animate="visible" 
            variants={descriptionVariants}
          >
            Experience a transformative workout program meticulously crafted by Sean Swan.
            Leveraging over 25 years of hands-on elite coaching and proven NASM protocols,
            our personalized approach empowers you to achieve peak performance at every stage of life.
          </HeroDescription>
          
          {/* Button with guaranteed foreground visibility */}
          <ButtonContainer
            initial="hidden"
            animate="visible"
            variants={buttonVariants}
          >
            <GlowButton
              text="Orientation Signup"
              theme="cosmic"
              size="medium"
              animateOnRender={true}
              onClick={handleOrientationClick}
            />
          </ButtonContainer>
        </HeroContent>
      </HeroStoreContainer>
      
      {/* Modal */}
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </>
  );
};

export default HeroSection;