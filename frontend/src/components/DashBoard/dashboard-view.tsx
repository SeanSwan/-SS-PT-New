import React, { useEffect, useState } from 'react';

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
 * The component implements a loading state during data fetching for better UX.
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
    <Grid container spacing={gridSpacing}>
      {/* Top row with training overview cards */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          {/* Sessions summary card - takes 1/3 of width on large screens */}
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <TrainingSessionsCard isLoading={isLoading} />
          </Grid>
          
          {/* Client progress line chart - takes 1/3 of width on large screens */}
          <Grid size={{ lg: 4, md: 6, sm: 6, xs: 12 }}>
            <ClientProgressChart isLoading={isLoading} />
          </Grid>
          
          {/* Container for training progress cards - takes 1/3 of width on large screens */}
          <Grid size={{ lg: 4, md: 12, sm: 12, xs: 12 }}>
            <Grid container spacing={gridSpacing}>
              {/* Client achievements card - full width on large screens, half width on medium */}
              <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                <TrainingProgressDarkCard isLoading={isLoading} />
              </Grid>
              
              {/* Weekly goals completion card */}
              <Grid size={{ sm: 6, xs: 12, md: 6, lg: 12 }}>
                <TrainingProgressLightCard 
                  isLoading={isLoading}
                  total={28}
                  label="Active Clients"
                  icon={<Dumbbell size={24} />}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Bottom row with detailed charts */}
      <Grid size={12}>
        <Grid container spacing={gridSpacing}>
          {/* Fitness metrics chart - takes 2/3 of width on medium screens and above */}
          <Grid size={{ xs: 12, md: 8 }}>
            <FitnessMetricsChart isLoading={isLoading} />
          </Grid>
          
          {/* Popular workouts card - takes 1/3 of width on medium screens and above */}
          <Grid size={{ xs: 12, md: 4 }}>
            <PopularWorkoutsCard isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default DashboardView;