/**
 * NASM Trainer Dashboard - Client Assessment & Workout Planning Tools
 *
 * Trainer-only NASM features:
 * 1. Movement Assessment Module - Conduct OHS, single-leg squat assessments
 * 2. Corrective Protocol Builder - Create 4-step CEx protocols (NASM-CES required)
 * 3. Workout Builder - Create phase-appropriate workouts with validation
 * 4. Phase Progression Tracker - Monitor client progression through OPT phases
 * 5. Session Logger - Log acute variables, RPE, pain flags
 *
 * Access: Trainer tier only (user_tier = 'trainer')
 * Certification-Gated Features:
 * - NASM-CPT: Phases 1-3 access
 * - NASM-CES: Corrective Exercise Builder unlocked
 * - NASM-PES: Phases 4-5 access (Max Strength & Power)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import {
  BarChart3,
  Dumbbell,
  TrendingUp,
  PlayCircle,
  Plus,
  MessageSquare,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';

// ========================================
// THEME TOKENS
// ========================================
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  bgHover: 'rgba(14,165,233,0.08)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

// ========================================
// STYLED COMPONENTS
// ========================================

const PageContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;

  @media (max-width: 768px) {
    padding: 16px 12px;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderInfo = styled.div``;

const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0 0 4px 0;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: ${theme.textSecondary};
  margin: 0;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

interface ChipProps {
  $color?: 'primary' | 'success' | 'warning' | 'error';
}

const chipColorMap = {
  primary: theme.accent,
  success: theme.success,
  warning: theme.warning,
  error: theme.error,
};

const StyledChip = styled.span<ChipProps>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
  min-height: 28px;
  color: ${theme.text};
  background: ${({ $color }) => {
    const c = chipColorMap[$color || 'primary'];
    return `${c}22`;
  }};
  border: 1px solid ${({ $color }) => chipColorMap[$color || 'primary']};
`;

const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'info' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${theme.text};
  margin-bottom: ${({ $severity }) => ($severity === 'warning' ? '24px' : '0')};
  background: ${({ $severity }) => {
    const colors = {
      success: `${theme.success}15`,
      warning: `${theme.warning}15`,
      info: `${theme.info}15`,
      error: `${theme.error}15`,
    };
    return colors[$severity];
  }};
  border: 1px solid ${({ $severity }) => {
    const colors = {
      success: `${theme.success}40`,
      warning: `${theme.warning}40`,
      info: `${theme.info}40`,
      error: `${theme.error}40`,
    };
    return colors[$severity];
  }};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const GlassPaper = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  margin-bottom: 24px;
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.border};
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 48px;
  min-width: 44px;
  border: none;
  background: ${({ $active }) => ($active ? `${theme.accent}15` : 'transparent')};
  color: ${({ $active }) => ($active ? theme.accent : theme.textSecondary)};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};

  &:hover {
    background: ${theme.bgHover};
    color: ${theme.text};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ClientGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientCard = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: ${theme.borderHover};
    box-shadow: 0 4px 24px rgba(14, 165, 233, 0.08);
  }
`;

const CardBody = styled.div`
  padding: 20px;
`;

const ClientName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 12px 0;
`;

const CardDivider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 12px 0;
`;

const InfoStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: ${theme.textSecondary};
`;

const InfoValue = styled.span<{ $bold?: boolean }>`
  font-size: 0.875rem;
  color: ${theme.text};
  font-weight: ${({ $bold }) => ($bold ? '700' : '400')};
`;

const CardActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid ${theme.border};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'success' | 'secondary' | 'outlined' | 'contained' | 'containedSecondary'; disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  border: 1px solid transparent;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: ${theme.success}22;
          color: ${theme.success};
          border-color: ${theme.success}40;
          &:hover:not(:disabled) {
            background: ${theme.success}33;
          }
        `;
      case 'outlined':
        return css`
          background: transparent;
          color: ${theme.accent};
          border-color: ${theme.accent};
          &:hover:not(:disabled) {
            background: ${theme.accent}15;
          }
        `;
      case 'contained':
        return css`
          background: ${theme.accent};
          color: #0f172a;
          &:hover:not(:disabled) {
            background: ${theme.accentHover};
          }
        `;
      case 'containedSecondary':
        return css`
          background: #7c3aed;
          color: #fff;
          &:hover:not(:disabled) {
            background: #8b5cf6;
          }
        `;
      default:
        return css`
          background: transparent;
          color: ${theme.accent};
          &:hover:not(:disabled) {
            background: ${theme.bgHover};
          }
        `;
    }
  }}

  svg {
    width: 16px;
    height: 16px;
  }
`;

// ========================================
// DIALOG / MODAL STYLES
// ========================================

const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const DialogPanel = styled.div`
  background: #0f172a;
  border: 1px solid ${theme.border};
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
`;

const DialogHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.border};
`;

const DialogTitleText = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const DialogBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DialogFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${theme.border};
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

// ========================================
// FORM FIELD STYLES
// ========================================

const FormFieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px ${theme.accent}33;
  }

  option {
    background: #0f172a;
    color: ${theme.text};
  }
`;

const SectionTitle = styled.p`
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: ${theme.text};
  cursor: pointer;
  min-height: 44px;
  padding: 4px 0;
`;

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px;
  height: 20px;
  accent-color: ${theme.accent};
  cursor: pointer;
  flex-shrink: 0;
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px ${theme.accent}33;
  }

  &::placeholder {
    color: ${theme.textSecondary};
  }
`;

// ========================================
// PHASE COLOR HELPERS
// ========================================

const getPhaseChipColor = (phase: string): ChipProps['$color'] => {
  if (phase.includes('1')) return 'primary';
  if (phase.includes('2')) return 'primary'; // secondary -> primary since we have limited palette
  if (phase.includes('3')) return 'success';
  if (phase.includes('4')) return 'warning';
  return 'error';
};

// ========================================
// TYPES
// ========================================

interface ClientSummary {
  id: string;
  full_name: string;
  current_phase: string;
  weeks_in_phase: number;
  ready_for_next_phase: boolean;
  last_assessment_date: string | null;
  active_corrective_protocol: boolean;
  compliance_rate: number | null;
}

interface MovementAssessment {
  id?: string;
  client_id: string;
  assessment_type: string;
  assessment_date: string;
  compensations_identified: {
    knee_valgus?: boolean;
    heels_rise?: boolean;
    forward_head?: boolean;
    rounded_shoulders?: boolean;
    excessive_forward_lean?: boolean;
    low_back_arches?: boolean;
    arms_fall_forward?: boolean;
  };
  suggested_protocol: string | null;
  protocol_confidence: number | null;
  trainer_notes: string;
}

interface CorrectiveProtocol {
  client_id: string;
  protocol_type: string;
  inhibit_exercises: Array<{ exercise: string; duration_sec: number; notes: string }>;
  lengthen_exercises: Array<{ exercise: string; duration_sec: number; reps: number }>;
  activate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  integrate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  homework_assigned: boolean;
  total_days_assigned: number;
}

interface WorkoutBuilder {
  template_name: string;
  opt_phase: string;
  client_id: string;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps: string;
    tempo: string;
    rest_sec: number;
    notes: string;
  }>;
}

interface TrainerCertification {
  certification_type: string;
  status: string;
}

const NASMTrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const navigate = useNavigate();

  // Client Management
  const [clients, setClients] = useState<ClientSummary[]>([]);

  // Certifications (for gating features)
  const [certifications, setCertifications] = useState<TrainerCertification[]>([]);
  const hasCPT = certifications.some((c) => c.certification_type === 'NASM-CPT' && c.status === 'active');
  const hasCES = certifications.some((c) => c.certification_type === 'NASM-CES' && c.status === 'active');
  const hasPES = certifications.some((c) => c.certification_type === 'NASM-PES' && c.status === 'active');

  // Assessment Module State
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<MovementAssessment>({
    client_id: '',
    assessment_type: 'overhead_squat',
    assessment_date: new Date().toISOString(),
    compensations_identified: {},
    suggested_protocol: null,
    protocol_confidence: null,
    trainer_notes: '',
  });

  // Corrective Protocol Builder State
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [currentProtocol, setCurrentProtocol] = useState<CorrectiveProtocol>({
    client_id: '',
    protocol_type: 'custom',
    inhibit_exercises: [],
    lengthen_exercises: [],
    activate_exercises: [],
    integrate_exercises: [],
    homework_assigned: true,
    total_days_assigned: 14,
  });

  // Workout Builder State
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutBuilder>({
    template_name: '',
    opt_phase: 'phase_1_stabilization',
    client_id: '',
    exercises: [],
  });
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'trainer') {
      window.location.href = '/dashboard/client';
    }
    loadTrainerCertifications();
    loadClients();
  }, [user]);

  const loadTrainerCertifications = async () => {
    const response = await api.get('/api/trainer/my-certifications');
    setCertifications(response.data);
  };

  const loadClients = async () => {
    const response = await api.get('/api/trainer/my-clients');
    setClients(response.data);
  };

  const handleMessageClient = async (clientId: string) => {
    if (!clientId || isCreatingConversation) return;

    setIsCreatingConversation(true);
    try {
      const response = await api.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [parseInt(clientId)],
      });
      const conversationId = response.data.id;
      if (conversationId) {
        navigate(`/messaging?conversation=${conversationId}`);
      } else {
        throw new Error("Conversation ID not returned from API.");
      }
    } catch (error) {
      console.error("Failed to start conversation with client", error);
      alert("Could not start a new conversation. Please try again later.");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // ========================================
  // MOVEMENT ASSESSMENT MODULE
  // ========================================
  const openAssessmentDialog = (clientId: string) => {
    setCurrentAssessment({
      ...currentAssessment,
      client_id: clientId,
      assessment_date: new Date().toISOString(),
    });
    setAssessmentDialogOpen(true);
  };

  const detectCompensations = async () => {
    // AI-powered compensation detection
    const response = await api.post('/api/ai/detect-compensations', {
      compensations: Object.keys(currentAssessment.compensations_identified).filter(
        (key) => currentAssessment.compensations_identified[key as keyof typeof currentAssessment.compensations_identified]
      ),
    });

    setCurrentAssessment({
      ...currentAssessment,
      suggested_protocol: response.data.protocol,
      protocol_confidence: response.data.confidence,
    });
  };

  const saveAssessment = async () => {
    await api.post('/api/trainer/movement-assessments', currentAssessment);
    setAssessmentDialogOpen(false);
    loadClients();
  };

  // ========================================
  // CORRECTIVE PROTOCOL BUILDER (CES-GATED)
  // ========================================
  const openProtocolDialog = (clientId: string, assessmentId?: string) => {
    if (!hasCES) {
      alert('NASM-CES certification required to create corrective protocols');
      return;
    }

    setCurrentProtocol({
      ...currentProtocol,
      client_id: clientId,
    });
    setProtocolDialogOpen(true);
  };

  const loadProtocolTemplate = (protocolType: string) => {
    // Load pre-built templates for UCS, LCS, PDS
    const templates: { [key: string]: Partial<CorrectiveProtocol> } = {
      UCS: {
        protocol_type: 'UCS',
        inhibit_exercises: [
          { exercise: 'SMR Upper Traps', duration_sec: 90, notes: 'Focus on tender spots' },
          { exercise: 'SMR Levator Scapulae', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Pec Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Upper Trap Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Floor Cobra', reps: 15, sets: 2, tempo: '2/2/2' },
          { exercise: 'Ball Combo I', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
        integrate_exercises: [
          { exercise: 'Ball Wall Squat', reps: 15, sets: 2, tempo: '4/2/1' },
          { exercise: 'Standing Cable Row', reps: 12, sets: 2, tempo: '4/2/1' },
        ],
      },
      LCS: {
        protocol_type: 'LCS',
        inhibit_exercises: [
          { exercise: 'SMR Hip Flexors', duration_sec: 90, notes: '' },
          { exercise: 'SMR TFL/IT Band', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Hip Flexor Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Lat Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Glute Bridge', reps: 15, sets: 2, tempo: '2/2/2' },
          { exercise: 'Quadruped Arm/Leg Raise', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
        integrate_exercises: [
          { exercise: 'Ball Squat', reps: 15, sets: 2, tempo: '4/2/1' },
          { exercise: 'Step-Up to Balance', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
      },
      PDS: {
        protocol_type: 'PDS',
        inhibit_exercises: [
          { exercise: 'SMR Peroneals', duration_sec: 90, notes: '' },
          { exercise: 'SMR Biceps Femoris (Short Head)', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Gastrocnemius Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Standing TFL Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Single-Leg Balance Reach', reps: 10, sets: 2, tempo: 'controlled' },
          { exercise: 'Tube Walking (Side Steps)', reps: 15, sets: 2, tempo: '1/1/1' },
        ],
        integrate_exercises: [
          { exercise: 'Single-Leg Squat', reps: 10, sets: 2, tempo: '4/2/1' },
          { exercise: 'Multiplanar Step-Up', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
      },
    };

    const template = templates[protocolType];
    if (template) {
      setCurrentProtocol({ ...currentProtocol, ...template });
    }
  };

  const saveProtocol = async () => {
    await api.post('/api/trainer/corrective-protocols', currentProtocol);
    setProtocolDialogOpen(false);
    loadClients();
  };

  // ========================================
  // WORKOUT BUILDER
  // ========================================
  const openWorkoutDialog = (clientId: string, clientPhase: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    // Phase gating
    if ((clientPhase === 'phase_4_maximal_strength' || clientPhase === 'phase_5_power') && !hasPES) {
      alert('NASM-PES certification required to create Phases 4-5 workouts');
      return;
    }

    setCurrentWorkout({
      ...currentWorkout,
      client_id: clientId,
      opt_phase: clientPhase,
    });
    loadExercisesForPhase(clientPhase);
    setWorkoutDialogOpen(true);
  };

  const loadExercisesForPhase = async (phase: string) => {
    const phaseNum = parseInt(phase.split('_')[1]);
    const response = await api.get(`/api/trainer/exercises?phase=${phaseNum}`);
    setAvailableExercises(response.data);
  };

  const addExerciseToWorkout = (exercise: any) => {
    const phaseDefaults = getPhaseDefaults(currentWorkout.opt_phase);
    setCurrentWorkout({
      ...currentWorkout,
      exercises: [
        ...currentWorkout.exercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.exercise_name,
          ...phaseDefaults,
          notes: '',
        },
      ],
    });
  };

  const getPhaseDefaults = (phase: string) => {
    const defaults: { [key: string]: { sets: number; reps: string; tempo: string; rest_sec: number } } = {
      phase_1_stabilization: { sets: 3, reps: '12-20', tempo: '4/2/1', rest_sec: 30 },
      phase_2_strength_endurance: { sets: 3, reps: '8-12', tempo: '2/0/2', rest_sec: 60 },
      phase_3_hypertrophy: { sets: 4, reps: '6-12', tempo: '2/0/2', rest_sec: 60 },
      phase_4_maximal_strength: { sets: 5, reps: '1-5', tempo: 'X/X/X', rest_sec: 180 },
      phase_5_power: { sets: 3, reps: '1-5 + 8-10', tempo: 'explosive', rest_sec: 120 },
    };
    return defaults[phase] || defaults.phase_1_stabilization;
  };

  const validateWorkout = () => {
    const errors: string[] = [];

    if (currentWorkout.exercises.length === 0) {
      errors.push('At least one exercise required');
    }

    if (currentWorkout.opt_phase === 'phase_2_strength_endurance') {
      // Phase 2 requires supersets
      if (currentWorkout.exercises.length % 2 !== 0) {
        errors.push('Phase 2 requires exercises in superset pairs (even number)');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const saveWorkout = async () => {
    const validation = validateWorkout();
    if (!validation.valid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    await api.post('/api/trainer/workouts', currentWorkout);
    setWorkoutDialogOpen(false);
    loadClients();
  };

  // ========================================
  // PHASE PROGRESSION
  // ========================================
  const advanceClientPhase = async (clientId: string) => {
    if (window.confirm('Are you sure this client is ready to advance to the next phase?')) {
      await api.put(`/api/trainer/clients/${clientId}/opt-phase/advance`, {
        progression_criteria_met: { trainer_confirmed: true },
        trainer_rationale: 'Client meets all progression criteria',
      });
      loadClients();
    }
  };

  // ========================================
  // RENDER HELPERS
  // ========================================
  const getPhaseLabel = (phase: string): string => {
    const labels: { [key: string]: string } = {
      phase_1_stabilization: 'Phase 1: Stabilization',
      phase_2_strength_endurance: 'Phase 2: Strength Endurance',
      phase_3_hypertrophy: 'Phase 3: Hypertrophy',
      phase_4_maximal_strength: 'Phase 4: Max Strength',
      phase_5_power: 'Phase 5: Power',
    };
    return labels[phase] || phase;
  };

  // ========================================
  // TAB 0: MY CLIENTS
  // ========================================
  const renderMyClients = () => (
    <ClientGrid>
      {clients.map((client) => (
        <ClientCard key={client.id}>
          <CardBody>
            <ClientName>{client.full_name}</ClientName>
            <CardDivider />

            <InfoStack>
              <InfoRow>
                <InfoLabel>Current Phase</InfoLabel>
                <StyledChip $color={getPhaseChipColor(client.current_phase)}>
                  {getPhaseLabel(client.current_phase)}
                </StyledChip>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Weeks in Phase</InfoLabel>
                <InfoValue>{client.weeks_in_phase} weeks</InfoValue>
              </InfoRow>

              {client.active_corrective_protocol && (
                <InfoRow>
                  <InfoLabel>Homework Compliance</InfoLabel>
                  <InfoValue $bold>
                    {client.compliance_rate?.toFixed(0) || 0}%
                  </InfoValue>
                </InfoRow>
              )}

              {client.ready_for_next_phase && (
                <AlertBox $severity="success">
                  <CheckCircle size={18} color={theme.success} />
                  <span>Ready for next phase!</span>
                </AlertBox>
              )}
            </InfoStack>
          </CardBody>

          <CardActionsRow>
            <ActionButton onClick={() => openAssessmentDialog(client.id)}>
              <BarChart3 /> Assess
            </ActionButton>
            <ActionButton onClick={() => openWorkoutDialog(client.id, client.current_phase)}>
              <Dumbbell /> Workout
            </ActionButton>
            <ActionButton
              onClick={() => handleMessageClient(client.id)}
              disabled={isCreatingConversation}
            >
              <MessageSquare /> Message
            </ActionButton>
            {client.ready_for_next_phase && (
              <ActionButton $variant="success" onClick={() => advanceClientPhase(client.id)}>
                <TrendingUp /> Advance
              </ActionButton>
            )}
          </CardActionsRow>
        </ClientCard>
      ))}

      {clients.length === 0 && (
        <AlertBox $severity="info">
          <span>No clients assigned yet</span>
        </AlertBox>
      )}
    </ClientGrid>
  );

  // ========================================
  // ASSESSMENT DIALOG
  // ========================================
  const renderAssessmentDialog = () => (
    <DialogOverlay $open={assessmentDialogOpen} onClick={() => setAssessmentDialogOpen(false)}>
      <DialogPanel onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitleText>Movement Assessment</DialogTitleText>
        </DialogHeader>
        <DialogBody>
          <FormFieldWrapper>
            <FieldLabel>Assessment Type</FieldLabel>
            <StyledSelect
              value={currentAssessment.assessment_type}
              onChange={(e) => setCurrentAssessment({ ...currentAssessment, assessment_type: e.target.value })}
            >
              <option value="overhead_squat">Overhead Squat (OHS)</option>
              <option value="single_leg_squat_left">Single-Leg Squat (Left)</option>
              <option value="single_leg_squat_right">Single-Leg Squat (Right)</option>
              <option value="pushing_assessment">Pushing Assessment</option>
              <option value="pulling_assessment">Pulling Assessment</option>
            </StyledSelect>
          </FormFieldWrapper>

          <SectionTitle>Compensations Identified</SectionTitle>

          <CheckboxGroup>
            <CheckboxLabel>
              <StyledCheckbox
                checked={currentAssessment.compensations_identified.knee_valgus || false}
                onChange={(e) =>
                  setCurrentAssessment({
                    ...currentAssessment,
                    compensations_identified: {
                      ...currentAssessment.compensations_identified,
                      knee_valgus: e.target.checked,
                    },
                  })
                }
              />
              Knee Valgus (knees cave in)
            </CheckboxLabel>
            <CheckboxLabel>
              <StyledCheckbox
                checked={currentAssessment.compensations_identified.heels_rise || false}
                onChange={(e) =>
                  setCurrentAssessment({
                    ...currentAssessment,
                    compensations_identified: {
                      ...currentAssessment.compensations_identified,
                      heels_rise: e.target.checked,
                    },
                  })
                }
              />
              Heels Rise
            </CheckboxLabel>
            <CheckboxLabel>
              <StyledCheckbox
                checked={currentAssessment.compensations_identified.forward_head || false}
                onChange={(e) =>
                  setCurrentAssessment({
                    ...currentAssessment,
                    compensations_identified: {
                      ...currentAssessment.compensations_identified,
                      forward_head: e.target.checked,
                    },
                  })
                }
              />
              Forward Head
            </CheckboxLabel>
            <CheckboxLabel>
              <StyledCheckbox
                checked={currentAssessment.compensations_identified.rounded_shoulders || false}
                onChange={(e) =>
                  setCurrentAssessment({
                    ...currentAssessment,
                    compensations_identified: {
                      ...currentAssessment.compensations_identified,
                      rounded_shoulders: e.target.checked,
                    },
                  })
                }
              />
              Rounded Shoulders
            </CheckboxLabel>
            <CheckboxLabel>
              <StyledCheckbox
                checked={currentAssessment.compensations_identified.low_back_arches || false}
                onChange={(e) =>
                  setCurrentAssessment({
                    ...currentAssessment,
                    compensations_identified: {
                      ...currentAssessment.compensations_identified,
                      low_back_arches: e.target.checked,
                    },
                  })
                }
              />
              Low Back Arches
            </CheckboxLabel>
          </CheckboxGroup>

          <ActionButton $variant="outlined" onClick={detectCompensations}>
            AI: Suggest Corrective Protocol
          </ActionButton>

          {currentAssessment.suggested_protocol && (
            <AlertBox $severity="info">
              <span>
                Suggested: {currentAssessment.suggested_protocol} ({currentAssessment.protocol_confidence}% confidence)
              </span>
            </AlertBox>
          )}

          <FormFieldWrapper>
            <FieldLabel>Trainer Notes</FieldLabel>
            <StyledTextarea
              value={currentAssessment.trainer_notes}
              onChange={(e) => setCurrentAssessment({ ...currentAssessment, trainer_notes: e.target.value })}
              placeholder="Enter assessment notes..."
            />
          </FormFieldWrapper>
        </DialogBody>
        <DialogFooter>
          <ActionButton onClick={() => setAssessmentDialogOpen(false)}>Cancel</ActionButton>
          <ActionButton $variant="contained" onClick={saveAssessment}>
            Save Assessment
          </ActionButton>
          {currentAssessment.suggested_protocol && (
            <ActionButton
              $variant="containedSecondary"
              onClick={() => {
                saveAssessment();
                openProtocolDialog(currentAssessment.client_id);
              }}
            >
              Save & Create Protocol
            </ActionButton>
          )}
        </DialogFooter>
      </DialogPanel>
    </DialogOverlay>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <PageContainer>
      <HeaderRow>
        <HeaderInfo>
          <PageTitle>NASM Trainer Dashboard</PageTitle>
          <PageSubtitle>Client assessments, corrective protocols, and workout planning</PageSubtitle>
        </HeaderInfo>

        <ChipRow>
          {hasCPT && <StyledChip $color="primary">NASM-CPT</StyledChip>}
          {hasCES && <StyledChip $color="success">NASM-CES</StyledChip>}
          {hasPES && <StyledChip $color="warning">NASM-PES</StyledChip>}
          {!hasCPT && !hasCES && !hasPES && (
            <StyledChip $color="error">
              <Lock size={14} /> No Certifications
            </StyledChip>
          )}
        </ChipRow>
      </HeaderRow>

      {!hasCPT && (
        <AlertBox $severity="warning">
          <AlertTriangle size={18} color={theme.warning} />
          <span>
            NASM-CPT certification required to access trainer tools. Please upload your certification in Settings.
          </span>
        </AlertBox>
      )}

      {hasCPT && (
        <>
          <GlassPaper>
            <TabBar>
              <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
                <Dumbbell /> My Clients
              </TabButton>
              <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
                <BarChart3 /> Assessments
              </TabButton>
              <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
                <PlayCircle /> Workouts
              </TabButton>
            </TabBar>
          </GlassPaper>

          <div>{activeTab === 0 && renderMyClients()}</div>

          {renderAssessmentDialog()}
        </>
      )}
    </PageContainer>
  );
};

export default NASMTrainerDashboard;
