import React from 'react';

import { PlaudMergeWorkspace } from '../../../PlaudClipMerge/PlaudMergeWorkspace';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import {
  CommandBanner,
  IntakeContextGrid,
  QueueSummary,
  nextOperatorLabel,
  parsingProgress,
} from './CoachCommandOverviewPanels';
import type {
  CoachQueueSummaryView,
  DossierTile,
  IntakeStateTile,
  QueueMetric,
} from './CoachCommandCenter.types';

type CoachCommandOverviewProps = {
  activeIntakeId: string | null;
  coachQueue: React.ComponentProps<typeof CoachIntakeWorkspace>['queue'];
  dossierTiles: DossierTile[];
  initialReviewMergeRequestId?: string;
  intakeStates: IntakeStateTile[];
  plaudReviewRef: React.RefObject<HTMLElement>;
  selectedClientLabel: string;
  statusMetrics: QueueMetric[];
  summary: CoachQueueSummaryView;
  onCommandPrompt: (prompt: string) => void;
  onReadback: () => void;
  onToggleTeachMode: () => void;
};

const CoachCommandOverview: React.FC<CoachCommandOverviewProps> = ({
  activeIntakeId,
  coachQueue,
  dossierTiles,
  initialReviewMergeRequestId,
  intakeStates,
  plaudReviewRef,
  selectedClientLabel,
  statusMetrics,
  summary,
  onCommandPrompt,
  onReadback,
  onToggleTeachMode,
}) => {
  const nextActionLabel = nextOperatorLabel(coachQueue.health?.nextOperatorAction?.label);
  const progress = parsingProgress(summary.processing);

  return (
    <>
      <CommandBanner
        nextActionLabel={nextActionLabel}
        onCommandPrompt={onCommandPrompt}
        onReadback={onReadback}
        onToggleTeachMode={onToggleTeachMode}
      />
      <QueueSummary statusMetrics={statusMetrics} />
      <IntakeContextGrid
        dossierTiles={dossierTiles}
        intakeStates={intakeStates}
        progress={progress}
        summary={summary}
      />

    <section className="live-intake-grid" aria-label="Unified PLAUD and Coach intake queue">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Unified PLAUD and Coach intake queue</h2>
          <p className="panel-subtitle">
            Coach intake, PLAUD clips, transcript uploads, attachments, holds, and approvals stay in one operator flow.
          </p>
        </div>
        <span className="mini-chip cyan">{nextActionLabel}</span>
      </div>

      <div className="live-workspace-panel">
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={selectedClientLabel}
          onCommandPrompt={onCommandPrompt}
          queue={coachQueue}
          activeIntakeId={activeIntakeId}
        />
      </div>

      <article className="panel plaud-review-panel" ref={plaudReviewRef} tabIndex={-1} aria-label="PLAUD audio merge review">
        <div className="section-title-row">
          <div>
            <h2 className="panel-title">PLAUD/audio merge review</h2>
            <p className="panel-subtitle">
              Existing clip ordering and merge approval workflow, embedded in the Command Center instead of a duplicate admin tab.
            </p>
          </div>
          <span className="status-pill hold">operator approval required</span>
        </div>
        <div className="plaud-merge-frame">
          <PlaudMergeWorkspace embedded initialReviewMergeRequestId={initialReviewMergeRequestId} />
        </div>
      </article>
    </section>

    </>
  );
};

export default CoachCommandOverview;
