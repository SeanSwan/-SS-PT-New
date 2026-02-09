import React from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import GlowButton from "../../../components/ui/buttons/GlowButton";
import logoImg from "../../../assets/Logo.png";

// --- Animations ---
const nebulaPulse = keyframes`
  0% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 0.4; transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// --- Styled Components ---
const HeroContainer = styled.section`
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #050510;
  padding: 0 2rem;

  /* Mobile height adjustment */
  @media (max-width: 768px) {
    padding: 0 1rem;
    min-height: 90vh;
  }
`;

const BackgroundLayer = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
  background: 
    radial-gradient(circle at 15% 50%, rgba(76, 29, 149, 0.15), transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(0, 255, 255, 0.1), transparent 25%);
`;

const Nebula = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120vw;
  height: 120vh;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(120, 81, 169, 0.2) 0%, transparent 60%);
  filter: blur(80px);
  animation: ${nebulaPulse} 8s ease-in-out infinite;
  z-index: 0;
  pointer-events: none;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 10;
  max-width: 1000px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
`;

const Logo = styled(motion.img)`
  height: 130px;
  width: auto;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 25px rgba(0, 255, 255, 0.25));
  animation: ${float} 6s ease-in-out infinite;

  @media (max-width: 768px) {
    height: 90px;
  }
`;

const Badge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  backdrop-filter: blur(10px);
  color: #00ffff;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
  animation: ${float} 6s ease-in-out infinite;
`;

const Title = styled(motion.h1)`
  font-size: 5rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -2px;
  color: white;
  margin: 0;
  
  span {
    background: linear-gradient(135deg, #fff 0%, #a5f3fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 1024px) { font-size: 4rem; }
  @media (max-width: 768px) { font-size: 3rem; }
  @media (max-width: 480px) { font-size: 2.5rem; }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 700px;
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) { font-size: 1.1rem; }
  @media (max-width: 480px) { font-size: 1rem; }
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  
  @media (max-width: 600px) {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
    
    /* Force buttons to full width on mobile */
    & > div, & > button { width: 100% !important; }
  }
`;

const HeroSectionV2: React.FC = () => {
  const navigate = useNavigate();

  return (
    <HeroContainer>
      <BackgroundLayer />
      <Nebula />
      
      <ContentWrapper>
        <Logo 
          src={logoImg} 
          alt="SwanStudios" 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        />

        <Badge initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Star size={14} fill="currentColor" />
          Elite Personal Training
        </Badge>

        <Title initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
          Forge Your Body,<br /><span>Free Your Spirit</span>
        </Title>

        <Subtitle initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
          Experience the world's first Fitness Social Ecosystem. Expert coaching, AI-powered tracking, and a community that fuels your transformation.
        </Subtitle>

        <ButtonGroup initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}>
          <GlowButton text="View Packages in Store" theme="cosmic" size="large" rightIcon={<ArrowRight />} onClick={() => navigate('/shop')} animateOnRender />
          <GlowButton text="Book Free Movement Screen" theme="primary" size="large" onClick={() => navigate('/contact')} animateOnRender />
        </ButtonGroup>
      </ContentWrapper>
    </HeroContainer>
  );
};

export default HeroSectionV2;