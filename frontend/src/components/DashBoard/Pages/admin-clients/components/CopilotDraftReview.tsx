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
  ChevronDown, ChevronRight, Plus, Trash2, Brain, AlertTriangle, Info, Shield,
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
  SmallInput,
  Divider,
  SectionTitle,
  DaySection,
  DayHeader,
  DayContent,
  ExerciseCard,
  ExerciseHeader,
  AddButton,
  RemoveButton,
  ExplainabilityGrid,
  ExplainCard,
  ExplainLabel,
  ExplainValue,
} from './copilot-shared-styles';
import {
  DayExerciseCount,
  ExerciseLabel,
  FullWidthExplainCard,
  PanelIcon,
  RecommendationCell,
  RecommendationHeader,
  RecommendationHeadRow,
  RecommendationRow,
  RecommendationTable,
  RecommendationTableScroll,
} from './CopilotDraftReview.styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

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

    {/* Days (collapsible) */}
    <SectionTitle>Training Days ({editedPlan.days.length})</SectionTitle>
    {editedPlan.days.map((day, dayIdx) => (
      <DaySection key={dayIdx}>
        <DayHeader onClick={() => toggleDay(dayIdx)}>
          {expandedDays.has(dayIdx) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Day {day.dayNumber}: {day.name}</span>
          <DayExerciseCount>
            {day.exercises.length} exercises
          </DayExerciseCount>
        </DayHeader>

        {expandedDays.has(dayIdx) && (
          <DayContent>
            <FormGrid>
              <FormGroup>
                <Label>Day Name</Label>
                <SmallInput
                  value={day.name}
                  onChange={(e) => updateDay(dayIdx, 'name', e.target.value)}
                  maxLength={100}
                />
              </FormGroup>
              <FormGroup>
                <Label>Focus</Label>
                <SmallInput
                  value={day.focus || ''}
                  onChange={(e) => updateDay(dayIdx, 'focus', e.target.value)}
                  placeholder="e.g. Chest, Shoulders"
                  maxLength={200}
                />
              </FormGroup>
            </FormGrid>

            {/* Exercises */}
            {day.exercises.map((ex, exIdx) => (
              <ExerciseCard key={exIdx}>
                <ExerciseHeader>
                  <ExerciseLabel>
                    Exercise {exIdx + 1}
                  </ExerciseLabel>
                  <RemoveButton onClick={() => removeExercise(dayIdx, exIdx)}>
                    <Trash2 size={14} />
                  </RemoveButton>
                </ExerciseHeader>
                <FormGrid>
                  <FormGroup>
                    <Label>Name</Label>
                    <SmallInput
                      value={ex.name}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      maxLength={200}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Sets x Reps</Label>
                    <SmallInput
                      value={ex.setScheme || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'setScheme', e.target.value)}
                      placeholder="e.g. 4x8-10"
                      maxLength={100}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Rest (seconds)</Label>
                    <SmallInput
                      type="number"
                      min={0}
                      max={600}
                      value={ex.restPeriod ?? ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'restPeriod', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Tempo</Label>
                    <SmallInput
                      value={ex.tempo || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'tempo', e.target.value)}
                      placeholder="e.g. 3-1-2-0"
                      maxLength={50}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label>Intensity Guideline</Label>
                    <SmallInput
                      value={ex.intensityGuideline || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'intensityGuideline', e.target.value)}
                      placeholder="e.g. 75-80% 1RM"
                      maxLength={500}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label>Notes</Label>
                    <SmallInput
                      value={ex.notes || ''}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'notes', e.target.value)}
                      placeholder="Coach notes..."
                      maxLength={1000}
                    />
                  </FormGroup>
                </FormGrid>
              </ExerciseCard>
            ))}
            <AddButton onClick={() => addExercise(dayIdx)}>
              <Plus size={14} /> Add Exercise
            </AddButton>
          </DayContent>
        )}
      </DaySection>
    ))}

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
