/**
 * TrainerClients.tsx
 * Component for trainers to view and manage their assigned clients
 */
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert
} from '@mui/material';

const TrainerClients: React.FC = () => {
  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            My Clients
          </Typography>
          <Alert severity="info">
            This section will allow trainers to view and manage their assigned clients.
            Features will include client progress tracking, communication tools, and workout plan management.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TrainerClients;