/**
 * COMPONENT: WorkoutPlannerCommandPanelV2 (S16 — JARVIS blueprint §4.2)
 * PURPOSE: The simplified planner command surface — 6 sections become
 * context bar (client · phase · next-best-action) + one Scope segmented
 * control + one Generate primary + an Advanced sheet. DARK behind
 * `PLANNER_IA_V2` (default OFF); the layout mounts V1 until the flag flips.
 * LAWS: Scope is the ONLY thing that selects the endpoint (via
 * plannerLogic/endpointFor); there is NO Guided/Power view toggle and
 * nothing here writes the generation mode as a view side-effect; the
 * multi-week full-body force-lock is VISIBLE with its reason. Born on
 * `--world-*` tokens with Crystalline fallbacks (ruling A7). Consumes the
 * S15 contexts — zero props, zero fetching.
 */

import React from 'react';
import styled from 'styled-components';
import { ChevronDown, Dumbbell, Loader2, Sparkles } from 'lucide-react';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';
import { OPT_PHASES, PLAN_GOALS, WORKOUT_CATEGORIES, PLAN_DURATIONS, type PlanDuration } from './WorkoutPlannerTypes';
import type { PlannerScope } from './plannerLogic/endpointFor';
import { resolveNextBestAction } from './plannerLogic/resolveNextBestAction';
import { resolveNbaPresentation } from './plannerLogic/resolveNbaPresentation';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';
import WorkoutPlannerGenerationModeSection from './WorkoutPlannerGenerationModeSection';
import WorkoutPlannerTrainingStyleSection from './WorkoutPlannerTrainingStyleSection';
import { Header, HeaderIcon, HeaderLeft, Subtitle, Title } from './WorkoutPlannerShell.styles';

const Bar = styled.section`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 12px 16px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
`;

const NbaChip = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 44px; padding: 0 12px; border-radius: 999px; cursor: pointer;
  background: transparent;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 700;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const ChipSelect = styled.select`
  min-height: 44px; padding: 0 10px; border-radius: 10px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const ScopeGroup = styled.div`
  display: inline-flex; border-radius: 10px; overflow: hidden;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
