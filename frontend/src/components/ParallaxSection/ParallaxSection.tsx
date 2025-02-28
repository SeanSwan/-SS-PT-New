import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { motion, useViewportScroll, useTransform } from "framer-motion";

import parallaxVideo from "../../assets/smoke.mp4";

/* 
  ParallaxSection 
  - Uses a fixed height (80vh) or you can use a large padding if you prefer auto height.
  - Removes overflow: hidden so the next section isn't overlapped.
  - Moves the video background instead of the container to avoid "bleeding."
*/

/* ✅ Parallax Section Container */
const ParallaxSectionContainer = styled.section`
  position: relative;
  width: 100%;
  height: 100vh; /* Fixed height to avoid overlap */
  margin-bottom: 0rem; /* Ensure spacing below the section */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  /* Fallback black background if video doesn't load */
  background: none;
`;

/* 🎥 Video Background */
const VideoBackground = styled(motion.video)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
  opacity: 0.5; 
`;

/* 🎨 Dark Overlay for Readability */
const ColorOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: -1;
`;

/* 🚀 Main Content (Text & CTA) */
const ParallaxContent = styled.div`
  position: relative;
  z-index: 2;
  background: rgba(0, 0, 0, 0.7);
  padding: 2rem;
  border-radius: 10px;
  max-width: 800px;
  margin: 0 auto;
`;

/* 🏆 Parallax Title */
const ParallaxTitle = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--neon-blue, #00ffff);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

/* ✨ Parallax Description */
const ParallaxText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: var(--silver, #c0c0c0);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

/* 🟢 Call-to-Action Button */
const CTAButton = styled(Link)`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: var(--neon-blue, #00ffff);
  color: black;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: var(--royal-purple, #7851a9);
    color: white;
  }
`;

const ParallaxSection: React.FC = () => {
  // Use framer-motion hooks for parallax
  const { scrollY } = useViewportScroll();
  // Move the video 0px to 200px from top to bottom over a scroll range
  const videoY = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <ParallaxSectionContainer id="training">
      {/* 🎥 Video Background with Parallax Transform */}
      <VideoBackground
        autoPlay
        loop
        muted
        playsInline
        style={{ y: videoY }} // Move the video, not the container
      >
        <source src={parallaxVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      <ColorOverlay />

      <ParallaxContent>
        <ParallaxTitle>Transform Your Life</ParallaxTitle>
        <ParallaxText>
          At SwanStudios, we combine cutting-edge fitness technology with
          personalized coaching to help you achieve your goals. Our expert
          trainers and state-of-the-art programs are designed to push you
          beyond your limits and unlock your full potential.
        </ParallaxText>
        <CTAButton to="/store">Explore Programs</CTAButton>
      </ParallaxContent>
    </ParallaxSectionContainer>
  );
};

export default ParallaxSection;
