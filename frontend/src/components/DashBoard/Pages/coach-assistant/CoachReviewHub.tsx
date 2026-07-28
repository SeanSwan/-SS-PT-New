/**
 * COMPONENT: CoachReviewHub
 * PURPOSE: Floor Mode review hub that groups intake, audio, and draft work.
 *
 * SURFACE: Coach Command Center V4 - Floor Mode review panel
 * PRIMARY JOB: Let staff review pending coach work without exposing internal tab nouns.
 * PRIMARY ACTION: Open the next review section.
 * DATA: Consumes the existing intake queue summary and renders existing heavy workspaces only when selected.
 * SAFETY: This component does not save or confirm data; existing review-gated workspaces keep ownership.
 */
import React from 'react';
import { ClipboardCheck, FileAudio, Inbox, Layers3 } from 'lucide-react';
import type { CoachReviewSection } from './CoachCommandCenter.roleConfig';

type CoachReviewHubProps = {
  activeSection: CoachReviewSection | null;
  draftCount?: number;
  intakeCount: number;
  nextActionLabel?: string | null;
  plaudCount: number;
  selectedClientName: string;
  onSectionChange: (section: CoachReviewSection) => void;
  renderAudio: () => React.ReactNode;
  renderDrafts: () => React.ReactNode;
  renderIntake: () => React.ReactNode;
};

type ReviewCard = {
  ariaLabel: string;
  count: number;
  description: string;
  icon: typeof Inbox;
  label: string;
  section: CoachReviewSection;
};

function countLabel(count: number): string {
  if (count <= 0) return 'Clear';
  return `${count} waiting`;
}

function sectionTitle(section: CoachReviewSection): string {
  if (section === 'audio') return 'Audio review';
  if (section === 'drafts') return 'Drafts';
  return 'Intake review';
}

const CoachReviewHub: React.FC<CoachReviewHubProps> = ({
  activeSection,
  draftCount = 0,
  intakeCount,
  nextActionLabel,
  plaudCount,
  selectedClientName,
  onSectionChange,
  renderAudio,
  renderDrafts,
  renderIntake,
}) => {
  const cards: ReviewCard[] = [
    {
      ariaLabel: 'Open intake review',
      count: intakeCount,
      description: 'Client notes, transcripts, and items that need a staff decision.',
      icon: Inbox,
      label: 'Intake',
      section: 'intake',
    },
    {
      ariaLabel: 'Open audio review',
      count: plaudCount,
      description: 'Uploaded audio and synced clips waiting for transcript or merge review.',
      icon: FileAudio,
      label: 'Audio',
      section: 'audio',
    },
    {
      ariaLabel: 'Open drafts',
      count: draftCount,
      description: 'Client setup and staged profile/workout drafts.',
      icon: Layers3,
      label: 'Drafts',
      section: 'drafts',
    },
  ];

  return (
    <div className="tab-scroll" id="coach-tabpanel-review" role="tabpanel" aria-labelledby="coach-tab-review">
      <section className="review-hub panel" aria-label="Coach review hub">
        <div className="review-hub-top">
          <span className="review-eyebrow">Waiting</span>
          <h2>Review</h2>
          <p>{selectedClientName} stays talk-first. Open only the queue you need.</p>
        </div>

        <article className="review-next-card">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>
            <strong>{nextActionLabel || 'Nothing urgent waiting'}</strong>
            <small>Confirm before save stays enforced inside every review flow.</small>
          </span>
        </article>

        <div className="review-card-grid" role="group" aria-label="Review sections">
          {cards.map(({ ariaLabel, count, description, icon: Icon, label, section }) => (
            <button
              type="button"
              className={`review-section-card ${activeSection === section ? 'is-active' : ''}`}
              aria-label={ariaLabel}
              aria-pressed={activeSection === section}
              key={section}
              onClick={() => onSectionChange(section)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <em>{countLabel(count)}</em>
            </button>
          ))}
        </div>
      </section>

      {activeSection ? (
        <section className="review-section-panel" aria-label={sectionTitle(activeSection)}>
          {activeSection === 'audio' ? renderAudio() : activeSection === 'drafts' ? renderDrafts() : renderIntake()}
        </section>
      ) : null}
    </div>
  );
};

export default CoachReviewHub;
