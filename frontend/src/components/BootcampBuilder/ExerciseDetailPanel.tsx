/**
 * ┌─── SUB-COMPONENT: ExerciseDetailPanel ──────────────────────┐
 * │ PARENT: BootcampBuilderPage                                  │
 * │ PURPOSE: Right panel — exercise detail, mods, Teach Me,     │
 * │          how-to-perform info, AI insights                    │
 * │ Props: selectedExercise, bootcamp explanations, AI panel     │
 * └──────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import {
  Panel, PanelTitle, SectionDivider, DifficultyChip,
  ModGrid, ModChip, InsightCard,
} from './BootcampBuilderStyles';
import { formatMuscle } from './BootcampBuilderConstants';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import AITerminalPanel from '../Shared/AITerminalPanel';
import ExerciseDetailMediaStage from './ExerciseDetailMediaStage';
import ExerciseDetailTeachMe, { isMeaningfulVariation } from './ExerciseDetailTeachMe';
export { getExerciseTeachMe, isMeaningfulVariation } from './ExerciseDetailTeachMe';

interface ExerciseDetailPanelProps {
  selectedExercise: BootcampExercise | null;
  bootcamp: GeneratedBootcamp | null;
  equipmentProfileId: number | null;
}

type BootcampExplanationRow = {
  type: string;
  message: string;
};

const bootcampMuscleTargetKey = (muscle: string): string =>
  `muscle|${muscle.trim().toLowerCase()}`;

const bootcampExplanationKey = (explanation: BootcampExplanationRow): string =>
  `${explanation.type}|${explanation.message}`;

const ExerciseDetailPanel: React.FC<ExerciseDetailPanelProps> = ({
  selectedExercise, bootcamp, equipmentProfileId,
}) => {

  return (
    <Panel>
      <PanelTitle>Exercise Detail</PanelTitle>

      {selectedExercise ? (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {selectedExercise.exerciseName}
          </div>

          <ExerciseDetailMediaStage exercise={selectedExercise} />

          <ExerciseDetailTeachMe selectedExercise={selectedExercise} />

          <SectionDivider>Difficulty Tiers</SectionDivider>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {isMeaningfulVariation(selectedExercise.easyVariation, selectedExercise.exerciseName) && (
              <DifficultyChip $tier="easy">Easy: {selectedExercise.easyVariation}</DifficultyChip>
            )}
            {isMeaningfulVariation((selectedExercise as any).mediumVariation, selectedExercise.exerciseName) && (
              <DifficultyChip $tier="medium">Medium: {(selectedExercise as any).mediumVariation}</DifficultyChip>
            )}
            {isMeaningfulVariation(selectedExercise.hardVariation, selectedExercise.exerciseName) && (
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
                {selectedExercise.muscleTargets.split(',').map((m) => (
                  <ModChip key={bootcampMuscleTargetKey(m)}>{formatMuscle(m)}</ModChip>
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
          <SectionDivider>Swan Coach Reasoning</SectionDivider>
          {bootcamp.explanations.map((exp) => (
            <InsightCard key={bootcampExplanationKey(exp)} $type={exp.type}>
              {exp.message}
            </InsightCard>
          ))}
        </>
      )}

      <SectionDivider>Swan Coach Assistant</SectionDivider>
      <AITerminalPanel
        context="workout_generation"
        equipmentProfileId={equipmentProfileId}
        placeholder="Ask Swan Coach to modify this bootcamp class..."
        defaultOpen={false}
      />
    </Panel>
  );
};

export default React.memo(ExerciseDetailPanel);
