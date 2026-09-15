import { getSprintClassSlot, getSprintExerciseMemory, getSprintWeek } from '../../models/index.mjs';
import { generateBootcampClass } from './bootcampGenerator.mjs';
import { getSprintById, getSprintExerciseMemoryEntries, getSprintExerciseMemoryKeys } from './sprintService.mjs';
import { claimSprint, closeGenerationRun, renewSprintClaim, withSprintClaim, sprintActor, sprintError } from './sprintGenerationClaim.mjs';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';

// F04 restoration (base c0cbe538d): the progression strategy gives weeks with
// NO explicit modifier a per-week volume multiplier. A week's own
// intensityModifier (validated 0.7–1.5) always wins, and a deload week falls
// back to 0.7 when it carries no modifier — the base contract's order.
const PROGRESSION = {
  linear: (weekNum, totalWeeks) => {
    const base = 1.0;
    const increment = 0.05 * (weekNum - 1);
    return Math.min(base + increment, 1.5);
  },
  undulating: (weekNum) => {
    const pattern = [1.0, 0.85, 1.1];
    return pattern[(weekNum - 1) % pattern.length];
  },
  block: (weekNum) => {
    if (weekNum <= 3) return 0.9;
    if (weekNum <= 6) return 1.0;
    if (weekNum <= 9) return 1.1;
    return 1.05;
  },
  random: () => 0.85 + Math.random() * 0.3,
};

/**
 * The single decision for "how hard should this week's classes be generated".
 * Order: explicit week modifier > deload default (0.7) > strategy fallback.
 */
export function weekPrescription(week, strategy = 'linear', durationWeeks = 0) {
  const progressionFn = PROGRESSION[strategy] || PROGRESSION.linear;
  const explicit = Number(week?.intensityModifier);
  if (week?.isDeloadWeek) return explicit > 0 ? explicit : 0.7;
  return explicit > 0 ? explicit : progressionFn(week?.weekNumber ?? 1, durationWeeks);
}

function positiveId(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw sprintError('Valid Sprint/slot ID required', 400);
  }
  return Number(value);
}

export function mainExerciseKeys(classData) {
  const rows = [...(classData?.exercises ?? []), ...(classData?.stations ?? []).flatMap(station => station.exercises ?? [])]
    .filter(ex => !ex.board || ex.board === 'main');
  if (!rows.length) throw sprintError('Generated class has no main work', 422);
  const keys = new Set();
  for (const ex of rows) {
    const key = ex.key ?? ex.exerciseKey ?? (ex.exerciseLibraryId ? 'db-' + ex.exerciseLibraryId : null);
    if (typeof key === 'string' && key.trim()) keys.add(key.trim());
    else if (!ex.isCardioFinisher) throw sprintError('Sprint exercise memory unresolved', 422);
  }
  if (!keys.size) throw sprintError('Sprint exercise memory unresolved', 422);
  return [...keys];
}

async function rebuildMemory(sprintId, transaction) {
  const slots = await getSprintClassSlot().findAll({
    where: { sprintId, status: ['generated', 'taught'] }, order: [['scheduledDate', 'ASC'], ['id', 'ASC']], transaction,
  });
  const union = new Map();
  for (const slot of slots) {
    const keys = slot.exerciseKeys?.length ? slot.exerciseKeys : mainExerciseKeys(slot.generatedClassData);
    const week = await getSprintWeek().findByPk(slot.weekId, { attributes: ['weekNumber'], transaction });
    if (!week) throw sprintError('Sprint week missing', 422);
    for (const key of keys) if (!union.has(key)) union.set(key, {
      sprintId, exerciseKey: key, slotId: slot.id, weekNumber: week.weekNumber,
    });
  }
  await getSprintExerciseMemory().destroy({ where: { sprintId }, transaction });
  if (union.size) await getSprintExerciseMemory().bulkCreate([...union.values()], { transaction });
  return new Set(union.keys());
}

