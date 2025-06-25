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
import { useUniversalTheme } from "../context/ThemeContext";
import GlowButton from "../components/ui/GlowButton";
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
    background: ${({ theme }) => theme.gradients.hero};
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
  background: ${({ theme }) => theme.background.surface};
  padding: 1.5rem; /* Reduced padding */
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  box-shadow: ${({ theme }) => theme.shadows.elevation};
  margin: 20px 0 60px 0; /* Increased top margin */
  overflow: visible; /* Changed from auto to prevent nested scrollbars */
  transition: all 0.3s ease;

  /* Custom scrollbar with theme colors */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb { 
    background: ${({ theme }) => theme.gradients.primary}; 
    border-radius: 4px; 
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }

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
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.5rem; /* Slightly larger font for better centering */
  color: ${({ theme }) => theme.colors.primary};
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
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.background.primary};
    transform: rotate(90deg);
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}30;
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
  background: ${({ theme }) => theme.gradients.cosmic};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem; /* Reduced margin */
  position: relative;
  overflow: hidden;
  animation: ${glow} 3s infinite ease-in-out;
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  box-shadow: ${({ theme }) => theme.shadows.cosmic};
  transition: all 0.3s ease;

  &:before { 
    content: ''; 
    position: absolute; 
    top: 0; 
    left: 0; 
    right: 0; 
    bottom: 0; 
    background: ${({ theme }) => theme.gradients.primary}; 
    opacity: 0.3;
    z-index: 1; 
  }
  
  &:hover {
    transform: scale(1.05);
    box-shadow: ${({ theme }) => theme.shadows.primary}, ${({ theme }) => theme.shadows.cosmic};
  }
`;

const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.primary}40);
  transition: all 0.3s ease;
  
  /* Swan-inspired enhancement */
  &:hover {
    filter: drop-shadow(0 0 15px ${({ theme }) => theme.colors.primary}70);
    transform: scale(1.05) rotate(2deg);
  }
`;

const HeaderText = styled.h1`
  font-size: 1.5rem; /* Reduced size */
  font-weight: 300;
  margin: 0;
  background: ${({ theme }) => theme.gradients.stellar};
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  letter-spacing: 1px;
  text-shadow: 0 0 10px ${({ theme }) => theme.colors.primary}50;
  transition: all 0.3s ease;
  
  /* Swan Studios brand enhancement */
  &:hover {
    animation: ${shimmer} 2s linear infinite;
    text-shadow: 0 0 15px ${({ theme }) => theme.colors.primary}70;
  }
`;

const FormTitle = styled.h2`
  text-align: center;
  margin-bottom: 1rem; /* Reduced margin */
  font-weight: 400;
  font-size: 1.25rem; /* Reduced size */
  color: ${({ theme }) => theme.colors.primary};
  position: relative;
  display: inline-block;
  width: 100%;
  padding-bottom: 6px; /* Reduced padding */
  text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}50;
  transition: all 0.3s ease;

  &:after { 
    content: ""; 
    position: absolute; 
    bottom: 0; 
    left: 50%; 
    transform: translateX(-50%); 
    width: 60px; /* Reduced width */
    height: 2px; 
    background: ${({ theme }) => theme.gradients.primary}; 
  }
  
  /* Swan elegance enhancement */
  &:hover {
    color: ${({ theme }) => theme.colors.accent || theme.colors.primary};
    text-shadow: 0 0 12px ${({ theme }) => theme.colors.primary}70;
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
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 300;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;

  ${InputWrapper}:focus-within & { 
    color: ${({ theme }) => theme.colors.primary}; 
  }
`;

const InputField = styled.input`
  width: 100%;
  padding: 10px 14px; /* Reduced padding */
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 8px;
  background: ${({ theme }) => theme.background.elevated};
  color: ${({ theme }) => theme.text.primary};
  font-size: 0.9rem; /* Reduced size */
  transition: all 0.3s ease;

  &:focus { 
    outline: none; 
    border-color: ${({ theme }) => theme.colors.primary}; 
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20; 
    background: ${({ theme }) => theme.background.surface}; 
    transform: translateY(-1px);
    text-shadow: 0 0 5px ${({ theme }) => theme.colors.primary}20;
  }
  
  &::placeholder { 
    color: ${({ theme }) => theme.text.muted}; 
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

// Enhanced UI Components
const FieldError = styled.div`
  color: #ff6b9d;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 107, 157, 0.1);
  border-radius: 4px;
  border-left: 2px solid #ff6b9d;
`;

const PasswordStrengthContainer = styled.div`
  margin-top: 0.5rem;
`;

const PasswordStrengthBar = styled.div<{ strength: number }>`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.strength}%;
    background: ${props => 
      props.strength < 30 ? '#ff4d6d' :
      props.strength < 60 ? '#ffa726' :
      props.strength < 80 ? '#66bb6a' :
      '#00ffff'
    };
    transition: all 0.3s ease;
    border-radius: 2px;
  }
