// File: frontend/src/components/LoginModal/LoginModal.component.tsx
// Note: Ensure this file path matches your project structure.

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
// Import motion directly
import { motion, useAnimation, Variants } from "framer-motion"; // Added Variants type import
import { useAuth } from "./../context/AuthContext"; // Verify path

// --- Asset Paths ---
const Logo = "/Logo.png"; // Ensure Logo.png is in your /public folder
const powerBackground = "/Waves.mp4"; // Ensure Waves.mp4 is in your /public folder

/* ------------------ Animations ------------------ */
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Removed pulseGlow as it wasn't used on the main modal anymore
// const pulseGlow = keyframes` ... `;

const glowText = keyframes`
  0% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.5); }
  100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
`;

/* ------------------ Styled Components (UPDATED with motion) ------------------ */

// --- Base elements are now motion components ---
const FullPageContainer = styled(motion.div)` // Changed to motion.div
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const VideoBackground = styled.div` // This doesn't need motion props directly
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient( to bottom, rgba(0, 0, 0, 0.7), rgba(10, 10, 30, 0.85), rgba(20, 20, 50, 0.95) );
    z-index: 1;
  }

  video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    object-fit: cover;
    z-index: 0;
  }
`;

const ModalContent = styled(motion.div)` // Changed to motion.div
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const FormWrapper = styled(motion.div)` // Changed to motion.div
  width: 100%;
  max-width: 400px;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(8px);
  padding: 30px 25px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  position: relative; // Needed for absolute positioning of header elements if required
`;


const PremiumBadge = styled(motion.div)` // Changed to motion.div
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Playfair Display', serif;
  font-size: 0.8rem;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  background: rgba(10, 10, 30, 0.7);
  backdrop-filter: blur(5px);
  color: white;
  z-index: 5;
  letter-spacing: 2px;

  &:before { content: "★★★★★★★"; display: block; font-size: 0.6rem; letter-spacing: 2px; color: gold; text-align: center; margin-bottom: 2px; }
  &:after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100% ); background-size: 200% auto; animation: ${shimmer} 3s linear infinite; border-radius: 20px; }
`;

const CloseButton = styled(motion.button)` // Changed to motion.button
  position: absolute;
  top: 15px;
  right: 20px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: var(--neon-blue, #00ffff);
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3);
    color: white;
    transform: rotate(90deg) scale(1.1);
  }
`;

const ModalHeader = styled(motion.div)` // Changed to motion.div
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 25px;
`;

const LogoCircle = styled(motion.div)` // Changed to motion.div
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient( 135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2) );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  animation: ${float} 6s ease-in-out infinite;
  overflow: hidden;

  &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100% ); background-size: 200% auto; animation: ${shimmer} 3s linear infinite; border-radius: 50%; }
`;

// LogoImage doesn't need direct motion props, its parent LogoCircle handles animation
const LogoImage = styled.img` // Kept as img, but could be motion.img if needed later
  width: 120%;
  height: 120%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
`;

const HeaderText = styled(motion.h1)` // Changed to motion.h1
  font-size: 1.6rem;
  font-weight: 300;
  color: white;
  margin: 0;
  letter-spacing: 1px;
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
`;

const FormTitle = styled(motion.h2)` // Changed to motion.h2
  text-align: center;
  margin-bottom: 20px;
  font-weight: 300;
  font-size: 1.3rem;
  color: white;
  letter-spacing: 1px;
  animation: ${glowText} 3s infinite;
`;

const InputField = styled(motion.input)` // Changed to motion.input
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 18px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
  background: rgba(10, 10, 30, 0.5);
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2), inset 0 1px 3px rgba(0, 0, 0, 0.2);
    background: rgba(30, 30, 60, 0.6);
  }

  &::placeholder { color: rgba(255, 255, 255, 0.5); }
`;

const Button = styled(motion.button)` // Changed to motion.button
  width: 100%;
  padding: 12px;
  background: linear-gradient( 90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8) );
  background-size: 200% auto;
  border: none;
  border-radius: 8px;
  color: #0a0a1a;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-top: 10px;

  &:hover { background-position: right center; box-shadow: 0 0 15px rgba(0, 255, 255, 0.5), 0 0 30px rgba(120, 81, 169, 0.3); transform: translateY(-2px); }
  &:active { transform: translateY(1px); }
  &:before { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient( 90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100% ); transition: all 0.3s ease; }
  &:hover:before { left: 100%; }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; background-position: 0% 0%; box-shadow: none; &:hover:before { left: -100%; } }
`;

const ForgotPasswordLink = styled(motion.a)` // Changed to motion.a
  display: block;
  margin-top: 15px;
  text-align: center;
  color: rgba(0, 255, 255, 0.8);
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  position: relative;

  &:hover { color: #fff; text-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
  &:after { content: ""; position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 0; height: 1px; background: rgba(0, 255, 255, 0.8); transition: width 0.3s ease; }
  &:hover:after { width: 50%; }
`;

