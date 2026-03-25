/**
 * ┌─── SUB-COMPONENT: WorkoutLoggerModal ──────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Admin modal for logging workouts on behalf of client│
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-25        │
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
 * Children:  ExerciseEntryCard, VoiceMemoUpload (lazy)
 *
 * Theme: Crystalline Swan, 44px minimum touch targets
 * DECOMPOSITION: Styles → WorkoutLoggerStyles.ts, Exercise card → ExerciseEntryCard.tsx
 */

import React, { useState, lazy, Suspense, useEffect, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import { X, Plus, Dumbbell, Save, Mic, Shield } from 'lucide-react';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import ExerciseEntryCard, { type Exercise, type WorkoutSet } from './ExerciseEntryCard';
import {
  ModalOverlay, ModalPanel, ModalHeader, ModalTitle, CloseButton,
  ModalBody, FormGrid, FormGroup, Label, Input, TextArea, Divider,
  SectionHeader, SectionTitle, AddButton, CoreSectionCard, CoreSectionHeader,
  CoreBadge, ModalFooter, CancelButton, SubmitButton, Spinner, ErrorText,
  ModeToggle, ModeButton, FROST_WHITE,
} from './WorkoutLoggerStyles';

const VoiceMemoUpload = lazy(() => import('../../../../WorkoutLogger/VoiceMemoUpload'));

// ─────────────────────────────────────────────────────────────
// SECTION: Error Boundary for Voice Upload
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  open, onClose, clientId, clientName, onSuccess,
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape key handler
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
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    const firstInput = modalRef.current?.querySelector('input') as HTMLElement;
    firstInput?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!date) newErrors.date = 'Date is required';
    if (date && new Date(date) > new Date()) newErrors.date = 'Date cannot be in the future';
    const dur = Number(duration);
    if (!duration || !Number.isInteger(dur) || dur <= 0) newErrors.duration = 'Duration must be a positive integer';
    const int = Number(intensity);
    if (!intensity || !Number.isInteger(int) || int < 1 || int > 10) newErrors.intensity = 'Intensity must be 1–10';
    if (exercises.length === 0) newErrors.exercises = 'At least one exercise is required';
    exercises.forEach((ex, i) => {
      if (!ex.name.trim()) newErrors[`exercise_${i}_name`] = 'Exercise name is required';
      if (ex.sets.length === 0) newErrors[`exercise_${i}_sets`] = 'At least one set is required';
      ex.sets.forEach((set, j) => {
        const reps = Number(set.reps);
        if (set.reps && (!Number.isInteger(reps) || reps < 0)) newErrors[`exercise_${i}_set_${j}_reps`] = 'Invalid reps';
        const weight = Number(set.weight);
        if (set.weight && !Number.isFinite(weight)) newErrors[`exercise_${i}_set_${j}_weight`] = 'Invalid weight';
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const workoutData = {
        title: title.trim(), date, duration: Number(duration), intensity: Number(intensity),
        notes: notes.trim() || undefined,
        exercises: [...coreExercises, ...exercises].map((ex) => ({
          name: ex.name.trim(), tempo: ex.tempo || undefined, rest: ex.rest ? Number(ex.rest) : undefined,
          sets: ex.sets.map((set) => ({ setNumber: set.setNumber, reps: set.reps ? Number(set.reps) : null, weight: set.weight ? Number(set.weight) : null })),
        })),
      };
      const response = await adminClientService.logWorkout(clientId, workoutData);
      if (response.success) {
        toast({
          title: response.xp ? 'Workout Logged + XP Awarded' : 'Workout Logged',
          description: response.xp
            ? `Awarded ${response.xp.pointsAwarded} XP! Streak: ${response.xp.streakDays} days`
            : `${clientName}'s workout recorded successfully.`,
          variant: 'success',
        });
        onSuccess?.();
        onClose();
      } else {
        toast({ title: 'Error', description: 'Failed to log workout', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to log workout', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  // ── Exercise CRUD helpers ──
  const addExercise = () => setExercises(prev => [...prev, { name: '', sets: [{ setNumber: 1, reps: '', weight: '' }] }]);
  const removeExercise = (i: number) => setExercises(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  const updateExerciseName = (i: number, name: string) => setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, name } : ex));
  const addSet = (ei: number) => setExercises(prev => prev.map((ex, i) => i !== ei ? ex : { ...ex, sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: '', weight: '' }] }));
  const removeSet = (ei: number, si: number) => setExercises(prev => prev.map((ex, i) => i !== ei || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== si).map((s, j) => ({ ...s, setNumber: j + 1 })) }));
  const updateSet = (ei: number, si: number, field: 'reps' | 'weight', value: string) => setExercises(prev => prev.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, [field]: value } : s) }));
  const updateExerciseMeta = (i: number, field: 'tempo' | 'rest', value: string) => setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));

  // Core exercise helpers
  const updateCoreName = (i: number, name: string) => setCoreExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, name } : ex));
  const updateCoreMeta = (i: number, field: 'tempo' | 'rest', value: string) => setCoreExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  const updateCoreSet = (ei: number, si: number, field: 'reps' | 'weight', value: string) => setCoreExercises(prev => prev.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, [field]: value } : s) }));

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel ref={modalRef} role="dialog" aria-modal="true" aria-label={`Log Workout for ${clientName}`} data-testid="workout-logger-modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle><Dumbbell size={20} /> Log Workout — {clientName}</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close" data-testid="workout-close-btn"><X size={20} /></CloseButton>
        </ModalHeader>

        <ModalBody>
          <ModeToggle>
            <ModeButton $active={mode === 'manual'} onClick={() => setMode('manual')}><Dumbbell size={16} /> Manual Entry</ModeButton>
            <ModeButton $active={mode === 'voice'} onClick={() => setMode('voice')}><Mic size={16} /> Voice Memo / File</ModeButton>
          </ModeToggle>

          {mode === 'voice' ? (
            <VoiceUploadErrorBoundary onReset={() => setMode('manual')}>
              <Suspense fallback={<p style={{ color: FROST_WHITE }}>Loading voice upload...</p>}>
                <VoiceMemoUpload
                  clientId={clientId} clientName={clientName}
                  onParsed={(parsed, _transcript) => {
                    if (parsed.exercises?.length) {
                      setExercises(parsed.exercises.map((ex: any) => ({
                        name: ex.exerciseName,
                        sets: ex.sets.map((s: any) => ({ setNumber: s.setNumber, reps: s.reps != null ? String(s.reps) : '', weight: s.weight != null ? String(s.weight) : '' })),
                      })));
                    }
                    if (parsed.sessionNotes) setNotes(parsed.sessionNotes);
                    if (parsed.overallIntensity) setIntensity(String(parsed.overallIntensity));
                    if (!title) setTitle('Voice Memo Workout');
                    if (!duration) setDuration('50');
                    setMode('manual');
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
                  <Input id="workout-title" data-testid="workout-title" placeholder="e.g., Upper Body Strength" value={title} onChange={(e) => setTitle(e.target.value)} />
                  {errors.title && <ErrorText>{errors.title}</ErrorText>}
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="workout-date">Date *</Label>
                  <Input id="workout-date" data-testid="workout-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
                  {errors.date && <ErrorText>{errors.date}</ErrorText>}
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="workout-duration">Duration (minutes) *</Label>
                  <Input id="workout-duration" data-testid="workout-duration" type="number" min="1" placeholder="60" value={duration} onChange={(e) => setDuration(e.target.value)} />
                  {errors.duration && <ErrorText>{errors.duration}</ErrorText>}
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="workout-intensity">Intensity (1–10) *</Label>
                  <Input id="workout-intensity" data-testid="workout-intensity" type="number" min="1" max="10" placeholder="7" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
                  {errors.intensity && <ErrorText>{errors.intensity}</ErrorText>}
                </FormGroup>
                <FormGroup $fullWidth>
                  <Label htmlFor="workout-notes">Notes (optional)</Label>
                  <TextArea id="workout-notes" data-testid="workout-notes" placeholder="Session notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormGroup>
              </FormGrid>

              <Divider />

              {/* Mandatory Stability & Core Section */}
              <CoreSectionCard>
                <CoreSectionHeader><Shield size={16} /> Stability &amp; Core <CoreBadge>NASM Required</CoreBadge></CoreSectionHeader>
                {coreExercises.map((coreEx, idx) => (
                  <ExerciseEntryCard key={`core-${idx}`} exercise={coreEx} index={idx} isCore canRemove={false} onNameChange={updateCoreName} onMetaChange={updateCoreMeta} onSetChange={updateCoreSet} />
                ))}
              </CoreSectionCard>

              <Divider />

              {/* Main Exercises */}
              <SectionHeader>
                <SectionTitle>Exercises</SectionTitle>
                <AddButton onClick={addExercise} data-testid="add-exercise-btn"><Plus size={16} /> Add Exercise</AddButton>
              </SectionHeader>
              {errors.exercises && <ErrorText style={{ marginBottom: 12 }}>{errors.exercises}</ErrorText>}
              {exercises.map((exercise, idx) => (
                <ExerciseEntryCard key={idx} exercise={exercise} index={idx} canRemove={exercises.length > 1} errors={errors} onNameChange={updateExerciseName} onMetaChange={updateExerciseMeta} onSetChange={updateSet} onAddSet={addSet} onRemoveSet={removeSet} onRemoveExercise={removeExercise} />
              ))}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}><X size={16} /> Cancel</CancelButton>
          <SubmitButton onClick={handleSubmit} disabled={submitting} data-testid="workout-submit-btn">
            {submitting ? <Spinner /> : <Save size={16} />}
            {submitting ? 'Saving...' : 'Log Workout'}
          </SubmitButton>
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutLoggerModal;
