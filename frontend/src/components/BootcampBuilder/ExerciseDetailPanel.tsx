/**
 * ┌─── SUB-COMPONENT: ExerciseDetailPanel ──────────────────────┐
 * │ PARENT: BootcampBuilderPage                                  │
 * │ PURPOSE: Right panel — exercise detail, mods, Teach Me,     │
 * │          how-to-perform info, AI insights                    │
 * │ Props: selectedExercise, bootcamp explanations, AI panel     │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  Panel, PanelTitle, SectionDivider, DifficultyChip,
  ModGrid, ModChip, InsightCard,
} from './BootcampBuilderStyles';
import { formatMuscle } from './BootcampBuilderConstants';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import AITerminalPanel from '../Shared/AITerminalPanel';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import styled from 'styled-components';

interface ExerciseDetailPanelProps {
  selectedExercise: BootcampExercise | null;
  bootcamp: GeneratedBootcamp | null;
  equipmentProfileId: number | null;
}

// ── Teach Me Styled Components ──
const TeachMeWrap = styled.div`
  margin: 8px 0;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  overflow: hidden;
`;

const TeachMeHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent); }
`;

const TeachMeBody = styled.div`
  padding: 10px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const TeachMeRow = styled.div`
  margin-bottom: 8px;
`;

const TeachMeLabel = styled.span`
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

// ── Helper: generate exercise how-to from available data ──
function getExerciseTeachMe(ex: BootcampExercise) {
  const muscles = ex.muscleTargets?.split(',').map(m => m.trim()).filter(Boolean) || [];
  const equipment = ex.equipmentRequired || 'Bodyweight';
  const name = ex.exerciseName;

  // Build instruction text from exercise name patterns
  const tips: string[] = [];

  if (name.toLowerCase().includes('squat')) {
    tips.push('Stand with feet shoulder-width apart, toes slightly out. Push hips back and bend knees. Keep chest up and knees tracking over toes. Drive through heels to stand.');
  } else if (name.toLowerCase().includes('press') || name.toLowerCase().includes('push')) {
    tips.push('Maintain a stable base. Control the eccentric (lowering) phase. Press explosively through the concentric phase. Keep core braced throughout.');
  } else if (name.toLowerCase().includes('curl')) {
    tips.push('Keep elbows pinned to your sides. Control the weight through the full range of motion. Squeeze at the top of the movement. Lower slowly (3-4 seconds).');
  } else if (name.toLowerCase().includes('row')) {
    tips.push('Retract shoulder blades before pulling. Drive elbows back, squeezing between shoulder blades. Keep core tight and avoid momentum.');
  } else if (name.toLowerCase().includes('lunge')) {
    tips.push('Step forward with control. Lower until both knees are at ~90 degrees. Keep front knee behind toes. Push back to start through front heel.');
  } else if (name.toLowerCase().includes('plank') || name.toLowerCase().includes('hold')) {
    tips.push('Maintain a straight line from head to heels. Engage core by drawing belly button toward spine. Breathe steadily. Avoid letting hips sag or pike.');
  } else if (name.toLowerCase().includes('deadlift') || name.toLowerCase().includes('hinge')) {
    tips.push('Hinge at hips with soft knees. Keep spine neutral throughout. Drive hips forward to stand. Squeeze glutes at the top.');
  } else {
    tips.push('Focus on controlled movement through the full range of motion. Maintain proper alignment and core engagement. Breathe out during exertion, in during recovery.');
  }

  return { muscles, equipment, tips };
}

const ExerciseDetailPanel: React.FC<ExerciseDetailPanelProps> = ({
  selectedExercise, bootcamp, equipmentProfileId,
}) => {
  const [teachMeOpen, setTeachMeOpen] = useState(true);

  return (
    <Panel>
      <PanelTitle>Exercise Detail</PanelTitle>

      {selectedExercise ? (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {selectedExercise.exerciseName}
          </div>

          {/* ── Teach Me: How to Perform ── */}
          <TeachMeWrap>
            <TeachMeHeader onClick={() => setTeachMeOpen(!teachMeOpen)}>
              <BookOpen size={14} />
              How to Perform
              {teachMeOpen ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
            </TeachMeHeader>
            {teachMeOpen && (() => {
              const info = getExerciseTeachMe(selectedExercise);
              return (
                <TeachMeBody>
                  <TeachMeRow>
                    <TeachMeLabel>Target Muscles: </TeachMeLabel>
                    {info.muscles.length > 0 ? info.muscles.map(m => formatMuscle(m)).join(', ') : 'Full Body'}
                  </TeachMeRow>
                  <TeachMeRow>
                    <TeachMeLabel>Equipment: </TeachMeLabel>
                    {info.equipment}
                  </TeachMeRow>
                  <TeachMeRow>
                    <TeachMeLabel>Instructions: </TeachMeLabel>
                    {info.tips.map((t, i) => <div key={i} style={{ marginTop: 4 }}>{t}</div>)}
                  </TeachMeRow>
                  {selectedExercise.easyVariation && (
                    <TeachMeRow>
                      <TeachMeLabel>Easier Option: </TeachMeLabel>
                      {selectedExercise.easyVariation}
                    </TeachMeRow>
                  )}
                  {selectedExercise.hardVariation && (
                    <TeachMeRow>
                      <TeachMeLabel>Harder Option: </TeachMeLabel>
                      {selectedExercise.hardVariation}
                    </TeachMeRow>
                  )}
                </TeachMeBody>
              );
            })()}
          </TeachMeWrap>

          <SectionDivider>Difficulty Tiers</SectionDivider>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {selectedExercise.easyVariation && (
              <DifficultyChip $tier="easy">Easy: {selectedExercise.easyVariation}</DifficultyChip>
            )}
            {(selectedExercise as any).mediumVariation && (
              <DifficultyChip $tier="medium">Medium: {(selectedExercise as any).mediumVariation}</DifficultyChip>
            )}
            {selectedExercise.hardVariation && (
              <DifficultyChip $tier="hard">Hard: {selectedExercise.hardVariation}</DifficultyChip>
            )}
          </div>

          <SectionDivider>Pain Modifications</SectionDivider>
          {(selectedExercise.kneeMod || selectedExercise.shoulderMod || selectedExercise.ankleMod || selectedExercise.wristMod || selectedExercise.backMod) ? (
            <ModGrid>
              {selectedExercise.kneeMod && <ModChip>Knee: {selectedExercise.kneeMod}</ModChip>}
              {selectedExercise.shoulderMod && <ModChip>Shoulder: {selectedExercise.shoulderMod}</ModChip>}
              {selectedExercise.ankleMod && <ModChip>Ankle: {selectedExercise.ankleMod}</ModChip>}
              {selectedExercise.wristMod && <ModChip>Wrist: {selectedExercise.wristMod}</ModChip>}
              {selectedExercise.backMod && <ModChip>Back: {selectedExercise.backMod}</ModChip>}
            </ModGrid>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>No modifications available for this exercise</div>
          )}

          {selectedExercise.muscleTargets && (
            <>
              <SectionDivider>Muscle Targets</SectionDivider>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {selectedExercise.muscleTargets.split(',').map((m, i) => (
                  <ModChip key={i}>{formatMuscle(m)}</ModChip>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, opacity: 0.5, fontSize: 13 }}>
          Click an exercise to see how to perform it, difficulty tiers, and pain modifications
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

      <SectionDivider>AI Assistant</SectionDivider>
      <AITerminalPanel
        context="workout_generation"
        equipmentProfileId={equipmentProfileId}
        placeholder="Ask AI to modify this bootcamp class..."
        defaultOpen={false}
      />
    </Panel>
  );
};

export default React.memo(ExerciseDetailPanel);
