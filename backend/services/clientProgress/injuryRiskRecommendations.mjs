// backend/services/clientProgress/injuryRiskRecommendations.mjs

import {
  formatBodyRegion,
  toPercentScore,
} from './progressScoring.mjs';

const emptyCorrectiveProtocol = () => ({
  inhibit: [],
  lengthen: [],
  activate: [],
  integrate: [],
});

const weakestCapacity = (progress, capacityFieldNames) => (progress ? capacityFieldNames
  .map((field) => ({ field, score: toPercentScore(progress[field]) }))
  .sort((a, b) => a.score - b.score)[0] : null);

export const buildInjuryRiskRecommendations = ({
  categories,
  painRows,
  progress,
  capacityFieldNames,
}) => {
  if (!categories.length) return [];
  const weakest = weakestCapacity(progress, capacityFieldNames);

  return [
    {
      category: 'Immediate',
      items: painRows.length
        ? ['Review active pain entries before loading affected regions.', 'Record pain-free movement modifications in the next workout log.']
        : ['Confirm current pain status before the next progression decision.'],
    },
    {
      category: 'Next Sessions',
      items: weakest
        ? [`Prioritize ${formatBodyRegion(weakest.field.replace('Level', ''))} work before adding complexity.`]
        : ['Keep workout duration and intensity recorded for risk tracking.'],
    },
    {
      category: 'Monitoring',
      items: ['Update intensity/RPE and pain notes after each trainer-led session.'],
    },
  ];
};

const correctivePhaseRows = (painRows, phase) => painRows.slice(0, 4).map((entry) => ({
  muscle: formatBodyRegion(entry.bodyRegion),
  ...phase,
}));

export const correctiveProtocol = (painRows) => (painRows.length ? {
  inhibit: correctivePhaseRows(painRows, {
    exercise: 'Trainer-approved tissue prep',
    duration: 'Record dosage in session notes',
    frequency: 'Before loaded work',
  }),
  lengthen: correctivePhaseRows(painRows, {
    exercise: 'Pain-free mobility drill',
    duration: 'Record range and tolerance',
    frequency: 'Warm-up block',
  }),
  activate: correctivePhaseRows(painRows, {
    exercise: 'Low-load activation pattern',
    reps: 'Record reps and response',
    frequency: 'Pre-workout',
  }),
  integrate: correctivePhaseRows(painRows, {
    exercise: 'Controlled movement re-introduction',
    reps: 'Pain-free sets only',
    frequency: 'Trainer discretion',
  }),
} : emptyCorrectiveProtocol());
