/**
 * COMPONENT: CoachCommandTabBar
 * PURPOSE: Section switcher for the Swan Coach terminal.
 *
 * Chat is the default. Intake queue and PLAUD merge review (the heavy ops surfaces)
 * live behind tabs so the default screen stays calm and chat-first; History exposes
 * past conversations. Badges surface pending counts without opening the tab.
 */
import React from 'react';
import { History, Inbox, FileAudio, MessageSquare } from 'lucide-react';

export type CoachTab = 'chat' | 'intake' | 'plaud' | 'history';

type CoachCommandTabBarProps = {
  activeTab: CoachTab;
  onTabChange: (tab: CoachTab) => void;
  intakeCount?: number;
  plaudCount?: number;
};

const TABS: { id: CoachTab; label: string; Icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'intake', label: 'Intake', Icon: Inbox },
  { id: 'plaud', label: 'PLAUD', Icon: FileAudio },
  { id: 'history', label: 'History', Icon: History },
];

function tabBadge(tab: CoachTab, intakeCount?: number, plaudCount?: number): string | null {
  const count = tab === 'intake' ? intakeCount : tab === 'plaud' ? plaudCount : 0;
  if (!count || count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

const CoachCommandTabBar: React.FC<CoachCommandTabBarProps> = ({
  activeTab,
  onTabChange,
  intakeCount,
  plaudCount,
}) => (
  <nav className="tab-bar" aria-label="Swan Coach sections">
    {TABS.map(({ id, label, Icon }) => {
      const badge = tabBadge(id, intakeCount, plaudCount);
      return (
        <button
          type="button"
          key={id}
          className={`tab-button ${activeTab === id ? 'is-active' : ''}`}
          aria-label={badge ? `${label}, ${badge} pending` : label}
          aria-pressed={activeTab === id}
          onClick={() => onTabChange(id)}
        >
          <Icon size={18} aria-hidden="true" />
          <span className="tab-label">{label}</span>
          {badge ? (
            <span className="tab-badge" aria-hidden="true">
              {badge}
            </span>
          ) : null}
        </button>
      );
    })}
  </nav>
);

export default CoachCommandTabBar;
