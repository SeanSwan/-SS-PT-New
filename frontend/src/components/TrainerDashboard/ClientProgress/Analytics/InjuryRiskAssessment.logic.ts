import type {
  CorrectiveExercise,
  CriticalAlert,
  RecommendationCategory,
  RiskFinding,
} from '../../../../services/enhanced-progress-analytics-service';

export const getRiskColor = (risk: string): string => {
  switch (risk) {
    case 'low':
    case 'good':
      return 'var(--status-success, #4CAF50)';
    case 'medium':
    case 'attention':
      return 'var(--status-warning, #FFC107)';
    case 'high':
    case 'caution':
      return 'var(--status-error, #FF6B6B)';
    default:
      return 'var(--text-muted, #A0A0A0)';
  }
};

export const protocolTone = {
  inhibit: {
    background: 'color-mix(in srgb, var(--status-error, #FF6B6B) 12%, transparent)',
    color: 'var(--status-error, #FF6B6B)',
    label: '1. Inhibit (Overactive)',
  },
  lengthen: {
    background: 'color-mix(in srgb, var(--status-warning, #FFC107) 12%, transparent)',
    color: 'var(--status-warning, #FFC107)',
    label: '2. Lengthen (Tight)',
  },
  activate: {
    background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
    color: 'var(--accent-primary, #60C0F0)',
    label: '3. Activate (Underactive)',
  },
  integrate: {
    background: 'color-mix(in srgb, var(--status-success, #4CAF50) 12%, transparent)',
    color: 'var(--status-success, #4CAF50)',
    label: '4. Integrate (Functional)',
  },
} as const;

export const criticalAlertKey = (alert: CriticalAlert): string => [
  alert.severity,
  alert.title,
  alert.timeframe,
  alert.action,
].join('|');

export const findingRowKey = (finding: RiskFinding): string => [
  finding.pattern,
  finding.status,
  finding.notes,
  finding.recommendation,
].join('|');

export const correctiveProtocolItemKey = (phase: string, item: CorrectiveExercise): string => [
  phase,
  item.muscle,
  item.exercise,
  item.duration || item.reps || '',
  item.frequency,
].join('|');

export const recommendationCategoryKey = (
  category: RecommendationCategory,
): string => category.category;

export const recommendationItemKey = (
  category: RecommendationCategory,
  item: string,
): string => [
  category.category,
  item,
].join('|');
