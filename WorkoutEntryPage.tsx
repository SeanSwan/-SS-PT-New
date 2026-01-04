import React from 'react';
import WorkoutDataEntry from '../../components/DashBoard/Pages/admin-dashboard/WorkoutDataEntry';
import { Box, Typography } from '@mui/material';

const WorkoutEntryPage: React.FC = () => {
  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workout Data Entry
      </Typography>
      <WorkoutDataEntry />
    </Box>
  );
};

export default WorkoutEntryPage;