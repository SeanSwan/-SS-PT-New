/**
 * BootcampBuilderPage -- Boot Camp Class Builder
 * ================================================
 * Phase 10f: AI-powered group fitness class generation.
 *
 * 3-pane layout: Config | Class Preview | AI Insights
 * Galaxy-Swan theme with Floor Mode toggle (high contrast for gym use).
 */
import React, { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useBootcampAPI } from '../../hooks/useBootcampAPI';
import type {
  GeneratedBootcamp,
  BootcampExercise,
  ClassFormat,
  DayType,
} from '../../hooks/useBootcampAPI';

// ── Styled Components ─────────────────────────────────────────────────

const PageWrapper = styled.div<{ $floorMode?: boolean }>`
  min-height: 100vh;
  padding: 20px;
  ${({ $floorMode }) => $floorMode
    ? css`background: #000; color: #F8F9FA;`
    : css`background: linear-gradient(180deg, #002060 0%, #001040 100%); color: #e0ecf4;`
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  opacity: 0.7;
  margin: 4px 0 0 0;
`;

const FloorModeToggle = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 2px solid ${({ $active }) => $active ? '#FF6B35' : 'rgba(96,192,240,0.3)'};
  background: ${({ $active }) => $active ? 'rgba(255,107,53,0.2)' : 'transparent'};
  color: ${({ $active }) => $active ? '#FF6B35' : '#60c0f0'};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

const ThreePane = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px;
`;

const PanelTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #60c0f0;
`;

const FormGroup = styled.div`
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  opacity: 0.7;
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 6px;
  color: #e0ecf4;
  font-size: 14px;
  &:focus { border-color: #60c0f0; outline: none; }
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 6px;
  color: #e0ecf4;
  font-size: 14px;
  &:focus { border-color: #60c0f0; outline: none; }
`;

const PrimaryButton = styled.button<{ $floorMode?: boolean }>`
  width: 100%;
  min-height: ${({ $floorMode }) => $floorMode ? '64px' : '44px'};
  padding: 12px 20px;
  background: linear-gradient(135deg, #60c0f0 0%, #7851a9 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: ${({ $floorMode }) => $floorMode ? '18px' : '14px'};
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorBanner = styled.div`
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: #FF4757;
  font-size: 13px;
`;

const SectionDivider = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #60c0f0;
  margin: 16px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.15);
`;

const StationCard = styled.div`
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
`;

const StationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const StationName = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

const ExerciseRow = styled.div<{ $isCardio?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  ${({ $isCardio }) => $isCardio && css`
    color: #00FF88;
    font-style: italic;
  `}
`;

const DifficultyChip = styled.span<{ $tier: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  ${({ $tier }) => {
    switch ($tier) {
      case 'easy': return css`background: rgba(0,255,136,0.1); color: #00FF88;`;
      case 'hard': return css`background: rgba(255,71,87,0.1); color: #FF4757;`;
      default: return css`background: rgba(96,192,240,0.1); color: #60c0f0;`;
    }
  }}
`;

const TimingBadge = styled.span`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #60c0f0;
`;

const InsightCard = styled.div<{ $type?: string }>`
  background: ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'rgba(255, 184, 0, 0.08)';
      case 'freshness': return 'rgba(0, 255, 136, 0.06)';
      default: return 'rgba(96, 192, 240, 0.06)';
    }
  }};
  border: 1px solid ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'rgba(255, 184, 0, 0.2)';
      case 'freshness': return 'rgba(0, 255, 136, 0.2)';
      default: return 'rgba(96, 192, 240, 0.15)';
    }
  }};
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 13px;
`;

const ModGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 4px;
  margin-top: 4px;
`;

const ModChip = styled.span`
  background: rgba(120, 81, 169, 0.1);
  border: 1px solid rgba(120, 81, 169, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: rgba(224, 236, 244, 0.7);
`;

// ── Constants ─────────────────────────────────────────────────────────

const CLASS_FORMATS: Array<{ value: ClassFormat; label: string }> = [
  { value: 'stations_4x', label: '4 Exercises x N Stations (35s)' },
  { value: 'stations_3x5', label: '3 Exercises x 5 Stations (40s)' },
  { value: 'stations_2x7', label: '2 Exercises x 7 Stations (30s)' },
  { value: 'full_group', label: 'Full Group (15 exercises x 2 rounds)' },
];

