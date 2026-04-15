/**
 * ┌─── SUB-COMPONENT: SuggestedPrompts ───────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Context-aware prompt suggestions for empty chat    │
 * │ Props: { context, onSelect, visible }                       │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Chip click] → calls onSelect(promptText) → sends message  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Sparkles } from 'lucide-react';
import type { CoachContext } from './SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Prompt Suggestions by Context
// ─────────────────────────────────────────────────────────────
const PROMPT_MAP: Record<string, string[]> = {
  coach_assistant: [
    'Build me a 4-week training plan',
    'Review my client\'s progress',
    'What exercises target the posterior chain?',
    'Help me plan a deload week',
  ],
  general: [
    'What are the NASM OPT phases?',
    'How do I calculate 1RM?',
    'Explain progressive overload',
    'What\'s the difference between hypertrophy and strength?',
  ],
  workout_generation: [
    'Create a push/pull/legs split',
    'Design a full-body beginner program',
    'Build a HIIT circuit for fat loss',
    'Generate a Phase 1 stabilization workout',
  ],
  client_review: [
    'Summarize this client\'s progress',
    'What areas need improvement?',
    'Suggest next phase progression',
    'Flag any consistency issues',
  ],
  progress_analysis: [
    'Analyze strength trends over 8 weeks',
    'Compare volume across muscle groups',
    'What\'s their estimated 1RM progression?',
    'Identify training plateaus',
  ],
  scheduling: [
    'Optimize my weekly session layout',
    'How many rest days between muscle groups?',
    'Plan a 3-day training week',
    'Schedule deload every 4th week',
  ],
  macro_logging: [
    'What macros for a 180lb male cutting?',
    'Calculate TDEE for my client',
    'Protein timing around workouts',
    'Meal prep ideas for muscle gain',
  ],
  exercise_library: [
    'Best exercises for shoulder stability',
    'Alternatives to barbell back squat',
    'Corrective exercises for anterior pelvic tilt',
    'Cable exercises for chest development',
  ],
};

const DEFAULT_PROMPTS = [
  'What can you help me with?',
  'Show me what you can do',
  'Help me get started',
  'What features are available?',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
/*
 * Phase 11.1 CLS reduction 2026-04-14:
 * SuggestionsWrap is now ABSOLUTE-POSITIONED inside the MessagesArea
 * (which has position:relative set in CoachMessageStyles.ts). The
 * original implementation returned null on visible=false, causing the
 * entire ~150px block to unmount from the flex column and every
 * message below it to reflow up by ~150px — a guaranteed layout shift
 * on every first message send.
 *
 * By pinning the wrap to the center of the message area and controlling
 * visibility via opacity + pointer-events, messages flow independently
 * in document flow and no sibling shifts when the prompts appear/hide.
 * Transforms and opacity changes do NOT count as layout shifts per the
 * Web Vitals layout-shift API, so this is CLS-neutral.
 */
const SuggestionsWrap = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  max-width: 600px;
  width: 100%;
  pointer-events: ${(p) => (p.$visible ? 'auto' : 'none')};
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  /* CLAUDE.md rule 43: must use css\`\` helper when interpolating a
     keyframes object into a styled-component template. Using a plain
     template literal here would call fadeIn.toString() and bake the
     generated class name into the CSS output, crashing at mount. */
  ${(p) =>
    p.$visible &&
    css`
      animation: ${fadeIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `}
`;

const SuggestionsLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChipsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 600px;
`;

const PromptChip = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419));
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface SuggestedPromptsProps {
  context: CoachContext;
  onSelect: (prompt: string) => void;
  visible: boolean;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = memo(({ context, onSelect, visible }) => {
  const prompts = useMemo(
    () => PROMPT_MAP[context] || DEFAULT_PROMPTS,
    [context]
  );

  // Phase 11.1 CLS reduction: always-mounted wrapper, visibility driven
  // via opacity + pointer-events. Removing `return null` means the DOM
  // node stays in the tree but contributes ZERO to document flow
  // because it's position:absolute (see SuggestionsWrap styles above).
  return (
    <SuggestionsWrap
      $visible={visible}
      aria-hidden={!visible}
      data-testid="suggested-prompts"
    >
      <SuggestionsLabel>
        <Sparkles size={14} />
        Try asking
      </SuggestionsLabel>
      <ChipsGrid>
        {prompts.map(prompt => (
          <PromptChip
            key={prompt}
            onClick={() => onSelect(prompt)}
            tabIndex={visible ? 0 : -1}
          >
            {prompt}
          </PromptChip>
        ))}
      </ChipsGrid>
    </SuggestionsWrap>
  );
});

SuggestedPrompts.displayName = 'SuggestedPrompts';

export default SuggestedPrompts;
