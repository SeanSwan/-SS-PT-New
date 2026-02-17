import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

// project imports - properly organized with fixed component names
import TrainingSessionsCard from './training-sessions-card';
import PopularWorkoutsCard from './popular-workouts-card';
import ClientProgressChart from './client-progress-chart';
import FitnessMetricsChart from './fitness-metrics-chart';
import TrainingProgressDarkCard from "./../ui/cards/training-progress-dark-card";
import TrainingProgressLightCard from "./../ui/cards/training-progress-light-card";

// store
import { gridSpacing } from '../../store/constant';

// assets
import { Dumbbell } from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  }
};

// Styled components
const DashboardContainer = styled(motion.div)`
  width: 100%;
`;

const DashboardSection = styled(motion.div)`
  margin-bottom: 1.5rem;
`;

const GridContainer = styled.div<{ $spacing?: number }>`
  display: grid;
  gap: ${props => (props.$spacing || 3) * 8}px;
  width: 100%;
`;

const TopRowGrid = styled(GridContainer)`
  grid-template-columns: 1fr 1fr 1fr;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ProgressCardsGrid = styled(GridContainer)`
  grid-template-columns: 1fr;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const BottomRowGrid = styled(GridContainer)`
  grid-template-columns: 2fr 1fr;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Personal Training Dashboard Component
 *
 * The main dashboard view for personal trainers to monitor client progress,
 * track fitness goals, and manage training sessions.
 */
const DashboardView: React.FC = () => {
  // Loading state to control skeleton display during data fetching
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
    };
  }, []);

  return (
    <DashboardContainer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <GridContainer $spacing={gridSpacing}>
        {/* Top row with training overview cards */}
        <DashboardSection variants={itemVariants}>
          <TopRowGrid $spacing={gridSpacing}>
            <motion.div variants={itemVariants}>
              <TrainingSessionsCard isLoading={isLoading} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ClientProgressChart isLoading={isLoading} />
            </motion.div>

            <ProgressCardsGrid $spacing={gridSpacing}>
              <motion.div variants={itemVariants}>
                <TrainingProgressDarkCard isLoading={isLoading} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <TrainingProgressLightCard
                  isLoading={isLoading}
                  total={28}
                  label="Active Clients"
                  icon={<Dumbbell size={24} />}
                />
              </motion.div>
            </ProgressCardsGrid>
          </TopRowGrid>
        </DashboardSection>

        {/* Bottom row with detailed charts */}
        <DashboardSection variants={itemVariants}>
          <BottomRowGrid $spacing={gridSpacing}>
            <motion.div variants={itemVariants}>
              <FitnessMetricsChart isLoading={isLoading} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <PopularWorkoutsCard isLoading={isLoading} />
            </motion.div>
          </BottomRowGrid>
        </DashboardSection>
      </GridContainer>
    </DashboardContainer>
  );
};

export default DashboardView;
