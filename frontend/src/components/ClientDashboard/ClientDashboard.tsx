// src/Components/ClientDashboard/ClientDashboard.tsx
"use client";

import React, { useState, useCallback } from "react";
import styled, { ThemeProvider } from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import { useDropzone } from "react-dropzone";

// Import shared components
import Header from "../Header/header";
import Sidebar from "./Sidebar";

// Import dashboard subcomponents (make sure these files exist)
import OverviewSection from "./OverviewSection";
import DataUploadSection from "./DataUploadSection";
import TrainerDataSection from "./TrainerDataSection";
import ProgressSection from "./ProgressSection";
import MessagesSection from "./MessagesSection";

// -----------------------------
// Mock Data & Theme
// -----------------------------
export const mockData = {
  workoutProgress: 75, // percentage
  goalsAchieved: 3,
  topGoals: [
    { id: 1, label: "Increase Bench Press", progress: 60 },
    { id: 2, label: "Improve Squat Depth", progress: 40 },
    { id: 3, label: "Reduce Body Fat", progress: 70 },
    { id: 4, label: "Increase Endurance", progress: 50 },
    { id: 5, label: "Enhance Flexibility", progress: 30 },
    { id: 6, label: "Boost Cardio Health", progress: 80 },
    { id: 7, label: "Improve Core Strength", progress: 55 },
    { id: 8, label: "Increase Agility", progress: 45 },
    { id: 9, label: "Optimize Recovery", progress: 65 },
    { id: 10, label: "Achieve Personal Best", progress: 20 },
  ],
  bodyMeasurements: {
    weight: 70,
    bodyFat: 15,
    muscle: 45,
  },
  // Additional mock properties for charts can be added here.
};

const theme = {
  colors: {
    neonBlue: "#00FFFF", // Primary
    royalPurple: "#6A0DAD", // Secondary
    grey: "#808080", // Tertiary
    silver: "#C0C0C0", // Accent
    background: "#1A1A1A", // Sidebar/dark background
    lightBg: "#FFFFFF", // Main content background
    text: "#333333", // Dark text for readability
  },
  fonts: {
    main: "'Roboto', sans-serif",
  },
};

// -----------------------------
// Shared Layout Styled Components
// -----------------------------
const DashboardContainer = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.main};
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.lightBg};
`;

// -----------------------------
// Orientation Modal (Inline for now)
// -----------------------------
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContainer = styled.div`
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
  color: #333;
`;

const ModalTitle = styled.h2`
  text-align: center;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.neonBlue};
`;

const ModalField = styled.div`
  margin-bottom: 1rem;
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  input,
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
`;

const ModalButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.colors.neonBlue};
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  margin-top: 1rem;
  &:hover {
    background: ${({ theme }) => theme.colors.royalPurple};
  }
`;

interface OrientationFormProps {
  onClose: () => void;
}

const OrientationForm: React.FC<OrientationFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    healthInfo: "",
    waiverInitials: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit orientation data to backend here.
    setSubmitted(true);
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalTitle>Orientation Signup</ModalTitle>
        <p
          style={{
            textAlign: "center",
            marginBottom: "1rem",
            color: theme.colors.royalPurple,
          }}
        >
          Orientation is FREE – Group Training Available!
        </p>
        {submitted ? (
          <p>Thank you for signing up! Your orientation is scheduled.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <ModalField>
              <label htmlFor="fullName">Full Name:</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </ModalField>
            <ModalField>
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </ModalField>
            <ModalField>
              <label htmlFor="phone">Phone:</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </ModalField>
            <ModalField>
              <label htmlFor="healthInfo">Health Information:</label>
              <textarea
                id="healthInfo"
                name="healthInfo"
                value={formData.healthInfo}
                onChange={handleChange}
                required
              />
            </ModalField>
            <ModalField>
              <label htmlFor="waiverInitials">Waiver Initials (Confirm):</label>
              <input
                type="text"
                id="waiverInitials"
                name="waiverInitials"
                value={formData.waiverInitials}
                onChange={handleChange}
                required
              />
            </ModalField>
            <ModalButton
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Submit Orientation
            </ModalButton>
          </form>
        )}
        <ModalButton
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Close
        </ModalButton>
      </ModalContainer>
    </ModalOverlay>
  );
};

