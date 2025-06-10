import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axios from "axios";

const FormWrapper = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 10px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 1rem;
  &:focus {
    outline: 2px solid var(--primary-color);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;
  &:focus {
    outline: 2px solid var(--primary-color);
  }
`;

// Updated styling to ensure "Send Message" is clearly visible
const SubmitButton = styled(motion.button)`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 5px;
  background: linear-gradient(
    to right,
    var(--primary-color, #00ffff),
    var(--secondary-color, #7851a9)
  );
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ErrorMessage = styled.span`
  color: #ff6b6b;
  font-size: 0.9rem;
`;

const SuccessMessage = styled(motion.div)`
  background-color: rgba(0, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 5px;
  text-align: center;
  color: var(--primary-color, #00ffff);
  font-weight: bold;
`;

const ContactForm: React.FC = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [consultationType, setConsultationType] = useState<string>("general");
  const [errors, setErrors] = useState({ name: "", email: "", message: "", consultationType: "" });
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Validate form inputs
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { name: "", email: "", message: "", consultationType: "" };

    if (!name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }
    if (!message.trim()) {
      newErrors.message = "Message is required";
      isValid = false;
    }
    if (!consultationType) {
      newErrors.consultationType = "Please select a consultation type";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setSubmitError("");
    setErrors({ name: "", email: "", message: "", consultationType: "" });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSubmitting(true);
    console.log('📤 Starting form submission...');

    try {
      // Map consultation type to priority
      const priorityMap = {
        'general': 'normal',
        'consultation': 'high',
        'urgent-consultation': 'urgent',
        'personal-training': 'high',
        'nutrition-coaching': 'normal',
        'injury-rehab': 'urgent'
      };
      
      const priority = priorityMap[consultationType] || 'normal';
      
      // FIXED: Use correct API URL for production
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                          (window.location.origin.includes('sswanstudios.com') 
                            ? 'https://ss-pt-new.onrender.com' 
                            : 'http://localhost:5000');
      
      const submitUrl = `${API_BASE_URL}/api/contact`;
      console.log('📍 Submitting to:', submitUrl);
      console.log('📦 Data:', { name, email, consultationType, priority });
      
      const response = await axios.post(submitUrl, { 
        name, 
        email, 
        message, 
        consultationType,
        priority 
      });
      
      console.log('✅ Contact submission successful:', response.data);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName("");
        setEmail("");
        setMessage("");
        setConsultationType("general");
      }, 5000); // Show success message for 5 seconds
      
    } catch (error) {
      console.error("❌ Error sending contact message:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      
      // Set user-friendly error message
      if (error.response?.status === 404) {
        setSubmitError("Contact service not found. Please try again later or contact us directly.");
      } else if (error.response?.status >= 500) {
        setSubmitError("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setSubmitError("Network error. Please check your connection and try again.");
      } else {
        setSubmitError(`Failed to send message: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormWrapper
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <Input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Name"
      />
      {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
      />
      {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}

      <select
        value={consultationType}
        onChange={(e) => setConsultationType(e.target.value)}
        style={{
          padding: '0.75rem',
          border: 'none',
          borderRadius: '5px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
        aria-label="Consultation Type"
      >
        <option value="general" style={{ background: '#2a2a2a', color: '#ffffff' }}>General Inquiry</option>
        <option value="consultation" style={{ background: '#2a2a2a', color: '#ffffff' }}>Free Consultation</option>
        <option value="urgent-consultation" style={{ background: '#2a2a2a', color: '#ffffff' }}>Urgent Consultation</option>
        <option value="personal-training" style={{ background: '#2a2a2a', color: '#ffffff' }}>Personal Training</option>
        <option value="nutrition-coaching" style={{ background: '#2a2a2a', color: '#ffffff' }}>Nutrition Coaching</option>
        <option value="injury-rehab" style={{ background: '#2a2a2a', color: '#ffffff' }}>Injury Rehabilitation</option>
      </select>
      {errors.consultationType && <ErrorMessage>{errors.consultationType}</ErrorMessage>}

      <TextArea
        placeholder="Message - Please describe your fitness goals, current situation, and how we can help you achieve extraordinary results"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Message"
      />
      {errors.message && <ErrorMessage>{errors.message}</ErrorMessage>}

      <SubmitButton
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
        style={{ 
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </SubmitButton>

      {submitError && (
        <ErrorMessage style={{ 
          background: 'rgba(239, 68, 68, 0.2)', 
          padding: '1rem', 
          borderRadius: '5px',
          border: '1px solid #ef4444'
        }}>
          {submitError}
        </ErrorMessage>
      )}

      {submitted && (
        <SuccessMessage
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Message sent successfully!
        </SuccessMessage>
      )}
    </FormWrapper>
  );
};

export default ContactForm;
