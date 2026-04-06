/**
 * ============================================================================
 * FILE: ClientWorkoutForgePage.tsx
 * PURPOSE: AI workout generation interface for clients with OPT phase selection
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a workout configuration form where clients
 * select OPT phase, goal, equipment, and duration, then request AI-generated
 * workouts. Displays generated workout or a placeholder pending API integration.
 * HOW IT FITS IN THE APP: ClientDashboard → ClientWorkoutForgePage (Workout tab)
 * KEY DECISIONS: NASM OPT phases with accurate rep/set/tempo specs from CLAUDE.md.
 * NASM PROTOCOL CONTEXT: All 5 OPT phases with correct parameters.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientWorkoutForgePage                            ║
 * ║  PURPOSE: AI workout generation with NASM OPT phase config   ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Workout Forge — AI Workout Generator                       │
 * ├──────────────────────────┬─────────────────────────────────┤
 * │ OPT Phase [1-5 selector] │ Goal [dropdown]                 │
 * ├──────────────────────────┴─────────────────────────────────┤
 * │ Equipment: ☑ Bodyweight ☑ Dumbbells ☐ Barbell ☐ Machine   │
 * ├────────────────────────────────────────────────────────────┤
 * │ Duration: [30] [45] [60] [90] min                          │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Generate Workout]                                         │
 * ├────────────────────────────────────────────────────────────┤
 * │ Generated Workout Display / Placeholder                    │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { phase, goal, equipment, duration, generating, result }
 * API Calls: POST /api/mcp/workout/generate
 * Children:  none
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Sparkles, Dumbbell, Timer, Target, Zap, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants — NASM OPT Protocol
// ─────────────────────────────────────────────────────────────

const OPT_PHASES = [
  { id: 1, name: 'Phase 1: Stabilization Endurance', reps: '12-20', sets: '1-3', tempo: '4/2/1', rest: '0-90s', pct: '50-70%' },
  { id: 2, name: 'Phase 2: Strength Endurance', reps: '8-12', sets: '2-4', tempo: '2/0/2', rest: '0-60s', pct: '70-80%' },
  { id: 3, name: 'Phase 3: Hypertrophy', reps: '6-12', sets: '3-5', tempo: '2/0/2', rest: '0-60s', pct: '75-85%' },
  { id: 4, name: 'Phase 4: Maximal Strength', reps: '1-5', sets: '4-6', tempo: 'X/0/X', rest: '3-5min', pct: '85-100%' },
  { id: 5, name: 'Phase 5: Power', reps: '1-5 / 8-10', sets: '3-6', tempo: 'X/0/X', rest: '3-5min', pct: '30-45% / 85-100%' },
];

const GOALS = ['Strength', 'Hypertrophy', 'Weight Loss', 'Endurance', 'General Fitness'];
const EQUIPMENT = ['Bodyweight', 'Dumbbells', 'Barbell', 'Machine', 'Resistance Bands', 'Kettlebell'];
const DURATIONS = [30, 45, 60, 90];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem; min-height: 100%; color: var(--text-primary, #E0ECF4);
  max-width: 800px;
`;

const PageTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem;
  margin: 0 0 0.25rem; display: flex; align-items: center; gap: 0.5rem;
`;

const Subtitle = styled.p`
  color: var(--text-secondary, #94a3b8); font-size: 0.875rem; margin: 0 0 1.5rem;
`;

const FormCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;
`;

const Label = styled.label`
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;
  color: var(--accent-primary, #60C0F0);
`;

const PhaseGrid = styled.div`
  display: flex; flex-direction: column; gap: 0.5rem;
`;

const PhaseOption = styled.button<{ $active: boolean }>`
  min-height: 44px; padding: 0.75rem 1rem; text-align: left;
  border-radius: 8px; cursor: pointer; font-size: 0.8125rem;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.1))'};
  background: ${({ $active }) => $active ? 'rgba(96,192,240,0.08)' : 'var(--bg-surface, #1A1A24)'};
  color: var(--text-primary, #E0ECF4);
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
  span { display: block; font-size: 0.6875rem; color: var(--text-muted, #94a3b8); margin-top: 0.125rem;
         font-family: 'Fira Code', monospace; }
`;

const Select = styled.select`
  width: 100%; min-height: 44px; padding: 0.625rem 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px; color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const CheckboxGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem;
`;

const CheckboxBtn = styled.button<{ $checked: boolean }>`
  min-height: 44px; padding: 0.625rem 0.75rem;
  border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid ${({ $checked }) => $checked ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96,192,240,0.1))'};
  background: ${({ $checked }) => $checked ? 'rgba(139,92,246,0.1)' : 'var(--bg-surface, #1A1A24)'};
  color: var(--text-primary, #E0ECF4);
  transition: border-color 0.2s;
`;

const DurationRow = styled.div`
  display: flex; gap: 0.5rem; flex-wrap: wrap;
`;

const DurationBtn = styled.button<{ $active: boolean }>`
  min-height: 44px; min-width: 64px; padding: 0.625rem 1rem;
  border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.1))'};
  background: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $active }) => $active ? 'var(--bg-base, #030712)' : 'var(--text-primary, #E0ECF4)'};
  transition: all 0.2s;
`;

const GenerateBtn = styled.button`
  min-height: 48px; width: 100%; padding: 0.75rem;
  border-radius: 10px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: #fff; font-weight: 700; font-size: 1rem;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ResultCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--accent-secondary, #8B5CF6);
  border-radius: 12px; padding: 1.5rem; margin-top: 1rem;
  h3 { margin: 0 0 0.75rem; font-family: 'Plus Jakarta Sans', sans-serif; }
`;

const PlaceholderMsg = styled.p`
  color: var(--text-secondary, #94a3b8); font-size: 0.875rem;
  text-align: center; padding: 2rem 0;
`;

const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419); border-left: 4px solid var(--error-accent, #C92A54);
  border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4); font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientWorkoutForgePage: React.FC = () => {
  const { authAxios } = useAuth();
  const [phase, setPhase] = useState(1);
  const [goal, setGoal] = useState(GOALS[0]);
  const [equipment, setEquipment] = useState<string[]>(['Bodyweight']);
  const [duration, setDuration] = useState(45);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleEquip = (item: string) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]);
  };

  const handleGenerate = async () => {
    if (!authAxios) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await authAxios.post('/api/mcp/workout/generate', {
        optPhase: phase, goal, equipment, durationMinutes: duration,
      });
      setResult(res.data?.data || res.data);
    } catch (err: any) {
      // Gracefully handle if endpoint is not yet live
      if (err.response?.status === 404) {
        setResult({ placeholder: true });
      } else {
        setError(err.message || 'Failed to generate workout');
      }
    } finally {
      setGenerating(false);
    }
  };

  const selectedPhase = OPT_PHASES.find(p => p.id === phase)!;

  return (
    <PageWrap>
      <PageTitle><Sparkles size={22} /> Workout Forge</PageTitle>
      <Subtitle>Configure your workout parameters and let AI build your session.</Subtitle>
      {error && <ErrorBox>{error}</ErrorBox>}

      <FormCard>
        <Label><Target size={16} /> NASM OPT Phase</Label>
        <PhaseGrid>
          {OPT_PHASES.map(p => (
            <PhaseOption key={p.id} $active={phase === p.id} onClick={() => setPhase(p.id)}>
              {p.name}
              <span>Reps {p.reps} | Sets {p.sets} | Tempo {p.tempo} | Rest {p.rest} | {p.pct} 1RM</span>
            </PhaseOption>
          ))}
        </PhaseGrid>
      </FormCard>

      <FormCard>
        <Label><Zap size={16} /> Training Goal</Label>
        <Select value={goal} onChange={e => setGoal(e.target.value)}>
          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
        </Select>
      </FormCard>

      <FormCard>
        <Label><Dumbbell size={16} /> Available Equipment</Label>
        <CheckboxGrid>
          {EQUIPMENT.map(e => (
            <CheckboxBtn key={e} $checked={equipment.includes(e)} onClick={() => toggleEquip(e)}>
              {equipment.includes(e) ? <CheckSquare size={16} /> : <Square size={16} />} {e}
            </CheckboxBtn>
          ))}
        </CheckboxGrid>
      </FormCard>

      <FormCard>
        <Label><Timer size={16} /> Duration (minutes)</Label>
        <DurationRow>
          {DURATIONS.map(d => (
            <DurationBtn key={d} $active={duration === d} onClick={() => setDuration(d)}>{d} min</DurationBtn>
          ))}
        </DurationRow>
      </FormCard>

      <GenerateBtn onClick={handleGenerate} disabled={generating || equipment.length === 0}>
        <Sparkles size={18} /> {generating ? 'Generating...' : 'Generate Workout'}
      </GenerateBtn>

      {result && (
        <ResultCard>
          {result.placeholder ? (
            <PlaceholderMsg>Swan Coach workout generation coming soon! Your trainer will configure this feature.</PlaceholderMsg>
          ) : (
            <>
              <h3>Your {selectedPhase.name} Workout</h3>
              <pre style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary, #94a3b8)' }}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </>
          )}
        </ResultCard>
      )}
    </PageWrap>
  );
};

export default ClientWorkoutForgePage;
