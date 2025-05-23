import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Paper
} from '@mui/material';
import { PersonAdd, Settings, Key, CheckCircle } from '@mui/icons-material';
import MainCard from '../../../../components/ui/MainCard';
import { gridSpacing } from '../../../../store/constant';

/**
 * Fallback View for User Management
 * 
 * This component is displayed when the user management API endpoints 
 * are not yet implemented or when there's an issue loading the data.
 */
const UserManagementFallback: React.FC = () => {
  // Sample data for demonstration
  const sampleUsers = [
    { name: 'Admin User', role: 'admin', status: 'Active' },
    { name: 'Trainer User', role: 'trainer', status: 'Active' },
    { name: 'Client User', role: 'client', status: 'Active' },
    { name: 'Regular User', role: 'user', status: 'Active' }
  ];

  return (
    <MainCard title="User Management">
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: 'primary.light', 
              color: 'primary.contrastText',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" gutterBottom>
              User Management System
            </Typography>
            <Typography variant="body2">
              This dashboard allows you to manage all users in the system, including clients, trainers, and administrators.
              You can view, edit, and manage permissions for all users from this central location.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Sample User List
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Below is a representation of the user management interface. When fully implemented, you'll be able to:
              </Typography>

              <List>
                {sampleUsers.map((user, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      secondaryAction={
                        <Button size="small" variant="outlined" color="primary">
                          Edit
                        </Button>
                      }
                    >
                      <ListItemIcon>
                        <PersonAdd />
                      </ListItemIcon>
                      <ListItemText
                        primary={user.name}
                        secondary={`Role: ${user.role} • Status: ${user.status}`}
                      />
                    </ListItem>
                    {index < sampleUsers.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={gridSpacing}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Management Features
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="View all users by role" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Edit user details" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Promote users to client" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Manage admin permissions" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Admin Tools
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    mt: 2
                  }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<PersonAdd />}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Add New User
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<Settings />}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    User Permissions
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Key />}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Security Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default UserManagementFallback;