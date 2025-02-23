// src/pages/SignupModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ------------------- Styled Components -------------------

// Full-screen overlay with a gradient background.
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: linear-gradient(45deg, rgba(0, 255, 255, 0.5), rgba(120, 81, 169, 0.5));
`;

// Background video for visual effect.
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.8;
`;

// Container for the modal content.
const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #111;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
`;

// Close button to dismiss the modal.
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

// Header container for logo and app name.
const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

// Circular container for the logo image.
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

// Logo image styled to fit within the circle.
const LogoImage = styled.img`
  width: 60%;
  height: 60%;
  object-fit: contain;
`;

// Header text for the app name.
const HeaderText = styled.h1`
  font-size: 1.5rem;
  color: var(--neon-blue);
  margin: 0;
`;

// Styled input field.
const InputField = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 2px solid var(--royal-purple);
  border-radius: 5px;
  background: #111;
  color: #fff;

  &:focus {
    outline: none;
    border-color: var(--neon-blue);
  }
`;

// Label for input fields.
const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: var(--silver);
`;

// Styled button for form submission.
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

// Styled link for forgot password.
const ForgotPasswordLink = styled.a`
  display: block;
  margin-top: 10px;
  text-align: right;
  color: var(--neon-blue);
  text-decoration: underline;
  cursor: pointer;
`;

// Container for social media login buttons.
const SocialMediaContainer = styled.div`
  margin-top: 20px;
  text-align: center;
`;

// Styled button for social media logins.
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

// ------------------- SignupModal Component -------------------

/**
 * SignupModal Component
 *
 * Renders a full-screen sign-up form with a video background.
 * At the top, a professional header displays the logo in a circle along with the app name ("SwanStudios").
 * The form includes standard fields for user registration along with placeholder logic for social login and forgot password.
 */
const SignupModal = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    fitnessGoal: "",
    trainingExperience: "",
    healthConcerns: "",
    emergencyContact: "",
  });
  const [error, setError] = useState("");

  // Closes the modal.
  const handleClose = () => {
    navigate(-1);
  };

  // Updates form state.
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle form submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Simple client-side check for matching passwords.
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      // Remove confirmPassword before sending to backend.
      const { confirmPassword, ...registrationData } = formData;
      const response = await register(registrationData);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error during registration:", err);
      setError("Registration failed. Please try again.");
    }
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

  return (
    <ModalOverlay onClick={handleClose}>
      <VideoBackground autoPlay loop muted>
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>
        {/* Modal Header with logo and app name */}
        <ModalHeader>
          <LogoCircle>
            <LogoImage src="/assets/logo.png" alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Sign Up</h2>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <Label htmlFor="firstName">First Name</Label>
          <InputField
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />

          <Label htmlFor="lastName">Last Name</Label>
          <InputField
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />

          <Label htmlFor="email">Email Address</Label>
          <InputField
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Label htmlFor="username">Username</Label>
          <InputField
            type="text"
            id="username"
            name="username"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <Label htmlFor="password">Password</Label>
          <InputField
            type="password"
            id="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <InputField
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Label htmlFor="phone">Phone Number</Label>
          <InputField
            type="tel"
            id="phone"
            name="phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
          />

          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <InputField
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />

          <Label htmlFor="gender">Gender</Label>
          <InputField
            type="text"
            id="gender"
            name="gender"
            placeholder="Enter your gender"
            value={formData.gender}
            onChange={handleChange}
          />

          <Label htmlFor="weight">Weight (kg)</Label>
          <InputField
            type="number"
            id="weight"
            name="weight"
            placeholder="Enter your weight"
            value={formData.weight}
            onChange={handleChange}
          />

          <Label htmlFor="height">Height (cm)</Label>
          <InputField
            type="number"
            id="height"
            name="height"
            placeholder="Enter your height"
            value={formData.height}
            onChange={handleChange}
          />

          <Label htmlFor="fitnessGoal">Fitness Goal</Label>
          <InputField
            type="text"
            id="fitnessGoal"
            name="fitnessGoal"
            placeholder="E.g., lose weight, build muscle"
            value={formData.fitnessGoal}
            onChange={handleChange}
          />

          <Label htmlFor="trainingExperience">Training Experience</Label>
          <InputField
            type="text"
            id="trainingExperience"
            name="trainingExperience"
            placeholder="Describe your training experience"
            value={formData.trainingExperience}
            onChange={handleChange}
          />

          <Label htmlFor="healthConcerns">Health Concerns</Label>
          <InputField
            type="text"
            id="healthConcerns"
            name="healthConcerns"
            placeholder="Any health issues or concerns"
            value={formData.healthConcerns}
            onChange={handleChange}
          />

          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <InputField
            type="text"
            id="emergencyContact"
            name="emergencyContact"
            placeholder="Emergency contact name & phone"
            value={formData.emergencyContact}
            onChange={handleChange}
          />

          <Button type="submit">Sign Up</Button>
        </form>
        <ForgotPasswordLink onClick={handleForgotPassword}>
          Forgot Password?
        </ForgotPasswordLink>
        <SocialMediaContainer>
          <p>Or sign up with:</p>
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
    </ModalOverlay>
  );
};

export default SignupModal;
