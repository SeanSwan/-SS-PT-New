import React, { useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";
import GlowButton from "../../components/ui/GlowButton";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Clock,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import axios from "axios";

const swanVideo = "/swan.mp4";

/**
 * EnhancedContactPage — Galaxy-Swan Contact Form
 * ================================================
 * Mobile-first responsive contact page with glass morphism.
 * 10-breakpoint matrix: 320–3840px. Touch targets ≥44px.
 * Respects prefers-reduced-motion. No MUI dependencies.
 */

// Shared reduced-motion helper
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

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

const borderPulse = keyframes`
  0% {
    border-color: rgba(0, 255, 255, 0.5);
  }
  50% {
    border-color: rgba(120, 81, 169, 0.8);
  }
  100% {
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// ======================= Styled Components =======================

// Main wrapper with consistent styling
const ContactPageWrapper = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  color: #ffffff;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%);
  background-attachment: fixed;

  /* Ensure dark bg covers entire page — no white bleed */
  &::after {
    content: '';
    position: fixed;
    inset: 0;
    background: #0a0a1a;
    z-index: -1;
  }
`;

// Premium video background — fixed position covers full viewport
const VideoBackground = styled.video`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  padding: 0;
  z-index: 0;
  opacity: 0.6;
  ${reducedMotion}

  @media (max-width: 768px) {
    opacity: 0.4;
  }
`;

// Enhanced overlay — fixed to cover full viewport with video
const Overlay = styled.div`
  position: fixed;
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
    ${reducedMotion}
  }
`;

// Premium decorative orb elements — hidden on mobile to reduce GPU load + CLS
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
  ${reducedMotion}

  @media (max-width: 768px) {
    display: none;
  }
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
  ${reducedMotion}

  @media (max-width: 768px) {
    display: none;
  }
`;

// Luxury main content container with glass morphism effect
const MainContent = styled(motion.main)`
  position: relative;
  z-index: 3;
  max-width: 1200px;
  width: 90%;
  margin: 3rem auto;
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);

  @media (max-width: 1024px) {
    width: 94%;
    margin: 2.5rem auto;
  }

  @media (max-width: 768px) {
    width: 96%;
    margin: 2rem auto;
    border-radius: 16px;
  }

  @media (max-width: 430px) {
    width: 98%;
    margin: 1.5rem auto;
    border-radius: 12px;
  }

  @media (max-width: 375px) {
    width: 100%;
    margin: 1rem 0;
    border-radius: 0;
  }

  @media (min-width: 1920px) {
    max-width: 1400px;
  }

  @media (min-width: 2560px) {
    max-width: 1600px;
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

  ${reducedMotion}

  @media (max-width: 768px) {
    font-size: 2.5rem;
    margin-bottom: 1.25rem;
  }

  @media (max-width: 430px) {
    font-size: 2rem;
    letter-spacing: 1px;
  }

  @media (max-width: 375px) {
    font-size: clamp(1.5rem, 6vw, 2rem);
  }

  @media (max-width: 320px) {
    font-size: 1.4rem;
  }
`;

// Styled Contact Sections Container
const ContactSectionsContainer = styled(motion.div)`
  display: flex;
  flex-direction: row;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: ${pulseGlow} 8s infinite ease-in-out;
  position: relative;
  ${reducedMotion}

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
  
  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

// Contact Form Section
const FormSection = styled(motion.div)`
  flex: 1;
  padding: 3rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 968px) {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem 1.5rem;
  }

  @media (max-width: 430px) {
    padding: 1.5rem 1rem;
  }

  @media (max-width: 320px) {
    padding: 1rem 0.75rem;
  }
`;

// Contact Info Section
const InfoSection = styled(motion.div)`
  flex: 1;
  padding: 3rem;
  background: rgba(20, 20, 50, 0.3);
  display: flex;
  flex-direction: column;

  @media (max-width: 968px) {
    padding: 2rem 1.5rem;
  }

  @media (max-width: 430px) {
    padding: 1.5rem 1rem;
  }

  @media (max-width: 320px) {
    padding: 1rem 0.75rem;
  }
`;

// Premium Form Title
const FormTitle = styled(motion.h2)`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  color: #fff;
  
  &:after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 1),
      rgba(120, 81, 169, 0.5)
    );
  }
`;

// Info Title
const InfoTitle = styled(FormTitle)`
  &:after {
    background: linear-gradient(
      to right,
      rgba(120, 81, 169, 1),
      rgba(0, 255, 255, 0.5)
    );
  }
`;

// Styled Form
const ContactForm = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

// Custom Input Field (Replacing MUI TextField)
const InputField = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const InputLabel = styled.label<{ $focused?: boolean; $hasValue?: boolean }>`
  position: absolute;
  left: 15px;
  transition: all 0.3s ease;
  pointer-events: none;
  font-size: 0.9rem;
  color: ${({ $focused }) => $focused ? 'rgba(0, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)'};
  
  ${({ $focused, $hasValue }) => {
    if ($focused || $hasValue) {
      return `
        top: -10px;
        font-size: 0.75rem;
        background: rgba(30, 30, 60, 0.9);
        padding: 0 8px;
        border-radius: 4px;
      `;
    } else {
      return `
        top: 15px;
      `;
    }
  }}
`;

const StyledInput = styled.input<{ $multiline?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #fff;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${borderPulse} 8s infinite ease-in-out;
  padding: 15px;
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  min-height: 44px;
  ${reducedMotion}

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.8);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  }

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 430px) {
    font-size: 16px; /* prevents iOS zoom on focus */
    padding: 12px;
  }
