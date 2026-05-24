/**
 * +--- PANEL: Security Score Card -------------------------------------+
 * | PARENT: SecurityWorkspace                                          |
 * | PURPOSE: Overall security health score (0-100) based on:           |
 * |          dependency freshness, known vulnerabilities, config       |
 * |          hygiene, HTTPS enforcement, header security. Victory      |
 * |          trend chart for score history.                            |
 * +--------------------------------------------------------------------+
 */

import React from 'react';
import { VictoryArea, VictoryChart, VictoryAxis } from 'victory';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SecurityScore, SecurityScoreCategory } from './security.types';
import {
  SecurityCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ScoreBadge, MetricBox, MetricValue, MetricLabel,
} from './security.styles';
import {
  CardTitleCompact, CategoryContent, CategoryDetail, CategoryName,
  CategoryRowShell, CategoryScoreText, CategoryScoreWrap, CategoryStatusIcon,
  FlexibleMetricRow, GradeValue, OverallScoreRow, PointsText, ProgressFill,
  ProgressTrack, ScoreCardStack, ScoreSummaryRow, TrendCategoryGrid,
} from './securityScoreCard.styles';

// --- Disconnected data state --------------------------------------------
const UNCONNECTED_DETAIL = 'No connected security assessment data yet.';

const UNCONNECTED_SCORE: SecurityScore = {
  overall: 0,
  grade: 'F',
  lastAssessmentDate: 'not connected',
  trend: [],
  categories: [
    { name: 'HTTPS Enforcement', score: 0, maxScore: 10, status: 'warn', detail: UNCONNECTED_DETAIL },
    { name: 'Security Headers', score: 0, maxScore: 20, status: 'warn', detail: UNCONNECTED_DETAIL },
    { name: 'Dependency Freshness', score: 0, maxScore: 20, status: 'warn', detail: UNCONNECTED_DETAIL },
    { name: 'Known Vulnerabilities', score: 0, maxScore: 20, status: 'warn', detail: UNCONNECTED_DETAIL },
    { name: 'Auth Configuration', score: 0, maxScore: 20, status: 'warn', detail: UNCONNECTED_DETAIL },
    { name: 'Config Hygiene', score: 0, maxScore: 10, status: 'warn', detail: UNCONNECTED_DETAIL },
  ],
};

const STATUS_ICON: Record<SecurityScoreCategory['status'], LucideIcon> = {
  pass: CheckCircle,
  warn: AlertTriangle,
  fail: XCircle,
};

const TREND_AXIS_STYLE = {
  axis: { stroke: 'var(--border-subtle, rgba(96, 192, 240, 0.15))' },
  tickLabels: {
    fill: 'var(--text-secondary, rgba(224, 236, 244, 0.85))',
    fontSize: 9,
    fontFamily: 'Fira Code',
  },
};

const TREND_DEPENDENT_AXIS_STYLE = {
  ...TREND_AXIS_STYLE,
  grid: { stroke: 'var(--border-subtle, rgba(96, 192, 240, 0.06))' },
};

const TREND_AREA_STYLE = {
  data: {
    fill: 'color-mix(in srgb, var(--feedback-success, #10B981) 15%, transparent)',
    stroke: 'var(--feedback-success, #10B981)',
    strokeWidth: 2,
  },
};

// --- CategoryRow sub-component -------------------------------------------
const CategoryRow: React.FC<{ cat: SecurityScoreCategory }> = ({ cat }) => {
  const pct = Math.round((cat.score / cat.maxScore) * 100);
  const Icon = STATUS_ICON[cat.status];

  return (
    <CategoryRowShell>
      <CategoryStatusIcon $status={cat.status}>
        <Icon size={16} />
      </CategoryStatusIcon>
      <CategoryContent>
        <CategoryName>{cat.name}</CategoryName>
        <CategoryDetail>{cat.detail}</CategoryDetail>
      </CategoryContent>
      <CategoryScoreWrap>
        <CategoryScoreText $percent={pct}>
          {cat.score}/{cat.maxScore}
        </CategoryScoreText>
        <ProgressTrack>
          <ProgressFill $percent={pct} />
        </ProgressTrack>
      </CategoryScoreWrap>
    </CategoryRowShell>
  );
};

// --- Component -----------------------------------------------------------
const SecurityScoreCard: React.FC = () => {
  const score = UNCONNECTED_SCORE;
  const totalEarned = score.categories.reduce((s, c) => s + c.score, 0);
  const totalPossible = score.categories.reduce((s, c) => s + c.maxScore, 0);
  const passCount = score.categories.filter(c => c.status === 'pass').length;
  const warnCount = score.categories.filter(c => c.status === 'warn').length;
  const failCount = score.categories.filter(c => c.status === 'fail').length;
  const trendData = score.trend.map((y, x) => ({ x, y }));

  return (
    <ScoreCardStack>
      {/* Overall score */}
      <SecurityCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg="rgba(16, 185, 129, 0.12)" $color="#10B981">
              <Shield size={18} />
            </IconWrap>
            <div>
              <CardTitle>Security Score Card</CardTitle>
              <CardSubtitle>Last assessed {score.lastAssessmentDate}</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <OverallScoreRow>
          {/* Big score */}
          <ScoreSummaryRow>
            <ScoreBadge $score={score.overall}>{score.overall}</ScoreBadge>
            <div>
              <GradeValue $grade={score.grade}>{score.grade}</GradeValue>
              <PointsText>
                {totalEarned}/{totalPossible} pts
              </PointsText>
            </div>
          </ScoreSummaryRow>

          {/* Mini metrics */}
          <FlexibleMetricRow>
            <MetricBox>
              <MetricValue $color="var(--feedback-success, #10B981)">{passCount}</MetricValue>
              <MetricLabel>Passing</MetricLabel>
            </MetricBox>
            <MetricBox>
              <MetricValue $color="var(--feedback-warning, #F59E0B)">{warnCount}</MetricValue>
              <MetricLabel>Warnings</MetricLabel>
            </MetricBox>
            <MetricBox>
              <MetricValue $color="var(--feedback-danger, #EF4444)">{failCount}</MetricValue>
              <MetricLabel>Failing</MetricLabel>
            </MetricBox>
          </FlexibleMetricRow>
        </OverallScoreRow>
      </SecurityCard>

      {/* Trend + Categories side by side */}
      <TrendCategoryGrid>
        {/* Trend chart */}
        <SecurityCard>
          <CardTitleCompact $bottom={12}>7-Day Score Trend</CardTitleCompact>
          <VictoryChart height={160} padding={{ top: 15, bottom: 30, left: 40, right: 20 }}>
            {React.createElement(VictoryAxis, {
              tickValues: score.trend.map((_, i) => i),
              tickFormat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              style: TREND_AXIS_STYLE,
            })}
            {React.createElement(VictoryAxis, {
              dependentAxis: true,
              domain: [0, 100],
              style: TREND_DEPENDENT_AXIS_STYLE,
            })}
            {React.createElement(VictoryArea, {
              data: trendData,
              style: TREND_AREA_STYLE,
              interpolation: 'monotoneX',
            })}
          </VictoryChart>
        </SecurityCard>

        {/* Category breakdown */}
        <SecurityCard>
          <CardTitle>Category Breakdown</CardTitle>
          {score.categories.map(cat => (
            <CategoryRow key={cat.name} cat={cat} />
          ))}
        </SecurityCard>
      </TrendCategoryGrid>
    </ScoreCardStack>
  );
};

export default SecurityScoreCard;
