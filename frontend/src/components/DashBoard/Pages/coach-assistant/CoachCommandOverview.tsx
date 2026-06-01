import React from 'react';
import { AlertTriangle, Brain, FileAudio, Volume2 } from 'lucide-react';

import { PlaudMergeWorkspace } from '../../../PlaudClipMerge/PlaudMergeWorkspace';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { COMMAND_WORKFLOWS } from './CoachCommandCenter.data';
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
}) => (
  <>
    <section className="command-banner glass">
      <div className="banner-content">
        <div className="banner-copy">
          <div className="banner-top">
            <span className="mini-chip cyan">review-gated operator console</span>
            <span className="mini-chip gold">final writes require approval</span>
          </div>
          <h1>Swan Coach Command Center</h1>
          <p>
            Command observatory for intake review, PLAUD/audio parsing, prepared drafts, client holds,
            and Teach Mode work. Swan Coach prepares the plan; the operator approves the final write.
          </p>
          <div className="banner-actions">
            <button type="button" className="primary-button" onClick={() => onCommandPrompt('Review next intake')}>
              <FileAudio size={17} aria-hidden="true" />
              Review next intake
            </button>
            <button type="button" className="secondary-button" onClick={onReadback}>
              <Volume2 size={17} aria-hidden="true" />
              Readback dossier
            </button>
            <button type="button" className="ghost-button" onClick={onToggleTeachMode}>
              <Brain size={17} aria-hidden="true" />
              Teach Mode
            </button>
          </div>
        </div>
        <div className="banner-orbit" aria-label="Queue health overview">
          <span className="orbit-core" />
          <div className="orbit-readout">
            intake queue: {summary.actionable}
            <br />
            ready drafts: {summary.preparedDrafts || summary.readyReview}
            <br />
            operator holds: {summary.needsClarification + summary.duplicateHold + summary.needsClient}
          </div>
        </div>
      </div>
    </section>

    <section className="queue-summary" aria-label="Coach intake queue health">
      {statusMetrics.map((metric) => (
        <article className="metric-card" style={{ '--accent-fill': metric.accent } as React.CSSProperties} key={metric.label}>
          <span className="panel-subtitle">{metric.label}</span>
          <strong className="metric-value">{metric.value}</strong>
          <span className="metric-note">{metric.note}</span>
        </article>
      ))}
    </section>

    <section className="content-grid">
      <article className="panel">
        <div className="section-title-row">
          <div>
            <h2 className="panel-title">Active intake dossier</h2>
            <p className="panel-subtitle">PLAUD/audio review, transcript parsing, and selected context.</p>
          </div>
          <span className="status-pill processing">{summary.processing} parsing</span>
        </div>
        <div className="dossier-main">
          {dossierTiles.map((tile) => (
            <div className="dossier-tile" key={tile.label}>
              <span className="panel-subtitle">{tile.label}</span>
              <strong className="tile-value">{tile.value}</strong>
              <span className="small-copy">{tile.note}</span>
            </div>
          ))}
        </div>
        <div className="progress-track" aria-label="Transcript parsing progress">
          <span
            className="progress-fill"
            style={{ '--progress': summary.processing > 0 ? '72%' : '8%' } as React.CSSProperties}
          />
        </div>
      </article>

      <article className="panel">
        <div className="section-title-row">
          <div>
            <h2 className="panel-title">Intake holds</h2>
            <p className="panel-subtitle">Blocked states stay visible before approval.</p>
          </div>
          <AlertTriangle size={20} aria-hidden="true" />
        </div>
        <ul className="state-list">
          {intakeStates.map((state) => (
            <li className="state-item item-row" key={state.label}>
              <span className="item-title">{state.label}</span>
              <span className={`status-pill ${state.tone}`}>{state.value}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>

    <section className="live-intake-grid" aria-label="Unified PLAUD and Coach intake queue">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Unified PLAUD and Coach intake queue</h2>
          <p className="panel-subtitle">
            Coach intake, PLAUD clips, transcript uploads, attachments, holds, and approvals stay in one operator flow.
          </p>
        </div>
        <span className="mini-chip cyan">{coachQueue.health?.nextOperatorAction?.label || 'Review next intake'}</span>
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

    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Start with a workflow</h2>
          <p className="panel-subtitle">Each workflow fills the command dock and waits for operator review.</p>
        </div>
        <span className="mini-chip purple">8 workflows</span>
      </div>
      <div className="workflow-grid">
        {COMMAND_WORKFLOWS.map((workflow) => (
          <button
            type="button"
            className="workflow-card"
            key={workflow.id}
            onClick={() => onCommandPrompt(workflow.prompt)}
          >
            <span className={`mini-chip ${workflow.chip}`}>{workflow.label}</span>
            <strong>{workflow.title}</strong>
            <span>{workflow.copy}</span>
          </button>
        ))}
      </div>
    </section>
  </>
);

export default CoachCommandOverview;