`;

const PasswordStrengthText = styled.div<{ strength: number }>`
  font-size: 0.7rem;
  color: ${props => 
    props.strength < 30 ? '#ff6b9d' :
    props.strength < 60 ? '#ffa726' :
    props.strength < 80 ? '#66bb6a' :
    '#00ffff'
  };
  text-align: center;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(0, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
  
  &:hover {
    color: #00ffff;
  }
`;

const InputFieldWithToggle = styled.div`
  position: relative;
  
  input {
    padding-right: 45px;
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
  const { theme } = useUniversalTheme();
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
    role: "user"
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

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

  // Enhanced password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  // Enhanced field validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return '';
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
        return '';
      default:
        return '';
    }
  };

  const handleClose = () => {
    controls.start("exit").then(() => {
       if (window.history.length > 1) {
          navigate(-1);
       } else {
          navigate('/');
       }
    });
  };

  // Enhanced handle changes for input elements with real-time validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear field-specific error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general error when user makes changes
    if (error) setError('');
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Real-time validation for critical fields
    if (['email', 'username', 'password', 'confirmPassword', 'firstName', 'lastName'].includes(name)) {
      const fieldError = validateField(name, value);
      if (fieldError) {
        setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
      }
    }
    
    // Update password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
      // Also revalidate confirm password if it exists
      if (formData.confirmPassword) {
        const confirmError = validateField('confirmPassword', formData.confirmPassword);
        if (confirmError) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
      }
    }
    
    // Revalidate confirm password when it changes
    if (name === 'confirmPassword') {
      const confirmError = validateField('confirmPassword', value);
      if (confirmError) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
      }
    }
    
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
    
    console.log('👍 FORM SUBMISSION STARTED');
    console.log('Form data (without password):', {
      ...formData,
      password: '[REDACTED]',
      confirmPassword: '[REDACTED]'
    });
    
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
    
    // Note: Admin accounts are created through secure backend processes only
    
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
      
      console.log('🚀 Attempting registration...', {
        ...registrationData,
        password: '[REDACTED]'
      });
      
      console.log('🚀 CALLING REGISTER FUNCTION...');
      const result = await register(registrationData);
      console.log('🎆 REGISTER FUNCTION COMPLETED, result:', result);
      
      if (result.success) {
        console.log('✅ Registration successful, user logged in:', result.user);
        // AuthContext handles login automatically, redirect to appropriate dashboard
        const userRole = result.user?.role || 'user';
        
        console.log('📦 Redirecting to dashboard for role:', userRole);
        
        switch (userRole) {
          case 'admin':
            navigate('/dashboard');
            break;
          case 'trainer':
            navigate('/trainer-dashboard');
            break;
          case 'client':
            navigate('/client-dashboard');
            break;
          default:
            navigate('/user-dashboard');
        }
      } else {
        console.error('❌ Registration failed with result:', result);
        throw new Error(result.error || 'Registration failed');
      }
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
                    style={{
                      borderColor: fieldErrors.firstName ? '#ff6b9d' : '',
                      boxShadow: fieldErrors.firstName ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                    }}
                  />
                  {fieldErrors.firstName && (
                    <FieldError>{fieldErrors.firstName}</FieldError>
                  )}
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
                    style={{
                      borderColor: fieldErrors.lastName ? '#ff6b9d' : '',
                      boxShadow: fieldErrors.lastName ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                    }}
                  />
                  {fieldErrors.lastName && (
                    <FieldError>{fieldErrors.lastName}</FieldError>
                  )}
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
                  style={{
                    borderColor: fieldErrors.email ? '#ff6b9d' : '',
                    boxShadow: fieldErrors.email ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                  }}
                />
                {fieldErrors.email && (
                  <FieldError>{fieldErrors.email}</FieldError>
                )}
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
                  style={{
                    borderColor: fieldErrors.username ? '#ff6b9d' : '',
                    boxShadow: fieldErrors.username ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                  }}
                />
                {fieldErrors.username && (
                  <FieldError>{fieldErrors.username}</FieldError>
                )}
                <HelpText>
                  Username must be at least 3 characters and can only contain letters, numbers, and underscores
                </HelpText>
              </InputWrapper>
              <FormGrid>
                <InputWrapper>
                  <Label htmlFor="password">Password</Label>
                  <InputFieldWithToggle>
                    <InputField 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      name="password" 
                      placeholder="Enter password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      required 
                      disabled={isLoading}
                      style={{
                        borderColor: fieldErrors.password ? '#ff6b9d' : '',
                        boxShadow: fieldErrors.password ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                      }}
                    />
                    <PasswordToggle 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? '👁️‍🗨️' : '👁️'}
                    </PasswordToggle>
                  </InputFieldWithToggle>
                  {fieldErrors.password && (
                    <FieldError>{fieldErrors.password}</FieldError>
                  )}
                  {formData.password && (
                    <PasswordStrengthContainer>
                      <PasswordStrengthBar strength={passwordStrength} />
                      <PasswordStrengthText strength={passwordStrength}>
                        {passwordStrength < 30 ? 'Weak' :
                         passwordStrength < 60 ? 'Fair' :
                         passwordStrength < 80 ? 'Good' :
                         'Strong'} Password
                      </PasswordStrengthText>
                    </PasswordStrengthContainer>
                  )}
                  <HelpText>
                    Password must contain at least 8 characters, including uppercase & lowercase letters, numbers, and special characters (!@#$%^&*)
                  </HelpText>
                </InputWrapper>
                <InputWrapper>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <InputFieldWithToggle>
                    <InputField 
                      type={showConfirmPassword ? "text" : "password"} 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      placeholder="Confirm password" 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      required 
                      disabled={isLoading}
                      style={{
                        borderColor: fieldErrors.confirmPassword ? '#ff6b9d' : '',
                        boxShadow: fieldErrors.confirmPassword ? '0 0 0 2px rgba(255, 107, 157, 0.2)' : ''
                      }}
                    />
                    <PasswordToggle 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                    </PasswordToggle>
                  </InputFieldWithToggle>
                  {fieldErrors.confirmPassword && (
                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  )}
                </InputWrapper>
              </FormGrid>
              
              <InputWrapper>
                <Label htmlFor="role">Account Type</Label>
                <SelectField 
                  id="role" 
                  name="role" 
                  value={formData.role} 
                  onChange={handleChange} 
                  disabled={isLoading}
                >
                  <option value="user">Regular User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                </SelectField>
                <HelpText>
                  Choose the account type that best fits your needs. Admin accounts are created separately for security.
                </HelpText>
              </InputWrapper>
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
