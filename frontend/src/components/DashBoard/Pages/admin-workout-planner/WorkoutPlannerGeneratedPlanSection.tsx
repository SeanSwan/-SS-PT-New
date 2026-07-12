/**
 * COMPONENT: WorkoutPlannerGeneratedPlanSection
 * PURPOSE: Renders generated multi-week plan schedules, mesocycles, PDF export,
 * long-horizon weeks, and AI recommendations outside the planner page shell.
 */

import React, { useCallback, useState } from 'react';
import { AlertTriangle, Calendar, Download, MessageSquareText } from 'lucide-react';
import PdfApprovalVault from '../../../Shared/PdfApprovalVault';
import LongHorizonScheduleView from './LongHorizonScheduleView';
import type { GeneratedPlan, PlannerClient } from './WorkoutPlannerTypes';
import { workoutPlannerRecommendationKey } from './WorkoutPlannerRowKeys';
import { getGeneratedPlanQualityWarnings } from './workoutPlannerQualityWarnings';
import { withDisplayExerciseNamesForExport } from './workoutPlannerExerciseDisplay';
import {
  DeloadBadge,
  ExportPdfBtn,
  MesocycleGrid,
  MesocycleHeader,
  MesocycleOverload,
  MesocycleParam,
  MesocycleParams,
  MesocyclePhase,
  MesocycleSection,
  MesocycleSectionTitle,
  MesocycleTitle,
  MesocycleWeeks,
  RecommendationItem,
  RecommendationList,
  ScheduleDayFocus,
  ScheduleRow,
} from './WorkoutPlannerStyles';
import {
  ActiveDayDetail,
  ActiveDayMeta,
  ActiveDayTitle,
  ActiveScheduleDay,
  ActiveScheduleDayNumber,
  ClickableMesocycleCard,
  PlanLabelBlock,
  PlannerHandoffActions,
  PlannerHandoffLink,
  RecommendationSource,
} from './WorkoutPlannerPage.styles';

interface WorkoutPlannerGeneratedPlanSectionProps {
  generatedPlan: GeneratedPlan | null;
  selectedMesoDay: number;
  phaseNumber: number;
  selectedClient: PlannerClient | null;
  coachReviewRoute?: string | null;
  onSelectedMesoDayChange: (dayNumber: number) => void;
  onPhaseNumberChange: (phaseNumber: number) => void;
}

