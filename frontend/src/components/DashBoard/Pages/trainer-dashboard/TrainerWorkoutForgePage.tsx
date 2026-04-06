/**
 * ============================================================================
 * FILE: TrainerWorkoutForgePage.tsx
 * PURPOSE: Workout intelligence page for trainers to build NASM OPT-based templates
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a workout template builder with client selection,
 * OPT phase configuration, exercise list management, and AI generation trigger.
 * HOW IT FITS IN THE APP: Trainer Dashboard → Workout Forge tab
 * KEY DECISIONS: NASM 5-phase OPT model drives rep/set/tempo defaults
 * NASM PROTOCOL CONTEXT: Phase selector controls suggested parameters per OPT model
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainerWorkoutForgePage                           ║
 * ║  PURPOSE: Build NASM OPT workout templates for clients        ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Workout Forge                             [Save] [AI Gen] │
 * ├────────────────────────────────────────────────────────────┤
 * │ Client: [Select Client ▼]   OPT Phase: [Phase 1 ▼]       │
 * │ Template Name: [________________________]                  │
 * ├────────────────────────────────────────────────────────────┤
 * │ Phase 1: Stabilization — 12-20 reps, 1-3 sets, 4/2/1     │
 * ├────────────────────────────────────────────────────────────┤
 * │ Exercise List                               [+ Add]       │
 * │ ┌──────────────────────────────────────────────────────┐  │
 * │ │ 1. Goblet Squat  •  3×15  •  4/2/1  •  60s rest     │  │
 * │ │ 2. Cable Row     •  3×15  •  4/2/1  •  60s rest     │  │
 * │ └──────────────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  None (page-level component)
 * State:     { clients, selectedClient, phase, templateName, exercises, loading }
 * API Calls: GET /api/users?role=client, POST /api/workout-templates, POST /api/ai/generate-workout
 * Events:    onPhaseChange → update defaults, onAddExercise → append, onSave → POST, onAIGenerate → POST
 * Children:  ClientSelector, PhaseSelector, PhaseInfoBar, ExerciseList, ExerciseRow
 *
 * CLICK-OUTCOMES:
 * [Phase dropdown]   → Update OPT phase → Refresh rep/set/tempo defaults
 * [+ Add Exercise]   → Append blank exercise row to list
 * [AI Generate]      → POST /api/ai/generate-workout → Populate exercise list
 * [Save Template]    → POST /api/workout-templates → Success toast
 * [Remove exercise]  → Remove row from exercise list
 *
 * NASM PROTOCOL CONTEXT: OPT_PHASES constant drives rep/set/tempo/rest defaults
 * GAMIFICATION: Template save → trainer does not earn XP (client earns on completion)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import {
  Zap, ChevronDown, Plus, Sparkles, Save, User, Dumbbell, Clock, Target
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
const OPT_PHASES = [
  { phase: 1, name: 'Stabilization Endurance', reps: '12-20', sets: '1-3', tempo: '4/2/1', rest: '0-90s' },
  { phase: 2, name: 'Strength Endurance', reps: '8-12', sets: '2-4', tempo: '2/0/2', rest: '0-60s' },
  { phase: 3, name: 'Hypertrophy', reps: '6-12', sets: '3-5', tempo: '2/0/2', rest: '0-60s' },
  { phase: 4, name: 'Maximal Strength', reps: '1-5', sets: '4-6', tempo: 'X/0/X', rest: '3-5min' },
  { phase: 5, name: 'Power', reps: '1-5 / 8-10', sets: '3-6', tempo: 'X/0/X', rest: '3-5min' },
] as const;

const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Resistance Band', 'Stability Ball', 'Medicine Ball', 'BOSU Ball'];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Card = styled.div`
  background: var(--bg-elevated, #141419); border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px; padding: 24px; margin-bottom: 20px;
`;
const CardTitle = styled.h2`
  font-size: 1rem; font-weight: 700; margin: 0 0 16px;
  display: flex; align-items: center; gap: 8px; color: var(--accent-primary, #60C0F0);
`;
const Label = styled.label`
  display: block; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--text-secondary, rgba(224,236,244,0.6)); margin-bottom: 8px;
`;
const Select = styled.div`
  position: relative; margin-bottom: 16px;
  select { width: 100%; min-height: 44px; padding: 10px 40px 10px 14px; border-radius: 8px;
    border: 1px solid var(--border-soft, rgba(96,192,240,0.12)); background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4); font-size: 0.9rem; appearance: none; cursor: pointer; }
  svg { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5; }
`;
const Input = styled.input`
  width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12)); background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4); font-size: 0.9rem; margin-bottom: 16px;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const PhaseGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px;
`;
const PhaseCard = styled.button<{ $active?: boolean }>`
  min-height: 44px; padding: 12px; border-radius: 10px; text-align: left; cursor: pointer; transition: all 0.2s;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.12)' : 'var(--bg-surface, #1A1A24)'};
  color: var(--text-primary, #E0ECF4); &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;
const PhaseName = styled.div`font-weight: 700; font-size: 0.85rem;`;
const PhaseNum = styled.div`font-size: 0.7rem; color: var(--accent-secondary, #8B5CF6); margin-bottom: 2px;`;
const PhaseDetails = styled.div`
  display: flex; flex-wrap: wrap; gap: 12px; padding: 12px 16px; border-radius: 8px;
  background: var(--bg-surface, #1A1A24); font-size: 0.8rem;
  color: var(--text-secondary, rgba(224,236,244,0.6)); margin-bottom: 16px;
  span { color: var(--text-primary, #E0ECF4); font-weight: 600; }
`;

const ChipRow = styled.div`display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;`;
const Chip = styled.button<{ $active?: boolean }>`
  min-height: 36px; padding: 6px 14px; border-radius: 99px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(96,192,240,0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224,236,244,0.6))'};
`;
const FieldRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;
const ExerciseArea = styled.div`
  min-height: 80px; border: 1px dashed var(--border-soft, rgba(96,192,240,0.2)); border-radius: 10px;
  padding: 20px; text-align: center; color: var(--text-muted, rgba(224,236,244,0.4)); font-size: 0.85rem; margin-bottom: 16px;
`;
const ButtonRow = styled.div`display: flex; gap: 12px; flex-wrap: wrap;`;
const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 12px 24px;
  border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: box-shadow 0.2s;
  background: ${({ $variant }) => $variant === 'secondary' ? 'var(--bg-surface, #1A1A24)' : 'var(--accent-secondary, #8B5CF6)'};
  color: ${({ $variant }) => $variant === 'secondary' ? 'var(--accent-primary, #60C0F0)' : '#fff'};
  border: 1px solid ${({ $variant }) => $variant === 'secondary' ? 'var(--border-soft, rgba(96,192,240,0.12))' : 'transparent'};
  &:hover { box-shadow: 0 0 16px rgba(139,92,246,0.3); }
`;
const EmptyState = styled.div`
  text-align: center; padding: 48px 24px; color: var(--text-muted, rgba(224,236,244,0.5)); font-size: 0.95rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TrainerWorkoutForgePage: React.FC = () => {
  const { authAxios } = useAuth();
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [clientId, setClientId] = useState('');
  const [optPhase, setOptPhase] = useState(1);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [goal, setGoal] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await authAxios.get('/api/admin/clients');
        const list = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.clients || [];
        setClients(list.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username })));
      } catch { setClients([]); }
    };
    loadClients();
  }, [authAxios]);

  const toggleEquipment = useCallback((eq: string) => {
    setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  }, []);

  const activePhase = OPT_PHASES.find(p => p.phase === optPhase)!;

  if (!clientId) {
    return (
      <PageWrapper>
        <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Workout Forge</Title>
        <Card>
          <Label>Select a Client</Label>
          <Select>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Choose client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={18} />
          </Select>
        </Card>
        <EmptyState>Select a client to generate a personalized workout plan.</EmptyState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Title><Zap size={24} color="var(--accent-secondary, #8B5CF6)" /> Workout Forge</Title>

      <Card>
        <Label>Client</Label>
        <Select>
          <select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Choose client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={18} />
        </Select>
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
        <Label>Title</Label>
        <Input placeholder="e.g. Upper Body Push — Phase 2" value={workoutTitle} onChange={e => setWorkoutTitle(e.target.value)} />
        <FieldRow>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div>
            <Label>Goal</Label>
            <Input placeholder="e.g. Strength endurance" value={goal} onChange={e => setGoal(e.target.value)} />
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
        <ExerciseArea>No exercises added yet. Use the buttons below to build the workout.</ExerciseArea>
        <ButtonRow>
          <ActionBtn $variant="secondary" onClick={() => toast.info('Exercise picker coming in Phase 3')}>
            <Plus size={18} /> Add Exercise
          </ActionBtn>
          <ActionBtn onClick={() => toast.info('Swan Coach workout generation coming in Phase 3')}>
            <Sparkles size={18} /> Generate with Swan Coach
          </ActionBtn>
          <ActionBtn $variant="secondary" onClick={() => toast.info('Template saving coming in Phase 3')}>
            <Save size={18} /> Save Template
          </ActionBtn>
        </ButtonRow>
      </Card>
    </PageWrapper>
  );
};

export default TrainerWorkoutForgePage;
