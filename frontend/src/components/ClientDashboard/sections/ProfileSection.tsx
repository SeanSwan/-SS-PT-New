import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Avatar, IconButton, Chip } from '@mui/material';
import GlowButton from '../../ui/GlowButton';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

const ProfileSection: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '(555) 123-4567',
    location: 'Los Angeles, CA',
    bio: 'Fitness enthusiast and wellness advocate. I love combining traditional workouts with dance and creative movement.',
    interests: ['HIIT', 'Yoga', 'Dance', 'Nutrition']
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would normally save the data to the backend
    setEditMode(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Profile</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  src="https://via.placeholder.com/150" 
                  alt="Profile Picture"
                  sx={{ width: 150, height: 150, mb: 2 }}
                />
                {editMode && (
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 10, 
                      right: 10, 
                      bgcolor: 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                    size="small"
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              {!editMode ? (
                <GlowButton 
                  variant="primary" 
                  startIcon={<EditIcon />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </GlowButton>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <GlowButton 
                    variant="success" 
                    type="submit"
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </GlowButton>
                  <GlowButton 
                    variant="warning" 
                    startIcon={<CloseIcon />}
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </GlowButton>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} sm={8} md={9}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Full Name</Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Typography variant="body1">{formData.name}</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Email</Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                      type="email"
                    />
                  ) : (
                    <Typography variant="body1">{formData.email}</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Phone</Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Typography variant="body1">{formData.phone}</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Location</Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Typography variant="body1">{formData.location}</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Bio</Typography>
                  {editMode ? (
                    <TextField
                      fullWidth
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                      multiline
                      rows={4}
                    />
                  ) : (
                    <Typography variant="body1">{formData.bio}</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Interests</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.interests.map((interest, index) => (
                      <Chip 
                        key={index} 
                        label={interest} 
                        color="primary" 
                        variant="outlined"
                        onDelete={editMode ? () => {
                          setFormData(prev => ({
                            ...prev,
                            interests: prev.interests.filter((_, i) => i !== index)
                          }));
                        } : undefined}
                      />
                    ))}
                    {editMode && (
                      <GlowButton variant="secondary" size="small">
                        Add Interest
                      </GlowButton>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Account Settings</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <GlowButton variant="secondary" fullWidth>
              Change Password
            </GlowButton>
          </Grid>
          <Grid item xs={12} sm={6}>
            <GlowButton variant="secondary" fullWidth>
              Privacy Settings
            </GlowButton>
          </Grid>
          <Grid item xs={12} sm={6}>
            <GlowButton variant="secondary" fullWidth>
              Notification Preferences
            </GlowButton>
          </Grid>
          <Grid item xs={12} sm={6}>
            <GlowButton variant="secondary" fullWidth>
              Connected Accounts
            </GlowButton>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProfileSection;