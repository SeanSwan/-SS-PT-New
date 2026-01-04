import React from 'react';
import MeasurementEntry from '../../components/DashBoard/Pages/admin-dashboard/MeasurementEntry';
import { Box, Typography } from '@mui/material';

const MeasurementEntryPage: React.FC = () => {
  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Typography variant="h4" gutterBottom>
        Body Measurement Entry
      </Typography>
      <MeasurementEntry />
    </Box>
  );
};

export default MeasurementEntryPage;