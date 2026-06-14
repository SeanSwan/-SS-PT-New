import type { AITerminalQuickPrompt } from '../../../../Shared/AITerminalPanel.types';

export const ADMIN_OVERVIEW_ASSISTANT_PROMPTS: AITerminalQuickPrompt[] = [
  {
    label: 'Onboard now',
    description: 'Next client move',
    prompt: 'Give me the fastest safe client onboarding path from this admin overview. Prioritize intake, waiver, package/session setup, and first workout log.',
    sendImmediately: true,
  },
  {
    label: 'Who needs a log?',
    description: 'Daily coaching triage',
    prompt: 'Find the highest-value client workout logging moves for today. Tell me who needs a log, what to check, and the next click I should take.',
    sendImmediately: true,
  },
  {
    label: 'Money risk',
    description: 'Revenue blockers',
    prompt: 'Audit this admin overview for money-path risk: pending payments, missing sessions, renewals, package issues, and anything blocking a trainer from delivering.',
    sendImmediately: true,
  },
];
