import React, { useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useAnimation } from "framer-motion";
import { Helmet } from "react-helmet-async";

// Import enhanced components
import Hero from "./Hero";
import AboutContent from "./AboutContent";
import TestimonialSection from "./TestimonialSection";

/*
  🌟 Premium About Page
  ---------------------
  - Features **sophisticated animations** and **premium transitions**
  - Implements **advanced SEO optimization** with metadata
  - Includes **luxury scroll-to-top button** with glass-morphism effect
  - Optimizes for **accessibility and performance**
  - Delivers a **cohesive premium aesthetic** matching other components
*/

// ======================= 🎨 Animations =======================
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ======================= 🎨 Styled Components =======================

// Premium page wrapper with zero margin/padding to ensure full width
const PageWrapper = styled.div`
  width: 100%;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
`;

// Premium page container with subtle luxury background elements
const AboutPage = styled(motion.div)`
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #0a0a1a;
  color: white;
  overflow-x: hidden;
  position: relative;
  
  /* Subtle premium background texture */
  background-image: 
    radial-gradient(rgba(120, 81, 169, 0.15) 1px, transparent 1px),
    radial-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
  background-repeat: repeat;
  background-attachment: fixed;
  
  /* Premium overlay with gradient */
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(10, 10, 26, 0.97), rgba(30, 30, 63, 0.97));
    z-index: -1;
  }
`;

// Premium decorative orb elements - Fixed with proper animation styling
const TopLeftOrb = styled.div`
  position: fixed;
  top: 10%;
  left: 5%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 0;
  pointer-events: none;
  animation: ${float} 15s infinite ease-in-out;
`;

const BottomRightOrb = styled.div`
  position: fixed;
  bottom: 15%;
  right: 8%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: rgba(120, 81, 169, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 0;
  pointer-events: none;
  animation: ${float} 18s infinite ease-in-out reverse;
`;

// Luxury scroll-to-top button with glass morphism effect
const ScrollToTopButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  overflow: hidden;
  animation: ${pulseGlow} 4s infinite ease-in-out;
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.8;
    z-index: -1;
  }
  
  /* Arrow icon with premium styling */
  &:after {
    content: "↑";
    font-size: 1.5rem;
    font-weight: 300;
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    transition: all 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-5px);
    
    &:after {
      transform: translateY(-3px);
      text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
    }
  }
  
  @media (max-width: 768px) {
    width: 45px;
    height: 45px;
    bottom: 1.5rem;
    right: 1.5rem;
    
    &:after {
      font-size: 1.2rem;
    }
  }
`;

// Premium loading overlay with advanced animation
const LoadingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const SpinnerOuter = styled.div`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 3px solid rgba(0, 255, 255, 0.1);
  border-top-color: #00ffff;
  animation: ${spin} 1s linear infinite;
`;

const SpinnerInner = styled.div`
  position: absolute;
  width: 42px;
  height: 42px;
  top: 9px;
  left: 9px;
  border-radius: 50%;
  border: 3px solid rgba(120, 81, 169, 0.1);
  border-top-color: #7851a9;
  animation: ${spin} 1.5s linear infinite reverse;
`;

const LoadingLogo = styled.div`
  position: absolute;
  width: 30px;
  height: 30px;
  top: 15px;
  left: 15px;
  background-image: url('/logo-icon.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: ${float} 2s infinite ease-in-out;
`;

const LoadingSpinner = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
`;

// ======================= 🚀 Enhanced About Component =======================

export default function About() {
  // Animation controls
  const controls = useAnimation();
  
  // State for scroll to top button
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  
  // State for page loading
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Handle scroll to show/hide scroll button
  const handleScroll = () => {
    if (window.scrollY > 300) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  };
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Initialize scroll listener and handle page load
  useEffect(() => {
    // Add a small delay to ensure CSS is properly applied
    setTimeout(() => {
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";
      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";
      document.documentElement.style.overflow = "hidden";
    }, 0);
    
    // Simulate loading (remove this in production and use real loading logic)
    const timer = setTimeout(() => {
      setIsLoading(false);
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
      
      controls.start({
        opacity: 1,
        y: 0,
        transition: { 
          duration: 0.8, 
          ease: "easeOut"
        }
      });
    }, 800);
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [controls]);
  
  return (
    <PageWrapper>
      {/* Enhanced SEO Optimization */}
      <Helmet>
        <title>About Swan Studios | Luxury Personal Training Experience</title>
        <meta name="description" content="Discover Swan Studios' revolutionary approach to elite personal training, featuring science-backed methods, premium coaching, and a proven track record of transformational results." />
        <meta name="keywords" content="luxury personal training, elite fitness coaching, premium fitness studio, body transformation, Swan Studios" />
        <meta property="og:title" content="About Swan Studios | Luxury Personal Training Experience" />
        <meta property="og:description" content="Experience our revolutionary approach to fitness with elite-level coaching, science-backed methods, and a 7-star luxury training environment." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sswanstudios.com/about" />
        <meta property="og:image" content="https://sswanstudios.com/logo.png" />
        
        {/* Essential styles to eliminate margins/padding */}
        <style type="text/css">{`
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            background: #0a0a1a;
            color: white;
          }
          
          #root {
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
        `}</style>
      </Helmet>
      
      {/* Decorative Orbs - Fixed implementation */}
      <TopLeftOrb />
      <BottomRightOrb />
      
      {/* Enhanced Loading Overlay */}
      {isLoading && (
        <LoadingOverlay
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LoadingSpinner>
            <SpinnerOuter />
            <SpinnerInner />
            <LoadingLogo />
          </LoadingSpinner>
        </LoadingOverlay>
      )}
      
      {/* Main Content */}
      <AboutPage 
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
      >
        <Hero />
        <AboutContent />
        <TestimonialSection />
        
        {/* Enhanced Scroll to Top Button */}
        <ScrollToTopButton
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: showScrollButton ? 1 : 0,
            scale: showScrollButton ? 1 : 0.8,
            y: showScrollButton ? 0 : 20
          }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
      </AboutPage>
    </PageWrapper>
  );
}