// frontend/src/pages/HomePage/components/Hero-Section.tsx

import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../../components/Button/glowButton";
import OrientationForm from "../../../components/OrientationForm/orientationForm";

// Import assets (ensure paths are correct)
import heroVideo from "/Swans.mp4";
import logoImg from "/assets/Logo.png";

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
    /* Lighter overlay values for better video visibility */
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

const LogoContainer = styled(motion.div)`
  margin: 0 auto;
  display: flex;
  justify-content: center;
  animation: ${float} 6s ease-in-out infinite, ${glow} 4s ease-in-out infinite;
  margin-bottom: 1.5rem;
  margin-top: 2rem;
  z-index: 5;

  img {
    height: 160px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    img {
      height: 120px;
    }
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
`;

// PremiumGlowButton is now fixed to the top-right corner of the viewport
// and is non-interactive via pointer-events: none.
const PremiumGlowButton = styled(GlowButton)`
  position: fixed;
  top: 80px; /* Adjust as needed */
  right: 20px; /* Adjust as needed */
  z-index: 100;
  pointer-events: none;

  @media (max-width: 768px) {
    top: 60px;
    right: 10px;
  }
`;

const HeroContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
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
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(120, 81, 169, 0.8);

  @media (max-width: 768px) {
    font-size: 2.2rem;
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
    font-size: 1.5rem;
    margin-bottom: 1rem;
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
    margin-bottom: 1.5rem;
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
  visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.2 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
};

const HeroSection: React.FC = () => {
  const [showOrientation, setShowOrientation] = useState<boolean>(false);
  const [ripples, setRipples] = useState<RippleProps[]>([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState<boolean>(true);

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
        const x = e.clientX;
        const y = e.clientY;
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
      const x = e.clientX;
      const y = e.clientY;
      const clickRipples = Array(3)
        .fill(0)
        .map((_, i) => ({
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
    <HeroContainer ref={containerRef} id="hero">
      <VideoBackground>
        <video autoPlay loop muted playsInline poster="/Swans.mp4">
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>

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

      {/* Non-clickable Premium Glow Button placed fixed in the top-right corner */}
      <PremiumGlowButton
        text="★★★★★★★ PREMIUM"
        theme="cosmic"
        size="small"
        animateOnRender={false}
        onClick={() => {}}
      />

      <motion.div initial="hidden" animate={controls} variants={containerVariants}>
        <LogoContainer variants={itemVariants}>
          <img src={logoImg} alt="Swan Studios Logo" />
        </LogoContainer>

        <HeroContent>
          <Title variants={itemVariants}>SWAN STUDIOS</Title>

          <TaglineContainer variants={itemVariants}>
            <Tagline>
              Elite Performance Training For <span>Extraordinary</span> Results
            </Tagline>
          </TaglineContainer>

          <HeroDescription variants={itemVariants}>
            Experience a transformative workout program meticulously crafted by Sean Swan.
            Leveraging over 25 years of elite coaching and proven NASM protocols, our personalized
            approach empowers you to achieve peak performance at every stage of life.
          </HeroDescription>

          <ButtonsContainer variants={itemVariants}>
            <GlowButton
              text="Book Consultation"
              theme="cosmic"
              size="large"
              animateOnRender={false}
              onClick={() => setShowOrientation(true)}
            />
            <GlowButton
              text="View Programs"
              theme="purple"
              size="large"
              animateOnRender={false}
              onClick={() => navigate("/store")}
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
