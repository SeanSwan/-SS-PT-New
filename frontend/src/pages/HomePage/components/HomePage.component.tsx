// src/pages/homepage/HomePage.component.tsx - PRODUCTION REVENUE OPTIMIZED
import React, { useEffect, useRef, lazy, Suspense, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../../components/ui/GlowButton";

// Import components
import HeroSection from "./Hero-Section";
import ParallaxSection from "../../../components/ParallaxSection/ParallaxSection";
import FeaturesSection from "../../../components/FeaturesSection/FeaturesSection";
import TrainerProfilesSection from "./TrainerProfilesSection";
import CreativeExpressionSection from "./CreativeExpressionSection";

const FeaturedSection = styled.div`
  position: relative;
  z-index: 2;
  margin: 10px 0;
  padding: 5px;
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15));
    z-index: -1;
  }
`;

// Lazy-loaded components with prefetch optimization
const TestimonialSlider = lazy(() => {
  const prefetch = import("../../../components/TestimonialSlider/TestimonialSlider");
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(() => prefetch);
  } else {
    setTimeout(() => prefetch, 200);
  }
  return prefetch;
});

const FitnessStats = lazy(() => {
  const prefetch = import("../../../components/FitnessStats/FitnessStats");
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(() => prefetch);
  } else {
    setTimeout(() => prefetch, 400);
  }
  return prefetch;
});

const NewsletterSignup = lazy(() => {
  const prefetch = import("../../../components/NewsletterSignup/NewsletterSignup");
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(() => prefetch);
  } else {
    setTimeout(() => prefetch, 600);
  }
  return prefetch;
});

const InstagramFeed = lazy(() => {
  const prefetch = import("../../../components/InstagramFeed/InstagramFeed");
  if ('requestIdleCallback' in window) {
    // @ts-ignore
    window.requestIdleCallback(() => prefetch);
  } else {
    setTimeout(() => prefetch, 800);
  }
  return prefetch;
});

// Enhanced animations with keyframes
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

// Enhanced loading fallback component with fade-in animation
const SectionLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
  background: rgba(10, 10, 30, 0.5);
  opacity: 0;
  animation: ${fadeIn} 0.5s ease-in-out forwards;
  position: relative;
  
  &::after {
    content: "";
    width: 50px;
    height: 50px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top-color: rgba(0, 255, 255, 0.8);
    border-radius: 50%;
    animation: ${spin} 1s linear infinite, ${pulse} 2s ease-in-out infinite;
  }
`;

// Diagonal shimmer animation
const diagonalShimmer = keyframes`
  0% {
    background-position: -200% 200%;
  }
  100% {
    background-position: 200% -200%;
  }
`;

// Enhanced styled components for page sections with improved responsive design and animation
const HomePageContainer = styled.div`
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a2e);
  
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  
  will-change: opacity, transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  @media (max-width: 480px) {
    overflow-x: hidden;
  }
`;

const SectionDivider = styled(motion.div)`
  position: relative;
  height: 150px;
  background: linear-gradient(to right, rgba(0, 255, 255, 0.05), rgba(120, 81, 169, 0.05));
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
  
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalShimmer} 5s linear infinite;
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    height: 120px;
  }
  
  @media (max-width: 480px) {
    height: 100px;
  }
