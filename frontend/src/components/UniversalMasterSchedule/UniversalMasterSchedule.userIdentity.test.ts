import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';

const scheduleSourcePath = resolve(process.cwd(), 'src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
const scheduleLogicPath = resolve(process.cwd(), 'src/components/UniversalMasterSchedule/UniversalMasterSchedule.logic.ts');
const createSessionModalPath = resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleCreateSessionModal.tsx');
const createClientFieldPath = resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleCreateClientField.tsx');

describe('UniversalMasterSchedule user identity parsing', () => {
  it('uses a strict positive integer parser for user identity', async () => {
    expect(existsSync(scheduleLogicPath)).toBe(true);

    const logicModuleUrl = pathToFileURL(scheduleLogicPath).href;
    const { parseScheduleUserId, normalizeScheduleOptionalId } = await import(/* @vite-ignore */ logicModuleUrl);

    expect(parseScheduleUserId('88')).toBe(88);
    expect(parseScheduleUserId(' 88 ')).toBe(88);
    expect(parseScheduleUserId(88)).toBe(88);
    expect(parseScheduleUserId('88junk')).toBeNull();
    expect(parseScheduleUserId('0')).toBeNull();
    expect(parseScheduleUserId(null)).toBeNull();

    expect(normalizeScheduleOptionalId('')).toBeUndefined();
    expect(normalizeScheduleOptionalId(undefined)).toBeUndefined();
    expect(normalizeScheduleOptionalId('42')).toBe(42);
    expect(normalizeScheduleOptionalId(42)).toBe(42);
    expect(normalizeScheduleOptionalId('fixture-42')).toBeNull();
    expect(normalizeScheduleOptionalId(Number.NaN)).toBeNull();
  });

  it('does not pass malformed route/auth user ids into availability editor state', () => {
    const source = readFileSync(scheduleSourcePath, 'utf8');

    expect(source).toContain("import { normalizeScheduleOptionalId, parseScheduleUserId } from './UniversalMasterSchedule.logic';");
    expect(source).toContain('const userId = userIdProp ?? user?.id;');
    expect(source).toContain('const resolvedUserId = parseScheduleUserId(userId);');
    expect(source).toContain('const tId = resolvedUserId;');
    expect(source).not.toContain('parseInt(userId, 10)');
    expect(source).not.toContain('mode === \'trainer\' ? resolvedUserId : (userId ?? null)');
  });

  it('normalizes schedule create-dialog ids before form state or create-session payloads', () => {
    const scheduleSource = readFileSync(scheduleSourcePath, 'utf8');
    const createSessionModalSource = readFileSync(createSessionModalPath, 'utf8');
    const createClientFieldSource = readFileSync(createClientFieldPath, 'utf8');
    const createModalSource = `${createSessionModalSource}\n${createClientFieldSource}`;

    expect(createModalSource).toContain("import { normalizeScheduleOptionalId } from '../UniversalMasterSchedule.logic';");
    expect(createModalSource).toContain('const nextTrainerId = normalizeScheduleOptionalId(value);');
    expect(createModalSource).toContain('const nextClientId = normalizeScheduleOptionalId(value);');
    expect(createModalSource).toContain('const nextSessionTypeId = normalizeScheduleOptionalId(value);');
    expect(createModalSource).not.toContain('trainerId: value ? Number(value) : undefined');
    expect(createModalSource).not.toContain('clientId: value ? Number(value) : undefined');
    expect(createModalSource).not.toContain('sessionTypeId: value ? Number(value) : undefined');

    expect(scheduleSource).toContain('const trainerIdForPayload = normalizeScheduleOptionalId(formData.trainerId);');
    expect(scheduleSource).toContain('const clientIdForPayload = normalizeScheduleOptionalId(formData.clientId);');
    expect(scheduleSource).toContain('const sessionTypeIdForPayload = normalizeScheduleOptionalId(formData.sessionTypeId);');
    expect(scheduleSource).toContain('if (trainerIdForPayload == null) {');
    expect(scheduleSource).toContain('if (!useManualClient && clientIdForPayload == null) {');
    expect(scheduleSource).toContain('if (sessionTypeIdForPayload == null) {');
    expect(scheduleSource).toContain('sessionTypeId: sessionTypeIdForPayload,');
    expect(scheduleSource).toContain('const quickBookClientId = normalizeScheduleOptionalId(clientId);');
    expect(scheduleSource).toContain('const quickBookTrainerId = normalizeScheduleOptionalId(quickBookSlot.trainerId);');
    expect(scheduleSource).toContain('if (quickBookClientId == null) {');
    expect(scheduleSource).toContain('if (quickBookTrainerId == null) {');
    expect(scheduleSource).not.toContain('userId: formData.clientId?.toString()');
    expect(scheduleSource).not.toContain('userId: clientId.toString()');
    expect(scheduleSource).not.toContain('sessionTypeId: formData.sessionTypeId');
  });
});
