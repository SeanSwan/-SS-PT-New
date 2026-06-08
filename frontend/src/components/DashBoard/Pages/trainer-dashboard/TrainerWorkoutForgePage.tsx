/**
 * COMPONENT: TrainerWorkoutForgePage
 * PURPOSE: Trainer workout-planning surface that combines manual draft
 * creation with the existing Swan Coach workout copilot.
 *
 * CANONICAL ROUTE:
 * UniversalDashboardLayout.tsx mounts this page at /dashboard/trainer/workout-forge.
 *
 * DATA CONTRACTS:
 * - GET role-aware clients for trainer/admin client selector parity.
 * - POST /api/workout-plans for draft plan persistence.
 * - WorkoutCopilotPanel for AI generation and approval flow.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Zap, Plus, Sparkles, Save, User, Dumbbell, Target, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import WorkoutCopilotPanel from '../admin-clients/components/WorkoutCopilotPanel';
import TrainerWorkoutForgeClientSelect from './TrainerWorkoutForgeClientSelect';
import useTrainerForgeClients from './useTrainerForgeClients';
import {
  ActionBtn,
  ButtonRow,
  Card,
  CardTitle,
  Chip,
  ChipRow,
  EmptyState,
  ExerciseArea,
  ExerciseGrid,
  ExerciseRow,
  FieldRow,
  HelperCopy,
  Input,
  Label,
  PageWrapper,
  PhaseCard,
  PhaseDetails,
  PhaseGrid,
  PhaseName,
  PhaseNum,
  RemoveExerciseBtn,
  Title,
} from './TrainerWorkoutForgePage.styles';
import {
  EQUIPMENT_OPTIONS,
  OPT_PHASES,
  buildExerciseId,
  parseTrainerForgeClientId,
  type ManualExercise,
} from './TrainerWorkoutForgePage.data';

const TRAINER_SESSION_ASSIGNMENT_DEFAULTS = {
  defaultAssignmentType: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  shouldDeductSession: false,
} as const;

const TRAINER_SESSION_PLAN_METADATA = {
  assignmentDefault: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  defaultShouldDeductSession: false,
} as const;

const TrainerWorkoutForgePage: React.FC = () => {
  const { authAxios, user } = useAuth();
  const clients = useTrainerForgeClients(authAxios, user);
  const [clientId, setClientId] = useState('');
  const [optPhase, setOptPhase] = useState(1);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [goal, setGoal] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [exercises, setExercises] = useState<ManualExercise[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const activePhase = OPT_PHASES.find(p => p.phase === optPhase)!;
  const selectedClient = useMemo(
    () => clients.find(client => String(client.id) === clientId) || null,
    [clientId, clients],
  );
  const parsedClientId = parseTrainerForgeClientId(clientId);

  const toggleEquipment = useCallback((eq: string) => {
    setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  }, []);

  const handleAddExercise = useCallback(() => {
    setExercises(prev => [
      ...prev,
      {
        id: buildExerciseId(prev.length),
        name: '',
        sets: activePhase.sets,
        reps: activePhase.reps,
        tempo: activePhase.tempo,
        rest: activePhase.rest,
        equipment: equipment[0] || 'Bodyweight',
      },
    ]);
  }, [activePhase.reps, activePhase.rest, activePhase.sets, activePhase.tempo, equipment]);

  const updateExercise = useCallback((id: string, field: keyof ManualExercise, value: string) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  }, []);

  const removeExercise = useCallback((id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  }, []);

  const buildPlanPayload = useCallback((targetClientId: number) => {
    const namedExercises = exercises
      .map(ex => ({ ...ex, name: ex.name.trim() }))
      .filter(ex => ex.name.length > 0);

    return {
      userId: targetClientId,
      title: workoutTitle.trim(),
      description: goal.trim() || `${activePhase.name} draft plan`,
      nasmPhase: optPhase,
      durationWeeks: 4,
      status: 'draft',
      createdBy: 'trainer',
      planData: {
        assignmentDefaults: TRAINER_SESSION_ASSIGNMENT_DEFAULTS,
        weeks: [
          {
            weekNumber: 1,
            sessions: [
              {
                day: 1,
                title: workoutTitle.trim(),
                focus: goal.trim() || activePhase.name,
                durationMinutes: Number(duration) || 60,
                exercises: namedExercises.map((ex, index) => ({
                  order: index + 1,
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  tempo: ex.tempo,
                  rest: ex.rest,
                  equipment: ex.equipment,
                })),
              },
            ],
          },
        ],
      },
      metadata: {
        source: 'trainer_workout_forge',
        equipment,
        optPhaseName: activePhase.name,
        ...TRAINER_SESSION_PLAN_METADATA,
      },
    };
  }, [activePhase.name, duration, equipment, exercises, goal, optPhase, workoutTitle]);

  const handleSavePlan = useCallback(async () => {
    const namedCount = exercises.filter(ex => ex.name.trim().length > 0).length;

    if (!selectedClient || parsedClientId === null) {
      toast.error('Select a client before saving a workout plan.');
      return;
    }
    if (!workoutTitle.trim()) {
      toast.error('Add a title before saving the plan.');
      return;
    }
    if (namedCount === 0) {
      toast.error('Add at least one named exercise before saving.');
      return;
    }

    setSaving(true);
    try {
      await authAxios.post('/api/workout-plans', buildPlanPayload(parsedClientId));
      toast.success(`Draft plan saved for ${selectedClient.name}.`);
    } catch {
      toast.error('Unable to save this draft plan. Check the client assignment and try again.');
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanPayload, exercises, parsedClientId, selectedClient, workoutTitle]);

  if (!clientId) {
    return (
      <PageWrapper>
        <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Workout Forge</Title>
        <Card>
          <TrainerWorkoutForgeClientSelect
            label="Select a Client"
            clientId={clientId}
            clients={clients}
            onChange={setClientId}
          />
        </Card>
        <EmptyState>Select a client to generate a personalized workout plan.</EmptyState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Workout Forge</Title>

      <Card>
        <TrainerWorkoutForgeClientSelect
          label="Client"
          clientId={clientId}
          clients={clients}
          onChange={setClientId}
        />
      </Card>

      <Card>
        <CardTitle><Target size={18} /> NASM OPT Phase</CardTitle>
        <PhaseGrid>
          {OPT_PHASES.map(p => (
            <PhaseCard key={p.phase} $active={optPhase === p.phase} onClick={() => setOptPhase(p.phase)}>
              <PhaseNum>Phase {p.phase}</PhaseNum>
              <PhaseName>{p.name}</PhaseName>
            </PhaseCard>
          ))}
        </PhaseGrid>
        <PhaseDetails>
          <div>Reps: <span>{activePhase.reps}</span></div>
          <div>Sets: <span>{activePhase.sets}</span></div>
          <div>Tempo: <span>{activePhase.tempo}</span></div>
          <div>Rest: <span>{activePhase.rest}</span></div>
        </PhaseDetails>
      </Card>

      <Card>
        <CardTitle><Dumbbell size={18} /> Workout Template</CardTitle>
        <Label htmlFor="trainer-forge-title">Title</Label>
        <Input id="trainer-forge-title" placeholder="e.g. Upper Body Push - Phase 2" value={workoutTitle} onChange={e => setWorkoutTitle(e.target.value)} />
        <FieldRow>
          <div>
            <Label htmlFor="trainer-forge-duration">Duration (min)</Label>
            <Input id="trainer-forge-duration" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="trainer-forge-goal">Goal</Label>
            <Input id="trainer-forge-goal" placeholder="e.g. Strength endurance" value={goal} onChange={e => setGoal(e.target.value)} />
          </div>
        </FieldRow>
        <Label>Equipment</Label>
        <ChipRow>
          {EQUIPMENT_OPTIONS.map(eq => (
            <Chip key={eq} $active={equipment.includes(eq)} onClick={() => toggleEquipment(eq)}>{eq}</Chip>
          ))}
        </ChipRow>
      </Card>

      <Card>
        <CardTitle><User size={18} /> Exercises</CardTitle>
        {exercises.length === 0 ? (
          <ExerciseArea>No exercises added yet. Add a manual row or use Swan Coach.</ExerciseArea>
        ) : (
          <ExerciseGrid>
            {exercises.map((exercise, index) => (
              <ExerciseRow key={exercise.id}>
                <div>
                  <Label htmlFor={`${exercise.id}-name`}>Exercise {index + 1} Name</Label>
                  <Input id={`${exercise.id}-name`} value={exercise.name} onChange={e => updateExercise(exercise.id, 'name', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor={`${exercise.id}-sets`}>Sets</Label>
                  <Input id={`${exercise.id}-sets`} value={exercise.sets} onChange={e => updateExercise(exercise.id, 'sets', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor={`${exercise.id}-reps`}>Reps</Label>
                  <Input id={`${exercise.id}-reps`} value={exercise.reps} onChange={e => updateExercise(exercise.id, 'reps', e.target.value)} />
                </div>
                <RemoveExerciseBtn onClick={() => removeExercise(exercise.id)} aria-label={`Remove exercise ${index + 1}`}>
                  <Trash2 size={16} />
                </RemoveExerciseBtn>
              </ExerciseRow>
            ))}
          </ExerciseGrid>
        )}
        <ButtonRow>
          <ActionBtn $variant="secondary" onClick={handleAddExercise}>
            <Plus size={18} /> Add Exercise
          </ActionBtn>
          <ActionBtn onClick={() => setCopilotOpen(true)}>
            <Sparkles size={18} /> Generate with Swan Coach
          </ActionBtn>
          <ActionBtn $variant="secondary" onClick={handleSavePlan} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Draft Plan'}
          </ActionBtn>
        </ButtonRow>
        <HelperCopy>Manual drafts save as trainer-reviewable plans. Swan Coach opens the existing AI approval workflow.</HelperCopy>
      </Card>

      {selectedClient && parsedClientId !== null && (
        <WorkoutCopilotPanel
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          clientId={parsedClientId}
          clientName={selectedClient.name}
          autoGenerate
          onSuccess={() => {
            setCopilotOpen(false);
            toast.success(`Swan Coach plan saved for ${selectedClient.name}.`);
          }}
        />
      )}
    </PageWrapper>
  );
};

export default TrainerWorkoutForgePage;
