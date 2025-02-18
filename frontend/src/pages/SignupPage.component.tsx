// src/pages/SignupModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/* 
  ✅ ModalOverlay:
  - Full-screen fixed container
  - Removed transparency for a solid overlay
*/
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: rgba(0, 0, 0, 0.9); /* ✅ Increased opacity to make background solid */
`;

/* 
  ✅ VideoBackground:
  - Background video with reduced opacity
*/
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.3; /* ✅ Reduced opacity for less visibility */
`;

/* 
  ✅ ModalContent:
  - Centered panel containing the signup form
  - Solid dark background (removed transparency)
*/
const ModalContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin: 50px auto; /* Adds spacing from the top */
  width: 90%;
  max-width: 500px;
  background: #222; /* ✅ Solid dark background (no transparency) */
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

/* ✅ Close Button */
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

/* ✅ Input Fields */
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

/* ✅ Label */
const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: var(--silver);
`;

/* ✅ Signup Button */
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

/* ✅ SignupModal Component */
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

  // ✅ Close the modal by navigating back
  const handleClose = () => {
    navigate(-1);
  };

  // ✅ Update form fields on input change
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ✅ Handle form submission for signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      navigate("/dashboard");
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      {/* ✅ Video background */}
      <VideoBackground autoPlay loop muted>
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* ✅ Signup Modal Content */}
      <ModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CloseButton onClick={handleClose}>&times;</CloseButton>
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

          <Button type="submit">Sign Up</Button>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SignupModal;
