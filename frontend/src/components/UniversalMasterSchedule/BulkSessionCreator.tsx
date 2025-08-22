/**
 * 🚀 BULK SESSION CREATOR - Business Efficiency Tool
 * =================================================
 * Allows admins to quickly create multiple sessions at once
 * Essential for training businesses to set up weekly schedules
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Grid,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import { Calendar, Clock, Users } from 'lucide-react';

interface BulkSessionCreatorProps {
  open: boolean;
  onClose: () => void;
  onSave: (sessions: any[]) => void;
  trainers: Array<{
    id: number;
    firstName: string;
    lastName: string;
  }>;
}

const BulkSessionCreator: React.FC<BulkSessionCreatorProps> = ({
  open,
  onClose,
  onSave,
  trainers
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    selectedDays: [] as number[], // 0-6 for Sunday-Saturday
    times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    duration: 60,
    location: 'Main Studio',
    trainerId: ''
  });

  const [customTime, setCustomTime] = useState('');
  const [preview, setPreview] = useState<any[]>([]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleDayToggle = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayIndex)
        ? prev.selectedDays.filter(d => d !== dayIndex)
        : [...prev.selectedDays, dayIndex]
    }));
  };

  const addCustomTime = () => {
    if (customTime && !formData.times.includes(customTime)) {
      setFormData(prev => ({
        ...prev,
        times: [...prev.times, customTime].sort()
      }));
      setCustomTime('');
    }
  };

  const removeTime = (timeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.filter(t => t !== timeToRemove)
    }));
  };

  const generatePreview = () => {
    if (!formData.startDate || !formData.endDate || formData.selectedDays.length === 0 || formData.times.length === 0) {
      setPreview([]);
      return;
    }

    const sessions = [];
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (formData.selectedDays.includes(date.getDay())) {
        formData.times.forEach(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const sessionDate = new Date(date);
          sessionDate.setHours(hours, minutes, 0, 0);
          
          sessions.push({
            sessionDate: sessionDate.toISOString(),
            duration: formData.duration,
            location: formData.location,
            trainerId: formData.trainerId || null,
            status: 'available'
          });
        });
      }
    }
    
    setPreview(sessions);
  };

  React.useEffect(() => {
    generatePreview();
  }, [formData]);

  const handleSave = () => {
    if (preview.length > 0) {
      onSave(preview);
      onClose();
      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        selectedDays: [],
        times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        duration: 60,
        location: 'Main Studio',
        trainerId: ''
      });
      setPreview([]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Calendar size={24} />
          Bulk Session Creator
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Date Range */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Date Range
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Days of Week */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Days of Week
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {dayNames.map((day, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={formData.selectedDays.includes(index)}
                      onChange={() => handleDayToggle(index)}
                    />
                  }
                  label={day}
                />
              ))}
            </Box>
          </Grid>

          {/* Times */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Session Times
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {formData.times.map(time => (
                <Chip
                  key={time}
                  label={time}
                  onDelete={() => removeTime(time)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Add Time"
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button onClick={addCustomTime} variant="outlined">
                Add
              </Button>
            </Box>
          </Grid>

          {/* Session Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Session Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Default Trainer (Optional)</InputLabel>
                  <Select
                    value={formData.trainerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, trainerId: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {trainers.map(trainer => (
                      <MenuItem key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Preview */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Preview ({preview.length} sessions)
            </Typography>
            {preview.length > 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                This will create {preview.length} available session slots.
              </Alert>
            ) : (
              <Alert severity="warning">
                Please fill in all fields to see preview.
              </Alert>
            )}
            
            {preview.length > 50 && (
              <Alert severity="warning">
                Creating {preview.length} sessions at once. This may take a moment.
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={preview.length === 0}
          startIcon={<Clock size={18} />}
        >
          Create {preview.length} Sessions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkSessionCreator;
