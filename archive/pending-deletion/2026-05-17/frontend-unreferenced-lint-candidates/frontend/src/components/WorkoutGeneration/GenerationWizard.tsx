/**
 * ============================================================================
 * FILE: GenerationWizard.tsx
 * PURPOSE: 4-step confirmation flow before AI workout generation
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-05
 * ============================================================================
 *
 * Steps:
 *   1. Context Form — goals, schedule, equipment, limitations (REQUIRED)
 *   2. Review & Confirm — summary + "this uses more processing power" notice
 *   3. Generating — loading state with NASM context being sent
 *   4. Results — save, regenerate, or edit & regenerate
 *
 * WHY: Each AI workout generation uses 10-20x more tokens than a chat message.
 * The confirmation flow ensures the user provides complete context for the best
 * possible NASM-compliant output, reducing wasted generations.
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Calendar, Clock, Dumbbell, AlertTriangle,
  Brain, ChevronRight, ChevronLeft, Check, Loader2, Edit3,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────

interface GenerationContext {
  goal: string;
  daysPerWeek: number;
  sessionDuration: number;
  equipment: string[];
  injuries: string;
  experienceLevel: string;
  focusAreas: string[];
  specialNotes: string;
}

interface GenerationWizardProps {
  onGenerate: (context: GenerationContext) => Promise<any>;
  onClose?: () => void;
  initialContext?: Partial<GenerationContext>;
}

const GOALS = [
  { value: 'strength', label: 'Build Strength' },
  { value: 'hypertrophy', label: 'Muscle Growth' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'fat-loss', label: 'Fat Loss' },
  { value: 'sport-specific', label: 'Sport-Specific' },
  { value: 'rehab', label: 'Rehab / Corrective' },
  { value: 'general', label: 'General Fitness' },
];

const EQUIPMENT_OPTIONS = [
  'Full Gym', 'Dumbbells Only', 'Barbell + Rack', 'Bodyweight Only',
  'Resistance Bands', 'Kettlebells', 'Cable Machine', 'Home Gym',
  'Outdoor / Park', 'TRX / Suspension',
];

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body',
];

const DURATIONS = [15, 30, 45, 60, 75, 90];

// ─── Component ──────────────────────────────────────────────────

const GenerationWizard: React.FC<GenerationWizardProps> = ({
  onGenerate, onClose, initialContext,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [context, setContext] = useState<GenerationContext>({
    goal: initialContext?.goal || '',
    daysPerWeek: initialContext?.daysPerWeek || 3,
    sessionDuration: initialContext?.sessionDuration || 45,
    equipment: initialContext?.equipment || [],
    injuries: initialContext?.injuries || '',
    experienceLevel: initialContext?.experienceLevel || 'intermediate',
    focusAreas: initialContext?.focusAreas || [],
    specialNotes: initialContext?.specialNotes || '',
  });

  const updateField = useCallback(<K extends keyof GenerationContext>(
    key: K, value: GenerationContext[K]
  ) => {
    setContext(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayItem = useCallback((key: 'equipment' | 'focusAreas', item: string) => {
    setContext(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item],
    }));
  }, []);

  const isStep1Valid = context.goal && context.equipment.length > 0;

  const handleGenerate = useCallback(async () => {
    setStep(3);
    setError(null);
    try {
      const res = await onGenerate(context);
      setResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err?.message || 'Generation failed. Please try again.');
      setStep(2);
    }
  }, [context, onGenerate]);

  return (
    <WizardContainer>
      <StepIndicator>
        {[1, 2, 3, 4].map(s => (
          <StepDot key={s} $active={step >= s} $current={step === s} />
        ))}
      </StepIndicator>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepContent key="step1" as={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StepTitle><Target size={20} /> Tell Us About Your Workout</StepTitle>

            <FieldGroup>
              <Label>What's your goal?</Label>
              <ChipRow>
                {GOALS.map(g => (
                  <Chip key={g.value} $active={context.goal === g.value} onClick={() => updateField('goal', g.value)}>
                    {g.label}
                  </Chip>
                ))}
              </ChipRow>
            </FieldGroup>

            <FieldRow>
              <FieldGroup>
                <Label><Calendar size={14} /> Days per week</Label>
                <NumberRow>
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <NumberChip key={d} $active={context.daysPerWeek === d} onClick={() => updateField('daysPerWeek', d)}>
                      {d}
                    </NumberChip>
                  ))}
                </NumberRow>
              </FieldGroup>
              <FieldGroup>
                <Label><Clock size={14} /> Session length</Label>
                <NumberRow>
                  {DURATIONS.map(d => (
                    <NumberChip key={d} $active={context.sessionDuration === d} onClick={() => updateField('sessionDuration', d)}>
                      {d}m
                    </NumberChip>
                  ))}
                </NumberRow>
              </FieldGroup>
            </FieldRow>

            <FieldGroup>
              <Label><Dumbbell size={14} /> Available equipment</Label>
              <ChipRow>
                {EQUIPMENT_OPTIONS.map(e => (
                  <Chip key={e} $active={context.equipment.includes(e)} onClick={() => toggleArrayItem('equipment', e)}>
                    {e}
                  </Chip>
                ))}
              </ChipRow>
            </FieldGroup>

            <FieldGroup>
              <Label>Experience level</Label>
              <ChipRow>
                {['beginner', 'intermediate', 'advanced'].map(l => (
                  <Chip key={l} $active={context.experienceLevel === l} onClick={() => updateField('experienceLevel', l)}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </Chip>
                ))}
              </ChipRow>
            </FieldGroup>

            <FieldGroup>
              <Label>Focus areas (optional)</Label>
              <ChipRow>
                {MUSCLE_GROUPS.map(m => (
                  <Chip key={m} $active={context.focusAreas.includes(m)} onClick={() => toggleArrayItem('focusAreas', m)}>
                    {m}
                  </Chip>
                ))}
              </ChipRow>
            </FieldGroup>

            <FieldGroup>
              <Label><AlertTriangle size={14} /> Injuries or limitations (optional)</Label>
              <TextInput
                value={context.injuries}
                onChange={e => updateField('injuries', e.target.value)}
                placeholder="e.g., Left knee ACL recovery, shoulder impingement..."
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Special notes (optional)</Label>
              <TextInput
                value={context.specialNotes}
                onChange={e => updateField('specialNotes', e.target.value)}
                placeholder="e.g., Preparing for a golf tournament, prefer supersets..."
              />
            </FieldGroup>

            <ButtonRow>
              {onClose && <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>}
              <PrimaryBtn onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Review <ChevronRight size={16} />
              </PrimaryBtn>
            </ButtonRow>
          </StepContent>
        )}

        {step === 2 && (
          <StepContent key="step2" as={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StepTitle><Brain size={20} /> Review Your Workout Request</StepTitle>

            <ReviewCard>
              <ReviewRow><ReviewLabel>Goal</ReviewLabel><ReviewValue>{context.goal}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Schedule</ReviewLabel><ReviewValue>{context.daysPerWeek} days/week, {context.sessionDuration} min</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Equipment</ReviewLabel><ReviewValue>{context.equipment.join(', ')}</ReviewValue></ReviewRow>
              <ReviewRow><ReviewLabel>Experience</ReviewLabel><ReviewValue>{context.experienceLevel}</ReviewValue></ReviewRow>
              {context.focusAreas.length > 0 && (
                <ReviewRow><ReviewLabel>Focus</ReviewLabel><ReviewValue>{context.focusAreas.join(', ')}</ReviewValue></ReviewRow>
              )}
              {context.injuries && (
                <ReviewRow><ReviewLabel>Limitations</ReviewLabel><ReviewValue>{context.injuries}</ReviewValue></ReviewRow>
              )}
              {context.specialNotes && (
                <ReviewRow><ReviewLabel>Notes</ReviewLabel><ReviewValue>{context.specialNotes}</ReviewValue></ReviewRow>
              )}
            </ReviewCard>

            <InfoBanner>
              <Brain size={16} />
              <span>
                Workout generation uses NASM OPT protocols to create a personalized, periodized plan.
                This uses more processing power than a chat message — make sure your details are complete.
              </span>
            </InfoBanner>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <ButtonRow>
              <SecondaryBtn onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Edit
              </SecondaryBtn>
              <PrimaryBtn onClick={handleGenerate}>
                <Dumbbell size={16} /> Generate My Workout
              </PrimaryBtn>
            </ButtonRow>
          </StepContent>
        )}

        {step === 3 && (
          <StepContent key="step3" as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <LoadingState>
              <Spinner><Loader2 size={40} /></Spinner>
              <LoadingTitle>Generating Your NASM Workout</LoadingTitle>
              <LoadingSubtitle>
                Analyzing your goals, equipment, and experience level using
                NASM OPT periodization protocols...
              </LoadingSubtitle>
            </LoadingState>
          </StepContent>
        )}

        {step === 4 && result && (
          <StepContent key="step4" as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StepTitle><Check size={20} /> Your Workout Plan</StepTitle>

            <ResultCard>
              <pre>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            </ResultCard>

            <ButtonRow>
              <SecondaryBtn onClick={() => { setStep(1); setResult(null); }}>
                <Edit3 size={16} /> Edit & Regenerate
              </SecondaryBtn>
              <PrimaryBtn onClick={onClose}>
                <Check size={16} /> Save to My Workouts
              </PrimaryBtn>
            </ButtonRow>
          </StepContent>
        )}
      </AnimatePresence>
    </WizardContainer>
  );
};

export default GenerationWizard;

// ─── Animations ─────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────

const WizardContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const StepDot = styled.div<{ $active: boolean; $current: boolean }>`
  width: ${({ $current }) => $current ? '2rem' : '0.5rem'};
  height: 0.5rem;
  border-radius: 0.25rem;
  background: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.15)'};
  transition: all 0.3s;
`;

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const StepTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const Label = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(224, 236, 244, 0.7);
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.15)' : 'rgba(20, 20, 25, 0.6)'};
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.6)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { border-color: #60C0F0; }
`;

const NumberRow = styled.div`
  display: flex;
  gap: 0.375rem;
`;

const NumberChip = styled(Chip)`
  padding: 0.375rem 0.75rem;
  min-width: 44px;
  justify-content: center;
`;

const TextInput = styled.textarea`
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(224, 236, 244, 0.15);
  background: rgba(20, 20, 25, 0.6);
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  resize: vertical;
  min-height: 60px;
  &:focus {
    outline: none;
    border-color: #60C0F0;
    box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.15);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`;

const PrimaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  background: #002060;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
  &:hover:not(:disabled) { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SecondaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(224, 236, 244, 0.15);
  background: transparent;
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  &:hover { border-color: rgba(224, 236, 244, 0.3); }
`;

const ReviewCard = styled.div`
  background: rgba(20, 20, 25, 0.8);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ReviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const ReviewLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.5);
  flex-shrink: 0;
  min-width: 80px;
`;

const ReviewValue = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: #E0ECF4;
  text-align: right;
`;

const InfoBanner = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  line-height: 1.5;
  svg { flex-shrink: 0; color: #60C0F0; margin-top: 2px; }
`;

const ErrorBanner = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
`;

const Spinner = styled.div`
  color: #60C0F0;
  animation: ${spin} 1.5s linear infinite;
  margin-bottom: 1.5rem;
`;

const LoadingTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: #E0ECF4;
  margin: 0 0 0.5rem;
`;

const LoadingSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
  max-width: 400px;
`;

const ResultCard = styled.div`
  background: rgba(20, 20, 25, 0.8);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 1rem;
  padding: 1.5rem;
  max-height: 500px;
  overflow-y: auto;

  pre {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    color: rgba(224, 236, 244, 0.8);
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }
`;
