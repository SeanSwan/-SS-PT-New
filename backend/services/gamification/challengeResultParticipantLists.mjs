/**
 * Participant list builders for managed challenge results.
 * Sorts already-normalized rows without reaching back into ORM state.
 */

const compareDisplayName = (a, b) => String(a.displayName).localeCompare(String(b.displayName));
const timeFor = (value) => {
  const time = new Date(value ?? '').getTime();
  return Number.isFinite(time) ? time : null;
};

export const buildTopParticipants = ({ participants, limit = 10 }) => participants
  .slice()
  .sort((a, b) => {
    if (b.progressPercentage !== a.progressPercentage) return b.progressPercentage - a.progressPercentage;
    if (b.score !== a.score) return b.score - a.score;
    return compareDisplayName(a, b);
  })
  .slice(0, limit);

export const buildTopImprovers = ({ participants, limit = 5 }) => participants
  .filter((participant) => participant.progressDelta > 0)
  .sort((a, b) => {
    if (b.progressDelta !== a.progressDelta) return b.progressDelta - a.progressDelta;
    if (b.progressPercentage !== a.progressPercentage) return b.progressPercentage - a.progressPercentage;
    return compareDisplayName(a, b);
  })
  .slice(0, limit);

export const buildNeedsAttentionParticipants = ({ participants, activeStatuses, limit = 5 }) => participants
  .filter((participant) => activeStatuses.has(String(participant.status).toLowerCase()) && participant.progressPercentage < 50)
  .sort((a, b) => {
    if (a.progressPercentage !== b.progressPercentage) return a.progressPercentage - b.progressPercentage;
    return compareDisplayName(a, b);
  })
  .slice(0, limit);

export const buildRecentJoinedParticipants = ({ participants, limit = 5 }) => participants
  .filter((participant) => timeFor(participant.joinedAt) !== null)
  .sort((a, b) => {
    const aTime = timeFor(a.joinedAt) ?? 0;
    const bTime = timeFor(b.joinedAt) ?? 0;
    const timeDelta = bTime - aTime;
    return timeDelta !== 0 ? timeDelta : compareDisplayName(a, b);
  })
  .slice(0, limit);