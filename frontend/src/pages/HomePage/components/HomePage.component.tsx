// src/pages/homepage/HomePage.component.tsx - PRODUCTION REVENUE OPTIMIZED
import React, { useEffect, useRef, lazy, Suspense, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../../components/ui/GlowButton";
import { useUniversalTheme } from "../../../context/ThemeContext";

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
    background: ${({ theme }) => theme.gradients.cosmic}20;
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
  background: ${({ theme }) => theme.background.surface};
  opacity: 0;
  animation: ${fadeIn} 0.5s ease-in-out forwards;
  position: relative;
  
  &::after {
    content: "";
    width: 50px;
    height: 50px;
    border: 3px solid ${({ theme }) => theme.colors.primary}30;
    border-top-color: ${({ theme }) => theme.colors.primary};
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
  background: linear-gradient(to bottom, ${({ theme }) => theme.background.primary}, ${({ theme }) => theme.background.secondary});
  
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

// NEW: Revenue-focused package preview section
const PackagePreviewSection = styled.section`
  padding: 5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const PackagePreviewTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text.primary};
  text-shadow: 0 0 20px ${({ theme }) => theme.colors.primary}30;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PackagePreviewSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  transition: color 0.3s ease;
`;

const PackageGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const PackageCard = styled(motion.div)`
  background: ${({ theme }) => theme.background.surface};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 15px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-10px);
    border-color: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.colors.primary}20,
      transparent
    );
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  h3 {
    font-size: 1.5rem;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 1rem;
    transition: color 0.3s ease;
  }
  
  p {
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 1.5rem;
    font-size: 1rem;
    line-height: 1.6;
    transition: color 0.3s ease;
  }
  
  .price {
    font-size: 1.8rem;
    font-weight: bold;
    color: ${({ theme }) => theme.text.primary};
    text-shadow: 0 0 10px ${({ theme }) => theme.colors.primary}50;
    transition: all 0.3s ease;
  }
  
  .sessions {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text.muted};
    margin-top: 0.5rem;
    transition: color 0.3s ease;
  }
`;

// NEW: Urgency and social proof section
const UrgencySection = styled(motion.div)`
  background: ${({ theme }) => theme.gradients.secondary}20;
  padding: 3rem 2rem;
  margin: 4rem 0;
  text-align: center;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.borders.elegant};
  }
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 0%,
      ${({ theme }) => theme.colors.primary}10 50%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalShimmer} 3s linear infinite;
  }
`;

const UrgencyText = styled.h3`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: 1rem;
  font-weight: 600;
  position: relative;
  z-index: 2;
  transition: color 0.3s ease;
`;

const SocialProofText = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
  transition: color 0.3s ease;
`;

const SectionDivider = styled(motion.div)`
  position: relative;
  height: 150px;
  background: ${({ theme }) => theme.gradients.cosmic}10;
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
    background: ${({ theme }) => theme.gradients.primary};
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
      ${({ theme }) => theme.colors.primary}10 25%,
      ${({ theme }) => theme.colors.primary}20 50%,
      ${({ theme }) => theme.colors.primary}10 75%,
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
  color: ${({ theme }) => theme.text.secondary};
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  padding: 0 15px;
  position: relative;
  z-index: 2;
  text-shadow: 0 0 10px ${({ theme }) => theme.colors.primary}50;
  transition: all 0.3s ease;
  
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
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.8;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
  
  &::after {
    content: "↓";
    font-size: 1.5rem;
    animation: ${pulse} 2s infinite;
    color: ${({ theme }) => theme.colors.primary};
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
  // Theme integration
  const { theme, currentTheme } = useUniversalTheme();
  
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const scrollPromptOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [showScrollPrompt, setShowScrollPrompt] = useState<boolean>(true);
  const [homeRef, isHomeInView] = useCustomInView(0.1);
  
  // Theme-aware button variants
  const getThemeButtonVariant = (type: 'primary' | 'secondary' | 'accent') => {
    switch (currentTheme) {
      case 'swan-galaxy':
        return type === 'primary' ? 'cosmic' : type === 'secondary' ? 'emerald' : 'purple';
      case 'admin-command':
        return type === 'primary' ? 'primary' : type === 'secondary' ? 'cosmic' : 'emerald';
      case 'dark-galaxy':
        return type === 'primary' ? 'cosmic' : type === 'secondary' ? 'primary' : 'purple';
      default:
        return 'cosmic';
    }
  };
  
  // Section refs for improved animations
  const [featuresRef, isFeaturesInView] = useCustomInView();
  const [packageRef, isPackageInView] = useCustomInView();
  const [trainersRef, isTrainersInView] = useCustomInView();
  const [testimonialRef, isTestimonialInView] = useCustomInView();
  const [statsRef, isStatsInView] = useCustomInView();
  const [instagramRef, isInstagramInView] = useCustomInView();
  const [newsletterRef, isNewsletterInView] = useCustomInView();
  
  // Divider texts for each section
  const dividerTexts = [
    "Elevate Your Excellence",
    "Exclusive Consultation",
    "Express & Connect",
    "Elite Coaching",
    "Success Stories",
    "Proven Results",
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
      // Note: Prefetch disabled in production to avoid unnecessary 404s
      // These routes don't exist as separate pages since we're using SPA routing
      console.log('📡 Prefetch disabled - using SPA routing');
      
      // Optional: Add any actual API prefetching here if needed
      // Example: prefetch storefront data, user profile, etc.
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
        <title>SwanStudios | Elite Personal Training for Executives & Entrepreneurs</title>
        <meta name="description" content="Exclusive personal training for discerning professionals. NASM-certified elite coaching with 25+ years of expertise. Limited availability - by invitation only. Complimentary consultation available." />
        <meta property="og:title" content="SwanStudios | Elite Personal Training for Executives & Entrepreneurs" />
        <meta property="og:description" content="Exclusive personal training for discerning professionals. NASM-certified elite coaching with 25+ years of expertise. Limited availability - by invitation only. Complimentary consultation available." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="keywords" content="elite personal training, executive fitness, luxury wellness, premium coaching, NASM certified, Beverly Hills trainer, exclusive fitness, executive wellness program" />
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
      
      {/* NEW: Exclusive Consultation Section - LUXURY CLIENT ACQUISITION */}
      <PackagePreviewSection id={sectionIds.packages} ref={packageRef}>
        <PackagePreviewTitle
          variants={packageVariants}
          initial="hidden"
          animate={isPackageInView ? "visible" : "hidden"}
        >
          Elite Personal Training - By Invitation Only
        </PackagePreviewTitle>
        <PackagePreviewSubtitle
          variants={packageVariants}
          initial="hidden"
          animate={isPackageInView ? "visible" : "hidden"}
        >
          Discover why executives, entrepreneurs, and discerning individuals choose SwanStudios for their transformation journey
        </PackagePreviewSubtitle>
        
        <PackageGrid
          variants={packageVariants}
          initial="hidden"
          animate={isPackageInView ? "visible" : "hidden"}
        >
          <PackageCard
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/contact')}
            style={{ background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.2))' }}
          >
            <h3>🎯 Complimentary Consultation</h3>
            <p>Experience our premium approach with a comprehensive fitness assessment, goal setting session, and personalized strategy development.</p>
            <div className="price">No Obligation</div>
            <div className="sessions">60-Minute Private Session</div>
          </PackageCard>
          
          <PackageCard
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/contact')}
            style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(120, 81, 169, 0.2))' }}
          >
            <h3>⭐ Executive Wellness Program</h3>
            <p>Designed for busy professionals who demand results. Flexible scheduling, concierge-level service, and accelerated transformation protocols.</p>
            <div className="price">Premium Experience</div>
            <div className="sessions">Customized to Your Schedule</div>
          </PackageCard>
          
          <PackageCard
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/contact')}
            style={{ background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(120, 81, 169, 0.2))' }}
          >
            <h3>💎 Elite Transformation</h3>
            <p>Our signature program for those who accept nothing less than excellence. Comprehensive lifestyle optimization with measurable results.</p>
            <div className="price">Investment in Excellence</div>
            <div className="sessions">Complete Lifestyle Transformation</div>
          </PackageCard>
        </PackageGrid>
        
        {/* Luxury Positioning and Social Proof */}
        <UrgencySection
          variants={packageVariants}
          initial="hidden"
          animate={isPackageInView ? "visible" : "hidden"}
        >
          <UrgencyText>🏆 Limited Availability - Only 3 New Executive Clients Monthly</UrgencyText>
          <SocialProofText>
            Trusted by Fortune 500 executives • Featured in Elite Lifestyle publications • 25+ years of proven results • Discretion guaranteed
          </SocialProofText>
          
          <ExploreMoreButton>
            <GlowButton 
              text="Schedule Your Complimentary Consultation" 
              theme={getThemeButtonVariant('primary')} 
              size="large" 
              animateOnRender 
              onClick={() => navigate('/contact')}
              aria-label="Schedule your complimentary consultation"
            />
          </ExploreMoreButton>
        </UrgencySection>
      </PackagePreviewSection>
      
      {renderSectionDivider(1)}
      
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
              text="Book Your Consultation" 
              theme={getThemeButtonVariant('secondary')} 
              size="medium" 
              animateOnRender 
              onClick={() => navigate('/contact')}
              aria-label="Book your complimentary consultation"
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
            text="Begin Your Transformation" 
            theme={getThemeButtonVariant('accent')} 
            size="medium" 
            animateOnRender 
            onClick={() => navigate('/contact')}
            aria-label="Begin your transformation journey"
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
            text="Discover Your Potential" 
            theme={getThemeButtonVariant('primary')} 
            size="medium" 
            animateOnRender 
            onClick={() => navigate('/contact')}
            aria-label="Discover your potential with a consultation"
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
            text="Schedule Your Consultation" 
            theme={getThemeButtonVariant('primary')} 
            size="large" 
            animateOnRender 
            onClick={() => navigate('/contact')}
            aria-label="Schedule your consultation to begin your journey"
          />
        </ExploreMoreButton>
      </div>
    </HomePageContainer>
  );
};

export default HomePage;