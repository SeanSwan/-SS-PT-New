/**
 * COMPONENT: CoachClientBar
 * PURPOSE: The signature focal point of the Swan Coach terminal — fast client switching.
 *
 * Shows the client currently being coached (large, floor-legible), a one-tap rail of
 * recent client conversations, and a primary "new client / conversation" action.
 * Switching a recent chip loads that client's conversation context (Rule 62: jump to
 * the trainee's next-best-action fast). Presentation only; handlers come from the page.
 */
import React from 'react';
import { Plus, Settings2, Users } from 'lucide-react';

export type RecentCoachClient = {
  id: number;
  label: string;
  active: boolean;
};

type CoachClientBarProps = {
  selectedClientLabel: string;
  recentClients: RecentCoachClient[];
  opsOpen: boolean;
  onSelectClient: (id: number) => void;
  onNewConversation: () => void;
  onOpenOps: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const CoachClientBar: React.FC<CoachClientBarProps> = ({
  selectedClientLabel,
  recentClients,
  opsOpen,
  onSelectClient,
  onNewConversation,
  onOpenOps,
}) => (
  <header className="client-bar glass">
    <div className="client-bar-top">
      <span className="coach-wordmark">Swan Coach</span>
      <button
        type="button"
        className="ops-button"
        onClick={onOpenOps}
        aria-haspopup="dialog"
        aria-expanded={opsOpen}
      >
        <Settings2 size={18} aria-hidden="true" />
        <span>Ops</span>
      </button>
    </div>

    <div className="now-coaching">
      <span className="now-label">Now coaching</span>
      <strong className="client-name">{selectedClientLabel}</strong>
    </div>

    <button type="button" className="new-client-button" onClick={onNewConversation}>
      <Plus size={18} aria-hidden="true" />
      <span>New client / conversation</span>
    </button>

    <div className="recent-rail" role="group" aria-label="Recent client conversations">
      {recentClients.length ? (
        recentClients.map((client) => (
          <button
            type="button"
            key={client.id}
            className={`recent-chip ${client.active ? 'is-active' : ''}`}
            aria-current={client.active ? 'true' : undefined}
            onClick={() => onSelectClient(client.id)}
          >
            <Users size={14} aria-hidden="true" />
            <span className="recent-chip-label">{client.label}</span>
          </button>
        ))
      ) : (
        <span className="recent-empty">No recent clients yet — start a new conversation.</span>
      )}
    </div>
  </header>
);

export default CoachClientBar;
