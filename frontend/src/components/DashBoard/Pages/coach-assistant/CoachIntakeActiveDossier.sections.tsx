/**
 * CoachIntakeActiveDossier.sections.tsx
 * =====================================
 * Small presentational sections for the active Coach intake dossier.
 */
import React from 'react';
import {
  GitBranch,
  ListChecks,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import {
  DossierGrid,
  DossierHeader,
  DossierMeta,
  GateCard,
  GateLabel,
  GateValue,
  StatusRibbon,
  StatusRibbonAction,
  StatusRibbonItem,
  StatusRibbonLabel,
  StatusRibbonValue,
  TargetEyebrow,
} from './CoachIntakeWorkspaceTarget.styles';
import {
  HoldReasonCopy,
  HoldReasonDetail,
  HoldReasonFact,
  HoldReasonFacts,
  HoldReasonLabel,
  HoldReasonPanel,
  HoldReasonTitle,
} from './CoachIntakeWorkspaceHoldReason.styles';
import {
  activeReason,
  audioGate,
  blockingGate,
  clientGate,
  intakeSourceLabel,
  intakeTitleLabel,
  plural,
  timeAnchor,
  writeGate,
} from './CoachIntakeActiveDossier.logic';

interface DossierStatusSectionProps {
  item: CoachIntakeItem;
  nextActionId: string;
  nextActionLabel: string;
  statusText: string;
}

function canFocusDossierAction(actionId: string): boolean {
  return actionId === 'confirm-audio' || actionId === 'review-draft';
}
function focusDossierAction(actionId: string): void {
  const target = activeActionElement(actionId);
  if (!target) return;
  scrollToActiveAction(target);
  target.focus({ preventScroll: true });
}

function activeActionElement(actionId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-coach-active-action="${actionId}"]`);
}

function scrollToActiveAction(target: HTMLElement): void {
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export const DossierEyebrow: React.FC = () => (
  <TargetEyebrow>
    <ListChecks size={13} aria-hidden="true" />
    Active review target
  </TargetEyebrow>
);

export const DossierStatusSection: React.FC<DossierStatusSectionProps> = ({
  item,
  nextActionId,
  nextActionLabel,
  statusText,
}) => (
  <StatusRibbon aria-label="Active item status">
    <StatusRibbonItem>
      <StatusRibbonLabel>Why this is active</StatusRibbonLabel>
      <StatusRibbonValue>{activeReason(item, statusText)}</StatusRibbonValue>
    </StatusRibbonItem>
    <StatusRibbonItem>
      <StatusRibbonLabel>Blocking gate</StatusRibbonLabel>
      <StatusRibbonValue>{blockingGate(item)}</StatusRibbonValue>
    </StatusRibbonItem>
    <StatusRibbonItem>
      <StatusRibbonLabel>Time anchor</StatusRibbonLabel>
      <StatusRibbonValue>{timeAnchor(item)}</StatusRibbonValue>
    </StatusRibbonItem>
    <StatusRibbonItem>
      <StatusRibbonLabel>Next action</StatusRibbonLabel>
      <StatusRibbonValue>{nextActionLabel}</StatusRibbonValue>
      {canFocusDossierAction(nextActionId) ? (
        <StatusRibbonAction
          type="button"
          aria-label={`Focus next action: ${nextActionLabel}`}
          onClick={() => focusDossierAction(nextActionId)}
        >
          Focus next action
        </StatusRibbonAction>
      ) : null}
    </StatusRibbonItem>
  </StatusRibbon>
);

interface HoldReasonSectionProps {
  detail: string | null;
  facts: string[];
  label: string | null;
  visible: boolean;
}

function hasHoldReason({ label, visible }: HoldReasonSectionProps) {
  return visible && Boolean(label);
}

const HoldReasonDetailLine: React.FC<{ detail: string | null }> = ({ detail }) => (
  detail ? <HoldReasonDetail>{detail}</HoldReasonDetail> : null
);

const HoldReasonFactList: React.FC<{ facts: string[] }> = ({ facts }) => {
  if (facts.length === 0) return null;

  return (
    <HoldReasonFacts aria-label="Hold reason facts">
      {facts.map((fact) => <HoldReasonFact key={fact}>{fact}</HoldReasonFact>)}
    </HoldReasonFacts>
  );
};

export const HoldReasonSection: React.FC<HoldReasonSectionProps> = ({
  detail,
  facts,
  label,
  visible,
}) => {
  if (!hasHoldReason({ detail, facts, label, visible })) return null;

  return (
    <HoldReasonPanel aria-label="Hold reason">
      <HoldReasonCopy>
        <HoldReasonLabel>Hold reason</HoldReasonLabel>
        <HoldReasonTitle>{label}</HoldReasonTitle>
        <HoldReasonDetailLine detail={detail} />
      </HoldReasonCopy>
      <HoldReasonFactList facts={facts} />
    </HoldReasonPanel>
  );
};

interface DossierIdentitySectionProps {
  item: CoachIntakeItem;
  statusText: string;
}

export const DossierIdentitySection: React.FC<DossierIdentitySectionProps> = ({
  item,
  statusText,
}) => (
  <DossierHeader>
    <div>
      <DossierMeta>Review dossier</DossierMeta>
      <h3>{intakeTitleLabel(item)}</h3>
      <p>{intakeSourceLabel(item)} - {statusText}</p>
    </div>
  </DossierHeader>
);

export const DossierGateGrid: React.FC<{ item: CoachIntakeItem; pieces: number }> = ({
  item,
  pieces,
}) => (
  <DossierGrid aria-label="Active intake gates">
    <GateCard>
      <UserRound size={15} aria-hidden="true" />
      <span>
        <GateLabel>Client gate</GateLabel>
        <GateValue>{clientGate(item)}</GateValue>
      </span>
    </GateCard>
    <GateCard>
      <GitBranch size={15} aria-hidden="true" />
      <span>
        <GateLabel>Audio gate</GateLabel>
        <GateValue>{audioGate(item)}</GateValue>
        {pieces > 0 ? <GateValue>{plural(pieces, 'audio piece')}</GateValue> : null}
      </span>
    </GateCard>
    <GateCard>
      <ShieldCheck size={15} aria-hidden="true" />
      <span>
        <GateLabel>Write gate</GateLabel>
        <GateValue>{writeGate(item)}</GateValue>
      </span>
    </GateCard>
  </DossierGrid>
);
