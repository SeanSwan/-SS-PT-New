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
import { Link } from 'react-router-dom';
import { CalendarCheck, ClipboardList, FileAudio, Inbox, Plus, Settings2, UserPlus, Users, type LucideIcon } from 'lucide-react';

import type { CoachHeaderQuickAction, CoachHeaderQuickActionIcon } from './CoachCommandHeaderActions';

export type RecentCoachClient = {
  id: number;
  label: string;
  active: boolean;
};

type CoachClientBarProps = {
  selectedClientLabel: string;
  recentClients: RecentCoachClient[];
  quickActions?: CoachHeaderQuickAction[];
  opsOpen: boolean;
  showOps?: boolean;
  contextLabel?: string;
  newConversationLabel?: string;
  recentLabel?: string;
  onSelectClient: (id: number) => void;
  onNewConversation: () => void;
  onOpenOps: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const QUICK_ACTION_ICONS: Record<CoachHeaderQuickActionIcon, LucideIcon> = {
  builder: ClipboardList,
  client: UserPlus,
  intake: Inbox,
  log: CalendarCheck,
  plaud: FileAudio,
};

function QuickActionContent({ action }: { action: CoachHeaderQuickAction }) {
  const Icon = QUICK_ACTION_ICONS[action.icon];

  return (
    <>
      <Icon size={16} aria-hidden="true" />
      <span>
        <strong>{action.label}</strong>
        <small>{action.detail}</small>
      </span>
    </>
  );
}

function QuickActionControl({ action }: { action: CoachHeaderQuickAction }) {
  const className = `client-action-button ${action.tone === 'primary' ? 'is-primary' : ''}`;

  if (action.href) {
    return (
      <Link className={className} to={action.href} aria-label={action.ariaLabel}>
        <QuickActionContent action={action} />
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick} aria-label={action.ariaLabel}>
      <QuickActionContent action={action} />
    </button>
  );
}

const CoachClientBar: React.FC<CoachClientBarProps> = ({
  selectedClientLabel,
  recentClients,
  quickActions = [],
  opsOpen,
  showOps = true,
  contextLabel = 'Now coaching',
  newConversationLabel = 'New client / conversation',
  recentLabel = 'Recent client conversations',
  onSelectClient,
  onNewConversation,
  onOpenOps,
}) => (
  <header className="client-bar glass">
    <div className="client-bar-top">
      <span className="coach-wordmark">Swan Coach</span>
      {showOps ? (
        <button
          type="button"
          className="ops-button"
          onClick={onOpenOps}
          aria-controls="coach-command-ops"
          aria-haspopup="dialog"
          aria-expanded={opsOpen}
        >
          <Settings2 size={18} aria-hidden="true" />
          <span>Operations</span>
        </button>
      ) : null}
    </div>

    <div className="now-coaching">
      <span className="now-label">{contextLabel}</span>
      <strong className="client-name">{selectedClientLabel}</strong>
    </div>

    <button type="button" className="new-client-button" onClick={onNewConversation}>
      <Plus size={18} aria-hidden="true" />
      <span>{newConversationLabel}</span>
    </button>

    {quickActions.length ? (
      <div className="client-action-strip" role="group" aria-label="Coach header quick actions">
        <span className="client-action-scope">{selectedClientLabel}</span>
        {quickActions.map((action) => (
          <QuickActionControl action={action} key={action.ariaLabel} />
        ))}
      </div>
    ) : null}

    <div className="recent-rail" role="group" aria-label={recentLabel}>
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
