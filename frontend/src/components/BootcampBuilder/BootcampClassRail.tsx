/**
 * ============================================================================
 * COMPONENT: BootcampClassRail
 * PURPOSE: One continuous Build -> Preflight -> Run operating spine.
 * DATA: GeneratedBootcamp only; persistence remains owned by useBootcampAPI.
 * ACCESSIBILITY: Step navigation, live status, 44px controls, reduced motion.
 * ============================================================================
 */
import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Hammer, Play, ShieldCheck } from 'lucide-react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import type { BuildMode, BootcampWorkflowStage } from './BootcampBuilderPage.constants';
import { getBootcampClassRailModel } from './BootcampClassRail.logic';
import {
  FactLabel,
  FactRail,
  FactValue,
  IssueChip,
  IssueRail,
  PrimaryAction,
  RailBody,
  RailHeader,
  RailKicker,
  RailShell,
  RailStatus,
  StageButton,
  StageCopy,
  StageIcon,
  StageLabel,
  StageRail,
} from './BootcampClassRail.styles';

interface BootcampClassRailProps {
  bootcamp: GeneratedBootcamp | null;
  buildMode: BuildMode;
  activeStage: BootcampWorkflowStage;
  onStageChange: (stage: BootcampWorkflowStage) => void;
}

const STAGE_ICONS = {
  build: Hammer,
  preflight: ShieldCheck,
  run: Play,
} as const;

const BootcampClassRail: React.FC<BootcampClassRailProps> = ({
  bootcamp,
  buildMode,
  activeStage,
  onStageChange,
}) => {
  const model = useMemo(
    () => getBootcampClassRailModel(bootcamp, activeStage),
    [activeStage, bootcamp],
  );
  const hasIssues = model.hardBlockers.length > 0 || model.warnings.length > 0;

  return (
    <RailShell aria-label="Bootcamp class workflow">
      <RailHeader>
        <div>
          <RailKicker>Crystalline Class Rail</RailKicker>
          <RailStatus aria-live="polite">
            {model.hardBlockers.length === 0 && bootcamp && <CheckCircle2 size={15} aria-hidden="true" />}
            {model.statusLabel}
            {bootcamp ? ' · ' + (buildMode === 'ai' ? 'Swan Coach' : buildMode) : ''}
          </RailStatus>
          {activeStage === 'run' && model.warnings.length > 0 && (
            <IssueChip as="div" $tone="warning" aria-live="polite">
              <AlertTriangle size={14} aria-hidden="true" />
              {model.warnings.length} {model.warnings.length === 1 ? 'warning' : 'warnings'} carried into Run
            </IssueChip>
          )}
        </div>
        <PrimaryAction
          type="button"
          disabled={model.primaryAction.disabled}
          onClick={() => {
            if (model.primaryAction.targetStage) onStageChange(model.primaryAction.targetStage);
          }}
        >
          {model.primaryAction.label}
          {!model.primaryAction.disabled && <ArrowRight size={16} aria-hidden="true" />}
        </PrimaryAction>
      </RailHeader>

      {activeStage !== 'run' && (
        <RailBody>
        <StageRail aria-label="Class workflow stages">
          {model.stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.id];
            const active = stage.id === activeStage;
            return (
              <StageButton
                key={stage.id}
                type="button"
                $active={active}
                disabled={!stage.available}
                aria-current={active ? 'step' : undefined}
                onClick={() => onStageChange(stage.id)}
              >
                <StageIcon $active={active}><Icon size={17} aria-hidden="true" /></StageIcon>
                <StageCopy>
                  <StageLabel>{stage.label}</StageLabel>
                  <span>{stage.eyebrow}</span>
                </StageCopy>
              </StageButton>
            );
          })}
        </StageRail>

        <FactRail $compact={model.stationDensity === 'compact'} aria-label="Class truth">
          {model.facts.map((fact) => (
            <div key={fact.label}>
              <FactLabel>{fact.label}</FactLabel>
              <FactValue>{fact.value}</FactValue>
            </div>
          ))}
        </FactRail>
        </RailBody>
      )}

      {activeStage !== 'run' && hasIssues && (
        <IssueRail aria-label="Preflight facts">
          {model.hardBlockers.map((blocker) => (
            <IssueChip key={blocker} $tone="blocker">
              <AlertTriangle size={14} aria-hidden="true" /> {blocker}
            </IssueChip>
          ))}
          {model.warnings.map((warning) => (
            <IssueChip key={warning} $tone="warning">
              <AlertTriangle size={14} aria-hidden="true" /> {warning}
            </IssueChip>
          ))}
        </IssueRail>
      )}
    </RailShell>
  );
};

export default React.memo(BootcampClassRail);
