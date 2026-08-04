/**
 * ============================================================================
 * COMPONENT: BootcampRunnerClock
 * PURPOSE: Live class timing band driven by absolute epoch deadlines.
 * PARENT: BootcampDemoMode during the Rail's Run stage.
 * ACCESSIBILITY: Explicit timer role, 56px controls, text plus color states.
 * ============================================================================
 */
import React from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { useBootcampRunner } from './useBootcampRunner';
import {
  ClockAction,
  ClockActions,
  ClockBand,
  ClockCue,
  ClockEnds,
  ClockFace,
  ClockHeader,
  ClockLabel,
  ClockProgress,
  ClockProgressFill,
  ClockShell,
  NextCue,
  SlipBadge,
  StationCue,
  StationCueGrid,
} from './BootcampRunnerClock.styles';

interface BootcampRunnerClockProps {
  bootcamp: GeneratedBootcamp;
}

const formatEndTime = (epochMs: number): string => new Date(epochMs).toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});

const BootcampRunnerClock: React.FC<BootcampRunnerClockProps> = ({ bootcamp }) => {
  const runner = useBootcampRunner(bootcamp);
  const segment = runner.currentSegment;
  const paused = runner.state.status === 'paused';
  const complete = runner.state.status === 'complete';
  const projectionSlipMinutes = complete
    ? 0
    : Math.max(0, Math.ceil((runner.projectedEndsAt - runner.plannedEndsAt) / 60_000));

  return (
    <ClockShell aria-label="Live bootcamp class runner">
      <ClockHeader>
        <div>
          <ClockLabel>{segment?.label ?? 'Class Complete'}</ClockLabel>
          <ClockCue aria-live="polite">{segment?.cue ?? 'Class complete'}</ClockCue>
        </div>
        <ClockEnds>
          <span>Planned End <strong>{formatEndTime(runner.plannedEndsAt)}</strong></span>
          <span>
            Projected End <strong>{formatEndTime(runner.projectedEndsAt)}</strong>
            {projectionSlipMinutes > 0 && <SlipBadge>+{projectionSlipMinutes}m</SlipBadge>}
          </span>
        </ClockEnds>
      </ClockHeader>

      <ClockBand $phase={segment?.phase ?? 'complete'}>
        <ClockFace role="timer" aria-label={complete ? 'Class complete' : runner.remainingLabel}>
          {complete ? 'DONE' : runner.remainingLabel}
        </ClockFace>
        <ClockActions aria-label="Class timer controls">
          <ClockAction
            type="button"
            onClick={paused ? runner.resume : runner.pause}
            disabled={complete}
            aria-label={paused ? 'Resume class timer' : 'Pause class timer'}
          >
            {paused ? <Play size={22} aria-hidden="true" /> : <Pause size={22} aria-hidden="true" />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </ClockAction>
          <ClockAction
            type="button"
            onClick={runner.restart}
            disabled={complete}
            aria-label="Replay current interval"
          >
            <RotateCcw size={20} aria-hidden="true" /> <span>Replay</span>
          </ClockAction>
          <ClockAction
            type="button"
            onClick={runner.skip}
            disabled={complete}
            aria-label="Skip to next interval"
          >
            <SkipForward size={22} aria-hidden="true" /> <span>Skip</span>
          </ClockAction>
        </ClockActions>
      </ClockBand>

      <ClockProgress
        role="progressbar"
        aria-label="Current interval progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(runner.progress * 100)}
      >
        <ClockProgressFill $progress={runner.progress} />
      </ClockProgress>

      {segment?.stationCues.length ? (
        <StationCueGrid $compact={segment.stationCues.length > 4}>
          {segment.stationCues.map((cue, index) => (
            <StationCue key={segment.id + '-' + index}>
              <span>{segment.phase === 'warmup' ? 'ALL' : 'S' + (index + 1)}</span>
              <strong>{cue}</strong>
            </StationCue>
          ))}
        </StationCueGrid>
      ) : null}

      <NextCue>
        Next: <strong>{runner.nextSegment?.cue ?? 'Class complete'}</strong>
      </NextCue>
    </ClockShell>
  );
};

export default React.memo(BootcampRunnerClock);
