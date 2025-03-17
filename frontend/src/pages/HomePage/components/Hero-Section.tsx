import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation } from "framer-motion";
import GlowButton from "../../../components/Button/glowButton";
import SwanStudiosNeonSign from "../../../components/SwanStudiosSVG/swanstudiossvg.component";
import OrientationForm from "../../../components/OrientationForm/orientationForm";

// Import assets
import logoImg from "../../../assets/Logo.png";
import heroVideo from "../../../assets/Waves.mp4"; // Updated to use Waves video

// Keyframes animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(10);
    opacity: 0;
  }
`;

// Styled Components
const HeroContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  padding: 2rem;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
  }
  
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  margin-bottom: 1.5rem;
  
  img {
    height: 160px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    img {
      height: 120px;
    }
  }
`;

const NeonSignContainer = styled(motion.div)`
  margin: 2rem 0;
  width: 100%;
  max-width: 900px;
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(10, 10, 30, 0.6);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 5;
  letter-spacing: 3px;
  
  &:before {
    content: "★★★★★★★";
    display: block;
    font-size: 0.8rem;
    letter-spacing: 2px;
    color: gold;
    text-align: center;
    margin-bottom: 4px;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }
`;

const HeroContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TaglineContainer = styled(motion.div)`
  margin: 2rem 0;
  overflow: hidden;
`;

const Tagline = styled(motion.h2)`
  font-size: 2.2rem;
  font-weight: 300;
  line-height: 1.4;
  color: white;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  letter-spacing: 1px;
  
  span {
    background: linear-gradient(
      to right,
      #a9f8fb,
      #46cdcf,
      #7b2cbf,
      #c8b6ff,
      #a9f8fb
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ${shimmer} 4s linear infinite;
    display: inline-block;
    font-weight: 600;
    padding: 0 5px;
  }
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  
  &:after {
    content: "↓";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }
`;

// Ripple effect for mouse interaction
const MouseInteractionArea = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
`;

const Ripple = styled.div`
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    rgba(0, 255, 255, 0.3),
    rgba(120, 81, 169, 0.3)
  );
  transform: scale(0);
  animation: ${ripple} 1.5s linear;
`;

const HeroSection = () => {
  const [showOrientation, setShowOrientation] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef(null);
  const rippleRef = useRef([]);
  
  // For ripple effect
  const [ripples, setRipples] = useState([]);
  
  useEffect(() => {
    // Start animations when component mounts
    controls.start("visible");
    
    // Mouse move handler for ripple effect
    const handleMouseMove = (e) => {
      // Only create ripple occasionally
      if (Math.random() > 0.95) {
        const x = e.clientX;
        const y = e.clientY;
        
        const newRipples = [...ripples, { 
          id: Date.now(), 
          x, 
          y, 
          size: Math.random() * 100 + 50 
        }];
        
        setRipples(newRipples);
        
        // Remove old ripples
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipples[newRipples.length - 1].id));
        }, 1500);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [controls, ripples]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  return (
    <>
      <HeroContainer ref={containerRef} id="hero">
        <VideoBackground>
          <video autoPlay loop muted playsInline>
            <source src={heroVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </VideoBackground>
        
        <MouseInteractionArea>
          {ripples.map(ripple => (
            <Ripple
              key={ripple.id}
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
              }}
            />
          ))}
        </MouseInteractionArea>
        
        <PremiumBadge 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          PREMIER
        </PremiumBadge>
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <LogoContainer variants={itemVariants}>
            <img src={logoImg} alt="Swan Studios" />
          </LogoContainer>
          
          <NeonSignContainer variants={itemVariants}>
            <SwanStudiosNeonSign 
              colors={['#00ffff', '#7851a9']}
              mainColor="#00ffff"
              accentColor="#7851a9"
              maxWidth="900px"
              letterWidth="80px"
              mobileWidth="50px"
              animateOnLoad={true}
              glowIntensity="medium"
            />
          </NeonSignContainer>
          
          <HeroContent>
            <TaglineContainer variants={itemVariants}>
              <Tagline>
                Elite Performance Training For <span>Extraordinary</span> Results
              </Tagline>
            </TaglineContainer>
            
            <HeroDescription variants={itemVariants}>
              Experience a transformative workout program meticulously crafted by Sean Swan.
              Leveraging over 25 years of hands-on elite coaching and proven NASM protocols,
              our personalized approach empowers you to achieve peak performance at every stage of life.
            </HeroDescription>
            
            <ButtonsContainer variants={itemVariants}>
              <GlowButton 
                text="Book Consultation" 
                theme="cosmic" 
                size="large" 
                animateOnRender 
                onClick={() => setShowOrientation(true)}
              />
              
              <GlowButton 
                text="View Services" 
                theme="purple" 
                size="large" 
                animateOnRender 
              />
            </ButtonsContainer>
          </HeroContent>
        </motion.div>
        
        <ScrollIndicator 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          DISCOVER
        </ScrollIndicator>
      </HeroContainer>
      
      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </>
  );
};

export default HeroSection;