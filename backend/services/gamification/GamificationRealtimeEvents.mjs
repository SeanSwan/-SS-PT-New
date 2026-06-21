import { emitGamificationEvent } from '../../socket/gamificationEvents.mjs';

const REALTIME_SOURCE_EVENT = {
  achievement_earned: 'achievement_unlocked',
  streak_bonus: 'streak_milestone',
  workout_completion: 'workout_completed'
};

function canEmitLedgerEvent(result, entry) {
  return Boolean(
    result
      && entry
      && !result.duplicate
      && result.pointsAwarded > 0
      && entry.transactionType !== 'spend'
      && entry.transactionType !== 'expire'
  );
}

function normalizeLevel(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function emitLedgerRealtimeEvent(result, entry) {
  if (!canEmitLedgerEvent(result, entry)) return;

  const event = REALTIME_SOURCE_EVENT[entry.source] || 'points_awarded';
  const newLevel = normalizeLevel(result.newLevel);
  const previousLevel = normalizeLevel(result.previousLevel);
  emitGamificationEvent(event, {
    userId: entry.userId,
    points: result.pointsAwarded,
    xpEarned: result.pointsAwarded,
    balance: result.newBalance,
    source: entry.source,
    sourceId: result.pointTransaction?.sourceId ?? entry.sourceId ?? null,
    transactionType: entry.transactionType,
    level: result.newLevel,
    previousLevel: result.previousLevel
  }, { debounce: event === 'workout_completed' });

  if (newLevel !== null && previousLevel !== null && newLevel > previousLevel) {
    emitGamificationEvent('level_up', {
      userId: entry.userId,
      newLevel,
      previousLevel,
      newTier: result.newTier
    }, { debounce: false });
  }
}

export function scheduleLedgerRealtimeEvent(result, entry, transaction) {
  const emit = () => emitLedgerRealtimeEvent(result, entry);
  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(emit);
    return;
  }
  emit();
}
