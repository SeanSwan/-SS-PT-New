import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// Import the logo asset
import Logo from "../assets/Logo.png";
// Import the background video
import powerBackground from "../assets/Waves.mp4"; // Consider using Waves.mp4 for consistency

/* ------------------ Animations ------------------ */
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4), 0 0 20px rgba(120, 81, 169, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(120, 81, 169, 0.4);
  }
  100% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4), 0 0 20px rgba(120, 81, 169, 0.2);
  }
`;

const glowText = keyframes`
  0% {
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
  }
  50% {
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.5);
  }
  100% {
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
  }
`;

/* ------------------ Styled Components ------------------ */

const FullPageContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, rgba(10, 10, 30, 0.85), rgba(20, 20, 50, 0.9));
  z-index: 1500;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const VideoBackground = styled.div`
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
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
  }
  
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  width: 90%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  padding: 40px 30px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: ${pulseGlow} 6s infinite ease-in-out;
  
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
    border-radius: 15px;
    z-index: -1;
  }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Playfair Display', serif;
  font-size: 0.8rem;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  background: rgba(10, 10, 30, 0.6);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 5;
  letter-spacing: 2px;
  
  &:before {
    content: "★★★★★★★";
    display: block;
    font-size: 0.6rem;
    letter-spacing: 2px;
    color: gold;
    text-align: center;
    margin-bottom: 2px;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    border-radius: 20px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
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
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3);
    color: white;
    transform: rotate(90deg);
  }
`;

const ModalHeader = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
`;

const LogoCircle = styled(motion.div)`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 255, 0.2),
    rgba(120, 81, 169, 0.2)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  animation: ${float} 6s ease-in-out infinite;
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
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    border-radius: 50%;
  }
`;

const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
`;

const HeaderText = styled(motion.h1)`
  font-size: 1.8rem;
  font-weight: 300;
  color: white;
  margin: 0;
  letter-spacing: 1px;
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
`;

const FormTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 25px;
  font-weight: 300;
  color: white;
  letter-spacing: 1px;
  animation: ${glowText} 3s infinite;
`;

const InputField = styled(motion.input)`
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 20px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
  background: rgba(10, 10, 30, 0.3);
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  
  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    background: rgba(30, 30, 60, 0.4);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 12px;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0.8),
    rgba(120, 81, 169, 0.8)
  );
  background-size: 200% auto;
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background-position: right center;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5), 0 0 30px rgba(120, 81, 169, 0.3);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    transition: all 0.3s ease;
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    
    &:hover {
      box-shadow: none;
      background-position: 0% 0%;
    }
    
    &:hover:before {
      left: -100%;
    }
  }
`;

const ForgotPasswordLink = styled(motion.a)`
  display: block;
  margin-top: 15px;
  text-align: right;
  color: rgba(0, 255, 255, 0.8);
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  
  &:hover {
    color: #fff;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
  }
  
  &:after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1px;
    background: rgba(0, 255, 255, 0.8);
    transition: width 0.3s ease;
  }
  
  &:hover:after {
    width: 100%;
  }
`;

const ErrorMessage = styled(motion.p)`
  color: #ff5555;
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255, 85, 85, 0.1);
  border-radius: 5px;
  border-left: 3px solid #ff5555;
`;

/* ------------------ LoginModal Component ------------------ */

const LoginModal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  // Dismiss the modal and return to the previous page.
  const handleClose = () => {
    controls.start("exit").then(() => {
      navigate(-1);
    });
  };

  // Update the form state.
  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Placeholder for forgot password functionality.
  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Forgot password functionality not implemented yet.");
  };

  // Handle form submission for login.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await login(credentials.username, credentials.password);
      setIsLoading(false);
      
      if (response.user) {
        if (response.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/client-dashboard");
        }
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Login error:", err);
      setError(err.message || "Invalid username or password");
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.5 
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <FullPageContainer onClick={handleClose}>
      <VideoBackground>
        <video autoPlay loop muted playsInline>
          <source src={powerBackground} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </VideoBackground>

      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <PremiumBadge
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          MEMBER
        </PremiumBadge>
        
        <CloseButton onClick={handleClose}>&times;</CloseButton>

        <ModalHeader variants={containerVariants}>
          <LogoCircle variants={itemVariants}>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText variants={itemVariants}>SwanStudios</HeaderText>
        </ModalHeader>

        <FormTitle variants={itemVariants}>Access Your Account</FormTitle>
        
        {error && (
          <ErrorMessage
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </ErrorMessage>
        )}

        <form onSubmit={handleSubmit}>
          <InputField
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleChange}
            required
            disabled={isLoading}
            variants={itemVariants}
          />
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

        <ForgotPasswordLink 
          onClick={handleForgotPassword}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
        >
          Forgot Password?
        </ForgotPasswordLink>
      </ModalContent>
    </FullPageContainer>
  );
};

export default LoginModal;