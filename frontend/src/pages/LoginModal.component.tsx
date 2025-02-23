// src/pages/LoginModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// FullPageContainer covers the entire viewport with a cool gradient background.
const FullPageContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(45deg, rgba(0,255,255,0.5), rgba(120,81,169,0.5));
  z-index: 1500;
  overflow: auto;
`;

// VideoBackground provides a dynamic visual effect behind the login modal.
// Replace the video source with your desired background video.
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.6;
`;

// ModalContent centers the login form and provides a modal-like appearance.
const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;  /* Ensures the modal doesn't exceed 90% of viewport height */
  overflow-y: auto;  /* Enables vertical scrolling if content is too tall */
  background: #222;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

// CloseButton allows dismissing the modal and returning to the underlying page.
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

// InputField styles the text input fields uniformly.
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

// Button styles the submit button with a modern look.
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

/**
 * LoginModal Component
 *
 * This full-page login modal is used by both clients and administrators.
 * It features:
 * - A full viewport gradient background with a video layer.
 * - A dismissible modal form (click outside or use the X button).
 * - On form submission, it calls the AuthContext's login method.
 * - After login, it checks the user's role and redirects:
 *   - Admin users → /admin-dashboard
 *   - Client users → /client-dashboard
 *
 * Security Note: In production, ensure the backend properly hashes passwords,
 * generates and validates JWTs, and uses HTTPS.
 */
const LoginModal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // handleClose dismisses the modal and returns to the previous page.
  const handleClose = () => {
    navigate(-1);
  };

  // handleChange updates the login form state.
  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // handleSubmit logs in the user, then checks their role to redirect accordingly.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await login(credentials.username, credentials.password);
      if (response.user) {
        if (response.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/client-dashboard");
        }
      }
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <FullPageContainer onClick={handleClose}>
      {/* Video background for dynamic visuals */}
      <VideoBackground autoPlay loop muted>
        <source src="/assets/power-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* ModalContent holds the login form */}
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
          <Button type="submit">Login</Button>
        </form>
      </ModalContent>
    </FullPageContainer>
  );
};

export default LoginModal;
