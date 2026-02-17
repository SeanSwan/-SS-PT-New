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
import styled, { keyframes } from 'styled-components';
import {
  Mic, MicOff, Send, RefreshCw, Dumbbell, Droplets,
  Waves, PersonStanding, List as ListIcon, Trash2,
  ArrowLeft, Hash, Pencil, Lightbulb, Clock, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../context/AuthContext';
import sessionLogService from './SessionLogService';
import gamificationService from '../../services/gamification/gamification-service';

// Animation keyframes
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled components
const VoiceLoggerContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
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
  border: 1px solid rgba(14, 165, 233, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

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

const HeaderIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ClientInfoCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
  margin-bottom: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  backdrop-filter: blur(10px);
  padding: 1rem;
`;

const ClientName = styled.h3`
  color: #0ea5e9;
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
`;

const ClientSessionTime = styled.p`
  color: rgba(226, 232, 240, 0.7);
  margin: 0;
  font-size: 0.875rem;
`;

const LocationChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  border-radius: 16px;
  font-size: 0.75rem;
  border: 1px solid rgba(14, 165, 233, 0.3);
`;

const SessionDetailsList = styled.ul`
  list-style: none;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 8px;
  padding: 0.5rem;
  margin: 0 0 1rem 0;
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
    background: rgba(14, 165, 233, 0.3);
    border-radius: 4px;
  }
`;

const SessionDetail = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailIconWrap = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0ea5e9;
  flex-shrink: 0;
  margin-top: 0.125rem;
`;

const DetailContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const DetailPrimary = styled.span`
  display: block;
  color: #e2e8f0;
  font-size: 0.95rem;
  font-weight: 500;
`;

const DetailSecondary = styled.div`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

const DetailChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-right: 0.375rem;
  margin-bottom: 0.375rem;
  background: ${({ $muted }) => $muted ? 'rgba(120, 120, 120, 0.2)' : 'rgba(14, 165, 233, 0.1)'};
  color: #e2e8f0;
`;

const DetailNotes = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.6);
`;

const DetailTimestamp = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.4);
`;

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.5);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
`;

const VoiceButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding: 1rem 0;
`;

const VoiceButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: ${({ $isRecording }) => $isRecording ? 'linear-gradient(135deg, #ff5252, #ff1744)' : 'linear-gradient(135deg, #00ffff, #7851a9)'};
  color: white;
  animation: ${({ $isRecording }) => $isRecording ? pulse : 'none'} 1s infinite;
  transition: background 0.3s ease;

  &:hover {
    background: ${({ $isRecording }) => $isRecording ? 'linear-gradient(135deg, #ff1744, #d50000)' : 'linear-gradient(135deg, #7851a9, #00ffff)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 2rem;
    height: 2rem;
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const StyledTextArea = styled.textarea`
  flex: 1;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(226, 232, 240, 0.5);
  }

  &:hover {
    border-color: rgba(14, 165, 233, 0.5);
  }

  &:focus {
    border-color: #0ea5e9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  align-self: flex-end;
  background: rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.3);
  }

  &:disabled {
    background: rgba(128, 128, 128, 0.2);
    color: rgba(226, 232, 240, 0.3);
    cursor: not-allowed;
  }
`;

const LogTypeSelector = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
`;

const LogTypeButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  background: ${({ $active }) => $active ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(15, 23, 42, 0.7)'};
  color: #e2e8f0;
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  padding: 0.5rem 1rem;
  cursor: pointer;
  flex: 1;
  font-size: 0.875rem;
  font-family: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ $active }) => $active ? 'linear-gradient(90deg, #00ffff, #7851a9)' : 'rgba(50, 50, 80, 0.7)'};
  }
`;

const ErrorAlert = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(211, 47, 47, 0.2);
  color: #e2e8f0;
  border-radius: 8px;
  border: 1px solid rgba(211, 47, 47, 0.3);
  font-size: 0.875rem;
`;

const ErrorCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.7);
  cursor: pointer;
  border-radius: 50%;
  margin-left: 0.5rem;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TranscriptPanel = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  background: rgba(14, 165, 233, 0.1);
  color: #e2e8f0;
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.3);
`;

const TranscriptText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #e2e8f0;
`;

const RecognizedChipsContainer = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const RecognizedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  background: rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  border-radius: 16px;
  font-size: 0.8rem;
  border: 1px solid rgba(14, 165, 233, 0.3);
