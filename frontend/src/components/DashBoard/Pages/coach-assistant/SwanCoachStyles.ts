/**
 * ============================================================================
 * FILE: SwanCoachStyles.ts
 * PURPOSE: Barrel re-export — all Coach Assistant styled components
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports from 5 focused style files.
 * Previously a 584-line monolith, now split per AI Village consensus.
 */

// Animations (shared keyframes)
export { fadeIn, pulseGlow, bounce } from './styles/CoachAnimations';

// Layout (page shell, header, welcome state)
export {
  CoachPage,
  CoachHeader,
  CoachTitle,
  CoachHeaderIcon,
  WelcomeWrap,
  WelcomeIcon,
  WelcomeTitle,
  WelcomeSubtitle,
} from './styles/CoachLayoutStyles';

// Messages (bubbles, timestamps, actions, typing indicator)
export {
  MessagesArea,
  MessageBubbleAI,
  MessageBubbleUser,
  MessageTime,
  MessageActions,
  MessageActionBtn,
  TypingWrap,
  TypingDot,
} from './styles/CoachMessageStyles';

// Chips (context chips, response style selector)
export {
  ChipBarWrap,
  ContextChipBtn,
  StyleBar,
  StyleBtn,
} from './styles/CoachChipStyles';

// Input (input bar, textarea, send button, voice orb, TTS toggle)
export {
  InputBar,
  ChatInput,
  SendBtn,
  VoiceOrbWrap,
  TtsToggle,
} from './styles/CoachInputStyles';
