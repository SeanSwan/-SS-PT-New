// /frontend/src/pages/checkout/CheckoutSuccess.tsx - FIXED VERSION

import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
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

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 15px rgba(0, 255, 255, 0.5); }
  50% { transform: scale(1.05); box-shadow: 0 0 25px rgba(0, 255, 255, 0.8); }
  100% { transform: scale(1); box-shadow: 0 0 15px rgba(0, 255, 255, 0.5); }
`;

// Confetti animation
const fallAnimation = keyframes`
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
`;

// TypeScript interfaces for styled-components props
interface ConfettiProps {
  left: number;
  color: string;
  type: string;
  size: number;
  duration: number;
}

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
  overflow: hidden; /* For confetti */
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

const SuccessIcon = styled(motion.div)`
  font-size: 4rem;
  color: #00ffff;
  margin-bottom: 1.5rem;
  animation: ${pulse} 2s infinite ease-in-out;
  display: inline-block;
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

// Countdown timer
const CountdownContainer = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

// Confetti - with proper TypeScript prop interface
const Confetti = styled.div<ConfettiProps>`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  background-color: ${props => props.color};
  top: -20px;
  left: ${props => props.left}%;
  opacity: 0.8;
  border-radius: ${props => props.type === 'circle' ? '50%' : '0'};
  animation: ${fallAnimation} ${props => props.duration}s linear forwards;
  z-index: 0;
`;

// Enhanced PackageInfo component
const PackageInfo = styled(motion.div)`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: left;
`;

const PackageTitle = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #00ffff;
`;

const PackageDetail = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
  font-size: 0.9rem;
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }
`;

// Confetti item interface
interface ConfettiItem {
  id: number;
  left: number;
  color: string;
  type: string;
  size: number;
  duration: number;
}

// Order info interface
interface OrderInfo {
  packageName?: string;
  totalSessions?: number;
  validity?: string;
  [key: string]: any;
}

const CheckoutSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(15); // 15 second countdown
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);
  
  // Extract session_id from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  
  // Generate confetti
  useEffect(() => {
    if (!loading && !error) {
      const colors = ['#00ffff', '#0099ff', '#ffffff', '#ff9900', '#ff00ff'];
      const types = ['circle', 'square'];
      const newConfetti: ConfettiItem[] = [];
      
      for (let i = 0; i < 100; i++) {
        newConfetti.push({
          id: i,
          left: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: types[Math.floor(Math.random() * types.length)],
          size: Math.random() * 10 + 5,
          duration: Math.random() * 5 + 3
        });
      }
      
      setConfetti(newConfetti);
    }
  }, [loading, error]);
  
  // Countdown timer
  useEffect(() => {
    if (!loading && !error && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Auto redirect when countdown reaches zero
      navigate('/client-dashboard');
    }
  }, [countdown, loading, error, navigate]);
  
  useEffect(() => {
    const completeCheckout = async (): Promise<void> => {
      if (!sessionId || !token) {
        setLoading(false);
        setError('Invalid checkout session');
        return;
      }
      
      try {
        // Call backend API to mark order as complete
        const response = await axios.post('/api/cart/checkout/success', 
          { session_id: sessionId },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Save order info
        if (response.data && response.data.orderDetails) {
          setOrderInfo(response.data.orderDetails);
          // Also save to localStorage for future reference
          localStorage.setItem('lastOrder', JSON.stringify({
            id: sessionId,
            date: new Date().toISOString(),
            details: response.data.orderDetails
          }));
        }
        
        setLoading(false);
        
        // Try to play success sound if available
        try {
          const audio = new Audio('/src/assets/success-sound.mp3');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Audio play prevented: ', e));
        } catch (audioErr) {
          console.log('Audio not available or autoplay prevented');
        }
        
      } catch (err: any) {
        console.error('Error completing checkout:', err);
        setLoading(false);
        setError('Failed to complete your order. Please contact support.');
      }
    };
    
    completeCheckout();
  }, [sessionId, token, navigate]);

  const handleReturnToStore = (): void => {
    navigate('/store');
  };
  
  const handleViewDashboard = (): void => {
    navigate('/client-dashboard');
  };
  
  // Animation variants
  const iconVariants = {
    initial: { scale: 0 },
    animate: { 
      scale: [0, 1.2, 1],
      transition: { duration: 0.5, times: [0, 0.6, 1] }
    }
  };
  
  const packageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.5, duration: 0.5 }
    }
  };

  return (
    <SuccessContainer>
      {/* Confetti effect for success */}
      {!loading && !error && confetti.map((item) => (
        <Confetti
          key={item.id}
          left={item.left}
          color={item.color}
          type={item.type}
          size={item.size}
          duration={item.duration}
        />
      ))}
      
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
        <AnimatePresence>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <SuccessContent>
              <SuccessIcon
                variants={iconVariants}
                initial="initial"
                animate="animate"
              >❌</SuccessIcon>
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
              <SuccessIcon
                variants={iconVariants}
                initial="initial"
                animate="animate"
              >✓</SuccessIcon>
              <SuccessTitle>Payment Successful!</SuccessTitle>
              <SuccessMessage>
                Thank you for your purchase. Your training package is now ready to use.
                You can schedule your sessions through your dashboard.
              </SuccessMessage>
              
              <OrderDetail>
                <h3>Order Summary</h3>
                <p>Order ID: <span className="highlight">{sessionId?.substring(0, 8)}...</span></p>
                <p>Date: <span className="highlight">{new Date().toLocaleDateString()}</span></p>
                <p>Status: <span className="highlight">Completed</span></p>
                <p>Customer: <span className="highlight">{user?.username || "Valued Client"}</span></p>
              </OrderDetail>
              
              {/* Enhanced package information - will show if orderInfo is available */}
              {orderInfo && (
                <PackageInfo
                  variants={packageVariants}
                  initial="initial"
                  animate="animate"
                >
                  <PackageTitle>Your Training Package</PackageTitle>
                  <PackageDetail>
                    <span>Package:</span>
                    <span>{orderInfo.packageName}</span>
                  </PackageDetail>
                  {orderInfo.totalSessions && (
                    <PackageDetail>
                      <span>Sessions:</span>
                      <span>{orderInfo.totalSessions}</span>
                    </PackageDetail>
                  )}
                  {orderInfo.validity && (
                    <PackageDetail>
                      <span>Valid Until:</span>
                      <span>{orderInfo.validity}</span>
                    </PackageDetail>
                  )}
                </PackageInfo>
              )}
              
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
              
              {/* Countdown timer */}
              <CountdownContainer>
                Redirecting to your dashboard in {countdown} seconds...
              </CountdownContainer>
            </SuccessContent>
          )}
        </AnimatePresence>
      </SuccessCard>
    </SuccessContainer>
  );
};

export default CheckoutSuccess;