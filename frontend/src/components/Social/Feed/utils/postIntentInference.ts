import type { PostType } from '../types/CreatePostTypes';

export interface SmartPostIntent {
  submissionType: PostType;
  displayLabel: string | null;
  confidence: number;
  reason: string;
  hashtags: string[];
}

const CORE_LABELS: Record<PostType, string> = {
  general: 'Post',
  workout: 'Workout',
  transformation: 'Transformation',
  achievement: 'Achievement',
  challenge: 'Challenge',
  dance: 'Dance',
  music: 'Music Production',
  singing: 'Singing',
  art: 'Art',
  gaming: 'Gaming',
  comedy: 'Comedy',
};

const INTENT_RULES: Array<{
  type: PostType;
  label: string;
  hashtags: string[];
  patterns: RegExp[];
}> = [
  {
    type: 'achievement',
    label: 'Achievement',
    hashtags: ['#SwanProgress', '#Milestone'],
    patterns: [/\b(pr|personal record|milestone|unlocked|earned|badge|new record)\b/i],
  },
  {
    type: 'transformation',
    label: 'Transformation',
    hashtags: ['#SwanProgress', '#Transformation'],
    patterns: [/\b(transformation|before and after|before\/after|progress photo|progress pics?)\b/i],
  },
  {
    type: 'workout',
    label: 'Workout',
    hashtags: ['#WorkoutDiary', '#SwanProgress'],
    patterns: [/\b(workout|lift|lifting|sets?|reps?|squat|deadlift|bench|cardio|run|leg day|push day|pull day)\b/i],
  },
  {
    type: 'challenge',
    label: 'Challenge',
    hashtags: ['#ChallengeAccepted', '#SwanProgress'],
    patterns: [/\b(challenge|streak|day\s+\d+|join me|accountability)\b/i],
  },
  {
    type: 'dance',
    label: 'Dance',
    hashtags: ['#SwanCreative', '#Dance'],
    patterns: [/\b(dance|choreo|choreography|freestyle|shuffle)\b/i],
  },
  {
    type: 'music',
    label: 'Music Production',
    hashtags: ['#SwanCreative', '#MusicProduction'],
    patterns: [/\b(beat|producer|production|mix|track|instrumental|studio|songwriting)\b/i],
  },
  {
    type: 'singing',
    label: 'Singing',
    hashtags: ['#SwanCreative', '#Vocals'],
    patterns: [/\b(sing|singing|vocal|cover song|harmony|choir)\b/i],
  },
  {
    type: 'art',
    label: 'Art',
    hashtags: ['#SwanCreative', '#Art'],
    patterns: [/\b(art|painting|drawing|sketch|illustration|digital art|photography)\b/i],
  },
  {
    type: 'gaming',
    label: 'Gaming',
    hashtags: ['#SwanCreative', '#Gaming'],
    patterns: [/\b(game|gaming|stream|ranked|controller|quest)\b/i],
  },
  {
    type: 'comedy',
    label: 'Comedy',
    hashtags: ['#SwanCreative', '#Comedy'],
    patterns: [/\b(comedy|joke|skit|meme|funny|standup)\b/i],
  },
];

const DEFAULT_HASHTAGS = ['#SwanStudios', '#SwanProgress'];

const unique = (values: string[]) => Array.from(new Set(values)).slice(0, 5);

export const extractHashtags = (content: string): string[] => (
  content.match(/#[a-z0-9_]+/gi) || []
).map(tag => `#${tag.slice(1)}`);

export const inferSmartPostIntent = (
  content: string,
  selectedType: PostType = 'general',
): SmartPostIntent => {
  const existingTags = extractHashtags(content);
  const selectedLabel = CORE_LABELS[selectedType] || 'Post';
  const matchedRule = INTENT_RULES.find(rule =>
    rule.patterns.some(pattern => pattern.test(content))
  );

  const submissionType = selectedType === 'general' && matchedRule
    ? matchedRule.type
    : selectedType;
  const activeRule = matchedRule ?? INTENT_RULES.find(rule => rule.type === submissionType);
  const hashtags = unique([
    ...existingTags,
    ...(activeRule?.hashtags || []),
    ...(selectedType === 'general' ? DEFAULT_HASHTAGS : []),
  ]);

  return {
    submissionType,
    displayLabel: activeRule?.label || (selectedType !== 'general' ? selectedLabel : null),
    confidence: matchedRule ? 0.78 : 0.35,
    reason: matchedRule
      ? `Matched ${matchedRule.label.toLowerCase()} language in the caption.`
      : 'No strong label detected yet.',
    hashtags,
  };
};

export const appendHashtag = (content: string, hashtag: string): string => {
  if (!hashtag.startsWith('#') || content.toLowerCase().includes(hashtag.toLowerCase())) {
    return content;
  }
  return `${content.trimEnd()}${content.trim() ? ' ' : ''}${hashtag}`;
};
