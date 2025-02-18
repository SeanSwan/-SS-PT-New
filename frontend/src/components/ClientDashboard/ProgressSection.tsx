import React from "react";
import styled, { useTheme } from "styled-components";
import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

// Register the necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

// -----------------------------
// Styled Components
// -----------------------------

// Section title with enhanced styling
const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.neonBlue};
  font-size: 2rem;
  text-align: center;
  margin-bottom: 1.5rem;
`;

// Container for the entire progress section
const ProgressSectionContainer = styled(motion.div)`
  margin-top: 2rem;
  padding: 1rem;
`;

// Wrapper for the chart, styled as a card with gamification cues
const ProgressChartWrapper = styled.div`
  background-color: ${({ theme }) => theme.colors.grey};
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  margin-bottom: 1rem;
`;

// Info box below the chart for gamified milestone info
const MilestoneInfo = styled.div`
  background-color: ${({ theme }) => theme.colors.lightBg};
  border: 2px solid ${({ theme }) => theme.colors.royalPurple};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
`;

// -----------------------------
// Type Definitions
// -----------------------------
interface Goal {
  id: number;
  label: string;
  progress: number;
}

interface BodyMeasurements {
  weight: number;
  bodyFat: number;
  muscle: number;
}

export interface ProgressSectionData {
  workoutProgress: number;
  goalsAchieved: number;
  topGoals: Goal[];
  bodyMeasurements: BodyMeasurements;
}

interface ProgressSectionProps {
  data: ProgressSectionData;
}

/**
 * ProgressSection Component
 *
 * Displays a bar chart of performance scores along with a gamified milestone info section.
 * The design is inspired by NASM standards and premium gyms.
 */
const ProgressSection: React.FC<ProgressSectionProps> = ({ data }) => {
  const theme = useTheme();

  // Generate chart data from the topGoals array
  const progressBarChartData = {
    labels: data.topGoals.map((goal) => goal.label),
    datasets: [
      {
        label: "Goal Progress",
        data: data.topGoals.map((goal) => goal.progress),
        backgroundColor: theme.colors.neonBlue,
      },
    ],
  };

  // Calculate a milestone percentage based on the average progress of goals.
  const total =
    progressBarChartData.datasets[0].data.reduce((sum, val) => sum + val, 0) || 0;
  const average =
    total / (progressBarChartData.datasets[0].data.length || 1);
  const milestoneRemaining = Math.max(0, 100 - Math.round(average));

  return (
    <ProgressSectionContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <SectionTitle>Detailed Progress</SectionTitle>
      <ProgressChartWrapper>
        <Bar
          data={progressBarChartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" },
              title: { display: true, text: "Performance Scores" },
            },
          }}
        />
      </ProgressChartWrapper>
      <MilestoneInfo>
        {`Great work! You're only ${milestoneRemaining}% away from your next milestone. Keep pushing to level up your performance!`}
      </MilestoneInfo>
    </ProgressSectionContainer>
  );
};

export default ProgressSection;
