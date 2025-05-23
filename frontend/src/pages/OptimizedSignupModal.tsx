/**
 * OptimizedSignupModal.tsx
 * ====================
 * 
 * Optimized signup modal with improved layout, compact footer,
 * U.S. standard units (lbs/inches), and better viewport handling.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, Variants } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import GlowButton from "../components/Button/glowButton";
import ProgressBar from "../components/ProgressBar/ProgressBar";
import AuthLayout from "../layouts/AuthLayout";

// --- Asset Paths ---
const Logo = "/Logo.png";
const powerBackground = "/Swans.mp4";

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

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.7), 0 0 25px rgba(0, 255, 255, 0.5); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3); }
`;

/* ------------------ Styled Components ------------------ */
const SignupContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Changed from center to allow scrolling */
  padding: 30px 10px 10px; /* Added top padding to prevent cut-off */
  overflow-y: auto;
`;

const VideoBackground = styled.div`
  position: fixed; /* Changed from absolute to fixed */
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
      rgba(20, 20, 50, 0.95)
    );
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

const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  width: 95%;
  max-width: 500px; /* Slightly reduced max-width */
  height: auto;
  background: rgba(18, 18, 35, 0.85);
  padding: 1.5rem; /* Reduced padding */
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  margin: 20px 0 60px 0; /* Increased top margin */
  overflow: visible; /* Changed from auto to prevent nested scrollbars */

  /* Custom scrollbar */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: linear-gradient( to bottom, rgba(0, 255, 255, 0.7), rgba(120, 81, 169, 0.7) ); border-radius: 4px; }

  @media (max-width: 768px) { 
    padding: 1.25rem; 
    width: 98%;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: 2px solid var(--neon-blue, #00ffff);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.5rem; /* Slightly larger font for better centering */
  color: var(--neon-blue, #00ffff);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  text-align: center;

  /* Adjust vertical positioning */
  span {
    margin-top: -2px; /* Fine-tune vertical alignment */
    display: block;
  }

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
  margin-bottom: 1rem; /* Reduced margin */
  position: relative;
`;

const LogoCircle = styled.div`
  width: 65px; /* Reduced size */
  height: 65px; /* Reduced size */
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem; /* Reduced margin */
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
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2)); 
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
  font-size: 1.5rem; /* Reduced size */
  font-weight: 300;
  margin: 0;
  background: linear-gradient(to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  letter-spacing: 1px;
`;

const FormTitle = styled.h2`
  text-align: center;
  margin-bottom: 1rem; /* Reduced margin */
  font-weight: 400;
  font-size: 1.25rem; /* Reduced size */
  color: white;
  position: relative;
  display: inline-block;
  width: 100%;
  padding-bottom: 6px; /* Reduced padding */

  &:after { 
    content: ""; 
    position: absolute; 
    bottom: 0; 
    left: 50%; 
    transform: translateX(-50%); 
    width: 60px; /* Reduced width */
    height: 2px; 
    background: linear-gradient(to right, rgba(0, 255, 255, 0), rgba(0, 255, 255, 1), rgba(0, 255, 255, 0)); 
  }
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem; /* Reduced margin */
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px; /* Reduced margin */
  font-size: 0.85rem; /* Reduced size */
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
  padding: 10px 14px; /* Reduced padding */
  border: 1px solid rgba(120, 81, 169, 0.5);
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.3);
  color: white;
  font-size: 0.9rem; /* Reduced size */
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

const SelectField = styled.select`
  width: 100%;
  padding: 10px 14px; /* Reduced padding */
  border: 1px solid rgba(120, 81, 169, 0.5);
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.3);
  color: white;
  font-size: 0.9rem; /* Reduced size */
  transition: all 0.3s ease;
  appearance: none; /* Remove default arrow */
  background-image: linear-gradient(45deg, transparent 50%, rgba(0, 255, 255, 0.7) 50%),
                    linear-gradient(135deg, rgba(0, 255, 255, 0.7) 50%, transparent 50%);
  background-position: calc(100% - 20px) calc(1em + 0px),
                        calc(100% - 15px) calc(1em + 0px);
  background-size: 5px 5px,
                   5px 5px;
  background-repeat: no-repeat;

  &:focus {
    outline: none;
    border-color: var(--neon-blue, #00ffff);
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.2);
    background: rgba(30, 30, 60, 0.5);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* Style for options - note: limited styling available */
  option {
    background-color: #1e1e3e;
    color: white;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem; /* Reduced gap */

  @media (max-width: 600px) { 
    grid-template-columns: 1fr; 
  }
`;

const ForgotPasswordLink = styled(motion.button)`
  background: none;
  border: none;
  display: block;
  margin: 1rem auto 0; /* Reduced margin */
  text-align: center;
  color: var(--neon-blue, #00ffff);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  padding-bottom: 2px;
  transition: all 0.3s ease;
  font-size: 0.85rem; /* Reduced size */

  &:after { 
    content: ''; 
    position: absolute; 
    bottom: 0; 
    left: 0; 
    width: 100%; 
    height: 1px; 
    background-color: var(--neon-blue, #00ffff); 
    transform: translateX(-101%); 
    transition: transform 0.3s ease; 
  }
  
  &:hover { 
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.7); 
    
    &:after { 
      transform: translateX(0); 
    } 
  }
`;

const ErrorMessage = styled(motion.p)`
  color: #ff4d6d;
  text-align: center;
  margin-bottom: 1rem; /* Reduced margin */
  background: rgba(255, 77, 109, 0.1);
  padding: 8px; /* Reduced padding */
  border-radius: 8px;
  border-left: 3px solid #ff4d6d;
  font-size: 0.85rem; /* Reduced size */
`;

const FormSection = styled.div`
  margin-bottom: 1rem; /* Reduced margin */
  padding: 1rem; /* Reduced padding */
  border-radius: 12px;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);

  h3 { 
    margin-top: 0; 
    margin-bottom: 0.75rem; /* Reduced margin */
    font-size: 1rem; /* Reduced size */
    font-weight: 400; 
    color: var(--neon-blue, #00ffff); 
  }
`;

const ButtonContainer = styled.div`
  margin-top: 1.5rem; /* Reduced margin */
  display: flex;
  justify-content: center;
`;

const HelpText = styled.div`
  font-size: 0.75rem;
  color: rgba(0, 255, 255, 0.7);
  margin-top: 0.25rem;
  line-height: 1.3;
`;

// New component for measurement fields with units
const MeasurementInput = styled.div`
  display: flex;
  align-items: center;
  
  input {
    flex: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const UnitLabel = styled.div`
  padding: 10px 12px;
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid rgba(120, 81, 169, 0.5);
  border-left: none;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  color: white;
  font-size: 0.85rem;
  white-space: nowrap;
`;

// For feet/inches input with two fields
const HeightInputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const HeightField = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  
  input {
    flex: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    text-align: center;
  }
`;

/**
 * OptimizedSignupModal Component
 * Enhanced signup modal with improved layout, compact footer,
 * U.S. standard units (lbs/inches), and better viewport handling.
 */
const OptimizedSignupModal: React.FC = () => {
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
    weight: "", // In pounds
    feet: "", // For height in feet
    inches: "", // For height in inches
    height: "", // Calculated in cm for backend
    fitnessGoal: "", 
    trainingExperience: "", 
    healthConcerns: "",
    emergencyContact: "", 
    emergencyContactName: "", 
    emergencyContactPhone: "",
    role: "user", 
    adminCode: ""
  });
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Calculate completion percentage whenever formData changes
  useEffect(() => {
    calculateCompletionPercentage();
  }, [formData]);

  // Trigger entrance animation on mount
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  // Scroll to top and reset any scrolling position when component mounts
  useEffect(() => {
    setTimeout(() => {
      // Reset scroll position after a brief delay to ensure the component is rendered
      const content = document.querySelector('.auth-layout-content');
      if (content) {
        content.scrollTop = 0;
      }
    }, 100);
  }, []);

  const handleClose = () => {
    controls.start("exit").then(() => {
       if (window.history.length > 1) {
          navigate(-1);
       } else {
          navigate('/');
       }
    });
  };

  // Handle changes for input elements
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If changing height fields (feet/inches), calculate the total height in cm
    if (name === 'feet' || name === 'inches') {
      const feet = name === 'feet' ? value : formData.feet;
      const inches = name === 'inches' ? value : formData.inches;
      
      if (feet || inches) {
        const totalInches = 
          (parseFloat(feet) || 0) * 12 + (parseFloat(inches) || 0);
        const heightInCm = Math.round(totalInches * 2.54);
        
        setFormData(prev => ({
          ...prev,
          height: heightInCm.toString(), // Store in cm for backend
          [name]: value // Also store the original input
        }));
      }
    }
    
    // If changing weight (in lbs), convert to kg for backend
    if (name === 'weight' && value) {
      const weightInKg = Math.round(parseFloat(value) * 0.453592);
      // We still store the original weight in lbs but will send kg to backend
      setFormData(prev => ({
        ...prev,
        weightInKg: weightInKg.toString(),
        weight: value
      }));
    }
  };

  const calculateCompletionPercentage = () => {
    // Count non-empty fields
    const totalFields = Object.keys(formData).length - 3; // Exclude confirmPassword, feet, inches
    const filledFields = Object.entries(formData).filter(([key, value]) => 
      !['confirmPassword', 'feet', 'inches'].includes(key) && value?.trim() !== ""
    ).length;
    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    setCompletionPercentage(Math.min(percentage, 100));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Password validation
    const passwordErrors = [];
    if (formData.password.length < 8) {
      passwordErrors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(formData.password)) {
      passwordErrors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(formData.password)) {
      passwordErrors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(formData.password)) {
      passwordErrors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      passwordErrors.push("Password must contain at least one special character");
    }
    
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]); // Show the first error
      return;
    }
    
    // Validate admin role requires admin code
    if (formData.role === "admin" && !formData.adminCode) {
      setError("Admin access code is required for admin accounts");
      return;
    }
    
    // Validate fitness goal format
    if (formData.fitnessGoal && !["weight-loss", "muscle-gain", "endurance", "flexibility", "general-fitness", "sports-specific", "other"].includes(formData.fitnessGoal)) {
      setError("Please select a valid fitness goal");
      return;
    }
    
    // Validate training experience format
    if (formData.trainingExperience && !["beginner", "intermediate", "advanced", "professional"].includes(formData.trainingExperience)) {
      setError("Please select a valid training experience level");
      return;
    }
    
    // Format emergency contact as a string
    let formattedData = { ...formData };
    if (formData.emergencyContactName || formData.emergencyContactPhone) {
      // Combine the name and phone into a single string
      const name = formData.emergencyContactName || '';
      const phone = formData.emergencyContactPhone || '';
      formattedData.emergencyContact = name && phone ? `${name} ${phone}` : (name || phone);
    }
    
    // Convert weight from lbs to kg if needed
    if (formData.weight) {
      const weightInKg = Math.round(parseFloat(formData.weight) * 0.453592);
      formattedData.weight = weightInKg.toString();
    }
    
    // Combine feet/inches to height in cm if not already calculated
    if ((formData.feet || formData.inches) && !formData.height) {
      const totalInches = 
        (parseFloat(formData.feet) || 0) * 12 + (parseFloat(formData.inches) || 0);
      const heightInCm = Math.round(totalInches * 2.54);
      formattedData.height = heightInCm.toString();
    }

    setIsLoading(true);

    try {
      // Only send necessary fields to backend
      const { 
        confirmPassword, // Don't send confirmation
        feet, // Don't send feet
        inches, // Don't send inches
        emergencyContactName, // Don't send separate emergency contact fields
        emergencyContactPhone, // Don't send separate emergency contact fields
        ...registrationData 
      } = formattedData;
      
      await register(registrationData);
      navigate("/login", { state: { message: "Registration successful! Please log in." } });
    } catch (err: any) {
      setIsLoading(false);
      console.error("Error during registration:", err);
      const message = err?.response?.data?.message || err?.message || "Registration failed. Please try again.";
      setError(message);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Navigate to forgot password page or show another modal
    alert("Having trouble? Please contact support for assistance.");
  };

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  };

  const errorVariants: Variants = {
     hidden: { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 },
     visible: {
        opacity: 1,
        height: 'auto',
        marginTop: '0rem',
        marginBottom: '1rem',
        transition: { duration: 0.3 }
     },
     exit: {
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        transition: { duration: 0.3 }
     }
  };

  return (
    <AuthLayout>
      <SignupContainer>
        <VideoBackground>
          <video autoPlay loop muted>
            <source src={powerBackground} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </VideoBackground>

        <ModalContent
          key="signup-modal-content"
          onClick={(e) => e.stopPropagation()}
          variants={containerVariants}
          initial="hidden"
          animate={controls}
          exit="exit"
        >
          <CloseButton 
            onClick={handleClose} 
            aria-label="Close sign up modal" 
            whileTap={{ scale: 0.9 }}
          >
            <span>×</span>
          </CloseButton>

          <ModalHeader>
            <LogoCircle>
              <LogoImage src={Logo} alt="SwanStudios Logo" />
            </LogoCircle>
            <HeaderText>SwanStudios</HeaderText>
          </ModalHeader>

          <FormTitle>Create Your Account</FormTitle>

          {error && (
            <ErrorMessage
               key="signup-error"
               variants={errorVariants}
               initial="hidden"
               animate="visible"
               exit="exit"
            >
              {error}
            </ErrorMessage>
          )}

          <ProgressBar percent={completionPercentage} />

          <form onSubmit={handleSubmit}>
            <FormSection>
              <h3>Personal Information</h3>
              <FormGrid>
                <InputWrapper>
                  <Label htmlFor="firstName">First Name</Label>
                  <InputField 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    placeholder="e.g., Jane" 
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
                    placeholder="e.g., Doe" 
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
                  placeholder="jane.doe@example.com" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  disabled={isLoading} 
                />
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <InputField 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  placeholder="e.g., 555-123-4567" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  disabled={isLoading} 
                />
              </InputWrapper>
              <FormGrid>
                <InputWrapper>
                  <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
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
                  <Label htmlFor="gender">Gender (Optional)</Label>
                  <InputField 
                    type="text" 
                    id="gender" 
                    name="gender" 
                    placeholder="e.g., Female, Male, Non-binary" 
                    value={formData.gender} 
                    onChange={handleChange} 
                    disabled={isLoading} 
                  />
                </InputWrapper>
              </FormGrid>
            </FormSection>

            <FormSection>
              <h3>Account Credentials</h3>
              <InputWrapper>
                <Label htmlFor="username">Username</Label>
                <InputField 
                  type="text" 
                  id="username" 
                  name="username" 
                  placeholder="Choose a unique username" 
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
                    placeholder="Enter password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    disabled={isLoading} 
                  />
                  <HelpText>
                    Password must contain at least 8 characters, including uppercase & lowercase letters, numbers, and special characters (!@#$%^&*)
                  </HelpText>
                </InputWrapper>
                <InputWrapper>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <InputField 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    placeholder="Confirm password" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                    disabled={isLoading} 
                  />
                </InputWrapper>
              </FormGrid>
              
              <InputWrapper>
                <Label htmlFor="role">Account Type</Label>
                <SelectField 
                  id="role" 
                  name="role" 
                  value={formData.role} 
                  onChange={(e) => {
                    handleChange(e);
                    setShowAdminCode(e.target.value === "admin");
                  }} 
                  disabled={isLoading}
                >
                  <option value="user">Regular User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </SelectField>
              </InputWrapper>

              {showAdminCode && (
                <InputWrapper>
                  <Label htmlFor="adminCode">Admin Access Code</Label>
                  <InputField 
                    type="password" 
                    id="adminCode" 
                    name="adminCode" 
                    placeholder="Enter admin access code" 
                    value={formData.adminCode} 
                    onChange={handleChange} 
                    required={formData.role === "admin"}
                    disabled={isLoading} 
                  />
                  <HelpText>
                    Required for admin accounts. Please contact system administrator if you don't have a code.
                  </HelpText>
                </InputWrapper>
              )}
            </FormSection>

            <FormSection>
              <h3>Fitness Profile (Optional)</h3>
              <FormGrid>
                <InputWrapper>
                  <Label htmlFor="weight">Weight</Label>
                  <MeasurementInput>
                    <InputField 
                      type="number" 
                      id="weight" 
                      name="weight" 
                      placeholder="e.g., 150" 
                      value={formData.weight} 
                      onChange={handleChange} 
                      disabled={isLoading} 
                    />
                    <UnitLabel>lbs</UnitLabel>
                  </MeasurementInput>
                </InputWrapper>
                <InputWrapper>
                  <Label htmlFor="height">Height</Label>
                  <HeightInputGroup>
                    <HeightField>
                      <InputField 
                        type="number" 
                        id="feet" 
                        name="feet" 
                        placeholder="ft" 
                        value={formData.feet} 
                        onChange={handleChange} 
                        min="0"
                        max="8"
                        disabled={isLoading}
                      />
                      <UnitLabel>ft</UnitLabel>
                    </HeightField>
                    <HeightField>
                      <InputField 
                        type="number" 
                        id="inches" 
                        name="inches" 
                        placeholder="in" 
                        value={formData.inches} 
                        onChange={handleChange} 
                        min="0"
                        max="11"
                        disabled={isLoading}
                      />
                      <UnitLabel>in</UnitLabel>
                    </HeightField>
                  </HeightInputGroup>
                </InputWrapper>
              </FormGrid>
              <InputWrapper>
                <Label htmlFor="fitnessGoal">Primary Fitness Goal</Label>
                <SelectField 
                  id="fitnessGoal" 
                  name="fitnessGoal" 
                  value={formData.fitnessGoal} 
                  onChange={handleChange} 
                  disabled={isLoading}
                >
                  <option value="">Select your primary fitness goal</option>
                  <option value="weight-loss">Weight Loss</option>
                  <option value="muscle-gain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="general-fitness">General Fitness</option>
                  <option value="sports-specific">Sports Specific</option>
                  <option value="other">Other</option>
                </SelectField>
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="trainingExperience">Training Experience</Label>
                <SelectField 
                  id="trainingExperience" 
                  name="trainingExperience" 
                  value={formData.trainingExperience} 
                  onChange={handleChange} 
                  disabled={isLoading}
                >
                  <option value="">Select your experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="professional">Professional</option>
                </SelectField>
              </InputWrapper>
            </FormSection>

            <ButtonContainer>
              <GlowButton
                type="submit"
                text={isLoading ? "Creating Account..." : "Create Account"}
                theme="cosmic"
                size="large"
                disabled={isLoading}
              />
            </ButtonContainer>
          </form>

          <ForgotPasswordLink onClick={handleForgotPassword} whileTap={{ scale: 0.95 }}>
            Having trouble? Contact support.
          </ForgotPasswordLink>
        </ModalContent>
      </SignupContainer>
    </AuthLayout>
  );
};

export default OptimizedSignupModal;