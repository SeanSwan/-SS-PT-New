/**
 * FILE: SwanAuraComposeReview.ts
 * PURPOSE: Local, deterministic good-energy review for the Home quick composer.
 *
 * This is not moderation. It does not block posting, call AI providers, scan
 * private messages, or create records. It only produces a visible writing nudge
 * from the draft the user is already typing in the public/social composer.
 */

export type SwanAuraComposeReviewStatus = 'idle' | 'positive' | 'coach' | 'careful';

export interface SwanAuraComposeReview {
  status: SwanAuraComposeReviewStatus;
  label: string;
  message: string;
  suggestion?: string;
}

const SUPPORTIVE_TERMS = [
  'proud',
  'thank',
  'grateful',
  'encourage',
  'support',
  'love',
  'progress',
  'win',
  'strong',
  'keep going',
  'you got this',
];

const BROAD_BRUSH_PATTERNS = [
  /\byou people\b/i,
  /\beveryone always\b/i,
  /\bthey always\b/i,
  /\bthose people\b/i,
];

const INSULT_PATTERNS = [
  /\bstupid\b/i,
  /\bidiot\b/i,
  /\bdumb\b/i,
  /\btrash\b/i,
  /\bworthless\b/i,
];

function idleReview(): SwanAuraComposeReview {
  return {
    status: 'idle',
    label: 'Swan Aura',
    message: '',
  };
}

function hasExcessiveCaps(text: string): boolean {
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length < 12) return false;
  const uppercase = letters.replace(/[^A-Z]/g, '').length;
  return uppercase / letters.length > 0.72;
}

export function reviewSwanAuraPostDraft(rawText: string): SwanAuraComposeReview {
  const text = rawText.trim();
  if (text.length < 3) return idleReview();

  if (INSULT_PATTERNS.some(pattern => pattern.test(text))) {
    return {
      status: 'careful',
      label: 'Good Energy Check',
      message: 'This draft includes language that could make people defensive instead of inspired.',
      suggestion: 'Try naming the situation, the feeling, and the action you want next without insulting anyone.',
    };
  }

  if (BROAD_BRUSH_PATTERNS.some(pattern => pattern.test(text))) {
    return {
      status: 'careful',
      label: 'Bridge Builder Check',
      message: 'Broad labels can turn a real concern into an us-vs-them moment.',
      suggestion: 'Try making it specific: what happened, how it affected you, and what constructive outcome you want.',
    };
  }

  if (hasExcessiveCaps(text) || /!{3,}/.test(text)) {
    return {
      status: 'coach',
      label: 'Tone Coach',
      message: 'The energy is strong. A calmer version may land better and get more supportive replies.',
      suggestion: 'Keep the passion, but reduce all-caps or repeated punctuation before posting.',
    };
  }

  const lower = text.toLowerCase();
  if (SUPPORTIVE_TERMS.some(term => lower.includes(term))) {
    return {
      status: 'positive',
      label: 'Positive Ripple',
      message: 'This has supportive community energy. Honest encouragement helps SwanStudios feel different.',
    };
  }

  return idleReview();
}
