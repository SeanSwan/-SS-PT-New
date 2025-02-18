import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// -----------------------------
// Styled Components for Layout
// -----------------------------

// Main container with two columns: Video and Info panels.
const TrainerDataContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
  padding: 1rem;
`;

// Left side: Video Section
const VideoSection = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background-color: #000;
`;

const StyledIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

// Overlay badge for video gamification (e.g., "Watch & Level Up!")
const VideoOverlay = styled(motion.div)`
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--royal-purple, #6A0DAD);
  color: #fff;
  padding: 0.5rem 1rem;
  border-top-left-radius: 10px;
  font-size: 0.9rem;
  opacity: 0.9;
`;

// Right side: Info Section (cards for workout plan & nutritional advice)
const InfoSection = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 1.5rem;
`;

// Info Card for trainer data
const InfoCard = styled(motion.div)`
  background-color: ${({ theme }) => theme.colors.grey};
  border-radius: 8px;
  padding: 1rem;
  color: ${({ theme }) => theme.colors.neonBlue};
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const InfoCardTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.neonBlue};
`;

const InfoCardContent = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.silver};
  line-height: 1.4;
`;

// -----------------------------
// TrainerDataSection Component
// -----------------------------
/**
 * TrainerDataSection Component
 *
 * Displays trainer-provided data in a two-column layout:
 * - Left Column: A large technique video section with a "Watch & Level Up!" badge.
 * - Right Column: Two Info Cards detailing the personalized workout plan and nutritional advice.
 *
 * The design is inspired by premium brands and NASM standards,
 * offering a dynamic, engaging experience.
 */
const TrainerDataSection: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <TrainerDataContainer>
        {/* Video Section */}
        <VideoSection>
          <StyledIframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Technique Video - Perfect Your Squat Form"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <VideoOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            Watch & Level Up!
          </VideoOverlay>
        </VideoSection>

        {/* Info Section */}
        <InfoSection>
          <InfoCard whileHover={{ scale: 1.03 }}>
            <InfoCardTitle>Workout Plan</InfoCardTitle>
            <InfoCardContent>
              <p>Your personalized workout plan for this week:</p>
              <ul>
                <li>Monday: Upper Body Strength</li>
                <li>Tuesday: Lower Body Power</li>
                <li>Wednesday: Active Recovery</li>
                <li>Thursday: Full Body HIIT</li>
                <li>Friday: Core & Flexibility</li>
                <li>Saturday: Cardio Endurance</li>
                <li>Sunday: Rest & Reflection</li>
              </ul>
              <p style={{ fontWeight: "bold", marginTop: "0.5rem" }}>
                Track your progress and level up!
              </p>
            </InfoCardContent>
          </InfoCard>
          <InfoCard whileHover={{ scale: 1.03 }}>
            <InfoCardTitle>Nutritional Advice</InfoCardTitle>
            <InfoCardContent>
              <p>
                Focus on increasing protein intake, limiting processed carbs, and consuming 5 servings
                of vegetables daily. Stay hydrated with 2-3 liters of water. Follow NASM guidelines
                for balanced nutrition.
              </p>
              <p style={{ fontWeight: "bold", marginTop: "0.5rem" }}>
                Fuel your body, fuel your gains!
              </p>
            </InfoCardContent>
          </InfoCard>
        </InfoSection>
      </TrainerDataContainer>
    </motion.div>
  );
};

export default TrainerDataSection;