const ErrorMessage = styled(motion.p)` // Changed to motion.p
  color: #ff8080;
  text-align: center;
  margin-bottom: 15px;
  padding: 8px 12px;
  background: rgba(255, 85, 85, 0.15);
  border-radius: 5px;
  border: 1px solid rgba(255, 85, 85, 0.2);
  font-size: 0.9rem;
`;

/* ------------------ LoginModal Component ------------------ */

const LoginModal: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const controls = useAnimation(); // Keep controls if needed for imperative animations

  // Removed useEffect for controls.start as animation is handled declaratively

  const handleClose = () => {
    // Animate out before navigating - using exit prop now
    // controls.start("exit").then(() => { ... }); // No longer needed if using declarative exit
     if (window.history.length > 1) {
        navigate(-1);
     } else {
        navigate('/');
     }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    alert("Forgot password functionality not implemented yet.");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    // Log the login attempt details to help debug
    console.log('Login attempt with credentials:', {
      usernameOrEmail: credentials.username,
      passwordLength: credentials.password.length
    });
    
    try {
      // When calling login, pass the credentials directly without modification
      const response = await login(credentials.username, credentials.password);
      
      // Check if response exists and has user data
      if (response && response.user) {
         console.log('Login successful!', { role: response.user.role });
         setTimeout(() => {
            if (response.user.role === "admin") {
              navigate("/admin-dashboard");
            } else {
              navigate("/client-dashboard");
            }
         }, 200);
      } else {
          setError("Login successful but user data missing.");
          setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Login error:", err);
      // More robust error handling
      let errorMessage = "An unknown error occurred";
      
      // Handle structured error object from AuthContext
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Log additional details in development
      console.warn('Login error details:', {
        status: err?.status || err?.response?.status,
        data: err?.data || err?.response?.data,
        message: errorMessage
      });
      
      setError(errorMessage);
    }
  };

  // --- Animation Variants (Ensure Types Match) ---
  // Using Framer Motion's 'Variants' type for better type checking
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, ease: "easeIn" } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const formWrapperVariants: Variants = {
     hidden: { opacity: 0, y: 30 },
     visible: {
        opacity: 1,
        y: 0,
        transition: {
           delay: 0.2,
           duration: 0.6,
           ease: "easeOut",
           staggerChildren: 0.1,
           delayChildren: 0.4
        }
     },
     // Exit animation for FormWrapper might not be strictly needed if FullPageContainer fades out
     // exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }
  };


  return (
    <FullPageContainer
      key="login-modal-container" // Added key for AnimatePresence if used higher up
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
    >
      <VideoBackground>
        <video autoPlay loop muted playsInline key={powerBackground}>
          <source src={powerBackground} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>

      {/* PremiumBadge and CloseButton are motion components now */}
      <PremiumBadge
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
         MEMBER
      </PremiumBadge>
      {/* CloseButton uses motion.button */}
      <CloseButton onClick={handleClose} aria-label="Close login modal" whileTap={{ scale: 0.9 }}>×</CloseButton>

      <ModalContent>
        {/* FormWrapper uses motion.div */}
        <FormWrapper
           key="login-form-wrapper"
           variants={formWrapperVariants}
           initial="hidden"  // Apply initial/animate/exit here for the wrapper itself
           animate="visible"
           exit="exit"      // Use exit here if you want the form to animate out distinctly
        >
          {/* ModalHeader uses motion.div, its children use itemVariants */}
          <ModalHeader variants={itemVariants}>
            {/* LogoCircle uses motion.div */}
            <LogoCircle /* variants={itemVariants} - Inherited via stagger */ >
              <LogoImage src={Logo} alt="SwanStudios Logo" />
            </LogoCircle>
            {/* HeaderText uses motion.h1 */}
            <HeaderText /* variants={itemVariants} - Inherited */ >SwanStudios</HeaderText>
          </ModalHeader>

          {/* FormTitle uses motion.h2 */}
          <FormTitle variants={itemVariants}>Access Your Account</FormTitle>

          {/* ErrorMessage uses motion.p */}
          {error && (
            <ErrorMessage
              key="login-error-message" // Add key for AnimatePresence-like behavior if error changes
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 15 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </ErrorMessage>
          )}

          <form onSubmit={handleSubmit}>
            {/* InputField uses motion.input */}
            <InputField
              type="text"
              name="username"
              placeholder="Username or Email"
              value={credentials.username}
              onChange={handleChange}
              required
              disabled={isLoading}
              variants={itemVariants}
              // Note: This field is sent as 'username' to the API
              // even though it can accept either username or email
            />
            {/* InputField uses motion.input */}
            <InputField
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              variants={itemVariants}
            />
            {/* Button uses motion.button */}
            <Button
              type="submit"
              disabled={isLoading}
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          {/* ForgotPasswordLink uses motion.a */}
          <ForgotPasswordLink
            href="#"
            onClick={handleForgotPassword}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }} // Removed x: 0 as it wasn't needed
          >
            Forgot Password?
          </ForgotPasswordLink>
        </FormWrapper>
      </ModalContent>
    </FullPageContainer>
  );
};

export default LoginModal;