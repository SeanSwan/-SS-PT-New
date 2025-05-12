/**
 * Create Client Modal
 * Form for adding new clients to the system
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { CreateClientRequest } from '../../../../services/adminClientService';
import { Close, Save, Cancel } from '@mui/icons-material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: '#1d1f2b',
    color: '#e0e0e0',
    borderRadius: 12,
    maxWidth: 600,
    width: '100%',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#a0a0a0',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#00ffff',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  '&.primary': {
    background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
    color: '#0a0a1a',
    '&:hover': {
      background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 255, 255, 0.3)',
    },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.3)',
    },
  },
  '&.secondary': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(0, 255, 255, 0.5)',
    },
  },
}));

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientRequest) => Promise<void>;
  trainers?: Array<{ id: string; firstName: string; lastName: string }>;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onClose,
  onSubmit,
  trainers = []
}) => {
  const [formData, setFormData] = useState<CreateClientRequest>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    weight: undefined,
    height: undefined,
    fitnessGoal: '',
    trainingExperience: '',
    healthConcerns: '',
    emergencyContact: '',
    availableSessions: 1,
    trainerId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clean up data before submission
      const cleanData: CreateClientRequest = {
        ...formData,
        weight: formData.weight || undefined,
        height: formData.height || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        fitnessGoal: formData.fitnessGoal || undefined,
        trainingExperience: formData.trainingExperience || undefined,
        healthConcerns: formData.healthConcerns || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        trainerId: formData.trainerId || undefined,
      };

      await onSubmit(cleanData);
      
      // Reset form on success
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        weight: undefined,
        height: undefined,
        fitnessGoal: '',
        trainingExperience: '',
        healthConcerns: '',
        emergencyContact: '',
        availableSessions: 1,
        trainerId: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateClientRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setFieldErrors({});
      onClose();
    }
  };

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: '#252742'
      }}>
        <span style={{ color: '#00ffff', fontSize: '1.25rem', fontWeight: 600 }}>
          Add New Client
        </span>
        <Button onClick={handleClose} disabled={loading} sx={{ color: '#e0e0e0' }}>
          <Close />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#00ffff', mb: 1 }}>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                error={!!fieldErrors.firstName}
                helperText={fieldErrors.firstName}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                error={!!fieldErrors.lastName}
                helperText={fieldErrors.lastName}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Username *"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={!!fieldErrors.username}
                helperText={fieldErrors.username}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!fieldErrors.password}
                helperText={fieldErrors.password}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Personal Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, mt: 2 }}>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#a0a0a0' }}>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  label="Gender"
                  disabled={loading}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#e0e0e0',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00ffff',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#1d1f2b',
                        '& .MuiMenuItem-root': {
                          color: '#e0e0e0',
                          '&:hover': {
                            bgcolor: 'rgba(0, 255, 255, 0.1)',
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Weight (kg)"
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value ? Number(e.target.value) : undefined)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Height (cm)"
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', e.target.value ? Number(e.target.value) : undefined)}
                disabled={loading}
              />
            </Grid>

            {/* Fitness Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, mt: 2 }}>
                Fitness Information
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Fitness Goal"
                value={formData.fitnessGoal}
                onChange={(e) => handleInputChange('fitnessGoal', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#a0a0a0' }}>Training Experience</InputLabel>
                <Select
                  value={formData.trainingExperience}
                  onChange={(e) => handleInputChange('trainingExperience', e.target.value)}
                  label="Training Experience"
                  disabled={loading}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#e0e0e0',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00ffff',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#1d1f2b',
                        '& .MuiMenuItem-root': {
                          color: '#e0e0e0',
                          '&:hover': {
                            bgcolor: 'rgba(0, 255, 255, 0.1)',
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                  <MenuItem value="expert">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <StyledTextField
                fullWidth
                label="Health Concerns"
                multiline
                rows={3}
                value={formData.healthConcerns}
                onChange={(e) => handleInputChange('healthConcerns', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <StyledTextField
                fullWidth
                label="Emergency Contact"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Training Setup */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, mt: 2 }}>
                Training Setup
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                fullWidth
                label="Initial Available Sessions"
                type="number"
                value={formData.availableSessions}
                onChange={(e) => handleInputChange('availableSessions', Number(e.target.value))}
                disabled={loading}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {trainers.length > 0 && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#a0a0a0' }}>Assign Trainer (Optional)</InputLabel>
                  <Select
                    value={formData.trainerId}
                    onChange={(e) => handleInputChange('trainerId', e.target.value)}
                    label="Assign Trainer (Optional)"
                    disabled={loading}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#e0e0e0',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 255, 255, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#00ffff',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#1d1f2b',
                          '& .MuiMenuItem-root': {
                            color: '#e0e0e0',
                            '&:hover': {
                              bgcolor: 'rgba(0, 255, 255, 0.1)',
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>No trainer assigned</em>
                    </MenuItem>
                    {trainers.map((trainer) => (
                      <MenuItem key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
        <StyledButton
          className="secondary"
          onClick={handleClose}
          disabled={loading}
          startIcon={<Cancel />}
        >
          Cancel
        </StyledButton>
        <StyledButton
          className="primary"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
        >
          {loading ? 'Creating...' : 'Create Client'}
        </StyledButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default CreateClientModal;
