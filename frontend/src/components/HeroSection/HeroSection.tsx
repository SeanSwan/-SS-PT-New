import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import heroBackground from "../../assets/Logo.png";
import heroVideo from "../../assets/swan.mp4";

// ---------------------------
// OrientationButton Styled Component
// ---------------------------
const OrientationButton = styled(motion.button)`
  padding: 1rem 2rem;
  background: var(--neon-blue, #00ffff);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
  margin-top: 2rem;

  &:hover {
    background: var(--royal-purple, #7851a9);
    color: #fff;
    transform: translateY(-3px);
  }
`;

// ---------------------------
// HeroPageStore Styled Components
// ---------------------------
const HeroStoreContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh; /* Full viewport height */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  background: linear-gradient(
      to bottom right,
      rgba(75, 0, 130, 0.9),
      rgba(0, 0, 0, 0.7)
    ),
    url(${heroBackground});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;

  @media (max-width: 768px) {
    background-size: 90%;
    padding-top: 4rem;
  }
`;

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

const ColorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(0, 255, 255, 0.0), rgba(120, 81, 169, 0.0));
  z-index: -1;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: var(--silver, #C0C0C0);
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: #ffffff;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// ---------------------------
// Framer Motion Variants
// ---------------------------
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

// ---------------------------
// HeroPageStore Component
// ---------------------------
const HeroSection: React.FC = () => {
  const [showOrientation, setShowOrientation] = useState(false);

  return (
    <>
      <HeroStoreContainer id="store-hero">
        <VideoBackground autoPlay loop muted playsInline>
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </VideoBackground>
        <ColorOverlay />
        <HeroContent>
          <HeroTitle initial="hidden" animate="visible" variants={titleVariants}>
            Excellence in Performance Training
          </HeroTitle>
          <HeroSubtitle initial="hidden" animate="visible" variants={subtitleVariants}>
            Over 25 Years of Elite Coaching & NASM Certified Methods
          </HeroSubtitle>
          <HeroDescription initial="hidden" animate="visible" variants={descriptionVariants}>
            Experience a transformative workout program meticulously crafted by Sean Swan.
            Leveraging over 25 years of hands-on elite coaching and proven NASM protocols,
            our personalized approach empowers you to achieve peak performance at every stage of life.
          </HeroDescription>
          <OrientationButton
            initial="hidden"
            animate="visible"
            variants={buttonVariants}
            onClick={() => setShowOrientation(true)}
          >
            Orientation Signup
          </OrientationButton>
        </HeroContent>
      </HeroStoreContainer>
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </>
  );
};

export default HeroSection;

