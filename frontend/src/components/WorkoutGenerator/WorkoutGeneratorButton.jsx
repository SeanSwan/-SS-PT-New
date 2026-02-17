/**
 * Workout Generator Button Component
 * 
 * A button that opens the AI-powered workout generator:
 * - Integrates with the scheduling and client systems
 * - Allows trainers to generate custom workouts for clients
 * - Handles saving generated workouts to the client's profile
 */

import React, { useState } from 'react';
import { Button, Dialog, DialogContent, DialogTitle } from '../ui/primitives/components';
import { Dumbbell, X } from 'lucide-react';
import styled from 'styled-components';
import WorkoutGenerator from './WorkoutGenerator';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// Styled components
const GeneratorButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: linear-gradient(90deg, #7851a9, #00ffff);
  }
`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Component that provides access to the workout generator
 * @param {Object} props - Component props
 * @param {Object} props.client - Client data
 * @param {string} props.sessionId - Session ID (optional)
 * @param {('desktop'|'mobile')} props.variant - Button variant
 * @param {function} props.onWorkoutGenerated - Callback when workout is saved
 */
const WorkoutGeneratorButton = ({ client, sessionId, variant = 'desktop', onWorkoutGenerated }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Only trainers and admins can generate workouts
  const canGenerateWorkouts = user && (user.role === 'trainer' || user.role === 'admin');
  
  /**
   * Save a generated workout for the client
   * @param {string} workoutPlan - The generated workout plan text
   * @param {Object} metadata - Additional metadata about the workout
   */
  const saveWorkout = async (workoutPlan, metadata) => {
    try {
      // Make API call to save the workout
      const response = await axios.post(`${API_BASE_URL}/api/clients/${client.id}/workouts`, {
        workoutPlan,
        metadata,
        sessionId: sessionId || null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Show success message
      enqueueSnackbar('Workout plan saved to client profile!', {
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Close the dialog
      setDialogOpen(false);
      
      // Call the callback if provided
      if (onWorkoutGenerated) {
        onWorkoutGenerated(response.data.workout);
      }
    } catch (error) {
      console.error('Error saving workout plan:', error);
      enqueueSnackbar('Failed to save workout plan. Please try again.', {
        variant: 'error',
        autoHideDuration: 4000
      });
    }
  };
  
  // Don't render anything if user can't generate workouts
  if (!canGenerateWorkouts || !client) {
    return null;
  }
  
  return (
    <>
      <GeneratorButton onClick={() => setDialogOpen(true)}>
        <Dumbbell size={18} />
        Generate Workout
      </GeneratorButton>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          style: {
            background: 'rgba(20, 20, 40, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle style={{
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <span style={{ color: 'white' }}>
            Generate Workout for {client.firstName} {client.lastName}
          </span>
          <button
            onClick={() => setDialogOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </DialogTitle>

        <DialogContent style={{ padding: 16 }}>
          <WorkoutGenerator
            client={client}
            onSave={saveWorkout}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkoutGeneratorButton;
