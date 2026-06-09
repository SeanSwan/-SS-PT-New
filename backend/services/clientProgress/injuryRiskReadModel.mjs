// backend/services/clientProgress/injuryRiskReadModel.mjs

import {
  clampScore,
  formatBodyRegion,
  mean,
  toMetricNumber,
  toPercentScore,
  unwrapRow,
  unwrapRows,
} from './progressScoring.mjs';
import {
  buildInjuryRiskRecommendations,
  correctiveProtocol,
} from './injuryRiskRecommendations.mjs';
import { sessionAssessment } from './injuryRiskSessionAssessment.mjs';

const PROGRESS_FIELDS = [
  { label: 'Balance', field: 'balanceLevel' },
  { label: 'Stability', field: 'stabilityLevel' },
  { label: 'Flexibility', field: 'flexibilityLevel' },
  { label: 'Injury Prevention', field: 'injuryPreventionLevel' },
  { label: 'Injury Recovery', field: 'injuryRecoveryLevel' },
];

const CAPACITY_FIELD_NAMES = PROGRESS_FIELDS.map(({ field }) => field);

const riskFromScore = (score) => {
  if (score >= 70) return 'high';
  return score >= 40 ? 'medium' : 'low';
};

const findingStatusFromScore = (score) => {
  if (score >= 70) return 'caution';
  return score >= 40 ? 'attention' : 'good';
};

const splitMovementList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 4);

const painRecommendation = (entry, movements) => (
  entry.aiNotes
    || (movements.length
      ? `Modify or avoid: ${movements.join(', ')}.`
      : 'Review this active pain entry before loading the affected region.')
);

const painFinding = (entry) => {
  const painScore = clampScore(toMetricNumber(entry.painLevel) * 10);
  const movements = splitMovementList(entry.aggravatingMovements);
  return {
    pattern: `${formatBodyRegion(entry.bodyRegion)} pain`,
    status: findingStatusFromScore(painScore),
    notes: `${entry.side || 'center'} ${entry.painType || 'reported'} pain at ${toMetricNumber(entry.painLevel)}/10.`,
    recommendation: painRecommendation(entry, movements),
  };
};

const painAlert = (entry) => ({
  severity: 'high',
  title: 'Active high pain entry',
  description: `${formatBodyRegion(entry.bodyRegion)} is logged at ${toMetricNumber(entry.painLevel)}/10.`,
  action: 'Modify or defer loaded work for that region until reviewed by the trainer.',
  timeframe: 'Before next session',
});

const painAssessment = (painRows) => {
  if (!painRows.length) return { category: null, alerts: [] };
  const maxPainScore = Math.max(...painRows.map((entry) => clampScore(toMetricNumber(entry.painLevel) * 10)));
  return {
    category: {
      id: 'active-pain',
      name: 'Active Pain Reports',
      risk: riskFromScore(maxPainScore),
      score: maxPainScore,
      icon: 'alert-triangle',
      findings: painRows.slice(0, 8).map(painFinding),
    },
    alerts: painRows
      .filter((entry) => toMetricNumber(entry.painLevel) >= 7)
      .slice(0, 3)
      .map(painAlert),
  };
};

const capacityFinding = (progress, { label, field }) => {
  const levelScore = toPercentScore(progress[field]);
  return {
    pattern: `${label} progression`,
    status: levelScore >= 70 ? 'good' : levelScore >= 40 ? 'attention' : 'caution',
    notes: `${levelScore}% progression signal from saved client progress.`,
    recommendation: levelScore >= 70
      ? `Maintain ${label.toLowerCase()} exposure while progressing load.`
      : `Bias the next plan toward ${label.toLowerCase()} before adding complexity.`,
  };
};

const movementCapacityCategory = (progress) => {
  if (!progress) return null;
  const capacityScores = PROGRESS_FIELDS.map(({ field }) => toPercentScore(progress[field]));
  const capacityRisk = clampScore(100 - mean(capacityScores));
  return {
    id: 'movement-capacity',
    name: 'Movement Capacity',
    risk: riskFromScore(capacityRisk),
    score: capacityRisk,
    icon: 'activity',
    findings: PROGRESS_FIELDS.map((fieldConfig) => capacityFinding(progress, fieldConfig)),
  };
};

const riskScoreFromCategories = (categories) => (categories.length
  ? clampScore((mean(categories.map((category) => category.score)) + Math.max(...categories.map((category) => category.score))) / 2)
  : 0);

export const buildInjuryRiskAssessment = ({
  clientProgress,
  painEntries,
  recentSessions,
}) => {
  const progress = unwrapRow(clientProgress);
  const painRows = unwrapRows(painEntries);
  const sessionRows = unwrapRows(recentSessions);
  const pain = painAssessment(painRows);
  const capacityCategory = movementCapacityCategory(progress);
  const sessions = sessionAssessment(sessionRows);
  const categories = [pain.category, capacityCategory, ...sessions.categories].filter(Boolean);
  const criticalAlerts = [...pain.alerts, ...sessions.alerts];
  const riskScore = riskScoreFromCategories(categories);

  return {
    overallRisk: riskFromScore(riskScore),
    riskScore,
    lastAssessment: new Date().toISOString(),
    categories,
    criticalAlerts,
    recommendations: buildInjuryRiskRecommendations({
      categories,
      painRows,
      progress,
      capacityFieldNames: CAPACITY_FIELD_NAMES,
    }),
    correctiveProtocol: correctiveProtocol(painRows),
  };
};
