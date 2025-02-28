import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Fallback image and video paths
import heroBackground from "../../assets/Logo.png";
import heroVideo from "../../assets/forest.mp4";

const HeroSectionContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh; /* Full viewport height */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;

  /* Background fallback using a logo with a purple gradient overlay */
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
  opacity: 0.9; /* Slightly visible */
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

const HeroSubtitle = styled(motion.p)`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: var(--silver, #C0C0C0);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CTAButton = styled(motion(Link))`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: var(--neon-blue, #00ffff);
  color: black;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition: background-color 0.3s ease, transform 0.3s ease;

  &:hover {
    background-color: var(--royal-purple, #7851a9);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`;

// Animation Variants
const titleVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const subtitleVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.2 } },
};

const buttonVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.4 } },
};

const HeroSection: React.FC = () => {
  return (
    <HeroSectionContainer id="home">
      <VideoBackground autoPlay loop muted playsInline>
        <source src={heroVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      <ColorOverlay />

      <HeroContent>
        <HeroTitle initial="hidden" animate="visible" variants={titleVariants}>
          Welcome to SwanStudios
        </HeroTitle>
        <HeroSubtitle
          initial="hidden"
          animate="visible"
          variants={subtitleVariants}
        >
          Revolutionizing Personal Training
        </HeroSubtitle>
        <CTAButton
          to="/contact"
          initial="hidden"
          animate="visible"
          variants={buttonVariants}
        >
          Get Started
        </CTAButton>
      </HeroContent>
    </HeroSectionContainer>
  );
};

export default HeroSection;