`;

const StyledTextarea = styled.textarea`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #fff;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${borderPulse} 8s infinite ease-in-out;
  padding: 15px;
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  min-height: 120px;
  resize: vertical;
  ${reducedMotion}

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.8);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  }

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 12px;
    min-height: 100px;
  }
`;

// Contact Info Card
const InfoCard = styled(motion.div)`
  background: rgba(20, 20, 40, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    border-color: rgba(0, 255, 255, 0.2);
  }
`;

// Info Item with Icon
const InfoItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  
  .icon {
    color: #00ffff;
    margin-right: 12px;
    font-size: 1.5rem;
  }
  
  .text {
    font-size: 1.1rem;
    color: #fff;
  }
  
  a {
    color: #00ffff;
    text-decoration: none;
    transition: all 0.3s ease;
    
    &:hover {
      color: #c8b6ff;
      text-decoration: underline;
    }
  }
`;

// Social Media Icons
const SocialIconsContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 1rem;
`;

const SocialIconLink = styled.a`
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;

  &:hover, &:focus-visible {
    background: rgba(0, 255, 255, 0.2);
    color: #00ffff;
    transform: translateY(-3px);
    border-color: rgba(0, 255, 255, 0.4);
    outline: 2px solid rgba(0, 255, 255, 0.6);
    outline-offset: 2px;
  }
`;

// Custom Tooltip Component
const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipContent = styled.div<{ $visible?: boolean }>`
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  z-index: 1000;
  
  &:after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }
`;

// Custom Tooltip Wrapper — supports mouse hover and keyboard focus
const Tooltip: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <TooltipContainer
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <TooltipContent $visible={visible} role="tooltip">
        {title}
      </TooltipContent>
    </TooltipContainer>
  );
};

// Custom Grid System
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const GridItem = styled.div`
  display: flex;
  flex-direction: column;
`;

// FAQ Section
const FAQSection = styled(motion.div)`
  margin-top: 2rem;
  width: 100%;
  border-radius: 20px;
  padding: 2rem;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${pulseGlow} 8s infinite ease-in-out;
  ${reducedMotion}

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }

  @media (max-width: 430px) {
    padding: 1rem;
    border-radius: 12px;
  }

  @media (max-width: 375px) {
    padding: 0.75rem;
    border-radius: 0;
  }
`;

const FAQTitle = styled(motion.h2)`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 300;
  text-align: center;
  
  &:after {
    content: "";
    display: block;
    width: 100px;
    height: 2px;
    margin: 10px auto 0;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0.2),
      rgba(0, 255, 255, 0.8),
      rgba(0, 255, 255, 0.2)
    );
  }
`;

const FAQItem = styled(motion.div)`
  margin-bottom: 1.5rem;
  
  .question {
    font-size: 1.2rem;
    font-weight: 500;
    color: #00ffff;
    margin-bottom: 0.5rem;
  }
  
  .answer {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
  }
`;

// Custom Alert/Snackbar Components (Replacing MUI)
const NotificationContainer = styled.div<{ $visible?: boolean; $type?: 'success' | 'error' }>`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  animation: ${({ $visible }) => $visible ? slideUp : 'none'} 0.3s ease;
  ${reducedMotion}
