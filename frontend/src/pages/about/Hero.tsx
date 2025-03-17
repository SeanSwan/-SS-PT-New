import React, { useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
// Import GlowButton component
import GlowButton from "../../components/Button/glowButton";

// Properly import the video and logo
import wavesVideo from "../../assets/Waves.mp4"; 
import logoImage from "../../assets/Logo.png";

// ======================= 🎨 Animation Keyframes =======================
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
  100% { transform: translateY(0px) rotate(0deg); }
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

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const scroll = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(15px);
  }
`;

// Enhanced styled components with improved responsive design
const HeroContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
`;

// Enhanced video background styling 
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  padding: 0;
  z-index: 0;
  opacity: 0.8; /* Slightly reduced opacity for more luxury feel */
  
  @media (max-width: 768px) {
    object-position: center;
  }
`;

// Enhanced overlay with luxury gradient animation
const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    45deg,
    rgba(10, 10, 26, 0.75),
    rgba(30, 30, 63, 0.75)
  );
  z-index: 1;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.15),
      rgba(120, 81, 169, 0.15),
      rgba(0, 255, 255, 0.15)
    );
    background-size: 200% 200%;
    animation: ${gradientShift} 15s ease infinite;
    z-index: -1;
  }
`;

// Enhanced content container with glass morphism effect
const Content = styled(motion.div)`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #fff;
  text-align: center;
  padding: 0 2rem;
  
  /* Glass morphism effect */
  &:before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 1200px;
    height: 75%;
    background: rgba(30, 30, 60, 0.15);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.8s ease;
  }
  
  &:hover {
    &:before {
      opacity: 1;
    }
  }
`;

// Luxury logo container with glow effect
const LogoContainer = styled(motion.div)`
  position: relative;
  width: 180px;
  height: 180px;
  margin-bottom: 1.5rem;
  animation: ${float} 6s ease-in-out infinite;
  
  /* Premium glow effect */
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(0, 255, 255, 0.1);
    filter: blur(15px);
    z-index: -1;
    animation: ${pulseGlow} 4s infinite ease-in-out;
  }
  
  @media (max-width: 768px) {
    width: 150px;
    height: 150px;
  }
  
  @media (max-width: 480px) {
    width: 120px;
    height: 120px;
  }
`;

// Enhanced logo styling
const Logo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.3));
  transition: all 0.3s ease;
  
  &:hover {
    filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
  }
`;

// Premium title with gradient animation
const Title = styled(motion.h1)`
  font-size: 5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5),
               0 0 20px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
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

  @media (max-width: 1024px) {
    font-size: 4rem;
  }
  
  @media (max-width: 768px) {
    font-size: 3.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2.8rem;
    margin-bottom: 1rem;
  }
`;

// Enhanced tagline with premium styling
const Tagline = styled(motion.p)`
  font-size: 1.8rem;
  font-weight: 300;
  max-width: 800px;
  line-height: 1.5;
  margin: 0 auto 2rem;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.9);
  
  span {
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    font-size: 1.4rem;
    max-width: 90%;
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
    max-width: 95%;
  }
`;

// Luxury button container for spacing
const ButtonContainer = styled(motion.div)`
  margin-top: 2rem;
`;

// Premium scroll indicator with glass morphism effect
const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  
  .mouse {
    width: 30px;
    height: 50px;
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 20px;
    display: flex;
    justify-content: center;
    padding-top: 10px;
    position: relative;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
    
    /* Glass morphism effect */
    &:before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 20px;
      padding: 2px;
      background: linear-gradient(45deg, #00ffff, #7851a9);
      -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0.5;
    }
  }
  
  .wheel {
    width: 5px;
    height: 10px;
    background-color: #00ffff;
    border-radius: 10px;
    animation: ${scroll} 1.5s infinite;
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  }
  
  @media (max-width: 768px) {
    bottom: 1rem;
    
    .mouse {
      width: 25px;
      height: 40px;
    }
  }
`;

export default function Hero() {
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const controls = useAnimation();
  const isInView = useInView(contentRef, { once: false });
  
  // Ensure video plays properly and fills container
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(error => {
        console.log("Video autoplay was prevented:", error);
        
        // Add event listener for user interaction to play video
        document.addEventListener('click', () => {
          video.play().catch(e => console.log(e));
        }, { once: true });
      });
    }
  }, []);
  
  // Animation for content when in view
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    } else {
      controls.start('hidden');
    }
  }, [controls, isInView]);
  
  // Premium animation variants with enhanced transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

  return (
    <HeroContainer>
      {/* Optimized video background with ref */}
      <VideoBackground 
        ref={videoRef}
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto"
      >
        <source src={wavesVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Enhanced overlay with luxury gradient */}
      <Overlay />

      {/* Luxury content section with glass morphism effect */}
      <Content
        ref={contentRef}
        variants={containerVariants}
        initial="hidden"
        animate={controls}
      >
        {/* Animated logo with glow effect */}
        <LogoContainer variants={itemVariants}>
          <Logo src={logoImage} alt="Swan Studios Logo" />
        </LogoContainer>
        
        {/* Premium title with gradient animation */}
        <Title variants={itemVariants}>
          SwanStudios
        </Title>
        
        {/* Enhanced tagline with highlighted text */}
        <Tagline variants={itemVariants}>
          Revolutionizing <span>Personal Training</span> for the Modern Athlete
        </Tagline>
        
        {/* Using GlowButton instead of custom button */}
        <ButtonContainer variants={itemVariants}>
          <GlowButton
            text="Discover More"
            theme="cosmic"
            size="large"
            animateOnRender
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
              });
            }}
          />
        </ButtonContainer>
      </Content>
      
      {/* Premium scroll indicator with animation */}
      <ScrollIndicator
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <div className="mouse">
          <div className="wheel"></div>
        </div>
      </ScrollIndicator>
    </HeroContainer>
  );
}