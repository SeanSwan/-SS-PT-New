import React, { useMemo } from 'react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import type { BuildMode } from './BootcampBuilderPage.constants';
import { getBootcampCommandDeckModel } from './BootcampCommandDeck.logic';
import {
  AlertChip,
  AlertStrip,
  CommandDeckHeader,
  CommandDeckKicker,
  CommandDeckShell,
  CommandMeter,
  CommandMeterFill,
  CommandScore,
  CommandScoreLine,
  MetricDetail,
  MetricLabel,
  MetricRail,
  MetricSegment,
  MetricValue,
  NextAction,
  ReadinessPill,
} from './BootcampCommandDeck.styles';

interface BootcampCommandDeckProps {
  bootcamp: GeneratedBootcamp;
  buildMode: BuildMode;
  floorMode: boolean;
}

const BootcampCommandDeck: React.FC<BootcampCommandDeckProps> = ({ bootcamp, buildMode, floorMode }) => {
  const model = useMemo(
    () => getBootcampCommandDeckModel(bootcamp, buildMode, floorMode),
    [bootcamp, buildMode, floorMode],
  );
  const hasAlerts = model.missingDemoCount > 0 || model.bottleneckCount > 0;

  return (
    <CommandDeckShell $tone={model.readinessTone} aria-label="Bootcamp launch readiness command deck">
      <CommandDeckHeader>
        <div>
          <CommandDeckKicker>Launch readiness</CommandDeckKicker>
          <CommandScoreLine>
            <CommandScore>{model.readinessScore}%</CommandScore>
            <ReadinessPill>{model.readinessLabel}</ReadinessPill>
          </CommandScoreLine>
          <CommandMeter aria-hidden="true">
            <CommandMeterFill $score={model.readinessScore} />
          </CommandMeter>
        </div>
        <NextAction>
          <strong>Next best action:</strong> {model.nextAction}
        </NextAction>
      </CommandDeckHeader>
      <MetricRail aria-label="Bootcamp readiness metrics">
        {model.metrics.map((metric) => (
          <MetricSegment key={metric.label}>
            <MetricLabel>{metric.label}</MetricLabel>
            <MetricValue>{metric.value}</MetricValue>
            <MetricDetail>{metric.detail}</MetricDetail>
          </MetricSegment>
        ))}
      </MetricRail>
      {hasAlerts && (
        <AlertStrip aria-label="Bootcamp readiness warnings">
          {model.missingDemoCount > 0 && <AlertChip>{model.missingDemoCount} demo video gaps</AlertChip>}
          {model.bottleneckCount > 0 && <AlertChip>{model.bottleneckCount} flow bottleneck{model.bottleneckCount > 1 ? 's' : ''}</AlertChip>}
        </AlertStrip>
      )}
    </CommandDeckShell>
  );
};

export default React.memo(BootcampCommandDeck);
