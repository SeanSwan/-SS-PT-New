// src/components/FeaturesSection/FeaturesSection.tsx
import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useInView } from "framer-motion";
import GlowButton from "../Button/glowButton";
import SectionTitle from "../ui/SectionTitle";

// Define TypeScript interfaces
interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
  theme: "cosmic" | "purple" | "emerald" | "ruby";
  linkTo: string;
}

// Animation keyframes - single subtle diagonal glimmer animation every 5 seconds
const diagonalGlimmer = keyframes`
  0%, 85% {
    background-position: -200% 200%;
    opacity: 0;
  }
  90%, 95% {
    background-position: 0% 0%;
    opacity: 0.8;
  }
  100% {
    background-position: 200% -200%;
    opacity: 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
  50% { filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
`;

// Styled components
const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(135deg, #09041e, #1a1a3c);
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 80vh;
  height: 80vh;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 255, 255, 0.1) 0%,
    rgba(120, 81, 169, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 5%;
  left: 60%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.4;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  color: #c0c0c0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

// Enhanced 3D card with improved natural diagonal glimmer effect
const FeatureCard = styled(motion.div)<{ theme: string }>`
  background: linear-gradient(135deg, rgba(25, 25, 45, 0.95), rgba(10, 10, 25, 0.95));
  border-radius: 15px;
  padding: 2rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  transition: all 0.5s ease;
  
  /* Enhanced 3D effect with stronger shadow and depth */
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 2px 5px rgba(255, 255, 255, 0.05) inset,
    0 -2px 5px rgba(0, 0, 0, 0.3) inset;
  
  /* Subtle border glow based on theme */
  border: 1px solid ${props => {
    switch(props.theme) {
      case 'cosmic':
        return 'rgba(93, 63, 211, 0.3)';
      case 'emerald':
        return 'rgba(0, 232, 176, 0.3)';
      case 'purple':
      default:
        return 'rgba(120, 0, 245, 0.3)';
    }
  }};
  
  /* Enhanced top border */
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: ${props => {
      switch(props.theme) {
        case 'cosmic':
          return 'linear-gradient(135deg, #5d3fd3, #009FFD)';
        case 'emerald':
          return 'linear-gradient(135deg, #00e8b0, #00fd9f)';
        case 'purple':
        default:
          return 'linear-gradient(135deg, #7800f5, #c894ff)';
      }
    }};
    box-shadow: 0 0 15px ${props => {
      switch(props.theme) {
        case 'cosmic':
          return 'rgba(93, 63, 211, 0.6)';
        case 'emerald':
          return 'rgba(0, 232, 176, 0.6)';
        case 'purple':
        default:
          return 'rgba(120, 0, 245, 0.6)';
      }
    }};
  }
  
  /* Single subtle diagonal glimmer effect (top-right to bottom-left) */
  &:after {
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
    animation: ${diagonalGlimmer} 5s linear infinite;
    pointer-events: none;
    border-radius: 15px;
    opacity: 0;
  }
  
  &:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow: 
      0 15px 35px rgba(0, 0, 0, 0.5),
      0 2px 10px rgba(255, 255, 255, 0.1) inset,
      0 -2px 10px rgba(0, 0, 0, 0.4) inset,
      0 0 20px ${props => {
        switch(props.theme) {
          case 'cosmic':
            return 'rgba(93, 63, 211, 0.2)';
          case 'emerald':
            return 'rgba(0, 232, 176, 0.2)';
          case 'purple':
          default:
            return 'rgba(120, 0, 245, 0.2)';
        }
      }};
  }
`;

const IconContainer = styled.div<{ theme: string }>`
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  position: relative;
  background: ${props => {
    switch(props.theme) {
      case 'cosmic':
        return 'rgba(93, 63, 211, 0.2)';
      case 'emerald':
        return 'rgba(0, 232, 176, 0.2)';
      case 'purple':
      default:
        return 'rgba(120, 0, 245, 0.2)';
    }
  }};
  color: ${props => {
    switch(props.theme) {
      case 'cosmic':
        return '#46cdcf';
      case 'emerald':
        return '#00fd9f';
      case 'purple':
      default:
        return '#c894ff';
    }
  }};
  animation: ${float} 8s ease-in-out infinite, ${glow} 6s ease-in-out infinite;
  
  /* Enhanced glow effect */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  
  &:before {
    content: "";
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 50%;
    border: 1px solid ${props => {
      switch(props.theme) {
        case 'cosmic':
          return 'rgba(70, 205, 207, 0.5)';
        case 'emerald':
          return 'rgba(0, 253, 159, 0.5)';
        case 'purple':
        default:
          return 'rgba(200, 148, 255, 0.5)';
      }
    }};
    animation: ${pulseGlow} 6s ease-in-out infinite;
  }
`;

// Enhanced title with subtle 3D effect
const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: white;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
  
  &:after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -5px;
    width: 40px;
    height: 2px;
    background: rgba(255, 255, 255, 0.3);
  }
