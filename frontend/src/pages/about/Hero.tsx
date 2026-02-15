import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;
// Import GlowButton component
import GlowButton from "../../components/ui/buttons/GlowButton";

// Use direct paths to public folder
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

const reveal = keyframes`
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
`;

const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1); opacity: 1; }
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

// Enhanced logo styling with decorative elements
const Logo = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.3));
    transition: all 0.3s ease;
    
    &:hover {
      filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
    }
  }
`;

// Decorative sparkles around the logo
const Sparkle = styled.div`
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: white;
  z-index: -1;
  animation: ${sparkle} 2s infinite ease-out;
  animation-delay: ${props => props.delay || "0s"};
  top: ${props => props.top || "0"};
  left: ${props => props.left || "0"};
  opacity: 0;
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
  position: relative;
  
  span {
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    position: relative;
    display: inline-block;
    
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 1px;
      background: #00ffff;
      transform-origin: left;
      animation: ${reveal} 1.5s ease forwards;
      animation-delay: 1.5s;
    }
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

// Enhanced tagline with staggered word reveal animation
const TaglineWords = styled(motion.span)`
  display: inline-block;
  margin-right: 8px;
  opacity: 0;
  animation: ${fadeInUp} 0.5s forwards;
  animation-delay: ${props => props.delay || "0s"};
`;

// Luxury button container for spacing
const ButtonContainer = styled(motion.div)`
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
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
  
  .scroll-text {
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.8rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    .scroll-text {
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    bottom: 1rem;
    
    .mouse {
      width: 25px;
      height: 40px;
    }
  }
`;

// New component for social proof elements
const AwardBadges = styled(motion.div)`
  position: absolute;
  top: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 3;
  
  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
  }
`;

const AwardBadge = styled(motion.div)`
  background: rgba(30, 30, 60, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  
  &:before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00ffff;
    display: block;
    box-shadow: 0 0 10px #00ffff;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
`;

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Split the tagline for word-by-word animation
  const taglineText = "Achieve Your Best Self: Training Designed For You";
  const taglineWords = taglineText.split(" ");
  
  // State for sparkle positions
  const [sparkles] = useState(Array.from({ length: 8 }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`
  })));
  
  // Ensure video plays properly
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        document.addEventListener('click', () => {
          video.play().catch(() => {});
        }, { once: true });
      });
    }
  }, []);
  
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
      
      {/* Award Badges */}
      <AwardBadges
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, staggerChildren: 0.2 }}
      >
        <AwardBadge
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          Top Rated 2025
        </AwardBadge>
        <AwardBadge
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.4 }}
        >
          Excellence Award
        </AwardBadge>
        <AwardBadge
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.6 }}
        >
          #1 Fitness Studio
        </AwardBadge>
      </AwardBadges>

      {/* Luxury content section with glass morphism effect */}
      <Content
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated logo with glow effect */}
        <LogoContainer variants={itemVariants}>
          <Logo>
            <img src={logoImage} alt="Swan Studios Logo" />
            {sparkles.map((sparkle, index) => (
              <Sparkle 
                key={index}
                top={sparkle.top}
                left={sparkle.left}
                delay={sparkle.delay}
              />
            ))}
          </Logo>
        </LogoContainer>
        
        {/* Premium title with gradient animation */}
        <Title variants={itemVariants}>
          SwanStudios
        </Title>
        
        {/* Enhanced tagline with word-by-word animation */}
        <Tagline variants={itemVariants}>
          {taglineWords.map((word, index) => (
            <TaglineWords 
              key={index}
              delay={`${0.8 + index * 0.1}s`}
            >
              {word === "Training" ? <span>{word}</span> : word}
            </TaglineWords>
          ))}
        </Tagline>
        
        {/* Enhanced button container with multiple buttons */}
        <ButtonContainer variants={itemVariants}>
          <GlowButton
            text="Discover Our Story"
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
          <GlowButton
            text="View Testimonials"
            theme="neon"
            size="large"
            animateOnRender
            onClick={() => {
              const testimonialsSection = document.getElementById('testimonials-section');
              if (testimonialsSection) {
                testimonialsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </ButtonContainer>
      </Content>
      
      {/* Premium scroll indicator with animation */}
      <ScrollIndicator
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        aria-hidden="true"
      >
        <div className="scroll-text">Scroll to explore</div>
        <div className="mouse">
          <div className="wheel"></div>
        </div>
      </ScrollIndicator>
    </HeroContainer>
  );
}