/**
 * ┌─── SUB-COMPONENT: CoachTeachModePanel ─────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Right-side sliding panel with exercise search +    │
 * │   deep teach mode tabs (How To, Phase, Learn & Watch)       │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────┐                            │
 * │ │ BookOpen  Teach Mode    [X]  │                            │
 * │ │ [🔍 Search exercises...]     │                            │
 * │ │ ┌──────────────────────────┐ │                            │
 * │ │ │ search result 1          │ │ ← when searching           │
 * │ │ │ search result 2          │ │                            │
 * │ │ └──────────────────────────┘ │                            │
 * │ │ Exercise Name (selected)     │                            │
 * │ │ [How To][Phase][Learn]       │                            │
 * │ │ ┌──────────────────────────┐ │                            │
 * │ │ │ Tab content (deep data)  │ │                            │
 * │ │ └──────────────────────────┘ │                            │
 * │ └──────────────────────────────┘                            │
 * │ Props: { teachMode: UseCoachTeachModeReturn }               │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Search] → debounced API search → show results dropdown     │
 * │ [Result] → selectExercise → loads teach data via hook       │
 * │ [Tab] → switches between How To / Phase / Learn             │
 * │ [X] → closes panel                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, memo } from 'react';
import { BookOpen, X, Search, ClipboardList, TrendingUp, PlayCircle } from 'lucide-react';
import type { UseCoachTeachModeReturn } from './hooks/useCoachTeachMode';
import { useExerciseTeachData } from '../../../../features/teach-mode/hooks/useExerciseTeachData';
import { TabBar, TabButton, TabContent, SkeletonLine, EmptyDataMsg } from '../../../../features/teach-mode/styles/TeachModeStyles';
import HowToPerformTab from '../../../../features/teach-mode/components/tabs/HowToPerformTab';
import PhaseProgressionTab from '../../../../features/teach-mode/components/tabs/PhaseProgressionTab';
import LearnWatchTab from '../../../../features/teach-mode/components/tabs/LearnWatchTab';
import {
  CloseBtn,
  DropdownStatus,
  ExerciseName,
  LoadingIcon,
  PanelBody,
  PanelContainer,
  PanelHeader,
  PanelOverlay,
  PanelTitle,
  ResultsDropdown,
  ResultItem,
  ResultMeta,
  RetryButton,
  SearchIcon,
  SearchInput,
  SearchWrap,
  SkeletonSpacer,
  TabLabel,
  TeachErrorBox,
  TeachErrorText,
} from './CoachTeachModePanel.styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
type TabId = 'how-to-perform' | 'phase-progression' | 'learn-watch';

const TAB_CONFIG: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'how-to-perform', label: 'How To', icon: <ClipboardList size={14} /> },
  { id: 'phase-progression', label: 'Phase', icon: <TrendingUp size={14} /> },
  { id: 'learn-watch', label: 'Learn', icon: <PlayCircle size={14} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Loading Skeleton
// ─────────────────────────────────────────────────────────────
const TeachModeSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-label="Loading teach mode data">
    <SkeletonLine $width="60%" />
    <SkeletonLine />
    <SkeletonLine $width="80%" />
    <SkeletonLine $width="45%" />
    <SkeletonSpacer />
    <SkeletonLine $width="50%" />
    <SkeletonLine />
    <SkeletonLine $width="70%" />
  </div>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
interface CoachTeachModePanelProps {
  teachMode: UseCoachTeachModeReturn;
}

const CoachTeachModePanel: React.FC<CoachTeachModePanelProps> = ({ teachMode }) => {
  const [activeTab, setActiveTab] = useState<TabId>('how-to-perform');

  const { data: teachData, isLoading, error, refetch } = useExerciseTeachData(
    teachMode.selectedExercise?.id ?? null
  );

  const exerciseName = useMemo(
    () => teachData?.name || teachMode.selectedExercise?.name || '',
    [teachData, teachMode.selectedExercise]
  );

  return (
    <>
      <PanelOverlay
        type="button"
        $visible={teachMode.isOpen}
        onClick={teachMode.close}
        aria-label="Close Teach Mode panel"
      />
      <PanelContainer $isOpen={teachMode.isOpen} role="complementary" aria-label="Teach Mode panel">
        {/* Header */}
        <PanelHeader>
          <PanelTitle>
            <BookOpen size={18} />
            Teach Mode
          </PanelTitle>
          <CloseBtn type="button" onClick={teachMode.close} aria-label="Close Teach Mode">
            <X size={18} />
          </CloseBtn>
        </PanelHeader>

        {/* Exercise Search */}
        <SearchWrap>
          <SearchIcon><Search size={14} /></SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search exercises..."
            value={teachMode.searchQuery}
            onChange={e => teachMode.setSearchQuery(e.target.value)}
            aria-label="Search exercises for Teach Mode"
          />

          {/* Search Results Dropdown */}
          {(teachMode.searchResults.length > 0 || teachMode.isSearching) && teachMode.searchQuery.length >= 2 && (
            <ResultsDropdown>
              {teachMode.isSearching ? (
                <DropdownStatus>
                  <LoadingIcon size={16} />
                </DropdownStatus>
              ) : (
                teachMode.searchResults.map(ex => (
                  <ResultItem
                    key={ex.id}
                    onClick={() => teachMode.selectExercise(ex)}
                    type="button"
                  >
                    {ex.name}
                    <ResultMeta>
                      {ex.bodyPartCategory}{ex.primaryMuscles.length > 0 ? ` · ${ex.primaryMuscles[0]}` : ''}
                    </ResultMeta>
                  </ResultItem>
                ))
              )}
              {!teachMode.isSearching && teachMode.searchResults.length === 0 && (
                <DropdownStatus>
                  No exercises found
                </DropdownStatus>
              )}
            </ResultsDropdown>
          )}
        </SearchWrap>

        {/* Panel Body */}
        <PanelBody>
          {teachMode.selectedExercise ? (
            <>
              <ExerciseName>{exerciseName}</ExerciseName>

              {/* 3-Tab Bar */}
              <TabBar role="tablist" aria-label="Teach Mode tabs">
                {TAB_CONFIG.map(tab => (
                  <TabButton
                    type="button"
                    key={tab.id}
                    $active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`coach-panel-${tab.id}`}
                  >
                    <TabLabel>
                      {tab.icon}
                      {tab.label}
                    </TabLabel>
                  </TabButton>
                ))}
              </TabBar>

              {/* Loading */}
              {isLoading && <TeachModeSkeleton />}

              {/* Error */}
              {error && (
                <TeachErrorBox role="alert">
                  <TeachErrorText>
                    {error}
                  </TeachErrorText>
                  <RetryButton
                    onClick={refetch}
                    type="button"
                  >
                    Try Again
                  </RetryButton>
                </TeachErrorBox>
              )}

              {/* Tab Content */}
              {teachData && (
                <>
                  <TabContent $visible={activeTab === 'how-to-perform'} id="coach-panel-how-to-perform">
                    <HowToPerformTab data={teachData} />
                  </TabContent>

                  <TabContent $visible={activeTab === 'phase-progression'} id="coach-panel-phase-progression">
                    <PhaseProgressionTab
                      data={teachData}
                      phaseNumber={teachMode.phaseNumber}
                      onPhaseChange={teachMode.setPhaseNumber}
                    />
                  </TabContent>

                  <TabContent $visible={activeTab === 'learn-watch'} id="coach-panel-learn-watch">
                    <LearnWatchTab data={teachData} phaseNumber={teachMode.phaseNumber} />
                  </TabContent>
                </>
              )}

              {/* No data yet */}
              {!teachData && !isLoading && !error && (
                <EmptyDataMsg>Loading exercise data...</EmptyDataMsg>
              )}
            </>
          ) : (
            <EmptyDataMsg>
              Search for an exercise above to see step-by-step instructions,
              coaching cues, biomechanics, and NASM phase guidance.
            </EmptyDataMsg>
          )}
        </PanelBody>
      </PanelContainer>
    </>
  );
};

export default memo(CoachTeachModePanel);