const WorkoutPlannerGeneratedPlanSection: React.FC<WorkoutPlannerGeneratedPlanSectionProps> = ({
  generatedPlan,
  selectedMesoDay,
  phaseNumber,
  selectedClient,
  coachReviewRoute,
  onSelectedMesoDayChange,
  onPhaseNumberChange,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Build the plan PDF as a blob for the Approval Vault: the SAME bytes are
  // previewed and then downloaded, and the brand is resolved from the client's
  // source so Sean can confirm branding before the doc reaches the client.
  const buildPlanFile = useCallback(async () => {
    if (!generatedPlan) return null;
    const { buildPopulatedPlanPdfBlob } = await import('../../../../services/pdfExportService');
    return buildPopulatedPlanPdfBlob(
      withDisplayExerciseNamesForExport(generatedPlan) as unknown as Parameters<typeof buildPopulatedPlanPdfBlob>[0],
      selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : undefined,
      selectedClient?.clientSource,
    );
  }, [generatedPlan, selectedClient]);

  if (!generatedPlan) return null;

  const activeDay = generatedPlan.weeklySchedule.find(day => day.dayNumber === selectedMesoDay);
  const equipmentContext = generatedPlan.equipmentContext;
  const qualityWarnings = getGeneratedPlanQualityWarnings(generatedPlan);
  const equipmentDescription = equipmentContext?.availableEquipment.length
    ? equipmentContext.availableEquipment.join(', ')
    : `Equipment profile ${equipmentContext?.profileId ?? 'selected'} constrained this plan`;

  return (
    <>
    <MesocycleSection>
      <MesocycleSectionTitle>
        <Calendar size={18} />
        {generatedPlan.planSummary.durationWeeks}-Week Periodized Plan
        {' - '}
        {generatedPlan.planSummary.totalSessions} Total Sessions
        <ExportPdfBtn
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label="Preview and download a branded PDF of this generated plan"
        >
          <Download size={14} />
          Preview &amp; Download
        </ExportPdfBtn>
        {coachReviewRoute && (
          <PlannerHandoffActions>
            <PlannerHandoffLink
              href={coachReviewRoute}
              aria-label={`Review generated day ${selectedMesoDay} in Coach`}
              $variant="primary"
            >
              <MessageSquareText size={14} />
              Coach Review
            </PlannerHandoffLink>
          </PlannerHandoffActions>
        )}
      </MesocycleSectionTitle>

      {qualityWarnings.length > 0 && (
        <>
          <PlanLabelBlock $top>
            <AlertTriangle size={14} aria-hidden="true" /> Coach Review Guardrails
          </PlanLabelBlock>
          <RecommendationList aria-label="Generated plan review warnings">
            {qualityWarnings.map((warning) => (
              <RecommendationItem key={warning.id}>
                {warning.label}
                <RecommendationSource>{warning.detail}</RecommendationSource>
              </RecommendationItem>
            ))}
          </RecommendationList>
        </>
      )}

      <PlanLabelBlock>Weekly Schedule</PlanLabelBlock>
      <ScheduleRow>
        {generatedPlan.weeklySchedule.map(day => (
          <ActiveScheduleDay
            key={day.dayNumber}
            as="button"
            type="button"
            onClick={() => onSelectedMesoDayChange(day.dayNumber)}
            $active={selectedMesoDay === day.dayNumber}
          >
            <ActiveScheduleDayNumber $active={selectedMesoDay === day.dayNumber}>
              Day {day.dayNumber}
            </ActiveScheduleDayNumber>
            <ScheduleDayFocus>{day.focus}</ScheduleDayFocus>
          </ActiveScheduleDay>
        ))}
      </ScheduleRow>

      {activeDay && (
        <ActiveDayDetail>
          <ActiveDayTitle>
            Day {activeDay.dayNumber}: {activeDay.focus}
          </ActiveDayTitle>
          <ActiveDayMeta>
            Category: {activeDay.category} - Review the detailed schedule before saving or assigning
          </ActiveDayMeta>
        </ActiveDayDetail>
      )}

      <PlanLabelBlock>Training Blocks</PlanLabelBlock>
      <MesocycleGrid>
        {generatedPlan.mesocycles.map(mesocycle => (
          <ClickableMesocycleCard
            key={mesocycle.mesocycle}
            $phase={mesocycle.nasmPhase}
            $selected={mesocycle.nasmPhase === phaseNumber}
            as="button"
            type="button"
            onClick={() => onPhaseNumberChange(mesocycle.nasmPhase)}
            title={`Click to switch to Phase ${mesocycle.nasmPhase}: ${mesocycle.phaseName}`}
          >
            <MesocycleHeader>
              <MesocycleTitle>Block {mesocycle.mesocycle}</MesocycleTitle>
              <MesocycleWeeks>Wk {mesocycle.weeks}</MesocycleWeeks>
            </MesocycleHeader>
            <MesocyclePhase $phase={mesocycle.nasmPhase}>
              Phase {mesocycle.nasmPhase}: {mesocycle.phaseName}
            </MesocyclePhase>
            <MesocycleParams>
              <MesocycleParam>Sets: <span>{mesocycle.params.sets}</span></MesocycleParam>
              <MesocycleParam>Reps: <span>{mesocycle.params.reps}</span></MesocycleParam>
              <MesocycleParam>Tempo: <span>{mesocycle.params.tempo}</span></MesocycleParam>
              <MesocycleParam>Rest: <span>{mesocycle.params.rest}</span></MesocycleParam>
              <MesocycleParam>Intensity: <span>{mesocycle.params.intensity}</span></MesocycleParam>
            </MesocycleParams>
            <MesocycleOverload>
              {mesocycle.overloadStrategy}
              {mesocycle.deloadWeek && <DeloadBadge>Deload Wk {mesocycle.deloadWeek}</DeloadBadge>}
            </MesocycleOverload>
          </ClickableMesocycleCard>
        ))}
      </MesocycleGrid>

      {Array.isArray(generatedPlan.weeks) && generatedPlan.weeks.length > 0 && (
        <LongHorizonScheduleView weeks={generatedPlan.weeks} />
      )}

      {equipmentContext && (
        <>
          <PlanLabelBlock $top>Training Environment</PlanLabelBlock>
          <RecommendationList>
            <RecommendationItem>
              {equipmentDescription}
              {equipmentContext.resistanceTypes.length > 0 ? (
                <RecommendationSource title="equipment resistance types">
                  ({equipmentContext.resistanceTypes.join(', ')})
                </RecommendationSource>
              ) : null}
            </RecommendationItem>
          </RecommendationList>
        </>
      )}

      {generatedPlan.recommendations.length > 0 && (
        <>
          <PlanLabelBlock $top>Swan Coach Recommendations</PlanLabelBlock>
          <RecommendationList>
            {generatedPlan.recommendations.map((recommendation, index) => {
              const detail = generatedPlan.recommendationDetails?.[index];
              return (
                <RecommendationItem key={workoutPlannerRecommendationKey(recommendation, detail)}>
                  {recommendation}
                  {detail?.sourceCitation ? (
                    <RecommendationSource title={`source: ${detail.sourceCitation}`}>
                      ({detail.type})
                    </RecommendationSource>
                  ) : null}
                </RecommendationItem>
              );
            })}
          </RecommendationList>
        </>
      )}
    </MesocycleSection>
    <PdfApprovalVault
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      documentLabel="training plan"
      buildFile={buildPlanFile}
    />
    </>
  );
};

export default WorkoutPlannerGeneratedPlanSection;
