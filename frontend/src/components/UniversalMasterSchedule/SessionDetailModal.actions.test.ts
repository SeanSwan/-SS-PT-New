import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildAttendancePayload,
  buildCancelConfirmationMessage,
  buildCancelPanelDefaults,
  buildCancelPayload,
  buildCompleteSessionPayload,
  getApiErrorMessage,
  mapLateCancelWarning,
} from './SessionDetailModal.actions';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailModal action helpers', () => {
  it('normalizes complete-session payloads without leaking blank strings', () => {
    expect(buildCompleteSessionPayload({
      notes: '  strong closeout  ',
      trainerRating: '5',
      clientFeedback: '  client felt great  ',
      deductSessionCredit: true,
    })).toEqual({
      notes: 'strong closeout',
      trainerRating: 5,
      clientFeedback: 'client felt great',
      completeWithoutLog: true,
      deductSessionCredit: true,
    });

    expect(buildCompleteSessionPayload({
      notes: '   ',
      trainerRating: '',
      clientFeedback: '',
      deductSessionCredit: false,
    })).toEqual({
      notes: undefined,
      trainerRating: undefined,
      clientFeedback: undefined,
      completeWithoutLog: true,
      deductSessionCredit: false,
    });
  });

  it('builds attendance payloads with no-show reasons only when needed', () => {
    expect(buildAttendancePayload('no_show', '  car trouble  ', '  no warmup  ', true)).toEqual({
      attendanceStatus: 'no_show',
      noShowReason: 'car trouble',
      notes: 'no warmup',
      deductSessionCredit: true,
    });

    expect(buildAttendancePayload('present', 'ignored', '   ')).toEqual({
      attendanceStatus: 'present',
    });
  });

  it('centralizes cancellation copy and payload semantics', () => {
    expect(buildCancelConfirmationMessage({
      canManage: true,
      chargeType: 'full',
      chargeAmount: '',
      defaultFullCharge: 175,
      defaultLateFee: 88,
      restoreCredit: false,
      earlyCancel: false,
    })).toBe('Cancel with FULL SESSION CHARGE ($175). Proceed?');

    expect(buildCancelPayload({
      canManage: true,
      cancelReason: '  late cancel  ',
      notifyOnCancel: true,
      chargeType: 'late_fee',
      chargeAmount: '44.5',
      defaultFullCharge: 175,
      defaultLateFee: 88,
      restoreCredit: false,
      earlyCancel: false,
      isEarlyCancelEligible: false,
    })).toEqual({
      reason: 'late cancel',
      notifyClient: true,
      notifyTrainer: true,
      chargeType: 'late_fee',
      chargeAmount: 44.5,
      restoreCredit: false,
    });

    expect(buildCancelPanelDefaults(true, 175)).toEqual({
      chargeType: 'none',
      chargeAmount: '',
      restoreCredit: true,
    });
    expect(buildCancelPanelDefaults(false, 175)).toEqual({
      chargeType: 'full',
      chargeAmount: '175',
      restoreCredit: false,
    });
  });

  it('reports an unknown late fee as null rather than inventing one', () => {
    // Previously this fell back to the admin panel's 88 placeholder and showed
    // it to the CLIENT as their own fee. 88 is round(175 * 0.5) - wrong for
    // anyone on the $110 package, where the real half is 55.
    expect(mapLateCancelWarning({
      isLateCancellation: true,
      hoursUntilSession: 4,
      warningMessage: 'Late window',
      sessionDateFormatted: 'May 31',
      cancellationPolicy: {},
    })).toEqual({
      isLateCancellation: true,
      hoursUntilSession: 4,
      lateFeeAmount: null,
      // null, not true: asserting a credit fact on server silence is the same
      // defect class as the invented fee.
      creditRestored: null,
      warningMessage: 'Late window',
      sessionDateFormatted: 'May 31',
    });

    // A stated fee of 0 is a waiver and must survive - ?? not ||.
    expect(mapLateCancelWarning({
      isLateCancellation: true,
      hoursUntilSession: 4,
      warningMessage: 'Late window',
      sessionDateFormatted: 'May 31',
      cancellationPolicy: { lateFeeAmount: 0 },
    }).lateFeeAmount).toBe(0);

    // A real policy fee passes through untouched.
    expect(mapLateCancelWarning({
      isLateCancellation: true,
      hoursUntilSession: 4,
      warningMessage: 'Late window',
      sessionDateFormatted: 'May 31',
      cancellationPolicy: { lateFeeAmount: 55 },
    }).lateFeeAmount).toBe(55);

    expect(getApiErrorMessage({
      response: { data: { message: 'backend detail' } },
    }, 'fallback')).toBe('backend detail');
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('keeps pure action helpers out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');

    expect(modalSource).toContain("from './SessionDetailModal.actions'");
    expect(modalSource).not.toContain('const getApiErrorMessage =');
    expect(modalSource).not.toContain('let confirmMsg =');
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(1350);
  });
});

describe('buildCancelPanelDefaults — fail-closed when pricing is unknown', () => {
  it('does not pre-select a full charge when package pricing is unavailable', () => {
    // restoreCredit MUST be true: buildCancelPayload sends
    // restoreCredit && chargeType === 'none', and the server treats an explicit
    // false as opt-out. Charging nothing while withholding the prepaid credit
    // costs the client a session they already paid for.
    expect(buildCancelPanelDefaults(false, 175, true)).toEqual({
      chargeType: 'none',
      chargeAmount: '',
      restoreCredit: true,
    });
  });

  it('still pre-selects the full charge when pricing is known', () => {
    expect(buildCancelPanelDefaults(false, 110, false)).toEqual({
      chargeType: 'full',
      chargeAmount: '110',
      restoreCredit: false,
    });
  });

  it('keeps early-cancel behaviour unchanged regardless of pricing availability', () => {
    expect(buildCancelPanelDefaults(true, 175, true)).toEqual({
      chargeType: 'none',
      chargeAmount: '',
      restoreCredit: true,
    });
  });
});
