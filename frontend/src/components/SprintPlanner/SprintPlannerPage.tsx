/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SprintPlannerPage                                ║
 * ║  PURPOSE: 3-month bootcamp sprint planning + calendar view   ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-04-01                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Sprint Planner           [+ New Sprint]                     │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Timeline] [Calendar]                                       │
 * ├────────────────────────────────────────────────────────────┤
 * │ Sprint List / Selected Sprint Detail                        │
 * │  - Week rows with slot pills                                │
 * │  - OR Calendar month view                                   │
 * │  - Generate All button + progress bar                       │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none (page-level)
 * State:     { sprints, activeSprint, view, generating, progress }
 * API Calls: GET/POST /api/bootcamp/sprints, SSE generate
 * Children:  CreateSprintModal, BootcampCalendar, SlotDetailPanel
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSprintAPI, type BootcampSprint, type SprintClassSlot, type GenerationProgress } from '../../hooks/useSprintAPI';
import CreateSprintModal from './CreateSprintModal';
import BootcampCalendar from './BootcampCalendar';
import SlotDetailPanel from './SlotDetailPanel';
// R-H17: the card moved out with its keyboard contract — the page was at 298 of the rule-4 cap of
// 300, so the activation props could not live here (see `SprintCardTile.tsx`).
import SprintCardTile from './SprintCardTile';
import {
  PageContainer, PageHeader, ActionBar,
  PrimaryButton, GenerateButton,
  SprintGrid, StatusBadge,
  ProgressContainer, ProgressFill, ProgressText,
  WeekRow, WeekLabel, SlotsRow, SlotPill,
  Tab, EmptyState,
  CompactBackButton, ProgressHeader, ProgressMetric,
  SpacedCard, SpacedTabBar,
  SprintCardSkeleton, SprintDateRange,
  TimelineList, WeekTheme,
  TerminalNotice,
} from './SprintPlannerStyles';

type ViewMode = 'timeline' | 'calendar';

