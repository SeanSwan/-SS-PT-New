import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import GlowButton from "../components/Button/glowButton";
// Import the new ProgressBar component
import ProgressBar from "./../components/ProgressBar/ProgressBar";

// Import assets
import Logo from "../assets/Logo.png";
import powerBackground from "../assets/Swans.mp4";

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
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5),
                0 0 10px rgba(0, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.7),
                0 0 25px rgba(0, 255, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5),
                0 0 10px rgba(0, 255, 255, 0.3);
  }
`;

/* ------------------ Styled Components ------------------ */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
    z-index: 0;
  }
`;

const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
`;

const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  width: 90%;
  max-width: 550px;
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: rgba(18, 18, 35, 0.85);
  padding: 2.5rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(
      to bottom,
      rgba(0, 255, 255, 0.7),
      rgba(120, 81, 169, 0.7)
    );
    border-radius: 4px;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    max-height: 80vh;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: 2px solid var(--neon-blue, #00ffff);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: var(--neon-blue, #00ffff);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--neon-blue, #00ffff);
    color: #111;
    transform: rotate(90deg);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.3);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
`;

const LogoCircle = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  animation: ${glow} 3s infinite ease-in-out;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg, 
      rgba(0, 255, 255, 0.2), 
      rgba(120, 81, 169, 0.2)
    );
    z-index: 1;
  }
`;

const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  animation: ${float} 6s ease-in-out infinite;
`;

const HeaderText = styled.h1`
  font-size: 2.2rem;
  font-weight: 300;
  margin: 0;
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
  letter-spacing: 1px;
`;

