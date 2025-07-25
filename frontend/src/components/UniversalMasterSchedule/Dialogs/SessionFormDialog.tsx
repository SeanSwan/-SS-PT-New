/**
 * Session Form Dialog Component
 * ============================
 * Comprehensive session creation and editing dialog with full functionality
 * 
 * Features:
 * - Create new sessions or edit existing ones
 * - Client and trainer assignment
 * - Time conflict detection
 * - Recurring session setup
 * - Real-time validation
 * - NASM compliance integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// Material-UI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Button,
  Chip,
  Avatar,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  Autocomplete,
  DatePicker,
  TimePicker,
  Stack,
  Divider,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';

// Icons
import {
  Save,
  X,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Star,
  Award,
  Activity,
  Target,
  Plus,
  Minus,
  Copy,
  Trash2,
  ChevronRight
} from 'lucide-react';

// Custom Components
import GlowButton from '../../ui/buttons/GlowButton';
import { useToast } from '../../../hooks/use-toast';

// Services
import sessionService from '../../../services/sessionService';
import { clientTrainerAssignmentService } from '../../../services/clientTrainerAssignmentService';

// Types
import type { Session, Client, Trainer, SessionEvent } from '../types';

interface SessionFormDialogProps {
  open: boolean;
  onClose: () => void;
  session?: SessionEvent | null;
  clients: Client[];
  trainers: Trainer[];
  onSessionSaved: (session: Session) => void;
  mode?: 'create' | 'edit' | 'duplicate';
  initialDate?: Date;
  initialTrainer?: string;
}

interface SessionFormData {
  sessionDate: string;
  duration: number;
  userId: string;
  trainerId: string;
  location: string;
  notes: string;
  status: 'available' | 'scheduled' | 'confirmed';
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    endDate?: string;
    daysOfWeek?: number[];
    occurrences?: number;
  };
  nasmAssessment?: {
    required: boolean;
    type: 'initial' | 'progress' | 'final';
    notes: string;
  };
  price?: number;
  packageId?: string;
}

interface ValidationErrors {
  sessionDate?: string;
  duration?: string;
  userId?: string;
  trainerId?: string;
  location?: string;
  general?: string;
}

const SessionFormDialog: React.FC<SessionFormDialogProps> = ({
  open,
  onClose,
  session,
  clients,
  trainers,
  onSessionSaved,
  mode = 'create',
  initialDate,
  initialTrainer
}) => {
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<SessionFormData>({
    sessionDate: initialDate?.toISOString() || new Date().toISOString(),
    duration: 60,
    userId: '',
    trainerId: initialTrainer || '',
    location: 'Main Studio',
    notes: '',
    status: 'available',
    isRecurring: false,
    price: 125
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [conflicts, setConflicts] = useState<Session[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Steps for multi-step form
  const steps = ['Basic Info', 'Assignment', 'Advanced', 'Review'];
  
  // Initialize form data when session changes
  useEffect(() => {
    if (session && mode === 'edit') {
      setFormData({
        sessionDate: session.start.toISOString(),
        duration: session.duration || 60,
        userId: session.userId || '',
        trainerId: session.trainerId || '',
        location: session.location || 'Main Studio',
        notes: session.notes || '',
        status: session.status as any,
        isRecurring: false,
        price: 125
      });
    } else if (mode === 'duplicate' && session) {
      setFormData({
        ...formData,
        duration: session.duration || 60,
        userId: session.userId || '',
        trainerId: session.trainerId || '',
        location: session.location || 'Main Studio',
        notes: session.notes || '',
        status: 'available',
        price: 125
      });
    } else if (mode === 'create') {
      setFormData({
        sessionDate: initialDate?.toISOString() || new Date().toISOString(),
        duration: 60,
        userId: '',
        trainerId: initialTrainer || '',
        location: 'Main Studio',
        notes: '',
        status: 'available',
        isRecurring: false,
        price: 125
      });
    }
  }, [session, mode, initialDate, initialTrainer]);
  
  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!formData.sessionDate) {
      newErrors.sessionDate = 'Session date is required';
    } else {
      const sessionDate = new Date(formData.sessionDate);
      if (sessionDate < new Date()) {
        newErrors.sessionDate = 'Session date cannot be in the past';
      }
    }
    
    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    } else if (formData.duration > 480) {
      newErrors.duration = 'Duration cannot exceed 8 hours';
    }
    
    if (formData.status !== 'available' && !formData.userId) {
      newErrors.userId = 'Client is required for scheduled sessions';
    }
    
    if (!formData.trainerId) {
      newErrors.trainerId = 'Trainer assignment is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  // Check for conflicts
  const checkConflicts = useCallback(async () => {
    if (!formData.sessionDate || !formData.trainerId) return;
    
    try {
      const startTime = new Date(formData.sessionDate);
      const endTime = new Date(startTime.getTime() + formData.duration * 60000);
      
      const conflictingSessions = await sessionService.checkConflicts({
        trainerId: formData.trainerId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        excludeSessionId: session?.id
      });
      
      setConflicts(conflictingSessions);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  }, [formData.sessionDate, formData.trainerId, formData.duration, session?.id]);
  
  // Run conflict check when relevant fields change
  useEffect(() => {
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [checkConflicts]);
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      });
      return;
    }
    
    if (conflicts.length > 0) {
      toast({
        title: 'Schedule Conflict',
        description: 'Please resolve conflicts before saving',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      let savedSession: Session;
      
      if (mode === 'edit' && session) {
        savedSession = await sessionService.updateSession(session.id, formData);
        toast({
          title: 'Session Updated',
          description: 'Session has been updated successfully',
          variant: 'default'
        });
      } else {
        // Handle recurring sessions
        if (formData.isRecurring && formData.recurringPattern) {
          const sessions = await sessionService.createRecurringSessions(formData);
          toast({
            title: 'Recurring Sessions Created',
            description: `Created ${sessions.length} recurring sessions`,
            variant: 'default'
          });
          savedSession = sessions[0];
        } else {
          savedSession = await sessionService.createSession(formData);
          toast({
            title: 'Session Created',
            description: 'Session has been created successfully',
            variant: 'default'
          });
        }
      }
      
      onSessionSaved(savedSession);
      onClose();
      
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save session',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle field changes
  const handleChange = (field: keyof SessionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Selected client and trainer objects
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === formData.userId), [clients, formData.userId]
  );
  
  const selectedTrainer = useMemo(() => 
    trainers.find(t => t.id === formData.trainerId), [trainers, formData.trainerId]
  );
  
  // Available time slots
  const suggestedTimes = useMemo(() => {
    const suggestions = [];
    const baseDate = new Date(formData.sessionDate);
    baseDate.setHours(6, 0, 0, 0); // Start at 6 AM
    
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date(baseDate);
        time.setHours(hour, minute, 0, 0);
        suggestions.push(time);
      }
    }
    
    return suggestions;
  }, [formData.sessionDate]);
  
  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Info
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Session Date & Time"
                type="datetime-local"
                value={formData.sessionDate.slice(0, 16)}
                onChange={(e) => handleChange('sessionDate', e.target.value + ':00.000Z')}
                error={!!errors.sessionDate}
                helperText={errors.sessionDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 60)}
                error={!!errors.duration}
                helperText={errors.duration}
                inputProps={{ min: 15, max: 480, step: 15 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                error={!!errors.location}
                helperText={errors.location}
                placeholder="e.g., Main Studio, Outdoor Area, Client's Home"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Session Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
        
      case 1: // Assignment
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.trainerId}>
                <InputLabel>Trainer</InputLabel>
                <Select
                  value={formData.trainerId}
                  onChange={(e) => handleChange('trainerId', e.target.value)}
                >
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {trainer.firstName[0]}{trainer.lastName[0]}
                        </Avatar>
                        {trainer.firstName} {trainer.lastName}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.trainerId && (
                  <Typography variant="caption" color="error">
                    {errors.trainerId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.userId}>
                <InputLabel>Client (Optional for Available Sessions)</InputLabel>
                <Select
                  value={formData.userId}
                  onChange={(e) => handleChange('userId', e.target.value)}
                >
                  <MenuItem value="">
                    <em>No Client (Available Session)</em>
                  </MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {client.firstName[0]}{client.lastName[0]}
                        </Avatar>
                        {client.firstName} {client.lastName}
                        <Chip 
                          label={`${client.availableSessions} sessions`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.userId && (
                  <Typography variant="caption" color="error">
                    {errors.userId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            {/* Conflict Detection */}
            {conflicts.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Schedule Conflicts Detected
                  </Typography>
                  {conflicts.map(conflict => (
                    <Typography key={conflict.id} variant="body2">
                      • {new Date(conflict.sessionDate).toLocaleString()} - 
                      {conflict.client ? ` ${conflict.client.firstName} ${conflict.client.lastName}` : ' Available Session'}
                    </Typography>
                  ))}
                </Alert>
              </Grid>
            )}
            
            {/* Assignment Summary */}
            {selectedTrainer && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Assignment Summary
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Avatar>
                      {selectedTrainer.firstName[0]}{selectedTrainer.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        <strong>{selectedTrainer.firstName} {selectedTrainer.lastName}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Trainer • {selectedTrainer.specialties || 'General Training'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {selectedClient && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>
                        {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Client • {selectedClient.availableSessions} sessions remaining
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        );
        
      case 2: // Advanced
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  />
                }
                label="Create Recurring Sessions"
              />
            </Grid>
            
            {formData.isRecurring && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.recurringPattern?.frequency || 'weekly'}
                      onChange={(e) => handleChange('recurringPattern', {
                        ...formData.recurringPattern,
                        frequency: e.target.value
                      })}
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="biweekly">Bi-weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Number of Occurrences"
                    type="number"
                    value={formData.recurringPattern?.occurrences || 4}
                    onChange={(e) => handleChange('recurringPattern', {
                      ...formData.recurringPattern,
                      occurrences: parseInt(e.target.value) || 4
                    })}
                    inputProps={{ min: 1, max: 52 }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Session Price"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 125)}
                InputProps={{
                  startAdornment: '$'
                }}
                inputProps={{ min: 0, step: 5 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Session Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any special instructions, equipment needs, or notes about this session..."
              />
            </Grid>
            
            {/* NASM Assessment Integration */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.nasmAssessment?.required || false}
                    onChange={(e) => handleChange('nasmAssessment', {
                      ...formData.nasmAssessment,
                      required: e.target.checked,
                      type: 'initial',
                      notes: ''
                    })}
                  />
                }
                label="Include NASM Assessment"
              />
            </Grid>
            
            {formData.nasmAssessment?.required && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assessment Type</InputLabel>
                  <Select
                    value={formData.nasmAssessment.type}
                    onChange={(e) => handleChange('nasmAssessment', {
                      ...formData.nasmAssessment,
                      type: e.target.value
                    })}
                  >
                    <MenuItem value="initial">Initial Assessment</MenuItem>
                    <MenuItem value="progress">Progress Check</MenuItem>
                    <MenuItem value="final">Final Assessment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        );
        
      case 3: // Review
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Session Review
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Session Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {new Date(formData.sessionDate).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {formData.duration} minutes
                  </Typography>
                  <Typography variant="body2">
                    <strong>Location:</strong> {formData.location}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {formData.status}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Price:</strong> ${formData.price}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Assignment
                  </Typography>
                  <Typography variant="body2">
                    <strong>Trainer:</strong> {selectedTrainer ? `${selectedTrainer.firstName} ${selectedTrainer.lastName}` : 'Not assigned'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Client:</strong> {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Available session'}
                  </Typography>
                  {formData.isRecurring && (
                    <Typography variant="body2">
                      <strong>Recurring:</strong> {formData.recurringPattern?.frequency} for {formData.recurringPattern?.occurrences} sessions
                    </Typography>
                  )}
                </Paper>
              </Grid>
              
              {formData.notes && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {formData.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #0a0a0f, #1e1e3f)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Calendar size={24} />
        {mode === 'create' ? 'Create New Session' : 
         mode === 'edit' ? 'Edit Session' : 
         'Duplicate Session'}
        
        {loading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#00ffff'
              }
            }} 
          />
        )}
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ 
                '& .MuiStepLabel-label': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiStepLabel-label.Mui-active': { color: 'white' },
                '& .MuiStepLabel-label.Mui-completed': { color: '#22c55e' }
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent(activeStep)}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          disabled={loading}
        >
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={() => setActiveStep(prev => prev - 1)}
            sx={{ color: 'white' }}
            disabled={loading}
          >
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <GlowButton
            text="Next"
            variant="primary"
            rightIcon={<ChevronRight size={16} />}
            onClick={() => setActiveStep(prev => prev + 1)}
            disabled={loading}
          />
        ) : (
          <GlowButton
            text={loading ? 'Saving...' : 'Save Session'}
            variant="emerald"
            leftIcon={loading ? <Activity className="animate-spin" size={16} /> : <Save size={16} />}
            onClick={handleSubmit}
            disabled={loading}
          />
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SessionFormDialog;