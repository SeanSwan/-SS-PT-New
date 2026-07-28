/**
 * COMPONENT: CoachClientBar
 * PURPOSE: Compact Floor Mode header for the Swan Coach terminal.
 *
 * The header answers one question first: who is being coached right now? Deeper
 * actions move to History, Review, or More so the trainer-floor view stays calm.
 */
import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';

type CoachClientBarProps = {
  selectedClientLabel: string;
  opsOpen: boolean;
  showOps?: boolean;
  contextLabel?: string;
  newConversationLabel?: string;
  onNewConversation: () => void;
  onOpenOps: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const CoachClientBar: React.FC<CoachClientBarProps> = ({
  selectedClientLabel,
  opsOpen,
  showOps = true,
  contextLabel = 'Now coaching',
  newConversationLabel = 'New chat',
  onNewConversation,
  onOpenOps,
}) => (
  <header className="client-bar glass">
    <div className="now-coaching" aria-label="Current coach context">
      <span className="now-label">{contextLabel}</span>
      <strong className="client-name">{selectedClientLabel}</strong>
    </div>

    <div className="client-bar-tools">
      <button type="button" className="new-client-button" onClick={onNewConversation} aria-label={newConversationLabel}>
        <Plus size={18} aria-hidden="true" />
        <span>New</span>
      </button>
      {showOps ? (
        <button
          type="button"
          className="ops-button"
          onClick={onOpenOps}
          aria-controls="coach-command-ops"
          aria-haspopup="dialog"
          aria-expanded={opsOpen}
          aria-label="More coach actions"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>More</span>
        </button>
      ) : null}
    </div>
  </header>
);

export default CoachClientBar;
