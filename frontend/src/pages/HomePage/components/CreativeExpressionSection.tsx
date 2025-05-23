// frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx

import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useInView } from "framer-motion";
import { FaDumbbell, FaPaintBrush, FaMicrophone, FaHeart } from "react-icons/fa";
import SectionTitle from "../../../components/ui/SectionTitle"; // Adjust if needed

// --- Animation Keyframes ---
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.4); }
`;

// --- Styled Components ---
const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(to bottom, #0f0f1a, #1a1a2e);
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const GlowEffect = styled.div`
  position: absolute;
  width: 70vh;
  height: 70vh;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.07) 0%, rgba(120, 81, 169, 0.05) 50%, transparent 70%);
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(60px);
  z-index: 0;
  opacity: 0.8;
  pointer-events: none;
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
  color: rgba(255, 255, 255, 0.9);
  max-width: 800px;
  line-height: 1.6;
  
  span {
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8)
    );
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
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto auto;
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  
  // The Community & Heart card will span the full width
  & > div:nth-child(4) {
    grid-column: 1 / -1;
  }
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    
    & > div:nth-child(4) {
      grid-column: auto;
    }
  }
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;

const ExpressionCard = styled(motion.div)`
  background: rgba(20, 20, 40, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
`;

const IconContainer = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: var(--neon-blue, #00ffff);
  
  svg {
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5));
  }
`;

const CardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 600;
`;

const CardDescription = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  text-align: left;
  width: 100%;
`;

const BenefitItem = styled.li`
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  
  &::before {
    content: "✦";
    margin-right: 10px;
    color: var(--neon-blue, #00ffff);
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
  
  const expressionCategories = [
    {
      title: "Dance",
      icon: <FaDumbbell />,
      description: "Express yourself through movement and rhythm with our specialized dance training programs.",
      benefits: [
        "Build core strength and flexibility",
        "Improve coordination and balance",
        "Reduce stress and boost mood",
        "Connect with others through group sessions"
      ]
    },
    {
      title: "Art & Visual Expression",
      icon: <FaPaintBrush />,
      description: "Explore your creative side with guidance from experts in various visual art techniques.",
      benefits: [
        "Develop fine motor skills",
        "Enhance problem-solving abilities",
        "Express emotions in a healthy way",
        "Create personalized visual journals"
      ]
    },
    {
      title: "Vocal & Sound Work",
      icon: <FaMicrophone />,
      description: "Find your voice through singing and vocal techniques that connect mind, body, and spirit.",
      benefits: [
        "Improve breathing and lung capacity",
        "Reduce anxiety through vocal release",
        "Build confidence in self-expression",
        "Connect with ancestral singing traditions"
      ]
    },
    {
      title: "Community & Heart",
      icon: <FaHeart />,
      description: "Be part of a family that truly cares. Here, we lift each other up with love, trust, and a shared commitment to righteousness in all we do.",
      benefits: [
        "Find strength in genuine friendship and acceptance",
        "Grow together with others who share your values",
        "Experience the joy of being part of something meaningful",
        "Discover your best self in a team that believes in you"
      ]
    }
  ];
  
  return (
    <SectionContainer id="creative-expression" ref={ref}>
      <GlowEffect />
      <ContentWrapper>
        <SectionTitle>Creative Expression & Community</SectionTitle>
        <SectionDescription
          variants={textVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          At SwanStudios, while our <span>elite performance training</span> remains our foundation, we believe true wellness emerges when physical fitness is complemented by <span>creative expression</span> and <span>community connection</span>. Together, we strengthen both body and spirit.
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