`;

const RecordingTime = styled.p`
  text-align: center;
  color: #ff5252;
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
`;

const HelpText = styled.p`
  text-align: center;
  margin: ${({ $mt }) => $mt || '1rem'} 0 0 0;
  color: ${({ $dimmer }) => $dimmer ? 'rgba(226, 232, 240, 0.5)' : 'rgba(226, 232, 240, 0.7)'};
  font-size: ${({ $dimmer }) => $dimmer ? '0.75rem' : '0.875rem'};
`;

const TemplateContainer = styled.div`
  margin-bottom: 1rem;
`;

const TemplateLabel = styled.p`
  color: rgba(226, 232, 240, 0.7);
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
`;

const TemplateChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const TemplateChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.25rem;
  padding: 0.375rem 0.75rem;
  min-height: 44px;
  background: rgba(14, 165, 233, 0.2);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.3);
  }
`;

const NoTemplatesText = styled.p`
  color: rgba(226, 232, 240, 0.5);
  padding: 0.5rem;
  margin: 0;
  font-size: 0.875rem;
`;

const SectionTitle = styled.h4`
  color: #e2e8f0;
  margin: 1rem 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
`;

const LoadingCenter = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 0;
`;

const Spinner = styled.div`
  width: ${({ $size }) => $size || 30}px;
  height: ${({ $size }) => $size || 30}px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const NoLogsText = styled.p`
  color: rgba(226, 232, 240, 0.5);
  padding: 1rem;
  text-align: center;
  margin: 0;
  font-size: 0.875rem;
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 16px;
  z-index: 10;
`;

const ProcessingContent = styled.div`
  text-align: center;
`;

