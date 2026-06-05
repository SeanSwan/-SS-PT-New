/**
 * COMPONENT: WorkoutPlannerGeneratedPlanSection
 * PURPOSE: Renders generated multi-week plan schedules, mesocycles, PDF export,
 * long-horizon weeks, and AI recommendations outside the planner page shell.
 */

import React from 'react';
import { Calendar, Download } from 'lucide-react';
import LongHorizonScheduleView from './LongHorizonScheduleView';
import type { GeneratedPlan, PlannerClient } from './WorkoutPlannerTypes';
import { workoutPlannerRecommendationKey } from './WorkoutPlannerRowKeys';
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
  RecommendationSource,
} from './WorkoutPlannerPage.styles';

interface WorkoutPlannerGeneratedPlanSectionProps {
  generatedPlan: GeneratedPlan | null;
  selectedMesoDay: number;
  phaseNumber: number;
  selectedClient: PlannerClient | null;
  onSelectedMesoDayChange: (dayNumber: number) => void;
  onPhaseNumberChange: (phaseNumber: number) => void;
}

const WorkoutPlannerGeneratedPlanSection: React.FC<WorkoutPlannerGeneratedPlanSectionProps> = ({
  generatedPlan,
  selectedMesoDay,
  phaseNumber,
  selectedClient,
  onSelectedMesoDayChange,
  onPhaseNumberChange,
}) => {
  if (!generatedPlan) return null;

  const activeDay = generatedPlan.weeklySchedule.find(day => day.dayNumber === selectedMesoDay);

  return (
    <MesocycleSection>
      <MesocycleSectionTitle>
        <Calendar size={18} />
        {generatedPlan.planSummary.durationWeeks}-Week Periodized Plan
        {' - '}
        {generatedPlan.planSummary.totalSessions} Total Sessions
        <ExportPdfBtn
          type="button"
          onClick={async () => {
            const { exportPopulatedPlanPDF } = await import('../../../../services/pdfExportService');
            exportPopulatedPlanPDF(
              generatedPlan as unknown as Parameters<typeof exportPopulatedPlanPDF>[0],
              selectedClient
                ? `${selectedClient.firstName} ${selectedClient.lastName}`
                : undefined,
              selectedClient?.clientSource,
            );
          }}
          aria-label="Export this plan as a branded PDF"
        >
          <Download size={14} />
          Export PDF
        </ExportPdfBtn>
      </MesocycleSectionTitle>

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
            Category: {activeDay.category} - Click exercises in the Rolodex to populate this day
          </ActiveDayMeta>
        </ActiveDayDetail>
      )}

      <PlanLabelBlock>Mesocycles (4-Week Blocks)</PlanLabelBlock>
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

      {Array.isArray(generatedPlan.weeks) && generatedPlan.weeks.length >= 4 && (
        <LongHorizonScheduleView weeks={generatedPlan.weeks} />
      )}

      {generatedPlan.recommendations.length > 0 && (
        <>
          <PlanLabelBlock $top>AI Recommendations</PlanLabelBlock>
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
  );
};

export default WorkoutPlannerGeneratedPlanSection;
