// src/pages/homepage/HomePage.component.tsx
import React, { useEffect, useRef, lazy, Suspense } from "react";
import styled from "styled-components";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Helmet } from "react-helmet-async";
import GlowButton from "../../../components/Button/glowButton";

// Import components
import HeroSection from "./Hero-Section";
import ParallaxSection from "../../../components/ParallaxSection/ParallaxSection";
import FeaturesSection from "../../../components/FeaturesSection/FeaturesSection";
import TrainerProfilesSection from "./TrainerProfilesSection";

// Lazy-loaded components for performance
const TestimonialSlider = lazy(() => import("../../../components/TestimonialSlider/TestimonialSlider"));
const FitnessStats = lazy(() => import("../../../components/FitnessStats/FitnessStats"));
const NewsletterSignup = lazy(() => import("../../../components/NewsletterSignup/NewsletterSignup"));
const InstagramFeed = lazy(() => import("../../../components/InstagramFeed/InstagramFeed"));

// Loading fallback component
const SectionLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
  background: rgba(10, 10, 30, 0.5);
  
  &::after {
    content: "";
    width: 50px;
    height: 50px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top-color: rgba(0, 255, 255, 0.8);
    border-radius: 50%;
    animation: loader-spin 1s linear infinite;
  }
  
  @keyframes loader-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Enhanced styled components for page sections with improved responsive design
const HomePageContainer = styled.div`
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a2e);
  
  /* Enhanced responsive container */
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  
  /* Ultra mobile responsiveness */
  @media (max-width: 480px) {
    overflow-x: hidden;
  }
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
  
  /* Ultra mobile responsiveness */
  @media (max-width: 768px) {
    height: 120px;
  }
  
  @media (max-width: 480px) {
    height: 100px;
  }
`;

const FloatingText = styled(motion.div)`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  padding: 0 15px;
  
  /* Ultra mobile responsiveness */
  @media (max-width: 768px) {
    font-size: 1rem;
    letter-spacing: 2px;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    letter-spacing: 1.5px;
  }
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
  
  /* Hide on smallest screens for better mobile experience */
  @media (max-width: 480px) {
    bottom: 15px;
    right: 15px;
    font-size: 0.7rem;
    
    &::after {
      font-size: 1.2rem;
    }
  }
`;

const ExploreMoreButton = styled(motion.div)`
  display: flex;
  justify-content: center;
  margin: 2rem 0;
`;

// Animation variants with improved performance
const dividerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      ease: "easeOut"
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

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: "easeOut" 
    }
  }
};

// Custom hook for intersection observer with threshold options
const useCustomInView = (threshold = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: threshold });
  return [ref, inView] as const;
};

const HomePage: React.FC = () => {
  const { scrollY } = useScroll();
  const scrollPromptOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [homeRef, isHomeInView] = useCustomInView(0.1);
  
  // Section refs for improved animations
  const [featuresRef, isFeaturesInView] = useCustomInView();
  const [trainersRef, isTrainersInView] = useCustomInView();
  const [testimonialRef, isTestimonialInView] = useCustomInView();
  
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
    const handleAnchorClick = (e: Event) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;
      const targetId = target.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const element = document.querySelector(targetId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth'
          });
          
          // Update URL without reload
          window.history.pushState(null, '', targetId);
        }
      }
    };
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', handleAnchorClick);
    });
    
    // Cleanup event listeners
    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
    };
  }, []);

  // Create section dividers with animated text
  const renderSectionDivider = (index: number) => (
    <SectionDivider
      variants={dividerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.5 }}
    >
      <FloatingText
        variants={floatingTextVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.5 }}
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
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
        aria-hidden="true"
      >
        Scroll
      </ScrollPrompt>
      
      {renderSectionDivider(0)}
      
      {/* Features Section - Shows services */}
      <div ref={featuresRef}>
        <FeaturesSection />
        
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isFeaturesInView ? "visible" : "hidden"}
        >
          <GlowButton 
            text="Explore Services" 
            theme="cosmic" 
            size="medium" 
            animateOnRender 
            onClick={() => window.location.href = '/services'}
          />
        </ExploreMoreButton>
      </div>
      
      {renderSectionDivider(1)}
      
      {/* Trainer Profiles Section */}
      <div ref={trainersRef}>
        <TrainerProfilesSection />
        
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isTrainersInView ? "visible" : "hidden"}
        >
          <GlowButton 
            text="Meet Our Trainers" 
            theme="purple" 
            size="medium" 
            animateOnRender 
            onClick={() => window.location.href = '/trainers'}
          />
        </ExploreMoreButton>
      </div>
      
      {renderSectionDivider(2)}
      
      {/* Parallax Section with video background */}
      <ParallaxSection />
      
      {renderSectionDivider(3)}
      
      {/* Testimonial Slider with fallback */}
      <div ref={testimonialRef}>
        <Suspense fallback={<SectionLoader />}>
          <TestimonialSlider />
        </Suspense>
        
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isTestimonialInView ? "visible" : "hidden"}
        >
          <GlowButton 
            text="Read More Testimonials" 
            theme="cosmic" 
            size="medium" 
            animateOnRender 
            onClick={() => window.location.href = '/testimonials'}
          />
        </ExploreMoreButton>
      </div>
      
      {/* Stats Section - Shows achievements */}
      <Suspense fallback={<SectionLoader />}>
        <FitnessStats />
      </Suspense>
      
      {renderSectionDivider(4)}
      
      {/* Instagram Feed Section */}
      <Suspense fallback={<SectionLoader />}>
        <InstagramFeed />
      </Suspense>
      
      {/* Newsletter Signup */}
      <Suspense fallback={<SectionLoader />}>
        <NewsletterSignup />
      </Suspense>
    </HomePageContainer>
  );
};

export default HomePage;