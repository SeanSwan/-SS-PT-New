// src/components/OrientationForm.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

/**
 * Styled Components:
 * These components ensure a consistent visual style and layout.
 */

// Full-screen overlay for the modal.
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

// Container for the modal content.
const ModalContainer = styled.div`
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  color: #333;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
`;

// Title styling for the modal.
const ModalTitle = styled.h2`
  text-align: center;
  margin-bottom: 1rem;
  color: var(--neon-blue, #00ffff);
`;

// A container for each form field, including label and input.
const ModalField = styled.div`
  margin-bottom: 1rem;
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  input,
  textarea,
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
`;

// Styled button that matches your project’s design.
const ModalButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: var(--neon-blue, #00ffff);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease;
  display: block;
  margin: 0 auto;
  &:hover {
    background: var(--royal-purple, #7851a9);
  }
`;

/**
 * Props interface for the OrientationForm.
 * The onClose prop allows the parent component to control closing the modal.
 */
interface OrientationFormProps {
  onClose: () => void;
}

/**
 * OrientationForm Component
 *
 * This form gathers client data necessary for a personal training orientation,
 * following NASM guidelines. Key fields include:
 *
 * 1. Full Name, Email, Phone: Essential contact details.
 * 2. Health Information: Captures current health status and pre‑existing conditions.
 * 3. Waiver Initials: Confirms the client has read and agrees to waiver terms.
 * 4. Training Goals: Helps tailor the orientation session.
 * 5. Experience Level: Provides insight into the client's fitness background.
 *
 * Controlled components are used to manage form state, ensuring that the UI always reflects the current state.
 * In a real-world scenario, the handleSubmit function would send the data to a backend API.
 */
const OrientationForm: React.FC<OrientationFormProps> = ({ onClose }) => {
  // Define the form's state. Each property corresponds to an input field.
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    healthInfo: '',
    waiverInitials: '',
    trainingGoals: '',
    experienceLevel: '', // Options: "Beginner", "Intermediate", "Advanced"
  });

  // Track whether the form has been successfully submitted.
  const [submitted, setSubmitted] = useState(false);

  // State to hold error messages (if any).
  const [error, setError] = useState('');

  /**
   * handleChange:
   * Updates form state as the user types.
   * This is an example of a controlled component where the React state is the "single source of truth."
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * handleSubmit:
   * Validates the form and simulates an asynchronous API call.
   * In production, replace the simulated call with an actual API request.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation: ensure all required fields are filled.
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.healthInfo ||
      !formData.waiverInitials
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      // Simulate an API call delay.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // In a real application, you would replace the console.log below with an API call.
      console.log('Orientation form submitted:', formData);
      setSubmitted(true);
    } catch (apiError) {
      setError('An error occurred while submitting the form. Please try again.');
      console.error('Orientation form submission error:', apiError);
    }
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalTitle>Orientation Signup</ModalTitle>
        {submitted ? (
          // Display a success message after form submission.
          <p style={{ textAlign: 'center', color: 'green' }}>
            Thank you for signing up! We will contact you shortly to schedule your orientation.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Display error message if validation fails */}
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            {/* Full Name Field */}
            <ModalField>
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </ModalField>

            {/* Email Field */}
            <ModalField>
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </ModalField>

            {/* Phone Field */}
            <ModalField>
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </ModalField>

            {/* Health Information Field */}
            <ModalField>
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
            </ModalField>

            {/* Waiver Initials Field */}
            <ModalField>
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
            </ModalField>

            {/* Training Goals Field */}
            <ModalField>
              <label htmlFor="trainingGoals">Training Goals</label>
              <textarea
                id="trainingGoals"
                name="trainingGoals"
                rows={3}
                value={formData.trainingGoals}
                onChange={handleChange}
                placeholder="e.g., improve strength, lose weight, etc."
              />
            </ModalField>

            {/* Experience Level Field */}
            <ModalField>
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
            </ModalField>

            {/* Submit Button */}
            <ModalButton type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Submit Orientation
            </ModalButton>
          </form>
        )}
        {/* Close Button */}
        <ModalButton
          onClick={onClose}
          style={{ marginTop: '1rem', background: '#ccc', color: '#000' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Close
        </ModalButton>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default OrientationForm;