async function commitSlot(sprintId, actor, claim, slotId, classData) {
  const keys = mainExerciseKeys(classData);
  return withSprintClaim(sprintId, actor, claim, async (_sprint, transaction) => {
    const slot = await getSprintClassSlot().findOne({
      where: { id: slotId, sprintId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!slot || !['planned', 'generated'].includes(slot.status)) throw sprintError('Sprint slot changed before commit');
    await slot.update({ generatedClassData: classData, exerciseKeys: keys, status: 'generated' }, { transaction });
    return rebuildMemory(sprintId, transaction);
  });
}

async function finish(sprintId, actor, claim, failed, errorMessage = null) {
  return withSprintClaim(sprintId, actor, claim, async (sprint, transaction) => {
    const slots = await getSprintClassSlot().findAll({ where: { sprintId }, transaction });
    const required = slots.filter(slot => slot.status !== 'skipped');
    const completedSlots = required.filter(slot => ['generated', 'taught'].includes(slot.status)).length;
    const status = !failed && required.length > 0 && completedSlots === required.length ? 'active' : 'draft';
    await sprint.update({ status, metadata: { ...sprint.metadata, generationClaimV1: null,
      lastGenerationV1: { operationId: claim.operationId, version: claim.version, status, completedSlots } } }, { transaction });
    await closeGenerationRun(sequelize, sprintId, claim, failed ? 'failed' : 'completed',
      failed ? 'generation failed; see server logs' : null);
    return { status, totalSlots: required.length, completedSlots, failedSlots: required.length - completedSlots };
  });
}

async function runOwned(sprintId, actor, request, work) {
  const claim = await claimSprint(sprintId, actor, request);
  let lost = null;
  const heartbeat = setInterval(() => {
    renewSprintClaim(sprintId, actor, claim).catch(error => { lost = error; });
  }, 30000);
  heartbeat.unref?.();
  try {
    const result = await work(claim, () => { if (lost) throw lost; });
    const terminal = await finish(sprintId, actor, claim, false);
    return { ...result, ...terminal };
  } catch (error) {
    // Cleanup can only release this live fence. Never announce success when DB cleanup fails.
    try {
      await finish(sprintId, actor, claim, true);
    } catch (cleanupError) {
      // D-Q3: a cleanup failure used to be silent — the lease stayed held until
      // expiry with no ops signal. The ledger row is marked 'orphaned' best-
      // effort and the failure is LOGGED with the ids ops need to force-release.
      try {
        await sequelize.query(
          `UPDATE generation_runs SET status = 'orphaned', finished_at = NOW(), error_message = :errorMessage
           WHERE sprint_id = :sprintId AND operation_id = :operationId AND status = 'running'`,
          { replacements: { sprintId, operationId: claim.operationId, errorMessage: String(cleanupError?.message || cleanupError).slice(0, 500) } },
        );
      } catch { /* ledger best-effort; the lease itself still expires */ }
      logger.error('[SprintGen] claim cleanup failed — lease held until expiry:',
        { sprintId, operationId: claim.operationId, cleanupError: String(cleanupError), originalError: String(error) });
    }
    throw error;
  } finally { clearInterval(heartbeat); }
}

/** U2: exclusions stay hot for this many weeks of the CURRENT sprint. */
export const EXCLUSION_WINDOW_WEEKS = 4;

function generationInput(sprint, slot, exclusions, weekPrescriptionIntensity) {
  return {
    classFormat: slot.classFormat || sprint.defaultFormat,
    classStyle: slot.classStyle || sprint.defaultStyle, dayType: slot.dayType,
    spaceProfileId: sprint.spaceProfileId, trainerId: sprint.trainerId,
    exclusionKeys: exclusions, includeStretch: true, stretchDurationMin: 5,
    // F04: the week's prescription scales generated work volume (deload 0.7 …).
    prescriptionIntensity: weekPrescriptionIntensity,
    // Workload progression must never select an impact category.
  };
}

export async function generateSprintClasses(id, onProgress, actor, request) {
  const sprintId = positiveId(id); actor = sprintActor(actor);
  const result = await runOwned(sprintId, actor, request, async (claim, assertLive) => {
    const sprint = await getSprintById(sprintId, actor);
    const previous = sprint.previousSprintId
      ? await getSprintExerciseMemoryKeys(sprint.previousSprintId, actor) : new Set();
    // Rebuild from slot truth; a read/decoding failure aborts rather than losing exclusions.
    let memory = await withSprintClaim(sprintId, actor, claim, (_s, transaction) => rebuildMemory(sprintId, transaction));
    // U2: windowed exclusions — only memory keys first used within the last
    // EXCLUSION_WINDOW_WEEKS of THIS sprint join the no-repeat set.
    const slots = sprint.weeks.flatMap(week => week.classSlots.map(slot => ({ slot, week })))
      .sort((a, b) => a.week.weekNumber - b.week.weekNumber
        || String(a.slot.scheduledDate).localeCompare(String(b.slot.scheduledDate)) || a.slot.id - b.slot.id);
    if (!slots.length || slots.length > 364) throw sprintError('Sprint schedule is empty or exceeds limits', 422);
    // U4: batch planned slots by week — same-week slots are independent, so the
    // batch generates in PARALLEL (allSettled) and commits SEQUENTIALLY so the
    // exercise-memory stays ordered. The batch is fenced by assertLive gates on
    // both sides; a failed generation commits its succeeded siblings first,
    // then throws so the claim's error path closes the ledger row.
    const weekBatches = [];
    for (const { slot, week } of slots) {
      if (slot.status !== 'planned') continue;
      let batch = weekBatches[weekBatches.length - 1];
      if (!batch || batch.week !== week) {
        batch = { week, slots: [] };
        weekBatches.push(batch);
      }
      batch.slots.push(slot);
    }
    let completed = 0;
    let processed = 0;
    for (const { week, slots: plannedSlots } of weekBatches) {
      assertLive();
      await renewSprintClaim(sprintId, actor, claim);
      // Reload per batch (Astra hive fix #1): commits from EARLIER batches
      // changed the memory table; a once-loaded snapshot let later weeks
      // repeat exercises generated earlier in the SAME run.
      const memoryEntries = await getSprintExerciseMemoryEntries(sprintId);
      const minWeek = week.weekNumber - EXCLUSION_WINDOW_WEEKS + 1;
      const windowed = new Set([
        ...previous,
        ...memoryEntries.filter(entry => entry.weekNumber >= minWeek).map(entry => entry.exerciseKey),
      ]);
      const results = await Promise.allSettled(plannedSlots.map(slot =>
        generateBootcampClass(
          generationInput(sprint, slot, windowed, weekPrescription(week, sprint.progressionStrategy, sprint.durationWeeks)),
        )));
      assertLive();
      let batchError = null;
      for (let i = 0; i < plannedSlots.length; i++) {
        const result = results[i];
        processed++;
        if (result.status === 'fulfilled') {
          completed++;
          memory = await commitSlot(sprintId, actor, claim, plannedSlots[i].id, result.value);
        } else if (!batchError) {
          batchError = result.reason;
        }
        // Astra hive fix #2: 'completed' counts only fulfilled slots; failed
        // ones advance PROCESSING (so the progress bar moves) without being
        // mislabeled as completed.
        onProgress?.({ type: 'progress', completedSlots: completed, processedSlots: processed,
          totalSlots: slots.length, currentWeek: week.weekNumber,
          percent: Math.round(processed / slots.length * 100) });
      }
      if (batchError) throw batchError;
    }
    return { type: 'complete', sprintId, exerciseMemorySize: memory.size };
  });
  return result;
}

export async function regenerateSlot(id, targetId, trainerId, request) {
  const sprintId = positiveId(id), slotId = positiveId(targetId);
  const actor = sprintActor(typeof trainerId === 'object' ? trainerId : { userId: trainerId, role: 'trainer' });
  return runOwned(sprintId, actor, request, async (claim, assertLive) => {
    const sprint = await getSprintById(sprintId, actor);
    const slot = await getSprintClassSlot().findOne({ where: { id: slotId, sprintId } });
    if (!slot || !['planned', 'generated'].includes(slot.status)) throw sprintError('Cannot regenerate this slot');
    // F04: a regenerated class must obey the same week prescription as the
    // original full-sprint run, so the week is loaded from the slot.
    const week = slot.weekId ? await getSprintWeek().findByPk(slot.weekId) : null;
    const prescription = week ? weekPrescription(week, sprint.progressionStrategy, sprint.durationWeeks) : 1;
    const exclusions = sprint.previousSprintId
      ? await getSprintExerciseMemoryKeys(sprint.previousSprintId, actor) : new Set();
    const others = await getSprintClassSlot().findAll({ where: { sprintId, status: ['generated', 'taught'] } });
    for (const other of others) if (Number(other.id) !== slotId) {
      const keys = other.exerciseKeys?.length ? other.exerciseKeys : mainExerciseKeys(other.generatedClassData);
      keys.forEach(key => exclusions.add(key));
    }
    await renewSprintClaim(sprintId, actor, claim);
    const classData = await generateBootcampClass(generationInput(sprint, slot, exclusions, prescription));
    assertLive();
    await commitSlot(sprintId, actor, claim, slotId, classData);
    return { slot: await getSprintClassSlot().findOne({ where: { id: slotId, sprintId } }), classData };
  });
}

export const __testing__ = { PROGRESSION, weekPrescription };
