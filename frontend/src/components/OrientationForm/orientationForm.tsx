import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Import the logo (ensure the path is correct)
import Logo from "../../assets/Logo.png";

interface OrientationFormProps {
  onClose: () => void;
}

/* -------------------- Styled Components -------------------- */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1500;
  overflow-y: auto;
  background: linear-gradient(45deg, rgba(0,255,255,0.5), rgba(120,81,169,0.5));
`;

const ModalContainer = styled.div`
  background: #111;
  color: #fff;
  width: 90%;
  max-width: 400px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
  position: relative;
  margin: 2rem auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 1rem;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: 2px solid #00ffff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: #00ffff;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: #00ffff;
    color: #000;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const LogoCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

const LogoImage = styled.img`
  width: 120%;
  height: 120%;
  object-fit: contain;
`;

const HeaderText = styled.h1`
  font-size: 1.5rem;
  color: #00ffff;
  margin: 0;
`;

const ModalTitle = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: #00ffff;
  font-size: 1.5rem;
`;

const ErrorMessage = styled.p`
  color: red;
  text-align: center;
  margin-bottom: 1rem;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;

  label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1rem;
    background: #222;
    color: #fff;

    &:focus {
      outline: none;
      border-color: #00ffff;
      box-shadow: 0 0 3px #00ffff;
    }
  }

  small {
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: #ccc;
  }
`;

/* New Waiver Section styled component */
const WaiverSection = styled.div`
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.85rem;
  line-height: 1.4;
  color: #fff;
  margin-bottom: 1rem;
`;

const SubmitButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: #00ffff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease;
  margin: 0 auto;

  &:hover {
    background: #7851a9;
    color: #fff;
  }
`;

const ScheduleLinkContainer = styled.div`
  text-align: center;
  margin-top: 1rem;
  grid-column: span 2;
`;

const ScheduleLink = styled(Link)`
  color: #7851a9;
  font-weight: bold;
  text-decoration: underline;
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
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
        >
          &times;
        </CloseButton>

        <ModalHeader>
          <LogoCircle>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>

        <ModalTitle>Orientation Signup</ModalTitle>
        {submitted ? (
          <p style={{ textAlign: "center", color: "green", marginTop: "2rem" }}>
            Thank you for signing up! We will contact you shortly to schedule your orientation.
          </p>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FormGroup>
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="healthInfo">Health Information *</label>
              <textarea
                id="healthInfo"
                name="healthInfo"
                rows={4}
                value={formData.healthInfo}
                onChange={handleChange}
                required
              />
              <small>
                Include any pre‑existing conditions or injuries that may affect your training.
              </small>
            </FormGroup>

            {/* Waiver Section */}
            <FormGroup>
              <label>Training Waiver</label>
              <WaiverSection>{waiverText}</WaiverSection>
            </FormGroup>

            <FormGroup>
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

            <FormGroup>
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

            <FormGroup>
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
            >
              Submit Orientation
            </SubmitButton>
          </Form>
        )}

        <ScheduleLinkContainer>
          <ScheduleLink to="/schedule">View My Schedule</ScheduleLink>
        </ScheduleLinkContainer>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default OrientationForm;

/* -------------------- Additional Styled Component -------------------- */

