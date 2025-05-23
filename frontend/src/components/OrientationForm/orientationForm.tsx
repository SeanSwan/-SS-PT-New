import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import ReactDOM from 'react-dom';

// Import the logo (ensure the path is correct)
import Logo from "../../assets/Logo.png";

// Global style to prevent scrolling when modal is open and ensure consistent styling
const GlobalStyle = createGlobalStyle`
  body.orientation-modal-open {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }
`;

interface OrientationFormProps {
  onClose: () => void;
  returnToStore?: boolean;
}

/* -------------------- Animations -------------------- */
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5),
                0 0 10px rgba(0, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8),
                0 0 30px rgba(0, 255, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.5),
                0 0 10px rgba(0, 255, 255, 0.3);
  }
`;

/* -------------------- Styled Components -------------------- */

// The full-screen overlay - with very high z-index to ensure it's on top of everything
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999; /* Very high z-index to ensure it's above everything */
  display: flex;
  justify-content: center;
  background: rgba(13, 12, 34, 0.95); /* Deep blue-purple with high opacity */
  backdrop-filter: blur(8px);
  overflow-y: auto;
  
  /* Improved scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00ffff, #7851a9);
    border-radius: 4px;
  }
`;

// Content container with fixed max-width
const ContentContainer = styled.div`
  width: 100%;
  max-width: 550px;
  margin: 0 auto;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 10px;
    max-height: 100vh;
  }
  
  @media (max-width: 480px) {
    padding: 5px;
  }
`;

// Form container
const ModalContainer = styled(motion.div)`
  background: rgba(17, 17, 34, 0.85);
  color: #fff;
  width: 100%;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
  position: relative;
  padding: 2rem 2rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: auto 0;
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 10px;
    margin: 5px 0;
  }
  
  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
    margin: 0;
    border-radius: 8px;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.5);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  font-size: 1.3rem;
  color: #00ffff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &:hover {
    color: white;
    animation: ${glow} 2s infinite;
  }
  
  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
    font-size: 1.1rem;
    top: 8px;
    right: 8px;
  }
`;

const FormHeader = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  
  @media (max-width: 480px) {
    margin-bottom: 15px;
  }
`;

const LogoCircle = styled(motion.div)`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.9), rgba(120, 81, 169, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  position: relative;
  z-index: 1;
  animation: ${float} 6s ease-in-out infinite;
  
  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
    margin-bottom: 10px;
  }
`;

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5));
  padding: 12px;
`;

const FormTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 1.5rem;
  color: white;
  font-size: 1.5rem;
  font-weight: 300;
  position: relative;
  letter-spacing: 1px;
  
  &:after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 480px) {
    font-size: 1.3rem;
    margin-bottom: 1.25rem;
    
    &:after {
      bottom: -6px;
      width: 50px;
    }
  }
`;

const ErrorMessage = styled(motion.p)`
  color: #ff4d4d;
  text-align: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 0, 0, 0.2);
  
  @media (max-width: 480px) {
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }
`;

const Form = styled(motion.form)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.75rem;
  }
`;

const FormGroup = styled(motion.div)`
  display: flex;
  flex-direction: column;

  label {
    font-weight: 400;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.5px;
    font-size: 0.95rem;
    
    @media (max-width: 480px) {
      margin-bottom: 0.25rem;
      font-size: 0.85rem;
    }
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.95rem;
    background: rgba(30, 30, 60, 0.3);
    color: #fff;
    transition: all 0.3s ease;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);

    &:focus {
      outline: none;
      border-color: #00ffff;
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
      background: rgba(30, 30, 60, 0.5);
    }
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    
    @media (max-width: 480px) {
      padding: 0.6rem;
      font-size: 0.9rem;
      border-radius: 6px;
    }
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300ffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 40px;
  }

  small {
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
    
    @media (max-width: 480px) {
      font-size: 0.7rem;
      margin-top: 0.2rem;
    }
  }
  
  /* Adjust the size of textarea */
  textarea {
    height: auto;
    
    &#healthInfo {
      height: 80px;
      
      @media (max-width: 480px) {
        height: 70px;
      }
    }
    
    &#trainingGoals {
      height: 70px;
      
      @media (max-width: 480px) {
        height: 60px;
      }
    }
  }
`;

/* Waiver Section styled component */
const WaiverSection = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  max-height: 120px;
  overflow-y: auto;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  position: relative;
  
  /* Stylized scrollbar */
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00ffff, #7851a9);
    border-radius: 3px;
  }
  
  /* Gradient fade at the bottom to indicate scrollable content */
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 25px;
    background: linear-gradient(to top, rgba(30, 30, 60, 0.9), transparent);
    pointer-events: none;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    font-size: 0.75rem;
    max-height: 100px;
    line-height: 1.4;
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.9), rgba(120, 81, 169, 0.9));
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  color: white;
  cursor: pointer;
  margin: 0.75rem auto 0.25rem;
  display: block;
  position: relative;
  overflow: hidden;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  
  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    transform: translateY(-3px);
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem 1.25rem;
    font-size: 0.95rem;
    border-radius: 6px;
    margin-top: 0.5rem;
  }
`;

const SuccessMessage = styled(motion.div)`
  text-align: center;
  color: #00ffff;
  margin: 1.5rem 0 1rem;
  padding: 1.25rem;
  border-radius: 10px;
  position: relative;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  
  p {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  span {
    display: block;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }
  
  &:before {
    content: "✓";
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    margin: 1rem 0 0.5rem;
    
    p {
      font-size: 0.95rem;
      margin-bottom: 0.3rem;
    }
    
    span {
      font-size: 0.8rem;
    }
    
    &:before {
      width: 35px;
      height: 35px;
      font-size: 1.1rem;
      top: -17px;
    }
  }
`;

const ScheduleLinkContainer = styled(motion.div)`
  text-align: center;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 480px) {
    margin-top: 0.5rem;
  }
