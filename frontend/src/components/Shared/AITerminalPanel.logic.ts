import type { AIContext } from './AITerminalPanel.types';

export const DEEP_RESEARCH_LABEL = 'Deep Research';

export const CONTEXT_LABELS: Record<AIContext, string> = {
  coach_assistant: 'Deep Research — Coach Command Intelligence',
  general: DEEP_RESEARCH_LABEL,
  macro_logging: 'Deep Research — Nutrition Intelligence',
  form_tips: 'Deep Research — Movement Intelligence',
  workout_suggestions: 'Deep Research — Workout Intelligence',
  workout_generation: 'Deep Research — Workout Intelligence',
  client_review: 'Deep Research — Client Intelligence',
  data_management: 'Deep Research — Platform Intelligence',
  scheduling: 'Deep Research — Schedule Intelligence',
  progress_analysis: 'Deep Research — Progress Intelligence',
  exercise_library: 'Deep Research — Exercise Intelligence',
  gamification: 'Deep Research — Motivation Intelligence',
  client_onboarding: 'Deep Research — Client Onboarding Intelligence',
};

export const toDeepResearchLabel = (value?: string): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^Deep Research\b/i.test(trimmed)) return trimmed;

  const domain = trimmed
    .replace(/\b(AI|Assistant|Coach|Builder|Expert|Analyst)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return domain ? `Deep Research — ${domain} Intelligence` : DEEP_RESEARCH_LABEL;
};
