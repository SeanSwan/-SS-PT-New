/**
 * COMPONENT: CoachCommandTabBar
 * PURPOSE: Floor Mode section switcher for the Swan Coach terminal.
 *
 * Talk is the calm default. Review groups intake, audio/PLAUD, and draft
 * workbench queues behind one trainer-floor concept; History exposes old threads.
 */
import React from 'react';
import { ClipboardCheck, History, Mic } from 'lucide-react';

export type CoachTab = 'talk' | 'review' | 'history';

type CoachCommandTabBarProps = {
  activeTab: CoachTab;
  onTabChange: (tab: CoachTab) => void;
  tabs?: CoachTab[];
  intakeCount?: number;
  plaudCount?: number;
};

const TABS: { id: CoachTab; label: string; Icon: typeof Mic }[] = [
  { id: 'talk', label: 'Talk', Icon: Mic },
  { id: 'review', label: 'Review', Icon: ClipboardCheck },
  { id: 'history', label: 'History', Icon: History },
];

function reviewBadge(tab: CoachTab, intakeCount?: number, plaudCount?: number): string | null {
  if (tab !== 'review') return null;
  const count = Math.max(0, Number(intakeCount || 0)) + Math.max(0, Number(plaudCount || 0));
  if (!count) return null;
  return count > 99 ? '99+' : String(count);
}

const CoachCommandTabBar: React.FC<CoachCommandTabBarProps> = ({
  activeTab,
  onTabChange,
  tabs,
  intakeCount,
  plaudCount,
}) => (
  <nav className="tab-bar" role="tablist" aria-label="Swan Coach sections">
    {TABS.filter((tab) => !tabs || tabs.includes(tab.id)).map(({ id, label, Icon }) => {
      const badge = reviewBadge(id, intakeCount, plaudCount);
      return (
        <button
          type="button"
          key={id}
          className={`tab-button ${activeTab === id ? 'is-active' : ''}`}
          aria-label={badge ? `${label}, ${badge} waiting` : label}
          aria-controls={`coach-tabpanel-${id}`}
          aria-pressed={activeTab === id}
          aria-selected={activeTab === id}
          id={`coach-tab-${id}`}
          onClick={() => onTabChange(id)}
          role="tab"
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
