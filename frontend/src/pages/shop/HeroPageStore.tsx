import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlowButton from "./../../components/Button/glowButton";
import OrientationForm from "./../../components/OrientationForm/orientationForm";

// Import assets (ensure these paths are correct)
import heroVideo from "../../../assets/Swans.mp4";
import logoImg from "../../../assets/Logo.png";

// --- TypeScript Interfaces ---
interface RippleProps {
  id: string;
  x: number;
  y: number;
  size: number;
}

// --- Animation Keyframes ---
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0,255,255,0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
`;

const rippleVariants = {
  hidden: { scale: 0, opacity: 0.6 },
  visible: {
    scale: 6,
    opacity: 0,
    transition: { duration: 2.5, ease: "easeOut" }
  }
};

// --- Styled Components ---

// Main hero container
const HeroStoreContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
  padding-top: 6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  background: #000; /* Fallback background color */
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    padding-top: 5rem;
  }
`;

// Fixed fullscreen video background with a light overlay
const VideoBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -2;
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
      rgba(0, 0, 0, 0.03),
      rgba(10, 10, 30, 0.03),
      rgba(20, 20, 50, 0.03)
    );
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// A fallback overlay element for additional styling (if desired)
const ColorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(0,255,255,0.3), rgba(120,81,169,0.3));
  z-index: -1;
`;

// Layer for ripple effects
const MouseInteractionArea = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
`;

// Ripple styled motion.div using custom props
const Ripple = styled(motion.div)<{ left: string; top: string; size: string }>`
  position: absolute;
  left: ${(props) => props.left};
  top: ${(props) => props.top};
  width: ${(props) => props.size};
  height: ${(props) => props.size};
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0,255,255,0.3) 0%,
    rgba(120,81,169,0.3) 50%,
    rgba(120,81,169,0) 70%
  );
  backdrop-filter: blur(2px);
  box-shadow: 0 0 15px rgba(0,255,255,0.3);
  pointer-events: none;
`;

// Wrapper to center the logo above the hero content
const LogoWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative; 
  margin: 0 auto 2.5rem auto;
  z-index: 10;
  padding-top: 20px;
  
  img {
    width: 200px;
    max-width: 80%;
    object-fit: contain;
    filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
    animation: ${glow} 3s ease-in-out infinite;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
    
    img {
      width: 150px;
    }
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1rem;
    
    img {
      width: 130px;
    }
  }
`;

// Hero content area for title, subtitle, description, and CTA button(s)
const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

const HeroTitle = styled.h1`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--silver, #c0c0c0);
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const HeroDescription = styled.p`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: #fff;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
`;

// Enhanced CTA Button with prominent visual styling
const CTAButton = styled(motion.button)`
  position: relative;
  display: inline-block;
  padding: 1.1rem 2.2rem;
  margin-top: 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #000;
  background: var(--neon-blue, #00ffff);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  z-index: 20; /* Ensure highest z-index for foreground visibility */
  box-shadow: 
    0 0 15px rgba(0, 255, 255, 0.5),
    0 0 30px rgba(0, 255, 255, 0.3),
    0 4px 10px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  
  &:before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 8px;
    background: linear-gradient(
      45deg,
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8)
    );
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    background-color: var(--royal-purple, #7851a9);
    color: #fff;
    transform: translateY(-3px) scale(1.03);
    box-shadow: 
      0 0 20px rgba(0, 255, 255, 0.7),
      0 0 40px rgba(0, 255, 255, 0.4),
      0 8px 15px rgba(0, 0, 0, 0.4);
  }
  
  &:hover:before {
    opacity: 1;
  }
  
  &:active {
    transform: translateY(-1px) scale(0.98);
  }
  
  @media (max-width: 768px) {
    padding: 1rem 2rem;
    font-size: 1rem;
    margin-top: 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.9rem 1.8rem;
    font-size: 0.9rem;
    margin-top: 1.25rem;
  }
`;

