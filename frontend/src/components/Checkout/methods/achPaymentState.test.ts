import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getAchAccountHolderName,
  getAchProfileAccountHolderName,
  validateAchAccountHolderName,
  resolveAchPaymentIntentDecision,
} from './achPaymentState';

describe('ACH payment state helpers', () => {
  it('keeps ACH Stripe.js loading on the canonical Vite publishable env key', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/Checkout/methods/ACHPayment.tsx'),
      'utf8'
    );

    expect(source).toContain('import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY');
    expect(source).toContain('import.meta.env.VITE_STRIPE_PUBLIC_KEY');
    expect(source).toContain('VITE_STRIPE_PUBLISHABLE_KEY not set');
  });

  it('trims and requires an account holder name', () => {
    expect(getAchAccountHolderName({ firstName: ' Sean ', lastName: ' Swan ' })).toEqual({
      ok: true,
      name: 'Sean Swan',
    });

    expect(getAchAccountHolderName({ firstName: ' ', lastName: '' })).toEqual({
      ok: false,
      message: 'Enter the account holder name before connecting a bank account.',
    });
  });

  it('prefills the account holder name from profile names when available', () => {
    expect(getAchProfileAccountHolderName({ firstName: '  Sean ', lastName: '   Swan  ' })).toBe('Sean Swan');
  });

  it('requires manual account holder name when profile name is empty', () => {
    expect(getAchProfileAccountHolderName({ firstName: ' ', lastName: '' })).toBe('');
    expect(validateAchAccountHolderName('')).toEqual({
      ok: false,
      message: 'Enter the account holder name before connecting a bank account.',
    });
  });

  it('trims and accepts manually entered account holder names', () => {
    expect(validateAchAccountHolderName('  Move Fitness LLC  ')).toEqual({
      ok: true,
      name: 'Move Fitness LLC',
    });
  });

  it('routes collection retry status to a recoverable bank retry', () => {
    expect(resolveAchPaymentIntentDecision({ status: 'requires_payment_method' }, 'collect')).toMatchObject({
      kind: 'retry_payment_method',
      uiStatus: 'error',
      shouldCallSuccess: false,
    });
  });

  it('routes collection confirmation status to the confirm step', () => {
    expect(resolveAchPaymentIntentDecision({ status: 'requires_confirmation' }, 'collect')).toMatchObject({
      kind: 'confirm',
      shouldConfirm: true,
      shouldCallSuccess: false,
    });
  });

  it('routes confirmed processing status to webhook-backed pending success', () => {
    expect(resolveAchPaymentIntentDecision({ status: 'processing' }, 'confirm')).toMatchObject({
      kind: 'processing',
      uiStatus: 'processing',
      shouldCallSuccess: true,
    });
  });

  it('routes microdeposit verification to next-step copy without calling success', () => {
    const decision = resolveAchPaymentIntentDecision({
      status: 'requires_action',
      next_action: {
        type: 'verify_with_microdeposits',
        verify_with_microdeposits: {
          arrival_date: 1_765_843_200,
          hosted_verification_url: 'https://payments.stripe.test/verify',
          microdeposit_type: 'descriptor_code',
        },
      },
    }, 'confirm');

    expect(decision).toMatchObject({
      kind: 'microdeposit_verification',
      uiStatus: 'microdeposit_verification',
      shouldCallSuccess: false,
    });
    expect(decision.message.toLowerCase()).toContain('microdeposit');
    expect(decision.message).toContain('1-2 business days');
  });

  it('routes unknown statuses to a safe recoverable fallback', () => {
    expect(resolveAchPaymentIntentDecision({ status: 'canceled' }, 'confirm')).toMatchObject({
      kind: 'recoverable_error',
      uiStatus: 'error',
      shouldCallSuccess: false,
    });
  });
});
