import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Switch, 
  FormControlLabel, 
  Divider,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import GlowButton from '../../ui/GlowButton';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const SettingsSection: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      workout: true,
      achievement: true,
      community: true,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      showActivity: true,
      showProgress: true,
      allowMessages: true
    },
    appearance: {
      theme: 'dark',
      fontScale: 1.0,
      highContrast: false,
      animationReduced: false
    },
    accessibility: {
      screenReader: false,
      keyboardNavigation: true,
      textToSpeech: false,
      captions: false
    }
  });

  const handleSwitchChange = (category, setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: event.target.checked
      }
    }));
  };

  const handleSelectChange = (category, setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: event.target.value
      }
    }));
  };

  const handleSliderChange = (category, setting) => (event, newValue) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: newValue
      }
    }));
  };

  const handleSave = () => {
    // Here you would normally save settings to the backend
    alert('Settings saved!');
  };

  const handleReset = () => {
    // Reset to default settings
    // This would normally fetch defaults from the backend
    alert('Settings reset to defaults');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Notification Channels</Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.email} 
                  onChange={handleSwitchChange('notifications', 'email')}
                  color="primary"
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.push} 
                  onChange={handleSwitchChange('notifications', 'push')}
                  color="primary"
                />
              }
              label="Push Notifications"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.sms} 
                  onChange={handleSwitchChange('notifications', 'sms')}
                  color="primary"
                />
              }
              label="SMS Notifications"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Notification Types</Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.workout} 
                  onChange={handleSwitchChange('notifications', 'workout')}
                  color="primary"
                />
              }
              label="Workout Reminders"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.achievement} 
                  onChange={handleSwitchChange('notifications', 'achievement')}
                  color="primary"
                />
              }
              label="Achievements & Badges"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.community} 
                  onChange={handleSwitchChange('notifications', 'community')}
                  color="primary"
                />
              }
              label="Community Activity"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications.marketing} 
                  onChange={handleSwitchChange('notifications', 'marketing')}
                  color="primary"
                />
              }
              label="Marketing & Promotions"
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" sx={{ mb: 2 }}>Privacy</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="profile-visibility-label">Profile Visibility</InputLabel>
              <Select
                labelId="profile-visibility-label"
                value={settings.privacy.profileVisibility}
                label="Profile Visibility"
                onChange={handleSelectChange('privacy', 'profileVisibility')}
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="friends">Friends Only</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.privacy.showActivity} 
                  onChange={handleSwitchChange('privacy', 'showActivity')}
                  color="primary"
                />
              }
              label="Show Activity Status"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.privacy.showProgress} 
                  onChange={handleSwitchChange('privacy', 'showProgress')}
                  color="primary"
                />
              }
              label="Share Progress & Achievements"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.privacy.allowMessages} 
                  onChange={handleSwitchChange('privacy', 'allowMessages')}
                  color="primary"
                />
              }
              label="Allow Direct Messages"
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" sx={{ mb: 2 }}>Appearance & Accessibility</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Theme</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="theme-select-label">Theme</InputLabel>
              <Select
                labelId="theme-select-label"
                value={settings.appearance.theme}
                label="Theme"
                onChange={handleSelectChange('appearance', 'theme')}
              >
                <MenuItem value="dark">Dark Theme</MenuItem>
                <MenuItem value="light">Light Theme</MenuItem>
                <MenuItem value="system">System Default</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="subtitle2" gutterBottom>
              Text Size: {settings.appearance.fontScale.toFixed(1)}x
            </Typography>
            <Slider
              value={settings.appearance.fontScale}
              min={0.8}
              max={1.4}
              step={0.1}
              marks
              onChange={handleSliderChange('appearance', 'fontScale')}
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Accessibility Options</Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.appearance.highContrast} 
                  onChange={handleSwitchChange('appearance', 'highContrast')}
                  color="primary"
                />
              }
              label="High Contrast Mode"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.appearance.animationReduced} 
                  onChange={handleSwitchChange('appearance', 'animationReduced')}
                  color="primary"
                />
              }
              label="Reduced Animation"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.accessibility.screenReader} 
                  onChange={handleSwitchChange('accessibility', 'screenReader')}
                  color="primary"
                />
              }
              label="Screen Reader Support"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.accessibility.keyboardNavigation} 
                  onChange={handleSwitchChange('accessibility', 'keyboardNavigation')}
                  color="primary"
                />
              }
              label="Enhanced Keyboard Navigation"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <GlowButton
          variant="warning"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
        >
          Reset to Defaults
        </GlowButton>
        
        <GlowButton
          variant="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Save Settings
        </GlowButton>
      </Box>
    </Box>
  );
};

export default SettingsSection;