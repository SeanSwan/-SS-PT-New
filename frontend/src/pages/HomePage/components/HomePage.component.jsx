// src/pages/homepage/HomePage.component.jsx
import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Helmet } from "react-helmet-async";

// Import components
import HeroSection from "./Hero-Section";
import ParallaxSection from "../../../components/ParallaxSection/ParallaxSection";
import FeaturesSection from "../../../components/FeaturesSection/FeaturesSection";
import TrainerProfilesSection from "./TrainerProfilesSection";
import TestimonialSlider from "../../../components/TestimonialSlider/TestimonialSlider";
import FitnessStats from "../../../components/FitnessStats/FitnessStats";
import NewsletterSignup from "../../../components/NewsletterSignup/NewsletterSignup";
import InstagramFeed from "../../../components/InstagramFeed/InstagramFeed";

// Styled components for page sections
const HomePageContainer = styled.div`
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a2e);
`;

const SectionDivider = styled(motion.div)`
  position: relative;
  height: 150px;
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.1));
  margin: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  
  &::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8), transparent);
  }
`;

const FloatingText = styled(motion.div)`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
`;

const ScrollPrompt = styled(motion.div)`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
  color: var(--neon-blue, #00ffff);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.8;
  
  &::after {
    content: "↓";
    font-size: 1.5rem;
    animation: bounce 2s infinite;
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
`;

// Animation variants
const dividerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5
    }
  }
};

const floatingTextVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

const scrollPromptVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.8 },
  exit: { opacity: 0 }
};

const HomePage = () => {
  const { scrollY } = useScroll();
  const scrollPromptOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const homeRef = useRef(null);
  const isInView = useInView(homeRef);
  
  // Divider texts for each section
  const dividerTexts = [
    "Elevate Your Training",
    "Expert Coaching",
    "Success Stories",
    "Measurable Results",
    "Join Our Community"
  ];

  useEffect(() => {
    // Smooth scroll to element if hash is present in URL
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    
    // Add smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
  }, []);

  // Create section dividers with animated text
  const renderSectionDivider = (index) => (
    <SectionDivider
      variants={dividerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.8 }}
    >
      <FloatingText
        variants={floatingTextVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.8 }}
      >
        {dividerTexts[index % dividerTexts.length]}
      </FloatingText>
    </SectionDivider>
  );

  return (
    <HomePageContainer ref={homeRef}>
      <Helmet>
        <title>SwanStudios | Elite Performance Training</title>
        <meta name="description" content="Transform your fitness journey with SwanStudios' elite personal training. NASM-certified coaching with over 25 years of experience in performance training." />
        <meta property="og:title" content="SwanStudios | Elite Performance Training" />
        <meta property="og:description" content="Transform your fitness journey with SwanStudios' elite personal training. NASM-certified coaching with over 25 years of experience in performance training." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Scroll Prompt - only visible at top of page */}
      <ScrollPrompt 
        style={{ opacity: scrollPromptOpacity }}
        variants={scrollPromptVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        Scroll
      </ScrollPrompt>
      
      {renderSectionDivider(0)}
      
      {/* Features Section - Shows services */}
      <FeaturesSection />
      
      {renderSectionDivider(1)}
      
      {/* Trainer Profiles Section */}
      <TrainerProfilesSection />
      
      {renderSectionDivider(2)}
      
      {/* Parallax Section with video background */}
      <ParallaxSection />
      
      {renderSectionDivider(3)}
      
      {/* Testimonial Slider */}
      <TestimonialSlider />
      
      {/* Stats Section - Shows achievements */}
      <FitnessStats />
      
      {renderSectionDivider(4)}
      
      {/* Instagram Feed Section */}
      <InstagramFeed />
      
      {/* Newsletter Signup */}
      <NewsletterSignup />
    </HomePageContainer>
  );
};

export default HomePage;