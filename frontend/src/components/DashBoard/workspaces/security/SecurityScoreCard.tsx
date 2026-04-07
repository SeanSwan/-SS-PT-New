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
import type { SecurityScore, SecurityScoreCategory } from './security.types';
import {
  SecurityCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ScoreBadge, MetricRow, MetricBox, MetricValue, MetricLabel,
} from './security.styles';

// --- Demo data -----------------------------------------------------------
const DEMO_SCORE: SecurityScore = {
  overall: 82,
  grade: 'B',
  lastAssessmentDate: '2026-04-05',
  trend: [76, 78, 75, 80, 79, 82, 82],
  categories: [
    { name: 'HTTPS Enforcement', score: 10, maxScore: 10, status: 'pass', detail: 'All traffic redirected to HTTPS. HSTS enabled.' },
    { name: 'Security Headers', score: 14, maxScore: 20, status: 'warn', detail: 'Missing Content-Security-Policy and Permissions-Policy headers.' },
    { name: 'Dependency Freshness', score: 12, maxScore: 20, status: 'warn', detail: '4 packages outdated. 2 have security patches available.' },
    { name: 'Known Vulnerabilities', score: 14, maxScore: 20, status: 'warn', detail: '2 high-severity CVEs in dependencies (sequelize, pg).' },
    { name: 'Auth Configuration', score: 18, maxScore: 20, status: 'pass', detail: 'JWT with RS256, httpOnly cookies, rate-limited login endpoint.' },
    { name: 'Config Hygiene', score: 14, maxScore: 10, status: 'pass', detail: 'No secrets in codebase. Env vars properly scoped. .env in .gitignore.' },
  ],
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle size={16} style={{ color: '#10B981' }} />,
  warn: <AlertTriangle size={16} style={{ color: '#F59E0B' }} />,
  fail: <XCircle size={16} style={{ color: '#EF4444' }} />,
};

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10B981', A: '#10B981', B: '#60C0F0', C: '#F59E0B', D: '#EF4444', F: '#EF4444',
};

// --- CategoryRow sub-component -------------------------------------------
const CategoryRow: React.FC<{ cat: SecurityScoreCategory }> = ({ cat }) => {
  const pct = Math.round((cat.score / cat.maxScore) * 100);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle, rgba(96,192,240,0.08))',
    }}>
      <div style={{ flexShrink: 0 }}>{STATUS_ICON[cat.status]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E0ECF4)', marginBottom: 4 }}>
          {cat.name}
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'var(--text-secondary, rgba(224,236,244,0.85))' }}>
          {cat.detail}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 14, fontWeight: 700, color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}>
          {cat.score}/{cat.maxScore}
        </span>
        {/* Progress bar */}
        <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(96,192,240,0.08)', marginTop: 4 }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 2,
            background: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    </div>
  );
};

// --- Component -----------------------------------------------------------
const SecurityScoreCard: React.FC = () => {
  const score = DEMO_SCORE;
  const totalEarned = score.categories.reduce((s, c) => s + c.score, 0);
  const totalPossible = score.categories.reduce((s, c) => s + c.maxScore, 0);
  const passCount = score.categories.filter(c => c.status === 'pass').length;
  const warnCount = score.categories.filter(c => c.status === 'warn').length;
  const failCount = score.categories.filter(c => c.status === 'fail').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Big score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreBadge $score={score.overall}>{score.overall}</ScoreBadge>
            <div>
              <div style={{
                fontFamily: 'Fira Code, monospace', fontSize: 32, fontWeight: 700, lineHeight: 1,
                color: GRADE_COLORS[score.grade] || '#E0ECF4',
              }}>
                {score.grade}
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'rgba(224,236,244,0.85)' }}>
                {totalEarned}/{totalPossible} pts
              </div>
            </div>
          </div>

          {/* Mini metrics */}
          <MetricRow style={{ flex: 1, marginBottom: 0 }}>
            <MetricBox>
              <MetricValue $color="#10B981">{passCount}</MetricValue>
              <MetricLabel>Passing</MetricLabel>
            </MetricBox>
            <MetricBox>
              <MetricValue $color="#F59E0B">{warnCount}</MetricValue>
              <MetricLabel>Warnings</MetricLabel>
            </MetricBox>
            <MetricBox>
              <MetricValue $color="#EF4444">{failCount}</MetricValue>
              <MetricLabel>Failing</MetricLabel>
            </MetricBox>
          </MetricRow>
        </div>
      </SecurityCard>

      {/* Trend + Categories side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Trend chart */}
        <SecurityCard>
          <CardTitle style={{ marginBottom: 12 }}>7-Day Score Trend</CardTitle>
          <VictoryChart height={160} padding={{ top: 15, bottom: 30, left: 40, right: 20 }}>
            <VictoryAxis
              tickValues={score.trend.map((_, i) => i)}
              tickFormat={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              style={{
                axis: { stroke: 'rgba(96,192,240,0.15)' },
                tickLabels: { fill: 'rgba(224,236,244,0.85)', fontSize: 9, fontFamily: 'Fira Code' },
              }}
            />
            <VictoryAxis
              dependentAxis
              domain={[0, 100]}
              style={{
                axis: { stroke: 'rgba(96,192,240,0.15)' },
                tickLabels: { fill: 'rgba(224,236,244,0.85)', fontSize: 9, fontFamily: 'Fira Code' },
                grid: { stroke: 'rgba(96,192,240,0.06)' },
              }}
            />
            <VictoryArea
              data={score.trend.map((y, x) => ({ x, y }))}
              style={{
                data: { fill: 'rgba(16,185,129,0.15)', stroke: '#10B981', strokeWidth: 2 },
              }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        </SecurityCard>

        {/* Category breakdown */}
        <SecurityCard>
          <CardTitle style={{ marginBottom: 8 }}>Category Breakdown</CardTitle>
          {score.categories.map(cat => (
            <CategoryRow key={cat.name} cat={cat} />
          ))}
        </SecurityCard>
      </div>
    </div>
  );
};

export default SecurityScoreCard;