const SprintPlannerPage: React.FC = () => {
  const { listSprints, getSprint, generateSprint } = useSprintAPI();

  const [sprints, setSprints] = useState<BootcampSprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<BootcampSprint | null>(null);
  const [view, setView] = useState<ViewMode>('timeline');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SprintClassSlot | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load sprint list
  const loadSprints = useCallback(async () => {
    const data = await listSprints();
    setSprints(data);
    setInitialLoad(false);
  }, [listSprints]);

  useEffect(() => { loadSprints(); }, [loadSprints]);

  // Load sprint detail
  const loadSprintDetail = useCallback(async (id: number) => {
    const detail = await getSprint(id);
    if (detail) setActiveSprint(detail);
  }, [getSprint]);

  // The cancel handle is KEPT in a ref: React discards an onClick's return value.
  const cancelRun = useRef<(() => void) | null>(null);

  const handleGenerate = useCallback(() => {
    if (!activeSprint) return;
    const sprintId = activeSprint.id;
    setGenerating(true);
    setProgress(null);

    cancelRun.current = generateSprint(sprintId, (evt) => {
      // A frame already in flight can arrive after `leaveSprint` aborts the run;
      // a nulled handle means the trainer left, so it must not repaint.
      if (cancelRun.current === null) return;
      setProgress(evt);
      if (evt.type === 'complete' || evt.type === 'error') {
        setGenerating(false);
        loadSprintDetail(sprintId);
      }
    });
  }, [activeSprint, generateSprint, loadSprintDetail]);

  /** Leaving must STOP the run, not merely hide it: the stream keeps pushing
   *  events, so a late terminal event painted Sprint A's failure onto Sprint B
   *  and dragged the trainer back to A. */
  const leaveSprint = useCallback(() => {
    cancelRun.current?.();
    cancelRun.current = null;
    setActiveSprint(null);
    setGenerating(false);
    setProgress(null);
  }, []);

  // A run must not outlive the page either.
  useEffect(() => () => { cancelRun.current?.(); cancelRun.current = null; }, []);

  // Flatten all slots for calendar
  const allSlots = useMemo(() => {
    if (!activeSprint?.weeks) return [];
    return activeSprint.weeks.flatMap(w => w.classSlots || []);
  }, [activeSprint]);

  const completionPercent = activeSprint
    ? Math.round((activeSprint.totalClassesCompleted / Math.max(1, activeSprint.totalClassesPlanned)) * 100)
    : 0;

  // ── Sprint List View ───────────────────────────────────────────────
  if (!activeSprint) {
    return (
      <PageContainer>
        <PageHeader>
          <h1>Sprint Planner</h1>
          <PrimaryButton onClick={() => setShowCreate(true)}>+ New Sprint</PrimaryButton>
        </PageHeader>

        {initialLoad ? (
          <SprintGrid>
            {[1, 2, 3].map(i => (
              <SprintCardSkeleton
                key={i}
                role="status"
                aria-live="polite"
                aria-label="Loading content"
              />
            ))}
          </SprintGrid>
        ) : sprints.length === 0 ? (
          <EmptyState>
            <h3>No Sprints Yet</h3>
            <p>Create your first 3-month bootcamp sprint to start planning classes in advance.</p>
            <PrimaryButton onClick={() => setShowCreate(true)}>Create First Sprint</PrimaryButton>
          </EmptyState>
        ) : (
          <SprintGrid>
            {sprints.map(sprint => (
              <SprintCardTile
                key={sprint.id}
                sprint={sprint}
                onOpen={() => loadSprintDetail(sprint.id)}
              />
            ))}
          </SprintGrid>
        )}

        <CreateSprintModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={loadSprints}
        />
      </PageContainer>
    );
  }

  // ── Sprint Detail View ─────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader>
        <div>
          <CompactBackButton onClick={leaveSprint}>
            &larr; All Sprints
          </CompactBackButton>
          <h1>{activeSprint.name}</h1>
          <SprintDateRange>
            {activeSprint.startDate} &rarr; {activeSprint.endDate} &middot; {activeSprint.durationWeeks} weeks
          </SprintDateRange>
        </div>
        <ActionBar>
          <StatusBadge $status={activeSprint.status}>{activeSprint.status}</StatusBadge>
          {(activeSprint.status === 'draft' || activeSprint.status === 'active') && (
            <GenerateButton onClick={handleGenerate} disabled={generating}>
              {generating ? `Generating... ${progress?.percent || 0}%` : 'Generate All Classes'}
            </GenerateButton>
          )}
        </ActionBar>
      </PageHeader>

      {/* Progress bar during generation */}
      {generating && progress && (
        <SpacedCard>
          <ProgressContainer>
            <ProgressFill $percent={progress.percent || 0} />
          </ProgressContainer>
          <ProgressText>
            Week {progress.currentWeek} &middot; {progress.completedSlots}/{progress.totalSlots} slots
            {(progress.failedSlots ?? 0) > 0 && ` (${progress.failedSlots} failed)`}
          </ProgressText>
        </SpacedCard>
      )}

      {/* R-H04: the terminal event must outlive `setGenerating(false)` — the panel
          above renders only while `generating`, so the event explaining WHY the run
          ended had no surface. Distinct copy for an interrupted run. */}
      {!generating && progress?.type === 'error' && (
        <TerminalNotice $tone="error" role="alert">
          {progress.interrupted
            ? 'Generation was interrupted and is not running now. Start it again.'
            : (progress.error || 'Generation did not finish. Try again.')}
        </TerminalNotice>
      )}

      {/* Completion bar */}
      <SpacedCard>
        <ProgressHeader>
          <span>Sprint Progress</span>
          <ProgressMetric>
            {activeSprint.totalClassesCompleted}/{activeSprint.totalClassesPlanned} taught ({completionPercent}%)
          </ProgressMetric>
        </ProgressHeader>
        <ProgressContainer>
          <ProgressFill $percent={completionPercent} />
        </ProgressContainer>
      </SpacedCard>

      {/* View toggle — R-H17: these were real buttons but published no selected state, so a screen
          reader could not say which view was active. `role="tab"` + `aria-selected` is what the
          register's "selected/pressed semantics" asks for; `aria-controls` is deliberately absent
          because the panels below are conditionally rendered siblings with no stable ids. */}
      <SpacedTabBar role="tablist" aria-label="Sprint view">
        <Tab role="tab" aria-selected={view === 'timeline'} $active={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</Tab>
        <Tab role="tab" aria-selected={view === 'calendar'} $active={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</Tab>
      </SpacedTabBar>

      {/* Timeline View */}
      {view === 'timeline' && activeSprint.weeks && (
        <TimelineList>
          {activeSprint.weeks.map(week => (
            <WeekRow key={week.id} $isDeload={week.isDeloadWeek}>
              <WeekLabel>
                <span>Week {week.weekNumber}</span>
                {week.isDeloadWeek && <span className="deload">Deload</span>}
                {week.theme && <WeekTheme>{week.theme}</WeekTheme>}
              </WeekLabel>
              <SlotsRow>
                {(week.classSlots || []).map(slot => (
                  <SlotPill
                    key={slot.id}
                    $status={slot.status}
                    $dayType={slot.dayType}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <span className="day-abbr">
                      {slot.dayType.replace('_body', '').replace('_', ' ').slice(0, 5).toUpperCase()}
                    </span>
                    <span className="slot-date">{slot.scheduledDate.slice(5)}</span>
                  </SlotPill>
                ))}
              </SlotsRow>
            </WeekRow>
          ))}
        </TimelineList>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <BootcampCalendar slots={allSlots} onSlotClick={setSelectedSlot} />
      )}

      {/* Slot Detail Panel */}
      {selectedSlot && (
        <SlotDetailPanel
          slot={selectedSlot}
          sprintId={activeSprint.id}
          onClose={() => setSelectedSlot(null)}
          onRefresh={() => {
            setSelectedSlot(null);
            loadSprintDetail(activeSprint.id);
          }}
        />
      )}
    </PageContainer>
  );
};

export default SprintPlannerPage;
