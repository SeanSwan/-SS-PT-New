import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation } from "framer-motion";
import { Link } from "react-router-dom";

// Import the logo (ensure the path is correct)
import Logo from "../../assets/Logo.png";

interface OrientationFormProps {
  onClose: () => void;
}

/* -------------------- Animations -------------------- */
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

/* -------------------- Styled Components -------------------- */

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1500;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(
    135deg, 
    rgba(10, 10, 30, 0.8),
    rgba(30, 30, 60, 0.8)
  );
  backdrop-filter: blur(10px);
`;

const ModalContainer = styled(motion.div)`
  background: rgba(17, 17, 34, 0.85);
  color: #fff;
  width: 90%;
  max-width: 500px;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
  position: relative;
  margin: 2rem auto;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
      rgba(0, 255, 255, 0.05) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 5s linear infinite;
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 1rem;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.5);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: #00ffff;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, rgba(0, 255, 255, 1), rgba(120, 81, 169, 1));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
  }

  &:hover {
    color: white;
    animation: ${glow} 2s infinite;
  }
`;

const ModalHeader = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
  position: relative;
`;

const GlowingCircle = styled.div`
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(0, 255, 255, 0.2) 0%,
    rgba(0, 255, 255, 0) 70%
  );
  animation: ${pulseGlow} 4s infinite;
  z-index: 0;
`;

const LogoCircle = styled(motion.div)`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.9), rgba(120, 81, 169, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  position: relative;
  z-index: 1;
  animation: ${float} 6s ease-in-out infinite;
  
  &:after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, rgba(0, 255, 255, 1), rgba(120, 81, 169, 1));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
  }
`;

const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5));
`;

const HeaderText = styled(motion.h1)`
  font-size: 1.8rem;
  background: linear-gradient(
    to right,
    #00ffff,
    #7851a9,
    #00ffff
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
  margin: 0;
  letter-spacing: 1px;
  font-weight: 300;
`;

const ModalTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 2rem;
  color: white;
  font-size: 1.6rem;
  font-weight: 300;
  position: relative;
  letter-spacing: 1px;
  
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 70px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
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
`;

const Form = styled(motion.form)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
`;

const FormGroup = styled(motion.div)`
  display: flex;
  flex-direction: column;

  label {
    font-weight: 400;
    margin-bottom: 0.75rem;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.5px;
    font-size: 0.95rem;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 1rem;
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
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300ffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 40px;
  }

  small {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
  }
`;

/* New Waiver Section styled component */
const WaiverSection = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  padding: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
  position: relative;
  
  /* Stylized scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
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
    height: 30px;
    background: linear-gradient(to top, rgba(30, 30, 60, 0.9), transparent);
    pointer-events: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 0.85rem 2rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.9), rgba(120, 81, 169, 0.9));
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  color: white;
  cursor: pointer;
  margin: 0.5rem auto;
  display: block;
  position: relative;
  overflow: hidden;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }
  
  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    transform: translateY(-3px);
    
    &:before {
      left: 100%;
    }
  }
`;

const SuccessMessage = styled(motion.div)`
  text-align: center;
  color: #00ffff;
  margin: 2rem 0;
  padding: 1.5rem;
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
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
`;

const ScheduleLinkContainer = styled(motion.div)`
  text-align: center;
  margin-top: 2rem;
  grid-column: span 2;
`;

const ScheduleLink = styled(Link)`
  color: #00ffff;
  font-weight: 500;
  position: relative;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  
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
`;

/* -------------------- OrientationForm Component -------------------- */

const OrientationForm: React.FC<OrientationFormProps> = ({ onClose }) => {
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

  // Animation variants
  const containerVariants = {
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

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, delay: 0.2 }
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

  // Updated waiver text based on NASM and general legal recommendations.
  const waiverText = `
By participating in training sessions with SwanStudios, I acknowledge and understand that personal training involves inherent risks, including but not limited to physical injury. I represent that I am in good health, free of any condition that would impair my ability to participate in such physical activities. I voluntarily assume all risks associated with training in various environments (e.g., in-home, park, beach, or other outdoor locations). I hereby release and hold harmless SwanStudios, its trainers, employees, and agents from any and all liability for injuries, damages, or losses arising from my participation. I understand that this waiver does not waive any rights or remedies available to me under applicable law.
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
      // Simulate an API call – replace with your actual API request.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Orientation form submitted:", formData);
      setSubmitted(true);
    } catch (apiError) {
      setError("An error occurred while submitting the form. Please try again.");
      console.error("Orientation form submission error:", apiError);
    }
  };

  return (
    <ModalOverlay 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ModalContainer 
        onClick={(e) => e.stopPropagation()}
        variants={containerVariants}
        initial="hidden"
        animate={controls}
        exit="exit"
      >
        <CloseButton
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
        >
          &times;
        </CloseButton>

        <ModalHeader variants={headerVariants}>
          <GlowingCircle />
          <LogoCircle initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
            SwanStudios
          </HeaderText>
        </ModalHeader>

        <ModalTitle 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Orientation Signup
        </ModalTitle>
        
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
                rows={4}
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
                rows={3}
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
    </ModalOverlay>
  );
};

export default OrientationForm;