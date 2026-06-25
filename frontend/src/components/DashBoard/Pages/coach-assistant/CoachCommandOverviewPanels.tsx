/**
 * COMPONENT: CoachCommandOverviewPanels
 * PURPOSE: Branch-light summary panels for the Coach Command Center overview.
 */
import React from 'react';
import { AlertTriangle, Brain, Volume2 } from 'lucide-react';
import type {
  CoachQueueSummaryView,
  DossierTile,
  IntakeStateTile,
  QueueMetric,
} from './CoachCommandCenter.types';

type CommandBannerProps = {
  nextActionLabel: string;
  onReadback: () => void;
  onToggleTeachMode: () => void;
};

type QueueSummaryProps = {
  statusMetrics: QueueMetric[];
};

type ActiveDossierPanelProps = {
  dossierTiles: DossierTile[];
  progress: string;
  summary: CoachQueueSummaryView;
};

type IntakeHoldsPanelProps = {
  intakeStates: IntakeStateTile[];
};

export function nextOperatorLabel(label?: string | null) {
  return label || 'Review next intake';
}

export function parsingProgress(processing: number) {
  if (processing > 0) return '72%';
  return '8%';
}

export function CommandBanner({ nextActionLabel, onReadback, onToggleTeachMode }: CommandBannerProps) {
  return (
    <section className="command-banner glass">
      <div className="banner-content">
        <div className="banner-copy">
          <div className="banner-top">
            <span className="mini-chip cyan">review-gated operator console</span>
            <span className="mini-chip gold">final writes require approval</span>
          </div>
          <h1>Swan Coach Command Center</h1>
          <p>
            Work from live intake, client context, prepared drafts, and approval holds. Swan Coach prepares
            the reasoning packet; the operator approves the final write.
          </p>
          <div className="utility-actions">
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
        <aside className="next-workflow-panel" aria-label="Operator next workflow">
          <span className="panel-subtitle">Operator next workflow</span>
          <strong>{nextActionLabel}</strong>
          <p className="small-copy">
Open the intake queue or prepared-draft review, then approve only from the review panel. This does not write client data by itself.
          </p>
        </aside>
      </div>
    </section>
  );
}

export function QueueSummary({ statusMetrics }: QueueSummaryProps) {
  return (
    <section className="queue-summary" aria-label="Coach intake queue health">
      {statusMetrics.map((metric) => (
        <article className="metric-card" style={{ '--accent-fill': metric.accent } as React.CSSProperties} key={metric.label}>
          <span className="panel-subtitle">{metric.label}</span>
          <strong className="metric-value">{metric.value}</strong>
          <span className="metric-note">{metric.note}</span>
        </article>
      ))}
    </section>
  );
}

function ActiveDossierPanel({ dossierTiles, progress, summary }: ActiveDossierPanelProps) {
  return (
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
        <span className="progress-fill" style={{ '--progress': progress } as React.CSSProperties} />
      </div>
    </article>
  );
}

function IntakeHoldsPanel({ intakeStates }: IntakeHoldsPanelProps) {
  return (
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
  );
}

export function IntakeContextGrid({
  dossierTiles,
  intakeStates,
  progress,
  summary,
}: ActiveDossierPanelProps & IntakeHoldsPanelProps) {
  return (
    <section className="content-grid">
      <ActiveDossierPanel dossierTiles={dossierTiles} progress={progress} summary={summary} />
      <IntakeHoldsPanel intakeStates={intakeStates} />
    </section>
  );
}
