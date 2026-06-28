import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Session } from './types';

const scheduleTypesSource = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/types.ts'),
  'utf8'
);

const backendContractSource = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/sessionBackendContract.types.ts'),
  'utf8'
);

const sessionLifecycleContract: Partial<Session> = {
  attendanceStatus: 'present',
  cancellationChargeType: 'late_fee',
  cancellationDecision: 'pending',
  checkInTime: '2026-06-28T14:00:00.000Z',
  noShowReason: null,
  sessionCreditRestored: false,
};

describe('Universal Master Schedule session contract', () => {
  void sessionLifecycleContract;

  it('exposes backend attendance and cancellation billing fields through the shared Session type', () => {
    expect(scheduleTypesSource).toContain(
      "import type { SessionBackendLifecycleFields } from './sessionBackendContract.types';"
    );
    expect(scheduleTypesSource).toContain('export interface Session extends SessionBackendLifecycleFields');

    const requiredFields = [
      'cancellationReason?',
      'cancellationDate?',
      'cancelledBy?',
      'cancellationChargeType?',
      'cancellationChargeAmount?',
      'cancellationChargedAt?',
      'cancellationDecision?',
      'cancellationReviewedBy?',
      'cancellationReviewedAt?',
      'cancellationReviewReason?',
      'attendanceStatus?',
      'checkInTime?',
      'checkOutTime?',
      'noShowReason?',
      'markedPresentBy?',
      'attendanceRecordedAt?',
    ];

    for (const field of requiredFields) {
      expect(backendContractSource).toContain(field);
    }
  });
});