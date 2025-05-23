import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

// material-ui
import Grid from '@mui/material/Grid2';

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

/**
 * Personal Training Dashboard Component
 * 
 * The main dashboard view for personal trainers to monitor client progress,
 * track fitness goals, and manage training sessions.
 * 
 * The dashboard features a responsive grid layout with specialized cards:
 * 
 * - TrainingSessionsCard: Displays session counts and client activity metrics
 * - ClientProgressChart: Shows client fitness improvements over time
 * - TrainingProgressDarkCard: Highlights client achievements and milestones
 * - TrainingProgressLightCard: Presents weekly goal completion rates
 * - FitnessMetricsChart: Visualizes key performance indicators across training programs
 * - PopularWorkoutsCard: Lists trending workout routines with effectiveness ratings
 * 
 * Enhanced with:
 * - Framer Motion animations for improved UX
 * - Styled components for consistent theming
 * - Loading state with skeleton display
 */
const DashboardView: React.FC = () => {
  // Loading state to control skeleton display during data fetching
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate data loading and set loading state to false after a short delay
    // In a production environment, this would be replaced with actual API calls
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // Cleanup timer on component unmount
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
      <Grid container spacing={gridSpacing}>
        {/* Top row with training overview cards */}
        <Grid size={12}>
          <DashboardSection variants={itemVariants}>
            <Grid container spacing={gridSpacing}>
              {/* Sessions summary card - takes 1/3 of width on large screens */}
              <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
                <motion.div variants={itemVariants}>
                  <TrainingSessionsCard isLoading={isLoading} />
                </motion.div>
              </Grid>
              
              {/* Client progress line chart - takes 1/3 of width on large screens */}
              <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
                <motion.div variants={itemVariants}>
                  <ClientProgressChart isLoading={isLoading} />
                </motion.div>
              </Grid>
              
              {/* Container for training progress cards - takes 1/3 of width on large screens */}
              <Grid size={{ lg: 4, md: 12, sm: 12, xs: 12 }}>
                <Grid container spacing={gridSpacing}>
                  {/* Client achievements card - full width on large screens, half width on medium */}
                  <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                    <motion.div variants={itemVariants}>
                      <TrainingProgressDarkCard isLoading={isLoading} />
                    </motion.div>
                  </Grid>
                  
                  {/* Weekly goals completion card */}
                  <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                    <motion.div variants={itemVariants}>
                      <TrainingProgressLightCard 
                        isLoading={isLoading}
                        total={28}
                        label="Active Clients"
                        icon={<Dumbbell size={24} />}
                      />
                    </motion.div>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DashboardSection>
        </Grid>
        
        {/* Bottom row with detailed charts */}
        <Grid size={12}>
          <DashboardSection variants={itemVariants}>
            <Grid container spacing={gridSpacing}>
              {/* Fitness metrics chart - takes 2/3 of width on medium screens and above */}
              <Grid size={{ xs: 12, md: 8 }}>
                <motion.div variants={itemVariants}>
                  <FitnessMetricsChart isLoading={isLoading} />
                </motion.div>
              </Grid>
              
              {/* Popular workouts card - takes 1/3 of width on medium screens and above */}
              <Grid size={{ xs: 12, md: 4 }}>
                <motion.div variants={itemVariants}>
                  <PopularWorkoutsCard isLoading={isLoading} />
                </motion.div>
              </Grid>
            </Grid>
          </DashboardSection>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default DashboardView;