`;

const AlertBox = styled.div<{ $type?: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  min-width: 300px;
  max-width: 500px;
  
  ${({ $type }) => {
    if ($type === 'success') {
      return `
        background: rgba(46, 125, 50, 0.9);
        border: 1px solid rgba(76, 175, 80, 0.3);
      `;
    } else {
      return `
        background: rgba(211, 47, 47, 0.9);
        border: 1px solid rgba(244, 67, 54, 0.3);
      `;
    }
  }}
`;

const AlertMessage = styled.div`
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
`;

const AlertCloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

// Custom Notification Component
const Notification: React.FC<{
  open: boolean;
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}> = ({ open, type, message, onClose }) => {
  return (
    <NotificationContainer $visible={open} $type={type}>
      <AlertBox $type={type}>
        {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <AlertMessage>{message}</AlertMessage>
        <AlertCloseButton onClick={onClose}>
          <X size={16} />
        </AlertCloseButton>
      </AlertBox>
    </NotificationContainer>
  );
};

// ======================= 🚀 Enhanced Contact Page Component =======================

const EnhancedContactPage = () => {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Focus states for input labels
  const [focusedField, setFocusedField] = useState<string>("");
  
  // Animation variants — direct mount animations (no useInView/useAnimation)
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
  
  const sectionVariants = {
    hidden: { 
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };
  
  const infoCardVariants = {
    hidden: { 
      opacity: 0,
      x: -30
    },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  const faqItemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !message) {
      setError("Please fill in all required fields");
      return;
    }
    
    try {
      const API_BASE_URL = window.location.origin.includes('sswanstudios.com')
        ? 'https://ss-pt-new.onrender.com'
        : 'http://localhost:5000';

      const submitUrl = `${API_BASE_URL}/api/contact`;
      
      const response = await axios.post(submitUrl, { 
        name, 
        email, 
        message: message + (subject ? `\n\nSubject: ${subject}` : ''),
        consultationType: 'general',
        priority: 'normal'
      });
      
      // Show success
      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setError("");
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string; code?: string };

      if (axiosErr.response?.status === 404) {
        setError("Contact service not found. Please try again later.");
      } else if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        setError("Server error. Please try again later.");
      } else if (axiosErr.code === 'NETWORK_ERROR' || !axiosErr.response) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(`Failed to send message: ${axiosErr.response?.data?.message || axiosErr.message}`);
      }
    }
  };
  
  // Close error message
  const handleCloseError = () => {
    setError("");
  };

  // Close success message
  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  // Autocomplete mapping for form fields
  const autoCompleteMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    subject: 'off',
    message: 'off',
  };

  // Input field helper function
  const renderInputField = (
    id: string,
    label: string,
    type: 'text' | 'email' | 'textarea',
    value: string,
    onChange: (value: string) => void,
    required: boolean = false
  ) => {
    const isFocused = focusedField === id;
    const hasValue = value.length > 0;

    return (
      <InputField>
        <InputLabel
          $focused={isFocused}
          $hasValue={hasValue}
          htmlFor={id}
        >
          {label}{required && ' *'}
        </InputLabel>
        {type === 'textarea' ? (
          <StyledTextarea
            id={id}
            name={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocusedField(id)}
            onBlur={() => setFocusedField("")}
            required={required}
            autoComplete={autoCompleteMap[id] || 'off'}
          />
        ) : (
          <StyledInput
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocusedField(id)}
            onBlur={() => setFocusedField("")}
            required={required}
            autoComplete={autoCompleteMap[id] || 'off'}
          />
        )}
      </InputField>
    );
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
        <source src={swanVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Enhanced Overlay */}
      <Overlay />
      
      {/* Premium Decorative Elements */}
      <TopLeftOrb />
      <BottomRightOrb />
      
      {/* Main Content with Glass Morphism */}
      <MainContent
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Premium Title */}
        <PageTitle
          initial="hidden"
          animate="visible"
          variants={titleVariants}
        >
          Connect With Us
        </PageTitle>
        
        {/* Contact Sections Container */}
        <ContactSectionsContainer>
          {/* Form Section */}
          <FormSection
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <FormTitle variants={titleVariants}>Send Us a Message</FormTitle>
            
            <ContactForm onSubmit={handleSubmit}>
              {renderInputField("name", "Full Name", "text", name, setName, true)}
              {renderInputField("email", "Email", "email", email, setEmail, true)}
              {renderInputField("subject", "Subject", "text", subject, setSubject)}
              {renderInputField("message", "Message", "textarea", message, setMessage, true)}
              
              <GlowButton
                type="submit"
                variant="primary"
                glowIntensity="high"
                fullWidth
                style={{ marginTop: '1rem' }}
              >
                Send Message
              </GlowButton>
            </ContactForm>
          </FormSection>
          
          {/* Info Section */}
          <InfoSection
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <InfoTitle variants={titleVariants}>Contact Information</InfoTitle>
            
            <InfoCard 
              custom={0}
              variants={infoCardVariants}
            >
              <InfoItem>
                <MapPin className="icon" size={24} />
                <div className="text">
                  <strong>Location</strong><br />
                  Anaheim Hills, CA
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={1}
              variants={infoCardVariants}
            >
              <InfoItem>
                <Mail className="icon" size={24} />
                <div className="text">
                  <strong>Email</strong><br />
                  <a href="mailto:loveswanstudios@protonmail.com">loveswanstudios@protonmail.com</a>
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={2}
              variants={infoCardVariants}
            >
              <InfoItem>
                <Phone className="icon" size={24} />
                <div className="text">
                  <strong>Phone</strong><br />
                  <a href="tel:+17149473221">(714) 947-3221</a>
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={3}
              variants={infoCardVariants}
            >
              <InfoItem>
                <Clock className="icon" size={24} />
                <div className="text">
                  <strong>Hours</strong><br />
                  Monday-Sunday: By Appointment Only
                </div>
              </InfoItem>
            </InfoCard>
            
            <div style={{ marginTop: 'auto' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Connect With Us</h4>
              <SocialIconsContainer>
                <Tooltip title="Facebook">
                  <SocialIconLink href="https://facebook.com/swanstudios" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook size={20} />
                  </SocialIconLink>
                </Tooltip>
                <Tooltip title="Instagram">
                  <SocialIconLink href="https://instagram.com/swanstudios" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram size={20} />
                  </SocialIconLink>
                </Tooltip>
<Tooltip title="YouTube">
                  <SocialIconLink href="https://youtube.com/@swanstudios" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <Youtube size={20} />
                  </SocialIconLink>
                </Tooltip>
              </SocialIconsContainer>
            </div>
          </InfoSection>
        </ContactSectionsContainer>
        
        {/* FAQ Section */}
        <FAQSection
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <FAQTitle variants={titleVariants}>Frequently Asked Questions</FAQTitle>
          
          <GridContainer>
            <GridItem>
              <FAQItem
                custom={0}
                variants={faqItemVariants}
              >
                <div className="question">How do I schedule a personal training session?</div>
                <div className="answer">
                  You can schedule a personal training session by contacting us through this form, calling our phone number, or emailing us directly. We'll match you with the perfect trainer for your goals.
                </div>
              </FAQItem>
            </GridItem>
            
            <GridItem>
              <FAQItem
                custom={1}
                variants={faqItemVariants}
              >
                <div className="question">What are your pricing options?</div>
                <div className="answer">
                  We offer a variety of training packages to fit different budgets and goals. Contact us for a personalized quote based on your specific needs and objectives.
                </div>
              </FAQItem>
            </GridItem>
            
            <GridItem>
              <FAQItem
                custom={2}
                variants={faqItemVariants}
              >
                <div className="question">Do you offer virtual training sessions?</div>
                <div className="answer">
                  Yes! We provide virtual training options through our secure platform. These sessions are customized just like our in-person training to ensure you reach your fitness goals.
                </div>
              </FAQItem>
            </GridItem>
            
            <GridItem>
              <FAQItem
                custom={3}
                variants={faqItemVariants}
              >
                <div className="question">How quickly will I receive a response?</div>
                <div className="answer">
                  We aim to respond to all inquiries within 24 hours during business days. For urgent matters, we recommend giving us a call directly.
                </div>
              </FAQItem>
            </GridItem>
          </GridContainer>
        </FAQSection>
      </MainContent>
      
      {/* Success/Error Notifications */}
      <Notification 
        open={success}
        type="success"
        message="Your message has been sent successfully! We'll get back to you soon."
        onClose={handleCloseSuccess}
      />
      
      <Notification 
        open={!!error}
        type="error"
        message={error}
        onClose={handleCloseError}
      />
    </ContactPageWrapper>
  );
};

export default EnhancedContactPage;