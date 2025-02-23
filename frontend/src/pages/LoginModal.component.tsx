// src/pages/LoginModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ------------------- Styled Components -------------------

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

const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  background: #222;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

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

const ForgotPasswordLink = styled.a`
  display: block;
  margin-top: 10px;
  text-align: right;
  color: var(--neon-blue);
  text-decoration: underline;
  cursor: pointer;
`;

const SocialMediaContainer = styled.div`
  margin-top: 20px;
  text-align: center;
`;

const SocialButton = styled.button`
  margin: 0 10px;
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: var(--royal-purple);
  color: #fff;
  cursor: pointer;
  transition: background 0.3s ease;
  &:hover {
    background: var(--neon-blue);
  }
`;

// ------------------- LoginModal Component -------------------

/**
 * LoginModal Component
 *
 * This full-page login modal is used by both clients and administrators.
 * When the user submits their credentials, the login logic is entirely handled
 * by the backend. The backend will verify the password (including for admin users)
 * using secure, server-side storage (e.g., environment variables or database).
 *
 * Features:
 * - Full viewport gradient background with video.
 * - A dismissible modal form.
 * - "Forgot Password?" link with placeholder logic.
 * - Social media login buttons with placeholder logic.
 */
const LoginModal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  // Dismiss the modal and return to the previous page.
  const handleClose = () => {
    navigate(-1);
  };

  // Update the form state.
  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Placeholder for forgot password functionality.
  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Forgot password functionality not implemented yet.");
  };

  // Placeholder for social media login functionality.
  const handleSocialLogin = (provider) => (e) => {
    e.preventDefault();
    alert(`Social login with ${provider} not implemented yet.`);
  };

  // Handle form submission for login.
  // Admin password verification is now handled on the backend.
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
      <VideoBackground autoPlay loop muted>
        <source src="/assets/power-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

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
        <ForgotPasswordLink onClick={handleForgotPassword}>
          Forgot Password?
        </ForgotPasswordLink>
        <SocialMediaContainer>
          <p>Or login with:</p>
          <SocialButton onClick={handleSocialLogin("Facebook")}>
            Facebook
          </SocialButton>
          <SocialButton onClick={handleSocialLogin("Google")}>
            Google
          </SocialButton>
          <SocialButton onClick={handleSocialLogin("Twitter")}>
            Twitter
          </SocialButton>
        </SocialMediaContainer>
      </ModalContent>
    </FullPageContainer>
  );
};

export default LoginModal;
