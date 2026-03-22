/**
 * ┌─── SUB-COMPONENT: WorkoutLoggerModal ──────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Admin modal for logging workouts on behalf of client│
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ Log Workout for [Client Name]                   [✕] │ Header
 * ├──────────────────────────────────────────────────────┤
 * │ OPT Phase: [Phase 2 ▾]  Date: [2026-03-21]         │
 * │ ┌─ Exercise Entry ────────────────────────────────┐ │
 * │ │ [🔍 Exercise Autocomplete (736 exercises)]      │ │
 * │ │ Sets: [3]  Reps: [10]  Weight: [135lbs]         │ │
 * │ │ Tempo: [2/0/2]  Rest: [60s]                     │ │
 * │ │ [+ Add Set] [🗑 Remove]                         │ │
 * │ └────────────────────────────────────────────────┘ │
 * │ [+ Add Exercise]                                    │
 * │ [🎤 Voice Memo] [🛡 NASM Validation]               │
 * │ [💾 Save Workout]                                   │
 * └──────────────────────────────────────────────────────┘
 *
 * CLICK OUTCOMES:
 * Exercise autocomplete → opens NASMExerciseRolodex (736 exercises)
 * + Add Set → adds set row to current exercise
 * + Add Exercise → adds new exercise entry block
 * Voice Memo → opens VoiceMemoUpload (lazy-loaded)
 * Save → POST /api/workouts + awards gamification XP
 *
 * GAMIFICATION HOOKS:
 * - Saving workout awards 50 XP
 * - Each exercise logged awards 10 XP
 * - PR detection awards 100 XP bonus
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName, isOpen, onClose, onSaved }
 * State:     { exercises[], phase, date, saving }
 * API Calls: POST /api/admin/clients/:id/workouts
 * Children:  ExerciseAutocomplete, VoiceMemoUpload (lazy)
 *
 * Theme: Crystalline Swan, 44px minimum touch targets
 * NOTE: 1,035 lines — exceeds 300-line rule
 */

import React, { useState, lazy, Suspense, useEffect, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Plus, Trash2, Dumbbell, Save, Mic, Shield } from 'lucide-react';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import ExerciseAutocomplete from '../../../../WorkoutLogger/ExerciseAutocomplete';

const VoiceMemoUpload = lazy(() => import('../../../../WorkoutLogger/VoiceMemoUpload'));

/* ─────────────────────── ErrorBoundary for VoiceMemoUpload ─────────────────────── */

class VoiceUploadErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[VoiceUpload] Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#E0ECF4' }}>
          <p style={{ marginBottom: '12px' }}>Voice upload failed to load.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(224,236,244,0.3)', background: 'rgba(0,32,96,0.85)', color: '#E0ECF4', cursor: 'pointer', minHeight: '44px' }}
          >
            Switch to Manual Entry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────── Theme Tokens (Crystalline Swan) ─────────────────────── */

const WING_PURPLE = '#8B5CF6';
const MIDNIGHT_SAPPHIRE = '#002060';
const ROYAL_DEPTH = '#003080';
const ICE_WING = '#60C0F0';
const FROST_WHITE = '#E0ECF4';
const GILDED_FERN = '#C6A84B';

// Legacy aliases — kept for backward compat, mapped to correct tokens
const SWAN_CYAN = WING_PURPLE;
const GALAXY_CORE = MIDNIGHT_SAPPHIRE;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─────────────────────── Styled Components ─────────────────────── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(8px);

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 32, 96, 0.95);
  }