`;

const FeatureDescription = styled.p`
  font-size: 1rem;
  color: #c0c0c0;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex: 1;
`;

const ButtonContainer = styled.div`
  margin-top: auto;
`;

// Animation variants - slowed down for more elegant transitions
const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, delay: 0.3 } 
  }
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.15,
      delayChildren: 0.4
    }
  }
};

const cardVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 100,
      damping: 15,
      duration: 0.8
    }
  }
};

// Features data - using purple instead of ruby theme
const features: Feature[] = [
  {
    id: 1,
    title: "Elite Personal Training",
    description: "Experience personalized coaching from NASM-certified experts with over 25 years of experience. Our science-based approach is tailored to your unique goals and needs.",
    icon: "💪",
    theme: "cosmic",
    linkTo: "/services/personal-training"
  },
  {
    id: 2,
    title: "Performance Assessment",
    description: "Our comprehensive evaluation uses cutting-edge technology to analyze your movement patterns, strength imbalances, and metabolic efficiency to create your optimal program.",
    icon: "📊",
    theme: "purple",
    linkTo: "/services/assessment"
  },
  {
    id: 3,
    title: "Nutrition Coaching",
    description: "Transform your relationship with food through our evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.",
    icon: "🥗",
    theme: "emerald",
    linkTo: "/services/nutrition"
  },
  {
    id: 4,
    title: "Recovery & Mobility",
    description: "Optimize your body's repair process with cutting-edge recovery techniques including mobility training, myofascial release, and specialized regeneration protocols.",
    icon: "🧘‍♂️",
    theme: "purple",
    linkTo: "/services/recovery"
  },
  {
    id: 5,
    title: "Online Coaching",
    description: "Get expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our premium coaching platform.",
    icon: "💻",
    theme: "cosmic",
    linkTo: "/services/online-coaching"
  },
  {
    id: 6,
    title: "Group Performance",
    description: "Join our exclusive small-group sessions combining the energy of group workouts with personalized attention for maximum results at a more accessible price point.",
    icon: "👥",
    theme: "purple",
    linkTo: "/services/group-training"
  },
  {
    id: 7,
    title: "Sports-Specific Training",
    description: "Elevate your athletic performance with specialized programs designed for your sport, focusing on the specific skills, movements, and energy systems you need to excel.",
    icon: "🏆",
    theme: "emerald",
    linkTo: "/services/sports-training"
  },
  {
    id: 8,
    title: "Corporate Wellness",
    description: "Boost team productivity and morale with our comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges.",
    icon: "🏢",
    theme: "purple",
    linkTo: "/services/corporate-wellness"
  }
];

const FeaturesSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  
  return (
    <SectionContainer id="services" ref={ref}>
      <BackgroundGlow />
      <ContentWrapper>
        <SectionTitle>
          Our Premium Services
        </SectionTitle>
        
        <SectionSubtitle
          variants={subtitleVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          Discover our comprehensive range of elite training services designed to transform
          your performance and elevate your fitness journey
        </SectionSubtitle>
        
        <FeaturesGrid
          variants={gridVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature) => (
            <FeatureCard 
              key={feature.id} 
              theme={feature.theme}
              variants={cardVariants}
            >
              <IconContainer theme={feature.theme}>
                {feature.icon}
              </IconContainer>
              
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              
              <ButtonContainer>
                <GlowButton 
                  text="Learn More" 
                  theme={feature.theme} 
                  size="small" 
                  animateOnRender={false}
                  onClick={() => window.location.href = feature.linkTo}
                />
              </ButtonContainer>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default FeaturesSection;