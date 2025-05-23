import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

// Create keyframe animations
const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8); }
  100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
`;

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

// Styled components
const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  padding: 2rem;
  text-align: center;
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  margin-bottom: 2rem;
  animation: ${pulse} 3s infinite ease-in-out;
`;

const LogoImage = styled.img`
  max-width: 200px;
  height: auto;
  filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.6));
`;

const SuccessCircle = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  border-radius: 50%;
  border: 3px solid #00ffff;
  animation: ${glow} 2s infinite ease-in-out;
`;

const SuccessTitle = styled(motion.h1)`
  font-size: 2.5rem;
  margin: 1rem 0;
  font-weight: 700;
  background: linear-gradient(90deg, #00ffff, #0099ff, #00ffff);
  background-size: 200% auto;
  color: #fff;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 3s linear infinite;
`;

const Message = styled(motion.p)`
  font-size: 1.2rem;
  margin: 1rem 0 2rem;
  max-width: 600px;
  line-height: 1.6;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 0.5s;
  opacity: 0;
`;

const ConfirmationBox = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 1.5rem;
  margin: 2rem 0;
  border: 1px solid rgba(0, 255, 255, 0.3);
  width: 100%;
  max-width: 500px;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 0.8s;
  opacity: 0;
`;

const ConfirmationItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 0.8rem 0;
  font-size: 1rem;
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.8rem;
  }
`;

const ButtonContainer = styled(motion.div)`
  margin-top: 2rem;
  animation: ${fadeIn} 1s ease-out forwards;
  animation-delay: 1.2s;
  opacity: 0;
`;

const StyledButton = styled.button`
  background: linear-gradient(90deg, #0099ff, #00ffff);
  color: white;
  font-weight: bold;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
  }
`;

// Confetti elements
const ConfettiContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
  overflow: hidden;
`;

const Confetti = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: ${props => props.color};
  opacity: 0.8;
  border-radius: ${props => props.type === 'circle' ? '50%' : '0'};
  animation: fall ${props => props.duration}s linear forwards;
  
  @keyframes fall {
    0% {
      transform: translateY(-100vh) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }
`;

// Main component
const CheckoutSuccessAnimation = () => {
  const [confetti, setConfetti] = useState([]);
  const [orderDetails, setOrderDetails] = useState({
    orderNumber: `SS-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toLocaleDateString(),
    status: 'Confirmed'
  });
  
  // Generate confetti
  useEffect(() => {
    const colors = ['#00ffff', '#0099ff', '#ffffff', '#ff9900', '#ff00ff'];
    const types = ['circle', 'square'];
    const newConfetti = [];
    
    for (let i = 0; i < 100; i++) {
      newConfetti.push({
        id: i,
        x: Math.random() * 100, // % position
        color: colors[Math.floor(Math.random() * colors.length)],
        type: types[Math.floor(Math.random() * types.length)],
        size: Math.random() * 10 + 5,
        duration: Math.random() * 3 + 2
      });
    }
    
    setConfetti(newConfetti);
    
    // Clean up confetti after animation
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const goToHome = () => {
    window.location.href = '/';
  };

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const circleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.8,
        delay: 0.3,
        ease: "easeOut"
      }
    }
  };

  const titleVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.5,
        delay: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <SuccessContainer>
      {/* Confetti effect */}
      <ConfettiContainer>
        {confetti.map((item) => (
          <Confetti
            key={item.id}
            style={{ left: `${item.x}%`, width: `${item.size}px`, height: `${item.size}px` }}
            color={item.color}
            type={item.type}
            duration={item.duration}
          />
        ))}
      </ConfettiContainer>
      
      {/* Logo with success animation */}
      <LogoContainer
        variants={logoVariants}
        initial="initial"
        animate="animate"
      >
        <LogoImage src="/src/assets/Logo.png" alt="Swan Studios Logo" />
        <SuccessCircle 
          variants={circleVariants}
          initial="initial"
          animate="animate"
        />
      </LogoContainer>
      
      {/* Success message */}
      <SuccessTitle
        variants={titleVariants}
        initial="initial"
        animate="animate"
      >
        Thank You for Your Purchase!
      </SuccessTitle>
      
      <Message>
        Your training package has been successfully purchased. 
        We're excited to begin this fitness journey with you!
      </Message>
      
      {/* Order confirmation details */}
      <ConfirmationBox>
        <h3>Order Confirmation</h3>
        <ConfirmationItem>
          <span>Order Number:</span>
          <span>{orderDetails.orderNumber}</span>
        </ConfirmationItem>
        <ConfirmationItem>
          <span>Date:</span>
          <span>{orderDetails.date}</span>
        </ConfirmationItem>
        <ConfirmationItem>
          <span>Status:</span>
          <span>{orderDetails.status}</span>
        </ConfirmationItem>
      </ConfirmationBox>
      
      {/* Navigation buttons */}
      <ButtonContainer>
        <StyledButton onClick={goToHome}>
          Return to Home
        </StyledButton>
      </ButtonContainer>
    </SuccessContainer>
  );
};

export default CheckoutSuccessAnimation;