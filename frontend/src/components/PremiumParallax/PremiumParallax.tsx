// src/pages/homepage/components/PremiumParallax/PremiumParallax.jsx
import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { motion, useScroll, useTransform, useInView, useAnimation } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaRocket, FaStar, FaMedal, FaGem } from 'react-icons/fa';
import GlowButtonComponent from "../Button/glow";
import parallaxVideo from "../../../../assets/security.mp4";
import logoImage from "../../../../assets/Logo.png";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Styled Components
const ParallaxContainer = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  @media (max-width: 768px) {
    min-height: 120vh;
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
`;

const ParallaxVideo = styled(motion.video)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DarkenOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 20, 0.9) 100%
  );
  z-index: -1;
`;

const GradientOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at center,
    transparent 0%,
    rgba(0, 0, 20, 0.8) 80%
  );
  z-index: -1;
`;

const ParticlesOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: -1;
`;

const Particle = styled.div`
  position: absolute;
  width: 6px;
  height: 6px;
  background: rgba(0, 255, 255, 0.6);
  border-radius: 50%;
  animation: float 20s linear infinite;
  opacity: 0;
  
  @keyframes float {
    0% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-1000px) translateX(100px);
      opacity: 0;
    }
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 3rem;
  }
`;

const LeftContent = styled(motion.div)`
  flex: 1;
  padding-right: 3rem;
  
  @media (max-width: 768px) {
    padding-right: 0;
    text-align: center;
    padding-bottom: 2rem;
  }
`;

const RightContent = styled(motion.div)`
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const PremiumTitle = styled(motion.h2)`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: white;
  position: relative;
  
  span {
    position: relative;
    display: inline-block;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    padding-bottom: 5px;
    
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #00ffff, #7851a9);
      border-radius: 3px;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const PremiumDescription = styled(motion.p)`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: #e0e0e0;
  line-height: 1.7;
  
  @media (max-width: 768px) {
    font-size: 1.05rem;
  }
`;

const HighlightedText = styled.span`
  color: var(--neon-blue, #00ffff);
  font-weight: 500;
`;

const FeaturesList = styled(motion.div)`
  margin-bottom: 2.5rem;
`;

const FeatureItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
  
  @media (max-width: 768px) {
    text-align: left;
  }
`;

const FeatureIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
  color: var(--neon-blue, #00ffff);
  font-size: 1.2rem;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
  flex-shrink: 0;
`;

const FeatureText = styled.div`
  flex: 1;
  
  h4 {
    color: #fff;
    margin: 0 0 0.3rem;
    font-size: 1.1rem;
  }
  
  p {
    color: #c0c0c0;
    font-size: 0.95rem;
    margin: 0;
  }
`;

const PlanCard = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 400px;
  background: rgba(15, 15, 35, 0.85);
  border-radius: 15px;
  padding: 3rem 2rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  transform-style: preserve-3d;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 15px;
    padding: 1.5px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.8;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15));
    border-radius: 17px;
    filter: blur(10px);
    z-index: -2;
  }
`;

const PlanHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
`;

const PlanLogo = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.5));
  }
`;

const PlanName = styled.h3`
  font-size: 1.8rem;
  color: white;
  margin-bottom: 0.5rem;
`;

const PlanTagline = styled.p`
  color: var(--neon-blue, #00ffff);
  font-size: 1rem;
  margin: 0;
`;

const PlanPricing = styled.div`
  text-align: center;
  margin: 2rem 0;
  
  .price {
    font-size: 3rem;
    color: white;
    font-weight: 700;
    margin-bottom: 0.5rem;
    
    span {
      font-size: 1.5rem;
      font-weight: 500;
    }
  }
  
  .period {
    color: #c0c0c0;
    font-size: 0.9rem;
  }
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
`;

const PlanFeatureItem = styled.li`
  color: #e0e0e0;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  position: relative;
  
  &::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--neon-blue, #00ffff);
    font-weight: bold;
  }
`;

const ExclusiveTag = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  color: black;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  text-transform: uppercase;
  transform: rotate(5deg);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
`;

