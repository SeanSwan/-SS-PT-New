import type { AxiosInstance } from 'axios';

export type SwanAuraAwardableEventId =
  | 'encourage_friend'
  | 'welcome_new_member'
  | 'gratitude_given'
  | 'positive_progress_post'
  | 'challenge_cheer';

export interface SwanAuraProsocialAwardRequest {
  eventId: SwanAuraAwardableEventId;
  targetUserId?: string | number | null;
  contextType?: 'post' | 'comment' | 'challenge' | 'profile' | 'dashboard';
  contextId?: string | number | null;
}

export interface SwanAuraProsocialAwardResult {
  success: boolean;
  awarded?: boolean;
  duplicate?: boolean;
  status?: 'awarded' | 'duplicate' | 'daily_limit_reached' | 'cooldown_active' | 'requires_validation';
  pointsAwarded?: number;
  newBalance?: number;
  message?: string;
}

const SUPPORTIVE_COMMENT_PATTERNS = [
  /\b(you got this|keep going|proud of you|great job|amazing|strong work|lets go|let's go)\b/i,
  /\b(congrats|congratulations|inspiring|inspired|motivation|motivating)\b/i,
  /\b(beautiful progress|nice progress|big win|huge win|win)\b/i,
];

const GRATITUDE_COMMENT_PATTERNS = [
  /\b(thank you|thanks|appreciate you|appreciate this|grateful|gratitude)\b/i,
];

export function inferSwanAuraCommentEvent(content: string): SwanAuraAwardableEventId | null {
  const text = content.trim();
  if (text.length < 8) return null;
  if (GRATITUDE_COMMENT_PATTERNS.some((pattern) => pattern.test(text))) return 'gratitude_given';
  if (SUPPORTIVE_COMMENT_PATTERNS.some((pattern) => pattern.test(text))) return 'encourage_friend';
  return null;
}

export function shouldAwardPositiveProgressPost(type?: string | null): boolean {
  return ['workout', 'transformation', 'achievement', 'challenge'].includes(String(type || '').toLowerCase());
}

export async function awardSwanAuraProsocialXP(
  authAxios: AxiosInstance,
  request: SwanAuraProsocialAwardRequest,
): Promise<SwanAuraProsocialAwardResult | null> {
  try {
    const response = await authAxios.post('/api/social/unity-weaver/prosocial-events/award', request);
    return response.data || null;
  } catch (error) {
    // XP is a best-effort side effect. Never break the real social action.
    console.warn('[SwanAura] Prosocial XP award skipped', error);
    return null;
  }
}
