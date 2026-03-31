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
import { Zap, TrendingUp, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import type { ExerciseTeachData } from '../../types/TeachModeContracts';
import { OPT_PHASES } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes';
import { DataRow, DataLabel, DataValue, PhaseBadge, PhaseLabel, PhaseParams } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles';

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

  const compatiblePhases = useMemo(() => {
    if (data.optPhases.length > 0) return data.optPhases;
    return [1, 2, 3, 4, 5]; // Default: compatible with all phases
  }, [data.optPhases]);

  return (
    <div role="tabpanel" aria-label="Phase & Progression">
      {/* Current Phase Parameters */}
      <PhaseBadge>
        <PhaseLabel>Phase {phase.phase}</PhaseLabel>
        <PhaseParams>{phase.name}</PhaseParams>
      </PhaseBadge>
      <div style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: '0.78rem',
        color: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
        lineHeight: 1.5,
        marginBottom: 16,
      }}>
        {phase.focus}
      </div>

      <DataRow><DataLabel>Sets</DataLabel><DataValue>{phase.sets}</DataValue></DataRow>
      <DataRow><DataLabel>Reps</DataLabel><DataValue>{phase.reps}</DataValue></DataRow>
      <DataRow><DataLabel>Tempo</DataLabel><DataValue>{phase.tempo}</DataValue></DataRow>
      <DataRow><DataLabel>Rest</DataLabel><DataValue>{phase.rest}</DataValue></DataRow>
      <DataRow style={{ borderBottom: 'none' }}>
        <DataLabel>Intensity</DataLabel><DataValue>{phase.intensity}</DataValue>
      </DataRow>

      {/* Phase Progression Buttons */}
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-primary, #E0ECF4)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Zap size={15} /> Switch Phase
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {OPT_PHASES.map(p => (
            <button
              key={p.phase}
              type="button"
              onClick={() => onPhaseChange?.(p.phase)}
              title={`Phase ${p.phase}: ${p.name}`}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '0.7rem',
                fontFamily: "'Fira Code', monospace",
                cursor: onPhaseChange ? 'pointer' : 'default',
                minHeight: 44,
                minWidth: 44,
                background: p.phase === phaseNumber
                  ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
                  : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent)',
                border: `1px solid ${p.phase === phaseNumber
                  ? 'var(--accent-secondary, #8B5CF6)'
                  : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'}`,
                color: p.phase === phaseNumber
                  ? 'var(--text-primary, #E0ECF4)'
                  : 'var(--text-muted, rgba(224, 236, 244, 0.5))',
                transition: 'all 0.2s ease',
              }}
            >
              Ph {p.phase}
            </button>
          ))}
        </div>
      </div>

      {/* Phase Compatibility */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-primary, #E0ECF4)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Check size={15} /> Phase Compatibility
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(p => {
            const compatible = compatiblePhases.includes(p);
            return (
              <span
                key={p}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 600,
                  background: compatible
                    ? 'color-mix(in srgb, #10B981 10%, transparent)'
                    : 'color-mix(in srgb, #C92A54 6%, transparent)',
                  color: compatible
                    ? '#10B981'
                    : 'var(--text-muted, rgba(224,236,244,0.4))',
                }}
              >
                {compatible ? <Check size={12} /> : <AlertTriangle size={12} />}
                Phase {p}
              </span>
            );
          })}
        </div>
      </div>

      {/* Progression Path */}
      {data.progressionPath.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-primary, #E0ECF4)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <TrendingUp size={15} /> Progression Path
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.progressionPath.map((exerciseId, i) => (
              <div
                key={exerciseId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontFamily: "'Sora', sans-serif",
                  background: 'color-mix(in srgb, var(--bg-surface, #1A1A24) 60%, transparent)',
                  color: 'var(--text-secondary, rgba(224,236,244,0.7))',
                }}
              >
                <ChevronRight size={12} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
                Exercise {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Defaults */}
      {(data.defaultTempo || data.defaultRestSeconds) && (
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-primary, #E0ECF4)',
            marginBottom: 8,
          }}>
            Exercise Defaults
          </div>
          {data.defaultTempo && (
            <DataRow>
              <DataLabel>Default Tempo</DataLabel>
              <DataValue>{data.defaultTempo}</DataValue>
            </DataRow>
          )}
          {data.defaultRestSeconds && (
            <DataRow style={{ borderBottom: 'none' }}>
              <DataLabel>Default Rest</DataLabel>
              <DataValue>{data.defaultRestSeconds}s</DataValue>
            </DataRow>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(PhaseProgressionTab);
