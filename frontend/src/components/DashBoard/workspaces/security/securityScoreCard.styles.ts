/**
 * +--- STYLES: Security Score Card -----------------------------------+
 * | PARENT: SecurityScoreCard                                         |
 * | PURPOSE: Score-card-only layout primitives kept separate from the |
 * |          shared security styles so active panels remain readable.  |
 * +-------------------------------------------------------------------+
 */

import styled from 'styled-components';
import type { SecurityScore, SecurityScoreCategory } from './security.types';

type ScoreStatus = SecurityScoreCategory['status'];
type ScoreGrade = SecurityScore['grade'];

const statusColor = (status: ScoreStatus) => {
  if (status === 'pass') return 'var(--feedback-success, #10B981)';
  if (status === 'warn') return 'var(--feedback-warning, #F59E0B)';
  return 'var(--feedback-danger, #EF4444)';
};

const percentColor = (percent: number) => {
  if (percent >= 80) return 'var(--feedback-success, #10B981)';
  if (percent >= 50) return 'var(--feedback-warning, #F59E0B)';
  return 'var(--feedback-danger, #EF4444)';
};

const gradeColor = (grade: ScoreGrade) => {
  if (grade === 'A+' || grade === 'A') return 'var(--feedback-success, #10B981)';
  if (grade === 'B') return 'var(--accent-primary, #60C0F0)';
  if (grade === 'C') return 'var(--feedback-warning, #F59E0B)';
  return 'var(--feedback-danger, #EF4444)';
};

export const ScoreCardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const OverallScoreRow = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
`;

export const ScoreSummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const GradeValue = styled.div<{ $grade: ScoreGrade }>`
  font-family: 'Fira Code', monospace;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: ${({ $grade }) => gradeColor($grade)};
`;

export const PointsText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const FlexibleMetricRow = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

export const TrendCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const CardTitleCompact = styled.h3<{ $bottom?: number }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 ${({ $bottom = 8 }) => $bottom}px;
  color: var(--text-primary, #E0ECF4);
`;

export const CategoryRowShell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
`;

export const CategoryStatusIcon = styled.div<{ $status: ScoreStatus }>`
  flex-shrink: 0;
  color: ${({ $status }) => statusColor($status)};
`;

export const CategoryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CategoryName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
`;

export const CategoryDetail = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const CategoryScoreWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
`;

export const CategoryScoreText = styled.span<{ $percent: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $percent }) => percentColor($percent)};
`;

export const ProgressTrack = styled.div`
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-subtle, rgba(96, 192, 240, 0.08));
  margin-top: 4px;
`;

export const ProgressFill = styled.div<{ $percent: number }>`
  width: ${({ $percent }) => $percent}%;
  height: 100%;
  border-radius: 2px;
  background: ${({ $percent }) => percentColor($percent)};
  transition: width 0.3s ease;
`;
