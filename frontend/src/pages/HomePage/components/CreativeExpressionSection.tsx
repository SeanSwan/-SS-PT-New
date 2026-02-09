// frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx

import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useInView } from "framer-motion";
import { Music, Paintbrush, Mic, Heart } from "lucide-react";
import SectionTitle from "../../../components/ui/SectionTitle";
import { useUniversalTheme } from "../../../context/ThemeContext";

// --- Animation Keyframes ---
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 15px currentColor; }
  50% { box-shadow: 0 0 25px currentColor; }
  100% { box-shadow: 0 0 15px currentColor; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const stellarGlow = keyframes`
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
`;

// --- Styled Components ---
const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(to bottom, ${({ theme }) => theme.background.primary}, ${({ theme }) => theme.background.secondary});
  position: relative;
  overflow: hidden;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const GlowEffect = styled.div`
  position: absolute;
  width: 70vh;
  height: 70vh;
  border-radius: 50%;
  background: ${({ theme }) => theme.gradients.cosmic};
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(60px);
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;
  animation: ${stellarGlow} 8s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    width: 40%;
    height: 40%;
    background: ${({ theme }) => theme.gradients.primary};
    border-radius: 50%;
    top: 30%;
    left: 30%;
    filter: blur(40px);
    animation: ${float} 6s ease-in-out infinite;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SectionDescription = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 4rem;
  color: ${({ theme }) => theme.text.secondary};
  max-width: 800px;
  line-height: 1.6;
  
  span {
    background: ${({ theme }) => theme.gradients.cosmic};
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 3rem;
  }
`;

// Updated CardGrid for T-shape layout
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  
  // The Community & Heart card will span the full width on large screens (3-col layout)
  & > div:nth-child(4) {
    grid-column: 1 / -1;
  }
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    
    // Reset span for 2-column layout to create a perfect 2x2 grid
    & > div:nth-child(4) {
      grid-column: auto;
    }
  }
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ExpressionCard = styled(motion.div)`
  background: ${({ theme }) => theme.background.surface}CC;
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  height: 100%;
  
  &::before {
    content: '';
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
    transition: left 0.6s ease;
    z-index: 1;
  }
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
    border-color: ${({ theme }) => theme.borders.elegant};
    
    &::before {
      left: 100%;
    }
  }
  
  &.heart-card {
    background: linear-gradient(135deg, ${({ theme }) => theme.background.surface}E6, ${({ theme }) => theme.colors.primary}10);
    border: 1px solid ${({ theme }) => theme.colors.accent}40;
    
    &:hover {
      border-color: ${({ theme }) => theme.colors.accent};
      box-shadow: ${({ theme }) => theme.shadows.accent};
    }
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const IconContainer = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.colors.primary};
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  
  svg {
    filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.primary}80);
    transition: all 0.3s ease;
    width: 48px;
    height: 48px;
  }
  
  &.heart-icon {
    color: ${({ theme }) => theme.colors.accent};
    animation: ${pulse} 3s ease-in-out infinite;
    
    svg {
      filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.accent}80);
    }
  }
  
  ${ExpressionCard}:hover & {
    animation: ${stellarGlow} 2s ease-in-out infinite;
    
    svg {
      filter: drop-shadow(0 0 15px currentColor);
    }
  }
`;

const CardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.gradients.stellar};
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 600;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  
  &.heart-card-title {
    background: ${({ theme }) => theme.gradients.accent};
    background-clip: text;
    -webkit-background-clip: text;
  }
  
  ${ExpressionCard}:hover & {
    background-size: 200% 200%;
    animation: ${shimmer} 2s linear infinite;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CardDescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.6;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
  flex-grow: 1;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  width: 100%;
  position: relative;
  z-index: 2;
`;

const BenefitItem = styled.li`
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  color: ${({ theme }) => theme.text.muted};
  font-size: 1rem;
  line-height: 1.4;
  transition: color 0.3s ease;
  
  &::before {
    content: "✦";
    margin-right: 10px;
    color: ${({ theme }) => theme.colors.primary};
    transition: all 0.3s ease;
    line-height: 1.4;
  }
  
  ${ExpressionCard}:hover & {
    color: ${({ theme }) => theme.text.primary};
    
    &::before {
      animation: ${stellarGlow} 2s ease-in-out infinite;
    }
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
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
      stiffness: 100,
      damping: 12
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut"
    }
  }
};

// --- Component Implementation ---
const CreativeExpressionSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  const { theme } = useUniversalTheme();
  
  const expressionCategories = [
    {
      title: "Dance",
      icon: <Music />,
      description: "Unleash your power through rhythm. Express your warrior spirit through movement that connects your body to your soul.",
      benefits: [
        "Build explosive core strength and flexibility",
        "Master coordination and balance like a fighter",
        "Channel stress into pure energy and euphoria",
        "Unite with your tribe through powerful group sessions"
      ]
    },
    {
      title: "Art & Visual Expression",
      icon: <Paintbrush />,
      description: "Channel your intensity onto the canvas. Transform your inner fire into visual masterpieces that tell your transformation story.",
      benefits: [
        "Develop precision and control in every stroke",
        "Unlock creative problem-solving superpowers",
        "Transform emotions into powerful visual statements",
        "Create your personal victory gallery"
      ]
    },
    {
      title: "Vocal & Sound Work",
      icon: <Mic />,
      description: "Find the strength in your own voice. Unleash the power within through vocal techniques that amplify your inner warrior.",
      benefits: [
        "Build breathing power and explosive lung capacity",
        "Transform anxiety into vocal strength and confidence",
        "Command attention with unshakeable self-expression",
        "Connect with the primal power of sound and rhythm"
      ]
    },
    {
      title: "Community & Heart",
      icon: <Heart />,
      description: "Connect with a tribe that shares your fire. Plug into a global family that grinds together, grows together, and celebrates every single victory. No more training alone!",
      benefits: [
        "Feel the power of collective energy fueling your journey",
        "Unite with warriors who share your relentless drive",
        "Experience the adrenaline of being part of a movement",
        "Unleash your ultimate potential in a team that believes in greatness"
      ]
    }
  ];
  
  return (
    <SectionContainer id="creative-expression" ref={ref}>
      <GlowEffect />
      <ContentWrapper>
        <SectionTitle>FORGE YOUR BODY, FREE YOUR SPIRIT</SectionTitle>
        <SectionDescription
          variants={textVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          At SwanStudios, we build <span>warriors and artists</span>. True power is found when peak physical strength is united with unbridled creative expression. Here, we don't just lift weights; we lift each other. <strong>EVERY POSITIVE ACTION IS REWARDED</strong> - your journey is holistic. You earn points for everything: crushing a workout, creating art, motivating a teammate. In this ecosystem, your growth in body, mind, and spirit is our most valued currency.
        </SectionDescription>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <CardGrid>
            {expressionCategories.map((category, index) => (
              <ExpressionCard 
                key={index} 
                variants={itemVariants}
                className={`expression-card ${category.title.includes('Heart') ? 'heart-card' : ''}`}
              >
                <IconContainer className={category.title.includes('Heart') ? 'heart-icon' : ''}>
                  {category.icon}
                </IconContainer>
                <CardTitle className={category.title.includes('Heart') ? 'heart-card-title' : ''}>
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
                <BenefitsList>
                  {category.benefits.map((benefit, i) => (
                    <BenefitItem key={i}>{benefit}</BenefitItem>
                  ))}
                </BenefitsList>
              </ExpressionCard>
            ))}
          </CardGrid>
        </motion.div>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default CreativeExpressionSection;