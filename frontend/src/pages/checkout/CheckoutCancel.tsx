// /frontend/src/pages/checkout/CheckoutCancel.tsx

import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../components/Button/glowButton";

// Import assets
import logoImg from "../../assets/Logo.png";

// Styled Components
const CancelContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  padding: 2rem;
  text-align: center;
  color: white;
`;

const Logo = styled.img`
  height: 120px;
  margin-bottom: 3rem;
  opacity: 0.7;
`;

const CancelCard = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2.5rem;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const CancelIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: #ff6b6b;
`;

const CancelTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: white;
`;

const CancelMessage = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
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

  const handleReturnToStore = (): void => {
    navigate('/store');
  };
  
  const handleGoHome = (): void => {
    navigate('/');
  };

  return (
    <CancelContainer>
      <Logo src={logoImg} alt="Swan Studios" />
      
      <CancelCard>
        <CancelIcon>×</CancelIcon>
        <CancelTitle>Checkout Cancelled</CancelTitle>
        <CancelMessage>
          Your checkout process was cancelled, and no payment has been processed.
          If you encountered any issues, please feel free to contact our support team.
        </CancelMessage>
        
        <ButtonsContainer>
          <GlowButton 
            text="Return to Store" 
            theme="cosmic"
            size="medium"
            onClick={handleReturnToStore}
          />
          <GlowButton 
            text="Go to Home" 
            theme="purple"
            size="medium"
            onClick={handleGoHome}
          />
        </ButtonsContainer>
      </CancelCard>
    </CancelContainer>
  );
};

export default CheckoutCancel;