import React, { useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import Header from "../../components/Header/header";
import ContactForm from "./ContactForm";
import AdditionalInfo from "./AdditionalInfo";

// Import asset for background video - update path if needed
import securityVideo from "../../assets/swan.mp4"; 

/*
  🌟 Premium Contact Page
  ---------------------
  - Features **sophisticated animations** and **luxury visual effects**
  - Implements **glass-morphism** for an ultra-premium feel
  - Includes **animated decorative elements** for visual richness
  - Enhanced with **premium typography** and visual hierarchy
  - Delivers a **cohesive premium aesthetic** matching other components
*/

// ======================= 🎨 Animation Keyframes =======================
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// ======================= 🎨 Styled Components =======================

// Main wrapper with consistent styling
const ContactPageWrapper = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  color: #ffffff;
  font-family: "Arial", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
`;

// Premium video background with improved styling
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  padding: 0;
  z-index: 0;
  opacity: 0.6; /* Slightly increased opacity for luxury feel */
`;

// Enhanced overlay with luxury gradient animation
const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    45deg,
    rgba(10, 10, 26, 0.85),
    rgba(30, 30, 63, 0.85)
  );
  z-index: 1;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.15),
      rgba(120, 81, 169, 0.15),
      rgba(0, 255, 255, 0.15)
    );
    background-size: 200% 200%;
    animation: ${gradientShift} 15s ease infinite;
    z-index: -1;
  }
`;

// Premium decorative orb elements
const TopLeftOrb = styled.div`
  position: fixed;
  top: 10%;
  left: 5%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 2;
  pointer-events: none;
  animation: ${float} 15s infinite ease-in-out;
`;

const BottomRightOrb = styled.div`
  position: fixed;
  bottom: 15%;
  right: 8%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: rgba(120, 81, 169, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 2;
  pointer-events: none;
  animation: ${float} 18s infinite ease-in-out reverse;
`;

// Luxury main content container with glass morphism effect
const MainContent = styled(motion.main)`
  position: relative;
  z-index: 3;
  max-width: 900px;
  width: 90%;
  margin: 7rem auto 3rem;
  padding: 3rem;
  border-radius: 20px;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: ${pulseGlow} 8s infinite ease-in-out;
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    z-index: -1;
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    margin-top: 5rem;
  }
`;

// Premium title styling
const PageTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  text-align: center;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
  position: relative;
  display: inline-block;
  width: 100%;
  
  /* Luxury gradient text effect */
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff,
    #a9f8fb
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  
  /* Premium underline */
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8),
      rgba(0, 255, 255, 0)
    );
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

// Enhanced subtitle
const SubHeading = styled(motion.h3)`
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 2rem;
  text-align: center;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Premium message container
const MessageContainer = styled(motion.div)`
  margin-bottom: 3rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(10, 10, 30, 0.4);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
`;

// Luxury message styling
const MaintenanceMessage = styled(motion.p)`
  font-size: 1.2rem;
  text-align: center;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
  
  span {
    color: #00ffff;
    font-weight: 400;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

// ======================= 🚀 Enhanced Contact Page Component =======================

const ContactPage = () => {
  // Refs for animation triggers
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const messageRef = useRef(null);
  
  // Animation controls
  const controls = useAnimation();
  const titleControls = useAnimation();
  const messageControls = useAnimation();
  
  // In-view detection
  const isContentInView = useInView(contentRef, { once: true, amount: 0.2 });
  const isTitleInView = useInView(titleRef, { once: true });
  const isMessageInView = useInView(messageRef, { once: true });
  
  // Start animations when elements come into view
  useEffect(() => {
    if (isContentInView) {
      controls.start("visible");
    }
    
    if (isTitleInView) {
      titleControls.start("visible");
    }
    
    if (isMessageInView) {
      messageControls.start("visible");
    }
  }, [isContentInView, isTitleInView, isMessageInView, controls, titleControls, messageControls]);
  
  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delayChildren: 0.2,
        staggerChildren: 0.2
      }
    }
  };
  
  const titleVariants = {
    hidden: { 
      opacity: 0,
      y: -20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  
  const messageVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  
  const formVariants = {
    hidden: { 
      opacity: 0 
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.4,
        duration: 0.8
      }
    }
  };

  return (
    <ContactPageWrapper>
      {/* Premium Video Background */}
      <VideoBackground 
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto"
      >
        <source src={securityVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Enhanced Overlay */}
      <Overlay />
      
      {/* Premium Decorative Elements */}
      <TopLeftOrb />
      <BottomRightOrb />

      {/* Site Header */}
      <Header />
      
      {/* Main Content with Glass Morphism */}
      <MainContent
        ref={contentRef}
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        {/* Premium Title */}
        <PageTitle
          ref={titleRef}
          initial="hidden"
          animate={titleControls}
          variants={titleVariants}
        >
          Contact Us
        </PageTitle>
        
        {/* Luxury Message Container */}
        <MessageContainer
          ref={messageRef}
          initial="hidden"
          animate={messageControls}
          variants={messageVariants}
        >
          <MaintenanceMessage>
            Please fill out the form below to contact us. We will respond via <span>email</span> and <span>SMS</span>. 
            Our team of dedicated professionals is ready to assist you with any questions about our 
            <span> premium training services</span>.
          </MaintenanceMessage>
        </MessageContainer>
        
        {/* Form Component with Animation */}
        <motion.div
          variants={formVariants}
        >
          <ContactForm />
        </motion.div>
        
        {/* Additional Info Component */}
        <motion.div
          variants={formVariants}
        >
          <AdditionalInfo />
        </motion.div>
      </MainContent>
    </ContactPageWrapper>
  );
};

export default ContactPage;