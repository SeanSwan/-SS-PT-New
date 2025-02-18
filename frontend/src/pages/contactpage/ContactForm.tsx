// src/Components/Contact/ContactForm.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

/**
 * FormWrapper
 * -----------
 * Container for the contact form with a translucent background, blur effect, and rounded corners.
 */
const FormWrapper = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 10px;
  backdrop-filter: blur(10px);
`;

/**
 * Input
 * -----
 * Base styling for text inputs.
 */
const Input = styled.input`
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  font-size: 1rem;

  &:focus {
    outline: 2px solid #00FFFF;
  }
`;

/**
 * TextArea
 * --------
 * Styling for the message textarea with resize support.
 */
const TextArea = styled.textarea`
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;

  &:focus {
    outline: 2px solid #00FFFF;
  }
`;

/**
 * SubmitButton
 * ------------
 * A modern, gradient-styled submit button that scales on hover and tap.
 */
const SubmitButton = styled(motion.button)`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 5px;
  background: linear-gradient(to right, #00FFFF, #8A2BE2);
  color: #FFFFFF;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

/**
 * ErrorMessage
 * ------------
 * Displays validation error messages in a noticeable color.
 */
const ErrorMessage = styled.span`
  color: #FF6B6B;
  font-size: 0.9rem;
`;

/**
 * SuccessMessage
 * --------------
 * A message that appears when the form is successfully submitted.
 */
const SuccessMessage = styled(motion.div)`
  background-color: rgba(0, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 5px;
  text-align: center;
  color: #00FFFF;
  font-weight: bold;
`;

const ContactForm: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [errors, setErrors] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Validate form inputs and update error state
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { name: '', email: '', message: '' };

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    if (!message.trim()) {
      newErrors.message = 'Message is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission; simulate sending data then reset form after a delay
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Sending email to loveswantstudios@protonmail.com', { name, email, message });
      setSubmitted(true);
      setTimeout(() => {
        setName('');
        setEmail('');
        setMessage('');
        setSubmitted(false);
      }, 3000);
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
