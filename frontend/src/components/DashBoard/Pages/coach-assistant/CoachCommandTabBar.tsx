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
  draftCount?: number;
};

const TABS: { id: CoachTab; label: string; Icon: typeof Mic }[] = [
  { id: 'talk', label: 'Talk', Icon: Mic },
  { id: 'review', label: 'Review', Icon: ClipboardCheck },
  { id: 'history', label: 'History', Icon: History },
];

function reviewBadge(tab: CoachTab, intakeCount?: number, plaudCount?: number, draftCount?: number): string | null {
  if (tab !== 'review') return null;
  const count = Math.max(0, Number(intakeCount || 0)) + Math.max(0, Number(plaudCount || 0)) + Math.max(0, Number(draftCount || 0));
  if (!count) return null;
  return count > 99 ? '99+' : String(count);
}

const CoachCommandTabBar: React.FC<CoachCommandTabBarProps> = ({
  activeTab,
  onTabChange,
  tabs,
  intakeCount,
  plaudCount,
  draftCount,
}) => {
  const tabRefs = React.useRef<Record<CoachTab, HTMLButtonElement | null>>({
    talk: null,
    review: null,
    history: null,
  });
  const visibleTabs = TABS.filter((tab) => !tabs || tabs.includes(tab.id));
  const visibleIds = visibleTabs.map((tab) => tab.id);

  const focusTab = (tab: CoachTab) => {
    onTabChange(tab);
    window.setTimeout(() => tabRefs.current[tab]?.focus(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: CoachTab) => {
    const index = visibleIds.indexOf(id);
    if (index < 0) return;

    let target: CoachTab | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      target = visibleIds[(index + 1) % visibleIds.length];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      target = visibleIds[(index - 1 + visibleIds.length) % visibleIds.length];
    } else if (event.key === 'Home') {
      target = visibleIds[0];
    } else if (event.key === 'End') {
      target = visibleIds[visibleIds.length - 1];
    }

    if (!target) return;
    event.preventDefault();
    focusTab(target);
  };

  return (
    <nav className="tab-bar" role="tablist" aria-label="Swan Coach sections">
      {visibleTabs.map(({ id, label, Icon }) => {
        const badge = reviewBadge(id, intakeCount, plaudCount, draftCount);
        // Inactive tabpanels are unmounted — only the active tab may
        // reference a panel id, or the aria-controls IDREF dangles.
        return (
          <button
            type="button"
            key={id}
            ref={(node) => {
              tabRefs.current[id] = node;
            }}
            className={`tab-button ${activeTab === id ? 'is-active' : ''}`}
            aria-label={badge ? `${label}, ${badge} waiting` : label}
            aria-controls={activeTab === id ? `coach-tabpanel-${id}` : undefined}
            aria-selected={activeTab === id}
            id={`coach-tab-${id}`}
            onClick={() => onTabChange(id)}
            onKeyDown={(event) => handleKeyDown(event, id)}
            role="tab"
            tabIndex={activeTab === id ? 0 : -1}
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
};

export default CoachCommandTabBar;
