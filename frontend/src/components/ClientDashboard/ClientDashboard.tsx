"use client";

import React, { useState, useCallback } from "react";
import styled, { ThemeProvider } from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import { useDropzone } from "react-dropzone";

// Import shared components
import Header from "../Header/header";
import Sidebar from "./Sidebar";

// Import dashboard subcomponents
import OverviewSection from "./OverviewSection";
import DataUploadSection from "./DataUploadSection";
import TrainerDataSection from "./TrainerDataSection";
import ProgressSection from "./ProgressSection";
import MessagesSection from "./MessagesSection";
import Schedule from "../Schedule/schedule";

// Import orientation form for optional usage
import OrientationForm from "../OrientationForm/orientationForm";

// Import icons for gamification using ES modules
import { Award, Medal } from "lucide-react";

// -----------------------------
// Mock Data & Theme
// -----------------------------
export const mockData = {
  workoutProgress: 75,
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
};

const theme = {
  colors: {
    primary: "#00FFFF",        // Neon Blue
    secondary: "#7851A9",      // Purple
    accentBlue: "#145dbf",     // Blue
    grey: "#808080",
    silver: "#C0C0C0",
    background: "#FFFFFF",     // White background for main content
    sidebarBg: "#7851A9",      // Purple for sidebar background
    text: "#333333",
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
  background-color: ${({ theme }) => theme.colors.background};
`;

// Container for modals/overlays ensuring they appear on top.
const ModalWrapper = styled.div`
  position: relative;
  z-index: 3000;
`;

// -----------------------------
// Main ClientDashboard Component
// -----------------------------
const ClientDashboard: React.FC = () => {
  // Valid sections: "overview", "upload", "trainer", "progress", "messages", "schedule", "orientation"
  const [activeSection, setActiveSection] = useState("overview");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showOrientation, setShowOrientation] = useState(false);

  // Set up react-dropzone for file uploads.
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  /**
   * onOpenOrientation:
   * Callback to open the orientation modal.
   */
  const onOpenOrientation = () => {
    setShowOrientation(true);
  };

  /**
   * onNavigateSchedule:
   * Callback to navigate to the schedule page.
   */
  const onNavigateSchedule = () => {
    window.location.href = "/schedule";
  };

  return (
    <ThemeProvider theme={theme}>
      <Header />
      <DashboardContainer>
        {/* Sidebar receives callbacks for orientation and schedule */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onOpenOrientation={onOpenOrientation}
          onNavigateSchedule={onNavigateSchedule}
        />
        <MainContent>
          <AnimatePresence mode="wait">
            {activeSection === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <OverviewSection
                  currentLevel={5}
                  currentPoints={450}
                  nextLevelPoints={1000}
                  badges={[
                    { icon: Award, label: "Push-Up Pro" },
                    { icon: Medal, label: "Squat Champion" },
                    // Add additional badges as needed.
                  ]}
                  trophies={[
                    {
                      id: 1,
                      title: "Push-Up Pro",
                      imageUrl: "/trophies/pushup.png",
                      achievedCount: 50,
                      totalClients: 200,
                    },
                    {
                      id: 2,
                      title: "Squat Champion",
                      imageUrl: "/trophies/squat.png",
                      achievedCount: 30,
                      totalClients: 200,
                    },
                    // Extend trophy list to 30 or 50 items as desired.
                  ]}
                />
              </motion.div>
            )}

            {activeSection === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DataUploadSection
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  isDragActive={isDragActive}
                  uploadedFiles={uploadedFiles}
                />
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

            {activeSection === "schedule" && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Schedule />
              </motion.div>
            )}

            {activeSection === "orientation" && (
              <motion.div
                key="orientation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <p style={{ textAlign: "center", color: theme.colors.secondary }}>
                  Orientation details will be displayed here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </MainContent>
      </DashboardContainer>

      <ModalWrapper>
        {showOrientation && (
          <OrientationForm onClose={() => setShowOrientation(false)} />
        )}
      </ModalWrapper>
    </ThemeProvider>
  );
};

export default ClientDashboard;
