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
 *
 * Migrated from MUI to styled-components + lucide-react
 * Galaxy-Swan theme: bg rgba(15,23,42,0.95), border rgba(14,165,233,0.2),
 * text #e2e8f0, accent #0ea5e9
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';

// Icons (lucide-react)
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

// =============================================================================
// Styled Components — Galaxy-Swan Theme
// =============================================================================

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
`;

// --- Modal Overlay & Panel ---
const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  position: relative;
  width: 100%;
  max-width: 768px;
  max-height: 90vh;
  margin: 16px;
  background: linear-gradient(135deg, #0a0a0f, #1e1e3f);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(14, 165, 233, 0.15);
`;

// --- Progress Bar ---
const ProgressBarTrack = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  width: 40%;
  height: 100%;
  background: #00ffff;
  animation: ${progressAnimation} 1.5s ease-in-out infinite;
`;

// --- Stepper ---
const StepperContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 24px;
`;

const StepItem = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StepCircle = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
  ${({ $active, $completed }) =>
    $completed
      ? css`
          background: #22c55e;
          color: #ffffff;
        `
      : $active
      ? css`
          background: #0ea5e9;
          color: #ffffff;
        `
      : css`
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
        `}
`;

const StepLabelText = styled.span<{ $active: boolean; $completed: boolean }>`
  font-size: 0.8rem;
  color: ${({ $active, $completed }) =>
    $completed ? '#22c55e' : $active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'};
  transition: color 0.3s ease;

  @media (max-width: 480px) {
    display: none;
  }
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  width: 32px;
  height: 2px;
  background: ${({ $completed }) =>
    $completed ? '#22c55e' : 'rgba(255, 255, 255, 0.15)'};
  transition: background 0.3s ease;

  @media (max-width: 480px) {
    width: 16px;
  }
`;

// --- Grid ---
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridFullSpan = styled.div`
  grid-column: 1 / -1;
`;

// --- Form Controls ---
const FieldWrapper = styled.div<{ $hasError?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.7);
  letter-spacing: 0.02em;
`;

const StyledInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 0.95rem;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid ${({ $hasError }) =>
    $hasError ? '#ef4444' : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PriceInputWrapper = styled.div<{ $hasError?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid ${({ $hasError }) =>
    $hasError ? '#ef4444' : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;

  &:focus-within {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }
`;

const PricePrefix = styled.span`
  padding: 0 10px;
  color: rgba(226, 232, 240, 0.5);
  font-size: 0.95rem;
  user-select: none;
`;

const PriceInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 10px 14px 10px 0;
  font-size: 0.95rem;
  color: #e2e8f0;
  background: transparent;
  border: none;
  outline: none;
  box-sizing: border-box;
`;

const StyledTextarea = styled.textarea<{ $hasError?: boolean }>`
  width: 100%;
  min-height: 88px;
  padding: 10px 14px;
  font-size: 0.95rem;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid ${({ $hasError }) =>
    $hasError ? '#ef4444' : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 8px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const StyledSelect = styled.select<{ $hasError?: boolean }>`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 0.95rem;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid ${({ $hasError }) =>
    $hasError ? '#ef4444' : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23e2e8f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
    padding: 8px;
  }
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #ef4444;
`;

// --- Switch ---
const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  cursor: pointer;
  user-select: none;
  color: #e2e8f0;
  font-size: 0.95rem;
`;

const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) =>
    $checked ? '#0ea5e9' : 'rgba(255, 255, 255, 0.15)'};
  transition: background 0.25s ease;
  flex-shrink: 0;
`;

const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
`;

// --- Alert ---
const AlertBox = styled.div<{ $severity?: 'warning' | 'error' | 'info' | 'success' }>`
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
  ${({ $severity }) => {
    switch ($severity) {
      case 'warning':
        return css`
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          color: #fbbf24;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        `;
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        `;
      default:
        return css`
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #38bdf8;
        `;
    }
  }}
`;

const AlertContent = styled.div`
  flex: 1;
`;

// --- Avatar ---
const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 32}px;
  height: ${({ $size }) => $size || 32}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => ($size ? $size * 0.35 : 11)}px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
  letter-spacing: 0.5px;
