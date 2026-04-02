/**
 * ============================================================================
 * FILE: flowOptimizer.mjs
 * PURPOSE: Flow optimization engine — interleaves exercises by setup time
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Ensures nobody waits idle while others set up equipment.
 * Within each station, interleaves fast-setup (bodyweight=0s) and slow-setup
 * (barbell=20s, cable=15s) exercises so participants always have something to do.
 * HOW IT FITS: bootcampGenerator → flowOptimizer (step 8 in generation pipeline)
 */

// ── Setup Time Classification ───────────────────────────────────────

/**
 * Classify an exercise's setup time into a category.
 * instant=0-5s, quick=5-15s, medium=15-30s, slow=30s+
 */
function classifySetup(setupSec) {
  if (setupSec <= 5) return 'instant';
  if (setupSec <= 15) return 'quick';
  if (setupSec <= 30) return 'medium';
  return 'slow';
}

// ── Interleave Algorithm ────────────────────────────────────────────

/**
 * Interleave exercises within a station so fast-setup and slow-setup
 * alternate. This prevents a station from having 3 barbell exercises
 * in a row where everyone waits 20s between each.
 *
 * Algorithm:
 * 1. Split exercises into "fast" (instant/quick) and "slow" (medium/slow)
 * 2. Interleave: slow[0], fast[0], slow[1], fast[1], ...
 * 3. Append any remaining from whichever pool has extras
 * 4. Recalculate sortOrder
 */
function interleaveBySetupTime(exercises) {
  if (exercises.length <= 2) return exercises;

  const fast = [];
  const slow = [];

  for (const ex of exercises) {
    if (ex.isCardioFinisher) continue;
    const cat = classifySetup(ex.setupTimeSec ?? 0);
    if (cat === 'instant' || cat === 'quick') {
      fast.push(ex);
    } else {
      slow.push(ex);
    }
  }

  // If all exercises are in the same bucket, no interleaving needed
  if (fast.length === 0 || slow.length === 0) return exercises;

  const interleaved = [];
  const maxLen = Math.max(fast.length, slow.length);

  for (let i = 0; i < maxLen; i++) {
    // Lead with slow exercise — participant sets up while previous station
    // is still working. Then fast exercise gives them a "breather" setup.
    if (i < slow.length) interleaved.push(slow[i]);
    if (i < fast.length) interleaved.push(fast[i]);
  }

  // Re-append cardio finishers at the end
  const finishers = exercises.filter(ex => ex.isCardioFinisher);
  interleaved.push(...finishers);

  // Update sortOrder
  for (let i = 0; i < interleaved.length; i++) {
    interleaved[i].sortOrder = i + 1;
  }

  return interleaved;
}

// ── Station Flow Metrics ────────────────────────────────────────────

/**
 * Calculate per-station flow metrics:
 * - maxSetupSec: worst-case setup time at this station
 * - avgSetupSec: average setup time
 * - flowScore: 0-100 (100=perfect flow, 0=everyone waiting)
 * - bottleneck: true if this station has significantly higher setup than average
 */
function calculateStationFlowMetrics(stationExercises) {
  const mainExercises = stationExercises.filter(ex => ex.board === 'main' && !ex.isCardioFinisher);
  if (mainExercises.length === 0) return { maxSetupSec: 0, avgSetupSec: 0, flowScore: 100, bottleneck: false };

  const setupTimes = mainExercises.map(ex => ex.setupTimeSec ?? 0);
  const maxSetup = Math.max(...setupTimes);
  const avgSetup = Math.round(setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length);

  // Flow score: penalize stations where ALL exercises are slow-setup
  const hasInstant = setupTimes.some(t => t <= 5);
  const hasSlow = setupTimes.some(t => t > 15);

  let flowScore = 100;
  if (hasSlow && !hasInstant) flowScore -= 40;
  if (maxSetup > 20) flowScore -= Math.min(30, maxSetup - 20);
  if (avgSetup > 10) flowScore -= Math.min(20, (avgSetup - 10) * 2);
  flowScore = Math.max(0, Math.min(100, flowScore));

  return { maxSetupSec: maxSetup, avgSetupSec: avgSetup, flowScore, bottleneck: flowScore < 50 };
}

// ── Main Optimization Pass ──────────────────────────────────────────

/**
 * Main flow optimization pass. Called after all exercises are generated.
 * 1. Interleaves exercises within each station
 * 2. Calculates flow metrics per station
 * 3. Adds setup time to station objects
 * 4. Generates flow insights for explanations
 */
export function optimizeStationFlow(stations, allExercises, explanations) {
  if (stations.length === 0) return;

  const stationFlowData = [];

  for (let s = 0; s < stations.length; s++) {
    const stationExs = allExercises.filter(
      ex => ex.stationIndex === s && ex.board === 'main'
    );

    // Interleave fast/slow exercises
    const optimized = interleaveBySetupTime(stationExs);

    // Replace exercises in allExercises with optimized order
    let optIdx = 0;
    for (let i = 0; i < allExercises.length; i++) {
      if (allExercises[i].stationIndex === s && allExercises[i].board === 'main') {
        if (optIdx < optimized.length) {
          allExercises[i] = optimized[optIdx];
          optIdx++;
        }
      }
    }

    // Calculate flow metrics
    const metrics = calculateStationFlowMetrics(stationExs);
    stations[s].setupTimeSec = metrics.maxSetupSec;
    stations[s].flowScore = metrics.flowScore;
    stations[s].bottleneck = metrics.bottleneck;

    stationFlowData.push({
      station: s + 1,
      name: stations[s].stationName,
      ...metrics,
    });
  }

  // Generate flow insights
  const bottlenecks = stationFlowData.filter(s => s.bottleneck);
  const avgFlow = Math.round(stationFlowData.reduce((sum, s) => sum + s.flowScore, 0) / stationFlowData.length);

  if (bottlenecks.length > 0) {
    explanations.push({
      type: 'flow',
      message: `Flow warning: ${bottlenecks.map(b => b.name).join(', ')} ${bottlenecks.length === 1 ? 'has' : 'have'} high setup times. Exercises interleaved to minimize idle time.`,
    });
  }

  explanations.push({
    type: 'flow',
    message: `Flow optimization: Average flow score ${avgFlow}/100 across ${stations.length} stations. ${bottlenecks.length === 0 ? 'No bottlenecks detected.' : `${bottlenecks.length} station${bottlenecks.length > 1 ? 's' : ''} flagged.`}`,
  });

  return stationFlowData;
}
