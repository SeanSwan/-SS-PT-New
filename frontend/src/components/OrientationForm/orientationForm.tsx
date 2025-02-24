/**
 * OrientationForm.tsx
 * A responsive, modernized orientation signup form with improved styling
 * for both desktop and mobile. Aligns with your neon blue/purple/white theme.
 */

import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

/**
 * OrientationFormProps:
 * onClose -> Called when the modal or form is closed.
 */
interface OrientationFormProps {
  onClose: () => void;
}

/* ===================== Styled Components ===================== */

/** 
 * ModalOverlay 
 * Covers the entire viewport with a semi-transparent background.
 */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Ensure mobile devices handle overflow properly */
  overflow-y: auto;
`;

/**
 * ModalContainer
 * The main content box for the orientation form.
 */
const ModalContainer = styled.div`
  background: var(--light-bg);
  color: var(--text-dark);
  width: 90%;
  max-width: 600px; /* Slightly wider for a modern desktop layout */
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  margin: 2rem 1rem; /* Provide spacing for mobile */
  padding: 2rem;

  @media (max-width: 768px) {
    /* Mobile-friendly adjustments */
    padding: 1.5rem;
    margin: 1rem;
  }
`;

/**
 * CloseButton
 * Positioned in the top-right corner to allow easy dismissal on desktop/mobile.
 */
const CloseButton = styled(motion.button)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 2px solid var(--primary-color);
  border-radius: 50%;
  width: 35px;
  height: 35px;
  font-size: 1.2rem;
  color: var(--primary-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;

  &:hover {
    background: var(--primary-color);
    color: var(--light-bg);
  }

  @media (max-width: 768px) {
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }
`;

const ModalTitle = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--primary-color);
  font-size: 1.5rem;
`;

const ErrorMessage = styled.p`
  color: red;
  text-align: center;
  margin-bottom: 1rem;
`;

/**
 * Styled form and fields
 * We'll use a grid layout for more modern, flexible arrangement on larger screens.
 */
const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  grid-gap: 1rem;

  @media (min-width: 768px) {
    /* On tablets and up, display a two-column layout for certain fields if desired. */
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: auto;
  }
`;

/**
 * FormGroup 
 * Each labeled input or select is grouped in a container.
 */
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  grid-column: span 2; /* By default, span both columns unless overridden */
  
  label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: var(--text-dark);
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 3px var(--primary-color);
    }
  }

  small {
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: var(--grey);
  }
`;

/**
 * ColumnSplit 
 * A helper class for certain fields we want side by side on larger screens.
 */
const ColumnSplit = styled(FormGroup)`
  @media (min-width: 768px) {
    grid-column: span 1; /* Occupy only one column for side-by-side arrangement */
  }
`;

const SubmitButton = styled(motion.button)`
  grid-column: span 2; /* Submit button spans entire width */
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: var(--text-dark);
  cursor: pointer;
  transition: background 0.3s ease;
  margin: 0 auto;

  &:hover {
    background: var(--secondary-color);
    color: var(--light-bg);
  }
`;

const ScheduleLinkContainer = styled.div`
  text-align: center;
  margin-top: 1rem;
  grid-column: span 2;
`;

const ScheduleLink = styled(Link)`
  color: var(--secondary-color);
  font-weight: bold;
  text-decoration: underline;
`;

/**
 * OrientationForm
 * A modern, responsive orientation signup form that matches your neon blue/purple/white theme.
 */
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
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
      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Orientation form submitted:", formData);
      setSubmitted(true);
    } catch (apiError) {
      setError("An error occurred while submitting the form. Please try again.");
      console.error("Orientation form submission error:", apiError);
    }
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        {/* Close Button in the top-right corner */}
        <CloseButton
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
        >
          &times;
        </CloseButton>

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
                Please include any pre‑existing conditions or injuries that may affect your training.
              </small>
            </FormGroup>

            <FormGroup>
              <label htmlFor="waiverInitials">Waiver Initials *</label>
              <input
                type="text"
                id="waiverInitials"
                name="waiverInitials"
                value={formData.waiverInitials}
                onChange={handleChange}
                required
              />
              <small>
                Type your initials to confirm that you have read and agree to the waiver terms.
              </small>
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

        {!submitted && (
          <ScheduleLinkContainer>
            <ScheduleLink to="/schedule">
              View My Schedule
            </ScheduleLink>
          </ScheduleLinkContainer>
        )}

        {/* Additional close button at the bottom for mobile */}
        {!submitted && (
          <SubmitButton
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ marginTop: "1rem", background: "#ccc", color: "#000" }}
          >
            Close
          </SubmitButton>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default OrientationForm;
