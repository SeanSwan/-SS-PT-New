/**
 * ============================================================================
 * FILE: HomeDashboardSearchPanel.tsx
 * PURPOSE: Route-backed command search for the canonical /user-dashboard Home.
 * HOW IT FITS: Opened by the Home top-bar search button; filters first-party
 * dashboard tabs and mounted client routes, then calls the same navigation
 * handlers used by the visible buttons.
 * KEY DECISIONS:
 * - No fake global search backend. Results are local, deterministic, and route
 *   into surfaces that already exist.
 * - The panel is non-modal but keyboard-closeable, with 44px results and focus
 *   handoff when opened.
 * ============================================================================
 */
import React from 'react';
import styled from 'styled-components';
import {
  Activity,
  Aperture,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Dumbbell,
  Image as ImageIcon,
  Info,
  MessageSquare,
  Search,
  Store,
  Trophy,
  Utensils,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { VisionTarget } from './HomeTabVision.data';

interface DashboardSearchEntry {
  label: string;
  detail: string;
  keywords: string;
  Icon: LucideIcon;
  target?: VisionTarget;
  path?: string;
}

export const HOME_DASHBOARD_SEARCH_ITEMS: DashboardSearchEntry[] = [
  { label: 'Progress', detail: 'Workout history and proof', keywords: 'charts workouts training proof progress', Icon: Dumbbell, target: 'progress' },
  { label: 'Messages', detail: 'Trainer communications', keywords: 'inbox messages chat trainer', Icon: MessageSquare, path: '/dashboard/client/messages' },
  { label: 'Notifications', detail: 'Alerts and updates', keywords: 'alerts notifications inbox', Icon: Bell, target: 'notifications' },
  { label: 'Nutrition', detail: 'Meals, macros, and food logs', keywords: 'nutrition meals macros food', Icon: Utensils, target: 'nutrition' },
  { label: 'Reels', detail: 'Training clips and vertical video', keywords: 'reels video clips media', Icon: Video, target: 'reels' },
  { label: 'Friends', detail: 'Community connections', keywords: 'friends community people', Icon: MessageSquare, target: 'friends' },
  { label: 'Challenges', detail: 'Accountability squads and events', keywords: 'challenges trophies party leaderboard', Icon: Trophy, target: 'challenges' },
  { label: 'Photos', detail: 'Transformation photo library', keywords: 'photos gallery transformation progress pictures', Icon: ImageIcon, target: 'photos' },
  { label: 'Creative', detail: 'Studio lenses and gallery tools', keywords: 'creative studio gallery cover', Icon: Aperture, target: 'creative' },
  { label: 'About', detail: 'Profile story and details', keywords: 'about bio profile story', Icon: Info, target: 'about' },
  { label: 'Activity', detail: 'Recent profile activity', keywords: 'activity timeline updates', Icon: Activity, target: 'activity' },
  { label: 'Schedule', detail: 'Book or review sessions', keywords: 'schedule booking sessions calendar', Icon: CalendarDays, path: '/dashboard/client/schedule' },
  { label: 'Log Workout', detail: 'Open the workout logger', keywords: 'log workout training diary session', Icon: Dumbbell, path: '/dashboard/client/log-workout?loadPlan=today' },
  { label: 'Store', detail: 'SwanStudios gear and offers', keywords: 'store shop gear products', Icon: Store, path: '/store' },
  { label: 'Camera', detail: 'Photos and transformation media', keywords: 'camera upload photo media', Icon: Camera, target: 'photos' },
];

interface HomeDashboardSearchPanelProps {
  open: boolean;
  onClose: () => void;
  onTarget: (target: VisionTarget) => void;
  onNavigate: (path: string) => void;
}

const HomeDashboardSearchPanel: React.FC<HomeDashboardSearchPanelProps> = ({
  open,
  onClose,
  onTarget,
  onNavigate,
}) => {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const normalizedQuery = query.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!normalizedQuery) return HOME_DASHBOARD_SEARCH_ITEMS.slice(0, 8);
    return HOME_DASHBOARD_SEARCH_ITEMS.filter((entry) => (
      `${entry.label} ${entry.detail} ${entry.keywords}`.toLowerCase().includes(normalizedQuery)
    )).slice(0, 8);
  }, [normalizedQuery]);

  const selectEntry = (entry: DashboardSearchEntry) => {
    if (entry.target) onTarget(entry.target);
    if (entry.path) onNavigate(entry.path);
    onClose();
    setQuery('');
  };

  if (!open) return null;

  return (
    <SearchDock role="dialog" aria-label="Search dashboard" aria-modal="false">
      <SearchHeader>
        <SearchFieldWrap htmlFor="home-dashboard-search">
          <Search size={17} aria-hidden="true" />
          <SearchField
            id="home-dashboard-search"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workouts, messages, progress"
            aria-label="Search dashboard destinations"
          />
        </SearchFieldWrap>
        <CloseButton type="button" onClick={onClose} aria-label="Close dashboard search">
          <X size={18} aria-hidden="true" />
        </CloseButton>
      </SearchHeader>
      <ResultList aria-label="Dashboard search results">
        {results.map((entry) => {
          const Icon = entry.Icon;
          return (
            <ResultButton key={`${entry.label}-${entry.path || entry.target}`} type="button" onClick={() => selectEntry(entry)}>
              <ResultIcon><Icon size={17} aria-hidden="true" /></ResultIcon>
              <ResultCopy>
                <strong>{entry.label}</strong>
                <span>{entry.detail}</span>
              </ResultCopy>
              <ArrowRight size={17} aria-hidden="true" />
            </ResultButton>
          );
        })}
        {results.length === 0 && <EmptyResult>No matching dashboard destination.</EmptyResult>}
      </ResultList>
    </SearchDock>
  );
};

const SearchDock = styled.section`
  position: fixed;
  top: clamp(72px, 9vh, 104px);
  left: clamp(10px, 4vw, 48px);
  right: clamp(10px, 4vw, 48px);
  z-index: 70;
  max-width: 720px;
  margin: 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 96%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow:
    0 24px 58px color-mix(in srgb, var(--bg-base, #0A0A0F) 76%, transparent),
    0 0 30px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  overflow: hidden;
`;

const SearchHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

const SearchFieldWrap = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border-radius: 12px;
  padding: 0 12px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 68%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

const SearchField = styled.input`
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font: 700 0.92rem/1 var(--font-ui, 'Sora', sans-serif);

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent);
  }
`;

const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ResultList = styled.div`
  display: grid;
  gap: 6px;
  max-height: min(58vh, 520px);
  overflow-y: auto;
  padding: 8px;
`;

const ResultButton = styled.button`
  min-height: 54px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ResultIcon = styled.span`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

const ResultCopy = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font: 800 0.9rem/1.15 var(--font-ui, 'Sora', sans-serif);
  }

  span {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
    font: 700 0.75rem/1.15 var(--font-ui, 'Sora', sans-serif);
  }
`;

const EmptyResult = styled.p`
  margin: 0;
  padding: 16px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
  font: 700 0.85rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export default React.memo(HomeDashboardSearchPanel);
