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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSprintAPI, type BootcampSprint, type SprintClassSlot, type GenerationProgress } from '../../hooks/useSprintAPI';
import CreateSprintModal from './CreateSprintModal';
import BootcampCalendar from './BootcampCalendar';
import SlotDetailPanel from './SlotDetailPanel';
import {
  PageContainer, PageHeader, ActionBar,
  PrimaryButton, GenerateButton,
  SprintGrid, SprintCard, StatusBadge,
  ProgressContainer, ProgressFill, ProgressText,
  WeekRow, WeekLabel, SlotsRow, SlotPill,
  Tab, EmptyState,
  CompactBackButton, ProgressHeader, ProgressMetric,
  SpacedCard, SpacedTabBar, SprintCardHeader,
  SprintCardSkeleton, SprintCardTitle, SprintDateRange,
  SprintMeta, TimelineList, WeekTheme,
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

  // Handle generation
  const handleGenerate = useCallback(() => {
    if (!activeSprint) return;
    setGenerating(true);
    setProgress(null);

    const cancel = generateSprint(activeSprint.id, (evt) => {
      setProgress(evt);
      if (evt.type === 'complete' || evt.type === 'error') {
        setGenerating(false);
        loadSprintDetail(activeSprint.id);
      }
    });

    return cancel;
  }, [activeSprint, generateSprint, loadSprintDetail]);

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
              <SprintCard key={sprint.id} onClick={() => loadSprintDetail(sprint.id)}>
                <SprintCardHeader>
                  <SprintCardTitle>{sprint.name}</SprintCardTitle>
                  <StatusBadge $status={sprint.status}>{sprint.status}</StatusBadge>
                </SprintCardHeader>
                <SprintDateRange>
                  {sprint.startDate} &rarr; {sprint.endDate}
                </SprintDateRange>
                <SprintMeta>
                  {sprint.durationWeeks} weeks &middot; {sprint.classesPerWeek} classes/week &middot; {sprint.progressionStrategy}
                </SprintMeta>
                <ProgressContainer>
                  <ProgressFill $percent={Math.round((sprint.totalClassesCompleted / Math.max(1, sprint.totalClassesPlanned)) * 100)} />
                </ProgressContainer>
                <ProgressText>
                  {sprint.totalClassesCompleted}/{sprint.totalClassesPlanned} classes completed
                </ProgressText>
              </SprintCard>
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
          <CompactBackButton onClick={() => setActiveSprint(null)}>
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

      {/* View toggle */}
      <SpacedTabBar>
        <Tab $active={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</Tab>
        <Tab $active={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</Tab>
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
