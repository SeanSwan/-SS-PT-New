import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider as MuiDivider
} from '@mui/material';
import { 
  Login as LoginIcon,
  Person as PersonIcon
} from '@mui/icons-material';

/**
 * DevLogin Component
 * 
 * A developer tool for quickly testing different user roles and authentication states.
 */
const DevLogin: React.FC = () => {
  const [role, setRole] = useState<string>('client');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle login with role
  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // You would implement your dev login logic here
      // This is just a mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockToken = `dev_${role}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_role', role);
      
      setSuccess(`Successfully logged in as ${role} user`);
      
      // More robust page reload after successful login
      setTimeout(() => {
        // Force navigation to home page
        window.location.href = '/';
        
        // Backup reload as failsafe
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }, 1500);
    } catch (err) {
      setError('Failed to perform dev login');
    } finally {
      setLoading(false);
    }
  };

  // Create test user with specified role
  const handleCreateTestUser = async () => {
    if (!username) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // This would call your backend API to create a test user
      const response = await fetch('/api/dev/create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          role,
          firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
          lastName: 'User',
          email: `${username}@test.com`,
          password: 'password123'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test user');
      }
      
      const data = await response.json();
      setSuccess(`Successfully created test ${role} user: ${username}`);
    } catch (err) {
      setError('Failed to create test user. Check if development server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Paper sx={{ p: 3, backgroundColor: '#31304D' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1 }} />
          Dev Login Tool
        </Typography>
        
        <Typography variant="body2" paragraph>
          This tool allows you to quickly switch between user roles for testing without changing accounts.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="client">Client</MenuItem>
              <MenuItem value="trainer">Trainer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            fullWidth
            onClick={handleDevLogin}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            sx={{ bgcolor: '#00ffff', color: '#1a1a2e' }}
          >
            {loading ? 'Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Create Test User
        </Typography>
        
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          fullWidth
          onClick={handleCreateTestUser}
          disabled={loading || !username}
          sx={{ bgcolor: '#7851A9' }}
        >
          {loading ? <CircularProgress size={24} /> : `Create Test ${role.charAt(0).toUpperCase() + role.slice(1)}`}
        </Button>
      </Paper>
    </Box>
  );
};

// Use MuiDivider with custom styling
const Divider = ({ sx }) => (
  <MuiDivider
    sx={{ 
      height: '1px', 
      bgcolor: 'rgba(255, 255, 255, 0.1)', 
      width: '100%',
      ...sx 
    }} 
  />
);

export default DevLogin;
