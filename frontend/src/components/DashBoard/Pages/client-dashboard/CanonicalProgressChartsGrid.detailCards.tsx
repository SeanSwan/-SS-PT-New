/**
 * COMPONENT: CanonicalProgressChartsGrid.detailCards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Detail and balance chart cards for the canonical progress grid.
 */

import React, { useState } from 'react';
import { BarChart3, Dumbbell, HeartPulse, Trophy } from 'lucide-react';
import ExerciseTimelineDrilldown, { RolodexRowTap } from './ExerciseTimelineDrilldown';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS } from '../../../Charts/chartTheme';
import { buildCategoryFacts, buildPrFacts, buildRecoveryFacts } from '../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../progress-proof/ProgressChartInsightBar';
import { EmptyCard, useNumericBarWidth } from './CanonicalProgressChartsGrid.primitives';
import ChartExpandTrigger from '../../progress-proof/ChartExpandTrigger';
import PrHighlightsBars, { buildPrDrilldownRows } from './CanonicalProgressChartsGrid.prBars';
import { buildExerciseFrequencyRows, buildNamedValueRows, buildRecoverySignalRows } from './CanonicalProgressChartsGrid.expandRows';
import {
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
  RecoveryAlertIcon,
} from './CanonicalProgressChartsGrid.styles';

export const PRTimelineCard: React.FC<{
  data: CanonicalProgressCharts['prTimeline'];
}> = ({ data }) => {
  const hasPrs = data.length > 0;

  return (
    <ChartCard data-testid="chart-card-prTimeline">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><Trophy size={16} /></CardIcon>
        <CardTitle>PR Highlights</CardTitle>
        <CardSubtitle>180 days</CardSubtitle>
        <ChartExpandTrigger
          title="PR Highlights"
          subtitle="Best lift per exercise — 180 days"
          renderChart={() => <PrHighlightsBars data={data} />}
          rows={buildPrDrilldownRows(data)}
          facts={buildPrFacts(data)}
        />
      </CardHeader>
      <ChartBody>
        {!hasPrs ? (
          <EmptyCard label="No PRs recorded yet" hint="Log lifts with weight to see PRs surface here." />
        ) : (
          <>
          <ProgressChartInsightBar facts={buildPrFacts(data)} />
          <PrHighlightsBars data={data} />
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

// Phase 4b extraction (Rule 4): the two Victory detail cards live in balanceCards.
export { AnchorLiftsCard, MovementPatternBalanceCard } from './CanonicalProgressChartsGrid.balanceCards';

export const ExerciseFrequencyCard: React.FC<{
  data: CanonicalProgressCharts['exerciseFrequency'];
}> = ({ data }) => {
  // 4d Rolodex: tap a ranking row to flip through that exercise's history.
  const [rolodexExercise, setRolodexExercise] = useState<string | null>(null);
  const fills = useNumericBarWidth(data as ChartPoint[]);
  const rowContent = (row: CanonicalProgressCharts['exerciseFrequency'][number], i: number) => (
    <>
      <BarLabel title={row.x}>{row.x}</BarLabel>
      <BarTrack>
        <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.arcticCyan} />
      </BarTrack>
      <BarValue>{row.y} x {row.sets} sets</BarValue>
    </>
  );
  const renderBars = (tappable = false) => (
    <BarList>
      {data.slice(0, 8).map((row, i) => (
        <BarRow key={row.x}>
          {tappable ? (
            <RolodexRowTap
              type="button"
              onClick={() => setRolodexExercise(String(row.x))}
              aria-label={`View full history for ${row.x}`}
            >
              {rowContent(row, i)}
            </RolodexRowTap>
          ) : rowContent(row, i)}
        </BarRow>
      ))}
    </BarList>
  );
  return (
    <ChartCard data-testid="chart-card-exerciseFrequency">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.arcticCyan}><Dumbbell size={16} /></CardIcon>
        <CardTitle>Exercise Frequency</CardTitle>
        <CardSubtitle>top 8 - tap for history</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Exercise Frequency"
          subtitle="Most-logged exercises, all time"
          renderChart={() => renderBars(false)}
          rows={buildExerciseFrequencyRows(data)}
          facts={buildCategoryFacts(data, { unit: 'logs', itemLabel: 'exercises' })}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No exercises logged yet" hint="Every logged exercise builds this ranking." />
        ) : (
          <>
          <ProgressChartInsightBar
            facts={buildCategoryFacts(data, { unit: 'logs', itemLabel: 'exercises' })}
          />
          {renderBars(true)}
          </>
        )}
      </ChartBody>
      {rolodexExercise && (
        <ExerciseTimelineDrilldown
          exerciseName={rolodexExercise}
          onClose={() => setRolodexExercise(null)}
        />
      )}
    </ChartCard>
  );
};

