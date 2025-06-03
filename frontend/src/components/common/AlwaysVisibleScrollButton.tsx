// DEBUG: Always visible scroll button for testing
import React from 'react';
import styled from 'styled-components';
import { FaArrowUp } from 'react-icons/fa';

const DebugScrollButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 999999 !important;
  width: 60px !important;
  height: 60px !important;
  border: 3px solid #00ffff !important;
  border-radius: 50%;
  background: linear-gradient(45deg, #00ffff, #ff006e) !important;
  color: white !important;
  cursor: pointer;
  display: flex !important;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.8) !important;
  transition: all 0.3s ease;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  
  &:hover {
    transform: scale(1.2) !important;
    box-shadow: 0 6px 30px rgba(0, 255, 255, 1) !important;
  }
  
  &:before {
    content: "DEBUG";
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: #ff006e;
    font-weight: bold;
  }
`;

const DebugIcon = styled(FaArrowUp)`
  font-size: 24px !important;
  animation: bounce 1s infinite;
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
`;

const AlwaysVisibleScrollButton = () => {
  const scrollToTop = () => {
    console.log('🚀🚀🚀 DEBUG SCROLL BUTTON CLICKED! 🚀🚀🚀');
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  console.log('🔥🔥🔥 DEBUG: AlwaysVisibleScrollButton is rendering! 🔥🔥🔥');

  return (
    <DebugScrollButton 
      onClick={scrollToTop}
      aria-label="Debug Scroll to top"
      title="DEBUG: Scroll to top - Always visible"
    >
      <DebugIcon />
    </DebugScrollButton>
  );
};

export default AlwaysVisibleScrollButton;