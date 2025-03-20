// /frontend/src/pages/checkout/CheckoutSuccess.tsx

import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
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
const SuccessContainer = styled.div`
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

const SuccessCard = styled(motion.div)`
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
      rgba(0, 255, 255, 0.05) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 5s linear infinite;
    z-index: 0;
  }
`;

const SuccessContent = styled.div`
  position: relative;
  z-index: 1;
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  color: #00ffff;
  margin-bottom: 1.5rem;
`;

const SuccessTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const SuccessMessage = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
`;

const OrderDetail = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.9);
  }
  
  p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0.5rem 0;
  }
  
  .highlight {
    color: #00ffff;
    font-weight: 500;
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

const LoadingSpinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 3px solid #00ffff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CheckoutSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Extract session_id from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  
  useEffect(() => {
    const completeCheckout = async (): Promise<void> => {
      if (!sessionId || !token) {
        setLoading(false);
        setError('Invalid checkout session');
        return;
      }
      
      try {
        // Call backend API to mark order as complete
        await axios.post('/api/cart/checkout/success', 
          { session_id: sessionId },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error completing checkout:', err);
        setLoading(false);
        setError('Failed to complete your order. Please contact support.');
      }
    };
    
    completeCheckout();
  }, [sessionId, token]);

  const handleReturnToStore = (): void => {
    navigate('/store');
  };
  
  const handleViewDashboard = (): void => {
    navigate('/client-dashboard');
  };

  return (
    <SuccessContainer>
      <LogoContainer
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <img src={logoImg} alt="Swan Studios" />
      </LogoContainer>
      
      <SuccessCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <SuccessContent>
            <SuccessIcon>❌</SuccessIcon>
            <SuccessTitle>Something went wrong</SuccessTitle>
            <SuccessMessage>{error}</SuccessMessage>
            <ButtonsContainer>
              <GlowButton 
                text="Return to Store" 
                theme="cosmic"
                size="medium"
                onClick={handleReturnToStore}
              />
              <GlowButton 
                text="Contact Support" 
                theme="purple"
                size="medium"
                onClick={() => navigate('/contact')}
              />
            </ButtonsContainer>
          </SuccessContent>
        ) : (
          <SuccessContent>
            <SuccessIcon>✓</SuccessIcon>
            <SuccessTitle>Payment Successful!</SuccessTitle>
            <SuccessMessage>
              Thank you for your purchase. Your training package is now ready to use.
              You can schedule your sessions through your dashboard.
            </SuccessMessage>
            
            <OrderDetail>
              <h3>Order Summary</h3>
              <p>Order ID: <span className="highlight">{sessionId?.substring(0, 8)}...</span></p>
              <p>Status: <span className="highlight">Completed</span></p>
              <p>Customer: <span className="highlight">{user?.username || "Valued Client"}</span></p>
            </OrderDetail>
            
            <ButtonsContainer>
              <GlowButton 
                text="Return to Store" 
                theme="cosmic"
                size="medium"
                onClick={handleReturnToStore}
              />
              <GlowButton 
                text="Go to Dashboard" 
                theme="emerald"
                size="medium"
                onClick={handleViewDashboard}
              />
            </ButtonsContainer>
          </SuccessContent>
        )}
      </SuccessCard>
    </SuccessContainer>
  );
};

export default CheckoutSuccess;