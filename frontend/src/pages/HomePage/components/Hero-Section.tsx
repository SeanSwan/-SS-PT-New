// frontend/src/pages/HomePage/components/Hero-Section.tsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../../components/Button/glowButton";
import OrientationForm from "../../../components/OrientationForm/orientationForm";

// Import assets (ensure paths are correct)
import heroVideo from "../../../assets/Swans.mp4"; // Ensure this path is correct
import logoImg from "/Logo.png"; // Ensure this path is correct

// --- TypeScript Interfaces ---

// --- Animation Keyframes ---
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0); }
`;

// Add a subtle rotation animation for extra visual interest
const subtleRotate = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(0.5deg); }
  75% { transform: rotate(-0.5deg); }
  100% { transform: rotate(0deg); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0,255,255,0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.5)); }
`;



// --- Styled Components ---

const HeroContainer = styled.section`
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

  @media (max-width: 768px) {
    padding: 1.5rem;
    padding-top: 5rem;
  }
`;

// Video background with a light overlay for increased video brightness.
const VideoBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* Updated gradient to match Transform section */
    background: linear-gradient(
      160deg, 
      rgba(120, 81, 169, 0.4), 
      rgba(9, 4, 30, 0.7), 
      rgba(0, 159, 253, 0.3)
    );
    z-index: 1;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    will-change: transform; /* Performance optimization */
  }
  
  /* Add a subtle vignette effect around the edges */
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    z-index: 1;
  }
`;





const LogoContainer = styled(motion.div)`
  margin: 0 auto;
  display: flex;
  justify-content: center;
  animation: ${float} 6s ease-in-out infinite, ${glow} 4s ease-in-out infinite, ${subtleRotate} 10s ease-in-out infinite;
  margin-bottom: 1.5rem;
  margin-top: 2rem;
  z-index: 5;
  transform-origin: center center;

  img {
    height: 160px;
    max-width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.4));
  }

  @media (max-width: 768px) {
    img {
      height: 120px;
    }
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    img {
      height: 100px;
    }
  }
`;

// Improved HeroContent with enhanced styling
const HeroContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 800px;
  width: 92%;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  background: rgba(10, 10, 30, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  
  /* Add subtle shine effect */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }

  @media (max-width: 768px) {
    padding: 1.8rem 1.5rem;
    width: 95%;
  }
  
  @media (max-width: 480px) {
    padding: 1.5rem 1.2rem;
    width: 97%;
  }
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
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
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(120, 81, 169, 0.8);
  letter-spacing: 1px;
  text-align: center;
  animation: textShine 8s linear infinite;
  
  @keyframes textShine {
    to {
      background-position: 200% center;
    }
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const TaglineContainer = styled(motion.div)`
  margin: 2rem 0;
  overflow: hidden;

  @media (max-width: 768px) {
    margin: 1rem 0;
  }
`;

const Tagline = styled(motion.h2)`
  font-size: 2.2rem;
  font-weight: 300;
  line-height: 1.4;
  color: white;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  letter-spacing: 1px;
  text-align: center;

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
    display: inline-block;
    font-weight: 700;
    padding: 0 5px;
    text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 2px;
      background: linear-gradient(
        to right,
        rgba(169, 248, 251, 0.5),
        rgba(70, 205, 207, 0.5),
        rgba(123, 44, 191, 0.5)
      );
      border-radius: 2px;
    }
  }

  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin-bottom: 1.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  text-align: center;
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;

  strong {
    color: #46cdcf;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    max-width: 100%;
  }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;

    & > button, & > div {
      width: 100%;
      max-width: 250px;
    }
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
  cursor: pointer;
  z-index: 5;

  &:after {
    content: "↓";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    bottom: 1rem;
  }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      delayChildren: 0.3, 
      staggerChildren: 0.2,
      duration: 0.8,
      ease: "easeOut"
    } 
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      duration: 0.7, 
      ease: "easeOut",
      type: "spring",
      stiffness: 100,
      damping: 12
    } 
  }
};

const HeroSection: React.FC = () => {
  // Using useMemo for expensive component data calculation
  const videoSource = useMemo(() => heroVideo, []);
  const logoSource = useMemo(() => logoImg, []);
  const [showOrientation, setShowOrientation] = useState<boolean>(false);

  const [showScrollIndicator, setShowScrollIndicator] = useState<boolean>(true);

  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const navigate = useNavigate();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }

    const handleScroll = () => {
      setShowScrollIndicator(window.scrollY <= 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      
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
    <HeroContainer ref={containerRef} id="hero">
      <VideoBackground>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          poster="/Swans.mp4"
          loading="eager"
          disablePictureInPicture
          disableRemotePlayback
        >
          <source src={videoSource} type="video/mp4" />
          <track kind="captions" srcLang="en" label="English captions" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>



      <motion.div initial="hidden" animate={controls} variants={containerVariants}>
        <LogoContainer variants={itemVariants}>
          <img src={logoSource} alt="Swan Studios Logo" loading="eager" />
        </LogoContainer>

        <HeroContent>
          <Title variants={itemVariants}>SWAN STUDIOS</Title>

          <TaglineContainer variants={itemVariants}>
            <Tagline>
              Elite Performance Training & <span>Creative Expression</span>
            </Tagline>
          </TaglineContainer>

          <HeroDescription variants={itemVariants}>
            Experience our <strong>elite performance training</strong> meticulously crafted by Sean Swan.
            Leveraging over 25 years of championship coaching and proven NASM protocols, our personalized
            approach empowers you to achieve <strong>peak physical condition</strong> while also nurturing
            <strong> creative expression</strong> in a supportive community that values excellence.
          </HeroDescription>

          <ButtonsContainer variants={itemVariants}>
            <GlowButton
              text="Book Consultation"
              theme="cosmic"
              size="large"
              animateOnRender={false}
              onClick={() => setShowOrientation(true)}
              aria-label="Book a free consultation"
            />
            <GlowButton
              text="Explore Classes"
              theme="purple"
              size="large"
              animateOnRender={false}
              onClick={() => navigate("/store")}
              aria-label="Explore our fitness and creative classes"
            />
          </ButtonsContainer>
        </HeroContent>
      </motion.div>

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
    </HeroContainer>
  );
};

export default HeroSection;