const DAY_TYPES: Array<{ value: DayType; label: string }> = [
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'cardio', label: 'Cardio / Conditioning' },
  { value: 'full_body', label: 'Full Body' },
];

// ── Component ─────────────────────────────────────────────────────────

const BootcampBuilderPage: React.FC = () => {
  const api = useBootcampAPI();

  // Config
  const [classFormat, setClassFormat] = useState<ClassFormat>('stations_4x');
  const [dayType, setDayType] = useState<DayType>('full_body');
  const [targetDuration, setTargetDuration] = useState('45');
  const [expectedParticipants, setExpectedParticipants] = useState('12');
  const [className, setClassName] = useState('');

  // State
  const [bootcamp, setBootcamp] = useState<GeneratedBootcamp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorMode, setFloorMode] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<BootcampExercise | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBootcamp(null);
    setSelectedExercise(null);

    try {
      const result = await api.generateClass({
        classFormat,
        dayType,
        targetDuration: parseInt(targetDuration, 10) || 45,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12,
        name: className || undefined,
      });
      setBootcamp(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [api, classFormat, dayType, targetDuration, expectedParticipants, className]);

  const handleSave = useCallback(async () => {
    if (!bootcamp) return;
    try {
      await api.saveTemplate(bootcamp);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }, [api, bootcamp]);

  // Group exercises by station
  const stationExercises = bootcamp?.exercises.reduce<Record<number, BootcampExercise[]>>((acc, ex) => {
    const key = ex.stationIndex ?? -1;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {}) ?? {};

  return (
    <PageWrapper $floorMode={floorMode}>
      <TopBar>
        <div>
          <Title>Boot Camp Class Builder</Title>
          <Subtitle>AI-powered group fitness class generation with station planning and overflow management</Subtitle>
        </div>
        <FloorModeToggle $active={floorMode} onClick={() => setFloorMode(!floorMode)}>
          {floorMode ? 'Exit Floor Mode' : 'Floor Mode'}
        </FloorModeToggle>
      </TopBar>

      <ThreePane>
        {/* Left: Config */}
        <Panel>
          <PanelTitle>Class Configuration</PanelTitle>

          <FormGroup>
            <Label>Class Format</Label>
            <Select value={classFormat} onChange={e => setClassFormat(e.target.value as ClassFormat)}>
              {CLASS_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Day Type</Label>
            <Select value={dayType} onChange={e => setDayType(e.target.value as DayType)}>
              {DAY_TYPES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Workout Duration (min)</Label>
            <Input type="number" value={targetDuration} onChange={e => setTargetDuration(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Expected Participants</Label>
            <Input type="number" value={expectedParticipants} onChange={e => setExpectedParticipants(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Class Name (optional)</Label>
            <Input type="text" placeholder="Auto-generated if empty" value={className} onChange={e => setClassName(e.target.value)} />
          </FormGroup>

          <PrimaryButton $floorMode={floorMode} onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Class'}
          </PrimaryButton>

          {error && <ErrorBanner style={{ marginTop: 12 }}>{error}</ErrorBanner>}
        </Panel>

        {/* Center: Class Preview */}
        <Panel>
          <PanelTitle>Class Preview</PanelTitle>

          <AnimatePresence>
            {bootcamp && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <TimingBadge>{bootcamp.totalClassMin} min total</TimingBadge>
                  <TimingBadge>{bootcamp.demoDuration} min demo</TimingBadge>
                  <TimingBadge>{bootcamp.totalWorkoutMin} min workout</TimingBadge>
                  <TimingBadge>{bootcamp.clearDuration} min clear</TimingBadge>
                  <TimingBadge>{bootcamp.stationCount || 'No'} stations</TimingBadge>
                </div>

                {bootcamp.stations.length > 0 ? (
                  bootcamp.stations.map((station, si) => (
                    <StationCard key={station.stationNumber}>
                      <StationHeader>
                        <StationName>{station.stationName}</StationName>
                        {station.equipmentNeeded && (
                          <TimingBadge>{station.equipmentNeeded}</TimingBadge>
                        )}
                      </StationHeader>
                      {(stationExercises[si] ?? []).map((ex) => (
                        <ExerciseRow
                          key={`${si}-${ex.sortOrder}`}
                          $isCardio={ex.isCardioFinisher}
                          onClick={() => setSelectedExercise(ex)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span>
                            {ex.sortOrder}. {ex.exerciseName}
                            {ex.isCardioFinisher && ' (cardio finisher)'}
                          </span>
                          <span>{ex.durationSec}s</span>
                        </ExerciseRow>
                      ))}
                    </StationCard>
                  ))
                ) : bootcamp.classFormat === 'full_group' ? (
                  <StationCard>
                    <StationHeader>
                      <StationName>Full Group Workout</StationName>
                      <TimingBadge>2 rounds</TimingBadge>
                    </StationHeader>
                    {bootcamp.exercises.map((ex) => (
                      <ExerciseRow
                        key={ex.sortOrder}
                        $isCardio={ex.isCardioFinisher}
                        onClick={() => setSelectedExercise(ex)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span>
                          {ex.sortOrder}. {ex.exerciseName}
                        </span>
                        <span>{ex.durationSec}s</span>
                      </ExerciseRow>
                    ))}
                  </StationCard>
                ) : null}

                {bootcamp.overflowPlan && (
                  <>
                    <SectionDivider>Overflow Plan</SectionDivider>
                    <InsightCard $type="overflow">
                      <strong>Lap Rotation</strong> (triggers at {bootcamp.overflowPlan.triggerCount}+ participants)
                      <div style={{ marginTop: 6 }}>
                        {bootcamp.overflowPlan.lapExercises.map((lap, i) => (
                          <span key={i} style={{ marginRight: 8 }}>
                            {lap.name} ({lap.durationMin}min)
                          </span>
                        ))}
                      </div>
                    </InsightCard>
                  </>
                )}

                <div style={{ marginTop: 12 }}>
                  <PrimaryButton $floorMode={floorMode} onClick={handleSave}>
                    Save as Template
                  </PrimaryButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!bootcamp && !loading && (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
              Configure your class and click Generate
            </div>
          )}
        </Panel>

        {/* Right: Exercise Detail + AI Insights */}
        <Panel>
          <PanelTitle>Exercise Detail</PanelTitle>

          {selectedExercise ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {selectedExercise.exerciseName}
              </div>

              <SectionDivider>Difficulty Tiers</SectionDivider>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {selectedExercise.easyVariation && (
                  <DifficultyChip $tier="easy">Easy: {selectedExercise.easyVariation}</DifficultyChip>
                )}
                {selectedExercise.mediumVariation && (
                  <DifficultyChip $tier="medium">Medium: {selectedExercise.mediumVariation}</DifficultyChip>
                )}
                {selectedExercise.hardVariation && (
                  <DifficultyChip $tier="hard">Hard: {selectedExercise.hardVariation}</DifficultyChip>
                )}
              </div>

              <SectionDivider>Pain Modifications</SectionDivider>
              <ModGrid>
                {selectedExercise.kneeMod && <ModChip>Knee: {selectedExercise.kneeMod}</ModChip>}
                {selectedExercise.shoulderMod && <ModChip>Shoulder: {selectedExercise.shoulderMod}</ModChip>}
                {selectedExercise.ankleMod && <ModChip>Ankle: {selectedExercise.ankleMod}</ModChip>}
                {selectedExercise.wristMod && <ModChip>Wrist: {selectedExercise.wristMod}</ModChip>}
                {selectedExercise.backMod && <ModChip>Back: {selectedExercise.backMod}</ModChip>}
              </ModGrid>

              {selectedExercise.muscleTargets && (
                <>
                  <SectionDivider>Muscle Targets</SectionDivider>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {selectedExercise.muscleTargets.split(',').join(', ')}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, opacity: 0.5, fontSize: 13 }}>
              Click an exercise to see difficulty tiers and pain modifications
            </div>
          )}

          {bootcamp && bootcamp.explanations.length > 0 && (
            <>
              <SectionDivider>AI Reasoning</SectionDivider>
              {bootcamp.explanations.map((exp, i) => (
                <InsightCard key={i} $type={exp.type}>
                  {exp.message}
                </InsightCard>
              ))}
            </>
          )}
        </Panel>
      </ThreePane>
    </PageWrapper>
  );
};

// Error Boundary

class BootcampBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>
              Something went wrong
            </div>
            <p style={{ opacity: 0.5, marginBottom: 16 }}>
              The Boot Camp Builder encountered an error.
            </p>
            <PrimaryButton style={{ width: 'auto', padding: '10px 24px' }} onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </div>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const BootcampBuilderPageWithBoundary: React.FC = () => (
  <BootcampBuilderErrorBoundary>
    <BootcampBuilderPage />
  </BootcampBuilderErrorBoundary>
);

export default BootcampBuilderPageWithBoundary;
