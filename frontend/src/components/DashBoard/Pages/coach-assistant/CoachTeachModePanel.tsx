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
import styled from 'styled-components';
import { BookOpen, X, Search, ClipboardList, TrendingUp, PlayCircle, Loader2 } from 'lucide-react';
import type { UseCoachTeachModeReturn } from './hooks/useCoachTeachMode';
import { useExerciseTeachData } from '../../../../features/teach-mode/hooks/useExerciseTeachData';
import { TabBar, TabButton, TabContent, SkeletonLine, EmptyDataMsg } from '../../../../features/teach-mode/styles/TeachModeStyles';
import HowToPerformTab from '../../../../features/teach-mode/components/tabs/HowToPerformTab';
import PhaseProgressionTab from '../../../../features/teach-mode/components/tabs/PhaseProgressionTab';
import LearnWatchTab from '../../../../features/teach-mode/components/tabs/LearnWatchTab';

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
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PanelContainer = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => ($isOpen ? '320px' : '0')};
  min-width: ${({ $isOpen }) => ($isOpen ? '320px' : '0')};
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #0D0D15);
  border-left: ${({ $isOpen }) => ($isOpen ? '1px solid var(--border-soft, rgba(96, 192, 240, 0.08))' : 'none')};
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;

  @media (max-width: 1023px) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${({ $isOpen }) => ($isOpen ? 'min(85vw, 360px)' : '0')};
    min-width: 0;
    z-index: 50;
    box-shadow: ${({ $isOpen }) => ($isOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none')};
  }
`;

const PanelOverlay = styled.div<{ $visible: boolean }>`
  display: none;

  @media (max-width: 1023px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 49;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  flex-shrink: 0;
`;

const PanelTitle = styled.div`
  flex: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease;
  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const SearchWrap = styled.div`
  padding: 8px 14px;
  position: relative;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  min-height: 44px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.4));
  }
  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  pointer-events: none;
`;

const ResultsDropdown = styled.div`
  position: absolute;
  top: calc(100% - 4px);
  left: 14px;
  right: 14px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const ResultItem = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  & + & {
    border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  }
`;

const ResultMeta = styled.span`
  font-size: 0.68rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  min-height: 0;
`;

const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 12px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Loading Skeleton
// ─────────────────────────────────────────────────────────────
const TeachModeSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-label="Loading teach mode data">
    <SkeletonLine $width="60%" />
    <SkeletonLine />
    <SkeletonLine $width="80%" />
    <SkeletonLine $width="45%" />
    <div style={{ height: 16 }} />
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
      <PanelOverlay $visible={teachMode.isOpen} onClick={teachMode.close} />
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
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted, rgba(224,236,244,0.4))' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
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
                <div style={{
                  padding: 16,
                  textAlign: 'center',
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, rgba(224,236,244,0.4))',
                }}>
                  No exercises found
                </div>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabButton>
                ))}
              </TabBar>

              {/* Loading */}
              {isLoading && <TeachModeSkeleton />}

              {/* Error */}
              {error && (
                <div style={{
                  padding: 16,
                  borderRadius: 8,
                  borderLeft: '3px solid #C92A54',
                  background: 'color-mix(in srgb, #C92A54 6%, transparent)',
                  marginBottom: 12,
                }} role="alert">
                  <p style={{
                    margin: 0,
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '0.78rem',
                    color: 'var(--text-primary, #E0ECF4)',
                    marginBottom: 8,
                  }}>
                    {error}
                  </p>
                  <button
                    onClick={refetch}
                    type="button"
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--accent-primary, #60C0F0)',
                      background: 'transparent',
                      color: 'var(--accent-primary, #60C0F0)',
                      fontFamily: "'Sora', sans-serif",
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    Try Again
                  </button>
                </div>
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
