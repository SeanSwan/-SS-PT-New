import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Import components
import OrientationList from './components/OrientationList';
import NotificationTester from './components/NotificationTester';

// Import accessibility utilities
import { accessibleLabelGenerator } from '../../../../utils/accessibility';

// Styled Card component with proper accessibility focus styles
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
  },
}));

/**
 * OrientationDashboardView Component
 * 
 * Admin dashboard view for managing client orientation submissions
 * Provides overview metrics and detailed list of orientations
 */
const OrientationDashboardView: React.FC = () => {
  // State for the tab value
  const [tabValue, setTabValue] = React.useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ mb: 4 }}
        aria-label={accessibleLabelGenerator('Client Orientation Management')}
      >
        Client Orientation Management
      </Typography>
      
      {/* Quick Action Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StyledCard>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonAddIcon sx={{ mr: 1.5 }} /> Manual Client Entry
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                Manually enter a new client orientation form for clients without online access.
              </Typography>
              <Button 
                variant="outlined" 
                color="primary"
                href="/dashboard/client-management/new"
              >
                Add New Client
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StyledCard>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 1.5 }} /> Orientation Templates
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                Customize orientation form templates and questions for new clients.
              </Typography>
              <Button 
                variant="outlined" 
                color="primary"
                href="/dashboard/settings/forms"
              >
                Manage Templates
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StyledCard>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AssignmentIcon sx={{ mr: 1.5 }} /> Export Reports
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                Generate and export detailed reports of client orientation data.
              </Typography>
              <Button 
                variant="outlined" 
                color="primary"
                href="/dashboard/reports/orientation"
              >
                Generate Reports
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
      
      {/* Tabs for Orientations and Testing */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="Orientation Dashboard Tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Orientation Submissions" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Notification Testing" id="tab-1" aria-controls="tabpanel-1" />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      <div
        role="tabpanel"
        hidden={tabValue !== 0}
        id="tabpanel-0"
        aria-labelledby="tab-0"
      >
        {tabValue === 0 && <OrientationList />}
      </div>
      <div
        role="tabpanel"
        hidden={tabValue !== 1}
        id="tabpanel-1"
        aria-labelledby="tab-1"
      >
        {tabValue === 1 && <NotificationTester />}
      </div>
    </Box>
  );
};

export default OrientationDashboardView;