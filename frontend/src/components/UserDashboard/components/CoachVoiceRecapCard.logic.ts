/** Deterministic, real-data-only sentence builder for CoachVoiceRecapCard. */
import type { HomeTrainingProof } from './HomeTabProofViewModel';

/**
 * Deterministic sentence builder. Exported for direct unit testing.
 * Returns null when there is nothing truthful to say.
 */
export function buildCoachVoiceRecap(proof: HomeTrainingProof): string | null {
  const sentences: string[] = [];
  const count = proof.thisWeekCount;

  if (count > 0) {
    const minutesPart = proof.minutesThisWeek > 0
      ? ` for ${proof.minutesThisWeek} focused minutes`
      : '';
    sentences.push(`You trained ${count} time${count === 1 ? '' : 's'} this week${minutesPart}.`);

    // Week-over-week framing only when last week actually had sessions —
    // "3 more than last week" on a client's FIRST week is technically true but
    // hollow (same guard as HomeTabProofViewModel's shareLine).
    const lastWeekCount = proof.weeklyCounts.length >= 2
      ? proof.weeklyCounts[proof.weeklyCounts.length - 2]
      : 0;
    if (proof.weekDelta != null && proof.weekDelta > 0 && lastWeekCount > 0) {
      sentences.push(`That's ${proof.weekDelta} more than last week — momentum is building.`);
    } else if (proof.weekDelta === 0 && lastWeekCount > 0) {
      sentences.push('Same rhythm as last week — consistency is the win.');
    }
  } else if (proof.lastSession) {
    // No workout yet this week, but real history exists — anchor to the truth
    // without shaming.
    sentences.push(`Your last logged session was ${proof.lastSession.title} (${proof.lastSession.when}).`);
    sentences.push('This week is still open — one session restarts the rhythm.');
  } else {
    // Zero history — the orientation strip owns this state.
    return null;
  }

  return sentences.join(' ');
}
