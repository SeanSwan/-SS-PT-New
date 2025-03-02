import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// Import assets
import Logo from "../assets/Logo.png";
import powerBackground from "../assets/Swans.mp4"; // Import the video asset

/* ------------------ Styled Components ------------------ */

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: linear-gradient(
    45deg,
    rgba(0, 255, 255, 0.5),
    rgba(120, 81, 169, 0.5)
  );
`;

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

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: var(--silver);
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

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

/* ------------------ SignupModal Component ------------------ */

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
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    navigate(-1);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      setIsLoading(false);
      navigate("/dashboard");
    } catch (err) {
      setIsLoading(false);
      console.error("Error during registration:", err);
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Forgot password functionality not implemented yet.");
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <VideoBackground autoPlay loop muted>
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

        {/* Modal Header with logo and app name */}
        <ModalHeader>
          <LogoCircle>
            <LogoImage src={Logo} alt="SwanStudios Logo" />
          </LogoCircle>
          <HeaderText>SwanStudios</HeaderText>
        </ModalHeader>

        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Sign Up</h2>
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <InputField
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <InputField
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </FormGrid>

          <Label htmlFor="email">Email Address</Label>
          <InputField
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
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
            disabled={isLoading}
          />

          <FormGrid>
            <div>
              <Label htmlFor="password">Password</Label>
              <InputField
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <InputField
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </FormGrid>

          <Label htmlFor="phone">Phone Number</Label>
          <InputField
            type="tel"
            id="phone"
            name="phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            disabled={isLoading}
          />

          <FormGrid>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <InputField
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <InputField
                type="text"
                id="gender"
                name="gender"
                placeholder="Enter your gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </FormGrid>

          <FormGrid>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <InputField
                type="number"
                id="weight"
                name="weight"
                placeholder="Enter your weight"
                value={formData.weight}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <InputField
                type="number"
                id="height"
                name="height"
                placeholder="Enter your height"
                value={formData.height}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </FormGrid>

          <Label htmlFor="fitnessGoal">Fitness Goal</Label>
          <InputField
            type="text"
            id="fitnessGoal"
            name="fitnessGoal"
            placeholder="E.g., lose weight, build muscle"
            value={formData.fitnessGoal}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Label htmlFor="trainingExperience">Training Experience</Label>
          <InputField
            type="text"
            id="trainingExperience"
            name="trainingExperience"
            placeholder="Describe your training experience"
            value={formData.trainingExperience}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Label htmlFor="healthConcerns">Health Concerns</Label>
          <InputField
            type="text"
            id="healthConcerns"
            name="healthConcerns"
            placeholder="Any health issues or concerns"
            value={formData.healthConcerns}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <InputField
            type="text"
            id="emergencyContact"
            name="emergencyContact"
            placeholder="Emergency contact name & phone"
            value={formData.emergencyContact}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>
        <ForgotPasswordLink onClick={handleForgotPassword}>
          Forgot Password?
        </ForgotPasswordLink>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SignupModal;