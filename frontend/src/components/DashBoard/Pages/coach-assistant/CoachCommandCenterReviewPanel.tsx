/**
 * COMPONENT: CoachCommandCenterReviewPanel
 * PURPOSE: Review-tab orchestration for Floor Mode without bloating the mounted page shell.
 *
 * Keeps route-compatible intake, audio, and draft work under the single Review tab while
 * preserving the existing review-gated workspaces and PLAUD upload handoff.
 */
import React from 'react';
import { PlaudMergeWorkspace } from '../../../PlaudClipMerge/PlaudMergeWorkspace';
import type { useCoachCommandCenterController } from './CoachCommandCenter.controller';
import CoachCommandCenterWorkbenchPanel from './CoachCommandCenterWorkbenchPanel';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import type { CoachCommandRole, CoachReviewSection } from './CoachCommandCenter.roleConfig';
import CoachReviewHub from './CoachReviewHub';

type CoachCommandCenterController = ReturnType<typeof useCoachCommandCenterController>;
type SearchParamSetter = (nextInit: URLSearchParams, options?: { replace?: boolean }) => void;

type CoachCommandCenterReviewPanelProps = {
  activeReviewSection: CoachReviewSection | null;
  commandCenter: CoachCommandCenterController;
  draftCount: number;
  intakeCount: number;
  nextActionLabel?: string | null;
  plaudCount: number;
  searchParams: URLSearchParams;
  selectedDisplayLabel: string;
  setActiveReviewSection: (section: CoachReviewSection) => void;
  setSearchParams: SearchParamSetter;
  userRole: CoachCommandRole;
};

const CoachCommandCenterReviewPanel: React.FC<CoachCommandCenterReviewPanelProps> = ({
  activeReviewSection,
  commandCenter,
  draftCount,
  intakeCount,
  nextActionLabel,
  plaudCount,
  searchParams,
  selectedDisplayLabel,
  setActiveReviewSection,
  setSearchParams,
  userRole,
}) => (
  <CoachReviewHub
    activeSection={activeReviewSection}
    draftCount={draftCount}
    intakeCount={intakeCount}
    nextActionLabel={nextActionLabel}
    plaudCount={plaudCount}
    selectedClientName={selectedDisplayLabel}
    onSectionChange={setActiveReviewSection}
    renderAudio={() => (
      <article
        className="panel plaud-review-panel"
        ref={commandCenter.plaudReviewRef}
        tabIndex={-1}
        aria-label="Audio merge review"
      >
        <PlaudMergeWorkspace embedded initialReviewMergeRequestId={commandCenter.initialReviewMergeRequestId} />
      </article>
    )}
    renderDrafts={() => (
      <CoachCommandCenterWorkbenchPanel
        commandCenter={commandCenter}
        searchParams={searchParams}
        selectedClientLabel={selectedDisplayLabel}
        setSearchParams={setSearchParams}
      />
    )}
    renderIntake={() => (
      <CoachIntakeWorkspace
        userRole={userRole}
        selectedClientName={selectedDisplayLabel}
        queue={commandCenter.coachQueue}
        activeIntakeId={commandCenter.activeIntakeId}
      />
    )}
  />
);

export default CoachCommandCenterReviewPanel;