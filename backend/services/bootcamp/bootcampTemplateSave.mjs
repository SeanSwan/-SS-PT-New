/**
 * ============================================================================
 * FILE: bootcampTemplateSave.mjs
 * PURPOSE: saveBootcampTemplate — the atomic, authority-checked write of one
 *          generated Boot Camp class (S06 / R-H01 / R-H02).
 *
 * Extracted from bootcampCrud.mjs, which was already over the 300-line cap at
 * baseline. bootcampCrud.mjs re-exports this function so every existing caller
 * and import path keeps working.
 *
 * INVARIANTS (s06-architecture.md §"Outcome, invariants and exact boundaries")
 *   - One saved class is one atomic object: parent, stations, exercises,
 *     stretches and overflow all commit together or not at all.
 *   - Child IDs/FKs can never redirect a write: every row is built from an
 *     explicit allowlist and trainerId always comes from the server.
 *   - Any failed write leaves no newly persisted parent or children.
 *   - A caller-owned `options.transaction` is used as-is. This service never
 *     opens a nested transaction and never commits or rolls back a transaction
 *     it does not own.
 *   - Validation and the profile authority check both run BEFORE the first
 *     write, so a denied request produces zero rows rather than a rolled-back
 *     parent.
 * ============================================================================
 */

import sequelize from '../../database.mjs';
import {
  getBootcampTemplate,
  getBootcampStation,
  getBootcampExercise,
  getBootcampOverflowPlan,
  getBootcampStretch,
  getBootcampSpaceProfile,
  getEquipmentProfile,
} from '../../models/index.mjs';
import {
  BootcampTemplateAuthorityError,
  BootcampTemplatePersistenceError,
  buildExerciseRow,
  buildOverflowRow,
  buildSelectionManifestV1,
  buildStationRow,
  buildStretchRow,
  buildTemplateRow,
  createOccurrenceId,
  normalizeOptionalProfileId,
  requireTrainerId,
  validateGeneratedClass,
} from './bootcampTemplateContract.mjs';

const isAdmin = (requesterRole) => requesterRole === 'admin';

/**
 * Resolve and authorize an optional profile reference.
 * Fails closed: a missing, foreign or inactive profile denies the whole save.
 * The thrown text is deliberately non-disclosing.
 */
async function assertProfileAccess({
  profileId,
  Model,
  serverTrainerId,
  requesterRole,
  requireActive = false,
  transaction,
}) {
  if (profileId === null) return;
  if (!Model) throw new BootcampTemplateAuthorityError();
  const profile = await Model.findOne({ where: { id: profileId }, transaction });
  if (!profile) throw new BootcampTemplateAuthorityError();
  if (!isAdmin(requesterRole) && Number(profile.trainerId) !== serverTrainerId) {
    throw new BootcampTemplateAuthorityError();
  }
  if (requireActive) {
    const active = typeof profile.get === 'function' ? profile.get('isActive') : profile.isActive;
    if (active === false) throw new BootcampTemplateAuthorityError();
  }
}