// Button Glow Effect
const ButtonGlow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  background: radial-gradient(
    circle at center,
    rgba(0, 255, 255, 0.3) 0%,
    transparent 70%
  );
  filter: blur(10px);
  z-index: -1;
  animation: ${glow} 3s ease-in-out infinite;
`;

// Scroll indicator prompting the user to scroll
const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7);
  letter-spacing: 2px;
  cursor: pointer;
  z-index: 5;

  &:after {
    content: "↓";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    bottom: 1rem;
    font-size: 0.7rem;
    
    &:after {
      font-size: 1.2rem;
    }
  }
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.2 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

const logoVariants = {
  hidden: { y: -30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 15,
      delay: 0.2
    } 
  }
};

const buttonVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.9 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10,
      delay: 0.8
    } 
  },
  hover: { 
    scale: 1.05,
    boxShadow: "0 0 25px rgba(0, 255, 255, 0.8)",
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10 
    }
  },
  tap: { 
    scale: 0.95,
    boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)"
  }
};

const HeroSection: React.FC = () => {
  const [showOrientation, setShowOrientation] = useState(false);
  const [ripples, setRipples] = useState<RippleProps[]>([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const navigate = useNavigate();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.95) {
        const { clientX: x, clientY: y } = e;
        const newRipple: RippleProps = {
          id: crypto.randomUUID(),
          x,
          y,
          size: Math.random() * 100 + 30
        };
        setRipples((prev) => [...prev, newRipple]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 2500);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const clickRipples = Array(3).fill(0).map((_, i) => ({
        id: crypto.randomUUID(),
        x,
        y,
        size: 70 + i * 30
      }));
      setRipples((prev) => [...prev, ...clickRipples]);
      clickRipples.forEach((ripple, i) => {
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
        }, 2500 + i * 200);
      });
    };

    const handleScroll = () => {
      setShowScrollIndicator(window.scrollY <= 200);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isInView, controls]);

  const scrollToServices = () => {
    const servicesSection = document.getElementById("services");
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth" });
    } else {
      console.warn("Could not find element with id='services'");
    }
  };

  return (
    <HeroStoreContainer ref={containerRef} id="hero">
      <VideoBackground>
        <video autoPlay loop muted playsInline poster="/assets/Swans.mp4">
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>
      <ColorOverlay />
      <MouseInteractionArea>
        {ripples.map((ripple) => (
          <Ripple
            key={ripple.id}
            left={`${ripple.x}px`}
            top={`${ripple.y}px`}
            size={`${ripple.size}px`}
            variants={rippleVariants}
            initial="hidden"
            animate="visible"
          />
        ))}
      </MouseInteractionArea>
      
      {/* Centered Logo with enhanced positioning */}
      <LogoWrapper>
        <motion.img 
          src={logoImg} 
          alt="Swan Studios Logo" 
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        />
      </LogoWrapper>
      
      <HeroContent>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <HeroTitle variants={itemVariants} as={motion.h1}>
            Elite Training Designed by Sean Swan
          </HeroTitle>
          <HeroSubtitle variants={itemVariants} as={motion.h2}>
            25+ Years of Experience & NASM-Approved Protocols
          </HeroSubtitle>
          <HeroDescription variants={itemVariants} as={motion.p}>
            Discover a revolutionary workout program created from thousands of hours of
            hands-on training by elite trainer Sean Swan—merging cutting-edge fitness science
            with proven NASM protocols. Our personalized approach caters to everyone—from
            children to seniors—ensuring you unlock your full potential.
          </HeroDescription>
        </motion.div>
        
        {/* Enhanced CTA button with prominent foreground styling */}
        <motion.div
          style={{ position: "relative", zIndex: 20 }}
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          whileTap="tap"
        >
          <CTAButton onClick={() => setShowOrientation(true)}>
            <ButtonGlow />
            Orientation Signup
          </CTAButton>
        </motion.div>
      </HeroContent>
      
      {showScrollIndicator && (
        <ScrollIndicator
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          onClick={scrollToServices}
          aria-label="Scroll down to discover more"
        >
          Scroll
        </ScrollIndicator>
      )}

      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </HeroStoreContainer>
  );
};

export default HeroSection;