`;

const FloatingText = styled(motion.div)`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  padding: 0 15px;
  position: relative;
  z-index: 2;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  
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
  cursor: pointer;
  
  &::after {
    content: "↓";
    font-size: 1.5rem;
    animation: ${pulse} 2s infinite;
  }
  
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
  position: relative;
  z-index: 2;
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
  visible: { opacity: 0.8, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
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
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

const packageVariants = {
  hidden: { opacity: 0, y: 30 },
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
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const scrollPromptOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [showScrollPrompt, setShowScrollPrompt] = useState<boolean>(true);
  const [homeRef, isHomeInView] = useCustomInView(0.1);
  
  // Section refs for improved animations
  const [featuresRef, isFeaturesInView] = useCustomInView();
  const [trainersRef, isTrainersInView] = useCustomInView();
  const [testimonialRef, isTestimonialInView] = useCustomInView();
  const [statsRef, isStatsInView] = useCustomInView();
  const [instagramRef, isInstagramInView] = useCustomInView();
  const [newsletterRef, isNewsletterInView] = useCustomInView();
  
  // Divider texts for each section
  const dividerTexts = [
    "Choose Your Journey",
    "Express & Connect",
    "Expert Coaching",
    "Success Stories",
    "Measurable Results",
    "Join Our Community"
  ];
  
  // Add ids for scroll navigation
  const sectionIds = {
    hero: "hero",
    packages: "packages",
    features: "services",
    creativeExpression: "creative-expression",
    trainers: "trainers",
    testimonials: "testimonials"
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollPrompt(window.scrollY <= 200);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    
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
          
          window.history.pushState(null, '', targetId);
        }
      }
    };
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', handleAnchorClick);
    });
    
    const prefetchResources = () => {
      const prefetchLinks = [
        "/shop",
        "/services",
        "/trainers",
        "/testimonials"
      ];
      
      if ('requestIdleCallback' in window) {
        // @ts-ignore
        window.requestIdleCallback(() => {
          prefetchLinks.forEach(link => {
            const linkEl = document.createElement('link');
            linkEl.rel = 'prefetch';
            linkEl.href = link;
            linkEl.as = 'document';
            document.head.appendChild(linkEl);
          });
        });
      }
    };
    
    window.addEventListener('load', prefetchResources);
    
    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
      window.removeEventListener('load', prefetchResources);
      window.removeEventListener('scroll', handleScroll);
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
        <title>SwanStudios | Elite Performance Training & Creative Expression</title>
        <meta name="description" content="Transform your fitness journey with SwanStudios' elite personal training. NASM-certified coaching with over 25 years of experience in performance, dance, and creative wellness training." />
        <meta property="og:title" content="SwanStudios | Elite Performance Training & Creative Expression" />
        <meta property="og:description" content="Transform your fitness journey with SwanStudios' elite personal training. NASM-certified coaching with over 25 years of experience in performance, dance, and creative wellness training." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="keywords" content="personal training, fitness, dance, creative expression, wellness, performance training, NASM certified" />
        <link rel="canonical" href="https://swanstudios.com" />
      </Helmet>
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Scroll Prompt - only visible at top of page */}
      <AnimatePresence>
        {showScrollPrompt && (
          <ScrollPrompt 
            style={{ opacity: scrollPromptOpacity }}
            variants={scrollPromptVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => {
              const packagesElement = document.getElementById(sectionIds.packages);
              if (packagesElement) packagesElement.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Scroll down to explore packages"
          >
            Scroll
          </ScrollPrompt>
        )}
      </AnimatePresence>
      
      {renderSectionDivider(0)}
      
      {/* Features Section - Shows services */}
      <FeaturedSection ref={featuresRef} className="primary-focus-label">
        <div style={{
          transform: isFeaturesInView ? 'scale(1)' : 'scale(0.95)',
          opacity: isFeaturesInView ? 1 : 0.7,
          transition: 'transform 0.8s ease-out, opacity 0.8s ease-out',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <FeaturesSection />
          
          <ExploreMoreButton
            variants={buttonVariants}
            initial="hidden"
            animate={isFeaturesInView ? "visible" : "hidden"}
            whileHover="hover"
            whileTap="tap"
          >
            <GlowButton 
              text="Book Free Consultation" 
              theme="emerald" 
              size="medium" 
              animateOnRender 
              onClick={() => navigate('/contact')}
              aria-label="Book your free consultation"
            />
          </ExploreMoreButton>
        </div>
      </FeaturedSection>
      
      {renderSectionDivider(2)}
      
      {/* Creative Expression Section */}
      <CreativeExpressionSection />
      
      {renderSectionDivider(3)}
      
      {/* Trainer Profiles Section */}
      <div ref={trainersRef}>
        <TrainerProfilesSection />
        
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isTrainersInView ? "visible" : "hidden"}
          whileHover="hover"
          whileTap="tap"
        >
          <GlowButton 
            text="Start Training Today" 
            theme="purple" 
            size="medium" 
            animateOnRender 
            onClick={() => navigate('/shop')}
            aria-label="Start your training journey today"
          />
        </ExploreMoreButton>
      </div>
      
      {renderSectionDivider(4)}
      
      {/* Parallax Section with video background */}
      <div data-testid="parallax-section" style={{ minHeight: '100px', willChange: 'transform' }}>
        <ParallaxSection />
      </div>
      
      {renderSectionDivider(5)}
      
      {/* Testimonial Slider */}
      <div ref={testimonialRef} style={{ minHeight: '200px', opacity: isTestimonialInView ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
        <Suspense fallback={<SectionLoader />}>
          <TestimonialSlider />
        </Suspense>
        
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isTestimonialInView ? "visible" : "hidden"}
          whileHover="hover"
          whileTap="tap"
        >
          <GlowButton 
            text="Get Started Now" 
            theme="cosmic" 
            size="medium" 
            animateOnRender 
            onClick={() => navigate('/shop')}
            aria-label="Get started with your transformation"
          />
        </ExploreMoreButton>
      </div>
      
      {/* Stats Section */}
      <div ref={statsRef} style={{ 
        minHeight: '200px', 
        willChange: 'opacity',
        opacity: isStatsInView ? 1 : 0.4,
        transition: 'opacity 0.5s ease-in-out'
      }}>
        <Suspense fallback={<SectionLoader />}>
          <FitnessStats />
        </Suspense>
      </div>
      
      {renderSectionDivider(6)}
      
      {/* Instagram Feed Section */}
      <div ref={instagramRef} style={{ 
        minHeight: '200px', 
        willChange: 'opacity',
        opacity: isInstagramInView ? 1 : 0.4,
        transform: `translateY(${isInstagramInView ? '0' : '20px'})`,
        transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-out'
      }}>
        <Suspense fallback={<SectionLoader />}>
          <InstagramFeed />
        </Suspense>
      </div>
      
      {/* Newsletter Signup */}
      <div ref={newsletterRef} style={{ 
        minHeight: '100px', 
        willChange: 'opacity',
        opacity: isNewsletterInView ? 1 : 0.4,
        transform: `translateY(${isNewsletterInView ? '0' : '20px'})`,
        transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-out'
      }}>
        <Suspense fallback={<SectionLoader />}>
          <NewsletterSignup />
        </Suspense>
        
        {/* Final CTA */}
        <ExploreMoreButton
          variants={buttonVariants}
          initial="hidden"
          animate={isNewsletterInView ? "visible" : "hidden"}
          whileHover="hover"
          whileTap="tap"
          style={{ marginTop: '3rem' }}
        >
          <GlowButton 
            text="Ready to Transform? Start Here" 
            theme="cosmic" 
            size="large" 
            animateOnRender 
            onClick={() => navigate('/shop')}
            aria-label="Ready to transform? Start your journey here"
          />
        </ExploreMoreButton>
      </div>
    </HomePageContainer>
  );
};

export default HomePage;