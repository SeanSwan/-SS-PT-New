/**
 * FILE: bootcampProgrammingNotes.mjs
 * PURPOSE: Persist generated Bootcamp programming intent through the existing
 * BootcampExercise.notes column without requiring a schema migration.
 */

const PROGRAMMING_NOTE_PREFIX = 'bootcamp:programming-intent:';

function getRecordValue(record, key) {
  if (!record) return undefined;
  if (typeof record.get === 'function') return record.get(key);
  return record[key];
}

function setRecordValue(record, key, value) {
  if (typeof record?.setDataValue === 'function') {
    record.setDataValue(key, value);
    return;
  }
  if (record) record[key] = value;
}

function cleanNotes(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function findProgrammingNote(notes) {
  if (typeof notes !== 'string') return null;
  return notes
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.startsWith(PROGRAMMING_NOTE_PREFIX)) ?? null;
}

export function serializeExerciseNotes(exercise = {}) {
  const existingNotes = cleanNotes(exercise.notes);
  if (!exercise.programmingIntent) return existingNotes;
  try {
    const payload = `${PROGRAMMING_NOTE_PREFIX}${JSON.stringify(exercise.programmingIntent)}`;
    if (!existingNotes) return payload;
    if (findProgrammingNote(existingNotes)) return existingNotes;
    return `${existingNotes}\n${payload}`;
  } catch {
    return existingNotes;
  }
}

export function hydrateExerciseProgrammingIntent(exercise) {
  const noteLine = findProgrammingNote(getRecordValue(exercise, 'notes'));
  if (!noteLine) return exercise;
  try {
    setRecordValue(exercise, 'programmingIntent', JSON.parse(noteLine.slice(PROGRAMMING_NOTE_PREFIX.length)));
  } catch {
    setRecordValue(exercise, 'programmingIntent', null);
  }
  return exercise;
}

export const __testing__ = {
  PROGRAMMING_NOTE_PREFIX,
  findProgrammingNote,
};
