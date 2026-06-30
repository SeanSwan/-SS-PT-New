/**
 * Shared challenge template rule classifiers used by UI and view models.
 */

import type { ChallengeTemplate } from './useChallengeTemplates';

const ASSIGNED_SESSION_METRICS = new Set(['assigned_sessions_completed', 'team_assigned_sessions_completed']);
const ASSIGNED_SESSION_TAGS = new Set(['assigned_session', 'assigned_sessions', 'planned_assignment', 'planned_session', 'assigned_workout']);

const normalizeTemplateToken = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/-/g, '_');

export const isAssignedSessionChallengeTemplate = (template: Pick<ChallengeTemplate, 'rule' | 'tags'>) => {
  const rule = template.rule ?? { source: '', metric: '', validation: '' };
  const tags = Array.isArray(template.tags) ? template.tags.map(normalizeTemplateToken) : [];
  const metric = normalizeTemplateToken(rule.metric);

  return rule.assignedSessionOnly === true
    || rule.requiresAssignedSession === true
    || ASSIGNED_SESSION_METRICS.has(metric)
    || tags.some((tag) => ASSIGNED_SESSION_TAGS.has(tag));
};