`;

const ScheduleLink = styled(Link)`
  color: #00ffff;
  font-weight: 500;
  position: relative;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  
  &:hover {
    color: white;
    background: rgba(0, 255, 255, 0.1);
  }
  
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.3rem 0.6rem;
  }
`;

/* -------------------- OrientationForm Component -------------------- */

const OrientationForm: React.FC<OrientationFormProps> = ({ onClose, returnToStore = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    healthInfo: "",
    waiverInitials: "",
    trainingGoals: "",
    experienceLevel: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const controls = useAnimation();
  
  // Store the scroll position when the form opens
  const scrollPositionRef = useRef(0);
  
  // Save scroll position and prevent scrolling when modal opens
  useEffect(() => {
    scrollPositionRef.current = window.scrollY;
    document.body.classList.add('orientation-modal-open');
    
    return () => {
      document.body.classList.remove('orientation-modal-open');
      // Restore scroll position when form closes
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, []);

  // Handle close with proper navigation
  const handleClose = () => {
    // First remove the body class to restore scrolling
    document.body.classList.remove('orientation-modal-open');
    
    // Then call the provided onClose function
    if (onClose) {
      onClose();
    }
    
    // If returnToStore is true, navigate back to the store page
    if (returnToStore) {
      navigate('/store');
    }
    
    // Restore the scroll position
    window.scrollTo(0, scrollPositionRef.current);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: 20,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  // Shortened waiver text to save space
  const waiverText = `
By participating in training sessions with SwanStudios, I acknowledge and understand that personal training involves inherent risks, including but not limited to physical injury. I represent that I am in good health, free of any condition that would impair my ability to participate in such physical activities. I voluntarily assume all risks associated with training in various environments (e.g., in-home, park, beach, or other outdoor locations). I hereby release and hold harmless SwanStudios, its trainers, employees, and agents from any and all liability for injuries, damages, or losses arising from my participation.
`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation: Ensure required fields are provided.
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.healthInfo ||
      !formData.waiverInitials
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // API call to submit orientation
      const response = await fetch('/api/orientation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          submittedAt: new Date().toISOString(),
          status: 'pending',
          source: 'website'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit orientation');
      }

      const result = await response.json();
      console.log("Orientation form submitted:", result);
      setSubmitted(true);
      
    } catch (apiError) {
      setError(apiError.message || "An error occurred while submitting the form. Please try again.");
      console.error("Orientation form submission error:", apiError);
    }
  };

  // Create a portal to render the form at the root level
  return ReactDOM.createPortal(
    <AnimatePresence>
      <GlobalStyle />
      <ModalOverlay 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ContentContainer>
          <ModalContainer 
            variants={containerVariants}
            initial="hidden"
            animate={controls}
            exit="exit"
          >
            <CloseButton
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              aria-label="Close orientation form"
            >
              &times;
            </CloseButton>

            <FormHeader>
              <LogoCircle initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
                <LogoImage src={Logo} alt="SwanStudios Logo" />
              </LogoCircle>
            </FormHeader>

            <FormTitle 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Orientation Signup
            </FormTitle>
            
            {submitted ? (
              <SuccessMessage 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8 }}
              >
                <p>Thank you for signing up!</p>
                <span>We will contact you shortly to schedule your orientation.</span>
              </SuccessMessage>
            ) : (
              <Form 
                onSubmit={handleSubmit}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                {error && (
                  <ErrorMessage 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </ErrorMessage>
                )}

                <FormGroup variants={itemVariants}>
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="phone">Phone *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="(123) 456-7890"
                  />
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="healthInfo">Health Information *</label>
                  <textarea
                    id="healthInfo"
                    name="healthInfo"
                    value={formData.healthInfo}
                    onChange={handleChange}
                    required
                    placeholder="List any pre-existing conditions, injuries, or health concerns"
                  />
                  <small>
                    Include any pre‑existing conditions or injuries that may affect your training.
                  </small>
                </FormGroup>

                {/* Waiver Section */}
                <FormGroup variants={itemVariants}>
                  <label>Training Waiver</label>
                  <WaiverSection variants={itemVariants}>{waiverText}</WaiverSection>
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="waiverInitials">Waiver Initials *</label>
                  <input
                    type="text"
                    id="waiverInitials"
                    name="waiverInitials"
                    value={formData.waiverInitials}
                    onChange={handleChange}
                    placeholder="Type your initials to confirm"
                    required
                  />
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="trainingGoals">Training Goals</label>
                  <textarea
                    id="trainingGoals"
                    name="trainingGoals"
                    value={formData.trainingGoals}
                    onChange={handleChange}
                    placeholder="e.g., improve strength, lose weight, etc."
                  />
                </FormGroup>

                <FormGroup variants={itemVariants}>
                  <label htmlFor="experienceLevel">Experience Level</label>
                  <select
                    id="experienceLevel"
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                  >
                    <option value="">Select your experience level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </FormGroup>

                <SubmitButton
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  variants={itemVariants}
                >
                  Submit Orientation
                </SubmitButton>
              </Form>
            )}

            <ScheduleLinkContainer variants={itemVariants}>
              <ScheduleLink to="/schedule">View My Schedule</ScheduleLink>
            </ScheduleLinkContainer>
          </ModalContainer>
        </ContentContainer>
      </ModalOverlay>
    </AnimatePresence>,
    document.body // This renders the modal directly into the body element
  );
};

export default OrientationForm;