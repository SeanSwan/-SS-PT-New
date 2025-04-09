// File: frontend/src/components/SignupModal/SignupModal.component.tsx
// Note: Adjust path if necessary

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
// Import motion and Variants type
import { motion, useAnimation, Variants } from "framer-motion";
import { useAuth } from "./../context/AuthContext"; // Verify path
import GlowButton from "./../components/Button/glowButton"; // Verify path
import ProgressBar from "./../components/ProgressBar/ProgressBar"; // Verify path

// --- UPDATED: Asset Paths ---
// Change from direct imports to public folder paths
const Logo = "/Logo.png"; // Ensure Logo.png is in your /public folder
const powerBackground = "/Swans.mp4"; // Ensure Swans.mp4 is in your /public folder

/* ------------------ Animations ------------------ */
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.7), 0 0 25px rgba(0, 255, 255, 0.5); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3); }
`;

/* ------------------ Styled Components (UPDATED with motion) ------------------ */

// ModalOverlay doesn't directly take animation props in this setup
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
    background: linear-gradient( 45deg, rgba(0, 0, 0, 0.7), rgba(10, 10, 30, 0.85), rgba(20, 20, 50, 0.9) );
    z-index: 0;
  }
`;

// VideoBackground doesn't need motion props
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
`;

// ModalContent receives animation props
const ModalContent = styled(motion.div)` // Changed to motion.div
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
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: linear-gradient( to bottom, rgba(0, 255, 255, 0.7), rgba(120, 81, 169, 0.7) ); border-radius: 4px; }

  @media (max-width: 768px) { padding: 1.5rem; max-height: 80vh; }
`;

// CloseButton can be motion.button if you add hover/tap animations
const CloseButton = styled(motion.button)` // Changed to motion.button
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
  transition: all 0.3s ease; // Keep CSS transitions for simple hover
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1; // Better centering for '×'

  &:hover {
    background: var(--neon-blue, #00ffff);
    color: #111;
    transform: rotate(90deg); // Keep CSS hover effect
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.3);
  }
`;

// No motion props needed for ModalHeader itself
const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
`;

// No motion props needed for LogoCircle itself
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

  &:before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient( 135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2) ); z-index: 1; }
`;

// LogoImage uses CSS animation, not motion props directly
const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  animation: ${float} 6s ease-in-out infinite;
`;

// HeaderText uses CSS animation, not motion props directly
const HeaderText = styled.h1`
  font-size: 2.2rem;
  font-weight: 300;
  margin: 0;
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  letter-spacing: 1px;
`;

// FormTitle doesn't need motion props
const FormTitle = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 400;
  color: white;
  position: relative;
  display: inline-block;
  width: 100%;
  padding-bottom: 10px;

  &:after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80px; height: 2px; background: linear-gradient( to right, rgba(0, 255, 255, 0), rgba(0, 255, 255, 1), rgba(0, 255, 255, 0) ); }
`;

// InputWrapper doesn't need motion props
const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

// Label doesn't need motion props
const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;

  ${InputWrapper}:focus-within & { color: var(--neon-blue, #00ffff); }
`;

