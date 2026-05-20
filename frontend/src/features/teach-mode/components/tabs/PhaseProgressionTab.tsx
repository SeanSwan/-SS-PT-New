/**
 * ============================================================================
 * FILE: PhaseProgressionTab.tsx
 * PURPOSE: OPT phase parameters, progression path, phase compatibility
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: PhaseProgressionTab ──────────────────────┐
 * │ PARENT: TeachModeSidebar                                     │
 * │ PURPOSE: Show OPT phase params, progression chain,           │
 * │   phase compatibility, and exercise prerequisites            │
 * │ Props: { data, phaseNumber, onPhaseChange }                  │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useMemo, memo } from 'react';
import styled from 'styled-components';
import { Zap, TrendingUp, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import type { ExerciseTeachData } from '../../types/TeachModeContracts';

const ensureArray = (val: unknown): unknown[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch { /* fallback to empty progress */ } }
  return [];
};
import { OPT_PHASES } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes';
import { DataRow, DataLabel, DataValue, PhaseBadge, PhaseLabel, PhaseParams } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles';

const PhaseFocus = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  line-height: 1.5;
  margin-bottom: 16px;
`;

const DataRowLast = styled(DataRow)`
  border-bottom: none;
`;

const Section = styled.div<{ $bottom?: number; $top?: number }>`
  margin-top: ${({ $top = 0 }) => $top}px;
  margin-bottom: ${({ $bottom = 20 }) => $bottom}px;
`;

const SectionTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PhaseButtonRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const PhaseButton = styled.button<{ $active: boolean; $enabled: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
  cursor: ${({ $enabled }) => ($enabled ? 'pointer' : 'default')};
  min-height: 44px;
  min-width: 44px;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent)'};
  border: 1px solid ${({ $active }) => $active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
  color: ${({ $active }) => $active
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  transition: all 0.2s ease;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const CompatibilityChip = styled.span<{ $compatible: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  background: ${({ $compatible }) => $compatible
    ? 'color-mix(in srgb, var(--feedback-success, #10B981) 10%, transparent)'
    : 'color-mix(in srgb, var(--feedback-danger, #C92A54) 6%, transparent)'};
  color: ${({ $compatible }) => $compatible
    ? 'var(--feedback-success, #10B981)'
    : 'var(--text-muted, rgba(224,236,244,0.4))'};
`;

const PathStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PathItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 60%, transparent);
  color: var(--text-secondary, rgba(224,236,244,0.7));

  svg {
    color: var(--accent-primary, #60C0F0);
  }
`;

interface PhaseProgressionTabProps {
  data: ExerciseTeachData;
  phaseNumber: number;
  onPhaseChange?: (phase: number) => void;
}

const PhaseProgressionTab: React.FC<PhaseProgressionTabProps> = ({ data, phaseNumber, onPhaseChange }) => {
  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  const optPhases = useMemo(() => ensureArray(data.optPhases) as number[], [data.optPhases]);
  const progressionPath = useMemo(() => ensureArray(data.progressionPath) as string[], [data.progressionPath]);

  const compatiblePhases = useMemo(() => {
    if (optPhases.length > 0) return optPhases;
    return [1, 2, 3, 4, 5]; // Default: compatible with all phases
  }, [optPhases]);

  return (
    <div role="tabpanel" aria-label="Phase & Progression">
      {/* Current Phase Parameters */}
      <PhaseBadge>
        <PhaseLabel>Phase {phase.phase}</PhaseLabel>
        <PhaseParams>{phase.name}</PhaseParams>
      </PhaseBadge>
      <PhaseFocus>{phase.focus}</PhaseFocus>

      <DataRow><DataLabel>Sets</DataLabel><DataValue>{phase.sets}</DataValue></DataRow>
      <DataRow><DataLabel>Reps</DataLabel><DataValue>{phase.reps}</DataValue></DataRow>
      <DataRow><DataLabel>Tempo</DataLabel><DataValue>{phase.tempo}</DataValue></DataRow>
      <DataRow><DataLabel>Rest</DataLabel><DataValue>{phase.rest}</DataValue></DataRow>
      <DataRowLast>
        <DataLabel>Intensity</DataLabel><DataValue>{phase.intensity}</DataValue>
      </DataRowLast>

      {/* Phase Progression Buttons */}
      <Section $top={16}>
        <SectionTitle>
          <Zap size={15} /> Switch Phase
        </SectionTitle>
        <PhaseButtonRow>
          {OPT_PHASES.map(p => (
            <PhaseButton
              key={p.phase}
              type="button"
              onClick={() => onPhaseChange?.(p.phase)}
              title={`Phase ${p.phase}: ${p.name}`}
              $active={p.phase === phaseNumber}
              $enabled={Boolean(onPhaseChange)}
            >
              Ph {p.phase}
            </PhaseButton>
          ))}
        </PhaseButtonRow>
      </Section>

      {/* Phase Compatibility */}
      <Section>
        <SectionTitle>
          <Check size={15} /> Phase Compatibility
        </SectionTitle>
        <ChipRow>
          {[1, 2, 3, 4, 5].map(p => {
            const compatible = compatiblePhases.includes(p);
            return (
              <CompatibilityChip
                key={p}
                $compatible={compatible}
              >
                {compatible ? <Check size={12} /> : <AlertTriangle size={12} />}
                Phase {p}
              </CompatibilityChip>
            );
          })}
        </ChipRow>
      </Section>

      {/* Progression Path */}
      {progressionPath.length > 0 && (
        <Section>
          <SectionTitle>
            <TrendingUp size={15} /> Progression Path
          </SectionTitle>
          <PathStack>
            {progressionPath.map((exerciseId, i) => (
              <PathItem
                key={exerciseId}
              >
                <ChevronRight size={12} />
                Exercise {i + 1}
              </PathItem>
            ))}
          </PathStack>
        </Section>
      )}

      {/* Training Defaults */}
      {(data.defaultTempo || data.defaultRestSeconds) && (
        <div>
          <SectionTitle>
            Exercise Defaults
          </SectionTitle>
          {data.defaultTempo && (
            <DataRow>
              <DataLabel>Default Tempo</DataLabel>
              <DataValue>{data.defaultTempo}</DataValue>
            </DataRow>
          )}
          {data.defaultRestSeconds && (
            <DataRowLast>
              <DataLabel>Default Rest</DataLabel>
              <DataValue>{data.defaultRestSeconds}s</DataValue>
            </DataRowLast>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(PhaseProgressionTab);
