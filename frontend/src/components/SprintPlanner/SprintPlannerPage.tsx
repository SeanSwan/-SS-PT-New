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
  PrimaryButton, GenerateButton, SecondaryButton,
  SprintGrid, SprintCard, StatusBadge,
  ProgressContainer, ProgressFill, ProgressText,
  WeekRow, WeekLabel, SlotsRow, SlotPill,
  TabBar, Tab, EmptyState, Card, SkeletonPulse,
} from './SprintPlannerStyles';

type ViewMode = 'timeline' | 'calendar';

const SprintPlannerPage: React.FC = () => {
  const { listSprints, getSprint, generateSprint, loading } = useSprintAPI();

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
            {[1, 2, 3].map(i => <SkeletonPulse key={i} role="status" aria-live="polite" aria-label="Loading content" style={{ height: 140 }} />)}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {sprint.name}
                  </h3>
                  <StatusBadge $status={sprint.status}>{sprint.status}</StatusBadge>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Fira Code', monospace" }}>
                  {sprint.startDate} &rarr; {sprint.endDate}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  {sprint.durationWeeks} weeks &middot; {sprint.classesPerWeek} classes/week &middot; {sprint.progressionStrategy}
                </div>
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
          <SecondaryButton
            onClick={() => setActiveSprint(null)}
            style={{ marginBottom: 8, padding: '4px 12px', minHeight: '32px', fontSize: '0.75rem' }}
          >
            &larr; All Sprints
          </SecondaryButton>
          <h1>{activeSprint.name}</h1>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Fira Code', monospace" }}>
            {activeSprint.startDate} &rarr; {activeSprint.endDate} &middot; {activeSprint.durationWeeks} weeks
          </div>
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
        <Card style={{ marginBottom: 16 }}>
          <ProgressContainer>
            <ProgressFill $percent={progress.percent || 0} />
          </ProgressContainer>
          <ProgressText>
            Week {progress.currentWeek} &middot; {progress.completedSlots}/{progress.totalSlots} slots
            {(progress.failedSlots ?? 0) > 0 && ` (${progress.failedSlots} failed)`}
          </ProgressText>
        </Card>
      )}

      {/* Completion bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
          <span>Sprint Progress</span>
          <span style={{ fontFamily: "'Fira Code', monospace" }}>
            {activeSprint.totalClassesCompleted}/{activeSprint.totalClassesPlanned} taught ({completionPercent}%)
          </span>
        </div>
        <ProgressContainer>
          <ProgressFill $percent={completionPercent} />
        </ProgressContainer>
      </Card>

      {/* View toggle */}
      <TabBar style={{ marginBottom: 20 }}>
        <Tab $active={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</Tab>
        <Tab $active={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</Tab>
      </TabBar>

      {/* Timeline View */}
      {view === 'timeline' && activeSprint.weeks && (
        <div>
          {activeSprint.weeks.map(week => (
            <WeekRow key={week.id} $isDeload={week.isDeloadWeek}>
              <WeekLabel>
                <span>Week {week.weekNumber}</span>
                {week.isDeloadWeek && <span className="deload">Deload</span>}
                {week.theme && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{week.theme}</span>}
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
        </div>
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
