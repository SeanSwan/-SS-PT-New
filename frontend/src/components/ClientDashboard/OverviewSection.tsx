import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// 🟢 Register the required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// ======================= 🌟 Styled Components =======================
const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const MetricCard = styled(motion.div)`
  background-color: ${({ theme }) => theme.colors.grey};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.neonBlue};
`;

const MetricLabel = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.silver};
`;

const ChartContainer = styled.div`
  margin-top: 2rem;
  background-color: ${({ theme }) => theme.colors.grey};
  border-radius: 8px;
  padding: 1rem;
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.neonBlue};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

// ======================= 🌟 OverviewSection Component =======================

interface OverviewSectionProps {
  data: typeof import("./ClientDashboard").mockData;
}

/**
 * **OverviewSection Component**
 * -------------------------------------
 * ✅ Displays Key Metrics
 * ✅ Includes a **Line Chart** (Progress Over Time)
 * ✅ Includes a **Bar Chart** (Performance Scores)
 */
const OverviewSection: React.FC<OverviewSectionProps> = ({ data }) => {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    return () => {
      // Destroy Chart instances before unmounting
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
      }
      if (barChartRef.current) {
        barChartRef.current.destroy();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Title */}
      <SectionTitle>Overview</SectionTitle>

      {/* Fitness Metrics */}
      <OverviewGrid>
        <MetricCard whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <MetricValue>{data.workoutProgress}%</MetricValue>
          <MetricLabel>Workout Progress</MetricLabel>
        </MetricCard>
        <MetricCard whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <MetricValue>{data.goalsAchieved}</MetricValue>
          <MetricLabel>Goals Achieved</MetricLabel>
        </MetricCard>
        <MetricCard whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <MetricValue>{data.bodyMeasurements.weight} kg</MetricValue>
          <MetricLabel>Current Weight</MetricLabel>
        </MetricCard>
        <MetricCard whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <MetricValue>{data.bodyMeasurements.bodyFat}%</MetricValue>
          <MetricLabel>Body Fat</MetricLabel>
        </MetricCard>
      </OverviewGrid>

      {/* 📊 Line Chart - Progress Over Time */}
      <ChartContainer>
        <Line
          ref={lineChartRef}
          data={data.progressChartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" },
              title: { display: true, text: "Progress Over Time" },
            },
          }}
        />
      </ChartContainer>

      {/* 📊 Bar Chart - Performance Scores */}
      <ChartContainer>
        <Bar
          ref={barChartRef}
          data={data.progressBarChartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" },
              title: { display: true, text: "Performance Scores" },
            },
          }}
        />
      </ChartContainer>
    </motion.div>
  );
};

export default OverviewSection;
