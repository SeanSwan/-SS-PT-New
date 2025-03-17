// src/pages/homepage/components/FitnessStats/FitnessStats.jsx
import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { motion, useInView, useAnimation } from "framer-motion";
import { FaDumbbell, FaTrophy, FaUsers, FaWeight, FaHeartbeat, FaClock } from "react-icons/fa";

// Import assets
import logoImg from "../../assets/Logo.png";

// Styled Components
const StatsSection = styled.section`
  position: relative;
  padding: 5rem 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
  overflow: hidden;
`;

const ParallaxLogo = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  opacity: 0.04;
  z-index: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const BackgroundLines = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  
  &::before, &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(0, 255, 255, 0.1) 15%, 
      rgba(120, 81, 169, 0.1) 50%,
      rgba(0, 255, 255, 0.1) 85%,
      transparent 100%
    );
  }
  
  &::before {
    top: 25%;
  }
  
  &::after {
    bottom: 25%;
  }
`;

const VerticalLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  
  &::before, &::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, 
      transparent 0%, 
      rgba(0, 255, 255, 0.1) 15%, 
      rgba(120, 81, 169, 0.1) 50%,
      rgba(0, 255, 255, 0.1) 85%,
      transparent 100%
    );
  }
  
  &::before {
    left: 25%;
  }
  
  &::after {
    right: 25%;
  }
`;

const ContentContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 4rem;

  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    border-radius: 3px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(25, 25, 35, 0.7);
  border-radius: 15px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  position: relative;
  z-index: 1;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(0, 255, 255, 0.1) 0%, 
      rgba(25, 25, 35, 0) 60%
    );
    border-radius: 15px;
    z-index: -1;
  }
`;

const StatIconWrapper = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: var(--neon-blue, #00ffff);
  font-size: 2rem;
  position: relative;
  
  &::after {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid rgba(0, 255, 255, 0.2);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const StatNumber = styled(motion.div)`
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  line-height: 1;
  position: relative;
  
  span {
    font-size: 0.6em;
    color: var(--neon-blue, #00ffff);
    font-weight: 400;
  }
`;

const StatLabel = styled.div`
  font-size: 1.1rem;
  color: #c0c0c0;
  margin-bottom: 0.5rem;
`;

const StatDescription = styled.p`
  font-size: 0.9rem;
  color: #808080;
  line-height: 1.5;
`;

const DetailSection = styled(motion.div)`
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DetailHeading = styled.h3`
  font-size: 1.8rem;
  color: white;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
`;

const DetailIcon = styled.div`
  color: var(--royal-purple, #7851a9);
  font-size: 1.5rem;
  margin-right: 1rem;
`;

const DetailContent = styled.div`
  flex: 1;
`;

const DetailTitle = styled.h4`
  font-size: 1.1rem;
  color: white;
  margin-bottom: 0.5rem;
`;

const DetailText = styled.p`
  font-size: 0.9rem;
  color: #c0c0c0;
  line-height: 1.5;
`;

// Animation variants
const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 } 
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({ 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      delay: 0.1 * index
    } 
  })
};

const numberVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5,
      delay: 0.2
    } 
  }
};

const detailSectionVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1
    } 
  }
};

const detailItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5 } 
  }
};

// Sample statistics data
const statsData = [
  {
    icon: <FaUsers />,
    number: 10000,
    unit: "+",
    label: "Clients Trained",
    description: "Individuals who have transformed their bodies and lives through our programs."
  },
  {
    icon: <FaWeight />,
    number: 180000,
    unit: "lbs",
    label: "Weight Lost",
    description: "Total weight lost by our clients through our structured training and nutrition programs."
  },
  {
    icon: <FaDumbbell />,
    number: 25,
    unit: "+",
    label: "Years Experience",
    description: "Combined experience of our elite coaching team in personal training and performance enhancement."
  },
  {
    icon: <FaTrophy />,
    number: 120,
    unit: "+",
    label: "Competition Wins",
    description: "Clients who have achieved podium finishes in various athletic competitions."
  },
  {
    icon: <FaHeartbeat />,
    number: 98,
    unit: "%",
    label: "Success Rate",
    description: "Clients who reached or exceeded their primary fitness goals when following our programs."
  },
  {
    icon: <FaClock />,
    number: 50000,
    unit: "+",
    label: "Training Hours",
    description: "Hours spent coaching and guiding clients to their fitness goals."
  }
];

const methodologyDetails = [
  {
    icon: <FaDumbbell />,
    title: "Progressive Overload",
    text: "Our programs apply systematic increases in volume, intensity, frequency or time to continually challenge your body and trigger adaptation."
  },
  {
    icon: <FaUsers />,
    title: "Individualized Approach",
    text: "No cookie-cutter programs. We analyze your movement patterns, body composition, and goals to create truly personalized training plans."
  },
  {
    icon: <FaHeartbeat />,
    title: "Recovery Optimization",
    text: "We emphasize proper recovery techniques including sleep optimization, stress management, and strategic nutritional protocols."
  }
];

// Counter animation hook
const useCounter = (end, duration = 2) => {
  const nodeRef = useRef(null);
  const controls = useAnimation();
  const isInView = useInView(nodeRef, { once: true, amount: 0.5 });
  
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const value = Math.floor(progress * end);
      
      if (nodeRef.current) {
        nodeRef.current.textContent = value.toLocaleString();
      }
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (nodeRef.current) {
          nodeRef.current.textContent = end.toLocaleString();
        }
      }
    };
    
    if (isInView) {
      window.requestAnimationFrame(step);
    }
    
    return () => {
      // Cleanup function
    };
  }, [end, duration, isInView]);
  
  return { ref: nodeRef, controls, isInView };
};

// FitnessStats component
const FitnessStats = () => {
  const controls = useAnimation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);
  
  return (
    <StatsSection id="stats" ref={sectionRef}>
      <BackgroundLines 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <VerticalLines />
      </BackgroundLines>
      
      <ParallaxLogo
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.04, scale: 1 }}
        transition={{ duration: 1.5 }}
      >
        <img src={logoImg} alt="SwanStudios Logo Background" />
      </ParallaxLogo>
      
      <ContentContainer>
        <SectionTitle
          variants={titleVariants}
          initial="hidden"
          animate={controls}
        >
          Our Impact in Numbers
        </SectionTitle>
        
        <StatsGrid>
          {statsData.map((stat, index) => {
            const { ref, isInView } = useCounter(stat.number);
            
            return (
              <StatCard 
                key={index}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate={controls}
              >
                <StatIconWrapper>{stat.icon}</StatIconWrapper>
                <StatNumber
                  variants={numberVariants}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                >
                  <span ref={ref}>0</span>
                  <span>{stat.unit}</span>
                </StatNumber>
                <StatLabel>{stat.label}</StatLabel>
                <StatDescription>{stat.description}</StatDescription>
              </StatCard>
            );
          })}
        </StatsGrid>
        
        <DetailSection
          variants={detailSectionVariants}
          initial="hidden"
          animate={controls}
        >
          <DetailHeading>Our Methodology</DetailHeading>
          <DetailGrid>
            {methodologyDetails.map((detail, index) => (
              <DetailItem 
                key={index}
                variants={detailItemVariants}
              >
                <DetailIcon>{detail.icon}</DetailIcon>
                <DetailContent>
                  <DetailTitle>{detail.title}</DetailTitle>
                  <DetailText>{detail.text}</DetailText>
                </DetailContent>
              </DetailItem>
            ))}
          </DetailGrid>
        </DetailSection>
      </ContentContainer>
    </StatsSection>
  );
};

export default FitnessStats;