const FormTitle = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 400;
  color: white;
  position: relative;
  display: inline-block;
  width: 100%;
  padding-bottom: 10px;
  
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
  
  ${InputWrapper}:focus-within & {
    color: var(--neon-blue, #00ffff);
  }
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(120, 81, 169, 0.5);
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.3);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--neon-blue, #00ffff);
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.2);
    background: rgba(30, 30, 60, 0.5);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  display: block;
  margin-top: 1.5rem;
  text-align: right;
  color: var(--neon-blue, #00ffff);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  display: inline-block;
  overflow: hidden;
  padding-bottom: 2px;
  transition: all 0.3s ease;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: var(--neon-blue, #00ffff);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.7);
    
    &:after {
      transform: translateX(0);
    }
  }
`;

const ErrorMessage = styled.p`
  color: #ff4d6d;
  text-align: center;
  margin-bottom: 1.5rem;
  background: rgba(255, 77, 109, 0.1);
  padding: 10px;
  border-radius: 8px;
  border-left: 3px solid #ff4d6d;
`;

const FormSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  h3 {
    margin-top: 0;
    margin-bottom: 1.2rem;
    font-size: 1.2rem;
    font-weight: 400;
    color: var(--neon-blue, #00ffff);
  }
`;

const ButtonContainer = styled.div`
  margin-top: 2rem;
`;

/* ------------------ SignupModal Component ------------------ */
const SignupModal = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const controls = useAnimation();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    fitnessGoal: "",
    trainingExperience: "",
    healthConcerns: "",
    emergencyContact: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Start animations when component mounts
  useEffect(() => {
    controls.start("visible");
    
    // Calculate form completion percentage
    calculateCompletionPercentage();
  }, [controls, formData]);

  const handleClose = () => {
    // Run exit animation before navigating away
    controls.start("exit").then(() => {
      navigate(-1);
    });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const calculateCompletionPercentage = () => {
    // Count required fields and other important fields
    const requiredFields = ["firstName", "lastName", "email", "username", "password", "confirmPassword"];
    const otherFields = ["phone", "dateOfBirth", "gender", "weight", "height", "fitnessGoal"];
    
    // Calculate how many required fields are filled
    const requiredFilled = requiredFields.filter(field => formData[field]?.trim() !== "").length;
    const otherFilled = otherFields.filter(field => formData[field]?.trim() !== "").length;
    
    // Calculate percentage - required fields worth more than other fields
    const requiredWeight = 0.7; // 70% of completion is from required fields
    const otherWeight = 0.3; // 30% of completion is from other fields
    
    const requiredPercentage = (requiredFilled / requiredFields.length) * requiredWeight * 100;
    const otherPercentage = (otherFilled / otherFields.length) * otherWeight * 100;
    
    setCompletionPercentage(Math.min(Math.round(requiredPercentage + otherPercentage), 100));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      setIsLoading(false);
      navigate("/dashboard");
    } catch (err) {
      setIsLoading(false);
      console.error("Error during registration:", err);
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Forgot password functionality not implemented yet.");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { 
        duration: 0.3,
        ease: "easeIn" 
      }
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <VideoBackground autoPlay loop muted>
        <source src={powerBackground} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>
      
      <ModalContent
        onClick={(e) => e.stopPropagation()}
        variants={containerVariants}
        initial="hidden"
        animate={controls}
        exit="exit"
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>

        {/* Modal Header with logo and app name */}
        <ModalHeader>
          <LogoCircle>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>

        <FormTitle>Create Your Account</FormTitle>
        
        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}
        
        {/* Progress Bar - Using our new component */}
        <ProgressBar percent={completionPercentage} />

        <form onSubmit={handleSubmit}>
          {/* Personal Info Section */}
          <FormSection>
            <h3>Personal Information</h3>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="firstName">First Name</Label>
                <InputField
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </InputWrapper>

              <InputWrapper>
                <Label htmlFor="lastName">Last Name</Label>
                <InputField
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </InputWrapper>
            </FormGrid>

            <InputWrapper>
              <Label htmlFor="email">Email Address</Label>
              <InputField
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="phone">Phone Number</Label>
              <InputField
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </InputWrapper>

            <FormGrid>
              <InputWrapper>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <InputField
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </InputWrapper>

              <InputWrapper>
                <Label htmlFor="gender">Gender</Label>
                <InputField
                  type="text"
                  id="gender"
                  name="gender"
                  placeholder="Enter your gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </InputWrapper>
            </FormGrid>
          </FormSection>

          {/* Account Section */}
          <FormSection>
            <h3>Account Credentials</h3>
            <InputWrapper>
              <Label htmlFor="username">Username</Label>
              <InputField
                type="text"
                id="username"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </InputWrapper>

            <FormGrid>
              <InputWrapper>
                <Label htmlFor="password">Password</Label>
                <InputField
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </InputWrapper>

              <InputWrapper>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <InputField
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </InputWrapper>
            </FormGrid>
          </FormSection>

          {/* Fitness Profile Section */}
          <FormSection>
            <h3>Fitness Profile</h3>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="weight">Weight (kg)</Label>
                <InputField
                  type="number"
                  id="weight"
                  name="weight"
                  placeholder="Enter your weight"
                  value={formData.weight}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </InputWrapper>

              <InputWrapper>
                <Label htmlFor="height">Height (cm)</Label>
                <InputField
                  type="number"
                  id="height"
                  name="height"
                  placeholder="Enter your height"
                  value={formData.height}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </InputWrapper>
            </FormGrid>

            <InputWrapper>
              <Label htmlFor="fitnessGoal">Fitness Goal</Label>
              <InputField
                type="text"
                id="fitnessGoal"
                name="fitnessGoal"
                placeholder="E.g., lose weight, build muscle"
                value={formData.fitnessGoal}
                onChange={handleChange}
                disabled={isLoading}
              />
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="trainingExperience">Training Experience</Label>
              <InputField
                type="text"
                id="trainingExperience"
                name="trainingExperience"
                placeholder="Describe your training experience"
                value={formData.trainingExperience}
                onChange={handleChange}
                disabled={isLoading}
              />
            </InputWrapper>
          </FormSection>

          {/* Health & Safety Section */}
          <FormSection>
            <h3>Health & Safety</h3>
            <InputWrapper>
              <Label htmlFor="healthConcerns">Health Concerns</Label>
              <InputField
                type="text"
                id="healthConcerns"
                name="healthConcerns"
                placeholder="Any health issues or concerns"
                value={formData.healthConcerns}
                onChange={handleChange}
                disabled={isLoading}
              />
            </InputWrapper>

            <InputWrapper>
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <InputField
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                placeholder="Emergency contact name & phone"
                value={formData.emergencyContact}
                onChange={handleChange}
                disabled={isLoading}
              />
            </InputWrapper>
          </FormSection>
          
          <ButtonContainer>
            <GlowButton
              type="submit"
              text={isLoading ? "Creating Account..." : "Create Account"}
              theme="cosmic"
              size="large"
              disabled={isLoading}
              animateOnRender
            />
          </ButtonContainer>
        </form>
        
        <ForgotPasswordLink onClick={handleForgotPassword}>
          Forgot Password?
        </ForgotPasswordLink>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SignupModal;