// -----------------------------
// Additional Styled Components for Sections
// -----------------------------
const OverviewSectionContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const OverviewTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.royalPurple};
`;

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const StatCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.silver};
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const StatTitle = styled.h3`
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.royalPurple};
`;

const StatValue = styled.p`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.neonBlue};
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 10px;
  background: ${({ theme }) => theme.colors.grey};
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

interface ProgressBarFillProps {
  $progress: number;
}

const ProgressBarFill = styled.div<ProgressBarFillProps>`
  width: ${({ $progress }) => $progress}%;
  height: 100%;
  background: ${({ theme }) => theme.colors.neonBlue};
  border-radius: 5px;
`;

const GoalProgressText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ParallaxSection = styled.div`
  font-size: 2rem;
  text-align: center;
  margin-top: 2rem;
  color: ${({ theme }) => theme.colors.royalPurple};
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.royalPurple};
`;

const DropzoneContainer = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.neonBlue};
  padding: 2rem;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.3s;
  &:hover {
    background: ${({ theme }) => theme.colors.silver};
  }
`;

const UploadMessage = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1rem;
`;

const FileItem = styled.li`
  background: ${({ theme }) => theme.colors.silver};
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 5px;
  color: ${({ theme }) => theme.colors.text};
`;

// -----------------------------
// Main ClientDashboard Component
// -----------------------------
const ClientDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showOrientation, setShowOrientation] = useState(false);

  // Setup react-dropzone for file uploads.
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <ThemeProvider theme={theme}>
      <Header />
      <DashboardContainer>
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <MainContent>
          <AnimatePresence mode="wait">
            {activeSection === "overview" && (
              <OverviewSectionContainer
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <OverviewTitle>NASM Performance Overview</OverviewTitle>
                <OverviewGrid>
                  {mockData.topGoals.map((goal) => (
                    <StatCard key={goal.id} whileHover={{ scale: 1.05 }}>
                      <StatTitle>{goal.label}</StatTitle>
                      <StatValue>{goal.progress}%</StatValue>
                      <ProgressBarContainer>
                        <ProgressBarFill $progress={goal.progress} />
                      </ProgressBarContainer>
                      <GoalProgressText>
                        {100 - goal.progress}% remaining
                      </GoalProgressText>
                    </StatCard>
                  ))}
                </OverviewGrid>
                <ParallaxSection>Keep Leveling Up!</ParallaxSection>
              </OverviewSectionContainer>
            )}

            {activeSection === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionTitle>Upload Your Data</SectionTitle>
                <DropzoneContainer {...(getRootProps() as any)}>
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <UploadMessage>Drop the files here ...</UploadMessage>
                  ) : (
                    <UploadMessage>
                      Drag & drop files here, or click to select files.
                    </UploadMessage>
                  )}
                </DropzoneContainer>
                {uploadedFiles.length > 0 && (
                  <FileList>
                    {uploadedFiles.map((file, index) => (
                      <FileItem key={index}>{file.name}</FileItem>
                    ))}
                  </FileList>
                )}
              </motion.div>
            )}

            {activeSection === "trainer" && (
              <motion.div
                key="trainer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TrainerDataSection />
              </motion.div>
            )}

            {activeSection === "progress" && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ProgressSection data={mockData} />
              </motion.div>
            )}

            {activeSection === "messages" && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MessagesSection />
              </motion.div>
            )}
          </AnimatePresence>
        </MainContent>
      </DashboardContainer>

      {showOrientation && (
        <OrientationForm onClose={() => setShowOrientation(false)} />
      )}
    </ThemeProvider>
  );
};

export default ClientDashboard;