`;

const ModalPanel = styled.div`
  background: ${ROYAL_DEPTH};
  border-radius: 12px;
  max-width: 720px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(96, 192, 240, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(0, 48, 128, 0.98);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: ${MIDNIGHT_SAPPHIRE};
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  color: ${FROST_WHITE};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${(props) => props.$fullWidth && 'grid-column: 1 / -1;'}
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${FROST_WHITE};
  font-family: 'Sora', sans-serif;
`;

const Input = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(224, 236, 244, 0.5);
  background: rgba(255, 255, 255, 0.04);
  color: ${FROST_WHITE};
  font-size: 0.95rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${WING_PURPLE};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 20px 0;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.06);
  color: ${SWAN_CYAN};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.12);
    border-color: ${SWAN_CYAN};
  }
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 50, 50, 0.08);
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 50, 50, 0.2);
  }
`;

const ExerciseCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;

  @media (max-width: 640px) {
    grid-template-columns: auto 1fr 1fr auto;
  }
`;

const ExerciseMetaRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
`;

const CoreSectionCard = styled.div`
  background: rgba(198, 168, 75, 0.05);
  border: 1px solid rgba(198, 168, 75, 0.25);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
`;

const CoreSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: ${GILDED_FERN};
  font-weight: 600;
  font-size: 0.9rem;
`;

const CoreBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(198, 168, 75, 0.15);
  color: ${MIDNIGHT_SAPPHIRE};
  letter-spacing: 0.05em;
`;

const SetLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: ${ICE_WING};
  min-width: 24px;
  text-align: center;
`;

const SmallInput = styled(Input)`
  min-height: 40px;
  padding: 6px 10px;
  font-size: 0.9rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  background: ${WING_PURPLE};
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 18px rgba(139, 92, 246, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(96, 192, 240, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: ${GALAXY_CORE};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin: 4px 0 0;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${(p) => p.$active ? SWAN_CYAN : 'rgba(255, 255, 255, 0.12)'};
  background: ${(p) => p.$active ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${(p) => p.$active ? SWAN_CYAN : '#94a3b8'};

  &:hover {
    border-color: ${SWAN_CYAN};
  }
`;

/* ─────────────────────── Types ─────────────────────── */

interface WorkoutSet {
  setNumber: number;
  reps: string;
  weight: string;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
  tempo?: string;  // NASM tempo e.g. "4/2/1"
  rest?: string;   // Rest period in seconds
}

/* Default stability/core exercises per NASM standards */
const DEFAULT_CORE_EXERCISES: Exercise[] = [
  { name: 'Drawing-In Maneuver (Plank)', sets: [{ setNumber: 1, reps: '30', weight: '0' }], tempo: '0/30/0', rest: '30' },
  { name: 'Floor Bridge (Glute Bridge)', sets: [{ setNumber: 1, reps: '12', weight: '0' }], tempo: '4/2/1', rest: '30' },
];

interface WorkoutLoggerModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  onSuccess?: () => void;
}

/* ─────────────────────── Component ─────────────────────── */

const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const adminClientService = createAdminClientService(authAxios);

  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: [{ setNumber: 1, reps: '', weight: '' }] },
  ]);
  const [coreExercises, setCoreExercises] = useState<Exercise[]>(
    DEFAULT_CORE_EXERCISES.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'manual' | 'voice'>('manual');

  // Focus trap + Escape key handler
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus first input on open
    const firstInput = modalRef.current?.querySelector('input') as HTMLElement;
    firstInput?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!date) newErrors.date = 'Date is required';
    if (date && new Date(date) > new Date()) newErrors.date = 'Date cannot be in the future';

    const dur = Number(duration);
    if (!duration || !Number.isInteger(dur) || dur <= 0) {
      newErrors.duration = 'Duration must be a positive integer';
    }

    const int = Number(intensity);
    if (!intensity || !Number.isInteger(int) || int < 1 || int > 10) {
      newErrors.intensity = 'Intensity must be 1–10';
    }

    if (exercises.length === 0) {
      newErrors.exercises = 'At least one exercise is required';
    }

    exercises.forEach((ex, i) => {
      if (!ex.name.trim()) {
        newErrors[`exercise_${i}_name`] = 'Exercise name is required';
      }
      if (ex.sets.length === 0) {
        newErrors[`exercise_${i}_sets`] = 'At least one set is required';
      }
      ex.sets.forEach((set, j) => {
        const reps = Number(set.reps);
        if (set.reps && (!Number.isInteger(reps) || reps < 0)) {
          newErrors[`exercise_${i}_set_${j}_reps`] = 'Invalid reps';
        }
        const weight = Number(set.weight);
        if (set.weight && !Number.isFinite(weight)) {
          newErrors[`exercise_${i}_set_${j}_weight`] = 'Invalid weight';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const workoutData = {
        title: title.trim(),
        date,  // Send raw YYYY-MM-DD; backend normalizes date semantics
        duration: Number(duration),
        intensity: Number(intensity),
        notes: notes.trim() || undefined,
        exercises: [...coreExercises, ...exercises].map((ex) => ({
          name: ex.name.trim(),
          tempo: ex.tempo || undefined,
          rest: ex.rest ? Number(ex.rest) : undefined,
          sets: ex.sets.map((set) => ({
            setNumber: set.setNumber,
            reps: set.reps ? Number(set.reps) : null,
            weight: set.weight ? Number(set.weight) : null,
          })),
        })),
      };

      const response = await adminClientService.logWorkout(clientId, workoutData);

      if (response.success) {
        // XP toast if available
        if (response.xp) {
          toast({
            title: 'Workout Logged + XP Awarded',
            description: `Awarded ${response.xp.pointsAwarded} XP! Streak: ${response.xp.streakDays} days`,
            variant: 'success',
          });
        } else {
          toast({
            title: 'Workout Logged',
            description: `${clientName}'s workout recorded successfully.`,
            variant: 'success',
          });
        }
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to log workout',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to log workout',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addExercise = () => {
    setExercises(prev => [...prev, { name: '', sets: [{ setNumber: 1, reps: '', weight: '' }] }]);
  };

  const removeExercise = (index: number) => {
    setExercises(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateExerciseName = (index: number, name: string) => {
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, name } : ex));
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return { ...ex, sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: '', weight: '' }] };
    }));
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      if (ex.sets.length <= 1) return ex;
      return {
        ...ex,
        sets: ex.sets.filter((_, si) => si !== setIndex).map((s, si) => ({ ...s, setNumber: si + 1 })),
      };
    }));
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s),
      };
    }));
  };

  const updateExerciseMeta = (index: number, field: 'tempo' | 'rest', value: string) => {
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const updateCoreExercise = (index: number, field: 'tempo' | 'rest', value: string) => {
    setCoreExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const updateCoreSet = (exIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    setCoreExercises(prev => prev.map((ex, i) => {
      if (i !== exIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s),
      };
    }));
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Log Workout for ${clientName}`}
        data-testid="workout-logger-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>
            <Dumbbell size={20} />
            Log Workout — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close" data-testid="workout-close-btn">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <ModeToggle>
            <ModeButton $active={mode === 'manual'} onClick={() => setMode('manual')}>
              <Dumbbell size={16} />
              Manual Entry
            </ModeButton>
            <ModeButton $active={mode === 'voice'} onClick={() => setMode('voice')}>
              <Mic size={16} />
              Voice Memo / File
            </ModeButton>
          </ModeToggle>

          {mode === 'voice' ? (
            <VoiceUploadErrorBoundary onReset={() => setMode('manual')}>
            <Suspense fallback={<p style={{ color: FROST_WHITE }}>Loading voice upload...</p>}>
              <VoiceMemoUpload
                clientId={clientId}
                clientName={clientName}
                onParsed={(parsed, _transcript) => {
                  // Apply parsed data to manual form
                  if (parsed.exercises?.length) {
                    setExercises(parsed.exercises.map((ex) => ({
                      name: ex.exerciseName,
                      sets: ex.sets.map((s) => ({
                        setNumber: s.setNumber,
                        reps: s.reps != null ? String(s.reps) : '',
                        weight: s.weight != null ? String(s.weight) : '',
                      })),
                    })));
                  }
                  if (parsed.sessionNotes) setNotes(parsed.sessionNotes);
                  if (parsed.overallIntensity) setIntensity(String(parsed.overallIntensity));
                  if (!title) setTitle('Voice Memo Workout');
                  if (!duration) setDuration('50');
                  setMode('manual'); // Switch back to review
                }}
                onCancel={() => setMode('manual')}
              />
            </Suspense>
            </VoiceUploadErrorBoundary>
          ) : (
          <>
          <FormGrid>
            <FormGroup $fullWidth>
              <Label htmlFor="workout-title">Title *</Label>
              <Input
                id="workout-title"
                data-testid="workout-title"
                placeholder="e.g., Upper Body Strength"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-date">Date *</Label>
              <Input
                id="workout-date"
                data-testid="workout-date"
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && <ErrorText>{errors.date}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-duration">Duration (minutes) *</Label>
              <Input
                id="workout-duration"
                data-testid="workout-duration"
                type="number"
                min="1"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration && <ErrorText>{errors.duration}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-intensity">Intensity (1–10) *</Label>
              <Input
                id="workout-intensity"
                data-testid="workout-intensity"
                type="number"
                min="1"
                max="10"
                placeholder="7"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
              />
              {errors.intensity && <ErrorText>{errors.intensity}</ErrorText>}
            </FormGroup>

            <FormGroup $fullWidth>
              <Label htmlFor="workout-notes">Notes (optional)</Label>
              <TextArea
                id="workout-notes"
                data-testid="workout-notes"
                placeholder="Session notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormGroup>
          </FormGrid>

          <Divider />

          {/* ── Mandatory Stability & Core Section ── */}
          <CoreSectionCard>
            <CoreSectionHeader>
              <Shield size={16} />
              Stability &amp; Core
              <CoreBadge>NASM Required</CoreBadge>
            </CoreSectionHeader>

            {coreExercises.map((coreEx, coreIdx) => (
              <ExerciseCard key={`core-${coreIdx}`} style={{ background: 'rgba(139, 92, 246, 0.03)' }}>
                <ExerciseHeader>
                  <FormGroup style={{ flex: 1, marginRight: 8 }}>
                    <Label>Exercise</Label>
                    <ExerciseAutocomplete
                      value={coreEx.name}
                      onChange={(name) => {
                        const updated = [...coreExercises];
                        updated[coreIdx] = { ...updated[coreIdx], name };
                        setCoreExercises(updated);
                      }}
                      placeholder="Search NASM exercises..."
                      data-testid={`core-exercise-name-${coreIdx}`}
                    />
                  </FormGroup>
                </ExerciseHeader>

                <ExerciseMetaRow>
                  <FormGroup>
                    <Label>Tempo</Label>
                    <SmallInput
                      placeholder="e.g., 4/2/1"
                      value={coreEx.tempo || ''}
                      onChange={(e) => updateCoreExercise(coreIdx, 'tempo', e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Rest (sec)</Label>
                    <SmallInput
                      type="number"
                      min="0"
                      placeholder="30"
                      value={coreEx.rest || ''}
                      onChange={(e) => updateCoreExercise(coreIdx, 'rest', e.target.value)}
                    />
                  </FormGroup>
                </ExerciseMetaRow>

                {coreEx.sets.map((set, setIndex) => (
                  <SetRow key={setIndex}>
                    <SetLabel>#{set.setNumber}</SetLabel>
                    <SmallInput
                      type="number"
                      min="0"
                      placeholder="Reps"
                      value={set.reps}
                      onChange={(e) => updateCoreSet(coreIdx, setIndex, 'reps', e.target.value)}
                    />
                    <SmallInput
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Weight (lbs)"
                      value={set.weight}
                      onChange={(e) => updateCoreSet(coreIdx, setIndex, 'weight', e.target.value)}
                    />
                    <div style={{ minWidth: 44 }} />
                  </SetRow>
                ))}
              </ExerciseCard>
            ))}
          </CoreSectionCard>

          <Divider />

          {/* ── Main Exercises ── */}
          <SectionHeader>
            <SectionTitle>Exercises</SectionTitle>
            <AddButton onClick={addExercise} data-testid="add-exercise-btn">
              <Plus size={16} />
              Add Exercise
            </AddButton>
          </SectionHeader>

          {errors.exercises && <ErrorText style={{ marginBottom: 12 }}>{errors.exercises}</ErrorText>}

          {exercises.map((exercise, exIndex) => (
            <ExerciseCard key={exIndex} data-testid={`exercise-card-${exIndex}`}>
              <ExerciseHeader>
                <FormGroup style={{ flex: 1, marginRight: 8 }}>
                  <Label>Exercise Name *</Label>
                  <ExerciseAutocomplete
                    data-testid={`exercise-name-${exIndex}`}
                    placeholder="Search NASM exercises..."
                    value={exercise.name}
                    onChange={(name) => updateExerciseName(exIndex, name)}
                  />
                  {errors[`exercise_${exIndex}_name`] && (
                    <ErrorText>{errors[`exercise_${exIndex}_name`]}</ErrorText>
                  )}
                </FormGroup>
                {exercises.length > 1 && (
                  <RemoveButton
                    onClick={() => removeExercise(exIndex)}
                    data-testid={`remove-exercise-${exIndex}`}
                    title="Remove exercise"
                  >
                    <Trash2 size={16} />
                  </RemoveButton>
                )}
              </ExerciseHeader>

              <ExerciseMetaRow>
                <FormGroup>
                  <Label>Tempo</Label>
                  <SmallInput
                    placeholder="e.g., 4/2/1"
                    value={exercise.tempo || ''}
                    onChange={(e) => updateExerciseMeta(exIndex, 'tempo', e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Rest (sec)</Label>
                  <SmallInput
                    type="number"
                    min="0"
                    placeholder="60"
                    value={exercise.rest || ''}
                    onChange={(e) => updateExerciseMeta(exIndex, 'rest', e.target.value)}
                  />
                </FormGroup>
              </ExerciseMetaRow>

              {exercise.sets.map((set, setIndex) => (
                <SetRow key={setIndex}>
                  <SetLabel>#{set.setNumber}</SetLabel>
                  <SmallInput
                    data-testid={`set-reps-${exIndex}-${setIndex}`}
                    type="number"
                    min="0"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                  />
                  <SmallInput
                    data-testid={`set-weight-${exIndex}-${setIndex}`}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Weight (lbs)"
                    value={set.weight}
                    onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                  />
                  {exercise.sets.length > 1 ? (
                    <RemoveButton
                      onClick={() => removeSet(exIndex, setIndex)}
                      data-testid={`remove-set-${exIndex}-${setIndex}`}
                      title="Remove set"
                    >
                      <Trash2 size={14} />
                    </RemoveButton>
                  ) : (
                    <div style={{ minWidth: 44 }} />
                  )}
                </SetRow>
              ))}

              <AddButton
                onClick={() => addSet(exIndex)}
                data-testid={`add-set-${exIndex}`}
                style={{ marginTop: 8 }}
              >
                <Plus size={14} />
                Add Set
              </AddButton>
            </ExerciseCard>
          ))}
          </>
          )}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>
            <X size={16} />
            Cancel
          </CancelButton>
          <SubmitButton
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="workout-submit-btn"
          >
            {submitting ? <Spinner /> : <Save size={16} />}
            {submitting ? 'Saving...' : 'Log Workout'}
          </SubmitButton>
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutLoggerModal;
