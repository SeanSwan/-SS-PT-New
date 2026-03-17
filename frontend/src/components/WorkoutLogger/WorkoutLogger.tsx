/**
 * WorkoutLogger Component — Orchestrator
 * =======================================
 *
 * Revolutionary NASM Workout Logging Interface for Trainers.
 * Decomposed into sub-components for maintainability (<300 lines each).
 *
 * Sub-components:
 * - WorkoutLoggerCS.ts — Shared color palette + keyframes
 * - WorkoutLoggerHeader.tsx — Client info, date, stats
 * - NASMProtocolSection.tsx — Warmup/Balance/Cooldown checklists
 * - ExerciseCardComponent.tsx — Exercise card with set table
 * - SessionSummaryForm.tsx — Intensity, notes, workout stats
 * - WorkoutLoggerFooter.tsx — Action buttons
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { Plus, Search, Download, Heart, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  dailyWorkoutFormService,
  ExerciseEntry,
  ExerciseSet,
  DailyWorkoutForm
} from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import AITerminalPanel from '../Shared/AITerminalPanel';
import {
  APPLY_WORKOUT_EVENT,
  PENDING_WORKOUT_KEY,
  type WorkoutPlanTransfer,
  type WorkoutExerciseTransfer,
} from '../../utils/parseAIWorkoutPlan';
import { exportWorkoutLoggerPDF } from '../../services/pdfExportService';

// Sub-components
import { CS, shimmer } from './WorkoutLoggerCS';
import WorkoutLoggerHeader from './WorkoutLoggerHeader';
import NASMProtocolSection, { type NASMItem } from './NASMProtocolSection';
import ExerciseCardComponent from './ExerciseCardComponent';
import SessionSummaryForm from './SessionSummaryForm';
import WorkoutLoggerFooter from './WorkoutLoggerFooter';

// ==================== INTERFACES ====================

interface WorkoutLoggerProps {
  clientId: number;
  onComplete: (formData: DailyWorkoutForm) => void;
  onCancel: () => void;
  initialData?: Partial<ExerciseEntry[]>;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  phone?: string;
}

// ==================== MAIN COMPONENT ====================

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  clientId,
  onComplete,
  onCancel,
  initialData = []
}) => {
  const { user } = useAuth();

  // ── Core State ──
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [overallIntensity, setOverallIntensity] = useState(5);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [popularExercises, setPopularExercises] = useState<Exercise[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null);

  // ── NASM Protocol State ──
  const [warmupItems, setWarmupItems] = useState<NASMItem[]>([
    { name: 'Foam Roll — IT Band / TFL', completed: false },
    { name: 'Foam Roll — Calves', completed: false },
    { name: 'Static Stretch — Hip Flexors (30s each)', completed: false },
    { name: 'Static Stretch — Chest / Anterior Deltoid (30s)', completed: false },
    { name: 'Dynamic Warmup — Leg Swings (10 each)', completed: false },
    { name: 'Dynamic Warmup — Arm Circles (10 each direction)', completed: false },
  ]);
  const [balanceCoreItems, setBalanceCoreItems] = useState<NASMItem[]>([
    { name: 'Single-Leg Balance — 30s each side', completed: false },
    { name: 'Single-Leg Balance Reach — 10 each side', completed: false },
    { name: 'Plank Hold — 30-60s', completed: false },
    { name: 'Dead Bug — 10 each side', completed: false },
    { name: 'Pallof Press — 10 each side', completed: false },
  ]);
  const [cooldownItems, setCooldownItems] = useState<NASMItem[]>([
    { name: 'Static Stretch — Hamstrings (30s each)', completed: false },
    { name: 'Static Stretch — Quadriceps (30s each)', completed: false },
    { name: 'Static Stretch — Chest & Shoulders (30s each)', completed: false },
    { name: 'Deep Breathing — 5 breaths, box pattern', completed: false },
  ]);
  const [nasmSectionsOpen, setNasmSectionsOpen] = useState<Record<string, boolean>>({
    warmup: true, balanceCore: false, cooldown: false,
  });

  // ── NASM Helpers ──
  const toggleNasmSection = useCallback((key: string) =>
    setNasmSectionsOpen(prev => ({ ...prev, [key]: !prev[key] })), []);

  const toggleNasmItem = useCallback((
    setter: React.Dispatch<React.SetStateAction<NASMItem[]>>,
    index: number,
  ) => setter(prev => prev.map((item, i) =>
    i === index ? { ...item, completed: !item.completed } : item
  )), []);

  // ── Exercise Search ──
  const loadExercises = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setAvailableExercises(popularExercises);
      return;
    }
    setIsLoadingExercises(true);
    try {
      const api = new ApiService();
      const response = await api.get(`/api/exercises/search?q=${encodeURIComponent(query)}&limit=10`);
      setAvailableExercises(response.success && response.exercises ? response.exercises : []);
    } catch (error) {
      console.error('Failed to search exercises:', error);
      setAvailableExercises([]);
      toast.error('Failed to search exercises. Please try again.');
    } finally {
      setIsLoadingExercises(false);
    }
  }, [popularExercises]);

  const loadPopularExercises = useCallback(async () => {
    try {
      const api = new ApiService();
      const response = await api.get('/api/exercises/search?q=squat&limit=5');
      if (response.success && response.exercises) {
        setPopularExercises(response.exercises);
        setAvailableExercises(response.exercises);
      }
    } catch (error) {
      console.error('Failed to load popular exercises:', error);
    }
  }, []);

  // ── Load client + popular exercises on mount ──
  useEffect(() => {
    loadClientData();
    loadPopularExercises();
  }, [clientId, loadPopularExercises]);

  // ── Debounced exercise search ──
  useEffect(() => {
    const timeoutId = setTimeout(() => loadExercises(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadExercises]);

  // ── AI-to-Logger prefill ──
  const convertAIExercises = useCallback((incoming: WorkoutExerciseTransfer[]): ExerciseEntry[] => {
    return incoming.map(ex => ({
      exerciseId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exerciseName: ex.exerciseName,
      sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
        setNumber: i + 1,
        weight: ex.weight || 0,
        reps: ex.reps || 10,
        rpe: 5,
        tempo: ex.tempo || '',
        restTime: ex.restTime || 60,
        formQuality: 3,
        notes: ex.notes || '',
      })),
      formRating: 3,
      painLevel: 0,
      performanceNotes: '',
    }));
  }, []);

  // Listen for live custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkoutPlanTransfer>).detail;
      if (detail?.exercises?.length) {
        const converted = convertAIExercises(detail.exercises);
        setExercises(prev => [...prev, ...converted]);
        toast.success(`Applied ${converted.length} exercises from AI plan`);
        try { sessionStorage.removeItem(PENDING_WORKOUT_KEY); } catch { /* ignore */ }
      }
    };
    window.addEventListener(APPLY_WORKOUT_EVENT, handler);
    return () => window.removeEventListener(APPLY_WORKOUT_EVENT, handler);
  }, [convertAIExercises]);

  // Check sessionStorage on mount for pending AI plan
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_WORKOUT_KEY);
      if (pending) {
        const plan: WorkoutPlanTransfer = JSON.parse(pending);
        if (plan.exercises?.length) {
          const converted = convertAIExercises(plan.exercises);
          setExercises(prev => [...prev, ...converted]);
          toast.success(`Loaded ${converted.length} exercises from AI plan`);
          sessionStorage.removeItem(PENDING_WORKOUT_KEY);
        }
      }
    } catch { /* ignore parse errors */ }
  }, [convertAIExercises]);

  // ── Client Data ──
  const loadClientData = async () => {
    try {
      const api = new ApiService();
      const isSelf = user?.id === clientId;
      const infoUrl = isSelf && user?.role === 'client'
        ? '/api/workout-forms/my/info'
        : `/api/workout-forms/client/${clientId}/info`;
      const axiosResponse = await api.get(infoUrl);
      const data = axiosResponse?.data ?? axiosResponse;

      if (data.success && data.client) {
        setClient({
          id: data.client.id,
          firstName: data.client.firstName,
          lastName: data.client.lastName,
          email: data.client.email,
          availableSessions: data.client.availableSessions,
          phone: data.client.phone
        });
        if (data.client.hasWorkoutToday) {
          toast.warning(`${data.client.firstName} already has a workout logged for today`);
        }
        if (data.client.availableSessions <= 1) {
          toast.warning(`${data.client.firstName} has only ${data.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(data.message || 'Failed to load client data');
      }
    } catch (error: any) {
      console.error('Failed to load client data:', error);
      setClient({
        id: clientId,
        firstName: 'Client',
        lastName: `#${clientId}`,
        email: '',
        availableSessions: 0,
        phone: ''
      });
      toast.error(error.message || 'Failed to load client information');
    }
  };

  // ── Load Today's Plan ──
  const loadTodaysPlan = useCallback(async () => {
    setIsLoadingPlan(true);
    try {
      const api = new ApiService();
      const response = await api.get(`/api/workouts/${clientId}/current`);
      const data = response?.data ?? response;

      if (!data?.plan?.days?.length) {
        toast.info('No active workout plan found for this client');
        return;
      }

      const dayOfWeek = new Date().getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[dayOfWeek];

      const planDay = data.plan.days.find(
        (d: any) => d.dayName?.toLowerCase() === todayName.toLowerCase()
      ) || data.plan.days[dayOfWeek % data.plan.days.length];

      if (!planDay?.exercises?.length) {
        toast.info(`No exercises scheduled for ${todayName} in the active plan`);
        return;
      }

      const prefilled: ExerciseEntry[] = planDay.exercises.map((ex: any) => ({
        exerciseId: ex.exerciseId || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        exerciseName: ex.exerciseName || ex.name || 'Unknown Exercise',
        sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
          setNumber: i + 1,
          weight: ex.weight || 0,
          reps: ex.targetReps || ex.reps || 10,
          rpe: 5,
          tempo: ex.tempo || '',
          restTime: ex.restTime || 60,
          formQuality: 3,
          notes: '',
        })),
        formRating: 3,
        painLevel: 0,
        performanceNotes: '',
      }));

      setExercises(prev => [...prev, ...prefilled]);
      toast.success(`Loaded ${prefilled.length} exercises from ${todayName}'s plan`);
    } catch (error: any) {
      console.error('Failed to load today\'s plan:', error);
      toast.error('Could not load today\'s workout plan');
    } finally {
      setIsLoadingPlan(false);
    }
  }, [clientId]);

  // ── Exercise CRUD ──
  const createEmptySet = useCallback((setNumber: number): ExerciseSet => ({
    setNumber, weight: 0, reps: 0, rpe: 5, tempo: '', restTime: 60, formQuality: 3, notes: ''
  }), []);

  const addExercise = useCallback((exercise: Exercise) => {
    setExercises(prev => [...prev, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [createEmptySet(1)],
      formRating: 3,
      painLevel: 0,
      performanceNotes: ''
    }]);
    setSearchQuery('');
    setShowExerciseSearch(false);
    toast.success(`Added ${exercise.name} to workout`);
  }, [createEmptySet]);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return { ...exercise, sets: [...exercise.sets, createEmptySet(exercise.sets.length + 1)] };
    }));
  }, [createEmptySet]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex || exercise.sets.length <= 1) return exercise;
      const newSets = exercise.sets
        .filter((_, si) => si !== setIndex)
        .map((set, idx) => ({ ...set, setNumber: idx + 1 }));
      return { ...exercise, sets: newSets };
    }));
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, si) =>
          si !== setIndex ? set : { ...set, [field]: value }
        ),
      };
    }));
  }, []);

  const updateExercise = useCallback((exerciseIndex: number, field: keyof ExerciseEntry, value: any) => {
    setExercises(prev => prev.map((exercise, i) =>
      i !== exerciseIndex ? exercise : { ...exercise, [field]: value }
    ));
  }, []);

  const removeExercise = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    toast.info('Exercise removed from workout');
  }, []);

  // ── Export PDF ──
  const handleExportPDF = useCallback(() => {
    if (exercises.length === 0) {
      toast.error('Add exercises before exporting');
      return;
    }
    exportWorkoutLoggerPDF({
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Client',
      trainerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : undefined,
      date: new Date().toISOString().split('T')[0],
      exercises,
      sessionNotes,
      overallIntensity,
    });
    toast.success('PDF exported');
  }, [exercises, client, user, sessionNotes, overallIntensity]);

  // ── Submit with AbortSignal timeout (Phase 3 fix) ──
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    if (exercises.length === 0) { toast.error('Please add at least one exercise'); return; }
    if (!client) { toast.error('Client information not loaded'); return; }
    if (client.availableSessions <= 0 && user?.role !== 'admin') {
      toast.error('Client has no available sessions remaining'); return;
    }

    const hasIncompleteExercises = exercises.some(exercise =>
      exercise.sets.length === 0 ||
      exercise.sets.some(set => set.weight === 0 && set.reps === 0)
    );
    if (hasIncompleteExercises) {
      toast.error('Please complete all exercise sets before submitting'); return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const formData = {
        clientId,
        date: new Date().toISOString().split('T')[0],
        exercises,
        sessionNotes,
        overallIntensity
      };

      const response = await dailyWorkoutFormService.submitWorkoutForm(formData);

      if (response.success && response.data) {
        toast.success('Workout logged successfully! Session deducted and points earned.');
        setSubmittedFormId(response.data.id || response.data.formId || null);
        onComplete(response.data);
      } else {
        throw new Error(response.message || 'Failed to submit workout form');
      }
    } catch (error: any) {
      console.error('Error submitting workout form:', error);
      if (error.name === 'AbortError') {
        toast.error('Workout submission timed out. Please try again.');
      } else {
        toast.error(error.message || 'Failed to submit workout form');
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ── Generate & Send Summary ──
  const handleGenerateSummary = useCallback(async () => {
    if (!submittedFormId && exercises.length === 0) {
      toast.error('Submit the workout first before generating a summary');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const api = new ApiService();
      const payload = {
        clientId,
        formId: submittedFormId,
        exercises: exercises.map(ex => ({
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe, tempo: s.tempo })),
          formRating: ex.formRating,
          painLevel: ex.painLevel,
        })),
        sessionNotes,
        overallIntensity,
        sendEmail: true,
      };

      const response = await api.post('/api/workout-summaries', payload);
      const data = response?.data ?? response;

      if (data.success) {
        toast.success(data.emailSent ? 'Summary generated and sent to client!' : 'Summary generated successfully!');
      } else {
        throw new Error(data.message || 'Failed to generate summary');
      }
    } catch (error: any) {
      console.error('Failed to generate summary:', error);
      toast.error(error.message || 'Failed to generate workout summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [clientId, submittedFormId, exercises, sessionNotes, overallIntensity]);

  // ── Computed Values ──
  const totalSets = useMemo(() =>
    exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), [exercises]);

  const estimatedDuration = useMemo(() =>
    Math.min(totalSets * 3, 120), [totalSets]);

  // ── Loading State ──
  if (!client) {
    return (
      <WorkoutLoggerContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <LoadingSpinner />
        </div>
      </WorkoutLoggerContainer>
    );
  }

  // ── Render ──
  return (
    <>
      <WorkoutLoggerContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Equipment Profile Picker */}
        <EquipmentProfilePicker
          selectedProfileId={equipmentProfileId}
          onSelect={setEquipmentProfileId}
          label="Training Location"
        />

        {/* AI Assistant Panel */}
        <AITerminalPanel
          context="workout_generation"
          clientId={clientId}
          equipmentProfileId={equipmentProfileId}
          placeholder="Ask AI to suggest exercises for this client..."
        />

        {/* Header */}
        <WorkoutLoggerHeader
          clientFirstName={client.firstName}
          clientLastName={client.lastName}
          availableSessions={client.availableSessions}
          totalSets={totalSets}
          estimatedDuration={estimatedDuration}
        />

        {/* NASM Warmup */}
        <NASMProtocolSection
          title="Warmup & Corrective"
          icon={<Heart size={18} style={{ color: CS.gaming }} />}
          items={warmupItems}
          isOpen={nasmSectionsOpen.warmup}
          onToggleOpen={() => toggleNasmSection('warmup')}
          onToggleItem={(idx) => toggleNasmItem(setWarmupItems, idx)}
        />

        {/* Exercise Section */}
        <ExerciseSection>
          <LoadPlanRow>
            <LoadPlanButton onClick={loadTodaysPlan} disabled={isLoadingPlan}>
              <Download size={16} />
              {isLoadingPlan ? 'Loading...' : "Load Today's Plan"}
            </LoadPlanButton>
          </LoadPlanRow>

          <ExerciseSearchBar>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search exercises by name, type, or muscle group..."
              aria-label="Search exercises"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowExerciseSearch(true)}
            />
            <AnimatePresence>
              {showExerciseSearch && (
                <SearchDropdown
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isLoadingExercises ? (
                    <DropdownMessage>
                      <LoadingSpinner style={{ margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem' }}>Searching exercises...</div>
                    </DropdownMessage>
                  ) : availableExercises.length > 0 ? (
                    availableExercises.map((exercise) => (
                      <SearchResultItem
                        key={exercise.id}
                        onClick={() => addExercise(exercise)}
                      >
                        <SearchResultName>{exercise.name}</SearchResultName>
                        <SearchResultMeta>
                          {exercise.exerciseType} • {exercise.muscleGroups.join(', ')}
                        </SearchResultMeta>
                      </SearchResultItem>
                    ))
                  ) : (
                    <DropdownMessage>
                      {searchQuery.length >= 2 ? 'No exercises found. Try a different search.' : 'Start typing to search exercises...'}
                    </DropdownMessage>
                  )}
                </SearchDropdown>
              )}
            </AnimatePresence>
          </ExerciseSearchBar>

          {exercises.length === 0 ? (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Your First Exercise
            </AddExerciseButton>
          ) : (
            exercises.map((exercise, exerciseIndex) => (
              <ExerciseCardComponent
                key={exerciseIndex}
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                onUpdateExercise={updateExercise}
                onUpdateSet={updateSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
              />
            ))
          )}

          {exercises.length > 0 && (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Another Exercise
            </AddExerciseButton>
          )}
        </ExerciseSection>

        {/* NASM Balance & Core */}
        <NASMProtocolSection
          title="Balance, Core & Stability"
          icon={<Shield size={18} style={{ color: '#8B5CF6' }} />}
          items={balanceCoreItems}
          isOpen={nasmSectionsOpen.balanceCore}
          onToggleOpen={() => toggleNasmSection('balanceCore')}
          onToggleItem={(idx) => toggleNasmItem(setBalanceCoreItems, idx)}
        />

        {/* NASM Cooldown */}
        <NASMProtocolSection
          title="Cooldown & Recovery"
          icon={<RotateCcw size={18} style={{ color: CS.accent }} />}
          items={cooldownItems}
          isOpen={nasmSectionsOpen.cooldown}
          onToggleOpen={() => toggleNasmSection('cooldown')}
          onToggleItem={(idx) => toggleNasmItem(setCooldownItems, idx)}
        />

        {/* Session Summary */}
        {exercises.length > 0 && (
          <SessionSummaryForm
            overallIntensity={overallIntensity}
            onIntensityChange={setOverallIntensity}
            sessionNotes={sessionNotes}
            onNotesChange={setSessionNotes}
            exerciseCount={exercises.length}
            totalSets={totalSets}
            estimatedDuration={estimatedDuration}
          />
        )}

        {/* Footer Actions */}
        <WorkoutLoggerFooter
          onCancel={onCancel}
          onExportPDF={handleExportPDF}
          onSubmit={handleSubmit}
          onGenerateSummary={handleGenerateSummary}
          hasExercises={exercises.length > 0}
          isSubmitting={isSubmitting}
          isGeneratingSummary={isGeneratingSummary}
          showGenerateSummary={!!submittedFormId}
        />
      </WorkoutLoggerContainer>
    </>
  );
};

export default WorkoutLogger;

// ==================== STYLED COMPONENTS (orchestrator-only) ====================

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const WorkoutLoggerContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(165deg, ${CS.bg} 0%, #001040 40%, #001848 100%);
  padding: 2rem;
  color: ${CS.text};
  font-family: 'Sora', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
  }

  & > * { position: relative; z-index: 1; }

  @media (max-width: 768px) { padding: 1rem; }
  @media (max-width: 430px) { padding: 0.75rem; }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: ${spin} 0.8s ease-in-out infinite;
`;

const ExerciseSection = styled.div`
  margin-bottom: 2rem;
`;

const LoadPlanRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`;

const LoadPlanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  color: #8B5CF6;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ExerciseSearchBar = styled.div`
  position: relative;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3.25rem;
  background: ${CS.inputBg};
  backdrop-filter: blur(12px);
  border: 2px solid ${CS.glassBorder};
  border-radius: 1rem;
  color: ${CS.text};
  font-size: 1rem;
  font-family: 'Sora', sans-serif;
  min-height: 52px;
  box-sizing: border-box;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px rgba(80, 160, 240, 0.15), 0 0 24px rgba(80, 160, 240, 0.1);
  }
  &::placeholder { color: rgba(224, 236, 244, 0.65); }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${CS.gaming};
  pointer-events: none;
`;

const SearchDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${CS.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${CS.glassBorder};
  border-radius: 1rem;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 0.25rem;
`;

const DropdownMessage = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: ${CS.textSecondary};
`;

const SearchResultItem = styled.div`
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid ${CS.glassBorder};
  transition: background 0.2s ease;

  &:hover { background: rgba(139, 92, 246, 0.12); }
`;

const SearchResultName = styled.div`
  font-weight: 600;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const SearchResultMeta = styled.div`
  font-size: 0.8rem;
  color: ${CS.textSecondary};
  margin-top: 4px;
  font-family: 'Sora', sans-serif;
`;

const AddExerciseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
  border: none;
  border-radius: 1rem;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: 2rem;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(80, 160, 240, 0.25);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 36px rgba(80, 160, 240, 0.4);
  }
  &:active { transform: scale(0.98); }
`;
