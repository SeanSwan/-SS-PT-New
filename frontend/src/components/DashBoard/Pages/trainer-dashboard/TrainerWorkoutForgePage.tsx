/**
 * COMPONENT: TrainerWorkoutForgePage
 * PURPOSE: Trainer Build Plan surface that combines manual draft
 * creation with the existing Swan Coach workout copilot.
 *
 * CANONICAL ROUTE:
 * UniversalDashboardLayout.routes.tsx mounts this page at /dashboard/trainer/build-plan (canonical) and /dashboard/trainer/workout-forge (alias).
 *
 * DATA CONTRACTS:
 * - GET role-aware clients for trainer/admin client selector parity.
 * - POST /api/workout-plans for draft plan persistence.
 * - WorkoutCopilotPanel for AI generation and approval flow.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { resolveAudienceFromPath } from '../../workspaces/clients-team/resolveAudienceFromPath';
import { toast } from 'react-toastify';
import { Zap } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import WorkoutCopilotPanel from '../admin-clients/components/WorkoutCopilotPanel';
import TrainerWorkoutForgeClientSelect from './TrainerWorkoutForgeClientSelect';
import TrainerWorkoutForgeManualBuilder from './TrainerWorkoutForgeManualBuilder';
import TrainerWorkoutForgeNextActions from './TrainerWorkoutForgeNextActions';
import useTrainerForgeClients from './useTrainerForgeClients';
import {
  Card,
  EmptyState,
  PageWrapper,
  Title,
} from './TrainerWorkoutForgePage.styles';
import {
  OPT_PHASES,
  buildExerciseId,
  buildTrainerForgeLoggerPath,
  buildTrainerForgePlannerPath,
  parseTrainerForgeClientId,
  TRAINER_SESSION_ASSIGNMENT_DEFAULTS,
  TRAINER_SESSION_PLAN_METADATA,
  type ManualExercise,
  type SavedTrainerForgePlan,
} from './TrainerWorkoutForgePage.data';

const TrainerWorkoutForgePage: React.FC = () => {
  const { authAxios, user } = useAuth();
  const location = useLocation();
  // Build Plan is mounted for admin AND trainer; every handoff out of this page
  // must stay inside the dashboard the actor is already in.
  const forgeAudience = resolveAudienceFromPath(location.pathname);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [lastSavedPlan, setLastSavedPlan] = useState<SavedTrainerForgePlan | null>(null);
  const appliedRouteClientRef = useRef<string | null>(null);

  const activePhase = OPT_PHASES.find(p => p.phase === optPhase)!;
  const selectedClient = useMemo(
    () => clients.find(client => String(client.id) === clientId) || null,
    [clientId, clients],
  );
  const parsedClientId = parseTrainerForgeClientId(clientId);
  const routeClientId = useMemo(() => parseTrainerForgeClientId(searchParams.get('clientId')), [searchParams]);

  useEffect(() => {
    if (routeClientId === null) return;

    const nextClientId = String(routeClientId);
    if (appliedRouteClientRef.current === nextClientId) return;
    if (!clients.some(client => String(client.id) === nextClientId)) return;

    appliedRouteClientRef.current = nextClientId;
    setClientId(nextClientId);
    setLastSavedPlan(null);
  }, [clients, routeClientId]);

  const handleClientChange = useCallback((nextClientId: string) => {
    setClientId(nextClientId);
    setLastSavedPlan(null);
  }, []);

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
        source: 'trainer_build_plan',
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
      setLastSavedPlan({
        clientId: parsedClientId,
        clientName: selectedClient.name,
        title: workoutTitle.trim(),
      });
      toast.success(`Draft plan saved for ${selectedClient.name}.`);
    } catch {
      toast.error('Unable to save this draft plan. Check the client assignment and try again.');
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanPayload, exercises, parsedClientId, selectedClient, workoutTitle]);

  const handleLogSavedPlanToday = useCallback(() => {
    if (!lastSavedPlan) return;
    navigate(buildTrainerForgeLoggerPath(lastSavedPlan.clientId, forgeAudience));
  }, [forgeAudience, lastSavedPlan, navigate]);

  const handleOpenSavedPlanInPlanner = useCallback(() => {
    if (!lastSavedPlan) return;
    navigate(buildTrainerForgePlannerPath(lastSavedPlan.clientId, forgeAudience));
  }, [forgeAudience, lastSavedPlan, navigate]);

  if (!clientId) {
    return (
      <PageWrapper>
        <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Build Plan</Title>
        <Card>
          <TrainerWorkoutForgeClientSelect
            label="Select a Client"
            clientId={clientId}
            clients={clients}
            onChange={handleClientChange}
          />
        </Card>
        <EmptyState>Select a client to build a personalized workout plan.</EmptyState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Build Plan</Title>

      <Card>
        <TrainerWorkoutForgeClientSelect
          label="Client"
          clientId={clientId}
          clients={clients}
          onChange={handleClientChange}
        />
      </Card>

      <TrainerWorkoutForgeManualBuilder
        optPhase={optPhase}
        workoutTitle={workoutTitle}
        duration={duration}
        goal={goal}
        equipment={equipment}
        exercises={exercises}
        saving={saving}
        onOptPhaseChange={setOptPhase}
        onWorkoutTitleChange={setWorkoutTitle}
        onDurationChange={setDuration}
        onGoalChange={setGoal}
        onToggleEquipment={toggleEquipment}
        onAddExercise={handleAddExercise}
        onUpdateExercise={updateExercise}
        onRemoveExercise={removeExercise}
        onOpenCopilot={() => setCopilotOpen(true)}
        onSavePlan={handleSavePlan}
      />

      {lastSavedPlan && (
        <TrainerWorkoutForgeNextActions
          savedPlan={lastSavedPlan}
          onLogToday={handleLogSavedPlanToday}
          onOpenPlanner={handleOpenSavedPlanInPlanner}
        />
      )}

      {selectedClient && parsedClientId !== null && (
        <WorkoutCopilotPanel
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          clientId={parsedClientId}
          clientName={selectedClient.name}
          autoGenerate
          onSuccess={() => {
            setCopilotOpen(false);
            setLastSavedPlan({
              clientId: parsedClientId,
              clientName: selectedClient.name,
              title: 'Swan Coach Plan',
            });
            toast.success(`Swan Coach plan saved for ${selectedClient.name}.`);
          }}
        />
      )}
    </PageWrapper>
  );
};

export default TrainerWorkoutForgePage;