export const MuscleGroupBalanceCard: React.FC<{
  data: CanonicalProgressCharts['muscleGroupBalance'];
}> = ({ data }) => {
  const fills = useNumericBarWidth(data as ChartPoint[]);
  const renderBars = () => (
    <BarList>
      {data.map((row, i) => (
        <BarRow key={row.x}>
          <BarLabel>{row.x}</BarLabel>
          <BarTrack>
            <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
          </BarTrack>
          {/* Bodyweight-only groups (push-ups, planks, pull-ups) log weight 0,
              so their volume is 0. Show the set count instead of a bare "0" so
              the group reads as trained, not skipped. */}
          <BarValue>
            {row.y > 0 ? Math.round(row.y).toLocaleString() : `${row.sets} sets`}
          </BarValue>
        </BarRow>
      ))}
    </BarList>
  );
  return (
    <ChartCard data-testid="chart-card-muscleGroupBalance">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><BarChart3 size={16} /></CardIcon>
        <CardTitle>Muscle Group Volume</CardTitle>
        <CardSubtitle>lbs - 90 days</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Muscle Group Volume"
          subtitle="Training volume by muscle group, 90 days"
          renderChart={renderBars}
          rows={buildNamedValueRows(data, 'lbs')}
          facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'groups' })}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No muscle-group data yet" hint="Volume by muscle group builds as lifts are logged." />
        ) : (
          <>
          <ProgressChartInsightBar
            facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'groups' })}
          />
          {renderBars()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const RecoverySignalCard: React.FC<{
  data: CanonicalProgressCharts['recoverySignal'];
}> = ({ data }) => {
  const renderBars = () => (
    <BarList>
      {data.slice(0, 6).map((row) => (
        <BarRow key={row.x}>
          <BarLabel title={row.x}>
            <RecoveryAlertIcon size={11} />
            {row.x}
          </BarLabel>
          <BarTrack>
            <BarFill
              $pct={Math.min((row.y / Math.max(row.totalSets, 1)) * 100, 100)}
              $color={CHART_COLORS.crimsonFrost}
            />
          </BarTrack>
          <BarValue>
            {row.painFlags > 0 ? `${row.painFlags} pain` : ''}
            {row.painFlags > 0 && row.highRpeFlags > 0 ? ' - ' : ''}
            {row.highRpeFlags > 0 ? `${row.highRpeFlags} redline` : ''}
          </BarValue>
        </BarRow>
      ))}
    </BarList>
  );
  return (
    <ChartCard data-testid="chart-card-recoverySignal">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.crimsonFrost}><HeartPulse size={16} /></CardIcon>
        <CardTitle>Recovery Signals</CardTitle>
        <CardSubtitle>pain + RPE 9+ - 90 days</CardSubtitle>
        <ChartExpandTrigger
          title="Recovery Signals"
          subtitle="Exercises flagged by pain notes or redline sets, 90 days"
          renderChart={renderBars}
          rows={buildRecoverySignalRows(data)}
          facts={buildRecoveryFacts(data)}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard
            label="No recovery flags"
            hint="No pain notes or redline sets. Keep it up."
          />
        ) : (
          <>
          <ProgressChartInsightBar facts={buildRecoveryFacts(data)} />
          {renderBars()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};