const ButtonContainer = styled.div`
  text-align: center;
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1,
      staggerChildren: 0.3
    }
  }
};

const titleVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 100
    }
  }
};

const descriptionsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const featuresContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateY: -5 },
  visible: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    transition: {
      duration: 1,
      type: "spring",
      stiffness: 100
    }
  }
};

// Premium Parallax Component
const PremiumParallax = () => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const controls = useAnimation();
  const { scrollY } = useScroll();
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  
  // Parallax effects for video and sections
  const videoY = useTransform(scrollY, [0, 1000], [0, 300]);
  const leftContentX = useTransform(scrollY, [0, 1000], [0, -50]);
  const rightContentX = useTransform(scrollY, [0, 1000], [0, 50]);
  
  // Random particles creation
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const particlesOverlay = container.querySelector('.particles-overlay');
      
      if (particlesOverlay) {
        // Create 50 particles with random properties
        for (let i = 0; i < 50; i++) {
          const particle = document.createElement('div');
          particle.classList.add('particle');
          
          // Random positioning
          const top = Math.random() * 100;
          const left = Math.random() * 100;
          
          // Random size (2-6px)
          const size = 2 + Math.random() * 4;
          
          // Random animation duration (10-30s)
          const duration = 10 + Math.random() * 20;
          
          // Random animation delay
          const delay = Math.random() * 5;
          
          // Random color (blue or purple tint)
          const isBlue = Math.random() > 0.5;
          const color = isBlue 
            ? `rgba(0, ${155 + Math.random() * 100}, ${155 + Math.random() * 100}, ${0.3 + Math.random() * 0.7})` 
            : `rgba(${50 + Math.random() * 70}, ${50 + Math.random() * 30}, ${120 + Math.random() * 80}, ${0.3 + Math.random() * 0.7})`;
          
          // Apply styles
          particle.style.top = `${top}%`;
          particle.style.left = `${left}%`;
          particle.style.width = `${size}px`;
          particle.style.height = `${size}px`;
          particle.style.background = color;
          particle.style.animationDuration = `${duration}s`;
          particle.style.animationDelay = `${delay}s`;
          
          // Add to container
          particlesOverlay.appendChild(particle);
        }
      }
    }
  }, []);
  
  // GSAP hover effect for the plan card
  useEffect(() => {
    if (cardRef.current) {
      const card = cardRef.current;
      
      const handleMouseMove = (e) => {
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;
        
        gsap.to(card, {
          rotationY: x * 10,
          rotationX: y * -10,
          transformStyle: "preserve-3d",
          duration: 0.5,
          ease: "power2.out"
        });
      };
      
      const handleMouseLeave = () => {
        gsap.to(card, {
          rotationY: 0,
          rotationX: 0,
          duration: 0.5,
          ease: "power2.out"
        });
      };
      
      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);
      
      return () => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, []);
  
  // Start animations when section is in view
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);
  
  // Features data
  const features = [
    {
      icon: <FaRocket />,
      title: "Accelerated Progress",
      description: "Achieve results 3x faster with our proven elite methodologies."
    },
    {
      icon: <FaStar />,
      title: "VIP Experience",
      description: "Exclusive access to premium facilities and coaching schedules."
    },
    {
      icon: <FaMedal />,
      title: "Elite Performance",
      description: "Training protocols used by professional athletes and celebrities."
    }
  ];
  
  // Plan features data
  const planFeatures = [
    "Unlimited 1-on-1 Training Sessions",
    "Priority Scheduling & Extended Hours",
    "Custom Nutrition & Recovery Plans",
    "Quarterly Body Composition Analysis",
    "Exclusive Online Portal Access",
    "Performance App Integration"
  ];
  
  return (
    <ParallaxContainer ref={containerRef} id="premium-parallax">
      <VideoBackground>
        <ParallaxVideo 
          style={{ y: videoY }}
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source src={parallaxVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </ParallaxVideo>
        <DarkenOverlay />
        <GradientOverlay />
      </VideoBackground>
      
      <ParticlesOverlay className="particles-overlay" />
      
      <ContentWrapper>
        <LeftContent
          style={{ x: leftContentX }}
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <PremiumTitle variants={titleVariants}>
            Elevate Your <span>Training Experience</span>
          </PremiumTitle>
          <PremiumDescription variants={descriptionsVariants}>
            Join our <HighlightedText>Elite Performance Program</HighlightedText> for an unparalleled fitness experience. Reserved for those who demand the very best in personalized training and exclusive amenities.
          </PremiumDescription>
          
          <FeaturesList variants={featuresContainerVariants}>
            {features.map((feature, index) => (
              <FeatureItem key={index} variants={featureItemVariants}>
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <FeatureText>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </FeatureText>
              </FeatureItem>
            ))}
          </FeaturesList>
        </LeftContent>
        
        <RightContent
          style={{ x: rightContentX }}
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <PlanCard 
            ref={cardRef} 
            variants={cardVariants}
          >
            <ExclusiveTag>Elite Member</ExclusiveTag>
            <PlanHeader>
              <PlanLogo>
                <img src={logoImage} alt="SwanStudios Logo" />
              </PlanLogo>
              <PlanName>Platinum Access</PlanName>
              <PlanTagline>For Serious Performers Only</PlanTagline>
            </PlanHeader>
            
            <PlanPricing>
              <div className="price">
                $599<span>/mo</span>
              </div>
              <div className="period">No contracts, cancel anytime</div>
            </PlanPricing>
            
            <PlanFeatures>
              {planFeatures.map((feature, index) => (
                <PlanFeatureItem key={index}>{feature}</PlanFeatureItem>
              ))}
            </PlanFeatures>
            
            <ButtonContainer>
              <GlowButtonComponent text="Schedule Consultation" />
            </ButtonContainer>
          </PlanCard>
        </RightContent>
      </ContentWrapper>
    </ParallaxContainer>
  );
};

export default PremiumParallax;