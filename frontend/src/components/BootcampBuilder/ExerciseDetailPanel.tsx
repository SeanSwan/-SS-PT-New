/**
 * ┌─── SUB-COMPONENT: ExerciseDetailPanel ──────────────────────┐
 * │ PARENT: BootcampBuilderPage                                  │
 * │ PURPOSE: Right panel — exercise detail, mods, AI insights    │
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

interface ExerciseDetailPanelProps {
  selectedExercise: BootcampExercise | null;
  bootcamp: GeneratedBootcamp | null;
  equipmentProfileId: number | null;
}

const ExerciseDetailPanel: React.FC<ExerciseDetailPanelProps> = ({
  selectedExercise, bootcamp, equipmentProfileId,
}) => (
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

    <SectionDivider>AI Assistant</SectionDivider>
    <AITerminalPanel
      context="workout_generation"
      equipmentProfileId={equipmentProfileId}
      placeholder="Ask AI to modify this bootcamp class..."
      defaultOpen={false}
    />
  </Panel>
);

export default React.memo(ExerciseDetailPanel);
