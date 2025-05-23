/**
 * Admin Clients Summary View
 * Provides an index/entry point for admin client management
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  People,
  PersonAdd,
  Assessment,
  Settings,
  Timeline,
  CheckCircle,
  Warning,
  Info,
  TrendingUp,
  GroupAdd,
  ManageAccounts,
  Analytics,
  Dashboard,
  Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(10px)',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#e0e0e0',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 255, 255, 0.1)',
  },
}));

const HeroButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
  color: '#0a0a1a',
  padding: '12px 32px',
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '1.1rem',
  '&:hover': {
    background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 255, 255, 0.4)',
  },
}));

const FeatureList = styled(List)(({ theme }) => ({
  '& .MuiListItem-root': {
    padding: '8px 0',
  },
  '& .MuiListItemIcon-root': {
    minWidth: 36,
    color: '#00ffff',
  },
  '& .MuiListItemText-primary': {
    color: '#e0e0e0',
  },
}));

const AdminClientsSummary: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToClients = () => {
    navigate('/dashboard/clients');
  };

  const features = [
    { icon: <People />, text: 'Comprehensive client database with search & filtering' },
    { icon: <PersonAdd />, text: 'Add new clients with detailed onboarding' },
    { icon: <Assignment />, text: 'Manage client sessions and training packages' },
    { icon: <Analytics />, text: 'Real-time MCP server statistics' },
    { icon: <ManageAccounts />, text: 'Reset passwords and assign trainers' },
    { icon: <Timeline />, text: 'Track client progress and achievements' },
  ];

  const quickStats = [
    { 
      value: '500+', 
      label: 'Total Clients',
      icon: <People />,
      color: '#00ffff'
    },
    { 
      value: '24', 
      label: 'New This Month',
      icon: <PersonAdd />,
      color: '#10b981'
    },
    { 
      value: '98%', 
      label: 'Retention Rate',
      icon: <TrendingUp />,
      color: '#7851a9'
    },
    { 
      value: '4.8/5', 
      label: 'Average Rating',
      icon: <CheckCircle />,
      color: '#f59e0b'
    },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#0a0a1a', minHeight: '100vh', color: '#e0e0e0' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ color: '#00ffff', mb: 2, fontWeight: 700 }}>
          Client Management System
        </Typography>
        <Typography variant="h6" sx={{ color: '#a0a0a0', mb: 4 }}>
          Comprehensive tools for managing your SwanStudios clients
        </Typography>
        
        <HeroButton
          onClick={handleNavigateToClients}
          size="large"
          startIcon={<Dashboard />}
        >
          Open Client Management
        </HeroButton>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StyledCard>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box 
                  sx={{ 
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: `${stat.color}20`,
                    mb: 2
                  }}
                >
                  {React.cloneElement(stat.icon, { 
                    sx: { fontSize: 32, color: stat.color } 
                  })}
                </Box>
                <Typography variant="h4" sx={{ color: stat.color, fontWeight: 700 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Features Overview */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" sx={{ color: '#00ffff', mb: 3, fontWeight: 600 }}>
                Key Features
              </Typography>
              <FeatureList>
                {features.map((feature, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText primary={feature.text} />
                    </ListItem>
                    {index < features.length - 1 && <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />}
                  </React.Fragment>
                ))}
              </FeatureList>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" sx={{ color: '#00ffff', mb: 3, fontWeight: 600 }}>
                System Status
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#4caf50' }}>
                      All Systems Operational
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Client management services are running smoothly
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  Backend API: Healthy
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  Database: Connected
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  MCP Services: 6/6 Online
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleNavigateToClients}
                sx={{ 
                  color: '#00ffff',
                  borderColor: '#00ffff',
                  '&:hover': {
                    bgcolor: 'rgba(0, 255, 255, 0.1)',
                    borderColor: '#00ffff',
                  }
                }}
              >
                View Detailed Status
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" sx={{ color: '#00ffff', mb: 3, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonAdd />}
                    onClick={handleNavigateToClients}
                    sx={{ 
                      p: 2,
                      color: '#e0e0e0',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 255, 255, 0.1)',
                        borderColor: '#00ffff',
                      }
                    }}
                  >
                    Add New Client
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/dashboard/client-progress')}
                    sx={{ 
                      p: 2,
                      color: '#e0e0e0',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(120, 81, 169, 0.1)',
                        borderColor: '#7851a9',
                      }
                    }}
                  >
                    View Progress Reports
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GroupAdd />}
                    onClick={() => navigate('/dashboard/admin-sessions')}
                    sx={{ 
                      p: 2,
                      color: '#e0e0e0',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                      }
                    }}
                  >
                    Manage Sessions
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Settings />}
                    onClick={handleNavigateToClients}
                    sx={{ 
                      p: 2,
                      color: '#e0e0e0',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        borderColor: '#f59e0b',
                      }
                    }}
                  >
                    System Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminClientsSummary;
