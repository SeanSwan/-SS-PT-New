/**
 * VariationEnginePage — Workout Variation Engine
 * ================================================
 * Phase 8: NASM-aligned exercise rotation with 2-week timeline,
 * SwapCard UI, and NASM confidence badges.
 *
 * Galaxy-Swan theme: Midnight Sapphire (#002060), Swan Cyan (#60C0F0),
 * Cosmic Purple (#7851A9), glassmorphic panels.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useVariationAPI } from '../../hooks/useVariationAPI';
import type {
  SwapSuggestion,
  TimelineEntry,
  ExerciseEntry,
} from '../../hooks/useVariationAPI';

// --- Keyframes ---

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(96, 192, 240, 0.3); }
  50% { box-shadow: 0 0 16px rgba(96, 192, 240, 0.6); }
`;

const crossFade = keyframes`
  0% { opacity: 0; transform: translateX(10px); }
  100% { opacity: 1; transform: translateX(0); }
`;

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
  padding: 24px;
`;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: #e0ecf4;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin: 4px 0 0;
`;

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #e0ecf4;
  margin: 0 0 12px;
`;

const PrimaryButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(135deg, #60c0f0 0%, #7851a9 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const GhostButton = styled.button`
  padding: 8px 14px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: transparent;
  border-radius: 6px;
  color: #60c0f0;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

const Select = styled.select`
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: #60c0f0; }
`;

const Input = styled.input`
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  &::placeholder { color: rgba(224, 236, 244, 0.5); }
  &:focus { outline: none; border-color: #60c0f0; }
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: rgba(224, 236, 244, 0.8);
  margin-bottom: 6px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const LoadingMsg = styled.div`
  text-align: center;
  padding: 32px;
  color: rgba(224, 236, 244, 0.65);
  font-size: 14px;
`;

// --- Timeline Components ---

const TimelineWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 0;
  overflow-x: auto;
`;

const TimelineNode = styled.div<{ $type: 'build' | 'switch'; $current?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 18px;
    right: -20px;
    width: 40px;
    height: 2px;
    background: ${({ $type }) => $type === 'build'
      ? 'linear-gradient(90deg, #7851a9, #7851a9)'
      : 'linear-gradient(90deg, #60c0f0, #60c0f0)'};
    opacity: 0.4;
  }

  &:last-child::after {
    display: none;
  }
`;

const NodeCircle = styled.div<{ $type: 'build' | 'switch'; $current?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: ${({ $type }) => $type === 'build'
    ? 'linear-gradient(135deg, #7851a9, #5a3d8a)'
    : 'linear-gradient(135deg, #60c0f0, #4090c0)'};
  ${({ $current }) => $current && `animation: ${pulseGlow} 2s ease-in-out infinite;`}
`;

const NodeLabel = styled.div`
  font-size: 10px;
  color: rgba(224, 236, 244, 0.65);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NextNodeCircle = styled(NodeCircle)`
  border: 2px dashed rgba(96, 192, 240, 0.5);
  background: transparent;
  color: #60c0f0;
`;

// --- SwapCard Components ---

const SwapCardWrapper = styled(motion.div)`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;

  @media (max-width: 600px) {
    padding: 14px;
  }
`;

const SwapRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const ExerciseBox = styled.div<{ $muted?: boolean }>`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  background: ${({ $muted }) =>
    $muted ? 'rgba(0, 16, 64, 0.3)' : 'rgba(96, 192, 240, 0.08)'};
  border: 1px solid ${({ $muted }) =>
    $muted ? 'rgba(96, 192, 240, 0.08)' : 'rgba(96, 192, 240, 0.25)'};
  opacity: ${({ $muted }) => $muted ? 0.6 : 1};
  ${({ $muted }) => !$muted && `animation: ${crossFade} 0.4s ease-out;`}
`;

const ExerciseName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #e0ecf4;
`;

const ExerciseMeta = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.65);
  margin-top: 4px;
`;

const SwapArrow = styled.div`
  font-size: 18px;
  color: #60c0f0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    transform: rotate(90deg);
  }
`;

const NasmBadge = styled.span<{ $confidence: string }>`
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  background: ${({ $confidence }) =>
    $confidence === 'High' ? 'rgba(0, 255, 136, 0.15)'
    : $confidence === 'Medium' ? 'rgba(255, 184, 0, 0.15)'
    : $confidence === 'Keep' ? 'rgba(96, 192, 240, 0.15)'
    : 'rgba(96, 192, 240, 0.1)'};
  color: ${({ $confidence }) =>
    $confidence === 'High' ? '#00FF88'
    : $confidence === 'Medium' ? '#FFB800'
    : $confidence === 'Keep' ? '#60C0F0'
    : 'rgba(224, 236, 244, 0.5)'};
`;

const MatchBar = styled.div<{ $value: number }>`
  height: 3px;
  background: rgba(96, 192, 240, 0.15);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $value }) => Math.min(100, $value)}%;
    background: ${({ $value }) =>
      $value > 70 ? '#00FF88' : $value > 40 ? '#FFB800' : '#FF4757'};
    border-radius: 2px;
  }
`;

// --- Pill selector ---

const PillBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const Pill = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => $active ? '#60c0f0' : 'rgba(96, 192, 240, 0.2)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.2)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60c0f0' : 'rgba(224, 236, 244, 0.65)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { border-color: rgba(96, 192, 240, 0.4); }
`;

// --- Exercise Selector ---

const ExerciseTag = styled.button<{ $selected: boolean }>`
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid ${({ $selected }) => $selected ? '#60c0f0' : 'rgba(96, 192, 240, 0.15)'};
  background: ${({ $selected }) => $selected ? 'rgba(96, 192, 240, 0.15)' : 'transparent'};
  color: ${({ $selected }) => $selected ? '#60c0f0' : 'rgba(224, 236, 244, 0.65)'};
  font-size: 12px;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s;
`;

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: rgba(0, 16, 64, 0.3);
  border-radius: 8px;
`;

// --- Categories ---

const CATEGORIES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body'];
const CATEGORY_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  arms: 'Arms', legs: 'Legs', core: 'Core', full_body: 'Full Body',
};

// --- Component ---

const VariationEnginePage: React.FC = () => {
  const api = useVariationAPI();

  // Config state
  const [clientId, setClientId] = useState<string>('');
  const [category, setCategory] = useState<string>('chest');
  const [rotationPattern, setRotationPattern] = useState<string>('standard');
  const [nasmPhase, setNasmPhase] = useState<string>('');

  // Data state
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [nextType, setNextType] = useState<'build' | 'switch'>('build');
  const [suggestions, setSuggestions] = useState<SwapSuggestion[] | null>(null);
  const [logId, setLogId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exercises for current category
  useEffect(() => {
    api.getExercises({ category: category === 'full_body' ? undefined : category })
      .then(res => setExercises(res.exercises))
      .catch(() => {});
  }, [api, category]);

  // Load timeline when clientId + category are set
  const loadTimeline = useCallback(async () => {
    const cid = parseInt(clientId, 10);
    if (isNaN(cid)) return;
    try {
      const res = await api.getTimeline(cid, category, rotationPattern);
      setTimeline(res.timeline);
      setNextType(res.nextSessionType);
    } catch {
      // silent
    }
  }, [api, clientId, category, rotationPattern]);

  useEffect(() => {
    if (clientId) loadTimeline();
  }, [clientId, category, rotationPattern, loadTimeline]);

  // Toggle exercise selection
  const toggleExercise = (key: string) => {
    setSelectedExercises(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Generate suggestions
  const handleGenerate = async () => {
    const cid = parseInt(clientId, 10);
    if (isNaN(cid) || selectedExercises.length === 0) return;

    setLoading(true);
    setSuggestions(null);
    setAccepted(false);
    setError(null);
    try {
      const res = await api.suggest({
        clientId: cid,
        templateCategory: category,
        exercises: selectedExercises,
        rotationPattern,
        nasmPhase: nasmPhase || undefined,
      });
      setSuggestions(res.suggestions);
      setLogId(res.logId);
      setNextType(res.sessionType);
      loadTimeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Accept suggestions
  const handleAccept = async () => {
    if (!logId) return;
    try {
      await api.accept(logId);
      setAccepted(true);
      setError(null);
      loadTimeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept variation');
    }
  };

  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>Workout Variation Engine</Title>
          <Subtitle>NASM-aligned exercise rotation — keep workouts fresh while maintaining progressive overload</Subtitle>
        </Header>

        {/* Config Section */}
        <Section>
          <SectionTitle>Configuration</SectionTitle>
          <FormRow>
            <FormGroup style={{ flex: 1 }}>
              <Label>Client ID</Label>
              <Input
                type="number"
                placeholder="Enter client ID"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              />
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label>Rotation Pattern</Label>
              <Select value={rotationPattern} onChange={e => setRotationPattern(e.target.value)}>
                <option value="standard">Standard (2:1) BUILD-BUILD-SWITCH</option>
                <option value="aggressive">Aggressive (1:1) BUILD-SWITCH</option>
                <option value="conservative">Conservative (3:1) BUILD-BUILD-BUILD-SWITCH</option>
              </Select>
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label>NASM Phase (optional)</Label>
              <Select value={nasmPhase} onChange={e => setNasmPhase(e.target.value)}>
                <option value="">Any</option>
                <option value="1">Phase 1 - Stabilization</option>
                <option value="2">Phase 2 - Strength Endurance</option>
                <option value="3">Phase 3 - Hypertrophy</option>
                <option value="4">Phase 4 - Max Strength</option>
                <option value="5">Phase 5 - Power</option>
              </Select>
            </FormGroup>
          </FormRow>
        </Section>

        {/* 2-Week Timeline */}
        {clientId && (
          <Section>
            <SectionTitle>Rotation Timeline</SectionTitle>
            <TimelineWrapper>
              {timeline.map((entry, i) => (
                <TimelineNode key={entry.id} $type={entry.sessionType}>
                  <NodeCircle $type={entry.sessionType}>
                    {entry.sessionType === 'build' ? 'B' : 'S'}
                  </NodeCircle>
                  <NodeLabel>
                    {entry.sessionType === 'build' ? `Build ${entry.sessionNumber}` : 'Switch'}
                  </NodeLabel>
                </TimelineNode>
              ))}
              {/* Next session indicator */}
              <TimelineNode $type={nextType} $current>
                <NextNodeCircle $type={nextType} $current>
                  {nextType === 'build' ? 'B' : 'S'}
                </NextNodeCircle>
                <NodeLabel style={{ color: '#60c0f0' }}>
                  Next: {nextType === 'build' ? 'Build' : 'Switch'}
                </NodeLabel>
              </TimelineNode>
            </TimelineWrapper>
          </Section>
        )}

        {/* Category + Exercise Selection */}
        <Section>
          <SectionTitle>Select Exercises</SectionTitle>
          <PillBar>
            {CATEGORIES.map(c => (
              <Pill
                key={c}
                $active={category === c}
                onClick={() => { setCategory(c); setSelectedExercises([]); }}
              >
                {CATEGORY_LABELS[c]}
              </Pill>
            ))}
          </PillBar>

          <TagGrid>
            {exercises.map(ex => (
              <ExerciseTag
                key={ex.key}
                $selected={selectedExercises.includes(ex.key)}
                onClick={() => toggleExercise(ex.key)}
              >
                {ex.name}
              </ExerciseTag>
            ))}
          </TagGrid>

          {selectedExercises.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(224, 236, 244, 0.65)' }}>
              {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </Section>

        {/* Generate Button */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <PrimaryButton
            onClick={handleGenerate}
            disabled={loading || !clientId || selectedExercises.length === 0}
          >
            {loading ? 'Generating...' : 'Generate Variation'}
          </PrimaryButton>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16,
            background: 'rgba(255, 71, 87, 0.1)',
            border: '1px solid rgba(255, 71, 87, 0.25)',
            color: '#FF4757', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Swap Suggestions */}
        <AnimatePresence>
          {suggestions && (
            <Section>
              <SectionTitle>
                {nextType === 'switch' ? 'Swap Suggestions' : 'BUILD Session — Same Exercises'}
              </SectionTitle>

              {suggestions.map((swap, i) => (
                <SwapCardWrapper
                  key={swap.original}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SwapRow>
                    <ExerciseBox $muted={swap.replacement !== swap.original}>
                      <ExerciseName>{swap.originalName || swap.original}</ExerciseName>
                      <ExerciseMeta>Original</ExerciseMeta>
                    </ExerciseBox>

                    {swap.replacement && swap.replacement !== swap.original && (
                      <>
                        <SwapArrow>&#8594;</SwapArrow>
                        <ExerciseBox>
                          <ExerciseName>
                            {swap.replacementName || swap.replacement}
                            <NasmBadge $confidence={swap.nasmConfidence}>
                              {swap.nasmConfidence === 'High' ? 'NASM Match'
                                : swap.nasmConfidence === 'Medium' ? 'NASM Close'
                                : swap.nasmConfidence}
                            </NasmBadge>
                          </ExerciseName>
                          <ExerciseMeta>
                            {swap.muscleMatch}% muscle match
                            {swap.muscles && ` | ${swap.muscles.slice(0, 3).join(', ')}`}
                          </ExerciseMeta>
                          <MatchBar $value={swap.muscleMatch} />
                        </ExerciseBox>
                      </>
                    )}

                    {(!swap.replacement || swap.replacement === swap.original) && (
                      <NasmBadge $confidence="Keep" style={{ marginLeft: 8 }}>
                        Keep
                      </NasmBadge>
                    )}
                  </SwapRow>
                </SwapCardWrapper>
              ))}

              {!accepted && (
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <PrimaryButton onClick={handleAccept}>
                    Accept Variation
                  </PrimaryButton>
                  <GhostButton onClick={() => { setSuggestions(null); setLogId(null); }}>
                    Discard
                  </GhostButton>
                </div>
              )}

              {accepted && (
                <div style={{
                  padding: 12, borderRadius: 8,
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                  color: '#00FF88', fontSize: 14, fontWeight: 600, marginTop: 16,
                }}>
                  Variation accepted and logged.
                </div>
              )}
            </Section>
          )}
        </AnimatePresence>
      </Container>
    </PageWrapper>
  );
};

// --- Error Boundary ---

class VariationEngineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <Container style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(224, 236, 244, 0.7)', marginBottom: 8 }}>
              Something went wrong
            </div>
            <p style={{ color: 'rgba(224, 236, 244, 0.65)', marginBottom: 16 }}>
              The Variation Engine encountered an error.
            </p>
            <PrimaryButton onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </Container>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const VariationEnginePageWithBoundary: React.FC = () => (
  <VariationEngineErrorBoundary>
    <VariationEnginePage />
  </VariationEngineErrorBoundary>
);

export default VariationEnginePageWithBoundary;
