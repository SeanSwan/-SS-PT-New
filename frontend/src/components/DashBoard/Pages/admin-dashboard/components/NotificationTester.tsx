import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Divider,
  useTheme,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../../../../../services/api';

// Import the settings management component
import NotificationSettingsList from './NotificationSettingsList';

/**
 * NotificationTester Component
 * 
 * A utility component for admin users to test email and SMS notifications
 */
const NotificationTester: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle sending a test notification to all admins
  const handleTestAdminNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.post('/test-notifications/admin', { message });
      
      setSuccess('Admin notification sent successfully! Check your email and phone.');
      console.log('Admin notification response:', response);
    } catch (err: any) {
      setError(`Failed to send admin notification: ${err.message || 'Unknown error'}`);
      console.error('Admin notification error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle sending a test notification to a specific email/phone
  const handleTestDirectNotification = async () => {
    try {
      if (!email && !phone) {
        setError('Please provide either an email or phone number');
        return;
      }
      
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.post('/test-notifications/direct', { 
        email, 
        phone, 
        message 
      });
      
      setSuccess(`Direct notification sent successfully to ${email || ''} ${phone || ''}!`);
      console.log('Direct notification response:', response);
    } catch (err: any) {
      setError(`Failed to send direct notification: ${err.message || 'Unknown error'}`);
      console.error('Direct notification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <NotificationsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" component="h2">
          Notification Management
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Send test notifications and manage notification settings.
      </Typography>
      
      {/* Tabs for Testing vs Settings */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="Notification Management Tabs"
        >
          <Tab 
            icon={<SendIcon />} 
            label="Send Test Notifications" 
            id="notification-tab-0"
            aria-controls="notification-tabpanel-0"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="Notification Settings" 
            id="notification-tab-1"
            aria-controls="notification-tabpanel-1"
          />
        </Tabs>
      </Box>
      
      {/* Test Notifications Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 0}
        id="notification-tabpanel-0"
        aria-labelledby="notification-tab-0"
      >
        {tabValue === 0 && (
          <>
            {/* Message field */}
            <TextField
              fullWidth
              label="Test Message"
              variant="outlined"
              margin="normal"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a test message to send"
            />
            
            {/* Test Admin Notification Button */}
            <Box sx={{ mt: 2, mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={handleTestAdminNotification}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Test Admin Notifications'}
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                This will send notifications to all configured admin emails and phones.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Direct Notification Section */}
            <Typography variant="subtitle1" gutterBottom>
              Test Direct Notification
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter an email address"
              />
              
              <TextField
                fullWidth
                label="Phone Number"
                variant="outlined"
                margin="normal"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter a phone number with country code (e.g., +13239968153)"
              />
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SendIcon />}
                onClick={handleTestDirectNotification}
                disabled={loading || (!email && !phone)}
              >
                {loading ? <CircularProgress size={24} /> : 'Test Direct Notification'}
              </Button>
            </Box>
            
            {/* Status messages */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
          </>
        )}
      </div>
      
      {/* Notification Settings Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 1}
        id="notification-tabpanel-1"
        aria-labelledby="notification-tab-1"
      >
        {tabValue === 1 && <NotificationSettingsList />}
      </div>
      
      {/* Success notification */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
};

export default NotificationTester;