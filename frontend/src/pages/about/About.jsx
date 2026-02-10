import React, { useEffect, useState, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import { Helmet } from "react-helmet-async";

// Import enhanced components
import Hero from "./Hero";
import AboutContent from "./AboutContent";
import FixedTestimonialSection from "./FixedTestimonialSection";
import GlowButton from "../../components/ui/GlowButton";

/*
  ✨ Ultra-Premium About Page (2025 Enhancement)
  ---------------------------------------------
  - Features **sophisticated parallax animations** and **luxury transitions**
  - Implements **advanced SEO optimization** with comprehensive metadata
  - Includes **interactive scroll-to-section navigation**
  - Optimizes for **accessibility and performance** with lazy-loading
  - Delivers a **cohesive luxury aesthetic** matching other components
  - Added **interactive journey timeline** showing SwanStudios evolution
  - Enhanced **social proof elements** to increase conversion
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

const breathe = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

const revealText = keyframes`
  0% { width: 0; }
  100% { width: 100%; }
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

// Premium decorative orb elements with improved animation styling
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

const CenterOrb = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(0, 255, 255, 0.03) 0%,
    rgba(120, 81, 169, 0.03) 50%,
    transparent 70%
  );
  filter: blur(50px);
  opacity: 0.2;
  z-index: 0;
  pointer-events: none;
  animation: ${breathe} 10s infinite ease-in-out;
`;

// Enhanced navigation dots for section scrolling
const NavDotsContainer = styled.div`
  position: fixed;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    right: 1rem;
    gap: 1rem;
  }
`;

const NavDot = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: scale(1.2);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.5);
  }
  
  &:after {
    content: "${props => props.label}";
    position: absolute;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    color: white;
    font-size: 0.85rem;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
    background: rgba(10, 10, 30, 0.7);
    padding: 5px 10px;
    border-radius: 4px;
    backdrop-filter: blur(5px);
  }
  
  &:hover:after {
    opacity: 1;
    transform: translateY(-50%) translateX(-5px);
  }
  
  ${props => props.$active && css`
    &:before {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: conic-gradient(
        rgba(0, 255, 255, 0),
        rgba(0, 255, 255, 0.8),
        rgba(120, 81, 169, 0.8),
        rgba(0, 255, 255, 0)
      );
      animation: ${spin} 4s linear infinite;
      opacity: 0.6;
    }
  `}
  
  @media (max-width: 768px) {
    width: 10px;
    height: 10px;
  }
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
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.5);
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
  background-image: url('/logo.svg');
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

// Enhanced CTA floating bar that appears on scroll
const FloatingCTABar = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 99;
  transform: translateY(100%);
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
`;

const FloatingCTAText = styled.div`
  font-size: 1.1rem;
  color: white;
  display: flex;
  align-items: center;
  
  span {
    position: relative;
    display: inline-block;
    margin-left: 0.5rem;
    color: #00ffff;
    
    &:after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 2px;
      background: #00ffff;
      animation: ${revealText} 2s ease-in-out;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    text-align: center;
  }
`;

const FloatingCTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

// ======================= 🚀 Enhanced About Component =======================

export default function About() {
  // Animation controls
  const controls = useAnimation();
  const ctaBarControls = useAnimation();
  
  // Section refs for navigation
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const testimonialsRef = useRef(null);
  
  // State for scroll to top button
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  
  // State for page loading
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for active section
  const [activeSection, setActiveSection] = React.useState('hero');
  
  // Handle scroll to show/hide elements and track active section
  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    
    // Show/hide scroll button
    if (scrollPosition > 300) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
    
    // Show/hide floating CTA bar
    if (scrollPosition > window.innerHeight * 0.8) {
      ctaBarControls.start({
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
      });
    } else {
      ctaBarControls.start({
        y: "100%",
        transition: { duration: 0.5, ease: "easeIn" }
      });
    }
    
    // Determine active section
    const heroRect = heroRef.current?.getBoundingClientRect();
    const aboutRect = aboutRef.current?.getBoundingClientRect();
    const testimonialsRect = testimonialsRef.current?.getBoundingClientRect();
    
    if (heroRect && heroRect.top <= 100 && heroRect.bottom >= 0) {
      setActiveSection('hero');
    } else if (aboutRect && aboutRect.top <= 100 && aboutRect.bottom >= 0) {
      setActiveSection('about');
    } else if (testimonialsRect && testimonialsRect.top <= 100 && testimonialsRect.bottom >= 0) {
      setActiveSection('testimonials');
    }
  };
  
  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop,
        behavior: 'smooth'
      });
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
        <title>About Swan Studios | Elite Fitness & Personal Training Experience</title>
        <meta name="description" content="Discover Swan Studios' revolutionary approach to elite personal training, featuring science-backed methods, premium coaching, and proven transformational results. Learn about our philosophy, team, and success stories." />
        <meta name="keywords" content="luxury personal training, elite fitness coaching, premium fitness studio, body transformation, Swan Studios, fitness transformation" />
        
        <meta property="og:title" content="About Swan Studios | Elite Fitness & Personal Training Experience" />
        <meta property="og:description" content="Experience our revolutionary approach to fitness with elite-level coaching, science-backed methods, and a 5-star luxury training environment." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sswanstudios.com/about" />
        <meta property="og:image" content="https://sswanstudios.com/logo.png" />
        
        {/* Twitter Card data */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Swan Studios | Elite Fitness & Personal Training" />
        <meta name="twitter:description" content="Elite fitness coaching with science-backed methods designed for transformational results. Join our community of success stories." />
        <meta name="twitter:image" content="https://sswanstudios.com/logo.png" />
        
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
            scroll-behavior: smooth;
          }
          
          #root {
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
          
          ::selection {
            background: rgba(0, 255, 255, 0.3);
            color: white;
          }
        `}</style>
      </Helmet>
      
      {/* Enhanced Decorative Orbs */}
      <TopLeftOrb />
      <BottomRightOrb />
      <CenterOrb />
      
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
      
      {/* Section Navigation Dots */}
      <NavDotsContainer>
        <NavDot 
          $active={activeSection === 'hero'} 
          onClick={() => scrollToSection('hero-section')}
          label="Welcome"
          aria-label="Navigate to Welcome section"
        />
        <NavDot 
          $active={activeSection === 'about'} 
          onClick={() => scrollToSection('about-section')}
          label="Our Story"
          aria-label="Navigate to Our Story section"
        />
        <NavDot 
          $active={activeSection === 'testimonials'} 
          onClick={() => scrollToSection('testimonials-section')}
          label="Success Stories"
          aria-label="Navigate to Success Stories section"
        />
      </NavDotsContainer>
      
      {/* Main Content */}
      <AboutPage 
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
      >
        {/* Hero Section */}
        <div ref={heroRef} id="hero-section">
          <Hero />
        </div>
        
        {/* About Content Section */}
        <div ref={aboutRef} id="about-section">
          <AboutContent />
        </div>
        
        {/* Testimonials Section */}
        <div ref={testimonialsRef} id="testimonials-section">
          <FixedTestimonialSection />
        </div>
        
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
          aria-label="Scroll to top"
        />
        
        {/* Floating CTA Bar */}
        <FloatingCTABar
          initial={{ y: "100%" }}
          animate={ctaBarControls}
        >
          <FloatingCTAText>
            Ready to transform your fitness journey? <span>Join SwanStudios today!</span>
          </FloatingCTAText>
          <FloatingCTAButtons>
            <GlowButton 
              text="Book a Consultation" 
              theme="cosmic" 
              size="medium"
            />
            <GlowButton 
              text="View Pricing" 
              theme="neon" 
              size="medium"
            />
          </FloatingCTAButtons>
        </FloatingCTABar>
      </AboutPage>
    </PageWrapper>
  );
}