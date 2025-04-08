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

// Animation keyframes
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.8)); }
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
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
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

const FeatureCard = styled(motion.div)<{ theme: string }>`
  background: rgba(20, 20, 30, 0.8);
  border-radius: 15px;
  padding: 2rem;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
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
          return 'linear-gradient(90deg, #5d3fd3, #ff2e63)';
        case 'ruby':
          return 'linear-gradient(90deg, #e80046, #fd009f)';
        case 'emerald':
          return 'linear-gradient(90deg, #00e8b0, #00fd9f)';
        case 'purple':
        default:
          return 'linear-gradient(90deg, #7800f5, #c894ff)';
      }
    }};
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.03) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    pointer-events: none;
    border-radius: 15px;
  }
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
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
      case 'ruby':
        return 'rgba(232, 0, 70, 0.2)';
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
        return '#ff2e63';
      case 'ruby':
        return '#fd009f';
      case 'emerald':
        return '#00fd9f';
      case 'purple':
      default:
        return '#c894ff';
    }
  }};
  animation: ${float} 6s ease-in-out infinite, ${glow} 4s ease-in-out infinite;
  
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
          return 'rgba(255, 46, 99, 0.5)';
        case 'ruby':
          return 'rgba(253, 0, 159, 0.5)';
        case 'emerald':
          return 'rgba(0, 253, 159, 0.5)';
        case 'purple':
        default:
          return 'rgba(200, 148, 255, 0.5)';
      }
    }};
    animation: ${pulseGlow} 4s ease-in-out infinite;
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: white;
  font-weight: 600;
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

// Animation variants
const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, delay: 0.2 } 
  }
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.2,
      delayChildren: 0.3
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
      stiffness: 300,
      damping: 20,
      duration: 0.6
    }
  }
};

// Sample features data
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
    theme: "ruby",
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
    theme: "ruby",
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
                  animateOnRender 
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