// InputField doesn't need motion props here (no individual animation)
const InputField = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(120, 81, 169, 0.5);
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.3);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus { outline: none; border-color: var(--neon-blue, #00ffff); box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.2); background: rgba(30, 30, 60, 0.5); }
  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

// FormGrid doesn't need motion props
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

// ForgotPasswordLink can be motion.button if adding tap/hover animations
const ForgotPasswordLink = styled(motion.button)` // Changed to motion.button
  background: none;
  border: none;
  display: block; // Changed from inline-block for easier centering
  margin: 1.5rem auto 0; // Center horizontally
  text-align: center;
  color: var(--neon-blue, #00ffff);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  // display: inline-block; // Removed
  overflow: hidden;
  padding-bottom: 2px;
  transition: all 0.3s ease;

  &:after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 1px; background-color: var(--neon-blue, #00ffff); transform: translateX(-101%); transition: transform 0.3s ease; } // Adjusted transform
  &:hover { text-shadow: 0 0 8px rgba(0, 255, 255, 0.7); &:after { transform: translateX(0); } }
`;

// ErrorMessage can be motion.p for entrance animation
const ErrorMessage = styled(motion.p)` // Changed to motion.p
  color: #ff4d6d;
  text-align: center;
  margin-bottom: 1.5rem;
  background: rgba(255, 77, 109, 0.1);
  padding: 10px;
  border-radius: 8px;
  border-left: 3px solid #ff4d6d;
`;

// FormSection doesn't need motion props
const FormSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(5px); // Adjusted blur slightly
  border: 1px solid rgba(255, 255, 255, 0.05);

  h3 { margin-top: 0; margin-bottom: 1.2rem; font-size: 1.2rem; font-weight: 400; color: var(--neon-blue, #00ffff); }
`;

// ButtonContainer doesn't need motion props
const ButtonContainer = styled.div`
  margin-top: 2rem;
  display: flex; // Allow button centering if needed
  justify-content: center;
`;

/* ------------------ SignupModal Component ------------------ */
// Added React.FC type
const SignupModal: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const controls = useAnimation(); // Still using controls here

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", username: "", password: "",
    confirmPassword: "", phone: "", dateOfBirth: "", gender: "", weight: "",
    height: "", fitnessGoal: "", trainingExperience: "", healthConcerns: "",
    emergencyContact: "",
  });
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


  const handleClose = () => {
    controls.start("exit").then(() => {
       if (window.history.length > 1) {
          navigate(-1);
       } else {
          navigate('/');
       }
    });
  };

  // Added type for event
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const calculateCompletionPercentage = () => {
    // Simple example: Count non-empty fields
    const totalFields = Object.keys(formData).length - 1; // Exclude confirmPassword for calculation
    const filledFields = Object.entries(formData).filter(([key, value]) => key !== 'confirmPassword' && value?.trim() !== "").length;
    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    setCompletionPercentage(Math.min(percentage, 100));
  };

  // Added type for event
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    // Basic password strength check (example)
    if (formData.password.length < 8) {
       setError("Password must be at least 8 characters long.");
       return;
    }

    setIsLoading(true);

    try {
      // Don't send confirmPassword to backend
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      // No need to set isLoading false if navigating
      // navigate("/dashboard"); // Or maybe to a "check your email" page?
      navigate("/login", { state: { message: "Registration successful! Please log in." } }); // Navigate to login with success message
    } catch (err: any) { // Typed error
      setIsLoading(false);
      console.error("Error during registration:", err);
      const message = err?.response?.data?.message || err?.message || "Registration failed. Please try again.";
      setError(message);
    }
  };

  // Added type for event
  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Navigate to forgot password page or show another modal
    alert("Forgot password link clicked - redirect or show appropriate UI.");
    // Example: navigate('/forgot-password');
  };

  // --- Animation Variants (Typed) ---
  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 }, // Adjusted scale
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" } // Faster transition
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
        marginTop: '0rem', // Adjust as needed
        marginBottom: '1.5rem',
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
    // ModalOverlay itself doesn't animate, the ModalContent inside does
    <ModalOverlay onClick={handleClose}>
      <VideoBackground autoPlay loop muted>
        {/* --- UPDATED: Video source uses const --- */}
        <source src={powerBackground} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* ModalContent uses motion.div and variants */}
      <ModalContent
        key="signup-modal-content"
        onClick={(e) => e.stopPropagation()} // Prevent overlay click closing
        variants={containerVariants}
        initial="hidden"
        animate={controls} // Use controls for imperative start
        exit="exit"
      >
        {/* CloseButton uses motion.button */}
        <CloseButton onClick={handleClose} aria-label="Close sign up modal" whileTap={{ scale: 0.9 }}>×</CloseButton>

        <ModalHeader>
          <LogoCircle>
            {/* --- UPDATED: LogoImage source uses const --- */}
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>

        <FormTitle>Create Your Account</FormTitle>

        {/* ErrorMessage uses motion.p and variants */}
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

        {/* Use ProgressBar component */}
        <ProgressBar percent={completionPercentage} />

        <form onSubmit={handleSubmit}>
          {/* Sections remain standard divs unless they need individual animation */}
          <FormSection>
            <h3>Personal Information</h3>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="firstName">First Name</Label>
                <InputField type="text" id="firstName" name="firstName" placeholder="e.g., Jane" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="lastName">Last Name</Label>
                <InputField type="text" id="lastName" name="lastName" placeholder="e.g., Doe" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
              </InputWrapper>
            </FormGrid>
            <InputWrapper>
              <Label htmlFor="email">Email Address</Label>
              <InputField type="email" id="email" name="email" placeholder="jane.doe@example.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
            </InputWrapper>
            <InputWrapper>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <InputField type="tel" id="phone" name="phone" placeholder="e.g., 555-123-4567" value={formData.phone} onChange={handleChange} disabled={isLoading} />
            </InputWrapper>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                <InputField type="date" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} disabled={isLoading} />
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="gender">Gender (Optional)</Label>
                <InputField type="text" id="gender" name="gender" placeholder="e.g., Female, Male, Non-binary" value={formData.gender} onChange={handleChange} disabled={isLoading} />
              </InputWrapper>
            </FormGrid>
          </FormSection>

          <FormSection>
            <h3>Account Credentials</h3>
            <InputWrapper>
              <Label htmlFor="username">Username</Label>
              <InputField type="text" id="username" name="username" placeholder="Choose a unique username" value={formData.username} onChange={handleChange} required disabled={isLoading} />
            </InputWrapper>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="password">Password (min. 8 characters)</Label>
                <InputField type="password" id="password" name="password" placeholder="Enter password" value={formData.password} onChange={handleChange} required disabled={isLoading} />
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <InputField type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} />
              </InputWrapper>
            </FormGrid>
          </FormSection>

          <FormSection>
            <h3>Fitness Profile (Optional)</h3>
            <FormGrid>
              <InputWrapper>
                <Label htmlFor="weight">Weight (kg)</Label>
                <InputField type="number" id="weight" name="weight" placeholder="e.g., 70" value={formData.weight} onChange={handleChange} disabled={isLoading} />
              </InputWrapper>
              <InputWrapper>
                <Label htmlFor="height">Height (cm)</Label>
                <InputField type="number" id="height" name="height" placeholder="e.g., 175" value={formData.height} onChange={handleChange} disabled={isLoading} />
              </InputWrapper>
            </FormGrid>
            <InputWrapper>
              <Label htmlFor="fitnessGoal">Primary Fitness Goal</Label>
              <InputField type="text" id="fitnessGoal" name="fitnessGoal" placeholder="e.g., Weight loss, Muscle gain, Endurance" value={formData.fitnessGoal} onChange={handleChange} disabled={isLoading} />
            </InputWrapper>
            <InputWrapper>
              <Label htmlFor="trainingExperience">Training Experience</Label>
              <InputField type="text" id="trainingExperience" name="trainingExperience" placeholder="e.g., Beginner, Intermediate, Advanced" value={formData.trainingExperience} onChange={handleChange} disabled={isLoading} />
            </InputWrapper>
          </FormSection>

          <FormSection>
            <h3>Health & Safety (Optional)</h3>
            <InputWrapper>
              <Label htmlFor="healthConcerns">Known Health Concerns/Injuries</Label>
              <InputField type="text" id="healthConcerns" name="healthConcerns" placeholder="e.g., Knee pain, Asthma" value={formData.healthConcerns} onChange={handleChange} disabled={isLoading} />
            </InputWrapper>
            <InputWrapper>
              <Label htmlFor="emergencyContact">Emergency Contact (Name & Phone)</Label>
              <InputField type="text" id="emergencyContact" name="emergencyContact" placeholder="e.g., John Doe 555-987-6543" value={formData.emergencyContact} onChange={handleChange} disabled={isLoading} />
            </InputWrapper>
          </FormSection>

          <ButtonContainer>
            {/* GlowButton likely already uses motion internally, check its implementation */}
            <GlowButton
              type="submit"
              text={isLoading ? "Creating Account..." : "Create Account"}
              theme="cosmic"
              size="large"
              disabled={isLoading}
              // animateOnRender // Check if this prop is still valid/needed in GlowButton
            />
          </ButtonContainer>
        </form>

        {/* ForgotPasswordLink uses motion.button */}
        <ForgotPasswordLink onClick={handleForgotPassword} whileTap={{ scale: 0.95 }}>
          Having trouble? Contact support. {/* Changed text */}
        </ForgotPasswordLink>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SignupModal;