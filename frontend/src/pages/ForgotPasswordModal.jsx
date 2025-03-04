// src/pages/ForgotPasswordModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/* 
  ModalOverlay:
  A full-screen fixed container with a solid overlay.
*/
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: rgba(0, 0, 0, 0.9);
`;

/* 
  VideoBackground:
  A full-screen background video with reduced opacity.
*/
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.3;
`;

/* 
  ModalContent:
  A centered panel for the forgot password form that allows vertical scrolling if needed.
*/
const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #222;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

/* 
  CloseButton:
  A circular button to close the modal.
*/
const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: 2px solid var(--neon-blue);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: var(--neon-blue);
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: var(--neon-blue);
    color: #000;
  }
`;

/* 
  InputField:
  Styled input field for the form.
*/
const InputField = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 2px solid var(--royal-purple);
  border-radius: 5px;
  background: #111;
  color: #fff;
  
  &:focus {
    outline: none;
    border-color: var(--neon-blue);
  }
`;

/* 
  Button:
  Styled button for form submission.
*/
const Button = styled.button`
  width: 100%;
  padding: 10px;
  background: var(--neon-blue);
  border: none;
  border-radius: 5px;
  color: #000;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: var(--royal-purple);
  }
`;

/* 
  ForgotPasswordModal Component:
  Implements the forgot password modal with an email input field.
*/
const ForgotPasswordModal = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth(); // Ensure your AuthContext provides this function
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Close the modal by navigating back
  const handleClose = () => {
    navigate(-1);
  };

  // Handle form submission for forgot password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await forgotPassword(email);
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      {/* Video background */}
      <VideoBackground autoPlay loop muted>
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Forgot Password Modal Content */}
      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Forgot Password
        </h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {message && (
          <p style={{ color: "green", textAlign: "center" }}>{message}</p>
        )}
        <form onSubmit={handleSubmit}>
          <InputField
            type="email"
            name="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit">Reset Password</Button>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ForgotPasswordModal;
