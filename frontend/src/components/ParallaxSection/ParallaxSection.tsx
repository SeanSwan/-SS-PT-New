import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom"; // ✅ Import React Router Link
import { motion, useViewportScroll, useTransform } from "framer-motion";

/* ✅ Import Video File */
// 🎥 Update this path to match the video file in your `assets` folder
import parallaxVideo from "../../assets/smoke.mp4"; 

/*
  🌟 ParallaxSection Component
  ----------------------------
  - Implements a **parallax effect** using Framer Motion.
  - Displays **motivational content** with a button linking to Training Programs.
  - Includes a **video background** (with a fallback black background).
  - Uses **dark overlay** to ensure readability.
*/

/* ✅ Parallax Section Container */
const ParallaxSectionContainer = styled(motion.section)`
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  
  /* 🔹 Fallback black background if video doesn't load */
  background: #000;
`;

/* 🎥 Video Background */
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2; /* Ensure it's behind all content */

  opacity: 0.5; /* 🔹 Adjust opacity here */
`;

/* 🎨 Dark Overlay for Readability */
const ColorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6); /* 🔹 Adjust overlay opacity if needed */
  z-index: -1;
`;

/* 🎯 Parallax Content */
const ParallaxContent = styled.div`
  position: relative;
  z-index: 2;
  background: rgba(0, 0, 0, 0.7); /* 🔹 Ensures readability */
  padding: 2rem;
  border-radius: 10px;
  max-width: 800px;
  margin: 0 auto;
`;

/* 🏆 Parallax Title */
const ParallaxTitle = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--neon-blue);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

/* ✨ Parallax Description */
const ParallaxText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: var(--silver);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

/* 🟢 Styled Call-to-Action Button */
const CTAButton = styled(Link)`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: var(--neon-blue);
  color: black;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: var(--royal-purple);
    color: white;
  }
`;

/* ✅ ParallaxSection Component */
const ParallaxSection: React.FC = () => {
  // 🏗️ Create a parallax effect using Framer Motion hooks
  const { scrollY } = useViewportScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <ParallaxSectionContainer id="training" style={{ y: parallaxY }}>
      {/* 🎥 Video Background */}
      <VideoBackground autoPlay loop muted playsInline>
        <source src={parallaxVideo} type="video/mp4" />
        {/* ❗ Ensure this path is correct */}
        Your browser does not support the video tag.
      </VideoBackground>

      {/* 🎨 Color Overlay */}
      <ColorOverlay />

      {/* 🚀 Main Content */}
      <ParallaxContent>
        <ParallaxTitle>Transform Your Life</ParallaxTitle>
        <ParallaxText>
          At SwanStudios, we combine cutting-edge fitness technology with personalized coaching 
          to help you achieve your goals. Our expert trainers and state-of-the-art programs 
          are designed to push you beyond your limits and unlock your full potential.
        </ParallaxText>
        {/* ✅ Button Navigates to the Training Programs Page */}
        <CTAButton to="/store">Explore Programs</CTAButton>
      </ParallaxContent>
    </ParallaxSectionContainer>
  );
};

export default ParallaxSection;