const ProcessingText = styled.p`
  color: #e2e8f0;
  margin: 1rem 0 0 0;
  font-size: 1rem;
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
      case 'exercise': return <Dumbbell size={18} />;
      case 'water': return <Droplets size={18} />;
      case 'stretch': return <Waves size={18} />;
      case 'cardio': return <PersonStanding size={18} />;
      case 'rest': return <Clock size={18} />;
      case 'note': return <Lightbulb size={18} />;
      default: return <Dumbbell size={18} />;
    }
  };

  return (
    <VoiceLoggerContainer>
      <LoggerHeader>
        <HeaderIconButton onClick={onClose} aria-label="Go back">
          <ArrowLeft size={20} />
        </HeaderIconButton>

        <h2>Session Logging</h2>

        <HeaderIconButton
          onClick={fetchSessionLogs}
          disabled={loading || isProcessing}
          aria-label="Refresh logs"
        >
          <RefreshCw size={20} />
        </HeaderIconButton>
      </LoggerHeader>

      {/* Client/Session Info */}
      <ClientInfoCard>
        <ClientName>
          {sessionData?.client ? `${sessionData.client.firstName} ${sessionData.client.lastName}` : 'Client Session'}
        </ClientName>

        <ClientSessionTime>
          {sessionData?.start ? new Date(sessionData.start).toLocaleString() : 'Ongoing Session'}
        </ClientSessionTime>

        {sessionData?.location && (
          <LocationChip>
            <MapPin size={14} />
            {sessionData.location}
          </LocationChip>
        )}
      </ClientInfoCard>

      {/* Log Type Selector */}
      <LogTypeSelector>
        <LogTypeButton
          $active={logType === 'voice'}
          onClick={() => setLogType('voice')}
        >
          <Mic size={16} />
          Voice
        </LogTypeButton>

        <LogTypeButton
          $active={logType === 'text'}
          onClick={() => setLogType('text')}
        >
          <Pencil size={16} />
          Text
        </LogTypeButton>

        <LogTypeButton
          $active={logType === 'template'}
          onClick={() => {
            setLogType('template');
            setShowTemplates(true);
          }}
        >
          <ListIcon size={16} />
          Templates
        </LogTypeButton>
      </LogTypeSelector>

      {/* Error Message */}
      {error && (
        <ErrorAlert>
          <span>{error}</span>
          <ErrorCloseButton onClick={() => setError('')} aria-label="Dismiss error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </ErrorCloseButton>
        </ErrorAlert>
      )}

      {/* Voice Recording UI */}
      {logType === 'voice' && (
        <>
          {transcript && (
            <TranscriptPanel>
              <TranscriptText>{transcript}</TranscriptText>

              {recognizedExercise && recognizedExercise.exercise && (
                <RecognizedChipsContainer>
                  <RecognizedChip>
                    <Dumbbell size={14} />
                    Exercise: {recognizedExercise.exercise}
                  </RecognizedChip>

                  {recognizedExercise.reps && (
                    <RecognizedChip>
                      <Hash size={14} />
                      Reps: {recognizedExercise.reps}
                    </RecognizedChip>
                  )}

                  {recognizedExercise.sets && (
                    <RecognizedChip>
                      <ListIcon size={14} />
                      Sets: {recognizedExercise.sets}
                    </RecognizedChip>
                  )}

                  {recognizedExercise.weight && (
                    <RecognizedChip>
                      <Dumbbell size={14} />
                      Weight: {recognizedExercise.weight} {recognizedExercise.weightUnit || 'lbs'}
                    </RecognizedChip>
                  )}
                </RecognizedChipsContainer>
              )}
            </TranscriptPanel>
          )}

          <VoiceButtonContainer>
            <VoiceButton
              $isRecording={isRecording}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <MicOff /> : <Mic />}
            </VoiceButton>
          </VoiceButtonContainer>

          {isRecording && (
            <RecordingTime>
              Recording: {formatTime(recordingTime)}
            </RecordingTime>
          )}

          <HelpText $mt="1rem">
            Tap to {isRecording ? 'stop' : 'start'} recording voice. Clearly state exercise details.
          </HelpText>

          <HelpText $mt="0.5rem" $dimmer>
            Example: "Exercise is bench press, 3 sets of 10 reps with 135 pounds"
          </HelpText>
        </>
      )}

      {/* Text Input UI */}
      {logType === 'text' && (
        <InputContainer>
          <StyledTextArea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="E.g., Exercise bench press, 3 sets of 10 reps with 135 pounds"
            disabled={isProcessing}
            rows={3}
          />

          <SendButton
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            aria-label="Submit exercise details"
          >
            <Send size={18} />
          </SendButton>
        </InputContainer>
      )}

      {/* Template Selection UI */}
      {logType === 'template' && showTemplates && (
        <TemplateContainer>
          <TemplateLabel>
            Select a template:
          </TemplateLabel>

          <TemplateChipWrap>
            {templates.map((template) => (
              <TemplateChip
                key={template.id}
                onClick={() => useTemplate(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') useTemplate(template); }}
              >
                {getIconForLogType(template.category)}
                {template.name}
              </TemplateChip>
            ))}

            {templates.length === 0 && (
              <NoTemplatesText>
                No templates available. You can create custom templates from the admin panel.
              </NoTemplatesText>
            )}
          </TemplateChipWrap>
        </TemplateContainer>
      )}

      {/* Logged Details */}
      <SectionTitle>
        <ListIcon size={16} /> Logged Details
      </SectionTitle>

      {loading ? (
        <LoadingCenter>
          <Spinner $size={30} />
        </LoadingCenter>
      ) : (
        <SessionDetailsList>
          {sessionLogs.length === 0 ? (
            <NoLogsText>
              No details logged yet. Use voice or text input to log exercise details.
            </NoLogsText>
          ) : (
            sessionLogs.map((log) => (
              <SessionDetail key={log.id}>
                <DetailIconWrap>
                  {getIconForLogType(log.type)}
                </DetailIconWrap>

                <DetailContent>
                  <DetailPrimary>
                    {log.exercise || log.type}
                  </DetailPrimary>

                  <DetailSecondary>
                    {log.sets && log.reps && (
                      <DetailChip>
                        {log.sets} &times; {log.reps}
                      </DetailChip>
                    )}

                    {log.weight && (
                      <DetailChip>
                        {log.weight} {log.weightUnit || 'lbs'}
                      </DetailChip>
                    )}

                    {log.duration && (
                      <DetailChip>
                        {log.duration} {log.durationUnit || 'min'}
                      </DetailChip>
                    )}

                    {log.rest && (
                      <DetailChip $muted>
                        Rest: {log.rest} {log.restUnit || 'sec'}
                      </DetailChip>
                    )}

                    {log.notes && (
                      <DetailNotes>
                        {log.notes}
                      </DetailNotes>
                    )}

                    <DetailTimestamp>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </DetailTimestamp>
                  </DetailSecondary>
                </DetailContent>

                <DeleteButton
                  onClick={() => deleteLoggedDetail(log.id)}
                  aria-label="Delete log entry"
                >
                  <Trash2 size={16} />
                </DeleteButton>
              </SessionDetail>
            ))
          )}
        </SessionDetailsList>
      )}

      {/* Loading indicator */}
      {isProcessing && (
        <ProcessingOverlay>
          <ProcessingContent>
            <Spinner $size={40} />
            <ProcessingText>
              Processing...
            </ProcessingText>
          </ProcessingContent>
        </ProcessingOverlay>
      )}
    </VoiceLoggerContainer>
  );
};

export default VoiceSessionLogger;
