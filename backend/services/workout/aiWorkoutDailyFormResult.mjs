/** Stable domain result assembled from persisted rows before commit.
 * Secondary awards are added after commit; neither their availability nor their
 * failure changes the diary identity, billing decision or applied proposal.
 */
export function buildAiWorkoutDailyFormResult({
  dailyForm, workoutSession, parsedClientId, parsedTrainerId, sessionTitle,
  workoutDateIso, estimatedDuration, overallIntensity, normalizedExercises,
  totalSets, totalReps, totalWeight, sourcePolicy, billing, billingDecision,
  linkedScheduledSession, plannedAssignmentMetadata, planProgress,
}) {
  return {
    id: dailyForm.id, formId: dailyForm.id,
    workoutId: workoutSession.id, sessionId: workoutSession.id, userId: parsedClientId,
    title: workoutSession.title || sessionTitle, date: workoutDateIso,
    duration: estimatedDuration, intensity: overallIntensity,
    exerciseCount: normalizedExercises.length, totalSets, totalReps, totalWeight,
    source: sourcePolicy.source, historicalImport: sourcePolicy.isHistoricalImport, billing,
    form: {
      id: dailyForm.id, clientId: parsedClientId, trainerId: parsedTrainerId,
      date: workoutDateIso, totalSets, estimatedDuration,
      ...(linkedScheduledSession ? { scheduledSessionId: linkedScheduledSession.id } : {}),
      sessionDeducted: billingDecision.sessionDeducted,
      source: sourcePolicy.source, historicalImport: sourcePolicy.isHistoricalImport,
      ...(plannedAssignmentMetadata ? { plannedAssignment: plannedAssignmentMetadata } : {}),
      ...(planProgress?.advanced ? { planProgress } : {}),
    },
  };
}