`;

const ScopeButton = styled.button<{ $active: boolean }>`
  min-height: 44px; padding: 0 14px; border: none; cursor: pointer;
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 18%, var(--world-surface, #030712))'
    : 'var(--world-surface, var(--bg-base, #030712))')};
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: -2px; }
`;

const GenerateButton = styled.button`
  min-height: 44px; padding: 0 22px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: var(--btn-primary-bg, #002060);
  color: var(--button-primary-text, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.84rem; font-weight: 800;
  display: inline-flex; align-items: center; gap: 8px;
  &:hover:not(:disabled) { box-shadow: 0 0 14px color-mix(in srgb, var(--accent-glow, #8B5CF6) 45%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  @media (max-width: 767px) { flex: 1 1 100%; justify-content: center; }
`;

const AdvancedToggle = styled.button`
  min-height: 44px; padding: 0 12px; border-radius: 10px; cursor: pointer;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 700;
  display: inline-flex; align-items: center; gap: 6px;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const AdvancedSheet = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
`;

const FieldRow = styled.label`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 700;
`;

const ForceLockNote = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.76rem;
  color: var(--caution-ember, #d97706);
`;

/** Scope is derived from planDuration; Scope is what the user changes. */
export const scopeForDuration = (duration: PlanDuration): PlannerScope =>
  (duration === 'single' ? 'single' : 'multi_week');

/** Duration is derived from Scope (§4.2) — multi defaults to the primary arc. */
export const durationForScope = (scope: PlannerScope): PlanDuration =>
  (scope === 'single' ? 'single' : '26');

const WorkoutPlannerCommandPanelV2: React.FC = () => {
  const data = usePlannerData();
  const act = usePlannerActions();
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const clientSelectRef = React.useRef<HTMLSelectElement | null>(null);

  const { phaseNumber, category, goal, planDuration, generationMode, sessionsPerWeek } = data.local;
  const { clients, clientsLoading, selectedClientId, clientGenBlocked, isViewerClient } = data.clientState;
  const { generating, generatingPlan } = data.generation;
  const scope = scopeForDuration(planDuration);

  // S16-scope NBA: client-side over already-loaded data (no fetch, no PII —
  // initials only). S23 widens the inputs to schedule + pain flags.
  const nba = React.useMemo(() => resolveNextBestAction({
    // No client selected → force pick_client; roster-wide inputs land in S23.
    roster: selectedClientId === null ? [] : clients.map(c => ({ id: c.id, initials: `${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}` })),
    plans: data.savedPlansState.savedPlans.map(p => ({
      clientId: selectedClientId ?? -1,
      active: isWorkoutPlanActiveStatus(p.status),
    })),
    schedule: [],
    now: Date.now(),
  }), [clients, data.savedPlansState.savedPlans, selectedClientId]);

  // S23: chip copy + tap action come from the pure 6-row table mapper.
  const initialsById = React.useMemo(() => new Map(clients.map(c => [c.id, `${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}`])), [clients]);
  const nbaView = resolveNbaPresentation(nba, initialsById);
  const onNbaTap = () => {
    const action = nbaView.action;
    if (action.kind === 'preselect_client') act.clientState.handleClientSelectionChange(String(action.clientId));
    else if (action.kind === 'preselect_multi_week') {
      act.clientState.handleClientSelectionChange(String(action.clientId));
      if (scope !== 'multi_week') act.pageActions.handlePlanDurationChange(durationForScope('multi_week'));
    }
    // 'open_safety_review': the SafetyGateModal opens itself on a pending 409
    // review — nothing to force here. 'focus_client_picker': below.
    else if (action.kind === 'focus_client_picker') clientSelectRef.current?.focus();
  };

  const setScope = (next: PlannerScope) => {
    if (next !== scope) act.pageActions.handlePlanDurationChange(durationForScope(next));
  };
  const busy = generating || generatingPlan;
  const onGenerate = () => {
    if (scope === 'single') act.requestSwanCoachWorkoutForSelectedClient();
    else act.requestPlanGenerateForSelectedClient();
  };

  return (
    <>
      <Header>
        <HeaderLeft>
          <HeaderIcon><Dumbbell size={22} aria-hidden /></HeaderIcon>
          <div>
            <Title className="lens2-display">Workout Planner</Title>
            <Subtitle>Build intelligent programs while the exercise library stays within reach.</Subtitle>
          </div>
        </HeaderLeft>
      </Header>
      <Bar aria-label="Planner context">
        <ChipSelect
          ref={clientSelectRef}
          aria-label="Select client"
          value={selectedClientId ?? ''}
          disabled={clientsLoading || isViewerClient}
          onChange={e => act.clientState.handleClientSelectionChange(e.target.value)}
        >
          <option value="" disabled>Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
        </ChipSelect>
        <ChipSelect
          aria-label="OPT phase"
          value={phaseNumber}
          onChange={e => act.setters.setPhaseNumber(Number(e.target.value))}
        >
          {OPT_PHASES.map(p => <option key={p.phase} value={p.phase}>Phase {p.phase} · {p.name}</option>)}
        </ChipSelect>
        <NbaChip type="button" data-testid="planner-nba-chip" onClick={onNbaTap}>
          <Sparkles size={14} aria-hidden />{nbaView.copy}
        </NbaChip>
      </Bar>

      <Bar aria-label="Planner scope and generate">
        <ScopeGroup role="group" aria-label="Plan scope">
          <ScopeButton type="button" $active={scope === 'single'} aria-pressed={scope === 'single'} onClick={() => setScope('single')}>
            Single workout
          </ScopeButton>
          <ScopeButton type="button" $active={scope === 'multi_week'} aria-pressed={scope === 'multi_week'} onClick={() => setScope('multi_week')}>
            Multi-week program
          </ScopeButton>
        </ScopeGroup>
        <GenerateButton type="button" disabled={busy || clientGenBlocked || !selectedClientId} onClick={onGenerate}>
          {busy ? <Loader2 size={16} aria-hidden /> : <Sparkles size={16} aria-hidden />}
          {busy ? 'Generating…' : 'Generate'}
        </GenerateButton>
        <AdvancedToggle type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(open => !open)}>
          Advanced <ChevronDown size={14} aria-hidden style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none' }} />
        </AdvancedToggle>
      </Bar>

      {advancedOpen && (
        <AdvancedSheet data-testid="planner-advanced-sheet">
          <FieldRow>
            Category
            <ChipSelect aria-label="Workout category" value={category} disabled={scope === 'multi_week'}
              onChange={e => act.setters.setCategory(e.target.value as typeof category)}>
              {WORKOUT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </ChipSelect>
          </FieldRow>
          {scope === 'multi_week' && (
            <ForceLockNote data-testid="planner-category-force-lock">
              Multi-week programs are full-body — change duration to pick a split.
            </ForceLockNote>
          )}
          <FieldRow>
            Goal
            <ChipSelect aria-label="Plan goal" value={goal} onChange={e => act.setters.setGoal(e.target.value as typeof goal)}>
              {PLAN_GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </ChipSelect>
          </FieldRow>
          {scope === 'multi_week' && (
            <>
              <FieldRow>
                Program length
                <ChipSelect aria-label="Program length" value={planDuration}
                  onChange={e => act.pageActions.handlePlanDurationChange(e.target.value as PlanDuration)}>
                  {PLAN_DURATIONS.filter(d => d.value !== 'single').map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </ChipSelect>
              </FieldRow>
              <FieldRow>
                Sessions / week
                <ChipSelect aria-label="Sessions per week" value={sessionsPerWeek}
                  onChange={e => act.setters.setSessionsPerWeek(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </ChipSelect>
              </FieldRow>
            </>
          )}
          <WorkoutPlannerGenerationModeSection
            generationMode={generationMode}
            onGenerationModeChange={act.setters.setGenerationMode}
          />
          <WorkoutPlannerTrainingStyleSection
            trainingIntensityMode={data.trainingStyle.trainingIntensityMode}
            hardcoreMethod={data.trainingStyle.hardcoreMethod}
            onTrainingIntensityModeChange={act.trainingStyle.handleTrainingIntensityModeChange}
            onHardcoreMethodChange={act.trainingStyle.setHardcoreMethod}
          />
        </AdvancedSheet>
      )}
    </>
  );
};

export default WorkoutPlannerCommandPanelV2;
