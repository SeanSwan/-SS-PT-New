import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Icons 
import { 
  Beaker, 
  UserPlus, 
  Zap, 
  Check, 
  AlertTriangle,
  Copy
} from 'lucide-react';

// Material UI components
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

/**
 * Session Test Controls Component
 * 
 * This component provides admin controls for testing the session system:
 * - Create test clients
 * - Add sessions to test clients
 * - Display test client credentials for login
 * 
 * This component should only be used in development environments.
 */
const SessionTestControls: React.FC = () => {
  const { services } = useAuth();
  const { toast } = useToast();

  // State for test clients
  const [testClient, setTestClient] = useState<any>(null);
  const [creatingClient, setCreatingClient] = useState(false);

  // State for adding sessions
  const [sessions, setSessions] = useState<number>(5);
  const [addingSessions, setAddingSessions] = useState(false);

  // Handle creating a test client
  const handleCreateTestClient = async () => {
    try {
      setCreatingClient(true);

      // Call the create test client API
      const result = await services.session.createTestClient();

      if (result.success) {
        setTestClient(result.data);
        toast({
          title: "Success",
          description: "Test client created successfully",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error creating test client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test client",
        variant: "destructive",
      });
    } finally {
      setCreatingClient(false);
    }
  };

  // Handle adding sessions to test client
  const handleAddSessions = async () => {
    if (!testClient) {
      toast({
        title: "Error",
        description: "No test client selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingSessions(true);

      // Call the add sessions API
      const result = await services.session.addSessionsToTestClient(testClient.id, sessions);

      if (result.success) {
        setTestClient(result.data);
        toast({
          title: "Success",
          description: `Added ${sessions} sessions to test client`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error adding sessions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add sessions",
        variant: "destructive",
      });
    } finally {
      setAddingSessions(false);
    }
  };

  // Handle copying client credentials to clipboard
  const handleCopyCredentials = () => {
    if (!testClient) return;

    const credentials = `Email: ${testClient.email}\nPassword: ${testClient.password || 'Test123!'}`;
    navigator.clipboard.writeText(credentials);
    
    toast({
      title: "Copied!",
      description: "Test client credentials copied to clipboard",
    });
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Card 
        elevation={0}
        component={motion.div}
        variants={itemVariants}
        sx={{
          backgroundColor: 'rgba(30, 30, 60, 0.3)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        <CardHeader
          title={
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Beaker size={22} />
              <Typography variant="h6" component="div">
                Session Testing Controls
              </Typography>
            </Stack>
          }
          sx={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        />
        
        <CardContent>
          <Alert 
            severity="warning" 
            variant="filled" 
            sx={{ mb: 3 }}
            icon={<AlertTriangle />}
          >
            These testing controls are for development purposes only. They allow you to create test clients and add sessions to them to test the session management system.
          </Alert>
          
          <Grid container spacing={3}>
            {/* Test Client Creation */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  height: '100%'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserPlus size={18} />
                  Create Test Client
                </Typography>
                
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" paragraph>
                  Create a test client with an automatically generated email and password.
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UserPlus size={16} />}
                    onClick={handleCreateTestClient}
                    disabled={creatingClient}
                    sx={{ 
                      mt: 1,
                      background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
                      boxShadow: '0 4px 10px rgba(0, 200, 255, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 15px rgba(0, 200, 255, 0.4)',
                        background: 'linear-gradient(135deg, #00ffff, #00b8eb)',
                      }
                    }}
                  >
                    {creatingClient ? 'Creating...' : 'Create Test Client'}
                  </Button>
                </Box>
                
                {testClient && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                      backgroundColor: 'rgba(0, 255, 255, 0.05)',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">Test Client Created</Typography>
                      <Tooltip title="Copy Credentials">
                        <IconButton
                          size="small"
                          onClick={handleCopyCredentials}
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          <Copy size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    
                    <Typography variant="body2">
                      <strong>Name:</strong> {testClient.firstName} {testClient.lastName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {testClient.email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Password:</strong> {testClient.password || 'Test123!'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Available Sessions:</strong> {testClient.availableSessions || 0}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            {/* Test Add Sessions */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  height: '100%'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Zap size={18} />
                  Add Test Sessions
                </Typography>
                
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" paragraph>
                  Add sessions to your test client to simulate package purchases.
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Number of Sessions"
                    type="number"
                    value={sessions}
                    onChange={(e) => setSessions(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 100 }}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    size="small"
                    disabled={!testClient || addingSessions}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                        },
                      },
                    }}
                  />
                  
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Zap size={16} />}
                    onClick={handleAddSessions}
                    disabled={!testClient || addingSessions}
                    sx={{ 
                      mt: 1,
                      background: 'linear-gradient(135deg, #7851a9, #a67dd4)',
                      boxShadow: '0 4px 10px rgba(120, 81, 169, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 15px rgba(120, 81, 169, 0.4)',
                        background: 'linear-gradient(135deg, #7851a9, #9366c7)',
                      }
                    }}
                  >
                    {addingSessions ? 'Adding...' : 'Add Sessions'}
                  </Button>
                </Box>
                
                {!testClient && (
                  <Alert 
                    severity="info" 
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    Create a test client first before adding sessions
                  </Alert>
                )}
                
                {testClient && testClient.availableSessions > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: '8px',
                      border: '1px solid rgba(120, 81, 169, 0.3)',
                      backgroundColor: 'rgba(120, 81, 169, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Check size={20} color="#a67dd4" />
                    <div>
                      <Typography variant="subtitle2" sx={{ color: '#a67dd4' }}>
                        Test Client has {testClient.availableSessions} available sessions
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        These sessions will appear in the admin dashboard and can be used by the test client
                      </Typography>
                    </div>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SessionTestControls;
