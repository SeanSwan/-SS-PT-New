/**
 * ============================================================================
 * FILE: CopilotDraftReview.tsx
 * PURPOSE: Draft review editor for AI-generated workout plans.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the full plan editor with safety constraint
 * badges, warning panels, editable plan header/days/exercises, explainability
 * grid, 1RM recommendation table, and trainer notes field. This is the
 * largest UI section of the copilot panel.
 *
 * HOW IT FITS IN THE APP: WorkoutCopilotPanel → CopilotDraftReview
 * (when state === 'draft_review' | 'approving')
 *
 * KEY DECISIONS: All editing callbacks are passed from the orchestrator to
 * keep state centralized. Exercise cards are rendered inline (not extracted
 * further) because they share tight coupling with the day accordion context.
 */

/**
 * ┌─── SUB-COMPONENT: CopilotDraftReview ─────────────────────┐
 * │ PARENT: WorkoutCopilotPanel                                 │
 * │ PURPOSE: Full plan editor with safety badges + AI explain   │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │ [Safety badges row]                    │                  │
 * │ │ [Warnings panel]                       │                  │
 * │ │ [Missing inputs panel]                 │                  │
 * │ │ Plan Name: [____]  Duration: [__]      │                  │
 * │ │ Summary: [__________]                  │                  │
 * │ │ ── Training Days (N) ──                │                  │
 * │ │ ▼ Day 1: Push — 4 exercises            │                  │
 * │ │   ┌─ Exercise 1 ──────────────────┐    │                  │
 * │ │   │ Name / Sets / Rest / Tempo    │    │                  │
 * │ │   └──────────────────────────────┘    │                  │
 * │ │   [+ Add Exercise]                    │                  │
 * │ │ ► Day 2: Pull (collapsed)              │                  │
 * │ │ ── AI Explainability ──                │                  │
 * │ │ [Data Sources] [Data Quality] [Phase]  │                  │
 * │ │ ── 1RM Recommendations ──              │                  │
 * │ │ [table of exercise recs]               │                  │
 * │ │ Coach Notes: [__________]              │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Day header] → toggleDay(idx) → expand/collapse             │
 * │ [Remove exercise] → removeExercise(dayIdx, exIdx)           │
 * │ [Add Exercise] → addExercise(dayIdx)                        │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import {
  Brain, AlertTriangle, Info, Shield,
} from 'lucide-react';
import type {
  WorkoutPlan, WorkoutDay, Exercise,
  Explainability, SafetyConstraints, ExerciseRecommendation,
} from './copilot-types';
import {
  BadgeRow,
  Badge,
  InfoPanel,
  InfoContent,
  FormGrid,
  FormGroup,
  Label,
  Input,
  TextArea,
  Divider,
  SectionTitle,
  ExplainabilityGrid,
  ExplainCard,
  ExplainLabel,
  ExplainValue,
} from './copilot-shared-styles';
import {
  FullWidthExplainCard,
  PanelIcon,
  RecommendationCell,
  RecommendationHeader,
  RecommendationHeadRow,
  RecommendationRow,
  RecommendationTable,
  RecommendationTableScroll,
} from './CopilotDraftReview.styles';
import CopilotDraftTrainingDaysEditor from './CopilotDraftTrainingDaysEditor';

interface CopilotDraftReviewProps {
  editedPlan: WorkoutPlan;
  explainability: Explainability | null;
  safetyConstraints: SafetyConstraints | null;
  exerciseRecs: ExerciseRecommendation[];
  warnings: string[];
  missingInputs: string[];
  generationMode: string;
  expandedDays: Set<number>;
  toggleDay: (dayIdx: number) => void;
  updatePlanField: <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => void;
  updateDay: <K extends keyof WorkoutDay>(dayIdx: number, field: K, value: WorkoutDay[K]) => void;
  updateExercise: <K extends keyof Exercise>(
    dayIdx: number,
    exIdx: number,
    field: K,
    value: Exercise[K],
  ) => void;
  addExercise: (dayIdx: number) => void;
  removeExercise: (dayIdx: number, exIdx: number) => void;
  trainerNotes: string;
  setTrainerNotes: (val: string) => void;
}

const CopilotDraftReview: React.FC<CopilotDraftReviewProps> = ({
  editedPlan,
  explainability,
  safetyConstraints,
  exerciseRecs,
  warnings,
  missingInputs,
  generationMode,
  expandedDays,
  toggleDay,
  updatePlanField,
  updateDay,
  updateExercise,
  addExercise,
  removeExercise,
  trainerNotes,
  setTrainerNotes,
}) => (
  <>
    {/* Safety constraints */}
    {safetyConstraints && (
      <BadgeRow>
        {safetyConstraints.medicalClearanceRequired && (
          <Badge $color="#ff6b6b">
            <Shield size={12} /> Medical Clearance Required
          </Badge>
        )}
        <Badge>
          Max Intensity: {safetyConstraints.maxIntensityPct}%
        </Badge>
        {safetyConstraints.movementRestrictions.map((r, i) => (
          <Badge key={i} $color="#ffaa00">{r}</Badge>
        ))}
        <Badge $color="#00ff64">{generationMode.replace(/_/g, ' ')}</Badge>
      </BadgeRow>
    )}

    {/* Warnings */}
    {warnings.length > 0 && (
      <InfoPanel $variant="warning">
        <PanelIcon><AlertTriangle size={16} /></PanelIcon>
        <InfoContent>
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </InfoContent>
      </InfoPanel>
    )}

    {/* Missing inputs */}
    {missingInputs.length > 0 && (
      <InfoPanel $variant="info">
        <PanelIcon><Info size={16} /></PanelIcon>
        <InfoContent>
          <strong>Missing data:</strong> {missingInputs.join(', ')}
        </InfoContent>
      </InfoPanel>
    )}

    {/* Plan header (editable) */}
    <FormGrid>
      <FormGroup $fullWidth>
        <Label>Plan Name</Label>
        <Input
          value={editedPlan.planName}
          onChange={(e) => updatePlanField('planName', e.target.value)}
          placeholder="Plan name"
          maxLength={200}
        />
      </FormGroup>
      <FormGroup>
        <Label>Duration (weeks)</Label>
        <Input
          type="number"
          min={1}
          max={52}
          value={editedPlan.durationWeeks}
          onChange={(e) => updatePlanField('durationWeeks', parseInt(e.target.value) || 1)}
        />
      </FormGroup>
      <FormGroup>
        <Label>Summary</Label>
        <TextArea
          value={editedPlan.summary || ''}
          onChange={(e) => updatePlanField('summary', e.target.value)}
          placeholder="Plan summary..."
          maxLength={2000}
        />
      </FormGroup>
    </FormGrid>

    <Divider />

    <CopilotDraftTrainingDaysEditor
      days={editedPlan.days}
      expandedDays={expandedDays}
      toggleDay={toggleDay}
      updateDay={updateDay}
      updateExercise={updateExercise}
      addExercise={addExercise}
      removeExercise={removeExercise}
    />

    <Divider />

    {/* Explainability panel (read-only) */}
    {explainability && (
      <>
        <SectionTitle><Brain size={16} /> AI Explainability</SectionTitle>
        <ExplainabilityGrid>
          <ExplainCard>
            <ExplainLabel>Data Sources</ExplainLabel>
            <ExplainValue>
              <BadgeRow>
                {explainability.dataSources.map((s) => (
                  <Badge key={s}>{s.replace(/_/g, ' ')}</Badge>
                ))}
              </BadgeRow>
            </ExplainValue>
          </ExplainCard>
          <ExplainCard>
            <ExplainLabel>Data Quality</ExplainLabel>
            <ExplainValue>{explainability.dataQuality}</ExplainValue>
          </ExplainCard>
          {explainability.phaseRationale && (
            <FullWidthExplainCard>
              <ExplainLabel>Phase Rationale</ExplainLabel>
              <ExplainValue>{explainability.phaseRationale}</ExplainValue>
            </FullWidthExplainCard>
          )}
        </ExplainabilityGrid>
      </>
    )}

    {/* Exercise recommendations (read-only) */}
    {exerciseRecs.length > 0 && (
      <>
        <Divider />
        <SectionTitle>1RM Recommendations</SectionTitle>
        <RecommendationTableScroll>
          <RecommendationTable>
            <thead>
              <RecommendationHeadRow>
                {['Exercise', 'Best', 'Est. 1RM', 'Load Range', 'Target'].map((h) => (
                  <RecommendationHeader key={h}>{h}</RecommendationHeader>
                ))}
              </RecommendationHeadRow>
            </thead>
            <tbody>
              {exerciseRecs.map((rec, i) => (
                <RecommendationRow key={i}>
                  <RecommendationCell $primary>{rec.exerciseName}</RecommendationCell>
                  <RecommendationCell>{rec.bestWeight}lb x{rec.bestReps}</RecommendationCell>
                  <RecommendationCell $accent>{Math.round(rec.estimated1RM)}lb</RecommendationCell>
                  <RecommendationCell>
                    {rec.loadRecommendation ? `${Math.round(rec.loadRecommendation.minLoad)}-${Math.round(rec.loadRecommendation.maxLoad)}lb` : '--'}
                  </RecommendationCell>
                  <RecommendationCell>
                    {rec.loadRecommendation?.targetReps || '--'}
                  </RecommendationCell>
                </RecommendationRow>
              ))}
            </tbody>
          </RecommendationTable>
        </RecommendationTableScroll>
      </>
    )}

    <Divider />

    {/* Trainer notes */}
    <FormGroup $fullWidth>
      <Label>Coach Notes (optional)</Label>
      <TextArea
        value={trainerNotes}
        onChange={(e) => setTrainerNotes(e.target.value)}
        placeholder="Rationale for edits, volume adjustments, etc."
        rows={3}
      />
    </FormGroup>
  </>
);

export default React.memo(CopilotDraftReview);
