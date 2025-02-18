// src/pages/LoginModal.jsx
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
  A centered panel for the login form that allows vertical scrolling if needed.
*/
const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;              /* Ensures the modal doesn't exceed 90% of viewport height */
  overflow-y: auto;              /* Enables vertical scrolling */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on mobile devices */
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
  Styled button for the login action.
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
  ForgotPasswordLink:
  A text link that allows users to navigate to the forgot password flow.
*/
const ForgotPasswordLink = styled.div`
  text-align: right;
  margin-bottom: 15px;
  font-size: 0.9rem;
  color: var(--neon-blue);
  cursor: pointer;

  &:hover {
    color: var(--royal-purple);
  }
`;

/* 
  LoginModal Component:
  Implements the login modal with a forgot password option.
*/
const LoginModal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // Close the modal by navigating back
  const handleClose = () => {
    navigate(-1);
  };

  // Update form fields as inputs change
  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(credentials.username, credentials.password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  // Handle navigation to the forgot password page/modal
  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <ModalOverlay onClick={handleClose}>
      {/* Video background */}
      <VideoBackground autoPlay loop muted>
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Login Modal Content */}
      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <InputField
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleChange}
            required
          />
          <InputField
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            required
          />
          <ForgotPasswordLink onClick={handleForgotPassword}>
            Forgot Password?
          </ForgotPasswordLink>
          <Button type="submit">Login</Button>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default LoginModal;
