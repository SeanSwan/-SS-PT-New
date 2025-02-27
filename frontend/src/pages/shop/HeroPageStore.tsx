// frontend/src/components/HeroPage/HeroPage.tsx
import React from "react";
import styled from "styled-components";

/* Import Assets */
import heroBackground from "../../assets/Logo.png";
import heroVideo from "../../assets/swan.mp4";

/* Container with the Logo as a Fallback Background */
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
  
  /* Fallback background using the logo */
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

/* Video Background */
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2; /* Behind everything */
  opacity: 0.9;
`;

/* Color Overlay for Contrast */
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
  z-index: -1; /* Above video, behind content */
`;

/* Main Content Container */
const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  max-width: 800px;
  color: white;

  @media (max-width: 768px) {
    padding-top: 3rem;
  }
`;

/* Title Styling */
const HeroTitle = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

/* Subtitle Styling */
const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: var(--silver);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

/* Description Styling */
const HeroDescription = styled.p`
  font-size: 1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: white;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

/* Call-to-Action Button */
const CTAButton = styled.button`
  padding: 1rem 2rem;
  background-color: var(--neon-blue);
  color: black;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: var(--royal-purple);
    color: white;
  }
`;

/* HeroPageStore Component */
const HeroPageStore: React.FC = () => {
  return (
    <HeroStoreContainer id="store-hero">
      {/* Background Video */}
      <VideoBackground autoPlay loop muted playsInline>
        <source src={heroVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Color Overlay */}
      <ColorOverlay />

      {/* Main Content with Store Data */}
      <HeroContent>
        <HeroTitle>Welcome to SwanStudios</HeroTitle>
        <HeroSubtitle>
          AI-Enhanced Training for the Elite – Where Innovation Meets Performance
        </HeroSubtitle>
        <HeroDescription>
          Discover the future of fitness with our premium training packages designed for champions.
          Our programs combine cutting-edge artificial intelligence with world-class coaching methods
          endorsed by the National Academy of Sports Medicine. Experience personalized workouts,
          real-time performance tracking, and holistic support to achieve your best self.
          Join a community where advanced technology meets luxury training, ensuring every session
          pushes your limits and transforms your life.
        </HeroDescription>
        <CTAButton onClick={() => alert("Explore our packages!")}>
          Explore Packages
        </CTAButton>
      </HeroContent>
    </HeroStoreContainer>
  );
};

export default HeroPageStore;
