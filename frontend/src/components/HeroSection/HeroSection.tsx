import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom"; // ✅ Import Link from React Router

/* ✅ Import Background Image & Video */
// 🎥 Update this path to your actual video file in the assets folder
import heroBackground from "../../assets/Logo.png";
import heroVideo from "../../assets/forest.mp4"; // ✅ Video file for background

/*
  🌟 HeroSection Component
  ------------------------
  - Displays the landing page's hero section with a **video background**.
  - Ensures the **Swan logo remains fully visible & centered**.
  - Provides a **color overlay** for contrast.
  - Contains a **title, subtitle, and a call-to-action button**.
*/

/* 📌 Hero Section Container */
const HeroSectionContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh; /* Ensure full viewport height */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;

  /* ✅ Swan Logo as Fallback Background */
  background-image: url(${heroBackground});
  background-size: contain; /* Keep full logo visible */
  background-position: center center; /* Center horizontally & vertically */
  background-repeat: no-repeat;
  background-attachment: fixed; /* Optional: Parallax effect */

  /* 📌 Adjustments for Mobile Screens */
  @media (max-width: 768px) {
    background-size: 90%; /* Scale down slightly for smaller screens */
    background-position: center center;
    padding-top: 4rem; /* Push content down */
  }
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

  opacity: 0.9; /* 🔹 Adjust this value to control video opacity */
`;

/* 🎨 Color Overlay for Contrast */
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
  z-index: -1; /* ✅ Keep it above the video but behind content */
`;

/* 🔥 Main Content (Text & CTA) */
const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding-top: 2rem; /* Ensure text doesn't interfere with swan logo */

  @media (max-width: 768px) {
    padding-top: 3rem; /* Adjust for smaller screens */
  }
`;

/* 🎯 Hero Title */
const HeroTitle = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

/* ✨ Hero Subtitle */
const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: var(--silver);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

/* 🟢 Call-to-Action Button */
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

/* ✅ HeroSection Component */
const HeroSection: React.FC = () => {
  return (
    <HeroSectionContainer id="home">
      {/* 🎥 Video Background */}
      <VideoBackground autoPlay loop muted playsInline>
        <source src={heroVideo} type="video/mp4" /> 
        {/* ❗ Ensure the path to your video file in assets is correct */}
        Your browser does not support the video tag.
      </VideoBackground>

      {/* 🎨 Color Overlay for Visibility */}
      <ColorOverlay />

      {/* 🚀 Main Hero Content */}
      <HeroContent>
        <HeroTitle>Welcome to SwanStudios</HeroTitle>
        <HeroSubtitle>Revolutionizing Personal Training</HeroSubtitle>
        {/* ✅ Button Navigates to Contact Page */}
        <CTAButton to="/contact">Get Started</CTAButton>
      </HeroContent>
    </HeroSectionContainer>
  );
};

export default HeroSection;
