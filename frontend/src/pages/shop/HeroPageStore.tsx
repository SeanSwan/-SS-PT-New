import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import OrientationForm from "../../components/OrientationForm/orientationForm"; // Import the orientation modal component

// Import Assets
import heroBackground from "../../assets/Logo.png";
import heroVideo from "../../assets/swan.mp4";

// Container with the logo as a fallback background
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

  /* Fallback background using the logo at original size */
  background-image: url(${heroBackground});
  background-size: 40%;
  background-position: center center;
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
  opacity: 0.5;
`;

const ColorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    rgba(0, 255, 255, 0.3),
    rgba(120, 81, 169, 0.3)
  );
  z-index: -1;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  max-width: 800px;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  margin-top: 2rem;

  @media (max-width: 768px) {
    padding-top: 3rem;
  }
`;

const HeroTitle = styled.h1`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--silver, #c0c0c0);

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeroDescription = styled.p`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: #fff;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

/* CTA Button now triggers Orientation Signup */
const CTAButton = styled(motion.button)`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: var(--neon-blue, #00ffff);
  color: #000;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
  margin-top: 2rem;

  &:hover {
    background-color: var(--royal-purple, #7851a9);
    color: #fff;
    transform: translateY(-3px);
  }
`;

const HeroPageStore = () => {
  const [showOrientation, setShowOrientation] = useState(false);

  return (
    <HeroStoreContainer id="store-hero">
      <VideoBackground autoPlay loop muted playsInline>
        <source src={heroVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>
      <ColorOverlay />
      <HeroContent>
        <HeroTitle>Elite Training Designed by Sean Swan</HeroTitle>
        <HeroSubtitle>25+ Years of Experience & NASM-Approved Protocols</HeroSubtitle>
        <HeroDescription>
          Discover a revolutionary workout program created from thousands of hours of hands-on training by elite trainer Sean Swan—merging cutting-edge fitness science with proven NASM protocols. Our personalized approach caters to everyone—from children to seniors—ensuring you unlock your full potential.
        </HeroDescription>
        <CTAButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowOrientation(true)}
        >
          Orientation Signup
        </CTAButton>
      </HeroContent>
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </HeroStoreContainer>
  );
};

export default HeroPageStore;

