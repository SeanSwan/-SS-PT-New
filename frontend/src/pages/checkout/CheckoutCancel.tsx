// /frontend/src/pages/checkout/CheckoutCancel.tsx

import React from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../components/Button/glowButton";

// Import assets
import logoImg from "../../assets/Logo.png";

// Animations
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

// Styled Components
const CancelContainer = styled.div`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  padding: 2rem;
  text-align: center;
  color: white;
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  margin-bottom: 2rem;
  
  img {
    height: 140px;
    max-width: 100%;
    object-fit: contain;
  }
`;

const CancelCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2.5rem;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 5s linear infinite;
    z-index: 0;
  }
`;

const CancelContent = styled.div`
  position: relative;
  z-index: 1;
`;

const CancelIcon = styled.div`
  font-size: 4rem;
  color: #ff6b6b;
  margin-bottom: 1.5rem;
`;

const CancelTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const CancelMessage = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
`;

const SupportMessage = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  
  strong {
    color: #00ffff;
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CancelContainer>
      <LogoContainer
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <img src={logoImg} alt="Swan Studios" />
      </LogoContainer>
      
      <CancelCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <CancelContent>
          <CancelIcon>⊗</CancelIcon>
          <CancelTitle>Checkout Cancelled</CancelTitle>
          <CancelMessage>
            Your payment process was cancelled, and no charges have been made to your account.
            Your cart items are still saved if you'd like to complete your purchase later.
          </CancelMessage>
          
          <SupportMessage>
            <strong>Need help with your purchase?</strong><br/>
            Our team is available to assist you with any questions about our training packages
            or payment options. Feel free to contact us anytime.
          </SupportMessage>
          
          <ButtonsContainer>
            <GlowButton 
              text="Return to Cart" 
              theme="cosmic"
              size="medium"
              onClick={() => navigate('/store')}
            />
            <GlowButton 
              text="Contact Support" 
              theme="purple"
              size="medium"
              onClick={() => navigate('/contact')}
            />
          </ButtonsContainer>
        </CancelContent>
      </CancelCard>
    </CancelContainer>
  );
};

export default CheckoutCancel;