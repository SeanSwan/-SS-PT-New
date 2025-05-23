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
  const [errors, setErrors] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Validate form inputs
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { name: "", email: "", message: "" };

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

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Use the environment variable to point to your backend API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      await axios.post(`${API_BASE_URL}/api/contact`, { name, email, message });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName("");
        setEmail("");
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error sending contact message:", error);
      // Optionally, update error state to show user feedback
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

      <TextArea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Message"
      />
      {errors.message && <ErrorMessage>{errors.message}</ErrorMessage>}

      <SubmitButton
        type="submit"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Send Message
      </SubmitButton>

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
