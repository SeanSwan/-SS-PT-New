/**
 * Voice Session Logger Component
 * 
 * A mobile-optimized interface for trainers to log workout details via voice:
 * - Provides real-time voice recording and transcription
 * - Allows trainers to quickly log exercises, reps, sets, weights, etc.
 * - Integrates with the session scheduling system
 * - Supports gamification rewards for comprehensive logging
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { 
  Button, IconButton, Box, Typography, Card, CardContent, Chip, 
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemIcon, Divider, CircularProgress,
  Drawer, Grid, Paper, Avatar, Tooltip, Snackbar, Alert
} from '@mui/material';
import {
  Mic, MicOff, Send, Refresh, Save, Close, PlayArrow, Check,
  Lightbulb, MusicNote, FitnessCenter, Battery5Bar, WaterDrop,
  Pool, DirectionsRun, SportsHandball, FormatListBulleted, DeleteOutline,
  ArrowBack, Timer, Numbers, Add, Edit, Done, HistoryToggleOff
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../context/AuthContext';
import sessionLogService from './SessionLogService';
import gamificationService from '../../services/gamification/gamification-service';

// Animation keyframes
const pulseAnimation = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
  }
`;

// Styled components
const VoiceLoggerContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 60, 0.8);
  border-radius: 16px;
  padding: 1rem;
  position: relative;
  height: 100%;
  min-height: 580px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  overflow: hidden;
  
  /* Glass morphism effect */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  ${pulseAnimation}
  
  @media (max-width: 768px) {
    min-height: 100vh;
    border-radius: 0;
    max-width: 100%;
  }
`;

const LoggerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  
  h2 {
    font-size: 1.5rem;
    font-weight: 300;
    margin: 0;
    background: linear-gradient(
      to right,
      #a9f8fb,
      #46cdcf,
      #7b2cbf,
      #c8b6ff
    );
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }
`;

const ClientInfoCard = styled(Card)`
  && {
    background: rgba(20, 20, 40, 0.7);
    color: white;
    margin-bottom: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const SessionDetailsList = styled(List)`
  && {
    background: rgba(20, 20, 40, 0.7);
    border-radius: 8px;
    padding: 0.5rem;
    margin-bottom: 1rem;
    max-height: 300px;
    overflow-y: auto;
    
    /* Scrollbar styling */
    &::-webkit-scrollbar {
      width: 5px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 255, 255, 0.3);
      border-radius: 4px;
    }
  }