export async function saveBootcampTemplate(generatedClass, trainerId, options = {}) {
  const resolvedTrainerId = requireTrainerId(trainerId);
  const requesterRole = options?.requesterRole;
  const callerTransaction = options?.transaction;

  // ── Admission: everything is checked before a single row is written ──
  const { stations, exercises, stretches, overflowPlan, stationOrdinals } =
    validateGeneratedClass(generatedClass);

  const spaceProfileId = normalizeOptionalProfileId(generatedClass.spaceProfileId);
  const equipmentProfileId = normalizeOptionalProfileId(generatedClass.equipmentProfileId);

  const Template = getBootcampTemplate();
  const Station = getBootcampStation();
  const Exercise = getBootcampExercise();
  const Overflow = getBootcampOverflowPlan();
  const Stretch = getBootcampStretch();

  const run = async (transaction) => {
    // Authority before the first write, inside the same transaction.
    await assertProfileAccess({
      profileId: spaceProfileId,
      Model: getBootcampSpaceProfile(),
      serverTrainerId: resolvedTrainerId,
      requesterRole,
      transaction,
    });
    await assertProfileAccess({
      profileId: equipmentProfileId,
      Model: getEquipmentProfile(),
      serverTrainerId: resolvedTrainerId,
      requesterRole,
      requireActive: true,
      transaction,
    });

    const templateRow = buildTemplateRow(generatedClass, resolvedTrainerId);
    if (spaceProfileId !== null) templateRow.spaceProfileId = spaceProfileId;
    if (equipmentProfileId !== null) templateRow.equipmentProfileId = equipmentProfileId;

    const template = await Template.create(templateRow, { transaction });

    // `stationOrdinals` carries the ordinal admission assigned to each station
    // (explicit stationIndex, else array position). The row's NOT NULL pair and
    // the index→id map are BOTH keyed by it, so they cannot disagree.
    const stationRows = stations.map(
      (station, position) => buildStationRow(station, template.id, stationOrdinals[position]),
    );
    const createdStations = stationRows.length > 0
      ? await Station.bulkCreate(stationRows, { transaction, returning: true })
      : [];

    // HOSTILE-REVIEW FIX (BE-F7): a `returning` set shorter than what was
    // submitted would leave the index→id map incomplete, and an incomplete map
    // is exactly how defect (2) comes back — the missing lookup used to fall
    // through `?? null` and silently turn a station exercise into a full-group
    // row. Assert the shape so that becomes a loud failure, not quiet data loss.
    if (createdStations.length !== stationRows.length) {
      throw new BootcampTemplatePersistenceError();
    }

    // HOSTILE-REVIEW FIX (R2-9): the check above proves the COUNT, not the
    // ORDER. A RETURNING set that came back reordered would pair each ordinal
    // with a DIFFERENT station's id and silently attach exercises to the wrong
    // station — a data-integrity fault with no error anywhere. `stationNumber`
    // is deterministic (the station's explicit number, else its ordinal), so it
    // is a verifiable key: every returned row must match the row sent at the
    // same position. A mismatch is a persistence fault, not a bad request.
    createdStations.forEach((record, position) => {
      if (Number(record.stationNumber) !== Number(stationRows[position].stationNumber)) {
        throw new BootcampTemplatePersistenceError();
      }
    });

    // stationId is resolved from the NEW station records, keyed by the ORDINAL
    // admission assigned — which is exactly what the exercises reference.
    const stationIdByIndex = new Map(
      createdStations.map((record, position) => [stationOrdinals[position], record.id]),
    );

    // occurrenceId is a MANIFEST-ONLY key, not a column: no Sequelize model and
    // no migration declares it, so PostgreSQL never receives it. It is kept
    // because it gives each exercise a stable local identity inside the
    // manifest; it is NOT a durable handle after a reload. Recorded as an open
    // finding — making it durable requires a migration, which this slice is not
    // authorized to write.
    const exerciseRows = exercises.map(exercise => ({
      ...buildExerciseRow(exercise, template.id, stationIdByIndex),
      occurrenceId: createOccurrenceId(),
    }));
    const createdExercises = exerciseRows.length > 0
      ? await Exercise.bulkCreate(exerciseRows, { transaction, returning: true })
      : [];

    if (stretches.length > 0) {
      await Stretch.bulkCreate(
        stretches.map((stretch, index) => buildStretchRow(stretch, template.id, index)),
        { transaction },
      );
    }

    if (overflowPlan) {
      await Overflow.create(buildOverflowRow(overflowPlan, template.id), { transaction });
    }

    // Manifest keyed ONLY by persisted ids, written in the same transaction.
    const persisted = createdExercises.map((record, position) => ({
      id: record.id,
      occurrenceId: exerciseRows[position].occurrenceId,
      exerciseName: exerciseRows[position].exerciseName,
      stationId: exerciseRows[position].stationId ?? null,
    }));
    const metadata = {
      ...(templateRow.metadata ?? {}),
      selectionManifestV1: buildSelectionManifestV1(persisted),
    };
    await template.update({ metadata }, { transaction });

    return template;
  };

  // A caller-owned transaction is used as-is: no nested BEGIN, no commit or
  // rollback by this service. Only an owned transaction is managed here.
  if (callerTransaction) return run(callerTransaction);
  return sequelize.transaction(run);
}

export default saveBootcampTemplate;
