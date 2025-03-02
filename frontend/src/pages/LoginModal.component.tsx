import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// Import the logo asset
import Logo from "../assets/Logo.png";
// Import the background video
import powerBackground from "../assets/power-background.mp4";

/* ------------------ Styled Components ------------------ */

const FullPageContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(45deg, rgba(0, 255, 255, 0.5), rgba(120, 81, 169, 0.5));
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
  background: var(--neon-blue);
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
  color: var(--neon-blue);
  margin: 0;
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

const ErrorMessage = styled.p`
  color: #ff5555;
  text-align: center;
  margin-bottom: 15px;
`;

/* ------------------ LoginModal Component ------------------ */

const LoginModal = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle form submission for login.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await login(credentials.username, credentials.password);
      setIsLoading(false);
      
      if (response.user) {
        if (response.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/client-dashboard");
        }
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Login error:", err);
      setError(err.message || "Invalid username or password");
    }
  };

  return (
    <FullPageContainer onClick={handleClose}>
      <VideoBackground autoPlay loop muted>
        {/* Use imported video instead of public path */}
        <source src={powerBackground} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>

        <ModalHeader>
          <LogoCircle>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>

        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <form onSubmit={handleSubmit}>
          <InputField
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
          <InputField
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <ForgotPasswordLink onClick={handleForgotPassword}>
          Forgot Password?
        </ForgotPasswordLink>
      </ModalContent>
    </FullPageContainer>
  );
};

export default LoginModal;