`;

const SessionDetail = styled(ListItem)`
  && {
    background: rgba(30, 30, 60, 0.5);
    border-radius: 8px;
    margin-bottom: 0.5rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const VoiceButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding: 1rem 0;
`;

const VoiceButton = styled(IconButton)`
  && {
    width: 80px;
    height: 80px;
    background: ${props => props.isRecording ? 'linear-gradient(135deg, #ff5252, #ff1744)' : 'linear-gradient(135deg, #00ffff, #7851a9)'};
    color: white;
    animation: ${props => props.isRecording ? 'pulse 1s infinite' : 'none'};
    
    &:hover {
      background: ${props => props.isRecording ? 'linear-gradient(135deg, #ff1744, #d50000)' : 'linear-gradient(135deg, #7851a9, #00ffff)'};
    }
    
    svg {
      font-size: 2rem;
    }
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const StyledTextField = styled(TextField)`
  && {
    flex: 1;
    
    .MuiOutlinedInput-root {
      background: rgba(20, 20, 40, 0.7);
      border-radius: 8px;
      
      fieldset {
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      &:hover fieldset {
        border-color: rgba(0, 255, 255, 0.5);
      }
      
      &.Mui-focused fieldset {
        border-color: #00ffff;
      }
    }
    
    .MuiOutlinedInput-input {
      color: white;
    }
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;

const ActionButton = styled(Button)`
  && {
    background: linear-gradient(90deg, #00ffff, #7851a9);
    color: white;
    border-radius: 8px;
    text-transform: none;
    
    &:hover {
      background: linear-gradient(90deg, #7851a9, #00ffff);
    }
    
    &:disabled {
      background: rgba(128, 128, 128, 0.3);
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const TemplateChip = styled(Chip)`
  && {
    margin: 0.25rem;
    background: rgba(0, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(0, 255, 255, 0.3);
    
    &:hover {
      background: rgba(0, 255, 255, 0.3);
    }
  }
`;

const LogTypeSelector = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
`;

const LogTypeButton = styled(Button)`
  && {
    background: ${props => props.active ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(30, 30, 60, 0.7)'};
    color: white;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    text-transform: none;
    flex: 1;
    
    &:hover {
      background: ${props => props.active ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(50, 50, 80, 0.7)'};
    }
  }
`;

/**
 * Voice-activated session logging component for trainers
 */
const VoiceSessionLogger = ({ sessionId, sessionData, onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State for recording and processing
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedExercise, setRecognizedExercise] = useState(null);
  
  // State for logged session details
  const [sessionLogs, setSessionLogs] = useState([]);
  const [textInput, setTextInput] = useState('');
  
  // State for loading and UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logType, setLogType] = useState('voice'); // 'voice', 'text', or 'template'
  
  // State for templates
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Refs for media recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // Speech recognition
  const recognitionRef = useRef(null);

  // Initialize component
  useEffect(() => {
    // Fetch existing logs
    fetchSessionLogs();
    
    // Fetch exercise templates
    fetchExerciseTemplates();
    
    // Set up speech recognition if available
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setTranscript(transcript);
        
        // Try to recognize exercise in real-time
        const parsedDetails = sessionLogService.parseWorkoutText(transcript);
        if (parsedDetails.exercise) {
          setRecognizedExercise(parsedDetails);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      };
    }
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId]);
  
  /**
   * Fetch existing session logs
   */
  const fetchSessionLogs = async () => {
    try {
      setLoading(true);
      const logs = await sessionLogService.getSessionLogs(sessionId);
      setSessionLogs(logs);
    } catch (error) {
      console.error('Error fetching session logs:', error);
      setError('Could not load existing session logs. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch exercise templates
   */
  const fetchExerciseTemplates = async () => {
    try {
      const templateData = await sessionLogService.getExerciseTemplates();
      setTemplates(templateData);
    } catch (error) {
      console.error('Error fetching exercise templates:', error);
      // Not setting error state as templates are not critical
    }
  };
  
  /**
   * Start voice recording
   */
  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      setRecognizedExercise(null);
      
      // Request audio recording permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processRecording(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
        
        // Automatically stop after 30 seconds
        if (seconds >= 30) {
          stopRecording();
        }
      }, 1000);
      
      enqueueSnackbar('Recording started. Speak clearly and mention exercise details.', {
        variant: 'info',
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };
  
  /**
   * Stop voice recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      setRecordingTime(0);
      
      enqueueSnackbar('Recording stopped. Processing...', {
        variant: 'info',
        autoHideDuration: 2000
      });
    }
  };
  
  /**
   * Process the recorded audio
   */
  const processRecording = async (audioBlob) => {
    try {
      setIsProcessing(true);
      
      // Submit the recording to the server
      const result = await sessionLogService.logSessionDetailVoice(sessionId, audioBlob);
      
      if (result.success) {
        // Add the new log to the list
        setSessionLogs(prev => [result.loggedDetail, ...prev]);
        
        enqueueSnackbar('Successfully logged exercise details!', {
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Show gamification rewards if any
        if (result.gamification && result.gamification.pointsAwarded) {
          enqueueSnackbar(`+${result.gamification.pointsAwarded} points for detailed logging!`, {
            variant: 'success',
            autoHideDuration: 3000
          });
        }
      } else {
        setError('Could not process voice recording. Please try again or use text input.');
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      setError('Error processing voice recording. Please try again or use text input.');
    } finally {
      setIsProcessing(false);
      setTranscript('');
      setRecognizedExercise(null);
    }
  };
  
  /**
   * Submit text input for logging
   */
  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError('Please enter exercise details.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError('');
      
      const result = await sessionLogService.logSessionDetail(sessionId, textInput);
      
      if (result.success) {
        // Add the new log to the list
        setSessionLogs(prev => [result.loggedDetail, ...prev]);
        
        // Clear input
        setTextInput('');
        
        enqueueSnackbar('Successfully logged exercise details!', {
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Show gamification rewards if any
        if (result.gamification && result.gamification.pointsAwarded) {
          enqueueSnackbar(`+${result.gamification.pointsAwarded} points for detailed logging!`, {
            variant: 'success',
            autoHideDuration: 3000
          });
        }
      } else {
        setError('Could not process text input. Please try using different wording.');
      }
    } catch (error) {
      console.error('Error submitting text:', error);
      setError('Error submitting text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Use an exercise template
   */
  const useTemplate = (template) => {
    setTextInput(template.description);
    setShowTemplates(false);
    setLogType('text');
  };
  
  /**
   * Delete a logged detail
   */
  const deleteLoggedDetail = async (logId) => {
    try {
      // Ask for confirmation
      if (!window.confirm('Are you sure you want to delete this logged detail?')) {
        return;
      }
      
      setIsProcessing(true);
      
      // Call API to delete the log
      await sessionLogService.deleteSessionLog(sessionId, logId);
      
      // Update local state
      setSessionLogs(prev => prev.filter(log => log.id !== logId));
      
      enqueueSnackbar('Log entry deleted.', {
        variant: 'success',
        autoHideDuration: 2000
      });
    } catch (error) {
      console.error('Error deleting log:', error);
      setError('Could not delete log entry. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Generate a formatted time string from seconds
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Icon mapping for log types
  const getIconForLogType = (logType) => {
    switch (logType) {
      case 'exercise': return <FitnessCenter />;
      case 'water': return <WaterDrop />;
      case 'stretch': return <Pool />;
      case 'cardio': return <DirectionsRun />;
      case 'rest': return <HistoryToggleOff />;
      case 'note': return <Lightbulb />;
      default: return <FitnessCenter />;
    }
  };
  
  return (
    <VoiceLoggerContainer>
      <LoggerHeader>
        <IconButton onClick={onClose} color="inherit">
          <ArrowBack />
        </IconButton>
        
        <h2>Session Logging</h2>
        
        <IconButton 
          onClick={fetchSessionLogs}
          disabled={loading || isProcessing}
          color="inherit"
        >
          <Refresh />
        </IconButton>
      </LoggerHeader>
      
      {/* Client/Session Info */}
      <ClientInfoCard>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            {sessionData?.client ? `${sessionData.client.firstName} ${sessionData.client.lastName}` : 'Client Session'}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
            {sessionData?.start ? new Date(sessionData.start).toLocaleString() : 'Ongoing Session'}
          </Typography>
          
          {sessionData?.location && (
            <Chip
              icon={<LocationOn />}
              label={sessionData.location}
              sx={{ mt: 1, background: 'rgba(0, 255, 255, 0.2)', color: 'white' }}
              size="small"
            />
          )}
        </CardContent>
      </ClientInfoCard>
      
      {/* Log Type Selector */}
      <LogTypeSelector>
        <LogTypeButton 
          active={logType === 'voice'} 
          onClick={() => setLogType('voice')}
          startIcon={<Mic />}
        >
          Voice
        </LogTypeButton>
        
        <LogTypeButton 
          active={logType === 'text'} 
          onClick={() => setLogType('text')}
          startIcon={<Edit />}
        >
          Text
        </LogTypeButton>
        
        <LogTypeButton 
          active={logType === 'template'} 
          onClick={() => {
            setLogType('template');
            setShowTemplates(true);
          }}
          startIcon={<FormatListBulleted />}
        >
          Templates
        </LogTypeButton>
      </LogTypeSelector>
      
      {/* Error Message */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.2)', color: 'white' }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {/* Voice Recording UI */}
      {logType === 'voice' && (
        <>
          {transcript && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                mb: 2, 
                background: 'rgba(0, 255, 255, 0.1)', 
                color: 'white',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.3)'
              }}
            >
              <Typography variant="body1">{transcript}</Typography>
              
              {recognizedExercise && recognizedExercise.exercise && (
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    icon={<FitnessCenter />}
                    label={`Exercise: ${recognizedExercise.exercise}`}
                    sx={{ background: 'rgba(0, 255, 255, 0.2)', color: 'white', mr: 1, mb: 1 }}
                  />
                  
                  {recognizedExercise.reps && (
                    <Chip 
                      icon={<Numbers />}
                      label={`Reps: ${recognizedExercise.reps}`}
                      sx={{ background: 'rgba(0, 255, 255, 0.2)', color: 'white', mr: 1, mb: 1 }}
                    />
                  )}
                  
                  {recognizedExercise.sets && (
                    <Chip 
                      icon={<FormatListBulleted />}
                      label={`Sets: ${recognizedExercise.sets}`}
                      sx={{ background: 'rgba(0, 255, 255, 0.2)', color: 'white', mr: 1, mb: 1 }}
                    />
                  )}
                  
                  {recognizedExercise.weight && (
                    <Chip 
                      icon={<FitnessCenter />}
                      label={`Weight: ${recognizedExercise.weight} ${recognizedExercise.weightUnit || 'lbs'}`}
                      sx={{ background: 'rgba(0, 255, 255, 0.2)', color: 'white', mr: 1, mb: 1 }}
                    />
                  )}
                </Box>
              )}
            </Paper>
          )}
          
          <VoiceButtonContainer>
            <VoiceButton
              isRecording={isRecording}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? <MicOff /> : <Mic />}
            </VoiceButton>
          </VoiceButtonContainer>
          
          {isRecording && (
            <Typography 
              variant="body2" 
              align="center"
              sx={{ color: '#ff5252', mt: 1 }}
            >
              Recording: {formatTime(recordingTime)}
            </Typography>
          )}
          
          <Typography 
            variant="body2" 
            align="center"
            sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Tap to {isRecording ? 'stop' : 'start'} recording voice. Clearly state exercise details.
          </Typography>
          
          <Typography 
            variant="body2" 
            align="center"
            sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}
          >
            Example: "Exercise is bench press, 3 sets of 10 reps with 135 pounds"
          </Typography>
        </>
      )}
      
      {/* Text Input UI */}
      {logType === 'text' && (
        <InputContainer>
          <StyledTextField
            label="Enter exercise details"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="E.g., Exercise bench press, 3 sets of 10 reps with 135 pounds"
            disabled={isProcessing}
          />
          
          <IconButton
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            sx={{ 
              alignSelf: 'flex-end',
              background: 'rgba(0, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                background: 'rgba(0, 255, 255, 0.3)'
              },
              '&:disabled': {
                background: 'rgba(128, 128, 128, 0.2)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            <Send />
          </IconButton>
        </InputContainer>
      )}
      
      {/* Template Selection UI */}
      {logType === 'template' && showTemplates && (
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
          >
            Select a template:
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {templates.map((template) => (
              <TemplateChip
                key={template.id}
                label={template.name}
                onClick={() => useTemplate(template)}
                icon={getIconForLogType(template.category)}
                clickable
              />
            ))}
            
            {templates.length === 0 && (
              <Typography 
                variant="body2" 
                sx={{ color: 'rgba(255, 255, 255, 0.5)', p: 1 }}
              >
                No templates available. You can create custom templates from the admin panel.
              </Typography>
            )}
          </Box>
        </Box>
      )}
      
      {/* Logged Details */}
      <Typography 
        variant="subtitle1" 
        sx={{ 
          color: 'white', 
          mt: 2, 
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <FormatListBulleted fontSize="small" /> Logged Details
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={30} sx={{ color: '#00ffff' }} />
        </Box>
      ) : (
        <SessionDetailsList>
          {sessionLogs.length === 0 ? (
            <Typography 
              variant="body2" 
              sx={{ color: 'rgba(255, 255, 255, 0.5)', p: 2, textAlign: 'center' }}
            >
              No details logged yet. Use voice or text input to log exercise details.
            </Typography>
          ) : (
            sessionLogs.map((log) => (
              <SessionDetail key={log.id}>
                <ListItemIcon sx={{ color: '#00ffff' }}>
                  {getIconForLogType(log.type)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Typography sx={{ color: 'white' }}>
                      {log.exercise || log.type}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', mt: 0.5 }}>
                      {log.sets && log.reps && (
                        <Chip 
                          label={`${log.sets} × ${log.reps}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5, background: 'rgba(0, 255, 255, 0.1)' }}
                        />
                      )}
                      
                      {log.weight && (
                        <Chip 
                          label={`${log.weight} ${log.weightUnit || 'lbs'}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5, background: 'rgba(0, 255, 255, 0.1)' }}
                        />
                      )}
                      
                      {log.duration && (
                        <Chip 
                          label={`${log.duration} ${log.durationUnit || 'min'}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5, background: 'rgba(0, 255, 255, 0.1)' }}
                        />
                      )}
                      
                      {log.rest && (
                        <Chip 
                          label={`Rest: ${log.rest} ${log.restUnit || 'sec'}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5, background: 'rgba(120, 120, 120, 0.2)' }}
                        />
                      )}
                      
                      {log.notes && (
                        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {log.notes}
                        </Typography>
                      )}
                      
                      <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />
                
                <IconButton
                  size="small"
                  onClick={() => deleteLoggedDetail(log.id)}
                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </SessionDetail>
            ))
          )}
        </SessionDetailsList>
      )}
      
      {/* Loading indicator */}
      {isProcessing && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'rgba(20, 20, 40, 0.8)',
          borderRadius: '16px',
          zIndex: 10
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#00ffff' }} />
            <Typography sx={{ color: 'white', mt: 2 }}>
              Processing...
            </Typography>
          </Box>
        </Box>
      )}
    </VoiceLoggerContainer>
  );
};

export default VoiceSessionLogger;