`;

// --- Chip ---
const ChipBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #0ea5e9;
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 999px;
  white-space: nowrap;
`;

// --- Paper / Card ---
const CardPanel = styled.div<{ $accentBg?: boolean }>`
  padding: 16px;
  border-radius: 10px;
  background: ${({ $accentBg }) =>
    $accentBg ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.6)'};
  border: 1px solid rgba(14, 165, 233, 0.15);
`;

// --- Text helpers ---
const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 12px 0;
`;

const SubTitle = styled.p`
  font-size: 0.875rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 8px 0;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: #e2e8f0;
  margin: 0;
  line-height: 1.5;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.6);
`;

// --- Buttons ---
const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// --- Flex helpers used in assignment summary ---
const FlexRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Component
// =============================================================================

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
          <FormGrid>
            <FieldWrapper $hasError={!!errors.sessionDate}>
              <FieldLabel>Session Date &amp; Time</FieldLabel>
              <StyledInput
                type="datetime-local"
                $hasError={!!errors.sessionDate}
                value={formData.sessionDate.slice(0, 16)}
                onChange={(e) => handleChange('sessionDate', e.target.value + ':00.000Z')}
              />
              {errors.sessionDate && <ErrorText>{errors.sessionDate}</ErrorText>}
            </FieldWrapper>

            <FieldWrapper $hasError={!!errors.duration}>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <StyledInput
                type="number"
                $hasError={!!errors.duration}
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 60)}
                min={15}
                max={480}
                step={15}
              />
              {errors.duration && <ErrorText>{errors.duration}</ErrorText>}
            </FieldWrapper>

            <GridFullSpan>
              <FieldWrapper $hasError={!!errors.location}>
                <FieldLabel>Location</FieldLabel>
                <StyledInput
                  type="text"
                  $hasError={!!errors.location}
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g., Main Studio, Outdoor Area, Client's Home"
                />
                {errors.location && <ErrorText>{errors.location}</ErrorText>}
              </FieldWrapper>
            </GridFullSpan>

            <GridFullSpan>
              <FieldWrapper>
                <FieldLabel>Session Status</FieldLabel>
                <StyledSelect
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="available">Available</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                </StyledSelect>
              </FieldWrapper>
            </GridFullSpan>
          </FormGrid>
        );

      case 1: // Assignment
        return (
          <FormGrid>
            <FieldWrapper $hasError={!!errors.trainerId}>
              <FieldLabel>Trainer</FieldLabel>
              <StyledSelect
                $hasError={!!errors.trainerId}
                value={formData.trainerId}
                onChange={(e) => handleChange('trainerId', e.target.value)}
              >
                <option value="">Select a trainer...</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}
                  </option>
                ))}
              </StyledSelect>
              {errors.trainerId && <ErrorText>{errors.trainerId}</ErrorText>}
            </FieldWrapper>

            <FieldWrapper $hasError={!!errors.userId}>
              <FieldLabel>Client (Optional for Available Sessions)</FieldLabel>
              <StyledSelect
                $hasError={!!errors.userId}
                value={formData.userId}
                onChange={(e) => handleChange('userId', e.target.value)}
              >
                <option value="">No Client (Available Session)</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.availableSessions} sessions)
                  </option>
                ))}
              </StyledSelect>
              {errors.userId && <ErrorText>{errors.userId}</ErrorText>}
            </FieldWrapper>

            {/* Conflict Detection */}
            {conflicts.length > 0 && (
              <GridFullSpan>
                <AlertBox $severity="warning">
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <AlertContent>
                    <SubTitle style={{ color: 'inherit' }}>Schedule Conflicts Detected</SubTitle>
                    {conflicts.map(conflict => (
                      <BodyText key={conflict.id} style={{ color: 'inherit' }}>
                        &bull; {new Date(conflict.sessionDate).toLocaleString()} -
                        {conflict.client ? ` ${conflict.client.firstName} ${conflict.client.lastName}` : ' Available Session'}
                      </BodyText>
                    ))}
                  </AlertContent>
                </AlertBox>
              </GridFullSpan>
            )}

            {/* Assignment Summary */}
            {selectedTrainer && (
              <GridFullSpan>
                <CardPanel $accentBg>
                  <SubTitle>Assignment Summary</SubTitle>
                  <FlexRow style={{ marginBottom: selectedClient ? 12 : 0 }}>
                    <AvatarCircle>
                      {selectedTrainer.firstName[0]}{selectedTrainer.lastName[0]}
                    </AvatarCircle>
                    <FlexColumn>
                      <BodyText>
                        <strong>{selectedTrainer.firstName} {selectedTrainer.lastName}</strong>
                      </BodyText>
                      <CaptionText>
                        Trainer &bull; {selectedTrainer.specialties || 'General Training'}
                      </CaptionText>
                    </FlexColumn>
                  </FlexRow>

                  {selectedClient && (
                    <FlexRow>
                      <AvatarCircle>
                        {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                      </AvatarCircle>
                      <FlexColumn>
                        <BodyText>
                          <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                        </BodyText>
                        <CaptionText>
                          Client &bull; {selectedClient.availableSessions} sessions remaining
                        </CaptionText>
                      </FlexColumn>
                    </FlexRow>
                  )}
                </CardPanel>
              </GridFullSpan>
            )}
          </FormGrid>
        );

      case 2: // Advanced
        return (
          <FormGrid>
            <GridFullSpan>
              <SwitchRow>
                <HiddenCheckbox
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleChange('isRecurring', e.target.checked)}
                />
                <SwitchTrack $checked={formData.isRecurring}>
                  <SwitchThumb $checked={formData.isRecurring} />
                </SwitchTrack>
                Create Recurring Sessions
              </SwitchRow>
            </GridFullSpan>

            {formData.isRecurring && (
              <>
                <FieldWrapper>
                  <FieldLabel>Frequency</FieldLabel>
                  <StyledSelect
                    value={formData.recurringPattern?.frequency || 'weekly'}
                    onChange={(e) => handleChange('recurringPattern', {
                      ...formData.recurringPattern,
                      frequency: e.target.value
                    })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </StyledSelect>
                </FieldWrapper>

                <FieldWrapper>
                  <FieldLabel>Number of Occurrences</FieldLabel>
                  <StyledInput
                    type="number"
                    value={formData.recurringPattern?.occurrences || 4}
                    onChange={(e) => handleChange('recurringPattern', {
                      ...formData.recurringPattern,
                      occurrences: parseInt(e.target.value) || 4
                    })}
                    min={1}
                    max={52}
                  />
                </FieldWrapper>
              </>
            )}

            <FieldWrapper>
              <FieldLabel>Session Price</FieldLabel>
              <PriceInputWrapper>
                <PricePrefix>$</PricePrefix>
                <PriceInput
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 125)}
                  min={0}
                  step={5}
                />
              </PriceInputWrapper>
            </FieldWrapper>

            <GridFullSpan>
              <FieldWrapper>
                <FieldLabel>Session Notes</FieldLabel>
                <StyledTextarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add any special instructions, equipment needs, or notes about this session..."
                  rows={3}
                />
              </FieldWrapper>
            </GridFullSpan>

            {/* NASM Assessment Integration */}
            <GridFullSpan>
              <SwitchRow>
                <HiddenCheckbox
                  type="checkbox"
                  checked={formData.nasmAssessment?.required || false}
                  onChange={(e) => handleChange('nasmAssessment', {
                    ...formData.nasmAssessment,
                    required: e.target.checked,
                    type: 'initial',
                    notes: ''
                  })}
                />
                <SwitchTrack $checked={formData.nasmAssessment?.required || false}>
                  <SwitchThumb $checked={formData.nasmAssessment?.required || false} />
                </SwitchTrack>
                Include NASM Assessment
              </SwitchRow>
            </GridFullSpan>

            {formData.nasmAssessment?.required && (
              <FieldWrapper>
                <FieldLabel>Assessment Type</FieldLabel>
                <StyledSelect
                  value={formData.nasmAssessment.type}
                  onChange={(e) => handleChange('nasmAssessment', {
                    ...formData.nasmAssessment,
                    type: e.target.value
                  })}
                >
                  <option value="initial">Initial Assessment</option>
                  <option value="progress">Progress Check</option>
                  <option value="final">Final Assessment</option>
                </StyledSelect>
              </FieldWrapper>
            )}
          </FormGrid>
        );

      case 3: // Review
        return (
          <div>
            <SectionTitle>Session Review</SectionTitle>

            <FormGrid>
              <CardPanel>
                <SubTitle>Session Details</SubTitle>
                <BodyText>
                  <strong>Date:</strong> {new Date(formData.sessionDate).toLocaleString()}
                </BodyText>
                <BodyText>
                  <strong>Duration:</strong> {formData.duration} minutes
                </BodyText>
                <BodyText>
                  <strong>Location:</strong> {formData.location}
                </BodyText>
                <BodyText>
                  <strong>Status:</strong> {formData.status}
                </BodyText>
                <BodyText>
                  <strong>Price:</strong> ${formData.price}
                </BodyText>
              </CardPanel>

              <CardPanel>
                <SubTitle>Assignment</SubTitle>
                <BodyText>
                  <strong>Trainer:</strong> {selectedTrainer ? `${selectedTrainer.firstName} ${selectedTrainer.lastName}` : 'Not assigned'}
                </BodyText>
                <BodyText>
                  <strong>Client:</strong> {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Available session'}
                </BodyText>
                {formData.isRecurring && (
                  <BodyText>
                    <strong>Recurring:</strong> {formData.recurringPattern?.frequency} for {formData.recurringPattern?.occurrences} sessions
                  </BodyText>
                )}
              </CardPanel>

              {formData.notes && (
                <GridFullSpan>
                  <CardPanel>
                    <SubTitle>Notes</SubTitle>
                    <BodyText>{formData.notes}</BodyText>
                  </CardPanel>
                </GridFullSpan>
              )}
            </FormGrid>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ModalOverlay $open={open} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <ModalPanel>
        <ModalHeader>
          <Calendar size={24} />
          {mode === 'create' ? 'Create New Session' :
           mode === 'edit' ? 'Edit Session' :
           'Duplicate Session'}

          {loading && (
            <ProgressBarTrack>
              <ProgressBarFill />
            </ProgressBarTrack>
          )}
        </ModalHeader>

        <ModalBody>
          {/* Stepper */}
          <StepperContainer>
            {steps.map((label, index) => (
              <React.Fragment key={label}>
                {index > 0 && (
                  <StepConnector $completed={index <= activeStep} />
                )}
                <StepItem $active={index === activeStep} $completed={index < activeStep}>
                  <StepCircle $active={index === activeStep} $completed={index < activeStep}>
                    {index < activeStep ? (
                      <CheckCircle size={14} />
                    ) : (
                      index + 1
                    )}
                  </StepCircle>
                  <StepLabelText $active={index === activeStep} $completed={index < activeStep}>
                    {label}
                  </StepLabelText>
                </StepItem>
              </React.Fragment>
            ))}
          </StepperContainer>

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
        </ModalBody>

        <ModalFooter>
          <SecondaryButton
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </SecondaryButton>

          {activeStep > 0 && (
            <SecondaryButton
              onClick={() => setActiveStep(prev => prev - 1)}
              disabled={loading}
            >
              Back
            </SecondaryButton>
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
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default SessionFormDialog;
